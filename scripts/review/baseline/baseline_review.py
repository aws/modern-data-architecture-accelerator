#!/usr/bin/env python3
"""
Baseline Review — detects baseline diffs, assesses risk via Kiro, and produces test reports.

1. Detects .baseline.json files changed between the target branch and the feature branch
2. For each changed baseline, runs CDK diff between the target and branch versions
3. Collects the corresponding source code changes for the module
4. Pipes the CDK diff + code changes through Kiro headless for risk assessment
   using the diff-risk-assessment steering file
5. Verifies every app package has a comprehensive baseline diff test
6. Produces a JSON report and Code Quality report for GitLab MR

Outputs:
  baseline-review/report.json              - Full structured report with CDK diff and risk assessment
  baseline-review/codequality-report.json  - GitLab Code Quality report

Environment:
  KIRO_API_KEY                      - Required for risk assessment (Kiro headless auth)

Usage:
  python3 scripts/review/baseline/baseline_review.py [--output-dir baseline-review]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

# Add scripts/ to Python path so review.lib imports work when run directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.nx_graph import PROJECT_ROOT, _get_transitive_deps, _target_ref
from review.lib.report import to_codequality_json
from review.lib.kiro_integration import (
    run_kiro_assessment,
    _parse_risk_json,
    _parse_risk_level,
)
from review.lib.thread_lifecycle import compute_source_hash
from review.lib.diff_parser import parse_diff_chunks, format_chunks_for_prompt

DIFF_HELPER = PROJECT_ROOT / "scripts" / "test" / "baseline-diff-helper.mjs"

COVERAGE_IGNORE_FILE = PROJECT_ROOT / ".baseline-coverage-ignore"
COVERAGE_IGNORE_DEFAULTS = [
    "packages/apps/core/app",
    "packages/apps/core/bootstrap",
    "packages/apps/core/devops",
]


KIRO_RISK_PROMPT = """\
You are reviewing a CDK baseline diff for module '{module}'.

Read the steering file #[[file:.kiro/steering/diff-risk-assessment.md]] for the complete
risk classification rules, categories, and review process. Apply those rules exactly.

IMPORTANT CONTEXT: Baseline files only contain resources that are actively validated.
Resources matching `ignoreResourcePatterns` or properties matching `ignoreResourceProperties`
in the module's diff test are intentionally stripped from baselines. If a resource disappears
from the baseline and it matches a known ignore pattern, that removal is LOW — it means the
resource was excluded from baseline tracking, not deleted from the deployed infrastructure.

## Step 1: Read the CDK diff

Read the CDK diff from: {cdk_diff_file}

This shows what infrastructure resources changed. Identify each resource change and its type
(addition, deletion, property update, logical ID rename).

## Step 2: Review all code diff chunks

Read the code diff chunks from: {code_chunks_file}

This file contains ALL code changes across this module and its dependencies that could have
caused the infrastructure diff. Review every chunk to attribute resource changes to their
source. Each chunk has a header with File, Anchor, and Hash — copy these into findings.

## Step 3: Attribute and assess

For each resource change in the CDK diff, determine:
1. Which code chunk caused it
2. The risk level based on the steering file rules
3. The source attribution (copied from the chunk header)

Ignore patterns configured for this module's diff tests (resources matching these are
intentionally excluded from baselines — their removal from the baseline is LOW):
{ignore_patterns}

Dependency tree (only changes in these packages can affect this baseline):
{dependency_tree}

## Output

Write your assessment to the file {output_file} as a JSON object. No preamble, no markdown
fences, no explanation outside the JSON. The file must contain ONLY valid JSON.

Use this exact schema:

{{
  "overall_risk": "BLOCKING" | "HIGH" | "MEDIUM" | "LOW",
  "summary": "One paragraph explaining the overall risk and key concerns.",
  "findings": [
    {{
      "risk": "BLOCKING" | "HIGH" | "MEDIUM" | "LOW",
      "resource": "LogicalId (AWS::Service::Type)",
      "change": "One sentence: what changed and why it matters.",
      "chunk": "chunk-N or null if not attributable to a specific chunk",
      "source": "Copy the File and Anchor from the chunk header, e.g. lib/auth.ts:L193. Use Unknown - Please Investigate if chunk is null.",
      "source_hash": "Copy the Hash from the chunk header. Empty string if chunk is null."
    }}
  ]
}}

CRITICAL — Source attribution rules:
- The `source` field MUST be copied exactly from the chunk header: File + ":L" + Anchor.
- The `source_hash` field MUST be copied exactly from the chunk header's Hash value.
- If a finding cannot be attributed to any chunk, use chunk: null, source: "Unknown - Please Investigate", source_hash: "".
- Only include findings for resources that actually appear in THIS baseline's CDK diff.
- One finding per resource change. If a resource has multiple concerns, pick the highest risk.
- Omit LOW findings if there are BLOCKING or HIGH findings.
- Order findings: BLOCKING first, then HIGH, then MEDIUM, then LOW.
- Use only ASCII characters in all string values.
"""


def get_changed_baselines() -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", _target_ref(), "--", "*.baseline.json"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"WARNING: git diff failed (exit code {result.returncode}): {result.stderr.strip()}", file=sys.stderr)
        return []
    return [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]


def get_target_version(filepath: str) -> str | None:
    result = subprocess.run(
        ["git", "show", f"{_target_ref()}:{filepath}"],
        capture_output=True,
    )
    if result.returncode != 0:
        return None
    tmp = tempfile.NamedTemporaryFile(suffix=".json", delete=False)
    tmp.write(result.stdout)
    tmp.close()
    return tmp.name


def run_cdk_diff(old_file: str, new_file: str) -> str:
    result = subprocess.run(
        ["node", str(DIFF_HELPER), old_file, new_file],
        capture_output=True,
        text=True,
        timeout=60,
    )
    output = result.stdout.strip()
    if not output and result.stderr.strip():
        output = result.stderr.strip()
    return output or "No diff output captured"


def get_module_code_diff(baseline_path: str) -> str:
    """Get the source changes for the module that produced this baseline.

    Uses the nx project graph to find all transitive dependencies, then
    returns the combined git diff for the app's own code and all upstream
    dependency lib/ directories.
    """
    parts = Path(baseline_path).parts
    try:
        test_idx = parts.index("test")
        module_root = str(Path(*parts[:test_idx]))
    except ValueError:
        return "(could not determine module root from baseline path)"

    # Always include the app's own lib/ and sample_configs/
    diff_paths = [
        f"{module_root}/lib/",
        f"{module_root}/sample_configs/",
    ]

    # Use the nx project graph to find all upstream dependencies (transitive)
    pkg_json_path = Path(module_root) / "package.json"
    if pkg_json_path.is_file():
        with open(pkg_json_path) as f:
            pkg_data = json.load(f)
        pkg_name = pkg_data.get("name", "")

        if pkg_name:
            _, dep_roots = _get_transitive_deps(pkg_name)
            for dep_name, root in dep_roots.items():
                dep_lib = f"{root}/lib/"
                if Path(dep_lib).is_dir():
                    diff_paths.append(dep_lib)

    result = subprocess.run(
        ["git", "diff", _target_ref(), "--"] + diff_paths,
        capture_output=True,
        text=True,
    )

    code_diff = result.stdout.strip()
    if not code_diff:
        return "(no source code or sample config changes detected for this module)"

    return code_diff


def get_module_dependency_tree(baseline_path: str) -> str:
    """Get the nx dependency tree for the module that produced this baseline.

    Returns a formatted string showing all transitive dependencies,
    so Kiro can trace which upstream packages could affect this baseline.
    """
    parts = Path(baseline_path).parts
    try:
        test_idx = parts.index("test")
        module_root = str(Path(*parts[:test_idx]))
    except ValueError:
        return ""

    pkg_json_path = Path(module_root) / "package.json"
    if not pkg_json_path.is_file():
        return ""

    with open(pkg_json_path) as f:
        pkg_data = json.load(f)
    pkg_name = pkg_data.get("name", "")
    if not pkg_name:
        return ""

    dep_names, _ = _get_transitive_deps(pkg_name)
    if not dep_names:
        return ""

    lines = [f"All dependencies of {pkg_name} (direct and transitive):"]
    for dep in sorted(dep_names):
        lines.append(f"  - {dep}")
    return "\n".join(lines)


def extract_module(filepath: str) -> str:
    if "/test/" in filepath:
        return filepath.split("/test/")[0].split("/")[-1]
    return "unknown"


def extract_config(filepath: str) -> str:
    basename = Path(filepath).stem
    return basename.replace(".baseline", "")


def _get_ignore_patterns(baseline_path: str) -> str:
    """Extract ignoreResourcePatterns and ignoreResourceProperties from the module's diff test."""
    parts = Path(baseline_path).parts
    try:
        test_idx = parts.index("test")
        module_root = Path(*parts[:test_idx])
    except ValueError:
        return ""

    test_dir = module_root / "test"
    if not test_dir.is_dir():
        return ""

    patterns = []
    for diff_test in test_dir.glob("*.diff.test.ts"):
        content = diff_test.read_text()
        if "ignoreResourcePatterns" in content:
            patterns.append(f"ignoreResourcePatterns found in {diff_test.name}")
            for match in re.finditer(r"ignoreResourcePatterns:\s*\[([^\]]+)\]", content):
                patterns.append(f"  Patterns: {match.group(1).strip()}")
        if "ignoreResourceProperties" in content:
            patterns.append(f"ignoreResourceProperties found in {diff_test.name}")
            for match in re.finditer(r"ignoreResourceProperties:\s*\{([^}]+)\}", content):
                patterns.append(f"  Properties: {match.group(1).strip()}")

    return "\n".join(patterns) if patterns else ""


def _get_diff_paths(baseline_path: str) -> list[str]:
    """Return the source paths that were diffed for this baseline (for the report)."""
    parts = Path(baseline_path).parts
    try:
        test_idx = parts.index("test")
        module_root = str(Path(*parts[:test_idx]))
    except ValueError:
        return []

    paths = [f"{module_root}/lib/", f"{module_root}/sample_configs/"]
    module_name = parts[test_idx - 1]
    if module_name.endswith("-app"):
        l3_name = module_name.replace("-app", "-l3-construct")
        category = parts[test_idx - 2] if test_idx >= 3 else None
        if category:
            l3_path = f"packages/constructs/L3/{category}/{l3_name}/lib/"
            if Path(l3_path).is_dir():
                paths.append(l3_path)
    return paths


def check_baseline_coverage() -> list[dict]:
    """Verify every app package has a comprehensive baseline diff test."""
    ignored = _load_coverage_ignore()
    missing: list[dict] = []

    apps_root = PROJECT_ROOT / "packages" / "apps"
    if not apps_root.is_dir():
        return missing

    for pkg_json in sorted(apps_root.glob("*/*/package.json")):
        pkg_dir = pkg_json.parent
        rel_path = str(pkg_dir.relative_to(PROJECT_ROOT))

        if rel_path in ignored:
            continue

        snapshots_dir = pkg_dir / "test" / "__snapshots__"
        has_comprehensive_baseline = any(
            snapshots_dir.glob("sample-config-comprehensive*.baseline.json")
        ) if snapshots_dir.is_dir() else False

        has_diff_test = any((pkg_dir / "test").glob("*.diff.test.ts")) if (pkg_dir / "test").is_dir() else False

        has_comprehensive_config = any(
            (pkg_dir / "sample_configs").glob("*comprehensive*.yaml")
        ) if (pkg_dir / "sample_configs").is_dir() else False

        reasons = []
        if not has_comprehensive_config:
            reasons.append("missing sample_configs/sample-config-comprehensive.yaml")
        if not has_diff_test:
            reasons.append("missing *.diff.test.ts")
        if not has_comprehensive_baseline:
            reasons.append("missing comprehensive baseline snapshot")

        if has_diff_test:
            diff_tests = list((pkg_dir / "test").glob("*.diff.test.ts"))
            refs_comprehensive = any(
                "comprehensive" in dt.read_text() for dt in diff_tests
            )
            if not refs_comprehensive:
                reasons.append("diff test does not reference comprehensive config")

        if reasons:
            missing.append({
                "file": rel_path,
                "module": pkg_dir.name,
                "config": "comprehensive",
                "change_type": "missing_baseline",
                "cdk_diff": "; ".join(reasons),
                "code_diff_paths": [],
                "risk_assessment": "",
            })
            print(f"  [missing_baseline] {pkg_dir.name}: {'; '.join(reasons)}")

    return missing


def build_report(changed: list[str]) -> list[dict]:
    from concurrent.futures import ThreadPoolExecutor, as_completed

    max_threads = int(os.environ.get("KIRO_MAX_THREADS", "5"))

    # Phase 1: Collect CDK diffs (sequential — fast, uses git/node)
    pending: list[dict] = []
    for filepath in changed:
        module = extract_module(filepath)
        config = extract_config(filepath)
        target_file = get_target_version(filepath)

        if target_file is None:
            code_diff = get_module_code_diff(filepath)
            code_chunks = parse_diff_chunks(code_diff)
            pending.append({
                "file": filepath,
                "module": module,
                "config": config,
                "change_type": "added",
                "cdk_diff": "New baseline file (no previous version on target branch)",
                "code_diff": code_diff,
                "code_chunks": code_chunks,
                "code_chunks_formatted": format_chunks_for_prompt(code_chunks),
                "code_diff_paths": _get_diff_paths(filepath),
                "risk_assessment": "New baseline — no existing infrastructure affected.",
            })
            print(f"  [added] {module}/{config}")
        else:
            try:
                diff_output = run_cdk_diff(target_file, filepath)
            finally:
                os.unlink(target_file)
            code_diff = get_module_code_diff(filepath)
            code_chunks = parse_diff_chunks(code_diff)
            pending.append({
                "file": filepath,
                "module": module,
                "config": config,
                "change_type": "modified",
                "cdk_diff": diff_output,
                "code_diff": code_diff,
                "code_chunks": code_chunks,
                "code_chunks_formatted": format_chunks_for_prompt(code_chunks),
                "code_diff_paths": _get_diff_paths(filepath),
                "ignore_patterns": _get_ignore_patterns(filepath),
                "dependency_tree": get_module_dependency_tree(filepath),
                "risk_assessment": None,  # filled in phase 2
            })
            print(f"  [modified] {module}/{config}")

    # Phase 2: Run Kiro risk assessments in parallel for modified baselines
    modified = [e for e in pending if e["change_type"] == "modified"]
    if modified:
        print(f"\n  Running {len(modified)} risk assessment(s) with {max_threads} thread(s)...")

        def _assess(entry: dict) -> tuple[dict, str]:
            module = entry["module"]
            config = entry["config"]
            print(f"  [start] {module}/{config}")

            # Write CDK diff and code chunks to temp files so Kiro can read
            # them incrementally without prompt size limits.
            cdk_diff_file = tempfile.NamedTemporaryFile(
                mode="w", suffix=".diff", prefix=f"cdk-diff-{module.replace('/', '_')}-",
                delete=False, dir=str(PROJECT_ROOT),
            )
            cdk_diff_file.write(entry["cdk_diff"])
            cdk_diff_file.close()

            code_chunks_file = tempfile.NamedTemporaryFile(
                mode="w", suffix=".md", prefix=f"code-chunks-{module.replace('/', '_')}-",
                delete=False, dir=str(PROJECT_ROOT),
            )
            code_chunks_file.write(entry["code_chunks_formatted"])
            code_chunks_file.close()

            prompt = KIRO_RISK_PROMPT.format(
                module=module,
                cdk_diff_file=cdk_diff_file.name,
                code_chunks_file=code_chunks_file.name,
                output_file="{output_file}",
                ignore_patterns=entry.get("ignore_patterns", "") or "(none configured)",
                dependency_tree=entry.get("dependency_tree", "") or "(dependency tree not available)",
            )
            try:
                result = run_kiro_assessment(prompt, validate_json=True)
            except Exception as e:
                print(f"  [error] {module}/{config}: {e}", file=sys.stderr)
                result = f"(assessment failed: {e})"
            finally:
                # Clean up temp files
                for f in [cdk_diff_file.name, code_chunks_file.name]:
                    if os.path.isfile(f):
                        os.unlink(f)
            print(f"  [done]  {module}/{config}")
            return entry, result

        with ThreadPoolExecutor(max_workers=max_threads) as executor:
            futures = {executor.submit(_assess, e): e for e in modified}
            for future in as_completed(futures):
                try:
                    entry, assessment = future.result()
                    entry["risk_assessment"] = assessment
                except Exception as e:
                    failed_entry = futures[future]
                    print(f"  [error] {failed_entry['module']}/{failed_entry['config']}: {e}", file=sys.stderr)
                    failed_entry["risk_assessment"] = f"(assessment failed: {e})"

    # Build final entries
    entries = []
    for entry in pending:
        assessment = entry["risk_assessment"]
        parsed = _parse_risk_json(assessment) if isinstance(assessment, str) else None
        findings = parsed.get("findings", []) if parsed else []
        summary = parsed.get("summary", "") if parsed else ""

        # Compute source hash from the module root
        parts = Path(entry["file"]).parts
        try:
            test_idx = parts.index("test")
            module_root = str(PROJECT_ROOT / Path(*parts[:test_idx]))
        except ValueError:
            module_root = ""

        entries.append({
            "file": entry["file"],
            "module": entry["module"],
            "config": entry["config"],
            "change_type": entry["change_type"],
            "cdk_diff": entry["cdk_diff"],
            "code_diff_paths": entry["code_diff_paths"],
            "risk_assessment": assessment,
            "risk_level": _parse_risk_level(assessment),
            "findings": findings,
            "risk_summary": summary,
            "source_hash": compute_source_hash(module_root) if module_root else "",
        })

    # Generate overall summary across all baselines
    if entries:
        print("\n  Generating overall summary...")
        overall_summary = _generate_overall_summary(entries)
        if overall_summary:
            print(f"  Overall summary: {overall_summary[:100]}...")
        # Attach to first entry as metadata (consumed by post_baseline_threads)
        for entry in entries:
            entry["overall_summary"] = overall_summary

    return entries


def _generate_overall_summary(entries: list[dict]) -> str:
    """Generate a single concise paragraph summarizing all baseline changes.

    Invokes Kiro headless to synthesize individual per-baseline summaries
    into one cohesive overview.
    """
    if not shutil.which("kiro-cli") or not os.environ.get("KIRO_API_KEY"):
        return ""

    # Collect per-baseline summaries with their risk levels
    summaries = []
    for entry in entries:
        if entry.get("risk_summary"):
            summaries.append(f"[{entry.get('risk_level', 'UNKNOWN')}] {entry['module']}/{entry['config']}: {entry['risk_summary']}")

    if not summaries:
        return ""

    prompt = f"""\
Synthesize these individual baseline review summaries into a single concise paragraph
(3-5 sentences max) that captures the overall picture of what changed and the key risks.
Do not list each baseline individually. Focus on the distinct root causes and their impact.
Write the paragraph to {{output_file}} as plain text. No JSON, no markdown, no preamble.

Individual summaries:
{chr(10).join(summaries)}
"""

    try:
        return run_kiro_assessment(prompt)
    except Exception:
        return ""


def _load_coverage_ignore() -> set[str]:
    """Load the set of package paths to exclude from coverage checks."""
    ignored: set[str] = set(COVERAGE_IGNORE_DEFAULTS)
    if COVERAGE_IGNORE_FILE.is_file():
        for line in COVERAGE_IGNORE_FILE.read_text().splitlines():
            line = line.split("#", 1)[0].strip()
            if line:
                ignored.add(line)
    return ignored



def main() -> None:
    parser = argparse.ArgumentParser(description="Baseline review report generator")
    parser.add_argument(
        "--output-dir",
        default="baseline-review",
        help="Output directory for reports",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    changed = get_changed_baselines()
    if not changed:
        print("No baseline changes detected.")
        entries: list[dict] = []
    else:
        print(f"Found {len(changed)} changed baseline(s).")
        entries = build_report(changed)

    # Check baseline coverage for all app packages
    print("\nChecking baseline coverage...")
    coverage_entries = check_baseline_coverage()
    if not coverage_entries:
        print("All app packages have comprehensive baseline coverage.")

    all_entries = entries + coverage_entries

    # Full JSON report
    report_path = output_dir / "report.json"
    report_path.write_text(json.dumps(all_entries, indent=2))
    print(f"\nReport written to {report_path}")

    # Code Quality report
    cq_path = output_dir / "codequality-report.json"
    cq_path.write_text(to_codequality_json(all_entries, agent_name="baseline"))
    print(f"Code Quality report written to {cq_path}")

    # Summary
    added = sum(1 for e in all_entries if e["change_type"] == "added")
    modified = sum(1 for e in all_entries if e["change_type"] == "modified")
    missing = sum(1 for e in all_entries if e["change_type"] == "missing_baseline")
    print(f"\nSummary: {added} new, {modified} modified baseline(s), {missing} missing coverage")


if __name__ == "__main__":
    main()

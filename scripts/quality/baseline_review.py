#!/usr/bin/env python3
"""
Baseline Review — detects baseline diffs, assesses risk via Kiro, and produces test reports.

1. Detects .baseline.json files changed between origin/main and the feature branch
2. For each changed baseline, runs CDK diff between the main and branch versions
3. Collects the corresponding source code changes for the module
4. Pipes the CDK diff + code changes through Kiro headless for risk assessment
   using the diff-risk-assessment steering file
5. Verifies every app package has a comprehensive baseline diff test
6. Produces a JUnit XML report for GitLab MR test summary and a JSON report for
   downstream CI consumption

Outputs:
  baseline-review/report.json       - Full structured report with CDK diff and risk assessment
  baseline-review/junit-report.xml  - JUnit XML for GitLab MR test reports

Environment:
  KIRO_API_KEY                      - Required for risk assessment (Kiro headless auth)

Usage:
  python3 scripts/baseline_review.py [--output-dir baseline-review]
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom.minidom import parseString

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
DIFF_HELPER = PROJECT_ROOT / "scripts" / "test" / "baseline-diff-helper.mjs"

COVERAGE_IGNORE_FILE = PROJECT_ROOT / ".baseline-coverage-ignore"
COVERAGE_IGNORE_DEFAULTS = [
    "packages/apps/core/app",
    "packages/apps/core/bootstrap",
    "packages/apps/core/devops",
]

KIRO_RISK_PROMPT = """\
Review this CDK baseline diff for module '{module}'. Classify each resource change.

IMPORTANT CONTEXT: Baseline files only contain resources that are actively validated.
Resources matching `ignoreResourcePatterns` or properties matching `ignoreResourceProperties`
in the module's diff test are intentionally stripped from baselines. If a resource disappears
from the baseline and it matches a known ignore pattern, that removal is SAFE — it means the
resource was excluded from baseline tracking, not deleted from the deployed infrastructure.

CDK Diff:
```
{cdk_diff}
```

Source changes (code and sample config changes that caused the infrastructure diff):
```diff
{code_diff}
```

Ignore patterns configured for this module's diff tests (resources matching these are
intentionally excluded from baselines — their removal from the baseline is SAFE):
{ignore_patterns}

Write your assessment to the file {output_file} using ONLY the following markdown format.
No preamble, no explanation outside the format. Use only ASCII characters — no emojis, no unicode symbols.

Start with the overall risk on one line:

**Overall Risk: BLOCKING | HIGH | SAFE**

Then write a one-paragraph summary explaining the overall risk and key concerns.

Then for each finding, output a separate table:

| | |
|---|---|
| **Risk** | BLOCKING / HIGH / SAFE |
| **Resource** | `LogicalId` (AWS::Service::Type) |
| **Change** | One sentence: what changed and why it matters |
| **Source** | `path/to/file.ts:L42` or `sample_configs/sample-config-comprehensive.yaml` or Unknown - Please Investigate |

If any IAM privilege escalation or new CDK Nag suppressions exist, add one table per finding.
Omit SAFE findings if there are BLOCKING or HIGH findings. Keep each table compact.
Order findings: BLOCKING first, then HIGH, then SAFE.
"""


def get_changed_baselines() -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", "origin/main", "--", "*.baseline.json"],
        capture_output=True,
        text=True,
    )
    return [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]


def get_main_version(filepath: str) -> str | None:
    result = subprocess.run(
        ["git", "show", f"origin/main:{filepath}"],
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

    Traces from the baseline file back to the app module's lib/ and sample_configs/
    directories, the corresponding L3 construct's lib/ directory, and L2 constructs,
    then returns the combined git diff for those paths.
    """
    # baseline_path: packages/apps/{category}/{module}-app/test/__snapshots__/foo.baseline.json
    # module root:   packages/apps/{category}/{module}-app/
    parts = Path(baseline_path).parts
    try:
        test_idx = parts.index("test")
        module_root = str(Path(*parts[:test_idx]))
    except ValueError:
        return "(could not determine module root from baseline path)"

    # Collect paths to diff: app lib/, app sample_configs/, and L3/L2 construct lib/
    diff_paths = [
        f"{module_root}/lib/",
        f"{module_root}/sample_configs/",
    ]

    # Try to find the corresponding L3 construct
    # App: packages/apps/{category}/{name}-app
    # L3:  packages/constructs/L3/{category}/{name}-l3-construct
    module_name = parts[test_idx - 1]  # e.g., "audit-app"
    if module_name.endswith("-app"):
        l3_name = module_name.replace("-app", "-l3-construct")
        # category is two levels up from the module dir
        category = parts[test_idx - 2] if test_idx >= 3 else None
        if category:
            l3_path = f"packages/constructs/L3/{category}/{l3_name}/lib/"
            if Path(l3_path).is_dir():
                diff_paths.append(l3_path)

    # Also check for L2 construct changes that might affect this module
    diff_paths.append("packages/constructs/L2/")

    result = subprocess.run(
        ["git", "diff", "origin/main", "--"] + diff_paths,
        capture_output=True,
        text=True,
    )

    code_diff = result.stdout.strip()
    if not code_diff:
        return "(no source code or sample config changes detected for this module)"

    # Truncate if very large to stay within Kiro context limits
    max_chars = 15000
    if len(code_diff) > max_chars:
        code_diff = code_diff[:max_chars] + f"\n\n... (truncated, {len(code_diff)} total chars)"

    return code_diff


def run_kiro_risk_assessment(module: str, cdk_diff: str, code_diff: str, ignore_patterns: str = "") -> str:
    """Pipe the CDK diff and code changes through Kiro headless for risk assessment.

    Kiro writes the assessment to a temp file to avoid terminal UI noise in stdout.
    Raises SystemExit if risk assessment fails.
    """
    if not shutil.which("kiro-cli"):
        print("ERROR: kiro-cli not found.", file=sys.stderr)
        sys.exit(1)

    if not os.environ.get("KIRO_API_KEY"):
        print("ERROR: KIRO_API_KEY not set.", file=sys.stderr)
        sys.exit(1)

    # Use a temp file for Kiro to write the assessment — avoids terminal UI noise in stdout
    output_file = tempfile.NamedTemporaryFile(
        suffix=".md", prefix="kiro-risk-", delete=False, dir=str(PROJECT_ROOT)
    )
    output_path = output_file.name
    output_file.close()

    prompt = KIRO_RISK_PROMPT.format(
        module=module,
        cdk_diff=cdk_diff,
        code_diff=code_diff,
        output_file=output_path,
        ignore_patterns=ignore_patterns or "(none configured)",
    )

    env = {**os.environ, "KIRO_LOG_NO_COLOR": "1"}

    try:
        result = subprocess.run(
            [
                "kiro-cli", "chat",
                "--no-interactive",
                "--trust-tools=write",
                prompt,
            ],
            capture_output=True,
            text=True,
            timeout=600,
            cwd=str(PROJECT_ROOT),
            env=env,
        )
        if result.returncode != 0:
            stderr = result.stderr.strip()
            print(f"ERROR: kiro-cli failed (exit code {result.returncode}):\n{stderr}", file=sys.stderr)
            sys.exit(1)

        # Read the assessment from the file Kiro wrote
        if not os.path.isfile(output_path) or os.path.getsize(output_path) == 0:
            print("ERROR: kiro-cli did not write assessment to output file.", file=sys.stderr)
            sys.exit(1)

        with open(output_path) as f:
            output = f.read().strip()

        print(f"  Risk assessment received ({len(output)} chars)")
        return output
    except subprocess.TimeoutExpired:
        print("ERROR: kiro-cli timed out after 600s.", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: kiro-cli failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if os.path.isfile(output_path):
            os.unlink(output_path)


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
    import re
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


def build_report(changed: list[str]) -> list[dict]:
    entries = []
    for filepath in changed:
        module = extract_module(filepath)
        config = extract_config(filepath)
        main_file = get_main_version(filepath)

        if main_file is None:
            diff_output = "New baseline file (no previous version on main)"
            change_type = "added"
            code_diff = get_module_code_diff(filepath)
            risk_assessment = "New baseline — no existing infrastructure affected."
        else:
            try:
                diff_output = run_cdk_diff(main_file, filepath)
            finally:
                os.unlink(main_file)
            change_type = "modified"
            code_diff = get_module_code_diff(filepath)

            print(f"  Running risk assessment for {module}/{config}...")
            ignore_patterns = _get_ignore_patterns(filepath)
            risk_assessment = run_kiro_risk_assessment(module, diff_output, code_diff, ignore_patterns)

        entries.append({
            "file": filepath,
            "module": module,
            "config": config,
            "change_type": change_type,
            "cdk_diff": diff_output,
            "code_diff_paths": _get_diff_paths(filepath),
            "risk_assessment": risk_assessment,
            "risk_level": _parse_risk_level(risk_assessment),
        })
        print(f"  [{change_type}] {module}/{config}")

    return entries


def _parse_risk_level(risk_assessment: str) -> str:
    """Extract the overall risk level from the Kiro risk assessment output."""
    import re
    match = re.search(r'Overall Risk:\s*(BLOCKING|HIGH|SAFE)', risk_assessment, re.IGNORECASE)
    return match.group(1).upper() if match else "UNKNOWN"


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


def _load_coverage_ignore() -> set[str]:
    """Load the set of package paths to exclude from coverage checks."""
    ignored: set[str] = set(COVERAGE_IGNORE_DEFAULTS)
    if COVERAGE_IGNORE_FILE.is_file():
        for line in COVERAGE_IGNORE_FILE.read_text().splitlines():
            line = line.split("#", 1)[0].strip()
            if line:
                ignored.add(line)
    return ignored


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


def to_junit_xml(entries: list[dict]) -> str:
    testsuites = Element("testsuites")
    testsuite = SubElement(testsuites, "testsuite", {
        "name": "Baseline Review",
        "tests": str(len(entries)),
        "failures": str(sum(1 for e in entries if e["change_type"] in ("modified", "missing_baseline"))),
    })

    for entry in entries:
        testcase = SubElement(testsuite, "testcase", {
            "name": f"{entry['module']}/{entry['config']}",
            "classname": "baseline-review",
            "file": entry["file"],
        })

        if entry["change_type"] == "added":
            SubElement(testcase, "system-out").text = "New baseline (no previous version on main)"
        elif entry["change_type"] == "modified":
            failure = SubElement(testcase, "failure", {
                "message": f"Infrastructure changes detected in {entry['module']} — review risk assessment in MR thread",
            })
            failure.text = _sanitize_xml(entry["cdk_diff"])
        elif entry["change_type"] == "missing_baseline":
            failure = SubElement(testcase, "failure", {
                "message": f"Missing comprehensive baseline coverage for {entry['module']}",
            })
            failure.text = _sanitize_xml(entry["cdk_diff"])

    raw = tostring(testsuites, encoding="unicode")
    return parseString(raw).toprettyxml(indent="  ", encoding=None)


def _sanitize_xml(text: str) -> str:
    """Remove characters that are invalid in XML 1.0."""
    import re
    # XML 1.0 valid chars: #x9 | #xA | #xD | [#x20-#xD7FF] | [#xE000-#xFFFD] | [#x10000-#x10FFFF]
    return re.sub(
        r'[^\x09\x0A\x0D\x20-\uD7FF\uE000-\uFFFD\U00010000-\U0010FFFF]',
        '',
        text,
    )


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

    # JUnit XML report
    junit_path = output_dir / "junit-report.xml"
    junit_path.write_text(to_junit_xml(all_entries))
    print(f"JUnit report written to {junit_path}")

    # Summary
    added = sum(1 for e in all_entries if e["change_type"] == "added")
    modified = sum(1 for e in all_entries if e["change_type"] == "modified")
    missing = sum(1 for e in all_entries if e["change_type"] == "missing_baseline")
    print(f"\nSummary: {added} new, {modified} modified baseline(s), {missing} missing coverage")


if __name__ == "__main__":
    main()

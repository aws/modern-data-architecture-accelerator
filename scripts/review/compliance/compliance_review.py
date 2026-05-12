#!/usr/bin/env python3
"""
Compliance Review — reviews changed L2/L3 constructs for security and compliance issues.

1. Detects L2/L3 construct packages with changed lib/ files
2. For each package, collects the code diff, full source, test files, and dependency tree
3. Pipes context through Kiro headless for compliance assessment
4. Produces a JSON report and Code Quality report for GitLab MR

Outputs:
  compliance-review/report.json       - Full structured report with findings

Environment:
  KIRO_API_KEY                        - Required for compliance assessment
  KIRO_TIMEOUT                        - Optional, default 600s
  KIRO_MAX_THREADS                    - Optional, default 5

Usage:
  python3 scripts/review/compliance/compliance_review.py [--output-dir compliance-review]
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

# Add scripts/ to Python path so review.lib imports work when run directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.nx_graph import PROJECT_ROOT, _target_ref, get_downstream_consumers
from review.lib.kiro_integration import (
    run_kiro_assessment,
    KiroError,
    _parse_risk_json,
    _parse_risk_level,
)
from review.lib.report import to_codequality_json
from review.lib.thread_lifecycle import compute_source_hash
from review.lib.safety import verify_no_false_negative, FalseNegativeError
from review.lib.file_collector import collect_files
from review.lib.diff_parser import parse_diff_chunks, format_chunks_for_prompt, attach_source_hashes


KIRO_PROMPT = """\
You are reviewing construct code changes for compliance with MDAA security standards.

Read the steering file #[[file:.kiro/steering/compliance-review.md]] for the complete
compliance rules, categories, and the CI Agent Usage section for output format.

Package: {package_name}
Package type: {package_type}

## Step 1: Review all code diff chunks

Read the diff chunks from: {code_chunks_file}

This file contains ALL code changes in this MR for this package. Review every chunk
for compliance concerns: encryption, access controls, IAM policies, security groups,
nag suppressions, and logging. Each chunk has a header with File, Anchor, and Hash
that you MUST copy into findings.

## Step 2: Check source context (on demand)

If you need to understand the surrounding code for any chunk (e.g., to see what
resource a policy is attached to, or what encryption settings exist on a construct),
read the full source from: {full_source_file}

You do NOT need to read the full source upfront. Only read it when a diff chunk
raises a question that requires surrounding context to answer.

## Step 3: Verify test coverage exists

Test files (to verify compliance assertions exist):
```
{test_source}
```

Note: Do NOT report missing tests — that is handled by the Test Standards agent.
Only use test files to understand whether a compliance control has assertions.

## Context

Dependency tree (downstream consumers of this package):
{dependency_tree}

## Output

CRITICAL — Line number rules:
- The `line` field in each finding MUST be copied from the Anchor value of the chunk
  that contains the issue. For example, if the chunk header says "Anchor: L193", use 193.
- Do NOT compute your own line numbers. Copy from the chunk header.
- If the issue spans multiple chunks, use the anchor of the most relevant chunk.
- If the issue cannot be attributed to a specific chunk, use 0.

Write your assessment to the file {output_file} as a JSON object following the schema
in the CI Agent Usage section of the steering file. No preamble, no markdown fences,
no explanation outside the JSON. The file must contain ONLY valid JSON.
"""


def get_changed_construct_packages() -> list[dict]:
    """Detect L2/L3 construct packages with changed lib/ files.

    Calls changed-only.py as subprocess with --extensions .ts, then filters
    to packages under packages/constructs/L2/ or packages/constructs/L3/.
    """
    result = subprocess.run(
        [
            sys.executable, str(PROJECT_ROOT / "scripts" / "nx" / "changed-only.py"),
            _target_ref(), "HEAD",
            "--extensions", ".ts",
        ],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    if result.returncode != 0 or not result.stdout.strip():
        return []

    project_names = json.loads(result.stdout)

    # Resolve project names to roots via nx graph
    from review.lib.nx_graph import _load_project_graph
    graph = _load_project_graph()
    nodes = graph.get("nodes", {}) if graph else {}

    packages = []
    for name in project_names:
        node = nodes.get(name, {})
        root = node.get("data", {}).get("root", "")
        if not root:
            continue
        # Filter to L2/L3 constructs only
        if root.startswith("packages/constructs/L2/"):
            packages.append({"name": name, "root": root, "type": "L2"})
        elif root.startswith("packages/constructs/L3/"):
            packages.append({"name": name, "root": root, "type": "L3"})

    return packages


def collect_code_diff(package_root: str) -> str:
    """Get the git diff for a package's lib/ directory."""
    result = subprocess.run(
        ["git", "diff", _target_ref(), "--", f"{package_root}/lib/"],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    diff = result.stdout.strip()
    if not diff:
        return "(no lib/ changes detected)"
    return diff


def collect_full_source(package_root: str) -> str:
    """Read all .ts files in the package's lib/ directory (no truncation — read on demand by Kiro)."""
    return collect_files(
        PROJECT_ROOT / package_root / "lib", "**/*.ts", max_chars=0,
        empty_message="(no .ts files in lib/)",
    )


def collect_test_source(package_root: str, max_chars: int = 10000) -> str:
    """Read compliance test files for the package."""
    test_dir = PROJECT_ROOT / package_root / "test"
    if not test_dir.is_dir():
        return "(no test/ directory)"

    result = collect_files(test_dir, "*.compliance.test.ts", max_chars, empty_message="")
    if not result:
        result = collect_files(test_dir, "*.test.ts", max_chars, empty_message="(no test files found)", limit=3)
    return result


def get_dependency_tree(package_name: str) -> str:
    """Get formatted dependency tree showing downstream consumers."""
    consumers = get_downstream_consumers(package_name)
    if not consumers:
        return "(no downstream consumers)"

    lines = [f"Downstream consumers of {package_name} ({len(consumers)} packages):"]
    for c in consumers:
        lines.append(f"  - {c}")
    return "\n".join(lines)


def assess_package(pkg: dict) -> dict:
    """Run Kiro compliance assessment for a single package."""
    name = pkg["name"]
    root = pkg["root"]
    pkg_type = pkg["type"]

    print(f"  [start] {name} ({pkg_type})")

    code_diff = collect_code_diff(root)
    code_chunks = parse_diff_chunks(code_diff)
    full_source = collect_full_source(root)
    test_source = collect_test_source(root)
    dep_tree = get_dependency_tree(name)

    # Write large content to temp files for Kiro to read incrementally
    from review.lib.temp_files import temp_review_files

    safe_name = name.replace("/", "_").replace("@", "")
    chunks_text = format_chunks_for_prompt(code_chunks)

    with temp_review_files(
        {"chunks": chunks_text, "source": full_source},
        prefix=f"{safe_name}-",
        directory=str(PROJECT_ROOT),
    ) as paths:
        prompt = KIRO_PROMPT.format(
            package_name=name,
            package_type=pkg_type,
            code_chunks_file=paths["chunks"],
            full_source_file=paths["source"],
            test_source=test_source,
            dependency_tree=dep_tree,
            output_file="{output_file}",
        )

        assessment = run_kiro_assessment(prompt, validate_json=True)

    parsed = _parse_risk_json(assessment)
    findings = parsed.get("findings", []) if parsed else []
    summary = parsed.get("summary", "") if parsed else ""
    risk_level = _parse_risk_level(assessment)

    # Attach chunk content hashes to findings for per-chunk source tracking
    attach_source_hashes(findings, code_chunks)

    print(f"  [done]  {name} — {risk_level} ({len(findings)} findings)")

    return {
        "package": name,
        "root": root,
        "type": pkg_type,
        "risk_level": risk_level,
        "risk_summary": summary,
        "findings": findings,
        "risk_assessment": assessment,
        "source_hash": compute_source_hash(str(PROJECT_ROOT / root)),
    }


def build_report(packages: list[dict]) -> list[dict]:
    """Run compliance assessments in parallel."""
    max_threads = int(os.environ.get("KIRO_MAX_THREADS", "5"))
    entries = []

    if not packages:
        return entries

    print(f"\n  Running {len(packages)} assessment(s) with {max_threads} thread(s)...")

    with ThreadPoolExecutor(max_workers=max_threads) as executor:
        futures = {executor.submit(assess_package, pkg): pkg for pkg in packages}
        for future in as_completed(futures):
            pkg = futures[future]
            try:
                entries.append(future.result())
            except KiroError as e:
                print(f"  [error] {pkg['name']} — {e}")
                entries.append({
                    "package": pkg["name"],
                    "root": pkg["root"],
                    "type": pkg["type"],
                    "risk_level": "UNKNOWN",
                    "risk_summary": f"Assessment failed: {e}",
                    "findings": [],
                    "risk_assessment": "",
                    "source_hash": "",
                })

    return entries



def main() -> None:
    parser = argparse.ArgumentParser(description="Compliance review report generator")
    parser.add_argument(
        "--output-dir",
        default="compliance-review",
        help="Output directory for reports",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    # Detect changed construct packages
    print("Detecting changed L2/L3 construct packages...")
    packages = get_changed_construct_packages()

    if not packages:
        # Sanity check: verify changed-only.py didn't fail silently
        try:
            verify_no_false_negative("packages/constructs/", [".ts"])
        except FalseNegativeError as e:
            print("\n" + "=" * 70)
            print("REVIEW AGENT FAILURE: Silent pass-through detected")
            print("=" * 70)
            print(f"\n{e}")
            print("\nThe review did NOT run. Failing to prevent unreviewed code from merging.")
            print("\n" + "=" * 70)
            sys.exit(1)
        print("No L2/L3 construct changes detected.")
        report_path = output_dir / "report.json"
        report_path.write_text("[]")
        (output_dir / "codequality-report.json").write_text("[]")
        print("Empty reports written. Thread posting will confirm agent ran.")
        return

    print(f"Found {len(packages)} changed construct package(s):")
    for pkg in packages:
        print(f"  - {pkg['name']} ({pkg['type']})")

    # Run assessments
    entries = build_report(packages)

    # Write JSON report
    report_path = output_dir / "report.json"
    report_path.write_text(json.dumps(entries, indent=2))
    print(f"\nReport written to {report_path}")


    # Code Quality report
    cq_path = output_dir / "codequality-report.json"
    cq_path.write_text(to_codequality_json(entries, agent_name="compliance"))
    print(f"Code Quality report written to {cq_path}")

    # Summary
    risk_counts = {}
    for e in entries:
        risk_counts[e["risk_level"]] = risk_counts.get(e["risk_level"], 0) + 1
    print(f"\nSummary: {', '.join(f'{v} {k}' for k, v in sorted(risk_counts.items()))}")


if __name__ == "__main__":
    main()

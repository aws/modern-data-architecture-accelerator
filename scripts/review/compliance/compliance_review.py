#!/usr/bin/env python3
"""
Compliance Review — reviews changed L2/L3 constructs for security and compliance issues.

1. Detects L2/L3 construct packages with changed lib/ files
2. For each package, collects the code diff, full source, test files, and dependency tree
3. Pipes context through Kiro headless for compliance assessment
4. Produces a JSON report and JUnit XML for GitLab MR test summary

Outputs:
  compliance-review/report.json       - Full structured report with findings
  compliance-review/junit-report.xml  - JUnit XML for GitLab MR test reports

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
from review.lib.report import to_junit_xml
from review.lib.thread_lifecycle import compute_source_hash
from review.lib.safety import verify_no_false_negative, FalseNegativeError
from review.lib.file_collector import collect_files


KIRO_PROMPT = """\
You are reviewing construct code changes for compliance with MDAA security standards.

Read the steering file #[[file:.kiro/steering/compliance-review.md]] for the complete
compliance rules, categories, and the CI Agent Usage section for output format.

Package: {package_name}
Package type: {package_type}

Code diff (changes in this MR):
```diff
{code_diff}
```

Full source code (current state of lib/ directory):
```
{full_source}
```

Test files (to verify compliance assertions exist):
```
{test_source}
```

Dependency tree (downstream consumers of this package):
{dependency_tree}

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


def collect_code_diff(package_root: str, max_chars: int = 15000) -> str:
    """Get the git diff for a package's lib/ directory."""
    result = subprocess.run(
        ["git", "diff", _target_ref(), "--", f"{package_root}/lib/"],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    diff = result.stdout.strip()
    if not diff:
        return "(no lib/ changes detected)"
    if len(diff) > max_chars:
        diff = diff[:max_chars] + f"\n\n... (truncated, {len(diff)} total chars)"
    return diff


def collect_full_source(package_root: str, max_chars: int = 20000) -> str:
    """Read all .ts files in the package's lib/ directory."""
    return collect_files(
        PROJECT_ROOT / package_root / "lib", "**/*.ts", max_chars,
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
    full_source = collect_full_source(root)
    test_source = collect_test_source(root)
    dep_tree = get_dependency_tree(name)

    prompt = KIRO_PROMPT.format(
        package_name=name,
        package_type=pkg_type,
        code_diff=code_diff,
        full_source=full_source,
        test_source=test_source,
        dependency_tree=dep_tree,
        output_file="{output_file}",
    )

    assessment = run_kiro_assessment(prompt, validate_json=True)
    parsed = _parse_risk_json(assessment)
    findings = parsed.get("findings", []) if parsed else []
    summary = parsed.get("summary", "") if parsed else ""
    risk_level = _parse_risk_level(assessment)

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


def build_junit_entries(entries: list[dict]) -> list[dict]:
    """Convert report entries to JUnit XML format."""
    junit_entries = []
    for entry in entries:
        risk = entry["risk_level"]
        has_findings = bool(entry["findings"])

        if risk == "LOW" and not has_findings:
            status = "info"
        elif has_findings:
            status = "fail"
        else:
            status = "info"

        junit_entries.append({
            "name": f"{entry['package']} ({entry['type']})",
            "file": entry["root"],
            "status": status,
            "message": f"Compliance {risk}: {entry.get('risk_summary', '')[:200]}" if status == "fail" else "",
            "detail": json.dumps(entry["findings"], indent=2) if status == "fail" else "",
            "info": f"Risk: {risk}. {entry.get('risk_summary', '')}" if status == "info" else "",
        })

    return junit_entries


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
        junit_path = output_dir / "junit-report.xml"
        junit_path.write_text(to_junit_xml([], suite_name="Compliance Review"))
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

    # Write JUnit XML
    junit_entries = build_junit_entries(entries)
    junit_path = output_dir / "junit-report.xml"
    junit_path.write_text(to_junit_xml(junit_entries, suite_name="Compliance Review"))
    print(f"JUnit report written to {junit_path}")

    # Summary
    risk_counts = {}
    for e in entries:
        risk_counts[e["risk_level"]] = risk_counts.get(e["risk_level"], 0) + 1
    print(f"\nSummary: {', '.join(f'{v} {k}' for k, v in sorted(risk_counts.items()))}")


if __name__ == "__main__":
    main()

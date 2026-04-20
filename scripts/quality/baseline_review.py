#!/usr/bin/env python3
"""
Baseline Review — detects baseline diffs and produces test reports.

1. Detects .baseline.json files changed between origin/main and the feature branch
2. For each changed baseline, runs CDK diff between the main and branch versions
3. Verifies every app package has a comprehensive baseline diff test
4. Produces a JUnit XML report for GitLab MR test summary and a JSON report for
   downstream CI consumption

Outputs:
  baseline-review/report.json       - Full structured report with CDK diff details
  baseline-review/junit-report.xml  - JUnit XML for GitLab MR test reports

Usage:
  python3 scripts/baseline_review.py [--output-dir baseline-review]
"""

from __future__ import annotations

import argparse
import json
import os
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
# App packages that don't follow the standard sample_configs / diff-test pattern
COVERAGE_IGNORE_DEFAULTS = [
    "packages/apps/core/app",
    "packages/apps/core/bootstrap",
    "packages/apps/core/devops",
]


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


def extract_module(filepath: str) -> str:
    if "/test/" in filepath:
        return filepath.split("/test/")[0].split("/")[-1]
    return "unknown"


def extract_config(filepath: str) -> str:
    basename = Path(filepath).stem
    return basename.replace(".baseline", "")


def build_report(changed: list[str]) -> list[dict]:
    entries = []
    for filepath in changed:
        module = extract_module(filepath)
        config = extract_config(filepath)
        main_file = get_main_version(filepath)

        if main_file is None:
            diff_output = "New baseline file (no previous version on main)"
            change_type = "added"
        else:
            try:
                diff_output = run_cdk_diff(main_file, filepath)
            finally:
                os.unlink(main_file)
            change_type = "modified"

        entries.append({
            "file": filepath,
            "module": module,
            "config": config,
            "change_type": change_type,
            "cdk_diff": diff_output,
        })
        print(f"  [{change_type}] {module}/{config}")

    return entries


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
                "message": f"Infrastructure changes detected in {entry['module']}",
            })
            failure.text = entry["cdk_diff"]
        elif entry["change_type"] == "missing_baseline":
            failure = SubElement(testcase, "failure", {
                "message": f"Missing comprehensive baseline coverage for {entry['module']}",
            })
            failure.text = entry["cdk_diff"]

    raw = tostring(testsuites, encoding="unicode")
    return parseString(raw).toprettyxml(indent="  ", encoding=None)


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

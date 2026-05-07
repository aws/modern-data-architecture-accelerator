#!/usr/bin/env python3
"""
Test Standards Review — reviews changed packages for test coverage and standards alignment.

1. Detects packages with changed lib/, test/, sample_configs/, or jest.config.* files
2. For each package, collects test files, sample configs, jest config, baselines, and code diff
3. Pipes context through Kiro headless for test standards assessment
4. Produces a JSON report and JUnit XML for GitLab MR test summary

Outputs:
  test-standards-review/report.json       - Full structured report with findings
  test-standards-review/junit-report.xml  - JUnit XML for GitLab MR test reports

Environment:
  KIRO_API_KEY                            - Required for assessment
  KIRO_TIMEOUT                            - Optional, default 600s
  KIRO_MAX_THREADS                        - Optional, default 5

Usage:
  python3 scripts/review/test_standards/test_standards_review.py [--output-dir test-standards-review]
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

from review.lib.nx_graph import PROJECT_ROOT, _target_ref, _load_project_graph
from review.lib.kiro_integration import (
    run_kiro_assessment,
    KiroError,
    _parse_risk_json,
    _parse_risk_level,
)
from review.lib.report import to_junit_xml
from review.lib.thread_lifecycle import compute_source_hash
from review.lib.safety import verify_no_false_negative, FalseNegativeError
from review.lib.package_utils import classify_package
from review.lib.file_collector import collect_files


KIRO_PROMPT = """\
You are reviewing test standards alignment for package '{package_name}'.

Read the steering file #[[file:.kiro/steering/testing-standards.md]] for the complete
testing standards and the CI Agent Usage section for output format.

Package: {package_name}
Package type: {package_type}

Code diff (lib/ changes in this MR — these need test coverage):
```diff
{code_diff}
```

Test files (current state):
```
{test_source}
```

Sample config filenames:
{sample_configs}

Baseline filenames:
{baselines}

Jest config:
```
{jest_config}
```

Write your assessment to the file {output_file} as a JSON object following the schema
in the CI Agent Usage section of the steering file. No preamble, no markdown fences,
no explanation outside the JSON. The file must contain ONLY valid JSON.
"""


def get_changed_packages() -> list[dict]:
    """Detect packages with changed files relevant to test standards."""
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

    graph = _load_project_graph()
    nodes = graph.get("nodes", {}) if graph else {}

    packages = []
    for name in project_names:
        node = nodes.get(name, {})
        root = node.get("data", {}).get("root", "")
        if not root:
            continue
        pkg_type = classify_package(root)
        if pkg_type in ("L2", "L3", "app"):
            packages.append({"name": name, "root": root, "type": pkg_type})

    return packages


def collect_code_diff(package_root: str, max_chars: int = 15000) -> str:
    """Get the git diff for a package's lib/ directory."""
    result = subprocess.run(
        ["git", "diff", _target_ref(), "--", f"{package_root}/lib/"],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    diff = result.stdout.strip()
    if not diff:
        return "(no lib/ changes)"
    if len(diff) > max_chars:
        diff = diff[:max_chars] + f"\n\n... (truncated, {len(diff)} total chars)"
    return diff


def collect_test_source(package_root: str, max_chars: int = 15000) -> str:
    """Read test files for the package."""
    test_dir = PROJECT_ROOT / package_root / "test"
    if not test_dir.is_dir():
        return "(no test/ directory)"

    return collect_files(test_dir, "*.test.ts", max_chars, empty_message="(no test files found)")


def list_sample_configs(package_root: str) -> str:
    """List sample config filenames."""
    config_dir = PROJECT_ROOT / package_root / "sample_configs"
    if not config_dir.is_dir():
        return "(no sample_configs/ directory)"
    configs = sorted(config_dir.glob("*.yaml"))
    if not configs:
        return "(no .yaml files in sample_configs/)"
    return "\n".join(f"  - {c.name}" for c in configs)


def list_baselines(package_root: str) -> str:
    """List baseline filenames."""
    snap_dir = PROJECT_ROOT / package_root / "test" / "__snapshots__"
    if not snap_dir.is_dir():
        return "(no __snapshots__/ directory)"
    baselines = sorted(snap_dir.glob("*.baseline.json"))
    if not baselines:
        return "(no baseline files)"
    return "\n".join(f"  - {b.name}" for b in baselines)


def collect_jest_config(package_root: str) -> str:
    """Read jest.config.js for the package."""
    jest_path = PROJECT_ROOT / package_root / "jest.config.js"
    if not jest_path.is_file():
        return "(no jest.config.js)"
    return jest_path.read_text()


def assess_package(pkg: dict) -> dict:
    """Run Kiro test standards assessment for a single package."""
    name = pkg["name"]
    root = pkg["root"]
    pkg_type = pkg["type"]

    print(f"  [start] {name} ({pkg_type})")

    prompt = KIRO_PROMPT.format(
        package_name=name,
        package_type=pkg_type,
        code_diff=collect_code_diff(root),
        test_source=collect_test_source(root),
        sample_configs=list_sample_configs(root),
        baselines=list_baselines(root),
        jest_config=collect_jest_config(root),
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
    """Run test standards assessments in parallel."""
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

        junit_entries.append({
            "name": f"{entry['package']} ({entry['type']})",
            "file": entry["root"],
            "status": "fail" if has_findings else "info",
            "message": f"Testing Gap {risk}: {entry.get('risk_summary', '')[:200]}" if has_findings else "",
            "detail": json.dumps(entry["findings"], indent=2) if has_findings else "",
            "info": f"Risk: {risk}. {entry.get('risk_summary', '')}" if not has_findings else "",
        })

    return junit_entries


def main() -> None:
    parser = argparse.ArgumentParser(description="Test standards review report generator")
    parser.add_argument(
        "--output-dir",
        default="test-standards-review",
        help="Output directory for reports",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Detecting changed packages...")
    packages = get_changed_packages()

    if not packages:
        try:
            verify_no_false_negative("packages/", [".ts"])
        except FalseNegativeError as e:
            print("\n" + "=" * 70)
            print("REVIEW AGENT FAILURE: Silent pass-through detected")
            print("=" * 70)
            print(f"\n{e}")
            print("\nThe review did NOT run. Failing to prevent unreviewed code from merging.")
            print("\n" + "=" * 70)
            sys.exit(1)
        print("No L2/L3/app package changes detected.")
        report_path = output_dir / "report.json"
        report_path.write_text("[]")
        junit_path = output_dir / "junit-report.xml"
        junit_path.write_text(to_junit_xml([], suite_name="Test Standards Review"))
        print("Empty reports written. Thread posting will confirm agent ran.")
        return

    print(f"Found {len(packages)} changed package(s):")
    for pkg in packages:
        print(f"  - {pkg['name']} ({pkg['type']})")

    entries = build_report(packages)

    report_path = output_dir / "report.json"
    report_path.write_text(json.dumps(entries, indent=2))
    print(f"\nReport written to {report_path}")

    junit_entries = build_junit_entries(entries)
    junit_path = output_dir / "junit-report.xml"
    junit_path.write_text(to_junit_xml(junit_entries, suite_name="Test Standards Review"))
    print(f"JUnit report written to {junit_path}")

    risk_counts = {}
    for e in entries:
        risk_counts[e["risk_level"]] = risk_counts.get(e["risk_level"], 0) + 1
    print(f"\nSummary: {', '.join(f'{v} {k}' for k, v in sorted(risk_counts.items()))}")


if __name__ == "__main__":
    main()

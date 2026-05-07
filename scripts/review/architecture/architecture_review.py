#!/usr/bin/env python3
"""
Architecture Review — reviews changed packages for construct hierarchy and dependency alignment.

1. Detects L2/L3/app packages with changed lib/ files
2. For each package, collects code diff, full source, package.json, and dependency tree
3. Pipes context through Kiro headless for architecture assessment
4. Produces a JSON report and JUnit XML for GitLab MR test summary

Outputs:
  architecture-review/report.json       - Full structured report with findings
  architecture-review/junit-report.xml  - JUnit XML for GitLab MR test reports

Environment:
  KIRO_API_KEY                          - Required for assessment
  KIRO_TIMEOUT                          - Optional, default 600s
  KIRO_MAX_THREADS                      - Optional, default 5

Usage:
  python3 scripts/review/architecture/architecture_review.py [--output-dir architecture-review]
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.nx_graph import PROJECT_ROOT, _target_ref, _load_project_graph, _get_transitive_deps
from review.lib.kiro_integration import run_kiro_assessment, KiroError, _parse_risk_json, _parse_risk_level
from review.lib.report import to_junit_xml
from review.lib.thread_lifecycle import compute_source_hash
from review.lib.safety import verify_no_false_negative, FalseNegativeError
from review.lib.package_utils import classify_package
from review.lib.file_collector import collect_files


KIRO_PROMPT = """\
You are reviewing code architecture for package '{package_name}'.

Read the steering file #[[file:.kiro/steering/architecture-review.md]] for the complete
architecture rules and the CI Agent Usage section for output format.

Package: {package_name}
Package type: {package_type}

Code diff (lib/ changes in this MR):
```diff
{code_diff}
```

Full source code (current state of lib/):
```
{full_source}
```

package.json dependencies:
```json
{package_json_deps}
```

Dependency tree (what this package depends on):
{dependency_tree}

Write your assessment to the file {output_file} as a JSON object following the schema
in the CI Agent Usage section of the steering file. No preamble, no markdown fences,
no explanation outside the JSON. The file must contain ONLY valid JSON.
"""


def get_changed_packages() -> list[dict]:
    """Detect L2/L3/app packages with changed lib/ files."""
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


def collect_full_source(package_root: str, max_chars: int = 20000) -> str:
    """Read all .ts files in the package's lib/ directory."""
    return collect_files(
        PROJECT_ROOT / package_root / "lib", "**/*.ts", max_chars,
        empty_message="(no .ts files in lib/)",
    )


def collect_package_json_deps(package_root: str) -> str:
    pkg_path = PROJECT_ROOT / package_root / "package.json"
    if not pkg_path.is_file():
        return "{}"
    data = json.loads(pkg_path.read_text())
    return json.dumps({
        "dependencies": data.get("dependencies", {}),
        "devDependencies": data.get("devDependencies", {}),
    }, indent=2)


def get_dependency_tree(package_name: str) -> str:
    dep_names, _ = _get_transitive_deps(package_name)
    if not dep_names:
        return "(no @aws-mdaa dependencies)"
    lines = [f"Dependencies of {package_name}:"]
    for dep in sorted(dep_names):
        lines.append(f"  - {dep}")
    return "\n".join(lines)


def assess_package(pkg: dict) -> dict:
    name = pkg["name"]
    root = pkg["root"]
    pkg_type = pkg["type"]

    print(f"  [start] {name} ({pkg_type})")

    prompt = KIRO_PROMPT.format(
        package_name=name,
        package_type=pkg_type,
        code_diff=collect_code_diff(root),
        full_source=collect_full_source(root),
        package_json_deps=collect_package_json_deps(root),
        dependency_tree=get_dependency_tree(name),
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
                print(f"  [error] {pkg['name']} — {e}", file=sys.stderr)
                entries.append({
                    "package": pkg["name"],
                    "root": pkg["root"],
                    "type": pkg["type"],
                    "risk_level": "UNKNOWN",
                    "risk_summary": f"Assessment failed: {e}",
                    "findings": [],
                    "risk_assessment": "",
                    "source_hash": compute_source_hash(str(PROJECT_ROOT / pkg["root"])),
                })
    return entries


def build_junit_entries(entries: list[dict]) -> list[dict]:
    junit_entries = []
    for entry in entries:
        has_findings = bool(entry["findings"])
        junit_entries.append({
            "name": f"{entry['package']} ({entry['type']})",
            "file": entry["root"],
            "status": "fail" if has_findings else "info",
            "message": f"Architecture Misalignment {entry['risk_level']}: {entry.get('risk_summary', '')[:200]}" if has_findings else "",
            "detail": json.dumps(entry["findings"], indent=2) if has_findings else "",
            "info": f"Risk: {entry['risk_level']}. {entry.get('risk_summary', '')}" if not has_findings else "",
        })
    return junit_entries


def main() -> None:
    parser = argparse.ArgumentParser(description="Architecture review report generator")
    parser.add_argument("--output-dir", default="architecture-review")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Detecting changed L2/L3/app packages...")
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
        (output_dir / "report.json").write_text("[]")
        (output_dir / "junit-report.xml").write_text(to_junit_xml([], suite_name="Architecture Review"))
        print("Empty reports written. Thread posting will confirm agent ran.")
        return

    print(f"Found {len(packages)} changed package(s):")
    for pkg in packages:
        print(f"  - {pkg['name']} ({pkg['type']})")

    entries = build_report(packages)

    (output_dir / "report.json").write_text(json.dumps(entries, indent=2))
    print(f"\nReport written to {output_dir / 'report.json'}")

    junit_entries = build_junit_entries(entries)
    (output_dir / "junit-report.xml").write_text(to_junit_xml(junit_entries, suite_name="Architecture Review"))
    print(f"JUnit report written to {output_dir / 'junit-report.xml'}")

    risk_counts = {}
    for e in entries:
        risk_counts[e["risk_level"]] = risk_counts.get(e["risk_level"], 0) + 1
    print(f"\nSummary: {', '.join(f'{v} {k}' for k, v in sorted(risk_counts.items()))}")


if __name__ == "__main__":
    main()

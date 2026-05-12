#!/usr/bin/env python3
"""
Module Quality Review — reviews changed app modules for configuration, documentation, and construct alignment.

1. Detects app packages under packages/apps/ with changed files (excluding core/app, core/devops, dataops-shared-app)
2. For each module, collects README, config schema, sample configs, config interfaces, L3 construct source, and code diff
3. Pipes context through Kiro headless for module quality assessment
4. Produces a JSON report and Code Quality report for GitLab MR

Outputs:
  module-quality-review/report.json       - Full structured report with findings

Environment:
  KIRO_API_KEY                            - Required for assessment
  KIRO_TIMEOUT                            - Optional, default 600s
  KIRO_MAX_THREADS                        - Optional, default 5

Usage:
  python3 scripts/review/module_quality/module_quality_review.py [--output-dir module-quality-review]
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
from review.lib.report import to_codequality_json
from review.lib.thread_lifecycle import compute_source_hash
from review.lib.safety import verify_no_false_negative, FalseNegativeError
from review.lib.file_collector import collect_files


EXCLUDED_ROOTS = {
    "packages/apps/core/app",
    "packages/apps/core/devops",
    "packages/apps/dataops/dataops-shared-app",
}


KIRO_PROMPT = """\
You are reviewing module quality for app package '{package_name}'.

Read the steering file #[[file:.kiro/steering/module-quality.md]] for the complete
module quality rules, categories, and the CI Agent Usage section for output format.

Package: {package_name}
Package type: {package_type}

README.md:
```
{readme}
```

Config schema (lib/config-schema.json):
```json
{config_schema}
```

Sample configs (sample_configs/*.yaml):
```
{sample_configs}
```

Config interface files (lib/*-config.ts):
```
{config_interfaces}
```

L3 construct source:
```
{l3_source}
```

Code diff (lib/ changes in this MR):
```diff
{code_diff}
```

In addition to README and sample config coverage, review the config schema design for
user-friendliness. Pay special attention to the Config Schema Usability Conventions in
the steering file:
- Named object maps vs arrays with name properties
- Top-level extensibility for new resource types
- Support for multiple resources of the same type via named maps
- Strong typing (no any/unknown/untyped object where avoidable)
- Schema-level validation vs runtime-only checks

Use the `schema_design` category for these findings.

DO NOT flag these concerns (they are handled by other agents):
- Import direction violations, cross-app imports, dependency layering → Architecture agent
- Missing encryption, IAM policy issues, security controls → Compliance agent
- Missing tests, test coverage, baseline gaps → Test Standards agent
- Circular dependencies, construct hierarchy violations → Architecture agent

Write your assessment to the file {output_file} as a JSON object following the schema
in the CI Agent Usage section of the steering file. No preamble, no markdown fences,
no explanation outside the JSON. The file must contain ONLY valid JSON.
"""


def get_changed_app_packages() -> list[dict]:
    """Detect app packages under packages/apps/ with changed files.

    Calls changed-only.py as subprocess with --extensions .ts, then filters
    to packages under packages/apps/, excluding EXCLUDED_ROOTS.
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

    graph = _load_project_graph()
    nodes = graph.get("nodes", {}) if graph else {}

    packages = []
    for name in project_names:
        node = nodes.get(name, {})
        root = node.get("data", {}).get("root", "")
        if not root:
            continue
        if not root.startswith("packages/apps/"):
            continue
        if root in EXCLUDED_ROOTS:
            continue
        packages.append({"name": name, "root": root, "type": "app"})

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


def collect_readme(package_root: str, max_chars: int = 10000) -> str:
    """Read the README.md for the package."""
    readme_path = PROJECT_ROOT / package_root / "README.md"
    if not readme_path.is_file():
        return "(no README.md)"
    content = readme_path.read_text()
    if len(content) > max_chars:
        content = content[:max_chars] + f"\n\n... (truncated, {len(content)} total chars)"
    return content


def collect_config_schema(package_root: str, max_chars: int = 15000) -> str:
    """Read the lib/config-schema.json for the package."""
    schema_path = PROJECT_ROOT / package_root / "lib" / "config-schema.json"
    if not schema_path.is_file():
        return "(no lib/config-schema.json)"
    content = schema_path.read_text()
    if len(content) > max_chars:
        content = content[:max_chars] + f"\n\n... (truncated, {len(content)} total chars)"
    return content


def collect_sample_configs(package_root: str, max_chars: int = 10000) -> str:
    """Read all sample_configs/*.yaml files."""
    return collect_files(
        PROJECT_ROOT / package_root / "sample_configs", "*.yaml", max_chars,
        empty_message="(no .yaml files in sample_configs/)",
    )


def collect_config_interfaces(package_root: str, max_chars: int = 10000) -> str:
    """Read lib/*-config.ts config interface files."""
    return collect_files(
        PROJECT_ROOT / package_root / "lib", "*-config.ts", max_chars,
        empty_message="(no *-config.ts files in lib/)",
    )


def resolve_l3_construct_root(package_root: str) -> str | None:
    """Resolve the L3 construct directory for an app package.

    Replaces '-app' with '-l3-construct' in the directory name and searches
    under packages/constructs/L3/ for a matching directory.

    Example:
      packages/apps/dataops/dataops-crawler-app
      → packages/constructs/L3/dataops/dataops-crawler-l3-construct
    """
    dir_name = Path(package_root).name  # e.g. "dataops-crawler-app"
    if not dir_name.endswith("-app"):
        return None

    l3_name = dir_name[:-4] + "-l3-construct"  # e.g. "dataops-crawler-l3-construct"
    l3_base = PROJECT_ROOT / "packages" / "constructs" / "L3"

    # Search all domain subdirectories under L3/
    for domain_dir in sorted(l3_base.iterdir()):
        if not domain_dir.is_dir():
            continue
        candidate = domain_dir / l3_name
        if candidate.is_dir():
            return str(candidate.relative_to(PROJECT_ROOT))

    return None


def collect_l3_source(package_root: str, max_chars: int = 15000) -> str:
    """Read lib/*.ts files from the corresponding L3 construct package."""
    l3_root = resolve_l3_construct_root(package_root)
    if not l3_root:
        return "(no matching L3 construct found)"

    return collect_files(
        PROJECT_ROOT / l3_root / "lib", "*.ts", max_chars,
        empty_message=f"(no .ts files in {l3_root}/lib/)",
    )


def assess_package(pkg: dict) -> dict:
    """Run Kiro module quality assessment for a single package."""
    name = pkg["name"]
    root = pkg["root"]
    pkg_type = pkg["type"]

    print(f"  [start] {name} ({pkg_type})")

    prompt = KIRO_PROMPT.format(
        package_name=name,
        package_type=pkg_type,
        readme=collect_readme(root),
        config_schema=collect_config_schema(root),
        sample_configs=collect_sample_configs(root),
        config_interfaces=collect_config_interfaces(root),
        l3_source=collect_l3_source(root),
        code_diff=collect_code_diff(root),
        output_file="{output_file}",
    )

    assessment = run_kiro_assessment(prompt, validate_json=True)
    parsed = _parse_risk_json(assessment)
    findings = parsed.get("findings", []) if parsed else []
    summary = parsed.get("summary", "") if parsed else ""
    risk_level = _parse_risk_level(assessment)

    print(f"  [done]  {name} — {risk_level} ({len(findings)} findings)")

    return {
        "package_name": name,
        "root": root,
        "type": pkg_type,
        "risk_level": risk_level,
        "risk_summary": summary,
        "findings": findings,
        "risk_assessment": assessment,
        "source_hash": compute_source_hash(str(PROJECT_ROOT / root)),
    }


def build_report(packages: list[dict]) -> list[dict]:
    """Run module quality assessments in parallel."""
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
                    "package_name": pkg["name"],
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
    parser = argparse.ArgumentParser(description="Module quality review report generator")
    parser.add_argument(
        "--output-dir",
        default="module-quality-review",
        help="Output directory for reports",
    )
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Detecting changed app packages...")
    packages = get_changed_app_packages()

    if not packages:
        try:
            verify_no_false_negative("packages/apps/", [".ts"], excluded_roots=EXCLUDED_ROOTS)
        except FalseNegativeError as e:
            print("\n" + "=" * 70)
            print("REVIEW AGENT FAILURE: Silent pass-through detected")
            print("=" * 70)
            print(f"\n{e}")
            print("\nThe review did NOT run. Failing to prevent unreviewed code from merging.")
            print("\n" + "=" * 70)
            sys.exit(1)
        print("No app package changes detected.")
        report_path = output_dir / "report.json"
        report_path.write_text("[]")
        (output_dir / "codequality-report.json").write_text("[]")
        print("Empty reports written. Thread posting will confirm agent ran.")
        return

    print(f"Found {len(packages)} changed app package(s):")
    for pkg in packages:
        print(f"  - {pkg['name']} ({pkg['type']})")

    entries = build_report(packages)

    report_path = output_dir / "report.json"
    report_path.write_text(json.dumps(entries, indent=2))
    print(f"\nReport written to {report_path}")


    # Code Quality report
    cq_path = output_dir / "codequality-report.json"
    cq_path.write_text(to_codequality_json(entries, agent_name="module-quality"))
    print(f"Code Quality report written to {cq_path}")

    risk_counts = {}
    for e in entries:
        risk_counts[e["risk_level"]] = risk_counts.get(e["risk_level"], 0) + 1
    print(f"\nSummary: {', '.join(f'{v} {k}' for k, v in sorted(risk_counts.items()))}")


if __name__ == "__main__":
    main()

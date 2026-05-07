#!/usr/bin/env python3
"""
Documentation Quality Review — reviews repo-wide documentation for completeness.

1. Detects changed files and checks for documentation gaps
2. Collects CHANGELOG, SCHEMA.md status, starter kit configs, mkdocs.yml, and changed markdown
3. Pipes context through a single Kiro invocation for documentation assessment
4. Produces a JSON report and JUnit XML for GitLab MR test summary

Outputs:
  doc-quality-review/report.json       - Full structured report with findings
  doc-quality-review/junit-report.xml  - JUnit XML for GitLab MR test reports

Environment:
  KIRO_API_KEY                         - Required for assessment
  KIRO_TIMEOUT                         - Optional, default 600s

Usage:
  python3 scripts/review/doc_quality/doc_quality_review.py [--output-dir doc-quality-review]
"""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.nx_graph import PROJECT_ROOT, _target_ref
from review.lib.kiro_integration import run_kiro_assessment, KiroError, _parse_risk_json, _parse_risk_level
from review.lib.report import to_junit_xml


KIRO_PROMPT = """\
You are reviewing documentation quality for an MDAA merge request.

Read the steering file #[[file:.kiro/steering/documentation-review.md]] for the complete
documentation rules and the CI Agent Usage section for output format.

Changed files in this MR:
{changed_files}

Has code changes (packages/**/*.ts or packages/**/*.py): {has_code_changes}

Changed config schemas:
{changed_schemas}

CHANGELOG.md diff:
```diff
{changelog_diff}
```

Changed markdown files:
{changed_markdown}

mkdocs.yml exists: {has_mkdocs}

Starter kit changes:
{starter_kit_changes}

Write your assessment to the file {output_file} as a JSON object following the schema
in the CI Agent Usage section of the steering file. No preamble, no markdown fences,
no explanation outside the JSON. The file must contain ONLY valid JSON.
"""


def get_changed_files() -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", _target_ref()],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    return [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]


def get_changelog_diff(max_chars: int = 5000) -> str:
    result = subprocess.run(
        ["git", "diff", _target_ref(), "--", "CHANGELOG.md"],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    diff = result.stdout.strip()
    if not diff:
        return "(CHANGELOG.md not changed)"
    if len(diff) > max_chars:
        diff = diff[:max_chars] + "\n... (truncated)"
    return diff


def get_changed_schemas(changed_files: list[str]) -> str:
    schemas = [f for f in changed_files if f.endswith("config-schema.json") and f.startswith("packages/")]
    if not schemas:
        return "(no config schemas changed)"
    # Check if corresponding SCHEMA.md also changed
    lines = []
    for schema in schemas:
        module_root = str(Path(schema).parent.parent)
        schema_md = f"{module_root}/SCHEMA.md"
        md_changed = schema_md in changed_files
        status = "SCHEMA.md also changed" if md_changed else "SCHEMA.md NOT updated"
        lines.append(f"  - {schema} ({status})")
    return "\n".join(lines)


def get_changed_markdown(changed_files: list[str]) -> str:
    """List changed markdown files."""
    md_files = [f for f in changed_files if f.endswith(".md")]
    if not md_files:
        return "(no markdown files changed)"
    return "\n".join(f"  - {f}" for f in md_files[:50])


def get_starter_kit_changes(changed_files: list[str]) -> str:
    sk_files = [f for f in changed_files if f.startswith("starter_kits/")]
    if not sk_files:
        return "(no starter kit changes)"
    return "\n".join(f"  - {f}" for f in sk_files[:30])


def has_code_changes(changed_files: list[str]) -> bool:
    return any(
        (f.startswith("packages/") and (f.endswith(".ts") or f.endswith(".py")))
        for f in changed_files
    )


def run_assessment(changed_files: list[str]) -> dict:
    """Run single Kiro documentation quality assessment."""
    prompt = KIRO_PROMPT.format(
        changed_files="\n".join(f"  - {f}" for f in changed_files[:100]),
        has_code_changes=str(has_code_changes(changed_files)),
        changed_schemas=get_changed_schemas(changed_files),
        changelog_diff=get_changelog_diff(),
        changed_markdown=get_changed_markdown(changed_files),
        has_mkdocs=(PROJECT_ROOT / "mkdocs.yml").is_file(),
        starter_kit_changes=get_starter_kit_changes(changed_files),
        output_file="{output_file}",
    )

    assessment = run_kiro_assessment(prompt, validate_json=True)
    parsed = _parse_risk_json(assessment)
    findings = parsed.get("findings", []) if parsed else []
    summary = parsed.get("summary", "") if parsed else ""
    risk_level = _parse_risk_level(assessment)

    return {
        "risk_level": risk_level,
        "risk_summary": summary,
        "findings": findings,
        "risk_assessment": assessment,
    }


def build_junit_entries(result: dict) -> list[dict]:
    has_findings = bool(result["findings"])
    return [{
        "name": "Documentation Quality",
        "file": "CHANGELOG.md",
        "status": "fail" if has_findings else "info",
        "message": f"Documentation Gap {result['risk_level']}: {result.get('risk_summary', '')[:200]}" if has_findings else "",
        "detail": json.dumps(result["findings"], indent=2) if has_findings else "",
        "info": f"Risk: {result['risk_level']}. {result.get('risk_summary', '')}" if not has_findings else "",
    }]


def main() -> None:
    parser = argparse.ArgumentParser(description="Documentation quality review")
    parser.add_argument("--output-dir", default="doc-quality-review")
    args = parser.parse_args()

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    print("Collecting changed files...")
    changed_files = get_changed_files()

    if not changed_files:
        print("No file changes detected.")
        (output_dir / "report.json").write_text("[]")
        (output_dir / "junit-report.xml").write_text(to_junit_xml([], suite_name="Documentation Quality Review"))
        print("Empty reports written. Thread posting will confirm agent ran.")
        return

    print(f"Found {len(changed_files)} changed file(s).")
    print(f"  Code changes: {has_code_changes(changed_files)}")

    print("\nRunning documentation quality assessment...")
    try:
        result = run_assessment(changed_files)
    except KiroError as e:
        print(f"  [error] documentation quality assessment failed — {e}", file=sys.stderr)
        result = {
            "risk_level": "UNKNOWN",
            "risk_summary": f"Assessment failed: {e}",
            "findings": [],
            "risk_assessment": "",
        }

    report = [result]
    (output_dir / "report.json").write_text(json.dumps(report, indent=2))
    print(f"Report written to {output_dir / 'report.json'}")

    junit_entries = build_junit_entries(result)
    (output_dir / "junit-report.xml").write_text(to_junit_xml(junit_entries, suite_name="Documentation Quality Review"))
    print(f"JUnit report written to {output_dir / 'junit-report.xml'}")

    print(f"\nResult: {result['risk_level']} ({len(result['findings'])} findings)")


if __name__ == "__main__":
    main()

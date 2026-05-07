#!/usr/bin/env python3
"""
Post test standards review results as MR discussion threads (two-tier system).

Tier 1 — Summary thread (resolved):
  Test standards overview with finding counts by severity and affected packages.

Tier 2 — Per-package threads (unresolved):
  One thread per package with test standards findings. Categorized sections:
  missing tests, naming violations, coverage gaps, baseline issues.

Thread lifecycle:
  - New threads are created when a test gap first appears
  - Threads are updated and reopened when findings change (hash-based detection)
  - Threads that were resolved stay resolved if findings haven't changed
  - Orphaned threads auto-resolve when findings disappear

Requires environment variables:
  CI_API_V4_URL        - GitLab API base URL (set by GitLab CI)
  CI_PROJECT_ID        - Project ID (set by GitLab CI)
  CI_MERGE_REQUEST_IID - MR IID (set by GitLab CI)
  PROJECT_ACCESS_TOKEN - GitLab project access token for MR discussion threads

Usage:
  python3 scripts/review/test_standards/post_test_standards_threads.py [--report test-standards-review/report.json]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

# Add scripts/ to Python path so review.lib imports work when run directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.gitlab_threads import (
    get_mr_discussions,
    compute_hash,
)
from review.lib.thread_lifecycle import (
    _now,
    _steering_link,
    post_or_update_summary,
    post_detail_threads,
    resolve_orphaned_threads,
    check_unresolved_and_exit,
    UnresolvedThreadsError,
)

SUMMARY_MARKER = "<!-- test-standards-summary -->"
PKG_PATTERN = re.compile(r"<!-- test-standards-pkg:(.+?) -->")

ICON_MAP = {
    "HIGH": "\u26a0\ufe0f",
    "MEDIUM": "\u26a0\ufe0f",
    "LOW": "\u2705",
    "UNKNOWN": "\u2753",
}


def format_summary_body(entries: list[dict]) -> str:
    """Format the summary thread body."""
    risk_counts: dict[str, int] = {}
    total_findings = 0
    for entry in entries:
        for finding in entry.get("findings", []):
            risk = finding.get("risk", "UNKNOWN").upper()
            risk_counts[risk] = risk_counts.get(risk, 0) + 1
            total_findings += 1

    breakdown = []
    for level in ["HIGH", "MEDIUM", "LOW"]:
        count = risk_counts.get(level, 0)
        if count:
            breakdown.append(f"{count} {level}")

    lines = [
        SUMMARY_MARKER,
        "",
        "## Test Standards Review Summary",
        "",
        "_Reviews test coverage, naming conventions, baseline completeness, and CDK Nag "
        "compliance validation in changed packages. "
        f"[Steering file]({_steering_link('testing-standards.md')})_",
        "",
        f"_Last updated: {_now()}_",
        "",
        f"**Packages reviewed:** {len(entries)}",
        "",
        f"**Total findings:** {total_findings}",
        "",
    ]

    if breakdown:
        lines.append(f"**Risk breakdown:** {', '.join(breakdown)}")
    else:
        lines.append("**Result:** \u2705 All packages meet test standards.")

    lines.append("")

    # Per-package details (collapsed)
    if entries:
        lines.append("<details><summary><b>Package Details</b></summary>")
        lines.append("")

        for entry in sorted(entries, key=lambda e: e.get("package", "")):
            pkg = entry.get("package", "unknown")
            pkg_type = entry.get("type", "")
            n_findings = len(entry.get("findings", []))
            risk = entry.get("risk_level", "UNKNOWN")
            icon = ICON_MAP.get(risk, "\u2753")
            summary = entry.get("risk_summary", "")

            lines.append(f"**{icon} {pkg}** ({pkg_type}) \u2014 {n_findings} finding(s), {risk}")
            if summary:
                lines.append(f"  {summary[:200]}")
            lines.append("")

        lines.append("</details>")
        lines.append("")

    lines.append(
        "_Packages with findings have individual review threads. "
        "Resolve each thread to acknowledge the testing gap._"
    )

    return "\n".join(lines)


def format_package_thread(
    pkg_name: str,
    group: dict,
    content_hash: str,
    is_update: bool = False,
) -> str:
    """Format a per-package thread body."""
    entry = group  # group IS the entry for test standards
    pkg_type = entry.get("type", "")
    risk_level = entry.get("risk_level", "UNKNOWN")
    icon = ICON_MAP.get(risk_level, "\u2753")

    lines = [
        f"<!-- test-standards-pkg:{pkg_name} -->",
        f"<!-- test-standards-hash:{content_hash} -->",
        "",
        f"## {icon} Test Standards Review \u2014 Testing Gap: {risk_level}",
        "",
        f"**Package:** `{pkg_name}` ({pkg_type})",
        "",
        f"_Last observed: {_now()}_",
        "",
    ]

    if is_update:
        lines.append("_Findings have changed since last review. Please re-acknowledge._")
        lines.append("")

    # Group findings by category
    categories: dict[str, list[dict]] = {}
    for finding in entry.get("findings", []):
        cat = finding.get("category", "other")
        categories.setdefault(cat, []).append(finding)

    category_labels = {
        "missing_test": "Missing Tests",
        "naming": "Naming Violations",
        "coverage": "Coverage Issues",
        "baseline": "Baseline Issues",
        "nag_compliance": "CDK Nag Compliance",
        "other": "Other",
    }

    for cat_key in ["missing_test", "nag_compliance", "naming", "coverage", "baseline", "other"]:
        findings = categories.get(cat_key, [])
        if not findings:
            continue

        label = category_labels.get(cat_key, cat_key)
        lines.append(f"### {label}")
        lines.append("")

        for f in findings:
            risk = f.get("risk", "UNKNOWN")
            detail = f.get("detail", "")
            file_path = f.get("file", "")
            file_ref = f" (`{file_path}`)" if file_path else ""
            lines.append(f"- **{risk}**{file_ref}: {detail}")

        lines.append("")

    lines.append("_Resolve this thread to acknowledge the testing gap. "
                 "Then rerun the `feature_merge_test_standards_review` job to pass the pipeline._")

    return "\n".join(lines)


def _compute_structural_hash(pkg_name: str, group: dict) -> str:
    """Compute structural hash for a test standards finding group.

    `pkg_name` is unused but required by the post_detail_threads callback signature.
    """
    structural = sorted(
        (f.get("category", ""), f.get("risk", ""), f.get("file", ""), str(f.get("line", "")))
        for f in group.get("findings", [])
    )
    return compute_hash(json.dumps(structural, sort_keys=True))


def _get_position(pkg_name: str) -> dict | None:
    """Get diff position for a test standards thread.

    Always returns None — test standards threads are keyed by package name,
    not file:line, so there's no reliable diff position. The `pkg_name`
    parameter is required by the post_detail_threads callback signature.
    """
    # We don't have the root path in the key, so we can't reliably position
    return None


def main() -> None:
    parser = argparse.ArgumentParser(description="Post test standards review MR threads")
    parser.add_argument(
        "--report",
        default="test-standards-review/report.json",
        help="Path to test standards review report JSON",
    )
    args = parser.parse_args()

    token = os.environ.get("PROJECT_ACCESS_TOKEN")
    if not token:
        print("PROJECT_ACCESS_TOKEN not set, skipping MR thread posting.")
        return

    mr_iid = os.environ.get("CI_MERGE_REQUEST_IID")
    if not mr_iid:
        print("CI_MERGE_REQUEST_IID not set (not an MR pipeline), skipping.")
        return

    project_id = os.environ["CI_PROJECT_ID"]

    if not os.path.isfile(args.report):
        print(f"Report file not found: {args.report}, skipping.")
        return

    with open(args.report) as f:
        entries = json.load(f)

    print(f"Processing {len(entries)} package(s)...")

    # Fetch discussions once
    discussions = get_mr_discussions(project_id, mr_iid, token)

    # Post summary (returns refreshed discussions)
    discussions = post_or_update_summary(
        project_id, mr_iid, token, discussions, SUMMARY_MARKER,
        lambda: format_summary_body(entries),
    )

    # Post per-package threads for entries with findings
    entries_with_findings = [e for e in entries if e.get("findings")]
    if not entries_with_findings:
        print("  No test standards findings to post threads for.")
        print("Done.")
        return

    # Build groups keyed by package name
    groups = {e.get("package", "unknown"): e for e in entries_with_findings}

    # Post detail threads
    processed_keys = post_detail_threads(
        project_id, mr_iid, token, discussions, groups,
        PKG_PATTERN, format_package_thread, _compute_structural_hash, _get_position,
    )

    # Re-fetch after mutations, resolve orphans
    discussions = get_mr_discussions(project_id, mr_iid, token)
    resolve_orphaned_threads(project_id, mr_iid, token, discussions, PKG_PATTERN, processed_keys)

    try:
        check_unresolved_and_exit(
            project_id, mr_iid, token, PKG_PATTERN,
            agent_name="test standards",
            finding_type="Testing Gap",
            job_name="feature_merge_test_standards_review",
        )
    except UnresolvedThreadsError:
        sys.exit(1)

    print("Done.")


if __name__ == "__main__":
    main()

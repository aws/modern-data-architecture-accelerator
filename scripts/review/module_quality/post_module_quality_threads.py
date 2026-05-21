#!/usr/bin/env python3
"""
Post module quality review results as MR discussion threads (two-tier system).

Tier 1 — Summary thread (resolved):
  Module quality overview with concern counts by severity and affected modules.

Tier 2 — Per-module threads (unresolved):
  One thread per app module with quality findings. Categorized sections:
  README gaps, schema coverage, config usability, sample config, JSDoc.

Thread lifecycle:
  - New threads are created when a quality concern first appears
  - Threads are updated and reopened when findings change (hash-based detection)
  - Threads that were resolved stay resolved if findings haven't changed
  - Orphaned threads auto-resolve when findings disappear

Requires environment variables:
  CI_API_V4_URL        - GitLab API base URL (set by GitLab CI)
  CI_PROJECT_ID        - Project ID (set by GitLab CI)
  CI_MERGE_REQUEST_IID - MR IID (set by GitLab CI)
  PROJECT_ACCESS_TOKEN - GitLab project access token for MR discussion threads

Usage:
  python3 scripts/review/module_quality/post_module_quality_threads.py [--report module-quality-review/report.json]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.gitlab_threads import (
    get_mr_discussions,
    compute_hash,
)
from review.lib.thread_lifecycle import (
    _steering_link,
    _action_context,
    post_or_update_summary,
    post_detail_threads,
    resolve_orphaned_threads,
    check_unresolved_and_exit,
    UnresolvedThreadsError,
    _format_thread_footer,
)

SUMMARY_MARKER = "<!-- module-quality-summary -->"
PKG_PATTERN = re.compile(r"<!-- module-quality-pkg:(.+?) -->")

ICON_MAP = {
    "HIGH": "\u26a0\ufe0f",
    "MEDIUM": "\u26a0\ufe0f",
    "LOW": "\u2705",
    "UNKNOWN": "\u2753",
}


def format_summary_body(entries: list[dict]) -> str:
    """Format the summary thread body."""
    concern_counts: dict[str, int] = {}
    total_findings = 0
    for entry in entries:
        for finding in entry.get("findings", []):
            risk = finding.get("risk", "UNKNOWN").upper()
            concern_counts[risk] = concern_counts.get(risk, 0) + 1
            total_findings += 1

    breakdown = []
    for level in ["HIGH", "MEDIUM", "LOW"]:
        count = concern_counts.get(level, 0)
        if count:
            breakdown.append(f"{count} {level}")

    lines = [
        SUMMARY_MARKER,
        "",
        "## Module Quality Review Summary",
        "",
        "_Reviews README documentation, sample config coverage, config schema usability, "
        "and JSDoc quality in app modules. "
        f"[Steering file]({_steering_link('module-quality.md')})_",
        "",
        f"**Modules reviewed:** {len(entries)}",
        "",
        f"**Total concerns:** {total_findings}",
        "",
    ]

    if breakdown:
        lines.append(f"**Concerns:** {', '.join(breakdown)}")
    else:
        lines.append("**Result:** \u2705 All modules meet quality standards.")

    lines.append("")

    if entries:
        lines.append("<details><summary><b>Module Details</b></summary>")
        lines.append("")

        for entry in sorted(entries, key=lambda e: e.get("package_name", "")):
            pkg = entry.get("package_name", "unknown")
            n_findings = len(entry.get("findings", []))
            risk = entry.get("risk_level", "UNKNOWN")
            icon = ICON_MAP.get(risk, "\u2753")
            summary = entry.get("risk_summary", "")

            lines.append(f"**{icon} {pkg}** \u2014 {n_findings} concern(s), {risk}")
            if summary:
                lines.append(f"  {summary[:200]}")
            lines.append("")

        lines.append("</details>")
        lines.append("")

    lines.append(
        "_Modules with concerns have individual review threads. "
        "Resolve each thread to acknowledge the quality concern._"
    )

    return "\n".join(lines)


def format_module_thread(
    pkg_name: str,
    group: dict,
    content_hash: str,
    is_update: bool = False,
) -> str:
    """Format a per-module thread body."""
    entry = group  # group IS the entry for module quality
    risk_level = entry.get("risk_level", "UNKNOWN")
    icon = ICON_MAP.get(risk_level, "\u2753")

    lines = [
        f"<!-- module-quality-pkg:{pkg_name} -->",
        f"<!-- module-quality-hash:{content_hash} -->",
        "",
        f"## {icon} Module Quality Review \u2014 Quality Concern: {risk_level}",
        "",
        f"**Module:** `{pkg_name}`",
        "",
        f"_{_action_context()}_" if _action_context() else "",
        "",
    ]

    if is_update:
        lines.append("_Findings have changed since last review. Please re-acknowledge._")
        lines.append("")

    categories: dict[str, list[dict]] = {}
    for finding in entry.get("findings", []):
        cat = finding.get("category", "other")
        categories.setdefault(cat, []).append(finding)

    category_labels = {
        "readme_gap": "README Gaps",
        "schema_coverage": "Schema Coverage",
        "config_usability": "Config Usability",
        "schema_design": "Schema Design",
        "sample_config": "Sample Config Issues",
        "jsdoc": "JSDoc Quality",
        "other": "Other",
    }

    for cat_key in ["readme_gap", "config_usability", "schema_design", "schema_coverage", "sample_config", "jsdoc", "other"]:
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
            prop = f.get("property", "")
            ref = ""
            if file_path:
                ref = f" (`{file_path}`"
                if prop:
                    ref += f", property `{prop}`"
                ref += ")"
            elif prop:
                ref = f" (property `{prop}`)"
            lines.append(f"- **{risk}**{ref}: {detail}")

        lines.append("")

    lines.append(_format_thread_footer())

    return "\n".join(lines)


def _compute_structural_hash(pkg_name: str, group: dict) -> str:
    """Compute structural hash for a module quality finding group.

    `pkg_name` is unused but required by the post_detail_threads callback signature.
    """
    structural = sorted(
        (f.get("category", ""), f.get("risk", ""), f.get("file", ""), f.get("property", ""))
        for f in group.get("findings", [])
    )
    return compute_hash(json.dumps(structural, sort_keys=True))


def _get_position(pkg_name: str) -> dict | None:
    """Get diff position for a module quality thread.

    Always returns None — module quality threads are keyed by package name,
    not file:line, so there's no reliable diff position. The `pkg_name`
    parameter is required by the post_detail_threads callback signature.
    """
    return None


def main():
    parser = argparse.ArgumentParser(description="Post module quality review MR threads")
    parser.add_argument(
        "--report",
        default="module-quality-review/report.json",
        help="Path to module quality review report JSON",
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

    print(f"Processing {len(entries)} module(s)...")

    # Fetch discussions once
    discussions = get_mr_discussions(project_id, mr_iid, token)

    # Post summary (returns refreshed discussions)
    discussions = post_or_update_summary(
        project_id, mr_iid, token, discussions, SUMMARY_MARKER,
        lambda: format_summary_body(entries),
    )

    entries_with_findings = [e for e in entries if e.get("findings")]

    # Build groups keyed by package name (empty if no findings)
    groups = {e.get("package_name", "unknown"): e for e in entries_with_findings}

    # Post detail threads (skipped if groups is empty)
    processed_keys: set[str] = set()
    if groups:
        processed_keys = post_detail_threads(
            project_id, mr_iid, token, discussions, groups,
            PKG_PATTERN, format_module_thread, _compute_structural_hash, _get_position,
        )
    else:
        print("  No quality concerns to post threads for.")

    # Re-fetch after mutations, resolve orphans (runs even with no findings
    # so previously-opened threads get auto-resolved when concerns are fixed)
    discussions = get_mr_discussions(project_id, mr_iid, token)
    source_hashes = {
        e.get("package_name", "unknown"): e.get("source_hash", "")
        for e in entries
    }
    resolve_orphaned_threads(
        project_id, mr_iid, token, discussions, PKG_PATTERN, processed_keys,
        source_hashes=source_hashes,
    )

    try:
        check_unresolved_and_exit(
            project_id, mr_iid, token, PKG_PATTERN,
            agent_name="module quality",
            finding_type="Quality Concern",
            job_name="feature_merge_module_quality_review",
        )
    except UnresolvedThreadsError:
        sys.exit(1)

    print("Done.")


if __name__ == "__main__":
    main()

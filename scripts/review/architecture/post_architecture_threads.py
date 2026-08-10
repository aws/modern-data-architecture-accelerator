#!/usr/bin/env python3
"""
Post architecture review results as MR discussion threads (two-tier system).

Tier 1 — Summary thread (resolved):
  Architecture alignment overview with finding counts and affected packages.

Tier 2 — Per-source threads (unresolved):
  One thread per source location (file:chunk_content_hash) where an architectural
  misalignment occurs. Keyed by chunk content hash for stability across line shifts.

Thread lifecycle:
  - New threads are created when a misalignment first appears
  - Threads are updated and reopened when findings change (hash-based detection)
  - Threads that were resolved stay resolved if findings haven't changed
  - Orphaned threads auto-resolve when findings disappear

Requires environment variables:
  CI_API_V4_URL        - GitLab API base URL (set by GitLab CI)
  CI_PROJECT_ID        - Project ID (set by GitLab CI)
  CI_MERGE_REQUEST_IID - MR IID (set by GitLab CI)
  PROJECT_ACCESS_TOKEN - GitLab project access token

Usage:
  python3 scripts/review/architecture/post_architecture_threads.py [--report architecture-review/report.json]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.gitlab_threads import get_mr_discussions
from review.lib.thread_lifecycle import (
    _steering_link,
    _action_context,
    build_source_groups,
    compute_structural_hash,
    make_get_position,
    orphan_source_file,
    post_or_update_summary,
    post_detail_threads,
    resolve_orphaned_threads,
    check_unresolved_and_exit,
    UnresolvedThreadsError,
    _format_thread_footer,
    escape_markdown_math,
)

SUMMARY_MARKER = "<!-- architecture-summary -->"
SOURCE_PATTERN = re.compile(r"<!-- architecture-source:(.+?) -->")
ICON_MAP = {"HIGH": "\u26a0\ufe0f", "MEDIUM": "\u26a0\ufe0f", "LOW": "\u2139\ufe0f", "UNKNOWN": "\u2753"}


def format_summary_body(entries: list[dict]) -> str:
    """Format the summary thread body.

    Counts are derived from the same source-grouped data used to post the detail
    threads (build_source_groups), so the summary stays consistent with the
    threads a reviewer actually sees. Each detail thread groups every finding at
    one source location and is headed by that group's highest severity. The
    severity breakdown is therefore by thread (group), matching the thread
    headers — not by individual finding, which previously advertised severities
    (e.g. a LOW) that had no thread of their own because they were grouped under
    a higher-severity finding at the same source.
    """
    groups = build_source_groups(entries)
    total_findings = sum(len(g["findings"]) for g in groups.values())
    thread_count = len(groups)

    level_counts: dict[str, int] = {}
    for group in groups.values():
        level = group["risk_level"]
        level_counts[level] = level_counts.get(level, 0) + 1

    breakdown = [
        f"{level_counts[level]} {level}"
        for level in ["HIGH", "MEDIUM", "LOW", "UNKNOWN"]
        if level_counts.get(level)
    ]

    lines = [SUMMARY_MARKER, "", "## Code Architecture Review Summary", "",
             "_Reviews construct hierarchy, dependency direction, separation of concerns, "
             "and dependency management. "
             f"[Steering file]({_steering_link('review-architecture.md')})_", "",
             f"**Packages reviewed:** {len(entries)}", ""]

    if thread_count:
        lines.append(f"**Review threads:** {thread_count}")
        lines.append("")
        lines.append(f"**Total findings:** {total_findings}")
        lines.append("")
        lines.append(f"**Thread severity breakdown:** {', '.join(breakdown)}")
    else:
        lines.append("**Result:** \u2705 No architecture misalignments found.")

    lines.append("")
    lines.append("_Findings have individual review threads positioned on the source code. "
                 "Resolve each thread to acknowledge the misalignment._")
    return "\n".join(lines)


def format_source_thread(
    key: str, group: dict, content_hash: str, is_update: bool = False
) -> str:
    """Format a per-source thread body."""
    risk_level = group["risk_level"]
    icon = ICON_MAP.get(risk_level, "\u2753")
    display_source = group.get("source", key)

    lines = [
        f"<!-- architecture-source:{key} -->",
        f"<!-- architecture-hash:{content_hash} -->",
        "", f"## {icon} Code Architecture Review \u2014 Architecture Misalignment: {risk_level}",
        "", f"**Source:** `{display_source}`", "",
        f"_{_action_context()}_" if _action_context() else "", "",
    ]

    if is_update:
        lines.append("_Findings have changed since last review. Please re-acknowledge._")
        lines.append("")

    lines.append("### Findings")
    lines.append("")

    for pkg_name, finding in group["findings"]:
        risk = finding.get("risk", "UNKNOWN")
        cat = finding.get("category", "")
        detail = escape_markdown_math(finding.get("detail", ""))
        line_num = finding.get("line", "")
        loc = f" (L{line_num})" if line_num else ""
        lines.append(f"- **{risk}** [{cat}]{loc} ({pkg_name}): {detail}")

    lines.append("")
    lines.append(_format_thread_footer())
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Post architecture review MR threads")
    parser.add_argument("--report", default="architecture-review/report.json")
    args = parser.parse_args()

    token = os.environ.get("PROJECT_ACCESS_TOKEN")
    if not token:
        print("PROJECT_ACCESS_TOKEN not set, skipping.")
        return

    mr_iid = os.environ.get("CI_MERGE_REQUEST_IID")
    if not mr_iid:
        print("CI_MERGE_REQUEST_IID not set, skipping.")
        return

    project_id = os.environ["CI_PROJECT_ID"]

    if not os.path.isfile(args.report):
        print(f"Report not found: {args.report}, skipping.")
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

    # Build source groups (keyed by file:chunk_content_hash)
    groups = build_source_groups(entries)

    # Post detail threads (skipped if groups is empty)
    processed_keys: set[str] = set()
    if groups:
        processed_keys = post_detail_threads(
            project_id, mr_iid, token, discussions, groups,
            SOURCE_PATTERN, format_source_thread, compute_structural_hash, make_get_position(groups),
        )
    else:
        print("  No architecture findings to post.")

    # Re-fetch after mutations, resolve orphans (runs even with no findings
    # so previously-opened threads get auto-resolved when issues are fixed)
    discussions = get_mr_discussions(project_id, mr_iid, token)
    source_hashes = {key: group.get("source_hash", "") for key, group in groups.items()}
    resolve_orphaned_threads(
        project_id, mr_iid, token, discussions, SOURCE_PATTERN, processed_keys,
        source_hashes=source_hashes,
        source_file_resolver=orphan_source_file,
    )

    try:
        check_unresolved_and_exit(
            project_id, mr_iid, token, SOURCE_PATTERN,
            agent_name="architecture",
            finding_type="Architecture Misalignment",
            job_name="feature_merge_architecture_review",
        )
    except UnresolvedThreadsError:
        sys.exit(1)

    print("Done.")


if __name__ == "__main__":
    main()

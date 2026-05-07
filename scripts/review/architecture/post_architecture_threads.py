#!/usr/bin/env python3
"""
Post architecture review results as MR discussion threads (two-tier system).

Tier 1 — Summary thread (resolved):
  Architecture alignment overview with finding counts and affected packages.

Tier 2 — Per-file threads (unresolved):
  One thread per source file where an architectural misalignment occurs.

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

from review.lib.gitlab_threads import (
    get_mr_discussions,
    compute_hash,
    _build_diff_position,
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

SUMMARY_MARKER = "<!-- architecture-summary -->"
FILE_PATTERN = re.compile(r"<!-- architecture-file:(.+?) -->")
ICON_MAP = {"HIGH": "\u26a0\ufe0f", "MEDIUM": "\u26a0\ufe0f", "LOW": "\u2705", "UNKNOWN": "\u2753"}


def build_file_groups(entries: list[dict]) -> dict[str, dict]:
    """Group findings by source file across all packages."""
    risk_rank = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "UNKNOWN": 1}
    groups: dict[str, dict] = {}

    for entry in entries:
        pkg_name = entry.get("package", "unknown")
        pkg_source_hash = entry.get("source_hash", "")
        for finding in entry.get("findings", []):
            file_path = finding.get("file", "Unknown")
            finding_risk = finding.get("risk", "UNKNOWN").upper()

            if file_path not in groups:
                groups[file_path] = {
                    "file": file_path,
                    "risk_level": finding_risk,
                    "findings": [],
                    "source_hash": pkg_source_hash,
                }

            current_rank = risk_rank.get(groups[file_path]["risk_level"], 1)
            finding_rank = risk_rank.get(finding_risk, 1)
            if finding_rank < current_rank:
                groups[file_path]["risk_level"] = finding_risk

            groups[file_path]["findings"].append((pkg_name, finding))

    return groups


def format_summary_body(entries: list[dict]) -> str:
    """Format the summary thread body."""
    risk_counts: dict[str, int] = {}
    total = 0
    for entry in entries:
        for f in entry.get("findings", []):
            r = f.get("risk", "UNKNOWN").upper()
            risk_counts[r] = risk_counts.get(r, 0) + 1
            total += 1

    breakdown = [f"{c} {l}" for l in ["HIGH", "MEDIUM", "LOW"] if (c := risk_counts.get(l, 0))]

    lines = [SUMMARY_MARKER, "", "## Architecture Review Summary", "",
             "_Reviews construct hierarchy, dependency direction, separation of concerns, "
             "and dependency management. "
             f"[Steering file]({_steering_link('architecture-review.md')})_", "",
             f"_Last updated: {_now()}_", "",
             f"**Packages reviewed:** {len(entries)}", "",
             f"**Total findings:** {total}", ""]

    if breakdown:
        lines.append(f"**Findings:** {', '.join(breakdown)}")
    else:
        lines.append("**Result:** \u2705 No architecture misalignments found.")

    lines.append("")
    lines.append("_Findings have individual review threads positioned on the source code. "
                 "Resolve each thread to acknowledge the misalignment._")
    return "\n".join(lines)


def format_file_thread(file_path: str, group: dict, content_hash: str, is_update: bool = False) -> str:
    """Format a per-file thread body."""
    risk_level = group["risk_level"]
    icon = ICON_MAP.get(risk_level, "\u2753")

    lines = [
        f"<!-- architecture-file:{file_path} -->",
        f"<!-- architecture-hash:{content_hash} -->",
        "", f"## {icon} Architecture Review \u2014 Architecture Misalignment: {risk_level}",
        "", f"**File:** `{file_path}`", "",
        f"_Last observed: {_now()}_", "",
    ]

    if is_update:
        lines.append("_Findings have changed since last review. Please re-acknowledge._")
        lines.append("")

    lines.append("### Findings")
    lines.append("")

    for pkg_name, finding in group["findings"]:
        risk = finding.get("risk", "UNKNOWN")
        cat = finding.get("category", "")
        detail = finding.get("detail", "")
        line_num = finding.get("line", "")
        loc = f" (L{line_num})" if line_num else ""
        lines.append(f"- **{risk}** [{cat}]{loc}: {detail}")

    lines.append("")
    lines.append("_Resolve this thread to acknowledge the architecture misalignment. "
                 "Then rerun the `feature_merge_architecture_review` job to pass the pipeline._")
    return "\n".join(lines)


def _compute_structural_hash(file_path: str, group: dict) -> str:
    """Compute structural hash for an architecture finding group."""
    structural = sorted(
        (file_path, f.get("category", ""), f.get("risk", ""), str(f.get("line", "")))
        for _, f in group["findings"]
    )
    return compute_hash(json.dumps(structural, sort_keys=True))


def _get_position(file_path: str) -> dict | None:
    """Get diff position for a file (line 1 as fallback)."""
    return _build_diff_position(file_path, 1)


def _make_get_position(groups: dict[str, dict]):
    """Create a position callback that uses the first finding's line number."""
    def _get_pos(file_path: str) -> dict | None:
        group = groups.get(file_path)
        if group and group.get("findings"):
            # Use the first finding's line number for positioning
            _, first_finding = group["findings"][0]
            line = first_finding.get("line", 1) or 1
            return _build_diff_position(file_path, line)
        return _build_diff_position(file_path, 1)
    return _get_pos


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

    # Build file groups
    groups = build_file_groups(entries)
    if not groups:
        print("  No architecture findings to post.")
        print("Done.")
        return

    # Post detail threads
    processed_keys = post_detail_threads(
        project_id, mr_iid, token, discussions, groups,
        FILE_PATTERN, format_file_thread, _compute_structural_hash, _make_get_position(groups),
    )

    # Re-fetch after mutations, resolve orphans
    discussions = get_mr_discussions(project_id, mr_iid, token)
    resolve_orphaned_threads(project_id, mr_iid, token, discussions, FILE_PATTERN, processed_keys)

    try:
        check_unresolved_and_exit(
            project_id, mr_iid, token, FILE_PATTERN,
            agent_name="architecture",
            finding_type="Architecture Misalignment",
            job_name="feature_merge_architecture_review",
        )
    except UnresolvedThreadsError:
        sys.exit(1)

    print("Done.")


if __name__ == "__main__":
    main()

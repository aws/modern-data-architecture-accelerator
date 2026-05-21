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

from review.lib.gitlab_threads import (
    get_mr_discussions,
    compute_hash,
    _build_diff_position,
)
from review.lib.thread_lifecycle import (
    _steering_link,
    _action_context,
    compute_line_anchor,
    post_or_update_summary,
    post_detail_threads,
    resolve_orphaned_threads,
    check_unresolved_and_exit,
    UnresolvedThreadsError,
    _format_thread_footer,
)

SUMMARY_MARKER = "<!-- architecture-summary -->"
SOURCE_PATTERN = re.compile(r"<!-- architecture-source:(.+?) -->")
ICON_MAP = {"HIGH": "\u26a0\ufe0f", "MEDIUM": "\u26a0\ufe0f", "LOW": "\u2705", "UNKNOWN": "\u2753"}


def build_source_groups(entries: list[dict]) -> dict[str, dict]:
    """Group findings by stable chunk content hash across all packages.

    Key is file:chunk_content_hash when source_hash is available (from pre-parsed
    diff chunks). Falls back to file:line_content_hash via compute_line_anchor
    for legacy findings without source_hash.

    Returns dict keyed by stable anchor string, each containing:
      - source: display string (file:line for human readability)
      - risk_level: highest risk among findings in the group
      - findings: list of (package_name, finding) tuples
      - source_hash: per-chunk content hash (or package-level fallback)
    """
    risk_rank = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "UNKNOWN": 1}
    groups: dict[str, dict] = {}

    for entry in entries:
        pkg_name = entry.get("package", "unknown")
        pkg_source_hash = entry.get("source_hash", "")
        for finding in entry.get("findings", []):
            file_path = finding.get("file", "Unknown")
            line = finding.get("line", 0)
            finding_risk = finding.get("risk", "UNKNOWN").upper()
            finding_source_hash = finding.get("source_hash", "")

            # Display source for human readability
            display_source = f"{file_path}:{line}" if line else file_path

            # Use file:chunk_content_hash as stable key when available
            if finding_source_hash:
                key = f"{file_path}:{finding_source_hash}"
            else:
                # Fallback to line content hash for legacy findings
                key = compute_line_anchor(file_path, line)

            # Use per-chunk hash if available, fall back to package-level
            effective_source_hash = finding_source_hash or pkg_source_hash

            if key not in groups:
                groups[key] = {
                    "source": display_source,
                    "risk_level": finding_risk,
                    "findings": [],
                    "source_hash": effective_source_hash,
                }

            current_rank = risk_rank.get(groups[key]["risk_level"], 1)
            finding_rank = risk_rank.get(finding_risk, 1)
            if finding_rank < current_rank:
                groups[key]["risk_level"] = finding_risk

            groups[key]["findings"].append((pkg_name, finding))

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

    lines = [SUMMARY_MARKER, "", "## Code Architecture Review Summary", "",
             "_Reviews construct hierarchy, dependency direction, separation of concerns, "
             "and dependency management. "
             f"[Steering file]({_steering_link('architecture-review.md')})_", "",
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
        detail = finding.get("detail", "")
        line_num = finding.get("line", "")
        loc = f" (L{line_num})" if line_num else ""
        lines.append(f"- **{risk}** [{cat}]{loc} ({pkg_name}): {detail}")

    lines.append("")
    lines.append(_format_thread_footer())
    return "\n".join(lines)


def _compute_structural_hash(key: str, group: dict) -> str:
    """Compute structural hash for an architecture finding group."""
    structural = sorted(
        (f.get("category", ""), f.get("risk", ""), f.get("file", ""), str(f.get("line", "")))
        for _, f in group["findings"]
    )
    return compute_hash(json.dumps(structural, sort_keys=True))


def _make_get_position(groups: dict[str, dict]):
    """Create a position callback that uses the first finding's line number."""
    def _get_pos(key: str) -> dict | None:
        group = groups.get(key)
        if group and group.get("findings"):
            _, first_finding = group["findings"][0]
            file_path = first_finding.get("file", "")
            line = first_finding.get("line", 0) or 0
            if file_path and line:
                return _build_diff_position(file_path, line)
        return None
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

    # Build source groups (keyed by file:chunk_content_hash)
    groups = build_source_groups(entries)

    # Post detail threads (skipped if groups is empty)
    processed_keys: set[str] = set()
    if groups:
        processed_keys = post_detail_threads(
            project_id, mr_iid, token, discussions, groups,
            SOURCE_PATTERN, format_source_thread, _compute_structural_hash, _make_get_position(groups),
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

#!/usr/bin/env python3
"""
Post documentation quality review results as MR discussion threads.

Tier 1 — Summary thread (resolved): Documentation quality overview.
Tier 2 — Per-file threads (unresolved): One per documentation file with findings.

Requires environment variables:
  CI_API_V4_URL, CI_PROJECT_ID, CI_MERGE_REQUEST_IID, PROJECT_ACCESS_TOKEN

Usage:
  python3 scripts/review/doc_quality/post_doc_quality_threads.py [--report doc-quality-review/report.json]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.gitlab_threads import (
    get_mr_discussions, compute_hash, _build_diff_position,
)
from review.lib.thread_lifecycle import (
    _steering_link,
    _action_context,
    compute_file_source_hash,
    post_or_update_summary,
    post_detail_threads,
    resolve_orphaned_threads,
    check_unresolved_and_exit,
    UnresolvedThreadsError,
    _format_thread_footer,
    escape_markdown_math,
)

SUMMARY_MARKER = "<!-- docs-quality-summary -->"
FILE_PATTERN = re.compile(r"<!-- docs-quality-file:(.+?) -->")
ICON_MAP = {"HIGH": "\u26a0\ufe0f", "MEDIUM": "\u26a0\ufe0f", "LOW": "\u2139\ufe0f", "UNKNOWN": "\u2753"}


def build_file_groups(entries: list[dict]) -> dict[str, dict]:
    """Build per-file thread groups from the report entries.

    Each entry in the new report format is already a per-file assessment.
    Group findings by file path, taking the highest severity as the group level.
    """
    risk_rank = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "UNKNOWN": 1}
    groups: dict[str, dict] = {}

    for entry in entries:
        file_path = entry.get("file", "Unknown")
        findings = entry.get("findings", [])
        if not findings:
            continue

        if file_path not in groups:
            groups[file_path] = {
                "file": file_path,
                "risk_level": entry.get("risk_level", "UNKNOWN"),
                "findings": [],
                "source_hash": entry.get("source_hash", compute_file_source_hash(file_path)),
            }

        # Merge findings (in case multiple entries target the same file, e.g. CHANGELOG)
        groups[file_path]["findings"].extend(findings)

        # Update risk level to highest
        current = risk_rank.get(groups[file_path]["risk_level"], 1)
        new = risk_rank.get(entry.get("risk_level", "UNKNOWN"), 1)
        if new < current:
            groups[file_path]["risk_level"] = entry.get("risk_level", "UNKNOWN")

    return groups


def format_summary_body(entries: list[dict]) -> str:
    """Format the summary note body.

    Counts are derived from the same per-file grouping used to post detail
    threads (build_file_groups), so the thread count and severity breakdown
    match the threads a reviewer sees. Each detail thread groups all findings in
    one file under the file's highest severity, so the breakdown is by thread,
    not by individual finding. Total findings is still reported.
    """
    groups = build_file_groups(entries)
    files_reviewed = len(entries)
    total = sum(len(g["findings"]) for g in groups.values())
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
    lines = [
        SUMMARY_MARKER, "",
        "## Repo Documentation Quality Review Summary", "",
        "_Reviews CHANGELOG updates, SCHEMA.md regeneration, starter kit docs, "
        "MkDocs nav, and cross-document links. "
        "Does not review per-module documentation (covered by Module Quality agent). "
        f"[Steering file]({_steering_link('review-documentation.md')})_", "",
        f"**Files reviewed:** {files_reviewed}",
        f"**Review threads:** {thread_count}",
        f"**Total findings:** {total}", "",
    ]
    if breakdown:
        lines.append(f"**Thread severity breakdown:** {', '.join(breakdown)}")
    else:
        lines.append("**Result:** \u2705 No documentation gaps found.")
    lines.append("")
    lines.append(
        "_Findings have individual review threads. "
        "Resolve each thread to acknowledge the documentation gap._"
    )
    return "\n".join(lines)


def _file_link(file_path: str) -> str:
    """Build a markdown link to the file in the MR diff."""
    project_url = os.environ.get("CI_PROJECT_URL", "")
    mr_iid = os.environ.get("CI_MERGE_REQUEST_IID", "")
    if project_url and mr_iid:
        path_hash = hashlib.sha1(file_path.encode()).hexdigest()
        return f"[`{file_path}`]({project_url}/-/merge_requests/{mr_iid}/diffs#diff-content-{path_hash})"
    return f"`{file_path}`"


def format_file_thread(file_path: str, group: dict, content_hash: str, is_update: bool = False) -> str:
    """Format a per-file detail thread body."""
    risk_level = group["risk_level"]
    icon = ICON_MAP.get(risk_level, "\u2753")
    ctx = _action_context()
    lines = [
        f"<!-- docs-quality-file:{file_path} -->",
        f"<!-- docs-quality-hash:{content_hash} -->",
        "", f"## {icon} Documentation Review \u2014 Documentation Gap: {risk_level}",
        "", f"**File:** {_file_link(file_path)}", "",
    ]
    if ctx:
        lines.append(f"_{ctx}_")
        lines.append("")
    if is_update:
        lines.append("_Findings have changed since last review. Please re-acknowledge._")
        lines.append("")
    for finding in group["findings"]:
        risk = finding.get("risk", "UNKNOWN")
        cat = finding.get("category", "")
        detail = escape_markdown_math(finding.get("detail", ""))
        lines.append(f"- **{risk}** [{cat}]: {detail}")
    lines.append("")
    lines.append(_format_thread_footer())
    return "\n".join(lines)


def _compute_hash(file_path: str, group: dict) -> str:
    """Compute structural hash for change detection."""
    structural = sorted(
        (file_path, f.get("category", ""), f.get("risk", ""), str(f.get("line", "")))
        for f in group["findings"]
    )
    return compute_hash(json.dumps(structural, sort_keys=True))


def _get_position(file_path: str) -> dict | None:
    """Try to position the thread inline on the MR diff."""
    return _build_diff_position(file_path, 1)


def main():
    parser = argparse.ArgumentParser(description="Post documentation quality review MR threads")
    parser.add_argument("--report", default="doc-quality-review/report.json")
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

    print(f"Processing {len(entries)} entry(ies)...")

    # Fetch discussions once
    discussions = get_mr_discussions(project_id, mr_iid, token)

    # Post summary (returns refreshed discussions)
    discussions = post_or_update_summary(
        project_id, mr_iid, token, discussions, SUMMARY_MARKER,
        lambda: format_summary_body(entries),
    )

    # Build and post detail threads
    groups = build_file_groups(entries)

    processed_keys: set[str] = set()
    if groups:
        processed_keys = post_detail_threads(
            project_id, mr_iid, token, discussions, groups,
            FILE_PATTERN, format_file_thread, _compute_hash, _get_position,
        )
    else:
        print("  No documentation findings to post.")

    # Re-fetch after mutations, resolve orphans (runs even with no findings
    # so previously-opened threads get auto-resolved when gaps are fixed)
    discussions = get_mr_discussions(project_id, mr_iid, token)
    source_hashes = {key: group.get("source_hash", "") for key, group in groups.items()}
    resolve_orphaned_threads(
        project_id, mr_iid, token, discussions, FILE_PATTERN, processed_keys,
        source_hashes=source_hashes,
        # The doc-quality thread key is the file path itself.
        source_file_resolver=lambda key: key,
    )

    try:
        check_unresolved_and_exit(
            project_id, mr_iid, token, FILE_PATTERN,
            agent_name="documentation",
            finding_type="Documentation Gap",
            job_name="feature_merge_doc_quality_review",
        )
    except UnresolvedThreadsError:
        sys.exit(1)

    print("Done.")


if __name__ == "__main__":
    main()

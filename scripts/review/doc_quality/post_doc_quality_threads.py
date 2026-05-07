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
    _now,
    _steering_link,
    post_or_update_summary,
    post_detail_threads,
    resolve_orphaned_threads,
    check_unresolved_and_exit,
    UnresolvedThreadsError,
)

SUMMARY_MARKER = "<!-- docs-quality-summary -->"
FILE_PATTERN = re.compile(r"<!-- docs-quality-file:(.+?) -->")
ICON_MAP = {"HIGH": "\u26a0\ufe0f", "MEDIUM": "\u26a0\ufe0f", "LOW": "\u2705", "UNKNOWN": "\u2753"}


def build_file_groups(entries: list[dict]) -> dict[str, dict]:
    risk_rank = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "UNKNOWN": 1}
    groups: dict[str, dict] = {}
    for entry in entries:
        for finding in entry.get("findings", []):
            file_path = finding.get("file", "Unknown")
            finding_risk = finding.get("risk", "UNKNOWN").upper()
            if file_path not in groups:
                groups[file_path] = {"file": file_path, "risk_level": finding_risk, "findings": []}
            current = risk_rank.get(groups[file_path]["risk_level"], 1)
            new = risk_rank.get(finding_risk, 1)
            if new < current:
                groups[file_path]["risk_level"] = finding_risk
            groups[file_path]["findings"].append(finding)
    return groups


def format_summary_body(entries: list[dict]) -> str:
    risk_counts: dict[str, int] = {}
    total = 0
    for entry in entries:
        for f in entry.get("findings", []):
            r = f.get("risk", "UNKNOWN").upper()
            risk_counts[r] = risk_counts.get(r, 0) + 1
            total += 1
    breakdown = [f"{c} {l}" for l in ["HIGH", "MEDIUM", "LOW"] if (c := risk_counts.get(l, 0))]
    lines = [SUMMARY_MARKER, "", "## Documentation Quality Review Summary", "",
             "_Reviews CHANGELOG updates, SCHEMA.md regeneration, starter kit docs, "
             "MkDocs nav, and cross-document links. "
             f"[Steering file]({_steering_link('documentation-review.md')})_", "",
             f"_Last updated: {_now()}_", "",
             f"**Total findings:** {total}", ""]
    if breakdown:
        lines.append(f"**Findings:** {', '.join(breakdown)}")
    else:
        lines.append("**Result:** \u2705 No documentation gaps found.")
    lines.append("")
    lines.append("_Findings have individual review threads. "
                 "Resolve each thread to acknowledge the documentation gap._")
    return "\n".join(lines)


def format_file_thread(file_path: str, group: dict, content_hash: str, is_update: bool = False) -> str:
    risk_level = group["risk_level"]
    icon = ICON_MAP.get(risk_level, "\u2753")
    lines = [
        f"<!-- docs-quality-file:{file_path} -->",
        f"<!-- docs-quality-hash:{content_hash} -->",
        "", f"## {icon} Documentation Review \u2014 Documentation Gap: {risk_level}",
        "", f"**File:** `{file_path}`", "",
        f"_Last observed: {_now()}_", "",
    ]
    if is_update:
        lines.append("_Findings have changed since last review. Please re-acknowledge._")
        lines.append("")
    for finding in group["findings"]:
        risk = finding.get("risk", "UNKNOWN")
        cat = finding.get("category", "")
        detail = finding.get("detail", "")
        lines.append(f"- **{risk}** [{cat}]: {detail}")
    lines.append("")
    lines.append("_Resolve this thread to acknowledge the documentation gap. "
                 "Then rerun the `feature_merge_doc_quality_review` job to pass the pipeline._")
    return "\n".join(lines)


def _compute_hash(file_path: str, group: dict) -> str:
    structural = sorted(
        (file_path, f.get("category", ""), f.get("risk", ""), str(f.get("line", "")))
        for f in group["findings"]
    )
    return compute_hash(json.dumps(structural, sort_keys=True))


def _get_position(file_path: str) -> dict | None:
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
    if not groups:
        print("  No documentation findings to post.")
        print("Done.")
        return

    processed_keys = post_detail_threads(
        project_id, mr_iid, token, discussions, groups,
        FILE_PATTERN, format_file_thread, _compute_hash, _get_position,
    )

    # Re-fetch after mutations, resolve orphans
    discussions = get_mr_discussions(project_id, mr_iid, token)
    resolve_orphaned_threads(project_id, mr_iid, token, discussions, FILE_PATTERN, processed_keys)

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

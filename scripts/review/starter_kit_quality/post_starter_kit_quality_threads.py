#!/usr/bin/env python3
"""
Post starter kit quality review results as MR discussion threads (two-tier system).

Tier 1 — Summary thread (resolved):
  Starter kit quality overview with concern counts by severity and affected kits.

Tier 2 — Per-kit threads (unresolved):
  One thread per starter kit with quality findings. Categorized sections:
  README structure, deployment section, CDK Nag, schema validation, config placeholders.

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
  python3 scripts/review/starter_kit_quality/post_starter_kit_quality_threads.py \
    [--report starter-kit-quality-review/report.json]
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
    escape_markdown_math,
)

SUMMARY_MARKER = "<!-- starter-kit-quality-summary -->"
KIT_PATTERN = re.compile(r"<!-- starter-kit-quality-kit:(.+?) -->")

ICON_MAP = {
    "HIGH": "\u26a0\ufe0f",
    "MEDIUM": "\u26a0\ufe0f",
    "LOW": "\u2139\ufe0f",
    "UNKNOWN": "\u2753",
}

RISK_RANK = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "UNKNOWN": 3}


def _file_link(file_path: str) -> str:
    """Build a markdown link to a file in the MR source branch."""
    project_url = os.environ.get("CI_PROJECT_URL", "")
    branch = os.environ.get("CI_COMMIT_REF_NAME", "main")
    if project_url and file_path:
        return f"[`{file_path}`]({project_url}/-/blob/{branch}/{file_path})"
    return f"`{file_path}`"


def _highest_finding_risk(entry: dict) -> str:
    """Determine the highest risk level from an entry's findings."""
    worst = "LOW"
    for finding in entry.get("findings", []):
        risk = finding.get("risk", "UNKNOWN").upper()
        if RISK_RANK.get(risk, 3) < RISK_RANK.get(worst, 3):
            worst = risk
    return worst


def format_summary_body(entries: list[dict]) -> str:
    """Format the summary thread body.

    The severity breakdown counts review threads (one per kit with findings),
    each at its kit-level highest risk, matching the thread headers a reviewer
    sees — not individual findings, which would advertise severities that have no
    thread of their own (a kit is a single thread regardless of finding count).
    Total concerns is still reported for visibility.
    """
    entries_with_findings = [e for e in entries if e.get("findings")]
    total_findings = sum(len(e.get("findings", [])) for e in entries_with_findings)
    thread_count = len(entries_with_findings)

    concern_counts: dict[str, int] = {}
    for entry in entries_with_findings:
        level = _highest_finding_risk(entry)
        concern_counts[level] = concern_counts.get(level, 0) + 1

    breakdown = []
    for level in ["HIGH", "MEDIUM", "LOW", "UNKNOWN"]:
        count = concern_counts.get(level, 0)
        if count:
            breakdown.append(f"{count} {level}")

    lines = [
        SUMMARY_MARKER,
        "",
        "## Starter Kit Quality Review Summary",
        "",
        "_Reviews README structure, deployment instructions, CDK Nag suppressions, "
        "schema validation directives, config placeholders, and CLI usage in starter kits. "
        f"[Steering file]({_steering_link('review-starter-kit-standards.md')})_",
        "",
        f"**Kits reviewed:** {len(entries)}",
        "",
        f"**Review threads:** {thread_count}",
        "",
        f"**Total concerns:** {total_findings}",
        "",
    ]

    if breakdown:
        lines.append(f"**Thread severity breakdown:** {', '.join(breakdown)}")
    else:
        lines.append("**Result:** \u2705 All starter kits meet quality standards.")

    lines.append("")

    if entries:
        lines.append("<details><summary><b>Kit Details</b></summary>")
        lines.append("")

        for entry in sorted(entries, key=lambda e: e.get("kit_name", "")):
            kit = entry.get("kit_name", "unknown")
            n_findings = len(entry.get("findings", []))
            risk = _highest_finding_risk(entry) if n_findings else "LOW"
            icon = ICON_MAP.get(risk, "\u2753")
            summary = entry.get("risk_summary", "")

            lines.append(f"**{icon} {kit}** \u2014 {n_findings} concern(s), {risk}")
            if summary:
                lines.append(f"  {summary[:200]}")
            lines.append("")

        lines.append("</details>")
        lines.append("")

    lines.append(
        "_Kits with concerns have individual review threads. "
        "Resolve each thread to acknowledge the quality concern._"
    )

    return "\n".join(lines)


def format_kit_thread(
    kit_name: str,
    group: dict,
    content_hash: str,
    is_update: bool = False,
) -> str:
    """Format a per-kit thread body."""
    entry = group
    risk_level = _highest_finding_risk(entry)
    icon = ICON_MAP.get(risk_level, "\u2753")

    lines = [
        f"<!-- starter-kit-quality-kit:{kit_name} -->",
        f"<!-- starter-kit-quality-hash:{content_hash} -->",
        "",
        f"## {icon} Starter Kit Quality Review \u2014 Quality Concern: {risk_level}",
        "",
        f"**Starter Kit:** `{kit_name}`",
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
        "readme_structure": "README Structure",
        "deployment_section": "Deployment Section",
        "cdk_nag": "CDK Nag Suppressions",
        "schema_validation": "Schema Validation",
        "config_placeholders": "Config Placeholders",
        "context_exposure": "Context Exposure",
        "config_comments": "Config Comments",
        "usage_quality": "Usage Quality",
        "troubleshooting": "Troubleshooting",
        "cli_usage": "CLI Usage",
        "broken_references": "Broken References",
        "customer_friction": "Customer Friction",
        "other": "Other",
    }

    for cat_key in [
        "broken_references", "schema_validation", "context_exposure",
        "config_comments", "usage_quality", "readme_structure",
        "deployment_section", "cdk_nag", "config_placeholders",
        "customer_friction", "troubleshooting", "cli_usage", "other",
    ]:
        findings = categories.get(cat_key, [])
        if not findings:
            continue

        label = category_labels.get(cat_key, cat_key)
        lines.append(f"### {label}")
        lines.append("")

        for f in findings:
            risk = f.get("risk", "UNKNOWN")
            detail = escape_markdown_math(f.get("detail", ""))
            file_path = f.get("file", "")
            ref = f" ( {_file_link(file_path)} )" if file_path else ""
            lines.append(f"- **{risk}**{ref}: {detail}")

        lines.append("")

    lines.append(_format_thread_footer())

    return "\n".join(lines)


def _compute_structural_hash(kit_name: str, group: dict) -> str:
    """Compute structural hash for a starter kit quality finding group.

    `kit_name` is unused but required by the post_detail_threads callback signature.
    """
    structural = sorted(
        (f.get("category", ""), f.get("risk", ""), f.get("file", ""))
        for f in group.get("findings", [])
    )
    return compute_hash(json.dumps(structural, sort_keys=True))


def _get_position(kit_name: str) -> dict | None:
    """Get diff position for a starter kit quality thread.

    Always returns None — starter kit quality threads are keyed by kit name,
    not file:line, so there's no reliable diff position.
    """
    return None


def main():
    parser = argparse.ArgumentParser(description="Post starter kit quality review MR threads")
    parser.add_argument(
        "--report",
        default="starter-kit-quality-review/report.json",
        help="Path to starter kit quality review report JSON",
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

    print(f"Processing {len(entries)} kit(s)...")

    # Fetch discussions once
    discussions = get_mr_discussions(project_id, mr_iid, token)

    # Post summary (returns refreshed discussions)
    discussions = post_or_update_summary(
        project_id, mr_iid, token, discussions, SUMMARY_MARKER,
        lambda: format_summary_body(entries),
    )

    entries_with_findings = [e for e in entries if e.get("findings")]

    # Build groups keyed by kit name (empty if no findings)
    groups = {e.get("kit_name", "unknown"): e for e in entries_with_findings}

    # Post detail threads (skipped if groups is empty)
    processed_keys: set[str] = set()
    if groups:
        processed_keys = post_detail_threads(
            project_id, mr_iid, token, discussions, groups,
            KIT_PATTERN, format_kit_thread, _compute_structural_hash, _get_position,
        )
    else:
        print("  No quality concerns to post threads for.")

    # Re-fetch after mutations, resolve orphans (runs even with no findings
    # so previously-opened threads get auto-resolved when concerns are fixed)
    discussions = get_mr_discussions(project_id, mr_iid, token)
    source_hashes = {
        e.get("kit_name", "unknown"): e.get("source_hash", "")
        for e in entries
    }
    resolve_orphaned_threads(
        project_id, mr_iid, token, discussions, KIT_PATTERN, processed_keys,
        source_hashes=source_hashes,
    )

    try:
        check_unresolved_and_exit(
            project_id, mr_iid, token, KIT_PATTERN,
            agent_name="starter kit quality",
            finding_type="Quality Concern",
            job_name="feature_merge_starter_kit_quality_review",
        )
    except UnresolvedThreadsError:
        sys.exit(1)

    print("Done.")


if __name__ == "__main__":
    main()

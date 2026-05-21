#!/usr/bin/env python3
"""
Post compliance review results as MR discussion threads (two-tier system).

Tier 1 — Summary thread (resolved):
  Compliance posture overview with finding counts by severity and affected packages.

Tier 2 — Root cause threads (unresolved):
  One thread per source location (file:line) where a compliance issue originates.

Thread lifecycle:
  - New threads are created when a compliance issue first appears
  - Threads are updated and reopened when findings change (hash-based detection)
  - Threads that were resolved stay resolved if findings haven't changed
  - Orphaned threads auto-resolve when findings disappear

Requires environment variables:
  CI_API_V4_URL        - GitLab API base URL (set by GitLab CI)
  CI_PROJECT_ID        - Project ID (set by GitLab CI)
  CI_MERGE_REQUEST_IID - MR IID (set by GitLab CI)
  PROJECT_ACCESS_TOKEN - GitLab project access token for MR discussion threads

Usage:
  python3 scripts/review/compliance/post_compliance_threads.py [--report compliance-review/report.json]
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
    _parse_source_position,
    _build_diff_position,
    _mr_changes_link,
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

SUMMARY_MARKER = "<!-- compliance-summary -->"
SOURCE_PATTERN = re.compile(r"<!-- compliance-source:(.+?) -->")

ICON_MAP = {
    "BLOCKING": "\u274c",
    "HIGH": "\u26a0\ufe0f",
    "MEDIUM": "\u26a0\ufe0f",
    "LOW": "\u2705",
    "UNKNOWN": "\u2753",
}


def build_finding_groups(entries: list[dict]) -> dict[str, dict]:
    """Group findings by stable chunk content hash across all packages.

    Key is file:chunk_content_hash when source_hash is available (from pre-parsed
    diff chunks). Falls back to file:line_content_hash via compute_line_anchor
    for legacy findings without source_hash.

    Returns dict keyed by anchor string, each containing:
      - source: display string (file:line for human readability)
      - risk_level: highest risk among findings in the group
      - findings: list of (package_name, finding) tuples
      - source_hash: per-chunk content hash (or package-level fallback)
    """
    risk_rank = {"BLOCKING": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "UNKNOWN": 1}
    groups: dict[str, dict] = {}

    for entry in entries:
        pkg_name = entry.get("package", "unknown")
        pkg_source_hash = entry.get("source_hash", "")
        findings = entry.get("findings", [])

        if not findings:
            continue

        for finding in findings:
            source_file = finding.get("file", "Unknown")
            source_line = finding.get("line", 0)
            finding_source_hash = finding.get("source_hash", "")
            finding_risk = finding.get("risk", "UNKNOWN").upper()

            # Display source includes line number for human readability
            display_source = f"{source_file}:{source_line}" if source_line else source_file

            # Use file:chunk_content_hash as stable key when available
            if finding_source_hash:
                key = f"{source_file}:{finding_source_hash}"
            else:
                # Fallback to line content hash for legacy findings
                key = compute_line_anchor(source_file, source_line)

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
    total_findings = 0
    for entry in entries:
        for finding in entry.get("findings", []):
            risk = finding.get("risk", "UNKNOWN").upper()
            risk_counts[risk] = risk_counts.get(risk, 0) + 1
            total_findings += 1

    breakdown = []
    for level in ["BLOCKING", "HIGH", "MEDIUM", "LOW"]:
        count = risk_counts.get(level, 0)
        if count:
            breakdown.append(f"{count} {level}")

    lines = [
        SUMMARY_MARKER,
        "",
        "## Compliance Review Summary",
        "",
        "_Reviews encryption, IAM policies, CDK Nag suppressions, and security controls "
        "in L2/L3 constructs. "
        f"[Steering file]({_steering_link('compliance-review.md')})_",
        "",
        f"**Packages reviewed:** {len(entries)}",
        "",
        f"**Total findings:** {total_findings}",
        "",
    ]

    if breakdown:
        lines.append(f"**Risk breakdown:** {', '.join(breakdown)}")
    else:
        lines.append("**Result:** \u2705 No compliance issues found.")

    lines.append("")

    # Per-package details (collapsed)
    lines.extend(_format_package_details(entries))

    lines.append(
        "_Findings have individual review threads positioned on the source code. "
        "Resolve each thread to acknowledge the finding._"
    )

    return "\n".join(lines)


def _format_package_details(entries: list[dict]) -> list[str]:
    """Format the collapsed per-package details section of the summary."""
    lines = []
    lines.append("<details><summary><b>Package Details</b></summary>")
    lines.append("")

    for level in ["BLOCKING", "HIGH", "MEDIUM", "LOW"]:
        pkgs_at_level = [
            e for e in entries
            if e.get("risk_level", "UNKNOWN") == level
        ]
        if not pkgs_at_level:
            continue

        icon = ICON_MAP.get(level, "\u2753")
        lines.append(f"#### {icon} {level} ({len(pkgs_at_level)})")
        lines.append("")

        for entry in pkgs_at_level:
            pkg = entry.get("package", "unknown")
            summary = entry.get("risk_summary", "")
            n_findings = len(entry.get("findings", []))
            lines.append(f"**{pkg}** \u2014 {n_findings} finding(s)")
            if summary:
                lines.append(f"  {summary[:200]}")
            lines.append("")

    lines.append("</details>")
    lines.append("")
    return lines


def format_finding_thread(source: str, group: dict, content_hash: str, is_update: bool = False) -> str:
    """Format a detail thread body for a source location.

    `source` is the stable key (file:line_content_hash) used in the marker.
    `group["source"]` is the human-readable display (file:line_number).
    """
    risk_level = group["risk_level"]
    icon = ICON_MAP.get(risk_level, "\u2753")
    display_source = group.get("source", source)

    lines = [
        f"<!-- compliance-source:{source} -->",
        f"<!-- compliance-hash:{content_hash} -->",
        "",
        f"## {icon} Compliance Review \u2014 Compliance Risk: {risk_level}",
        "",
    ]

    # Source with link (use display source for readability)
    link = _mr_changes_link(display_source)
    if link:
        lines.append(f"**Source:** [`{display_source}`]({link})")
    else:
        lines.append(f"**Source:** `{display_source}`")
    lines.append("")
    ctx = _action_context()
    if ctx:
        lines.append(f"_{ctx}_")
    lines.append("")

    if is_update:
        lines.append("_Findings have changed since last review. Please re-acknowledge._")
        lines.append("")

    # Findings table
    lines.append("### Findings")
    lines.append("")
    lines.append("| Risk | Category | Resource | Detail |")
    lines.append("|---|---|---|---|")

    for pkg_name, finding in group["findings"]:
        risk = finding.get("risk", "UNKNOWN")
        category = finding.get("category", "")
        resource = finding.get("resource", "")
        detail = finding.get("detail", "")
        lines.append(f"| {risk} | {category} | {resource} | {detail} |")

    lines.append("")

    # Show which packages are affected
    affected_pkgs = sorted(set(pkg for pkg, _ in group["findings"]))
    if len(affected_pkgs) > 1:
        lines.append(f"**Affected packages:** {', '.join(f'`{p}`' for p in affected_pkgs)}")
        lines.append("")

    lines.append(_format_thread_footer())

    return "\n".join(lines)


def _compute_structural_hash(source: str, group: dict) -> str:
    """Compute structural hash for a compliance finding group."""
    structural = sorted(
        (source, f.get("category", ""), f.get("risk", ""), f.get("resource", ""))
        for _, f in group["findings"]
    )
    return compute_hash(json.dumps(structural, sort_keys=True))


def _make_get_position(groups: dict[str, dict]):
    """Create a position callback that uses the display source (file:line) for positioning."""
    def _get_pos(key: str) -> dict | None:
        group = groups.get(key)
        if group:
            display_source = group.get("source", key)
            parsed = _parse_source_position(display_source)
            return _build_diff_position(*parsed) if parsed else None
        return None
    return _get_pos


def main() -> None:
    parser = argparse.ArgumentParser(description="Post compliance review MR threads")
    parser.add_argument(
        "--report",
        default="compliance-review/report.json",
        help="Path to compliance review report JSON",
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

    if not entries:
        print("No compliance entries to report.")
        # Still post summary thread to confirm the agent ran
        discussions = get_mr_discussions(project_id, mr_iid, token)
        post_or_update_summary(
            project_id, mr_iid, token, discussions, SUMMARY_MARKER,
            lambda: format_summary_body([]),
        )
        print("Creating compliance summary thread...")
        # Resolve any orphaned threads from previous runs
        discussions = get_mr_discussions(project_id, mr_iid, token)
        resolve_orphaned_threads(project_id, mr_iid, token, discussions, SOURCE_PATTERN, set())
        try:
            check_unresolved_and_exit(
                project_id, mr_iid, token, SOURCE_PATTERN,
                agent_name="compliance",
                finding_type="Compliance Risk",
                job_name="feature_merge_compliance_review",
            )
        except UnresolvedThreadsError:
            sys.exit(1)
        print("Done.")
        return

    # Filter to entries with findings
    entries_with_findings = [e for e in entries if e.get("findings")]

    print(f"Processing {len(entries)} package(s) ({len(entries_with_findings)} with findings)...")

    # Fetch discussions once
    discussions = get_mr_discussions(project_id, mr_iid, token)

    # Post summary (returns refreshed discussions)
    discussions = post_or_update_summary(
        project_id, mr_iid, token, discussions, SUMMARY_MARKER,
        lambda: format_summary_body(entries),
    )

    # Build finding groups by source location
    groups = build_finding_groups(entries)

    processed_keys: set[str] = set()
    if groups:
        # Post detail threads
        processed_keys = post_detail_threads(
            project_id, mr_iid, token, discussions, groups,
            SOURCE_PATTERN, format_finding_thread, _compute_structural_hash, _make_get_position(groups),
        )
    else:
        print("  No findings to post threads for.")

    # Always resolve orphans and check unresolved (even when no current findings)
    discussions = get_mr_discussions(project_id, mr_iid, token)
    source_hashes = {key: group.get("source_hash", "") for key, group in groups.items()}
    resolve_orphaned_threads(
        project_id, mr_iid, token, discussions, SOURCE_PATTERN, processed_keys,
        source_hashes=source_hashes,
    )

    try:
        check_unresolved_and_exit(
            project_id, mr_iid, token, SOURCE_PATTERN,
            agent_name="compliance",
            finding_type="Compliance Risk",
            job_name="feature_merge_compliance_review",
        )
    except UnresolvedThreadsError:
        sys.exit(1)

    print("Done.")


if __name__ == "__main__":
    main()

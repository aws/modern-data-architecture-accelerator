#!/usr/bin/env python3
"""
Post baseline review results as MR discussion threads (two-tier system).

Tier 1 — Summary thread (resolved):
  Overall risk breakdown with per-baseline risk level and collapsed CDK diff.

Tier 2 — Root cause threads (unresolved):
  One thread per unique source (file:chunk_hash) across all baselines. Groups
  findings by the code change that caused them. Uses the shared post_detail_threads
  infrastructure for consistent lifecycle management.

Thread lifecycle:
  - New threads are created when a root cause first appears
  - Threads are updated and reopened when findings change (hash-based detection)
  - Threads that were resolved stay resolved if findings haven't changed
  - Orphaned threads auto-resolve when findings disappear
  - Auto-resolved threads reopen if finding reappears

Requires environment variables:
  CI_API_V4_URL        - GitLab API base URL (set automatically by GitLab CI)
  CI_PROJECT_ID        - Project ID (set automatically by GitLab CI)
  CI_MERGE_REQUEST_IID - MR IID (set automatically by GitLab CI)
  PROJECT_ACCESS_TOKEN - GitLab project access token for MR discussion threads

Usage:
  python3 scripts/review/baseline/post_baseline_threads.py [--report baseline-review/report.json]
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
    _build_diff_position,
    _parse_source_position,
    _mr_changes_link,
)
from review.lib.thread_lifecycle import (
    _action_context,
    compute_line_anchor,
    post_or_update_summary,
    post_detail_threads,
    resolve_orphaned_threads,
    check_unresolved_and_exit,
    UnresolvedThreadsError,
    _format_thread_footer,
)

SUMMARY_MARKER = "<!-- baseline-summary -->"
SOURCE_PATTERN = re.compile(r"<!-- baseline-source:(.+?) -->")

RISK_RANK = {"BLOCKING": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "UNKNOWN": 1}
RISK_ESCALATION_LADDER = ["LOW", "MEDIUM", "HIGH"]
ICON_MAP = {"BLOCKING": "\u274c", "HIGH": "\u26a0\ufe0f", "MEDIUM": "\u26a0\ufe0f", "LOW": "\u2705", "UNKNOWN": "\u2753"}


def build_root_cause_groups(entries: list[dict]) -> dict[str, dict]:
    """Group findings across all baselines by source (root cause).

    Key is file:chunk_content_hash when source_hash is available.
    Falls back to compute_line_anchor for legacy findings.

    Returns dict keyed by stable anchor string, each containing:
      - source: display string (file:Lline for human readability)
      - risk_level: highest risk among findings in the group
      - findings: list of (baseline_key, finding) tuples
      - source_hash: per-chunk content hash
      - risk_summary: one-line description of the change
    """
    groups: dict[str, dict] = {}

    for entry in entries:
        findings = entry.get("findings", [])
        baseline_key = f"{entry['module']}/{entry['config']}"
        entry_source_hash = entry.get("source_hash", "")

        if not findings:
            if entry.get("risk_level", "UNKNOWN") == "LOW":
                continue
            source = f"Unknown - {baseline_key}"
            groups[source] = {
                "source": "Unknown - Please Investigate",
                "risk_level": entry.get("risk_level", "UNKNOWN"),
                "findings": [],
                "risk_summary": entry.get("risk_summary", ""),
                "source_hash": entry_source_hash,
            }
            if not groups[source]["risk_summary"] and entry.get("risk_assessment"):
                groups[source]["risk_summary"] = str(entry["risk_assessment"])[:500]
            continue

        for finding in findings:
            source = finding.get("source", "Unknown - Please Investigate")
            finding_risk = finding.get("risk", "UNKNOWN").upper()
            finding_source_hash = finding.get("source_hash", "")

            # Use file:chunk_content_hash as stable thread key
            if finding_source_hash and source != "Unknown - Please Investigate":
                line_match = re.match(r'^(.+?):L?\d+$', source)
                file_path = line_match.group(1) if line_match else source
                key = f"{file_path}:{finding_source_hash}"
            elif source and source != "Unknown - Please Investigate":
                line_match = re.match(r'^(.+?):L?(\d+)$', source)
                if line_match:
                    anchor = compute_line_anchor(line_match.group(1), int(line_match.group(2)))
                    fallback = f"{line_match.group(1)}:{line_match.group(2)}"
                    key = anchor if anchor != fallback else source
                else:
                    key = source
            else:
                key = source

            effective_source_hash = finding_source_hash or entry_source_hash

            if key not in groups:
                groups[key] = {
                    "source": source,
                    "risk_level": finding_risk,
                    "findings": [],
                    "risk_summary": "",
                    "source_hash": effective_source_hash,
                }

            current_rank = RISK_RANK.get(groups[key]["risk_level"], 1)
            finding_rank = RISK_RANK.get(finding_risk, 1)
            if finding_rank < current_rank:
                groups[key]["risk_level"] = finding_risk

            groups[key]["findings"].append((baseline_key, finding))

    # Populate summaries and apply wide impact escalation
    for group in groups.values():
        if not group["risk_summary"] and group["findings"]:
            group["risk_summary"] = group["findings"][0][1].get("change", "")

    _apply_wide_impact_escalation(groups)
    return groups


def _apply_wide_impact_escalation(groups: dict[str, dict]) -> None:
    """Escalate risk level for groups that affect many modules."""
    for group in groups.values():
        impacted_modules = set()
        for baseline_key, _ in group["findings"]:
            module = baseline_key.split("/")[0] if "/" in baseline_key else baseline_key
            impacted_modules.add(module)

        module_count = len(impacted_modules)
        if module_count < 3:
            continue

        steps = 3 if module_count >= 10 else (2 if module_count >= 5 else 1)
        current_level = group["risk_level"]
        current_idx = (
            RISK_ESCALATION_LADDER.index(current_level)
            if current_level in RISK_ESCALATION_LADDER
            else len(RISK_ESCALATION_LADDER) - 1
        )
        new_idx = min(current_idx + steps, len(RISK_ESCALATION_LADDER) - 1)
        new_level = RISK_ESCALATION_LADDER[new_idx]

        if RISK_RANK.get(new_level, 99) < RISK_RANK.get(current_level, 99):
            group["risk_level"] = new_level
            group["wide_impact"] = module_count


def format_summary_body(entries: list[dict]) -> str:
    """Format the summary thread body."""
    risk_counts: dict[str, int] = {}
    for entry in entries:
        level = entry.get("risk_level", "UNKNOWN")
        risk_counts[level] = risk_counts.get(level, 0) + 1

    total = len(entries)
    breakdown_parts = [f"{c} {l}" for l in ["BLOCKING", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]
                       if (c := risk_counts.get(l, 0))]

    lines = [
        SUMMARY_MARKER, "",
        "## Baseline Review Summary", "",
        f"**Total baselines changed:** {total}", "",
        f"**Risk breakdown:** {', '.join(breakdown_parts)}", "",
    ]

    # Overall summary
    overall_summary = next((e.get("overall_summary", "") for e in entries if e.get("overall_summary")), "")
    if overall_summary:
        lines.extend(["### Change Summary", "", overall_summary, ""])

    # Collapsed baseline details
    lines.extend(["<details><summary><b>Baseline Details</b></summary>", ""])
    for entry in sorted(entries, key=lambda e: (RISK_RANK.get(e.get("risk_level", "UNKNOWN"), 3), e.get("module", ""), len(e.get("config", "")), e.get("config", ""))):
        module_key = f"{entry['module']}/{entry['config']}"
        icon = ICON_MAP.get(entry.get("risk_level", "UNKNOWN"), "\u2753")
        lines.extend([
            f"**{icon} `{module_key}`**", "",
            "<details><summary>CDK Diff</summary>", "",
            "```diff", entry.get("cdk_diff", ""), "```", "",
            "</details>", "",
        ])
    lines.extend(["</details>", ""])

    lines.append("_Root cause threads are positioned on the source code. "
                 "Resolve each thread to acknowledge the change._")
    return "\n".join(lines)


def format_root_cause_thread(
    key: str, group: dict, content_hash: str, is_update: bool = False
) -> str:
    """Format a root cause discussion thread body."""
    risk_level = group["risk_level"]
    icon = ICON_MAP.get(risk_level, "\u2753")

    display_source = group.get("source", key)
    link = _mr_changes_link(display_source)

    lines = [
        f"<!-- baseline-source:{key} -->",
        f"<!-- baseline-hash:{content_hash} -->",
        "",
        f"## {icon} Baseline Review \u2014 Infrastructure Risk: {risk_level}",
        "",
    ]

    if link:
        lines.append(f"**Root Cause:** [`{display_source}`]({link})")
    else:
        lines.append(f"**Root Cause:** `{display_source}`")
    lines.append("")

    ctx = _action_context()
    if ctx:
        lines.append(f"_{ctx}_")
        lines.append("")

    if is_update:
        lines.extend(["_Findings have changed since last review. Please re-acknowledge._", ""])

    # Risk analysis
    summary = group.get("risk_summary", "")
    if summary:
        lines.extend(["### Risk Analysis", "", summary, ""])

    # Wide impact note
    wide_impact = group.get("wide_impact")
    if wide_impact:
        lines.extend([
            f"> \u26a0\ufe0f **Wide impact:** This root cause affects **{wide_impact} modules**. "
            f"Risk level was escalated due to breadth of impact.",
            "",
        ])

    # Affected resources grouped by baseline
    findings_by_baseline: dict[str, list[dict]] = {}
    for baseline_key, finding in group["findings"]:
        findings_by_baseline.setdefault(baseline_key, []).append(finding)

    baseline_count = len(findings_by_baseline)
    finding_count = len(group["findings"])

    lines.extend([
        f"<details><summary><b>Affected Resources</b> ({baseline_count} baseline{'s' if baseline_count != 1 else ''}, "
        f"{finding_count} finding{'s' if finding_count != 1 else ''})</summary>",
        "",
    ])

    for baseline_key, findings in findings_by_baseline.items():
        lines.extend([
            f"<details><summary><code>{baseline_key}</code> ({len(findings)} finding{'s' if len(findings) != 1 else ''})</summary>",
            "",
            "| Resource | Type | Change | Risk |",
            "|---|---|---|---|",
        ])
        for f in findings:
            resource = f.get("resource", "Unknown")
            res_parts = resource.split(" (", 1)
            logical_id = res_parts[0].strip("`")
            res_type = res_parts[1].rstrip(")") if len(res_parts) > 1 else ""
            change = f.get("change", "")
            risk = f.get("risk", "UNKNOWN")
            lines.append(f"| `{logical_id}` | {res_type} | {change} | {risk} |")
        lines.extend(["", "</details>", ""])

    lines.extend(["</details>", ""])

    # Footer
    lines.append(_format_thread_footer())

    return "\n".join(lines)


def _compute_structural_hash(key: str, group: dict) -> str:
    """Compute structural hash for a baseline finding group."""
    structural = sorted(
        (bk, f.get("source", ""), f.get("resource", ""), f.get("risk", ""))
        for bk, f in group["findings"]
    )
    return compute_hash(json.dumps(structural, sort_keys=True))


def _make_get_position(groups: dict[str, dict]):
    """Create a position callback that uses the source attribution for inline positioning."""
    def _get_pos(key: str) -> dict | None:
        group = groups.get(key)
        if not group:
            return None
        display_source = group.get("source", "")
        parsed = _parse_source_position(display_source)
        if parsed:
            return _build_diff_position(*parsed)
        return None
    return _get_pos


def main() -> None:
    parser = argparse.ArgumentParser(description="Post baseline review MR threads")
    parser.add_argument(
        "--report",
        default="baseline-review/report.json",
        help="Path to baseline review report JSON",
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

    # Filter to failures only
    failures = [e for e in entries if e["change_type"] in ("modified", "missing_baseline")]

    print(f"Processing {len(entries)} entry(ies) ({len(failures)} with changes)...")

    # Fetch discussions once
    discussions = get_mr_discussions(project_id, mr_iid, token)

    # Post summary
    discussions = post_or_update_summary(
        project_id, mr_iid, token, discussions, SUMMARY_MARKER,
        lambda: format_summary_body(failures if failures else entries),
    )

    # Build root cause groups
    groups = build_root_cause_groups(failures)

    # Post detail threads (skipped if groups is empty)
    processed_keys: set[str] = set()
    if groups:
        processed_keys = post_detail_threads(
            project_id, mr_iid, token, discussions, groups,
            SOURCE_PATTERN, format_root_cause_thread, _compute_structural_hash,
            _make_get_position(groups),
        )
    else:
        print("  No root cause findings to post threads for.")

    # Resolve orphans and check unresolved
    discussions = get_mr_discussions(project_id, mr_iid, token)
    resolve_orphaned_threads(project_id, mr_iid, token, discussions, SOURCE_PATTERN, processed_keys)

    try:
        check_unresolved_and_exit(
            project_id, mr_iid, token, SOURCE_PATTERN,
            agent_name="baseline",
            finding_type="Infrastructure Risk",
            job_name="feature_merge_baseline_review",
        )
    except UnresolvedThreadsError:
        sys.exit(1)

    print("Done.")


if __name__ == "__main__":
    main()

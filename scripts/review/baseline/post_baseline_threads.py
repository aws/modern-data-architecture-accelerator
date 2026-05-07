#!/usr/bin/env python3
"""
Post baseline review results as MR discussion threads (two-tier system).

Tier 1 — Summary thread (resolved):
  Overall risk breakdown with per-baseline risk level and collapsed CDK diff.

Tier 2 — Root cause threads (unresolved):
  One thread per unique source (file:line) across all baselines. Groups findings
  by the code or config change that caused them. BLOCKING threads posted first.
  LOW root causes get no thread.

Falls back to per-baseline threads if Kiro did not produce structured JSON findings.

Thread lifecycle:
  - New threads are created when a root cause first appears
  - Threads are updated and reopened when findings change (hash-based detection)
  - Threads that were resolved stay resolved if findings haven't changed

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
from typing import Any

# Add scripts/ to Python path so review.lib imports work when run directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.gitlab_threads import (
    gitlab_api,
    get_mr_discussions,
    compute_hash,
    create_discussion,
    add_note_to_discussion,
    edit_note,
    resolve_discussion,
    _parse_source_position,
    _build_diff_position,
    _mr_changes_link,
)
from review.lib.thread_lifecycle import compute_line_anchor

HASH_PATTERN = re.compile(r"<!-- baseline-hash:(\w+) -->")
MODULE_PATTERN = re.compile(r"<!-- baseline-module:(.+?) -->")
SOURCE_HASH_PATTERN = re.compile(r"<!-- source-hash:(\w+) -->")


def find_existing_thread(
    discussions: list[dict],
    module_key: str,
) -> tuple[dict | None, str | None, str | None]:
    """Find an existing baseline thread for a given module key.

    Returns (discussion, existing_hash, existing_source_hash) or (None, None, None).
    """
    for discussion in discussions:
        notes = discussion.get("notes", [])
        if not notes:
            continue
        # Check all notes for the module marker (first note has it)
        first_body = notes[0].get("body", "")
        module_match = MODULE_PATTERN.search(first_body)
        if module_match and module_match.group(1) == module_key:
            # Find the latest hash (could be in the first note or a later update)
            latest_hash = None
            latest_source_hash = None
            for note in notes:
                hash_match = HASH_PATTERN.search(note.get("body", ""))
                if hash_match:
                    latest_hash = hash_match.group(1)
                sm = SOURCE_HASH_PATTERN.search(note.get("body", ""))
                if sm:
                    latest_source_hash = sm.group(1)
            return discussion, latest_hash, latest_source_hash
    return None, None, None


def _filter_safe_findings(risk_assessment: str) -> str:
    """Remove LOW finding tables from the risk assessment text."""
    filtered_lines = []
    skip_table = False
    for line in risk_assessment.split("\n"):
        if "| **Risk**" in line and "LOW" in line:
            skip_table = True
        elif skip_table and line.strip() == "":
            skip_table = False
            continue
        if not skip_table:
            filtered_lines.append(line)
    return "\n".join(filtered_lines).strip()


def _split_assessment(risk_assessment: str) -> tuple[str, str]:
    """Split risk assessment into summary text and resource change tables.

    Summary includes all non-table lines (before and after tables).
    Tables are all consecutive lines starting with '|'.
    """
    lines = risk_assessment.strip().split("\n")
    summary_lines = []
    table_lines = []

    for line in lines:
        stripped = line.strip()
        if stripped.startswith("|") or stripped.startswith("|---"):
            table_lines.append(line)
        elif stripped:
            summary_lines.append(line)

    summary = "\n".join(summary_lines).strip()
    # Remove stray pipe characters, empty table fragments, and table separator lines
    summary = "\n".join(
        line for line in summary.split("\n")
        if line.strip() and not re.match(r'^[\s|_\-]*$', line)
    )
    tables = "\n".join(table_lines).strip()
    return summary, tables


def _config_path(entry: dict) -> str:
    """Derive the full sample config path from the baseline file path."""
    baseline_file = entry.get("file", "")
    # baseline: packages/apps/{cat}/{module}/test/__snapshots__/{config}.baseline.json
    # config:   packages/apps/{cat}/{module}/sample_configs/{config}.yaml
    parts = baseline_file.split("/test/__snapshots__/")
    if len(parts) == 2:
        module_root = parts[0]
        return f"{module_root}/sample_configs/{entry['config']}.yaml"
    return entry["config"]


def format_thread_body(entry: dict, diff_hash: str, is_update: bool = False) -> str:
    """Format the discussion thread body."""
    module_key = f"{entry['module']}/{entry['config']}"
    risk_level = entry.get("risk_level", "UNKNOWN")
    risk_icon = {"BLOCKING": "\u274c", "HIGH": "\u26a0\ufe0f", "MEDIUM": "\u26a0\ufe0f"}.get(risk_level, "\u2753")

    lines = [
        f"<!-- baseline-module:{module_key} -->",
        f"<!-- baseline-hash:{diff_hash} -->",
    ]

    # Header
    lines.extend([
        f"## {risk_icon} Baseline Diff Risk: {risk_level}",
        "",
        f"**Baseline Name:** `{module_key}`",
        "",
        f"**Baseline File:** `{entry['file']}`",
        "",
        f"**Input Config:** `{_config_path(entry)}`",
        "",
    ])

    if is_update:
        lines.extend([
            "_Baseline diff has changed since last review. Please re-acknowledge._",
            "",
        ])

    # Risk assessment
    risk_assessment = entry.get("risk_assessment", "")
    has_assessment = risk_assessment and not risk_assessment.startswith("(")
    if has_assessment:
        filtered = _filter_safe_findings(risk_assessment)
        summary, tables = _split_assessment(filtered)

        lines.extend([
            "### Kiro Risk Assessment",
            "",
        ])
        if summary:
            lines.extend([summary, ""])

        if tables:
            lines.extend([
                "### Changed Resources",
                "",
                tables,
                "",
            ])
    else:
        print(f"    No risk assessment to display (value: {repr(risk_assessment[:100]) if risk_assessment else 'empty'})")

    # CDK Diff — collapsible
    lines.extend([
        "<details><summary><h3>Diff</h3></summary>",
        "",
        "```diff",
        entry["cdk_diff"],
        "```",
        "",
        "</details>",
        "",
    ])

    lines.append("_Resolve this thread to acknowledge the baseline change._")

    return "\n".join(lines)


ROOTCAUSE_PATTERN = re.compile(r"<!-- root-cause:(.+?) -->")
ROOTCAUSE_HASH_PATTERN = re.compile(r"<!-- rootcause-hash:(\w+) -->")


RISK_RANK = {"BLOCKING": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "UNKNOWN": 1}
RISK_ESCALATION_LADDER = ["LOW", "MEDIUM", "HIGH"]


def _collect_finding_groups(failures: list[dict]) -> dict[str, dict]:
    """Collect findings into groups keyed by source. No escalation applied."""
    groups: dict[str, dict] = {}

    for entry in failures:
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
                "baseline_key": baseline_key,
                "source_hash": entry_source_hash,
            }
            if not groups[source]["risk_summary"] and entry.get("risk_assessment"):
                groups[source]["risk_summary"] = str(entry["risk_assessment"])[:500]
            continue

        for finding in findings:
            source = finding.get("source", "Unknown - Please Investigate")
            finding_risk = finding.get("risk", "UNKNOWN").upper()

            # Compute stable key from line content hash
            # Baseline sources use format "file:Lline" or "file:line"
            if source and source != "Unknown - Please Investigate":
                line_match = re.match(r'^(.+?):L?(\d+)$', source)
                if line_match:
                    anchor = compute_line_anchor(line_match.group(1), int(line_match.group(2)))
                    # If anchor differs from fallback (file:line), use it; otherwise keep original source as key
                    fallback = f"{line_match.group(1)}:{line_match.group(2)}"
                    key = anchor if anchor != fallback else source
                else:
                    key = source
            else:
                key = source

            if key not in groups:
                groups[key] = {
                    "source": source,
                    "risk_level": finding_risk,
                    "findings": [],
                    "risk_summary": "",
                    "source_hash": entry_source_hash,
                }

            current_rank = RISK_RANK.get(groups[key]["risk_level"], 1)
            finding_rank = RISK_RANK.get(finding_risk, 1)
            if finding_rank < current_rank:
                groups[key]["risk_level"] = finding_risk

            groups[key]["findings"].append((baseline_key, finding))

    return groups


def _populate_group_summaries(groups: dict[str, dict]) -> None:
    """Fill in risk_summary for groups that don't have one, using the first finding."""
    for group in groups.values():
        if not group["risk_summary"] and group["findings"]:
            first_change = group["findings"][0][1].get("change", "")
            group["risk_summary"] = first_change


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


def _build_root_cause_groups(failures: list[dict]) -> dict[str, dict]:
    """Group findings across all baselines by source (root cause).

    Returns a dict keyed by source string, each value containing:
      - source: the root cause file:line or config path
      - risk_level: highest risk among findings in the group
      - findings: list of (baseline_key, finding) tuples
    """
    groups = _collect_finding_groups(failures)
    _populate_group_summaries(groups)
    _apply_wide_impact_escalation(groups)
    return groups


def _format_root_cause_body(
    source: str,
    group: dict,
    content_hash: str,
    is_update: bool = False,
) -> str:
    """Format a Tier 2 root cause discussion thread body."""
    risk_level = group["risk_level"]
    icon_map = {"BLOCKING": "\u274c", "HIGH": "\u26a0\ufe0f", "MEDIUM": "\u26a0\ufe0f", "LOW": "\u2705", "UNKNOWN": "\u2753"}
    icon = icon_map.get(risk_level, "\u2753")

    lines = [
        f"<!-- root-cause:{source} -->",
        f"<!-- rootcause-hash:{content_hash} -->",
        "",
        f"## {icon} Baseline Review \u2014 Infrastructure Risk: {risk_level}",
        "",
    ]

    # Root cause with link
    display_source = group.get("source", source)
    link = _mr_changes_link(display_source)
    if link:
        lines.append(f"**Root Cause:** [`{display_source}`]({link})")
    else:
        lines.append(f"**Root Cause:** `{display_source}`")
    lines.append("")

    if is_update:
        lines.extend([
            "_Findings have changed since last review. Please re-acknowledge._",
            "",
        ])

    # Risk analysis
    summary = group.get("risk_summary", "")
    if summary:
        lines.extend([
            "### Risk Analysis",
            "",
            summary,
            "",
        ])

    # Wide impact escalation note
    wide_impact = group.get("wide_impact")
    if wide_impact:
        lines.extend([
            f"> \u26a0\ufe0f **Wide impact:** This root cause affects **{wide_impact} modules**. "
            f"Risk level was escalated due to breadth of impact. Verify the author intended "
            f"this change to propagate this widely.",
            "",
        ])

    # Affected resources grouped by baseline — collapsed by default
    findings_by_baseline: dict[str, list[dict]] = {}
    for baseline_key, finding in group["findings"]:
        findings_by_baseline.setdefault(baseline_key, []).append(finding)

    baseline_count = len(findings_by_baseline)
    finding_count = len(group["findings"])

    lines.extend([
        f"<details><summary><b>Affected Resources</b> ({baseline_count} baseline{'s' if baseline_count != 1 else ''}, {finding_count} finding{'s' if finding_count != 1 else ''})</summary>",
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
            # Split "LogicalId (AWS::Service::Type)" into parts
            res_parts = resource.split(" (", 1)
            logical_id = res_parts[0].strip("`")
            res_type = res_parts[1].rstrip(")") if len(res_parts) > 1 else ""
            change = f.get("change", "")
            risk = f.get("risk", "UNKNOWN")
            lines.append(f"| `{logical_id}` | {res_type} | {change} | {risk} |")
        lines.extend([
            "",
            "</details>",
            "",
        ])

    lines.extend([
        "</details>",
        "",
    ])

    lines.append("_Resolve this thread to acknowledge the root cause._")

    return "\n".join(lines)


def _find_existing_root_cause_thread(
    discussions: list[dict],
    source: str,
) -> tuple[dict | None, str | None, str | None, str | None]:
    """Find an existing root cause thread for a given source.

    Returns (discussion, existing_hash, first_note_id, existing_source_hash) or (None, None, None, None).
    """
    for discussion in discussions:
        notes = discussion.get("notes", [])
        if not notes:
            continue
        first_body = notes[0].get("body", "")
        first_note_id = str(notes[0].get("id", ""))
        rc_match = ROOTCAUSE_PATTERN.search(first_body)
        if rc_match and rc_match.group(1) == source:
            latest_hash = None
            latest_source_hash = None
            for note in notes:
                hash_match = ROOTCAUSE_HASH_PATTERN.search(note.get("body", ""))
                if hash_match:
                    latest_hash = hash_match.group(1)
                sm = SOURCE_HASH_PATTERN.search(note.get("body", ""))
                if sm:
                    latest_source_hash = sm.group(1)
            return discussion, latest_hash, first_note_id, latest_source_hash
    return None, None, None, None


SUMMARY_MARKER = "<!-- baseline-summary -->"


def _format_summary_body(failures: list[dict]) -> str:
    """Format the summary thread body.

    Lists each baseline with its risk level and a collapsed CDK diff,
    grouped by severity (BLOCKING first, then HIGH, MEDIUM, LOW, UNKNOWN).
    """
    risk_counts: dict[str, int] = {}
    for entry in failures:
        level = entry.get("risk_level", "UNKNOWN")
        risk_counts[level] = risk_counts.get(level, 0) + 1

    total = len(failures)
    breakdown_parts = []
    for level in ["BLOCKING", "HIGH", "MEDIUM", "LOW", "UNKNOWN"]:
        count = risk_counts.get(level, 0)
        if count:
            breakdown_parts.append(f"{count} {level}")

    lines = [
        SUMMARY_MARKER,
        "",
        "## Baseline Review Summary",
        "",
        f"**Total baselines changed:** {total}",
        "",
        f"**Risk breakdown:** {', '.join(breakdown_parts)}",
        "",
    ]

    icon_map = {"BLOCKING": "\u274c", "HIGH": "\u26a0\ufe0f", "MEDIUM": "\u26a0\ufe0f", "LOW": "\u2705", "UNKNOWN": "\u2753"}

    # Use the overall summary if available, otherwise fall back to per-baseline summaries
    overall_summary = ""
    for entry in failures:
        if entry.get("overall_summary"):
            overall_summary = entry["overall_summary"]
            break

    if overall_summary:
        lines.extend([
            "### Change Summary",
            "",
            overall_summary,
            "",
        ])
    else:
        # Fallback: collect unique risk summaries
        seen_summaries: set[str] = set()
        summary_bullets: list[str] = []
        for entry in failures:
            risk_summary = entry.get("risk_summary", "")
            if risk_summary and risk_summary not in seen_summaries:
                seen_summaries.add(risk_summary)
                entry_icon = icon_map.get(entry.get("risk_level", "UNKNOWN"), "\u2753")
                summary_bullets.append(f"- {entry_icon} {risk_summary}")
        if summary_bullets:
            lines.extend(["### Change Summary", ""])
            lines.extend(summary_bullets)
            lines.append("")

    # Group by severity
    groups: dict[str, list[dict]] = {}
    for entry in failures:
        level = entry.get("risk_level", "UNKNOWN")
        groups.setdefault(level, []).append(entry)

    # All baseline details are collapsed
    lines.extend([
        "<details><summary><b>Baseline Details</b></summary>",
        "",
    ])

    for level in ["BLOCKING", "HIGH", "MEDIUM", "UNKNOWN", "LOW"]:
        entries_in_group = groups.get(level, [])
        if not entries_in_group:
            continue

        # Sort entries so multi-stack baselines from the same config are grouped,
        # with the main stack (shorter name) first and associated stacks after.
        entries_in_group.sort(key=lambda e: (e.get("module", ""), len(e.get("config", "")), e.get("config", "")))

        icon = icon_map.get(level, "\u2753")
        count = len(entries_in_group)

        lines.extend([
            f"#### {icon} {level} ({count})",
            "",
        ])

        for entry in entries_in_group:
            module_key = f"{entry['module']}/{entry['config']}"
            entry_icon = icon_map.get(entry.get("risk_level", "UNKNOWN"), "\u2753")
            cdk_diff = entry.get("cdk_diff", "")

            lines.extend([
                f"##### {entry_icon} `{module_key}`",
                "",
            ])

            risk_summary = entry.get("risk_summary", "")
            if risk_summary:
                lines.extend([risk_summary, ""])

            lines.extend([
                "<details><summary>CDK Diff</summary>",
                "",
                "```diff",
                cdk_diff,
                "```",
                "",
                "</details>",
                "",
            ])

    lines.extend([
        "</details>",
        "",
        "_All baselines have individual review threads grouped by root cause and positioned "
        "on the source line of code. Baselines with unknown root causes have their own threads. "
        "Resolve each thread to acknowledge the change._",
    ])

    return "\n".join(lines)


def _find_summary_note(notes: list[dict]) -> dict | None:
    """Find the existing summary plain note."""
    for note in notes:
        if SUMMARY_MARKER in note.get("body", ""):
            return note
    return None


def _post_summary_thread(
    failures: list[dict],
    project_id: str,
    mr_iid: str,
    token: str,
    discussions: list[dict],
) -> None:
    """Post or update the summary as a plain MR comment.

    Checks for legacy discussion-based summaries first (edits in place).
    Otherwise creates/updates a plain note.
    """
    from review.lib.gitlab_threads import get_mr_notes, create_mr_note, edit_mr_note

    body = _format_summary_body(failures)

    # Check for existing plain note
    notes = get_mr_notes(project_id, mr_iid, token)
    existing_note = _find_summary_note(notes)

    if existing_note is None:
        print("  Creating summary note...")
        create_mr_note(project_id, mr_iid, token, body)
    else:
        print("  Updating summary note...")
        note_id = str(existing_note.get("id", ""))
        edit_mr_note(project_id, mr_iid, note_id, token, body)


def main() -> None:
    parser = argparse.ArgumentParser(description="Post baseline review MR threads")
    parser.add_argument(
        "--report",
        default="baseline-review/report.json",
        help="Path to baseline review report JSON",
    )
    args = parser.parse_args()

    # Validate required environment variables
    token = os.environ.get("PROJECT_ACCESS_TOKEN")
    if not token:
        print("PROJECT_ACCESS_TOKEN not set, skipping MR thread posting.")
        return

    mr_iid = os.environ.get("CI_MERGE_REQUEST_IID")
    if not mr_iid:
        print("CI_MERGE_REQUEST_IID not set (not an MR pipeline), skipping.")
        return

    project_id = os.environ["CI_PROJECT_ID"]

    # Load report
    report_path = args.report
    if not os.path.isfile(report_path):
        print(f"Report file not found: {report_path}, skipping.")
        return

    with open(report_path) as f:
        entries = json.load(f)

    # Filter to only failures
    failures = [
        e for e in entries
        if e["change_type"] in ("modified", "missing_baseline")
    ]

    if not failures:
        print("No baseline failures to report.")
        return

    print(f"Processing {len(failures)} baseline failure(s)...")

    # Sort: BLOCKING first, then HIGH, then others — so blocking threads are created first
    risk_order = {"BLOCKING": 0, "HIGH": 1, "MEDIUM": 2, "UNKNOWN": 3, "LOW": 4}
    failures.sort(key=lambda e: risk_order.get(e.get("risk_level", "UNKNOWN"), 3))

    # Fetch existing MR discussions once
    discussions = get_mr_discussions(project_id, mr_iid, token)

    # Post or update summary thread first
    _post_summary_thread(failures, project_id, mr_iid, token, discussions)

    # Build root cause groups from structured findings across all baselines
    root_cause_groups = _build_root_cause_groups(failures)

    if not root_cause_groups:
        print("  No non-LOW root causes to post threads for.")
    else:
        # Sort: BLOCKING first, then HIGH, then MEDIUM
        risk_order = {"BLOCKING": 0, "HIGH": 1, "MEDIUM": 2, "UNKNOWN": 3, "LOW": 4}
        sorted_sources = sorted(
            root_cause_groups.keys(),
            key=lambda s: risk_order.get(root_cause_groups[s]["risk_level"], 2),
        )

        # Re-fetch discussions after summary thread was posted
        discussions = get_mr_discussions(project_id, mr_iid, token)

        for source in sorted_sources:
            group = root_cause_groups[source]
            risk_level = group["risk_level"]

            # Compute hash from structural parts only (source, resource, risk) —
            # excludes prose descriptions which vary between Kiro runs
            structural = [
                (bk, f.get("source", ""), f.get("resource", ""), f.get("risk", ""))
                for bk, f in group["findings"]
            ]
            content_hash = compute_hash(json.dumps(sorted(structural), sort_keys=True))
            current_source_hash = group.get("source_hash", "")

            existing, existing_hash, first_note_id, existing_source_hash = _find_existing_root_cause_thread(discussions, source)

            if existing is None:
                print(f"  Creating root cause thread for '{source}' (risk: {risk_level})")
                body = _format_root_cause_body(source, group, content_hash)
                if current_source_hash:
                    body += f"\n<!-- source-hash:{current_source_hash} -->"
                # Try to position the thread on the source line in the MR diff
                display_source = group.get("source", source)
                parsed = _parse_source_position(display_source)
                position = _build_diff_position(*parsed) if parsed else None
                create_discussion(project_id, mr_iid, token, body, position=position)

            elif existing_hash == content_hash:
                print(f"  Root cause thread for '{source}' unchanged, skipping")

            elif current_source_hash and existing_source_hash == current_source_hash:
                print(f"  Root cause thread for '{source}' source unchanged, skipping (Kiro variance)")

            else:
                print(f"  Updating root cause thread for '{source}' (findings changed, risk: {risk_level})")
                body = _format_root_cause_body(source, group, content_hash, is_update=True)
                if current_source_hash:
                    body += f"\n<!-- source-hash:{current_source_hash} -->"
                discussion_id = existing["id"]
                if first_note_id:
                    # Edit the existing note in place instead of adding a new one
                    edit_note(project_id, mr_iid, discussion_id, first_note_id, token, body)
                else:
                    add_note_to_discussion(project_id, mr_iid, discussion_id, token, body)
                # Unresolve the thread so it requires re-acknowledgment
                resolve_discussion(project_id, mr_iid, discussion_id, token, resolved=False)

    # Fall back to per-baseline threads for entries without structured findings
    entries_without_findings = [
        e for e in failures
        if not e.get("findings") and e.get("risk_level", "UNKNOWN") not in ("LOW",)
    ]
    # Only post per-baseline fallback if there are no root cause threads covering them
    if entries_without_findings and not root_cause_groups:
        print(f"\n  Falling back to per-baseline threads for {len(entries_without_findings)} entries...")
        for entry in entries_without_findings:
            module_key = f"{entry['module']}/{entry['config']}"
            diff_hash = compute_hash(entry["cdk_diff"])
            risk_level = entry.get("risk_level", "UNKNOWN")
            current_source_hash = entry.get("source_hash", "")

            existing, existing_hash, existing_source_hash = find_existing_thread(discussions, module_key)

            if existing is None:
                print(f"  Creating thread for {module_key} (risk: {risk_level})")
                body = format_thread_body(entry, diff_hash)
                if current_source_hash:
                    body += f"\n<!-- source-hash:{current_source_hash} -->"
                create_discussion(project_id, mr_iid, token, body)
            elif existing_hash == diff_hash:
                print(f"  Thread for {module_key} unchanged, skipping")
            elif current_source_hash and existing_source_hash == current_source_hash:
                print(f"  Thread for {module_key} source unchanged, skipping (Kiro variance)")
            else:
                print(f"  Updating thread for {module_key} (diff changed, risk: {risk_level})")
                body = format_thread_body(entry, diff_hash, is_update=True)
                if current_source_hash:
                    body += f"\n<!-- source-hash:{current_source_hash} -->"
                discussion_id = existing["id"]
                add_note_to_discussion(project_id, mr_iid, discussion_id, token, body)
                resolve_discussion(project_id, mr_iid, discussion_id, token, resolved=False)

    # Collect current keys for orphan resolution
    current_root_causes = set(root_cause_groups.keys()) if root_cause_groups else set()
    current_module_keys = set(
        f"{e['module']}/{e['config']}" for e in entries_without_findings
    ) if entries_without_findings and not root_cause_groups else set()

    # Build source hash map for orphan resolution
    source_hashes: dict[str, str] = {}
    for source, group in (root_cause_groups or {}).items():
        sh = group.get("source_hash", "")
        if sh:
            source_hashes[source] = sh
    if entries_without_findings and not root_cause_groups:
        for e in entries_without_findings:
            mk = f"{e['module']}/{e['config']}"
            sh = e.get("source_hash", "")
            if sh:
                source_hashes[mk] = sh

    # Auto-resolve orphaned threads
    _resolve_orphaned_threads(project_id, mr_iid, token, current_root_causes, current_module_keys, source_hashes)

    # Check for unresolved threads — exit non-zero to block merge
    if _check_unresolved_threads(project_id, mr_iid, token):
        sys.exit(1)

    print("Done.")


def _resolve_orphaned_threads(
    project_id: str,
    mr_iid: str,
    token: str,
    current_root_causes: set[str],
    current_module_keys: set[str],
    source_hashes: dict[str, str] | None = None,
) -> None:
    """Auto-resolve baseline threads whose findings no longer exist.

    If source_hashes is provided, only orphan-resolve threads whose source
    files actually changed. If source is unchanged but finding disappeared,
    it's likely Kiro variance — leave the thread alone.
    """
    discussions = get_mr_discussions(project_id, mr_iid, token)
    for discussion in discussions:
        notes = discussion.get("notes", [])
        if not notes:
            continue
        first_body = notes[0].get("body", "")

        # Check root cause threads
        rc_match = ROOTCAUSE_PATTERN.search(first_body)
        if rc_match and rc_match.group(1) not in current_root_causes:
            orphan_key = rc_match.group(1)
            # Check source hash before orphan-resolving
            if source_hashes:
                stored_sh = None
                for note in notes:
                    sm = SOURCE_HASH_PATTERN.search(note.get("body", ""))
                    if sm:
                        stored_sh = sm.group(1)
                # Check against this specific orphan's package, not all packages
                current_sh = source_hashes.get(orphan_key, "")
                if stored_sh and current_sh and stored_sh == current_sh:
                    print(f"  Root cause thread for '{orphan_key}' not in findings but source unchanged, keeping")
                    continue

            print(f"  Auto-resolving orphaned root cause thread for '{orphan_key}'")
            add_note_to_discussion(
                project_id, mr_iid, discussion["id"], token,
                "_This finding was resolved by code changes. Thread auto-resolved._",
            )
            resolve_discussion(project_id, mr_iid, discussion["id"], token, resolved=True)
            continue

        # Check per-baseline fallback threads
        mod_match = MODULE_PATTERN.search(first_body)
        if mod_match and mod_match.group(1) not in current_module_keys:
            orphan_key = mod_match.group(1)
            if source_hashes:
                stored_sh = None
                for note in notes:
                    sm = SOURCE_HASH_PATTERN.search(note.get("body", ""))
                    if sm:
                        stored_sh = sm.group(1)
                current_sh = source_hashes.get(orphan_key, "")
                if stored_sh and current_sh and stored_sh == current_sh:
                    print(f"  Thread for '{orphan_key}' not in findings but source unchanged, keeping")
                    continue

            print(f"  Auto-resolving orphaned baseline thread for '{orphan_key}'")
            add_note_to_discussion(
                project_id, mr_iid, discussion["id"], token,
                "_This finding was resolved by code changes. Thread auto-resolved._",
            )
            resolve_discussion(project_id, mr_iid, discussion["id"], token, resolved=True)


def _check_unresolved_threads(project_id: str, mr_iid: str, token: str) -> bool:
    """Check if any baseline detail threads are unresolved."""
    discussions = get_mr_discussions(project_id, mr_iid, token)
    unresolved = 0
    for discussion in discussions:
        notes = discussion.get("notes", [])
        if not notes:
            continue
        first_body = notes[0].get("body", "")
        # Check both root cause and per-baseline threads
        if ROOTCAUSE_PATTERN.search(first_body) or MODULE_PATTERN.search(first_body):
            if not all(n.get("resolved", True) for n in notes if n.get("resolvable", False)):
                unresolved += 1
    if unresolved > 0:
        print("\n" + "=" * 70)
        print("REVIEW AGENT FAILURE: Unresolved baseline review threads")
        print("=" * 70)
        print(f"\n{unresolved} unresolved Infrastructure Risk thread(s) found.")
        print("Resolve all threads in the MR, then rerun `feature_merge_baseline_review`.")
        print("\n" + "=" * 70)
        return True
    return False


if __name__ == "__main__":
    main()

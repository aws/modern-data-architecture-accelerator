#!/usr/bin/env python3
"""
Post baseline review results as resolvable MR discussion threads.

For each baseline failure (modified or missing_baseline), this script:
  1. Checks if a discussion thread already exists for that package
  2. If the diff hasn't changed (same hash), leaves the thread as-is
  3. If the diff changed, adds a new comment with the updated diff and reopens the thread
  4. If no thread exists, creates a new resolvable discussion

Threads that were resolved stay resolved as long as the diff doesn't change.
When the diff changes, the thread is reopened so the reviewer must re-acknowledge.

Requires environment variables:
  CI_API_V4_URL        - GitLab API base URL (set automatically by GitLab CI)
  CI_PROJECT_ID        - Project ID (set automatically by GitLab CI)
  CI_MERGE_REQUEST_IID - MR IID (set automatically by GitLab CI)
  PROJECT_ACCESS_TOKEN - GitLab project access token for MR discussion threads

Usage:
  python3 scripts/quality/post_baseline_threads.py [--report baseline-review/report.json]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.request
from typing import Any

HASH_PATTERN = re.compile(r"<!-- baseline-hash:(\w+) -->")
MODULE_PATTERN = re.compile(r"<!-- baseline-module:(.+?) -->")


def gitlab_api(
    method: str,
    path: str,
    token: str,
    data: dict | None = None,
) -> Any:
    """Make a GitLab API request using urllib."""
    url = f"{os.environ['CI_API_V4_URL']}{path}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("PRIVATE-TOKEN", token)
    if body:
        req.add_header("Content-Type", "application/json")

    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        print(f"  API error {e.code}: {e.read().decode()}", file=sys.stderr)
        raise


def get_mr_discussions(project_id: str, mr_iid: str, token: str) -> list[dict]:
    """Fetch all discussions on the MR, handling pagination."""
    discussions: list[dict] = []
    page = 1
    while True:
        path = (
            f"/projects/{project_id}/merge_requests/{mr_iid}"
            f"/discussions?per_page=100&page={page}"
        )
        batch = gitlab_api("GET", path, token)
        if not batch:
            break
        discussions.extend(batch)
        page += 1
    return discussions


def compute_hash(content: str) -> str:
    """Compute a short hash of the diff content."""
    return hashlib.sha256(content.encode()).hexdigest()[:12]


def find_existing_thread(
    discussions: list[dict],
    module_key: str,
) -> tuple[dict | None, str | None]:
    """Find an existing baseline thread for a given module key.

    Returns (discussion, existing_hash) or (None, None).
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
            for note in notes:
                hash_match = HASH_PATTERN.search(note.get("body", ""))
                if hash_match:
                    latest_hash = hash_match.group(1)
            return discussion, latest_hash
    return None, None


def _filter_safe_findings(risk_assessment: str) -> str:
    """Remove SAFE finding tables from the risk assessment text."""
    filtered_lines = []
    skip_table = False
    for line in risk_assessment.split("\n"):
        if "| **Risk**" in line and "SAFE" in line:
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
    import re
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
    risk_icon = {"BLOCKING": "\u274c", "HIGH": "\u26a0\ufe0f"}.get(risk_level, "\u2753")

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


def create_discussion(
    project_id: str,
    mr_iid: str,
    token: str,
    body: str,
) -> None:
    """Create a new resolvable discussion thread on the MR."""
    path = f"/projects/{project_id}/merge_requests/{mr_iid}/discussions"
    gitlab_api("POST", path, token, {"body": body})


def add_note_to_discussion(
    project_id: str,
    mr_iid: str,
    discussion_id: str,
    token: str,
    body: str,
) -> None:
    """Add a reply to an existing discussion thread."""
    path = (
        f"/projects/{project_id}/merge_requests/{mr_iid}"
        f"/discussions/{discussion_id}/notes"
    )
    gitlab_api("POST", path, token, {"body": body})


def resolve_discussion(
    project_id: str,
    mr_iid: str,
    discussion_id: str,
    token: str,
    resolved: bool,
) -> None:
    """Resolve or unresolve a discussion thread."""
    path = (
        f"/projects/{project_id}/merge_requests/{mr_iid}"
        f"/discussions/{discussion_id}"
    )
    gitlab_api("PUT", path, token, {"resolved": resolved})


def _extract_short_summary(risk_assessment: str) -> str:
    """Extract a short summary from the risk assessment for the summary table."""
    if not risk_assessment or risk_assessment.startswith("("):
        return "—"
    for line in risk_assessment.split("\n"):
        stripped = line.strip()
        # Skip the Overall Risk line, empty lines, and table lines
        if not stripped or stripped.startswith("|") or stripped.startswith("**Overall Risk"):
            continue
        # Truncate to ~100 chars for table readability
        if len(stripped) > 100:
            return stripped[:97] + "..."
        return stripped
    return "—"


SUMMARY_MARKER = "<!-- baseline-summary -->"


def _format_summary_body(failures: list[dict]) -> str:
    """Format the summary thread body."""
    risk_counts = {}
    for entry in failures:
        level = entry.get("risk_level", "UNKNOWN")
        risk_counts[level] = risk_counts.get(level, 0) + 1

    total = len(failures)
    breakdown_parts = []
    for level in ["BLOCKING", "HIGH", "SAFE", "UNKNOWN"]:
        count = risk_counts.get(level, 0)
        if count:
            breakdown_parts.append(f"{count} {level}")

    risk_icon = {"BLOCKING": "\u274c", "HIGH": "\u26a0\ufe0f"}.get
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

    icon_map = {"BLOCKING": "\u274c", "HIGH": "\u26a0\ufe0f", "SAFE": "\u2705", "UNKNOWN": "\u2753"}
    risk_order = {"BLOCKING": 0, "HIGH": 1, "UNKNOWN": 2, "SAFE": 3}
    sorted_failures = sorted(failures, key=lambda e: risk_order.get(e.get("risk_level", "UNKNOWN"), 2))

    # Group by severity
    groups: dict[str, list[dict]] = {}
    for entry in sorted_failures:
        level = entry.get("risk_level", "UNKNOWN")
        groups.setdefault(level, []).append(entry)

    for level in ["BLOCKING", "HIGH", "UNKNOWN", "SAFE"]:
        entries_in_group = groups.get(level, [])
        if not entries_in_group:
            continue

        icon = icon_map.get(level, "\u2753")
        count = len(entries_in_group)
        # BLOCKING and HIGH open by default, SAFE collapsed
        if level in ("BLOCKING", "HIGH"):
            lines.append(f"### {icon} {level} ({count})")
            lines.append("")
        else:
            lines.append(f"<details><summary><b>{icon} {level} ({count})</b></summary>")
            lines.append("")

        for entry in entries_in_group:
            module_key = f"{entry['module']}/{entry['config']}"
            assessment = entry.get("risk_assessment", "")
            summary, _ = _split_assessment(_filter_safe_findings(assessment)) if assessment else ("", "")
            summary_text = summary or "\u2014"

            lines.extend([
                "| | |",
                "|---|---|",
                f"| **Baseline** | `{module_key}` |",
                "",
                summary_text,
                "",
            ])

        if level not in ("BLOCKING", "HIGH"):
            lines.append("</details>")
            lines.append("")

    lines.extend([
        "",
        "_SAFE baselines have no review threads. BLOCKING and HIGH baselines have individual threads below._",
    ])

    return "\n".join(lines)


def _find_summary_thread(discussions: list[dict]) -> dict | None:
    """Find the existing summary thread."""
    for discussion in discussions:
        notes = discussion.get("notes", [])
        if notes and SUMMARY_MARKER in notes[0].get("body", ""):
            return discussion
    return None


def _post_summary_thread(
    failures: list[dict],
    project_id: str,
    mr_iid: str,
    token: str,
    discussions: list[dict],
) -> None:
    """Post or update the summary thread, then resolve it."""
    body = _format_summary_body(failures)
    existing = _find_summary_thread(discussions)

    if existing is None:
        print("  Creating summary thread...")
        create_discussion(project_id, mr_iid, token, body)
        # Resolve it — re-fetch to get the new thread's ID
        updated = get_mr_discussions(project_id, mr_iid, token)
        summary = _find_summary_thread(updated)
        if summary:
            resolve_discussion(project_id, mr_iid, summary["id"], token, resolved=True)
    else:
        # Update if content changed
        old_body = existing.get("notes", [{}])[0].get("body", "")
        if old_body.strip() != body.strip():
            print("  Updating summary thread...")
            discussion_id = existing["id"]
            add_note_to_discussion(project_id, mr_iid, discussion_id, token, body)
            resolve_discussion(project_id, mr_iid, discussion_id, token, resolved=True)
        else:
            print("  Summary thread unchanged, skipping")


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
    risk_order = {"BLOCKING": 0, "HIGH": 1, "UNKNOWN": 2, "SAFE": 3}
    failures.sort(key=lambda e: risk_order.get(e.get("risk_level", "UNKNOWN"), 2))

    # Fetch existing MR discussions once
    discussions = get_mr_discussions(project_id, mr_iid, token)

    # Post or update summary thread first
    _post_summary_thread(failures, project_id, mr_iid, token, discussions)

    for entry in failures:
        module_key = f"{entry['module']}/{entry['config']}"
        diff_hash = compute_hash(entry["cdk_diff"])
        risk_level = entry.get("risk_level", "UNKNOWN")

        # Skip SAFE diffs entirely — no thread needed
        if risk_level == "SAFE":
            print(f"  Skipping SAFE diff for {module_key}")
            continue

        existing, existing_hash = find_existing_thread(discussions, module_key)

        if existing is None:
            print(f"  Creating thread for {module_key} (risk: {risk_level})")
            body = format_thread_body(entry, diff_hash)
            create_discussion(project_id, mr_iid, token, body)

        elif existing_hash == diff_hash:
            print(f"  Thread for {module_key} unchanged, skipping")

        else:
            print(f"  Updating thread for {module_key} (diff changed, risk: {risk_level})")
            body = format_thread_body(entry, diff_hash, is_update=True)
            discussion_id = existing["id"]
            add_note_to_discussion(project_id, mr_iid, discussion_id, token, body)
            resolve_discussion(project_id, mr_iid, discussion_id, token, resolved=False)

    print("Done.")


if __name__ == "__main__":
    main()

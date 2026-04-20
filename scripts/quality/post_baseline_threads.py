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


def format_thread_body(entry: dict, diff_hash: str, is_update: bool = False) -> str:
    """Format the discussion thread body."""
    module_key = f"{entry['module']}/{entry['config']}"
    change_label = (
        "Baseline changed" if entry["change_type"] == "modified"
        else "Missing baseline coverage"
    )

    prefix = "### \u26a0\ufe0f Updated: " if is_update else "### \u26a0\ufe0f "

    lines = [
        f"<!-- baseline-module:{module_key} -->",
        f"<!-- baseline-hash:{diff_hash} -->",
        f"{prefix}{change_label}: `{module_key}`",
        "",
        f"**Type:** `{entry['change_type']}`",
        f"**File:** `{entry['file']}`",
        "",
        "```diff",
        entry["cdk_diff"],
        "```",
        "",
    ]

    if is_update:
        lines.append("_Baseline diff has changed since last review. Please re-acknowledge._")
    else:
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

    # Fetch existing MR discussions once
    discussions = get_mr_discussions(project_id, mr_iid, token)

    for entry in failures:
        module_key = f"{entry['module']}/{entry['config']}"
        diff_hash = compute_hash(entry["cdk_diff"])

        existing, existing_hash = find_existing_thread(discussions, module_key)

        if existing is None:
            # No existing thread — create a new one
            print(f"  Creating thread for {module_key}")
            body = format_thread_body(entry, diff_hash)
            create_discussion(project_id, mr_iid, token, body)

        elif existing_hash == diff_hash:
            # Thread exists and diff hasn't changed — leave it alone
            print(f"  Thread for {module_key} unchanged, skipping")

        else:
            # Thread exists but diff changed — add comment and reopen
            print(f"  Updating thread for {module_key} (diff changed)")
            body = format_thread_body(entry, diff_hash, is_update=True)
            discussion_id = existing["id"]
            add_note_to_discussion(project_id, mr_iid, discussion_id, token, body)
            resolve_discussion(project_id, mr_iid, discussion_id, token, resolved=False)

    print("Done.")


if __name__ == "__main__":
    main()

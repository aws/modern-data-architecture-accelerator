"""
Shared GitLab API helpers — thread CRUD, discussion management, and diff positioning.

Extracted from scripts/quality/post_baseline_threads.py for reuse across review tools.
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from typing import Any


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


def get_mr_notes(project_id: str, mr_iid: str, token: str) -> list[dict]:
    """Fetch all notes (comments) on the MR, handling pagination."""
    notes: list[dict] = []
    page = 1
    while True:
        path = (
            f"/projects/{project_id}/merge_requests/{mr_iid}"
            f"/notes?per_page=100&page={page}"
        )
        batch = gitlab_api("GET", path, token)
        if not batch:
            break
        notes.extend(batch)
        page += 1
    return notes


def create_mr_note(project_id: str, mr_iid: str, token: str, body: str) -> dict:
    """Create a plain comment (note) on the MR. Returns the created note."""
    path = f"/projects/{project_id}/merge_requests/{mr_iid}/notes"
    return gitlab_api("POST", path, token, {"body": body})


def edit_mr_note(project_id: str, mr_iid: str, note_id: str, token: str, body: str) -> None:
    """Edit an existing plain note on the MR."""
    path = f"/projects/{project_id}/merge_requests/{mr_iid}/notes/{note_id}"
    gitlab_api("PUT", path, token, {"body": body})


def compute_hash(content: str) -> str:
    """Compute a short hash of the diff content."""
    return hashlib.sha256(content.encode()).hexdigest()[:12]


def create_discussion(
    project_id: str,
    mr_iid: str,
    token: str,
    body: str,
    position: dict | None = None,
) -> None:
    """Create a new resolvable discussion thread on the MR.

    If position is provided, creates an inline diff thread. Falls back to
    a general discussion if the positioned creation fails.
    """
    path = f"/projects/{project_id}/merge_requests/{mr_iid}/discussions"

    if position:
        try:
            gitlab_api("POST", path, token, {"body": body, "position": position})
            return
        except Exception:
            print("    Positioned thread failed, falling back to general discussion")

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


def edit_note(
    project_id: str,
    mr_iid: str,
    discussion_id: str,
    note_id: str,
    token: str,
    body: str,
) -> None:
    """Edit an existing note in a discussion thread."""
    path = (
        f"/projects/{project_id}/merge_requests/{mr_iid}"
        f"/discussions/{discussion_id}/notes/{note_id}"
    )
    gitlab_api("PUT", path, token, {"body": body})


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


def _parse_source_position(source: str) -> tuple[str, int] | None:
    """Parse a source attribution string into (file_path, line_number).

    Accepts formats like:
      - "path/to/file.ts:L42"
      - "path/to/file.ts:42"
      - "sample_configs/name.yaml"  (no line — returns None)
      - "Unknown - Please Investigate"  (returns None)
    """
    if not source or "Unknown" in source:
        return None
    match = re.match(r'^(.+?):L?(\d+)$', source)
    if match:
        return match.group(1), int(match.group(2))
    return None


def _build_diff_position(file_path: str, line: int) -> dict | None:
    """Build a GitLab diff position object for an inline thread.

    Parses the git diff to determine whether the target line is:
    - An addition (+): set new_line only
    - A deletion (-): set old_line only
    - A context line (unchanged): set both old_line and new_line

    GitLab requires both old_line and new_line for context lines to position
    the thread correctly on the diff view.
    """
    base_sha = os.environ.get("CI_MERGE_REQUEST_DIFF_BASE_SHA")
    head_sha = os.environ.get("CI_COMMIT_SHA")
    start_sha = base_sha

    if not base_sha or not head_sha:
        return None

    line_type = None  # "added", "deleted", "context", or None (not found)
    old_line_at_target = 0

    try:
        result = subprocess.run(
            ["git", "diff", f"{base_sha}...{head_sha}", "--", file_path],
            capture_output=True, text=True, timeout=10,
        )
        if result.returncode == 0:
            old_line_num = 0
            new_line_num = 0
            for diff_line in result.stdout.split("\n"):
                if diff_line.startswith("@@"):
                    hunk = re.match(r'^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@', diff_line)
                    if hunk:
                        old_line_num = int(hunk.group(1)) - 1
                        new_line_num = int(hunk.group(2)) - 1
                elif diff_line.startswith("-") and not diff_line.startswith("---"):
                    old_line_num += 1
                    if old_line_num == line:
                        line_type = "deleted"
                        break
                elif diff_line.startswith("+") and not diff_line.startswith("+++"):
                    new_line_num += 1
                    if new_line_num == line:
                        line_type = "added"
                        break
                elif not diff_line.startswith("\\"):
                    old_line_num += 1
                    new_line_num += 1
                    if new_line_num == line:
                        line_type = "context"
                        old_line_at_target = old_line_num
                        break
    except Exception as e:
        print(f"  Warning: diff position parsing failed for {file_path}:{line}: {e}", file=sys.stderr)

    # If line wasn't found in any hunk, we can't position it inline
    if line_type is None:
        return None

    position = {
        "base_sha": base_sha,
        "start_sha": start_sha,
        "head_sha": head_sha,
        "position_type": "text",
        "new_path": file_path,
        "old_path": file_path,
    }

    if line_type == "deleted":
        position["old_line"] = line
    elif line_type == "added":
        position["new_line"] = line
    else:
        # Context line: GitLab requires both old and new line numbers
        position["old_line"] = old_line_at_target
        position["new_line"] = line

    return position


def _mr_changes_link(source: str) -> str | None:
    """Build a GitLab MR changes page link for a source file:line reference.

    Returns a markdown link or None if the source can't be linked.
    """
    mr_iid = os.environ.get("CI_MERGE_REQUEST_IID")
    project_url = os.environ.get("CI_PROJECT_URL")
    if not mr_iid or not project_url:
        return None

    if source.startswith("Unknown") or source.startswith("("):
        return None

    # Parse file:Lnn format
    parts = source.split(":L")
    filepath = parts[0]
    line = parts[1] if len(parts) > 1 else None

    # GitLab MR diff anchor format
    anchor = hashlib.sha1(filepath.encode()).hexdigest()[:8]
    url = f"{project_url}/-/merge_requests/{mr_iid}/diffs#{anchor}"
    if line:
        url += f"_{line}"

    return url

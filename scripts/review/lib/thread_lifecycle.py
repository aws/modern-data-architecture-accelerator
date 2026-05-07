"""
Shared thread lifecycle management for review agents.

Handles the common pattern: post summary, create/update/skip detail threads,
auto-resolve orphans, check for unresolved threads, and exit non-zero if blocked.

Each agent provides its own marker pattern, thread formatter, and failure message.
This module handles the GitLab API interactions and lifecycle logic.
"""

from __future__ import annotations

import hashlib
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from review.lib.gitlab_threads import (
    get_mr_discussions,
    get_mr_notes,
    create_mr_note,
    edit_mr_note,
    create_discussion,
    add_note_to_discussion,
    edit_note,
    resolve_discussion,
)


class UnresolvedThreadsError(Exception):
    """Raised when unresolved review threads exist that block merge."""

    def __init__(self, threads: list[tuple[str, str]], agent_name: str, job_name: str):
        self.threads = threads
        self.agent_name = agent_name
        self.job_name = job_name
        super().__init__(
            f"{len(threads)} unresolved {agent_name} thread(s) blocking merge"
        )


# Pre-compiled patterns for thread marker extraction
# Negative lookahead excludes source-hash — only matches agent-specific hashes
# (e.g., compliance-hash, architecture-hash, baseline-hash)
_HASH_PATTERN = re.compile(r"<!-- (?!source-)[\w-]+-hash:(\w+) -->")
_SOURCE_HASH_PATTERN = re.compile(r"<!-- source-hash:(\w+) -->")


def _now() -> str:
    """Return current UTC timestamp string."""
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _steering_link(steering_file: str) -> str:
    """Build an absolute link to a steering file on the current branch.

    Uses CI_PROJECT_URL and CI_COMMIT_REF_NAME if available (GitLab CI).
    Falls back to a relative path outside CI.
    """
    project_url = os.environ.get("CI_PROJECT_URL", "")
    branch = os.environ.get("CI_COMMIT_REF_NAME", "main")
    if project_url:
        return f"{project_url}/-/blob/{branch}/.kiro/steering/{steering_file}"
    return f".kiro/steering/{steering_file}"


def compute_line_anchor(file_path: str, line_number: int) -> str:
    """Compute a stable anchor from the content of a specific line in a file.

    Returns file_path:hash_of_line_content (6 chars). This is stable across
    line number shifts caused by unrelated code changes above the finding.
    Falls back to file_path:line_number if the file or line can't be read.
    """
    if not line_number or line_number <= 0:
        return file_path

    try:
        full_path = Path(file_path)
        if not full_path.is_absolute():
            # Try relative to PROJECT_ROOT if available
            from review.lib.nx_graph import PROJECT_ROOT
            full_path = PROJECT_ROOT / file_path

        if full_path.is_file():
            lines = full_path.read_text().splitlines()
            if line_number <= len(lines):
                line_content = lines[line_number - 1].strip()
                if line_content:
                    content_hash = hashlib.sha256(line_content.encode()).hexdigest()[:6]
                    return f"{file_path}:{content_hash}"
    except Exception:
        pass

    # Fallback to line number if we can't read the file
    return f"{file_path}:{line_number}"


def compute_source_hash(package_root: str, extensions: list[str] | None = None) -> str:
    """Compute a deterministic hash of source files in a package directory.

    Hashes all .ts files (excluding .d.ts, .js, .js.map) in sorted order.
    Returns a 12-char hex digest. If the directory doesn't exist or has no
    matching files, returns an empty string.
    """
    if extensions is None:
        extensions = [".ts"]
    exclude_suffixes = (".d.ts", ".js", ".js.map")

    root = Path(package_root)
    if not root.is_dir():
        return ""

    hasher = hashlib.sha256()
    file_count = 0

    for ext in extensions:
        for f in sorted(root.rglob(f"*{ext}")):
            # Skip build outputs and node_modules
            if any(part == "node_modules" for part in f.parts):
                continue
            if str(f).endswith(exclude_suffixes):
                continue
            hasher.update(str(f.relative_to(root)).encode())
            hasher.update(f.read_bytes())
            file_count += 1

    if file_count == 0:
        return ""

    return hasher.hexdigest()[:12]


def _extract_markers(notes: list[dict]) -> tuple[str | None, str | None]:
    """Extract the latest structural hash and source hash from thread notes."""
    latest_hash = None
    latest_source_hash = None
    for note in notes:
        body = note.get("body", "")
        hm = _HASH_PATTERN.search(body)
        if hm:
            latest_hash = hm.group(1)
        sm = _SOURCE_HASH_PATTERN.search(body)
        if sm:
            latest_source_hash = sm.group(1)
    return latest_hash, latest_source_hash


def find_thread_by_marker(
    discussions: list[dict],
    pattern: re.Pattern,
    key: str,
) -> tuple[dict | None, str | None, str | None, str | None]:
    """Find an existing thread by its HTML comment marker.

    Returns (discussion, existing_hash, first_note_id, existing_source_hash)
    or (None, None, None, None).
    The structural hash and source hash are extracted from markers in the thread body.
    """
    for discussion in discussions:
        notes = discussion.get("notes", [])
        if not notes:
            continue
        first_body = notes[0].get("body", "")
        first_note_id = str(notes[0].get("id", ""))
        match = pattern.search(first_body)
        if match and match.group(1) == key:
            latest_hash, latest_source_hash = _extract_markers(notes)
            return discussion, latest_hash, first_note_id, latest_source_hash
    return None, None, None, None


def find_summary_note(notes: list[dict], summary_marker: str) -> dict | None:
    """Find an existing summary plain note by its marker string."""
    for note in notes:
        if summary_marker in note.get("body", ""):
            return note
    return None


def post_or_update_summary(
    project_id: str,
    mr_iid: str,
    token: str,
    discussions: list[dict],
    summary_marker: str,
    format_summary: Callable[[], str],
) -> list[dict]:
    """Post or update the summary as a plain MR comment.

    Returns refreshed discussions list after the operation.
    """
    body = format_summary()

    # Check for existing plain note
    notes = get_mr_notes(project_id, mr_iid, token)
    existing_note = find_summary_note(notes, summary_marker)

    if existing_note is None:
        create_mr_note(project_id, mr_iid, token, body)
    else:
        note_id = str(existing_note.get("id", ""))
        edit_mr_note(project_id, mr_iid, note_id, token, body)

    return get_mr_discussions(project_id, mr_iid, token)


def post_detail_threads(
    project_id: str,
    mr_iid: str,
    token: str,
    discussions: list[dict],
    thread_groups: dict[str, dict],
    detail_pattern: re.Pattern,
    format_thread: Callable[[str, dict, str, bool], str],
    compute_structural_hash: Callable[[str, dict], str],
    get_position: Callable[[str], dict | None] | None = None,
) -> set[str]:
    """Post/update/skip detail threads for each group.

    Returns the set of keys that were processed (for orphan resolution).

    Uses source-hash (hash of actual reviewed files) to determine if the
    underlying code changed. If source files are unchanged, skips the thread
    regardless of structural hash differences (Kiro variance).
    """
    processed_keys: set[str] = set()

    for key, group in thread_groups.items():
        processed_keys.add(key)
        content_hash = compute_structural_hash(key, group)
        current_source_hash = group.get("source_hash", "")

        existing, existing_hash, first_note_id, existing_source_hash = find_thread_by_marker(
            discussions, detail_pattern, key
        )

        if existing is None:
            risk_level = group.get("risk_level", "UNKNOWN")
            print(f"  Creating thread for '{key}' (severity: {risk_level})")
            body = format_thread(key, group, content_hash, False)
            if current_source_hash:
                body += f"\n<!-- source-hash:{current_source_hash} -->"
            position = get_position(key) if get_position else None
            create_discussion(project_id, mr_iid, token, body, position=position)

        elif existing_hash == content_hash:
            print(f"  Thread for '{key}' unchanged, skipping")

        elif current_source_hash and existing_source_hash == current_source_hash:
            # Source files unchanged — Kiro variance, not a real change
            print(f"  Thread for '{key}' source unchanged, skipping (Kiro variance)")

        else:
            risk_level = group.get("risk_level", "UNKNOWN")
            print(f"  Updating thread for '{key}' (findings changed, severity: {risk_level})")
            url = _discussion_url(mr_iid, first_note_id) if first_note_id else ""
            if url:
                print(f"    {url}")
            body = format_thread(key, group, content_hash, True)
            if current_source_hash:
                body += f"\n<!-- source-hash:{current_source_hash} -->"
            discussion_id = existing["id"]
            if first_note_id:
                edit_note(project_id, mr_iid, discussion_id, first_note_id, token, body)
            else:
                add_note_to_discussion(project_id, mr_iid, discussion_id, token, body)
            resolve_discussion(project_id, mr_iid, discussion_id, token, resolved=False)

    return processed_keys


def resolve_orphaned_threads(
    project_id: str,
    mr_iid: str,
    token: str,
    discussions: list[dict],
    detail_pattern: re.Pattern,
    current_keys: set[str],
    source_hashes: dict[str, str] | None = None,
) -> None:
    """Auto-resolve threads whose findings no longer exist.

    If source_hashes is provided, only orphan-resolve threads whose source
    files actually changed. If source is unchanged but finding disappeared,
    it's likely Kiro variance — leave the thread alone.
    """
    for discussion in discussions:
        notes = discussion.get("notes", [])
        if not notes:
            continue
        first_body = notes[0].get("body", "")
        match = detail_pattern.search(first_body)
        if match and match.group(1) not in current_keys:
            orphan_key = match.group(1)

            # If we have source hashes, check if source actually changed
            if source_hashes is not None:
                stored_source_hash = None
                for note in notes:
                    sm = _SOURCE_HASH_PATTERN.search(note.get("body", ""))
                    if sm:
                        stored_source_hash = sm.group(1)
                # Find the current source hash for this key's package
                current_sh = source_hashes.get(orphan_key, "")
                if stored_source_hash and current_sh and stored_source_hash == current_sh:
                    # Source unchanged — finding likely still exists, Kiro just missed it
                    print(f"  Thread for '{orphan_key}' not in findings but source unchanged, keeping")
                    continue

            print(f"  Auto-resolving orphaned thread for '{orphan_key}'")
            add_note_to_discussion(
                project_id, mr_iid, discussion["id"], token,
                "_This finding was resolved by code changes. Thread auto-resolved._",
            )
            resolve_discussion(project_id, mr_iid, discussion["id"], token, resolved=True)


def _discussion_url(mr_iid: str, note_id: str) -> str:
    """Build a direct URL to a discussion note in the MR."""
    project_url = os.environ.get("CI_PROJECT_URL", "")
    if project_url and note_id:
        return f"{project_url}/-/merge_requests/{mr_iid}#note_{note_id}"
    return ""


def check_unresolved_and_exit(
    project_id: str,
    mr_iid: str,
    token: str,
    detail_pattern: re.Pattern,
    agent_name: str,
    finding_type: str,
    job_name: str,
) -> None:
    """Check for unresolved threads and raise if any exist.

    Must be called after all thread operations are complete.
    Fetches fresh discussions to get current resolved state.
    Prints direct links to blocking threads in the job log.

    Raises:
        UnresolvedThreadsError: if any agent threads are unresolved.
    """
    discussions = get_mr_discussions(project_id, mr_iid, token)
    unresolved_threads: list[tuple[str, str]] = []  # (key, url)

    for discussion in discussions:
        notes = discussion.get("notes", [])
        if not notes:
            continue
        first_body = notes[0].get("body", "")
        match = detail_pattern.search(first_body)
        if match:
            if not all(n.get("resolved", True) for n in notes if n.get("resolvable", False)):
                note_id = str(notes[0].get("id", ""))
                url = _discussion_url(mr_iid, note_id)
                unresolved_threads.append((match.group(1), url))

    if unresolved_threads:
        print("\n" + "=" * 70)
        print(f"REVIEW AGENT FAILURE: Unresolved {agent_name} threads")
        print("=" * 70)
        print(f"\n{len(unresolved_threads)} unresolved {finding_type} thread(s) blocking merge:\n")
        for key, url in unresolved_threads:
            if url:
                print(f"  \u2022 {key}")
                print(f"    {url}")
            else:
                print(f"  \u2022 {key}")
        print(f"\nResolve all threads in the MR, then rerun `{job_name}`.")
        print("\n" + "=" * 70)
        raise UnresolvedThreadsError(unresolved_threads, agent_name, job_name)

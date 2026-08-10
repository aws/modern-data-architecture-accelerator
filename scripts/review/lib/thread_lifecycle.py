"""
Shared thread lifecycle management for review agents.

Handles the common pattern: post summary, create/update/skip detail threads,
auto-resolve orphans, check for unresolved threads, and exit non-zero if blocked.

Each agent provides its own marker pattern, thread formatter, and failure message.
This module handles the GitLab API interactions and lifecycle logic.
"""

from __future__ import annotations

import hashlib
import json
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
    compute_hash,
    _build_diff_position,
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


# Splits a string on inline code spans so we can escape prose but leave code
# untouched. Matches runs of backticks and the balanced span they open (GitLab /
# CommonMark: a span opened by N backticks closes at the next run of exactly N).
_CODE_SPAN_PATTERN = re.compile(r"(`+)(.*?)\1", re.DOTALL)


def escape_markdown_math(text: str) -> str:
    r"""Escape ``$`` in free-text prose so GitLab does not render it as KaTeX math.

    GitLab renders paired ``$...$`` as inline math and ``$$...$$`` as a math block.
    Review-finding ``detail`` text is dense with literal dollar signs (shell command
    substitution ``$(...)``, parameter expansion ``${...}``, variables ``$VAR``,
    values like ``$Factory``), so an even number of them silently turns the prose
    into garbled math. Escaping each ``$`` as ``\$`` renders it literally.

    Dollar signs inside inline code spans (`` `...` ``) are left untouched: GitLab
    already does not treat ``$`` as math inside code, and a backslash there would
    render literally (`` `\$(id)` ``), corrupting the code. Only the prose segments
    between code spans are escaped.
    """
    if "$" not in text:
        return text

    out: list[str] = []
    pos = 0
    for match in _CODE_SPAN_PATTERN.finditer(text):
        out.append(text[pos:match.start()].replace("$", r"\$"))
        out.append(match.group(0))  # code span verbatim
        pos = match.end()
    out.append(text[pos:].replace("$", r"\$"))
    return "".join(out)


def _steering_link(steering_file: str) -> str:
    """Build an absolute link to a canonical rule source on the current branch.

    Points to the canonical rule under agent_rules/
    rather than the projected .kiro/steering/ file (which is a thin wrapper
    containing only an include directive). Uses CI_PROJECT_URL and
    CI_COMMIT_REF_NAME if available (GitLab CI). Falls back to a relative path
    outside CI.
    """
    canonical_path = f"agent_rules/{steering_file}"
    project_url = os.environ.get("CI_PROJECT_URL", "")
    branch = os.environ.get("CI_COMMIT_REF_NAME", "main")
    if project_url:
        return f"{project_url}/-/blob/{branch}/{canonical_path}"
    return canonical_path


def _job_link() -> str:
    """Build a markdown link to the current CI job for retry instructions.

    Uses CI_JOB_URL and CI_JOB_NAME if available (GitLab CI).
    Falls back to just the job name as plain text outside CI.
    """
    job_url = os.environ.get("CI_JOB_URL", "")
    job_name = os.environ.get("CI_JOB_NAME", "")
    if job_url and job_name:
        return f"[`{job_name}`]({job_url})"
    if job_name:
        return f"`{job_name}`"
    return ""


def _action_context() -> str:
    """Build a context string linking to the job and commit that triggered this action.

    Returns markdown lines like:
      "job: [`review`](url)\ncommit: [`abc1234` — Fix bug](url)"
    or empty string outside CI. Uses markdown line breaks for separate lines.
    """
    job_url = os.environ.get("CI_JOB_URL", "")
    job_name = os.environ.get("CI_JOB_NAME", "")
    project_url = os.environ.get("CI_PROJECT_URL", "")
    commit_sha = os.environ.get("CI_COMMIT_SHA", "")
    commit_title = os.environ.get("CI_COMMIT_TITLE", "")

    parts = []
    if job_url and job_name:
        parts.append(f"job: [`{job_name}`]({job_url})")
    elif job_name:
        parts.append(f"job: `{job_name}`")

    if project_url and commit_sha:
        short_sha = commit_sha[:7]
        commit_url = f"{project_url}/-/commit/{commit_sha}"
        label = f"`{short_sha}`"
        if commit_title:
            # Truncate long commit messages
            title = commit_title[:60] + ("..." if len(commit_title) > 60 else "")
            label = f"`{short_sha}` — {title}"
        parts.append(f"commit: [{label}]({commit_url})")
    elif commit_sha:
        parts.append(f"commit: `{commit_sha[:7]}`")

    if parts:
        return "\\\n".join(parts)
    return ""


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


def compute_file_source_hash(file_path: str) -> str:
    """Compute a deterministic hash of a single file's content.

    Returns a 12-char hex digest. If the file doesn't exist or can't be read,
    returns an empty string. Path may be absolute or relative to PROJECT_ROOT.
    """
    try:
        full_path = Path(file_path)
        if not full_path.is_absolute():
            from review.lib.nx_graph import PROJECT_ROOT
            full_path = PROJECT_ROOT / file_path
        if not full_path.is_file():
            return ""
        return hashlib.sha256(full_path.read_bytes()).hexdigest()[:12]
    except Exception:
        return ""


def orphan_source_file(key: str) -> str:
    """Derive the source file path from a thread key (``file:chunk_hash``).

    Thread keys are ``file_path:content_hash`` (or a bare file path when no line
    anchor was available). The orphan-resolution safety net uses this to map a key
    back to the file whose content it should compare.
    """
    return key.rsplit(":", 1)[0] if ":" in key else key


def build_source_groups(entries: list[dict]) -> dict[str, dict]:
    """Group findings by stable chunk content hash across all packages.

    Key is ``file:chunk_content_hash`` when a per-chunk ``source_hash`` is
    available (from pre-parsed diff chunks). Falls back to a line-content hash via
    :func:`compute_line_anchor` for findings without one (e.g. findings in a
    full-source file that is not part of a diff chunk).

    Returns a dict keyed by the stable anchor string, each value containing:
      - ``source``: display string (``file:line``) for human readability
      - ``risk_level``: highest risk among findings in the group
      - ``findings``: list of ``(package_name, finding)`` tuples
      - ``source_hash``: per-file content hash (or package-level fallback) used by
        the orphan safety net to tell a genuine fix from LLM variance
    """
    risk_rank = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "UNKNOWN": 1}
    groups: dict[str, dict] = {}

    for entry in entries:
        pkg_name = entry.get("package", "unknown")
        pkg_source_hash = entry.get("source_hash", "")
        for finding in entry.get("findings", []):
            file_path = finding.get("file", "Unknown")
            line = finding.get("line", 0)
            finding_risk = finding.get("risk", "UNKNOWN").upper()
            finding_source_hash = finding.get("source_hash", "")

            display_source = f"{file_path}:{line}" if line else file_path

            if finding_source_hash:
                key = f"{file_path}:{finding_source_hash}"
            else:
                key = compute_line_anchor(file_path, line)

            # Per-file content hash so the orphan safety net can compare the file's
            # current content to what it was when the thread was written. Falls back
            # to the package-level hash if the file can't be read.
            effective_source_hash = compute_file_source_hash(file_path) or pkg_source_hash

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


def compute_structural_hash(key: str, group: dict) -> str:
    """Compute a structural hash for a finding group, excluding prose ``detail``.

    Only category/risk/file/line participate, so LLM re-wording of the same
    finding does not churn the hash (which would spuriously reopen a thread).
    """
    structural = sorted(
        (f.get("category", ""), f.get("risk", ""), f.get("file", ""), str(f.get("line", "")))
        for _, f in group["findings"]
    )
    return compute_hash(json.dumps(structural, sort_keys=True))


def make_get_position(groups: dict[str, dict]) -> Callable[[str], dict | None]:
    """Build a position callback that anchors a thread on its first finding's line."""
    def _get_pos(key: str) -> dict | None:
        group = groups.get(key)
        if group and group.get("findings"):
            _, first_finding = group["findings"][0]
            file_path = first_finding.get("file", "")
            line = first_finding.get("line", 0) or 0
            if file_path and line:
                return _build_diff_position(file_path, line)
        return None
    return _get_pos


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

    Groups are processed in decreasing order of severity so that the most
    critical threads appear first in the MR discussion list.
    """
    risk_rank = {"BLOCKING": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "UNKNOWN": 4}
    sorted_items = sorted(
        thread_groups.items(),
        key=lambda kv: (risk_rank.get(kv[1].get("risk_level", "UNKNOWN"), 4), kv[0]),
    )
    processed_keys: set[str] = set()

    for key, group in sorted_items:
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
            continue

        if _is_human_locked(existing):
            print(f"  Thread for '{key}' locked by reviewer, skipping")
            continue

        if existing_hash == content_hash:
            # Hash matches — check if thread was auto-resolved by a previous run
            # AND is currently resolved. If so, the finding reappeared and we should reopen.
            discussion_id = existing["id"]
            notes = existing.get("notes", [])
            is_currently_resolved = all(
                n.get("resolved", True) for n in notes if n.get("resolvable", False)
            )
            if is_currently_resolved and _was_auto_resolved(existing):
                print(f"  Reopening thread for '{key}' (finding reappeared after auto-resolve)")
                add_note_to_discussion(
                    project_id, mr_iid, discussion_id, token,
                    f"_Finding reappeared on re-run. Previous auto-resolve was premature. Thread reopened._ {_action_context()}",
                )
                resolve_discussion(project_id, mr_iid, discussion_id, token, resolved=False)
            else:
                print(f"  Thread for '{key}' unchanged, skipping")
            continue

        if current_source_hash and existing_source_hash == current_source_hash:
            # Source files unchanged — Kiro variance, not a real change
            print(f"  Thread for '{key}' source unchanged, skipping (Kiro variance)")
            continue

        # Findings drifted. Update the body so the latest text is visible, but
        # only unresolve when the thread is currently unresolved or was previously
        # auto-resolved by the bot. A deliberate human resolve survives drift.
        risk_level = group.get("risk_level", "UNKNOWN")
        url = _discussion_url(mr_iid, first_note_id) if first_note_id else ""
        body = format_thread(key, group, content_hash, True)
        if current_source_hash:
            body += f"\n<!-- source-hash:{current_source_hash} -->"
        discussion_id = existing["id"]
        notes = existing.get("notes", [])
        is_currently_resolved = all(
            n.get("resolved", True) for n in notes if n.get("resolvable", False)
        )

        if is_currently_resolved and not _was_auto_resolved(existing):
            print(f"  Thread for '{key}' human-resolved, preserving resolution (severity: {risk_level})")
            if url:
                print(f"    {url}")
            if first_note_id:
                edit_note(project_id, mr_iid, discussion_id, first_note_id, token, body)
            else:
                add_note_to_discussion(project_id, mr_iid, discussion_id, token, body)
            add_note_to_discussion(
                project_id, mr_iid, discussion_id, token,
                f"_Findings metadata updated since this thread was resolved. Resolved status preserved._ {_action_context()}",
            )
            continue

        print(f"  Updating thread for '{key}' (findings changed, severity: {risk_level})")
        if url:
            print(f"    {url}")
        if first_note_id:
            edit_note(project_id, mr_iid, discussion_id, first_note_id, token, body)
        else:
            add_note_to_discussion(project_id, mr_iid, discussion_id, token, body)

        if is_currently_resolved:
            # Thread was resolved (either auto-resolved or human-resolved that we
            # already handled above — this path is only reached for auto-resolved).
            # Unresolve and notify.
            add_note_to_discussion(
                project_id, mr_iid, discussion_id, token,
                f"_Findings have changed since last review. Thread reopened for re-acknowledgment._ {_action_context()}",
            )
            resolve_discussion(project_id, mr_iid, discussion_id, token, resolved=False)

    return processed_keys


def _file_unchanged_since(file_path: str, stored_hash: str | None) -> bool | None:
    """Whether file_path's current content still matches the hash on the thread.

    The thread records a file-content hash (the ``source-hash`` marker) when it
    is created or last updated. Comparing the file's current hash to that
    recorded value answers "has the finding's file changed since this thread was
    written?" purely from file content. This works in detached merge-request
    pipelines (where CI_COMMIT_BEFORE_SHA is all-zeros and a push range is
    unavailable) and on any re-run, because it depends on committed file content
    rather than the commit range that triggered the pipeline.

    Returns:
        True  - content unchanged: the finding cannot have been fixed, so a
                disappearance is LLM variance — keep the thread.
        False - content changed, or the file is gone (deleted): a fix is
                plausible — allow auto-resolve.
        None  - undetermined (no recorded hash on the thread): the caller should
                fall back to the source-hash map guard.
    """
    if not stored_hash:
        return None
    current = compute_file_source_hash(file_path)
    if not current:
        # File missing/unreadable (e.g. deleted in this MR) — treat as changed.
        return False
    return current == stored_hash


def resolve_orphaned_threads(
    project_id: str,
    mr_iid: str,
    token: str,
    discussions: list[dict],
    detail_pattern: re.Pattern,
    current_keys: set[str],
    source_hashes: dict[str, str] | None = None,
    source_file_resolver: Callable[[str], str | None] | None = None,
) -> None:
    """Auto-resolve threads whose findings no longer exist.

    A finding is only genuinely "resolved by code changes" if the source it
    points at actually changed. Two guards prevent falsely resolving a finding
    that merely disappeared due to LLM variance on an unrelated run:

    - source_file_resolver: maps a thread key to the finding's source file. When
      provided, the file's current content hash is compared to the source-hash
      recorded on the thread (_file_unchanged_since). If the file is unchanged
      since the thread was written, the thread is kept. This is content-based,
      so it works in detached merge-request pipelines (no push range needed) and
      is robust for source/file-keyed agents whose thread keys would otherwise
      not appear in source_hashes once orphaned.
    - source_hashes: {key: current_source_hash}. Fallback when the file check is
      undetermined, and the primary guard for package-keyed agents (whose keys
      remain present in the map even when a package reports no findings).
    """
    for discussion in discussions:
        notes = discussion.get("notes", [])
        if not notes:
            continue
        first_body = notes[0].get("body", "")
        match = detail_pattern.search(first_body)
        if match and match.group(1) not in current_keys:
            orphan_key = match.group(1)

            if _is_human_locked(discussion):
                print(f"  Thread for '{orphan_key}' locked by reviewer, skipping")
                continue

            # If the thread is already resolved and was NOT auto-resolved by the bot,
            # it was human-resolved. Don't touch it — human resolves are durable.
            resolvable_notes = [n for n in notes if n.get("resolvable", False)]
            is_currently_resolved = (
                len(resolvable_notes) > 0
                and all(n.get("resolved", False) for n in resolvable_notes)
            )
            if is_currently_resolved and not _was_auto_resolved(discussion):
                print(f"  Thread for '{orphan_key}' human-resolved, skipping orphan resolution")
                continue

            # Extract the source-hash this thread recorded when last written.
            stored_source_hash = None
            for note in notes:
                sm = _SOURCE_HASH_PATTERN.search(note.get("body", ""))
                if sm:
                    stored_source_hash = sm.group(1)

            # Primary guard: has the finding's file changed since the thread was
            # written? Content-based, so it works in detached MR pipelines where
            # no push range is available.
            if source_file_resolver is not None:
                finding_file = source_file_resolver(orphan_key)
                if finding_file:
                    unchanged = _file_unchanged_since(finding_file, stored_source_hash)
                    if unchanged is True:
                        print(f"  Thread for '{orphan_key}' file unchanged since last review, keeping (likely LLM variance)")
                        continue
                    # unchanged is False -> file changed, a fix is plausible; proceed
                    # unchanged is None  -> no recorded hash; fall back to source-hash map

            # Fallback guard (package-keyed agents): compare recorded vs current
            # source hash looked up by key.
            if source_hashes is not None:
                current_sh = source_hashes.get(orphan_key, "")
                if stored_source_hash and current_sh and stored_source_hash == current_sh:
                    # Source unchanged — finding likely still exists, Kiro just missed it
                    print(f"  Thread for '{orphan_key}' not in findings but source unchanged, keeping")
                    continue

            print(f"  Auto-resolving orphaned thread for '{orphan_key}'")
            add_note_to_discussion(
                project_id, mr_iid, discussion["id"], token,
                f"_This finding was resolved by code changes. Thread auto-resolved._ {_action_context()}",
            )
            resolve_discussion(project_id, mr_iid, discussion["id"], token, resolved=True)


def _discussion_url(mr_iid: str, note_id: str) -> str:
    """Build a direct URL to a discussion note in the MR."""
    project_url = os.environ.get("CI_PROJECT_URL", "")
    if project_url and note_id:
        return f"{project_url}/-/merge_requests/{mr_iid}#note_{note_id}"
    return ""


_AUTO_RESOLVE_MARKER = "Thread auto-resolved."
_LOCK_MARKER = "[review-bot:lock]"


def _format_thread_footer() -> str:
    """Format the standard thread footer with contributor/reviewer instructions."""
    job = _job_link()
    footer_lines = [
        "_Contributor: fix the issue, or reply explaining why a fix won't be made._",
        "_Reviewer: resolve this thread once addressed. Future re-runs preserve your resolution unless the underlying source file changes._",
        f"_Stuck in a reopen loop? Reply `{_LOCK_MARKER}` to suppress further reopens of this thread._",
    ]
    if job:
        footer_lines.append(f"_Rerun {job} to pass the pipeline._")
    return "\\\n".join(footer_lines)


def _was_auto_resolved(discussion: dict) -> bool:
    """Check if a thread was auto-resolved (not human-resolved).

    Looks for the auto-resolve marker in the thread's notes. If the last
    note containing a resolution action is the bot's auto-resolve comment,
    the thread was auto-resolved and should be reopened if the finding reappears.
    """
    notes = discussion.get("notes", [])
    # Walk notes in reverse to find the most recent resolution-related comment
    for note in reversed(notes):
        body = note.get("body", "")
        if _AUTO_RESOLVE_MARKER in body:
            return True
        # If we find a human comment (not the bot's auto-resolve), stop looking
        if body and _AUTO_RESOLVE_MARKER not in body and "<!-- " not in body:
            # This is likely a human comment — thread was human-resolved
            return False
    return False


def _is_human_locked(discussion: dict) -> bool:
    """Check whether a human reviewer has locked this thread against further reopens.

    A thread is locked if any non-bot note contains the literal `[review-bot:lock]`
    marker. The bot never emits this marker, so its presence is an unambiguous
    reviewer signal. Reviewers can release the lock by editing or deleting their
    lock comment.
    """
    notes = discussion.get("notes", [])
    for note in notes:
        body = note.get("body", "")
        if _LOCK_MARKER not in body:
            continue
        # Bot-authored notes always include either the auto-resolve marker or an
        # HTML comment marker. A note with the lock phrase that lacks both is
        # human-authored.
        if _AUTO_RESOLVE_MARKER in body or "<!-- " in body:
            continue
        return True
    return False


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

"""
Diff parser — splits unified diffs into structured chunks with pre-computed anchors.

Each chunk represents a single diff hunk with:
- A deterministic anchor line (first context line after the change, or EOF)
- A content hash (for stable thread identity across line shifts)
- The raw hunk text (for Kiro to read)

Usage:
    from review.lib.diff_parser import parse_diff_chunks

    chunks = parse_diff_chunks(git_diff_output)
    # Returns list of DiffChunk dicts ready to embed in Kiro prompts
"""

from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, asdict


# Matches unified diff file headers
_FILE_HEADER = re.compile(r"^diff --git a/(.+?) b/(.+?)$")
# Matches hunk headers: @@ -old_start,old_count +new_start,new_count @@ optional context
_HUNK_HEADER = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$")


@dataclass
class DiffChunk:
    """A single parsed diff hunk with pre-computed metadata."""

    id: str
    file: str
    anchor_line: int
    hunk_header: str
    content: str
    content_hash: str

    def to_dict(self) -> dict:
        return asdict(self)


def _compute_content_hash(file_path: str, content: str) -> str:
    """Hash file path + hunk content for stable thread identity.

    Includes file path so identical code in different files gets distinct hashes.
    Does NOT include line numbers — those shift with unrelated changes.
    """
    raw = f"{file_path}\n{content}"
    return hashlib.sha256(raw.encode()).hexdigest()[:12]


def _compute_anchor_line(new_start: int, hunk_lines: list[str]) -> int:
    """Compute the new-file line number of the first context line after the last change.

    Walks the hunk lines (excluding the @@ header) and tracks the new-file line counter.
    Context lines and + lines increment it. - lines do not.
    The anchor is the first context line after the last +/- line.

    If the hunk ends with no trailing context (change at EOF), returns the
    new-file line number of the last line in the hunk (the last + or context line).
    """
    new_line = new_start
    last_change_new_line = new_start
    anchor = None

    for line in hunk_lines:
        if line.startswith("+") and not line.startswith("+++"):
            last_change_new_line = new_line
            new_line += 1
            anchor = None  # Reset — we haven't seen a context line after this change yet
        elif line.startswith("-") and not line.startswith("---"):
            # Deletions don't increment new-file counter
            last_change_new_line = new_line  # Anchor should be at current new_line position
            anchor = None
        elif line.startswith("\\"):
            # "\ No newline at end of file" — skip
            continue
        else:
            # Context line
            if anchor is None:
                # First context line after the last change
                anchor = new_line
            new_line += 1

    # If no trailing context (change at EOF), use the last new-file line
    if anchor is None:
        anchor = last_change_new_line

    return anchor


def parse_diff_chunks(diff_text: str, max_chunks: int = 100) -> list[DiffChunk]:
    """Parse a unified diff into structured chunks.

    Args:
        diff_text: Output of `git diff` (unified format)
        max_chunks: Maximum number of chunks to return (truncate large diffs)

    Returns:
        List of DiffChunk objects, each representing one hunk with pre-computed
        anchor line and content hash.
    """
    if not diff_text or not diff_text.strip():
        return []

    chunks: list[DiffChunk] = []
    current_file: str = ""
    current_hunk_header: str = ""
    current_hunk_lines: list[str] = []
    current_new_start: int = 0
    in_hunk = False

    lines = diff_text.split("\n")

    def _flush_hunk() -> None:
        nonlocal current_hunk_lines, in_hunk
        if not current_hunk_lines or not current_file:
            current_hunk_lines = []
            in_hunk = False
            return

        content = "\n".join(current_hunk_lines)
        anchor = _compute_anchor_line(current_new_start, current_hunk_lines)
        content_hash = _compute_content_hash(current_file, content)

        chunks.append(DiffChunk(
            id=f"chunk-{len(chunks)}",
            file=current_file,
            anchor_line=anchor,
            hunk_header=current_hunk_header,
            content=content,
            content_hash=content_hash,
        ))

        current_hunk_lines = []
        in_hunk = False

    for line in lines:
        if len(chunks) >= max_chunks:
            break

        # New file header
        file_match = _FILE_HEADER.match(line)
        if file_match:
            _flush_hunk()
            current_file = file_match.group(2)  # Use the "b/" path (new file)
            continue

        # Hunk header
        hunk_match = _HUNK_HEADER.match(line)
        if hunk_match:
            _flush_hunk()
            current_new_start = int(hunk_match.group(3))
            current_hunk_header = line
            in_hunk = True
            continue

        # Skip --- and +++ lines
        if line.startswith("---") or line.startswith("+++"):
            continue

        # Accumulate hunk content
        if in_hunk:
            current_hunk_lines.append(line)

    # Flush final hunk
    _flush_hunk()

    return chunks


def format_chunks_for_prompt(chunks: list[DiffChunk]) -> str:
    """Format parsed chunks into the structured text block for Kiro prompts.

    Each chunk includes its ID, file, anchor line, and content hash as metadata
    that Kiro copies into findings without needing to compute anything.
    """
    if not chunks:
        return "(no code changes detected)"

    sections: list[str] = []

    for chunk in chunks:
        section = (
            f"--- {chunk.id} ---\n"
            f"File: {chunk.file}\n"
            f"Anchor: L{chunk.anchor_line}\n"
            f"Hash: {chunk.content_hash}\n"
            f"```diff\n"
            f"{chunk.hunk_header}\n"
            f"{chunk.content}\n"
            f"```"
        )
        sections.append(section)

    return "\n\n".join(sections)


def attach_source_hashes(findings: list[dict], code_chunks: list) -> None:
    """Attach chunk content hashes to findings for per-chunk source tracking."""
    chunk_by_anchor: dict[str, str] = {}
    for chunk in code_chunks:
        chunk_by_anchor[f"{chunk.file}:{chunk.anchor_line}"] = chunk.content_hash
    for finding in findings:
        file_path = finding.get("file", "")
        line = finding.get("line", 0)
        chunk_key = f"{file_path}:{line}"
        if chunk_key in chunk_by_anchor:
            finding["source_hash"] = chunk_by_anchor[chunk_key]


def format_chunk_index(chunks: list[DiffChunk]) -> str:
    """Format a lightweight index of chunks (metadata only, no full diff content).

    Used to give Kiro a manifest of available chunks so it can selectively
    read only the ones relevant to its investigation. Each entry shows the
    chunk ID, file, anchor, hash, and a one-line preview of the first changed line.
    """
    if not chunks:
        return "(no code changes detected)"

    lines: list[str] = []
    lines.append(f"Available code diff chunks ({len(chunks)} total):")
    lines.append("")

    for chunk in chunks:
        # Extract first meaningful changed line as preview
        preview = ""
        for content_line in chunk.content.split("\n"):
            if content_line.startswith("+") and not content_line.startswith("+++"):
                preview = content_line[:80]
                break
            if content_line.startswith("-") and not content_line.startswith("---"):
                preview = content_line[:80]
                break
        if not preview:
            # Fall back to first non-empty line
            for content_line in chunk.content.split("\n"):
                if content_line.strip():
                    preview = content_line[:80]
                    break

        lines.append(f"  {chunk.id}: {chunk.file}:L{chunk.anchor_line} (Hash: {chunk.content_hash})")
        if preview:
            lines.append(f"    Preview: {preview}")

    return "\n".join(lines)

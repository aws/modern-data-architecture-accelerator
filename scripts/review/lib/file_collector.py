"""
Generic file collection utility for review agents.

Provides a reusable pattern for globbing files, reading their content,
and truncating to a character budget.
"""

from __future__ import annotations

from pathlib import Path

from review.lib.nx_graph import PROJECT_ROOT


def collect_files(
    directory: Path,
    glob_pattern: str,
    max_chars: int,
    empty_message: str = "(no files found)",
    limit: int | None = None,
) -> str:
    """Glob files in a directory, read their content, and concatenate with truncation.

    Each file is formatted as:
        --- relative/path ---
        <content>

    Args:
        directory: Absolute path to the directory to search.
        glob_pattern: Glob pattern to match files (e.g. "**/*.ts", "*.yaml").
        max_chars: Maximum total characters before truncation.
        empty_message: Message to return if no files match or directory doesn't exist.
        limit: Optional max number of files to read.

    Returns:
        Concatenated file contents, or empty_message if no files match.
    """
    if not directory.is_dir():
        return empty_message

    files = sorted(directory.glob(glob_pattern))
    if limit is not None:
        files = files[:limit]

    parts: list[str] = []
    total = 0
    for f in files:
        rel = f.relative_to(PROJECT_ROOT)
        content = f.read_text()
        section = f"--- {rel} ---\n{content}\n"
        if max_chars > 0 and total + len(section) > max_chars:
            parts.append("\n... (truncated)")
            break
        parts.append(section)
        total += len(section)

    return "\n".join(parts) if parts else empty_message

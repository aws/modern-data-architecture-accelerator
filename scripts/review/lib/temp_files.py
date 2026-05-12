"""
Temporary file management for review agents.

Provides a context manager for writing content to temp files that Kiro
reads on demand, with automatic cleanup.
"""
from __future__ import annotations

import os
import tempfile
from contextlib import contextmanager
from pathlib import Path
from typing import Generator


@contextmanager
def temp_review_files(
    files: dict[str, str],
    prefix: str = "review-",
    directory: str | Path = "",
) -> Generator[dict[str, str], None, None]:
    """Write content to temp files and yield their paths. Cleans up on exit.

    Args:
        files: Mapping of logical name → content to write.
                e.g. {"code_chunks": "...", "full_source": "..."}
        prefix: Prefix for temp file names (sanitized for filesystem safety).
        directory: Directory to create files in. Defaults to system temp dir.

    Yields:
        Mapping of logical name → absolute file path.

    Example:
        with temp_review_files({"chunks": chunks_text, "source": source_text}, prefix="pkg-") as paths:
            prompt = f"Read chunks from: {paths['chunks']}"
    """
    safe_prefix = prefix.replace("/", "_").replace("@", "")
    dir_path = str(directory) if directory else tempfile.gettempdir()

    created_paths: dict[str, str] = {}
    try:
        for name, content in files.items():
            suffix = _suffix_for(name)
            f = tempfile.NamedTemporaryFile(
                mode="w", suffix=suffix, prefix=f"{safe_prefix}{name}-",
                delete=False, dir=dir_path,
            )
            f.write(content)
            f.close()
            created_paths[name] = f.name

        yield created_paths
    finally:
        for path in created_paths.values():
            if os.path.isfile(path):
                os.unlink(path)


def _suffix_for(name: str) -> str:
    """Determine file suffix based on logical name."""
    if "diff" in name or "cdk" in name:
        return ".diff"
    if "source" in name:
        return ".ts"
    return ".md"

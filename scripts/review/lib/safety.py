"""
Safety checks for review agents.

Catches silent failures where the nx project graph is unavailable (cache miss)
and changed-only.py returns empty despite actual code changes existing.
"""

from __future__ import annotations

import subprocess
from typing import Collection

from review.lib.nx_graph import PROJECT_ROOT, _target_ref


class FalseNegativeError(Exception):
    """Raised when git shows relevant changes but package detection returned empty.

    This indicates the nx project graph is likely unavailable (CI cache miss)
    and the review did NOT run.
    """

    def __init__(self, path_prefix: str, extensions: list[str], relevant_files: list[str]):
        self.path_prefix = path_prefix
        self.extensions = extensions
        self.relevant_files = relevant_files
        super().__init__(
            f"git diff shows {len(relevant_files)} changed files in {path_prefix} "
            f"matching {extensions}, but package detection returned 0 packages."
        )


def verify_no_false_negative(
    path_prefix: str,
    extensions: list[str],
    excluded_roots: Collection[str] | None = None,
) -> None:
    """Fail the job if git shows relevant changes but package detection returned empty.

    This catches silent failures where the nx project graph is unavailable (cache miss)
    and changed-only.py returns empty despite actual code changes existing.

    Args:
        path_prefix: Directory prefix to check for changes (e.g. "packages/apps/").
        extensions: File extensions to consider (e.g. [".ts"]).
        excluded_roots: Package roots that are intentionally excluded from review.
            Files under these roots are not considered when checking for false negatives.

    Raises:
        FalseNegativeError: if relevant file changes exist but no packages were detected.
    """
    result = subprocess.run(
        ["git", "diff", "--name-only", _target_ref(), "--", f"{path_prefix}"],
        capture_output=True, text=True, cwd=str(PROJECT_ROOT),
    )
    changed = [f.strip() for f in result.stdout.strip().split("\n") if f.strip()]
    relevant = [f for f in changed if any(f.endswith(ext) for ext in extensions)]

    # Filter out files that belong to intentionally excluded package roots
    if excluded_roots:
        relevant = [
            f for f in relevant
            if not any(f.startswith(root + "/") for root in excluded_roots)
        ]

    # If all relevant changes are deletions (files don't exist in HEAD),
    # there's nothing to review — the pass-through is legitimate.
    if relevant:
        existing = [f for f in relevant if (PROJECT_ROOT / f).is_file()]
        if not existing:
            # All changes are deletions — nothing to review
            return

    if relevant:
        raise FalseNegativeError(path_prefix, extensions, relevant)

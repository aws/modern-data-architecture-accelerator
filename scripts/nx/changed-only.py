#!/usr/bin/env python3
"""Computes Nx projects with direct file changes (no transitive dependents).

Uses git diff and the Nx project graph to find projects whose own source
tree contains changed files, without relying on ``nx affected``.

When the MERGE_PIPELINE_RUN_ALL environment variable is set to 'true', returns ALL projects
in the workspace regardless of what files changed.

Usage:
    python3 changed-only.py [BASE] [HEAD] [--extensions .ts .py ...]

The optional ``--extensions`` flag restricts which changed files are
considered when matching against project roots.  Only files whose
extension matches one of the given values count as a change.  When
omitted, every changed file is considered (original behaviour).

Outputs a JSON array of project names to stdout.
"""

import argparse
import os
import sys
import json
import subprocess
from typing import List, Optional, Sequence


def _parse_args(argv: Optional[Sequence[str]] = None) -> argparse.Namespace:
    """Parse CLI arguments, preserving the original positional interface."""
    parser = argparse.ArgumentParser(
        description="Compute Nx projects with direct file changes.",
    )
    parser.add_argument(
        "base",
        nargs="?",
        default="origin/main",
        help="Git ref for the diff base (default: origin/main)",
    )
    parser.add_argument(
        "head",
        nargs="?",
        default="HEAD",
        help="Git ref for the diff head (default: HEAD)",
    )
    parser.add_argument(
        "--extensions",
        nargs="+",
        default=None,
        metavar="EXT",
        help=(
            "Only consider files with these extensions when determining "
            "changed projects (e.g. --extensions .ts .py). "
            "When omitted, all changed files are considered."
        ),
    )
    return parser.parse_args(argv)


def _get_nx_graph() -> dict:
    """Return the full Nx project graph."""
    return json.loads(
        subprocess.check_output(
            ["npx", "nx", "graph", "--file=stdout"], stderr=subprocess.DEVNULL
        )
    )


def get_all_projects() -> List[str]:
    """Return every project in the Nx workspace."""
    return sorted(_get_nx_graph().get("graph", {}).get("nodes", {}).keys())


def _filter_by_extensions(
    files: List[str], extensions: Optional[List[str]]
) -> List[str]:
    """Keep only files whose extension is in *extensions*.

    Extensions are compared case-insensitively and must include the
    leading dot (e.g. ``".ts"``).  Returns *files* unchanged when
    *extensions* is ``None``.
    """
    if not extensions:
        return files
    normalised = {ext.lower() for ext in extensions}
    return [f for f in files if os.path.splitext(f)[1].lower() in normalised]


def main(argv: Optional[Sequence[str]] = None) -> None:
    # When MERGE_PIPELINE_RUN_ALL is set, return every project unconditionally.
    if os.environ.get("MERGE_PIPELINE_RUN_ALL", "false").lower() == "true":
        json.dump(get_all_projects(), sys.stdout)
        return

    args = _parse_args(argv)

    # Get files actually changed between base and head
    changed = (
        subprocess.check_output(
            ["git", "diff", "--name-only", f"{args.base}...{args.head}"],
            stderr=subprocess.DEVNULL,
        )
        .decode()
        .strip()
        .split("\n")
    )
    changed = [f for f in changed if f]

    # Apply optional extension filter before matching against projects.
    changed = _filter_by_extensions(changed, args.extensions)

    if not changed:
        json.dump([], sys.stdout)
        return

    # Get project roots from the Nx project graph
    nodes = _get_nx_graph().get("graph", {}).get("nodes", {})

    # Keep only projects that own at least one changed file
    result = [
        name
        for name, node in nodes.items()
        if (root := node.get("data", {}).get("root", ""))
        and any(f.startswith(root + "/") for f in changed)
    ]

    json.dump(sorted(result), sys.stdout)


if __name__ == "__main__":
    main()

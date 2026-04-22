#!/usr/bin/env python3
"""Computes Nx projects with direct file changes (no transitive dependents).

Uses git diff and the Nx project graph to find projects whose own source
tree contains changed files, without relying on `nx affected`.

When the MERGE_PIPELINE_RUN_ALL environment variable is set to 'true', returns ALL projects
in the workspace regardless of what files changed.

Usage:
    python3 changed-only.py [BASE] [HEAD]

Outputs a JSON array of project names to stdout.
"""

import os
import sys
import json
import subprocess


def get_all_projects():
    """Return every project in the Nx workspace."""
    graph = json.loads(
        subprocess.check_output(
            ["npx", "nx", "graph", "--file=stdout"], stderr=subprocess.DEVNULL
        )
    )
    return sorted(graph.get("graph", {}).get("nodes", {}).keys())


def main():
    # When MERGE_PIPELINE_RUN_ALL is set, return every project unconditionally.
    if os.environ.get("MERGE_PIPELINE_RUN_ALL", "false").lower() == "true":
        json.dump(get_all_projects(), sys.stdout)
        return

    nx_base = sys.argv[1] if len(sys.argv) > 1 else "origin/main"
    nx_head = sys.argv[2] if len(sys.argv) > 2 else "HEAD"

    # Get files actually changed between base and head
    changed = (
        subprocess.check_output(
            ["git", "diff", "--name-only", f"{nx_base}...{nx_head}"],
            stderr=subprocess.DEVNULL,
        )
        .decode()
        .strip()
        .split("\n")
    )
    changed = [f for f in changed if f]

    if not changed:
        json.dump([], sys.stdout)
        return

    # Get project roots from the Nx project graph
    graph = json.loads(
        subprocess.check_output(
            ["npx", "nx", "graph", "--file=stdout"], stderr=subprocess.DEVNULL
        )
    )
    nodes = graph.get("graph", {}).get("nodes", {})

    # Keep only projects that own at least one changed file
    result = []
    for name, node in nodes.items():
        root = node.get("data", {}).get("root", "")
        if root and any(f.startswith(root + "/") for f in changed):
            result.append(name)

    json.dump(result, sys.stdout)


if __name__ == "__main__":
    main()

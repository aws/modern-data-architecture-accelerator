#!/usr/bin/env python3
"""Prints a dependency tree showing why each project is affected.
Reads the Nx project graph and affected project list, then traces
from directly-changed projects through their dependents."""

import sys
import json
import subprocess


def get_affected_projects(nx_base, nx_head):
    out = subprocess.check_output(
        ["npx", "nx", "show", "projects", "--affected",
         f"--base={nx_base}", f"--head={nx_head}", "--json"],
        stderr=subprocess.DEVNULL,
    )
    return set(json.loads(out))


def get_graph():
    out = subprocess.check_output(
        ["npx", "nx", "graph", "--file=stdout"],
        stderr=subprocess.DEVNULL,
    )
    return json.loads(out)


def get_dependents(graph_deps):
    """Build a reverse map: project -> set of projects that depend on it."""
    dependents = {}
    for proj, deps in graph_deps.items():
        for d in deps:
            target = d.get("target", "")
            if target:
                dependents.setdefault(target, set()).add(proj)
    return dependents


def get_changed_files(nx_base, nx_head):
    """Return files changed between nx_base and the working tree.

    When nx_head is empty we are running locally and need to include
    uncommitted (staged + unstaged) changes — matching what
    ``nx affected --head=""`` does.  When nx_head is a ref (e.g. "HEAD")
    we are in CI and only compare committed changes.
    """
    if nx_head:
        # CI path: compare two commits.
        out = subprocess.check_output(
            ["git", "diff", "--name-only", nx_base, nx_head],
            stderr=subprocess.DEVNULL,
        )
    else:
        # Local path: diff base against the working tree (includes
        # both committed-since-base AND uncommitted changes).
        out = subprocess.check_output(
            ["git", "diff", "--name-only", nx_base],
            stderr=subprocess.DEVNULL,
        )
    return [f for f in out.decode().strip().split("\n") if f]


def find_directly_changed(affected, nodes, changed_files):
    """Find projects whose own files were changed (roots of the tree)."""
    roots = set()
    for name in affected:
        root = nodes.get(name, {}).get("data", {}).get("root", "")
        if root and any(f.startswith(root + "/") for f in changed_files):
            roots.add(name)
    return roots


def print_tree(project, dependents, affected, printed, prefix="", is_last=True):
    connector = "└── " if is_last else "├── "
    print(f"{prefix}{connector}{project}")

    if project in printed:
        return
    printed.add(project)

    children = sorted(dependents.get(project, set()) & affected)
    for i, child in enumerate(children):
        child_is_last = i == len(children) - 1
        child_prefix = prefix + ("    " if is_last else "│   ")
        print_tree(child, dependents, affected, printed, child_prefix, child_is_last)


def main():
    nx_base = sys.argv[1] if len(sys.argv) > 1 else "origin/main"
    nx_head = sys.argv[2] if len(sys.argv) > 2 else ""

    affected = get_affected_projects(nx_base, nx_head)
    if not affected:
        print("No affected projects.")
        return

    graph = get_graph()
    graph_deps = graph.get("graph", {}).get("dependencies", {})
    nodes = graph.get("graph", {}).get("nodes", {})
    dependents = get_dependents(graph_deps)
    changed_files = get_changed_files(nx_base, nx_head)
    roots = find_directly_changed(affected, nodes, changed_files)

    if not roots:
        print("Affected projects (no direct file changes detected):")
        for p in sorted(affected):
            print(f"  {p}")
        return

    printed = set()
    print("Affected dependency tree:")
    for i, root in enumerate(sorted(roots)):
        print(f"{root} (changed)")
        children = sorted(dependents.get(root, set()) & affected)
        for j, child in enumerate(children):
            print_tree(child, dependents, affected, printed, "", j == len(children) - 1)


if __name__ == "__main__":
    main()

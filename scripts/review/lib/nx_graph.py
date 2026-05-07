"""
Project graph loading and transitive dependency resolution.

Extracted from scripts/quality/baseline_review.py for reuse across review tools.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

# Compute PROJECT_ROOT relative to this file's location:
# scripts/review/lib/nx_graph.py -> scripts/review/lib -> scripts/review -> scripts -> PROJECT_ROOT
SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent

# Cached project graph — loaded once, shared across all calls
_project_graph_cache: dict | None = None


def _load_project_graph() -> dict | None:
    """Load the nx project graph, preferring the cached workspace data file.

    Falls back to running `npx nx graph --file=<tmpfile>` if the workspace
    data file doesn't exist (e.g., fresh CI environment without daemon).
    """
    global _project_graph_cache
    if _project_graph_cache is not None:
        return _project_graph_cache

    # Prefer the daemon's cached file — instant, no subprocess
    graph_file = PROJECT_ROOT / ".nx" / "workspace-data" / "project-graph.json"
    if graph_file.is_file():
        try:
            with open(graph_file) as f:
                _project_graph_cache = json.load(f)
            return _project_graph_cache
        except (json.JSONDecodeError, OSError):
            pass

    # Fallback: generate the graph via stdout (--file=stdout prevents the web server)
    try:
        result = subprocess.run(
            ["npx", "nx", "graph", "--file=stdout"],
            capture_output=True, text=True, timeout=120,
            cwd=str(PROJECT_ROOT),
        )
        if result.returncode == 0 and result.stdout.strip():
            _project_graph_cache = json.loads(result.stdout)
            return _project_graph_cache
    except Exception:
        pass

    print("WARNING: Could not load nx project graph. "
          "Dependency-based code diff collection will be limited.", file=sys.stderr)
    return None


def _get_transitive_deps(pkg_name: str) -> tuple[set[str], dict[str, str]]:
    """Get all transitive @aws-mdaa dependencies and their root paths.

    Returns (dep_names, dep_roots) where dep_roots maps package name to
    the project root directory (e.g., '@aws-mdaa/datazone-l3-construct' ->
    'packages/constructs/L3/governance/datazone-l3-construct').
    """
    graph = _load_project_graph()
    if not graph:
        return set(), {}

    graph_deps = graph.get("dependencies", {})
    nodes = graph.get("nodes", {})

    # BFS
    visited: set[str] = set()
    queue = [pkg_name]
    while queue:
        current = queue.pop(0)
        if current in visited:
            continue
        visited.add(current)
        for dep in graph_deps.get(current, []):
            target = dep.get("target", "")
            if target and target.startswith("@aws-mdaa/"):
                queue.append(target)

    visited.discard(pkg_name)

    dep_roots = {}
    for dep_name in visited:
        node = nodes.get(dep_name, {})
        root = node.get("data", {}).get("root", "")
        if root:
            dep_roots[dep_name] = root

    return visited, dep_roots


def _target_ref() -> str:
    """Return the git ref to compare against.

    Uses CI_MERGE_REQUEST_TARGET_BRANCH_NAME if available (MR pipeline),
    otherwise defaults to origin/main.
    """
    target = os.environ.get("CI_MERGE_REQUEST_TARGET_BRANCH_NAME")
    return f"origin/{target}" if target else "origin/main"


def get_downstream_consumers(package_name: str) -> list[str]:
    """Find packages that depend ON the given package (reverse/downstream deps).

    Iterates the project graph's dependency edges to find all projects that
    list `package_name` as a dependency target.

    Returns a sorted list of consumer project names, or an empty list if the
    graph is unavailable or no consumers exist.
    """
    graph = _load_project_graph()
    if not graph:
        return []

    graph_deps = graph.get("dependencies", {})
    consumers = []
    for proj, deps in graph_deps.items():
        for dep in deps:
            if dep.get("target") == package_name:
                consumers.append(proj)
                break

    return sorted(consumers)

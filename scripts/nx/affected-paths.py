#!/usr/bin/env python3
"""Reads a JSON array of Nx project names from stdin and prints their
filesystem root paths as a comma-separated string."""

import sys
import json
import subprocess

affected = json.load(sys.stdin)
if not affected:
    sys.exit(0)

graph_json = subprocess.check_output(
    ["npx", "nx", "graph", "--file=stdout"], stderr=subprocess.DEVNULL
)
graph = json.loads(graph_json)
nodes = graph.get("graph", {}).get("nodes", {})

paths = []
for name in affected:
    root = nodes.get(name, {}).get("data", {}).get("root", "")
    if root:
        paths.append(root)

print(",".join(paths))

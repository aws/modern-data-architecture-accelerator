"""
Shared package classification utilities for review agents.
"""

from __future__ import annotations


def classify_package(root: str) -> str:
    """Classify a package by its path prefix.

    Returns one of: "L2", "L3", "app", "utility", "cli", "other".
    """
    if root.startswith("packages/constructs/L2/"):
        return "L2"
    if root.startswith("packages/constructs/L3/"):
        return "L3"
    if root.startswith("packages/apps/"):
        return "app"
    if root.startswith("packages/utilities/"):
        return "utility"
    if root.startswith("packages/cli"):
        return "cli"
    return "other"

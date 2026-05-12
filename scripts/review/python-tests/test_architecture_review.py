"""Tests for Architecture Review agent."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.architecture.architecture_review import classify_package
from review.architecture.post_architecture_threads import (
    SUMMARY_MARKER, SOURCE_PATTERN, build_source_groups, format_summary_body,
    format_source_thread,
)
from review.lib.thread_lifecycle import find_thread_by_marker, find_summary_note as _find_summary_note


# Wrap shared functions for test compatibility
def find_existing_thread(discussions, key):
    d, h, n, c = find_thread_by_marker(discussions, SOURCE_PATTERN, key)
    return d, h, n


def find_summary_note(notes):
    return _find_summary_note(notes, SUMMARY_MARKER)


class TestClassifyPackage:
    def test_l2(self):
        assert classify_package("packages/constructs/L2/s3-constructs") == "L2"
    def test_l3(self):
        assert classify_package("packages/constructs/L3/datalake/datalake-l3-construct") == "L3"
    def test_app(self):
        assert classify_package("packages/apps/datalake/datalake-app") == "app"
    def test_utility(self):
        assert classify_package("packages/utilities/iam-role-helper") == "utility"
    def test_other(self):
        assert classify_package("some/path") == "other"


class TestBuildSourceGroups:
    def test_groups_by_chunk_hash(self):
        """Findings with source_hash are keyed by file:source_hash."""
        entries = [{"package": "pkg-a", "findings": [
            {"file": "lib/a.ts", "line": 10, "risk": "HIGH", "category": "layer_violation", "source_hash": "abc123"},
            {"file": "lib/a.ts", "line": 20, "risk": "MEDIUM", "category": "separation_of_concerns", "source_hash": "abc123"},
        ]}]
        groups = build_source_groups(entries)
        key = "lib/a.ts:abc123"
        assert key in groups
        assert len(groups[key]["findings"]) == 2
        assert groups[key]["risk_level"] == "HIGH"

    def test_different_chunks_separate_threads(self):
        """Findings in different chunks get separate groups."""
        entries = [{"package": "pkg-a", "findings": [
            {"file": "lib/a.ts", "line": 10, "risk": "HIGH", "category": "layer_violation", "source_hash": "aaa"},
            {"file": "lib/a.ts", "line": 50, "risk": "MEDIUM", "category": "reusability", "source_hash": "bbb"},
        ]}]
        groups = build_source_groups(entries)
        assert "lib/a.ts:aaa" in groups
        assert "lib/a.ts:bbb" in groups
        assert len(groups["lib/a.ts:aaa"]["findings"]) == 1
        assert len(groups["lib/a.ts:bbb"]["findings"]) == 1

    def test_fallback_without_source_hash(self):
        """Findings without source_hash fall back to compute_line_anchor key."""
        entries = [{"package": "pkg-a", "findings": [
            {"file": "lib/a.ts", "line": 10, "risk": "HIGH", "category": "layer_violation"},
        ]}]
        groups = build_source_groups(entries)
        # Key will be whatever compute_line_anchor returns (file path based)
        assert len(groups) == 1
        key = list(groups.keys())[0]
        assert key.startswith("lib/a.ts")

    def test_empty(self):
        assert build_source_groups([{"package": "p", "findings": []}]) == {}


class TestFormatSummaryBody:
    def test_with_findings(self):
        entries = [{"package": "p", "risk_level": "HIGH", "findings": [{"risk": "HIGH"}]}]
        body = format_summary_body(entries)
        assert SUMMARY_MARKER in body
        assert "Architecture Review Summary" in body
        assert "1 HIGH" in body

    def test_no_findings(self):
        body = format_summary_body([{"package": "p", "risk_level": "LOW", "findings": []}])
        assert "No architecture misalignments found" in body


class TestFormatSourceThread:
    def test_markers(self):
        group = {"source": "lib/a.ts:42", "risk_level": "HIGH", "findings": [
            ("pkg-a", {"risk": "HIGH", "category": "layer_violation", "line": 42, "detail": "Logic in app"}),
        ]}
        key = "lib/a.ts:abc123"
        body = format_source_thread(key, group, "hash456")
        assert "<!-- architecture-source:lib/a.ts:abc123 -->" in body
        assert "Architecture Review" in body
        assert "Architecture Misalignment: HIGH" in body
        assert "Contributor: fix the issue" in body
        assert "Reviewer: resolve this thread" in body

    def test_update(self):
        group = {"source": "lib/a.ts:10", "risk_level": "MEDIUM", "findings": [
            ("p", {"risk": "MEDIUM", "category": "reusability", "line": 10, "detail": "Only one user"}),
        ]}
        body = format_source_thread("lib/a.ts:xyz", group, "x", is_update=True)
        assert "re-acknowledge" in body


class TestFindExistingThread:
    def test_finds(self):
        key = "lib/a.ts:abc123"
        discussions = [{"id": "d1", "notes": [
            {"id": "n1", "body": f"<!-- architecture-source:{key} -->\n<!-- architecture-hash:abc -->"}
        ]}]
        d, h, n = find_existing_thread(discussions, key)
        assert d is not None
        assert h == "abc"

    def test_not_found(self):
        d, _, _ = find_existing_thread([{"id": "d1", "notes": [{"id": "n1", "body": "other"}]}], "lib/a.ts:abc123")
        assert d is None


class TestFindSummaryNote:
    def test_finds(self):
        assert find_summary_note([{"id": "n1", "body": SUMMARY_MARKER}]) is not None
    def test_not_found(self):
        assert find_summary_note([{"id": "n1", "body": "nope"}]) is None



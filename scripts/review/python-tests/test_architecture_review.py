"""Tests for Architecture Review agent."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.architecture.architecture_review import classify_package, build_junit_entries
from review.architecture.post_architecture_threads import (
    SUMMARY_MARKER, FILE_PATTERN, build_file_groups, format_summary_body,
    format_file_thread,
)
from review.lib.thread_lifecycle import find_thread_by_marker, find_summary_note as _find_summary_note


# Wrap shared functions for test compatibility
def find_existing_thread(discussions, file_path):
    d, h, n, c = find_thread_by_marker(discussions, FILE_PATTERN, file_path)
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


class TestBuildFileGroups:
    def test_groups_by_file(self):
        entries = [{"package": "pkg-a", "findings": [
            {"file": "lib/a.ts", "line": 10, "risk": "HIGH", "category": "layer_violation"},
            {"file": "lib/a.ts", "line": 20, "risk": "MEDIUM", "category": "separation_of_concerns"},
        ]}]
        groups = build_file_groups(entries)
        assert "lib/a.ts" in groups
        assert len(groups["lib/a.ts"]["findings"]) == 2
        assert groups["lib/a.ts"]["risk_level"] == "HIGH"

    def test_empty(self):
        assert build_file_groups([{"package": "p", "findings": []}]) == {}


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


class TestFormatFileThread:
    def test_markers(self):
        group = {"file": "lib/a.ts", "risk_level": "HIGH", "findings": [
            ("pkg-a", {"risk": "HIGH", "category": "layer_violation", "line": 42, "detail": "Logic in app"}),
        ]}
        body = format_file_thread("lib/a.ts", group, "abc123")
        assert "<!-- architecture-file:lib/a.ts -->" in body
        assert "Architecture Review" in body
        assert "Architecture Misalignment: HIGH" in body
        assert "rerun the `feature_merge_architecture_review`" in body

    def test_update(self):
        group = {"file": "lib/a.ts", "risk_level": "MEDIUM", "findings": [
            ("p", {"risk": "MEDIUM", "category": "reusability", "detail": "Only one user"}),
        ]}
        body = format_file_thread("lib/a.ts", group, "x", is_update=True)
        assert "re-acknowledge" in body


class TestFindExistingThread:
    def test_finds(self):
        discussions = [{"id": "d1", "notes": [
            {"id": "n1", "body": "<!-- architecture-file:lib/a.ts -->\n<!-- architecture-hash:abc -->"}
        ]}]
        d, h, n = find_existing_thread(discussions, "lib/a.ts")
        assert d is not None
        assert h == "abc"

    def test_not_found(self):
        d, _, _ = find_existing_thread([{"id": "d1", "notes": [{"id": "n1", "body": "other"}]}], "lib/a.ts")
        assert d is None


class TestFindSummaryNote:
    def test_finds(self):
        assert find_summary_note([{"id": "n1", "body": SUMMARY_MARKER}]) is not None
    def test_not_found(self):
        assert find_summary_note([{"id": "n1", "body": "nope"}]) is None


class TestBuildJunitEntries:
    def test_fail(self):
        entries = [{"package": "p", "root": "r", "type": "L2", "risk_level": "HIGH",
                     "risk_summary": "Bad", "findings": [{"risk": "HIGH"}]}]
        assert build_junit_entries(entries)[0]["status"] == "fail"
    def test_info(self):
        entries = [{"package": "p", "root": "r", "type": "L2", "risk_level": "LOW",
                     "risk_summary": "OK", "findings": []}]
        assert build_junit_entries(entries)[0]["status"] == "info"

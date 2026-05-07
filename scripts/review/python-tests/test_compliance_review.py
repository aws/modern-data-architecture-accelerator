"""Tests for Compliance Review agent."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

# Add scripts/ to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.compliance.compliance_review import (
    build_junit_entries,
)
from review.compliance.post_compliance_threads import (
    SUMMARY_MARKER,
    SOURCE_PATTERN,
    build_finding_groups,
    format_summary_body,
    format_finding_thread,
)
from review.lib.thread_lifecycle import find_thread_by_marker, find_summary_note as _find_summary_note


# Wrap shared functions for test compatibility
def find_existing_thread(discussions, source):
    d, h, n, c = find_thread_by_marker(discussions, SOURCE_PATTERN, source)
    return d, h, n


def find_summary_note(notes):
    return _find_summary_note(notes, SUMMARY_MARKER)


class TestBuildFindingGroups:
    """Test grouping findings by source location."""

    def test_groups_by_source(self):
        entries = [
            {
                "package": "pkg-a",
                "findings": [
                    {"file": "lib/a.ts", "line": 10, "risk": "HIGH", "category": "encryption", "resource": "Bucket"},
                    {"file": "lib/a.ts", "line": 10, "risk": "MEDIUM", "category": "logging", "resource": "Bucket"},
                ],
            }
        ]
        groups = build_finding_groups(entries)
        assert "lib/a.ts:10" in groups
        assert len(groups["lib/a.ts:10"]["findings"]) == 2
        assert groups["lib/a.ts:10"]["risk_level"] == "HIGH"

    def test_includes_low_findings(self):
        entries = [
            {
                "package": "pkg-a",
                "findings": [
                    {"file": "lib/a.ts", "line": 5, "risk": "LOW", "category": "nag_suppression"},
                ],
            }
        ]
        groups = build_finding_groups(entries)
        assert len(groups) == 1
        assert groups["lib/a.ts:5"]["risk_level"] == "LOW"

    def test_cross_package_grouping(self):
        entries = [
            {
                "package": "pkg-a",
                "findings": [
                    {"file": "lib/shared.ts", "line": 20, "risk": "HIGH", "category": "iam_policy"},
                ],
            },
            {
                "package": "pkg-b",
                "findings": [
                    {"file": "lib/shared.ts", "line": 20, "risk": "MEDIUM", "category": "iam_policy"},
                ],
            },
        ]
        groups = build_finding_groups(entries)
        assert "lib/shared.ts:20" in groups
        assert len(groups["lib/shared.ts:20"]["findings"]) == 2
        assert groups["lib/shared.ts:20"]["risk_level"] == "HIGH"

    def test_empty_findings(self):
        entries = [{"package": "pkg-a", "findings": []}]
        groups = build_finding_groups(entries)
        assert len(groups) == 0


class TestFormatSummaryBody:
    """Test summary thread formatting."""

    def test_includes_marker(self):
        entries = [
            {"package": "pkg-a", "risk_level": "HIGH", "risk_summary": "Issue found", "findings": [
                {"risk": "HIGH", "category": "encryption"},
            ]},
        ]
        body = format_summary_body(entries)
        assert SUMMARY_MARKER in body
        assert "Compliance Review Summary" in body
        assert "1 HIGH" in body

    def test_no_findings(self):
        entries = [{"package": "pkg-a", "risk_level": "LOW", "risk_summary": "", "findings": []}]
        body = format_summary_body(entries)
        assert "No compliance issues found" in body

    def test_empty_entries(self):
        body = format_summary_body([])
        assert "Packages reviewed:** 0" in body
        assert "No compliance issues found" in body


class TestFormatFindingThread:
    """Test detail thread formatting."""

    def test_includes_markers(self):
        group = {
            "source": "lib/bucket.ts:42",
            "risk_level": "HIGH",
            "findings": [
                ("pkg-a", {"risk": "HIGH", "category": "encryption", "resource": "Bucket", "detail": "Missing encryption"}),
            ],
        }
        body = format_finding_thread("lib/bucket.ts:42", group, "abc123")
        assert "<!-- compliance-source:lib/bucket.ts:42 -->" in body
        assert "<!-- compliance-hash:abc123 -->" in body
        assert "Compliance Review" in body
        assert "Compliance Risk: HIGH" in body
        assert "Missing encryption" in body

    def test_update_flag(self):
        group = {
            "source": "lib/a.ts:1",
            "risk_level": "MEDIUM",
            "findings": [("pkg-a", {"risk": "MEDIUM", "category": "iam_policy", "resource": "", "detail": "Broad wildcard"})],
        }
        body = format_finding_thread("lib/a.ts:1", group, "def456", is_update=True)
        assert "re-acknowledge" in body


class TestFindExistingThread:
    """Test thread lookup by source marker."""

    def test_finds_by_source(self):
        discussions = [{
            "id": "d1",
            "notes": [{
                "id": "n1",
                "body": "<!-- compliance-source:lib/a.ts:10 -->\n<!-- compliance-hash:abc123 -->\nContent",
            }],
        }]
        disc, hash_val, note_id = find_existing_thread(discussions, "lib/a.ts:10")
        assert disc is not None
        assert hash_val == "abc123"
        assert note_id == "n1"

    def test_returns_none_when_not_found(self):
        discussions = [{
            "id": "d1",
            "notes": [{"id": "n1", "body": "<!-- compliance-source:lib/other.ts:5 -->"}],
        }]
        disc, hash_val, note_id = find_existing_thread(discussions, "lib/a.ts:10")
        assert disc is None


class TestFindSummaryNote:
    """Test summary note lookup."""

    def test_finds_summary(self):
        notes = [{"id": "n1", "body": f"{SUMMARY_MARKER}\nSummary content"}]
        assert find_summary_note(notes) is not None

    def test_returns_none(self):
        notes = [{"id": "n1", "body": "Not a summary"}]
        assert find_summary_note(notes) is None


class TestBuildJunitEntries:
    """Test JUnit entry generation."""

    def test_fail_entry(self):
        entries = [{
            "package": "pkg-a",
            "root": "packages/constructs/L2/s3-constructs",
            "type": "L2",
            "risk_level": "HIGH",
            "risk_summary": "Missing encryption",
            "findings": [{"risk": "HIGH", "category": "encryption"}],
        }]
        junit = build_junit_entries(entries)
        assert len(junit) == 1
        assert junit[0]["status"] == "fail"
        assert "HIGH" in junit[0]["message"]

    def test_info_entry_no_findings(self):
        entries = [{
            "package": "pkg-a",
            "root": "packages/constructs/L2/s3-constructs",
            "type": "L2",
            "risk_level": "LOW",
            "risk_summary": "All good",
            "findings": [],
        }]
        junit = build_junit_entries(entries)
        assert junit[0]["status"] == "info"

"""Tests for Test Standards Review agent."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest

# Add scripts/ to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.test_standards.test_standards_review import (
    classify_package,
    build_junit_entries,
)
from review.test_standards.post_test_standards_threads import (
    SUMMARY_MARKER,
    PKG_PATTERN,
    format_summary_body,
    format_package_thread,
)
from review.lib.thread_lifecycle import find_thread_by_marker, find_summary_note as _find_summary_note


# Wrap shared functions for test compatibility
def find_existing_thread(discussions, pkg_name):
    d, h, n, c = find_thread_by_marker(discussions, PKG_PATTERN, pkg_name)
    return d, h, n


def find_summary_note(notes):
    return _find_summary_note(notes, SUMMARY_MARKER)


class TestClassifyPackage:
    """Test package type classification."""

    def test_l2(self):
        assert classify_package("packages/constructs/L2/s3-constructs") == "L2"

    def test_l3(self):
        assert classify_package("packages/constructs/L3/datalake/datalake-l3-construct") == "L3"

    def test_app(self):
        assert classify_package("packages/apps/datalake/datalake-app") == "app"

    def test_utility(self):
        assert classify_package("packages/utilities/iam-role-helper") == "utility"

    def test_cli(self):
        assert classify_package("packages/cli") == "cli"

    def test_other(self):
        assert classify_package("some/other/path") == "other"


class TestFormatSummaryBody:
    """Test summary thread formatting."""

    def test_includes_marker(self):
        entries = [
            {"package": "pkg-a", "type": "L2", "risk_level": "HIGH", "risk_summary": "Missing tests", "findings": [
                {"risk": "HIGH", "category": "missing_test"},
            ]},
        ]
        body = format_summary_body(entries)
        assert SUMMARY_MARKER in body
        assert "Test Standards Review Summary" in body
        assert "1 HIGH" in body

    def test_no_findings(self):
        entries = [{"package": "pkg-a", "type": "L2", "risk_level": "LOW", "risk_summary": "", "findings": []}]
        body = format_summary_body(entries)
        assert "All packages meet test standards" in body

    def test_empty_entries(self):
        body = format_summary_body([])
        assert "Packages reviewed:** 0" in body
        assert "All packages meet test standards" in body


class TestFormatPackageThread:
    """Test per-package thread formatting."""

    def test_includes_markers(self):
        entry = {
            "package": "pkg-a",
            "type": "L2",
            "risk_level": "HIGH",
            "findings": [
                {"risk": "HIGH", "category": "missing_test", "file": "lib/a.ts", "detail": "No compliance test"},
            ],
        }
        body = format_package_thread("pkg-a", entry, "abc123")
        assert "<!-- test-standards-pkg:pkg-a -->" in body
        assert "<!-- test-standards-hash:abc123 -->" in body
        assert "Test Standards Review" in body
        assert "Testing Gap: HIGH" in body
        assert "Missing Tests" in body
        assert "No compliance test" in body

    def test_groups_by_category(self):
        entry = {
            "package": "pkg-a",
            "type": "L2",
            "risk_level": "HIGH",
            "findings": [
                {"risk": "HIGH", "category": "missing_test", "file": "lib/a.ts", "detail": "Missing test"},
                {"risk": "MEDIUM", "category": "naming", "file": "test/a.test.ts", "detail": "Wrong name"},
            ],
        }
        body = format_package_thread("pkg-a", entry, "abc123")
        assert "### Missing Tests" in body
        assert "### Naming Violations" in body

    def test_update_flag(self):
        entry = {
            "package": "pkg-a",
            "type": "L2",
            "risk_level": "MEDIUM",
            "findings": [{"risk": "MEDIUM", "category": "naming", "file": "", "detail": "Issue"}],
        }
        body = format_package_thread("pkg-a", entry, "def456", is_update=True)
        assert "re-acknowledge" in body


class TestFindExistingThread:
    """Test thread lookup by package marker."""

    def test_finds_by_package(self):
        discussions = [{
            "id": "d1",
            "notes": [{
                "id": "n1",
                "body": "<!-- test-standards-pkg:pkg-a -->\n<!-- test-standards-hash:abc123 -->\nContent",
            }],
        }]
        disc, hash_val, note_id = find_existing_thread(discussions, "pkg-a")
        assert disc is not None
        assert hash_val == "abc123"

    def test_returns_none_when_not_found(self):
        discussions = [{
            "id": "d1",
            "notes": [{"id": "n1", "body": "<!-- test-standards-pkg:pkg-b -->"}],
        }]
        disc, _, _ = find_existing_thread(discussions, "pkg-a")
        assert disc is None


class TestFindSummaryNote:
    """Test summary note lookup."""

    def test_finds_summary(self):
        notes = [{"id": "n1", "body": f"{SUMMARY_MARKER}\nContent"}]
        assert find_summary_note(notes) is not None

    def test_returns_none(self):
        notes = [{"id": "n1", "body": "Not a summary"}]
        assert find_summary_note(notes) is None


class TestBuildJunitEntries:
    """Test JUnit entry generation."""

    def test_fail_entry(self):
        entries = [{
            "package": "pkg-a", "root": "packages/constructs/L2/sqs-constructs",
            "type": "L2", "risk_level": "HIGH", "risk_summary": "Missing test",
            "findings": [{"risk": "HIGH", "category": "missing_test"}],
        }]
        junit = build_junit_entries(entries)
        assert junit[0]["status"] == "fail"

    def test_info_entry(self):
        entries = [{
            "package": "pkg-a", "root": "packages/constructs/L2/sqs-constructs",
            "type": "L2", "risk_level": "LOW", "risk_summary": "All good",
            "findings": [],
        }]
        junit = build_junit_entries(entries)
        assert junit[0]["status"] == "info"

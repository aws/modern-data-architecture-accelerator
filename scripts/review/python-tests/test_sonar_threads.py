"""Tests for sonar/post_sonar_threads.py."""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.sonar.post_sonar_threads import (
    group_issues_by_file,
    format_file_thread,
    format_summary_body,
    compute_structural_hash,
    SEVERITY_MAP,
)


class TestGroupIssuesByFile:
    def test_groups_single_file(self):
        issues = [
            {"component": "proj:src/a.ts", "severity": "MAJOR", "type": "BUG", "line": 10, "message": "m", "rule": "r", "key": "k1"},
            {"component": "proj:src/a.ts", "severity": "MINOR", "type": "CODE_SMELL", "line": 20, "message": "m2", "rule": "r2", "key": "k2"},
        ]
        groups = group_issues_by_file(issues, "proj")
        assert "src/a.ts" in groups
        assert len(groups["src/a.ts"]["issues"]) == 2
        assert groups["src/a.ts"]["risk_level"] == "MEDIUM"

    def test_groups_multiple_files(self):
        issues = [
            {"component": "proj:src/a.ts", "severity": "MINOR", "type": "CODE_SMELL", "line": 1, "message": "m", "rule": "r", "key": "k1"},
            {"component": "proj:src/b.ts", "severity": "CRITICAL", "type": "BUG", "line": 5, "message": "m2", "rule": "r2", "key": "k2"},
        ]
        groups = group_issues_by_file(issues, "proj")
        assert len(groups) == 2
        assert groups["src/a.ts"]["risk_level"] == "LOW"
        assert groups["src/b.ts"]["risk_level"] == "HIGH"

    def test_escalates_risk_level(self):
        issues = [
            {"component": "proj:f.ts", "severity": "MINOR", "type": "CODE_SMELL", "line": 1, "message": "m", "rule": "r", "key": "k1"},
            {"component": "proj:f.ts", "severity": "BLOCKER", "type": "BUG", "line": 2, "message": "m2", "rule": "r2", "key": "k2"},
        ]
        groups = group_issues_by_file(issues, "proj")
        assert groups["f.ts"]["risk_level"] == "HIGH"

    def test_skips_empty_component(self):
        issues = [{"component": "", "severity": "MAJOR", "type": "BUG", "line": 1, "message": "m", "rule": "r", "key": "k"}]
        groups = group_issues_by_file(issues, "proj")
        assert len(groups) == 0


class TestFormatFileThread:
    def test_contains_marker_and_issues(self):
        group = {
            "file_path": "src/devops.ts",
            "risk_level": "HIGH",
            "issues": [
                {"type": "CODE_SMELL", "severity": "CRITICAL", "risk": "HIGH", "line": 42, "message": "Reduce complexity", "rule": "typescript:S3776", "key": "k1"},
            ],
        }
        body = format_file_thread("src/devops.ts", group, "abc123", False)
        assert "<!-- sonar-file:src/devops.ts -->" in body
        assert "<!-- sonar-hash:abc123 -->" in body
        assert "CODE_SMELL [CRITICAL]" in body
        assert "L42" in body
        assert "typescript:S3776" in body

    def test_multiple_issues_sorted_by_severity(self):
        group = {
            "file_path": "f.ts",
            "risk_level": "HIGH",
            "issues": [
                {"type": "CODE_SMELL", "severity": "MINOR", "risk": "LOW", "line": 1, "message": "m1", "rule": "r1", "key": "k1"},
                {"type": "BUG", "severity": "CRITICAL", "risk": "HIGH", "line": 2, "message": "m2", "rule": "r2", "key": "k2"},
            ],
        }
        body = format_file_thread("f.ts", group, "hash", False)
        # HIGH issue should come before LOW
        high_pos = body.index("BUG [CRITICAL]")
        low_pos = body.index("CODE_SMELL [MINOR]")
        assert high_pos < low_pos


class TestFormatSummaryBody:
    def test_summary_contains_counts(self):
        groups = {
            "a.ts": {"file_path": "a.ts", "issues": [{"x": 1}], "risk_level": "HIGH"},
            "b.ts": {"file_path": "b.ts", "issues": [{"x": 1}, {"x": 2}], "risk_level": "LOW"},
        }
        body = format_summary_body(groups, "http://sonar:8443", "proj")
        assert "3 across 2 file(s)" in body
        assert "1 HIGH" in body
        assert "1 LOW" in body
        assert "<!-- sonar-summary -->" in body


class TestComputeStructuralHash:
    def test_same_issues_same_hash(self):
        group = {"issues": [{"rule": "r1", "line": 10, "message": "m"}]}
        h1 = compute_structural_hash("f.ts", group)
        h2 = compute_structural_hash("f.ts", group)
        assert h1 == h2

    def test_different_issues_different_hash(self):
        g1 = {"issues": [{"rule": "r1", "line": 10, "message": "m"}]}
        g2 = {"issues": [{"rule": "r1", "line": 11, "message": "m"}]}
        assert compute_structural_hash("f.ts", g1) != compute_structural_hash("f.ts", g2)


class TestSeverityMap:
    def test_blocker_and_critical_are_high(self):
        assert SEVERITY_MAP["BLOCKER"] == "HIGH"
        assert SEVERITY_MAP["CRITICAL"] == "HIGH"

    def test_major_is_medium(self):
        assert SEVERITY_MAP["MAJOR"] == "MEDIUM"

    def test_minor_and_info_are_low(self):
        assert SEVERITY_MAP["MINOR"] == "LOW"
        assert SEVERITY_MAP["INFO"] == "LOW"

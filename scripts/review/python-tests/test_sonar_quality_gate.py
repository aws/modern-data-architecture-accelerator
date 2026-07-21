"""Tests for sonar_quality_gate.py."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

# sonar_quality_gate lives in scripts/quality/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / ".." / "quality"))

from sonar_quality_gate import (
    _format_value,
    _format_comparator,
    print_quality_gate,
    print_issues,
    METRIC_NAMES,
    RATING_MAP,
)


class TestFormatValue:
    def test_rating_metric(self):
        assert _format_value("new_reliability_rating", "1") == "A"
        assert _format_value("new_security_rating", "3") == "C"

    def test_coverage_metric(self):
        assert _format_value("new_coverage", "80.5") == "80.5%"

    def test_duplicated_metric(self):
        assert _format_value("new_duplicated_lines_density", "3.2") == "3.2%"

    def test_plain_metric(self):
        assert _format_value("new_bugs", "5") == "5"

    def test_unknown_rating(self):
        assert _format_value("new_reliability_rating", "9") == "9"


class TestFormatComparator:
    def test_known_comparators(self):
        assert _format_comparator("GT") == ">"
        assert _format_comparator("LT") == "<"
        assert _format_comparator("EQ") == "="
        assert _format_comparator("NE") == "!="

    def test_unknown_comparator(self):
        assert _format_comparator("UNKNOWN") == "UNKNOWN"


class TestPrintQualityGate:
    @patch("sonar_quality_gate._make_request")
    def test_prints_passed_gate(self, mock_request, capsys):
        mock_request.return_value = {
            "projectStatus": {
                "status": "OK",
                "conditions": [
                    {"metricKey": "new_coverage", "actualValue": "95.0", "errorThreshold": "80", "comparator": "LT", "status": "OK"},
                ],
            }
        }
        result = print_quality_gate("proj", "http://sonar", "creds")
        assert result is True
        captured = capsys.readouterr()
        assert "✅" in captured.out
        assert "QUALITY GATE" in captured.out

    @patch("sonar_quality_gate._make_request")
    def test_prints_failed_gate(self, mock_request, capsys):
        mock_request.return_value = {
            "projectStatus": {
                "status": "ERROR",
                "conditions": [
                    {"metricKey": "new_violations", "actualValue": "3", "errorThreshold": "0", "comparator": "GT", "status": "ERROR"},
                    {"metricKey": "new_coverage", "actualValue": "90", "errorThreshold": "80", "comparator": "LT", "status": "OK"},
                ],
            }
        }
        result = print_quality_gate("proj", "http://sonar", "creds")
        assert result is False
        captured = capsys.readouterr()
        assert "❌" in captured.out
        assert "ERROR" in captured.out

    @patch("sonar_quality_gate._make_request")
    def test_handles_no_conditions(self, mock_request, capsys):
        mock_request.return_value = {"projectStatus": {"status": "OK", "conditions": []}}
        result = print_quality_gate("proj", "http://sonar", "creds")
        assert result is True
        captured = capsys.readouterr()
        assert "No conditions evaluated" in captured.out


class TestPrintIssues:
    @patch("sonar_quality_gate._make_request")
    def test_prints_issues(self, mock_request, capsys):
        mock_request.return_value = {
            "issues": [
                {
                    "project": "proj",
                    "severity": "CRITICAL",
                    "type": "CODE_SMELL",
                    "component": "proj:src/file.ts",
                    "line": 42,
                    "message": "Reduce complexity",
                    "rule": "typescript:S3776",
                    "key": "issue-1",
                },
            ],
            "total": 1,
        }
        print_issues("proj", "http://sonar", "creds", "http://sonar:8443")
        captured = capsys.readouterr()
        assert "CODE_SMELL [CRITICAL]" in captured.out
        assert "src/file.ts:42" in captured.out
        assert "typescript:S3776" in captured.out

    @patch("sonar_quality_gate._make_request")
    def test_filters_to_exact_project(self, mock_request, capsys):
        mock_request.return_value = {
            "issues": [
                {"project": "proj", "severity": "MAJOR", "type": "BUG", "component": "proj:a.ts", "line": 1, "message": "m", "rule": "r", "key": "k1"},
                {"project": "proj-other", "severity": "MAJOR", "type": "BUG", "component": "proj-other:b.ts", "line": 2, "message": "m2", "rule": "r2", "key": "k2"},
            ],
            "total": 2,
        }
        print_issues("proj", "http://sonar", "creds", "http://sonar:8443")
        captured = capsys.readouterr()
        assert "a.ts:1" in captured.out
        assert "b.ts" not in captured.out
        assert "New Code Issues (1)" in captured.out

    @patch("sonar_quality_gate._make_request")
    def test_no_issues(self, mock_request, capsys):
        mock_request.return_value = {"issues": [], "total": 0}
        print_issues("proj", "http://sonar", "creds", "http://sonar:8443")
        captured = capsys.readouterr()
        assert "No new-code issues found" in captured.out

"""Tests for report.py — GitLab Code Quality report generation."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from review.lib.report import to_codequality_json


class TestToCodequalityJson:
    """Test GitLab Code Quality report generation."""

    def test_generates_valid_json(self):
        entries = [{
            "package": "pkg-a",
            "findings": [
                {"file": "lib/a.ts", "line": 42, "risk": "HIGH", "category": "iam_policy",
                 "detail": "Wildcard resource", "source_hash": "abc123"},
            ],
        }]
        result = json.loads(to_codequality_json(entries, agent_name="compliance"))
        assert len(result) == 1
        assert result[0]["severity"] == "critical"
        assert result[0]["check_name"] == "compliance/iam_policy"
        assert result[0]["location"]["path"] == "lib/a.ts"
        assert result[0]["location"]["lines"]["begin"] == 42
        assert "fingerprint" in result[0]

    def test_baseline_source_format(self):
        entries = [{
            "module": "my-module",
            "config": "comprehensive",
            "findings": [
                {"source": "lib/auth.ts:L193", "risk": "MEDIUM", "resource": "Bucket (AWS::S3::Bucket)",
                 "change": "DeletionPolicy removed", "source_hash": "def456"},
            ],
        }]
        result = json.loads(to_codequality_json(entries, agent_name="baseline"))
        assert len(result) == 1
        assert result[0]["location"]["path"] == "lib/auth.ts"
        assert result[0]["location"]["lines"]["begin"] == 193
        assert result[0]["severity"] == "major"

    def test_skips_findings_without_file(self):
        entries = [{
            "package": "pkg-a",
            "findings": [
                {"file": "", "line": 0, "risk": "HIGH", "category": "encryption", "detail": "No file"},
                {"source": "Unknown - Please Investigate", "risk": "HIGH", "change": "Unknown"},
            ],
        }]
        result = json.loads(to_codequality_json(entries, agent_name="test"))
        assert len(result) == 0

    def test_empty_entries(self):
        result = json.loads(to_codequality_json([], agent_name="test"))
        assert result == []

    def test_fingerprint_stable_with_source_hash(self):
        entries = [{
            "package": "pkg-a",
            "findings": [
                {"file": "lib/a.ts", "line": 42, "risk": "HIGH", "category": "iam_policy",
                 "detail": "Wildcard", "source_hash": "stable123"},
            ],
        }]
        r1 = json.loads(to_codequality_json(entries, agent_name="compliance"))
        r2 = json.loads(to_codequality_json(entries, agent_name="compliance"))
        assert r1[0]["fingerprint"] == r2[0]["fingerprint"]

"""Tests for review.lib.kiro_integration — risk parsing and level extraction."""

import json
import os
import pytest


class TestParseRiskJson:
    """Tests for _parse_risk_json."""

    def test_valid_json(self):
        from review.lib.kiro_integration import _parse_risk_json

        raw = json.dumps({
            "overall_risk": "HIGH",
            "summary": "Test summary",
            "findings": [{"risk": "HIGH", "resource": "Foo", "change": "bar", "source": "x.ts:L1"}],
        })
        result = _parse_risk_json(raw)
        assert result is not None
        assert result["overall_risk"] == "HIGH"
        assert len(result["findings"]) == 1

    def test_json_with_markdown_fences(self):
        from review.lib.kiro_integration import _parse_risk_json

        raw = '```json\n{"overall_risk": "LOW", "findings": []}\n```'
        result = _parse_risk_json(raw)
        assert result is not None
        assert result["overall_risk"] == "LOW"

    def test_invalid_json(self):
        from review.lib.kiro_integration import _parse_risk_json

        result = _parse_risk_json("not json at all")
        assert result is None

    def test_json_without_findings(self):
        from review.lib.kiro_integration import _parse_risk_json

        raw = json.dumps({"overall_risk": "LOW"})
        result = _parse_risk_json(raw)
        assert result is None  # requires "findings" key


class TestParseRiskLevel:
    """Tests for _parse_risk_level."""

    def test_from_json_string(self):
        from review.lib.kiro_integration import _parse_risk_level

        raw = json.dumps({"overall_risk": "HIGH", "findings": []})
        assert _parse_risk_level(raw) == "HIGH"

    def test_from_dict(self):
        from review.lib.kiro_integration import _parse_risk_level

        assert _parse_risk_level({"overall_risk": "BLOCKING"}) == "BLOCKING"

    def test_medium_level(self):
        from review.lib.kiro_integration import _parse_risk_level

        raw = json.dumps({"overall_risk": "MEDIUM", "findings": []})
        assert _parse_risk_level(raw) == "MEDIUM"

    def test_non_json_returns_unknown(self):
        from review.lib.kiro_integration import _parse_risk_level

        # No regex fallback — non-JSON input returns UNKNOWN
        assert _parse_risk_level("Overall Risk: HIGH\nSome other text") == "UNKNOWN"

    def test_unknown_fallback(self):
        from review.lib.kiro_integration import _parse_risk_level

        assert _parse_risk_level("no risk info here") == "UNKNOWN"

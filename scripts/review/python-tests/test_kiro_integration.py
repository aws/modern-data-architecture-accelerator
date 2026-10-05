"""Tests for review.lib.kiro_integration — risk parsing and level extraction."""

import json
import os
import pytest


class TestBuildKiroCommand:
    """Tests for the assembled kiro-cli command (highest-blast-radius flags)."""

    def test_defaults(self, monkeypatch):
        from review.lib.kiro_integration import _build_kiro_command

        monkeypatch.delenv("KIRO_MODEL", raising=False)
        monkeypatch.delenv("KIRO_EFFORT", raising=False)
        cmd = _build_kiro_command("/tmp/prompt.md")

        assert cmd[:3] == ["kiro-cli", "chat", "--no-interactive"]
        assert "--model" in cmd
        assert cmd[cmd.index("--model") + 1] == "claude-opus-4.8"
        assert "--effort" in cmd
        assert cmd[cmd.index("--effort") + 1] == "high"
        assert cmd[-1] == "Read and follow the instructions in /tmp/prompt.md"

    def test_env_overrides(self, monkeypatch):
        from review.lib.kiro_integration import _build_kiro_command

        monkeypatch.setenv("KIRO_MODEL", "claude-sonnet-4.6")
        monkeypatch.setenv("KIRO_EFFORT", "max")
        cmd = _build_kiro_command("/tmp/prompt.md")

        assert cmd[cmd.index("--model") + 1] == "claude-sonnet-4.6"
        assert cmd[cmd.index("--effort") + 1] == "max"


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

    def test_summary_shape_accepted_with_required_keys(self):
        from review.lib.kiro_integration import _parse_risk_json

        raw = json.dumps({"change_summary": "**Why:** x", "code_changes": []})
        result = _parse_risk_json(raw, required_keys=("change_summary",))
        assert result is not None
        assert result["change_summary"] == "**Why:** x"

    def test_summary_shape_rejected_by_default(self):
        from review.lib.kiro_integration import _parse_risk_json

        raw = json.dumps({"change_summary": "**Why:** x", "code_changes": []})
        assert _parse_risk_json(raw) is None

    def test_required_keys_all_must_be_present(self):
        from review.lib.kiro_integration import _parse_risk_json

        raw = json.dumps({"change_summary": "x"})
        assert _parse_risk_json(raw, required_keys=("change_summary", "commit_log")) is None

    def test_required_keys_with_markdown_fences(self):
        from review.lib.kiro_integration import _parse_risk_json

        raw = '```json\n{"change_summary": "x"}\n```'
        result = _parse_risk_json(raw, required_keys=("change_summary",))
        assert result == {"change_summary": "x"}

    def test_non_object_json_rejected(self):
        from review.lib.kiro_integration import _parse_risk_json

        assert _parse_risk_json('["change_summary"]', required_keys=("change_summary",)) is None


class TestRunKiroAssessmentValidation:
    """Tests for validate_json retries in run_kiro_assessment (kiro-cli stubbed)."""

    SUMMARY_ANSWER = json.dumps({"change_summary": "**Why:** x", "code_changes": []})
    RISK_ANSWER = json.dumps({"overall_risk": "LOW", "findings": []})

    def test_summary_accepted_first_attempt_with_required_keys(self, fake_kiro, capsys):
        from review.lib.kiro_integration import run_kiro_assessment

        fake_kiro.answers = [self.SUMMARY_ANSWER]
        result = run_kiro_assessment("{output_file}", validate_json=True, required_keys=("change_summary",))

        assert result == self.SUMMARY_ANSWER
        assert len(fake_kiro.calls) == 1
        assert "not valid JSON" not in capsys.readouterr().out

    def test_summary_retried_with_default_required_keys(self, fake_kiro, capsys):
        from review.lib.kiro_integration import run_kiro_assessment

        fake_kiro.answers = [self.SUMMARY_ANSWER]
        result = run_kiro_assessment("{output_file}", validate_json=True)

        # Falls back to the raw last answer after exhausting retries
        assert result == self.SUMMARY_ANSWER
        assert len(fake_kiro.calls) == 3
        assert "not valid JSON after 3 attempts" in capsys.readouterr().out

    def test_findings_accepted_first_attempt_by_default(self, fake_kiro, capsys):
        from review.lib.kiro_integration import run_kiro_assessment

        fake_kiro.answers = [self.RISK_ANSWER]
        result = run_kiro_assessment("{output_file}", validate_json=True)

        assert result == self.RISK_ANSWER
        assert len(fake_kiro.calls) == 1
        assert "not valid JSON" not in capsys.readouterr().out

    def test_invalid_answer_retries_then_falls_back(self, fake_kiro, capsys):
        from review.lib.kiro_integration import run_kiro_assessment

        fake_kiro.answers = ["not json at all"]
        result = run_kiro_assessment("{output_file}", validate_json=True, required_keys=("change_summary",))

        assert result == "not json at all"
        assert len(fake_kiro.calls) == 3
        assert "not valid JSON after 3 attempts" in capsys.readouterr().out

    def test_retry_stops_once_answer_is_valid(self, fake_kiro):
        from review.lib.kiro_integration import run_kiro_assessment

        fake_kiro.answers = [json.dumps({"code_changes": []}), self.SUMMARY_ANSWER]
        result = run_kiro_assessment("{output_file}", validate_json=True, required_keys=("change_summary",))

        assert result == self.SUMMARY_ANSWER
        assert len(fake_kiro.calls) == 2


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

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Tests for GenAI/Bedrock assessment integration."""

import json

import pytest

from change_risk_assessor.assessment import (
    AssessmentError,
    AssessmentOutput,
    assess_all_modules,
    assess_single_module,
)


class TestAssessSingleModule:
    def test_writes_valid_json(self, tmp_path):
        diff_file = tmp_path / "mod-a" / "diff.txt"
        diff_file.parent.mkdir()
        diff_file.write_text("some diff content")
        output = tmp_path / "mod-a" / "assessment.json"

        result = assess_single_module(
            diff_file=diff_file,
            output_path=output,
        )

        assert output.exists()
        assert isinstance(result, AssessmentOutput)
        assert result.risk_score == 1
        assert result.summary
        assert isinstance(result.identified_risks, list)
        assert isinstance(result.recommendations, list)
        assert result.metadata.timestamp
        assert result.metadata.model_version
        # Verify file content matches structured output
        data = json.loads(output.read_text())
        assert data == result.to_dict()


class TestAssessAllModules:
    def test_assesses_multiple_modules(self, tmp_path):
        diff_output = tmp_path / "diff-output"
        for name in ("mod-a", "mod-b"):
            mod_dir = diff_output / name
            mod_dir.mkdir(parents=True)
            (mod_dir / "diff.txt").write_text(f"diff for {name}")

        diff_files = sorted(diff_output.rglob("diff.txt"))
        results = assess_all_modules(
            diff_files=diff_files,
            diff_output=diff_output,
        )

        assert len(results) == 2
        names = {r.module_name for r in results}
        assert names == {"mod-a", "mod-b"}
        assert all(r.risk_score == 1 for r in results)
        assert all(r.assessment_path.exists() for r in results)

    def test_returns_empty_for_no_diffs(self, tmp_path):
        results = assess_all_modules(
            diff_files=[],
            diff_output=tmp_path,
        )
        assert results == []

    def test_raises_on_invalid_output(self, tmp_path, monkeypatch):
        diff_output = tmp_path / "diff-output"
        mod_dir = diff_output / "bad-mod"
        mod_dir.mkdir(parents=True)
        (mod_dir / "diff.txt").write_text("some diff")

        # Patch assess_single_module to return a non-AssessmentOutput object
        def return_bad_data(*, diff_file, output_path):
            output_path.write_text("{}")
            return "not an AssessmentOutput"

        monkeypatch.setattr(
            "change_risk_assessor.assessment.assess_single_module",
            return_bad_data,
        )

        with pytest.raises(AssessmentError, match="1 module"):
            assess_all_modules(
                diff_files=[mod_dir / "diff.txt"],
                diff_output=diff_output,
            )

    def test_raises_on_assessment_exception(self, tmp_path, monkeypatch):
        diff_output = tmp_path / "diff-output"
        mod_dir = diff_output / "failing-mod"
        mod_dir.mkdir(parents=True)
        (mod_dir / "diff.txt").write_text("some diff")

        def raise_error(*, diff_file, output_path):
            raise AssessmentError("bedrock exploded")

        monkeypatch.setattr(
            "change_risk_assessor.assessment.assess_single_module",
            raise_error,
        )

        with pytest.raises(AssessmentError, match="1 module"):
            assess_all_modules(
                diff_files=[mod_dir / "diff.txt"],
                diff_output=diff_output,
            )

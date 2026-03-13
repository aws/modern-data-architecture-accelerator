# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Tests for risk score computation and threshold evaluation."""

import pytest

from change_risk_assessor.scoring import (
    InvalidRiskScore,
    ModuleScore,
    compute_max_risk_score,
    evaluate_risk,
)


class TestModuleScore:
    def test_valid_scores(self):
        for score in (1, 2, 3, 4):
            ms = ModuleScore(name="test-module", score=score)
            assert ms.score == score

    def test_invalid_score_zero(self):
        with pytest.raises(InvalidRiskScore, match="Invalid risk score"):
            ModuleScore(name="bad-module", score=0)

    def test_invalid_score_five(self):
        with pytest.raises(InvalidRiskScore, match="Invalid risk score"):
            ModuleScore(name="bad-module", score=5)

    def test_label(self):
        assert ModuleScore(name="m", score=1).label == "low"
        assert ModuleScore(name="m", score=2).label == "medium"
        assert ModuleScore(name="m", score=3).label == "high"
        assert ModuleScore(name="m", score=4).label == "critical"


class TestComputeMaxRiskScore:
    def test_empty_list_returns_none(self):
        assert compute_max_risk_score([]) == 0

    def test_single_module(self):
        scores = [ModuleScore(name="a", score=3)]
        assert compute_max_risk_score(scores) == 3

    def test_multiple_modules_returns_max(self):
        scores = [
            ModuleScore(name="a", score=1),
            ModuleScore(name="b", score=4),
            ModuleScore(name="c", score=2),
        ]
        assert compute_max_risk_score(scores) == 4

    def test_all_same_score(self):
        scores = [
            ModuleScore(name="a", score=2),
            ModuleScore(name="b", score=2),
        ]
        assert compute_max_risk_score(scores) == 2


class TestEvaluateRisk:
    def test_below_threshold_passes(self):
        assert evaluate_risk(risk_score=2, threshold=3) is True

    def test_at_threshold_fails(self):
        assert evaluate_risk(risk_score=3, threshold=3) is False

    def test_above_threshold_fails(self):
        assert evaluate_risk(risk_score=4, threshold=3) is False

    def test_score_one_threshold_one_fails(self):
        assert evaluate_risk(risk_score=1, threshold=1) is False

    def test_score_one_threshold_two_passes(self):
        assert evaluate_risk(risk_score=1, threshold=2) is True

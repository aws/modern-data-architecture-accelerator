# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Tests for markdown report generation."""

import json

import pytest

from change_risk_assessor.report import ModuleDetail, generate_report
from change_risk_assessor.scoring import ModuleScore


@pytest.fixture()
def passing_assessment(tmp_path):
    """Create a low-risk assessment JSON file."""
    path = tmp_path / "passing" / "assessment.json"
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps({
        "risk_score": 1,
        "summary": "No significant changes.",
        "identified_risks": [],
        "recommendations": [],
    }))
    return path


@pytest.fixture()
def failing_assessment(tmp_path):
    """Create a high-risk assessment JSON file."""
    path = tmp_path / "failing" / "assessment.json"
    path.parent.mkdir(parents=True)
    path.write_text(json.dumps({
        "risk_score": 3,
        "summary": "Security group rules were modified.",
        "identified_risks": [
            {
                "category": "Security",
                "description": "Ingress rule opened to 0.0.0.0/0",
                "severity": "high",
                "affected_resources": ["sg-12345"],
            }
        ],
        "recommendations": [
            "Restrict ingress to specific CIDR ranges"
        ],
    }))
    return path


class TestGenerateReport:
    def test_passed_report_header(self, passing_assessment):
        modules = [
            ModuleDetail(
                score=ModuleScore(name="org/domain/env/mod-a", score=1),
                assessment_path=passing_assessment,
            ),
        ]
        report = generate_report(
            modules=modules, risk_score=1, threshold=3, passed=True,
        )
        assert "**Result: PASSED**" in report
        assert "risk score 1 (low)" in report
        assert "threshold 3 (high)" in report

    def test_blocked_report_header(self, failing_assessment):
        modules = [
            ModuleDetail(
                score=ModuleScore(name="org/domain/env/mod-b", score=3),
                assessment_path=failing_assessment,
            ),
        ]
        report = generate_report(
            modules=modules, risk_score=3, threshold=3, passed=False,
        )
        assert "**Result: BLOCKED**" in report
        assert "risk score 3 (high)" in report

    def test_module_table(self, passing_assessment, failing_assessment):
        modules = [
            ModuleDetail(
                score=ModuleScore(name="mod-a", score=1),
                assessment_path=passing_assessment,
            ),
            ModuleDetail(
                score=ModuleScore(name="mod-b", score=3),
                assessment_path=failing_assessment,
            ),
        ]
        report = generate_report(
            modules=modules, risk_score=3, threshold=3, passed=False,
        )
        assert "| `mod-a` | 1 | low | ✅ pass |" in report
        assert "| `mod-b` | 3 | high | ❌ **BLOCKED** |" in report

    def test_failing_module_details(self, failing_assessment):
        modules = [
            ModuleDetail(
                score=ModuleScore(name="mod-b", score=3),
                assessment_path=failing_assessment,
            ),
        ]
        report = generate_report(
            modules=modules, risk_score=3, threshold=3, passed=False,
        )
        assert "## Modules Exceeding Threshold" in report
        assert "Security group rules were modified." in report
        assert "Ingress rule opened to 0.0.0.0/0" in report
        assert "sg-12345" in report
        assert "Restrict ingress to specific CIDR ranges" in report

    def test_no_failing_details_when_all_pass(self, passing_assessment):
        modules = [
            ModuleDetail(
                score=ModuleScore(name="mod-a", score=1),
                assessment_path=passing_assessment,
            ),
        ]
        report = generate_report(
            modules=modules, risk_score=1, threshold=3, passed=True,
        )
        assert "Modules Exceeding Threshold" not in report

    def test_empty_modules(self):
        report = generate_report(
            modules=[], risk_score=1, threshold=3, passed=True,
        )
        assert "No infrastructure changes detected." in report

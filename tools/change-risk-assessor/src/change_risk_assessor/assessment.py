# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""GenAI/Bedrock integration for infrastructure change risk assessment.

Currently, a stub that returns a low-risk score. Replace the body of
``assess_single_module`` with actual Bedrock calls when ready.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

logger = logging.getLogger(__name__)


class AssessmentError(Exception):
    """Raised when a module assessment fails or times out."""


@dataclass(frozen=True)
class IdentifiedRisk:
    """A single risk identified during assessment."""

    severity: str
    category: str
    description: str
    affected_resources: list[str]


@dataclass(frozen=True)
class AssessmentMetadata:
    """Metadata about how an assessment was produced."""

    timestamp: str
    model_version: str


@dataclass(frozen=True)
class AssessmentOutput:
    """Structured output from a single module assessment."""

    risk_score: int
    summary: str
    identified_risks: list[IdentifiedRisk]
    recommendations: list[str]
    metadata: AssessmentMetadata

    def to_dict(self) -> dict:
        """Serialize to a dict suitable for JSON output."""
        return {
            "risk_score": self.risk_score,
            "summary": self.summary,
            "identified_risks": [
                {
                    "severity": r.severity,
                    "category": r.category,
                    "description": r.description,
                    "affected_resources": r.affected_resources,
                }
                for r in self.identified_risks
            ],
            "recommendations": self.recommendations,
            "assessment_metadata": {
                "timestamp": self.metadata.timestamp,
                "model_version": self.metadata.model_version,
            },
        }

    @classmethod
    def from_dict(cls, data: dict) -> AssessmentOutput:
        """Deserialize from a dict (e.g. parsed from JSON)."""
        meta = data.get("assessment_metadata", {})
        return cls(
            risk_score=data["risk_score"],
            summary=data.get("summary", ""),
            identified_risks=[
                IdentifiedRisk(
                    severity=r.get("severity", "unknown"),
                    category=r.get("category", "unknown"),
                    description=r.get("description", ""),
                    affected_resources=r.get("affected_resources", []),
                )
                for r in data.get("identified_risks", [])
            ],
            recommendations=data.get("recommendations", []),
            metadata=AssessmentMetadata(
                timestamp=meta.get("timestamp", ""),
                model_version=meta.get("model_version", ""),
            ),
        )


@dataclass(frozen=True)
class AssessmentResult:
    """Result of assessing a single module's diff."""

    module_name: str
    risk_score: int
    assessment_path: Path


def assess_single_module(
        *,
        diff_file: Path,
        output_path: Path,
) -> AssessmentOutput:
    """Assess a single module's diff, write the result to *output_path*, and return it.

    This is currently a stub returning score 1. Replace with actual
    Bedrock integration in a follow-up.
    """
    logger.info("Assessing: %s", diff_file)

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # Stub response — replace with real GenAI call
    assessment = AssessmentOutput(
        risk_score=1,
        summary=(
            "Stub assessment — no real GenAI analysis performed. "
            "Replace with actual implementation."
        ),
        identified_risks=[],
        recommendations=[
            "Implement actual GenAI risk assessment integration",
        ],
        metadata=AssessmentMetadata(
            timestamp=timestamp,
            model_version="stub-v0",
        ),
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(assessment.to_dict(), indent=2))
    logger.info("Assessment written to %s (score: %d)", output_path, assessment.risk_score)
    return assessment


def assess_all_modules(
        *,
        diff_files: list[Path],
        diff_output: Path,
) -> list[AssessmentResult]:
    """Assess all module diffs and return results.

    Raises ``AssessmentError`` if any module fails — the pipeline is
    fail-closed to prevent unassessed changes from merging.
    """
    if not diff_files:
        logger.info("No diff files found. Nothing to assess.")
        return []

    logger.info("Modules to assess: %d", len(diff_files))
    results: list[AssessmentResult] = []
    failed: list[str] = []

    for diff_file in diff_files:
        module_dir = diff_file.parent
        module_name = str(module_dir.relative_to(diff_output))
        output_path = module_dir / "assessment.json"

        try:
            data = assess_single_module(
                diff_file=diff_file,
                output_path=output_path,
            )
        except AssessmentError as exc:
            logger.error("Assessment failed for %s: %s", module_name, exc)
            failed.append(module_name)
            continue

        try:
            score = data.risk_score
        except AttributeError as exc:
            logger.error("Invalid assessment result for %s: %s", module_name, exc)
            failed.append(module_name)
            continue

        results.append(
            AssessmentResult(
                module_name=module_name,
                risk_score=score,
                assessment_path=output_path,
            )
        )

    if failed:
        raise AssessmentError(f'Assessment failed for {len(failed)} module(s): {"".join(failed)}')

    return results

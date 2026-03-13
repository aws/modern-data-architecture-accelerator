# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Risk score computation and threshold evaluation."""

from __future__ import annotations

from dataclasses import dataclass

RISK_LABELS: dict[int, str] = {
    0: "none",
    1: "low",
    2: "medium",
    3: "high",
    4: "critical",
}


class InvalidRiskScore(Exception):
    """Raised when a risk score is outside the valid 1-4 range."""


@dataclass(frozen=True)
class ModuleScore:
    """Risk score for a single assessed module."""

    name: str
    score: int

    def __post_init__(self) -> None:
        if not 1 <= self.score <= 4:
            raise InvalidRiskScore(
                f"Invalid risk score '{self.score}' for module '{self.name}'. "
                f"Expected integer 1-4."
            )

    @property
    def label(self) -> str:
        return RISK_LABELS[self.score]


def compute_max_risk_score(module_scores: list[ModuleScore]) -> int:
    """Return the worst-case (max) risk score across all modules.

    Returns 0 (none) if no modules were assessed.
    """
    if not module_scores:
        return 0
    return max(m.score for m in module_scores)


def evaluate_risk(risk_score: int, threshold: int) -> bool:
    """Return True if the risk score is below the threshold (pass).

    Returns False (fail) when risk_score >= threshold.
    """
    return risk_score < threshold

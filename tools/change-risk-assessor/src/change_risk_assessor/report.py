# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Markdown report generation for risk assessment results."""

from __future__ import annotations

import json
import textwrap
from dataclasses import dataclass
from pathlib import Path

from change_risk_assessor.assessment import AssessmentOutput, IdentifiedRisk
from change_risk_assessor.scoring import RISK_LABELS, ModuleScore


@dataclass(frozen=True)
class ModuleDetail:
    """Full assessment detail for a single module."""

    score: ModuleScore
    assessment_path: Path

    def load_assessment(self) -> AssessmentOutput:
        """Load the assessment JSON from disk into a typed object."""
        data = json.loads(self.assessment_path.read_text())
        return AssessmentOutput.from_dict(data)


def generate_report(
    *,
    modules: list[ModuleDetail],
    risk_score: int,
    threshold: int,
    passed: bool,
    artifacts_url: str | None = None,
) -> str:
    """Generate a Markdown risk assessment report.

    Returns the report content as a string. The caller is responsible
    for writing it to disk.
    """
    risk_label = RISK_LABELS[risk_score]
    threshold_label = RISK_LABELS[threshold]

    if passed:
        result_line = (
            f"**Result: PASSED** — overall risk score {risk_score} "
            f"({risk_label}) is below threshold {threshold} ({threshold_label})"
        )
    else:
        result_line = (
            f"**Result: BLOCKED** — risk score {risk_score} "
            f"({risk_label}) meets or exceeds threshold {threshold} "
            f"({threshold_label})"
        )

    module_rows = _build_module_rows(modules, threshold) if modules else ""
    details_section = _build_details_section(modules, threshold)
    empty_notice = "" if modules else "\nNo infrastructure changes detected.\n"
    artifacts_line = f"\n📂 [Browse artifacts]({artifacts_url})\n" if artifacts_url else ""

    return textwrap.dedent("""\
        # Risk Assessment Report

        {result_line}
        {artifacts_line}
        ## Module Scores

        | Module | Score | Level | Status |
        |--------|-------|-------|--------|
        {module_rows}
        {details_section}
        {empty_notice}
    """).format(
        result_line=result_line,
        artifacts_line=artifacts_line,
        module_rows=module_rows,
        details_section=details_section,
        empty_notice=empty_notice,
    )


def _build_module_rows(modules: list[ModuleDetail], threshold: int) -> str:
    """Build the Markdown table rows for each module."""
    return "\n".join(
        f"| `{m.score.name}` | {m.score.score} | {m.score.label} "
        f"| {'❌ **BLOCKED**' if m.score.score >= threshold else '✅ pass'} |"
        for m in modules
    )


def _build_details_section(modules: list[ModuleDetail], threshold: int) -> str:
    """Build the detailed breakdown for modules exceeding the threshold."""
    failing = [m for m in modules if m.score.score >= threshold]
    if not failing:
        return ""

    module_sections = "\n\n".join(_build_module_detail(m) for m in failing)

    return f"## Modules Exceeding Threshold\n\n{module_sections}"


def _build_module_detail(mod: ModuleDetail) -> str:
    """Build the detail section for a single failing module."""
    assessment = mod.load_assessment()

    risks_block = _build_risks_block(assessment.identified_risks)
    recs_block = _build_recs_block(assessment.recommendations)

    return textwrap.dedent("""\
        ### `{name}` — score {score} ({label})

        {summary}
        {risks}
        {recs}
        _Details: `{name}/assessment.json`_\
    """).format(
        name=mod.score.name,
        score=mod.score.score,
        label=mod.score.label,
        summary=assessment.summary or "No summary",
        risks=risks_block,
        recs=recs_block,
    )


def _build_risks_block(risks: list[IdentifiedRisk]) -> str:
    """Build the identified risks block, or empty string if none."""
    if not risks:
        return ""

    items = "\n".join(
        f"- **[{r.severity}] {r.category}**: "
        f"{r.description} "
        f"_(affects: {', '.join(r.affected_resources)})_"
        for r in risks
    )
    return f"\n**Identified risks:**\n\n{items}\n"


def _build_recs_block(recs: list[str]) -> str:
    """Build the recommendations block, or empty string if none."""
    if not recs:
        return ""

    items = "\n".join(f"- {rec}" for rec in recs)
    return f"\n**Recommendations:**\n\n{items}\n"

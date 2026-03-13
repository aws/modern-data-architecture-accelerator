# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""End-to-end risk assessment pipeline orchestration.

Coordinates the full assessment flow: resolve baselines from S3,
run mdaa diff, assess each module, compute scores, and generate
the report. Called by the CLI entry point.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

from change_risk_assessor.assessment import assess_all_modules
from change_risk_assessor.config import (
    DEFAULT_MDAA_REPO_URL,
    RiskAssessmentConfig,
    resolve_repo_root,
)
from change_risk_assessor.diff import DiffError, find_diff_files, run_diff
from change_risk_assessor.git import get_main_branch_hash
from change_risk_assessor.gitlab import GitLabError, post_mr_discussion
from change_risk_assessor.report import ModuleDetail, generate_report
from change_risk_assessor.s3 import (
    baselines_exist,
    download_and_extract,
    download_metadata,
)
from change_risk_assessor.scoring import (
    RISK_LABELS,
    ModuleScore,
    compute_max_risk_score,
    evaluate_risk,
)

logger = logging.getLogger(__name__)


class PipelineError(Exception):
    """Raised when the pipeline encounters a fatal error."""


@dataclass(frozen=True)
class GitLabConfig:
    """Connection parameters for posting MR discussion threads."""

    api_url: str
    token: str
    project_id: str
    mr_iid: str


def run_assessment(
    *,
    cfg: RiskAssessmentConfig,
    bucket: str,
    work_dir: Path,
    mdaa_repo_url: str | None = None,
    gitlab_cfg: GitLabConfig | None = None,
    artifacts_url: str | None = None,
) -> bool:
    """Run the full risk assessment pipeline.

    Returns True if the assessment passed (risk below threshold),
    False if blocked.

    Raises ``PipelineError`` on fatal errors (missing baselines,
    diff failure, etc.).
    """
    repo_url = mdaa_repo_url or DEFAULT_MDAA_REPO_URL

    # Step 1: Resolve main branch hash
    logger.info("Resolving main branch commit hash...")
    commit_hash = get_main_branch_hash(repo_url)
    logger.info("Main branch commit: %s", commit_hash)

    # Step 2: Resolve config bundle path
    if cfg.config_bundle_path:
        bundle_path = cfg.config_bundle_path
    else:
        metadata = download_metadata(
            bucket=bucket,
            prefix=f"baselines/{commit_hash}",
            work_dir=work_dir,
            region=cfg.region,
        )
        bundle_path = metadata.default_config

    logger.info("Config bundle path: %s", bundle_path)

    # Step 3: Check baselines exist
    s3_prefix = f"baselines/{commit_hash}/{bundle_path}"
    if not baselines_exist(bucket=bucket, prefix=s3_prefix, region=cfg.region):
        raise PipelineError(
            f"No baselines found at s3://{bucket}/{s3_prefix}/. "
            f"Baselines must be generated after each GitHub release."
        )

    # Step 4: Download baselines
    templates_dir = work_dir / "templates"
    configs_dir = work_dir / "test-configs"

    download_and_extract(
        bucket=bucket, key=f"{s3_prefix}/templates.zip",
        extract_dir=templates_dir, work_dir=work_dir, region=cfg.region,
    )
    download_and_extract(
        bucket=bucket, key=f"{s3_prefix}/configs.zip",
        extract_dir=configs_dir, work_dir=work_dir, region=cfg.region,
    )

    # Step 5: Run diff
    mdaa_bin = resolve_repo_root() / "bin" / "mdaa"

    try:
        run_diff(
            mdaa_bin=mdaa_bin,
            config_path=configs_dir,
            baseline_path=templates_dir,
            diff_output=cfg.diff_output,
            domain=cfg.domain,
            module=cfg.module,
        )
    except DiffError as exc:
        raise PipelineError(str(exc)) from exc

    # Step 6: Assess
    diff_files = find_diff_files(cfg.diff_output)
    results = assess_all_modules(
        diff_files=diff_files,
        diff_output=cfg.diff_output,
    )

    # Step 7: Score and report
    module_details = [
        ModuleDetail(
            score=ModuleScore(name=r.module_name, score=r.risk_score),
            assessment_path=r.assessment_path,
        )
        for r in results
    ]
    risk_score = compute_max_risk_score([m.score for m in module_details])
    passed = evaluate_risk(risk_score, cfg.threshold)

    report_content = generate_report(
        modules=module_details,
        risk_score=risk_score,
        threshold=cfg.threshold,
        passed=passed,
        artifacts_url=artifacts_url,
    )

    report_path = cfg.diff_output / "report.md"
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(report_content)
    logger.info("Report saved to %s", report_path)

    # Summary
    logger.info("")
    logger.info("=== Risk Assessment Summary ===")
    logger.info("Overall risk score: %d (%s)", risk_score, RISK_LABELS[risk_score])
    logger.info("Threshold: %d (%s)", cfg.threshold, RISK_LABELS[cfg.threshold])
    logger.info("Modules assessed: %d", len(results))

    if not passed:
        logger.info("")
        logger.info("PIPELINE BLOCKED: See %s for details.", report_path)

    if not passed and gitlab_cfg:
        try:
            post_mr_discussion(
                api_url=gitlab_cfg.api_url,
                token=gitlab_cfg.token,
                project_id=gitlab_cfg.project_id,
                mr_iid=gitlab_cfg.mr_iid,
                body=report_content,
            )
        except GitLabError as exc:
            logger.warning("Could not post to MR: %s", exc)

    return passed

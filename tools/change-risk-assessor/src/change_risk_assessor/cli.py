# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""CLI entry points for the change risk assessor.

Handles argument parsing only. All business logic lives in
``pipeline.py`` and the other modules.
"""

from __future__ import annotations

import contextlib
import logging
import shutil
import sys
import tempfile
from collections.abc import Iterator
from pathlib import Path

import click

from change_risk_assessor.baseline import BaselineError, run_baseline_generation
from change_risk_assessor.config import (
    ConfigError,
    create_baseline_config,
    create_risk_assessment_config,
)
from change_risk_assessor.pipeline import GitLabConfig, PipelineError, run_assessment
from change_risk_assessor.s3 import resolve_bucket_name


def _setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(message)s",
        stream=sys.stderr,
    )


logger = logging.getLogger(__name__)

_GITLAB_OPTIONS = ("--gitlab-api-url", "--gitlab-token", "--gitlab-project-id", "--gitlab-mr-iid")


@contextlib.contextmanager
def _managed_work_dir(user_dir: Path | None) -> Iterator[Path]:
    """Yield a work directory, cleaning up temp dirs on exit."""
    if user_dir:
        user_dir.mkdir(parents=True, exist_ok=True)
        yield user_dir
        return

    tmp = Path(tempfile.mkdtemp())
    try:
        yield tmp
    finally:
        if tmp.exists():
            shutil.rmtree(tmp, ignore_errors=True)


def _resolve_gitlab_config(
    api_url: str | None,
    token: str | None,
    project_id: str | None,
    mr_iid: str | None,
) -> GitLabConfig | None:
    """Build a GitLabConfig if all options are provided.

    Raises ``SystemExit`` if only some options are set.
    """
    values = {"--gitlab-api-url": api_url, "--gitlab-token": token,
              "--gitlab-project-id": project_id, "--gitlab-mr-iid": mr_iid}
    provided = {k for k, v in values.items() if v is not None}
    missing = set(values) - provided

    if not provided:
        return None
    if missing:
        raise SystemExit(
            f"Incomplete GitLab config: got {', '.join(sorted(provided))} "
            f"but missing {', '.join(sorted(missing))}. "
            f"Provide all four --gitlab-* options or none."
        )
    return GitLabConfig(
        api_url=api_url,  # type: ignore[arg-type]
        token=token,  # type: ignore[arg-type]
        project_id=project_id,  # type: ignore[arg-type]
        mr_iid=mr_iid,  # type: ignore[arg-type]
    )


@click.command()
@click.option("--region", default=None, help="AWS region for the S3 bucket.")
@click.option("--bucket", default=None, help="S3 bucket name.")
@click.option("--threshold", default=3, type=click.IntRange(1, 4),
              help="Risk score that triggers failure (1-4).")
@click.option("--diff-output", required=True,
              help="Path for diff output and assessment JSON.")
@click.option("--timeout", default=300, type=int,
              help="Timeout per module for GenAI assessment (seconds).")
@click.option("--config-bundle-path", default=None,
              help="Override config bundle path (skip metadata.json lookup).")
@click.option("--work-dir", default=None,
              help="Directory for intermediate files (persists for debugging).")
@click.option("--domain", default=None, help="Filter to a specific domain.")
@click.option("--module", default=None, help="Filter to a specific module.")
@click.option("--mdaa-repo-url", default=None,
              help="MDAA GitHub repository URL.")
@click.option("--gitlab-api-url", default=None,
              help="GitLab API base URL (e.g. https://gitlab.example.com/api/v4).")
@click.option("--gitlab-token", default=None,
              help="GitLab project access token.")
@click.option("--gitlab-project-id", default=None,
              help="GitLab project ID or URL-encoded path.")
@click.option("--gitlab-mr-iid", default=None,
              help="Merge request IID.")
@click.option("--artifacts-url", default=None,
              help="URL to the GitLab job artifacts browser (included in report).")
def assess_risk(
    region: str | None,
    bucket: str | None,
    threshold: int,
    diff_output: str,
    timeout: int,
    config_bundle_path: str | None,
    work_dir: str | None,
    domain: str | None,
    module: str | None,
    mdaa_repo_url: str | None,
    gitlab_api_url: str | None,
    gitlab_token: str | None,
    gitlab_project_id: str | None,
    gitlab_mr_iid: str | None,
    artifacts_url: str | None,
) -> None:
    """Run risk assessment against an MR's infrastructure changes."""
    _setup_logging()

    try:
        cfg = create_risk_assessment_config(
            region=region,
            bucket=bucket,
            threshold=threshold,
            diff_output=diff_output,
            timeout=timeout,
            config_bundle_path=config_bundle_path,
            work_dir=work_dir,
            domain=domain,
            module=module,
        )
    except ConfigError as exc:
        raise SystemExit(str(exc))

    resolved_bucket = resolve_bucket_name(bucket=cfg.bucket, region=cfg.region)
    gitlab_cfg = _resolve_gitlab_config(
        gitlab_api_url, gitlab_token, gitlab_project_id, gitlab_mr_iid,
    )

    with _managed_work_dir(cfg.work_dir) as actual_work_dir:
        try:
            passed = run_assessment(
                cfg=cfg,
                bucket=resolved_bucket,
                work_dir=actual_work_dir,
                mdaa_repo_url=mdaa_repo_url,
                gitlab_cfg=gitlab_cfg,
                artifacts_url=artifacts_url,
            )
        except PipelineError as exc:
            raise SystemExit(str(exc))

    if not passed:
        raise SystemExit(1)


@click.command()
@click.option("--region", default=None, help="AWS region for the S3 bucket.")
@click.option("--bucket", default=None, help="S3 bucket name.")
@click.option("--config-repo", default=None, help="Config repo path or URL.")
@click.option("--mdaa-repo-url", default=None,
              help="MDAA GitHub repository URL.")
@click.option("--use-local-cli", is_flag=True, default=False,
              help="Use current repo's bin/mdaa instead of the GitHub repo's.")
def generate_baselines(
    region: str | None,
    bucket: str | None,
    config_repo: str | None,
    mdaa_repo_url: str | None,
    use_local_cli: bool,
) -> None:
    """Generate and upload baseline templates to S3."""
    _setup_logging()

    try:
        cfg = create_baseline_config(
            region=region,
            bucket=bucket,
            config_repo=config_repo,
            mdaa_repo_url=mdaa_repo_url,
            use_local_cli=use_local_cli,
        )
    except ConfigError as exc:
        raise SystemExit(str(exc))

    resolved_bucket = resolve_bucket_name(bucket=cfg.bucket, region=cfg.region)

    with _managed_work_dir(None) as work_dir:
        try:
            run_baseline_generation(cfg=cfg, bucket=resolved_bucket, work_dir=work_dir)
        except BaselineError as exc:
            raise SystemExit(str(exc))

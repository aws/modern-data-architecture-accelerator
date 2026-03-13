# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Configuration validation, defaults, and environment variable handling."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

DEFAULT_MDAA_REPO_URL = (
    "https://github.com/aws/modern-data-architecture-accelerator.git"
)
DEFAULT_CONFIG_REPO = "git@ssh.gitlab.aws.dev:mdaa/mdaa-testing.git"
DEFAULT_RISK_THRESHOLD = 3
DEFAULT_ASSESSMENT_TIMEOUT = 300

# Subprocess timeouts (seconds) — grouped here for easy tuning
GIT_TIMEOUT = 60           # git ls-remote, rev-parse, etc.
GIT_CLONE_TIMEOUT = 300    # git clone (shallow, but network-dependent)
SYNTH_TIMEOUT = 1800       # mdaa synth (CDK synthesis can be slow)
DIFF_TIMEOUT = 1800        # mdaa diff (runs synth internally)


class ConfigError(Exception):
    """Raised when configuration validation fails."""


def resolve_repo_root() -> Path:
    """Walk up from this file to find the MDAA monorepo root.

    Looks for a directory containing ``package.json`` and ``bin/mdaa``.
    Raises ``ConfigError`` if the root cannot be found.
    """
    current = Path(__file__).resolve().parent
    for parent in current.parents:
        if (parent / "package.json").is_file() and (parent / "bin" / "mdaa").exists():
            return parent
    raise ConfigError(
        "Could not locate the MDAA repo root. "
        "Expected to find package.json and bin/mdaa in a parent directory of "
        f"{current}"
    )


def _resolve_region(region: str | None) -> str:
    """Return *region* if given, otherwise fall back to AWS_REGION env var."""
    resolved = region or os.environ.get("AWS_REGION")
    if not resolved:
        raise ConfigError(
            "AWS region is required. Pass --region or set the AWS_REGION "
            "environment variable."
        )
    return resolved


@dataclass(frozen=True)
class BaselineGenerationConfig:
    """Validated configuration for the baseline generation command."""

    region: str
    bucket: str | None = None
    config_repo: str = DEFAULT_CONFIG_REPO
    mdaa_repo_url: str = DEFAULT_MDAA_REPO_URL
    use_local_cli: bool = False


@dataclass(frozen=True)
class RiskAssessmentConfig:
    """Validated configuration for the risk assessment command."""

    region: str
    diff_output: Path
    bucket: str | None = None
    threshold: int = DEFAULT_RISK_THRESHOLD
    timeout: int = DEFAULT_ASSESSMENT_TIMEOUT
    config_bundle_path: str | None = None
    work_dir: Path | None = None
    domain: str | None = None
    module: str | None = None


def create_baseline_config(
    *,
    region: str | None = None,
    bucket: str | None = None,
    config_repo: str | None = None,
    mdaa_repo_url: str | None = None,
    use_local_cli: bool = False,
) -> BaselineGenerationConfig:
    """Validate inputs and build a BaselineGenerationConfig."""
    return BaselineGenerationConfig(
        region=_resolve_region(region),
        bucket=bucket,
        config_repo=config_repo or DEFAULT_CONFIG_REPO,
        mdaa_repo_url=mdaa_repo_url or DEFAULT_MDAA_REPO_URL,
        use_local_cli=use_local_cli,
    )


def create_risk_assessment_config(
    *,
    region: str | None = None,
    bucket: str | None = None,
    threshold: int = DEFAULT_RISK_THRESHOLD,
    diff_output: str,
    timeout: int = DEFAULT_ASSESSMENT_TIMEOUT,
    config_bundle_path: str | None = None,
    work_dir: str | None = None,
    domain: str | None = None,
    module: str | None = None,
) -> RiskAssessmentConfig:
    """Validate inputs and build a RiskAssessmentConfig."""
    resolved_region = _resolve_region(region)

    if not 1 <= threshold <= 4:
        raise ConfigError(
            f"Invalid threshold '{threshold}'. Must be 1 (low), 2 (medium), "
            f"3 (high), or 4 (critical)."
        )

    if timeout <= 0:
        raise ConfigError(
            f"Invalid timeout '{timeout}'. Must be a positive integer."
        )

    return RiskAssessmentConfig(
        region=resolved_region,
        diff_output=Path(diff_output),
        bucket=bucket,
        threshold=threshold,
        timeout=timeout,
        config_bundle_path=config_bundle_path,
        work_dir=Path(work_dir) if work_dir else None,
        domain=domain,
        module=module,
    )

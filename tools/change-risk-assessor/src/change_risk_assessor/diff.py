# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Orchestration of mdaa diff (synthesis + diff generation)."""

from __future__ import annotations

import logging
import subprocess
import sys
from pathlib import Path

from change_risk_assessor.config import DIFF_TIMEOUT

logger = logging.getLogger(__name__)


class DiffError(Exception):
    """Raised when mdaa diff fails."""


def run_diff(
    *,
    mdaa_bin: Path,
    config_path: Path,
    baseline_path: Path,
    diff_output: Path,
    domain: str | None = None,
    module: str | None = None,
) -> None:
    """Run ``mdaa diff`` comparing current code against baseline templates.

    ``cdk diff`` runs synth internally, so no separate synth step is needed.
    The command runs from the repo root so CDK resolves local MDAA packages,
    and uses ``-c`` to point at the config file in the extracted bundle.
    """
    diff_output.mkdir(parents=True, exist_ok=True)
    stderr_log = diff_output / "diff_stderr.log"

    cmd = [
        str(mdaa_bin),
        "diff",
        "-c", str(config_path / "mdaa.yaml"),
        "--baseline", str(baseline_path),
        "--diff-out", str(diff_output),
    ]

    if domain:
        cmd.extend(["-d", domain])
    if module:
        cmd.extend(["-m", module])

    repo_root = mdaa_bin.parent.parent
    logger.info("Running mdaa diff from %s", repo_root)
    logger.info("  Config: %s", config_path / "mdaa.yaml")
    logger.info("  Command: %s", " ".join(cmd))

    result = subprocess.run(
        cmd,
        cwd=repo_root,
        stdout=subprocess.PIPE,
        stderr=sys.stderr,
        text=True,
        timeout=DIFF_TIMEOUT,
    )

    # stdout is captured for the log file
    if result.stdout:
        stderr_log.write_text(result.stdout)

    if result.returncode != 0:
        raise DiffError(
            f"mdaa diff failed with exit code {result.returncode}. "
            f"See {stderr_log} for details."
        )

    logger.info("Diff generation completed successfully.")


def find_diff_files(diff_output: Path) -> list[Path]:
    """Find all per-module diff.txt files under the diff output directory."""
    return sorted(diff_output.rglob("diff.txt"))

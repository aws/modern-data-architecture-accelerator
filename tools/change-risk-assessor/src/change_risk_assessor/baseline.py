# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Baseline generation pipeline orchestration.

Coordinates the full baseline generation flow: clone repos, run synth,
zip artifacts, upload to S3, and verify. Called by the CLI entry point.
"""

from __future__ import annotations

import logging
import subprocess
import zipfile
from pathlib import Path

from change_risk_assessor.config import (
    DEFAULT_MDAA_REPO_URL,
    SYNTH_TIMEOUT,
    BaselineGenerationConfig,
    resolve_repo_root,
)
from change_risk_assessor.git import clone_repo, resolve_config_repo
from change_risk_assessor.s3 import (
    baselines_exist,
    ensure_bucket_exists,
    upload_file,
    upload_metadata,
)

logger = logging.getLogger(__name__)


class BaselineError(Exception):
    """Raised when baseline generation encounters a fatal error."""


def _zip_directory(
    *,
    source_dir: Path,
    output_path: Path,
    exclude_prefixes: tuple[str, ...] = (),
    exclude_names: tuple[str, ...] = (),
) -> None:
    """Zip the contents of *source_dir* into *output_path*.

    Files matching *exclude_prefixes* (checked against relative path
    components) or *exclude_names* are skipped.
    """
    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file_path in sorted(source_dir.rglob("*")):
            if not file_path.is_file():
                continue
            rel = file_path.relative_to(source_dir)
            rel_str = str(rel)

            if any(part.startswith(p) for p in exclude_prefixes for part in rel.parts):
                continue
            if rel.name in exclude_names:
                continue

            zf.write(file_path, rel_str)


def _zip_config_bundle(*, config_path: Path, output_path: Path) -> None:
    """Zip a config repo directory, excluding .git and node_modules."""
    _zip_directory(
        source_dir=config_path,
        output_path=output_path,
        exclude_prefixes=(".git", "node_modules"),
        exclude_names=(".DS_Store",),
    )


def _zip_templates(*, synth_dir: Path, output_path: Path) -> None:
    """Zip synthesized templates, excluding asset bundles and stderr logs."""
    _zip_directory(
        source_dir=synth_dir,
        output_path=output_path,
        exclude_prefixes=("asset.",),
        exclude_names=("synth_stderr.log",),
    )


def _run_synth(
    *,
    mdaa_bin: Path,
    config_path: Path,
    synth_dir: Path,
) -> None:
    """Run ``mdaa synth --cdk-out`` from the config directory."""
    synth_dir.mkdir(parents=True, exist_ok=True)
    stderr_log = synth_dir / "synth_stderr.log"

    logger.info("Running mdaa synth")
    logger.info("  CLI: %s", mdaa_bin)
    logger.info("  Config: %s", config_path)
    logger.info("  Output: %s", synth_dir)

    result = subprocess.run(
        [str(mdaa_bin), "synth", "--cdk-out", str(synth_dir)],
        cwd=config_path,
        capture_output=True,
        text=True,
        timeout=SYNTH_TIMEOUT,
    )

    if result.stderr:
        stderr_log.write_text(result.stderr)

    if result.returncode != 0:
        raise BaselineError(
            f"Synthesis failed (exit code {result.returncode}). "
            f"See {stderr_log} for details."
        )

    logger.info("Synthesis completed.")


def run_baseline_generation(
    *,
    cfg: BaselineGenerationConfig,
    bucket: str,
    work_dir: Path,
) -> None:
    """Run the full baseline generation pipeline.

    Raises ``BaselineError`` on fatal errors.
    """
    repo_url = cfg.mdaa_repo_url or DEFAULT_MDAA_REPO_URL

    # Step 1: Ensure bucket exists
    ensure_bucket_exists(bucket=bucket, region=cfg.region)

    # Step 2: Clone MDAA GitHub repo at main
    mdaa_clone_dir = work_dir / "mdaa-github"
    commit_hash = clone_repo(repo_url=repo_url, dest=mdaa_clone_dir)
    logger.info("GitHub main commit: %s", commit_hash)

    # Step 3: Determine which bin/mdaa to use
    if cfg.use_local_cli:
        mdaa_bin = resolve_repo_root() / "bin" / "mdaa"
        logger.info("Using LOCAL repo CLI: %s", mdaa_bin)
    else:
        mdaa_bin = mdaa_clone_dir / "bin" / "mdaa"
        logger.info("Using GITHUB repo CLI: %s", mdaa_bin)

    # Step 4: Resolve config repo
    resolved = resolve_config_repo(repo=cfg.config_repo, work_dir=work_dir)
    bundle_name = f"{resolved.name}_{resolved.commit_hash}"
    logger.info("Config: %s/%s", resolved.name, resolved.commit_hash)

    # Step 5: Zip config bundle
    config_zip = work_dir / "config_bundles" / f"{bundle_name}.zip"
    config_zip.parent.mkdir(parents=True, exist_ok=True)
    _zip_config_bundle(config_path=resolved.local_path, output_path=config_zip)

    # Step 6: Run synth
    synth_dir = work_dir / "cdk.out" / bundle_name
    _run_synth(
        mdaa_bin=mdaa_bin,
        config_path=resolved.local_path,
        synth_dir=synth_dir,
    )

    # Step 7: Zip templates
    templates_zip = work_dir / "templates.zip"
    _zip_templates(synth_dir=synth_dir, output_path=templates_zip)

    # Step 8: Upload to S3
    s3_prefix = f"baselines/{commit_hash}/{resolved.name}/{resolved.commit_hash}"

    upload_file(
        bucket=bucket, key=f"{s3_prefix}/templates.zip",
        local_path=templates_zip, region=cfg.region,
    )
    upload_file(
        bucket=bucket, key=f"{s3_prefix}/configs.zip",
        local_path=config_zip, region=cfg.region,
    )
    upload_metadata(
        bucket=bucket, prefix=f"baselines/{commit_hash}",
        default_config=f"{resolved.name}/{resolved.commit_hash}",
        work_dir=work_dir, region=cfg.region,
    )

    # Step 9: Verify
    if not baselines_exist(bucket=bucket, prefix=s3_prefix, region=cfg.region):
        raise BaselineError(
            f"Verification failed: templates.zip not found at "
            f"s3://{bucket}/{s3_prefix}/"
        )

    logger.info("")
    logger.info("=== Baseline Generation Complete ===")
    logger.info("  S3: s3://%s/%s/", bucket, s3_prefix)
    logger.info("  MDAA commit: %s", commit_hash)
    logger.info("  Config: %s/%s", resolved.name, resolved.commit_hash)

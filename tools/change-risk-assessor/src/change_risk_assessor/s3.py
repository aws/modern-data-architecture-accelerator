# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""S3 utility functions shared by both CLI commands.

Provides helpers for bucket management, baseline upload/download,
zip extraction, and metadata handling. Both ``generate-baselines``
and ``assess-risk`` use these functions to interact with S3.
"""

from __future__ import annotations

import json
import logging
import zipfile
from dataclasses import dataclass
from pathlib import Path

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class BaselineMetadata:
    """Metadata stored alongside baselines in S3."""

    default_config: str

    def to_dict(self) -> dict:
        return {"default_config": self.default_config}

    @classmethod
    def from_dict(cls, data: dict) -> BaselineMetadata:
        return cls(default_config=data["default_config"])


def _s3_client(region: str):
    """Create an S3 client for the given region."""
    return boto3.client("s3", region_name=region)


def _sts_client(region: str):
    """Create an STS client for the given region."""
    return boto3.client("sts", region_name=region)


def resolve_bucket_name(*, bucket: str | None, region: str) -> str:
    """Return the bucket name, deriving a default from the AWS account if needed.

    Default format: ``mdaa-baseline-{account_id}-{region}``
    """
    if bucket:
        return bucket

    sts = _sts_client(region)
    try:
        account_id = sts.get_caller_identity()["Account"]
    except ClientError as exc:
        raise RuntimeError(
            "Failed to determine AWS account ID for default bucket name. "
            "Set --bucket explicitly."
        ) from exc

    resolved = f"mdaa-baseline-{account_id}-{region}"
    logger.info("No bucket specified, using default: %s", resolved)
    return resolved


def ensure_bucket_exists(*, bucket: str, region: str) -> None:
    """Create the S3 bucket if it does not already exist.

    New buckets are created with versioning enabled and public access blocked.
    Handles the us-east-1 special case (no LocationConstraint).
    """
    s3 = _s3_client(region)

    try:
        s3.head_bucket(Bucket=bucket)
        logger.info("Bucket exists: %s", bucket)
        return
    except ClientError as exc:
        error_code = int(exc.response["Error"]["Code"])
        if error_code != 404:
            raise

    logger.info("Bucket %s does not exist, creating...", bucket)

    create_kwargs: dict = {"Bucket": bucket}
    if region != "us-east-1":
        create_kwargs["CreateBucketConfiguration"] = {
            "LocationConstraint": region,
        }
    s3.create_bucket(**create_kwargs)

    s3.put_bucket_versioning(
        Bucket=bucket,
        VersioningConfiguration={"Status": "Enabled"},
    )

    s3.put_public_access_block(
        Bucket=bucket,
        PublicAccessBlockConfiguration={
            "BlockPublicAcls": True,
            "IgnorePublicAcls": True,
            "BlockPublicPolicy": True,
            "RestrictPublicBuckets": True,
        },
    )

    logger.info("Bucket created: %s", bucket)


def baselines_exist(*, bucket: str, prefix: str, region: str) -> bool:
    """Check whether templates.zip exists at the given S3 prefix."""
    s3 = _s3_client(region)
    key = f"{prefix}/templates.zip"
    try:
        s3.head_object(Bucket=bucket, Key=key)
        return True
    except ClientError as exc:
        error_code = int(exc.response["Error"]["Code"])
        if error_code == 404:
            return False
        raise


def download_and_extract(
    *,
    bucket: str,
    key: str,
    extract_dir: Path,
    work_dir: Path,
    region: str,
) -> None:
    """Download a zip from S3 and extract it into *extract_dir*."""
    s3 = _s3_client(region)
    zip_name = key.rsplit("/", 1)[-1]
    local_zip = work_dir / zip_name

    extract_dir.mkdir(parents=True, exist_ok=True)
    s3.download_file(bucket, key, str(local_zip))

    with zipfile.ZipFile(local_zip, "r") as zf:
        for member in zf.namelist():
            target = (extract_dir / member).resolve()
            if not str(target).startswith(str(extract_dir.resolve())):
                raise RuntimeError(
                    f"Zip entry '{member}' would extract outside target directory"
                )
        zf.extractall(extract_dir)


def upload_file(
    *,
    bucket: str,
    key: str,
    local_path: Path,
    region: str,
) -> None:
    """Upload a local file to S3."""
    s3 = _s3_client(region)
    s3.upload_file(str(local_path), bucket, key)
    logger.info("Uploaded %s to s3://%s/%s", local_path.name, bucket, key)


def upload_metadata(
    *,
    bucket: str,
    prefix: str,
    default_config: str,
    work_dir: Path,
    region: str,
) -> None:
    """Write and upload metadata.json recording the default config bundle path."""
    metadata = BaselineMetadata(default_config=default_config)
    metadata_path = work_dir / "metadata.json"
    metadata_path.write_text(json.dumps(metadata.to_dict()))

    key = f"{prefix}/metadata.json"
    upload_file(bucket=bucket, key=key, local_path=metadata_path, region=region)


def download_metadata(
    *,
    bucket: str,
    prefix: str,
    work_dir: Path,
    region: str,
) -> BaselineMetadata:
    """Download and parse metadata.json from S3."""
    s3 = _s3_client(region)
    key = f"{prefix}/metadata.json"
    local_path = work_dir / "metadata.json"

    try:
        s3.download_file(bucket, key, str(local_path))
    except ClientError as exc:
        raise RuntimeError(
            f"No metadata.json found at s3://{bucket}/{key}. "
            f"Either set --config-bundle-path or regenerate baselines."
        ) from exc

    return BaselineMetadata.from_dict(json.loads(local_path.read_text()))

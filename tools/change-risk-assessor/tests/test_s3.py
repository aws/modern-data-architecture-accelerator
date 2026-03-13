# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Tests for S3 utility functions."""

import zipfile

import boto3
import pytest
from moto import mock_aws

from change_risk_assessor.s3 import (
    baselines_exist,
    download_and_extract,
    download_metadata,
    ensure_bucket_exists,
    resolve_bucket_name,
    upload_file,
    upload_metadata,
)

REGION = "eu-west-1"
BUCKET = "test-baseline-bucket"


@pytest.fixture()
def aws_env(monkeypatch):
    """Set dummy AWS credentials for moto."""
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SECURITY_TOKEN", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")
    monkeypatch.setenv("AWS_DEFAULT_REGION", REGION)


@pytest.fixture()
def s3_bucket(aws_env):
    """Create a mocked S3 bucket."""
    with mock_aws():
        s3 = boto3.client("s3", region_name=REGION)
        s3.create_bucket(
            Bucket=BUCKET,
            CreateBucketConfiguration={"LocationConstraint": REGION},
        )
        yield s3


class TestResolveBucketName:
    def test_returns_explicit_bucket(self):
        assert resolve_bucket_name(bucket="my-bucket", region=REGION) == "my-bucket"

    @mock_aws
    def test_derives_default_from_account(self, aws_env):
        name = resolve_bucket_name(bucket=None, region=REGION)
        # moto uses account 123456789012 by default
        assert name == f"mdaa-baseline-123456789012-{REGION}"

    def test_returns_explicit_even_without_credentials(self):
        assert resolve_bucket_name(bucket="explicit", region=REGION) == "explicit"


class TestEnsureBucketExists:
    @mock_aws
    def test_creates_bucket_when_missing(self, aws_env):
        ensure_bucket_exists(bucket="new-bucket", region=REGION)
        s3 = boto3.client("s3", region_name=REGION)
        # Bucket should exist now
        s3.head_bucket(Bucket="new-bucket")

        # Versioning should be enabled
        versioning = s3.get_bucket_versioning(Bucket="new-bucket")
        assert versioning["Status"] == "Enabled"

        # Public access should be blocked
        pab = s3.get_public_access_block(Bucket="new-bucket")
        config = pab["PublicAccessBlockConfiguration"]
        assert config["BlockPublicAcls"] is True
        assert config["IgnorePublicAcls"] is True
        assert config["BlockPublicPolicy"] is True
        assert config["RestrictPublicBuckets"] is True

    @mock_aws
    def test_skips_creation_when_exists(self, aws_env):
        s3 = boto3.client("s3", region_name=REGION)
        s3.create_bucket(
            Bucket="existing",
            CreateBucketConfiguration={"LocationConstraint": REGION},
        )
        # Should not raise
        ensure_bucket_exists(bucket="existing", region=REGION)

    @mock_aws
    def test_us_east_1_no_location_constraint(self, aws_env):
        ensure_bucket_exists(bucket="us-east-bucket", region="us-east-1")
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.head_bucket(Bucket="us-east-bucket")


class TestBaselinesExist:
    def test_returns_true_when_present(self, s3_bucket):
        s3_bucket.put_object(
            Bucket=BUCKET,
            Key="baselines/abc123/config/hash/templates.zip",
            Body=b"fake",
        )
        assert baselines_exist(
            bucket=BUCKET,
            prefix="baselines/abc123/config/hash",
            region=REGION,
        ) is True

    def test_returns_false_when_missing(self, s3_bucket):
        assert baselines_exist(
            bucket=BUCKET,
            prefix="baselines/nonexistent/config/hash",
            region=REGION,
        ) is False


class TestDownloadAndExtract:
    def test_extracts_zip_contents(self, s3_bucket, tmp_path):
        # Create a zip in memory and upload it
        zip_path = tmp_path / "source.zip"
        with zipfile.ZipFile(zip_path, "w") as zf:
            zf.writestr("template.yaml", "Resources: {}")
        s3_bucket.upload_file(str(zip_path), BUCKET, "path/to/templates.zip")

        extract_dir = tmp_path / "extracted"
        work_dir = tmp_path / "work"
        work_dir.mkdir()

        download_and_extract(
            bucket=BUCKET,
            key="path/to/templates.zip",
            extract_dir=extract_dir,
            work_dir=work_dir,
            region=REGION,
        )

        assert (extract_dir / "template.yaml").read_text() == "Resources: {}"


class TestUploadFile:
    def test_uploads_to_s3(self, s3_bucket, tmp_path):
        local_file = tmp_path / "data.txt"
        local_file.write_text("hello")

        upload_file(
            bucket=BUCKET,
            key="uploads/data.txt",
            local_path=local_file,
            region=REGION,
        )

        obj = s3_bucket.get_object(Bucket=BUCKET, Key="uploads/data.txt")
        assert obj["Body"].read().decode() == "hello"


class TestMetadata:
    def test_upload_and_download_roundtrip(self, s3_bucket, tmp_path):
        work_dir = tmp_path / "work"
        work_dir.mkdir()

        upload_metadata(
            bucket=BUCKET,
            prefix="baselines/abc123",
            default_config="mdaa-testing/def456",
            work_dir=work_dir,
            region=REGION,
        )

        download_dir = tmp_path / "download"
        download_dir.mkdir()

        metadata = download_metadata(
            bucket=BUCKET,
            prefix="baselines/abc123",
            work_dir=download_dir,
            region=REGION,
        )

        assert metadata.default_config == "mdaa-testing/def456"

    def test_download_raises_when_missing(self, s3_bucket, tmp_path):
        work_dir = tmp_path / "work"
        work_dir.mkdir()

        with pytest.raises(RuntimeError, match="No metadata.json found"):
            download_metadata(
                bucket=BUCKET,
                prefix="baselines/nonexistent",
                work_dir=work_dir,
                region=REGION,
            )

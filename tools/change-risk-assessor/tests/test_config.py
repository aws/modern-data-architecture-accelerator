# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Tests for configuration validation and defaults."""

from pathlib import Path

import pytest

from change_risk_assessor.config import (
    ConfigError,
    create_baseline_config,
    create_risk_assessment_config,
)


class TestBaselineGenerationConfig:
    def test_create_with_explicit_region(self):
        cfg = create_baseline_config(region="eu-west-1")
        assert cfg.region == "eu-west-1"

    def test_create_falls_back_to_env_var(self, monkeypatch):
        monkeypatch.setenv("AWS_REGION", "ap-southeast-1")
        cfg = create_baseline_config()
        assert cfg.region == "ap-southeast-1"

    def test_create_raises_when_no_region(self, monkeypatch):
        monkeypatch.delenv("AWS_REGION", raising=False)
        with pytest.raises(ConfigError, match="AWS region is required"):
            create_baseline_config()

    def test_explicit_region_overrides_env_var(self, monkeypatch):
        monkeypatch.setenv("AWS_REGION", "us-west-2")
        cfg = create_baseline_config(region="eu-central-1")
        assert cfg.region == "eu-central-1"

    def test_defaults(self):
        cfg = create_baseline_config(region="us-east-1")
        assert cfg.bucket is None
        assert "mdaa-testing" in cfg.config_repo
        assert "modern-data-architecture-accelerator" in cfg.mdaa_repo_url
        assert cfg.use_local_cli is False

    def test_custom_values(self):
        cfg = create_baseline_config(
            region="us-west-2",
            bucket="my-bucket",
            config_repo="/local/configs",
            mdaa_repo_url="https://example.com/mdaa.git",
            use_local_cli=True,
        )
        assert cfg.bucket == "my-bucket"
        assert cfg.config_repo == "/local/configs"
        assert cfg.mdaa_repo_url == "https://example.com/mdaa.git"
        assert cfg.use_local_cli is True

    def test_frozen(self):
        cfg = create_baseline_config(region="us-east-1")
        with pytest.raises(AttributeError):
            cfg.region = "eu-west-1"  # type: ignore[misc]


class TestRiskAssessmentConfig:
    def test_create_with_explicit_region(self):
        cfg = create_risk_assessment_config(region="us-west-2", diff_output="/tmp/out")
        assert cfg.region == "us-west-2"

    def test_create_falls_back_to_env_var(self, monkeypatch):
        monkeypatch.setenv("AWS_REGION", "eu-west-1")
        cfg = create_risk_assessment_config(diff_output="/tmp/out")
        assert cfg.region == "eu-west-1"

    def test_create_raises_when_no_region(self, monkeypatch):
        monkeypatch.delenv("AWS_REGION", raising=False)
        with pytest.raises(ConfigError, match="AWS region is required"):
            create_risk_assessment_config(diff_output="/tmp/out")

    def test_defaults(self):
        cfg = create_risk_assessment_config(region="us-east-1", diff_output="/tmp/out")
        assert cfg.threshold == 3
        assert cfg.diff_output == Path("/tmp/out")
        assert cfg.timeout == 300
        assert cfg.config_bundle_path is None
        assert cfg.work_dir is None
        assert cfg.domain is None
        assert cfg.module is None

    def test_valid_thresholds(self):
        for t in (1, 2, 3, 4):
            cfg = create_risk_assessment_config(
                region="us-east-1", diff_output="/tmp/out", threshold=t,
            )
            assert cfg.threshold == t

    def test_invalid_threshold_zero(self):
        with pytest.raises(ConfigError, match="Invalid threshold"):
            create_risk_assessment_config(region="us-east-1", diff_output="/tmp/out", threshold=0)

    def test_invalid_threshold_five(self):
        with pytest.raises(ConfigError, match="Invalid threshold"):
            create_risk_assessment_config(region="us-east-1", diff_output="/tmp/out", threshold=5)

    def test_invalid_timeout_zero(self):
        with pytest.raises(ConfigError, match="Invalid timeout"):
            create_risk_assessment_config(region="us-east-1", diff_output="/tmp/out", timeout=0)

    def test_invalid_timeout_negative(self):
        with pytest.raises(ConfigError, match="Invalid timeout"):
            create_risk_assessment_config(region="us-east-1", diff_output="/tmp/out", timeout=-1)

    def test_custom_values(self):
        cfg = create_risk_assessment_config(
            region="ap-northeast-1",
            bucket="custom-bucket",
            threshold=2,
            diff_output="/tmp/diffs",
            timeout=600,
            config_bundle_path="mdaa-testing/abc123",
            work_dir="/tmp/work",
            domain="analytics",
            module="glue-jobs",
        )
        assert cfg.bucket == "custom-bucket"
        assert cfg.threshold == 2
        assert cfg.diff_output == Path("/tmp/diffs")
        assert cfg.timeout == 600
        assert cfg.config_bundle_path == "mdaa-testing/abc123"
        assert cfg.work_dir == Path("/tmp/work")
        assert cfg.domain == "analytics"
        assert cfg.module == "glue-jobs"

    def test_frozen(self):
        cfg = create_risk_assessment_config(region="us-east-1", diff_output="/tmp/out")
        with pytest.raises(AttributeError):
            cfg.threshold = 1  # type: ignore[misc]

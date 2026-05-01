# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""Unit tests for ml_pipelines.model_package._get_approved_package."""

from unittest.mock import MagicMock, patch

import pytest
from botocore.exceptions import ClientError

from ml_pipelines.model_package import _get_approved_package

_REGION = "us-east-1"
_GROUP = "test-model-group"
_ARN = "arn:aws:sagemaker:us-east-1:123456789012:model-package/test-model-group/1"


def _make_client(packages, next_token=None):
    """Return a mock sagemaker client whose list_model_packages returns packages."""
    client = MagicMock()
    response = {"ModelPackageSummaryList": packages}
    if next_token:
        response["NextToken"] = next_token
    client.list_model_packages.return_value = response
    return client


class TestGetApprovedPackage:
    def test_returns_arn_when_package_found(self):
        client = _make_client([{"ModelPackageArn": _ARN}])
        with patch("ml_pipelines.model_package.boto3.client", return_value=client):
            result = _get_approved_package(_REGION, _GROUP)
        assert result == _ARN

    def test_returns_none_when_no_packages(self):
        client = _make_client([])
        with patch("ml_pipelines.model_package.boto3.client", return_value=client):
            result = _get_approved_package(_REGION, _GROUP)
        assert result is None

    def test_raises_on_client_error(self):
        client = MagicMock()
        client.list_model_packages.side_effect = ClientError(
            {"Error": {"Code": "ResourceNotFound", "Message": "group not found"}}, "ListModelPackages"
        )
        with patch("ml_pipelines.model_package.boto3.client", return_value=client):
            with pytest.raises(Exception, match="group not found"):
                _get_approved_package(_REGION, _GROUP)

    def test_uses_correct_region_and_group(self):
        client = _make_client([{"ModelPackageArn": _ARN}])
        with patch("ml_pipelines.model_package.boto3.client", return_value=client) as mock_boto:
            _get_approved_package("eu-west-1", "my-group")
        mock_boto.assert_called_once_with("sagemaker", region_name="eu-west-1")
        client.list_model_packages.assert_called_once()
        call_kwargs = client.list_model_packages.call_args[1]
        assert call_kwargs["ModelPackageGroupName"] == "my-group"
        assert call_kwargs["ModelApprovalStatus"] == "Approved"

# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
from typing import Optional

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


def _get_approved_package(region_name: str, model_package_group_name: str) -> Optional[str]:
    """Gets the latest approved model package for a model package group.
    Returns:
        The SageMaker Model Package ARN.
    """
    sm_client = boto3.client("sagemaker", region_name=region_name)

    try:
        # Get the latest approved model package
        response = sm_client.list_model_packages(
            ModelPackageGroupName=model_package_group_name,
            ModelApprovalStatus="Approved",
            SortBy="CreationTime",
            MaxResults=1,
        )
        approved_packages = response["ModelPackageSummaryList"]

        if not approved_packages:
            logger.warning(f"No approved ModelPackage found for ModelPackageGroup: {model_package_group_name}")
            return None

        model_package_arn = approved_packages[0]["ModelPackageArn"]
        logger.info(f"Identified the latest approved model package: {model_package_arn}")
        return model_package_arn  # type: ignore[no-any-return]

    except ClientError as e:
        error_message = e.response["Error"]["Message"]
        logger.error(error_message)
        raise Exception(error_message) from e

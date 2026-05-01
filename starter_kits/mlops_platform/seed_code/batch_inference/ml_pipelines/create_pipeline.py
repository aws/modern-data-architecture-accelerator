# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import argparse
import json
import logging
import os
import sys

logger = logging.getLogger(__name__)

from ml_pipelines.model_package import _get_approved_package
from ml_pipelines.transformer.pipeline import get_pipeline


def main() -> None:  # pragma: no cover
    parser = argparse.ArgumentParser("Gets the pipeline definition for the pipeline script.")

    parser.add_argument(
        "--role-arn",
        help="IAM Role ARN",
        type=str,
        required=True,
    )
    parser.add_argument(
        "--model-package-group-name",
        help="Model Package Group Name",
        type=str,
        required=True,
    )
    parser.add_argument(
        "--region",
        help="AWS Region",
        type=str,
        required=True,
    )
    parser.add_argument(
        "--artifact-bucket",
        type=str,
        required=True,
    )
    parser.add_argument(
        "--base-job-prefix",
        type=str,
        required=True,
    )
    parser.add_argument(
        "--pipeline-name",
        type=str,
        required=True,
    )
    parser.add_argument(
        "--description",
        type=str,
        default="Batch inference pipeline: CreateModel, Preprocess, Transform",
        help="Description of the pipeline",
    )
    parser.add_argument(
        "--bucket-kms-id",
        type=str,
        default=None,
        help="Optional KMS key ID for encrypting pipeline outputs",
    )
    parser.add_argument(
        "--tags",
        help="""List of dict strings of '[{"Key": "string", "Value": "string"}, ..]'""",
    )
    args = parser.parse_args()

    model_package_arn = _get_approved_package(
        region_name=args.region,
        model_package_group_name=args.model_package_group_name,
    )
    if model_package_arn is None:
        logger.error("No approved model package found in group '%s'.", args.model_package_group_name)
        sys.exit(1)

    enable_network_isolation = os.getenv("ENABLE_NETWORK_ISOLATION", "false").lower() == "true"
    encrypt_inter_container_traffic = os.getenv("ENCRYPT_INTER_CONTAINER_TRAFFIC", "true").lower() == "true"
    subnet_ids = json.loads(os.getenv("SUBNET_IDS", "[]"))
    security_group_ids = json.loads(os.getenv("SECURITY_GROUP_IDS", "[]"))

    try:
        pipeline = get_pipeline(
            role_arn=args.role_arn,
            model_package_arn=model_package_arn,
            region=args.region,
            artifact_bucket=args.artifact_bucket,
            base_job_prefix=args.base_job_prefix,
            pipeline_name=args.pipeline_name,
            bucket_kms_id=args.bucket_kms_id,
            enable_network_isolation=enable_network_isolation,
            encrypt_inter_container_traffic=encrypt_inter_container_traffic,
            subnet_ids=subnet_ids or None,
            security_group_ids=security_group_ids or None,
        )

        logger.info("SageMaker Pipeline definition: %s", pipeline.definition())

        tags = json.loads(args.tags) if args.tags else []
        logger.info("SageMaker Pipeline tags: %s", tags)

        upsert_response = pipeline.upsert(role_arn=args.role_arn, description=args.description, tags=tags)

        logger.info("Created/Updated SageMaker Pipeline. Response: %s", upsert_response)
    except Exception as e:
        logger.exception("Exception: %s", e)
        sys.exit(1)


if __name__ == "__main__":
    main()

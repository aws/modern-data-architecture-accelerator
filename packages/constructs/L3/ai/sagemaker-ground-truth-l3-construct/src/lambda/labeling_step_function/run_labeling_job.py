import json
import logging
import os
from typing import Any, Dict

import boto3
from botocore.config import Config
from _utils import create_labeling_job, download_json_dict_from_s3, SAGEMAKER_HUMAN_TASK_UI_ACCOUNT

_SDK_CONFIG = Config(connect_timeout=5, read_timeout=30, retries={"max_attempts": 2})

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3", config=_SDK_CONFIG)

OUTPUT_BUCKET = os.environ["OUTPUT_BUCKET"]
TASK_TYPE = os.environ["TASK_TYPE"]
SOURCE_KEY = os.environ["SOURCE_KEY"]
LABELING_JOB_NAME = os.environ["LABELING_JOB_NAME"]
HUMAN_TASK_CONFIG = json.loads(os.environ["HUMAN_TASK_CONFIG"])
AWS_REGION = os.environ["AWS_REGION"]
AC_ARN_MAP = json.loads(os.environ["AC_ARN_MAP"])
FUNCTION_NAME = os.environ["FUNCTION_NAME"]

# Validate region is supported for annotation consolidation
if AWS_REGION not in AC_ARN_MAP:
    raise ValueError(
        f"Region '{AWS_REGION}' is not supported for Ground Truth annotation consolidation. "
        f"Supported regions: {', '.join(sorted(AC_ARN_MAP.keys()))}. "
        f"See: https://docs.aws.amazon.com/sagemaker/latest/dg/sms-annotation-consolidation.html"
    )
TASK_TITLE = os.environ["TASK_TITLE"]
TASK_DESCRIPTION = os.environ["TASK_DESCRIPTION"]
TASK_KEYWORDS = json.loads(os.environ["TASK_KEYWORDS"])
WORKTEAM_ARN = os.environ["WORKTEAM_ARN"]
TASK_PRICE = json.loads(os.environ["TASK_PRICE"])
INSTRUCTIONS_TEMPLATE_S3_URI = os.getenv("INSTRUCTIONS_TEMPLATE_S3_URI", None)
HUMAN_TASK_UI_NAME = os.getenv("HUMAN_TASK_UI_NAME", None)
GROUND_TRUTH_ROLE_ARN = os.environ["GROUND_TRUTH_ROLE_ARN"]
LABEL_CATEGORIES_S3_URI = os.environ["LABEL_CATEGORIES_S3_URI"]
LABELING_ATTRIBUTE_NAME = os.environ["LABELING_ATTRIBUTE_NAME"]
OUTPUT_KMS_KEY_ID = os.getenv("OUTPUT_KMS_KEY_ID", None)


def handler(event: Dict[str, Any], context: object) -> Dict[str, str]:
    record_source_to_receipt_handle_s3_key = event["RecordSourceToReceiptHandleS3Key"]
    record_source_to_receipt_handle = download_json_dict_from_s3(
        s3_key=record_source_to_receipt_handle_s3_key,
        bucket=OUTPUT_BUCKET,
    )
    logger.info(
        f"Downloaded record source to receipt handles from S3, {len(record_source_to_receipt_handle)} items to label"
    )

    execution_id = event["ExecutionId"].rsplit(":", 1)[-1]
    manifest_uri = create_and_upload_manifest(
        record_source_to_receipt_handle=record_source_to_receipt_handle,
        bucket=OUTPUT_BUCKET,
        prefix=f"runs/{execution_id}",
        execution_id=execution_id,
    )

    output_uri = f"s3://{OUTPUT_BUCKET}/runs/{execution_id}/"
    job_name = f"{LABELING_JOB_NAME}-{execution_id}"
    prehuman_arn = f"arn:aws:lambda:{AWS_REGION}:{AC_ARN_MAP[AWS_REGION]}:function:PRE-{FUNCTION_NAME}"
    acs_arn = f"arn:aws:lambda:{AWS_REGION}:{AC_ARN_MAP[AWS_REGION]}:function:ACS-{FUNCTION_NAME}"
    args = {
        "human_task_config": HUMAN_TASK_CONFIG,
        "prehuman_arn": prehuman_arn,
        "acs_arn": acs_arn,
        "task_title": TASK_TITLE,
        "task_description": TASK_DESCRIPTION,
        "task_keywords": TASK_KEYWORDS,
        "workteam_arn": WORKTEAM_ARN,
        "task_price": TASK_PRICE,
        "manifest_uri": manifest_uri,
        "output_uri": output_uri,
        "job_name": job_name,
        "ground_truth_role_arn": GROUND_TRUTH_ROLE_ARN,
        "label_attribute_name": LABELING_ATTRIBUTE_NAME,
        "label_categories_s3_uri": LABEL_CATEGORIES_S3_URI,
        "output_kms_key_id": OUTPUT_KMS_KEY_ID,
    }
    if INSTRUCTIONS_TEMPLATE_S3_URI:
        args["instructions_template_s3_uri"] = INSTRUCTIONS_TEMPLATE_S3_URI
    elif HUMAN_TASK_UI_NAME:
        # Built-in SageMaker-managed HumanTaskUi ARN
        args["human_task_ui_arn"] = (
            f"arn:aws:sagemaker:{AWS_REGION}:{SAGEMAKER_HUMAN_TASK_UI_ACCOUNT}:human-task-ui/{HUMAN_TASK_UI_NAME}"
        )
    else:
        raise ValueError("Either INSTRUCTIONS_TEMPLATE_S3_URI or HUMAN_TASK_UI_NAME must be set")

    create_labeling_job(**args)
    logger.info("Created labeling job")

    return {"LabelingJobName": job_name}


def create_and_upload_manifest(
    record_source_to_receipt_handle: Dict[str, str],
    bucket: str,
    prefix: str,
    execution_id: str = "",
) -> str:
    logger.info("Creating manifest")

    manifest_name = "labeling.manifest"
    safe_id = execution_id or "default"
    tmp_file = f"/tmp/{safe_id}_{manifest_name}"
    with open(tmp_file, "w") as f:
        for record_source in record_source_to_receipt_handle:
            line = f'{{"{SOURCE_KEY}": "{record_source}"}}\n'
            f.write(line)
    s3.upload_file(Filename=tmp_file, Bucket=bucket, Key=f"{prefix}/{manifest_name}")
    logger.info("Uploaded manifest to S3")

    return f"s3://{bucket}/{prefix}/{manifest_name}"

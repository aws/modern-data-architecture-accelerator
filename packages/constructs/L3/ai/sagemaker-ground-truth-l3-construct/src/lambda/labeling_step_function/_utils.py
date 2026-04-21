import json
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import boto3
from botocore.config import Config

_SDK_CONFIG = Config(connect_timeout=5, read_timeout=30, retries={"max_attempts": 2})

s3 = boto3.client("s3", config=_SDK_CONFIG)
sagemaker = boto3.client("sagemaker", config=_SDK_CONFIG)

IMAGE = "image"
TEXT = "text"

# AWS SageMaker-managed account hosting built-in Human Task UI ARNs
# See: https://docs.aws.amazon.com/sagemaker/latest/dg/sms-ui-template-reference.html
SAGEMAKER_HUMAN_TASK_UI_ACCOUNT = "394669845002"


def upload_json_to_s3(json_data: Dict[str, str], bucket: str, prefix: str, filename: str) -> str:
    key = f"{prefix}/{filename}"
    try:
        s3.put_object(Body=json.dumps(json_data), Bucket=bucket, Key=key)
    except Exception as e:
        raise RuntimeError(f"Failed to upload s3://{bucket}/{key}: {e}") from e
    return key


def download_json_dict_from_s3(s3_key: str, bucket: str) -> Dict[str, str]:
    try:
        response = s3.get_object(Bucket=bucket, Key=s3_key)
    except Exception as e:
        raise RuntimeError(f"Failed to download s3://{bucket}/{s3_key}: {e}") from e
    json_data = json.loads(response["Body"].read().decode("utf-8"))

    if not isinstance(json_data, dict):
        raise ValueError(f"Expected JSON dict from s3://{bucket}/{s3_key}, got {type(json_data).__name__}")

    str_dict: Dict[str, str] = {key: str(value) for key, value in json_data.items()}

    return str_dict


def create_labeling_job(
    human_task_config: Dict[str, Any],
    prehuman_arn: str,
    acs_arn: str,
    task_title: str,
    task_description: str,
    task_keywords: List[str],
    workteam_arn: str,
    task_price: Dict[str, Dict[str, int]],
    manifest_uri: str,
    output_uri: str,
    job_name: str,
    ground_truth_role_arn: str,
    label_attribute_name: str,
    label_categories_s3_uri: str,
    instructions_template_s3_uri: Optional[str] = None,
    human_task_ui_arn: Optional[str] = None,
    output_kms_key_id: Optional[str] = None,
) -> None:
    human_task_config = human_task_config.copy()
    human_task_config.update(
        {
            "PreHumanTaskLambdaArn": prehuman_arn,
            "AnnotationConsolidationConfig": {
                "AnnotationConsolidationLambdaArn": acs_arn,
            },
            "TaskTitle": task_title,
            "TaskDescription": task_description,
            "TaskKeywords": task_keywords,
            "WorkteamArn": workteam_arn,
        }
    )

    if human_task_ui_arn:
        ui_config = {"HumanTaskUiArn": human_task_ui_arn}
    elif instructions_template_s3_uri:
        ui_config = {"UiTemplateS3Uri": instructions_template_s3_uri}
    else:
        raise ValueError("Either human_task_ui_arn or instructions_template_s3_uri must be provided")
    human_task_config["UiConfig"] = ui_config

    if task_price:
        human_task_config["PublicWorkforceTaskPrice"] = task_price

    output_config: Dict[str, str] = {"S3OutputPath": output_uri}
    if output_kms_key_id:
        output_config["KmsKeyId"] = output_kms_key_id

    try:
        sagemaker.create_labeling_job(
            InputConfig={
                "DataSource": {"S3DataSource": {"ManifestS3Uri": manifest_uri}},
                "DataAttributes": {
                    "ContentClassifiers": [
                        "FreeOfPersonallyIdentifiableInformation",
                        "FreeOfAdultContent",
                    ]
                },
            },
            OutputConfig=output_config,
            HumanTaskConfig=human_task_config,
            LabelingJobName=job_name,
            RoleArn=ground_truth_role_arn,
            LabelAttributeName=label_attribute_name,
            LabelCategoryConfigS3Uri=label_categories_s3_uri,
        )
    except Exception as e:
        raise RuntimeError(
            f"Failed to create labeling job '{job_name}' "
            f"(manifest={manifest_uri}, output={output_uri}): {e}"
        ) from e


def get_s3_string_object_from_uri(s3_uri: str) -> str:
    parsed_url = urlparse(s3_uri, allow_fragments=False)
    bucket = parsed_url.netloc
    key = parsed_url.path.lstrip("/")
    try:
        response = s3.get_object(Bucket=bucket, Key=key)
    except Exception as e:
        raise RuntimeError(f"Failed to read {s3_uri}: {e}") from e
    content = response["Body"].read().decode("utf-8")
    return str(content)

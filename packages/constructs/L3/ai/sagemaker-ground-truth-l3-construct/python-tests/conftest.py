"""Shared fixtures for Ground Truth Lambda tests."""

import json
import os
import sys
import pytest
import boto3
from moto import mock_aws

# Add the Lambda source directories to the Python path
LAMBDA_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "lambda")
STEP_FN_DIR = os.path.join(LAMBDA_DIR, "labeling_step_function")
NOTIFICATION_DIR = os.path.join(LAMBDA_DIR, "notification")

sys.path.insert(0, STEP_FN_DIR)
sys.path.insert(0, NOTIFICATION_DIR)


@pytest.fixture
def aws_credentials():
    """Mock AWS credentials for moto."""
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
    os.environ["AWS_REGION"] = "us-east-1"


@pytest.fixture
def s3_client(aws_credentials):
    with mock_aws():
        client = boto3.client("s3", region_name="us-east-1")
        yield client


@pytest.fixture
def sqs_client(aws_credentials):
    with mock_aws():
        client = boto3.client("sqs", region_name="us-east-1")
        yield client


@pytest.fixture
def output_bucket(s3_client):
    """Create a test output bucket."""
    bucket_name = "test-output-bucket"
    s3_client.create_bucket(Bucket=bucket_name)
    return bucket_name


@pytest.fixture
def upload_bucket(s3_client):
    """Create a test upload bucket."""
    bucket_name = "test-upload-bucket"
    s3_client.create_bucket(Bucket=bucket_name)
    return bucket_name


@pytest.fixture
def sqs_queue(sqs_client):
    """Create a test SQS queue."""
    response = sqs_client.create_queue(QueueName="test-queue")
    return response["QueueUrl"]


AC_ARN_MAP = {
    "us-east-1": "432418664414",
    "us-east-2": "266458841044",
    "us-west-2": "081040173940",
}


def set_labeling_env(output_bucket_name: str, queue_url: str = ""):
    """Set environment variables for labeling Lambdas."""
    os.environ["OUTPUT_BUCKET"] = output_bucket_name
    os.environ["TASK_TYPE"] = "image_bounding_box"
    os.environ["SOURCE_KEY"] = "source-ref"
    os.environ["LABELING_JOB_NAME"] = "test-labeling-job"
    os.environ["HUMAN_TASK_CONFIG"] = json.dumps({
        "NumberOfHumanWorkersPerDataObject": 1,
        "TaskAvailabilityLifetimeInSeconds": 21600,
        "TaskTimeLimitInSeconds": 300,
    })
    os.environ["AC_ARN_MAP"] = json.dumps(AC_ARN_MAP)
    os.environ["FUNCTION_NAME"] = "BoundingBox"
    os.environ["TASK_TITLE"] = "Test Task"
    os.environ["TASK_DESCRIPTION"] = "Test Description"
    os.environ["TASK_KEYWORDS"] = json.dumps(["test"])
    os.environ["WORKTEAM_ARN"] = "arn:aws:sagemaker:us-east-1:123456789012:workteam/private-crowd/test"
    os.environ["TASK_PRICE"] = "{}"
    os.environ["HUMAN_TASK_UI_NAME"] = "BoundingBox"
    os.environ["GROUND_TRUTH_ROLE_ARN"] = "arn:aws:iam::123456789012:role/test-role"
    os.environ["LABEL_CATEGORIES_S3_URI"] = "s3://test-bucket/categories.json"
    os.environ["LABELING_ATTRIBUTE_NAME"] = "label"
    os.environ["TASK_MEDIA_TYPE"] = "image"
    os.environ["SQS_QUEUE_URL"] = queue_url
    os.environ["FEATURE_GROUP_NAME"] = "test-feature-group"
    os.environ["FEATURE_GROUP_DEFINITIONS"] = "{}"

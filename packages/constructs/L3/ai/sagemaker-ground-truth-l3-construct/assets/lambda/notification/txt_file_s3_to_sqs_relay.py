import logging
import os
from typing import Any, Dict

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3")
sqs = boto3.client("sqs")

SQS_QUEUE_URL = os.environ["SQS_QUEUE_URL"]


def handler(event: Dict[str, Any], context: object) -> None:
    """Handle EventBridge S3 Object Created events for text files.

    EventBridge event format:
    {
      "detail": {
        "bucket": {"name": "..."},
        "object": {"key": "..."}
      }
    }
    """
    detail = event.get("detail", {})
    bucket = detail.get("bucket", {}).get("name")
    key = detail.get("object", {}).get("key")

    if not bucket or not key:
        logger.error(f"Missing bucket or key in event: {event}")
        return

    if not key.endswith(".txt"):
        logger.info(f"Skipping non-txt file {key}")
        return

    try:
        response = s3.get_object(Bucket=bucket, Key=key)
        file_content = response["Body"].read().decode("utf-8")

        for line in file_content.strip().splitlines():
            line = line.strip()
            if line:
                sqs.send_message(QueueUrl=SQS_QUEUE_URL, MessageBody=line)

        logger.info(f"Sent file contents from {key} to SQS queue")
    except Exception as e:
        logger.error(f"An error occurred: {str(e)}")

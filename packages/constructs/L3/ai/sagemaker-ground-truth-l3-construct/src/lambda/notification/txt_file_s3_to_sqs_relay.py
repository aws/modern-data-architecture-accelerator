import logging
import os
from typing import Any, Dict

import boto3
from botocore.config import Config

_SDK_CONFIG = Config(connect_timeout=5, read_timeout=30, retries={"max_attempts": 2})

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client("s3", config=_SDK_CONFIG)
sqs = boto3.client("sqs", config=_SDK_CONFIG)

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

        lines = [line.strip() for line in file_content.strip().splitlines() if line.strip()]
        if not lines:
            logger.info(f"No non-empty lines in {key}, skipping")
            return

        # Send in batches of 10 (SQS batch limit)
        failed_count = 0
        for i in range(0, len(lines), 10):
            batch = lines[i : i + 10]
            entries = [
                {"Id": str(j), "MessageBody": line}
                for j, line in enumerate(batch)
            ]
            resp = sqs.send_message_batch(QueueUrl=SQS_QUEUE_URL, Entries=entries)
            batch_failures = resp.get("Failed", [])
            if batch_failures:
                failed_count += len(batch_failures)
                logger.error(
                    f"Failed to send {len(batch_failures)} messages from batch starting at line {i}: "
                    f"{[f['Id'] for f in batch_failures]}"
                )

        if failed_count:
            raise RuntimeError(
                f"Failed to enqueue {failed_count}/{len(lines)} lines from s3://{bucket}/{key}"
            )

        logger.info(f"Sent {len(lines)} lines from {key} to SQS queue")
    except RuntimeError:
        raise
    except Exception as e:
        logger.error(f"Failed to process s3://{bucket}/{key}: {str(e)}")
        raise

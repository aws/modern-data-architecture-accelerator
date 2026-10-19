"""
Custom transformation for the product-docs knowledge base, applied after chunking.

The ingestion job writes each batch of chunks to the intermediate storage bucket as a JSON object of the
form `{"fileContents": [{"contentBody": ..., "contentType": ..., "contentMetadata": {...}}]}`, and passes
the batch keys in `inputFiles[].contentBatches`. This function writes a transformed copy of each batch to
the same bucket and returns the copies' keys in the same shape. See
https://docs.aws.amazon.com/bedrock/latest/userguide/kb-custom-transformation.html.

The transformation prefixes the body of each text chunk with a label that makes product documentation
easier to find, and adds the processing date to the file metadata.

An error, such as a batch that cannot be read or written, is raised rather than logged, so the ingestion
job reports the documents as failed instead of ingesting them untransformed.
"""

import json
import logging
import posixpath
from collections.abc import Mapping
from datetime import UTC, datetime
from typing import Any

import boto3

logger = logging.getLogger()
logger.setLevel(logging.INFO)
s3_client = boto3.client("s3")

TEXT_LABEL = "[PRODUCT DOCUMENTATION]"
PROCESSOR_VERSION = "1.0.0"

# The content types of a text chunk. The ingestion job writes PLAIN_TEXT; the documentation names TEXT.
TEXT_CONTENT_TYPES = ("PLAIN_TEXT", "TEXT")


def lambda_handler(event: Mapping[str, Any], context: Any) -> dict[str, Any]:
    """Handler function for the knowledge base custom transformer Lambda."""
    logger.info("Received event: %s", json.dumps(event))

    bucket_name = event["bucketName"]
    output_files = [transform_file(input_file, bucket_name) for input_file in event.get("inputFiles", [])]

    logger.info("Returning response with %d files", len(output_files))
    return {"outputFiles": output_files}


def transform_file(input_file: Mapping[str, Any], bucket_name: str) -> dict[str, Any]:
    """Transform the content batches of one input file, and add the processing date to its metadata."""
    return {
        "originalFileLocation": input_file["originalFileLocation"],
        "fileMetadata": {
            **input_file.get("fileMetadata", {}),
            "processedDate": datetime.now(UTC).isoformat(),
            "processorVersion": PROCESSOR_VERSION,
        },
        "contentBatches": [
            transform_batch(batch["key"], bucket_name) for batch in input_file.get("contentBatches", [])
        ],
    }


def transform_batch(key: str, bucket_name: str) -> dict[str, str]:
    """Write a transformed copy of the batch at `key`, next to it with `_transformed` added to the name,
    and return the copy's batch entry."""
    response = s3_client.get_object(Bucket=bucket_name, Key=key)
    batch = json.loads(response["Body"].read().decode("utf-8"))

    root, extension = posixpath.splitext(key)
    transformed_key = f"{root}_transformed{extension}"
    s3_client.put_object(
        Bucket=bucket_name,
        Key=transformed_key,
        Body=json.dumps({**batch, "fileContents": [transform_content(content) for content in batch["fileContents"]]}),
        ContentType="application/json",
    )
    return {"key": transformed_key}


def transform_content(content: Mapping[str, Any]) -> dict[str, Any]:
    """Prefix the body of a text chunk with the label. Other content is returned as is."""
    if content.get("contentType") not in TEXT_CONTENT_TYPES:
        return dict(content)
    return {**content, "contentBody": f"{TEXT_LABEL} {content['contentBody']}"}

# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

from functools import reduce
import json
import boto3
import os
import uuid
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

s3 = boto3.client('s3')
presigned_url_expiry_seconds = os.environ['EXPIRY_TIME_SECONDS']
target_bucket = os.environ['TARGET_BUCKET']
target_prefix = os.environ['TARGET_PREFIX']
metadata_target_prefix = os.environ['METADATA_TARGET_PREFIX']
metadata_fields_mappings = json.loads(os.environ['EVENT_METADATA_MAPPINGS'])


def fetch_by_path(data, path_keys):
    return reduce(lambda d, key: d[key], path_keys, data)


def handler(event, context):

    # logger.info(json.dumps(event, indent=2))

    uuid4 = str(uuid.uuid4())
    object_key = f"{target_prefix}/{uuid4}"
    metadata_object_key = f"{metadata_target_prefix}/{uuid4}.metadata.json"

    logger.info(f"Target Bucket: {target_bucket}")
    logger.info(f"Target Prefix: {target_prefix}")
    logger.info(f"Metadata Target Prefix: {metadata_target_prefix}")
    logger.info(f"Object key: {object_key}")
    logger.info(f"Metadata Object key: {metadata_object_key}")
    logger.info(f"Metadata Mappings: {metadata_fields_mappings}")

    metadata = {}
    for dest_path, source_path in metadata_fields_mappings.items():
        logger.info(f"Mapping {source_path} from event to {dest_path}")
        metadata[dest_path] = fetch_by_path(event, source_path.split("."))

    try:
        s3.put_object(
            Bucket=target_bucket,
            Key=metadata_object_key,
            Body=json.dumps(metadata),
            ContentType='application/json'
        )

    except Exception as e:
        logger.error(e)
        return {
            'statusCode': 400,
            'body': json.dumps({'Error': "Error storing metadata."})
        }

    try:
        URL = s3.generate_presigned_url(
            "put_object",
            Params={"Bucket": target_bucket, "Key": object_key},
            ExpiresIn=presigned_url_expiry_seconds
        )

        response_body = {
            'url': URL,
            'uuid': uuid4
        }

        return {
            'statusCode': 200,
            'body': json.dumps(response_body)
        }

    except Exception as e:
        logger.error(e)
        return {
            'statusCode': 400,
            'body': json.dumps({'Error': "Error generating S3 Pre-signed URL"})
        }

# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

from functools import reduce
import json
import boto3
import os
import uuid as uid
import logging
from botocore import config

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = { "user_agent_extra": solution_identifier }
config = config.Config(**user_agent_extra_param)

logging.basicConfig(
    format="%(name)s: %(asctime)s | %(levelname)s | %(filename)s:%(lineno)s | %(process)d >>> %(message)s | Function: %(funcName)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=os.environ.get('LOG_LEVEL', 'INFO').upper()
)
logger = logging.getLogger("S3 presigned url")


s3 = boto3.client('s3', config=config)
presigned_url_expiry_seconds = os.environ['EXPIRY_TIME_SECONDS']
target_bucket = os.environ['TARGET_BUCKET']
target_prefix = os.environ['TARGET_PREFIX']
metadata_target_prefix = os.environ['METADATA_TARGET_PREFIX']
metadata_fields_mappings = json.loads(os.environ['EVENT_METADATA_MAPPINGS'])

logger.info(f"Target Bucket: {target_bucket}")
logger.info(f"Target Prefix: {target_prefix}")
logger.info(f"Metadata Target Prefix: {metadata_target_prefix}")
logger.info(f"Metadata Mappings: {metadata_fields_mappings}")


def fetch_by_path(data, path_keys):
    return reduce(lambda d, key: d[key], path_keys, data)


def create_metadata(uuid4, data):
    metadata_object_key = f"{metadata_target_prefix}/{uuid4}.metadata.json"
    logger.info(f"Metadata Object key: {metadata_object_key}")

    try:
        s3.put_object(
            Bucket=target_bucket,
            Key=metadata_object_key,
            Body=json.dumps(data),
            ContentType='application/json'
        )
        return {
            'statusCode': 200,
            'body': json.dumps({'Success': "Uploaded Metadata to S3"})
        }

    except Exception as e:
        logger.error(e)
        return {
            'statusCode': 400,
            'body': json.dumps({'Error': "Error generating Metadata"})
        }

def handler(event, context):

    # logger.info(json.dumps(event, indent=2))
    query_string_params = event['queryStringParameters']
    path = event['path']
    elements = path.split('/')

    # Single object upload
    if (elements[2] == 'unipart'):

        md5 = query_string_params['md5']

        metadata = {}
        for dest_path, source_path in metadata_fields_mappings.items():
            logger.info(f"Mapping {source_path} from event to {dest_path}")
            metadata[dest_path] = fetch_by_path(event, source_path.split("."))
        uuid = str(uid.uuid4())
        create_metadata(uuid, metadata)

        try:
            object_key = f"{target_prefix}/{uuid}"
            logger.info(f"Object key: {object_key}")

            URL = s3.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    'Bucket': target_bucket,
                    'Key': object_key,
                    'ContentMD5': md5
                },
                ExpiresIn=presigned_url_expiry_seconds
            )

            response_body = {
                'url': URL,
                'uuid': uuid
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

    # Multi part upload creation
    elif (elements[2] == 'multi_init'):
        metadata = {}

        try:
            for dest_path, source_path in metadata_fields_mappings.items():
                logger.info(f"Mapping {source_path} from event to {dest_path}")
                metadata[dest_path] = fetch_by_path(
                    event, source_path.split("."))
            uuid = str(uid.uuid4())
            object_key = f"{target_prefix}/{uuid}"
            logger.info(f"Object key: {object_key}")

            # Generate multipart upload and upload metadata json
            multipart_upload = s3.create_multipart_upload(
                Bucket=target_bucket, Key=object_key)
            upload_id = multipart_upload['UploadId']
            logger.info(f"Generated upload ID: {upload_id}")
            metadata[upload_id] = upload_id
            create_metadata(uuid, metadata)
            response_body = {
                'uuid': uuid,
                'upload_id': upload_id
            }

            return {
                'statusCode': 200,
                'body': json.dumps(response_body)
            }

        except Exception as e:
            logger.error(e)
            return {
                'statusCode': 400,
                'body': json.dumps({'Error': "Error creating multi part upload"})
            }

    # Multi part upload URL generation flow
    elif (elements[2] == 'multi_upload'):

        md5 = query_string_params['md5']
        uuid = query_string_params['uuid']
        object_key = f"{target_prefix}/{uuid}"
        logger.info(f"Object key: {object_key}")
        part_num = int(query_string_params['part_num'])
        upload_id = query_string_params['upload_id']

        logger.info(f"md5 received : {md5}")
        logger.info(f"uuid received : {uuid}")
        logger.info(f"object_key received : {object_key}")
        logger.info(f"part_num received : {part_num}")
        logger.info(f"upload_id received : {upload_id}")

        try:
            URL = s3.generate_presigned_url(
                'upload_part',
                Params={
                    'Bucket': target_bucket,
                    'Key': object_key,
                    'UploadId': upload_id,
                    'PartNumber': part_num,
                    'ContentMD5': md5
                },
                ExpiresIn=presigned_url_expiry_seconds
            )

            response_body = {
                'url': URL,
                'uuid': uuid
            }
            return {
                'statusCode': 200,
                'body': json.dumps(response_body)
            }

        except Exception as e:
            logger.error(e)
            return {
                'statusCode': 400,
                'body': json.dumps({'Error': "Error generating S3 Pre-signed URL for the part"})
            }

    # Multi part upload completion flow
    elif (elements[2] == 'multi_complete'):

        uuid = query_string_params['uuid']
        upload_id = query_string_params['upload_id']
        object_key = f"{target_prefix}/{uuid}"
        # body = json.loads(event['body'])
        s3_r = boto3.resource('s3', config=config)
        # Complete multipart upload
        try:
            mpu = s3_r.MultipartUpload(target_bucket, object_key, upload_id)
            body = mpu.parts.all()

            part_info = []
            for part in body:
                logger.info(
                    f"Part number: {part.part_number}, ETag: {part.e_tag}, Size: {part.size}")
                part_info.append({
                    'ETag': part.e_tag,
                    'PartNumber': part.part_number
                })

            s3.complete_multipart_upload(
                Bucket=target_bucket,
                Key=object_key,
                UploadId=upload_id,
                MultipartUpload={
                    'Parts': part_info
                }
            )
            return {
                'statusCode': 200,
                'body': json.dumps({'Sucess': "Multi part upload was completed successfully"})
            }
        except Exception as e:
            logger.error(e)
            return {
                'statusCode': 400,
                'body': json.dumps({'Error': "Error completing multi-part upload"})
            }
    else:
        return {
            'statusCode': 400,
            'body': json.dumps({'Error': "Invalid resource path for proxy"})
        }

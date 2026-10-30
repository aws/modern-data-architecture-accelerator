# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

from dataclasses import dataclass
from functools import reduce
from typing import Any
import json
import boto3
import os
import re
import uuid as uid
import logging
from botocore import config

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = { "user_agent_extra": solution_identifier }
# botocore presigns S3 URLs with SigV2 unless told otherwise, and S3 refuses SigV2 for objects
# encrypted with KMS, as the target bucket's are when it is an MDAA data lake bucket.
config = config.Config(signature_version='s3v4', **user_agent_extra_param)

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
allow_caller_key_path = os.environ.get('ALLOW_CALLER_KEY_PATH') == 'true'

logger.info(f"Target Bucket: {target_bucket}")
logger.info(f"Target Prefix: {target_prefix}")
logger.info(f"Metadata Target Prefix: {metadata_target_prefix}")
logger.info(f"Metadata Mappings: {metadata_fields_mappings}")
logger.info("Allow Caller Key Path: %s", allow_caller_key_path)

# The S3 object key naming guidelines' safe characters, plus '=' for Hive-style key=value partitions.
KEY_SEGMENT_PATTERN = re.compile(r"[A-Za-z0-9!\-_.*'()=]+")
SAFE_CHARACTERS = "A-Z a-z 0-9 ! - _ . * ' ( ) ="
MAX_OBJECT_KEY_BYTES = 1024
# Length of str(uuid.uuid4()), the uuid that unipart and multi_init generate.
UUID_LENGTH = 36
UUID_PATTERN = re.compile(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}")


class KeyPathError(ValueError):
    """A caller-supplied query parameter that cannot be used in an object key."""


@dataclass(frozen=True)
class KeyPath:
    """Caller-chosen location of an upload under the target prefix."""

    sub_path: str | None = None
    filename: str | None = None

    @property
    def is_set(self) -> bool:
        return self.sub_path is not None or self.filename is not None


def is_valid_segment(segment: str) -> bool:
    return segment not in ('.', '..') and KEY_SEGMENT_PATTERN.fullmatch(segment) is not None


def parse_key_path(query_string_params: dict[str, str] | None) -> KeyPath:
    """Read and validate the sub_path and filename query parameters. Both are ignored unless
    ALLOW_CALLER_KEY_PATH is set.

    Raises KeyPathError naming the offending parameter.
    """
    if not allow_caller_key_path or not query_string_params:
        return KeyPath()
    key_path = KeyPath(query_string_params.get('sub_path'), query_string_params.get('filename'))

    if key_path.sub_path is not None and not all(
        is_valid_segment(segment) for segment in key_path.sub_path.split('/')
    ):
        raise KeyPathError(
            "sub_path must be one or more '/'-separated segments with no leading, trailing, or repeated '/', "
            f"no '.' or '..' segments, and only these characters: {SAFE_CHARACTERS}"
        )
    if key_path.filename is not None and not is_valid_segment(key_path.filename):
        raise KeyPathError(
            f"filename must be a single segment, not '.' or '..', using only these characters: {SAFE_CHARACTERS}"
        )
    if len(build_object_key('0' * UUID_LENGTH, key_path).encode('utf-8')) > MAX_OBJECT_KEY_BYTES:
        raise KeyPathError(
            f"sub_path and filename make the object key longer than the S3 limit of {MAX_OBJECT_KEY_BYTES} bytes"
        )
    return key_path


def check_caller_uuid(flow: str, query_string_params: dict[str, str] | None) -> None:
    """multi_upload and multi_complete build the object key from the caller's uuid, so when
    ALLOW_CALLER_KEY_PATH is set it must have the form multi_init returns. Otherwise the key could break
    the character and length rules that parse_key_path holds sub_path and filename to.

    Raises KeyPathError naming the uuid parameter.
    """
    if not allow_caller_key_path or flow not in ('multi_upload', 'multi_complete'):
        return
    if not UUID_PATTERN.fullmatch((query_string_params or {}).get('uuid', '')):
        raise KeyPathError("uuid must be the uuid returned by multi_init")


def build_object_key(uuid: str, key_path: KeyPath) -> str:
    # The uuid is joined to the filename rather than given its own path level, so a Glue crawler does
    # not create one partition per upload.
    name = f"{uuid}_{key_path.filename}" if key_path.filename is not None else uuid
    if key_path.sub_path is not None:
        return f"{target_prefix}/{key_path.sub_path}/{name}"
    return f"{target_prefix}/{name}"


def with_object_key(body: dict[str, Any], object_key: str, key_path: KeyPath) -> dict[str, Any]:
    """Add the object key to a response or metadata body when the caller chose the key path, since the
    uuid alone no longer locates the object."""
    return {**body, 'object_key': object_key} if key_path.is_set else body


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

    # Validated before any flow runs, so a rejected request writes nothing to S3.
    try:
        key_path = parse_key_path(query_string_params)
        check_caller_uuid(elements[2], query_string_params)
    except KeyPathError as e:
        logger.info("Rejected upload request: %s", e)
        return {
            'statusCode': 400,
            'body': json.dumps({'Error': str(e)})
        }

    # Single object upload
    if (elements[2] == 'unipart'):

        md5 = query_string_params['md5']
        uuid = str(uid.uuid4())
        object_key = build_object_key(uuid, key_path)

        metadata = {}
        for dest_path, source_path in metadata_fields_mappings.items():
            logger.info(f"Mapping {source_path} from event to {dest_path}")
            metadata[dest_path] = fetch_by_path(event, source_path.split("."))
        create_metadata(uuid, with_object_key(metadata, object_key, key_path))

        try:
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

            response_body = with_object_key({
                'url': URL,
                'uuid': uuid
            }, object_key, key_path)

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
            object_key = build_object_key(uuid, key_path)
            logger.info(f"Object key: {object_key}")

            # Generate multipart upload and upload metadata json
            multipart_upload = s3.create_multipart_upload(
                Bucket=target_bucket, Key=object_key)
            upload_id = multipart_upload['UploadId']
            logger.info(f"Generated upload ID: {upload_id}")
            metadata[upload_id] = upload_id
            create_metadata(uuid, with_object_key(metadata, object_key, key_path))
            response_body = with_object_key({
                'uuid': uuid,
                'upload_id': upload_id
            }, object_key, key_path)

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
        object_key = build_object_key(uuid, key_path)
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
        object_key = build_object_key(uuid, key_path)
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

# © 2023 Amazon Web Services, Inc. or its affiliates. All Rights Reserved.
#
# This AWS Content is provided subject to the terms of the AWS Customer Agreement
# available at http://aws.amazon.com/agreement or other written agreement between
# Customer and either Amazon Web Services, Inc. or Amazon Web Services EMEA SARL or both.

# # Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

from opensearchpy import OpenSearch, RequestsHttpConnection, AWSV4SignerAuth
import os
import boto3
import json
import logging
import cfnresponse
import time

HOST = os.environ.get("COLLECTION_HOST")
VECTOR_INDEX_NAME = os.environ.get("VECTOR_INDEX_NAME")
VECTOR_FIELD_NAME = os.environ.get("VECTOR_FIELD_NAME")
VECTOR_DIMENSION = int(os.environ.get("VECTOR_DIMENSION", "1536"))
REGION_NAME = os.environ.get("REGION_NAME")
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def log(message):
    logger.info(message)


def lambda_handler(event, context):
    """
    Lambda handler to create OpenSearch Index
    """
    log(f"Event: {json.dumps(event)}")

    session = boto3.Session()

    # Get STS client from session
    sts_client = session.client("sts", region_name=REGION_NAME, endpoint_url=f'https://sts.{REGION_NAME}.amazonaws.com')
    # Get caller identity
    caller_identity = sts_client.get_caller_identity()

    # Print the caller identity information
    log(f"Caller Identity: {caller_identity}")

    # Specifically, print the ARN of the caller
    log(f"ARN: {caller_identity['Arn']}")

    creds = session.get_credentials()

    log(f"HOST: {HOST}")
    if HOST is None:
        raise ValueError("COLLECTION_HOST environment variable is not set")
    host = HOST.split("//")[1]

    region = REGION_NAME
    service = "aoss"
    status = cfnresponse.SUCCESS
    response = {}

    try:
        auth = AWSV4SignerAuth(creds, region, service)

        client = OpenSearch(
            hosts=[{"host": host, "port": 443}],
            http_auth=auth,
            use_ssl=True,
            verify_certs=True,
            connection_class=RequestsHttpConnection,
            pool_maxsize=20,
        )
        index_name = VECTOR_INDEX_NAME

        if event["RequestType"] == "Create":
            log(f"Creating index: {index_name}")

            index_body = {
                "settings": {
                    "index.knn": True,
                    "index.knn.algo_param.ef_search": 512,
                },
                "mappings": {
                    "properties": {  
                        VECTOR_FIELD_NAME: {  
                            "type": "knn_vector",
                            "dimension": VECTOR_DIMENSION,
                            "method": {  
                                "space_type": "innerproduct",
                                "engine": "FAISS",
                                "name": "hnsw",
                                "parameters": {
                                    "m": 16,
                                    "ef_construction": 512,
                                },
                            },
                        },
                        "AMAZON_BEDROCK_METADATA": {"type": "text", "index": False},
                        "AMAZON_BEDROCK_TEXT_CHUNK": {"type": "text"},
                        "id": {"type": "text"},
                    }
                },
            }

            response = client.indices.create(index=index_name, body=index_body)
            log(f"Response: {response}")
            
            # Wait for index to be ready with exponential backoff
            max_retries = 30
            retry_count = 0
            while retry_count < max_retries:
                try:
                    index_status = client.indices.get(index=index_name)
                    if index_status:
                        log(f"Index {index_name} is ready")
                        break
                except Exception as e:
                    log(f"Index not ready yet, retry {retry_count + 1}/{max_retries}: {e}")
                    retry_count += 1
                    time.sleep(min(2 ** retry_count, 30))  # Exponential backoff, max 30s  

        elif event["RequestType"] == "Delete":
            log(f"Deleting index: {index_name}")
            response = client.indices.delete(index_name)
            log(f"Response: {response}")
        else:
            log("Continuing without action.")

    except Exception as e:
        logging.error("Exception: %s" % e, exc_info=True)
        status = cfnresponse.FAILED

    finally:
        cfnresponse.send(event, context, status, response)

    return {
        "statusCode": 200,
        "body": json.dumps("Create index lambda ran successfully."),
    }
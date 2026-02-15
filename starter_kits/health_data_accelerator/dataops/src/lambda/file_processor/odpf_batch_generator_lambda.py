"""
    Batch Generator is deployed as an AWS Lambda function.
    It generates batches based on Operational Data Configurations.
"""

__author__ = "Srinivas Kandi"
__reviewer__ = "Ravi Itha"
__license__ = "Apache-2.0"
__version__ = "1.0"

import json
import sys
import logging
import datetime
import boto3
import os
from boto3.dynamodb.conditions import Key, Attr

# setup custom logger for the lambda function
logger = logging.getLogger('tables refresh batch creator')
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)


def get_list_of_raw_tables(refresh_cadence):
    """
    This function will the list of tables that are part of a refresh cadence
    This function will also split the tables into batches

    Parameters:
        refresh_cadence(String): Data refresh cadence (Ex. 15, 30 etc)

    Returns:
        refresh_batches(List): List of batches of tables to be refreshed

    """

    dynamodb = boto3.resource('dynamodb')
    paginator = dynamodb.meta.client.get_paginator("query")
    logger.info("start getting table list")
    raw_table_config_table_name = os.environ['ODPF_RAW_TABLE_CONFIG_DDB_TABLE_NAME']
    pages = paginator.paginate(
        TableName=raw_table_config_table_name,
        KeyConditionExpression='refresh_cadence = :refresh_cadence',
        ExpressionAttributeValues={
            ':refresh_cadence': refresh_cadence
        }
    )
    items = []
    for page in pages:
        items.extend(page["Items"])
    logger.info(f"Total Number of Tables : {str(len(items))}")
    batch_config_table_name = os.environ['ODPF_BATCH_CONFIG_DDB_TABLE_NAME']
    glue_job_config = dynamodb.Table(batch_config_table_name)
    resp = glue_job_config.get_item(Key={"refresh_cadence": refresh_cadence})
    if 'Item' in resp:
        batch_max_size = int(resp['Item']['refresh_tables_batch_size'])
        refresh_batches = [{"glue_job_name": resp['Item']['glue_job_name'],
                            "datalake_format": resp['Item']['datalake_format'],
                            "glue_job_node_type": resp['Item']['glue_job_worker_type'],
                            "glue_job_max_nodes": resp['Item']['glue_job_max_workers'],
                            "batch_chunk": items[i:i + batch_max_size]}
                           for i in range(0, len(items), batch_max_size)]

        logger.info("Number Of Refresh Batches : {}".format(str(len(refresh_batches))))
        return refresh_batches
    else:
        logger.error("Error Getting Glue Job Config")
        refresh_batches = []
        return refresh_batches

    # The below code will split the list of tables into equal batches based on
    # the batch_max_size


def lambda_handler(event, context):
    """
    This is the main function

    Parameters:
        event(event): The payload sent to the Lambda function

    Returns:
        statusCode(String): A successful return code
        refresh_batches(List): A list of batches of tables

    """

    try:
        logger.info(f"Processing Refresh Cadence: {event['refresh_cadence']}")
        refresh_batches = get_list_of_raw_tables(
            event["refresh_cadence"]
        )
        return {
            "statusCode": 200,
            "Items": refresh_batches
        }
    except Exception as e:
        logger.error(e)
        raise e
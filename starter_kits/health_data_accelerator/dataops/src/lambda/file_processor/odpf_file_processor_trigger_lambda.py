"""
    File Processor Trigger is deployed as an AWS Lambda function.
    It runs File Processor Glue Job.
"""

__author__ = "Srinivas Kandi"
__reviewer__ = "Ravi Itha"
__license__ = "Apache-2.0"
__version__ = "1.0"

import logging
import sys
import boto3
import os
import json

logger = logging.getLogger('raw tables refresh manager')
logger.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)


def start_glue_job(event):
    """
    This function trigger the raw tables glue job
    Parameters:
        event(Dict): List of tables that need to be refreshed

    Returns:
        glue_job_run_status(Dict): Glue job run id and status
    """
    input_params = {
        "batch_chunk": event["batch_chunk"],
        "ddb_file_tracker_table": os.environ["ODPF_FILE_TRACKER_DDB_TABLE_NAME"],
        "ddb_file_tracker_history_table": os.environ["ODPF_FILE_TRACKER_HISTORY_DDB_TABLE_NAME"],
        "ddb_file_processing_tracker_table": os.environ["ODPF_FILE_PROCESSING_TRACKER_DDB_TABLE_NAME"],
        "ddb_file_processing_tracker_history_table": os.environ["ODPF_FILE_PROCESSING_TRACKER_HISTORY_DDB_TABLE_NAME"]
    }

    input_params_str = json.dumps(input_params)
    glue_job_status = {"glue_job_run_id": "", "glue_job_status": ""}
    glue_job_input = {"batch_chunk": event["batch_chunk"]}
    glue = boto3.client(service_name='glue')
    job_run = glue.start_job_run(
        JobName=event["glue_job_name"],
        WorkerType=event["glue_job_node_type"],
        NumberOfWorkers=event["glue_job_max_nodes"],
        Arguments={
            "--datalake-formats": event['datalake_format'],
            "--input_params": input_params_str
        }
    )
    logger.info('Glue Job Run Id: ' + job_run['JobRunId'])
    glue_job_status["glue_job_run_id"] = job_run['JobRunId']
    status = glue.get_job_run(JobName=event["glue_job_name"],
                              RunId=job_run['JobRunId'])
    logger.info(status['JobRun']['JobRunState'])
    glue_job_status["glue_job_status"] = status['JobRun']['JobRunState']
    return glue_job_status


def lambda_handler(event, context):
    """
    This is the main function of the Lambda.

    Parameters:
        event(event): The payload sent to the Lambda function
        context: AWS Lambda context variable

    Returns:
        dictionary
    """
    try:
        glue_job_run_status = start_glue_job(event)
        return {
            'statusCode': 200,
            'body': glue_job_run_status
        }
    except Exception as e:
        raise e
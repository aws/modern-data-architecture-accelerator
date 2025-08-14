"""
    File Manager is deployed as an AWS Lambda function. It detects files emitted 
    by a CDC process such as AWS DMS and stores them in an Amazon DynamoDB table. 
"""

import json
import datetime
import boto3
import os
import uuid
from botocore.exceptions import ClientError


class FileManagerConfig:
    """Configuration class for File Manager dependencies."""
    
    def __init__(self, table_name=None, ddb_client=None):
        self.table_name = table_name or os.environ.get('DMS_TRACKER_TABLE')
        self.ddb_client = ddb_client or boto3.client('dynamodb')
        
        if not self.table_name:
            raise ValueError("DMS_TRACKER_TABLE environment variable is required")


def log_raw_file_ingestion(inp_rec, config=None):
    """
    This function inserts an audit record for every load file sent by DMS
    
    Parameters:
    inp_rec(Dict): file ingestion audit rec with raw file ingestion details
    config(FileManagerConfig): configuration object with dependencies
    
    Raises:
    ValueError: If required configuration is missing
    ClientError: If DynamoDB operation fails
    """
    if config is None:
        config = FileManagerConfig()
    
    try:
        config.ddb_client.transact_write_items(
            TransactItems=[
                {'Put': {'TableName': config.table_name,
                         'Item': {
                             'source_table_name': {'S': inp_rec['source_table_name']},
                             'file_id': {'S': inp_rec['file_id']},
                             'file_ingestion_status': {'S': inp_rec['file_ingestion_status']},
                             'file_ingestion_date_time': {'S': inp_rec['file_ingestion_date_time']},
                             'file_ingestion_s3_bucket': {'S': inp_rec['file_ingestion_s3_bucket']},
                             'file_ingestion_path': {'S': inp_rec['file_ingestion_path']},
                             'dms_file_type': {'S': inp_rec['dms_file_type']},
                             'schema_name': {'S': inp_rec['schema_name']},
                             'table_name': {'S': inp_rec['table_name']}
                         }
                         }
                 }
            ]
        )
    except ClientError as e:
        raise ClientError(
            error_response=e.response,
            operation_name=e.operation_name
        ) from e


def _parse_s3_file_path(s3_raw_file_path):
    """
    Parse S3 file path to extract schema and table information.
    
    Parameters:
    s3_raw_file_path(str): S3 object key path
    
    Returns:
    tuple: (schema_name, table_name, dms_file_type)
    
    Raises:
    ValueError: If file path format is invalid
    """
    s3_raw_file_array = s3_raw_file_path.split('/')
    
    if len(s3_raw_file_array) < 3:
        raise ValueError(f"Invalid S3 file path format: {s3_raw_file_path}")
    
    dms_file_type = 'Incremental' if len(s3_raw_file_array) > 5 else 'Full'
    source_schema_name = s3_raw_file_array[1]
    source_table_name = s3_raw_file_array[2]
    
    return source_schema_name, source_table_name, dms_file_type


def _format_timestamp(timestamp_str):
    """
    Convert ISO timestamp to yyyy-mm-dd hh:mm:ss format.
    
    Parameters:
    timestamp_str(str): ISO format timestamp
    
    Returns:
    str: Formatted timestamp
    
    Raises:
    ValueError: If timestamp format is invalid
    """
    try:
        return datetime.datetime.strptime(
            timestamp_str, '%Y-%m-%dT%H:%M:%SZ'
        ).strftime('%Y-%m-%d %H:%M:%S')
    except ValueError as e:
        raise ValueError(f"Invalid timestamp format: {timestamp_str}") from e


def create_raw_file_ingestion_audit_rec(ingestion_event, uuid_generator=None):
    """
    This function parses the S3 notification event from SQS and 
    creates an audit record that will be used to log all raw file ingestion
    
    Parameters:
    ingestion_event(Dict): S3 event notification JSON
    uuid_generator(callable): Function to generate UUID (for testing)
    
    Returns:
    audit_rec(Dict): Returns a dictionary with S3 file ingestion details
    
    Raises:
    KeyError: If required event fields are missing
    ValueError: If event data is invalid
    """
    if uuid_generator is None:
        uuid_generator = lambda: str(uuid.uuid4())
    
    try:
        s3event = ingestion_event
        file_id = uuid_generator()
        s3_bucket_name = s3event['detail']['bucket']['name']
        s3_raw_file_path = s3event['detail']['object']['key']
        s3_event_time = s3event['time']
        
        # Parse file path components
        source_schema_name, source_table_name, dms_file_type = _parse_s3_file_path(s3_raw_file_path)
        
        # Format timestamp
        s3_file_create_time = _format_timestamp(s3_event_time)
        
        # Build qualified table name
        qualified_table_name = f'{source_schema_name}/{source_table_name}'
        
        audit_rec = {
            'file_id': file_id,
            'file_ingestion_s3_bucket': s3_bucket_name,
            'file_ingestion_path': s3_raw_file_path,
            'file_ingestion_date_time': s3_file_create_time,
            'dms_file_type': dms_file_type,
            'source_table_name': qualified_table_name.lower(),
            'schema_name': source_schema_name.lower(),
            'table_name': source_table_name.lower(),
            'file_ingestion_status': 'raw_file_landed'
        }
        
        return audit_rec
        
    except KeyError as e:
        raise KeyError(f"Missing required field in ingestion event: {e}") from e


def lambda_handler(event, context, config=None):
    """
    This is the main Lambda handler which receives EventBridge event.
    The EventBridge event is triggered by S3 object create notifications.
    For every S3 object created by DMS, an EventBridge event is generated

    Parameters:
        event(Dict): EventBridge event body
        context(context): EventBridge to Lambda trigger context
        config(FileManagerConfig): configuration object with dependencies
        
    Returns:
        Dictionary: Returns Lambda execution status
        
    Raises:
        Exception: If processing fails
    """
    try:
        if config is None:
            config = FileManagerConfig()
            
        # process the EventBridge S3 event
        audit_log_rec = create_raw_file_ingestion_audit_rec(event)
        log_raw_file_ingestion(audit_log_rec, config)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'DMS File Manager executed successfully',
                'file_id': audit_log_rec['file_id']
            })
        }
        
    except Exception as e:
        error_message = f"Error processing file ingestion: {str(e)}"
        print(error_message)  # CloudWatch logging
        
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': error_message
            })
        }
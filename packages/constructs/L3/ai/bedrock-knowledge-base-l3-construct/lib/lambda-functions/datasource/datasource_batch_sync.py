import json
import os
import boto3
import logging
from typing import List, Dict, Any, Set
from datetime import datetime
import time

MAX_INGESTION_JOBS_TO_CHECK = 10  # Check recent jobs to detect running ingestion jobs
                                  # AWS allows max 1 concurrent job per KB/DS, so 10 is sufficient
                                  # to catch any running jobs in the recent history and small enough to avoid unnecessary API overhead

logger = logging.getLogger()
logger.setLevel(logging.INFO)

bedrock_agent = boto3.client('bedrock-agent')
sqs = boto3.client('sqs')
cloudwatch = boto3.client('cloudwatch')

def lambda_handler(event, context):
    """
    Batch sync Lambda function for Bedrock Knowledge Base data sources.
    
    Processes SQS messages containing S3 events in batches to efficiently sync
    knowledge base content while respecting AWS service limits.
    
    Environment Variables:
        KNOWLEDGE_BASE_ID: The ID of the Bedrock Knowledge Base
        DATA_SOURCE_ID: The ID of the data source within the knowledge base
    
    Args:
        event: SQS event containing batch of S3 object notifications
        context: Lambda context object
        
    Returns:
        dict: Batch item failures for SQS partial batch failure handling
    """
    
    knowledge_base_id = os.environ['KNOWLEDGE_BASE_ID']
    data_source_id = os.environ['DATA_SOURCE_ID']
    
    batch_item_failures = []
    
    try:
        # Extract and deduplicate S3 events from SQS messages
        s3_events, failed_message_ids = extract_s3_events(event['Records'])
        unique_files = deduplicate_s3_events(s3_events)
        
        # Add failed message IDs to batch failures
        batch_item_failures.extend([
            {'itemIdentifier': msg_id} for msg_id in failed_message_ids
        ])
        
        logger.info(f"Processing batch of {len(unique_files)} unique files for KB: {knowledge_base_id}")
        
        # Skip processing if no valid files to process
        if not unique_files:
            logger.info("No valid files to process, skipping ingestion job")
            return {'batchItemFailures': batch_item_failures}
        
        # Check if there's already an ingestion job running
        if is_ingestion_job_running(knowledge_base_id, data_source_id):
            logger.warning("Ingestion job already running, requeueing messages")
            # Return all messages as failures to requeue them
            return {
                'batchItemFailures': [
                    {'itemIdentifier': record['messageId']} 
                    for record in event['Records']
                ]
            }
        
        # Start ingestion job for the batch
        start_time = time.time()
        response = bedrock_agent.start_ingestion_job(
            knowledgeBaseId=knowledge_base_id,
            dataSourceId=data_source_id
        )
        
        ingestion_job_id = response['ingestionJob']['ingestionJobId']
        processing_time = time.time() - start_time
        
        logger.info(f"Batch ingestion job started: {ingestion_job_id} in {processing_time:.2f}s")
        
        return {'batchItemFailures': batch_item_failures}
        
    except Exception as e:
        logger.error(f"Error processing batch: {str(e)}")
        # Return all messages as failures for SQS to handle requeuing/DLQ
        return {
            'batchItemFailures': [
                {'itemIdentifier': record['messageId']} 
                for record in event['Records']
            ]
        }

def extract_s3_events(sqs_records: List[Dict]) -> tuple[List[Dict], List[str]]:
    """Extract S3 events from SQS message bodies."""
    s3_events = []
    failed_message_ids = []
    
    for record in sqs_records:
        try:
            # Parse SQS message body which contains S3 event
            message_body = json.loads(record['body'])
            
            # Handle both direct S3 events and S3 events wrapped in Records
            if 'Records' in message_body:
                s3_events.extend(message_body['Records'])
            else:
                s3_events.append(message_body)
                
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse SQS message {record['messageId']}: {e}")
            logger.error(f"Raw message body: {record['body']}")
            failed_message_ids.append(record['messageId'])
            continue
            
    return s3_events, failed_message_ids

def deduplicate_s3_events(s3_events: List[Dict]) -> Set[str]:
    """Deduplicate S3 events by object key."""
    unique_files = set()
    
    for event in s3_events:
        try:
            if 's3' in event and 'object' in event['s3']:
                object_key = event['s3']['object']['key']
                bucket_name = event['s3']['bucket']['name']
                file_identifier = f"{bucket_name}/{object_key}"
                
                unique_files.add(file_identifier)
                logger.debug(f"Processing file: {file_identifier}")
                    
        except KeyError as e:
            logger.error(f"Invalid S3 event structure: {e}")
            continue
            
    return unique_files

def is_ingestion_job_running(knowledge_base_id: str, data_source_id: str) -> bool:
    """Check if there's already an ingestion job running."""
    try:
        response = bedrock_agent.list_ingestion_jobs(
            knowledgeBaseId=knowledge_base_id,
            dataSourceId=data_source_id,
            maxResults=MAX_INGESTION_JOBS_TO_CHECK
        )
        
        for job in response.get('ingestionJobSummaries', []):
            if job['status'] in ['STARTING', 'IN_PROGRESS']:
                logger.info(f"Found running ingestion job: {job['ingestionJobId']}")
                return True
                
        return False
        
    except Exception as e:
        logger.error(f"Error checking ingestion job status: {e}")
        return False
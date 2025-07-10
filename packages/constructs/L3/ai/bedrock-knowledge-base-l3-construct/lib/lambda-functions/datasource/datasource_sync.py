import json
import os
import boto3
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

bedrock_agent = boto3.client('bedrock-agent')

def lambda_handler(event, context):
    """
    Lambda function to sync Bedrock Knowledge Base data source when S3 objects are created/updated.
    
    This function is triggered by EventBridge rules when S3 objects are created or updated.
    It starts an ingestion job for the specified knowledge base data source to sync the changes.
    
    Environment Variables:
        KNOWLEDGE_BASE_ID: The ID of the Bedrock Knowledge Base
        DATA_SOURCE_ID: The ID of the data source within the knowledge base
    
    Args:
        event: EventBridge event containing S3 object details
        context: Lambda context object
        
    Returns:
        dict: Response with status code and ingestion job details
    """
    try:
        knowledge_base_id = os.environ['KNOWLEDGE_BASE_ID']
        data_source_id = os.environ['DATA_SOURCE_ID']
        
        logger.info(f"Starting ingestion job for KB: {knowledge_base_id}, DS: {data_source_id}")
        
        response = bedrock_agent.start_ingestion_job(
            knowledgeBaseId=knowledge_base_id,
            dataSourceId=data_source_id
        )
        
        logger.info(f"Ingestion job started: {response['ingestionJob']['ingestionJobId']}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Ingestion job started successfully',
                'ingestionJobId': response['ingestionJob']['ingestionJobId']
            })
        }
        
    except Exception as e:
        logger.error(f"Error starting ingestion job: {str(e)}")
        raise e

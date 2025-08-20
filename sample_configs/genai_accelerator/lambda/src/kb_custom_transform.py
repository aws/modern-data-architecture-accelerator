import json
import logging
import boto3
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)
s3_client = boto3.client('s3')

def lambda_handler(event, context):
    """
    Handler function for the knowledge base custom transformer Lambda.
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        bucket_name = event.get("bucketName")
        input_files = event.get("inputFiles", [])
        output_files = []
        
        for input_file in input_files:
            transformed_file = transform_file(input_file, bucket_name)
            output_files.append(transformed_file)
        
        response = {
            "outputFiles": output_files
        }
        
        logger.info(f"Returning response with {len(output_files)} files")
        return response
    
    except Exception as e:
        logger.exception("Error processing document")
        return {
            "outputFiles": []
        }

def transform_file(input_file, bucket_name):
    """Transform a single file by reading and modifying JSON content from S3."""
    
    # Get original metadata and enhance it
    original_metadata = input_file.get("fileMetadata", {})
    enhanced_metadata = original_metadata.copy()
    enhanced_metadata["processedDate"] = datetime.now().isoformat()
    enhanced_metadata["processorVersion"] = "1.0.0"
    
    # Transform content batches
    original_batches = input_file.get("contentBatches", [])
    transformed_batches = []
    
    for batch in original_batches:
        s3_key = batch.get("key")
        if s3_key:
            # Read JSON content from S3
            try:
                response = s3_client.get_object(Bucket=bucket_name, Key=s3_key)
                content = json.loads(response['Body'].read().decode('utf-8'))
                
                # Transform the content
                transformed_content = transform_content(content)
                
                # Write transformed content back to S3 with new key
                new_key = s3_key.replace('.JSON', '_transformed.JSON')
                s3_client.put_object(
                    Bucket=bucket_name,
                    Key=new_key,
                    Body=json.dumps(transformed_content),
                    ContentType='application/json'
                )
                
                # Add transformed batch with new key
                transformed_batch = {
                    "key": new_key,
                    "transformed": True,
                    "transformedAt": datetime.now().isoformat()
                }
                transformed_batches.append(transformed_batch)
                
            except Exception as e:
                logger.error(f"Error processing batch {s3_key}: {str(e)}")
                # Keep original batch if transformation fails
                transformed_batches.append(batch)
    
    return {
        "originalFileLocation": input_file.get("originalFileLocation", {}),
        "fileMetadata": enhanced_metadata,
        "contentBatches": transformed_batches
    }

def transform_content(content):
    """Transform the actual JSON content."""
    
    # If content has text field, enhance it
    if isinstance(content, dict) and 'text' in content:
        original_text = content['text']
        
        # Add prefix to make content more searchable
        enhanced_text = f"[PRODUCT DOCUMENTATION] {original_text}"
        
        # Create transformed content
        transformed_content = content.copy()
        transformed_content['text'] = enhanced_text
        transformed_content['transformation_applied'] = True
        transformed_content['transformation_timestamp'] = datetime.now().isoformat()
        
        return transformed_content
    
    # If it's a list, transform each item
    elif isinstance(content, list):
        return [transform_content(item) for item in content]
    
    # Return as-is if no transformation needed
    return content

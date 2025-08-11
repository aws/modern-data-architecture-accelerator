import json
import boto3
import os
import uuid
from datetime import datetime
from aws_lambda_powertools import Logger

# Initialize logger
logger = Logger()

@logger.inject_lambda_context
def lambda_handler(event, context):
    """
    Handler function for the knowledge base custom transformer Lambda.
    This function processes documents before they are ingested into the knowledge base.
    
    Args:
        event: The event dict from Bedrock Knowledge Base
        context: The Lambda context
        
    Returns:
        The transformed document
    """
    try:
        logger.info("Received event", extra={"event": event})
        
        # Extract the document content from the event
        document = event.get("document", {})
        metadata = document.get("metadata", {})
        content = document.get("content", "")
        
        # Process the document based on its type
        document_type = metadata.get("documentType", "unknown")
        
        if document_type == "product_manual":
            transformed_content = transform_product_manual(content, metadata)
        elif document_type == "faq":
            transformed_content = transform_faq(content, metadata)
        else:
            # Default transformation
            transformed_content = add_standard_metadata(content, metadata)
        
        # Return the transformed document
        return {
            "document": {
                "id": document.get("id", str(uuid.uuid4())),
                "metadata": transformed_content["metadata"],
                "content": transformed_content["content"]
            }
        }
    
    except Exception as e:
        logger.exception("Error processing document")
        # In case of error, return the original document
        return {
            "document": document
        }

def transform_product_manual(content, metadata):
    """
    Transform a product manual document.
    
    Args:
        content: The document content
        metadata: The document metadata
        
    Returns:
        The transformed document content and metadata
    """
    # Add additional metadata
    enhanced_metadata = metadata.copy()
    enhanced_metadata["contentType"] = "product_manual"
    enhanced_metadata["processedDate"] = datetime.now().isoformat()
    
    # Extract product information if available
    if "productName" in metadata:
        enhanced_metadata["searchableProduct"] = metadata["productName"].lower()
    
    # Add section headers to improve searchability
    processed_content = content
    
    # Return the transformed content and metadata
    return {
        "content": processed_content,
        "metadata": enhanced_metadata
    }

def transform_faq(content, metadata):
    """
    Transform an FAQ document.
    
    Args:
        content: The document content
        metadata: The document metadata
        
    Returns:
        The transformed document content and metadata
    """
    # Add additional metadata
    enhanced_metadata = metadata.copy()
    enhanced_metadata["contentType"] = "faq"
    enhanced_metadata["processedDate"] = datetime.utcnow().isoformat()
    
    # Add FAQ-specific formatting
    processed_content = content
    
    # Return the transformed content and metadata
    return {
        "content": processed_content,
        "metadata": enhanced_metadata
    }

def add_standard_metadata(content, metadata):
    """
    Add standard metadata to any document type.
    
    Args:
        content: The document content
        metadata: The document metadata
        
    Returns:
        The document content with standard metadata added
    """
    # Add standard metadata fields
    enhanced_metadata = metadata.copy()
    enhanced_metadata["processedDate"] = datetime.utcnow().isoformat()
    enhanced_metadata["processorVersion"] = "1.0.0"
    
    # Return the content with standard metadata
    return {
        "content": content,
        "metadata": enhanced_metadata
    }

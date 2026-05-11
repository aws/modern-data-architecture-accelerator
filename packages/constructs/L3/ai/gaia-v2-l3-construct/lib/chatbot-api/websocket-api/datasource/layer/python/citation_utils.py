"""
Utility functions for handling citations
"""
import logging
from typing import Dict, Any, List, Tuple, Optional

# Configure logging
logger = logging.getLogger(__name__)

# Mapping of location type to (location_key, url_field)
LOCATION_TYPE_CONFIG: Dict[str, Tuple[str, str]] = {
    'S3': ('s3Location', 'uri'),
    'WEB': ('webLocation', 'url'),
    'CONFLUENCE': ('confluenceLocation', 'url'),
    'SALESFORCE': ('salesforceLocation', 'url'),
    'SHAREPOINT': ('sharePointLocation', 'url'),
    'KENDRA': ('kendraDocumentLocation', 'uri'),
}


def _remove_byte_content(reference: Dict[str, Any]) -> None:
    """Remove byte content from reference to avoid DynamoDB size limits."""
    content = reference.get('content')
    if content is not None and 'byteContent' in content:
        del reference['content']


def _get_source_link_from_location(location: Dict[str, Any], location_type: Optional[str]) -> Optional[str]:
    """Extract the source link from a location based on its type."""
    if not location_type or location_type not in LOCATION_TYPE_CONFIG:
        return None
    
    location_key, url_field = LOCATION_TYPE_CONFIG[location_type]
    return location.get(location_key, {}).get(url_field, '')


def _apply_source_url_override(
    processed_reference: Dict[str, Any],
    location: Dict[str, Any],
    location_type: Optional[str],
    source_url: str
) -> None:
    """Override the source URL in the location if the location key exists."""
    if not location_type or location_type not in LOCATION_TYPE_CONFIG:
        return
    
    location_key, url_field = LOCATION_TYPE_CONFIG[location_type]
    if location_key in location:
        processed_reference['location'][location_key][url_field] = source_url
        logger.info(f"Using source_url from metadata: {source_url}")


def process_retrieved_reference_with_metadata_override(retrieved_reference: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a retrieved reference to override source information based on metadata.
    This implements the same logic as the original bedrock-chat project.
    """
    processed_reference = retrieved_reference.copy()
    
    _remove_byte_content(processed_reference)

    metadata = retrieved_reference.get('metadata', {})
    if not metadata:
        return processed_reference

    location = retrieved_reference.get('location', {})
    location_type = location.get('type')

    # Apply source_url override from metadata
    source_url = metadata.get("source_url")
    if source_url:
        _apply_source_url_override(processed_reference, location, location_type, source_url)

    # Apply title from metadata
    title = metadata.get("title")
    if title:
        processed_reference['metadata']['title'] = title
        logger.info(f"Using title from metadata as source_name: {title}")

    return processed_reference

def process_retrieved_documents_with_citations(retrieved_documents: List[Dict[str, Any]], enable_citations: bool = False) -> List[Dict[str, Any]]:
    """Process documents and add sourceIds when citations are enabled"""
    processed_docs = []
    for idx, doc in enumerate(retrieved_documents):
        # Generate consistent sourceId
        source_id = f"doc_{idx + 1}"
        doc_with_source = doc.copy()
        if enable_citations:
            doc_with_source['sourceId'] = source_id
        processed_docs.append(doc_with_source)
    return processed_docs

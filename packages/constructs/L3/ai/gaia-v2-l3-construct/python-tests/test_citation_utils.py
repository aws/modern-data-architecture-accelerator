# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

"""
Unit tests for citation utilities module.
Tests citation processing, metadata override, and document processing with citations.
"""

import pytest
from unittest.mock import Mock, patch

# Import the module under test
import sys
import os

from citation_utils import (
    process_retrieved_reference_with_metadata_override,
    process_retrieved_documents_with_citations
)


class TestProcessRetrievedReference:
    """Test class for process_retrieved_reference_with_metadata_override"""

    def setup_method(self):
        """Setup test fixtures"""
        self.base_s3_reference = {
            'content': {'text': 'Sample content'},
            'location': {
                'type': 'S3',
                's3Location': {
                    'uri': 's3://bucket/original-file.pdf'
                }
            },
            'metadata': {}
        }

    def test_process_s3_reference_without_metadata(self):
        """Test processing S3 reference without metadata override"""
        result = process_retrieved_reference_with_metadata_override(self.base_s3_reference)
        
        # Should return a copy without modifications
        assert result['location']['type'] == 'S3'
        assert result['location']['s3Location']['uri'] == 's3://bucket/original-file.pdf'

    def test_process_s3_reference_with_source_url_override(self):
        """Test processing S3 reference with source_url metadata override"""
        reference = self.base_s3_reference.copy()
        reference['location'] = {
            'type': 'S3',
            's3Location': {
                'uri': 's3://bucket/original-file.pdf'
            }
        }
        reference['metadata'] = {
            'source_url': 'https://example.com/better-source.pdf'
        }
        
        result = process_retrieved_reference_with_metadata_override(reference)
        
        # URI should be overridden
        assert result['location']['s3Location']['uri'] == 'https://example.com/better-source.pdf'

    def test_process_s3_reference_with_title_override(self):
        """Test processing S3 reference with title metadata"""
        reference = self.base_s3_reference.copy()
        reference['metadata'] = {
            'title': 'Custom Document Title'
        }
        
        result = process_retrieved_reference_with_metadata_override(reference)
        
        # Title should be added to metadata
        assert result['metadata']['title'] == 'Custom Document Title'

    def test_process_web_reference_with_metadata(self):
        """Test processing WEB reference with metadata override"""
        reference = {
            'content': {'text': 'Web content'},
            'location': {
                'type': 'WEB',
                'webLocation': {
                    'url': 'https://original.com/page'
                }
            },
            'metadata': {
                'source_url': 'https://better.com/page',
                'title': 'Better Page Title'
            }
        }
        
        result = process_retrieved_reference_with_metadata_override(reference)
        
        assert result['location']['webLocation']['url'] == 'https://better.com/page'
        assert result['metadata']['title'] == 'Better Page Title'

    def test_process_confluence_reference_with_metadata(self):
        """Test processing CONFLUENCE reference with metadata override"""
        reference = {
            'content': {'text': 'Confluence content'},
            'location': {
                'type': 'CONFLUENCE',
                'confluenceLocation': {
                    'url': 'https://confluence.example.com/page1'
                }
            },
            'metadata': {
                'source_url': 'https://confluence.example.com/page2'
            }
        }
        
        result = process_retrieved_reference_with_metadata_override(reference)
        
        assert result['location']['confluenceLocation']['url'] == 'https://confluence.example.com/page2'

    def test_process_salesforce_reference_with_metadata(self):
        """Test processing SALESFORCE reference with metadata override"""
        reference = {
            'content': {'text': 'Salesforce content'},
            'location': {
                'type': 'SALESFORCE',
                'salesforceLocation': {
                    'url': 'https://salesforce.example.com/record1'
                }
            },
            'metadata': {
                'source_url': 'https://salesforce.example.com/record2',
                'title': 'SF Record'
            }
        }
        
        result = process_retrieved_reference_with_metadata_override(reference)
        
        assert result['location']['salesforceLocation']['url'] == 'https://salesforce.example.com/record2'
        assert result['metadata']['title'] == 'SF Record'

    def test_process_sharepoint_reference_with_metadata(self):
        """Test processing SHAREPOINT reference with metadata override"""
        reference = {
            'content': {'text': 'SharePoint content'},
            'location': {
                'type': 'SHAREPOINT',
                'sharePointLocation': {
                    'url': 'https://sharepoint.example.com/doc1'
                }
            },
            'metadata': {
                'source_url': 'https://sharepoint.example.com/doc2'
            }
        }
        
        result = process_retrieved_reference_with_metadata_override(reference)
        
        assert result['location']['sharePointLocation']['url'] == 'https://sharepoint.example.com/doc2'

    def test_process_kendra_reference_with_metadata(self):
        """Test processing KENDRA reference with metadata override"""
        reference = {
            'content': {'text': 'Kendra content'},
            'location': {
                'type': 'KENDRA',
                'kendraDocumentLocation': {
                    'uri': 's3://kendra-bucket/doc1.pdf'
                }
            },
            'metadata': {
                'source_url': 'https://public-doc.com/doc1.pdf'
            }
        }
        
        result = process_retrieved_reference_with_metadata_override(reference)
        
        assert result['location']['kendraDocumentLocation']['uri'] == 'https://public-doc.com/doc1.pdf'

    def test_process_reference_without_location(self):
        """Test processing reference without location field"""
        reference = {
            'content': {'text': 'Content only'},
            'metadata': {
                'source_url': 'https://example.com'
            }
        }
        
        result = process_retrieved_reference_with_metadata_override(reference)
        
        # Should not crash, just return the reference
        assert result['content']['text'] == 'Content only'
        assert 'location' not in result

    def test_process_reference_with_empty_metadata(self):
        """Test processing reference with empty metadata"""
        result = process_retrieved_reference_with_metadata_override(self.base_s3_reference)
        
        # Should return unchanged reference
        assert result['location']['s3Location']['uri'] == 's3://bucket/original-file.pdf'

    def test_process_reference_removes_byte_content(self):
        """Test that byte content is removed from reference"""
        reference = {
            'content': {
                'text': 'Sample content',
                'byteContent': b'binary data here'
            },
            'location': {
                'type': 'S3',
                's3Location': {'uri': 's3://bucket/file.pdf'}
            },
            'metadata': {}
        }
        
        result = process_retrieved_reference_with_metadata_override(reference)
        
        # Content field should be removed when byteContent exists
        assert 'content' not in result

    def test_process_reference_preserves_other_metadata_fields(self):
        """Test that other metadata fields are preserved"""
        reference = self.base_s3_reference.copy()
        reference['metadata'] = {
            'source_url': 'https://example.com/doc.pdf',
            'title': 'Document Title',
            'author': 'John Doe',
            'date': '2024-01-01',
            'custom_field': 'custom value'
        }
        
        result = process_retrieved_reference_with_metadata_override(reference)
        
        # All metadata fields should be preserved
        assert result['metadata']['source_url'] == 'https://example.com/doc.pdf'
        assert result['metadata']['title'] == 'Document Title'
        assert result['metadata']['author'] == 'John Doe'
        assert result['metadata']['date'] == '2024-01-01'
        assert result['metadata']['custom_field'] == 'custom value'


class TestProcessRetrievedDocumentsWithCitations:
    """Test class for process_retrieved_documents_with_citations"""

    def setup_method(self):
        """Setup test fixtures"""
        self.sample_documents = [
            {
                'retrievedReference': {
                    'content': {'text': 'Document 1 content'},
                    'location': {'type': 'S3'}
                },
                'generatedResponsePart': 'Response part 1'
            },
            {
                'retrievedReference': {
                    'content': {'text': 'Document 2 content'},
                    'location': {'type': 'WEB'}
                },
                'generatedResponsePart': 'Response part 2'
            },
            {
                'retrievedReference': {
                    'content': {'text': 'Document 3 content'},
                    'location': {'type': 'S3'}
                },
                'generatedResponsePart': 'Response part 3'
            }
        ]

    def test_process_documents_with_citations_enabled(self):
        """Test processing documents with citations enabled"""
        result = process_retrieved_documents_with_citations(
            self.sample_documents,
            enable_citations=True
        )
        
        assert len(result) == 3
        
        # Each document should have a sourceId
        assert result[0]['sourceId'] == 'doc_1'
        assert result[1]['sourceId'] == 'doc_2'
        assert result[2]['sourceId'] == 'doc_3'
        
        # Original content should be preserved
        assert result[0]['retrievedReference']['content']['text'] == 'Document 1 content'
        assert result[1]['retrievedReference']['content']['text'] == 'Document 2 content'

    def test_process_documents_with_citations_disabled(self):
        """Test processing documents with citations disabled"""
        result = process_retrieved_documents_with_citations(
            self.sample_documents,
            enable_citations=False
        )
        
        assert len(result) == 3
        
        # Documents should not have sourceId
        assert 'sourceId' not in result[0]
        assert 'sourceId' not in result[1]
        assert 'sourceId' not in result[2]
        
        # Original content should still be preserved
        assert result[0]['retrievedReference']['content']['text'] == 'Document 1 content'

    def test_process_empty_documents_list(self):
        """Test processing empty documents list"""
        result = process_retrieved_documents_with_citations([], enable_citations=True)
        
        assert result == []

    def test_process_single_document(self):
        """Test processing single document"""
        single_doc = [self.sample_documents[0]]
        
        result = process_retrieved_documents_with_citations(
            single_doc,
            enable_citations=True
        )
        
        assert len(result) == 1
        assert result[0]['sourceId'] == 'doc_1'

    def test_process_documents_preserves_order(self):
        """Test that document order is preserved"""
        result = process_retrieved_documents_with_citations(
            self.sample_documents,
            enable_citations=True
        )
        
        # Check that order is maintained
        for i, doc in enumerate(result):
            expected_source_id = f'doc_{i + 1}'
            assert doc['sourceId'] == expected_source_id
            assert doc['retrievedReference']['content']['text'] == f'Document {i + 1} content'

    def test_process_documents_creates_copy(self):
        """Test that processing creates a copy and doesn't modify originals"""
        original_docs = self.sample_documents.copy()
        
        result = process_retrieved_documents_with_citations(
            self.sample_documents,
            enable_citations=True
        )
        
        # Original documents should not have sourceId
        assert 'sourceId' not in self.sample_documents[0]
        
        # Result documents should have sourceId
        assert result[0]['sourceId'] == 'doc_1'

    def test_process_documents_default_enable_citations(self):
        """Test default value for enable_citations parameter"""
        result = process_retrieved_documents_with_citations(self.sample_documents)
        
        # Default is False, so no sourceId should be added
        assert 'sourceId' not in result[0]


class TestCitationUtilsEdgeCases:
    """Test edge cases and error scenarios"""

    def test_process_reference_with_none_values(self):
        """Test handling None values in reference"""
        reference = {
            'content': None,
            'location': None,
            'metadata': None
        }
        
        # Should not crash
        result = process_retrieved_reference_with_metadata_override(reference)
        assert result is not None

    def test_process_reference_with_missing_location_type(self):
        """Test processing reference with missing location type"""
        reference = {
            'content': {'text': 'Content'},
            'location': {
                's3Location': {'uri': 's3://bucket/file.pdf'}
                # Missing 'type' field
            },
            'metadata': {
                'source_url': 'https://example.com/file.pdf'
            }
        }
        
        result = process_retrieved_reference_with_metadata_override(reference)
        
        # Should not crash, original URI should remain
        assert result['location']['s3Location']['uri'] == 's3://bucket/file.pdf'

    def test_process_documents_with_malformed_document(self):
        """Test processing documents with malformed structure"""
        malformed_docs = [
            {'retrievedReference': {}},  # Missing fields
            {},  # Missing retrievedReference
            {'retrievedReference': {'content': {'text': 'Valid'}}}  # Valid
        ]
        
        result = process_retrieved_documents_with_citations(
            malformed_docs,
            enable_citations=True
        )
        
        # Should process all documents without crashing
        assert len(result) == 3
        assert result[0]['sourceId'] == 'doc_1'
        assert result[2]['sourceId'] == 'doc_3'


if __name__ == '__main__':
    pytest.main([__file__])
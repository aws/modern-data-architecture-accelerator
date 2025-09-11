"""
Unit tests for file-import-batch-job main.py module.
"""
import pytest
import json
from unittest.mock import MagicMock, patch
from botocore.exceptions import ClientError

import genai_core.types


class TestFileImportMain:
    """Test cases for file-import-batch-job main.py module."""

    @pytest.fixture
    def sample_workspace(self):
        """Sample workspace data."""
        return {
            "workspace_id": "test-workspace-123",
            "name": "Test Workspace",
            "engine": "aurora",
            "embeddings_model_provider": "bedrock",
            "embeddings_model_name": "amazon.titan-embed-text-v1",
            "chunking_strategy": "recursive",
            "chunk_size": 1000,
            "chunk_overlap": 200
        }

    @pytest.fixture
    def sample_document(self):
        """Sample document data."""
        return {
            "document_id": "doc-123",
            "workspace_id": "test-workspace-123",
            "document_type": "text",
            "document_sub_type": "pdf",
            "path": "/documents/test.pdf",
            "title": "Test Document",
            "status": "processing"
        }

    def test_add_chunks_function(self, sample_workspace, sample_document):
        """Test the add_chunks helper function."""
        content = "This is test content for chunking."
        
        with patch('genai_core.chunks.split_content', return_value=["chunk1", "chunk2", "chunk3"]) as mock_split, \
             patch('genai_core.chunks.add_chunks') as mock_add_chunks:
            
            # Import the module to get the add_chunks function
            with patch('logging.getLogger'), \
                 patch('boto3.client'), \
                 patch.dict('os.environ', {'USER_AGENT_STRING': 'test'}):
                import main as file_import_main
                
                file_import_main.add_chunks(sample_workspace, sample_document, content)
                
                mock_split.assert_called_once_with(sample_workspace, content)
                mock_add_chunks.assert_called_once_with(
                    workspace=sample_workspace,
                    document=sample_document,
                    document_sub_id=None,
                    chunks=["chunk1", "chunk2", "chunk3"],
                    chunk_complements=None,
                    replace=True
                )

    def test_main_function_with_mocked_constants(self, sample_workspace, sample_document):
        """Test main function by mocking the module constants directly."""
        mock_s3_client = MagicMock()
        mock_s3_client.get_object.return_value = {
            "Body": MagicMock(read=MagicMock(return_value=b"Test file content"))
        }
        
        with patch('logging.getLogger'), \
             patch('boto3.client', return_value=mock_s3_client), \
             patch.dict('os.environ', {'USER_AGENT_STRING': 'test'}), \
             patch('genai_core.workspaces.get_workspace', return_value=sample_workspace), \
             patch('genai_core.documents.get_document', return_value=sample_document), \
             patch('main.add_chunks') as mock_add_chunks:
            
            import main as file_import_main
            
            # Mock the module constants directly
            file_import_main.WORKSPACE_ID = "test-workspace-123"
            file_import_main.DOCUMENT_ID = "doc-123"
            file_import_main.INPUT_BUCKET_NAME = "input-bucket"
            file_import_main.INPUT_OBJECT_KEY = "documents/test.txt"
            file_import_main.PROCESSING_BUCKET_NAME = "processing-bucket"
            file_import_main.PROCESSING_OBJECT_KEY = "processed/test.txt"
            
            file_import_main.main()

            # Verify S3 operations
            mock_s3_client.get_object.assert_called_once_with(
                Bucket="input-bucket", Key="documents/test.txt"
            )
            mock_s3_client.put_object.assert_called_once_with(
                Bucket="processing-bucket", 
                Key="processed/test.txt", 
                Body="Test file content"
            )
            
            # Verify add_chunks was called
            mock_add_chunks.assert_called_once_with(
                sample_workspace, sample_document, "Test file content"
            )

    def test_main_function_workspace_not_found(self):
        """Test main function when workspace is not found."""
        with patch('logging.getLogger'), \
             patch('boto3.client'), \
             patch.dict('os.environ', {'USER_AGENT_STRING': 'test'}), \
             patch('genai_core.workspaces.get_workspace', return_value=None):
            
            import main as file_import_main
            
            # Mock the module constants directly
            file_import_main.WORKSPACE_ID = "test-workspace-123"
            file_import_main.DOCUMENT_ID = "doc-123"
            
            with pytest.raises(genai_core.types.CommonError, match="Workspace test-workspace-123 does not exist"):
                file_import_main.main()

    def test_main_function_document_not_found(self, sample_workspace):
        """Test main function when document is not found."""
        with patch('logging.getLogger'), \
             patch('boto3.client'), \
             patch.dict('os.environ', {'USER_AGENT_STRING': 'test'}), \
             patch('genai_core.workspaces.get_workspace', return_value=sample_workspace), \
             patch('genai_core.documents.get_document', return_value=None):
            
            import main as file_import_main
            
            # Mock the module constants directly
            file_import_main.WORKSPACE_ID = "test-workspace-123"
            file_import_main.DOCUMENT_ID = "doc-123"
            
            with pytest.raises(genai_core.types.CommonError, match="Document test-workspace-123/doc-123 does not exist"):
                file_import_main.main()

    def test_main_function_s3_error_handling(self, sample_workspace, sample_document):
        """Test main function error handling when S3 operation fails."""
        mock_s3_client = MagicMock()
        mock_s3_client.get_object.side_effect = ClientError(
            error_response={'Error': {'Code': 'NoSuchKey'}},
            operation_name='GetObject'
        )
        
        with patch('logging.getLogger'), \
             patch('boto3.client', return_value=mock_s3_client), \
             patch.dict('os.environ', {'USER_AGENT_STRING': 'test'}), \
             patch('genai_core.workspaces.get_workspace', return_value=sample_workspace), \
             patch('genai_core.documents.get_document', return_value=sample_document), \
             patch('genai_core.documents.set_status') as mock_set_status:
            
            import main as file_import_main
            
            # Mock the module constants directly
            file_import_main.WORKSPACE_ID = "test-workspace-123"
            file_import_main.DOCUMENT_ID = "doc-123"
            file_import_main.INPUT_BUCKET_NAME = "input-bucket"
            file_import_main.INPUT_OBJECT_KEY = "documents/test.txt"
            file_import_main.PROCESSING_BUCKET_NAME = "processing-bucket"
            file_import_main.PROCESSING_OBJECT_KEY = "processed/test.txt"
            
            with pytest.raises(ClientError):
                file_import_main.main()

            # Verify error status was set
            mock_set_status.assert_called_once_with("test-workspace-123", "doc-123", "error")




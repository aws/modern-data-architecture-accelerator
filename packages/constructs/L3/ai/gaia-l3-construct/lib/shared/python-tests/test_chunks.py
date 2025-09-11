"""
Unit tests for chunks.py module.
"""
import pytest
import uuid
from unittest.mock import MagicMock, patch, Mock
from moto import mock_aws
import boto3

# Import the modules under test
import genai_core.chunks
import genai_core.types


class TestChunks:
    """Test cases for chunks.py module."""

    @pytest.fixture
    def sample_workspace_aurora(self):
        """Sample workspace configuration for Aurora."""
        return {
            "workspace_id": "test-workspace-123",
            "engine": "aurora",
            "embeddings_model_provider": "bedrock",
            "embeddings_model_name": "amazon.titan-embed-text-v1",
            "chunking_strategy": "recursive",
            "chunk_size": 1000,
            "chunk_overlap": 200
        }

    @pytest.fixture
    def sample_workspace_opensearch(self):
        """Sample workspace configuration for OpenSearch."""
        return {
            "workspace_id": "test-workspace-456",
            "engine": "opensearch",
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
            "document_type": "text",
            "document_sub_type": "pdf",
            "path": "/documents/test.pdf",
            "title": "Test Document"
        }

    @pytest.fixture
    def sample_chunks(self):
        """Sample chunk data."""
        return [
            "This is the first chunk of text content.",
            "This is the second chunk of text content.",
            "This is the third chunk of text content."
        ]

    @pytest.fixture
    def sample_chunk_complements(self):
        """Sample chunk complements."""
        return [
            "Complement for first chunk",
            "Complement for second chunk",
            "Complement for third chunk"
        ]

    @pytest.fixture
    def mock_embeddings_model(self):
        """Mock embeddings model."""
        return MagicMock()

    @pytest.fixture
    def mock_chunk_embeddings(self):
        """Mock chunk embeddings."""
        return [
            [0.1, 0.2, 0.3],
            [0.4, 0.5, 0.6],
            [0.7, 0.8, 0.9]
        ]

    @patch.dict('os.environ', {'PROCESSING_BUCKET_NAME': 'test-bucket'})
    @patch('genai_core.chunks.genai_core.embeddings.get_embeddings_model')
    @patch('genai_core.chunks.genai_core.embeddings.generate_embeddings')
    @patch('genai_core.chunks.genai_core.aurora.chunks.add_chunks_aurora')
    @patch('genai_core.chunks.genai_core.documents.set_document_vectors')
    @patch('genai_core.chunks.store_chunks_on_s3')
    def test_add_chunks_aurora_success(
        self,
        mock_store_s3,
        mock_set_vectors,
        mock_add_aurora,
        mock_generate_embeddings,
        mock_get_model,
        sample_workspace_aurora,
        sample_document,
        sample_chunks,
        sample_chunk_complements,
        mock_embeddings_model,
        mock_chunk_embeddings
    ):
        """Test successful addition of chunks with Aurora engine."""
        # Setup mocks
        mock_get_model.return_value = mock_embeddings_model
        mock_generate_embeddings.return_value = mock_chunk_embeddings
        mock_add_aurora.return_value = {"added_vectors": 3}

        # Call the function
        genai_core.chunks.add_chunks(
            replace=True,
            workspace=sample_workspace_aurora,
            document=sample_document,
            document_sub_id="sub-123",
            chunks=sample_chunks,
            chunk_complements=sample_chunk_complements
        )

        # Verify calls
        mock_get_model.assert_called_once_with("bedrock", "amazon.titan-embed-text-v1")
        mock_generate_embeddings.assert_called_once_with(mock_embeddings_model, sample_chunks)
        mock_store_s3.assert_called_once()
        mock_add_aurora.assert_called_once()
        mock_set_vectors.assert_called_once_with(
            "test-workspace-123", "doc-123", 3, replace=True
        )

    @patch.dict('os.environ', {'PROCESSING_BUCKET_NAME': 'test-bucket'})
    @patch('genai_core.chunks.genai_core.embeddings.get_embeddings_model')
    @patch('genai_core.chunks.genai_core.embeddings.generate_embeddings')
    @patch('genai_core.chunks.genai_core.opensearch.chunks.add_chunks_open_search')
    @patch('genai_core.chunks.genai_core.documents.set_document_vectors')
    @patch('genai_core.chunks.store_chunks_on_s3')
    def test_add_chunks_opensearch_success(
        self,
        mock_store_s3,
        mock_set_vectors,
        mock_add_opensearch,
        mock_generate_embeddings,
        mock_get_model,
        sample_workspace_opensearch,
        sample_document,
        sample_chunks,
        sample_chunk_complements,
        mock_embeddings_model,
        mock_chunk_embeddings
    ):
        """Test successful addition of chunks with OpenSearch engine."""
        # Setup mocks
        mock_get_model.return_value = mock_embeddings_model
        mock_generate_embeddings.return_value = mock_chunk_embeddings
        mock_add_opensearch.return_value = {"added_vectors": 3}

        # Call the function
        genai_core.chunks.add_chunks(
            replace=False,
            workspace=sample_workspace_opensearch,
            document=sample_document,
            document_sub_id=None,
            chunks=sample_chunks,
            chunk_complements=sample_chunk_complements
        )

        # Verify calls
        mock_get_model.assert_called_once_with("bedrock", "amazon.titan-embed-text-v1")
        mock_generate_embeddings.assert_called_once_with(mock_embeddings_model, sample_chunks)
        mock_store_s3.assert_called_once()
        mock_add_opensearch.assert_called_once()
        mock_set_vectors.assert_called_once_with(
            "test-workspace-456", "doc-123", 3, replace=False
        )

    @patch('genai_core.chunks.genai_core.embeddings.get_embeddings_model')
    def test_add_chunks_embeddings_model_not_found(
        self,
        mock_get_model,
        sample_workspace_aurora,
        sample_document,
        sample_chunks,
        sample_chunk_complements
    ):
        """Test add_chunks when embeddings model is not found."""
        # Setup mock to return None
        mock_get_model.return_value = None

        # Call the function and expect an exception
        with pytest.raises(genai_core.types.CommonError, match="Embeddings model not found"):
            genai_core.chunks.add_chunks(
                replace=True,
                workspace=sample_workspace_aurora,
                document=sample_document,
                document_sub_id=None,
                chunks=sample_chunks,
                chunk_complements=sample_chunk_complements
            )

    def test_add_chunks_unsupported_engine(
        self,
        sample_document,
        sample_chunks,
        sample_chunk_complements
    ):
        """Test add_chunks with unsupported engine."""
        workspace = {
            "workspace_id": "test-workspace",
            "engine": "unsupported_engine",
            "embeddings_model_provider": "bedrock",
            "embeddings_model_name": "amazon.titan-embed-text-v1"
        }

        with patch('genai_core.chunks.genai_core.embeddings.get_embeddings_model') as mock_get_model, \
             patch('genai_core.chunks.genai_core.embeddings.generate_embeddings') as mock_generate_embeddings, \
             patch('genai_core.chunks.store_chunks_on_s3'), \
             patch.dict('os.environ', {'PROCESSING_BUCKET_NAME': 'test-bucket'}):
            
            mock_get_model.return_value = MagicMock()
            mock_generate_embeddings.return_value = [[0.1], [0.2], [0.3]]
            
            with pytest.raises(genai_core.types.CommonError, match="Engine not supported"):
                genai_core.chunks.add_chunks(
                    replace=True,
                    workspace=workspace,
                    document=sample_document,
                    document_sub_id=None,
                    chunks=sample_chunks,
                    chunk_complements=sample_chunk_complements
                )

    def test_split_content_recursive_strategy(self, sample_workspace_aurora):
        """Test split_content with recursive chunking strategy."""
        content = "This is a long piece of text that should be split into multiple chunks. " * 50
        
        with patch('genai_core.chunks.RecursiveCharacterTextSplitter') as mock_splitter_class:
            mock_splitter = MagicMock()
            mock_splitter.split_text.return_value = [
                "First chunk of text",
                "Second chunk of text",
                "Third chunk with null character\x00"
            ]
            mock_splitter_class.return_value = mock_splitter

            result = genai_core.chunks.split_content(sample_workspace_aurora, content)

            # Verify splitter was created with correct parameters
            mock_splitter_class.assert_called_once_with(
                chunk_size=1000,
                chunk_overlap=200,
                length_function=len
            )
            
            # Verify null characters are replaced
            assert result == [
                "First chunk of text",
                "Second chunk of text",
                "Third chunk with null character\uFFFD"
            ]

    def test_split_content_unsupported_strategy(self):
        """Test split_content with unsupported chunking strategy."""
        workspace = {
            "chunking_strategy": "unsupported_strategy",
            "chunk_size": 1000,
            "chunk_overlap": 200
        }
        
        with pytest.raises(genai_core.types.CommonError, match="Chunking strategy not supported"):
            genai_core.chunks.split_content(workspace, "Some content")

    @patch('genai_core.chunks.genai_core.aurora.chunks.clean_chunks_aurora')
    def test_delete_chunks(self, mock_clean_aurora):
        """Test delete_chunks function."""
        workspace_id = "test-workspace"
        document_id = "test-document"
        
        genai_core.chunks.delete_chunks(workspace_id, document_id)
        
        mock_clean_aurora.assert_called_once_with(workspace_id, document_id)

    def test_store_chunks_on_s3_without_sub_id(self):
        """Test storing chunks on S3 without document sub ID."""
        workspace_id = "test-workspace"
        document_id = "test-document"
        document_sub_id = None
        chunk_ids = ["chunk-1", "chunk-2"]
        chunks = ["First chunk content", "Second chunk content"]
        
        # Mock the S3 resource and bucket name constant
        with patch('genai_core.chunks.s3') as mock_s3, \
             patch('genai_core.chunks.PROCESSING_BUCKET_NAME', 'test-bucket'):
            
            # Mock S3 Object behavior
            mock_s3.Object.return_value.put = MagicMock()
            
            genai_core.chunks.store_chunks_on_s3(
                workspace_id, document_id, document_sub_id, chunk_ids, chunks
            )
            
            # Verify S3 Object was called correctly
            assert mock_s3.Object.call_count == 2
            mock_s3.Object.assert_any_call('test-bucket', f'{workspace_id}/{document_id}/chunks/chunk-1.txt')
            mock_s3.Object.assert_any_call('test-bucket', f'{workspace_id}/{document_id}/chunks/chunk-2.txt')

    def test_store_chunks_on_s3_with_sub_id(self):
        """Test storing chunks on S3 with document sub ID."""
        workspace_id = "test-workspace"
        document_id = "test-document"
        document_sub_id = "sub-123"
        chunk_ids = ["chunk-1"]
        chunks = ["Chunk content with sub ID"]
        
        # Mock the S3 resource and bucket name constant
        with patch('genai_core.chunks.s3') as mock_s3, \
             patch('genai_core.chunks.PROCESSING_BUCKET_NAME', 'test-bucket'):
            
            # Mock S3 Object behavior
            mock_s3.Object.return_value.put = MagicMock()
            
            genai_core.chunks.store_chunks_on_s3(
                workspace_id, document_id, document_sub_id, chunk_ids, chunks
            )
            
            # Verify object was stored with sub ID in path
            expected_key = f'{workspace_id}/{document_id}/{document_sub_id}/chunks/chunk-1.txt'
            mock_s3.Object.assert_called_once_with('test-bucket', expected_key)

    @patch('genai_core.chunks.uuid.uuid4')
    def test_chunk_ids_generation(self, mock_uuid):
        """Test that chunk IDs are properly generated."""
        # Mock UUID generation
        mock_uuid.side_effect = [
            MagicMock(spec=uuid.UUID, __str__=lambda x: "uuid-1"),
            MagicMock(spec=uuid.UUID, __str__=lambda x: "uuid-2"),
            MagicMock(spec=uuid.UUID, __str__=lambda x: "uuid-3")
        ]
        
        with patch('genai_core.chunks.genai_core.embeddings.get_embeddings_model') as mock_get_model, \
             patch('genai_core.chunks.genai_core.embeddings.generate_embeddings') as mock_generate_embeddings, \
             patch('genai_core.chunks.genai_core.aurora.chunks.add_chunks_aurora') as mock_add_aurora, \
             patch('genai_core.chunks.genai_core.documents.set_document_vectors'), \
             patch('genai_core.chunks.store_chunks_on_s3') as mock_store_s3, \
             patch.dict('os.environ', {'PROCESSING_BUCKET_NAME': 'test-bucket'}):
            
            mock_get_model.return_value = MagicMock()
            mock_generate_embeddings.return_value = [[0.1], [0.2], [0.3]]
            mock_add_aurora.return_value = {"added_vectors": 3}
            
            workspace = {
                "workspace_id": "test-workspace",
                "engine": "aurora",
                "embeddings_model_provider": "bedrock",
                "embeddings_model_name": "amazon.titan-embed-text-v1"
            }
            document = {
                "document_id": "doc-123",
                "document_type": "text",
                "path": "/test.txt",
                "title": "Test"
            }
            chunks = ["chunk1", "chunk2", "chunk3"]
            
            genai_core.chunks.add_chunks(
                replace=True,
                workspace=workspace,
                document=document,
                document_sub_id=None,
                chunks=chunks,
                chunk_complements=[]
            )
            
            # Verify UUID generation was called for each chunk
            assert mock_uuid.call_count == 3
            
            # Verify store_chunks_on_s3 was called with generated UUIDs
            mock_store_s3.assert_called_once()
            call_args = mock_store_s3.call_args[0]  # positional args
            # Parameters: workspace_id, document_id, document_sub_id, chunk_ids, chunks
            chunk_ids = call_args[3]  # chunk_ids is the 4th parameter (index 3)
            assert chunk_ids is not None
            assert len(chunk_ids) == 3

    def test_add_chunks_with_custom_path(self, sample_workspace_aurora, sample_document, sample_chunks):
        """Test add_chunks with custom path parameter."""
        custom_path = "/custom/path/document.pdf"
        
        with patch('genai_core.chunks.genai_core.embeddings.get_embeddings_model') as mock_get_model, \
             patch('genai_core.chunks.genai_core.embeddings.generate_embeddings') as mock_generate_embeddings, \
             patch('genai_core.chunks.genai_core.aurora.chunks.add_chunks_aurora') as mock_add_aurora, \
             patch('genai_core.chunks.genai_core.documents.set_document_vectors'), \
             patch('genai_core.chunks.store_chunks_on_s3'), \
             patch.dict('os.environ', {'PROCESSING_BUCKET_NAME': 'test-bucket'}):
            
            mock_get_model.return_value = MagicMock()
            mock_generate_embeddings.return_value = [[0.1], [0.2], [0.3]]
            mock_add_aurora.return_value = {"added_vectors": 3}
            
            genai_core.chunks.add_chunks(
                replace=True,
                workspace=sample_workspace_aurora,
                document=sample_document,
                document_sub_id=None,
                chunks=sample_chunks,
                chunk_complements=[],
                path=custom_path
            )
            
            # Verify Aurora function was called with custom path
            mock_add_aurora.assert_called_once()
            call_kwargs = mock_add_aurora.call_args[1]
            assert call_kwargs['path'] == custom_path
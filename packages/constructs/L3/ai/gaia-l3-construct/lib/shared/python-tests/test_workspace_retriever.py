"""
Unit tests for workspace_retriever.py module.
"""
import pytest
from unittest.mock import MagicMock, patch
from langchain.schema import Document
from langchain.callbacks.manager import CallbackManagerForRetrieverRun

# Import the module under test
from genai_core.langchain.workspace_retriever import WorkspaceRetriever


class TestWorkspaceRetriever:
    """Test cases for WorkspaceRetriever class."""

    @pytest.fixture
    def workspace_id(self):
        """Sample workspace ID for testing."""
        return "test-workspace-123"

    @pytest.fixture
    def workspace_retriever(self, workspace_id):
        """Create a WorkspaceRetriever instance for testing."""
        return WorkspaceRetriever(workspace_id=workspace_id)

    @pytest.fixture
    def mock_callback_manager(self):
        """Mock callback manager for retriever run."""
        return MagicMock(spec=CallbackManagerForRetrieverRun)

    @pytest.fixture
    def sample_search_result(self):
        """Sample search result from semantic_search."""
        return {
            "items": [
                {
                    "chunk_id": "chunk-123",
                    "workspace_id": "test-workspace-123",
                    "document_id": "doc-456",
                    "document_sub_id": "sub-789",
                    "document_type": "text",
                    "document_sub_type": "pdf",
                    "path": "/documents/test.pdf",
                    "title": "Test Document",
                    "score": 0.95,
                    "content": "This is the original content",
                    "content_complement": "This is the enhanced content"
                },
                {
                    "chunk_id": "chunk-456",
                    "workspace_id": "test-workspace-123",
                    "document_id": "doc-789",
                    "document_sub_id": None,
                    "document_type": "text",
                    "document_sub_type": "txt",
                    "path": "/documents/another.txt",
                    "title": "Another Document",
                    "score": 0.87,
                    "content": "This is another content",
                    "content_complement": None
                }
            ]
        }

    @pytest.fixture
    def empty_search_result(self):
        """Empty search result from semantic_search."""
        return {"items": []}

    def test_workspace_retriever_initialization(self, workspace_id):
        """Test WorkspaceRetriever initialization."""
        retriever = WorkspaceRetriever(workspace_id=workspace_id)
        
        assert retriever.workspace_id == workspace_id
        assert retriever.documents_found == []

    @patch('genai_core.langchain.workspace_retriever.genai_core.semantic_search.semantic_search')
    def test_get_relevant_documents_success(
        self,
        mock_semantic_search,
        workspace_retriever,
        mock_callback_manager,
        sample_search_result
    ):
        """Test successful retrieval of relevant documents."""
        # Setup mock
        mock_semantic_search.return_value = sample_search_result
        query = "test query"

        # Call the method
        result = workspace_retriever._get_relevant_documents(
            query, run_manager=mock_callback_manager
        )

        # Verify semantic_search was called correctly
        mock_semantic_search.assert_called_once_with(
            workspace_retriever.workspace_id, query, limit=3, full_response=False
        )

        # Verify results
        assert len(result) == 2
        assert all(isinstance(doc, Document) for doc in result)
        
        # Check first document (with content_complement)
        first_doc = result[0]
        assert first_doc.page_content == "This is the enhanced content"
        assert first_doc.metadata["chunk_id"] == "chunk-123"
        assert first_doc.metadata["workspace_id"] == "test-workspace-123"
        assert first_doc.metadata["document_id"] == "doc-456"
        assert first_doc.metadata["document_sub_id"] == "sub-789"
        assert first_doc.metadata["document_type"] == "text"
        assert first_doc.metadata["document_sub_type"] == "pdf"
        assert first_doc.metadata["path"] == "/documents/test.pdf"
        assert first_doc.metadata["title"] == "Test Document"
        assert first_doc.metadata["score"] == 0.95

        # Check second document (without content_complement)
        second_doc = result[1]
        assert second_doc.page_content == "This is another content"
        assert second_doc.metadata["chunk_id"] == "chunk-456"
        assert second_doc.metadata["document_sub_id"] is None

    @patch('genai_core.langchain.workspace_retriever.genai_core.semantic_search.semantic_search')
    def test_get_relevant_documents_empty_result(
        self,
        mock_semantic_search,
        workspace_retriever,
        mock_callback_manager,
        empty_search_result
    ):
        """Test retrieval when no documents are found."""
        # Setup mock
        mock_semantic_search.return_value = empty_search_result
        query = "no results query"

        # Call the method
        result = workspace_retriever._get_relevant_documents(
            query, run_manager=mock_callback_manager
        )

        # Verify results
        assert len(result) == 0
        assert result == []

    @patch('genai_core.langchain.workspace_retriever.genai_core.semantic_search.semantic_search')
    def test_get_relevant_documents_missing_items_key(
        self,
        mock_semantic_search,
        workspace_retriever,
        mock_callback_manager
    ):
        """Test retrieval when search result doesn't have 'items' key."""
        # Setup mock with missing 'items' key
        mock_semantic_search.return_value = {}
        query = "test query"

        # Call the method
        result = workspace_retriever._get_relevant_documents(
            query, run_manager=mock_callback_manager
        )

        # Verify results
        assert len(result) == 0
        assert result == []

    def test_get_document_with_content_complement(self, workspace_retriever):
        """Test _get_document method with content_complement."""
        item = {
            "chunk_id": "chunk-123",
            "workspace_id": "test-workspace-123",
            "document_id": "doc-456",
            "document_sub_id": "sub-789",
            "document_type": "text",
            "document_sub_type": "pdf",
            "path": "/documents/test.pdf",
            "title": "Test Document",
            "score": 0.95,
            "content": "Original content",
            "content_complement": "Enhanced content"
        }

        document = workspace_retriever._get_document(item)

        assert isinstance(document, Document)
        assert document.page_content == "Enhanced content"  # Should use content_complement
        assert document.metadata["chunk_id"] == "chunk-123"
        assert document.metadata["workspace_id"] == "test-workspace-123"
        assert document.metadata["document_id"] == "doc-456"
        assert document.metadata["document_sub_id"] == "sub-789"
        assert document.metadata["document_type"] == "text"
        assert document.metadata["document_sub_type"] == "pdf"
        assert document.metadata["path"] == "/documents/test.pdf"
        assert document.metadata["title"] == "Test Document"
        assert document.metadata["score"] == 0.95

    def test_get_document_without_content_complement(self, workspace_retriever):
        """Test _get_document method without content_complement."""
        item = {
            "chunk_id": "chunk-456",
            "workspace_id": "test-workspace-123",
            "document_id": "doc-789",
            "document_sub_id": None,
            "document_type": "text",
            "document_sub_type": "txt",
            "path": "/documents/another.txt",
            "title": "Another Document",
            "score": 0.87,
            "content": "Original content"
            # No content_complement
        }

        document = workspace_retriever._get_document(item)

        assert isinstance(document, Document)
        assert document.page_content == "Original content"  # Should use content
        assert document.metadata["chunk_id"] == "chunk-456"
        assert document.metadata["document_sub_id"] is None

    def test_get_document_with_empty_content_complement(self, workspace_retriever):
        """Test _get_document method with empty content_complement."""
        item = {
            "chunk_id": "chunk-789",
            "workspace_id": "test-workspace-123",
            "document_id": "doc-123",
            "document_sub_id": "sub-456",
            "document_type": "text",
            "document_sub_type": "md",
            "path": "/documents/readme.md",
            "title": "README",
            "score": 0.75,
            "content": "Original content",
            "content_complement": ""  # Empty string
        }

        document = workspace_retriever._get_document(item)

        assert isinstance(document, Document)
        assert document.page_content == "Original content"  # Should fallback to content

    def test_get_last_search_documents_empty(self, workspace_retriever):
        """Test get_last_search_documents when no search has been performed."""
        result = workspace_retriever.get_last_search_documents()
        assert result == []

    @patch('genai_core.langchain.workspace_retriever.genai_core.semantic_search.semantic_search')
    def test_get_last_search_documents_after_search(
        self,
        mock_semantic_search,
        workspace_retriever,
        mock_callback_manager,
        sample_search_result
    ):
        """Test get_last_search_documents after performing a search."""
        # Setup mock
        mock_semantic_search.return_value = sample_search_result

        # Perform a search
        workspace_retriever._get_relevant_documents(
            "test query", run_manager=mock_callback_manager
        )

        # Get last search documents
        result = workspace_retriever.get_last_search_documents()

        assert len(result) == 2
        assert all(isinstance(doc, Document) for doc in result)
        assert result[0].page_content == "This is the enhanced content"
        assert result[1].page_content == "This is another content"

    @patch('genai_core.langchain.workspace_retriever.genai_core.semantic_search.semantic_search')
    def test_multiple_searches_update_documents_found(
        self,
        mock_semantic_search,
        workspace_retriever,
        mock_callback_manager
    ):
        """Test that multiple searches update the documents_found list."""
        # First search
        first_result = {
            "items": [
                {
                    "chunk_id": "chunk-1",
                    "workspace_id": "test-workspace-123",
                    "document_id": "doc-1",
                    "document_sub_id": None,
                    "document_type": "text",
                    "document_sub_type": "txt",
                    "path": "/first.txt",
                    "title": "First Document",
                    "score": 0.9,
                    "content": "First content"
                }
            ]
        }
        mock_semantic_search.return_value = first_result

        workspace_retriever._get_relevant_documents(
            "first query", run_manager=mock_callback_manager
        )
        first_documents = workspace_retriever.get_last_search_documents()
        assert len(first_documents) == 1
        assert first_documents[0].page_content == "First content"

        # Second search
        second_result = {
            "items": [
                {
                    "chunk_id": "chunk-2",
                    "workspace_id": "test-workspace-123",
                    "document_id": "doc-2",
                    "document_sub_id": None,
                    "document_type": "text",
                    "document_sub_type": "txt",
                    "path": "/second.txt",
                    "title": "Second Document",
                    "score": 0.8,
                    "content": "Second content"
                },
                {
                    "chunk_id": "chunk-3",
                    "workspace_id": "test-workspace-123",
                    "document_id": "doc-3",
                    "document_sub_id": None,
                    "document_type": "text",
                    "document_sub_type": "txt",
                    "path": "/third.txt",
                    "title": "Third Document",
                    "score": 0.7,
                    "content": "Third content"
                }
            ]
        }
        mock_semantic_search.return_value = second_result

        workspace_retriever._get_relevant_documents(
            "second query", run_manager=mock_callback_manager
        )
        second_documents = workspace_retriever.get_last_search_documents()
        assert len(second_documents) == 2
        assert second_documents[0].page_content == "Second content"
        assert second_documents[1].page_content == "Third content"

    @patch('genai_core.langchain.workspace_retriever.genai_core.semantic_search.semantic_search')
    @patch('genai_core.langchain.workspace_retriever.logger')
    def test_logging_debug_message(
        self,
        mock_logger,
        mock_semantic_search,
        workspace_retriever,
        mock_callback_manager,
        sample_search_result
    ):
        """Test that debug logging is called with the query."""
        mock_semantic_search.return_value = sample_search_result
        query = "test logging query"

        workspace_retriever._get_relevant_documents(
            query, run_manager=mock_callback_manager
        )

        # Verify debug logging was called
        mock_logger.debug.assert_called_once_with("SearchRequest", query=query)

    @patch('genai_core.langchain.workspace_retriever.genai_core.semantic_search.semantic_search')
    def test_semantic_search_exception_propagation(
        self,
        mock_semantic_search,
        workspace_retriever,
        mock_callback_manager
    ):
        """Test that exceptions from semantic_search are properly propagated."""
        # Setup mock to raise an exception
        mock_semantic_search.side_effect = Exception("Search service unavailable")

        # Call should raise the exception
        with pytest.raises(Exception, match="Search service unavailable"):
            workspace_retriever._get_relevant_documents(
                "test query", run_manager=mock_callback_manager
            )

    def test_workspace_retriever_inherits_from_base_retriever(self, workspace_retriever):
        """Test that WorkspaceRetriever properly inherits from BaseRetriever."""
        from langchain.schema import BaseRetriever
        
        assert isinstance(workspace_retriever, BaseRetriever)
        assert hasattr(workspace_retriever, '_get_relevant_documents')
        assert callable(workspace_retriever._get_relevant_documents)
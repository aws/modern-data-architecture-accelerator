"""
Shared pytest fixtures for GenAI Accelerator Lambda tests.
"""
import pytest
import boto3
import os
import sys
from types import SimpleNamespace

# Add the source directory to Python path
src_path = os.path.join(os.path.dirname(__file__), '../src')
sys.path.insert(0, src_path)

@pytest.fixture
def aws_credentials():
    """Mocked AWS Credentials for testing."""
    os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
    os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
    os.environ['AWS_SECURITY_TOKEN'] = 'testing'
    os.environ['AWS_SESSION_TOKEN'] = 'testing'
    os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

def make_lambda_context(tool_name=None):
    """Mock Lambda context. With a tool_name, it carries the gateway client context naming that tool, in
    the form `<target>___<tool>`; without one, it has no client context, as for a direct invocation."""
    context = SimpleNamespace(
        function_name="test-function",
        function_version="$LATEST",
        aws_request_id="test-request-id",
        client_context=None,
    )
    if tool_name is not None:
        context.client_context = SimpleNamespace(custom={"bedrockAgentCoreToolName": tool_name})
    return context

@pytest.fixture
def lambda_context():
    """Mock Lambda context with no gateway client context."""
    return make_lambda_context()

@pytest.fixture
def sample_kb_transform_event():
    """Sample Knowledge Base custom transformation event, with one file of one content batch."""
    return {
        "version": "1.0",
        "knowledgeBaseId": "test-kb",
        "dataSourceId": "test-data-source",
        "ingestionJobId": "test-ingestion-job",
        "bucketName": "test-bucket",
        "priorTask": "CHUNKING",
        "inputFiles": [
            {
                "originalFileLocation": {
                    "type": "S3",
                    "s3_location": {"uri": "s3://test-docs-bucket/data/test.pdf"}
                },
                "fileMetadata": {
                    "title": "Test Document"
                },
                "contentBatches": [
                    {
                        "key": "processed/test.JSON"
                    }
                ]
            }
        ]
    }
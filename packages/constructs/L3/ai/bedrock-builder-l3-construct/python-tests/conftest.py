"""
Shared pytest fixtures for the Bedrock Builder knowledge base connector Lambda tests.
"""

import os
import sys
from types import SimpleNamespace

import pytest

# Set AWS region before any boto3 imports to prevent NoRegionError during module loading
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
# The connector reads its settings when it is imported; tests replace them through the `settings` fixture.
os.environ.setdefault("KNOWLEDGE_BASE_ID", "KBTEST1234")

# Add the source directory to Python path
src_path = os.path.join(os.path.dirname(__file__), "..", "lib", "lambda-functions", "kb-retrieve")
sys.path.insert(0, src_path)

# Imported after the environment and path are set above.
import kb_retrieve


@pytest.fixture
def settings(monkeypatch):
    """Replace the connector's settings with ones loaded from the given environment, defaulting to a
    knowledge base id and no retrieval settings. Returns the function that applies them."""

    def apply(**environment: str) -> kb_retrieve.Settings:
        loaded = kb_retrieve.load_settings({"KNOWLEDGE_BASE_ID": "KBTEST1234", **environment})
        monkeypatch.setattr(kb_retrieve, "SETTINGS", loaded)
        return loaded

    apply()
    return apply


def make_lambda_context(tool_name="test-target___Retrieve", client_context=True):
    """Mock Lambda context as the gateway sends it. With client_context=False the context has none,
    as for a direct invocation."""
    context = SimpleNamespace(
        function_name="kb-connector-function",
        aws_request_id="test-request-id",
        client_context=None,
    )
    if client_context:
        custom = {} if tool_name is None else {"bedrockAgentCoreToolName": tool_name}
        context.client_context = SimpleNamespace(custom=custom)
    return context


@pytest.fixture
def lambda_context():
    """Mock Lambda context for a gateway call of the Retrieve tool."""
    return make_lambda_context()

"""
Unit tests for the kb_retrieve knowledge base connector Lambda function.
"""

import json
import logging
from unittest.mock import MagicMock

import kb_retrieve
import pytest
from botocore.exceptions import (
    ClientError,
    ConnectTimeoutError,
    EndpointConnectionError,
    NoCredentialsError,
    ReadTimeoutError,
)
from conftest import make_lambda_context

QUERY_EVENT = {"retrievalQuery": {"text": "How do I reset my password?"}}

TEXT_ITEM = {
    "content": {"type": "TEXT", "text": "Open Settings, then choose Reset password."},
    "location": {"type": "S3", "s3Location": {"uri": "s3://docs/account.pdf"}},
    "score": 0.87,
    "metadata": {"x-amz-bedrock-kb-source-uri": "s3://docs/account.pdf"},
    "documentId": "doc-1",
}


def client_error(code, status=400, message="Request failed."):
    """A Retrieve ClientError with the given error code and HTTP status."""
    return ClientError(
        {"Error": {"Code": code, "Message": message}, "ResponseMetadata": {"HTTPStatusCode": status}},
        "Retrieve",
    )


# A Retrieve failure whose message carries the details that must not reach the model.
SENSITIVE_ERROR = client_error(
    "AccessDeniedException",
    status=403,
    message="User: arn:aws:sts::123456789012:assumed-role/kb-connector/fn is not authorized to perform "
    "bedrock:Retrieve on resource: arn:aws:bedrock:us-east-1:123456789012:knowledge-base/KBTEST1234",
)


@pytest.fixture
def retrieve_client(monkeypatch):
    """Replace the module's bedrock-agent-runtime client with a mock."""
    client = MagicMock()
    client.retrieve.return_value = {"retrievalResults": []}
    monkeypatch.setattr(kb_retrieve, "bedrock_agent_runtime", client)
    return client


class TestLoadSettings:
    """Settings read from the environment when the function initializes."""

    def test_reads_only_the_knowledge_base_id_by_default(self):
        assert kb_retrieve.load_settings({"KNOWLEDGE_BASE_ID": "KBTEST1234"}) == kb_retrieve.Settings(
            knowledge_base_id="KBTEST1234", retrieval_configuration=None
        )

    def test_reads_the_retrieval_settings(self):
        loaded = kb_retrieve.load_settings(
            {"KNOWLEDGE_BASE_ID": "KBTEST1234", "NUMBER_OF_RESULTS": "7", "SEARCH_TYPE": "HYBRID"}
        )

        assert loaded.retrieval_configuration == {
            "vectorSearchConfiguration": {"numberOfResults": 7, "overrideSearchType": "HYBRID"}
        }

    def test_reads_only_the_retrieval_setting_that_is_set(self):
        loaded = kb_retrieve.load_settings({"KNOWLEDGE_BASE_ID": "KBTEST1234", "SEARCH_TYPE": "SEMANTIC"})

        assert loaded.retrieval_configuration == {"vectorSearchConfiguration": {"overrideSearchType": "SEMANTIC"}}

    @pytest.mark.parametrize("value", ["1", "100"])
    def test_accepts_number_of_results_at_the_bounds(self, value):
        loaded = kb_retrieve.load_settings({"KNOWLEDGE_BASE_ID": "KBTEST1234", "NUMBER_OF_RESULTS": value})

        assert loaded.retrieval_configuration == {"vectorSearchConfiguration": {"numberOfResults": int(value)}}

    @pytest.mark.parametrize("environ", [{}, {"KNOWLEDGE_BASE_ID": ""}, {"KNOWLEDGE_BASE_ID": "  "}])
    def test_rejects_a_missing_knowledge_base_id(self, environ):
        with pytest.raises(ValueError, match="KNOWLEDGE_BASE_ID must be set"):
            kb_retrieve.load_settings(environ)

    @pytest.mark.parametrize("value", ["0", "101", "2.5", "five"])
    def test_rejects_an_invalid_number_of_results(self, value):
        with pytest.raises(ValueError, match="NUMBER_OF_RESULTS must be an integer from 1 to 100"):
            kb_retrieve.load_settings({"KNOWLEDGE_BASE_ID": "KBTEST1234", "NUMBER_OF_RESULTS": value})

    def test_rejects_an_unsupported_search_type(self):
        with pytest.raises(ValueError, match="SEARCH_TYPE must be one of HYBRID, SEMANTIC; got 'KEYWORD'"):
            kb_retrieve.load_settings({"KNOWLEDGE_BASE_ID": "KBTEST1234", "SEARCH_TYPE": "KEYWORD"})


class TestRetrieveClient:
    """The bedrock-agent-runtime client stays inside the function timeout."""

    def test_bounds_the_connection_read_and_retries(self):
        config = kb_retrieve.bedrock_agent_runtime.meta.config

        assert config.connect_timeout == 2
        assert config.read_timeout == 6
        assert config.retries == {"mode": "standard", "total_max_attempts": 3}


class TestRetrieve:
    """Successful Retrieve calls."""

    def test_passes_retrieval_results_through_unchanged(self, settings, retrieve_client, lambda_context):
        items = [
            TEXT_ITEM,
            {"content": {"type": "ROW", "row": [{"columnName": "sku", "columnValue": "A1", "type": "STRING"}]}},
        ]
        retrieve_client.retrieve.return_value = {"retrievalResults": items, "nextToken": "next"}

        result = kb_retrieve.lambda_handler(QUERY_EVENT, lambda_context)

        assert result == {"retrievalResults": items}

    def test_sends_query_without_retrieval_configuration_by_default(self, settings, retrieve_client, lambda_context):
        kb_retrieve.lambda_handler(QUERY_EVENT, lambda_context)

        retrieve_client.retrieve.assert_called_once_with(
            knowledgeBaseId="KBTEST1234",
            retrievalQuery={"text": "How do I reset my password?"},
        )

    def test_sends_the_configured_retrieval_settings(self, settings, retrieve_client, lambda_context):
        settings(NUMBER_OF_RESULTS="7", SEARCH_TYPE="HYBRID")

        kb_retrieve.lambda_handler(QUERY_EVENT, lambda_context)

        retrieve_client.retrieve.assert_called_once_with(
            knowledgeBaseId="KBTEST1234",
            retrievalQuery={"text": "How do I reset my password?"},
            retrievalConfiguration={
                "vectorSearchConfiguration": {"numberOfResults": 7, "overrideSearchType": "HYBRID"}
            },
        )

    def test_returns_empty_results_when_response_has_none(self, settings, retrieve_client, lambda_context):
        retrieve_client.retrieve.return_value = {}

        assert kb_retrieve.lambda_handler(QUERY_EVENT, lambda_context) == {"retrievalResults": []}

    def test_accepts_a_query_at_the_length_limit(self, settings, retrieve_client, lambda_context):
        event = {"retrievalQuery": {"text": "q" * kb_retrieve.MAX_QUERY_LENGTH}}

        kb_retrieve.lambda_handler(event, lambda_context)

        retrieve_client.retrieve.assert_called_once()


class TestResponseShaping:
    """What the connector leaves out of the Retrieve items, and why."""

    def test_drops_inline_byte_content_and_keeps_the_rest_of_the_item(self, settings, retrieve_client, lambda_context):
        image_item = {
            "content": {"type": "IMAGE", "byteContent": "data:image/png;base64,iVBORw0KGgo="},
            "location": {"type": "S3", "s3Location": {"uri": "s3://docs/diagram.png"}},
            "score": 0.5,
        }
        retrieve_client.retrieve.return_value = {"retrievalResults": [image_item, TEXT_ITEM]}

        result = kb_retrieve.lambda_handler(QUERY_EVENT, lambda_context)

        assert result == {
            "retrievalResults": [
                {
                    "content": {"type": "IMAGE"},
                    "location": {"type": "S3", "s3Location": {"uri": "s3://docs/diagram.png"}},
                    "score": 0.5,
                },
                TEXT_ITEM,
            ]
        }
        # The Retrieve response itself is left as it was.
        assert image_item["content"]["byteContent"] == "data:image/png;base64,iVBORw0KGgo="

    def test_keeps_the_leading_results_that_fit_the_response_limit(
        self, settings, retrieve_client, lambda_context, monkeypatch, caplog
    ):
        items = [{"content": {"type": "TEXT", "text": f"passage {n} " + "x" * 100}} for n in range(5)]
        one_item = len(json.dumps(items[0]))
        # Room for the envelope and three items with their separators, but not a fourth.
        monkeypatch.setattr(kb_retrieve, "MAX_RESPONSE_BYTES", len(json.dumps({"retrievalResults": items[:3]})))
        retrieve_client.retrieve.return_value = {"retrievalResults": items}

        with caplog.at_level(logging.WARNING):
            result = kb_retrieve.lambda_handler(QUERY_EVENT, lambda_context)

        assert result == {"retrievalResults": items[:3]}
        assert len(json.dumps(result)) <= kb_retrieve.MAX_RESPONSE_BYTES < len(json.dumps(result)) + one_item
        assert "Dropped 2 of 5 result(s)" in caplog.text

    def test_returns_no_results_when_the_first_does_not_fit(
        self, settings, retrieve_client, lambda_context, monkeypatch
    ):
        monkeypatch.setattr(kb_retrieve, "MAX_RESPONSE_BYTES", 10)
        retrieve_client.retrieve.return_value = {"retrievalResults": [TEXT_ITEM]}

        assert kb_retrieve.lambda_handler(QUERY_EVENT, lambda_context) == {"retrievalResults": []}

    @pytest.mark.parametrize(("slack", "kept"), [(0, 1), (-1, 0)], ids=["exact-fit", "one-byte-over"])
    def test_counts_non_ascii_text_at_its_utf8_size(
        self, settings, retrieve_client, lambda_context, monkeypatch, slack, kept
    ):
        item = {"content": {"type": "TEXT", "text": "é" * 50}}
        # The runtime leaves "é" unescaped: 2 bytes in UTF-8, not 1 character or a 6-byte escape.
        utf8_size = len(json.dumps({"retrievalResults": [item]}, ensure_ascii=False).encode("utf-8"))
        monkeypatch.setattr(kb_retrieve, "MAX_RESPONSE_BYTES", utf8_size + slack)
        retrieve_client.retrieve.return_value = {"retrievalResults": [item]}

        assert kb_retrieve.lambda_handler(QUERY_EVENT, lambda_context) == {"retrievalResults": [item] * kept}


class TestRejectedCalls:
    """Calls the connector rejects before calling Retrieve."""

    @pytest.mark.parametrize(
        "context",
        [
            make_lambda_context(tool_name="test-target___Search"),
            make_lambda_context(tool_name="Retrieve"),
            make_lambda_context(tool_name=None),
            make_lambda_context(client_context=False),
            object(),
        ],
        ids=["other-tool", "unprefixed-name", "no-tool-name", "no-client-context", "bare-context"],
    )
    def test_rejects_calls_other_than_the_retrieve_tool(self, settings, retrieve_client, context):
        with pytest.raises(kb_retrieve.ToolError, match="serves only Retrieve"):
            kb_retrieve.lambda_handler(QUERY_EVENT, context)

        retrieve_client.retrieve.assert_not_called()

    def test_logs_rejected_tool_name_escaped(self, settings, retrieve_client, caplog):
        context = make_lambda_context(tool_name="x\nforged log line___Retrieve-not")

        with caplog.at_level(logging.WARNING), pytest.raises(kb_retrieve.ToolError):
            kb_retrieve.lambda_handler(QUERY_EVENT, context)

        (record,) = [r for r in caplog.records if r.levelno == logging.WARNING]
        assert "\\n" in record.getMessage()
        assert "\n" not in record.getMessage()

    @pytest.mark.parametrize(
        "event",
        [
            {},
            None,
            {"query": "top-level query"},
            {"retrievalQuery": "not an object"},
            {"retrievalQuery": {}},
            {"retrievalQuery": {"text": "   "}},
            {"retrievalQuery": {"text": 42}},
        ],
    )
    def test_rejects_missing_or_invalid_query(self, settings, retrieve_client, lambda_context, event):
        with pytest.raises(kb_retrieve.ToolError, match="retrievalQuery.text must be a non-empty string"):
            kb_retrieve.lambda_handler(event, lambda_context)

        retrieve_client.retrieve.assert_not_called()

    def test_rejects_a_query_over_the_length_limit(self, settings, retrieve_client, lambda_context):
        event = {"retrievalQuery": {"text": "q" * (kb_retrieve.MAX_QUERY_LENGTH + 1)}}

        with pytest.raises(kb_retrieve.ToolError, match="must be at most 20000 characters"):
            kb_retrieve.lambda_handler(event, lambda_context)

        retrieve_client.retrieve.assert_not_called()


class TestRetrieveFailures:
    """Retrieve failures reach the caller as a tool error that says what to do, without the details."""

    @pytest.mark.parametrize(
        ("error", "message"),
        [
            (client_error("ValidationException"), kb_retrieve.REJECTED_MESSAGE),
            (client_error("ThrottlingException", status=429), kb_retrieve.TRANSIENT_MESSAGE),
            (client_error("ServiceQuotaExceededException"), kb_retrieve.TRANSIENT_MESSAGE),
            (client_error("DependencyFailedException", status=424), kb_retrieve.TRANSIENT_MESSAGE),
            (client_error("InternalServerException", status=500), kb_retrieve.TRANSIENT_MESSAGE),
            (client_error("UnknownServiceError", status=503), kb_retrieve.TRANSIENT_MESSAGE),
            (SENSITIVE_ERROR, kb_retrieve.UNAVAILABLE_MESSAGE),
            (client_error("ResourceNotFoundException", status=404), kb_retrieve.UNAVAILABLE_MESSAGE),
            (EndpointConnectionError(endpoint_url="https://bedrock-agent-runtime"), kb_retrieve.TRANSIENT_MESSAGE),
            (ConnectTimeoutError(endpoint_url="https://bedrock-agent-runtime"), kb_retrieve.TRANSIENT_MESSAGE),
            (ReadTimeoutError(endpoint_url="https://bedrock-agent-runtime"), kb_retrieve.TRANSIENT_MESSAGE),
            (NoCredentialsError(), kb_retrieve.UNAVAILABLE_MESSAGE),
        ],
        ids=[
            "validation",
            "throttling",
            "quota",
            "dependency",
            "internal",
            "unknown-5xx",
            "access-denied",
            "not-found",
            "endpoint-connection",
            "connect-timeout",
            "read-timeout",
            "no-credentials",
        ],
    )
    def test_maps_the_failure_to_a_generic_message(self, settings, retrieve_client, lambda_context, error, message):
        retrieve_client.retrieve.side_effect = error

        with pytest.raises(kb_retrieve.ToolError) as raised:
            kb_retrieve.lambda_handler(QUERY_EVENT, lambda_context)

        assert str(raised.value) == message
        # Raised `from None`, so the service error is not chained into the reported traceback.
        assert raised.value.__cause__ is None
        assert raised.value.__suppress_context__ is True

    def test_raised_message_carries_no_arn_or_account(self, settings, retrieve_client, lambda_context):
        retrieve_client.retrieve.side_effect = SENSITIVE_ERROR

        with pytest.raises(kb_retrieve.ToolError) as raised:
            kb_retrieve.lambda_handler(QUERY_EVENT, lambda_context)

        assert "arn:" not in str(raised.value)
        assert "123456789012" not in str(raised.value)

    def test_logs_the_failure_details(self, settings, retrieve_client, lambda_context, caplog):
        retrieve_client.retrieve.side_effect = SENSITIVE_ERROR

        with caplog.at_level(logging.ERROR), pytest.raises(kb_retrieve.ToolError):
            kb_retrieve.lambda_handler(QUERY_EVENT, lambda_context)

        assert "Retrieve failed for knowledge base KBTEST1234" in caplog.text
        assert "AccessDeniedException" in caplog.text

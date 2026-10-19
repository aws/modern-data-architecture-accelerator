"""
Knowledge base connector for an AgentCore Gateway Lambda target.

Serves one tool, `Retrieve`: runs bedrock-agent-runtime Retrieve against a single Bedrock knowledge
base, with the same input and output shape as the native managed-knowledge-base connector's `Retrieve`
tool. The knowledge base and the retrieval settings are fixed per deployment, so the caller supplies only
the query.

The Retrieve items are returned unchanged, with two exceptions that keep the response usable by a model
and within the gateway's payload limit:
- `content.byteContent`, the inline base64 data URI of an image result, is dropped. The item's `type`
  and `location` remain, so the model can still cite the source.
- Once the serialized results reach MAX_RESPONSE_BYTES, the remaining items are dropped. Retrieve
  returns the most relevant items first, so those are the ones kept.

Environment variables, read once when the function initializes:
    KNOWLEDGE_BASE_ID  (required) id of the knowledge base to query.
    NUMBER_OF_RESULTS  (optional) number of results per query, 1-100.
    SEARCH_TYPE        (optional) HYBRID or SEMANTIC.
A missing or invalid value fails initialization, so a misconfigured function fails every call the same
way rather than partway through one.

The gateway passes the tool arguments as the event, and the called tool's name, in the form
`<target>___<tool>`, in `context.client_context.custom['bedrockAgentCoreToolName']`.

Every failure is raised: the gateway returns a Lambda error to the caller as a tool error
(`isError: true`). A gateway with `exceptionLevel: DEBUG` returns the error message verbatim, so raised
messages stay generic and the details, which can include ARNs and account ids, are only logged.
"""

import json
import logging
import os
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError, HTTPClientError
from botocore.exceptions import ConnectionError as BotoConnectionError

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# The gateway prefixes the tool name with the target name and this delimiter.
RETRIEVE_TOOL_SUFFIX = "___Retrieve"

# Retrieve's limit on the query text.
MAX_QUERY_LENGTH = 20_000
# Below the 6 MB limit on both a synchronous Lambda response and a gateway tool-call payload, leaving
# room for the gateway to re-encode the result as MCP text.
MAX_RESPONSE_BYTES = 4_000_000

MIN_NUMBER_OF_RESULTS = 1
MAX_NUMBER_OF_RESULTS = 100
SEARCH_TYPES = frozenset({"HYBRID", "SEMANTIC"})

# Bounds every Retrieve call, retries included, within the function's 30-second timeout: 3 attempts of
# at most 2 s to connect and 6 s per read, plus at most 3 s of standard-mode backoff, is 27 s.
RETRIEVE_CLIENT_CONFIG = Config(
    connect_timeout=2,
    read_timeout=6,
    retries={"mode": "standard", "total_max_attempts": 3},
    user_agent_extra=os.environ.get("USER_AGENT_STRING"),
)

# Retrieve errors the caller can fix by changing the query.
REJECTED_ERROR_CODES = frozenset({"ValidationException"})
# Retrieve errors that can clear on a later call.
TRANSIENT_ERROR_CODES = frozenset(
    {
        "BadGatewayException",
        "ConflictException",
        "DependencyFailedException",
        "InternalServerException",
        "ServiceQuotaExceededException",
        "ThrottlingException",
    }
)
REJECTED_MESSAGE = "The knowledge base rejected the query. Rephrase or shorten it, then try again."
TRANSIENT_MESSAGE = "The knowledge base is temporarily unavailable. Try again later."
UNAVAILABLE_MESSAGE = "The knowledge base is unavailable."


class ToolError(Exception):
    """A failure returned to the caller as a tool error. Its message is shown to the model."""


@dataclass(frozen=True)
class Settings:
    """The connector's deploy-time configuration."""

    knowledge_base_id: str
    retrieval_configuration: dict[str, Any] | None


def load_settings(environ: Mapping[str, str]) -> Settings:
    """Read the connector's settings from its environment, leaving unset retrieval settings to the
    service defaults.

    Raises ValueError for a missing knowledge base id or an invalid retrieval setting.
    """
    knowledge_base_id = environ.get("KNOWLEDGE_BASE_ID", "").strip()
    if not knowledge_base_id:
        raise ValueError("KNOWLEDGE_BASE_ID must be set to the id of the knowledge base to query.")

    vector_search_configuration: dict[str, Any] = {}
    number_of_results = environ.get("NUMBER_OF_RESULTS")
    if number_of_results:
        vector_search_configuration["numberOfResults"] = _parse_number_of_results(number_of_results)
    search_type = environ.get("SEARCH_TYPE")
    if search_type:
        if search_type not in SEARCH_TYPES:
            raise ValueError(f"SEARCH_TYPE must be one of {', '.join(sorted(SEARCH_TYPES))}; got {search_type!r}.")
        vector_search_configuration["overrideSearchType"] = search_type

    retrieval_configuration = (
        {"vectorSearchConfiguration": vector_search_configuration} if vector_search_configuration else None
    )
    return Settings(knowledge_base_id=knowledge_base_id, retrieval_configuration=retrieval_configuration)


def _parse_number_of_results(value: str) -> int:
    """Parse NUMBER_OF_RESULTS. Raises ValueError unless it is an integer from 1 to 100."""
    try:
        number_of_results = int(value)
    except ValueError:
        number_of_results = None
    if number_of_results is None or not MIN_NUMBER_OF_RESULTS <= number_of_results <= MAX_NUMBER_OF_RESULTS:
        raise ValueError(
            f"NUMBER_OF_RESULTS must be an integer from {MIN_NUMBER_OF_RESULTS} to {MAX_NUMBER_OF_RESULTS}; "
            f"got {value!r}."
        )
    return number_of_results


SETTINGS = load_settings(os.environ)

# The runtime region comes from the Lambda environment (AWS_REGION).
bedrock_agent_runtime = boto3.client("bedrock-agent-runtime", config=RETRIEVE_CLIENT_CONFIG)


def lambda_handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Retrieve from the configured knowledge base for the query in `retrievalQuery.text`.

    Returns `{"retrievalResults": [...]}` (see the module docstring for what is left out).
    Raises ToolError for an unsupported tool, a missing or too long query, or a failed Retrieve call.
    """
    _require_retrieve_tool(context)
    request: dict[str, Any] = {
        "knowledgeBaseId": SETTINGS.knowledge_base_id,
        "retrievalQuery": {"text": _query_text(event)},
    }
    if SETTINGS.retrieval_configuration:
        request["retrievalConfiguration"] = SETTINGS.retrieval_configuration

    try:
        response = bedrock_agent_runtime.retrieve(**request)
    except (BotoCoreError, ClientError) as error:
        logger.exception("Retrieve failed for knowledge base %s", SETTINGS.knowledge_base_id)
        raise ToolError(_tool_error_message(error)) from None

    items = response.get("retrievalResults", [])
    results = _response_results(items)
    logger.info(
        "Returning %d of %d result(s) from knowledge base %s", len(results), len(items), SETTINGS.knowledge_base_id
    )
    return {"retrievalResults": results}


def _require_retrieve_tool(context: Any) -> None:
    """Reject a call that does not name a `Retrieve` tool, including one with no gateway client
    context. This guards against misrouted calls, not against callers: whoever invokes the function
    sets the client context, so access is controlled by who may call lambda:InvokeFunction on it."""
    client_context = getattr(context, "client_context", None)
    custom = getattr(client_context, "custom", None)
    tool_name = custom.get("bedrockAgentCoreToolName") if isinstance(custom, dict) else None
    if not isinstance(tool_name, str) or not tool_name.endswith(RETRIEVE_TOOL_SUFFIX):
        # %r escapes control characters, so the value cannot forge log lines.
        logger.warning("Rejected call for unsupported tool %r", tool_name)
        raise ToolError("Unsupported tool: this connector serves only Retrieve.")


def _query_text(event: Any) -> str:
    """Return `retrievalQuery.text` from the tool arguments."""
    retrieval_query = event.get("retrievalQuery") if isinstance(event, dict) else None
    text = retrieval_query.get("text") if isinstance(retrieval_query, dict) else None
    if not isinstance(text, str) or not text.strip():
        raise ToolError("retrievalQuery.text must be a non-empty string.")
    if len(text) > MAX_QUERY_LENGTH:
        raise ToolError(f"retrievalQuery.text must be at most {MAX_QUERY_LENGTH} characters.")
    return text


def _tool_error_message(error: BotoCoreError | ClientError) -> str:
    """Say whether the caller should rephrase, retry later, or give up, without the error's details."""
    if isinstance(error, ClientError):
        code = error.response.get("Error", {}).get("Code", "")
        status = error.response.get("ResponseMetadata", {}).get("HTTPStatusCode", 0)
        if code in REJECTED_ERROR_CODES:
            return REJECTED_MESSAGE
        if code in TRANSIENT_ERROR_CODES or status >= 500:
            return TRANSIENT_MESSAGE
        return UNAVAILABLE_MESSAGE
    # Connection failures and timeouts, after the client's retries.
    if isinstance(error, (BotoConnectionError, HTTPClientError)):
        return TRANSIENT_MESSAGE
    return UNAVAILABLE_MESSAGE


def _response_results(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Return the items without inline byte content, keeping the leading ones whose serialized size
    fits in MAX_RESPONSE_BYTES."""
    results: list[dict[str, Any]] = []
    size = _serialized_size({"retrievalResults": []})
    for item in items:
        result = _without_byte_content(item)
        # Each item after the first adds a ", " separator.
        item_size = _serialized_size(result) + (2 if results else 0)
        if size + item_size > MAX_RESPONSE_BYTES:
            logger.warning(
                "Dropped %d of %d result(s) over the %d-byte response limit",
                len(items) - len(results),
                len(items),
                MAX_RESPONSE_BYTES,
            )
            break
        results.append(result)
        size += item_size
    return results


def _serialized_size(value: Any) -> int:
    """Size in bytes of the value as the Lambda runtime serializes a response: JSON with non-ASCII
    characters left unescaped (Python 3.12 and later runtimes), encoded as UTF-8."""
    return len(json.dumps(value, ensure_ascii=False).encode("utf-8"))


def _without_byte_content(item: dict[str, Any]) -> dict[str, Any]:
    """Return the item without `content.byteContent`, leaving the item itself unchanged."""
    content = item.get("content")
    if not isinstance(content, dict) or "byteContent" not in content:
        return item
    return {**item, "content": {key: value for key, value in content.items() if key != "byteContent"}}

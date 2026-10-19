"""
Customer support tools for an AgentCore Gateway Lambda target.

Serves three tools over a mock, in-memory account and ticket store: `getAccountInfo`,
`createSupportTicket`, and `getTicketStatus`. Tickets created here live only as long as the function's
execution environment, so a later call on another environment does not find them.

The gateway passes the tool arguments as the event, and the called tool's name, in the form
`<target>___<tool>`, in `context.client_context.custom['bedrockAgentCoreToolName']`. The return value is
the tool result.

An outcome the model should relay to the customer, such as an unknown account or an invalid priority, is
returned as a result of the form `{"error": "..."}`, because the gateway shows the message of a raised
error only with `exceptionLevel: DEBUG`. A call this function cannot serve, an unsupported tool, is
raised, and the gateway returns it to the caller as a tool error (`isError: true`).
"""

import logging
import uuid
from collections.abc import Callable, Mapping
from datetime import UTC, datetime
from typing import Any

logger = logging.getLogger()
logger.setLevel(logging.INFO)

# The gateway prefixes the tool name with the target name and this delimiter.
TOOL_NAME_DELIMITER = "___"

PRIORITIES = ("low", "medium", "high", "critical")

ACCOUNT_DB = {
    "acc-12345": {
        "accountId": "acc-12345",
        "accountName": "Example Corp",
        "accountType": "Enterprise",
        "creationDate": "2023-01-15",
        "status": "Active",
    },
    "acc-67890": {
        "accountId": "acc-67890",
        "accountName": "Sample Inc",
        "accountType": "Business",
        "creationDate": "2023-03-22",
        "status": "Active",
    },
}

TICKET_DB = {
    "ticket-001": {
        "ticketId": "ticket-001",
        "accountId": "acc-12345",
        "subject": "API Access Issue",
        "description": "Unable to access the API endpoints",
        "priority": "high",
        "status": "in-progress",
        "createdAt": "2024-06-15T10:30:00Z",
        "lastUpdated": "2024-06-16T14:22:00Z",
        "assignedTo": "support-agent-1",
        "comments": [
            {"timestamp": "2024-06-15T10:30:00Z", "author": "system", "text": "Ticket created"},
            {
                "timestamp": "2024-06-16T14:22:00Z",
                "author": "support-agent-1",
                "text": "Investigating the API access issue",
            },
        ],
    }
}


class ToolError(Exception):
    """A call this function cannot serve, returned to the caller as a tool error."""


def lambda_handler(event: Any, context: Any) -> dict[str, Any]:
    """Run the tool the gateway called with the tool arguments in the event.

    Returns the tool result. Raises ToolError for a call that names no supported tool.
    """
    tool_name = _tool_name(context)
    tool = TOOLS.get(tool_name) if tool_name else None
    if tool is None:
        # %r escapes control characters, so the value cannot forge log lines.
        logger.warning("Rejected call for unsupported tool %r", tool_name)
        raise ToolError(
            "Unsupported tool: this function serves getAccountInfo, createSupportTicket, and getTicketStatus."
        )

    arguments = event if isinstance(event, dict) else {}
    logger.info("Calling tool %s", tool_name)
    return tool(arguments)


def _tool_name(context: Any) -> str | None:
    """Return the called tool's name without its target prefix, or None for a call with no gateway client
    context. Whoever invokes the function sets the client context, so this routes calls rather than
    authorizing them: access is controlled by who may call lambda:InvokeFunction on the function."""
    client_context = getattr(context, "client_context", None)
    custom = getattr(client_context, "custom", None)
    qualified_name = custom.get("bedrockAgentCoreToolName") if isinstance(custom, dict) else None
    if not isinstance(qualified_name, str):
        return None
    _, delimiter, tool_name = qualified_name.rpartition(TOOL_NAME_DELIMITER)
    return tool_name if delimiter else None


def get_account_info(arguments: Mapping[str, Any]) -> dict[str, Any]:
    """Get the details and status of a customer account."""
    account_id = _string_argument(arguments, "accountId")
    if account_id is None:
        return _error("accountId is required")

    account = ACCOUNT_DB.get(account_id)
    if account is None:
        return _error(f"Account {account_id} not found")
    return {**account}


def create_support_ticket(arguments: Mapping[str, Any]) -> dict[str, Any]:
    """Create a support ticket for a customer account."""
    account_id = _string_argument(arguments, "accountId")
    subject = _string_argument(arguments, "subject")
    description = _string_argument(arguments, "description")
    priority = _string_argument(arguments, "priority")
    if account_id is None or subject is None or description is None or priority is None:
        return _error("accountId, subject, description, and priority are required")

    if account_id not in ACCOUNT_DB:
        return _error(f"Account {account_id} not found")

    priority = priority.lower()
    if priority not in PRIORITIES:
        return _error(f"Invalid priority: {priority}. Must be one of: {', '.join(PRIORITIES)}")

    ticket_id = f"ticket-{uuid.uuid4().hex[:6]}"
    now = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    TICKET_DB[ticket_id] = {
        "ticketId": ticket_id,
        "accountId": account_id,
        "subject": subject,
        "description": description,
        "priority": priority,
        "status": "new",
        "createdAt": now,
        "lastUpdated": now,
        "assignedTo": None,
        "comments": [{"timestamp": now, "author": "system", "text": "Ticket created"}],
    }
    return {"ticketId": ticket_id, "status": "new", "createdAt": now}


def get_ticket_status(arguments: Mapping[str, Any]) -> dict[str, Any]:
    """Get the status, assignee, and comments of a support ticket."""
    ticket_id = _string_argument(arguments, "ticketId")
    if ticket_id is None:
        return _error("ticketId is required")

    ticket = TICKET_DB.get(ticket_id)
    if ticket is None:
        return _error(f"Ticket {ticket_id} not found")
    return {
        "ticketId": ticket["ticketId"],
        "status": ticket["status"],
        "lastUpdated": ticket["lastUpdated"],
        "assignedTo": ticket["assignedTo"],
        "comments": ticket["comments"],
    }


def _string_argument(arguments: Mapping[str, Any], name: str) -> str | None:
    """Return the named argument with surrounding whitespace removed, or None unless it is a non-empty
    string."""
    value = arguments.get(name)
    if not isinstance(value, str) or not value.strip():
        return None
    return value.strip()


def _error(message: str) -> dict[str, str]:
    """A tool result reporting an outcome the model should relay."""
    return {"error": message}


# Tools by the name the gateway's tool schema gives them.
TOOLS: dict[str, Callable[[Mapping[str, Any]], dict[str, Any]]] = {
    "getAccountInfo": get_account_info,
    "createSupportTicket": create_support_ticket,
    "getTicketStatus": get_ticket_status,
}

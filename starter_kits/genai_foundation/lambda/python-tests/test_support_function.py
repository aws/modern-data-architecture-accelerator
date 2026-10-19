"""
Unit tests for the customer support tools Lambda served through an AgentCore Gateway Lambda target.
"""

import logging
import re

import pytest
from conftest import make_lambda_context

import support_function

TARGET_PREFIX = "test-org-dev-genai-customer-support-agent-support-actions___"

TICKET_ARGUMENTS = {
    "accountId": "acc-12345",
    "subject": "Test Issue",
    "description": "Test description",
    "priority": "high",
}


def call_tool(tool, arguments):
    """Call the handler as the gateway does: the arguments as the event, the prefixed tool name in the
    client context."""
    return support_function.lambda_handler(arguments, make_lambda_context(f"{TARGET_PREFIX}{tool}"))


@pytest.fixture(autouse=True)
def ticket_db(monkeypatch):
    """Give each test its own copy of the ticket store, so created tickets don't leak between tests."""
    tickets = {**support_function.TICKET_DB}
    monkeypatch.setattr(support_function, "TICKET_DB", tickets)
    return tickets


class TestToolRouting:
    """Routing a gateway call to the tool it names."""

    def test_strips_the_target_prefix(self):
        assert call_tool("getAccountInfo", {"accountId": "acc-12345"})["accountId"] == "acc-12345"

    def test_routes_a_name_whose_prefix_contains_underscores(self):
        context = make_lambda_context("some_target___getAccountInfo")

        result = support_function.lambda_handler({"accountId": "acc-12345"}, context)

        assert result["accountId"] == "acc-12345"

    def test_rejects_an_unsupported_tool(self):
        with pytest.raises(support_function.ToolError, match="Unsupported tool"):
            call_tool("deleteAccount", {})

    def test_rejects_a_tool_name_without_the_target_prefix(self):
        with pytest.raises(support_function.ToolError, match="Unsupported tool"):
            support_function.lambda_handler({}, make_lambda_context("getAccountInfo"))

    def test_rejects_a_call_without_a_client_context(self, lambda_context):
        with pytest.raises(support_function.ToolError, match="Unsupported tool"):
            support_function.lambda_handler({"accountId": "acc-12345"}, lambda_context)

    def test_rejects_a_non_string_tool_name(self):
        with pytest.raises(support_function.ToolError, match="Unsupported tool"):
            support_function.lambda_handler({}, make_lambda_context(42))

    def test_logs_a_rejected_tool_name_escaped(self, caplog):
        with caplog.at_level(logging.WARNING), pytest.raises(support_function.ToolError):
            call_tool("bad\ntool", {})

        assert "'bad\\ntool'" in caplog.text

    def test_treats_a_non_object_event_as_no_arguments(self):
        result = support_function.lambda_handler("not-an-object", make_lambda_context(f"{TARGET_PREFIX}getAccountInfo"))

        assert result == {"error": "accountId is required"}


class TestGetAccountInfo:
    """The getAccountInfo tool."""

    def test_returns_the_account(self):
        result = call_tool("getAccountInfo", {"accountId": "acc-12345"})

        assert result == support_function.ACCOUNT_DB["acc-12345"]

    def test_returns_a_copy_of_the_account(self):
        result = call_tool("getAccountInfo", {"accountId": "acc-12345"})
        result["status"] = "Closed"

        assert support_function.ACCOUNT_DB["acc-12345"]["status"] == "Active"

    def test_strips_surrounding_whitespace_from_the_id(self):
        assert call_tool("getAccountInfo", {"accountId": " acc-67890 "})["accountName"] == "Sample Inc"

    def test_reports_an_unknown_account(self):
        assert call_tool("getAccountInfo", {"accountId": "nonexistent"}) == {"error": "Account nonexistent not found"}

    @pytest.mark.parametrize("arguments", [{}, {"accountId": ""}, {"accountId": "   "}, {"accountId": 12345}])
    def test_reports_a_missing_or_invalid_account_id(self, arguments):
        assert call_tool("getAccountInfo", arguments) == {"error": "accountId is required"}


class TestCreateSupportTicket:
    """The createSupportTicket tool."""

    def test_creates_the_ticket(self, ticket_db):
        result = call_tool("createSupportTicket", TICKET_ARGUMENTS)

        assert re.fullmatch(r"ticket-[0-9a-f]{6}", result["ticketId"])
        assert result["status"] == "new"
        assert re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z", result["createdAt"])
        assert ticket_db[result["ticketId"]]["subject"] == "Test Issue"

    def test_a_created_ticket_can_be_looked_up(self):
        ticket_id = call_tool("createSupportTicket", TICKET_ARGUMENTS)["ticketId"]

        result = call_tool("getTicketStatus", {"ticketId": ticket_id})

        assert result["status"] == "new"
        assert result["comments"][0]["text"] == "Ticket created"

    def test_accepts_a_priority_in_any_case(self, ticket_db):
        result = call_tool("createSupportTicket", {**TICKET_ARGUMENTS, "priority": "Critical"})

        assert ticket_db[result["ticketId"]]["priority"] == "critical"

    def test_reports_an_invalid_priority(self, ticket_db):
        result = call_tool("createSupportTicket", {**TICKET_ARGUMENTS, "priority": "urgent"})

        assert result == {"error": "Invalid priority: urgent. Must be one of: low, medium, high, critical"}
        assert len(ticket_db) == 1

    def test_reports_an_unknown_account(self):
        result = call_tool("createSupportTicket", {**TICKET_ARGUMENTS, "accountId": "nonexistent"})

        assert result == {"error": "Account nonexistent not found"}

    @pytest.mark.parametrize("missing", ["accountId", "subject", "description", "priority"])
    def test_reports_a_missing_argument(self, missing):
        arguments = {name: value for name, value in TICKET_ARGUMENTS.items() if name != missing}

        result = call_tool("createSupportTicket", arguments)

        assert result == {"error": "accountId, subject, description, and priority are required"}


class TestGetTicketStatus:
    """The getTicketStatus tool."""

    def test_returns_the_ticket_status(self):
        result = call_tool("getTicketStatus", {"ticketId": "ticket-001"})

        assert result == {
            "ticketId": "ticket-001",
            "status": "in-progress",
            "lastUpdated": "2024-06-16T14:22:00Z",
            "assignedTo": "support-agent-1",
            "comments": support_function.TICKET_DB["ticket-001"]["comments"],
        }

    def test_reports_an_unknown_ticket(self):
        assert call_tool("getTicketStatus", {"ticketId": "nonexistent"}) == {"error": "Ticket nonexistent not found"}

    def test_reports_a_missing_ticket_id(self):
        assert call_tool("getTicketStatus", {}) == {"error": "ticketId is required"}

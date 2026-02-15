"""
Unit tests for GenAI Accelerator Support Function Lambda.
"""
import pytest
import json
from unittest.mock import patch, MagicMock

import support_function


class TestLambdaHandler:
    """Test cases for lambda_handler function."""
    
    def test_get_account_info_success(self, lambda_context):
        """Test successful account info retrieval."""
        event = {
            "requestBody": {
                "apiPath": "/getAccountInfo",
                "content": {
                    "accountId": "acc-12345"
                }
            }
        }
        
        result = support_function.lambda_handler(event, lambda_context)
        
        assert result["statusCode"] == 200
        body = json.loads(result["body"])
        assert body["accountId"] == "acc-12345"
        assert body["accountName"] == "Example Corp"
        assert body["accountType"] == "Enterprise"
    
    def test_get_account_info_not_found(self, lambda_context):
        """Test account not found scenario."""
        event = {
            "requestBody": {
                "apiPath": "/getAccountInfo",
                "content": {
                    "accountId": "nonexistent"
                }
            }
        }
        
        result = support_function.lambda_handler(event, lambda_context)
        
        assert result["statusCode"] == 404
        body = json.loads(result["body"])
        assert "not found" in body["error"]
    
    def test_get_account_info_missing_account_id(self, lambda_context):
        """Test missing account ID parameter."""
        event = {
            "requestBody": {
                "apiPath": "/getAccountInfo",
                "content": {}
            }
        }
        
        result = support_function.lambda_handler(event, lambda_context)
        
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "accountId is required" in body["error"]


class TestCreateSupportTicket:
    """Test cases for create_support_ticket function."""
    
    def test_create_ticket_success(self, lambda_context):
        """Test successful ticket creation."""
        event = {
            "requestBody": {
                "apiPath": "/createSupportTicket",
                "content": {
                    "accountId": "acc-12345",
                    "subject": "Test Issue",
                    "description": "Test description",
                    "priority": "high"
                }
            }
        }
        
        result = support_function.lambda_handler(event, lambda_context)
        
        assert result["statusCode"] == 200
        body = json.loads(result["body"])
        assert "ticketId" in body
        assert body["status"] == "new"
        assert "createdAt" in body
    
    def test_create_ticket_invalid_priority(self, lambda_context):
        """Test ticket creation with invalid priority."""
        event = {
            "requestBody": {
                "apiPath": "/createSupportTicket",
                "content": {
                    "accountId": "acc-12345",
                    "subject": "Test Issue",
                    "description": "Test description",
                    "priority": "invalid"
                }
            }
        }
        
        result = support_function.lambda_handler(event, lambda_context)
        
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "Invalid priority" in body["error"]
    
    def test_create_ticket_missing_parameters(self, lambda_context):
        """Test ticket creation with missing parameters."""
        event = {
            "requestBody": {
                "apiPath": "/createSupportTicket",
                "content": {
                    "accountId": "acc-12345"
                    # Missing subject, description, priority
                }
            }
        }
        
        result = support_function.lambda_handler(event, lambda_context)
        
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "required" in body["error"]


class TestGetTicketStatus:
    """Test cases for get_ticket_status function."""
    
    def test_get_ticket_status_success(self, lambda_context):
        """Test successful ticket status retrieval."""
        event = {
            "requestBody": {
                "apiPath": "/getTicketStatus",
                "content": {
                    "ticketId": "ticket-001"
                }
            }
        }
        
        result = support_function.lambda_handler(event, lambda_context)
        
        assert result["statusCode"] == 200
        body = json.loads(result["body"])
        assert body["ticketId"] == "ticket-001"
        assert body["status"] == "in-progress"
        assert "comments" in body
    
    def test_get_ticket_status_not_found(self, lambda_context):
        """Test ticket not found scenario."""
        event = {
            "requestBody": {
                "apiPath": "/getTicketStatus",
                "content": {
                    "ticketId": "nonexistent"
                }
            }
        }
        
        result = support_function.lambda_handler(event, lambda_context)
        
        assert result["statusCode"] == 404
        body = json.loads(result["body"])
        assert "not found" in body["error"]
    
    def test_get_ticket_status_missing_ticket_id(self, lambda_context):
        """Test missing ticket ID parameter."""
        event = {
            "requestBody": {
                "apiPath": "/getTicketStatus",
                "content": {}
            }
        }
        
        result = support_function.lambda_handler(event, lambda_context)
        
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "ticketId is required" in body["error"]


class TestUnsupportedOperation:
    """Test cases for unsupported operations."""
    
    def test_unsupported_operation(self, lambda_context):
        """Test unsupported operation handling."""
        event = {
            "requestBody": {
                "apiPath": "/unsupportedOperation",
                "content": {}
            }
        }
        
        result = support_function.lambda_handler(event, lambda_context)
        
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "Unsupported operation" in body["error"]


class TestErrorHandling:
    """Test cases for error handling."""
    
    def test_malformed_event(self, lambda_context):
        """Test handling of malformed events."""
        event = {"invalid": "structure"}
        
        result = support_function.lambda_handler(event, lambda_context)
        
        assert result["statusCode"] == 400
        body = json.loads(result["body"])
        assert "error" in body
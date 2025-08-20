import json
import boto3
import os
import uuid
from datetime import datetime
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ACCOUNT_DB = {
    "acc-12345": {
        "accountId": "acc-12345",
        "accountName": "Example Corp",
        "accountType": "Enterprise",
        "creationDate": "2023-01-15",
        "status": "Active"
    },
    "acc-67890": {
        "accountId": "acc-67890",
        "accountName": "Sample Inc",
        "accountType": "Business",
        "creationDate": "2023-03-22",
        "status": "Active"
    }
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
            {
                "timestamp": "2024-06-15T10:30:00Z",
                "author": "system",
                "text": "Ticket created"
            },
            {
                "timestamp": "2024-06-16T14:22:00Z",
                "author": "support-agent-1",
                "text": "Investigating the API access issue"
            }
        ]
    }
}

def lambda_handler(event, context):
    """
    Handler function for the customer support agent Lambda.
    
    Args:
        event: The event dict from the Bedrock Agent
        context: The Lambda context
        
    Returns:
        The response to be sent back to the Bedrock Agent
    """
    try:
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Extract the API operation from the event
        api_path = event.get("requestBody", {}).get("apiPath", "")
        operation = api_path.strip("/")
        
        # Extract the parameters from the event
        parameters = event.get("requestBody", {}).get("content", {})
        
        # Process the operation
        if operation == "getAccountInfo":
            return get_account_info(parameters)
        elif operation == "createSupportTicket":
            return create_support_ticket(parameters)
        elif operation == "getTicketStatus":
            return get_ticket_status(parameters)
        else:
            return {
                "statusCode": 400,
                "body": json.dumps({
                    "error": f"Unsupported operation: {operation}"
                })
            }
    
    except Exception as e:
        logger.exception("Error processing request")
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": str(e)
            })
        }

def get_account_info(parameters):
    """Get account information for a customer"""
    account_id = parameters.get("accountId")
    
    if not account_id:
        return {
            "statusCode": 400,
            "body": json.dumps({
                "error": "accountId is required"
            })
        }
    
    # Look up the account in the mock database
    account = ACCOUNT_DB.get(account_id)
    
    if not account:
        return {
            "statusCode": 404,
            "body": json.dumps({
                "error": f"Account {account_id} not found"
            })
        }
    
    return {
        "statusCode": 200,
        "body": json.dumps(account)
    }

def create_support_ticket(parameters):
    """Create a new support ticket"""
    account_id = parameters.get("accountId")
    subject = parameters.get("subject")
    description = parameters.get("description")
    priority = parameters.get("priority")
    
    # Validate required parameters
    if not all([account_id, subject, description, priority]):
        return {
            "statusCode": 400,
            "body": json.dumps({
                "error": "accountId, subject, description, and priority are required"
            })
        }
    
    # Validate that the account exists
    if account_id not in ACCOUNT_DB:
        return {
            "statusCode": 404,
            "body": json.dumps({
                "error": f"Account {account_id} not found"
            })
        }
    
    # Validate priority
    if priority not in ["low", "medium", "high", "critical"]:
        return {
            "statusCode": 400,
            "body": json.dumps({
                "error": f"Invalid priority: {priority}. Must be one of: low, medium, high, critical"
            })
        }
    
    # Create a new ticket
    ticket_id = f"ticket-{uuid.uuid4().hex[:6]}"
    now = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    
    new_ticket = {
        "ticketId": ticket_id,
        "accountId": account_id,
        "subject": subject,
        "description": description,
        "priority": priority,
        "status": "new",
        "createdAt": now,
        "lastUpdated": now,
        "assignedTo": None,
        "comments": [
            {
                "timestamp": now,
                "author": "system",
                "text": "Ticket created"
            }
        ]
    }
    
    # Save the ticket to the mock database
    TICKET_DB[ticket_id] = new_ticket
    
    return {
        "statusCode": 200,
        "body": json.dumps({
            "ticketId": ticket_id,
            "status": "new",
            "createdAt": now
        })
    }

def get_ticket_status(parameters):
    """Get the status of a support ticket"""
    ticket_id = parameters.get("ticketId")
    
    if not ticket_id:
        return {
            "statusCode": 400,
            "body": json.dumps({
                "error": "ticketId is required"
            })
        }
    
    # Look up the ticket in the mock database
    ticket = TICKET_DB.get(ticket_id)
    
    if not ticket:
        return {
            "statusCode": 404,
            "body": json.dumps({
                "error": f"Ticket {ticket_id} not found"
            })
        }
    
    # Return the ticket status
    return {
        "statusCode": 200,
        "body": json.dumps({
            "ticketId": ticket["ticketId"],
            "status": ticket["status"],
            "lastUpdated": ticket["lastUpdated"],
            "assignedTo": ticket["assignedTo"],
            "comments": ticket["comments"]
        })
    }

"""
Session management routes for chat history API.

IMPORTANT: DynamoDB attribute names used in this file must match the constants defined in:
- lib/chatbot-api/chat-history/chat-history.ts (CHAT_HISTORY_ATTRIBUTES)

Attribute names:
- PK: Partition key (user identifier)
- SK: Sort key (session identifier, e.g., CONV#<uuid>)
- GSI1PK: GSI partition key for cross-user queries
- DateModified: Timestamp of last modification (epoch seconds)
- MessageCount: Count of messages in the session
- History: Chat history JSON blob (JSON array of message objects, see chat_history_helpers.py)
"""
import json
from typing import Optional, Dict, Any, List

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router, Response
import os
import boto3
from botocore.exceptions import ClientError
from utils.auth_utils import is_admin, get_user_id

# Configuration constants
DEFAULT_PAGINATION_LIMIT = 10
MAX_PAGINATION_LIMIT = 100
ADMIN_MAX_PAGINATION_LIMIT = 1000
DEFAULT_SESSION_TITLE = "<no_title>"

tracer = Tracer()
router = Router()
logger = Logger()

AWS_REGION = os.environ["AWS_REGION"]
SESSIONS_TABLE_NAME = os.environ["SESSIONS_TABLE_NAME"]
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamodb.Table(SESSIONS_TABLE_NAME)


class SessionNotFoundError(Exception):
    """Raised when a session is not found in DynamoDB."""
    pass


class SessionAccessError(Exception):
    """Raised when there's an error accessing session data."""
    pass


def get_session_for_user(user_id: str, session_id: str) -> Optional[Dict[str, Any]]:
    """
    Retrieve a session from DynamoDB for a specific user.
    
    Args:
        user_id: The user's identifier (partition key)
        session_id: The session identifier (without CONV# prefix)
        
    Returns:
        The session item dict if found, None if not found
        
    Raises:
        SessionAccessError: If there's a DynamoDB error other than item not found
    """
    try:
        response = table.get_item(Key={"PK": user_id, "SK": f"CONV#{session_id}"})
        return response.get("Item")
    except ClientError as error:
        error_code = error.response["Error"]["Code"]
        if error_code == "ResourceNotFoundException":
            logger.info(f"No record found with session id: {session_id}")
            return None
        else:
            logger.error(f"Error retrieving session {session_id} for user {user_id}: {error}")
            raise SessionAccessError(f"Failed to retrieve session: {error_code}")

def parse_session_history(history_json: Optional[str]) -> List[Dict[str, Any]]:
    """
    Parse the History JSON blob from DynamoDB into a list of message objects.
    
    The History field is stored as a JSON-serialized array of message objects.
    Each message has the structure: {role, id, data: {content, parts, additional_kwargs}}
    This structure is defined in chat_history_helpers.py (update_chat_history method).
    
    Args:
        history_json: JSON string containing the chat history array, or None
        
    Returns:
        List of message dictionaries, or empty list if parsing fails
    """
    if not history_json:
        return []
    try:
        history = json.loads(history_json)
        # History should always be a list based on chat_history_helpers.py
        if isinstance(history, list):
            return history
        logger.warning(f"History is not a list, got {type(history).__name__}")
        return []
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse session history JSON: {e}")
        return []


def extract_session_title(history: List[Dict[str, Any]]) -> str:
    """
    Extract the session title from chat history.
    
    The title is derived from the first message's content (typically the user's first question).
    
    Args:
        history: Parsed chat history list
        
    Returns:
        The title string, or DEFAULT_SESSION_TITLE if not available
    """
    if not history or len(history) == 0:
        return DEFAULT_SESSION_TITLE
    try:
        first_message = history[0]
        content = first_message.get("data", {}).get("content")
        return content if content else DEFAULT_SESSION_TITLE
    except (IndexError, AttributeError, TypeError):
        return DEFAULT_SESSION_TITLE


def list_sessions_by_user_id(user_id: str) -> List[Dict[str, Any]]:
    """
    List all sessions for a user.
    
    Args:
        user_id: The user's identifier
        
    Returns:
        List of session items, or empty list if none found or on error
        
    Raises:
        SessionAccessError: If there's a DynamoDB error other than item not found
    """
    items = []
    try:
        last_evaluated_key = None
        while True:
            query_params = {
                "KeyConditionExpression": "PK = :user_id AND begins_with(SK, :sk_prefix)",
                "ExpressionAttributeValues": {
                    ":user_id": user_id,
                    ":sk_prefix": "CONV#"
                },
                "ScanIndexForward": False
            }
            if last_evaluated_key:
                query_params["ExclusiveStartKey"] = last_evaluated_key
                
            response = table.query(**query_params)
            items.extend(response.get("Items", []))

            last_evaluated_key = response.get("LastEvaluatedKey")
            if not last_evaluated_key:
                break

    except ClientError as error:
        error_code = error.response["Error"]["Code"]
        if error_code == "ResourceNotFoundException":
            logger.info(f"No sessions found for user id: {user_id}")
            return []
        else:
            logger.error(f"Error listing sessions for user {user_id}: {error}")
            raise SessionAccessError(f"Failed to list sessions: {error_code}")

    return items


def delete_session_for_user(user_id, session_id):
    try:
        table.delete_item(Key={"PK": user_id, "SK": f"CONV#{session_id}"})
    except ClientError as error:
        if error.response["Error"]["Code"] == "ResourceNotFoundException":
            logger.info(f"Attempted to delete non-existent session {session_id} for user {user_id}")
        else:
            logger.error(f"Error deleting session {session_id} for user {user_id}: {error}")

        return {"id": session_id, "deleted": False}

    logger.info(f"Successfully deleted session {session_id} for user {user_id}")
    return {"id": session_id, "deleted": True}


def delete_user_sessions_for_user_id(user_id):
    sessions = list_sessions_by_user_id(user_id)
    ret_value = []

    for session in sessions:
        result = delete_session_for_user(user_id, session["SK"].split('#')[1])
        ret_value.append({"id": session["SK"].split('#')[1], "deleted": result["deleted"]})

    return ret_value


@router.get("/sessions")
@tracer.capture_method
def get_sessions():
    user_id = get_user_id(router)
    if user_id is None:
        logger.error("Unable to identify user from request")
        return Response(
            status_code=401,
            content_type="application/json",
            body=json.dumps({"error": "User not found"})
        )

    try:
        sessions = list_sessions_by_user_id(user_id)
    except SessionAccessError:
        return Response(
            status_code=500,
            content_type="application/json",
            body=json.dumps({"error": "Failed to retrieve sessions"})
        )

    result_data = []
    for session in sessions:
        history = parse_session_history(session.get("History"))
        title = extract_session_title(history)
    
        session_data = {
            "id": session.get("SK").split('#')[1],
            "title": title,
            "dateModified": session.get("DateModified"),
        }
        result_data.append(session_data)
    
    return result_data

@router.get("/sessions/<session_id>")
@tracer.capture_method
def get_session(session_id: str):
    user_id = get_user_id(router)
    if user_id is None:
        logger.error("Unable to identify user from request")
        return Response(
            status_code=401,
            content_type="application/json",
            body=json.dumps({"error": "User not found"})
        )

    try:
        session = get_session_for_user(user_id, session_id)
    except SessionAccessError:
        return Response(
            status_code=500,
            content_type="application/json",
            body=json.dumps({"error": "Failed to retrieve session"})
        )
        
    if not session:
        # When we create a new session, the UI will send a getSession with a 
        # new UUID and will not expect a 404. We need to return None in this case instead of 404 
        return None

    session_history = parse_session_history(session.get("History"))
    title = extract_session_title(session_history)
    
    # Build history list for response
    history_list = []
    for item in session_history:
        data = item.get("data", {})
        history_item = {
            "id": item.get("id"),
            "role": item.get("role"),
            "content": data.get("content"),
            "parts": data.get("parts"),
            "metadata": data.get("additional_kwargs"),
        }
        history_list.append(history_item)
    
    return {
        "id": session.get("SK").split('#')[1],
        "title": title,
        "dateModified": session.get("DateModified"),
        "userId": user_id,
        "history": history_list,
    }


@router.delete("/sessions")
@tracer.capture_method
def delete_user_sessions():
    user_id = get_user_id(router)
    if user_id is None:
        logger.error("Unable to identify user from request")
        return Response(
            status_code=401,
            content_type="application/json",
            body=json.dumps({"error": "User not found"})
        )

    result = delete_user_sessions_for_user_id(user_id)

    return result


@router.delete("/sessions/<session_id>")
@tracer.capture_method
def delete_session(session_id: str):
    user_id = get_user_id(router)
    if user_id is None:
        logger.error("Unable to identify user from request")
        return Response(
            status_code=401,
            content_type="application/json",
            body=json.dumps({"error": "User not found"})
        )

    result = delete_session_for_user(user_id, session_id)

    return result

@router.get("/users/<user_id>/sessions/<session_id>")
@tracer.capture_method
def get_user_session(user_id: str, session_id: str):
    # Check if ADMIN_GROUP is configured
    if not os.environ.get("ADMIN_GROUP"):
        logger.warning("Admin functionality not available - ADMIN_GROUP not configured")
        return Response(
            status_code=501,
            content_type="application/json",
            body=json.dumps({"error": "Admin functionality not available. ADMIN_GROUP not configured."})
        )
    
    # Check if current user is an admin
    if not is_admin(router):
        logger.warning("Unauthorized access attempt to admin endpoint")
        return Response(
            status_code=403,
            content_type="application/json",
            body=json.dumps({"error": "Forbidden. Admin privileges required."})
        )
    
    # Get the session for the specified user
    try:
        session = get_session_for_user(user_id, session_id)
    except SessionAccessError:
        return Response(
            status_code=500,
            content_type="application/json",
            body=json.dumps({"error": "Failed to retrieve session"})
        )
        
    if not session:
        return Response(
            status_code=404,
            content_type="application/json",
            body=json.dumps({"error": "Session not found"})
        )

    session_history = parse_session_history(session.get("History"))
    title = extract_session_title(session_history)
    
    # Build history list for response
    history_list = []
    for item in session_history:
        data = item.get("data", {})
        history_item = {
            "id": item.get("id"),
            "role": item.get("role"),
            "content": data.get("content"),
            "parts": data.get("parts"),
            "metadata": data.get("additional_kwargs"),
        }
        history_list.append(history_item)
    
    return {
        "id": session.get("SK").split('#')[1],
        "title": title,
        "dateModified": session.get("DateModified"),
        "userId": user_id,
        "history": history_list,
    }

@router.get("/admin/sessions")
@tracer.capture_method
def admin_get_sessions():
    # Check if ADMIN_GROUP is configured
    if not os.environ.get("ADMIN_GROUP"):
        logger.warning("Admin functionality not available - ADMIN_GROUP not configured")
        return Response(
            status_code=501,
            content_type="application/json",
            body=json.dumps({"error": "Admin functionality not available. ADMIN_GROUP not configured."})
        )
    
    # Check if current user is an admin
    if not is_admin(router):
        logger.warning("Unauthorized access attempt to admin sessions endpoint")
        return Response(
            status_code=403,
            content_type="application/json",
            body=json.dumps({"error": "Forbidden. Admin privileges required."})
        )
    
    try:
        query_params = router.current_event.get("queryStringParameters", {}) or {}
        
        # Get and validate date parameters (optional for sessions)
        start_date = query_params.get("start_date")
        end_date = query_params.get("end_date")
        
        # Validate and sanitize limit parameter (max 1000 for admin)
        try:
            limit = int(query_params.get("limit", DEFAULT_PAGINATION_LIMIT))
            limit = max(1, min(limit, ADMIN_MAX_PAGINATION_LIMIT))
        except (ValueError, TypeError):
            limit = DEFAULT_PAGINATION_LIMIT
        
        # Get pagination token
        next_token = query_params.get("next_token")
        
        # Build query parameters for GSI
        gsi_query_params = {
            'IndexName': 'SessionsByDateIndex',
            'KeyConditionExpression': 'GSI1PK = :gsi1pk',
            'ExpressionAttributeValues': {
                ':gsi1pk': 'SESSION'
            },
            'ScanIndexForward': False,  # Most recent first
            'Limit': limit,
            'ProjectionExpression': 'PK, SK, DateModified, MessageCount'
        }
        
        # Add date range filter if provided
        if start_date and end_date:
            try:
                from datetime import datetime
                start_timestamp = int(datetime.fromisoformat(f"{start_date}T00:00:00+00:00").timestamp())
                end_timestamp = int(datetime.fromisoformat(f"{end_date}T23:59:59+00:00").timestamp())
                
                gsi_query_params['KeyConditionExpression'] += ' AND DateModified BETWEEN :start_date AND :end_date'
                gsi_query_params['ExpressionAttributeValues'][':start_date'] = start_timestamp
                gsi_query_params['ExpressionAttributeValues'][':end_date'] = end_timestamp
            except ValueError:
                return Response(
                    status_code=400,
                    content_type="application/json",
                    body=json.dumps({"error": "Invalid date format. Use YYYY-MM-DD"})
                )
        
        if next_token:
            try:
                # Parse the next_token (should be base64 encoded serialized LastEvaluatedKey)
                import base64
                from boto3.dynamodb.types import TypeDeserializer
                
                decoded_token = base64.b64decode(next_token).decode('utf-8')
                serialized_key = json.loads(decoded_token)
                
                # Deserialize back to DynamoDB format
                deserializer = TypeDeserializer()
                last_evaluated_key = {k: deserializer.deserialize(v) for k, v in serialized_key.items()}
                gsi_query_params['ExclusiveStartKey'] = last_evaluated_key
            except Exception as e:
                logger.warning(f"Invalid next_token provided: {e}")
                return Response(
                    status_code=400,
                    content_type="application/json",
                    body=json.dumps({"error": "Invalid next_token"})
                )
        
        response = table.query(**gsi_query_params)
        
        items = []
        for item in response.get('Items', []):
            session_data = {
                'user_id': item.get('PK'),
                'session_id': item.get('SK', '').replace('CONV#', ''),
                'message_count': item.get('MessageCount', 0),
                'date_modified': item.get('DateModified')
            }
            items.append(session_data)
        
        result = {
            'sessions': items
        }
        
        # Add next_token if there are more results
        if 'LastEvaluatedKey' in response:
            import base64
            from boto3.dynamodb.types import TypeSerializer
            
            # Use DynamoDB's type serializer to properly handle Decimal objects
            serializer = TypeSerializer()
            serialized_key = {k: serializer.serialize(v) for k, v in response['LastEvaluatedKey'].items()}
            
            next_token = base64.b64encode(
                json.dumps(serialized_key).encode('utf-8')
            ).decode('utf-8')
            result['next_token'] = next_token
        
        return result
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        logger.error(f"DynamoDB error scanning sessions: {error_code}")
        return Response(
            status_code=500,
            content_type="application/json",
            body=json.dumps({"error": "Failed to retrieve sessions"})
        )
    except Exception as e:
        logger.error(f"Unexpected error in admin sessions endpoint: {type(e).__name__}")
        return Response(
            status_code=500,
            content_type="application/json",
            body=json.dumps({"error": "Failed to retrieve sessions"})
        )


@router.get("/users/<user_id>/sessions")
@tracer.capture_method
def get_user_sessions(user_id: str):
    # Check if ADMIN_GROUP is configured
    if not os.environ.get("ADMIN_GROUP"):
        logger.warning("Admin functionality not available - ADMIN_GROUP not configured")
        return Response(
            status_code=501,
            content_type="application/json",
            body=json.dumps({"error": "Admin functionality not available. ADMIN_GROUP not configured."})
        )
    
    # Check if current user is an admin
    if not is_admin(router):
        logger.warning("Unauthorized access attempt to admin endpoint for listing sessions")
        return Response(
            status_code=403,
            content_type="application/json",
            body=json.dumps({"error": "Forbidden. Admin privileges required."})
        )
    
    try:
        sessions = list_sessions_by_user_id(user_id)
    except SessionAccessError:
        return Response(
            status_code=500,
            content_type="application/json",
            body=json.dumps({"error": "Failed to retrieve sessions"})
        )
        
    if not sessions:
        return []

    result_data = []
    for session in sessions:
        history = parse_session_history(session.get("History"))
        title = extract_session_title(history)
    
        session_data = {
            "id": session.get("SK").split('#')[1],
            "title": title,
            "dateModified": session.get("DateModified"),
            "userId": user_id
        }
        result_data.append(session_data)
    
    return result_data

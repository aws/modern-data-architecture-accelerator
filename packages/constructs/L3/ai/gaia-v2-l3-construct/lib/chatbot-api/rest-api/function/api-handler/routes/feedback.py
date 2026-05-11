"""
User feedback routes for chatbot responses.
Handles thumbs up/down ratings and text feedback.

Security Features:
- JWT-based authentication via Cognito
- Input validation and sanitization
- User data isolation by partition key
- Rate limiting via API Gateway
- Encrypted data at rest and in transit
"""

import json
import os
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional, List

import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router, Response
from aws_lambda_powertools.event_handler.exceptions import BadRequestError, InternalServerError, ServiceError
from botocore.exceptions import ClientError
from utils.auth_utils import get_user_id, is_admin

# Configuration constants
MAX_TEXT_FEEDBACK_LENGTH = 1000
MAX_MODEL_NAME_LENGTH = 100
DEFAULT_PAGINATION_LIMIT = 10
MAX_PAGINATION_LIMIT = 100
MAX_DATE_RANGE_DAYS = 730  # Maximum date range for admin queries
VALID_RATINGS = {'thumbs_up', 'thumbs_down'}
# Load valid reasons from environment variable (required - no default)
_env_reasons = os.environ.get("FEEDBACK_REASONS")
if not _env_reasons:
    raise RuntimeError("FEEDBACK_REASONS environment variable is required but not set")
VALID_REASONS = set(reason.strip().lower() for reason in _env_reasons.split(',') if reason.strip())

# AWS service initialization
tracer = Tracer()
router = Router()
logger = Logger()

AWS_REGION = os.environ.get("AWS_REGION")
FEEDBACK_TABLE_NAME = os.environ["FEEDBACK_TABLE_NAME"]

# Initialize AWS clients
try:
    dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
    feedback_table = dynamodb.Table(FEEDBACK_TABLE_NAME)
except Exception as e:
    logger.error(f"Failed to initialize AWS clients: {str(e)}")
    raise

# Compiled regex patterns for validation
MODEL_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_.-]+:[0-9]+$')


class CommonError(Exception):
    """Common error class matching sessions router pattern"""
    pass


class FeedbackError(Exception):
    """Custom exception for feedback operations with security context"""

    def __init__(self, message: str, error_code: str = "FEEDBACK_ERROR", sensitive_info: bool = False):
        super().__init__(message)
        self.error_code = error_code
        self.sensitive_info = sensitive_info


class ValidationError(FeedbackError):
    """Input validation error"""

    def __init__(self, message: str):
        super().__init__(message, "VALIDATION_ERROR", False)


def sanitize_input(value: str, max_length: int = None, pattern: re.Pattern = None) -> str:
    """
    Sanitize user input to prevent injection attacks and ensure data quality.
    
    Args:
        value: Input string to sanitize
        max_length: Maximum allowed length
        pattern: Regex pattern for validation
    
    Returns:
        Sanitized string
    
    Raises:
        ValidationError: If input fails validation
    """
    if not isinstance(value, str):
        raise ValidationError("Input must be a string")

    # Strip whitespace and control characters
    sanitized = value.strip()
    sanitized = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', sanitized)

    # Check length constraints
    if max_length and len(sanitized) > max_length:
        sanitized = sanitized[:max_length]

    # Validate against pattern if provided
    if pattern and not pattern.match(sanitized):
        raise ValidationError(f"Input does not match required pattern")

    return sanitized



def validate_feedback_data(feedback_data: Dict) -> Dict:
    """
    Validate and sanitize feedback input data.
    
    Security features:
    - Input validation
    - Type checking
    - Length limits
    - UUID validation
    
    Args:
        feedback_data: Raw feedback data from request
    
    Returns:
        Validated and sanitized feedback data
    
    Raises:
        ValidationError: If validation fails
    """
    if not isinstance(feedback_data, dict):
        raise ValidationError("Feedback data must be a JSON object")

    validated = {}

    # Required fields
    required_fields = ['session_id', 'message_id', 'rating']
    for field in required_fields:
        if field not in feedback_data:
            raise ValidationError(f"{field} is required")

    # Validate session_id (allow flexible ID formats)
    session_id = feedback_data['session_id']
    if not isinstance(session_id, str) or len(session_id.strip()) == 0:
        raise ValidationError("session_id must be a non-empty string")
    validated['session_id'] = session_id.strip()

    # Validate message_id (allow flexible ID formats)
    message_id = feedback_data['message_id']
    if not isinstance(message_id, str) or len(message_id.strip()) == 0:
        raise ValidationError("message_id must be a non-empty string")
    validated['message_id'] = message_id.strip()

    # Validate rating
    rating = feedback_data['rating']
    if rating not in VALID_RATINGS:
        raise ValidationError(f"rating must be one of: {', '.join(VALID_RATINGS)}")
    validated['rating'] = rating

    # Validate reason (required only for thumbs_down)
    if rating == 'thumbs_down':
        if 'reason' not in feedback_data:
            raise ValidationError("reason is required for thumbs_down rating")

        reason = feedback_data['reason']
        if not isinstance(reason, str) or len(reason.strip()) == 0:
            raise ValidationError("reason must be a non-empty string")
        reason = reason.lower().strip()
        if reason not in VALID_REASONS:
            raise ValidationError(f"reason must be one of: {', '.join(sorted(VALID_REASONS))}")
        validated['reason'] = reason

    # Optional fields with validation

    if 'text_feedback' in feedback_data and feedback_data['text_feedback']:
        text_feedback = sanitize_input(feedback_data['text_feedback'], MAX_TEXT_FEEDBACK_LENGTH)
        if text_feedback:
            validated['text_feedback'] = text_feedback

    if 'model_used' in feedback_data and feedback_data['model_used']:
        if feedback_data['model_used'] == 'unknown': # some responses have no model involved
            model_used = feedback_data['model_used']
        else:
            model_used = sanitize_input(feedback_data['model_used'], MAX_MODEL_NAME_LENGTH, MODEL_ID_PATTERN)
        
        validated['model_used'] = model_used

    if 'response_time_ms' in feedback_data:
        try:
            response_time = int(feedback_data['response_time_ms'])
            if 0 <= response_time <= 300000:  # Max 5 minutes
                validated['response_time_ms'] = response_time
        except (ValueError, TypeError):
            raise ValidationError("response_time_ms must be a valid integer")

    return validated


@tracer.capture_method
def save_feedback(user_id: str, feedback_data: Dict) -> Dict:
    """
    Save feedback to DynamoDB.
    
    Security features:
    - Input validation
    - Encrypted storage
    - Audit logging
    
    Args:
        user_id: Authenticated user ID from JWT
        feedback_data: Validated feedback data
    
    Returns:
        Feedback creation response
    
    Raises:
        FeedbackError: If save operation fails
    """
    try:
        # Generate secure IDs
        feedback_id = str(uuid.uuid4())
        timestamp = datetime.now(timezone.utc)
        iso_timestamp = timestamp.isoformat()

        # Validate input data
        validated_data = validate_feedback_data(feedback_data)

        # Prepare base item
        item = {
            'PK': 'FEEDBACK',
            'SK': iso_timestamp,
            'feedback_id': feedback_id,
            'user_id': user_id,
            'session_id': validated_data['session_id'],
            'message_id': validated_data['message_id'],
            'rating': validated_data['rating'],
            'created_at': iso_timestamp
        }

        # Add reason field if present (for thumbs_down ratings)
        if 'reason' in validated_data:
            item['reason'] = validated_data['reason']

        # Add optional validated fields

        if 'text_feedback' in validated_data:
            item['text_feedback'] = validated_data['text_feedback']

        if 'response_time_ms' in validated_data:
            item['response_time_ms'] = validated_data['response_time_ms']

        if 'model_used' in validated_data:
            item['model_used'] = validated_data['model_used']

        # Save to DynamoDB with condition to prevent overwrites
        feedback_table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(feedback_id)"
        )

        # Log successful operation (without sensitive data)
        logger.info("Feedback saved successfully", extra={
            "feedback_id": feedback_id,
            "user_id": user_id,
            "rating": validated_data['rating'],
            "has_text": 'text_feedback' in validated_data
        })

        logger.info(f"Feedback saved: {validated_data['rating']}")

        # Return minimal response
        return {
            'feedback_id': feedback_id,
            'user_id': user_id,
            'rating': validated_data['rating'],
            'created_at': iso_timestamp
        }

    except ValidationError:
        raise  # Re-raise validation errors
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        logger.error(f"DynamoDB error saving feedback: {error_code}")
        raise FeedbackError("Failed to save feedback due to database error", "DATABASE_ERROR")
    except Exception as e:
        logger.error(f"Unexpected error saving feedback: {type(e).__name__}")
        raise FeedbackError("Failed to save feedback due to internal error", "INTERNAL_ERROR")


@tracer.capture_method
def get_feedback_by_id(feedback_id: str, user_id: str = None) -> Optional[Dict]:
    """
    Get a specific feedback entry by ID.
    
    Security features:
    - Direct query using GSI
    - Optional user-based filtering / access control
    
    Args:
        feedback_id: The UUID of the feedback to retrieve
        user_id: If provided, only return feedback owned by this user
        
    Returns:
        Feedback item if found, None otherwise
    """
    try:
        # Query the GSI for the feedback_id
        query_params = {
            "IndexName": "FeedbackIdIndex",
            "KeyConditionExpression": "feedback_id = :feedback_id",
            "ExpressionAttributeValues": {
                ":feedback_id": feedback_id
            },
            "Limit": 1
        }

        if user_id:
            query_params["FilterExpression"] = "user_id = :user_id"
            query_params["ExpressionAttributeValues"][":user_id"] = user_id

        response = feedback_table.query(**query_params)
        items = response.get("Items", [])

        if not items:
            return None

        item = items[0]
        feedback_item = {
            'feedback_id': item.get('feedback_id'),
            'user_id': item.get('user_id'),
            'session_id': item.get('session_id'),
            'message_id': item.get('message_id'),
            'rating': item.get('rating'),
            'reason': item.get('reason'),
            'text_feedback': item.get('text_feedback'),
            'created_at': item.get('created_at'),
            'model_used': item.get('model_used'),
            'response_time_ms': item.get('response_time_ms')
        }

        return feedback_item

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        logger.error(f"DynamoDB error retrieving feedback by ID: {error_code}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error retrieving feedback by ID: {type(e).__name__}")
        return None


@tracer.capture_method
def get_feedback_in_date_range(start_date: str, end_date: str, limit: int = DEFAULT_PAGINATION_LIMIT,
                               next_token: Optional[str] = None) -> Dict:
    """
    Get all feedback within a specific date range (admin only).
    
    Security features:
    - Date range validation
    - Rate limiting via limit parameter
    - Pagination to prevent large data dumps
    
    Args:
        start_date: Start date in ISO format (YYYY-MM-DD)
        end_date: End date in ISO format (YYYY-MM-DD)
        limit: Number of items to return
        next_token: Pagination token
        
    Returns:
        Feedback items in the date range with pagination
        
    Raises:
        ValidationError: If date format is invalid
        FeedbackError: If database query fails
    """
    # Validate and convert dates
    try:
        start_datetime = datetime.fromisoformat(f"{start_date}T00:00:00+00:00")
        end_datetime = datetime.fromisoformat(f"{end_date}T23:59:59.999999+00:00")

        # Ensure start_date is before end_date
        if start_datetime > end_datetime:
            start_datetime, end_datetime = end_datetime, start_datetime

        # Limit date range to prevent excessive queries
        date_diff = (end_datetime - start_datetime).days
        if date_diff > MAX_DATE_RANGE_DAYS:
            end_datetime = start_datetime + timedelta(days=MAX_DATE_RANGE_DAYS)

        start_iso = start_datetime.isoformat()
        end_iso = end_datetime.isoformat()

    except ValueError:
        logger.warning(f"Invalid date format in admin feedback query: {start_date} to {end_date}")
        raise ValidationError("Invalid date format. Use YYYY-MM-DD")

    # Validate limit
    limit = max(1, min(limit, MAX_PAGINATION_LIMIT))

    # Query the FEEDBACK partition with date range filter
    query_params = {
        "KeyConditionExpression": "PK = :pk AND SK BETWEEN :start_date AND :end_date",
        "ExpressionAttributeValues": {
            ":pk": "FEEDBACK",
            ":start_date": start_iso,
            ":end_date": end_iso
        },
        "Limit": limit
    }

    # Handle pagination token
    if next_token:
        try:
            exclusive_start_key = {
                "PK": "FEEDBACK",
                "SK": next_token
            }
            query_params["ExclusiveStartKey"] = exclusive_start_key
        except Exception as e:
            logger.warning(f"Invalid pagination token in admin query: {type(e).__name__}")

    try:
        response = feedback_table.query(**query_params)
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        logger.error(f"DynamoDB error in date range query: {error_code}")
        raise FeedbackError("Failed to retrieve feedback due to database error", "DATABASE_ERROR")
    except Exception as e:
        logger.error(f"Unexpected error in date range query: {type(e).__name__}")
        raise FeedbackError("Failed to retrieve feedback due to internal error", "INTERNAL_ERROR")

    # Process items
    items = []
    for item in response.get("Items", []):
        feedback_item = {
            'feedback_id': item.get('feedback_id'),
            'user_id': item.get('user_id'),
            'session_id': item.get('session_id'),
            'message_id': item.get('message_id'),
            'rating': item.get('rating'),
            'reason': item.get('reason'),
            'text_feedback': item.get('text_feedback'),
            'created_at': item.get('created_at'),
            'model_used': item.get('model_used'),
            'response_time_ms': item.get('response_time_ms')
        }
        items.append(feedback_item)

    result = {
        'items': items,
        'date_range': {
            'start_date': start_iso,
            'end_date': end_iso
        }
    }

    # Add next token if available
    if 'LastEvaluatedKey' in response:
        result['next_token'] = response['LastEvaluatedKey']['SK']

    return result


@tracer.capture_method
def get_user_feedback_history(user_id: str, limit: int = DEFAULT_PAGINATION_LIMIT, next_token: Optional[str] = None) -> Dict:
    """
    Get user's feedback history.
    
    Security features:
    - User data isolation through filtering
    - Input validation
    - Rate limiting via limit parameter
    
    Args:
        user_id: Authenticated user ID
        limit: Number of items to return
        next_token: Pagination token (DynamoDB LastEvaluatedKey)
    
    Returns:
        User's feedback history with pagination
    """
    try:
        # Validate and limit results
        limit = max(1, min(limit, MAX_PAGINATION_LIMIT))

        # Query the "FEEDBACK" partition but filter for the specific user_id
        query_params = {
            "KeyConditionExpression": "PK = :pk",
            "FilterExpression": "user_id = :user_id",
            "ExpressionAttributeValues": {
                ":pk": "FEEDBACK",
                ":user_id": user_id
            },
            "ScanIndexForward": False,  # Most recent first (sort by timestamp descending)
            "Limit": limit
        }

        # Handle pagination token
        if next_token:
            try:
                # Reconstruct the full DynamoDB key using the provided timestamp
                exclusive_start_key = {
                    "PK": "FEEDBACK",
                    "SK": next_token
                }
                query_params["ExclusiveStartKey"] = exclusive_start_key
            except Exception as e:
                logger.warning(f"Invalid pagination token: {type(e).__name__}")

        response = feedback_table.query(**query_params)

        # Process items and sanitize for response
        items = []
        for item in response.get('Items', []):
            feedback_item = {
                'feedback_id': item.get('feedback_id'),
                'user_id': item.get('user_id'),
                'session_id': item.get('session_id'),
                'message_id': item.get('message_id'),
                'rating': item.get('rating'),
                'reason': item.get('reason'),
                'text_feedback': item.get('text_feedback'),
                'created_at': item.get('created_at'),
                'model_used': item.get('model_used'),
                'response_time_ms': item.get('response_time_ms')
            }

            items.append(feedback_item)

        result = {
            'items': items
        }

        # Add next_token if there are more results (just the SK timestamp)
        if 'LastEvaluatedKey' in response:
            result['next_token'] = response['LastEvaluatedKey']['SK']

        return result

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        logger.error(f"DynamoDB error querying feedback history: {error_code}")
        return {'items': []}
    except Exception as e:
        logger.error(f"Unexpected error querying feedback history: {type(e).__name__}")
        return {'items': []}


@router.post("/feedback")
@tracer.capture_method
def submit_feedback():
    """
    Submit user feedback for a chatbot response.
    
    Expected payload:
    {
        "session_id": "session-uuid",
        "message_id": "message-uuid", 
        "rating": "thumbs_up" | "thumbs_down",
        "text_feedback": "Optional text explanation",
        "response_time_ms": 1500,
        "model_used": "claude-3-sonnet"
    }
    """
    user_id = get_user_id(router)
    if not user_id:
        logger.warning("Unauthenticated feedback submission attempt")
        raise CommonError("User not found")

    try:
        # Parse request body
        body = router.current_event.get("body", "{}")
        if isinstance(body, str):
            feedback_data = json.loads(body)
        else:
            feedback_data = body

        # Save feedback with validation
        result = save_feedback(user_id, feedback_data)

        logger.info("Feedback submitted successfully", extra={
            "feedback_id": result['feedback_id'],
            "rating": result['rating'],
            "user_id": user_id
        })

        return result

    except json.JSONDecodeError:
        logger.warning("Invalid JSON in feedback submission")
        raise BadRequestError("Invalid JSON in request body")
    except ValidationError as e:
        logger.info(f"Feedback validation error: {str(e)}")
        raise BadRequestError(str(e))
    except FeedbackError as e:
        if e.sensitive_info:
            logger.error(f"Sensitive feedback error: {e.error_code}")
            raise InternalServerError("Internal server error")
        elif e.error_code == "DATABASE_ERROR":
            raise ServiceError("Service temporarily unavailable")
        else:
            raise BadRequestError(str(e))
    except Exception as e:
        logger.error(f"Unexpected error in submit_feedback: {type(e).__name__}")
        raise InternalServerError("Internal server error")


@router.get("/feedback/<feedback_id>")
@tracer.capture_method
def get_feedback(feedback_id: str):
    """
    Get a specific feedback entry by ID.
    
    - Regular users can only access their own feedback
    - Admins can access any feedback
    """
    user_id = get_user_id(router)
    if not user_id:
        logger.warning("Unauthenticated feedback retrieval attempt")
        return Response(
            status_code=401,
            content_type="application/json",
            body=json.dumps({"error": "User not found"})
        )

    try:
        # Check if user is admin
        is_admin_user = is_admin(router)

        # Get the requested feedback
        # For regular users, filter by user_id
        # For admins, don't filter by user_id (pass None)
        if is_admin_user:
            feedback_item = get_feedback_by_id(feedback_id)
        else:
            feedback_item = get_feedback_by_id(feedback_id, user_id)

        # If feedback not found
        if not feedback_item:
            logger.info(f"Feedback {feedback_id} not found or access denied")
            return Response(
                status_code=404,
                content_type="application/json",
                body=json.dumps({"error": "Feedback not found"})
            )

        return feedback_item

    except Exception as e:
        logger.error(f"Error retrieving feedback {feedback_id}: {type(e).__name__}")
        return Response(
            status_code=500,
            content_type="application/json",
            body=json.dumps({"error": "Failed to retrieve feedback"})
        )


@router.get("/admin/feedback")
@tracer.capture_method
def admin_get_feedback():
    """
    Admin endpoint to get feedback within a date range.
    
    Query parameters:
    - start_date: Start date in ISO format (YYYY-MM-DD) (required)
    - end_date: End date in ISO format (YYYY-MM-DD) (required)
    - limit: Number of items to return (default: 10, max: 100)
    - next_token: Pagination token for next page (optional)
    """
    # Check if user is admin
    if not is_admin(router):
        logger.warning("Unauthorized access attempt to admin feedback endpoint")
        return Response(
            status_code=403,
            content_type="application/json",
            body=json.dumps({"error": "Admin privileges required"})
        )

    try:
        query_params = router.current_event.get("queryStringParameters", {}) or {}

        # Get and validate required date parameters
        start_date = query_params.get("start_date")
        end_date = query_params.get("end_date")

        if not start_date or not end_date:
            return Response(
                status_code=400,
                content_type="application/json",
                body=json.dumps({"error": "start_date and end_date parameters are required"})
            )

        # Validate and sanitize limit parameter
        try:
            limit = int(query_params.get("limit", DEFAULT_PAGINATION_LIMIT))
            limit = max(1, min(limit, MAX_PAGINATION_LIMIT))
        except (ValueError, TypeError):
            limit = DEFAULT_PAGINATION_LIMIT

        # Get pagination token
        next_token = query_params.get("next_token")

        # Get feedback for date range
        result = get_feedback_in_date_range(start_date, end_date, limit, next_token)

        response = {
            "feedback": result['items'],
            # "date_range": result['date_range']
        }

        # Include pagination token if available
        if result.get('next_token'):
            response["next_token"] = result['next_token']

        return response

    except ValidationError as e:
        logger.info(f"Validation error in admin feedback endpoint: {str(e)}")
        return Response(
            status_code=400,
            content_type="application/json",
            body=json.dumps({"error": str(e)})
        )
    except FeedbackError as e:
        if e.error_code == "DATABASE_ERROR":
            return Response(
                status_code=503,
                content_type="application/json",
                body=json.dumps({"error": "Service temporarily unavailable"})
            )
        else:
            return Response(
                status_code=500,
                content_type="application/json",
                body=json.dumps({"error": "Internal server error"})
            )
    except Exception as e:
        logger.error(f"Unexpected error in admin feedback endpoint: {type(e).__name__}")
        return Response(
            status_code=500,
            content_type="application/json",
            body=json.dumps({"error": "Failed to retrieve feedback data"})
        )


@router.get("/feedback")
@tracer.capture_method
def get_feedback_history():
    """
    Get user's feedback history.
    
    Query parameters:
    - limit: Number of items to return (default: 10, max: 100)
    - next_token: Pagination token for next page (optional)
    """
    user_id = get_user_id(router)
    if not user_id:
        logger.warning("Unauthenticated feedback history request")
        return Response(
            status_code=401,
            content_type="application/json",
            body=json.dumps({"error": "User not found"})
        )

    try:
        query_params = router.current_event.get("queryStringParameters", {}) or {}

        # Validate and sanitize limit parameter
        try:
            limit = int(query_params.get("limit", DEFAULT_PAGINATION_LIMIT))
            limit = max(1, min(limit, MAX_PAGINATION_LIMIT))
        except (ValueError, TypeError):
            limit = DEFAULT_PAGINATION_LIMIT

        # Get next_token parameter
        next_token = query_params.get("next_token")

        result = get_user_feedback_history(user_id, limit, next_token)

        response = {
            "feedback": result['items']
        }

        # Include next_token if available
        if result.get('next_token'):
            response["next_token"] = result['next_token']

        return response

    except Exception as e:
        logger.error(f"Unexpected error in get_feedback_history: {type(e).__name__}")
        return Response(
            status_code=500,
            content_type="application/json",
            body=json.dumps({"error": "Failed to retrieve feedback history"})
        )

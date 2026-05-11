"""
Bot management routes for service interruption control.
Handles activation, deactivation, and status checking of service interruptions.

Security Features:
- Admin-only access with proper JWT verification
- Input validation and sanitization
- Structured logging for audit trails
- Rate limiting via WAF (IP-based rules in waf.ts) and API Gateway throttling (rest-api.ts)
- Encrypted data at rest and in transit
"""

import json
import os
import re
from datetime import datetime, timezone
from typing import Dict, Optional, List

import boto3
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router, Response
from aws_lambda_powertools.event_handler.exceptions import BadRequestError, InternalServerError, ServiceError, UnauthorizedError
from botocore.exceptions import ClientError
from utils.auth_utils import get_user_id, is_admin

# Configuration constants
MAX_MESSAGE_LENGTH = 500
MAX_REASON_LENGTH = 200
MAX_DURATION_MINUTES = 10080  # 7 days max
VALID_SERVICE_TYPES = {'global', 'bedrock-rag', 'bedrock-invoke-model', 'bedrock-strands-agents'}

# AWS service initialization
tracer = Tracer()
router = Router()
logger = Logger()

AWS_REGION = os.environ.get("AWS_REGION", "ca-central-1")
SERVICE_INTERRUPTION_TABLE_NAME = os.environ.get("SERVICE_INTERRUPTION_TABLE_NAME")

# Initialize AWS clients only if table is configured
dynamodb = None
interruption_table = None

if SERVICE_INTERRUPTION_TABLE_NAME:
    try:
        dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
        interruption_table = dynamodb.Table(SERVICE_INTERRUPTION_TABLE_NAME)
    except Exception as e:
        logger.error(f"Failed to initialize DynamoDB client: {str(e)}")


class BotManagementError(Exception):
    """Custom exception for bot management operations"""

    def __init__(self, message: str, error_code: str = "BOT_MANAGEMENT_ERROR", sensitive_info: bool = False):
        super().__init__(message)
        self.error_code = error_code
        self.sensitive_info = sensitive_info


class ValidationError(BotManagementError):
    """Input validation error"""

    def __init__(self, message: str):
        super().__init__(message, "VALIDATION_ERROR", False)


def sanitize_input(value: str, max_length: int = None) -> str:
    """
    Sanitize user input to prevent injection attacks and ensure data quality.
    
    Args:
        value: Input string to sanitize
        max_length: Maximum allowed length
    
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

    return sanitized


def validate_service_type(service_type: str) -> str:
    """
    Validate service type input.
    
    Args:
        service_type: Service type to validate
        
    Returns:
        Validated service type
        
    Raises:
        ValidationError: If service type is invalid
    """
    if not isinstance(service_type, str) or not service_type.strip():
        raise ValidationError("service_type must be a non-empty string")
    
    service_type = service_type.strip().lower()
    if service_type not in VALID_SERVICE_TYPES:
        raise ValidationError(f"service_type must be one of: {', '.join(sorted(VALID_SERVICE_TYPES))}")
    
    return service_type


def check_admin_access(router) -> bool:
    """
    Check if current user has admin access and service is configured.
    
    Args:
        router: Router object containing current event
        
    Returns:
        True if user has admin access and service is configured
        
    Raises:
        Response: If access is denied or service not configured
    """
    # Check if ADMIN_GROUP is configured
    if not os.environ.get("ADMIN_GROUP"):
        logger.warning("Bot management functionality not available - ADMIN_GROUP not configured")
        raise BadRequestError("Bot management functionality not available. ADMIN_GROUP not configured.")
    
    # Check if SERVICE_INTERRUPTION_TABLE_NAME is configured
    if not SERVICE_INTERRUPTION_TABLE_NAME:
        logger.warning("Bot management functionality not available - SERVICE_INTERRUPTION_TABLE_NAME not configured")
        raise BadRequestError("Bot management functionality not available. Service interruption table not configured.")
    
    # Check if current user is an admin
    if not is_admin(router):
        user_id = get_user_id(router)
        logger.warning(f"Unauthorized access attempt to bot management endpoint by user: {user_id}")
        raise UnauthorizedError("Forbidden. Admin privileges required.")
    
    return True


@tracer.capture_method
def activate_service_interruption(service_type: str, message: str, reason: Optional[str] = None, 
                                activated_by: Optional[str] = None, duration_minutes: Optional[int] = None) -> Dict:
    """
    Activate service interruption in DynamoDB.
    
    Args:
        service_type: Service type to interrupt
        message: Interruption message
        reason: Reason for interruption
        activated_by: Who activated the interruption
        duration_minutes: Auto-deactivate after N minutes
        
    Returns:
        Operation result dictionary
        
    Raises:
        BotManagementError: If operation fails
    """
    try:
        current_time = datetime.now(timezone.utc)
        
        # Prepare the item
        item = {
            'id': service_type,
            'isActive': True,
            'message': message,
            'scope': 'service' if service_type != 'global' else 'global',
            'activatedAt': current_time.isoformat(),
            'activatedBy': activated_by or 'api-admin',
            'lastUpdated': current_time.isoformat()
        }
        
        if reason:
            item['reason'] = reason
        
        # Add TTL if duration is specified
        if duration_minutes:
            from datetime import timedelta
            ttl_time = current_time + timedelta(minutes=duration_minutes)
            item['ttl'] = int(ttl_time.timestamp())
        
        interruption_table.put_item(Item=item)
        
        result = {
            'success': True,
            'message': f'Service interruption activated for {service_type}',
            'service_type': service_type,
            'interruption_message': message,
            'activated_at': current_time.isoformat(),
            'activated_by': item['activatedBy']
        }
        
        if duration_minutes:
            result['duration_minutes'] = duration_minutes
            result['auto_deactivate_at'] = (current_time + timedelta(minutes=duration_minutes)).isoformat()
        
        logger.info(f"Service interruption activated", extra={
            "service_type": service_type,
            "activated_by": activated_by,
            "has_duration": duration_minutes is not None
        })
        
        return result
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        logger.error(f"DynamoDB error activating interruption: {error_code}")
        raise BotManagementError("Failed to activate service interruption due to database error", "DATABASE_ERROR")
    except Exception as e:
        logger.error(f"Unexpected error activating interruption: {type(e).__name__}")
        raise BotManagementError("Failed to activate service interruption due to internal error", "INTERNAL_ERROR")


@tracer.capture_method
def deactivate_service_interruption(service_type: str) -> Dict:
    """
    Deactivate service interruption in DynamoDB.
    
    Args:
        service_type: Service type to deactivate
        
    Returns:
        Operation result dictionary
        
    Raises:
        BotManagementError: If operation fails
    """
    try:
        # Check if interruption exists and is active
        response = interruption_table.get_item(Key={'id': service_type})
        
        if 'Item' not in response:
            return {
                'success': False,
                'message': f'No interruption found for {service_type}'
            }
        
        current_item = response['Item']
        if not current_item.get('isActive', False):
            return {
                'success': False,
                'message': f'Service interruption for {service_type} is already inactive'
            }
        
        # Update the item to deactivate
        current_time = datetime.now(timezone.utc)
        interruption_table.update_item(
            Key={'id': service_type},
            UpdateExpression='SET isActive = :inactive, deactivatedAt = :deactivated_at, lastUpdated = :last_updated REMOVE #ttl',
            ExpressionAttributeNames={'#ttl': 'ttl'},
            ExpressionAttributeValues={
                ':inactive': False,
                ':deactivated_at': current_time.isoformat(),
                ':last_updated': current_time.isoformat()
            }
        )
        
        logger.info(f"Service interruption deactivated", extra={
            "service_type": service_type
        })
        
        return {
            'success': True,
            'message': f'Service interruption deactivated for {service_type}',
            'service_type': service_type,
            'deactivated_at': current_time.isoformat()
        }
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        logger.error(f"DynamoDB error deactivating interruption: {error_code}")
        raise BotManagementError("Failed to deactivate service interruption due to database error", "DATABASE_ERROR")
    except Exception as e:
        logger.error(f"Unexpected error deactivating interruption: {type(e).__name__}")
        raise BotManagementError("Failed to deactivate service interruption due to internal error", "INTERNAL_ERROR")


@tracer.capture_method
def get_interruption_status(service_type: Optional[str] = None) -> Dict:
    """
    Get current interruption status from DynamoDB.
    
    Args:
        service_type: Specific service type to check, or None for all
        
    Returns:
        Status information dictionary
        
    Raises:
        BotManagementError: If operation fails
    """
    try:
        if service_type:
            # Get specific service status
            response = interruption_table.get_item(Key={'id': service_type})
            
            if 'Item' not in response:
                return {
                    'success': True,
                    'service_type': service_type,
                    'is_active': False,
                    'message': 'No interruption configured'
                }
            
            item = response['Item']
            result = {
                'success': True,
                'service_type': service_type,
                'is_active': item.get('isActive', False),
                'message': item.get('message', ''),
                'scope': item.get('scope', ''),
                'activated_at': item.get('activatedAt'),
                'activated_by': item.get('activatedBy'),
                'reason': item.get('reason'),
                'last_updated': item.get('lastUpdated')
            }
            
            if item.get('ttl'):
                result['auto_deactivate_at'] = datetime.fromtimestamp(item['ttl'], timezone.utc).isoformat()
            
            return result
        else:
            # Get all interruption statuses
            response = interruption_table.scan()
            interruptions = []
            
            for item in response['Items']:
                interruption = {
                    'service_type': item['id'],
                    'is_active': item.get('isActive', False),
                    'message': item.get('message', ''),
                    'scope': item.get('scope', ''),
                    'activated_at': item.get('activatedAt'),
                    'activated_by': item.get('activatedBy'),
                    'reason': item.get('reason'),
                    'last_updated': item.get('lastUpdated')
                }
                
                if item.get('ttl'):
                    interruption['auto_deactivate_at'] = datetime.fromtimestamp(item['ttl'], timezone.utc).isoformat()
                
                interruptions.append(interruption)
            
            return {
                'success': True,
                'interruptions': interruptions,
                'total_count': len(interruptions),
                'active_count': len([i for i in interruptions if i['is_active']])
            }
            
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        logger.error(f"DynamoDB error getting interruption status: {error_code}")
        raise BotManagementError("Failed to get interruption status due to database error", "DATABASE_ERROR")
    except Exception as e:
        logger.error(f"Unexpected error getting interruption status: {type(e).__name__}")
        raise BotManagementError("Failed to get interruption status due to internal error", "INTERNAL_ERROR")


@router.post("/bot-management/interruptions")
@tracer.capture_method
def activate_interruption():
    """
    Activate service interruption.
    
    Expected payload:
    {
        "service_type": "global" | "bedrock-rag" | "bedrock-invoke-model" | "bedrock-strands-agents",
        "message": "Custom interruption message",
        "reason": "Optional reason for interruption",
        "duration_minutes": 60  // Optional auto-deactivate after N minutes
    }
    """
    check_admin_access(router)
    
    try:
        # Parse request body
        body = router.current_event.get("body", "{}")
        if isinstance(body, str):
            request_data = json.loads(body)
        else:
            request_data = body

        # Validate required fields
        if 'service_type' not in request_data:
            raise ValidationError("service_type is required")
        if 'message' not in request_data:
            raise ValidationError("message is required")

        # Validate and sanitize inputs
        service_type = validate_service_type(request_data['service_type'])
        message = sanitize_input(request_data['message'], MAX_MESSAGE_LENGTH)
        
        if not message:
            raise ValidationError("message cannot be empty")

        reason = None
        if 'reason' in request_data and request_data['reason']:
            reason = sanitize_input(request_data['reason'], MAX_REASON_LENGTH)

        duration_minutes = None
        if 'duration_minutes' in request_data:
            try:
                duration_minutes = int(request_data['duration_minutes'])
                if duration_minutes <= 0 or duration_minutes > MAX_DURATION_MINUTES:
                    raise ValidationError(f"duration_minutes must be between 1 and {MAX_DURATION_MINUTES}")
            except (ValueError, TypeError):
                raise ValidationError("duration_minutes must be a valid integer")

        # Get current user for audit trail
        user_id = get_user_id(router)
        
        # Activate interruption
        result = activate_service_interruption(
            service_type=service_type,
            message=message,
            reason=reason,
            activated_by=user_id,
            duration_minutes=duration_minutes
        )

        return result

    except json.JSONDecodeError:
        logger.warning("Invalid JSON in interruption activation request")
        raise BadRequestError("Invalid JSON in request body")
    except ValidationError as e:
        logger.info(f"Interruption activation validation error: {str(e)}")
        raise BadRequestError(str(e))
    except BotManagementError as e:
        if e.error_code == "DATABASE_ERROR":
            raise ServiceError("Service temporarily unavailable")
        else:
            raise BadRequestError(str(e))
    except Exception as e:
        logger.error(f"Unexpected error in activate_interruption: {type(e).__name__}")
        raise InternalServerError("Internal server error")


@router.delete("/bot-management/interruptions/<service_type>")
@tracer.capture_method
def deactivate_interruption(service_type: str):
    """
    Deactivate service interruption for a specific service type.
    """
    check_admin_access(router)
    
    try:
        # Validate service type
        service_type = validate_service_type(service_type)
        
        # Deactivate interruption
        result = deactivate_service_interruption(service_type)
        
        return result

    except ValidationError as e:
        logger.info(f"Interruption deactivation validation error: {str(e)}")
        raise BadRequestError(str(e))
    except BotManagementError as e:
        if e.error_code == "DATABASE_ERROR":
            raise ServiceError("Service temporarily unavailable")
        else:
            raise BadRequestError(str(e))
    except Exception as e:
        logger.error(f"Unexpected error in deactivate_interruption: {type(e).__name__}")
        raise InternalServerError("Internal server error")


@router.get("/bot-management/interruptions")
@tracer.capture_method
def get_all_interruptions():
    """
    Get status of all service interruptions.
    """
    check_admin_access(router)
    
    try:
        result = get_interruption_status()
        return result

    except BotManagementError as e:
        if e.error_code == "DATABASE_ERROR":
            raise ServiceError("Service temporarily unavailable")
        else:
            raise BadRequestError(str(e))
    except Exception as e:
        logger.error(f"Unexpected error in get_all_interruptions: {type(e).__name__}")
        raise InternalServerError("Internal server error")


@router.get("/bot-management/interruptions/<service_type>")
@tracer.capture_method
def get_service_interruption(service_type: str):
    """
    Get status of a specific service interruption.
    """
    check_admin_access(router)
    
    try:
        # Validate service type
        service_type = validate_service_type(service_type)
        
        result = get_interruption_status(service_type)
        return result

    except ValidationError as e:
        logger.info(f"Get interruption validation error: {str(e)}")
        raise BadRequestError(str(e))
    except BotManagementError as e:
        if e.error_code == "DATABASE_ERROR":
            raise ServiceError("Service temporarily unavailable")
        else:
            raise BadRequestError(str(e))
    except Exception as e:
        logger.error(f"Unexpected error in get_service_interruption: {type(e).__name__}")
        raise InternalServerError("Internal server error")


@router.get("/bot-management/service-types")
@tracer.capture_method
def get_service_types():
    """
    Get list of available service types for interruption management.
    
    Returns:
        List of valid service types that can be used for interruption control
    """
    check_admin_access(router)
    
    return {
        'service_types': sorted(list(VALID_SERVICE_TYPES)),
        'descriptions': {
            'global': 'Affects all services across the platform',
            'bedrock-rag': 'Bedrock RAG (Retrieval Augmented Generation) data source only',
            'bedrock-invoke-model': 'Bedrock Invoke Model data source only',
            'bedrock-strands-agents': 'Bedrock Strands Agents data source only'
        },
        'default_scope': {
            'global': 'global',
            'bedrock-rag': 'service',
            'bedrock-invoke-model': 'service',
            'bedrock-strands-agents': 'service'
        }
    }


@router.get("/bot-management/health")
@tracer.capture_method
def health_check():
    """
    Health check endpoint for bot management functionality.
    """
    check_admin_access(router)
    
    try:
        # Test DynamoDB connection
        if interruption_table:
            # Simple test query to verify table access
            interruption_table.scan(Limit=1)
            
        return {
            'status': 'healthy',
            'service': 'bot-management',
            'table_configured': SERVICE_INTERRUPTION_TABLE_NAME is not None,
            'table_accessible': interruption_table is not None,
            'available_service_types': len(VALID_SERVICE_TYPES),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }

    except Exception as e:
        logger.error(f"Health check failed: {type(e).__name__}")
        return {
            'status': 'unhealthy',
            'service': 'bot-management',
            'error': 'Database connectivity issue',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }
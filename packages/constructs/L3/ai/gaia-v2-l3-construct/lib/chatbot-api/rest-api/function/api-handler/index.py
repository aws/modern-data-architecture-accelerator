"""
REST API handler for GAIA v2 chatbot API.

This Lambda function serves as the entry point for the REST API, handling:
- Session management (chat history CRUD operations)
- User feedback collection and retrieval
- Bot configuration management

The API can be protected by CloudFront origin verification to ensure requests
only come through the CloudFront distribution. This can be disabled for direct
API Gateway access by setting REQUIRE_ORIGIN_VERIFY=false.

For API endpoint documentation, see the README.md in the gaia-v2-l3-construct package.
"""
import decimal
import json
import os
import uuid
from typing import Any, Dict, Optional

from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler import (
    APIGatewayRestResolver,
)
from aws_lambda_powertools.utilities import parameters
from aws_lambda_powertools.utilities.typing import LambdaContext

from routes.sessions import router as sessions_router
from routes.feedback import router as feedback_router
from routes.bot_management import router as bot_management_router

tracer = Tracer()
logger = Logger()

X_ORIGIN_VERIFY_SECRET_ARN = os.environ.get("X_ORIGIN_VERIFY_SECRET_ARN")
# Set to "false" to allow direct API Gateway access without CloudFront origin verification
REQUIRE_ORIGIN_VERIFY = os.environ.get("REQUIRE_ORIGIN_VERIFY", "true").lower() == "true"


def get_origin_verify_header_value() -> Optional[str]:
    """
    Retrieve the origin verification header value from Secrets Manager.
    
    Returns:
        The header value string, or None if retrieval fails.
    """
    if not X_ORIGIN_VERIFY_SECRET_ARN:
        logger.error("X_ORIGIN_VERIFY_SECRET_ARN environment variable not set")
        return None
    
    try:
        secret = parameters.get_secret(
            X_ORIGIN_VERIFY_SECRET_ARN, transform="json", max_age=60
        )
        if not isinstance(secret, dict) or "headerValue" not in secret:
            logger.error("Secret does not contain expected 'headerValue' key")
            return None
        return secret["headerValue"]
    except Exception as e:
        logger.error(f"Failed to retrieve origin verify secret: {e}")
        return None


class CustomEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, decimal.Decimal):
            if "." in str(obj):
                return float(obj)
            return int(obj)

        if isinstance(obj, uuid.UUID):
            return str(obj)

        return super(CustomEncoder, self).default(obj)


COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID")
COGNITO_APP_CLIENT_ID = os.environ.get("COGNITO_APP_CLIENT_ID")
COGNITO_REGION = os.environ.get("COGNITO_REGION")

JWKS_URL = (
    f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    if COGNITO_REGION and COGNITO_USER_POOL_ID
    else None
)

app = APIGatewayRestResolver(
    strip_prefixes=["/v1"],
    serializer=lambda obj: json.dumps(obj, cls=CustomEncoder),
)

app.include_router(sessions_router)
app.include_router(feedback_router)
app.include_router(bot_management_router)


@logger.inject_lambda_context(
    log_event=False, correlation_id_path="requestContext.extendedRequestId"
)
@tracer.capture_lambda_handler
def handler(event: Dict[str, Any], context: LambdaContext) -> Dict[str, Any]:
    """
    Main Lambda handler for the REST API.
    
    If REQUIRE_ORIGIN_VERIFY is enabled (default), validates the X-Origin-Verify header
    to ensure requests come through CloudFront. If disabled, allows direct API Gateway access.
    
    Args:
        event: API Gateway event containing request details
        context: Lambda context object
        
    Returns:
        API Gateway response dict with statusCode and body
    """
    # Append TLS metadata from API Gateway identity context to structured logs
    identity = event.get("requestContext", {}).get("identity", {})
    tls_version = identity.get("tlsVersion", "unknown")
    cipher_suite = identity.get("cipherSuite", "unknown")
    logger.append_keys(tlsVersion=tls_version, cipherSuite=cipher_suite)
    logger.info("Processing request")

    # Skip origin verification if disabled (for direct API Gateway access)
    if not REQUIRE_ORIGIN_VERIFY:
        logger.info("Origin verification disabled, allowing direct API Gateway access")
        return app.resolve(event, context)
    
    origin_verify_header_value = get_origin_verify_header_value()
    if origin_verify_header_value is None:
        logger.error("Could not retrieve origin verify header value")
        return {"statusCode": 500, "body": json.dumps({"error": "Internal configuration error"})}
    
    # Safely get the X-Origin-Verify header (may not exist if request bypasses CloudFront)
    headers = event.get("headers") or {}
    request_origin_header = headers.get("X-Origin-Verify")
    
    if request_origin_header == origin_verify_header_value:
        return app.resolve(event, context)

    return {"statusCode": 403, "body": json.dumps({"error": "Forbidden"})}

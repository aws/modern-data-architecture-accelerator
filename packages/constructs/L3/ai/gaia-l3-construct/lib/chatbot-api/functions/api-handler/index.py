import json
import genai_core.types
import genai_core.parameters
import genai_core.utils.json
from pydantic import ValidationError
from botocore.exceptions import ClientError
import jwt
from jwt import PyJWKClient
from jwt.exceptions import InvalidTokenError
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.logging import correlation_paths
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.event_handler.api_gateway import Response
from aws_lambda_powertools.event_handler import (
    APIGatewayRestResolver,
    CORSConfig,
    content_types,
)
from routes.health import router as health_router
from routes.rag import router as rag_router
from routes.embeddings import router as embeddings_router
from routes.cross_encoders import router as cross_encoders_router
from routes.models import router as models_router
from routes.workspaces import router as workspaces_router
from routes.sessions import router as sessions_router
from routes.semantic_search import router as semantic_search_router
from routes.documents import router as documents_router
from routes.kendra import router as kendra_router
from routes.flows import router as flows_router
from routes.agents import router as agents_router
from routes.bedrock_kb import router as bedrock_kb_router

import os

tracer = Tracer()
logger = Logger()

COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID", None)
COGNITO_APP_CLIENT_ID = os.environ.get("COGNITO_APP_CLIENT_ID", None)
COGNITO_REGION = os.environ.get("COGNITO_REGION", "ca-central-1")

JWKS_URL = f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}/.well-known/jwks.json"

cors_config = CORSConfig(
    allow_origin=genai_core.parameters.CORS_ALLOWED_ORIGINS,
    max_age=genai_core.parameters.CORS_MAX_AGE,
)
app = APIGatewayRestResolver(
    cors=cors_config,
    strip_prefixes=["/v1"],
    serializer=lambda obj: json.dumps(obj, cls=genai_core.utils.json.CustomEncoder),
)

app.include_router(health_router)
app.include_router(rag_router)
app.include_router(embeddings_router)
app.include_router(cross_encoders_router)
app.include_router(models_router)
app.include_router(workspaces_router)
app.include_router(sessions_router)
app.include_router(semantic_search_router)
app.include_router(documents_router)
app.include_router(kendra_router)
app.include_router(flows_router)
app.include_router(agents_router)
app.include_router(bedrock_kb_router)


@app.exception_handler(genai_core.types.CommonError)
def handle_value_error(e: genai_core.types.CommonError):
    logger.exception(e)

    return Response(
        status_code=200,
        content_type=content_types.APPLICATION_JSON,
        body=json.dumps(
            {"error": True, "message": str(e)}, cls=genai_core.utils.json.CustomEncoder
        ),
    )


@app.exception_handler(ClientError)
def handle_value_error(e: ClientError):
    logger.exception(e)

    return Response(
        status_code=200,
        content_type=content_types.APPLICATION_JSON,
        body=json.dumps(
            {"error": True, "message": str(e)},
            cls=genai_core.utils.json.CustomEncoder,
        ),
    )


@app.exception_handler(ValidationError)
def handle_value_error(e: ValidationError):
    logger.exception(e)

    error_message = ""
    for error in e.errors():
        if error["type"] == "value_error":
            error_message += f"Invalid value for {error['loc'][0]}: {error['msg']}\n"
        else:
            error_message += f"Invalid {error['loc'][0]}: {error['msg']}\n"

    return Response(
        status_code=400,
        content_type=content_types.APPLICATION_JSON,
        body=json.dumps(
            {"error": True, "message": error_message},
            cls=genai_core.utils.json.CustomEncoder,
        ),
    )


@logger.inject_lambda_context(
    log_event=False, correlation_id_path=correlation_paths.API_GATEWAY_REST
)
@tracer.capture_lambda_handler
def handler(event: dict, context: LambdaContext) -> dict:
    origin_verify_header_value = genai_core.parameters.get_origin_verify_header_value()
    if event["headers"]["X-Origin-Verify"] == origin_verify_header_value:
        token = event["headers"].get("Authorization")
        if not token:
            return {"statusCode": 401, "body": "Unauthorized"}
        token = token.replace("Bearer ", "")
        try:
            jwks_client = PyJWKClient(JWKS_URL)
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256"],
                audience=COGNITO_APP_CLIENT_ID,
                issuer=f"https://cognito-idp.{COGNITO_REGION}.amazonaws.com/{COGNITO_USER_POOL_ID}",
            )
            return app.resolve(event, context)
        except InvalidTokenError:
            return {"statusCode": 401, "body": "Unauthorized"}

    return {"statusCode": 403, "body": "Forbidden"}

import os
import json
import uuid
from datetime import datetime
from genai_core.registry import registry
from aws_lambda_powertools import Logger, Tracer, Metrics
from aws_lambda_powertools.utilities import parameters
from aws_lambda_powertools.utilities.batch import BatchProcessor, EventType
from aws_lambda_powertools.utilities.batch.exceptions import BatchProcessingError
from aws_lambda_powertools.utilities.data_classes.sqs_event import SQSRecord
from aws_lambda_powertools.utilities.typing import LambdaContext

# DO NO DELETE: The import of adapters is what registers models that can be used based on config
import adapters
from adapters.agent.agent import invoke_agent_flow
from genai_core.utils.websocket import send_to_client
from genai_core.types import ChatbotAction, ChatbotMode

processor = BatchProcessor(event_type=EventType.SQS)
tracer = Tracer()
logger = Logger()
metrics = Metrics()

AWS_REGION = os.environ["AWS_REGION"]
API_KEYS_SECRETS_ARN = os.environ["API_KEYS_SECRETS_ARN"]

sequence_number = 0


def on_llm_new_token(
    connection_id, user_id, session_id, reply_to, self, token, run_id, chunk, parent_run_id, *args, **kwargs
):
    if isinstance(token, list):
        # When using the newer Chat objects from Langchain.
        # Token is not a string
        text = ""
        for t in token:
            if "text" in t:
                text = text + t.get("text")
    else:
        text = token
    if text is None or len(text) == 0:
        return
    global sequence_number
    sequence_number += 1
    run_id = str(run_id)

    send_to_client(
        {
            "type": "text",
            "action": ChatbotAction.LLM_NEW_TOKEN.value,
            "connectionId": connection_id,
            "userId": user_id,
            "timestamp": str(int(round(datetime.now().timestamp()))),
            "data": {
                "sessionId": session_id,
                "token": {
                    "runId": run_id,
                    "sequenceNumber": sequence_number,
                    "value": text,
                },
            },
        },
        topic_arn=reply_to,
    )

def handle_heartbeat(record):
    user_id = record["userId"]
    session_id = record["data"]["sessionId"]

    send_to_client(
        {
            "type": "text",
            "action": ChatbotAction.HEARTBEAT.value,
            "timestamp": str(int(round(datetime.now().timestamp()))),
            "userId": user_id,
            "data": {
                "sessionId": session_id,
            },
        }
    )


def handle_run(record):
    connection_id = record["connectionId"]
    user_id = record["userId"]
    data = record["data"]
    mode = data["mode"]
    prompt = data["text"]

    session_id = data.get("sessionId")
    reply_to = data.get("replyTo", None)

    if not session_id:
        session_id = str(uuid.uuid4())

    if mode == ChatbotMode.AGENT.value:
        agent_id = data.get("agentId", None)
        alias_id = data.get("agentAliasId", None)
        response = invoke_agent_flow(agent_id, alias_id, session_id, user_id, prompt)
    else:
        workspace_id = data.get("workspaceId", None)
        provider = data.get("provider", "")
        model_id = data.get("modelName", "")
        adapter = registry.get_adapter(f"{provider}.{model_id}")

        adapter.on_llm_new_token = lambda *args, **kwargs: on_llm_new_token(
            connection_id, user_id, session_id, reply_to, *args, **kwargs
        )

        model = adapter(
            model_id=model_id,
            mode=mode,
            session_id=session_id,
            user_id=user_id,
            model_kwargs=data.get("modelKwargs", {}),
        )

        response = model.run(
            prompt=prompt,
            workspace_id=workspace_id,
        )

    send_to_client(
        {
            "type": "text",
            "action": ChatbotAction.FINAL_RESPONSE.value,
            "connectionId": connection_id,
            "timestamp": str(int(round(datetime.now().timestamp()))),
            "userId": user_id,
            "data": response,
        },
        topic_arn=reply_to,
    )


@tracer.capture_method
def record_handler(record: SQSRecord):
    payload: str = record.body
    message: dict = json.loads(payload)
    detail: dict = json.loads(message["Message"])
    logger.info(detail)

    if detail["action"] == ChatbotAction.RUN.value:
        handle_run(detail)
    elif detail["action"] == ChatbotAction.HEARTBEAT.value:
        handle_heartbeat(detail)


def handle_failed_records(records):
    for triplet in records:
        status, error, record = triplet
        payload: str = record.body
        message: dict = json.loads(payload)
        detail: dict = json.loads(message["Message"])
        logger.info(detail)
        connection_id = detail["connectionId"]
        user_id = detail["userId"]
        data = detail.get("data", {})
        session_id = data.get("sessionId", "")
        reply_to = data.get("replyTo", None)

        send_to_client(
            {
                "type": "text",
                "action": "error",
                "direction": "OUT",
                "connectionId": connection_id,
                "userId": user_id,
                "timestamp": str(int(round(datetime.now().timestamp()))),
                "data": {
                    "sessionId": session_id,
                    "content": str(error),
                    "type": "text",
                },
            },
            topic_arn=reply_to,
        )


@logger.inject_lambda_context(log_event=False)
@tracer.capture_lambda_handler
@metrics.log_metrics
def handler(event, context: LambdaContext):
    logger.info(f"received event: {json.dumps(event)}")
    batch = event["Records"]

    api_keys = parameters.get_secret(API_KEYS_SECRETS_ARN, transform="json")
    for key in api_keys:
        os.environ[key] = api_keys[key]

    try:
        with processor(records=batch, handler=record_handler):
            processed_messages = processor.process()
    except BatchProcessingError as e:
        logger.error(e)

    logger.info(processed_messages)
    handle_failed_records(
        message for message in processed_messages if message[0] == "fail"
    )

    return processor.response()

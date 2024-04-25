import genai_core.parameters
import genai_core.kendra
from pydantic import BaseModel
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router

tracer = Tracer()
router = Router()
logger = Logger()


class KendraDataSynchRequest(BaseModel):
    workspaceId: str


@router.get("/rag/engines")
@tracer.capture_method
def engines():
    config = genai_core.parameters.get_config()

    engines = config["rag"]["engines"]
    ret_value = [
        {
            "id": "aurora",
            "name": "Amazon Aurora",
            "enabled": engines.get("aurora") is not None,
        },
        {
            "id": "opensearch",
            "name": "Amazon OpenSearch",
            "enabled": engines.get("opensearch") is not None,
        },
        {
            "id": "kendra",
            "name": "Amazon Kendra",
            "enabled": engines.get("kendra") is not None,
        },
    ]

    return {"ok": True, "data": ret_value}

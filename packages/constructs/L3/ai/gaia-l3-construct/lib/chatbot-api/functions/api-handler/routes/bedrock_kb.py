from enum import Enum
from typing import Optional
from pydantic import BaseModel
import genai_core.parameters
import genai_core.bedrock_kb
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router

tracer = Tracer()
router = Router()
logger = Logger()

class IngestionActionType(str, Enum):
    start = "start"
    stop = "stop"

class KnowledgeBaseDataSourceIngestionRequest(BaseModel):
    kb_id: str
    data_source_id: str
    ingestion_job_id: Optional[str] = None
    action: IngestionActionType

@router.post("/rag/engines/knowledge-base/datasource/ingestion")
@tracer.capture_method
def stop_or_start_bedrock_kb_datasource_ingestion_job():
    data: dict = router.current_event.json_body
    request = KnowledgeBaseDataSourceIngestionRequest(**data)
    ingestion_jobs = genai_core.bedrock_kb.list_ingestion_jobs(request.kb_id, request.data_source_id)
    if request.action == IngestionActionType.start:
        if ingestion_jobs:
            for job in ingestion_jobs:
                if job["status"] in ["STARTING", "IN_PROGRESS"]:
                    return {"ok": False, "data": None, "message": "Ingestion job already started"}
        job_details = genai_core.bedrock_kb.start_ingestion_job(request.kb_id, request.data_source_id)
    else:
        for job in ingestion_jobs:
            if job["status"] in ["STOPPING", "STOPPED"]:
                return {"ok": False, "data": None, "message": "Ingestion job already stopped"}
        job_details = genai_core.bedrock_kb.stop_ingestion_job(request.kb_id, request.data_source_id, request.ingestion_job_id)

    if not job_details:
        return {"ok": False, "data": None}
    return {"ok": True, "data": job_details}


@router.get("/rag/engines/knowledge-base/<kb_id>/datasource/<data_source_id>/ingestion")
@tracer.capture_method
def list_bedrock_kb_datasource_ingestion_job(kb_id, data_source_id):
    ingestion_jobs = genai_core.bedrock_kb.list_ingestion_jobs(kb_id, data_source_id)
    if not ingestion_jobs:
        return {"ok": False, "data": None}
    return {"ok": True, "data": ingestion_jobs}


@router.get("/rag/engines/knowledge-base")
@tracer.capture_method
def list_bedrock_kbs():
    knowledge_bases = genai_core.bedrock_kb.list_bedrock_kbs()

    if not knowledge_bases:
        return {"ok": False, "data": None}
    return {"ok": True, "data": knowledge_bases}


@router.get("/rag/engines/knowledge-base/<kb_id>/details")
@tracer.capture_method
def get_bedrock_kb(kb_id):
    kb = genai_core.bedrock_kb.get_knowledge_base(kb_id)
    if not kb:
        return {"ok": False, "data": None}
    return {"ok": True, "data": kb}
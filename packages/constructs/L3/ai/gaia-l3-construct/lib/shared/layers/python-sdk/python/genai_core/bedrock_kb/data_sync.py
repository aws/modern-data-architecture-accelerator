from genai_core.clients import get_bedrock_client

def list_ingestion_jobs(kb_id: str, data_source_id: str):
    default_bedrock_client = get_bedrock_client('bedrock-agent')
    response = default_bedrock_client.list_ingestion_jobs(
        knowledgeBaseId=kb_id,
        dataSourceId=data_source_id,
        sortBy={
            'attribute': 'STARTED_AT',
            'order': 'DESCENDING'
        }
    )
    ingestion_jobs = response.get("ingestionJobSummaries", [])
    return [
        {
            **job,
            "startedAt":  job["startedAt"].isoformat(),
            "updatedAt": job["updatedAt"].isoformat(),
        }
        for job in ingestion_jobs
    ]


def start_ingestion_job(kb_id: str, data_source_id: str):
    default_bedrock_client = get_bedrock_client('bedrock-agent')
    response = default_bedrock_client.start_ingestion_job(
        knowledgeBaseId=kb_id,
        dataSourceId=data_source_id,
    )
    ingestion_job = response.get("ingestionJob", {})

    return {
        **ingestion_job,
        "startedAt":  ingestion_job["startedAt"].isoformat(),
        "updatedAt": ingestion_job["updatedAt"].isoformat(),
    }


def stop_ingestion_job(kb_id: str, data_source_id: str, ingestion_job_id: str):
    default_bedrock_client = get_bedrock_client('bedrock-agent')
    response = default_bedrock_client.stop_ingestion_job(
        knowledgeBaseId=kb_id,
        dataSourceId=data_source_id,
        ingestionJobId=ingestion_job_id,
    )
    ingestion_job = response.get("ingestionJob", {})

    return {
        **ingestion_job,
        "startedAt":  ingestion_job["startedAt"].isoformat(),
        "updatedAt": ingestion_job["updatedAt"].isoformat(),
    }
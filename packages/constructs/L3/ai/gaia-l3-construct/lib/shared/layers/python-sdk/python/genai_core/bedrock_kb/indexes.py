import genai_core.parameters
from genai_core.clients import get_bedrock_client
from botocore.exceptions import ClientError

def get_knowledge_base(knowledge_base_id: str):
    default_bedrock_client = get_bedrock_client('bedrock-agent')
    try:
        response = default_bedrock_client.get_knowledge_base(
            knowledgeBaseId=knowledge_base_id
        )
        details = response.get("knowledgeBase")
        if not details:
            return None

        data_sources = default_bedrock_client.list_data_sources(
            knowledgeBaseId=knowledge_base_id
        )

        data_sources_details = data_sources.get("dataSourceSummaries", [])
        return {
            "id": details.get("knowledgeBaseId"),
            "name": details.get("name"),
            "description":  details.get("description"),
            "status": details.get("status"),
            "createdAt": details.get("createdAt").isoformat(),
            "updatedAt": details.get("updatedAt").isoformat(),
            "dataSources": [{**entry, "updatedAt": entry.get("updatedAt").isoformat() } for entry in data_sources_details]
        }
    except ClientError as e:
        print(e)
        return None

def list_bedrock_kbs():
    config = genai_core.parameters.get_config()
    kb_config = config.get("rag", {}).get("engines", {}).get("knowledgeBase", {})
    external = kb_config.get("external", {})

    ret_value = []
    if external:
        for kb in external:
            current_id = kb.get("knowledgeBaseId", "")
            current_name = kb.get("name", "")

            if not current_id or not current_name:
                continue

            ret_value.append(
                {
                    "id": current_id,
                    "name": current_name,
                    "external": True,
                }
            )
    default_bedrock_client = get_bedrock_client('bedrock-agent')
    response = default_bedrock_client.list_knowledge_bases()
    for kb in response["knowledgeBaseSummaries"]:
        ret_value.append(
            {
                "id": kb["knowledgeBaseId"],
                "name": kb["name"],
                "external": False,
            }
        )

    return ret_value
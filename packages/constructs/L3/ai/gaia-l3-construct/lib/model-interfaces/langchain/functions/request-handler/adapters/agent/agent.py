import boto3
import os
from langchain.schema.messages import BaseMessage
from genai_core.langchain import DynamoDBChatMessageHistory
from botocore import config

solution_identifier = os.getenv("USER_AGENT_STRING")
user_agent_extra_param = { "user_agent_extra": solution_identifier }
config = config.Config(**user_agent_extra_param)

client = boto3.client('bedrock-agent-runtime', region_name="us-east-1", config=config)

def get_chat_history(session_id, user_id):
    return DynamoDBChatMessageHistory(
        table_name=os.environ.get("SESSIONS_TABLE_NAME", ""),
        session_id=session_id,
        user_id=user_id,
    )

def invoke_agent_flow(agent_id, alias_id, session_id, user_id, user_input):
    chat_history = get_chat_history(session_id, user_id)
    chat_history.add_message(BaseMessage(type="human", content=user_input))
    response = client.invoke_agent(
        agentId=agent_id,
        agentAliasId=alias_id,
        sessionId=session_id,
        inputText=user_input
    )

    response_text = ""
    sources = []
    for event in response["completion"]:
        if "chunk" in event:
            chunk = event["chunk"]
            response_text += chunk["bytes"].decode("utf-8")
            citations = chunk.get('attribution', {}).get('citations', [])
            for citation in citations:
                retrieved_references = citation['retrievedReferences']
                sources.extend({
                   "page_content": reference['content']['text'],
                   "metadata": {
                     "path": reference['location']['s3Location']['uri'],
                     "document_type": reference['location']['type']
                }} for reference in retrieved_references)
    chat_history.add_message(BaseMessage(type="ai", content=response_text))

    metadata = {
        "agentId": agent_id,
        "agentAliasId": alias_id,
        "mode": "agent",
        "sessionId": session_id,
        "userId": user_id,
        "documents": sources
    }

    chat_history.add_metadata(metadata)

    return {
        "sessionId": session_id,
        "type": "text",
        "content": response_text,
        "metadata": metadata,
    }
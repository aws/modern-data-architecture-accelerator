import genai_core.agents
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router

tracer = Tracer()
router = Router()
logger = Logger()


@router.get("/agents")
@tracer.capture_method
def agents():
    agents = genai_core.agents.list_agents()

    return {"ok": True, "data": [
        _convert_to_agent_response(agent) for agent in agents
    ]}



def _convert_to_agent_response(agent):
    return {
        "id": agent["id"],
        "name": agent["name"],
        "aliasId":  agent["alias_id"],
    }
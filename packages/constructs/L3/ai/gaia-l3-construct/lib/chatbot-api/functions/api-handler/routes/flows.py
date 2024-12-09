import genai_core.flows
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router

tracer = Tracer()
router = Router()
logger = Logger()


@router.get("/flows")
@tracer.capture_method
def flows():
    available_flows = genai_core.flows.list_flows()

    return {"ok": True, "data": available_flows}
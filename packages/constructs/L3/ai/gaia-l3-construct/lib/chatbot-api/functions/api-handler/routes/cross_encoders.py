import genai_core.types
import genai_core.parameters
import genai_core.cross_encoder
from typing import List
from pydantic import BaseModel
from enum import Enum
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.event_handler.api_gateway import Router

tracer = Tracer()
router = Router()
logger = Logger()


class CrossEncoderModelProvider(str, Enum):
    sagemaker = "sagemaker"


class CrossEncoderModel(str, Enum):
    ms_marco_l12_v2 = "cross-encoder/ms-marco-MiniLM-L-12-v2"


class CrossEncodersRequest(BaseModel):
    provider: CrossEncoderModelProvider
    model: CrossEncoderModel
    input: str
    passages: List[str]


@router.get("/cross-encoders/models")
@tracer.capture_method
def models():
    config = genai_core.parameters.get_config()
    models = config["rag"]["crossEncoderModels"]

    return {"ok": True, "data": models}


@router.post("/cross-encoders")
@tracer.capture_method
def cross_encoders():
    config = genai_core.parameters.get_config()

    data: dict = router.current_event.json_body
    request = CrossEncodersRequest(**data)
    selected_model = genai_core.cross_encoder.get_cross_encoder_model(
        request.provider, request.model
    )

    if selected_model is None:
        raise genai_core.types.CommonError("Model not found")

    ret_value = genai_core.cross_encoder.rank_passages(
        selected_model, request.input, request.passages
    )
    return {"ok": True, "data": ret_value}

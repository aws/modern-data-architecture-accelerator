from enum import Enum
from typing import Optional

from pydantic import BaseModel


class CommonError(Exception):
    pass


class EmbeddingsModel(BaseModel):
    provider: str
    name: str
    default: Optional[bool] = None
    dimensions: int


class CrossEncoderModel(BaseModel):
    provider: str
    name: str
    default: Optional[bool] = None


class Agent(BaseModel):
    id: str
    alias_id: str
    name: str


class Workspace(BaseModel):
    id: str
    name: str
    engine: str


class PromptExample(BaseModel):
    question: str
    answer: str


class Provider(Enum):
    BEDROCK = "bedrock"
    OPENAI = "openai"
    SAGEMAKER = "sagemaker"
    AMAZON = "amazon"


class Modality(Enum):
    TEXT = "TEXT"
    IMAGE = "IMAGE"
    EMBEDDING = "EMBEDDING"


class InferenceType(Enum):
    ON_DEMAND = "ON_DEMAND"
    PROVISIONED = "PROVISIONED"


class ModelStatus(Enum):
    ACTIVE = "ACTIVE"
    LEGACY = "LEGACY"


class ModelInterface(Enum):
    LANGCHIAN = "langchain"
    IDEFICS = "idefics"


class Direction(Enum):
    IN = "IN"
    OUT = "OUT"


class ChatbotMode(Enum):
    CHAIN = "chain"
    AGENT = "agent"

class ChatbotAction(Enum):
    HEARTBEAT = "heartbeat"
    RUN = "run"
    LLM_NEW_TOKEN = "llm_new_token"
    FINAL_RESPONSE = "final_response"


class ChatbotMessageType(Enum):
    Human = "human"
    AI = "ai"

class Task(Enum):
    STORE = "store"
    RETRIEVE = "retrieve"
    SEARCH_QUERY = "search_query"
    SEARCH_DOCUMENT = "search_document"


class EmbeddingModelProviderLabels(str, Enum):
    sagemaker = "sagemaker"
    bedrock = "bedrock"


class EmbeddingModelLabels(str, Enum):
    titan = "amazon.titan-embed-text-v2:0"
    in_float = "intfloat/multilingual-e5-large"


class CrossEncodersProviderLabels(str, Enum):
    sagemaker = "sagemaker"
    none = ""


class CrossEncodersModelLabels(str, Enum):
    ms_marco = "cross-encoder/ms-marco-MiniLM-L-12-v2"
    none = ""

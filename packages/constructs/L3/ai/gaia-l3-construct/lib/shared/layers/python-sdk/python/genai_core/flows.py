from genai_core.types import ChatbotMode


def list_flows():
    return [e.value for e in ChatbotMode]
﻿import os
from botocore.exceptions import ClientError
from aws_lambda_powertools import Logger, Metrics
from aws_lambda_powertools.metrics import MetricUnit
from langchain.callbacks.base import BaseCallbackHandler
from langchain.chains import ConversationalRetrievalChain, ConversationChain
from langchain.chains.retrieval import create_retrieval_chain
from langchain.chains.history_aware_retriever import create_history_aware_retriever
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.memory import ConversationBufferMemory
from langchain.prompts.prompt import PromptTemplate
from langchain.chains.conversational_retrieval.prompts import (
    QA_PROMPT,
    CONDENSE_QUESTION_PROMPT
)
from typing import Dict, List, Any, Optional

from genai_core.langchain import WorkspaceRetriever, DynamoDBChatMessageHistory
from genai_core.types import ChatbotMode

from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.outputs import LLMResult, ChatGeneration
from langchain_core.messages.ai import AIMessage, AIMessageChunk
from langchain_core.messages.human import HumanMessage
from langchain_aws import ChatBedrockConverse

logger = Logger()


class LLMStartHandler(BaseCallbackHandler):
    prompts = []
    usage = None

    # Langchain callbacks
    # https://python.langchain.com/v0.2/docs/concepts/#callbacks
    def on_llm_start(
        self, serialized: Dict[str, Any], prompts: List[str], **kwargs: Any
    ) -> Any:
        self.prompts.append(prompts)

    def on_llm_end(
        self, response: LLMResult, *, run_id, parent_run_id, **kwargs: Any
    ) -> Any:
        generation = response.generations[0][0]  # only one llm request
        if (
            generation is not None
            and isinstance(generation, ChatGeneration)
            and isinstance(generation.message, AIMessage)
        ):
            # In case of rag there could be 2 llm calls.
            if self.usage is None:
                self.usage = {
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "total_tokens": 0,
                }
            self.usage = {
                "input_tokens": self.usage.get("input_tokens", 0)
                + generation.message.usage_metadata.get("input_tokens", 0),
                "output_tokens": self.usage.get("output_tokens", 0)
                + generation.message.usage_metadata.get("output_tokens", 0),
                "total_tokens": self.usage.get("total_tokens", 0)
                + generation.message.usage_metadata.get("total_tokens", 0),
            }

class ModelAdapter:
    def __init__(
        self,
        session_id,
        user_id,
        mode=ChatbotMode.CHAIN.value,
        disable_streaming=False,
        model_kwargs={},
        metrics: Metrics = Metrics()
    ):
        self.model_id: str
        self.session_id = session_id
        self.user_id = user_id
        self._mode = mode
        self.model_kwargs = model_kwargs
        self.disable_streaming = disable_streaming

        self.callback_handler = LLMStartHandler()
        self.__bind_callbacks()

        self.chat_history = self.get_chat_history()
        self.llm = self.get_llm(model_kwargs)
        self.metrics = metrics

    def __bind_callbacks(self):
        callback_methods = [method for method in dir(self) if method.startswith("on_")]
        valid_callback_names = [
            attr for attr in dir(self.callback_handler) if attr.startswith("on_")
        ]

        for method in callback_methods:
            if method in valid_callback_names:
                setattr(self.callback_handler, method, getattr(self, method))

    def get_llm(self, model_kwargs={}):
        raise ValueError("llm must be implemented")

    def get_embeddings_model(self, embeddings):
        raise ValueError("embeddings must be implemented")

    def get_chat_history(self):
        return DynamoDBChatMessageHistory(
            table_name=os.environ["SESSIONS_TABLE_NAME"],
            session_id=self.session_id,
            user_id=self.user_id,
        )

    def get_memory(self, output_key=None):
        return ConversationBufferMemory(
            memory_key="chat_history",
            chat_memory=self.chat_history,
            return_messages=True,
            output_key=output_key,
        )

    def get_prompt(self):
        template = """The following is a friendly conversation between a human and an AI. If the AI does not know the answer to a question, it truthfully says it does not know.

        Current conversation:
        {chat_history}

        Question: {input}"""  # noqa: E501

        return PromptTemplate.from_template(template)

    def get_condense_question_prompt(self):
        return CONDENSE_QUESTION_PROMPT

    def get_qa_prompt(self):
        return QA_PROMPT

    def _get_chain_config(
        self,
        run_name: Optional[str] = None,
        additional_kwargs: Dict[str, Any] = {},
    ) -> Dict[str, Any]:
        try:
            config: Dict[str, Any] = {
                "configurable": {
                    "session_id": self.session_id,
                    "user_id": self.user_id,
                    "run_name": run_name,
                },
            }
            config["configurable"].update(additional_kwargs)

            return config
        except Exception as e:
            logger.exception(f"Failed to get chain config: ")
            raise e

    def _log_client_error(self, error: ClientError, operation: str):
        error_code = error.response["Error"]["Code"]
        self.metrics.add_metric(
            name=f"ClientError_{error_code}",
            unit=MetricUnit.Count,
            value=1,
        )
        self.metrics.add_metric(
            name=f"ClientError_{operation}",
            unit=MetricUnit.Count,
            value=1,
        )
        logger.exception(f"ClientError in {operation}: {error_code} : ")

    def run_with_chain_v2(self, user_prompt, workspace_id=None):
        if not self.llm:
            raise ValueError("llm must be set")

        self.callback_handler.prompts = []
        documents = []
        retriever = None

        if workspace_id:
            retriever = WorkspaceRetriever(workspace_id=workspace_id)
            # Only stream the last llm call (otherwise the internal
            # llm response will be visible)
            llm_without_streaming = self.get_llm({"streaming": False})
            history_aware_retriever = create_history_aware_retriever(
                llm_without_streaming,
                retriever,
                self.get_condense_question_prompt(),
            )
            question_answer_chain = create_stuff_documents_chain(
                self.llm,
                self.get_qa_prompt(),
            )
            chain = create_retrieval_chain(
                history_aware_retriever, question_answer_chain
            )
        else:
            chain = self.get_prompt() | self.llm

        conversation = RunnableWithMessageHistory(
            chain,
            lambda session_id: self.chat_history,
            history_messages_key="chat_history",
            input_messages_key="input",
            output_messages_key="output",
        )

        config = {"configurable": {"session_id": self.session_id}}
        try:
            if not self.disable_streaming and self.model_kwargs.get("streaming", False):
                answer = ""
                for chunk in conversation.stream(
                    input={"input": user_prompt}, config=config
                ):
                    logger.debug("chunk", chunk=chunk)
                    if "answer" in chunk:
                        answer = answer + chunk["answer"]
                    elif isinstance(chunk, AIMessageChunk):
                        for c in chunk.content:
                            if "text" in c:
                                answer = answer + c.get("text")
            else:
                response = conversation.invoke(
                    input={"input": user_prompt}, config=config
                )
                if "answer" in response:
                    answer = response.get("answer")  # RAG flow
                else:
                    answer = response.content
        except Exception as e:
            logger.exception(e)
            raise e

        if workspace_id:
            # In the RAG flow, the history is not updated automatically
            self.chat_history.add_message(HumanMessage(user_prompt))
            self.chat_history.add_message(AIMessage(answer))
        if retriever is not None:
            documents = [
                {
                    "page_content": doc.page_content,
                    "metadata": doc.metadata,
                }
                for doc in retriever.get_last_search_documents()
            ]

        metadata = {
            "modelId": self.model_id,
            "modelKwargs": self.model_kwargs,
            "mode": self._mode,
            "sessionId": self.session_id,
            "userId": self.user_id,
            "documents": documents,
            "prompts": self.callback_handler.prompts,
            "usage": self.callback_handler.usage,
        }

        self.chat_history.add_metadata(metadata)

        if (
            self.callback_handler.usage is not None
            and "total_tokens" in self.callback_handler.usage
        ):
            # Used by Cloudwatch filters to generate a metric of token usage.
            logger.info(
                "Usage Metric",
                # Each unique value of model id will create a
                # new cloudwatch metric (each one has a cost)
                model=self.model_id,
                metric_type="token_usage",
                value=self.callback_handler.usage.get("total_tokens"),
            )

        return {
            "sessionId": self.session_id,
            "type": "text",
            "content": answer,
            "metadata": metadata,
        }

    def run_with_chain(self, user_prompt, workspace_id=None):
        if not self.llm:
            raise ValueError("llm must be set")

        if workspace_id:
            workspace_retriever = WorkspaceRetriever(workspace_id=workspace_id)
            workspace_specific_ceondense_question_prompt = \
                workspace_retriever.get_workspace_specific_condense_question_prompt_template(self.model_id)
            workspace_specific_qa_prompt = workspace_retriever.get_workspace_specific_qa_prompt_template(self.model_id)
            conversation = ConversationalRetrievalChain.from_llm(
                self.llm,
                workspace_retriever,
                condense_question_prompt=self.get_condense_question_prompt() if workspace_specific_ceondense_question_prompt is None \
                    else workspace_specific_ceondense_question_prompt,
                combine_docs_chain_kwargs={"prompt": self.get_qa_prompt() if workspace_specific_qa_prompt is None \
                    else workspace_specific_qa_prompt},
                return_source_documents=True,
                memory=self.get_memory(output_key="answer"),
                verbose=True,
                callbacks=[self.callback_handler],
            )
            result = conversation({"question": user_prompt})
            logger.info(f"source documents: {result['source_documents']}")
            documents = [
                {
                    "page_content": doc.page_content,
                    "metadata": doc.metadata,
                }
                for doc in result["source_documents"]
            ]

            metadata = {
                "modelId": self.model_id,
                "modelKwargs": self.model_kwargs,
                "mode": self._mode,
                "sessionId": self.session_id,
                "userId": self.user_id,
                "workspaceId": workspace_id,
                "documents": documents,
            }

            self.chat_history.add_metadata(metadata)

            return {
                "sessionId": self.session_id,
                "type": "text",
                "content": result["answer"],
                "metadata": metadata,
            }

        conversation = ConversationChain(
            llm=self.llm,
            prompt=self.get_prompt(),
            memory=self.get_memory(),
            verbose=True,
        )
        answer = conversation.predict(
            input=user_prompt, callbacks=[self.callback_handler]
        )

        metadata = {
            "modelId": self.model_id,
            "modelKwargs": self.model_kwargs,
            "mode": self._mode,
            "sessionId": self.session_id,
            "userId": self.user_id,
            "documents": [],
        }

        self.chat_history.add_metadata(metadata)

        return {
            "sessionId": self.session_id,
            "type": "text",
            "content": answer,
            "metadata": metadata,
        }


    def run(self, prompt, workspace_id=None, *args, **kwargs):
        logger.debug(f"run with {kwargs}")
        logger.debug(f"workspace_id {workspace_id}")
        logger.debug(f"mode: {self._mode}")
        try:
            self.metrics.add_metric(
                name="TotalRequests", unit=MetricUnit.Count, value=1
            )
            if self._mode == ChatbotMode.CHAIN.value:
                if isinstance(self.llm, ChatBedrockConverse):
                    return self.run_with_chain_v2(prompt, workspace_id)
                else:
                    return self.run_with_chain(prompt, workspace_id)
            raise ValueError(f"unknown mode {self._mode}")
        except Exception as e:
            self.metrics.add_metric(
                name="UnexpectedErrors", unit=MetricUnit.Count, value=1
            )
            logger.exception(f"Error in run method: ")
            metadata = {
                "modelId": self.model_id,
                "modelKwargs": self.model_kwargs,
                "mode": self._mode,
                "sessionId": self.session_id,
                "userId": self.user_id,
                "documents": [],
            }
            return {
                "sessionId": self.session_id,
                "type": "text",
                "content": "My apologies, an Error occurred.",
                "metadata": metadata,
            }

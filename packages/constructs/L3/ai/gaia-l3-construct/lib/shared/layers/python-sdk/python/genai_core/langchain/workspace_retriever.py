import json
from typing import List

from langchain.prompts import PromptTemplate
from langchain.callbacks.manager import CallbackManagerForRetrieverRun
from langchain.schema import BaseRetriever, Document

import genai_core.semantic_search
from genai_core.langchain.prompt_templates import get_model_prompt_template
from genai_core.workspaces import get_workspace


class WorkspaceRetriever(BaseRetriever):
    workspace_id: str

    def _get_relevant_documents(
            self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> List[Document]:
        result = genai_core.semantic_search.semantic_search(
            self.workspace_id, query, limit=3, full_response=False
        )

        return [self._get_document(item) for item in result.get("items", [])]

    @staticmethod
    def _format_quest_and_answer_samples(samples: List[dict]):
        return "\n".join([f"Question {sample.get('question')}\nAnswer {sample.get('answer')}\n" for sample in samples])

    def get_workspace_specific_qa_prompt_template(self, model_id: str):
        workspace_item = get_workspace(self.workspace_id)
        potential_template = workspace_item.get("prompt_template")
        if not potential_template:
            return None
        template_data = json.loads(potential_template)
        if not template_data:
            return None
        bot_name = template_data.get("bot_name")
        instructions = template_data.get("instructions")
        examples = template_data.get("examples", [])
        input_variables = ["question", "chat_history", "context"]
        if bot_name and instructions and examples:
            template = get_model_prompt_template(model_id, 'qa_template_all')
            prompt_template_args = {
                "bot_name": bot_name,
                "instructions": instructions,
                "examples": examples,
                "input_variables": input_variables,
                "partial_variables": {
                    "bot_name": bot_name,
                    "instructions": instructions,
                    "examples": self._format_quest_and_answer_samples(examples)
                },
                "template": template,
            }
            return PromptTemplate(**prompt_template_args)
        elif bot_name and instructions:
            template = get_model_prompt_template(model_id, 'qa_template_instructions_and_name')
            prompt_template_args = {
                "bot_name": bot_name,
                "instructions": instructions,
                "input_variables": input_variables,
                "partial_variables": {"bot_name": bot_name, "instructions": instructions},
                "template": template,
            }
            return PromptTemplate(**prompt_template_args)
        elif instructions and examples:
            template = get_model_prompt_template(model_id, 'qa_template_instructions_and_examples')
            prompt_template_args = {
                "instructions": instructions,
                "examples": examples,
                "input_variables": input_variables,
                "partial_variables": {
                    "instructions": instructions,
                    "examples": self._format_quest_and_answer_samples(examples)
                },
                "template": template,
            }
            return PromptTemplate(**prompt_template_args)
        else:
            template = get_model_prompt_template(model_id, 'qa_template_instructions_only')
            prompt_template_args = {
                "instructions": instructions,
                "input_variables": input_variables,
                "partial_variables": {"instructions": instructions},
                "template": template,
            }
            return PromptTemplate(**prompt_template_args)

    def get_workspace_specific_condense_question_prompt_template(self, model_id: str):
        workspace_item = get_workspace(self.workspace_id)
        potential_template = workspace_item.get("prompt_template")
        if not potential_template:
            return None
        template_data = json.loads(potential_template)
        if not template_data:
            return None
        bot_name = template_data.get("bot_name")
        instructions = template_data.get("instructions")
        examples = template_data.get("examples", [])
        input_variables = ["question", "chat_history", "context"]
        if bot_name and instructions and examples:
            template = get_model_prompt_template(model_id, 'condense_question_all')
            prompt_template_args = {
                "bot_name": bot_name,
                "instructions": instructions,
                "examples": examples,
                "input_variables": input_variables,
                "partial_variables": {
                    "bot_name": bot_name,
                    "instructions": instructions,
                    "examples": self._format_quest_and_answer_samples(examples)
                },
                "template": template,
            }
            return PromptTemplate(**prompt_template_args)
        elif bot_name and instructions:
            template = get_model_prompt_template(model_id, 'condense_question_instructions_and_name')
            prompt_template_args = {
                "bot_name": bot_name,
                "instructions": instructions,
                "input_variables": input_variables,
                "partial_variables": {"bot_name": bot_name, "instructions": instructions},
                "template": template,
            }
            return PromptTemplate(**prompt_template_args)
        elif instructions and examples:
            template = get_model_prompt_template(model_id, 'condense_question_instructions_and_examples')
            prompt_template_args = {
                "instructions": instructions,
                "examples": examples,
                "input_variables": input_variables,
                "partial_variables": {
                    "instructions": instructions,
                    "examples": self._format_quest_and_answer_samples(examples)
                },
                "template": template,
            }
            return PromptTemplate(**prompt_template_args)
        else:
            template = get_model_prompt_template(model_id, 'condense_question_instructions_only')
            prompt_template_args = {
                "instructions": instructions,
                "input_variables": input_variables,
                "partial_variables": {"instructions": instructions},
                "template": template,
            }
            return PromptTemplate(**prompt_template_args)

    def _get_document(self, item):
        content = item["content"]
        content_complement = item.get("content_complement")

        page_content = content
        if content_complement:
            page_content = content_complement

        metadata = {
            "chunk_id": item["chunk_id"],
            "workspace_id": item["workspace_id"],
            "document_id": item["document_id"],
            "document_sub_id": item["document_sub_id"],
            "document_type": item["document_type"],
            "document_sub_type": item["document_sub_type"],
            "path": item["path"],
            "title": item["title"],
            "score": item["score"],
        }

        return Document(page_content=page_content, metadata=metadata)



_CONDENSE_QUESTION_PROMPT_WIH_ALL = """You are an AI assistant bot called {bot_name}.
Given the following instructions, an example of question and how you should answer, conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

Instructions: {instructions}

Examples: 
{examples}

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:"""


_LLAMA_CONDENSE_QUESTION_PROMPT_WITH_ALL = """<<SYS>>
You are an AI assistant bot called {bot_name}.

Given the following instructions, an example of question and how you should answer, conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.
You do not repeat yourself. You avoid bulleted list or emojis.

Instructions: {instructions}

Examples: 
{examples}
<</SYS>>

Chat History:
{chat_history}

Follow Up Input: {question}

Standalone question:[/INST]"""


_MISTRAL_CONDENSE_QUESTION_PROMPT_WITH_ALL = """<s>[INST]
You are an AI assistant bot called {bot_name}.

Given the following instructions, an example of question and how you should answer, conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.
You do not repeat yourself. You avoid bulleted list or emojis.

Instructions: {instructions}

Examples:
{examples}

[/INST]
Chat History:
{chat_history}
</s>
[INST] {question} [/INST]"""

_CONDENSE_QUESTION_PROMPT_INSTRUCTIONS_AND_EXAMPLES = """
Given the following instructions, example of question and how you should answer, conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

Instructions: {instructions}

Examples: 
{examples}

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:"""

_LLAMA_CONDENSE_QUESTION_PROMPT_INSTRUCTIONS_AND_EXAMPLES = """<<SYS>>
Given the following instructions, example of question and how you should answer, conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

Instructions: {instructions}

Examples: 
{examples}
<</SYS>>

Chat History:
{chat_history}

Follow Up Input: {question} 
Standalone question:[/INST]"""

_MISTRAL_CONDENSE_QUESTION_PROMPT_INSTRUCTIONS_AND_EXAMPLES = """<s>[INST]
Given the following instructions, example of question and how you should answer, conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

Instructions: {instructions}

Examples:
{examples}

[/INST]

Chat History:
{chat_history}

</s>

[INST] {question} [/INST]"""

_CONDENSE_QUESTION_PROMPT_WITH_INSTRUCTIONS_AND_NAME = """You are an AI assistant bot called {bot_name}.
Given the following instructions, conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

Instructions: {instructions}

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:"""

_LLAMA_CONDENSE_QUESTION_PROMPT_WITH_INSTRUCTIONS_AND_NAME = """<<SYS>>
You are an AI assistant bot called {bot_name}.

Given the following instructions, conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.
You do not repeat yourself. You avoid bulleted list or emojis.

Instructions: {instructions}
<</SYS>>

Chat History:
{chat_history}


Follow Up Input: {question}
Standalone question:[/INST]"""

_MISTRAL_CONDENSE_QUESTION_PROMPT_WITH_INSTRUCTIONS_AND_NAME = """<s>[INST]
You are an AI assistant bot called {bot_name}.

Given the following instructions, conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.
You do not repeat yourself. You avoid bulleted list or emojis.

Instructions: {instructions}

[/INST]

Chat History:
{chat_history}

</s>

[INST] {question} [/INST]"""


_CONDENSE_QUESTION_PROMPT_WITH_ONLY_INSTRUCTIONS = """
Given the following instructions, conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.

Instructions: {instructions}

Chat History:
{chat_history}
Follow Up Input: {question}
Standalone question:"""

_LLAMA_CONDENSE_QUESTION_PROMPT_WITH_ONLY_INSTRUCTIONS = """<<SYS>>
Given the following instructions, conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.
You do not repeat yourself. You avoid bulleted list or emojis.

Instructions: {instructions}
<</SYS>>

Chat History:
{chat_history}

Follow Up Input: {question}
Standalone question:[/INST]"""

_MISTRAL_CONDENSE_QUESTION_PROMPT_WITH_ONLY_INSTRUCTIONS = """<s>[INST]
Given the following instructions, conversation and a follow up question, rephrase the follow up question to be a standalone question, in its original language.
You do not repeat yourself. You avoid bulleted list or emojis.

Instructions: {instructions}
[/INST]

Chat History:
{chat_history}

</s>[INST] {question} [/INST]"""

_QA_TEMPLATE_WITH_ALL = """You are an AI assistant bot called {bot_name}.

Below you are given instructions, and an example question and how to answer, and the user question.
Instructions: 
{instructions}


Examples:
{examples}

Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.



{context}

Question: {question}
Helpful Answer:"""

_LLAMA_QA_TEMPLATE_WITH_ALL = """<<SYS>>You are an AI assistant bot called {bot_name}.

Below you are given instructions, and an example question and how to answer, and the user question.
Use the following conversation history and pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. You do not repeat yourself. You avoid bulleted list or emojis.

Instructions: 
{instructions}


Examples:
{examples}

Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.
<</SYS>>

{context}

Question: {question}
Helpful Answer:[/INST]"""

_MISTRAL_QA_TEMPLATE_WITH_ALL = """<s>[INST] You are an AI assistant bot called {bot_name}.

Below you are given instructions, and an example question and how to answer, and the user question.
Use the following conversation history and pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. You do not repeat yourself. You avoid bulleted list or emojis.

Instructions:
{instructions}


Examples:
{examples}

Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.
[/INST]

{context}

</s>[INST] {question} [/INST]"""

_QA_TEMPLATE_WITH_INSTRUCTIONS_AND_EXAMPLES = """You are an AI assistant bot with no specific name.

Below you are given instructions, example question and how to answer, and the user question.
Instructions: 
{instructions}


Examples:
{examples}


Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.



{context}

Question: {question}
Helpful Answer:"""


_LLAMA_QA_TEMPLATE_WITH_INSTRUCTIONS_AND_EXAMPLES = """<<SYS>>You are an AI assistant bot with no specific name.

Below you are given instructions, example question and how to answer, and the user question.
Use the following conversation history and pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. You do not repeat yourself. You avoid bulleted list or emojis.

Instructions: 
{instructions}


Examples:
{examples}

Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.
<</SYS>>

{context}

Question: {question}
Helpful Answer:[/INST]"""

_MISTRAL_QA_TEMPLATE_WITH_INSTRUCTIONS_AND_EXAMPLES = """<s>[INST]You are an AI assistant bot with no specific name.

Below you are given instructions, example question and how to answer, and the user question.
Use the following conversation history and pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. You do not repeat yourself. You avoid bulleted list or emojis.

Instructions:
{instructions}


Examples:
{examples}

Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.
[/INST]

{context}
</s>[INST] {question} [/INST]"""


_QA_TEMPLATE_WITH_INSTRUCTIONS_AND_NAME = """You are an AI assistant bot called {bot_name}.

Below you are given instructions and the user question.
Instructions: 
{instructions}


Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.


{context}

Question: {question}
Helpful Answer:"""


_LLAMA_QA_TEMPLATE_WITH_INSTRUCTIONS_AND_NAME = """<<SYS>>You are an AI assistant bot called {bot_name}.

Below you are given instructions and the user question.
Use the following conversation history and pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. You do not repeat yourself. You avoid bulleted list or emojis.

Instructions: 
{instructions}
<</SYS>>

{context}

Question: {question}
Helpful Answer:[/INST]"""

_MISTRAL_QA_TEMPLATE_WITH_INSTRUCTIONS_AND_NAME = """<s>[INST]You are an AI assistant bot called {bot_name}.

Below you are given instructions and the user question.
Use the following conversation history and pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. You do not repeat yourself. You avoid bulleted list or emojis.

Instructions:
{instructions}

[/INST]

{context}
</s>[INST] {question} [/INST]"""


_QA_TEMPLATE_WITH_INSTRUCTIONS = """You are an AI assistant bot with no specific name.

Below you are given instructions and the user question.
Instructions: 
{instructions}


Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.


{context}

Question: {question}
Helpful Answer:"""


_LLAMA_QA_TEMPLATE_WITH_INSTRUCTIONS = """<<SYS>>You are an AI assistant bot with no specific name.

Below you are given instructions and the user question.
Use the following conversation history and pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. You do not repeat yourself. You avoid bulleted list or emojis.

Instructions: 
{instructions}
<</SYS>>

{context}

Question: {question}
Helpful Answer:[/INST]"""


_MISTRAL_QA_TEMPLATE_WITH_INSTRUCTIONS = """<s>[INST] You are an AI assistant bot with no specific name.

Below you are given instructions and the user question.
Use the following conversation history and pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer. You do not repeat yourself. You avoid bulleted list or emojis.

Instructions:
{instructions}

[/INST]

{context}
</s>[INST] {question} [/INST]"""

_llm_prompt_map = {
    "default": {
        "condense_question_all": _CONDENSE_QUESTION_PROMPT_WIH_ALL,
        "condense_question_instructions_and_name": _CONDENSE_QUESTION_PROMPT_WITH_INSTRUCTIONS_AND_NAME,
        "condense_question_instructions_and_examples": _CONDENSE_QUESTION_PROMPT_INSTRUCTIONS_AND_EXAMPLES,
        "condense_question_instructions_only": _CONDENSE_QUESTION_PROMPT_WITH_ONLY_INSTRUCTIONS,
        "qa_template_all": _QA_TEMPLATE_WITH_ALL,
        "qa_template_instructions_and_name": _QA_TEMPLATE_WITH_INSTRUCTIONS_AND_NAME,
        "qa_template_instructions_and_examples": _QA_TEMPLATE_WITH_INSTRUCTIONS_AND_EXAMPLES,
        "qa_template_instructions_only": _QA_TEMPLATE_WITH_INSTRUCTIONS,
    },
    "llama": {
        "condense_question_all": _LLAMA_CONDENSE_QUESTION_PROMPT_WITH_ALL,
        "condense_question_instructions_and_name": _LLAMA_CONDENSE_QUESTION_PROMPT_WITH_INSTRUCTIONS_AND_NAME,
        "condense_question_instructions_and_examples": _LLAMA_CONDENSE_QUESTION_PROMPT_INSTRUCTIONS_AND_EXAMPLES,
        "condense_question_instructions_only": _LLAMA_CONDENSE_QUESTION_PROMPT_INSTRUCTIONS_AND_EXAMPLES,
        "qa_template_all": _LLAMA_QA_TEMPLATE_WITH_ALL,
        "qa_template_instructions_and_name": _LLAMA_QA_TEMPLATE_WITH_INSTRUCTIONS_AND_NAME,
        "qa_template_instructions_and_examples": _LLAMA_QA_TEMPLATE_WITH_INSTRUCTIONS_AND_EXAMPLES,
        "qa_template_instructions_only": _LLAMA_QA_TEMPLATE_WITH_INSTRUCTIONS,
    },
    "mistral": {
        "condense_question_all": _MISTRAL_CONDENSE_QUESTION_PROMPT_WITH_ALL,
        "condense_question_instructions_and_name": _MISTRAL_CONDENSE_QUESTION_PROMPT_WITH_INSTRUCTIONS_AND_NAME,
        "condense_question_instructions_and_examples": _MISTRAL_CONDENSE_QUESTION_PROMPT_INSTRUCTIONS_AND_EXAMPLES,
        "condense_question_instructions_only": _MISTRAL_CONDENSE_QUESTION_PROMPT_INSTRUCTIONS_AND_EXAMPLES,
        "qa_template_all": _MISTRAL_QA_TEMPLATE_WITH_ALL,
        "qa_template_instructions_and_name": _MISTRAL_QA_TEMPLATE_WITH_INSTRUCTIONS_AND_NAME,
        "qa_template_instructions_and_examples": _MISTRAL_QA_TEMPLATE_WITH_INSTRUCTIONS_AND_EXAMPLES,
        "qa_template_instructions_only": _MISTRAL_QA_TEMPLATE_WITH_INSTRUCTIONS,
    }
}


def get_model_prompt_template(model_name, prompt_type):
    model_key = "default"
    if "mistral" in model_name:
        model_key = "mistral"
    elif "llama" in model_name:
        model_key = "llama"
    return _llm_prompt_map[model_key][prompt_type]
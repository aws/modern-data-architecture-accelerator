"""
Bedrock RAG WebSocket Handler

This Lambda function handles RAG (Retrieval-Augmented Generation) requests for the
GenAI Accelerator chat interface. It retrieves relevant documents from a Bedrock
Knowledge Base and generates responses using foundation models with streaming output.

Flow:
1. Receives user message via AppSync Events WebSocket
2. Checks for active service interruptions
3. Retrieves conversation history from DynamoDB for context
4. Calls Bedrock RetrieveAndGenerateStream API with knowledge base
5. Streams response chunks back to client via WebSocket (textDelta messages)
6. Sends citation events for inline citations (if enabled)
7. Sends source documents at end of response
8. Persists updated conversation history to DynamoDB

Environment Variables:
    WEB_SOCKET_URL: AppSync Events HTTP endpoint for publishing messages
    SESSION_TABLE_NAME: DynamoDB table for chat history storage
    MODEL_ID: Bedrock model ARN for generation
    KNOWLEDGE_BASE_ID: Bedrock Knowledge Base ID for retrieval
    CHAT_RETENTION_IN_MINUTES: TTL for chat history (-1 for no expiration)
    TTL_COLUMN_NAME: DynamoDB attribute name for TTL (required if retention is set)
    DISPLAY_INLINE_CITATIONS: Enable inline citation markers (true/false)
    KB_NUMBER_OF_RESULTS: Number of documents to retrieve (default: 5)
    GUARDRAIL_ID: Optional Bedrock Guardrail ID
    GUARDRAIL_VERSION: Guardrail version (default: DRAFT)
    LOG_LEVEL: Logging level (DEBUG, INFO, WARNING, ERROR)

See Also:
    - bedrock-invoke-model/function/index.py: Direct model invocation (non-RAG)
    - README.md: WebSocket API Reference section for message format documentation
"""
import json
import logging
import os
import time
import uuid

import boto3

from chat_history_helpers import ChatHistoryHelper, ChatMessage, ChatHistorySizeLimitError, ChatHistoryStorageError
from citation_utils import process_retrieved_reference_with_metadata_override, \
    process_retrieved_documents_with_citations
from web_socket_utils import send_websocket_message
from service_interruption_helper import check_service_interruption, create_interruption_websocket_response

# Initialize the Bedrock Runtime client
bedrock_agent_runtime = boto3.client('bedrock-agent-runtime')

def load_conditional_template(filename: str, has_file_flag: str, default: str = '') -> str:
    """
    Load template from bundled file if available, otherwise use default.
    
    Resolution order:
    1. If has_file_flag is 'true', attempt to read from bundled file
    2. Fall back to default value
    
    If has_file_flag is 'true' but file cannot be loaded and default is empty,
    raises ValueError to fail fast on misconfiguration.
    
    Args:
        filename: Name of the template file to load
        has_file_flag: Environment variable name indicating if file should exist
        default: Default value if file not available
        
    Returns:
        Template string content
        
    Raises:
        ValueError: If has_file_flag is 'true' but no template could be resolved
    """
    result = None
    file_was_expected = os.environ.get(has_file_flag, 'false').lower() == 'true'
    
    if file_was_expected:
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            file_path = os.path.join(current_dir, filename)
            
            if os.path.exists(file_path):
                with open(file_path, 'r', encoding='utf-8') as f:
                    result = f.read().strip()
            else:
                logging.warning(f"Expected template file {filename} not found, falling back to default")
        except Exception as e:
            logging.warning(f"Could not read template file {filename}: {e}")
    
    # Fall back to default
    if not result:
        result = default
    
    # Fail fast if file was expected but nothing resolved
    if file_was_expected and not result:
        raise ValueError(
            f"Template file '{filename}' was expected ({has_file_flag}=true) but could not be loaded "
            f"and no default was provided."
        )
    
    return result

WEB_SOCKET_URL = os.environ.get("WEB_SOCKET_URL")
SESSION_TABLE_NAME = os.environ.get("SESSION_TABLE_NAME")
MODEL_ID = os.environ.get("MODEL_ID")
KNOWLEDGE_BASE_ID = os.environ.get("KNOWLEDGE_BASE_ID")
CHAT_RETENTION_IN_MINUTES = int(os.environ.get("CHAT_RETENTION_IN_MINUTES", -1))
TTL_COLUMN_NAME = os.environ.get("TTL_COLUMN_NAME", "")

# Required: Main prompt template for RAG responses. Has a sensible default, but can be
# customized via HAS_CUSTOM_PROMPT_TEMPLATE=true + bundled prompt_template.txt file.
PROMPT_TEMPLATE = load_conditional_template(
    filename='prompt_template.txt',
    has_file_flag='HAS_CUSTOM_PROMPT_TEMPLATE',
    default='''
You are a helpful AI assistant with access to a knowledge base. Your primary role is to answer questions using information from the search results provided below.

HANDLING DIFFERENT TYPES OF QUESTIONS:

1. For questions about your capabilities (e.g., "What can you do?", "How can you help me?", "What are you?"):
   - Explain that you are an AI assistant that can help users find information from the knowledge base
   - You can answer questions, provide explanations, and help users understand topics covered in the available documents
   - Be friendly and welcoming

2. For questions that can be answered from the search results:
   - Answer using only information from the search results
   - Be concise and direct
   - Use bullet points for clarity when appropriate
   - Cite your sources when possible

3. For questions where the search results don't contain relevant information:
   - Politely explain that you couldn't find specific information about that topic in the knowledge base
   - Suggest the user try rephrasing their question or ask about related topics
   - Do NOT refuse to respond or say you "cannot assist"

GUIDELINES FOR ALL RESPONSES:
- Maintain a helpful and professional tone
- If you're uncertain about information, acknowledge your uncertainty
- Identify and prioritize more recent information based on timestamps or contextual clues
- When conflicting information exists, prefer the most recent version
- Never make up information that isn't in the search results

Here are the search results in numbered order:
$search_results$

$output_format_instructions$
'''
)
INFERENCE_MAX_TOKENS = int(os.environ.get("INFERENCE_MAX_TOKENS", -1))
INFERENCE_TEMPERATURE = float(os.environ.get("INFERENCE_TEMPERATURE", -1))
INFERENCE_TOP_P = float(os.environ.get("INFERENCE_TOP_P", -1))
KB_NUMBER_OF_RESULTS = int(os.environ.get("KB_NUMBER_OF_RESULTS", 5))
GUARDRAIL_ID = os.environ.get("GUARDRAIL_ID", "") 
GUARDRAIL_VERSION = os.environ.get("GUARDRAIL_VERSION", "DRAFT")

# Orchestration configuration (all optional - used for advanced Bedrock orchestration features)
ORCHESTRATION_ADDITIONAL_MODEL_REQUEST_FIELDS_STR = os.environ.get("ORCHESTRATION_ADDITIONAL_MODEL_REQUEST_FIELDS", "")
ORCHESTRATION_ADDITIONAL_MODEL_REQUEST_FIELDS = json.loads(ORCHESTRATION_ADDITIONAL_MODEL_REQUEST_FIELDS_STR) if ORCHESTRATION_ADDITIONAL_MODEL_REQUEST_FIELDS_STR else {}
ORCHESTRATION_INFERENCE_MAX_TOKENS = int(os.environ.get("ORCHESTRATION_INFERENCE_MAX_TOKENS", -1))
ORCHESTRATION_INFERENCE_TEMPERATURE = float(os.environ.get("ORCHESTRATION_INFERENCE_TEMPERATURE", -1))
ORCHESTRATION_INFERENCE_TOP_P = float(os.environ.get("ORCHESTRATION_INFERENCE_TOP_P", -1))
ORCHESTRATION_INFERENCE_STOP_SEQUENCES_STR = os.environ.get("ORCHESTRATION_INFERENCE_STOP_SEQUENCES", "")
ORCHESTRATION_INFERENCE_STOP_SEQUENCES = json.loads(ORCHESTRATION_INFERENCE_STOP_SEQUENCES_STR) if ORCHESTRATION_INFERENCE_STOP_SEQUENCES_STR else []
ORCHESTRATION_PERFORMANCE_LATENCY = os.environ.get("ORCHESTRATION_PERFORMANCE_LATENCY", "")
# Optional: Orchestration prompt template. Empty by default (Bedrock uses its own).
# Only set if you need custom orchestration behavior via HAS_CUSTOM_ORCHESTRATION_PROMPT_TEMPLATE=true
# + bundled orchestration_prompt_template.txt file.
ORCHESTRATION_PROMPT_TEMPLATE = load_conditional_template(
    filename='orchestration_prompt_template.txt',
    has_file_flag='HAS_CUSTOM_ORCHESTRATION_PROMPT_TEMPLATE',
    default=''  # Empty is valid - orchestration prompt is optional
)
ORCHESTRATION_QUERY_TRANSFORMATION_TYPE = os.environ.get("ORCHESTRATION_QUERY_TRANSFORMATION_TYPE", "")

if CHAT_RETENTION_IN_MINUTES > 0 and not TTL_COLUMN_NAME:
    raise ValueError("TTL_COLUMN_NAME must be specified when CHAT_RETENTION_IN_MINUTES is set")
DISPLAY_INLINE_CITATIONS = os.environ.get("DISPLAY_INLINE_CITATIONS", "false").lower() == "true"

# Configure logger with level from environment variable
LOG_LEVEL = os.environ.get("LOG_LEVEL", "WARNING").upper()
logger = logging.getLogger()
logger.setLevel(getattr(logging, LOG_LEVEL, logging.WARNING))

chat_history_helper = ChatHistoryHelper(table_name= SESSION_TABLE_NAME, chat_retention_in_minutes=CHAT_RETENTION_IN_MINUTES, ttl_column_name=TTL_COLUMN_NAME)

def handler(event, context):
    """
    Lambda function that interacts with Amazon Bedrock RetrieveAndGenerateStream API
    """
    
    # Extract parameters from the event or use defaults
    model_id = event.get('modelId', MODEL_ID)
    knowledge_base_id = event.get('knowledgeBaseId', KNOWLEDGE_BASE_ID)
    
    user_input = event.get('events', [{}])[0].get('payload', {}).get('text', '')
    session_id = event.get('events', [{}])[0].get('payload', {}).get('sessionId', '')
    user_id = event.get('identity', {}).get('sub', '')

    # Validate that required values are present
    if not user_input:
        raise ValueError("Missing required field: user_input")
    
    if not session_id:
        raise ValueError("Missing required field: session_id")
    
    if not user_id:
        raise ValueError("Missing required field: user_id")

    # Check for service interruption early (before any Bedrock processing)
    is_interrupted, interruption_data = check_service_interruption('bedrock-rag')
    
    if is_interrupted:
        logger.info(f"Service interruption active for bedrock-rag: {interruption_data['message']}")
        
        # Generate unique content ID for interruption response
        content_id = str(uuid.uuid4())
        auth_header = event['request']['headers']['authorization']
        
        # Create and send interruption response using existing WebSocket pattern
        interruption_response = create_interruption_websocket_response(
            interruption_data, content_id
        )
        
        send_websocket_message(
            WEB_SOCKET_URL,
            f"/out/{user_id}/{session_id}",
            interruption_response,
            auth_header
        )
        
        # Return early - do not process with Bedrock
        return {
            'statusCode': 200,
            'body': json.dumps('Service interruption active')
        }

    try:
        # Record start time for response generation
        response_start_time = time.time()
        
        # Make sure the user can post on the channel by checking the second segment against the info in the token
        if user_id != event.get('info', {}).get('channel', {}).get('segments', [])[1]:
            logger.warning(
                f"Unauthorized: Can't process message received from userId {user_id}. "
                f"Message was posted on wrong segment {event.get('info', {}).get('channel', {}).get('segments', [])[1]}"
            )
            raise ValueError("Unauthorized")
        
        # Get chat history for context
        chat_history = chat_history_helper.get_chat_history(session_id, user_id)
        
        # Prepare the messages for Claude
        messages = []
        
        # Add previous messages from history for context
        for message in chat_history:
            messages.append({
                'role': message['role'],
                'content': [{'type': 'text', 'text': message['data']['content']}]
            })
        
        # Add the current user message
        messages.append({
            'role': 'user',
            'content': [{'type': 'text', 'text': user_input}]
        })
        
        # Prepare the request parameters for RetrieveAndGenerateStream
        params = {
            'retrieveAndGenerateConfiguration': {
                'type': 'KNOWLEDGE_BASE',
                'knowledgeBaseConfiguration': {
                    'knowledgeBaseId': knowledge_base_id,
                    'modelArn': model_id,
                    'retrievalConfiguration': {
                        'vectorSearchConfiguration': {
                            'numberOfResults': KB_NUMBER_OF_RESULTS
                        }
                    },
                    # Commented out as in original code
                    'generationConfiguration': {
                        'promptTemplate':{
                            'textPromptTemplate': PROMPT_TEMPLATE
                        }
                    }
                }
            },
            'input': {
                'text': json.dumps(messages)
            }
        }
        
        # Add guardrail configuration if specified
        if GUARDRAIL_ID and GUARDRAIL_VERSION:
            params['retrieveAndGenerateConfiguration']['knowledgeBaseConfiguration']['generationConfiguration']['guardrailConfiguration'] = {
                'guardrailId': GUARDRAIL_ID,
                'guardrailVersion': GUARDRAIL_VERSION
            }
        # Build textInferenceConfig
        text_inference_config = {}
        
        if INFERENCE_MAX_TOKENS > 0:
            text_inference_config['maxTokens'] = INFERENCE_MAX_TOKENS
        if INFERENCE_TEMPERATURE > 0:
            text_inference_config['temperature'] = INFERENCE_TEMPERATURE
        if INFERENCE_TOP_P > 0:
            text_inference_config['topP'] = INFERENCE_TOP_P

        # Only add inferenceConfig if we have at least one valid parameter
        if text_inference_config:
            params['retrieveAndGenerateConfiguration']['knowledgeBaseConfiguration']['generationConfiguration']['inferenceConfig'] = {
                'textInferenceConfig': text_inference_config
            }
            
        # Build orchestration configuration if any orchestration-specific settings are provided
        orchestration_config = {}
        
        # Add additional model request fields
        if ORCHESTRATION_ADDITIONAL_MODEL_REQUEST_FIELDS:
            orchestration_config['additionalModelRequestFields'] = ORCHESTRATION_ADDITIONAL_MODEL_REQUEST_FIELDS
            
        # Build orchestration inference config
        orchestration_text_inference_config = {}
        
        if ORCHESTRATION_INFERENCE_MAX_TOKENS > 0:
            orchestration_text_inference_config['maxTokens'] = ORCHESTRATION_INFERENCE_MAX_TOKENS
        if ORCHESTRATION_INFERENCE_TEMPERATURE > 0:
            orchestration_text_inference_config['temperature'] = ORCHESTRATION_INFERENCE_TEMPERATURE
        if ORCHESTRATION_INFERENCE_TOP_P > 0:
            orchestration_text_inference_config['topP'] = ORCHESTRATION_INFERENCE_TOP_P
        if ORCHESTRATION_INFERENCE_STOP_SEQUENCES:
            orchestration_text_inference_config['stopSequences'] = ORCHESTRATION_INFERENCE_STOP_SEQUENCES
            
        # Add orchestration inference config if we have at least one valid parameter
        if orchestration_text_inference_config:
            orchestration_config['inferenceConfig'] = {
                'textInferenceConfig': orchestration_text_inference_config
            }
            
        # Add performance config
        if ORCHESTRATION_PERFORMANCE_LATENCY:
            orchestration_config['performanceConfig'] = {
                'latency': ORCHESTRATION_PERFORMANCE_LATENCY
            }
            
        # Add prompt template
        if ORCHESTRATION_PROMPT_TEMPLATE:
            orchestration_config['promptTemplate'] = {
                'textPromptTemplate': ORCHESTRATION_PROMPT_TEMPLATE
            }
            
        # Add query transformation configuration
        if ORCHESTRATION_QUERY_TRANSFORMATION_TYPE:
            orchestration_config['queryTransformationConfiguration'] = {
                'type': ORCHESTRATION_QUERY_TRANSFORMATION_TYPE
            }
            
        # Only add orchestrationConfiguration if we have at least one valid parameter
        if orchestration_config:
            params['retrieveAndGenerateConfiguration']['knowledgeBaseConfiguration']['orchestrationConfiguration'] = orchestration_config
        
        # To debug
        # print(json.dumps(params, indent=2))

        # Invoke the model with streaming
        response = bedrock_agent_runtime.retrieve_and_generate_stream(**params)
        
        original_response = ''  # Track clean response text without citations
        retrieved_documents = []
        citation_spans = []
        auth_header = event['request']['headers']['authorization']
        content_id = str(uuid.uuid4())

        sequence_number = 0
        event_counter = 0
        
        # Process the streaming response
        logger.debug("Starting to process streaming response")
        for event_chunk in response['stream']:
            event_counter += 1
            sequence_number += 1
            logger.debug(f"Event #{event_counter}: {list(event_chunk.keys())}")

            # Handle retrieved citations/documents
            if 'citation' in event_chunk:
                logger.debug(f"CITATION EVENT #{event_counter}: Found citation chunk")
                citation = event_chunk.get('citation', {}).get('citation', {})
                logger.debug(f"Citation keys: {list(citation.keys())}")
                
                # Extract citation span information
                generated_part = citation.get('generatedResponsePart', {})
                text_response_part = generated_part.get('textResponsePart', {})
                logger.debug(f"Text response part keys: {list(text_response_part.keys()) if text_response_part else 'No text_response_part'}")
                
                if text_response_part.get('span') and DISPLAY_INLINE_CITATIONS:
                    logger.debug(f"PROCESSING CITATION: Found span and inline citations enabled")
                    span = text_response_part.get('span', {})
                    citation_text = text_response_part.get('text', '')
                    
                    start_pos = span.get('start', -1)
                    end_pos = span.get('end', -1)
                    logger.debug(f"Citation span: start={start_pos}, end={end_pos}, text='{citation_text}', current_response_length={len(original_response)}")
                    
                    # Store citation span information
                    citation_spans.append({
                        'span': span,
                        'text': citation_text,
                        'refIndex': len(retrieved_documents),
                        'eventNumber': event_counter,
                        'timestamp': (time.time())
                    })
                    
                    # Always send citation event - let frontend handle position validation
                    citation_number = len(retrieved_documents) + 1
                    logger.debug(f"SENDING CITATION EVENT: citation_number={citation_number}, position={end_pos}")
                    
                    # Send citation event separately from text
                    citation_event_result = {
                        'id': content_id,
                        'content': {
                            "type": 'citationEvent',
                            'sequenceNumber': sequence_number,
                            'position': end_pos,
                            'citationNumber': citation_number,
                            'citationText': citation_text,
                            'documentIndex': len(retrieved_documents)
                        },
                    }
                    
                    send_websocket_message(
                        WEB_SOCKET_URL,
                        f"/out/{user_id}/{session_id}",
                        citation_event_result,
                        auth_header
                    )
                else:
                    logger.debug(f"SKIPPING CITATION: span={bool(text_response_part.get('span'))}, DISPLAY_INLINE_CITATIONS={DISPLAY_INLINE_CITATIONS}")
                
                # Store retrieved references
                for result in citation.get('retrievedReferences', []):
                    if 'content' in result and 'location' in result:
                        # Process the retrieved reference to potentially override source information
                        processed_result = process_retrieved_reference_with_metadata_override(result)
                        retrieved_documents.append({
                            'retrievedReference': processed_result,
                            'generatedResponsePart': citation.get('generatedResponsePart', '')
                        })

            # Handle streaming text chunks
            elif 'output' in event_chunk and 'text' in event_chunk['output']:
                text_chunk = event_chunk['output']['text']
                original_response += text_chunk  # Track original text

                # Send regular streaming chunks (clean text - no citation cleaning needed anymore)
                # Send to websocket
                send_websocket_message(
                    WEB_SOCKET_URL,
                    f"/out/{user_id}/{session_id}",
                    {
                        'id': content_id,
                        'content': {
                            "type": 'textDelta',
                            'sequenceNumber': sequence_number,
                            'text': text_chunk
                        },
                    },
                    auth_header
                )
        
        # Process retrieved documents with citation support
        processed_documents = process_retrieved_documents_with_citations(
            retrieved_documents, 
            DISPLAY_INLINE_CITATIONS
        )
        
        # Calculate total response time
        response_end_time = time.time()
        response_time_ms = int((response_end_time - response_start_time) * 1000)
        
        # Store the CLEAN original response + native Bedrock citation spans in chat history
        chat_history_helper.update_chat_history(ChatMessage(
            user_id=user_id,
            session_id=session_id,
            content_id=content_id,
            user_input=user_input,
            ai_response=original_response,
            model_id=model_id,
            chat_history=chat_history,
            parts=[
                {
                    'type': 'text',
                    'text': original_response,  # Clean text in parts
                    'citationSpans': citation_spans  # Native Bedrock citation data
                },
                {
                    'type': 'source',
                    'documents': processed_documents
                }
            ],
            response_time_ms=response_time_ms
        ))

        # Send retrieved documents
        send_websocket_message(
            WEB_SOCKET_URL,
            f"/out/{user_id}/{session_id}",
            {
                'id': content_id,
                'content': {
                    "type": 'source',
                    'documents': processed_documents
                },
            },
            auth_header
        )
            
    except ChatHistorySizeLimitError as error:
        logger.warning(f"Chat history size limit exceeded: {str(error)}")
        
        error_message_id = str(uuid.uuid4())
        result = {
            'type': 'text',
            'action': 'error',
            'id': error_message_id,
            'connectionId': session_id,
            'userId': user_id,
            'timestamp': int(time.time()),
            'data': {
                'sessionId': session_id,
                'content': 'This conversation has become too long to save. Please start a new session to continue chatting.',
                'type': 'text'
            }
        }

        send_websocket_message(
            WEB_SOCKET_URL,
            f"/out/{user_id}/{session_id}",
            result,
            event['request']['headers']['authorization']
        )

    except ChatHistoryStorageError as error:
        # Response was already streamed to user, but history save failed
        logger.warning(f"Chat history storage failed: {str(error)}")
        
        error_message_id = str(uuid.uuid4())
        result = {
            'type': 'text',
            'action': 'warning',
            'id': error_message_id,
            'connectionId': session_id,
            'userId': user_id,
            'timestamp': int(time.time()),
            'data': {
                'sessionId': session_id,
                'content': 'Your response was delivered, but could not be saved to conversation history. You may need to repeat your question in future messages.',
                'type': 'text'
            }
        }

        send_websocket_message(
            WEB_SOCKET_URL,
            f"/out/{user_id}/{session_id}",
            result,
            event['request']['headers']['authorization']
        )
        
    except Exception as error:
        logger.error(f"Error invoking Bedrock: {str(error)}")
        
        # Generate unique id for error message
        error_message_id = str(uuid.uuid4())
        
        # Send error response with sanitized message (avoid leaking implementation details)
        result = {
            'type': 'text',
            'action': 'error',
            'id': error_message_id,
            'connectionId': session_id,
            'userId': user_id,
            'timestamp': int(time.time()),
            'data': {
                'sessionId': session_id,
                'content': 'An error occurred while processing your request. Please try again.',
                'type': 'text'
            }
        }

        send_websocket_message(
            WEB_SOCKET_URL,
            f"/out/{user_id}/{session_id}",
            result,
            event['request']['headers']['authorization']
        )
        
    return {
        'statusCode': 200,
        'body': json.dumps('Processing complete')
    }

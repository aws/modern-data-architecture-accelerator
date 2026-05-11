"""
Bedrock Invoke Model WebSocket Handler

This Lambda function handles direct Bedrock model invocations (non-RAG path) for the
GenAI Accelerator chat interface. It processes user messages via WebSocket, streams
responses from Amazon Bedrock foundation models, and maintains conversation history.

Flow:
1. Receives user message via AppSync Events WebSocket
2. Checks for active service interruptions
3. Retrieves conversation history from DynamoDB for context
4. Invokes Bedrock model with streaming response
5. Streams response chunks back to client via WebSocket (textDelta messages)
6. Persists updated conversation history to DynamoDB

Environment Variables:
    WEB_SOCKET_URL: AppSync Events HTTP endpoint for publishing messages
    SESSION_TABLE_NAME: DynamoDB table for chat history storage
    MODEL_ID: Bedrock model identifier (e.g., anthropic.claude-3-haiku-20240307-v1:0)
    CHAT_RETENTION_IN_MINUTES: TTL for chat history (-1 for no expiration)
    TTL_COLUMN_NAME: DynamoDB attribute name for TTL (required if retention is set)
    SYSTEM_PROMPT: Optional custom system prompt for the model
    LOG_LEVEL: Logging level (DEBUG, INFO, WARNING, ERROR)

See Also:
    - bedrock-rag/function/index.py: RAG-enabled handler with knowledge base retrieval
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
bedrock_runtime = boto3.client(service_name='bedrock-runtime')

# Required environment variables
WEB_SOCKET_URL = os.environ.get("WEB_SOCKET_URL")
SESSION_TABLE_NAME = os.environ.get("SESSION_TABLE_NAME")
MODEL_ID = os.environ.get("MODEL_ID")
CHAT_RETENTION_IN_MINUTES = int(os.environ.get("CHAT_RETENTION_IN_MINUTES", -1))
TTL_COLUMN_NAME = os.environ.get("TTL_COLUMN_NAME", "")

# Validate required environment variables at module load
if not WEB_SOCKET_URL:
    raise ValueError("WEB_SOCKET_URL environment variable is required")
if not SESSION_TABLE_NAME:
    raise ValueError("SESSION_TABLE_NAME environment variable is required")
if not MODEL_ID:
    raise ValueError("MODEL_ID environment variable is required")

# Default system prompt for the invoke-model handler
DEFAULT_SYSTEM_PROMPT = os.environ.get("SYSTEM_PROMPT", """You are a helpful AI assistant. Your role is to assist users by answering questions, providing explanations, and helping with various tasks.

GUIDELINES:
- Be helpful, friendly, and professional
- Provide clear and concise answers
- If you're unsure about something, acknowledge your uncertainty
- For questions about your capabilities, explain that you can help with answering questions, providing information, and assisting with various tasks
- Never refuse to respond to reasonable questions - always try to be helpful""")

if CHAT_RETENTION_IN_MINUTES > 0 and not TTL_COLUMN_NAME:
    raise ValueError("TTL_COLUMN_NAME must be specified when CHAT_RETENTION_IN_MINUTES is set")

# Configure logger with level from environment variable
LOG_LEVEL = os.environ.get("LOG_LEVEL", "WARNING").upper()
logger = logging.getLogger()
logger.setLevel(getattr(logging, LOG_LEVEL, logging.WARNING))

chat_history_helper = ChatHistoryHelper(table_name= SESSION_TABLE_NAME, chat_retention_in_minutes=CHAT_RETENTION_IN_MINUTES, ttl_column_name=TTL_COLUMN_NAME)

def handler(event, context):
    """
    Lambda function that interacts with Amazon Bedrock using InvokeModelWithResponseStream API
    """
    
    # Extract parameters from the event or use defaults
    model_id = event.get('modelId', MODEL_ID)
    
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
    is_interrupted, interruption_data = check_service_interruption('bedrock-invoke-model')
    
    if is_interrupted:
        logger.info(f"Service interruption active for bedrock-invoke-model: {interruption_data['message']}")
        
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
        
        # Prepare system prompt
        system_prompt = DEFAULT_SYSTEM_PROMPT
        
        # Prepare request body for Claude
        request_body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2000,
            "temperature": 0.7,
            "top_p": 0.9,
            "system": system_prompt,
            "messages": messages
                        }
        
        logger.debug(f"Invoking Bedrock with params: {json.dumps(request_body)}")
        
        # Convert to JSON string and bytes
        request_body_bytes = json.dumps(request_body).encode('utf-8')
        
        # Invoke the model with streaming
        response = bedrock_runtime.invoke_model_with_response_stream(
            modelId=model_id,
            body=request_body_bytes,
            accept="application/json",
            contentType="application/json"
        )
        
        ai_response = ''
        retrieved_documents = []
        auth_header = event['request']['headers']['authorization']
        content_id = str(uuid.uuid4())

        sequence_number = 0
        # Process the streaming response
        for event_chunk in response.get('body'):
            # Parse the chunk
            chunk_data = json.loads(event_chunk['chunk']['bytes'].decode('utf-8'))
            
            # Handle streaming text chunks
            if 'type' in chunk_data and chunk_data['type'] == 'content_block_delta':
                if 'delta' in chunk_data and 'text' in chunk_data['delta']:
                    text_chunk = chunk_data['delta']['text']
                ai_response += text_chunk
                
                # Send incremental updates to the websocket
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
                sequence_number = sequence_number + 1

        # Calculate total response time
        response_end_time = time.time()
        response_time_ms = int((response_end_time - response_start_time) * 1000)

        # Store the complete chat history
        chat_history_helper.update_chat_history(ChatMessage(
            user_id=user_id,
            session_id=session_id,
            content_id=content_id,
            user_input=user_input,
            ai_response=ai_response,
            model_id=model_id,
            chat_history=chat_history,
            parts=retrieved_documents,
            response_time_ms=response_time_ms
        ))
        
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


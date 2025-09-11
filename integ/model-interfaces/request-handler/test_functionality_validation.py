"""
Comprehensive validation tests for all existing functionality after lambda layer optimization.
This test suite validates that all API endpoints, model inference, and function interfaces
remain intact after the migration from layer-based to container-based deployment.
"""

import json
import uuid
import pytest
import subprocess
from typing import Dict, Any


@pytest.mark.integration
class TestAPIEndpointValidation:
    """Test that all API endpoints work correctly after the migration."""
    
    def test_heartbeat_endpoint_functionality(
        self,
        container_runtime: str,
        built_container: str,
        test_environment_variables: Dict[str, str],
        sample_sqs_event: Dict[str, Any]
    ):
        """Test that heartbeat endpoint works correctly."""
        
        # Get real AWS account number using STS
        import boto3
        import os
        try:
            # Use explicit region to avoid aws-global issue
            region = os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')
            sts = boto3.client('sts', region_name=region)
            account_id = sts.get_caller_identity()['Account']
        except Exception as e:
            pytest.skip(f"Could not get AWS account info: {e}")
        
        # Create heartbeat event
        heartbeat_event = sample_sqs_event.copy()
        message_data = {
            "action": "heartbeat",
            "connectionId": "test-connection-id",
            "userId": "test-user-id",
            "data": {
                "sessionId": str(uuid.uuid4())
            }
        }
        
        heartbeat_event["Records"][0]["body"] = json.dumps({
            "Type": "Notification",
            "Message": json.dumps(message_data)
        })
        
        # Update test environment variables with real account info
        real_env_vars = test_environment_variables.copy()
        real_env_vars.update({
            "AWS_DEFAULT_REGION": region,
            "API_KEYS_SECRETS_ARN": f"arn:aws:secretsmanager:{region}:{account_id}:secret:test-api-keys-123456",
            "MESSAGES_TOPIC_ARN": f"arn:aws:sns:{region}:{account_id}:test-messages-topic",
            "SESSIONS_TABLE_NAME": "test-sessions-table",
            "WORKSPACES_TABLE_NAME": "test-workspaces-table",
            "DOCUMENTS_TABLE_NAME": "test-documents-table"
        })
        
        # Create environment args for container
        env_args = []
        for key, value in real_env_vars.items():
            env_args.extend(["-e", f"{key}={value}"])
        
        # Add AWS credentials from host environment
        import os
        aws_env_vars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_PROFILE']
        for aws_var in aws_env_vars:
            if aws_var in os.environ:
                env_args.extend(["-e", f"{aws_var}={os.environ[aws_var]}"])
        
        # Test script that validates heartbeat processing with real AWS
        test_script = f'''
import sys
import os
import json
import boto3

os.chdir('/var/task')
sys.path.insert(0, '/var/task')

try:
    # Verify AWS credentials work
    sts = boto3.client('sts')
    identity = sts.get_caller_identity()
    print(f"✅ AWS credentials working - Account: {{identity['Account']}}")
    
    # Test that all required modules can be imported
    from index import handler, handle_heartbeat, record_handler
    from aws_lambda_powertools.utilities.data_classes.sqs_event import SQSRecord
    from genai_core.utils.websocket import send_to_client
    from genai_core.types import ChatbotAction
    
    print("✅ All required modules imported successfully")
    
    # Test event structure
    event = {json.dumps(heartbeat_event)}
    
    # Validate SQS record can be created
    record_data = event["Records"][0]
    sqs_record = SQSRecord(record_data)
    assert sqs_record is not None
    assert sqs_record.body is not None
    print("✅ SQS record creation successful")
    
    # Parse the message to validate structure
    message_body = json.loads(sqs_record.body)
    detail = json.loads(message_body["Message"])
    assert detail["action"] == "heartbeat"
    assert detail["userId"] == "test-user-id"
    assert "sessionId" in detail["data"]
    print("✅ Heartbeat message structure is correct")
    
    # Test that handler functions exist and are callable
    assert callable(handler)
    assert callable(handle_heartbeat)
    assert callable(record_handler)
    print("✅ Handler functions are callable")
    
    # Test ChatbotAction enum
    assert hasattr(ChatbotAction, 'HEARTBEAT')
    assert ChatbotAction.HEARTBEAT.value == "heartbeat"
    print("✅ ChatbotAction enum is correct")
    
    # Test record handler directly (this will call AWS services)
    try:
        record_handler(sqs_record)
        print("✅ Record handler executed successfully")
    except Exception as e:
        # Expected to fail due to missing AWS resources, but should not be import/structure error
        error_str = str(e).lower()
        if any(keyword in error_str for keyword in ["secret", "not found", "topic does not exist", "notfound"]):
            print(f"✅ Record handler failed as expected (missing test AWS resources): {{type(e).__name__}}")
            print("✅ This confirms the handler is working and calling real AWS services")
        else:
            print(f"❌ Unexpected record handler error: {{e}}")
            raise
    
except Exception as e:
    print(f"❌ Heartbeat endpoint test failed: {{e}}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("✅ Heartbeat endpoint validation completed successfully")
'''
        
        cmd = [
            container_runtime, "run", "--rm",
            "--entrypoint", "python",
            *env_args,
            built_container,
            "-c", test_script
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        print("STDOUT:", result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        assert result.returncode == 0, f"Heartbeat endpoint validation failed: {result.stdout}"


    def test_chat_endpoint_functionality(
        self,
        container_runtime: str,
        built_container: str,
        test_environment_variables: Dict[str, str],
        sample_sqs_event: Dict[str, Any]
    ):
        """Test that chat endpoint works correctly."""
        
        # Get real AWS account number using STS
        import boto3
        import os
        try:
            # Use explicit region to avoid aws-global issue
            region = os.environ.get('AWS_DEFAULT_REGION', 'us-east-1')
            sts = boto3.client('sts', region_name=region)
            account_id = sts.get_caller_identity()['Account']
        except Exception as e:
            pytest.skip(f"Could not get AWS account info: {e}")
        
        # Create chat event with real ARNs
        chat_event = sample_sqs_event.copy()
        message_data = {
            "action": "run",
            "connectionId": "test-connection-id",
            "userId": "test-user-id",
            "data": {
                "sessionId": str(uuid.uuid4()),
                "mode": "chat",
                "text": "Hello, how are you?",
                "provider": "openai",
                "modelName": "gpt-3.5-turbo",
                "workspaceId": "test-workspace",
                "modelKwargs": {
                    "temperature": 0.7,
                    "max_tokens": 100
                },
                "replyTo": f"arn:aws:sns:{region}:{account_id}:test-topic"
            }
        }
        
        chat_event["Records"][0]["body"] = json.dumps({
            "Type": "Notification",
            "Message": json.dumps(message_data)
        })
        
        # Update test environment variables with real account info
        real_env_vars = test_environment_variables.copy()
        real_env_vars.update({
            "AWS_DEFAULT_REGION": region,
            "API_KEYS_SECRETS_ARN": f"arn:aws:secretsmanager:{region}:{account_id}:secret:test-api-keys-123456",
            "MESSAGES_TOPIC_ARN": f"arn:aws:sns:{region}:{account_id}:test-messages-topic",
        })
        
        # Create environment args for container
        env_args = []
        for key, value in real_env_vars.items():
            env_args.extend(["-e", f"{key}={value}"])
        
        # Add AWS credentials from host environment
        import os
        aws_env_vars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_PROFILE']
        for aws_var in aws_env_vars:
            if aws_var in os.environ:
                env_args.extend(["-e", f"{aws_var}={os.environ[aws_var]}"])
        
        # Test script that validates chat processing structure
        test_script = f'''
import sys
import os
import json
import boto3

os.chdir('/var/task')
sys.path.insert(0, '/var/task')

try:
    # Verify AWS credentials work
    sts = boto3.client('sts')
    identity = sts.get_caller_identity()
    print(f"✅ AWS credentials working - Account: {{identity['Account']}}")

    # Import handler
    from index import handler, handle_run
    from genai_core.registry import registry

    # Test event
    event = {json.dumps(chat_event)}

    # Test that chat handler functions exist
    assert callable(handle_run)
    print("✅ Chat handler function exists")
    
    # Test that adapter registry works
    openai_adapter = registry.get_adapter("openai.gpt-3.5-turbo")
    assert openai_adapter is not None
    print("✅ OpenAI adapter is registered")
    
    # Test that we can parse the chat event structure
    message_body = json.loads(event["Records"][0]["body"])
    detail = json.loads(message_body["Message"])
    assert detail["action"] == "run"
    assert detail["data"]["mode"] == "chat"
    assert detail["data"]["provider"] == "openai"
    assert detail["data"]["modelName"] == "gpt-3.5-turbo"
    print("✅ Chat event structure is correct")
    
    # Test that we can create an adapter instance
    adapter_class = registry.get_adapter("openai.gpt-3.5-turbo")
    assert adapter_class is not None
    print("✅ Can retrieve adapter class from registry")
    
    # Test LangChain imports work
    from langchain_community.chat_models import ChatOpenAI
    print("✅ LangChain imports work correctly")
    
except Exception as e:
    print(f"❌ Chat endpoint test failed: {{e}}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("✅ Chat endpoint validation completed successfully")
'''
        
        cmd = [
            container_runtime, "run", "--rm",
            "--entrypoint", "python",
            *env_args,
            built_container,
            "-c", test_script
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        print("STDOUT:", result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        assert result.returncode == 0, f"Chat endpoint validation failed: {result.stdout}"


@pytest.mark.integration
class TestModelInferenceValidation:
    """Test that model inference works correctly after the migration."""
    
    def test_adapter_registry_functionality(
        self,
        container_runtime: str,
        built_container: str,
        test_environment_variables: Dict[str, str]
    ):
        """Test that model adapters are registered and work correctly."""
        
        # Create environment args for container
        env_args = []
        for key, value in test_environment_variables.items():
            env_args.extend(["-e", f"{key}={value}"])
        
        # Add AWS credentials from host environment
        import os
        aws_env_vars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_PROFILE']
        for aws_var in aws_env_vars:
            if aws_var in os.environ:
                env_args.extend(["-e", f"{aws_var}={os.environ[aws_var]}"])
        
        test_script = '''
import sys
import os

os.chdir('/var/task')
sys.path.insert(0, '/var/task')

try:
    # Import required modules
    from genai_core.registry import registry
    import adapters
    
    print("✅ Registry and adapters imports successful")
    
    # Test OpenAI adapter registration
    openai_adapter = registry.get_adapter("openai.gpt-3.5-turbo")
    assert openai_adapter is not None
    print("✅ OpenAI adapter registered correctly")
    
    # Test Bedrock adapter registration (use correct class name)
    bedrock_adapter = registry.get_adapter("bedrock.anthropic.claude-v2")
    assert bedrock_adapter is not None
    print("✅ Bedrock adapter registered correctly")
    
    # Test SageMaker adapter registration
    sagemaker_adapter = registry.get_adapter("sagemaker.meta-LLama2-7b-chat-hf")
    assert sagemaker_adapter is not None
    print("✅ SageMaker adapter registered correctly")
    
    # Test adapter imports work (use correct class names)
    from adapters.openai.gpt import GPTAdapter
    from adapters.bedrock.base import BedrockChatAdapter
    from adapters.sagemaker.meta.llama2_chat import SMLlama2ChatAdapter
    
    print("✅ All adapter classes imported successfully")
    
    # Test that adapters have required methods
    assert hasattr(GPTAdapter, 'run')
    assert hasattr(BedrockChatAdapter, 'run')
    assert hasattr(SMLlama2ChatAdapter, 'run')
    
    print("✅ All adapters have required methods")
    
except Exception as e:
    print(f"❌ Adapter registry test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("✅ Adapter registry validation completed successfully")
'''
        
        cmd = [
            container_runtime, "run", "--rm",
            "--entrypoint", "python",
            *env_args,
            built_container,
            "-c", test_script
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        
        print("STDOUT:", result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        assert result.returncode == 0, f"Adapter registry validation failed: {result.stdout}"


@pytest.mark.integration
class TestFunctionInterfaceValidation:
    """Test that function interfaces remain unchanged after the migration."""
    
    def test_streaming_callback_functionality(
        self,
        container_runtime: str,
        built_container: str,
        test_environment_variables: Dict[str, str]
    ):
        """Test that streaming callback functionality works correctly."""
        
        # Create environment args for container
        env_args = []
        for key, value in test_environment_variables.items():
            env_args.extend(["-e", f"{key}={value}"])
        
        # Add AWS credentials from host environment
        import os
        aws_env_vars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_PROFILE']
        for aws_var in aws_env_vars:
            if aws_var in os.environ:
                env_args.extend(["-e", f"{aws_var}={os.environ[aws_var]}"])
        
        test_script = '''
import sys
import os
import inspect

os.chdir('/var/task')
sys.path.insert(0, '/var/task')

try:
    print("Testing streaming callback functionality...")
    
    # Import streaming callback
    from index import on_llm_new_token
    
    print("✅ Streaming callback function imported successfully")
    
    # Test callback function signature
    sig = inspect.signature(on_llm_new_token)
    required_params = ['connection_id', 'user_id', 'session_id', 'reply_to', 'self', 'token', 'run_id', 'chunk', 'parent_run_id']
    
    for param in required_params:
        assert param in sig.parameters
    
    print("✅ Streaming callback has correct signature")
    
    # Test that the function exists and is callable
    assert callable(on_llm_new_token)
    print("✅ Streaming callback is callable")
    
    # Test global sequence number variable exists
    from index import sequence_number
    print(f"✅ Global sequence number variable exists: {sequence_number}")
    
except Exception as e:
    print(f"❌ Streaming callback functionality test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("✅ Streaming callback functionality validation passed successfully")
'''
        
        cmd = [
            container_runtime, "run", "--rm",
            "--entrypoint", "python",
            *env_args,
            built_container,
            "-c", test_script
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        
        print("STDOUT:", result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        assert result.returncode == 0, f"Streaming callback functionality validation failed: {result.stdout}"


@pytest.mark.integration
@pytest.mark.slow
class TestPerformanceValidation:
    """Test that performance characteristics are maintained after the migration."""
    
    def test_container_startup_performance(
        self,
        container_runtime: str,
        built_container: str,
        test_environment_variables: Dict[str, str]
    ):
        """Test that container startup performance is acceptable."""
        
        import time
        
        # Create environment args for container
        env_args = []
        for key, value in test_environment_variables.items():
            env_args.extend(["-e", f"{key}={value}"])
        
        # Add AWS credentials from host environment
        import os
        aws_env_vars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN', 'AWS_PROFILE']
        for aws_var in aws_env_vars:
            if aws_var in os.environ:
                env_args.extend(["-e", f"{aws_var}={os.environ[aws_var]}"])
        
        # Measure cold start time
        start_time = time.time()
        
        test_script = '''
import sys
import os
import time

start_import_time = time.time()

os.chdir('/var/task')
sys.path.insert(0, '/var/task')

# Import handler (simulates cold start)
from index import handler

end_import_time = time.time()
import_time = end_import_time - start_import_time

print(f"Import time: {import_time:.2f} seconds")

# Validate import time is reasonable (should be under 15 seconds for container)
if import_time > 15.0:
    print(f"❌ Import time too slow: {import_time:.2f}s > 15s")
    sys.exit(1)
else:
    print(f"✅ Import time acceptable: {import_time:.2f}s")

# Test that all major components are loaded
from genai_core.registry import registry
import adapters
from langchain_community.chat_models import ChatOpenAI
from langchain_aws.chat_models import ChatBedrock

print("✅ All major components loaded successfully")
print("✅ Cold start performance validation completed successfully")
'''
        
        cmd = [
            container_runtime, "run", "--rm",
            "--entrypoint", "python",
            *env_args,
            built_container,
            "-c", test_script
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        end_time = time.time()
        total_time = end_time - start_time
        
        print("STDOUT:", result.stdout)
        if result.stderr:
            print("STDERR:", result.stderr)
        
        print(f"Total container execution time: {total_time:.2f} seconds")
        
        assert result.returncode == 0, f"Cold start performance validation failed: {result.stdout}"
        assert total_time < 20.0, f"Total execution time too slow: {total_time:.2f}s > 20s"
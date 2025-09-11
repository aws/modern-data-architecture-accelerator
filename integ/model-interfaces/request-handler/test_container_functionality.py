"""
Integration tests for Model Interface Request Handler container functionality.
"""

import subprocess
import pytest
from typing import Dict, Any


@pytest.mark.container
class TestContainerFunctionality:
    """Test container build and basic functionality."""
    
    def test_container_builds_successfully(self, built_container: str):
        """Test that the container builds without errors."""
        # The built_container fixture handles the build and will fail if build fails
        assert built_container is not None
        assert "model-interface-request-handler" in built_container
    
    def test_container_has_required_dependencies(
        self, 
        container_runtime: str, 
        built_container: str,
        test_environment_variables: Dict[str, str]
    ):
        """Test that all required dependencies are available in the container."""
        
        # Create environment args for container
        env_args = []
        for key, value in test_environment_variables.items():
            env_args.extend(["-e", f"{key}={value}"])
        
        test_script = '''
import sys
import os
os.chdir('/var/task')
sys.path.insert(0, '/var/task')

# Test core dependencies
dependencies = [
    ('boto3', 'AWS SDK'),
    ('aws_lambda_powertools', 'Lambda Powertools'),
    ('opensearchpy', 'OpenSearch Python Client'),
    ('psycopg2', 'PostgreSQL Client'),
    ('pydantic', 'Pydantic'),
    ('langchain_community', 'LangChain Community'),
    ('langchain_aws', 'LangChain AWS'),
    ('openai', 'OpenAI Client'),
]

failed_imports = []
for module, description in dependencies:
    try:
        __import__(module)
        print(f"✅ {description}: {module}")
    except ImportError as e:
        print(f"❌ {description}: {module} - {e}")
        failed_imports.append(module)

# Test genai_core and adapters (may have AWS warnings)
try:
    import genai_core
    print("✅ GenAI Core: genai_core")
except ImportError as e:
    print(f"❌ GenAI Core: genai_core - {e}")
    failed_imports.append('genai_core')
except Exception as e:
    print(f"⚠️  GenAI Core: genai_core - Warning: {e}")

try:
    import adapters
    print("✅ Adapters: adapters")
except ImportError as e:
    print(f"❌ Adapters: adapters - {e}")
    failed_imports.append('adapters')
except Exception as e:
    print(f"⚠️  Adapters: adapters - Warning: {e}")

if failed_imports:
    print(f"Failed imports: {failed_imports}")
    sys.exit(1)
else:
    print("All imports successful!")
    sys.exit(0)
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
        
        assert result.returncode == 0, f"Container dependency test failed: {result.stdout}"
    
    def test_langchain_functionality(
        self, 
        container_runtime: str, 
        built_container: str,
        test_environment_variables: Dict[str, str]
    ):
        """Test that LangChain functionality works correctly."""
        
        # Create environment args for container
        env_args = []
        for key, value in test_environment_variables.items():
            env_args.extend(["-e", f"{key}={value}"])
        
        test_script = '''
import sys
import os
os.chdir('/var/task')
sys.path.insert(0, '/var/task')

# Test LangChain specific functionality
try:
    from langchain_community.chat_models import ChatOpenAI
    print("✅ ChatOpenAI import successful")
except ImportError as e:
    print(f"❌ ChatOpenAI import failed: {e}")
    sys.exit(1)

try:
    from langchain_aws.chat_models import ChatBedrock
    print("✅ ChatBedrock import successful")
except ImportError as e:
    print(f"❌ ChatBedrock import failed: {e}")
    sys.exit(1)

# Test version requirements
import langchain_community
import openai

print(f"langchain_community version: {getattr(langchain_community, '__version__', 'unknown')}")
print(f"openai version: {getattr(openai, '__version__', 'unknown')}")

# Verify no deprecated imports
try:
    from langchain.chat_models import ChatOpenAI as DeprecatedChatOpenAI
    print("⚠️  Deprecated langchain.chat_models import still works (should be avoided)")
except ImportError:
    print("✅ Deprecated langchain.chat_models import properly removed")

print("LangChain functionality test completed successfully")
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
        
        assert result.returncode == 0, f"LangChain functionality test failed: {result.stdout}"
    
    def test_handler_import(
        self, 
        container_runtime: str, 
        built_container: str,
        test_environment_variables: Dict[str, str]
    ):
        """Test that the Lambda handler can be imported."""
        
        # Create environment args for container
        env_args = []
        for key, value in test_environment_variables.items():
            env_args.extend(["-e", f"{key}={value}"])
        
        test_script = '''
import sys
import os
os.chdir('/var/task')
sys.path.insert(0, '/var/task')

try:
    from index import handler
    print("✅ Handler import successful")
    print(f"Handler function: {handler}")
except ImportError as e:
    print(f"❌ Handler import failed: {e}")
    sys.exit(1)
except Exception as e:
    print(f"⚠️  Handler import warning: {e}")

print("Handler import test completed successfully")
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
        
        assert result.returncode == 0, f"Handler import test failed: {result.stdout}"


@pytest.mark.container
@pytest.mark.slow
class TestContainerPerformance:
    """Test container performance characteristics."""
    
    def test_container_startup_time(
        self, 
        container_runtime: str, 
        built_container: str,
        test_environment_variables: Dict[str, str]
    ):
        """Test that container starts up within reasonable time."""
        import time
        
        # Create environment args for container
        env_args = []
        for key, value in test_environment_variables.items():
            env_args.extend(["-e", f"{key}={value}"])
        
        start_time = time.time()
        
        cmd = [
            container_runtime, "run", "--rm",
            "--entrypoint", "python",
            *env_args,
            built_container,
            "-c", "print('Container started successfully')"
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        end_time = time.time()
        startup_time = end_time - start_time
        
        print(f"Container startup time: {startup_time:.2f} seconds")
        
        assert result.returncode == 0, "Container failed to start"
        assert startup_time < 10.0, f"Container startup too slow: {startup_time:.2f}s > 10s"
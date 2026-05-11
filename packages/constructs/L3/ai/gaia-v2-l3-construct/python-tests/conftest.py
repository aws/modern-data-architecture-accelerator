"""
Shared pytest fixtures and path setup for the GAIA v2 L3 construct Python tests.

The tests exercise three separate Lambda source trees inside lib/. Each tree is
added to sys.path here so the tests can import their target modules by name
(for example ``from routes.feedback import submit_feedback``).
"""

import os
import sys

# Set AWS region before any boto3 imports to avoid NoRegionError during module load.
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")

_THIS_DIR = os.path.dirname(os.path.abspath(__file__))
_PACKAGE_ROOT = os.path.abspath(os.path.join(_THIS_DIR, ".."))

# Lambda source roots that the tests import from.
_LAMBDA_SOURCE_PATHS = [
    os.path.join(_PACKAGE_ROOT, "lib", "chatbot-api", "rest-api", "function", "api-handler"),
    os.path.join(_PACKAGE_ROOT, "lib", "chatbot-api", "websocket-api", "datasource", "layer", "python"),
    os.path.join(_PACKAGE_ROOT, "lib", "function"),
]

for path in _LAMBDA_SOURCE_PATHS:
    if path not in sys.path:
        sys.path.insert(0, path)

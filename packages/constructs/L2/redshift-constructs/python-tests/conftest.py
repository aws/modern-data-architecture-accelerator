import sys
import os

# Set a default region so the module-level boto3.client() call in snapshot_copy.py
# does not fail during import (before mocks are in place)
os.environ.setdefault('AWS_DEFAULT_REGION', 'us-east-1')

# Add the Lambda source to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'lambda', 'snapshot_copy'))

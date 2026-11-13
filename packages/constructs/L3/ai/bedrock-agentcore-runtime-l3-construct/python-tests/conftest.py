"""
Shared pytest setup for the AgentCore Runtime containment runbook scripts.
"""
import os
import sys

os.environ['AWS_ACCESS_KEY_ID'] = 'testing'
os.environ['AWS_SECRET_ACCESS_KEY'] = 'testing'
os.environ['AWS_SECURITY_TOKEN'] = 'testing'
os.environ['AWS_SESSION_TOKEN'] = 'testing'
os.environ['AWS_DEFAULT_REGION'] = 'us-east-1'

src_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'automation', 'containment')
if src_path not in sys.path:
    sys.path.insert(0, src_path)

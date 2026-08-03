"""
Shared pytest fixtures for HealthLake Constructs Lambda tests.
"""
import os
import sys

lambda_dirs = [
    'datastore_replacement_guard',
]

for lambda_dir in lambda_dirs:
    src_path = os.path.join(os.path.dirname(__file__), '..', 'src', 'lambda', lambda_dir)
    if src_path not in sys.path:
        sys.path.insert(0, src_path)

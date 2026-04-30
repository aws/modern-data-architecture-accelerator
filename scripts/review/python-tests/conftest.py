"""
Shared pytest fixtures for baseline review tests.
"""
import os
import sys

# Add the scripts/review/lib and scripts/review/baseline directories to Python path
# so we can import the modules under test.
review_root = os.path.join(os.path.dirname(__file__), "..")
scripts_root = os.path.join(review_root, "..")
sys.path.insert(0, scripts_root)

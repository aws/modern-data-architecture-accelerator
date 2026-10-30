"""
Shared pytest fixtures for the M2M API presigned URL Lambda tests.
"""

import json
import os
import sys
from unittest.mock import MagicMock

import pytest

# The function reads its settings when it is imported.
os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
os.environ.setdefault("EXPIRY_TIME_SECONDS", "600")
os.environ.setdefault("TARGET_BUCKET", "test-bucket")
os.environ.setdefault("TARGET_PREFIX", "testing")
os.environ.setdefault("METADATA_TARGET_PREFIX", "metadata-testing")
os.environ.setdefault("EVENT_METADATA_MAPPINGS", json.dumps({"RequestTime": "requestContext.requestTime"}))
# Presigning is local, but needs credentials to sign with.
os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")

# Add the source directory to Python path
src_path = os.path.join(os.path.dirname(__file__), "..", "src", "lambda", "s3_url")
sys.path.insert(0, src_path)

# Imported after the environment and path are set above.
import s3_url

UPLOAD_ID = "test-upload-id"
PRESIGNED_URL = "https://test-bucket.s3.amazonaws.com/presigned"


@pytest.fixture
def s3(monkeypatch):
    """Replace the function's S3 client and resource. Returns the client; the resource is `s3.resource`."""
    client = MagicMock()
    client.generate_presigned_url.return_value = PRESIGNED_URL
    client.create_multipart_upload.return_value = {"UploadId": UPLOAD_ID}
    resource = MagicMock()
    resource.MultipartUpload.return_value.parts.all.return_value = []
    client.resource = resource
    monkeypatch.setattr(s3_url, "s3", client)
    monkeypatch.setattr(s3_url.boto3, "resource", MagicMock(return_value=resource))
    return client


@pytest.fixture
def caller_key_path(monkeypatch):
    """Turn on ALLOW_CALLER_KEY_PATH."""
    monkeypatch.setattr(s3_url, "allow_caller_key_path", True)


def make_event(flow, **params):
    """API Gateway proxy event for GET /upload/<flow>. With no params, queryStringParameters is None, as
    API Gateway sends it."""
    return {
        "resource": "/upload/{proxy+}",
        "path": f"/upload/{flow}",
        "httpMethod": "GET",
        "queryStringParameters": params or None,
        "requestContext": {"requestTime": "26/Oct/2026:12:00:00 +0000"},
    }

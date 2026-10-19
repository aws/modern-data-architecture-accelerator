"""
Unit tests for GenAI Accelerator Knowledge Base Custom Transform Lambda.
"""
import pytest
import json
from unittest.mock import patch
from botocore.exceptions import ClientError
from moto import mock_aws
import boto3

import kb_custom_transform

BUCKET_NAME = "test-bucket"
BATCH_KEY = "processed/test.JSON"
TRANSFORMED_KEY = "processed/test_transformed.JSON"


@pytest.fixture
def s3_client(aws_credentials, monkeypatch):
    """Mock S3 with the intermediate storage bucket, used by the transformer in place of its own client."""
    with mock_aws():
        client = boto3.client('s3', region_name='us-east-1')
        client.create_bucket(Bucket=BUCKET_NAME)
        monkeypatch.setattr(kb_custom_transform, "s3_client", client)
        yield client


def put_batch(s3_client, key, file_contents):
    """Write a content batch in the form the ingestion job writes it."""
    s3_client.put_object(Bucket=BUCKET_NAME, Key=key, Body=json.dumps({"fileContents": file_contents}))


def read_batch(s3_client, key):
    """Read a content batch written by the transformer."""
    return json.loads(s3_client.get_object(Bucket=BUCKET_NAME, Key=key)['Body'].read())


def text_chunk(body, content_type="PLAIN_TEXT"):
    """A text chunk of a content batch, of the type the ingestion job writes by default."""
    return {"contentBody": body, "contentType": content_type, "contentMetadata": {"page": "1"}}


class TestLambdaHandler:
    """Test cases for lambda_handler function."""

    def test_transform_success(self, s3_client, lambda_context, sample_kb_transform_event):
        """Test successful document transformation."""
        put_batch(s3_client, BATCH_KEY, [text_chunk("This is a test document")])

        result = kb_custom_transform.lambda_handler(sample_kb_transform_event, lambda_context)

        assert len(result["outputFiles"]) == 1
        output_file = result["outputFiles"][0]
        input_file = sample_kb_transform_event["inputFiles"][0]
        assert output_file["originalFileLocation"] == input_file["originalFileLocation"]
        assert output_file["fileMetadata"]["title"] == "Test Document"
        assert output_file["fileMetadata"]["processorVersion"] == "1.0.0"
        assert "processedDate" in output_file["fileMetadata"]
        assert output_file["contentBatches"] == [{"key": TRANSFORMED_KEY}]

        assert read_batch(s3_client, TRANSFORMED_KEY) == {
            "fileContents": [text_chunk("[PRODUCT DOCUMENTATION] This is a test document")]
        }

    def test_empty_input_files(self, lambda_context):
        """Test handling of empty input files."""
        event = {
            "bucketName": BUCKET_NAME,
            "inputFiles": []
        }

        result = kb_custom_transform.lambda_handler(event, lambda_context)

        assert result == {"outputFiles": []}

    def test_missing_bucket_name(self, lambda_context, sample_kb_transform_event):
        """Test that an event without a bucket name is raised."""
        del sample_kb_transform_event["bucketName"]

        with pytest.raises(KeyError, match="bucketName"):
            kb_custom_transform.lambda_handler(sample_kb_transform_event, lambda_context)

    def test_unexpected_error_is_raised(self, s3_client, lambda_context, sample_kb_transform_event):
        """Test that an error reading a batch fails the invocation instead of returning the batch untransformed."""
        with patch.object(kb_custom_transform.s3_client, "get_object", side_effect=RuntimeError("boom")):
            with pytest.raises(RuntimeError, match="boom"):
                kb_custom_transform.lambda_handler(sample_kb_transform_event, lambda_context)

    def test_missing_batch_is_raised(self, s3_client, lambda_context, sample_kb_transform_event):
        """Test that a batch missing from the bucket fails the invocation."""
        with pytest.raises(ClientError, match="NoSuchKey"):
            kb_custom_transform.lambda_handler(sample_kb_transform_event, lambda_context)


class TestTransformFile:
    """Test cases for transform_file function."""

    def test_transform_file_with_content(self, s3_client):
        """Test that each batch of a file is transformed."""
        put_batch(s3_client, "batches/1.JSON", [text_chunk("First chunk"), text_chunk("Second chunk")])
        put_batch(s3_client, "batches/2.json", [text_chunk("Third chunk")])
        input_file = {
            "originalFileLocation": {"type": "S3", "s3_location": {"uri": "s3://docs/test.pdf"}},
            "fileMetadata": {"title": "Test Document"},
            "contentBatches": [{"key": "batches/1.JSON"}, {"key": "batches/2.json"}]
        }

        result = kb_custom_transform.transform_file(input_file, BUCKET_NAME)

        assert result["contentBatches"] == [
            {"key": "batches/1_transformed.JSON"},
            {"key": "batches/2_transformed.json"},
        ]
        assert read_batch(s3_client, "batches/1_transformed.JSON")["fileContents"] == [
            text_chunk("[PRODUCT DOCUMENTATION] First chunk"),
            text_chunk("[PRODUCT DOCUMENTATION] Second chunk"),
        ]
        assert read_batch(s3_client, "batches/2_transformed.json")["fileContents"] == [
            text_chunk("[PRODUCT DOCUMENTATION] Third chunk"),
        ]

    def test_transform_file_no_content_batches(self):
        """Test file transformation with no content batches."""
        input_file = {
            "originalFileLocation": {"type": "S3", "s3_location": {"uri": "s3://docs/test.pdf"}},
            "fileMetadata": {"title": "Test Document"},
            "contentBatches": []
        }

        result = kb_custom_transform.transform_file(input_file, BUCKET_NAME)

        assert result["fileMetadata"]["title"] == "Test Document"
        assert result["contentBatches"] == []

    def test_batch_without_key_is_raised(self):
        """Test that a batch without a key is raised instead of dropped."""
        input_file = {
            "originalFileLocation": {"type": "S3", "s3_location": {"uri": "s3://docs/test.pdf"}},
            "contentBatches": [{}]
        }

        with pytest.raises(KeyError, match="key"):
            kb_custom_transform.transform_file(input_file, BUCKET_NAME)


class TestTransformContent:
    """Test cases for transform_content function."""

    @pytest.mark.parametrize("content_type", ["PLAIN_TEXT", "TEXT"])
    def test_transform_text_content(self, content_type):
        """Test that the body of a text chunk is prefixed, and its type and metadata are kept."""
        content = text_chunk("Original text", content_type)

        result = kb_custom_transform.transform_content(content)

        assert result == text_chunk("[PRODUCT DOCUMENTATION] Original text", content_type)
        assert content == text_chunk("Original text", content_type)

    @pytest.mark.parametrize("content", [
        {"contentBody": "some data", "contentType": "PDF", "contentMetadata": {}},
        {"contentBody": "some data"},
    ])
    def test_transform_non_text_content(self, content):
        """Test that content other than text is returned as is."""
        assert kb_custom_transform.transform_content(content) == content

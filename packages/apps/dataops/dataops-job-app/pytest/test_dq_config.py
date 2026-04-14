"""
Unit tests for dq_config.py — adapted from DF's pytest/test_dq_config.py.
Tests get_rulesets (generator), get_source_data_frame, get_config, and s3parse.
"""

import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from dq_config import get_source_data_frame, get_config, get_rulesets, s3parse


# --- s3parse ---

def test_s3parse():
    bucket, key = s3parse("s3://my-bucket/path/to/file.txt")
    assert bucket == "my-bucket"
    assert key == "path/to/file.txt"


def test_s3parse_root_key():
    bucket, key = s3parse("s3://my-bucket/file.txt")
    assert bucket == "my-bucket"
    assert key == "file.txt"


# --- get_config ---

def test_get_config(tmp_path):
    config_file = tmp_path / "config.json"
    config_file.write_text(json.dumps({"publishers": {"smus": {"domainId": "d123"}}}))
    result = get_config(str(config_file))
    assert result == {"publishers": {"smus": {"domainId": "d123"}}}


def test_get_config_empty(tmp_path):
    config_file = tmp_path / "config.json"
    config_file.write_text("{}")
    result = get_config(str(config_file))
    assert result == {}


def test_get_config_file_not_found():
    with pytest.raises(ValueError, match="not found"):
        get_config("/nonexistent/config.json")


def test_get_config_invalid_json(tmp_path):
    config_file = tmp_path / "config.json"
    config_file.write_text("not json {{{")
    with pytest.raises(ValueError, match="invalid JSON"):
        get_config(str(config_file))


def test_get_config_not_dict(tmp_path):
    config_file = tmp_path / "config.json"
    config_file.write_text('["a list"]')
    with pytest.raises(ValueError, match="must contain a JSON object"):
        get_config(str(config_file))


def test_get_config_publishers_not_dict(tmp_path):
    config_file = tmp_path / "config.json"
    config_file.write_text('{"publishers": "bad"}')
    with pytest.raises(ValueError, match="'publishers' in config must be a JSON object"):
        get_config(str(config_file))


# --- get_rulesets ---

def test_get_rulesets_dqdl_only():
    config = {
        "rulesets": {
            "ruleset1": {"type": "dqdl", "value": "Rules = [RowCount > 0]"},
            "ruleset2": {"type": "dqdl", "value": "Rules = [ColumnCount > 5]"},
        }
    }
    result = dict(get_rulesets(config))
    assert result == {
        "ruleset1": "Rules = [RowCount > 0]",
        "ruleset2": "Rules = [ColumnCount > 5]",
    }


def test_get_rulesets_empty():
    config = {"rulesets": {}}
    result = dict(get_rulesets(config))
    assert result == {}


@patch("dq_config.read_s3_object")
def test_get_rulesets_s3_type(mock_read_s3):
    mock_read_s3.return_value = "Rules = [S3Rule > 0]"
    config = {
        "rulesets": {
            "inline": {"type": "dqdl", "value": "Rules = [RowCount > 0]"},
            "from_s3": {"type": "s3", "value": "s3://bucket/rules.txt"},
        }
    }
    result = dict(get_rulesets(config))
    assert result == {
        "inline": "Rules = [RowCount > 0]",
        "from_s3": "Rules = [S3Rule > 0]",
    }
    mock_read_s3.assert_called_once_with("bucket", "rules.txt")


@patch("dq_config.glue_client")
def test_get_rulesets_glue_recommendations(mock_glue):
    mock_glue.get_data_quality_ruleset.return_value = {
        "Ruleset": "Rules = [IsComplete \"id\"]"
    }
    config = {
        "rulesets": {
            "recommended": {
                "type": "glue_recommendations",
                "rulesetName": "my-recommendation-ruleset",
            }
        }
    }
    result = dict(get_rulesets(config))
    assert result == {"recommended": "Rules = [IsComplete \"id\"]"}
    mock_glue.get_data_quality_ruleset.assert_called_once_with(
        Name="my-recommendation-ruleset"
    )


# --- get_source_data_frame ---

@pytest.fixture
def mock_glue_context():
    context = Mock()
    context.create_dynamic_frame = Mock()
    context.create_dynamic_frame.from_catalog = Mock()
    context.create_dynamic_frame.from_options = Mock()
    return context


def test_get_source_data_frame_glue_type(mock_glue_context):
    config = {
        "source": {"type": "glue", "database": "test_db", "table_name": "test_table"}
    }
    get_source_data_frame(mock_glue_context, config)
    mock_glue_context.create_dynamic_frame.from_catalog.assert_called_once_with(
        transformation_ctx="source_data_frame",
        database="test_db",
        table_name="test_table",
    )


def test_get_source_data_frame_s3_type(mock_glue_context):
    config = {
        "source": {
            "type": "s3",
            "connection_options": {"paths": ["s3://bucket/path"]},
            "format": "json",
        }
    }
    get_source_data_frame(mock_glue_context, config)
    mock_glue_context.create_dynamic_frame.from_options.assert_called_once_with(
        connection_type="s3",
        transformation_ctx="source_data_frame",
        connection_options={"paths": ["s3://bucket/path"]},
        format="json",
    )


@patch("dq_config.boto3")
def test_get_source_data_frame_with_secret(mock_boto3, mock_glue_context):
    mock_secrets = Mock()
    mock_boto3.client.return_value = mock_secrets
    mock_secrets.get_secret_value.return_value = {
        "SecretString": json.dumps({"username": "admin", "password": "secret123"})
    }
    config = {
        "source": {
            "type": "redshift",
            "connection_options": {
                "url": "jdbc:redshift://host:5439/db",
                "dbtable": "public.table",
                "secret_arn": "arn:aws:secretsmanager:us-west-2:123:secret:my-secret",
            },
        }
    }
    get_source_data_frame(mock_glue_context, config)
    mock_glue_context.create_dynamic_frame.from_options.assert_called_once()
    call_kwargs = mock_glue_context.create_dynamic_frame.from_options.call_args
    conn_opts = call_kwargs.kwargs.get("connection_options") or call_kwargs[1].get("connection_options")
    assert conn_opts["user"] == "admin"
    assert conn_opts["password"] == "secret123"

"""
Unit tests for dq-main.py — the entry point script.
Since dq-main.py runs everything at module level, we test it by
executing it via runpy with all Glue modules mocked (via conftest).
"""

import json
import sys
import runpy
import pytest
from unittest.mock import Mock, patch, MagicMock


APPLICATION_OPTS = json.dumps({
    "table": {
        "name": "customers",
        "source": {"type": "glue", "database": "test_db", "table_name": "customers"},
        "rulesets": {
            "completeness": {"type": "dqdl", "value": "Rules = [IsComplete \"id\", RowCount > 0]"}
        },
    }
})

APPLICATION_OPTS_WITH_SMUS = json.dumps({
    "table": {
        "name": "customers",
        "source": {"type": "glue", "database": "test_db", "table_name": "customers"},
        "rulesets": {
            "completeness": {"type": "dqdl", "value": "Rules = [RowCount > 0]"}
        },
        "smusAssetIds": ["asset-123"],
        "smusSourceAssetId": "source-456",
    }
})


def setup_glue_mocks():
    """Set up mock return values for Glue runtime objects."""
    mock_resolved = {
        "JOB_NAME": "test-job",
        "application_opts": APPLICATION_OPTS,
    }
    sys.modules["awsglue.utils"].getResolvedOptions = Mock(return_value=mock_resolved)

    mock_sc = Mock()
    sys.modules["pyspark.context"].SparkContext = Mock(return_value=mock_sc)

    mock_glue_ctx = Mock()
    sys.modules["awsglue.context"].GlueContext = Mock(return_value=mock_glue_ctx)

    mock_job = Mock()
    sys.modules["awsglue.job"].Job = Mock(return_value=mock_job)

    mock_dq_results = Mock()
    sys.modules["awsgluedq.transforms"].EvaluateDataQuality = Mock(
        return_value=Mock(process_rows=Mock(return_value=mock_dq_results))
    )

    mock_rule_outcomes = Mock()
    sys.modules["awsglue.transforms"].SelectFromCollection = Mock()
    sys.modules["awsglue.transforms"].SelectFromCollection.apply = Mock(
        return_value=mock_rule_outcomes
    )

    return {
        "glue_context": mock_glue_ctx,
        "job": mock_job,
        "dq_results": mock_dq_results,
        "rule_outcomes": mock_rule_outcomes,
    }


@patch("dq_config.get_config", return_value={"publishers": {}})
@patch("dq_config.get_source_data_frame", return_value=Mock())
def test_dq_main_runs_evaluation(mock_source, mock_config):
    mocks = setup_glue_mocks()

    # Remove dq_main from cache if previously imported
    sys.modules.pop("dq_main", None)
    sys.modules.pop("dq-main", None)

    import importlib
    import os
    assets_path = os.path.join(os.path.dirname(__file__), "..", "assets")
    spec = importlib.util.spec_from_file_location("dq_main", os.path.join(assets_path, "dq-main.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    # Verify job was initialized and committed
    mocks["job"].init.assert_called_once_with("test-job", {
        "JOB_NAME": "test-job",
        "application_opts": APPLICATION_OPTS,
    })
    mocks["job"].commit.assert_called_once()

    # Verify DQ evaluation was called
    sys.modules["awsgluedq.transforms"].EvaluateDataQuality.return_value.process_rows.assert_called_once()

    # Verify SelectFromCollection was called
    sys.modules["awsglue.transforms"].SelectFromCollection.apply.assert_called_once()

    # Verify source data frame was loaded
    mock_source.assert_called_once()


@patch("smus.post_dq_results", return_value=Mock())
@patch("dq_config.get_config", return_value={"publishers": {"smus": {"domainId": "d-123"}}})
@patch("dq_config.get_source_data_frame", return_value=Mock())
def test_dq_main_calls_smus_when_configured(mock_source, mock_config, mock_post):
    mock_resolved = {
        "JOB_NAME": "test-job-smus",
        "application_opts": APPLICATION_OPTS_WITH_SMUS,
    }
    sys.modules["awsglue.utils"].getResolvedOptions = Mock(return_value=mock_resolved)

    mock_job = Mock()
    sys.modules["awsglue.job"].Job = Mock(return_value=mock_job)

    sys.modules.pop("dq_main", None)

    import importlib
    import os
    assets_path = os.path.join(os.path.dirname(__file__), "..", "assets")
    spec = importlib.util.spec_from_file_location("dq_main_smus", os.path.join(assets_path, "dq-main.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    mock_post.assert_called_once()
    call_kwargs = mock_post.call_args
    assert call_kwargs.kwargs.get("domain_id") or call_kwargs[1].get("domain_id") == "d-123"


@patch("dq_config.get_config", return_value={"publishers": {}})
@patch("dq_config.get_source_data_frame", return_value=Mock())
def test_dq_main_skips_smus_when_not_configured(mock_source, mock_config):
    mocks = setup_glue_mocks()

    sys.modules.pop("dq_main", None)

    with patch("smus.post_dq_results") as mock_post:
        import importlib
        import os
        assets_path = os.path.join(os.path.dirname(__file__), "..", "assets")
        spec = importlib.util.spec_from_file_location("dq_main_no_smus", os.path.join(assets_path, "dq-main.py"))
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)

        mock_post.assert_not_called()

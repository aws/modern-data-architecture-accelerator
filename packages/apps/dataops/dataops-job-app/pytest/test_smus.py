"""
Unit tests for smus.py — tests SMUS client creation, asset search, score calculation,
and result posting.
"""

import json
import pytest
from unittest.mock import Mock, patch, MagicMock
from smus import (
    create_smus_client,
    get_current_region,
    calculate_score,
    process_evaluation,
    generate_ts_form,
    search_asset_id,
    DataQualityJobError,
)


# --- calculate_score ---

def test_calculate_score_all_pass():
    results = [Mock(Outcome="Passed"), Mock(Outcome="Passed"), Mock(Outcome="Passed")]
    assert calculate_score(results) == 100.0


def test_calculate_score_partial():
    results = [Mock(Outcome="Passed"), Mock(Outcome="Failed")]
    assert calculate_score(results) == 50.0


def test_calculate_score_all_fail():
    results = [Mock(Outcome="Failed"), Mock(Outcome="Failed")]
    assert calculate_score(results) == 0.0


def test_calculate_score_empty():
    assert calculate_score([]) == 0.0


# --- process_evaluation ---

def test_process_evaluation_pass():
    evaluation = Mock(
        Rule='IsComplete "customer_id"',
        EvaluatedMetrics={"Column.customer_id.Completeness": 1.0},
        Outcome="Passed",
        FailureReason=None,
    )
    result = process_evaluation(evaluation)
    assert result["status"] == "PASS"
    assert result["applicableFields"] == ["customer_id"]
    assert "Completeness" in result["types"]


def test_process_evaluation_fail():
    evaluation = Mock(
        Rule='RowCount > 0',
        EvaluatedMetrics={"Dataset.*.RowCount": 0},
        Outcome="Failed",
        FailureReason="RowCount was 0",
    )
    result = process_evaluation(evaluation)
    assert result["status"] == "FAIL"
    assert "EVALUATION_MESSAGE" in result["details"]


# --- create_smus_client ---

@patch("smus.boto3")
def test_create_smus_client_no_role(mock_boto3):
    mock_client = Mock()
    mock_boto3.client.return_value = mock_client
    result = create_smus_client(None)
    mock_boto3.client.assert_called_once_with("datazone")
    assert result == mock_client


@patch("smus.get_current_region", return_value="us-west-2")
@patch("smus.boto3")
def test_create_smus_client_with_role(mock_boto3, mock_region):
    mock_sts = Mock()
    mock_boto3.client.side_effect = [mock_sts, Mock()]
    mock_sts.assume_role.return_value = {
        "Credentials": {
            "AccessKeyId": "AKIA...",
            "SecretAccessKey": "secret",
            "SessionToken": "token",
        }
    }
    result = create_smus_client("arn:aws:iam::123:role/my-role")
    mock_sts.assume_role.assert_called_once()


# --- search_asset_id ---

@patch("smus.boto3")
def test_search_asset_id_empty_source(mock_boto3):
    mock_client = Mock()
    result = search_asset_id(mock_client, "domain-123", None)
    assert result == []


# --- generate_ts_form ---

def test_generate_ts_form():
    results = [
        Mock(
            Rule='IsComplete "id"',
            EvaluatedMetrics={"Column.id.Completeness": 1.0},
            Outcome="Passed",
            FailureReason=None,
        )
    ]
    form = generate_ts_form(results, "my-ruleset")
    assert form["formName"] == "my-ruleset"
    assert form["typeIdentifier"] == "amazon.datazone.DataQualityResultFormType"
    content = json.loads(form["content"])
    assert content["evaluationsCount"] == 1
    assert content["passingPercentage"] == 100.0

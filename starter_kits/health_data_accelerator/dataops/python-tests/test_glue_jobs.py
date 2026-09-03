"""
Regression tests that execute the HDA Glue job scripts with mocked AWS Glue and Spark runtimes.
"""

import datetime as real_datetime
import json
import runpy
import sys
import types
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

import boto3
import pytest


GLUE_SOURCE_DIR = Path(__file__).resolve().parents[1] / "src" / "glue"
GLUE_JOB_CASES = [
    pytest.param(
        GLUE_SOURCE_DIR / "file_processor" / "odpf_file_processor.py",
        {
            "batch_chunk": [
                {
                    "raw_database_S3_bucket": "raw-bucket",
                    "raw_table_name": "patients",
                    "source_table_name": "patients",
                }
            ],
            "ddb_file_tracker_table": "file-tracker",
            "ddb_file_tracker_history_table": "file-tracker-history",
            "ddb_file_processing_tracker_table": "processing-tracker",
            "ddb_file_processing_tracker_history_table": "processing-tracker-history",
        },
        id="file-processor",
    ),
    pytest.param(
        GLUE_SOURCE_DIR / "transformation" / "surveys_transformation_job.py",
        {
            "curated_bucket_name": "curated-bucket",
            "raw_catalog_name": "raw_catalog",
            "curated_catalog_name": "curated_catalog",
        },
        id="surveys-transformation",
    ),
    pytest.param(
        GLUE_SOURCE_DIR / "transformation" / "vitals_transformation_job.py",
        {
            "curated_bucket_name": "curated-bucket",
            "raw_catalog_name": "raw_catalog",
            "curated_catalog_name": "curated_catalog",
        },
        id="vitals-transformation",
    ),
]


def _module(name, **attributes):
    module = types.ModuleType(name)
    module.__dict__.update(attributes)
    return module


def _install_mock_runtime(monkeypatch, raw_input_params):
    get_resolved_options = MagicMock(
        return_value={
            "JOB_NAME": "test-job",
            "JOB_RUN_ID": "test-run",
            "input_params": raw_input_params,
        }
    )

    awsglue = _module("awsglue")
    awsglue.__path__ = []
    awsglue_transforms = _module("awsglue.transforms", __all__=[])
    awsglue_utils = _module("awsglue.utils", getResolvedOptions=get_resolved_options)
    glue_context = MagicMock(name="GlueContext")
    awsglue_context = _module("awsglue.context", GlueContext=glue_context)
    awsglue_job = _module("awsglue.job", Job=MagicMock(name="Job"))
    awsglue_dynamicframe = _module(
        "awsglue.dynamicframe",
        DynamicFrame=MagicMock(name="DynamicFrame"),
        DynamicFrameReader=MagicMock(name="DynamicFrameReader"),
        DynamicFrameWriter=MagicMock(name="DynamicFrameWriter"),
        DynamicFrameCollection=MagicMock(name="DynamicFrameCollection"),
    )

    spark_frame = MagicMock(name="SparkDataFrame")
    spark_frame.columns = []
    spark_frame.collect.return_value = []
    spark_frame.drop.return_value = spark_frame
    spark_frame.select.return_value = spark_frame
    spark_frame.withColumn.return_value = spark_frame
    spark_frame.withColumnRenamed.return_value = spark_frame

    pandas_frame = MagicMock(name="PandasDataFrame")
    spark_frame.toPandas.return_value = pandas_frame

    spark = MagicMock(name="SparkSession")
    spark.read.format.return_value.option.return_value.load.return_value = spark_frame
    spark.sql.return_value = spark_frame
    spark.createDataFrame.return_value = spark_frame

    spark_context = MagicMock(name="SparkContext")
    spark_conf = MagicMock(name="SparkConf")
    glue_context.return_value.spark_session = spark

    pyspark = _module("pyspark")
    pyspark.__path__ = []
    pyspark_context = _module(
        "pyspark.context",
        SparkContext=spark_context,
        SparkConf=spark_conf,
    )
    pyspark_sql = _module("pyspark.sql")
    pyspark_sql.__path__ = []
    pyspark_sql_functions = _module(
        "pyspark.sql.functions",
        __all__=[],
        lit=MagicMock(name="lit"),
        col=MagicMock(name="col"),
        expr=MagicMock(name="expr"),
        dayofmonth=MagicMock(name="dayofmonth"),
        month=MagicMock(name="month"),
        udf=MagicMock(name="udf"),
    )
    pyspark_sql_types = _module(
        "pyspark.sql.types",
        StringType=MagicMock(name="StringType"),
    )

    pandas = _module("pandas", DataFrame=MagicMock(name="DataFrame"))

    class FixedDate(real_datetime.date):
        @classmethod
        def today(cls):
            return cls(2026, 9, 3)

    datetime = _module(
        "datetime",
        date=FixedDate,
        datetime=real_datetime.datetime,
        timedelta=real_datetime.timedelta,
    )

    mock_modules = {
        "awsglue": awsglue,
        "awsglue.transforms": awsglue_transforms,
        "awsglue.utils": awsglue_utils,
        "awsglue.context": awsglue_context,
        "awsglue.job": awsglue_job,
        "awsglue.dynamicframe": awsglue_dynamicframe,
        "pyspark": pyspark,
        "pyspark.context": pyspark_context,
        "pyspark.sql": pyspark_sql,
        "pyspark.sql.functions": pyspark_sql_functions,
        "pyspark.sql.types": pyspark_sql_types,
        "pandas": pandas,
        "datetime": datetime,
    }
    for module_name, module in mock_modules.items():
        monkeypatch.setitem(sys.modules, module_name, module)

    paginator = MagicMock(name="DynamoDbPaginator")
    paginator.paginate.return_value = []
    dynamodb_resource = MagicMock(name="DynamoDbResource")
    dynamodb_resource.meta.client.get_paginator.return_value = paginator
    dynamodb_resource.Table.return_value.get_item.return_value = {}
    dynamodb_client = MagicMock(name="DynamoDbClient")

    monkeypatch.setattr(boto3, "resource", MagicMock(return_value=dynamodb_resource))
    monkeypatch.setattr(boto3, "client", MagicMock(return_value=dynamodb_client))

    return SimpleNamespace(
        get_resolved_options=get_resolved_options,
        spark_context=spark_context,
        glue_context=glue_context,
    )


@pytest.mark.glue
@pytest.mark.parametrize("script_path,valid_input_params", GLUE_JOB_CASES)
def test_glue_job_rejects_eval_payload_before_starting_spark(
    monkeypatch,
    tmp_path,
    script_path,
    valid_input_params,
):
    del valid_input_params
    marker_file = tmp_path / "eval-payload-executed"
    payload = (
        f'__import__("pathlib").Path({str(marker_file)!r}).write_text("executed") '
        "or {}"
    )
    runtime = _install_mock_runtime(monkeypatch, payload)

    with pytest.raises(json.JSONDecodeError):
        runpy.run_path(str(script_path), run_name="__main__")

    assert not marker_file.exists()
    runtime.spark_context.assert_not_called()
    runtime.glue_context.assert_not_called()


@pytest.mark.glue
@pytest.mark.parametrize("script_path,valid_input_params", GLUE_JOB_CASES)
def test_glue_job_runs_with_valid_json_input(
    monkeypatch,
    script_path,
    valid_input_params,
):
    runtime = _install_mock_runtime(monkeypatch, json.dumps(valid_input_params))

    runpy.run_path(str(script_path), run_name="__main__")

    runtime.get_resolved_options.assert_called_once()
    runtime.spark_context.assert_called_once()
    runtime.glue_context.assert_called_once()

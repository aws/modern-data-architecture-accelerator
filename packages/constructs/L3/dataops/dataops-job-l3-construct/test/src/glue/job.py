# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

import sys
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.dynamicframe import DynamicFrame
from awsglue.job import Job

# Invoke functions from other modules to avoid duplication of code
from core import job_metadata
job_metadata()

glueContext = GlueContext(SparkContext.getOrCreate())
spark = glueContext.spark_session

# catalog: database and table name
db_name = "payments"
tbl_name = "medicare"

# s3 output directories
medicare_cast = "s3://glue-sample-target/output-dir/medicare_json_cast"
medicare_project = "s3://glue-sample-target/output-dir/medicare_json_project"
medicare_cols = "s3://glue-sample-target/output-dir/medicare_json_make_cols"
medicare_struct = "s3://glue-sample-target/output-dir/medicare_json_make_struct"
medicare_sql = "s3://glue-sample-target/output-dir/medicare_json_sql"

# Read data into a dynamic frame
medicare_dyf = glueContext.create_dynamic_frame.from_catalog(
    database=db_name, table_name=tbl_name)

# The `provider id` field will be choice between long and string

# Cast choices into integers, those values that cannot cast result in null
medicare_res_cast = medicare_dyf.resolveChoice(
    specs=[('provider id', 'cast:long')])
medicare_res_project = medicare_dyf.resolveChoice(
    specs=[('provider id', 'project:long')])
medicare_res_make_cols = medicare_dyf.resolveChoice(
    specs=[('provider id', 'make_cols')])
medicare_res_make_struct = medicare_dyf.resolveChoice(
    specs=[('provider id', 'make_struct')])

# Spark SQL on a Spark dataframe
medicare_df = medicare_dyf.toDF()
medicare_df.createOrReplaceTempView("medicareTable")
medicare_sql_df = spark.sql(
    "SELECT * FROM medicareTable WHERE `total discharges` > 30")
medicare_sql_dyf = DynamicFrame.fromDF(
    medicare_sql_df, glueContext, "medicare_sql_dyf")

# Write it out in Json
glueContext.write_dynamic_frame.from_options(
    frame=medicare_res_cast, connection_type="s3", connection_options={"path": medicare_cast}, format="json")
glueContext.write_dynamic_frame.from_options(frame=medicare_res_project, connection_type="s3", connection_options={
                                             "path": medicare_project}, format="json")
glueContext.write_dynamic_frame.from_options(
    frame=medicare_res_make_cols, connection_type="s3", connection_options={"path": medicare_cols}, format="json")
glueContext.write_dynamic_frame.from_options(
    frame=medicare_res_make_struct, connection_type="s3", connection_options={"path": medicare_struct}, format="json")
glueContext.write_dynamic_frame.from_options(
    frame=medicare_sql_dyf, connection_type="s3", connection_options={"path": medicare_sql}, format="json")

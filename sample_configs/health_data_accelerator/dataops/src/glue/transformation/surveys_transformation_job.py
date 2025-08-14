import sys
import logging
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
import boto3
from pyspark.context import SparkConf
from awsglue.dynamicframe import DynamicFrame, DynamicFrameReader, DynamicFrameWriter, DynamicFrameCollection
from pyspark.sql.functions import lit, col, expr, dayofmonth, month
import pandas as pd
import json

args = getResolvedOptions(sys.argv, ["JOB_NAME", "input_params"])
input_params = eval(args["input_params"])
curated_s3_path = f"s3://{input_params['curated_bucket_name']}"

config = SparkConf().setAll(
    [
        ("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions"),
        ("spark.sql.catalog.glue_catalog", "org.apache.iceberg.spark.SparkCatalog"),
        ("spark.sql.catalog.glue_catalog.catalog-impl", "org.apache.iceberg.aws.glue.GlueCatalog"),
        ("spark.sql.catalog.glue_catalog.io-impl", "org.apache.iceberg.aws.s3.S3FileIO"),
        ("spark.sql.catalog.glue_catalog.warehouse", curated_s3_path),
        ("spark.sql.parquet.datetimeRebaseModeInRead", "CORRECTED")
    ]
)
sc = SparkContext(conf=config)
glueContext = GlueContext(sc)
spark = glueContext.spark_session

raw_catalog_db_name = input_params["raw_catalog_name"]
curated_catalog_db_name = input_params["curated_catalog_name"]
gc = "glue_catalog"
drop_columns = ["op", "cdc_timestamp_seq", "cdc_operation"]

def fetch_tables(table_names):
    for table in table_names:
        df = spark.read.format("iceberg").option("catalog", gc).load(f"{gc}.{raw_catalog_db_name}.{table}")
        df = df.drop(*drop_columns)
        df.createOrReplaceTempView(f"{table}_temp")

fetch_tables(["survey", "survey_assignment", "question", "survey_response", "organization"])


# survey_assignment_info table --> left outer join survey table on survey_assignment on survey_id
spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW survey_assignment_info AS
SELECT
    sa.id as survey_assignment_id,
    sa.name as survey_assignment_name,
    s.id as survey_id,
    s.alert_threshold,
    s.title as survey_name,
    sa.organization_id as organization_id,
    sa.subscriber_ids as subscriber_ids,
    sa.status as survey_assignment_status,
    s.status as survey_status,
    s.locale as locale,
    CASE WHEN sa.active = 't' OR sa.active = 'true' THEN true ELSE false END as is_survey_assignment_active,
    sa.assignment_type as assignment_type,
    sa.full_org_assigned as is_full_org_assigned,
    CASE WHEN s.active = 'true' OR s.active = 't' THEN true ELSE false END as is_survey_active,
    CASE WHEN s.has_vital_reminder = 'true' OR s.has_vital_reminder = 't' THEN true ELSE false END as has_vital_reminder,
    sa.created_at as created_at,
    sa.updated_at as updated_at,
    sa.description as survey_assignment_description,
    s.description as survey_description
FROM survey_assignment_temp sa
LEFT OUTER JOIN survey_temp s ON sa.survey_id = s.id
""")

# survey_response_question_merge --> joining question on survey_response and transforming single_choice_response to str
sr_question_merge_df = spark.sql("""
                                 SELECT
                                     sr.id as survey_response_id,
                                     sr.question_id,
                                     sr.question_type,
                                     CASE
                                         WHEN sr.yes_no_response = '{"value": true}' OR sr.yes_no_response = '{"value": yes}' OR sr.yes_no_response = '{"value": "yes"}' THEN 'yes'
                                         WHEN sr.yes_no_response = '{"value": false}' OR sr.yes_no_response = '{"value": no}' OR sr.yes_no_response = '{"value": "no"}' THEN 'no' END as transformed_yes_no_response,
                                     CASE WHEN sr.single_choice_response IS NOT NULL THEN get_json_object(single_choice_response, '$.id') END as transformed_id,
                                     q.question_options,
                                     q.media
                                 FROM survey_response_temp sr
                                          LEFT OUTER JOIN question_temp q on q.id = sr.question_id
                                 WHERE sr.single_choice_response IS NOT NULL OR sr.yes_no_response IS NOT NULL
                                 """)

# converting df to pandas because we need to parse question_options for value and score for single-choice-response and yes-no-response
sr_question_merge_pd_df = sr_question_merge_df.toPandas()

# method for getting single response value
def find_single_choice_values(row):
    if row['transformed_id'] != None:
        transformed_id = row['transformed_id']
        question_options = json.loads(row['question_options'])
        for option in question_options:
            if 'id' in option.keys() and option['id'] == transformed_id:
                return option['value']
        return None
    return None

# method for getting single response score and yes/no score
def find_scores(row):
    if row['question_type'] == 'single-choice':
        transformed_id = row['transformed_id']
        question_options = json.loads(row['question_options'])
        for option in question_options:
            if 'id' in option.keys() and 'score' in option.keys() and option['id'] == transformed_id:
                return int(option['score'])
        return None
    if row['question_type'] == 'yes/no':
        # yes/no
        yes_no_response = row['transformed_yes_no_response']
        question_options = json.loads(row['question_options'])
        for option in question_options:
            if 'value' in option.keys() and 'score' in option.keys() and option['value'] == yes_no_response:
                return int(option['score'])
        return None


sr_question_merge_pd_df['response_value'] = sr_question_merge_pd_df.apply(find_single_choice_values, axis=1)
sr_question_merge_pd_df['score'] = sr_question_merge_pd_df.apply(find_scores, axis=1)

survey_response_question_values = spark.createDataFrame(pd.DataFrame(sr_question_merge_pd_df))
survey_response_question_values.createOrReplaceTempView("single_choice_values_scores_temp")


# joining survey response, question, and single choice values/scores and transforming responses
spark.sql("""
CREATE OR REPLACE TEMPORARY VIEW survey_response_transformed AS
SELECT 
    sr.*,
    o.business_name as organization_name,
    o.parent_id,
    op.business_name as parent_name,
    q.question_text as question_text,
    q.archived,
    sc.score as single_choice_yes_no_score,
    
    CASE 
        WHEN sr.question_type = 'yes/no' THEN 'Yes/No'
        WHEN sr.question_type = 'scale' THEN 'Scale'
        WHEN sr.question_type = 'single-choice' THEN 'Single Choice' 
        WHEN sr.question_type IS NULL THEN 'N/A' END as question_type_transformed,
        
    CASE 
        WHEN sr.scale_response = '{"value": 0}' OR sr.scale_response = '{"value": "1"}' THEN 0
        WHEN sr.scale_response = '{"value": 1}' OR sr.scale_response = '{"value": "1"}' THEN 1
        WHEN sr.scale_response = '{"value": 2}' OR sr.scale_response = '{"value": "2"}' THEN 2
        WHEN sr.scale_response = '{"value": 3}' OR sr.scale_response = '{"value": "3"}' THEN 3
        WHEN sr.scale_response = '{"value": 4}' OR sr.scale_response = '{"value": "4"}' THEN 4
        WHEN sr.scale_response = '{"value": 5}' OR sr.scale_response = '{"value": "5"}' THEN 5
        WHEN sr.yes_no_response = '{"value": true}' OR sr.yes_no_response = '{"value": yes}' OR sr.yes_no_response = '{"value": "yes"}' THEN 'Yes'
        WHEN sr.yes_no_response = '{"value": false}' OR sr.yes_no_response = '{"value": no}' OR sr.yes_no_response = '{"value": "no"}' THEN 'No' 
        WHEN sr.single_choice_response IS NOT NULL THEN sc.response_value END AS response_transformed
        
FROM survey_response_temp sr
LEFT OUTER JOIN question_temp q ON q.id = sr.question_id
LEFT OUTER JOIN organization_temp o ON o.id = sr.organization_id
LEFT OUTER JOIN organization_temp op ON op.id = o.parent_id
LEFT OUTER JOIN single_choice_values_scores_temp sc ON sc.survey_response_id = sr.id
""")


# surveys_vanity_metrics table --> joining survey response transformed and survey assignment info to get additional metadata and calculating vanity metrics
spark.sql(f"""
CREATE OR REPLACE TABLE glue_catalog.{curated_catalog_db_name}.surveys_vanity_metrics 
USING iceberg 
OPTIONS ('write.object-storage.enabled'=true, 'write.data.path'='{curated_s3_path}/surveys_vanity_metrics')
TBLPROPERTIES ("format-version"="2") AS
SELECT
    sr.*, 
    sai.survey_assignment_name, 
    sai.survey_id as survey_id, 
    sai.survey_name as survey_name,
    sai.alert_threshold,
    CASE
        WHEN sr.question_type_transformed = 'Scale' AND sr.response_transformed IS NOT NULL THEN CAST(sr.response_transformed AS INT)
        WHEN sr.single_choice_yes_no_score <> 'NaN' THEN CAST(sr.single_choice_yes_no_score AS INT) ELSE NULL END AS score,
        
    CASE WHEN sr.status = 'completed' THEN true ELSE false END AS is_completed,
    CASE WHEN sr.status = 'ignored' OR sr.status = 'skipped' THEN true ELSE false END AS is_nack,
    CASE WHEN sr.status = 'partially-completed' OR sr.status = 'canceled' THEN true ELSE false END AS is_abandoned,
    CASE WHEN sr.survey_started_at IS NOT NULL THEN true ELSE false END AS is_started,
    CASE WHEN sr.status = 'canceled' OR sr.status = 'completed' OR sr.status = 'partially-completed' OR sr.status = 'ignored' OR sr.status = 'skipped' THEN true ELSE false END AS is_delivered,
    CASE WHEN sr.status = 'completed' OR sr.status = 'partially-completed' OR sr.status = 'canceled' THEN true ELSE false END AS is_opened,
    CASE WHEN sr.survey_submitted_at IS NOT NULL AND sr.survey_started_at IS NOT NULL 
             THEN (UNIX_TIMESTAMP(sr.survey_submitted_at, 'yyyy-MM-dd HH:mm:ss.SSSSSS z') - UNIX_TIMESTAMP(sr.survey_started_at, 'yyyy-MM-dd HH:mm:ss.SSSSSS z')) / 60.0 END AS completion_time,
             
    CASE WHEN sr.survey_submitted_at IS NOT NULL AND sr.survey_started_at IS NOT NULL 
             THEN (
                 UNIX_TIMESTAMP(sr.survey_submitted_at, 'yyyy-MM-dd HH:mm:ss.SSSSSS z') - UNIX_TIMESTAMP(sr.survey_started_at, 'yyyy-MM-dd HH:mm:ss.SSSSSS z')
             ) / 60.0  -- Converts seconds to minutes
        END AS completion_time_minutes,
    CASE WHEN sr.survey_submitted_at IS NOT NULL AND sr.survey_started_at IS NOT NULL 
             THEN (
                 UNIX_TIMESTAMP(sr.survey_submitted_at, 'yyyy-MM-dd HH:mm:ss.SSSSSS z') - UNIX_TIMESTAMP(sr.survey_started_at, 'yyyy-MM-dd HH:mm:ss.SSSSSS z')
             ) % 60.0  -- Gets remaining seconds
        END AS completion_time_seconds
FROM survey_response_transformed sr
LEFT OUTER JOIN survey_assignment_info sai ON sai.survey_assignment_id = sr.survey_assignment_id
""")

spark.sql(f"""
DELETE FROM glue_catalog.{curated_catalog_db_name}.surveys_vanity_metrics
WHERE question_text IS NULL
""")

org_assignments = spark.sql(f"""
SELECT DISTINCT organization_id
FROM glue_catalog.{raw_catalog_db_name}.survey_assignment
WHERE assignment_type = 'organization-assignment'
""")

org_list = [row.organization_id for row in org_assignments.collect()]
all_missing_subs = []
for org in org_list:
    all_subs = spark.sql(f"""SELECT id, organization_id FROM glue_catalog.{raw_catalog_db_name}.subscriber WHERE organization_id='{org}'""")
    all_subs_list = [row.id for row in all_subs.collect()]
    cur_subs = spark.sql(f"""SELECT subscriber_id FROM glue_catalog.{curated_catalog_db_name}.surveys_vanity_metrics WHERE organization_id='{org}'""")
    cur_subs_list = [row.subscriber_id for row in cur_subs.collect()]
    missing_subs = set(all_subs_list) - set(cur_subs_list)
    all_missing_subs.extend(missing_subs)

all_missing_subs_str = ','.join([f"'{id}'" for id in all_missing_subs])

if all_missing_subs_str:
    missing_sub_df = spark.sql(f"""
        SELECT id, organization_id
        FROM glue_catalog.{raw_catalog_db_name}.subscriber
        WHERE id IN ({all_missing_subs_str})
    """)
    missing_sub_df = missing_sub_df.withColumn("completed", lit(False))
    missing_sub_df.createOrReplaceTempView("missing_subs")

    spark.sql(f"""
    CREATE OR REPLACE TABLE glue_catalog.{curated_catalog_db_name}.missing_subscribers 
    USING iceberg 
    OPTIONS ('write.object-storage.enabled'=true, 'write.data.path'='{curated_s3_path}/missing_subscribers')
    TBLPROPERTIES ("format-version"="2") AS
    SELECT m.*, o.business_name as organization_name, o.parent_id, op.business_name as parent_name, s.survey_id
    FROM missing_subs m
    LEFT OUTER JOIN organization_temp o ON o.id = m.organization_id
    LEFT OUTER JOIN organization_temp op ON o.parent_id = op.id
    LEFT OUTER JOIN glue_catalog.{raw_catalog_db_name}.survey_assignment s ON s.organization_id = m.organization_id 
    """)
else:
    # Create an empty table
    spark.sql(f"""
    CREATE TABLE IF NOT EXISTS glue_catalog.{curated_catalog_db_name}.missing_subscribers (
        id STRING,
        organization_id STRING,
        completed BOOLEAN,
        organization_name STRING,
        parent_id STRING,
        parent_name STRING,
        survey_id STRING
    ) USING iceberg
    OPTIONS ('write.object-storage.enabled'=true, 'write.data.path'='{curated_s3_path}/missing_subscribers')
    TBLPROPERTIES ("format-version"="2")
    """)




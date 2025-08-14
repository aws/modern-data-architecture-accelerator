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
from pyspark.sql.functions import lit, col, expr, dayofmonth, month, udf
from pyspark.sql.types import StringType
import datetime
import pandas as pd
import json

args = getResolvedOptions(sys.argv, ["JOB_NAME", "input_params"])
input_params = eval(args["input_params"])
curated_s3_path = f"s3://{input_params['curated_bucket_name']}"

config = SparkConf().setAll(
    [
        ("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions"),
        ("spark.sql.catalog.glue_catalog", "org.apache.iceberg.spark.SparkCatalog"),
        ("spark.sql.catalog.glue_catalog.warehouse", curated_s3_path),
        ("spark.sql.catalog.glue_catalog.catalog-impl", "org.apache.iceberg.aws.glue.GlueCatalog"),
        ("spark.sql.catalog.glue_catalog.io-impl", "org.apache.iceberg.aws.s3.S3FileIO"),
        ("spark.sql.parquet.datetimeRebaseModeInRead", "CORRECTED")
    ]
)
sc = SparkContext(conf=config)
glueContext = GlueContext(sc)
spark = glueContext.spark_session

raw_catalog_db_name = input_params["raw_catalog_name"]
curated_catalog_db_name = input_params["curated_catalog_name"]

# fetching tables from glue catalog
drop_columns = ["op", "cdc_timestamp_seq", "cdc_operation"]
vital_reading_df = spark.read.format("iceberg").option("catalog", "glue_catalog").load(f"glue_catalog.{raw_catalog_db_name}.vital_reading")
vital_reading_df = vital_reading_df.drop(*drop_columns)
vital_sign_df = spark.read.format("iceberg").option("catalog", "glue_catalog").load(f"glue_catalog.{raw_catalog_db_name}.vital_sign")
vital_sign_df = vital_sign_df.drop(*drop_columns)
subscriber_df = spark.read.format("iceberg").option("catalog", "glue_catalog").load(f"glue_catalog.{raw_catalog_db_name}.subscriber")
subscriber_df = subscriber_df.drop(*drop_columns)
organization_df = spark.read.format("iceberg").option("catalog", "glue_catalog").load(f"glue_catalog.{raw_catalog_db_name}.organization")
organization_df = organization_df.drop(*drop_columns)

# alert_df --> filter alert table for nvt (id = 964fb34d-b0c1-422f-84dc-c2867cdb0eb0)
alert_df = spark.sql(f"""
SELECT *
FROM glue_catalog.{raw_catalog_db_name}.alert
WHERE alert_category_id = '964fb34d-b0c1-422f-84dc-c2867cdb0eb0'
""")

alert_df = alert_df.withColumnRenamed("raw_log_id", "raw_record_id")
alert_df = alert_df.drop(*drop_columns)

def extract_value(json_string, key):
    import json
    try:
        data = json.loads(json_string)
        return data.get(key, None)
    except Exception as e:
        return None

extract_value_udf = udf(lambda x: extract_value(x, "nvtThresholdInHours"), StringType())

alert_transformed_df = alert_df.withColumn("alert_type", extract_value_udf(col("alert_metadata"))) \
    .withColumn("setting_id", extract_value_udf(col("alert_metadata")))

vital_reading_df = vital_reading_df.withColumn('event_type', lit('vital_reading'))
alert_transformed_df = alert_transformed_df.withColumn('event_type', lit('alert'))

# getting shared columns between alert and vital_reading
common_columns = set(alert_transformed_df.columns).intersection(vital_reading_df.columns)
common_columns.add("raw_record_id")
filtered_alert_df = alert_transformed_df.select(*common_columns)
filtered_vital_reading_df = vital_reading_df.select(*common_columns)

# creating data frames for alert, vital_reading, and subscriber
alert_transformed_df.createOrReplaceTempView("alert_temp")
vital_reading_df.createOrReplaceTempView("vital_reading_temp")
filtered_alert_df.createOrReplaceTempView("filtered_alert_temp")
filtered_vital_reading_df.createOrReplaceTempView("filtered_vital_reading_temp")
vital_sign_df.createOrReplaceTempView("vital_sign_temp")
subscriber_df.createOrReplaceTempView("subscriber_temp")
organization_df.createOrReplaceTempView("organization_temp")

# all_vitals_events table --> union of nvt_alert_table and vital_reading on matching columns
spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW vitals_alerts AS
SELECT * FROM filtered_alert_temp
UNION ALL 
SELECT * FROM filtered_vital_reading_temp
""")

spark.sql(f"""
CREATE OR REPLACE TABLE glue_catalog.{curated_catalog_db_name}.all_vitals_events
USING iceberg 
OPTIONS ('write.object-storage.enabled'=true, 'write.data.path'='{curated_s3_path}/all_vitals_events')
TBLPROPERTIES ("format-version"="2") AS
SELECT ave.*, s.created_at as enrollment_date, v.reading, v.vital_sign_id, v.unit, 
    IFNULL(a.alert_type, 'N/A') as alert_type, 
    IFNULL(a.setting_id, 'N/A') as setting_id,
    CASE WHEN ave.event_type = 'vital_reading' THEN true ELSE false END as is_vital_reading,
    CASE WHEN ave.event_type = 'alert' THEN true ELSE false END as is_alert
FROM vitals_alerts ave
LEFT OUTER JOIN subscriber_temp s ON ave.subscriber_id = s.id
LEFT OUTER JOIN vital_reading_temp v ON ave.id = v.id
LEFT OUTER JOIN alert_temp a ON ave.id = a.id
""")

spark.sql(f"""
CREATE OR REPLACE TABLE glue_catalog.{curated_catalog_db_name}.all_vitals_events
USING iceberg 
OPTIONS ('write.object-storage.enabled'=true, 'write.data.path'='{curated_s3_path}/all_vitals_events')
TBLPROPERTIES ("format-version"="2") AS
SELECT 
    ave.*, 
    IFNULL(vs.display_name, 'N/A') as display_name, 
    vs.active as is_active_vital_sign, 
    vs.active_status_changed_at as active_changed_date, 
    vs.created_at as vital_sign_created_date,
    DATEDIFF(ave.updated_at, ave.enrollment_date) as days_since_enrollment,
    CASE WHEN MONTH(ave.updated_at) = MONTH(CURRENT_DATE) AND YEAR(ave.updated_at) = YEAR(CURRENT_DATE) THEN 'Current Month' ELSE 'Previous Month' END as month
FROM glue_catalog.{curated_catalog_db_name}.all_vitals_events ave
LEFT OUTER JOIN vital_sign_temp vs ON ave.vital_sign_id = vs.id
WHERE 
    (MONTH(ave.updated_at) = MONTH(CURRENT_DATE) AND YEAR(ave.updated_at) = YEAR(CURRENT_DATE)) 
    OR
    (MONTH(ave.updated_at) = MONTH(CURRENT_DATE) - 1 AND YEAR(ave.updated_at) = YEAR(CURRENT_DATE))
""")

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW vital_counts_curr_month AS
SELECT *
FROM glue_catalog.{curated_catalog_db_name}.all_vitals_events
WHERE month = 'Current Month'
""")

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW vital_counts_prev_month AS
SELECT *
FROM glue_catalog.{curated_catalog_db_name}.all_vitals_events
WHERE month = 'Previous Month'
""")

# subscriber_compliant_days table --> counts number of distinct days where subscriber has alert or vital_reading
spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW vital_counts AS
SELECT 
    s.id as subscriber_id, 
    SUM(CASE WHEN a.is_vital_reading = 'true' THEN 1 ELSE 0 END) as vital_reading_count,
    COUNT(DISTINCT CASE WHEN a.is_vital_reading = 'true' THEN DAY(a.updated_at) END) as unique_vital_reading_count,
    SUM(CASE WHEN a.is_alert = 'true' THEN 1 ELSE 0 END) as alert_count,
    COALESCE(COUNT(DISTINCT DATE(a.updated_at)), 0) as compliant_days, 
    COALESCE(COUNT(DISTINCT CASE WHEN a.event_type = 'vital_reading' THEN DATE(a.updated_at) END), 0) as vital_days
FROM subscriber_temp s
LEFT OUTER JOIN vital_counts_curr_month a 
ON s.id = a.subscriber_id AND s.organization_id = a.organization_id
WHERE a.event_type IN ('vital_reading', 'alert')
GROUP BY s.id
""")

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW vital_counts_prev AS
SELECT 
    s.id as subscriber_id, 
    SUM(CASE WHEN a.is_vital_reading = 'true' THEN 1 ELSE 0 END) as vital_reading_count,
    COUNT(DISTINCT CASE WHEN a.is_vital_reading = 'true' THEN DAY(a.updated_at) END) as unique_vital_reading_count,
    SUM(CASE WHEN a.is_alert = 'true' THEN 1 ELSE 0 END) as alert_count,
    COALESCE(COUNT(DISTINCT DATE(a.updated_at)), 0) as compliant_days, 
    COALESCE(COUNT(DISTINCT CASE WHEN a.event_type = 'vital_reading' THEN DATE(a.updated_at) END), 0) as vital_days
FROM subscriber_temp s
LEFT OUTER JOIN vital_counts_prev_month a 
ON s.id = a.subscriber_id AND s.organization_id = a.organization_id
WHERE a.event_type IN ('vital_reading', 'alert')
GROUP BY s.id
""")

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW max_min_vitals AS
SELECT subscriber_id, MAX(updated_at) as last_vital_date, MIN(updated_at) as first_vital_date
FROM vitals_alerts
GROUP BY subscriber_id
""")

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW compliant_counts AS
SELECT v.*, first_vital_date, last_vital_date
FROM vital_counts v
LEFT OUTER JOIN max_min_vitals m ON v.subscriber_id = m.subscriber_id
""")

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW compliant_counts_prev AS
SELECT v.*, first_vital_date, last_vital_date
FROM vital_counts_prev v
LEFT OUTER JOIN max_min_vitals m ON v.subscriber_id = m.subscriber_id
""")

current_date = datetime.date.today()
current_day = current_date.day
last_day_in_month = datetime.date(current_date.year, current_date.month + 1, 1) - datetime.timedelta(days=1)
days_in_month = last_day_in_month.day
days_left_in_month = days_in_month - current_day


# adding is_compliant column to subscriber_compliant_days table such that compliant_days > 16
spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW subscriber_compliance_metrics AS
SELECT
    subscriber_id,
    last_vital_date,
    first_vital_date,
    vital_reading_count,
    unique_vital_reading_count,
    alert_count,
    COALESCE(compliant_days, 0) as compliant_days,
    COALESCE(vital_days, 0) as vital_days,
    CASE WHEN COALESCE(compliant_days, 0) >= 16 THEN true ELSE false END as is_compliant,
    CASE WHEN COALESCE(compliant_days, 0) >= 16 THEN 0 ELSE 16 - COALESCE(compliant_days, 0) END as days_to_compliance
FROM compliant_counts 
""")

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW subscriber_compliance_metrics_prev AS
SELECT
    subscriber_id,
    last_vital_date,
    first_vital_date,
    vital_reading_count,
    unique_vital_reading_count,
    alert_count,
    COALESCE(compliant_days, 0) as compliant_days,
    COALESCE(vital_days, 0) as vital_days,
    CASE WHEN COALESCE(compliant_days, 0) >= 16 THEN true ELSE false END as is_compliant,
    CASE WHEN COALESCE(compliant_days, 0) >= 16 THEN 0 ELSE 16 - COALESCE(compliant_days, 0) END as days_to_compliance
FROM compliant_counts_prev 
""")


spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW subscriber_risk_compliance AS
SELECT 
    s.*,
    CASE WHEN s.days_to_compliance > 0 THEN (s.compliant_days + {days_left_in_month} - 16) END AS risk_factor
FROM subscriber_compliance_metrics s
""")

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW subscriber_risk_compliance_prev AS
SELECT 
    s.*,
    CASE WHEN s.days_to_compliance > 0 THEN (s.compliant_days - 16) END AS risk_factor
FROM subscriber_compliance_metrics_prev s
""")


# subscriber_vitals_metrics table --> join of subscriber and subscriber_compliant_days
interactions_type_columns = ""
for day in range(0, 32):
    interactions_type_columns += f"WHEN compliant_days = {day} THEN '{day} Interactions' "

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW subscriber_vitals_metrics_temp_1 AS
SELECT 
    s.*,
    cd.risk_factor,
    cd.last_vital_date,
    cd.first_vital_date,
    CASE WHEN MONTH(s.created_at) = month(CURRENT_DATE) AND YEAR(s.created_at) = YEAR(CURRENT_DATE) THEN true ELSE false END as is_new_this_month,
    IFNULL(cd.unique_vital_reading_count, 0) as unique_vital_reading_count,
    IFNULL(cd.vital_reading_count, 0) as vital_reading_count,
    IFNULL(cd.alert_count, 0) as alert_count,
    IFNULL(cd.compliant_days, 0) as compliant_days,
    IFNULL(cd.is_compliant, false) as is_compliant,
    CASE WHEN s.active = 'true' THEN true ELSE false END as is_active,
    CASE WHEN s.active = 'false' THEN true ELSE false END as not_active,
    CASE WHEN s.status = 4 AND MONTH(s.updated_at) = MONTH(CURRENT_DATE) AND YEAR(s.updated_at) = YEAR(CURRENT_DATE) THEN true ELSE false END as is_canceled_this_month,
    CASE WHEN s.status = 4 AND MONTH(s.updated_at) = MONTH(CURRENT_DATE) AND YEAR(s.updated_at) = YEAR(CURRENT_DATE) 
        AND MONTH(s.created_at) = MONTH(CURRENT_DATE) AND YEAR(s.created_at) = YEAR(CURRENT_DATE) THEN true ELSE false END as is_canceled_same_month,
    CASE WHEN s.status = 1 THEN 'UNDER_REVIEW'
        WHEN s.status = 2 THEN 'ACTIVE'
        WHEN s.status = 3 THEN 'ON_HOLD'
        WHEN s.status = 4 THEN 'CANCELED'
        WHEN s.status = 5 THEN 'CLOSED'
        WHEN s.status = 6 THEN 'CREATED'
        WHEN s.status = 7 THEN 'ANONYMIZED' END as status_string
FROM subscriber_temp s
LEFT OUTER JOIN subscriber_risk_compliance cd ON s.id = cd.subscriber_id
""")

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW subscriber_vitals_metrics_temp_1_prev AS
SELECT 
    s.*,
    cd.risk_factor,
    cd.last_vital_date,
    cd.first_vital_date,
    CASE WHEN MONTH(s.created_at) = month(CURRENT_DATE) AND YEAR(s.created_at) = YEAR(CURRENT_DATE) THEN true ELSE false END as is_new_this_month,
    IFNULL(cd.unique_vital_reading_count, 0) as unique_vital_reading_count,
    IFNULL(cd.vital_reading_count, 0) as vital_reading_count,
    IFNULL(cd.alert_count, 0) as alert_count,
    IFNULL(cd.compliant_days, 0) as compliant_days,
    IFNULL(cd.is_compliant, false) as is_compliant,
    CASE WHEN s.active = 'true' THEN true ELSE false END as is_active,
    CASE WHEN s.active = 'false' THEN true ELSE false END as not_active,
    CASE WHEN s.status = 4 AND MONTH(s.updated_at) = MONTH(CURRENT_DATE) AND YEAR(s.updated_at) = YEAR(CURRENT_DATE) THEN true ELSE false END as is_canceled_this_month,
    CASE WHEN s.status = 4 AND MONTH(s.updated_at) = MONTH(CURRENT_DATE) AND YEAR(s.updated_at) = YEAR(CURRENT_DATE) 
        AND MONTH(s.created_at) = MONTH(CURRENT_DATE) AND YEAR(s.created_at) = YEAR(CURRENT_DATE) THEN true ELSE false END as is_canceled_same_month,
    CASE WHEN s.status = 1 THEN 'UNDER_REVIEW'
        WHEN s.status = 2 THEN 'ACTIVE'
        WHEN s.status = 3 THEN 'ON_HOLD'
        WHEN s.status = 4 THEN 'CANCELED'
        WHEN s.status = 5 THEN 'CLOSED'
        WHEN s.status = 6 THEN 'CREATED'
        WHEN s.status = 7 THEN 'ANONYMIZED' END as status_string
FROM subscriber_temp s
LEFT OUTER JOIN subscriber_risk_compliance_prev cd ON s.id = cd.subscriber_id
""")

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW subscriber_vitals_metrics_temp_2 AS
SELECT *,
    CASE {interactions_type_columns}END as interaction_type,
    CASE WHEN is_new_this_month = 'true' AND COALESCE(compliant_days, 0) > 0 THEN true ELSE false END as first_vital_taken,
    CASE WHEN is_compliant = 'true' THEN true ELSE false END as is_billable,
    CASE WHEN is_compliant = 'false' THEN true ELSE false END as is_not_billable,
    CASE WHEN status = 4 THEN true ELSE false END as is_canceled,
    CASE WHEN (status = 4 AND compliant_days + {days_left_in_month} < 16) 
        OR (active = false AND compliant_days + {days_left_in_month} < 16) THEN true ELSE false END as is_outliar,
    COALESCE(
        CASE
            WHEN is_compliant = 'true' THEN 0
            WHEN risk_factor < 0 THEN 4
            WHEN risk_factor > 0 AND risk_factor <= 3 THEN 3
            WHEN risk_factor > 3 AND risk_factor <= 6 THEN 2
            WHEN risk_factor > 6 THEN 1 END, 4) AS risk_level
FROM subscriber_vitals_metrics_temp_1
""")

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW subscriber_vitals_metrics_temp_2_prev AS
SELECT *,
    CASE {interactions_type_columns}END as interaction_type,
    CASE WHEN is_new_this_month = 'true' AND COALESCE(compliant_days, 0) > 0 THEN true ELSE false END as first_vital_taken,
    CASE WHEN is_compliant = 'true' THEN true ELSE false END as is_billable,
    CASE WHEN is_compliant = 'false' THEN true ELSE false END as is_not_billable,
    CASE WHEN status = 4 THEN true ELSE false END as is_canceled,
    CASE WHEN (status = 4 AND compliant_days + {days_left_in_month} < 16) 
        OR (active = false AND compliant_days + {days_left_in_month} < 16) THEN true ELSE false END as is_outliar,
    COALESCE(
        CASE
            WHEN is_compliant = 'true' THEN 0
            WHEN risk_factor < 0 THEN 4
            WHEN risk_factor > 0 AND risk_factor <= 3 THEN 3
            WHEN risk_factor > 3 AND risk_factor <= 6 THEN 2
            WHEN risk_factor > 6 THEN 1 END, 4) AS risk_level
FROM subscriber_vitals_metrics_temp_1_prev
""")

# organization_vitals_info table
interactions_columns = ""
for day in range(0, 32):
    interactions_columns += f"SUM(CASE WHEN svm.interaction_type = '{day} Interactions' THEN 1 ELSE 0 END) as {day}_interactions, "

percent_interactions_columns = ""
for day in range(0, 32):
    percent_interactions_columns += f"({day}_interactions/subscriber_count) as {day}_percent_interactions, "

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW subscriber_vitals_metrics_temp_3 AS
SELECT *,
    CASE WHEN first_vital_taken = 'false' AND status <> 4 AND is_new_this_month = 'true' THEN true ELSE false END as is_pending
FROM subscriber_vitals_metrics_temp_2
""")

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW subscriber_vitals_metrics_temp_3_prev AS
SELECT *,
    CASE WHEN first_vital_taken = 'false' AND status <> 4 AND is_new_this_month = 'true' THEN true ELSE false END as is_pending
FROM subscriber_vitals_metrics_temp_2_prev
""")

spark.sql(f"""
CREATE OR REPLACE TABLE glue_catalog.{curated_catalog_db_name}.organization_vitals_info
USING iceberg 
OPTIONS ('write.object-storage.enabled'=true, 'write.data.path'='{curated_s3_path}/organization_vitals_info')
TBLPROPERTIES ("format-version"="2") AS
SELECT o.id as organization_id, 
    o.business_name as name,
    o.parent_id as parent_id,
    op.business_name as parent_name,
    COUNT(svm.id) as subscriber_count,
    SUM(CASE WHEN svm.is_new_this_month = 'true' THEN 1 ELSE 0 END) as new_this_month_count,
    SUM(CASE WHEN svm.first_vital_taken = 'true' THEN 1 ELSE 0 END) as first_vital_count,
    SUM(CASE WHEN svm.is_billable = 'true' THEN 1 ELSE 0 END) as billable,
    SUM(CASE WHEN svm.is_not_billable = 'true' THEN 1 ELSE 0 END) as unbillable,
    SUM(CASE WHEN svm.is_canceled = 'true' THEN 1 ELSE 0 END) as cancelled,
    SUM(CASE WHEN svm.active = 'true' THEN 1 ELSE 0 END) as active,
    SUM(CASE WHEN svm.is_outliar = 'true' THEN 1 ELSE 0 END) as outliers,
    SUM(CASE WHEN svm.is_canceled_this_month = 'true' THEN 1 ELSE 0 END) as canceled_this_month,
    SUM(CASE WHEN svm.is_canceled_same_month = 'true' THEN 1 ELSE 0 END) as canceled_same_month,
    SUM(CASE WHEN svm.is_pending = 'true' THEN 1 ELSE 0 END) as pending,
    {interactions_columns}
    DAY(CURRENT_DATE) as days_in_month,
    AVG(CASE WHEN svm.active = 'true' THEN svm.risk_level ELSE NULL END) AS avg_risk_level_temp
FROM organization_temp o
LEFT OUTER JOIN subscriber_vitals_metrics_temp_3 svm ON o.id = svm.organization_id
LEFT OUTER JOIN organization_temp op ON o.parent_id = op.id
GROUP BY o.id, o.business_name, op.business_name, o.parent_id
""")

spark.sql(f"""
CREATE OR REPLACE TABLE glue_catalog.{curated_catalog_db_name}.subscriber_vitals_metrics
USING iceberg 
OPTIONS ('write.object-storage.enabled'=true, 'write.data.path'='{curated_s3_path}/subscriber_vitals_metrics')
TBLPROPERTIES ("format-version"="2") AS
SELECT svm.*, 
    o.name as organization_name, o.parent_id, o.parent_name, 'Current Month' as month
FROM subscriber_vitals_metrics_temp_3 svm
LEFT OUTER JOIN glue_catalog.{curated_catalog_db_name}.organization_vitals_info o ON o.organization_id = svm.organization_id
""")

spark.sql(f"""
CREATE OR REPLACE TEMPORARY VIEW subscriber_vitals_metrics_prev AS
SELECT svm.*, 
    o.name as organization_name, o.parent_id, o.parent_name, 'Previous Month' as month
FROM subscriber_vitals_metrics_temp_3_prev svm
LEFT OUTER JOIN glue_catalog.{curated_catalog_db_name}.organization_vitals_info o ON o.organization_id = svm.organization_id
""")

vital_reading_df = vital_reading_df.withColumn('event_type', lit('vital_reading'))
alert_transformed_df = alert_transformed_df.withColumn('event_type', lit('alert'))

spark.sql(f"""
CREATE OR REPLACE TABLE glue_catalog.{curated_catalog_db_name}.subscriber_vitals_metrics
USING iceberg 
OPTIONS ('write.object-storage.enabled'=true, 'write.data.path'='{curated_s3_path}/subscriber_vitals_metrics')
TBLPROPERTIES ("format-version"="2") AS
SELECT * FROM glue_catalog.{curated_catalog_db_name}.subscriber_vitals_metrics
UNION ALL 
SELECT * FROM subscriber_vitals_metrics_prev
""")



spark.sql(f"""
CREATE OR REPLACE TABLE glue_catalog.{curated_catalog_db_name}.organization_vitals_info
USING iceberg 
OPTIONS ('write.object-storage.enabled'=true, 'write.data.path'='{curated_s3_path}/organization_vitals_info')
TBLPROPERTIES ("format-version"="2") AS
SELECT *,
    {percent_interactions_columns}
    COALESCE(
        CASE WHEN avg_risk_level_temp - FLOOR(avg_risk_level_temp) <= 0.5
             THEN FLOOR(avg_risk_level_temp)
             ELSE CEIL(avg_risk_level_temp)
        END,
        4
    ) AS avg_risk_level
FROM glue_catalog.{curated_catalog_db_name}.organization_vitals_info
""")




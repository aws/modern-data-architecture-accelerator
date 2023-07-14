# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.sql.functions import year, month, dayofmonth, date_format

# test script update


args = getResolvedOptions(sys.argv, ["JOB_NAME", "standardized_bucket", "standardized_folder", "raw_dbname",
                                     "raw_tablename", "standardized_tablename",  "standardized_dbname", "partition_column"])
sc = SparkContext.getOrCreate()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args["JOB_NAME"], args)

partition_column = args['partition_column']
standardized_bucket = args['standardized_bucket']
standardized_folder = args['standardized_folder']
s3Destination = "s3://" + standardized_bucket + "/" + standardized_folder + "/"

#  Add Comments
S3bucket_node1 = glueContext.create_dynamic_frame.from_catalog(
    database=args['raw_dbname'],
    table_name=args['raw_tablename'],
    transformation_ctx="S3bucket_node1"
)

taxi_df = S3bucket_node1.toDF()
taxi_df = taxi_df.withColumn('year', year(partition_column))\
    .withColumn('month', month(partition_column))\
    .withColumn('day', dayofmonth(partition_column))

last_transform = DynamicFrame.fromDF(taxi_df, glueContext, "nested")

taxi_sink = glueContext.getSink(connection_type="s3", path=s3Destination,
                                enableUpdateCatalog=True, updateBehavior="UPDATE_IN_DATABASE",
                                partitionKeys=["year", "month", "day"])
taxi_sink.setFormat("glueparquet")
taxi_sink.setCatalogInfo(
    catalogDatabase=args['standardized_dbname'], catalogTableName=args['standardized_tablename'])
taxi_sink.writeFrame(last_transform)

job.commit()

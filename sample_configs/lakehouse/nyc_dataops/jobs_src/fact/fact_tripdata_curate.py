# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue import DynamicFrame


args = getResolvedOptions(sys.argv, ["JOB_NAME", "curated_bucket",
                                     "curated_folder", "curated_tablename", "standardized_tablename", "standardized_dbname", "curated_dbname"])
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args["JOB_NAME"], args)

curated_bucket = args['curated_bucket']
curated_folder = args['curated_folder']
s3Destination = "s3://" + curated_bucket + "/" + curated_folder + "/"

# Script generated for node S3 bucket
S3bucket_node1 = glueContext.create_dynamic_frame.from_catalog(
    database=args['standardized_dbname'],
    table_name=args['standardized_tablename'],
    transformation_ctx="S3bucket_node1",
)

# Script generated for node SQL
taxiDf = S3bucket_node1.toDF()
taxiDf = taxiDf.where("`vendorid` is NOT NULL")

S3bucket_node2 = DynamicFrame.fromDF(taxiDf, glueContext, "nested")

# Script generated for node ApplyMapping
ApplyMapping_node2 = ApplyMapping.apply(
    frame=S3bucket_node2,
    mappings=[
        ("vendorid", "long", "vendorid", "long"),
        ("tpep_pickup_datetime", "string", "trip_pickup_datetime", "string"),
        ("tpep_dropoff_datetime", "string", "trip_dropoff_datetime", "string"),
        ("passenger_count", "long", "passenger_count", "long"),
        ("trip_distance", "double", "trip_distance", "double"),
        ("ratecodeid", "long", "ratecodeid", "long"),
        ("store_and_fwd_flag", "string", "store_and_fwd_flag", "string"),
        ("pulocationid", "long", "pulocationid", "long"),
        ("dolocationid", "long", "dolocationid", "long"),
        ("payment_type", "long", "payment_type", "long"),
        ("fare_amount", "double", "fare_amount", "double"),
        ("mta_tax", "double", "mta_tax", "double"),
        ("tip_amount", "double", "tip_amount", "double"),
        ("tolls_amount", "double", "tolls_amount", "double"),
        ("total_amount", "double", "total_amount", "double"),
        ("year", "string", "year", "string"),
        ("month", "string", "month", "string"),
        ("day", "string", "day", "string"),
    ],
    transformation_ctx="ApplyMapping_node2",
)

# Script generated for node Amazon S3
AmazonS3_node1643903047107 = glueContext.getSink(
    path=s3Destination,
    connection_type="s3",
    updateBehavior="UPDATE_IN_DATABASE",
    partitionKeys=["year", "month", "day"],
    compression="snappy",
    enableUpdateCatalog=True,
    transformation_ctx="AmazonS3_node1643903047107",
)
AmazonS3_node1643903047107.setCatalogInfo(
    catalogDatabase=args['curated_dbname'], catalogTableName=args['curated_tablename']
)
AmazonS3_node1643903047107.setFormat("glueparquet")
AmazonS3_node1643903047107.writeFrame(ApplyMapping_node2)
job.commit()

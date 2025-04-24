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
taxiDf = taxiDf.where("`paymentid` is NOT NULL")

S3bucket_node2 = DynamicFrame.fromDF(taxiDf, glueContext, "nested")

# Script generated for node Amazon S3
S3bucket_node3 = glueContext.getSink(
    path=s3Destination,
    connection_type="s3",
    updateBehavior="UPDATE_IN_DATABASE",
    compression="snappy",
    enableUpdateCatalog=True,
    transformation_ctx="S3bucket_node3",
)
S3bucket_node3.setCatalogInfo(
    catalogDatabase=args['curated_dbname'], catalogTableName=args['curated_tablename']
)
S3bucket_node3.setFormat("glueparquet")
S3bucket_node3.writeFrame(S3bucket_node2)
job.commit()

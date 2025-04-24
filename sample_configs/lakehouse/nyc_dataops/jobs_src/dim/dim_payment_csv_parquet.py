# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job


args = getResolvedOptions(sys.argv, ["JOB_NAME", "standardized_bucket",
                                     "standardized_folder", "raw_dbname",
                                     "raw_tablename", "standardized_tablename",  "standardized_dbname"])
sc = SparkContext.getOrCreate()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args["JOB_NAME"], args)

standardized_bucket = args['standardized_bucket']
standardized_folder = args['standardized_folder']
s3Destination = "s3://" + standardized_bucket + "/" + standardized_folder + "/"
#  Add Comments
S3bucket_node1 = glueContext.create_dynamic_frame.from_catalog(
    database=args['raw_dbname'],
    table_name=args['raw_tablename'],
    transformation_ctx="S3bucket_node1"
)

taxi_sink = glueContext.getSink(connection_type="s3", path=s3Destination,
                                enableUpdateCatalog=True, updateBehavior="UPDATE_IN_DATABASE")
taxi_sink.setFormat("glueparquet")
taxi_sink.setCatalogInfo(
    catalogDatabase=args['standardized_dbname'], catalogTableName=args['standardized_tablename'])
taxi_sink.writeFrame(S3bucket_node1)

job.commit()

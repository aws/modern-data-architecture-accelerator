import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job

args = getResolvedOptions(sys.argv, ['JOB_NAME','raw_bucket','transformed_bucket','raw_bucket_prefix','transformed_bucket_prefix'])

#Initialize Parameters:
raw_bucket = args['raw_bucket']
raw_bucket_prefix = args['raw_bucket_prefix']
transformed_bucket = args['transformed_bucket']
transformed_bucket_prefix = args['transformed_bucket_prefix']

# Set Spark/Glue Context
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Read CSV Files from S3 Raw Bucket
S3CSVFiles = glueContext.create_dynamic_frame.from_options(format_options={"quoteChar": "\"", "withHeader": True, "separator": ","}, connection_type="s3", format="csv", connection_options={"paths": ['s3://'+raw_bucket+'/'+raw_bucket_prefix], "recurse": True}, transformation_ctx="S3CSVFiles")

# Write Parquet/Snappy Files to S3 Transformed Bucket
S3ParquetFiles = glueContext.write_dynamic_frame.from_options(frame=S3CSVFiles, connection_type="s3", format="glueparquet", connection_options={"path": 's3://'+transformed_bucket+'/'+transformed_bucket_prefix, "partitionKeys": []}, format_options={"compression": "snappy"}, transformation_ctx="S3ParquetFiles")

job.commit()
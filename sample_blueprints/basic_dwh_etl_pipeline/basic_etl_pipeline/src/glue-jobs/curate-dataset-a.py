import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.sql import types as T
import pyspark.sql.functions as F
from pyspark.sql import Window as W
from awsglue.dynamicframe import DynamicFrame
from datetime import datetime, timedelta
from pyspark.sql import SQLContext

sc = SparkContext.getOrCreate()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
logger = glueContext.get_logger()
# # Read input arguments and initialize glue job

args = getResolvedOptions(sys.argv, [ 'JOB_NAME', 'raw_database', 'raw_table',  'curated_s3_bucket', 'curated_folder', 'curated_database', ])
job.init(args['JOB_NAME'], args)

# Initialize parameters

raw_database = args['raw_database']
raw_table = args['raw_table']
curated_s3_bucket = args['curated_s3_bucket']
curated_folder = args['curated_folder']
curated_database = args['curated_database']

################
# Your logic to read raw data from glue catalog table in raw-db dataset and transform into fact/dimension tables
################

s3output_fact_table_1 = glueContext.getSink(
  path="s3://"+curated_s3_bucket+"/"+curated_folder+"/fact_table_1",
  connection_type="s3",
  updateBehavior="UPDATE_IN_DATABASE",
  partitionKeys=['ingest_date'],
  compression="snappy",
  enableUpdateCatalog=True,
  transformation_ctx="s3OutputFactTable1",
)
s3output_fact_table_1.setCatalogInfo(
  catalogDatabase=curated_database, catalogTableName="fact_table_1"
)
s3output_fact_table_1.setFormat("glueparquet")
s3output_fact_table_1.writeFrame(fact_table_1_dydf)


s3output_dim_table_1 = glueContext.getSink(
  path="s3://"+curated_s3_bucket+"/"+curated_folder+"/dim_table_1",
  connection_type="s3",
  updateBehavior="UPDATE_IN_DATABASE",
  partitionKeys=['ingest_date'],
  compression="snappy",
  enableUpdateCatalog=True,
  transformation_ctx="s3OutputDimAgent",
)
s3output_dim_table_1.setCatalogInfo(
  catalogDatabase=curated_database, catalogTableName="dim_table_1"
)
s3output_dim_table_1.setFormat("glueparquet")
s3output_dim_table_1.writeFrame(dim_table_1_dydf)



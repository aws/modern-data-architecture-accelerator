import sys
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.dynamicframe import DynamicFrame
from pyspark.sql import functions as SqlFuncs
from pyspark.sql import types as SqlTypes
from pyspark.sql.types import StructType,StructField, StringType, IntegerType
from datetime import datetime, timedelta
from pyspark import SparkConf
import boto3
import json 

# sc = SparkContext.getOrCreate()
# conf = sc.getConf()

conf = SparkConf()
conf.set("spark.sql.legacy.parquet.int96RebaseModeInRead", "CORRECTED")
conf.set("spark.sql.legacy.parquet.int96RebaseModeInWrite", "CORRECTED")
conf.set("spark.sql.legacy.parquet.datetimeRebaseModeInRead", "CORRECTED")
conf.set("spark.sql.legacy.parquet.datetimeRebaseModeInWrite", "CORRECTED")
# sc.stop()
sc = SparkContext.getOrCreate(conf=conf)
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
logger = glueContext.get_logger()


# Read input arguments and initialize glue job

args = getResolvedOptions(sys.argv, [ 'JOB_NAME', 'redshift_secret', 'redshift_database', 'redshift_schema', 'redshift_table', 'catalog_database', "catalog_table", 'role_iam', 'redshift_tmp_dir', 'truncate_before_load' ])
job.init(args['JOB_NAME'], args)

# Initialize parameters

job_name = args['JOB_NAME']
redshift_secret_name=args['redshift_secret']
redshift_database= args['redshift_database']
redshift_schema = args['redshift_schema']
redshift_table = args['redshift_table']
catalog_database = args['catalog_database']
catalog_table = args['catalog_table']
role_iam=args['role_iam']
redshift_tmp_dir=args['redshift_tmp_dir']
truncate_before_load = args['truncate_before_load']

yesterday = datetime.now() - timedelta(1)
ingest_date = datetime.strftime(yesterday, '%Y-%m-%d')

# Read curated dataset from glue catalog

dydf = glueContext.create_dynamic_frame.from_catalog(
    database=catalog_database,
    table_name=catalog_table,
    transformation_ctx=redshift_schema+"_"+redshift_table)

df = dydf.toDF()
df2 = df.filter(df.ingest_date == ingest_date).repartition(3)
dydf2 = DynamicFrame.fromDF(df2, glueContext, 'dydf2')

secretsmanager = boto3.client('secretsmanager')
redshift_scret_value = secretsmanager.get_secret_value(SecretId=redshift_secret_name)
redshift_secret = json.loads(redshift_scret_value['SecretString'])

# Set redshift connection context

my_conn_options = {
    "dbtable": f"{redshift_schema}.{redshift_table}",
    "database": f"{redshift_database}",
    "aws_iam_role": f"{role_iam}"
}

if truncate_before_load.strip().lower() == 'true':
    my_conn_options ["preactions"] = f"truncate table {redshift_schema}.{redshift_table};"

logger.info(str(my_conn_options))

## Write data to redshift

datasink1 = glueContext.write_dynamic_frame.from_jdbc_conf(
    frame=dydf,
    connection_options=my_conn_options,
    redshift_tmp_dir=redshift_tmp_dir
)

job.commit()
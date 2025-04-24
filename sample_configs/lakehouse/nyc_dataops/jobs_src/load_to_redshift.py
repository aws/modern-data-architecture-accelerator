# Copyright Amazon.com, Inc. or its affiliates.All Rights Reserved.
# SPDX - License - Identifier: Apache - 2.0

import sys
from awsglue.context import GlueContext
from awsglue.dynamicframe import DynamicFrame
from awsglue.job import Job
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from pyspark.sql.functions import *
import json
import boto3
import base64

args = getResolvedOptions(sys.argv, ['redshift_tmp_dir', 'JOB_NAME', "curated_table", "redshift_table", 'redshift_schema',
                                     'redshift_database', 'redshift_secret_name', 'redshift_iam_role',  "curated_dbname"])


def get_secret(secret_name):
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name="ca-central-1"
    )

    get_secret_value_response = client.get_secret_value(
        SecretId=secret_name)

    # Decrypt secret with the KMS key
    if "SecretString" in get_secret_value_response:
        print("Using secret string")
        secret = get_secret_value_response['SecretString']
        return secret
    else:
        print("Using binary string")
        secret = base64.b64decode(get_secret_value_response['SecretBinary'])
        return secret


sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

input_df = glueContext.create_dynamic_frame.from_catalog(
    database=args['curated_dbname'],
    table_name=args['curated_table'],
    transformation_ctx="input_df")

input_df.show()

redshift_tmp_dir = args["redshift_tmp_dir"]
redshift_schema = args['redshift_schema']
redshift_table = args['redshift_table']
redshift_iam_role = args['redshift_iam_role']
redshift_database = args['redshift_database']
redshift_secret_name = args['redshift_secret_name']
redshift_secret_value = json.loads(get_secret(redshift_secret_name))
redshift_host = redshift_secret_value['host']
redshift_port = redshift_secret_value['port']
redshift_username = redshift_secret_value['username'].lower()
redshift_password = redshift_secret_value['password']

redshift_url = f"jdbc:redshift://{redshift_host}:{redshift_port}/{redshift_database}"
print(f"Connecting to Redshift url: {redshift_url}")
redshift_conn_options = {
    "url": redshift_url,
    "dbtable": redshift_table,
    "user": redshift_username,
    "password": redshift_password,
    "redshiftTmpDir": redshift_tmp_dir,
    "aws_iam_role": redshift_iam_role
}

# Write data to redshift
datasink1 = glueContext.write_dynamic_frame.from_options(
    frame=input_df,
    connection_type="redshift",
    connection_options=redshift_conn_options
)

job.commit()

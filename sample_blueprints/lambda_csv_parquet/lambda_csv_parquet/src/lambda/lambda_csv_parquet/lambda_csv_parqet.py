import json
import boto3
import awswrangler as wr
import os

dest_bucket_name = os.environ.get("DEST_BUCKET_NAME")
if dest_bucket_name is None:
    raise "Destination bucket name must be set as environment variable 'DEST_BUCKET_NAME'"

dest_prefix = os.environ.get("DEST_PREFIX")
if dest_prefix is None:
    raise "Destination prefix must be set as environment variable 'DEST_PREFIX'"

def lambda_handler(event,context):
    print(json.dumps(event,indent=2))

    src_bucket_name = event['detail']['bucket']['name']
    src_key = event['detail']['object']['key']

    input_path = f"s3://{src_bucket_name}/{src_key}"
    print(f'Input Path: {input_path}')

    output_path = f"s3://{dest_bucket_name}/{dest_prefix}"
    print(f'Output Path: {output_path}')

    input_df = wr.s3.read_csv([input_path])

    result = wr.s3.to_parquet(
        df=input_df,
        path=output_path,
        dataset=True)

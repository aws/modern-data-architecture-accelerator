import logging
import sys
import boto3
from boto3.dynamodb.conditions import Key, Attr
import datetime
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from pyspark.context import SparkConf  
from pyspark.sql.functions import *


class FileTrackerStatus:
    """
    This is the class for CDC File tracking
    """
    def __init__(self, source_table_name):
        self.source_table_name = source_table_name
        self.dynamodb = boto3.resource('dynamodb')
        self.dynamodb_client = boto3.client('dynamodb')

    def get_raw_files(self):
        """
        This function will get the list of CDC files that needs to be processed for an Iceberg table
        :return: full_refresh_list : A list of full load CDC files
               : incremental_refresh_list: A list of incremental CDC files
               : all_files: A list of dictionaries with table refresh configuration data
        """
        input_params = args['input_params']
        ddb_file_tracker_table = eval(input_params)['ddb_file_tracker_table']
        paginator = self.dynamodb.meta.client.get_paginator("query")
        pages = paginator.paginate(
            TableName=ddb_file_tracker_table,
            KeyConditionExpression=Key("source_table_name").eq(self.source_table_name),
            FilterExpression=Attr('file_ingestion_status').eq('raw_file_landed')
        )
        all_files = []
        full_refresh_list = []
        incremental_refresh_list = []
        incremental_file_tracker_list = []
        full_load_file_tracker_list = []
        for page in pages:
            all_files.extend(page['Items'])
            
        if len(all_files) > 0:
            full_load_file_tracker_list = [item for item in all_files if item['dms_file_type'] == 'Full' and item['file_ingestion_status'] == 'raw_file_landed']
            incremental_file_tracker_list = [item for item in all_files if item['dms_file_type'] == 'Incremental' and item['file_ingestion_status'] == 'raw_file_landed']
            
            dms_df = sc.parallelize(all_files).toDF()
            dms_df.createOrReplaceTempView("v1")
            dms_df_incremental = spark.sql("select \
                                        concat('s3://', file_ingestion_s3_bucket, '/', file_ingestion_path) dms_file \
                                            from v1 where dms_file_type = 'Incremental' and  \
                                                file_ingestion_status = 'raw_file_landed'   and  \
                                                file_ingestion_date_time > "
                                           "(select coalesce(max(file_ingestion_date_time), '0') \
                                            from v1 where dms_file_type = 'Full' \
                                                 and file_ingestion_status = 'raw_file_landed')")
            incremental_refresh_list = dms_df_incremental.rdd.map(lambda x: x[0]).collect()
            if len(incremental_refresh_list) > 0:
                logger.info('Number of Incremental Load Files : ' + str(len(incremental_refresh_list)))
            else:
                logger.info('No Incremental Load Files To Be Processed')
            dms_df_full = spark.sql(
                "select distinct concat('s3://', file_ingestion_s3_bucket, '/', file_ingestion_path) dms_file "
                "from v1 where dms_file_type = 'Full' and file_ingestion_status = 'raw_file_landed'")
            full_refresh_list = dms_df_full.rdd.map(lambda x: x[0]).collect()
            if len(full_refresh_list) > 0:
                logger.info('Number of Full Load Files : {}'.format(str(len(full_refresh_list))))
            else:
                logger.info('No Full Load Files To Be Processed')
        return full_refresh_list, incremental_refresh_list, incremental_file_tracker_list, full_load_file_tracker_list

    def update_dms_file_tracker(self, refresh_file_list):
        """
        This function will update the processing status of the DMS files (full and cdc)
        Parameters:
            refresh_file_list(List): The list of DMS files that were processed
        """
        for file in refresh_file_list:
            input_params = args['input_params']
            ddb_file_tracker_history_table = eval(input_params)['ddb_file_tracker_history_table']
            ddb_file_tracker_table = eval(input_params)['ddb_file_tracker_table']
            file["file_ingestion_status"] = 'raw_file_processed'
            file["glue_job_run_id"] = args['JOB_RUN_ID']
            self.dynamodb_client.transact_write_items(
                TransactItems=[
                    {'Put': {'TableName': ddb_file_tracker_history_table,
                             'Item': {
                                 'source_table_name': {'S': file['source_table_name']},
                                 'file_id': {'S': file['file_id']},
                                 'file_ingestion_status': {'S': file['file_ingestion_status']},
                                 'file_ingestion_date_time': {'S': file['file_ingestion_date_time']},
                                 'file_ingestion_s3_bucket': {'S': file['file_ingestion_s3_bucket']},
                                 'file_ingestion_path': {'S': file['file_ingestion_path']},
                                 'dms_file_type': {'S': file['dms_file_type']},
                                 'schema_name': {'S': file['schema_name']},
                                 'table_name': {'S': file['table_name']}
                             }
                             }
                     },
                    {'Delete': {'TableName': ddb_file_tracker_table,
                                'Key': {'source_table_name': {'S': file['source_table_name']},
                                        'file_id': {'S': file['file_id']}
                                        }
                                }
                     }
                ]
            )


class RawTableRefreshStatus:
    """
    This is the class for Iceberg Table refresh status
    """
    def __init__(self, refresh_table_name):
        self.refresh_table_name = refresh_table_name
        self.dynamodb = boto3.resource('dynamodb')
        self.dynamodb_client = boto3.client('dynamodb')

    def check_table_refresh_status(self):
        """
        This function gets the current execution status of the Glue Job
        Parameters:
            self.refresh_table_name(String): The full qualified table name
        Returns:
            refresh_status(Dict): DynamoDB record of the table refresh status
        """
        input_params = args['input_params']
        ddb_file_processing_tracker_table = eval(input_params)['ddb_file_processing_tracker_table']
        raw_table_refresh_status = None
        raw_pipeline_refresh_table = self.dynamodb.Table(ddb_file_processing_tracker_table)
        resp = raw_pipeline_refresh_table.get_item(
            Key={"raw_table_name": self.refresh_table_name, "glue_job_run_id": args['JOB_RUN_ID']}
        )
        if 'Item' in resp:
            raw_table_refresh_status = resp['Item']['refresh_status']
        return raw_table_refresh_status

    def init_refresh_status_rec(self):
        """
        This function initializes a table refresh status record
        :return: raw_table_refresh_rec: A dictionary with initialized table refresh status record
        """
        raw_table_refresh_rec = {"raw_table_name": self.refresh_table_name,
                                 "glue_job_run_id": args['JOB_RUN_ID'],
                                 "refresh_start_time": datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')}
        return raw_table_refresh_rec

    def update_raw_table_refresh_status(self, raw_table_refresh_status_rec):
        """
        This function updates the refresh status of the raw table
        Parameters:
            raw_table_refresh_status_rec(String): The table refresh record for the raw table
        """
        input_params = args['input_params']
        ddb_file_processing_tracker_table = eval(input_params)['ddb_file_processing_tracker_table']
        item = {'raw_table_name': {'S': raw_table_refresh_status_rec['raw_table_name']},
                'glue_job_run_id': {'S': raw_table_refresh_status_rec['glue_job_run_id']},
                'refresh_status': {'S': raw_table_refresh_status_rec['refresh_status']},
                'refresh_start_time': {'S': raw_table_refresh_status_rec['refresh_start_time']},
                'refresh_end_time': {'S': raw_table_refresh_status_rec['refresh_end_time']
                if 'refresh_end_time' in raw_table_refresh_status_rec else ''}
                }
        self.dynamodb_client.transact_write_items(TransactItems=[
            {'Put': {'TableName': ddb_file_processing_tracker_table,
                     'Item': item
                     }
             }
        ]
        )

    def update_raw_table_refresh_details(self, raw_table_ref_status_rec, raw_table_ref_details_rec):
        """
        This function updates the refresh status of the raw table
        Parameters:
            raw_table_ref_status_rec(String): The table refresh record for the raw table
            raw_table_ref_details_rec(String): The table refresh record for the raw table
                                         into the refresh history DynamoDB table
        """
        input_params = args['input_params']
        ddb_file_processing_tracker_history_table = eval(input_params)['ddb_file_processing_tracker_history_table']
        raw_table_refresh_history_rec = {**raw_table_ref_status_rec, **raw_table_ref_details_rec}
        item = {'raw_table_name': {'S': raw_table_refresh_history_rec['raw_table_name']},
                'glue_job_run_id': {'S': raw_table_refresh_history_rec['glue_job_run_id']},
                'refresh_status': {'S': raw_table_refresh_history_rec['refresh_status']},
                'refresh_start_time': {'S': raw_table_refresh_history_rec['refresh_start_time']},
                'refresh_end_time': {'S': raw_table_refresh_history_rec['refresh_end_time']
                if 'refresh_end_time' in raw_table_refresh_history_rec else ''},
                'error_msg': {'S': raw_table_refresh_history_rec['error_msg']
                if 'error_msg' in raw_table_refresh_history_rec else ''},
                'number_of_rows_inserted': {'S': str(raw_table_refresh_history_rec['number_of_rows_inserted'])
                if 'number_of_rows_inserted' in raw_table_refresh_history_rec else str(0)},
                'number_of_rows_updated': {'S': str(raw_table_refresh_history_rec['number_of_rows_updated'])
                if 'number_of_rows_updated' in raw_table_refresh_history_rec else str(0)},
                'number_of_rows_deleted': {'S': str(raw_table_refresh_history_rec['number_of_rows_deleted'])
                if 'number_of_rows_deleted' in raw_table_refresh_history_rec else str(0)}
                }
        self.dynamodb_client.transact_write_items(TransactItems=[
            {'Put': {'TableName': ddb_file_processing_tracker_history_table,
                     'Item': item
                     }
             }
        ]
        )


class CdcUpdates:
    """
    This is the class for performing Iceberg writes
    """
    def __init__(self, refresh_table_config):
        self.refresh_table_config = refresh_table_config

    def bulk_insert(self, full_ref_file_list):
        """
        This function will perform full load of an Iceberg table
        :param full_ref_file_list: A list of CDC full load files
        :return: full_load_result: A dictionary with insert rec count
        """
        raw_catalog_db_name = self.refresh_table_config['raw_catalog_name']
        raw_table_s3_path = f"s3://{self.refresh_table_config['raw_database_S3_bucket']}/{self.refresh_table_config['raw_table_name']}"
        
        full_load_df = spark.read.parquet(*full_ref_file_list)
        full_load_df.createOrReplaceTempView("fl_vw")
        full_load_df.printSchema()
        
        # for full load, we are creating a table if it does not exist already
        spark.sql(f"""
        CREATE TABLE IF NOT EXISTS glue_catalog.{raw_catalog_db_name}.{self.refresh_table_config['raw_table_name']}
        USING iceberg 
        OPTIONS ('write.object-storage.enabled'=true, 'write.data.path'='{raw_table_s3_path}')
        TBLPROPERTIES ("format-version"="2")
        AS SELECT * FROM fl_vw
        """)

        full_load_cnt = spark.sql("select count(1) rc from glue_catalog.{0}.{1}".format(
            raw_catalog_db_name, self.refresh_table_config['raw_table_name'])).first()['rc']
        logger.info("Number Of Rows Inserted For Full Load : {}".format(full_load_cnt))
        full_load_result = {'number_of_rows_inserted': str(full_load_cnt)}
        return full_load_result

    def incremental_updates(self, incremental_ref_file_list):
        """
        This function will apply incremental updates to Iceberg tables
        :param incremental_ref_file_list: A list of CDC incremental load files
        :return: incremental_refresh_result : A dictionary with insert / update / delete record counts
        """
        
        ins_cnt = 0
        upd_cnt = 0
        del_cnt = 0
        
        raw_catalog_db_name =  self.refresh_table_config['raw_catalog_name']

        incremental_load_df = spark.read.parquet(*incremental_ref_file_list)
        
        if self.refresh_table_config['glue_table_data_versioning_type'] == 'H':
            logger.info(f'Table Data Versioning is Historical')
            incremental_load_df.createOrReplaceTempView("v_inc")
            
            # for historical cdc, we insert ALL operations
            spark.sql(f"""
            INSERT INTO glue_catalog.{raw_catalog_db_name}.{self.refresh_table_config['raw_table_name']}
            SELECT * FROM v_inc
            """)
            
            logger.info('Incremental Row Count : ' + str(incremental_load_df.count()))
            ins_cnt = spark.sql("select count(1) cnt from v_inc where CDC_OPERATION ='INSERT'").first()['cnt']
            logger.info('Number of Inserts For Incremental Load : {}'.format(ins_cnt))
            upd_cnt = spark.sql("select count(1) cnt from v_inc where CDC_OPERATION ='UPDATE'").first()['cnt']
            logger.info('Number of Updates For Incremental Load : {}'.format(upd_cnt))
        else:
            incremental_load_df.createOrReplaceTempView("v_inc")
            # filter out duplicates by sorting by most recent records
            tmp_df = spark.sql(f"select * from (select a.*, \
                                    row_number() over(partition by {self.refresh_table_config['iceberg_primary_key']} \
                                            order by {self.refresh_table_config['iceberg_precombine_field']} desc) as rn from v_inc a ) b \
                                    where b.rn=1")
            upd_df = tmp_df.filter("Op in ('I', 'U')")
            del_df = tmp_df.filter("Op in ('D')")
            upd_df.createOrReplaceTempView("v_upd")
            del_df.createOrReplaceTempView("v_del")
            
            if len(upd_df.head(1)) > 0:

                # for snapshot cdc, we merge all operations
                spark.sql(f"""
                MERGE INTO glue_catalog.{raw_catalog_db_name}.{self.refresh_table_config['raw_table_name']} t
                USING v_upd s ON t.ID = s.ID
                WHEN MATCHED THEN UPDATE SET *
                WHEN NOT MATCHED THEN INSERT *
                """)

                logger.info('Incremental Row Count : ' + str(incremental_load_df.count()))
                ins_cnt = spark.sql("select count(1) cnt from v_upd where CDC_OPERATION ='INSERT'").first()['cnt']
                logger.info('Number of Inserts For Incremental Load : {}'.format(ins_cnt))
                upd_cnt = spark.sql("select count(1) cnt from v_upd where CDC_OPERATION ='UPDATE'").first()['cnt']
                logger.info('Number of Updates For Incremental Load : {}'.format(upd_cnt))
            else:
                logger.info('No Upsert Operations Performed')
                
            if len(del_df.head(1)) > 0:
                
                spark.sql(f"""
                MERGE INTO glue_catalog.{raw_catalog_db_name}.{self.refresh_table_config['raw_table_name']} t
                USING v_del s ON t.ID = s.ID
                WHEN MATCHED THEN DELETE
                """)
                logger.info('Incremental Row Count : ' + str(incremental_load_df.count()))
                del_cnt = spark.sql("select count(1) cnt from v_del where CDC_OPERATION ='DELETE'").first()['cnt']
                logger.info('Number of Deletes For Incremental Load : {}'.format(del_cnt))
            else:
                logger.info('No Delete Operations Performed')
                
        incremental_refresh_result = {'number_of_rows_inserted': ins_cnt,
                                      'number_of_rows_updated': upd_cnt,
                                      'number_of_rows_deleted': del_cnt}
        return incremental_refresh_result


def get_parameters():
    """
    This function fetches the Glue JOB input parameters
    Returns:
        table_list(List): A list of tables to be refreshed
    """
    input_params = args['input_params']
    raw_table_list = eval(input_params)['batch_chunk']
    return raw_table_list

def process_files():
    """
    This is the main method of CDC data refresh which will call other functions to perform
        1. Iceberg table Full data refresh
        2. Iceberg Incremental data refresh (insert / update / delete)
    :return: None
    """
    raw_tables = get_parameters()
    raw_table_refresh_status_obj = {}
    raw_table_refresh_status_rec = {}
    load_result = None
    try:
        for raw_table_config in raw_tables:
            load_result = {}
            raw_table = raw_table_config['raw_table_name']
            source_table = raw_table_config['source_table_name']
            logger.info(f"Processing Table : {raw_table_config}")
            raw_table_refresh_status_obj = RawTableRefreshStatus(raw_table)
            raw_table_refresh_status_rec = raw_table_refresh_status_obj.init_refresh_status_rec()
            file_tracker_obj = FileTrackerStatus(source_table)
            raw_table_refresh_status = raw_table_refresh_status_obj.check_table_refresh_status()
            if raw_table_refresh_status in [None, "completed", "refresh_error"]:
                raw_table_refresh_status_rec["refresh_status"] = "updating_table"
                raw_table_refresh_status_obj.update_raw_table_refresh_status(raw_table_refresh_status_rec)
                full_refresh_files, incremental_refresh_files, incremental_file_tracker_list, full_load_file_tracker_list = file_tracker_obj.get_raw_files()
                logger.info(f'incremental_file_tracker_list : {incremental_file_tracker_list}')
                logger.info(f'full_load_file_tracker_list : {full_load_file_tracker_list}')
                
                if len(full_refresh_files) > 0:
                    logger.info(f'Processing Full Load For Table : {raw_table}')
                    cdc_load = CdcUpdates(raw_table_config)
                    load_result = cdc_load.bulk_insert(full_refresh_files)
                    file_tracker_obj.update_dms_file_tracker(full_load_file_tracker_list)
                else:
                    logger.info(f'No Full Load CDC Files For Table : {raw_table}')
                if len(incremental_refresh_files) > 0:
                    print(f'Processing Incremental Load For Table : {raw_table}')
                    cdc_load = CdcUpdates(raw_table_config)
                    load_result = cdc_load.incremental_updates(incremental_refresh_files)
                    file_tracker_obj.update_dms_file_tracker(incremental_file_tracker_list)
                else:
                    logger.info(f'No Incremental Load CDC Files For Table : {raw_table}')
                raw_table_refresh_status_rec["refresh_status"] = "completed"
                raw_table_refresh_status_rec["refresh_end_time"] = datetime.datetime.now().strftime(
                    '%Y-%m-%d %H:%M:%S.%f')
                raw_table_refresh_status_obj.update_raw_table_refresh_status(raw_table_refresh_status_rec)
                raw_table_refresh_status_obj.update_raw_table_refresh_details(raw_table_refresh_status_rec, load_result)
    except Exception as e:
        logger.exception(e)
        raw_table_refresh_status_rec["refresh_status"] = "refresh_error"
        raw_table_refresh_status_rec["refresh_end_time"] = datetime.datetime.now().strftime(
            '%Y-%m-%d %H:%M:%S.%f')
        load_result['error_msg'] = str(e)
        raw_table_refresh_status_obj.update_raw_table_refresh_status(raw_table_refresh_status_rec)
        raw_table_refresh_status_obj.update_raw_table_refresh_details(raw_table_refresh_status_rec,
                                                                      load_result)


if __name__ == "__main__":
    logger = logging.getLogger('raw tables refresh')
    logger.setLevel(logging.INFO)
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    args = getResolvedOptions(sys.argv, ["JOB_NAME", "input_params"])
    raw_bucket_name = eval(args["input_params"])["batch_chunk"][0]["raw_database_S3_bucket"]
    config = SparkConf().setAll(
        [
            ("spark.sql.extensions", "org.apache.iceberg.spark.extensions.IcebergSparkSessionExtensions"),
            ("spark.sql.catalog.glue_catalog", "org.apache.iceberg.spark.SparkCatalog"),
            ("spark.sql.catalog.glue_catalog.warehouse", f"s3://{raw_bucket_name}"),
            ("spark.sql.catalog.glue_catalog.catalog-impl", "org.apache.iceberg.aws.glue.GlueCatalog"),
            ("spark.sql.catalog.glue_catalog.io-impl", "org.apache.iceberg.aws.s3.S3FileIO"),
            ("spark.sql.parquet.datetimeRebaseModeInRead", "CORRECTED")
        ]
    )
    sc = SparkContext(conf=config)
    glueContext = GlueContext(sc)
    spark = glueContext.spark_session
    process_files()
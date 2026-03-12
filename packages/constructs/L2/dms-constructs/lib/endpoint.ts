/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { CfnEndpoint, CfnEndpointProps } from 'aws-cdk-lib/aws-dms';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

/**
 * Provides information that defines a SAP ASE endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For information about other available settings, see [Extra connection attributes when using SAP ASE as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.SAP.html#CHAP_Source.SAP.ConnectionAttrib) and [Extra connection attributes when using SAP ASE as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.SAP.html#CHAP_Target.SAP.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-sybasesettings.html
 */
export interface SybaseSettingsProperty {
  /** IAM role ARN for DMS to access Secrets Manager secret containing Sybase endpoint */
  readonly secretsManagerAccessRoleArn?: string;
  readonly secretsManagerSecretArn: string;
  /** KMS key ARN for encrypting Secrets Manager secret containing Sybase credentials enabling */
  readonly secretsManagerSecretKMSArn?: string;
}
/**
 * Provides information that defines an Oracle endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For information about other available settings, see [Extra connection attributes when using Oracle as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html#CHAP_Source.Oracle.ConnectionAttrib) and [Extra connection attributes when using Oracle as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Oracle.html#CHAP_Target.Oracle.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-oraclesettings.html
 */
export interface OracleSettingsProperty {
  /** Flag to disable Binary Reader access to redo logs through direct file access for Oracle RDS sources */
  readonly accessAlternateDirectly?: boolean;
  /** Additional archived log destination ID for Oracle primary/standby switchover scenarios */
  readonly additionalArchivedLogDestId?: number;
  /** Flag to enable table-level supplemental logging for Oracle database migration tasks */
  readonly addSupplementalLogging?: boolean;
  /** Flag to enable replication of Oracle tables with nested tables or defined types for complex */
  readonly allowSelectNestedTables?: boolean;
  /** Archived redo log destination ID for Oracle change data capture configuration */
  readonly archivedLogDestId?: number;
  /** Flag to restrict DMS access to archived redo logs only for Oracle replication */
  readonly archivedLogsOnly?: boolean;
  /** ASM server address for Oracle source endpoint Binary Reader configuration */
  readonly asmServer?: string;
  /** Character length semantics specification for Oracle character column interpretation */
  readonly charLengthSemantics?: string;
  /** Flag to enable direct path loading without database logging for Oracle target performance optimization */
  readonly directPathNoLog?: boolean;
  /** Flag to enable parallel loading when direct path full load is active for Oracle target */
  readonly directPathParallelLoad?: boolean;
  /** Flag to enable homogeneous tablespace replication for Oracle target database consistency */
  readonly enableHomogenousTablespace?: boolean;
  /** Array of additional archived log destination IDs for Oracle Data Guard switchover scenarios */
  readonly extraArchivedLogDestIds?: Array<number>;
  /** Flag to cause task failure when LOB column size exceeds specified LobMaxSize limit */
  readonly failTasksOnLobTruncation?: boolean;
  /** Number data type scale specification for Oracle NUMBER data type conversion precision */
  readonly numberDatatypeScale?: number;
  /** Oracle path prefix for Binary Reader redo log access configuration */
  readonly oraclePathPrefix?: string;
  /** Number of parallel ASM read threads for Oracle change data capture performance optimization */
  readonly parallelAsmReadThreads?: number;
  /** Number of read-ahead blocks for Oracle ASM change data capture performance optimization */
  readonly readAheadBlocks?: number;
  /** Flag to enable tablespace name reading for Oracle tablespace replication support */
  readonly readTableSpaceName?: boolean;
  /** Flag to enable path prefix replacement for Binary Reader redo log access */
  readonly replacePathPrefix?: boolean;
  /** Retry interval in seconds for Oracle connection query retry operations */
  readonly retryInterval?: number;
  /** IAM role ARN for AWS Secrets Manager access to Oracle endpoint credentials */
  readonly secretsManagerAccessRoleArn?: string;
  /** IAM role ARN for AWS Secrets Manager access to Oracle ASM credentials when using Advanced Storage Manager */
  readonly secretsManagerOracleAsmAccessRoleArn?: string;
  /** Secrets Manager secret ARN containing Oracle ASM connection details for Advanced Storage Manager endpoints */
  readonly secretsManagerOracleAsmSecretArn?: string;
  /** Secrets Manager secret ARN containing Oracle endpoint connection details for secure credential management */
  readonly secretsManagerSecretArn: string;
  /** KMS key ARN for encrypting Oracle endpoint credentials secret in Secrets Manager */
  readonly secretsManagerSecretKMSArn?: string;
  /** Custom function name for converting Oracle SDO_GEOMETRY to GEOJSON format during spatial data migration */
  readonly spatialDataOptionToGeoJsonFunctionName?: string;
  /** Standby delay time in minutes for Oracle Active Data Guard standby database synchronization */
  readonly standbyDelayTime?: number;
  /** Flag to enable alternate folder usage for online redo logs with Binary Reader for Oracle RDS sources */
  readonly useAlternateFolderForOnline?: boolean;
  /** Flag to enable Binary Reader utility for Oracle change data capture operations */
  readonly useBFile?: boolean;
  /** Flag to enable direct path full load for Oracle target database performance optimization */
  readonly useDirectPathFullLoad?: boolean;
  /** Flag to enable Oracle LogMiner utility for change data capture operations (default method) */
  readonly useLogminerReader?: boolean;
  /** Path prefix for Binary Reader redo log access replacement in Oracle RDS sources */
  readonly usePathPrefix?: string;
}

/**
 * Provides information that defines a MySQL endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For information about other available settings, see [Extra connection attributes when using MySQL as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html#CHAP_Source.MySQL.ConnectionAttrib) and [Extra connection attributes when using a MySQL-compatible database as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.MySQL.html#CHAP_Target.MySQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-mysqlsettings.html
 */
export interface MySqlSettingsProperty {
  /** SQL script to execute immediately after DMS connects to the MySQL endpoint for initialization tasks */
  readonly afterConnectScript?: string;
  /** Flag to clean and recreate table metadata on replication instance when mismatches occur */
  readonly cleanSourceMetadataOnMismatch?: boolean;
  /** Polling interval in seconds for checking MySQL binary log changes when database is idle */
  readonly eventsPollInterval?: number;
  /** Maximum CSV file size in KB for MySQL data transfer operations */
  readonly maxFileSize?: number;
  /** Number of parallel threads for loading data into MySQL-compatible target databases for */
  readonly parallelLoadThreads?: number;
  /** IAM role ARN for AWS Secrets Manager access to MySQL endpoint credentials */
  readonly secretsManagerAccessRoleArn?: string;
  /** Secrets Manager secret ARN containing MySQL endpoint connection details for secure credential management */
  readonly secretsManagerSecretArn: string;
  /** KMS key ARN for encrypting MySQL endpoint credentials secret in Secrets Manager */
  readonly secretsManagerSecretKMSArn?: string;
  /** Time zone specification for MySQL source database configuration */
  readonly serverTimezone?: string;
  /** Target database type specification for MySQL migration destination configuration */
  readonly targetDbType?: string;
}
/**
 * Provides information that defines an Amazon S3 endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For more information about the available settings, see [Extra connection attributes when using Amazon S3 as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.S3.html#CHAP_Source.S3.Configuring) and [Extra connection attributes when using Amazon S3 as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.Configuring) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-s3settings.html
 */
export interface S3SettingsProperty {
  /** Flag to add column name information to CSV output files for S3 data lake integration */
  readonly addColumnName?: boolean;
  /** S3 bucket folder name for organizing migrated data with hierarchical structure */
  readonly bucketFolder?: string;
  /** S3 bucket name for DMS data migration destination in data lake architecture */
  readonly bucketName: string;
  /** Predefined access control list (ACL) for S3 objects created during data migration */
  readonly cannedAclForObjects?: string;
  /** Flag to enable CDC INSERT and UPDATE operations capture to S3 files for change tracking */
  readonly cdcInsertsAndUpdates?: boolean;
  /** Flag to enable CDC INSERT-only operations capture to S3 files for insert-focused change tracking */
  readonly cdcInsertsOnly?: boolean;
  /** Maximum batch interval in seconds for CDC file output to S3 for time-based file creation */
  readonly cdcMaxBatchInterval?: number;
  /** Minimum file size in kilobytes for CDC file output to S3 for size-based file creation */
  readonly cdcMinFileSize?: number;
  /** CDC folder path specification for change data capture file organization in S3 */
  readonly cdcPath?: string;
  /** Compression type for S3 target files to optimize storage and transfer performance */
  readonly compressionType?: string;
  /** Column delimiter for CSV file format in S3 data lake integration */
  readonly csvDelimiter?: string;
  /** String value for columns not included in supplemental log during CDC CSV operations */
  readonly csvNoSupValue?: string;
  /** Null value representation for CSV files in S3 data lake operations */
  readonly csvNullValue?: string;
  /** Row delimiter for CSV files in S3 data lake integration */
  readonly csvRowDelimiter?: string;
  /** Data format specification for S3 output files in data lake architecture */
  readonly dataFormat?: string;
  /** Data page size in bytes for Parquet file format optimization */
  readonly dataPageSize?: number;
  /** Date partition delimiter for S3 folder partitioning organization */
  readonly datePartitionDelimiter?: string;
  /** Flag to enable date-based folder partitioning for S3 bucket organization */
  readonly datePartitionEnabled?: boolean;
  /** Date format sequence for folder partitioning organization in S3 data lake */
  readonly datePartitionSequence?: string;
  /** Time zone specification for date partition folder creation and CDC file naming */
  readonly datePartitionTimezone?: string;
  /** Maximum dictionary page size limit for Parquet column encoding optimization */
  readonly dictPageSizeLimit?: number;
  /** Flag to enable statistics collection for Parquet pages and row groups for query optimization */
  readonly enableStatistics?: boolean;
  /** Encoding type specification for Parquet file compression and storage optimization */
  readonly encodingType?: string;
  /** External table definition for S3 source configuration in data lake integration */
  readonly externalTableDefinition?: string;
  /** Number of header rows to ignore in CSV files for S3 source processing */
  readonly ignoreHeaderRows?: number;
  /** Flag to include INSERT operation indicators in full load CSV output for consistency with CDC operations */
  readonly includeOpForFullLoad?: boolean;
  /** Maximum CSV file size in KB for S3 target during full load migration operations */
  readonly maxFileSize?: number;
  /** Flag to set TIMESTAMP column precision to milliseconds in Parquet files for Athena and Glue compatibility */
  readonly parquetTimestampInMillisecond?: boolean;
  /** Apache Parquet format version specification for S3 data lake columnar storage */
  readonly parquetVersion?: string;
  /** Flag to preserve transaction order for CDC loads in S3 target for data consistency */
  readonly preserveTransactions?: boolean;
  /** Flag to enable RFC 4180 compliance for CSV quotation mark handling in S3 operations */
  readonly rfc4180?: boolean;
  /** Number of rows in Parquet row group for read/write performance optimization */
  readonly rowGroupLength?: number;
  /** KMS key ID for server-side encryption when using SSE_KMS encryption mode for S3 data lake security */
  readonly serverSideEncryptionKmsKeyId: string;
  /** IAM role ARN for DMS service access to S3 bucket operations for data lake integration */
  readonly serviceAccessRoleArn?: string;
  /** Timestamp column name for adding migration timing information to S3 data lake files */
  readonly timestampColumnName?: string;
  /** Flag to use task start time for full load timestamp column instead of data arrival time */
  readonly useTaskStartTimeForFullLoadTimestamp?: boolean;
  /** Flag to use CsvNoSupValue for columns not in supplemental log during CDC CSV operations */
  readonly useCsvNoSupValue?: boolean;
}
/**
 * Provides information that describes an Amazon Kinesis Data Stream endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For more information about other available settings, see [Using object mapping to migrate data to a Kinesis data stream](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Kinesis.html#CHAP_Target.Kinesis.ObjectMapping) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-kinesissettings.html
 */
export interface KinesisSettingsProperty {
  /** Flag to show detailed control information for table and column changes in Kinesis message */
  readonly includeControlDetails?: boolean;
  /** Flag to include NULL and empty columns in records migrated to Kinesis endpoint for complete */
  readonly includeNullAndEmpty?: boolean;
  /** Flag to show partition value in Kinesis message output unless partition type is schema-table-type */
  readonly includePartitionValue?: boolean;
  /** Flag to include DDL operations that change table structure in control data for schema change tracking */
  readonly includeTableAlterOperations?: boolean;
  /** Flag to provide detailed transaction information from source database for transaction tracking */
  readonly includeTransactionDetails?: boolean;
  /** Output format specification for records created on Kinesis endpoint for streaming data format control */
  readonly messageFormat?: string;
  /** Flag to avoid adding '0x' prefix to raw data in hexadecimal format for cleaner data representation */
  readonly noHexPrefix?: boolean;
  /** Flag to prefix schema and table names to partition values for improved data distribution across Kinesis shards */
  readonly partitionIncludeSchemaTable?: boolean;
  /** IAM role ARN for DMS service access to Kinesis data stream for secure streaming operations */
  readonly serviceAccessRoleArn?: string;
  /** Amazon Kinesis Data Streams endpoint ARN for DMS streaming destination configuration */
  readonly streamArn: string;
}
/**
 * Provides information that defines an Amazon Redshift endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For more information about other available settings, see [Extra connection attributes when using Amazon Redshift as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Redshift.html#CHAP_Target.Redshift.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-redshiftsettings.html
 */
export interface RedshiftSettingsProperty {
  /** Flag to allow any date format including invalid formats for flexible date handling in Redshift data warehouse */
  readonly acceptAnyDate?: boolean;
  /** SQL script to execute after connecting to Redshift endpoint for initialization and setup tasks */
  readonly afterConnectScript?: string;
  /** S3 folder for storing CSV files before uploading to Redshift cluster for staged data loading */
  readonly bucketFolder?: string;
  /** S3 bucket name for intermediate CSV file storage before Redshift data loading operations */
  readonly bucketName: string;
  /** Flag to enable case-sensitive schema names in Redshift data warehouse for precise schema handling */
  readonly caseSensitiveNames?: boolean;
  /** Flag to enable automatic compression for empty Redshift tables for storage optimization */
  readonly compUpdate?: boolean;
  /** Connection timeout in milliseconds for Redshift endpoint connection establishment */
  readonly connectionTimeout?: number;
  /** Date format specification for Redshift data loading and date handling */
  readonly dateFormat?: string;
  /** Flag to migrate empty CHAR and VARCHAR fields as NULL for consistent null handling */
  readonly emptyAsNull?: boolean;
  /** Flag to override auto-generated IDENTITY column values with explicit source values for full-load migration */
  readonly explicitIds?: boolean;
  /** Number of parallel threads for single file upload to optimize S3 multipart upload performance */
  readonly fileTransferUploadStreams?: number;
  /** Timeout in milliseconds for Redshift cluster operations including COPY, INSERT, DELETE, and UPDATE */
  readonly loadTimeout?: number;
  /** Flag to migrate boolean type as native boolean in Redshift for proper data type representation */
  readonly mapBooleanAsBoolean?: boolean;
  /** Maximum CSV file size in KB for S3 staging and Redshift data transfer optimization */
  readonly maxFileSize?: number;
  /** Flag to remove surrounding quotation marks from strings in incoming data for cleaner data processing */
  readonly removeQuotes?: boolean;
  /** Replacement character for invalid characters specified in ReplaceInvalidChars for data cleaning */
  readonly replaceChars?: string;
  /** List of characters to replace during data migration for data cleaning */
  readonly replaceInvalidChars?: string;
  /** IAM role ARN for AWS Secrets Manager access to Redshift endpoint credentials */
  readonly secretsManagerAccessRoleArn?: string;
  /** Secrets Manager secret ARN containing Redshift endpoint connection details for secure credential management */
  readonly secretsManagerSecretArn: string;
  /** KMS key ARN for encrypting Redshift endpoint credentials secret in Secrets Manager */
  readonly secretsManagerSecretKMSArn?: string;
  /** KMS key ID for server-side encryption when using SSE_KMS encryption mode for Redshift S3 staging security */
  readonly serverSideEncryptionKmsKeyId: string;
  /** IAM role ARN for DMS service access to Redshift service operations for data warehouse integration */
  readonly serviceAccessRoleArn?: string;
  /** Time format specification for Redshift data loading and time handling */
  readonly timeFormat?: string;
  /** Flag to remove trailing white space characters from VARCHAR strings for cleaner data processing */
  readonly trimBlanks?: boolean;
  /** Flag to truncate data in columns to fit column size limits for data integrity in Redshift */
  readonly truncateColumns?: boolean;
  /** In-memory file write buffer size in KB for CSV file generation performance optimization */
  readonly writeBufferSize?: number;
}
/**
 * Provides information that defines a MongoDB endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For more information about other available settings, see [Endpoint configuration settings when using MongoDB as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MongoDB.html#CHAP_Source.MongoDB.Configuration) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-mongodbsettings.html
 */
export interface MongoDbSettingsProperty {
  /** Authentication mechanism for MongoDB source endpoint access with version-specific defaults */
  readonly authMechanism?: string;
  /** MongoDB database name for authentication with default "admin" database */
  readonly authSource?: string;
  /** Authentication type for MongoDB source endpoint access control */
  readonly authType?: string;
  /** Database name on MongoDB source endpoint for migration scope specification */
  readonly databaseName?: string;
  /** Number of documents to preview for document organization analysis when using table mode */
  readonly docsToInvestigate?: string;
  /** Flag to specify document ID extraction when using document mode */
  readonly extractDocId?: string;
  /** Nesting level specification for document or table mode selection */
  readonly nestingLevel?: string;

  /**
   * The port value for the MongoDB source endpoint.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-mongodbsettings.html#cfn-dms-endpoint-mongodbsettings-port
   */
  readonly port?: number;
  /**
   * The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in `SecretsManagerSecret` .
   * The role must allow the `iam:PassRole` action. `SecretsManagerSecret` has the value of the AWS Secrets Manager secret that allows access to the MongoDB endpoint.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-mongodbsettings.html#cfn-dms-endpoint-mongodbsettings-secretsmanageraccessrolearn
   */
  readonly secretsManagerAccessRoleArn?: string;
  /**
   * The full ARN of the `SecretsManagerSecret` that contains the MongoDB endpoint connection details.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-mongodbsettings.html#cfn-dms-endpoint-mongodbsettings-secretsmanagersecretid
   */
  readonly secretsManagerSecretArn: string;
  /**
   * The ID of the KMS key used to encrypt the credentials secret.
   */
  readonly secretsManagerSecretKMSArn?: string;
  /**
   * The name of the server on the MongoDB source endpoint.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-mongodbsettings.html#cfn-dms-endpoint-mongodbsettings-servername
   */
  readonly serverName?: string;
}
/**
 * Provides information that defines an IBMDB2 endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For more information about other available settings, see [Extra connection attributes when using Db2 LUW as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.DB2.html#CHAP_Source.DB2.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-ibmdb2settings.html
 */
export interface IbmDb2SettingsProperty {
  /** Log sequence number (LSN) for IBM DB2 change data capture (CDC) replication starting point */
  readonly currentLsn?: string;
  /** Maximum bytes per read operation for IBM DB2 data transfer performance optimization enabling throughput tuning */
  readonly maxKBytesPerRead?: number;
  /**
   * The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in `SecretsManagerSecret` .
   * The role must allow the `iam:PassRole` action. `SecretsManagerSecret` has the value ofthe AWS Secrets Manager secret that allows access to the Db2 LUW endpoint.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-ibmdb2settings.html#cfn-dms-endpoint-ibmdb2settings-secretsmanageraccessrolearn
   */
  readonly secretsManagerAccessRoleArn?: string;
  /**
   * The full ARN of the `SecretsManagerSecret` that contains the IBMDB2 endpoint connection details.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-ibmdb2settings.html#cfn-dms-endpoint-ibmdb2settings-secretsmanagersecretid
   */
  readonly secretsManagerSecretArn: string;
  /**
   * The ID of the KMS key used to encrypt the credentials secret.
   */
  readonly secretsManagerSecretKMSArn?: string;
  /**
   * Enables ongoing replication (CDC) as a BOOLEAN value.
   * The default is true.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-ibmdb2settings.html#cfn-dms-endpoint-ibmdb2settings-setdatacapturechanges
   */
  readonly setDataCaptureChanges?: boolean;
}
/**
 * Provides information that defines an Amazon Neptune endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For more information about the available settings, see [Specifying endpoint settings for Amazon Neptune as a target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Neptune.html#CHAP_Target.Neptune.EndpointSettings) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-neptunesettings.html
 */
export interface NeptuneSettingsProperty {
  /** Retry duration in milliseconds for DMS bulk-load operations to Neptune target database */
  readonly errorRetryDuration?: number;
  readonly maxFileSize?: number;
  /** Maximum retry count for DMS bulk-load operations to Neptune target database enabling */
  readonly maxRetryCount?: number;
  readonly s3BucketFolder?: string;
  /** S3 bucket name for temporary storage of migrated graph data during DMS Neptune migration */
  readonly s3BucketName: string;
  readonly serviceAccessRoleArn?: string;
}
/**
 * Provides information that defines an OpenSearch endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For more information about the available settings, see [Extra connection attributes when using OpenSearch as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Elasticsearch.html#CHAP_Target.Elasticsearch.Configuration) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-elasticsearchsettings.html
 */
export interface ElasticsearchSettingsProperty {
  /** OpenSearch cluster endpoint URI for DMS target connectivity enabling search engine data migration and indexing */
  readonly endpointUri?: string;
  readonly errorRetryDuration?: number;
  /** Maximum percentage of failed records before stopping full load operation enabling */
  readonly fullLoadErrorPercentage?: number;
  readonly serviceAccessRoleArn?: string;
}
/**
 * Provides information that defines a DocumentDB endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For more information about other available settings, see [Using extra connections attributes with Amazon DocumentDB as a source](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.DocumentDB.html#CHAP_Source.DocumentDB.ECAs) and [Using Amazon DocumentDB as a target for AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DocumentDB.html) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-docdbsettings.html
 */
export interface DocDbSettingsProperty {
  /** Number of documents to preview for determining document organization and schema inference */
  readonly docsToInvestigate?: number;
  readonly extractDocId?: boolean;
  /** Nesting level specification for DocumentDB migration mode selection enabling document or table mode migration */
  readonly nestingLevel?: string;
  readonly secretsManagerAccessRoleArn?: string;
  /** Secrets Manager secret ARN containing DocumentDB endpoint connection details enabling */
  readonly secretsManagerSecretArn: string;
  readonly secretsManagerSecretKMSArn?: string;
}
/**
 * Provides information, including the Amazon Resource Name (ARN) of the IAM role used to define an Amazon DynamoDB target endpoint.  Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information also includes the output format of records applied to the endpoint and details of transaction and control table data information. For information about other available settings, see [Using object mapping to migrate data to DynamoDB](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DynamoDB.html#CHAP_Target.DynamoDB.ObjectMapping) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-dynamodbsettings.html
 */
export interface DynamoDbSettingsProperty {
  /** IAM service role ARN for DMS DynamoDB endpoint access enabling secure authentication and */
  readonly serviceAccessRoleArn?: string;
}
/**
 * Provides information that defines a Microsoft SQL Server endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For information about other available settings, see [Extra connection attributes when using SQL Server as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.SQLServer.html#CHAP_Source.SQLServer.ConnectionAttrib) and [Extra connection attributes when using SQL Server as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.SQLServer.html#CHAP_Target.SQLServer.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html
 */
export interface MicrosoftSqlServerSettingsProperty {
  /** BCP packet size in bytes for SQL Server data transfer optimization enabling performance */
  readonly bcpPacketSize?: number;
  readonly controlTablesFileGroup?: string;
  /** Database name for SQL Server endpoint connectivity enabling specific database targeting */
  readonly databaseName?: string;
  readonly forceLobLookup?: boolean;

  /** TCP port number for SQL Server endpoint connectivity enabling custom port configuration for */
  readonly port?: number;
  readonly querySingleAlwaysOnNode?: boolean;
  /** Flag to read changes only from transaction log backups enabling controlled transaction log */
  readonly readBackupOnly?: boolean;
  readonly safeguardPolicy?: string;
  /** IAM role ARN for DMS to access Secrets Manager secret containing SQL Server credentials */
  readonly secretsManagerAccessRoleArn?: string;
  readonly secretsManagerSecretArn: string;
  /** KMS key ARN for encrypting Secrets Manager secret containing SQL Server credentials */
  readonly secretsManagerSecretKMSArn?: string;
  readonly serverName?: string;
  /** Transaction log access mode for CDC data fetching enabling optimized change data capture in */
  readonly tlogAccessMode?: string;
  readonly trimSpaceInChar?: boolean;
  /** Flag to use BCP for full-load operations enabling optimized bulk data transfer in SQL Server migration */
  readonly useBcpFullLoad?: boolean;
  readonly useThirdPartyBackupDevice?: boolean;
}
/**
 * Provides information that defines a GCP MySQL endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. These settings are much the same as the settings for any MySQL-compatible endpoint. For more information, see [Extra connection attributes when using MySQL as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html#CHAP_Source.MySQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-gcpmysqlsettings.html
 */
export interface GcpMySQLSettingsProperty {
  /**
   * Specifies a script to run immediately after AWS DMS connects to the endpoint.
   * The migration task continues running regardless if the SQL statement succeeds or fails.
   * For this parameter, provide the code of the script itself, not the name of a file containing the script.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-gcpmysqlsettings.html#cfn-dms-endpoint-gcpmysqlsettings-afterconnectscript
   */
  readonly afterConnectScript?: string;
  /**
   * Adjusts the behavior of AWS DMS when migrating from an SQL Server source database that is hosted as part of an Always On availability group cluster.
   * If you need AWS DMS to poll all the nodes in the Always On cluster for transaction backups, set this attribute to `false` .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-gcpmysqlsettings.html#cfn-dms-endpoint-gcpmysqlsettings-cleansourcemetadataonmismatch
   */
  readonly cleanSourceMetadataOnMismatch?: boolean;
  /**
   * Database name for the endpoint.
   * For a MySQL source or target endpoint, don't explicitly specify the database using the `DatabaseName` request parameter on either the `CreateEndpoint` or `ModifyEndpoint` API call. Specifying `DatabaseName` when you create or modify a MySQL endpoint replicates all the task tables to this single database. For MySQL endpoints, you specify the database only when you specify the schema in the table-mapping rules of the AWS DMS task.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-gcpmysqlsettings.html#cfn-dms-endpoint-gcpmysqlsettings-databasename
   */
  readonly databaseName?: string;
  /**
   * Specifies how often to check the binary log for new changes/events when the database is idle.
   * The default is five seconds.
   * Example: `eventsPollInterval=5;`
   * In the example, AWS DMS checks for changes in the binary logs every five seconds.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-gcpmysqlsettings.html#cfn-dms-endpoint-gcpmysqlsettings-eventspollinterval
   */
  readonly eventsPollInterval?: number;
  /**
   * Specifies the maximum size (in KB) of any .csv file used to transfer data to a MySQL-compatible database.
   * Example: `maxFileSize=512`
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-gcpmysqlsettings.html#cfn-dms-endpoint-gcpmysqlsettings-maxfilesize
   */
  readonly maxFileSize?: number;
  /**
   * Improves performance when loading data into the MySQL-compatible target database.
   * Specifies how many threads to use to load the data into the MySQL-compatible target database. Setting a large number of threads can have an adverse effect on database performance, because a separate connection is required for each thread. The default is one.
   * Example: `parallelLoadThreads=1`
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-gcpmysqlsettings.html#cfn-dms-endpoint-gcpmysqlsettings-parallelloadthreads
   */
  readonly parallelLoadThreads?: number;
  /**
   * The port used by the endpoint database.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-gcpmysqlsettings.html#cfn-dms-endpoint-gcpmysqlsettings-port
   */
  readonly port?: number;
  /**
   * The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in `SecretsManagerSecret.` The role must allow the `iam:PassRole` action. `SecretsManagerSecret` has the value of the AWS Secrets Manager secret that allows access to the MySQL endpoint.
   * > You can specify one of two sets of values for these permissions. You can specify the values for this setting and `SecretsManagerSecretId` . Or you can specify clear-text values for `UserName` , `Password` , `ServerName` , and `Port` . You can't specify both.
   * >
   * > For more information on creating this `SecretsManagerSecret` , the corresponding `SecretsManagerAccessRoleArn` , and the `SecretsManagerSecretId` required to access it, see [Using secrets to access AWS Database Migration Service resources](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Security.html#security-iam-secretsmanager) in the *AWS Database Migration Service User Guide* .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-gcpmysqlsettings.html#cfn-dms-endpoint-gcpmysqlsettings-secretsmanageraccessrolearn
   */
  readonly secretsManagerAccessRoleArn?: string;
  /**
   * The full ARN of the `SecretsManagerSecret` that contains the MySQL endpoint connection details.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-gcpmysqlsettings.html#cfn-dms-endpoint-gcpmysqlsettings-secretsmanagersecretid
   */
  readonly secretsManagerSecretArn: string;
  /**
   * The ID of the KMS key used to encrypt the credentials secret.
   */
  readonly secretsManagerSecretKMSArn?: string;
  /**
   * Endpoint TCP port.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-gcpmysqlsettings.html#cfn-dms-endpoint-gcpmysqlsettings-servername
   */
  readonly serverName?: string;
  /**
   * Specifies the time zone for the source MySQL database. Don't enclose time zones in single quotation marks.
   * Example: `serverTimezone=US/Pacific;`
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-gcpmysqlsettings.html#cfn-dms-endpoint-gcpmysqlsettings-servertimezone
   */
  readonly serverTimezone?: string;
}
/**
 * Provides information that defines a PostgreSQL endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For information about other available settings, see [Extra connection attributes when using PostgreSQL as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html#CHAP_Source.PostgreSQL.ConnectionAttrib) and [Extra connection attributes when using PostgreSQL as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.PostgreSQL.html#CHAP_Target.PostgreSQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-postgresqlsettings.html
 */
export interface PostgreSqlSettingsProperty {
  /** SQL script executed after connecting to PostgreSQL source for change data capture (CDC) */
  readonly afterConnectScript?: string;
  /** Babelfish for Aurora PostgreSQL database name for DMS endpoint configuration enabling SQL */
  readonly babelfishDatabaseName?: string;
  /** Boolean flag to enable DDL event capture for PostgreSQL DMS migration enabling schema */
  readonly captureDdls?: boolean;
  /** Database mode specification for PostgreSQL-compatible endpoints requiring additional */
  readonly databaseMode?: string;
  /**
   * The schema in which the operational DDL database artifacts are created.
   * Example: `ddlArtifactsSchema=xyzddlschema;`
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-postgresqlsettings.html#cfn-dms-endpoint-postgresqlsettings-ddlartifactsschema
   */
  readonly ddlArtifactsSchema?: string;
  /**
   * Sets the client statement timeout for the PostgreSQL instance, in seconds. The default value is 60 seconds.
   * Example: `executeTimeout=100;`
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-postgresqlsettings.html#cfn-dms-endpoint-postgresqlsettings-executetimeout
   */
  readonly executeTimeout?: number;
  /**
   * When set to `true` , this value causes a task to fail if the actual size of a LOB column is greater than the specified `LobMaxSize` .
   * If task is set to Limited LOB mode and this option is set to true, the task fails instead of truncating the LOB data.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-postgresqlsettings.html#cfn-dms-endpoint-postgresqlsettings-failtasksonlobtruncation
   */
  readonly failTasksOnLobTruncation?: boolean;
  /** Boolean flag to enable WAL heartbeat feature for PostgreSQL DMS migration preventing */
  readonly heartbeatEnable?: boolean;
  /** WAL heartbeat frequency in minutes for PostgreSQL DMS migration enabling configurable */
  readonly heartbeatFrequency?: number;
  /**
   * Sets the schema in which the heartbeat artifacts are created.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-postgresqlsettings.html#cfn-dms-endpoint-postgresqlsettings-heartbeatschema
   */
  readonly heartbeatSchema?: string;
  /**
   * When true, lets PostgreSQL migrate the boolean type as boolean.
   * By default, PostgreSQL migrates booleans as `varchar(5)` . You must set this setting on both the source and target endpoints for it to take effect.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-postgresqlsettings.html#cfn-dms-endpoint-postgresqlsettings-mapbooleanasboolean
   */
  readonly mapBooleanAsBoolean?: boolean;
  /**
   * Specifies the maximum size (in KB) of any .csv file used to transfer data to PostgreSQL.
   * Example: `maxFileSize=512`
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-postgresqlsettings.html#cfn-dms-endpoint-postgresqlsettings-maxfilesize
   */
  readonly maxFileSize?: number;
  /**
   * Specifies the plugin to use to create a replication slot.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-postgresqlsettings.html#cfn-dms-endpoint-postgresqlsettings-pluginname
   */
  readonly pluginName?: string;
  /**
   * The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in `SecretsManagerSecret` .
   * The role must allow the `iam:PassRole` action. `SecretsManagerSecret` has the value of the AWS Secrets Manager secret that allows access to the PostgreSQL endpoint.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-postgresqlsettings.html#cfn-dms-endpoint-postgresqlsettings-secretsmanageraccessrolearn
   */
  readonly secretsManagerAccessRoleArn?: string;
  /**
   * The full ARN of the `SecretsManagerSecret` that contains the PostgreSQL endpoint connection details.
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-postgresqlsettings.html#cfn-dms-endpoint-postgresqlsettings-secretsmanagersecretid
   */
  readonly secretsManagerSecretArn: string;
  /**
   * The ID of the KMS key used to encrypt the credentials secret.
   */
  readonly secretsManagerSecretKMSArn?: string;
  /**
   * Sets the name of a previously created logical replication slot for a change data capture (CDC) load of the PostgreSQL source instance.
   * When used with the `CdcStartPosition` request parameter for the AWS DMS API , this attribute also makes it possible to use native CDC start points. DMS verifies that the specified logical replication slot exists before starting the CDC load task. It also verifies that the task was created with a valid setting of `CdcStartPosition` . If the specified slot doesn't exist or the task doesn't have a valid `CdcStartPosition` setting, DMS raises an error.
   * For more information about setting the `CdcStartPosition` request parameter, see [Determining a CDC native start point](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html#CHAP_Task.CDC.StartPoint.Native) in the *AWS Database Migration Service User Guide* . For more information about using `CdcStartPosition` , see [CreateReplicationTask](https://docs.aws.amazon.com/dms/latest/APIReference/API_CreateReplicationTask.html) , [StartReplicationTask](https://docs.aws.amazon.com/dms/latest/APIReference/API_StartReplicationTask.html) , and [ModifyReplicationTask](https://docs.aws.amazon.com/dms/latest/APIReference/API_ModifyReplicationTask.html) .
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-postgresqlsettings.html#cfn-dms-endpoint-postgresqlsettings-slotname
   */
  readonly slotName?: string;
}
export type MdaaEndpointType = 'source' | 'target';
export type MdaaEndpointEngine =
  | `mysql`
  | `oracle`
  | `postgres`
  | `mariadb`
  | `aurora`
  | `aurora-postgresql`
  | `opensearch`
  | `redshift`
  | `redshift-serverless`
  | `s3`
  | `db2`
  | `azuredb`
  | `sybase`
  | `dynamodb`
  | `mongodb`
  | `kinesis`
  | `kafka`
  | `elasticsearch`
  | `docdb`
  | `sqlserver`
  | `neptune`;
export interface MdaaEndpointProps extends MdaaConstructProps {
  readonly certificateArn?: string;
  /** Database name specification for endpoint connectivity controlling target database selection */
  readonly databaseName?: string;
  readonly endpointIdentifier: string;
  /** Endpoint type specification controlling migration direction and data flow for source or target configuration */
  readonly endpointType: MdaaEndpointType;
  /** Database engine specification controlling database type and connectivity protocols for endpoint configuration */
  readonly engineName: MdaaEndpointEngine;
  readonly extraConnectionAttributes?: string;
  readonly kmsKey: IKey;
  /** Database port specification for endpoint connectivity controlling network connection */
  readonly port?: number;
  readonly resourceIdentifier?: string;
  /** Server name specification for database server connectivity enabling network-based database */
  readonly serverName?: string;
  readonly sslMode?: string;
  /** DocumentDB settings for DocumentDB endpoint configuration enabling NoSQL document database */
  readonly docDbSettings?: DocDbSettingsProperty;
  /** DynamoDB settings for DynamoDB endpoint configuration enabling NoSQL key-value database */
  readonly dynamoDbSettings?: DynamoDbSettingsProperty;
  /** Elasticsearch settings for OpenSearch endpoint configuration enabling search engine */
  readonly elasticsearchSettings?: ElasticsearchSettingsProperty;
  /** IBM Db2 settings for Db2 LUW endpoint configuration enabling mainframe database connectivity and optimization */
  readonly ibmDb2Settings?: IbmDb2SettingsProperty;
  /** Kinesis settings for Kinesis Data Streams endpoint configuration enabling real-time */
  readonly kinesisSettings?: KinesisSettingsProperty;
  /** Microsoft SQL Server settings for SQL Server endpoint configuration enabling enterprise */
  readonly microsoftSqlServerSettings?: MicrosoftSqlServerSettingsProperty;
  /** MongoDB settings for MongoDB endpoint configuration enabling NoSQL document database */
  readonly mongoDbSettings?: MongoDbSettingsProperty;
  /** MySQL settings for MySQL endpoint configuration enabling relational database connectivity and optimization */
  readonly mySqlSettings?: MySqlSettingsProperty;
  /** Neptune settings for Neptune endpoint configuration enabling graph database connectivity and optimization */
  readonly neptuneSettings?: NeptuneSettingsProperty;
  /** Oracle settings for Oracle endpoint configuration enabling enterprise database connectivity and optimization */
  readonly oracleSettings?: OracleSettingsProperty;
  /** PostgreSQL settings for PostgreSQL endpoint configuration enabling open-source relational */
  readonly postgreSqlSettings?: PostgreSqlSettingsProperty;
  /** Redshift settings for Redshift endpoint configuration enabling data warehouse connectivity and optimization */
  readonly redshiftSettings?: RedshiftSettingsProperty;
  /** S3 settings for S3 endpoint configuration enabling object storage connectivity and file-based data transfer */
  readonly s3Settings?: S3SettingsProperty;
  /** Sybase settings for SAP ASE endpoint configuration enabling enterprise database connectivity and optimization */
  readonly sybaseSettings?: SybaseSettingsProperty;
}

/**
 * Reusable CDK construct for a compliant DMS Endpoint.
 * Specifically, enforces KMS Encryption, and prevents use of plaintext credentials.
 */
export class MdaaEndpoint extends CfnEndpoint {
  /** Overrides specific compliance-related properties. */
  private static setProps(props: MdaaEndpointProps): CfnEndpointProps {
    return {
      ...props,
      endpointIdentifier: props.naming.resourceName(props.endpointIdentifier),
      kmsKeyId: props.kmsKey.keyId,
      s3Settings: props.engineName == 's3' ? this.setS3Settings(props.s3Settings) : undefined,
      redshiftSettings: props.engineName == 'redshift' ? this.setRedshiftSettings(props.redshiftSettings) : undefined,
      neptuneSettings: props.engineName == 'neptune' ? this.setNeptuneSettings(props.neptuneSettings) : undefined,
    };
  }

  private static setNeptuneSettings(neptuneSettings?: NeptuneSettingsProperty): CfnEndpoint.NeptuneSettingsProperty {
    return {
      ...neptuneSettings,
      iamAuthEnabled: true,
    };
  }

  private static setS3Settings(s3Settings?: S3SettingsProperty): CfnEndpoint.S3SettingsProperty {
    return {
      ...s3Settings,
      encryptionMode: 'SSE_KMS',
    };
  }

  private static setRedshiftSettings(
    redshiftSettings?: RedshiftSettingsProperty,
  ): CfnEndpoint.RedshiftSettingsProperty {
    return {
      ...redshiftSettings,
      encryptionMode: 'SSE_KMS',
    };
  }

  constructor(scope: Construct, id: string, props: MdaaEndpointProps) {
    super(scope, id, MdaaEndpoint.setProps(props));

    new MdaaParamAndOutput(this, {
      ...{
        resourceType: 'endpoint',
        resourceId: props.endpointIdentifier,
        name: 'arn',
        value: this.ref,
      },
      ...props,
    });
  }
}

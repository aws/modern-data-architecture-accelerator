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
/**
 * Q-ENHANCED-INTERFACE
 * Sybase database settings configuration interface for DMS endpoint with secure credential management and IAM role-based access. Defines Sybase-specific properties for Database Migration Service including Secrets Manager integration for secure credential storage and IAM role configuration for accessing SAP ASE endpoints.
 *
 * Use cases: Sybase database migration; SAP ASE connectivity; Secure credential management; Enterprise database integration
 *
 * AWS: AWS DMS Sybase endpoint configuration with Secrets Manager integration and IAM role-based security
 *
 * Validation: Must include valid Secrets Manager secret ARN; IAM role must have appropriate DMS and Secrets Manager permissions
 */
export interface SybaseSettingsProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role ARN for DMS to access Secrets Manager secret containing Sybase endpoint credentials enabling secure credential management. Defines the IAM role that DMS assumes to retrieve database credentials from Secrets Manager for SAP ASE endpoint connectivity with role-based security.
   *
   * Use cases: Secure credential access; IAM role-based security; Secrets Manager integration; DMS authentication
   *
   * AWS: DMS Sybase endpoint secretsManagerAccessRoleArn setting for IAM role-based credential access
   *
   * Validation: Must be valid IAM role ARN if provided; role must have iam:PassRole and Secrets Manager access permissions
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-sybasesettings.html#cfn-dms-endpoint-sybasesettings-secretsmanageraccessrolearn
   */
  readonly secretsManagerAccessRoleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Secrets Manager secret ARN containing Sybase endpoint connection details enabling secure credential storage for SAP ASE database connectivity. Defines the AWS Secrets Manager secret that stores database connection credentials including username, password, and connection parameters for Sybase endpoint access.
   *
   * Use cases: Secure credential storage; SAP ASE connectivity; Database authentication; Secrets management
   *
   * AWS: DMS Sybase endpoint secretsManagerSecretId setting for Secrets Manager secret reference
   *
   * Validation: Must be valid Secrets Manager secret ARN; secret must contain valid Sybase connection credentials
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-sybasesettings.html#cfn-dms-endpoint-sybasesettings-secretsmanagersecretid
   */
  readonly secretsManagerSecretArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for encrypting Secrets Manager secret containing Sybase credentials enabling enhanced security for database connection details. Defines the KMS key used to encrypt the Secrets Manager secret that stores Sybase endpoint credentials for additional security layer.
   *
   * Use cases: Credential encryption; Enhanced security; KMS integration; Secrets Manager encryption
   *
   * AWS: DMS Sybase endpoint secretsManagerSecretKMSArn setting for KMS encryption of credentials
   *
   * Validation: Must be valid KMS key ARN if provided; enables encryption of Secrets Manager secret containing credentials
   */
  readonly secretsManagerSecretKMSArn?: string;
}
/**
 * Provides information that defines an Oracle endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For information about other available settings, see [Extra connection attributes when using Oracle as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html#CHAP_Source.Oracle.ConnectionAttrib) and [Extra connection attributes when using Oracle as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Oracle.html#CHAP_Target.Oracle.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-oraclesettings.html
 */
/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for AWS DMS Oracle database endpoint settings providing replication and change data capture options. Provides Oracle-specific configuration properties for DMS endpoints including supplemental logging, archived log management, and advanced Oracle database features for secure and efficient data migration and replication.
 *
 * Use cases: Oracle database migration; Change data capture; Database replication; Oracle-specific configuration; Advanced Oracle features
 *
 * AWS: AWS Database Migration Service Oracle endpoint configuration with Oracle-specific settings and optimization parameters
 *
 * Validation: Boolean properties must be true/false; numeric properties must be valid integers; string properties must follow Oracle naming conventions
 */
export interface OracleSettingsProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to disable Binary Reader access to redo logs through direct file access for Oracle RDS sources. Controls whether DMS accesses redo logs directly or through specified path prefix replacement, affecting change data capture performance and configuration for Oracle database replication.
   *
   * Use cases: RDS Oracle configuration; Change data capture optimization; Direct file access control; Performance tuning; Oracle replication setup
   *
   * AWS: AWS DMS Oracle endpoint accessAlternateDirectly setting for redo log access configuration
   *
   * Validation: Must be boolean value if provided; affects Oracle change data capture behavior and performance
   **/
  readonly accessAlternateDirectly?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional additional archived log destination ID for Oracle primary/standby switchover scenarios. Specifies the destination for archive redo logs in switchover situations where the previous primary instance becomes standby, enabling continuous replication during Oracle database role changes.
   *
   * Use cases: Oracle switchover; High availability; Standby database configuration; Archive log management; Disaster recovery
   *
   * AWS: AWS DMS Oracle endpoint additionalArchivedLogDestId for switchover archive log destination
   *
   * Validation: Must be valid integer destination ID if provided; used for Oracle switchover scenarios and archive log management
   **/
  readonly additionalArchivedLogDestId?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable table-level supplemental logging for Oracle database migration tasks. Enables PRIMARY KEY supplemental logging on all selected tables for migration, providing necessary change data capture information while requiring database-level supplemental logging to be enabled separately.
   *
   * Use cases: Supplemental logging; Change data capture; Table-level logging; Oracle migration; Primary key tracking
   *
   * AWS: AWS DMS Oracle endpoint addSupplementalLogging for table-level supplemental logging configuration
   *
   * Validation: Must be boolean value if provided; requires database-level supplemental logging to be enabled for proper operation
   **/
  readonly addSupplementalLogging?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable replication of Oracle tables with nested tables or defined types for complex data structure migration. Allows DMS to replicate Oracle tables containing columns with nested tables or user-defined types, enabling migration of complex Oracle database schemas with advanced data structures.
   *
   * Use cases: Complex schema migration; Nested table replication; User-defined types; Advanced Oracle features; Complex data structures
   *
   * AWS: AWS DMS Oracle endpoint allowSelectNestedTables for complex data type replication support
   *
   * Validation: Must be boolean value if provided; enables replication of Oracle nested tables and defined types
   **/
  readonly allowSelectNestedTables?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional archived redo log destination ID for Oracle change data capture configuration. Specifies the destination ID for archived redo logs matching the dest_id column in v$archived_log view, optimizing performance by ensuring correct log access from the start of replication operations.
   *
   * Use cases: Archived log configuration; Performance optimization; Change data capture; Log destination management; Oracle replication tuning
   *
   * AWS: AWS DMS Oracle endpoint archivedLogDestId for archived redo log destination specification
   *
   * Validation: Must be valid integer matching Oracle v$archived_log dest_id; improves performance through correct log access
   **/
  readonly archivedLogDestId?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to restrict DMS access to archived redo logs only for Oracle replication. When enabled, DMS accesses only archived redo logs, requiring ASM privileges if logs are stored on Automatic Storage Management, providing controlled access to Oracle change data.
   *
   * Use cases: Archived log only access; ASM storage; Controlled log access; Oracle security; Change data capture restriction
   *
   * AWS: AWS DMS Oracle endpoint archivedLogsOnly for restricted archived log access configuration
   *
   * Validation: Must be boolean value if provided; requires ASM privileges when archived logs are on ASM storage
   **/
  readonly archivedLogsOnly?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional ASM server address for Oracle source endpoint Binary Reader configuration. Specifies the Automatic Storage Management server address for Oracle databases using ASM, enabling DMS Binary Reader access to Oracle databases with ASM storage for change data capture operations.
   *
   * Use cases: ASM configuration; Binary Reader setup; Oracle ASM access; Storage management; Change data capture with ASM
   *
   * AWS: AWS DMS Oracle endpoint asmServer for ASM server address configuration with Binary Reader
   *
   * Validation: Must be valid ASM server address if provided; required for Oracle databases using ASM storage with Binary Reader
   **/
  readonly asmServer?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional character length semantics specification for Oracle character column interpretation. Determines whether character column lengths are measured in bytes or characters, affecting data type mapping and character handling during Oracle database migration and replication operations.
   *
   * Use cases: Character encoding; Data type mapping; Character column handling; Oracle character semantics; Migration accuracy
   *
   * AWS: AWS DMS Oracle endpoint charLengthSemantics for character column length interpretation
   *
   * Validation: Must be 'CHAR' for character-based or default for byte-based; affects character column length calculation
   **/
  readonly charLengthSemantics?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable direct path loading without database logging for Oracle target performance optimization. Increases commit rate on Oracle target databases by writing directly to tables without creating database log trails, improving performance for bulk data loading operations.
   *
   * Use cases: Performance optimization; Bulk loading; Direct path loading; Oracle target optimization; High-speed migration
   *
   * AWS: AWS DMS Oracle endpoint directPathNoLog for direct path loading without logging
   *
   * Validation: Must be boolean value if provided; improves performance but bypasses Oracle database logging mechanisms
   **/
  readonly directPathNoLog?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable parallel loading when direct path full load is active for Oracle target performance optimization. Enables parallel load operations when useDirectPathFullLoad is set, requiring target tables without constraints or indexes for maximum performance during bulk data migration.
   *
   * Use cases: Parallel loading; Performance optimization; Bulk migration; Direct path loading; High-speed data transfer
   *
   * AWS: AWS DMS Oracle endpoint directPathParallelLoad for parallel loading with direct path full load
   *
   * Validation: Must be boolean value if provided; requires useDirectPathFullLoad enabled and target tables without constraints/indexes
   **/
  readonly directPathParallelLoad?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable homogeneous tablespace replication for Oracle target database consistency. Creates existing tables and indexes under the same tablespace on the target database, maintaining Oracle tablespace organization and storage structure during migration operations.
   *
   * Use cases: Tablespace consistency; Oracle structure preservation; Storage organization; Database layout maintenance; Migration fidelity
   *
   * AWS: AWS DMS Oracle endpoint enableHomogenousTablespace for tablespace replication and consistency
   *
   * Validation: Must be boolean value if provided; maintains Oracle tablespace structure and organization on target database
   **/
  readonly enableHomogenousTablespace?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of additional archived log destination IDs for Oracle Data Guard switchover scenarios. Specifies multiple destinations for archived redo logs in primary-to-multiple-standby setups, enabling DMS to access correct archive logs during Oracle Data Guard switchover operations.
   *
   * Use cases: Data Guard switchover; Multiple standby configuration; Archive log management; High availability; Disaster recovery
   *
   * AWS: AWS DMS Oracle endpoint extraArchivedLogDestIds for multiple archived log destination configuration
   *
   * Validation: Must be array of valid integer destination IDs if provided; used with archivedLogDestId for switchover scenarios
   *   **/
  readonly extraArchivedLogDestIds?: Array<number>;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to cause task failure when LOB column size exceeds specified LobMaxSize limit. Forces task failure instead of LOB data truncation when actual LOB size is greater than LobMaxSize in limited LOB mode, ensuring data integrity and preventing silent data loss.
   *
   * Use cases: Data integrity; LOB handling; Error handling; Data validation; Migration quality control
   *
   * AWS: AWS DMS Oracle endpoint failTasksOnLobTruncation for LOB size validation and error handling
   *
   * Validation: Must be boolean value if provided; causes task failure instead of LOB truncation when size limits exceeded
   **/
  readonly failTasksOnLobTruncation?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number data type scale specification for Oracle NUMBER data type conversion precision. Defines the scale for NUMBER data type conversion up to 38 or FLOAT, controlling precision and scale during Oracle numeric data migration with default precision 38, scale 10.
   *
   * Use cases: Numeric precision; Data type conversion; Oracle NUMBER handling; Precision control; Migration accuracy
   *
   * AWS: AWS DMS Oracle endpoint numberDatatypeScale for NUMBER data type conversion precision
   *
   * Validation: Must be integer between 0-38 or FLOAT if provided; controls Oracle NUMBER data type conversion precision and scale
   **/
  readonly numberDatatypeScale?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Oracle path prefix for Binary Reader redo log access configuration. Specifies the default Oracle root path for accessing redo logs when using Binary Reader for change data capture from Amazon RDS for Oracle sources, enabling proper redo log access and change data capture operations.
   *
   * Use cases: Binary Reader configuration; Redo log access; RDS Oracle sources; Change data capture; Path configuration
   *
   * AWS: AWS DMS Oracle endpoint oraclePathPrefix for Binary Reader redo log access path specification
   *
   * Validation: Must be valid Oracle path string if provided; required for Binary Reader access to RDS Oracle redo logs
   **/
  readonly oraclePathPrefix?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of parallel ASM read threads for Oracle change data capture performance optimization. Configures the number of threads (2-8) for CDC load operations using Oracle Automatic Storage Management, working with readAheadBlocks for optimized ASM performance during change data capture.
   *
   * Use cases: ASM performance; CDC optimization; Thread configuration; Parallel processing; Oracle ASM tuning
   *
   * AWS: AWS DMS Oracle endpoint parallelAsmReadThreads for ASM CDC performance optimization
   *
   * Validation: Must be integer between 2-8 if provided; used with readAheadBlocks for ASM performance tuning
   **/
  readonly parallelAsmReadThreads?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of read-ahead blocks for Oracle ASM change data capture performance optimization. Configures read-ahead blocks (1000-200000) for CDC load operations using Oracle Automatic Storage Management, working with parallelAsmReadThreads for optimized ASM performance during change data capture.
   *
   * Use cases: ASM performance; CDC optimization; Block configuration; Read-ahead tuning; Oracle ASM optimization
   *
   * AWS: AWS DMS Oracle endpoint readAheadBlocks for ASM CDC read-ahead performance optimization
   *
   * Validation: Must be integer between 1000-200000 if provided; used with parallelAsmReadThreads for ASM performance tuning
   **/
  readonly readAheadBlocks?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable tablespace name reading for Oracle tablespace replication support. Enables DMS to read and replicate tablespace information during Oracle database migration, supporting tablespace-aware migration and maintaining Oracle storage organization on target databases.
   *
   * Use cases: Tablespace replication; Storage organization; Oracle structure preservation; Tablespace awareness; Migration fidelity
   *
   * AWS: AWS DMS Oracle endpoint readTableSpaceName for tablespace replication and organization support
   *
   * Validation: Must be boolean value if provided; enables tablespace name reading and replication during Oracle migration
   **/
  readonly readTableSpaceName?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable path prefix replacement for Binary Reader redo log access. Instructs DMS to replace the default Oracle root with usePathPrefix setting for redo log access when using Binary Reader for change data capture from Amazon RDS for Oracle sources.
   *
   * Use cases: Path replacement; Binary Reader configuration; RDS Oracle access; Redo log path management; Change data capture setup
   *
   * AWS: AWS DMS Oracle endpoint replacePathPrefix for Binary Reader path replacement configuration
   *
   * Validation: Must be boolean value if provided; enables path prefix replacement for Binary Reader redo log access
   **/
  readonly replacePathPrefix?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional retry interval in seconds for Oracle connection query retry operations. Specifies the wait time before resending queries to Oracle database, providing resilience and error recovery for Oracle database connectivity issues during migration and replication operations.
   *
   * Use cases: Connection resilience; Error recovery; Query retry; Oracle connectivity; Network reliability
   *
   * AWS: AWS DMS Oracle endpoint retryInterval for query retry timing and connection resilience
   *
   * Validation: Must be positive integer in seconds if provided; controls query retry timing for Oracle connection resilience
   **/
  readonly retryInterval?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role ARN for AWS Secrets Manager access to Oracle endpoint credentials. Specifies the IAM role with required permissions to access SecretsManagerSecret containing Oracle endpoint credentials, enabling secure credential management and access control for Oracle database connections.
   *
   * Use cases: Credential management; Secrets Manager integration; Secure access; IAM role configuration; Oracle authentication
   *
   * AWS: AWS IAM role ARN for Secrets Manager access to Oracle endpoint credentials and authentication
   *
   * Validation: Must be valid IAM role ARN if provided; requires iam:PassRole action and Secrets Manager access permissions
   **/
  readonly secretsManagerAccessRoleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role ARN for AWS Secrets Manager access to Oracle ASM credentials when using Advanced Storage Manager. Specifies the IAM role with required permissions to access SecretsManagerOracleAsmSecret containing Oracle ASM connection details, enabling secure ASM credential management for Oracle endpoints with ASM storage.
   *
   * Use cases: ASM credential management; Secrets Manager integration; Oracle ASM access; Secure ASM authentication; Advanced storage configuration
   *
   * AWS: AWS IAM role ARN for Secrets Manager access to Oracle ASM credentials and authentication
   *
   * Validation: Must be valid IAM role ARN if provided; required for Oracle endpoints using ASM; mutually exclusive with clear-text ASM credentials
   **/
  readonly secretsManagerOracleAsmAccessRoleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Secrets Manager secret ARN containing Oracle ASM connection details for Advanced Storage Manager endpoints. Specifies the full ARN of the secret containing Oracle ASM connection information, enabling secure storage and access of ASM credentials for Oracle endpoints using Advanced Storage Manager.
   *
   * Use cases: ASM secret storage; Secure ASM credentials; Oracle ASM configuration; Advanced storage authentication; Secret management
   *
   * AWS: AWS Secrets Manager secret ARN containing Oracle ASM connection details and credentials
   *
   * Validation: Must be valid Secrets Manager secret ARN if provided; required for Oracle endpoints using ASM with Secrets Manager
   **/
  readonly secretsManagerOracleAsmSecretArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Secrets Manager secret ARN containing Oracle endpoint connection details for secure credential management. Specifies the full ARN of the secret containing Oracle database connection information including credentials, enabling secure storage and access of Oracle endpoint authentication details.
   *
   * Use cases: Secure credential storage; Oracle authentication; Secrets Manager integration; Database connection security; Credential management
   *
   * AWS: AWS Secrets Manager secret ARN containing Oracle endpoint connection details and credentials
   *
   * Validation: Must be valid Secrets Manager secret ARN; required for secure Oracle endpoint credential management and authentication
   **/
  readonly secretsManagerSecretArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for encrypting Oracle endpoint credentials secret in Secrets Manager. Specifies the KMS key used to encrypt the credentials secret, providing additional encryption layer for Oracle endpoint authentication information stored in AWS Secrets Manager.
   *
   * Use cases: Credential encryption; KMS integration; Enhanced security; Secret encryption; Oracle credential protection
   *
   * AWS: AWS KMS key ARN for encrypting Secrets Manager secret containing Oracle endpoint credentials
   *
   * Validation: Must be valid KMS key ARN if provided; provides additional encryption for Oracle credentials in Secrets Manager
   **/
  readonly secretsManagerSecretKMSArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom function name for converting Oracle SDO_GEOMETRY to GEOJSON format during spatial data migration. Specifies a custom function to handle spatial data conversion, defaulting to SDO2GEOJSON function if available, enabling proper handling of Oracle spatial data types during migration operations.
   *
   * Use cases: Spatial data conversion; GEOJSON transformation; Oracle spatial types; Custom function usage; Spatial data migration
   *
   * AWS: AWS DMS Oracle endpoint spatial data conversion function for SDO_GEOMETRY to GEOJSON transformation
   *
   * Validation: Must be valid Oracle function name if provided; function must be accessible and mimic SDO2GEOJSON operation
   **/
  readonly spatialDataOptionToGeoJsonFunctionName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional standby delay time in minutes for Oracle Active Data Guard standby database synchronization. Specifies the time lag between primary and standby databases when using Oracle Active Data Guard standby as CDC source, enabling replication from standby instances without impacting production databases.
   *
   * Use cases: Active Data Guard; Standby replication; Production isolation; CDC from standby; Database synchronization delay
   *
   * AWS: AWS DMS Oracle endpoint standby delay configuration for Active Data Guard standby database replication
   *
   * Validation: Must be positive integer in minutes if provided; controls synchronization delay for Active Data Guard standby sources
   **/
  readonly standbyDelayTime?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable alternate folder usage for online redo logs with Binary Reader for Oracle RDS sources. Instructs DMS Binary Reader to use specified prefix replacement for accessing online redo logs, enabling proper change data capture from Amazon RDS for Oracle databases with custom redo log configurations.
   *
   * Use cases: Binary Reader configuration; Online redo log access; RDS Oracle sources; Prefix replacement; Change data capture optimization
   *
   * AWS: AWS DMS Oracle endpoint useAlternateFolderForOnline for Binary Reader online redo log access configuration
   *
   * Validation: Must be boolean value if provided; enables alternate folder usage for Binary Reader online redo log access
   **/
  readonly useAlternateFolderForOnline?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable Binary Reader utility for Oracle change data capture operations. Enables Binary Reader for change data capture requiring UseLogminerReader to be disabled, providing alternative method for accessing Oracle redo logs with additional configuration for RDS Oracle sources and ASM environments.
   *
   * Use cases: Binary Reader CDC; Alternative log access; Oracle ASM support; RDS Oracle configuration; Change data capture method selection
   *
   * AWS: AWS DMS Oracle endpoint useBFile for Binary Reader utility change data capture configuration
   *
   * Validation: Must be boolean value if provided; requires UseLogminerReader set to false; additional attributes needed for RDS Oracle
   **/
  readonly useBFile?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable direct path full load for Oracle target database performance optimization. Uses Oracle Call Interface (OCI) direct path protocol for bulk-loading Oracle target tables during full load operations, providing improved performance for large data migration scenarios.
   *
   * Use cases: Performance optimization; Bulk loading; Full load acceleration; Oracle target optimization; Large data migration
   *
   * AWS: AWS DMS Oracle endpoint useDirectPathFullLoad for direct path protocol bulk loading optimization
   *
   * Validation: Must be boolean value if provided; enables OCI direct path protocol for bulk-loading Oracle target tables
   **/
  readonly useDirectPathFullLoad?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable Oracle LogMiner utility for change data capture operations (default method). Controls whether to use LogMiner (default) or Binary Reader for accessing redo logs, with LogMiner being the standard method and Binary Reader requiring additional configuration for binary file access.
   *
   * Use cases: LogMiner CDC; Standard log access; Change data capture method; Oracle replication; Log access method selection
   *
   * AWS: AWS DMS Oracle endpoint useLogminerReader for LogMiner utility change data capture configuration
   *
   * Validation: Must be boolean value if provided; default true for LogMiner; set false to enable Binary Reader with useBFile
   **/
  readonly useLogminerReader?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional path prefix for Binary Reader redo log access replacement in Oracle RDS sources. Specifies the path prefix to replace the default Oracle root for accessing redo logs when using Binary Reader for change data capture from Amazon RDS for Oracle databases.
   *
   * Use cases: Binary Reader configuration; Path replacement; RDS Oracle access; Redo log path management; Custom path configuration
   *
   * AWS: AWS DMS Oracle endpoint usePathPrefix for Binary Reader path prefix replacement configuration
   *
   * Validation: Must be valid path prefix string if provided; used with Binary Reader for RDS Oracle redo log access replacement
   **/
  readonly usePathPrefix?: string;
}

/**
 * Provides information that defines a MySQL endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For information about other available settings, see [Extra connection attributes when using MySQL as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html#CHAP_Source.MySQL.ConnectionAttrib) and [Extra connection attributes when using a MySQL-compatible database as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.MySQL.html#CHAP_Target.MySQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-mysqlsettings.html
 */
/**
 * Q-ENHANCED-INTERFACE
 * MySQL database settings configuration interface for DMS providing database migration and MySQL-specific capabilities. Defines MySQL-specific properties for Database Migration Service including connection settings, replication configuration, and MySQL migration parameters for MySQL database migration workflows.
 *
 * Use cases: MySQL database migration; Database replication; Connection configuration; MySQL migration workflows; Database connectivity; DMS integration
 *
 * AWS: AWS DMS MySQL endpoint configuration with MySQL-specific migration settings and replication management
 *
 * Validation: Configuration must be valid for DMS migration; properties must conform to AWS DMS and database-specific requirements
 */
export interface MySqlSettingsProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional SQL script to execute immediately after DMS connects to the MySQL endpoint for initialization tasks. Provides custom initialization logic that runs after connection establishment, with migration task continuing regardless of script success or failure, enabling database-specific setup and configuration.
   *
   * Use cases: Database initialization; Connection setup; Custom configuration; Post-connection tasks; Database preparation
   *
   * AWS: AWS DMS MySQL endpoint afterConnectScript for post-connection initialization and setup
   *
   * Validation: Must be valid SQL script code if provided; script content not filename; migration continues regardless of execution result
   **/
  readonly afterConnectScript?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to clean and recreate table metadata on replication instance when mismatches occur. Handles situations where DDL operations cause cached table metadata differences on the replication instance, ensuring metadata consistency during MySQL database migration and replication operations.
   *
   * Use cases: Metadata consistency; DDL handling; Cache management; Replication reliability; Table structure synchronization
   *
   * AWS: AWS DMS MySQL endpoint cleanSourceMetadataOnMismatch for metadata consistency and cache management
   *
   * Validation: Must be boolean value if provided; enables automatic metadata cleanup and recreation on mismatch detection
   **/
  readonly cleanSourceMetadataOnMismatch?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional polling interval in seconds for checking MySQL binary log changes when database is idle. Specifies how frequently DMS checks binary logs for new changes during idle periods, with default of 5 seconds, affecting change detection latency and system resource usage during MySQL replication.
   *
   * Use cases: Change detection; Polling frequency; Performance tuning; Idle monitoring; Binary log processing
   *
   * AWS: AWS DMS MySQL endpoint eventsPollInterval for binary log change detection frequency
   *
   * Validation: Must be positive integer in seconds if provided; default 5 seconds; affects change detection latency and resource usage
   **/
  readonly eventsPollInterval?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum CSV file size in KB for MySQL data transfer operations. Specifies the maximum size limit for CSV files used in data transfer to MySQL-compatible databases, controlling file size for bulk data operations and affecting transfer performance and memory usage.
   *
   * Use cases: File size control; Bulk data transfer; Performance optimization; Memory management; CSV processing
   *
   * AWS: AWS DMS MySQL endpoint maxFileSize for CSV file size limits in data transfer operations
   *
   * Validation: Must be positive integer in KB if provided; controls CSV file size for MySQL data transfer operations
   **/
  readonly maxFileSize?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of parallel threads for loading data into MySQL-compatible target databases for performance optimization. Specifies thread count for parallel data loading with each thread requiring separate connection, affecting performance and database load with default of 1 thread for MySQL target operations.
   *
   * Use cases: Performance optimization; Parallel loading; Thread configuration; MySQL target optimization; Load balancing
   *
   * AWS: AWS DMS MySQL endpoint parallelLoadThreads for parallel data loading performance optimization
   *
   * Validation: Must be positive integer if provided; default 1; higher values may impact database performance due to connection overhead
   **/
  readonly parallelLoadThreads?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role ARN for AWS Secrets Manager access to MySQL endpoint credentials. Specifies the IAM role with required permissions to access SecretsManagerSecret containing MySQL endpoint credentials, enabling secure credential management and access control for MySQL database connections.
   *
   * Use cases: Credential management; Secrets Manager integration; Secure access; IAM role configuration; MySQL authentication
   *
   * AWS: AWS IAM role ARN for Secrets Manager access to MySQL endpoint credentials and authentication
   *
   * Validation: Must be valid IAM role ARN if provided; requires iam:PassRole action and Secrets Manager access permissions
   **/
  readonly secretsManagerAccessRoleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Secrets Manager secret ARN containing MySQL endpoint connection details for secure credential management. Specifies the full ARN of the secret containing MySQL database connection information including credentials, enabling secure storage and access of MySQL endpoint authentication details.
   *
   * Use cases: Secure credential storage; MySQL authentication; Secrets Manager integration; Database connection security; Credential management
   *
   * AWS: AWS Secrets Manager secret ARN containing MySQL endpoint connection details and credentials
   *
   * Validation: Must be valid Secrets Manager secret ARN; required for secure MySQL endpoint credential management and authentication
   **/
  readonly secretsManagerSecretArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for encrypting MySQL endpoint credentials secret in Secrets Manager. Specifies the KMS key used to encrypt the credentials secret, providing additional encryption layer for MySQL endpoint authentication information stored in AWS Secrets Manager.
   *
   * Use cases: Credential encryption; KMS integration; Enhanced security; Secret encryption; MySQL credential protection
   *
   * AWS: AWS KMS key ARN for encrypting Secrets Manager secret containing MySQL endpoint credentials
   *
   * Validation: Must be valid KMS key ARN if provided; provides additional encryption for MySQL credentials in Secrets Manager
   **/
  readonly secretsManagerSecretKMSArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional time zone specification for MySQL source database configuration. Specifies the time zone for the source MySQL database affecting timestamp handling and data conversion during migration, ensuring proper time zone handling and data consistency across different time zones.
   *
   * Use cases: Time zone configuration; Timestamp handling; Data consistency; MySQL configuration; Time zone conversion
   *
   * AWS: AWS DMS MySQL endpoint serverTimezone for source database time zone configuration
   *
   * Validation: Must be valid time zone string if provided; do not enclose in single quotes; affects timestamp data handling
   **/
  readonly serverTimezone?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional target database type specification for MySQL migration destination configuration. Specifies whether to migrate source tables to a single database or multiple databases on the target, with SPECIFIC_DATABASE requiring DatabaseName parameter and MULTIPLE_DATABASES preserving source database structure.
   *
   * Use cases: Database structure preservation; Migration strategy; Target configuration; Database organization; Schema mapping
   *
   * AWS: AWS DMS MySQL endpoint targetDbType for target database structure and migration destination configuration
   *
   * Validation: Must be valid target type if provided; SPECIFIC_DATABASE requires DatabaseName parameter; MULTIPLE_DATABASES preserves structure
   **/
  readonly targetDbType?: string;
}
/**
 * Provides information that defines an Amazon S3 endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For more information about the available settings, see [Extra connection attributes when using Amazon S3 as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.S3.html#CHAP_Source.S3.Configuring) and [Extra connection attributes when using Amazon S3 as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.Configuring) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-s3settings.html
 */
/**
 * Q-ENHANCED-INTERFACE
 * S3 settings configuration interface for DMS providing data lake integration and file-based migration capabilities. Defines S3-specific properties for Database Migration Service including data format configuration, compression settings, and S3 integration for database-to-data lake migration workflows.
 *
 * Use cases: Database to data lake migration; S3 data integration; Data format configuration; File-based migration; Data lake workflows; DMS S3 integration
 *
 * AWS: AWS DMS S3 endpoint configuration with data lake integration and file format management
 *
 * Validation: Configuration must be valid for DMS migration; properties must conform to AWS DMS and database-specific requirements
 */
export interface S3SettingsProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to add column name information to CSV output files for S3 data lake integration. Enables column headers in CSV files when migrating data to S3, improving data usability and self-documentation for data lake consumers with default false value and support for boolean or y/n values.
   *
   * Use cases: CSV headers; Data documentation; Data lake usability; Self-describing data; CSV format enhancement
   *
   * AWS: AWS DMS S3 endpoint addColumnName for CSV column header inclusion in data lake files
   *
   * Validation: Must be boolean, 'y', or 'n' if provided; default false; improves CSV data usability in S3 data lake
   **/
  readonly addColumnName?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 bucket folder name for organizing migrated data with hierarchical structure. Specifies a folder prefix for table organization in S3 bucket, creating path structure as bucketFolder/schema_name/table_name/ instead of default schema_name/table_name/ for better data organization.
   *
   * Use cases: Data organization; Folder structure; S3 hierarchy; Data lake organization; Path management
   *
   * AWS: AWS DMS S3 endpoint bucketFolder for hierarchical data organization in S3 bucket structure
   *
   * Validation: Must be valid S3 folder name if provided; creates bucketFolder/schema_name/table_name/ path structure
   **/
  readonly bucketFolder?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 bucket name for DMS data migration destination in data lake architecture. Specifies the target S3 bucket where migrated database data will be stored, serving as the primary destination for database-to-data lake migration workflows and data storage.
   *
   * Use cases: Data lake destination; S3 storage; Migration target; Data repository; Database migration endpoint
   *
   * AWS: AWS S3 bucket name for DMS data migration destination and data lake storage
   *
   * Validation: Must be valid S3 bucket name; required for S3 endpoint configuration and data migration destination
   **/
  readonly bucketName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional predefined access control list (ACL) for S3 objects created during data migration. Specifies canned ACL for CSV and Parquet files created in S3 bucket, controlling object-level permissions with options including NONE, PRIVATE, PUBLIC_READ, and BUCKET_OWNER_FULL_CONTROL for security management.
   *
   * Use cases: Access control; S3 permissions; Object security; Data lake security; File permissions
   *
   * AWS: AWS S3 canned ACL for objects created by DMS during data migration to S3 bucket
   *
   * Validation: Must be valid S3 canned ACL if provided; default NONE; controls object-level permissions in S3 bucket
   **/
  readonly cannedAclForObjects?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable CDC INSERT and UPDATE operations capture to S3 files for change tracking. Enables writing INSERT and UPDATE operations to CSV or Parquet files during change data capture, with operation indication controlled by IncludeOpForFullLoad parameter, mutually exclusive with CdcInsertsOnly.
   *
   * Use cases: Change data capture; INSERT/UPDATE tracking; Data lake CDC; Operation logging; change tracking
   *
   * AWS: AWS DMS S3 endpoint cdcInsertsAndUpdates for CDC INSERT and UPDATE operations capture
   *
   * Validation: Must be boolean or 'y' if provided; mutually exclusive with CdcInsertsOnly; requires DMS version 3.3.1+
   **/
  readonly cdcInsertsAndUpdates?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable CDC INSERT-only operations capture to S3 files for insert-focused change tracking. Enables writing only INSERT operations to CSV or Parquet files during change data capture, with operation indication controlled by IncludeOpForFullLoad parameter, mutually exclusive with CdcInsertsAndUpdates.
   *
   * Use cases: Insert-only CDC; Append-only data lakes; INSERT tracking; Simplified change capture; Insert-focused replication
   *
   * AWS: AWS DMS S3 endpoint cdcInsertsOnly for CDC INSERT-only operations capture
   *
   * Validation: Must be boolean or 'y' if provided; mutually exclusive with CdcInsertsAndUpdates; requires DMS version 3.1.4+
   **/
  readonly cdcInsertsOnly?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum batch interval in seconds for CDC file output to S3 for time-based file creation. Specifies the maximum time interval before triggering file output to S3, working with CdcMinFileSize where first condition met triggers write, with default 60 seconds for CDC file management.
   *
   * Use cases: File timing control; CDC batching; Time-based triggers; File output scheduling; Batch interval management
   *
   * AWS: AWS DMS S3 endpoint cdcMaxBatchInterval for time-based CDC file output triggering
   *
   * Validation: Must be positive integer in seconds if provided; default 60; works with CdcMinFileSize for file output triggering
   **/
  readonly cdcMaxBatchInterval?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional minimum file size in kilobytes for CDC file output to S3 for size-based file creation. Specifies the minimum file size before triggering file output to S3, working with CdcMaxBatchInterval where first condition met triggers write, with default 32 MB for CDC file management.
   *
   * Use cases: File size control; CDC batching; Size-based triggers; File output optimization; Batch size management
   *
   * AWS: AWS DMS S3 endpoint cdcMinFileSize for size-based CDC file output triggering
   *
   * Validation: Must be positive integer in KB if provided; default 32 MB; works with CdcMaxBatchInterval for file output triggering
   **/
  readonly cdcMinFileSize?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional CDC folder path specification for change data capture file organization in S3. Specifies the folder path for CDC files in S3 bucket, required for S3 sources with CDC and optional for targets, enabling transaction order preservation and organized CDC file storage in data lake architecture.
   *
   * Use cases: CDC organization; Transaction order; File path management; S3 CDC structure; Change data organization
   *
   * AWS: AWS DMS S3 endpoint cdcPath for CDC file organization and transaction order preservation
   *
   * Validation: Must be valid S3 folder path if provided; required for S3 sources with CDC; supports DMS version 3.4.2+
   **/
  readonly cdcPath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional compression type for S3 target files to optimize storage and transfer performance. Specifies compression method for CSV and Parquet files with GZIP enabling compression and NONE (default) for uncompressed files, affecting storage costs and data transfer performance in data lake operations.
   *
   * Use cases: Storage optimization; Compression; Performance tuning; Cost optimization; File size reduction
   *
   * AWS: AWS DMS S3 endpoint compressionType for target file compression and storage optimization
   *
   * Validation: Must be GZIP or NONE if provided; default NONE; applies to both CSV and Parquet file formats
   **/
  readonly compressionType?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional column delimiter for CSV file format in S3 data lake integration. Specifies the character used to separate columns in CSV files for both source and target operations, with default comma delimiter, affecting CSV file structure and data parsing in data lake workflows.
   *
   * Use cases: CSV formatting; Column separation; Data parsing; File structure; CSV customization
   *
   * AWS: AWS DMS S3 endpoint csvDelimiter for CSV column separation and file formatting
   *
   * Validation: Must be valid delimiter character if provided; default comma; affects CSV file structure and parsing
   **/
  readonly csvDelimiter?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional string value for columns not included in supplemental log during CDC CSV operations. Specifies the value to use for columns not in supplemental log when UseCsvNoSupValue is true, with null value used if not specified, affecting CDC data completeness in CSV format.
   *
   * Use cases: Supplemental log handling; CDC data completeness; Missing column values; CSV CDC operations; Data consistency
   *
   * AWS: AWS DMS S3 endpoint csvNoSupValue for supplemental log column handling in CDC CSV operations
   *
   * Validation: Must be valid string value if provided; used when UseCsvNoSupValue is true; supports DMS version 3.4.1+
   **/
  readonly csvNoSupValue?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional null value representation for CSV files in S3 data lake operations. Specifies how DMS treats null values when writing to target, allowing user-defined string as null representation to differentiate between empty strings and null values, with default NULL value for CSV null handling.
   *
   * Use cases: Null value handling; CSV formatting; Data representation; Empty string differentiation; Target compatibility
   *
   * AWS: AWS DMS S3 endpoint csvNullValue for null value representation in CSV files
   *
   * Validation: Must be valid string if provided; default NULL; differentiates empty strings from null values in CSV format
   **/
  readonly csvNullValue?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional row delimiter for CSV files in S3 data lake integration. Specifies the character used to separate rows in CSV files for both source and target operations, with default carriage return (\n), affecting CSV file structure and data parsing in data lake workflows.
   *
   * Use cases: CSV formatting; Row separation; Data parsing; File structure; CSV customization
   *
   * AWS: AWS DMS S3 endpoint csvRowDelimiter for CSV row separation and file formatting
   *
   * Validation: Must be valid delimiter character if provided; default carriage return (\n); affects CSV file structure and parsing
   **/
  readonly csvRowDelimiter?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional data format specification for S3 output files in data lake architecture. Specifies the output file format with CSV for row-based comma-separated values and Parquet for columnar storage with efficient compression and faster query response, affecting data lake performance and storage.
   *
   * Use cases: Data format selection; Storage optimization; Query performance; Compression efficiency; Data lake architecture
   *
   * AWS: AWS DMS S3 endpoint dataFormat for output file format selection and data lake optimization
   *
   * Validation: Must be 'csv' or 'parquet' if provided; affects storage efficiency and query performance in data lake
   **/
  readonly dataFormat?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional data page size in bytes for Parquet file format optimization. Specifies the size of one data page for Parquet files with default 1 MiB (1024 * 1024 bytes), affecting Parquet file structure, compression efficiency, and query performance in columnar data lake storage.
   *
   * Use cases: Parquet optimization; Page size tuning; Compression efficiency; Query performance; Columnar storage optimization
   *
   * AWS: AWS DMS S3 endpoint dataPageSize for Parquet file page size optimization and performance tuning
   *
   * Validation: Must be positive integer in bytes if provided; default 1 MiB; applies only to Parquet file format
   **/
  readonly dataPageSize?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional date partition delimiter for S3 folder partitioning organization. Specifies the delimiter character used in date-based folder partitioning with default SLASH, used when DatePartitionedEnabled is true for organizing data lake files by transaction commit dates in hierarchical folder structure.
   *
   * Use cases: Date partitioning; Folder organization; Data lake structure; Time-based organization; Partition delimiter
   *
   * AWS: AWS DMS S3 endpoint datePartitionDelimiter for date-based folder partitioning organization
   *
   * Validation: Must be valid delimiter if provided; default SLASH; used when DatePartitionedEnabled is true
   **/
  readonly datePartitionDelimiter?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable date-based folder partitioning for S3 bucket organization. Enables partitioning S3 bucket folders based on transaction commit dates with default false, providing time-based data organization for improved data lake query performance and data management.
   *
   * Use cases: Date-based partitioning; Data organization; Query optimization; Time-based structure; Data lake management
   *
   * AWS: AWS DMS S3 endpoint datePartitionEnabled for date-based folder partitioning and data organization
   *
   * Validation: Must be boolean if provided; default false; enables date-based folder partitioning for data lake organization
   **/
  readonly datePartitionEnabled?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional date format sequence for folder partitioning organization in S3 data lake. Specifies the date format sequence for folder partitioning with default YYYYMMDD, used when DatePartitionedEnabled is true for consistent date-based folder naming and organization.
   *
   * Use cases: Date format specification; Folder naming; Partition sequence; Date organization; Consistent naming
   *
   * AWS: AWS DMS S3 endpoint datePartitionSequence for date format specification in folder partitioning
   *
   * Validation: Must be valid date format if provided; default YYYYMMDD; used when DatePartitionedEnabled is true
   **/
  readonly datePartitionSequence?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional time zone specification for date partition folder creation and CDC file naming. Converts UTC time to specified time zone when creating date partition folders and CDC file names, using Area/Location format when DatePartitionedEnabled is true for consistent time zone handling.
   *
   * Use cases: Time zone conversion; Date partition timing; CDC file naming; Time zone consistency; Global data management
   *
   * AWS: AWS DMS S3 endpoint datePartitionTimezone for time zone conversion in date partitioning
   *
   * Validation: Must be valid Area/Location time zone format if provided; used when DatePartitionedEnabled is true
   **/
  readonly datePartitionTimezone?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum dictionary page size limit for Parquet column encoding optimization. Specifies the maximum size of encoded dictionary page for columns with default 1 MiB, reverting to PLAIN encoding when exceeded, affecting Parquet compression efficiency and query performance in columnar data lake storage.
   *
   * Use cases: Parquet optimization; Dictionary encoding; Compression efficiency; Column storage optimization; Encoding performance
   *
   * AWS: AWS DMS S3 endpoint dictPageSizeLimit for Parquet dictionary page size optimization and encoding control
   *
   * Validation: Must be positive integer in bytes if provided; default 1 MiB; applies only to Parquet file format
   **/
  readonly dictPageSizeLimit?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable statistics collection for Parquet pages and row groups for query optimization. Enables collection of NULL, DISTINCT, MAX, and MIN statistics with default true, improving query performance and data analysis capabilities in Parquet columnar data lake storage.
   *
   * Use cases: Query optimization; Statistics collection; Parquet performance; Data analysis; Query planning
   *
   * AWS: AWS DMS S3 endpoint enableStatistics for Parquet statistics collection and query optimization
   *
   * Validation: Must be boolean if provided; default true; applies only to Parquet file format; improves query performance
   **/
  readonly enableStatistics?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional encoding type specification for Parquet file compression and storage optimization. Specifies encoding method with RLE_DICTIONARY (default) for efficient repeated value storage, PLAIN for no encoding, and PLAIN_DICTIONARY for column-specific dictionary encoding, affecting compression and performance.
   *
   * Use cases: Compression optimization; Encoding selection; Storage efficiency; Parquet performance; Data compression
   *
   * AWS: AWS DMS S3 endpoint encodingType for Parquet encoding method selection and compression optimization
   *
   * Validation: Must be RLE_DICTIONARY, PLAIN, or PLAIN_DICTIONARY if provided; default RLE_DICTIONARY; affects Parquet compression
   **/
  readonly encodingType?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional external table definition for S3 source configuration in data lake integration. Specifies the table definition when using S3 as source, required for S3 source endpoints to define table structure and schema for data processing and migration operations.
   *
   * Use cases: S3 source configuration; Table definition; Schema specification; Data structure; Source table mapping
   *
   * AWS: AWS DMS S3 endpoint externalTableDefinition for S3 source table structure and schema definition
   *
   * Validation: Must be valid table definition if provided; required when S3 is used as source; defines table structure and schema
   **/
  readonly externalTableDefinition?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of header rows to ignore in CSV files for S3 source processing. Specifies whether to ignore the first row header in CSV files with 1 enabling the feature and 0 (default) disabling it, affecting CSV file parsing and data processing in S3 source operations.
   *
   * Use cases: CSV header handling; File parsing; Data processing; Header row management; CSV source configuration
   *
   * AWS: AWS DMS S3 endpoint ignoreHeaderRows for CSV header row handling in S3 source processing
   *
   * Validation: Must be 0 or 1 if provided; default 0; controls CSV header row processing in S3 source operations
   **/
  readonly ignoreHeaderRows?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to include INSERT operation indicators in full load CSV output for consistency with CDC operations. Enables recording INSERT operations as 'I' annotation in first field of CSV files during full load, providing consistency with CDC load format and operation tracking.
   *
   * Use cases: Operation tracking; Full load consistency; CDC compatibility; INSERT indication; Data lineage
   *
   * AWS: AWS DMS S3 endpoint includeOpForFullLoad for INSERT operation indication in full load CSV output
   *
   * Validation: Must be boolean or 'y' if provided; requires DMS version 3.1.4+; works with CdcInsertsOnly and CdcInsertsAndUpdates
   **/
  readonly includeOpForFullLoad?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum CSV file size in KB for S3 target during full load migration operations. Specifies the maximum size limit for CSV files created during full load migration with default 1 GB (1,048,576 KB), controlling file size and affecting data lake file organization and performance.
   *
   * Use cases: File size control; Full load optimization; Storage management; File organization; Performance tuning
   *
   * AWS: AWS DMS S3 endpoint maxFileSize for CSV file size limits during full load migration
   *
   * Validation: Must be integer between 1-1,048,576 KB if provided; default 1 GB; controls CSV file size during full load
   **/
  readonly maxFileSize?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to set TIMESTAMP column precision to milliseconds in Parquet files for Athena and Glue compatibility. Enables millisecond precision for TIMESTAMP columns in Parquet format instead of microsecond precision, ensuring compatibility with Amazon Athena and AWS Glue query engines that handle only millisecond precision.
   *
   * Use cases: Athena compatibility; Glue integration; Timestamp precision; Parquet optimization; Query engine compatibility
   *
   * AWS: AWS DMS S3 endpoint parquetTimestampInMillisecond for TIMESTAMP precision in Parquet files
   *
   * Validation: Must be boolean or 'y' if provided; requires DMS version 3.1.4+; applies only to Parquet format; CSV always uses microsecond
   **/
  readonly parquetTimestampInMillisecond?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Apache Parquet format version specification for S3 data lake columnar storage. Specifies the Parquet format version with parquet_1_0 (default) or parquet_2_0 options, affecting file compatibility, features, and performance characteristics in columnar data lake storage operations.
   *
   * Use cases: Parquet version selection; Format compatibility; Feature availability; Performance optimization; Columnar storage
   *
   * AWS: AWS DMS S3 endpoint parquetVersion for Apache Parquet format version specification
   *
   * Validation: Must be 'parquet_1_0' or 'parquet_2_0' if provided; default parquet_1_0; affects Parquet file compatibility and features
   **/
  readonly parquetVersion?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to preserve transaction order for CDC loads in S3 target for data consistency. Enables saving transaction order for change data capture loads on S3 target specified by CdcPath, ensuring transactional consistency and proper ordering in data lake CDC operations.
   *
   * Use cases: Transaction consistency; CDC ordering; Data integrity; Transaction preservation; Change data consistency
   *
   * AWS: AWS DMS S3 endpoint preserveTransactions for CDC transaction order preservation in S3 target
   *
   * Validation: Must be boolean if provided; requires CdcPath setting; supports DMS version 3.4.2+; ensures transaction order consistency
   **/
  readonly preserveTransactions?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable RFC 4180 compliance for CSV quotation mark handling in S3 operations. Controls quotation mark behavior with true (default) requiring paired quotation marks and proper escaping, and false allowing delimiters within strings, affecting CSV parsing and data integrity.
   *
   * Use cases: CSV compliance; Quotation handling; RFC 4180 standard; Data parsing; CSV formatting
   *
   * AWS: AWS DMS S3 endpoint rfc4180 for CSV quotation mark handling and RFC 4180 compliance
   *
   * Validation: Must be boolean, 'y', or 'n' if provided; default true; affects CSV quotation mark handling and delimiter behavior
   **/
  readonly rfc4180?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of rows in Parquet row group for read/write performance optimization. Specifies row group size with default 10,000 rows, balancing faster reads (smaller groups) against slower writes (more groups), with maximum 64MB limit for Parquet file performance tuning.
   *
   * Use cases: Parquet optimization; Read performance; Write performance; Row group tuning; Columnar storage optimization
   *
   * AWS: AWS DMS S3 endpoint rowGroupLength for Parquet row group size optimization and performance tuning
   *
   * Validation: Must be positive integer if provided; default 10,000; maximum 64MB (64*1024*1024 bytes); applies only to Parquet format
   **/
  readonly rowGroupLength?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Required KMS key ID for server-side encryption when using SSE_KMS encryption mode for S3 data lake security. Specifies the AWS KMS key for encrypting S3 objects, requiring attached policy enabling IAM user permissions and key usage for secure data lake storage and compliance.
   *
   * Use cases: Data encryption; KMS integration; S3 security; Compliance requirements; Data protection
   *
   * AWS: AWS KMS key ID for S3 server-side encryption with customer-managed keys
   *
   * Validation: Must be valid KMS key ID; required when EncryptionMode is SSE_KMS; requires proper IAM permissions and key policy
   **/
  readonly serverSideEncryptionKmsKeyId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role ARN for DMS service access to S3 bucket operations for data lake integration. Specifies the service role enabling DMS to read and write S3 objects, requiring iam:PassRole action for secure S3 bucket access and data migration operations.
   *
   * Use cases: Service access; IAM role configuration; S3 permissions; Secure access; Data migration authorization
   *
   * AWS: AWS IAM role ARN for DMS service access to S3 bucket operations and data lake integration
   *
   * Validation: Must be valid IAM role ARN if provided; requires iam:PassRole action; enables S3 read/write operations
   **/
  readonly serviceAccessRoleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional timestamp column name for adding migration timing information to S3 data lake files. Adds STRING column with timestamp information to CSV or Parquet files, containing transfer timestamps for full load and commit timestamps for CDC, with microsecond precision format yyyy-MM-dd HH:mm:ss.SSSSSS.
   *
   * Use cases: Data lineage; Migration tracking; Timestamp information; Data auditing; Change tracking
   *
   * AWS: AWS DMS S3 endpoint timestampColumnName for migration timestamp tracking in data lake files
   *
   * Validation: Must be valid column name if provided; requires DMS version 3.1.4+; adds timestamp column to output files
   **/
  readonly timestampColumnName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to use task start time for full load timestamp column instead of data arrival time. Controls timestamp behavior with true using task start time for full load and transaction commit time for CDC, and false using incremental data arrival time for full load operations.
   *
   * Use cases: Timestamp consistency; Task timing; Full load timing; Timestamp behavior; Data lineage
   *
   * AWS: AWS DMS S3 endpoint useTaskStartTimeForFullLoadTimestamp for timestamp column behavior control
   *
   * Validation: Must be boolean if provided; affects timestamp column behavior for full load operations; CDC always uses commit time
   **/
  readonly useTaskStartTimeForFullLoadTimestamp?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to use CsvNoSupValue for columns not in supplemental log during CDC CSV operations. Controls handling of columns not included in supplemental log with true using CsvNoSupValue and false using null value, affecting CDC data completeness in CSV format operations.
   *
   * Use cases: Supplemental log handling; CDC data completeness; Missing column values; CSV CDC operations; Data consistency
   *
   * AWS: AWS DMS S3 endpoint useCsvNoSupValue for supplemental log column handling in CDC CSV operations
   *
   * Validation: Must be boolean if provided; works with CsvNoSupValue setting; applies only to CDC loads in CSV format
   **/
  readonly useCsvNoSupValue?: boolean;
}
/**
 * Provides information that describes an Amazon Kinesis Data Stream endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For more information about other available settings, see [Using object mapping to migrate data to a Kinesis data stream](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Kinesis.html#CHAP_Target.Kinesis.ObjectMapping) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-kinesissettings.html
 */
/**
 * Q-ENHANCED-INTERFACE
 * Kinesis settings configuration interface for DMS providing streaming data integration and real-time migration capabilities. Defines Kinesis-specific properties for Database Migration Service including streaming configuration, data format settings, and Kinesis integration for real-time database streaming workflows.
 *
 * Use cases: Real-time database streaming; Streaming data integration; Kinesis data streams; Real-time migration; Database streaming workflows; DMS Kinesis integration
 *
 * AWS: AWS DMS Kinesis endpoint configuration with streaming data integration and real-time migration capabilities
 *
 * Validation: Configuration must be valid for DMS migration; properties must conform to AWS DMS and database-specific requirements
 */
export interface KinesisSettingsProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to show detailed control information for table and column changes in Kinesis message output for change tracking. Enables detailed control information including table definition, column definition, and table/column changes in Kinesis streaming output with default false for enhanced change visibility.
   *
   * Use cases: Change tracking; Control information; Table monitoring; Column changes; Detailed streaming
   *
   * AWS: AWS DMS Kinesis endpoint includeControlDetails for detailed control information in streaming output
   *
   * Validation: Must be boolean if provided; default false; enables detailed control information in Kinesis message output
   **/
  readonly includeControlDetails?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to include NULL and empty columns in records migrated to Kinesis endpoint for complete data representation. Enables inclusion of NULL and empty column values in Kinesis streaming output with default false, ensuring complete data representation in real-time streaming operations.
   *
   * Use cases: Complete data representation; NULL handling; Empty column inclusion; Data completeness; Streaming integrity
   *
   * AWS: AWS DMS Kinesis endpoint includeNullAndEmpty for NULL and empty column inclusion in streaming output
   *
   * Validation: Must be boolean if provided; default false; includes NULL and empty columns in Kinesis streaming records
   **/
  readonly includeNullAndEmpty?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to show partition value in Kinesis message output unless partition type is schema-table-type. Enables partition value visibility in Kinesis streaming output with default false, providing partition information for data organization and routing in streaming operations.
   *
   * Use cases: Partition visibility; Data organization; Streaming routing; Partition information; Message organization
   *
   * AWS: AWS DMS Kinesis endpoint includePartitionValue for partition value visibility in streaming output
   *
   * Validation: Must be boolean if provided; default false; shows partition value unless partition type is schema-table-type
   **/
  readonly includePartitionValue?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to include DDL operations that change table structure in control data for schema change tracking. Enables inclusion of DDL operations like rename-table, drop-table, add-column, drop-column, and rename-column in control data with default false for schema evolution tracking.
   *
   * Use cases: Schema change tracking; DDL monitoring; Table structure changes; Schema evolution; Control data enhancement
   *
   * AWS: AWS DMS Kinesis endpoint includeTableAlterOperations for DDL operation inclusion in control data
   *
   * Validation: Must be boolean if provided; default false; includes DDL operations in control data for schema change tracking
   **/
  readonly includeTableAlterOperations?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to provide detailed transaction information from source database for transaction tracking. Enables detailed transaction information including commit timestamp, log position, transaction_id, previous transaction_id, and transaction_record_id with default false for enhanced transaction visibility in streaming.
   *
   * Use cases: Transaction tracking; Commit information; Transaction details; Log position tracking; Transaction lineage
   *
   * AWS: AWS DMS Kinesis endpoint includeTransactionDetails for detailed transaction information in streaming output
   *
   * Validation: Must be boolean if provided; default false; provides detailed transaction information from source database
   **/
  readonly includeTransactionDetails?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional output format specification for records created on Kinesis endpoint for streaming data format control. Specifies message format with JSON (default) for formatted output or JSON_UNFORMATTED for single-line output without tabs, affecting streaming data structure and readability.
   *
   * Use cases: Message formatting; JSON structure; Output format; Streaming format; Data structure control
   *
   * AWS: AWS DMS Kinesis endpoint messageFormat for streaming record output format specification
   *
   * Validation: Must be 'JSON' or 'JSON_UNFORMATTED' if provided; default JSON; controls streaming message format and structure
   **/
  readonly messageFormat?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to avoid adding '0x' prefix to raw data in hexadecimal format for cleaner data representation. Enables migration of RAW data type columns without '0x' prefix, particularly useful for LOB columns from Oracle sources to Kinesis targets for cleaner hexadecimal data representation.
   *
   * Use cases: Hexadecimal formatting; RAW data migration; LOB handling; Data format control; Oracle to Kinesis migration
   *
   * AWS: AWS DMS Kinesis endpoint noHexPrefix for hexadecimal data formatting control in streaming output
   *
   * Validation: Must be boolean if provided; removes '0x' prefix from hexadecimal RAW data in streaming output
   **/
  readonly noHexPrefix?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to prefix schema and table names to partition values for improved data distribution across Kinesis shards. Enables schema and table name prefixing when partition type is primary-key-type, improving data distribution and reducing throttling for tables with limited primary key ranges.
   *
   * Use cases: Data distribution; Shard optimization; Throttling prevention; Partition strategy; Performance optimization
   *
   * AWS: AWS DMS Kinesis endpoint partitionIncludeSchemaTable for partition value prefixing and shard distribution
   *
   * Validation: Must be boolean if provided; default false; improves data distribution when partition type is primary-key-type
   **/
  readonly partitionIncludeSchemaTable?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role ARN for DMS service access to Kinesis data stream for secure streaming operations. Specifies the IAM role enabling DMS to write to Kinesis data stream, requiring iam:PassRole action for secure streaming data integration and real-time data migration operations.
   *
   * Use cases: Service access; IAM role configuration; Kinesis permissions; Secure streaming; Data migration authorization
   *
   * AWS: AWS IAM role ARN for DMS service access to Kinesis data stream operations and streaming integration
   *
   * Validation: Must be valid IAM role ARN if provided; requires iam:PassRole action; enables Kinesis data stream write operations
   **/
  readonly serviceAccessRoleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Amazon Kinesis Data Streams endpoint ARN for DMS streaming destination configuration. Specifies the target Kinesis data stream where migrated database data will be streamed, serving as the primary destination for real-time database streaming workflows and data integration.
   *
   * Use cases: Streaming destination; Kinesis integration; Real-time migration; Data stream target; Database streaming endpoint
   *
   * AWS: Amazon Kinesis Data Streams ARN for DMS streaming destination and real-time data integration
   *
   * Validation: Must be valid Kinesis Data Streams ARN; required for Kinesis endpoint configuration and streaming destination
   **/
  readonly streamArn: string;
}
/**
 * Provides information that defines an Amazon Redshift endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For more information about other available settings, see [Extra connection attributes when using Amazon Redshift as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Redshift.html#CHAP_Target.Redshift.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-redshiftsettings.html
 */
/**
 * Q-ENHANCED-INTERFACE
 * Redshift settings configuration interface for DMS providing data warehouse integration and bulk loading capabilities. Defines Redshift-specific properties for Database Migration Service including data loading configuration, S3 integration, and Redshift optimization for data warehouse migration workflows.
 *
 * Use cases: Data warehouse migration; Redshift integration; Bulk data loading; Data warehouse workflows; S3 staging; DMS Redshift integration
 *
 * AWS: AWS DMS Redshift endpoint configuration with data warehouse integration and bulk loading optimization
 *
 * Validation: Configuration must be valid for DMS migration; properties must conform to AWS DMS and Redshift-specific requirements
 */
export interface RedshiftSettingsProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to allow any date format including invalid formats for flexible date handling in Redshift data warehouse. Enables loading of any date format including invalid formats like 00/00/00 00:00:00 without errors, with false default, requiring DATEFORMAT parameter for proper date handling.
   *
   * Use cases: Flexible date handling; Invalid date processing; Date format tolerance; Data warehouse loading; TIMESTAMP/DATE columns
   *
   * AWS: AWS DMS Redshift endpoint acceptAnyDate for flexible date format handling in data warehouse loading
   *
   * Validation: Must be boolean if provided; default false; applies only to TIMESTAMP and DATE columns; requires DATEFORMAT parameter
   **/
  readonly acceptAnyDate?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional SQL script to execute after connecting to Redshift endpoint for initialization and setup tasks. Provides custom initialization logic that runs after connection establishment to Redshift data warehouse, enabling database-specific setup and configuration for data warehouse operations.
   *
   * Use cases: Database initialization; Connection setup; Custom configuration; Post-connection tasks; Data warehouse preparation
   *
   * AWS: AWS DMS Redshift endpoint afterConnectScript for post-connection initialization and setup
   *
   * Validation: Must be valid SQL script code if provided; script content not filename; enables custom Redshift initialization
   **/
  readonly afterConnectScript?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 folder for storing CSV files before uploading to Redshift cluster for staged data loading. Specifies S3 folder where CSV files are stored before Redshift COPY operations, with full load using BucketFolder/TableID path and CDC using BucketFolder/NetChangesTableID path for organized data staging.
   *
   * Use cases: Data staging; S3 organization; CSV storage; Redshift COPY operations; Staged loading
   *
   * AWS: AWS S3 folder path for DMS Redshift CSV file staging and COPY operation organization
   *
   * Validation: Must be valid S3 folder path if provided; used for CSV staging before Redshift COPY operations
   **/
  readonly bucketFolder?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 bucket name for intermediate CSV file storage before Redshift data loading operations. Specifies the S3 bucket where CSV files are stored before uploading to Redshift cluster, serving as staging area for Redshift COPY operations and data warehouse loading workflows.
   *
   * Use cases: Data staging; S3 storage; CSV intermediate storage; Redshift loading; Data warehouse staging
   *
   * AWS: AWS S3 bucket name for DMS Redshift CSV file staging and data warehouse loading operations
   *
   * Validation: Must be valid S3 bucket name; required for Redshift endpoint configuration and CSV staging operations
   **/
  readonly bucketName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable case-sensitive schema names in Redshift data warehouse for precise schema handling. Enables case-sensitive schema name support when Redshift is configured for case sensitivity with default false, ensuring proper schema name handling and data organization in data warehouse operations.
   *
   * Use cases: Case-sensitive schemas; Schema name precision; Data organization; Redshift configuration; Schema handling
   *
   * AWS: AWS DMS Redshift endpoint caseSensitiveNames for case-sensitive schema name handling
   *
   * Validation: Must be boolean if provided; default false; requires Redshift configured for case-sensitive schema names
   **/
  readonly caseSensitiveNames?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to enable automatic compression for empty Redshift tables for storage optimization. Enables automatic compression when table is empty even with existing encodings other than RAW, with true default, optimizing storage efficiency and query performance in data warehouse operations.
   *
   * Use cases: Storage optimization; Compression management; Performance tuning; Data warehouse optimization; Automatic encoding
   *
   * AWS: AWS DMS Redshift endpoint compUpdate for automatic compression and storage optimization
   *
   * Validation: Must be boolean if provided; default true; applies automatic compression to empty tables regardless of existing encodings
   **/
  readonly compUpdate?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional connection timeout in milliseconds for Redshift endpoint connection establishment. Specifies the maximum time to wait for initial connection establishment to Redshift data warehouse, controlling connection reliability and timeout behavior for data warehouse connectivity.
   *
   * Use cases: Connection reliability; Timeout control; Network configuration; Connection management; Data warehouse connectivity
   *
   * AWS: AWS DMS Redshift endpoint connectionTimeout for connection establishment timeout control
   *
   * Validation: Must be positive integer in milliseconds if provided; controls initial connection timeout for Redshift endpoint
   **/
  readonly connectionTimeout?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional date format specification for Redshift data loading and date handling. Specifies date format with 'auto' for automatic recognition, custom format string in quotes, or NULL for default YYYY-MM-DD format, enabling flexible date parsing and data warehouse date handling.
   *
   * Use cases: Date format specification; Flexible date parsing; Data warehouse loading; Date handling; Format recognition
   *
   * AWS: AWS DMS Redshift endpoint dateFormat for date format specification and parsing control
   *
   * Validation: Must be 'auto', quoted format string, or NULL if provided; default YYYY-MM-DD; use 'auto' for mixed formats
   **/
  readonly dateFormat?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to migrate empty CHAR and VARCHAR fields as NULL for consistent null handling. Enables migration of empty string fields as NULL values with true setting and false default, ensuring consistent null representation in Redshift data warehouse operations.
   *
   * Use cases: NULL handling; Empty string processing; Data consistency; Redshift migration; Field representation
   *
   * AWS: AWS DMS Redshift endpoint emptyAsNull for empty field NULL conversion and consistent data representation
   *
   * Validation: Must be boolean if provided; default false; converts empty CHAR/VARCHAR fields to NULL when true
   **/
  readonly emptyAsNull?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to override auto-generated IDENTITY column values with explicit source values for full-load migration. Enables tables with IDENTITY columns to use explicit values from source data files instead of auto-generated values, applicable only to full-load migration tasks.
   *
   * Use cases: IDENTITY column handling; Explicit value loading; Full-load migration; Source value preservation; Identity management
   *
   * AWS: AWS DMS Redshift endpoint explicitIds for IDENTITY column value override in full-load migration
   *
   * Validation: Must be boolean if provided; default false; applies only to full-load migration tasks with IDENTITY columns
   **/
  readonly explicitIds?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of parallel threads for single file upload to optimize S3 multipart upload performance. Specifies thread count (1-64) for uploading single CSV files to S3 using multipart upload with default 10, affecting upload performance and throughput for Redshift staging operations.
   *
   * Use cases: Upload optimization; Parallel processing; S3 multipart upload; Performance tuning; File transfer optimization
   *
   * AWS: AWS S3 multipart upload thread configuration for DMS Redshift CSV file upload optimization
   *
   * Validation: Must be integer between 1-64 if provided; default 10; controls parallel streams for S3 multipart upload
   **/
  readonly fileTransferUploadStreams?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional timeout in milliseconds for Redshift cluster operations including COPY, INSERT, DELETE, and UPDATE. Specifies maximum wait time for DMS operations on Redshift cluster, controlling operation timeout behavior and preventing hung operations in data warehouse loading.
   *
   * Use cases: Operation timeout; Performance control; Redshift operations; Timeout management; Data warehouse loading
   *
   * AWS: AWS DMS Redshift endpoint loadTimeout for cluster operation timeout control and performance management
   *
   * Validation: Must be positive integer in milliseconds if provided; controls timeout for Redshift COPY/INSERT/DELETE/UPDATE operations
   **/
  readonly loadTimeout?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to migrate boolean type as native boolean in Redshift for proper data type representation. Enables migration of boolean values as boolean type instead of default varchar(1), requiring setting on both source and target endpoints for proper boolean data type handling in data warehouse.
   *
   * Use cases: Boolean type preservation; Data type accuracy; Redshift native types; Type mapping; Data warehouse optimization
   *
   * AWS: AWS DMS Redshift endpoint mapBooleanAsBoolean for native boolean type migration and data type preservation
   *
   * Validation: Must be boolean if provided; must be set on both source and target endpoints; preserves boolean data type in Redshift
   **/
  readonly mapBooleanAsBoolean?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum CSV file size in KB for S3 staging and Redshift data transfer optimization. Specifies maximum size limit for CSV files used in S3 bucket loading and Redshift data transfer with default 1 GB (1048576KB), affecting staging performance and transfer efficiency.
   *
   * Use cases: File size control; S3 staging optimization; Transfer performance; Data warehouse loading; Storage management
   *
   * AWS: AWS DMS Redshift endpoint maxFileSize for CSV file size limits in S3 staging and data transfer
   *
   * Validation: Must be positive integer in KB if provided; default 1 GB; controls CSV file size for S3 staging and Redshift transfer
   **/
  readonly maxFileSize?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to remove surrounding quotation marks from strings in incoming data for cleaner data processing. Enables removal of quotation marks while retaining all characters within quotes including delimiters, with false default, affecting string data processing in Redshift migration.
   *
   * Use cases: String processing; Quotation handling; Data cleaning; Character processing; String formatting
   *
   * AWS: AWS DMS Redshift endpoint removeQuotes for quotation mark removal and string data processing
   *
   * Validation: Must be boolean if provided; default false; removes surrounding quotation marks while preserving internal content
   **/
  readonly removeQuotes?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional replacement character for invalid characters specified in ReplaceInvalidChars for data cleaning. Specifies the substitution character for invalid characters during data migration with default "?" character, working with ReplaceInvalidChars for character replacement and data cleaning.
   *
   * Use cases: Character replacement; Data cleaning; Invalid character handling; String processing; Data sanitization
   *
   * AWS: AWS DMS Redshift endpoint replaceChars for invalid character replacement and data cleaning
   *
   * Validation: Must be valid replacement character if provided; default "?"; works with ReplaceInvalidChars for character substitution
   **/
  readonly replaceChars?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional list of characters to replace during data migration for data cleaning. Specifies characters that should be replaced using ReplaceChars substitution, enabling data sanitization and character normalization during Redshift data warehouse migration operations.
   *
   * Use cases: Character filtering; Data sanitization; Invalid character removal; String normalization; Data cleaning
   *
   * AWS: AWS DMS Redshift endpoint replaceInvalidChars for character filtering and data sanitization
   *
   * Validation: Must be valid character list if provided; works with ReplaceChars for character replacement and data cleaning
   **/
  readonly replaceInvalidChars?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role ARN for AWS Secrets Manager access to Redshift endpoint credentials. Specifies the IAM role with required permissions to access SecretsManagerSecret containing Redshift endpoint credentials, enabling secure credential management and access control for data warehouse connections.
   *
   * Use cases: Credential management; Secrets Manager integration; Secure access; IAM role configuration; Redshift authentication
   *
   * AWS: AWS IAM role ARN for Secrets Manager access to Redshift endpoint credentials and authentication
   *
   * Validation: Must be valid IAM role ARN if provided; requires iam:PassRole action and Secrets Manager access permissions
   **/
  readonly secretsManagerAccessRoleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Secrets Manager secret ARN containing Redshift endpoint connection details for secure credential management. Specifies the full ARN of the secret containing Redshift database connection information including credentials, enabling secure storage and access of Redshift endpoint authentication details.
   *
   * Use cases: Secure credential storage; Redshift authentication; Secrets Manager integration; Database connection security; Credential management
   *
   * AWS: AWS Secrets Manager secret ARN containing Redshift endpoint connection details and credentials
   *
   * Validation: Must be valid Secrets Manager secret ARN; required for secure Redshift endpoint credential management and authentication
   **/
  readonly secretsManagerSecretArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for encrypting Redshift endpoint credentials secret in Secrets Manager. Specifies the KMS key used to encrypt the credentials secret, providing additional encryption layer for Redshift endpoint authentication information stored in AWS Secrets Manager.
   *
   * Use cases: Credential encryption; KMS integration; Enhanced security; Secret encryption; Redshift credential protection
   *
   * AWS: AWS KMS key ARN for encrypting Secrets Manager secret containing Redshift endpoint credentials
   *
   * Validation: Must be valid KMS key ARN if provided; provides additional encryption for Redshift credentials in Secrets Manager
   **/
  readonly secretsManagerSecretKMSArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required KMS key ID for server-side encryption when using SSE_KMS encryption mode for Redshift S3 staging security. Specifies the AWS KMS key for encrypting S3 staging objects, requiring attached policy enabling IAM user permissions and key usage for secure data warehouse staging and compliance.
   *
   * Use cases: Data encryption; KMS integration; S3 security; Compliance requirements; Data protection
   *
   * AWS: AWS KMS key ID for S3 server-side encryption with customer-managed keys in Redshift staging
   *
   * Validation: Must be valid KMS key ID; required when EncryptionMode is SSE_KMS; requires proper IAM permissions and key policy
   **/
  readonly serverSideEncryptionKmsKeyId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role ARN for DMS service access to Redshift service operations for data warehouse integration. Specifies the service role enabling DMS to access Redshift service, requiring iam:PassRole action for secure Redshift access and data warehouse migration operations.
   *
   * Use cases: Service access; IAM role configuration; Redshift permissions; Secure access; Data warehouse authorization
   *
   * AWS: AWS IAM role ARN for DMS service access to Redshift service operations and data warehouse integration
   *
   * Validation: Must be valid IAM role ARN if provided; requires iam:PassRole action; enables Redshift service access operations
   **/
  readonly serviceAccessRoleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional time format specification for Redshift data loading and time handling. Specifies time format with 'auto' for automatic recognition, custom timeformat_string, epochsecs, or epochmillisecs options, enabling flexible time parsing and data warehouse time handling with default 10.
   *
   * Use cases: Time format specification; Flexible time parsing; Data warehouse loading; Time handling; Format recognition
   *
   * AWS: AWS DMS Redshift endpoint timeFormat for time format specification and parsing control
   *
   * Validation: Must be 'auto', timeformat_string, 'epochsecs', or 'epochmillisecs' if provided; default 10; use 'auto' for mixed formats
   **/
  readonly timeFormat?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to remove trailing white space characters from VARCHAR strings for cleaner data processing. Enables removal of trailing whitespace from VARCHAR columns with true setting and false default, improving data quality and consistency in Redshift data warehouse operations.
   *
   * Use cases: Data cleaning; Whitespace removal; VARCHAR processing; Data quality; String normalization
   *
   * AWS: AWS DMS Redshift endpoint trimBlanks for trailing whitespace removal from VARCHAR columns
   *
   * Validation: Must be boolean if provided; default false; applies only to VARCHAR data type columns; removes trailing whitespace
   **/
  readonly trimBlanks?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to truncate data in columns to fit column size limits for data integrity in Redshift. Enables truncation of data in VARCHAR or CHAR columns to appropriate character limits for rows 4MB or less, with false default, ensuring data fits column constraints in data warehouse operations.
   *
   * Use cases: Data truncation; Column size compliance; Data integrity; VARCHAR/CHAR handling; Size constraint management
   *
   * AWS: AWS DMS Redshift endpoint truncateColumns for data truncation and column size compliance
   *
   * Validation: Must be boolean if provided; default false; applies only to VARCHAR/CHAR columns with rows ≤4MB; ensures data fits columns
   **/
  readonly truncateColumns?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional in-memory file write buffer size in KB for CSV file generation performance optimization. Specifies buffer size for generating CSV files on local disk at DMS replication instance with default 1000KB (1MB), affecting CSV generation performance and memory usage.
   *
   * Use cases: Performance optimization; Buffer management; CSV generation; Memory optimization; File write performance
   *
   * AWS: AWS DMS Redshift endpoint writeBufferSize for CSV file generation buffer optimization and performance tuning
   *
   * Validation: Must be positive integer in KB if provided; default 1000KB; controls in-memory buffer size for CSV file generation
   **/
  readonly writeBufferSize?: number;
}
/**
 * Provides information that defines a MongoDB endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For more information about other available settings, see [Endpoint configuration settings when using MongoDB as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MongoDB.html#CHAP_Source.MongoDB.Configuration) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-mongodbsettings.html
 */
/**
 * Q-ENHANCED-INTERFACE
 * MongoDB settings configuration interface for DMS providing NoSQL database migration and document database capabilities. Defines MongoDB-specific properties for Database Migration Service including document migration, authentication settings, and MongoDB integration for NoSQL database migration workflows.
 *
 * Use cases: NoSQL database migration; Document database migration; MongoDB connectivity; NoSQL migration workflows; Document data migration; DMS MongoDB integration
 *
 * AWS: AWS DMS MongoDB endpoint configuration with NoSQL database migration and document database capabilities
 *
 * Validation: Configuration must be valid for DMS migration; properties must conform to AWS DMS and database-specific requirements
 */
export interface MongoDbSettingsProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional authentication mechanism for MongoDB source endpoint access with version-specific defaults. Specifies authentication method with default "mongodb_cr" for MongoDB 2.x and "scram_sha_1" for MongoDB 3.x+, not used when AuthType is "no", enabling secure MongoDB database connectivity and authentication.
   *
   * Use cases: MongoDB authentication; Version-specific auth; Database security; Connection authentication; MongoDB connectivity
   *
   * AWS: AWS DMS MongoDB endpoint authMechanism for authentication method specification and secure database access
   *
   * Validation: Must be valid MongoDB authentication mechanism if provided; version-dependent defaults; not used when AuthType is "no"
   **/
  readonly authMechanism?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional MongoDB database name for authentication with default "admin" database. Specifies the database used for authentication operations, not used when AuthType is "no", enabling proper authentication context and database-specific access control for MongoDB migration operations.
   *
   * Use cases: Authentication database; MongoDB auth context; Database-specific auth; Authentication scope; MongoDB security
   *
   * AWS: AWS DMS MongoDB endpoint authSource for authentication database specification and access control
   *
   * Validation: Must be valid MongoDB database name if provided; default "admin"; not used when AuthType is "no"
   **/
  readonly authSource?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional authentication type for MongoDB source endpoint access control. Specifies authentication type with "no" disabling username/password requirements and allowing empty credentials, enabling flexible authentication configuration for MongoDB database connectivity and migration operations.
   *
   * Use cases: Authentication control; MongoDB security; Credential management; Access control; Database authentication
   *
   * AWS: AWS DMS MongoDB endpoint authType for authentication type specification and access control
   *
   * Validation: Must be valid authentication type if provided; "no" disables username/password requirements; controls MongoDB authentication
   **/
  readonly authType?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional database name on MongoDB source endpoint for migration scope specification. Specifies the target database name for MongoDB migration operations, defining the scope of data migration and database-specific operations for NoSQL document database migration workflows.
   *
   * Use cases: Database scope; Migration target; MongoDB database selection; Data scope; Database specification
   *
   * AWS: AWS DMS MongoDB endpoint databaseName for migration database specification and scope definition
   *
   * Validation: Must be valid MongoDB database name if provided; defines migration scope and target database for operations
   **/
  readonly databaseName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of documents to preview for document organization analysis when using table mode. Specifies document count for preview analysis with default 1000, used when NestingLevel is "one", enabling proper document structure analysis and table mode configuration.
   *
   * Use cases: Document analysis; Structure preview; Table mode configuration; Document organization; Schema analysis
   *
   * AWS: AWS DMS MongoDB endpoint docsToInvestigate for document structure analysis and table mode configuration
   *
   * Validation: Must be positive integer greater than 0 if provided; default 1000; used when NestingLevel is "one"
   **/
  readonly docsToInvestigate?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to specify document ID extraction when using document mode. Specifies whether to extract document ID with default "false", used when NestingLevel is "none", enabling document ID handling and document mode configuration for MongoDB migration operations.
   *
   * Use cases: Document ID extraction; Document mode; ID handling; Document configuration; MongoDB document processing
   *
   * AWS: AWS DMS MongoDB endpoint extractDocId for document ID extraction and document mode configuration
   *
   * Validation: Must be "true" or "false" if provided; default "false"; used when NestingLevel is "none"
   **/
  readonly extractDocId?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional nesting level specification for document or table mode selection. Specifies migration mode with "none" for document mode and "one" for table mode, with default "none", controlling how MongoDB documents are processed and migrated in NoSQL database operations.
   *
   * Use cases: Migration mode; Document processing; Table mode; Document mode; MongoDB structure handling
   *
   * AWS: AWS DMS MongoDB endpoint nestingLevel for migration mode specification and document processing control
   *
   * Validation: Must be "none" or "one" if provided; default "none"; "none" uses document mode, "one" uses table mode
   **/
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
/**
 * Q-ENHANCED-INTERFACE
 * IBM DB2 settings configuration interface for DMS providing mainframe database migration and enterprise database capabilities. Defines IBM DB2-specific properties for Database Migration Service including mainframe connectivity, enterprise features, and DB2 integration for enterprise database migration workflows.
 *
 * Use cases: Mainframe database migration; Enterprise database migration; IBM DB2 connectivity; Mainframe integration; Enterprise migration workflows; DMS DB2 integration
 *
 * AWS: AWS DMS IBM DB2 endpoint configuration with mainframe database migration and enterprise database capabilities
 *
 * Validation: Configuration must be valid for DMS migration; properties must conform to AWS DMS and database-specific requirements
 */
export interface IbmDb2SettingsProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional log sequence number (LSN) for IBM DB2 change data capture (CDC) replication starting point enabling precise replication control. Specifies the exact LSN where ongoing replication should begin for CDC operations, providing fine-grained control over data synchronization starting points in mainframe database migration scenarios.
   *
   * Use cases: CDC replication control; Precise replication starting points; Mainframe data synchronization; Log-based replication; Data migration control
   *
   * AWS: AWS DMS IBM DB2 current LSN for CDC replication starting point control and log-based data synchronization
   *
   * Validation: Must be valid LSN string if provided; used for CDC replication; optional for replication starting point control
   **/
  readonly currentLsn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum bytes per read operation for IBM DB2 data transfer performance optimization enabling throughput tuning. Defines the maximum number of kilobytes that will be read in a single operation during data migration, allowing performance optimization for mainframe database transfers with configurable read buffer sizes.
   *
   * Use cases: Performance optimization; Throughput tuning; Read buffer configuration; Migration performance; Mainframe data transfer optimization
   *
   * AWS: AWS DMS IBM DB2 maximum kilobytes per read for data transfer performance optimization and throughput control
   *
   * Validation: Must be positive number if provided; defaults to 64 KB; optional for performance tuning
   **/
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
/**
 * Q-ENHANCED-INTERFACE
 * Neptune settings configuration interface for DMS providing graph database migration and graph data capabilities. Defines Neptune-specific properties for Database Migration Service including graph data migration, graph database connectivity, and Neptune integration for graph database migration workflows.
 *
 * Use cases: Graph database migration; Graph data migration; Neptune connectivity; Graph database workflows; Graph data integration; DMS Neptune integration
 *
 * AWS: AWS DMS Neptune endpoint configuration with graph database migration and graph data capabilities
 *
 * Validation: Configuration must be valid for DMS migration; properties must conform to AWS DMS and database-specific requirements
 */
export interface NeptuneSettingsProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional retry duration in milliseconds for DMS bulk-load operations to Neptune target database enabling resilient graph data migration with configurable error recovery. Defines the wait time before retrying failed bulk-load operations for migrated graph data to ensure reliable data transfer to Neptune.
   *
   * Use cases: Graph data migration resilience; Bulk-load error recovery; Neptune migration optimization; Retry configuration
   *
   * AWS: DMS Neptune endpoint errorRetryDuration setting for bulk-load retry timing configuration
   *
   * Validation: Must be positive integer in milliseconds; default is 250ms; controls retry timing for failed bulk operations
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-neptunesettings.html#cfn-dms-endpoint-neptunesettings-errorretryduration
   */
  readonly errorRetryDuration?: number;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum file size in kilobytes for CSV files containing migrated graph data before DMS bulk-loads to Neptune target database enabling optimized batch processing. Defines the size threshold for CSV files storing graph data before triggering bulk-load operations to Neptune, optimizing memory usage and transfer efficiency.
   *
   * Use cases: Graph data batch optimization; Memory management; CSV file size control; Neptune bulk-load efficiency
   *
   * AWS: DMS Neptune endpoint maxFileSize setting for CSV file size threshold configuration
   *
   * Validation: Must be positive integer in kilobytes; default is 1,048,576 KB (1GB); controls CSV batch size for bulk operations
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-neptunesettings.html#cfn-dms-endpoint-neptunesettings-maxfilesize
   */
  readonly maxFileSize?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum retry count for DMS bulk-load operations to Neptune target database enabling configurable resilience for graph data migration. Defines the number of retry attempts for failed bulk-load operations before raising an error, ensuring reliable graph data transfer with controlled retry behavior.
   *
   * Use cases: Graph migration resilience; Bulk-load retry control; Neptune migration reliability; Error handling configuration
   *
   * AWS: DMS Neptune endpoint maxRetryCount setting for bulk-load retry attempt configuration
   *
   * Validation: Must be positive integer; default is 5 retries; controls maximum retry attempts for failed bulk operations
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-neptunesettings.html#cfn-dms-endpoint-neptunesettings-maxretrycount
   */
  readonly maxRetryCount?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 bucket folder path for storing migrated graph data during DMS Neptune migration enabling organized data staging and processing. Defines the folder structure within the S3 bucket for temporary storage of graph data CSV files before bulk-loading to Neptune target database.
   *
   * Use cases: Graph data organization; S3 staging structure; Migration data management; Temporary storage organization
   *
   * AWS: DMS Neptune endpoint s3BucketFolder setting for S3 staging folder path configuration
   *
   * Validation: Must be valid S3 folder path if provided; enables organized staging of graph migration data
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-neptunesettings.html#cfn-dms-endpoint-neptunesettings-s3bucketfolder
   */
  readonly s3BucketFolder?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 bucket name for temporary storage of migrated graph data during DMS Neptune migration enabling staged data processing and bulk-loading. Defines the S3 bucket where DMS stores CSV files containing graph data before bulk-loading to Neptune target database.
   *
   * Use cases: Graph data staging; Neptune migration storage; Temporary CSV storage; Bulk-load data preparation
   *
   * AWS: DMS Neptune endpoint s3BucketName setting for S3 staging bucket configuration
   *
   * Validation: Must be valid S3 bucket name; required for Neptune endpoint configuration; bucket must exist and be accessible
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-neptunesettings.html#cfn-dms-endpoint-neptunesettings-s3bucketname
   */
  readonly s3BucketName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM service role ARN for DMS Neptune endpoint access enabling secure authentication and authorization for graph database operations. Defines the IAM role that DMS assumes to access Neptune target database with required permissions for bulk-loading and graph data operations.
   *
   * Use cases: Neptune access control; DMS service authentication; IAM role-based security; Graph database permissions
   *
   * AWS: DMS Neptune endpoint serviceAccessRoleArn setting for IAM role-based authentication
   *
   * Validation: Must be valid IAM role ARN if provided; role must have iam:PassRole permission and Neptune access policies
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-neptunesettings.html#cfn-dms-endpoint-neptunesettings-serviceaccessrolearn
   */
  readonly serviceAccessRoleArn?: string;
}
/**
 * Provides information that defines an OpenSearch endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For more information about the available settings, see [Extra connection attributes when using OpenSearch as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Elasticsearch.html#CHAP_Target.Elasticsearch.Configuration) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-elasticsearchsettings.html
 */
/**
 * Q-ENHANCED-INTERFACE
 * Elasticsearch settings configuration interface for DMS providing search engine migration and search data capabilities. Defines Elasticsearch-specific properties for Database Migration Service including search data migration, index configuration, and Elasticsearch integration for search engine migration workflows.
 *
 * Use cases: Search engine migration; Search data migration; Elasticsearch connectivity; Search index migration; Search data integration; DMS Elasticsearch integration
 *
 * AWS: AWS DMS Elasticsearch endpoint configuration with search engine migration and search data capabilities
 *
 * Validation: Configuration must be valid for DMS migration; properties must conform to AWS DMS and database-specific requirements
 */
export interface ElasticsearchSettingsProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional OpenSearch cluster endpoint URI for DMS target connectivity enabling search engine data migration and indexing. Defines the connection endpoint for OpenSearch cluster where DMS will migrate and index data from source databases for search and analytics capabilities.
   *
   * Use cases: Search engine migration; Data indexing; OpenSearch connectivity; Search data integration
   *
   * AWS: DMS Elasticsearch endpoint endpointUri setting for OpenSearch cluster connectivity
   *
   * Validation: Must be valid HTTPS URI if provided; DMS uses HTTPS by default for secure search engine connectivity
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-elasticsearchsettings.html#cfn-dms-endpoint-elasticsearchsettings-endpointuri
   */
  readonly endpointUri?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum retry duration in seconds for failed DMS API requests to OpenSearch cluster enabling resilient search data migration. Defines the maximum time DMS will retry failed API requests to the OpenSearch cluster for improved reliability and fault tolerance during search data migration.
   *
   * Use cases: Search migration resilience; API retry configuration; OpenSearch connectivity reliability; Migration fault tolerance
   *
   * AWS: DMS Elasticsearch endpoint errorRetryDuration setting for API retry timing configuration
   *
   * Validation: Must be positive integer in seconds if provided; controls maximum retry duration for failed OpenSearch API requests
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-elasticsearchsettings.html#cfn-dms-endpoint-elasticsearchsettings-errorretryduration
   */
  readonly errorRetryDuration?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum percentage of failed records before stopping full load operation enabling controlled search data migration quality. Defines the failure threshold for record writes to OpenSearch before DMS stops the full load operation to prevent data quality issues in search indexes.
   *
   * Use cases: Data quality control; Migration failure thresholds; Search index quality; Load operation control
   *
   * AWS: DMS Elasticsearch endpoint fullLoadErrorPercentage setting for data quality control
   *
   * Validation: Must be percentage value between 0-100 if provided; controls failure threshold for full load operations
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-elasticsearchsettings.html#cfn-dms-endpoint-elasticsearchsettings-fullloaderrorpercentage
   */
  readonly fullLoadErrorPercentage?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM service role ARN for DMS OpenSearch endpoint access enabling secure authentication and authorization for search engine operations. Defines the IAM role that DMS assumes to access OpenSearch cluster with required permissions for indexing and search operations.
   *
   * Use cases: OpenSearch access control; DMS service authentication; IAM role-based security; Search engine permissions
   *
   * AWS: DMS Elasticsearch endpoint serviceAccessRoleArn setting for IAM role-based authentication
   *
   * Validation: Must be valid IAM role ARN if provided; role must have iam:PassRole permission and OpenSearch access policies
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-elasticsearchsettings.html#cfn-dms-endpoint-elasticsearchsettings-serviceaccessrolearn
   */
  readonly serviceAccessRoleArn?: string;
}
/**
 * Provides information that defines a DocumentDB endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For more information about other available settings, see [Using extra connections attributes with Amazon DocumentDB as a source](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.DocumentDB.html#CHAP_Source.DocumentDB.ECAs) and [Using Amazon DocumentDB as a target for AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DocumentDB.html) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-docdbsettings.html
 */
/**
 * Q-ENHANCED-INTERFACE
 * DocumentDB settings configuration interface for DMS providing document database migration and MongoDB-compatible capabilities. Defines DocumentDB-specific properties for Database Migration Service including document migration, MongoDB compatibility, and DocumentDB integration for document database migration workflows.
 *
 * Use cases: Document database migration; MongoDB-compatible migration; DocumentDB connectivity; Document data migration; MongoDB compatibility; DMS DocumentDB integration
 *
 * AWS: AWS DMS DocumentDB endpoint configuration with document database migration and MongoDB-compatible capabilities
 *
 * Validation: Configuration must be valid for DMS migration; properties must conform to AWS DMS and database-specific requirements
 */
export interface DocDbSettingsProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of documents to preview for determining document organization and schema inference in DocumentDB migration. Defines the sample size for document analysis when nesting level is set to "one" for table mode migration, enabling proper schema detection and data mapping.
   *
   * Use cases: Document schema inference; Migration planning; Table mode configuration; Document organization analysis
   *
   * AWS: DMS DocumentDB endpoint docsToInvestigate setting for document sampling and schema analysis
   *
   * Validation: Must be positive integer greater than 0 if provided; default is 1000; used for document organization analysis
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-docdbsettings.html#cfn-dms-endpoint-docdbsettings-docstoinvestigate
   */
  readonly docsToInvestigate?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to extract document ID during DocumentDB migration enabling document identification and tracking. Specifies whether to extract the document ID when nesting level is set to "none" for document mode migration, enabling document-level tracking and identification.
   *
   * Use cases: Document identification; Document mode migration; Document tracking; ID extraction
   *
   * AWS: DMS DocumentDB endpoint extractDocId setting for document ID extraction configuration
   *
   * Validation: Must be boolean value if provided; default is false; used when nesting level is "none"
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-docdbsettings.html#cfn-dms-endpoint-docdbsettings-extractdocid
   */
  readonly extractDocId?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional nesting level specification for DocumentDB migration mode selection enabling document or table mode migration. Defines the migration approach with "none" for document mode preserving document structure or "one" for table mode flattening documents into relational format.
   *
   * Use cases: Migration mode selection; Document structure preservation; Table mode flattening; Migration strategy configuration
   *
   * AWS: DMS DocumentDB endpoint nestingLevel setting for migration mode configuration
   *
   * Validation: Must be "none" or "one" if provided; default is "none"; determines document vs table migration mode
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-docdbsettings.html#cfn-dms-endpoint-docdbsettings-nestinglevel
   */
  readonly nestingLevel?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role ARN for DMS to access Secrets Manager secret containing DocumentDB credentials enabling secure credential management. Defines the IAM role that DMS assumes to retrieve database credentials from Secrets Manager for DocumentDB endpoint connectivity with role-based security.
   *
   * Use cases: Secure credential access; IAM role-based security; Secrets Manager integration; DMS authentication
   *
   * AWS: DMS DocumentDB endpoint secretsManagerAccessRoleArn setting for IAM role-based credential access
   *
   * Validation: Must be valid IAM role ARN if provided; role must have iam:PassRole and Secrets Manager access permissions
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-docdbsettings.html#cfn-dms-endpoint-docdbsettings-secretsmanageraccessrolearn
   */
  readonly secretsManagerAccessRoleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Secrets Manager secret ARN containing DocumentDB endpoint connection details enabling secure credential storage for document database connectivity. Defines the AWS Secrets Manager secret that stores database connection credentials including username, password, and connection parameters for DocumentDB endpoint access.
   *
   * Use cases: Secure credential storage; DocumentDB connectivity; Database authentication; Secrets management
   *
   * AWS: DMS DocumentDB endpoint secretsManagerSecretId setting for Secrets Manager secret reference
   *
   * Validation: Must be valid Secrets Manager secret ARN; required; secret must contain valid DocumentDB connection credentials
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-docdbsettings.html#cfn-dms-endpoint-docdbsettings-secretsmanagersecretid
   */
  readonly secretsManagerSecretArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for encrypting Secrets Manager secret containing DocumentDB credentials enabling enhanced security for database connection details. Defines the KMS key used to encrypt the Secrets Manager secret that stores DocumentDB endpoint credentials for additional security layer.
   *
   * Use cases: Credential encryption; Enhanced security; KMS integration; Secrets Manager encryption
   *
   * AWS: DMS DocumentDB endpoint secretsManagerSecretKMSArn setting for KMS encryption of credentials
   *
   * Validation: Must be valid KMS key ARN if provided; enables encryption of Secrets Manager secret containing credentials
   */
  readonly secretsManagerSecretKMSArn?: string;
}
/**
 * Provides information, including the Amazon Resource Name (ARN) of the IAM role used to define an Amazon DynamoDB target endpoint.  Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information also includes the output format of records applied to the endpoint and details of transaction and control table data information. For information about other available settings, see [Using object mapping to migrate data to DynamoDB](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DynamoDB.html#CHAP_Target.DynamoDB.ObjectMapping) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-dynamodbsettings.html
 */
/**
 * Q-ENHANCED-INTERFACE
 * DynamoDB settings configuration interface for DMS providing NoSQL database migration and serverless database capabilities. Defines DynamoDB-specific properties for Database Migration Service including NoSQL migration, serverless database connectivity, and DynamoDB integration for serverless database migration workflows.
 *
 * Use cases: NoSQL database migration; Serverless database migration; DynamoDB connectivity; NoSQL data migration; Serverless data integration; DMS DynamoDB integration
 *
 * AWS: AWS DMS DynamoDB endpoint configuration with NoSQL database migration and serverless database capabilities
 *
 * Validation: Configuration must be valid for DMS migration; properties must conform to AWS DMS and database-specific requirements
 */
export interface DynamoDbSettingsProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM service role ARN for DMS DynamoDB endpoint access enabling secure authentication and authorization for NoSQL database operations. Defines the IAM role that DMS assumes to access DynamoDB tables with required permissions for data migration and NoSQL operations.
   *
   * Use cases: DynamoDB access control; DMS service authentication; IAM role-based security; NoSQL database permissions
   *
   * AWS: DMS DynamoDB endpoint serviceAccessRoleArn setting for IAM role-based authentication
   *
   * Validation: Must be valid IAM role ARN if provided; role must have iam:PassRole permission and DynamoDB access policies
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-dynamodbsettings.html#cfn-dms-endpoint-dynamodbsettings-serviceaccessrolearn
   */
  readonly serviceAccessRoleArn?: string;
}
/**
 * Provides information that defines a Microsoft SQL Server endpoint. Modified from the equivalent L1 Construct to prevent use of plaintext credentials and enforce use of KMS encryption.
 * This information includes the output format of records applied to the endpoint and details of transaction and control table data information. For information about other available settings, see [Extra connection attributes when using SQL Server as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.SQLServer.html#CHAP_Source.SQLServer.ConnectionAttrib) and [Extra connection attributes when using SQL Server as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.SQLServer.html#CHAP_Target.SQLServer.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
 * @struct
 * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html
 */
/**
 * Q-ENHANCED-INTERFACE
 * Microsoft SQL Server settings configuration interface for DMS providing SQL Server migration and enterprise database capabilities. Defines SQL Server-specific properties for Database Migration Service including enterprise features, backup integration, and SQL Server migration for enterprise database migration workflows.
 *
 * Use cases: SQL Server migration; Enterprise database migration; SQL Server connectivity; Enterprise migration workflows; Database backup integration; DMS SQL Server integration
 *
 * AWS: AWS DMS Microsoft SQL Server endpoint configuration with enterprise database migration and SQL Server capabilities
 *
 * Validation: Configuration must be valid for DMS migration; properties must conform to AWS DMS and database-specific requirements
 */
export interface MicrosoftSqlServerSettingsProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional BCP packet size in bytes for SQL Server data transfer optimization enabling performance tuning for bulk data operations. Defines the maximum packet size used for Bulk Copy Program (BCP) operations during SQL Server data migration for optimal network utilization and transfer performance.
   *
   * Use cases: SQL Server performance tuning; Bulk data transfer optimization; Network utilization; Migration performance
   *
   * AWS: DMS Microsoft SQL Server endpoint bcpPacketSize setting for BCP transfer optimization
   *
   * Validation: Must be valid packet size in bytes if provided; affects BCP transfer performance and network utilization
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html#cfn-dms-endpoint-microsoftsqlserversettings-bcppacketsize
   */
  readonly bcpPacketSize?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional file group specification for DMS internal control tables enabling SQL Server storage organization and performance optimization. Defines the file group where DMS creates internal control tables (awsdms_apply_exception, awsdms_apply, awsdms_changes) for organized storage management and performance tuning.
   *
   * Use cases: SQL Server storage organization; Performance optimization; File group management; Control table organization
   *
   * AWS: DMS Microsoft SQL Server endpoint controlTablesFileGroup setting for internal table storage organization
   *
   * Validation: Must be valid SQL Server file group name if provided; affects DMS internal table storage location
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html#cfn-dms-endpoint-microsoftsqlserversettings-controltablesfilegroup
   */
  readonly controlTablesFileGroup?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional database name for SQL Server endpoint connectivity enabling specific database targeting within SQL Server instance. Defines the target database name within the SQL Server instance for focused migration operations and database-specific connectivity.
   *
   * Use cases: Database-specific migration; SQL Server database targeting; Multi-database instance management; Database connectivity
   *
   * AWS: DMS Microsoft SQL Server endpoint databaseName setting for specific database connectivity
   *
   * Validation: Must be valid SQL Server database name if provided; targets specific database within SQL Server instance
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html#cfn-dms-endpoint-microsoftsqlserversettings-databasename
   */
  readonly databaseName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to force LOB lookup on inline LOB data enabling large object handling in SQL Server migration. Forces DMS to perform LOB lookup operations on inline LOB data for complete large object migration and data integrity in SQL Server environments.
   *
   * Use cases: Large object migration; SQL Server LOB handling; Data integrity; Complete data migration
   *
   * AWS: DMS Microsoft SQL Server endpoint forceLobLookup setting for LOB data handling configuration
   *
   * Validation: Must be boolean value if provided; affects LOB data migration behavior and completeness
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html#cfn-dms-endpoint-microsoftsqlserversettings-forceloblookup
   */
  readonly forceLobLookup?: boolean;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional TCP port number for SQL Server endpoint connectivity enabling custom port configuration for database connections. Defines the network port for SQL Server database connectivity allowing for non-standard port configurations and network security requirements.
   *
   * Use cases: Custom port configuration; Network security; SQL Server connectivity; Port management
   *
   * AWS: DMS Microsoft SQL Server endpoint port setting for database connectivity configuration
   *
   * Validation: Must be valid TCP port number if provided; enables custom SQL Server port connectivity
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html#cfn-dms-endpoint-microsoftsqlserversettings-port
   */
  readonly port?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to query single Always On node in SQL Server Always On availability groups enabling optimized connectivity for high availability environments. Directs DMS to query only a single node in Always On availability groups for improved performance and reduced resource utilization in high availability SQL Server deployments.
   *
   * Use cases: Always On availability groups; High availability optimization; Performance tuning; Resource optimization
   *
   * AWS: DMS Microsoft SQL Server endpoint querySingleAlwaysOnNode setting for Always On optimization
   *
   * Validation: Must be boolean value if provided; optimizes connectivity for Always On availability groups
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html#cfn-dms-endpoint-microsoftsqlserversettings-querysinglealwaysonnode
   */
  readonly querySingleAlwaysOnNode?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to read changes only from transaction log backups enabling controlled transaction log management in SQL Server migration. When enabled, DMS reads changes only from transaction log backups rather than active transaction logs, providing better control over log file growth and replication latency.
   *
   * Use cases: Transaction log management; Log file growth control; Replication latency control; Backup-based replication
   *
   * AWS: DMS Microsoft SQL Server endpoint readBackupOnly setting for transaction log management
   *
   * Validation: Must be boolean value if provided; affects transaction log reading behavior and log file growth
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html#cfn-dms-endpoint-microsoftsqlserversettings-readbackuponly
   */
  readonly readBackupOnly?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional safeguard policy for transaction log truncation prevention enabling controlled log management in SQL Server replication. Defines the method for preventing transaction log truncation with options for transaction-based or sp_repldone-based approaches for optimal log management and replication coordination.
   *
   * Use cases: Transaction log truncation prevention; Log management; Replication coordination; Parallel task management
   *
   * AWS: DMS Microsoft SQL Server endpoint safeguardPolicy setting for transaction log management
   *
   * Validation: Must be valid safeguard policy value if provided; controls transaction log truncation prevention method
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html#cfn-dms-endpoint-microsoftsqlserversettings-safeguardpolicy
   */
  readonly safeguardPolicy?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role ARN for DMS to access Secrets Manager secret containing SQL Server credentials enabling secure credential management. Defines the IAM role that DMS assumes to retrieve database credentials from Secrets Manager for SQL Server endpoint connectivity with role-based security.
   *
   * Use cases: Secure credential access; IAM role-based security; Secrets Manager integration; DMS authentication
   *
   * AWS: DMS Microsoft SQL Server endpoint secretsManagerAccessRoleArn setting for IAM role-based credential access
   *
   * Validation: Must be valid IAM role ARN if provided; role must have iam:PassRole and Secrets Manager access permissions
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html#cfn-dms-endpoint-microsoftsqlserversettings-secretsmanageraccessrolearn
   */
  readonly secretsManagerAccessRoleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Secrets Manager secret ARN containing SQL Server endpoint connection details enabling secure credential storage for database connectivity. Defines the AWS Secrets Manager secret that stores database connection credentials including username, password, and connection parameters for SQL Server endpoint access.
   *
   * Use cases: Secure credential storage; SQL Server connectivity; Database authentication; Secrets management
   *
   * AWS: DMS Microsoft SQL Server endpoint secretsManagerSecretId setting for Secrets Manager secret reference
   *
   * Validation: Must be valid Secrets Manager secret ARN; required; secret must contain valid SQL Server connection credentials
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html#cfn-dms-endpoint-microsoftsqlserversettings-secretsmanagersecretid
   */
  readonly secretsManagerSecretArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for encrypting Secrets Manager secret containing SQL Server credentials enabling enhanced security for database connection details. Defines the KMS key used to encrypt the Secrets Manager secret that stores SQL Server endpoint credentials for additional security layer.
   *
   * Use cases: Credential encryption; Enhanced security; KMS integration; Secrets Manager encryption
   *
   * AWS: DMS Microsoft SQL Server endpoint secretsManagerSecretKMSArn setting for KMS encryption of credentials
   *
   * Validation: Must be valid KMS key ARN if provided; enables encryption of Secrets Manager secret containing credentials
   */
  readonly secretsManagerSecretKMSArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional fully qualified domain name for SQL Server endpoint connectivity enabling precise server identification and network routing. Defines the complete server name including domain for SQL Server database connectivity, typically from RDS DescribeDBInstances endpoint address for managed instances.
   *
   * Use cases: Server identification; Network routing; SQL Server connectivity; RDS integration
   *
   * AWS: DMS Microsoft SQL Server endpoint serverName setting for database server identification
   *
   * Validation: Must be valid FQDN if provided; enables precise SQL Server server identification and connectivity
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html#cfn-dms-endpoint-microsoftsqlserversettings-servername
   */
  readonly serverName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional transaction log access mode for CDC data fetching enabling optimized change data capture in SQL Server migration. Defines the method for accessing transaction log data for change data capture operations, affecting CDC performance and resource utilization in SQL Server replication.
   *
   * Use cases: CDC optimization; Transaction log access; Change data capture; Replication performance
   *
   * AWS: DMS Microsoft SQL Server endpoint tlogAccessMode setting for CDC data access configuration
   *
   * Validation: Must be valid transaction log access mode if provided; affects CDC data fetching behavior and performance
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html#cfn-dms-endpoint-microsoftsqlserversettings-tlogaccessmode
   */
  readonly tlogAccessMode?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to right-trim spaces in CHAR and NCHAR data types during SQL Server migration enabling data formatting consistency. Controls whether DMS removes trailing spaces from CHAR and NCHAR columns during migration for consistent data formatting and storage optimization.
   *
   * Use cases: Data formatting consistency; Space trimming; Character data optimization; Migration data quality
   *
   * AWS: DMS Microsoft SQL Server endpoint trimSpaceInChar setting for character data formatting
   *
   * Validation: Must be boolean value if provided; default is true; affects character data formatting during migration
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html#cfn-dms-endpoint-microsoftsqlserversettings-trimspaceinchar
   */
  readonly trimSpaceInChar?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag to use BCP for full-load operations enabling optimized bulk data transfer in SQL Server migration. Controls whether DMS uses Bulk Copy Program (BCP) for full-load operations, providing high-performance data transfer but requiring consideration of identity columns and table structure compatibility.
   *
   * Use cases: Bulk data transfer optimization; Full-load performance; SQL Server migration optimization; High-volume data transfer
   *
   * AWS: DMS Microsoft SQL Server endpoint useBcpFullLoad setting for bulk copy optimization
   *
   * Validation: Must be boolean value if provided; affects full-load performance and identity column handling
   * See: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-dms-endpoint-microsoftsqlserversettings.html#cfn-dms-endpoint-microsoftsqlserversettings-usebcpfullload
   */

  readonly useBcpFullLoad?: boolean;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional boolean flag to enable processing of third-party transaction log backups for SQL Server DMS migration enabling backup-based replication. Controls whether DMS will process third-party transaction log backups created in native format for SQL Server migration scenarios, providing flexibility for backup-based data migration strategies.
   *
   * Use cases: Third-party backup processing; Backup-based migration; Transaction log processing; SQL Server migration; Native backup integration
   *
   * AWS: AWS DMS SQL Server third-party backup device processing for backup-based migration and transaction log handling
   *
   * Validation: Must be boolean value if provided; optional for third-party backup processing control
   **/
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
/**
 * Q-ENHANCED-INTERFACE
 * PostgreSQL settings configuration interface for DMS providing PostgreSQL migration and open-source database capabilities. Defines PostgreSQL-specific properties for Database Migration Service including advanced PostgreSQL features, replication settings, and PostgreSQL integration for open-source database migration workflows.
 *
 * Use cases: PostgreSQL migration; Open-source database migration; PostgreSQL connectivity; Advanced PostgreSQL features; Database replication; DMS PostgreSQL integration
 *
 * AWS: AWS DMS PostgreSQL endpoint configuration with PostgreSQL migration and open-source database capabilities
 *
 * Validation: Configuration must be valid for DMS migration; properties must conform to AWS DMS and database-specific requirements
 */
export interface PostgreSqlSettingsProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional SQL script executed after connecting to PostgreSQL source for change data capture (CDC) optimization enabling performance tuning and constraint bypassing. Provides custom SQL commands that run immediately after DMS connects to the PostgreSQL database, commonly used to bypass foreign keys and triggers during bulk loading for improved migration performance.
   *
   * Use cases: CDC performance optimization; Constraint bypassing; Custom connection setup; Migration performance tuning; Bulk load optimization
   *
   * AWS: AWS DMS PostgreSQL after-connect script for CDC optimization and custom connection configuration
   *
   * Validation: Must be valid SQL script if provided; commonly used for session configuration; optional for connection customization
   **/
  readonly afterConnectScript?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Babelfish for Aurora PostgreSQL database name for DMS endpoint configuration enabling SQL Server compatibility layer access. Specifies the database name when using Babelfish for Aurora PostgreSQL, which provides SQL Server compatibility on top of PostgreSQL for cross-database migration scenarios.
   *
   * Use cases: Babelfish database access; SQL Server compatibility; Aurora PostgreSQL with Babelfish; Cross-database migration; SQL Server to PostgreSQL migration
   *
   * AWS: AWS DMS Babelfish for Aurora PostgreSQL database name for SQL Server compatibility layer access
   *
   * Validation: Must be valid database name if provided; used with Babelfish-enabled Aurora PostgreSQL; optional for Babelfish configuration
   **/
  readonly babelfishDatabaseName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional boolean flag to enable DDL event capture for PostgreSQL DMS migration enabling schema change tracking and replication. Controls whether DMS will capture DDL events by creating artifacts in the PostgreSQL database, allowing schema changes to be tracked and replicated during migration operations.
   *
   * Use cases: DDL event capture; Schema change tracking; DDL replication; Database schema migration; Change data capture
   *
   * AWS: AWS DMS PostgreSQL DDL capture for schema change tracking and DDL event replication
   *
   * Validation: Must be boolean value if provided; optional for DDL capture control
   **/
  readonly captureDdls?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional database mode specification for PostgreSQL-compatible endpoints requiring additional configuration enabling specialized endpoint handling. Defines the default behavior for handling PostgreSQL-compatible endpoints such as Babelfish endpoints that require specific configuration and compatibility settings.
   *
   * Use cases: PostgreSQL-compatible endpoint handling; Babelfish endpoint configuration; Specialized database modes; Endpoint compatibility; Database-specific settings
   *
   * AWS: AWS DMS PostgreSQL database mode for PostgreSQL-compatible endpoint handling and specialized configuration
   *
   * Validation: Must be valid database mode string if provided; optional for specialized endpoint configuration
   **/
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
  /**
   * Q-ENHANCED-PROPERTY
   * Optional boolean flag to enable WAL heartbeat feature for PostgreSQL DMS migration preventing storage full scenarios and maintaining replication slot health. Enables write-ahead log heartbeat that mimics dummy transactions to keep restart_lsn moving and prevent idle logical replication slots from holding old WAL logs.
   *
   * Use cases: WAL heartbeat management; Storage full prevention; Replication slot maintenance; Logical replication optimization; WAL log management
   *
   * AWS: AWS DMS PostgreSQL WAL heartbeat for replication slot maintenance and storage optimization
   *
   * Validation: Must be boolean value if provided; optional for WAL heartbeat control
   **/
  readonly heartbeatEnable?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional WAL heartbeat frequency in minutes for PostgreSQL DMS migration enabling configurable heartbeat timing and replication optimization. Defines how frequently the WAL heartbeat feature will execute dummy transactions to maintain replication slot health and prevent storage issues.
   *
   * Use cases: Heartbeat frequency control; Replication optimization; WAL management timing; Storage optimization; Performance tuning
   *
   * AWS: AWS DMS PostgreSQL WAL heartbeat frequency for configurable replication slot maintenance timing
   *
   * Validation: Must be positive number in minutes if provided; optional for heartbeat frequency control
   **/
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
  /**
   * Q-ENHANCED-PROPERTY
   * Optional database name specification for endpoint connectivity controlling target database selection and migration scope. Defines the specific database within the database server for migration operations and data transfer targeting.
   *
   * Use cases: Database targeting; Migration scope; Specific database selection; Data transfer control
   *
   * AWS: Database name for DMS endpoint connectivity and migration targeting
   *
   * Validation: Must be valid database name if provided; not applicable for MySQL endpoints
   **/
  readonly databaseName?: string;
  readonly endpointIdentifier: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required endpoint type specification controlling migration direction and data flow for source or target configuration. Defines whether the endpoint serves as a data source or target destination for migration operations and data transfer direction.
   *
   * Use cases: Migration direction; Data flow control; Source/target specification; Migration architecture
   *
   * AWS: DMS endpoint type for migration direction and data flow configuration
   *
   * Validation: Must be 'source' or 'target'; required for endpoint role and migration direction specification
   *   **/
  readonly endpointType: MdaaEndpointType;
  /**
   * Q-ENHANCED-PROPERTY
   * Required database engine specification controlling database type and connectivity protocols for endpoint configuration. Defines the specific database engine type for appropriate connectivity, protocol selection, and database-specific optimization.
   *
   * Use cases: Database engine specification; Connectivity protocols; Engine-specific optimization; Database compatibility
   *
   * AWS: DMS endpoint engine name for database type specification and connectivity configuration
   *
   * Validation: Must be valid engine name (mysql, oracle, postgres, etc.); required for database connectivity
   *   **/
  readonly engineName: MdaaEndpointEngine;
  readonly extraConnectionAttributes?: string;
  readonly kmsKey: IKey;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional database port specification for endpoint connectivity controlling network connection parameters and database access. Defines the network port for database connectivity enabling proper network routing and database server access.
   *
   * Use cases: Network connectivity; Port specification; Database access; Network routing
   *
   * AWS: Database port for DMS endpoint network connectivity and database server access
   *
   * Validation: Must be valid port number if provided; enables proper network connectivity to database server
   **/
  readonly port?: number;
  readonly resourceIdentifier?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional server name specification for database server connectivity enabling network-based database access and server identification. Defines the hostname or IP address of the database server for network connectivity and database access.
   *
   * Use cases: Server connectivity; Network access; Database server identification; Hostname specification
   *
   * AWS: Database server name for DMS endpoint network connectivity and server access
   *
   * Validation: Must be valid hostname or IP address if provided; enables network connectivity to database server
   **/
  readonly serverName?: string;
  readonly sslMode?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional DocumentDB settings for DocumentDB endpoint configuration enabling NoSQL document database connectivity and optimization. Provides DocumentDB-specific configuration for document database migration and connectivity optimization.
   *
   * Use cases: DocumentDB connectivity; NoSQL migration; Document database optimization; MongoDB compatibility
   *
   * AWS: DocumentDB settings for DMS endpoint NoSQL document database connectivity and optimization
   *
   * Validation: Must be valid DocDbSettingsProperty if provided; enables DocumentDB-specific connectivity
   *   **/
  readonly docDbSettings?: DocDbSettingsProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional DynamoDB settings for DynamoDB endpoint configuration enabling NoSQL key-value database connectivity and object mapping. Provides DynamoDB-specific configuration for NoSQL migration and object mapping optimization.
   *
   * Use cases: DynamoDB connectivity; NoSQL migration; Object mapping; Key-value database optimization
   *
   * AWS: DynamoDB settings for DMS endpoint NoSQL key-value database connectivity and object mapping
   *
   * Validation: Must be valid DynamoDbSettingsProperty if provided; enables DynamoDB-specific connectivity
   *   **/
  readonly dynamoDbSettings?: DynamoDbSettingsProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Elasticsearch settings for OpenSearch endpoint configuration enabling search engine connectivity and document indexing. Provides OpenSearch/Elasticsearch-specific configuration for search engine migration and document indexing optimization.
   *
   * Use cases: Search engine connectivity; Document indexing; OpenSearch migration; Search optimization
   *
   * AWS: OpenSearch/Elasticsearch settings for DMS endpoint search engine connectivity and indexing
   *
   * Validation: Must be valid ElasticsearchSettingsProperty if provided; enables search engine connectivity
   *   **/
  readonly elasticsearchSettings?: ElasticsearchSettingsProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IBM Db2 settings for Db2 LUW endpoint configuration enabling mainframe database connectivity and optimization. Provides IBM Db2-specific configuration for mainframe database migration and connectivity optimization.
   *
   * Use cases: IBM Db2 connectivity; Mainframe migration; Enterprise database optimization; Legacy system integration
   *
   * AWS: IBM Db2 settings for DMS endpoint mainframe database connectivity and optimization
   *
   * Validation: Must be valid IbmDb2SettingsProperty if provided; enables IBM Db2-specific connectivity
   *   **/
  readonly ibmDb2Settings?: IbmDb2SettingsProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Kinesis settings for Kinesis Data Streams endpoint configuration enabling real-time streaming and object mapping. Provides Kinesis-specific configuration for real-time data streaming and object mapping optimization.
   *
   * Use cases: Real-time streaming; Data streams; Object mapping; Stream processing
   *
   * AWS: Kinesis Data Streams settings for DMS endpoint real-time streaming and object mapping
   *
   * Validation: Must be valid KinesisSettingsProperty if provided; enables Kinesis streaming connectivity
   *   **/
  readonly kinesisSettings?: KinesisSettingsProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Microsoft SQL Server settings for SQL Server endpoint configuration enabling enterprise database connectivity and optimization. Provides SQL Server-specific configuration for enterprise database migration and connectivity optimization.
   *
   * Use cases: SQL Server connectivity; Enterprise migration; Windows database optimization; Microsoft ecosystem integration
   *
   * AWS: Microsoft SQL Server settings for DMS endpoint enterprise database connectivity and optimization
   *
   * Validation: Must be valid MicrosoftSqlServerSettingsProperty if provided; enables SQL Server connectivity
   *   **/
  readonly microsoftSqlServerSettings?: MicrosoftSqlServerSettingsProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional MongoDB settings for MongoDB endpoint configuration enabling NoSQL document database connectivity and optimization. Provides MongoDB-specific configuration for document database migration and connectivity optimization.
   *
   * Use cases: MongoDB connectivity; Document database migration; NoSQL optimization; Document store integration
   *
   * AWS: MongoDB settings for DMS endpoint NoSQL document database connectivity and optimization
   *
   * Validation: Must be valid MongoDbSettingsProperty if provided; enables MongoDB-specific connectivity
   *   **/
  readonly mongoDbSettings?: MongoDbSettingsProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional MySQL settings for MySQL endpoint configuration enabling relational database connectivity and optimization. Provides MySQL-specific configuration for relational database migration and connectivity optimization.
   *
   * Use cases: MySQL connectivity; Relational migration; Open-source database optimization; Web application integration
   *
   * AWS: MySQL settings for DMS endpoint relational database connectivity and optimization
   *
   * Validation: Must be valid MySqlSettingsProperty if provided; enables MySQL-specific connectivity
   *   **/
  readonly mySqlSettings?: MySqlSettingsProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Neptune settings for Neptune endpoint configuration enabling graph database connectivity and optimization. Provides Neptune-specific configuration for graph database migration and connectivity optimization.
   *
   * Use cases: Graph database connectivity; Neptune migration; Graph data optimization; Relationship data processing
   *
   * AWS: Amazon Neptune settings for DMS endpoint graph database connectivity and optimization
   *
   * Validation: Must be valid NeptuneSettingsProperty if provided; enables Neptune-specific connectivity
   *   **/
  readonly neptuneSettings?: NeptuneSettingsProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Oracle settings for Oracle endpoint configuration enabling enterprise database connectivity and optimization. Provides Oracle-specific configuration for enterprise database migration and connectivity optimization.
   *
   * Use cases: Oracle connectivity; Enterprise migration; Commercial database optimization; Oracle ecosystem integration
   *
   * AWS: Oracle Database settings for DMS endpoint enterprise database connectivity and optimization
   *
   * Validation: Must be valid OracleSettingsProperty if provided; enables Oracle-specific connectivity
   *   **/
  readonly oracleSettings?: OracleSettingsProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional PostgreSQL settings for PostgreSQL endpoint configuration enabling open-source relational database connectivity and optimization. Provides PostgreSQL-specific configuration for relational database migration and connectivity optimization.
   *
   * Use cases: PostgreSQL connectivity; Open-source migration; Advanced relational features; Enterprise-grade database
   *
   * AWS: PostgreSQL settings for DMS endpoint relational database connectivity and optimization
   *
   * Validation: Must be valid PostgreSqlSettingsProperty if provided; enables PostgreSQL-specific connectivity
   *   **/
  readonly postgreSqlSettings?: PostgreSqlSettingsProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Redshift settings for Redshift endpoint configuration enabling data warehouse connectivity and optimization. Provides Redshift-specific configuration for data warehouse migration and analytics optimization.
   *
   * Use cases: Data warehouse connectivity; Analytics migration; Redshift optimization; Business intelligence integration
   *
   * AWS: Amazon Redshift settings for DMS endpoint data warehouse connectivity and analytics optimization
   *
   * Validation: Must be valid RedshiftSettingsProperty if provided; enables Redshift-specific connectivity
   *   **/
  readonly redshiftSettings?: RedshiftSettingsProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 settings for S3 endpoint configuration enabling object storage connectivity and file-based data transfer. Provides S3-specific configuration for object storage migration and file-based data transfer optimization.
   *
   * Use cases: Object storage connectivity; File-based migration; S3 optimization; Data lake integration
   *
   * AWS: Amazon S3 settings for DMS endpoint object storage connectivity and file-based data transfer
   *
   * Validation: Must be valid S3SettingsProperty if provided; enables S3-specific connectivity and file transfer
   *   **/
  readonly s3Settings?: S3SettingsProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Sybase settings for SAP ASE endpoint configuration enabling enterprise database connectivity and optimization. Provides Sybase/SAP ASE-specific configuration for enterprise database migration and connectivity optimization.
   *
   * Use cases: Sybase connectivity; SAP ASE migration; Enterprise database optimization; Legacy system integration
   *
   * AWS: Sybase/SAP ASE settings for DMS endpoint enterprise database connectivity and optimization
   *
   * Validation: Must be valid SybaseSettingsProperty if provided; enables Sybase/SAP ASE connectivity
   *   **/
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

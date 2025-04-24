# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                       | Title/Description                                                                                                                                    |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [deploymentRole](#deploymentRole )                                 | No      | string | No         | -                                                | -                                                                                                                                                    |
| + [dms](#dms )                                                       | No      | object | No         | In #/definitions/DMSProps                        | -                                                                                                                                                    |
| + [kmsArn](#kmsArn )                                                 | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                     |
| + [projectBucket](#projectBucket )                                   | No      | string | No         | -                                                | -                                                                                                                                                    |
| + [projectName](#projectName )                                       | No      | string | No         | -                                                | -                                                                                                                                                    |
| + [projectTopicArn](#projectTopicArn )                               | No      | string | No         | -                                                | -                                                                                                                                                    |
| + [securityConfigurationName](#securityConfigurationName )           | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |

## <a name="deploymentRole"></a>1. Property `root > deploymentRole`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="dms"></a>2. Property `root > dms`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DMSProps                                  |

| Property                                             | Pattern | Type   | Deprecated | Definition                                     | Title/Description |
| ---------------------------------------------------- | ------- | ------ | ---------- | ---------------------------------------------- | ----------------- |
| - [dmsRoleArn](#dms_dmsRoleArn )                     | No      | string | No         | -                                              | -                 |
| - [endpoints](#dms_endpoints )                       | No      | object | No         | In #/definitions/NamedEndpointProps            | -                 |
| - [replicationInstances](#dms_replicationInstances ) | No      | object | No         | In #/definitions/NamedReplicationInstanceProps | -                 |
| - [replicationTasks](#dms_replicationTasks )         | No      | object | No         | In #/definitions/NamedReplicationTaskProps     | -                 |

### <a name="dms_dmsRoleArn"></a>2.1. Property `root > dms > dmsRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="dms_endpoints"></a>2.2. Property `root > dms > endpoints`

|                           |                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                |
| **Required**              | No                                                                                                                      |
| **Additional properties** | [[Should-conform]](#dms_endpoints_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedEndpointProps                                                                                        |

| Property                                   | Pattern | Type   | Deprecated | Definition                     | Title/Description |
| ------------------------------------------ | ------- | ------ | ---------- | ------------------------------ | ----------------- |
| - [](#dms_endpoints_additionalProperties ) | No      | object | No         | In #/definitions/EndpointProps | -                 |

#### <a name="dms_endpoints_additionalProperties"></a>2.2.1. Property `root > dms > endpoints > EndpointProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/EndpointProps                             |

| Property                                                                                        | Pattern | Type             | Deprecated | Definition                                          | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [databaseName](#dms_endpoints_additionalProperties_databaseName )                             | No      | string           | No         | -                                                   | The optional name of the endpoint database. Required for certain endpoint types.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| - [docDbSettings](#dms_endpoints_additionalProperties_docDbSettings )                           | No      | object           | No         | In #/definitions/DocDbSettingsProperty              | Settings in JSON format for the source and target DocumentDB endpoint.<br /><br />For more information about other available settings, see [Using extra connections attributes with Amazon DocumentDB as a source](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.DocumentDB.html#CHAP_Source.DocumentDB.ECAs) and [Using Amazon DocumentDB as a target for AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DocumentDB.html) in the *AWS Database Migration Service User Guide* .                                                             |
| - [dynamoDbSettings](#dms_endpoints_additionalProperties_dynamoDbSettings )                     | No      | object           | No         | In #/definitions/DynamoDbSettingsProperty           | Settings in JSON format for the target Amazon DynamoDB endpoint.<br /><br />For information about other available settings, see [Using object mapping to migrate data to DynamoDB](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DynamoDB.html#CHAP_Target.DynamoDB.ObjectMapping) in the *AWS Database Migration Service User Guide* .                                                                                                                                                                                                                                                   |
| - [elasticsearchSettings](#dms_endpoints_additionalProperties_elasticsearchSettings )           | No      | object           | No         | In #/definitions/ElasticsearchSettingsProperty      | Settings in JSON format for the target OpenSearch endpoint.<br /><br />For more information about the available settings, see [Extra connection attributes when using OpenSearch as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Elasticsearch.html#CHAP_Target.Elasticsearch.Configuration) in the *AWS Database Migration Service User Guide* .                                                                                                                                                                                                                  |
| + [endpointType](#dms_endpoints_additionalProperties_endpointType )                             | No      | enum (of string) | No         | In #/definitions/MdaaEndpointType                   | The type of Endpoint ("source" or "target")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| + [engineName](#dms_endpoints_additionalProperties_engineName )                                 | No      | enum (of string) | No         | In #/definitions/MdaaEndpointEngine                 | The name of the endpoint engine                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| - [ibmDb2Settings](#dms_endpoints_additionalProperties_ibmDb2Settings )                         | No      | object           | No         | In #/definitions/IbmDb2SettingsProperty             | Settings in JSON format for the source IBM Db2 LUW endpoint.<br /><br />For information about other available settings, see [Extra connection attributes when using Db2 LUW as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.DB2.html#CHAP_Source.DB2.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .                                                                                                                                                                                                                                        |
| - [kinesisSettings](#dms_endpoints_additionalProperties_kinesisSettings )                       | No      | object           | No         | In #/definitions/KinesisSettingsProperty            | Settings in JSON format for the target endpoint for Amazon Kinesis Data Streams.<br /><br />For more information about other available settings, see [Using object mapping to migrate data to a Kinesis data stream](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Kinesis.html#CHAP_Target.Kinesis.ObjectMapping) in the *AWS Database Migration Service User Guide* .                                                                                                                                                                                                                   |
| - [microsoftSqlServerSettings](#dms_endpoints_additionalProperties_microsoftSqlServerSettings ) | No      | object           | No         | In #/definitions/MicrosoftSqlServerSettingsProperty | Settings in JSON format for the source and target Microsoft SQL Server endpoint.<br /><br />For information about other available settings, see [Extra connection attributes when using SQL Server as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.SQLServer.html#CHAP_Source.SQLServer.ConnectionAttrib) and [Extra connection attributes when using SQL Server as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.SQLServer.html#CHAP_Target.SQLServer.ConnectionAttrib) in the *AWS Database Migration Service User Guide* . |
| - [mongoDbSettings](#dms_endpoints_additionalProperties_mongoDbSettings )                       | No      | object           | No         | In #/definitions/MongoDbSettingsProperty            | Settings in JSON format for the source MongoDB endpoint.<br /><br />For more information about the available settings, see [Using MongoDB as a target for AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MongoDB.html#CHAP_Source.MongoDB.Configuration) in the *AWS Database Migration Service User Guide* .                                                                                                                                                                                                                                              |
| - [mySqlSettings](#dms_endpoints_additionalProperties_mySqlSettings )                           | No      | object           | No         | In #/definitions/MySqlSettingsProperty              | Settings in JSON format for the source and target MySQL endpoint.<br /><br />For information about other available settings, see [Extra connection attributes when using MySQL as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html#CHAP_Source.MySQL.ConnectionAttrib) and [Extra connection attributes when using a MySQL-compatible database as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.MySQL.html#CHAP_Target.MySQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .                    |
| - [neptuneSettings](#dms_endpoints_additionalProperties_neptuneSettings )                       | No      | object           | No         | In #/definitions/NeptuneSettingsProperty            | Settings in JSON format for the target Amazon Neptune endpoint.<br /><br />For more information about the available settings, see [Specifying endpoint settings for Amazon Neptune as a target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Neptune.html#CHAP_Target.Neptune.EndpointSettings) in the *AWS Database Migration Service User Guide* .                                                                                                                                                                                                                                     |
| - [oracleSettings](#dms_endpoints_additionalProperties_oracleSettings )                         | No      | object           | No         | In #/definitions/OracleSettingsProperty             | Settings in JSON format for the source and target Oracle endpoint.<br /><br />For information about other available settings, see [Extra connection attributes when using Oracle as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html#CHAP_Source.Oracle.ConnectionAttrib) and [Extra connection attributes when using Oracle as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Oracle.html#CHAP_Target.Oracle.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .                                   |
| - [postgreSqlSettings](#dms_endpoints_additionalProperties_postgreSqlSettings )                 | No      | object           | No         | In #/definitions/PostgreSqlSettingsProperty         | Settings in JSON format for the source and target PostgreSQL endpoint.<br /><br />For information about other available settings, see [Extra connection attributes when using PostgreSQL as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html#CHAP_Source.PostgreSQL.ConnectionAttrib) and [Extra connection attributes when using PostgreSQL as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.PostgreSQL.html#CHAP_Target.PostgreSQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .       |
| - [redshiftSettings](#dms_endpoints_additionalProperties_redshiftSettings )                     | No      | object           | No         | In #/definitions/RedshiftSettingsProperty           | Settings in JSON format for the Amazon Redshift endpoint.<br /><br />For more information about other available settings, see [Extra connection attributes when using Amazon Redshift as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Redshift.html#CHAP_Target.Redshift.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .                                                                                                                                                                                                                    |
| - [s3Settings](#dms_endpoints_additionalProperties_s3Settings )                                 | No      | object           | No         | In #/definitions/S3SettingsProperty                 | Settings in JSON format for the source and target Amazon S3 endpoint.<br /><br />For more information about other available settings, see [Extra connection attributes when using Amazon S3 as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.S3.html#CHAP_Source.S3.Configuring) and [Extra connection attributes when using Amazon S3 as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.Configuring) in the *AWS Database Migration Service User Guide* .                                               |
| - [sybaseSettings](#dms_endpoints_additionalProperties_sybaseSettings )                         | No      | object           | No         | In #/definitions/SybaseSettingsProperty             | Settings in JSON format for the source and target SAP ASE endpoint.<br /><br />For information about other available settings, see [Extra connection attributes when using SAP ASE as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.SAP.html#CHAP_Source.SAP.ConnectionAttrib) and [Extra connection attributes when using SAP ASE as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.SAP.html#CHAP_Target.SAP.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .                                            |

##### <a name="dms_endpoints_additionalProperties_databaseName"></a>2.2.1.1. Property `root > dms > endpoints > additionalProperties > databaseName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The optional name of the endpoint database. Required for certain endpoint types.

##### <a name="dms_endpoints_additionalProperties_docDbSettings"></a>2.2.1.2. Property `root > dms > endpoints > additionalProperties > docDbSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DocDbSettingsProperty                     |

**Description:** Settings in JSON format for the source and target DocumentDB endpoint.

For more information about other available settings, see [Using extra connections attributes with Amazon DocumentDB as a source](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.DocumentDB.html#CHAP_Source.DocumentDB.ECAs) and [Using Amazon DocumentDB as a target for AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DocumentDB.html) in the *AWS Database Migration Service User Guide* .

| Property                                                                                                        | Pattern | Type    | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [docsToInvestigate](#dms_endpoints_additionalProperties_docDbSettings_docsToInvestigate )                     | No      | number  | No         | -          | Indicates the number of documents to preview to determine the document organization.<br /><br />Use this setting when \`NestingLevel\` is set to \`"one"\` .<br /><br />Must be a positive value greater than \`0\` . Default value is \`1000\` .                                                                                                                          |
| - [extractDocId](#dms_endpoints_additionalProperties_docDbSettings_extractDocId )                               | No      | boolean | No         | -          | Specifies the document ID. Use this setting when \`NestingLevel\` is set to \`"none"\` .<br /><br />Default value is \`"false"\` .                                                                                                                                                                                                                                         |
| - [nestingLevel](#dms_endpoints_additionalProperties_docDbSettings_nestingLevel )                               | No      | string  | No         | -          | Specifies either document or table mode.<br /><br />Default value is \`"none"\` . Specify \`"none"\` to use document mode. Specify \`"one"\` to use table mode.                                                                                                                                                                                                            |
| - [secretsManagerAccessRoleArn](#dms_endpoints_additionalProperties_docDbSettings_secretsManagerAccessRoleArn ) | No      | string  | No         | -          | The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in \`SecretsManagerSecret\` .<br /><br />The role must allow the \`iam:PassRole\` action. \`SecretsManagerSecret\` has the value of the AWS Secrets Manager secret that allows access to the DocumentDB endpoint. |
| + [secretsManagerSecretArn](#dms_endpoints_additionalProperties_docDbSettings_secretsManagerSecretArn )         | No      | string  | No         | -          | The full ARN of the \`SecretsManagerSecret\` that contains the DocumentDB endpoint connection details.                                                                                                                                                                                                                                                                     |
| - [secretsManagerSecretKMSArn](#dms_endpoints_additionalProperties_docDbSettings_secretsManagerSecretKMSArn )   | No      | string  | No         | -          | The ID of the KMS key used to encrypt the credentials secret.                                                                                                                                                                                                                                                                                                              |

###### <a name="dms_endpoints_additionalProperties_docDbSettings_docsToInvestigate"></a>2.2.1.2.1. Property `root > dms > endpoints > additionalProperties > docDbSettings > docsToInvestigate`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Indicates the number of documents to preview to determine the document organization.

Use this setting when `NestingLevel` is set to `"one"` .

Must be a positive value greater than `0` . Default value is `1000` .

###### <a name="dms_endpoints_additionalProperties_docDbSettings_extractDocId"></a>2.2.1.2.2. Property `root > dms > endpoints > additionalProperties > docDbSettings > extractDocId`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Specifies the document ID. Use this setting when `NestingLevel` is set to `"none"` .

Default value is `"false"` .

###### <a name="dms_endpoints_additionalProperties_docDbSettings_nestingLevel"></a>2.2.1.2.3. Property `root > dms > endpoints > additionalProperties > docDbSettings > nestingLevel`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies either document or table mode.

Default value is `"none"` . Specify `"none"` to use document mode. Specify `"one"` to use table mode.

###### <a name="dms_endpoints_additionalProperties_docDbSettings_secretsManagerAccessRoleArn"></a>2.2.1.2.4. Property `root > dms > endpoints > additionalProperties > docDbSettings > secretsManagerAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in `SecretsManagerSecret` .

The role must allow the `iam:PassRole` action. `SecretsManagerSecret` has the value of the AWS Secrets Manager secret that allows access to the DocumentDB endpoint.

###### <a name="dms_endpoints_additionalProperties_docDbSettings_secretsManagerSecretArn"></a>2.2.1.2.5. Property `root > dms > endpoints > additionalProperties > docDbSettings > secretsManagerSecretArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The full ARN of the `SecretsManagerSecret` that contains the DocumentDB endpoint connection details.

###### <a name="dms_endpoints_additionalProperties_docDbSettings_secretsManagerSecretKMSArn"></a>2.2.1.2.6. Property `root > dms > endpoints > additionalProperties > docDbSettings > secretsManagerSecretKMSArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The ID of the KMS key used to encrypt the credentials secret.

##### <a name="dms_endpoints_additionalProperties_dynamoDbSettings"></a>2.2.1.3. Property `root > dms > endpoints > additionalProperties > dynamoDbSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DynamoDbSettingsProperty                  |

**Description:** Settings in JSON format for the target Amazon DynamoDB endpoint.

For information about other available settings, see [Using object mapping to migrate data to DynamoDB](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DynamoDB.html#CHAP_Target.DynamoDB.ObjectMapping) in the *AWS Database Migration Service User Guide* .

| Property                                                                                             | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                      |
| ---------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| - [serviceAccessRoleArn](#dms_endpoints_additionalProperties_dynamoDbSettings_serviceAccessRoleArn ) | No      | string | No         | -          | The Amazon Resource Name (ARN) used by the service to access the IAM role.<br /><br />The role must allow the \`iam:PassRole\` action. |

###### <a name="dms_endpoints_additionalProperties_dynamoDbSettings_serviceAccessRoleArn"></a>2.2.1.3.1. Property `root > dms > endpoints > additionalProperties > dynamoDbSettings > serviceAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The Amazon Resource Name (ARN) used by the service to access the IAM role.

The role must allow the `iam:PassRole` action.

##### <a name="dms_endpoints_additionalProperties_elasticsearchSettings"></a>2.2.1.4. Property `root > dms > endpoints > additionalProperties > elasticsearchSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/ElasticsearchSettingsProperty             |

**Description:** Settings in JSON format for the target OpenSearch endpoint.

For more information about the available settings, see [Extra connection attributes when using OpenSearch as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Elasticsearch.html#CHAP_Target.Elasticsearch.Configuration) in the *AWS Database Migration Service User Guide* .

| Property                                                                                                        | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [endpointUri](#dms_endpoints_additionalProperties_elasticsearchSettings_endpointUri )                         | No      | string | No         | -          | The endpoint for the OpenSearch cluster.<br /><br />AWS DMS uses HTTPS if a transport protocol (either HTTP or HTTPS) isn't specified.                                                                                                                                                                                                                                                                   |
| - [errorRetryDuration](#dms_endpoints_additionalProperties_elasticsearchSettings_errorRetryDuration )           | No      | number | No         | -          | The maximum number of seconds for which DMS retries failed API requests to the OpenSearch cluster.                                                                                                                                                                                                                                                                                                       |
| - [fullLoadErrorPercentage](#dms_endpoints_additionalProperties_elasticsearchSettings_fullLoadErrorPercentage ) | No      | number | No         | -          | The maximum percentage of records that can fail to be written before a full load operation stops.<br /><br />To avoid early failure, this counter is only effective after 1,000 records are transferred. OpenSearch also has the concept of error monitoring during the last 10 minutes of an Observation Window. If transfer of all records fail in the last 10 minutes, the full load operation stops. |
| - [serviceAccessRoleArn](#dms_endpoints_additionalProperties_elasticsearchSettings_serviceAccessRoleArn )       | No      | string | No         | -          | The Amazon Resource Name (ARN) used by the service to access the IAM role.<br /><br />The role must allow the \`iam:PassRole\` action.                                                                                                                                                                                                                                                                   |

###### <a name="dms_endpoints_additionalProperties_elasticsearchSettings_endpointUri"></a>2.2.1.4.1. Property `root > dms > endpoints > additionalProperties > elasticsearchSettings > endpointUri`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The endpoint for the OpenSearch cluster.

AWS DMS uses HTTPS if a transport protocol (either HTTP or HTTPS) isn't specified.

###### <a name="dms_endpoints_additionalProperties_elasticsearchSettings_errorRetryDuration"></a>2.2.1.4.2. Property `root > dms > endpoints > additionalProperties > elasticsearchSettings > errorRetryDuration`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The maximum number of seconds for which DMS retries failed API requests to the OpenSearch cluster.

###### <a name="dms_endpoints_additionalProperties_elasticsearchSettings_fullLoadErrorPercentage"></a>2.2.1.4.3. Property `root > dms > endpoints > additionalProperties > elasticsearchSettings > fullLoadErrorPercentage`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The maximum percentage of records that can fail to be written before a full load operation stops.

To avoid early failure, this counter is only effective after 1,000 records are transferred. OpenSearch also has the concept of error monitoring during the last 10 minutes of an Observation Window. If transfer of all records fail in the last 10 minutes, the full load operation stops.

###### <a name="dms_endpoints_additionalProperties_elasticsearchSettings_serviceAccessRoleArn"></a>2.2.1.4.4. Property `root > dms > endpoints > additionalProperties > elasticsearchSettings > serviceAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The Amazon Resource Name (ARN) used by the service to access the IAM role.

The role must allow the `iam:PassRole` action.

##### <a name="dms_endpoints_additionalProperties_endpointType"></a>2.2.1.5. Property `root > dms > endpoints > additionalProperties > endpointType`

|                |                                |
| -------------- | ------------------------------ |
| **Type**       | `enum (of string)`             |
| **Required**   | Yes                            |
| **Defined in** | #/definitions/MdaaEndpointType |

**Description:** The type of Endpoint ("source" or "target")

Must be one of:
* "source"
* "target"

##### <a name="dms_endpoints_additionalProperties_engineName"></a>2.2.1.6. Property `root > dms > endpoints > additionalProperties > engineName`

|                |                                  |
| -------------- | -------------------------------- |
| **Type**       | `enum (of string)`               |
| **Required**   | Yes                              |
| **Defined in** | #/definitions/MdaaEndpointEngine |

**Description:** The name of the endpoint engine

Must be one of:
* "aurora"
* "aurora-postgresql"
* "azuredb"
* "db2"
* "docdb"
* "dynamodb"
* "elasticsearch"
* "kafka"
* "kinesis"
* "mariadb"
* "mongodb"
* "mysql"
* "neptune"
* "opensearch"
* "oracle"
* "postgres"
* "redshift"
* "redshift-serverless"
* "s3"
* "sqlserver"
* "sybase"

##### <a name="dms_endpoints_additionalProperties_ibmDb2Settings"></a>2.2.1.7. Property `root > dms > endpoints > additionalProperties > ibmDb2Settings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/IbmDb2SettingsProperty                    |

**Description:** Settings in JSON format for the source IBM Db2 LUW endpoint.

For information about other available settings, see [Extra connection attributes when using Db2 LUW as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.DB2.html#CHAP_Source.DB2.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .

| Property                                                                                                         | Pattern | Type    | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [currentLsn](#dms_endpoints_additionalProperties_ibmDb2Settings_currentLsn )                                   | No      | string  | No         | -          | For ongoing replication (CDC), use CurrentLSN to specify a log sequence number (LSN) where you want the replication to start.                                                                                                                                                                                                                                          |
| - [maxKBytesPerRead](#dms_endpoints_additionalProperties_ibmDb2Settings_maxKBytesPerRead )                       | No      | number  | No         | -          | Maximum number of bytes per read, as a NUMBER value.<br /><br />The default is 64 KB.                                                                                                                                                                                                                                                                                  |
| - [secretsManagerAccessRoleArn](#dms_endpoints_additionalProperties_ibmDb2Settings_secretsManagerAccessRoleArn ) | No      | string  | No         | -          | The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in \`SecretsManagerSecret\` .<br /><br />The role must allow the \`iam:PassRole\` action. \`SecretsManagerSecret\` has the value ofthe AWS Secrets Manager secret that allows access to the Db2 LUW endpoint. |
| + [secretsManagerSecretArn](#dms_endpoints_additionalProperties_ibmDb2Settings_secretsManagerSecretArn )         | No      | string  | No         | -          | The full ARN of the \`SecretsManagerSecret\` that contains the IBMDB2 endpoint connection details.                                                                                                                                                                                                                                                                     |
| - [secretsManagerSecretKMSArn](#dms_endpoints_additionalProperties_ibmDb2Settings_secretsManagerSecretKMSArn )   | No      | string  | No         | -          | The ID of the KMS key used to encrypt the credentials secret.                                                                                                                                                                                                                                                                                                          |
| - [setDataCaptureChanges](#dms_endpoints_additionalProperties_ibmDb2Settings_setDataCaptureChanges )             | No      | boolean | No         | -          | Enables ongoing replication (CDC) as a BOOLEAN value.<br /><br />The default is true.                                                                                                                                                                                                                                                                                  |

###### <a name="dms_endpoints_additionalProperties_ibmDb2Settings_currentLsn"></a>2.2.1.7.1. Property `root > dms > endpoints > additionalProperties > ibmDb2Settings > currentLsn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** For ongoing replication (CDC), use CurrentLSN to specify a log sequence number (LSN) where you want the replication to start.

###### <a name="dms_endpoints_additionalProperties_ibmDb2Settings_maxKBytesPerRead"></a>2.2.1.7.2. Property `root > dms > endpoints > additionalProperties > ibmDb2Settings > maxKBytesPerRead`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Maximum number of bytes per read, as a NUMBER value.

The default is 64 KB.

###### <a name="dms_endpoints_additionalProperties_ibmDb2Settings_secretsManagerAccessRoleArn"></a>2.2.1.7.3. Property `root > dms > endpoints > additionalProperties > ibmDb2Settings > secretsManagerAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in `SecretsManagerSecret` .

The role must allow the `iam:PassRole` action. `SecretsManagerSecret` has the value ofthe AWS Secrets Manager secret that allows access to the Db2 LUW endpoint.

###### <a name="dms_endpoints_additionalProperties_ibmDb2Settings_secretsManagerSecretArn"></a>2.2.1.7.4. Property `root > dms > endpoints > additionalProperties > ibmDb2Settings > secretsManagerSecretArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The full ARN of the `SecretsManagerSecret` that contains the IBMDB2 endpoint connection details.

###### <a name="dms_endpoints_additionalProperties_ibmDb2Settings_secretsManagerSecretKMSArn"></a>2.2.1.7.5. Property `root > dms > endpoints > additionalProperties > ibmDb2Settings > secretsManagerSecretKMSArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The ID of the KMS key used to encrypt the credentials secret.

###### <a name="dms_endpoints_additionalProperties_ibmDb2Settings_setDataCaptureChanges"></a>2.2.1.7.6. Property `root > dms > endpoints > additionalProperties > ibmDb2Settings > setDataCaptureChanges`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Enables ongoing replication (CDC) as a BOOLEAN value.

The default is true.

##### <a name="dms_endpoints_additionalProperties_kinesisSettings"></a>2.2.1.8. Property `root > dms > endpoints > additionalProperties > kinesisSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/KinesisSettingsProperty                   |

**Description:** Settings in JSON format for the target endpoint for Amazon Kinesis Data Streams.

For more information about other available settings, see [Using object mapping to migrate data to a Kinesis data stream](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Kinesis.html#CHAP_Target.Kinesis.ObjectMapping) in the *AWS Database Migration Service User Guide* .

| Property                                                                                                          | Pattern | Type    | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [includeControlDetails](#dms_endpoints_additionalProperties_kinesisSettings_includeControlDetails )             | No      | boolean | No         | -          | Shows detailed control information for table definition, column definition, and table and column changes in the Kinesis message output.<br /><br />The default is \`false\` .                                                                                                                                                                                                                                                                          |
| - [includeNullAndEmpty](#dms_endpoints_additionalProperties_kinesisSettings_includeNullAndEmpty )                 | No      | boolean | No         | -          | Include NULL and empty columns for records migrated to the endpoint.<br /><br />The default is \`false\` .                                                                                                                                                                                                                                                                                                                                             |
| - [includePartitionValue](#dms_endpoints_additionalProperties_kinesisSettings_includePartitionValue )             | No      | boolean | No         | -          | Shows the partition value within the Kinesis message output, unless the partition type is \`schema-table-type\` .<br /><br />The default is \`false\` .                                                                                                                                                                                                                                                                                                |
| - [includeTableAlterOperations](#dms_endpoints_additionalProperties_kinesisSettings_includeTableAlterOperations ) | No      | boolean | No         | -          | Includes any data definition language (DDL) operations that change the table in the control data, such as \`rename-table\` , \`drop-table\` , \`add-column\` , \`drop-column\` , and \`rename-column\` .<br /><br />The default is \`false\` .                                                                                                                                                                                                         |
| - [includeTransactionDetails](#dms_endpoints_additionalProperties_kinesisSettings_includeTransactionDetails )     | No      | boolean | No         | -          | Provides detailed transaction information from the source database.<br /><br />This information includes a commit timestamp, a log position, and values for \`transaction_id\` , previous \`transaction_id\` , and \`transaction_record_id\` (the record offset within a transaction). The default is \`false\` .                                                                                                                                      |
| - [messageFormat](#dms_endpoints_additionalProperties_kinesisSettings_messageFormat )                             | No      | string  | No         | -          | The output format for the records created on the endpoint.<br /><br />The message format is \`JSON\` (default) or \`JSON_UNFORMATTED\` (a single line with no tab).                                                                                                                                                                                                                                                                                    |
| - [noHexPrefix](#dms_endpoints_additionalProperties_kinesisSettings_noHexPrefix )                                 | No      | boolean | No         | -          | Set this optional parameter to \`true\` to avoid adding a '0x' prefix to raw data in hexadecimal format.<br /><br />For example, by default, AWS DMS adds a '0x' prefix to the LOB column type in hexadecimal format moving from an Oracle source to an Amazon Kinesis target. Use the \`NoHexPrefix\` endpoint setting to enable migration of RAW data type columns without adding the '0x' prefix.                                                   |
| - [partitionIncludeSchemaTable](#dms_endpoints_additionalProperties_kinesisSettings_partitionIncludeSchemaTable ) | No      | boolean | No         | -          | Prefixes schema and table names to partition values, when the partition type is \`primary-key-type\` .<br /><br />Doing this increases data distribution among Kinesis shards. For example, suppose that a SysBench schema has thousands of tables and each table has only limited range for a primary key. In this case, the same primary key is sent from thousands of tables to the same shard, which causes throttling. The default is \`false\` . |
| - [serviceAccessRoleArn](#dms_endpoints_additionalProperties_kinesisSettings_serviceAccessRoleArn )               | No      | string  | No         | -          | The Amazon Resource Name (ARN) for the IAM role that AWS DMS uses to write to the Kinesis data stream.<br /><br />The role must allow the \`iam:PassRole\` action.                                                                                                                                                                                                                                                                                     |
| + [streamArn](#dms_endpoints_additionalProperties_kinesisSettings_streamArn )                                     | No      | string  | No         | -          | The Amazon Resource Name (ARN) for the Amazon Kinesis Data Streams endpoint.                                                                                                                                                                                                                                                                                                                                                                           |

###### <a name="dms_endpoints_additionalProperties_kinesisSettings_includeControlDetails"></a>2.2.1.8.1. Property `root > dms > endpoints > additionalProperties > kinesisSettings > includeControlDetails`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Shows detailed control information for table definition, column definition, and table and column changes in the Kinesis message output.

The default is `false` .

###### <a name="dms_endpoints_additionalProperties_kinesisSettings_includeNullAndEmpty"></a>2.2.1.8.2. Property `root > dms > endpoints > additionalProperties > kinesisSettings > includeNullAndEmpty`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Include NULL and empty columns for records migrated to the endpoint.

The default is `false` .

###### <a name="dms_endpoints_additionalProperties_kinesisSettings_includePartitionValue"></a>2.2.1.8.3. Property `root > dms > endpoints > additionalProperties > kinesisSettings > includePartitionValue`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Shows the partition value within the Kinesis message output, unless the partition type is `schema-table-type` .

The default is `false` .

###### <a name="dms_endpoints_additionalProperties_kinesisSettings_includeTableAlterOperations"></a>2.2.1.8.4. Property `root > dms > endpoints > additionalProperties > kinesisSettings > includeTableAlterOperations`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Includes any data definition language (DDL) operations that change the table in the control data, such as `rename-table` , `drop-table` , `add-column` , `drop-column` , and `rename-column` .

The default is `false` .

###### <a name="dms_endpoints_additionalProperties_kinesisSettings_includeTransactionDetails"></a>2.2.1.8.5. Property `root > dms > endpoints > additionalProperties > kinesisSettings > includeTransactionDetails`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Provides detailed transaction information from the source database.

This information includes a commit timestamp, a log position, and values for `transaction_id` , previous `transaction_id` , and `transaction_record_id` (the record offset within a transaction). The default is `false` .

###### <a name="dms_endpoints_additionalProperties_kinesisSettings_messageFormat"></a>2.2.1.8.6. Property `root > dms > endpoints > additionalProperties > kinesisSettings > messageFormat`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The output format for the records created on the endpoint.

The message format is `JSON` (default) or `JSON_UNFORMATTED` (a single line with no tab).

###### <a name="dms_endpoints_additionalProperties_kinesisSettings_noHexPrefix"></a>2.2.1.8.7. Property `root > dms > endpoints > additionalProperties > kinesisSettings > noHexPrefix`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Set this optional parameter to `true` to avoid adding a '0x' prefix to raw data in hexadecimal format.

For example, by default, AWS DMS adds a '0x' prefix to the LOB column type in hexadecimal format moving from an Oracle source to an Amazon Kinesis target. Use the `NoHexPrefix` endpoint setting to enable migration of RAW data type columns without adding the '0x' prefix.

###### <a name="dms_endpoints_additionalProperties_kinesisSettings_partitionIncludeSchemaTable"></a>2.2.1.8.8. Property `root > dms > endpoints > additionalProperties > kinesisSettings > partitionIncludeSchemaTable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Prefixes schema and table names to partition values, when the partition type is `primary-key-type` .

Doing this increases data distribution among Kinesis shards. For example, suppose that a SysBench schema has thousands of tables and each table has only limited range for a primary key. In this case, the same primary key is sent from thousands of tables to the same shard, which causes throttling. The default is `false` .

###### <a name="dms_endpoints_additionalProperties_kinesisSettings_serviceAccessRoleArn"></a>2.2.1.8.9. Property `root > dms > endpoints > additionalProperties > kinesisSettings > serviceAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The Amazon Resource Name (ARN) for the IAM role that AWS DMS uses to write to the Kinesis data stream.

The role must allow the `iam:PassRole` action.

###### <a name="dms_endpoints_additionalProperties_kinesisSettings_streamArn"></a>2.2.1.8.10. Property `root > dms > endpoints > additionalProperties > kinesisSettings > streamArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The Amazon Resource Name (ARN) for the Amazon Kinesis Data Streams endpoint.

##### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings"></a>2.2.1.9. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MicrosoftSqlServerSettingsProperty        |

**Description:** Settings in JSON format for the source and target Microsoft SQL Server endpoint.

For information about other available settings, see [Extra connection attributes when using SQL Server as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.SQLServer.html#CHAP_Source.SQLServer.ConnectionAttrib) and [Extra connection attributes when using SQL Server as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.SQLServer.html#CHAP_Target.SQLServer.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .

| Property                                                                                                                     | Pattern | Type    | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [bcpPacketSize](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_bcpPacketSize )                             | No      | number  | No         | -          | The maximum size of the packets (in bytes) used to transfer data using BCP.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| - [controlTablesFileGroup](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_controlTablesFileGroup )           | No      | string  | No         | -          | Specifies a file group for the AWS DMS internal tables.<br /><br />When the replication task starts, all the internal AWS DMS control tables (awsdms_ apply_exception, awsdms_apply, awsdms_changes) are created for the specified file group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| - [databaseName](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_databaseName )                               | No      | string  | No         | -          | Database name for the endpoint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| - [forceLobLookup](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_forceLobLookup )                           | No      | boolean | No         | -          | Forces LOB lookup on inline LOB.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [port](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_port )                                               | No      | number  | No         | -          | Endpoint TCP port.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| - [querySingleAlwaysOnNode](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_querySingleAlwaysOnNode )         | No      | boolean | No         | -          | Cleans and recreates table metadata information on the replication instance when a mismatch occurs.<br /><br />An example is a situation where running an alter DDL statement on a table might result in different information about the table cached in the replication instance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| - [readBackupOnly](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_readBackupOnly )                           | No      | boolean | No         | -          | When this attribute is set to \`Y\` , AWS DMS only reads changes from transaction log backups and doesn't read from the active transaction log file during ongoing replication.<br /><br />Setting this parameter to \`Y\` enables you to control active transaction log file growth during full load and ongoing replication tasks. However, it can add some source latency to ongoing replication.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| - [safeguardPolicy](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_safeguardPolicy )                         | No      | string  | No         | -          | Use this attribute to minimize the need to access the backup log and enable AWS DMS to prevent truncation using one of the following two methods.<br /><br />*Start transactions in the database:* This is the default method. When this method is used, AWS DMS prevents TLOG truncation by mimicking a transaction in the database. As long as such a transaction is open, changes that appear after the transaction started aren't truncated. If you need Microsoft Replication to be enabled in your database, then you must choose this method.<br /><br />*Exclusively use sp_repldone within a single task* : When this method is used, AWS DMS reads the changes and then uses sp_repldone to mark the TLOG transactions as ready for truncation. Although this method doesn't involve any transactional activities, it can only be used when Microsoft Replication isn't running. Also, when using this method, only one AWS DMS task can access the database at any given time. Therefore, if you need to run parallel AWS DMS tasks against the same database, use the default method. |
| - [secretsManagerAccessRoleArn](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_secretsManagerAccessRoleArn ) | No      | string  | No         | -          | The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in \`SecretsManagerSecret\` .<br /><br />The role must allow the \`iam:PassRole\` action. \`SecretsManagerSecret\` has the value of the AWS Secrets Manager secret that allows access to the SQL Server endpoint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| + [secretsManagerSecretArn](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_secretsManagerSecretArn )         | No      | string  | No         | -          | The full ARN of the \`SecretsManagerSecret\` that contains the MicrosoftSQLServer endpoint connection details.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| - [secretsManagerSecretKMSArn](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_secretsManagerSecretKMSArn )   | No      | string  | No         | -          | The ID of the KMS key used to encrypt the credentials secret.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| - [serverName](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_serverName )                                   | No      | string  | No         | -          | Fully qualified domain name of the endpoint.<br /><br />For an Amazon RDS SQL Server instance, this is the output of [DescribeDBInstances](https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_DescribeDBInstances.html) , in the \`[Endpoint](https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_Endpoint.html) .Address\` field.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| - [tlogAccessMode](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_tlogAccessMode )                           | No      | string  | No         | -          | Indicates the mode used to fetch CDC data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| - [trimSpaceInChar](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_trimSpaceInChar )                         | No      | boolean | No         | -          | Use the \`TrimSpaceInChar\` source endpoint setting to right-trim data on CHAR and NCHAR data types during migration.<br /><br />Setting \`TrimSpaceInChar\` does not left-trim data. The default value is \`true\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| - [useBcpFullLoad](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_useBcpFullLoad )                           | No      | boolean | No         | -          | Use this to attribute to transfer data for full-load operations using BCP.<br /><br />When the target table contains an identity column that does not exist in the source table, you must disable the use BCP for loading table option.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| - [useThirdPartyBackupDevice](#dms_endpoints_additionalProperties_microsoftSqlServerSettings_useThirdPartyBackupDevice )     | No      | boolean | No         | -          | When this attribute is set to \`Y\` , DMS processes third-party transaction log backups if they are created in native format.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_bcpPacketSize"></a>2.2.1.9.1. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > bcpPacketSize`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The maximum size of the packets (in bytes) used to transfer data using BCP.

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_controlTablesFileGroup"></a>2.2.1.9.2. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > controlTablesFileGroup`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies a file group for the AWS DMS internal tables.

When the replication task starts, all the internal AWS DMS control tables (awsdms_ apply_exception, awsdms_apply, awsdms_changes) are created for the specified file group.

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_databaseName"></a>2.2.1.9.3. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > databaseName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Database name for the endpoint.

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_forceLobLookup"></a>2.2.1.9.4. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > forceLobLookup`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Forces LOB lookup on inline LOB.

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_port"></a>2.2.1.9.5. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Endpoint TCP port.

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_querySingleAlwaysOnNode"></a>2.2.1.9.6. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > querySingleAlwaysOnNode`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Cleans and recreates table metadata information on the replication instance when a mismatch occurs.

An example is a situation where running an alter DDL statement on a table might result in different information about the table cached in the replication instance.

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_readBackupOnly"></a>2.2.1.9.7. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > readBackupOnly`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** When this attribute is set to `Y` , AWS DMS only reads changes from transaction log backups and doesn't read from the active transaction log file during ongoing replication.

Setting this parameter to `Y` enables you to control active transaction log file growth during full load and ongoing replication tasks. However, it can add some source latency to ongoing replication.

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_safeguardPolicy"></a>2.2.1.9.8. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > safeguardPolicy`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Use this attribute to minimize the need to access the backup log and enable AWS DMS to prevent truncation using one of the following two methods.

*Start transactions in the database:* This is the default method. When this method is used, AWS DMS prevents TLOG truncation by mimicking a transaction in the database. As long as such a transaction is open, changes that appear after the transaction started aren't truncated. If you need Microsoft Replication to be enabled in your database, then you must choose this method.

*Exclusively use sp_repldone within a single task* : When this method is used, AWS DMS reads the changes and then uses sp_repldone to mark the TLOG transactions as ready for truncation. Although this method doesn't involve any transactional activities, it can only be used when Microsoft Replication isn't running. Also, when using this method, only one AWS DMS task can access the database at any given time. Therefore, if you need to run parallel AWS DMS tasks against the same database, use the default method.

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_secretsManagerAccessRoleArn"></a>2.2.1.9.9. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > secretsManagerAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in `SecretsManagerSecret` .

The role must allow the `iam:PassRole` action. `SecretsManagerSecret` has the value of the AWS Secrets Manager secret that allows access to the SQL Server endpoint.

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_secretsManagerSecretArn"></a>2.2.1.9.10. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > secretsManagerSecretArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The full ARN of the `SecretsManagerSecret` that contains the MicrosoftSQLServer endpoint connection details.

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_secretsManagerSecretKMSArn"></a>2.2.1.9.11. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > secretsManagerSecretKMSArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The ID of the KMS key used to encrypt the credentials secret.

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_serverName"></a>2.2.1.9.12. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > serverName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Fully qualified domain name of the endpoint.

For an Amazon RDS SQL Server instance, this is the output of [DescribeDBInstances](https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_DescribeDBInstances.html) , in the `[Endpoint](https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_Endpoint.html) .Address` field.

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_tlogAccessMode"></a>2.2.1.9.13. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > tlogAccessMode`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Indicates the mode used to fetch CDC data.

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_trimSpaceInChar"></a>2.2.1.9.14. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > trimSpaceInChar`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Use the `TrimSpaceInChar` source endpoint setting to right-trim data on CHAR and NCHAR data types during migration.

Setting `TrimSpaceInChar` does not left-trim data. The default value is `true` .

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_useBcpFullLoad"></a>2.2.1.9.15. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > useBcpFullLoad`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Use this to attribute to transfer data for full-load operations using BCP.

When the target table contains an identity column that does not exist in the source table, you must disable the use BCP for loading table option.

###### <a name="dms_endpoints_additionalProperties_microsoftSqlServerSettings_useThirdPartyBackupDevice"></a>2.2.1.9.16. Property `root > dms > endpoints > additionalProperties > microsoftSqlServerSettings > useThirdPartyBackupDevice`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** When this attribute is set to `Y` , DMS processes third-party transaction log backups if they are created in native format.

##### <a name="dms_endpoints_additionalProperties_mongoDbSettings"></a>2.2.1.10. Property `root > dms > endpoints > additionalProperties > mongoDbSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MongoDbSettingsProperty                   |

**Description:** Settings in JSON format for the source MongoDB endpoint.

For more information about the available settings, see [Using MongoDB as a target for AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MongoDB.html#CHAP_Source.MongoDB.Configuration) in the *AWS Database Migration Service User Guide* .

| Property                                                                                                          | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [authMechanism](#dms_endpoints_additionalProperties_mongoDbSettings_authMechanism )                             | No      | string | No         | -          | The authentication mechanism you use to access the MongoDB source endpoint.<br /><br />For the default value, in MongoDB version 2.x, \`"default"\` is \`"mongodb_cr"\` . For MongoDB version 3.x or later, \`"default"\` is \`"scram_sha_1"\` . This setting isn't used when \`AuthType\` is set to \`"no"\` .                                                         |
| - [authSource](#dms_endpoints_additionalProperties_mongoDbSettings_authSource )                                   | No      | string | No         | -          | The MongoDB database name. This setting isn't used when \`AuthType\` is set to \`"no"\` .<br /><br />The default is \`"admin"\` .                                                                                                                                                                                                                                       |
| - [authType](#dms_endpoints_additionalProperties_mongoDbSettings_authType )                                       | No      | string | No         | -          | The authentication type you use to access the MongoDB source endpoint.<br /><br />When set to \`"no"\` , user name and password parameters are not used and can be empty.                                                                                                                                                                                               |
| - [databaseName](#dms_endpoints_additionalProperties_mongoDbSettings_databaseName )                               | No      | string | No         | -          | The database name on the MongoDB source endpoint.                                                                                                                                                                                                                                                                                                                       |
| - [docsToInvestigate](#dms_endpoints_additionalProperties_mongoDbSettings_docsToInvestigate )                     | No      | string | No         | -          | Indicates the number of documents to preview to determine the document organization.<br /><br />Use this setting when \`NestingLevel\` is set to \`"one"\` .<br /><br />Must be a positive value greater than \`0\` . Default value is \`1000\` .                                                                                                                       |
| - [extractDocId](#dms_endpoints_additionalProperties_mongoDbSettings_extractDocId )                               | No      | string | No         | -          | Specifies the document ID. Use this setting when \`NestingLevel\` is set to \`"none"\` .<br /><br />Default value is \`"false"\` .                                                                                                                                                                                                                                      |
| - [nestingLevel](#dms_endpoints_additionalProperties_mongoDbSettings_nestingLevel )                               | No      | string | No         | -          | Specifies either document or table mode.<br /><br />Default value is \`"none"\` . Specify \`"none"\` to use document mode. Specify \`"one"\` to use table mode.                                                                                                                                                                                                         |
| - [port](#dms_endpoints_additionalProperties_mongoDbSettings_port )                                               | No      | number | No         | -          | The port value for the MongoDB source endpoint.                                                                                                                                                                                                                                                                                                                         |
| - [secretsManagerAccessRoleArn](#dms_endpoints_additionalProperties_mongoDbSettings_secretsManagerAccessRoleArn ) | No      | string | No         | -          | The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in \`SecretsManagerSecret\` .<br /><br />The role must allow the \`iam:PassRole\` action. \`SecretsManagerSecret\` has the value of the AWS Secrets Manager secret that allows access to the MongoDB endpoint. |
| + [secretsManagerSecretArn](#dms_endpoints_additionalProperties_mongoDbSettings_secretsManagerSecretArn )         | No      | string | No         | -          | The full ARN of the \`SecretsManagerSecret\` that contains the MongoDB endpoint connection details.                                                                                                                                                                                                                                                                     |
| - [secretsManagerSecretKMSArn](#dms_endpoints_additionalProperties_mongoDbSettings_secretsManagerSecretKMSArn )   | No      | string | No         | -          | The ID of the KMS key used to encrypt the credentials secret.                                                                                                                                                                                                                                                                                                           |
| - [serverName](#dms_endpoints_additionalProperties_mongoDbSettings_serverName )                                   | No      | string | No         | -          | The name of the server on the MongoDB source endpoint.                                                                                                                                                                                                                                                                                                                  |

###### <a name="dms_endpoints_additionalProperties_mongoDbSettings_authMechanism"></a>2.2.1.10.1. Property `root > dms > endpoints > additionalProperties > mongoDbSettings > authMechanism`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The authentication mechanism you use to access the MongoDB source endpoint.

For the default value, in MongoDB version 2.x, `"default"` is `"mongodb_cr"` . For MongoDB version 3.x or later, `"default"` is `"scram_sha_1"` . This setting isn't used when `AuthType` is set to `"no"` .

###### <a name="dms_endpoints_additionalProperties_mongoDbSettings_authSource"></a>2.2.1.10.2. Property `root > dms > endpoints > additionalProperties > mongoDbSettings > authSource`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The MongoDB database name. This setting isn't used when `AuthType` is set to `"no"` .

The default is `"admin"` .

###### <a name="dms_endpoints_additionalProperties_mongoDbSettings_authType"></a>2.2.1.10.3. Property `root > dms > endpoints > additionalProperties > mongoDbSettings > authType`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The authentication type you use to access the MongoDB source endpoint.

When set to `"no"` , user name and password parameters are not used and can be empty.

###### <a name="dms_endpoints_additionalProperties_mongoDbSettings_databaseName"></a>2.2.1.10.4. Property `root > dms > endpoints > additionalProperties > mongoDbSettings > databaseName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The database name on the MongoDB source endpoint.

###### <a name="dms_endpoints_additionalProperties_mongoDbSettings_docsToInvestigate"></a>2.2.1.10.5. Property `root > dms > endpoints > additionalProperties > mongoDbSettings > docsToInvestigate`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Indicates the number of documents to preview to determine the document organization.

Use this setting when `NestingLevel` is set to `"one"` .

Must be a positive value greater than `0` . Default value is `1000` .

###### <a name="dms_endpoints_additionalProperties_mongoDbSettings_extractDocId"></a>2.2.1.10.6. Property `root > dms > endpoints > additionalProperties > mongoDbSettings > extractDocId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies the document ID. Use this setting when `NestingLevel` is set to `"none"` .

Default value is `"false"` .

###### <a name="dms_endpoints_additionalProperties_mongoDbSettings_nestingLevel"></a>2.2.1.10.7. Property `root > dms > endpoints > additionalProperties > mongoDbSettings > nestingLevel`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies either document or table mode.

Default value is `"none"` . Specify `"none"` to use document mode. Specify `"one"` to use table mode.

###### <a name="dms_endpoints_additionalProperties_mongoDbSettings_port"></a>2.2.1.10.8. Property `root > dms > endpoints > additionalProperties > mongoDbSettings > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The port value for the MongoDB source endpoint.

###### <a name="dms_endpoints_additionalProperties_mongoDbSettings_secretsManagerAccessRoleArn"></a>2.2.1.10.9. Property `root > dms > endpoints > additionalProperties > mongoDbSettings > secretsManagerAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in `SecretsManagerSecret` .

The role must allow the `iam:PassRole` action. `SecretsManagerSecret` has the value of the AWS Secrets Manager secret that allows access to the MongoDB endpoint.

###### <a name="dms_endpoints_additionalProperties_mongoDbSettings_secretsManagerSecretArn"></a>2.2.1.10.10. Property `root > dms > endpoints > additionalProperties > mongoDbSettings > secretsManagerSecretArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The full ARN of the `SecretsManagerSecret` that contains the MongoDB endpoint connection details.

###### <a name="dms_endpoints_additionalProperties_mongoDbSettings_secretsManagerSecretKMSArn"></a>2.2.1.10.11. Property `root > dms > endpoints > additionalProperties > mongoDbSettings > secretsManagerSecretKMSArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The ID of the KMS key used to encrypt the credentials secret.

###### <a name="dms_endpoints_additionalProperties_mongoDbSettings_serverName"></a>2.2.1.10.12. Property `root > dms > endpoints > additionalProperties > mongoDbSettings > serverName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of the server on the MongoDB source endpoint.

##### <a name="dms_endpoints_additionalProperties_mySqlSettings"></a>2.2.1.11. Property `root > dms > endpoints > additionalProperties > mySqlSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MySqlSettingsProperty                     |

**Description:** Settings in JSON format for the source and target MySQL endpoint.

For information about other available settings, see [Extra connection attributes when using MySQL as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html#CHAP_Source.MySQL.ConnectionAttrib) and [Extra connection attributes when using a MySQL-compatible database as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.MySQL.html#CHAP_Target.MySQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .

| Property                                                                                                            | Pattern | Type    | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [afterConnectScript](#dms_endpoints_additionalProperties_mySqlSettings_afterConnectScript )                       | No      | string  | No         | -          | Specifies a script to run immediately after AWS DMS connects to the endpoint.<br /><br />The migration task continues running regardless if the SQL statement succeeds or fails.<br /><br />For this parameter, provide the code of the script itself, not the name of a file containing the script.                                                                                                          |
| - [cleanSourceMetadataOnMismatch](#dms_endpoints_additionalProperties_mySqlSettings_cleanSourceMetadataOnMismatch ) | No      | boolean | No         | -          | Cleans and recreates table metadata information on the replication instance when a mismatch occurs.<br /><br />For example, in a situation where running an alter DDL on the table could result in different information about the table cached in the replication instance.                                                                                                                                  |
| - [eventsPollInterval](#dms_endpoints_additionalProperties_mySqlSettings_eventsPollInterval )                       | No      | number  | No         | -          | Specifies how often to check the binary log for new changes/events when the database is idle.<br /><br />The default is five seconds.<br /><br />Example: \`eventsPollInterval=5;\`<br /><br />In the example, AWS DMS checks for changes in the binary logs every five seconds.                                                                                                                              |
| - [maxFileSize](#dms_endpoints_additionalProperties_mySqlSettings_maxFileSize )                                     | No      | number  | No         | -          | Specifies the maximum size (in KB) of any .csv file used to transfer data to a MySQL-compatible database.<br /><br />Example: \`maxFileSize=512\`                                                                                                                                                                                                                                                             |
| - [parallelLoadThreads](#dms_endpoints_additionalProperties_mySqlSettings_parallelLoadThreads )                     | No      | number  | No         | -          | Improves performance when loading data into the MySQL-compatible target database.<br /><br />Specifies how many threads to use to load the data into the MySQL-compatible target database. Setting a large number of threads can have an adverse effect on database performance, because a separate connection is required for each thread. The default is one.<br /><br />Example: \`parallelLoadThreads=1\` |
| - [secretsManagerAccessRoleArn](#dms_endpoints_additionalProperties_mySqlSettings_secretsManagerAccessRoleArn )     | No      | string  | No         | -          | The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in \`SecretsManagerSecret\` .<br /><br />The role must allow the \`iam:PassRole\` action. \`SecretsManagerSecret\` has the value of the AWS Secrets Manager secret that allows access to the MySQL endpoint.                                         |
| + [secretsManagerSecretArn](#dms_endpoints_additionalProperties_mySqlSettings_secretsManagerSecretArn )             | No      | string  | No         | -          | The full ARN of the \`SecretsManagerSecret\` that contains the MySQL endpoint connection details.                                                                                                                                                                                                                                                                                                             |
| - [secretsManagerSecretKMSArn](#dms_endpoints_additionalProperties_mySqlSettings_secretsManagerSecretKMSArn )       | No      | string  | No         | -          | The ID of the KMS key used to encrypt the credentials secret.                                                                                                                                                                                                                                                                                                                                                 |
| - [serverTimezone](#dms_endpoints_additionalProperties_mySqlSettings_serverTimezone )                               | No      | string  | No         | -          | Specifies the time zone for the source MySQL database.<br /><br />Example: \`serverTimezone=US/Pacific;\`<br /><br />Note: Do not enclose time zones in single quotes.                                                                                                                                                                                                                                        |
| - [targetDbType](#dms_endpoints_additionalProperties_mySqlSettings_targetDbType )                                   | No      | string  | No         | -          | Specifies where to migrate source tables on the target, either to a single database or multiple databases.<br /><br />If you specify \`SPECIFIC_DATABASE\` , specify the database name using the \`DatabaseName\` parameter of the \`Endpoint\` object.<br /><br />Example: \`targetDbType=MULTIPLE_DATABASES\`                                                                                               |

###### <a name="dms_endpoints_additionalProperties_mySqlSettings_afterConnectScript"></a>2.2.1.11.1. Property `root > dms > endpoints > additionalProperties > mySqlSettings > afterConnectScript`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies a script to run immediately after AWS DMS connects to the endpoint.

The migration task continues running regardless if the SQL statement succeeds or fails.

For this parameter, provide the code of the script itself, not the name of a file containing the script.

###### <a name="dms_endpoints_additionalProperties_mySqlSettings_cleanSourceMetadataOnMismatch"></a>2.2.1.11.2. Property `root > dms > endpoints > additionalProperties > mySqlSettings > cleanSourceMetadataOnMismatch`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Cleans and recreates table metadata information on the replication instance when a mismatch occurs.

For example, in a situation where running an alter DDL on the table could result in different information about the table cached in the replication instance.

###### <a name="dms_endpoints_additionalProperties_mySqlSettings_eventsPollInterval"></a>2.2.1.11.3. Property `root > dms > endpoints > additionalProperties > mySqlSettings > eventsPollInterval`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Specifies how often to check the binary log for new changes/events when the database is idle.

The default is five seconds.

Example: `eventsPollInterval=5;`

In the example, AWS DMS checks for changes in the binary logs every five seconds.

###### <a name="dms_endpoints_additionalProperties_mySqlSettings_maxFileSize"></a>2.2.1.11.4. Property `root > dms > endpoints > additionalProperties > mySqlSettings > maxFileSize`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Specifies the maximum size (in KB) of any .csv file used to transfer data to a MySQL-compatible database.

Example: `maxFileSize=512`

###### <a name="dms_endpoints_additionalProperties_mySqlSettings_parallelLoadThreads"></a>2.2.1.11.5. Property `root > dms > endpoints > additionalProperties > mySqlSettings > parallelLoadThreads`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Improves performance when loading data into the MySQL-compatible target database.

Specifies how many threads to use to load the data into the MySQL-compatible target database. Setting a large number of threads can have an adverse effect on database performance, because a separate connection is required for each thread. The default is one.

Example: `parallelLoadThreads=1`

###### <a name="dms_endpoints_additionalProperties_mySqlSettings_secretsManagerAccessRoleArn"></a>2.2.1.11.6. Property `root > dms > endpoints > additionalProperties > mySqlSettings > secretsManagerAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in `SecretsManagerSecret` .

The role must allow the `iam:PassRole` action. `SecretsManagerSecret` has the value of the AWS Secrets Manager secret that allows access to the MySQL endpoint.

###### <a name="dms_endpoints_additionalProperties_mySqlSettings_secretsManagerSecretArn"></a>2.2.1.11.7. Property `root > dms > endpoints > additionalProperties > mySqlSettings > secretsManagerSecretArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The full ARN of the `SecretsManagerSecret` that contains the MySQL endpoint connection details.

###### <a name="dms_endpoints_additionalProperties_mySqlSettings_secretsManagerSecretKMSArn"></a>2.2.1.11.8. Property `root > dms > endpoints > additionalProperties > mySqlSettings > secretsManagerSecretKMSArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The ID of the KMS key used to encrypt the credentials secret.

###### <a name="dms_endpoints_additionalProperties_mySqlSettings_serverTimezone"></a>2.2.1.11.9. Property `root > dms > endpoints > additionalProperties > mySqlSettings > serverTimezone`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies the time zone for the source MySQL database.

Example: `serverTimezone=US/Pacific;`

Note: Do not enclose time zones in single quotes.

###### <a name="dms_endpoints_additionalProperties_mySqlSettings_targetDbType"></a>2.2.1.11.10. Property `root > dms > endpoints > additionalProperties > mySqlSettings > targetDbType`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies where to migrate source tables on the target, either to a single database or multiple databases.

If you specify `SPECIFIC_DATABASE` , specify the database name using the `DatabaseName` parameter of the `Endpoint` object.

Example: `targetDbType=MULTIPLE_DATABASES`

##### <a name="dms_endpoints_additionalProperties_neptuneSettings"></a>2.2.1.12. Property `root > dms > endpoints > additionalProperties > neptuneSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NeptuneSettingsProperty                   |

**Description:** Settings in JSON format for the target Amazon Neptune endpoint.

For more information about the available settings, see [Specifying endpoint settings for Amazon Neptune as a target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Neptune.html#CHAP_Target.Neptune.EndpointSettings) in the *AWS Database Migration Service User Guide* .

| Property                                                                                            | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [errorRetryDuration](#dms_endpoints_additionalProperties_neptuneSettings_errorRetryDuration )     | No      | number | No         | -          | The number of milliseconds for AWS DMS to wait to retry a bulk-load of migrated graph data to the Neptune target database before raising an error.<br /><br />The default is 250.                                                                                                                                                                                                                                                             |
| - [maxFileSize](#dms_endpoints_additionalProperties_neptuneSettings_maxFileSize )                   | No      | number | No         | -          | The maximum size in kilobytes of migrated graph data stored in a .csv file before AWS DMS bulk-loads the data to the Neptune target database. The default is 1,048,576 KB. If the bulk load is successful, AWS DMS clears the bucket, ready to store the next batch of migrated graph data.                                                                                                                                                   |
| - [maxRetryCount](#dms_endpoints_additionalProperties_neptuneSettings_maxRetryCount )               | No      | number | No         | -          | The number of times for AWS DMS to retry a bulk load of migrated graph data to the Neptune target database before raising an error.<br /><br />The default is 5.                                                                                                                                                                                                                                                                              |
| - [s3BucketFolder](#dms_endpoints_additionalProperties_neptuneSettings_s3BucketFolder )             | No      | string | No         | -          | A folder path where you want AWS DMS to store migrated graph data in the S3 bucket specified by \`S3BucketName\`.                                                                                                                                                                                                                                                                                                                             |
| + [s3BucketName](#dms_endpoints_additionalProperties_neptuneSettings_s3BucketName )                 | No      | string | No         | -          | The name of the Amazon S3 bucket where AWS DMS can temporarily store migrated graph data in .csv files before bulk-loading it to the Neptune target database. AWS DMS maps the SQL source data to graph data before storing it in these .csv files.                                                                                                                                                                                           |
| - [serviceAccessRoleArn](#dms_endpoints_additionalProperties_neptuneSettings_serviceAccessRoleArn ) | No      | string | No         | -          | The Amazon Resource Name (ARN) of the service role that you created for the Neptune target endpoint.<br /><br />The role must allow the \`iam:PassRole\` action.<br /><br />For more information, see [Creating an IAM Service Role for Accessing Amazon Neptune as a Target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Neptune.html#CHAP_Target.Neptune.ServiceRole) in the *AWS Database Migration Service User Guide* . |

###### <a name="dms_endpoints_additionalProperties_neptuneSettings_errorRetryDuration"></a>2.2.1.12.1. Property `root > dms > endpoints > additionalProperties > neptuneSettings > errorRetryDuration`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The number of milliseconds for AWS DMS to wait to retry a bulk-load of migrated graph data to the Neptune target database before raising an error.

The default is 250.

###### <a name="dms_endpoints_additionalProperties_neptuneSettings_maxFileSize"></a>2.2.1.12.2. Property `root > dms > endpoints > additionalProperties > neptuneSettings > maxFileSize`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The maximum size in kilobytes of migrated graph data stored in a .csv file before AWS DMS bulk-loads the data to the Neptune target database. The default is 1,048,576 KB. If the bulk load is successful, AWS DMS clears the bucket, ready to store the next batch of migrated graph data.

###### <a name="dms_endpoints_additionalProperties_neptuneSettings_maxRetryCount"></a>2.2.1.12.3. Property `root > dms > endpoints > additionalProperties > neptuneSettings > maxRetryCount`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The number of times for AWS DMS to retry a bulk load of migrated graph data to the Neptune target database before raising an error.

The default is 5.

###### <a name="dms_endpoints_additionalProperties_neptuneSettings_s3BucketFolder"></a>2.2.1.12.4. Property `root > dms > endpoints > additionalProperties > neptuneSettings > s3BucketFolder`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A folder path where you want AWS DMS to store migrated graph data in the S3 bucket specified by `S3BucketName`.

###### <a name="dms_endpoints_additionalProperties_neptuneSettings_s3BucketName"></a>2.2.1.12.5. Property `root > dms > endpoints > additionalProperties > neptuneSettings > s3BucketName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the Amazon S3 bucket where AWS DMS can temporarily store migrated graph data in .csv files before bulk-loading it to the Neptune target database. AWS DMS maps the SQL source data to graph data before storing it in these .csv files.

###### <a name="dms_endpoints_additionalProperties_neptuneSettings_serviceAccessRoleArn"></a>2.2.1.12.6. Property `root > dms > endpoints > additionalProperties > neptuneSettings > serviceAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The Amazon Resource Name (ARN) of the service role that you created for the Neptune target endpoint.

The role must allow the `iam:PassRole` action.

For more information, see [Creating an IAM Service Role for Accessing Amazon Neptune as a Target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Neptune.html#CHAP_Target.Neptune.ServiceRole) in the *AWS Database Migration Service User Guide* .

##### <a name="dms_endpoints_additionalProperties_oracleSettings"></a>2.2.1.13. Property `root > dms > endpoints > additionalProperties > oracleSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/OracleSettingsProperty                    |

**Description:** Settings in JSON format for the source and target Oracle endpoint.

For information about other available settings, see [Extra connection attributes when using Oracle as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html#CHAP_Source.Oracle.ConnectionAttrib) and [Extra connection attributes when using Oracle as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Oracle.html#CHAP_Target.Oracle.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .

| Property                                                                                                                               | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [accessAlternateDirectly](#dms_endpoints_additionalProperties_oracleSettings_accessAlternateDirectly )                               | No      | boolean         | No         | -          | Set this attribute to \`false\` in order to use the Binary Reader to capture change data for an Amazon RDS for Oracle as the source.<br /><br />This tells the DMS instance to not access redo logs through any specified path prefix replacement using direct file access.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| - [addSupplementalLogging](#dms_endpoints_additionalProperties_oracleSettings_addSupplementalLogging )                                 | No      | boolean         | No         | -          | Set this attribute to set up table-level supplemental logging for the Oracle database.<br /><br />This attribute enables PRIMARY KEY supplemental logging on all tables selected for a migration task.<br /><br />If you use this option, you still need to enable database-level supplemental logging.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| - [additionalArchivedLogDestId](#dms_endpoints_additionalProperties_oracleSettings_additionalArchivedLogDestId )                       | No      | number          | No         | -          | Set this attribute with \`ArchivedLogDestId\` in a primary/ standby setup.<br /><br />This attribute is useful in the case of a switchover. In this case, AWS DMS needs to know which destination to get archive redo logs from to read changes. This need arises because the previous primary instance is now a standby instance after switchover.<br /><br />Although AWS DMS supports the use of the Oracle \`RESETLOGS\` option to open the database, never use \`RESETLOGS\` unless necessary. For additional information about \`RESETLOGS\` , see [RMAN Data Repair Concepts](https://docs.aws.amazon.com/https://docs.oracle.com/en/database/oracle/oracle-database/19/bradv/rman-data-repair-concepts.html#GUID-1805CCF7-4AF2-482D-B65A-998192F89C2B) in the *Oracle Database Backup and Recovery User's Guide* .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| - [allowSelectNestedTables](#dms_endpoints_additionalProperties_oracleSettings_allowSelectNestedTables )                               | No      | boolean         | No         | -          | Set this attribute to \`true\` to enable replication of Oracle tables containing columns that are nested tables or defined types.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| - [archivedLogDestId](#dms_endpoints_additionalProperties_oracleSettings_archivedLogDestId )                                           | No      | number          | No         | -          | Specifies the ID of the destination for the archived redo logs.<br /><br />This value should be the same as a number in the dest_id column of the v$archived_log view. If you work with an additional redo log destination, use the \`AdditionalArchivedLogDestId\` option to specify the additional destination ID. Doing this improves performance by ensuring that the correct logs are accessed from the outset.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| - [archivedLogsOnly](#dms_endpoints_additionalProperties_oracleSettings_archivedLogsOnly )                                             | No      | boolean         | No         | -          | When this field is set to \`Y\` , AWS DMS only accesses the archived redo logs.<br /><br />If the archived redo logs are stored on Automatic Storage Management (ASM) only, the AWS DMS user account needs to be granted ASM privileges.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| - [asmServer](#dms_endpoints_additionalProperties_oracleSettings_asmServer )                                                           | No      | string          | No         | -          | For an Oracle source endpoint, your ASM server address.<br /><br />You can set this value from the \`asm_server\` value. You set \`asm_server\` as part of the extra connection attribute string to access an Oracle server with Binary Reader that uses ASM. For more information, see [Configuration for change data capture (CDC) on an Oracle source database](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html#dms/latest/userguide/CHAP_Source.Oracle.html#CHAP_Source.Oracle.CDC.Configuration) .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| - [charLengthSemantics](#dms_endpoints_additionalProperties_oracleSettings_charLengthSemantics )                                       | No      | string          | No         | -          | Specifies whether the length of a character column is in bytes or in characters.<br /><br />To indicate that the character column length is in characters, set this attribute to \`CHAR\` . Otherwise, the character column length is in bytes.<br /><br />Example: \`charLengthSemantics=CHAR;\`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| - [directPathNoLog](#dms_endpoints_additionalProperties_oracleSettings_directPathNoLog )                                               | No      | boolean         | No         | -          | When set to \`true\` , this attribute helps to increase the commit rate on the Oracle target database by writing directly to tables and not writing a trail to database logs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| - [directPathParallelLoad](#dms_endpoints_additionalProperties_oracleSettings_directPathParallelLoad )                                 | No      | boolean         | No         | -          | When set to \`true\` , this attribute specifies a parallel load when \`useDirectPathFullLoad\` is set to \`Y\` .<br /><br />This attribute also only applies when you use the AWS DMS parallel load feature. Note that the target table cannot have any constraints or indexes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| - [enableHomogenousTablespace](#dms_endpoints_additionalProperties_oracleSettings_enableHomogenousTablespace )                         | No      | boolean         | No         | -          | Set this attribute to enable homogenous tablespace replication and create existing tables or indexes under the same tablespace on the target.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| - [extraArchivedLogDestIds](#dms_endpoints_additionalProperties_oracleSettings_extraArchivedLogDestIds )                               | No      | array of number | No         | -          | Specifies the IDs of one more destinations for one or more archived redo logs.<br /><br />These IDs are the values of the \`dest_id\` column in the \`v$archived_log\` view. Use this setting with the \`archivedLogDestId\` extra connection attribute in a primary-to-single setup or a primary-to-multiple-standby setup.<br /><br />This setting is useful in a switchover when you use an Oracle Data Guard database as a source. In this case, AWS DMS needs information about what destination to get archive redo logs from to read changes. AWS DMS needs this because after the switchover the previous primary is a standby instance. For example, in a primary-to-single standby setup you might apply the following settings.<br /><br />\`archivedLogDestId=1; ExtraArchivedLogDestIds=[2]\`<br /><br />In a primary-to-multiple-standby setup, you might apply the following settings.<br /><br />\`archivedLogDestId=1; ExtraArchivedLogDestIds=[2,3,4]\`<br /><br />Although AWS DMS supports the use of the Oracle \`RESETLOGS\` option to open the database, never use \`RESETLOGS\` unless it's necessary. For more information about \`RESETLOGS\` , see [RMAN Data Repair Concepts](https://docs.aws.amazon.com/https://docs.oracle.com/en/database/oracle/oracle-database/19/bradv/rman-data-repair-concepts.html#GUID-1805CCF7-4AF2-482D-B65A-998192F89C2B) in the *Oracle Database Backup and Recovery User's Guide* . |
| - [failTasksOnLobTruncation](#dms_endpoints_additionalProperties_oracleSettings_failTasksOnLobTruncation )                             | No      | boolean         | No         | -          | When set to \`true\` , this attribute causes a task to fail if the actual size of an LOB column is greater than the specified \`LobMaxSize\` .<br /><br />If a task is set to limited LOB mode and this option is set to \`true\` , the task fails instead of truncating the LOB data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| - [numberDatatypeScale](#dms_endpoints_additionalProperties_oracleSettings_numberDatatypeScale )                                       | No      | number          | No         | -          | Specifies the number scale.<br /><br />You can select a scale up to 38, or you can select FLOAT. By default, the NUMBER data type is converted to precision 38, scale 10.<br /><br />Example: \`numberDataTypeScale=12\`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| - [oraclePathPrefix](#dms_endpoints_additionalProperties_oracleSettings_oraclePathPrefix )                                             | No      | string          | No         | -          | Set this string attribute to the required value in order to use the Binary Reader to capture change data for an Amazon RDS for Oracle as the source.<br /><br />This value specifies the default Oracle root used to access the redo logs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| - [parallelAsmReadThreads](#dms_endpoints_additionalProperties_oracleSettings_parallelAsmReadThreads )                                 | No      | number          | No         | -          | Set this attribute to change the number of threads that DMS configures to perform a change data capture (CDC) load using Oracle Automatic Storage Management (ASM).<br /><br />You can specify an integer value between 2 (the default) and 8 (the maximum). Use this attribute together with the \`readAheadBlocks\` attribute.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| - [readAheadBlocks](#dms_endpoints_additionalProperties_oracleSettings_readAheadBlocks )                                               | No      | number          | No         | -          | Set this attribute to change the number of read-ahead blocks that DMS configures to perform a change data capture (CDC) load using Oracle Automatic Storage Management (ASM).<br /><br />You can specify an integer value between 1000 (the default) and 200,000 (the maximum).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| - [readTableSpaceName](#dms_endpoints_additionalProperties_oracleSettings_readTableSpaceName )                                         | No      | boolean         | No         | -          | When set to \`true\` , this attribute supports tablespace replication.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| - [replacePathPrefix](#dms_endpoints_additionalProperties_oracleSettings_replacePathPrefix )                                           | No      | boolean         | No         | -          | Set this attribute to true in order to use the Binary Reader to capture change data for an Amazon RDS for Oracle as the source.<br /><br />This setting tells DMS instance to replace the default Oracle root with the specified \`usePathPrefix\` setting to access the redo logs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| - [retryInterval](#dms_endpoints_additionalProperties_oracleSettings_retryInterval )                                                   | No      | number          | No         | -          | Specifies the number of seconds that the system waits before resending a query.<br /><br />Example: \`retryInterval=6;\`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| - [secretsManagerAccessRoleArn](#dms_endpoints_additionalProperties_oracleSettings_secretsManagerAccessRoleArn )                       | No      | string          | No         | -          | The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in \`SecretsManagerSecret\` .<br /><br />The role must allow the \`iam:PassRole\` action. \`SecretsManagerSecret\` has the value of the AWS Secrets Manager secret that allows access to the Oracle endpoint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| - [secretsManagerOracleAsmAccessRoleArn](#dms_endpoints_additionalProperties_oracleSettings_secretsManagerOracleAsmAccessRoleArn )     | No      | string          | No         | -          | Required only if your Oracle endpoint uses Advanced Storage Manager (ASM).<br /><br />The full ARN of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the \`SecretsManagerOracleAsmSecret\` . This \`SecretsManagerOracleAsmSecret\` has the secret value that allows access to the Oracle ASM of the endpoint.<br /><br />> You can specify one of two sets of values for these permissions. You can specify the values for this setting and \`SecretsManagerOracleAsmSecretId\` . Or you can specify clear-text values for \`AsmUser\` , \`AsmPassword\` , and \`AsmServerName\` . You can't specify both.<br />><br />> For more information on creating this \`SecretsManagerOracleAsmSecret\` , the corresponding \`SecretsManagerOracleAsmAccessRoleArn\` , and the \`SecretsManagerOracleAsmSecretId\` that is required to access it, see [Using secrets to access AWS Database Migration Service resources](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Security.html#security-iam-secretsmanager) in the *AWS Database Migration Service User Guide* .                                                                                                                                                                                                                                                                                                               |
| - [secretsManagerOracleAsmSecretArn](#dms_endpoints_additionalProperties_oracleSettings_secretsManagerOracleAsmSecretArn )             | No      | string          | No         | -          | Required only if your Oracle endpoint uses Advanced Storage Manager (ASM).<br /><br />The full ARN of the \`SecretsManagerOracleAsmSecret\` that contains the Oracle ASM connection details for the Oracle endpoint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| + [secretsManagerSecretArn](#dms_endpoints_additionalProperties_oracleSettings_secretsManagerSecretArn )                               | No      | string          | No         | -          | The full ARN of the \`SecretsManagerSecret\` that contains the Oracle endpoint connection details.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| - [secretsManagerSecretKMSArn](#dms_endpoints_additionalProperties_oracleSettings_secretsManagerSecretKMSArn )                         | No      | string          | No         | -          | The ID of the KMS key used to encrypt the credentials secret.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| - [spatialDataOptionToGeoJsonFunctionName](#dms_endpoints_additionalProperties_oracleSettings_spatialDataOptionToGeoJsonFunctionName ) | No      | string          | No         | -          | Use this attribute to convert \`SDO_GEOMETRY\` to \`GEOJSON\` format.<br /><br />By default, DMS calls the \`SDO2GEOJSON\` custom function if present and accessible. Or you can create your own custom function that mimics the operation of \`SDOGEOJSON\` and set \`SpatialDataOptionToGeoJsonFunctionName\` to call it instead.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| - [standbyDelayTime](#dms_endpoints_additionalProperties_oracleSettings_standbyDelayTime )                                             | No      | number          | No         | -          | Use this attribute to specify a time in minutes for the delay in standby sync.<br /><br />If the source is an Oracle Active Data Guard standby database, use this attribute to specify the time lag between primary and standby databases.<br /><br />In AWS DMS , you can create an Oracle CDC task that uses an Active Data Guard standby instance as a source for replicating ongoing changes. Doing this eliminates the need to connect to an active database that might be in production.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [useAlternateFolderForOnline](#dms_endpoints_additionalProperties_oracleSettings_useAlternateFolderForOnline )                       | No      | boolean         | No         | -          | Set this attribute to \`true\` in order to use the Binary Reader to capture change data for an Amazon RDS for Oracle as the source.<br /><br />This tells the DMS instance to use any specified prefix replacement to access all online redo logs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| - [useBFile](#dms_endpoints_additionalProperties_oracleSettings_useBFile )                                                             | No      | boolean         | No         | -          | Set this attribute to Y to capture change data using the Binary Reader utility.<br /><br />Set \`UseLogminerReader\` to N to set this attribute to Y. To use Binary Reader with Amazon RDS for Oracle as the source, you set additional attributes. For more information about using this setting with Oracle Automatic Storage Management (ASM), see [Using Oracle LogMiner or AWS DMS Binary Reader for CDC](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html#CHAP_Source.Oracle.CDC) .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| - [useDirectPathFullLoad](#dms_endpoints_additionalProperties_oracleSettings_useDirectPathFullLoad )                                   | No      | boolean         | No         | -          | Set this attribute to Y to have AWS DMS use a direct path full load.<br /><br />Specify this value to use the direct path protocol in the Oracle Call Interface (OCI). By using this OCI protocol, you can bulk-load Oracle target tables during a full load.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| - [useLogminerReader](#dms_endpoints_additionalProperties_oracleSettings_useLogminerReader )                                           | No      | boolean         | No         | -          | Set this attribute to Y to capture change data using the Oracle LogMiner utility (the default).<br /><br />Set this attribute to N if you want to access the redo logs as a binary file. When you set \`UseLogminerReader\` to N, also set \`UseBfile\` to Y. For more information on this setting and using Oracle ASM, see [Using Oracle LogMiner or AWS DMS Binary Reader for CDC](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html#CHAP_Source.Oracle.CDC) in the *AWS DMS User Guide* .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| - [usePathPrefix](#dms_endpoints_additionalProperties_oracleSettings_usePathPrefix )                                                   | No      | string          | No         | -          | Set this string attribute to the required value in order to use the Binary Reader to capture change data for an Amazon RDS for Oracle as the source.<br /><br />This value specifies the path prefix used to replace the default Oracle root to access the redo logs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

###### <a name="dms_endpoints_additionalProperties_oracleSettings_accessAlternateDirectly"></a>2.2.1.13.1. Property `root > dms > endpoints > additionalProperties > oracleSettings > accessAlternateDirectly`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Set this attribute to `false` in order to use the Binary Reader to capture change data for an Amazon RDS for Oracle as the source.

This tells the DMS instance to not access redo logs through any specified path prefix replacement using direct file access.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_addSupplementalLogging"></a>2.2.1.13.2. Property `root > dms > endpoints > additionalProperties > oracleSettings > addSupplementalLogging`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Set this attribute to set up table-level supplemental logging for the Oracle database.

This attribute enables PRIMARY KEY supplemental logging on all tables selected for a migration task.

If you use this option, you still need to enable database-level supplemental logging.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_additionalArchivedLogDestId"></a>2.2.1.13.3. Property `root > dms > endpoints > additionalProperties > oracleSettings > additionalArchivedLogDestId`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Set this attribute with `ArchivedLogDestId` in a primary/ standby setup.

This attribute is useful in the case of a switchover. In this case, AWS DMS needs to know which destination to get archive redo logs from to read changes. This need arises because the previous primary instance is now a standby instance after switchover.

Although AWS DMS supports the use of the Oracle `RESETLOGS` option to open the database, never use `RESETLOGS` unless necessary. For additional information about `RESETLOGS` , see [RMAN Data Repair Concepts](https://docs.aws.amazon.com/https://docs.oracle.com/en/database/oracle/oracle-database/19/bradv/rman-data-repair-concepts.html#GUID-1805CCF7-4AF2-482D-B65A-998192F89C2B) in the *Oracle Database Backup and Recovery User's Guide* .

###### <a name="dms_endpoints_additionalProperties_oracleSettings_allowSelectNestedTables"></a>2.2.1.13.4. Property `root > dms > endpoints > additionalProperties > oracleSettings > allowSelectNestedTables`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Set this attribute to `true` to enable replication of Oracle tables containing columns that are nested tables or defined types.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_archivedLogDestId"></a>2.2.1.13.5. Property `root > dms > endpoints > additionalProperties > oracleSettings > archivedLogDestId`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Specifies the ID of the destination for the archived redo logs.

This value should be the same as a number in the dest_id column of the v$archived_log view. If you work with an additional redo log destination, use the `AdditionalArchivedLogDestId` option to specify the additional destination ID. Doing this improves performance by ensuring that the correct logs are accessed from the outset.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_archivedLogsOnly"></a>2.2.1.13.6. Property `root > dms > endpoints > additionalProperties > oracleSettings > archivedLogsOnly`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** When this field is set to `Y` , AWS DMS only accesses the archived redo logs.

If the archived redo logs are stored on Automatic Storage Management (ASM) only, the AWS DMS user account needs to be granted ASM privileges.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_asmServer"></a>2.2.1.13.7. Property `root > dms > endpoints > additionalProperties > oracleSettings > asmServer`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** For an Oracle source endpoint, your ASM server address.

You can set this value from the `asm_server` value. You set `asm_server` as part of the extra connection attribute string to access an Oracle server with Binary Reader that uses ASM. For more information, see [Configuration for change data capture (CDC) on an Oracle source database](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html#dms/latest/userguide/CHAP_Source.Oracle.html#CHAP_Source.Oracle.CDC.Configuration) .

###### <a name="dms_endpoints_additionalProperties_oracleSettings_charLengthSemantics"></a>2.2.1.13.8. Property `root > dms > endpoints > additionalProperties > oracleSettings > charLengthSemantics`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies whether the length of a character column is in bytes or in characters.

To indicate that the character column length is in characters, set this attribute to `CHAR` . Otherwise, the character column length is in bytes.

Example: `charLengthSemantics=CHAR;`

###### <a name="dms_endpoints_additionalProperties_oracleSettings_directPathNoLog"></a>2.2.1.13.9. Property `root > dms > endpoints > additionalProperties > oracleSettings > directPathNoLog`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** When set to `true` , this attribute helps to increase the commit rate on the Oracle target database by writing directly to tables and not writing a trail to database logs.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_directPathParallelLoad"></a>2.2.1.13.10. Property `root > dms > endpoints > additionalProperties > oracleSettings > directPathParallelLoad`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** When set to `true` , this attribute specifies a parallel load when `useDirectPathFullLoad` is set to `Y` .

This attribute also only applies when you use the AWS DMS parallel load feature. Note that the target table cannot have any constraints or indexes.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_enableHomogenousTablespace"></a>2.2.1.13.11. Property `root > dms > endpoints > additionalProperties > oracleSettings > enableHomogenousTablespace`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Set this attribute to enable homogenous tablespace replication and create existing tables or indexes under the same tablespace on the target.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_extraArchivedLogDestIds"></a>2.2.1.13.12. Property `root > dms > endpoints > additionalProperties > oracleSettings > extraArchivedLogDestIds`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of number` |
| **Required** | No                |

**Description:** Specifies the IDs of one more destinations for one or more archived redo logs.

These IDs are the values of the `dest_id` column in the `v$archived_log` view. Use this setting with the `archivedLogDestId` extra connection attribute in a primary-to-single setup or a primary-to-multiple-standby setup.

This setting is useful in a switchover when you use an Oracle Data Guard database as a source. In this case, AWS DMS needs information about what destination to get archive redo logs from to read changes. AWS DMS needs this because after the switchover the previous primary is a standby instance. For example, in a primary-to-single standby setup you might apply the following settings.

`archivedLogDestId=1; ExtraArchivedLogDestIds=[2]`

In a primary-to-multiple-standby setup, you might apply the following settings.

`archivedLogDestId=1; ExtraArchivedLogDestIds=[2,3,4]`

Although AWS DMS supports the use of the Oracle `RESETLOGS` option to open the database, never use `RESETLOGS` unless it's necessary. For more information about `RESETLOGS` , see [RMAN Data Repair Concepts](https://docs.aws.amazon.com/https://docs.oracle.com/en/database/oracle/oracle-database/19/bradv/rman-data-repair-concepts.html#GUID-1805CCF7-4AF2-482D-B65A-998192F89C2B) in the *Oracle Database Backup and Recovery User's Guide* .

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                   | Description |
| ----------------------------------------------------------------------------------------------------------------- | ----------- |
| [extraArchivedLogDestIds items](#dms_endpoints_additionalProperties_oracleSettings_extraArchivedLogDestIds_items) | -           |

###### <a name="autogenerated_heading_2"></a>2.2.1.13.12.1. root > dms > endpoints > additionalProperties > oracleSettings > extraArchivedLogDestIds > extraArchivedLogDestIds items

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="dms_endpoints_additionalProperties_oracleSettings_failTasksOnLobTruncation"></a>2.2.1.13.13. Property `root > dms > endpoints > additionalProperties > oracleSettings > failTasksOnLobTruncation`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** When set to `true` , this attribute causes a task to fail if the actual size of an LOB column is greater than the specified `LobMaxSize` .

If a task is set to limited LOB mode and this option is set to `true` , the task fails instead of truncating the LOB data.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_numberDatatypeScale"></a>2.2.1.13.14. Property `root > dms > endpoints > additionalProperties > oracleSettings > numberDatatypeScale`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Specifies the number scale.

You can select a scale up to 38, or you can select FLOAT. By default, the NUMBER data type is converted to precision 38, scale 10.

Example: `numberDataTypeScale=12`

###### <a name="dms_endpoints_additionalProperties_oracleSettings_oraclePathPrefix"></a>2.2.1.13.15. Property `root > dms > endpoints > additionalProperties > oracleSettings > oraclePathPrefix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Set this string attribute to the required value in order to use the Binary Reader to capture change data for an Amazon RDS for Oracle as the source.

This value specifies the default Oracle root used to access the redo logs.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_parallelAsmReadThreads"></a>2.2.1.13.16. Property `root > dms > endpoints > additionalProperties > oracleSettings > parallelAsmReadThreads`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Set this attribute to change the number of threads that DMS configures to perform a change data capture (CDC) load using Oracle Automatic Storage Management (ASM).

You can specify an integer value between 2 (the default) and 8 (the maximum). Use this attribute together with the `readAheadBlocks` attribute.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_readAheadBlocks"></a>2.2.1.13.17. Property `root > dms > endpoints > additionalProperties > oracleSettings > readAheadBlocks`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Set this attribute to change the number of read-ahead blocks that DMS configures to perform a change data capture (CDC) load using Oracle Automatic Storage Management (ASM).

You can specify an integer value between 1000 (the default) and 200,000 (the maximum).

###### <a name="dms_endpoints_additionalProperties_oracleSettings_readTableSpaceName"></a>2.2.1.13.18. Property `root > dms > endpoints > additionalProperties > oracleSettings > readTableSpaceName`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** When set to `true` , this attribute supports tablespace replication.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_replacePathPrefix"></a>2.2.1.13.19. Property `root > dms > endpoints > additionalProperties > oracleSettings > replacePathPrefix`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Set this attribute to true in order to use the Binary Reader to capture change data for an Amazon RDS for Oracle as the source.

This setting tells DMS instance to replace the default Oracle root with the specified `usePathPrefix` setting to access the redo logs.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_retryInterval"></a>2.2.1.13.20. Property `root > dms > endpoints > additionalProperties > oracleSettings > retryInterval`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Specifies the number of seconds that the system waits before resending a query.

Example: `retryInterval=6;`

###### <a name="dms_endpoints_additionalProperties_oracleSettings_secretsManagerAccessRoleArn"></a>2.2.1.13.21. Property `root > dms > endpoints > additionalProperties > oracleSettings > secretsManagerAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in `SecretsManagerSecret` .

The role must allow the `iam:PassRole` action. `SecretsManagerSecret` has the value of the AWS Secrets Manager secret that allows access to the Oracle endpoint.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_secretsManagerOracleAsmAccessRoleArn"></a>2.2.1.13.22. Property `root > dms > endpoints > additionalProperties > oracleSettings > secretsManagerOracleAsmAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Required only if your Oracle endpoint uses Advanced Storage Manager (ASM).

The full ARN of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the `SecretsManagerOracleAsmSecret` . This `SecretsManagerOracleAsmSecret` has the secret value that allows access to the Oracle ASM of the endpoint.

> You can specify one of two sets of values for these permissions. You can specify the values for this setting and `SecretsManagerOracleAsmSecretId` . Or you can specify clear-text values for `AsmUser` , `AsmPassword` , and `AsmServerName` . You can't specify both.
>
> For more information on creating this `SecretsManagerOracleAsmSecret` , the corresponding `SecretsManagerOracleAsmAccessRoleArn` , and the `SecretsManagerOracleAsmSecretId` that is required to access it, see [Using secrets to access AWS Database Migration Service resources](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Security.html#security-iam-secretsmanager) in the *AWS Database Migration Service User Guide* .

###### <a name="dms_endpoints_additionalProperties_oracleSettings_secretsManagerOracleAsmSecretArn"></a>2.2.1.13.23. Property `root > dms > endpoints > additionalProperties > oracleSettings > secretsManagerOracleAsmSecretArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Required only if your Oracle endpoint uses Advanced Storage Manager (ASM).

The full ARN of the `SecretsManagerOracleAsmSecret` that contains the Oracle ASM connection details for the Oracle endpoint.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_secretsManagerSecretArn"></a>2.2.1.13.24. Property `root > dms > endpoints > additionalProperties > oracleSettings > secretsManagerSecretArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The full ARN of the `SecretsManagerSecret` that contains the Oracle endpoint connection details.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_secretsManagerSecretKMSArn"></a>2.2.1.13.25. Property `root > dms > endpoints > additionalProperties > oracleSettings > secretsManagerSecretKMSArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The ID of the KMS key used to encrypt the credentials secret.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_spatialDataOptionToGeoJsonFunctionName"></a>2.2.1.13.26. Property `root > dms > endpoints > additionalProperties > oracleSettings > spatialDataOptionToGeoJsonFunctionName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Use this attribute to convert `SDO_GEOMETRY` to `GEOJSON` format.

By default, DMS calls the `SDO2GEOJSON` custom function if present and accessible. Or you can create your own custom function that mimics the operation of `SDOGEOJSON` and set `SpatialDataOptionToGeoJsonFunctionName` to call it instead.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_standbyDelayTime"></a>2.2.1.13.27. Property `root > dms > endpoints > additionalProperties > oracleSettings > standbyDelayTime`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Use this attribute to specify a time in minutes for the delay in standby sync.

If the source is an Oracle Active Data Guard standby database, use this attribute to specify the time lag between primary and standby databases.

In AWS DMS , you can create an Oracle CDC task that uses an Active Data Guard standby instance as a source for replicating ongoing changes. Doing this eliminates the need to connect to an active database that might be in production.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_useAlternateFolderForOnline"></a>2.2.1.13.28. Property `root > dms > endpoints > additionalProperties > oracleSettings > useAlternateFolderForOnline`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Set this attribute to `true` in order to use the Binary Reader to capture change data for an Amazon RDS for Oracle as the source.

This tells the DMS instance to use any specified prefix replacement to access all online redo logs.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_useBFile"></a>2.2.1.13.29. Property `root > dms > endpoints > additionalProperties > oracleSettings > useBFile`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Set this attribute to Y to capture change data using the Binary Reader utility.

Set `UseLogminerReader` to N to set this attribute to Y. To use Binary Reader with Amazon RDS for Oracle as the source, you set additional attributes. For more information about using this setting with Oracle Automatic Storage Management (ASM), see [Using Oracle LogMiner or AWS DMS Binary Reader for CDC](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html#CHAP_Source.Oracle.CDC) .

###### <a name="dms_endpoints_additionalProperties_oracleSettings_useDirectPathFullLoad"></a>2.2.1.13.30. Property `root > dms > endpoints > additionalProperties > oracleSettings > useDirectPathFullLoad`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Set this attribute to Y to have AWS DMS use a direct path full load.

Specify this value to use the direct path protocol in the Oracle Call Interface (OCI). By using this OCI protocol, you can bulk-load Oracle target tables during a full load.

###### <a name="dms_endpoints_additionalProperties_oracleSettings_useLogminerReader"></a>2.2.1.13.31. Property `root > dms > endpoints > additionalProperties > oracleSettings > useLogminerReader`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Set this attribute to Y to capture change data using the Oracle LogMiner utility (the default).

Set this attribute to N if you want to access the redo logs as a binary file. When you set `UseLogminerReader` to N, also set `UseBfile` to Y. For more information on this setting and using Oracle ASM, see [Using Oracle LogMiner or AWS DMS Binary Reader for CDC](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html#CHAP_Source.Oracle.CDC) in the *AWS DMS User Guide* .

###### <a name="dms_endpoints_additionalProperties_oracleSettings_usePathPrefix"></a>2.2.1.13.32. Property `root > dms > endpoints > additionalProperties > oracleSettings > usePathPrefix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Set this string attribute to the required value in order to use the Binary Reader to capture change data for an Amazon RDS for Oracle as the source.

This value specifies the path prefix used to replace the default Oracle root to access the redo logs.

##### <a name="dms_endpoints_additionalProperties_postgreSqlSettings"></a>2.2.1.14. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/PostgreSqlSettingsProperty                |

**Description:** Settings in JSON format for the source and target PostgreSQL endpoint.

For information about other available settings, see [Extra connection attributes when using PostgreSQL as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html#CHAP_Source.PostgreSQL.ConnectionAttrib) and [Extra connection attributes when using PostgreSQL as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.PostgreSQL.html#CHAP_Target.PostgreSQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .

| Property                                                                                                             | Pattern | Type    | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [afterConnectScript](#dms_endpoints_additionalProperties_postgreSqlSettings_afterConnectScript )                   | No      | string  | No         | -          | For use with change data capture (CDC) only, this attribute has AWS DMS bypass foreign keys and user triggers to reduce the time it takes to bulk load data.<br /><br />Example: \`afterConnectScript=SET session_replication_role='replica'\`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| - [babelfishDatabaseName](#dms_endpoints_additionalProperties_postgreSqlSettings_babelfishDatabaseName )             | No      | string  | No         | -          | The Babelfish for Aurora PostgreSQL database name for the endpoint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| - [captureDdls](#dms_endpoints_additionalProperties_postgreSqlSettings_captureDdls )                                 | No      | boolean | No         | -          | To capture DDL events, AWS DMS creates various artifacts in the PostgreSQL database when the task starts.<br /><br />You can later remove these artifacts.<br /><br />If this value is set to \`N\` , you don't have to create tables or triggers on the source database.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| - [databaseMode](#dms_endpoints_additionalProperties_postgreSqlSettings_databaseMode )                               | No      | string  | No         | -          | Specifies the default behavior of the replication's handling of PostgreSQL- compatible endpoints that require some additional configuration, such as Babelfish endpoints.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| - [ddlArtifactsSchema](#dms_endpoints_additionalProperties_postgreSqlSettings_ddlArtifactsSchema )                   | No      | string  | No         | -          | The schema in which the operational DDL database artifacts are created.<br /><br />Example: \`ddlArtifactsSchema=xyzddlschema;\`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| - [executeTimeout](#dms_endpoints_additionalProperties_postgreSqlSettings_executeTimeout )                           | No      | number  | No         | -          | Sets the client statement timeout for the PostgreSQL instance, in seconds. The default value is 60 seconds.<br /><br />Example: \`executeTimeout=100;\`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| - [failTasksOnLobTruncation](#dms_endpoints_additionalProperties_postgreSqlSettings_failTasksOnLobTruncation )       | No      | boolean | No         | -          | When set to \`true\` , this value causes a task to fail if the actual size of a LOB column is greater than the specified \`LobMaxSize\` .<br /><br />If task is set to Limited LOB mode and this option is set to true, the task fails instead of truncating the LOB data.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| - [heartbeatEnable](#dms_endpoints_additionalProperties_postgreSqlSettings_heartbeatEnable )                         | No      | boolean | No         | -          | The write-ahead log (WAL) heartbeat feature mimics a dummy transaction.<br /><br />By doing this, it prevents idle logical replication slots from holding onto old WAL logs, which can result in storage full situations on the source. This heartbeat keeps \`restart_lsn\` moving and prevents storage full scenarios.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| - [heartbeatFrequency](#dms_endpoints_additionalProperties_postgreSqlSettings_heartbeatFrequency )                   | No      | number  | No         | -          | Sets the WAL heartbeat frequency (in minutes).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| - [heartbeatSchema](#dms_endpoints_additionalProperties_postgreSqlSettings_heartbeatSchema )                         | No      | string  | No         | -          | Sets the schema in which the heartbeat artifacts are created.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| - [mapBooleanAsBoolean](#dms_endpoints_additionalProperties_postgreSqlSettings_mapBooleanAsBoolean )                 | No      | boolean | No         | -          | When true, lets PostgreSQL migrate the boolean type as boolean.<br /><br />By default, PostgreSQL migrates booleans as \`varchar(5)\` . You must set this setting on both the source and target endpoints for it to take effect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| - [maxFileSize](#dms_endpoints_additionalProperties_postgreSqlSettings_maxFileSize )                                 | No      | number  | No         | -          | Specifies the maximum size (in KB) of any .csv file used to transfer data to PostgreSQL.<br /><br />Example: \`maxFileSize=512\`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| - [pluginName](#dms_endpoints_additionalProperties_postgreSqlSettings_pluginName )                                   | No      | string  | No         | -          | Specifies the plugin to use to create a replication slot.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| - [secretsManagerAccessRoleArn](#dms_endpoints_additionalProperties_postgreSqlSettings_secretsManagerAccessRoleArn ) | No      | string  | No         | -          | The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in \`SecretsManagerSecret\` .<br /><br />The role must allow the \`iam:PassRole\` action. \`SecretsManagerSecret\` has the value of the AWS Secrets Manager secret that allows access to the PostgreSQL endpoint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [secretsManagerSecretArn](#dms_endpoints_additionalProperties_postgreSqlSettings_secretsManagerSecretArn )         | No      | string  | No         | -          | The full ARN of the \`SecretsManagerSecret\` that contains the PostgreSQL endpoint connection details.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| - [secretsManagerSecretKMSArn](#dms_endpoints_additionalProperties_postgreSqlSettings_secretsManagerSecretKMSArn )   | No      | string  | No         | -          | The ID of the KMS key used to encrypt the credentials secret.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| - [slotName](#dms_endpoints_additionalProperties_postgreSqlSettings_slotName )                                       | No      | string  | No         | -          | Sets the name of a previously created logical replication slot for a change data capture (CDC) load of the PostgreSQL source instance.<br /><br />When used with the \`CdcStartPosition\` request parameter for the AWS DMS API , this attribute also makes it possible to use native CDC start points. DMS verifies that the specified logical replication slot exists before starting the CDC load task. It also verifies that the task was created with a valid setting of \`CdcStartPosition\` . If the specified slot doesn't exist or the task doesn't have a valid \`CdcStartPosition\` setting, DMS raises an error.<br /><br />For more information about setting the \`CdcStartPosition\` request parameter, see [Determining a CDC native start point](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html#CHAP_Task.CDC.StartPoint.Native) in the *AWS Database Migration Service User Guide* . For more information about using \`CdcStartPosition\` , see [CreateReplicationTask](https://docs.aws.amazon.com/dms/latest/APIReference/API_CreateReplicationTask.html) , [StartReplicationTask](https://docs.aws.amazon.com/dms/latest/APIReference/API_StartReplicationTask.html) , and [ModifyReplicationTask](https://docs.aws.amazon.com/dms/latest/APIReference/API_ModifyReplicationTask.html) . |

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_afterConnectScript"></a>2.2.1.14.1. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > afterConnectScript`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** For use with change data capture (CDC) only, this attribute has AWS DMS bypass foreign keys and user triggers to reduce the time it takes to bulk load data.

Example: `afterConnectScript=SET session_replication_role='replica'`

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_babelfishDatabaseName"></a>2.2.1.14.2. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > babelfishDatabaseName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The Babelfish for Aurora PostgreSQL database name for the endpoint.

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_captureDdls"></a>2.2.1.14.3. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > captureDdls`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** To capture DDL events, AWS DMS creates various artifacts in the PostgreSQL database when the task starts.

You can later remove these artifacts.

If this value is set to `N` , you don't have to create tables or triggers on the source database.

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_databaseMode"></a>2.2.1.14.4. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > databaseMode`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies the default behavior of the replication's handling of PostgreSQL- compatible endpoints that require some additional configuration, such as Babelfish endpoints.

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_ddlArtifactsSchema"></a>2.2.1.14.5. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > ddlArtifactsSchema`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The schema in which the operational DDL database artifacts are created.

Example: `ddlArtifactsSchema=xyzddlschema;`

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_executeTimeout"></a>2.2.1.14.6. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > executeTimeout`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Sets the client statement timeout for the PostgreSQL instance, in seconds. The default value is 60 seconds.

Example: `executeTimeout=100;`

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_failTasksOnLobTruncation"></a>2.2.1.14.7. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > failTasksOnLobTruncation`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** When set to `true` , this value causes a task to fail if the actual size of a LOB column is greater than the specified `LobMaxSize` .

If task is set to Limited LOB mode and this option is set to true, the task fails instead of truncating the LOB data.

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_heartbeatEnable"></a>2.2.1.14.8. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > heartbeatEnable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** The write-ahead log (WAL) heartbeat feature mimics a dummy transaction.

By doing this, it prevents idle logical replication slots from holding onto old WAL logs, which can result in storage full situations on the source. This heartbeat keeps `restart_lsn` moving and prevents storage full scenarios.

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_heartbeatFrequency"></a>2.2.1.14.9. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > heartbeatFrequency`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Sets the WAL heartbeat frequency (in minutes).

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_heartbeatSchema"></a>2.2.1.14.10. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > heartbeatSchema`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Sets the schema in which the heartbeat artifacts are created.

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_mapBooleanAsBoolean"></a>2.2.1.14.11. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > mapBooleanAsBoolean`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** When true, lets PostgreSQL migrate the boolean type as boolean.

By default, PostgreSQL migrates booleans as `varchar(5)` . You must set this setting on both the source and target endpoints for it to take effect.

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_maxFileSize"></a>2.2.1.14.12. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > maxFileSize`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Specifies the maximum size (in KB) of any .csv file used to transfer data to PostgreSQL.

Example: `maxFileSize=512`

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_pluginName"></a>2.2.1.14.13. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > pluginName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies the plugin to use to create a replication slot.

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_secretsManagerAccessRoleArn"></a>2.2.1.14.14. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > secretsManagerAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in `SecretsManagerSecret` .

The role must allow the `iam:PassRole` action. `SecretsManagerSecret` has the value of the AWS Secrets Manager secret that allows access to the PostgreSQL endpoint.

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_secretsManagerSecretArn"></a>2.2.1.14.15. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > secretsManagerSecretArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The full ARN of the `SecretsManagerSecret` that contains the PostgreSQL endpoint connection details.

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_secretsManagerSecretKMSArn"></a>2.2.1.14.16. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > secretsManagerSecretKMSArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The ID of the KMS key used to encrypt the credentials secret.

###### <a name="dms_endpoints_additionalProperties_postgreSqlSettings_slotName"></a>2.2.1.14.17. Property `root > dms > endpoints > additionalProperties > postgreSqlSettings > slotName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Sets the name of a previously created logical replication slot for a change data capture (CDC) load of the PostgreSQL source instance.

When used with the `CdcStartPosition` request parameter for the AWS DMS API , this attribute also makes it possible to use native CDC start points. DMS verifies that the specified logical replication slot exists before starting the CDC load task. It also verifies that the task was created with a valid setting of `CdcStartPosition` . If the specified slot doesn't exist or the task doesn't have a valid `CdcStartPosition` setting, DMS raises an error.

For more information about setting the `CdcStartPosition` request parameter, see [Determining a CDC native start point](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Task.CDC.html#CHAP_Task.CDC.StartPoint.Native) in the *AWS Database Migration Service User Guide* . For more information about using `CdcStartPosition` , see [CreateReplicationTask](https://docs.aws.amazon.com/dms/latest/APIReference/API_CreateReplicationTask.html) , [StartReplicationTask](https://docs.aws.amazon.com/dms/latest/APIReference/API_StartReplicationTask.html) , and [ModifyReplicationTask](https://docs.aws.amazon.com/dms/latest/APIReference/API_ModifyReplicationTask.html) .

##### <a name="dms_endpoints_additionalProperties_redshiftSettings"></a>2.2.1.15. Property `root > dms > endpoints > additionalProperties > redshiftSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/RedshiftSettingsProperty                  |

**Description:** Settings in JSON format for the Amazon Redshift endpoint.

For more information about other available settings, see [Extra connection attributes when using Amazon Redshift as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Redshift.html#CHAP_Target.Redshift.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .

| Property                                                                                                             | Pattern | Type    | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [acceptAnyDate](#dms_endpoints_additionalProperties_redshiftSettings_acceptAnyDate )                               | No      | boolean | No         | -          | A value that indicates to allow any date format, including invalid formats such as 00/00/00 00:00:00, to be loaded without generating an error.<br /><br />You can choose \`true\` or \`false\` (the default).<br /><br />This parameter applies only to TIMESTAMP and DATE columns. Always use ACCEPTANYDATE with the DATEFORMAT parameter. If the date format for the data doesn't match the DATEFORMAT specification, Amazon Redshift inserts a NULL value into that field.                                                                                                                                                                                                                                                      |
| - [afterConnectScript](#dms_endpoints_additionalProperties_redshiftSettings_afterConnectScript )                     | No      | string  | No         | -          | Code to run after connecting.<br /><br />This parameter should contain the code itself, not the name of a file containing the code.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| - [bucketFolder](#dms_endpoints_additionalProperties_redshiftSettings_bucketFolder )                                 | No      | string  | No         | -          | An S3 folder where the comma-separated-value (.csv) files are stored before being uploaded to the target Redshift cluster.<br /><br />For full load mode, AWS DMS converts source records into .csv files and loads them to the *BucketFolder/TableID* path. AWS DMS uses the Redshift \`COPY\` command to upload the .csv files to the target table. The files are deleted once the \`COPY\` operation has finished. For more information, see [COPY](https://docs.aws.amazon.com/redshift/latest/dg/r_COPY.html) in the *Amazon Redshift Database Developer Guide* .<br /><br />For change-data-capture (CDC) mode, AWS DMS creates a *NetChanges* table, and loads the .csv files to this *BucketFolder/NetChangesTableID* path. |
| + [bucketName](#dms_endpoints_additionalProperties_redshiftSettings_bucketName )                                     | No      | string  | No         | -          | The name of the intermediate S3 bucket used to store .csv files before uploading data to Redshift.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [caseSensitiveNames](#dms_endpoints_additionalProperties_redshiftSettings_caseSensitiveNames )                     | No      | boolean | No         | -          | If Amazon Redshift is configured to support case sensitive schema names, set \`CaseSensitiveNames\` to \`true\` .<br /><br />The default is \`false\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| - [compUpdate](#dms_endpoints_additionalProperties_redshiftSettings_compUpdate )                                     | No      | boolean | No         | -          | If you set \`CompUpdate\` to \`true\` Amazon Redshift applies automatic compression if the table is empty.<br /><br />This applies even if the table columns already have encodings other than \`RAW\` . If you set \`CompUpdate\` to \`false\` , automatic compression is disabled and existing column encodings aren't changed. The default is \`true\` .                                                                                                                                                                                                                                                                                                                                                                         |
| - [connectionTimeout](#dms_endpoints_additionalProperties_redshiftSettings_connectionTimeout )                       | No      | number  | No         | -          | A value that sets the amount of time to wait (in milliseconds) before timing out, beginning from when you initially establish a connection.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| - [dateFormat](#dms_endpoints_additionalProperties_redshiftSettings_dateFormat )                                     | No      | string  | No         | -          | The date format that you are using.<br /><br />Valid values are \`auto\` (case-sensitive), your date format string enclosed in quotes, or NULL. If this parameter is left unset (NULL), it defaults to a format of 'YYYY-MM-DD'. Using \`auto\` recognizes most strings, even some that aren't supported when you use a date format string.<br /><br />If your date and time values use formats different from each other, set this to \`auto\` .                                                                                                                                                                                                                                                                                   |
| - [emptyAsNull](#dms_endpoints_additionalProperties_redshiftSettings_emptyAsNull )                                   | No      | boolean | No         | -          | A value that specifies whether AWS DMS should migrate empty CHAR and VARCHAR fields as NULL.<br /><br />A value of \`true\` sets empty CHAR and VARCHAR fields to null. The default is \`false\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [explicitIds](#dms_endpoints_additionalProperties_redshiftSettings_explicitIds )                                   | No      | boolean | No         | -          | This setting is only valid for a full-load migration task.<br /><br />Set \`ExplicitIds\` to \`true\` to have tables with \`IDENTITY\` columns override their auto-generated values with explicit values loaded from the source data files used to populate the tables. The default is \`false\` .                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [fileTransferUploadStreams](#dms_endpoints_additionalProperties_redshiftSettings_fileTransferUploadStreams )       | No      | number  | No         | -          | The number of threads used to upload a single file.<br /><br />This parameter accepts a value from 1 through 64. It defaults to 10.<br /><br />The number of parallel streams used to upload a single .csv file to an S3 bucket using S3 Multipart Upload. For more information, see [Multipart upload overview](https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuoverview.html) .<br /><br />\`FileTransferUploadStreams\` accepts a value from 1 through 64. It defaults to 10.                                                                                                                                                                                                                                                 |
| - [loadTimeout](#dms_endpoints_additionalProperties_redshiftSettings_loadTimeout )                                   | No      | number  | No         | -          | The amount of time to wait (in milliseconds) before timing out of operations performed by AWS DMS on a Redshift cluster, such as Redshift COPY, INSERT, DELETE, and UPDATE.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| - [mapBooleanAsBoolean](#dms_endpoints_additionalProperties_redshiftSettings_mapBooleanAsBoolean )                   | No      | boolean | No         | -          | When true, lets Redshift migrate the boolean type as boolean.<br /><br />By default, Redshift migrates booleans as \`varchar(1)\` . You must set this setting on both the source and target endpoints for it to take effect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| - [maxFileSize](#dms_endpoints_additionalProperties_redshiftSettings_maxFileSize )                                   | No      | number  | No         | -          | The maximum size (in KB) of any .csv file used to load data on an S3 bucket and transfer data to Amazon Redshift. It defaults to 1048576KB (1 GB).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [removeQuotes](#dms_endpoints_additionalProperties_redshiftSettings_removeQuotes )                                 | No      | boolean | No         | -          | A value that specifies to remove surrounding quotation marks from strings in the incoming data.<br /><br />All characters within the quotation marks, including delimiters, are retained. Choose \`true\` to remove quotation marks. The default is \`false\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| - [replaceChars](#dms_endpoints_additionalProperties_redshiftSettings_replaceChars )                                 | No      | string  | No         | -          | A value that specifies to replaces the invalid characters specified in \`ReplaceInvalidChars\` , substituting the specified characters instead.<br /><br />The default is \`"?"\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| - [replaceInvalidChars](#dms_endpoints_additionalProperties_redshiftSettings_replaceInvalidChars )                   | No      | string  | No         | -          | A list of characters that you want to replace.<br /><br />Use with \`ReplaceChars\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| - [secretsManagerAccessRoleArn](#dms_endpoints_additionalProperties_redshiftSettings_secretsManagerAccessRoleArn )   | No      | string  | No         | -          | The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in \`SecretsManagerSecret\` .<br /><br />The role must allow the \`iam:PassRole\` action. \`SecretsManagerSecret\` has the value of the AWS Secrets Manager secret that allows access to the Amazon Redshift endpoint.                                                                                                                                                                                                                                                                                                                                                     |
| + [secretsManagerSecretArn](#dms_endpoints_additionalProperties_redshiftSettings_secretsManagerSecretArn )           | No      | string  | No         | -          | The full ARN of the \`SecretsManagerSecret\` that contains the Amazon Redshift endpoint connection details.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| - [secretsManagerSecretKMSArn](#dms_endpoints_additionalProperties_redshiftSettings_secretsManagerSecretKMSArn )     | No      | string  | No         | -          | The ID of the KMS key used to encrypt the credentials secret.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| + [serverSideEncryptionKmsKeyId](#dms_endpoints_additionalProperties_redshiftSettings_serverSideEncryptionKmsKeyId ) | No      | string  | No         | -          | The AWS KMS key ID.<br /><br />If you are using \`SSE_KMS\` for the \`EncryptionMode\` , provide this key ID. The key that you use needs an attached policy that enables IAM user permissions and allows use of the key.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| - [serviceAccessRoleArn](#dms_endpoints_additionalProperties_redshiftSettings_serviceAccessRoleArn )                 | No      | string  | No         | -          | The Amazon Resource Name (ARN) of the IAM role that has access to the Amazon Redshift service.<br /><br />The role must allow the \`iam:PassRole\` action.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| - [timeFormat](#dms_endpoints_additionalProperties_redshiftSettings_timeFormat )                                     | No      | string  | No         | -          | The time format that you want to use.<br /><br />Valid values are \`auto\` (case-sensitive), \`'timeformat_string'\` , \`'epochsecs'\` , or \`'epochmillisecs'\` . It defaults to 10. Using \`auto\` recognizes most strings, even some that aren't supported when you use a time format string.<br /><br />If your date and time values use formats different from each other, set this parameter to \`auto\` .                                                                                                                                                                                                                                                                                                                    |
| - [trimBlanks](#dms_endpoints_additionalProperties_redshiftSettings_trimBlanks )                                     | No      | boolean | No         | -          | A value that specifies to remove the trailing white space characters from a VARCHAR string.<br /><br />This parameter applies only to columns with a VARCHAR data type. Choose \`true\` to remove unneeded white space. The default is \`false\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [truncateColumns](#dms_endpoints_additionalProperties_redshiftSettings_truncateColumns )                           | No      | boolean | No         | -          | A value that specifies to truncate data in columns to the appropriate number of characters, so that the data fits in the column.<br /><br />This parameter applies only to columns with a VARCHAR or CHAR data type, and rows with a size of 4 MB or less. Choose \`true\` to truncate data. The default is \`false\` .                                                                                                                                                                                                                                                                                                                                                                                                             |
| - [writeBufferSize](#dms_endpoints_additionalProperties_redshiftSettings_writeBufferSize )                           | No      | number  | No         | -          | The size (in KB) of the in-memory file write buffer used when generating .csv files on the local disk at the DMS replication instance. The default value is 1000 (buffer size is 1000KB).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_acceptAnyDate"></a>2.2.1.15.1. Property `root > dms > endpoints > additionalProperties > redshiftSettings > acceptAnyDate`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** A value that indicates to allow any date format, including invalid formats such as 00/00/00 00:00:00, to be loaded without generating an error.

You can choose `true` or `false` (the default).

This parameter applies only to TIMESTAMP and DATE columns. Always use ACCEPTANYDATE with the DATEFORMAT parameter. If the date format for the data doesn't match the DATEFORMAT specification, Amazon Redshift inserts a NULL value into that field.

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_afterConnectScript"></a>2.2.1.15.2. Property `root > dms > endpoints > additionalProperties > redshiftSettings > afterConnectScript`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Code to run after connecting.

This parameter should contain the code itself, not the name of a file containing the code.

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_bucketFolder"></a>2.2.1.15.3. Property `root > dms > endpoints > additionalProperties > redshiftSettings > bucketFolder`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** An S3 folder where the comma-separated-value (.csv) files are stored before being uploaded to the target Redshift cluster.

For full load mode, AWS DMS converts source records into .csv files and loads them to the *BucketFolder/TableID* path. AWS DMS uses the Redshift `COPY` command to upload the .csv files to the target table. The files are deleted once the `COPY` operation has finished. For more information, see [COPY](https://docs.aws.amazon.com/redshift/latest/dg/r_COPY.html) in the *Amazon Redshift Database Developer Guide* .

For change-data-capture (CDC) mode, AWS DMS creates a *NetChanges* table, and loads the .csv files to this *BucketFolder/NetChangesTableID* path.

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_bucketName"></a>2.2.1.15.4. Property `root > dms > endpoints > additionalProperties > redshiftSettings > bucketName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the intermediate S3 bucket used to store .csv files before uploading data to Redshift.

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_caseSensitiveNames"></a>2.2.1.15.5. Property `root > dms > endpoints > additionalProperties > redshiftSettings > caseSensitiveNames`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If Amazon Redshift is configured to support case sensitive schema names, set `CaseSensitiveNames` to `true` .

The default is `false` .

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_compUpdate"></a>2.2.1.15.6. Property `root > dms > endpoints > additionalProperties > redshiftSettings > compUpdate`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If you set `CompUpdate` to `true` Amazon Redshift applies automatic compression if the table is empty.

This applies even if the table columns already have encodings other than `RAW` . If you set `CompUpdate` to `false` , automatic compression is disabled and existing column encodings aren't changed. The default is `true` .

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_connectionTimeout"></a>2.2.1.15.7. Property `root > dms > endpoints > additionalProperties > redshiftSettings > connectionTimeout`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** A value that sets the amount of time to wait (in milliseconds) before timing out, beginning from when you initially establish a connection.

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_dateFormat"></a>2.2.1.15.8. Property `root > dms > endpoints > additionalProperties > redshiftSettings > dateFormat`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The date format that you are using.

Valid values are `auto` (case-sensitive), your date format string enclosed in quotes, or NULL. If this parameter is left unset (NULL), it defaults to a format of 'YYYY-MM-DD'. Using `auto` recognizes most strings, even some that aren't supported when you use a date format string.

If your date and time values use formats different from each other, set this to `auto` .

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_emptyAsNull"></a>2.2.1.15.9. Property `root > dms > endpoints > additionalProperties > redshiftSettings > emptyAsNull`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** A value that specifies whether AWS DMS should migrate empty CHAR and VARCHAR fields as NULL.

A value of `true` sets empty CHAR and VARCHAR fields to null. The default is `false` .

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_explicitIds"></a>2.2.1.15.10. Property `root > dms > endpoints > additionalProperties > redshiftSettings > explicitIds`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** This setting is only valid for a full-load migration task.

Set `ExplicitIds` to `true` to have tables with `IDENTITY` columns override their auto-generated values with explicit values loaded from the source data files used to populate the tables. The default is `false` .

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_fileTransferUploadStreams"></a>2.2.1.15.11. Property `root > dms > endpoints > additionalProperties > redshiftSettings > fileTransferUploadStreams`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The number of threads used to upload a single file.

This parameter accepts a value from 1 through 64. It defaults to 10.

The number of parallel streams used to upload a single .csv file to an S3 bucket using S3 Multipart Upload. For more information, see [Multipart upload overview](https://docs.aws.amazon.com/AmazonS3/latest/dev/mpuoverview.html) .

`FileTransferUploadStreams` accepts a value from 1 through 64. It defaults to 10.

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_loadTimeout"></a>2.2.1.15.12. Property `root > dms > endpoints > additionalProperties > redshiftSettings > loadTimeout`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The amount of time to wait (in milliseconds) before timing out of operations performed by AWS DMS on a Redshift cluster, such as Redshift COPY, INSERT, DELETE, and UPDATE.

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_mapBooleanAsBoolean"></a>2.2.1.15.13. Property `root > dms > endpoints > additionalProperties > redshiftSettings > mapBooleanAsBoolean`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** When true, lets Redshift migrate the boolean type as boolean.

By default, Redshift migrates booleans as `varchar(1)` . You must set this setting on both the source and target endpoints for it to take effect.

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_maxFileSize"></a>2.2.1.15.14. Property `root > dms > endpoints > additionalProperties > redshiftSettings > maxFileSize`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The maximum size (in KB) of any .csv file used to load data on an S3 bucket and transfer data to Amazon Redshift. It defaults to 1048576KB (1 GB).

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_removeQuotes"></a>2.2.1.15.15. Property `root > dms > endpoints > additionalProperties > redshiftSettings > removeQuotes`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** A value that specifies to remove surrounding quotation marks from strings in the incoming data.

All characters within the quotation marks, including delimiters, are retained. Choose `true` to remove quotation marks. The default is `false` .

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_replaceChars"></a>2.2.1.15.16. Property `root > dms > endpoints > additionalProperties > redshiftSettings > replaceChars`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A value that specifies to replaces the invalid characters specified in `ReplaceInvalidChars` , substituting the specified characters instead.

The default is `"?"` .

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_replaceInvalidChars"></a>2.2.1.15.17. Property `root > dms > endpoints > additionalProperties > redshiftSettings > replaceInvalidChars`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A list of characters that you want to replace.

Use with `ReplaceChars` .

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_secretsManagerAccessRoleArn"></a>2.2.1.15.18. Property `root > dms > endpoints > additionalProperties > redshiftSettings > secretsManagerAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in `SecretsManagerSecret` .

The role must allow the `iam:PassRole` action. `SecretsManagerSecret` has the value of the AWS Secrets Manager secret that allows access to the Amazon Redshift endpoint.

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_secretsManagerSecretArn"></a>2.2.1.15.19. Property `root > dms > endpoints > additionalProperties > redshiftSettings > secretsManagerSecretArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The full ARN of the `SecretsManagerSecret` that contains the Amazon Redshift endpoint connection details.

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_secretsManagerSecretKMSArn"></a>2.2.1.15.20. Property `root > dms > endpoints > additionalProperties > redshiftSettings > secretsManagerSecretKMSArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The ID of the KMS key used to encrypt the credentials secret.

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_serverSideEncryptionKmsKeyId"></a>2.2.1.15.21. Property `root > dms > endpoints > additionalProperties > redshiftSettings > serverSideEncryptionKmsKeyId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The AWS KMS key ID.

If you are using `SSE_KMS` for the `EncryptionMode` , provide this key ID. The key that you use needs an attached policy that enables IAM user permissions and allows use of the key.

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_serviceAccessRoleArn"></a>2.2.1.15.22. Property `root > dms > endpoints > additionalProperties > redshiftSettings > serviceAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The Amazon Resource Name (ARN) of the IAM role that has access to the Amazon Redshift service.

The role must allow the `iam:PassRole` action.

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_timeFormat"></a>2.2.1.15.23. Property `root > dms > endpoints > additionalProperties > redshiftSettings > timeFormat`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The time format that you want to use.

Valid values are `auto` (case-sensitive), `'timeformat_string'` , `'epochsecs'` , or `'epochmillisecs'` . It defaults to 10. Using `auto` recognizes most strings, even some that aren't supported when you use a time format string.

If your date and time values use formats different from each other, set this parameter to `auto` .

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_trimBlanks"></a>2.2.1.15.24. Property `root > dms > endpoints > additionalProperties > redshiftSettings > trimBlanks`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** A value that specifies to remove the trailing white space characters from a VARCHAR string.

This parameter applies only to columns with a VARCHAR data type. Choose `true` to remove unneeded white space. The default is `false` .

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_truncateColumns"></a>2.2.1.15.25. Property `root > dms > endpoints > additionalProperties > redshiftSettings > truncateColumns`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** A value that specifies to truncate data in columns to the appropriate number of characters, so that the data fits in the column.

This parameter applies only to columns with a VARCHAR or CHAR data type, and rows with a size of 4 MB or less. Choose `true` to truncate data. The default is `false` .

###### <a name="dms_endpoints_additionalProperties_redshiftSettings_writeBufferSize"></a>2.2.1.15.26. Property `root > dms > endpoints > additionalProperties > redshiftSettings > writeBufferSize`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The size (in KB) of the in-memory file write buffer used when generating .csv files on the local disk at the DMS replication instance. The default value is 1000 (buffer size is 1000KB).

##### <a name="dms_endpoints_additionalProperties_s3Settings"></a>2.2.1.16. Property `root > dms > endpoints > additionalProperties > s3Settings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/S3SettingsProperty                        |

**Description:** Settings in JSON format for the source and target Amazon S3 endpoint.

For more information about other available settings, see [Extra connection attributes when using Amazon S3 as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.S3.html#CHAP_Source.S3.Configuring) and [Extra connection attributes when using Amazon S3 as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.Configuring) in the *AWS Database Migration Service User Guide* .

| Property                                                                                                                       | Pattern | Type    | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------ | ------- | ------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [addColumnName](#dms_endpoints_additionalProperties_s3Settings_addColumnName )                                               | No      | boolean | No         | -          | An optional parameter that, when set to \`true\` or \`y\` , you can use to add column name information to the .csv output file.<br /><br />The default value is \`false\` . Valid values are \`true\` , \`false\` , \`y\` , and \`n\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| - [bucketFolder](#dms_endpoints_additionalProperties_s3Settings_bucketFolder )                                                 | No      | string  | No         | -          | An optional parameter to set a folder name in the S3 bucket.<br /><br />If provided, tables are created in the path \`*bucketFolder* / *schema_name* / *table_name* /\` . If this parameter isn't specified, the path used is \`*schema_name* / *table_name* /\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| + [bucketName](#dms_endpoints_additionalProperties_s3Settings_bucketName )                                                     | No      | string  | No         | -          | The name of the S3 bucket.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| - [cannedAclForObjects](#dms_endpoints_additionalProperties_s3Settings_cannedAclForObjects )                                   | No      | string  | No         | -          | A value that enables AWS DMS to specify a predefined (canned) access control list (ACL) for objects created in an Amazon S3 bucket as .csv or .parquet files. For more information about Amazon S3 canned ACLs, see [Canned ACL](https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html#canned-acl) in the *Amazon S3 Developer Guide* .<br /><br />The default value is NONE. Valid values include NONE, PRIVATE, PUBLIC_READ, PUBLIC_READ_WRITE, AUTHENTICATED_READ, AWS_EXEC_READ, BUCKET_OWNER_READ, and BUCKET_OWNER_FULL_CONTROL.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| - [cdcInsertsAndUpdates](#dms_endpoints_additionalProperties_s3Settings_cdcInsertsAndUpdates )                                 | No      | boolean | No         | -          | A value that enables a change data capture (CDC) load to write INSERT and UPDATE operations to .csv or .parquet (columnar storage) output files. The default setting is \`false\` , but when \`CdcInsertsAndUpdates\` is set to \`true\` or \`y\` , only INSERTs and UPDATEs from the source database are migrated to the .csv or .parquet file.<br /><br />For .csv file format only, how these INSERTs and UPDATEs are recorded depends on the value of the \`IncludeOpForFullLoad\` parameter. If \`IncludeOpForFullLoad\` is set to \`true\` , the first field of every CDC record is set to either \`I\` or \`U\` to indicate INSERT and UPDATE operations at the source. But if \`IncludeOpForFullLoad\` is set to \`false\` , CDC records are written without an indication of INSERT or UPDATE operations at the source. For more information about how these settings work together, see [Indicating Source DB Operations in Migrated S3 Data](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.Configuring.InsertOps) in the *AWS Database Migration Service User Guide* .<br /><br />> AWS DMS supports the use of the \`CdcInsertsAndUpdates\` parameter in versions 3.3.1 and later.<br />><br />> \`CdcInsertsOnly\` and \`CdcInsertsAndUpdates\` can't both be set to \`true\` for the same endpoint. Set either \`CdcInsertsOnly\` or \`CdcInsertsAndUpdates\` to \`true\` for the same endpoint, but not both.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| - [cdcInsertsOnly](#dms_endpoints_additionalProperties_s3Settings_cdcInsertsOnly )                                             | No      | boolean | No         | -          | A value that enables a change data capture (CDC) load to write only INSERT operations to .csv or columnar storage (.parquet) output files. By default (the \`false\` setting), the first field in a .csv or .parquet record contains the letter I (INSERT), U (UPDATE), or D (DELETE). These values indicate whether the row was inserted, updated, or deleted at the source database for a CDC load to the target.<br /><br />If \`CdcInsertsOnly\` is set to \`true\` or \`y\` , only INSERTs from the source database are migrated to the .csv or .parquet file. For .csv format only, how these INSERTs are recorded depends on the value of \`IncludeOpForFullLoad\` . If \`IncludeOpForFullLoad\` is set to \`true\` , the first field of every CDC record is set to I to indicate the INSERT operation at the source. If \`IncludeOpForFullLoad\` is set to \`false\` , every CDC record is written without a first field to indicate the INSERT operation at the source. For more information about how these settings work together, see [Indicating Source DB Operations in Migrated S3 Data](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.Configuring.InsertOps) in the *AWS Database Migration Service User Guide* .<br /><br />> AWS DMS supports the interaction described preceding between the \`CdcInsertsOnly\` and \`IncludeOpForFullLoad\` parameters in versions 3.1.4 and later.<br />><br />> \`CdcInsertsOnly\` and \`CdcInsertsAndUpdates\` can't both be set to \`true\` for the same endpoint. Set either \`CdcInsertsOnly\` or \`CdcInsertsAndUpdates\` to \`true\` for the same endpoint, but not both.                                                                                                                                                                                                        |
| - [cdcMaxBatchInterval](#dms_endpoints_additionalProperties_s3Settings_cdcMaxBatchInterval )                                   | No      | number  | No         | -          | Maximum length of the interval, defined in seconds, after which to output a file to Amazon S3.<br /><br />When \`CdcMaxBatchInterval\` and \`CdcMinFileSize\` are both specified, the file write is triggered by whichever parameter condition is met first within an AWS DMS CloudFormation template.<br /><br />The default value is 60 seconds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| - [cdcMinFileSize](#dms_endpoints_additionalProperties_s3Settings_cdcMinFileSize )                                             | No      | number  | No         | -          | Minimum file size, defined in kilobytes, to reach for a file output to Amazon S3.<br /><br />When \`CdcMinFileSize\` and \`CdcMaxBatchInterval\` are both specified, the file write is triggered by whichever parameter condition is met first within an AWS DMS CloudFormation template.<br /><br />The default value is 32 MB.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| - [cdcPath](#dms_endpoints_additionalProperties_s3Settings_cdcPath )                                                           | No      | string  | No         | -          | Specifies the folder path of CDC files.<br /><br />For an S3 source, this setting is required if a task captures change data; otherwise, it's optional. If \`CdcPath\` is set, AWS DMS reads CDC files from this path and replicates the data changes to the target endpoint. For an S3 target if you set [\`PreserveTransactions\`](https://docs.aws.amazon.com/dms/latest/APIReference/API_S3Settings.html#DMS-Type-S3Settings-PreserveTransactions) to \`true\` , AWS DMS verifies that you have set this parameter to a folder path on your S3 target where AWS DMS can save the transaction order for the CDC load. AWS DMS creates this CDC folder path in either your S3 target working directory or the S3 target location specified by [\`BucketFolder\`](https://docs.aws.amazon.com/dms/latest/APIReference/API_S3Settings.html#DMS-Type-S3Settings-BucketFolder) and [\`BucketName\`](https://docs.aws.amazon.com/dms/latest/APIReference/API_S3Settings.html#DMS-Type-S3Settings-BucketName) .<br /><br />For example, if you specify \`CdcPath\` as \`MyChangedData\` , and you specify \`BucketName\` as \`MyTargetBucket\` but do not specify \`BucketFolder\` , AWS DMS creates the CDC folder path following: \`MyTargetBucket/MyChangedData\` .<br /><br />If you specify the same \`CdcPath\` , and you specify \`BucketName\` as \`MyTargetBucket\` and \`BucketFolder\` as \`MyTargetData\` , AWS DMS creates the CDC folder path following: \`MyTargetBucket/MyTargetData/MyChangedData\` .<br /><br />For more information on CDC including transaction order on an S3 target, see [Capturing data changes (CDC) including transaction order on the S3 target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.EndpointSettings.CdcPath) .<br /><br />> This setting is supported in AWS DMS versions 3.4.2 and later. |
| - [compressionType](#dms_endpoints_additionalProperties_s3Settings_compressionType )                                           | No      | string  | No         | -          | An optional parameter.<br /><br />When set to GZIP it enables the service to compress the target files. To allow the service to write the target files uncompressed, either set this parameter to NONE (the default) or don't specify the parameter at all. This parameter applies to both .csv and .parquet file formats.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| - [csvDelimiter](#dms_endpoints_additionalProperties_s3Settings_csvDelimiter )                                                 | No      | string  | No         | -          | The delimiter used to separate columns in the .csv file for both source and target. The default is a comma.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| - [csvNoSupValue](#dms_endpoints_additionalProperties_s3Settings_csvNoSupValue )                                               | No      | string  | No         | -          | This setting only applies if your Amazon S3 output files during a change data capture (CDC) load are written in .csv format. If [\`UseCsvNoSupValue\`](https://docs.aws.amazon.com/dms/latest/APIReference/API_S3Settings.html#DMS-Type-S3Settings-UseCsvNoSupValue) is set to true, specify a string value that you want AWS DMS to use for all columns not included in the supplemental log. If you do not specify a string value, AWS DMS uses the null value for these columns regardless of the \`UseCsvNoSupValue\` setting.<br /><br />> This setting is supported in AWS DMS versions 3.4.1 and later.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| - [csvNullValue](#dms_endpoints_additionalProperties_s3Settings_csvNullValue )                                                 | No      | string  | No         | -          | An optional parameter that specifies how AWS DMS treats null values.<br /><br />While handling the null value, you can use this parameter to pass a user-defined string as null when writing to the target. For example, when target columns are not nullable, you can use this option to differentiate between the empty string value and the null value. So, if you set this parameter value to the empty string ("" or ''), AWS DMS treats the empty string as the null value instead of \`NULL\` .<br /><br />The default value is \`NULL\` . Valid values include any valid string.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| - [csvRowDelimiter](#dms_endpoints_additionalProperties_s3Settings_csvRowDelimiter )                                           | No      | string  | No         | -          | The delimiter used to separate rows in the .csv file for both source and target.<br /><br />The default is a carriage return ( \`\n\` ).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| - [dataFormat](#dms_endpoints_additionalProperties_s3Settings_dataFormat )                                                     | No      | string  | No         | -          | The format of the data that you want to use for output. You can choose one of the following:.<br /><br />- \`csv\` : This is a row-based file format with comma-separated values (.csv).<br />- \`parquet\` : Apache Parquet (.parquet) is a columnar storage file format that features efficient compression and provides faster query response.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [dataPageSize](#dms_endpoints_additionalProperties_s3Settings_dataPageSize )                                                 | No      | number  | No         | -          | The size of one data page in bytes.<br /><br />This parameter defaults to 1024 * 1024 bytes (1 MiB). This number is used for .parquet file format only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| - [datePartitionDelimiter](#dms_endpoints_additionalProperties_s3Settings_datePartitionDelimiter )                             | No      | string  | No         | -          | Specifies a date separating delimiter to use during folder partitioning.<br /><br />The default value is \`SLASH\` . Use this parameter when \`DatePartitionedEnabled\` is set to \`true\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| - [datePartitionEnabled](#dms_endpoints_additionalProperties_s3Settings_datePartitionEnabled )                                 | No      | boolean | No         | -          | When set to \`true\` , this parameter partitions S3 bucket folders based on transaction commit dates.<br /><br />The default value is \`false\` . For more information about date-based folder partitioning, see [Using date-based folder partitioning](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.DatePartitioning) .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| - [datePartitionSequence](#dms_endpoints_additionalProperties_s3Settings_datePartitionSequence )                               | No      | string  | No         | -          | Identifies the sequence of the date format to use during folder partitioning.<br /><br />The default value is \`YYYYMMDD\` . Use this parameter when \`DatePartitionedEnabled\` is set to \`true\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| - [datePartitionTimezone](#dms_endpoints_additionalProperties_s3Settings_datePartitionTimezone )                               | No      | string  | No         | -          | When creating an S3 target endpoint, set \`DatePartitionTimezone\` to convert the current UTC time into a specified time zone.<br /><br />The conversion occurs when a date partition folder is created and a change data capture (CDC) file name is generated. The time zone format is Area/Location. Use this parameter when \`DatePartitionedEnabled\` is set to \`true\` , as shown in the following example.<br /><br />\`s3-settings='{"DatePartitionEnabled": true, "DatePartitionSequence": "YYYYMMDDHH", "DatePartitionDelimiter": "SLASH", "DatePartitionTimezone":" *Asia/Seoul* ", "BucketName": "dms-nattarat-test"}'\`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| - [dictPageSizeLimit](#dms_endpoints_additionalProperties_s3Settings_dictPageSizeLimit )                                       | No      | number  | No         | -          | The maximum size of an encoded dictionary page of a column.<br /><br />If the dictionary page exceeds this, this column is stored using an encoding type of \`PLAIN\` . This parameter defaults to 1024 * 1024 bytes (1 MiB), the maximum size of a dictionary page before it reverts to \`PLAIN\` encoding. This size is used for .parquet file format only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| - [enableStatistics](#dms_endpoints_additionalProperties_s3Settings_enableStatistics )                                         | No      | boolean | No         | -          | A value that enables statistics for Parquet pages and row groups.<br /><br />Choose \`true\` to enable statistics, \`false\` to disable. Statistics include \`NULL\` , \`DISTINCT\` , \`MAX\` , and \`MIN\` values. This parameter defaults to \`true\` . This value is used for .parquet file format only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| - [encodingType](#dms_endpoints_additionalProperties_s3Settings_encodingType )                                                 | No      | string  | No         | -          | The type of encoding that you're using:.<br /><br />- \`RLE_DICTIONARY\` uses a combination of bit-packing and run-length encoding to store repeated values more efficiently. This is the default.<br />- \`PLAIN\` doesn't use encoding at all. Values are stored as they are.<br />- \`PLAIN_DICTIONARY\` builds a dictionary of the values encountered in a given column. The dictionary is stored in a dictionary page for each column chunk.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [externalTableDefinition](#dms_endpoints_additionalProperties_s3Settings_externalTableDefinition )                           | No      | string  | No         | -          | The external table definition.<br /><br />Conditional: If \`S3\` is used as a source then \`ExternalTableDefinition\` is required.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| - [ignoreHeaderRows](#dms_endpoints_additionalProperties_s3Settings_ignoreHeaderRows )                                         | No      | number  | No         | -          | When this value is set to 1, AWS DMS ignores the first row header in a .csv file. A value of 1 turns on the feature; a value of 0 turns off the feature.<br /><br />The default is 0.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| - [includeOpForFullLoad](#dms_endpoints_additionalProperties_s3Settings_includeOpForFullLoad )                                 | No      | boolean | No         | -          | A value that enables a full load to write INSERT operations to the comma-separated value (.csv) output files only to indicate how the rows were added to the source database.<br /><br />> AWS DMS supports the \`IncludeOpForFullLoad\` parameter in versions 3.1.4 and later.<br /><br />For full load, records can only be inserted. By default (the \`false\` setting), no information is recorded in these output files for a full load to indicate that the rows were inserted at the source database. If \`IncludeOpForFullLoad\` is set to \`true\` or \`y\` , the INSERT is recorded as an I annotation in the first field of the .csv file. This allows the format of your target records from a full load to be consistent with the target records from a CDC load.<br /><br />> This setting works together with the \`CdcInsertsOnly\` and the \`CdcInsertsAndUpdates\` parameters for output to .csv files only. For more information about how these settings work together, see [Indicating Source DB Operations in Migrated S3 Data](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.Configuring.InsertOps) in the *AWS Database Migration Service User Guide* .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| - [maxFileSize](#dms_endpoints_additionalProperties_s3Settings_maxFileSize )                                                   | No      | number  | No         | -          | A value that specifies the maximum size (in KB) of any .csv file to be created while migrating to an S3 target during full load.<br /><br />The default value is 1,048,576 KB (1 GB). Valid values include 1 to 1,048,576.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| - [parquetTimestampInMillisecond](#dms_endpoints_additionalProperties_s3Settings_parquetTimestampInMillisecond )               | No      | boolean | No         | -          | A value that specifies the precision of any \`TIMESTAMP\` column values that are written to an Amazon S3 object file in .parquet format.<br /><br />> AWS DMS supports the \`ParquetTimestampInMillisecond\` parameter in versions 3.1.4 and later.<br /><br />When \`ParquetTimestampInMillisecond\` is set to \`true\` or \`y\` , AWS DMS writes all \`TIMESTAMP\` columns in a .parquet formatted file with millisecond precision. Otherwise, DMS writes them with microsecond precision.<br /><br />Currently, Amazon Athena and AWS Glue can handle only millisecond precision for \`TIMESTAMP\` values. Set this parameter to \`true\` for S3 endpoint object files that are .parquet formatted only if you plan to query or process the data with Athena or AWS Glue .<br /><br />> AWS DMS writes any \`TIMESTAMP\` column values written to an S3 file in .csv format with microsecond precision.<br />><br />> Setting \`ParquetTimestampInMillisecond\` has no effect on the string format of the timestamp column value that is inserted by setting the \`TimestampColumnName\` parameter.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| - [parquetVersion](#dms_endpoints_additionalProperties_s3Settings_parquetVersion )                                             | No      | string  | No         | -          | The version of the Apache Parquet format that you want to use: \`parquet_1_0\` (the default) or \`parquet_2_0\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [preserveTransactions](#dms_endpoints_additionalProperties_s3Settings_preserveTransactions )                                 | No      | boolean | No         | -          | If this setting is set to \`true\` , AWS DMS saves the transaction order for a change data capture (CDC) load on the Amazon S3 target specified by [\`CdcPath\`](https://docs.aws.amazon.com/dms/latest/APIReference/API_S3Settings.html#DMS-Type-S3Settings-CdcPath) . For more information, see [Capturing data changes (CDC) including transaction order on the S3 target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.EndpointSettings.CdcPath) .<br /><br />> This setting is supported in AWS DMS versions 3.4.2 and later.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| - [rfc4180](#dms_endpoints_additionalProperties_s3Settings_rfc4180 )                                                           | No      | boolean | No         | -          | For an S3 source, when this value is set to \`true\` or \`y\` , each leading double quotation mark has to be followed by an ending double quotation mark.<br /><br />This formatting complies with RFC 4180. When this value is set to \`false\` or \`n\` , string literals are copied to the target as is. In this case, a delimiter (row or column) signals the end of the field. Thus, you can't use a delimiter as part of the string, because it signals the end of the value.<br /><br />For an S3 target, an optional parameter used to set behavior to comply with RFC 4180 for data migrated to Amazon S3 using .csv file format only. When this value is set to \`true\` or \`y\` using Amazon S3 as a target, if the data has quotation marks or newline characters in it, AWS DMS encloses the entire column with an additional pair of double quotation marks ("). Every quotation mark within the data is repeated twice.<br /><br />The default value is \`true\` . Valid values include \`true\` , \`false\` , \`y\` , and \`n\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| - [rowGroupLength](#dms_endpoints_additionalProperties_s3Settings_rowGroupLength )                                             | No      | number  | No         | -          | The number of rows in a row group.<br /><br />A smaller row group size provides faster reads. But as the number of row groups grows, the slower writes become. This parameter defaults to 10,000 rows. This number is used for .parquet file format only.<br /><br />If you choose a value larger than the maximum, \`RowGroupLength\` is set to the max row group length in bytes (64 * 1024 * 1024).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| + [serverSideEncryptionKmsKeyId](#dms_endpoints_additionalProperties_s3Settings_serverSideEncryptionKmsKeyId )                 | No      | string  | No         | -          | If you are using \`SSE_KMS\` for the \`EncryptionMode\` , provide the AWS KMS key ID.<br /><br />The key that you use needs an attached policy that enables IAM user permissions and allows use of the key.<br /><br />Here is a CLI example: \`aws dms create-endpoint --endpoint-identifier *value* --endpoint-type target --engine-name s3 --s3-settings ServiceAccessRoleArn= *value* ,BucketFolder= *value* ,BucketName= *value* ,EncryptionMode=SSE_KMS,ServerSideEncryptionKmsKeyId= *value*\`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| - [serviceAccessRoleArn](#dms_endpoints_additionalProperties_s3Settings_serviceAccessRoleArn )                                 | No      | string  | No         | -          | A required parameter that specifies the Amazon Resource Name (ARN) used by the service to access the IAM role.<br /><br />The role must allow the \`iam:PassRole\` action. It enables AWS DMS to read and write objects from an S3 bucket.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| - [timestampColumnName](#dms_endpoints_additionalProperties_s3Settings_timestampColumnName )                                   | No      | string  | No         | -          | A value that when nonblank causes AWS DMS to add a column with timestamp information to the endpoint data for an Amazon S3 target.<br /><br />> AWS DMS supports the \`TimestampColumnName\` parameter in versions 3.1.4 and later.<br /><br />AWS DMS includes an additional \`STRING\` column in the .csv or .parquet object files of your migrated data when you set \`TimestampColumnName\` to a nonblank value.<br /><br />For a full load, each row of this timestamp column contains a timestamp for when the data was transferred from the source to the target by DMS.<br /><br />For a change data capture (CDC) load, each row of the timestamp column contains the timestamp for the commit of that row in the source database.<br /><br />The string format for this timestamp column value is \`yyyy-MM-dd HH:mm:ss.SSSSSS\` . By default, the precision of this value is in microseconds. For a CDC load, the rounding of the precision depends on the commit timestamp supported by DMS for the source database.<br /><br />When the \`AddColumnName\` parameter is set to \`true\` , DMS also includes a name for the timestamp column that you set with \`TimestampColumnName\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| - [useCsvNoSupValue](#dms_endpoints_additionalProperties_s3Settings_useCsvNoSupValue )                                         | No      | boolean | No         | -          | This setting applies if the S3 output files during a change data capture (CDC) load are written in .csv format. If this setting is set to \`true\` for columns not included in the supplemental log, AWS DMS uses the value specified by [\`CsvNoSupValue\`](https://docs.aws.amazon.com/dms/latest/APIReference/API_S3Settings.html#DMS-Type-S3Settings-CsvNoSupValue) . If this setting isn't set or is set to \`false\` , AWS DMS uses the null value for these columns.<br /><br />> This setting is supported in AWS DMS versions 3.4.1 and later.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| - [useTaskStartTimeForFullLoadTimestamp](#dms_endpoints_additionalProperties_s3Settings_useTaskStartTimeForFullLoadTimestamp ) | No      | boolean | No         | -          | When set to true, this parameter uses the task start time as the timestamp column value instead of the time data is written to target.<br /><br />For full load, when \`useTaskStartTimeForFullLoadTimestamp\` is set to \`true\` , each row of the timestamp column contains the task start time. For CDC loads, each row of the timestamp column contains the transaction commit time.<br /><br />When \`useTaskStartTimeForFullLoadTimestamp\` is set to \`false\` , the full load timestamp in the timestamp column increments with the time data arrives at the target.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

###### <a name="dms_endpoints_additionalProperties_s3Settings_addColumnName"></a>2.2.1.16.1. Property `root > dms > endpoints > additionalProperties > s3Settings > addColumnName`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** An optional parameter that, when set to `true` or `y` , you can use to add column name information to the .csv output file.

The default value is `false` . Valid values are `true` , `false` , `y` , and `n` .

###### <a name="dms_endpoints_additionalProperties_s3Settings_bucketFolder"></a>2.2.1.16.2. Property `root > dms > endpoints > additionalProperties > s3Settings > bucketFolder`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** An optional parameter to set a folder name in the S3 bucket.

If provided, tables are created in the path `*bucketFolder* / *schema_name* / *table_name* /` . If this parameter isn't specified, the path used is `*schema_name* / *table_name* /` .

###### <a name="dms_endpoints_additionalProperties_s3Settings_bucketName"></a>2.2.1.16.3. Property `root > dms > endpoints > additionalProperties > s3Settings > bucketName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the S3 bucket.

###### <a name="dms_endpoints_additionalProperties_s3Settings_cannedAclForObjects"></a>2.2.1.16.4. Property `root > dms > endpoints > additionalProperties > s3Settings > cannedAclForObjects`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A value that enables AWS DMS to specify a predefined (canned) access control list (ACL) for objects created in an Amazon S3 bucket as .csv or .parquet files. For more information about Amazon S3 canned ACLs, see [Canned ACL](https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html#canned-acl) in the *Amazon S3 Developer Guide* .

The default value is NONE. Valid values include NONE, PRIVATE, PUBLIC_READ, PUBLIC_READ_WRITE, AUTHENTICATED_READ, AWS_EXEC_READ, BUCKET_OWNER_READ, and BUCKET_OWNER_FULL_CONTROL.

###### <a name="dms_endpoints_additionalProperties_s3Settings_cdcInsertsAndUpdates"></a>2.2.1.16.5. Property `root > dms > endpoints > additionalProperties > s3Settings > cdcInsertsAndUpdates`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** A value that enables a change data capture (CDC) load to write INSERT and UPDATE operations to .csv or .parquet (columnar storage) output files. The default setting is `false` , but when `CdcInsertsAndUpdates` is set to `true` or `y` , only INSERTs and UPDATEs from the source database are migrated to the .csv or .parquet file.

For .csv file format only, how these INSERTs and UPDATEs are recorded depends on the value of the `IncludeOpForFullLoad` parameter. If `IncludeOpForFullLoad` is set to `true` , the first field of every CDC record is set to either `I` or `U` to indicate INSERT and UPDATE operations at the source. But if `IncludeOpForFullLoad` is set to `false` , CDC records are written without an indication of INSERT or UPDATE operations at the source. For more information about how these settings work together, see [Indicating Source DB Operations in Migrated S3 Data](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.Configuring.InsertOps) in the *AWS Database Migration Service User Guide* .

> AWS DMS supports the use of the `CdcInsertsAndUpdates` parameter in versions 3.3.1 and later.
>
> `CdcInsertsOnly` and `CdcInsertsAndUpdates` can't both be set to `true` for the same endpoint. Set either `CdcInsertsOnly` or `CdcInsertsAndUpdates` to `true` for the same endpoint, but not both.

###### <a name="dms_endpoints_additionalProperties_s3Settings_cdcInsertsOnly"></a>2.2.1.16.6. Property `root > dms > endpoints > additionalProperties > s3Settings > cdcInsertsOnly`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** A value that enables a change data capture (CDC) load to write only INSERT operations to .csv or columnar storage (.parquet) output files. By default (the `false` setting), the first field in a .csv or .parquet record contains the letter I (INSERT), U (UPDATE), or D (DELETE). These values indicate whether the row was inserted, updated, or deleted at the source database for a CDC load to the target.

If `CdcInsertsOnly` is set to `true` or `y` , only INSERTs from the source database are migrated to the .csv or .parquet file. For .csv format only, how these INSERTs are recorded depends on the value of `IncludeOpForFullLoad` . If `IncludeOpForFullLoad` is set to `true` , the first field of every CDC record is set to I to indicate the INSERT operation at the source. If `IncludeOpForFullLoad` is set to `false` , every CDC record is written without a first field to indicate the INSERT operation at the source. For more information about how these settings work together, see [Indicating Source DB Operations in Migrated S3 Data](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.Configuring.InsertOps) in the *AWS Database Migration Service User Guide* .

> AWS DMS supports the interaction described preceding between the `CdcInsertsOnly` and `IncludeOpForFullLoad` parameters in versions 3.1.4 and later.
>
> `CdcInsertsOnly` and `CdcInsertsAndUpdates` can't both be set to `true` for the same endpoint. Set either `CdcInsertsOnly` or `CdcInsertsAndUpdates` to `true` for the same endpoint, but not both.

###### <a name="dms_endpoints_additionalProperties_s3Settings_cdcMaxBatchInterval"></a>2.2.1.16.7. Property `root > dms > endpoints > additionalProperties > s3Settings > cdcMaxBatchInterval`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Maximum length of the interval, defined in seconds, after which to output a file to Amazon S3.

When `CdcMaxBatchInterval` and `CdcMinFileSize` are both specified, the file write is triggered by whichever parameter condition is met first within an AWS DMS CloudFormation template.

The default value is 60 seconds.

###### <a name="dms_endpoints_additionalProperties_s3Settings_cdcMinFileSize"></a>2.2.1.16.8. Property `root > dms > endpoints > additionalProperties > s3Settings > cdcMinFileSize`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Minimum file size, defined in kilobytes, to reach for a file output to Amazon S3.

When `CdcMinFileSize` and `CdcMaxBatchInterval` are both specified, the file write is triggered by whichever parameter condition is met first within an AWS DMS CloudFormation template.

The default value is 32 MB.

###### <a name="dms_endpoints_additionalProperties_s3Settings_cdcPath"></a>2.2.1.16.9. Property `root > dms > endpoints > additionalProperties > s3Settings > cdcPath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies the folder path of CDC files.

For an S3 source, this setting is required if a task captures change data; otherwise, it's optional. If `CdcPath` is set, AWS DMS reads CDC files from this path and replicates the data changes to the target endpoint. For an S3 target if you set [`PreserveTransactions`](https://docs.aws.amazon.com/dms/latest/APIReference/API_S3Settings.html#DMS-Type-S3Settings-PreserveTransactions) to `true` , AWS DMS verifies that you have set this parameter to a folder path on your S3 target where AWS DMS can save the transaction order for the CDC load. AWS DMS creates this CDC folder path in either your S3 target working directory or the S3 target location specified by [`BucketFolder`](https://docs.aws.amazon.com/dms/latest/APIReference/API_S3Settings.html#DMS-Type-S3Settings-BucketFolder) and [`BucketName`](https://docs.aws.amazon.com/dms/latest/APIReference/API_S3Settings.html#DMS-Type-S3Settings-BucketName) .

For example, if you specify `CdcPath` as `MyChangedData` , and you specify `BucketName` as `MyTargetBucket` but do not specify `BucketFolder` , AWS DMS creates the CDC folder path following: `MyTargetBucket/MyChangedData` .

If you specify the same `CdcPath` , and you specify `BucketName` as `MyTargetBucket` and `BucketFolder` as `MyTargetData` , AWS DMS creates the CDC folder path following: `MyTargetBucket/MyTargetData/MyChangedData` .

For more information on CDC including transaction order on an S3 target, see [Capturing data changes (CDC) including transaction order on the S3 target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.EndpointSettings.CdcPath) .

> This setting is supported in AWS DMS versions 3.4.2 and later.

###### <a name="dms_endpoints_additionalProperties_s3Settings_compressionType"></a>2.2.1.16.10. Property `root > dms > endpoints > additionalProperties > s3Settings > compressionType`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** An optional parameter.

When set to GZIP it enables the service to compress the target files. To allow the service to write the target files uncompressed, either set this parameter to NONE (the default) or don't specify the parameter at all. This parameter applies to both .csv and .parquet file formats.

###### <a name="dms_endpoints_additionalProperties_s3Settings_csvDelimiter"></a>2.2.1.16.11. Property `root > dms > endpoints > additionalProperties > s3Settings > csvDelimiter`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The delimiter used to separate columns in the .csv file for both source and target. The default is a comma.

###### <a name="dms_endpoints_additionalProperties_s3Settings_csvNoSupValue"></a>2.2.1.16.12. Property `root > dms > endpoints > additionalProperties > s3Settings > csvNoSupValue`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** This setting only applies if your Amazon S3 output files during a change data capture (CDC) load are written in .csv format. If [`UseCsvNoSupValue`](https://docs.aws.amazon.com/dms/latest/APIReference/API_S3Settings.html#DMS-Type-S3Settings-UseCsvNoSupValue) is set to true, specify a string value that you want AWS DMS to use for all columns not included in the supplemental log. If you do not specify a string value, AWS DMS uses the null value for these columns regardless of the `UseCsvNoSupValue` setting.

> This setting is supported in AWS DMS versions 3.4.1 and later.

###### <a name="dms_endpoints_additionalProperties_s3Settings_csvNullValue"></a>2.2.1.16.13. Property `root > dms > endpoints > additionalProperties > s3Settings > csvNullValue`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** An optional parameter that specifies how AWS DMS treats null values.

While handling the null value, you can use this parameter to pass a user-defined string as null when writing to the target. For example, when target columns are not nullable, you can use this option to differentiate between the empty string value and the null value. So, if you set this parameter value to the empty string ("" or ''), AWS DMS treats the empty string as the null value instead of `NULL` .

The default value is `NULL` . Valid values include any valid string.

###### <a name="dms_endpoints_additionalProperties_s3Settings_csvRowDelimiter"></a>2.2.1.16.14. Property `root > dms > endpoints > additionalProperties > s3Settings > csvRowDelimiter`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The delimiter used to separate rows in the .csv file for both source and target.

The default is a carriage return ( `\n` ).

###### <a name="dms_endpoints_additionalProperties_s3Settings_dataFormat"></a>2.2.1.16.15. Property `root > dms > endpoints > additionalProperties > s3Settings > dataFormat`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The format of the data that you want to use for output. You can choose one of the following:.

- `csv` : This is a row-based file format with comma-separated values (.csv).
- `parquet` : Apache Parquet (.parquet) is a columnar storage file format that features efficient compression and provides faster query response.

###### <a name="dms_endpoints_additionalProperties_s3Settings_dataPageSize"></a>2.2.1.16.16. Property `root > dms > endpoints > additionalProperties > s3Settings > dataPageSize`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The size of one data page in bytes.

This parameter defaults to 1024 * 1024 bytes (1 MiB). This number is used for .parquet file format only.

###### <a name="dms_endpoints_additionalProperties_s3Settings_datePartitionDelimiter"></a>2.2.1.16.17. Property `root > dms > endpoints > additionalProperties > s3Settings > datePartitionDelimiter`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies a date separating delimiter to use during folder partitioning.

The default value is `SLASH` . Use this parameter when `DatePartitionedEnabled` is set to `true` .

###### <a name="dms_endpoints_additionalProperties_s3Settings_datePartitionEnabled"></a>2.2.1.16.18. Property `root > dms > endpoints > additionalProperties > s3Settings > datePartitionEnabled`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** When set to `true` , this parameter partitions S3 bucket folders based on transaction commit dates.

The default value is `false` . For more information about date-based folder partitioning, see [Using date-based folder partitioning](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.DatePartitioning) .

###### <a name="dms_endpoints_additionalProperties_s3Settings_datePartitionSequence"></a>2.2.1.16.19. Property `root > dms > endpoints > additionalProperties > s3Settings > datePartitionSequence`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Identifies the sequence of the date format to use during folder partitioning.

The default value is `YYYYMMDD` . Use this parameter when `DatePartitionedEnabled` is set to `true` .

###### <a name="dms_endpoints_additionalProperties_s3Settings_datePartitionTimezone"></a>2.2.1.16.20. Property `root > dms > endpoints > additionalProperties > s3Settings > datePartitionTimezone`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** When creating an S3 target endpoint, set `DatePartitionTimezone` to convert the current UTC time into a specified time zone.

The conversion occurs when a date partition folder is created and a change data capture (CDC) file name is generated. The time zone format is Area/Location. Use this parameter when `DatePartitionedEnabled` is set to `true` , as shown in the following example.

`s3-settings='{"DatePartitionEnabled": true, "DatePartitionSequence": "YYYYMMDDHH", "DatePartitionDelimiter": "SLASH", "DatePartitionTimezone":" *Asia/Seoul* ", "BucketName": "dms-nattarat-test"}'`

###### <a name="dms_endpoints_additionalProperties_s3Settings_dictPageSizeLimit"></a>2.2.1.16.21. Property `root > dms > endpoints > additionalProperties > s3Settings > dictPageSizeLimit`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The maximum size of an encoded dictionary page of a column.

If the dictionary page exceeds this, this column is stored using an encoding type of `PLAIN` . This parameter defaults to 1024 * 1024 bytes (1 MiB), the maximum size of a dictionary page before it reverts to `PLAIN` encoding. This size is used for .parquet file format only.

###### <a name="dms_endpoints_additionalProperties_s3Settings_enableStatistics"></a>2.2.1.16.22. Property `root > dms > endpoints > additionalProperties > s3Settings > enableStatistics`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** A value that enables statistics for Parquet pages and row groups.

Choose `true` to enable statistics, `false` to disable. Statistics include `NULL` , `DISTINCT` , `MAX` , and `MIN` values. This parameter defaults to `true` . This value is used for .parquet file format only.

###### <a name="dms_endpoints_additionalProperties_s3Settings_encodingType"></a>2.2.1.16.23. Property `root > dms > endpoints > additionalProperties > s3Settings > encodingType`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The type of encoding that you're using:.

- `RLE_DICTIONARY` uses a combination of bit-packing and run-length encoding to store repeated values more efficiently. This is the default.
- `PLAIN` doesn't use encoding at all. Values are stored as they are.
- `PLAIN_DICTIONARY` builds a dictionary of the values encountered in a given column. The dictionary is stored in a dictionary page for each column chunk.

###### <a name="dms_endpoints_additionalProperties_s3Settings_externalTableDefinition"></a>2.2.1.16.24. Property `root > dms > endpoints > additionalProperties > s3Settings > externalTableDefinition`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The external table definition.

Conditional: If `S3` is used as a source then `ExternalTableDefinition` is required.

###### <a name="dms_endpoints_additionalProperties_s3Settings_ignoreHeaderRows"></a>2.2.1.16.25. Property `root > dms > endpoints > additionalProperties > s3Settings > ignoreHeaderRows`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** When this value is set to 1, AWS DMS ignores the first row header in a .csv file. A value of 1 turns on the feature; a value of 0 turns off the feature.

The default is 0.

###### <a name="dms_endpoints_additionalProperties_s3Settings_includeOpForFullLoad"></a>2.2.1.16.26. Property `root > dms > endpoints > additionalProperties > s3Settings > includeOpForFullLoad`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** A value that enables a full load to write INSERT operations to the comma-separated value (.csv) output files only to indicate how the rows were added to the source database.

> AWS DMS supports the `IncludeOpForFullLoad` parameter in versions 3.1.4 and later.

For full load, records can only be inserted. By default (the `false` setting), no information is recorded in these output files for a full load to indicate that the rows were inserted at the source database. If `IncludeOpForFullLoad` is set to `true` or `y` , the INSERT is recorded as an I annotation in the first field of the .csv file. This allows the format of your target records from a full load to be consistent with the target records from a CDC load.

> This setting works together with the `CdcInsertsOnly` and the `CdcInsertsAndUpdates` parameters for output to .csv files only. For more information about how these settings work together, see [Indicating Source DB Operations in Migrated S3 Data](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.Configuring.InsertOps) in the *AWS Database Migration Service User Guide* .

###### <a name="dms_endpoints_additionalProperties_s3Settings_maxFileSize"></a>2.2.1.16.27. Property `root > dms > endpoints > additionalProperties > s3Settings > maxFileSize`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** A value that specifies the maximum size (in KB) of any .csv file to be created while migrating to an S3 target during full load.

The default value is 1,048,576 KB (1 GB). Valid values include 1 to 1,048,576.

###### <a name="dms_endpoints_additionalProperties_s3Settings_parquetTimestampInMillisecond"></a>2.2.1.16.28. Property `root > dms > endpoints > additionalProperties > s3Settings > parquetTimestampInMillisecond`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** A value that specifies the precision of any `TIMESTAMP` column values that are written to an Amazon S3 object file in .parquet format.

> AWS DMS supports the `ParquetTimestampInMillisecond` parameter in versions 3.1.4 and later.

When `ParquetTimestampInMillisecond` is set to `true` or `y` , AWS DMS writes all `TIMESTAMP` columns in a .parquet formatted file with millisecond precision. Otherwise, DMS writes them with microsecond precision.

Currently, Amazon Athena and AWS Glue can handle only millisecond precision for `TIMESTAMP` values. Set this parameter to `true` for S3 endpoint object files that are .parquet formatted only if you plan to query or process the data with Athena or AWS Glue .

> AWS DMS writes any `TIMESTAMP` column values written to an S3 file in .csv format with microsecond precision.
>
> Setting `ParquetTimestampInMillisecond` has no effect on the string format of the timestamp column value that is inserted by setting the `TimestampColumnName` parameter.

###### <a name="dms_endpoints_additionalProperties_s3Settings_parquetVersion"></a>2.2.1.16.29. Property `root > dms > endpoints > additionalProperties > s3Settings > parquetVersion`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The version of the Apache Parquet format that you want to use: `parquet_1_0` (the default) or `parquet_2_0` .

###### <a name="dms_endpoints_additionalProperties_s3Settings_preserveTransactions"></a>2.2.1.16.30. Property `root > dms > endpoints > additionalProperties > s3Settings > preserveTransactions`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If this setting is set to `true` , AWS DMS saves the transaction order for a change data capture (CDC) load on the Amazon S3 target specified by [`CdcPath`](https://docs.aws.amazon.com/dms/latest/APIReference/API_S3Settings.html#DMS-Type-S3Settings-CdcPath) . For more information, see [Capturing data changes (CDC) including transaction order on the S3 target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.EndpointSettings.CdcPath) .

> This setting is supported in AWS DMS versions 3.4.2 and later.

###### <a name="dms_endpoints_additionalProperties_s3Settings_rfc4180"></a>2.2.1.16.31. Property `root > dms > endpoints > additionalProperties > s3Settings > rfc4180`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** For an S3 source, when this value is set to `true` or `y` , each leading double quotation mark has to be followed by an ending double quotation mark.

This formatting complies with RFC 4180. When this value is set to `false` or `n` , string literals are copied to the target as is. In this case, a delimiter (row or column) signals the end of the field. Thus, you can't use a delimiter as part of the string, because it signals the end of the value.

For an S3 target, an optional parameter used to set behavior to comply with RFC 4180 for data migrated to Amazon S3 using .csv file format only. When this value is set to `true` or `y` using Amazon S3 as a target, if the data has quotation marks or newline characters in it, AWS DMS encloses the entire column with an additional pair of double quotation marks ("). Every quotation mark within the data is repeated twice.

The default value is `true` . Valid values include `true` , `false` , `y` , and `n` .

###### <a name="dms_endpoints_additionalProperties_s3Settings_rowGroupLength"></a>2.2.1.16.32. Property `root > dms > endpoints > additionalProperties > s3Settings > rowGroupLength`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The number of rows in a row group.

A smaller row group size provides faster reads. But as the number of row groups grows, the slower writes become. This parameter defaults to 10,000 rows. This number is used for .parquet file format only.

If you choose a value larger than the maximum, `RowGroupLength` is set to the max row group length in bytes (64 * 1024 * 1024).

###### <a name="dms_endpoints_additionalProperties_s3Settings_serverSideEncryptionKmsKeyId"></a>2.2.1.16.33. Property `root > dms > endpoints > additionalProperties > s3Settings > serverSideEncryptionKmsKeyId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** If you are using `SSE_KMS` for the `EncryptionMode` , provide the AWS KMS key ID.

The key that you use needs an attached policy that enables IAM user permissions and allows use of the key.

Here is a CLI example: `aws dms create-endpoint --endpoint-identifier *value* --endpoint-type target --engine-name s3 --s3-settings ServiceAccessRoleArn= *value* ,BucketFolder= *value* ,BucketName= *value* ,EncryptionMode=SSE_KMS,ServerSideEncryptionKmsKeyId= *value*`

###### <a name="dms_endpoints_additionalProperties_s3Settings_serviceAccessRoleArn"></a>2.2.1.16.34. Property `root > dms > endpoints > additionalProperties > s3Settings > serviceAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A required parameter that specifies the Amazon Resource Name (ARN) used by the service to access the IAM role.

The role must allow the `iam:PassRole` action. It enables AWS DMS to read and write objects from an S3 bucket.

###### <a name="dms_endpoints_additionalProperties_s3Settings_timestampColumnName"></a>2.2.1.16.35. Property `root > dms > endpoints > additionalProperties > s3Settings > timestampColumnName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A value that when nonblank causes AWS DMS to add a column with timestamp information to the endpoint data for an Amazon S3 target.

> AWS DMS supports the `TimestampColumnName` parameter in versions 3.1.4 and later.

AWS DMS includes an additional `STRING` column in the .csv or .parquet object files of your migrated data when you set `TimestampColumnName` to a nonblank value.

For a full load, each row of this timestamp column contains a timestamp for when the data was transferred from the source to the target by DMS.

For a change data capture (CDC) load, each row of the timestamp column contains the timestamp for the commit of that row in the source database.

The string format for this timestamp column value is `yyyy-MM-dd HH:mm:ss.SSSSSS` . By default, the precision of this value is in microseconds. For a CDC load, the rounding of the precision depends on the commit timestamp supported by DMS for the source database.

When the `AddColumnName` parameter is set to `true` , DMS also includes a name for the timestamp column that you set with `TimestampColumnName` .

###### <a name="dms_endpoints_additionalProperties_s3Settings_useCsvNoSupValue"></a>2.2.1.16.36. Property `root > dms > endpoints > additionalProperties > s3Settings > useCsvNoSupValue`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** This setting applies if the S3 output files during a change data capture (CDC) load are written in .csv format. If this setting is set to `true` for columns not included in the supplemental log, AWS DMS uses the value specified by [`CsvNoSupValue`](https://docs.aws.amazon.com/dms/latest/APIReference/API_S3Settings.html#DMS-Type-S3Settings-CsvNoSupValue) . If this setting isn't set or is set to `false` , AWS DMS uses the null value for these columns.

> This setting is supported in AWS DMS versions 3.4.1 and later.

###### <a name="dms_endpoints_additionalProperties_s3Settings_useTaskStartTimeForFullLoadTimestamp"></a>2.2.1.16.37. Property `root > dms > endpoints > additionalProperties > s3Settings > useTaskStartTimeForFullLoadTimestamp`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** When set to true, this parameter uses the task start time as the timestamp column value instead of the time data is written to target.

For full load, when `useTaskStartTimeForFullLoadTimestamp` is set to `true` , each row of the timestamp column contains the task start time. For CDC loads, each row of the timestamp column contains the transaction commit time.

When `useTaskStartTimeForFullLoadTimestamp` is set to `false` , the full load timestamp in the timestamp column increments with the time data arrives at the target.

##### <a name="dms_endpoints_additionalProperties_sybaseSettings"></a>2.2.1.17. Property `root > dms > endpoints > additionalProperties > sybaseSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/SybaseSettingsProperty                    |

**Description:** Settings in JSON format for the source and target SAP ASE endpoint.

For information about other available settings, see [Extra connection attributes when using SAP ASE as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.SAP.html#CHAP_Source.SAP.ConnectionAttrib) and [Extra connection attributes when using SAP ASE as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.SAP.html#CHAP_Target.SAP.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .

| Property                                                                                                         | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [secretsManagerAccessRoleArn](#dms_endpoints_additionalProperties_sybaseSettings_secretsManagerAccessRoleArn ) | No      | string | No         | -          | The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in \`SecretsManagerSecret\` .<br /><br />The role must allow the \`iam:PassRole\` action. \`SecretsManagerSecret\` has the value of the AWS Secrets Manager secret that allows access to the SAP ASE endpoint. |
| + [secretsManagerSecretArn](#dms_endpoints_additionalProperties_sybaseSettings_secretsManagerSecretArn )         | No      | string | No         | -          | The full ARN of the \`SecretsManagerSecret\` that contains the SAP SAE endpoint connection details.                                                                                                                                                                                                                                                                     |
| - [secretsManagerSecretKMSArn](#dms_endpoints_additionalProperties_sybaseSettings_secretsManagerSecretKMSArn )   | No      | string | No         | -          | The Arn of the KMS key used to encrypt the credentials secret.                                                                                                                                                                                                                                                                                                          |

###### <a name="dms_endpoints_additionalProperties_sybaseSettings_secretsManagerAccessRoleArn"></a>2.2.1.17.1. Property `root > dms > endpoints > additionalProperties > sybaseSettings > secretsManagerAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The full Amazon Resource Name (ARN) of the IAM role that specifies AWS DMS as the trusted entity and grants the required permissions to access the value in `SecretsManagerSecret` .

The role must allow the `iam:PassRole` action. `SecretsManagerSecret` has the value of the AWS Secrets Manager secret that allows access to the SAP ASE endpoint.

###### <a name="dms_endpoints_additionalProperties_sybaseSettings_secretsManagerSecretArn"></a>2.2.1.17.2. Property `root > dms > endpoints > additionalProperties > sybaseSettings > secretsManagerSecretArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The full ARN of the `SecretsManagerSecret` that contains the SAP SAE endpoint connection details.

###### <a name="dms_endpoints_additionalProperties_sybaseSettings_secretsManagerSecretKMSArn"></a>2.2.1.17.3. Property `root > dms > endpoints > additionalProperties > sybaseSettings > secretsManagerSecretKMSArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The Arn of the KMS key used to encrypt the credentials secret.

### <a name="dms_replicationInstances"></a>2.3. Property `root > dms > replicationInstances`

|                           |                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                           |
| **Required**              | No                                                                                                                                 |
| **Additional properties** | [[Should-conform]](#dms_replicationInstances_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedReplicationInstanceProps                                                                                        |

| Property                                              | Pattern | Type   | Deprecated | Definition                                | Title/Description |
| ----------------------------------------------------- | ------- | ------ | ---------- | ----------------------------------------- | ----------------- |
| - [](#dms_replicationInstances_additionalProperties ) | No      | object | No         | In #/definitions/ReplicationInstanceProps | -                 |

#### <a name="dms_replicationInstances_additionalProperties"></a>2.3.1. Property `root > dms > replicationInstances > ReplicationInstanceProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/ReplicationInstanceProps                  |

| Property                                                                                       | Pattern | Type            | Deprecated | Definition                                                                         | Title/Description                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [addSelfReferenceRule](#dms_replicationInstances_additionalProperties_addSelfReferenceRule ) | No      | boolean         | No         | -                                                                                  | If true, the SG will allow traffic to and from itself                                                                                                              |
| - [egressRules](#dms_replicationInstances_additionalProperties_egressRules )                   | No      | object          | No         | In #/definitions/MdaaSecurityGroupRuleProps                                        | List of egress rules to be added to the function SG                                                                                                                |
| - [ingressRules](#dms_replicationInstances_additionalProperties_ingressRules )                 | No      | object          | No         | Same as [egressRules](#dms_replicationInstances_additionalProperties_egressRules ) | List of ingress rules to be added to the function SG                                                                                                               |
| + [instanceClass](#dms_replicationInstances_additionalProperties_instanceClass )               | No      | string          | No         | -                                                                                  | The compute class of the replication instance. <br />For supported types, see https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.Types.html |
| + [subnetIds](#dms_replicationInstances_additionalProperties_subnetIds )                       | No      | array of string | No         | -                                                                                  | List of subnet ids on which the replication instance will be deployed.<br />This list must span at least two Azs                                                   |
| + [vpcId](#dms_replicationInstances_additionalProperties_vpcId )                               | No      | string          | No         | -                                                                                  | The VPC on which the replication instance will be deployed.                                                                                                        |

##### <a name="dms_replicationInstances_additionalProperties_addSelfReferenceRule"></a>2.3.1.1. Property `root > dms > replicationInstances > additionalProperties > addSelfReferenceRule`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true, the SG will allow traffic to and from itself

##### <a name="dms_replicationInstances_additionalProperties_egressRules"></a>2.3.1.2. Property `root > dms > replicationInstances > additionalProperties > egressRules`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaSecurityGroupRuleProps                |

**Description:** List of egress rules to be added to the function SG

| Property                                                                               | Pattern | Type  | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------------------- | ------- | ----- | ---------- | ---------- | ----------------- |
| - [ipv4](#dms_replicationInstances_additionalProperties_egressRules_ipv4 )             | No      | array | No         | -          | -                 |
| - [prefixList](#dms_replicationInstances_additionalProperties_egressRules_prefixList ) | No      | array | No         | -          | -                 |
| - [sg](#dms_replicationInstances_additionalProperties_egressRules_sg )                 | No      | array | No         | -          | -                 |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_ipv4"></a>2.3.1.2.1. Property `root > dms > replicationInstances > additionalProperties > egressRules > ipv4`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                       | Description |
| ------------------------------------------------------------------------------------- | ----------- |
| [MdaaCidrPeer](#dms_replicationInstances_additionalProperties_egressRules_ipv4_items) | -           |

###### <a name="autogenerated_heading_3"></a>2.3.1.2.1.1. root > dms > replicationInstances > additionalProperties > egressRules > ipv4 > MdaaCidrPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaCidrPeer                              |

| Property                                                                                              | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [cidr](#dms_replicationInstances_additionalProperties_egressRules_ipv4_items_cidr )                 | No      | string | No         | -          | -                 |
| - [description](#dms_replicationInstances_additionalProperties_egressRules_ipv4_items_description )   | No      | string | No         | -          | -                 |
| - [port](#dms_replicationInstances_additionalProperties_egressRules_ipv4_items_port )                 | No      | number | No         | -          | -                 |
| + [protocol](#dms_replicationInstances_additionalProperties_egressRules_ipv4_items_protocol )         | No      | string | No         | -          | -                 |
| - [suppressions](#dms_replicationInstances_additionalProperties_egressRules_ipv4_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#dms_replicationInstances_additionalProperties_egressRules_ipv4_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_ipv4_items_cidr"></a>2.3.1.2.1.1.1. Property `root > dms > replicationInstances > additionalProperties > egressRules > ipv4 > ipv4 items > cidr`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_ipv4_items_description"></a>2.3.1.2.1.1.2. Property `root > dms > replicationInstances > additionalProperties > egressRules > ipv4 > ipv4 items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_ipv4_items_port"></a>2.3.1.2.1.1.3. Property `root > dms > replicationInstances > additionalProperties > egressRules > ipv4 > ipv4 items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_ipv4_items_protocol"></a>2.3.1.2.1.1.4. Property `root > dms > replicationInstances > additionalProperties > egressRules > ipv4 > ipv4 items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_ipv4_items_suppressions"></a>2.3.1.2.1.1.5. Property `root > dms > replicationInstances > additionalProperties > egressRules > ipv4 > ipv4 items > suppressions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                 | Description |
| --------------------------------------------------------------------------------------------------------------- | ----------- |
| [NagSuppressionProps](#dms_replicationInstances_additionalProperties_egressRules_ipv4_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_4"></a>2.3.1.2.1.1.5.1. root > dms > replicationInstances > additionalProperties > egressRules > ipv4 > ipv4 items > suppressions > NagSuppressionProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NagSuppressionProps                       |

| Property                                                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#dms_replicationInstances_additionalProperties_egressRules_ipv4_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#dms_replicationInstances_additionalProperties_egressRules_ipv4_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_ipv4_items_suppressions_items_id"></a>2.3.1.2.1.1.5.1.1. Property `root > dms > replicationInstances > additionalProperties > egressRules > ipv4 > ipv4 items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_ipv4_items_suppressions_items_reason"></a>2.3.1.2.1.1.5.1.2. Property `root > dms > replicationInstances > additionalProperties > egressRules > ipv4 > ipv4 items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_ipv4_items_toPort"></a>2.3.1.2.1.1.6. Property `root > dms > replicationInstances > additionalProperties > egressRules > ipv4 > ipv4 items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_prefixList"></a>2.3.1.2.2. Property `root > dms > replicationInstances > additionalProperties > egressRules > prefixList`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                   | Description |
| ------------------------------------------------------------------------------------------------- | ----------- |
| [MdaaPrefixListPeer](#dms_replicationInstances_additionalProperties_egressRules_prefixList_items) | -           |

###### <a name="autogenerated_heading_5"></a>2.3.1.2.2.1. root > dms > replicationInstances > additionalProperties > egressRules > prefixList > MdaaPrefixListPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaPrefixListPeer                        |

| Property                                                                                                    | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#dms_replicationInstances_additionalProperties_egressRules_prefixList_items_description )   | No      | string | No         | -          | -                 |
| - [port](#dms_replicationInstances_additionalProperties_egressRules_prefixList_items_port )                 | No      | number | No         | -          | -                 |
| + [prefixList](#dms_replicationInstances_additionalProperties_egressRules_prefixList_items_prefixList )     | No      | string | No         | -          | -                 |
| + [protocol](#dms_replicationInstances_additionalProperties_egressRules_prefixList_items_protocol )         | No      | string | No         | -          | -                 |
| - [suppressions](#dms_replicationInstances_additionalProperties_egressRules_prefixList_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#dms_replicationInstances_additionalProperties_egressRules_prefixList_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_prefixList_items_description"></a>2.3.1.2.2.1.1. Property `root > dms > replicationInstances > additionalProperties > egressRules > prefixList > prefixList items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_prefixList_items_port"></a>2.3.1.2.2.1.2. Property `root > dms > replicationInstances > additionalProperties > egressRules > prefixList > prefixList items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_prefixList_items_prefixList"></a>2.3.1.2.2.1.3. Property `root > dms > replicationInstances > additionalProperties > egressRules > prefixList > prefixList items > prefixList`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_prefixList_items_protocol"></a>2.3.1.2.2.1.4. Property `root > dms > replicationInstances > additionalProperties > egressRules > prefixList > prefixList items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_prefixList_items_suppressions"></a>2.3.1.2.2.1.5. Property `root > dms > replicationInstances > additionalProperties > egressRules > prefixList > prefixList items > suppressions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                       | Description |
| --------------------------------------------------------------------------------------------------------------------- | ----------- |
| [NagSuppressionProps](#dms_replicationInstances_additionalProperties_egressRules_prefixList_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_6"></a>2.3.1.2.2.1.5.1. root > dms > replicationInstances > additionalProperties > egressRules > prefixList > prefixList items > suppressions > NagSuppressionProps

|                           |                                                                                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                            |
| **Required**              | No                                                                                                                                                                                  |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                             |
| **Same definition as**    | [dms_replicationInstances_additionalProperties_egressRules_ipv4_items_suppressions_items](#dms_replicationInstances_additionalProperties_egressRules_ipv4_items_suppressions_items) |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_prefixList_items_toPort"></a>2.3.1.2.2.1.6. Property `root > dms > replicationInstances > additionalProperties > egressRules > prefixList > prefixList items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_sg"></a>2.3.1.2.3. Property `root > dms > replicationInstances > additionalProperties > egressRules > sg`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                              | Description |
| -------------------------------------------------------------------------------------------- | ----------- |
| [MdaaSecurityGroupPeer](#dms_replicationInstances_additionalProperties_egressRules_sg_items) | -           |

###### <a name="autogenerated_heading_7"></a>2.3.1.2.3.1. root > dms > replicationInstances > additionalProperties > egressRules > sg > MdaaSecurityGroupPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaSecurityGroupPeer                     |

| Property                                                                                            | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#dms_replicationInstances_additionalProperties_egressRules_sg_items_description )   | No      | string | No         | -          | -                 |
| - [port](#dms_replicationInstances_additionalProperties_egressRules_sg_items_port )                 | No      | number | No         | -          | -                 |
| + [protocol](#dms_replicationInstances_additionalProperties_egressRules_sg_items_protocol )         | No      | string | No         | -          | -                 |
| + [sgId](#dms_replicationInstances_additionalProperties_egressRules_sg_items_sgId )                 | No      | string | No         | -          | -                 |
| - [suppressions](#dms_replicationInstances_additionalProperties_egressRules_sg_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#dms_replicationInstances_additionalProperties_egressRules_sg_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_sg_items_description"></a>2.3.1.2.3.1.1. Property `root > dms > replicationInstances > additionalProperties > egressRules > sg > sg items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_sg_items_port"></a>2.3.1.2.3.1.2. Property `root > dms > replicationInstances > additionalProperties > egressRules > sg > sg items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_sg_items_protocol"></a>2.3.1.2.3.1.3. Property `root > dms > replicationInstances > additionalProperties > egressRules > sg > sg items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_sg_items_sgId"></a>2.3.1.2.3.1.4. Property `root > dms > replicationInstances > additionalProperties > egressRules > sg > sg items > sgId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_sg_items_suppressions"></a>2.3.1.2.3.1.5. Property `root > dms > replicationInstances > additionalProperties > egressRules > sg > sg items > suppressions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                               | Description |
| ------------------------------------------------------------------------------------------------------------- | ----------- |
| [NagSuppressionProps](#dms_replicationInstances_additionalProperties_egressRules_sg_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_8"></a>2.3.1.2.3.1.5.1. root > dms > replicationInstances > additionalProperties > egressRules > sg > sg items > suppressions > NagSuppressionProps

|                           |                                                                                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                            |
| **Required**              | No                                                                                                                                                                                  |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                             |
| **Same definition as**    | [dms_replicationInstances_additionalProperties_egressRules_ipv4_items_suppressions_items](#dms_replicationInstances_additionalProperties_egressRules_ipv4_items_suppressions_items) |

###### <a name="dms_replicationInstances_additionalProperties_egressRules_sg_items_toPort"></a>2.3.1.2.3.1.6. Property `root > dms > replicationInstances > additionalProperties > egressRules > sg > sg items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

##### <a name="dms_replicationInstances_additionalProperties_ingressRules"></a>2.3.1.3. Property `root > dms > replicationInstances > additionalProperties > ingressRules`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                   |
| **Same definition as**    | [egressRules](#dms_replicationInstances_additionalProperties_egressRules) |

**Description:** List of ingress rules to be added to the function SG

##### <a name="dms_replicationInstances_additionalProperties_instanceClass"></a>2.3.1.4. Property `root > dms > replicationInstances > additionalProperties > instanceClass`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The compute class of the replication instance. 
For supported types, see https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.Types.html

##### <a name="dms_replicationInstances_additionalProperties_subnetIds"></a>2.3.1.5. Property `root > dms > replicationInstances > additionalProperties > subnetIds`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** List of subnet ids on which the replication instance will be deployed.
This list must span at least two Azs

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                   | Description |
| --------------------------------------------------------------------------------- | ----------- |
| [subnetIds items](#dms_replicationInstances_additionalProperties_subnetIds_items) | -           |

###### <a name="autogenerated_heading_9"></a>2.3.1.5.1. root > dms > replicationInstances > additionalProperties > subnetIds > subnetIds items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="dms_replicationInstances_additionalProperties_vpcId"></a>2.3.1.6. Property `root > dms > replicationInstances > additionalProperties > vpcId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The VPC on which the replication instance will be deployed.

### <a name="dms_replicationTasks"></a>2.4. Property `root > dms > replicationTasks`

|                           |                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                       |
| **Required**              | No                                                                                                                             |
| **Additional properties** | [[Should-conform]](#dms_replicationTasks_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedReplicationTaskProps                                                                                        |

| Property                                          | Pattern | Type   | Deprecated | Definition                            | Title/Description |
| ------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------- | ----------------- |
| - [](#dms_replicationTasks_additionalProperties ) | No      | object | No         | In #/definitions/ReplicationTaskProps | -                 |

#### <a name="dms_replicationTasks_additionalProperties"></a>2.4.1. Property `root > dms > replicationTasks > ReplicationTaskProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/ReplicationTaskProps                      |

| Property                                                                                         | Pattern | Type             | Deprecated | Definition                        | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------ | ------- | ---------------- | ---------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [cdcStartPosition](#dms_replicationTasks_additionalProperties_cdcStartPosition )               | No      | string           | No         | -                                 | Indicates when you want a change data capture (CDC) operation to start.<br /><br />Use either \`CdcStartPosition\` or \`CdcStartTime\` to specify when you want a CDC operation to start. Specifying both values results in an error.<br /><br />The value can be in date, checkpoint, log sequence number (LSN), or system change number (SCN) format.<br /><br />Here is a date example: \`--cdc-start-position "2018-03-08T12:12:12"\`<br /><br />Here is a checkpoint example: \`--cdc-start-position "checkpoint:V1#27#mysql-bin-changelog.157832:1975:-1:2002:677883278264080:mysql-bin-changelog.157832:1876#0#0#*#0#93"\`<br /><br />Here is an LSN example: \`--cdc-start-position “mysql-bin-changelog.000024:373”\`<br /><br />> When you use this task setting with a source PostgreSQL database, a logical replication slot should already be created and associated with the source endpoint. You can verify this by setting the \`slotName\` extra connection attribute to the name of this logical replication slot. For more information, see [Extra Connection Attributes When Using PostgreSQL as a Source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html#CHAP_Source.PostgreSQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* . |
| - [cdcStartTime](#dms_replicationTasks_additionalProperties_cdcStartTime )                       | No      | number           | No         | -                                 | Indicates the start time for a change data capture (CDC) operation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| - [cdcStopPosition](#dms_replicationTasks_additionalProperties_cdcStopPosition )                 | No      | string           | No         | -                                 | Indicates when you want a change data capture (CDC) operation to stop.<br /><br />The value can be either server time or commit time.<br /><br />Here is a server time example: \`--cdc-stop-position "server_time:2018-02-09T12:12:12"\`<br /><br />Here is a commit time example: \`--cdc-stop-position "commit_time: 2018-02-09T12:12:12"\`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| + [migrationType](#dms_replicationTasks_additionalProperties_migrationType )                     | No      | enum (of string) | No         | In #/definitions/DmsMigrationType | The migration type.<br /><br />Valid values: \`full-load\` \| \`cdc\` \| \`full-load-and-cdc\`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| + [replicationInstance](#dms_replicationTasks_additionalProperties_replicationInstance )         | No      | string           | No         | -                                 | The name of the replication instance from the 'replicationInstances' section.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| - [replicationTaskSettings](#dms_replicationTasks_additionalProperties_replicationTaskSettings ) | No      | object           | No         | -                                 | Overall settings for the task, in JSON format.<br /><br />For more information, see [Specifying Task Settings for AWS Database Migration Service Tasks](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.html) in the *AWS Database Migration Service User Guide* .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [sourceEndpoint](#dms_replicationTasks_additionalProperties_sourceEndpoint )                   | No      | string           | No         | -                                 | The name of the source endpoint from the 'endpoints' section of this config                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| + [tableMappings](#dms_replicationTasks_additionalProperties_tableMappings )                     | No      | object           | No         | -                                 | The table mappings for the task, in JSON format.<br /><br />For more information, see [Using Table Mapping to Specify Task Settings](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.html) in the *AWS Database Migration Service User Guide* .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| + [targetEndpoint](#dms_replicationTasks_additionalProperties_targetEndpoint )                   | No      | string           | No         | -                                 | The name of the target endpoint from the 'endpoints' section of this config                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| - [taskData](#dms_replicationTasks_additionalProperties_taskData )                               | No      | object           | No         | -                                 | Supplemental information that the task requires to migrate the data for certain source and target endpoints.<br /><br />For more information, see [Specifying Supplemental Data for Task Settings](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.TaskData.html) in the *AWS Database Migration Service User Guide.*                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

##### <a name="dms_replicationTasks_additionalProperties_cdcStartPosition"></a>2.4.1.1. Property `root > dms > replicationTasks > additionalProperties > cdcStartPosition`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Indicates when you want a change data capture (CDC) operation to start.

Use either `CdcStartPosition` or `CdcStartTime` to specify when you want a CDC operation to start. Specifying both values results in an error.

The value can be in date, checkpoint, log sequence number (LSN), or system change number (SCN) format.

Here is a date example: `--cdc-start-position "2018-03-08T12:12:12"`

Here is a checkpoint example: `--cdc-start-position "checkpoint:V1#27#mysql-bin-changelog.157832:1975:-1:2002:677883278264080:mysql-bin-changelog.157832:1876#0#0#*#0#93"`

Here is an LSN example: `--cdc-start-position “mysql-bin-changelog.000024:373”`

> When you use this task setting with a source PostgreSQL database, a logical replication slot should already be created and associated with the source endpoint. You can verify this by setting the `slotName` extra connection attribute to the name of this logical replication slot. For more information, see [Extra Connection Attributes When Using PostgreSQL as a Source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html#CHAP_Source.PostgreSQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .

##### <a name="dms_replicationTasks_additionalProperties_cdcStartTime"></a>2.4.1.2. Property `root > dms > replicationTasks > additionalProperties > cdcStartTime`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Indicates the start time for a change data capture (CDC) operation.

##### <a name="dms_replicationTasks_additionalProperties_cdcStopPosition"></a>2.4.1.3. Property `root > dms > replicationTasks > additionalProperties > cdcStopPosition`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Indicates when you want a change data capture (CDC) operation to stop.

The value can be either server time or commit time.

Here is a server time example: `--cdc-stop-position "server_time:2018-02-09T12:12:12"`

Here is a commit time example: `--cdc-stop-position "commit_time: 2018-02-09T12:12:12"`

##### <a name="dms_replicationTasks_additionalProperties_migrationType"></a>2.4.1.4. Property `root > dms > replicationTasks > additionalProperties > migrationType`

|                |                                |
| -------------- | ------------------------------ |
| **Type**       | `enum (of string)`             |
| **Required**   | Yes                            |
| **Defined in** | #/definitions/DmsMigrationType |

**Description:** The migration type.

Valid values: `full-load` | `cdc` | `full-load-and-cdc`

Must be one of:
* "cdc"
* "full-load"
* "full-load-and-cdc"

##### <a name="dms_replicationTasks_additionalProperties_replicationInstance"></a>2.4.1.5. Property `root > dms > replicationTasks > additionalProperties > replicationInstance`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the replication instance from the 'replicationInstances' section.

##### <a name="dms_replicationTasks_additionalProperties_replicationTaskSettings"></a>2.4.1.6. Property `root > dms > replicationTasks > additionalProperties > replicationTaskSettings`

|                           |                                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                    |
| **Required**              | No                                                                                                                                                                          |
| **Additional properties** | [[Should-conform]](#dms_replicationTasks_additionalProperties_replicationTaskSettings_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Overall settings for the task, in JSON format.

For more information, see [Specifying Task Settings for AWS Database Migration Service Tasks](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.html) in the *AWS Database Migration Service User Guide* .

| Property                                                                                       | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#dms_replicationTasks_additionalProperties_replicationTaskSettings_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="dms_replicationTasks_additionalProperties_replicationTaskSettings_additionalProperties"></a>2.4.1.6.1. Property `root > dms > replicationTasks > additionalProperties > replicationTaskSettings > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

##### <a name="dms_replicationTasks_additionalProperties_sourceEndpoint"></a>2.4.1.7. Property `root > dms > replicationTasks > additionalProperties > sourceEndpoint`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the source endpoint from the 'endpoints' section of this config

##### <a name="dms_replicationTasks_additionalProperties_tableMappings"></a>2.4.1.8. Property `root > dms > replicationTasks > additionalProperties > tableMappings`

|                           |                                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                          |
| **Required**              | Yes                                                                                                                                                               |
| **Additional properties** | [[Should-conform]](#dms_replicationTasks_additionalProperties_tableMappings_additionalProperties "Each additional property must conform to the following schema") |

**Description:** The table mappings for the task, in JSON format.

For more information, see [Using Table Mapping to Specify Task Settings](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.html) in the *AWS Database Migration Service User Guide* .

| Property                                                                             | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#dms_replicationTasks_additionalProperties_tableMappings_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="dms_replicationTasks_additionalProperties_tableMappings_additionalProperties"></a>2.4.1.8.1. Property `root > dms > replicationTasks > additionalProperties > tableMappings > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

##### <a name="dms_replicationTasks_additionalProperties_targetEndpoint"></a>2.4.1.9. Property `root > dms > replicationTasks > additionalProperties > targetEndpoint`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the target endpoint from the 'endpoints' section of this config

##### <a name="dms_replicationTasks_additionalProperties_taskData"></a>2.4.1.10. Property `root > dms > replicationTasks > additionalProperties > taskData`

|                           |                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                     |
| **Required**              | No                                                                                                                                                           |
| **Additional properties** | [[Should-conform]](#dms_replicationTasks_additionalProperties_taskData_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Supplemental information that the task requires to migrate the data for certain source and target endpoints.

For more information, see [Specifying Supplemental Data for Task Settings](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.TaskData.html) in the *AWS Database Migration Service User Guide.*

| Property                                                                        | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#dms_replicationTasks_additionalProperties_taskData_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="dms_replicationTasks_additionalProperties_taskData_additionalProperties"></a>2.4.1.10.1. Property `root > dms > replicationTasks > additionalProperties > taskData > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

## <a name="kmsArn"></a>3. Property `root > kmsArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="nag_suppressions"></a>4. Property `root > nag_suppressions`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaNagSuppressions                       |

**Description:** Nag suppressions

| Property                                | Pattern | Type  | Deprecated | Definition | Title/Description |
| --------------------------------------- | ------- | ----- | ---------- | ---------- | ----------------- |
| + [by_path](#nag_suppressions_by_path ) | No      | array | No         | -          | -                 |

### <a name="nag_suppressions_by_path"></a>4.1. Property `root > nag_suppressions > by_path`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                             | Description |
| ----------------------------------------------------------- | ----------- |
| [MdaaNagSuppressionByPath](#nag_suppressions_by_path_items) | -           |

#### <a name="autogenerated_heading_10"></a>4.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaNagSuppressionByPath                  |

| Property                                                        | Pattern | Type            | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| + [path](#nag_suppressions_by_path_items_path )                 | No      | string          | No         | -          | -                 |
| + [suppressions](#nag_suppressions_by_path_items_suppressions ) | No      | array of object | No         | -          | -                 |

##### <a name="nag_suppressions_by_path_items_path"></a>4.1.1.1. Property `root > nag_suppressions > by_path > by_path items > path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="nag_suppressions_by_path_items_suppressions"></a>4.1.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of object` |
| **Required** | Yes               |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                          | Description |
| ------------------------------------------------------------------------ | ----------- |
| [suppressions items](#nag_suppressions_by_path_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_11"></a>4.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                               | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#nag_suppressions_by_path_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#nag_suppressions_by_path_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="nag_suppressions_by_path_items_suppressions_items_id"></a>4.1.1.2.1.1. Property `root > nag_suppressions > by_path > by_path items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nag_suppressions_by_path_items_suppressions_items_reason"></a>4.1.1.2.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="projectBucket"></a>5. Property `root > projectBucket`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="projectName"></a>6. Property `root > projectName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="projectTopicArn"></a>7. Property `root > projectTopicArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="securityConfigurationName"></a>8. Property `root > securityConfigurationName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="service_catalog_product_config"></a>9. Property `root > service_catalog_product_config`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogProductConfig           |

**Description:** Service Catalog Config
If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment

| Property                                                                | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [launch_role_name](#service_catalog_product_config_launch_role_name ) | No      | string | No         | -          | -                 |
| + [name](#service_catalog_product_config_name )                         | No      | string | No         | -          | -                 |
| + [owner](#service_catalog_product_config_owner )                       | No      | string | No         | -          | -                 |
| - [parameters](#service_catalog_product_config_parameters )             | No      | object | No         | -          | -                 |
| + [portfolio_arn](#service_catalog_product_config_portfolio_arn )       | No      | string | No         | -          | -                 |

### <a name="service_catalog_product_config_launch_role_name"></a>9.1. Property `root > service_catalog_product_config > launch_role_name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="service_catalog_product_config_name"></a>9.2. Property `root > service_catalog_product_config > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_owner"></a>9.3. Property `root > service_catalog_product_config > owner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_parameters"></a>9.4. Property `root > service_catalog_product_config > parameters`

|                           |                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                            |
| **Required**              | No                                                                                                                                                  |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                               | Pattern | Type   | Deprecated | Definition                                         | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogParameterConfig | -                 |

#### <a name="service_catalog_product_config_parameters_additionalProperties"></a>9.4.1. Property `root > service_catalog_product_config > parameters > MdaaServiceCatalogParameterConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogParameterConfig         |

| Property                                                                                      | Pattern | Type   | Deprecated | Definition                                          | Title/Description |
| --------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | --------------------------------------------------- | ----------------- |
| - [constraints](#service_catalog_product_config_parameters_additionalProperties_constraints ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintConfig | -                 |
| + [props](#service_catalog_product_config_parameters_additionalProperties_props )             | No      | object | No         | In #/definitions/CfnParameterProps                  | -                 |

##### <a name="service_catalog_product_config_parameters_additionalProperties_constraints"></a>9.4.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintConfig        |

| Property                                                                                                  | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [description](#service_catalog_product_config_parameters_additionalProperties_constraints_description ) | No      | string | No         | -          | -                 |
| + [rules](#service_catalog_product_config_parameters_additionalProperties_constraints_rules )             | No      | object | No         | -          | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_description"></a>9.4.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules"></a>9.4.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules`

|                           |                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                                                   |
| **Required**              | Yes                                                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                      | Pattern | Type   | Deprecated | Definition                                              | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleConfig | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties"></a>9.4.1.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > MdaaServiceCatalogConstraintRuleConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleConfig    |

| Property                                                                                                                           | Pattern | Type   | Deprecated | Definition                                                         | Title/Description |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------------------ | ----------------- |
| + [assertions](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions ) | No      | array  | No         | -                                                                  | -                 |
| + [condition](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition )   | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions"></a>9.4.1.1.2.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                                            | Description |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [MdaaServiceCatalogConstraintRuleAssertionConfig](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items) | -           |

###### <a name="autogenerated_heading_12"></a>9.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

|                           |                                                               |
| ------------------------- | ------------------------------------------------------------- |
| **Type**                  | `object`                                                      |
| **Required**              | No                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")       |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleAssertionConfig |

| Property                                                                                                                                              | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [assert](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert )           | No      | string | No         | -          | -                 |
| + [description](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description ) | No      | string | No         | -          | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert"></a>9.4.1.1.2.1.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > assert`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description"></a>9.4.1.1.2.1.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition"></a>9.4.1.1.2.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > condition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig           |

##### <a name="service_catalog_product_config_parameters_additionalProperties_props"></a>9.4.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnParameterProps                         |

| Property                                                                                                                | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [allowedPattern](#service_catalog_product_config_parameters_additionalProperties_props_allowedPattern )               | No      | string          | No         | -          | A regular expression that represents the patterns to allow for String types.                                                                                                                                                                                              |
| - [allowedValues](#service_catalog_product_config_parameters_additionalProperties_props_allowedValues )                 | No      | array of string | No         | -          | An array containing the list of values allowed for the parameter.                                                                                                                                                                                                         |
| - [constraintDescription](#service_catalog_product_config_parameters_additionalProperties_props_constraintDescription ) | No      | string          | No         | -          | A string that explains a constraint when the constraint is violated.<br />For example, without a constraint description, a parameter that has an allowed<br />pattern of [A-Za-z0-9]+ displays the following error message when the user specifies<br />an invalid value: |
| - [default](#service_catalog_product_config_parameters_additionalProperties_props_default )                             | No      | object          | No         | -          | A value of the appropriate type for the template to use if no value is specified<br />when a stack is created. If you define constraints for the parameter, you must specify<br />a value that adheres to those constraints.                                              |
| - [description](#service_catalog_product_config_parameters_additionalProperties_props_description )                     | No      | string          | No         | -          | A string of up to 4000 characters that describes the parameter.                                                                                                                                                                                                           |
| - [maxLength](#service_catalog_product_config_parameters_additionalProperties_props_maxLength )                         | No      | number          | No         | -          | An integer value that determines the largest number of characters you want to allow for String types.                                                                                                                                                                     |
| - [maxValue](#service_catalog_product_config_parameters_additionalProperties_props_maxValue )                           | No      | number          | No         | -          | A numeric value that determines the largest numeric value you want to allow for Number types.                                                                                                                                                                             |
| - [minLength](#service_catalog_product_config_parameters_additionalProperties_props_minLength )                         | No      | number          | No         | -          | An integer value that determines the smallest number of characters you want to allow for String types.                                                                                                                                                                    |
| - [minValue](#service_catalog_product_config_parameters_additionalProperties_props_minValue )                           | No      | number          | No         | -          | A numeric value that determines the smallest numeric value you want to allow for Number types.                                                                                                                                                                            |
| - [noEcho](#service_catalog_product_config_parameters_additionalProperties_props_noEcho )                               | No      | boolean         | No         | -          | Whether to mask the parameter value when anyone makes a call that describes the stack.<br />If you set the value to \`\`true\`\`, the parameter value is masked with asterisks (\`\`*****\`\`).                                                                           |
| - [type](#service_catalog_product_config_parameters_additionalProperties_props_type )                                   | No      | string          | No         | -          | The data type for the parameter (DataType).                                                                                                                                                                                                                               |

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedPattern"></a>9.4.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedPattern`

|              |                                                         |
| ------------ | ------------------------------------------------------- |
| **Type**     | `string`                                                |
| **Required** | No                                                      |
| **Default**  | `"- No constraints on patterns allowed for parameter."` |

**Description:** A regular expression that represents the patterns to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedValues"></a>9.4.1.2.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues`

|              |                                                       |
| ------------ | ----------------------------------------------------- |
| **Type**     | `array of string`                                     |
| **Required** | No                                                    |
| **Default**  | `"- No constraints on values allowed for parameter."` |

**Description:** An array containing the list of values allowed for the parameter.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                  | Description |
| ---------------------------------------------------------------------------------------------------------------- | ----------- |
| [allowedValues items](#service_catalog_product_config_parameters_additionalProperties_props_allowedValues_items) | -           |

###### <a name="autogenerated_heading_13"></a>9.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_constraintDescription"></a>9.4.1.2.3. Property `root > service_catalog_product_config > parameters > additionalProperties > props > constraintDescription`

|              |                                                                                        |
| ------------ | -------------------------------------------------------------------------------------- |
| **Type**     | `string`                                                                               |
| **Required** | No                                                                                     |
| **Default**  | `"- No description with customized error message when user specifies invalid values."` |

**Description:** A string that explains a constraint when the constraint is violated.
For example, without a constraint description, a parameter that has an allowed
pattern of [A-Za-z0-9]+ displays the following error message when the user specifies
an invalid value:

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_default"></a>9.4.1.2.4. Property `root > service_catalog_product_config > parameters > additionalProperties > props > default`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Default**               | `"- No default value for parameter."`                                     |

**Description:** A value of the appropriate type for the template to use if no value is specified
when a stack is created. If you define constraints for the parameter, you must specify
a value that adheres to those constraints.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_description"></a>9.4.1.2.5. Property `root > service_catalog_product_config > parameters > additionalProperties > props > description`

|              |                                         |
| ------------ | --------------------------------------- |
| **Type**     | `string`                                |
| **Required** | No                                      |
| **Default**  | `"- No description for the parameter."` |

**Description:** A string of up to 4000 characters that describes the parameter.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxLength"></a>9.4.1.2.6. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the largest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxValue"></a>9.4.1.2.7. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the largest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minLength"></a>9.4.1.2.8. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the smallest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minValue"></a>9.4.1.2.9. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the smallest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_noEcho"></a>9.4.1.2.10. Property `root > service_catalog_product_config > parameters > additionalProperties > props > noEcho`

|              |                                        |
| ------------ | -------------------------------------- |
| **Type**     | `boolean`                              |
| **Required** | No                                     |
| **Default**  | `"- Parameter values are not masked."` |

**Description:** Whether to mask the parameter value when anyone makes a call that describes the stack.
If you set the value to ``true``, the parameter value is masked with asterisks (``*****``).

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_type"></a>9.4.1.2.11. Property `root > service_catalog_product_config > parameters > additionalProperties > props > type`

|              |            |
| ------------ | ---------- |
| **Type**     | `string`   |
| **Required** | No         |
| **Default**  | `"String"` |

**Description:** The data type for the parameter (DataType).

### <a name="service_catalog_product_config_portfolio_arn"></a>9.5. Property `root > service_catalog_product_config > portfolio_arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

----------------------------------------------------------------------------------------------------------------------------
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-16 at 13:40:38 -0400

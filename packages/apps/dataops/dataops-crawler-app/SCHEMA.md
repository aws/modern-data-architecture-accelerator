# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                       | Title/Description                                                                                                                                    |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [crawlers](#crawlers )                                             | No      | object | No         | -                                                | Map of crawler names to crawler definitions                                                                                                          |
| + [deploymentRole](#deploymentRole )                                 | No      | string | No         | -                                                | -                                                                                                                                                    |
| + [kmsArn](#kmsArn )                                                 | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                     |
| + [projectBucket](#projectBucket )                                   | No      | string | No         | -                                                | -                                                                                                                                                    |
| + [projectName](#projectName )                                       | No      | string | No         | -                                                | Name of the Data Ops project. The crawler config will be autowired to use existing resources deployed by the project.                                |
| + [projectTopicArn](#projectTopicArn )                               | No      | string | No         | -                                                | -                                                                                                                                                    |
| + [securityConfigurationName](#securityConfigurationName )           | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |

## <a name="crawlers"></a>1. Property `root > crawlers`

|                           |                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                           |
| **Required**              | Yes                                                                                                                |
| **Additional properties** | [[Should-conform]](#crawlers_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Map of crawler names to crawler definitions

| Property                              | Pattern | Type   | Deprecated | Definition                         | Title/Description |
| ------------------------------------- | ------- | ------ | ---------- | ---------------------------------- | ----------------- |
| - [](#crawlers_additionalProperties ) | No      | object | No         | In #/definitions/CrawlerDefinition | -                 |

### <a name="crawlers_additionalProperties"></a>1.1. Property `root > crawlers > CrawlerDefinition`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CrawlerDefinition                         |

| Property                                                                   | Pattern | Type            | Deprecated | Definition                                             | Title/Description                                                                                                                                            |
| -------------------------------------------------------------------------- | ------- | --------------- | ---------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [classifiers](#crawlers_additionalProperties_classifiers )               | No      | array of string | No         | -                                                      | Name of the custom classifier to use from the crawler.yaml configuration                                                                                     |
| + [databaseName](#crawlers_additionalProperties_databaseName )             | No      | string          | No         | -                                                      | Name of the database to crawl from the crawler.yaml configuration.                                                                                           |
| + [description](#crawlers_additionalProperties_description )               | No      | string          | No         | -                                                      | Description for the Crawler                                                                                                                                  |
| + [executionRoleArn](#crawlers_additionalProperties_executionRoleArn )     | No      | string          | No         | -                                                      | Arn of the execution role                                                                                                                                    |
| - [extraConfiguration](#crawlers_additionalProperties_extraConfiguration ) | No      | object          | No         | -                                                      | Crawler configuration as a string.  See:  https://docs.aws.amazon.com/glue/latest/dg/crawler-configuration.html                                              |
| - [recrawlBehavior](#crawlers_additionalProperties_recrawlBehavior )       | No      | string          | No         | -                                                      | Recrawl behaviour: CRAWL_NEW_FOLDERS_ONLY or CRAWL_EVERYTHING or CRAWL_EVENT_MODE                                                                            |
| - [schedule](#crawlers_additionalProperties_schedule )                     | No      | object          | No         | In #/definitions/CfnCrawler.ScheduleProperty           | Crawler schedule.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-schedule.html                             |
| - [schemaChangePolicy](#crawlers_additionalProperties_schemaChangePolicy ) | No      | object          | No         | In #/definitions/CfnCrawler.SchemaChangePolicyProperty | Crawler schema change policy.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-schemachangepolicy.html       |
| - [tablePrefix](#crawlers_additionalProperties_tablePrefix )               | No      | string          | No         | -                                                      | Prefix to use in front of all crawled table names                                                                                                            |
| + [targets](#crawlers_additionalProperties_targets )                       | No      | object          | No         | In #/definitions/CrawlerTargets                        | Targets to retrieve data from for the crawler.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-targets.html |

#### <a name="crawlers_additionalProperties_classifiers"></a>1.1.1. Property `root > crawlers > additionalProperties > classifiers`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Name of the custom classifier to use from the crawler.yaml configuration

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                       | Description |
| --------------------------------------------------------------------- | ----------- |
| [classifiers items](#crawlers_additionalProperties_classifiers_items) | -           |

##### <a name="autogenerated_heading_2"></a>1.1.1.1. root > crawlers > additionalProperties > classifiers > classifiers items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="crawlers_additionalProperties_databaseName"></a>1.1.2. Property `root > crawlers > additionalProperties > databaseName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Name of the database to crawl from the crawler.yaml configuration.

#### <a name="crawlers_additionalProperties_description"></a>1.1.3. Property `root > crawlers > additionalProperties > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Description for the Crawler

#### <a name="crawlers_additionalProperties_executionRoleArn"></a>1.1.4. Property `root > crawlers > additionalProperties > executionRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Arn of the execution role

#### <a name="crawlers_additionalProperties_extraConfiguration"></a>1.1.5. Property `root > crawlers > additionalProperties > extraConfiguration`

|                           |                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                   |
| **Required**              | No                                                                                                                                                         |
| **Additional properties** | [[Should-conform]](#crawlers_additionalProperties_extraConfiguration_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Crawler configuration as a string.  See:  https://docs.aws.amazon.com/glue/latest/dg/crawler-configuration.html

| Property                                                                      | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#crawlers_additionalProperties_extraConfiguration_additionalProperties ) | No      | object | No         | -          | -                 |

##### <a name="crawlers_additionalProperties_extraConfiguration_additionalProperties"></a>1.1.5.1. Property `root > crawlers > additionalProperties > extraConfiguration > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

#### <a name="crawlers_additionalProperties_recrawlBehavior"></a>1.1.6. Property `root > crawlers > additionalProperties > recrawlBehavior`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Recrawl behaviour: CRAWL_NEW_FOLDERS_ONLY or CRAWL_EVERYTHING or CRAWL_EVENT_MODE

#### <a name="crawlers_additionalProperties_schedule"></a>1.1.7. Property `root > crawlers > additionalProperties > schedule`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnCrawler.ScheduleProperty               |

**Description:** Crawler schedule.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-schedule.html

| Property                                                                            | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [scheduleExpression](#crawlers_additionalProperties_schedule_scheduleExpression ) | No      | string | No         | -          | A \`cron\` expression used to specify the schedule.<br /><br />For more information, see [Time-Based Schedules for Jobs and Crawlers](https://docs.aws.amazon.com/glue/latest/dg/monitor-data-warehouse-schedule.html) . For example, to run something every day at 12:15 UTC, specify \`cron(15 12 * * ? *)\` . |

##### <a name="crawlers_additionalProperties_schedule_scheduleExpression"></a>1.1.7.1. Property `root > crawlers > additionalProperties > schedule > scheduleExpression`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A `cron` expression used to specify the schedule.

For more information, see [Time-Based Schedules for Jobs and Crawlers](https://docs.aws.amazon.com/glue/latest/dg/monitor-data-warehouse-schedule.html) . For example, to run something every day at 12:15 UTC, specify `cron(15 12 * * ? *)` .

#### <a name="crawlers_additionalProperties_schemaChangePolicy"></a>1.1.8. Property `root > crawlers > additionalProperties > schemaChangePolicy`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnCrawler.SchemaChangePolicyProperty     |

**Description:** Crawler schema change policy.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-schemachangepolicy.html

| Property                                                                              | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [deleteBehavior](#crawlers_additionalProperties_schemaChangePolicy_deleteBehavior ) | No      | string | No         | -          | The deletion behavior when the crawler finds a deleted object.<br /><br />A value of \`LOG\` specifies that if a table or partition is found to no longer exist, do not delete it, only log that it was found to no longer exist.<br /><br />A value of \`DELETE_FROM_DATABASE\` specifies that if a table or partition is found to have been removed, delete it from the database.<br /><br />A value of \`DEPRECATE_IN_DATABASE\` specifies that if a table has been found to no longer exist, to add a property to the table that says "DEPRECATED" and includes a timestamp with the time of deprecation. |
| - [updateBehavior](#crawlers_additionalProperties_schemaChangePolicy_updateBehavior ) | No      | string | No         | -          | The update behavior when the crawler finds a changed schema.<br /><br />A value of \`LOG\` specifies that if a table or a partition already exists, and a change is detected, do not update it, only log that a change was detected. Add new tables and new partitions (including on existing tables).<br /><br />A value of \`UPDATE_IN_DATABASE\` specifies that if a table or partition already exists, and a change is detected, update it. Add new tables and partitions.                                                                                                                                |

##### <a name="crawlers_additionalProperties_schemaChangePolicy_deleteBehavior"></a>1.1.8.1. Property `root > crawlers > additionalProperties > schemaChangePolicy > deleteBehavior`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The deletion behavior when the crawler finds a deleted object.

A value of `LOG` specifies that if a table or partition is found to no longer exist, do not delete it, only log that it was found to no longer exist.

A value of `DELETE_FROM_DATABASE` specifies that if a table or partition is found to have been removed, delete it from the database.

A value of `DEPRECATE_IN_DATABASE` specifies that if a table has been found to no longer exist, to add a property to the table that says "DEPRECATED" and includes a timestamp with the time of deprecation.

##### <a name="crawlers_additionalProperties_schemaChangePolicy_updateBehavior"></a>1.1.8.2. Property `root > crawlers > additionalProperties > schemaChangePolicy > updateBehavior`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The update behavior when the crawler finds a changed schema.

A value of `LOG` specifies that if a table or a partition already exists, and a change is detected, do not update it, only log that a change was detected. Add new tables and new partitions (including on existing tables).

A value of `UPDATE_IN_DATABASE` specifies that if a table or partition already exists, and a change is detected, update it. Add new tables and partitions.

#### <a name="crawlers_additionalProperties_tablePrefix"></a>1.1.9. Property `root > crawlers > additionalProperties > tablePrefix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Prefix to use in front of all crawled table names

#### <a name="crawlers_additionalProperties_targets"></a>1.1.10. Property `root > crawlers > additionalProperties > targets`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CrawlerTargets                            |

**Description:** Targets to retrieve data from for the crawler.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-targets.html

| Property                                                                     | Pattern | Type  | Deprecated | Definition | Title/Description                                                                                                                                    |
| ---------------------------------------------------------------------------- | ------- | ----- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [catalogTargets](#crawlers_additionalProperties_targets_catalogTargets )   | No      | array | No         | -          | Target Definition for Catalog.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-catalogtarget.html   |
| - [dynamoDbTargets](#crawlers_additionalProperties_targets_dynamoDbTargets ) | No      | array | No         | -          | Target Definition for DynamoDB.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-dynamodbtarget.html |
| - [jdbcTargets](#crawlers_additionalProperties_targets_jdbcTargets )         | No      | array | No         | -          | Target Definition for JDBC.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-jdbctarget.html         |
| - [s3Targets](#crawlers_additionalProperties_targets_s3Targets )             | No      | array | No         | -          | Target Definition for   See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-s3target.html                |

##### <a name="crawlers_additionalProperties_targets_catalogTargets"></a>1.1.10.1. Property `root > crawlers > additionalProperties > targets > catalogTargets`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** Target Definition for Catalog.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-catalogtarget.html

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                 | Description                                |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------ |
| [CfnCrawler.CatalogTargetProperty](#crawlers_additionalProperties_targets_catalogTargets_items) | Specifies an AWS Glue Data Catalog target. |

###### <a name="autogenerated_heading_3"></a>1.1.10.1.1. root > crawlers > additionalProperties > targets > catalogTargets > CfnCrawler.CatalogTargetProperty

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnCrawler.CatalogTargetProperty          |

**Description:** Specifies an AWS Glue Data Catalog target.

| Property                                                                                            | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [connectionName](#crawlers_additionalProperties_targets_catalogTargets_items_connectionName )     | No      | string          | No         | -          | The name of the connection for an Amazon S3-backed Data Catalog table to be a target of the crawl when using a \`Catalog\` connection type paired with a \`NETWORK\` Connection type. |
| - [databaseName](#crawlers_additionalProperties_targets_catalogTargets_items_databaseName )         | No      | string          | No         | -          | The name of the database to be synchronized.                                                                                                                                          |
| - [dlqEventQueueArn](#crawlers_additionalProperties_targets_catalogTargets_items_dlqEventQueueArn ) | No      | string          | No         | -          | A valid Amazon dead-letter SQS ARN.<br /><br />For example, \`arn:aws:sqs:region:account:deadLetterQueue\` .                                                                          |
| - [eventQueueArn](#crawlers_additionalProperties_targets_catalogTargets_items_eventQueueArn )       | No      | string          | No         | -          | A valid Amazon SQS ARN.<br /><br />For example, \`arn:aws:sqs:region:account:sqs\` .                                                                                                  |
| - [tables](#crawlers_additionalProperties_targets_catalogTargets_items_tables )                     | No      | array of string | No         | -          | A list of the tables to be synchronized.                                                                                                                                              |

###### <a name="crawlers_additionalProperties_targets_catalogTargets_items_connectionName"></a>1.1.10.1.1.1. Property `root > crawlers > additionalProperties > targets > catalogTargets > catalogTargets items > connectionName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of the connection for an Amazon S3-backed Data Catalog table to be a target of the crawl when using a `Catalog` connection type paired with a `NETWORK` Connection type.

###### <a name="crawlers_additionalProperties_targets_catalogTargets_items_databaseName"></a>1.1.10.1.1.2. Property `root > crawlers > additionalProperties > targets > catalogTargets > catalogTargets items > databaseName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of the database to be synchronized.

###### <a name="crawlers_additionalProperties_targets_catalogTargets_items_dlqEventQueueArn"></a>1.1.10.1.1.3. Property `root > crawlers > additionalProperties > targets > catalogTargets > catalogTargets items > dlqEventQueueArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A valid Amazon dead-letter SQS ARN.

For example, `arn:aws:sqs:region:account:deadLetterQueue` .

###### <a name="crawlers_additionalProperties_targets_catalogTargets_items_eventQueueArn"></a>1.1.10.1.1.4. Property `root > crawlers > additionalProperties > targets > catalogTargets > catalogTargets items > eventQueueArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A valid Amazon SQS ARN.

For example, `arn:aws:sqs:region:account:sqs` .

###### <a name="crawlers_additionalProperties_targets_catalogTargets_items_tables"></a>1.1.10.1.1.5. Property `root > crawlers > additionalProperties > targets > catalogTargets > catalogTargets items > tables`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** A list of the tables to be synchronized.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                          | Description |
| ---------------------------------------------------------------------------------------- | ----------- |
| [tables items](#crawlers_additionalProperties_targets_catalogTargets_items_tables_items) | -           |

###### <a name="autogenerated_heading_4"></a>1.1.10.1.1.5.1. root > crawlers > additionalProperties > targets > catalogTargets > catalogTargets items > tables > tables items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="crawlers_additionalProperties_targets_dynamoDbTargets"></a>1.1.10.2. Property `root > crawlers > additionalProperties > targets > dynamoDbTargets`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** Target Definition for DynamoDB.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-dynamodbtarget.html

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                   | Description                                  |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| [CfnCrawler.DynamoDBTargetProperty](#crawlers_additionalProperties_targets_dynamoDbTargets_items) | Specifies an Amazon DynamoDB table to crawl. |

###### <a name="autogenerated_heading_5"></a>1.1.10.2.1. root > crawlers > additionalProperties > targets > dynamoDbTargets > CfnCrawler.DynamoDBTargetProperty

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnCrawler.DynamoDBTargetProperty         |

**Description:** Specifies an Amazon DynamoDB table to crawl.

| Property                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description                        |
| ---------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ---------------------------------------- |
| - [path](#crawlers_additionalProperties_targets_dynamoDbTargets_items_path ) | No      | string | No         | -          | The name of the DynamoDB table to crawl. |

###### <a name="crawlers_additionalProperties_targets_dynamoDbTargets_items_path"></a>1.1.10.2.1.1. Property `root > crawlers > additionalProperties > targets > dynamoDbTargets > dynamoDbTargets items > path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of the DynamoDB table to crawl.

##### <a name="crawlers_additionalProperties_targets_jdbcTargets"></a>1.1.10.3. Property `root > crawlers > additionalProperties > targets > jdbcTargets`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** Target Definition for JDBC.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-jdbctarget.html

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                           | Description                           |
| ----------------------------------------------------------------------------------------- | ------------------------------------- |
| [CfnCrawler.JdbcTargetProperty](#crawlers_additionalProperties_targets_jdbcTargets_items) | Specifies a JDBC data store to crawl. |

###### <a name="autogenerated_heading_6"></a>1.1.10.3.1. root > crawlers > additionalProperties > targets > jdbcTargets > CfnCrawler.JdbcTargetProperty

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnCrawler.JdbcTargetProperty             |

**Description:** Specifies a JDBC data store to crawl.

| Property                                                                                                         | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [connectionName](#crawlers_additionalProperties_targets_jdbcTargets_items_connectionName )                     | No      | string          | No         | -          | The name of the connection to use to connect to the JDBC target.                                                                                                                                                                                                                                                         |
| - [enableAdditionalMetadata](#crawlers_additionalProperties_targets_jdbcTargets_items_enableAdditionalMetadata ) | No      | array of string | No         | -          | Specify a value of \`RAWTYPES\` or \`COMMENTS\` to enable additional metadata in table responses.<br /><br />\`RAWTYPES\` provides the native-level datatype. \`COMMENTS\` provides comments associated with a column or table in the database.<br /><br />If you do not need additional metadata, keep the field empty. |
| - [exclusions](#crawlers_additionalProperties_targets_jdbcTargets_items_exclusions )                             | No      | array of string | No         | -          | A list of glob patterns used to exclude from the crawl.<br /><br />For more information, see [Catalog Tables with a Crawler](https://docs.aws.amazon.com/glue/latest/dg/add-crawler.html) .                                                                                                                              |
| - [path](#crawlers_additionalProperties_targets_jdbcTargets_items_path )                                         | No      | string          | No         | -          | The path of the JDBC target.                                                                                                                                                                                                                                                                                             |

###### <a name="crawlers_additionalProperties_targets_jdbcTargets_items_connectionName"></a>1.1.10.3.1.1. Property `root > crawlers > additionalProperties > targets > jdbcTargets > jdbcTargets items > connectionName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of the connection to use to connect to the JDBC target.

###### <a name="crawlers_additionalProperties_targets_jdbcTargets_items_enableAdditionalMetadata"></a>1.1.10.3.1.2. Property `root > crawlers > additionalProperties > targets > jdbcTargets > jdbcTargets items > enableAdditionalMetadata`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Specify a value of `RAWTYPES` or `COMMENTS` to enable additional metadata in table responses.

`RAWTYPES` provides the native-level datatype. `COMMENTS` provides comments associated with a column or table in the database.

If you do not need additional metadata, keep the field empty.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                           | Description |
| ------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [enableAdditionalMetadata items](#crawlers_additionalProperties_targets_jdbcTargets_items_enableAdditionalMetadata_items) | -           |

###### <a name="autogenerated_heading_7"></a>1.1.10.3.1.2.1. root > crawlers > additionalProperties > targets > jdbcTargets > jdbcTargets items > enableAdditionalMetadata > enableAdditionalMetadata items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="crawlers_additionalProperties_targets_jdbcTargets_items_exclusions"></a>1.1.10.3.1.3. Property `root > crawlers > additionalProperties > targets > jdbcTargets > jdbcTargets items > exclusions`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** A list of glob patterns used to exclude from the crawl.

For more information, see [Catalog Tables with a Crawler](https://docs.aws.amazon.com/glue/latest/dg/add-crawler.html) .

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                               | Description |
| --------------------------------------------------------------------------------------------- | ----------- |
| [exclusions items](#crawlers_additionalProperties_targets_jdbcTargets_items_exclusions_items) | -           |

###### <a name="autogenerated_heading_8"></a>1.1.10.3.1.3.1. root > crawlers > additionalProperties > targets > jdbcTargets > jdbcTargets items > exclusions > exclusions items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="crawlers_additionalProperties_targets_jdbcTargets_items_path"></a>1.1.10.3.1.4. Property `root > crawlers > additionalProperties > targets > jdbcTargets > jdbcTargets items > path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The path of the JDBC target.

##### <a name="crawlers_additionalProperties_targets_s3Targets"></a>1.1.10.4. Property `root > crawlers > additionalProperties > targets > s3Targets`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** Target Definition for   See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-crawler-s3target.html

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                       | Description                                                          |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| [CfnCrawler.S3TargetProperty](#crawlers_additionalProperties_targets_s3Targets_items) | Specifies a data store in Amazon Simple Storage Service (Amazon S3). |

###### <a name="autogenerated_heading_9"></a>1.1.10.4.1. root > crawlers > additionalProperties > targets > s3Targets > CfnCrawler.S3TargetProperty

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnCrawler.S3TargetProperty               |

**Description:** Specifies a data store in Amazon Simple Storage Service (Amazon S3).

| Property                                                                                       | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [connectionName](#crawlers_additionalProperties_targets_s3Targets_items_connectionName )     | No      | string          | No         | -          | The name of a connection which allows a job or crawler to access data in Amazon S3 within an Amazon Virtual Private Cloud environment (Amazon VPC).                                                  |
| - [dlqEventQueueArn](#crawlers_additionalProperties_targets_s3Targets_items_dlqEventQueueArn ) | No      | string          | No         | -          | A valid Amazon dead-letter SQS ARN.<br /><br />For example, \`arn:aws:sqs:region:account:deadLetterQueue\` .                                                                                         |
| - [eventQueueArn](#crawlers_additionalProperties_targets_s3Targets_items_eventQueueArn )       | No      | string          | No         | -          | A valid Amazon SQS ARN.<br /><br />For example, \`arn:aws:sqs:region:account:sqs\` .                                                                                                                 |
| - [exclusions](#crawlers_additionalProperties_targets_s3Targets_items_exclusions )             | No      | array of string | No         | -          | A list of glob patterns used to exclude from the crawl.<br /><br />For more information, see [Catalog Tables with a Crawler](https://docs.aws.amazon.com/glue/latest/dg/add-crawler.html) .          |
| - [path](#crawlers_additionalProperties_targets_s3Targets_items_path )                         | No      | string          | No         | -          | The path to the Amazon S3 target.                                                                                                                                                                    |
| - [sampleSize](#crawlers_additionalProperties_targets_s3Targets_items_sampleSize )             | No      | number          | No         | -          | Sets the number of files in each leaf folder to be crawled when crawling sample files in a dataset.<br /><br />If not set, all the files are crawled. A valid value is an integer between 1 and 249. |

###### <a name="crawlers_additionalProperties_targets_s3Targets_items_connectionName"></a>1.1.10.4.1.1. Property `root > crawlers > additionalProperties > targets > s3Targets > s3Targets items > connectionName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of a connection which allows a job or crawler to access data in Amazon S3 within an Amazon Virtual Private Cloud environment (Amazon VPC).

###### <a name="crawlers_additionalProperties_targets_s3Targets_items_dlqEventQueueArn"></a>1.1.10.4.1.2. Property `root > crawlers > additionalProperties > targets > s3Targets > s3Targets items > dlqEventQueueArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A valid Amazon dead-letter SQS ARN.

For example, `arn:aws:sqs:region:account:deadLetterQueue` .

###### <a name="crawlers_additionalProperties_targets_s3Targets_items_eventQueueArn"></a>1.1.10.4.1.3. Property `root > crawlers > additionalProperties > targets > s3Targets > s3Targets items > eventQueueArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A valid Amazon SQS ARN.

For example, `arn:aws:sqs:region:account:sqs` .

###### <a name="crawlers_additionalProperties_targets_s3Targets_items_exclusions"></a>1.1.10.4.1.4. Property `root > crawlers > additionalProperties > targets > s3Targets > s3Targets items > exclusions`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** A list of glob patterns used to exclude from the crawl.

For more information, see [Catalog Tables with a Crawler](https://docs.aws.amazon.com/glue/latest/dg/add-crawler.html) .

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                             | Description |
| ------------------------------------------------------------------------------------------- | ----------- |
| [exclusions items](#crawlers_additionalProperties_targets_s3Targets_items_exclusions_items) | -           |

###### <a name="autogenerated_heading_10"></a>1.1.10.4.1.4.1. root > crawlers > additionalProperties > targets > s3Targets > s3Targets items > exclusions > exclusions items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="crawlers_additionalProperties_targets_s3Targets_items_path"></a>1.1.10.4.1.5. Property `root > crawlers > additionalProperties > targets > s3Targets > s3Targets items > path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The path to the Amazon S3 target.

###### <a name="crawlers_additionalProperties_targets_s3Targets_items_sampleSize"></a>1.1.10.4.1.6. Property `root > crawlers > additionalProperties > targets > s3Targets > s3Targets items > sampleSize`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Sets the number of files in each leaf folder to be crawled when crawling sample files in a dataset.

If not set, all the files are crawled. A valid value is an integer between 1 and 249.

## <a name="deploymentRole"></a>2. Property `root > deploymentRole`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

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

#### <a name="autogenerated_heading_11"></a>4.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

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

###### <a name="autogenerated_heading_12"></a>4.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

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

**Description:** Name of the Data Ops project. The crawler config will be autowired to use existing resources deployed by the project.

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

###### <a name="autogenerated_heading_13"></a>9.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

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

###### <a name="autogenerated_heading_14"></a>9.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

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

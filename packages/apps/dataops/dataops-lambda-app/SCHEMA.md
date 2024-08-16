# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                       | Title/Description                                                                                                                                    |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [deploymentRole](#deploymentRole )                                 | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [functions](#functions )                                           | No      | array  | No         | -                                                | Functions to create                                                                                                                                  |
| + [kmsArn](#kmsArn )                                                 | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [layers](#layers )                                                 | No      | array  | No         | -                                                | Layers to create                                                                                                                                     |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                     |
| + [projectBucket](#projectBucket )                                   | No      | string | No         | -                                                | -                                                                                                                                                    |
| + [projectName](#projectName )                                       | No      | string | No         | -                                                | Name of the DataOps Project                                                                                                                          |
| + [projectTopicArn](#projectTopicArn )                               | No      | string | No         | -                                                | -                                                                                                                                                    |
| + [securityConfigurationName](#securityConfigurationName )           | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |

## <a name="deploymentRole"></a>1. Property `root > deploymentRole`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="functions"></a>2. Property `root > functions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** Functions to create

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be   | Description |
| --------------------------------- | ----------- |
| [FunctionProps](#functions_items) | -           |

### <a name="autogenerated_heading_2"></a>2.1. root > functions > FunctionProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/FunctionProps                             |

| Property                                                                         | Pattern | Type            | Deprecated | Definition                        | Title/Description                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------- | ------- | --------------- | ---------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [description](#functions_items_description )                                   | No      | string          | No         | -                                 | A description of the function.                                                                                                                                                                                                                                        |
| - [dockerBuild](#functions_items_dockerBuild )                                   | No      | boolean         | No         | -                                 | If true, srcDir is expected to contain a DockerFile                                                                                                                                                                                                                   |
| - [environment](#functions_items_environment )                                   | No      | object          | No         | -                                 | Key-value pairs that Lambda caches and makes available for your Lambda<br />functions. Use environment variables to apply configuration changes, such<br />as test and production environment configurations, without changing your<br />Lambda function source code. |
| - [ephemeralStorageSizeMB](#functions_items_ephemeralStorageSizeMB )             | No      | number          | No         | -                                 | The size of the function’s /tmp directory in MB.                                                                                                                                                                                                                      |
| - [eventBridge](#functions_items_eventBridge )                                   | No      | object          | No         | In #/definitions/EventBridgeProps | EventBridge props                                                                                                                                                                                                                                                     |
| + [functionName](#functions_items_functionName )                                 | No      | string          | No         | -                                 | The basic function name                                                                                                                                                                                                                                               |
| - [generatedLayerNames](#functions_items_generatedLayerNames )                   | No      | array of string | No         | -                                 | List of layer names generated by this config to be added to the function                                                                                                                                                                                              |
| - [handler](#functions_items_handler )                                           | No      | string          | No         | -                                 | The Lambda handler in the source code                                                                                                                                                                                                                                 |
| - [layerArns](#functions_items_layerArns )                                       | No      | object          | No         | -                                 | -                                                                                                                                                                                                                                                                     |
| - [maxEventAgeSeconds](#functions_items_maxEventAgeSeconds )                     | No      | number          | No         | -                                 | The maximum age of a request (in seconds) that Lambda sends to a function for<br />processing.<br /><br />Minimum: 60 seconds<br />Maximum: 6 hours                                                                                                                   |
| - [memorySizeMB](#functions_items_memorySizeMB )                                 | No      | number          | No         | -                                 | The amount of memory, in MB, that is allocated to your Lambda function.<br />Lambda uses this value to proportionally allocate the amount of CPU<br />power. For more information, see Resource Model in the AWS Lambda<br />Developer Guide.                         |
| - [reservedConcurrentExecutions](#functions_items_reservedConcurrentExecutions ) | No      | number          | No         | -                                 | The maximum of concurrent executions you want to reserve for the function.                                                                                                                                                                                            |
| - [retryAttempts](#functions_items_retryAttempts )                               | No      | number          | No         | -                                 | The maximum number of times to retry when the function returns an error.<br /><br />Minimum: 0<br />Maximum: 2                                                                                                                                                        |
| + [roleArn](#functions_items_roleArn )                                           | No      | string          | No         | -                                 | The arn of the role with which the function will be executed                                                                                                                                                                                                          |
| - [runtime](#functions_items_runtime )                                           | No      | string          | No         | -                                 | The name of the Lambda runtime. IE 'python3.8' 'nodejs14.x'                                                                                                                                                                                                           |
| + [srcDir](#functions_items_srcDir )                                             | No      | string          | No         | -                                 | Function source code location                                                                                                                                                                                                                                         |
| - [timeoutSeconds](#functions_items_timeoutSeconds )                             | No      | number          | No         | -                                 | The function execution time (in seconds) after which Lambda terminates<br />the function. Because the execution time affects cost, set this value<br />based on the function's expected execution time.                                                               |
| - [vpcConfig](#functions_items_vpcConfig )                                       | No      | object          | No         | In #/definitions/VpcConfigProps   | If specified, function will be VPC bound                                                                                                                                                                                                                              |

#### <a name="functions_items_description"></a>2.1.1. Property `root > functions > functions items > description`

|              |                       |
| ------------ | --------------------- |
| **Type**     | `string`              |
| **Required** | No                    |
| **Default**  | `"- No description."` |

**Description:** A description of the function.

#### <a name="functions_items_dockerBuild"></a>2.1.2. Property `root > functions > functions items > dockerBuild`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true, srcDir is expected to contain a DockerFile

#### <a name="functions_items_environment"></a>2.1.3. Property `root > functions > functions items > environment`

|                           |                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                              |
| **Required**              | No                                                                                                                                    |
| **Additional properties** | [[Should-conform]](#functions_items_environment_additionalProperties "Each additional property must conform to the following schema") |
| **Default**               | `"- No environment variables."`                                                                                                       |

**Description:** Key-value pairs that Lambda caches and makes available for your Lambda
functions. Use environment variables to apply configuration changes, such
as test and production environment configurations, without changing your
Lambda function source code.

| Property                                                 | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#functions_items_environment_additionalProperties ) | No      | string | No         | -          | -                 |

##### <a name="functions_items_environment_additionalProperties"></a>2.1.3.1. Property `root > functions > functions items > environment > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="functions_items_ephemeralStorageSizeMB"></a>2.1.4. Property `root > functions > functions items > ephemeralStorageSizeMB`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"512 MiB"` |

**Description:** The size of the function’s /tmp directory in MB.

#### <a name="functions_items_eventBridge"></a>2.1.5. Property `root > functions > functions items > eventBridge`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/EventBridgeProps                          |

**Description:** EventBridge props

| Property                                                                 | Pattern | Type   | Deprecated | Definition                                   | Title/Description                                                                                                                |
| ------------------------------------------------------------------------ | ------- | ------ | ---------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| - [eventBridgeRules](#functions_items_eventBridge_eventBridgeRules )     | No      | object | No         | In #/definitions/NamedEventBridgeRuleProps   | List of EventBridge rules to trigger the Lambda function from S3 EventBridge notifications                                       |
| - [maxEventAgeSeconds](#functions_items_eventBridge_maxEventAgeSeconds ) | No      | number | No         | -                                            | The maximum age of a request that EventBridge sends to target<br /><br />Minimum value of 60.<br />Maximum value of 86400.       |
| - [retryAttempts](#functions_items_eventBridge_retryAttempts )           | No      | number | No         | -                                            | The maximum number of times to retry when the target returns an error.<br /><br />Minimum value of 0.<br />Maximum value of 185. |
| - [s3EventBridgeRules](#functions_items_eventBridge_s3EventBridgeRules ) | No      | object | No         | In #/definitions/NamedS3EventBridgeRuleProps | List of EventBridge rules to trigger the Lambda function from S3 EventBridge notifications                                       |

##### <a name="functions_items_eventBridge_eventBridgeRules"></a>2.1.5.1. Property `root > functions > functions items > eventBridge > eventBridgeRules`

|                           |                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                               |
| **Required**              | No                                                                                                                                                     |
| **Additional properties** | [[Should-conform]](#functions_items_eventBridge_eventBridgeRules_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedEventBridgeRuleProps                                                                                                                |

**Description:** List of EventBridge rules to trigger the Lambda function from S3 EventBridge notifications

| Property                                                                  | Pattern | Type   | Deprecated | Definition                            | Title/Description |
| ------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------- | ----------------- |
| - [](#functions_items_eventBridge_eventBridgeRules_additionalProperties ) | No      | object | No         | In #/definitions/EventBridgeRuleProps | -                 |

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties"></a>2.1.5.1.1. Property `root > functions > functions items > eventBridge > eventBridgeRules > EventBridgeRuleProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/EventBridgeRuleProps                      |

| Property                                                                                                       | Pattern | Type   | Deprecated | Definition                    | Title/Description                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [description](#functions_items_eventBridge_eventBridgeRules_additionalProperties_description )               | No      | string | No         | -                             | Description of the rule                                                                                                                                                                                              |
| - [eventBusArn](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventBusArn )               | No      | string | No         | -                             | If specified, rule will be created against this event bus.<br />If not specified, default event bus will be used.                                                                                                    |
| - [eventPattern](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern )             | No      | object | No         | In #/definitions/EventPattern | The Event Pattern to be passed to the rule                                                                                                                                                                           |
| - [input](#functions_items_eventBridge_eventBridgeRules_additionalProperties_input )                           | No      | object | No         | -                             | If specified, this input will be provided as event payload to the target. Otherwise<br />the target input will be the matched event content.                                                                         |
| - [scheduleExpression](#functions_items_eventBridge_eventBridgeRules_additionalProperties_scheduleExpression ) | No      | string | No         | -                             | If specified, the rule will be schedule according to this expression.<br />Expression should follow the EventBridge specification: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-cron-expressions.html |

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_description"></a>2.1.5.1.1.1. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Description of the rule

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_eventBusArn"></a>2.1.5.1.1.2. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventBusArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** If specified, rule will be created against this event bus.
If not specified, default event bus will be used.

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern"></a>2.1.5.1.1.3. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/EventPattern                              |

**Description:** The Event Pattern to be passed to the rule

| Property                                                                                                    | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [account](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_account )       | No      | array of string | No         | -          | The 12-digit number identifying an AWS account.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| - [detail](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detail )         | No      | object          | No         | -          | A JSON object, whose content is at the discretion of the service<br />originating the event.                                                                                                                                                                                                                                                                                                                                                                                             |
| - [detailType](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detailType ) | No      | array of string | No         | -          | Identifies, in combination with the source field, the fields and values<br />that appear in the detail field.<br /><br />Represents the "detail-type" event field.                                                                                                                                                                                                                                                                                                                       |
| - [id](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_id )                 | No      | array of string | No         | -          | A unique value is generated for every event. This can be helpful in<br />tracing events as they move through rules to targets, and are processed.                                                                                                                                                                                                                                                                                                                                        |
| - [region](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_region )         | No      | array of string | No         | -          | Identifies the AWS region where the event originated.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| - [resources](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_resources )   | No      | array of string | No         | -          | This JSON array contains ARNs that identify resources that are involved<br />in the event. Inclusion of these ARNs is at the discretion of the<br />service.<br /><br />For example, Amazon EC2 instance state-changes include Amazon EC2<br />instance ARNs, Auto Scaling events include ARNs for both instances and<br />Auto Scaling groups, but API calls with AWS CloudTrail do not include<br />resource ARNs.                                                                     |
| - [source](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_source )         | No      | array of string | No         | -          | Identifies the service that sourced the event. All events sourced from<br />within AWS begin with "aws." Customer-generated events can have any value<br />here, as long as it doesn't begin with "aws." We recommend the use of<br />Java package-name style reverse domain-name strings.<br /><br />To find the correct value for source for an AWS service, see the table in<br />AWS Service Namespaces. For example, the source value for Amazon<br />CloudFront is aws.cloudfront. |
| - [time](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_time )             | No      | array of string | No         | -          | The event timestamp, which can be specified by the service originating<br />the event. If the event spans a time interval, the service might choose<br />to report the start time, so this value can be noticeably before the time<br />the event is actually received.                                                                                                                                                                                                                  |
| - [version](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_version )       | No      | array of string | No         | -          | By default, this is set to 0 (zero) in all events.                                                                                                                                                                                                                                                                                                                                                                                                                                       |

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_account"></a>2.1.5.1.1.3.1. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > account`

|              |                               |
| ------------ | ----------------------------- |
| **Type**     | `array of string`             |
| **Required** | No                            |
| **Default**  | `"- No filtering on account"` |

**Description:** The 12-digit number identifying an AWS account.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                | Description |
| -------------------------------------------------------------------------------------------------------------- | ----------- |
| [account items](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_account_items) | -           |

###### <a name="autogenerated_heading_3"></a>2.1.5.1.1.3.1.1. root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > account > account items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detail"></a>2.1.5.1.1.3.2. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > detail`

|                           |                                                                                                                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                        |
| **Required**              | No                                                                                                                                                                                              |
| **Additional properties** | [[Should-conform]](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detail_additionalProperties "Each additional property must conform to the following schema") |
| **Default**               | `"- No filtering on detail"`                                                                                                                                                                    |

**Description:** A JSON object, whose content is at the discretion of the service
originating the event.

| Property                                                                                                           | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detail_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detail_additionalProperties"></a>2.1.5.1.1.3.2.1. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > detail > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detailType"></a>2.1.5.1.1.3.3. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > detailType`

|              |                                   |
| ------------ | --------------------------------- |
| **Type**     | `array of string`                 |
| **Required** | No                                |
| **Default**  | `"- No filtering on detail type"` |

**Description:** Identifies, in combination with the source field, the fields and values
that appear in the detail field.

Represents the "detail-type" event field.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                      | Description |
| -------------------------------------------------------------------------------------------------------------------- | ----------- |
| [detailType items](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detailType_items) | -           |

###### <a name="autogenerated_heading_4"></a>2.1.5.1.1.3.3.1. root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > detailType > detailType items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_id"></a>2.1.5.1.1.3.4. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > id`

|              |                          |
| ------------ | ------------------------ |
| **Type**     | `array of string`        |
| **Required** | No                       |
| **Default**  | `"- No filtering on id"` |

**Description:** A unique value is generated for every event. This can be helpful in
tracing events as they move through rules to targets, and are processed.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                      | Description |
| ---------------------------------------------------------------------------------------------------- | ----------- |
| [id items](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_id_items) | -           |

###### <a name="autogenerated_heading_5"></a>2.1.5.1.1.3.4.1. root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > id > id items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_region"></a>2.1.5.1.1.3.5. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > region`

|              |                              |
| ------------ | ---------------------------- |
| **Type**     | `array of string`            |
| **Required** | No                           |
| **Default**  | `"- No filtering on region"` |

**Description:** Identifies the AWS region where the event originated.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                              | Description |
| ------------------------------------------------------------------------------------------------------------ | ----------- |
| [region items](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_region_items) | -           |

###### <a name="autogenerated_heading_6"></a>2.1.5.1.1.3.5.1. root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > region > region items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_resources"></a>2.1.5.1.1.3.6. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > resources`

|              |                                |
| ------------ | ------------------------------ |
| **Type**     | `array of string`              |
| **Required** | No                             |
| **Default**  | `"- No filtering on resource"` |

**Description:** This JSON array contains ARNs that identify resources that are involved
in the event. Inclusion of these ARNs is at the discretion of the
service.

For example, Amazon EC2 instance state-changes include Amazon EC2
instance ARNs, Auto Scaling events include ARNs for both instances and
Auto Scaling groups, but API calls with AWS CloudTrail do not include
resource ARNs.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                    | Description |
| ------------------------------------------------------------------------------------------------------------------ | ----------- |
| [resources items](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_resources_items) | -           |

###### <a name="autogenerated_heading_7"></a>2.1.5.1.1.3.6.1. root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > resources > resources items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_source"></a>2.1.5.1.1.3.7. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > source`

|              |                              |
| ------------ | ---------------------------- |
| **Type**     | `array of string`            |
| **Required** | No                           |
| **Default**  | `"- No filtering on source"` |

**Description:** Identifies the service that sourced the event. All events sourced from
within AWS begin with "aws." Customer-generated events can have any value
here, as long as it doesn't begin with "aws." We recommend the use of
Java package-name style reverse domain-name strings.

To find the correct value for source for an AWS service, see the table in
AWS Service Namespaces. For example, the source value for Amazon
CloudFront is aws.cloudfront.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                              | Description |
| ------------------------------------------------------------------------------------------------------------ | ----------- |
| [source items](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_source_items) | -           |

###### <a name="autogenerated_heading_8"></a>2.1.5.1.1.3.7.1. root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > source > source items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_time"></a>2.1.5.1.1.3.8. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > time`

|              |                            |
| ------------ | -------------------------- |
| **Type**     | `array of string`          |
| **Required** | No                         |
| **Default**  | `"- No filtering on time"` |

**Description:** The event timestamp, which can be specified by the service originating
the event. If the event spans a time interval, the service might choose
to report the start time, so this value can be noticeably before the time
the event is actually received.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                          | Description |
| -------------------------------------------------------------------------------------------------------- | ----------- |
| [time items](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_time_items) | -           |

###### <a name="autogenerated_heading_9"></a>2.1.5.1.1.3.8.1. root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > time > time items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_version"></a>2.1.5.1.1.3.9. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > version`

|              |                               |
| ------------ | ----------------------------- |
| **Type**     | `array of string`             |
| **Required** | No                            |
| **Default**  | `"- No filtering on version"` |

**Description:** By default, this is set to 0 (zero) in all events.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                | Description |
| -------------------------------------------------------------------------------------------------------------- | ----------- |
| [version items](#functions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_version_items) | -           |

###### <a name="autogenerated_heading_10"></a>2.1.5.1.1.3.9.1. root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > version > version items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_input"></a>2.1.5.1.1.4. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > input`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** If specified, this input will be provided as event payload to the target. Otherwise
the target input will be the matched event content.

###### <a name="functions_items_eventBridge_eventBridgeRules_additionalProperties_scheduleExpression"></a>2.1.5.1.1.5. Property `root > functions > functions items > eventBridge > eventBridgeRules > additionalProperties > scheduleExpression`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** If specified, the rule will be schedule according to this expression.
Expression should follow the EventBridge specification: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-cron-expressions.html

##### <a name="functions_items_eventBridge_maxEventAgeSeconds"></a>2.1.5.2. Property `root > functions > functions items > eventBridge > maxEventAgeSeconds`

|              |                      |
| ------------ | -------------------- |
| **Type**     | `number`             |
| **Required** | No                   |
| **Default**  | `"86400 (24 hours)"` |

**Description:** The maximum age of a request that EventBridge sends to target

Minimum value of 60.
Maximum value of 86400.

##### <a name="functions_items_eventBridge_retryAttempts"></a>2.1.5.3. Property `root > functions > functions items > eventBridge > retryAttempts`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |
| **Default**  | `185`    |

**Description:** The maximum number of times to retry when the target returns an error.

Minimum value of 0.
Maximum value of 185.

##### <a name="functions_items_eventBridge_s3EventBridgeRules"></a>2.1.5.4. Property `root > functions > functions items > eventBridge > s3EventBridgeRules`

|                           |                                                                                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                 |
| **Required**              | No                                                                                                                                                       |
| **Additional properties** | [[Should-conform]](#functions_items_eventBridge_s3EventBridgeRules_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedS3EventBridgeRuleProps                                                                                                                |

**Description:** List of EventBridge rules to trigger the Lambda function from S3 EventBridge notifications

| Property                                                                    | Pattern | Type   | Deprecated | Definition                              | Title/Description |
| --------------------------------------------------------------------------- | ------- | ------ | ---------- | --------------------------------------- | ----------------- |
| - [](#functions_items_eventBridge_s3EventBridgeRules_additionalProperties ) | No      | object | No         | In #/definitions/S3EventBridgeRuleProps | -                 |

###### <a name="functions_items_eventBridge_s3EventBridgeRules_additionalProperties"></a>2.1.5.4.1. Property `root > functions > functions items > eventBridge > s3EventBridgeRules > S3EventBridgeRuleProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/S3EventBridgeRuleProps                    |

| Property                                                                                           | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                 |
| -------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| + [buckets](#functions_items_eventBridge_s3EventBridgeRules_additionalProperties_buckets )         | No      | array of string | No         | -          | Name of the buckets on which to match                                                                             |
| - [eventBusArn](#functions_items_eventBridge_s3EventBridgeRules_additionalProperties_eventBusArn ) | No      | string          | No         | -          | If specified, rule will be created against this event bus.<br />If not specified, default event bus will be used. |
| - [prefixes](#functions_items_eventBridge_s3EventBridgeRules_additionalProperties_prefixes )       | No      | array of string | No         | -          | Object key prefixes on which to match                                                                             |

###### <a name="functions_items_eventBridge_s3EventBridgeRules_additionalProperties_buckets"></a>2.1.5.4.1.1. Property `root > functions > functions items > eventBridge > s3EventBridgeRules > additionalProperties > buckets`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** Name of the buckets on which to match

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                     | Description |
| --------------------------------------------------------------------------------------------------- | ----------- |
| [buckets items](#functions_items_eventBridge_s3EventBridgeRules_additionalProperties_buckets_items) | -           |

###### <a name="autogenerated_heading_11"></a>2.1.5.4.1.1.1. root > functions > functions items > eventBridge > s3EventBridgeRules > additionalProperties > buckets > buckets items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="functions_items_eventBridge_s3EventBridgeRules_additionalProperties_eventBusArn"></a>2.1.5.4.1.2. Property `root > functions > functions items > eventBridge > s3EventBridgeRules > additionalProperties > eventBusArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** If specified, rule will be created against this event bus.
If not specified, default event bus will be used.

###### <a name="functions_items_eventBridge_s3EventBridgeRules_additionalProperties_prefixes"></a>2.1.5.4.1.3. Property `root > functions > functions items > eventBridge > s3EventBridgeRules > additionalProperties > prefixes`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Object key prefixes on which to match

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                       | Description |
| ----------------------------------------------------------------------------------------------------- | ----------- |
| [prefixes items](#functions_items_eventBridge_s3EventBridgeRules_additionalProperties_prefixes_items) | -           |

###### <a name="autogenerated_heading_12"></a>2.1.5.4.1.3.1. root > functions > functions items > eventBridge > s3EventBridgeRules > additionalProperties > prefixes > prefixes items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="functions_items_functionName"></a>2.1.6. Property `root > functions > functions items > functionName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The basic function name

#### <a name="functions_items_generatedLayerNames"></a>2.1.7. Property `root > functions > functions items > generatedLayerNames`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** List of layer names generated by this config to be added to the function

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                         | Description |
| ----------------------------------------------------------------------- | ----------- |
| [generatedLayerNames items](#functions_items_generatedLayerNames_items) | -           |

##### <a name="autogenerated_heading_13"></a>2.1.7.1. root > functions > functions items > generatedLayerNames > generatedLayerNames items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="functions_items_handler"></a>2.1.8. Property `root > functions > functions items > handler`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The Lambda handler in the source code

#### <a name="functions_items_layerArns"></a>2.1.9. Property `root > functions > functions items > layerArns`

|                           |                                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                            |
| **Required**              | No                                                                                                                                  |
| **Additional properties** | [[Should-conform]](#functions_items_layerArns_additionalProperties "Each additional property must conform to the following schema") |

| Property                                               | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#functions_items_layerArns_additionalProperties ) | No      | string | No         | -          | -                 |

##### <a name="functions_items_layerArns_additionalProperties"></a>2.1.9.1. Property `root > functions > functions items > layerArns > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="functions_items_maxEventAgeSeconds"></a>2.1.10. Property `root > functions > functions items > maxEventAgeSeconds`

|              |                             |
| ------------ | --------------------------- |
| **Type**     | `number`                    |
| **Required** | No                          |
| **Default**  | `"21600 seconds (6 hours)"` |

**Description:** The maximum age of a request (in seconds) that Lambda sends to a function for
processing.

Minimum: 60 seconds
Maximum: 6 hours

#### <a name="functions_items_memorySizeMB"></a>2.1.11. Property `root > functions > functions items > memorySizeMB`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |
| **Default**  | `128`    |

**Description:** The amount of memory, in MB, that is allocated to your Lambda function.
Lambda uses this value to proportionally allocate the amount of CPU
power. For more information, see Resource Model in the AWS Lambda
Developer Guide.

#### <a name="functions_items_reservedConcurrentExecutions"></a>2.1.12. Property `root > functions > functions items > reservedConcurrentExecutions`

|              |                                          |
| ------------ | ---------------------------------------- |
| **Type**     | `number`                                 |
| **Required** | No                                       |
| **Default**  | `"- No specific limit - account limit."` |

**Description:** The maximum of concurrent executions you want to reserve for the function.

#### <a name="functions_items_retryAttempts"></a>2.1.13. Property `root > functions > functions items > retryAttempts`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |
| **Default**  | `2`      |

**Description:** The maximum number of times to retry when the function returns an error.

Minimum: 0
Maximum: 2

#### <a name="functions_items_roleArn"></a>2.1.14. Property `root > functions > functions items > roleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The arn of the role with which the function will be executed

#### <a name="functions_items_runtime"></a>2.1.15. Property `root > functions > functions items > runtime`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of the Lambda runtime. IE 'python3.8' 'nodejs14.x'

#### <a name="functions_items_srcDir"></a>2.1.16. Property `root > functions > functions items > srcDir`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Function source code location

#### <a name="functions_items_timeoutSeconds"></a>2.1.17. Property `root > functions > functions items > timeoutSeconds`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |
| **Default**  | `3`      |

**Description:** The function execution time (in seconds) after which Lambda terminates
the function. Because the execution time affects cost, set this value
based on the function's expected execution time.

#### <a name="functions_items_vpcConfig"></a>2.1.18. Property `root > functions > functions items > vpcConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/VpcConfigProps                            |

**Description:** If specified, function will be VPC bound

| Property                                                                           | Pattern | Type            | Deprecated | Definition                                  | Title/Description                                                                                                                           |
| ---------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| - [securityGroupEgressRules](#functions_items_vpcConfig_securityGroupEgressRules ) | No      | object          | No         | In #/definitions/MdaaSecurityGroupRuleProps | List of egress rules to be added to the function SG                                                                                         |
| - [securityGroupId](#functions_items_vpcConfig_securityGroupId )                   | No      | string          | No         | -                                           | If specified, the function will use this security group for<br />it's VPC connection. Otherwise a new security group will <br />be created. |
| + [subnetIds](#functions_items_vpcConfig_subnetIds )                               | No      | array of string | No         | -                                           | The IDs of the subnets on which the Lambda will be deployed                                                                                 |
| + [vpcId](#functions_items_vpcConfig_vpcId )                                       | No      | string          | No         | -                                           | The ID of the VPC on which the Lambda will be deployed                                                                                      |

##### <a name="functions_items_vpcConfig_securityGroupEgressRules"></a>2.1.18.1. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaSecurityGroupRuleProps                |

**Description:** List of egress rules to be added to the function SG

| Property                                                                        | Pattern | Type  | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------- | ------- | ----- | ---------- | ---------- | ----------------- |
| - [ipv4](#functions_items_vpcConfig_securityGroupEgressRules_ipv4 )             | No      | array | No         | -          | -                 |
| - [prefixList](#functions_items_vpcConfig_securityGroupEgressRules_prefixList ) | No      | array | No         | -          | -                 |
| - [sg](#functions_items_vpcConfig_securityGroupEgressRules_sg )                 | No      | array | No         | -          | -                 |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_ipv4"></a>2.1.18.1.1. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > ipv4`

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

| Each item of this array must be                                                | Description |
| ------------------------------------------------------------------------------ | ----------- |
| [MdaaCidrPeer](#functions_items_vpcConfig_securityGroupEgressRules_ipv4_items) | -           |

###### <a name="autogenerated_heading_14"></a>2.1.18.1.1.1. root > functions > functions items > vpcConfig > securityGroupEgressRules > ipv4 > MdaaCidrPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaCidrPeer                              |

| Property                                                                                       | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [cidr](#functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_cidr )                 | No      | string | No         | -          | -                 |
| - [description](#functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_description )   | No      | string | No         | -          | -                 |
| - [port](#functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_port )                 | No      | number | No         | -          | -                 |
| + [protocol](#functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_protocol )         | No      | string | No         | -          | -                 |
| - [suppressions](#functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_cidr"></a>2.1.18.1.1.1.1. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > ipv4 > ipv4 items > cidr`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_description"></a>2.1.18.1.1.1.2. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > ipv4 > ipv4 items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_port"></a>2.1.18.1.1.1.3. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > ipv4 > ipv4 items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_protocol"></a>2.1.18.1.1.1.4. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > ipv4 > ipv4 items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_suppressions"></a>2.1.18.1.1.1.5. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > ipv4 > ipv4 items > suppressions`

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

| Each item of this array must be                                                                          | Description |
| -------------------------------------------------------------------------------------------------------- | ----------- |
| [NagSuppressionProps](#functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_15"></a>2.1.18.1.1.1.5.1. root > functions > functions items > vpcConfig > securityGroupEgressRules > ipv4 > ipv4 items > suppressions > NagSuppressionProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NagSuppressionProps                       |

| Property                                                                                              | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_suppressions_items_id"></a>2.1.18.1.1.1.5.1.1. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > ipv4 > ipv4 items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_suppressions_items_reason"></a>2.1.18.1.1.1.5.1.2. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > ipv4 > ipv4 items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_toPort"></a>2.1.18.1.1.1.6. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > ipv4 > ipv4 items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_prefixList"></a>2.1.18.1.2. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > prefixList`

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

| Each item of this array must be                                                            | Description |
| ------------------------------------------------------------------------------------------ | ----------- |
| [MdaaPrefixListPeer](#functions_items_vpcConfig_securityGroupEgressRules_prefixList_items) | -           |

###### <a name="autogenerated_heading_16"></a>2.1.18.1.2.1. root > functions > functions items > vpcConfig > securityGroupEgressRules > prefixList > MdaaPrefixListPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaPrefixListPeer                        |

| Property                                                                                             | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#functions_items_vpcConfig_securityGroupEgressRules_prefixList_items_description )   | No      | string | No         | -          | -                 |
| - [port](#functions_items_vpcConfig_securityGroupEgressRules_prefixList_items_port )                 | No      | number | No         | -          | -                 |
| + [prefixList](#functions_items_vpcConfig_securityGroupEgressRules_prefixList_items_prefixList )     | No      | string | No         | -          | -                 |
| + [protocol](#functions_items_vpcConfig_securityGroupEgressRules_prefixList_items_protocol )         | No      | string | No         | -          | -                 |
| - [suppressions](#functions_items_vpcConfig_securityGroupEgressRules_prefixList_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#functions_items_vpcConfig_securityGroupEgressRules_prefixList_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_prefixList_items_description"></a>2.1.18.1.2.1.1. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > prefixList > prefixList items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_prefixList_items_port"></a>2.1.18.1.2.1.2. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > prefixList > prefixList items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_prefixList_items_prefixList"></a>2.1.18.1.2.1.3. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > prefixList > prefixList items > prefixList`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_prefixList_items_protocol"></a>2.1.18.1.2.1.4. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > prefixList > prefixList items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_prefixList_items_suppressions"></a>2.1.18.1.2.1.5. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > prefixList > prefixList items > suppressions`

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

| Each item of this array must be                                                                                | Description |
| -------------------------------------------------------------------------------------------------------------- | ----------- |
| [NagSuppressionProps](#functions_items_vpcConfig_securityGroupEgressRules_prefixList_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_17"></a>2.1.18.1.2.1.5.1. root > functions > functions items > vpcConfig > securityGroupEgressRules > prefixList > prefixList items > suppressions > NagSuppressionProps

|                           |                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                               |
| **Same definition as**    | [functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_suppressions_items](#functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_suppressions_items) |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_prefixList_items_toPort"></a>2.1.18.1.2.1.6. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > prefixList > prefixList items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_sg"></a>2.1.18.1.3. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > sg`

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
| [MdaaSecurityGroupPeer](#functions_items_vpcConfig_securityGroupEgressRules_sg_items) | -           |

###### <a name="autogenerated_heading_18"></a>2.1.18.1.3.1. root > functions > functions items > vpcConfig > securityGroupEgressRules > sg > MdaaSecurityGroupPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaSecurityGroupPeer                     |

| Property                                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#functions_items_vpcConfig_securityGroupEgressRules_sg_items_description )   | No      | string | No         | -          | -                 |
| - [port](#functions_items_vpcConfig_securityGroupEgressRules_sg_items_port )                 | No      | number | No         | -          | -                 |
| + [protocol](#functions_items_vpcConfig_securityGroupEgressRules_sg_items_protocol )         | No      | string | No         | -          | -                 |
| + [sgId](#functions_items_vpcConfig_securityGroupEgressRules_sg_items_sgId )                 | No      | string | No         | -          | -                 |
| - [suppressions](#functions_items_vpcConfig_securityGroupEgressRules_sg_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#functions_items_vpcConfig_securityGroupEgressRules_sg_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_sg_items_description"></a>2.1.18.1.3.1.1. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > sg > sg items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_sg_items_port"></a>2.1.18.1.3.1.2. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > sg > sg items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_sg_items_protocol"></a>2.1.18.1.3.1.3. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > sg > sg items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_sg_items_sgId"></a>2.1.18.1.3.1.4. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > sg > sg items > sgId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_sg_items_suppressions"></a>2.1.18.1.3.1.5. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > sg > sg items > suppressions`

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

| Each item of this array must be                                                                        | Description |
| ------------------------------------------------------------------------------------------------------ | ----------- |
| [NagSuppressionProps](#functions_items_vpcConfig_securityGroupEgressRules_sg_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_19"></a>2.1.18.1.3.1.5.1. root > functions > functions items > vpcConfig > securityGroupEgressRules > sg > sg items > suppressions > NagSuppressionProps

|                           |                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                               |
| **Same definition as**    | [functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_suppressions_items](#functions_items_vpcConfig_securityGroupEgressRules_ipv4_items_suppressions_items) |

###### <a name="functions_items_vpcConfig_securityGroupEgressRules_sg_items_toPort"></a>2.1.18.1.3.1.6. Property `root > functions > functions items > vpcConfig > securityGroupEgressRules > sg > sg items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

##### <a name="functions_items_vpcConfig_securityGroupId"></a>2.1.18.2. Property `root > functions > functions items > vpcConfig > securityGroupId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** If specified, the function will use this security group for
it's VPC connection. Otherwise a new security group will 
be created.

##### <a name="functions_items_vpcConfig_subnetIds"></a>2.1.18.3. Property `root > functions > functions items > vpcConfig > subnetIds`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The IDs of the subnets on which the Lambda will be deployed

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                               | Description |
| ------------------------------------------------------------- | ----------- |
| [subnetIds items](#functions_items_vpcConfig_subnetIds_items) | -           |

###### <a name="autogenerated_heading_20"></a>2.1.18.3.1. root > functions > functions items > vpcConfig > subnetIds > subnetIds items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="functions_items_vpcConfig_vpcId"></a>2.1.18.4. Property `root > functions > functions items > vpcConfig > vpcId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ID of the VPC on which the Lambda will be deployed

## <a name="kmsArn"></a>3. Property `root > kmsArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="layers"></a>4. Property `root > layers`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** Layers to create

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be | Description |
| ------------------------------- | ----------- |
| [LayerProps](#layers_items)     | -           |

### <a name="autogenerated_heading_21"></a>4.1. root > layers > LayerProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/LayerProps                                |

| Property                                    | Pattern | Type   | Deprecated | Definition | Title/Description                |
| ------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------- |
| - [description](#layers_items_description ) | No      | string | No         | -          | Description of the layer         |
| + [layerName](#layers_items_layerName )     | No      | string | No         | -          | Layer name                       |
| + [src](#layers_items_src )                 | No      | string | No         | -          | The source directory or zip file |

#### <a name="layers_items_description"></a>4.1.1. Property `root > layers > layers items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Description of the layer

#### <a name="layers_items_layerName"></a>4.1.2. Property `root > layers > layers items > layerName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Layer name

#### <a name="layers_items_src"></a>4.1.3. Property `root > layers > layers items > src`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The source directory or zip file

## <a name="nag_suppressions"></a>5. Property `root > nag_suppressions`

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

### <a name="nag_suppressions_by_path"></a>5.1. Property `root > nag_suppressions > by_path`

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

#### <a name="autogenerated_heading_22"></a>5.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

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

##### <a name="nag_suppressions_by_path_items_path"></a>5.1.1.1. Property `root > nag_suppressions > by_path > by_path items > path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="nag_suppressions_by_path_items_suppressions"></a>5.1.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions`

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

###### <a name="autogenerated_heading_23"></a>5.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                               | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#nag_suppressions_by_path_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#nag_suppressions_by_path_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="nag_suppressions_by_path_items_suppressions_items_id"></a>5.1.1.2.1.1. Property `root > nag_suppressions > by_path > by_path items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nag_suppressions_by_path_items_suppressions_items_reason"></a>5.1.1.2.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="projectBucket"></a>6. Property `root > projectBucket`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="projectName"></a>7. Property `root > projectName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Name of the DataOps Project

## <a name="projectTopicArn"></a>8. Property `root > projectTopicArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="securityConfigurationName"></a>9. Property `root > securityConfigurationName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="service_catalog_product_config"></a>10. Property `root > service_catalog_product_config`

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

### <a name="service_catalog_product_config_launch_role_name"></a>10.1. Property `root > service_catalog_product_config > launch_role_name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="service_catalog_product_config_name"></a>10.2. Property `root > service_catalog_product_config > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_owner"></a>10.3. Property `root > service_catalog_product_config > owner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_parameters"></a>10.4. Property `root > service_catalog_product_config > parameters`

|                           |                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                            |
| **Required**              | No                                                                                                                                                  |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                               | Pattern | Type   | Deprecated | Definition                                         | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogParameterConfig | -                 |

#### <a name="service_catalog_product_config_parameters_additionalProperties"></a>10.4.1. Property `root > service_catalog_product_config > parameters > MdaaServiceCatalogParameterConfig`

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

##### <a name="service_catalog_product_config_parameters_additionalProperties_constraints"></a>10.4.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_description"></a>10.4.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules"></a>10.4.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules`

|                           |                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                                                   |
| **Required**              | Yes                                                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                      | Pattern | Type   | Deprecated | Definition                                              | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleConfig | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties"></a>10.4.1.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > MdaaServiceCatalogConstraintRuleConfig`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions"></a>10.4.1.1.2.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions`

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

###### <a name="autogenerated_heading_24"></a>10.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert"></a>10.4.1.1.2.1.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > assert`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description"></a>10.4.1.1.2.1.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition"></a>10.4.1.1.2.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > condition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig           |

##### <a name="service_catalog_product_config_parameters_additionalProperties_props"></a>10.4.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedPattern"></a>10.4.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedPattern`

|              |                                                         |
| ------------ | ------------------------------------------------------- |
| **Type**     | `string`                                                |
| **Required** | No                                                      |
| **Default**  | `"- No constraints on patterns allowed for parameter."` |

**Description:** A regular expression that represents the patterns to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedValues"></a>10.4.1.2.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues`

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

###### <a name="autogenerated_heading_25"></a>10.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_constraintDescription"></a>10.4.1.2.3. Property `root > service_catalog_product_config > parameters > additionalProperties > props > constraintDescription`

|              |                                                                                        |
| ------------ | -------------------------------------------------------------------------------------- |
| **Type**     | `string`                                                                               |
| **Required** | No                                                                                     |
| **Default**  | `"- No description with customized error message when user specifies invalid values."` |

**Description:** A string that explains a constraint when the constraint is violated.
For example, without a constraint description, a parameter that has an allowed
pattern of [A-Za-z0-9]+ displays the following error message when the user specifies
an invalid value:

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_default"></a>10.4.1.2.4. Property `root > service_catalog_product_config > parameters > additionalProperties > props > default`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Default**               | `"- No default value for parameter."`                                     |

**Description:** A value of the appropriate type for the template to use if no value is specified
when a stack is created. If you define constraints for the parameter, you must specify
a value that adheres to those constraints.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_description"></a>10.4.1.2.5. Property `root > service_catalog_product_config > parameters > additionalProperties > props > description`

|              |                                         |
| ------------ | --------------------------------------- |
| **Type**     | `string`                                |
| **Required** | No                                      |
| **Default**  | `"- No description for the parameter."` |

**Description:** A string of up to 4000 characters that describes the parameter.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxLength"></a>10.4.1.2.6. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the largest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxValue"></a>10.4.1.2.7. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the largest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minLength"></a>10.4.1.2.8. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the smallest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minValue"></a>10.4.1.2.9. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the smallest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_noEcho"></a>10.4.1.2.10. Property `root > service_catalog_product_config > parameters > additionalProperties > props > noEcho`

|              |                                        |
| ------------ | -------------------------------------- |
| **Type**     | `boolean`                              |
| **Required** | No                                     |
| **Default**  | `"- Parameter values are not masked."` |

**Description:** Whether to mask the parameter value when anyone makes a call that describes the stack.
If you set the value to ``true``, the parameter value is masked with asterisks (``*****``).

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_type"></a>10.4.1.2.11. Property `root > service_catalog_product_config > parameters > additionalProperties > props > type`

|              |            |
| ------------ | ---------- |
| **Type**     | `string`   |
| **Required** | No         |
| **Default**  | `"String"` |

**Description:** The data type for the parameter (DataType).

### <a name="service_catalog_product_config_portfolio_arn"></a>10.5. Property `root > service_catalog_product_config > portfolio_arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

----------------------------------------------------------------------------------------------------------------------------
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-16 at 13:40:34 -0400

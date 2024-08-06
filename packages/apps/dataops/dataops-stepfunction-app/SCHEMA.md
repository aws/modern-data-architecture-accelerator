# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                       | Title/Description                                                                                                                                    |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [deploymentRole](#deploymentRole )                                 | No      | string | No         | -                                                | -                                                                                                                                                    |
| + [kmsArn](#kmsArn )                                                 | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                     |
| + [projectBucket](#projectBucket )                                   | No      | string | No         | -                                                | -                                                                                                                                                    |
| + [projectName](#projectName )                                       | No      | string | No         | -                                                | Name of the DataOps Project                                                                                                                          |
| + [projectTopicArn](#projectTopicArn )                               | No      | string | No         | -                                                | -                                                                                                                                                    |
| + [securityConfigurationName](#securityConfigurationName )           | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |
| + [stepfunctionDefinitions](#stepfunctionDefinitions )               | No      | array  | No         | -                                                | List of StepFunctions to create                                                                                                                      |

## <a name="deploymentRole"></a>1. Property `root > deploymentRole`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="kmsArn"></a>2. Property `root > kmsArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="nag_suppressions"></a>3. Property `root > nag_suppressions`

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

### <a name="nag_suppressions_by_path"></a>3.1. Property `root > nag_suppressions > by_path`

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

#### <a name="autogenerated_heading_2"></a>3.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

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

##### <a name="nag_suppressions_by_path_items_path"></a>3.1.1.1. Property `root > nag_suppressions > by_path > by_path items > path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="nag_suppressions_by_path_items_suppressions"></a>3.1.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions`

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

###### <a name="autogenerated_heading_3"></a>3.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                               | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#nag_suppressions_by_path_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#nag_suppressions_by_path_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="nag_suppressions_by_path_items_suppressions_items_id"></a>3.1.1.2.1.1. Property `root > nag_suppressions > by_path > by_path items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nag_suppressions_by_path_items_suppressions_items_reason"></a>3.1.1.2.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="projectBucket"></a>4. Property `root > projectBucket`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="projectName"></a>5. Property `root > projectName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Name of the DataOps Project

## <a name="projectTopicArn"></a>6. Property `root > projectTopicArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="securityConfigurationName"></a>7. Property `root > securityConfigurationName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="service_catalog_product_config"></a>8. Property `root > service_catalog_product_config`

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

### <a name="service_catalog_product_config_launch_role_name"></a>8.1. Property `root > service_catalog_product_config > launch_role_name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="service_catalog_product_config_name"></a>8.2. Property `root > service_catalog_product_config > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_owner"></a>8.3. Property `root > service_catalog_product_config > owner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_parameters"></a>8.4. Property `root > service_catalog_product_config > parameters`

|                           |                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                            |
| **Required**              | No                                                                                                                                                  |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                               | Pattern | Type   | Deprecated | Definition                                         | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogParameterConfig | -                 |

#### <a name="service_catalog_product_config_parameters_additionalProperties"></a>8.4.1. Property `root > service_catalog_product_config > parameters > MdaaServiceCatalogParameterConfig`

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

##### <a name="service_catalog_product_config_parameters_additionalProperties_constraints"></a>8.4.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_description"></a>8.4.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules"></a>8.4.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules`

|                           |                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                                                   |
| **Required**              | Yes                                                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                      | Pattern | Type   | Deprecated | Definition                                              | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleConfig | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties"></a>8.4.1.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > MdaaServiceCatalogConstraintRuleConfig`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions"></a>8.4.1.1.2.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions`

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

###### <a name="autogenerated_heading_4"></a>8.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert"></a>8.4.1.1.2.1.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > assert`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description"></a>8.4.1.1.2.1.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition"></a>8.4.1.1.2.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > condition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig           |

##### <a name="service_catalog_product_config_parameters_additionalProperties_props"></a>8.4.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedPattern"></a>8.4.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedPattern`

|              |                                                         |
| ------------ | ------------------------------------------------------- |
| **Type**     | `string`                                                |
| **Required** | No                                                      |
| **Default**  | `"- No constraints on patterns allowed for parameter."` |

**Description:** A regular expression that represents the patterns to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedValues"></a>8.4.1.2.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues`

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

###### <a name="autogenerated_heading_5"></a>8.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_constraintDescription"></a>8.4.1.2.3. Property `root > service_catalog_product_config > parameters > additionalProperties > props > constraintDescription`

|              |                                                                                        |
| ------------ | -------------------------------------------------------------------------------------- |
| **Type**     | `string`                                                                               |
| **Required** | No                                                                                     |
| **Default**  | `"- No description with customized error message when user specifies invalid values."` |

**Description:** A string that explains a constraint when the constraint is violated.
For example, without a constraint description, a parameter that has an allowed
pattern of [A-Za-z0-9]+ displays the following error message when the user specifies
an invalid value:

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_default"></a>8.4.1.2.4. Property `root > service_catalog_product_config > parameters > additionalProperties > props > default`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Default**               | `"- No default value for parameter."`                                     |

**Description:** A value of the appropriate type for the template to use if no value is specified
when a stack is created. If you define constraints for the parameter, you must specify
a value that adheres to those constraints.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_description"></a>8.4.1.2.5. Property `root > service_catalog_product_config > parameters > additionalProperties > props > description`

|              |                                         |
| ------------ | --------------------------------------- |
| **Type**     | `string`                                |
| **Required** | No                                      |
| **Default**  | `"- No description for the parameter."` |

**Description:** A string of up to 4000 characters that describes the parameter.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxLength"></a>8.4.1.2.6. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the largest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxValue"></a>8.4.1.2.7. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the largest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minLength"></a>8.4.1.2.8. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the smallest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minValue"></a>8.4.1.2.9. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the smallest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_noEcho"></a>8.4.1.2.10. Property `root > service_catalog_product_config > parameters > additionalProperties > props > noEcho`

|              |                                        |
| ------------ | -------------------------------------- |
| **Type**     | `boolean`                              |
| **Required** | No                                     |
| **Default**  | `"- Parameter values are not masked."` |

**Description:** Whether to mask the parameter value when anyone makes a call that describes the stack.
If you set the value to ``true``, the parameter value is masked with asterisks (``*****``).

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_type"></a>8.4.1.2.11. Property `root > service_catalog_product_config > parameters > additionalProperties > props > type`

|              |            |
| ------------ | ---------- |
| **Type**     | `string`   |
| **Required** | No         |
| **Default**  | `"String"` |

**Description:** The data type for the parameter (DataType).

### <a name="service_catalog_product_config_portfolio_arn"></a>8.5. Property `root > service_catalog_product_config > portfolio_arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="stepfunctionDefinitions"></a>9. Property `root > stepfunctionDefinitions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** List of StepFunctions to create

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                     | Description |
| --------------------------------------------------- | ----------- |
| [StepFunctionProps](#stepfunctionDefinitions_items) | -           |

### <a name="autogenerated_heading_6"></a>9.1. root > stepfunctionDefinitions > StepFunctionProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/StepFunctionProps                         |

| Property                                                                                 | Pattern | Type    | Deprecated | Definition                        | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------- | ------- | ------- | ---------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [eventBridge](#stepfunctionDefinitions_items_eventBridge )                             | No      | object  | No         | In #/definitions/EventBridgeProps | EventBridge props                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| + [logExecutionData](#stepfunctionDefinitions_items_logExecutionData )                   | No      | boolean | No         | -                                 | Logs parameter values and other execution data used during step function execution                                                                                                                                                                                                                                                                                                                                                                |
| - [logGroupRetentionDays](#stepfunctionDefinitions_items_logGroupRetentionDays )         | No      | number  | No         | -                                 | Optional. Number of days the Logs will be retained in Cloudwatch. <br />For allowed values, refer https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.RetentionDays.html<br />Possible values are: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653, and 0. <br />If you specify 0, the events in the log group are always retained and never expire.<br />Default, if property not specified, is 731 days. |
| + [rawStepFunctionDef](#stepfunctionDefinitions_items_rawStepFunctionDef )               | No      | object  | No         | -                                 | StepFunction defintion exported as JSON from Step Functions console                                                                                                                                                                                                                                                                                                                                                                               |
| + [stateMachineExecutionRole](#stepfunctionDefinitions_items_stateMachineExecutionRole ) | No      | string  | No         | -                                 | StepFunction defintion exported as JSON from Step Functions console                                                                                                                                                                                                                                                                                                                                                                               |
| + [stateMachineName](#stepfunctionDefinitions_items_stateMachineName )                   | No      | string  | No         | -                                 | StepFunction defintion exported as JSON from Step Functions console                                                                                                                                                                                                                                                                                                                                                                               |
| + [stateMachineType](#stepfunctionDefinitions_items_stateMachineType )                   | No      | string  | No         | -                                 | StepFunction type STANDARD or EXPRESS                                                                                                                                                                                                                                                                                                                                                                                                             |
| - [suppressions](#stepfunctionDefinitions_items_suppressions )                           | No      | array   | No         | -                                 | CDK Nag suppressions if policyDocument generates Nags.                                                                                                                                                                                                                                                                                                                                                                                            |

#### <a name="stepfunctionDefinitions_items_eventBridge"></a>9.1.1. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/EventBridgeProps                          |

**Description:** EventBridge props

| Property                                                                               | Pattern | Type   | Deprecated | Definition                                   | Title/Description                                                                                                                |
| -------------------------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| - [eventBridgeRules](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules )     | No      | object | No         | In #/definitions/NamedEventBridgeRuleProps   | List of EventBridge rules to trigger the Lambda function from S3 EventBridge notifications                                       |
| - [maxEventAgeSeconds](#stepfunctionDefinitions_items_eventBridge_maxEventAgeSeconds ) | No      | number | No         | -                                            | The maximum age of a request that EventBridge sends to target<br /><br />Minimum value of 60.<br />Maximum value of 86400.       |
| - [retryAttempts](#stepfunctionDefinitions_items_eventBridge_retryAttempts )           | No      | number | No         | -                                            | The maximum number of times to retry when the target returns an error.<br /><br />Minimum value of 0.<br />Maximum value of 185. |
| - [s3EventBridgeRules](#stepfunctionDefinitions_items_eventBridge_s3EventBridgeRules ) | No      | object | No         | In #/definitions/NamedS3EventBridgeRuleProps | List of EventBridge rules to trigger the Lambda function from S3 EventBridge notifications                                       |

##### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules"></a>9.1.1.1. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules`

|                           |                                                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                             |
| **Required**              | No                                                                                                                                                                   |
| **Additional properties** | [[Should-conform]](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedEventBridgeRuleProps                                                                                                                              |

**Description:** List of EventBridge rules to trigger the Lambda function from S3 EventBridge notifications

| Property                                                                                | Pattern | Type   | Deprecated | Definition                            | Title/Description |
| --------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------- | ----------------- |
| - [](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties ) | No      | object | No         | In #/definitions/EventBridgeRuleProps | -                 |

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties"></a>9.1.1.1.1. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > EventBridgeRuleProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/EventBridgeRuleProps                      |

| Property                                                                                                                     | Pattern | Type   | Deprecated | Definition                    | Title/Description                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [description](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_description )               | No      | string | No         | -                             | Description of the rule                                                                                                                                                                                              |
| - [eventBusArn](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventBusArn )               | No      | string | No         | -                             | If specified, rule will be created against this event bus.<br />If not specified, default event bus will be used.                                                                                                    |
| - [eventPattern](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern )             | No      | object | No         | In #/definitions/EventPattern | The Event Pattern to be passed to the rule                                                                                                                                                                           |
| - [input](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_input )                           | No      | object | No         | -                             | If specified, this input will be provided as event payload to the target. Otherwise<br />the target input will be the matched event content.                                                                         |
| - [scheduleExpression](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_scheduleExpression ) | No      | string | No         | -                             | If specified, the rule will be schedule according to this expression.<br />Expression should follow the EventBridge specification: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-cron-expressions.html |

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_description"></a>9.1.1.1.1.1. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Description of the rule

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventBusArn"></a>9.1.1.1.1.2. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventBusArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** If specified, rule will be created against this event bus.
If not specified, default event bus will be used.

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern"></a>9.1.1.1.1.3. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/EventPattern                              |

**Description:** The Event Pattern to be passed to the rule

| Property                                                                                                                  | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [account](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_account )       | No      | array of string | No         | -          | The 12-digit number identifying an AWS account.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| - [detail](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detail )         | No      | object          | No         | -          | A JSON object, whose content is at the discretion of the service<br />originating the event.                                                                                                                                                                                                                                                                                                                                                                                             |
| - [detailType](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detailType ) | No      | array of string | No         | -          | Identifies, in combination with the source field, the fields and values<br />that appear in the detail field.<br /><br />Represents the "detail-type" event field.                                                                                                                                                                                                                                                                                                                       |
| - [id](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_id )                 | No      | array of string | No         | -          | A unique value is generated for every event. This can be helpful in<br />tracing events as they move through rules to targets, and are processed.                                                                                                                                                                                                                                                                                                                                        |
| - [region](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_region )         | No      | array of string | No         | -          | Identifies the AWS region where the event originated.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| - [resources](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_resources )   | No      | array of string | No         | -          | This JSON array contains ARNs that identify resources that are involved<br />in the event. Inclusion of these ARNs is at the discretion of the<br />service.<br /><br />For example, Amazon EC2 instance state-changes include Amazon EC2<br />instance ARNs, Auto Scaling events include ARNs for both instances and<br />Auto Scaling groups, but API calls with AWS CloudTrail do not include<br />resource ARNs.                                                                     |
| - [source](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_source )         | No      | array of string | No         | -          | Identifies the service that sourced the event. All events sourced from<br />within AWS begin with "aws." Customer-generated events can have any value<br />here, as long as it doesn't begin with "aws." We recommend the use of<br />Java package-name style reverse domain-name strings.<br /><br />To find the correct value for source for an AWS service, see the table in<br />AWS Service Namespaces. For example, the source value for Amazon<br />CloudFront is aws.cloudfront. |
| - [time](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_time )             | No      | array of string | No         | -          | The event timestamp, which can be specified by the service originating<br />the event. If the event spans a time interval, the service might choose<br />to report the start time, so this value can be noticeably before the time<br />the event is actually received.                                                                                                                                                                                                                  |
| - [version](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_version )       | No      | array of string | No         | -          | By default, this is set to 0 (zero) in all events.                                                                                                                                                                                                                                                                                                                                                                                                                                       |

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_account"></a>9.1.1.1.1.3.1. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > account`

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

| Each item of this array must be                                                                                              | Description |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [account items](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_account_items) | -           |

###### <a name="autogenerated_heading_7"></a>9.1.1.1.1.3.1.1. root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > account > account items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detail"></a>9.1.1.1.1.3.2. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > detail`

|                           |                                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                      |
| **Required**              | No                                                                                                                                                                                                            |
| **Additional properties** | [[Should-conform]](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detail_additionalProperties "Each additional property must conform to the following schema") |
| **Default**               | `"- No filtering on detail"`                                                                                                                                                                                  |

**Description:** A JSON object, whose content is at the discretion of the service
originating the event.

| Property                                                                                                                         | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detail_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detail_additionalProperties"></a>9.1.1.1.1.3.2.1. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > detail > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detailType"></a>9.1.1.1.1.3.3. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > detailType`

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

| Each item of this array must be                                                                                                    | Description |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [detailType items](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_detailType_items) | -           |

###### <a name="autogenerated_heading_8"></a>9.1.1.1.1.3.3.1. root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > detailType > detailType items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_id"></a>9.1.1.1.1.3.4. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > id`

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

| Each item of this array must be                                                                                    | Description |
| ------------------------------------------------------------------------------------------------------------------ | ----------- |
| [id items](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_id_items) | -           |

###### <a name="autogenerated_heading_9"></a>9.1.1.1.1.3.4.1. root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > id > id items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_region"></a>9.1.1.1.1.3.5. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > region`

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

| Each item of this array must be                                                                                            | Description |
| -------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [region items](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_region_items) | -           |

###### <a name="autogenerated_heading_10"></a>9.1.1.1.1.3.5.1. root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > region > region items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_resources"></a>9.1.1.1.1.3.6. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > resources`

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

| Each item of this array must be                                                                                                  | Description |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [resources items](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_resources_items) | -           |

###### <a name="autogenerated_heading_11"></a>9.1.1.1.1.3.6.1. root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > resources > resources items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_source"></a>9.1.1.1.1.3.7. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > source`

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

| Each item of this array must be                                                                                            | Description |
| -------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [source items](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_source_items) | -           |

###### <a name="autogenerated_heading_12"></a>9.1.1.1.1.3.7.1. root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > source > source items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_time"></a>9.1.1.1.1.3.8. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > time`

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

| Each item of this array must be                                                                                        | Description |
| ---------------------------------------------------------------------------------------------------------------------- | ----------- |
| [time items](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_time_items) | -           |

###### <a name="autogenerated_heading_13"></a>9.1.1.1.1.3.8.1. root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > time > time items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_version"></a>9.1.1.1.1.3.9. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > version`

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

| Each item of this array must be                                                                                              | Description |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [version items](#stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_eventPattern_version_items) | -           |

###### <a name="autogenerated_heading_14"></a>9.1.1.1.1.3.9.1. root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > eventPattern > version > version items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_input"></a>9.1.1.1.1.4. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > input`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** If specified, this input will be provided as event payload to the target. Otherwise
the target input will be the matched event content.

###### <a name="stepfunctionDefinitions_items_eventBridge_eventBridgeRules_additionalProperties_scheduleExpression"></a>9.1.1.1.1.5. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > eventBridgeRules > additionalProperties > scheduleExpression`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** If specified, the rule will be schedule according to this expression.
Expression should follow the EventBridge specification: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-cron-expressions.html

##### <a name="stepfunctionDefinitions_items_eventBridge_maxEventAgeSeconds"></a>9.1.1.2. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > maxEventAgeSeconds`

|              |                      |
| ------------ | -------------------- |
| **Type**     | `number`             |
| **Required** | No                   |
| **Default**  | `"86400 (24 hours)"` |

**Description:** The maximum age of a request that EventBridge sends to target

Minimum value of 60.
Maximum value of 86400.

##### <a name="stepfunctionDefinitions_items_eventBridge_retryAttempts"></a>9.1.1.3. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > retryAttempts`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |
| **Default**  | `185`    |

**Description:** The maximum number of times to retry when the target returns an error.

Minimum value of 0.
Maximum value of 185.

##### <a name="stepfunctionDefinitions_items_eventBridge_s3EventBridgeRules"></a>9.1.1.4. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > s3EventBridgeRules`

|                           |                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                               |
| **Required**              | No                                                                                                                                                                     |
| **Additional properties** | [[Should-conform]](#stepfunctionDefinitions_items_eventBridge_s3EventBridgeRules_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedS3EventBridgeRuleProps                                                                                                                              |

**Description:** List of EventBridge rules to trigger the Lambda function from S3 EventBridge notifications

| Property                                                                                  | Pattern | Type   | Deprecated | Definition                              | Title/Description |
| ----------------------------------------------------------------------------------------- | ------- | ------ | ---------- | --------------------------------------- | ----------------- |
| - [](#stepfunctionDefinitions_items_eventBridge_s3EventBridgeRules_additionalProperties ) | No      | object | No         | In #/definitions/S3EventBridgeRuleProps | -                 |

###### <a name="stepfunctionDefinitions_items_eventBridge_s3EventBridgeRules_additionalProperties"></a>9.1.1.4.1. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > s3EventBridgeRules > S3EventBridgeRuleProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/S3EventBridgeRuleProps                    |

| Property                                                                                                         | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| + [buckets](#stepfunctionDefinitions_items_eventBridge_s3EventBridgeRules_additionalProperties_buckets )         | No      | array of string | No         | -          | Name of the buckets on which to match                                                                             |
| - [eventBusArn](#stepfunctionDefinitions_items_eventBridge_s3EventBridgeRules_additionalProperties_eventBusArn ) | No      | string          | No         | -          | If specified, rule will be created against this event bus.<br />If not specified, default event bus will be used. |
| - [prefixes](#stepfunctionDefinitions_items_eventBridge_s3EventBridgeRules_additionalProperties_prefixes )       | No      | array of string | No         | -          | Object key prefixes on which to match                                                                             |

###### <a name="stepfunctionDefinitions_items_eventBridge_s3EventBridgeRules_additionalProperties_buckets"></a>9.1.1.4.1.1. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > s3EventBridgeRules > additionalProperties > buckets`

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

| Each item of this array must be                                                                                   | Description |
| ----------------------------------------------------------------------------------------------------------------- | ----------- |
| [buckets items](#stepfunctionDefinitions_items_eventBridge_s3EventBridgeRules_additionalProperties_buckets_items) | -           |

###### <a name="autogenerated_heading_15"></a>9.1.1.4.1.1.1. root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > s3EventBridgeRules > additionalProperties > buckets > buckets items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="stepfunctionDefinitions_items_eventBridge_s3EventBridgeRules_additionalProperties_eventBusArn"></a>9.1.1.4.1.2. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > s3EventBridgeRules > additionalProperties > eventBusArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** If specified, rule will be created against this event bus.
If not specified, default event bus will be used.

###### <a name="stepfunctionDefinitions_items_eventBridge_s3EventBridgeRules_additionalProperties_prefixes"></a>9.1.1.4.1.3. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > s3EventBridgeRules > additionalProperties > prefixes`

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

| Each item of this array must be                                                                                     | Description |
| ------------------------------------------------------------------------------------------------------------------- | ----------- |
| [prefixes items](#stepfunctionDefinitions_items_eventBridge_s3EventBridgeRules_additionalProperties_prefixes_items) | -           |

###### <a name="autogenerated_heading_16"></a>9.1.1.4.1.3.1. root > stepfunctionDefinitions > stepfunctionDefinitions items > eventBridge > s3EventBridgeRules > additionalProperties > prefixes > prefixes items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="stepfunctionDefinitions_items_logExecutionData"></a>9.1.2. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > logExecutionData`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Logs parameter values and other execution data used during step function execution

#### <a name="stepfunctionDefinitions_items_logGroupRetentionDays"></a>9.1.3. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > logGroupRetentionDays`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Optional. Number of days the Logs will be retained in Cloudwatch. 
For allowed values, refer https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.RetentionDays.html
Possible values are: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653, and 0. 
If you specify 0, the events in the log group are always retained and never expire.
Default, if property not specified, is 731 days.

#### <a name="stepfunctionDefinitions_items_rawStepFunctionDef"></a>9.1.4. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > rawStepFunctionDef`

|                           |                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                   |
| **Required**              | Yes                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#stepfunctionDefinitions_items_rawStepFunctionDef_additionalProperties "Each additional property must conform to the following schema") |

**Description:** StepFunction defintion exported as JSON from Step Functions console

| Property                                                                      | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#stepfunctionDefinitions_items_rawStepFunctionDef_additionalProperties ) | No      | object | No         | -          | -                 |

##### <a name="stepfunctionDefinitions_items_rawStepFunctionDef_additionalProperties"></a>9.1.4.1. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > rawStepFunctionDef > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

#### <a name="stepfunctionDefinitions_items_stateMachineExecutionRole"></a>9.1.5. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > stateMachineExecutionRole`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** StepFunction defintion exported as JSON from Step Functions console

#### <a name="stepfunctionDefinitions_items_stateMachineName"></a>9.1.6. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > stateMachineName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** StepFunction defintion exported as JSON from Step Functions console

#### <a name="stepfunctionDefinitions_items_stateMachineType"></a>9.1.7. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > stateMachineType`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** StepFunction type STANDARD or EXPRESS

#### <a name="stepfunctionDefinitions_items_suppressions"></a>9.1.8. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > suppressions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** CDK Nag suppressions if policyDocument generates Nags.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                       | Description |
| --------------------------------------------------------------------- | ----------- |
| [SuppressionProps](#stepfunctionDefinitions_items_suppressions_items) | -           |

##### <a name="autogenerated_heading_17"></a>9.1.8.1. root > stepfunctionDefinitions > stepfunctionDefinitions items > suppressions > SuppressionProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/SuppressionProps                          |

| Property                                                              | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#stepfunctionDefinitions_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#stepfunctionDefinitions_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="stepfunctionDefinitions_items_suppressions_items_id"></a>9.1.8.1.1. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="stepfunctionDefinitions_items_suppressions_items_reason"></a>9.1.8.1.2. Property `root > stepfunctionDefinitions > stepfunctionDefinitions items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

----------------------------------------------------------------------------------------------------------------------------
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-06 at 12:57:52 -0400

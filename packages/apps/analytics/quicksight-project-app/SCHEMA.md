# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                       | Title/Description                                                                                                                                    |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [dataSources](#dataSources )                                       | No      | object | No         | -                                                | (Optional) Details about the Data Sources to be created                                                                                              |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                     |
| + [principals](#principals )                                         | No      | object | No         | -                                                | (Required) QS API Actions                                                                                                                            |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |
| - [sharedFolders](#sharedFolders )                                   | No      | object | No         | -                                                | (Optional) QS Shared Folders                                                                                                                         |

## <a name="dataSources"></a>1. Property `root > dataSources`

|                           |                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                              |
| **Required**              | No                                                                                                                    |
| **Additional properties** | [[Should-conform]](#dataSources_additionalProperties "Each additional property must conform to the following schema") |

**Description:** (Optional) Details about the Data Sources to be created

| Property                                 | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#dataSources_additionalProperties ) | No      | object | No         | -          | -                 |

### <a name="dataSources_additionalProperties"></a>1.1. Property `root > dataSources > additionalProperties`

|                           |                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                   |
| **Required**              | No                                                                                                                                         |
| **Additional properties** | [[Should-conform]](#dataSources_additionalProperties_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                      | Pattern | Type   | Deprecated | Definition                       | Title/Description |
| ------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------- | ----------------- |
| - [](#dataSources_additionalProperties_additionalProperties ) | No      | object | No         | In #/definitions/DataSourceProps | -                 |

#### <a name="dataSources_additionalProperties_additionalProperties"></a>1.1.1. Property `root > dataSources > additionalProperties > DataSourceProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DataSourceProps                           |

| Property                                                                                                               | Pattern | Type   | Deprecated | Definition                                  | Title/Description                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [awsAccountId](#dataSources_additionalProperties_additionalProperties_awsAccountId )                                 | No      | string | No         | -                                           | The AWS account ID.                                                                                                                                          |
| - [credentials](#dataSources_additionalProperties_additionalProperties_credentials )                                   | No      | object | No         | In #/definitions/DataSourceCredentialsProps | The credentials Amazon QuickSight that uses to connect to your underlying source. Currently, only credentials based on user name and password are supported. |
| + [dataSourceSpecificParameters](#dataSources_additionalProperties_additionalProperties_dataSourceSpecificParameters ) | No      | object | No         | -                                           | -                                                                                                                                                            |
| + [displayName](#dataSources_additionalProperties_additionalProperties_displayName )                                   | No      | string | No         | -                                           | A display name for the data source.                                                                                                                          |
| - [errorInfo](#dataSources_additionalProperties_additionalProperties_errorInfo )                                       | No      | object | No         | In #/definitions/DataSourceErrorInfoProps   | Error information from the last update or the creation of the data source.                                                                                   |
| + [permissions](#dataSources_additionalProperties_additionalProperties_permissions )                                   | No      | array  | No         | -                                           | A list of resource permissions on the data source.                                                                                                           |
| - [sslProperties](#dataSources_additionalProperties_additionalProperties_sslProperties )                               | No      | object | No         | In #/definitions/DataSourceSSLProps         | Secure Socket Layer (SSL) properties that apply when Amazon QuickSight connects to your underlying source.                                                   |
| - [vpcConnectionProperties](#dataSources_additionalProperties_additionalProperties_vpcConnectionProperties )           | No      | object | No         | In #/definitions/DataSourceVPCProps         | Use this parameter only when you want Amazon QuickSight to use a VPC connection when connecting to your underlying source.                                   |

##### <a name="dataSources_additionalProperties_additionalProperties_awsAccountId"></a>1.1.1.1. Property `root > dataSources > additionalProperties > additionalProperties > awsAccountId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The AWS account ID.

##### <a name="dataSources_additionalProperties_additionalProperties_credentials"></a>1.1.1.2. Property `root > dataSources > additionalProperties > additionalProperties > credentials`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DataSourceCredentialsProps                |

**Description:** The credentials Amazon QuickSight that uses to connect to your underlying source. Currently, only credentials based on user name and password are supported.

| Property                                                                                               | Pattern | Type   | Deprecated | Definition                                     | Title/Description                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [copySourceArn](#dataSources_additionalProperties_additionalProperties_credentials_copySourceArn )   | No      | string | No         | -                                              | The Amazon Resource Name (ARN) of a data source that has the credential pair that you want to use.                                                |
| - [credentialPair](#dataSources_additionalProperties_additionalProperties_credentials_credentialPair ) | No      | object | No         | In #/definitions/DataSourceCredentialPairProps | Credential pair. For more information, see [CredentialPair](https://docs.aws.amazon.com/quicksight/latest/APIReference/API_CredentialPair.html) . |
| - [secretArn](#dataSources_additionalProperties_additionalProperties_credentials_secretArn )           | No      | string | No         | -                                              | CfnDataSource.DataSourceCredentialsProperty.SecretArn.                                                                                            |

###### <a name="dataSources_additionalProperties_additionalProperties_credentials_copySourceArn"></a>1.1.1.2.1. Property `root > dataSources > additionalProperties > additionalProperties > credentials > copySourceArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The Amazon Resource Name (ARN) of a data source that has the credential pair that you want to use.

###### <a name="dataSources_additionalProperties_additionalProperties_credentials_credentialPair"></a>1.1.1.2.2. Property `root > dataSources > additionalProperties > additionalProperties > credentials > credentialPair`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DataSourceCredentialPairProps             |

**Description:** Credential pair. For more information, see [CredentialPair](https://docs.aws.amazon.com/quicksight/latest/APIReference/API_CredentialPair.html) .

| Property                                                                                                                                            | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [alternateDataSourceParameters](#dataSources_additionalProperties_additionalProperties_credentials_credentialPair_alternateDataSourceParameters ) | No      | array  | No         | -          | -                 |
| + [password](#dataSources_additionalProperties_additionalProperties_credentials_credentialPair_password )                                           | No      | string | No         | -          | Password          |
| + [username](#dataSources_additionalProperties_additionalProperties_credentials_credentialPair_username )                                           | No      | string | No         | -          | Username          |

###### <a name="dataSources_additionalProperties_additionalProperties_credentials_credentialPair_alternateDataSourceParameters"></a>1.1.1.2.2.1. Property `root > dataSources > additionalProperties > additionalProperties > credentials > credentialPair > alternateDataSourceParameters`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | 1                  |
| **Max items**        | 1                  |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                                  | Description |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [alternateDataSourceParameters item 0](#dataSources_additionalProperties_additionalProperties_credentials_credentialPair_alternateDataSourceParameters_items_i0) | -           |

###### <a name="autogenerated_heading_2"></a>1.1.1.2.2.1.1. root > dataSources > additionalProperties > additionalProperties > credentials > credentialPair > alternateDataSourceParameters > alternateDataSourceParameters item 0

|                           |                                                                                                                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                          |
| **Required**              | No                                                                                                                                                                                                                                |
| **Additional properties** | [[Should-conform]](#dataSources_additionalProperties_additionalProperties_credentials_credentialPair_alternateDataSourceParameters_items_i0_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                                                             | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#dataSources_additionalProperties_additionalProperties_credentials_credentialPair_alternateDataSourceParameters_items_i0_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="dataSources_additionalProperties_additionalProperties_credentials_credentialPair_alternateDataSourceParameters_items_i0_additionalProperties"></a>1.1.1.2.2.1.1.1. Property `root > dataSources > additionalProperties > additionalProperties > credentials > credentialPair > alternateDataSourceParameters > alternateDataSourceParameters item 0 > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="dataSources_additionalProperties_additionalProperties_credentials_credentialPair_password"></a>1.1.1.2.2.2. Property `root > dataSources > additionalProperties > additionalProperties > credentials > credentialPair > password`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Password

###### <a name="dataSources_additionalProperties_additionalProperties_credentials_credentialPair_username"></a>1.1.1.2.2.3. Property `root > dataSources > additionalProperties > additionalProperties > credentials > credentialPair > username`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Username

###### <a name="dataSources_additionalProperties_additionalProperties_credentials_secretArn"></a>1.1.1.2.3. Property `root > dataSources > additionalProperties > additionalProperties > credentials > secretArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** CfnDataSource.DataSourceCredentialsProperty.SecretArn.

##### <a name="dataSources_additionalProperties_additionalProperties_dataSourceSpecificParameters"></a>1.1.1.3. Property `root > dataSources > additionalProperties > additionalProperties > dataSourceSpecificParameters`

|                           |                                                                                                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                     |
| **Required**              | Yes                                                                                                                                                                                          |
| **Additional properties** | [[Should-conform]](#dataSources_additionalProperties_additionalProperties_dataSourceSpecificParameters_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                        | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#dataSources_additionalProperties_additionalProperties_dataSourceSpecificParameters_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="dataSources_additionalProperties_additionalProperties_dataSourceSpecificParameters_additionalProperties"></a>1.1.1.3.1. Property `root > dataSources > additionalProperties > additionalProperties > dataSourceSpecificParameters > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

##### <a name="dataSources_additionalProperties_additionalProperties_displayName"></a>1.1.1.4. Property `root > dataSources > additionalProperties > additionalProperties > displayName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** A display name for the data source.

##### <a name="dataSources_additionalProperties_additionalProperties_errorInfo"></a>1.1.1.5. Property `root > dataSources > additionalProperties > additionalProperties > errorInfo`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DataSourceErrorInfoProps                  |

**Description:** Error information from the last update or the creation of the data source.

| Property                                                                               | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                            |
| -------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [message](#dataSources_additionalProperties_additionalProperties_errorInfo_message ) | No      | string | No         | -          | Error message(Optional)                                                                                                                                                                      |
| - [type](#dataSources_additionalProperties_additionalProperties_errorInfo_type )       | No      | string | No         | -          | Error type.(Optional)<br />Valid Values are: ACCESS_DENIED \| CONFLICT \| COPY_SOURCE_NOT_FOUND \| ENGINE_VERSION_NOT_SUPPORTED \| GENERIC_SQL_FAILURE \| TIMEOUT \| UNKNOWN \| UNKNOWN_HOST |

###### <a name="dataSources_additionalProperties_additionalProperties_errorInfo_message"></a>1.1.1.5.1. Property `root > dataSources > additionalProperties > additionalProperties > errorInfo > message`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Error message(Optional)

###### <a name="dataSources_additionalProperties_additionalProperties_errorInfo_type"></a>1.1.1.5.2. Property `root > dataSources > additionalProperties > additionalProperties > errorInfo > type`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Error type.(Optional)
Valid Values are: ACCESS_DENIED | CONFLICT | COPY_SOURCE_NOT_FOUND | ENGINE_VERSION_NOT_SUPPORTED | GENERIC_SQL_FAILURE | TIMEOUT | UNKNOWN | UNKNOWN_HOST

##### <a name="dataSources_additionalProperties_additionalProperties_permissions"></a>1.1.1.6. Property `root > dataSources > additionalProperties > additionalProperties > permissions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** A list of resource permissions on the data source.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                        | Description |
| ------------------------------------------------------------------------------------------------------ | ----------- |
| [DataSourcePermissionsProps](#dataSources_additionalProperties_additionalProperties_permissions_items) | -           |

###### <a name="autogenerated_heading_3"></a>1.1.1.6.1. root > dataSources > additionalProperties > additionalProperties > permissions > DataSourcePermissionsProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DataSourcePermissionsProps                |

| Property                                                                                           | Pattern | Type             | Deprecated | Definition                         | Title/Description                                   |
| -------------------------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | ---------------------------------- | --------------------------------------------------- |
| + [actions](#dataSources_additionalProperties_additionalProperties_permissions_items_actions )     | No      | enum (of string) | No         | In #/definitions/DataSourceActions | Either "READER_DATA_SOURCE" or "AUTHOR_DATA_SOURCE" |
| + [principal](#dataSources_additionalProperties_additionalProperties_permissions_items_principal ) | No      | string           | No         | -                                  | The Amazon Resource Name (ARN) of the principal.    |

###### <a name="dataSources_additionalProperties_additionalProperties_permissions_items_actions"></a>1.1.1.6.1.1. Property `root > dataSources > additionalProperties > additionalProperties > permissions > permissions items > actions`

|                |                                 |
| -------------- | ------------------------------- |
| **Type**       | `enum (of string)`              |
| **Required**   | Yes                             |
| **Defined in** | #/definitions/DataSourceActions |

**Description:** Either "READER_DATA_SOURCE" or "AUTHOR_DATA_SOURCE"

Must be one of:
* "AUTHOR_DATA_SOURCE"
* "READER_DATA_SOURCE"

###### <a name="dataSources_additionalProperties_additionalProperties_permissions_items_principal"></a>1.1.1.6.1.2. Property `root > dataSources > additionalProperties > additionalProperties > permissions > permissions items > principal`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The Amazon Resource Name (ARN) of the principal.

##### <a name="dataSources_additionalProperties_additionalProperties_sslProperties"></a>1.1.1.7. Property `root > dataSources > additionalProperties > additionalProperties > sslProperties`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DataSourceSSLProps                        |

**Description:** Secure Socket Layer (SSL) properties that apply when Amazon QuickSight connects to your underlying source.

| Property                                                                                         | Pattern | Type    | Deprecated | Definition | Title/Description                                             |
| ------------------------------------------------------------------------------------------------ | ------- | ------- | ---------- | ---------- | ------------------------------------------------------------- |
| + [disableSsl](#dataSources_additionalProperties_additionalProperties_sslProperties_disableSsl ) | No      | boolean | No         | -          | Enable to Disable SSL: Default value is false(SSL is enabled) |

###### <a name="dataSources_additionalProperties_additionalProperties_sslProperties_disableSsl"></a>1.1.1.7.1. Property `root > dataSources > additionalProperties > additionalProperties > sslProperties > disableSsl`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Enable to Disable SSL: Default value is false(SSL is enabled)

##### <a name="dataSources_additionalProperties_additionalProperties_vpcConnectionProperties"></a>1.1.1.8. Property `root > dataSources > additionalProperties > additionalProperties > vpcConnectionProperties`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DataSourceVPCProps                        |

**Description:** Use this parameter only when you want Amazon QuickSight to use a VPC connection when connecting to your underlying source.

| Property                                                                                                               | Pattern | Type   | Deprecated | Definition | Title/Description                 |
| ---------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | --------------------------------- |
| + [vpcConnectionArn](#dataSources_additionalProperties_additionalProperties_vpcConnectionProperties_vpcConnectionArn ) | No      | string | No         | -          | QuickSight VPC(created in QS) ARN |

###### <a name="dataSources_additionalProperties_additionalProperties_vpcConnectionProperties_vpcConnectionArn"></a>1.1.1.8.1. Property `root > dataSources > additionalProperties > additionalProperties > vpcConnectionProperties > vpcConnectionArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** QuickSight VPC(created in QS) ARN

## <a name="nag_suppressions"></a>2. Property `root > nag_suppressions`

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

### <a name="nag_suppressions_by_path"></a>2.1. Property `root > nag_suppressions > by_path`

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

#### <a name="autogenerated_heading_4"></a>2.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

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

##### <a name="nag_suppressions_by_path_items_path"></a>2.1.1.1. Property `root > nag_suppressions > by_path > by_path items > path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="nag_suppressions_by_path_items_suppressions"></a>2.1.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions`

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

###### <a name="autogenerated_heading_5"></a>2.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                               | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#nag_suppressions_by_path_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#nag_suppressions_by_path_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="nag_suppressions_by_path_items_suppressions_items_id"></a>2.1.1.2.1.1. Property `root > nag_suppressions > by_path > by_path items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nag_suppressions_by_path_items_suppressions_items_reason"></a>2.1.1.2.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="principals"></a>3. Property `root > principals`

|                           |                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                             |
| **Required**              | Yes                                                                                                                  |
| **Additional properties** | [[Should-conform]](#principals_additionalProperties "Each additional property must conform to the following schema") |

**Description:** (Required) QS API Actions

| Property                                | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#principals_additionalProperties ) | No      | string | No         | -          | -                 |

### <a name="principals_additionalProperties"></a>3.1. Property `root > principals > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

## <a name="service_catalog_product_config"></a>4. Property `root > service_catalog_product_config`

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

### <a name="service_catalog_product_config_launch_role_name"></a>4.1. Property `root > service_catalog_product_config > launch_role_name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="service_catalog_product_config_name"></a>4.2. Property `root > service_catalog_product_config > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_owner"></a>4.3. Property `root > service_catalog_product_config > owner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_parameters"></a>4.4. Property `root > service_catalog_product_config > parameters`

|                           |                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                            |
| **Required**              | No                                                                                                                                                  |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                               | Pattern | Type   | Deprecated | Definition                                         | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogParameterConfig | -                 |

#### <a name="service_catalog_product_config_parameters_additionalProperties"></a>4.4.1. Property `root > service_catalog_product_config > parameters > MdaaServiceCatalogParameterConfig`

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

##### <a name="service_catalog_product_config_parameters_additionalProperties_constraints"></a>4.4.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_description"></a>4.4.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules"></a>4.4.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules`

|                           |                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                                                   |
| **Required**              | Yes                                                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                      | Pattern | Type   | Deprecated | Definition                                              | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleConfig | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties"></a>4.4.1.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > MdaaServiceCatalogConstraintRuleConfig`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions"></a>4.4.1.1.2.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions`

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

###### <a name="autogenerated_heading_6"></a>4.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert"></a>4.4.1.1.2.1.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > assert`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description"></a>4.4.1.1.2.1.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition"></a>4.4.1.1.2.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > condition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig           |

##### <a name="service_catalog_product_config_parameters_additionalProperties_props"></a>4.4.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedPattern"></a>4.4.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedPattern`

|              |                                                         |
| ------------ | ------------------------------------------------------- |
| **Type**     | `string`                                                |
| **Required** | No                                                      |
| **Default**  | `"- No constraints on patterns allowed for parameter."` |

**Description:** A regular expression that represents the patterns to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedValues"></a>4.4.1.2.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues`

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

###### <a name="autogenerated_heading_7"></a>4.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_constraintDescription"></a>4.4.1.2.3. Property `root > service_catalog_product_config > parameters > additionalProperties > props > constraintDescription`

|              |                                                                                        |
| ------------ | -------------------------------------------------------------------------------------- |
| **Type**     | `string`                                                                               |
| **Required** | No                                                                                     |
| **Default**  | `"- No description with customized error message when user specifies invalid values."` |

**Description:** A string that explains a constraint when the constraint is violated.
For example, without a constraint description, a parameter that has an allowed
pattern of [A-Za-z0-9]+ displays the following error message when the user specifies
an invalid value:

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_default"></a>4.4.1.2.4. Property `root > service_catalog_product_config > parameters > additionalProperties > props > default`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Default**               | `"- No default value for parameter."`                                     |

**Description:** A value of the appropriate type for the template to use if no value is specified
when a stack is created. If you define constraints for the parameter, you must specify
a value that adheres to those constraints.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_description"></a>4.4.1.2.5. Property `root > service_catalog_product_config > parameters > additionalProperties > props > description`

|              |                                         |
| ------------ | --------------------------------------- |
| **Type**     | `string`                                |
| **Required** | No                                      |
| **Default**  | `"- No description for the parameter."` |

**Description:** A string of up to 4000 characters that describes the parameter.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxLength"></a>4.4.1.2.6. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the largest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxValue"></a>4.4.1.2.7. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the largest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minLength"></a>4.4.1.2.8. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the smallest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minValue"></a>4.4.1.2.9. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the smallest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_noEcho"></a>4.4.1.2.10. Property `root > service_catalog_product_config > parameters > additionalProperties > props > noEcho`

|              |                                        |
| ------------ | -------------------------------------- |
| **Type**     | `boolean`                              |
| **Required** | No                                     |
| **Default**  | `"- Parameter values are not masked."` |

**Description:** Whether to mask the parameter value when anyone makes a call that describes the stack.
If you set the value to ``true``, the parameter value is masked with asterisks (``*****``).

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_type"></a>4.4.1.2.11. Property `root > service_catalog_product_config > parameters > additionalProperties > props > type`

|              |            |
| ------------ | ---------- |
| **Type**     | `string`   |
| **Required** | No         |
| **Default**  | `"String"` |

**Description:** The data type for the parameter (DataType).

### <a name="service_catalog_product_config_portfolio_arn"></a>4.5. Property `root > service_catalog_product_config > portfolio_arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="sharedFolders"></a>5. Property `root > sharedFolders`

|                           |                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                |
| **Required**              | No                                                                                                                      |
| **Additional properties** | [[Should-conform]](#sharedFolders_additionalProperties "Each additional property must conform to the following schema") |

**Description:** (Optional) QS Shared Folders

| Property                                   | Pattern | Type   | Deprecated | Definition                          | Title/Description |
| ------------------------------------------ | ------- | ------ | ---------- | ----------------------------------- | ----------------- |
| - [](#sharedFolders_additionalProperties ) | No      | object | No         | In #/definitions/SharedFoldersProps | -                 |

### <a name="sharedFolders_additionalProperties"></a>5.1. Property `root > sharedFolders > SharedFoldersProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/SharedFoldersProps                        |

| Property                                                          | Pattern | Type   | Deprecated | Definition | Title/Description                    |
| ----------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------ |
| - [folders](#sharedFolders_additionalProperties_folders )         | No      | object | No         | -          | Sub-folders if any                   |
| + [permissions](#sharedFolders_additionalProperties_permissions ) | No      | array  | No         | -          | Permissions to be tied to the folder |

#### <a name="sharedFolders_additionalProperties_folders"></a>5.1.1. Property `root > sharedFolders > additionalProperties > folders`

|                           |                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                             |
| **Required**              | No                                                                                                                                                   |
| **Additional properties** | [[Should-conform]](#sharedFolders_additionalProperties_folders_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Sub-folders if any

| Property                                                                | Pattern | Type   | Deprecated | Definition                                                                         | Title/Description |
| ----------------------------------------------------------------------- | ------- | ------ | ---------- | ---------------------------------------------------------------------------------- | ----------------- |
| - [](#sharedFolders_additionalProperties_folders_additionalProperties ) | No      | object | No         | Same as [sharedFolders_additionalProperties](#sharedFolders_additionalProperties ) | -                 |

##### <a name="sharedFolders_additionalProperties_folders_additionalProperties"></a>5.1.1.1. Property `root > sharedFolders > additionalProperties > folders > SharedFoldersProps`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                   |
| **Same definition as**    | [sharedFolders_additionalProperties](#sharedFolders_additionalProperties) |

#### <a name="sharedFolders_additionalProperties_permissions"></a>5.1.2. Property `root > sharedFolders > additionalProperties > permissions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** Permissions to be tied to the folder

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                        | Description |
| -------------------------------------------------------------------------------------- | ----------- |
| [SharedFoldersPermissionsProps](#sharedFolders_additionalProperties_permissions_items) | -           |

##### <a name="autogenerated_heading_8"></a>5.1.2.1. root > sharedFolders > additionalProperties > permissions > SharedFoldersPermissionsProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/SharedFoldersPermissionsProps             |

| Property                                                                        | Pattern | Type             | Deprecated | Definition                     | Title/Description                     |
| ------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | ------------------------------ | ------------------------------------- |
| + [actions](#sharedFolders_additionalProperties_permissions_items_actions )     | No      | enum (of string) | No         | In #/definitions/FolderActions | Either READER_FOLDER or AUTHOR_FOLDER |
| + [principal](#sharedFolders_additionalProperties_permissions_items_principal ) | No      | string           | No         | -                              | List of Principals                    |

###### <a name="sharedFolders_additionalProperties_permissions_items_actions"></a>5.1.2.1.1. Property `root > sharedFolders > additionalProperties > permissions > permissions items > actions`

|                |                             |
| -------------- | --------------------------- |
| **Type**       | `enum (of string)`          |
| **Required**   | Yes                         |
| **Defined in** | #/definitions/FolderActions |

**Description:** Either READER_FOLDER or AUTHOR_FOLDER

Must be one of:
* "AUTHOR_FOLDER"
* "READER_FOLDER"

###### <a name="sharedFolders_additionalProperties_permissions_items_principal"></a>5.1.2.1.2. Property `root > sharedFolders > additionalProperties > permissions > permissions items > principal`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** List of Principals

----------------------------------------------------------------------------------------------------------------------------
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-06 at 12:58:03 -0400

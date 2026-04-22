# Schema Docs

|                           |             |
| ------------------------- | ----------- |
| **Type**                  | `object`    |
| **Required**              | No          |
| **Additional properties** | Not allowed |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                          | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [dataSources](#dataSources )                                       | No      | object | No         | -                                                   | Nested map of data source type to data source configurations for QuickSight project data connectivity.<br />Outer key is the data source type (e.g., REDSHIFT, ATHENA), inner key is a unique data source ID.<br />Supports credential pairs, secret ARN references, VPC connections, and SSL configuration.<br /><br />Use cases: Redshift data source setup; Athena connectivity; Multi-source BI integration<br /><br />AWS: QuickSight data sources with credentials, VPC connections, and type-specific parameters<br /><br />Validation: Optional; nested map of type → ID → DataSourceProps                                                                                      |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressionConfigs          | Q-ENHANCED-PROPERTY<br />Optional CDK Nag suppression configurations for compliance rule management enabling controlled security rule exceptions and compliance documentation. Provides structured approach to managing security rule suppressions with proper justification and documentation for compliance auditing.<br /><br />Use cases: Compliance management; Security rule exceptions; Audit documentation; Controlled suppressions<br /><br />AWS: CDK Nag suppressions for compliance rule management and security exception documentation<br /><br />Validation: Must be valid MdaaNagSuppressionConfigs if provided; enables structured compliance rule management          |
| + [principals](#principals )                                         | No      | object | No         | -                                                   | Named QuickSight principals (users or groups) referenced in folder and data source permissions.<br />Each key is a logical name, value is the QuickSight principal ARN.<br /><br />Use cases: Principal-based access control; Group permission assignment; User management<br /><br />AWS: QuickSight user/group ARNs for permission assignment<br /><br />Validation: Required; map of string keys to QuickSight principal ARNs                                                                                                                                                                                                                                                        |
| - [sagemakerBlueprint](#sagemakerBlueprint )                         | No      | object | No         | In #/definitions/MdaaSageMakerCustomBluePrintConfig | Q-ENHANCED-PROPERTY<br />Optional SageMaker blueprint configuration for governed self-service deployment enabling controlled infrastructure provisioning and governance. When specified, deploys the module as a SageMaker blueprint instead of direct deployment for governed access and compliance.<br /><br />Use cases: Governed deployment; Self-service provisioning; SageMaker integration; Controlled access<br /><br />AWS: SageMaker blueprint configuration for governed infrastructure deployment and self-service provisioning<br /><br />Validation: Must be valid MdaaServiceCatalogProductConfig if provided; enables SageMaker deployment mode                         |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig    | Q-ENHANCED-PROPERTY<br />Optional Service Catalog product configuration for governed self-service deployment enabling controlled infrastructure provisioning and governance. When specified, deploys the module as a Service Catalog product instead of direct deployment for governed access and compliance.<br /><br />Use cases: Governed deployment; Self-service provisioning; Service Catalog integration; Controlled access<br /><br />AWS: Service Catalog product configuration for governed infrastructure deployment and self-service provisioning<br /><br />Validation: Must be valid MdaaServiceCatalogProductConfig if provided; enables Service Catalog deployment mode |
| - [sharedFolders](#sharedFolders )                                   | No      | object | No         | -                                                   | Named shared folder configurations for collaborative QuickSight workspace management.<br />Each folder supports hierarchical sub-folders and principal-based permissions<br />(READER_FOLDER or AUTHOR_FOLDER actions).<br /><br />Use cases: Team-based BI workspaces; Dev/test/prod folder separation; Asset organization<br /><br />AWS: QuickSight shared folders with hierarchical structure and permission management<br /><br />Validation: Optional; map of string keys to SharedFoldersProps                                                                                                                                                                                   |

## <a name="dataSources"></a>1. Property `root > dataSources`

|                           |                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                 |
| **Required**              | No                                                                                       |
| **Additional properties** | [Each additional property must conform to the schema](#dataSources_additionalProperties) |

**Description:** Nested map of data source type to data source configurations for QuickSight project data connectivity.
Outer key is the data source type (e.g., REDSHIFT, ATHENA), inner key is a unique data source ID.
Supports credential pairs, secret ARN references, VPC connections, and SSL configuration.

Use cases: Redshift data source setup; Athena connectivity; Multi-source BI integration

AWS: QuickSight data sources with credentials, VPC connections, and type-specific parameters

Validation: Optional; nested map of type → ID → DataSourceProps

| Property                                 | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#dataSources_additionalProperties ) | No      | object | No         | -          | -                 |

### <a name="dataSources_additionalProperties"></a>1.1. Property `root > dataSources > additionalProperties`

|                           |                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                      |
| **Required**              | No                                                                                                            |
| **Additional properties** | [Each additional property must conform to the schema](#dataSources_additionalProperties_additionalProperties) |

| Property                                                      | Pattern | Type   | Deprecated | Definition                       | Title/Description                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [](#dataSources_additionalProperties_additionalProperties ) | No      | object | No         | In #/definitions/DataSourceProps | Core data source configuration for QuickSight, defining connection parameters,<br />credentials, permissions, and optional SSL/VPC settings.<br /><br />Use cases: Redshift data source; Athena data source; S3/RDS connectivity<br /><br />AWS: QuickSight CfnDataSource<br /><br />Validation: dataSourceSpecificParameters, displayName, and permissions required |

#### <a name="dataSources_additionalProperties_additionalProperties"></a>1.1.1. Property `root > dataSources > additionalProperties > DataSourceProps`

|                           |                               |
| ------------------------- | ----------------------------- |
| **Type**                  | `object`                      |
| **Required**              | No                            |
| **Additional properties** | Not allowed                   |
| **Defined in**            | #/definitions/DataSourceProps |

**Description:** Core data source configuration for QuickSight, defining connection parameters,
credentials, permissions, and optional SSL/VPC settings.

Use cases: Redshift data source; Athena data source; S3/RDS connectivity

AWS: QuickSight CfnDataSource

Validation: dataSourceSpecificParameters, displayName, and permissions required

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

|                           |                                          |
| ------------------------- | ---------------------------------------- |
| **Type**                  | `object`                                 |
| **Required**              | No                                       |
| **Additional properties** | Not allowed                              |
| **Defined in**            | #/definitions/DataSourceCredentialsProps |

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

|                           |                                             |
| ------------------------- | ------------------------------------------- |
| **Type**                  | `object`                                    |
| **Required**              | No                                          |
| **Additional properties** | Not allowed                                 |
| **Defined in**            | #/definitions/DataSourceCredentialPairProps |

**Description:** Credential pair. For more information, see [CredentialPair](https://docs.aws.amazon.com/quicksight/latest/APIReference/API_CredentialPair.html) .

| Property                                                                                                                                            | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [alternateDataSourceParameters](#dataSources_additionalProperties_additionalProperties_credentials_credentialPair_alternateDataSourceParameters ) | No      | array  | No         | -          | -                                                                                                                                                                                                                                                                                                                      |
| + [password](#dataSources_additionalProperties_additionalProperties_credentials_credentialPair_password )                                           | No      | string | No         | -          | Password for data source authentication. Can use dynamic references<br />(e.g., resolve:secretsmanager) for secure credential retrieval.<br /><br />Use cases: Database password; Secret manager dynamic reference<br /><br />AWS: QuickSight data source credential<br /><br />Validation: Required; non-empty string |
| + [username](#dataSources_additionalProperties_additionalProperties_credentials_credentialPair_username )                                           | No      | string | No         | -          | Username for data source authentication.<br /><br />Use cases: Database user identity; Service account access<br /><br />AWS: QuickSight data source credential<br /><br />Validation: Required; non-empty string                                                                                                      |

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

|                           |                                                                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                             |
| **Required**              | No                                                                                                                                                                                                   |
| **Additional properties** | [Each additional property must conform to the schema](#dataSources_additionalProperties_additionalProperties_credentials_credentialPair_alternateDataSourceParameters_items_i0_additionalProperties) |

| Property                                                                                                                                             | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#dataSources_additionalProperties_additionalProperties_credentials_credentialPair_alternateDataSourceParameters_items_i0_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="dataSources_additionalProperties_additionalProperties_credentials_credentialPair_alternateDataSourceParameters_items_i0_additionalProperties"></a>1.1.1.2.2.1.1.1. Property `root > dataSources > additionalProperties > additionalProperties > credentials > credentialPair > alternateDataSourceParameters > alternateDataSourceParameters item 0 > additionalProperties`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="dataSources_additionalProperties_additionalProperties_credentials_credentialPair_password"></a>1.1.1.2.2.2. Property `root > dataSources > additionalProperties > additionalProperties > credentials > credentialPair > password`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Password for data source authentication. Can use dynamic references
(e.g., resolve:secretsmanager) for secure credential retrieval.

Use cases: Database password; Secret manager dynamic reference

AWS: QuickSight data source credential

Validation: Required; non-empty string

###### <a name="dataSources_additionalProperties_additionalProperties_credentials_credentialPair_username"></a>1.1.1.2.2.3. Property `root > dataSources > additionalProperties > additionalProperties > credentials > credentialPair > username`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Username for data source authentication.

Use cases: Database user identity; Service account access

AWS: QuickSight data source credential

Validation: Required; non-empty string

###### <a name="dataSources_additionalProperties_additionalProperties_credentials_secretArn"></a>1.1.1.2.3. Property `root > dataSources > additionalProperties > additionalProperties > credentials > secretArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** CfnDataSource.DataSourceCredentialsProperty.SecretArn.

##### <a name="dataSources_additionalProperties_additionalProperties_dataSourceSpecificParameters"></a>1.1.1.3. Property `root > dataSources > additionalProperties > additionalProperties > dataSourceSpecificParameters`

|                           |                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                        |
| **Required**              | Yes                                                                                                                                                             |
| **Additional properties** | [Each additional property must conform to the schema](#dataSources_additionalProperties_additionalProperties_dataSourceSpecificParameters_additionalProperties) |

| Property                                                                                                        | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#dataSources_additionalProperties_additionalProperties_dataSourceSpecificParameters_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="dataSources_additionalProperties_additionalProperties_dataSourceSpecificParameters_additionalProperties"></a>1.1.1.3.1. Property `root > dataSources > additionalProperties > additionalProperties > dataSourceSpecificParameters > additionalProperties`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

##### <a name="dataSources_additionalProperties_additionalProperties_displayName"></a>1.1.1.4. Property `root > dataSources > additionalProperties > additionalProperties > displayName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** A display name for the data source.

##### <a name="dataSources_additionalProperties_additionalProperties_errorInfo"></a>1.1.1.5. Property `root > dataSources > additionalProperties > additionalProperties > errorInfo`

|                           |                                        |
| ------------------------- | -------------------------------------- |
| **Type**                  | `object`                               |
| **Required**              | No                                     |
| **Additional properties** | Not allowed                            |
| **Defined in**            | #/definitions/DataSourceErrorInfoProps |

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

| Each item of this array must be                                                                        | Description                                                                                     |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| [DataSourcePermissionsProps](#dataSources_additionalProperties_additionalProperties_permissions_items) | Permission entry for a QuickSight data source, mapping a principal to a data source action. ... |

###### <a name="dataSources_additionalProperties_additionalProperties_permissions_items"></a>1.1.1.6.1. root > dataSources > additionalProperties > additionalProperties > permissions > DataSourcePermissionsProps

|                           |                                          |
| ------------------------- | ---------------------------------------- |
| **Type**                  | `object`                                 |
| **Required**              | No                                       |
| **Additional properties** | Not allowed                              |
| **Defined in**            | #/definitions/DataSourcePermissionsProps |

**Description:** Permission entry for a QuickSight data source, mapping a principal to a data source action.

Use cases: Read-only data source access; Full author access for data source management

AWS: QuickSight data source permissions

Validation: Both actions and principal are required

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

|                           |                                  |
| ------------------------- | -------------------------------- |
| **Type**                  | `object`                         |
| **Required**              | No                               |
| **Additional properties** | Not allowed                      |
| **Defined in**            | #/definitions/DataSourceSSLProps |

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

|                           |                                  |
| ------------------------- | -------------------------------- |
| **Type**                  | `object`                         |
| **Required**              | No                               |
| **Additional properties** | Not allowed                      |
| **Defined in**            | #/definitions/DataSourceVPCProps |

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

|                           |                                         |
| ------------------------- | --------------------------------------- |
| **Type**                  | `object`                                |
| **Required**              | No                                      |
| **Additional properties** | Not allowed                             |
| **Defined in**            | #/definitions/MdaaNagSuppressionConfigs |

**Description:** Q-ENHANCED-PROPERTY
Optional CDK Nag suppression configurations for compliance rule management enabling controlled security rule exceptions and compliance documentation. Provides structured approach to managing security rule suppressions with proper justification and documentation for compliance auditing.

Use cases: Compliance management; Security rule exceptions; Audit documentation; Controlled suppressions

AWS: CDK Nag suppressions for compliance rule management and security exception documentation

Validation: Must be valid MdaaNagSuppressionConfigs if provided; enables structured compliance rule management

| Property                                | Pattern | Type  | Deprecated | Definition | Title/Description                                                                          |
| --------------------------------------- | ------- | ----- | ---------- | ---------- | ------------------------------------------------------------------------------------------ |
| + [by_path](#nag_suppressions_by_path ) | No      | array | No         | -          | Array of CDK Nag suppressions organized by CloudFormation resource path, enabling targeted |

### <a name="nag_suppressions_by_path"></a>2.1. Property `root > nag_suppressions > by_path`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** Array of CDK Nag suppressions organized by CloudFormation resource path, enabling targeted

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

#### <a name="nag_suppressions_by_path_items"></a>2.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

|                           |                                        |
| ------------------------- | -------------------------------------- |
| **Type**                  | `object`                               |
| **Required**              | No                                     |
| **Additional properties** | Not allowed                            |
| **Defined in**            | #/definitions/MdaaNagSuppressionByPath |

| Property                                                        | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                           |
| --------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| + [path](#nag_suppressions_by_path_items_path )                 | No      | string          | No         | -          | CloudFormation resource path identifying the specific resource for which CDK Nag rules should be suppressed |
| + [suppressions](#nag_suppressions_by_path_items_suppressions ) | No      | array of object | No         | -          | Array of specific CDK Nag rule suppressions with rule IDs and mandatory justifications for audit compliance |

##### <a name="nag_suppressions_by_path_items_path"></a>2.1.1.1. Property `root > nag_suppressions > by_path > by_path items > path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** CloudFormation resource path identifying the specific resource for which CDK Nag rules should be suppressed

##### <a name="nag_suppressions_by_path_items_suppressions"></a>2.1.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of object` |
| **Required** | Yes               |

**Description:** Array of specific CDK Nag rule suppressions with rule IDs and mandatory justifications for audit compliance

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

###### <a name="nag_suppressions_by_path_items_suppressions_items"></a>2.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

|                           |             |
| ------------------------- | ----------- |
| **Type**                  | `object`    |
| **Required**              | No          |
| **Additional properties** | Not allowed |

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

|                           |                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                |
| **Required**              | Yes                                                                                     |
| **Additional properties** | [Each additional property must conform to the schema](#principals_additionalProperties) |

**Description:** Named QuickSight principals (users or groups) referenced in folder and data source permissions.
Each key is a logical name, value is the QuickSight principal ARN.

Use cases: Principal-based access control; Group permission assignment; User management

AWS: QuickSight user/group ARNs for permission assignment

Validation: Required; map of string keys to QuickSight principal ARNs

| Property                                | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#principals_additionalProperties ) | No      | string | No         | -          | -                 |

### <a name="principals_additionalProperties"></a>3.1. Property `root > principals > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

## <a name="sagemakerBlueprint"></a>4. Property `root > sagemakerBlueprint`

|                           |                                                  |
| ------------------------- | ------------------------------------------------ |
| **Type**                  | `object`                                         |
| **Required**              | No                                               |
| **Additional properties** | Not allowed                                      |
| **Defined in**            | #/definitions/MdaaSageMakerCustomBluePrintConfig |

**Description:** Q-ENHANCED-PROPERTY
Optional SageMaker blueprint configuration for governed self-service deployment enabling controlled infrastructure provisioning and governance. When specified, deploys the module as a SageMaker blueprint instead of direct deployment for governed access and compliance.

Use cases: Governed deployment; Self-service provisioning; SageMaker integration; Controlled access

AWS: SageMaker blueprint configuration for governed infrastructure deployment and self-service provisioning

Validation: Must be valid MdaaServiceCatalogProductConfig if provided; enables SageMaker deployment mode

| Property                                                              | Pattern | Type            | Deprecated | Definition                                                                                                | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------------- | ------- | --------------- | ---------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [additionalAccounts](#sagemakerBlueprint_additionalAccounts )       | No      | object          | No         | -                                                                                                         | Q-ENHANCED-PROPERTY<br />Optional map of additional AWS accounts where the SageMaker blueprint should be enabled. Each entry maps a friendly account name to account-specific configuration including provisioning role ARN and optional parameters and authorized domain units.<br /><br />Use cases: Multi-account deployment; Cross-account provisioning; Account-specific configuration<br /><br />AWS: AWS SageMaker blueprint multi-account provisioning configuration<br /><br />Validation: Must be object with string keys and valid account configuration values if provided        |
| - [authorizedDomainUnits](#sagemakerBlueprint_authorizedDomainUnits ) | No      | array of string | No         | -                                                                                                         | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| - [blueprintName](#sagemakerBlueprint_blueprintName )                 | No      | string          | No         | -                                                                                                         | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| - [description](#sagemakerBlueprint_description )                     | No      | string          | No         | -                                                                                                         | Q-ENHANCED-PROPERTY<br />Description for the SageMaker blueprint that will be visible to end users in the SageMaker console. Should be descriptive and user-friendly to facilitate blueprint discovery and selection.<br /><br />Use cases: Product identification; User-friendly naming; SageMaker console display<br /><br />AWS: AWS SageMaker blueprint name for user interface display<br /><br />Validation: Must be non-empty string suitable for SageMaker blueprint naming                                                                                                           |
| - [domainBucketName](#sagemakerBlueprint_domainBucketName )           | No      | string          | No         | -                                                                                                         | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| - [domainConfig](#sagemakerBlueprint_domainConfig )                   | No      | object          | No         | In #/definitions/DomainConfig                                                                             | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| - [domainConfigSSMParam](#sagemakerBlueprint_domainConfigSSMParam )   | No      | string          | No         | -                                                                                                         | Q-ENHANCED-PROPERTY<br />Optional SSM parameter reference for domain configuration enabling dynamic domain configuration management. Specifies the SSM parameter containing domain configuration data for flexible domain setup and configuration management.<br /><br />Use cases: Dynamic configuration; SSM parameter reference; Configuration management; Flexible setup<br /><br />AWS: AWS Systems Manager parameter for DataZone domain configuration reference<br /><br />Validation: Must be valid SSM parameter name if provided; parameter must contain valid domain configuration |
| - [enabledRegions](#sagemakerBlueprint_enabledRegions )               | No      | array of string | No         | -                                                                                                         | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| - [parameters](#sagemakerBlueprint_parameters )                       | No      | object          | No         | -                                                                                                         | Q-ENHANCED-PROPERTY<br />Optional object containing named parameter configurations for the SageMaker blueprint. Enables parameterized blueprint deployment with validation rules and user input constraints.<br /><br />Use cases: Product parameterization; User input collection; Deployment customization<br /><br />AWS: AWS SageMaker blueprint parameters for user-configurable deployment options<br /><br />Validation: Must be object with string keys and valid MdaaServiceCatalogParameterConfig values if provided<br />  *                                                       |
| + [provisioningRole](#sagemakerBlueprint_provisioningRole )           | No      | object          | No         | Same as [provisioningRole](#sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole ) | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### <a name="sagemakerBlueprint_additionalAccounts"></a>4.1. Property `root > sagemakerBlueprint > additionalAccounts`

|                           |                                                                                                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                           |
| **Required**              | No                                                                                                                 |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_additionalAccounts_additionalProperties) |

**Description:** Q-ENHANCED-PROPERTY
Optional map of additional AWS accounts where the SageMaker blueprint should be enabled. Each entry maps a friendly account name to account-specific configuration including provisioning role ARN and optional parameters and authorized domain units.

Use cases: Multi-account deployment; Cross-account provisioning; Account-specific configuration

AWS: AWS SageMaker blueprint multi-account provisioning configuration

Validation: Must be object with string keys and valid account configuration values if provided

| Property                                                           | Pattern | Type   | Deprecated | Definition                                  | Title/Description |
| ------------------------------------------------------------------ | ------- | ------ | ---------- | ------------------------------------------- | ----------------- |
| - [](#sagemakerBlueprint_additionalAccounts_additionalProperties ) | No      | object | No         | In #/definitions/AdditionalBlueprintAccount | -                 |

#### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties"></a>4.1.1. Property `root > sagemakerBlueprint > additionalAccounts > AdditionalBlueprintAccount`

|                           |                                          |
| ------------------------- | ---------------------------------------- |
| **Type**                  | `object`                                 |
| **Required**              | No                                       |
| **Additional properties** | Not allowed                              |
| **Defined in**            | #/definitions/AdditionalBlueprintAccount |

| Property                                                                                                      | Pattern | Type            | Deprecated | Definition                   | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------------------------- | ----------------- |
| + [account](#sagemakerBlueprint_additionalAccounts_additionalProperties_account )                             | No      | string          | No         | -                            | -                 |
| - [authorizedDomainUnits](#sagemakerBlueprint_additionalAccounts_additionalProperties_authorizedDomainUnits ) | No      | array of string | No         | -                            | -                 |
| - [enabledRegions](#sagemakerBlueprint_additionalAccounts_additionalProperties_enabledRegions )               | No      | array of string | No         | -                            | -                 |
| - [parameters](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters )                       | No      | object          | No         | -                            | -                 |
| + [provisioningRole](#sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole )           | No      | object          | No         | In #/definitions/MdaaRoleRef | -                 |

##### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_account"></a>4.1.1.1. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > account`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_authorizedDomainUnits"></a>4.1.1.2. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > authorizedDomainUnits`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                        | Description |
| ---------------------------------------------------------------------------------------------------------------------- | ----------- |
| [authorizedDomainUnits items](#sagemakerBlueprint_additionalAccounts_additionalProperties_authorizedDomainUnits_items) | -           |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_authorizedDomainUnits_items"></a>4.1.1.2.1. root > sagemakerBlueprint > additionalAccounts > additionalProperties > authorizedDomainUnits > authorizedDomainUnits items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_enabledRegions"></a>4.1.1.3. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > enabledRegions`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                          | Description |
| -------------------------------------------------------------------------------------------------------- | ----------- |
| [enabledRegions items](#sagemakerBlueprint_additionalAccounts_additionalProperties_enabledRegions_items) | -           |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_enabledRegions_items"></a>4.1.1.3.1. root > sagemakerBlueprint > additionalAccounts > additionalProperties > enabledRegions > enabledRegions items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters"></a>4.1.1.4. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters`

|                           |                                                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                           |
| **Required**              | No                                                                                                                                                 |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties) |

| Property                                                                                           | Pattern | Type   | Deprecated | Definition                                             | Title/Description |
| -------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------ | ----------------- |
| - [](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties ) | No      | object | No         | In #/definitions/MdaaSageMakerBluePrintParameterConfig | -                 |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties"></a>4.1.1.4.1. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > MdaaSageMakerBluePrintParameterConfig`

|                           |                                                     |
| ------------------------- | --------------------------------------------------- |
| **Type**                  | `object`                                            |
| **Required**              | No                                                  |
| **Additional properties** | Not allowed                                         |
| **Defined in**            | #/definitions/MdaaSageMakerBluePrintParameterConfig |

| Property                                                                                                                                  | Pattern | Type   | Deprecated | Definition                                            | Title/Description |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ----------------------------------------------------- | ----------------- |
| + [blueprintParamProps](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_blueprintParamProps ) | No      | object | No         | In #/definitions/MdaaSageMakerBluePrintParameterProps | -                 |
| - [cfnParamProps](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps )             | No      | object | No         | In #/definitions/CfnParameterProps                    | -                 |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_blueprintParamProps"></a>4.1.1.4.1.1. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > blueprintParamProps`

|                           |                                                    |
| ------------------------- | -------------------------------------------------- |
| **Type**                  | `object`                                           |
| **Required**              | Yes                                                |
| **Additional properties** | Not allowed                                        |
| **Defined in**            | #/definitions/MdaaSageMakerBluePrintParameterProps |

| Property                                                                                                                                                  | Pattern | Type    | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ----------------- |
| - [defaultValue](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_blueprintParamProps_defaultValue )           | No      | string  | No         | -          | -                 |
| - [description](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_blueprintParamProps_description )             | No      | string  | No         | -          | -                 |
| + [fieldType](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_blueprintParamProps_fieldType )                 | No      | string  | No         | -          | -                 |
| - [isEditable](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_blueprintParamProps_isEditable )               | No      | boolean | No         | -          | -                 |
| - [isOptional](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_blueprintParamProps_isOptional )               | No      | boolean | No         | -          | -                 |
| - [isUpdateSupported](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_blueprintParamProps_isUpdateSupported ) | No      | boolean | No         | -          | -                 |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_blueprintParamProps_defaultValue"></a>4.1.1.4.1.1.1. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > blueprintParamProps > defaultValue`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_blueprintParamProps_description"></a>4.1.1.4.1.1.2. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > blueprintParamProps > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_blueprintParamProps_fieldType"></a>4.1.1.4.1.1.3. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > blueprintParamProps > fieldType`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_blueprintParamProps_isEditable"></a>4.1.1.4.1.1.4. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > blueprintParamProps > isEditable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_blueprintParamProps_isOptional"></a>4.1.1.4.1.1.5. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > blueprintParamProps > isOptional`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_blueprintParamProps_isUpdateSupported"></a>4.1.1.4.1.1.6. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > blueprintParamProps > isUpdateSupported`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps"></a>4.1.1.4.1.2. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > cfnParamProps`

|                           |                                 |
| ------------------------- | ------------------------------- |
| **Type**                  | `object`                        |
| **Required**              | No                              |
| **Additional properties** | Not allowed                     |
| **Defined in**            | #/definitions/CfnParameterProps |

| Property                                                                                                                                                    | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [allowedPattern](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_allowedPattern )               | No      | string          | No         | -          | A regular expression that represents the patterns to allow for String types.                                                                                                                                                                                              |
| - [allowedValues](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_allowedValues )                 | No      | array of string | No         | -          | An array containing the list of values allowed for the parameter.                                                                                                                                                                                                         |
| - [constraintDescription](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_constraintDescription ) | No      | string          | No         | -          | A string that explains a constraint when the constraint is violated.<br />For example, without a constraint description, a parameter that has an allowed<br />pattern of [A-Za-z0-9]+ displays the following error message when the user specifies<br />an invalid value: |
| - [default](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_default )                             | No      | object          | No         | -          | A value of the appropriate type for the template to use if no value is specified<br />when a stack is created. If you define constraints for the parameter, you must specify<br />a value that adheres to those constraints.                                              |
| - [description](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_description )                     | No      | string          | No         | -          | A string of up to 4000 characters that describes the parameter.                                                                                                                                                                                                           |
| - [maxLength](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_maxLength )                         | No      | number          | No         | -          | An integer value that determines the largest number of characters you want to allow for String types.                                                                                                                                                                     |
| - [maxValue](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_maxValue )                           | No      | number          | No         | -          | A numeric value that determines the largest numeric value you want to allow for Number types.                                                                                                                                                                             |
| - [minLength](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_minLength )                         | No      | number          | No         | -          | An integer value that determines the smallest number of characters you want to allow for String types.                                                                                                                                                                    |
| - [minValue](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_minValue )                           | No      | number          | No         | -          | A numeric value that determines the smallest numeric value you want to allow for Number types.                                                                                                                                                                            |
| - [noEcho](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_noEcho )                               | No      | boolean         | No         | -          | Whether to mask the parameter value when anyone makes a call that describes the stack.<br />If you set the value to \`\`true\`\`, the parameter value is masked with asterisks (\`\`*****\`\`).                                                                           |
| - [type](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_type )                                   | No      | string          | No         | -          | The data type for the parameter (DataType).                                                                                                                                                                                                                               |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_allowedPattern"></a>4.1.1.4.1.2.1. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > cfnParamProps > allowedPattern`

|              |                                                         |
| ------------ | ------------------------------------------------------- |
| **Type**     | `string`                                                |
| **Required** | No                                                      |
| **Default**  | `"- No constraints on patterns allowed for parameter."` |

**Description:** A regular expression that represents the patterns to allow for String types.

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_allowedValues"></a>4.1.1.4.1.2.2. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > cfnParamProps > allowedValues`

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

| Each item of this array must be                                                                                                                      | Description |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [allowedValues items](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_allowedValues_items) | -           |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_allowedValues_items"></a>4.1.1.4.1.2.2.1. root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > cfnParamProps > allowedValues > allowedValues items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_constraintDescription"></a>4.1.1.4.1.2.3. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > cfnParamProps > constraintDescription`

|              |                                                                                        |
| ------------ | -------------------------------------------------------------------------------------- |
| **Type**     | `string`                                                                               |
| **Required** | No                                                                                     |
| **Default**  | `"- No description with customized error message when user specifies invalid values."` |

**Description:** A string that explains a constraint when the constraint is violated.
For example, without a constraint description, a parameter that has an allowed
pattern of [A-Za-z0-9]+ displays the following error message when the user specifies
an invalid value:

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_default"></a>4.1.1.4.1.2.4. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > cfnParamProps > default`

|                           |                                       |
| ------------------------- | ------------------------------------- |
| **Type**                  | `object`                              |
| **Required**              | No                                    |
| **Additional properties** | Any type allowed                      |
| **Default**               | `"- No default value for parameter."` |

**Description:** A value of the appropriate type for the template to use if no value is specified
when a stack is created. If you define constraints for the parameter, you must specify
a value that adheres to those constraints.

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_description"></a>4.1.1.4.1.2.5. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > cfnParamProps > description`

|              |                                         |
| ------------ | --------------------------------------- |
| **Type**     | `string`                                |
| **Required** | No                                      |
| **Default**  | `"- No description for the parameter."` |

**Description:** A string of up to 4000 characters that describes the parameter.

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_maxLength"></a>4.1.1.4.1.2.6. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > cfnParamProps > maxLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the largest number of characters you want to allow for String types.

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_maxValue"></a>4.1.1.4.1.2.7. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > cfnParamProps > maxValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the largest numeric value you want to allow for Number types.

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_minLength"></a>4.1.1.4.1.2.8. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > cfnParamProps > minLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the smallest number of characters you want to allow for String types.

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_minValue"></a>4.1.1.4.1.2.9. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > cfnParamProps > minValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the smallest numeric value you want to allow for Number types.

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_noEcho"></a>4.1.1.4.1.2.10. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > cfnParamProps > noEcho`

|              |                                        |
| ------------ | -------------------------------------- |
| **Type**     | `boolean`                              |
| **Required** | No                                     |
| **Default**  | `"- Parameter values are not masked."` |

**Description:** Whether to mask the parameter value when anyone makes a call that describes the stack.
If you set the value to ``true``, the parameter value is masked with asterisks (``*****``).

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps_type"></a>4.1.1.4.1.2.11. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > parameters > additionalProperties > cfnParamProps > type`

|              |            |
| ------------ | ---------- |
| **Type**     | `string`   |
| **Required** | No         |
| **Default**  | `"String"` |

**Description:** The data type for the parameter (DataType).

##### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole"></a>4.1.1.5. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > provisioningRole`

|                           |                           |
| ------------------------- | ------------------------- |
| **Type**                  | `object`                  |
| **Required**              | Yes                       |
| **Additional properties** | Not allowed               |
| **Defined in**            | #/definitions/MdaaRoleRef |

| Property                                                                                               | Pattern | Type    | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------ | ------- | ------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [arn](#sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole_arn )             | No      | string  | No         | -          | Full IAM role ARN for cross-account role references and explicit role identification.<br /><br />Use cases: Cross-account role references; Explicit role binding; Multi-account deployments<br /><br />AWS: Full IAM role ARN (arn:aws:iam::ACCOUNT:role/ROLE-NAME)<br /><br />Validation: Optional; must be a valid IAM role ARN if provided                                                    |
| - [id](#sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole_id )               | No      | string  | No         | -          | IAM role unique identifier for role resolution using the role's AWS-generated ID.<br /><br />Use cases: Stable role references; Role resolution by unique ID; Immutable role binding<br /><br />AWS: IAM role unique ID (e.g., AROA...)<br /><br />Validation: Optional; must be a valid IAM role unique ID if provided                                                                          |
| - [immutable](#sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole_immutable ) | No      | boolean | No         | -          | Flag indicating whether the referenced role should be treated as immutable and not modified by MDAA operations.<br /><br />Use cases: Pre-existing role protection; Externally managed roles; Read-only role references<br /><br />AWS: Controls whether MDAA attaches policies or modifies the referenced IAM role<br /><br />Validation: Optional boolean; defaults to false                   |
| - [name](#sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole_name )           | No      | string  | No         | -          | IAM role name for role resolution within the same AWS account.<br /><br />Use cases: Same-account role references; Role name-based resolution; Local IAM role binding<br /><br />AWS: IAM role name resolved via GetRole within the deployment account<br /><br />Validation: Optional; must be a valid IAM role name; mutually preferred with arn/id for resolution                             |
| - [refId](#sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole_refId )         | No      | string  | No         | -          | Unique identifier for the role reference within a configuration scope, enabling role lookup and deduplication.<br /><br />Use cases: Role reference identification; Configuration deduplication; Role lookup key<br /><br />AWS: Logical identifier for IAM role references within MDAA configuration<br /><br />Validation: Optional; must be unique within the configuration scope if provided |
| - [sso](#sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole_sso )             | No      | boolean | No         | -          | Flag indicating the role should be resolved as an AWS SSO auto-generated role.<br /><br />Use cases: AWS IAM Identity Center integration; SSO permission set role binding; Federated access<br /><br />AWS: Resolves role via AWS SSO/Identity Center auto-generated role naming convention<br /><br />Validation: Optional boolean; defaults to false                                           |

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole_arn"></a>4.1.1.5.1. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > provisioningRole > arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Full IAM role ARN for cross-account role references and explicit role identification.

Use cases: Cross-account role references; Explicit role binding; Multi-account deployments

AWS: Full IAM role ARN (arn:aws:iam::ACCOUNT:role/ROLE-NAME)

Validation: Optional; must be a valid IAM role ARN if provided

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole_id"></a>4.1.1.5.2. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > provisioningRole > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** IAM role unique identifier for role resolution using the role's AWS-generated ID.

Use cases: Stable role references; Role resolution by unique ID; Immutable role binding

AWS: IAM role unique ID (e.g., AROA...)

Validation: Optional; must be a valid IAM role unique ID if provided

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole_immutable"></a>4.1.1.5.3. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > provisioningRole > immutable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Flag indicating whether the referenced role should be treated as immutable and not modified by MDAA operations.

Use cases: Pre-existing role protection; Externally managed roles; Read-only role references

AWS: Controls whether MDAA attaches policies or modifies the referenced IAM role

Validation: Optional boolean; defaults to false

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole_name"></a>4.1.1.5.4. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > provisioningRole > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** IAM role name for role resolution within the same AWS account.

Use cases: Same-account role references; Role name-based resolution; Local IAM role binding

AWS: IAM role name resolved via GetRole within the deployment account

Validation: Optional; must be a valid IAM role name; mutually preferred with arn/id for resolution

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole_refId"></a>4.1.1.5.5. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > provisioningRole > refId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Unique identifier for the role reference within a configuration scope, enabling role lookup and deduplication.

Use cases: Role reference identification; Configuration deduplication; Role lookup key

AWS: Logical identifier for IAM role references within MDAA configuration

Validation: Optional; must be unique within the configuration scope if provided

###### <a name="sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole_sso"></a>4.1.1.5.6. Property `root > sagemakerBlueprint > additionalAccounts > additionalProperties > provisioningRole > sso`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Flag indicating the role should be resolved as an AWS SSO auto-generated role.

Use cases: AWS IAM Identity Center integration; SSO permission set role binding; Federated access

AWS: Resolves role via AWS SSO/Identity Center auto-generated role naming convention

Validation: Optional boolean; defaults to false

### <a name="sagemakerBlueprint_authorizedDomainUnits"></a>4.2. Property `root > sagemakerBlueprint > authorizedDomainUnits`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                | Description |
| ------------------------------------------------------------------------------ | ----------- |
| [authorizedDomainUnits items](#sagemakerBlueprint_authorizedDomainUnits_items) | -           |

#### <a name="sagemakerBlueprint_authorizedDomainUnits_items"></a>4.2.1. root > sagemakerBlueprint > authorizedDomainUnits > authorizedDomainUnits items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="sagemakerBlueprint_blueprintName"></a>4.3. Property `root > sagemakerBlueprint > blueprintName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="sagemakerBlueprint_description"></a>4.4. Property `root > sagemakerBlueprint > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Q-ENHANCED-PROPERTY
Description for the SageMaker blueprint that will be visible to end users in the SageMaker console. Should be descriptive and user-friendly to facilitate blueprint discovery and selection.

Use cases: Product identification; User-friendly naming; SageMaker console display

AWS: AWS SageMaker blueprint name for user interface display

Validation: Must be non-empty string suitable for SageMaker blueprint naming

### <a name="sagemakerBlueprint_domainBucketName"></a>4.5. Property `root > sagemakerBlueprint > domainBucketName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="sagemakerBlueprint_domainConfig"></a>4.6. Property `root > sagemakerBlueprint > domainConfig`

|                           |                            |
| ------------------------- | -------------------------- |
| **Type**                  | `object`                   |
| **Required**              | No                         |
| **Additional properties** | Not allowed                |
| **Defined in**            | #/definitions/DomainConfig |

| Property                                                                                       | Pattern | Type            | Deprecated | Definition                                                                                                              | Title/Description |
| ---------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------- |
| + [blueprintIds](#sagemakerBlueprint_domainConfig_blueprintIds )                               | No      | object          | No         | -                                                                                                                       | -                 |
| + [configParamArns](#sagemakerBlueprint_domainConfig_configParamArns )                         | No      | array of string | No         | -                                                                                                                       | -                 |
| + [customResourceRoleName](#sagemakerBlueprint_domainConfig_customResourceRoleName )           | No      | string          | No         | -                                                                                                                       | -                 |
| + [domainArn](#sagemakerBlueprint_domainConfig_domainArn )                                     | No      | string          | No         | -                                                                                                                       | -                 |
| + [domainBucketArn](#sagemakerBlueprint_domainConfig_domainBucketArn )                         | No      | string          | No         | -                                                                                                                       | -                 |
| + [domainBucketUsagePolicyName](#sagemakerBlueprint_domainConfig_domainBucketUsagePolicyName ) | No      | string          | No         | -                                                                                                                       | -                 |
| + [domainConfigCr](#sagemakerBlueprint_domainConfig_domainConfigCr )                           | No      | object          | No         | In #/definitions/MdaaCustomResource                                                                                     | -                 |
| + [domainId](#sagemakerBlueprint_domainConfig_domainId )                                       | No      | string          | No         | -                                                                                                                       | -                 |
| + [domainKmsKeyArn](#sagemakerBlueprint_domainConfig_domainKmsKeyArn )                         | No      | string          | No         | -                                                                                                                       | -                 |
| + [domainKmsUsagePolicyName](#sagemakerBlueprint_domainConfig_domainKmsUsagePolicyName )       | No      | string          | No         | -                                                                                                                       | -                 |
| + [domainName](#sagemakerBlueprint_domainConfig_domainName )                                   | No      | string          | No         | -                                                                                                                       | -                 |
| + [domainUnitIds](#sagemakerBlueprint_domainConfig_domainUnitIds )                             | No      | object          | No         | -                                                                                                                       | -                 |
| + [domainVersion](#sagemakerBlueprint_domainConfig_domainVersion )                             | No      | string          | No         | -                                                                                                                       | -                 |
| + [glueCatalogArns](#sagemakerBlueprint_domainConfig_glueCatalogArns )                         | No      | array of string | No         | -                                                                                                                       | -                 |
| + [glueCatalogKmsKeyArns](#sagemakerBlueprint_domainConfig_glueCatalogKmsKeyArns )             | No      | array of string | No         | -                                                                                                                       | -                 |
| + [node](#sagemakerBlueprint_domainConfig_node )                                               | No      | object          | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node ) | The tree node.    |
| + [projectIds](#sagemakerBlueprint_domainConfig_projectIds )                                   | No      | object          | No         | -                                                                                                                       | -                 |
| + [props](#sagemakerBlueprint_domainConfig_props )                                             | No      | object          | No         | In #/definitions/DomainConfigProps                                                                                      | -                 |
| + [ssmParamBase](#sagemakerBlueprint_domainConfig_ssmParamBase )                               | No      | string          | No         | -                                                                                                                       | -                 |

#### <a name="sagemakerBlueprint_domainConfig_blueprintIds"></a>4.6.1. Property `root > sagemakerBlueprint > domainConfig > blueprintIds`

|                           |                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                  |
| **Required**              | Yes                                                                                                                       |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_domainConfig_blueprintIds_additionalProperties) |

| Property                                                                  | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#sagemakerBlueprint_domainConfig_blueprintIds_additionalProperties ) | No      | string | No         | -          | -                 |

##### <a name="sagemakerBlueprint_domainConfig_blueprintIds_additionalProperties"></a>4.6.1.1. Property `root > sagemakerBlueprint > domainConfig > blueprintIds > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="sagemakerBlueprint_domainConfig_configParamArns"></a>4.6.2. Property `root > sagemakerBlueprint > domainConfig > configParamArns`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |
| **Default**  | `[]`              |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                 | Description |
| ------------------------------------------------------------------------------- | ----------- |
| [configParamArns items](#sagemakerBlueprint_domainConfig_configParamArns_items) | -           |

##### <a name="sagemakerBlueprint_domainConfig_configParamArns_items"></a>4.6.2.1. root > sagemakerBlueprint > domainConfig > configParamArns > configParamArns items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="sagemakerBlueprint_domainConfig_customResourceRoleName"></a>4.6.3. Property `root > sagemakerBlueprint > domainConfig > customResourceRoleName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="sagemakerBlueprint_domainConfig_domainArn"></a>4.6.4. Property `root > sagemakerBlueprint > domainConfig > domainArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="sagemakerBlueprint_domainConfig_domainBucketArn"></a>4.6.5. Property `root > sagemakerBlueprint > domainConfig > domainBucketArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="sagemakerBlueprint_domainConfig_domainBucketUsagePolicyName"></a>4.6.6. Property `root > sagemakerBlueprint > domainConfig > domainBucketUsagePolicyName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="sagemakerBlueprint_domainConfig_domainConfigCr"></a>4.6.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr`

|                           |                                  |
| ------------------------- | -------------------------------- |
| **Type**                  | `object`                         |
| **Required**              | Yes                              |
| **Additional properties** | Not allowed                      |
| **Defined in**            | #/definitions/MdaaCustomResource |

| Property                                                                                            | Pattern | Type   | Deprecated | Definition                                                                                                                | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [_allowCrossEnvironment](#sagemakerBlueprint_domainConfig_domainConfigCr__allowCrossEnvironment ) | No      | object | No         | -                                                                                                                         | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| + [_physicalName](#sagemakerBlueprint_domainConfig_domainConfigCr__physicalName )                   | No      | object | No         | -                                                                                                                         | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| + [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env )                                       | No      | object | No         | In #/definitions/ResourceEnvironment                                                                                      | The environment this resource belongs to.<br />For resources that are created and managed by the CDK<br />(generally, those created by creating new class instances like Role, Bucket, etc.),<br />this is always the same as the environment of the stack they belong to;<br />however, for imported resources<br />(those obtained from static methods like fromRoleArn, fromBucketName, etc.),<br />that might be different than the stack they were imported into. |
| + [handlerFunction](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction )               | No      | object | No         | In #/definitions/MdaaLambdaFunction                                                                                       | Construct for creating a compliant Lambda Function                                                                                                                                                                                                                                                                                                                                                                                                                     |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_node )                                     | No      | object | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )   | The tree node.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [physicalName](#sagemakerBlueprint_domainConfig_domainConfigCr_physicalName )                     | No      | string | No         | -                                                                                                                         | Returns a string-encoded token that resolves to the physical name that<br />should be passed to the CloudFormation resource.<br /><br />This value will resolve to one of the following:<br />- a concrete value (e.g. \`"my-awesome-bucket"\`)<br />- \`undefined\`, when a name should be generated by CloudFormation<br />- a concrete name generated automatically during synthesis, in<br />  cross-environment scenarios.                                        |
| + [ref](#sagemakerBlueprint_domainConfig_domainConfigCr_ref )                                       | No      | string | No         | -                                                                                                                         | The physical name of this custom resource.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| + [resource](#sagemakerBlueprint_domainConfig_domainConfigCr_resource )                             | No      | object | No         | -                                                                                                                         | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_stack )                                   | No      | object | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack ) | The stack in which this resource is defined.                                                                                                                                                                                                                                                                                                                                                                                                                           |

##### <a name="sagemakerBlueprint_domainConfig_domainConfigCr__allowCrossEnvironment"></a>4.6.7.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > _allowCrossEnvironment`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

##### <a name="sagemakerBlueprint_domainConfig_domainConfigCr__physicalName"></a>4.6.7.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > _physicalName`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

##### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_env"></a>4.6.7.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > env`

|                           |                                   |
| ------------------------- | --------------------------------- |
| **Type**                  | `object`                          |
| **Required**              | Yes                               |
| **Additional properties** | Not allowed                       |
| **Defined in**            | #/definitions/ResourceEnvironment |

**Description:** The environment this resource belongs to.
For resources that are created and managed by the CDK
(generally, those created by creating new class instances like Role, Bucket, etc.),
this is always the same as the environment of the stack they belong to;
however, for imported resources
(those obtained from static methods like fromRoleArn, fromBucketName, etc.),
that might be different than the stack they were imported into.

| Property                                                                  | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| + [account](#sagemakerBlueprint_domainConfig_domainConfigCr_env_account ) | No      | string | No         | -          | The AWS account ID that this resource belongs to.<br />Since this can be a Token<br />(for example, when the account is CloudFormation's AWS::AccountId intrinsic),<br />make sure to use Token.compareStrings()<br />instead of just comparing the values for equality. |
| + [region](#sagemakerBlueprint_domainConfig_domainConfigCr_env_region )   | No      | string | No         | -          | The AWS region that this resource belongs to.<br />Since this can be a Token<br />(for example, when the region is CloudFormation's AWS::Region intrinsic),<br />make sure to use Token.compareStrings()<br />instead of just comparing the values for equality.         |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_env_account"></a>4.6.7.3.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > env > account`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The AWS account ID that this resource belongs to.
Since this can be a Token
(for example, when the account is CloudFormation's AWS::AccountId intrinsic),
make sure to use Token.compareStrings()
instead of just comparing the values for equality.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_env_region"></a>4.6.7.3.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > env > region`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The AWS region that this resource belongs to.
Since this can be a Token
(for example, when the region is CloudFormation's AWS::Region intrinsic),
make sure to use Token.compareStrings()
instead of just comparing the values for equality.

##### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction"></a>4.6.7.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction`

|                           |                                  |
| ------------------------- | -------------------------------- |
| **Type**                  | `object`                         |
| **Required**              | Yes                              |
| **Additional properties** | Not allowed                      |
| **Defined in**            | #/definitions/MdaaLambdaFunction |

**Description:** Construct for creating a compliant Lambda Function

| Property                                                                                                                                    | Pattern | Type            | Deprecated | Definition                                                                                                                                                                                                               | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| + [_allowCrossEnvironment](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__allowCrossEnvironment )                         | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [_architecture](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__architecture )                                           | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections )                                             | No      | object          | No         | In #/definitions/Connections                                                                                                                                                                                             | Actual connections object for this Lambda<br /><br />May be unset, in which case this Lambda is not configured use in a VPC.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| - [_currentVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__currentVersion )                                       | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [_functionUrlInvocationGrants](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__functionUrlInvocationGrants )             | No      | object          | No         | In #/definitions/Record%3Cstring%2CGrant%3E                                                                                                                                                                              | Mapping of function URL invocation principals to grants. Used to de-dupe \`grantInvokeUrl()\` calls.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| + [_hasAddedArrayTokenStatements](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__hasAddedArrayTokenStatements )           | No      | object          | No         | -                                                                                                                                                                                                                        | Track whether we've added statements with array token resources to the role's default policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| + [_hasAddedLiteralStatements](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__hasAddedLiteralStatements )                 | No      | object          | No         | -                                                                                                                                                                                                                        | Track whether we've added statements with literal resources to the role's default policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| + [_invocationGrants](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__invocationGrants )                                   | No      | object          | No         | Same as [_functionUrlInvocationGrants](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__functionUrlInvocationGrants )                                                                                    | Mapping of invocation principals to grants. Used to de-dupe \`grantInvoke()\` calls.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| - [_latestVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__latestVersion )                                         | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [_layers](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers )                                                       | No      | array           | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [_logGroup](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__logGroup )                                                   | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [_logRetention](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__logRetention )                                           | No      | object          | No         | In #/definitions/LogRetention                                                                                                                                                                                            | Creates a custom resource to control the retention policy of a CloudWatch Logs<br />log group. The log group is created if it doesn't already exist. The policy<br />is removed when \`retentionDays\` is \`undefined\` or equal to \`Infinity\`.<br />Log group can be created in the region that is different from stack region by<br />specifying \`logGroupRegion\`                                                                                                                                                                                                                                            |
| + [_physicalName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__physicalName )                                           | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [_policyCounter](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__policyCounter )                                         | No      | object          | No         | -                                                                                                                                                                                                                        | The number of permissions added to this function                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| - [_skipPermissions](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__skipPermissions )                                     | No      | boolean         | No         | -                                                                                                                                                                                                                        | Whether the user decides to skip adding permissions.<br />The only use case is for cross-account, imported lambdas<br />where the user commits to modifying the permisssions<br />on the imported lambda outside CDK.                                                                                                                                                                                                                                                                                                                                                                                              |
| + [_warnIfCurrentVersionCalled](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__warnIfCurrentVersionCalled )               | No      | boolean         | No         | -                                                                                                                                                                                                                        | Flag to delay adding a warning message until current version is invoked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| + [architecture](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_architecture )                                             | No      | object          | No         | In #/definitions/Architecture                                                                                                                                                                                            | The architecture of this Lambda Function (this is an optional attribute and defaults to X86_64).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| + [buildDeadLetterConfig](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_buildDeadLetterConfig )                           | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [buildDeadLetterQueue](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_buildDeadLetterQueue )                             | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [buildTracingConfig](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_buildTracingConfig )                                 | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [canCreatePermissions](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_canCreatePermissions )                             | No      | const           | No         | -                                                                                                                                                                                                                        | Whether the addPermission() call adds any permissions<br /><br />True for new Lambdas, false for version $LATEST and imported Lambdas<br />from different accounts.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| + [configureAdotInstrumentation](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_configureAdotInstrumentation )             | No      | object          | No         | -                                                                                                                                                                                                                        | Add an AWS Distro for OpenTelemetry Lambda layer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [configureLambdaInsights](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_configureLambdaInsights )                       | No      | object          | No         | -                                                                                                                                                                                                                        | Configured lambda insights on the function if specified. This is achieved by adding an imported layer which is added to the<br />list of lambda layers on synthesis.<br /><br />https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-extension-versions.html                                                                                                                                                                                                                                                                                                                             |
| + [configureParamsAndSecretsExtension](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_configureParamsAndSecretsExtension ) | No      | object          | No         | -                                                                                                                                                                                                                        | Add a Parameters and Secrets Extension Lambda layer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| + [configureSnapStart](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_configureSnapStart )                                 | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [configureVpc](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_configureVpc )                                             | No      | object          | No         | -                                                                                                                                                                                                                        | If configured, set up the VPC-related properties<br /><br />Returns the VpcConfig that should be added to the<br />Lambda creation properties.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| + [connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_connections )                                               | No      | object          | No         | Same as [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections )                                                                                                                    | Access the Connections object<br /><br />Will fail if not a VPC-enabled Lambda Function                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| + [currentVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion )                                         | No      | object          | No         | In #/definitions/Version                                                                                                                                                                                                 | Returns a \`lambda.Version\` which represents the current version of this<br />Lambda function. A new version will be created every time the function's<br />configuration changes.<br /><br />You can specify options for this version using the \`currentVersionOptions\`<br />prop when initializing the \`lambda.Function\`.                                                                                                                                                                                                                                                                                   |
| - [currentVersionOptions](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersionOptions )                           | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [deadLetterQueue](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue )                                       | No      | object          | No         | In #/definitions/IQueue                                                                                                                                                                                                  | The DLQ (as queue) associated with this Lambda Function (this is an optional attribute).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| - [deadLetterTopic](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic )                                       | No      | object          | No         | In #/definitions/ITopic                                                                                                                                                                                                  | The DLQ (as topic) associated with this Lambda Function (this is an optional attribute).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| + [env](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_env )                                                               | No      | object          | No         | Same as [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env )                                                                                                                                                      | The environment this resource belongs to.<br />For resources that are created and managed by the CDK<br />(generally, those created by creating new class instances like Role, Bucket, etc.),<br />this is always the same as the environment of the stack they belong to;<br />however, for imported resources<br />(those obtained from static methods like fromRoleArn, fromBucketName, etc.),<br />that might be different than the stack they were imported into.                                                                                                                                             |
| + [environment](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_environment )                                               | No      | object          | No         | -                                                                                                                                                                                                                        | Environment variables for this function                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| + [functionArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_functionArn )                                               | No      | string          | No         | -                                                                                                                                                                                                                        | ARN of this function                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| + [functionName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_functionName )                                             | No      | string          | No         | -                                                                                                                                                                                                                        | Name of this function                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| + [functionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_functionRef )                                               | No      | object          | No         | Same as [functionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionRef )                                                                                                       | A reference to a Function resource.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| + [getLoggingConfig](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_getLoggingConfig )                                     | No      | object          | No         | -                                                                                                                                                                                                                        | Get Logging Config property for the function.<br />This method returns the function LoggingConfig Property if the property is set on the<br />function and undefined if not.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| + [grant](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_grant )                                                           | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_grantPrincipal )                                         | No      | object          | No         | Same as [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal )                                                                                                 | The principal this Lambda Function is running as                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| + [hashMixins](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_hashMixins )                                                 | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [isBoundToVpc](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_isBoundToVpc )                                             | No      | boolean         | No         | -                                                                                                                                                                                                                        | Whether or not this Lambda function was bound to a VPC<br /><br />If this is is \`false\`, trying to access the \`connections\` object will fail.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [isPrincipalWithConditions](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_isPrincipalWithConditions )                   | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [isQueue](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_isQueue )                                                       | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [latestVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_latestVersion )                                           | No      | object          | No         | Same as [latestVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion )                                                                                            | The \`$LATEST\` version of this function.<br /><br />Note that this is reference to a non-specific AWS Lambda version, which<br />means the function this version refers to can return different results in<br />different invocations.<br /><br />To obtain a reference to an explicit version which references the current<br />function configuration, use \`lambdaFunction.currentVersion\` instead.                                                                                                                                                                                                           |
| + [logGroup](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_logGroup )                                                     | No      | object          | No         | In #/definitions/ILogGroup                                                                                                                                                                                               | The LogGroup where the Lambda function's logs are made available.<br /><br />If either \`logRetention\` is set or this property is called, a CloudFormation custom resource is added to the stack that<br />pre-creates the log group as part of the stack deployment, if it already doesn't exist, and sets the correct log retention<br />period (never expire, by default).<br /><br />Further, if the log group already exists and the \`logRetention\` is not set, the custom resource will reset the log retention<br />to never expire even if it was configured with a different value.                    |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_node )                                                             | No      | object          | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )                                                                                                  | The tree node.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| + [parsePermissionPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_parsePermissionPrincipal )                     | No      | object          | No         | -                                                                                                                                                                                                                        | Translate IPrincipal to something we can pass to AWS::Lambda::Permissions<br /><br />Do some nasty things because \`Permission\` supports a subset of what the<br />full IAM principal language supports, and we may not be able to parse strings<br />outright because they may be tokens.<br /><br />Try to recognize some specific Principal classes first, then try a generic<br />fallback.                                                                                                                                                                                                                   |
| + [permissionsNode](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_permissionsNode )                                       | No      | object          | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )                                                                                                  | The construct node where permissions are attached.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| + [physicalName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_physicalName )                                             | No      | string          | No         | -                                                                                                                                                                                                                        | Returns a string-encoded token that resolves to the physical name that<br />should be passed to the CloudFormation resource.<br /><br />This value will resolve to one of the following:<br />- a concrete value (e.g. \`"my-awesome-bucket"\`)<br />- \`undefined\`, when a name should be generated by CloudFormation<br />- a concrete name generated automatically during synthesis, in<br />  cross-environment scenarios.                                                                                                                                                                                    |
| + [renderEnvironment](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_renderEnvironment )                                   | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [renderLayers](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_renderLayers )                                             | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [resourceArnsForGrantInvoke](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_resourceArnsForGrantInvoke )                 | No      | array of string | No         | -                                                                                                                                                                                                                        | The ARN(s) to put into the resource field of the generated IAM policy for grantInvoke()                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| - [role](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_role )                                                             | No      | object          | No         | Same as [role](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role )                                                                                                | Execution role associated with this function                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| + [runtime](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_runtime )                                                       | No      | object          | No         | Same as [sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items ) | The runtime configured for this lambda.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_stack )                                                           | No      | object          | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack )                                                                                                | The stack in which this resource is defined.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| + [statementHasArrayTokens](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_statementHasArrayTokens )                       | No      | object          | No         | -                                                                                                                                                                                                                        | Check if a policy statement contains array tokens that would cause CloudFormation<br />resolution conflicts when mixed with literal arrays in the same policy document.<br /><br />Array tokens are created by CloudFormation intrinsic functions that return arrays,<br />such as Fn::Split, Fn::GetAZs, etc. These cannot be safely merged with literal<br />resource arrays due to CloudFormation's token resolution limitations.<br /><br />Individual string tokens within literal arrays (e.g., \`["arn:${token}:..."]\`) are<br />safe and do not cause conflicts, so they are not detected by this method. |
| - [timeout](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_timeout )                                                       | No      | object          | No         | In #/definitions/Duration                                                                                                                                                                                                | The timeout configured for this lambda.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| + [validateConditionCombinations](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_validateConditionCombinations )           | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [validateConditions](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_validateConditions )                                 | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [validateProfiling](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_validateProfiling )                                   | No      | object          | No         | -                                                                                                                                                                                                                        | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__allowCrossEnvironment"></a>4.6.7.4.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _allowCrossEnvironment`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__architecture"></a>4.6.7.4.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _architecture`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections"></a>4.6.7.4.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections`

|                           |                           |
| ------------------------- | ------------------------- |
| **Type**                  | `object`                  |
| **Required**              | No                        |
| **Additional properties** | Not allowed               |
| **Defined in**            | #/definitions/Connections |

**Description:** Actual connections object for this Lambda

May be unset, in which case this Lambda is not configured use in a VPC.

| Property                                                                                                                   | Pattern | Type   | Deprecated | Definition                                                                                            | Title/Description                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [_securityGroupRules](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections__securityGroupRules ) | No      | object | No         | -                                                                                                     | The rule that defines how to represent this peer in a security group                                                                                                                                  |
| + [_securityGroups](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections__securityGroups )         | No      | object | No         | -                                                                                                     | Underlying securityGroup for this Connections object, if present<br /><br />May be empty if this Connections object is not managing a SecurityGroup,<br />but simply representing a Connectable peer. |
| + [connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_connections )                 | No      | object | No         | Same as [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections ) | The network connections associated with this resource.                                                                                                                                                |
| - [defaultPort](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_defaultPort )                 | No      | object | No         | In #/definitions/Port                                                                                 | The default port configured for this connection peer, if available                                                                                                                                    |
| + [remoteRule](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_remoteRule )                   | No      | object | No         | -                                                                                                     | When doing bidirectional grants between Security Groups in different stacks, put the rule on the other SG                                                                                             |
| + [securityGroups](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups )           | No      | array  | No         | -                                                                                                     | -                                                                                                                                                                                                     |
| + [skip](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_skip )                               | No      | object | No         | -                                                                                                     | When doing bidirectional grants between Connections, make sure we don't recursive infinitely                                                                                                          |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections__securityGroupRules"></a>4.6.7.4.3.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > _securityGroupRules`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** The rule that defines how to represent this peer in a security group

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections__securityGroups"></a>4.6.7.4.3.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > _securityGroups`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Underlying securityGroup for this Connections object, if present

May be empty if this Connections object is not managing a SecurityGroup,
but simply representing a Connectable peer.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_connections"></a>4.6.7.4.3.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > connections`

|                           |                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                     |
| **Required**              | Yes                                                                                          |
| **Additional properties** | Not allowed                                                                                  |
| **Same definition as**    | [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections) |

**Description:** The network connections associated with this resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_defaultPort"></a>4.6.7.4.3.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > defaultPort`

|                           |                    |
| ------------------------- | ------------------ |
| **Type**                  | `object`           |
| **Required**              | No                 |
| **Additional properties** | Not allowed        |
| **Defined in**            | #/definitions/Port |

**Description:** The default port configured for this connection peer, if available

| Property                                                                                                                   | Pattern | Type    | Deprecated | Definition | Title/Description                                                                       |
| -------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | --------------------------------------------------------------------------------------- |
| + [canInlineRule](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_defaultPort_canInlineRule ) | No      | boolean | No         | -          | Whether the rule containing this port range can be inlined into a securitygroup or not. |
| + [props](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_defaultPort_props )                 | No      | object  | No         | -          | -                                                                                       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_defaultPort_canInlineRule"></a>4.6.7.4.3.4.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > defaultPort > canInlineRule`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether the rule containing this port range can be inlined into a securitygroup or not.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_defaultPort_props"></a>4.6.7.4.3.4.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > defaultPort > props`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_remoteRule"></a>4.6.7.4.3.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > remoteRule`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** When doing bidirectional grants between Security Groups in different stacks, put the rule on the other SG

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups"></a>4.6.7.4.3.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups`

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

| Each item of this array must be                                                                                     | Description                               |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [ISecurityGroup](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items) | Interface for security group-like objects |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items"></a>4.6.7.4.3.6.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > ISecurityGroup

|                           |                              |
| ------------------------- | ---------------------------- |
| **Type**                  | `object`                     |
| **Required**              | No                           |
| **Additional properties** | Not allowed                  |
| **Defined in**            | #/definitions/ISecurityGroup |

**Description:** Interface for security group-like objects

| Property                                                                                                                                  | Pattern | Type    | Deprecated | Definition                                                                                            | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [allowAllOutbound](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_allowAllOutbound ) | No      | boolean | No         | -                                                                                                     | Whether the SecurityGroup has been configured to allow all outbound traffic                                                                                                                                                                                                                                                                                                                                                                                            |
| + [canInlineRule](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_canInlineRule )       | No      | boolean | No         | -                                                                                                     | Whether the rule can be inlined into a SecurityGroup or not                                                                                                                                                                                                                                                                                                                                                                                                            |
| + [connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_connections )           | No      | object  | No         | Same as [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections ) | The network connections associated with this resource.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| + [env](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_env )                           | No      | object  | No         | Same as [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env )                                   | The environment this resource belongs to.<br />For resources that are created and managed by the CDK<br />(generally, those created by creating new class instances like Role, Bucket, etc.),<br />this is always the same as the environment of the stack they belong to;<br />however, for imported resources<br />(those obtained from static methods like fromRoleArn, fromBucketName, etc.),<br />that might be different than the stack they were imported into. |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )                         | No      | object  | No         | In #/definitions/Node                                                                                 | The tree node.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [securityGroupId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_securityGroupId )   | No      | string  | No         | -                                                                                                     | ID for the current security group                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| + [securityGroupRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_securityGroupRef ) | No      | object  | No         | In #/definitions/SecurityGroupReference                                                               | A reference to a SecurityGroup resource.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack )                       | No      | object  | No         | In #/definitions/Stack                                                                                | The stack in which this resource is defined.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| + [uniqueId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_uniqueId )                 | No      | string  | No         | -                                                                                                     | A unique identifier for this connection peer                                                                                                                                                                                                                                                                                                                                                                                                                           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_allowAllOutbound"></a>4.6.7.4.3.6.1.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > allowAllOutbound`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether the SecurityGroup has been configured to allow all outbound traffic

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_canInlineRule"></a>4.6.7.4.3.6.1.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > canInlineRule`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether the rule can be inlined into a SecurityGroup or not

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_connections"></a>4.6.7.4.3.6.1.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > connections`

|                           |                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                     |
| **Required**              | Yes                                                                                          |
| **Additional properties** | Not allowed                                                                                  |
| **Same definition as**    | [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections) |

**Description:** The network connections associated with this resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_env"></a>4.6.7.4.3.6.1.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > env`

|                           |                                                            |
| ------------------------- | ---------------------------------------------------------- |
| **Type**                  | `object`                                                   |
| **Required**              | Yes                                                        |
| **Additional properties** | Not allowed                                                |
| **Same definition as**    | [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env) |

**Description:** The environment this resource belongs to.
For resources that are created and managed by the CDK
(generally, those created by creating new class instances like Role, Bucket, etc.),
this is always the same as the environment of the stack they belong to;
however, for imported resources
(those obtained from static methods like fromRoleArn, fromBucketName, etc.),
that might be different than the stack they were imported into.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node"></a>4.6.7.4.3.6.1.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node`

|                           |                    |
| ------------------------- | ------------------ |
| **Type**                  | `object`           |
| **Required**              | Yes                |
| **Additional properties** | Not allowed        |
| **Defined in**            | #/definitions/Node |

**Description:** The tree node.

| Property                                                                                                                                 | Pattern | Type    | Deprecated | Definition                                                                                                                                                                                                                                             | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [_addr](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__addr )                 | No      | object  | No         | -                                                                                                                                                                                                                                                      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [_children](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__children )         | No      | object  | No         | -                                                                                                                                                                                                                                                      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [_context](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__context )           | No      | object  | No         | -                                                                                                                                                                                                                                                      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [_defaultChild](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__defaultChild ) | No      | object  | No         | -                                                                                                                                                                                                                                                      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [_dependencies](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__dependencies ) | No      | object  | No         | -                                                                                                                                                                                                                                                      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [_locked](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__locked )             | No      | object  | No         | -                                                                                                                                                                                                                                                      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [_metadata](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__metadata )         | No      | object  | No         | -                                                                                                                                                                                                                                                      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [_validations](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__validations )   | No      | object  | No         | -                                                                                                                                                                                                                                                      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [addChild](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_addChild )           | No      | object  | No         | -                                                                                                                                                                                                                                                      | Adds a child construct to this node.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| + [addr](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_addr )                   | No      | string  | No         | -                                                                                                                                                                                                                                                      | Returns an opaque tree-unique address for this construct.<br /><br />Addresses are 42 characters hexadecimal strings. They begin with "c8"<br />followed by 40 lowercase hexadecimal characters (0-9a-f).<br /><br />Addresses are calculated using a SHA-1 of the components of the construct<br />path.<br /><br />To enable refactorings of construct trees, constructs with the ID \`Default\`<br />will be excluded from the calculation. In those cases constructs in the<br />same tree may have the same addreess.                                                                                |
| + [children](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children )           | No      | array   | No         | -                                                                                                                                                                                                                                                      | All direct children of this construct.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| - [defaultChild](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_defaultChild )   | No      | object  | No         | Same as [sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items ) | Returns the child construct that has the id \`Default\` or \`Resource"\`.<br />This is usually the construct that provides the bulk of the underlying functionality.<br />Useful for modifications of the underlying construct that are not available at the higher levels.<br />Override the defaultChild property.<br /><br />This should only be used in the cases where the correct<br />default child is not named 'Resource' or 'Default' as it<br />should be.<br /><br />If you set this to undefined, the default behavior of finding<br />the child named 'Resource' or 'Default' will be used. |
| + [dependencies](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_dependencies )   | No      | array   | No         | -                                                                                                                                                                                                                                                      | Return all dependencies registered on this node (non-recursive).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [host](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_host )                   | No      | object  | No         | -                                                                                                                                                                                                                                                      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [id](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_id )                       | No      | string  | No         | -                                                                                                                                                                                                                                                      | The id of this construct within the current scope.<br /><br />This is a a scope-unique id. To obtain an app-unique id for this construct, use \`addr\`.                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| + [locked](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_locked )               | No      | boolean | No         | -                                                                                                                                                                                                                                                      | Returns true if this construct or the scopes in which it is defined are<br />locked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| + [metadata](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_metadata )           | No      | array   | No         | -                                                                                                                                                                                                                                                      | An immutable array of metadata objects associated with this construct.<br />This can be used, for example, to implement support for deprecation notices, source mapping, etc.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| + [path](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_path )                   | No      | string  | No         | -                                                                                                                                                                                                                                                      | The full, absolute path of this construct in the tree.<br /><br />Components are separated by '/'.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| + [root](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_root )                   | No      | object  | No         | Same as [sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items ) | Returns the root of the construct tree.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| - [scope](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_scope )                 | No      | object  | No         | Same as [sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items ) | Returns the scope in which this construct is defined.<br /><br />The value is \`undefined\` at the root of the construct scope tree.                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| + [scopes](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_scopes )               | No      | array   | No         | -                                                                                                                                                                                                                                                      | All parent scopes of this construct.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__addr"></a>4.6.7.4.3.6.1.5.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > _addr`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__children"></a>4.6.7.4.3.6.1.5.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > _children`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__context"></a>4.6.7.4.3.6.1.5.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > _context`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__defaultChild"></a>4.6.7.4.3.6.1.5.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > _defaultChild`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__dependencies"></a>4.6.7.4.3.6.1.5.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > _dependencies`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__locked"></a>4.6.7.4.3.6.1.5.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > _locked`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__metadata"></a>4.6.7.4.3.6.1.5.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > _metadata`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node__validations"></a>4.6.7.4.3.6.1.5.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > _validations`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_addChild"></a>4.6.7.4.3.6.1.5.9. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > addChild`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Adds a child construct to this node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_addr"></a>4.6.7.4.3.6.1.5.10. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > addr`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Returns an opaque tree-unique address for this construct.

Addresses are 42 characters hexadecimal strings. They begin with "c8"
followed by 40 lowercase hexadecimal characters (0-9a-f).

Addresses are calculated using a SHA-1 of the components of the construct
path.

To enable refactorings of construct trees, constructs with the ID `Default`
will be excluded from the calculation. In those cases constructs in the
same tree may have the same addreess.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children"></a>4.6.7.4.3.6.1.5.11. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > children`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** All direct children of this construct.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                     | Description             |
| ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| [IConstruct](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items) | Represents a construct. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items"></a>4.6.7.4.3.6.1.5.11.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > children > IConstruct

|                           |                          |
| ------------------------- | ------------------------ |
| **Type**                  | `object`                 |
| **Required**              | No                       |
| **Additional properties** | Not allowed              |
| **Defined in**            | #/definitions/IConstruct |

**Description:** Represents a construct.

| Property                                                                                                                              | Pattern | Type   | Deprecated | Definition                                                                                                              | Title/Description |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------- |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items_node ) | No      | object | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node ) | The tree node.    |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items_node"></a>4.6.7.4.3.6.1.5.11.1.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > children > children items > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_defaultChild"></a>4.6.7.4.3.6.1.5.12. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > defaultChild`

|                           |                                                                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                                      |
| **Required**              | No                                                                                                                                                                                                                                            |
| **Additional properties** | Not allowed                                                                                                                                                                                                                                   |
| **Same definition as**    | [sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items) |

**Description:** Returns the child construct that has the id `Default` or `Resource"`.
This is usually the construct that provides the bulk of the underlying functionality.
Useful for modifications of the underlying construct that are not available at the higher levels.
Override the defaultChild property.

This should only be used in the cases where the correct
default child is not named 'Resource' or 'Default' as it
should be.

If you set this to undefined, the default behavior of finding
the child named 'Resource' or 'Default' will be used.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_dependencies"></a>4.6.7.4.3.6.1.5.13. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > dependencies`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** Return all dependencies registered on this node (non-recursive).

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                         | Description             |
| --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| [IConstruct](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_dependencies_items) | Represents a construct. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_dependencies_items"></a>4.6.7.4.3.6.1.5.13.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > dependencies > IConstruct

|                           |                                                                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                                      |
| **Required**              | No                                                                                                                                                                                                                                            |
| **Additional properties** | Not allowed                                                                                                                                                                                                                                   |
| **Same definition as**    | [sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items) |

**Description:** Represents a construct.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_host"></a>4.6.7.4.3.6.1.5.14. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > host`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_id"></a>4.6.7.4.3.6.1.5.15. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The id of this construct within the current scope.

This is a a scope-unique id. To obtain an app-unique id for this construct, use `addr`.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_locked"></a>4.6.7.4.3.6.1.5.16. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > locked`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Returns true if this construct or the scopes in which it is defined are
locked.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_metadata"></a>4.6.7.4.3.6.1.5.17. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > metadata`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** An immutable array of metadata objects associated with this construct.
This can be used, for example, to implement support for deprecation notices, source mapping, etc.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                        | Description                               |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| [MetadataEntry](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_metadata_items) | An entry in the construct metadata table. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_metadata_items"></a>4.6.7.4.3.6.1.5.17.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > metadata > MetadataEntry

|                           |                             |
| ------------------------- | --------------------------- |
| **Type**                  | `object`                    |
| **Required**              | No                          |
| **Additional properties** | Not allowed                 |
| **Defined in**            | #/definitions/MetadataEntry |

**Description:** An entry in the construct metadata table.

| Property                                                                                                                                | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| + [data](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_metadata_items_data )   | No      | object          | No         | -          | The data.                                                                                                                            |
| - [trace](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_metadata_items_trace ) | No      | array of string | No         | -          | Stack trace at the point of adding the metadata.<br /><br />Only available if \`addMetadata()\` is called with \`stackTrace: true\`. |
| + [type](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_metadata_items_type )   | No      | string          | No         | -          | The metadata entry type.                                                                                                             |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_metadata_items_data"></a>4.6.7.4.3.6.1.5.17.1.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > metadata > metadata items > data`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** The data.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_metadata_items_trace"></a>4.6.7.4.3.6.1.5.17.1.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > metadata > metadata items > trace`

|              |                            |
| ------------ | -------------------------- |
| **Type**     | `array of string`          |
| **Required** | No                         |
| **Default**  | `"- no trace information"` |

**Description:** Stack trace at the point of adding the metadata.

Only available if `addMetadata()` is called with `stackTrace: true`.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                  | Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [trace items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_metadata_items_trace_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_metadata_items_trace_items"></a>4.6.7.4.3.6.1.5.17.1.2.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > metadata > metadata items > trace > trace items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_metadata_items_type"></a>4.6.7.4.3.6.1.5.17.1.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > metadata > metadata items > type`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The metadata entry type.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_path"></a>4.6.7.4.3.6.1.5.18. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The full, absolute path of this construct in the tree.

Components are separated by '/'.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_root"></a>4.6.7.4.3.6.1.5.19. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > root`

|                           |                                                                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                                      |
| **Required**              | Yes                                                                                                                                                                                                                                           |
| **Additional properties** | Not allowed                                                                                                                                                                                                                                   |
| **Same definition as**    | [sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items) |

**Description:** Returns the root of the construct tree.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_scope"></a>4.6.7.4.3.6.1.5.20. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > scope`

|                           |                                                                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                                      |
| **Required**              | No                                                                                                                                                                                                                                            |
| **Additional properties** | Not allowed                                                                                                                                                                                                                                   |
| **Same definition as**    | [sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items) |

**Description:** Returns the scope in which this construct is defined.

The value is `undefined` at the root of the construct scope tree.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_scopes"></a>4.6.7.4.3.6.1.5.21. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > scopes`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** All parent scopes of this construct.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                   | Description             |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| [IConstruct](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_scopes_items) | Represents a construct. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_scopes_items"></a>4.6.7.4.3.6.1.5.21.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > node > scopes > IConstruct

|                           |                                                                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                                      |
| **Required**              | No                                                                                                                                                                                                                                            |
| **Additional properties** | Not allowed                                                                                                                                                                                                                                   |
| **Same definition as**    | [sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node_children_items) |

**Description:** Represents a construct.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_securityGroupId"></a>4.6.7.4.3.6.1.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > securityGroupId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** ID for the current security group

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_securityGroupRef"></a>4.6.7.4.3.6.1.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > securityGroupRef`

|                           |                                      |
| ------------------------- | ------------------------------------ |
| **Type**                  | `object`                             |
| **Required**              | Yes                                  |
| **Additional properties** | Not allowed                          |
| **Defined in**            | #/definitions/SecurityGroupReference |

**Description:** A reference to a SecurityGroup resource.

| Property                                                                                                                                                 | Pattern | Type   | Deprecated | Definition | Title/Description                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------- |
| + [securityGroupId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_securityGroupRef_securityGroupId ) | No      | string | No         | -          | The Id of the SecurityGroup resource. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_securityGroupRef_securityGroupId"></a>4.6.7.4.3.6.1.7.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > securityGroupRef > securityGroupId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The Id of the SecurityGroup resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack"></a>4.6.7.4.3.6.1.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack`

|                           |                     |
| ------------------------- | ------------------- |
| **Type**                  | `object`            |
| **Required**              | Yes                 |
| **Additional properties** | Not allowed         |
| **Defined in**            | #/definitions/Stack |

**Description:** The stack in which this resource is defined.

| Property                                                                                                                                                                | Pattern | Type            | Deprecated | Definition                                                                                                                | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [_crossRegionReferences](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__crossRegionReferences )             | No      | boolean         | No         | -                                                                                                                         | Whether cross region references are enabled for this stack                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| + [_logicalIds](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__logicalIds )                                   | No      | object          | No         | -                                                                                                                         | Logical ID generation strategy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| + [_missingContext](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__missingContext )                           | No      | object          | No         | -                                                                                                                         | Lists all missing contextual information.<br />This is returned when the stack is synthesized under the 'missing' attribute<br />and allows tooling to obtain the context and re-synthesize.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| - [_notificationArns](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__notificationArns )                       | No      | array of string | No         | -                                                                                                                         | SNS Notification ARNs to receive stack events.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| + [_stackDependencies](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__stackDependencies )                     | No      | object          | No         | -                                                                                                                         | Other stacks this stack depends on                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| + [_stackName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__stackName )                                     | No      | object          | No         | -                                                                                                                         | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| + [_suppressTemplateIndentation](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__suppressTemplateIndentation ) | No      | object          | No         | -                                                                                                                         | Enable this flag to suppress indentation in generated<br />CloudFormation templates.<br /><br />If not specified, the value of the \`@aws-cdk/core:suppressTemplateIndentation\`<br />context key will be used. If that is not specified, then the<br />default value \`false\` will be used.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| + [_terminationProtection](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__terminationProtection )             | No      | object          | No         | -                                                                                                                         | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| + [_versionReportingEnabled](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__versionReportingEnabled )         | No      | boolean         | No         | -                                                                                                                         | Whether version reporting is enabled for this stack<br /><br />Controls whether the CDK Metadata resource is injected                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| + [account](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_account )                                           | No      | string          | No         | -                                                                                                                         | The AWS account into which this stack will be deployed.<br /><br />This value is resolved according to the following rules:<br /><br />1. The value provided to \`env.account\` when the stack is defined. This can<br />   either be a concrete account (e.g. \`585695031111\`) or the<br />   \`Aws.ACCOUNT_ID\` token.<br />3. \`Aws.ACCOUNT_ID\`, which represents the CloudFormation intrinsic reference<br />   \`{ "Ref": "AWS::AccountId" }\` encoded as a string token.<br /><br />Preferably, you should use the return value as an opaque string and not<br />attempt to parse it to implement your logic. If you do, you must first<br />check that it is a concrete value an not an unresolved token. If this<br />value is an unresolved token (\`Token.isUnresolved(stack.account)\` returns<br />\`true\`), this implies that the user wishes that this stack will synthesize<br />into an **account-agnostic template**. In this case, your code should either<br />fail (throw an error, emit a synth error using \`Annotations.of(construct).addError()\`) or<br />implement some other account-agnostic behavior.    |
| + [addPermissionsBoundaryAspect](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_addPermissionsBoundaryAspect ) | No      | object          | No         | -                                                                                                                         | Adds an aspect to the stack that will apply the permissions boundary.<br />This will only add the aspect if the permissions boundary has been set                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| + [artifactId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_artifactId )                                     | No      | string          | No         | -                                                                                                                         | The ID of the cloud assembly artifact for this stack.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| + [availabilityZones](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_availabilityZones )                       | No      | array of string | No         | -                                                                                                                         | Returns the list of AZs that are available in the AWS environment<br />(account/region) associated with this stack.<br /><br />If the stack is environment-agnostic (either account and/or region are<br />tokens), this property will return an array with 2 tokens that will resolve<br />at deploy-time to the first two availability zones returned from CloudFormation's<br />\`Fn::GetAZs\` intrinsic function.<br /><br />If they are not available in the context, returns a set of dummy values and<br />reports them as missing, and let the CLI resolve them by calling EC2<br />\`DescribeAvailabilityZones\` on the target environment.<br /><br />To specify a different strategy for selecting availability zones override this method.                                                                                                                                                                                                                                                                                                                                                                                   |
| + [bundlingRequired](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_bundlingRequired )                         | No      | boolean         | No         | -                                                                                                                         | Indicates whether the stack requires bundling or not                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| + [dependencies](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_dependencies )                                 | No      | array           | No         | -                                                                                                                         | Return the stacks this stack depends on                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [environment](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_environment )                                   | No      | string          | No         | -                                                                                                                         | The environment coordinates in which this stack is deployed. In the form<br />\`aws://account/region\`. Use \`stack.account\` and \`stack.region\` to obtain<br />the specific values, no need to parse.<br /><br />You can use this value to determine if two stacks are targeting the same<br />environment.<br /><br />If either \`stack.account\` or \`stack.region\` are not concrete values (e.g.<br />\`Aws.ACCOUNT_ID\` or \`Aws.REGION\`) the special strings \`unknown-account\` and/or<br />\`unknown-region\` will be used respectively to indicate this stack is<br />region/account-agnostic.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| + [generateStackArtifactId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_generateStackArtifactId )           | No      | object          | No         | -                                                                                                                         | The artifact ID for this stack<br /><br />Stack artifact ID is unique within the App's Cloud Assembly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| + [generateStackId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_generateStackId )                           | No      | object          | No         | -                                                                                                                         | Generate an ID with respect to the given container construct.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| + [generateStackName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_generateStackName )                       | No      | object          | No         | -                                                                                                                         | Calculate the stack name based on the construct path<br /><br />The stack name is the name under which we'll deploy the stack,<br />and incorporates containing Stage names by default.<br /><br />Generally this looks a lot like how logical IDs are calculated.<br />The stack name is calculated based on the construct root path,<br />as follows:<br /><br />- Path is calculated with respect to containing App or Stage (if any)<br />- If the path is one component long just use that component, otherwise<br />  combine them with a hash.<br /><br />Since the hash is quite ugly and we'd like to avoid it if possible -- but<br />we can't anymore in the general case since it has been written into legacy<br />stacks. The introduction of Stages makes it possible to make this nicer however.<br />When a Stack is nested inside a Stage, we use the path components below the<br />Stage, and prefix the path components of the Stage before it.                                                                                                                                                                     |
| + [maxResources](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_maxResources )                                 | No      | object          | No         | -                                                                                                                         | Maximum number of resources in the stack<br /><br />Set to 0 to mean "unlimited".                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| + [nested](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nested )                                             | No      | boolean         | No         | -                                                                                                                         | Indicates if this is a nested stack, in which case \`parentStack\` will include a reference to it's parent.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| - [nestedStackParent](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackParent )                       | No      | object          | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack ) | If this is a nested stack, returns it's parent stack.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| - [nestedStackResource](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource )                   | No      | object          | No         | In #/definitions/CfnResource                                                                                              | If this is a nested stack, this represents its \`AWS::CloudFormation::Stack\`<br />resource. \`undefined\` for top-level (non-nested) stacks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_node )                                                 | No      | object          | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )   | The tree node.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| + [notificationArns](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_notificationArns )                         | No      | array of string | No         | -                                                                                                                         | Returns the list of notification Amazon Resource Names (ARNs) for the current stack.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| + [parseEnvironment](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_parseEnvironment )                         | No      | object          | No         | -                                                                                                                         | Determine the various stack environment attributes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| + [partition](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_partition )                                       | No      | string          | No         | -                                                                                                                         | The partition in which this stack is defined                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| + [permissionsBoundaryArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_permissionsBoundaryArn )             | No      | object          | No         | -                                                                                                                         | If a permissions boundary has been applied on this scope or any parent scope<br />then this will return the ARN of the permissions boundary.<br /><br />This will return the permissions boundary that has been applied to the most<br />specific scope.<br /><br />For example:<br /><br />const stage = new Stage(app, 'stage', {<br />  permissionsBoundary: PermissionsBoundary.fromName('stage-pb'),<br />});<br /><br />const stack = new Stack(stage, 'Stack', {<br />  permissionsBoundary: PermissionsBoundary.fromName('some-other-pb'),<br />});<br /><br /> Stack.permissionsBoundaryArn === 'arn:${AWS::Partition}:iam::${AWS::AccountId}:policy/some-other-pb';                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| + [region](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_region )                                             | No      | string          | No         | -                                                                                                                         | The AWS region into which this stack will be deployed (e.g. \`us-west-2\`).<br /><br />This value is resolved according to the following rules:<br /><br />1. The value provided to \`env.region\` when the stack is defined. This can<br />   either be a concrete region (e.g. \`us-west-2\`) or the \`Aws.REGION\`<br />   token.<br />3. \`Aws.REGION\`, which is represents the CloudFormation intrinsic reference<br />   \`{ "Ref": "AWS::Region" }\` encoded as a string token.<br /><br />Preferably, you should use the return value as an opaque string and not<br />attempt to parse it to implement your logic. If you do, you must first<br />check that it is a concrete value an not an unresolved token. If this<br />value is an unresolved token (\`Token.isUnresolved(stack.region)\` returns<br />\`true\`), this implies that the user wishes that this stack will synthesize<br />into a **region-agnostic template**. In this case, your code should either<br />fail (throw an error, emit a synth error using \`Annotations.of(construct).addError()\`) or<br />implement some other region-agnostic behavior. |
| + [resolveExportedValue](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_resolveExportedValue )                 | No      | object          | No         | -                                                                                                                         | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| + [stackDependencyReasons](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_stackDependencyReasons )             | No      | object          | No         | -                                                                                                                         | Check whether this stack has a (transitive) dependency on another stack<br /><br />Returns the list of reasons on the dependency path, or undefined<br />if there is no dependency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| + [stackId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_stackId )                                           | No      | string          | No         | -                                                                                                                         | The ID of the stack                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| + [stackName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_stackName )                                       | No      | string          | No         | -                                                                                                                         | The concrete CloudFormation physical stack name.<br /><br />This is either the name defined explicitly in the \`stackName\` prop or<br />allocated based on the stack's location in the construct tree. Stacks that<br />are directly defined under the app use their construct \`id\` as their stack<br />name. Stacks that are defined deeper within the tree will use a hashed naming<br />scheme based on the construct path to ensure uniqueness.<br /><br />If you wish to obtain the deploy-time AWS::StackName intrinsic,<br />you can use \`Aws.STACK_NAME\` directly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [synthesizer](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_synthesizer )                                   | No      | object          | No         | In #/definitions/IStackSynthesizer                                                                                        | Synthesis method for this stack                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [tags](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags )                                                 | No      | object          | No         | In #/definitions/TagManager                                                                                               | Tags to be applied to the stack.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [templateFile](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateFile )                                 | No      | string          | No         | -                                                                                                                         | The name of the CloudFormation template file emitted to the output<br />directory during synthesis.<br /><br />Example value: \`MyStack.template.json\`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [templateOptions](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions )                           | No      | object          | No         | In #/definitions/ITemplateOptions                                                                                         | Options for CloudFormation template (like version, transform, description).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| + [terminationProtection](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_terminationProtection )               | No      | boolean         | No         | -                                                                                                                         | Whether termination protection is enabled for this stack.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| + [urlSuffix](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_urlSuffix )                                       | No      | string          | No         | -                                                                                                                         | The Amazon domain suffix for the region in which this stack is defined                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__crossRegionReferences"></a>4.6.7.4.3.6.1.8.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > _crossRegionReferences`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether cross region references are enabled for this stack

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__logicalIds"></a>4.6.7.4.3.6.1.8.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > _logicalIds`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Logical ID generation strategy

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__missingContext"></a>4.6.7.4.3.6.1.8.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > _missingContext`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Lists all missing contextual information.
This is returned when the stack is synthesized under the 'missing' attribute
and allows tooling to obtain the context and re-synthesize.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__notificationArns"></a>4.6.7.4.3.6.1.8.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > _notificationArns`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** SNS Notification ARNs to receive stack events.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                            | Description |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [_notificationArns items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__notificationArns_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__notificationArns_items"></a>4.6.7.4.3.6.1.8.4.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > _notificationArns > _notificationArns items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__stackDependencies"></a>4.6.7.4.3.6.1.8.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > _stackDependencies`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Other stacks this stack depends on

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__stackName"></a>4.6.7.4.3.6.1.8.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > _stackName`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__suppressTemplateIndentation"></a>4.6.7.4.3.6.1.8.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > _suppressTemplateIndentation`

|                           |                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                       |
| **Required**              | Yes                                                                                            |
| **Additional properties** | Any type allowed                                                                               |
| **Default**               | `"- the value of `@aws-cdk/core:suppressTemplateIndentation`, or `false` if that is not set."` |

**Description:** Enable this flag to suppress indentation in generated
CloudFormation templates.

If not specified, the value of the `@aws-cdk/core:suppressTemplateIndentation`
context key will be used. If that is not specified, then the
default value `false` will be used.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__terminationProtection"></a>4.6.7.4.3.6.1.8.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > _terminationProtection`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack__versionReportingEnabled"></a>4.6.7.4.3.6.1.8.9. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > _versionReportingEnabled`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether version reporting is enabled for this stack

Controls whether the CDK Metadata resource is injected

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_account"></a>4.6.7.4.3.6.1.8.10. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > account`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The AWS account into which this stack will be deployed.

This value is resolved according to the following rules:

1. The value provided to `env.account` when the stack is defined. This can
   either be a concrete account (e.g. `585695031111`) or the
   `Aws.ACCOUNT_ID` token.
3. `Aws.ACCOUNT_ID`, which represents the CloudFormation intrinsic reference
   `{ "Ref": "AWS::AccountId" }` encoded as a string token.

Preferably, you should use the return value as an opaque string and not
attempt to parse it to implement your logic. If you do, you must first
check that it is a concrete value an not an unresolved token. If this
value is an unresolved token (`Token.isUnresolved(stack.account)` returns
`true`), this implies that the user wishes that this stack will synthesize
into an **account-agnostic template**. In this case, your code should either
fail (throw an error, emit a synth error using `Annotations.of(construct).addError()`) or
implement some other account-agnostic behavior.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_addPermissionsBoundaryAspect"></a>4.6.7.4.3.6.1.8.11. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > addPermissionsBoundaryAspect`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Adds an aspect to the stack that will apply the permissions boundary.
This will only add the aspect if the permissions boundary has been set

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_artifactId"></a>4.6.7.4.3.6.1.8.12. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > artifactId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ID of the cloud assembly artifact for this stack.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_availabilityZones"></a>4.6.7.4.3.6.1.8.13. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > availabilityZones`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** Returns the list of AZs that are available in the AWS environment
(account/region) associated with this stack.

If the stack is environment-agnostic (either account and/or region are
tokens), this property will return an array with 2 tokens that will resolve
at deploy-time to the first two availability zones returned from CloudFormation's
`Fn::GetAZs` intrinsic function.

If they are not available in the context, returns a set of dummy values and
reports them as missing, and let the CLI resolve them by calling EC2
`DescribeAvailabilityZones` on the target environment.

To specify a different strategy for selecting availability zones override this method.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                            | Description |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [availabilityZones items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_availabilityZones_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_availabilityZones_items"></a>4.6.7.4.3.6.1.8.13.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > availabilityZones > availabilityZones items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_bundlingRequired"></a>4.6.7.4.3.6.1.8.14. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > bundlingRequired`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Indicates whether the stack requires bundling or not

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_dependencies"></a>4.6.7.4.3.6.1.8.15. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > dependencies`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** Return the stacks this stack depends on

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                     | Description                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [Stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_dependencies_items) | A root construct which represents a single CloudFormation stack. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_dependencies_items"></a>4.6.7.4.3.6.1.8.15.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > dependencies > Stack

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | No                                                                                                               |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** A root construct which represents a single CloudFormation stack.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_environment"></a>4.6.7.4.3.6.1.8.16. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > environment`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The environment coordinates in which this stack is deployed. In the form
`aws://account/region`. Use `stack.account` and `stack.region` to obtain
the specific values, no need to parse.

You can use this value to determine if two stacks are targeting the same
environment.

If either `stack.account` or `stack.region` are not concrete values (e.g.
`Aws.ACCOUNT_ID` or `Aws.REGION`) the special strings `unknown-account` and/or
`unknown-region` will be used respectively to indicate this stack is
region/account-agnostic.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_generateStackArtifactId"></a>4.6.7.4.3.6.1.8.17. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > generateStackArtifactId`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** The artifact ID for this stack

Stack artifact ID is unique within the App's Cloud Assembly.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_generateStackId"></a>4.6.7.4.3.6.1.8.18. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > generateStackId`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Generate an ID with respect to the given container construct.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_generateStackName"></a>4.6.7.4.3.6.1.8.19. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > generateStackName`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Calculate the stack name based on the construct path

The stack name is the name under which we'll deploy the stack,
and incorporates containing Stage names by default.

Generally this looks a lot like how logical IDs are calculated.
The stack name is calculated based on the construct root path,
as follows:

- Path is calculated with respect to containing App or Stage (if any)
- If the path is one component long just use that component, otherwise
  combine them with a hash.

Since the hash is quite ugly and we'd like to avoid it if possible -- but
we can't anymore in the general case since it has been written into legacy
stacks. The introduction of Stages makes it possible to make this nicer however.
When a Stack is nested inside a Stage, we use the path components below the
Stage, and prefix the path components of the Stage before it.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_maxResources"></a>4.6.7.4.3.6.1.8.20. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > maxResources`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Maximum number of resources in the stack

Set to 0 to mean "unlimited".

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nested"></a>4.6.7.4.3.6.1.8.21. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nested`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Indicates if this is a nested stack, in which case `parentStack` will include a reference to it's parent.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackParent"></a>4.6.7.4.3.6.1.8.22. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackParent`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | No                                                                                                               |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** If this is a nested stack, returns it's parent stack.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource"></a>4.6.7.4.3.6.1.8.23. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource`

|                           |                           |
| ------------------------- | ------------------------- |
| **Type**                  | `object`                  |
| **Required**              | No                        |
| **Additional properties** | Not allowed               |
| **Defined in**            | #/definitions/CfnResource |

**Description:** If this is a nested stack, this represents its `AWS::CloudFormation::Stack`
resource. `undefined` for top-level (non-nested) stacks.

| Property                                                                                                                                                                  | Pattern | Type            | Deprecated | Definition                                                                                                                | Title/Description                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| + [_cfnProperties](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource__cfnProperties )           | No      | object          | No         | -                                                                                                                         | AWS CloudFormation resource properties.<br /><br />This object is returned via cfnProperties                                                                                                                                                                             |
| - [_logicalIdLocked](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource__logicalIdLocked )       | No      | object          | No         | -                                                                                                                         | If the logicalId is locked then it can no longer be overridden.<br />This is needed for cases where the logicalId is consumed prior to synthesis<br />(i.e. Stack.exportValue).                                                                                          |
| - [_logicalIdOverride](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource__logicalIdOverride )   | No      | object          | No         | -                                                                                                                         | An explicit logical ID provided by \`overrideLogicalId\`.                                                                                                                                                                                                                |
| + [cfnOptions](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions )                   | No      | object          | No         | In #/definitions/ICfnResourceOptions                                                                                      | Options for this resource, such as condition, update policy etc.                                                                                                                                                                                                         |
| + [cfnProperties](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnProperties )             | No      | object          | No         | -                                                                                                                         | -                                                                                                                                                                                                                                                                        |
| + [cfnResourceType](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnResourceType )         | No      | string          | No         | -                                                                                                                         | AWS resource type.                                                                                                                                                                                                                                                       |
| + [creationStack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_creationStack )             | No      | array of string | No         | -                                                                                                                         | -                                                                                                                                                                                                                                                                        |
| + [dependsOn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_dependsOn )                     | No      | object          | No         | -                                                                                                                         | Logical IDs of dependencies.<br /><br />Is filled during prepare().                                                                                                                                                                                                      |
| + [logicalId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_logicalId )                     | No      | string          | No         | -                                                                                                                         | The logical ID for this CloudFormation stack element. The logical ID of the element<br />is calculated from the path of the resource node in the construct tree.<br /><br />To override this value, use \`overrideLogicalId(newLogicalId)\`.                             |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_node )                               | No      | object          | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )   | The tree node.                                                                                                                                                                                                                                                           |
| + [rawOverrides](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_rawOverrides )               | No      | object          | No         | -                                                                                                                         | An object to be merged on top of the entire resource definition.                                                                                                                                                                                                         |
| + [ref](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_ref )                                 | No      | string          | No         | -                                                                                                                         | Return a string that will be resolved to a CloudFormation \`{ Ref }\` for this element.<br /><br />If, by any chance, the intrinsic reference of a resource is not a string, you could<br />coerce it to an IResolvable through \`Lazy.any({ produce: resource.ref })\`. |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_stack )                             | No      | object          | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack ) | The stack in which this element is defined. CfnElements must be defined within a stack scope (directly or indirectly).                                                                                                                                                   |
| + [synthesizeLogicalId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_synthesizeLogicalId ) | No      | object          | No         | -                                                                                                                         | Called during synthesize to render the logical ID of this element. If<br />\`overrideLogicalId\` was it will be used, otherwise, we will allocate the<br />logical ID through the stack.                                                                                 |
| + [updatedProperites](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_updatedProperites )     | No      | object          | No         | -                                                                                                                         | Deprecated                                                                                                                                                                                                                                                               |
| + [updatedProperties](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_updatedProperties )     | No      | object          | No         | -                                                                                                                         | Return properties modified after initiation<br /><br />Resources that expose mutable properties should override this function to<br />collect and return the properties object for this resource.                                                                        |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource__cfnProperties"></a>4.6.7.4.3.6.1.8.23.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > _cfnProperties`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** AWS CloudFormation resource properties.

This object is returned via cfnProperties

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource__logicalIdLocked"></a>4.6.7.4.3.6.1.8.23.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > _logicalIdLocked`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

**Description:** If the logicalId is locked then it can no longer be overridden.
This is needed for cases where the logicalId is consumed prior to synthesis
(i.e. Stack.exportValue).

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource__logicalIdOverride"></a>4.6.7.4.3.6.1.8.23.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > _logicalIdOverride`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

**Description:** An explicit logical ID provided by `overrideLogicalId`.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions"></a>4.6.7.4.3.6.1.8.23.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions`

|                           |                                   |
| ------------------------- | --------------------------------- |
| **Type**                  | `object`                          |
| **Required**              | Yes                               |
| **Additional properties** | Not allowed                       |
| **Defined in**            | #/definitions/ICfnResourceOptions |

**Description:** Options for this resource, such as condition, update policy etc.

| Property                                                                                                                                                                             | Pattern | Type             | Deprecated | Definition                         | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ---------------- | ---------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [condition](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition )                     | No      | object           | No         | In #/definitions/CfnCondition      | A condition to associate with this resource. This means that only if the condition evaluates to 'true' when the stack<br />is deployed, the resource will be included. This is provided to allow CDK projects to produce legacy templates, but normally<br />there is no need to use it in CDK projects.                                                                                                                                |
| - [creationPolicy](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_creationPolicy )           | No      | object           | No         | In #/definitions/CfnCreationPolicy | Associate the CreationPolicy attribute with a resource to prevent its status from reaching create complete until<br />AWS CloudFormation receives a specified number of success signals or the timeout period is exceeded. To signal a<br />resource, you can use the cfn-signal helper script or SignalResource API. AWS CloudFormation publishes valid signals<br />to the stack events so that you track the number of signals sent. |
| - [deletionPolicy](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_deletionPolicy )           | No      | enum (of string) | No         | -                                  | With the DeletionPolicy attribute you can preserve or (in some cases) backup a resource when its stack is deleted.<br />You specify a DeletionPolicy attribute for each resource that you want to control. If a resource has no DeletionPolicy<br />attribute, AWS CloudFormation deletes the resource by default. Note that this capability also applies to update operations<br />that lead to resources being removed.               |
| - [description](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_description )                 | No      | string           | No         | -                                  | The description of this resource.<br />Used for informational purposes only, is not processed in any way<br />(and stays with the CloudFormation template, is not passed to the underlying resource,<br />even if it does have a 'description' property).                                                                                                                                                                               |
| - [metadata](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_metadata )                       | No      | object           | No         | -                                  | Metadata associated with the CloudFormation resource. This is not the same as the construct metadata which can be added<br />using construct.addMetadata(), but would not appear in the CloudFormation template automatically.                                                                                                                                                                                                          |
| - [updatePolicy](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy )               | No      | object           | No         | In #/definitions/CfnUpdatePolicy   | Use the UpdatePolicy attribute to specify how AWS CloudFormation handles updates to the AWS::AutoScaling::AutoScalingGroup<br />resource. AWS CloudFormation invokes one of three update policies depending on the type of change you make or whether a<br />scheduled action is associated with the Auto Scaling group.                                                                                                                |
| - [updateReplacePolicy](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updateReplacePolicy ) | No      | enum (of string) | No         | -                                  | Use the UpdateReplacePolicy attribute to retain or (in some cases) backup the existing physical instance of a resource<br />when it is replaced during a stack update operation.                                                                                                                                                                                                                                                        |
| - [version](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_version )                         | No      | string           | No         | -                                  | The version of this resource.<br />Used only for custom CloudFormation resources.                                                                                                                                                                                                                                                                                                                                                       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition"></a>4.6.7.4.3.6.1.8.23.4.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > condition`

|                           |                            |
| ------------------------- | -------------------------- |
| **Type**                  | `object`                   |
| **Required**              | No                         |
| **Additional properties** | Not allowed                |
| **Defined in**            | #/definitions/CfnCondition |

**Description:** A condition to associate with this resource. This means that only if the condition evaluates to 'true' when the stack
is deployed, the resource will be included. This is provided to allow CDK projects to produce legacy templates, but normally
there is no need to use it in CDK projects.

| Property                                                                                                                                                                                       | Pattern | Type            | Deprecated | Definition                                                                                                                | Title/Description                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [_logicalIdLocked](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition__logicalIdLocked )       | No      | object          | No         | -                                                                                                                         | If the logicalId is locked then it can no longer be overridden.<br />This is needed for cases where the logicalId is consumed prior to synthesis<br />(i.e. Stack.exportValue).                                                              |
| - [_logicalIdOverride](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition__logicalIdOverride )   | No      | object          | No         | -                                                                                                                         | An explicit logical ID provided by \`overrideLogicalId\`.                                                                                                                                                                                    |
| + [creationStack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_creationStack )             | No      | array of string | No         | -                                                                                                                         | -                                                                                                                                                                                                                                            |
| - [expression](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_expression )                   | No      | object          | No         | In #/definitions/ICfnConditionExpression                                                                                  | The condition statement.                                                                                                                                                                                                                     |
| + [logicalId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_logicalId )                     | No      | string          | No         | -                                                                                                                         | The logical ID for this CloudFormation stack element. The logical ID of the element<br />is calculated from the path of the resource node in the construct tree.<br /><br />To override this value, use \`overrideLogicalId(newLogicalId)\`. |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_node )                               | No      | object          | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )   | The tree node.                                                                                                                                                                                                                               |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_stack )                             | No      | object          | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack ) | The stack in which this element is defined. CfnElements must be defined within a stack scope (directly or indirectly).                                                                                                                       |
| + [synthesizeLogicalId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_synthesizeLogicalId ) | No      | object          | No         | -                                                                                                                         | Called during synthesize to render the logical ID of this element. If<br />\`overrideLogicalId\` was it will be used, otherwise, we will allocate the<br />logical ID through the stack.                                                     |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition__logicalIdLocked"></a>4.6.7.4.3.6.1.8.23.4.1.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > condition > _logicalIdLocked`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

**Description:** If the logicalId is locked then it can no longer be overridden.
This is needed for cases where the logicalId is consumed prior to synthesis
(i.e. Stack.exportValue).

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition__logicalIdOverride"></a>4.6.7.4.3.6.1.8.23.4.1.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > condition > _logicalIdOverride`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

**Description:** An explicit logical ID provided by `overrideLogicalId`.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_creationStack"></a>4.6.7.4.3.6.1.8.23.4.1.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > condition > creationStack`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                                                             | Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [creationStack items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_creationStack_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_creationStack_items"></a>4.6.7.4.3.6.1.8.23.4.1.3.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > condition > creationStack > creationStack items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_expression"></a>4.6.7.4.3.6.1.8.23.4.1.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > condition > expression`

|                           |                                       |
| ------------------------- | ------------------------------------- |
| **Type**                  | `object`                              |
| **Required**              | No                                    |
| **Additional properties** | Not allowed                           |
| **Defined in**            | #/definitions/ICfnConditionExpression |

**Description:** The condition statement.

| Property                                                                                                                                                                                      | Pattern | Type             | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [creationStack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_expression_creationStack ) | No      | array of string  | No         | -          | The creation stack of this resolvable which will be appended to errors<br />thrown during resolution.<br /><br />This may return an array with a single informational element indicating how<br />to get this property populated, if it was skipped for performance reasons. |
| - [typeHint](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_expression_typeHint )           | No      | enum (of string) | No         | -          | The type that this token will likely resolve to.                                                                                                                                                                                                                             |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_expression_creationStack"></a>4.6.7.4.3.6.1.8.23.4.1.4.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > condition > expression > creationStack`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The creation stack of this resolvable which will be appended to errors
thrown during resolution.

This may return an array with a single informational element indicating how
to get this property populated, if it was skipped for performance reasons.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                                                                        | Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [creationStack items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_expression_creationStack_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_expression_creationStack_items"></a>4.6.7.4.3.6.1.8.23.4.1.4.1.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > condition > expression > creationStack > creationStack items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_expression_typeHint"></a>4.6.7.4.3.6.1.8.23.4.1.4.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > condition > expression > typeHint`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

**Description:** The type that this token will likely resolve to.

Must be one of:
* "number"
* "string"
* "string-list"

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_logicalId"></a>4.6.7.4.3.6.1.8.23.4.1.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > condition > logicalId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The logical ID for this CloudFormation stack element. The logical ID of the element
is calculated from the path of the resource node in the construct tree.

To override this value, use `overrideLogicalId(newLogicalId)`.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_node"></a>4.6.7.4.3.6.1.8.23.4.1.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > condition > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_stack"></a>4.6.7.4.3.6.1.8.23.4.1.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > condition > stack`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | Yes                                                                                                              |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** The stack in which this element is defined. CfnElements must be defined within a stack scope (directly or indirectly).

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_condition_synthesizeLogicalId"></a>4.6.7.4.3.6.1.8.23.4.1.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > condition > synthesizeLogicalId`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Called during synthesize to render the logical ID of this element. If
`overrideLogicalId` was it will be used, otherwise, we will allocate the
logical ID through the stack.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_creationPolicy"></a>4.6.7.4.3.6.1.8.23.4.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > creationPolicy`

|                           |                                 |
| ------------------------- | ------------------------------- |
| **Type**                  | `object`                        |
| **Required**              | No                              |
| **Additional properties** | Not allowed                     |
| **Defined in**            | #/definitions/CfnCreationPolicy |

**Description:** Associate the CreationPolicy attribute with a resource to prevent its status from reaching create complete until
AWS CloudFormation receives a specified number of success signals or the timeout period is exceeded. To signal a
resource, you can use the cfn-signal helper script or SignalResource API. AWS CloudFormation publishes valid signals
to the stack events so that you track the number of signals sent.

| Property                                                                                                                                                                                                        | Pattern | Type    | Deprecated | Definition                                            | Title/Description                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [autoScalingCreationPolicy](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_creationPolicy_autoScalingCreationPolicy ) | No      | object  | No         | In #/definitions/CfnResourceAutoScalingCreationPolicy | For an Auto Scaling group replacement update, specifies how many instances must signal success for the<br />update to succeed.                                                          |
| - [resourceSignal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_creationPolicy_resourceSignal )                       | No      | object  | No         | In #/definitions/CfnResourceSignal                    | When AWS CloudFormation creates the associated resource, configures the number of required success signals and<br />the length of time that AWS CloudFormation waits for those signals. |
| - [startFleet](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_creationPolicy_startFleet )                               | No      | boolean | No         | -                                                     | For an AppStream Fleet creation, specifies that the fleet is started after creation.                                                                                                    |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_creationPolicy_autoScalingCreationPolicy"></a>4.6.7.4.3.6.1.8.23.4.2.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > creationPolicy > autoScalingCreationPolicy`

|                           |                                                    |
| ------------------------- | -------------------------------------------------- |
| **Type**                  | `object`                                           |
| **Required**              | No                                                 |
| **Additional properties** | Not allowed                                        |
| **Defined in**            | #/definitions/CfnResourceAutoScalingCreationPolicy |

**Description:** For an Auto Scaling group replacement update, specifies how many instances must signal success for the
update to succeed.

| Property                                                                                                                                                                                                                                          | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [minSuccessfulInstancesPercent](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_creationPolicy_autoScalingCreationPolicy_minSuccessfulInstancesPercent ) | No      | number | No         | -          | Specifies the percentage of instances in an Auto Scaling replacement update that must signal success for the<br />update to succeed. You can specify a value from 0 to 100. AWS CloudFormation rounds to the nearest tenth of a percent.<br />For example, if you update five instances with a minimum successful percentage of 50, three instances must signal success.<br />If an instance doesn't send a signal within the time specified by the Timeout property, AWS CloudFormation assumes that the<br />instance wasn't created. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_creationPolicy_autoScalingCreationPolicy_minSuccessfulInstancesPercent"></a>4.6.7.4.3.6.1.8.23.4.2.1.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > creationPolicy > autoScalingCreationPolicy > minSuccessfulInstancesPercent`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Specifies the percentage of instances in an Auto Scaling replacement update that must signal success for the
update to succeed. You can specify a value from 0 to 100. AWS CloudFormation rounds to the nearest tenth of a percent.
For example, if you update five instances with a minimum successful percentage of 50, three instances must signal success.
If an instance doesn't send a signal within the time specified by the Timeout property, AWS CloudFormation assumes that the
instance wasn't created.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_creationPolicy_resourceSignal"></a>4.6.7.4.3.6.1.8.23.4.2.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > creationPolicy > resourceSignal`

|                           |                                 |
| ------------------------- | ------------------------------- |
| **Type**                  | `object`                        |
| **Required**              | No                              |
| **Additional properties** | Not allowed                     |
| **Defined in**            | #/definitions/CfnResourceSignal |

**Description:** When AWS CloudFormation creates the associated resource, configures the number of required success signals and
the length of time that AWS CloudFormation waits for those signals.

| Property                                                                                                                                                                                   | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [count](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_creationPolicy_resourceSignal_count )     | No      | number | No         | -          | The number of success signals AWS CloudFormation must receive before it sets the resource status as CREATE_COMPLETE.<br />If the resource receives a failure signal or doesn't receive the specified number of signals before the timeout period<br />expires, the resource creation fails and AWS CloudFormation rolls the stack back.                          |
| - [timeout](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_creationPolicy_resourceSignal_timeout ) | No      | string | No         | -          | The length of time that AWS CloudFormation waits for the number of signals that was specified in the Count property.<br />The timeout period starts after AWS CloudFormation starts creating the resource, and the timeout expires no sooner<br />than the time you specify but can occur shortly thereafter. The maximum time that you can specify is 12 hours. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_creationPolicy_resourceSignal_count"></a>4.6.7.4.3.6.1.8.23.4.2.2.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > creationPolicy > resourceSignal > count`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The number of success signals AWS CloudFormation must receive before it sets the resource status as CREATE_COMPLETE.
If the resource receives a failure signal or doesn't receive the specified number of signals before the timeout period
expires, the resource creation fails and AWS CloudFormation rolls the stack back.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_creationPolicy_resourceSignal_timeout"></a>4.6.7.4.3.6.1.8.23.4.2.2.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > creationPolicy > resourceSignal > timeout`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The length of time that AWS CloudFormation waits for the number of signals that was specified in the Count property.
The timeout period starts after AWS CloudFormation starts creating the resource, and the timeout expires no sooner
than the time you specify but can occur shortly thereafter. The maximum time that you can specify is 12 hours.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_creationPolicy_startFleet"></a>4.6.7.4.3.6.1.8.23.4.2.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > creationPolicy > startFleet`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** For an AppStream Fleet creation, specifies that the fleet is started after creation.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_deletionPolicy"></a>4.6.7.4.3.6.1.8.23.4.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > deletionPolicy`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

**Description:** With the DeletionPolicy attribute you can preserve or (in some cases) backup a resource when its stack is deleted.
You specify a DeletionPolicy attribute for each resource that you want to control. If a resource has no DeletionPolicy
attribute, AWS CloudFormation deletes the resource by default. Note that this capability also applies to update operations
that lead to resources being removed.

Must be one of:
* "Delete"
* "Retain"
* "RetainExceptOnCreate"
* "Snapshot"

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_description"></a>4.6.7.4.3.6.1.8.23.4.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The description of this resource.
Used for informational purposes only, is not processed in any way
(and stays with the CloudFormation template, is not passed to the underlying resource,
even if it does have a 'description' property).

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_metadata"></a>4.6.7.4.3.6.1.8.23.4.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > metadata`

|                           |                                                                                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                    |
| **Required**              | No                                                                                                                                                                                                                          |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_metadata_additionalProperties) |

**Description:** Metadata associated with the CloudFormation resource. This is not the same as the construct metadata which can be added
using construct.addMetadata(), but would not appear in the CloudFormation template automatically.

| Property                                                                                                                                                                    | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_metadata_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_metadata_additionalProperties"></a>4.6.7.4.3.6.1.8.23.4.5.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > metadata > additionalProperties`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy"></a>4.6.7.4.3.6.1.8.23.4.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy`

|                           |                               |
| ------------------------- | ----------------------------- |
| **Type**                  | `object`                      |
| **Required**              | No                            |
| **Additional properties** | Not allowed                   |
| **Defined in**            | #/definitions/CfnUpdatePolicy |

**Description:** Use the UpdatePolicy attribute to specify how AWS CloudFormation handles updates to the AWS::AutoScaling::AutoScalingGroup
resource. AWS CloudFormation invokes one of three update policies depending on the type of change you make or whether a
scheduled action is associated with the Auto Scaling group.

| Property                                                                                                                                                                                                          | Pattern | Type    | Deprecated | Definition                                      | Title/Description                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [autoScalingReplacingUpdate](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingReplacingUpdate )   | No      | object  | No         | In #/definitions/CfnAutoScalingReplacingUpdate  | Specifies whether an Auto Scaling group and the instances it contains are replaced during an update. During replacement,<br />AWS CloudFormation retains the old group until it finishes creating the new one. If the update fails, AWS CloudFormation<br />can roll back to the old Auto Scaling group and delete the new Auto Scaling group. |
| - [autoScalingRollingUpdate](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate )       | No      | object  | No         | In #/definitions/CfnAutoScalingRollingUpdate    | To specify how AWS CloudFormation handles rolling updates for an Auto Scaling group, use the AutoScalingRollingUpdate<br />policy. Rolling updates enable you to specify whether AWS CloudFormation updates instances that are in an Auto Scaling<br />group in batches or all at once.                                                        |
| - [autoScalingScheduledAction](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingScheduledAction )   | No      | object  | No         | In #/definitions/CfnAutoScalingScheduledAction  | To specify how AWS CloudFormation handles updates for the MinSize, MaxSize, and DesiredCapacity properties when<br />the AWS::AutoScaling::AutoScalingGroup resource has an associated scheduled action, use the AutoScalingScheduledAction<br />policy.                                                                                       |
| - [codeDeployLambdaAliasUpdate](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_codeDeployLambdaAliasUpdate ) | No      | object  | No         | In #/definitions/CfnCodeDeployLambdaAliasUpdate | To perform an AWS CodeDeploy deployment when the version changes on an AWS::Lambda::Alias resource,<br />use the CodeDeployLambdaAliasUpdate update policy.                                                                                                                                                                                    |
| - [enableVersionUpgrade](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_enableVersionUpgrade )               | No      | boolean | No         | -                                               | To upgrade an Amazon ES domain to a new version of Elasticsearch rather than replacing the entire<br />AWS::Elasticsearch::Domain resource, use the EnableVersionUpgrade update policy.                                                                                                                                                        |
| - [useOnlineResharding](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_useOnlineResharding )                 | No      | boolean | No         | -                                               | To modify a replication group's shards by adding or removing shards, rather than replacing the entire<br />AWS::ElastiCache::ReplicationGroup resource, use the UseOnlineResharding update policy.                                                                                                                                             |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingReplacingUpdate"></a>4.6.7.4.3.6.1.8.23.4.6.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > autoScalingReplacingUpdate`

|                           |                                             |
| ------------------------- | ------------------------------------------- |
| **Type**                  | `object`                                    |
| **Required**              | No                                          |
| **Additional properties** | Not allowed                                 |
| **Defined in**            | #/definitions/CfnAutoScalingReplacingUpdate |

**Description:** Specifies whether an Auto Scaling group and the instances it contains are replaced during an update. During replacement,
AWS CloudFormation retains the old group until it finishes creating the new one. If the update fails, AWS CloudFormation
can roll back to the old Auto Scaling group and delete the new Auto Scaling group.

| Property                                                                                                                                                                                                     | Pattern | Type    | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------- | ---------- | ---------- | ----------------- |
| - [willReplace](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingReplacingUpdate_willReplace ) | No      | boolean | No         | -          | -                 |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingReplacingUpdate_willReplace"></a>4.6.7.4.3.6.1.8.23.4.6.1.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > autoScalingReplacingUpdate > willReplace`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate"></a>4.6.7.4.3.6.1.8.23.4.6.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > autoScalingRollingUpdate`

|                           |                                           |
| ------------------------- | ----------------------------------------- |
| **Type**                  | `object`                                  |
| **Required**              | No                                        |
| **Additional properties** | Not allowed                               |
| **Defined in**            | #/definitions/CfnAutoScalingRollingUpdate |

**Description:** To specify how AWS CloudFormation handles rolling updates for an Auto Scaling group, use the AutoScalingRollingUpdate
policy. Rolling updates enable you to specify whether AWS CloudFormation updates instances that are in an Auto Scaling
group in batches or all at once.

| Property                                                                                                                                                                                                                                       | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [maxBatchSize](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_maxBatchSize )                                   | No      | number          | No         | -          | Specifies the maximum number of instances that AWS CloudFormation updates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| - [minActiveInstancesPercent](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_minActiveInstancesPercent )         | No      | number          | No         | -          | Specifies the percentage of instances in an Auto Scaling group that must remain in service while AWS CloudFormation<br />updates old instances. You can specify a value from 0 to 100. AWS CloudFormation rounds to the nearest tenth of a percent.<br />For example, if you update five instances with a minimum active percentage of 50, three instances must remain in service.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| - [minInstancesInService](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_minInstancesInService )                 | No      | number          | No         | -          | Specifies the minimum number of instances that must be in service within the Auto Scaling group while AWS<br />CloudFormation updates old instances.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| - [minSuccessfulInstancesPercent](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_minSuccessfulInstancesPercent ) | No      | number          | No         | -          | Specifies the percentage of instances in an Auto Scaling rolling update that must signal success for an update to succeed.<br />You can specify a value from 0 to 100. AWS CloudFormation rounds to the nearest tenth of a percent. For example, if you<br />update five instances with a minimum successful percentage of 50, three instances must signal success.<br /><br />If an instance doesn't send a signal within the time specified in the PauseTime property, AWS CloudFormation assumes<br />that the instance wasn't updated.<br /><br />If you specify this property, you must also enable the WaitOnResourceSignals and PauseTime properties.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [pauseTime](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_pauseTime )                                         | No      | string          | No         | -          | The amount of time that AWS CloudFormation pauses after making a change to a batch of instances to give those instances<br />time to start software applications. For example, you might need to specify PauseTime when scaling up the number of<br />instances in an Auto Scaling group.<br /><br />If you enable the WaitOnResourceSignals property, PauseTime is the amount of time that AWS CloudFormation should wait<br />for the Auto Scaling group to receive the required number of valid signals from added or replaced instances. If the<br />PauseTime is exceeded before the Auto Scaling group receives the required number of signals, the update fails. For best<br />results, specify a time period that gives your applications sufficient time to get started. If the update needs to be<br />rolled back, a short PauseTime can cause the rollback to fail.<br /><br />Specify PauseTime in the ISO8601 duration format (in the format PT#H#M#S, where each # is the number of hours, minutes,<br />and seconds, respectively). The maximum PauseTime is one hour (PT1H). |
| - [suspendProcesses](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_suspendProcesses )                           | No      | array of string | No         | -          | Specifies the Auto Scaling processes to suspend during a stack update. Suspending processes prevents Auto Scaling from<br />interfering with a stack update. For example, you can suspend alarming so that Auto Scaling doesn't execute scaling<br />policies associated with an alarm. For valid values, see the ScalingProcesses.member.N parameter for the SuspendProcesses<br />action in the Auto Scaling API Reference.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| - [waitOnResourceSignals](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_waitOnResourceSignals )                 | No      | boolean         | No         | -          | Specifies whether the Auto Scaling group waits on signals from new instances during an update. Use this property to<br />ensure that instances have completed installing and configuring applications before the Auto Scaling group update proceeds.<br />AWS CloudFormation suspends the update of an Auto Scaling group after new EC2 instances are launched into the group.<br />AWS CloudFormation must receive a signal from each new instance within the specified PauseTime before continuing the update.<br />To signal the Auto Scaling group, use the cfn-signal helper script or SignalResource API.<br /><br />To have instances wait for an Elastic Load Balancing health check before they signal success, add a health-check<br />verification by using the cfn-init helper script. For an example, see the verify_instance_health command in the Auto Scaling<br />rolling updates sample template.                                                                                                                                                                           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_maxBatchSize"></a>4.6.7.4.3.6.1.8.23.4.6.2.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > autoScalingRollingUpdate > maxBatchSize`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Specifies the maximum number of instances that AWS CloudFormation updates.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_minActiveInstancesPercent"></a>4.6.7.4.3.6.1.8.23.4.6.2.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > autoScalingRollingUpdate > minActiveInstancesPercent`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Specifies the percentage of instances in an Auto Scaling group that must remain in service while AWS CloudFormation
updates old instances. You can specify a value from 0 to 100. AWS CloudFormation rounds to the nearest tenth of a percent.
For example, if you update five instances with a minimum active percentage of 50, three instances must remain in service.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_minInstancesInService"></a>4.6.7.4.3.6.1.8.23.4.6.2.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > autoScalingRollingUpdate > minInstancesInService`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Specifies the minimum number of instances that must be in service within the Auto Scaling group while AWS
CloudFormation updates old instances.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_minSuccessfulInstancesPercent"></a>4.6.7.4.3.6.1.8.23.4.6.2.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > autoScalingRollingUpdate > minSuccessfulInstancesPercent`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Specifies the percentage of instances in an Auto Scaling rolling update that must signal success for an update to succeed.
You can specify a value from 0 to 100. AWS CloudFormation rounds to the nearest tenth of a percent. For example, if you
update five instances with a minimum successful percentage of 50, three instances must signal success.

If an instance doesn't send a signal within the time specified in the PauseTime property, AWS CloudFormation assumes
that the instance wasn't updated.

If you specify this property, you must also enable the WaitOnResourceSignals and PauseTime properties.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_pauseTime"></a>4.6.7.4.3.6.1.8.23.4.6.2.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > autoScalingRollingUpdate > pauseTime`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The amount of time that AWS CloudFormation pauses after making a change to a batch of instances to give those instances
time to start software applications. For example, you might need to specify PauseTime when scaling up the number of
instances in an Auto Scaling group.

If you enable the WaitOnResourceSignals property, PauseTime is the amount of time that AWS CloudFormation should wait
for the Auto Scaling group to receive the required number of valid signals from added or replaced instances. If the
PauseTime is exceeded before the Auto Scaling group receives the required number of signals, the update fails. For best
results, specify a time period that gives your applications sufficient time to get started. If the update needs to be
rolled back, a short PauseTime can cause the rollback to fail.

Specify PauseTime in the ISO8601 duration format (in the format PT#H#M#S, where each # is the number of hours, minutes,
and seconds, respectively). The maximum PauseTime is one hour (PT1H).

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_suspendProcesses"></a>4.6.7.4.3.6.1.8.23.4.6.2.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > autoScalingRollingUpdate > suspendProcesses`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Specifies the Auto Scaling processes to suspend during a stack update. Suspending processes prevents Auto Scaling from
interfering with a stack update. For example, you can suspend alarming so that Auto Scaling doesn't execute scaling
policies associated with an alarm. For valid values, see the ScalingProcesses.member.N parameter for the SuspendProcesses
action in the Auto Scaling API Reference.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                                                                                               | Description |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [suspendProcesses items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_suspendProcesses_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_suspendProcesses_items"></a>4.6.7.4.3.6.1.8.23.4.6.2.6.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > autoScalingRollingUpdate > suspendProcesses > suspendProcesses items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingRollingUpdate_waitOnResourceSignals"></a>4.6.7.4.3.6.1.8.23.4.6.2.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > autoScalingRollingUpdate > waitOnResourceSignals`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Specifies whether the Auto Scaling group waits on signals from new instances during an update. Use this property to
ensure that instances have completed installing and configuring applications before the Auto Scaling group update proceeds.
AWS CloudFormation suspends the update of an Auto Scaling group after new EC2 instances are launched into the group.
AWS CloudFormation must receive a signal from each new instance within the specified PauseTime before continuing the update.
To signal the Auto Scaling group, use the cfn-signal helper script or SignalResource API.

To have instances wait for an Elastic Load Balancing health check before they signal success, add a health-check
verification by using the cfn-init helper script. For an example, see the verify_instance_health command in the Auto Scaling
rolling updates sample template.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingScheduledAction"></a>4.6.7.4.3.6.1.8.23.4.6.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > autoScalingScheduledAction`

|                           |                                             |
| ------------------------- | ------------------------------------------- |
| **Type**                  | `object`                                    |
| **Required**              | No                                          |
| **Additional properties** | Not allowed                                 |
| **Defined in**            | #/definitions/CfnAutoScalingScheduledAction |

**Description:** To specify how AWS CloudFormation handles updates for the MinSize, MaxSize, and DesiredCapacity properties when
the AWS::AutoScaling::AutoScalingGroup resource has an associated scheduled action, use the AutoScalingScheduledAction
policy.

| Property                                                                                                                                                                                                                                                     | Pattern | Type    | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------- | ---------- | ---------- | ----------------- |
| - [ignoreUnmodifiedGroupSizeProperties](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingScheduledAction_ignoreUnmodifiedGroupSizeProperties ) | No      | boolean | No         | -          | -                 |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_autoScalingScheduledAction_ignoreUnmodifiedGroupSizeProperties"></a>4.6.7.4.3.6.1.8.23.4.6.3.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > autoScalingScheduledAction > ignoreUnmodifiedGroupSizeProperties`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_codeDeployLambdaAliasUpdate"></a>4.6.7.4.3.6.1.8.23.4.6.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > codeDeployLambdaAliasUpdate`

|                           |                                              |
| ------------------------- | -------------------------------------------- |
| **Type**                  | `object`                                     |
| **Required**              | No                                           |
| **Additional properties** | Not allowed                                  |
| **Defined in**            | #/definitions/CfnCodeDeployLambdaAliasUpdate |

**Description:** To perform an AWS CodeDeploy deployment when the version changes on an AWS::Lambda::Alias resource,
use the CodeDeployLambdaAliasUpdate update policy.

| Property                                                                                                                                                                                                                            | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------------------------------------------------------------------------- |
| - [afterAllowTrafficHook](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_codeDeployLambdaAliasUpdate_afterAllowTrafficHook )   | No      | string | No         | -          | The name of the Lambda function to run after traffic routing completes.                            |
| + [applicationName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_codeDeployLambdaAliasUpdate_applicationName )               | No      | string | No         | -          | The name of the AWS CodeDeploy application.                                                        |
| - [beforeAllowTrafficHook](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_codeDeployLambdaAliasUpdate_beforeAllowTrafficHook ) | No      | string | No         | -          | The name of the Lambda function to run before traffic routing starts.                              |
| + [deploymentGroupName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_codeDeployLambdaAliasUpdate_deploymentGroupName )       | No      | string | No         | -          | The name of the AWS CodeDeploy deployment group. This is where the traffic-shifting policy is set. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_codeDeployLambdaAliasUpdate_afterAllowTrafficHook"></a>4.6.7.4.3.6.1.8.23.4.6.4.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > codeDeployLambdaAliasUpdate > afterAllowTrafficHook`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of the Lambda function to run after traffic routing completes.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_codeDeployLambdaAliasUpdate_applicationName"></a>4.6.7.4.3.6.1.8.23.4.6.4.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > codeDeployLambdaAliasUpdate > applicationName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the AWS CodeDeploy application.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_codeDeployLambdaAliasUpdate_beforeAllowTrafficHook"></a>4.6.7.4.3.6.1.8.23.4.6.4.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > codeDeployLambdaAliasUpdate > beforeAllowTrafficHook`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of the Lambda function to run before traffic routing starts.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_codeDeployLambdaAliasUpdate_deploymentGroupName"></a>4.6.7.4.3.6.1.8.23.4.6.4.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > codeDeployLambdaAliasUpdate > deploymentGroupName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the AWS CodeDeploy deployment group. This is where the traffic-shifting policy is set.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_enableVersionUpgrade"></a>4.6.7.4.3.6.1.8.23.4.6.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > enableVersionUpgrade`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** To upgrade an Amazon ES domain to a new version of Elasticsearch rather than replacing the entire
AWS::Elasticsearch::Domain resource, use the EnableVersionUpgrade update policy.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updatePolicy_useOnlineResharding"></a>4.6.7.4.3.6.1.8.23.4.6.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updatePolicy > useOnlineResharding`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** To modify a replication group's shards by adding or removing shards, rather than replacing the entire
AWS::ElastiCache::ReplicationGroup resource, use the UseOnlineResharding update policy.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_updateReplacePolicy"></a>4.6.7.4.3.6.1.8.23.4.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > updateReplacePolicy`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

**Description:** Use the UpdateReplacePolicy attribute to retain or (in some cases) backup the existing physical instance of a resource
when it is replaced during a stack update operation.

Must be one of:
* "Delete"
* "Retain"
* "RetainExceptOnCreate"
* "Snapshot"

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnOptions_version"></a>4.6.7.4.3.6.1.8.23.4.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnOptions > version`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The version of this resource.
Used only for custom CloudFormation resources.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnProperties"></a>4.6.7.4.3.6.1.8.23.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnProperties`

|                           |                                                                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                              |
| **Required**              | Yes                                                                                                                                                                                                                   |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnProperties_additionalProperties) |

| Property                                                                                                                                                              | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnProperties_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnProperties_additionalProperties"></a>4.6.7.4.3.6.1.8.23.5.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnProperties > additionalProperties`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_cfnResourceType"></a>4.6.7.4.3.6.1.8.23.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > cfnResourceType`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** AWS resource type.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_creationStack"></a>4.6.7.4.3.6.1.8.23.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > creationStack`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                                        | Description |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [creationStack items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_creationStack_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_creationStack_items"></a>4.6.7.4.3.6.1.8.23.7.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > creationStack > creationStack items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_dependsOn"></a>4.6.7.4.3.6.1.8.23.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > dependsOn`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Logical IDs of dependencies.

Is filled during prepare().

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_logicalId"></a>4.6.7.4.3.6.1.8.23.9. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > logicalId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The logical ID for this CloudFormation stack element. The logical ID of the element
is calculated from the path of the resource node in the construct tree.

To override this value, use `overrideLogicalId(newLogicalId)`.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_node"></a>4.6.7.4.3.6.1.8.23.10. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_rawOverrides"></a>4.6.7.4.3.6.1.8.23.11. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > rawOverrides`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** An object to be merged on top of the entire resource definition.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_ref"></a>4.6.7.4.3.6.1.8.23.12. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > ref`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Return a string that will be resolved to a CloudFormation `{ Ref }` for this element.

If, by any chance, the intrinsic reference of a resource is not a string, you could
coerce it to an IResolvable through `Lazy.any({ produce: resource.ref })`.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_stack"></a>4.6.7.4.3.6.1.8.23.13. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > stack`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | Yes                                                                                                              |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** The stack in which this element is defined. CfnElements must be defined within a stack scope (directly or indirectly).

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_synthesizeLogicalId"></a>4.6.7.4.3.6.1.8.23.14. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > synthesizeLogicalId`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Called during synthesize to render the logical ID of this element. If
`overrideLogicalId` was it will be used, otherwise, we will allocate the
logical ID through the stack.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_updatedProperites"></a>4.6.7.4.3.6.1.8.23.15. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > updatedProperites`

|                           |                                                                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                  |
| **Required**              | Yes                                                                                                                                                                                                                       |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_updatedProperites_additionalProperties) |

**Description:** Deprecated

| Property                                                                                                                                                                  | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_updatedProperites_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_updatedProperites_additionalProperties"></a>4.6.7.4.3.6.1.8.23.15.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > updatedProperites > additionalProperties`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_updatedProperties"></a>4.6.7.4.3.6.1.8.23.16. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > updatedProperties`

|                           |                                                                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                  |
| **Required**              | Yes                                                                                                                                                                                                                       |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_updatedProperties_additionalProperties) |

**Description:** Return properties modified after initiation

Resources that expose mutable properties should override this function to
collect and return the properties object for this resource.

| Property                                                                                                                                                                  | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_updatedProperties_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_nestedStackResource_updatedProperties_additionalProperties"></a>4.6.7.4.3.6.1.8.23.16.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > nestedStackResource > updatedProperties > additionalProperties`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_node"></a>4.6.7.4.3.6.1.8.24. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_notificationArns"></a>4.6.7.4.3.6.1.8.25. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > notificationArns`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** Returns the list of notification Amazon Resource Names (ARNs) for the current stack.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                          | Description |
| -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [notificationArns items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_notificationArns_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_notificationArns_items"></a>4.6.7.4.3.6.1.8.25.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > notificationArns > notificationArns items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_parseEnvironment"></a>4.6.7.4.3.6.1.8.26. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > parseEnvironment`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Determine the various stack environment attributes.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_partition"></a>4.6.7.4.3.6.1.8.27. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > partition`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The partition in which this stack is defined

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_permissionsBoundaryArn"></a>4.6.7.4.3.6.1.8.28. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > permissionsBoundaryArn`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** If a permissions boundary has been applied on this scope or any parent scope
then this will return the ARN of the permissions boundary.

This will return the permissions boundary that has been applied to the most
specific scope.

For example:

const stage = new Stage(app, 'stage', {
  permissionsBoundary: PermissionsBoundary.fromName('stage-pb'),
});

const stack = new Stack(stage, 'Stack', {
  permissionsBoundary: PermissionsBoundary.fromName('some-other-pb'),
});

 Stack.permissionsBoundaryArn === 'arn:${AWS::Partition}:iam::${AWS::AccountId}:policy/some-other-pb';

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_region"></a>4.6.7.4.3.6.1.8.29. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > region`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The AWS region into which this stack will be deployed (e.g. `us-west-2`).

This value is resolved according to the following rules:

1. The value provided to `env.region` when the stack is defined. This can
   either be a concrete region (e.g. `us-west-2`) or the `Aws.REGION`
   token.
3. `Aws.REGION`, which is represents the CloudFormation intrinsic reference
   `{ "Ref": "AWS::Region" }` encoded as a string token.

Preferably, you should use the return value as an opaque string and not
attempt to parse it to implement your logic. If you do, you must first
check that it is a concrete value an not an unresolved token. If this
value is an unresolved token (`Token.isUnresolved(stack.region)` returns
`true`), this implies that the user wishes that this stack will synthesize
into a **region-agnostic template**. In this case, your code should either
fail (throw an error, emit a synth error using `Annotations.of(construct).addError()`) or
implement some other region-agnostic behavior.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_resolveExportedValue"></a>4.6.7.4.3.6.1.8.30. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > resolveExportedValue`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_stackDependencyReasons"></a>4.6.7.4.3.6.1.8.31. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > stackDependencyReasons`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Check whether this stack has a (transitive) dependency on another stack

Returns the list of reasons on the dependency path, or undefined
if there is no dependency.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_stackId"></a>4.6.7.4.3.6.1.8.32. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > stackId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ID of the stack

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_stackName"></a>4.6.7.4.3.6.1.8.33. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > stackName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The concrete CloudFormation physical stack name.

This is either the name defined explicitly in the `stackName` prop or
allocated based on the stack's location in the construct tree. Stacks that
are directly defined under the app use their construct `id` as their stack
name. Stacks that are defined deeper within the tree will use a hashed naming
scheme based on the construct path to ensure uniqueness.

If you wish to obtain the deploy-time AWS::StackName intrinsic,
you can use `Aws.STACK_NAME` directly.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_synthesizer"></a>4.6.7.4.3.6.1.8.34. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > synthesizer`

|                           |                                 |
| ------------------------- | ------------------------------- |
| **Type**                  | `object`                        |
| **Required**              | Yes                             |
| **Additional properties** | Not allowed                     |
| **Defined in**            | #/definitions/IStackSynthesizer |

**Description:** Synthesis method for this stack

| Property                                                                                                                                                        | Pattern | Type   | Deprecated | Definition | Title/Description                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------------ |
| - [bootstrapQualifier](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_synthesizer_bootstrapQualifier ) | No      | string | No         | -          | The qualifier used to bootstrap this stack |
| - [lookupRole](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_synthesizer_lookupRole )                 | No      | string | No         | -          | The role used to lookup for this stack     |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_synthesizer_bootstrapQualifier"></a>4.6.7.4.3.6.1.8.34.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > synthesizer > bootstrapQualifier`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `string`           |
| **Required** | No                 |
| **Default**  | `"- no qualifier"` |

**Description:** The qualifier used to bootstrap this stack

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_synthesizer_lookupRole"></a>4.6.7.4.3.6.1.8.34.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > synthesizer > lookupRole`

|              |               |
| ------------ | ------------- |
| **Type**     | `string`      |
| **Required** | No            |
| **Default**  | `"- no role"` |

**Description:** The role used to lookup for this stack

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags"></a>4.6.7.4.3.6.1.8.35. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags`

|                           |                          |
| ------------------------- | ------------------------ |
| **Type**                  | `object`                 |
| **Required**              | Yes                      |
| **Additional properties** | Not allowed              |
| **Defined in**            | #/definitions/TagManager |

**Description:** Tags to be applied to the stack.

| Property                                                                                                                                                   | Pattern | Type   | Deprecated | Definition                   | Title/Description                                                                                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| + [_setTag](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags__setTag )                         | No      | object | No         | -                            | -                                                                                                                                                                                                                              |
| + [didHaveInitialTags](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_didHaveInitialTags )   | No      | object | No         | -                            | -                                                                                                                                                                                                                              |
| - [dynamicTags](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_dynamicTags )                 | No      | object | No         | -                            | -                                                                                                                                                                                                                              |
| + [externalTagPriority](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_externalTagPriority ) | No      | object | No         | -                            | -                                                                                                                                                                                                                              |
| + [parseExternalTags](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_parseExternalTags )     | No      | object | No         | -                            | Parse external tags.<br /><br />Set the parseable ones into this tag manager. Save the rest (tokens, lazies) in \`this.dynamicTags\`.                                                                                          |
| + [priorities](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_priorities )                   | No      | object | No         | -                            | -                                                                                                                                                                                                                              |
| + [renderedTags](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_renderedTags )               | No      | object | No         | In #/definitions/IResolvable | A lazy value that represents the rendered tags at synthesis time<br /><br />If you need to make a custom construct taggable, use the value of this<br />property to pass to the \`tags\` property of the underlying construct. |
| + [resourceTypeName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_resourceTypeName )       | No      | object | No         | -                            | -                                                                                                                                                                                                                              |
| + [sortedTags](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_sortedTags )                   | No      | object | No         | -                            | -                                                                                                                                                                                                                              |
| + [tagFormatter](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_tagFormatter )               | No      | object | No         | -                            | -                                                                                                                                                                                                                              |
| + [tagPropertyName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_tagPropertyName )         | No      | string | No         | -                            | The property name for tag values<br /><br />Normally this is \`tags\` but some resources choose a different name. Cognito<br />UserPool uses UserPoolTags                                                                      |
| + [tags](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_tags )                               | No      | object | No         | -                            | -                                                                                                                                                                                                                              |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags__setTag"></a>4.6.7.4.3.6.1.8.35.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > _setTag`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_didHaveInitialTags"></a>4.6.7.4.3.6.1.8.35.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > didHaveInitialTags`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_dynamicTags"></a>4.6.7.4.3.6.1.8.35.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > dynamicTags`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_externalTagPriority"></a>4.6.7.4.3.6.1.8.35.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > externalTagPriority`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_parseExternalTags"></a>4.6.7.4.3.6.1.8.35.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > parseExternalTags`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Parse external tags.

Set the parseable ones into this tag manager. Save the rest (tokens, lazies) in `this.dynamicTags`.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_priorities"></a>4.6.7.4.3.6.1.8.35.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > priorities`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_renderedTags"></a>4.6.7.4.3.6.1.8.35.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > renderedTags`

|                           |                           |
| ------------------------- | ------------------------- |
| **Type**                  | `object`                  |
| **Required**              | Yes                       |
| **Additional properties** | Not allowed               |
| **Defined in**            | #/definitions/IResolvable |

**Description:** A lazy value that represents the rendered tags at synthesis time

If you need to make a custom construct taggable, use the value of this
property to pass to the `tags` property of the underlying construct.

| Property                                                                                                                                                    | Pattern | Type             | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [creationStack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_renderedTags_creationStack ) | No      | array of string  | No         | -          | The creation stack of this resolvable which will be appended to errors<br />thrown during resolution.<br /><br />This may return an array with a single informational element indicating how<br />to get this property populated, if it was skipped for performance reasons. |
| - [typeHint](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_renderedTags_typeHint )           | No      | enum (of string) | No         | -          | The type that this token will likely resolve to.                                                                                                                                                                                                                             |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_renderedTags_creationStack"></a>4.6.7.4.3.6.1.8.35.7.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > renderedTags > creationStack`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The creation stack of this resolvable which will be appended to errors
thrown during resolution.

This may return an array with a single informational element indicating how
to get this property populated, if it was skipped for performance reasons.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                                      | Description |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [creationStack items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_renderedTags_creationStack_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_renderedTags_creationStack_items"></a>4.6.7.4.3.6.1.8.35.7.1.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > renderedTags > creationStack > creationStack items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_renderedTags_typeHint"></a>4.6.7.4.3.6.1.8.35.7.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > renderedTags > typeHint`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

**Description:** The type that this token will likely resolve to.

Must be one of:
* "number"
* "string"
* "string-list"

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_resourceTypeName"></a>4.6.7.4.3.6.1.8.35.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > resourceTypeName`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_sortedTags"></a>4.6.7.4.3.6.1.8.35.9. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > sortedTags`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_tagFormatter"></a>4.6.7.4.3.6.1.8.35.10. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > tagFormatter`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_tagPropertyName"></a>4.6.7.4.3.6.1.8.35.11. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > tagPropertyName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The property name for tag values

Normally this is `tags` but some resources choose a different name. Cognito
UserPool uses UserPoolTags

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_tags_tags"></a>4.6.7.4.3.6.1.8.35.12. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > tags > tags`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateFile"></a>4.6.7.4.3.6.1.8.36. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > templateFile`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the CloudFormation template file emitted to the output
directory during synthesis.

Example value: `MyStack.template.json`

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions"></a>4.6.7.4.3.6.1.8.37. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > templateOptions`

|                           |                                |
| ------------------------- | ------------------------------ |
| **Type**                  | `object`                       |
| **Required**              | Yes                            |
| **Additional properties** | Not allowed                    |
| **Defined in**            | #/definitions/ITemplateOptions |

**Description:** Options for CloudFormation template (like version, transform, description).

| Property                                                                                                                                                                  | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| - [description](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions_description )                     | No      | string          | No         | -          | Gets or sets the description of this stack.<br />If provided, it will be included in the CloudFormation template's "Description" attribute. |
| - [metadata](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions_metadata )                           | No      | object          | No         | -          | Metadata associated with the CloudFormation template.                                                                                       |
| - [templateFormatVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions_templateFormatVersion ) | No      | string          | No         | -          | Gets or sets the AWSTemplateFormatVersion field of the CloudFormation template.                                                             |
| - [transforms](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions_transforms )                       | No      | array of string | No         | -          | Gets or sets the top-level template transform(s) for this stack (e.g. \`["AWS::Serverless-2016-10-31"]\`).                                  |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions_description"></a>4.6.7.4.3.6.1.8.37.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > templateOptions > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Gets or sets the description of this stack.
If provided, it will be included in the CloudFormation template's "Description" attribute.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions_metadata"></a>4.6.7.4.3.6.1.8.37.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > templateOptions > metadata`

|                           |                                                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                                                                     |
| **Required**              | No                                                                                                                                                                                                           |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions_metadata_additionalProperties) |

**Description:** Metadata associated with the CloudFormation template.

| Property                                                                                                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions_metadata_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions_metadata_additionalProperties"></a>4.6.7.4.3.6.1.8.37.2.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > templateOptions > metadata > additionalProperties`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions_templateFormatVersion"></a>4.6.7.4.3.6.1.8.37.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > templateOptions > templateFormatVersion`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Gets or sets the AWSTemplateFormatVersion field of the CloudFormation template.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions_transforms"></a>4.6.7.4.3.6.1.8.37.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > templateOptions > transforms`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Gets or sets the top-level template transform(s) for this stack (e.g. `["AWS::Serverless-2016-10-31"]`).

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                              | Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [transforms items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions_transforms_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_templateOptions_transforms_items"></a>4.6.7.4.3.6.1.8.37.4.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > templateOptions > transforms > transforms items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_terminationProtection"></a>4.6.7.4.3.6.1.8.38. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > terminationProtection`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether termination protection is enabled for this stack.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack_urlSuffix"></a>4.6.7.4.3.6.1.8.39. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > stack > urlSuffix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The Amazon domain suffix for the region in which this stack is defined

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_uniqueId"></a>4.6.7.4.3.6.1.9. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > securityGroups > securityGroups items > uniqueId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** A unique identifier for this connection peer

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_skip"></a>4.6.7.4.3.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _connections > skip`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** When doing bidirectional grants between Connections, make sure we don't recursive infinitely

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__currentVersion"></a>4.6.7.4.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _currentVersion`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__functionUrlInvocationGrants"></a>4.6.7.4.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _functionUrlInvocationGrants`

|                           |                                          |
| ------------------------- | ---------------------------------------- |
| **Type**                  | `object`                                 |
| **Required**              | Yes                                      |
| **Additional properties** | Any type allowed                         |
| **Defined in**            | #/definitions/Record%3Cstring%2CGrant%3E |

**Description:** Mapping of function URL invocation principals to grants. Used to de-dupe `grantInvokeUrl()` calls.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__hasAddedArrayTokenStatements"></a>4.6.7.4.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _hasAddedArrayTokenStatements`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Track whether we've added statements with array token resources to the role's default policy

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__hasAddedLiteralStatements"></a>4.6.7.4.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _hasAddedLiteralStatements`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Track whether we've added statements with literal resources to the role's default policy

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__invocationGrants"></a>4.6.7.4.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _invocationGrants`

|                           |                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                     |
| **Required**              | Yes                                                                                                                          |
| **Additional properties** | Any type allowed                                                                                                             |
| **Same definition as**    | [_functionUrlInvocationGrants](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__functionUrlInvocationGrants) |

**Description:** Mapping of invocation principals to grants. Used to de-dupe `grantInvoke()` calls.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__latestVersion"></a>4.6.7.4.9. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _latestVersion`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers"></a>4.6.7.4.10. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers`

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

| Each item of this array must be                                                                | Description |
| ---------------------------------------------------------------------------------------------- | ----------- |
| [ILayerVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items"></a>4.6.7.4.10.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > ILayerVersion

|                           |                             |
| ------------------------- | --------------------------- |
| **Type**                  | `object`                    |
| **Required**              | No                          |
| **Additional properties** | Not allowed                 |
| **Defined in**            | #/definitions/ILayerVersion |

| Property                                                                                                                  | Pattern | Type   | Deprecated | Definition                                                                                                                | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [compatibleRuntimes](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes ) | No      | array  | No         | -                                                                                                                         | The runtimes compatible with this Layer.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| + [env](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_env )                               | No      | object | No         | Same as [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env )                                                       | The environment this resource belongs to.<br />For resources that are created and managed by the CDK<br />(generally, those created by creating new class instances like Role, Bucket, etc.),<br />this is always the same as the environment of the stack they belong to;<br />however, for imported resources<br />(those obtained from static methods like fromRoleArn, fromBucketName, etc.),<br />that might be different than the stack they were imported into. |
| + [layerVersionArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_layerVersionArn )       | No      | string | No         | -                                                                                                                         | The ARN of the Lambda Layer version that this Layer defines.                                                                                                                                                                                                                                                                                                                                                                                                           |
| + [layerVersionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_layerVersionRef )       | No      | object | No         | In #/definitions/LayerVersionReference                                                                                    | A reference to a LayerVersion resource.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_node )                             | No      | object | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )   | The tree node.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_stack )                           | No      | object | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack ) | The stack in which this resource is defined.                                                                                                                                                                                                                                                                                                                                                                                                                           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes"></a>4.6.7.4.10.1.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > compatibleRuntimes`

|              |                                                                                                  |
| ------------ | ------------------------------------------------------------------------------------------------ |
| **Type**     | `array`                                                                                          |
| **Required** | No                                                                                               |
| **Default**  | `"- All supported runtimes. Setting this to Runtime.ALL is equivalent to leaving it undefined."` |

**Description:** The runtimes compatible with this Layer.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                   | Description                              |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| [Runtime](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items) | Lambda function runtime environment. ... |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items"></a>4.6.7.4.10.1.1.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > compatibleRuntimes > Runtime

|                           |                       |
| ------------------------- | --------------------- |
| **Type**                  | `object`              |
| **Required**              | No                    |
| **Additional properties** | Not allowed           |
| **Defined in**            | #/definitions/Runtime |

**Description:** Lambda function runtime environment.

If you need to use a runtime name that doesn't exist as a static member, you
can instantiate a `Runtime` object, e.g: `new Runtime('nodejs99.99')`.

| Property                                                                                                                                                         | Pattern | Type              | Deprecated | Definition                   | Title/Description                                                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ----------------- | ---------- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| + [bundlingImage](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_bundlingImage )                         | No      | object            | No         | In #/definitions/DockerImage | The bundling Docker image for this runtime.                                                         |
| - [family](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_family )                                       | No      | enum (of integer) | No         | -                            | The runtime family.                                                                                 |
| + [isVariable](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_isVariable )                               | No      | boolean           | No         | -                            | Enabled for runtime enums that always target the latest available.                                  |
| + [name](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_name )                                           | No      | string            | No         | -                            | The name of this runtime, as expected by the Lambda resource.                                       |
| + [supportsCodeGuruProfiling](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_supportsCodeGuruProfiling ) | No      | boolean           | No         | -                            | Whether this runtime is integrated with and supported for profiling using Amazon CodeGuru Profiler. |
| + [supportsInlineCode](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_supportsInlineCode )               | No      | boolean           | No         | -                            | Whether the \`\`ZipFile\`\` (aka inline code) property can be used with this<br />runtime.          |
| + [supportsSnapStart](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_supportsSnapStart )                 | No      | boolean           | No         | -                            | Whether this runtime supports snapstart.                                                            |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_bundlingImage"></a>4.6.7.4.10.1.1.1.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > compatibleRuntimes > compatibleRuntimes items > bundlingImage`

|                           |                           |
| ------------------------- | ------------------------- |
| **Type**                  | `object`                  |
| **Required**              | Yes                       |
| **Additional properties** | Not allowed               |
| **Defined in**            | #/definitions/DockerImage |

**Description:** The bundling Docker image for this runtime.

| Property                                                                                                                               | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [image](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_bundlingImage_image ) | No      | string | No         | -          | The Docker image  |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_bundlingImage_image"></a>4.6.7.4.10.1.1.1.1.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > compatibleRuntimes > compatibleRuntimes items > bundlingImage > image`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The Docker image

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_family"></a>4.6.7.4.10.1.1.1.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > compatibleRuntimes > compatibleRuntimes items > family`

|              |                     |
| ------------ | ------------------- |
| **Type**     | `enum (of integer)` |
| **Required** | No                  |

**Description:** The runtime family.

Must be one of:
* 0
* 1
* 2
* 3
* 4
* 5
* 6

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_isVariable"></a>4.6.7.4.10.1.1.1.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > compatibleRuntimes > compatibleRuntimes items > isVariable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Enabled for runtime enums that always target the latest available.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_name"></a>4.6.7.4.10.1.1.1.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > compatibleRuntimes > compatibleRuntimes items > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of this runtime, as expected by the Lambda resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_supportsCodeGuruProfiling"></a>4.6.7.4.10.1.1.1.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > compatibleRuntimes > compatibleRuntimes items > supportsCodeGuruProfiling`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether this runtime is integrated with and supported for profiling using Amazon CodeGuru Profiler.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_supportsInlineCode"></a>4.6.7.4.10.1.1.1.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > compatibleRuntimes > compatibleRuntimes items > supportsInlineCode`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether the ``ZipFile`` (aka inline code) property can be used with this
runtime.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items_supportsSnapStart"></a>4.6.7.4.10.1.1.1.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > compatibleRuntimes > compatibleRuntimes items > supportsSnapStart`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether this runtime supports snapstart.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_env"></a>4.6.7.4.10.1.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > env`

|                           |                                                            |
| ------------------------- | ---------------------------------------------------------- |
| **Type**                  | `object`                                                   |
| **Required**              | Yes                                                        |
| **Additional properties** | Not allowed                                                |
| **Same definition as**    | [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env) |

**Description:** The environment this resource belongs to.
For resources that are created and managed by the CDK
(generally, those created by creating new class instances like Role, Bucket, etc.),
this is always the same as the environment of the stack they belong to;
however, for imported resources
(those obtained from static methods like fromRoleArn, fromBucketName, etc.),
that might be different than the stack they were imported into.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_layerVersionArn"></a>4.6.7.4.10.1.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > layerVersionArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of the Lambda Layer version that this Layer defines.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_layerVersionRef"></a>4.6.7.4.10.1.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > layerVersionRef`

|                           |                                     |
| ------------------------- | ----------------------------------- |
| **Type**                  | `object`                            |
| **Required**              | Yes                                 |
| **Additional properties** | Not allowed                         |
| **Defined in**            | #/definitions/LayerVersionReference |

**Description:** A reference to a LayerVersion resource.

| Property                                                                                                                            | Pattern | Type   | Deprecated | Definition | Title/Description                                 |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------------------- |
| + [layerVersionArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_layerVersionRef_layerVersionArn ) | No      | string | No         | -          | The LayerVersionArn of the LayerVersion resource. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_layerVersionRef_layerVersionArn"></a>4.6.7.4.10.1.4.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > layerVersionRef > layerVersionArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The LayerVersionArn of the LayerVersion resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_node"></a>4.6.7.4.10.1.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_stack"></a>4.6.7.4.10.1.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _layers > _layers items > stack`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | Yes                                                                                                              |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** The stack in which this resource is defined.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__logGroup"></a>4.6.7.4.11. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _logGroup`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__logRetention"></a>4.6.7.4.12. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _logRetention`

|                           |                            |
| ------------------------- | -------------------------- |
| **Type**                  | `object`                   |
| **Required**              | No                         |
| **Additional properties** | Not allowed                |
| **Defined in**            | #/definitions/LogRetention |

**Description:** Creates a custom resource to control the retention policy of a CloudWatch Logs
log group. The log group is created if it doesn't already exist. The policy
is removed when `retentionDays` is `undefined` or equal to `Infinity`.
Log group can be created in the region that is different from stack region by
specifying `logGroupRegion`

| Property                                                                                                                                                    | Pattern | Type   | Deprecated | Definition                                                                                                              | Title/Description                                                                                                                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [ensureSingletonLogRetentionFunction](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__logRetention_ensureSingletonLogRetentionFunction ) | No      | object | No         | -                                                                                                                       | Helper method to ensure that only one instance of LogRetentionFunction resources are in the stack mimicking the<br />behaviour of aws-cdk-lib/aws-lambda's SingletonFunction to prevent circular dependencies |
| + [logGroupArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__logRetention_logGroupArn )                                                 | No      | string | No         | -                                                                                                                       | The ARN of the LogGroup.                                                                                                                                                                                      |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__logRetention_node )                                                               | No      | object | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node ) | The tree node.                                                                                                                                                                                                |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__logRetention_ensureSingletonLogRetentionFunction"></a>4.6.7.4.12.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _logRetention > ensureSingletonLogRetentionFunction`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Helper method to ensure that only one instance of LogRetentionFunction resources are in the stack mimicking the
behaviour of aws-cdk-lib/aws-lambda's SingletonFunction to prevent circular dependencies

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__logRetention_logGroupArn"></a>4.6.7.4.12.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _logRetention > logGroupArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of the LogGroup.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__logRetention_node"></a>4.6.7.4.12.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _logRetention > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__physicalName"></a>4.6.7.4.13. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _physicalName`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__policyCounter"></a>4.6.7.4.14. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _policyCounter`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** The number of permissions added to this function

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__skipPermissions"></a>4.6.7.4.15. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _skipPermissions`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Whether the user decides to skip adding permissions.
The only use case is for cross-account, imported lambdas
where the user commits to modifying the permisssions
on the imported lambda outside CDK.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__warnIfCurrentVersionCalled"></a>4.6.7.4.16. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > _warnIfCurrentVersionCalled`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Flag to delay adding a warning message until current version is invoked.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_architecture"></a>4.6.7.4.17. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > architecture`

|                           |                            |
| ------------------------- | -------------------------- |
| **Type**                  | `object`                   |
| **Required**              | Yes                        |
| **Additional properties** | Not allowed                |
| **Defined in**            | #/definitions/Architecture |

**Description:** The architecture of this Lambda Function (this is an optional attribute and defaults to X86_64).

| Property                                                                                                         | Pattern | Type   | Deprecated | Definition | Title/Description                                                          |
| ---------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------------------------------------------------- |
| + [dockerPlatform](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_architecture_dockerPlatform ) | No      | string | No         | -          | The platform to use for this architecture when building with Docker.       |
| + [name](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_architecture_name )                     | No      | string | No         | -          | The name of the architecture as recognized by the AWS Lambda service APIs. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_architecture_dockerPlatform"></a>4.6.7.4.17.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > architecture > dockerPlatform`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The platform to use for this architecture when building with Docker.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_architecture_name"></a>4.6.7.4.17.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > architecture > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the architecture as recognized by the AWS Lambda service APIs.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_buildDeadLetterConfig"></a>4.6.7.4.18. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > buildDeadLetterConfig`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_buildDeadLetterQueue"></a>4.6.7.4.19. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > buildDeadLetterQueue`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_buildTracingConfig"></a>4.6.7.4.20. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > buildTracingConfig`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_canCreatePermissions"></a>4.6.7.4.21. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > canCreatePermissions`

|              |         |
| ------------ | ------- |
| **Type**     | `const` |
| **Required** | Yes     |
| **Default**  | `true`  |

**Description:** Whether the addPermission() call adds any permissions

True for new Lambdas, false for version $LATEST and imported Lambdas
from different accounts.

Specific value: `true`

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_configureAdotInstrumentation"></a>4.6.7.4.22. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > configureAdotInstrumentation`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Add an AWS Distro for OpenTelemetry Lambda layer.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_configureLambdaInsights"></a>4.6.7.4.23. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > configureLambdaInsights`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Configured lambda insights on the function if specified. This is achieved by adding an imported layer which is added to the
list of lambda layers on synthesis.

https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Lambda-Insights-extension-versions.html

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_configureParamsAndSecretsExtension"></a>4.6.7.4.24. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > configureParamsAndSecretsExtension`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Add a Parameters and Secrets Extension Lambda layer.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_configureSnapStart"></a>4.6.7.4.25. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > configureSnapStart`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_configureVpc"></a>4.6.7.4.26. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > configureVpc`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** If configured, set up the VPC-related properties

Returns the VpcConfig that should be added to the
Lambda creation properties.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_connections"></a>4.6.7.4.27. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > connections`

|                           |                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                     |
| **Required**              | Yes                                                                                          |
| **Additional properties** | Not allowed                                                                                  |
| **Same definition as**    | [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections) |

**Description:** Access the Connections object

Will fail if not a VPC-enabled Lambda Function

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion"></a>4.6.7.4.28. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion`

|                           |                       |
| ------------------------- | --------------------- |
| **Type**                  | `object`              |
| **Required**              | Yes                   |
| **Additional properties** | Not allowed           |
| **Defined in**            | #/definitions/Version |

**Description:** Returns a `lambda.Version` which represents the current version of this
Lambda function. A new version will be created every time the function's
configuration changes.

You can specify options for this version using the `currentVersionOptions`
prop when initializing the `lambda.Function`.

| Property                                                                                                                                             | Pattern | Type            | Deprecated | Definition                                                                                                                            | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| + [_allowCrossEnvironment](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__allowCrossEnvironment )                   | No      | object          | No         | -                                                                                                                                     | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__connections )                                       | No      | object          | No         | Same as [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections )                                 | Actual connections object for this Lambda<br /><br />May be unset, in which case this Lambda is not configured use in a VPC.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| + [_functionUrlInvocationGrants](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__functionUrlInvocationGrants )       | No      | object          | No         | Same as [_functionUrlInvocationGrants](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__functionUrlInvocationGrants ) | Mapping of function URL invocation principals to grants. Used to de-dupe \`grantInvokeUrl()\` calls.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| + [_hasAddedArrayTokenStatements](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__hasAddedArrayTokenStatements )     | No      | object          | No         | -                                                                                                                                     | Track whether we've added statements with array token resources to the role's default policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| + [_hasAddedLiteralStatements](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__hasAddedLiteralStatements )           | No      | object          | No         | -                                                                                                                                     | Track whether we've added statements with literal resources to the role's default policy                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| + [_invocationGrants](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__invocationGrants )                             | No      | object          | No         | Same as [_functionUrlInvocationGrants](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__functionUrlInvocationGrants ) | Mapping of invocation principals to grants. Used to de-dupe \`grantInvoke()\` calls.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| - [_latestVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__latestVersion )                                   | No      | object          | No         | -                                                                                                                                     | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [_physicalName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__physicalName )                                     | No      | object          | No         | -                                                                                                                                     | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [_policyCounter](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__policyCounter )                                   | No      | object          | No         | -                                                                                                                                     | The number of permissions added to this function                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| - [_skipPermissions](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__skipPermissions )                               | No      | boolean         | No         | -                                                                                                                                     | Whether the user decides to skip adding permissions.<br />The only use case is for cross-account, imported lambdas<br />where the user commits to modifying the permisssions<br />on the imported lambda outside CDK.                                                                                                                                                                                                                                                                                                                                                                                              |
| + [_warnIfCurrentVersionCalled](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__warnIfCurrentVersionCalled )         | No      | boolean         | No         | -                                                                                                                                     | Flag to delay adding a warning message until current version is invoked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| + [architecture](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_architecture )                                       | No      | object          | No         | Same as [architecture](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_architecture )                                 | The architecture of this Lambda Function.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [canCreatePermissions](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_canCreatePermissions )                       | No      | const           | No         | -                                                                                                                                     | Whether the addPermission() call adds any permissions<br /><br />True for new Lambdas, false for version $LATEST and imported Lambdas<br />from different accounts.                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| + [connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_connections )                                         | No      | object          | No         | Same as [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections )                                 | Access the Connections object<br /><br />Will fail if not a VPC-enabled Lambda Function                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| + [determineProvisionedConcurrency](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_determineProvisionedConcurrency ) | No      | object          | No         | -                                                                                                                                     | Validate that the provisionedConcurrentExecutions makes sense<br /><br />Member must have value greater than or equal to 1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [edgeArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_edgeArn )                                                 | No      | string          | No         | -                                                                                                                                     | The ARN of the version for Lambda@Edge.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| + [env](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_env )                                                         | No      | object          | No         | Same as [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env )                                                                   | The environment this resource belongs to.<br />For resources that are created and managed by the CDK<br />(generally, those created by creating new class instances like Role, Bucket, etc.),<br />this is always the same as the environment of the stack they belong to;<br />however, for imported resources<br />(those obtained from static methods like fromRoleArn, fromBucketName, etc.),<br />that might be different than the stack they were imported into.                                                                                                                                             |
| + [functionArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionArn )                                         | No      | string          | No         | -                                                                                                                                     | The ARN fo the function.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| + [functionName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionName )                                       | No      | string          | No         | -                                                                                                                                     | The name of the function.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [functionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionRef )                                         | No      | object          | No         | In #/definitions/FunctionReference                                                                                                    | A reference to a Function resource.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| + [grant](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grant )                                                     | No      | object          | No         | -                                                                                                                                     | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal )                                   | No      | object          | No         | In #/definitions/IPrincipal                                                                                                           | The principal this Lambda Function is running as                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| + [isBoundToVpc](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_isBoundToVpc )                                       | No      | boolean         | No         | -                                                                                                                                     | Whether or not this Lambda function was bound to a VPC<br /><br />If this is is \`false\`, trying to access the \`connections\` object will fail.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [isPrincipalWithConditions](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_isPrincipalWithConditions )             | No      | object          | No         | -                                                                                                                                     | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [lambda](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda )                                                   | No      | object          | No         | In #/definitions/IFunction                                                                                                            | The underlying \`IFunction\`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| + [latestVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_latestVersion )                                     | No      | object          | No         | Same as [latestVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion )         | The \`$LATEST\` version of this function.<br /><br />Note that this is reference to a non-specific AWS Lambda version, which<br />means the function this version refers to can return different results in<br />different invocations.<br /><br />To obtain a reference to an explicit version which references the current<br />function configuration, use \`lambdaFunction.currentVersion\` instead.                                                                                                                                                                                                           |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_node )                                                       | No      | object          | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )               | The tree node.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| + [parsePermissionPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_parsePermissionPrincipal )               | No      | object          | No         | -                                                                                                                                     | Translate IPrincipal to something we can pass to AWS::Lambda::Permissions<br /><br />Do some nasty things because \`Permission\` supports a subset of what the<br />full IAM principal language supports, and we may not be able to parse strings<br />outright because they may be tokens.<br /><br />Try to recognize some specific Principal classes first, then try a generic<br />fallback.                                                                                                                                                                                                                   |
| + [permissionsNode](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_permissionsNode )                                 | No      | object          | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )               | The construct node where permissions are attached.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| + [physicalName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_physicalName )                                       | No      | string          | No         | -                                                                                                                                     | Returns a string-encoded token that resolves to the physical name that<br />should be passed to the CloudFormation resource.<br /><br />This value will resolve to one of the following:<br />- a concrete value (e.g. \`"my-awesome-bucket"\`)<br />- \`undefined\`, when a name should be generated by CloudFormation<br />- a concrete name generated automatically during synthesis, in<br />  cross-environment scenarios.                                                                                                                                                                                    |
| + [qualifier](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_qualifier )                                             | No      | string          | No         | -                                                                                                                                     | The qualifier of the version or alias of this function.<br />A qualifier is the identifier that's appended to a version or alias ARN.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| + [resourceArnsForGrantInvoke](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_resourceArnsForGrantInvoke )           | No      | array of string | No         | -                                                                                                                                     | The ARN(s) to put into the resource field of the generated IAM policy for grantInvoke()                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| - [role](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_role )                                                       | No      | object          | No         | Same as [role](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role )             | The IAM role associated with this function.<br /><br />Undefined if the function was imported without a role.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_stack )                                                     | No      | object          | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack )             | The stack in which this resource is defined.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| + [statementHasArrayTokens](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_statementHasArrayTokens )                 | No      | object          | No         | -                                                                                                                                     | Check if a policy statement contains array tokens that would cause CloudFormation<br />resolution conflicts when mixed with literal arrays in the same policy document.<br /><br />Array tokens are created by CloudFormation intrinsic functions that return arrays,<br />such as Fn::Split, Fn::GetAZs, etc. These cannot be safely merged with literal<br />resource arrays due to CloudFormation's token resolution limitations.<br /><br />Individual string tokens within literal arrays (e.g., \`["arn:${token}:..."]\`) are<br />safe and do not cause conflicts, so they are not detected by this method. |
| + [validateConditionCombinations](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_validateConditionCombinations )     | No      | object          | No         | -                                                                                                                                     | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [validateConditions](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_validateConditions )                           | No      | object          | No         | -                                                                                                                                     | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [version](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_version )                                                 | No      | string          | No         | -                                                                                                                                     | The most recently deployed version of this function.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| + [versionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_versionRef )                                           | No      | object          | No         | Same as [versionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_versionRef ) | A reference to a Version resource.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__allowCrossEnvironment"></a>4.6.7.4.28.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > _allowCrossEnvironment`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__connections"></a>4.6.7.4.28.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > _connections`

|                           |                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                     |
| **Required**              | No                                                                                           |
| **Additional properties** | Not allowed                                                                                  |
| **Same definition as**    | [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections) |

**Description:** Actual connections object for this Lambda

May be unset, in which case this Lambda is not configured use in a VPC.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__functionUrlInvocationGrants"></a>4.6.7.4.28.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > _functionUrlInvocationGrants`

|                           |                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                     |
| **Required**              | Yes                                                                                                                          |
| **Additional properties** | Any type allowed                                                                                                             |
| **Same definition as**    | [_functionUrlInvocationGrants](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__functionUrlInvocationGrants) |

**Description:** Mapping of function URL invocation principals to grants. Used to de-dupe `grantInvokeUrl()` calls.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__hasAddedArrayTokenStatements"></a>4.6.7.4.28.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > _hasAddedArrayTokenStatements`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Track whether we've added statements with array token resources to the role's default policy

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__hasAddedLiteralStatements"></a>4.6.7.4.28.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > _hasAddedLiteralStatements`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Track whether we've added statements with literal resources to the role's default policy

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__invocationGrants"></a>4.6.7.4.28.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > _invocationGrants`

|                           |                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                     |
| **Required**              | Yes                                                                                                                          |
| **Additional properties** | Any type allowed                                                                                                             |
| **Same definition as**    | [_functionUrlInvocationGrants](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__functionUrlInvocationGrants) |

**Description:** Mapping of invocation principals to grants. Used to de-dupe `grantInvoke()` calls.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__latestVersion"></a>4.6.7.4.28.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > _latestVersion`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__physicalName"></a>4.6.7.4.28.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > _physicalName`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__policyCounter"></a>4.6.7.4.28.9. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > _policyCounter`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** The number of permissions added to this function

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__skipPermissions"></a>4.6.7.4.28.10. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > _skipPermissions`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Whether the user decides to skip adding permissions.
The only use case is for cross-account, imported lambdas
where the user commits to modifying the permisssions
on the imported lambda outside CDK.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion__warnIfCurrentVersionCalled"></a>4.6.7.4.28.11. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > _warnIfCurrentVersionCalled`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Flag to delay adding a warning message until current version is invoked.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_architecture"></a>4.6.7.4.28.12. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > architecture`

|                           |                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                     |
| **Required**              | Yes                                                                                          |
| **Additional properties** | Not allowed                                                                                  |
| **Same definition as**    | [architecture](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_architecture) |

**Description:** The architecture of this Lambda Function.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_canCreatePermissions"></a>4.6.7.4.28.13. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > canCreatePermissions`

|              |         |
| ------------ | ------- |
| **Type**     | `const` |
| **Required** | Yes     |
| **Default**  | `true`  |

**Description:** Whether the addPermission() call adds any permissions

True for new Lambdas, false for version $LATEST and imported Lambdas
from different accounts.

Specific value: `true`

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_connections"></a>4.6.7.4.28.14. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > connections`

|                           |                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                     |
| **Required**              | Yes                                                                                          |
| **Additional properties** | Not allowed                                                                                  |
| **Same definition as**    | [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections) |

**Description:** Access the Connections object

Will fail if not a VPC-enabled Lambda Function

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_determineProvisionedConcurrency"></a>4.6.7.4.28.15. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > determineProvisionedConcurrency`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Validate that the provisionedConcurrentExecutions makes sense

Member must have value greater than or equal to 1

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_edgeArn"></a>4.6.7.4.28.16. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > edgeArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of the version for Lambda@Edge.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_env"></a>4.6.7.4.28.17. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > env`

|                           |                                                            |
| ------------------------- | ---------------------------------------------------------- |
| **Type**                  | `object`                                                   |
| **Required**              | Yes                                                        |
| **Additional properties** | Not allowed                                                |
| **Same definition as**    | [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env) |

**Description:** The environment this resource belongs to.
For resources that are created and managed by the CDK
(generally, those created by creating new class instances like Role, Bucket, etc.),
this is always the same as the environment of the stack they belong to;
however, for imported resources
(those obtained from static methods like fromRoleArn, fromBucketName, etc.),
that might be different than the stack they were imported into.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionArn"></a>4.6.7.4.28.18. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > functionArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN fo the function.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionName"></a>4.6.7.4.28.19. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > functionName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the function.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionRef"></a>4.6.7.4.28.20. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > functionRef`

|                           |                                 |
| ------------------------- | ------------------------------- |
| **Type**                  | `object`                        |
| **Required**              | Yes                             |
| **Additional properties** | Not allowed                     |
| **Defined in**            | #/definitions/FunctionReference |

**Description:** A reference to a Function resource.

| Property                                                                                                                   | Pattern | Type   | Deprecated | Definition | Title/Description                          |
| -------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------------ |
| + [functionArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionRef_functionArn )   | No      | string | No         | -          | The ARN of the Function resource.          |
| + [functionName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionRef_functionName ) | No      | string | No         | -          | The FunctionName of the Function resource. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionRef_functionArn"></a>4.6.7.4.28.20.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > functionRef > functionArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of the Function resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionRef_functionName"></a>4.6.7.4.28.20.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > functionRef > functionName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The FunctionName of the Function resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grant"></a>4.6.7.4.28.21. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > grant`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal"></a>4.6.7.4.28.22. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > grantPrincipal`

|                           |                          |
| ------------------------- | ------------------------ |
| **Type**                  | `object`                 |
| **Required**              | Yes                      |
| **Additional properties** | Not allowed              |
| **Defined in**            | #/definitions/IPrincipal |

**Description:** The principal this Lambda Function is running as

| Property                                                                                                                              | Pattern | Type   | Deprecated | Definition                                                                                                               | Title/Description                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [assumeRoleAction](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_assumeRoleAction ) | No      | string | No         | -                                                                                                                        | When this Principal is used in an AssumeRole policy, the action to use.                                                                                                                                           |
| + [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_grantPrincipal )     | No      | object | No         | Same as [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal ) | The principal to grant permissions to                                                                                                                                                                             |
| + [policyFragment](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_policyFragment )     | No      | object | No         | In #/definitions/PrincipalPolicyFragment                                                                                 | Return the policy fragment that identifies this principal in a Policy.                                                                                                                                            |
| - [principalAccount](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_principalAccount ) | No      | string | No         | -                                                                                                                        | The AWS account ID of this principal.<br />Can be undefined when the account is not known<br />(for example, for service principals).<br />Can be a Token - in that case,<br />it's assumed to be AWS::AccountId. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_assumeRoleAction"></a>4.6.7.4.28.22.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > grantPrincipal > assumeRoleAction`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** When this Principal is used in an AssumeRole policy, the action to use.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_grantPrincipal"></a>4.6.7.4.28.22.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > grantPrincipal > grantPrincipal`

|                           |                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                        |
| **Required**              | Yes                                                                                                             |
| **Additional properties** | Not allowed                                                                                                     |
| **Same definition as**    | [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal) |

**Description:** The principal to grant permissions to

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_policyFragment"></a>4.6.7.4.28.22.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > grantPrincipal > policyFragment`

|                           |                                       |
| ------------------------- | ------------------------------------- |
| **Type**                  | `object`                              |
| **Required**              | Yes                                   |
| **Additional properties** | Not allowed                           |
| **Defined in**            | #/definitions/PrincipalPolicyFragment |

**Description:** Return the policy fragment that identifies this principal in a Policy.

| Property                                                                                                                                       | Pattern | Type   | Deprecated | Definition                  | Title/Description                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [conditions](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_policyFragment_conditions )       | No      | object | No         | In #/definitions/Conditions | The conditions under which the policy is in effect.<br />See [the IAM documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition.html). |
| + [principalJson](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_policyFragment_principalJson ) | No      | object | No         | -                           | -                                                                                                                                                                                  |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_policyFragment_conditions"></a>4.6.7.4.28.22.3.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > grantPrincipal > policyFragment > conditions`

|                           |                          |
| ------------------------- | ------------------------ |
| **Type**                  | `object`                 |
| **Required**              | Yes                      |
| **Additional properties** | Any type allowed         |
| **Defined in**            | #/definitions/Conditions |

**Description:** The conditions under which the policy is in effect.
See [the IAM documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition.html).

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_policyFragment_principalJson"></a>4.6.7.4.28.22.3.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > grantPrincipal > policyFragment > principalJson`

|                           |                                                                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                                                               |
| **Required**              | Yes                                                                                                                                                                                                    |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_policyFragment_principalJson_additionalProperties) |

| Property                                                                                                                                               | Pattern | Type            | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_policyFragment_principalJson_additionalProperties ) | No      | array of string | No         | -          | -                 |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_policyFragment_principalJson_additionalProperties"></a>4.6.7.4.28.22.3.2.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > grantPrincipal > policyFragment > principalJson > additionalProperties`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                                                     | Description |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [additionalProperties items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_policyFragment_principalJson_additionalProperties_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_policyFragment_principalJson_additionalProperties_items"></a>4.6.7.4.28.22.3.2.1.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > grantPrincipal > policyFragment > principalJson > additionalProperties > additionalProperties items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_principalAccount"></a>4.6.7.4.28.22.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > grantPrincipal > principalAccount`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The AWS account ID of this principal.
Can be undefined when the account is not known
(for example, for service principals).
Can be a Token - in that case,
it's assumed to be AWS::AccountId.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_isBoundToVpc"></a>4.6.7.4.28.23. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > isBoundToVpc`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether or not this Lambda function was bound to a VPC

If this is is `false`, trying to access the `connections` object will fail.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_isPrincipalWithConditions"></a>4.6.7.4.28.24. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > isPrincipalWithConditions`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda"></a>4.6.7.4.28.25. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda`

|                           |                         |
| ------------------------- | ----------------------- |
| **Type**                  | `object`                |
| **Required**              | Yes                     |
| **Additional properties** | Not allowed             |
| **Defined in**            | #/definitions/IFunction |

**Description:** The underlying `IFunction`

| Property                                                                                                                                          | Pattern | Type            | Deprecated | Definition                                                                                                                | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [architecture](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_architecture )                             | No      | object          | No         | Same as [architecture](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_architecture )                     | The system architectures compatible with this lambda function.                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_connections )                               | No      | object          | No         | Same as [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections )                     | The network connections associated with this resource.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| + [env](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_env )                                               | No      | object          | No         | Same as [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env )                                                       | The environment this resource belongs to.<br />For resources that are created and managed by the CDK<br />(generally, those created by creating new class instances like Role, Bucket, etc.),<br />this is always the same as the environment of the stack they belong to;<br />however, for imported resources<br />(those obtained from static methods like fromRoleArn, fromBucketName, etc.),<br />that might be different than the stack they were imported into. |
| + [functionArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_functionArn )                               | No      | string          | No         | -                                                                                                                         | The ARN of the function.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| + [functionName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_functionName )                             | No      | string          | No         | -                                                                                                                         | The name of the function.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| + [functionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_functionRef )                               | No      | object          | No         | Same as [functionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionRef )        | A reference to a Function resource.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| + [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_grantPrincipal )                         | No      | object          | No         | Same as [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal )  | The principal to grant permissions to                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [isBoundToVpc](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_isBoundToVpc )                             | No      | boolean         | No         | -                                                                                                                         | Whether or not this Lambda function was bound to a VPC<br /><br />If this is is \`false\`, trying to access the \`connections\` object will fail.                                                                                                                                                                                                                                                                                                                      |
| + [latestVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion )                           | No      | object          | No         | In #/definitions/IVersion                                                                                                 | The \`$LATEST\` version of this function.<br /><br />Note that this is reference to a non-specific AWS Lambda version, which<br />means the function this version refers to can return different results in<br />different invocations.<br /><br />To obtain a reference to an explicit version which references the current<br />function configuration, use \`lambdaFunction.currentVersion\` instead.                                                               |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_node )                                             | No      | object          | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )   | The tree node.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [permissionsNode](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_permissionsNode )                       | No      | object          | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )   | The construct node where permissions are attached.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| + [resourceArnsForGrantInvoke](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_resourceArnsForGrantInvoke ) | No      | array of string | No         | -                                                                                                                         | The ARN(s) to put into the resource field of the generated IAM policy for grantInvoke().<br /><br />This property is for cdk modules to consume only. You should not need to use this property.<br />Instead, use grantInvoke() directly.                                                                                                                                                                                                                              |
| - [role](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_role )                                             | No      | object          | No         | Same as [role](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role ) | The IAM role associated with this function.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_stack )                                           | No      | object          | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack ) | The stack in which this resource is defined.                                                                                                                                                                                                                                                                                                                                                                                                                           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_architecture"></a>4.6.7.4.28.25.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > architecture`

|                           |                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                     |
| **Required**              | Yes                                                                                          |
| **Additional properties** | Not allowed                                                                                  |
| **Same definition as**    | [architecture](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_architecture) |

**Description:** The system architectures compatible with this lambda function.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_connections"></a>4.6.7.4.28.25.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > connections`

|                           |                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                     |
| **Required**              | Yes                                                                                          |
| **Additional properties** | Not allowed                                                                                  |
| **Same definition as**    | [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections) |

**Description:** The network connections associated with this resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_env"></a>4.6.7.4.28.25.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > env`

|                           |                                                            |
| ------------------------- | ---------------------------------------------------------- |
| **Type**                  | `object`                                                   |
| **Required**              | Yes                                                        |
| **Additional properties** | Not allowed                                                |
| **Same definition as**    | [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env) |

**Description:** The environment this resource belongs to.
For resources that are created and managed by the CDK
(generally, those created by creating new class instances like Role, Bucket, etc.),
this is always the same as the environment of the stack they belong to;
however, for imported resources
(those obtained from static methods like fromRoleArn, fromBucketName, etc.),
that might be different than the stack they were imported into.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_functionArn"></a>4.6.7.4.28.25.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > functionArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of the function.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_functionName"></a>4.6.7.4.28.25.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > functionName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the function.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_functionRef"></a>4.6.7.4.28.25.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > functionRef`

|                           |                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                  |
| **Required**              | Yes                                                                                                       |
| **Additional properties** | Not allowed                                                                                               |
| **Same definition as**    | [functionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionRef) |

**Description:** A reference to a Function resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_grantPrincipal"></a>4.6.7.4.28.25.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > grantPrincipal`

|                           |                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                        |
| **Required**              | Yes                                                                                                             |
| **Additional properties** | Not allowed                                                                                                     |
| **Same definition as**    | [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal) |

**Description:** The principal to grant permissions to

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_isBoundToVpc"></a>4.6.7.4.28.25.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > isBoundToVpc`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether or not this Lambda function was bound to a VPC

If this is is `false`, trying to access the `connections` object will fail.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion"></a>4.6.7.4.28.25.9. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion`

|                           |                        |
| ------------------------- | ---------------------- |
| **Type**                  | `object`               |
| **Required**              | Yes                    |
| **Additional properties** | Not allowed            |
| **Defined in**            | #/definitions/IVersion |

**Description:** The `$LATEST` version of this function.

Note that this is reference to a non-specific AWS Lambda version, which
means the function this version refers to can return different results in
different invocations.

To obtain a reference to an explicit version which references the current
function configuration, use `lambdaFunction.currentVersion` instead.

| Property                                                                                                                                                        | Pattern | Type            | Deprecated | Definition                                                                                                                    | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [architecture](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_architecture )                             | No      | object          | No         | Same as [architecture](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_architecture )                         | The system architectures compatible with this lambda function.                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_connections )                               | No      | object          | No         | Same as [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections )                         | The network connections associated with this resource.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| + [edgeArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_edgeArn )                                       | No      | string          | No         | -                                                                                                                             | The ARN of the version for Lambda@Edge.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| + [env](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_env )                                               | No      | object          | No         | Same as [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env )                                                           | The environment this resource belongs to.<br />For resources that are created and managed by the CDK<br />(generally, those created by creating new class instances like Role, Bucket, etc.),<br />this is always the same as the environment of the stack they belong to;<br />however, for imported resources<br />(those obtained from static methods like fromRoleArn, fromBucketName, etc.),<br />that might be different than the stack they were imported into. |
| + [functionArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_functionArn )                               | No      | string          | No         | -                                                                                                                             | The ARN of the function.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| + [functionName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_functionName )                             | No      | string          | No         | -                                                                                                                             | The name of the function.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| + [functionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_functionRef )                               | No      | object          | No         | Same as [functionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionRef )            | A reference to a Function resource.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| + [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_grantPrincipal )                         | No      | object          | No         | Same as [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal )      | The principal to grant permissions to                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [isBoundToVpc](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_isBoundToVpc )                             | No      | boolean         | No         | -                                                                                                                             | Whether or not this Lambda function was bound to a VPC<br /><br />If this is is \`false\`, trying to access the \`connections\` object will fail.                                                                                                                                                                                                                                                                                                                      |
| + [lambda](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_lambda )                                         | No      | object          | No         | Same as [lambda](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda )                      | The underlying AWS Lambda function.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| + [latestVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_latestVersion )                           | No      | object          | No         | Same as [latestVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion ) | The \`$LATEST\` version of this function.<br /><br />Note that this is reference to a non-specific AWS Lambda version, which<br />means the function this version refers to can return different results in<br />different invocations.<br /><br />To obtain a reference to an explicit version which references the current<br />function configuration, use \`lambdaFunction.currentVersion\` instead.                                                               |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_node )                                             | No      | object          | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )       | The tree node.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [permissionsNode](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_permissionsNode )                       | No      | object          | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )       | The construct node where permissions are attached.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| + [resourceArnsForGrantInvoke](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_resourceArnsForGrantInvoke ) | No      | array of string | No         | -                                                                                                                             | The ARN(s) to put into the resource field of the generated IAM policy for grantInvoke().<br /><br />This property is for cdk modules to consume only. You should not need to use this property.<br />Instead, use grantInvoke() directly.                                                                                                                                                                                                                              |
| - [role](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role )                                             | No      | object          | No         | In #/definitions/IRole                                                                                                        | The IAM role associated with this function.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_stack )                                           | No      | object          | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack )     | The stack in which this resource is defined.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| + [version](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_version )                                       | No      | string          | No         | -                                                                                                                             | The most recently deployed version of this function.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| + [versionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_versionRef )                                 | No      | object          | No         | In #/definitions/VersionReference                                                                                             | A reference to a Version resource.                                                                                                                                                                                                                                                                                                                                                                                                                                     |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_architecture"></a>4.6.7.4.28.25.9.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > architecture`

|                           |                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                     |
| **Required**              | Yes                                                                                          |
| **Additional properties** | Not allowed                                                                                  |
| **Same definition as**    | [architecture](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_architecture) |

**Description:** The system architectures compatible with this lambda function.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_connections"></a>4.6.7.4.28.25.9.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > connections`

|                           |                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                     |
| **Required**              | Yes                                                                                          |
| **Additional properties** | Not allowed                                                                                  |
| **Same definition as**    | [_connections](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections) |

**Description:** The network connections associated with this resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_edgeArn"></a>4.6.7.4.28.25.9.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > edgeArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of the version for Lambda@Edge.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_env"></a>4.6.7.4.28.25.9.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > env`

|                           |                                                            |
| ------------------------- | ---------------------------------------------------------- |
| **Type**                  | `object`                                                   |
| **Required**              | Yes                                                        |
| **Additional properties** | Not allowed                                                |
| **Same definition as**    | [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env) |

**Description:** The environment this resource belongs to.
For resources that are created and managed by the CDK
(generally, those created by creating new class instances like Role, Bucket, etc.),
this is always the same as the environment of the stack they belong to;
however, for imported resources
(those obtained from static methods like fromRoleArn, fromBucketName, etc.),
that might be different than the stack they were imported into.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_functionArn"></a>4.6.7.4.28.25.9.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > functionArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of the function.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_functionName"></a>4.6.7.4.28.25.9.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > functionName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the function.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_functionRef"></a>4.6.7.4.28.25.9.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > functionRef`

|                           |                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                  |
| **Required**              | Yes                                                                                                       |
| **Additional properties** | Not allowed                                                                                               |
| **Same definition as**    | [functionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionRef) |

**Description:** A reference to a Function resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_grantPrincipal"></a>4.6.7.4.28.25.9.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > grantPrincipal`

|                           |                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                        |
| **Required**              | Yes                                                                                                             |
| **Additional properties** | Not allowed                                                                                                     |
| **Same definition as**    | [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal) |

**Description:** The principal to grant permissions to

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_isBoundToVpc"></a>4.6.7.4.28.25.9.9. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > isBoundToVpc`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether or not this Lambda function was bound to a VPC

If this is is `false`, trying to access the `connections` object will fail.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_lambda"></a>4.6.7.4.28.25.9.10. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > lambda`

|                           |                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                        |
| **Required**              | Yes                                                                                             |
| **Additional properties** | Not allowed                                                                                     |
| **Same definition as**    | [lambda](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda) |

**Description:** The underlying AWS Lambda function.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_latestVersion"></a>4.6.7.4.28.25.9.11. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > latestVersion`

|                           |                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                             |
| **Required**              | Yes                                                                                                                  |
| **Additional properties** | Not allowed                                                                                                          |
| **Same definition as**    | [latestVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion) |

**Description:** The `$LATEST` version of this function.

Note that this is reference to a non-specific AWS Lambda version, which
means the function this version refers to can return different results in
different invocations.

To obtain a reference to an explicit version which references the current
function configuration, use `lambdaFunction.currentVersion` instead.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_node"></a>4.6.7.4.28.25.9.12. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_permissionsNode"></a>4.6.7.4.28.25.9.13. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > permissionsNode`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The construct node where permissions are attached.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_resourceArnsForGrantInvoke"></a>4.6.7.4.28.25.9.14. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > resourceArnsForGrantInvoke`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The ARN(s) to put into the resource field of the generated IAM policy for grantInvoke().

This property is for cdk modules to consume only. You should not need to use this property.
Instead, use grantInvoke() directly.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                                          | Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [resourceArnsForGrantInvoke items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_resourceArnsForGrantInvoke_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_resourceArnsForGrantInvoke_items"></a>4.6.7.4.28.25.9.14.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > resourceArnsForGrantInvoke > resourceArnsForGrantInvoke items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role"></a>4.6.7.4.28.25.9.15. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > role`

|                           |                     |
| ------------------------- | ------------------- |
| **Type**                  | `object`            |
| **Required**              | No                  |
| **Additional properties** | Not allowed         |
| **Defined in**            | #/definitions/IRole |

**Description:** The IAM role associated with this function.

| Property                                                                                                                                         | Pattern | Type   | Deprecated | Definition                                                                                                                              | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [assumeRoleAction](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_assumeRoleAction ) | No      | string | No         | -                                                                                                                                       | When this Principal is used in an AssumeRole policy, the action to use.                                                                                                                                                                                                                                                                                                                                                                                                |
| + [env](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_env )                           | No      | object | No         | Same as [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env )                                                                     | The environment this resource belongs to.<br />For resources that are created and managed by the CDK<br />(generally, those created by creating new class instances like Role, Bucket, etc.),<br />this is always the same as the environment of the stack they belong to;<br />however, for imported resources<br />(those obtained from static methods like fromRoleArn, fromBucketName, etc.),<br />that might be different than the stack they were imported into. |
| + [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_grantPrincipal )     | No      | object | No         | Same as [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal )                | The principal to grant permissions to                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_node )                         | No      | object | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )                 | The tree node.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [policyFragment](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_policyFragment )     | No      | object | No         | Same as [policyFragment](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_policyFragment ) | Return the policy fragment that identifies this principal in a Policy.                                                                                                                                                                                                                                                                                                                                                                                                 |
| - [principalAccount](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_principalAccount ) | No      | string | No         | -                                                                                                                                       | The AWS account ID of this principal.<br />Can be undefined when the account is not known<br />(for example, for service principals).<br />Can be a Token - in that case,<br />it's assumed to be AWS::AccountId.                                                                                                                                                                                                                                                      |
| + [roleArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_roleArn )                   | No      | string | No         | -                                                                                                                                       | Returns the ARN of this role.                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [roleName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_roleName )                 | No      | string | No         | -                                                                                                                                       | Returns the name of this role.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [roleRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_roleRef )                   | No      | object | No         | In #/definitions/RoleReference                                                                                                          | A reference to a Role resource.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_stack )                       | No      | object | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack )               | The stack in which this resource is defined.                                                                                                                                                                                                                                                                                                                                                                                                                           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_assumeRoleAction"></a>4.6.7.4.28.25.9.15.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > role > assumeRoleAction`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** When this Principal is used in an AssumeRole policy, the action to use.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_env"></a>4.6.7.4.28.25.9.15.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > role > env`

|                           |                                                            |
| ------------------------- | ---------------------------------------------------------- |
| **Type**                  | `object`                                                   |
| **Required**              | Yes                                                        |
| **Additional properties** | Not allowed                                                |
| **Same definition as**    | [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env) |

**Description:** The environment this resource belongs to.
For resources that are created and managed by the CDK
(generally, those created by creating new class instances like Role, Bucket, etc.),
this is always the same as the environment of the stack they belong to;
however, for imported resources
(those obtained from static methods like fromRoleArn, fromBucketName, etc.),
that might be different than the stack they were imported into.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_grantPrincipal"></a>4.6.7.4.28.25.9.15.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > role > grantPrincipal`

|                           |                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                        |
| **Required**              | Yes                                                                                                             |
| **Additional properties** | Not allowed                                                                                                     |
| **Same definition as**    | [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal) |

**Description:** The principal to grant permissions to

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_node"></a>4.6.7.4.28.25.9.15.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > role > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_policyFragment"></a>4.6.7.4.28.25.9.15.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > role > policyFragment`

|                           |                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                       |
| **Required**              | Yes                                                                                                                            |
| **Additional properties** | Not allowed                                                                                                                    |
| **Same definition as**    | [policyFragment](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal_policyFragment) |

**Description:** Return the policy fragment that identifies this principal in a Policy.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_principalAccount"></a>4.6.7.4.28.25.9.15.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > role > principalAccount`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The AWS account ID of this principal.
Can be undefined when the account is not known
(for example, for service principals).
Can be a Token - in that case,
it's assumed to be AWS::AccountId.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_roleArn"></a>4.6.7.4.28.25.9.15.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > role > roleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Returns the ARN of this role.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_roleName"></a>4.6.7.4.28.25.9.15.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > role > roleName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Returns the name of this role.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_roleRef"></a>4.6.7.4.28.25.9.15.9. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > role > roleRef`

|                           |                             |
| ------------------------- | --------------------------- |
| **Type**                  | `object`                    |
| **Required**              | Yes                         |
| **Additional properties** | Not allowed                 |
| **Defined in**            | #/definitions/RoleReference |

**Description:** A reference to a Role resource.

| Property                                                                                                                                 | Pattern | Type   | Deprecated | Definition | Title/Description                  |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ---------------------------------- |
| + [roleArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_roleRef_roleArn )   | No      | string | No         | -          | The ARN of the Role resource.      |
| + [roleName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_roleRef_roleName ) | No      | string | No         | -          | The RoleName of the Role resource. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_roleRef_roleArn"></a>4.6.7.4.28.25.9.15.9.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > role > roleRef > roleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of the Role resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_roleRef_roleName"></a>4.6.7.4.28.25.9.15.9.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > role > roleRef > roleName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The RoleName of the Role resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role_stack"></a>4.6.7.4.28.25.9.15.10. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > role > stack`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | Yes                                                                                                              |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** The stack in which this resource is defined.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_stack"></a>4.6.7.4.28.25.9.16. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > stack`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | Yes                                                                                                              |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** The stack in which this resource is defined.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_version"></a>4.6.7.4.28.25.9.17. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > version`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The most recently deployed version of this function.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_versionRef"></a>4.6.7.4.28.25.9.18. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > versionRef`

|                           |                                |
| ------------------------- | ------------------------------ |
| **Type**                  | `object`                       |
| **Required**              | Yes                            |
| **Additional properties** | Not allowed                    |
| **Defined in**            | #/definitions/VersionReference |

**Description:** A reference to a Version resource.

| Property                                                                                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description                        |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ---------------------------------------- |
| + [functionArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_versionRef_functionArn ) | No      | string | No         | -          | The FunctionArn of the Version resource. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_versionRef_functionArn"></a>4.6.7.4.28.25.9.18.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > latestVersion > versionRef > functionArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The FunctionArn of the Version resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_node"></a>4.6.7.4.28.25.10. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_permissionsNode"></a>4.6.7.4.28.25.11. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > permissionsNode`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The construct node where permissions are attached.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_resourceArnsForGrantInvoke"></a>4.6.7.4.28.25.12. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > resourceArnsForGrantInvoke`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The ARN(s) to put into the resource field of the generated IAM policy for grantInvoke().

This property is for cdk modules to consume only. You should not need to use this property.
Instead, use grantInvoke() directly.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                            | Description |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [resourceArnsForGrantInvoke items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_resourceArnsForGrantInvoke_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_resourceArnsForGrantInvoke_items"></a>4.6.7.4.28.25.12.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > resourceArnsForGrantInvoke > resourceArnsForGrantInvoke items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_role"></a>4.6.7.4.28.25.13. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > role`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | No                                                                                                               |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [role](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role) |

**Description:** The IAM role associated with this function.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_stack"></a>4.6.7.4.28.25.14. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > lambda > stack`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | Yes                                                                                                              |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** The stack in which this resource is defined.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_latestVersion"></a>4.6.7.4.28.26. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > latestVersion`

|                           |                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                             |
| **Required**              | Yes                                                                                                                  |
| **Additional properties** | Not allowed                                                                                                          |
| **Same definition as**    | [latestVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion) |

**Description:** The `$LATEST` version of this function.

Note that this is reference to a non-specific AWS Lambda version, which
means the function this version refers to can return different results in
different invocations.

To obtain a reference to an explicit version which references the current
function configuration, use `lambdaFunction.currentVersion` instead.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_node"></a>4.6.7.4.28.27. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_parsePermissionPrincipal"></a>4.6.7.4.28.28. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > parsePermissionPrincipal`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Translate IPrincipal to something we can pass to AWS::Lambda::Permissions

Do some nasty things because `Permission` supports a subset of what the
full IAM principal language supports, and we may not be able to parse strings
outright because they may be tokens.

Try to recognize some specific Principal classes first, then try a generic
fallback.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_permissionsNode"></a>4.6.7.4.28.29. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > permissionsNode`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The construct node where permissions are attached.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_physicalName"></a>4.6.7.4.28.30. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > physicalName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Returns a string-encoded token that resolves to the physical name that
should be passed to the CloudFormation resource.

This value will resolve to one of the following:
- a concrete value (e.g. `"my-awesome-bucket"`)
- `undefined`, when a name should be generated by CloudFormation
- a concrete name generated automatically during synthesis, in
  cross-environment scenarios.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_qualifier"></a>4.6.7.4.28.31. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > qualifier`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The qualifier of the version or alias of this function.
A qualifier is the identifier that's appended to a version or alias ARN.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_resourceArnsForGrantInvoke"></a>4.6.7.4.28.32. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > resourceArnsForGrantInvoke`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The ARN(s) to put into the resource field of the generated IAM policy for grantInvoke()

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                     | Description |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [resourceArnsForGrantInvoke items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_resourceArnsForGrantInvoke_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_resourceArnsForGrantInvoke_items"></a>4.6.7.4.28.32.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > resourceArnsForGrantInvoke > resourceArnsForGrantInvoke items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_role"></a>4.6.7.4.28.33. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > role`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | No                                                                                                               |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [role](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role) |

**Description:** The IAM role associated with this function.

Undefined if the function was imported without a role.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_stack"></a>4.6.7.4.28.34. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > stack`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | Yes                                                                                                              |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** The stack in which this resource is defined.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_statementHasArrayTokens"></a>4.6.7.4.28.35. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > statementHasArrayTokens`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Check if a policy statement contains array tokens that would cause CloudFormation
resolution conflicts when mixed with literal arrays in the same policy document.

Array tokens are created by CloudFormation intrinsic functions that return arrays,
such as Fn::Split, Fn::GetAZs, etc. These cannot be safely merged with literal
resource arrays due to CloudFormation's token resolution limitations.

Individual string tokens within literal arrays (e.g., `["arn:${token}:..."]`) are
safe and do not cause conflicts, so they are not detected by this method.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_validateConditionCombinations"></a>4.6.7.4.28.36. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > validateConditionCombinations`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_validateConditions"></a>4.6.7.4.28.37. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > validateConditions`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_version"></a>4.6.7.4.28.38. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > version`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The most recently deployed version of this function.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_versionRef"></a>4.6.7.4.28.39. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersion > versionRef`

|                           |                                                                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                     |
| **Required**              | Yes                                                                                                                          |
| **Additional properties** | Not allowed                                                                                                                  |
| **Same definition as**    | [versionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_versionRef) |

**Description:** A reference to a Version resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersionOptions"></a>4.6.7.4.29. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > currentVersionOptions`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | No               |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue"></a>4.6.7.4.30. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue`

|                           |                      |
| ------------------------- | -------------------- |
| **Type**                  | `object`             |
| **Required**              | No                   |
| **Additional properties** | Not allowed          |
| **Defined in**            | #/definitions/IQueue |

**Description:** The DLQ (as queue) associated with this Lambda Function (this is an optional attribute).

| Property                                                                                                                      | Pattern | Type             | Deprecated | Definition                                                                                                                | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [encryptionMasterKey](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey ) | No      | object           | No         | In #/definitions/IKey                                                                                                     | If this queue is server-side encrypted, this is the KMS encryption key.                                                                                                                                                                                                                                                                                                                                                                                                |
| - [encryptionType](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionType )           | No      | enum (of string) | No         | -                                                                                                                         | Whether the contents of the queue are encrypted, and by what type of key.                                                                                                                                                                                                                                                                                                                                                                                              |
| + [env](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_env )                                 | No      | object           | No         | Same as [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env )                                                       | The environment this resource belongs to.<br />For resources that are created and managed by the CDK<br />(generally, those created by creating new class instances like Role, Bucket, etc.),<br />this is always the same as the environment of the stack they belong to;<br />however, for imported resources<br />(those obtained from static methods like fromRoleArn, fromBucketName, etc.),<br />that might be different than the stack they were imported into. |
| + [fifo](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_fifo )                               | No      | boolean          | No         | -                                                                                                                         | Whether this queue is an Amazon SQS FIFO queue. If false, this is a standard queue.                                                                                                                                                                                                                                                                                                                                                                                    |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_node )                               | No      | object           | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )   | The tree node.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [queueArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_queueArn )                       | No      | string           | No         | -                                                                                                                         | The ARN of this queue                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [queueName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_queueName )                     | No      | string           | No         | -                                                                                                                         | The name of this queue                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| + [queueUrl](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_queueUrl )                       | No      | string           | No         | -                                                                                                                         | The URL of this queue                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_stack )                             | No      | object           | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack ) | The stack in which this resource is defined.                                                                                                                                                                                                                                                                                                                                                                                                                           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey"></a>4.6.7.4.30.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey`

|                           |                    |
| ------------------------- | ------------------ |
| **Type**                  | `object`           |
| **Required**              | No                 |
| **Additional properties** | Not allowed        |
| **Defined in**            | #/definitions/IKey |

**Description:** If this queue is server-side encrypted, this is the KMS encryption key.

| Property                                                                                                                | Pattern | Type   | Deprecated | Definition                                                                                                                | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [env](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_env )       | No      | object | No         | Same as [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env )                                                       | The environment this resource belongs to.<br />For resources that are created and managed by the CDK<br />(generally, those created by creating new class instances like Role, Bucket, etc.),<br />this is always the same as the environment of the stack they belong to;<br />however, for imported resources<br />(those obtained from static methods like fromRoleArn, fromBucketName, etc.),<br />that might be different than the stack they were imported into. |
| + [keyArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyArn ) | No      | string | No         | -                                                                                                                         | The ARN of the key.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| + [keyId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyId )   | No      | string | No         | -                                                                                                                         | The ID of the key<br />(the part that looks something like: 1234abcd-12ab-34cd-56ef-1234567890ab).                                                                                                                                                                                                                                                                                                                                                                     |
| + [keyRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyRef ) | No      | object | No         | In #/definitions/KeyReference                                                                                             | A reference to a Key resource.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_node )     | No      | object | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )   | The tree node.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_stack )   | No      | object | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack ) | The stack in which this resource is defined.                                                                                                                                                                                                                                                                                                                                                                                                                           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_env"></a>4.6.7.4.30.1.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > env`

|                           |                                                            |
| ------------------------- | ---------------------------------------------------------- |
| **Type**                  | `object`                                                   |
| **Required**              | Yes                                                        |
| **Additional properties** | Not allowed                                                |
| **Same definition as**    | [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env) |

**Description:** The environment this resource belongs to.
For resources that are created and managed by the CDK
(generally, those created by creating new class instances like Role, Bucket, etc.),
this is always the same as the environment of the stack they belong to;
however, for imported resources
(those obtained from static methods like fromRoleArn, fromBucketName, etc.),
that might be different than the stack they were imported into.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyArn"></a>4.6.7.4.30.1.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > keyArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of the key.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyId"></a>4.6.7.4.30.1.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > keyId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ID of the key
(the part that looks something like: 1234abcd-12ab-34cd-56ef-1234567890ab).

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyRef"></a>4.6.7.4.30.1.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > keyRef`

|                           |                            |
| ------------------------- | -------------------------- |
| **Type**                  | `object`                   |
| **Required**              | Yes                        |
| **Additional properties** | Not allowed                |
| **Defined in**            | #/definitions/KeyReference |

**Description:** A reference to a Key resource.

| Property                                                                                                                       | Pattern | Type   | Deprecated | Definition | Title/Description              |
| ------------------------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ------------------------------ |
| + [keyArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyRef_keyArn ) | No      | string | No         | -          | The ARN of the Key resource.   |
| + [keyId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyRef_keyId )   | No      | string | No         | -          | The KeyId of the Key resource. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyRef_keyArn"></a>4.6.7.4.30.1.4.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > keyRef > keyArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of the Key resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyRef_keyId"></a>4.6.7.4.30.1.4.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > keyRef > keyId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The KeyId of the Key resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_node"></a>4.6.7.4.30.1.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_stack"></a>4.6.7.4.30.1.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > stack`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | Yes                                                                                                              |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** The stack in which this resource is defined.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionType"></a>4.6.7.4.30.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionType`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

**Description:** Whether the contents of the queue are encrypted, and by what type of key.

Must be one of:
* "KMS"
* "KMS_MANAGED"
* "NONE"
* "SQS_MANAGED"

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_env"></a>4.6.7.4.30.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > env`

|                           |                                                            |
| ------------------------- | ---------------------------------------------------------- |
| **Type**                  | `object`                                                   |
| **Required**              | Yes                                                        |
| **Additional properties** | Not allowed                                                |
| **Same definition as**    | [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env) |

**Description:** The environment this resource belongs to.
For resources that are created and managed by the CDK
(generally, those created by creating new class instances like Role, Bucket, etc.),
this is always the same as the environment of the stack they belong to;
however, for imported resources
(those obtained from static methods like fromRoleArn, fromBucketName, etc.),
that might be different than the stack they were imported into.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_fifo"></a>4.6.7.4.30.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > fifo`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether this queue is an Amazon SQS FIFO queue. If false, this is a standard queue.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_node"></a>4.6.7.4.30.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_queueArn"></a>4.6.7.4.30.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > queueArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of this queue

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_queueName"></a>4.6.7.4.30.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > queueName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of this queue

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_queueUrl"></a>4.6.7.4.30.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > queueUrl`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The URL of this queue

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_stack"></a>4.6.7.4.30.9. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > stack`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | Yes                                                                                                              |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** The stack in which this resource is defined.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic"></a>4.6.7.4.31. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterTopic`

|                           |                      |
| ------------------------- | -------------------- |
| **Type**                  | `object`             |
| **Required**              | No                   |
| **Additional properties** | Not allowed          |
| **Defined in**            | #/definitions/ITopic |

**Description:** The DLQ (as topic) associated with this Lambda Function (this is an optional attribute).

| Property                                                                                                                                  | Pattern | Type    | Deprecated | Definition                                                                                                                | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [contentBasedDeduplication](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_contentBasedDeduplication ) | No      | boolean | No         | -                                                                                                                         | Enables content-based deduplication for FIFO topics.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| + [env](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_env )                                             | No      | object  | No         | Same as [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env )                                                       | The environment this resource belongs to.<br />For resources that are created and managed by the CDK<br />(generally, those created by creating new class instances like Role, Bucket, etc.),<br />this is always the same as the environment of the stack they belong to;<br />however, for imported resources<br />(those obtained from static methods like fromRoleArn, fromBucketName, etc.),<br />that might be different than the stack they were imported into. |
| + [fifo](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_fifo )                                           | No      | boolean | No         | -                                                                                                                         | Whether this topic is an Amazon SNS FIFO queue. If false, this is a standard topic.                                                                                                                                                                                                                                                                                                                                                                                    |
| - [masterKey](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_masterKey )                                 | No      | object  | No         | In #/definitions/IKey                                                                                                     | A KMS Key, either managed by this CDK app, or imported.<br /><br />This property applies only to server-side encryption.                                                                                                                                                                                                                                                                                                                                               |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_node )                                           | No      | object  | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )   | The tree node.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_stack )                                         | No      | object  | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack ) | The stack in which this resource is defined.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| + [topicArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_topicArn )                                   | No      | string  | No         | -                                                                                                                         | The ARN of the topic                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| + [topicName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_topicName )                                 | No      | string  | No         | -                                                                                                                         | The name of the topic                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_contentBasedDeduplication"></a>4.6.7.4.31.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterTopic > contentBasedDeduplication`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Enables content-based deduplication for FIFO topics.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_env"></a>4.6.7.4.31.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterTopic > env`

|                           |                                                            |
| ------------------------- | ---------------------------------------------------------- |
| **Type**                  | `object`                                                   |
| **Required**              | Yes                                                        |
| **Additional properties** | Not allowed                                                |
| **Same definition as**    | [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env) |

**Description:** The environment this resource belongs to.
For resources that are created and managed by the CDK
(generally, those created by creating new class instances like Role, Bucket, etc.),
this is always the same as the environment of the stack they belong to;
however, for imported resources
(those obtained from static methods like fromRoleArn, fromBucketName, etc.),
that might be different than the stack they were imported into.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_fifo"></a>4.6.7.4.31.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterTopic > fifo`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether this topic is an Amazon SNS FIFO queue. If false, this is a standard topic.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_masterKey"></a>4.6.7.4.31.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterTopic > masterKey`

|                           |                    |
| ------------------------- | ------------------ |
| **Type**                  | `object`           |
| **Required**              | No                 |
| **Additional properties** | Not allowed        |
| **Default**               | `"None"`           |
| **Defined in**            | #/definitions/IKey |

**Description:** A KMS Key, either managed by this CDK app, or imported.

This property applies only to server-side encryption.

| Property                                                                                                                | Pattern | Type   | Deprecated | Definition                                                                                                                | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [env](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_env )       | No      | object | No         | Same as [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env )                                                       | The environment this resource belongs to.<br />For resources that are created and managed by the CDK<br />(generally, those created by creating new class instances like Role, Bucket, etc.),<br />this is always the same as the environment of the stack they belong to;<br />however, for imported resources<br />(those obtained from static methods like fromRoleArn, fromBucketName, etc.),<br />that might be different than the stack they were imported into. |
| + [keyArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyArn ) | No      | string | No         | -                                                                                                                         | The ARN of the key.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| + [keyId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyId )   | No      | string | No         | -                                                                                                                         | The ID of the key<br />(the part that looks something like: 1234abcd-12ab-34cd-56ef-1234567890ab).                                                                                                                                                                                                                                                                                                                                                                     |
| + [keyRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyRef ) | No      | object | No         | In #/definitions/KeyReference                                                                                             | A reference to a Key resource.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_node )     | No      | object | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )   | The tree node.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_stack )   | No      | object | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack ) | The stack in which this resource is defined.                                                                                                                                                                                                                                                                                                                                                                                                                           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_env"></a>4.6.7.4.31.4.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > env`

|                           |                                                            |
| ------------------------- | ---------------------------------------------------------- |
| **Type**                  | `object`                                                   |
| **Required**              | Yes                                                        |
| **Additional properties** | Not allowed                                                |
| **Same definition as**    | [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env) |

**Description:** The environment this resource belongs to.
For resources that are created and managed by the CDK
(generally, those created by creating new class instances like Role, Bucket, etc.),
this is always the same as the environment of the stack they belong to;
however, for imported resources
(those obtained from static methods like fromRoleArn, fromBucketName, etc.),
that might be different than the stack they were imported into.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyArn"></a>4.6.7.4.31.4.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > keyArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of the key.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyId"></a>4.6.7.4.31.4.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > keyId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ID of the key
(the part that looks something like: 1234abcd-12ab-34cd-56ef-1234567890ab).

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyRef"></a>4.6.7.4.31.4.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > keyRef`

|                           |                            |
| ------------------------- | -------------------------- |
| **Type**                  | `object`                   |
| **Required**              | Yes                        |
| **Additional properties** | Not allowed                |
| **Defined in**            | #/definitions/KeyReference |

**Description:** A reference to a Key resource.

| Property                                                                                                                       | Pattern | Type   | Deprecated | Definition | Title/Description              |
| ------------------------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ------------------------------ |
| + [keyArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyRef_keyArn ) | No      | string | No         | -          | The ARN of the Key resource.   |
| + [keyId](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyRef_keyId )   | No      | string | No         | -          | The KeyId of the Key resource. |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyRef_keyArn"></a>4.6.7.4.31.4.4.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > keyRef > keyArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of the Key resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_keyRef_keyId"></a>4.6.7.4.31.4.4.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > keyRef > keyId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The KeyId of the Key resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_node"></a>4.6.7.4.31.4.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterQueue_encryptionMasterKey_stack"></a>4.6.7.4.31.4.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterQueue > encryptionMasterKey > stack`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | Yes                                                                                                              |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** The stack in which this resource is defined.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_node"></a>4.6.7.4.31.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterTopic > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_stack"></a>4.6.7.4.31.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterTopic > stack`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | Yes                                                                                                              |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** The stack in which this resource is defined.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_topicArn"></a>4.6.7.4.31.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterTopic > topicArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of the topic

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_deadLetterTopic_topicName"></a>4.6.7.4.31.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > deadLetterTopic > topicName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the topic

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_env"></a>4.6.7.4.32. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > env`

|                           |                                                            |
| ------------------------- | ---------------------------------------------------------- |
| **Type**                  | `object`                                                   |
| **Required**              | Yes                                                        |
| **Additional properties** | Not allowed                                                |
| **Same definition as**    | [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env) |

**Description:** The environment this resource belongs to.
For resources that are created and managed by the CDK
(generally, those created by creating new class instances like Role, Bucket, etc.),
this is always the same as the environment of the stack they belong to;
however, for imported resources
(those obtained from static methods like fromRoleArn, fromBucketName, etc.),
that might be different than the stack they were imported into.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_environment"></a>4.6.7.4.33. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > environment`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Environment variables for this function

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_functionArn"></a>4.6.7.4.34. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > functionArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** ARN of this function

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_functionName"></a>4.6.7.4.35. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > functionName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Name of this function

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_functionRef"></a>4.6.7.4.36. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > functionRef`

|                           |                                                                                                           |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                  |
| **Required**              | Yes                                                                                                       |
| **Additional properties** | Not allowed                                                                                               |
| **Same definition as**    | [functionRef](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_functionRef) |

**Description:** A reference to a Function resource.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_getLoggingConfig"></a>4.6.7.4.37. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > getLoggingConfig`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Get Logging Config property for the function.
This method returns the function LoggingConfig Property if the property is set on the
function and undefined if not.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_grant"></a>4.6.7.4.38. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > grant`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_grantPrincipal"></a>4.6.7.4.39. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > grantPrincipal`

|                           |                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                        |
| **Required**              | Yes                                                                                                             |
| **Additional properties** | Not allowed                                                                                                     |
| **Same definition as**    | [grantPrincipal](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_grantPrincipal) |

**Description:** The principal this Lambda Function is running as

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_hashMixins"></a>4.6.7.4.40. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > hashMixins`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_isBoundToVpc"></a>4.6.7.4.41. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > isBoundToVpc`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether or not this Lambda function was bound to a VPC

If this is is `false`, trying to access the `connections` object will fail.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_isPrincipalWithConditions"></a>4.6.7.4.42. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > isPrincipalWithConditions`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_isQueue"></a>4.6.7.4.43. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > isQueue`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_latestVersion"></a>4.6.7.4.44. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > latestVersion`

|                           |                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                             |
| **Required**              | Yes                                                                                                                  |
| **Additional properties** | Not allowed                                                                                                          |
| **Same definition as**    | [latestVersion](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion) |

**Description:** The `$LATEST` version of this function.

Note that this is reference to a non-specific AWS Lambda version, which
means the function this version refers to can return different results in
different invocations.

To obtain a reference to an explicit version which references the current
function configuration, use `lambdaFunction.currentVersion` instead.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_logGroup"></a>4.6.7.4.45. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > logGroup`

|                           |                         |
| ------------------------- | ----------------------- |
| **Type**                  | `object`                |
| **Required**              | Yes                     |
| **Additional properties** | Not allowed             |
| **Defined in**            | #/definitions/ILogGroup |

**Description:** The LogGroup where the Lambda function's logs are made available.

If either `logRetention` is set or this property is called, a CloudFormation custom resource is added to the stack that
pre-creates the log group as part of the stack deployment, if it already doesn't exist, and sets the correct log retention
period (never expire, by default).

Further, if the log group already exists and the `logRetention` is not set, the custom resource will reset the log retention
to never expire even if it was configured with a different value.

| Property                                                                                                 | Pattern | Type   | Deprecated | Definition                                                                                                                | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [env](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_logGroup_env )                   | No      | object | No         | Same as [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env )                                                       | The environment this resource belongs to.<br />For resources that are created and managed by the CDK<br />(generally, those created by creating new class instances like Role, Bucket, etc.),<br />this is always the same as the environment of the stack they belong to;<br />however, for imported resources<br />(those obtained from static methods like fromRoleArn, fromBucketName, etc.),<br />that might be different than the stack they were imported into. |
| + [logGroupArn](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_logGroup_logGroupArn )   | No      | string | No         | -                                                                                                                         | The ARN of this log group, with ':*' appended                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [logGroupName](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_logGroup_logGroupName ) | No      | string | No         | -                                                                                                                         | The name of this log group                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| + [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_logGroup_node )                 | No      | object | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node )   | The tree node.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_logGroup_stack )               | No      | object | No         | Same as [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack ) | The stack in which this resource is defined.                                                                                                                                                                                                                                                                                                                                                                                                                           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_logGroup_env"></a>4.6.7.4.45.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > logGroup > env`

|                           |                                                            |
| ------------------------- | ---------------------------------------------------------- |
| **Type**                  | `object`                                                   |
| **Required**              | Yes                                                        |
| **Additional properties** | Not allowed                                                |
| **Same definition as**    | [env](#sagemakerBlueprint_domainConfig_domainConfigCr_env) |

**Description:** The environment this resource belongs to.
For resources that are created and managed by the CDK
(generally, those created by creating new class instances like Role, Bucket, etc.),
this is always the same as the environment of the stack they belong to;
however, for imported resources
(those obtained from static methods like fromRoleArn, fromBucketName, etc.),
that might be different than the stack they were imported into.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_logGroup_logGroupArn"></a>4.6.7.4.45.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > logGroup > logGroupArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of this log group, with ':*' appended

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_logGroup_logGroupName"></a>4.6.7.4.45.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > logGroup > logGroupName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of this log group

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_logGroup_node"></a>4.6.7.4.45.4. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > logGroup > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_logGroup_stack"></a>4.6.7.4.45.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > logGroup > stack`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | Yes                                                                                                              |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** The stack in which this resource is defined.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_node"></a>4.6.7.4.46. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_parsePermissionPrincipal"></a>4.6.7.4.47. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > parsePermissionPrincipal`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Translate IPrincipal to something we can pass to AWS::Lambda::Permissions

Do some nasty things because `Permission` supports a subset of what the
full IAM principal language supports, and we may not be able to parse strings
outright because they may be tokens.

Try to recognize some specific Principal classes first, then try a generic
fallback.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_permissionsNode"></a>4.6.7.4.48. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > permissionsNode`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The construct node where permissions are attached.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_physicalName"></a>4.6.7.4.49. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > physicalName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Returns a string-encoded token that resolves to the physical name that
should be passed to the CloudFormation resource.

This value will resolve to one of the following:
- a concrete value (e.g. `"my-awesome-bucket"`)
- `undefined`, when a name should be generated by CloudFormation
- a concrete name generated automatically during synthesis, in
  cross-environment scenarios.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_renderEnvironment"></a>4.6.7.4.50. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > renderEnvironment`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_renderLayers"></a>4.6.7.4.51. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > renderLayers`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_resourceArnsForGrantInvoke"></a>4.6.7.4.52. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > resourceArnsForGrantInvoke`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The ARN(s) to put into the resource field of the generated IAM policy for grantInvoke()

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                      | Description |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [resourceArnsForGrantInvoke items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_resourceArnsForGrantInvoke_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_resourceArnsForGrantInvoke_items"></a>4.6.7.4.52.1. root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > resourceArnsForGrantInvoke > resourceArnsForGrantInvoke items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_role"></a>4.6.7.4.53. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > role`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | No                                                                                                               |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [role](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_currentVersion_lambda_latestVersion_role) |

**Description:** Execution role associated with this function

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_runtime"></a>4.6.7.4.54. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > runtime`

|                           |                                                                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                        |
| **Required**              | Yes                                                                                                                                                                                                             |
| **Additional properties** | Not allowed                                                                                                                                                                                                     |
| **Same definition as**    | [sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__layers_items_compatibleRuntimes_items) |

**Description:** The runtime configured for this lambda.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_stack"></a>4.6.7.4.55. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > stack`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | Yes                                                                                                              |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** The stack in which this resource is defined.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_statementHasArrayTokens"></a>4.6.7.4.56. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > statementHasArrayTokens`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Check if a policy statement contains array tokens that would cause CloudFormation
resolution conflicts when mixed with literal arrays in the same policy document.

Array tokens are created by CloudFormation intrinsic functions that return arrays,
such as Fn::Split, Fn::GetAZs, etc. These cannot be safely merged with literal
resource arrays due to CloudFormation's token resolution limitations.

Individual string tokens within literal arrays (e.g., `["arn:${token}:..."]`) are
safe and do not cause conflicts, so they are not detected by this method.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_timeout"></a>4.6.7.4.57. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > timeout`

|                           |                        |
| ------------------------- | ---------------------- |
| **Type**                  | `object`               |
| **Required**              | No                     |
| **Additional properties** | Not allowed            |
| **Defined in**            | #/definitions/Duration |

**Description:** The timeout configured for this lambda.

| Property                                                                                            | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [amount](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_timeout_amount )         | No      | object | No         | -          | -                                                                                                                                                                                                                                                                            |
| + [components](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_timeout_components ) | No      | object | No         | -          | Return the duration in a set of whole numbered time components, ordered from largest to smallest<br /><br />Only components != 0 will be returned.<br /><br />Can combine millis and seconds together for the benefit of toIsoString,<br />makes the logic in there simpler. |
| + [unit](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_timeout_unit )             | No      | object | No         | -          | -                                                                                                                                                                                                                                                                            |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_timeout_amount"></a>4.6.7.4.57.1. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > timeout > amount`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_timeout_components"></a>4.6.7.4.57.2. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > timeout > components`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

**Description:** Return the duration in a set of whole numbered time components, ordered from largest to smallest

Only components != 0 will be returned.

Can combine millis and seconds together for the benefit of toIsoString,
makes the logic in there simpler.

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_timeout_unit"></a>4.6.7.4.57.3. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > timeout > unit`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_validateConditionCombinations"></a>4.6.7.4.58. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > validateConditionCombinations`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_validateConditions"></a>4.6.7.4.59. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > validateConditions`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

###### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction_validateProfiling"></a>4.6.7.4.60. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > handlerFunction > validateProfiling`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

##### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_node"></a>4.6.7.5. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

##### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_physicalName"></a>4.6.7.6. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > physicalName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Returns a string-encoded token that resolves to the physical name that
should be passed to the CloudFormation resource.

This value will resolve to one of the following:
- a concrete value (e.g. `"my-awesome-bucket"`)
- `undefined`, when a name should be generated by CloudFormation
- a concrete name generated automatically during synthesis, in
  cross-environment scenarios.

##### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_ref"></a>4.6.7.7. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > ref`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The physical name of this custom resource.

##### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_resource"></a>4.6.7.8. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > resource`

|                           |                  |
| ------------------------- | ---------------- |
| **Type**                  | `object`         |
| **Required**              | Yes              |
| **Additional properties** | Any type allowed |

##### <a name="sagemakerBlueprint_domainConfig_domainConfigCr_stack"></a>4.6.7.9. Property `root > sagemakerBlueprint > domainConfig > domainConfigCr > stack`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | Yes                                                                                                              |
| **Additional properties** | Not allowed                                                                                                      |
| **Same definition as**    | [stack](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_stack) |

**Description:** The stack in which this resource is defined.

#### <a name="sagemakerBlueprint_domainConfig_domainId"></a>4.6.8. Property `root > sagemakerBlueprint > domainConfig > domainId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="sagemakerBlueprint_domainConfig_domainKmsKeyArn"></a>4.6.9. Property `root > sagemakerBlueprint > domainConfig > domainKmsKeyArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="sagemakerBlueprint_domainConfig_domainKmsUsagePolicyName"></a>4.6.10. Property `root > sagemakerBlueprint > domainConfig > domainKmsUsagePolicyName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="sagemakerBlueprint_domainConfig_domainName"></a>4.6.11. Property `root > sagemakerBlueprint > domainConfig > domainName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="sagemakerBlueprint_domainConfig_domainUnitIds"></a>4.6.12. Property `root > sagemakerBlueprint > domainConfig > domainUnitIds`

|                           |                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                   |
| **Required**              | Yes                                                                                                                        |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_domainConfig_domainUnitIds_additionalProperties) |

| Property                                                                   | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#sagemakerBlueprint_domainConfig_domainUnitIds_additionalProperties ) | No      | string | No         | -          | -                 |

##### <a name="sagemakerBlueprint_domainConfig_domainUnitIds_additionalProperties"></a>4.6.12.1. Property `root > sagemakerBlueprint > domainConfig > domainUnitIds > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="sagemakerBlueprint_domainConfig_domainVersion"></a>4.6.13. Property `root > sagemakerBlueprint > domainConfig > domainVersion`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="sagemakerBlueprint_domainConfig_glueCatalogArns"></a>4.6.14. Property `root > sagemakerBlueprint > domainConfig > glueCatalogArns`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                 | Description |
| ------------------------------------------------------------------------------- | ----------- |
| [glueCatalogArns items](#sagemakerBlueprint_domainConfig_glueCatalogArns_items) | -           |

##### <a name="sagemakerBlueprint_domainConfig_glueCatalogArns_items"></a>4.6.14.1. root > sagemakerBlueprint > domainConfig > glueCatalogArns > glueCatalogArns items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="sagemakerBlueprint_domainConfig_glueCatalogKmsKeyArns"></a>4.6.15. Property `root > sagemakerBlueprint > domainConfig > glueCatalogKmsKeyArns`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                             | Description |
| ------------------------------------------------------------------------------------------- | ----------- |
| [glueCatalogKmsKeyArns items](#sagemakerBlueprint_domainConfig_glueCatalogKmsKeyArns_items) | -           |

##### <a name="sagemakerBlueprint_domainConfig_glueCatalogKmsKeyArns_items"></a>4.6.15.1. root > sagemakerBlueprint > domainConfig > glueCatalogKmsKeyArns > glueCatalogKmsKeyArns items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="sagemakerBlueprint_domainConfig_node"></a>4.6.16. Property `root > sagemakerBlueprint > domainConfig > node`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** The tree node.

#### <a name="sagemakerBlueprint_domainConfig_projectIds"></a>4.6.17. Property `root > sagemakerBlueprint > domainConfig > projectIds`

|                           |                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                |
| **Required**              | Yes                                                                                                                     |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_domainConfig_projectIds_additionalProperties) |

| Property                                                                | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#sagemakerBlueprint_domainConfig_projectIds_additionalProperties ) | No      | string | No         | -          | -                 |

##### <a name="sagemakerBlueprint_domainConfig_projectIds_additionalProperties"></a>4.6.17.1. Property `root > sagemakerBlueprint > domainConfig > projectIds > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="sagemakerBlueprint_domainConfig_props"></a>4.6.18. Property `root > sagemakerBlueprint > domainConfig > props`

|                           |                                 |
| ------------------------- | ------------------------------- |
| **Type**                  | `object`                        |
| **Required**              | Yes                             |
| **Additional properties** | Not allowed                     |
| **Defined in**            | #/definitions/DomainConfigProps |

| Property                                                                                             | Pattern | Type            | Deprecated | Definition                           | Title/Description                                                                                           |
| ---------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| - [blueprintIds](#sagemakerBlueprint_domainConfig_props_blueprintIds )                               | No      | object          | No         | -                                    | -                                                                                                           |
| - [createConfigParams](#sagemakerBlueprint_domainConfig_props_createConfigParams )                   | No      | boolean         | No         | -                                    | -                                                                                                           |
| - [createOutputs](#sagemakerBlueprint_domainConfig_props_createOutputs )                             | No      | boolean         | No         | -                                    | Flag controlling CloudFormation output and stack export creation for construct resources                    |
| - [createParams](#sagemakerBlueprint_domainConfig_props_createParams )                               | No      | boolean         | No         | -                                    | Flag controlling SSM parameter creation for construct resource references enabling                          |
| - [customResourceRoleName](#sagemakerBlueprint_domainConfig_props_customResourceRoleName )           | No      | string          | No         | -                                    | -                                                                                                           |
| - [domainArn](#sagemakerBlueprint_domainConfig_props_domainArn )                                     | No      | string          | No         | -                                    | DataZone domain ARN for AWS resource identification and IAM policy integration enabling                     |
| - [domainBucketArn](#sagemakerBlueprint_domainConfig_props_domainBucketArn )                         | No      | string          | No         | -                                    | -                                                                                                           |
| - [domainBucketUsagePolicyName](#sagemakerBlueprint_domainConfig_props_domainBucketUsagePolicyName ) | No      | string          | No         | -                                    | Domain Bucket usage policy name                                                                             |
| - [domainId](#sagemakerBlueprint_domainConfig_props_domainId )                                       | No      | string          | No         | -                                    | DataZone domain ID for unique domain identification within AWS enabling cross-service                       |
| - [domainKmsKeyArn](#sagemakerBlueprint_domainConfig_props_domainKmsKeyArn )                         | No      | string          | No         | -                                    | KMS key ARN for domain encryption ensuring data protection compliance and secure domain operations          |
| - [domainKmsUsagePolicyName](#sagemakerBlueprint_domainConfig_props_domainKmsUsagePolicyName )       | No      | string          | No         | -                                    | Domain KMS usage policy name for key access management enabling controlled encryption key                   |
| - [domainName](#sagemakerBlueprint_domainConfig_props_domainName )                                   | No      | string          | No         | -                                    | DataZone domain name for domain identification and management enabling unique domain naming                 |
| - [domainUnitIds](#sagemakerBlueprint_domainConfig_props_domainUnitIds )                             | No      | object          | No         | -                                    | Map of domain unit names to identifiers for hierarchical domain organization enabling                       |
| - [domainVersion](#sagemakerBlueprint_domainConfig_props_domainVersion )                             | No      | string          | No         | -                                    | Domain version for domain lifecycle management and versioning control enabling domain evolution tracking    |
| - [glueCatalogArns](#sagemakerBlueprint_domainConfig_props_glueCatalogArns )                         | No      | array of string | No         | -                                    | Array of Glue catalog ARNs for catalog integration enabling data catalog connectivity with DataZone         |
| - [glueCatalogKmsKeyArns](#sagemakerBlueprint_domainConfig_props_glueCatalogKmsKeyArns )             | No      | array of string | No         | -                                    | Array of Glue catalog KMS key ARNs for catalog encryption enabling secure catalog integration with DataZone |
| + [naming](#sagemakerBlueprint_domainConfig_props_naming )                                           | No      | object          | No         | In #/definitions/IMdaaResourceNaming | MDAA naming implementation for consistent resource naming across all MDAA constructs                        |
| - [projectIds](#sagemakerBlueprint_domainConfig_props_projectIds )                                   | No      | object          | No         | -                                    | -                                                                                                           |
| - [refresh](#sagemakerBlueprint_domainConfig_props_refresh )                                         | No      | boolean         | No         | -                                    | -                                                                                                           |
| + [ssmParamBase](#sagemakerBlueprint_domainConfig_props_ssmParamBase )                               | No      | string          | No         | -                                    | SSM parameter base path for domain configuration storage enabling centralized configuration management      |

##### <a name="sagemakerBlueprint_domainConfig_props_blueprintIds"></a>4.6.18.1. Property `root > sagemakerBlueprint > domainConfig > props > blueprintIds`

|                           |                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                        |
| **Required**              | No                                                                                                                              |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_domainConfig_props_blueprintIds_additionalProperties) |

| Property                                                                        | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#sagemakerBlueprint_domainConfig_props_blueprintIds_additionalProperties ) | No      | string | No         | -          | -                 |

###### <a name="sagemakerBlueprint_domainConfig_props_blueprintIds_additionalProperties"></a>4.6.18.1.1. Property `root > sagemakerBlueprint > domainConfig > props > blueprintIds > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="sagemakerBlueprint_domainConfig_props_createConfigParams"></a>4.6.18.2. Property `root > sagemakerBlueprint > domainConfig > props > createConfigParams`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

##### <a name="sagemakerBlueprint_domainConfig_props_createOutputs"></a>4.6.18.3. Property `root > sagemakerBlueprint > domainConfig > props > createOutputs`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Flag controlling CloudFormation output and stack export creation for construct resources

##### <a name="sagemakerBlueprint_domainConfig_props_createParams"></a>4.6.18.4. Property `root > sagemakerBlueprint > domainConfig > props > createParams`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Flag controlling SSM parameter creation for construct resource references enabling

##### <a name="sagemakerBlueprint_domainConfig_props_customResourceRoleName"></a>4.6.18.5. Property `root > sagemakerBlueprint > domainConfig > props > customResourceRoleName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="sagemakerBlueprint_domainConfig_props_domainArn"></a>4.6.18.6. Property `root > sagemakerBlueprint > domainConfig > props > domainArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** DataZone domain ARN for AWS resource identification and IAM policy integration enabling

##### <a name="sagemakerBlueprint_domainConfig_props_domainBucketArn"></a>4.6.18.7. Property `root > sagemakerBlueprint > domainConfig > props > domainBucketArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="sagemakerBlueprint_domainConfig_props_domainBucketUsagePolicyName"></a>4.6.18.8. Property `root > sagemakerBlueprint > domainConfig > props > domainBucketUsagePolicyName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Domain Bucket usage policy name

##### <a name="sagemakerBlueprint_domainConfig_props_domainId"></a>4.6.18.9. Property `root > sagemakerBlueprint > domainConfig > props > domainId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** DataZone domain ID for unique domain identification within AWS enabling cross-service

##### <a name="sagemakerBlueprint_domainConfig_props_domainKmsKeyArn"></a>4.6.18.10. Property `root > sagemakerBlueprint > domainConfig > props > domainKmsKeyArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** KMS key ARN for domain encryption ensuring data protection compliance and secure domain operations

##### <a name="sagemakerBlueprint_domainConfig_props_domainKmsUsagePolicyName"></a>4.6.18.11. Property `root > sagemakerBlueprint > domainConfig > props > domainKmsUsagePolicyName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Domain KMS usage policy name for key access management enabling controlled encryption key

##### <a name="sagemakerBlueprint_domainConfig_props_domainName"></a>4.6.18.12. Property `root > sagemakerBlueprint > domainConfig > props > domainName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** DataZone domain name for domain identification and management enabling unique domain naming

##### <a name="sagemakerBlueprint_domainConfig_props_domainUnitIds"></a>4.6.18.13. Property `root > sagemakerBlueprint > domainConfig > props > domainUnitIds`

|                           |                                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                         |
| **Required**              | No                                                                                                                               |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_domainConfig_props_domainUnitIds_additionalProperties) |

**Description:** Map of domain unit names to identifiers for hierarchical domain organization enabling

| Property                                                                         | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#sagemakerBlueprint_domainConfig_props_domainUnitIds_additionalProperties ) | No      | string | No         | -          | -                 |

###### <a name="sagemakerBlueprint_domainConfig_props_domainUnitIds_additionalProperties"></a>4.6.18.13.1. Property `root > sagemakerBlueprint > domainConfig > props > domainUnitIds > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="sagemakerBlueprint_domainConfig_props_domainVersion"></a>4.6.18.14. Property `root > sagemakerBlueprint > domainConfig > props > domainVersion`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Domain version for domain lifecycle management and versioning control enabling domain evolution tracking

##### <a name="sagemakerBlueprint_domainConfig_props_glueCatalogArns"></a>4.6.18.15. Property `root > sagemakerBlueprint > domainConfig > props > glueCatalogArns`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Array of Glue catalog ARNs for catalog integration enabling data catalog connectivity with DataZone

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                       | Description |
| ------------------------------------------------------------------------------------- | ----------- |
| [glueCatalogArns items](#sagemakerBlueprint_domainConfig_props_glueCatalogArns_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_props_glueCatalogArns_items"></a>4.6.18.15.1. root > sagemakerBlueprint > domainConfig > props > glueCatalogArns > glueCatalogArns items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="sagemakerBlueprint_domainConfig_props_glueCatalogKmsKeyArns"></a>4.6.18.16. Property `root > sagemakerBlueprint > domainConfig > props > glueCatalogKmsKeyArns`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Array of Glue catalog KMS key ARNs for catalog encryption enabling secure catalog integration with DataZone

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                   | Description |
| ------------------------------------------------------------------------------------------------- | ----------- |
| [glueCatalogKmsKeyArns items](#sagemakerBlueprint_domainConfig_props_glueCatalogKmsKeyArns_items) | -           |

###### <a name="sagemakerBlueprint_domainConfig_props_glueCatalogKmsKeyArns_items"></a>4.6.18.16.1. root > sagemakerBlueprint > domainConfig > props > glueCatalogKmsKeyArns > glueCatalogKmsKeyArns items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="sagemakerBlueprint_domainConfig_props_naming"></a>4.6.18.17. Property `root > sagemakerBlueprint > domainConfig > props > naming`

|                           |                                   |
| ------------------------- | --------------------------------- |
| **Type**                  | `object`                          |
| **Required**              | Yes                               |
| **Additional properties** | Not allowed                       |
| **Defined in**            | #/definitions/IMdaaResourceNaming |

**Description:** MDAA naming implementation for consistent resource naming across all MDAA constructs

| Property                                                        | Pattern | Type   | Deprecated | Definition                                | Title/Description                                                                                            |
| --------------------------------------------------------------- | ------- | ------ | ---------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| + [props](#sagemakerBlueprint_domainConfig_props_naming_props ) | No      | object | No         | In #/definitions/MdaaResourceNamingConfig | Configuration properties containing organizational context and CDK node access for the naming implementation |

###### <a name="sagemakerBlueprint_domainConfig_props_naming_props"></a>4.6.18.17.1. Property `root > sagemakerBlueprint > domainConfig > props > naming > props`

|                           |                                        |
| ------------------------- | -------------------------------------- |
| **Type**                  | `object`                               |
| **Required**              | Yes                                    |
| **Additional properties** | Not allowed                            |
| **Defined in**            | #/definitions/MdaaResourceNamingConfig |

**Description:** Configuration properties containing organizational context and CDK node access for the naming implementation

| Property                                                                        | Pattern | Type   | Deprecated | Definition                                                                                                              | Title/Description                                                                                                 |
| ------------------------------------------------------------------------------- | ------- | ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| + [cdkNode](#sagemakerBlueprint_domainConfig_props_naming_props_cdkNode )       | No      | object | No         | Same as [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node ) | CDK construct node providing access to context values for custom naming implementations                           |
| + [domain](#sagemakerBlueprint_domainConfig_props_naming_props_domain )         | No      | string | No         | -                                                                                                                       | Domain identifier from MDAA configuration representing logical business or organizational boundaries              |
| + [env](#sagemakerBlueprint_domainConfig_props_naming_props_env )               | No      | string | No         | -                                                                                                                       | Environment identifier from MDAA configuration that distinguishes deployment stages within the same domain        |
| + [moduleName](#sagemakerBlueprint_domainConfig_props_naming_props_moduleName ) | No      | string | No         | -                                                                                                                       | Module name from MDAA configuration identifying the specific MDAA module deployment within a domain/environment   |
| + [org](#sagemakerBlueprint_domainConfig_props_naming_props_org )               | No      | string | No         | -                                                                                                                       | Organization identifier from MDAA configuration that serves as the top-level namespace for all AWS resource names |

###### <a name="sagemakerBlueprint_domainConfig_props_naming_props_cdkNode"></a>4.6.18.17.1.1. Property `root > sagemakerBlueprint > domainConfig > props > naming > props > cdkNode`

|                           |                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                       |
| **Required**              | Yes                                                                                                            |
| **Additional properties** | Not allowed                                                                                                    |
| **Same definition as**    | [node](#sagemakerBlueprint_domainConfig_domainConfigCr_handlerFunction__connections_securityGroups_items_node) |

**Description:** CDK construct node providing access to context values for custom naming implementations

###### <a name="sagemakerBlueprint_domainConfig_props_naming_props_domain"></a>4.6.18.17.1.2. Property `root > sagemakerBlueprint > domainConfig > props > naming > props > domain`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Domain identifier from MDAA configuration representing logical business or organizational boundaries

###### <a name="sagemakerBlueprint_domainConfig_props_naming_props_env"></a>4.6.18.17.1.3. Property `root > sagemakerBlueprint > domainConfig > props > naming > props > env`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Environment identifier from MDAA configuration that distinguishes deployment stages within the same domain

###### <a name="sagemakerBlueprint_domainConfig_props_naming_props_moduleName"></a>4.6.18.17.1.4. Property `root > sagemakerBlueprint > domainConfig > props > naming > props > moduleName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Module name from MDAA configuration identifying the specific MDAA module deployment within a domain/environment

###### <a name="sagemakerBlueprint_domainConfig_props_naming_props_org"></a>4.6.18.17.1.5. Property `root > sagemakerBlueprint > domainConfig > props > naming > props > org`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Organization identifier from MDAA configuration that serves as the top-level namespace for all AWS resource names

##### <a name="sagemakerBlueprint_domainConfig_props_projectIds"></a>4.6.18.18. Property `root > sagemakerBlueprint > domainConfig > props > projectIds`

|                           |                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                      |
| **Required**              | No                                                                                                                            |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_domainConfig_props_projectIds_additionalProperties) |

| Property                                                                      | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#sagemakerBlueprint_domainConfig_props_projectIds_additionalProperties ) | No      | string | No         | -          | -                 |

###### <a name="sagemakerBlueprint_domainConfig_props_projectIds_additionalProperties"></a>4.6.18.18.1. Property `root > sagemakerBlueprint > domainConfig > props > projectIds > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="sagemakerBlueprint_domainConfig_props_refresh"></a>4.6.18.19. Property `root > sagemakerBlueprint > domainConfig > props > refresh`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

##### <a name="sagemakerBlueprint_domainConfig_props_ssmParamBase"></a>4.6.18.20. Property `root > sagemakerBlueprint > domainConfig > props > ssmParamBase`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** SSM parameter base path for domain configuration storage enabling centralized configuration management

#### <a name="sagemakerBlueprint_domainConfig_ssmParamBase"></a>4.6.19. Property `root > sagemakerBlueprint > domainConfig > ssmParamBase`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="sagemakerBlueprint_domainConfigSSMParam"></a>4.7. Property `root > sagemakerBlueprint > domainConfigSSMParam`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Q-ENHANCED-PROPERTY
Optional SSM parameter reference for domain configuration enabling dynamic domain configuration management. Specifies the SSM parameter containing domain configuration data for flexible domain setup and configuration management.

Use cases: Dynamic configuration; SSM parameter reference; Configuration management; Flexible setup

AWS: AWS Systems Manager parameter for DataZone domain configuration reference

Validation: Must be valid SSM parameter name if provided; parameter must contain valid domain configuration

### <a name="sagemakerBlueprint_enabledRegions"></a>4.8. Property `root > sagemakerBlueprint > enabledRegions`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                  | Description |
| ---------------------------------------------------------------- | ----------- |
| [enabledRegions items](#sagemakerBlueprint_enabledRegions_items) | -           |

#### <a name="sagemakerBlueprint_enabledRegions_items"></a>4.8.1. root > sagemakerBlueprint > enabledRegions > enabledRegions items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="sagemakerBlueprint_parameters"></a>4.9. Property `root > sagemakerBlueprint > parameters`

|                           |                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                   |
| **Required**              | No                                                                                                         |
| **Additional properties** | [Each additional property must conform to the schema](#sagemakerBlueprint_parameters_additionalProperties) |

**Description:** Q-ENHANCED-PROPERTY
Optional object containing named parameter configurations for the SageMaker blueprint. Enables parameterized blueprint deployment with validation rules and user input constraints.

Use cases: Product parameterization; User input collection; Deployment customization

AWS: AWS SageMaker blueprint parameters for user-configurable deployment options

Validation: Must be object with string keys and valid MdaaServiceCatalogParameterConfig values if provided
  *

| Property                                                   | Pattern | Type   | Deprecated | Definition                                                                                                                                                                                         | Title/Description |
| ---------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| - [](#sagemakerBlueprint_parameters_additionalProperties ) | No      | object | No         | Same as [sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties ) | -                 |

#### <a name="sagemakerBlueprint_parameters_additionalProperties"></a>4.9.1. Property `root > sagemakerBlueprint > parameters > MdaaSageMakerBluePrintParameterConfig`

|                           |                                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                  |
| **Required**              | No                                                                                                                                                                                        |
| **Additional properties** | Not allowed                                                                                                                                                                               |
| **Same definition as**    | [sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties) |

### <a name="sagemakerBlueprint_provisioningRole"></a>4.10. Property `root > sagemakerBlueprint > provisioningRole`

|                           |                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                         |
| **Required**              | Yes                                                                                              |
| **Additional properties** | Not allowed                                                                                      |
| **Same definition as**    | [provisioningRole](#sagemakerBlueprint_additionalAccounts_additionalProperties_provisioningRole) |

## <a name="service_catalog_product_config"></a>5. Property `root > service_catalog_product_config`

|                           |                                               |
| ------------------------- | --------------------------------------------- |
| **Type**                  | `object`                                      |
| **Required**              | No                                            |
| **Additional properties** | Not allowed                                   |
| **Defined in**            | #/definitions/MdaaServiceCatalogProductConfig |

**Description:** Q-ENHANCED-PROPERTY
Optional Service Catalog product configuration for governed self-service deployment enabling controlled infrastructure provisioning and governance. When specified, deploys the module as a Service Catalog product instead of direct deployment for governed access and compliance.

Use cases: Governed deployment; Self-service provisioning; Service Catalog integration; Controlled access

AWS: Service Catalog product configuration for governed infrastructure deployment and self-service provisioning

Validation: Must be valid MdaaServiceCatalogProductConfig if provided; enables Service Catalog deployment mode

| Property                                                                          | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                             |
| --------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| - [launch_role_name](#service_catalog_product_config_launch_role_name )           | No      | string | No         | -          | IAM role name that will be used to launch the Service Catalog product                                         |
| + [name](#service_catalog_product_config_name )                                   | No      | string | No         | -          | Display name for the Service Catalog product that will be visible to end users in the Service Catalog console |
| + [owner](#service_catalog_product_config_owner )                                 | No      | string | No         | -          | Owner identifier for the Service Catalog product, typically representing the team or organization             |
| - [parameters](#service_catalog_product_config_parameters )                       | No      | object | No         | -          | Object containing named parameter configurations for the Service Catalog product                              |
| + [portfolio_arn](#service_catalog_product_config_portfolio_arn )                 | No      | string | No         | -          | ARN of the AWS Service Catalog portfolio where the product will be associated                                 |
| + [portfolio_bucket_name](#service_catalog_product_config_portfolio_bucket_name ) | No      | string | No         | -          | -                                                                                                             |

### <a name="service_catalog_product_config_launch_role_name"></a>5.1. Property `root > service_catalog_product_config > launch_role_name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** IAM role name that will be used to launch the Service Catalog product

### <a name="service_catalog_product_config_name"></a>5.2. Property `root > service_catalog_product_config > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Display name for the Service Catalog product that will be visible to end users in the Service Catalog console

### <a name="service_catalog_product_config_owner"></a>5.3. Property `root > service_catalog_product_config > owner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Owner identifier for the Service Catalog product, typically representing the team or organization

### <a name="service_catalog_product_config_parameters"></a>5.4. Property `root > service_catalog_product_config > parameters`

|                           |                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                               |
| **Required**              | No                                                                                                                     |
| **Additional properties** | [Each additional property must conform to the schema](#service_catalog_product_config_parameters_additionalProperties) |

**Description:** Object containing named parameter configurations for the Service Catalog product

| Property                                                               | Pattern | Type   | Deprecated | Definition                                         | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogParameterConfig | -                 |

#### <a name="service_catalog_product_config_parameters_additionalProperties"></a>5.4.1. Property `root > service_catalog_product_config > parameters > MdaaServiceCatalogParameterConfig`

|                           |                                                 |
| ------------------------- | ----------------------------------------------- |
| **Type**                  | `object`                                        |
| **Required**              | No                                              |
| **Additional properties** | Not allowed                                     |
| **Defined in**            | #/definitions/MdaaServiceCatalogParameterConfig |

| Property                                                                                      | Pattern | Type   | Deprecated | Definition                                                                                                                          | Title/Description                                                                                           |
| --------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| - [constraints](#service_catalog_product_config_parameters_additionalProperties_constraints ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintConfig                                                                                 | Constraint configuration that defines additional validation rules for the Service Catalog product parameter |
| + [props](#service_catalog_product_config_parameters_additionalProperties_props )             | No      | object | No         | Same as [cfnParamProps](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps ) | CloudFormation parameter properties that define the parameter characteristics including type,               |

##### <a name="service_catalog_product_config_parameters_additionalProperties_constraints"></a>5.4.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints`

|                           |                                                  |
| ------------------------- | ------------------------------------------------ |
| **Type**                  | `object`                                         |
| **Required**              | No                                               |
| **Additional properties** | Not allowed                                      |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintConfig |

**Description:** Constraint configuration that defines additional validation rules for the Service Catalog product parameter

| Property                                                                                                  | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                |
| --------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------- |
| + [description](#service_catalog_product_config_parameters_additionalProperties_constraints_description ) | No      | string | No         | -          | Human-readable description explaining the purpose and scope of the Service Catalog constraint                    |
| + [rules](#service_catalog_product_config_parameters_additionalProperties_constraints_rules )             | No      | object | No         | -          | Object containing named constraint rules that define the validation logic for Service Catalog product parameters |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_description"></a>5.4.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Human-readable description explaining the purpose and scope of the Service Catalog constraint

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules"></a>5.4.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules`

|                           |                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                      |
| **Required**              | Yes                                                                                                                                                           |
| **Additional properties** | [Each additional property must conform to the schema](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties) |

**Description:** Object containing named constraint rules that define the validation logic for Service Catalog product parameters

| Property                                                                                                      | Pattern | Type   | Deprecated | Definition                                              | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleConfig | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties"></a>5.4.1.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > MdaaServiceCatalogConstraintRuleConfig`

|                           |                                                      |
| ------------------------- | ---------------------------------------------------- |
| **Type**                  | `object`                                             |
| **Required**              | No                                                   |
| **Additional properties** | Not allowed                                          |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleConfig |

| Property                                                                                                                           | Pattern | Type   | Deprecated | Definition                                                         | Title/Description                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| + [assertions](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions ) | No      | array  | No         | -                                                                  | Array of constraint assertions that define the validation logic to be applied when the condition is met |
| + [condition](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition )   | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig | Condition configuration that determines when the constraint rule assertions should be evaluated         |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions"></a>5.4.1.1.2.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** Array of constraint assertions that define the validation logic to be applied when the condition is met

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items"></a>5.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

|                           |                                                               |
| ------------------------- | ------------------------------------------------------------- |
| **Type**                  | `object`                                                      |
| **Required**              | No                                                            |
| **Additional properties** | Not allowed                                                   |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleAssertionConfig |

| Property                                                                                                                                              | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------------------------------------------------------------------------------- |
| + [assert](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert )           | No      | string | No         | -          | Constraint assertion expression that defines the validation logic for Service Catalog product parameters |
| + [description](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description ) | No      | string | No         | -          | Human-readable description explaining the purpose and requirements of the constraint assertion           |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert"></a>5.4.1.1.2.1.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > assert`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Constraint assertion expression that defines the validation logic for Service Catalog product parameters

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description"></a>5.4.1.1.2.1.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Human-readable description explaining the purpose and requirements of the constraint assertion

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition"></a>5.4.1.1.2.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > condition`

|                           |                                                                 |
| ------------------------- | --------------------------------------------------------------- |
| **Type**                  | `object`                                                        |
| **Required**              | Yes                                                             |
| **Additional properties** | Any type allowed                                                |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig |

**Description:** Condition configuration that determines when the constraint rule assertions should be evaluated

##### <a name="service_catalog_product_config_parameters_additionalProperties_props"></a>5.4.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props`

|                           |                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                   |
| **Required**              | Yes                                                                                                                        |
| **Additional properties** | Not allowed                                                                                                                |
| **Same definition as**    | [cfnParamProps](#sagemakerBlueprint_additionalAccounts_additionalProperties_parameters_additionalProperties_cfnParamProps) |

**Description:** CloudFormation parameter properties that define the parameter characteristics including type,

### <a name="service_catalog_product_config_portfolio_arn"></a>5.5. Property `root > service_catalog_product_config > portfolio_arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** ARN of the AWS Service Catalog portfolio where the product will be associated

### <a name="service_catalog_product_config_portfolio_bucket_name"></a>5.6. Property `root > service_catalog_product_config > portfolio_bucket_name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="sharedFolders"></a>6. Property `root > sharedFolders`

|                           |                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                   |
| **Required**              | No                                                                                         |
| **Additional properties** | [Each additional property must conform to the schema](#sharedFolders_additionalProperties) |

**Description:** Named shared folder configurations for collaborative QuickSight workspace management.
Each folder supports hierarchical sub-folders and principal-based permissions
(READER_FOLDER or AUTHOR_FOLDER actions).

Use cases: Team-based BI workspaces; Dev/test/prod folder separation; Asset organization

AWS: QuickSight shared folders with hierarchical structure and permission management

Validation: Optional; map of string keys to SharedFoldersProps

| Property                                   | Pattern | Type   | Deprecated | Definition                          | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------ | ------- | ------ | ---------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [](#sharedFolders_additionalProperties ) | No      | object | No         | In #/definitions/SharedFoldersProps | Shared folder configuration with permissions and optional nested sub-folders.<br />Folders organize QuickSight assets (dashboards, analyses, datasets) with<br />hierarchical structure and per-folder access control.<br /><br />Use cases: Environment-based folder hierarchy (dev/test/prod); Team workspace isolation; Asset organization<br /><br />AWS: QuickSight shared folders via custom resource<br /><br />Validation: permissions required; folders optional for nesting |

### <a name="sharedFolders_additionalProperties"></a>6.1. Property `root > sharedFolders > SharedFoldersProps`

|                           |                                  |
| ------------------------- | -------------------------------- |
| **Type**                  | `object`                         |
| **Required**              | No                               |
| **Additional properties** | Not allowed                      |
| **Defined in**            | #/definitions/SharedFoldersProps |

**Description:** Shared folder configuration with permissions and optional nested sub-folders.
Folders organize QuickSight assets (dashboards, analyses, datasets) with
hierarchical structure and per-folder access control.

Use cases: Environment-based folder hierarchy (dev/test/prod); Team workspace isolation; Asset organization

AWS: QuickSight shared folders via custom resource

Validation: permissions required; folders optional for nesting

| Property                                                          | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [folders](#sharedFolders_additionalProperties_folders )         | No      | object | No         | -          | Nested child folders inheriting the parent's organizational context.<br />Each child folder has its own permissions and can contain further sub-folders.<br /><br />Use cases: Working/publishing sub-folder separation; Hierarchical asset organization<br /><br />AWS: QuickSight nested shared folders<br /><br />Validation: Optional; map of folder name to SharedFoldersProps |
| + [permissions](#sharedFolders_additionalProperties_permissions ) | No      | array  | No         | -          | Permission entries controlling who can access this folder and at what level.<br /><br />Use cases: Multi-group access control; Reader/Author separation per folder<br /><br />AWS: QuickSight folder permissions<br /><br />Validation: Required; array of SharedFoldersPermissionsProps                                                                                            |

#### <a name="sharedFolders_additionalProperties_folders"></a>6.1.1. Property `root > sharedFolders > additionalProperties > folders`

|                           |                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                |
| **Required**              | No                                                                                                                      |
| **Additional properties** | [Each additional property must conform to the schema](#sharedFolders_additionalProperties_folders_additionalProperties) |

**Description:** Nested child folders inheriting the parent's organizational context.
Each child folder has its own permissions and can contain further sub-folders.

Use cases: Working/publishing sub-folder separation; Hierarchical asset organization

AWS: QuickSight nested shared folders

Validation: Optional; map of folder name to SharedFoldersProps

| Property                                                                | Pattern | Type   | Deprecated | Definition                                                                         | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------- | ------- | ------ | ---------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [](#sharedFolders_additionalProperties_folders_additionalProperties ) | No      | object | No         | Same as [sharedFolders_additionalProperties](#sharedFolders_additionalProperties ) | Shared folder configuration with permissions and optional nested sub-folders.<br />Folders organize QuickSight assets (dashboards, analyses, datasets) with<br />hierarchical structure and per-folder access control.<br /><br />Use cases: Environment-based folder hierarchy (dev/test/prod); Team workspace isolation; Asset organization<br /><br />AWS: QuickSight shared folders via custom resource<br /><br />Validation: permissions required; folders optional for nesting |

##### <a name="sharedFolders_additionalProperties_folders_additionalProperties"></a>6.1.1.1. Property `root > sharedFolders > additionalProperties > folders > SharedFoldersProps`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | Not allowed                                                               |
| **Same definition as**    | [sharedFolders_additionalProperties](#sharedFolders_additionalProperties) |

**Description:** Shared folder configuration with permissions and optional nested sub-folders.
Folders organize QuickSight assets (dashboards, analyses, datasets) with
hierarchical structure and per-folder access control.

Use cases: Environment-based folder hierarchy (dev/test/prod); Team workspace isolation; Asset organization

AWS: QuickSight shared folders via custom resource

Validation: permissions required; folders optional for nesting

#### <a name="sharedFolders_additionalProperties_permissions"></a>6.1.2. Property `root > sharedFolders > additionalProperties > permissions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** Permission entries controlling who can access this folder and at what level.

Use cases: Multi-group access control; Reader/Author separation per folder

AWS: QuickSight folder permissions

Validation: Required; array of SharedFoldersPermissionsProps

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                        | Description                                                                                  |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [SharedFoldersPermissionsProps](#sharedFolders_additionalProperties_permissions_items) | Permission entry for a QuickSight shared folder, mapping a principal to a folder action. ... |

##### <a name="sharedFolders_additionalProperties_permissions_items"></a>6.1.2.1. root > sharedFolders > additionalProperties > permissions > SharedFoldersPermissionsProps

|                           |                                             |
| ------------------------- | ------------------------------------------- |
| **Type**                  | `object`                                    |
| **Required**              | No                                          |
| **Additional properties** | Not allowed                                 |
| **Defined in**            | #/definitions/SharedFoldersPermissionsProps |

**Description:** Permission entry for a QuickSight shared folder, mapping a principal to a folder action.

Use cases: Folder read access for consumers; Author access for BI developers

AWS: QuickSight shared folder permissions

Validation: Both principal and actions are required

| Property                                                                        | Pattern | Type             | Deprecated | Definition                     | Title/Description                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| + [actions](#sharedFolders_additionalProperties_permissions_items_actions )     | No      | enum (of string) | No         | In #/definitions/FolderActions | Folder permission level granted to the principal.<br /><br />Use cases: Read-only dashboard consumers; Full authoring access for BI developers<br /><br />AWS: QuickSight folder actions (DescribeFolder for READER, full CRUD for AUTHOR)<br /><br />Validation: Required; 'READER_FOLDER' \| 'AUTHOR_FOLDER'     |
| + [principal](#sharedFolders_additionalProperties_permissions_items_principal ) | No      | string           | No         | -                              | Principal name referencing a QuickSight user or group from the project's principals map.<br /><br />Use cases: Group-based folder access; User-specific permissions<br /><br />AWS: QuickSight principal (user or group)<br /><br />Validation: Required; must match a key in the project principals configuration |

###### <a name="sharedFolders_additionalProperties_permissions_items_actions"></a>6.1.2.1.1. Property `root > sharedFolders > additionalProperties > permissions > permissions items > actions`

|                |                             |
| -------------- | --------------------------- |
| **Type**       | `enum (of string)`          |
| **Required**   | Yes                         |
| **Defined in** | #/definitions/FolderActions |

**Description:** Folder permission level granted to the principal.

Use cases: Read-only dashboard consumers; Full authoring access for BI developers

AWS: QuickSight folder actions (DescribeFolder for READER, full CRUD for AUTHOR)

Validation: Required; 'READER_FOLDER' | 'AUTHOR_FOLDER'

Must be one of:
* "AUTHOR_FOLDER"
* "READER_FOLDER"

###### <a name="sharedFolders_additionalProperties_permissions_items_principal"></a>6.1.2.1.2. Property `root > sharedFolders > additionalProperties > permissions > permissions items > principal`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Principal name referencing a QuickSight user or group from the project's principals map.

Use cases: Group-based folder access; User-specific permissions

AWS: QuickSight principal (user or group)

Validation: Required; must match a key in the project principals configuration

----------------------------------------------------------------------------------------------------------------------------

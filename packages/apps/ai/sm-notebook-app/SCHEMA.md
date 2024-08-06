# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                       | Title/Description                                                                                                                                    |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [assetDeploymentConfig](#assetDeploymentConfig )                   | No      | object | No         | In #/definitions/NotebookAssetDeploymentConfig   | -                                                                                                                                                    |
| - [kmsKeyArn](#kmsKeyArn )                                           | No      | string | No         | -                                                | -                                                                                                                                                    |
| - [lifecycleConfigs](#lifecycleConfigs )                             | No      | object | No         | In #/definitions/NamedLifecycleConfigProps       | -                                                                                                                                                    |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                     |
| - [notebooks](#notebooks )                                           | No      | object | No         | In #/definitions/NotebookWithIdProps             | List of sagemaker notebook instances to be launched.                                                                                                 |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |

## <a name="assetDeploymentConfig"></a>1. Property `root > assetDeploymentConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NotebookAssetDeploymentConfig             |

| Property                                                                   | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [assetBucketName](#assetDeploymentConfig_assetBucketName )               | No      | string | No         | -          | -                 |
| + [assetDeploymentRoleArn](#assetDeploymentConfig_assetDeploymentRoleArn ) | No      | string | No         | -          | -                 |
| - [assetPrefix](#assetDeploymentConfig_assetPrefix )                       | No      | string | No         | -          | -                 |
| - [memoryLimitMB](#assetDeploymentConfig_memoryLimitMB )                   | No      | number | No         | -          | -                 |

### <a name="assetDeploymentConfig_assetBucketName"></a>1.1. Property `root > assetDeploymentConfig > assetBucketName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="assetDeploymentConfig_assetDeploymentRoleArn"></a>1.2. Property `root > assetDeploymentConfig > assetDeploymentRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="assetDeploymentConfig_assetPrefix"></a>1.3. Property `root > assetDeploymentConfig > assetPrefix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="assetDeploymentConfig_memoryLimitMB"></a>1.4. Property `root > assetDeploymentConfig > memoryLimitMB`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

## <a name="kmsKeyArn"></a>2. Property `root > kmsKeyArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

## <a name="lifecycleConfigs"></a>3. Property `root > lifecycleConfigs`

|                           |                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                   |
| **Required**              | No                                                                                                                         |
| **Additional properties** | [[Should-conform]](#lifecycleConfigs_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedLifecycleConfigProps                                                                                    |

| Property                                      | Pattern | Type   | Deprecated | Definition                                    | Title/Description |
| --------------------------------------------- | ------- | ------ | ---------- | --------------------------------------------- | ----------------- |
| - [](#lifecycleConfigs_additionalProperties ) | No      | object | No         | In #/definitions/NotebookLifeCycleConfigProps | -                 |

### <a name="lifecycleConfigs_additionalProperties"></a>3.1. Property `root > lifecycleConfigs > NotebookLifeCycleConfigProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NotebookLifeCycleConfigProps              |

| Property                                                       | Pattern | Type   | Deprecated | Definition                                                           | Title/Description |
| -------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------------------------- | ----------------- |
| - [onCreate](#lifecycleConfigs_additionalProperties_onCreate ) | No      | object | No         | In #/definitions/LifecycleScriptProps                                | -                 |
| - [onStart](#lifecycleConfigs_additionalProperties_onStart )   | No      | object | No         | Same as [onCreate](#lifecycleConfigs_additionalProperties_onCreate ) | -                 |

#### <a name="lifecycleConfigs_additionalProperties_onCreate"></a>3.1.1. Property `root > lifecycleConfigs > additionalProperties > onCreate`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/LifecycleScriptProps                      |

| Property                                                            | Pattern | Type            | Deprecated | Definition                       | Title/Description |
| ------------------------------------------------------------------- | ------- | --------------- | ---------- | -------------------------------- | ----------------- |
| - [assets](#lifecycleConfigs_additionalProperties_onCreate_assets ) | No      | object          | No         | In #/definitions/NamedAssetProps | -                 |
| + [cmds](#lifecycleConfigs_additionalProperties_onCreate_cmds )     | No      | array of string | No         | -                                | -                 |

##### <a name="lifecycleConfigs_additionalProperties_onCreate_assets"></a>3.1.1.1. Property `root > lifecycleConfigs > additionalProperties > onCreate > assets`

|                           |                                                                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                        |
| **Required**              | No                                                                                                                                                              |
| **Additional properties** | [[Should-conform]](#lifecycleConfigs_additionalProperties_onCreate_assets_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedAssetProps                                                                                                                                   |

| Property                                                                           | Pattern | Type   | Deprecated | Definition                  | Title/Description |
| ---------------------------------------------------------------------------------- | ------- | ------ | ---------- | --------------------------- | ----------------- |
| - [](#lifecycleConfigs_additionalProperties_onCreate_assets_additionalProperties ) | No      | object | No         | In #/definitions/AssetProps | -                 |

###### <a name="lifecycleConfigs_additionalProperties_onCreate_assets_additionalProperties"></a>3.1.1.1.1. Property `root > lifecycleConfigs > additionalProperties > onCreate > assets > AssetProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/AssetProps                                |

| Property                                                                                                | Pattern | Type            | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [exclude](#lifecycleConfigs_additionalProperties_onCreate_assets_additionalProperties_exclude )       | No      | array of string | No         | -          | -                 |
| + [sourcePath](#lifecycleConfigs_additionalProperties_onCreate_assets_additionalProperties_sourcePath ) | No      | string          | No         | -          | -                 |

###### <a name="lifecycleConfigs_additionalProperties_onCreate_assets_additionalProperties_exclude"></a>3.1.1.1.1.1. Property `root > lifecycleConfigs > additionalProperties > onCreate > assets > additionalProperties > exclude`

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

| Each item of this array must be                                                                            | Description |
| ---------------------------------------------------------------------------------------------------------- | ----------- |
| [exclude items](#lifecycleConfigs_additionalProperties_onCreate_assets_additionalProperties_exclude_items) | -           |

###### <a name="autogenerated_heading_2"></a>3.1.1.1.1.1.1. root > lifecycleConfigs > additionalProperties > onCreate > assets > additionalProperties > exclude > exclude items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="lifecycleConfigs_additionalProperties_onCreate_assets_additionalProperties_sourcePath"></a>3.1.1.1.1.2. Property `root > lifecycleConfigs > additionalProperties > onCreate > assets > additionalProperties > sourcePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="lifecycleConfigs_additionalProperties_onCreate_cmds"></a>3.1.1.2. Property `root > lifecycleConfigs > additionalProperties > onCreate > cmds`

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

| Each item of this array must be                                          | Description |
| ------------------------------------------------------------------------ | ----------- |
| [cmds items](#lifecycleConfigs_additionalProperties_onCreate_cmds_items) | -           |

###### <a name="autogenerated_heading_3"></a>3.1.1.2.1. root > lifecycleConfigs > additionalProperties > onCreate > cmds > cmds items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="lifecycleConfigs_additionalProperties_onStart"></a>3.1.2. Property `root > lifecycleConfigs > additionalProperties > onStart`

|                           |                                                             |
| ------------------------- | ----------------------------------------------------------- |
| **Type**                  | `object`                                                    |
| **Required**              | No                                                          |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")     |
| **Same definition as**    | [onCreate](#lifecycleConfigs_additionalProperties_onCreate) |

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

#### <a name="autogenerated_heading_4"></a>4.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

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

###### <a name="autogenerated_heading_5"></a>4.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

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

## <a name="notebooks"></a>5. Property `root > notebooks`

|                           |                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                            |
| **Required**              | No                                                                                                                  |
| **Additional properties** | [[Should-conform]](#notebooks_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NotebookWithIdProps                                                                                   |

**Description:** List of sagemaker notebook instances to be launched.

| Property                               | Pattern | Type   | Deprecated | Definition                     | Title/Description |
| -------------------------------------- | ------- | ------ | ---------- | ------------------------------ | ----------------- |
| - [](#notebooks_additionalProperties ) | No      | object | No         | In #/definitions/NotebookProps | -                 |

### <a name="notebooks_additionalProperties"></a>5.1. Property `root > notebooks > NotebookProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NotebookProps                             |

| Property                                                                                                        | Pattern | Type            | Deprecated | Definition                                                                          | Title/Description                                                            |
| --------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| - [acceleratorTypes](#notebooks_additionalProperties_acceleratorTypes )                                         | No      | array of string | No         | -                                                                                   | -                                                                            |
| - [additionalCodeRepositories](#notebooks_additionalProperties_additionalCodeRepositories )                     | No      | array of string | No         | -                                                                                   | -                                                                            |
| - [defaultCodeRepository](#notebooks_additionalProperties_defaultCodeRepository )                               | No      | string          | No         | -                                                                                   | -                                                                            |
| - [instanceMetadataServiceConfiguration](#notebooks_additionalProperties_instanceMetadataServiceConfiguration ) | No      | object          | No         | In #/definitions/InstanceMetadataServiceConfiguration                               | -                                                                            |
| + [instanceType](#notebooks_additionalProperties_instanceType )                                                 | No      | string          | No         | -                                                                                   | -                                                                            |
| - [lifecycleConfigName](#notebooks_additionalProperties_lifecycleConfigName )                                   | No      | string          | No         | -                                                                                   | -                                                                            |
| - [notebookName](#notebooks_additionalProperties_notebookName )                                                 | No      | string          | No         | -                                                                                   | -                                                                            |
| + [notebookRole](#notebooks_additionalProperties_notebookRole )                                                 | No      | object          | No         | In #/definitions/MdaaRoleRef                                                        | A reference to an IAM role. Roles can be referenced by name, arn, and/or id. |
| - [platformIdentifier](#notebooks_additionalProperties_platformIdentifier )                                     | No      | string          | No         | -                                                                                   | -                                                                            |
| - [rootAccess](#notebooks_additionalProperties_rootAccess )                                                     | No      | boolean         | No         | -                                                                                   | -                                                                            |
| - [securityGroupEgress](#notebooks_additionalProperties_securityGroupEgress )                                   | No      | object          | No         | In #/definitions/MdaaSecurityGroupRuleProps                                         | -                                                                            |
| - [securityGroupId](#notebooks_additionalProperties_securityGroupId )                                           | No      | string          | No         | -                                                                                   | -                                                                            |
| - [securityGroupIngress](#notebooks_additionalProperties_securityGroupIngress )                                 | No      | object          | No         | Same as [securityGroupEgress](#notebooks_additionalProperties_securityGroupEgress ) | -                                                                            |
| + [subnetId](#notebooks_additionalProperties_subnetId )                                                         | No      | string          | No         | -                                                                                   | -                                                                            |
| - [volumeSizeInGb](#notebooks_additionalProperties_volumeSizeInGb )                                             | No      | number          | No         | -                                                                                   | -                                                                            |
| + [vpcId](#notebooks_additionalProperties_vpcId )                                                               | No      | string          | No         | -                                                                                   | -                                                                            |

#### <a name="notebooks_additionalProperties_acceleratorTypes"></a>5.1.1. Property `root > notebooks > additionalProperties > acceleratorTypes`

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

| Each item of this array must be                                                  | Description |
| -------------------------------------------------------------------------------- | ----------- |
| [acceleratorTypes items](#notebooks_additionalProperties_acceleratorTypes_items) | -           |

##### <a name="autogenerated_heading_6"></a>5.1.1.1. root > notebooks > additionalProperties > acceleratorTypes > acceleratorTypes items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="notebooks_additionalProperties_additionalCodeRepositories"></a>5.1.2. Property `root > notebooks > additionalProperties > additionalCodeRepositories`

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

| Each item of this array must be                                                                      | Description |
| ---------------------------------------------------------------------------------------------------- | ----------- |
| [additionalCodeRepositories items](#notebooks_additionalProperties_additionalCodeRepositories_items) | -           |

##### <a name="autogenerated_heading_7"></a>5.1.2.1. root > notebooks > additionalProperties > additionalCodeRepositories > additionalCodeRepositories items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="notebooks_additionalProperties_defaultCodeRepository"></a>5.1.3. Property `root > notebooks > additionalProperties > defaultCodeRepository`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="notebooks_additionalProperties_instanceMetadataServiceConfiguration"></a>5.1.4. Property `root > notebooks > additionalProperties > instanceMetadataServiceConfiguration`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/InstanceMetadataServiceConfiguration      |

| Property                                                                                                                                               | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------- |
| + [minimumInstanceMetadataServiceVersion](#notebooks_additionalProperties_instanceMetadataServiceConfiguration_minimumInstanceMetadataServiceVersion ) | No      | string | No         | -          | -                 |

##### <a name="notebooks_additionalProperties_instanceMetadataServiceConfiguration_minimumInstanceMetadataServiceVersion"></a>5.1.4.1. Property `root > notebooks > additionalProperties > instanceMetadataServiceConfiguration > minimumInstanceMetadataServiceVersion`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="notebooks_additionalProperties_instanceType"></a>5.1.5. Property `root > notebooks > additionalProperties > instanceType`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="notebooks_additionalProperties_lifecycleConfigName"></a>5.1.6. Property `root > notebooks > additionalProperties > lifecycleConfigName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="notebooks_additionalProperties_notebookName"></a>5.1.7. Property `root > notebooks > additionalProperties > notebookName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="notebooks_additionalProperties_notebookRole"></a>5.1.8. Property `root > notebooks > additionalProperties > notebookRole`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaRoleRef                               |

**Description:** A reference to an IAM role. Roles can be referenced by name, arn, and/or id.

| Property                                                               | Pattern | Type    | Deprecated | Definition | Title/Description                                                                             |
| ---------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | --------------------------------------------------------------------------------------------- |
| - [arn](#notebooks_additionalProperties_notebookRole_arn )             | No      | string  | No         | -          | Reference role by arn                                                                         |
| - [id](#notebooks_additionalProperties_notebookRole_id )               | No      | string  | No         | -          | Reference role by id                                                                          |
| - [immutable](#notebooks_additionalProperties_notebookRole_immutable ) | No      | boolean | No         | -          | Indicates whether the role should be considered immutable (defaults false)                    |
| - [name](#notebooks_additionalProperties_notebookRole_name )           | No      | string  | No         | -          | Reference role by name                                                                        |
| - [refId](#notebooks_additionalProperties_notebookRole_refId )         | No      | string  | No         | -          | A string which uniquely identifies the MdaaRoleRef within a scope.                            |
| - [sso](#notebooks_additionalProperties_notebookRole_sso )             | No      | boolean | No         | -          | If true, role name will be resolved to an SSO auto-generated role. Also implies immutability. |

##### <a name="notebooks_additionalProperties_notebookRole_arn"></a>5.1.8.1. Property `root > notebooks > additionalProperties > notebookRole > arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by arn

##### <a name="notebooks_additionalProperties_notebookRole_id"></a>5.1.8.2. Property `root > notebooks > additionalProperties > notebookRole > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by id

##### <a name="notebooks_additionalProperties_notebookRole_immutable"></a>5.1.8.3. Property `root > notebooks > additionalProperties > notebookRole > immutable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Indicates whether the role should be considered immutable (defaults false)

##### <a name="notebooks_additionalProperties_notebookRole_name"></a>5.1.8.4. Property `root > notebooks > additionalProperties > notebookRole > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by name

##### <a name="notebooks_additionalProperties_notebookRole_refId"></a>5.1.8.5. Property `root > notebooks > additionalProperties > notebookRole > refId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A string which uniquely identifies the MdaaRoleRef within a scope.

##### <a name="notebooks_additionalProperties_notebookRole_sso"></a>5.1.8.6. Property `root > notebooks > additionalProperties > notebookRole > sso`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true, role name will be resolved to an SSO auto-generated role. Also implies immutability.

#### <a name="notebooks_additionalProperties_platformIdentifier"></a>5.1.9. Property `root > notebooks > additionalProperties > platformIdentifier`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="notebooks_additionalProperties_rootAccess"></a>5.1.10. Property `root > notebooks > additionalProperties > rootAccess`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

#### <a name="notebooks_additionalProperties_securityGroupEgress"></a>5.1.11. Property `root > notebooks > additionalProperties > securityGroupEgress`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaSecurityGroupRuleProps                |

| Property                                                                        | Pattern | Type  | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------- | ------- | ----- | ---------- | ---------- | ----------------- |
| - [ipv4](#notebooks_additionalProperties_securityGroupEgress_ipv4 )             | No      | array | No         | -          | -                 |
| - [prefixList](#notebooks_additionalProperties_securityGroupEgress_prefixList ) | No      | array | No         | -          | -                 |
| - [sg](#notebooks_additionalProperties_securityGroupEgress_sg )                 | No      | array | No         | -          | -                 |

##### <a name="notebooks_additionalProperties_securityGroupEgress_ipv4"></a>5.1.11.1. Property `root > notebooks > additionalProperties > securityGroupEgress > ipv4`

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
| [MdaaCidrPeer](#notebooks_additionalProperties_securityGroupEgress_ipv4_items) | -           |

###### <a name="autogenerated_heading_8"></a>5.1.11.1.1. root > notebooks > additionalProperties > securityGroupEgress > ipv4 > MdaaCidrPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaCidrPeer                              |

| Property                                                                                       | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [cidr](#notebooks_additionalProperties_securityGroupEgress_ipv4_items_cidr )                 | No      | string | No         | -          | -                 |
| - [description](#notebooks_additionalProperties_securityGroupEgress_ipv4_items_description )   | No      | string | No         | -          | -                 |
| - [port](#notebooks_additionalProperties_securityGroupEgress_ipv4_items_port )                 | No      | number | No         | -          | -                 |
| + [protocol](#notebooks_additionalProperties_securityGroupEgress_ipv4_items_protocol )         | No      | string | No         | -          | -                 |
| - [suppressions](#notebooks_additionalProperties_securityGroupEgress_ipv4_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#notebooks_additionalProperties_securityGroupEgress_ipv4_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="notebooks_additionalProperties_securityGroupEgress_ipv4_items_cidr"></a>5.1.11.1.1.1. Property `root > notebooks > additionalProperties > securityGroupEgress > ipv4 > ipv4 items > cidr`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="notebooks_additionalProperties_securityGroupEgress_ipv4_items_description"></a>5.1.11.1.1.2. Property `root > notebooks > additionalProperties > securityGroupEgress > ipv4 > ipv4 items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="notebooks_additionalProperties_securityGroupEgress_ipv4_items_port"></a>5.1.11.1.1.3. Property `root > notebooks > additionalProperties > securityGroupEgress > ipv4 > ipv4 items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="notebooks_additionalProperties_securityGroupEgress_ipv4_items_protocol"></a>5.1.11.1.1.4. Property `root > notebooks > additionalProperties > securityGroupEgress > ipv4 > ipv4 items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="notebooks_additionalProperties_securityGroupEgress_ipv4_items_suppressions"></a>5.1.11.1.1.5. Property `root > notebooks > additionalProperties > securityGroupEgress > ipv4 > ipv4 items > suppressions`

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
| [NagSuppressionProps](#notebooks_additionalProperties_securityGroupEgress_ipv4_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_9"></a>5.1.11.1.1.5.1. root > notebooks > additionalProperties > securityGroupEgress > ipv4 > ipv4 items > suppressions > NagSuppressionProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NagSuppressionProps                       |

| Property                                                                                              | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#notebooks_additionalProperties_securityGroupEgress_ipv4_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#notebooks_additionalProperties_securityGroupEgress_ipv4_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="notebooks_additionalProperties_securityGroupEgress_ipv4_items_suppressions_items_id"></a>5.1.11.1.1.5.1.1. Property `root > notebooks > additionalProperties > securityGroupEgress > ipv4 > ipv4 items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="notebooks_additionalProperties_securityGroupEgress_ipv4_items_suppressions_items_reason"></a>5.1.11.1.1.5.1.2. Property `root > notebooks > additionalProperties > securityGroupEgress > ipv4 > ipv4 items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="notebooks_additionalProperties_securityGroupEgress_ipv4_items_toPort"></a>5.1.11.1.1.6. Property `root > notebooks > additionalProperties > securityGroupEgress > ipv4 > ipv4 items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

##### <a name="notebooks_additionalProperties_securityGroupEgress_prefixList"></a>5.1.11.2. Property `root > notebooks > additionalProperties > securityGroupEgress > prefixList`

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
| [MdaaPrefixListPeer](#notebooks_additionalProperties_securityGroupEgress_prefixList_items) | -           |

###### <a name="autogenerated_heading_10"></a>5.1.11.2.1. root > notebooks > additionalProperties > securityGroupEgress > prefixList > MdaaPrefixListPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaPrefixListPeer                        |

| Property                                                                                             | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#notebooks_additionalProperties_securityGroupEgress_prefixList_items_description )   | No      | string | No         | -          | -                 |
| - [port](#notebooks_additionalProperties_securityGroupEgress_prefixList_items_port )                 | No      | number | No         | -          | -                 |
| + [prefixList](#notebooks_additionalProperties_securityGroupEgress_prefixList_items_prefixList )     | No      | string | No         | -          | -                 |
| + [protocol](#notebooks_additionalProperties_securityGroupEgress_prefixList_items_protocol )         | No      | string | No         | -          | -                 |
| - [suppressions](#notebooks_additionalProperties_securityGroupEgress_prefixList_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#notebooks_additionalProperties_securityGroupEgress_prefixList_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="notebooks_additionalProperties_securityGroupEgress_prefixList_items_description"></a>5.1.11.2.1.1. Property `root > notebooks > additionalProperties > securityGroupEgress > prefixList > prefixList items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="notebooks_additionalProperties_securityGroupEgress_prefixList_items_port"></a>5.1.11.2.1.2. Property `root > notebooks > additionalProperties > securityGroupEgress > prefixList > prefixList items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="notebooks_additionalProperties_securityGroupEgress_prefixList_items_prefixList"></a>5.1.11.2.1.3. Property `root > notebooks > additionalProperties > securityGroupEgress > prefixList > prefixList items > prefixList`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="notebooks_additionalProperties_securityGroupEgress_prefixList_items_protocol"></a>5.1.11.2.1.4. Property `root > notebooks > additionalProperties > securityGroupEgress > prefixList > prefixList items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="notebooks_additionalProperties_securityGroupEgress_prefixList_items_suppressions"></a>5.1.11.2.1.5. Property `root > notebooks > additionalProperties > securityGroupEgress > prefixList > prefixList items > suppressions`

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
| [NagSuppressionProps](#notebooks_additionalProperties_securityGroupEgress_prefixList_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_11"></a>5.1.11.2.1.5.1. root > notebooks > additionalProperties > securityGroupEgress > prefixList > prefixList items > suppressions > NagSuppressionProps

|                           |                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                               |
| **Same definition as**    | [notebooks_additionalProperties_securityGroupEgress_ipv4_items_suppressions_items](#notebooks_additionalProperties_securityGroupEgress_ipv4_items_suppressions_items) |

###### <a name="notebooks_additionalProperties_securityGroupEgress_prefixList_items_toPort"></a>5.1.11.2.1.6. Property `root > notebooks > additionalProperties > securityGroupEgress > prefixList > prefixList items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

##### <a name="notebooks_additionalProperties_securityGroupEgress_sg"></a>5.1.11.3. Property `root > notebooks > additionalProperties > securityGroupEgress > sg`

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
| [MdaaSecurityGroupPeer](#notebooks_additionalProperties_securityGroupEgress_sg_items) | -           |

###### <a name="autogenerated_heading_12"></a>5.1.11.3.1. root > notebooks > additionalProperties > securityGroupEgress > sg > MdaaSecurityGroupPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaSecurityGroupPeer                     |

| Property                                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#notebooks_additionalProperties_securityGroupEgress_sg_items_description )   | No      | string | No         | -          | -                 |
| - [port](#notebooks_additionalProperties_securityGroupEgress_sg_items_port )                 | No      | number | No         | -          | -                 |
| + [protocol](#notebooks_additionalProperties_securityGroupEgress_sg_items_protocol )         | No      | string | No         | -          | -                 |
| + [sgId](#notebooks_additionalProperties_securityGroupEgress_sg_items_sgId )                 | No      | string | No         | -          | -                 |
| - [suppressions](#notebooks_additionalProperties_securityGroupEgress_sg_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#notebooks_additionalProperties_securityGroupEgress_sg_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="notebooks_additionalProperties_securityGroupEgress_sg_items_description"></a>5.1.11.3.1.1. Property `root > notebooks > additionalProperties > securityGroupEgress > sg > sg items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="notebooks_additionalProperties_securityGroupEgress_sg_items_port"></a>5.1.11.3.1.2. Property `root > notebooks > additionalProperties > securityGroupEgress > sg > sg items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="notebooks_additionalProperties_securityGroupEgress_sg_items_protocol"></a>5.1.11.3.1.3. Property `root > notebooks > additionalProperties > securityGroupEgress > sg > sg items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="notebooks_additionalProperties_securityGroupEgress_sg_items_sgId"></a>5.1.11.3.1.4. Property `root > notebooks > additionalProperties > securityGroupEgress > sg > sg items > sgId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="notebooks_additionalProperties_securityGroupEgress_sg_items_suppressions"></a>5.1.11.3.1.5. Property `root > notebooks > additionalProperties > securityGroupEgress > sg > sg items > suppressions`

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
| [NagSuppressionProps](#notebooks_additionalProperties_securityGroupEgress_sg_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_13"></a>5.1.11.3.1.5.1. root > notebooks > additionalProperties > securityGroupEgress > sg > sg items > suppressions > NagSuppressionProps

|                           |                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                               |
| **Same definition as**    | [notebooks_additionalProperties_securityGroupEgress_ipv4_items_suppressions_items](#notebooks_additionalProperties_securityGroupEgress_ipv4_items_suppressions_items) |

###### <a name="notebooks_additionalProperties_securityGroupEgress_sg_items_toPort"></a>5.1.11.3.1.6. Property `root > notebooks > additionalProperties > securityGroupEgress > sg > sg items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

#### <a name="notebooks_additionalProperties_securityGroupId"></a>5.1.12. Property `root > notebooks > additionalProperties > securityGroupId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="notebooks_additionalProperties_securityGroupIngress"></a>5.1.13. Property `root > notebooks > additionalProperties > securityGroupIngress`

|                           |                                                                            |
| ------------------------- | -------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                   |
| **Required**              | No                                                                         |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                    |
| **Same definition as**    | [securityGroupEgress](#notebooks_additionalProperties_securityGroupEgress) |

#### <a name="notebooks_additionalProperties_subnetId"></a>5.1.14. Property `root > notebooks > additionalProperties > subnetId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="notebooks_additionalProperties_volumeSizeInGb"></a>5.1.15. Property `root > notebooks > additionalProperties > volumeSizeInGb`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

#### <a name="notebooks_additionalProperties_vpcId"></a>5.1.16. Property `root > notebooks > additionalProperties > vpcId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="service_catalog_product_config"></a>6. Property `root > service_catalog_product_config`

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

### <a name="service_catalog_product_config_launch_role_name"></a>6.1. Property `root > service_catalog_product_config > launch_role_name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="service_catalog_product_config_name"></a>6.2. Property `root > service_catalog_product_config > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_owner"></a>6.3. Property `root > service_catalog_product_config > owner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_parameters"></a>6.4. Property `root > service_catalog_product_config > parameters`

|                           |                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                            |
| **Required**              | No                                                                                                                                                  |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                               | Pattern | Type   | Deprecated | Definition                                         | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogParameterConfig | -                 |

#### <a name="service_catalog_product_config_parameters_additionalProperties"></a>6.4.1. Property `root > service_catalog_product_config > parameters > MdaaServiceCatalogParameterConfig`

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

##### <a name="service_catalog_product_config_parameters_additionalProperties_constraints"></a>6.4.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_description"></a>6.4.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules"></a>6.4.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules`

|                           |                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                                                   |
| **Required**              | Yes                                                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                      | Pattern | Type   | Deprecated | Definition                                              | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleConfig | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties"></a>6.4.1.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > MdaaServiceCatalogConstraintRuleConfig`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions"></a>6.4.1.1.2.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions`

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

###### <a name="autogenerated_heading_14"></a>6.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert"></a>6.4.1.1.2.1.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > assert`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description"></a>6.4.1.1.2.1.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition"></a>6.4.1.1.2.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > condition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig           |

##### <a name="service_catalog_product_config_parameters_additionalProperties_props"></a>6.4.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedPattern"></a>6.4.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedPattern`

|              |                                                         |
| ------------ | ------------------------------------------------------- |
| **Type**     | `string`                                                |
| **Required** | No                                                      |
| **Default**  | `"- No constraints on patterns allowed for parameter."` |

**Description:** A regular expression that represents the patterns to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedValues"></a>6.4.1.2.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues`

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

###### <a name="autogenerated_heading_15"></a>6.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_constraintDescription"></a>6.4.1.2.3. Property `root > service_catalog_product_config > parameters > additionalProperties > props > constraintDescription`

|              |                                                                                        |
| ------------ | -------------------------------------------------------------------------------------- |
| **Type**     | `string`                                                                               |
| **Required** | No                                                                                     |
| **Default**  | `"- No description with customized error message when user specifies invalid values."` |

**Description:** A string that explains a constraint when the constraint is violated.
For example, without a constraint description, a parameter that has an allowed
pattern of [A-Za-z0-9]+ displays the following error message when the user specifies
an invalid value:

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_default"></a>6.4.1.2.4. Property `root > service_catalog_product_config > parameters > additionalProperties > props > default`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Default**               | `"- No default value for parameter."`                                     |

**Description:** A value of the appropriate type for the template to use if no value is specified
when a stack is created. If you define constraints for the parameter, you must specify
a value that adheres to those constraints.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_description"></a>6.4.1.2.5. Property `root > service_catalog_product_config > parameters > additionalProperties > props > description`

|              |                                         |
| ------------ | --------------------------------------- |
| **Type**     | `string`                                |
| **Required** | No                                      |
| **Default**  | `"- No description for the parameter."` |

**Description:** A string of up to 4000 characters that describes the parameter.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxLength"></a>6.4.1.2.6. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the largest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxValue"></a>6.4.1.2.7. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the largest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minLength"></a>6.4.1.2.8. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the smallest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minValue"></a>6.4.1.2.9. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the smallest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_noEcho"></a>6.4.1.2.10. Property `root > service_catalog_product_config > parameters > additionalProperties > props > noEcho`

|              |                                        |
| ------------ | -------------------------------------- |
| **Type**     | `boolean`                              |
| **Required** | No                                     |
| **Default**  | `"- Parameter values are not masked."` |

**Description:** Whether to mask the parameter value when anyone makes a call that describes the stack.
If you set the value to ``true``, the parameter value is masked with asterisks (``*****``).

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_type"></a>6.4.1.2.11. Property `root > service_catalog_product_config > parameters > additionalProperties > props > type`

|              |            |
| ------------ | ---------- |
| **Type**     | `string`   |
| **Required** | No         |
| **Default**  | `"String"` |

**Description:** The data type for the parameter (DataType).

### <a name="service_catalog_product_config_portfolio_arn"></a>6.5. Property `root > service_catalog_product_config > portfolio_arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

----------------------------------------------------------------------------------------------------------------------------
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-06 at 12:57:36 -0400

# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                 | Pattern | Type            | Deprecated | Definition                                                                                                                                  | Title/Description                                                                                                                                                                                       |
| ---------------------------------------- | ------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [context](#context )                   | No      | object          | No         | -                                                                                                                                           | Additional CDK Context key/value pairs                                                                                                                                                                  |
| - [custom_aspects](#custom_aspects )     | No      | array           | No         | -                                                                                                                                           | Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.                                                                                                                       |
| - [devops](#devops )                     | No      | object          | No         | In #/definitions/DevOpsConfigContents                                                                                                       | Configurations used when deploying MDAA DevOps resources                                                                                                                                                |
| + [domains](#domains )                   | No      | object          | No         | -                                                                                                                                           | Objects representing domains to create                                                                                                                                                                  |
| - [env_templates](#env_templates )       | No      | object          | No         | -                                                                                                                                           | Templates for environments which can be referenced throughout the config.                                                                                                                               |
| - [log_suppressions](#log_suppressions ) | No      | boolean         | No         | -                                                                                                                                           | A string representing the target region                                                                                                                                                                 |
| - [mdaa_version](#mdaa_version )         | No      | string          | No         | -                                                                                                                                           | Override the MDAA version                                                                                                                                                                               |
| - [naming_class](#naming_class )         | No      | string          | No         | -                                                                                                                                           | The MDAA Naming Class to be utilized from the Naming Module                                                                                                                                             |
| - [naming_module](#naming_module )       | No      | string          | No         | -                                                                                                                                           | The MDAA Naming Module to be utilized                                                                                                                                                                   |
| - [naming_props](#naming_props )         | No      | object          | No         | -                                                                                                                                           | Props to be passed to the custom naming class                                                                                                                                                           |
| + [organization](#organization )         | No      | string          | No         | -                                                                                                                                           | A string representing the target region                                                                                                                                                                 |
| - [region](#region )                     | No      | string          | No         | -                                                                                                                                           | A string representing the target region                                                                                                                                                                 |
| - [tag_config_data](#tag_config_data )   | No      | object          | No         | -                                                                                                                                           | Tagging data which will be passed directly to apps                                                                                                                                                      |
| - [tag_configs](#tag_configs )           | No      | array of string | No         | -                                                                                                                                           | A list of paths to tag configuration files.<br />Configurations will be compiled together in the order they appear,<br />with later configuration files taking precendence over earlier configurations. |
| - [terraform_config](#terraform_config ) | No      | object          | No         | Same as [terraform_config](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_terraform_config ) | Config properties for TF modules                                                                                                                                                                        |

## <a name="context"></a>1. Property `root > context`

|                           |                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                          |
| **Required**              | No                                                                                                                |
| **Additional properties** | [[Should-conform]](#context_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Additional CDK Context key/value pairs

| Property                             | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#context_additionalProperties ) | No      | object | No         | -          | -                 |

### <a name="context_additionalProperties"></a>1.1. Property `root > context > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

## <a name="custom_aspects"></a>2. Property `root > custom_aspects`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be           | Description |
| ----------------------------------------- | ----------- |
| [MdaaCustomAspect](#custom_aspects_items) | -           |

### <a name="autogenerated_heading_2"></a>2.1. root > custom_aspects > MdaaCustomAspect

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaCustomAspect                          |

| Property                                                | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [aspect_class](#custom_aspects_items_aspect_class )   | No      | string | No         | -          | -                 |
| + [aspect_module](#custom_aspects_items_aspect_module ) | No      | string | No         | -          | -                 |
| - [aspect_props](#custom_aspects_items_aspect_props )   | No      | object | No         | -          | -                 |

#### <a name="custom_aspects_items_aspect_class"></a>2.1.1. Property `root > custom_aspects > custom_aspects items > aspect_class`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="custom_aspects_items_aspect_module"></a>2.1.2. Property `root > custom_aspects > custom_aspects items > aspect_module`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="custom_aspects_items_aspect_props"></a>2.1.3. Property `root > custom_aspects > custom_aspects items > aspect_props`

|                           |                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                    |
| **Required**              | No                                                                                                                                          |
| **Additional properties** | [[Should-conform]](#custom_aspects_items_aspect_props_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                       | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#custom_aspects_items_aspect_props_additionalProperties ) | No      | object | No         | -          | -                 |

##### <a name="custom_aspects_items_aspect_props_additionalProperties"></a>2.1.3.1. Property `root > custom_aspects > custom_aspects items > aspect_props > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

## <a name="devops"></a>3. Property `root > devops`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DevOpsConfigContents                      |

**Description:** Configurations used when deploying MDAA DevOps resources

| Property                                                                    | Pattern | Type            | Deprecated | Definition                                                                               | Title/Description                                                                                                                                    |
| --------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [cdkBootstrapContext](#devops_cdkBootstrapContext )                       | No      | string          | No         | -                                                                                        | -                                                                                                                                                    |
| - [configsBranch](#devops_configsBranch )                                   | No      | string          | No         | -                                                                                        | -                                                                                                                                                    |
| + [configsCodeCommitRepo](#devops_configsCodeCommitRepo )                   | No      | string          | No         | -                                                                                        | -                                                                                                                                                    |
| - [deploy](#devops_deploy )                                                 | No      | object          | No         | In #/definitions/StageCommands                                                           | -                                                                                                                                                    |
| - [install](#devops_install )                                               | No      | array of string | No         | -                                                                                        | -                                                                                                                                                    |
| - [mdaaBranch](#devops_mdaaBranch )                                         | No      | string          | No         | -                                                                                        | -                                                                                                                                                    |
| + [mdaaCodeCommitRepo](#devops_mdaaCodeCommitRepo )                         | No      | string          | No         | -                                                                                        | -                                                                                                                                                    |
| - [nag_suppressions](#devops_nag_suppressions )                             | No      | object          | No         | In #/definitions/MdaaNagSuppressions                                                     | Nag suppressions                                                                                                                                     |
| - [pipelines](#devops_pipelines )                                           | No      | object          | No         | -                                                                                        | -                                                                                                                                                    |
| - [post](#devops_post )                                                     | No      | array of string | No         | -                                                                                        | -                                                                                                                                                    |
| - [postDeployValidate](#devops_postDeployValidate )                         | No      | object          | No         | Same as [postDeployValidate](#devops_pipelines_additionalProperties_postDeployValidate ) | -                                                                                                                                                    |
| - [pre](#devops_pre )                                                       | No      | array of string | No         | -                                                                                        | -                                                                                                                                                    |
| - [preDeploy](#devops_preDeploy )                                           | No      | object          | No         | Same as [deploy](#devops_deploy )                                                        | -                                                                                                                                                    |
| - [preDeployValidate](#devops_preDeployValidate )                           | No      | object          | No         | Same as [postDeployValidate](#devops_pipelines_additionalProperties_postDeployValidate ) | -                                                                                                                                                    |
| - [service_catalog_product_config](#devops_service_catalog_product_config ) | No      | object          | No         | In #/definitions/MdaaServiceCatalogProductConfig                                         | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |

### <a name="devops_cdkBootstrapContext"></a>3.1. Property `root > devops > cdkBootstrapContext`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="devops_configsBranch"></a>3.2. Property `root > devops > configsBranch`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="devops_configsCodeCommitRepo"></a>3.3. Property `root > devops > configsCodeCommitRepo`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="devops_deploy"></a>3.4. Property `root > devops > deploy`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/StageCommands                             |

| Property                             | Pattern | Type            | Deprecated | Definition | Title/Description |
| ------------------------------------ | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [install](#devops_deploy_install ) | No      | array of string | No         | -          | -                 |
| - [post](#devops_deploy_post )       | No      | array of string | No         | -          | -                 |
| - [pre](#devops_deploy_pre )         | No      | array of string | No         | -          | -                 |

#### <a name="devops_deploy_install"></a>3.4.1. Property `root > devops > deploy > install`

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

| Each item of this array must be               | Description |
| --------------------------------------------- | ----------- |
| [install items](#devops_deploy_install_items) | -           |

##### <a name="autogenerated_heading_3"></a>3.4.1.1. root > devops > deploy > install > install items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="devops_deploy_post"></a>3.4.2. Property `root > devops > deploy > post`

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

| Each item of this array must be         | Description |
| --------------------------------------- | ----------- |
| [post items](#devops_deploy_post_items) | -           |

##### <a name="autogenerated_heading_4"></a>3.4.2.1. root > devops > deploy > post > post items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="devops_deploy_pre"></a>3.4.3. Property `root > devops > deploy > pre`

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

| Each item of this array must be       | Description |
| ------------------------------------- | ----------- |
| [pre items](#devops_deploy_pre_items) | -           |

##### <a name="autogenerated_heading_5"></a>3.4.3.1. root > devops > deploy > pre > pre items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="devops_install"></a>3.5. Property `root > devops > install`

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

| Each item of this array must be        | Description |
| -------------------------------------- | ----------- |
| [install items](#devops_install_items) | -           |

#### <a name="autogenerated_heading_6"></a>3.5.1. root > devops > install > install items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="devops_mdaaBranch"></a>3.6. Property `root > devops > mdaaBranch`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="devops_mdaaCodeCommitRepo"></a>3.7. Property `root > devops > mdaaCodeCommitRepo`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="devops_nag_suppressions"></a>3.8. Property `root > devops > nag_suppressions`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaNagSuppressions                       |

**Description:** Nag suppressions

| Property                                       | Pattern | Type  | Deprecated | Definition | Title/Description |
| ---------------------------------------------- | ------- | ----- | ---------- | ---------- | ----------------- |
| + [by_path](#devops_nag_suppressions_by_path ) | No      | array | No         | -          | -                 |

#### <a name="devops_nag_suppressions_by_path"></a>3.8.1. Property `root > devops > nag_suppressions > by_path`

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

| Each item of this array must be                                    | Description |
| ------------------------------------------------------------------ | ----------- |
| [MdaaNagSuppressionByPath](#devops_nag_suppressions_by_path_items) | -           |

##### <a name="autogenerated_heading_7"></a>3.8.1.1. root > devops > nag_suppressions > by_path > MdaaNagSuppressionByPath

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaNagSuppressionByPath                  |

| Property                                                               | Pattern | Type            | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| + [path](#devops_nag_suppressions_by_path_items_path )                 | No      | string          | No         | -          | -                 |
| + [suppressions](#devops_nag_suppressions_by_path_items_suppressions ) | No      | array of object | No         | -          | -                 |

###### <a name="devops_nag_suppressions_by_path_items_path"></a>3.8.1.1.1. Property `root > devops > nag_suppressions > by_path > by_path items > path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="devops_nag_suppressions_by_path_items_suppressions"></a>3.8.1.1.2. Property `root > devops > nag_suppressions > by_path > by_path items > suppressions`

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

| Each item of this array must be                                                 | Description |
| ------------------------------------------------------------------------------- | ----------- |
| [suppressions items](#devops_nag_suppressions_by_path_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_8"></a>3.8.1.1.2.1. root > devops > nag_suppressions > by_path > by_path items > suppressions > suppressions items

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                                      | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#devops_nag_suppressions_by_path_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#devops_nag_suppressions_by_path_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="devops_nag_suppressions_by_path_items_suppressions_items_id"></a>3.8.1.1.2.1.1. Property `root > devops > nag_suppressions > by_path > by_path items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="devops_nag_suppressions_by_path_items_suppressions_items_reason"></a>3.8.1.1.2.1.2. Property `root > devops > nag_suppressions > by_path > by_path items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="devops_pipelines"></a>3.9. Property `root > devops > pipelines`

|                           |                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                   |
| **Required**              | No                                                                                                                         |
| **Additional properties** | [[Should-conform]](#devops_pipelines_additionalProperties "Each additional property must conform to the following schema") |

| Property                                      | Pattern | Type   | Deprecated | Definition                      | Title/Description |
| --------------------------------------------- | ------- | ------ | ---------- | ------------------------------- | ----------------- |
| - [](#devops_pipelines_additionalProperties ) | No      | object | No         | In #/definitions/PipelineConfig | -                 |

#### <a name="devops_pipelines_additionalProperties"></a>3.9.1. Property `root > devops > pipelines > PipelineConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/PipelineConfig                            |

| Property                                                                           | Pattern | Type            | Deprecated | Definition                                                                               | Title/Description |
| ---------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------------------------------------------------------------------------------------- | ----------------- |
| - [deploy](#devops_pipelines_additionalProperties_deploy )                         | No      | object          | No         | Same as [deploy](#devops_deploy )                                                        | -                 |
| - [domainFilter](#devops_pipelines_additionalProperties_domainFilter )             | No      | array of string | No         | -                                                                                        | -                 |
| - [envFilter](#devops_pipelines_additionalProperties_envFilter )                   | No      | array of string | No         | -                                                                                        | -                 |
| - [install](#devops_pipelines_additionalProperties_install )                       | No      | array of string | No         | -                                                                                        | -                 |
| - [moduleFilter](#devops_pipelines_additionalProperties_moduleFilter )             | No      | array of string | No         | -                                                                                        | -                 |
| - [post](#devops_pipelines_additionalProperties_post )                             | No      | array of string | No         | -                                                                                        | -                 |
| - [postDeployValidate](#devops_pipelines_additionalProperties_postDeployValidate ) | No      | object          | No         | In #/definitions/ValidateStageCommands                                                   | -                 |
| - [pre](#devops_pipelines_additionalProperties_pre )                               | No      | array of string | No         | -                                                                                        | -                 |
| - [preDeploy](#devops_pipelines_additionalProperties_preDeploy )                   | No      | object          | No         | Same as [deploy](#devops_deploy )                                                        | -                 |
| - [preDeployValidate](#devops_pipelines_additionalProperties_preDeployValidate )   | No      | object          | No         | Same as [postDeployValidate](#devops_pipelines_additionalProperties_postDeployValidate ) | -                 |

##### <a name="devops_pipelines_additionalProperties_deploy"></a>3.9.1.1. Property `root > devops > pipelines > additionalProperties > deploy`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [deploy](#devops_deploy)                                |

##### <a name="devops_pipelines_additionalProperties_domainFilter"></a>3.9.1.2. Property `root > devops > pipelines > additionalProperties > domainFilter`

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

| Each item of this array must be                                                 | Description |
| ------------------------------------------------------------------------------- | ----------- |
| [domainFilter items](#devops_pipelines_additionalProperties_domainFilter_items) | -           |

###### <a name="autogenerated_heading_9"></a>3.9.1.2.1. root > devops > pipelines > additionalProperties > domainFilter > domainFilter items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="devops_pipelines_additionalProperties_envFilter"></a>3.9.1.3. Property `root > devops > pipelines > additionalProperties > envFilter`

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

| Each item of this array must be                                           | Description |
| ------------------------------------------------------------------------- | ----------- |
| [envFilter items](#devops_pipelines_additionalProperties_envFilter_items) | -           |

###### <a name="autogenerated_heading_10"></a>3.9.1.3.1. root > devops > pipelines > additionalProperties > envFilter > envFilter items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="devops_pipelines_additionalProperties_install"></a>3.9.1.4. Property `root > devops > pipelines > additionalProperties > install`

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

| Each item of this array must be                                       | Description |
| --------------------------------------------------------------------- | ----------- |
| [install items](#devops_pipelines_additionalProperties_install_items) | -           |

###### <a name="autogenerated_heading_11"></a>3.9.1.4.1. root > devops > pipelines > additionalProperties > install > install items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="devops_pipelines_additionalProperties_moduleFilter"></a>3.9.1.5. Property `root > devops > pipelines > additionalProperties > moduleFilter`

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

| Each item of this array must be                                                 | Description |
| ------------------------------------------------------------------------------- | ----------- |
| [moduleFilter items](#devops_pipelines_additionalProperties_moduleFilter_items) | -           |

###### <a name="autogenerated_heading_12"></a>3.9.1.5.1. root > devops > pipelines > additionalProperties > moduleFilter > moduleFilter items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="devops_pipelines_additionalProperties_post"></a>3.9.1.6. Property `root > devops > pipelines > additionalProperties > post`

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

| Each item of this array must be                                 | Description |
| --------------------------------------------------------------- | ----------- |
| [post items](#devops_pipelines_additionalProperties_post_items) | -           |

###### <a name="autogenerated_heading_13"></a>3.9.1.6.1. root > devops > pipelines > additionalProperties > post > post items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="devops_pipelines_additionalProperties_postDeployValidate"></a>3.9.1.7. Property `root > devops > pipelines > additionalProperties > postDeployValidate`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/ValidateStageCommands                     |

| Property                                                                          | Pattern | Type            | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [commands](#devops_pipelines_additionalProperties_postDeployValidate_commands ) | No      | array of string | No         | -          | -                 |
| - [install](#devops_pipelines_additionalProperties_postDeployValidate_install )   | No      | array of string | No         | -          | -                 |

###### <a name="devops_pipelines_additionalProperties_postDeployValidate_commands"></a>3.9.1.7.1. Property `root > devops > pipelines > additionalProperties > postDeployValidate > commands`

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

| Each item of this array must be                                                            | Description |
| ------------------------------------------------------------------------------------------ | ----------- |
| [commands items](#devops_pipelines_additionalProperties_postDeployValidate_commands_items) | -           |

###### <a name="autogenerated_heading_14"></a>3.9.1.7.1.1. root > devops > pipelines > additionalProperties > postDeployValidate > commands > commands items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="devops_pipelines_additionalProperties_postDeployValidate_install"></a>3.9.1.7.2. Property `root > devops > pipelines > additionalProperties > postDeployValidate > install`

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

| Each item of this array must be                                                          | Description |
| ---------------------------------------------------------------------------------------- | ----------- |
| [install items](#devops_pipelines_additionalProperties_postDeployValidate_install_items) | -           |

###### <a name="autogenerated_heading_15"></a>3.9.1.7.2.1. root > devops > pipelines > additionalProperties > postDeployValidate > install > install items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="devops_pipelines_additionalProperties_pre"></a>3.9.1.8. Property `root > devops > pipelines > additionalProperties > pre`

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

| Each item of this array must be                               | Description |
| ------------------------------------------------------------- | ----------- |
| [pre items](#devops_pipelines_additionalProperties_pre_items) | -           |

###### <a name="autogenerated_heading_16"></a>3.9.1.8.1. root > devops > pipelines > additionalProperties > pre > pre items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="devops_pipelines_additionalProperties_preDeploy"></a>3.9.1.9. Property `root > devops > pipelines > additionalProperties > preDeploy`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [deploy](#devops_deploy)                                |

##### <a name="devops_pipelines_additionalProperties_preDeployValidate"></a>3.9.1.10. Property `root > devops > pipelines > additionalProperties > preDeployValidate`

|                           |                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                        |
| **Required**              | No                                                                              |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                         |
| **Same definition as**    | [postDeployValidate](#devops_pipelines_additionalProperties_postDeployValidate) |

### <a name="devops_post"></a>3.10. Property `root > devops > post`

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

| Each item of this array must be  | Description |
| -------------------------------- | ----------- |
| [post items](#devops_post_items) | -           |

#### <a name="autogenerated_heading_17"></a>3.10.1. root > devops > post > post items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="devops_postDeployValidate"></a>3.11. Property `root > devops > postDeployValidate`

|                           |                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                        |
| **Required**              | No                                                                              |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                         |
| **Same definition as**    | [postDeployValidate](#devops_pipelines_additionalProperties_postDeployValidate) |

### <a name="devops_pre"></a>3.12. Property `root > devops > pre`

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

| Each item of this array must be | Description |
| ------------------------------- | ----------- |
| [pre items](#devops_pre_items)  | -           |

#### <a name="autogenerated_heading_18"></a>3.12.1. root > devops > pre > pre items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="devops_preDeploy"></a>3.13. Property `root > devops > preDeploy`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [deploy](#devops_deploy)                                |

### <a name="devops_preDeployValidate"></a>3.14. Property `root > devops > preDeployValidate`

|                           |                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                        |
| **Required**              | No                                                                              |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                         |
| **Same definition as**    | [postDeployValidate](#devops_pipelines_additionalProperties_postDeployValidate) |

### <a name="devops_service_catalog_product_config"></a>3.15. Property `root > devops > service_catalog_product_config`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogProductConfig           |

**Description:** Service Catalog Config
If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment

| Property                                                                       | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------- |
| - [launch_role_name](#devops_service_catalog_product_config_launch_role_name ) | No      | string | No         | -          | -                 |
| + [name](#devops_service_catalog_product_config_name )                         | No      | string | No         | -          | -                 |
| + [owner](#devops_service_catalog_product_config_owner )                       | No      | string | No         | -          | -                 |
| - [parameters](#devops_service_catalog_product_config_parameters )             | No      | object | No         | -          | -                 |
| + [portfolio_arn](#devops_service_catalog_product_config_portfolio_arn )       | No      | string | No         | -          | -                 |

#### <a name="devops_service_catalog_product_config_launch_role_name"></a>3.15.1. Property `root > devops > service_catalog_product_config > launch_role_name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="devops_service_catalog_product_config_name"></a>3.15.2. Property `root > devops > service_catalog_product_config > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="devops_service_catalog_product_config_owner"></a>3.15.3. Property `root > devops > service_catalog_product_config > owner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="devops_service_catalog_product_config_parameters"></a>3.15.4. Property `root > devops > service_catalog_product_config > parameters`

|                           |                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                   |
| **Required**              | No                                                                                                                                                         |
| **Additional properties** | [[Should-conform]](#devops_service_catalog_product_config_parameters_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                      | Pattern | Type   | Deprecated | Definition                                         | Title/Description |
| ----------------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------- | ----------------- |
| - [](#devops_service_catalog_product_config_parameters_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogParameterConfig | -                 |

##### <a name="devops_service_catalog_product_config_parameters_additionalProperties"></a>3.15.4.1. Property `root > devops > service_catalog_product_config > parameters > MdaaServiceCatalogParameterConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogParameterConfig         |

| Property                                                                                             | Pattern | Type   | Deprecated | Definition                                          | Title/Description |
| ---------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | --------------------------------------------------- | ----------------- |
| - [constraints](#devops_service_catalog_product_config_parameters_additionalProperties_constraints ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintConfig | -                 |
| + [props](#devops_service_catalog_product_config_parameters_additionalProperties_props )             | No      | object | No         | In #/definitions/CfnParameterProps                  | -                 |

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_constraints"></a>3.15.4.1.1. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > constraints`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintConfig        |

| Property                                                                                                         | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [description](#devops_service_catalog_product_config_parameters_additionalProperties_constraints_description ) | No      | string | No         | -          | -                 |
| + [rules](#devops_service_catalog_product_config_parameters_additionalProperties_constraints_rules )             | No      | object | No         | -          | -                 |

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_constraints_description"></a>3.15.4.1.1.1. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > constraints > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_constraints_rules"></a>3.15.4.1.1.2. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > constraints > rules`

|                           |                                                                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                          |
| **Required**              | Yes                                                                                                                                                                                               |
| **Additional properties** | [[Should-conform]](#devops_service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                             | Pattern | Type   | Deprecated | Definition                                              | Title/Description |
| -------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------- | ----------------- |
| - [](#devops_service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleConfig | -                 |

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties"></a>3.15.4.1.1.2.1. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > constraints > rules > MdaaServiceCatalogConstraintRuleConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleConfig    |

| Property                                                                                                                                  | Pattern | Type   | Deprecated | Definition                                                         | Title/Description |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------------------ | ----------------- |
| + [assertions](#devops_service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions ) | No      | array  | No         | -                                                                  | -                 |
| + [condition](#devops_service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition )   | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig | -                 |

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions"></a>3.15.4.1.1.2.1.1. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions`

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

| Each item of this array must be                                                                                                                                                   | Description |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [MdaaServiceCatalogConstraintRuleAssertionConfig](#devops_service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items) | -           |

###### <a name="autogenerated_heading_19"></a>3.15.4.1.1.2.1.1.1. root > devops > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

|                           |                                                               |
| ------------------------- | ------------------------------------------------------------- |
| **Type**                  | `object`                                                      |
| **Required**              | No                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")       |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleAssertionConfig |

| Property                                                                                                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------- |
| + [assert](#devops_service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert )           | No      | string | No         | -          | -                 |
| + [description](#devops_service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description ) | No      | string | No         | -          | -                 |

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert"></a>3.15.4.1.1.2.1.1.1.1. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > assert`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description"></a>3.15.4.1.1.2.1.1.1.2. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition"></a>3.15.4.1.1.2.1.2. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > condition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig           |

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_props"></a>3.15.4.1.2. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > props`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnParameterProps                         |

| Property                                                                                                                       | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------ | ------- | --------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [allowedPattern](#devops_service_catalog_product_config_parameters_additionalProperties_props_allowedPattern )               | No      | string          | No         | -          | A regular expression that represents the patterns to allow for String types.                                                                                                                                                                                              |
| - [allowedValues](#devops_service_catalog_product_config_parameters_additionalProperties_props_allowedValues )                 | No      | array of string | No         | -          | An array containing the list of values allowed for the parameter.                                                                                                                                                                                                         |
| - [constraintDescription](#devops_service_catalog_product_config_parameters_additionalProperties_props_constraintDescription ) | No      | string          | No         | -          | A string that explains a constraint when the constraint is violated.<br />For example, without a constraint description, a parameter that has an allowed<br />pattern of [A-Za-z0-9]+ displays the following error message when the user specifies<br />an invalid value: |
| - [default](#devops_service_catalog_product_config_parameters_additionalProperties_props_default )                             | No      | object          | No         | -          | A value of the appropriate type for the template to use if no value is specified<br />when a stack is created. If you define constraints for the parameter, you must specify<br />a value that adheres to those constraints.                                              |
| - [description](#devops_service_catalog_product_config_parameters_additionalProperties_props_description )                     | No      | string          | No         | -          | A string of up to 4000 characters that describes the parameter.                                                                                                                                                                                                           |
| - [maxLength](#devops_service_catalog_product_config_parameters_additionalProperties_props_maxLength )                         | No      | number          | No         | -          | An integer value that determines the largest number of characters you want to allow for String types.                                                                                                                                                                     |
| - [maxValue](#devops_service_catalog_product_config_parameters_additionalProperties_props_maxValue )                           | No      | number          | No         | -          | A numeric value that determines the largest numeric value you want to allow for Number types.                                                                                                                                                                             |
| - [minLength](#devops_service_catalog_product_config_parameters_additionalProperties_props_minLength )                         | No      | number          | No         | -          | An integer value that determines the smallest number of characters you want to allow for String types.                                                                                                                                                                    |
| - [minValue](#devops_service_catalog_product_config_parameters_additionalProperties_props_minValue )                           | No      | number          | No         | -          | A numeric value that determines the smallest numeric value you want to allow for Number types.                                                                                                                                                                            |
| - [noEcho](#devops_service_catalog_product_config_parameters_additionalProperties_props_noEcho )                               | No      | boolean         | No         | -          | Whether to mask the parameter value when anyone makes a call that describes the stack.<br />If you set the value to \`\`true\`\`, the parameter value is masked with asterisks (\`\`*****\`\`).                                                                           |
| - [type](#devops_service_catalog_product_config_parameters_additionalProperties_props_type )                                   | No      | string          | No         | -          | The data type for the parameter (DataType).                                                                                                                                                                                                                               |

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_props_allowedPattern"></a>3.15.4.1.2.1. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > props > allowedPattern`

|              |                                                         |
| ------------ | ------------------------------------------------------- |
| **Type**     | `string`                                                |
| **Required** | No                                                      |
| **Default**  | `"- No constraints on patterns allowed for parameter."` |

**Description:** A regular expression that represents the patterns to allow for String types.

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_props_allowedValues"></a>3.15.4.1.2.2. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > props > allowedValues`

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

| Each item of this array must be                                                                                         | Description |
| ----------------------------------------------------------------------------------------------------------------------- | ----------- |
| [allowedValues items](#devops_service_catalog_product_config_parameters_additionalProperties_props_allowedValues_items) | -           |

###### <a name="autogenerated_heading_20"></a>3.15.4.1.2.2.1. root > devops > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_props_constraintDescription"></a>3.15.4.1.2.3. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > props > constraintDescription`

|              |                                                                                        |
| ------------ | -------------------------------------------------------------------------------------- |
| **Type**     | `string`                                                                               |
| **Required** | No                                                                                     |
| **Default**  | `"- No description with customized error message when user specifies invalid values."` |

**Description:** A string that explains a constraint when the constraint is violated.
For example, without a constraint description, a parameter that has an allowed
pattern of [A-Za-z0-9]+ displays the following error message when the user specifies
an invalid value:

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_props_default"></a>3.15.4.1.2.4. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > props > default`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Default**               | `"- No default value for parameter."`                                     |

**Description:** A value of the appropriate type for the template to use if no value is specified
when a stack is created. If you define constraints for the parameter, you must specify
a value that adheres to those constraints.

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_props_description"></a>3.15.4.1.2.5. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > props > description`

|              |                                         |
| ------------ | --------------------------------------- |
| **Type**     | `string`                                |
| **Required** | No                                      |
| **Default**  | `"- No description for the parameter."` |

**Description:** A string of up to 4000 characters that describes the parameter.

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_props_maxLength"></a>3.15.4.1.2.6. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > props > maxLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the largest number of characters you want to allow for String types.

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_props_maxValue"></a>3.15.4.1.2.7. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > props > maxValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the largest numeric value you want to allow for Number types.

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_props_minLength"></a>3.15.4.1.2.8. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > props > minLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the smallest number of characters you want to allow for String types.

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_props_minValue"></a>3.15.4.1.2.9. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > props > minValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the smallest numeric value you want to allow for Number types.

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_props_noEcho"></a>3.15.4.1.2.10. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > props > noEcho`

|              |                                        |
| ------------ | -------------------------------------- |
| **Type**     | `boolean`                              |
| **Required** | No                                     |
| **Default**  | `"- Parameter values are not masked."` |

**Description:** Whether to mask the parameter value when anyone makes a call that describes the stack.
If you set the value to ``true``, the parameter value is masked with asterisks (``*****``).

###### <a name="devops_service_catalog_product_config_parameters_additionalProperties_props_type"></a>3.15.4.1.2.11. Property `root > devops > service_catalog_product_config > parameters > additionalProperties > props > type`

|              |            |
| ------------ | ---------- |
| **Type**     | `string`   |
| **Required** | No         |
| **Default**  | `"String"` |

**Description:** The data type for the parameter (DataType).

#### <a name="devops_service_catalog_product_config_portfolio_arn"></a>3.15.5. Property `root > devops > service_catalog_product_config > portfolio_arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="domains"></a>4. Property `root > domains`

|                           |                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                          |
| **Required**              | Yes                                                                                                               |
| **Additional properties** | [[Should-conform]](#domains_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Objects representing domains to create

| Property                             | Pattern | Type   | Deprecated | Definition                        | Title/Description |
| ------------------------------------ | ------- | ------ | ---------- | --------------------------------- | ----------------- |
| - [](#domains_additionalProperties ) | No      | object | No         | In #/definitions/MdaaDomainConfig | -                 |

### <a name="domains_additionalProperties"></a>4.1. Property `root > domains > MdaaDomainConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaDomainConfig                          |

| Property                                                              | Pattern | Type            | Deprecated | Definition                                                                                                                                  | Title/Description                                                                                                                                                                                       |
| --------------------------------------------------------------------- | ------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [context](#domains_additionalProperties_context )                   | No      | object          | No         | -                                                                                                                                           | Additional CDK Context key/value pairs                                                                                                                                                                  |
| - [custom_aspects](#domains_additionalProperties_custom_aspects )     | No      | array           | No         | -                                                                                                                                           | Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.                                                                                                                       |
| - [custom_naming](#domains_additionalProperties_custom_naming )       | No      | object          | No         | In #/definitions/MdaaCustomNaming                                                                                                           | Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.                                                                                                                       |
| - [env_templates](#domains_additionalProperties_env_templates )       | No      | object          | No         | -                                                                                                                                           | Templates for environments which can be referenced throughout the config.                                                                                                                               |
| + [environments](#domains_additionalProperties_environments )         | No      | object          | No         | -                                                                                                                                           | Arn or SSM Import (prefix with ssm:) of the environment provider                                                                                                                                        |
| - [mdaa_version](#domains_additionalProperties_mdaa_version )         | No      | string          | No         | -                                                                                                                                           | Override the MDAA version                                                                                                                                                                               |
| - [tag_config_data](#domains_additionalProperties_tag_config_data )   | No      | object          | No         | -                                                                                                                                           | Tagging data which will be passed directly to apps                                                                                                                                                      |
| - [tag_configs](#domains_additionalProperties_tag_configs )           | No      | array of string | No         | -                                                                                                                                           | A list of paths to tag configuration files.<br />Configurations will be compiled together in the order they appear,<br />with later configuration files taking precendence over earlier configurations. |
| - [terraform_config](#domains_additionalProperties_terraform_config ) | No      | object          | No         | Same as [terraform_config](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_terraform_config ) | Config properties for TF modules                                                                                                                                                                        |

#### <a name="domains_additionalProperties_context"></a>4.1.1. Property `root > domains > additionalProperties > context`

|                           |                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                       |
| **Required**              | No                                                                                                                                             |
| **Additional properties** | [[Should-conform]](#domains_additionalProperties_context_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Additional CDK Context key/value pairs

| Property                                                          | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#domains_additionalProperties_context_additionalProperties ) | No      | object | No         | -          | -                 |

##### <a name="domains_additionalProperties_context_additionalProperties"></a>4.1.1.1. Property `root > domains > additionalProperties > context > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

#### <a name="domains_additionalProperties_custom_aspects"></a>4.1.2. Property `root > domains > additionalProperties > custom_aspects`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                        | Description |
| ---------------------------------------------------------------------- | ----------- |
| [MdaaCustomAspect](#domains_additionalProperties_custom_aspects_items) | -           |

##### <a name="autogenerated_heading_21"></a>4.1.2.1. root > domains > additionalProperties > custom_aspects > MdaaCustomAspect

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [custom_aspects_items](#custom_aspects_items)           |

#### <a name="domains_additionalProperties_custom_naming"></a>4.1.3. Property `root > domains > additionalProperties > custom_naming`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaCustomNaming                          |

**Description:** Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.

| Property                                                                      | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [naming_class](#domains_additionalProperties_custom_naming_naming_class )   | No      | string | No         | -          | -                 |
| + [naming_module](#domains_additionalProperties_custom_naming_naming_module ) | No      | string | No         | -          | -                 |
| - [naming_props](#domains_additionalProperties_custom_naming_naming_props )   | No      | object | No         | -          | -                 |

##### <a name="domains_additionalProperties_custom_naming_naming_class"></a>4.1.3.1. Property `root > domains > additionalProperties > custom_naming > naming_class`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="domains_additionalProperties_custom_naming_naming_module"></a>4.1.3.2. Property `root > domains > additionalProperties > custom_naming > naming_module`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="domains_additionalProperties_custom_naming_naming_props"></a>4.1.3.3. Property `root > domains > additionalProperties > custom_naming > naming_props`

|                           |                                                                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                          |
| **Required**              | No                                                                                                                                                                |
| **Additional properties** | [[Should-conform]](#domains_additionalProperties_custom_naming_naming_props_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                             | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#domains_additionalProperties_custom_naming_naming_props_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="domains_additionalProperties_custom_naming_naming_props_additionalProperties"></a>4.1.3.3.1. Property `root > domains > additionalProperties > custom_naming > naming_props > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

#### <a name="domains_additionalProperties_env_templates"></a>4.1.4. Property `root > domains > additionalProperties > env_templates`

|                           |                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                             |
| **Required**              | No                                                                                                                                                   |
| **Additional properties** | [[Should-conform]](#domains_additionalProperties_env_templates_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Templates for environments which can be referenced throughout the config.

| Property                                                                | Pattern | Type   | Deprecated | Definition                             | Title/Description |
| ----------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------- | ----------------- |
| - [](#domains_additionalProperties_env_templates_additionalProperties ) | No      | object | No         | In #/definitions/MdaaEnvironmentConfig | -                 |

##### <a name="domains_additionalProperties_env_templates_additionalProperties"></a>4.1.4.1. Property `root > domains > additionalProperties > env_templates > MdaaEnvironmentConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaEnvironmentConfig                     |

| Property                                                                                                 | Pattern | Type            | Deprecated | Definition                                                                                                                                  | Title/Description                                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [account](#domains_additionalProperties_env_templates_additionalProperties_account )                   | No      | string          | No         | -                                                                                                                                           | Target account for deployment                                                                                                                                                                           |
| - [context](#domains_additionalProperties_env_templates_additionalProperties_context )                   | No      | object          | No         | -                                                                                                                                           | Additional CDK Context key/value pairs                                                                                                                                                                  |
| - [custom_aspects](#domains_additionalProperties_env_templates_additionalProperties_custom_aspects )     | No      | array           | No         | -                                                                                                                                           | Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.                                                                                                                       |
| - [custom_naming](#domains_additionalProperties_env_templates_additionalProperties_custom_naming )       | No      | object          | No         | Same as [custom_naming](#domains_additionalProperties_custom_naming )                                                                       | Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.                                                                                                                       |
| - [mdaa_version](#domains_additionalProperties_env_templates_additionalProperties_mdaa_version )         | No      | string          | No         | -                                                                                                                                           | Override the MDAA version                                                                                                                                                                               |
| - [modules](#domains_additionalProperties_env_templates_additionalProperties_modules )                   | No      | object          | No         | -                                                                                                                                           | Arn or SSM Import (prefix with ssm:) of the environment provider                                                                                                                                        |
| - [tag_config_data](#domains_additionalProperties_env_templates_additionalProperties_tag_config_data )   | No      | object          | No         | -                                                                                                                                           | Tagging data which will be passed directly to apps                                                                                                                                                      |
| - [tag_configs](#domains_additionalProperties_env_templates_additionalProperties_tag_configs )           | No      | array of string | No         | -                                                                                                                                           | A list of paths to tag configuration files.<br />Configurations will be compiled together in the order they appear,<br />with later configuration files taking precendence over earlier configurations. |
| - [template](#domains_additionalProperties_env_templates_additionalProperties_template )                 | No      | string          | No         | -                                                                                                                                           | If specified, the referenced environment template will be used as the basis for this environment config.<br />Template values can be overridden with specific values in this config.                    |
| - [terraform_config](#domains_additionalProperties_env_templates_additionalProperties_terraform_config ) | No      | object          | No         | Same as [terraform_config](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_terraform_config ) | Config properties for TF modules                                                                                                                                                                        |
| - [use_bootstrap](#domains_additionalProperties_env_templates_additionalProperties_use_bootstrap )       | No      | boolean         | No         | -                                                                                                                                           | If true (default), will use the MDAA bootstrap env                                                                                                                                                      |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_account"></a>4.1.4.1.1. Property `root > domains > additionalProperties > env_templates > additionalProperties > account`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Target account for deployment

###### <a name="domains_additionalProperties_env_templates_additionalProperties_context"></a>4.1.4.1.2. Property `root > domains > additionalProperties > env_templates > additionalProperties > context`

|                           |                                                                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                          |
| **Required**              | No                                                                                                                                                                                |
| **Additional properties** | [[Should-conform]](#domains_additionalProperties_env_templates_additionalProperties_context_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Additional CDK Context key/value pairs

| Property                                                                                             | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#domains_additionalProperties_env_templates_additionalProperties_context_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_context_additionalProperties"></a>4.1.4.1.2.1. Property `root > domains > additionalProperties > env_templates > additionalProperties > context > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_custom_aspects"></a>4.1.4.1.3. Property `root > domains > additionalProperties > env_templates > additionalProperties > custom_aspects`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                           | Description |
| --------------------------------------------------------------------------------------------------------- | ----------- |
| [MdaaCustomAspect](#domains_additionalProperties_env_templates_additionalProperties_custom_aspects_items) | -           |

###### <a name="autogenerated_heading_22"></a>4.1.4.1.3.1. root > domains > additionalProperties > env_templates > additionalProperties > custom_aspects > MdaaCustomAspect

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [custom_aspects_items](#custom_aspects_items)           |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_custom_naming"></a>4.1.4.1.4. Property `root > domains > additionalProperties > env_templates > additionalProperties > custom_naming`

|                           |                                                              |
| ------------------------- | ------------------------------------------------------------ |
| **Type**                  | `object`                                                     |
| **Required**              | No                                                           |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")      |
| **Same definition as**    | [custom_naming](#domains_additionalProperties_custom_naming) |

**Description:** Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.

###### <a name="domains_additionalProperties_env_templates_additionalProperties_mdaa_version"></a>4.1.4.1.5. Property `root > domains > additionalProperties > env_templates > additionalProperties > mdaa_version`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Override the MDAA version

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules"></a>4.1.4.1.6. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules`

|                           |                                                                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                          |
| **Required**              | No                                                                                                                                                                                |
| **Additional properties** | [[Should-conform]](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Arn or SSM Import (prefix with ssm:) of the environment provider

| Property                                                                                             | Pattern | Type   | Deprecated | Definition                        | Title/Description |
| ---------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | --------------------------------- | ----------------- |
| - [](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties ) | No      | object | No         | In #/definitions/MdaaModuleConfig | -                 |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties"></a>4.1.4.1.6.1. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > MdaaModuleConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaModuleConfig                          |

| Property                                                                                                                                    | Pattern | Type             | Deprecated | Definition                                                            | Title/Description                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [additional_accounts](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_additional_accounts ) | No      | array of string  | No         | -                                                                     | A list of additional accounts into which the module may deploy resources.                                                                                                                                       |
| - [additional_context](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_additional_context )   | No      | object           | No         | -                                                                     | -                                                                                                                                                                                                               |
| - [app_config_data](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_app_config_data )         | No      | object           | No         | -                                                                     | -                                                                                                                                                                                                               |
| - [app_configs](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_app_configs )                 | No      | array of string  | No         | -                                                                     | -                                                                                                                                                                                                               |
| - [cdk_app](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_cdk_app )                         | No      | string           | No         | -                                                                     | -                                                                                                                                                                                                               |
| - [context](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_context )                         | No      | object           | No         | -                                                                     | Additional CDK Context key/value pairs                                                                                                                                                                          |
| - [custom_aspects](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_custom_aspects )           | No      | array            | No         | -                                                                     | Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.                                                                                                                               |
| - [custom_naming](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_custom_naming )             | No      | object           | No         | Same as [custom_naming](#domains_additionalProperties_custom_naming ) | Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.                                                                                                                               |
| - [mdaa_version](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_mdaa_version )               | No      | string           | No         | -                                                                     | Override the MDAA version                                                                                                                                                                                       |
| - [module_config_data](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_module_config_data )   | No      | object           | No         | -                                                                     | Config data which will be passed directly to modules                                                                                                                                                            |
| - [module_configs](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_module_configs )           | No      | array of string  | No         | -                                                                     | A list of paths to MDAA module configuration files.<br />Configurations will be compiled together in the order they appear,<br />with later configuration files taking precendence over earlier configurations. |
| - [module_path](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_module_path )                 | No      | string           | No         | -                                                                     | The the path to the module. If an npm package is specified, MDAA will attempt to locate the package in its local repo (in local mode) or install via NPM                                                        |
| - [module_type](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_module_type )                 | No      | enum (of string) | No         | -                                                                     | The type of module.                                                                                                                                                                                             |
| - [tag_config_data](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_tag_config_data )         | No      | object           | No         | -                                                                     | Tagging data which will be passed directly to modules                                                                                                                                                           |
| - [tag_configs](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_tag_configs )                 | No      | array of string  | No         | -                                                                     | A list of paths to tag configuration files.<br />Configurations will be compiled together in the order they appear,<br />with later configuration files taking precendence over earlier configurations.         |
| - [terraform_config](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_terraform_config )       | No      | object           | No         | In #/definitions/TerraformConfig                                      | Config properties for TF modules                                                                                                                                                                                |
| - [use_bootstrap](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_use_bootstrap )             | No      | boolean          | No         | -                                                                     | If true (default), will use the MDAA bootstrap env                                                                                                                                                              |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_additional_accounts"></a>4.1.4.1.6.1.1. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > additional_accounts`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** A list of additional accounts into which the module may deploy resources.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                                      | Description |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [additional_accounts items](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_additional_accounts_items) | -           |

###### <a name="autogenerated_heading_23"></a>4.1.4.1.6.1.1.1. root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > additional_accounts > additional_accounts items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_additional_context"></a>4.1.4.1.6.1.2. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > additional_context`

|                           |                                                                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                  |
| **Required**              | No                                                                                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_additional_context_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_additional_context_additionalProperties ) | No      | string | No         | -          | -                 |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_additional_context_additionalProperties"></a>4.1.4.1.6.1.2.1. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > additional_context > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_app_config_data"></a>4.1.4.1.6.1.3. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > app_config_data`

|                           |                                                                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                               |
| **Required**              | No                                                                                                                                                                                                                     |
| **Additional properties** | [[Should-conform]](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_app_config_data_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                                                  | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_app_config_data_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_app_config_data_additionalProperties"></a>4.1.4.1.6.1.3.1. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > app_config_data > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_app_configs"></a>4.1.4.1.6.1.4. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > app_configs`

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

| Each item of this array must be                                                                                                      | Description |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [app_configs items](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_app_configs_items) | -           |

###### <a name="autogenerated_heading_24"></a>4.1.4.1.6.1.4.1. root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > app_configs > app_configs items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_cdk_app"></a>4.1.4.1.6.1.5. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > cdk_app`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_context"></a>4.1.4.1.6.1.6. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > context`

|                           |                                                                                                                                                                                                                |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                       |
| **Required**              | No                                                                                                                                                                                                             |
| **Additional properties** | [[Should-conform]](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_context_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Additional CDK Context key/value pairs

| Property                                                                                                                          | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_context_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_context_additionalProperties"></a>4.1.4.1.6.1.6.1. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > context > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_custom_aspects"></a>4.1.4.1.6.1.7. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > custom_aspects`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                        | Description |
| -------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [MdaaCustomAspect](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_custom_aspects_items) | -           |

###### <a name="autogenerated_heading_25"></a>4.1.4.1.6.1.7.1. root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > custom_aspects > MdaaCustomAspect

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [custom_aspects_items](#custom_aspects_items)           |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_custom_naming"></a>4.1.4.1.6.1.8. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > custom_naming`

|                           |                                                              |
| ------------------------- | ------------------------------------------------------------ |
| **Type**                  | `object`                                                     |
| **Required**              | No                                                           |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")      |
| **Same definition as**    | [custom_naming](#domains_additionalProperties_custom_naming) |

**Description:** Permission policy boundary arns. Will be applied to all Roles using a CDK aspect.

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_mdaa_version"></a>4.1.4.1.6.1.9. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > mdaa_version`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Override the MDAA version

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_module_config_data"></a>4.1.4.1.6.1.10. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > module_config_data`

|                           |                                                                                                                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                                  |
| **Required**              | No                                                                                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_module_config_data_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Config data which will be passed directly to modules

| Property                                                                                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_module_config_data_additionalProperties ) | No      | object | No         | -          | -                 |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_module_config_data_additionalProperties"></a>4.1.4.1.6.1.10.1. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > module_config_data > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_module_configs"></a>4.1.4.1.6.1.11. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > module_configs`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** A list of paths to MDAA module configuration files.
Configurations will be compiled together in the order they appear,
with later configuration files taking precendence over earlier configurations.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                            | Description |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [module_configs items](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_module_configs_items) | -           |

###### <a name="autogenerated_heading_26"></a>4.1.4.1.6.1.11.1. root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > module_configs > module_configs items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_module_path"></a>4.1.4.1.6.1.12. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > module_path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The the path to the module. If an npm package is specified, MDAA will attempt to locate the package in its local repo (in local mode) or install via NPM

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_module_type"></a>4.1.4.1.6.1.13. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > module_type`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

**Description:** The type of module.

Must be one of:
* "cdk"
* "tf"

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_tag_config_data"></a>4.1.4.1.6.1.14. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > tag_config_data`

|                           |                                                                                                                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                               |
| **Required**              | No                                                                                                                                                                                                                     |
| **Additional properties** | [[Should-conform]](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_tag_config_data_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Tagging data which will be passed directly to modules

| Property                                                                                                                                  | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_tag_config_data_additionalProperties ) | No      | string | No         | -          | -                 |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_tag_config_data_additionalProperties"></a>4.1.4.1.6.1.14.1. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > tag_config_data > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_tag_configs"></a>4.1.4.1.6.1.15. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > tag_configs`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** A list of paths to tag configuration files.
Configurations will be compiled together in the order they appear,
with later configuration files taking precendence over earlier configurations.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                                      | Description |
| ------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| [tag_configs items](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_tag_configs_items) | -           |

###### <a name="autogenerated_heading_27"></a>4.1.4.1.6.1.15.1. root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > tag_configs > tag_configs items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_terraform_config"></a>4.1.4.1.6.1.16. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > terraform_config`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/TerraformConfig                           |

**Description:** Config properties for TF modules

| Property                                                                                                                             | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------- |
| - [s3State](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_terraform_config_s3State ) | No      | object | No         | -          | -                 |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_terraform_config_s3State"></a>4.1.4.1.6.1.16.1. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > terraform_config > s3State`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                                                                                                             | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [lockTable](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_terraform_config_s3State_lockTable )     | No      | string | No         | -          | -                 |
| + [stateBucket](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_terraform_config_s3State_stateBucket ) | No      | string | No         | -          | -                 |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_terraform_config_s3State_lockTable"></a>4.1.4.1.6.1.16.1.1. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > terraform_config > s3State > lockTable`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_terraform_config_s3State_stateBucket"></a>4.1.4.1.6.1.16.1.2. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > terraform_config > s3State > stateBucket`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_use_bootstrap"></a>4.1.4.1.6.1.17. Property `root > domains > additionalProperties > env_templates > additionalProperties > modules > additionalProperties > use_bootstrap`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true (default), will use the MDAA bootstrap env

###### <a name="domains_additionalProperties_env_templates_additionalProperties_tag_config_data"></a>4.1.4.1.7. Property `root > domains > additionalProperties > env_templates > additionalProperties > tag_config_data`

|                           |                                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                  |
| **Required**              | No                                                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#domains_additionalProperties_env_templates_additionalProperties_tag_config_data_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Tagging data which will be passed directly to apps

| Property                                                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#domains_additionalProperties_env_templates_additionalProperties_tag_config_data_additionalProperties ) | No      | string | No         | -          | -                 |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_tag_config_data_additionalProperties"></a>4.1.4.1.7.1. Property `root > domains > additionalProperties > env_templates > additionalProperties > tag_config_data > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_tag_configs"></a>4.1.4.1.8. Property `root > domains > additionalProperties > env_templates > additionalProperties > tag_configs`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** A list of paths to tag configuration files.
Configurations will be compiled together in the order they appear,
with later configuration files taking precendence over earlier configurations.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                         | Description |
| ------------------------------------------------------------------------------------------------------- | ----------- |
| [tag_configs items](#domains_additionalProperties_env_templates_additionalProperties_tag_configs_items) | -           |

###### <a name="autogenerated_heading_28"></a>4.1.4.1.8.1. root > domains > additionalProperties > env_templates > additionalProperties > tag_configs > tag_configs items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="domains_additionalProperties_env_templates_additionalProperties_template"></a>4.1.4.1.9. Property `root > domains > additionalProperties > env_templates > additionalProperties > template`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** If specified, the referenced environment template will be used as the basis for this environment config.
Template values can be overridden with specific values in this config.

###### <a name="domains_additionalProperties_env_templates_additionalProperties_terraform_config"></a>4.1.4.1.10. Property `root > domains > additionalProperties > env_templates > additionalProperties > terraform_config`

|                           |                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                           |
| **Required**              | No                                                                                                                                 |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                            |
| **Same definition as**    | [terraform_config](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_terraform_config) |

**Description:** Config properties for TF modules

###### <a name="domains_additionalProperties_env_templates_additionalProperties_use_bootstrap"></a>4.1.4.1.11. Property `root > domains > additionalProperties > env_templates > additionalProperties > use_bootstrap`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true (default), will use the MDAA bootstrap env

#### <a name="domains_additionalProperties_environments"></a>4.1.5. Property `root > domains > additionalProperties > environments`

|                           |                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                            |
| **Required**              | Yes                                                                                                                                                 |
| **Additional properties** | [[Should-conform]](#domains_additionalProperties_environments_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Arn or SSM Import (prefix with ssm:) of the environment provider

| Property                                                               | Pattern | Type   | Deprecated | Definition                                                                                                                                   | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| - [](#domains_additionalProperties_environments_additionalProperties ) | No      | object | No         | Same as [domains_additionalProperties_env_templates_additionalProperties](#domains_additionalProperties_env_templates_additionalProperties ) | -                 |

##### <a name="domains_additionalProperties_environments_additionalProperties"></a>4.1.5.1. Property `root > domains > additionalProperties > environments > MdaaEnvironmentConfig`

|                           |                                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                            |
| **Required**              | No                                                                                                                                  |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                             |
| **Same definition as**    | [domains_additionalProperties_env_templates_additionalProperties](#domains_additionalProperties_env_templates_additionalProperties) |

#### <a name="domains_additionalProperties_mdaa_version"></a>4.1.6. Property `root > domains > additionalProperties > mdaa_version`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Override the MDAA version

#### <a name="domains_additionalProperties_tag_config_data"></a>4.1.7. Property `root > domains > additionalProperties > tag_config_data`

|                           |                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                               |
| **Required**              | No                                                                                                                                                     |
| **Additional properties** | [[Should-conform]](#domains_additionalProperties_tag_config_data_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Tagging data which will be passed directly to apps

| Property                                                                  | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#domains_additionalProperties_tag_config_data_additionalProperties ) | No      | string | No         | -          | -                 |

##### <a name="domains_additionalProperties_tag_config_data_additionalProperties"></a>4.1.7.1. Property `root > domains > additionalProperties > tag_config_data > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="domains_additionalProperties_tag_configs"></a>4.1.8. Property `root > domains > additionalProperties > tag_configs`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** A list of paths to tag configuration files.
Configurations will be compiled together in the order they appear,
with later configuration files taking precendence over earlier configurations.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                      | Description |
| -------------------------------------------------------------------- | ----------- |
| [tag_configs items](#domains_additionalProperties_tag_configs_items) | -           |

##### <a name="autogenerated_heading_29"></a>4.1.8.1. root > domains > additionalProperties > tag_configs > tag_configs items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="domains_additionalProperties_terraform_config"></a>4.1.9. Property `root > domains > additionalProperties > terraform_config`

|                           |                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                           |
| **Required**              | No                                                                                                                                 |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                            |
| **Same definition as**    | [terraform_config](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_terraform_config) |

**Description:** Config properties for TF modules

## <a name="env_templates"></a>5. Property `root > env_templates`

|                           |                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                |
| **Required**              | No                                                                                                                      |
| **Additional properties** | [[Should-conform]](#env_templates_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Templates for environments which can be referenced throughout the config.

| Property                                   | Pattern | Type   | Deprecated | Definition                                                                                                                                   | Title/Description |
| ------------------------------------------ | ------- | ------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| - [](#env_templates_additionalProperties ) | No      | object | No         | Same as [domains_additionalProperties_env_templates_additionalProperties](#domains_additionalProperties_env_templates_additionalProperties ) | -                 |

### <a name="env_templates_additionalProperties"></a>5.1. Property `root > env_templates > MdaaEnvironmentConfig`

|                           |                                                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                            |
| **Required**              | No                                                                                                                                  |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                             |
| **Same definition as**    | [domains_additionalProperties_env_templates_additionalProperties](#domains_additionalProperties_env_templates_additionalProperties) |

## <a name="log_suppressions"></a>6. Property `root > log_suppressions`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** A string representing the target region

## <a name="mdaa_version"></a>7. Property `root > mdaa_version`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Override the MDAA version

## <a name="naming_class"></a>8. Property `root > naming_class`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The MDAA Naming Class to be utilized from the Naming Module

## <a name="naming_module"></a>9. Property `root > naming_module`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The MDAA Naming Module to be utilized

## <a name="naming_props"></a>10. Property `root > naming_props`

|                           |                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                               |
| **Required**              | No                                                                                                                     |
| **Additional properties** | [[Should-conform]](#naming_props_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Props to be passed to the custom naming class

| Property                                  | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#naming_props_additionalProperties ) | No      | object | No         | -          | -                 |

### <a name="naming_props_additionalProperties"></a>10.1. Property `root > naming_props > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

## <a name="organization"></a>11. Property `root > organization`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** A string representing the target region

## <a name="region"></a>12. Property `root > region`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A string representing the target region

## <a name="tag_config_data"></a>13. Property `root > tag_config_data`

|                           |                                                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                  |
| **Required**              | No                                                                                                                        |
| **Additional properties** | [[Should-conform]](#tag_config_data_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Tagging data which will be passed directly to apps

| Property                                     | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#tag_config_data_additionalProperties ) | No      | string | No         | -          | -                 |

### <a name="tag_config_data_additionalProperties"></a>13.1. Property `root > tag_config_data > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

## <a name="tag_configs"></a>14. Property `root > tag_configs`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** A list of paths to tag configuration files.
Configurations will be compiled together in the order they appear,
with later configuration files taking precendence over earlier configurations.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be         | Description |
| --------------------------------------- | ----------- |
| [tag_configs items](#tag_configs_items) | -           |

### <a name="autogenerated_heading_30"></a>14.1. root > tag_configs > tag_configs items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

## <a name="terraform_config"></a>15. Property `root > terraform_config`

|                           |                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                           |
| **Required**              | No                                                                                                                                 |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                            |
| **Same definition as**    | [terraform_config](#domains_additionalProperties_env_templates_additionalProperties_modules_additionalProperties_terraform_config) |

**Description:** Config properties for TF modules

----------------------------------------------------------------------------------------------------------------------------
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-16 at 12:17:43 -0400

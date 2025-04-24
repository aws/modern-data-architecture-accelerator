# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                       | Title/Description                                                                                                                                    |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [domain](#domain )                                                 | No      | object | No         | In #/definitions/DomainProps                     | -                                                                                                                                                    |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                     |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |

## <a name="domain"></a>1. Property `root > domain`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DomainProps                               |

| Property                                                                | Pattern | Type             | Deprecated | Definition                                                           | Title/Description                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------- | ------- | ---------------- | ---------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [assetDeploymentMemoryLimitMB](#domain_assetDeploymentMemoryLimitMB ) | No      | number           | No         | -                                                                    | Memory to be allocated to the Lifecycle asset deployment Lambda.<br />May need to be increased for very large asset deployments.                                                                                                                                                         |
| - [assetPrefix](#domain_assetPrefix )                                   | No      | string           | No         | -                                                                    | S3 Prefix where lifecycle assets will be stored.<br />If not specified, default to "lifecycle-assets/"                                                                                                                                                                                   |
| + [authMode](#domain_authMode )                                         | No      | enum (of string) | No         | In #/definitions/AuthMode                                            | The AuthMode for the domain. Must be either 'SSO' or 'IAM'                                                                                                                                                                                                                               |
| - [dataAdminRoles](#domain_dataAdminRoles )                             | No      | array            | No         | -                                                                    | Ids of roles which will be provided administrator access to Studio resources                                                                                                                                                                                                             |
| - [defaultExecutionRole](#domain_defaultExecutionRole )                 | No      | object           | No         | Same as [domain_dataAdminRoles_items](#domain_dataAdminRoles_items ) | If defined, will be set as the default execution role for the domain. <br />If undefined, a default execution role will be created with minimal permissions required<br />to launch Studio Apps.                                                                                         |
| - [defaultUserSettings](#domain_defaultUserSettings )                   | No      | object           | No         | In #/definitions/DomainUserSettings                                  | Default user settings for user apps.                                                                                                                                                                                                                                                     |
| - [domainBucket](#domain_domainBucket )                                 | No      | object           | No         | In #/definitions/DomainBucketProps                                   | If specified, this will be used as the domain bucket.<br />If not specified, a new bucket will be created.                                                                                                                                                                               |
| - [kmsKeyArn](#domain_kmsKeyArn )                                       | No      | string           | No         | -                                                                    | If defined, will be set as the studio KMS Key (for EFS)                                                                                                                                                                                                                                  |
| - [lifecycleConfigs](#domain_lifecycleConfigs )                         | No      | object           | No         | In #/definitions/StudioLifecycleConfigProps                          | Lifecycle configs to be created and bound to domain applications                                                                                                                                                                                                                         |
| - [notebookSharingPrefix](#domain_notebookSharingPrefix )               | No      | string           | No         | -                                                                    | S3 Prefix where shared notebooks will be stored.<br />If not specified, defaults to "sharing/"                                                                                                                                                                                           |
| - [securityGroupEgress](#domain_securityGroupEgress )                   | No      | object           | No         | In #/definitions/MdaaSecurityGroupRuleProps                          | Security group Egress rules.                                                                                                                                                                                                                                                             |
| - [securityGroupId](#domain_securityGroupId )                           | No      | string           | No         | -                                                                    | Id of an existing security group. If specified, will be used instead of creating<br />a security group                                                                                                                                                                                   |
| - [securityGroupIngress](#domain_securityGroupIngress )                 | No      | object           | No         | Same as [securityGroupEgress](#domain_securityGroupEgress )          | Security group ingress rules.                                                                                                                                                                                                                                                            |
| + [subnetIds](#domain_subnetIds )                                       | No      | array of string  | No         | -                                                                    | The IDs of the subnets to which all Studio user apps will be bound                                                                                                                                                                                                                       |
| - [userProfiles](#domain_userProfiles )                                 | No      | object           | No         | In #/definitions/NamedUserProfileProps                               | List of Studio user profiles which will be created. The key/name<br />of the user profile should be specified as follows:<br />If the Domain is in SSO mode, this should map to an SSO User ID.<br />If in IAM mode, this should map to Session Name portion of the aws:userid variable. |
| + [vpcId](#domain_vpcId )                                               | No      | string           | No         | -                                                                    | The ID of the VPC to which all Studio user apps will be bound                                                                                                                                                                                                                            |

### <a name="domain_assetDeploymentMemoryLimitMB"></a>1.1. Property `root > domain > assetDeploymentMemoryLimitMB`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Memory to be allocated to the Lifecycle asset deployment Lambda.
May need to be increased for very large asset deployments.

### <a name="domain_assetPrefix"></a>1.2. Property `root > domain > assetPrefix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** S3 Prefix where lifecycle assets will be stored.
If not specified, default to "lifecycle-assets/"

### <a name="domain_authMode"></a>1.3. Property `root > domain > authMode`

|                |                        |
| -------------- | ---------------------- |
| **Type**       | `enum (of string)`     |
| **Required**   | Yes                    |
| **Defined in** | #/definitions/AuthMode |

**Description:** The AuthMode for the domain. Must be either 'SSO' or 'IAM'

Must be one of:
* "IAM"
* "SSO"

### <a name="domain_dataAdminRoles"></a>1.4. Property `root > domain > dataAdminRoles`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** Ids of roles which will be provided administrator access to Studio resources

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be             | Description                                                                  |
| ------------------------------------------- | ---------------------------------------------------------------------------- |
| [MdaaRoleRef](#domain_dataAdminRoles_items) | A reference to an IAM role. Roles can be referenced by name, arn, and/or id. |

#### <a name="autogenerated_heading_2"></a>1.4.1. root > domain > dataAdminRoles > MdaaRoleRef

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaRoleRef                               |

**Description:** A reference to an IAM role. Roles can be referenced by name, arn, and/or id.

| Property                                               | Pattern | Type    | Deprecated | Definition | Title/Description                                                                             |
| ------------------------------------------------------ | ------- | ------- | ---------- | ---------- | --------------------------------------------------------------------------------------------- |
| - [arn](#domain_dataAdminRoles_items_arn )             | No      | string  | No         | -          | Reference role by arn                                                                         |
| - [id](#domain_dataAdminRoles_items_id )               | No      | string  | No         | -          | Reference role by id                                                                          |
| - [immutable](#domain_dataAdminRoles_items_immutable ) | No      | boolean | No         | -          | Indicates whether the role should be considered immutable (defaults false)                    |
| - [name](#domain_dataAdminRoles_items_name )           | No      | string  | No         | -          | Reference role by name                                                                        |
| - [refId](#domain_dataAdminRoles_items_refId )         | No      | string  | No         | -          | A string which uniquely identifies the MdaaRoleRef within a scope.                            |
| - [sso](#domain_dataAdminRoles_items_sso )             | No      | boolean | No         | -          | If true, role name will be resolved to an SSO auto-generated role. Also implies immutability. |

##### <a name="domain_dataAdminRoles_items_arn"></a>1.4.1.1. Property `root > domain > dataAdminRoles > dataAdminRoles items > arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by arn

##### <a name="domain_dataAdminRoles_items_id"></a>1.4.1.2. Property `root > domain > dataAdminRoles > dataAdminRoles items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by id

##### <a name="domain_dataAdminRoles_items_immutable"></a>1.4.1.3. Property `root > domain > dataAdminRoles > dataAdminRoles items > immutable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Indicates whether the role should be considered immutable (defaults false)

##### <a name="domain_dataAdminRoles_items_name"></a>1.4.1.4. Property `root > domain > dataAdminRoles > dataAdminRoles items > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by name

##### <a name="domain_dataAdminRoles_items_refId"></a>1.4.1.5. Property `root > domain > dataAdminRoles > dataAdminRoles items > refId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A string which uniquely identifies the MdaaRoleRef within a scope.

##### <a name="domain_dataAdminRoles_items_sso"></a>1.4.1.6. Property `root > domain > dataAdminRoles > dataAdminRoles items > sso`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true, role name will be resolved to an SSO auto-generated role. Also implies immutability.

### <a name="domain_defaultExecutionRole"></a>1.5. Property `root > domain > defaultExecutionRole`

|                           |                                                             |
| ------------------------- | ----------------------------------------------------------- |
| **Type**                  | `object`                                                    |
| **Required**              | No                                                          |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")     |
| **Same definition as**    | [domain_dataAdminRoles_items](#domain_dataAdminRoles_items) |

**Description:** If defined, will be set as the default execution role for the domain. 
If undefined, a default execution role will be created with minimal permissions required
to launch Studio Apps.

### <a name="domain_defaultUserSettings"></a>1.6. Property `root > domain > defaultUserSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DomainUserSettings                        |

**Description:** Default user settings for user apps.

| Property                                                                                  | Pattern | Type             | Deprecated | Definition                                                     | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [jupyterServerAppSettings](#domain_defaultUserSettings_jupyterServerAppSettings )       | No      | object           | No         | In #/definitions/CfnDomain.JupyterServerAppSettingsProperty    | The Jupyter server's app settings.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| - [kernelGatewayAppSettings](#domain_defaultUserSettings_kernelGatewayAppSettings )       | No      | object           | No         | In #/definitions/CfnDomain.KernelGatewayAppSettingsProperty    | The kernel gateway app settings.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| - [rSessionAppSettings](#domain_defaultUserSettings_rSessionAppSettings )                 | No      | object           | No         | In #/definitions/CfnDomain.RSessionAppSettingsProperty         | A collection of settings that configure the \`RSessionGateway\` app.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| - [rStudioServerProAppSettings](#domain_defaultUserSettings_rStudioServerProAppSettings ) | No      | object           | No         | In #/definitions/CfnDomain.RStudioServerProAppSettingsProperty | A collection of settings that configure user interaction with the \`RStudioServerPro\` app.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| - [securityGroups](#domain_defaultUserSettings_securityGroups )                           | No      | array of string  | No         | -                                                              | The security groups for the Amazon Virtual Private Cloud (VPC) that Studio uses for communication.<br /><br />Optional when the \`CreateDomain.AppNetworkAccessType\` parameter is set to \`PublicInternetOnly\` .<br /><br />Required when the \`CreateDomain.AppNetworkAccessType\` parameter is set to \`VpcOnly\` , unless specified as part of the \`DefaultUserSettings\` for the domain.<br /><br />Amazon SageMaker adds a security group to allow NFS traffic from SageMaker Studio. Therefore, the number of security groups that you can specify is one less than the maximum number shown. |
| - [sharingSettings](#domain_defaultUserSettings_sharingSettings )                         | No      | object           | No         | In #/definitions/CfnDomain.SharingSettingsProperty             | Specifies options for sharing SageMaker Studio notebooks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| - [studioWebPortal](#domain_defaultUserSettings_studioWebPortal )                         | No      | enum (of string) | No         | -                                                              | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

#### <a name="domain_defaultUserSettings_jupyterServerAppSettings"></a>1.6.1. Property `root > domain > defaultUserSettings > jupyterServerAppSettings`

|                           |                                                          |
| ------------------------- | -------------------------------------------------------- |
| **Type**                  | `object`                                                 |
| **Required**              | No                                                       |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")  |
| **Defined in**            | #/definitions/CfnDomain.JupyterServerAppSettingsProperty |

**Description:** The Jupyter server's app settings.

| Property                                                                                           | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                                          |
| -------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| - [defaultResourceSpec](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec ) | No      | Combination | No         | -          | The default instance type and the Amazon Resource Name (ARN) of the default SageMaker image used by the JupyterServer app. |

##### <a name="domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec"></a>1.6.1.1. Property `root > domain > defaultUserSettings > jupyterServerAppSettings > defaultResourceSpec`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** The default instance type and the Amazon Resource Name (ARN) of the default SageMaker image used by the JupyterServer app.

| Any of(Option)                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0)                    |
| [CfnDomain.ResourceSpecProperty](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i1) |

###### <a name="domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0"></a>1.6.1.1.1. Property `root > domain > defaultUserSettings > jupyterServerAppSettings > defaultResourceSpec > anyOf > IResolvable`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/IResolvable                               |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

| Property                                                                                                            | Pattern | Type             | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [creationStack](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0_creationStack ) | No      | array of string  | No         | -          | The creation stack of this resolvable which will be appended to errors<br />thrown during resolution.<br /><br />This may return an array with a single informational element indicating how<br />to get this property populated, if it was skipped for performance reasons. |
| - [typeHint](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0_typeHint )           | No      | enum (of string) | No         | -          | The type that this token will likely resolve to.                                                                                                                                                                                                                             |

###### <a name="domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0_creationStack"></a>1.6.1.1.1.1. Property `root > domain > defaultUserSettings > jupyterServerAppSettings > defaultResourceSpec > anyOf > item 0 > creationStack`

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

| Each item of this array must be                                                                                              | Description |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [creationStack items](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0_creationStack_items) | -           |

###### <a name="autogenerated_heading_3"></a>1.6.1.1.1.1.1. root > domain > defaultUserSettings > jupyterServerAppSettings > defaultResourceSpec > anyOf > item 0 > creationStack > creationStack items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0_typeHint"></a>1.6.1.1.1.2. Property `root > domain > defaultUserSettings > jupyterServerAppSettings > defaultResourceSpec > anyOf > item 0 > typeHint`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

**Description:** The type that this token will likely resolve to.

Must be one of:
* "number"
* "string"
* "string-list"

###### <a name="domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i1"></a>1.6.1.1.2. Property `root > domain > defaultUserSettings > jupyterServerAppSettings > defaultResourceSpec > anyOf > CfnDomain.ResourceSpecProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDomain.ResourceSpecProperty            |

**Description:** Specifies the ARN's of a SageMaker image and SageMaker image version, and the instance type that the version runs on.

| Property                                                                                                                                  | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [instanceType](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i1_instanceType )                         | No      | string | No         | -          | The instance type that the image version runs on.<br /><br />> *JupyterServer apps* only support the \`system\` value.<br />><br />> For *KernelGateway apps* , the \`system\` value is translated to \`ml.t3.medium\` . KernelGateway apps also support all other values for available instance types. |
| - [lifecycleConfigArn](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i1_lifecycleConfigArn )             | No      | string | No         | -          | The Amazon Resource Name (ARN) of the Lifecycle Configuration attached to the Resource.                                                                                                                                                                                                                 |
| - [sageMakerImageArn](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i1_sageMakerImageArn )               | No      | string | No         | -          | The ARN of the SageMaker image that the image version belongs to.                                                                                                                                                                                                                                       |
| - [sageMakerImageVersionArn](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i1_sageMakerImageVersionArn ) | No      | string | No         | -          | The ARN of the image version created on the instance.                                                                                                                                                                                                                                                   |

###### <a name="domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i1_instanceType"></a>1.6.1.1.2.1. Property `root > domain > defaultUserSettings > jupyterServerAppSettings > defaultResourceSpec > anyOf > item 1 > instanceType`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The instance type that the image version runs on.

> *JupyterServer apps* only support the `system` value.
>
> For *KernelGateway apps* , the `system` value is translated to `ml.t3.medium` . KernelGateway apps also support all other values for available instance types.

###### <a name="domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i1_lifecycleConfigArn"></a>1.6.1.1.2.2. Property `root > domain > defaultUserSettings > jupyterServerAppSettings > defaultResourceSpec > anyOf > item 1 > lifecycleConfigArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The Amazon Resource Name (ARN) of the Lifecycle Configuration attached to the Resource.

###### <a name="domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i1_sageMakerImageArn"></a>1.6.1.1.2.3. Property `root > domain > defaultUserSettings > jupyterServerAppSettings > defaultResourceSpec > anyOf > item 1 > sageMakerImageArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The ARN of the SageMaker image that the image version belongs to.

###### <a name="domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i1_sageMakerImageVersionArn"></a>1.6.1.1.2.4. Property `root > domain > defaultUserSettings > jupyterServerAppSettings > defaultResourceSpec > anyOf > item 1 > sageMakerImageVersionArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The ARN of the image version created on the instance.

#### <a name="domain_defaultUserSettings_kernelGatewayAppSettings"></a>1.6.2. Property `root > domain > defaultUserSettings > kernelGatewayAppSettings`

|                           |                                                          |
| ------------------------- | -------------------------------------------------------- |
| **Type**                  | `object`                                                 |
| **Required**              | No                                                       |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")  |
| **Defined in**            | #/definitions/CfnDomain.KernelGatewayAppSettingsProperty |

**Description:** The kernel gateway app settings.

| Property                                                                                           | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [customImages](#domain_defaultUserSettings_kernelGatewayAppSettings_customImages )               | No      | Combination | No         | -          | A list of custom SageMaker images that are configured to run as a KernelGateway app.                                                                                                                                                                                                                                                                                                        |
| - [defaultResourceSpec](#domain_defaultUserSettings_kernelGatewayAppSettings_defaultResourceSpec ) | No      | Combination | No         | -          | The default instance type and the Amazon Resource Name (ARN) of the default SageMaker image used by the KernelGateway app.<br /><br />> The Amazon SageMaker Studio UI does not use the default instance type value set here. The default instance type set here is used when Apps are created using the AWS CLI or AWS CloudFormation and the instance type parameter value is not passed. |

##### <a name="domain_defaultUserSettings_kernelGatewayAppSettings_customImages"></a>1.6.2.1. Property `root > domain > defaultUserSettings > kernelGatewayAppSettings > customImages`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** A list of custom SageMaker images that are configured to run as a KernelGateway app.

| Any of(Option)                                                                            |
| ----------------------------------------------------------------------------------------- |
| [IResolvable](#domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i0) |
| [item 1](#domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1)      |

###### <a name="domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i0"></a>1.6.2.1.1. Property `root > domain > defaultUserSettings > kernelGatewayAppSettings > customImages > anyOf > IResolvable`

|                           |                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                               |
| **Same definition as**    | [domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1"></a>1.6.2.1.2. Property `root > domain > defaultUserSettings > kernelGatewayAppSettings > customImages > anyOf > item 1`

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

| Each item of this array must be                                                                  | Description |
| ------------------------------------------------------------------------------------------------ | ----------- |
| [item 1 items](#domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1_items) | -           |

###### <a name="autogenerated_heading_4"></a>1.6.2.1.2.1. root > domain > defaultUserSettings > kernelGatewayAppSettings > customImages > anyOf > item 1 > item 1 items

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1_items_anyOf_i0)                   |
| [CfnDomain.CustomImageProperty](#domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1_items_anyOf_i1) |

###### <a name="domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1_items_anyOf_i0"></a>1.6.2.1.2.1.1. Property `root > domain > defaultUserSettings > kernelGatewayAppSettings > customImages > anyOf > item 1 > item 1 items > anyOf > IResolvable`

|                           |                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                               |
| **Same definition as**    | [domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1_items_anyOf_i1"></a>1.6.2.1.2.1.2. Property `root > domain > defaultUserSettings > kernelGatewayAppSettings > customImages > anyOf > item 1 > item 1 items > anyOf > CfnDomain.CustomImageProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDomain.CustomImageProperty             |

**Description:** A custom SageMaker image.

For more information, see [Bring your own SageMaker image](https://docs.aws.amazon.com/sagemaker/latest/dg/studio-byoi.html) .

| Property                                                                                                                              | Pattern | Type   | Deprecated | Definition | Title/Description                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------------------------------------------------------------- |
| + [appImageConfigName](#domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1_items_anyOf_i1_appImageConfigName ) | No      | string | No         | -          | The name of the AppImageConfig.                                         |
| + [imageName](#domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1_items_anyOf_i1_imageName )                   | No      | string | No         | -          | The name of the CustomImage.<br /><br />Must be unique to your account. |
| - [imageVersionNumber](#domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1_items_anyOf_i1_imageVersionNumber ) | No      | number | No         | -          | The version number of the CustomImage.                                  |

###### <a name="domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1_items_anyOf_i1_appImageConfigName"></a>1.6.2.1.2.1.2.1. Property `root > domain > defaultUserSettings > kernelGatewayAppSettings > customImages > anyOf > item 1 > item 1 items > anyOf > item 1 > appImageConfigName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the AppImageConfig.

###### <a name="domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1_items_anyOf_i1_imageName"></a>1.6.2.1.2.1.2.2. Property `root > domain > defaultUserSettings > kernelGatewayAppSettings > customImages > anyOf > item 1 > item 1 items > anyOf > item 1 > imageName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the CustomImage.

Must be unique to your account.

###### <a name="domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1_items_anyOf_i1_imageVersionNumber"></a>1.6.2.1.2.1.2.3. Property `root > domain > defaultUserSettings > kernelGatewayAppSettings > customImages > anyOf > item 1 > item 1 items > anyOf > item 1 > imageVersionNumber`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The version number of the CustomImage.

##### <a name="domain_defaultUserSettings_kernelGatewayAppSettings_defaultResourceSpec"></a>1.6.2.2. Property `root > domain > defaultUserSettings > kernelGatewayAppSettings > defaultResourceSpec`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** The default instance type and the Amazon Resource Name (ARN) of the default SageMaker image used by the KernelGateway app.

> The Amazon SageMaker Studio UI does not use the default instance type value set here. The default instance type set here is used when Apps are created using the AWS CLI or AWS CloudFormation and the instance type parameter value is not passed.

| Any of(Option)                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#domain_defaultUserSettings_kernelGatewayAppSettings_defaultResourceSpec_anyOf_i0)                    |
| [CfnDomain.ResourceSpecProperty](#domain_defaultUserSettings_kernelGatewayAppSettings_defaultResourceSpec_anyOf_i1) |

###### <a name="domain_defaultUserSettings_kernelGatewayAppSettings_defaultResourceSpec_anyOf_i0"></a>1.6.2.2.1. Property `root > domain > defaultUserSettings > kernelGatewayAppSettings > defaultResourceSpec > anyOf > IResolvable`

|                           |                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                               |
| **Same definition as**    | [domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="domain_defaultUserSettings_kernelGatewayAppSettings_defaultResourceSpec_anyOf_i1"></a>1.6.2.2.2. Property `root > domain > defaultUserSettings > kernelGatewayAppSettings > defaultResourceSpec > anyOf > CfnDomain.ResourceSpecProperty`

|                           |                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                               |
| **Same definition as**    | [domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i1](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i1) |

**Description:** Specifies the ARN's of a SageMaker image and SageMaker image version, and the instance type that the version runs on.

#### <a name="domain_defaultUserSettings_rSessionAppSettings"></a>1.6.3. Property `root > domain > defaultUserSettings > rSessionAppSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDomain.RSessionAppSettingsProperty     |

**Description:** A collection of settings that configure the `RSessionGateway` app.

| Property                                                                                      | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                                    |
| --------------------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------- |
| - [customImages](#domain_defaultUserSettings_rSessionAppSettings_customImages )               | No      | Combination | No         | -          | A list of custom SageMaker images that are configured to run as a RSession app.                                      |
| - [defaultResourceSpec](#domain_defaultUserSettings_rSessionAppSettings_defaultResourceSpec ) | No      | Combination | No         | -          | Specifies the ARNs of a SageMaker image and SageMaker image version, and the instance type that the version runs on. |

##### <a name="domain_defaultUserSettings_rSessionAppSettings_customImages"></a>1.6.3.1. Property `root > domain > defaultUserSettings > rSessionAppSettings > customImages`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** A list of custom SageMaker images that are configured to run as a RSession app.

| Any of(Option)                                                                       |
| ------------------------------------------------------------------------------------ |
| [IResolvable](#domain_defaultUserSettings_rSessionAppSettings_customImages_anyOf_i0) |
| [item 1](#domain_defaultUserSettings_rSessionAppSettings_customImages_anyOf_i1)      |

###### <a name="domain_defaultUserSettings_rSessionAppSettings_customImages_anyOf_i0"></a>1.6.3.1.1. Property `root > domain > defaultUserSettings > rSessionAppSettings > customImages > anyOf > IResolvable`

|                           |                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                               |
| **Same definition as**    | [domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="domain_defaultUserSettings_rSessionAppSettings_customImages_anyOf_i1"></a>1.6.3.1.2. Property `root > domain > defaultUserSettings > rSessionAppSettings > customImages > anyOf > item 1`

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

| Each item of this array must be                                                             | Description |
| ------------------------------------------------------------------------------------------- | ----------- |
| [item 1 items](#domain_defaultUserSettings_rSessionAppSettings_customImages_anyOf_i1_items) | -           |

###### <a name="autogenerated_heading_5"></a>1.6.3.1.2.1. root > domain > defaultUserSettings > rSessionAppSettings > customImages > anyOf > item 1 > item 1 items

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

| Any of(Option)                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#domain_defaultUserSettings_rSessionAppSettings_customImages_anyOf_i1_items_anyOf_i0)                   |
| [CfnDomain.CustomImageProperty](#domain_defaultUserSettings_rSessionAppSettings_customImages_anyOf_i1_items_anyOf_i1) |

###### <a name="domain_defaultUserSettings_rSessionAppSettings_customImages_anyOf_i1_items_anyOf_i0"></a>1.6.3.1.2.1.1. Property `root > domain > defaultUserSettings > rSessionAppSettings > customImages > anyOf > item 1 > item 1 items > anyOf > IResolvable`

|                           |                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                               |
| **Same definition as**    | [domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="domain_defaultUserSettings_rSessionAppSettings_customImages_anyOf_i1_items_anyOf_i1"></a>1.6.3.1.2.1.2. Property `root > domain > defaultUserSettings > rSessionAppSettings > customImages > anyOf > item 1 > item 1 items > anyOf > CfnDomain.CustomImageProperty`

|                           |                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                               |
| **Same definition as**    | [domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1_items_anyOf_i1](#domain_defaultUserSettings_kernelGatewayAppSettings_customImages_anyOf_i1_items_anyOf_i1) |

**Description:** A custom SageMaker image.

For more information, see [Bring your own SageMaker image](https://docs.aws.amazon.com/sagemaker/latest/dg/studio-byoi.html) .

##### <a name="domain_defaultUserSettings_rSessionAppSettings_defaultResourceSpec"></a>1.6.3.2. Property `root > domain > defaultUserSettings > rSessionAppSettings > defaultResourceSpec`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Specifies the ARNs of a SageMaker image and SageMaker image version, and the instance type that the version runs on.

| Any of(Option)                                                                                                 |
| -------------------------------------------------------------------------------------------------------------- |
| [IResolvable](#domain_defaultUserSettings_rSessionAppSettings_defaultResourceSpec_anyOf_i0)                    |
| [CfnDomain.ResourceSpecProperty](#domain_defaultUserSettings_rSessionAppSettings_defaultResourceSpec_anyOf_i1) |

###### <a name="domain_defaultUserSettings_rSessionAppSettings_defaultResourceSpec_anyOf_i0"></a>1.6.3.2.1. Property `root > domain > defaultUserSettings > rSessionAppSettings > defaultResourceSpec > anyOf > IResolvable`

|                           |                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                               |
| **Same definition as**    | [domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

###### <a name="domain_defaultUserSettings_rSessionAppSettings_defaultResourceSpec_anyOf_i1"></a>1.6.3.2.2. Property `root > domain > defaultUserSettings > rSessionAppSettings > defaultResourceSpec > anyOf > CfnDomain.ResourceSpecProperty`

|                           |                                                                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                              |
| **Required**              | No                                                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                               |
| **Same definition as**    | [domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i1](#domain_defaultUserSettings_jupyterServerAppSettings_defaultResourceSpec_anyOf_i1) |

**Description:** Specifies the ARN's of a SageMaker image and SageMaker image version, and the instance type that the version runs on.

#### <a name="domain_defaultUserSettings_rStudioServerProAppSettings"></a>1.6.4. Property `root > domain > defaultUserSettings > rStudioServerProAppSettings`

|                           |                                                             |
| ------------------------- | ----------------------------------------------------------- |
| **Type**                  | `object`                                                    |
| **Required**              | No                                                          |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")     |
| **Defined in**            | #/definitions/CfnDomain.RStudioServerProAppSettingsProperty |

**Description:** A collection of settings that configure user interaction with the `RStudioServerPro` app.

| Property                                                                                | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [accessStatus](#domain_defaultUserSettings_rStudioServerProAppSettings_accessStatus ) | No      | string | No         | -          | Indicates whether the current user has access to the \`RStudioServerPro\` app.                                                                                                                                  |
| - [userGroup](#domain_defaultUserSettings_rStudioServerProAppSettings_userGroup )       | No      | string | No         | -          | The level of permissions that the user has within the \`RStudioServerPro\` app.<br /><br />This value defaults to \`User\`. The \`Admin\` value allows the user access to the RStudio Administrative Dashboard. |

##### <a name="domain_defaultUserSettings_rStudioServerProAppSettings_accessStatus"></a>1.6.4.1. Property `root > domain > defaultUserSettings > rStudioServerProAppSettings > accessStatus`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Indicates whether the current user has access to the `RStudioServerPro` app.

##### <a name="domain_defaultUserSettings_rStudioServerProAppSettings_userGroup"></a>1.6.4.2. Property `root > domain > defaultUserSettings > rStudioServerProAppSettings > userGroup`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The level of permissions that the user has within the `RStudioServerPro` app.

This value defaults to `User`. The `Admin` value allows the user access to the RStudio Administrative Dashboard.

#### <a name="domain_defaultUserSettings_securityGroups"></a>1.6.5. Property `root > domain > defaultUserSettings > securityGroups`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** The security groups for the Amazon Virtual Private Cloud (VPC) that Studio uses for communication.

Optional when the `CreateDomain.AppNetworkAccessType` parameter is set to `PublicInternetOnly` .

Required when the `CreateDomain.AppNetworkAccessType` parameter is set to `VpcOnly` , unless specified as part of the `DefaultUserSettings` for the domain.

Amazon SageMaker adds a security group to allow NFS traffic from SageMaker Studio. Therefore, the number of security groups that you can specify is one less than the maximum number shown.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                          | Description |
| ------------------------------------------------------------------------ | ----------- |
| [securityGroups items](#domain_defaultUserSettings_securityGroups_items) | -           |

##### <a name="autogenerated_heading_6"></a>1.6.5.1. root > domain > defaultUserSettings > securityGroups > securityGroups items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="domain_defaultUserSettings_sharingSettings"></a>1.6.6. Property `root > domain > defaultUserSettings > sharingSettings`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnDomain.SharingSettingsProperty         |

**Description:** Specifies options for sharing SageMaker Studio notebooks.

| Property                                                                                    | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                       |
| ------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [notebookOutputOption](#domain_defaultUserSettings_sharingSettings_notebookOutputOption ) | No      | string | No         | -          | Whether to include the notebook cell output when sharing the notebook.<br /><br />The default is \`Disabled\` .                                                         |
| - [s3KmsKeyId](#domain_defaultUserSettings_sharingSettings_s3KmsKeyId )                     | No      | string | No         | -          | When \`NotebookOutputOption\` is \`Allowed\` , the AWS Key Management Service (KMS) encryption key ID used to encrypt the notebook cell output in the Amazon S3 bucket. |
| - [s3OutputPath](#domain_defaultUserSettings_sharingSettings_s3OutputPath )                 | No      | string | No         | -          | When \`NotebookOutputOption\` is \`Allowed\` , the Amazon S3 bucket used to store the shared notebook snapshots.                                                        |

##### <a name="domain_defaultUserSettings_sharingSettings_notebookOutputOption"></a>1.6.6.1. Property `root > domain > defaultUserSettings > sharingSettings > notebookOutputOption`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Whether to include the notebook cell output when sharing the notebook.

The default is `Disabled` .

##### <a name="domain_defaultUserSettings_sharingSettings_s3KmsKeyId"></a>1.6.6.2. Property `root > domain > defaultUserSettings > sharingSettings > s3KmsKeyId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** When `NotebookOutputOption` is `Allowed` , the AWS Key Management Service (KMS) encryption key ID used to encrypt the notebook cell output in the Amazon S3 bucket.

##### <a name="domain_defaultUserSettings_sharingSettings_s3OutputPath"></a>1.6.6.3. Property `root > domain > defaultUserSettings > sharingSettings > s3OutputPath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** When `NotebookOutputOption` is `Allowed` , the Amazon S3 bucket used to store the shared notebook snapshots.

#### <a name="domain_defaultUserSettings_studioWebPortal"></a>1.6.7. Property `root > domain > defaultUserSettings > studioWebPortal`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

Must be one of:
* "DISABLED"
* "ENABLED"

### <a name="domain_domainBucket"></a>1.7. Property `root > domain > domainBucket`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DomainBucketProps                         |

**Description:** If specified, this will be used as the domain bucket.
If not specified, a new bucket will be created.

| Property                                                           | Pattern | Type   | Deprecated | Definition                                                           | Title/Description                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------ | ------- | ------ | ---------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| + [assetDeploymentRole](#domain_domainBucket_assetDeploymentRole ) | No      | object | No         | Same as [domain_dataAdminRoles_items](#domain_dataAdminRoles_items ) | If defined, this role will be used to deploy lifecycle assets.<br />Should be assumable by lambda, and have write access<br />to the domain bucket under the assetPrefix.<br />Must be specified if an existing domainBucketName is also specified. <br />Otherwise, a new role will be created with access to the generated<br />domain bucket. |
| + [domainBucketName](#domain_domainBucket_domainBucketName )       | No      | string | No         | -                                                                    | If specified, will be used as the bucket for the domain,<br />where notebooks will be shared, and lifecycle assets will be uploaded.<br />Otherwise a new bucket will be created.                                                                                                                                                                |

#### <a name="domain_domainBucket_assetDeploymentRole"></a>1.7.1. Property `root > domain > domainBucket > assetDeploymentRole`

|                           |                                                             |
| ------------------------- | ----------------------------------------------------------- |
| **Type**                  | `object`                                                    |
| **Required**              | Yes                                                         |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")     |
| **Same definition as**    | [domain_dataAdminRoles_items](#domain_dataAdminRoles_items) |

**Description:** If defined, this role will be used to deploy lifecycle assets.
Should be assumable by lambda, and have write access
to the domain bucket under the assetPrefix.
Must be specified if an existing domainBucketName is also specified. 
Otherwise, a new role will be created with access to the generated
domain bucket.

#### <a name="domain_domainBucket_domainBucketName"></a>1.7.2. Property `root > domain > domainBucket > domainBucketName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** If specified, will be used as the bucket for the domain,
where notebooks will be shared, and lifecycle assets will be uploaded.
Otherwise a new bucket will be created.

### <a name="domain_kmsKeyArn"></a>1.8. Property `root > domain > kmsKeyArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** If defined, will be set as the studio KMS Key (for EFS)

### <a name="domain_lifecycleConfigs"></a>1.9. Property `root > domain > lifecycleConfigs`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/StudioLifecycleConfigProps                |

**Description:** Lifecycle configs to be created and bound to domain applications

| Property                                       | Pattern | Type   | Deprecated | Definition                                           | Title/Description        |
| ---------------------------------------------- | ------- | ------ | ---------- | ---------------------------------------------------- | ------------------------ |
| - [jupyter](#domain_lifecycleConfigs_jupyter ) | No      | object | No         | In #/definitions/LifecycleScriptProps                | Lifecycle config scripts |
| - [kernel](#domain_lifecycleConfigs_kernel )   | No      | object | No         | Same as [jupyter](#domain_lifecycleConfigs_jupyter ) | Lifecycle config scripts |

#### <a name="domain_lifecycleConfigs_jupyter"></a>1.9.1. Property `root > domain > lifecycleConfigs > jupyter`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/LifecycleScriptProps                      |

**Description:** Lifecycle config scripts

| Property                                             | Pattern | Type            | Deprecated | Definition                       | Title/Description |
| ---------------------------------------------------- | ------- | --------------- | ---------- | -------------------------------- | ----------------- |
| - [assets](#domain_lifecycleConfigs_jupyter_assets ) | No      | object          | No         | In #/definitions/NamedAssetProps | -                 |
| + [cmds](#domain_lifecycleConfigs_jupyter_cmds )     | No      | array of string | No         | -                                | -                 |

##### <a name="domain_lifecycleConfigs_jupyter_assets"></a>1.9.1.1. Property `root > domain > lifecycleConfigs > jupyter > assets`

|                           |                                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                         |
| **Required**              | No                                                                                                                                               |
| **Additional properties** | [[Should-conform]](#domain_lifecycleConfigs_jupyter_assets_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedAssetProps                                                                                                                    |

| Property                                                            | Pattern | Type   | Deprecated | Definition                  | Title/Description |
| ------------------------------------------------------------------- | ------- | ------ | ---------- | --------------------------- | ----------------- |
| - [](#domain_lifecycleConfigs_jupyter_assets_additionalProperties ) | No      | object | No         | In #/definitions/AssetProps | -                 |

###### <a name="domain_lifecycleConfigs_jupyter_assets_additionalProperties"></a>1.9.1.1.1. Property `root > domain > lifecycleConfigs > jupyter > assets > AssetProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/AssetProps                                |

| Property                                                                                 | Pattern | Type            | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [exclude](#domain_lifecycleConfigs_jupyter_assets_additionalProperties_exclude )       | No      | array of string | No         | -          | -                 |
| + [sourcePath](#domain_lifecycleConfigs_jupyter_assets_additionalProperties_sourcePath ) | No      | string          | No         | -          | -                 |

###### <a name="domain_lifecycleConfigs_jupyter_assets_additionalProperties_exclude"></a>1.9.1.1.1.1. Property `root > domain > lifecycleConfigs > jupyter > assets > additionalProperties > exclude`

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

| Each item of this array must be                                                             | Description |
| ------------------------------------------------------------------------------------------- | ----------- |
| [exclude items](#domain_lifecycleConfigs_jupyter_assets_additionalProperties_exclude_items) | -           |

###### <a name="autogenerated_heading_7"></a>1.9.1.1.1.1.1. root > domain > lifecycleConfigs > jupyter > assets > additionalProperties > exclude > exclude items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="domain_lifecycleConfigs_jupyter_assets_additionalProperties_sourcePath"></a>1.9.1.1.1.2. Property `root > domain > lifecycleConfigs > jupyter > assets > additionalProperties > sourcePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="domain_lifecycleConfigs_jupyter_cmds"></a>1.9.1.2. Property `root > domain > lifecycleConfigs > jupyter > cmds`

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

| Each item of this array must be                           | Description |
| --------------------------------------------------------- | ----------- |
| [cmds items](#domain_lifecycleConfigs_jupyter_cmds_items) | -           |

###### <a name="autogenerated_heading_8"></a>1.9.1.2.1. root > domain > lifecycleConfigs > jupyter > cmds > cmds items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="domain_lifecycleConfigs_kernel"></a>1.9.2. Property `root > domain > lifecycleConfigs > kernel`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [jupyter](#domain_lifecycleConfigs_jupyter)             |

**Description:** Lifecycle config scripts

### <a name="domain_notebookSharingPrefix"></a>1.10. Property `root > domain > notebookSharingPrefix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** S3 Prefix where shared notebooks will be stored.
If not specified, defaults to "sharing/"

### <a name="domain_securityGroupEgress"></a>1.11. Property `root > domain > securityGroupEgress`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaSecurityGroupRuleProps                |

**Description:** Security group Egress rules.

| Property                                                | Pattern | Type  | Deprecated | Definition | Title/Description |
| ------------------------------------------------------- | ------- | ----- | ---------- | ---------- | ----------------- |
| - [ipv4](#domain_securityGroupEgress_ipv4 )             | No      | array | No         | -          | -                 |
| - [prefixList](#domain_securityGroupEgress_prefixList ) | No      | array | No         | -          | -                 |
| - [sg](#domain_securityGroupEgress_sg )                 | No      | array | No         | -          | -                 |

#### <a name="domain_securityGroupEgress_ipv4"></a>1.11.1. Property `root > domain > securityGroupEgress > ipv4`

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

| Each item of this array must be                        | Description |
| ------------------------------------------------------ | ----------- |
| [MdaaCidrPeer](#domain_securityGroupEgress_ipv4_items) | -           |

##### <a name="autogenerated_heading_9"></a>1.11.1.1. root > domain > securityGroupEgress > ipv4 > MdaaCidrPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaCidrPeer                              |

| Property                                                               | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [cidr](#domain_securityGroupEgress_ipv4_items_cidr )                 | No      | string | No         | -          | -                 |
| - [description](#domain_securityGroupEgress_ipv4_items_description )   | No      | string | No         | -          | -                 |
| - [port](#domain_securityGroupEgress_ipv4_items_port )                 | No      | number | No         | -          | -                 |
| + [protocol](#domain_securityGroupEgress_ipv4_items_protocol )         | No      | string | No         | -          | -                 |
| - [suppressions](#domain_securityGroupEgress_ipv4_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#domain_securityGroupEgress_ipv4_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="domain_securityGroupEgress_ipv4_items_cidr"></a>1.11.1.1.1. Property `root > domain > securityGroupEgress > ipv4 > ipv4 items > cidr`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="domain_securityGroupEgress_ipv4_items_description"></a>1.11.1.1.2. Property `root > domain > securityGroupEgress > ipv4 > ipv4 items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="domain_securityGroupEgress_ipv4_items_port"></a>1.11.1.1.3. Property `root > domain > securityGroupEgress > ipv4 > ipv4 items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="domain_securityGroupEgress_ipv4_items_protocol"></a>1.11.1.1.4. Property `root > domain > securityGroupEgress > ipv4 > ipv4 items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="domain_securityGroupEgress_ipv4_items_suppressions"></a>1.11.1.1.5. Property `root > domain > securityGroupEgress > ipv4 > ipv4 items > suppressions`

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

| Each item of this array must be                                                  | Description |
| -------------------------------------------------------------------------------- | ----------- |
| [NagSuppressionProps](#domain_securityGroupEgress_ipv4_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_10"></a>1.11.1.1.5.1. root > domain > securityGroupEgress > ipv4 > ipv4 items > suppressions > NagSuppressionProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NagSuppressionProps                       |

| Property                                                                      | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#domain_securityGroupEgress_ipv4_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#domain_securityGroupEgress_ipv4_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="domain_securityGroupEgress_ipv4_items_suppressions_items_id"></a>1.11.1.1.5.1.1. Property `root > domain > securityGroupEgress > ipv4 > ipv4 items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="domain_securityGroupEgress_ipv4_items_suppressions_items_reason"></a>1.11.1.1.5.1.2. Property `root > domain > securityGroupEgress > ipv4 > ipv4 items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="domain_securityGroupEgress_ipv4_items_toPort"></a>1.11.1.1.6. Property `root > domain > securityGroupEgress > ipv4 > ipv4 items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

#### <a name="domain_securityGroupEgress_prefixList"></a>1.11.2. Property `root > domain > securityGroupEgress > prefixList`

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

| Each item of this array must be                                    | Description |
| ------------------------------------------------------------------ | ----------- |
| [MdaaPrefixListPeer](#domain_securityGroupEgress_prefixList_items) | -           |

##### <a name="autogenerated_heading_11"></a>1.11.2.1. root > domain > securityGroupEgress > prefixList > MdaaPrefixListPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaPrefixListPeer                        |

| Property                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#domain_securityGroupEgress_prefixList_items_description )   | No      | string | No         | -          | -                 |
| - [port](#domain_securityGroupEgress_prefixList_items_port )                 | No      | number | No         | -          | -                 |
| + [prefixList](#domain_securityGroupEgress_prefixList_items_prefixList )     | No      | string | No         | -          | -                 |
| + [protocol](#domain_securityGroupEgress_prefixList_items_protocol )         | No      | string | No         | -          | -                 |
| - [suppressions](#domain_securityGroupEgress_prefixList_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#domain_securityGroupEgress_prefixList_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="domain_securityGroupEgress_prefixList_items_description"></a>1.11.2.1.1. Property `root > domain > securityGroupEgress > prefixList > prefixList items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="domain_securityGroupEgress_prefixList_items_port"></a>1.11.2.1.2. Property `root > domain > securityGroupEgress > prefixList > prefixList items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="domain_securityGroupEgress_prefixList_items_prefixList"></a>1.11.2.1.3. Property `root > domain > securityGroupEgress > prefixList > prefixList items > prefixList`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="domain_securityGroupEgress_prefixList_items_protocol"></a>1.11.2.1.4. Property `root > domain > securityGroupEgress > prefixList > prefixList items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="domain_securityGroupEgress_prefixList_items_suppressions"></a>1.11.2.1.5. Property `root > domain > securityGroupEgress > prefixList > prefixList items > suppressions`

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

| Each item of this array must be                                                        | Description |
| -------------------------------------------------------------------------------------- | ----------- |
| [NagSuppressionProps](#domain_securityGroupEgress_prefixList_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_12"></a>1.11.2.1.5.1. root > domain > securityGroupEgress > prefixList > prefixList items > suppressions > NagSuppressionProps

|                           |                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                              |
| **Required**              | No                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                               |
| **Same definition as**    | [domain_securityGroupEgress_ipv4_items_suppressions_items](#domain_securityGroupEgress_ipv4_items_suppressions_items) |

###### <a name="domain_securityGroupEgress_prefixList_items_toPort"></a>1.11.2.1.6. Property `root > domain > securityGroupEgress > prefixList > prefixList items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

#### <a name="domain_securityGroupEgress_sg"></a>1.11.3. Property `root > domain > securityGroupEgress > sg`

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

| Each item of this array must be                               | Description |
| ------------------------------------------------------------- | ----------- |
| [MdaaSecurityGroupPeer](#domain_securityGroupEgress_sg_items) | -           |

##### <a name="autogenerated_heading_13"></a>1.11.3.1. root > domain > securityGroupEgress > sg > MdaaSecurityGroupPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaSecurityGroupPeer                     |

| Property                                                             | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#domain_securityGroupEgress_sg_items_description )   | No      | string | No         | -          | -                 |
| - [port](#domain_securityGroupEgress_sg_items_port )                 | No      | number | No         | -          | -                 |
| + [protocol](#domain_securityGroupEgress_sg_items_protocol )         | No      | string | No         | -          | -                 |
| + [sgId](#domain_securityGroupEgress_sg_items_sgId )                 | No      | string | No         | -          | -                 |
| - [suppressions](#domain_securityGroupEgress_sg_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#domain_securityGroupEgress_sg_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="domain_securityGroupEgress_sg_items_description"></a>1.11.3.1.1. Property `root > domain > securityGroupEgress > sg > sg items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="domain_securityGroupEgress_sg_items_port"></a>1.11.3.1.2. Property `root > domain > securityGroupEgress > sg > sg items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="domain_securityGroupEgress_sg_items_protocol"></a>1.11.3.1.3. Property `root > domain > securityGroupEgress > sg > sg items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="domain_securityGroupEgress_sg_items_sgId"></a>1.11.3.1.4. Property `root > domain > securityGroupEgress > sg > sg items > sgId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="domain_securityGroupEgress_sg_items_suppressions"></a>1.11.3.1.5. Property `root > domain > securityGroupEgress > sg > sg items > suppressions`

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
| [NagSuppressionProps](#domain_securityGroupEgress_sg_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_14"></a>1.11.3.1.5.1. root > domain > securityGroupEgress > sg > sg items > suppressions > NagSuppressionProps

|                           |                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                              |
| **Required**              | No                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                               |
| **Same definition as**    | [domain_securityGroupEgress_ipv4_items_suppressions_items](#domain_securityGroupEgress_ipv4_items_suppressions_items) |

###### <a name="domain_securityGroupEgress_sg_items_toPort"></a>1.11.3.1.6. Property `root > domain > securityGroupEgress > sg > sg items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

### <a name="domain_securityGroupId"></a>1.12. Property `root > domain > securityGroupId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Id of an existing security group. If specified, will be used instead of creating
a security group

### <a name="domain_securityGroupIngress"></a>1.13. Property `root > domain > securityGroupIngress`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [securityGroupEgress](#domain_securityGroupEgress)      |

**Description:** Security group ingress rules.

### <a name="domain_subnetIds"></a>1.14. Property `root > domain > subnetIds`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The IDs of the subnets to which all Studio user apps will be bound

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be            | Description |
| ------------------------------------------ | ----------- |
| [subnetIds items](#domain_subnetIds_items) | -           |

#### <a name="autogenerated_heading_15"></a>1.14.1. root > domain > subnetIds > subnetIds items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="domain_userProfiles"></a>1.15. Property `root > domain > userProfiles`

|                           |                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                      |
| **Required**              | No                                                                                                                            |
| **Additional properties** | [[Should-conform]](#domain_userProfiles_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedUserProfileProps                                                                                           |

**Description:** List of Studio user profiles which will be created. The key/name
of the user profile should be specified as follows:
If the Domain is in SSO mode, this should map to an SSO User ID.
If in IAM mode, this should map to Session Name portion of the aws:userid variable.

| Property                                         | Pattern | Type   | Deprecated | Definition                        | Title/Description |
| ------------------------------------------------ | ------- | ------ | ---------- | --------------------------------- | ----------------- |
| - [](#domain_userProfiles_additionalProperties ) | No      | object | No         | In #/definitions/UserProfileProps | -                 |

#### <a name="domain_userProfiles_additionalProperties"></a>1.15.1. Property `root > domain > userProfiles > UserProfileProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/UserProfileProps                          |

| Property                                                          | Pattern | Type   | Deprecated | Definition                                                           | Title/Description                                                                                                                                                                                                                          |
| ----------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [userRole](#domain_userProfiles_additionalProperties_userRole ) | No      | object | No         | Same as [domain_dataAdminRoles_items](#domain_dataAdminRoles_items ) | Required if the domain is in IAM AuthMode. This is the role<br />from which the user will launch the user profile in Studio.<br />The role's id will be combined with the userid<br />to grant the user access to launch the user profile. |

##### <a name="domain_userProfiles_additionalProperties_userRole"></a>1.15.1.1. Property `root > domain > userProfiles > additionalProperties > userRole`

|                           |                                                             |
| ------------------------- | ----------------------------------------------------------- |
| **Type**                  | `object`                                                    |
| **Required**              | No                                                          |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")     |
| **Same definition as**    | [domain_dataAdminRoles_items](#domain_dataAdminRoles_items) |

**Description:** Required if the domain is in IAM AuthMode. This is the role
from which the user will launch the user profile in Studio.
The role's id will be combined with the userid
to grant the user access to launch the user profile.

### <a name="domain_vpcId"></a>1.16. Property `root > domain > vpcId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ID of the VPC to which all Studio user apps will be bound

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

#### <a name="autogenerated_heading_16"></a>2.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

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

###### <a name="autogenerated_heading_17"></a>2.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

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

## <a name="service_catalog_product_config"></a>3. Property `root > service_catalog_product_config`

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

### <a name="service_catalog_product_config_launch_role_name"></a>3.1. Property `root > service_catalog_product_config > launch_role_name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="service_catalog_product_config_name"></a>3.2. Property `root > service_catalog_product_config > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_owner"></a>3.3. Property `root > service_catalog_product_config > owner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_parameters"></a>3.4. Property `root > service_catalog_product_config > parameters`

|                           |                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                            |
| **Required**              | No                                                                                                                                                  |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                               | Pattern | Type   | Deprecated | Definition                                         | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogParameterConfig | -                 |

#### <a name="service_catalog_product_config_parameters_additionalProperties"></a>3.4.1. Property `root > service_catalog_product_config > parameters > MdaaServiceCatalogParameterConfig`

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

##### <a name="service_catalog_product_config_parameters_additionalProperties_constraints"></a>3.4.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_description"></a>3.4.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules"></a>3.4.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules`

|                           |                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                                                   |
| **Required**              | Yes                                                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                      | Pattern | Type   | Deprecated | Definition                                              | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleConfig | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties"></a>3.4.1.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > MdaaServiceCatalogConstraintRuleConfig`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions"></a>3.4.1.1.2.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions`

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

###### <a name="autogenerated_heading_18"></a>3.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert"></a>3.4.1.1.2.1.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > assert`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description"></a>3.4.1.1.2.1.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition"></a>3.4.1.1.2.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > condition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig           |

##### <a name="service_catalog_product_config_parameters_additionalProperties_props"></a>3.4.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedPattern"></a>3.4.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedPattern`

|              |                                                         |
| ------------ | ------------------------------------------------------- |
| **Type**     | `string`                                                |
| **Required** | No                                                      |
| **Default**  | `"- No constraints on patterns allowed for parameter."` |

**Description:** A regular expression that represents the patterns to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedValues"></a>3.4.1.2.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues`

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

###### <a name="autogenerated_heading_19"></a>3.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_constraintDescription"></a>3.4.1.2.3. Property `root > service_catalog_product_config > parameters > additionalProperties > props > constraintDescription`

|              |                                                                                        |
| ------------ | -------------------------------------------------------------------------------------- |
| **Type**     | `string`                                                                               |
| **Required** | No                                                                                     |
| **Default**  | `"- No description with customized error message when user specifies invalid values."` |

**Description:** A string that explains a constraint when the constraint is violated.
For example, without a constraint description, a parameter that has an allowed
pattern of [A-Za-z0-9]+ displays the following error message when the user specifies
an invalid value:

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_default"></a>3.4.1.2.4. Property `root > service_catalog_product_config > parameters > additionalProperties > props > default`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Default**               | `"- No default value for parameter."`                                     |

**Description:** A value of the appropriate type for the template to use if no value is specified
when a stack is created. If you define constraints for the parameter, you must specify
a value that adheres to those constraints.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_description"></a>3.4.1.2.5. Property `root > service_catalog_product_config > parameters > additionalProperties > props > description`

|              |                                         |
| ------------ | --------------------------------------- |
| **Type**     | `string`                                |
| **Required** | No                                      |
| **Default**  | `"- No description for the parameter."` |

**Description:** A string of up to 4000 characters that describes the parameter.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxLength"></a>3.4.1.2.6. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the largest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxValue"></a>3.4.1.2.7. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the largest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minLength"></a>3.4.1.2.8. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the smallest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minValue"></a>3.4.1.2.9. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the smallest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_noEcho"></a>3.4.1.2.10. Property `root > service_catalog_product_config > parameters > additionalProperties > props > noEcho`

|              |                                        |
| ------------ | -------------------------------------- |
| **Type**     | `boolean`                              |
| **Required** | No                                     |
| **Default**  | `"- Parameter values are not masked."` |

**Description:** Whether to mask the parameter value when anyone makes a call that describes the stack.
If you set the value to ``true``, the parameter value is masked with asterisks (``*****``).

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_type"></a>3.4.1.2.11. Property `root > service_catalog_product_config > parameters > additionalProperties > props > type`

|              |            |
| ------------ | ---------- |
| **Type**     | `string`   |
| **Required** | No         |
| **Default**  | `"String"` |

**Description:** The data type for the parameter (DataType).

### <a name="service_catalog_product_config_portfolio_arn"></a>3.5. Property `root > service_catalog_product_config > portfolio_arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

----------------------------------------------------------------------------------------------------------------------------
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-16 at 13:40:41 -0400

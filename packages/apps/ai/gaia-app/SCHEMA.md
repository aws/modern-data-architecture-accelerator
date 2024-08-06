# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                       | Title/Description                                                                                                                                    |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [gaia](#gaia )                                                     | No      | object | No         | In #/definitions/GAIAProps                       | -                                                                                                                                                    |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                     |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |

## <a name="gaia"></a>1. Property `root > gaia`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/GAIAProps                                 |

| Property                                                                          | Pattern | Type    | Deprecated | Definition                           | Title/Description                                                                     |
| --------------------------------------------------------------------------------- | ------- | ------- | ---------- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| - [api](#gaia_api )                                                               | No      | object  | No         | In #/definitions/BackendApisProps    | -                                                                                     |
| + [auth](#gaia_auth )                                                             | No      | object  | No         | In #/definitions/AuthProps           | -                                                                                     |
| - [bedrock](#gaia_bedrock )                                                       | No      | object  | No         | In #/definitions/BedrockProps        | -                                                                                     |
| - [codeOverwrites](#gaia_codeOverwrites )                                         | No      | object  | No         | In #/definitions/CodeOverwritesProps | -                                                                                     |
| + [dataAdminRoles](#gaia_dataAdminRoles )                                         | No      | array   | No         | -                                    | List of admin roles which will be provided access to team resources (like KMS/Bucket) |
| + [llms](#gaia_llms )                                                             | No      | object  | No         | In #/definitions/LlmsProps           | -                                                                                     |
| - [mainDomain](#gaia_mainDomain )                                                 | No      | string  | No         | -                                    | -                                                                                     |
| + [prefix](#gaia_prefix )                                                         | No      | string  | No         | -                                    | -                                                                                     |
| - [rag](#gaia_rag )                                                               | No      | object  | No         | In #/definitions/RagProps            | -                                                                                     |
| - [setApiGateWayAccountCloudwatchRole](#gaia_setApiGateWayAccountCloudwatchRole ) | No      | boolean | No         | -                                    | -                                                                                     |
| - [skipApiGatewayDefaultWaf](#gaia_skipApiGatewayDefaultWaf )                     | No      | boolean | No         | -                                    | -                                                                                     |
| + [vpc](#gaia_vpc )                                                               | No      | object  | No         | In #/definitions/VpcProps            | -                                                                                     |

### <a name="gaia_api"></a>1.1. Property `root > gaia > api`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/BackendApisProps                          |

| Property                                                | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [hostedZoneName](#gaia_api_hostedZoneName )           | No      | string | No         | -          | -                 |
| + [restApiDomainName](#gaia_api_restApiDomainName )     | No      | string | No         | -          | -                 |
| + [socketApiDomainName](#gaia_api_socketApiDomainName ) | No      | string | No         | -          | -                 |

#### <a name="gaia_api_hostedZoneName"></a>1.1.1. Property `root > gaia > api > hostedZoneName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="gaia_api_restApiDomainName"></a>1.1.2. Property `root > gaia > api > restApiDomainName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="gaia_api_socketApiDomainName"></a>1.1.3. Property `root > gaia > api > socketApiDomainName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="gaia_auth"></a>1.2. Property `root > gaia > auth`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/AuthProps                                 |

| Property                                                                             | Pattern | Type             | Deprecated | Definition                          | Title/Description |
| ------------------------------------------------------------------------------------ | ------- | ---------------- | ---------- | ----------------------------------- | ----------------- |
| + [authType](#gaia_auth_authType )                                                   | No      | enum (of string) | No         | In #/definitions/SupportedAuthTypes | -                 |
| - [cognitoDomain](#gaia_auth_cognitoDomain )                                         | No      | string           | No         | -                                   | -                 |
| - [existingPoolClientId](#gaia_auth_existingPoolClientId )                           | No      | string           | No         | -                                   | -                 |
| - [existingPoolDomain](#gaia_auth_existingPoolDomain )                               | No      | string           | No         | -                                   | -                 |
| - [existingPoolId](#gaia_auth_existingPoolId )                                       | No      | string           | No         | -                                   | -                 |
| - [idpSamlEmailClaimParamPath](#gaia_auth_idpSamlEmailClaimParamPath )               | No      | string           | No         | -                                   | -                 |
| - [idpSamlMetadataUrlOrFileParamPath](#gaia_auth_idpSamlMetadataUrlOrFileParamPath ) | No      | string           | No         | -                                   | -                 |
| - [oAuthRedirectUrl](#gaia_auth_oAuthRedirectUrl )                                   | No      | string           | No         | -                                   | -                 |

#### <a name="gaia_auth_authType"></a>1.2.1. Property `root > gaia > auth > authType`

|                |                                  |
| -------------- | -------------------------------- |
| **Type**       | `enum (of string)`               |
| **Required**   | Yes                              |
| **Defined in** | #/definitions/SupportedAuthTypes |

Must be one of:
* "email_pass"
* "ad"
* "existing"

#### <a name="gaia_auth_cognitoDomain"></a>1.2.2. Property `root > gaia > auth > cognitoDomain`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_auth_existingPoolClientId"></a>1.2.3. Property `root > gaia > auth > existingPoolClientId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_auth_existingPoolDomain"></a>1.2.4. Property `root > gaia > auth > existingPoolDomain`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_auth_existingPoolId"></a>1.2.5. Property `root > gaia > auth > existingPoolId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_auth_idpSamlEmailClaimParamPath"></a>1.2.6. Property `root > gaia > auth > idpSamlEmailClaimParamPath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_auth_idpSamlMetadataUrlOrFileParamPath"></a>1.2.7. Property `root > gaia > auth > idpSamlMetadataUrlOrFileParamPath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_auth_oAuthRedirectUrl"></a>1.2.8. Property `root > gaia > auth > oAuthRedirectUrl`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="gaia_bedrock"></a>1.3. Property `root > gaia > bedrock`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/BedrockProps                              |

| Property                            | Pattern | Type             | Deprecated | Definition                       | Title/Description |
| ----------------------------------- | ------- | ---------------- | ---------- | -------------------------------- | ----------------- |
| + [enabled](#gaia_bedrock_enabled ) | No      | boolean          | No         | -                                | -                 |
| + [region](#gaia_bedrock_region )   | No      | enum (of string) | No         | In #/definitions/SupportedRegion | -                 |
| - [roleArn](#gaia_bedrock_roleArn ) | No      | string           | No         | -                                | -                 |

#### <a name="gaia_bedrock_enabled"></a>1.3.1. Property `root > gaia > bedrock > enabled`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

#### <a name="gaia_bedrock_region"></a>1.3.2. Property `root > gaia > bedrock > region`

|                |                               |
| -------------- | ----------------------------- |
| **Type**       | `enum (of string)`            |
| **Required**   | Yes                           |
| **Defined in** | #/definitions/SupportedRegion |

Must be one of:
* "af-south-1"
* "ap-east-1"
* "ap-northeast-1"
* "ap-northeast-2"
* "ap-northeast-3"
* "ap-south-1"
* "ap-south-2"
* "ap-southeast-1"
* "ap-southeast-2"
* "ap-southeast-3"
* "ap-southeast-4"
* "ca-central-1"
* "eu-central-1"
* "eu-central-2"
* "eu-north-1"
* "eu-south-1"
* "eu-south-2"
* "eu-west-1"
* "eu-west-2"
* "eu-west-3"
* "il-central-1"
* "me-central-1"
* "me-south-1"
* "sa-east-1"
* "us-east-1"
* "us-east-2"
* "us-west-1"
* "us-west-2"

#### <a name="gaia_bedrock_roleArn"></a>1.3.3. Property `root > gaia > bedrock > roleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="gaia_codeOverwrites"></a>1.4. Property `root > gaia > codeOverwrites`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CodeOverwritesProps                       |

| Property                                                                                                   | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [commonLibsLayerCodeZipPath](#gaia_codeOverwrites_commonLibsLayerCodeZipPath )                           | No      | string | No         | -          | -                 |
| - [createAuroraWorkspaceCodePath](#gaia_codeOverwrites_createAuroraWorkspaceCodePath )                     | No      | string | No         | -          | -                 |
| - [dataImportUploadHandlerCodePath](#gaia_codeOverwrites_dataImportUploadHandlerCodePath )                 | No      | string | No         | -          | -                 |
| - [deleteWorkspaceHandlerCodePath](#gaia_codeOverwrites_deleteWorkspaceHandlerCodePath )                   | No      | string | No         | -          | -                 |
| - [genAiCoreLayerCodePath](#gaia_codeOverwrites_genAiCoreLayerCodePath )                                   | No      | string | No         | -          | -                 |
| - [langchainInterfaceHandlerCodePath](#gaia_codeOverwrites_langchainInterfaceHandlerCodePath )             | No      | string | No         | -          | -                 |
| - [pgVectorDbSetupCodePath](#gaia_codeOverwrites_pgVectorDbSetupCodePath )                                 | No      | string | No         | -          | -                 |
| - [ragEnginesInferenceCodePath](#gaia_codeOverwrites_ragEnginesInferenceCodePath )                         | No      | string | No         | -          | -                 |
| - [restApiHandlerCodePath](#gaia_codeOverwrites_restApiHandlerCodePath )                                   | No      | string | No         | -          | -                 |
| - [webSocketAuthorizerFunctionCodePath](#gaia_codeOverwrites_webSocketAuthorizerFunctionCodePath )         | No      | string | No         | -          | -                 |
| - [webSocketConnectionHandlerCodePath](#gaia_codeOverwrites_webSocketConnectionHandlerCodePath )           | No      | string | No         | -          | -                 |
| - [webSocketIncomingMessageHandlerCodePath](#gaia_codeOverwrites_webSocketIncomingMessageHandlerCodePath ) | No      | string | No         | -          | -                 |
| - [webSocketOutgoingMessageHandlerCodePath](#gaia_codeOverwrites_webSocketOutgoingMessageHandlerCodePath ) | No      | string | No         | -          | -                 |
| - [websiteParserCodePath](#gaia_codeOverwrites_websiteParserCodePath )                                     | No      | string | No         | -          | -                 |

#### <a name="gaia_codeOverwrites_commonLibsLayerCodeZipPath"></a>1.4.1. Property `root > gaia > codeOverwrites > commonLibsLayerCodeZipPath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_codeOverwrites_createAuroraWorkspaceCodePath"></a>1.4.2. Property `root > gaia > codeOverwrites > createAuroraWorkspaceCodePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_codeOverwrites_dataImportUploadHandlerCodePath"></a>1.4.3. Property `root > gaia > codeOverwrites > dataImportUploadHandlerCodePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_codeOverwrites_deleteWorkspaceHandlerCodePath"></a>1.4.4. Property `root > gaia > codeOverwrites > deleteWorkspaceHandlerCodePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_codeOverwrites_genAiCoreLayerCodePath"></a>1.4.5. Property `root > gaia > codeOverwrites > genAiCoreLayerCodePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_codeOverwrites_langchainInterfaceHandlerCodePath"></a>1.4.6. Property `root > gaia > codeOverwrites > langchainInterfaceHandlerCodePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_codeOverwrites_pgVectorDbSetupCodePath"></a>1.4.7. Property `root > gaia > codeOverwrites > pgVectorDbSetupCodePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_codeOverwrites_ragEnginesInferenceCodePath"></a>1.4.8. Property `root > gaia > codeOverwrites > ragEnginesInferenceCodePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_codeOverwrites_restApiHandlerCodePath"></a>1.4.9. Property `root > gaia > codeOverwrites > restApiHandlerCodePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_codeOverwrites_webSocketAuthorizerFunctionCodePath"></a>1.4.10. Property `root > gaia > codeOverwrites > webSocketAuthorizerFunctionCodePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_codeOverwrites_webSocketConnectionHandlerCodePath"></a>1.4.11. Property `root > gaia > codeOverwrites > webSocketConnectionHandlerCodePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_codeOverwrites_webSocketIncomingMessageHandlerCodePath"></a>1.4.12. Property `root > gaia > codeOverwrites > webSocketIncomingMessageHandlerCodePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_codeOverwrites_webSocketOutgoingMessageHandlerCodePath"></a>1.4.13. Property `root > gaia > codeOverwrites > webSocketOutgoingMessageHandlerCodePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_codeOverwrites_websiteParserCodePath"></a>1.4.14. Property `root > gaia > codeOverwrites > websiteParserCodePath`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="gaia_dataAdminRoles"></a>1.5. Property `root > gaia > dataAdminRoles`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** List of admin roles which will be provided access to team resources (like KMS/Bucket)

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be           | Description                                                                  |
| ----------------------------------------- | ---------------------------------------------------------------------------- |
| [MdaaRoleRef](#gaia_dataAdminRoles_items) | A reference to an IAM role. Roles can be referenced by name, arn, and/or id. |

#### <a name="autogenerated_heading_2"></a>1.5.1. root > gaia > dataAdminRoles > MdaaRoleRef

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaRoleRef                               |

**Description:** A reference to an IAM role. Roles can be referenced by name, arn, and/or id.

| Property                                             | Pattern | Type    | Deprecated | Definition | Title/Description                                                                             |
| ---------------------------------------------------- | ------- | ------- | ---------- | ---------- | --------------------------------------------------------------------------------------------- |
| - [arn](#gaia_dataAdminRoles_items_arn )             | No      | string  | No         | -          | Reference role by arn                                                                         |
| - [id](#gaia_dataAdminRoles_items_id )               | No      | string  | No         | -          | Reference role by id                                                                          |
| - [immutable](#gaia_dataAdminRoles_items_immutable ) | No      | boolean | No         | -          | Indicates whether the role should be considered immutable (defaults false)                    |
| - [name](#gaia_dataAdminRoles_items_name )           | No      | string  | No         | -          | Reference role by name                                                                        |
| - [refId](#gaia_dataAdminRoles_items_refId )         | No      | string  | No         | -          | A string which uniquely identifies the MdaaRoleRef within a scope.                            |
| - [sso](#gaia_dataAdminRoles_items_sso )             | No      | boolean | No         | -          | If true, role name will be resolved to an SSO auto-generated role. Also implies immutability. |

##### <a name="gaia_dataAdminRoles_items_arn"></a>1.5.1.1. Property `root > gaia > dataAdminRoles > dataAdminRoles items > arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by arn

##### <a name="gaia_dataAdminRoles_items_id"></a>1.5.1.2. Property `root > gaia > dataAdminRoles > dataAdminRoles items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by id

##### <a name="gaia_dataAdminRoles_items_immutable"></a>1.5.1.3. Property `root > gaia > dataAdminRoles > dataAdminRoles items > immutable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Indicates whether the role should be considered immutable (defaults false)

##### <a name="gaia_dataAdminRoles_items_name"></a>1.5.1.4. Property `root > gaia > dataAdminRoles > dataAdminRoles items > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by name

##### <a name="gaia_dataAdminRoles_items_refId"></a>1.5.1.5. Property `root > gaia > dataAdminRoles > dataAdminRoles items > refId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A string which uniquely identifies the MdaaRoleRef within a scope.

##### <a name="gaia_dataAdminRoles_items_sso"></a>1.5.1.6. Property `root > gaia > dataAdminRoles > dataAdminRoles items > sso`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true, role name will be resolved to an SSO auto-generated role. Also implies immutability.

### <a name="gaia_llms"></a>1.6. Property `root > gaia > llms`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/LlmsProps                                 |

| Property                                                 | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [huggingFaceApiToken](#gaia_llms_huggingFaceApiToken ) | No      | string | No         | -          | -                 |
| + [sagemaker](#gaia_llms_sagemaker )                     | No      | array  | No         | -          | -                 |

#### <a name="gaia_llms_huggingFaceApiToken"></a>1.6.1. Property `root > gaia > llms > huggingFaceApiToken`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_llms_sagemaker"></a>1.6.2. Property `root > gaia > llms > sagemaker`

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

| Each item of this array must be                       | Description |
| ----------------------------------------------------- | ----------- |
| [SagemakerLlmModelConfig](#gaia_llms_sagemaker_items) | -           |

##### <a name="autogenerated_heading_3"></a>1.6.2.1. root > gaia > llms > sagemaker > SagemakerLlmModelConfig

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/SagemakerLlmModelConfig                   |

| Property                                                                   | Pattern | Type             | Deprecated | Definition                                | Title/Description |
| -------------------------------------------------------------------------- | ------- | ---------------- | ---------- | ----------------------------------------- | ----------------- |
| - [initialInstanceCount](#gaia_llms_sagemaker_items_initialInstanceCount ) | No      | number           | No         | -                                         | -                 |
| - [instanceType](#gaia_llms_sagemaker_items_instanceType )                 | No      | string           | No         | -                                         | -                 |
| - [maximumInstanceCount](#gaia_llms_sagemaker_items_maximumInstanceCount ) | No      | number           | No         | -                                         | -                 |
| - [minimumInstanceCount](#gaia_llms_sagemaker_items_minimumInstanceCount ) | No      | number           | No         | -                                         | -                 |
| + [model](#gaia_llms_sagemaker_items_model )                               | No      | enum (of string) | No         | In #/definitions/SupportedSageMakerModels | -                 |

###### <a name="gaia_llms_sagemaker_items_initialInstanceCount"></a>1.6.2.1.1. Property `root > gaia > llms > sagemaker > sagemaker items > initialInstanceCount`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="gaia_llms_sagemaker_items_instanceType"></a>1.6.2.1.2. Property `root > gaia > llms > sagemaker > sagemaker items > instanceType`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="gaia_llms_sagemaker_items_maximumInstanceCount"></a>1.6.2.1.3. Property `root > gaia > llms > sagemaker > sagemaker items > maximumInstanceCount`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="gaia_llms_sagemaker_items_minimumInstanceCount"></a>1.6.2.1.4. Property `root > gaia > llms > sagemaker > sagemaker items > minimumInstanceCount`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="gaia_llms_sagemaker_items_model"></a>1.6.2.1.5. Property `root > gaia > llms > sagemaker > sagemaker items > model`

|                |                                        |
| -------------- | -------------------------------------- |
| **Type**       | `enum (of string)`                     |
| **Required**   | Yes                                    |
| **Defined in** | #/definitions/SupportedSageMakerModels |

Must be one of:
* "FalconLite"
* "Llama2_13b_Chat"
* "Mistral7b_Instruct2"

### <a name="gaia_mainDomain"></a>1.7. Property `root > gaia > mainDomain`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="gaia_prefix"></a>1.8. Property `root > gaia > prefix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="gaia_rag"></a>1.9. Property `root > gaia > rag`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/RagProps                                  |

| Property                                              | Pattern | Type   | Deprecated | Definition                   | Title/Description |
| ----------------------------------------------------- | ------- | ------ | ---------- | ---------------------------- | ----------------- |
| + [crossEncoderModels](#gaia_rag_crossEncoderModels ) | No      | array  | No         | -                            | -                 |
| + [embeddingsModels](#gaia_rag_embeddingsModels )     | No      | array  | No         | -                            | -                 |
| + [engines](#gaia_rag_engines )                       | No      | object | No         | In #/definitions/EngineProps | -                 |

#### <a name="gaia_rag_crossEncoderModels"></a>1.9.1. Property `root > gaia > rag > crossEncoderModels`

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

| Each item of this array must be                              | Description |
| ------------------------------------------------------------ | ----------- |
| [CrossEncoderModelProps](#gaia_rag_crossEncoderModels_items) | -           |

##### <a name="autogenerated_heading_4"></a>1.9.1.1. root > gaia > rag > crossEncoderModels > CrossEncoderModelProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CrossEncoderModelProps                    |

| Property                                                     | Pattern | Type             | Deprecated | Definition                     | Title/Description |
| ------------------------------------------------------------ | ------- | ---------------- | ---------- | ------------------------------ | ----------------- |
| - [isDefault](#gaia_rag_crossEncoderModels_items_isDefault ) | No      | boolean          | No         | -                              | -                 |
| + [name](#gaia_rag_crossEncoderModels_items_name )           | No      | string           | No         | -                              | -                 |
| + [provider](#gaia_rag_crossEncoderModels_items_provider )   | No      | enum (of string) | No         | In #/definitions/ModelProvider | -                 |

###### <a name="gaia_rag_crossEncoderModels_items_isDefault"></a>1.9.1.1.1. Property `root > gaia > rag > crossEncoderModels > crossEncoderModels items > isDefault`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

###### <a name="gaia_rag_crossEncoderModels_items_name"></a>1.9.1.1.2. Property `root > gaia > rag > crossEncoderModels > crossEncoderModels items > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="gaia_rag_crossEncoderModels_items_provider"></a>1.9.1.1.3. Property `root > gaia > rag > crossEncoderModels > crossEncoderModels items > provider`

|                |                             |
| -------------- | --------------------------- |
| **Type**       | `enum (of string)`          |
| **Required**   | Yes                         |
| **Defined in** | #/definitions/ModelProvider |

Must be one of:
* "bedrock"
* "openai"
* "sagemaker"

#### <a name="gaia_rag_embeddingsModels"></a>1.9.2. Property `root > gaia > rag > embeddingsModels`

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

| Each item of this array must be                | Description |
| ---------------------------------------------- | ----------- |
| [ModelProps](#gaia_rag_embeddingsModels_items) | -           |

##### <a name="autogenerated_heading_5"></a>1.9.2.1. root > gaia > rag > embeddingsModels > ModelProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/ModelProps                                |

| Property                                                     | Pattern | Type             | Deprecated | Definition                                                       | Title/Description |
| ------------------------------------------------------------ | ------- | ---------------- | ---------- | ---------------------------------------------------------------- | ----------------- |
| + [dimensions](#gaia_rag_embeddingsModels_items_dimensions ) | No      | number           | No         | -                                                                | -                 |
| - [isDefault](#gaia_rag_embeddingsModels_items_isDefault )   | No      | boolean          | No         | -                                                                | -                 |
| + [name](#gaia_rag_embeddingsModels_items_name )             | No      | string           | No         | -                                                                | -                 |
| + [provider](#gaia_rag_embeddingsModels_items_provider )     | No      | enum (of string) | No         | Same as [provider](#gaia_rag_crossEncoderModels_items_provider ) | -                 |

###### <a name="gaia_rag_embeddingsModels_items_dimensions"></a>1.9.2.1.1. Property `root > gaia > rag > embeddingsModels > embeddingsModels items > dimensions`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | Yes      |

###### <a name="gaia_rag_embeddingsModels_items_isDefault"></a>1.9.2.1.2. Property `root > gaia > rag > embeddingsModels > embeddingsModels items > isDefault`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

###### <a name="gaia_rag_embeddingsModels_items_name"></a>1.9.2.1.3. Property `root > gaia > rag > embeddingsModels > embeddingsModels items > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="gaia_rag_embeddingsModels_items_provider"></a>1.9.2.1.4. Property `root > gaia > rag > embeddingsModels > embeddingsModels items > provider`

|                        |                                                         |
| ---------------------- | ------------------------------------------------------- |
| **Type**               | `enum (of string)`                                      |
| **Required**           | Yes                                                     |
| **Same definition as** | [provider](#gaia_rag_crossEncoderModels_items_provider) |

#### <a name="gaia_rag_engines"></a>1.9.3. Property `root > gaia > rag > engines`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/EngineProps                               |

| Property                                    | Pattern | Type   | Deprecated | Definition                         | Title/Description |
| ------------------------------------------- | ------- | ------ | ---------- | ---------------------------------- | ----------------- |
| - [aurora](#gaia_rag_engines_aurora )       | No      | object | No         | In #/definitions/AuroraEngineProps | -                 |
| - [kendra](#gaia_rag_engines_kendra )       | No      | object | No         | In #/definitions/KendraEngineProps | -                 |
| - [sagemaker](#gaia_rag_engines_sagemaker ) | No      | object | No         | In #/definitions/SagemakerRagProps | -                 |

##### <a name="gaia_rag_engines_aurora"></a>1.9.3.1. Property `root > gaia > rag > engines > aurora`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/AuroraEngineProps                                           |

##### <a name="gaia_rag_engines_kendra"></a>1.9.3.2. Property `root > gaia > rag > engines > kendra`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/KendraEngineProps                         |

| Property                                                             | Pattern | Type    | Deprecated | Definition                                     | Title/Description |
| -------------------------------------------------------------------- | ------- | ------- | ---------- | ---------------------------------------------- | ----------------- |
| + [createIndex](#gaia_rag_engines_kendra_createIndex )               | No      | boolean | No         | -                                              | -                 |
| - [external](#gaia_rag_engines_kendra_external )                     | No      | array   | No         | -                                              | -                 |
| - [s3DataSourceConfig](#gaia_rag_engines_kendra_s3DataSourceConfig ) | No      | object  | No         | In #/definitions/KendraS3DataSourceConfigProps | -                 |

###### <a name="gaia_rag_engines_kendra_createIndex"></a>1.9.3.2.1. Property `root > gaia > rag > engines > kendra > createIndex`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

###### <a name="gaia_rag_engines_kendra_external"></a>1.9.3.2.2. Property `root > gaia > rag > engines > kendra > external`

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

| Each item of this array must be                                | Description |
| -------------------------------------------------------------- | ----------- |
| [KendraExternalProps](#gaia_rag_engines_kendra_external_items) | -           |

###### <a name="autogenerated_heading_6"></a>1.9.3.2.2.1. root > gaia > rag > engines > kendra > external > KendraExternalProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/KendraExternalProps                       |

| Property                                                        | Pattern | Type             | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------- | ------- | ---------------- | ---------- | ---------- | ----------------- |
| + [kendraId](#gaia_rag_engines_kendra_external_items_kendraId ) | No      | string           | No         | -          | -                 |
| + [name](#gaia_rag_engines_kendra_external_items_name )         | No      | string           | No         | -          | -                 |
| - [region](#gaia_rag_engines_kendra_external_items_region )     | No      | enum (of string) | No         | -          | -                 |
| - [roleArn](#gaia_rag_engines_kendra_external_items_roleArn )   | No      | string           | No         | -          | -                 |

###### <a name="gaia_rag_engines_kendra_external_items_kendraId"></a>1.9.3.2.2.1.1. Property `root > gaia > rag > engines > kendra > external > external items > kendraId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="gaia_rag_engines_kendra_external_items_name"></a>1.9.3.2.2.1.2. Property `root > gaia > rag > engines > kendra > external > external items > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="gaia_rag_engines_kendra_external_items_region"></a>1.9.3.2.2.1.3. Property `root > gaia > rag > engines > kendra > external > external items > region`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

Must be one of:
* "af-south-1"
* "ap-east-1"
* "ap-northeast-1"
* "ap-northeast-2"
* "ap-northeast-3"
* "ap-south-1"
* "ap-south-2"
* "ap-southeast-1"
* "ap-southeast-2"
* "ap-southeast-3"
* "ap-southeast-4"
* "ca-central-1"
* "eu-central-1"
* "eu-central-2"
* "eu-north-1"
* "eu-south-1"
* "eu-south-2"
* "eu-west-1"
* "eu-west-2"
* "eu-west-3"
* "il-central-1"
* "me-central-1"
* "me-south-1"
* "sa-east-1"
* "us-east-1"
* "us-east-2"
* "us-west-1"
* "us-west-2"

###### <a name="gaia_rag_engines_kendra_external_items_roleArn"></a>1.9.3.2.2.1.4. Property `root > gaia > rag > engines > kendra > external > external items > roleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="gaia_rag_engines_kendra_s3DataSourceConfig"></a>1.9.3.2.3. Property `root > gaia > rag > engines > kendra > s3DataSourceConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/KendraS3DataSourceConfigProps             |

| Property                                                                                  | Pattern | Type            | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| + [bucketName](#gaia_rag_engines_kendra_s3DataSourceConfig_bucketName )                   | No      | string          | No         | -          | -                 |
| + [includedDirectories](#gaia_rag_engines_kendra_s3DataSourceConfig_includedDirectories ) | No      | array of string | No         | -          | -                 |
| + [kmsKeyArn](#gaia_rag_engines_kendra_s3DataSourceConfig_kmsKeyArn )                     | No      | string          | No         | -          | -                 |
| - [metadataDirectory](#gaia_rag_engines_kendra_s3DataSourceConfig_metadataDirectory )     | No      | string          | No         | -          | -                 |

###### <a name="gaia_rag_engines_kendra_s3DataSourceConfig_bucketName"></a>1.9.3.2.3.1. Property `root > gaia > rag > engines > kendra > s3DataSourceConfig > bucketName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="gaia_rag_engines_kendra_s3DataSourceConfig_includedDirectories"></a>1.9.3.2.3.2. Property `root > gaia > rag > engines > kendra > s3DataSourceConfig > includedDirectories`

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

| Each item of this array must be                                                                    | Description |
| -------------------------------------------------------------------------------------------------- | ----------- |
| [includedDirectories items](#gaia_rag_engines_kendra_s3DataSourceConfig_includedDirectories_items) | -           |

###### <a name="autogenerated_heading_7"></a>1.9.3.2.3.2.1. root > gaia > rag > engines > kendra > s3DataSourceConfig > includedDirectories > includedDirectories items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="gaia_rag_engines_kendra_s3DataSourceConfig_kmsKeyArn"></a>1.9.3.2.3.3. Property `root > gaia > rag > engines > kendra > s3DataSourceConfig > kmsKeyArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="gaia_rag_engines_kendra_s3DataSourceConfig_metadataDirectory"></a>1.9.3.2.3.4. Property `root > gaia > rag > engines > kendra > s3DataSourceConfig > metadataDirectory`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="gaia_rag_engines_sagemaker"></a>1.9.3.3. Property `root > gaia > rag > engines > sagemaker`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/SagemakerRagProps                         |

| Property                                                                    | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [initialInstanceCount](#gaia_rag_engines_sagemaker_initialInstanceCount ) | No      | number | No         | -          | -                 |
| - [instanceType](#gaia_rag_engines_sagemaker_instanceType )                 | No      | string | No         | -          | -                 |
| - [maxInstanceCount](#gaia_rag_engines_sagemaker_maxInstanceCount )         | No      | number | No         | -          | -                 |
| - [minInstanceCount](#gaia_rag_engines_sagemaker_minInstanceCount )         | No      | number | No         | -          | -                 |

###### <a name="gaia_rag_engines_sagemaker_initialInstanceCount"></a>1.9.3.3.1. Property `root > gaia > rag > engines > sagemaker > initialInstanceCount`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="gaia_rag_engines_sagemaker_instanceType"></a>1.9.3.3.2. Property `root > gaia > rag > engines > sagemaker > instanceType`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="gaia_rag_engines_sagemaker_maxInstanceCount"></a>1.9.3.3.3. Property `root > gaia > rag > engines > sagemaker > maxInstanceCount`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="gaia_rag_engines_sagemaker_minInstanceCount"></a>1.9.3.3.4. Property `root > gaia > rag > engines > sagemaker > minInstanceCount`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

### <a name="gaia_setApiGateWayAccountCloudwatchRole"></a>1.10. Property `root > gaia > setApiGateWayAccountCloudwatchRole`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

### <a name="gaia_skipApiGatewayDefaultWaf"></a>1.11. Property `root > gaia > skipApiGatewayDefaultWaf`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

### <a name="gaia_vpc"></a>1.12. Property `root > gaia > vpc`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/VpcProps                                  |

| Property                                                | Pattern | Type            | Deprecated | Definition | Title/Description |
| ------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| + [appSecurityGroupId](#gaia_vpc_appSecurityGroupId )   | No      | string          | No         | -          | -                 |
| + [appSubnets](#gaia_vpc_appSubnets )                   | No      | array of string | No         | -          | -                 |
| + [dataSecurityGroupId](#gaia_vpc_dataSecurityGroupId ) | No      | string          | No         | -          | -                 |
| + [dataSubnets](#gaia_vpc_dataSubnets )                 | No      | array of string | No         | -          | -                 |
| + [vpcId](#gaia_vpc_vpcId )                             | No      | string          | No         | -          | -                 |

#### <a name="gaia_vpc_appSecurityGroupId"></a>1.12.1. Property `root > gaia > vpc > appSecurityGroupId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="gaia_vpc_appSubnets"></a>1.12.2. Property `root > gaia > vpc > appSubnets`

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

| Each item of this array must be                | Description |
| ---------------------------------------------- | ----------- |
| [appSubnets items](#gaia_vpc_appSubnets_items) | -           |

##### <a name="autogenerated_heading_8"></a>1.12.2.1. root > gaia > vpc > appSubnets > appSubnets items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_vpc_dataSecurityGroupId"></a>1.12.3. Property `root > gaia > vpc > dataSecurityGroupId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="gaia_vpc_dataSubnets"></a>1.12.4. Property `root > gaia > vpc > dataSubnets`

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

| Each item of this array must be                  | Description |
| ------------------------------------------------ | ----------- |
| [dataSubnets items](#gaia_vpc_dataSubnets_items) | -           |

##### <a name="autogenerated_heading_9"></a>1.12.4.1. root > gaia > vpc > dataSubnets > dataSubnets items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="gaia_vpc_vpcId"></a>1.12.5. Property `root > gaia > vpc > vpcId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

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

#### <a name="autogenerated_heading_10"></a>2.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

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

###### <a name="autogenerated_heading_11"></a>2.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

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

###### <a name="autogenerated_heading_12"></a>3.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

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

###### <a name="autogenerated_heading_13"></a>3.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

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
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-06 at 12:58:07 -0400

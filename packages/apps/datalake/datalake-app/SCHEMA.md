# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                       | Title/Description                                                                                                                                    |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [accessPolicies](#accessPolicies )                                 | No      | object | No         | -                                                | Map of named accessPolicies which will be referenced by bucket definitions.                                                                          |
| + [buckets](#buckets )                                               | No      | object | No         | -                                                | List of bucket definitions                                                                                                                           |
| - [lifecycleConfigurations](#lifecycleConfigurations )               | No      | object | No         | -                                                | /**<br />  Map of named lifecycleConfigurations which will be referenced by bucket definitions.                                                      |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                     |
| + [roles](#roles )                                                   | No      | object | No         | -                                                | Map of named role references to be used within accessPolicies. A single config role<br />can reference multiple physical roles.                      |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |

## <a name="accessPolicies"></a>1. Property `root > accessPolicies`

|                           |                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                 |
| **Required**              | Yes                                                                                                                      |
| **Additional properties** | [[Should-conform]](#accessPolicies_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Map of named accessPolicies which will be referenced by bucket definitions.

| Property                                    | Pattern | Type   | Deprecated | Definition                          | Title/Description |
| ------------------------------------------- | ------- | ------ | ---------- | ----------------------------------- | ----------------- |
| - [](#accessPolicies_additionalProperties ) | No      | object | No         | In #/definitions/AccessPolicyConfig | -                 |

### <a name="accessPolicies_additionalProperties"></a>1.1. Property `root > accessPolicies > AccessPolicyConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/AccessPolicyConfig                        |

| Property                                             | Pattern | Type   | Deprecated | Definition                              | Title/Description      |
| ---------------------------------------------------- | ------- | ------ | ---------- | --------------------------------------- | ---------------------- |
| + [rule](#accessPolicies_additionalProperties_rule ) | No      | object | No         | In #/definitions/AccessPolicyRuleConfig | The access policy rule |

#### <a name="accessPolicies_additionalProperties_rule"></a>1.1.1. Property `root > accessPolicies > additionalProperties > rule`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/AccessPolicyRuleConfig                    |

**Description:** The access policy rule

| Property                                                                                | Pattern | Type            | Deprecated | Definition | Title/Description                                                             |
| --------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------------------------------------------------------------------- |
| - [ReadRoles](#accessPolicies_additionalProperties_rule_ReadRoles )                     | No      | array of string | No         | -          | List of config roles which will be provided readonly access via this policy.  |
| - [ReadWriteRoles](#accessPolicies_additionalProperties_rule_ReadWriteRoles )           | No      | array of string | No         | -          | List of config roles which will be provided readwrite access via this policy. |
| - [ReadWriteSuperRoles](#accessPolicies_additionalProperties_rule_ReadWriteSuperRoles ) | No      | array of string | No         | -          | List of config roles which will be provided superuser access via this policy. |
| + [prefix](#accessPolicies_additionalProperties_rule_prefix )                           | No      | string          | No         | -          | The S3 Prefix where the policy will be applied.                               |

##### <a name="accessPolicies_additionalProperties_rule_ReadRoles"></a>1.1.1.1. Property `root > accessPolicies > additionalProperties > rule > ReadRoles`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** List of config roles which will be provided readonly access via this policy.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                              | Description |
| ---------------------------------------------------------------------------- | ----------- |
| [ReadRoles items](#accessPolicies_additionalProperties_rule_ReadRoles_items) | -           |

###### <a name="autogenerated_heading_2"></a>1.1.1.1.1. root > accessPolicies > additionalProperties > rule > ReadRoles > ReadRoles items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="accessPolicies_additionalProperties_rule_ReadWriteRoles"></a>1.1.1.2. Property `root > accessPolicies > additionalProperties > rule > ReadWriteRoles`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** List of config roles which will be provided readwrite access via this policy.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                        | Description |
| -------------------------------------------------------------------------------------- | ----------- |
| [ReadWriteRoles items](#accessPolicies_additionalProperties_rule_ReadWriteRoles_items) | -           |

###### <a name="autogenerated_heading_3"></a>1.1.1.2.1. root > accessPolicies > additionalProperties > rule > ReadWriteRoles > ReadWriteRoles items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="accessPolicies_additionalProperties_rule_ReadWriteSuperRoles"></a>1.1.1.3. Property `root > accessPolicies > additionalProperties > rule > ReadWriteSuperRoles`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** List of config roles which will be provided superuser access via this policy.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                  | Description |
| ------------------------------------------------------------------------------------------------ | ----------- |
| [ReadWriteSuperRoles items](#accessPolicies_additionalProperties_rule_ReadWriteSuperRoles_items) | -           |

###### <a name="autogenerated_heading_4"></a>1.1.1.3.1. root > accessPolicies > additionalProperties > rule > ReadWriteSuperRoles > ReadWriteSuperRoles items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="accessPolicies_additionalProperties_rule_prefix"></a>1.1.1.4. Property `root > accessPolicies > additionalProperties > rule > prefix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The S3 Prefix where the policy will be applied.

## <a name="buckets"></a>2. Property `root > buckets`

|                           |                                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                          |
| **Required**              | Yes                                                                                                               |
| **Additional properties** | [[Should-conform]](#buckets_additionalProperties "Each additional property must conform to the following schema") |

**Description:** List of bucket definitions

| Property                             | Pattern | Type   | Deprecated | Definition                    | Title/Description |
| ------------------------------------ | ------- | ------ | ---------- | ----------------------------- | ----------------- |
| - [](#buckets_additionalProperties ) | No      | object | No         | In #/definitions/BucketConfig | -                 |

### <a name="buckets_additionalProperties"></a>2.1. Property `root > buckets > BucketConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/BucketConfig                              |

| Property                                                                                          | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                            |
| ------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| + [accessPolicies](#buckets_additionalProperties_accessPolicies )                                 | No      | array of string | No         | -          | List of access policies names which will be applied to the bucket                                                                            |
| - [createFolderSkeleton](#buckets_additionalProperties_createFolderSkeleton )                     | No      | boolean         | No         | -          | If true (default), a "folder" object will be created on the bucket for each applied access policy.                                           |
| - [defaultDeny](#buckets_additionalProperties_defaultDeny )                                       | No      | boolean         | No         | -          | If true (default), any roles not explicitely listed in the config will be blocked from reading/writing objects from this s3 bucket.          |
| - [enableEventBridgeNotifications](#buckets_additionalProperties_enableEventBridgeNotifications ) | No      | boolean         | No         | -          | If true, EventBridgeNotifications will be enabled on the bucket, allowing bucket data events to be matched and actioned by EventBridge rules |
| - [inventories](#buckets_additionalProperties_inventories )                                       | No      | object          | No         | -          | List of inventory configurations to be applied to the bucket                                                                                 |
| - [lakeFormationLocations](#buckets_additionalProperties_lakeFormationLocations )                 | No      | object          | No         | -          | Locations which will be created as LakeFormation resources using the specified role.                                                         |
| - [lifecycleConfiguration](#buckets_additionalProperties_lifecycleConfiguration )                 | No      | string          | No         | -          | S3 Lifecycle configuration .                                                                                                                 |

#### <a name="buckets_additionalProperties_accessPolicies"></a>2.1.1. Property `root > buckets > additionalProperties > accessPolicies`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** List of access policies names which will be applied to the bucket

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                            | Description |
| -------------------------------------------------------------------------- | ----------- |
| [accessPolicies items](#buckets_additionalProperties_accessPolicies_items) | -           |

##### <a name="autogenerated_heading_5"></a>2.1.1.1. root > buckets > additionalProperties > accessPolicies > accessPolicies items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="buckets_additionalProperties_createFolderSkeleton"></a>2.1.2. Property `root > buckets > additionalProperties > createFolderSkeleton`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true (default), a "folder" object will be created on the bucket for each applied access policy.

#### <a name="buckets_additionalProperties_defaultDeny"></a>2.1.3. Property `root > buckets > additionalProperties > defaultDeny`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true (default), any roles not explicitely listed in the config will be blocked from reading/writing objects from this s3 bucket.

#### <a name="buckets_additionalProperties_enableEventBridgeNotifications"></a>2.1.4. Property `root > buckets > additionalProperties > enableEventBridgeNotifications`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true, EventBridgeNotifications will be enabled on the bucket, allowing bucket data events to be matched and actioned by EventBridge rules

#### <a name="buckets_additionalProperties_inventories"></a>2.1.5. Property `root > buckets > additionalProperties > inventories`

|                           |                                                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                           |
| **Required**              | No                                                                                                                                                 |
| **Additional properties** | [[Should-conform]](#buckets_additionalProperties_inventories_additionalProperties "Each additional property must conform to the following schema") |

**Description:** List of inventory configurations to be applied to the bucket

| Property                                                              | Pattern | Type   | Deprecated | Definition                           | Title/Description |
| --------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------ | ----------------- |
| - [](#buckets_additionalProperties_inventories_additionalProperties ) | No      | object | No         | In #/definitions/InventoryDefinition | -                 |

##### <a name="buckets_additionalProperties_inventories_additionalProperties"></a>2.1.5.1. Property `root > buckets > additionalProperties > inventories > InventoryDefinition`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/InventoryDefinition                       |

| Property                                                                                                   | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| - [destinationAccount](#buckets_additionalProperties_inventories_additionalProperties_destinationAccount ) | No      | string | No         | -          | The destination account to which the destinationBucket should belong. Used by S3 service to validate bucket ownership before writing inventory. |
| - [destinationBucket](#buckets_additionalProperties_inventories_additionalProperties_destinationBucket )   | No      | string | No         | -          | The bucket to which inventory will be written. If not specified, will be written back to the inventoried bucket under /inventory.               |
| - [destinationPrefix](#buckets_additionalProperties_inventories_additionalProperties_destinationPrefix )   | No      | string | No         | -          | The S3 prefix (on the destinationBucket) to which inventory will be written. If not specified, defaults to /inventory.                          |
| + [prefix](#buckets_additionalProperties_inventories_additionalProperties_prefix )                         | No      | string | No         | -          | The S3 prefix which will be inventoried                                                                                                         |

###### <a name="buckets_additionalProperties_inventories_additionalProperties_destinationAccount"></a>2.1.5.1.1. Property `root > buckets > additionalProperties > inventories > additionalProperties > destinationAccount`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The destination account to which the destinationBucket should belong. Used by S3 service to validate bucket ownership before writing inventory.

###### <a name="buckets_additionalProperties_inventories_additionalProperties_destinationBucket"></a>2.1.5.1.2. Property `root > buckets > additionalProperties > inventories > additionalProperties > destinationBucket`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The bucket to which inventory will be written. If not specified, will be written back to the inventoried bucket under /inventory.

###### <a name="buckets_additionalProperties_inventories_additionalProperties_destinationPrefix"></a>2.1.5.1.3. Property `root > buckets > additionalProperties > inventories > additionalProperties > destinationPrefix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The S3 prefix (on the destinationBucket) to which inventory will be written. If not specified, defaults to /inventory.

###### <a name="buckets_additionalProperties_inventories_additionalProperties_prefix"></a>2.1.5.1.4. Property `root > buckets > additionalProperties > inventories > additionalProperties > prefix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The S3 prefix which will be inventoried

#### <a name="buckets_additionalProperties_lakeFormationLocations"></a>2.1.6. Property `root > buckets > additionalProperties > lakeFormationLocations`

|                           |                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                      |
| **Required**              | No                                                                                                                                                            |
| **Additional properties** | [[Should-conform]](#buckets_additionalProperties_lakeFormationLocations_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Locations which will be created as LakeFormation resources using the specified role.

| Property                                                                         | Pattern | Type   | Deprecated | Definition                                   | Title/Description |
| -------------------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------- | ----------------- |
| - [](#buckets_additionalProperties_lakeFormationLocations_additionalProperties ) | No      | object | No         | In #/definitions/LakeFormationLocationConfig | -                 |

##### <a name="buckets_additionalProperties_lakeFormationLocations_additionalProperties"></a>2.1.6.1. Property `root > buckets > additionalProperties > lakeFormationLocations > LakeFormationLocationConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/LakeFormationLocationConfig               |

| Property                                                                                      | Pattern | Type    | Deprecated | Definition | Title/Description                                                  |
| --------------------------------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ------------------------------------------------------------------ |
| + [prefix](#buckets_additionalProperties_lakeFormationLocations_additionalProperties_prefix ) | No      | string  | No         | -          | The S3 prefix of the location                                      |
| - [write](#buckets_additionalProperties_lakeFormationLocations_additionalProperties_write )   | No      | boolean | No         | -          | If true, LF role will be granted read-write access to the location |

###### <a name="buckets_additionalProperties_lakeFormationLocations_additionalProperties_prefix"></a>2.1.6.1.1. Property `root > buckets > additionalProperties > lakeFormationLocations > additionalProperties > prefix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The S3 prefix of the location

###### <a name="buckets_additionalProperties_lakeFormationLocations_additionalProperties_write"></a>2.1.6.1.2. Property `root > buckets > additionalProperties > lakeFormationLocations > additionalProperties > write`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true, LF role will be granted read-write access to the location

#### <a name="buckets_additionalProperties_lifecycleConfiguration"></a>2.1.7. Property `root > buckets > additionalProperties > lifecycleConfiguration`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** S3 Lifecycle configuration .

## <a name="lifecycleConfigurations"></a>3. Property `root > lifecycleConfigurations`

|                           |                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                          |
| **Required**              | No                                                                                                                                |
| **Additional properties** | [[Should-conform]](#lifecycleConfigurations_additionalProperties "Each additional property must conform to the following schema") |

**Description:** /**
  Map of named lifecycleConfigurations which will be referenced by bucket definitions.

| Property                                             | Pattern | Type   | Deprecated | Definition                                    | Title/Description |
| ---------------------------------------------------- | ------- | ------ | ---------- | --------------------------------------------- | ----------------- |
| - [](#lifecycleConfigurations_additionalProperties ) | No      | object | No         | In #/definitions/LifecycleConfigurationConfig | -                 |

### <a name="lifecycleConfigurations_additionalProperties"></a>3.1. Property `root > lifecycleConfigurations > LifecycleConfigurationConfig`

|                           |                                                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                               |
| **Required**              | No                                                                                                                                                     |
| **Additional properties** | [[Should-conform]](#lifecycleConfigurations_additionalProperties_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/LifecycleConfigurationConfig                                                                                                             |

| Property                                                                  | Pattern | Type   | Deprecated | Definition                                        | Title/Description |
| ------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------- | ----------------- |
| - [](#lifecycleConfigurations_additionalProperties_additionalProperties ) | No      | object | No         | In #/definitions/LifecycleConfigurationRuleConfig | -                 |

#### <a name="lifecycleConfigurations_additionalProperties_additionalProperties"></a>3.1.1. Property `root > lifecycleConfigurations > additionalProperties > LifecycleConfigurationRuleConfig`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/LifecycleConfigurationRuleConfig          |

| Property                                                                                                                                         | Pattern | Type    | Deprecated | Definition | Title/Description            |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | ------- | ------- | ---------- | ---------- | ---------------------------- |
| - [AbortIncompleteMultipartUploadAfter](#lifecycleConfigurations_additionalProperties_additionalProperties_AbortIncompleteMultipartUploadAfter ) | No      | number  | No         | -          | -                            |
| - [ExpirationDays](#lifecycleConfigurations_additionalProperties_additionalProperties_ExpirationDays )                                           | No      | number  | No         | -          | -                            |
| - [ExpiredObjectDeleteMarker](#lifecycleConfigurations_additionalProperties_additionalProperties_ExpiredObjectDeleteMarker )                     | No      | boolean | No         | -          | -                            |
| - [NoncurrentVersionExpirationDays](#lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionExpirationDays )         | No      | number  | No         | -          | -                            |
| - [NoncurrentVersionTransitions](#lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionTransitions )               | No      | array   | No         | -          | -                            |
| - [NoncurrentVersionsToRetain](#lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionsToRetain )                   | No      | number  | No         | -          | -                            |
| - [ObjectSizeGreaterThan](#lifecycleConfigurations_additionalProperties_additionalProperties_ObjectSizeGreaterThan )                             | No      | number  | No         | -          | -                            |
| - [ObjectSizeLessThan](#lifecycleConfigurations_additionalProperties_additionalProperties_ObjectSizeLessThan )                                   | No      | number  | No         | -          | -                            |
| - [Prefix](#lifecycleConfigurations_additionalProperties_additionalProperties_Prefix )                                                           | No      | string  | No         | -          | -                            |
| + [Status](#lifecycleConfigurations_additionalProperties_additionalProperties_Status )                                                           | No      | string  | No         | -          | Lifecycle configuration rule |
| - [Transitions](#lifecycleConfigurations_additionalProperties_additionalProperties_Transitions )                                                 | No      | array   | No         | -          | -                            |

##### <a name="lifecycleConfigurations_additionalProperties_additionalProperties_AbortIncompleteMultipartUploadAfter"></a>3.1.1.1. Property `root > lifecycleConfigurations > additionalProperties > additionalProperties > AbortIncompleteMultipartUploadAfter`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

##### <a name="lifecycleConfigurations_additionalProperties_additionalProperties_ExpirationDays"></a>3.1.1.2. Property `root > lifecycleConfigurations > additionalProperties > additionalProperties > ExpirationDays`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

##### <a name="lifecycleConfigurations_additionalProperties_additionalProperties_ExpiredObjectDeleteMarker"></a>3.1.1.3. Property `root > lifecycleConfigurations > additionalProperties > additionalProperties > ExpiredObjectDeleteMarker`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

##### <a name="lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionExpirationDays"></a>3.1.1.4. Property `root > lifecycleConfigurations > additionalProperties > additionalProperties > NoncurrentVersionExpirationDays`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

##### <a name="lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionTransitions"></a>3.1.1.5. Property `root > lifecycleConfigurations > additionalProperties > additionalProperties > NoncurrentVersionTransitions`

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

| Each item of this array must be                                                                                                    | Description |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [LifecycleTransitionConfig](#lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionTransitions_items) | -           |

###### <a name="autogenerated_heading_6"></a>3.1.1.5.1. root > lifecycleConfigurations > additionalProperties > additionalProperties > NoncurrentVersionTransitions > LifecycleTransitionConfig

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/LifecycleTransitionConfig                 |

| Property                                                                                                                                                    | Pattern | Type   | Deprecated | Definition | Title/Description         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------- |
| + [Days](#lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionTransitions_items_Days )                                       | No      | number | No         | -          | Lifecycle Transition Rule |
| - [NewerNoncurrentVersions](#lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionTransitions_items_NewerNoncurrentVersions ) | No      | number | No         | -          | -                         |
| + [StorageClass](#lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionTransitions_items_StorageClass )                       | No      | string | No         | -          | -                         |

###### <a name="lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionTransitions_items_Days"></a>3.1.1.5.1.1. Property `root > lifecycleConfigurations > additionalProperties > additionalProperties > NoncurrentVersionTransitions > NoncurrentVersionTransitions items > Days`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | Yes      |

**Description:** Lifecycle Transition Rule

###### <a name="lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionTransitions_items_NewerNoncurrentVersions"></a>3.1.1.5.1.2. Property `root > lifecycleConfigurations > additionalProperties > additionalProperties > NoncurrentVersionTransitions > NoncurrentVersionTransitions items > NewerNoncurrentVersions`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionTransitions_items_StorageClass"></a>3.1.1.5.1.3. Property `root > lifecycleConfigurations > additionalProperties > additionalProperties > NoncurrentVersionTransitions > NoncurrentVersionTransitions items > StorageClass`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionsToRetain"></a>3.1.1.6. Property `root > lifecycleConfigurations > additionalProperties > additionalProperties > NoncurrentVersionsToRetain`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

##### <a name="lifecycleConfigurations_additionalProperties_additionalProperties_ObjectSizeGreaterThan"></a>3.1.1.7. Property `root > lifecycleConfigurations > additionalProperties > additionalProperties > ObjectSizeGreaterThan`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

##### <a name="lifecycleConfigurations_additionalProperties_additionalProperties_ObjectSizeLessThan"></a>3.1.1.8. Property `root > lifecycleConfigurations > additionalProperties > additionalProperties > ObjectSizeLessThan`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

##### <a name="lifecycleConfigurations_additionalProperties_additionalProperties_Prefix"></a>3.1.1.9. Property `root > lifecycleConfigurations > additionalProperties > additionalProperties > Prefix`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="lifecycleConfigurations_additionalProperties_additionalProperties_Status"></a>3.1.1.10. Property `root > lifecycleConfigurations > additionalProperties > additionalProperties > Status`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Lifecycle configuration rule

##### <a name="lifecycleConfigurations_additionalProperties_additionalProperties_Transitions"></a>3.1.1.11. Property `root > lifecycleConfigurations > additionalProperties > additionalProperties > Transitions`

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

| Each item of this array must be                                                                                   | Description |
| ----------------------------------------------------------------------------------------------------------------- | ----------- |
| [LifecycleTransitionConfig](#lifecycleConfigurations_additionalProperties_additionalProperties_Transitions_items) | -           |

###### <a name="autogenerated_heading_7"></a>3.1.1.11.1. root > lifecycleConfigurations > additionalProperties > additionalProperties > Transitions > LifecycleTransitionConfig

|                           |                                                                                                                                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                      |
| **Required**              | No                                                                                                                                                                                                            |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                                                       |
| **Same definition as**    | [lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionTransitions_items](#lifecycleConfigurations_additionalProperties_additionalProperties_NoncurrentVersionTransitions_items) |

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

#### <a name="autogenerated_heading_8"></a>4.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

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

###### <a name="autogenerated_heading_9"></a>4.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

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

## <a name="roles"></a>5. Property `root > roles`

|                           |                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                        |
| **Required**              | Yes                                                                                                             |
| **Additional properties** | [[Should-conform]](#roles_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Map of named role references to be used within accessPolicies. A single config role
can reference multiple physical roles.

| Property                           | Pattern | Type  | Deprecated | Definition | Title/Description |
| ---------------------------------- | ------- | ----- | ---------- | ---------- | ----------------- |
| - [](#roles_additionalProperties ) | No      | array | No         | -          | -                 |

### <a name="roles_additionalProperties"></a>5.1. Property `root > roles > additionalProperties`

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

| Each item of this array must be                  | Description                                                                  |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| [MdaaRoleRef](#roles_additionalProperties_items) | A reference to an IAM role. Roles can be referenced by name, arn, and/or id. |

#### <a name="autogenerated_heading_10"></a>5.1.1. root > roles > additionalProperties > MdaaRoleRef

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaRoleRef                               |

**Description:** A reference to an IAM role. Roles can be referenced by name, arn, and/or id.

| Property                                                    | Pattern | Type    | Deprecated | Definition | Title/Description                                                                             |
| ----------------------------------------------------------- | ------- | ------- | ---------- | ---------- | --------------------------------------------------------------------------------------------- |
| - [arn](#roles_additionalProperties_items_arn )             | No      | string  | No         | -          | Reference role by arn                                                                         |
| - [id](#roles_additionalProperties_items_id )               | No      | string  | No         | -          | Reference role by id                                                                          |
| - [immutable](#roles_additionalProperties_items_immutable ) | No      | boolean | No         | -          | Indicates whether the role should be considered immutable (defaults false)                    |
| - [name](#roles_additionalProperties_items_name )           | No      | string  | No         | -          | Reference role by name                                                                        |
| - [refId](#roles_additionalProperties_items_refId )         | No      | string  | No         | -          | A string which uniquely identifies the MdaaRoleRef within a scope.                            |
| - [sso](#roles_additionalProperties_items_sso )             | No      | boolean | No         | -          | If true, role name will be resolved to an SSO auto-generated role. Also implies immutability. |

##### <a name="roles_additionalProperties_items_arn"></a>5.1.1.1. Property `root > roles > additionalProperties > additionalProperties items > arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by arn

##### <a name="roles_additionalProperties_items_id"></a>5.1.1.2. Property `root > roles > additionalProperties > additionalProperties items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by id

##### <a name="roles_additionalProperties_items_immutable"></a>5.1.1.3. Property `root > roles > additionalProperties > additionalProperties items > immutable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Indicates whether the role should be considered immutable (defaults false)

##### <a name="roles_additionalProperties_items_name"></a>5.1.1.4. Property `root > roles > additionalProperties > additionalProperties items > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by name

##### <a name="roles_additionalProperties_items_refId"></a>5.1.1.5. Property `root > roles > additionalProperties > additionalProperties items > refId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A string which uniquely identifies the MdaaRoleRef within a scope.

##### <a name="roles_additionalProperties_items_sso"></a>5.1.1.6. Property `root > roles > additionalProperties > additionalProperties items > sso`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true, role name will be resolved to an SSO auto-generated role. Also implies immutability.

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

###### <a name="autogenerated_heading_11"></a>6.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

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

###### <a name="autogenerated_heading_12"></a>6.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

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
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-06 at 12:56:00 -0400

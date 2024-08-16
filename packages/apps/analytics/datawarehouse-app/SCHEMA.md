# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type            | Deprecated | Definition                                       | Title/Description                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------- | ------- | --------------- | ---------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [additionalBucketKmsKeyArns](#additionalBucketKmsKeyArns )         | No      | array of string | No         | -                                                | Additional KMS keys which can be used to write to the cluster bucket                                                                                                                                                                                                  |
| + [adminPasswordRotationDays](#adminPasswordRotationDays )           | No      | number          | No         | -                                                | Set the number of days between admin password rotations                                                                                                                                                                                                               |
| + [adminUsername](#adminUsername )                                   | No      | string          | No         | -                                                | Set the admin user name for the cluster                                                                                                                                                                                                                               |
| - [automatedSnapshotRetentionDays](#automatedSnapshotRetentionDays ) | No      | number          | No         | -                                                | Number of days that automated snapshots are retained                                                                                                                                                                                                                  |
| - [clusterPort](#clusterPort )                                       | No      | number          | No         | -                                                | The cluster port (default: 54390)                                                                                                                                                                                                                                     |
| - [createWarehouseBucket](#createWarehouseBucket )                   | No      | boolean         | No         | -                                                | If true(default), a Data Warehouse bucket will be created                                                                                                                                                                                                             |
| + [dataAdminRoles](#dataAdminRoles )                                 | No      | array           | No         | -                                                | List of admin roles which will be provided access to cluster resources (like KMS/Bucket)                                                                                                                                                                              |
| - [databaseUsers](#databaseUsers )                                   | No      | array           | No         | -                                                | List of Users to be created in Redshift Database, then stored & rotated in secrets manager -> ssm                                                                                                                                                                     |
| + [enableAuditLoggingToS3](#enableAuditLoggingToS3 )                 | No      | boolean         | No         | -                                                | If enabled, cluster audit logging will be written to an S3 bucket created for this purpose.<br />Note that Redshift supports audit logging only to SSE-S3 encrypted buckets, so this audit bucket<br />will not be created with SSE-KMS or use a customer master key. |
| - [eventNotifications](#eventNotifications )                         | No      | object          | No         | In #/definitions/EventNotificationsProps         | Configuration of cluster and scheduled action event notifications                                                                                                                                                                                                     |
| - [executionRoles](#executionRoles )                                 | No      | array           | No         | -                                                | List of external roles which will be associated to the redshift cluster<br />If a role requires access to datawarehouse bucket, then role should be added to 'warehouseBucketUserRoles' in application config                                                         |
| - [federations](#federations )                                       | No      | array           | No         | -                                                | List of federations/roles to be created for federated access to the cluster                                                                                                                                                                                           |
| - [multiNode](#multiNode )                                           | No      | boolean         | No         | -                                                | If true, cluster will be of type MULTI_NODE, otherwise SINGLE_NODE                                                                                                                                                                                                    |
| - [nag_suppressions](#nag_suppressions )                             | No      | object          | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                                                                                                                                      |
| + [nodeType](#nodeType )                                             | No      | string          | No         | -                                                | Node type of the cluster.                                                                                                                                                                                                                                             |
| + [numberOfNodes](#numberOfNodes )                                   | No      | number          | No         | -                                                | Number of cluster nodes                                                                                                                                                                                                                                               |
| - [parameterGroupParams](#parameterGroupParams )                     | No      | object          | No         | -                                                | Additional parameters for the cluster parameter group. Certain security-sensitive values will be overridden.                                                                                                                                                          |
| + [preferredMaintenanceWindow](#preferredMaintenanceWindow )         | No      | string          | No         | -                                                | The preferred maintenance window for the cluster<br />Example: 'Sun:23:45-Mon:00:15'                                                                                                                                                                                  |
| - [scheduledActions](#scheduledActions )                             | No      | array           | No         | -                                                | List of scheduled actions (pause,resume) which can be applied to the cluster                                                                                                                                                                                          |
| + [securityGroupIngress](#securityGroupIngress )                     | No      | object          | No         | -                                                | Additional ingress rules to be added to the cluster security group, permitting tcp traffic on the cluster port                                                                                                                                                        |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object          | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment                                                                                                                  |
| + [subnetIds](#subnetIds )                                           | No      | array of string | No         | -                                                | The ID of the subnets on which the cluster will be deployed.                                                                                                                                                                                                          |
| + [vpcId](#vpcId )                                                   | No      | string          | No         | -                                                | The ID of the VPC on which the cluster will be deployed.                                                                                                                                                                                                              |
| - [warehouseBucketUserRoles](#warehouseBucketUserRoles )             | No      | array           | No         | -                                                | List of user roles which will be provided access to cluster resources (like KMS/Bucket)                                                                                                                                                                               |
| - [workloadManagement](#workloadManagement )                         | No      | array of object | No         | -                                                | The cluster workload management configuration.                                                                                                                                                                                                                        |

## <a name="additionalBucketKmsKeyArns"></a>1. Property `root > additionalBucketKmsKeyArns`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Additional KMS keys which can be used to write to the cluster bucket

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                       | Description |
| --------------------------------------------------------------------- | ----------- |
| [additionalBucketKmsKeyArns items](#additionalBucketKmsKeyArns_items) | -           |

### <a name="autogenerated_heading_2"></a>1.1. root > additionalBucketKmsKeyArns > additionalBucketKmsKeyArns items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

## <a name="adminPasswordRotationDays"></a>2. Property `root > adminPasswordRotationDays`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | Yes      |

**Description:** Set the number of days between admin password rotations

## <a name="adminUsername"></a>3. Property `root > adminUsername`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Set the admin user name for the cluster

## <a name="automatedSnapshotRetentionDays"></a>4. Property `root > automatedSnapshotRetentionDays`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Number of days that automated snapshots are retained

## <a name="clusterPort"></a>5. Property `root > clusterPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The cluster port (default: 54390)

## <a name="createWarehouseBucket"></a>6. Property `root > createWarehouseBucket`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true(default), a Data Warehouse bucket will be created

## <a name="dataAdminRoles"></a>7. Property `root > dataAdminRoles`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** List of admin roles which will be provided access to cluster resources (like KMS/Bucket)

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be      | Description                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| [MdaaRoleRef](#dataAdminRoles_items) | A reference to an IAM role. Roles can be referenced by name, arn, and/or id. |

### <a name="autogenerated_heading_3"></a>7.1. root > dataAdminRoles > MdaaRoleRef

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaRoleRef                               |

**Description:** A reference to an IAM role. Roles can be referenced by name, arn, and/or id.

| Property                                        | Pattern | Type    | Deprecated | Definition | Title/Description                                                                             |
| ----------------------------------------------- | ------- | ------- | ---------- | ---------- | --------------------------------------------------------------------------------------------- |
| - [arn](#dataAdminRoles_items_arn )             | No      | string  | No         | -          | Reference role by arn                                                                         |
| - [id](#dataAdminRoles_items_id )               | No      | string  | No         | -          | Reference role by id                                                                          |
| - [immutable](#dataAdminRoles_items_immutable ) | No      | boolean | No         | -          | Indicates whether the role should be considered immutable (defaults false)                    |
| - [name](#dataAdminRoles_items_name )           | No      | string  | No         | -          | Reference role by name                                                                        |
| - [refId](#dataAdminRoles_items_refId )         | No      | string  | No         | -          | A string which uniquely identifies the MdaaRoleRef within a scope.                            |
| - [sso](#dataAdminRoles_items_sso )             | No      | boolean | No         | -          | If true, role name will be resolved to an SSO auto-generated role. Also implies immutability. |

#### <a name="dataAdminRoles_items_arn"></a>7.1.1. Property `root > dataAdminRoles > dataAdminRoles items > arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by arn

#### <a name="dataAdminRoles_items_id"></a>7.1.2. Property `root > dataAdminRoles > dataAdminRoles items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by id

#### <a name="dataAdminRoles_items_immutable"></a>7.1.3. Property `root > dataAdminRoles > dataAdminRoles items > immutable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Indicates whether the role should be considered immutable (defaults false)

#### <a name="dataAdminRoles_items_name"></a>7.1.4. Property `root > dataAdminRoles > dataAdminRoles items > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by name

#### <a name="dataAdminRoles_items_refId"></a>7.1.5. Property `root > dataAdminRoles > dataAdminRoles items > refId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A string which uniquely identifies the MdaaRoleRef within a scope.

#### <a name="dataAdminRoles_items_sso"></a>7.1.6. Property `root > dataAdminRoles > dataAdminRoles items > sso`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true, role name will be resolved to an SSO auto-generated role. Also implies immutability.

## <a name="databaseUsers"></a>8. Property `root > databaseUsers`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** List of Users to be created in Redshift Database, then stored & rotated in secrets manager -> ssm

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be            | Description |
| ------------------------------------------ | ----------- |
| [DatabaseUsersProps](#databaseUsers_items) | -           |

### <a name="autogenerated_heading_4"></a>8.1. root > databaseUsers > DatabaseUsersProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/DatabaseUsersProps                        |

| Property                                                         | Pattern | Type   | Deprecated | Definition | Title/Description                              |
| ---------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ---------------------------------------------- |
| + [dbName](#databaseUsers_items_dbName )                         | No      | string | No         | -          | The DB to which the user will be added         |
| - [secretAccessRoles](#databaseUsers_items_secretAccessRoles )   | No      | array  | No         | -          | List of roles that need redshift secret access |
| + [secretRotationDays](#databaseUsers_items_secretRotationDays ) | No      | number | No         | -          | Number of days between secret rotation         |
| + [userName](#databaseUsers_items_userName )                     | No      | string | No         | -          | Name of the execution role                     |

#### <a name="databaseUsers_items_dbName"></a>8.1.1. Property `root > databaseUsers > databaseUsers items > dbName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The DB to which the user will be added

#### <a name="databaseUsers_items_secretAccessRoles"></a>8.1.2. Property `root > databaseUsers > databaseUsers items > secretAccessRoles`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** List of roles that need redshift secret access

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                             | Description                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [MdaaRoleRef](#databaseUsers_items_secretAccessRoles_items) | A reference to an IAM role. Roles can be referenced by name, arn, and/or id. |

##### <a name="autogenerated_heading_5"></a>8.1.2.1. root > databaseUsers > databaseUsers items > secretAccessRoles > MdaaRoleRef

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [dataAdminRoles_items](#dataAdminRoles_items)           |

**Description:** A reference to an IAM role. Roles can be referenced by name, arn, and/or id.

#### <a name="databaseUsers_items_secretRotationDays"></a>8.1.3. Property `root > databaseUsers > databaseUsers items > secretRotationDays`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | Yes      |

**Description:** Number of days between secret rotation

#### <a name="databaseUsers_items_userName"></a>8.1.4. Property `root > databaseUsers > databaseUsers items > userName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Name of the execution role

## <a name="enableAuditLoggingToS3"></a>9. Property `root > enableAuditLoggingToS3`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** If enabled, cluster audit logging will be written to an S3 bucket created for this purpose.
Note that Redshift supports audit logging only to SSE-S3 encrypted buckets, so this audit bucket
will not be created with SSE-KMS or use a customer master key.

## <a name="eventNotifications"></a>10. Property `root > eventNotifications`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/EventNotificationsProps                   |

**Description:** Configuration of cluster and scheduled action event notifications

| Property                                                  | Pattern | Type             | Deprecated | Definition | Title/Description |
| --------------------------------------------------------- | ------- | ---------------- | ---------- | ---------- | ----------------- |
| - [email](#eventNotifications_email )                     | No      | array of string  | No         | -          | -                 |
| - [eventCategories](#eventNotifications_eventCategories ) | No      | array            | No         | -          | -                 |
| - [severity](#eventNotifications_severity )               | No      | enum (of string) | No         | -          | -                 |

### <a name="eventNotifications_email"></a>10.1. Property `root > eventNotifications > email`

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

| Each item of this array must be                | Description |
| ---------------------------------------------- | ----------- |
| [email items](#eventNotifications_email_items) | -           |

#### <a name="autogenerated_heading_6"></a>10.1.1. root > eventNotifications > email > email items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="eventNotifications_eventCategories"></a>10.2. Property `root > eventNotifications > eventCategories`

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

| Each item of this array must be                              | Description |
| ------------------------------------------------------------ | ----------- |
| [EventCategories](#eventNotifications_eventCategories_items) | -           |

#### <a name="autogenerated_heading_7"></a>10.2.1. root > eventNotifications > eventCategories > EventCategories

|                |                               |
| -------------- | ----------------------------- |
| **Type**       | `enum (of string)`            |
| **Required**   | No                            |
| **Defined in** | #/definitions/EventCategories |

Must be one of:
* "configuration"
* "management"
* "monitoring"
* "pending"
* "security"

### <a name="eventNotifications_severity"></a>10.3. Property `root > eventNotifications > severity`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

Must be one of:
* "ERROR"
* "INFO"

## <a name="executionRoles"></a>11. Property `root > executionRoles`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** List of external roles which will be associated to the redshift cluster
If a role requires access to datawarehouse bucket, then role should be added to 'warehouseBucketUserRoles' in application config

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be      | Description                                                                  |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| [MdaaRoleRef](#executionRoles_items) | A reference to an IAM role. Roles can be referenced by name, arn, and/or id. |

### <a name="autogenerated_heading_8"></a>11.1. root > executionRoles > MdaaRoleRef

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [dataAdminRoles_items](#dataAdminRoles_items)           |

**Description:** A reference to an IAM role. Roles can be referenced by name, arn, and/or id.

## <a name="federations"></a>12. Property `root > federations`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** List of federations/roles to be created for federated access to the cluster

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be       | Description |
| ------------------------------------- | ----------- |
| [FederationProps](#federations_items) | -           |

### <a name="autogenerated_heading_9"></a>12.1. root > federations > FederationProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/FederationProps                           |

| Property                                               | Pattern | Type   | Deprecated | Definition | Title/Description                                                    |
| ------------------------------------------------------ | ------- | ------ | ---------- | ---------- | -------------------------------------------------------------------- |
| + [federationName](#federations_items_federationName ) | No      | string | No         | -          | Name of the federation for reference elsewhere in the config.        |
| + [providerArn](#federations_items_providerArn )       | No      | string | No         | -          | Arn of the IAM Identity Provider through which federation will occur |
| - [url](#federations_items_url )                       | No      | string | No         | -          | Deprecated. No Longer used.                                          |

#### <a name="federations_items_federationName"></a>12.1.1. Property `root > federations > federations items > federationName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Name of the federation for reference elsewhere in the config.

#### <a name="federations_items_providerArn"></a>12.1.2. Property `root > federations > federations items > providerArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Arn of the IAM Identity Provider through which federation will occur

#### <a name="federations_items_url"></a>12.1.3. Property `root > federations > federations items > url`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Deprecated. No Longer used.

## <a name="multiNode"></a>13. Property `root > multiNode`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true, cluster will be of type MULTI_NODE, otherwise SINGLE_NODE

## <a name="nag_suppressions"></a>14. Property `root > nag_suppressions`

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

### <a name="nag_suppressions_by_path"></a>14.1. Property `root > nag_suppressions > by_path`

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

#### <a name="autogenerated_heading_10"></a>14.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

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

##### <a name="nag_suppressions_by_path_items_path"></a>14.1.1.1. Property `root > nag_suppressions > by_path > by_path items > path`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="nag_suppressions_by_path_items_suppressions"></a>14.1.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions`

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

###### <a name="autogenerated_heading_11"></a>14.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                               | Pattern | Type   | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#nag_suppressions_by_path_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#nag_suppressions_by_path_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="nag_suppressions_by_path_items_suppressions_items_id"></a>14.1.1.2.1.1. Property `root > nag_suppressions > by_path > by_path items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nag_suppressions_by_path_items_suppressions_items_reason"></a>14.1.1.2.1.2. Property `root > nag_suppressions > by_path > by_path items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="nodeType"></a>15. Property `root > nodeType`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Node type of the cluster.

## <a name="numberOfNodes"></a>16. Property `root > numberOfNodes`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | Yes      |

**Description:** Number of cluster nodes

## <a name="parameterGroupParams"></a>17. Property `root > parameterGroupParams`

|                           |                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                       |
| **Required**              | No                                                                                                                             |
| **Additional properties** | [[Should-conform]](#parameterGroupParams_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Additional parameters for the cluster parameter group. Certain security-sensitive values will be overridden.

| Property                                          | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#parameterGroupParams_additionalProperties ) | No      | object | No         | -          | -                 |

### <a name="parameterGroupParams_additionalProperties"></a>17.1. Property `root > parameterGroupParams > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

## <a name="preferredMaintenanceWindow"></a>18. Property `root > preferredMaintenanceWindow`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The preferred maintenance window for the cluster
Example: 'Sun:23:45-Mon:00:15'

## <a name="scheduledActions"></a>19. Property `root > scheduledActions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** List of scheduled actions (pause,resume) which can be applied to the cluster

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                 | Description |
| ----------------------------------------------- | ----------- |
| [ScheduledActionProps](#scheduledActions_items) | -           |

### <a name="autogenerated_heading_12"></a>19.1. root > scheduledActions > ScheduledActionProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/ScheduledActionProps                      |

| Property                                                | Pattern | Type    | Deprecated | Definition | Title/Description                                                                                 |
| ------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------- |
| + [enable](#scheduledActions_items_enable )             | No      | boolean | No         | -          | Scheduled action is enabled if true                                                               |
| - [endTime](#scheduledActions_items_endTime )           | No      | string  | No         | -          | The scheduled action Start Date & Time in UTC format till when the scheduled action is effective. |
| + [name](#scheduledActions_items_name )                 | No      | string  | No         | -          | Named of the scheduled action                                                                     |
| + [schedule](#scheduledActions_items_schedule )         | No      | string  | No         | -          | The scheduled action schedule in cron format                                                      |
| - [startTime](#scheduledActions_items_startTime )       | No      | string  | No         | -          | The scheduled action Start Date & Time in UTC format from when the scheduled action is effective. |
| + [targetAction](#scheduledActions_items_targetAction ) | No      | string  | No         | -          | One of "pauseCluster", "resumeCluster"                                                            |

#### <a name="scheduledActions_items_enable"></a>19.1.1. Property `root > scheduledActions > scheduledActions items > enable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Scheduled action is enabled if true

#### <a name="scheduledActions_items_endTime"></a>19.1.2. Property `root > scheduledActions > scheduledActions items > endTime`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The scheduled action Start Date & Time in UTC format till when the scheduled action is effective.

#### <a name="scheduledActions_items_name"></a>19.1.3. Property `root > scheduledActions > scheduledActions items > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Named of the scheduled action

#### <a name="scheduledActions_items_schedule"></a>19.1.4. Property `root > scheduledActions > scheduledActions items > schedule`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The scheduled action schedule in cron format

#### <a name="scheduledActions_items_startTime"></a>19.1.5. Property `root > scheduledActions > scheduledActions items > startTime`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The scheduled action Start Date & Time in UTC format from when the scheduled action is effective.

#### <a name="scheduledActions_items_targetAction"></a>19.1.6. Property `root > scheduledActions > scheduledActions items > targetAction`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** One of "pauseCluster", "resumeCluster"

## <a name="securityGroupIngress"></a>20. Property `root > securityGroupIngress`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

**Description:** Additional ingress rules to be added to the cluster security group, permitting tcp traffic on the cluster port

| Property                              | Pattern | Type            | Deprecated | Definition | Title/Description |
| ------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [ipv4](#securityGroupIngress_ipv4 ) | No      | array of string | No         | -          | -                 |
| - [sg](#securityGroupIngress_sg )     | No      | array of string | No         | -          | -                 |

### <a name="securityGroupIngress_ipv4"></a>20.1. Property `root > securityGroupIngress > ipv4`

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

| Each item of this array must be                | Description |
| ---------------------------------------------- | ----------- |
| [ipv4 items](#securityGroupIngress_ipv4_items) | -           |

#### <a name="autogenerated_heading_13"></a>20.1.1. root > securityGroupIngress > ipv4 > ipv4 items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="securityGroupIngress_sg"></a>20.2. Property `root > securityGroupIngress > sg`

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

| Each item of this array must be            | Description |
| ------------------------------------------ | ----------- |
| [sg items](#securityGroupIngress_sg_items) | -           |

#### <a name="autogenerated_heading_14"></a>20.2.1. root > securityGroupIngress > sg > sg items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

## <a name="service_catalog_product_config"></a>21. Property `root > service_catalog_product_config`

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

### <a name="service_catalog_product_config_launch_role_name"></a>21.1. Property `root > service_catalog_product_config > launch_role_name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="service_catalog_product_config_name"></a>21.2. Property `root > service_catalog_product_config > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_owner"></a>21.3. Property `root > service_catalog_product_config > owner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_parameters"></a>21.4. Property `root > service_catalog_product_config > parameters`

|                           |                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                            |
| **Required**              | No                                                                                                                                                  |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                               | Pattern | Type   | Deprecated | Definition                                         | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogParameterConfig | -                 |

#### <a name="service_catalog_product_config_parameters_additionalProperties"></a>21.4.1. Property `root > service_catalog_product_config > parameters > MdaaServiceCatalogParameterConfig`

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

##### <a name="service_catalog_product_config_parameters_additionalProperties_constraints"></a>21.4.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_description"></a>21.4.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules"></a>21.4.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules`

|                           |                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                                                   |
| **Required**              | Yes                                                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                      | Pattern | Type   | Deprecated | Definition                                              | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleConfig | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties"></a>21.4.1.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > MdaaServiceCatalogConstraintRuleConfig`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions"></a>21.4.1.1.2.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions`

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

###### <a name="autogenerated_heading_15"></a>21.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert"></a>21.4.1.1.2.1.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > assert`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description"></a>21.4.1.1.2.1.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition"></a>21.4.1.1.2.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > condition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig           |

##### <a name="service_catalog_product_config_parameters_additionalProperties_props"></a>21.4.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedPattern"></a>21.4.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedPattern`

|              |                                                         |
| ------------ | ------------------------------------------------------- |
| **Type**     | `string`                                                |
| **Required** | No                                                      |
| **Default**  | `"- No constraints on patterns allowed for parameter."` |

**Description:** A regular expression that represents the patterns to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedValues"></a>21.4.1.2.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues`

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

###### <a name="autogenerated_heading_16"></a>21.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_constraintDescription"></a>21.4.1.2.3. Property `root > service_catalog_product_config > parameters > additionalProperties > props > constraintDescription`

|              |                                                                                        |
| ------------ | -------------------------------------------------------------------------------------- |
| **Type**     | `string`                                                                               |
| **Required** | No                                                                                     |
| **Default**  | `"- No description with customized error message when user specifies invalid values."` |

**Description:** A string that explains a constraint when the constraint is violated.
For example, without a constraint description, a parameter that has an allowed
pattern of [A-Za-z0-9]+ displays the following error message when the user specifies
an invalid value:

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_default"></a>21.4.1.2.4. Property `root > service_catalog_product_config > parameters > additionalProperties > props > default`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Default**               | `"- No default value for parameter."`                                     |

**Description:** A value of the appropriate type for the template to use if no value is specified
when a stack is created. If you define constraints for the parameter, you must specify
a value that adheres to those constraints.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_description"></a>21.4.1.2.5. Property `root > service_catalog_product_config > parameters > additionalProperties > props > description`

|              |                                         |
| ------------ | --------------------------------------- |
| **Type**     | `string`                                |
| **Required** | No                                      |
| **Default**  | `"- No description for the parameter."` |

**Description:** A string of up to 4000 characters that describes the parameter.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxLength"></a>21.4.1.2.6. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the largest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxValue"></a>21.4.1.2.7. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the largest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minLength"></a>21.4.1.2.8. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the smallest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minValue"></a>21.4.1.2.9. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the smallest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_noEcho"></a>21.4.1.2.10. Property `root > service_catalog_product_config > parameters > additionalProperties > props > noEcho`

|              |                                        |
| ------------ | -------------------------------------- |
| **Type**     | `boolean`                              |
| **Required** | No                                     |
| **Default**  | `"- Parameter values are not masked."` |

**Description:** Whether to mask the parameter value when anyone makes a call that describes the stack.
If you set the value to ``true``, the parameter value is masked with asterisks (``*****``).

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_type"></a>21.4.1.2.11. Property `root > service_catalog_product_config > parameters > additionalProperties > props > type`

|              |            |
| ------------ | ---------- |
| **Type**     | `string`   |
| **Required** | No         |
| **Default**  | `"String"` |

**Description:** The data type for the parameter (DataType).

### <a name="service_catalog_product_config_portfolio_arn"></a>21.5. Property `root > service_catalog_product_config > portfolio_arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="subnetIds"></a>22. Property `root > subnetIds`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The ID of the subnets on which the cluster will be deployed.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be     | Description |
| ----------------------------------- | ----------- |
| [subnetIds items](#subnetIds_items) | -           |

### <a name="autogenerated_heading_17"></a>22.1. root > subnetIds > subnetIds items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

## <a name="vpcId"></a>23. Property `root > vpcId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ID of the VPC on which the cluster will be deployed.

## <a name="warehouseBucketUserRoles"></a>24. Property `root > warehouseBucketUserRoles`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** List of user roles which will be provided access to cluster resources (like KMS/Bucket)

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                | Description                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| [MdaaRoleRef](#warehouseBucketUserRoles_items) | A reference to an IAM role. Roles can be referenced by name, arn, and/or id. |

### <a name="autogenerated_heading_18"></a>24.1. root > warehouseBucketUserRoles > MdaaRoleRef

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Same definition as**    | [dataAdminRoles_items](#dataAdminRoles_items)           |

**Description:** A reference to an IAM role. Roles can be referenced by name, arn, and/or id.

## <a name="workloadManagement"></a>25. Property `root > workloadManagement`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of object` |
| **Required** | No                |

**Description:** The cluster workload management configuration.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                       | Description |
| ----------------------------------------------------- | ----------- |
| [workloadManagement items](#workloadManagement_items) | -           |

### <a name="autogenerated_heading_19"></a>25.1. root > workloadManagement > workloadManagement items

|                           |                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                           |
| **Required**              | No                                                                                                                                 |
| **Additional properties** | [[Should-conform]](#workloadManagement_items_additionalProperties "Each additional property must conform to the following schema") |

| Property                                              | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#workloadManagement_items_additionalProperties ) | No      | object | No         | -          | -                 |

#### <a name="workloadManagement_items_additionalProperties"></a>25.1.1. Property `root > workloadManagement > workloadManagement items > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

----------------------------------------------------------------------------------------------------------------------------
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-16 at 13:40:47 -0400

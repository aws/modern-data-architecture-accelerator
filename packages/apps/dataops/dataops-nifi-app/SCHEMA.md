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
| + [nifi](#nifi )                                                     | No      | object | No         | In #/definitions/NifiProps                       | -                                                                                                                                                    |
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

## <a name="nifi"></a>4. Property `root > nifi`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NifiProps                                 |

| Property                                                                              | Pattern | Type            | Deprecated | Definition                                                                                        | Title/Description                                                                                                                                                                                |
| ------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [additionalEfsIngressSecurityGroupIds](#nifi_additionalEfsIngressSecurityGroupIds ) | No      | array of string | No         | -                                                                                                 | Security groups which will be provided ingress access to all Nifi cluster EFS security groups.<br />These may also be specified for each cluster.                                                |
| + [adminRoles](#nifi_adminRoles )                                                     | No      | array           | No         | -                                                                                                 | List of admin roles which will be provided access to EKS cluster resources                                                                                                                       |
| - [caCertDuration](#nifi_caCertDuration )                                             | No      | string          | No         | -                                                                                                 | The certificate validity period for the internal CA cert. If using an ACM Private CA with short-term certificates,<br />this should be set to less than 7 days. Defaults to 6 days.              |
| - [caCertRenewBefore](#nifi_caCertRenewBefore )                                       | No      | string          | No         | -                                                                                                 | The time before CA cert expiration at which point the internal CA cert will be renewed.<br />Defaults to 12 hours.                                                                               |
| - [certKeyAlg](#nifi_certKeyAlg )                                                     | No      | string          | No         | -                                                                                                 | -                                                                                                                                                                                                |
| - [certKeySize](#nifi_certKeySize )                                                   | No      | number          | No         | -                                                                                                 | -                                                                                                                                                                                                |
| - [clusters](#nifi_clusters )                                                         | No      | object          | No         | In #/definitions/NamedNifiClusterOptions                                                          | Nifi cluster configurations to be created.                                                                                                                                                       |
| - [eksSecurityGroupIngressRules](#nifi_eksSecurityGroupIngressRules )                 | No      | object          | No         | Same as [securityGroupEgressRules](#nifi_clusters_additionalProperties_securityGroupEgressRules ) | Ingress rules to be added to the EKS control plane security group                                                                                                                                |
| - [existingPrivateCaArn](#nifi_existingPrivateCaArn )                                 | No      | string          | No         | -                                                                                                 | (Optional) If specified, this ACM Private CA will be used to sign the internal CA running<br />within EKS. If not specified, an ACM Private CA will be created.                                  |
| - [mgmtInstance](#nifi_mgmtInstance )                                                 | No      | object          | No         | In #/definitions/MgmtInstanceProps                                                                | If defined, an EC2 instance will be created with connectivity, permissions, and tooling to manage the EKS cluster                                                                                |
| - [nodeCertDuration](#nifi_nodeCertDuration )                                         | No      | string          | No         | -                                                                                                 | The certificate validity period for the Zookeeper and Nifi Node certs. If using an ACM Private CA with short-term certificates,<br />this should be set to less than 6 days. Defaults to 5 days. |
| - [nodeCertRenewBefore](#nifi_nodeCertRenewBefore )                                   | No      | string          | No         | -                                                                                                 | The time before CA cert expiration at which point the Zookeeper and Nifi Node certs will be renewed.<br />Defaults to 12 hours.                                                                  |
| - [registry](#nifi_registry )                                                         | No      | object          | No         | In #/definitions/NifiRegistryProps                                                                | -                                                                                                                                                                                                |
| - [securityGroupEgressRules](#nifi_securityGroupEgressRules )                         | No      | object          | No         | Same as [securityGroupEgressRules](#nifi_clusters_additionalProperties_securityGroupEgressRules ) | Egress rules to be added to all Nifi cluster security groups.<br />These may also be specified for each cluster.                                                                                 |
| - [securityGroupIngressIPv4s](#nifi_securityGroupIngressIPv4s )                       | No      | array of string | No         | -                                                                                                 | IPv4 CIDRs which will be provided ingress access to all Nifi cluster security groups.<br />These may also be specified for each cluster.                                                         |
| - [securityGroupIngressSGs](#nifi_securityGroupIngressSGs )                           | No      | array of string | No         | -                                                                                                 | Security groups which will be provided ingress access to all Nifi cluster security groups.<br />These may also be specified for each cluster.                                                    |
| + [subnetIds](#nifi_subnetIds )                                                       | No      | object          | No         | -                                                                                                 | Subnets on which EKS and Nifi clusters will be deployed                                                                                                                                          |
| + [vpcId](#nifi_vpcId )                                                               | No      | string          | No         | -                                                                                                 | VPC on which EKS and Nifi clusters will be deployed                                                                                                                                              |

### <a name="nifi_additionalEfsIngressSecurityGroupIds"></a>4.1. Property `root > nifi > additionalEfsIngressSecurityGroupIds`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Security groups which will be provided ingress access to all Nifi cluster EFS security groups.
These may also be specified for each cluster.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                | Description |
| ---------------------------------------------------------------------------------------------- | ----------- |
| [additionalEfsIngressSecurityGroupIds items](#nifi_additionalEfsIngressSecurityGroupIds_items) | -           |

#### <a name="autogenerated_heading_4"></a>4.1.1. root > nifi > additionalEfsIngressSecurityGroupIds > additionalEfsIngressSecurityGroupIds items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="nifi_adminRoles"></a>4.2. Property `root > nifi > adminRoles`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** List of admin roles which will be provided access to EKS cluster resources

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be       | Description                                                                  |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| [MdaaRoleRef](#nifi_adminRoles_items) | A reference to an IAM role. Roles can be referenced by name, arn, and/or id. |

#### <a name="autogenerated_heading_5"></a>4.2.1. root > nifi > adminRoles > MdaaRoleRef

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaRoleRef                               |

**Description:** A reference to an IAM role. Roles can be referenced by name, arn, and/or id.

| Property                                         | Pattern | Type    | Deprecated | Definition | Title/Description                                                                             |
| ------------------------------------------------ | ------- | ------- | ---------- | ---------- | --------------------------------------------------------------------------------------------- |
| - [arn](#nifi_adminRoles_items_arn )             | No      | string  | No         | -          | Reference role by arn                                                                         |
| - [id](#nifi_adminRoles_items_id )               | No      | string  | No         | -          | Reference role by id                                                                          |
| - [immutable](#nifi_adminRoles_items_immutable ) | No      | boolean | No         | -          | Indicates whether the role should be considered immutable (defaults false)                    |
| - [name](#nifi_adminRoles_items_name )           | No      | string  | No         | -          | Reference role by name                                                                        |
| - [refId](#nifi_adminRoles_items_refId )         | No      | string  | No         | -          | A string which uniquely identifies the MdaaRoleRef within a scope.                            |
| - [sso](#nifi_adminRoles_items_sso )             | No      | boolean | No         | -          | If true, role name will be resolved to an SSO auto-generated role. Also implies immutability. |

##### <a name="nifi_adminRoles_items_arn"></a>4.2.1.1. Property `root > nifi > adminRoles > adminRoles items > arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by arn

##### <a name="nifi_adminRoles_items_id"></a>4.2.1.2. Property `root > nifi > adminRoles > adminRoles items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by id

##### <a name="nifi_adminRoles_items_immutable"></a>4.2.1.3. Property `root > nifi > adminRoles > adminRoles items > immutable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Indicates whether the role should be considered immutable (defaults false)

##### <a name="nifi_adminRoles_items_name"></a>4.2.1.4. Property `root > nifi > adminRoles > adminRoles items > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by name

##### <a name="nifi_adminRoles_items_refId"></a>4.2.1.5. Property `root > nifi > adminRoles > adminRoles items > refId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A string which uniquely identifies the MdaaRoleRef within a scope.

##### <a name="nifi_adminRoles_items_sso"></a>4.2.1.6. Property `root > nifi > adminRoles > adminRoles items > sso`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true, role name will be resolved to an SSO auto-generated role. Also implies immutability.

### <a name="nifi_caCertDuration"></a>4.3. Property `root > nifi > caCertDuration`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The certificate validity period for the internal CA cert. If using an ACM Private CA with short-term certificates,
this should be set to less than 7 days. Defaults to 6 days.

### <a name="nifi_caCertRenewBefore"></a>4.4. Property `root > nifi > caCertRenewBefore`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The time before CA cert expiration at which point the internal CA cert will be renewed.
Defaults to 12 hours.

### <a name="nifi_certKeyAlg"></a>4.5. Property `root > nifi > certKeyAlg`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="nifi_certKeySize"></a>4.6. Property `root > nifi > certKeySize`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

### <a name="nifi_clusters"></a>4.7. Property `root > nifi > clusters`

|                           |                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                |
| **Required**              | No                                                                                                                      |
| **Additional properties** | [[Should-conform]](#nifi_clusters_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedNifiClusterOptions                                                                                   |

**Description:** Nifi cluster configurations to be created.

| Property                                   | Pattern | Type   | Deprecated | Definition                                   | Title/Description |
| ------------------------------------------ | ------- | ------ | ---------- | -------------------------------------------- | ----------------- |
| - [](#nifi_clusters_additionalProperties ) | No      | object | No         | In #/definitions/NifiClusterOptionsWithPeers | -                 |

#### <a name="nifi_clusters_additionalProperties"></a>4.7.1. Property `root > nifi > clusters > NifiClusterOptionsWithPeers`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NifiClusterOptionsWithPeers               |

| Property                                                                                                            | Pattern | Type             | Deprecated | Definition                                    | Title/Description                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [additionalEfsIngressSecurityGroupIds](#nifi_clusters_additionalProperties_additionalEfsIngressSecurityGroupIds ) | No      | array of string  | No         | -                                             | Security groups which will be provided ingress access to the Nifi cluster EFS security group.<br />These may also be specified globally.                                                        |
| + [adminIdentities](#nifi_clusters_additionalProperties_adminIdentities )                                           | No      | array of string  | No         | -                                             | -                                                                                                                                                                                               |
| - [authorizations](#nifi_clusters_additionalProperties_authorizations )                                             | No      | array            | No         | -                                             | -                                                                                                                                                                                               |
| - [clusterPort](#nifi_clusters_additionalProperties_clusterPort )                                                   | No      | number           | No         | -                                             | The port on which the internal cluster communications will occur                                                                                                                                |
| - [clusterRoleAwsManagedPolicies](#nifi_clusters_additionalProperties_clusterRoleAwsManagedPolicies )               | No      | array            | No         | -                                             | AWS managed policies which will be granted to the Nifi cluster role for access to AWS services.                                                                                                 |
| - [clusterRoleManagedPolicies](#nifi_clusters_additionalProperties_clusterRoleManagedPolicies )                     | No      | array of string  | No         | -                                             | Customer managed policies which will be granted to the Nifi cluster role for access to AWS services.                                                                                            |
| - [externalNodeIdentities](#nifi_clusters_additionalProperties_externalNodeIdentities )                             | No      | array of string  | No         | -                                             | -                                                                                                                                                                                               |
| - [groups](#nifi_clusters_additionalProperties_groups )                                                             | No      | object           | No         | -                                             | -                                                                                                                                                                                               |
| - [httpsPort](#nifi_clusters_additionalProperties_httpsPort )                                                       | No      | number           | No         | -                                             | The port on which the cluster HTTPS interfaces will listen                                                                                                                                      |
| - [identities](#nifi_clusters_additionalProperties_identities )                                                     | No      | array of string  | No         | -                                             | -                                                                                                                                                                                               |
| - [nifiImageTag](#nifi_clusters_additionalProperties_nifiImageTag )                                                 | No      | string           | No         | -                                             | The tag of the Nifi docker image to use. If not specified,<br />defaults to the latest tested version (currently 1.25.0). Specify 'latest' to pull<br />the latest version (might be untested). |
| - [nodeCount](#nifi_clusters_additionalProperties_nodeCount )                                                       | No      | number           | No         | -                                             | Initial number of nodes in the cluster.<br />Defaults to 1.                                                                                                                                     |
| - [nodeSize](#nifi_clusters_additionalProperties_nodeSize )                                                         | No      | enum (of string) | No         | -                                             | Size of the Nifi cluster nodes. <br />Defaults to SMALL.                                                                                                                                        |
| - [peerClusters](#nifi_clusters_additionalProperties_peerClusters )                                                 | No      | array of string  | No         | -                                             | Other clusters within this module which will be provided SecurityGroup and Node remote access to this cluster.                                                                                  |
| - [policies](#nifi_clusters_additionalProperties_policies )                                                         | No      | array            | No         | -                                             | -                                                                                                                                                                                               |
| - [registryClients](#nifi_clusters_additionalProperties_registryClients )                                           | No      | object           | No         | In #/definitions/NamedNifiRegistryClientProps | -                                                                                                                                                                                               |
| - [remotePort](#nifi_clusters_additionalProperties_remotePort )                                                     | No      | number           | No         | -                                             | The port on which the cluster remote RAW interfaces will listen                                                                                                                                 |
| + [saml](#nifi_clusters_additionalProperties_saml )                                                                 | No      | object           | No         | In #/definitions/NifiSamlProps                | The configuration required to configure the Nifi cluster to use a SAML identity provider                                                                                                        |
| - [securityGroupEgressRules](#nifi_clusters_additionalProperties_securityGroupEgressRules )                         | No      | object           | No         | In #/definitions/MdaaSecurityGroupRuleProps   | Egress rules to be added to all Nifi cluster security groups.<br />These may also be specified globally.                                                                                        |
| - [securityGroupIngressIPv4s](#nifi_clusters_additionalProperties_securityGroupIngressIPv4s )                       | No      | array of string  | No         | -                                             | IPv4 CIDRs which will be provided ingress access to the Nifi cluster security group.<br />These may also be specified globally.                                                                 |
| - [securityGroupIngressSGs](#nifi_clusters_additionalProperties_securityGroupIngressSGs )                           | No      | array of string  | No         | -                                             | Security groups which will be provided ingress access to the Nifi cluster security group.<br />These may also be specified globally.                                                            |

##### <a name="nifi_clusters_additionalProperties_additionalEfsIngressSecurityGroupIds"></a>4.7.1.1. Property `root > nifi > clusters > additionalProperties > additionalEfsIngressSecurityGroupIds`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Security groups which will be provided ingress access to the Nifi cluster EFS security group.
These may also be specified globally.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                                              | Description |
| ---------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [additionalEfsIngressSecurityGroupIds items](#nifi_clusters_additionalProperties_additionalEfsIngressSecurityGroupIds_items) | -           |

###### <a name="autogenerated_heading_6"></a>4.7.1.1.1. root > nifi > clusters > additionalProperties > additionalEfsIngressSecurityGroupIds > additionalEfsIngressSecurityGroupIds items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="nifi_clusters_additionalProperties_adminIdentities"></a>4.7.1.2. Property `root > nifi > clusters > additionalProperties > adminIdentities`

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

| Each item of this array must be                                                    | Description |
| ---------------------------------------------------------------------------------- | ----------- |
| [adminIdentities items](#nifi_clusters_additionalProperties_adminIdentities_items) | -           |

###### <a name="autogenerated_heading_7"></a>4.7.1.2.1. root > nifi > clusters > additionalProperties > adminIdentities > adminIdentities items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="nifi_clusters_additionalProperties_authorizations"></a>4.7.1.3. Property `root > nifi > clusters > additionalProperties > authorizations`

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

| Each item of this array must be                                               | Description |
| ----------------------------------------------------------------------------- | ----------- |
| [NifiAuthorization](#nifi_clusters_additionalProperties_authorizations_items) | -           |

###### <a name="autogenerated_heading_8"></a>4.7.1.3.1. root > nifi > clusters > additionalProperties > authorizations > NifiAuthorization

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NifiAuthorization                         |

| Property                                                                                                   | Pattern | Type            | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| + [actions](#nifi_clusters_additionalProperties_authorizations_items_actions )                             | No      | array           | No         | -          | -                 |
| - [groups](#nifi_clusters_additionalProperties_authorizations_items_groups )                               | No      | array of string | No         | -          | -                 |
| - [identities](#nifi_clusters_additionalProperties_authorizations_items_identities )                       | No      | array of string | No         | -          | -                 |
| + [policyResourcePattern](#nifi_clusters_additionalProperties_authorizations_items_policyResourcePattern ) | No      | string          | No         | -          | -                 |

###### <a name="nifi_clusters_additionalProperties_authorizations_items_actions"></a>4.7.1.3.1.1. Property `root > nifi > clusters > additionalProperties > authorizations > authorizations items > actions`

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

| Each item of this array must be                                                        | Description |
| -------------------------------------------------------------------------------------- | ----------- |
| [PolicyAction](#nifi_clusters_additionalProperties_authorizations_items_actions_items) | -           |

###### <a name="autogenerated_heading_9"></a>4.7.1.3.1.1.1. root > nifi > clusters > additionalProperties > authorizations > authorizations items > actions > PolicyAction

|                |                            |
| -------------- | -------------------------- |
| **Type**       | `enum (of string)`         |
| **Required**   | No                         |
| **Defined in** | #/definitions/PolicyAction |

Must be one of:
* "DELETE"
* "READ"
* "WRITE"

###### <a name="nifi_clusters_additionalProperties_authorizations_items_groups"></a>4.7.1.3.1.2. Property `root > nifi > clusters > additionalProperties > authorizations > authorizations items > groups`

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

| Each item of this array must be                                                       | Description |
| ------------------------------------------------------------------------------------- | ----------- |
| [groups items](#nifi_clusters_additionalProperties_authorizations_items_groups_items) | -           |

###### <a name="autogenerated_heading_10"></a>4.7.1.3.1.2.1. root > nifi > clusters > additionalProperties > authorizations > authorizations items > groups > groups items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_clusters_additionalProperties_authorizations_items_identities"></a>4.7.1.3.1.3. Property `root > nifi > clusters > additionalProperties > authorizations > authorizations items > identities`

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

| Each item of this array must be                                                               | Description |
| --------------------------------------------------------------------------------------------- | ----------- |
| [identities items](#nifi_clusters_additionalProperties_authorizations_items_identities_items) | -           |

###### <a name="autogenerated_heading_11"></a>4.7.1.3.1.3.1. root > nifi > clusters > additionalProperties > authorizations > authorizations items > identities > identities items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_clusters_additionalProperties_authorizations_items_policyResourcePattern"></a>4.7.1.3.1.4. Property `root > nifi > clusters > additionalProperties > authorizations > authorizations items > policyResourcePattern`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="nifi_clusters_additionalProperties_clusterPort"></a>4.7.1.4. Property `root > nifi > clusters > additionalProperties > clusterPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The port on which the internal cluster communications will occur

##### <a name="nifi_clusters_additionalProperties_clusterRoleAwsManagedPolicies"></a>4.7.1.5. Property `root > nifi > clusters > additionalProperties > clusterRoleAwsManagedPolicies`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** AWS managed policies which will be granted to the Nifi cluster role for access to AWS services.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                 | Description |
| ----------------------------------------------------------------------------------------------- | ----------- |
| [AwsManagedPolicySpec](#nifi_clusters_additionalProperties_clusterRoleAwsManagedPolicies_items) | -           |

###### <a name="autogenerated_heading_12"></a>4.7.1.5.1. root > nifi > clusters > additionalProperties > clusterRoleAwsManagedPolicies > AwsManagedPolicySpec

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/AwsManagedPolicySpec                      |

| Property                                                                                                          | Pattern | Type   | Deprecated | Definition | Title/Description                                                          |
| ----------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------------------------------------------------- |
| + [policyName](#nifi_clusters_additionalProperties_clusterRoleAwsManagedPolicies_items_policyName )               | No      | string | No         | -          | Name of the AWS Managed Policy                                             |
| + [suppressionReason](#nifi_clusters_additionalProperties_clusterRoleAwsManagedPolicies_items_suppressionReason ) | No      | string | No         | -          | A suppression reason to be recorded in order to suppress AWSSolutions-IAM4 |

###### <a name="nifi_clusters_additionalProperties_clusterRoleAwsManagedPolicies_items_policyName"></a>4.7.1.5.1.1. Property `root > nifi > clusters > additionalProperties > clusterRoleAwsManagedPolicies > clusterRoleAwsManagedPolicies items > policyName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Name of the AWS Managed Policy

###### <a name="nifi_clusters_additionalProperties_clusterRoleAwsManagedPolicies_items_suppressionReason"></a>4.7.1.5.1.2. Property `root > nifi > clusters > additionalProperties > clusterRoleAwsManagedPolicies > clusterRoleAwsManagedPolicies items > suppressionReason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** A suppression reason to be recorded in order to suppress AWSSolutions-IAM4

##### <a name="nifi_clusters_additionalProperties_clusterRoleManagedPolicies"></a>4.7.1.6. Property `root > nifi > clusters > additionalProperties > clusterRoleManagedPolicies`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Customer managed policies which will be granted to the Nifi cluster role for access to AWS services.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                          | Description |
| -------------------------------------------------------------------------------------------------------- | ----------- |
| [clusterRoleManagedPolicies items](#nifi_clusters_additionalProperties_clusterRoleManagedPolicies_items) | -           |

###### <a name="autogenerated_heading_13"></a>4.7.1.6.1. root > nifi > clusters > additionalProperties > clusterRoleManagedPolicies > clusterRoleManagedPolicies items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="nifi_clusters_additionalProperties_externalNodeIdentities"></a>4.7.1.7. Property `root > nifi > clusters > additionalProperties > externalNodeIdentities`

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

| Each item of this array must be                                                                  | Description |
| ------------------------------------------------------------------------------------------------ | ----------- |
| [externalNodeIdentities items](#nifi_clusters_additionalProperties_externalNodeIdentities_items) | -           |

###### <a name="autogenerated_heading_14"></a>4.7.1.7.1. root > nifi > clusters > additionalProperties > externalNodeIdentities > externalNodeIdentities items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="nifi_clusters_additionalProperties_groups"></a>4.7.1.8. Property `root > nifi > clusters > additionalProperties > groups`

|                           |                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                            |
| **Required**              | No                                                                                                                                                  |
| **Additional properties** | [[Should-conform]](#nifi_clusters_additionalProperties_groups_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                               | Pattern | Type            | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [](#nifi_clusters_additionalProperties_groups_additionalProperties ) | No      | array of string | No         | -          | -                 |

###### <a name="nifi_clusters_additionalProperties_groups_additionalProperties"></a>4.7.1.8.1. Property `root > nifi > clusters > additionalProperties > groups > additionalProperties`

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

| Each item of this array must be                                                                     | Description |
| --------------------------------------------------------------------------------------------------- | ----------- |
| [additionalProperties items](#nifi_clusters_additionalProperties_groups_additionalProperties_items) | -           |

###### <a name="autogenerated_heading_15"></a>4.7.1.8.1.1. root > nifi > clusters > additionalProperties > groups > additionalProperties > additionalProperties items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="nifi_clusters_additionalProperties_httpsPort"></a>4.7.1.9. Property `root > nifi > clusters > additionalProperties > httpsPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The port on which the cluster HTTPS interfaces will listen

##### <a name="nifi_clusters_additionalProperties_identities"></a>4.7.1.10. Property `root > nifi > clusters > additionalProperties > identities`

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

| Each item of this array must be                                          | Description |
| ------------------------------------------------------------------------ | ----------- |
| [identities items](#nifi_clusters_additionalProperties_identities_items) | -           |

###### <a name="autogenerated_heading_16"></a>4.7.1.10.1. root > nifi > clusters > additionalProperties > identities > identities items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="nifi_clusters_additionalProperties_nifiImageTag"></a>4.7.1.11. Property `root > nifi > clusters > additionalProperties > nifiImageTag`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The tag of the Nifi docker image to use. If not specified,
defaults to the latest tested version (currently 1.25.0). Specify 'latest' to pull
the latest version (might be untested).

##### <a name="nifi_clusters_additionalProperties_nodeCount"></a>4.7.1.12. Property `root > nifi > clusters > additionalProperties > nodeCount`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Initial number of nodes in the cluster.
Defaults to 1.

##### <a name="nifi_clusters_additionalProperties_nodeSize"></a>4.7.1.13. Property `root > nifi > clusters > additionalProperties > nodeSize`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

**Description:** Size of the Nifi cluster nodes. 
Defaults to SMALL.

Must be one of:
* "2XLARGE"
* "LARGE"
* "MEDIUM"
* "SMALL"
* "XLARGE"

##### <a name="nifi_clusters_additionalProperties_peerClusters"></a>4.7.1.14. Property `root > nifi > clusters > additionalProperties > peerClusters`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Other clusters within this module which will be provided SecurityGroup and Node remote access to this cluster.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                              | Description |
| ---------------------------------------------------------------------------- | ----------- |
| [peerClusters items](#nifi_clusters_additionalProperties_peerClusters_items) | -           |

###### <a name="autogenerated_heading_17"></a>4.7.1.14.1. root > nifi > clusters > additionalProperties > peerClusters > peerClusters items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="nifi_clusters_additionalProperties_policies"></a>4.7.1.15. Property `root > nifi > clusters > additionalProperties > policies`

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

| Each item of this array must be                                  | Description |
| ---------------------------------------------------------------- | ----------- |
| [NifiPolicy](#nifi_clusters_additionalProperties_policies_items) | -           |

###### <a name="autogenerated_heading_18"></a>4.7.1.15.1. root > nifi > clusters > additionalProperties > policies > NifiPolicy

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NifiPolicy                                |

| Property                                                                   | Pattern | Type             | Deprecated | Definition                                                                                                                                               | Title/Description |
| -------------------------------------------------------------------------- | ------- | ---------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| + [action](#nifi_clusters_additionalProperties_policies_items_action )     | No      | enum (of string) | No         | Same as [nifi_clusters_additionalProperties_authorizations_items_actions_items](#nifi_clusters_additionalProperties_authorizations_items_actions_items ) | -                 |
| + [resource](#nifi_clusters_additionalProperties_policies_items_resource ) | No      | string           | No         | -                                                                                                                                                        | -                 |

###### <a name="nifi_clusters_additionalProperties_policies_items_action"></a>4.7.1.15.1.1. Property `root > nifi > clusters > additionalProperties > policies > policies items > action`

|                        |                                                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**               | `enum (of string)`                                                                                                                              |
| **Required**           | Yes                                                                                                                                             |
| **Same definition as** | [nifi_clusters_additionalProperties_authorizations_items_actions_items](#nifi_clusters_additionalProperties_authorizations_items_actions_items) |

###### <a name="nifi_clusters_additionalProperties_policies_items_resource"></a>4.7.1.15.1.2. Property `root > nifi > clusters > additionalProperties > policies > policies items > resource`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="nifi_clusters_additionalProperties_registryClients"></a>4.7.1.16. Property `root > nifi > clusters > additionalProperties > registryClients`

|                           |                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                     |
| **Required**              | No                                                                                                                                                           |
| **Additional properties** | [[Should-conform]](#nifi_clusters_additionalProperties_registryClients_additionalProperties "Each additional property must conform to the following schema") |
| **Defined in**            | #/definitions/NamedNifiRegistryClientProps                                                                                                                   |

| Property                                                                        | Pattern | Type   | Deprecated | Definition                               | Title/Description |
| ------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------------------------------------- | ----------------- |
| - [](#nifi_clusters_additionalProperties_registryClients_additionalProperties ) | No      | object | No         | In #/definitions/NifiRegistryClientProps | -                 |

###### <a name="nifi_clusters_additionalProperties_registryClients_additionalProperties"></a>4.7.1.16.1. Property `root > nifi > clusters > additionalProperties > registryClients > NifiRegistryClientProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NifiRegistryClientProps                   |

| Property                                                                               | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [url](#nifi_clusters_additionalProperties_registryClients_additionalProperties_url ) | No      | string | No         | -          | -                 |

###### <a name="nifi_clusters_additionalProperties_registryClients_additionalProperties_url"></a>4.7.1.16.1.1. Property `root > nifi > clusters > additionalProperties > registryClients > additionalProperties > url`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="nifi_clusters_additionalProperties_remotePort"></a>4.7.1.17. Property `root > nifi > clusters > additionalProperties > remotePort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The port on which the cluster remote RAW interfaces will listen

##### <a name="nifi_clusters_additionalProperties_saml"></a>4.7.1.18. Property `root > nifi > clusters > additionalProperties > saml`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NifiSamlProps                             |

**Description:** The configuration required to configure the Nifi cluster to use a SAML identity provider

| Property                                                                     | Pattern | Type   | Deprecated | Definition | Title/Description                                  |
| ---------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------------------------- |
| + [idpMetadataUrl](#nifi_clusters_additionalProperties_saml_idpMetadataUrl ) | No      | string | No         | -          | URL from which the IDP SAML Metadata is available. |

###### <a name="nifi_clusters_additionalProperties_saml_idpMetadataUrl"></a>4.7.1.18.1. Property `root > nifi > clusters > additionalProperties > saml > idpMetadataUrl`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** URL from which the IDP SAML Metadata is available.

##### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules"></a>4.7.1.19. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaSecurityGroupRuleProps                |

**Description:** Egress rules to be added to all Nifi cluster security groups.
These may also be specified globally.

| Property                                                                                 | Pattern | Type  | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------------------- | ------- | ----- | ---------- | ---------- | ----------------- |
| - [ipv4](#nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4 )             | No      | array | No         | -          | -                 |
| - [prefixList](#nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList ) | No      | array | No         | -          | -                 |
| - [sg](#nifi_clusters_additionalProperties_securityGroupEgressRules_sg )                 | No      | array | No         | -          | -                 |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4"></a>4.7.1.19.1. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > ipv4`

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

| Each item of this array must be                                                         | Description |
| --------------------------------------------------------------------------------------- | ----------- |
| [MdaaCidrPeer](#nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items) | -           |

###### <a name="autogenerated_heading_19"></a>4.7.1.19.1.1. root > nifi > clusters > additionalProperties > securityGroupEgressRules > ipv4 > MdaaCidrPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaCidrPeer                              |

| Property                                                                                                | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [cidr](#nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_cidr )                 | No      | string | No         | -          | -                 |
| - [description](#nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_description )   | No      | string | No         | -          | -                 |
| - [port](#nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_port )                 | No      | number | No         | -          | -                 |
| + [protocol](#nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_protocol )         | No      | string | No         | -          | -                 |
| - [suppressions](#nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_cidr"></a>4.7.1.19.1.1.1. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > cidr`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_description"></a>4.7.1.19.1.1.2. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_port"></a>4.7.1.19.1.1.3. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_protocol"></a>4.7.1.19.1.1.4. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions"></a>4.7.1.19.1.1.5. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > suppressions`

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
| [NagSuppressionProps](#nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_20"></a>4.7.1.19.1.1.5.1. root > nifi > clusters > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > suppressions > NagSuppressionProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NagSuppressionProps                       |

| Property                                                                                                       | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items_id"></a>4.7.1.19.1.1.5.1.1. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items_reason"></a>4.7.1.19.1.1.5.1.2. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_toPort"></a>4.7.1.19.1.1.6. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > ipv4 > ipv4 items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList"></a>4.7.1.19.2. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > prefixList`

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

| Each item of this array must be                                                                     | Description |
| --------------------------------------------------------------------------------------------------- | ----------- |
| [MdaaPrefixListPeer](#nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList_items) | -           |

###### <a name="autogenerated_heading_21"></a>4.7.1.19.2.1. root > nifi > clusters > additionalProperties > securityGroupEgressRules > prefixList > MdaaPrefixListPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaPrefixListPeer                        |

| Property                                                                                                      | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList_items_description )   | No      | string | No         | -          | -                 |
| - [port](#nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList_items_port )                 | No      | number | No         | -          | -                 |
| + [prefixList](#nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList_items_prefixList )     | No      | string | No         | -          | -                 |
| + [protocol](#nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList_items_protocol )         | No      | string | No         | -          | -                 |
| - [suppressions](#nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList_items_description"></a>4.7.1.19.2.1.1. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > prefixList > prefixList items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList_items_port"></a>4.7.1.19.2.1.2. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > prefixList > prefixList items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList_items_prefixList"></a>4.7.1.19.2.1.3. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > prefixList > prefixList items > prefixList`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList_items_protocol"></a>4.7.1.19.2.1.4. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > prefixList > prefixList items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList_items_suppressions"></a>4.7.1.19.2.1.5. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > prefixList > prefixList items > suppressions`

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

| Each item of this array must be                                                                                         | Description |
| ----------------------------------------------------------------------------------------------------------------------- | ----------- |
| [NagSuppressionProps](#nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_22"></a>4.7.1.19.2.1.5.1. root > nifi > clusters > additionalProperties > securityGroupEgressRules > prefixList > prefixList items > suppressions > NagSuppressionProps

|                           |                                                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                |
| **Required**              | No                                                                                                                                                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                                 |
| **Same definition as**    | [nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items](#nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items) |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_prefixList_items_toPort"></a>4.7.1.19.2.1.6. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > prefixList > prefixList items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_sg"></a>4.7.1.19.3. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > sg`

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

| Each item of this array must be                                                                | Description |
| ---------------------------------------------------------------------------------------------- | ----------- |
| [MdaaSecurityGroupPeer](#nifi_clusters_additionalProperties_securityGroupEgressRules_sg_items) | -           |

###### <a name="autogenerated_heading_23"></a>4.7.1.19.3.1. root > nifi > clusters > additionalProperties > securityGroupEgressRules > sg > MdaaSecurityGroupPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaSecurityGroupPeer                     |

| Property                                                                                              | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#nifi_clusters_additionalProperties_securityGroupEgressRules_sg_items_description )   | No      | string | No         | -          | -                 |
| - [port](#nifi_clusters_additionalProperties_securityGroupEgressRules_sg_items_port )                 | No      | number | No         | -          | -                 |
| + [protocol](#nifi_clusters_additionalProperties_securityGroupEgressRules_sg_items_protocol )         | No      | string | No         | -          | -                 |
| + [sgId](#nifi_clusters_additionalProperties_securityGroupEgressRules_sg_items_sgId )                 | No      | string | No         | -          | -                 |
| - [suppressions](#nifi_clusters_additionalProperties_securityGroupEgressRules_sg_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#nifi_clusters_additionalProperties_securityGroupEgressRules_sg_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_sg_items_description"></a>4.7.1.19.3.1.1. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > sg > sg items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_sg_items_port"></a>4.7.1.19.3.1.2. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > sg > sg items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_sg_items_protocol"></a>4.7.1.19.3.1.3. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > sg > sg items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_sg_items_sgId"></a>4.7.1.19.3.1.4. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > sg > sg items > sgId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_sg_items_suppressions"></a>4.7.1.19.3.1.5. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > sg > sg items > suppressions`

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

| Each item of this array must be                                                                                 | Description |
| --------------------------------------------------------------------------------------------------------------- | ----------- |
| [NagSuppressionProps](#nifi_clusters_additionalProperties_securityGroupEgressRules_sg_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_24"></a>4.7.1.19.3.1.5.1. root > nifi > clusters > additionalProperties > securityGroupEgressRules > sg > sg items > suppressions > NagSuppressionProps

|                           |                                                                                                                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                |
| **Required**              | No                                                                                                                                                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                                                                 |
| **Same definition as**    | [nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items](#nifi_clusters_additionalProperties_securityGroupEgressRules_ipv4_items_suppressions_items) |

###### <a name="nifi_clusters_additionalProperties_securityGroupEgressRules_sg_items_toPort"></a>4.7.1.19.3.1.6. Property `root > nifi > clusters > additionalProperties > securityGroupEgressRules > sg > sg items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

##### <a name="nifi_clusters_additionalProperties_securityGroupIngressIPv4s"></a>4.7.1.20. Property `root > nifi > clusters > additionalProperties > securityGroupIngressIPv4s`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** IPv4 CIDRs which will be provided ingress access to the Nifi cluster security group.
These may also be specified globally.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                        | Description |
| ------------------------------------------------------------------------------------------------------ | ----------- |
| [securityGroupIngressIPv4s items](#nifi_clusters_additionalProperties_securityGroupIngressIPv4s_items) | -           |

###### <a name="autogenerated_heading_25"></a>4.7.1.20.1. root > nifi > clusters > additionalProperties > securityGroupIngressIPv4s > securityGroupIngressIPv4s items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="nifi_clusters_additionalProperties_securityGroupIngressSGs"></a>4.7.1.21. Property `root > nifi > clusters > additionalProperties > securityGroupIngressSGs`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Security groups which will be provided ingress access to the Nifi cluster security group.
These may also be specified globally.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                    | Description |
| -------------------------------------------------------------------------------------------------- | ----------- |
| [securityGroupIngressSGs items](#nifi_clusters_additionalProperties_securityGroupIngressSGs_items) | -           |

###### <a name="autogenerated_heading_26"></a>4.7.1.21.1. root > nifi > clusters > additionalProperties > securityGroupIngressSGs > securityGroupIngressSGs items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="nifi_eksSecurityGroupIngressRules"></a>4.8. Property `root > nifi > eksSecurityGroupIngressRules`

|                           |                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                 |
| **Required**              | No                                                                                       |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                  |
| **Same definition as**    | [securityGroupEgressRules](#nifi_clusters_additionalProperties_securityGroupEgressRules) |

**Description:** Ingress rules to be added to the EKS control plane security group

### <a name="nifi_existingPrivateCaArn"></a>4.9. Property `root > nifi > existingPrivateCaArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** (Optional) If specified, this ACM Private CA will be used to sign the internal CA running
within EKS. If not specified, an ACM Private CA will be created.

### <a name="nifi_mgmtInstance"></a>4.10. Property `root > nifi > mgmtInstance`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MgmtInstanceProps                         |

**Description:** If defined, an EC2 instance will be created with connectivity, permissions, and tooling to manage the EKS cluster

| Property                                                           | Pattern | Type            | Deprecated | Definition                    | Title/Description                                                                                                                                |
| ------------------------------------------------------------------ | ------- | --------------- | ---------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| + [availabilityZone](#nifi_mgmtInstance_availabilityZone )         | No      | string          | No         | -                             | -                                                                                                                                                |
| - [instanceType](#nifi_mgmtInstance_instanceType )                 | No      | object          | No         | In #/definitions/InstanceType | Instance type for EC2 instances<br /><br />This class takes a literal string, good if you already<br />know the identifier of the type you want. |
| - [keyPairName](#nifi_mgmtInstance_keyPairName )                   | No      | string          | No         | -                             | -                                                                                                                                                |
| - [mgmtPolicyStatements](#nifi_mgmtInstance_mgmtPolicyStatements ) | No      | array           | No         | -                             | -                                                                                                                                                |
| + [subnetId](#nifi_mgmtInstance_subnetId )                         | No      | string          | No         | -                             | -                                                                                                                                                |
| - [userDataCommands](#nifi_mgmtInstance_userDataCommands )         | No      | array of string | No         | -                             | -                                                                                                                                                |

#### <a name="nifi_mgmtInstance_availabilityZone"></a>4.10.1. Property `root > nifi > mgmtInstance > availabilityZone`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="nifi_mgmtInstance_instanceType"></a>4.10.2. Property `root > nifi > mgmtInstance > instanceType`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/InstanceType                              |

**Description:** Instance type for EC2 instances

This class takes a literal string, good if you already
know the identifier of the type you want.

| Property                                                                            | Pattern | Type             | Deprecated | Definition                            | Title/Description               |
| ----------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | ------------------------------------- | ------------------------------- |
| + [architecture](#nifi_mgmtInstance_instanceType_architecture )                     | No      | enum (of string) | No         | In #/definitions/InstanceArchitecture | The instance's CPU architecture |
| + [instanceTypeIdentifier](#nifi_mgmtInstance_instanceType_instanceTypeIdentifier ) | No      | object           | No         | -                                     | -                               |

##### <a name="nifi_mgmtInstance_instanceType_architecture"></a>4.10.2.1. Property `root > nifi > mgmtInstance > instanceType > architecture`

|                |                                    |
| -------------- | ---------------------------------- |
| **Type**       | `enum (of string)`                 |
| **Required**   | Yes                                |
| **Defined in** | #/definitions/InstanceArchitecture |

**Description:** The instance's CPU architecture

Must be one of:
* "arm64"
* "x86_64"

##### <a name="nifi_mgmtInstance_instanceType_instanceTypeIdentifier"></a>4.10.2.2. Property `root > nifi > mgmtInstance > instanceType > instanceTypeIdentifier`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

#### <a name="nifi_mgmtInstance_keyPairName"></a>4.10.3. Property `root > nifi > mgmtInstance > keyPairName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="nifi_mgmtInstance_mgmtPolicyStatements"></a>4.10.4. Property `root > nifi > mgmtInstance > mgmtPolicyStatements`

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

| Each item of this array must be                                  | Description                                       |
| ---------------------------------------------------------------- | ------------------------------------------------- |
| [PolicyStatement](#nifi_mgmtInstance_mgmtPolicyStatements_items) | Represents a statement in an IAM policy document. |

##### <a name="autogenerated_heading_27"></a>4.10.4.1. root > nifi > mgmtInstance > mgmtPolicyStatements > PolicyStatement

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/PolicyStatement                           |

**Description:** Represents a statement in an IAM policy document.

| Property                                                                                            | Pattern | Type             | Deprecated | Definition              | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [_action](#nifi_mgmtInstance_mgmtPolicyStatements_items__action )                                 | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [_condition](#nifi_mgmtInstance_mgmtPolicyStatements_items__condition )                           | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [_effect](#nifi_mgmtInstance_mgmtPolicyStatements_items__effect )                                 | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [_frozen](#nifi_mgmtInstance_mgmtPolicyStatements_items__frozen )                                 | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [_notAction](#nifi_mgmtInstance_mgmtPolicyStatements_items__notAction )                           | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [_notPrincipal](#nifi_mgmtInstance_mgmtPolicyStatements_items__notPrincipal )                     | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [_notPrincipals](#nifi_mgmtInstance_mgmtPolicyStatements_items__notPrincipals )                   | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [_notResource](#nifi_mgmtInstance_mgmtPolicyStatements_items__notResource )                       | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [_principal](#nifi_mgmtInstance_mgmtPolicyStatements_items__principal )                           | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [_principals](#nifi_mgmtInstance_mgmtPolicyStatements_items__principals )                         | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [_resource](#nifi_mgmtInstance_mgmtPolicyStatements_items__resource )                             | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| - [_sid](#nifi_mgmtInstance_mgmtPolicyStatements_items__sid )                                       | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [actions](#nifi_mgmtInstance_mgmtPolicyStatements_items_actions )                                 | No      | array of string  | No         | -                       | The Actions added to this statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| + [addPrincipalConditions](#nifi_mgmtInstance_mgmtPolicyStatements_items_addPrincipalConditions )   | No      | object           | No         | -                       | Add a principal's conditions<br /><br />For convenience, principals have been modeled as both a principal<br />and a set of conditions. This makes it possible to have a single<br />object represent e.g. an "SNS Topic" (SNS service principal + aws:SourcArn<br />condition) or an Organization member (* + aws:OrgId condition).<br /><br />However, when using multiple principals in the same policy statement,<br />they must all have the same conditions or the OR samentics<br />implied by a list of principals cannot be guaranteed (user needs to<br />add multiple statements in that case). |
| + [assertNotFrozen](#nifi_mgmtInstance_mgmtPolicyStatements_items_assertNotFrozen )                 | No      | object           | No         | -                       | Throw an exception when the object is frozen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| + [conditions](#nifi_mgmtInstance_mgmtPolicyStatements_items_conditions )                           | No      | object           | No         | -                       | The conditions added to this statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| + [effect](#nifi_mgmtInstance_mgmtPolicyStatements_items_effect )                                   | No      | enum (of string) | No         | In #/definitions/Effect | Whether to allow or deny the actions in this statement<br />Set effect for this statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [frozen](#nifi_mgmtInstance_mgmtPolicyStatements_items_frozen )                                   | No      | boolean          | No         | -                       | Whether the PolicyStatement has been frozen<br /><br />The statement object is frozen when \`freeze()\` is called.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| + [hasPrincipal](#nifi_mgmtInstance_mgmtPolicyStatements_items_hasPrincipal )                       | No      | boolean          | No         | -                       | Indicates if this permission has a "Principal" section.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| + [hasResource](#nifi_mgmtInstance_mgmtPolicyStatements_items_hasResource )                         | No      | boolean          | No         | -                       | Indicates if this permission has at least one resource associated with it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| + [notActions](#nifi_mgmtInstance_mgmtPolicyStatements_items_notActions )                           | No      | array of string  | No         | -                       | The NotActions added to this statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| + [notPrincipals](#nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals )                     | No      | array            | No         | -                       | The NotPrincipals added to this statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| + [notResources](#nifi_mgmtInstance_mgmtPolicyStatements_items_notResources )                       | No      | array of string  | No         | -                       | The NotResources added to this statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| - [principalConditionsJson](#nifi_mgmtInstance_mgmtPolicyStatements_items_principalConditionsJson ) | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [principals](#nifi_mgmtInstance_mgmtPolicyStatements_items_principals )                           | No      | array            | No         | -                       | The Principals added to this statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| + [resources](#nifi_mgmtInstance_mgmtPolicyStatements_items_resources )                             | No      | array of string  | No         | -                       | The Resources added to this statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| - [sid](#nifi_mgmtInstance_mgmtPolicyStatements_items_sid )                                         | No      | string           | No         | -                       | Statement ID for this statement<br />Set Statement ID for this statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| + [validatePolicyActions](#nifi_mgmtInstance_mgmtPolicyStatements_items_validatePolicyActions )     | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| + [validatePolicyPrincipal](#nifi_mgmtInstance_mgmtPolicyStatements_items_validatePolicyPrincipal ) | No      | object           | No         | -                       | -                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items__action"></a>4.10.4.1.1. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > _action`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items__condition"></a>4.10.4.1.2. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > _condition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items__effect"></a>4.10.4.1.3. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > _effect`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items__frozen"></a>4.10.4.1.4. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > _frozen`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items__notAction"></a>4.10.4.1.5. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > _notAction`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items__notPrincipal"></a>4.10.4.1.6. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > _notPrincipal`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items__notPrincipals"></a>4.10.4.1.7. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > _notPrincipals`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items__notResource"></a>4.10.4.1.8. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > _notResource`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items__principal"></a>4.10.4.1.9. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > _principal`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items__principals"></a>4.10.4.1.10. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > _principals`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items__resource"></a>4.10.4.1.11. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > _resource`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items__sid"></a>4.10.4.1.12. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > _sid`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_actions"></a>4.10.4.1.13. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > actions`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The Actions added to this statement

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                              | Description |
| ---------------------------------------------------------------------------- | ----------- |
| [actions items](#nifi_mgmtInstance_mgmtPolicyStatements_items_actions_items) | -           |

###### <a name="autogenerated_heading_28"></a>4.10.4.1.13.1. root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > actions > actions items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_addPrincipalConditions"></a>4.10.4.1.14. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > addPrincipalConditions`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Add a principal's conditions

For convenience, principals have been modeled as both a principal
and a set of conditions. This makes it possible to have a single
object represent e.g. an "SNS Topic" (SNS service principal + aws:SourcArn
condition) or an Organization member (* + aws:OrgId condition).

However, when using multiple principals in the same policy statement,
they must all have the same conditions or the OR samentics
implied by a list of principals cannot be guaranteed (user needs to
add multiple statements in that case).

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_assertNotFrozen"></a>4.10.4.1.15. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > assertNotFrozen`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Throw an exception when the object is frozen

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_conditions"></a>4.10.4.1.16. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > conditions`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** The conditions added to this statement

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_effect"></a>4.10.4.1.17. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > effect`

|                |                      |
| -------------- | -------------------- |
| **Type**       | `enum (of string)`   |
| **Required**   | Yes                  |
| **Defined in** | #/definitions/Effect |

**Description:** Whether to allow or deny the actions in this statement
Set effect for this statement

Must be one of:
* "Allow"
* "Deny"

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_frozen"></a>4.10.4.1.18. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > frozen`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Whether the PolicyStatement has been frozen

The statement object is frozen when `freeze()` is called.

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_hasPrincipal"></a>4.10.4.1.19. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > hasPrincipal`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Indicates if this permission has a "Principal" section.

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_hasResource"></a>4.10.4.1.20. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > hasResource`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Indicates if this permission has at least one resource associated with it.

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_notActions"></a>4.10.4.1.21. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > notActions`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The NotActions added to this statement

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                    | Description |
| ---------------------------------------------------------------------------------- | ----------- |
| [notActions items](#nifi_mgmtInstance_mgmtPolicyStatements_items_notActions_items) | -           |

###### <a name="autogenerated_heading_29"></a>4.10.4.1.21.1. root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > notActions > notActions items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals"></a>4.10.4.1.22. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > notPrincipals`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** The NotPrincipals added to this statement

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                 | Description                             |
| ------------------------------------------------------------------------------- | --------------------------------------- |
| [IPrincipal](#nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items) | Represents a logical IAM principal. ... |

###### <a name="autogenerated_heading_30"></a>4.10.4.1.22.1. root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > notPrincipals > IPrincipal

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/IPrincipal                                |

**Description:** Represents a logical IAM principal.

An IPrincipal describes a logical entity that can perform AWS API calls
against sets of resources, optionally under certain conditions.

Examples of simple principals are IAM objects that you create, such
as Users or Roles.

An example of a more complex principals is a `ServicePrincipal` (such as
`new ServicePrincipal("sns.amazonaws.com")`, which represents the Simple
Notifications Service).

A single logical Principal may also map to a set of physical principals.
For example, `new OrganizationPrincipal('o-1234')` represents all
identities that are part of the given AWS Organization.

| Property                                                                                                  | Pattern | Type   | Deprecated | Definition                                                                                                                                     | Title/Description                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [assumeRoleAction](#nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_assumeRoleAction ) | No      | string | No         | -                                                                                                                                              | When this Principal is used in an AssumeRole policy, the action to use.                                                                                                                                           |
| + [grantPrincipal](#nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_grantPrincipal )     | No      | object | No         | Same as [nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items](#nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items ) | The principal to grant permissions to                                                                                                                                                                             |
| + [policyFragment](#nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_policyFragment )     | No      | object | No         | In #/definitions/PrincipalPolicyFragment                                                                                                       | Return the policy fragment that identifies this principal in a Policy.                                                                                                                                            |
| - [principalAccount](#nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_principalAccount ) | No      | string | No         | -                                                                                                                                              | The AWS account ID of this principal.<br />Can be undefined when the account is not known<br />(for example, for service principals).<br />Can be a Token - in that case,<br />it's assumed to be AWS::AccountId. |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_assumeRoleAction"></a>4.10.4.1.22.1.1. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > notPrincipals > notPrincipals items > assumeRoleAction`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** When this Principal is used in an AssumeRole policy, the action to use.

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_grantPrincipal"></a>4.10.4.1.22.1.2. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > notPrincipals > notPrincipals items > grantPrincipal`

|                           |                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                              |
| **Required**              | Yes                                                                                                                                   |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                               |
| **Same definition as**    | [nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items](#nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items) |

**Description:** The principal to grant permissions to

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_policyFragment"></a>4.10.4.1.22.1.3. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > notPrincipals > notPrincipals items > policyFragment`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/PrincipalPolicyFragment                   |

**Description:** Return the policy fragment that identifies this principal in a Policy.

| Property                                                                                                           | Pattern | Type   | Deprecated | Definition                  | Title/Description                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------ | ------- | ------ | ---------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [conditions](#nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_policyFragment_conditions )       | No      | object | No         | In #/definitions/Conditions | The conditions under which the policy is in effect.<br />See [the IAM documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition.html). |
| + [principalJson](#nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_policyFragment_principalJson ) | No      | object | No         | -                           | -                                                                                                                                                                                  |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_policyFragment_conditions"></a>4.10.4.1.22.1.3.1. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > notPrincipals > notPrincipals items > policyFragment > conditions`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/Conditions                                                  |

**Description:** The conditions under which the policy is in effect.
See [the IAM documentation](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition.html).

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_policyFragment_principalJson"></a>4.10.4.1.22.1.3.2. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > notPrincipals > notPrincipals items > policyFragment > principalJson`

|                           |                                                                                                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                                                                                |
| **Required**              | Yes                                                                                                                                                                                                     |
| **Additional properties** | [[Should-conform]](#nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_policyFragment_principalJson_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                                   | Pattern | Type            | Deprecated | Definition | Title/Description |
| -------------------------------------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [](#nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_policyFragment_principalJson_additionalProperties ) | No      | array of string | No         | -          | -                 |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_policyFragment_principalJson_additionalProperties"></a>4.10.4.1.22.1.3.2.1. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > notPrincipals > notPrincipals items > policyFragment > principalJson > additionalProperties`

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

| Each item of this array must be                                                                                                                         | Description |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [additionalProperties items](#nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_policyFragment_principalJson_additionalProperties_items) | -           |

###### <a name="autogenerated_heading_31"></a>4.10.4.1.22.1.3.2.1.1. root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > notPrincipals > notPrincipals items > policyFragment > principalJson > additionalProperties > additionalProperties items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items_principalAccount"></a>4.10.4.1.22.1.4. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > notPrincipals > notPrincipals items > principalAccount`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The AWS account ID of this principal.
Can be undefined when the account is not known
(for example, for service principals).
Can be a Token - in that case,
it's assumed to be AWS::AccountId.

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_notResources"></a>4.10.4.1.23. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > notResources`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The NotResources added to this statement

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                        | Description |
| -------------------------------------------------------------------------------------- | ----------- |
| [notResources items](#nifi_mgmtInstance_mgmtPolicyStatements_items_notResources_items) | -           |

###### <a name="autogenerated_heading_32"></a>4.10.4.1.23.1. root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > notResources > notResources items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_principalConditionsJson"></a>4.10.4.1.24. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > principalConditionsJson`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_principals"></a>4.10.4.1.25. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > principals`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** The Principals added to this statement

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                              | Description                             |
| ---------------------------------------------------------------------------- | --------------------------------------- |
| [IPrincipal](#nifi_mgmtInstance_mgmtPolicyStatements_items_principals_items) | Represents a logical IAM principal. ... |

###### <a name="autogenerated_heading_33"></a>4.10.4.1.25.1. root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > principals > IPrincipal

|                           |                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                              |
| **Required**              | No                                                                                                                                    |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                               |
| **Same definition as**    | [nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items](#nifi_mgmtInstance_mgmtPolicyStatements_items_notPrincipals_items) |

**Description:** Represents a logical IAM principal.

An IPrincipal describes a logical entity that can perform AWS API calls
against sets of resources, optionally under certain conditions.

Examples of simple principals are IAM objects that you create, such
as Users or Roles.

An example of a more complex principals is a `ServicePrincipal` (such as
`new ServicePrincipal("sns.amazonaws.com")`, which represents the Simple
Notifications Service).

A single logical Principal may also map to a set of physical principals.
For example, `new OrganizationPrincipal('o-1234')` represents all
identities that are part of the given AWS Organization.

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_resources"></a>4.10.4.1.26. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > resources`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The Resources added to this statement

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                  | Description |
| -------------------------------------------------------------------------------- | ----------- |
| [resources items](#nifi_mgmtInstance_mgmtPolicyStatements_items_resources_items) | -           |

###### <a name="autogenerated_heading_34"></a>4.10.4.1.26.1. root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > resources > resources items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_sid"></a>4.10.4.1.27. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > sid`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Statement ID for this statement
Set Statement ID for this statement

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_validatePolicyActions"></a>4.10.4.1.28. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > validatePolicyActions`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

###### <a name="nifi_mgmtInstance_mgmtPolicyStatements_items_validatePolicyPrincipal"></a>4.10.4.1.29. Property `root > nifi > mgmtInstance > mgmtPolicyStatements > mgmtPolicyStatements items > validatePolicyPrincipal`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

#### <a name="nifi_mgmtInstance_subnetId"></a>4.10.5. Property `root > nifi > mgmtInstance > subnetId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

#### <a name="nifi_mgmtInstance_userDataCommands"></a>4.10.6. Property `root > nifi > mgmtInstance > userDataCommands`

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

| Each item of this array must be                                     | Description |
| ------------------------------------------------------------------- | ----------- |
| [userDataCommands items](#nifi_mgmtInstance_userDataCommands_items) | -           |

##### <a name="autogenerated_heading_35"></a>4.10.6.1. root > nifi > mgmtInstance > userDataCommands > userDataCommands items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="nifi_nodeCertDuration"></a>4.11. Property `root > nifi > nodeCertDuration`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The certificate validity period for the Zookeeper and Nifi Node certs. If using an ACM Private CA with short-term certificates,
this should be set to less than 6 days. Defaults to 5 days.

### <a name="nifi_nodeCertRenewBefore"></a>4.12. Property `root > nifi > nodeCertRenewBefore`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The time before CA cert expiration at which point the Zookeeper and Nifi Node certs will be renewed.
Defaults to 12 hours.

### <a name="nifi_registry"></a>4.13. Property `root > nifi > registry`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NifiRegistryProps                         |

| Property                                                                                       | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [additionalEfsIngressSecurityGroupIds](#nifi_registry_additionalEfsIngressSecurityGroupIds ) | No      | array of string | No         | -          | Security groups which will be provided ingress access to the Nifi cluster EFS security group.<br />These may also be specified globally.                                                        |
| + [adminIdentities](#nifi_registry_adminIdentities )                                           | No      | array of string | No         | -          | -                                                                                                                                                                                               |
| - [authorizations](#nifi_registry_authorizations )                                             | No      | array           | No         | -          | -                                                                                                                                                                                               |
| - [buckets](#nifi_registry_buckets )                                                           | No      | object          | No         | -          | -                                                                                                                                                                                               |
| - [externalNodeIdentities](#nifi_registry_externalNodeIdentities )                             | No      | array of string | No         | -          | -                                                                                                                                                                                               |
| - [groups](#nifi_registry_groups )                                                             | No      | object          | No         | -          | -                                                                                                                                                                                               |
| - [httpsPort](#nifi_registry_httpsPort )                                                       | No      | number          | No         | -          | The port on which the cluster HTTPS interfaces will listen                                                                                                                                      |
| - [identities](#nifi_registry_identities )                                                     | No      | array of string | No         | -          | -                                                                                                                                                                                               |
| - [policies](#nifi_registry_policies )                                                         | No      | array           | No         | -          | -                                                                                                                                                                                               |
| - [registryImageTag](#nifi_registry_registryImageTag )                                         | No      | string          | No         | -          | The tag of the Nifi docker image to use. If not specified,<br />defaults to the latest tested version (currently 1.25.0). Specify 'latest' to pull<br />the latest version (might be untested). |
| - [registryRoleAwsManagedPolicies](#nifi_registry_registryRoleAwsManagedPolicies )             | No      | array           | No         | -          | AWS managed policies which will be granted to the Nifi cluster role for access to AWS services.                                                                                                 |
| - [registryRoleManagedPolicies](#nifi_registry_registryRoleManagedPolicies )                   | No      | array of string | No         | -          | Customer managed policies which will be granted to the Nifi cluster role for access to AWS services.                                                                                            |
| - [securityGroupIngressIPv4s](#nifi_registry_securityGroupIngressIPv4s )                       | No      | array of string | No         | -          | IPv4 CIDRs which will be provided ingress access to the Nifi cluster security group.<br />These may also be specified globally.                                                                 |
| - [securityGroupIngressSGs](#nifi_registry_securityGroupIngressSGs )                           | No      | array of string | No         | -          | Security groups which will be provided ingress access to the Nifi cluster security group.<br />These may also be specified globally.                                                            |

#### <a name="nifi_registry_additionalEfsIngressSecurityGroupIds"></a>4.13.1. Property `root > nifi > registry > additionalEfsIngressSecurityGroupIds`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Security groups which will be provided ingress access to the Nifi cluster EFS security group.
These may also be specified globally.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                                         | Description |
| ------------------------------------------------------------------------------------------------------- | ----------- |
| [additionalEfsIngressSecurityGroupIds items](#nifi_registry_additionalEfsIngressSecurityGroupIds_items) | -           |

##### <a name="autogenerated_heading_36"></a>4.13.1.1. root > nifi > registry > additionalEfsIngressSecurityGroupIds > additionalEfsIngressSecurityGroupIds items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="nifi_registry_adminIdentities"></a>4.13.2. Property `root > nifi > registry > adminIdentities`

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

| Each item of this array must be                               | Description |
| ------------------------------------------------------------- | ----------- |
| [adminIdentities items](#nifi_registry_adminIdentities_items) | -           |

##### <a name="autogenerated_heading_37"></a>4.13.2.1. root > nifi > registry > adminIdentities > adminIdentities items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="nifi_registry_authorizations"></a>4.13.3. Property `root > nifi > registry > authorizations`

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

| Each item of this array must be                          | Description |
| -------------------------------------------------------- | ----------- |
| [NifiAuthorization](#nifi_registry_authorizations_items) | -           |

##### <a name="autogenerated_heading_38"></a>4.13.3.1. root > nifi > registry > authorizations > NifiAuthorization

|                           |                                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                            |
| **Required**              | No                                                                                                                  |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                             |
| **Same definition as**    | [nifi_clusters_additionalProperties_authorizations_items](#nifi_clusters_additionalProperties_authorizations_items) |

#### <a name="nifi_registry_buckets"></a>4.13.4. Property `root > nifi > registry > buckets`

|                           |                                                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                        |
| **Required**              | No                                                                                                                              |
| **Additional properties** | [[Should-conform]](#nifi_registry_buckets_additionalProperties "Each additional property must conform to the following schema") |

| Property                                           | Pattern | Type   | Deprecated | Definition                               | Title/Description |
| -------------------------------------------------- | ------- | ------ | ---------- | ---------------------------------------- | ----------------- |
| - [](#nifi_registry_buckets_additionalProperties ) | No      | object | No         | In #/definitions/NifiRegistryBucketProps | -                 |

##### <a name="nifi_registry_buckets_additionalProperties"></a>4.13.4.1. Property `root > nifi > registry > buckets > NifiRegistryBucketProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NifiRegistryBucketProps                   |

| Property                                                        | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [DELETE](#nifi_registry_buckets_additionalProperties_DELETE ) | No      | object | No         | -          | -                 |
| - [READ](#nifi_registry_buckets_additionalProperties_READ )     | No      | object | No         | -          | -                 |
| - [WRITE](#nifi_registry_buckets_additionalProperties_WRITE )   | No      | object | No         | -          | -                 |

###### <a name="nifi_registry_buckets_additionalProperties_DELETE"></a>4.13.4.1.1. Property `root > nifi > registry > buckets > additionalProperties > DELETE`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                                       | Pattern | Type            | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------ | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [groups](#nifi_registry_buckets_additionalProperties_DELETE_groups )         | No      | array of string | No         | -          | -                 |
| - [identities](#nifi_registry_buckets_additionalProperties_DELETE_identities ) | No      | array of string | No         | -          | -                 |

###### <a name="nifi_registry_buckets_additionalProperties_DELETE_groups"></a>4.13.4.1.1.1. Property `root > nifi > registry > buckets > additionalProperties > DELETE > groups`

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
| [groups items](#nifi_registry_buckets_additionalProperties_DELETE_groups_items) | -           |

###### <a name="autogenerated_heading_39"></a>4.13.4.1.1.1.1. root > nifi > registry > buckets > additionalProperties > DELETE > groups > groups items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_registry_buckets_additionalProperties_DELETE_identities"></a>4.13.4.1.1.2. Property `root > nifi > registry > buckets > additionalProperties > DELETE > identities`

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

| Each item of this array must be                                                         | Description |
| --------------------------------------------------------------------------------------- | ----------- |
| [identities items](#nifi_registry_buckets_additionalProperties_DELETE_identities_items) | -           |

###### <a name="autogenerated_heading_40"></a>4.13.4.1.1.2.1. root > nifi > registry > buckets > additionalProperties > DELETE > identities > identities items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_registry_buckets_additionalProperties_READ"></a>4.13.4.1.2. Property `root > nifi > registry > buckets > additionalProperties > READ`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                                     | Pattern | Type            | Deprecated | Definition | Title/Description |
| ---------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [groups](#nifi_registry_buckets_additionalProperties_READ_groups )         | No      | array of string | No         | -          | -                 |
| - [identities](#nifi_registry_buckets_additionalProperties_READ_identities ) | No      | array of string | No         | -          | -                 |

###### <a name="nifi_registry_buckets_additionalProperties_READ_groups"></a>4.13.4.1.2.1. Property `root > nifi > registry > buckets > additionalProperties > READ > groups`

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

| Each item of this array must be                                               | Description |
| ----------------------------------------------------------------------------- | ----------- |
| [groups items](#nifi_registry_buckets_additionalProperties_READ_groups_items) | -           |

###### <a name="autogenerated_heading_41"></a>4.13.4.1.2.1.1. root > nifi > registry > buckets > additionalProperties > READ > groups > groups items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_registry_buckets_additionalProperties_READ_identities"></a>4.13.4.1.2.2. Property `root > nifi > registry > buckets > additionalProperties > READ > identities`

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

| Each item of this array must be                                                       | Description |
| ------------------------------------------------------------------------------------- | ----------- |
| [identities items](#nifi_registry_buckets_additionalProperties_READ_identities_items) | -           |

###### <a name="autogenerated_heading_42"></a>4.13.4.1.2.2.1. root > nifi > registry > buckets > additionalProperties > READ > identities > identities items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_registry_buckets_additionalProperties_WRITE"></a>4.13.4.1.3. Property `root > nifi > registry > buckets > additionalProperties > WRITE`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                                      | Pattern | Type            | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [groups](#nifi_registry_buckets_additionalProperties_WRITE_groups )         | No      | array of string | No         | -          | -                 |
| - [identities](#nifi_registry_buckets_additionalProperties_WRITE_identities ) | No      | array of string | No         | -          | -                 |

###### <a name="nifi_registry_buckets_additionalProperties_WRITE_groups"></a>4.13.4.1.3.1. Property `root > nifi > registry > buckets > additionalProperties > WRITE > groups`

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
| [groups items](#nifi_registry_buckets_additionalProperties_WRITE_groups_items) | -           |

###### <a name="autogenerated_heading_43"></a>4.13.4.1.3.1.1. root > nifi > registry > buckets > additionalProperties > WRITE > groups > groups items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="nifi_registry_buckets_additionalProperties_WRITE_identities"></a>4.13.4.1.3.2. Property `root > nifi > registry > buckets > additionalProperties > WRITE > identities`

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

| Each item of this array must be                                                        | Description |
| -------------------------------------------------------------------------------------- | ----------- |
| [identities items](#nifi_registry_buckets_additionalProperties_WRITE_identities_items) | -           |

###### <a name="autogenerated_heading_44"></a>4.13.4.1.3.2.1. root > nifi > registry > buckets > additionalProperties > WRITE > identities > identities items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="nifi_registry_externalNodeIdentities"></a>4.13.5. Property `root > nifi > registry > externalNodeIdentities`

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

| Each item of this array must be                                             | Description |
| --------------------------------------------------------------------------- | ----------- |
| [externalNodeIdentities items](#nifi_registry_externalNodeIdentities_items) | -           |

##### <a name="autogenerated_heading_45"></a>4.13.5.1. root > nifi > registry > externalNodeIdentities > externalNodeIdentities items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="nifi_registry_groups"></a>4.13.6. Property `root > nifi > registry > groups`

|                           |                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                       |
| **Required**              | No                                                                                                                             |
| **Additional properties** | [[Should-conform]](#nifi_registry_groups_additionalProperties "Each additional property must conform to the following schema") |

| Property                                          | Pattern | Type            | Deprecated | Definition | Title/Description |
| ------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [](#nifi_registry_groups_additionalProperties ) | No      | array of string | No         | -          | -                 |

##### <a name="nifi_registry_groups_additionalProperties"></a>4.13.6.1. Property `root > nifi > registry > groups > additionalProperties`

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
| [additionalProperties items](#nifi_registry_groups_additionalProperties_items) | -           |

###### <a name="autogenerated_heading_46"></a>4.13.6.1.1. root > nifi > registry > groups > additionalProperties > additionalProperties items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="nifi_registry_httpsPort"></a>4.13.7. Property `root > nifi > registry > httpsPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** The port on which the cluster HTTPS interfaces will listen

#### <a name="nifi_registry_identities"></a>4.13.8. Property `root > nifi > registry > identities`

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

| Each item of this array must be                     | Description |
| --------------------------------------------------- | ----------- |
| [identities items](#nifi_registry_identities_items) | -           |

##### <a name="autogenerated_heading_47"></a>4.13.8.1. root > nifi > registry > identities > identities items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="nifi_registry_policies"></a>4.13.9. Property `root > nifi > registry > policies`

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

| Each item of this array must be             | Description |
| ------------------------------------------- | ----------- |
| [NifiPolicy](#nifi_registry_policies_items) | -           |

##### <a name="autogenerated_heading_48"></a>4.13.9.1. root > nifi > registry > policies > NifiPolicy

|                           |                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                |
| **Required**              | No                                                                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                 |
| **Same definition as**    | [nifi_clusters_additionalProperties_policies_items](#nifi_clusters_additionalProperties_policies_items) |

#### <a name="nifi_registry_registryImageTag"></a>4.13.10. Property `root > nifi > registry > registryImageTag`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The tag of the Nifi docker image to use. If not specified,
defaults to the latest tested version (currently 1.25.0). Specify 'latest' to pull
the latest version (might be untested).

#### <a name="nifi_registry_registryRoleAwsManagedPolicies"></a>4.13.11. Property `root > nifi > registry > registryRoleAwsManagedPolicies`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** AWS managed policies which will be granted to the Nifi cluster role for access to AWS services.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                             | Description |
| --------------------------------------------------------------------------- | ----------- |
| [AwsManagedPolicySpec](#nifi_registry_registryRoleAwsManagedPolicies_items) | -           |

##### <a name="autogenerated_heading_49"></a>4.13.11.1. root > nifi > registry > registryRoleAwsManagedPolicies > AwsManagedPolicySpec

|                           |                                                                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                          |
| **Required**              | No                                                                                                                                                |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                                           |
| **Same definition as**    | [nifi_clusters_additionalProperties_clusterRoleAwsManagedPolicies_items](#nifi_clusters_additionalProperties_clusterRoleAwsManagedPolicies_items) |

#### <a name="nifi_registry_registryRoleManagedPolicies"></a>4.13.12. Property `root > nifi > registry > registryRoleManagedPolicies`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Customer managed policies which will be granted to the Nifi cluster role for access to AWS services.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                       | Description |
| ------------------------------------------------------------------------------------- | ----------- |
| [registryRoleManagedPolicies items](#nifi_registry_registryRoleManagedPolicies_items) | -           |

##### <a name="autogenerated_heading_50"></a>4.13.12.1. root > nifi > registry > registryRoleManagedPolicies > registryRoleManagedPolicies items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="nifi_registry_securityGroupIngressIPv4s"></a>4.13.13. Property `root > nifi > registry > securityGroupIngressIPv4s`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** IPv4 CIDRs which will be provided ingress access to the Nifi cluster security group.
These may also be specified globally.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                   | Description |
| --------------------------------------------------------------------------------- | ----------- |
| [securityGroupIngressIPv4s items](#nifi_registry_securityGroupIngressIPv4s_items) | -           |

##### <a name="autogenerated_heading_51"></a>4.13.13.1. root > nifi > registry > securityGroupIngressIPv4s > securityGroupIngressIPv4s items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="nifi_registry_securityGroupIngressSGs"></a>4.13.14. Property `root > nifi > registry > securityGroupIngressSGs`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Security groups which will be provided ingress access to the Nifi cluster security group.
These may also be specified globally.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                               | Description |
| ----------------------------------------------------------------------------- | ----------- |
| [securityGroupIngressSGs items](#nifi_registry_securityGroupIngressSGs_items) | -           |

##### <a name="autogenerated_heading_52"></a>4.13.14.1. root > nifi > registry > securityGroupIngressSGs > securityGroupIngressSGs items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="nifi_securityGroupEgressRules"></a>4.14. Property `root > nifi > securityGroupEgressRules`

|                           |                                                                                          |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                 |
| **Required**              | No                                                                                       |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                  |
| **Same definition as**    | [securityGroupEgressRules](#nifi_clusters_additionalProperties_securityGroupEgressRules) |

**Description:** Egress rules to be added to all Nifi cluster security groups.
These may also be specified for each cluster.

### <a name="nifi_securityGroupIngressIPv4s"></a>4.15. Property `root > nifi > securityGroupIngressIPv4s`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** IPv4 CIDRs which will be provided ingress access to all Nifi cluster security groups.
These may also be specified for each cluster.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                          | Description |
| ------------------------------------------------------------------------ | ----------- |
| [securityGroupIngressIPv4s items](#nifi_securityGroupIngressIPv4s_items) | -           |

#### <a name="autogenerated_heading_53"></a>4.15.1. root > nifi > securityGroupIngressIPv4s > securityGroupIngressIPv4s items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="nifi_securityGroupIngressSGs"></a>4.16. Property `root > nifi > securityGroupIngressSGs`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Security groups which will be provided ingress access to all Nifi cluster security groups.
These may also be specified for each cluster.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                      | Description |
| -------------------------------------------------------------------- | ----------- |
| [securityGroupIngressSGs items](#nifi_securityGroupIngressSGs_items) | -           |

#### <a name="autogenerated_heading_54"></a>4.16.1. root > nifi > securityGroupIngressSGs > securityGroupIngressSGs items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="nifi_subnetIds"></a>4.17. Property `root > nifi > subnetIds`

|                           |                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                 |
| **Required**              | Yes                                                                                                                      |
| **Additional properties** | [[Should-conform]](#nifi_subnetIds_additionalProperties "Each additional property must conform to the following schema") |

**Description:** Subnets on which EKS and Nifi clusters will be deployed

| Property                                    | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#nifi_subnetIds_additionalProperties ) | No      | string | No         | -          | -                 |

#### <a name="nifi_subnetIds_additionalProperties"></a>4.17.1. Property `root > nifi > subnetIds > additionalProperties`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="nifi_vpcId"></a>4.18. Property `root > nifi > vpcId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** VPC on which EKS and Nifi clusters will be deployed

## <a name="projectBucket"></a>5. Property `root > projectBucket`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="projectName"></a>6. Property `root > projectName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Name of the DataOps Project

## <a name="projectTopicArn"></a>7. Property `root > projectTopicArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="securityConfigurationName"></a>8. Property `root > securityConfigurationName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="service_catalog_product_config"></a>9. Property `root > service_catalog_product_config`

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

### <a name="service_catalog_product_config_launch_role_name"></a>9.1. Property `root > service_catalog_product_config > launch_role_name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="service_catalog_product_config_name"></a>9.2. Property `root > service_catalog_product_config > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_owner"></a>9.3. Property `root > service_catalog_product_config > owner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_parameters"></a>9.4. Property `root > service_catalog_product_config > parameters`

|                           |                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                            |
| **Required**              | No                                                                                                                                                  |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                               | Pattern | Type   | Deprecated | Definition                                         | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogParameterConfig | -                 |

#### <a name="service_catalog_product_config_parameters_additionalProperties"></a>9.4.1. Property `root > service_catalog_product_config > parameters > MdaaServiceCatalogParameterConfig`

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

##### <a name="service_catalog_product_config_parameters_additionalProperties_constraints"></a>9.4.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_description"></a>9.4.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules"></a>9.4.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules`

|                           |                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                                                   |
| **Required**              | Yes                                                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                      | Pattern | Type   | Deprecated | Definition                                              | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleConfig | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties"></a>9.4.1.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > MdaaServiceCatalogConstraintRuleConfig`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions"></a>9.4.1.1.2.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions`

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

###### <a name="autogenerated_heading_55"></a>9.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert"></a>9.4.1.1.2.1.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > assert`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description"></a>9.4.1.1.2.1.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition"></a>9.4.1.1.2.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > condition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig           |

##### <a name="service_catalog_product_config_parameters_additionalProperties_props"></a>9.4.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedPattern"></a>9.4.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedPattern`

|              |                                                         |
| ------------ | ------------------------------------------------------- |
| **Type**     | `string`                                                |
| **Required** | No                                                      |
| **Default**  | `"- No constraints on patterns allowed for parameter."` |

**Description:** A regular expression that represents the patterns to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedValues"></a>9.4.1.2.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues`

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

###### <a name="autogenerated_heading_56"></a>9.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_constraintDescription"></a>9.4.1.2.3. Property `root > service_catalog_product_config > parameters > additionalProperties > props > constraintDescription`

|              |                                                                                        |
| ------------ | -------------------------------------------------------------------------------------- |
| **Type**     | `string`                                                                               |
| **Required** | No                                                                                     |
| **Default**  | `"- No description with customized error message when user specifies invalid values."` |

**Description:** A string that explains a constraint when the constraint is violated.
For example, without a constraint description, a parameter that has an allowed
pattern of [A-Za-z0-9]+ displays the following error message when the user specifies
an invalid value:

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_default"></a>9.4.1.2.4. Property `root > service_catalog_product_config > parameters > additionalProperties > props > default`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Default**               | `"- No default value for parameter."`                                     |

**Description:** A value of the appropriate type for the template to use if no value is specified
when a stack is created. If you define constraints for the parameter, you must specify
a value that adheres to those constraints.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_description"></a>9.4.1.2.5. Property `root > service_catalog_product_config > parameters > additionalProperties > props > description`

|              |                                         |
| ------------ | --------------------------------------- |
| **Type**     | `string`                                |
| **Required** | No                                      |
| **Default**  | `"- No description for the parameter."` |

**Description:** A string of up to 4000 characters that describes the parameter.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxLength"></a>9.4.1.2.6. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the largest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxValue"></a>9.4.1.2.7. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the largest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minLength"></a>9.4.1.2.8. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the smallest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minValue"></a>9.4.1.2.9. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the smallest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_noEcho"></a>9.4.1.2.10. Property `root > service_catalog_product_config > parameters > additionalProperties > props > noEcho`

|              |                                        |
| ------------ | -------------------------------------- |
| **Type**     | `boolean`                              |
| **Required** | No                                     |
| **Default**  | `"- Parameter values are not masked."` |

**Description:** Whether to mask the parameter value when anyone makes a call that describes the stack.
If you set the value to ``true``, the parameter value is masked with asterisks (``*****``).

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_type"></a>9.4.1.2.11. Property `root > service_catalog_product_config > parameters > additionalProperties > props > type`

|              |            |
| ------------ | ---------- |
| **Type**     | `string`   |
| **Required** | No         |
| **Default**  | `"String"` |

**Description:** The data type for the parameter (DataType).

### <a name="service_catalog_product_config_portfolio_arn"></a>9.5. Property `root > service_catalog_product_config > portfolio_arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

----------------------------------------------------------------------------------------------------------------------------
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-16 at 13:40:35 -0400

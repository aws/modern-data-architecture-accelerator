# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                       | Title/Description                                                                                                                                    |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [domain](#domain )                                                 | No      | object | No         | In #/definitions/OpensearchDomainConfig          | -                                                                                                                                                    |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                     |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |

## <a name="domain"></a>1. Property `root > domain`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/OpensearchDomainConfig                    |

| Property                                                            | Pattern | Type            | Deprecated | Definition                                 | Title/Description                                                                                                                                                                                                                      |
| ------------------------------------------------------------------- | ------- | --------------- | ---------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [accessPolicies](#domain_accessPolicies )                         | No      | array of object | No         | -                                          | -                                                                                                                                                                                                                                      |
| + [automatedSnapshotStartHour](#domain_automatedSnapshotStartHour ) | No      | number          | No         | -                                          | Required. Hour of day when automated snapshot creation will start                                                                                                                                                                      |
| + [capacity](#domain_capacity )                                     | No      | object          | No         | In #/definitions/CapacityConfig            | Required. Opensearch cluster node configurations.                                                                                                                                                                                      |
| - [customEndpoint](#domain_customEndpoint )                         | No      | object          | No         | In #/definitions/CustomEndpointConfig      | Optional. Custom endpoint configuration.                                                                                                                                                                                               |
| + [dataAdminRole](#domain_dataAdminRole )                           | No      | object          | No         | In #/definitions/MdaaRoleRef               | Required. ARN of Data Admin role. This role will be granted admin access to Opensearch Dashboard to update SAML configurations via web interface                                                                                       |
| + [ebs](#domain_ebs )                                               | No      | object          | No         | In #/definitions/EbsOptions                | Required. EBS storage configuration for cluster nodes.                                                                                                                                                                                 |
| + [enableVersionUpgrade](#domain_enableVersionUpgrade )             | No      | boolean         | No         | -                                          | Required. Allow/Disallow automatic version upgrades.                                                                                                                                                                                   |
| - [eventNotifications](#domain_eventNotifications )                 | No      | object          | No         | In #/definitions/EventNotificationsProps   | Event notification configuration                                                                                                                                                                                                       |
| + [opensearchDomainName](#domain_opensearchDomainName )             | No      | string          | No         | -                                          | Required. Functional Name of Opensearch Domain.<br />This will be prefixed as per MDAA naming convention.<br />If resultant name is longer than 28 characters, a randomly generated ID will be suffixed to truncated name.             |
| + [opensearchEngineVersion](#domain_opensearchEngineVersion )       | No      | string          | No         | -                                          | Required. version of Opensearch engine to provision in format x.y where x= major version, y=minor version. https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html#choosing-version                          |
| + [securityGroupIngress](#domain_securityGroupIngress )             | No      | object          | No         | In #/definitions/SecurityGroupIngressProps | List of security group ingress properties                                                                                                                                                                                              |
| + [subnets](#domain_subnets )                                       | No      | array           | No         | -                                          | Required. ID(s) of subnets in which Opensearch domain will be created.<br />Make sure the number of subnets specified is same as or more than the number of AZs speceified in zoneAwareness configuration and span across as many AZs. |
| + [vpcId](#domain_vpcId )                                           | No      | string          | No         | -                                          | Required. ID of VPC in which Opensearch domain will be created.                                                                                                                                                                        |
| - [zoneAwareness](#domain_zoneAwareness )                           | No      | object          | No         | In #/definitions/ZoneAwarenessConfig       | Optional. Opensearch cluster will enable shard distribution across 2 or 3 zones as specified.                                                                                                                                          |

### <a name="domain_accessPolicies"></a>1.1. Property `root > domain > accessPolicies`

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

| Each item of this array must be                      | Description |
| ---------------------------------------------------- | ----------- |
| [accessPolicies items](#domain_accessPolicies_items) | -           |

#### <a name="autogenerated_heading_2"></a>1.1.1. root > domain > accessPolicies > accessPolicies items

|                           |                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                              |
| **Required**              | No                                                                                                                                    |
| **Additional properties** | [[Should-conform]](#domain_accessPolicies_items_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                 | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [](#domain_accessPolicies_items_additionalProperties ) | No      | object | No         | -          | -                 |

##### <a name="domain_accessPolicies_items_additionalProperties"></a>1.1.1.1. Property `root > domain > accessPolicies > accessPolicies items > additionalProperties`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

### <a name="domain_automatedSnapshotStartHour"></a>1.2. Property `root > domain > automatedSnapshotStartHour`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | Yes      |

**Description:** Required. Hour of day when automated snapshot creation will start

### <a name="domain_capacity"></a>1.3. Property `root > domain > capacity`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CapacityConfig                            |

**Description:** Required. Opensearch cluster node configurations.

| Property                                                                   | Pattern | Type    | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [dataNodeInstanceType](#domain_capacity_dataNodeInstanceType )           | No      | string  | No         | -          | The instance type for your data nodes, such as<br />\`m3.medium.search\`. For valid values, see [Supported Instance<br />Types](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html)<br />in the Amazon OpenSearch Service Developer Guide.                                           |
| - [dataNodes](#domain_capacity_dataNodes )                                 | No      | number  | No         | -          | The number of data nodes (instances) to use in the Amazon OpenSearch Service domain.                                                                                                                                                                                                                                                 |
| - [masterNodeInstanceType](#domain_capacity_masterNodeInstanceType )       | No      | string  | No         | -          | The hardware configuration of the computer that hosts the dedicated master<br />node, such as \`m3.medium.search\`. For valid values, see [Supported<br />Instance Types](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html)<br />in the Amazon OpenSearch Service Developer Guide. |
| - [masterNodes](#domain_capacity_masterNodes )                             | No      | number  | No         | -          | The number of instances to use for the master node.                                                                                                                                                                                                                                                                                  |
| - [multiAzWithStandbyEnabled](#domain_capacity_multiAzWithStandbyEnabled ) | No      | boolean | No         | -          | Indicates whether Multi-AZ with Standby deployment option is enabled.<br />For more information, see [Multi-AZ with<br />Standby](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-multiaz.html#managedomains-za-standby)                                                                          |
| - [warmInstanceType](#domain_capacity_warmInstanceType )                   | No      | string  | No         | -          | The instance type for your UltraWarm node, such as \`ultrawarm1.medium.search\`.<br />For valid values, see [UltraWarm Storage<br />Limits](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html#limits-ultrawarm)<br />in the Amazon OpenSearch Service Developer Guide.                                |
| - [warmNodes](#domain_capacity_warmNodes )                                 | No      | number  | No         | -          | The number of UltraWarm nodes (instances) to use in the Amazon OpenSearch Service domain.                                                                                                                                                                                                                                            |

#### <a name="domain_capacity_dataNodeInstanceType"></a>1.3.1. Property `root > domain > capacity > dataNodeInstanceType`

|              |                       |
| ------------ | --------------------- |
| **Type**     | `string`              |
| **Required** | No                    |
| **Default**  | `"- r5.large.search"` |

**Description:** The instance type for your data nodes, such as
`m3.medium.search`. For valid values, see [Supported Instance
Types](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html)
in the Amazon OpenSearch Service Developer Guide.

#### <a name="domain_capacity_dataNodes"></a>1.3.2. Property `root > domain > capacity > dataNodes`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |
| **Default**  | `"- 1"`  |

**Description:** The number of data nodes (instances) to use in the Amazon OpenSearch Service domain.

#### <a name="domain_capacity_masterNodeInstanceType"></a>1.3.3. Property `root > domain > capacity > masterNodeInstanceType`

|              |                       |
| ------------ | --------------------- |
| **Type**     | `string`              |
| **Required** | No                    |
| **Default**  | `"- r5.large.search"` |

**Description:** The hardware configuration of the computer that hosts the dedicated master
node, such as `m3.medium.search`. For valid values, see [Supported
Instance Types](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/supported-instance-types.html)
in the Amazon OpenSearch Service Developer Guide.

#### <a name="domain_capacity_masterNodes"></a>1.3.4. Property `root > domain > capacity > masterNodes`

|              |                                 |
| ------------ | ------------------------------- |
| **Type**     | `number`                        |
| **Required** | No                              |
| **Default**  | `"- no dedicated master nodes"` |

**Description:** The number of instances to use for the master node.

#### <a name="domain_capacity_multiAzWithStandbyEnabled"></a>1.3.5. Property `root > domain > capacity > multiAzWithStandbyEnabled`

|              |                                                                                                                                       |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**     | `boolean`                                                                                                                             |
| **Required** | No                                                                                                                                    |
| **Default**  | `"- multi-az with standby if the feature flag `ENABLE_OPENSEARCH_MULTIAZ_WITH_STANDBY`\nis true, no multi-az with standby otherwise"` |

**Description:** Indicates whether Multi-AZ with Standby deployment option is enabled.
For more information, see [Multi-AZ with
Standby](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-multiaz.html#managedomains-za-standby)

#### <a name="domain_capacity_warmInstanceType"></a>1.3.6. Property `root > domain > capacity > warmInstanceType`

|              |                                |
| ------------ | ------------------------------ |
| **Type**     | `string`                       |
| **Required** | No                             |
| **Default**  | `"- ultrawarm1.medium.search"` |

**Description:** The instance type for your UltraWarm node, such as `ultrawarm1.medium.search`.
For valid values, see [UltraWarm Storage
Limits](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html#limits-ultrawarm)
in the Amazon OpenSearch Service Developer Guide.

#### <a name="domain_capacity_warmNodes"></a>1.3.7. Property `root > domain > capacity > warmNodes`

|              |                          |
| ------------ | ------------------------ |
| **Type**     | `number`                 |
| **Required** | No                       |
| **Default**  | `"- no UltraWarm nodes"` |

**Description:** The number of UltraWarm nodes (instances) to use in the Amazon OpenSearch Service domain.

### <a name="domain_customEndpoint"></a>1.4. Property `root > domain > customEndpoint`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CustomEndpointConfig                      |

**Description:** Optional. Custom endpoint configuration.

| Property                                                                             | Pattern | Type    | Deprecated | Definition | Title/Description                                                                  |
| ------------------------------------------------------------------------------------ | ------- | ------- | ---------- | ---------- | ---------------------------------------------------------------------------------- |
| - [acmCertificateArn](#domain_customEndpoint_acmCertificateArn )                     | No      | string  | No         | -          | Optional. A certificate will be created in ACM if not specified.                   |
| + [domainName](#domain_customEndpoint_domainName )                                   | No      | string  | No         | -          | Required if customeEndpoint section is specified.<br />Fully Qualified Domain Name |
| - [route53HostedZoneDomainName](#domain_customEndpoint_route53HostedZoneDomainName ) | No      | string  | No         | -          | Optional. Domain Name used in the hosted zone.                                     |
| - [route53HostedZoneEnabled](#domain_customEndpoint_route53HostedZoneEnabled )       | No      | boolean | No         | -          | Optional. Private hosted Zone configuration will not be setup (CName record).      |

#### <a name="domain_customEndpoint_acmCertificateArn"></a>1.4.1. Property `root > domain > customEndpoint > acmCertificateArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Optional. A certificate will be created in ACM if not specified.

#### <a name="domain_customEndpoint_domainName"></a>1.4.2. Property `root > domain > customEndpoint > domainName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Required if customeEndpoint section is specified.
Fully Qualified Domain Name

#### <a name="domain_customEndpoint_route53HostedZoneDomainName"></a>1.4.3. Property `root > domain > customEndpoint > route53HostedZoneDomainName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Optional. Domain Name used in the hosted zone.

#### <a name="domain_customEndpoint_route53HostedZoneEnabled"></a>1.4.4. Property `root > domain > customEndpoint > route53HostedZoneEnabled`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Optional. Private hosted Zone configuration will not be setup (CName record).

### <a name="domain_dataAdminRole"></a>1.5. Property `root > domain > dataAdminRole`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaRoleRef                               |

**Description:** Required. ARN of Data Admin role. This role will be granted admin access to Opensearch Dashboard to update SAML configurations via web interface

| Property                                        | Pattern | Type    | Deprecated | Definition | Title/Description                                                                             |
| ----------------------------------------------- | ------- | ------- | ---------- | ---------- | --------------------------------------------------------------------------------------------- |
| - [arn](#domain_dataAdminRole_arn )             | No      | string  | No         | -          | Reference role by arn                                                                         |
| - [id](#domain_dataAdminRole_id )               | No      | string  | No         | -          | Reference role by id                                                                          |
| - [immutable](#domain_dataAdminRole_immutable ) | No      | boolean | No         | -          | Indicates whether the role should be considered immutable (defaults false)                    |
| - [name](#domain_dataAdminRole_name )           | No      | string  | No         | -          | Reference role by name                                                                        |
| - [refId](#domain_dataAdminRole_refId )         | No      | string  | No         | -          | A string which uniquely identifies the MdaaRoleRef within a scope.                            |
| - [sso](#domain_dataAdminRole_sso )             | No      | boolean | No         | -          | If true, role name will be resolved to an SSO auto-generated role. Also implies immutability. |

#### <a name="domain_dataAdminRole_arn"></a>1.5.1. Property `root > domain > dataAdminRole > arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by arn

#### <a name="domain_dataAdminRole_id"></a>1.5.2. Property `root > domain > dataAdminRole > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by id

#### <a name="domain_dataAdminRole_immutable"></a>1.5.3. Property `root > domain > dataAdminRole > immutable`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** Indicates whether the role should be considered immutable (defaults false)

#### <a name="domain_dataAdminRole_name"></a>1.5.4. Property `root > domain > dataAdminRole > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Reference role by name

#### <a name="domain_dataAdminRole_refId"></a>1.5.5. Property `root > domain > dataAdminRole > refId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A string which uniquely identifies the MdaaRoleRef within a scope.

#### <a name="domain_dataAdminRole_sso"></a>1.5.6. Property `root > domain > dataAdminRole > sso`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | No        |

**Description:** If true, role name will be resolved to an SSO auto-generated role. Also implies immutability.

### <a name="domain_ebs"></a>1.6. Property `root > domain > ebs`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/EbsOptions                                |

**Description:** Required. EBS storage configuration for cluster nodes.

| Property                                | Pattern | Type             | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------- | ------- | ---------------- | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [enabled](#domain_ebs_enabled )       | No      | boolean          | No         | -          | Specifies whether Amazon EBS volumes are attached to data nodes in the<br />Amazon OpenSearch Service domain.                                                                                                                                                                                                                                                                                            |
| - [iops](#domain_ebs_iops )             | No      | number           | No         | -          | The number of I/O operations per second (IOPS) that the volume<br />supports. This property applies only to the gp3 and Provisioned IOPS (SSD) EBS<br />volume type.                                                                                                                                                                                                                                     |
| - [throughput](#domain_ebs_throughput ) | No      | number           | No         | -          | The throughput (in MiB/s) of the EBS volumes attached to data nodes.<br />This property applies only to the gp3 volume type.                                                                                                                                                                                                                                                                             |
| - [volumeSize](#domain_ebs_volumeSize ) | No      | number           | No         | -          | The size (in GiB) of the EBS volume for each data node. The minimum and<br />maximum size of an EBS volume depends on the EBS volume type and the<br />instance type to which it is attached.  For  valid values, see<br />[EBS volume size limits](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html#ebsresource)<br />in the Amazon OpenSearch Service Developer Guide. |
| - [volumeType](#domain_ebs_volumeType ) | No      | enum (of string) | No         | -          | The EBS volume type to use with the Amazon OpenSearch Service domain, such as standard, gp2, io1.                                                                                                                                                                                                                                                                                                        |

#### <a name="domain_ebs_enabled"></a>1.6.1. Property `root > domain > ebs > enabled`

|              |            |
| ------------ | ---------- |
| **Type**     | `boolean`  |
| **Required** | No         |
| **Default**  | `"- true"` |

**Description:** Specifies whether Amazon EBS volumes are attached to data nodes in the
Amazon OpenSearch Service domain.

#### <a name="domain_ebs_iops"></a>1.6.2. Property `root > domain > ebs > iops`

|              |                         |
| ------------ | ----------------------- |
| **Type**     | `number`                |
| **Required** | No                      |
| **Default**  | `"- iops are not set."` |

**Description:** The number of I/O operations per second (IOPS) that the volume
supports. This property applies only to the gp3 and Provisioned IOPS (SSD) EBS
volume type.

#### <a name="domain_ebs_throughput"></a>1.6.3. Property `root > domain > ebs > throughput`

|              |                              |
| ------------ | ---------------------------- |
| **Type**     | `number`                     |
| **Required** | No                           |
| **Default**  | `"- throughput is not set."` |

**Description:** The throughput (in MiB/s) of the EBS volumes attached to data nodes.
This property applies only to the gp3 volume type.

#### <a name="domain_ebs_volumeSize"></a>1.6.4. Property `root > domain > ebs > volumeSize`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |
| **Default**  | `10`     |

**Description:** The size (in GiB) of the EBS volume for each data node. The minimum and
maximum size of an EBS volume depends on the EBS volume type and the
instance type to which it is attached.  For  valid values, see
[EBS volume size limits](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/limits.html#ebsresource)
in the Amazon OpenSearch Service Developer Guide.

#### <a name="domain_ebs_volumeType"></a>1.6.5. Property `root > domain > ebs > volumeType`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |
| **Default**  | `"gp2"`            |

**Description:** The EBS volume type to use with the Amazon OpenSearch Service domain, such as standard, gp2, io1.

Must be one of:
* "gp2"
* "gp3"
* "io1"
* "io2"
* "sc1"
* "st1"
* "standard"

### <a name="domain_enableVersionUpgrade"></a>1.7. Property `root > domain > enableVersionUpgrade`

|              |           |
| ------------ | --------- |
| **Type**     | `boolean` |
| **Required** | Yes       |

**Description:** Required. Allow/Disallow automatic version upgrades.

### <a name="domain_eventNotifications"></a>1.8. Property `root > domain > eventNotifications`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/EventNotificationsProps                   |

**Description:** Event notification configuration

| Property                                     | Pattern | Type            | Deprecated | Definition | Title/Description |
| -------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------- |
| - [email](#domain_eventNotifications_email ) | No      | array of string | No         | -          | -                 |

#### <a name="domain_eventNotifications_email"></a>1.8.1. Property `root > domain > eventNotifications > email`

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

| Each item of this array must be                       | Description |
| ----------------------------------------------------- | ----------- |
| [email items](#domain_eventNotifications_email_items) | -           |

##### <a name="autogenerated_heading_3"></a>1.8.1.1. root > domain > eventNotifications > email > email items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="domain_opensearchDomainName"></a>1.9. Property `root > domain > opensearchDomainName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Required. Functional Name of Opensearch Domain.
This will be prefixed as per MDAA naming convention.
If resultant name is longer than 28 characters, a randomly generated ID will be suffixed to truncated name.

### <a name="domain_opensearchEngineVersion"></a>1.10. Property `root > domain > opensearchEngineVersion`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Required. version of Opensearch engine to provision in format x.y where x= major version, y=minor version. https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html#choosing-version

### <a name="domain_securityGroupIngress"></a>1.11. Property `root > domain > securityGroupIngress`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/SecurityGroupIngressProps                 |

**Description:** List of security group ingress properties

| Property                                     | Pattern | Type            | Deprecated | Definition | Title/Description                          |
| -------------------------------------------- | ------- | --------------- | ---------- | ---------- | ------------------------------------------ |
| - [ipv4](#domain_securityGroupIngress_ipv4 ) | No      | array of string | No         | -          | CIDR range of the ingres definition        |
| - [sg](#domain_securityGroupIngress_sg )     | No      | array of string | No         | -          | Security Group ID of the ingres definition |

#### <a name="domain_securityGroupIngress_ipv4"></a>1.11.1. Property `root > domain > securityGroupIngress > ipv4`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** CIDR range of the ingres definition

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                       | Description |
| ----------------------------------------------------- | ----------- |
| [ipv4 items](#domain_securityGroupIngress_ipv4_items) | -           |

##### <a name="autogenerated_heading_4"></a>1.11.1.1. root > domain > securityGroupIngress > ipv4 > ipv4 items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

#### <a name="domain_securityGroupIngress_sg"></a>1.11.2. Property `root > domain > securityGroupIngress > sg`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Security Group ID of the ingres definition

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                   | Description |
| ------------------------------------------------- | ----------- |
| [sg items](#domain_securityGroupIngress_sg_items) | -           |

##### <a name="autogenerated_heading_5"></a>1.11.2.1. root > domain > securityGroupIngress > sg > sg items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="domain_subnets"></a>1.12. Property `root > domain > subnets`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | Yes     |

**Description:** Required. ID(s) of subnets in which Opensearch domain will be created.
Make sure the number of subnets specified is same as or more than the number of AZs speceified in zoneAwareness configuration and span across as many AZs.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be       | Description |
| ------------------------------------- | ----------- |
| [SubnetConfig](#domain_subnets_items) | -           |

#### <a name="autogenerated_heading_6"></a>1.12.1. root > domain > subnets > SubnetConfig

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/SubnetConfig                              |

| Property                                                      | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [availabilityZone](#domain_subnets_items_availabilityZone ) | No      | string | No         | -          | -                 |
| + [subnetId](#domain_subnets_items_subnetId )                 | No      | string | No         | -          | -                 |

##### <a name="domain_subnets_items_availabilityZone"></a>1.12.1.1. Property `root > domain > subnets > subnets items > availabilityZone`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="domain_subnets_items_subnetId"></a>1.12.1.2. Property `root > domain > subnets > subnets items > subnetId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="domain_vpcId"></a>1.13. Property `root > domain > vpcId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Required. ID of VPC in which Opensearch domain will be created.

### <a name="domain_zoneAwareness"></a>1.14. Property `root > domain > zoneAwareness`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/ZoneAwarenessConfig                       |

**Description:** Optional. Opensearch cluster will enable shard distribution across 2 or 3 zones as specified.

| Property                                                                | Pattern | Type    | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------- | ------- | ------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [availabilityZoneCount](#domain_zoneAwareness_availabilityZoneCount ) | No      | number  | No         | -          | If you enabled multiple Availability Zones (AZs), the number of AZs that you<br />want the domain to use. Valid values are 2 and 3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| - [enabled](#domain_zoneAwareness_enabled )                             | No      | boolean | No         | -          | Indicates whether to enable zone awareness for the Amazon OpenSearch Service domain.<br />When you enable zone awareness, Amazon OpenSearch Service allocates the nodes and replica<br />index shards that belong to a cluster across two Availability Zones (AZs)<br />in the same region to prevent data loss and minimize downtime in the event<br />of node or data center failure. Don't enable zone awareness if your cluster<br />has no replica index shards or is a single-node cluster. For more information,<br />see [Configuring a Multi-AZ Domain](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-multiaz.html)<br />in the Amazon OpenSearch Service Developer Guide. |

#### <a name="domain_zoneAwareness_availabilityZoneCount"></a>1.14.1. Property `root > domain > zoneAwareness > availabilityZoneCount`

|              |                                       |
| ------------ | ------------------------------------- |
| **Type**     | `number`                              |
| **Required** | No                                    |
| **Default**  | `"- 2 if zone awareness is enabled."` |

**Description:** If you enabled multiple Availability Zones (AZs), the number of AZs that you
want the domain to use. Valid values are 2 and 3.

#### <a name="domain_zoneAwareness_enabled"></a>1.14.2. Property `root > domain > zoneAwareness > enabled`

|              |             |
| ------------ | ----------- |
| **Type**     | `boolean`   |
| **Required** | No          |
| **Default**  | `"- false"` |

**Description:** Indicates whether to enable zone awareness for the Amazon OpenSearch Service domain.
When you enable zone awareness, Amazon OpenSearch Service allocates the nodes and replica
index shards that belong to a cluster across two Availability Zones (AZs)
in the same region to prevent data loss and minimize downtime in the event
of node or data center failure. Don't enable zone awareness if your cluster
has no replica index shards or is a single-node cluster. For more information,
see [Configuring a Multi-AZ Domain](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/managedomains-multiaz.html)
in the Amazon OpenSearch Service Developer Guide.

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

#### <a name="autogenerated_heading_7"></a>2.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

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

###### <a name="autogenerated_heading_8"></a>2.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

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

###### <a name="autogenerated_heading_9"></a>3.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

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

###### <a name="autogenerated_heading_10"></a>3.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

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
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-06 at 12:58:05 -0400

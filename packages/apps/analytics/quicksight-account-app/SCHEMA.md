# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                       | Title/Description                                                                                                                                    |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [account](#account )                                               | No      | object | No         | In #/definitions/AccountProps                    | -                                                                                                                                                    |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                     |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |

## <a name="account"></a>1. Property `root > account`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | Yes                                                     |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/AccountProps                              |

| Property                                                 | Pattern | Type             | Deprecated | Definition                                  | Title/Description                                                                                                                                                                                            |
| -------------------------------------------------------- | ------- | ---------------- | ---------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| + [authenticationMethod](#account_authenticationMethod ) | No      | enum (of string) | No         | In #/definitions/AuthenticationMethod       | The method to authenticate your Amazon QuickSight account. <br />Valid Values:                                                                                                                               |
| - [contactNumber](#account_contactNumber )               | No      | string           | No         | -                                           | A 10-digit phone number for the author of the Amazon QuickSight account to use for future communications.                                                                                                    |
| + [edition](#account_edition )                           | No      | enum (of string) | No         | In #/definitions/Edition                    | The edition of Amazon QuickSight. <br />Valid Values: STANDARD \| ENTERPRISE \| ENTERPRISE_AND_Q                                                                                                             |
| - [emailAddress](#account_emailAddress )                 | No      | string           | No         | -                                           | The email address of the author of the Amazon QuickSight account to use for future communications.                                                                                                           |
| - [firstName](#account_firstName )                       | No      | string           | No         | -                                           | The first name of the author of the Amazon QuickSight account to use for future communications.                                                                                                              |
| - [glueResourceAccess](#account_glueResourceAccess )     | No      | array of string  | No         | -                                           | List of Glue resources to which the QuickSight service role will be granted access.                                                                                                                          |
| - [ipRestrictions](#account_ipRestrictions )             | No      | array            | No         | -                                           | List of IP CIDRs which will be provided access to the account via the QuickSight interface. IP access restrictions are disabled by default.                                                                  |
| - [lastName](#account_lastName )                         | No      | string           | No         | -                                           | The last name of the author of the Amazon QuickSight account to use for future communications.                                                                                                               |
| + [notificationEmail](#account_notificationEmail )       | No      | string           | No         | -                                           | The email address that you want Amazon QuickSight to send notifications.                                                                                                                                     |
| - [securityGroupAccess](#account_securityGroupAccess )   | No      | object           | No         | In #/definitions/MdaaSecurityGroupRuleProps | Map of names to security group access definitions. Will be added as egrees/ingress rules to the QuickSight security group, permitting access<br />between the QS account and internal resources on your VPC. |
| + [subnetIds](#account_subnetIds )                       | No      | array of string  | No         | -                                           | The Subnet IDs to which the QS Account will be connected.                                                                                                                                                    |
| + [vpcId](#account_vpcId )                               | No      | string           | No         | -                                           | The VPC to which the QS Account will be associated.                                                                                                                                                          |

### <a name="account_authenticationMethod"></a>1.1. Property `root > account > authenticationMethod`

|                |                                    |
| -------------- | ---------------------------------- |
| **Type**       | `enum (of string)`                 |
| **Required**   | Yes                                |
| **Defined in** | #/definitions/AuthenticationMethod |

**Description:** The method to authenticate your Amazon QuickSight account. 
Valid Values:

Must be one of:
* "ACTIVE_DIRECTORY"
* "IAM_AND_QUICKSIGHT"
* "IAM_ONLY"

### <a name="account_contactNumber"></a>1.2. Property `root > account > contactNumber`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A 10-digit phone number for the author of the Amazon QuickSight account to use for future communications.

### <a name="account_edition"></a>1.3. Property `root > account > edition`

|                |                       |
| -------------- | --------------------- |
| **Type**       | `enum (of string)`    |
| **Required**   | Yes                   |
| **Defined in** | #/definitions/Edition |

**Description:** The edition of Amazon QuickSight. 
Valid Values: STANDARD | ENTERPRISE | ENTERPRISE_AND_Q

Must be one of:
* "ENTERPRISE"
* "ENTERPRISE_AND_Q"
* "STANDARD"

### <a name="account_emailAddress"></a>1.4. Property `root > account > emailAddress`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The email address of the author of the Amazon QuickSight account to use for future communications.

### <a name="account_firstName"></a>1.5. Property `root > account > firstName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The first name of the author of the Amazon QuickSight account to use for future communications.

### <a name="account_glueResourceAccess"></a>1.6. Property `root > account > glueResourceAccess`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** List of Glue resources to which the QuickSight service role will be granted access.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                               | Description |
| ------------------------------------------------------------- | ----------- |
| [glueResourceAccess items](#account_glueResourceAccess_items) | -           |

#### <a name="autogenerated_heading_2"></a>1.6.1. root > account > glueResourceAccess > glueResourceAccess items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="account_ipRestrictions"></a>1.7. Property `root > account > ipRestrictions`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** List of IP CIDRs which will be provided access to the account via the QuickSight interface. IP access restrictions are disabled by default.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                     | Description |
| --------------------------------------------------- | ----------- |
| [IpRestrictionProps](#account_ipRestrictions_items) | -           |

#### <a name="autogenerated_heading_3"></a>1.7.1. root > account > ipRestrictions > IpRestrictionProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/IpRestrictionProps                        |

| Property                                                    | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [cidr](#account_ipRestrictions_items_cidr )               | No      | string | No         | -          | -                 |
| - [description](#account_ipRestrictions_items_description ) | No      | string | No         | -          | -                 |

##### <a name="account_ipRestrictions_items_cidr"></a>1.7.1.1. Property `root > account > ipRestrictions > ipRestrictions items > cidr`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

##### <a name="account_ipRestrictions_items_description"></a>1.7.1.2. Property `root > account > ipRestrictions > ipRestrictions items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="account_lastName"></a>1.8. Property `root > account > lastName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The last name of the author of the Amazon QuickSight account to use for future communications.

### <a name="account_notificationEmail"></a>1.9. Property `root > account > notificationEmail`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The email address that you want Amazon QuickSight to send notifications.

### <a name="account_securityGroupAccess"></a>1.10. Property `root > account > securityGroupAccess`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaSecurityGroupRuleProps                |

**Description:** Map of names to security group access definitions. Will be added as egrees/ingress rules to the QuickSight security group, permitting access
between the QS account and internal resources on your VPC.

| Property                                                 | Pattern | Type  | Deprecated | Definition | Title/Description |
| -------------------------------------------------------- | ------- | ----- | ---------- | ---------- | ----------------- |
| - [ipv4](#account_securityGroupAccess_ipv4 )             | No      | array | No         | -          | -                 |
| - [prefixList](#account_securityGroupAccess_prefixList ) | No      | array | No         | -          | -                 |
| - [sg](#account_securityGroupAccess_sg )                 | No      | array | No         | -          | -                 |

#### <a name="account_securityGroupAccess_ipv4"></a>1.10.1. Property `root > account > securityGroupAccess > ipv4`

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

| Each item of this array must be                         | Description |
| ------------------------------------------------------- | ----------- |
| [MdaaCidrPeer](#account_securityGroupAccess_ipv4_items) | -           |

##### <a name="autogenerated_heading_4"></a>1.10.1.1. root > account > securityGroupAccess > ipv4 > MdaaCidrPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaCidrPeer                              |

| Property                                                                | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| + [cidr](#account_securityGroupAccess_ipv4_items_cidr )                 | No      | string | No         | -          | -                 |
| - [description](#account_securityGroupAccess_ipv4_items_description )   | No      | string | No         | -          | -                 |
| - [port](#account_securityGroupAccess_ipv4_items_port )                 | No      | number | No         | -          | -                 |
| + [protocol](#account_securityGroupAccess_ipv4_items_protocol )         | No      | string | No         | -          | -                 |
| - [suppressions](#account_securityGroupAccess_ipv4_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#account_securityGroupAccess_ipv4_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="account_securityGroupAccess_ipv4_items_cidr"></a>1.10.1.1.1. Property `root > account > securityGroupAccess > ipv4 > ipv4 items > cidr`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="account_securityGroupAccess_ipv4_items_description"></a>1.10.1.1.2. Property `root > account > securityGroupAccess > ipv4 > ipv4 items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="account_securityGroupAccess_ipv4_items_port"></a>1.10.1.1.3. Property `root > account > securityGroupAccess > ipv4 > ipv4 items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="account_securityGroupAccess_ipv4_items_protocol"></a>1.10.1.1.4. Property `root > account > securityGroupAccess > ipv4 > ipv4 items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="account_securityGroupAccess_ipv4_items_suppressions"></a>1.10.1.1.5. Property `root > account > securityGroupAccess > ipv4 > ipv4 items > suppressions`

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

| Each item of this array must be                                                   | Description |
| --------------------------------------------------------------------------------- | ----------- |
| [NagSuppressionProps](#account_securityGroupAccess_ipv4_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_5"></a>1.10.1.1.5.1. root > account > securityGroupAccess > ipv4 > ipv4 items > suppressions > NagSuppressionProps

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/NagSuppressionProps                       |

| Property                                                                       | Pattern | Type   | Deprecated | Definition | Title/Description |
| ------------------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ----------------- |
| + [id](#account_securityGroupAccess_ipv4_items_suppressions_items_id )         | No      | string | No         | -          | -                 |
| + [reason](#account_securityGroupAccess_ipv4_items_suppressions_items_reason ) | No      | string | No         | -          | -                 |

###### <a name="account_securityGroupAccess_ipv4_items_suppressions_items_id"></a>1.10.1.1.5.1.1. Property `root > account > securityGroupAccess > ipv4 > ipv4 items > suppressions > suppressions items > id`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="account_securityGroupAccess_ipv4_items_suppressions_items_reason"></a>1.10.1.1.5.1.2. Property `root > account > securityGroupAccess > ipv4 > ipv4 items > suppressions > suppressions items > reason`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="account_securityGroupAccess_ipv4_items_toPort"></a>1.10.1.1.6. Property `root > account > securityGroupAccess > ipv4 > ipv4 items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

#### <a name="account_securityGroupAccess_prefixList"></a>1.10.2. Property `root > account > securityGroupAccess > prefixList`

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

| Each item of this array must be                                     | Description |
| ------------------------------------------------------------------- | ----------- |
| [MdaaPrefixListPeer](#account_securityGroupAccess_prefixList_items) | -           |

##### <a name="autogenerated_heading_6"></a>1.10.2.1. root > account > securityGroupAccess > prefixList > MdaaPrefixListPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaPrefixListPeer                        |

| Property                                                                      | Pattern | Type   | Deprecated | Definition | Title/Description |
| ----------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#account_securityGroupAccess_prefixList_items_description )   | No      | string | No         | -          | -                 |
| - [port](#account_securityGroupAccess_prefixList_items_port )                 | No      | number | No         | -          | -                 |
| + [prefixList](#account_securityGroupAccess_prefixList_items_prefixList )     | No      | string | No         | -          | -                 |
| + [protocol](#account_securityGroupAccess_prefixList_items_protocol )         | No      | string | No         | -          | -                 |
| - [suppressions](#account_securityGroupAccess_prefixList_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#account_securityGroupAccess_prefixList_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="account_securityGroupAccess_prefixList_items_description"></a>1.10.2.1.1. Property `root > account > securityGroupAccess > prefixList > prefixList items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="account_securityGroupAccess_prefixList_items_port"></a>1.10.2.1.2. Property `root > account > securityGroupAccess > prefixList > prefixList items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="account_securityGroupAccess_prefixList_items_prefixList"></a>1.10.2.1.3. Property `root > account > securityGroupAccess > prefixList > prefixList items > prefixList`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="account_securityGroupAccess_prefixList_items_protocol"></a>1.10.2.1.4. Property `root > account > securityGroupAccess > prefixList > prefixList items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="account_securityGroupAccess_prefixList_items_suppressions"></a>1.10.2.1.5. Property `root > account > securityGroupAccess > prefixList > prefixList items > suppressions`

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
| [NagSuppressionProps](#account_securityGroupAccess_prefixList_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_7"></a>1.10.2.1.5.1. root > account > securityGroupAccess > prefixList > prefixList items > suppressions > NagSuppressionProps

|                           |                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                |
| **Required**              | No                                                                                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                 |
| **Same definition as**    | [account_securityGroupAccess_ipv4_items_suppressions_items](#account_securityGroupAccess_ipv4_items_suppressions_items) |

###### <a name="account_securityGroupAccess_prefixList_items_toPort"></a>1.10.2.1.6. Property `root > account > securityGroupAccess > prefixList > prefixList items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

#### <a name="account_securityGroupAccess_sg"></a>1.10.3. Property `root > account > securityGroupAccess > sg`

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
| [MdaaSecurityGroupPeer](#account_securityGroupAccess_sg_items) | -           |

##### <a name="autogenerated_heading_8"></a>1.10.3.1. root > account > securityGroupAccess > sg > MdaaSecurityGroupPeer

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/MdaaSecurityGroupPeer                     |

| Property                                                              | Pattern | Type   | Deprecated | Definition | Title/Description |
| --------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [description](#account_securityGroupAccess_sg_items_description )   | No      | string | No         | -          | -                 |
| - [port](#account_securityGroupAccess_sg_items_port )                 | No      | number | No         | -          | -                 |
| + [protocol](#account_securityGroupAccess_sg_items_protocol )         | No      | string | No         | -          | -                 |
| + [sgId](#account_securityGroupAccess_sg_items_sgId )                 | No      | string | No         | -          | -                 |
| - [suppressions](#account_securityGroupAccess_sg_items_suppressions ) | No      | array  | No         | -          | -                 |
| - [toPort](#account_securityGroupAccess_sg_items_toPort )             | No      | number | No         | -          | -                 |

###### <a name="account_securityGroupAccess_sg_items_description"></a>1.10.3.1.1. Property `root > account > securityGroupAccess > sg > sg items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="account_securityGroupAccess_sg_items_port"></a>1.10.3.1.2. Property `root > account > securityGroupAccess > sg > sg items > port`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

###### <a name="account_securityGroupAccess_sg_items_protocol"></a>1.10.3.1.3. Property `root > account > securityGroupAccess > sg > sg items > protocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="account_securityGroupAccess_sg_items_sgId"></a>1.10.3.1.4. Property `root > account > securityGroupAccess > sg > sg items > sgId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="account_securityGroupAccess_sg_items_suppressions"></a>1.10.3.1.5. Property `root > account > securityGroupAccess > sg > sg items > suppressions`

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

| Each item of this array must be                                                 | Description |
| ------------------------------------------------------------------------------- | ----------- |
| [NagSuppressionProps](#account_securityGroupAccess_sg_items_suppressions_items) | -           |

###### <a name="autogenerated_heading_9"></a>1.10.3.1.5.1. root > account > securityGroupAccess > sg > sg items > suppressions > NagSuppressionProps

|                           |                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                |
| **Required**              | No                                                                                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                                                 |
| **Same definition as**    | [account_securityGroupAccess_ipv4_items_suppressions_items](#account_securityGroupAccess_ipv4_items_suppressions_items) |

###### <a name="account_securityGroupAccess_sg_items_toPort"></a>1.10.3.1.6. Property `root > account > securityGroupAccess > sg > sg items > toPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

### <a name="account_subnetIds"></a>1.11. Property `root > account > subnetIds`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | Yes               |

**Description:** The Subnet IDs to which the QS Account will be connected.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be             | Description |
| ------------------------------------------- | ----------- |
| [subnetIds items](#account_subnetIds_items) | -           |

#### <a name="autogenerated_heading_10"></a>1.11.1. root > account > subnetIds > subnetIds items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="account_vpcId"></a>1.12. Property `root > account > vpcId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The VPC to which the QS Account will be associated.

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

#### <a name="autogenerated_heading_11"></a>2.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

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

###### <a name="autogenerated_heading_12"></a>2.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

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

###### <a name="autogenerated_heading_13"></a>3.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

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

###### <a name="autogenerated_heading_14"></a>3.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

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
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-06 at 12:57:23 -0400

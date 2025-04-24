# Schema Docs

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |

| Property                                                             | Pattern | Type   | Deprecated | Definition                                       | Title/Description                                                                                                                                    |
| -------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [agents](#agents )                                                 | No      | object | No         | -                                                | -                                                                                                                                                    |
| - [locations](#locations )                                           | No      | object | No         | In #/definitions/LocationsByTypeConfig           | -                                                                                                                                                    |
| - [nag_suppressions](#nag_suppressions )                             | No      | object | No         | In #/definitions/MdaaNagSuppressions             | Nag suppressions                                                                                                                                     |
| - [service_catalog_product_config](#service_catalog_product_config ) | No      | object | No         | In #/definitions/MdaaServiceCatalogProductConfig | Service Catalog Config<br />If specified, the configured module will be deployed as a Service Catalog product instead of directly to the environment |
| - [tasks](#tasks )                                                   | No      | object | No         | -                                                | -                                                                                                                                                    |
| - [vpc](#vpc )                                                       | No      | object | No         | In #/definitions/VpcProps                        | -                                                                                                                                                    |

## <a name="agents"></a>1. Property `root > agents`

|                           |                                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                         |
| **Required**              | No                                                                                                               |
| **Additional properties** | [[Should-conform]](#agents_additionalProperties "Each additional property must conform to the following schema") |

| Property                            | Pattern | Type   | Deprecated | Definition                  | Title/Description |
| ----------------------------------- | ------- | ------ | ---------- | --------------------------- | ----------------- |
| - [](#agents_additionalProperties ) | No      | object | No         | In #/definitions/AgentProps | -                 |

### <a name="agents_additionalProperties"></a>1.1. Property `root > agents > AgentProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/AgentProps                                |

| Property                                                           | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------ | ------- | ------ | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [activationKey](#agents_additionalProperties_activationKey )     | No      | string | No         | -          | Your agent activation key. You can get the activation key either by sending an HTTP GET request with redirects that enable you to get the agent IP address (port 80). Alternatively, you can get it from the DataSync console.<br /><br />The redirect URL returned in the response provides you the activation key for your agent in the query string parameter \`activationKey\` . It might also include other activation-related parameters; however, these are merely defaults. The arguments you pass to this API call determine the actual configuration of your agent.<br />For more information, see [Creating and activating an agent](https://docs.aws.amazon.com/datasync/latest/userguide/activating-agent.html) in the *AWS DataSync User Guide.*                                                                                                                           |
| + [agentIpAddress](#agents_additionalProperties_agentIpAddress )   | No      | string | No         | -          | The IP address of the agent host. The values will be used to create an ingress rule for the task security group.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| - [securityGroupId](#agents_additionalProperties_securityGroupId ) | No      | string | No         | -          | The ID of the security group to be used to protect your data transfer task subnets, if created outside MDAA.<br />Otherwise, if not provided and the VPC ID is specified in vpcEndpoint configuration, MDAA will create VPC endpoint and security group and the security group will be used for this agent registration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| + [subnetId](#agents_additionalProperties_subnetId )               | No      | string | No         | -          | The identifiers of the subnets in which DataSync will create elastic network interfaces for each data transfer task. The agent that runs a task must be private. When you start a task that is associated with an agent created in a VPC, or one that has access to an IP address in a VPC, then the task is also private. In this case, DataSync creates four network interfaces for each task in your subnet. For a data transfer to work, the agent must be able to route to all these four network interfaces.                                                                                                                                                                                                                                                                                                                                                                       |
| - [vpcEndpointId](#agents_additionalProperties_vpcEndpointId )     | No      | string | No         | -          | The ID of the virtual private cloud (VPC) endpoint that the agent has access to. This is the client-side VPC endpoint, powered by AWS PrivateLink . If you don't have an AWS PrivateLink VPC endpoint, see [AWS PrivateLink and VPC endpoints](https://docs.aws.amazon.com//vpc/latest/userguide/endpoint-services-overview.html) in the *Amazon VPC User Guide* .<br /><br />For more information about activating your agent in a private network based on a VPC, see [Using AWS DataSync in a Virtual Private Cloud](https://docs.aws.amazon.com/datasync/latest/userguide/datasync-in-vpc.html) in the *AWS DataSync User Guide.*<br />A VPC endpoint ID looks like this: \`vpce-01234d5aff67890e1\`.<br /><br />If the parameter is not provided and the VPC ID is specified in vpcEndpoint configuration, MDAA will create VPC endpoint and security group for agent registration. |

#### <a name="agents_additionalProperties_activationKey"></a>1.1.1. Property `root > agents > additionalProperties > activationKey`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Your agent activation key. You can get the activation key either by sending an HTTP GET request with redirects that enable you to get the agent IP address (port 80). Alternatively, you can get it from the DataSync console.

The redirect URL returned in the response provides you the activation key for your agent in the query string parameter `activationKey` . It might also include other activation-related parameters; however, these are merely defaults. The arguments you pass to this API call determine the actual configuration of your agent.
For more information, see [Creating and activating an agent](https://docs.aws.amazon.com/datasync/latest/userguide/activating-agent.html) in the *AWS DataSync User Guide.*

#### <a name="agents_additionalProperties_agentIpAddress"></a>1.1.2. Property `root > agents > additionalProperties > agentIpAddress`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The IP address of the agent host. The values will be used to create an ingress rule for the task security group.

#### <a name="agents_additionalProperties_securityGroupId"></a>1.1.3. Property `root > agents > additionalProperties > securityGroupId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The ID of the security group to be used to protect your data transfer task subnets, if created outside MDAA.
Otherwise, if not provided and the VPC ID is specified in vpcEndpoint configuration, MDAA will create VPC endpoint and security group and the security group will be used for this agent registration.

#### <a name="agents_additionalProperties_subnetId"></a>1.1.4. Property `root > agents > additionalProperties > subnetId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The identifiers of the subnets in which DataSync will create elastic network interfaces for each data transfer task. The agent that runs a task must be private. When you start a task that is associated with an agent created in a VPC, or one that has access to an IP address in a VPC, then the task is also private. In this case, DataSync creates four network interfaces for each task in your subnet. For a data transfer to work, the agent must be able to route to all these four network interfaces.

#### <a name="agents_additionalProperties_vpcEndpointId"></a>1.1.5. Property `root > agents > additionalProperties > vpcEndpointId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The ID of the virtual private cloud (VPC) endpoint that the agent has access to. This is the client-side VPC endpoint, powered by AWS PrivateLink . If you don't have an AWS PrivateLink VPC endpoint, see [AWS PrivateLink and VPC endpoints](https://docs.aws.amazon.com//vpc/latest/userguide/endpoint-services-overview.html) in the *Amazon VPC User Guide* .

For more information about activating your agent in a private network based on a VPC, see [Using AWS DataSync in a Virtual Private Cloud](https://docs.aws.amazon.com/datasync/latest/userguide/datasync-in-vpc.html) in the *AWS DataSync User Guide.*
A VPC endpoint ID looks like this: `vpce-01234d5aff67890e1`.

If the parameter is not provided and the VPC ID is specified in vpcEndpoint configuration, MDAA will create VPC endpoint and security group for agent registration.

## <a name="locations"></a>2. Property `root > locations`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/LocationsByTypeConfig                     |

| Property                                     | Pattern | Type   | Deprecated | Definition | Title/Description |
| -------------------------------------------- | ------- | ------ | ---------- | ---------- | ----------------- |
| - [nfs](#locations_nfs )                     | No      | object | No         | -          | -                 |
| - [objectStorage](#locations_objectStorage ) | No      | object | No         | -          | -                 |
| - [s3](#locations_s3 )                       | No      | object | No         | -          | -                 |
| - [smb](#locations_smb )                     | No      | object | No         | -          | -                 |

### <a name="locations_nfs"></a>2.1. Property `root > locations > nfs`

|                           |                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                |
| **Required**              | No                                                                                                                      |
| **Additional properties** | [[Should-conform]](#locations_nfs_additionalProperties "Each additional property must conform to the following schema") |

| Property                                   | Pattern | Type   | Deprecated | Definition                        | Title/Description |
| ------------------------------------------ | ------- | ------ | ---------- | --------------------------------- | ----------------- |
| - [](#locations_nfs_additionalProperties ) | No      | object | No         | In #/definitions/LocationNfsProps | -                 |

#### <a name="locations_nfs_additionalProperties"></a>2.1.1. Property `root > locations > nfs > LocationNfsProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/LocationNfsProps                          |

| Property                                                                | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [agentArns](#locations_nfs_additionalProperties_agentArns )           | No      | array of string | No         | -          | MDAA custom parameter that refers to the generated agent name. The value will be used constructed as onPremConfig object.<br />Only either agentNames or agentArns can be specified, not both.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| - [agentNames](#locations_nfs_additionalProperties_agentNames )         | No      | array of string | No         | -          | MDAA custom parameter that refers to the generated agent name. The value will resolve to agent ARN (looked up from the generatedAgents) and be constructed as onPremConfig object.<br />Only either agentNames or agentArns can be specified, not both.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| - [nfsVersion](#locations_nfs_additionalProperties_nfsVersion )         | No      | string          | No         | -          | MDAA custom parameter to simplify configuration. The value will be used to construct MountOptions object.<br />Valid values: "AUTOMATIC" \| "NFS3" \| "NFSv4_0" \| "NFSv4_1"<br /><br />The NFS mount options that DataSync can use to mount your NFS share.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| + [serverHostname](#locations_nfs_additionalProperties_serverHostname ) | No      | string          | No         | -          | The name of the NFS server. This value is the IP address or Domain Name Service (DNS) name of the NFS server. An agent that is installed on-premises uses this hostname to mount the NFS server in a network.<br /><br />If you are copying data to or from your AWS Snowcone device, see [NFS Server on AWS Snowcone](https://docs.aws.amazon.com/datasync/latest/userguide/create-nfs-location.html#nfs-on-snowcone) for more information.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| + [subdirectory](#locations_nfs_additionalProperties_subdirectory )     | No      | string          | No         | -          | The subdirectory in the NFS file system that is used to read data from the NFS source location or write data to the NFS destination.<br />The NFS path should be a path that's exported by the NFS server, or a subdirectory of that path. The path should be such that it can be mounted by other NFS clients in your network.<br /><br />To see all the paths exported by your NFS server, run "showmount -e nfs-server-name" from an NFS client that has access to your server.<br />You can specify any directory that appears in the results, and any subdirectory of that directory. Ensure that the NFS export is accessible without Kerberos authentication.<br /><br />To transfer all the data in the folder you specified, DataSync needs to have permissions to read all the data.<br />To ensure this, either configure the NFS export with no_root_squash, or ensure that the permissions for all of the files that you want DataSync allow read access for all users. Doing either enables the agent to read the files. For the agent to access directories, you must additionally enable all execute access.<br /><br />If you are copying data to or from your AWS Snowcone device, see [NFS Server on AWS Snowcone](https://docs.aws.amazon.com/datasync/latest/userguide/create-nfs-location.html#nfs-on-snowcone) for more information. |

##### <a name="locations_nfs_additionalProperties_agentArns"></a>2.1.1.1. Property `root > locations > nfs > additionalProperties > agentArns`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** MDAA custom parameter that refers to the generated agent name. The value will be used constructed as onPremConfig object.
Only either agentNames or agentArns can be specified, not both.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                        | Description |
| ---------------------------------------------------------------------- | ----------- |
| [agentArns items](#locations_nfs_additionalProperties_agentArns_items) | -           |

###### <a name="autogenerated_heading_2"></a>2.1.1.1.1. root > locations > nfs > additionalProperties > agentArns > agentArns items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="locations_nfs_additionalProperties_agentNames"></a>2.1.1.2. Property `root > locations > nfs > additionalProperties > agentNames`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** MDAA custom parameter that refers to the generated agent name. The value will resolve to agent ARN (looked up from the generatedAgents) and be constructed as onPremConfig object.
Only either agentNames or agentArns can be specified, not both.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                          | Description |
| ------------------------------------------------------------------------ | ----------- |
| [agentNames items](#locations_nfs_additionalProperties_agentNames_items) | -           |

###### <a name="autogenerated_heading_3"></a>2.1.1.2.1. root > locations > nfs > additionalProperties > agentNames > agentNames items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="locations_nfs_additionalProperties_nfsVersion"></a>2.1.1.3. Property `root > locations > nfs > additionalProperties > nfsVersion`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** MDAA custom parameter to simplify configuration. The value will be used to construct MountOptions object.
Valid values: "AUTOMATIC" | "NFS3" | "NFSv4_0" | "NFSv4_1"

The NFS mount options that DataSync can use to mount your NFS share.

##### <a name="locations_nfs_additionalProperties_serverHostname"></a>2.1.1.4. Property `root > locations > nfs > additionalProperties > serverHostname`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the NFS server. This value is the IP address or Domain Name Service (DNS) name of the NFS server. An agent that is installed on-premises uses this hostname to mount the NFS server in a network.

If you are copying data to or from your AWS Snowcone device, see [NFS Server on AWS Snowcone](https://docs.aws.amazon.com/datasync/latest/userguide/create-nfs-location.html#nfs-on-snowcone) for more information.

##### <a name="locations_nfs_additionalProperties_subdirectory"></a>2.1.1.5. Property `root > locations > nfs > additionalProperties > subdirectory`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The subdirectory in the NFS file system that is used to read data from the NFS source location or write data to the NFS destination.
The NFS path should be a path that's exported by the NFS server, or a subdirectory of that path. The path should be such that it can be mounted by other NFS clients in your network.

To see all the paths exported by your NFS server, run "showmount -e nfs-server-name" from an NFS client that has access to your server.
You can specify any directory that appears in the results, and any subdirectory of that directory. Ensure that the NFS export is accessible without Kerberos authentication.

To transfer all the data in the folder you specified, DataSync needs to have permissions to read all the data.
To ensure this, either configure the NFS export with no_root_squash, or ensure that the permissions for all of the files that you want DataSync allow read access for all users. Doing either enables the agent to read the files. For the agent to access directories, you must additionally enable all execute access.

If you are copying data to or from your AWS Snowcone device, see [NFS Server on AWS Snowcone](https://docs.aws.amazon.com/datasync/latest/userguide/create-nfs-location.html#nfs-on-snowcone) for more information.

### <a name="locations_objectStorage"></a>2.2. Property `root > locations > objectStorage`

|                           |                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                          |
| **Required**              | No                                                                                                                                |
| **Additional properties** | [[Should-conform]](#locations_objectStorage_additionalProperties "Each additional property must conform to the following schema") |

| Property                                             | Pattern | Type   | Deprecated | Definition                                  | Title/Description |
| ---------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------- | ----------------- |
| - [](#locations_objectStorage_additionalProperties ) | No      | object | No         | In #/definitions/LocationObjectStorageProps | -                 |

#### <a name="locations_objectStorage_additionalProperties"></a>2.2.1. Property `root > locations > objectStorage > LocationObjectStorageProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/LocationObjectStorageProps                |

| Property                                                                          | Pattern | Type            | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------- | ------- | --------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [agentArns](#locations_objectStorage_additionalProperties_agentArns )           | No      | array of string | No         | -          | Specifies the Amazon Resource Names (ARNs) of the DataSync agents that can securely connect with your location.<br />Only either agentNames or agentArns can be specified, not both.                                                                                                                         |
| - [agentNames](#locations_objectStorage_additionalProperties_agentNames )         | No      | array of string | No         | -          | MDAA custom parameter that refers to the generated agent name. The value will resolve to agent ARN (looked up from the generatedAgents).<br />Only either agentNames or agentArns can be specified, not both.                                                                                                |
| + [bucketName](#locations_objectStorage_additionalProperties_bucketName )         | No      | string          | No         | -          | Specifies the name of the object storage bucket involved in the transfer.                                                                                                                                                                                                                                    |
| + [secretName](#locations_objectStorage_additionalProperties_secretName )         | No      | string          | No         | -          | The name of the secret in Secrets Manager that stores the credential (accessKey/user name and secretKey) of the object storage server.<br /> <br />The secret must have "accessKey" and "secretKey" fields.<br /><br />For example (in JSON format): {"accessKey":"<access_key>","secretKey":"<secret_key>"} |
| + [serverHostname](#locations_objectStorage_additionalProperties_serverHostname ) | No      | string          | No         | -          | Specifies the domain name or IP address of the object storage server. A DataSync agent uses this hostname to mount the object storage server in a network.                                                                                                                                                   |
| - [serverPort](#locations_objectStorage_additionalProperties_serverPort )         | No      | number          | No         | -          | Specifies the port that your object storage server accepts inbound network traffic on. Set to port 80 (HTTP), 443 (HTTPS), or a custom port if needed.                                                                                                                                                       |
| - [serverProtocol](#locations_objectStorage_additionalProperties_serverProtocol ) | No      | string          | No         | -          | Specifies the protocol that your object storage server uses to communicate.                                                                                                                                                                                                                                  |
| - [subdirectory](#locations_objectStorage_additionalProperties_subdirectory )     | No      | string          | No         | -          | Specifies the object prefix that DataSync reads from or writes to.                                                                                                                                                                                                                                           |

##### <a name="locations_objectStorage_additionalProperties_agentArns"></a>2.2.1.1. Property `root > locations > objectStorage > additionalProperties > agentArns`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** Specifies the Amazon Resource Names (ARNs) of the DataSync agents that can securely connect with your location.
Only either agentNames or agentArns can be specified, not both.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                  | Description |
| -------------------------------------------------------------------------------- | ----------- |
| [agentArns items](#locations_objectStorage_additionalProperties_agentArns_items) | -           |

###### <a name="autogenerated_heading_4"></a>2.2.1.1.1. root > locations > objectStorage > additionalProperties > agentArns > agentArns items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="locations_objectStorage_additionalProperties_agentNames"></a>2.2.1.2. Property `root > locations > objectStorage > additionalProperties > agentNames`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** MDAA custom parameter that refers to the generated agent name. The value will resolve to agent ARN (looked up from the generatedAgents).
Only either agentNames or agentArns can be specified, not both.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                                    | Description |
| ---------------------------------------------------------------------------------- | ----------- |
| [agentNames items](#locations_objectStorage_additionalProperties_agentNames_items) | -           |

###### <a name="autogenerated_heading_5"></a>2.2.1.2.1. root > locations > objectStorage > additionalProperties > agentNames > agentNames items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="locations_objectStorage_additionalProperties_bucketName"></a>2.2.1.3. Property `root > locations > objectStorage > additionalProperties > bucketName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Specifies the name of the object storage bucket involved in the transfer.

##### <a name="locations_objectStorage_additionalProperties_secretName"></a>2.2.1.4. Property `root > locations > objectStorage > additionalProperties > secretName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the secret in Secrets Manager that stores the credential (accessKey/user name and secretKey) of the object storage server.

The secret must have "accessKey" and "secretKey" fields.

For example (in JSON format): {"accessKey":"<access_key>","secretKey":"<secret_key>"}

##### <a name="locations_objectStorage_additionalProperties_serverHostname"></a>2.2.1.5. Property `root > locations > objectStorage > additionalProperties > serverHostname`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** Specifies the domain name or IP address of the object storage server. A DataSync agent uses this hostname to mount the object storage server in a network.

##### <a name="locations_objectStorage_additionalProperties_serverPort"></a>2.2.1.6. Property `root > locations > objectStorage > additionalProperties > serverPort`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** Specifies the port that your object storage server accepts inbound network traffic on. Set to port 80 (HTTP), 443 (HTTPS), or a custom port if needed.

##### <a name="locations_objectStorage_additionalProperties_serverProtocol"></a>2.2.1.7. Property `root > locations > objectStorage > additionalProperties > serverProtocol`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies the protocol that your object storage server uses to communicate.

##### <a name="locations_objectStorage_additionalProperties_subdirectory"></a>2.2.1.8. Property `root > locations > objectStorage > additionalProperties > subdirectory`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies the object prefix that DataSync reads from or writes to.

### <a name="locations_s3"></a>2.3. Property `root > locations > s3`

|                           |                                                                                                                        |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                               |
| **Required**              | No                                                                                                                     |
| **Additional properties** | [[Should-conform]](#locations_s3_additionalProperties "Each additional property must conform to the following schema") |

| Property                                  | Pattern | Type   | Deprecated | Definition                       | Title/Description |
| ----------------------------------------- | ------- | ------ | ---------- | -------------------------------- | ----------------- |
| - [](#locations_s3_additionalProperties ) | No      | object | No         | In #/definitions/LocationS3Props | -                 |

#### <a name="locations_s3_additionalProperties"></a>2.3.1. Property `root > locations > s3 > LocationS3Props`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/LocationS3Props                           |

| Property                                                                         | Pattern | Type             | Deprecated | Definition | Title/Description                                                                                                                                                                                                                       |
| -------------------------------------------------------------------------------- | ------- | ---------------- | ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [bucketAccessRoleArn](#locations_s3_additionalProperties_bucketAccessRoleArn ) | No      | string           | No         | -          | MDAA custom parameter to simplify the configuration. This value will be use to construct S3Config.<br />The Amazon Resource Name (ARN) of the AWS Identity and Access Management (IAM) role that is used to access an Amazon S3 bucket. |
| + [s3BucketArn](#locations_s3_additionalProperties_s3BucketArn )                 | No      | string           | No         | -          | The ARN of the Amazon S3 bucket.                                                                                                                                                                                                        |
| - [s3StorageClass](#locations_s3_additionalProperties_s3StorageClass )           | No      | enum (of string) | No         | -          | The Amazon S3 storage class that you want to store your files in when this location is used as a task destination.                                                                                                                      |
| - [subdirectory](#locations_s3_additionalProperties_subdirectory )               | No      | string           | No         | -          | A subdirectory in the Amazon S3 bucket.<br /><br />> \`Subdirectory\` must be specified with forward slashes. For example, \`/path/to/folder\` .                                                                                        |

##### <a name="locations_s3_additionalProperties_bucketAccessRoleArn"></a>2.3.1.1. Property `root > locations > s3 > additionalProperties > bucketAccessRoleArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** MDAA custom parameter to simplify the configuration. This value will be use to construct S3Config.
The Amazon Resource Name (ARN) of the AWS Identity and Access Management (IAM) role that is used to access an Amazon S3 bucket.

##### <a name="locations_s3_additionalProperties_s3BucketArn"></a>2.3.1.2. Property `root > locations > s3 > additionalProperties > s3BucketArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ARN of the Amazon S3 bucket.

##### <a name="locations_s3_additionalProperties_s3StorageClass"></a>2.3.1.3. Property `root > locations > s3 > additionalProperties > s3StorageClass`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

**Description:** The Amazon S3 storage class that you want to store your files in when this location is used as a task destination.

Must be one of:
* "DEEP_ARCHIVE"
* "GLACIER"
* "INTELLIGENT_TIERING"
* "ONEZONE_IA"
* "OUTPOSTS"
* "STANDARD"
* "STANDARD_IA"

##### <a name="locations_s3_additionalProperties_subdirectory"></a>2.3.1.4. Property `root > locations > s3 > additionalProperties > subdirectory`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A subdirectory in the Amazon S3 bucket.

> `Subdirectory` must be specified with forward slashes. For example, `/path/to/folder` .

### <a name="locations_smb"></a>2.4. Property `root > locations > smb`

|                           |                                                                                                                         |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                |
| **Required**              | No                                                                                                                      |
| **Additional properties** | [[Should-conform]](#locations_smb_additionalProperties "Each additional property must conform to the following schema") |

| Property                                   | Pattern | Type   | Deprecated | Definition                        | Title/Description |
| ------------------------------------------ | ------- | ------ | ---------- | --------------------------------- | ----------------- |
| - [](#locations_smb_additionalProperties ) | No      | object | No         | In #/definitions/LocationSmbProps | -                 |

#### <a name="locations_smb_additionalProperties"></a>2.4.1. Property `root > locations > smb > LocationSmbProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/LocationSmbProps                          |

| Property                                                                | Pattern | Type             | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------- | ------- | ---------------- | ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [agentArns](#locations_smb_additionalProperties_agentArns )           | No      | array of string  | No         | -          | The Amazon Resource Names (ARNs) of agents to use for a Server Message Block (SMB) location.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| - [agentNames](#locations_smb_additionalProperties_agentNames )         | No      | array of string  | No         | -          | MDAA custom parameter that refers to the generated agent name. The value will resolve to agent ARN (looked up from the generatedAgents)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| - [domain](#locations_smb_additionalProperties_domain )                 | No      | string           | No         | -          | The name of the Windows domain that the SMB server belongs to.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| + [secretName](#locations_smb_additionalProperties_secretName )         | No      | string           | No         | -          | The name of the secret in Secrets Manager that stores the credential (domain, user and password) of the user in SMB File Server that can mount the share and has the permissions to access files and folders in the SMB share.<br /> <br />The secret must have "user" and "password" fields.<br /><br />For example (in JSON format): {"user":"<username>","password":"<password>"}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| + [serverHostname](#locations_smb_additionalProperties_serverHostname ) | No      | string           | No         | -          | The name of the SMB server. This value is the IP address or Domain Name Service (DNS) name of the SMB server. An agent that is installed on-premises uses this hostname to mount the SMB server in a network.<br /><br />> This name must either be DNS-compliant or must be an IP version 4 (IPv4) address.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| - [smbVersion](#locations_smb_additionalProperties_smbVersion )         | No      | enum (of string) | No         | -          | MDAA custom parameter to simplify configuration. The value will be used to construct MountOptions object.<br />Valid values: "AUTOMATIC" \| "SMB2" \| "SMB3"<br />The mount options used by DataSync to access the SMB server.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| + [subdirectory](#locations_smb_additionalProperties_subdirectory )     | No      | string           | No         | -          | The subdirectory in the SMB file system that is used to read data from the SMB source location or write data to the SMB destination. The SMB path should be a path that's exported by the SMB server, or a subdirectory of that path. The path should be such that it can be mounted by other SMB clients in your network.<br /><br />> \`Subdirectory\` must be specified with forward slashes. For example, \`/path/to/folder\` .<br /><br />To transfer all the data in the folder you specified, DataSync must have permissions to mount the SMB share, as well as to access all the data in that share. To ensure this, either make sure that the user name and password specified belongs to the user who can mount the share, and who has the appropriate permissions for all of the files and directories that you want DataSync to access, or use credentials of a member of the Backup Operators group to mount the share. Doing either one enables the agent to access the data. For the agent to access directories, you must additionally enable all execute access. |

##### <a name="locations_smb_additionalProperties_agentArns"></a>2.4.1.1. Property `root > locations > smb > additionalProperties > agentArns`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** The Amazon Resource Names (ARNs) of agents to use for a Server Message Block (SMB) location.

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                        | Description |
| ---------------------------------------------------------------------- | ----------- |
| [agentArns items](#locations_smb_additionalProperties_agentArns_items) | -           |

###### <a name="autogenerated_heading_6"></a>2.4.1.1.1. root > locations > smb > additionalProperties > agentArns > agentArns items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="locations_smb_additionalProperties_agentNames"></a>2.4.1.2. Property `root > locations > smb > additionalProperties > agentNames`

|              |                   |
| ------------ | ----------------- |
| **Type**     | `array of string` |
| **Required** | No                |

**Description:** MDAA custom parameter that refers to the generated agent name. The value will resolve to agent ARN (looked up from the generatedAgents)

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                          | Description |
| ------------------------------------------------------------------------ | ----------- |
| [agentNames items](#locations_smb_additionalProperties_agentNames_items) | -           |

###### <a name="autogenerated_heading_7"></a>2.4.1.2.1. root > locations > smb > additionalProperties > agentNames > agentNames items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

##### <a name="locations_smb_additionalProperties_domain"></a>2.4.1.3. Property `root > locations > smb > additionalProperties > domain`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The name of the Windows domain that the SMB server belongs to.

##### <a name="locations_smb_additionalProperties_secretName"></a>2.4.1.4. Property `root > locations > smb > additionalProperties > secretName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the secret in Secrets Manager that stores the credential (domain, user and password) of the user in SMB File Server that can mount the share and has the permissions to access files and folders in the SMB share.

The secret must have "user" and "password" fields.

For example (in JSON format): {"user":"<username>","password":"<password>"}

##### <a name="locations_smb_additionalProperties_serverHostname"></a>2.4.1.5. Property `root > locations > smb > additionalProperties > serverHostname`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The name of the SMB server. This value is the IP address or Domain Name Service (DNS) name of the SMB server. An agent that is installed on-premises uses this hostname to mount the SMB server in a network.

> This name must either be DNS-compliant or must be an IP version 4 (IPv4) address.

##### <a name="locations_smb_additionalProperties_smbVersion"></a>2.4.1.6. Property `root > locations > smb > additionalProperties > smbVersion`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

**Description:** MDAA custom parameter to simplify configuration. The value will be used to construct MountOptions object.
Valid values: "AUTOMATIC" | "SMB2" | "SMB3"
The mount options used by DataSync to access the SMB server.

Must be one of:
* "AUTOMATIC"
* "SMB2"
* "SMB3"

##### <a name="locations_smb_additionalProperties_subdirectory"></a>2.4.1.7. Property `root > locations > smb > additionalProperties > subdirectory`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The subdirectory in the SMB file system that is used to read data from the SMB source location or write data to the SMB destination. The SMB path should be a path that's exported by the SMB server, or a subdirectory of that path. The path should be such that it can be mounted by other SMB clients in your network.

> `Subdirectory` must be specified with forward slashes. For example, `/path/to/folder` .

To transfer all the data in the folder you specified, DataSync must have permissions to mount the SMB share, as well as to access all the data in that share. To ensure this, either make sure that the user name and password specified belongs to the user who can mount the share, and who has the appropriate permissions for all of the files and directories that you want DataSync to access, or use credentials of a member of the Backup Operators group to mount the share. Doing either one enables the agent to access the data. For the agent to access directories, you must additionally enable all execute access.

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

#### <a name="autogenerated_heading_8"></a>3.1.1. root > nag_suppressions > by_path > MdaaNagSuppressionByPath

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

###### <a name="autogenerated_heading_9"></a>3.1.1.2.1. root > nag_suppressions > by_path > by_path items > suppressions > suppressions items

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

## <a name="service_catalog_product_config"></a>4. Property `root > service_catalog_product_config`

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

### <a name="service_catalog_product_config_launch_role_name"></a>4.1. Property `root > service_catalog_product_config > launch_role_name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

### <a name="service_catalog_product_config_name"></a>4.2. Property `root > service_catalog_product_config > name`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_owner"></a>4.3. Property `root > service_catalog_product_config > owner`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="service_catalog_product_config_parameters"></a>4.4. Property `root > service_catalog_product_config > parameters`

|                           |                                                                                                                                                     |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                                                            |
| **Required**              | No                                                                                                                                                  |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                               | Pattern | Type   | Deprecated | Definition                                         | Title/Description |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | -------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogParameterConfig | -                 |

#### <a name="service_catalog_product_config_parameters_additionalProperties"></a>4.4.1. Property `root > service_catalog_product_config > parameters > MdaaServiceCatalogParameterConfig`

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

##### <a name="service_catalog_product_config_parameters_additionalProperties_constraints"></a>4.4.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_description"></a>4.4.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules"></a>4.4.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules`

|                           |                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Type**                  | `object`                                                                                                                                                                                   |
| **Required**              | Yes                                                                                                                                                                                        |
| **Additional properties** | [[Should-conform]](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties "Each additional property must conform to the following schema") |

| Property                                                                                                      | Pattern | Type   | Deprecated | Definition                                              | Title/Description |
| ------------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ------------------------------------------------------- | ----------------- |
| - [](#service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties ) | No      | object | No         | In #/definitions/MdaaServiceCatalogConstraintRuleConfig | -                 |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties"></a>4.4.1.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > MdaaServiceCatalogConstraintRuleConfig`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions"></a>4.4.1.1.2.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions`

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

###### <a name="autogenerated_heading_10"></a>4.4.1.1.2.1.1.1. root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > MdaaServiceCatalogConstraintRuleAssertionConfig

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_assert"></a>4.4.1.1.2.1.1.1.1. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > assert`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_assertions_items_description"></a>4.4.1.1.2.1.1.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > assertions > assertions items > description`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

###### <a name="service_catalog_product_config_parameters_additionalProperties_constraints_rules_additionalProperties_condition"></a>4.4.1.1.2.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > constraints > rules > additionalProperties > condition`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | Yes                                                                       |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Defined in**            | #/definitions/MdaaServiceCatalogConstraintRuleCondititionConfig           |

##### <a name="service_catalog_product_config_parameters_additionalProperties_props"></a>4.4.1.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props`

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

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedPattern"></a>4.4.1.2.1. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedPattern`

|              |                                                         |
| ------------ | ------------------------------------------------------- |
| **Type**     | `string`                                                |
| **Required** | No                                                      |
| **Default**  | `"- No constraints on patterns allowed for parameter."` |

**Description:** A regular expression that represents the patterns to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_allowedValues"></a>4.4.1.2.2. Property `root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues`

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

###### <a name="autogenerated_heading_11"></a>4.4.1.2.2.1. root > service_catalog_product_config > parameters > additionalProperties > props > allowedValues > allowedValues items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_constraintDescription"></a>4.4.1.2.3. Property `root > service_catalog_product_config > parameters > additionalProperties > props > constraintDescription`

|              |                                                                                        |
| ------------ | -------------------------------------------------------------------------------------- |
| **Type**     | `string`                                                                               |
| **Required** | No                                                                                     |
| **Default**  | `"- No description with customized error message when user specifies invalid values."` |

**Description:** A string that explains a constraint when the constraint is violated.
For example, without a constraint description, a parameter that has an allowed
pattern of [A-Za-z0-9]+ displays the following error message when the user specifies
an invalid value:

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_default"></a>4.4.1.2.4. Property `root > service_catalog_product_config > parameters > additionalProperties > props > default`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                  |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |
| **Default**               | `"- No default value for parameter."`                                     |

**Description:** A value of the appropriate type for the template to use if no value is specified
when a stack is created. If you define constraints for the parameter, you must specify
a value that adheres to those constraints.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_description"></a>4.4.1.2.5. Property `root > service_catalog_product_config > parameters > additionalProperties > props > description`

|              |                                         |
| ------------ | --------------------------------------- |
| **Type**     | `string`                                |
| **Required** | No                                      |
| **Default**  | `"- No description for the parameter."` |

**Description:** A string of up to 4000 characters that describes the parameter.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxLength"></a>4.4.1.2.6. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the largest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_maxValue"></a>4.4.1.2.7. Property `root > service_catalog_product_config > parameters > additionalProperties > props > maxValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the largest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minLength"></a>4.4.1.2.8. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minLength`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** An integer value that determines the smallest number of characters you want to allow for String types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_minValue"></a>4.4.1.2.9. Property `root > service_catalog_product_config > parameters > additionalProperties > props > minValue`

|              |             |
| ------------ | ----------- |
| **Type**     | `number`    |
| **Required** | No          |
| **Default**  | `"- None."` |

**Description:** A numeric value that determines the smallest numeric value you want to allow for Number types.

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_noEcho"></a>4.4.1.2.10. Property `root > service_catalog_product_config > parameters > additionalProperties > props > noEcho`

|              |                                        |
| ------------ | -------------------------------------- |
| **Type**     | `boolean`                              |
| **Required** | No                                     |
| **Default**  | `"- Parameter values are not masked."` |

**Description:** Whether to mask the parameter value when anyone makes a call that describes the stack.
If you set the value to ``true``, the parameter value is masked with asterisks (``*****``).

###### <a name="service_catalog_product_config_parameters_additionalProperties_props_type"></a>4.4.1.2.11. Property `root > service_catalog_product_config > parameters > additionalProperties > props > type`

|              |            |
| ------------ | ---------- |
| **Type**     | `string`   |
| **Required** | No         |
| **Default**  | `"String"` |

**Description:** The data type for the parameter (DataType).

### <a name="service_catalog_product_config_portfolio_arn"></a>4.5. Property `root > service_catalog_product_config > portfolio_arn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

## <a name="tasks"></a>5. Property `root > tasks`

|                           |                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                                        |
| **Required**              | No                                                                                                              |
| **Additional properties** | [[Should-conform]](#tasks_additionalProperties "Each additional property must conform to the following schema") |

| Property                           | Pattern | Type   | Deprecated | Definition                 | Title/Description |
| ---------------------------------- | ------- | ------ | ---------- | -------------------------- | ----------------- |
| - [](#tasks_additionalProperties ) | No      | object | No         | In #/definitions/TaskProps | -                 |

### <a name="tasks_additionalProperties"></a>5.1. Property `root > tasks > TaskProps`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/TaskProps                                 |

| Property                                                                            | Pattern | Type        | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------------------------------------- | ------- | ----------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [destinationLocationArn](#tasks_additionalProperties_destinationLocationArn )     | No      | string      | No         | -          | The Amazon Resource Name (ARN) of an AWS storage resource's location.                                                                                                                                                                                                                                                                                                                                      |
| - [destinationLocationName](#tasks_additionalProperties_destinationLocationName )   | No      | string      | No         | -          | MDAA custom parameter that refers to the generated destination location name. The value will resolve to destination location ARN (looked up from the generatedLocations).<br />Only either destinationLocationName or destinationLocationArn can be specified, not both.                                                                                                                                   |
| - [excludes](#tasks_additionalProperties_excludes )                                 | No      | array       | No         | -          | Specifies a list of filter rules that exclude specific data during your transfer.<br />For more information and examples, see [Filtering data transferred by DataSync](https://docs.aws.amazon.com/datasync/latest/userguide/filtering.html).                                                                                                                                                              |
| - [includes](#tasks_additionalProperties_includes )                                 | No      | array       | No         | -          | Specifies a list of filter rules that include specific data during your transfer.<br />For more information and examples, see [Filtering data transferred by DataSync](https://docs.aws.amazon.com/datasync/latest/userguide/filtering.html).                                                                                                                                                              |
| - [logGroupEncryptionKeyArn](#tasks_additionalProperties_logGroupEncryptionKeyArn ) | No      | string      | No         | -          | MDAA custom parameter. The ARN of the KMS key that will be used to encrypt the Task logging.<br />If this parameter is not specified, MDAA will create a new KMS key.                                                                                                                                                                                                                                      |
| - [options](#tasks_additionalProperties_options )                                   | No      | Combination | No         | -          | Specifies the configuration options for a task. Some options include preserving file or object metadata and verifying data integrity.<br /><br />You can also override these options before starting an individual run of a task (also known as a task execution).<br />For more information, see [StartTaskExecution](https://docs.aws.amazon.com/datasync/latest/userguide/API_StartTaskExecution.html). |
| - [schedule](#tasks_additionalProperties_schedule )                                 | No      | Combination | No         | -          | Specifies a schedule used to periodically transfer files from a source to a destination location. The schedule should be specified in UTC time.<br />For more information, see [Scheduling your task](https://docs.aws.amazon.com/datasync/latest/userguide/task-scheduling.html).                                                                                                                         |
| - [sourceLocationArn](#tasks_additionalProperties_sourceLocationArn )               | No      | string      | No         | -          | The Amazon Resource Name (ARN) of the source location for the task.                                                                                                                                                                                                                                                                                                                                        |
| - [sourceLocationName](#tasks_additionalProperties_sourceLocationName )             | No      | string      | No         | -          | MDAA custom parameter that refers to the generated source location name. The value will resolve to source location ARN (looked up from the generatedLocations).<br />Only either sourceLocationName or sourceLocationArn can be specified, not both.                                                                                                                                                       |

#### <a name="tasks_additionalProperties_destinationLocationArn"></a>5.1.1. Property `root > tasks > additionalProperties > destinationLocationArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The Amazon Resource Name (ARN) of an AWS storage resource's location.

#### <a name="tasks_additionalProperties_destinationLocationName"></a>5.1.2. Property `root > tasks > additionalProperties > destinationLocationName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** MDAA custom parameter that refers to the generated destination location name. The value will resolve to destination location ARN (looked up from the generatedLocations).
Only either destinationLocationName or destinationLocationArn can be specified, not both.

#### <a name="tasks_additionalProperties_excludes"></a>5.1.3. Property `root > tasks > additionalProperties > excludes`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** Specifies a list of filter rules that exclude specific data during your transfer.
For more information and examples, see [Filtering data transferred by DataSync](https://docs.aws.amazon.com/datasync/latest/userguide/filtering.html).

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                          | Description                                                                                                           |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [CfnTask.FilterRuleProperty](#tasks_additionalProperties_excludes_items) | Specifies which files, folders, and objects to include or exclude when transferring files from source to destination. |

##### <a name="autogenerated_heading_12"></a>5.1.3.1. root > tasks > additionalProperties > excludes > CfnTask.FilterRuleProperty

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnTask.FilterRuleProperty                |

**Description:** Specifies which files, folders, and objects to include or exclude when transferring files from source to destination.

| Property                                                               | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                |
| ---------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [filterType](#tasks_additionalProperties_excludes_items_filterType ) | No      | string | No         | -          | The type of filter rule to apply.<br /><br />AWS DataSync only supports the SIMPLE_PATTERN rule type.                                                                            |
| - [value](#tasks_additionalProperties_excludes_items_value )           | No      | string | No         | -          | A single filter string that consists of the patterns to include or exclude.<br /><br />The patterns are delimited by "\|" (that is, a pipe), for example: \`/folder1\|/folder2\` |

###### <a name="tasks_additionalProperties_excludes_items_filterType"></a>5.1.3.1.1. Property `root > tasks > additionalProperties > excludes > excludes items > filterType`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The type of filter rule to apply.

AWS DataSync only supports the SIMPLE_PATTERN rule type.

###### <a name="tasks_additionalProperties_excludes_items_value"></a>5.1.3.1.2. Property `root > tasks > additionalProperties > excludes > excludes items > value`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A single filter string that consists of the patterns to include or exclude.

The patterns are delimited by "|" (that is, a pipe), for example: `/folder1|/folder2`

#### <a name="tasks_additionalProperties_includes"></a>5.1.4. Property `root > tasks > additionalProperties > includes`

|              |         |
| ------------ | ------- |
| **Type**     | `array` |
| **Required** | No      |

**Description:** Specifies a list of filter rules that include specific data during your transfer.
For more information and examples, see [Filtering data transferred by DataSync](https://docs.aws.amazon.com/datasync/latest/userguide/filtering.html).

|                      | Array restrictions |
| -------------------- | ------------------ |
| **Min items**        | N/A                |
| **Max items**        | N/A                |
| **Items unicity**    | False              |
| **Additional items** | False              |
| **Tuple validation** | See below          |

| Each item of this array must be                                          | Description                                                                                                           |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| [CfnTask.FilterRuleProperty](#tasks_additionalProperties_includes_items) | Specifies which files, folders, and objects to include or exclude when transferring files from source to destination. |

##### <a name="autogenerated_heading_13"></a>5.1.4.1. root > tasks > additionalProperties > includes > CfnTask.FilterRuleProperty

|                           |                                                                                         |
| ------------------------- | --------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                |
| **Required**              | No                                                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                 |
| **Same definition as**    | [tasks_additionalProperties_excludes_items](#tasks_additionalProperties_excludes_items) |

**Description:** Specifies which files, folders, and objects to include or exclude when transferring files from source to destination.

#### <a name="tasks_additionalProperties_logGroupEncryptionKeyArn"></a>5.1.5. Property `root > tasks > additionalProperties > logGroupEncryptionKeyArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** MDAA custom parameter. The ARN of the KMS key that will be used to encrypt the Task logging.
If this parameter is not specified, MDAA will create a new KMS key.

#### <a name="tasks_additionalProperties_options"></a>5.1.6. Property `root > tasks > additionalProperties > options`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Specifies the configuration options for a task. Some options include preserving file or object metadata and verifying data integrity.

You can also override these options before starting an individual run of a task (also known as a task execution).
For more information, see [StartTaskExecution](https://docs.aws.amazon.com/datasync/latest/userguide/API_StartTaskExecution.html).

| Any of(Option)                                                          |
| ----------------------------------------------------------------------- |
| [IResolvable](#tasks_additionalProperties_options_anyOf_i0)             |
| [CfnTask.OptionsProperty](#tasks_additionalProperties_options_anyOf_i1) |

##### <a name="tasks_additionalProperties_options_anyOf_i0"></a>5.1.6.1. Property `root > tasks > additionalProperties > options > anyOf > IResolvable`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/IResolvable                               |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

| Property                                                                       | Pattern | Type             | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------ | ------- | ---------------- | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [creationStack](#tasks_additionalProperties_options_anyOf_i0_creationStack ) | No      | array of string  | No         | -          | The creation stack of this resolvable which will be appended to errors<br />thrown during resolution.<br /><br />This may return an array with a single informational element indicating how<br />to get this property populated, if it was skipped for performance reasons. |
| - [typeHint](#tasks_additionalProperties_options_anyOf_i0_typeHint )           | No      | enum (of string) | No         | -          | The type that this token will likely resolve to.                                                                                                                                                                                                                             |

###### <a name="tasks_additionalProperties_options_anyOf_i0_creationStack"></a>5.1.6.1.1. Property `root > tasks > additionalProperties > options > anyOf > item 0 > creationStack`

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

| Each item of this array must be                                                         | Description |
| --------------------------------------------------------------------------------------- | ----------- |
| [creationStack items](#tasks_additionalProperties_options_anyOf_i0_creationStack_items) | -           |

###### <a name="autogenerated_heading_14"></a>5.1.6.1.1.1. root > tasks > additionalProperties > options > anyOf > item 0 > creationStack > creationStack items

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

###### <a name="tasks_additionalProperties_options_anyOf_i0_typeHint"></a>5.1.6.1.2. Property `root > tasks > additionalProperties > options > anyOf > item 0 > typeHint`

|              |                    |
| ------------ | ------------------ |
| **Type**     | `enum (of string)` |
| **Required** | No                 |

**Description:** The type that this token will likely resolve to.

Must be one of:
* "number"
* "string"
* "string-list"

##### <a name="tasks_additionalProperties_options_anyOf_i1"></a>5.1.6.2. Property `root > tasks > additionalProperties > options > anyOf > CfnTask.OptionsProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnTask.OptionsProperty                   |

**Description:** Represents the options that are available to control the behavior of a [StartTaskExecution](https://docs.aws.amazon.com/datasync/latest/userguide/API_StartTaskExecution.html) operation. This behavior includes preserving metadata, such as user ID (UID), group ID (GID), and file permissions; overwriting files in the destination; data integrity verification; and so on.

A task has a set of default options associated with it. If you don't specify an option in [StartTaskExecution](https://docs.aws.amazon.com/datasync/latest/userguide/API_StartTaskExecution.html) , the default value is used. You can override the default options on each task execution by specifying an overriding `Options` value to [StartTaskExecution](https://docs.aws.amazon.com/datasync/latest/userguide/API_StartTaskExecution.html) .

| Property                                                                                                   | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| - [atime](#tasks_additionalProperties_options_anyOf_i1_atime )                                             | No      | string | No         | -          | A file metadata value that shows the last time that a file was accessed (that is, when the file was read or written to).<br /><br />If you set \`Atime\` to \`BEST_EFFORT\` , AWS DataSync attempts to preserve the original \`Atime\` attribute on all source files (that is, the version before the PREPARING phase). However, \`Atime\` 's behavior is not fully standard across platforms, so AWS DataSync can only do this on a best-effort basis.<br /><br />Default value: \`BEST_EFFORT\`<br /><br />\`BEST_EFFORT\` : Attempt to preserve the per-file \`Atime\` value (recommended).<br /><br />\`NONE\` : Ignore \`Atime\` .<br /><br />> If \`Atime\` is set to \`BEST_EFFORT\` , \`Mtime\` must be set to \`PRESERVE\` .<br />><br />> If \`Atime\` is set to \`NONE\` , \`Mtime\` must also be \`NONE\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| - [bytesPerSecond](#tasks_additionalProperties_options_anyOf_i1_bytesPerSecond )                           | No      | number | No         | -          | A value that limits the bandwidth used by AWS DataSync .<br /><br />For example, if you want AWS DataSync to use a maximum of 1 MB, set this value to \`1048576\` (=1024*1024).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| - [gid](#tasks_additionalProperties_options_anyOf_i1_gid )                                                 | No      | string | No         | -          | The group ID (GID) of the file's owners.<br /><br />Default value: \`INT_VALUE\`<br /><br />\`INT_VALUE\` : Preserve the integer value of the user ID (UID) and group ID (GID) (recommended).<br /><br />\`NAME\` : Currently not supported.<br /><br />\`NONE\` : Ignore the UID and GID.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| - [logLevel](#tasks_additionalProperties_options_anyOf_i1_logLevel )                                       | No      | string | No         | -          | Specifies the type of logs that DataSync publishes to a Amazon CloudWatch Logs log group.<br /><br />To specify the log group, see [CloudWatchLogGroupArn](https://docs.aws.amazon.com/datasync/latest/userguide/API_CreateTask.html#DataSync-CreateTask-request-CloudWatchLogGroupArn) .<br /><br />- \`BASIC\` - Publishes logs with only basic information (such as transfer errors).<br />- \`TRANSFER\` - Publishes logs for all files or objects that your DataSync task transfers and performs data-integrity checks on.<br />- \`OFF\` - No logs are published.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| - [mtime](#tasks_additionalProperties_options_anyOf_i1_mtime )                                             | No      | string | No         | -          | A value that indicates the last time that a file was modified (that is, a file was written to) before the PREPARING phase.<br /><br />This option is required for cases when you need to run the same task more than one time.<br /><br />Default value: \`PRESERVE\`<br /><br />\`PRESERVE\` : Preserve original \`Mtime\` (recommended)<br /><br />\`NONE\` : Ignore \`Mtime\` .<br /><br />> If \`Mtime\` is set to \`PRESERVE\` , \`Atime\` must be set to \`BEST_EFFORT\` .<br />><br />> If \`Mtime\` is set to \`NONE\` , \`Atime\` must also be set to \`NONE\` .                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| - [objectTags](#tasks_additionalProperties_options_anyOf_i1_objectTags )                                   | No      | string | No         | -          | Specifies whether you want DataSync to \`PRESERVE\` object tags (default behavior) when transferring between object storage systems.<br /><br />If you want your DataSync task to ignore object tags, specify the \`NONE\` value.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| - [overwriteMode](#tasks_additionalProperties_options_anyOf_i1_overwriteMode )                             | No      | string | No         | -          | Specifies whether DataSync should modify or preserve data at the destination location.<br /><br />- \`ALWAYS\` (default) - DataSync modifies data in the destination location when source data (including metadata) has changed.<br /><br />If DataSync overwrites objects, you might incur additional charges for certain Amazon S3 storage classes (for example, for retrieval or early deletion). For more information, see [Storage class considerations with Amazon S3 transfers](https://docs.aws.amazon.com/datasync/latest/userguide/create-s3-location.html#using-storage-classes) .<br />- \`NEVER\` - DataSync doesn't overwrite data in the destination location even if the source data has changed. You can use this option to protect against overwriting changes made to files or objects in the destination.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| - [posixPermissions](#tasks_additionalProperties_options_anyOf_i1_posixPermissions )                       | No      | string | No         | -          | A value that determines which users or groups can access a file for a specific purpose, such as reading, writing, or execution of the file.<br /><br />This option should be set only for Network File System (NFS), Amazon EFS, and Amazon S3 locations. For more information about what metadata is copied by DataSync, see [Metadata Copied by DataSync](https://docs.aws.amazon.com/datasync/latest/userguide/special-files.html#metadata-copied) .<br /><br />Default value: \`PRESERVE\`<br /><br />\`PRESERVE\` : Preserve POSIX-style permissions (recommended).<br /><br />\`NONE\` : Ignore permissions.<br /><br />> AWS DataSync can preserve extant permissions of a source location.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| - [preserveDeletedFiles](#tasks_additionalProperties_options_anyOf_i1_preserveDeletedFiles )               | No      | string | No         | -          | A value that specifies whether files in the destination that don't exist in the source file system are preserved.<br /><br />This option can affect your storage costs. If your task deletes objects, you might incur minimum storage duration charges for certain storage classes. For detailed information, see [Considerations when working with Amazon S3 storage classes in DataSync](https://docs.aws.amazon.com/datasync/latest/userguide/create-s3-location.html#using-storage-classes) in the *AWS DataSync User Guide* .<br /><br />Default value: \`PRESERVE\`<br /><br />\`PRESERVE\` : Ignore destination files that aren't present in the source (recommended).<br /><br />\`REMOVE\` : Delete destination files that aren't present in the source.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| - [preserveDevices](#tasks_additionalProperties_options_anyOf_i1_preserveDevices )                         | No      | string | No         | -          | A value that determines whether AWS DataSync should preserve the metadata of block and character devices in the source file system, and re-create the files with that device name and metadata on the destination.<br /><br />DataSync does not copy the contents of such devices, only the name and metadata.<br /><br />> AWS DataSync can't sync the actual contents of such devices, because they are nonterminal and don't return an end-of-file (EOF) marker.<br /><br />Default value: \`NONE\`<br /><br />\`NONE\` : Ignore special devices (recommended).<br /><br />\`PRESERVE\` : Preserve character and block device metadata. This option isn't currently supported for Amazon EFS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| - [securityDescriptorCopyFlags](#tasks_additionalProperties_options_anyOf_i1_securityDescriptorCopyFlags ) | No      | string | No         | -          | A value that determines which components of the SMB security descriptor are copied from source to destination objects.<br /><br />This value is only used for transfers between SMB and Amazon FSx for Windows File Server locations, or between two Amazon FSx for Windows File Server locations. For more information about how DataSync handles metadata, see [How DataSync Handles Metadata and Special Files](https://docs.aws.amazon.com/datasync/latest/userguide/special-files.html) .<br /><br />Default value: \`OWNER_DACL\`<br /><br />\`OWNER_DACL\` : For each copied object, DataSync copies the following metadata:<br /><br />- Object owner.<br />- NTFS discretionary access control lists (DACLs), which determine whether to grant access to an object.<br /><br />When you use option, DataSync does NOT copy the NTFS system access control lists (SACLs), which are used by administrators to log attempts to access a secured object.<br /><br />\`OWNER_DACL_SACL\` : For each copied object, DataSync copies the following metadata:<br /><br />- Object owner.<br />- NTFS discretionary access control lists (DACLs), which determine whether to grant access to an object.<br />- NTFS system access control lists (SACLs), which are used by administrators to log attempts to access a secured object.<br /><br />Copying SACLs requires granting additional permissions to the Windows user that DataSync uses to access your SMB location. For information about choosing a user that ensures sufficient permissions to files, folders, and metadata, see [user](https://docs.aws.amazon.com/datasync/latest/userguide/create-smb-location.html#SMBuser) .<br /><br />\`NONE\` : None of the SMB security descriptor components are copied. Destination objects are owned by the user that was provided for accessing the destination location. DACLs and SACLs are set based on the destination server’s configuration. |
| - [taskQueueing](#tasks_additionalProperties_options_anyOf_i1_taskQueueing )                               | No      | string | No         | -          | Specifies whether your transfer tasks should be put into a queue during certain scenarios when [running multiple tasks](https://docs.aws.amazon.com/datasync/latest/userguide/run-task.html#running-multiple-tasks) . This is \`ENABLED\` by default.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| - [transferMode](#tasks_additionalProperties_options_anyOf_i1_transferMode )                               | No      | string | No         | -          | A value that determines whether DataSync transfers only the data and metadata that differ between the source and the destination location, or whether DataSync transfers all the content from the source, without comparing it to the destination location.<br /><br />\`CHANGED\` : DataSync copies only data or metadata that is new or different from the source location to the destination location.<br /><br />\`ALL\` : DataSync copies all source location content to the destination, without comparing it to existing content on the destination.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| - [uid](#tasks_additionalProperties_options_anyOf_i1_uid )                                                 | No      | string | No         | -          | The user ID (UID) of the file's owner.<br /><br />Default value: \`INT_VALUE\`<br /><br />\`INT_VALUE\` : Preserve the integer value of the UID and group ID (GID) (recommended).<br /><br />\`NAME\` : Currently not supported<br /><br />\`NONE\` : Ignore the UID and GID.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| - [verifyMode](#tasks_additionalProperties_options_anyOf_i1_verifyMode )                                   | No      | string | No         | -          | A value that determines whether a data integrity verification is performed at the end of a task execution after all data and metadata have been transferred.<br /><br />For more information, see [Configure task settings](https://docs.aws.amazon.com/datasync/latest/userguide/create-task.html) .<br /><br />Default value: \`POINT_IN_TIME_CONSISTENT\`<br /><br />\`ONLY_FILES_TRANSFERRED\` (recommended): Perform verification only on files that were transferred.<br /><br />\`POINT_IN_TIME_CONSISTENT\` : Scan the entire source and entire destination at the end of the transfer to verify that the source and destination are fully synchronized. This option isn't supported when transferring to S3 Glacier or S3 Glacier Deep Archive storage classes.<br /><br />\`NONE\` : No additional verification is done at the end of the transfer, but all data transmissions are integrity-checked with checksum verification during the transfer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

###### <a name="tasks_additionalProperties_options_anyOf_i1_atime"></a>5.1.6.2.1. Property `root > tasks > additionalProperties > options > anyOf > item 1 > atime`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A file metadata value that shows the last time that a file was accessed (that is, when the file was read or written to).

If you set `Atime` to `BEST_EFFORT` , AWS DataSync attempts to preserve the original `Atime` attribute on all source files (that is, the version before the PREPARING phase). However, `Atime` 's behavior is not fully standard across platforms, so AWS DataSync can only do this on a best-effort basis.

Default value: `BEST_EFFORT`

`BEST_EFFORT` : Attempt to preserve the per-file `Atime` value (recommended).

`NONE` : Ignore `Atime` .

> If `Atime` is set to `BEST_EFFORT` , `Mtime` must be set to `PRESERVE` .
>
> If `Atime` is set to `NONE` , `Mtime` must also be `NONE` .

###### <a name="tasks_additionalProperties_options_anyOf_i1_bytesPerSecond"></a>5.1.6.2.2. Property `root > tasks > additionalProperties > options > anyOf > item 1 > bytesPerSecond`

|              |          |
| ------------ | -------- |
| **Type**     | `number` |
| **Required** | No       |

**Description:** A value that limits the bandwidth used by AWS DataSync .

For example, if you want AWS DataSync to use a maximum of 1 MB, set this value to `1048576` (=1024*1024).

###### <a name="tasks_additionalProperties_options_anyOf_i1_gid"></a>5.1.6.2.3. Property `root > tasks > additionalProperties > options > anyOf > item 1 > gid`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The group ID (GID) of the file's owners.

Default value: `INT_VALUE`

`INT_VALUE` : Preserve the integer value of the user ID (UID) and group ID (GID) (recommended).

`NAME` : Currently not supported.

`NONE` : Ignore the UID and GID.

###### <a name="tasks_additionalProperties_options_anyOf_i1_logLevel"></a>5.1.6.2.4. Property `root > tasks > additionalProperties > options > anyOf > item 1 > logLevel`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies the type of logs that DataSync publishes to a Amazon CloudWatch Logs log group.

To specify the log group, see [CloudWatchLogGroupArn](https://docs.aws.amazon.com/datasync/latest/userguide/API_CreateTask.html#DataSync-CreateTask-request-CloudWatchLogGroupArn) .

- `BASIC` - Publishes logs with only basic information (such as transfer errors).
- `TRANSFER` - Publishes logs for all files or objects that your DataSync task transfers and performs data-integrity checks on.
- `OFF` - No logs are published.

###### <a name="tasks_additionalProperties_options_anyOf_i1_mtime"></a>5.1.6.2.5. Property `root > tasks > additionalProperties > options > anyOf > item 1 > mtime`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A value that indicates the last time that a file was modified (that is, a file was written to) before the PREPARING phase.

This option is required for cases when you need to run the same task more than one time.

Default value: `PRESERVE`

`PRESERVE` : Preserve original `Mtime` (recommended)

`NONE` : Ignore `Mtime` .

> If `Mtime` is set to `PRESERVE` , `Atime` must be set to `BEST_EFFORT` .
>
> If `Mtime` is set to `NONE` , `Atime` must also be set to `NONE` .

###### <a name="tasks_additionalProperties_options_anyOf_i1_objectTags"></a>5.1.6.2.6. Property `root > tasks > additionalProperties > options > anyOf > item 1 > objectTags`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies whether you want DataSync to `PRESERVE` object tags (default behavior) when transferring between object storage systems.

If you want your DataSync task to ignore object tags, specify the `NONE` value.

###### <a name="tasks_additionalProperties_options_anyOf_i1_overwriteMode"></a>5.1.6.2.7. Property `root > tasks > additionalProperties > options > anyOf > item 1 > overwriteMode`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies whether DataSync should modify or preserve data at the destination location.

- `ALWAYS` (default) - DataSync modifies data in the destination location when source data (including metadata) has changed.

If DataSync overwrites objects, you might incur additional charges for certain Amazon S3 storage classes (for example, for retrieval or early deletion). For more information, see [Storage class considerations with Amazon S3 transfers](https://docs.aws.amazon.com/datasync/latest/userguide/create-s3-location.html#using-storage-classes) .
- `NEVER` - DataSync doesn't overwrite data in the destination location even if the source data has changed. You can use this option to protect against overwriting changes made to files or objects in the destination.

###### <a name="tasks_additionalProperties_options_anyOf_i1_posixPermissions"></a>5.1.6.2.8. Property `root > tasks > additionalProperties > options > anyOf > item 1 > posixPermissions`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A value that determines which users or groups can access a file for a specific purpose, such as reading, writing, or execution of the file.

This option should be set only for Network File System (NFS), Amazon EFS, and Amazon S3 locations. For more information about what metadata is copied by DataSync, see [Metadata Copied by DataSync](https://docs.aws.amazon.com/datasync/latest/userguide/special-files.html#metadata-copied) .

Default value: `PRESERVE`

`PRESERVE` : Preserve POSIX-style permissions (recommended).

`NONE` : Ignore permissions.

> AWS DataSync can preserve extant permissions of a source location.

###### <a name="tasks_additionalProperties_options_anyOf_i1_preserveDeletedFiles"></a>5.1.6.2.9. Property `root > tasks > additionalProperties > options > anyOf > item 1 > preserveDeletedFiles`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A value that specifies whether files in the destination that don't exist in the source file system are preserved.

This option can affect your storage costs. If your task deletes objects, you might incur minimum storage duration charges for certain storage classes. For detailed information, see [Considerations when working with Amazon S3 storage classes in DataSync](https://docs.aws.amazon.com/datasync/latest/userguide/create-s3-location.html#using-storage-classes) in the *AWS DataSync User Guide* .

Default value: `PRESERVE`

`PRESERVE` : Ignore destination files that aren't present in the source (recommended).

`REMOVE` : Delete destination files that aren't present in the source.

###### <a name="tasks_additionalProperties_options_anyOf_i1_preserveDevices"></a>5.1.6.2.10. Property `root > tasks > additionalProperties > options > anyOf > item 1 > preserveDevices`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A value that determines whether AWS DataSync should preserve the metadata of block and character devices in the source file system, and re-create the files with that device name and metadata on the destination.

DataSync does not copy the contents of such devices, only the name and metadata.

> AWS DataSync can't sync the actual contents of such devices, because they are nonterminal and don't return an end-of-file (EOF) marker.

Default value: `NONE`

`NONE` : Ignore special devices (recommended).

`PRESERVE` : Preserve character and block device metadata. This option isn't currently supported for Amazon EFS.

###### <a name="tasks_additionalProperties_options_anyOf_i1_securityDescriptorCopyFlags"></a>5.1.6.2.11. Property `root > tasks > additionalProperties > options > anyOf > item 1 > securityDescriptorCopyFlags`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A value that determines which components of the SMB security descriptor are copied from source to destination objects.

This value is only used for transfers between SMB and Amazon FSx for Windows File Server locations, or between two Amazon FSx for Windows File Server locations. For more information about how DataSync handles metadata, see [How DataSync Handles Metadata and Special Files](https://docs.aws.amazon.com/datasync/latest/userguide/special-files.html) .

Default value: `OWNER_DACL`

`OWNER_DACL` : For each copied object, DataSync copies the following metadata:

- Object owner.
- NTFS discretionary access control lists (DACLs), which determine whether to grant access to an object.

When you use option, DataSync does NOT copy the NTFS system access control lists (SACLs), which are used by administrators to log attempts to access a secured object.

`OWNER_DACL_SACL` : For each copied object, DataSync copies the following metadata:

- Object owner.
- NTFS discretionary access control lists (DACLs), which determine whether to grant access to an object.
- NTFS system access control lists (SACLs), which are used by administrators to log attempts to access a secured object.

Copying SACLs requires granting additional permissions to the Windows user that DataSync uses to access your SMB location. For information about choosing a user that ensures sufficient permissions to files, folders, and metadata, see [user](https://docs.aws.amazon.com/datasync/latest/userguide/create-smb-location.html#SMBuser) .

`NONE` : None of the SMB security descriptor components are copied. Destination objects are owned by the user that was provided for accessing the destination location. DACLs and SACLs are set based on the destination server’s configuration.

###### <a name="tasks_additionalProperties_options_anyOf_i1_taskQueueing"></a>5.1.6.2.12. Property `root > tasks > additionalProperties > options > anyOf > item 1 > taskQueueing`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies whether your transfer tasks should be put into a queue during certain scenarios when [running multiple tasks](https://docs.aws.amazon.com/datasync/latest/userguide/run-task.html#running-multiple-tasks) . This is `ENABLED` by default.

###### <a name="tasks_additionalProperties_options_anyOf_i1_transferMode"></a>5.1.6.2.13. Property `root > tasks > additionalProperties > options > anyOf > item 1 > transferMode`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A value that determines whether DataSync transfers only the data and metadata that differ between the source and the destination location, or whether DataSync transfers all the content from the source, without comparing it to the destination location.

`CHANGED` : DataSync copies only data or metadata that is new or different from the source location to the destination location.

`ALL` : DataSync copies all source location content to the destination, without comparing it to existing content on the destination.

###### <a name="tasks_additionalProperties_options_anyOf_i1_uid"></a>5.1.6.2.14. Property `root > tasks > additionalProperties > options > anyOf > item 1 > uid`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The user ID (UID) of the file's owner.

Default value: `INT_VALUE`

`INT_VALUE` : Preserve the integer value of the UID and group ID (GID) (recommended).

`NAME` : Currently not supported

`NONE` : Ignore the UID and GID.

###### <a name="tasks_additionalProperties_options_anyOf_i1_verifyMode"></a>5.1.6.2.15. Property `root > tasks > additionalProperties > options > anyOf > item 1 > verifyMode`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** A value that determines whether a data integrity verification is performed at the end of a task execution after all data and metadata have been transferred.

For more information, see [Configure task settings](https://docs.aws.amazon.com/datasync/latest/userguide/create-task.html) .

Default value: `POINT_IN_TIME_CONSISTENT`

`ONLY_FILES_TRANSFERRED` (recommended): Perform verification only on files that were transferred.

`POINT_IN_TIME_CONSISTENT` : Scan the entire source and entire destination at the end of the transfer to verify that the source and destination are fully synchronized. This option isn't supported when transferring to S3 Glacier or S3 Glacier Deep Archive storage classes.

`NONE` : No additional verification is done at the end of the transfer, but all data transmissions are integrity-checked with checksum verification during the transfer.

#### <a name="tasks_additionalProperties_schedule"></a>5.1.7. Property `root > tasks > additionalProperties > schedule`

|                           |                                                                           |
| ------------------------- | ------------------------------------------------------------------------- |
| **Type**                  | `combining`                                                               |
| **Required**              | No                                                                        |
| **Additional properties** | [[Any type: allowed]](# "Additional Properties of any type are allowed.") |

**Description:** Specifies a schedule used to periodically transfer files from a source to a destination location. The schedule should be specified in UTC time.
For more information, see [Scheduling your task](https://docs.aws.amazon.com/datasync/latest/userguide/task-scheduling.html).

| Any of(Option)                                                                |
| ----------------------------------------------------------------------------- |
| [IResolvable](#tasks_additionalProperties_schedule_anyOf_i0)                  |
| [CfnTask.TaskScheduleProperty](#tasks_additionalProperties_schedule_anyOf_i1) |

##### <a name="tasks_additionalProperties_schedule_anyOf_i0"></a>5.1.7.1. Property `root > tasks > additionalProperties > schedule > anyOf > IResolvable`

|                           |                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| **Type**                  | `object`                                                                                    |
| **Required**              | No                                                                                          |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.")                                     |
| **Same definition as**    | [tasks_additionalProperties_options_anyOf_i0](#tasks_additionalProperties_options_anyOf_i0) |

**Description:** Interface for values that can be resolvable later

Tokens are special objects that participate in synthesis.

##### <a name="tasks_additionalProperties_schedule_anyOf_i1"></a>5.1.7.2. Property `root > tasks > additionalProperties > schedule > anyOf > CfnTask.TaskScheduleProperty`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/CfnTask.TaskScheduleProperty              |

**Description:** Configures your AWS DataSync task to run on a [schedule](https://docs.aws.amazon.com/datasync/latest/userguide/task-scheduling.html) (at a minimum interval of 1 hour).

| Property                                                                                  | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------------------------------------------------------------- | ------- | ------ | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| - [scheduleExpression](#tasks_additionalProperties_schedule_anyOf_i1_scheduleExpression ) | No      | string | No         | -          | Specifies your task schedule by using a cron expression in UTC time.<br /><br />For information about cron expression syntax, see the [*Amazon EventBridge User Guide*](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-cron-expressions.html) .                                                                                                                                                                                                                                                                                                             |
| - [status](#tasks_additionalProperties_schedule_anyOf_i1_status )                         | No      | string | No         | -          | Specifies whether to enable or disable your task schedule.<br /><br />Your schedule is enabled by default, but there can be situations where you need to disable it. For example, you might need to perform maintenance on a storage system before you can begin a recurring DataSync transfer.<br /><br />DataSync might disable your schedule automatically if your task fails repeatedly with the same error. For more information, see the [*DataSync User Guide*](https://docs.aws.amazon.com/datasync/latest/userguide/task-scheduling.html#pause-task-schedule) . |

###### <a name="tasks_additionalProperties_schedule_anyOf_i1_scheduleExpression"></a>5.1.7.2.1. Property `root > tasks > additionalProperties > schedule > anyOf > item 1 > scheduleExpression`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies your task schedule by using a cron expression in UTC time.

For information about cron expression syntax, see the [*Amazon EventBridge User Guide*](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-cron-expressions.html) .

###### <a name="tasks_additionalProperties_schedule_anyOf_i1_status"></a>5.1.7.2.2. Property `root > tasks > additionalProperties > schedule > anyOf > item 1 > status`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** Specifies whether to enable or disable your task schedule.

Your schedule is enabled by default, but there can be situations where you need to disable it. For example, you might need to perform maintenance on a storage system before you can begin a recurring DataSync transfer.

DataSync might disable your schedule automatically if your task fails repeatedly with the same error. For more information, see the [*DataSync User Guide*](https://docs.aws.amazon.com/datasync/latest/userguide/task-scheduling.html#pause-task-schedule) .

#### <a name="tasks_additionalProperties_sourceLocationArn"></a>5.1.8. Property `root > tasks > additionalProperties > sourceLocationArn`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** The Amazon Resource Name (ARN) of the source location for the task.

#### <a name="tasks_additionalProperties_sourceLocationName"></a>5.1.9. Property `root > tasks > additionalProperties > sourceLocationName`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | No       |

**Description:** MDAA custom parameter that refers to the generated source location name. The value will resolve to source location ARN (looked up from the generatedLocations).
Only either sourceLocationName or sourceLocationArn can be specified, not both.

## <a name="vpc"></a>6. Property `root > vpc`

|                           |                                                         |
| ------------------------- | ------------------------------------------------------- |
| **Type**                  | `object`                                                |
| **Required**              | No                                                      |
| **Additional properties** | [[Not allowed]](# "Additional Properties not allowed.") |
| **Defined in**            | #/definitions/VpcProps                                  |

| Property                             | Pattern | Type   | Deprecated | Definition | Title/Description                                                                                                                                                                       |
| ------------------------------------ | ------- | ------ | ---------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| + [vpcCidrBlock](#vpc_vpcCidrBlock ) | No      | string | No         | -          | -                                                                                                                                                                                       |
| + [vpcId](#vpc_vpcId )               | No      | string | No         | -          | The ID of the VPC for the DataSync deployment<br />MDAA will create a VPC Endpoint for DataSync service forn this VPC ID that will be used for communication between the agent and task |

### <a name="vpc_vpcCidrBlock"></a>6.1. Property `root > vpc > vpcCidrBlock`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

### <a name="vpc_vpcId"></a>6.2. Property `root > vpc > vpcId`

|              |          |
| ------------ | -------- |
| **Type**     | `string` |
| **Required** | Yes      |

**Description:** The ID of the VPC for the DataSync deployment
MDAA will create a VPC Endpoint for DataSync service forn this VPC ID that will be used for communication between the agent and task

----------------------------------------------------------------------------------------------------------------------------
Generated using [json-schema-for-humans](https://github.com/coveooss/json-schema-for-humans) on 2024-08-16 at 13:40:51 -0400

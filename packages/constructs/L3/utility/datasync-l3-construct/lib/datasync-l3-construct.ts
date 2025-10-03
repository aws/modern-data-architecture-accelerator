/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';
import { MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import {
  MdaaDataSyncAgent,
  MdaaDataSyncAgentProps,
  MdaaDataSyncObjectStorageLocation,
  MdaaDataSyncObjectStorageLocationProps,
  MdaaDataSyncS3Location,
  MdaaDataSyncS3LocationProps,
  MdaaDataSyncSmbLocation,
  MdaaDataSyncSmbLocationProps,
} from '@aws-mdaa/datasync-constructs';
import { MdaaSecurityGroup } from '@aws-mdaa/ec2-constructs';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { IResolvable, SecretValue } from 'aws-cdk-lib';
import {
  CfnLocationNFS,
  CfnLocationObjectStorage,
  CfnLocationS3,
  CfnLocationSMB,
  CfnTask,
} from 'aws-cdk-lib/aws-datasync';
import {
  InterfaceVpcEndpoint,
  InterfaceVpcEndpointAwsService,
  InterfaceVpcEndpointProps,
  ISecurityGroup,
  IVpc,
  IVpcEndpoint,
  Peer,
  Port,
  Subnet,
  SubnetSelection,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { ILogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';

/**
 * Q-ENHANCED-INTERFACE
 * VPC configuration interface for DataSync deployment with VPC endpoint creation and network isolation. Defines VPC parameters for DataSync service deployment including VPC identification and CIDR block specification enabling secure, private network communication for data transfer operations.
 *
 * Use cases: Private network data transfers; VPC endpoint creation; Network isolation; Secure data synchronization
 *
 * AWS: VPC configuration for DataSync service with VPC endpoint and private network communication
 *
 * Validation: vpcId must be existing VPC; vpcCidrBlock must be valid CIDR notation matching the VPC
 */
export interface VpcProps {
  /**
   * Q-ENHANCED-PROPERTY
   * The ID of the VPC for the DataSync deployment. MDAA will create a VPC Endpoint for DataSync service for this VPC ID that will be used for communication between the agent and task enabling private network data transfer without internet gateway dependency.
   *
   * Use cases: VPC identification; Private network deployment; VPC endpoint creation; Network isolation
   *
   * AWS: VPC ID for DataSync VPC endpoint creation and private network communication
   *
   * Validation: Must be existing VPC ID; required for DataSync VPC endpoint and private network deployment
   **/
  readonly vpcId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * CIDR block specification for the DataSync VPC enabling network range definition and security group configuration. Defines the IP address range of the VPC for proper security group rule creation and network access control for DataSync operations.
   *
   * Use cases: Network range specification; Security group configuration; IP address management; Network access control
   *
   * AWS: VPC CIDR block for DataSync security group rules and network access configuration
   *
   * Validation: Must be valid CIDR notation; should match the actual VPC CIDR block for proper network configuration
   **/
  readonly vpcCidrBlock: string;
}

export interface AgentWithNameProps extends AgentProps {
  readonly agentName: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * DataSync agent configuration interface for on-premises to AWS data transfer operations. Defines agent deployment parameters including activation, networking, and security configuration enabling secure, efficient data synchronization between on-premises storage systems and AWS services.
 *
 * Use cases: On-premises data migration; Hybrid cloud data sync; Agent-based data transfer; Secure data movement
 *
 * AWS: DataSync agent configuration for on-premises to AWS data transfer and synchronization operations
 *
 * Validation: agentIpAddress is required; activation key or VPC configuration required for agent registration
 */
export interface AgentProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Your agent activation key. You can get the activation key either by sending an HTTP GET request with redirects that enable you to get the agent IP address (port 80). Alternatively, you can get it from the DataSync console. The redirect URL returned in the response provides you the activation key for your agent in the query string parameter `activationKey`. It might also include other activation-related parameters; however, these are merely defaults. The arguments you pass to this API call determine the actual configuration of your agent. For more information, see [Creating and activating an agent](https://docs.aws.amazon.com/datasync/latest/userguide/activating-agent.html) in the *AWS DataSync User Guide.* If this parameter is not provided, and the VPC ID is specified in vpcEndpoint configuration, MDAA will assume this is the first pass and will create VPC endpoint and security group.
   *
   * Use cases: Agent activation; Initial agent setup; Agent registration; First-time deployment
   *
   * AWS: DataSync agent activation key for agent registration and initial configuration
   *
   * Validation: Optional string; if not provided, VPC configuration must be specified for automatic setup
   **/
  readonly activationKey?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * The identifiers of the subnets in which DataSync will create elastic network interfaces for each data transfer task. The agent that runs a task must be private. When you start a task that is associated with an agent created in a VPC, or one that has access to an IP address in a VPC, then the task is also private. In this case, DataSync creates four network interfaces for each task in your subnet. For a data transfer to work, the agent must be able to route to all these four network interfaces.
   *
   * Use cases: Private network deployment; ENI creation; Task networking; VPC-based data transfer
   *
   * AWS: EC2 subnet ID for DataSync agent ENI creation and private network deployment
   *
   * Validation: Must be existing subnet ID within the specified VPC; required for private agent deployment
   **/
  readonly subnetId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * The ID of the virtual private cloud (VPC) endpoint that the agent has access to. This is the client-side VPC endpoint, powered by AWS PrivateLink. If you don't have an AWS PrivateLink VPC endpoint, see [AWS PrivateLink and VPC endpoints](https://docs.aws.amazon.com//vpc/latest/userguide/endpoint-services-overview.html) in the *Amazon VPC User Guide*. For more information about activating your agent in a private network based on a VPC, see [Using AWS DataSync in a Virtual Private Cloud](https://docs.aws.amazon.com/datasync/latest/userguide/datasync-in-vpc.html) in the *AWS DataSync User Guide.* A VPC endpoint ID looks like this: `vpce-01234d5aff67890e1`. If the parameter is not provided and the VPC ID is specified in vpcEndpoint configuration, MDAA will create VPC endpoint and security group for agent registration.
   *
   * Use cases: Private network connectivity; VPC endpoint access; PrivateLink integration; Secure agent communication
   *
   * AWS: VPC endpoint ID for DataSync agent private network connectivity and PrivateLink access
   *
   * Validation: Optional VPC endpoint ID; if not provided, MDAA will create VPC endpoint when VPC configuration specified
   **/
  readonly vpcEndpointId?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * The ID of the security group to be used to protect your data transfer task subnets, if created outside MDAA. Otherwise, if not provided and the VPC ID is specified in vpcEndpoint configuration, MDAA will create VPC endpoint and security group and the security group will be used for this agent registration.
   *
   * Use cases: Network security; Task protection; Custom security groups; Network access control
   *
   * AWS: EC2 security group ID for DataSync agent network security and access control
   *
   * Validation: Optional security group ID; if not provided, MDAA will create security group when VPC configuration specified
   **/
  readonly securityGroupId?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * The IP address of the agent host. The values will be used to create an ingress rule for the task security group enabling secure communication between the DataSync service and the on-premises agent for data transfer operations.
   *
   * Use cases: Agent connectivity; Security group rules; On-premises integration; Network access control
   *
   * AWS: IP address for DataSync agent security group ingress rules and network connectivity
   *
   * Validation: Must be valid IPv4 address; required for agent connectivity and security group configuration
   **/
  readonly agentIpAddress: string;
}

export type S3StorageClassType =
  | 'DEEP_ARCHIVE'
  | 'GLACIER'
  | 'INTELLIGENT_TIERING'
  | 'ONEZONE_IA'
  | 'OUTPOSTS'
  | 'STANDARD'
  | 'STANDARD_IA';
export type SmbVersion = 'AUTOMATIC' | 'SMB2' | 'SMB3';
export type NfsVersion = 'AUTOMATIC' | 'NFS3' | 'NFSv4_0' | 'NFSv4_1';

/**
 * Q-ENHANCED-INTERFACE
 * S3 location configuration interface for DataSync transfers to Amazon S3 storage. Defines S3 destination parameters including bucket specification, access roles, storage classes, and subdirectory configuration enabling automated data transfer to S3 with proper access control and storage optimization.
 *
 * Use cases: Data migration to S3; S3 storage class optimization; Automated S3 transfers; S3 destination configuration
 *
 * AWS: DataSync LocationS3 resource for S3 destination configuration and data transfer operations
 *
 * Validation: s3BucketArn and bucketAccessRoleArn are required; storage class must be valid S3 storage class
 */
export interface LocationS3Props {
  /**
   * Q-ENHANCED-PROPERTY
   * The ARN of the Amazon S3 bucket for DataSync destination configuration enabling S3 bucket identification and access control. Specifies the target S3 bucket where DataSync will transfer data, providing the foundation for S3-based data storage and management.
   *
   * Use cases: S3 bucket identification; Data transfer destination; S3 access control; Bucket specification
   *
   * AWS: S3 bucket ARN for DataSync LocationS3 configuration and data transfer destination
   *
   * Validation: Must be valid S3 bucket ARN; required for S3 location configuration and data transfer operations
   **/
  readonly s3BucketArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * MDAA custom parameter to simplify the configuration. This value will be used to construct S3Config. The Amazon Resource Name (ARN) of the AWS Identity and Access Management (IAM) role that is used to access an Amazon S3 bucket enabling secure S3 access with proper permissions and access control.
   *
   * Use cases: S3 access permissions; IAM role configuration; Secure S3 access; Access control management
   *
   * AWS: IAM role ARN for DataSync S3 access permissions and secure bucket operations
   *
   * Validation: Must be valid IAM role ARN; required for S3 access permissions and secure data transfer operations
   **/
  readonly bucketAccessRoleArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * The Amazon S3 storage class that you want to store your files in when this location is used as a task destination enabling S3 storage cost optimization and lifecycle management. Specifies the S3 storage class for transferred data supporting cost optimization and data lifecycle strategies.
   *
   * Use cases: Storage cost optimization; S3 lifecycle management; Storage class selection; Cost-effective storage
   *
   * AWS: S3 storage class specification for DataSync transferred data and storage optimization
   *
   * Validation: Must be valid S3StorageClassType if specified; enables storage cost optimization and lifecycle management
   *   **/
  readonly s3StorageClass?: S3StorageClassType;
  /**
   * Q-ENHANCED-PROPERTY
   * A subdirectory in the Amazon S3 bucket enabling organized data placement and hierarchical storage structure. `Subdirectory` must be specified with forward slashes. For example, `/path/to/folder`. Provides organized data placement within the S3 bucket for systematic data management.
   *
   * Use cases: Organized data placement; Hierarchical storage; Data organization; Systematic file management
   *
   * AWS: S3 object key prefix for DataSync data placement and organized storage structure
   *
   * Validation: Must use forward slash format if specified; enables organized data placement and hierarchical storage
   **/
  readonly subdirectory?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * SMB file share location configuration for AWS DataSync transfers from on-premises SMB servers to AWS storage services. Defines SMB protocol connection parameters including server details, authentication, and mount options for automated data migration from Windows file shares and NAS devices.
 *
 * Use cases: Migrating Windows file shares to S3; NAS device data transfer; SMB protocol file system synchronization
 *
 * AWS: AWS DataSync LocationSMB resource for SMB file share connectivity and data transfer operations
 *
 * Validation: agentName must reference valid DataSync agent; serverHostname must be resolvable SMB server; subdirectory must be valid SMB path format
 */
export interface LocationSmbProps {
  /**
   * Q-ENHANCED-PROPERTY
   * MDAA custom parameter that refers to the generated agent name. The value will resolve to agent ARN (looked up from the generatedAgents) enabling simplified agent reference and automatic ARN resolution for SMB location configuration.
   *
   * Use cases: Agent reference; Automatic ARN resolution; Simplified configuration; Agent management
   *
   * AWS: DataSync agent ARN resolution for SMB location agent configuration
   *
   * Validation: Must reference valid generated agent names; mutually exclusive with agentArns
   **/
  readonly agentNames?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * The Amazon Resource Names (ARNs) of agents to use for a Server Message Block (SMB) location enabling direct agent ARN specification for SMB file share connectivity and data transfer operations.
   *
   * Use cases: Direct agent specification; SMB connectivity; Agent ARN configuration; File share access
   *
   * AWS: DataSync agent ARNs for SMB location configuration and file share connectivity
   *
   * Validation: Must be valid DataSync agent ARNs; mutually exclusive with agentNames
   **/
  readonly agentArns?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * The name of the secret in Secrets Manager that stores the credential (domain, user and password) of the user in SMB File Server that can mount the share and has the permissions to access files and folders in the SMB share. The secret must have "user" and "password" fields. For example (in JSON format): {"user":"<username>","password":"<password>"} enabling secure credential management for SMB authentication.
   *
   * Use cases: SMB authentication; Secure credential storage; File share access; Domain user credentials
   *
   * AWS: Secrets Manager secret name for SMB file share authentication and credential management
   *
   * Validation: Must be valid Secrets Manager secret name; secret must contain required user and password fields
   **/
  readonly secretName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * The name of the SMB server. This value is the IP address or Domain Name Service (DNS) name of the SMB server. An agent that is installed on-premises uses this hostname to mount the SMB server in a network. This name must either be DNS-compliant or must be an IP version 4 (IPv4) address.
   *
   * Use cases: SMB server identification; Network connectivity; Server mounting; DNS resolution
   *
   * AWS: SMB server hostname for DataSync agent connectivity and file share mounting
   *
   * Validation: Must be valid DNS name or IPv4 address; required for SMB server connectivity
   **/
  readonly serverHostname: string;
  /**
   * Q-ENHANCED-PROPERTY
   * The subdirectory in the SMB file system that is used to read data from the SMB source location or write data to the SMB destination. The SMB path should be a path that's exported by the SMB server, or a subdirectory of that path. The path should be such that it can be mounted by other SMB clients in your network. `Subdirectory` must be specified with forward slashes. For example, `/path/to/folder`. To transfer all the data in the folder you specified, DataSync must have permissions to mount the SMB share, as well as to access all the data in that share. To ensure this, either make sure that the user name and password specified belongs to the user who can mount the share, and who has the appropriate permissions for all of the files and directories that you want DataSync to access, or use credentials of a member of the Backup Operators group to mount the share. Doing either one enables the agent to access the data. For the agent to access directories, you must additionally enable all execute access.
   *
   * Use cases: SMB path specification; Data access control; File system navigation; Permission management
   *
   * AWS: SMB subdirectory path for DataSync data access and file system operations
   *
   * Validation: Must be valid SMB path with forward slashes; required for SMB data access and transfer operations
   **/
  readonly subdirectory: string;
  /**
   * Q-ENHANCED-PROPERTY
   * The name of the Windows domain that the SMB server belongs to enabling domain-based authentication and access control for SMB file share connectivity and domain user credential validation.
   *
   * Use cases: Domain authentication; Windows domain integration; Domain user access; Enterprise authentication
   *
   * AWS: Windows domain name for SMB server domain authentication and access control
   *
   * Validation: Must be valid Windows domain name if specified; enables domain-based SMB authentication
   **/
  readonly domain?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * MDAA custom parameter to simplify configuration. The value will be used to construct MountOptions object. Valid values: "AUTOMATIC" | "SMB2" | "SMB3". The mount options used by DataSync to access the SMB server enabling SMB protocol version specification and compatibility control.
   *
   * Use cases: SMB protocol version; Compatibility control; Mount options; Protocol specification
   *
   * AWS: SMB mount options for DataSync SMB server connectivity and protocol configuration
   *
   * Validation: Must be valid SmbVersion if specified; enables SMB protocol version control and compatibility
   *   **/
  readonly smbVersion?: SmbVersion;
}

/**
 * Q-ENHANCED-INTERFACE
 * NFS file system location configuration for AWS DataSync transfers from on-premises NFS servers to AWS storage services. Defines NFS protocol connection parameters including server details, mount options, and version specifications for automated data migration from Linux/Unix file systems.
 *
 * Use cases: Migrating Linux NFS exports to S3; Unix file system data transfer; NFS protocol file system synchronization
 *
 * AWS: AWS DataSync LocationNFS resource for NFS file system connectivity and data transfer operations
 *
 * Validation: agentName must reference valid DataSync agent; serverHostname must be resolvable NFS server; subdirectory must be valid NFS export path
 */
export interface LocationNfsProps {
  /**
   * Q-ENHANCED-PROPERTY
   * MDAA custom parameter that refers to the generated agent name. The value will resolve to agent ARN (looked up from the generatedAgents) and be constructed as onPremConfig object. Only either agentNames or agentArns can be specified, not both, enabling simplified agent reference and automatic ARN resolution for NFS location configuration.
   *
   * Use cases: Agent reference; Automatic ARN resolution; Simplified configuration; NFS agent management
   *
   * AWS: DataSync agent ARN resolution for NFS location agent configuration and onPremConfig construction
   *
   * Validation: Must reference valid generated agent names; mutually exclusive with agentArns
   **/
  readonly agentNames?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * MDAA custom parameter that refers to the generated agent name. The value will be used constructed as onPremConfig object. Only either agentNames or agentArns can be specified, not both, enabling direct agent ARN specification for NFS file system connectivity.
   *
   * Use cases: Direct agent specification; NFS connectivity; Agent ARN configuration; OnPrem configuration
   *
   * AWS: DataSync agent ARNs for NFS location configuration and onPremConfig object construction
   *
   * Validation: Must be valid DataSync agent ARNs; mutually exclusive with agentNames
   **/
  readonly agentArns?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * The name of the NFS server. This value is the IP address or Domain Name Service (DNS) name of the NFS server. An agent that is installed on-premises uses this hostname to mount the NFS server in a network. If you are copying data to or from your AWS Snowcone device, see [NFS Server on AWS Snowcone](https://docs.aws.amazon.com/datasync/latest/userguide/create-nfs-location.html#nfs-on-snowcone) for more information.
   *
   * Use cases: NFS server identification; Network connectivity; Server mounting; DNS resolution; Snowcone integration
   *
   * AWS: NFS server hostname for DataSync agent connectivity and file system mounting
   *
   * Validation: Must be valid DNS name or IPv4 address; required for NFS server connectivity
   **/
  readonly serverHostname: string;
  /**
   * Q-ENHANCED-PROPERTY
   * The subdirectory in the NFS file system that is used to read data from the NFS source location or write data to the NFS destination. The NFS path should be a path that's exported by the NFS server, or a subdirectory of that path. The path should be such that it can be mounted by other NFS clients in your network. To see all the paths exported by your NFS server, run "showmount -e nfs-server-name" from an NFS client that has access to your server. You can specify any directory that appears in the results, and any subdirectory of that directory. Ensure that the NFS export is accessible without Kerberos authentication. To transfer all the data in the folder you specified, DataSync needs to have permissions to read all the data. To ensure this, either configure the NFS export with no_root_squash, or ensure that the permissions for all of the files that you want DataSync allow read access for all users. Doing either enables the agent to read the files. For the agent to access directories, you must additionally enable all execute access. If you are copying data to or from your AWS Snowcone device, see [NFS Server on AWS Snowcone](https://docs.aws.amazon.com/datasync/latest/userguide/create-nfs-location.html#nfs-on-snowcone) for more information.
   *
   * Use cases: NFS path specification; Data access control; Export mounting; Permission management; Snowcone integration
   *
   * AWS: NFS subdirectory path for DataSync data access and file system operations
   *
   * Validation: Must be valid NFS export path; required for NFS data access and transfer operations
   **/
  readonly subdirectory: string;
  /**
   * Q-ENHANCED-PROPERTY
   * MDAA custom parameter to simplify configuration. The value will be used to construct MountOptions object. Valid values: "AUTOMATIC" | "NFS3" | "NFSv4_0" | "NFSv4_1". The NFS mount options that DataSync can use to mount your NFS share enabling NFS protocol version specification and compatibility control.
   *
   * Use cases: NFS protocol version; Compatibility control; Mount options; Protocol specification
   *
   * AWS: NFS mount options for DataSync NFS server connectivity and protocol configuration
   *
   * Validation: Must be valid NFS version string if specified; enables NFS protocol version control and compatibility
   **/
  readonly nfsVersion?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Object storage location configuration for AWS DataSync transfers from cloud-based object storage systems to AWS services. Defines S3-compatible object storage connection parameters including bucket details, access credentials, and server specifications for automated data migration from third-party cloud storage.
 *
 * Use cases: Migrating from Google Cloud Storage to S3; Azure Blob to S3 transfers; Third-party object storage synchronization
 *
 * AWS: AWS DataSync LocationObjectStorage resource for S3-compatible object storage connectivity and data transfer operations
 *
 * Validation: agentName must reference valid DataSync agent; bucketName must be valid object storage bucket; serverHostname must be accessible object storage endpoint
 */
export interface LocationObjectStorageProps {
  /**
   * Q-ENHANCED-PROPERTY
   * MDAA custom parameter that refers to the generated agent name. The value will resolve to agent ARN (looked up from the generatedAgents). Only either agentNames or agentArns can be specified, not both, enabling simplified agent reference and automatic ARN resolution for object storage location configuration.
   *
   * Use cases: Agent reference; Automatic ARN resolution; Simplified configuration; Object storage agent management
   *
   * AWS: DataSync agent ARN resolution for object storage location agent configuration
   *
   * Validation: Must reference valid generated agent names; mutually exclusive with agentArns
   **/
  readonly agentNames?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Specifies the Amazon Resource Names (ARNs) of the DataSync agents that can securely connect with your location. Only either agentNames or agentArns can be specified, not both, enabling direct agent ARN specification for object storage connectivity.
   *
   * Use cases: Direct agent specification; Object storage connectivity; Agent ARN configuration; Secure connection
   *
   * AWS: DataSync agent ARNs for object storage location configuration and secure connectivity
   *
   * Validation: Must be valid DataSync agent ARNs; mutually exclusive with agentNames
   **/
  readonly agentArns?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Specifies the name of the object storage bucket involved in the transfer enabling bucket identification and data transfer target specification for S3-compatible object storage systems.
   *
   * Use cases: Bucket identification; Data transfer target; Object storage specification; Transfer destination
   *
   * AWS: Object storage bucket name for DataSync transfer operations and data destination
   *
   * Validation: Must be valid object storage bucket name; required for object storage transfer operations
   **/
  readonly bucketName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Specifies the domain name or IP address of the object storage server. A DataSync agent uses this hostname to mount the object storage server in a network enabling network connectivity and server identification for object storage access.
   *
   * Use cases: Server identification; Network connectivity; Object storage mounting; Server access
   *
   * AWS: Object storage server hostname for DataSync agent connectivity and server mounting
   *
   * Validation: Must be valid domain name or IP address; required for object storage server connectivity
   **/
  readonly serverHostname: string;
  /**
   * Q-ENHANCED-PROPERTY
   * The name of the secret in Secrets Manager that stores the credential (accessKey/user name and secretKey) of the object storage server. The secret must have "accessKey" and "secretKey" fields. For example (in JSON format): {"accessKey":"<access_key>","secretKey":"<secret_key>"} enabling secure credential management for object storage authentication.
   *
   * Use cases: Object storage authentication; Secure credential storage; Access key management; Server authentication
   *
   * AWS: Secrets Manager secret name for object storage authentication and credential management
   *
   * Validation: Must be valid Secrets Manager secret name; secret must contain required accessKey and secretKey fields
   **/
  readonly secretName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Specifies the port that your object storage server accepts inbound network traffic on. Set to port 80 (HTTP), 443 (HTTPS), or a custom port if needed, enabling network connectivity configuration and protocol specification for object storage access.
   *
   * Use cases: Network port configuration; Protocol specification; Custom port access; Connectivity control
   *
   * AWS: Object storage server port for DataSync network connectivity and protocol configuration
   *
   * Validation: Must be valid port number if specified; typically 80 for HTTP or 443 for HTTPS
   **/
  readonly serverPort?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Specifies the protocol that your object storage server uses to communicate enabling protocol specification and secure communication configuration for object storage connectivity and data transfer operations.
   *
   * Use cases: Protocol specification; Secure communication; Object storage connectivity; Transfer protocol
   *
   * AWS: Object storage server protocol for DataSync communication and data transfer operations
   *
   * Validation: Must be valid protocol specification if provided; typically HTTP or HTTPS for object storage
   **/
  readonly serverProtocol?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Specifies the object prefix that DataSync reads from or writes to enabling organized data placement and hierarchical object storage structure for systematic data management and transfer operations.
   *
   * Use cases: Object prefix specification; Organized data placement; Hierarchical storage; Data organization
   *
   * AWS: Object storage prefix for DataSync data placement and organized storage structure
   *
   * Validation: Must be valid object prefix if specified; enables organized data placement and hierarchical storage
   **/
  readonly subdirectory?: string;
}

export interface GeneratedLocations {
  /**
   * key: location name
   */
  /** @jsii ignore */
  [key: string]: CfnLocationNFS | CfnLocationSMB | CfnLocationS3 | CfnLocationObjectStorage;
}
export interface TaskWithNameProps extends TaskProps {
  /**
   * The name of a task. This value is a text reference that is used to identify the task in the console.
   * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-task.html#cfn-datasync-task-name
   */
  readonly name: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * DataSync task configuration for automated data transfer operations between source and destination locations. Defines task execution parameters including location references, transfer options, scheduling, and data verification settings for systematic data migration and synchronization workflows.
 *
 * Use cases: One-time data migration tasks; Scheduled data synchronization; Incremental backup operations
 *
 * AWS: AWS DataSync Task resource for automated data transfer with configurable verification, filtering, and scheduling options
 *
 * Validation: sourceLocationName and destinationLocationName must reference valid DataSync locations; schedule must be valid cron expression if specified
 */
export interface TaskProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional MDAA-managed source location name reference for DataSync task source configuration enabling location name-based referencing. Refers to a generated source location name that will be resolved to the actual location ARN from the generatedLocations registry, providing simplified location referencing within MDAA configurations.
   *
   * Use cases: MDAA location referencing; Simplified location configuration; Generated location usage; Location name resolution; MDAA-managed locations
   *
   * AWS: AWS DataSync task source location reference resolved from MDAA-generated location registry
   *
   * Validation: Must reference valid generated location name if provided; mutually exclusive with sourceLocationArn; optional for source location specification
   **/
  readonly sourceLocationName?: string; // to be resolved from the generatedLocations
  /**
   * Q-ENHANCED-PROPERTY
   * Optional MDAA-managed destination location name reference for DataSync task destination configuration enabling location name-based referencing. Refers to a generated destination location name that will be resolved to the actual location ARN from the generatedLocations registry, providing simplified location referencing within MDAA configurations.
   *
   * Use cases: MDAA location referencing; Simplified location configuration; Generated location usage; Location name resolution; MDAA-managed locations
   *
   * AWS: AWS DataSync task destination location reference resolved from MDAA-generated location registry
   *
   * Validation: Must reference valid generated location name if provided; mutually exclusive with destinationLocationArn; optional for destination location specification
   **/
  readonly destinationLocationName?: string; // to be resolved from the generatedLocations
  /**
   * The Amazon Resource Name (ARN) of the source location for the task.
   * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-task.html#cfn-datasync-task-sourcelocationarn
   */
  readonly sourceLocationArn?: string;
  /**
   * The Amazon Resource Name (ARN) of an AWS storage resource's location.
   * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-task.html#cfn-datasync-task-destinationlocationarn
   */
  readonly destinationLocationArn?: string;
  /**
   * MDAA custom parameter. The ARN of the KMS key that will be used to encrypt the Task logging.
   * If this parameter is not specified, MDAA will create a new KMS key.
   */
  readonly logGroupEncryptionKeyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of filter rules to exclude specific data during DataSync transfer operations enabling selective data transfer and filtering. Defines patterns and rules that specify which files and directories should be excluded from the transfer, providing fine-grained control over data migration scope and reducing transfer time and costs.
   *
   * Use cases: Selective data transfer; File filtering; Transfer optimization; Data exclusion patterns; Cost optimization; Transfer scope control
   *
   * AWS: AWS DataSync task exclude filter rules for selective data transfer and file filtering
   *
   * Validation: Must be array of valid CfnTask.FilterRuleProperty if provided; filter patterns must follow DataSync filtering syntax; optional for transfer filtering
   **/
  readonly excludes?: CfnTask.FilterRuleProperty[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of filter rules to include specific data during DataSync transfer operations enabling selective data transfer and inclusion patterns. Defines patterns and rules that specify which files and directories should be included in the transfer, providing fine-grained control over data migration scope and ensuring only required data is transferred.
   *
   * Use cases: Selective data transfer; File inclusion patterns; Transfer optimization; Data inclusion filtering; Targeted data migration; Transfer scope control
   *
   * AWS: AWS DataSync task include filter rules for selective data transfer and file inclusion
   *
   * Validation: Must be array of valid CfnTask.FilterRuleProperty if provided; filter patterns must follow DataSync filtering syntax; optional for transfer filtering
   **/
  readonly includes?: CfnTask.FilterRuleProperty[];
  /**
   * Specifies the configuration options for a task. Some options include preserving file or object metadata and verifying data integrity.
   * You can also override these options before starting an individual run of a task (also known as a task execution).
   * For more information, see [StartTaskExecution](https://docs.aws.amazon.com/datasync/latest/userguide/API_StartTaskExecution.html).
   * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-task.html#cfn-datasync-task-options
   */
  readonly options?: CfnTask.OptionsProperty | IResolvable;
  /**
   * Specifies a schedule used to periodically transfer files from a source to a destination location. The schedule should be specified in UTC time.
   * For more information, see [Scheduling your task](https://docs.aws.amazon.com/datasync/latest/userguide/task-scheduling.html).
   * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-task.html#cfn-datasync-task-schedule
   */
  readonly schedule?: CfnTask.TaskScheduleProperty | IResolvable;
}
export interface LocationS3WithNameProps extends LocationS3Props {
  readonly locationName: string;
}
export interface LocationSmbWithNameProps extends LocationSmbProps {
  readonly locationName: string;
}
export interface LocationNfsWithNameProps extends LocationNfsProps {
  readonly locationName: string;
}
export interface LocationObjectStorageWithNameProps extends LocationObjectStorageProps {
  readonly locationName: string;
}
export interface LocationsByTypeWithNameProps {
  readonly s3?: LocationS3WithNameProps[];
  readonly smb?: LocationSmbWithNameProps[];
  readonly nfs?: LocationNfsWithNameProps[];
  readonly objectStorage?: LocationObjectStorageWithNameProps[];
}
export interface DataSyncL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional VPC configuration for DataSync agent deployment enabling secure network connectivity and private data transfer operations. Provides VPC networking setup for agents requiring private network access to on-premises or VPC-based storage systems for secure data transfer.
   *
   * Use cases: Private networking; Secure connectivity; VPC deployment; Network isolation
   *
   * AWS: VPC configuration for DataSync agent deployment and secure network connectivity
   *
   * Validation: Must be valid VpcProps if provided; enables secure VPC-based agent deployment and connectivity
   **/
  readonly vpc?: VpcProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of DataSync agent configurations for on-premises and hybrid connectivity enabling data transfer between on-premises storage and AWS. Provides agent deployment for connecting on-premises storage systems to AWS for data movement and synchronization operations.
   *
   * Use cases: On-premises connectivity; Hybrid data transfer; Agent deployment; Storage system integration
   *
   * AWS: DataSync agents for on-premises and hybrid storage connectivity and data transfer
   *
   * Validation: Must be array of valid AgentWithNameProps if provided; enables on-premises storage connectivity
   *   **/
  readonly agents?: AgentWithNameProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional location configuration organized by storage type enabling data source and destination management. Provides structured location configuration for different storage protocols and systems including S3, SMB, NFS, and object storage for flexible data movement operations.
   *
   * Use cases: Storage location management; Multi-protocol support; Data source configuration; Destination management
   *
   * AWS: DataSync locations for multi-protocol storage connectivity and data transfer operations
   *
   * Validation: Must be valid LocationsByTypeWithNameProps if provided; enables multi-protocol storage connectivity
   *   **/
  readonly locations?: LocationsByTypeWithNameProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of DataSync task configurations for automated data transfer and synchronization workflows enabling scheduled and on-demand data movement between configured locations. Provides task configuration for data transfer operations with filtering, scheduling, and monitoring capabilities.
   *
   * Use cases: Data transfer automation; Scheduled synchronization; Task management; Data movement workflows
   *
   * AWS: DataSync tasks for automated data transfer and synchronization workflows
   *
   * Validation: Must be array of valid TaskWithNameProps if provided; enables automated data transfer and synchronization
   **/
  readonly tasks?: TaskWithNameProps[];
}

interface VpcEndpointAndSecurityGroup {
  readonly vpcEndpoint: IVpcEndpoint;
  readonly securityGroup: ISecurityGroup;
}

export class DataSyncL3Construct extends MdaaL3Construct {
  protected readonly props: DataSyncL3ConstructProps;

  constructor(scope: Construct, id: string, props: DataSyncL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    let vpcEndpointAndSg: VpcEndpointAndSecurityGroup | undefined;
    if (props.vpc) {
      const vpc = Vpc.fromVpcAttributes(this.scope, 'vpcLookup', {
        vpcId: props.vpc.vpcId,
        availabilityZones: ['dummy'],
        vpcCidrBlock: props.vpc.vpcCidrBlock,
      });
      vpcEndpointAndSg = this.createVpce(vpc);
    }
    const kmsKey = this.createKmsKey();
    const generatedAgents = this.createDataSyncAgents(vpcEndpointAndSg);
    const generatedLocations = this.createDataSyncLocations(generatedAgents, kmsKey, this.props.locations);
    const logGroup = this.createLogGroup(kmsKey);

    if (this.props.tasks) {
      this.createDataSyncTasks(generatedLocations, this.props.tasks, logGroup);
    }
  }

  private createKmsKey(): IKey {
    return new MdaaKmsKey(this, `kms-key`, {
      naming: this.props.naming,
    });
  }

  private createSecurityGroup(vpc: IVpc): ISecurityGroup {
    const datasyncVpceSg = new MdaaSecurityGroup(this, 'vpce-datasync-sg', {
      naming: this.props.naming,
      vpc: vpc,
      allowAllOutbound: false,
      securityGroupName: 'datasync-vpce-sg',
    });

    this.props.agents?.forEach(agentConfig => {
      if (agentConfig.agentIpAddress) {
        datasyncVpceSg.addIngressRule(
          Peer.ipv4(agentConfig.agentIpAddress + '/32'),
          Port.tcp(443),
          'Allow DataSync data transfer HTTPS traffic from agents',
        );
        datasyncVpceSg.addIngressRule(
          Peer.ipv4(agentConfig.agentIpAddress + '/32'),
          Port.tcpRange(1024, 1064),
          'Allow DataSync control traffic from agents',
        );
      }
    });
    return datasyncVpceSg;
  }

  private createVpce(vpc: IVpc): VpcEndpointAndSecurityGroup | undefined {
    //Don't account for agents directly specifying a VPC Endpoint ID
    const vpcEndpointAgents = this.props.agents?.filter(x => !x.vpcEndpointId);

    //If all agents have an existing vpcEndpointId, don't bother creating a new one
    if (vpcEndpointAgents == undefined || vpcEndpointAgents.length == 0) {
      return undefined;
    }
    const securityGroup = this.createSecurityGroup(vpc);
    // Get Agent subnets
    const agentSubnetIds = vpcEndpointAgents?.map(x => x.subnetId);
    const agentSubnets = [...new Set(agentSubnetIds)].map(subnetId => {
      return Subnet.fromSubnetId(this, `subnet-${subnetId}`, subnetId);
    });
    const subnetSelection: SubnetSelection = { subnets: agentSubnets };
    const vpcEndpointProp: InterfaceVpcEndpointProps = {
      vpc: vpc,
      service: InterfaceVpcEndpointAwsService.DATASYNC,
      privateDnsEnabled: false,
      securityGroups: [securityGroup],
      lookupSupportedAzs: false,
      subnets: subnetSelection,
    };

    const datasyncVpce = new InterfaceVpcEndpoint(this, 'datasync-endpoint', vpcEndpointProp);

    new MdaaParamAndOutput(this, {
      ...{
        resourceType: 'vpc-endpoint',
        resourceId: 'datasync-service',
        name: 'id',
        value: datasyncVpce.vpcEndpointId,
      },
      ...this.props,
    });

    return { vpcEndpoint: datasyncVpce, securityGroup: securityGroup };
  }

  private securityGroupArnFromId(sgId?: string): string | undefined {
    if (!sgId) {
      return undefined;
    }
    return `arn:${this.partition}:ec2:${this.region}:${this.account}:security-group/${sgId}`;
  }

  private createDataSyncAgents(vpcEndpointAndSg?: VpcEndpointAndSecurityGroup): { [key: string]: MdaaDataSyncAgent } {
    // Create/register agents
    const generatedAgents: { [key: string]: MdaaDataSyncAgent } = {};

    // Do only if activation key is not empty
    this.props.agents
      ?.filter(x => x.activationKey)
      .forEach(agentConfig => {
        const securityGroupArn = agentConfig.securityGroupId
          ? this.securityGroupArnFromId(agentConfig.securityGroupId)
          : this.securityGroupArnFromId(vpcEndpointAndSg?.securityGroup.securityGroupId);

        const vpcEndpointId = agentConfig.vpcEndpointId
          ? agentConfig.vpcEndpointId
          : vpcEndpointAndSg?.vpcEndpoint.vpcEndpointId;

        if (!securityGroupArn) {
          throw new Error('securityGroupId must be specified in Agent Props if a VPC Endpoint was not generated.');
        }

        if (!vpcEndpointId) {
          throw new Error('vpcEndpointId must be specified in Agent Props if a VPC Endpoint was not generated.');
        }

        const subnetArns = `arn:${this.partition}:ec2:${this.region}:${this.account}:subnet/${agentConfig.subnetId}`;

        const agentProps: MdaaDataSyncAgentProps = {
          activationKey: agentConfig.activationKey as string, //undefined are filtered above
          agentName: agentConfig.agentName,
          securityGroupArns: [securityGroupArn],
          subnetArns: [subnetArns],
          vpcEndpointId: vpcEndpointId,
          naming: this.props.naming,
        };

        generatedAgents[agentConfig.agentName] = new MdaaDataSyncAgent(
          this,
          `${agentConfig.agentName}-agent`,
          agentProps,
        );

        new MdaaParamAndOutput(this, {
          ...{
            resourceType: 'agent',
            resourceId: agentConfig.agentName,
            name: 'ip',
            value: agentConfig.agentIpAddress,
          },
          ...this.props,
        });
      });
    return generatedAgents;
  }

  private createDataSyncLocations(
    generatedAgents: { [key: string]: MdaaDataSyncAgent },
    kmsKey: IKey,
    allLocationProps?: LocationsByTypeWithNameProps,
  ): GeneratedLocations {
    // Create locations type by type
    const generatedLocations: GeneratedLocations = {};

    allLocationProps?.s3?.forEach(locationProps => {
      generatedLocations[locationProps.locationName] = this.generateS3Location(locationProps);
    });

    allLocationProps?.smb?.forEach(locationProps => {
      generatedLocations[locationProps.locationName] = this.generateSmbLocation(locationProps, kmsKey, generatedAgents);
    });

    allLocationProps?.nfs?.forEach(locationProps => {
      generatedLocations[locationProps.locationName] = this.generateNfsLocation(locationProps, generatedAgents);
    });

    allLocationProps?.objectStorage?.forEach(locationProps => {
      generatedLocations[locationProps.locationName] = this.generateObjectStorageLocation(
        locationProps,
        kmsKey,
        generatedAgents,
      );
    });

    return generatedLocations;
  }

  private generateS3Location(locationProps: LocationS3WithNameProps): MdaaDataSyncS3Location {
    const datasyncS3LocationProps: MdaaDataSyncS3LocationProps = {
      ...locationProps,
      s3BucketArn: locationProps.s3BucketArn,
      s3Config: { bucketAccessRoleArn: locationProps.bucketAccessRoleArn },
      naming: this.props.naming,
    };
    return new MdaaDataSyncS3Location(this, `${locationProps.locationName}-s3-location`, datasyncS3LocationProps);
  }

  private createEmptyLocationSecret(
    kmsKey: IKey,
    locationName: string,
    initialValue: { [key: string]: SecretValue },
  ): ISecret {
    const secret = new Secret(this, `secret-${locationName}`, {
      secretName: this.props.naming.resourceName(locationName),
      encryptionKey: kmsKey,
      secretObjectValue: initialValue,
    });
    console.log(`Generated empty Secret for ${locationName}: ${this.props.naming.resourceName(locationName)}`);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      secret,
      [
        {
          id: 'AwsSolutions-SMG4',
          reason: 'Secret is for access to external system and cannot be automatically rotated.',
        },
        {
          id: 'NIST.800.53.R5-SecretsManagerRotationEnabled',
          reason: 'Secret is for access to external system and cannot be automatically rotated.',
        },
        {
          id: 'HIPAA.Security-SecretsManagerRotationEnabled',
          reason: 'Secret is for access to external system and cannot be automatically rotated.',
        },
        {
          id: 'PCI.DSS.321-SecretsManagerRotationEnabled',
          reason: 'Secret is for access to external system and cannot be automatically rotated.',
        },
      ],
      true,
    );
    return secret;
  }

  private generateObjectStorageLocation(
    locationProps: LocationObjectStorageWithNameProps,
    kmsKey: IKey,
    generatedAgents: { [key: string]: MdaaDataSyncAgent },
  ): MdaaDataSyncObjectStorageLocation {
    // check if the agent is specified by name => lookup from generated agents, if specified by arn => use it.
    if (locationProps.agentNames == undefined && locationProps.agentArns == undefined) {
      throw new Error('At least one of agentNames or agentArns must be defined on each object storage location');
    }

    const agentArns = locationProps.agentNames
      ? locationProps.agentNames.map(x => generatedAgents[x].attrAgentArn)
      : locationProps.agentArns || [];

    const secretName = locationProps.secretName
      ? locationProps.secretName
      : this.createEmptyLocationSecret(kmsKey, locationProps.locationName, {
          accessKey: new SecretValue('placeholder-accessKey'),
          secretKey: new SecretValue('placeholder-secretKey'),
        }).secretName;

    const datasyncObjectStorageLocationProps: MdaaDataSyncObjectStorageLocationProps = {
      ...locationProps,
      agentArns: agentArns,
      secretName: secretName,
      naming: this.props.naming,
    };
    return new MdaaDataSyncObjectStorageLocation(
      this,
      `${locationProps.locationName}-objectstorage-location`,
      datasyncObjectStorageLocationProps,
    );
  }

  private generateSmbLocation(
    locationProps: LocationSmbWithNameProps,
    kmsKey: IKey,
    generatedAgents: { [key: string]: MdaaDataSyncAgent },
  ): MdaaDataSyncSmbLocation {
    // check if the agent is specified by name => lookup from generated agents, if specified by arn => use it.
    if (locationProps.agentNames == undefined && locationProps.agentArns == undefined) {
      throw new Error('At least one of agentNames or agentArns must be defined on each object storage location');
    }
    const agentArns = locationProps.agentNames
      ? locationProps.agentNames.map(x => generatedAgents[x].attrAgentArn)
      : locationProps.agentArns || [];
    const secretName = locationProps.secretName
      ? locationProps.secretName
      : this.createEmptyLocationSecret(kmsKey, locationProps.locationName, {
          user: new SecretValue('placeholder-username'),
          password: new SecretValue('placeholder-password'),
        }).secretName;

    const createLocationProps: MdaaDataSyncSmbLocationProps = {
      ...locationProps,
      agentArns: agentArns,
      naming: this.props.naming,
      secretName: secretName,
      mountOptions: locationProps.smbVersion ? { version: locationProps.smbVersion } : undefined,
    };
    return new MdaaDataSyncSmbLocation(this, `${locationProps.locationName}-smb-location`, createLocationProps);
  }

  private generateNfsLocation(
    locationProps: LocationNfsWithNameProps,
    generatedAgents: { [key: string]: MdaaDataSyncAgent },
  ): CfnLocationNFS {
    // check if the agent is specified by name => lookup from generated agents, if specified by arn => use it.
    if (locationProps.agentNames == undefined && locationProps.agentArns == undefined) {
      throw new Error('At least one of agentNames or agentArns must be defined on each object storage location');
    }
    const agentArns = locationProps.agentNames
      ? locationProps.agentNames.map(x => generatedAgents[x].attrAgentArn)
      : locationProps.agentArns || [];

    const datasyncNfsLocationProps = {
      ...locationProps,
      onPremConfig: { agentArns: agentArns },
      mountOptions: locationProps.nfsVersion ? { version: locationProps.nfsVersion } : undefined,
    };

    new MdaaParamAndOutput(this, {
      ...{
        resourceType: 'location-nfs',
        resourceId: locationProps.locationName,
        name: 'server-hostname',
        value: locationProps.serverHostname,
      },
      naming: this.props.naming,
    });

    return new CfnLocationNFS(this, `${locationProps.locationName}-nfs-location`, datasyncNfsLocationProps);
  }

  private createDataSyncTasks(
    generatedLocations: GeneratedLocations,
    allTasks: TaskWithNameProps[],
    logGroup: ILogGroup,
  ) {
    // Create datasync task
    allTasks.forEach(taskProps => {
      const sourceLocationArn = taskProps.sourceLocationName
        ? generatedLocations[taskProps.sourceLocationName].attrLocationArn
        : taskProps.sourceLocationArn;
      if (!sourceLocationArn) {
        throw new Error('At least one of sourceLocationArn or sourceLocationName must be specified in Task Config');
      }

      const destinationLocationArn = taskProps.destinationLocationName
        ? generatedLocations[taskProps.destinationLocationName].attrLocationArn
        : taskProps.destinationLocationArn;
      if (!destinationLocationArn) {
        throw new Error(
          'At least one of destinationLocationArn or destinationLocationName must be specified in Task Config',
        );
      }

      const taskCreateProps = {
        ...taskProps,
        sourceLocationArn: sourceLocationArn,
        destinationLocationArn: destinationLocationArn,
        options: {
          ...taskProps.options,
          logLevel: 'TRANSFER',
        },
        cloudWatchLogGroupArn: logGroup.logGroupArn,
        name: this.props.naming.resourceName(taskProps.name, 256),
      };
      new CfnTask(this, `${taskProps.name}-task`, taskCreateProps);
    });
  }

  private createLogGroup(kmsKey: IKey): ILogGroup {
    const kmsDataSyncPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: ['kms:Encrypt*', 'kms:Decrypt*', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:Describe*'],
      principals: [new ServicePrincipal(`logs.${this.region}.amazonaws.com`)],
      conditions: {
        ArnEquals: {
          'kms:EncryptionContext:aws:logs:arn': `arn:${this.partition}:logs:${this.region}:${
            this.account
          }:log-group:/aws/datasync/task/${this.props.naming.resourceName()}`,
        },
      },
    });
    kmsKey.addToResourcePolicy(kmsDataSyncPolicy);

    const taskLogGroup: ILogGroup = new MdaaLogGroup(this, `task-loggroup`, {
      logGroupNamePathPrefix: '/aws/datasync/task/',
      encryptionKey: kmsKey,
      retention: RetentionDays.INFINITE,
      naming: this.props.naming,
    });
    taskLogGroup.grantWrite(new ServicePrincipal('datasync.amazonaws.com'));

    return taskLogGroup;
  }
}

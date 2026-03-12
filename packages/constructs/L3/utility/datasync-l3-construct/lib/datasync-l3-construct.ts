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
 * VPC configuration for DataSync deployment enabling private agent-to-service communication.
 * MDAA uses these values to create a VPC endpoint for the DataSync service and a security group
 * with ingress rules for agent control traffic (TCP 1024-1064) and data transfer (TCP 443).
 *
 * Use cases: Private network data transfers; VPC endpoint creation for DataSync; Agent network isolation
 *
 * AWS: VPC, VPC endpoints, security groups for DataSync service
 *
 * Validation: Both properties required; vpcId must be existing VPC; vpcCidrBlock must be valid CIDR matching the VPC
 */
export interface VpcProps {
  /**
   * The ID of the VPC for DataSync deployment. MDAA creates a VPC endpoint for the
   * DataSync service in this VPC, enabling private communication between agents and tasks
   * without internet gateway dependency.
   *
   * Use cases: VPC endpoint creation; Private agent connectivity; Network isolation for data transfers
   *
   * AWS: VPC ID used to create an InterfaceVpcEndpoint for the DataSync service
   *
   * Validation: Required; must be an existing VPC ID (e.g. vpc-009ce5ec1cff75fx6)
   */
  readonly vpcId: string;
  /**
   * CIDR block of the VPC, used for security group rule creation.
   * MDAA configures ingress rules on the DataSync VPC endpoint security group
   * based on this CIDR range.
   *
   * Use cases: Security group rule configuration; Network access control for DataSync agents
   *
   * AWS: VPC CIDR block for security group ingress rules
   *
   * Validation: Required; must be valid CIDR notation matching the actual VPC (e.g. 10.0.0.0/8)
   */
  readonly vpcCidrBlock: string;
}

export interface AgentWithNameProps extends AgentProps {
  readonly agentName: string;
}

/**
 * DataSync agent configuration for on-premises to AWS data transfer.
 * Agents must be deployed externally (EC2 with DataSync AMI or hypervisor) before activation.
 * Two-stage deployment: omit activationKey on first pass to create VPC endpoint and security group,
 * then add activationKey on second pass to register the agent. Activation keys expire in 30 minutes.
 *
 * Use cases: On-premises storage migration; Hybrid cloud data sync; Multi-AZ agent resiliency
 *
 * AWS: DataSync agent registration with VPC endpoint and security group configuration
 *
 * Validation: agentIpAddress and subnetId required; activationKey required for agent registration (second pass)
 */
export interface AgentProps {
  /**
   * Agent activation key retrieved via HTTP GET to the agent IP (port 80) or from the
   * DataSync console. Keys expire in 30 minutes. If omitted and VPC config is provided,
   * MDAA treats this as a first-pass deployment (creates VPC endpoint and security group only).
   *
   * Use cases: Agent registration; Two-stage deployment (omit for first pass, provide for second)
   *
   * AWS: DataSync agent activation key for ActivateAgent API call
   *
   * Validation: Optional; format XXXXX-XXXXX-XXXXX-XXXXX-XXXXX; expires 30 minutes after generation
   */
  readonly activationKey?: string;
  /**
   * Subnet ID where DataSync creates elastic network interfaces (ENIs) for data transfer tasks.
   * Deploy agents in different subnets/AZs for resiliency. The agent must be able to route
   * to all four ENIs created per task in this subnet.
   *
   * Use cases: Private network deployment; Multi-AZ resiliency; ENI placement for data transfer
   *
   * AWS: EC2 subnet for DataSync agent ENIs and VPC endpoint placement
   *
   * Validation: Required; must be existing subnet ID within the specified VPC
   */
  readonly subnetId: string;
  /**
   * VPC endpoint ID for private agent-to-service communication via AWS PrivateLink.
   * If omitted and VPC config is provided, MDAA creates a VPC endpoint automatically.
   * Use this when the VPC endpoint is managed outside MDAA.
   *
   * Use cases: Pre-existing VPC endpoint reuse; Externally managed PrivateLink endpoints
   *
   * AWS: VPC endpoint ID for DataSync PrivateLink connectivity (e.g. vpce-01234d5aff67890e1)
   *
   * Validation: Optional; if omitted, MDAA creates VPC endpoint when VPC config is specified
   */
  readonly vpcEndpointId?: string;
  /**
   * Security group ID for protecting data transfer task subnets.
   * If omitted and VPC config is provided, MDAA creates a security group with required
   * ingress rules (TCP 443 and TCP 1024-1064 from agent IPs).
   *
   * Use cases: Externally managed security groups; Custom network security policies
   *
   * AWS: EC2 security group for DataSync agent and task ENI protection
   *
   * Validation: Optional; if omitted, MDAA creates security group when VPC config is specified
   */
  readonly securityGroupId?: string;
  /**
   * IP address of the DataSync agent host. Used to create security group ingress rules
   * allowing agent control traffic (TCP 1024-1064) and data transfer (TCP 443) to the
   * VPC endpoint.
   *
   * Use cases: Security group rule automation; Agent-to-VPC endpoint connectivity
   *
   * AWS: Agent IP for security group ingress rules on the DataSync VPC endpoint
   *
   * Validation: Required; must be valid IPv4 address
   */
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
 * S3 location configuration for DataSync transfers to/from Amazon S3.
 * Defines the S3 bucket, IAM access role, optional storage class, and subdirectory prefix.
 *
 * Use cases: S3-to-S3 data migration; Cloud storage as transfer source or destination; Storage class optimization
 *
 * AWS: DataSync LocationS3 resource (CfnLocationS3)
 *
 * Validation: s3BucketArn and bucketAccessRoleArn required; s3StorageClass must be valid S3 storage class if provided
 */
export interface LocationS3Props {
  /**
   * ARN of the S3 bucket for this DataSync location. Can be a static ARN or a
   * dynamic reference (e.g. SSM parameter).
   *
   * Use cases: S3 bucket identification as transfer source or destination
   *
   * AWS: S3 bucket ARN for DataSync LocationS3 configuration
   *
   * Validation: Required; must be valid S3 bucket ARN
   */
  readonly s3BucketArn: string;
  /**
   * ARN of the IAM role DataSync assumes to read/write objects in the S3 location.
   * MDAA custom parameter — the value is used to construct the S3Config object.
   * Accepts a role ARN or dynamic reference.
   *
   * Use cases: S3 access permissions; Cross-account bucket access
   *
   * AWS: IAM role ARN for DataSync S3 access (maps to S3Config.bucketAccessRoleArn)
   *
   * Validation: Required; must be valid IAM role ARN or dynamic reference
   */
  readonly bucketAccessRoleArn: string;
  /**
   * S3 storage class for transferred files when this location is a task destination.
   * Enables cost optimization by directing data to the appropriate storage tier.
   *
   * Use cases: Storage cost optimization; Lifecycle-aware data placement
   *
   * AWS: S3 storage class (STANDARD, INTELLIGENT_TIERING, GLACIER, etc.)
   *
   * Validation: Optional; must be valid S3StorageClassType
   * @default STANDARD (S3 default)
   */
  readonly s3StorageClass?: S3StorageClassType;
  /**
   * Subdirectory (object key prefix) within the S3 bucket.
   * Must use forward slashes (e.g. /path/to/folder).
   *
   * Use cases: Scoped transfers to a specific S3 prefix; Organized data placement
   *
   * AWS: S3 object key prefix for DataSync location
   *
   * Validation: Optional; must use forward slash format if specified
   */
  readonly subdirectory?: string;
}

/**
 * SMB file share location configuration for DataSync transfers from on-premises Windows
 * file servers or NAS devices. Credentials (user/password) must be pre-stored in a
 * Secrets Manager secret in the format: {"user":"<username>","password":"<password>"}.
 * If secretName is omitted, MDAA creates an empty secret to populate after deployment.
 *
 * Use cases: Windows file share migration to S3; On-premises NAS data transfer; SMB protocol synchronization
 *
 * AWS: DataSync LocationSMB resource (CfnLocationSMB)
 *
 * Validation: serverHostname, subdirectory, and secretName required; one of agentNames or agentArns required (mutually exclusive)
 */
export interface LocationSmbProps {
  /**
   * Names of MDAA-generated DataSync agents from the agents config section.
   * Resolved to agent ARNs automatically. Only one agent is accepted for SMB locations.
   * Mutually exclusive with agentArns.
   *
   * Use cases: Referencing MDAA-managed agents by name; Simplified agent configuration
   *
   * AWS: Resolved to DataSync agent ARNs for SMB location onPremConfig
   *
   * Validation: Optional; mutually exclusive with agentArns; list accepts one member for SMB
   */
  readonly agentNames?: string[];
  /**
   * ARNs of DataSync agents for SMB connectivity. Use when agents are registered
   * outside MDAA. Mutually exclusive with agentNames.
   *
   * Use cases: Externally managed agent references; Pre-existing agent reuse
   *
   * AWS: DataSync agent ARNs for SMB location configuration
   *
   * Validation: Optional; mutually exclusive with agentNames; must be valid DataSync agent ARNs
   */
  readonly agentArns?: string[];
  /**
   * Secrets Manager secret name storing SMB credentials.
   * Secret must contain "user" and "password" fields: {"user":"<username>","password":"<password>"}.
   * If omitted, MDAA creates an empty secret to populate after deployment.
   *
   * Use cases: SMB authentication; Secure credential management for Windows file shares
   *
   * AWS: Secrets Manager secret for SMB file share authentication
   *
   * Validation: Required; secret must contain user and password fields
   */
  readonly secretName: string;
  /**
   * Hostname or IP address of the SMB server. The on-premises DataSync agent
   * uses this to mount the SMB share.
   *
   * Use cases: SMB server identification; On-premises file server connectivity
   *
   * AWS: SMB server hostname for DataSync agent mounting
   *
   * Validation: Required; must be valid DNS name or IPv4 address
   */
  readonly serverHostname: string;
  /**
   * SMB share subdirectory path for data access. Must use forward slashes
   * (e.g. /path/to/folder). The user specified in credentials must have
   * read/write permissions and execute access on directories.
   *
   * Use cases: Scoped SMB share access; Subdirectory-level data transfer
   *
   * AWS: SMB subdirectory path for DataSync location
   *
   * Validation: Required; must use forward slash format
   */
  readonly subdirectory: string;
  /**
   * Windows Active Directory domain name for domain-based SMB authentication.
   *
   * Use cases: Domain-joined SMB server authentication; Enterprise AD integration
   *
   * AWS: Windows domain for SMB server authentication
   *
   * Validation: Optional; must be valid Windows domain name if specified
   */
  readonly domain?: string;
  /**
   * SMB protocol version for mount options. MDAA custom parameter — the value
   * is used to construct the MountOptions object.
   *
   * Use cases: SMB protocol version control; Compatibility with older SMB servers
   *
   * AWS: SMB mount options version for DataSync location
   *
   * Validation: Optional; valid values: AUTOMATIC | SMB2 | SMB3
   * @default AUTOMATIC
   */
  readonly smbVersion?: SmbVersion;
}

/**
 * NFS file system location configuration for DataSync transfers from on-premises
 * Unix/Linux NFS servers. Agents connect to the NFS export and transfer data to AWS.
 * NFS exports should be configured with no_root_squash or appropriate read permissions
 * for all files and execute access on directories.
 *
 * Use cases: Linux NFS export migration to S3; Unix file system data transfer; NFS protocol synchronization
 *
 * AWS: DataSync LocationNFS resource (CfnLocationNFS)
 *
 * Validation: serverHostname and subdirectory required; one of agentNames or agentArns required (mutually exclusive)
 */
export interface LocationNfsProps {
  /**
   * Names of MDAA-generated DataSync agents from the agents config section.
   * Resolved to agent ARNs and constructed as the onPremConfig object.
   * Mutually exclusive with agentArns.
   *
   * Use cases: Referencing MDAA-managed agents by name; Multi-agent NFS connectivity
   *
   * AWS: Resolved to DataSync agent ARNs for NFS location onPremConfig
   *
   * Validation: Optional; mutually exclusive with agentArns; must reference valid generated agent names
   */
  readonly agentNames?: string[];
  /**
   * ARNs of DataSync agents for NFS connectivity. Used to construct the onPremConfig object.
   * Use when agents are registered outside MDAA. Mutually exclusive with agentNames.
   *
   * Use cases: Externally managed agent references; Pre-existing agent reuse
   *
   * AWS: DataSync agent ARNs for NFS location onPremConfig
   *
   * Validation: Optional; mutually exclusive with agentNames; must be valid DataSync agent ARNs
   */
  readonly agentArns?: string[];
  /**
   * Hostname or IP address of the NFS server. The on-premises DataSync agent
   * uses this to mount the NFS export. Must be DNS-compliant or a valid IPv4 address.
   *
   * Use cases: NFS server identification; On-premises file server connectivity
   *
   * AWS: NFS server hostname for DataSync agent mounting
   *
   * Validation: Required; must be valid DNS name or IPv4 address
   */
  readonly serverHostname: string;
  /**
   * NFS export path or subdirectory for data access. Must use forward slashes.
   * Use `showmount -e nfs-server-name` to list available exports.
   * DataSync needs read access to all files and execute access on directories.
   *
   * Use cases: Scoped NFS export access; Subdirectory-level data transfer
   *
   * AWS: NFS subdirectory path for DataSync location
   *
   * Validation: Required; must be valid NFS export path with forward slashes
   */
  readonly subdirectory: string;
  /**
   * NFS protocol version for mount options. MDAA custom parameter — the value
   * is used to construct the MountOptions object.
   *
   * Use cases: NFS protocol version control; Compatibility with specific NFS server versions
   *
   * AWS: NFS mount options version for DataSync location
   *
   * Validation: Optional; valid values: AUTOMATIC | NFS3 | NFSv4_0 | NFSv4_1
   * @default AUTOMATIC
   */
  readonly nfsVersion?: string;
}

/**
 * S3-compatible object storage location configuration for DataSync transfers from
 * third-party cloud storage (e.g. Google Cloud Storage, Azure Blob).
 * Credentials (accessKey/secretKey) must be pre-stored in a Secrets Manager secret
 * in the format: {"accessKey":"<access_key>","secretKey":"<secret_key>"}.
 * If secretName is omitted, MDAA creates an empty secret to populate after deployment.
 *
 * Use cases: Google Cloud Storage to S3 migration; Third-party object storage synchronization; Multi-cloud data transfer
 *
 * AWS: DataSync LocationObjectStorage resource (CfnLocationObjectStorage)
 *
 * Validation: bucketName, serverHostname, and secretName required; one of agentNames or agentArns required (mutually exclusive)
 */
export interface LocationObjectStorageProps {
  /**
   * Names of MDAA-generated DataSync agents from the agents config section.
   * Resolved to agent ARNs automatically. Mutually exclusive with agentArns.
   *
   * Use cases: Referencing MDAA-managed agents by name; Simplified agent configuration
   *
   * AWS: Resolved to DataSync agent ARNs for object storage location
   *
   * Validation: Optional; mutually exclusive with agentArns; must reference valid generated agent names
   */
  readonly agentNames?: string[];
  /**
   * ARNs of DataSync agents for object storage connectivity.
   * Use when agents are registered outside MDAA. Mutually exclusive with agentNames.
   *
   * Use cases: Externally managed agent references; Pre-existing agent reuse
   *
   * AWS: DataSync agent ARNs for object storage location configuration
   *
   * Validation: Optional; mutually exclusive with agentNames; must be valid DataSync agent ARNs
   */
  readonly agentArns?: string[];
  /**
   * Name of the object storage bucket (e.g. GCS bucket name).
   *
   * Use cases: Third-party cloud storage bucket identification
   *
   * AWS: Object storage bucket name for DataSync LocationObjectStorage
   *
   * Validation: Required; must be valid object storage bucket name
   */
  readonly bucketName: string;
  /**
   * Domain name or IP address of the object storage server endpoint.
   * The DataSync agent uses this to connect to the storage service.
   *
   * Use cases: Third-party storage endpoint connectivity; Custom object storage servers
   *
   * AWS: Object storage server hostname for DataSync agent connectivity
   *
   * Validation: Required; must be valid domain name or IP address
   */
  readonly serverHostname: string;
  /**
   * Secrets Manager secret name storing object storage credentials.
   * Secret must contain "accessKey" and "secretKey" fields.
   * If omitted, MDAA creates an empty secret to populate after deployment.
   *
   * Use cases: Object storage authentication; Secure credential management for third-party storage
   *
   * AWS: Secrets Manager secret for object storage authentication
   *
   * Validation: Required; secret must contain accessKey and secretKey fields
   */
  readonly secretName: string;
  /**
   * Port number for the object storage server (e.g. 443 for HTTPS, 80 for HTTP).
   *
   * Use cases: Custom port configuration; Non-standard object storage endpoints
   *
   * AWS: Object storage server port for DataSync connectivity
   *
   * Validation: Optional; must be valid port number
   * @default 443
   */
  readonly serverPort?: number;
  /**
   * Protocol for object storage server communication (e.g. HTTPS, HTTP).
   *
   * Use cases: Protocol selection for object storage endpoints; Secure vs. non-secure transfers
   *
   * AWS: Object storage server protocol for DataSync communication
   *
   * Validation: Optional; typically HTTPS or HTTP
   * @default HTTPS
   */
  readonly serverProtocol?: string;
  /**
   * Object prefix (subdirectory) within the bucket for scoped data access.
   * Must use forward slashes (e.g. /some/prefix).
   *
   * Use cases: Scoped transfers to a specific object prefix; Organized data placement
   *
   * AWS: Object storage prefix for DataSync location
   *
   * Validation: Optional; must use forward slash format if specified
   */
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
 * DataSync task configuration for automated data transfer between source and destination locations.
 * Tasks can reference MDAA-generated locations by name or external locations by ARN.
 * Supports scheduling via cron expressions, include/exclude file filtering, and transfer options
 * (e.g. preserveDeletedFiles, transferMode, verifyMode). MDAA automatically creates a
 * CloudWatch log group with KMS encryption for task logging.
 *
 * Use cases: Scheduled data synchronization; One-time data migration; Incremental transfers with filtering
 *
 * AWS: DataSync Task resource (CfnTask) with CloudWatch logging
 *
 * Validation: One of sourceLocationName/sourceLocationArn required; one of destinationLocationName/destinationLocationArn required
 */
export interface TaskProps {
  /**
   * Name of an MDAA-generated source location from the locations config section.
   * Resolved to the location ARN automatically. Mutually exclusive with sourceLocationArn.
   *
   * Use cases: Referencing MDAA-managed locations by name; Simplified task configuration
   *
   * AWS: Resolved to DataSync location ARN for task source
   *
   * Validation: Optional; mutually exclusive with sourceLocationArn; must reference valid generated location name
   */
  readonly sourceLocationName?: string; // to be resolved from the generatedLocations
  /**
   * Name of an MDAA-generated destination location from the locations config section.
   * Resolved to the location ARN automatically. Mutually exclusive with destinationLocationArn.
   *
   * Use cases: Referencing MDAA-managed locations by name; Simplified task configuration
   *
   * AWS: Resolved to DataSync location ARN for task destination
   *
   * Validation: Optional; mutually exclusive with destinationLocationArn; must reference valid generated location name
   */
  readonly destinationLocationName?: string; // to be resolved from the generatedLocations
  /**
   * ARN of an existing DataSync source location created outside MDAA.
   * Accepts static ARNs or dynamic references (e.g. SSM parameters).
   * Mutually exclusive with sourceLocationName.
   *
   * Use cases: Externally managed source locations; Pre-existing DataSync locations
   *
   * AWS: DataSync source location ARN for task configuration
   *
   * Validation: Optional; mutually exclusive with sourceLocationName; must be valid location ARN or dynamic reference
   */
  readonly sourceLocationArn?: string;
  /**
   * ARN of an existing DataSync destination location created outside MDAA.
   * Accepts static ARNs or dynamic references (e.g. SSM parameters).
   * Mutually exclusive with destinationLocationName.
   *
   * Use cases: Externally managed destination locations; Pre-existing DataSync locations
   *
   * AWS: DataSync destination location ARN for task configuration
   *
   * Validation: Optional; mutually exclusive with destinationLocationName; must be valid location ARN or dynamic reference
   */
  readonly destinationLocationArn?: string;
  /**
   * ARN of a KMS key for encrypting the task's CloudWatch log group.
   * If omitted, MDAA creates a new KMS key automatically.
   *
   * Use cases: Custom encryption key management; Shared KMS key across resources
   *
   * AWS: KMS key ARN for CloudWatch log group encryption
   *
   * Validation: Optional; must be valid KMS key ARN if provided
   */
  readonly logGroupEncryptionKeyArn?: string;
  /**
   * Filter rules to exclude specific files/directories from the transfer.
   * Uses SIMPLE_PATTERN filterType with pipe-delimited values (e.g. "*.tmp|*.temp").
   * CloudFormation accepts only one member in the excludes list.
   *
   * Use cases: Excluding temporary files; Skipping specific directories; Transfer scope reduction
   *
   * AWS: DataSync task exclude filter rules (CfnTask.FilterRuleProperty)
   *
   * Validation: Optional; must follow DataSync SIMPLE_PATTERN filtering syntax
   */
  readonly excludes?: CfnTask.FilterRuleProperty[];
  /**
   * Filter rules to include specific files/directories in the transfer.
   * Uses SIMPLE_PATTERN filterType with pipe-delimited values (e.g. "/data*|/ingestion*").
   * Values must begin with / and only accept asterisk at the rightmost position.
   * CloudFormation accepts only one member in the includes list.
   *
   * Use cases: Targeted data migration; Selective directory transfer; Transfer scope control
   *
   * AWS: DataSync task include filter rules (CfnTask.FilterRuleProperty)
   *
   * Validation: Optional; must follow DataSync SIMPLE_PATTERN filtering syntax; values begin with /
   */
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
  /** VPC configuration for DataSync agent deployment and VPC endpoint creation. */
  readonly vpc?: VpcProps;
  /** DataSync agent configurations for on-premises and hybrid connectivity. */
  readonly agents?: AgentWithNameProps[];
  /** Location configurations organized by storage protocol type. */
  readonly locations?: LocationsByTypeWithNameProps;
  /** DataSync task configurations for automated data transfer workflows. */
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

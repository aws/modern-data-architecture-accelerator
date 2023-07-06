/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefLogGroup } from '@aws-caef/cloudwatch-constructs';
import { CaefParamAndOutput } from "@aws-caef/construct";
import { CaefDataSyncAgent, CaefDataSyncAgentProps, CaefDataSyncObjectStorageLocation, CaefDataSyncObjectStorageLocationProps, CaefDataSyncS3Location, CaefDataSyncS3LocationProps, CaefDataSyncSmbLocation, CaefDataSyncSmbLocationProps } from '@aws-caef/datasync-constructs';
import { CaefSecurityGroup } from '@aws-caef/ec2-constructs';
import { CaefKmsKey } from '@aws-caef/kms-constructs';
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { IResolvable, SecretValue } from 'aws-cdk-lib';
import { CfnLocationNFS, CfnLocationObjectStorage, CfnLocationS3, CfnLocationSMB, CfnTask } from 'aws-cdk-lib/aws-datasync';
import { InterfaceVpcEndpoint, InterfaceVpcEndpointAwsService, InterfaceVpcEndpointProps, ISecurityGroup, IVpc, IVpcEndpoint, Peer, Port, Subnet, SubnetSelection, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { IKey } from "aws-cdk-lib/aws-kms";
import { ILogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface VpcProps {
    /**
     * The ID of the VPC for the DataSync deployment
     * CAEF will create a VPC Endpoint for DataSync service forn this VPC ID that will be used for communication between the agent and task
    */
    readonly vpcId: string;
    readonly vpcCidrBlock: string
}

export interface AgentWithNameProps extends AgentProps {
    readonly agentName: string
}

export interface AgentProps {
    /**
     * Your agent activation key. You can get the activation key either by sending an HTTP GET request with redirects that enable you to get the agent IP address (port 80). Alternatively, you can get it from the DataSync console.
     *
     * The redirect URL returned in the response provides you the activation key for your agent in the query string parameter `activationKey` . It might also include other activation-related parameters; however, these are merely defaults. The arguments you pass to this API call determine the actual configuration of your agent.
     * For more information, see [Creating and activating an agent](https://docs.aws.amazon.com/datasync/latest/userguide/activating-agent.html) in the *AWS DataSync User Guide.*
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-agent.html#cfn-datasync-agent-activationkey
     * 
     * If this parameter is not provided, and the VPC ID is specified in vpcEndpoint configuration, CAEF will assume this is the first pass and will create VPC endpoint and security group.
    */
    readonly activationKey?: string;
    /**
     * The identifiers of the subnets in which DataSync will create elastic network interfaces for each data transfer task. The agent that runs a task must be private. When you start a task that is associated with an agent created in a VPC, or one that has access to an IP address in a VPC, then the task is also private. In this case, DataSync creates four network interfaces for each task in your subnet. For a data transfer to work, the agent must be able to route to all these four network interfaces.
     */
    readonly subnetId: string;
    /**
     * The ID of the virtual private cloud (VPC) endpoint that the agent has access to. This is the client-side VPC endpoint, powered by AWS PrivateLink . If you don't have an AWS PrivateLink VPC endpoint, see [AWS PrivateLink and VPC endpoints](https://docs.aws.amazon.com//vpc/latest/userguide/endpoint-services-overview.html) in the *Amazon VPC User Guide* .
     *
     * For more information about activating your agent in a private network based on a VPC, see [Using AWS DataSync in a Virtual Private Cloud](https://docs.aws.amazon.com/datasync/latest/userguide/datasync-in-vpc.html) in the *AWS DataSync User Guide.*
     * A VPC endpoint ID looks like this: `vpce-01234d5aff67890e1`.
     * 
     * If the parameter is not provided and the VPC ID is specified in vpcEndpoint configuration, CAEF will create VPC endpoint and security group for agent registration.
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-agent.html#cfn-datasync-agent-vpcendpointid
    */
    readonly vpcEndpointId?: string;
    /**
      * The ID of the security group to be used to protect your data transfer task subnets, if created outside CAEF.
      * Otherwise, if not provided and the VPC ID is specified in vpcEndpoint configuration, CAEF will create VPC endpoint and security group and the security group will be used for this agent registration.
    */
    readonly securityGroupId?: string;
    /**
     * The IP address of the agent host. The values will be used to create an ingress rule for the task security group.
    */
    readonly agentIpAddress: string;
}

export type S3StorageClassType = "DEEP_ARCHIVE" | "GLACIER" | "INTELLIGENT_TIERING" | "ONEZONE_IA" | "OUTPOSTS" | "STANDARD" | "STANDARD_IA"
export type SmbVersion = "AUTOMATIC" | "SMB2" | "SMB3"
export type NfsVersion = "AUTOMATIC" | "NFS3" | "NFSv4_0" | "NFSv4_1"

// Cannot use CfnLocationS3Props as some values allow IResolvable
export interface LocationS3Props {
    /**
     * The ARN of the Amazon S3 bucket.
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locations3.html#cfn-datasync-locations3-s3bucketarn
     */
    readonly s3BucketArn: string
    /**
     * CAEF custom parameter to simplify the configuration. This value will be use to construct S3Config.
     * The Amazon Resource Name (ARN) of the AWS Identity and Access Management (IAM) role that is used to access an Amazon S3 bucket.
     */
    readonly bucketAccessRoleArn: string
    /**
     * The Amazon S3 storage class that you want to store your files in when this location is used as a task destination.
     *
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locations3.html#cfn-datasync-locations3-s3storageclass
     */
    readonly s3StorageClass?: S3StorageClassType
    /**
     * A subdirectory in the Amazon S3 bucket.
     *
     * > `Subdirectory` must be specified with forward slashes. For example, `/path/to/folder` .
     *
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locations3.html#cfn-datasync-locations3-subdirectory
     */
    readonly subdirectory?: string
}

export interface LocationSmbProps {
    /**
     * CAEF custom parameter that refers to the generated agent name. The value will resolve to agent ARN (looked up from the generatedAgents)
     */
    readonly agentNames?: string[]
    /**
     * The Amazon Resource Names (ARNs) of agents to use for a Server Message Block (SMB) location.
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationsmb.html#cfn-datasync-locationsmb-agentarns
     */
    readonly agentArns?: string[]
    /**
     * The name of the secret in Secrets Manager that stores the credential (domain, user and password) of the user in SMB File Server that can mount the share and has the permissions to access files and folders in the SMB share.
     *  
     * The secret must have "user" and "password" fields.
     * 
     * For example (in JSON format): {"user":"<username>","password":"<password>"}
     *
     */
    readonly secretName: string
    /**
     * The name of the SMB server. This value is the IP address or Domain Name Service (DNS) name of the SMB server. An agent that is installed on-premises uses this hostname to mount the SMB server in a network.
     *
     * > This name must either be DNS-compliant or must be an IP version 4 (IPv4) address.
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationsmb.html#cfn-datasync-locationsmb-serverhostname
     */
    readonly serverHostname: string
    /**
     * The subdirectory in the SMB file system that is used to read data from the SMB source location or write data to the SMB destination. The SMB path should be a path that's exported by the SMB server, or a subdirectory of that path. The path should be such that it can be mounted by other SMB clients in your network.
     *
     * > `Subdirectory` must be specified with forward slashes. For example, `/path/to/folder` .
     *
     * To transfer all the data in the folder you specified, DataSync must have permissions to mount the SMB share, as well as to access all the data in that share. To ensure this, either make sure that the user name and password specified belongs to the user who can mount the share, and who has the appropriate permissions for all of the files and directories that you want DataSync to access, or use credentials of a member of the Backup Operators group to mount the share. Doing either one enables the agent to access the data. For the agent to access directories, you must additionally enable all execute access.
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationsmb.html#cfn-datasync-locationsmb-subdirectory
     */
    readonly subdirectory: string
    /**
     * The name of the Windows domain that the SMB server belongs to.
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationsmb.html#cfn-datasync-locationsmb-domain
     */
    readonly domain?: string
    /**
     * CAEF custom parameter to simplify configuration. The value will be used to construct MountOptions object.
     * Valid values: "AUTOMATIC" | "SMB2" | "SMB3"
     * The mount options used by DataSync to access the SMB server.
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationsmb.html#cfn-datasync-locationsmb-mountoptions
     */
    readonly smbVersion?: SmbVersion
}

export interface LocationNfsProps {
    /**
     * CAEF custom parameter that refers to the generated agent name. The value will resolve to agent ARN (looked up from the generatedAgents) and be constructed as onPremConfig object.
     * Only either agentNames or agentArns can be specified, not both.
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-datasync-locationnfs-mountoptions.html
    */
    readonly agentNames?: string[]
    /**
     * CAEF custom parameter that refers to the generated agent name. The value will be used constructed as onPremConfig object.
     * Only either agentNames or agentArns can be specified, not both.
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-datasync-locationnfs-mountoptions.html
    */
    readonly agentArns?: string[]    // to construct onPremConfig
    /**
     * The name of the NFS server. This value is the IP address or Domain Name Service (DNS) name of the NFS server. An agent that is installed on-premises uses this hostname to mount the NFS server in a network.
     * 
     * If you are copying data to or from your AWS Snowcone device, see [NFS Server on AWS Snowcone](https://docs.aws.amazon.com/datasync/latest/userguide/create-nfs-location.html#nfs-on-snowcone) for more information.
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationnfs.html#cfn-datasync-locationnfs-serverhostname
     */
    readonly serverHostname: string
    /**
     * The subdirectory in the NFS file system that is used to read data from the NFS source location or write data to the NFS destination.
     * The NFS path should be a path that's exported by the NFS server, or a subdirectory of that path. The path should be such that it can be mounted by other NFS clients in your network.
     * 
     * To see all the paths exported by your NFS server, run "showmount -e nfs-server-name" from an NFS client that has access to your server.
     * You can specify any directory that appears in the results, and any subdirectory of that directory. Ensure that the NFS export is accessible without Kerberos authentication.
     * 
     * To transfer all the data in the folder you specified, DataSync needs to have permissions to read all the data.
     * To ensure this, either configure the NFS export with no_root_squash, or ensure that the permissions for all of the files that you want DataSync allow read access for all users. Doing either enables the agent to read the files. For the agent to access directories, you must additionally enable all execute access.
     * 
     * If you are copying data to or from your AWS Snowcone device, see [NFS Server on AWS Snowcone](https://docs.aws.amazon.com/datasync/latest/userguide/create-nfs-location.html#nfs-on-snowcone) for more information.
     *
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationnfs.html#cfn-datasync-locationnfs-subdirectory
     */
    readonly subdirectory: string
    /**
     * CAEF custom parameter to simplify configuration. The value will be used to construct MountOptions object.
     * Valid values: "AUTOMATIC" | "NFS3" | "NFSv4_0" | "NFSv4_1"
     * 
     * The NFS mount options that DataSync can use to mount your NFS share.
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationnfs.html#cfn-datasync-locationnfs-mountoptions
     */
    readonly nfsVersion?: string
}

export interface LocationObjectStorageProps {
    /**
     * CAEF custom parameter that refers to the generated agent name. The value will resolve to agent ARN (looked up from the generatedAgents).
     * Only either agentNames or agentArns can be specified, not both.
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationobjectstorage.html#cfn-datasync-locationobjectstorage-agentarns
    */
    readonly agentNames?: string[]
    /**
     * Specifies the Amazon Resource Names (ARNs) of the DataSync agents that can securely connect with your location.
     * Only either agentNames or agentArns can be specified, not both.
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationobjectstorage.html#cfn-datasync-locationobjectstorage-agentarns
    */
    readonly agentArns?: string[]
    /**
     * Specifies the name of the object storage bucket involved in the transfer.
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationobjectstorage.html#cfn-datasync-locationobjectstorage-bucketname
     */
    readonly bucketName: string
    /**
     * Specifies the domain name or IP address of the object storage server. A DataSync agent uses this hostname to mount the object storage server in a network.
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationobjectstorage.html#cfn-datasync-locationobjectstorage-serverhostname
     */
    readonly serverHostname: string
    /**
     * The name of the secret in Secrets Manager that stores the credential (accessKey/user name and secretKey) of the object storage server.
     *  
     * The secret must have "accessKey" and "secretKey" fields.
     * 
     * For example (in JSON format): {"accessKey":"<access_key>","secretKey":"<secret_key>"}
     *
    */
    readonly secretName: string
    /**
     * Specifies the port that your object storage server accepts inbound network traffic on. Set to port 80 (HTTP), 443 (HTTPS), or a custom port if needed.
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationobjectstorage.html#cfn-datasync-locationobjectstorage-serverport
     */
    readonly serverPort?: number
    /**
     * Specifies the protocol that your object storage server uses to communicate.
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationobjectstorage.html#cfn-datasync-locationobjectstorage-serverprotocol
     */
    readonly serverProtocol?: string
    /**
     * Specifies the object prefix that DataSync reads from or writes to.
     *
     * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-locationobjectstorage.html#cfn-datasync-locationobjectstorage-subdirectory
     */
    readonly subdirectory?: string
}

export interface GeneratedLocations {
    /**
     * key: location name
     */
    /** @jsii ignore */
    [ key: string ]: CfnLocationNFS | CfnLocationSMB | CfnLocationS3 | CfnLocationObjectStorage
}

export interface TaskWithNameProps extends TaskProps {
    /**
    * The name of a task. This value is a text reference that is used to identify the task in the console.
    * 
    * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-task.html#cfn-datasync-task-name
    */
    readonly name: string
}

export interface TaskProps {
    /**
     * CAEF custom parameter that refers to the generated source location name. The value will resolve to source location ARN (looked up from the generatedLocations).
     * Only either sourceLocationName or sourceLocationArn can be specified, not both.
     */
    readonly sourceLocationName?: string    // to be resolved from the generatedLocations
    /**
     * CAEF custom parameter that refers to the generated destination location name. The value will resolve to destination location ARN (looked up from the generatedLocations).
     * Only either destinationLocationName or destinationLocationArn can be specified, not both.
     */
    readonly destinationLocationName?: string    // to be resolved from the generatedLocations
    /**
     * The Amazon Resource Name (ARN) of the source location for the task.
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-task.html#cfn-datasync-task-sourcelocationarn
     */
    readonly sourceLocationArn?: string
    /**
     * The Amazon Resource Name (ARN) of an AWS storage resource's location.
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-task.html#cfn-datasync-task-destinationlocationarn
     */
    readonly destinationLocationArn?: string

    /**
     * CAEF custom parameter. The ARN of the KMS key that will be used to encrypt the Task logging.
     * If this parameter is not specified, CAEF will create a new KMS key.
     */
    readonly logGroupEncryptionKeyArn?: string

    /**
     * Specifies a list of filter rules that exclude specific data during your transfer.
     * For more information and examples, see [Filtering data transferred by DataSync](https://docs.aws.amazon.com/datasync/latest/userguide/filtering.html).
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-task.html#cfn-datasync-task-excludes
     */
    readonly excludes?: CfnTask.FilterRuleProperty[]
    /**
     * Specifies a list of filter rules that include specific data during your transfer.
     * For more information and examples, see [Filtering data transferred by DataSync](https://docs.aws.amazon.com/datasync/latest/userguide/filtering.html).
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-task.html#cfn-datasync-task-includes
     */
    readonly includes?: CfnTask.FilterRuleProperty[]

    /**
     * Specifies the configuration options for a task. Some options include preserving file or object metadata and verifying data integrity.
     * 
     * You can also override these options before starting an individual run of a task (also known as a task execution).
     * For more information, see [StartTaskExecution](https://docs.aws.amazon.com/datasync/latest/userguide/API_StartTaskExecution.html).
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-task.html#cfn-datasync-task-options
     */
    readonly options?: CfnTask.OptionsProperty | IResolvable
    /**
     * Specifies a schedule used to periodically transfer files from a source to a destination location. The schedule should be specified in UTC time.
     * For more information, see [Scheduling your task](https://docs.aws.amazon.com/datasync/latest/userguide/task-scheduling.html).
     * 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-datasync-task.html#cfn-datasync-task-schedule
     */
    readonly schedule?: CfnTask.TaskScheduleProperty | IResolvable
}

export interface LocationS3WithNameProps extends LocationS3Props {
    readonly locationName: string
}

export interface LocationSmbWithNameProps extends LocationSmbProps {
    readonly locationName: string
}

export interface LocationNfsWithNameProps extends LocationNfsProps {
    readonly locationName: string
}

export interface LocationObjectStorageWithNameProps extends LocationObjectStorageProps {
    readonly locationName: string
}

export interface LocationsByTypeWithNameProps {
    readonly s3?: LocationS3WithNameProps[]
    readonly smb?: LocationSmbWithNameProps[]
    readonly nfs?: LocationNfsWithNameProps[]
    readonly objectStorage?: LocationObjectStorageWithNameProps[]
}

export interface DataSyncL3ConstructProps extends CaefL3ConstructProps {
    readonly vpc?: VpcProps;
    readonly agents?: AgentWithNameProps[];
    readonly locations?: LocationsByTypeWithNameProps;
    readonly tasks?: TaskWithNameProps[]
}

interface VpcEndpointAndSecurityGroup {
    readonly vpcEndpoint: IVpcEndpoint,
    readonly securityGroup: ISecurityGroup
}

export class DataSyncL3Construct extends CaefL3Construct {
    protected readonly props: DataSyncL3ConstructProps


    constructor( scope: Construct, id: string, props: DataSyncL3ConstructProps ) {
        super( scope, id, props )
        this.props = props

        let vpcEndpointAndSg: VpcEndpointAndSecurityGroup | undefined
        if ( props.vpc ) {
            const vpc = Vpc.fromVpcAttributes( this.scope, "vpcLookup", {
                vpcId: props.vpc.vpcId,
                availabilityZones: [ "dummy" ],
                vpcCidrBlock: props.vpc.vpcCidrBlock
            } )
            vpcEndpointAndSg = this.createVpce( vpc )
        }
        const kmsKey = this.createKmsKey()
        const generatedAgents = this.createDataSyncAgents( vpcEndpointAndSg )
        const generatedLocations = this.createDataSyncLocations( generatedAgents, kmsKey, this.props.locations )
        const logGroup = this.createLogGroup( kmsKey )

        if ( this.props.tasks ) { this.createDataSyncTasks( generatedLocations, this.props.tasks, logGroup ) }
    }

    private createKmsKey (): IKey {
        return new CaefKmsKey( this, `kms-key`, {
            naming: this.props.naming
        } )
    }

    private createSecurityGroup ( vpc: IVpc ): ISecurityGroup {
        const datasyncVpceSg = new CaefSecurityGroup( this, 'vpce-datasync-sg', {
            naming: this.props.naming,
            vpc: vpc,
            allowAllOutbound: false,
            securityGroupName: 'datasync-vpce-sg'
        } );

        this.props.agents?.forEach( agentConfig => {
            if ( agentConfig.agentIpAddress ) {
                datasyncVpceSg.addIngressRule(
                    Peer.ipv4( agentConfig.agentIpAddress + "/32" ),
                    Port.tcp( 443 ),
                    'Allow DataSync data transfer HTTPS traffic from agents',
                );
                datasyncVpceSg.addIngressRule(
                    Peer.ipv4( agentConfig.agentIpAddress + "/32" ),
                    Port.tcpRange( 1024, 1064 ),
                    'Allow DataSync control traffic from agents',
                );
            }
        } )
        return datasyncVpceSg
    }

    private createVpce ( vpc: IVpc ): VpcEndpointAndSecurityGroup | undefined {
        //Don't account for agents directly specifying a VPC Endpoint ID
        const vpcEndpointAgents = this.props.agents?.filter( x => !x.vpcEndpointId )

        //If all agents have an existing vpcEndpointId, don't bother creating a new one
        if ( vpcEndpointAgents == undefined || vpcEndpointAgents.length == 0 ) {
            return undefined
        }
        const securityGroup = this.createSecurityGroup( vpc )
        // Get Agent subnets
        const agentSubnetIds = vpcEndpointAgents?.map( x => x.subnetId )
        const agentSubnets = [ ...new Set( agentSubnetIds ) ].map( subnetId => {
            return Subnet.fromSubnetId( this, `subnet-${ subnetId }`, subnetId )
        } )
        const subnetSelection: SubnetSelection = { subnets: agentSubnets }
        const vpcEndpointProp: InterfaceVpcEndpointProps = {
            vpc: vpc,
            service: InterfaceVpcEndpointAwsService.DATASYNC,
            privateDnsEnabled: false,
            securityGroups: [ securityGroup ],
            lookupSupportedAzs: false,
            subnets: subnetSelection
        }

        const datasyncVpce = new InterfaceVpcEndpoint( this, 'datasync-endpoint', vpcEndpointProp );

        new CaefParamAndOutput( this, {
            ...{
                resourceType: "vpc-endpoint",
                resourceId: "datasync-service",
                name: "id",
                value: datasyncVpce.vpcEndpointId
            }, ...this.props
        } );

        return { vpcEndpoint: datasyncVpce, securityGroup: securityGroup }
    }

    private securityGroupArnFromId ( sgId?: string ): string | undefined {
        if ( !sgId ) {
            return undefined
        }
        return `arn:${ this.partition }:ec2:${ this.region }:${ this.account }:security-group/${ sgId }`
    }

    private createDataSyncAgents ( vpcEndpointAndSg?: VpcEndpointAndSecurityGroup ): { [ key: string ]: CaefDataSyncAgent } {
        // Create/register agents
        const generatedAgents: { [ key: string ]: CaefDataSyncAgent } = {}

        // Do only if activation key is not empty
        this.props.agents?.filter( x => x.activationKey ).forEach( agentConfig => {

            const securityGroupArn = agentConfig.securityGroupId ? this.securityGroupArnFromId( agentConfig.securityGroupId ) :
                this.securityGroupArnFromId( vpcEndpointAndSg?.securityGroup.securityGroupId )

            const vpcEndpointId = agentConfig.vpcEndpointId ? agentConfig.vpcEndpointId : vpcEndpointAndSg?.vpcEndpoint.vpcEndpointId

            if ( !securityGroupArn ) {
                throw new Error( "securityGroupId must be specified in Agent Props if a VPC Endpoint was not generated." )
            }

            if ( !vpcEndpointId ) {
                throw new Error( "vpcEndpointId must be specified in Agent Props if a VPC Endpoint was not generated." )
            }

            const subnetArns = `arn:${ this.partition }:ec2:${ this.region }:${ this.account }:subnet/${ agentConfig.subnetId }`

            const agentProps: CaefDataSyncAgentProps = {
                activationKey: agentConfig.activationKey as string, //undefined are filtered above
                agentName: agentConfig.agentName,
                securityGroupArns: [ securityGroupArn ],
                subnetArns: [ subnetArns ],
                vpcEndpointId: vpcEndpointId,
                naming: this.props.naming
            }

            generatedAgents[ agentConfig.agentName ] = new CaefDataSyncAgent( this, `${ agentConfig.agentName }-agent`, agentProps )

            new CaefParamAndOutput( this, {
                ...{
                    resourceType: "agent",
                    resourceId: agentConfig.agentName,
                    name: "ip",
                    value: agentConfig.agentIpAddress
                }, ...this.props
            } )

        } )
        return generatedAgents
    }

    private createDataSyncLocations ( generatedAgents: { [ key: string ]: CaefDataSyncAgent }, kmsKey: IKey, allLocationProps?: LocationsByTypeWithNameProps ): GeneratedLocations {
        // Create locations type by type
        const generatedLocations: GeneratedLocations = {}

        allLocationProps?.s3?.forEach( locationProps => {
            generatedLocations[ locationProps.locationName ] = this.generateS3Location( locationProps )
        } )

        allLocationProps?.smb?.forEach( locationProps => {
            generatedLocations[ locationProps.locationName ] = this.generateSmbLocation( locationProps, kmsKey, generatedAgents )
        } )

        allLocationProps?.nfs?.forEach( locationProps => {
            generatedLocations[ locationProps.locationName ] = this.generateNfsLocation( locationProps, generatedAgents )
        } )

        allLocationProps?.objectStorage?.forEach( locationProps => {
            generatedLocations[ locationProps.locationName ] = this.generateObjectStorageLocation( locationProps, kmsKey, generatedAgents )
        } )

        return generatedLocations
    }

    private generateS3Location ( locationProps: LocationS3WithNameProps ): CaefDataSyncS3Location {
        const datasyncS3LocationProps: CaefDataSyncS3LocationProps = {
            ...locationProps,
            s3BucketArn: locationProps.s3BucketArn,
            s3Config: { "bucketAccessRoleArn": locationProps.bucketAccessRoleArn },
            naming: this.props.naming
        }
        return new CaefDataSyncS3Location( this, `${ locationProps.locationName }-s3-location`, datasyncS3LocationProps )

    }

    private createEmptyLocationSecret ( kmsKey: IKey, locationName: string, initialValue: any ): ISecret {
        const secret = new Secret( this, `secret-${ locationName }`, {
            secretName: this.props.naming.resourceName( locationName ),
            encryptionKey: kmsKey,
            secretObjectValue: initialValue
        } )
        console.log( `Generated empty Secret for ${ locationName }: ${ this.props.naming.resourceName( locationName ) }` )
        NagSuppressions.addResourceSuppressions(
            secret,
            [
                { id: 'AwsSolutions-SMG4', reason: 'Secret is for access to external system and cannot be automatically rotated.' },
                { id: 'NIST.800.53.R5-SecretsManagerRotationEnabled', reason: 'Secret is for access to external system and cannot be automatically rotated.' },
                { id: 'HIPAA.Security-SecretsManagerRotationEnabled', reason: 'Secret is for access to external system and cannot be automatically rotated.' },

            ],
            true
        );
        return secret
    }

    private generateObjectStorageLocation ( locationProps: LocationObjectStorageWithNameProps, kmsKey: IKey, generatedAgents: { [ key: string ]: CaefDataSyncAgent } ): CaefDataSyncObjectStorageLocation {

        // check if the agent is specified by name => lookup from generated agents, if specified by arn => use it.
        if ( locationProps.agentNames == undefined && locationProps.agentArns == undefined ) {
            throw new Error( "At least one of agentNames or agentArns must be defined on each object storage location" )
        }

        const agentArns = locationProps.agentNames ? locationProps.agentNames.map( x => generatedAgents[ x ].attrAgentArn ) : locationProps.agentArns || []

        const secretName = locationProps.secretName ? locationProps.secretName : this.createEmptyLocationSecret( kmsKey, locationProps.locationName, {
            accessKey: new SecretValue( 'placeholder-accessKey' ),
            secretKey: new SecretValue( 'placeholder-secretKey' ),
        } ).secretName

        const datasyncObjectStorageLocationProps: CaefDataSyncObjectStorageLocationProps = {
            ...locationProps,
            agentArns: agentArns,
            secretName: secretName,
            naming: this.props.naming
        }
        return new CaefDataSyncObjectStorageLocation( this, `${ locationProps.locationName }-objectstorage-location`, datasyncObjectStorageLocationProps )

    }

    private generateSmbLocation ( locationProps: LocationSmbWithNameProps, kmsKey: IKey, generatedAgents: { [ key: string ]: CaefDataSyncAgent } ): CaefDataSyncSmbLocation {

        // check if the agent is specified by name => lookup from generated agents, if specified by arn => use it.
        if ( locationProps.agentNames == undefined && locationProps.agentArns == undefined ) {
            throw new Error( "At least one of agentNames or agentArns must be defined on each object storage location" )
        }
        const agentArns = locationProps.agentNames ? locationProps.agentNames.map( x => generatedAgents[ x ].attrAgentArn ) : locationProps.agentArns || []
        const secretName = locationProps.secretName ? locationProps.secretName : this.createEmptyLocationSecret( kmsKey, locationProps.locationName, {
            user: new SecretValue( 'placeholder-username' ),
            password: new SecretValue( 'placeholder-password' ),
        } ).secretName

        const createLocationProps: CaefDataSyncSmbLocationProps = {
            ...locationProps,
            agentArns: agentArns,
            naming: this.props.naming,
            secretName: secretName,
            mountOptions: locationProps.smbVersion ? { "version": locationProps.smbVersion } : undefined
        }
        return new CaefDataSyncSmbLocation( this, `${ locationProps.locationName }-smb-location`, createLocationProps )
    }

    private generateNfsLocation ( locationProps: LocationNfsWithNameProps, generatedAgents: { [ key: string ]: CaefDataSyncAgent } ): CfnLocationNFS {

        // check if the agent is specified by name => lookup from generated agents, if specified by arn => use it.
        if ( locationProps.agentNames == undefined && locationProps.agentArns == undefined ) {
            throw new Error( "At least one of agentNames or agentArns must be defined on each object storage location" )
        }
        const agentArns = locationProps.agentNames ? locationProps.agentNames.map( x => generatedAgents[ x ].attrAgentArn ) : locationProps.agentArns || []

        const datasyncNfsLocationProps = {
            ...locationProps,
            onPremConfig: { "agentArns": agentArns },
            mountOptions: locationProps.nfsVersion ? { "version": locationProps.nfsVersion } : undefined
        }

        new CaefParamAndOutput( this, {
            ...{
                resourceType: "location-nfs",
                resourceId: locationProps.locationName,
                name: "server-hostname",
                value: locationProps.serverHostname
            },
            naming: this.props.naming
        } );

        return new CfnLocationNFS( this, `${ locationProps.locationName }-nfs-location`, datasyncNfsLocationProps )

    }

    private createDataSyncTasks ( generatedLocations: GeneratedLocations, allTasks: TaskWithNameProps[], logGroup: ILogGroup ) {
        // Create datasync task
        allTasks.forEach( taskProps => {

            const sourceLocationArn = taskProps.sourceLocationName ? generatedLocations[ taskProps.sourceLocationName ].attrLocationArn : taskProps.sourceLocationArn
            if ( !sourceLocationArn ) {
                throw new Error( "At least one of sourceLocationArn or sourceLocationName must be specified in Task Config" )
            }

            const destinationLocationArn = taskProps.destinationLocationName ? generatedLocations[ taskProps.destinationLocationName ].attrLocationArn : taskProps.destinationLocationArn
            if ( !destinationLocationArn ) {
                throw new Error( "At least one of destinationLocationArn or destinationLocationName must be specified in Task Config" )
            }

            const taskCreateProps = {
                ...taskProps,
                sourceLocationArn: sourceLocationArn,
                destinationLocationArn: destinationLocationArn,
                options: {
                    ...taskProps.options,
                    logLevel: "TRANSFER"
                },
                cloudWatchLogGroupArn: logGroup.logGroupArn,
                name: this.props.naming.resourceName( taskProps.name, 256 )
            }
            new CfnTask( this, `${ taskProps.name }-task`, taskCreateProps )
        } )
    }

    private createLogGroup ( kmsKey: IKey ): ILogGroup {

        const kmsDataSyncPolicy = new PolicyStatement( {
            effect: Effect.ALLOW,
            resources: [ '*' ],
            actions: [
                "kms:Encrypt*",
                "kms:Decrypt*",
                "kms:ReEncrypt*",
                "kms:GenerateDataKey*",
                "kms:Describe*"
            ],
            principals: [ new ServicePrincipal( `logs.${ this.region }.amazonaws.com` ) ],
            conditions: {
                "ArnEquals": {
                    "kms:EncryptionContext:aws:logs:arn": `arn:${ this.partition }:logs:${ this.region }:${ this.account }:log-group:/aws/datasync/task/${ this.props.naming.resourceName() }`
                }
            }
        } )
        kmsKey.addToResourcePolicy( kmsDataSyncPolicy )

        const taskLogGroup: ILogGroup = new CaefLogGroup( this, `task-loggroup`, {
            logGroupNamePathPrefix: "/aws/datasync/task/",
            encryptionKey: kmsKey,
            retention: RetentionDays.INFINITE,
            naming: this.props.naming
        } )
        taskLogGroup.grantWrite( new ServicePrincipal( 'datasync.amazonaws.com' ) );

        return taskLogGroup
    }



}

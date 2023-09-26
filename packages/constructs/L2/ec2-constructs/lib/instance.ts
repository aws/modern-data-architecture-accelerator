/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefParamAndOutput, CaefConstructProps } from "@aws-caef/construct";
import { ICaefRole } from '@aws-caef/iam-constructs';
import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Instance, InstanceProps, InstanceType, ApplyCloudFormationInitOptions, BlockDeviceVolume, EbsDeviceVolumeType, CloudFormationInit, IMachineImage, ISecurityGroup, IVpc, UserData, ISubnet, BlockDevice, CfnInstance, LaunchTemplate } from "aws-cdk-lib/aws-ec2";
import { IKey } from "aws-cdk-lib/aws-kms";
import { NagSuppressions } from "cdk-nag";
import { CaefCustomResource, CaefCustomResourceProps } from "@aws-caef/custom-constructs";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { Code, Runtime } from "aws-cdk-lib/aws-lambda";

/**
 * Properties for creating a Compliance EC2 instance
 */

export interface CaefEC2InstanceProps extends CaefConstructProps {
    /**
     * Type of instance to launch.
     */
    readonly instanceType: InstanceType;
    /**
     * AMI to launch.
     */
    readonly machineImage: IMachineImage;
    /**
     * VPC to launch the instance in.
     */
    readonly vpc: IVpc;
    /**
      * Where to place the instance within the VPC.
      */
    readonly instanceSubnet: ISubnet;
    /**
      * list of configs for block device to be mapped to instance
      */
    readonly blockDeviceProps: BlockDeviceProps[];
    /**
     * Specific kms key to encrypt root volume.
     */
    readonly kmsKey: IKey;
    /**
     * Whether the instance could initiate connections to anywhere by default.
     */
    readonly allowAllOutbound?: boolean;
    /**
     * In which AZ to place the instance within the VPC.
     */
    readonly availabilityZone?: string;
    /**
     * Apply the given CloudFormation Init configuration to the instance at startup.
     * For Linux
     * @link https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
     * For Windows
     * @link https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/ec2-windows-user-data.html
     */
    readonly init?: CloudFormationInit;
    /**
     * Use the given options for applying CloudFormation Init.
     * 
     * @link https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.ApplyCloudFormationInitOptions.html
     */
    readonly initOptions?: ApplyCloudFormationInitOptions;
    /**
     * The name of the instance.
     */
    readonly instanceName?: string;
    /**
     * Name of SSH keypair to grant access to instance.
     */
    readonly keyName?: string;
    /**
     * Defines a private IP address to associate with an instance.
     */
    readonly privateIpAddress?: string;
    /**
     * Propagate the EC2 instance tags to the EBS volumes.
     */
    readonly propagateTagsToVolumeOnCreation?: boolean;
    /**
     * The length of time to wait for the resourceSignalCount.
     */
    readonly resourceSignalTimeout?: Duration;
    /**
     * An IAM role to associate with the instance profile assigned to this instance.
     */
    readonly role: ICaefRole;
    /**
     * Security Group to assign to this instance.
     */
    readonly securityGroup?: ISecurityGroup;
    /**
     * Specifies whether to enable an instance launched in a VPC to perform NAT.
     */
    readonly sourceDestCheck?: boolean;
    /**
      * Specific UserData to use.
      */
    readonly userData?: UserData;
    /**
     * Changes to the UserData force replacement.
     * Depending the EC2 instance type, changing UserData either restarts the instance or replaces the instance.
     * Instance store-backed instances are replaced.
     * EBS-backed instances are restarted.
     * By default, restarting does not execute the new UserData so you will need a different mechanism to ensure the instance is restarted.
     * Setting this to true will make the instance's Logical ID depend on the UserData, which will cause CloudFormation to replace it if the UserData changes.
     * default: true iff initOptions is specified, false otherwise.
     */
    readonly userDataCausesReplacement?: boolean;

}

export interface BlockDeviceProps {
    /**
     * Name of dievice to be mapped
     * for Linux
     * @link https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/device_naming.html
     * for Windows
     * @link https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/device_naming.html
     */
    readonly deviceName: string;
    /**
     * Size of ebs volume
     */
    readonly volumeSizeInGb: number;
    /**
     * Type of EBS to use for root volume.
     * Possible choices below
     * @link https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.EbsDeviceVolumeType.html
     */
    readonly ebsType?: EbsDeviceVolumeType;
    /**
     * The number of I/O operations per second (IOPS). 
     * This parameter is required for io1 and io2 volumes. 
     * @link https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-ec2-blockdev-template.html#cfn-ec2-blockdev-template-volumetype:~:text=%3A%20No%20interruption-,Iops,-The%20number%20of
     */
    readonly iops?: number;

}

/**
 * A construct for creating a compliant EC2 instance resource.
 * Specifically, the construct ensures that the EC2 instance name follows naming convention,
 * and tags are propogated to volume.
 */
export class CaefEC2Instance extends Instance {

    private static getBlockDeviceProps ( blockDeviceProps: BlockDeviceProps[], kmsKey: IKey ) {
        return blockDeviceProps.map( blockDeviceProps => {
            return {
                deviceName: blockDeviceProps.deviceName,
                volume: BlockDeviceVolume.ebs( blockDeviceProps.volumeSizeInGb, {
                    encrypted: true,
                    deleteOnTermination: false,
                    kmsKey: kmsKey,
                    volumeType: blockDeviceProps.ebsType,
                    iops: blockDeviceProps.iops,
                } ),
            }
        } )
    }

    private static setProps ( props: CaefEC2InstanceProps ): InstanceProps {

        const listofBlockDevices: BlockDevice[] = this.getBlockDeviceProps( props.blockDeviceProps, props.kmsKey )

        const overrideProps = {
            instanceName: props.naming.resourceName( props.instanceName ),
            propagateTagsToVolumeOnCreation: true,
            vpcSubnets: {
                subnets: [ props.instanceSubnet ],
            },
            blockDevices: listofBlockDevices,
            detailedMonitoring: true,
            requireImdsv2: false // This is enforced in the construct below
        }
        const allProps: InstanceProps = { ...props, ...overrideProps }
        return allProps
    }

    constructor( scope: Construct, id: string, props: CaefEC2InstanceProps ) {
        super( scope, id, CaefEC2Instance.setProps( props ) )

        this.applyRemovalPolicy( RemovalPolicy.RETAIN )

        const launchTemplate = new LaunchTemplate( this, "launch-template", {
            blockDevices: CaefEC2Instance.getBlockDeviceProps( props.blockDeviceProps, props.kmsKey ),
            launchTemplateName: props.naming.resourceName( props.instanceName ),
            requireImdsv2: true
        } )

        const cfnInstance = this.node.defaultChild as CfnInstance;
        cfnInstance.addPropertyOverride( 'DisableApiTermination', true )
        cfnInstance.addPropertyOverride( 'LaunchTemplate', {
            LaunchTemplateName: props.naming.resourceName( props.instanceName ),
            Version: launchTemplate.latestVersionNumber
        } )

        const statement = new PolicyStatement( {
            effect: Effect.ALLOW,
            actions: [ 'ec2:DescribeInstances', 'ec2:DescribeVolumes' ],
            resources: [ "*" ]
        } )

        const handlerProps = {
            instanceId: this.instanceId,
            kmsKeyArn: props.kmsKey.keyArn
        }

        const crProps: CaefCustomResourceProps = {
            resourceType: "Ec2VolumeEncryptionCheck",
            code: Code.fromAsset( `${ __dirname }/../src/lambda/volume_check` ),
            runtime: Runtime.PYTHON_3_11,
            handler: "volume_check.lambda_handler",
            handlerRolePolicyStatements: [ statement ],
            handlerProps: handlerProps,
            naming: props.naming,
            handlerTimeout: Duration.seconds( 120 ),
            handlerPolicySuppressions: [
                { id: 'AwsSolutions-IAM5', reason: 'ec2:DescribeImages and ec2:DescribeVolumes do not accept a resource' }
            ]
        }

        new CaefCustomResource( this, 'volume-check-cr', crProps )

        NagSuppressions.addResourceSuppressions( this, [
            {
                id: 'AwsSolutions-EC29',
                reason: 'Remediated through property override.',
            },
            {
                id: 'NIST.800.53.R5-EC2IMDSv2Enabled',
                reason: 'Remediated through property override.',
            },
            {
                id: 'HIPAA.Security-EC2IMDSv2Enabled',
                reason: 'Remediated through property override.',
            },
        ] );

        new CaefParamAndOutput( scope, {
            ...{
                resourceType: "instance",
                name: "id-" + props.naming.resourceName( props.instanceName ),
                value: this.instanceId
            }, ...props
        } )
    }
}

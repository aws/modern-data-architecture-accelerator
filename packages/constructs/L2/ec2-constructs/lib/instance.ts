/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput, MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { IMdaaRole } from '@aws-mdaa/iam-constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Instance,
  InstanceProps,
  InstanceType,
  ApplyCloudFormationInitOptions,
  BlockDeviceVolume,
  EbsDeviceVolumeType,
  CloudFormationInit,
  IMachineImage,
  ISecurityGroup,
  IVpc,
  UserData,
  ISubnet,
  BlockDevice,
  CfnInstance,
  LaunchTemplate,
} from 'aws-cdk-lib/aws-ec2';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';

/**
 * Properties for creating a Compliance EC2 instance
 */
export interface MdaaEC2InstanceProps extends MdaaConstructProps {
  /** EC2 instance type determining compute capacity, memory, and network performance characteristics */
  readonly instanceType: InstanceType;
  readonly machineImage: IMachineImage;
  /** VPC for instance deployment providing network isolation and security controls */
  readonly vpc: IVpc;
  readonly instanceSubnet: ISubnet;
  readonly blockDeviceProps: BlockDeviceProps[];
  readonly kmsKey: IKey;
  readonly allowAllOutbound?: boolean;
  /** Availability zone specification for precise instance placement within the VPC */
  readonly availabilityZone?: string;
  /** CloudFormation Init configuration for automated instance setup and software installation */
  readonly init?: CloudFormationInit;
  /** Configuration options for CloudFormation Init execution controlling timeout, retry */
  readonly initOptions?: ApplyCloudFormationInitOptions;
  readonly instanceName?: string;
  readonly keyName?: string;
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
  readonly role: IMdaaRole;
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
  /** Device name for block device mapping following AWS EC2 device naming conventions */
  readonly deviceName: string;
  /** EBS volume size in gigabytes determining storage capacity for the block device */
  readonly volumeSizeInGb: number;
  /** EBS volume type determining performance characteristics and cost structure for the storage device */
  readonly ebsType?: EbsDeviceVolumeType;
  /** IOPS (Input/Output Operations Per Second) specification for high-performance EBS volumes */
  readonly iops?: number;
}

/**
 * A construct for creating a compliant EC2 instance resource.
 * Specifically, the construct ensures that the EC2 instance name follows naming convention,
 * and tags are propogated to volume.
 */
export class MdaaEC2Instance extends Instance {
  private static getBlockDeviceProps(blockDeviceProps: BlockDeviceProps[], kmsKey: IKey) {
    return blockDeviceProps.map(blockDeviceProps => {
      return {
        deviceName: blockDeviceProps.deviceName,
        volume: BlockDeviceVolume.ebs(blockDeviceProps.volumeSizeInGb, {
          encrypted: true,
          deleteOnTermination: false,
          kmsKey: kmsKey,
          /** EBS volume type for performance and cost optimization */
          volumeType: blockDeviceProps.ebsType,
          iops: blockDeviceProps.iops,
        }),
      };
    });
  }

  private static setProps(props: MdaaEC2InstanceProps): InstanceProps {
    const listofBlockDevices: BlockDevice[] = this.getBlockDeviceProps(props.blockDeviceProps, props.kmsKey);

    const overrideProps = {
      instanceName: props.naming.resourceName(props.instanceName),
      propagateTagsToVolumeOnCreation: true,
      vpcSubnets: {
        subnets: [props.instanceSubnet],
      },
      blockDevices: listofBlockDevices,
      detailedMonitoring: true,
      requireImdsv2: false, // This is enforced in the construct below
    };
    const allProps: InstanceProps = { ...props, ...overrideProps };
    return allProps;
  }

  constructor(scope: Construct, id: string, props: MdaaEC2InstanceProps) {
    super(scope, id, MdaaEC2Instance.setProps(props));

    this.applyRemovalPolicy(RemovalPolicy.RETAIN);

    const launchTemplate = new LaunchTemplate(this, 'launch-template', {
      blockDevices: MdaaEC2Instance.getBlockDeviceProps(props.blockDeviceProps, props.kmsKey),
      launchTemplateName: props.naming.resourceName(props.instanceName),
      requireImdsv2: true,
    });

    const cfnInstance = this.node.defaultChild as CfnInstance;
    cfnInstance.addPropertyOverride('DisableApiTermination', true);
    cfnInstance.addPropertyOverride('LaunchTemplate', {
      LaunchTemplateName: props.naming.resourceName(props.instanceName),
      Version: launchTemplate.latestVersionNumber,
    });

    const statement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ec2:DescribeInstances', 'ec2:DescribeVolumes'],
      resources: ['*'],
    });

    const handlerProps = {
      instanceId: this.instanceId,
      kmsKeyArn: props.kmsKey.keyArn,
    };

    const crProps: MdaaCustomResourceProps = {
      resourceType: 'Ec2VolumeEncryptionCheck',
      code: Code.fromAsset(`${__dirname}/../src/lambda/volume_check`),
      runtime: Runtime.PYTHON_3_13,
      handler: 'volume_check.lambda_handler',
      handlerRolePolicyStatements: [statement],
      handlerProps: handlerProps,
      naming: props.naming,
      handlerTimeout: Duration.seconds(120),
      handlerPolicySuppressions: [
        { id: 'AwsSolutions-IAM5', reason: 'ec2:DescribeImages and ec2:DescribeVolumes do not accept a resource' },
      ],
      environment: {
        LOG_LEVEL: 'INFO',
      },
    };

    new MdaaCustomResource(this, 'volume-check-cr', crProps);

    MdaaNagSuppressions.addCodeResourceSuppressions(this, [
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
      {
        id: 'PCI.DSS.321-EC2IMDSv2Enabled',
        reason: 'Remediated through property override.',
      },
    ]);

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'instance',
          name: 'id-' + props.naming.resourceName(props.instanceName),
          value: this.instanceId,
        },
        ...props,
      },
      scope,
    );
  }
}

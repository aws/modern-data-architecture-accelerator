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
  /**
   * Q-ENHANCED-PROPERTY
   * Required EC2 instance type determining compute capacity, memory, and network performance characteristics. Controls the underlying hardware configuration and affects performance, cost, and capability of the compute instance.
   *
   * Use cases: Performance optimization; Cost management; Workload-specific sizing
   *
   * AWS: Amazon EC2 instance type for compute capacity and performance configuration
   *
   * Validation: Must be valid InstanceType; required; determines compute resources and capabilities
   **/
  readonly instanceType: InstanceType;
  readonly machineImage: IMachineImage;
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC for instance deployment providing network isolation and security controls. Enables secure networking, private communication, and integration with other VPC resources for security architecture.
   *
   * Use cases: Network isolation; Secure communication; VPC resource integration
   *
   * AWS: Amazon VPC for EC2 instance network isolation and security controls
   *
   * Validation: Must be valid IVpc instance; required; provides network security and isolation
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html
   **/
  readonly vpc: IVpc;
  readonly instanceSubnet: ISubnet;
  readonly blockDeviceProps: BlockDeviceProps[];
  readonly kmsKey: IKey;
  readonly allowAllOutbound?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional availability zone specification for precise instance placement within the VPC. Enables control over instance location for proximity to other resources, compliance requirements, or disaster recovery strategies.
   *
   * Use cases: Resource proximity; Compliance placement; Disaster recovery planning
   *
   * AWS: Amazon EC2 availability zone placement for instance location control
   *
   * Validation: Must be valid AZ within the VPC region if provided; controls instance placement
   **/
  readonly availabilityZone?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudFormation Init configuration for automated instance setup and software installation. Enables declarative configuration management and automated application deployment during instance launch for consistent environments.
   *
   * Use cases: Automated instance setup; Software installation; Configuration management
   *
   * AWS: AWS CloudFormation Init for EC2 instance automated configuration and setup
   *
   * Validation: Must be valid CloudFormationInit if provided; executed during instance launch
   *   **/
  readonly init?: CloudFormationInit;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional configuration options for CloudFormation Init execution controlling timeout, retry behavior, and signal handling. Enables fine-tuned control over automated configuration processes and error handling during instance setup.
   *
   * Use cases: Configuration timeout control; Retry behavior management; Error handling customization
   *
   * AWS: AWS CloudFormation Init options for configuration execution control
   *
   * Validation: Must be valid ApplyCloudFormationInitOptions if provided; controls Init execution behavior
   *   **/
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
/**
 * Q-ENHANCED-INTERFACE
 * BlockDeviceProps configuration interface for compute infrastructure and instance management.
 *
 * Use cases: Compute infrastructure; Instance management; Network configuration; Security groups
 *
 * AWS: Amazon EC2 configuration for compute infrastructure and instance management
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon EC2 and MDAA requirements
 */
export interface BlockDeviceProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required device name for block device mapping following AWS EC2 device naming conventions. Specifies the device identifier for storage attachment with platform-specific naming patterns for Linux and Windows instances.
   *
   * Use cases: Device identification; Storage mapping; Platform-specific device naming; Storage organization
   *
   * AWS: Amazon EC2 block device mapping device name for storage attachment and identification
   *
   * Validation: Must follow AWS EC2 device naming conventions; required; platform-specific format (Linux: /dev/sd*, Windows: xvd*)
   **/
  readonly deviceName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required EBS volume size in gigabytes determining storage capacity for the block device. Controls the amount of storage available for the device with direct impact on storage costs and performance characteristics.
   *
   * Use cases: Storage capacity planning; Cost optimization; Performance configuration; Data storage requirements
   *
   * AWS: Amazon EBS volume size configuration for storage capacity and performance
   *
   * Validation: Must be positive integer in GB; required; minimum and maximum values depend on EBS volume type
   **/
  readonly volumeSizeInGb: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional EBS volume type determining performance characteristics and cost structure for the storage device. Specifies the underlying EBS volume technology with different IOPS, throughput, and cost profiles for workload optimization.
   *
   * Use cases: Performance optimization; Cost management; Workload-specific storage; IOPS requirements
   *
   * AWS: Amazon EBS volume type for performance and cost optimization (gp3, io1, io2, st1, sc1)
   *
   * Validation: Must be valid EbsDeviceVolumeType if provided; defaults to gp3; affects performance and cost
   *   **/
  readonly ebsType?: EbsDeviceVolumeType;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IOPS (Input/Output Operations Per Second) specification for high-performance EBS volumes requiring specific performance guarantees. Required for io1 and io2 volume types to define the provisioned IOPS performance level for demanding workloads requiring consistent storage performance.
   *
   * Use cases: High-performance storage; Database workloads; IOPS-intensive applications; Performance guarantees; Storage optimization
   *
   * AWS: Amazon EBS provisioned IOPS configuration for io1 and io2 volume types with guaranteed performance levels
   *
   * Validation: Must be positive integer if provided; required for io1/io2 volumes; must be within volume type IOPS limits
   **/
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
          /**
           * Q-ENHANCED-PROPERTY
           * Optional EBS volume type determining performance characteristics and cost structure for the storage device. Specifies the underlying EBS volume technology with different IOPS, throughput, and cost profiles for workload optimization and performance requirements.
           *
           * Use cases: Performance optimization; Cost management; Workload-specific storage; IOPS requirements; Storage performance tuning
           *
           * AWS: Amazon EBS volume type for performance and cost optimization (gp3, io1, io2, st1, sc1)
           *
           * Validation: Must be valid EbsDeviceVolumeType if provided; defaults to gp3; affects performance and cost characteristics
           */
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

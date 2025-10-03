/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput, MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { RemovalPolicy, Size } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Volume, VolumeProps, EbsDeviceVolumeType } from 'aws-cdk-lib/aws-ec2';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR

/**
 * Properties for creating a Compliance EC2 instance
 */
export interface MdaaEC2VolumeProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required AWS Availability Zone for EBS volume placement enabling zone-specific storage deployment and EC2 instance attachment. Specifies the AZ where the volume will be created affecting instance attachment capabilities and regional availability for data analytics workloads.
   *
   * Use cases: Zone-specific deployment; Instance attachment; Regional availability; Storage placement
   *
   * AWS: AWS Availability Zone for EBS volume placement and EC2 instance attachment
   *
   * Validation: Must be valid AWS Availability Zone string; required for volume creation and instance attachment
   **/
  readonly availabilityZone: string;
  readonly autoEnableIo?: boolean;
  readonly enableMultiAttach?: boolean;
  readonly encryptionKey: IMdaaKmsKey;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IOPS provisioning for EBS volume performance optimization enabling high-performance I/O operations for data-intensive workloads. Specifies the number of I/O operations per second for performance-optimized volume types affecting analytics performance and throughput.
   *
   * Use cases: Performance optimization; High IOPS workloads; Analytics performance; I/O intensive operations
   *
   * AWS: AWS EBS provisioned IOPS for volume performance optimization and I/O operations
   *
   * Validation: Must be valid IOPS number if provided; requires compatible volume types (io1, io2, gp3)
   **/
  readonly iops?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional size of the EBS volume in GiBs for data storage and processing capacity in analytics environments. Configures the storage capacity for EC2 instances, data processing nodes, and analytics workloads enabling adequate disk space for data operations.
   *
   * Use cases: Data storage; Processing capacity; Temporary storage; Analytics workloads; Instance storage configuration
   *
   * AWS: AWS EBS volume size configuration for EC2 instance storage and data processing capacity
   *
   * Validation: Must be valid Size object in GiBs if provided; affects storage capacity and cost
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.Size.html
   **/
  readonly size?: Size;
  readonly snapshotId?: string;
  readonly volumeName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional EBS volume type determining performance characteristics and cost optimization for data storage workloads. Configures the volume type affecting IOPS performance, throughput, and cost optimization for data processing, analytics operations, and storage requirements.
   *
   * Use cases: Performance optimization; Cost management; Storage performance; Analytics workloads; I/O requirements
   *
   * AWS: AWS EBS volume type configuration for storage performance and cost characteristics
   *
   * Validation: Must be valid EbsDeviceVolumeType if provided; affects performance and cost; default type applied if not specified
   *   **/
  readonly volumeType?: EbsDeviceVolumeType;
}

/**
 * A construct for creating a compliant EBS volume resource.
 * Specifically, the construct ensures that the EBS volume
 * is encrypted.
 */
export class MdaaEC2Volume extends Volume {
  private static setProps(props: MdaaEC2VolumeProps): VolumeProps {
    const overrideProps = {
      volumeName: props.naming.resourceName(props.volumeName),
      removalPolicy: RemovalPolicy.RETAIN,
      encrypted: true,
    };
    const allProps = { ...props, ...overrideProps };
    return allProps;
  }
  constructor(scope: Construct, id: string, props: MdaaEC2VolumeProps) {
    super(scope, id, MdaaEC2Volume.setProps(props));

    MdaaNagSuppressions.addCodeResourceSuppressions(this, [
      {
        id: 'NIST.800.53.R5-EC2EBSInBackupPlan',
        reason: 'MDAA does not enforce NIST.800.53.R5-EC2EBSInBackupPlan on EBS volume.',
      },
      {
        id: 'HIPAA.Security-EC2EBSInBackupPlan',
        reason: 'MDAA does not enforce HIPAA.Security-EC2EBSInBackupPlan on EBS volume.',
      },
      {
        id: 'PCI.DSS.321-EC2EBSInBackupPlan',
        reason: 'MDAA does not enforce PCI.DSS.321-EC2EBSInBackupPlan on EBS volume.',
      },
    ]);

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'volume',
          name: 'id',
          value: this.volumeId,
        },
        ...props,
      },
      scope,
    );
    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'volume',
          name: 'az',
          value: this.availabilityZone,
        },
        ...props,
      },
      scope,
    );
  }
}

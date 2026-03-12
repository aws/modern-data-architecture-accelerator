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
  /** AWS Availability Zone for EBS volume placement enabling zone-specific storage deployment */
  readonly availabilityZone: string;
  readonly autoEnableIo?: boolean;
  readonly enableMultiAttach?: boolean;
  readonly encryptionKey: IMdaaKmsKey;
  /** IOPS provisioning for EBS volume performance optimization enabling high-performance I/O */
  readonly iops?: number;
  /** Size of the EBS volume in GiBs for data storage and processing capacity in analytics environments */
  readonly size?: Size;
  readonly snapshotId?: string;
  readonly volumeName?: string;
  /** EBS volume type determining performance characteristics and cost optimization for data storage workloads */
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

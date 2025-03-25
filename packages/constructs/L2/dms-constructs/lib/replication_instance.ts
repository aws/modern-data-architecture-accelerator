/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { CfnTag, IResolvable } from 'aws-cdk-lib';
import { CfnReplicationInstance, CfnReplicationInstanceProps } from 'aws-cdk-lib/aws-dms';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface MdaaReplicationInstanceProps extends MdaaConstructProps {
  /**
   * The amount of storage (in gigabytes) to be initially allocated for the replication instance.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationinstance.html#cfn-dms-replicationinstance-allocatedstorage
   */
  readonly allocatedStorage?: number;
  /**
   * Indicates that major version upgrades are allowed.
   *
   * Changing this parameter does not result in an outage, and the change is asynchronously applied as soon as possible.
   *
   * This parameter must be set to `true` when specifying a value for the `EngineVersion` parameter that is a different major version than the replication instance's current version.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationinstance.html#cfn-dms-replicationinstance-allowmajorversionupgrade
   */
  readonly allowMajorVersionUpgrade?: boolean | IResolvable;
  /**
   * A value that indicates whether minor engine upgrades are applied automatically to the replication instance during the maintenance window.
   *
   * This parameter defaults to `true` .
   *
   * Default: `true`
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationinstance.html#cfn-dms-replicationinstance-autominorversionupgrade
   */
  readonly autoMinorVersionUpgrade?: boolean | IResolvable;
  /**
   * The Availability Zone that the replication instance will be created in.
   *
   * The default value is a random, system-chosen Availability Zone in the endpoint's AWS Region , for example `us-east-1d` .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationinstance.html#cfn-dms-replicationinstance-availabilityzone
   */
  readonly availabilityZone?: string;
  /**
   * The engine version number of the replication instance.
   *
   * If an engine version number is not specified when a replication instance is created, the default is the latest engine version available.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationinstance.html#cfn-dms-replicationinstance-engineversion
   */
  readonly engineVersion?: string;
  /**
   * An AWS KMS key identifier that is used to encrypt the data on the replication instance.
   *
   * If you don't specify a value for the `KmsKeyId` parameter, AWS DMS uses your default encryption key.
   *
   * AWS KMS creates the default encryption key for your AWS account . Your AWS account has a different default encryption key for each AWS Region .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationinstance.html#cfn-dms-replicationinstance-kmskeyid
   */
  readonly kmsKey: IKey;
  /**
   * Specifies whether the replication instance is a Multi-AZ deployment.
   *
   * You can't set the `AvailabilityZone` parameter if the Multi-AZ parameter is set to `true` .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationinstance.html#cfn-dms-replicationinstance-multiaz
   */
  readonly multiAz?: boolean | IResolvable;
  /**
   * The weekly time range during which system maintenance can occur, in UTC.
   *
   * *Format* : `ddd:hh24:mi-ddd:hh24:mi`
   *
   * *Default* : A 30-minute window selected at random from an 8-hour block of time per AWS Region , occurring on a random day of the week.
   *
   * *Valid days* ( `ddd` ): `Mon` | `Tue` | `Wed` | `Thu` | `Fri` | `Sat` | `Sun`
   *
   * *Constraints* : Minimum 30-minute window.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationinstance.html#cfn-dms-replicationinstance-preferredmaintenancewindow
   */
  readonly preferredMaintenanceWindow?: string;

  /**
   * The compute and memory capacity of the replication instance as defined for the specified replication instance class.
   *
   * For example, to specify the instance class dms.c4.large, set this parameter to `"dms.c4.large"` . For more information on the settings and capacities for the available replication instance classes, see [Selecting the right AWS DMS replication instance for your migration](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.html#CHAP_ReplicationInstance.InDepth) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationinstance.html#cfn-dms-replicationinstance-replicationinstanceclass
   */
  readonly replicationInstanceClass: string;
  /**
   * The replication instance identifier. This parameter is stored as a lowercase string.
   *
   * Constraints:
   *
   * - Must contain 1-63 alphanumeric characters or hyphens.
   * - First character must be a letter.
   * - Can't end with a hyphen or contain two consecutive hyphens.
   *
   * Example: `myrepinstance`
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationinstance.html#cfn-dms-replicationinstance-replicationinstanceidentifier
   */
  readonly replicationInstanceIdentifier?: string;
  /**
   * A subnet group to associate with the replication instance.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationinstance.html#cfn-dms-replicationinstance-replicationsubnetgroupidentifier
   */
  readonly replicationSubnetGroupIdentifier: string;
  /**
   * A display name for the resource identifier at the end of the `EndpointArn` response parameter that is returned in the created `Endpoint` object.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationinstance.html#cfn-dms-replicationinstance-resourceidentifier
   */
  readonly resourceIdentifier?: string;
  /**
   * One or more tags to be assigned to the replication instance.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationinstance.html#cfn-dms-replicationinstance-tags
   */
  readonly tags?: Array<CfnTag>;
  /**
   * Specifies the virtual private cloud (VPC) security group to be used with the replication instance.
   *
   * The VPC security group must work with the VPC containing the replication instance.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationinstance.html#cfn-dms-replicationinstance-vpcsecuritygroupids
   */
  readonly vpcSecurityGroupIds?: Array<string>;
}

/**
 * Reusable CDK construct for a compliant DMS Replication Instance.
 * Specifically, enforces KMS Encryption, and prevents public accessibility.
 */
export class MdaaReplicationInstance extends CfnReplicationInstance {
  /** Overrides specific compliance-related properties. */
  private static setProps(props: MdaaReplicationInstanceProps): CfnReplicationInstanceProps {
    const overrideProps = {
      replicationInstanceIdentifier: props.naming.resourceName(props.replicationInstanceIdentifier, 256),
      publiclyAccessible: false,
      kmsKeyId: props.kmsKey.keyId,
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaReplicationInstanceProps) {
    super(scope, id, MdaaReplicationInstance.setProps(props));

    new MdaaParamAndOutput(this, {
      ...{
        resourceType: 'replicationInstance',
        resourceId: props.replicationInstanceIdentifier,
        name: 'identifier',
        value: this.ref,
      },
      ...props,
    });

    new MdaaParamAndOutput(this, {
      ...{
        resourceType: 'replicationInstance',
        resourceId: props.replicationInstanceIdentifier,
        name: 'ip',
        value: this.attrReplicationInstancePrivateIpAddresses,
      },
      ...props,
    });
  }
}

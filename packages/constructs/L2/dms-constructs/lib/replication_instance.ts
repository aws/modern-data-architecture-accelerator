/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { CfnTag, IResolvable } from 'aws-cdk-lib';
import { CfnReplicationInstance, CfnReplicationInstanceProps } from 'aws-cdk-lib/aws-dms';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { sanitizeReplicationInstanceIdentifier } from './utils';

export interface MdaaReplicationInstanceProps extends MdaaConstructProps {
  readonly allocatedStorage?: number;
  readonly allowMajorVersionUpgrade?: boolean | IResolvable;
  readonly autoMinorVersionUpgrade?: boolean | IResolvable;
  /** Availability zone specification for replication instance placement controlling geographic */
  readonly availabilityZone?: string;
  /** DMS engine version specification for feature access and compatibility control enabling */
  readonly engineVersion?: string;
  readonly kmsKey: IKey;
  readonly multiAz?: boolean | IResolvable;
  /** Maintenance window specification for system updates and maintenance operations controlling */
  readonly preferredMaintenanceWindow?: string;
  readonly replicationInstanceClass: string;
  readonly replicationInstanceIdentifier?: string;
  readonly replicationSubnetGroupIdentifier: string;
  readonly resourceIdentifier?: string;
  readonly tags?: Array<CfnTag>;
  readonly vpcSecurityGroupIds?: Array<string>;
}

/**
 * Reusable CDK construct for a compliant DMS Replication Instance.
 * Specifically, enforces KMS Encryption, and prevents public accessibility.
 */
export class MdaaReplicationInstance extends CfnReplicationInstance {
  /** Overrides specific compliance-related properties. */
  private static setProps(props: MdaaReplicationInstanceProps): CfnReplicationInstanceProps {
    const replicationInstanceIdentifier = sanitizeReplicationInstanceIdentifier(
      props.naming.resourceName(props.replicationInstanceIdentifier, 63),
    );
    const overrideProps = {
      replicationInstanceIdentifier,
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

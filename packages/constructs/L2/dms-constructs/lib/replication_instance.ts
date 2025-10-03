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
  /**
   * Q-ENHANCED-PROPERTY
   * Optional availability zone specification for replication instance placement controlling geographic distribution and latency optimization. Defines the specific availability zone for replication instance deployment for network proximity and disaster recovery planning.
   *
   * Use cases: Geographic placement; Latency optimization; Disaster recovery; Network proximity
   *
   * AWS: DMS replication instance availability zone for geographic placement and network optimization
   *
   * Validation: Must be valid availability zone name if provided; controls instance placement and network proximity
   **/
  readonly availabilityZone?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional DMS engine version specification for feature access and compatibility control enabling version management and capability selection. Provides control over DMS engine version for feature access, compatibility, and performance characteristics.
   *
   * Use cases: Version management; Feature access; Compatibility control; Performance optimization
   *
   * AWS: DMS replication instance engine version for feature access and compatibility management
   *
   * Validation: Must be valid DMS engine version if provided; defaults to latest available version
   **/
  readonly engineVersion?: string;
  readonly kmsKey: IKey;
  readonly multiAz?: boolean | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maintenance window specification for system updates and maintenance operations controlling operational timing and impact. Defines the weekly time range for system maintenance activities with minimal impact on migration operations.
   *
   * Use cases: Maintenance scheduling; Operational timing; Impact control; System updates
   *
   * AWS: DMS replication instance maintenance window for system updates and operational scheduling
   *
   * Validation: Must be valid time range format (ddd:hh24:mi-ddd:hh24:mi) if provided; minimum 30-minute window
   **/
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

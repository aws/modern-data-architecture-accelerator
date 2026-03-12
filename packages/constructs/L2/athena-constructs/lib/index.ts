/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaParamAndOutput, MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { IMdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { IMdaaBucket } from '@aws-mdaa/s3-constructs';
import { IResolvable, CfnTag } from 'aws-cdk-lib';
import { CfnWorkGroup, CfnWorkGroupProps } from 'aws-cdk-lib/aws-athena';
import { Construct } from 'constructs';

export interface MdaaAthenaWorkgroupProps extends MdaaConstructProps {
  readonly kmsKey: IMdaaKmsKey;
  /** S3 bucket for storing Athena query results with appropriate security controls */
  readonly bucket: IMdaaBucket;
  readonly resultsPrefix?: string;
  /** Workgroup name that will be processed through MDAA naming conventions */
  readonly name?: string;
  /** Human-readable description of the Athena workgroup explaining its purpose and intended usage */
  readonly description?: string;
  readonly recursiveDeleteOption?: boolean | IResolvable;
  readonly state?: string;
  readonly workGroupConfiguration?: MdaaAthenaWorkgroupConfigurationProps;
  readonly tags?: CfnTag[];
}

export interface MdaaAthenaWorkgroupConfigurationProps {
  /** Upper limit in bytes for the amount of data a single query can scan within the workgroup */
  readonly bytesScannedCutoffPerQuery?: number;
  readonly enforceWorkGroupConfiguration?: boolean;
  readonly publishCloudWatchMetricsEnabled?: boolean;
  readonly resultConfiguration?: MdaaAthenaResultConfigurationProps;
}

export interface MdaaAthenaResultConfigurationProps {
  readonly encryptionConfiguration: MdaaAthenaEncryptionConfigurationProps;
  /** S3 URI location for storing query results with optional prefix for organization */
  readonly outputLocation: string;
}

export interface MdaaAthenaEncryptionConfigurationProps {
  readonly encryptionOption: string;
  readonly kmsKey: string;
}

/**
 * Reusable CDK construct for a compliant Athena Workgroup.
 * Specifically, enforces KMS and bucket configurations
 * for Athena query results.
 */
export class MdaaAthenaWorkgroup extends CfnWorkGroup {
  /** Overrides specific compliance-related properties. */
  private static setProps(props: MdaaAthenaWorkgroupProps): CfnWorkGroupProps {
    const overrideProps = {
      // Add a workgroup name using the MDAA naming implementation.
      name: props.naming.resourceName(props.name),
      // Enforce the workgroup results configuration using the provided KMS key and S3 Bucket.
      workGroupConfiguration: {
        enforceWorkGroupConfiguration: true,
        publishCloudWatchMetricsEnabled: true,
        resultConfiguration: {
          encryptionConfiguration: {
            encryptionOption: 'SSE_KMS',
            kmsKey: props.kmsKey.keyArn,
          },
          outputLocation: props.resultsPrefix
            ? `s3://${props.bucket.bucketName}/${props.resultsPrefix}`
            : `s3://${props.bucket.bucketName}/`,
        },
        bytesScannedCutoffPerQuery: props.workGroupConfiguration?.bytesScannedCutoffPerQuery,
      },
    };

    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaAthenaWorkgroupProps) {
    super(scope, id, MdaaAthenaWorkgroup.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        naming: props.naming,
        resourceType: 'workgroup',
        resourceId: props.name,
        name: 'name',
        value: this.name,
      },
      scope,
    );
  }
}

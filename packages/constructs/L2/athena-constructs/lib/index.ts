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
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 bucket for storing Athena query results with appropriate security controls. Must be an MDAA-compliant bucket with encryption and access controls for secure query result storage.
   *
   * Use cases: Secure query result storage; Centralized analytics output; Encrypted result management
   *
   * AWS: Amazon Athena workgroup result configuration for S3 query result storage
   *
   * Validation: Must be valid IMdaaBucket instance; required for result storage; must have appropriate permissions
   *   **/
  readonly bucket: IMdaaBucket;
  readonly resultsPrefix?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional workgroup name that will be processed through MDAA naming conventions. If not specified, a name will be generated automatically following organizational naming standards.
   *
   * Use cases: Predictable workgroup naming; Cross-service integration; Operational management
   *
   * AWS: Amazon Athena workgroup name for resource identification and management
   *
   * Validation: Must be valid Athena workgroup name if provided; processed through MDAA naming conventions
   **/
  readonly name?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional human-readable description of the Athena workgroup explaining its purpose and intended usage. Provides documentation for workgroup management and helps users understand workgroup capabilities.
   *
   * Use cases: Workgroup documentation; User guidance; Operational clarity
   *
   * AWS: Amazon Athena workgroup description for management and user understanding
   *
   * Validation: Must be descriptive text if provided; recommended for workgroup documentation
   **/
  readonly description?: string;
  readonly recursiveDeleteOption?: boolean | IResolvable;
  readonly state?: string;
  readonly workGroupConfiguration?: MdaaAthenaWorkgroupConfigurationProps;
  readonly tags?: CfnTag[];
}

export interface MdaaAthenaWorkgroupConfigurationProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional upper limit in bytes for the amount of data a single query can scan within the workgroup. Provides cost control by preventing runaway queries from scanning excessive amounts of data and incurring high charges.
   *
   * Use cases: Cost control; Query optimization; Resource usage limits
   *
   * AWS: Amazon Athena workgroup bytes scanned cutoff for query cost control
   *
   * Validation: Must be positive integer if provided; enforced per query execution; no default limit
   **/
  readonly bytesScannedCutoffPerQuery?: number;
  readonly enforceWorkGroupConfiguration?: boolean;
  readonly publishCloudWatchMetricsEnabled?: boolean;
  readonly resultConfiguration?: MdaaAthenaResultConfigurationProps;
}

export interface MdaaAthenaResultConfigurationProps {
  readonly encryptionConfiguration: MdaaAthenaEncryptionConfigurationProps;
  /**
   * Q-ENHANCED-PROPERTY
   * S3 URI location for storing query results with optional prefix for organization. Defines the exact S3 location where Athena will store query outputs with appropriate access controls and encryption.
   *
   * Use cases: Centralized result storage; Organized query outputs; Secure result access
   *
   * AWS: Amazon Athena result output location for S3 query result storage
   *
   * Validation: Must be valid S3 URI format (s3://bucket-name/optional-prefix/)
   **/
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

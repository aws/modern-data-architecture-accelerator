/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { AuditHelper } from '@aws-mdaa/s3-helpers';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Annotations } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Scoped S3 event selector targeting a specific bucket and optional key prefix.
 * Narrows CloudTrail data event capture to only the specified S3 locations
 * rather than logging all S3 data events account-wide.
 *
 * Use cases: Cost-effective auditing of specific data buckets; Targeted compliance monitoring; Reduced log volume
 *
 * AWS: CloudTrail S3 data event selector (DataResource with S3 ARN)
 *
 * Validation: bucketName required; objectPrefix optional
 */
export interface EventSelectorConfig {
  /**
   * S3 bucket name to scope CloudTrail data event capture to.
   * Accepts bucket names or SSM parameter references.
   *
   * Use cases: Target specific data buckets for audit; Scope trail to sensitive data stores
   *
   * AWS: CloudTrail S3 data event selector bucket target
   *
   * Validation: Required; must be existing S3 bucket name or SSM parameter path
   */
  readonly bucketName: string;
  /**
   * Optional S3 key prefix to further narrow event capture within the bucket.
   * Only data events for objects under this prefix will be logged.
   *
   * Use cases: Audit only a specific dataset prefix; Reduce log volume for large buckets
   *
   * AWS: CloudTrail S3 data event selector object prefix filter
   *
   * Validation: Optional; valid S3 key prefix string
   */
  readonly objectPrefix?: string;
}

/**
 * CloudTrail audit trail configuration for S3 data event logging with KMS encryption.
 * Logs are written to the specified S3 bucket encrypted with the specified KMS key.
 * Optionally includes management/control plane events.
 *
 * Use cases: Compliance auditing; S3 data access logging; Security monitoring; Regulatory compliance
 *
 * AWS: CloudTrail trail with S3 data events, KMS encryption, and optional management events
 *
 * Validation: cloudTrailAuditBucketName and cloudTrailAuditKmsKeyArn required
 */
export interface AuditTrailProps {
  /**
   * S3 bucket name where CloudTrail audit logs are stored.
   * Accepts bucket names or SSM parameter references.
   *
   * Use cases: Centralized audit log collection; Compliance log storage
   *
   * AWS: CloudTrail S3 destination bucket
   *
   * Validation: Required; must be existing S3 bucket name or SSM parameter path
   */
  readonly cloudTrailAuditBucketName: string;
  /**
   * KMS key ARN for encrypting CloudTrail logs written to S3.
   * Accepts key ARNs or SSM parameter references.
   *
   * Use cases: Audit log encryption; Data protection compliance
   *
   * AWS: KMS key for CloudTrail log encryption
   *
   * Validation: Required; must be valid KMS key ARN or SSM parameter path
   */
  readonly cloudTrailAuditKmsKeyArn: string;
  /**
   * If true, management/control plane events will be included in trail.
   * Otherwise, only S3 Data Events will be included.
   */
  readonly includeManagementEvents?: boolean;
  /**
   * Optional list of S3 event selectors to scope CloudTrail data event capture
   * to specific buckets and prefixes. If omitted, the trail captures all S3 data
   * events in the account.
   *
   * Use cases: Audit specific data lake buckets; Reduce CloudTrail costs; Targeted compliance logging
   *
   * AWS: CloudTrail S3 data event selectors (DataResources on the trail)
   *
   * Validation: Optional; array of EventSelectorConfig objects with required bucketName
   */
  readonly eventSelectors?: EventSelectorConfig[];
}
export interface AuditTrailL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * CloudTrail audit trail configuration (single trail, backward-compatible).
   * @deprecated Use `trails` with a key of `'s3-audit'` for equivalent behavior.
   */
  readonly trail?: AuditTrailProps;
  /**
   * Named CloudTrail audit trail configurations for deploying multiple trails.
   * Each key becomes part of the trail's resource name and construct ID.
   * Can be used alongside or instead of the single `trail` property.
   *
   * Use cases: Separate trails per data domain; Different retention/encryption per trail; Team-scoped auditing
   *
   * AWS: Multiple CloudTrail trails with independent S3 destinations and event selectors
   *
   * Validation: Optional; keys must be valid resource name segments; values must be valid AuditTrailProps
   */
  readonly trails?: { readonly [name: string]: AuditTrailProps };
}

export class AuditTrailL3Construct extends MdaaL3Construct {
  protected readonly props: AuditTrailL3ConstructProps;

  constructor(scope: Construct, id: string, props: AuditTrailL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    // prettier-ignore
    if (!this.props.trail && !this.props.trails) { // NOSONAR
      throw new Error("At least one of 'trail' or 'trails' must be provided.");
    }

    // prettier-ignore
    if (this.props.trail) { // NOSONAR
      Annotations.of(this).addWarningV2(
        '@aws-mdaa/audit-trail-l3-construct:trailDeprecated',
        "The 'trail' property is deprecated and will be removed in a future major version. " +
          "Migrate to 'trails' with a key of 's3-audit' for equivalent behavior.",
      );
      // prettier-ignore
      this.createTrail('s3-audit', this.props.trail); // NOSONAR
    }

    if (this.props.trails) {
      Object.entries(this.props.trails).forEach(([trailName, trailProps]) => {
        this.createTrail(trailName, trailProps);
      });
    }
  }

  private createTrail(trailName: string, trailConfig: AuditTrailProps) {
    const auditBucket = MdaaBucket.fromBucketName(
      this,
      `${trailName}-audit-bucket`,
      trailConfig.cloudTrailAuditBucketName,
    );
    const auditKmsKey = MdaaKmsKey.fromKeyArn(this, `${trailName}-audit-kms-key`, trailConfig.cloudTrailAuditKmsKeyArn);

    const resolvedSelectors = trailConfig.eventSelectors?.map((selector, idx) => ({
      bucket: MdaaBucket.fromBucketName(this, `${trailName}-event-selector-bucket-${idx}`, selector.bucketName),
      objectPrefix: selector.objectPrefix,
    }));

    const auditTrail = AuditHelper.createCloudTrail(
      this,
      auditBucket,
      auditKmsKey,
      this.props.naming,
      trailName,
      trailConfig.includeManagementEvents,
      resolvedSelectors,
    );
    MdaaNagSuppressions.addCodeResourceSuppressions(
      auditTrail,
      [
        {
          id: 'NIST.800.53.R5-CloudTrailCloudWatchLogsEnabled',
          reason: 'CloudTrail targeted at dedicated Audit Bucket.',
        },
        {
          id: 'HIPAA.Security-CloudTrailCloudWatchLogsEnabled',
          reason: 'CloudTrail targeted at dedicated Audit Bucket.',
        },
        { id: 'PCI.DSS.321-CloudTrailCloudWatchLogsEnabled', reason: 'CloudTrail targeted at dedicated Audit Bucket.' },
      ],
      true,
    );
  }
}

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { AuditHelper } from '@aws-mdaa/s3-audit-helper';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';

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
}
export interface AuditTrailL3ConstructProps extends MdaaL3ConstructProps {
  /** CloudTrail audit trail configuration. */
  readonly trail: AuditTrailProps;
}

export class AuditTrailL3Construct extends MdaaL3Construct {
  protected readonly props: AuditTrailL3ConstructProps;

  constructor(scope: Construct, id: string, props: AuditTrailL3ConstructProps) {
    super(scope, id, props);
    this.props = props;
    this.createAuditResources();
  }

  private createAuditResources() {
    const auditBucket = MdaaBucket.fromBucketName(this, 'audit-bucket', this.props.trail.cloudTrailAuditBucketName);
    const auditKmsKey = MdaaKmsKey.fromKeyArn(this, 'audit-kms-key', this.props.trail.cloudTrailAuditKmsKeyArn);

    const auditTrail = AuditHelper.createCloudTrail(
      this,
      auditBucket,
      auditKmsKey,
      this.props.naming,
      's3-audit',
      this.props.trail.includeManagementEvents,
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

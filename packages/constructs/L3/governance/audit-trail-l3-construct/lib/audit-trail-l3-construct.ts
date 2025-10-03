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
 * Q-ENHANCED-INTERFACE
 * AWS CloudTrail audit trail configuration interface for logging with S3 data event monitoring and KMS encryption. Defines audit trail properties for compliance monitoring including S3 bucket destination, KMS key encryption, and management event inclusion control for centralized audit logging and security monitoring.
 *
 * Use cases: Compliance auditing; Security monitoring; Data access logging; Audit trail management; Regulatory compliance; Activity tracking
 *
 * AWS: AWS CloudTrail with S3 data event logging and KMS encryption for audit trail and compliance monitoring
 *
 * Validation: cloudTrailAuditBucketName must be valid S3 bucket name; cloudTrailAuditKmsKeyArn must be valid KMS key ARN; includeManagementEvents controls event scope
 */
export interface AuditTrailProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 bucket name for AWS CloudTrail audit log storage enabling centralized audit trail collection and compliance monitoring. Specifies the destination bucket where CloudTrail logs will be stored for security auditing, compliance reporting, and activity analysis.
   *
   * Use cases: Audit log storage; Compliance monitoring; Security analysis; Activity tracking; Regulatory compliance
   * AWS: AWS CloudTrail S3 bucket destination for audit log storage and compliance monitoring
   * Validation: Must be valid S3 bucket name; bucket must exist and be accessible for CloudTrail writes
   *   */
  readonly cloudTrailAuditBucketName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required KMS key ARN for AWS CloudTrail audit log encryption ensuring secure storage of audit data. Specifies the KMS key used to encrypt CloudTrail logs when written to S3, providing data protection and compliance with encryption requirements.
   *
   * Use cases: Audit log encryption; Data protection; Compliance security; Encrypted storage; Key management
   * AWS: AWS CloudTrail KMS encryption key for secure audit log storage and data protection
   * Validation: Must be valid KMS key ARN; key must exist and allow CloudTrail encryption operations
   *   */
  readonly cloudTrailAuditKmsKeyArn: string;
  /**
   * If true, management/control plane events will be included in trail.
   * Otherwise, only S3 Data Events will be included.
   */
  readonly includeManagementEvents?: boolean;
}
export interface AuditTrailL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required CloudTrail configuration defining audit trail setup including S3 bucket destination, event types, and logging configuration. Provides complete audit trail configuration for capturing S3 data events and API calls for compliance monitoring and security auditing.
   *
   * Use cases: Audit trail configuration; S3 data events; API logging; Compliance monitoring
   *
   * AWS: CloudTrail configuration for audit logging and compliance monitoring
   *
   * Validation: Must be valid AuditTrailProps; required for CloudTrail deployment and audit logging
   **/
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

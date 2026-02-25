/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaKmsKey, ENCRYPT_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { AuditHelper } from '@aws-mdaa/s3-audit-helper';
import { RestrictObjectPrefixToRoles } from '@aws-mdaa/s3-bucketpolicy-helper';
import { InventoryHelper } from '@aws-mdaa/s3-inventory-helper';
import { Database } from '@aws-cdk/aws-glue-alpha';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';

/**
 * Q-ENHANCED-INTERFACE
 * S3 bucket inventory configuration interface for automated bucket content reporting with inventory name specification and bucket targeting. Defines inventory properties for audit infrastructure including source bucket identification and inventory configuration naming for automated S3 object metadata collection and compliance reporting.
 *
 * Use cases: S3 inventory management; Bucket content auditing; Automated reporting; Compliance monitoring; Object metadata collection; Storage analytics
 *
 * AWS: S3 bucket inventory configuration for automated bucket content reporting and audit data collection
 *
 * Validation: bucketName must be valid S3 bucket name; inventoryName must be valid inventory configuration identifier; inventory configuration must be unique per bucket
 */
export interface BucketInventoryProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Target S3 bucket name for inventory data collection enabling automated bucket content reporting and audit data generation. Specifies the source bucket for which inventory data will be collected, supporting audit infrastructure and compliance monitoring through automated S3 object metadata collection.
   *
   * Use cases: Bucket content auditing; Inventory data collection; Audit infrastructure; Compliance monitoring
   *
   * AWS: AWS S3 bucket identification for inventory configuration and automated content reporting
   *
   * Validation: Must be valid S3 bucket name; required; bucket must exist and be accessible for inventory collection
   **/
  readonly bucketName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Unique inventory configuration identifier for inventory management and reporting organization enabling systematic inventory tracking. Provides a unique name for the inventory configuration to distinguish between multiple inventory setups and enable organized inventory data management.
   *
   * Use cases: Inventory configuration management; Systematic tracking; Inventory organization; Configuration identification
   *
   * AWS: AWS S3 inventory configuration name for inventory management and reporting organization
   *
   * Validation: Must be valid inventory configuration identifier; required; must be unique per bucket for proper inventory management
   **/
  readonly inventoryName: string;
}

export interface AuditL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of source account IDs for audit data collection enabling cross-account audit logging and centralized compliance monitoring. Provides the AWS account IDs from which audit data is expected for centralized audit collection and compliance reporting across multiple accounts.
   *
   * Use cases: Cross-account auditing; Centralized logging; Multi-account compliance; Audit data collection
   *
   * AWS: AWS account IDs for cross-account audit data collection and centralized compliance monitoring
   *
   * Validation: Must be array of valid AWS account IDs; required for cross-account audit data collection and compliance
   **/
  readonly sourceAccounts: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of source regions for audit data collection enabling multi-region audit logging and compliance coverage. Provides the AWS regions from which audit data is expected for audit collection and compliance monitoring across multiple regions.
   *
   * Use cases: Multi-region auditing; Regional compliance; coverage; Audit data collection
   *
   * AWS: AWS regions for multi-region audit data collection and compliance monitoring
   *
   * Validation: Must be array of valid AWS region names; required for multi-region audit data collection and compliance
   **/
  readonly sourceRegions: string[];
  readonly readRoleRefs: MdaaRoleRef[];
  readonly bucketInventories?: BucketInventoryProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 prefix for inventory data organization enabling structured inventory storage and access control. Defines the S3 prefix under which inventory writing is allowed for organized inventory data storage and controlled access to inventory information.
   *
   * Use cases: Inventory organization; Data structure; Access control; Storage management
   *
   * AWS: S3 prefix for inventory data organization and controlled access to inventory information
   *
   * Validation: Must be valid S3 prefix string; required for inventory data organization and access control
   **/
  readonly inventoryPrefix: string;
}

export class AuditL3Construct extends MdaaL3Construct {
  protected readonly props: AuditL3ConstructProps;

  private readonly auditSourceAccounts: string[];
  private readonly auditSourceRegions: string[];
  private readonly readRoleIds: string[];
  constructor(scope: Construct, id: string, props: AuditL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.auditSourceAccounts = [this.account, ...this.props.sourceAccounts];
    this.auditSourceRegions = [this.region, ...this.props.sourceRegions];
    this.readRoleIds = this.props.roleHelper
      .resolveRoleRefsWithOrdinals(this.props.readRoleRefs, 'Read')
      .map(x => x.id());
    const auditKmsKey = this.createAuditKmsKey();
    this.createAuditResources(auditKmsKey);
  }

  private createAuditKmsKey(): MdaaKmsKey {
    const serviceEncryptPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      // Use of * mirrors what is done in the CDK methods for adding policy helpers.
      resources: ['*'],
      actions: ENCRYPT_ACTIONS,
    });
    //Allow CloudTrail Service to encrypt audit trails
    serviceEncryptPolicy.addServicePrincipal('cloudtrail.amazonaws.com');
    //Allow S3 Service to encrypt inventories
    serviceEncryptPolicy.addServicePrincipal('s3.amazonaws.com');

    //Create a KMS key specific to audit
    const auditKmsKey = new MdaaKmsKey(this, 'kms-cmk', {
      naming: this.props.naming,
      keyUserRoleIds: this.readRoleIds,
    });
    auditKmsKey.addToResourcePolicy(serviceEncryptPolicy);
    return auditKmsKey;
  }

  private createAuditResources(auditKmsKey: MdaaKmsKey) {
    const auditBucket = new MdaaBucket(this, 'bucket', {
      encryptionKey: auditKmsKey,
      naming: this.props.naming,
      enforceExclusiveKmsKeys: false, // Cloudtrail cannot currently create trails if the DENY statements resulting from enforceExclusiveKmsKeys are present in the bucket policy
    });

    const cloudTrailACLStatement = new PolicyStatement({
      sid: 'AWSCloudTrailAclCheck20150319',
      effect: Effect.ALLOW,
      resources: [auditBucket.bucketArn],
      actions: ['s3:GetBucketAcl'],
      principals: [new ServicePrincipal('cloudtrail.amazonaws.com')],
    });
    auditBucket.addToResourcePolicy(cloudTrailACLStatement);

    const readRolePermissions = new RestrictObjectPrefixToRoles({
      s3Bucket: auditBucket,
      s3Prefix: '/',
      readRoleIds: this.readRoleIds,
    });
    readRolePermissions.statements().forEach(statement => auditBucket.addToResourcePolicy(statement));

    this.auditSourceAccounts.forEach(srcAccount => {
      const cloudTrailACLStatement = new PolicyStatement({
        sid: `AWSCloudTrailWrite20150319-${srcAccount}`,
        effect: Effect.ALLOW,
        resources: [`${auditBucket.bucketArn}/AWSLogs/${srcAccount}/*`],
        actions: ['s3:PutObject'],
        principals: [new ServicePrincipal('cloudtrail.amazonaws.com')],
        conditions: {
          StringEquals: {
            's3:x-amz-acl': 'bucket-owner-full-control',
          },
          StringLike: {
            'aws:SourceArn': `arn:${this.partition}:cloudtrail:*:${srcAccount}:trail/*`,
          },
        },
      });
      auditBucket.addToResourcePolicy(cloudTrailACLStatement);
      const inventoryStatement = InventoryHelper.createInventoryBucketPolicyStatement(
        auditBucket.bucketArn,
        srcAccount,
        undefined,
        this.props.inventoryPrefix,
      );
      auditBucket.addToResourcePolicy(inventoryStatement);
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      auditBucket,
      [
        {
          id: 'AwsSolutions-S1',
          reason:
            '1. Audit bucket is target of cloudtrail audit logs. 2. Server access logs do not support KMS on targets.',
        },
        {
          id: 'NIST.800.53.R5-S3BucketLoggingEnabled',
          reason:
            '1. Audit bucket is target for data lake cloudtrail audit logs. 2. Server access logs do not support KMS on targets.',
        },
        {
          id: 'HIPAA.Security-S3BucketLoggingEnabled',
          reason:
            '1. Audit bucket is target for data lake cloudtrail audit logs. 2. Server access logs do not support KMS on targets.',
        },
        {
          id: 'PCI.DSS.321-S3BucketLoggingEnabled',
          reason:
            '1. Audit bucket is target for data lake cloudtrail audit logs. 2. Server access logs do not support KMS on targets.',
        },
      ],
      true,
    );

    //Create a Glue Database to contain audit tables
    const glueUtilDatabase = new Database(this, 'database', {
      databaseName: this.props.naming.resourceName().replace(/-/gi, '_'),
    });

    AuditHelper.createGlueAuditTable(
      this,
      auditBucket,
      glueUtilDatabase,
      this.auditSourceAccounts,
      this.auditSourceRegions,
    );
    if (this.props.bucketInventories) {
      InventoryHelper.createGlueInvTable(
        this,
        this.account,
        'audit',
        glueUtilDatabase,
        auditBucket.bucketName,
        this.props.bucketInventories,
        this.props.inventoryPrefix,
      );
    }
  }
}

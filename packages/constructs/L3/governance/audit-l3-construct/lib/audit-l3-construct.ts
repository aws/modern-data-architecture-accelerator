/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { MdaaKmsKey, ENCRYPT_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { AuditHelper, InventoryHelper, RestrictObjectPrefixToRoles } from '@aws-mdaa/s3-helpers';
import { Database } from '@aws-cdk/aws-glue-alpha';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { MdaaRoleRef, MdaaResolvableRole } from '@aws-mdaa/iam-role-helper';

/**
 * Identifies a single S3 bucket inventory to be queryable via the Glue/Athena inventory table.
 * In YAML config, entries use "<bucketName>/<inventoryName>" format which is parsed into this shape.
 */
export interface BucketInventoryProps {
  /**
   * Source S3 bucket name whose inventory data will be collected into the audit bucket
   * and made queryable through the Glue inventory table.
   *
   * Use cases: Cross-bucket inventory aggregation; Audit-scoped bucket targeting
   *
   * AWS: S3 bucket inventory source configuration
   *
   * Validation: Required; valid S3 bucket name; bucket must exist
   */
  readonly bucketName: string;
  /**
   * Inventory configuration ID on the source bucket, used to scope which inventory
   * report is ingested into the Glue table.
   *
   * Use cases: Multi-inventory disambiguation; Selective inventory ingestion
   *
   * AWS: S3 inventory configuration identifier
   *
   * Validation: Required; must match an existing inventory configuration on the source bucket
   */
  readonly inventoryName: string;
}

/** Internal props for the Audit L3 construct. */
export interface AuditL3ConstructProps extends MdaaL3ConstructProps {
  /** Source account IDs for cross-account audit log acceptance. */
  readonly sourceAccounts: string[];
  /** Source regions for multi-region audit log acceptance. */
  readonly sourceRegions: string[];
  readonly readRoleRefs: MdaaRoleRef[];
  readonly bucketInventories?: BucketInventoryProps[];
  /** S3 prefix under which inventory writing is permitted. */
  readonly inventoryPrefix: string;
}

export class AuditL3Construct extends MdaaL3Construct {
  protected readonly props: AuditL3ConstructProps;

  private readonly auditSourceAccounts: string[];
  private readonly auditSourceRegions: string[];
  private readonly readRoles: MdaaResolvableRole[];
  constructor(scope: Construct, id: string, props: AuditL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.auditSourceAccounts = [this.account, ...this.props.sourceAccounts];
    this.auditSourceRegions = [this.region, ...this.props.sourceRegions];
    this.readRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals(this.props.readRoleRefs, 'Read');
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
      keyUserRoles: this.readRoles,
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
      readRoles: this.readRoles,
    });
    readRolePermissions.statements().forEach(statement => auditBucket.addToResourcePolicy(statement));

    // A same-account reader picks up s3:ListBucket and s3:GetBucketLocation from its own IAM policy,
    // but a principal in another account is limited to what this bucket policy grants it. Without a
    // bucket-level grant it can read individual objects and nothing else, so Athena, Glue and
    // 'aws s3 ls' all fail against the audit bucket. This construct has no bucket-level default deny
    // to exclude the role from, so the grant is added directly.
    const crossAccountReadRoles = this.readRoles.filter(role => role.isCrossAccount());
    if (crossAccountReadRoles.length > 0) {
      auditBucket.addToResourcePolicy(
        new PolicyStatement({
          sid: 'BucketAllowCrossAccount',
          effect: Effect.ALLOW,
          resources: [auditBucket.bucketArn, auditBucket.bucketArn + '/*'],
          actions: RestrictObjectPrefixToRoles.BUCKET_ALLOW_ACTIONS,
          principals: crossAccountReadRoles.map(role => role.arnPrincipal()),
        }),
      );
    }

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
      databaseName: this.props.naming
        .withResourceType(MdaaResourceType.GLUE_DATABASE)
        .resourceName()
        .replace(/-/gi, '_'),
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

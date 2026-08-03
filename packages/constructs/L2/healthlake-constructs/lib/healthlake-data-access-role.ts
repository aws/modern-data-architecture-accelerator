/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { Stack } from 'aws-cdk-lib';
import { Effect, PolicyDocument, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

/**
 * Shared justification for the IAMNoInlinePolicy suppressions (NIST 800-53 R5,
 * HIPAA Security, PCI DSS 3.2.1). Both inline policy documents are small — two
 * statements each — and every statement is scoped to specific S3 bucket and KMS
 * key ARNs, so an inline policy (whose lifecycle is tied to this single-purpose
 * role) is more appropriate than a reusable managed policy.
 */
const INLINE_POLICY_SUPPRESSION_REASON =
  'Inline policy is intentional: two small, resource-scoped policy documents (S3 and KMS), each ' +
  'with two statements scoped to specific bucket and key ARNs, not intended for reuse across ' +
  'principals. Using inline rather than managed policy ties the policy lifecycle to this ' +
  'single-purpose role.';

/**
 * Properties for the MdaaHealthLakeDataAccessRole construct.
 */
export interface MdaaHealthLakeDataAccessRoleProps extends MdaaConstructProps {
  /** S3 bucket(s) for HealthLake read/write access */
  readonly buckets: IBucket[];
  /** KMS key for encrypt/decrypt operations */
  readonly kmsKey: IKey;
  /**
   * ARN of the datastore this role serves. Used to scope the assume-role trust
   * policy to a single datastore (aws:SourceArn), so that in a multi-datastore
   * account one datastore cannot be used as a confused deputy to assume another
   * datastore's role and reach its bucket/CMK.
   */
  readonly datastoreArn: string;
  /**
   * Role name suffix (combined with MDAA naming prefix). Use a per-datastore
   * value when deploying multiple datastores in the same stack to avoid
   * IAM role name collisions.
   * @default 'healthlake-data-access'
   */
  readonly roleName?: string;
}

/**
 * MDAA-compliant IAM role for HealthLake data access during import/export operations.
 *
 * Creates an MdaaRole with:
 * - Trust policy for `healthlake.amazonaws.com` with confused-deputy protection scoped to both the
 *   deploying account (aws:SourceAccount) and the specific datastore (aws:SourceArn)
 * - S3 policy scoped to specific bucket ARNs (object-level and bucket-level actions)
 * - KMS policy scoped to specific key ARN (encrypt/decrypt + CreateGrant with condition)
 * - No wildcard resources anywhere
 * - MDAA naming conventions and SSM parameter outputs via MdaaRole
 */
export class MdaaHealthLakeDataAccessRole extends Construct {
  /** The IAM role ARN */
  public readonly roleArn: string;
  /** The underlying MdaaRole resource */
  public readonly role: MdaaRole;

  constructor(scope: Construct, id: string, props: MdaaHealthLakeDataAccessRoleProps) {
    super(scope, id);

    // S3 object-level actions scoped to {bucketArn}/*
    const s3ObjectStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:GetObject', 's3:PutObject'],
      resources: props.buckets.map(bucket => bucket.arnForObjects('*')),
    });

    // S3 bucket-level actions scoped to bucket ARNs
    const s3BucketStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:ListBucket', 's3:GetBucketPublicAccessBlock', 's3:GetEncryptionConfiguration'],
      resources: props.buckets.map(bucket => bucket.bucketArn),
    });

    // KMS encrypt/decrypt actions scoped to specific key ARN
    const kmsStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['kms:DescribeKey', 'kms:GenerateDataKey*', 'kms:Encrypt', 'kms:ReEncrypt*', 'kms:Decrypt'],
      resources: [props.kmsKey.keyArn],
    });

    // KMS CreateGrant with GrantIsForAWSResource condition
    const kmsGrantStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['kms:CreateGrant'],
      resources: [props.kmsKey.keyArn],
      conditions: {
        Bool: {
          'kms:GrantIsForAWSResource': 'true',
        },
      },
    });

    this.role = new MdaaRole(this, 'DataAccessRole', {
      naming: props.naming,
      roleName: props.roleName ?? 'healthlake-data-access',
      // Confused-deputy protection per AWS's HealthLake setup guide, which prescribes
      // BOTH conditions: aws:SourceAccount constrains the calling account, and
      // aws:SourceArn constrains which datastore may assume this role. SourceAccount
      // alone would let any datastore in the account assume any data-access role in it.
      // https://docs.aws.amazon.com/healthlake/latest/devguide/getting-started-setting-up.html
      assumedBy: new ServicePrincipal('healthlake.amazonaws.com', {
        conditions: {
          StringEquals: {
            'aws:SourceAccount': Stack.of(this).account,
          },
          ArnEquals: {
            'aws:SourceArn': props.datastoreArn,
          },
        },
      }),
      inlinePolicies: {
        HealthLakeS3Access: new PolicyDocument({
          statements: [s3ObjectStatement, s3BucketStatement],
        }),
        HealthLakeKmsAccess: new PolicyDocument({
          statements: [kmsStatement, kmsGrantStatement],
        }),
      },
    });

    this.roleArn = this.role.roleArn;

    // Add CDK Nag suppressions for the inline policy and wildcard-suffixed actions
    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.role,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'S3 object actions require /* suffix on bucket ARNs per https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html. KMS actions kms:GenerateDataKey* and kms:ReEncrypt* are standard patterns scoped to a specific key ARN per https://docs.aws.amazon.com/service-authorization/latest/reference/list_awskeymanagementservice.html.',
          appliesTo: [
            { regex: String.raw`/^Resource::.+\/\*$/` },
            'Action::kms:GenerateDataKey*',
            'Action::kms:ReEncrypt*',
          ],
        },
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: INLINE_POLICY_SUPPRESSION_REASON,
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason: INLINE_POLICY_SUPPRESSION_REASON,
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason: INLINE_POLICY_SUPPRESSION_REASON,
        },
      ],
      true,
    );

    // Publish healthlake-specific SSM parameter (MdaaRole already publishes role/arn, role/id, and role/name).
    // Namespace the parameter name by role so multiple data-access roles in a stack do not collide.
    const paramName = `${props.roleName ?? 'healthlake-data-access'}-role-arn`;
    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: MdaaResourceType.HEALTHLAKE,
      name: paramName,
      value: this.roleArn,
    });
  }
}

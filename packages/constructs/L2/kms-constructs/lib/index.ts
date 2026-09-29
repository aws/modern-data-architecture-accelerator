/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaResolvableRole } from '@aws-mdaa/iam-role-helper';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { Annotations, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { ArnPrincipal, Effect, PolicyDocument, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IKey, Key, KeyProps, KeySpec, KeyUsage } from 'aws-cdk-lib/aws-kms';
import { ParameterTier } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export const ADMIN_ACTIONS = [
  'kms:Create*',
  'kms:Describe*',
  'kms:Enable*',
  'kms:List*',
  'kms:Put*',
  'kms:Update*',
  'kms:Revoke*',
  'kms:Disable*',
  'kms:Get*',
  'kms:Delete*',
  'kms:TagResource',
  'kms:UntagResource',
  'kms:ScheduleKeyDeletion',
  'kms:CancelKeyDeletion',
];

export const ENCRYPT_ACTIONS = [
  'kms:Encrypt',
  'kms:ReEncryptFrom',
  'kms:ReEncryptTo',
  'kms:GenerateDataKey',
  'kms:GenerateDataKeyWithoutPlaintext',
  'kms:GenerateDataKeyPair',
  'kms:GenerateDataKeyPairWithoutPlaintext',
];

export const DECRYPT_ACTIONS = ['kms:Decrypt'];

export const USER_ACTIONS = [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS];

/**
 * Key administration actions which a key policy can delegate to a principal in another account.
 *
 * KMS honours cross-account permissions for cryptographic operations and for this specific set of
 * operations only; permissions granted to an external principal for anything else have no effect.
 * The key-management operations in {@link ADMIN_ACTIONS} (key policy, rotation, tagging, aliases,
 * enable/disable and deletion scheduling) therefore stay with the account that owns the key.
 *
 * Spelled out rather than wildcarded, because wildcards such as `kms:Get*` also match operations
 * that cross-account principals cannot be granted.
 *
 * @see https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
 */
export const CROSS_ACCOUNT_ADMIN_ACTIONS = [
  'kms:CreateGrant',
  'kms:DescribeKey',
  'kms:GetKeyRotationStatus',
  'kms:GetPublicKey',
  'kms:ListGrants',
  'kms:RetireGrant',
  'kms:RevokeGrant',
];

/**
 * Key usage actions granted to a principal in another account.
 *
 * Adds `kms:DescribeKey` to {@link USER_ACTIONS}. A same-account principal picks DescribeKey up from
 * its own IAM policy alongside the key's default root statement, but an external principal is
 * limited to what the key policy grants it, and services such as Athena, Glue and Redshift call
 * DescribeKey before using a key.
 *
 * @see https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html
 */
export const CROSS_ACCOUNT_USER_ACTIONS = [...USER_ACTIONS, 'kms:DescribeKey'];

export interface MdaaKmsKeyProps extends MdaaConstructProps {
  /**
   * Resolved roles granted key usage permissions. Cross-account roles are automatically
   * handled as ARN-based principals; same-account roles use the aws:userId condition.
   */
  readonly keyUserRoles?: MdaaResolvableRole[];
  /**
   * Resolved roles granted key admin permissions. Cross-account roles are automatically
   * handled as ARN-based principals; same-account roles use the aws:userId condition.
   */
  readonly keyAdminRoles?: MdaaResolvableRole[];

  /** Human-readable description of the KMS key explaining its purpose and intended usage */
  readonly description?: string;

  readonly alias?: string;

  readonly keySpec?: KeySpec;
  readonly keyUsage?: KeyUsage;
  readonly policy?: PolicyDocument;

  readonly pendingWindow?: Duration;

  /**
   * Tier for the SSM parameters this construct publishes. Only Advanced-tier parameters can be
   * shared with another account through AWS RAM, and Advanced-tier parameters are billed, so
   * leave this unset unless a parameter is being shared.
   * @default - ParameterTier.STANDARD, as applied by SSM
   */
  readonly tier?: ParameterTier;
}

/**
 * Interface for IMdaaKmsKey.
 */
export type IMdaaKmsKey = IKey;

/**
 * Partitions resolved roles into same-account role IDs and cross-account ARN principals.
 */
function partitionRoles(roles: MdaaResolvableRole[]): { roleIds: string[]; arnPrincipals: ArnPrincipal[] } {
  const roleIds: string[] = [];
  const arnPrincipals: ArnPrincipal[] = [];
  for (const role of roles) {
    if (role.isCrossAccount()) {
      arnPrincipals.push(role.arnPrincipal());
    } else {
      roleIds.push(role.id());
    }
  }
  return { roleIds, arnPrincipals };
}

/**
 * Construct for a compliance KMS Key.
 * Ensures key rotation is enabled and grants are scoped via aws:userId conditions
 * for same-account roles, or direct ARN principals for cross-account roles.
 */
export class MdaaKmsKey extends Key implements IMdaaKmsKey {
  private static setProps(props: MdaaKmsKeyProps): KeyProps {
    const kmsNaming = props.naming.withResourceType(MdaaResourceType.KMS_KEY);
    const overrideProps = {
      enableKeyRotation: true,
      enabled: true,
      alias: kmsNaming.resourceName(props.alias, 256),
      removalPolicy: RemovalPolicy.RETAIN,
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaKmsKeyProps) {
    super(scope, id, MdaaKmsKey.setProps(props));

    const kmsNaming = props.naming.withResourceType(MdaaResourceType.KMS_KEY);

    // Partition key user roles
    const userPartition = props.keyUserRoles ? partitionRoles(props.keyUserRoles) : undefined;

    // Partition key admin roles
    const adminPartition = props.keyAdminRoles ? partitionRoles(props.keyAdminRoles) : undefined;

    // Same-account key users via aws:userId condition
    if (userPartition && userPartition.roleIds.length > 0) {
      const KeyUserPolicyStatement = new PolicyStatement({
        sid: kmsNaming.resourceName('usage-stmt'),
        effect: Effect.ALLOW,
        // Use of * mirrors what is done in the CDK methods for adding policy helpers.
        resources: ['*'],
        actions: [...USER_ACTIONS],
      });
      // We're including a condition with a stringlike condition that prevents this from being overly broad
      KeyUserPolicyStatement.addAnyPrincipal();
      KeyUserPolicyStatement.addCondition('StringLike', {
        'aws:userId': userPartition.roleIds.map(x => `${x}:*`),
      });
      this.addToResourcePolicy(KeyUserPolicyStatement);
    }

    // Cross-account key users via direct ARN principals
    if (userPartition && userPartition.arnPrincipals.length > 0) {
      const crossAccountUserStatement = new PolicyStatement({
        sid: kmsNaming.resourceName('xacct-usage-stmt'),
        effect: Effect.ALLOW,
        // As on the same-account statements, * denotes the key this policy is attached to. The
        // grant is bounded by the explicit ArnPrincipals added below rather than by resource.
        resources: ['*'],
        actions: [...CROSS_ACCOUNT_USER_ACTIONS],
      });
      userPartition.arnPrincipals.forEach(principal => crossAccountUserStatement.addPrincipals(principal));
      this.addToResourcePolicy(crossAccountUserStatement);
    }

    // Same-account key admins via aws:userId condition
    if (adminPartition && adminPartition.roleIds.length > 0) {
      const KeyAdminPolicyStatement = new PolicyStatement({
        sid: kmsNaming.resourceName('usage-stmt'),
        effect: Effect.ALLOW,
        // Use of * mirrors what is done in the CDK methods for adding policy helpers.
        resources: ['*'],
        actions: [...ADMIN_ACTIONS],
      });
      // We're including a condition with a stringlike condition that prevents this from being overly broad
      KeyAdminPolicyStatement.addAnyPrincipal();
      KeyAdminPolicyStatement.addCondition('StringLike', {
        'aws:userId': adminPartition.roleIds.map(x => `${x}:*`),
      });
      this.addToResourcePolicy(KeyAdminPolicyStatement);
    }

    // Cross-account key admins via direct ARN principals. Only the grant and describe operations
    // in CROSS_ACCOUNT_ADMIN_ACTIONS can be delegated across accounts; key management cannot.
    if (adminPartition && adminPartition.arnPrincipals.length > 0) {
      const crossAccountAdminStatement = new PolicyStatement({
        sid: kmsNaming.resourceName('xacct-admin-stmt'),
        effect: Effect.ALLOW,
        // As on the same-account statements, * denotes the key this policy is attached to. The
        // grant is bounded by the explicit ArnPrincipals added below rather than by resource.
        resources: ['*'],
        actions: [...CROSS_ACCOUNT_ADMIN_ACTIONS],
      });
      adminPartition.arnPrincipals.forEach(principal => crossAccountAdminStatement.addPrincipals(principal));
      this.addToResourcePolicy(crossAccountAdminStatement);
      Annotations.of(this).addWarningV2(
        '@aws-mdaa/kms-constructs:crossAccountKeyAdmin',
        `Key admin roles ${adminPartition.arnPrincipals.map(x => x.arn).join(', ')} are cross-account, and are ` +
          `granted only the operations KMS honours across accounts (${CROSS_ACCOUNT_ADMIN_ACTIONS.join(', ')}). ` +
          `Key management (key policy, rotation, tagging, aliases, enable/disable and deletion scheduling) ` +
          `cannot be delegated cross-account and remains with the account which owns this key.`,
      );
    }

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'kms',
          resourceId: props.alias,
          name: 'arn',
          value: this.keyArn,
        },
        ...props,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'kms',
          resourceId: props.alias,
          name: 'id',
          value: this.keyId,
        },
        ...props,
      },
      scope,
    );
  }
}

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Effect, PolicyDocument, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IKey, Key, KeyProps, KeySpec, KeyUsage } from 'aws-cdk-lib/aws-kms';
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

export const ENCRYPT_ACTIONS = ['kms:Encrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*'];

export const DECRYPT_ACTIONS = ['kms:Decrypt'];

export interface MdaaKmsKeyProps extends MdaaConstructProps {
  /**
   * @param {string[]} keyUserRoles - Array of Role ARNs to provide key usage (Encrypt, Decrypt) access
   */
  readonly keyUserRoleIds?: string[];

  /**
   * @param {string[]} keyAdminRoles - Array of Role ARNs to provide key admin access to
   */
  readonly keyAdminRoleIds?: string[];

  /**
   * A description of the key. Use a description that helps your users decide
   * whether the key is appropriate for a particular task.
   *
   * @default - No description.
   */
  readonly description?: string;

  /**
   * Initial alias to add to the key
   *
   * More aliases can be added later by calling `addAlias`.
   *
   * @default - No alias is added for the key.
   */
  readonly alias?: string;

  /**
   * The cryptographic configuration of the key. The valid value depends on usage of the key.
   *
   * IMPORTANT: If you change this property of an existing key, the existing key is scheduled for deletion
   * and a new key is created with the specified value.
   *
   * @default KeySpec.SYMMETRIC_DEFAULT
   */
  readonly keySpec?: KeySpec;
  /**
   * The cryptographic operations for which the key can be used.
   *
   * IMPORTANT: If you change this property of an existing key, the existing key is scheduled for deletion
   * and a new key is created with the specified value.
   *
   * @default KeyUsage.ENCRYPT_DECRYPT
   */
  readonly keyUsage?: KeyUsage;
  /**
   * Custom policy document to attach to the KMS key.
   *
   * NOTE - If the `@aws-cdk/aws-kms:defaultKeyPolicies` feature flag is set (the default for new projects),
   * this policy will *override* the default key policy and become the only key policy for the key. If the
   * feature flag is not set, this policy will be appended to the default key policy.
   *
   * @default - A policy document with permissions for the account root to
   * administer the key will be created.
   */
  readonly policy?: PolicyDocument;

  /**
   * Specifies the number of days in the waiting period before
   * AWS KMS deletes a CMK that has been removed from a CloudFormation stack.
   *
   * When you remove a customer master key (CMK) from a CloudFormation stack, AWS KMS schedules the CMK for deletion
   * and starts the mandatory waiting period. The PendingWindowInDays property determines the length of waiting period.
   * During the waiting period, the key state of CMK is Pending Deletion, which prevents the CMK from being used in
   * cryptographic operations. When the waiting period expires, AWS KMS permanently deletes the CMK.
   *
   * Enter a value between 7 and 30 days.
   *
   * @see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-kms-key.html#cfn-kms-key-pendingwindowindays
   * @default - 30 days
   */
  readonly pendingWindow?: Duration;
}

/**
 * Interface for IMdaaKmsKey.
 */
export type IMdaaKmsKey = IKey;

/**
 * Construct for a compliance KMS Key.
 * Ensures the following:
 * * Key Rotation enabled
 */
export class MdaaKmsKey extends Key implements IMdaaKmsKey {
  private static setProps(props: MdaaKmsKeyProps): KeyProps {
    const overrideProps = {
      enableKeyRotation: true,
      enabled: true,
      alias: props.naming.resourceName(props.alias, 256),
      removalPolicy: RemovalPolicy.RETAIN,
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaKmsKeyProps) {
    super(scope, id, MdaaKmsKey.setProps(props));

    if (props.keyUserRoleIds && props.keyUserRoleIds.length > 0) {
      const KeyUserPolicyStatement = new PolicyStatement({
        sid: props.naming.resourceName('usage-stmt'),
        effect: Effect.ALLOW,
        // Use of * mirrors what is done in the CDK methods for adding policy helpers.
        resources: ['*'],
        actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
      });
      // We're including a condition with a stringlike condition that prevents this from being overly broad
      KeyUserPolicyStatement.addAnyPrincipal();
      KeyUserPolicyStatement.addCondition('StringLike', { 'aws:userId': props.keyUserRoleIds.map(x => `${x}:*`) });
      this.addToResourcePolicy(KeyUserPolicyStatement);
    }
    if (props.keyAdminRoleIds && props.keyAdminRoleIds.length > 0) {
      const KeyAdminPolicyStatement = new PolicyStatement({
        sid: props.naming.resourceName('usage-stmt'),
        effect: Effect.ALLOW,
        // Use of * mirrors what is done in the CDK methods for adding policy helpers.
        resources: ['*'],
        actions: [...ADMIN_ACTIONS],
      });
      // We're including a condition with a stringlike condition that prevents this from being overly broad
      KeyAdminPolicyStatement.addAnyPrincipal();
      KeyAdminPolicyStatement.addCondition('StringLike', { 'aws:userId': props.keyAdminRoleIds.map(x => `${x}:*`) });
      this.addToResourcePolicy(KeyAdminPolicyStatement);
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

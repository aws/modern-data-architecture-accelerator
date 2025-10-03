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

export interface MdaaKmsKeyProps extends MdaaConstructProps {
  readonly keyUserRoleIds?: string[];

  readonly keyAdminRoleIds?: string[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional human-readable description of the KMS key explaining its purpose and intended usage. Helps users and administrators understand the key's role in the data architecture and make appropriate usage decisions.
   *
   * Use cases: Key purpose documentation; Administrative clarity; Compliance documentation
   *
   * AWS: AWS KMS key description for management and identification purposes
   *
   * Validation: Must be descriptive text if provided; recommended for key management clarity
   **/
  readonly description?: string;

  readonly alias?: string;

  readonly keySpec?: KeySpec;
  readonly keyUsage?: KeyUsage;
  readonly policy?: PolicyDocument;

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
        actions: [...USER_ACTIONS],
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

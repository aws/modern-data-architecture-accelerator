/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ParameterTier } from 'aws-cdk-lib/aws-ssm';
import { MdaaKmsKey, MdaaKmsKeyProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testContstructProps: MdaaKmsKeyProps = {
    naming: testApp.naming,
    alias: 'test-key',
    keyUserRoleIds: ['test-user-id1', 'test-user-id2'],
    keyAdminRoleIds: ['test-admin-id1', 'test-admin-id2'],
    createOutputs: false,
    createParams: false,
  };

  new MdaaKmsKey(testApp.testStack, 'test-construct', testContstructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )
  test('AliasName', () => {
    template.hasResourceProperties('AWS::KMS::Alias', {
      AliasName: 'alias/' + testApp.naming.resourceName('test-key'),
    });
  });

  test('KeyAdminPolicyStatement', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          {
            Action: [
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
            ],
            Condition: {
              StringLike: {
                'aws:userId': ['test-admin-id1:*', 'test-admin-id2:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: '*',
            Sid: 'test-org-test-env-test-domain-test-module-usage-stmt',
          },
        ]),
      },
    });
  });

  test('KeyUserPolicyStatement', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: {
        Statement: Match.arrayWith([
          {
            Action: [
              'kms:Decrypt',
              'kms:Encrypt',
              'kms:ReEncryptFrom',
              'kms:ReEncryptTo',
              'kms:GenerateDataKey',
              'kms:GenerateDataKeyWithoutPlaintext',
              'kms:GenerateDataKeyPair',
              'kms:GenerateDataKeyPairWithoutPlaintext',
            ],
            Condition: {
              StringLike: {
                'aws:userId': ['test-user-id1:*', 'test-user-id2:*'],
              },
            },
            Effect: 'Allow',
            Principal: {
              AWS: '*',
            },
            Resource: '*',
            Sid: 'test-org-test-env-test-domain-test-module-usage-stmt',
          },
        ]),
      },
    });
  });

  test('EnableKeyRotation', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });

  test('UpdateReplacePolicy', () => {
    template.hasResource('AWS::KMS::Key', {
      UpdateReplacePolicy: 'Retain',
    });
  });

  test('DeletionPolicy', () => {
    template.hasResource('AWS::KMS::Key', {
      DeletionPolicy: 'Retain',
    });
  });
});

describe('Parameter tier', () => {
  // tier only takes effect where the construct publishes parameters, so createParams must be on.
  function templateFor(tier?: ParameterTier): Template {
    const app = new MdaaTestApp();
    new MdaaKmsKey(app.testStack, 'tier-key', {
      naming: app.naming,
      alias: 'tier-key',
      keyUserRoleIds: ['test-user-id1'],
      createParams: true,
      createOutputs: false,
      tier: tier,
    });
    // checkCdkNagCompliance declares its own describe/test, so it runs at describe scope.
    app.checkCdkNagCompliance(app.testStack);
    return Template.fromStack(app.testStack);
  }

  const advancedTemplate = templateFor(ParameterTier.ADVANCED);
  const defaultTemplate = templateFor();

  test('tier is threaded through to the published arn and id parameters', () => {
    const params = Object.values(advancedTemplate.findResources('AWS::SSM::Parameter'));
    expect(params.length).toBeGreaterThan(0);
    params.forEach(param => expect(param.Properties?.Tier).toEqual('Advanced'));
  });

  test('no Tier emitted when unset, leaving SSM to apply Standard', () => {
    const params = Object.values(defaultTemplate.findResources('AWS::SSM::Parameter'));
    expect(params.length).toBeGreaterThan(0);
    params.forEach(param => expect(param.Properties?.Tier).toBeUndefined());
  });
});

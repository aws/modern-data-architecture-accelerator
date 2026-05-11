/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { ApiAuthentication } from '../../lib/api-authentication/api-authentication';

describe('ApiAuthentication Infrastructure Tests', () => {
  const createTemplate = (): Template => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

    const encryptionKey = new MdaaKmsKey(testApp.testStack, 'test-kms-key', {
      naming: testApp.naming,
      alias: 'test-key',
    });

    new ApiAuthentication(testApp.testStack, 'test-api-auth', {
      naming: testApp.naming,
      roleHelper,
      encryptionKey,
    });

    return Template.fromStack(testApp.testStack);
  };

  test('creates X-Origin verification secret encrypted with the provided KMS key', () => {
    const template = createTemplate();
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      KmsKeyId: Match.objectLike({
        'Fn::GetAtt': [Match.stringLikeRegexp('testkmskey'), 'Arn'],
      }),
      GenerateSecretString: Match.objectLike({
        ExcludePunctuation: true,
        GenerateStringKey: 'headerValue',
        SecretStringTemplate: '{}',
      }),
    });
  });

  test('creates SSM parameter with origin/verify/secret/arn name pattern', () => {
    const template = createTemplate();
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: Match.stringLikeRegexp('.*/origin/verify/secret/arn$'),
    });
  });
});

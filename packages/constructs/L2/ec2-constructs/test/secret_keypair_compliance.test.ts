/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { ArnPrincipal } from 'aws-cdk-lib/aws-iam';
import { MdaaEC2SecretKeyPair, MdaaEC2SecretKeyPairProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testKmsKey = MdaaKmsKey.fromKeyArn(
    testApp.testStack,
    'key for root volume',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );

  const testContstructProps: MdaaEC2SecretKeyPairProps = {
    naming: testApp.naming,
    name: 'test-key-pair',
    kmsKey: testKmsKey,
    readPrincipals: [new ArnPrincipal('test-arn')],
  };

  new MdaaEC2SecretKeyPair(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log( JSON.stringify( template, undefined, 2 ) )

  test('Custom KeyPair Name', () => {
    template.hasResourceProperties('Custom::SecretKeyPair', {
      keypairName: 'test-org-test-env-test-domain-test-module-test-key-pair',
    });
  });

  test('Secret Name', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      Name: 'test-org-test-env-test-domain-test-module-test-key-pair',
    });
  });
  test('Secret KMS', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      KmsKeyId: 'arn:test-partition:kms:test-region:test-account:key/test-key',
    });
  });
  test('Secret Resource Policy', () => {
    template.hasResourceProperties('AWS::SecretsManager::ResourcePolicy', {
      ResourcePolicy: {
        Statement: [
          {
            Action: ['secretsmanager:DescribeSecret', 'secretsmanager:GetSecretValue'],
            Effect: 'Allow',
            Principal: {
              AWS: 'test-arn',
            },
            Resource: {
              Ref: 'testconstructsecret1A43460A',
            },
          },
        ],
        Version: '2012-10-17',
      },
      SecretId: {
        Ref: 'testconstructsecret1A43460A',
      },
    });
  });
  test('Secret KeyMaterial', () => {
    template.hasResourceProperties('AWS::SecretsManager::Secret', {
      SecretString: {
        'Fn::GetAtt': ['testconstructcustomresourceDB2A2CE6', 'key_material'],
      },
    });
  });
  test('Secret Retain', () => {
    template.hasResource('AWS::SecretsManager::Secret', {
      UpdateReplacePolicy: 'Retain',
      DeletionPolicy: 'Retain',
    });
  });
});

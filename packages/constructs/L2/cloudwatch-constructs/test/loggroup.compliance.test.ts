/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { MdaaLogGroup, MdaaLogGroupProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testKey = Key.fromKeyArn(
    testApp.testStack,
    'testKey',
    'arn:test-partition:kms:test-region:test-account:key/test-key',
  );

  const testContstructProps: MdaaLogGroupProps = {
    naming: testApp.naming,
    createOutputs: false,
    createParams: false,
    encryptionKey: testKey,
    retention: RetentionDays.INFINITE,
    logGroupNamePathPrefix: '/test/prefix/',
  };

  new MdaaLogGroup(testApp.testStack, 'test-construct', testContstructProps);
  new MdaaLogGroup(testApp.testStack, 'test-construct-verbatim', {
    ...testContstructProps,
    logGroupNamePathPrefix: '/aws/lambda',
    logGroupName: 'test-org-test-env-test-domain-test-module-function',
    verbatimLogGroupName: true,
  });
  new MdaaLogGroup(testApp.testStack, 'test-construct-masked', {
    ...testContstructProps,
    logGroupName: 'masked',
    dataProtection: { policyName: 'test-data-protection', additionalIdentifiers: ['DriversLicense-US'] },
  });
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log( JSON.stringify( template.toJSON(), undefined, 2 ) )

  test('LogGroupEncrypion', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      KmsKeyId: 'arn:test-partition:kms:test-region:test-account:key/test-key',
    });
  });

  test('LogGroupName', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/test/prefix/test-org-test-env-test-domain-test-module',
    });
  });

  test('VerbatimLogGroupName', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/lambda/test-org-test-env-test-domain-test-module-function',
    });
  });

  test('VerbatimLogGroupRetained', () => {
    template.hasResource('AWS::Logs::LogGroup', {
      Properties: { LogGroupName: '/aws/lambda/test-org-test-env-test-domain-test-module-function' },
      DeletionPolicy: 'Retain',
      UpdateReplacePolicy: 'Retain',
    });
  });

  test('RetentionDays', () => {
    template.resourcePropertiesCountIs('AWS::Logs::LogGroup', 'RetentionInDays', 0);
  });

  test('DataProtectionPolicy', () => {
    const maskedIdentifiers = Match.arrayWith([
      'arn:aws:dataprotection::aws:data-identifier/EmailAddress',
      'arn:aws:dataprotection::aws:data-identifier/DriversLicense-US',
    ]);
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/test/prefix/test-org-test-env-test-domain-test-module-masked',
      DataProtectionPolicy: {
        Name: 'test-data-protection',
        Statement: [
          { Sid: 'audit-policy', DataIdentifier: maskedIdentifiers },
          { Sid: 'redact-policy', DataIdentifier: maskedIdentifiers },
        ],
      },
    });
  });

  test('NoDataProtectionPolicyByDefault', () => {
    const logGroups = Object.values(template.findResources('AWS::Logs::LogGroup'));
    expect(logGroups).toHaveLength(3);
    expect(logGroups.filter(logGroup => logGroup.Properties.DataProtectionPolicy)).toHaveLength(1);
  });
});

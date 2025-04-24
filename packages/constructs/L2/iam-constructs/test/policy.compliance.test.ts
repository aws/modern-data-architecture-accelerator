/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { PolicyDocument } from 'aws-cdk-lib/aws-iam';
import { MdaaManagedPolicy, MdaaManagedPolicyProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const policyDocument = {
    Statement: [
      {
        Sid: 'test-statement',
        Action: 's3:GetObject',
        Resource: 'arn:test-partition:s3:::test-bucket/test-obj',
        Effect: 'Allow',
      },
    ],
  };

  const testContstructProps: MdaaManagedPolicyProps = {
    naming: testApp.naming,
    managedPolicyName: 'testing',
    document: PolicyDocument.fromJson(policyDocument),
  };

  new MdaaManagedPolicy(testApp.testStack, 'test-construct', testContstructProps);
  new MdaaManagedPolicy(testApp.testStack, 'test-construct-verbatim', {
    ...testContstructProps,
    ...{ verbatimPolicyName: true, managedPolicyName: 'testing-verbatim' },
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Generate Managed Policy', () => {
    template.hasResourceProperties(
      'AWS::IAM::ManagedPolicy',
      Match.objectLike({
        PolicyDocument: {
          Statement: [
            {
              Action: 's3:GetObject',
              Effect: 'Allow',
              Resource: 'arn:test-partition:s3:::test-bucket/test-obj',
              Sid: 'test-statement',
            },
          ],
        },
        ManagedPolicyName: 'test-org-test-env-test-domain-test-module-testing',
      }),
    );
  });

  test('Generate Managed Policy Verbatim Name', () => {
    template.hasResourceProperties(
      'AWS::IAM::ManagedPolicy',
      Match.objectLike({
        ManagedPolicyName: 'testing-verbatim',
      }),
    );
  });
});

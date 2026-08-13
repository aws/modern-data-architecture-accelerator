/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { AuditTrailL3Construct, AuditTrailL3ConstructProps } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: AuditTrailL3ConstructProps = {
    trail: {
      cloudTrailAuditBucketName: 'some-bucket-name',
      cloudTrailAuditKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/some-key-id',
      includeManagementEvents: true,
    },

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new AuditTrailL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Resource Count', () => {
    template.resourceCountIs('AWS::CloudTrail::Trail', 1);
  });

  test('Trail Name', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-s3-audit',
    });
  });

  test('S3BucketName', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      S3BucketName: 'some-bucket-name',
    });
  });

  test('KMS', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      KMSKeyId: 'arn:test-partition:kms:test-region:test-account:key/some-key-id',
    });
  });

  test('IncludeManagementEvents', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      EventSelectors: Match.arrayWith([
        Match.objectLike({
          IncludeManagementEvents: true,
        }),
      ]),
    });
  });
});

describe('MDAA Audit Trail with Event Selectors - Compliance', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: AuditTrailL3ConstructProps = {
    trail: {
      cloudTrailAuditBucketName: 'some-bucket-name',
      cloudTrailAuditKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/some-key-id',
      includeManagementEvents: false,
      eventSelectors: [{ bucketName: 'data-bucket-1', objectPrefix: 'raw/' }, { bucketName: 'data-bucket-2' }],
    },

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new AuditTrailL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
});

describe('MDAA Audit Trail with Data Event Selectors - Compliance', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: AuditTrailL3ConstructProps = {
    trails: {
      // Management events on: the advanced-selector trail carries both a management
      // and a data selector.
      'agentcore-audit': {
        cloudTrailAuditBucketName: 'agentcore-audit-bucket',
        cloudTrailAuditKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/agentcore-key-id',
        includeManagementEvents: true,
        dataEventSelectors: {
          'agentcore-runtime': {
            resourceType: 'AWS::BedrockAgentCore::Runtime',
            resourceArns: ['arn:test-partition:bedrock-agentcore:test-region:test-account:runtime/test-runtime'],
          },
        },
      },
      // Management events off: data selectors only, which is the configuration that
      // captures no control plane events at all.
      'lambda-audit': {
        cloudTrailAuditBucketName: 'lambda-audit-bucket',
        cloudTrailAuditKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/lambda-key-id',
        dataEventSelectors: { 'lambda-write-events': { resourceType: 'AWS::Lambda::Function' } },
      },
    },

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new AuditTrailL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
});

describe('MDAA Audit Trail with Multiple Named Trails - Compliance', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: AuditTrailL3ConstructProps = {
    trails: {
      'datalake-audit': {
        cloudTrailAuditBucketName: 'datalake-audit-bucket',
        cloudTrailAuditKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/datalake-key-id',
        includeManagementEvents: false,
        eventSelectors: [{ bucketName: 'raw-data-bucket', objectPrefix: 'sensitive/' }],
      },
      'analytics-audit': {
        cloudTrailAuditBucketName: 'analytics-audit-bucket',
        cloudTrailAuditKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/analytics-key-id',
        includeManagementEvents: true,
      },
    },

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new AuditTrailL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
});

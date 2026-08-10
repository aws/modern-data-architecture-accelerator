/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Database } from '@aws-cdk/aws-glue-alpha';
import { AuditHelper } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const testKey = Key.fromKeyArn(stack, 'test-key', 'arn:test-partition:kms:test-region:test-account:key/some-key-id');
  const testBucket = Bucket.fromBucketName(stack, 'test-bucket', 'some-bucket-name');
  const trail1 = AuditHelper.createCloudTrail(stack, testBucket, testKey, testApp.naming, 'testing1', true);
  MdaaNagSuppressions.addCodeResourceSuppressions(
    trail1,
    [
      {
        id: 'NIST.800.53.R5-CloudTrailCloudWatchLogsEnabled',
        reason: 'CloudTrail targeted at dedicated Audit Bucket.',
      },
      {
        id: 'HIPAA.Security-CloudTrailCloudWatchLogsEnabled',
        reason: 'CloudTrail targeted at dedicated Audit Bucket.',
      },
      { id: 'PCI.DSS.321-CloudTrailCloudWatchLogsEnabled', reason: 'CloudTrail targeted at dedicated Audit Bucket.' },
    ],
    true,
  );
  const testEventSelectorBucket = Bucket.fromBucketName(stack, 'test-bucket2', 'some-bucket-name');
  const eventSelector = {
    bucket: testEventSelectorBucket,
    objectPrefix: 'testing',
  };
  const trail2 = AuditHelper.createCloudTrail(stack, testBucket, testKey, testApp.naming, 'testing2', true, [
    eventSelector,
  ]);
  MdaaNagSuppressions.addCodeResourceSuppressions(
    trail2,
    [
      {
        id: 'NIST.800.53.R5-CloudTrailCloudWatchLogsEnabled',
        reason: 'CloudTrail targeted at dedicated Audit Bucket.',
      },
      {
        id: 'HIPAA.Security-CloudTrailCloudWatchLogsEnabled',
        reason: 'CloudTrail targeted at dedicated Audit Bucket.',
      },
      { id: 'PCI.DSS.321-CloudTrailCloudWatchLogsEnabled', reason: 'CloudTrail targeted at dedicated Audit Bucket.' },
    ],
    true,
  );
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Resource Count', () => {
    template.resourceCountIs('AWS::CloudTrail::Trail', 2);
  });

  test('Trail Name', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-testing1',
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

  test('ReadWriteType', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      EventSelectors: Match.arrayWith([
        Match.objectLike({
          ReadWriteType: 'All',
        }),
      ]),
    });
  });

  test('S3 Data Event Selectors', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      EventSelectors: Match.arrayWith([
        Match.objectLike({
          DataResources: [
            {
              Type: 'AWS::S3::Object',
              Values: ['arn:test-partition:s3:::'],
            },
          ],
        }),
      ]),
    });
  });
});

describe('AuditHelper.createDataEventCloudTrail', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const testKey = Key.fromKeyArn(stack, 'test-key', 'arn:test-partition:kms:test-region:test-account:key/some-key-id');
  const testBucket = Bucket.fromBucketName(stack, 'test-bucket', 'some-bucket-name');
  const trail = AuditHelper.createDataEventCloudTrail(
    stack,
    testBucket,
    testKey,
    testApp.naming,
    'data-events',
    [
      {
        name: 'AgentCore runtime data events',
        resourceType: 'AWS::BedrockAgentCore::Runtime',
        resourceArns: ['arn:test-partition:bedrock-agentcore:test-region:test-account:runtime/test-runtime'],
      },
      {
        name: 'Lambda write events',
        resourceType: 'AWS::Lambda::Function',
        readWriteType: 'WriteOnly',
      },
    ],
    true,
  );
  MdaaNagSuppressions.addCodeResourceSuppressions(
    trail,
    [
      {
        id: 'NIST.800.53.R5-CloudTrailCloudWatchLogsEnabled',
        reason: 'CloudTrail targeted at dedicated Audit Bucket.',
      },
      {
        id: 'HIPAA.Security-CloudTrailCloudWatchLogsEnabled',
        reason: 'CloudTrail targeted at dedicated Audit Bucket.',
      },
      { id: 'PCI.DSS.321-CloudTrailCloudWatchLogsEnabled', reason: 'CloudTrail targeted at dedicated Audit Bucket.' },
    ],
    true,
  );
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Trail is named and encrypted as on the basic selector path', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-data-events',
      S3BucketName: 'some-bucket-name',
      KMSKeyId: 'arn:test-partition:kms:test-region:test-account:key/some-key-id',
    });
  });

  test('Advanced event selectors carry the data and management selectors', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      AdvancedEventSelectors: [
        {
          Name: 'Management events',
          FieldSelectors: [{ Field: 'eventCategory', Equals: ['Management'] }],
        },
        {
          Name: 'AgentCore runtime data events',
          FieldSelectors: [
            { Field: 'eventCategory', Equals: ['Data'] },
            { Field: 'resources.type', Equals: ['AWS::BedrockAgentCore::Runtime'] },
            {
              Field: 'resources.ARN',
              StartsWith: ['arn:test-partition:bedrock-agentcore:test-region:test-account:runtime/test-runtime'],
            },
          ],
        },
        {
          Name: 'Lambda write events',
          FieldSelectors: [
            { Field: 'eventCategory', Equals: ['Data'] },
            { Field: 'resources.type', Equals: ['AWS::Lambda::Function'] },
            { Field: 'readOnly', Equals: ['false'] },
          ],
        },
      ],
    });
  });

  test('Basic event selectors are absent', () => {
    const trails = template.findResources('AWS::CloudTrail::Trail');
    expect(Object.values(trails)[0].Properties.EventSelectors).toBeUndefined();
  });
});

describe('AuditHelper.createDataEventCloudTrail without management events', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const testKey = Key.fromKeyArn(stack, 'test-key', 'arn:test-partition:kms:test-region:test-account:key/some-key-id');
  const testBucket = Bucket.fromBucketName(stack, 'test-bucket', 'some-bucket-name');
  // includeManagementEvents omitted. Advanced event selectors replace a trail's defaults
  // outright, so this trail captures no control plane events at all -- the behaviour this
  // suite pins, since it is silent rather than an error.
  const trail = AuditHelper.createDataEventCloudTrail(stack, testBucket, testKey, testApp.naming, 'data-only', [
    { name: 'Lambda read events', resourceType: 'AWS::Lambda::Function', readWriteType: 'ReadOnly' },
    { name: 'DynamoDB all events', resourceType: 'AWS::DynamoDB::Table', readWriteType: 'All' },
  ]);
  MdaaNagSuppressions.addCodeResourceSuppressions(
    trail,
    [
      {
        id: 'NIST.800.53.R5-CloudTrailCloudWatchLogsEnabled',
        reason: 'CloudTrail targeted at dedicated Audit Bucket.',
      },
      {
        id: 'HIPAA.Security-CloudTrailCloudWatchLogsEnabled',
        reason: 'CloudTrail targeted at dedicated Audit Bucket.',
      },
      { id: 'PCI.DSS.321-CloudTrailCloudWatchLogsEnabled', reason: 'CloudTrail targeted at dedicated Audit Bucket.' },
    ],
    true,
  );
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Only the data selectors are rendered, with no management selector', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      AdvancedEventSelectors: [
        {
          Name: 'Lambda read events',
          FieldSelectors: [
            { Field: 'eventCategory', Equals: ['Data'] },
            { Field: 'resources.type', Equals: ['AWS::Lambda::Function'] },
            // ReadOnly maps to readOnly=true.
            { Field: 'readOnly', Equals: ['true'] },
          ],
        },
        {
          Name: 'DynamoDB all events',
          FieldSelectors: [
            { Field: 'eventCategory', Equals: ['Data'] },
            { Field: 'resources.type', Equals: ['AWS::DynamoDB::Table'] },
            // 'All' is CloudTrail's default and renders no readOnly field selector.
          ],
        },
      ],
    });
  });

  test('No management event selector is present', () => {
    const trails = template.findResources('AWS::CloudTrail::Trail');
    const selectors = Object.values(trails)[0].Properties.AdvancedEventSelectors;
    expect(selectors.some((selector: { Name: string }) => selector.Name === 'Management events')).toBeFalsy();
  });
});

describe('AuditHelper.createGlueAuditTable', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const testBucket = Bucket.fromBucketName(stack, 'audit-bucket', 'audit-data-bucket');
  const database = new Database(stack, 'audit-db', { databaseName: 'audit_database' });

  AuditHelper.createGlueAuditTable(
    stack,
    testBucket,
    database,
    ['111122223333', '444455556666'],
    ['us-east-1', 'us-west-2'],
  );

  const template = Template.fromStack(stack);

  test('creates Glue table resource', () => {
    template.resourceCountIs('AWS::Glue::Table', 1);
  });

  test('table name is cloudtrail_audit', () => {
    template.hasResourceProperties('AWS::Glue::Table', {
      TableInput: Match.objectLike({
        Name: 'cloudtrail_audit',
      }),
    });
  });

  test('table has partition projection parameters', () => {
    template.hasResourceProperties('AWS::Glue::Table', {
      TableInput: Match.objectLike({
        Parameters: Match.objectLike({
          'projection.enabled': 'true',
          'projection.account.type': 'enum',
          'projection.account.values': '111122223333,444455556666',
          'projection.region.type': 'enum',
          'projection.region.values': 'us-east-1,us-west-2',
          'projection.timestamp.type': 'date',
        }),
      }),
    });
  });

  test('table has partition keys', () => {
    template.hasResourceProperties('AWS::Glue::Table', {
      TableInput: Match.objectLike({
        PartitionKeys: Match.arrayWith([
          Match.objectLike({ Name: 'timestamp', Type: 'string' }),
          Match.objectLike({ Name: 'region', Type: 'string' }),
          Match.objectLike({ Name: 'account', Type: 'string' }),
        ]),
      }),
    });
  });
});

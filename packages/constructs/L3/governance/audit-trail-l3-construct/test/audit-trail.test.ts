/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { AuditTrailL3Construct, AuditTrailL3ConstructProps } from '../lib';

describe('Event Selector Resolution', () => {
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
  const template = Template.fromStack(testApp.testStack);

  test('Trail has scoped S3 event selectors with prefix', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      EventSelectors: Match.arrayWith([
        Match.objectLike({
          DataResources: [
            {
              Type: 'AWS::S3::Object',
              Values: ['arn:test-partition:s3:::data-bucket-1/raw/'],
            },
          ],
        }),
      ]),
    });
  });

  test('Trail has event selector for bucket without prefix', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      EventSelectors: Match.arrayWith([
        Match.objectLike({
          DataResources: [
            {
              Type: 'AWS::S3::Object',
              Values: ['arn:test-partition:s3:::data-bucket-2/'],
            },
          ],
        }),
      ]),
    });
  });

  test('Event selectors have ReadWriteType ALL', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      EventSelectors: Match.arrayWith([
        Match.objectLike({
          ReadWriteType: 'All',
        }),
      ]),
    });
  });

  test('Event selectors do not include management events when false', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      EventSelectors: Match.arrayWith([
        Match.objectLike({
          IncludeManagementEvents: false,
        }),
      ]),
    });
  });
});

describe('Multiple Named Trails', () => {
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
  const template = Template.fromStack(testApp.testStack);

  test('Creates multiple trails', () => {
    template.resourceCountIs('AWS::CloudTrail::Trail', 2);
  });

  test('Datalake trail has correct name', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-datalake-audit',
    });
  });

  test('Analytics trail has correct name', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-analytics-audit',
    });
  });

  test('Datalake trail has scoped event selectors', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-datalake-audit',
      EventSelectors: Match.arrayWith([
        Match.objectLike({
          DataResources: [
            {
              Type: 'AWS::S3::Object',
              Values: ['arn:test-partition:s3:::raw-data-bucket/sensitive/'],
            },
          ],
        }),
      ]),
    });
  });

  test('Analytics trail logs all S3 data events', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-analytics-audit',
      EventSelectors: Match.arrayWith([
        Match.objectLike({
          IncludeManagementEvents: true,
        }),
      ]),
    });
  });

  test('Each trail uses its own S3 bucket', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-datalake-audit',
      S3BucketName: 'datalake-audit-bucket',
    });
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-analytics-audit',
      S3BucketName: 'analytics-audit-bucket',
    });
  });

  test('Each trail uses its own KMS key', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-datalake-audit',
      KMSKeyId: 'arn:test-partition:kms:test-region:test-account:key/datalake-key-id',
    });
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-analytics-audit',
      KMSKeyId: 'arn:test-partition:kms:test-region:test-account:key/analytics-key-id',
    });
  });
});

describe('Data Event Selectors', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: AuditTrailL3ConstructProps = {
    trails: {
      'agentcore-audit': {
        cloudTrailAuditBucketName: 'agentcore-audit-bucket',
        cloudTrailAuditKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/agentcore-key-id',
        includeManagementEvents: true,
        dataEventSelectors: {
          'AgentCore runtime data events': {
            resourceType: 'AWS::BedrockAgentCore::Runtime',
            resourceArns: ['arn:test-partition:bedrock-agentcore:test-region:test-account:runtime/test-runtime'],
          },
          'AgentCore runtime endpoint data events': {
            resourceType: 'AWS::BedrockAgentCore::RuntimeEndpoint',
          },
        },
      },
      'lambda-audit': {
        cloudTrailAuditBucketName: 'lambda-audit-bucket',
        cloudTrailAuditKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/lambda-key-id',
        dataEventSelectors: {
          'Lambda write events': { resourceType: 'AWS::Lambda::Function', readWriteType: 'WriteOnly' },
          'Lambda read events': { resourceType: 'AWS::Lambda::Function', readWriteType: 'ReadOnly' },
          'Lambda all events': { resourceType: 'AWS::Lambda::Function', readWriteType: 'All' },
        },
      },
    },

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new AuditTrailL3Construct(stack, 'teststack', constructProps);
  const template = Template.fromStack(testApp.testStack);

  test('Data event selector rendered with Data event category and resource type', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-agentcore-audit',
      AdvancedEventSelectors: Match.arrayWith([
        Match.objectLike({
          Name: 'AgentCore runtime data events',
          FieldSelectors: Match.arrayWith([
            { Field: 'eventCategory', Equals: ['Data'] },
            { Field: 'resources.type', Equals: ['AWS::BedrockAgentCore::Runtime'] },
          ]),
        }),
      ]),
    });
  });

  test('resourceArns scope the selector as an ARN prefix', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-agentcore-audit',
      AdvancedEventSelectors: Match.arrayWith([
        Match.objectLike({
          Name: 'AgentCore runtime data events',
          FieldSelectors: Match.arrayWith([
            {
              Field: 'resources.ARN',
              StartsWith: ['arn:test-partition:bedrock-agentcore:test-region:test-account:runtime/test-runtime'],
            },
          ]),
        }),
      ]),
    });
  });

  test('Selector without resourceArns captures the whole resource type', () => {
    const trails = template.findResources('AWS::CloudTrail::Trail', {
      Properties: {
        TrailName: 'test-org-test-env-test-domain-test-module-agentcore-audit',
      },
    });
    const selectors = Object.values(trails)[0].Properties.AdvancedEventSelectors;
    const endpointSelector = selectors.find(
      (selector: { Name: string }) => selector.Name === 'AgentCore runtime endpoint data events',
    );
    expect(endpointSelector.FieldSelectors).toHaveLength(2);
    expect(
      endpointSelector.FieldSelectors.some((field: { Field: string }) => field.Field === 'resources.ARN'),
    ).toBeFalsy();
  });

  test('A management event selector accompanies the data selectors', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-agentcore-audit',
      AdvancedEventSelectors: Match.arrayWith([
        Match.objectLike({
          Name: 'Management events',
          FieldSelectors: [{ Field: 'eventCategory', Equals: ['Management'] }],
        }),
      ]),
    });
  });

  test('No management event selector when management events are not requested', () => {
    const trails = template.findResources('AWS::CloudTrail::Trail', {
      Properties: {
        TrailName: 'test-org-test-env-test-domain-test-module-lambda-audit',
      },
    });
    const selectors = Object.values(trails)[0].Properties.AdvancedEventSelectors;
    expect(selectors.some((selector: { Name: string }) => selector.Name === 'Management events')).toBeFalsy();
  });

  test('readWriteType renders the corresponding readOnly field selector', () => {
    const trails = template.findResources('AWS::CloudTrail::Trail', {
      Properties: {
        TrailName: 'test-org-test-env-test-domain-test-module-lambda-audit',
      },
    });
    const selectors = Object.values(trails)[0].Properties.AdvancedEventSelectors;
    const readOnlyFieldFor = (name: string) =>
      selectors
        .find((selector: { Name: string }) => selector.Name === name)
        .FieldSelectors.find((field: { Field: string }) => field.Field === 'readOnly');

    expect(readOnlyFieldFor('Lambda write events')).toEqual({ Field: 'readOnly', Equals: ['false'] });
    expect(readOnlyFieldFor('Lambda read events')).toEqual({ Field: 'readOnly', Equals: ['true'] });
    // 'All' is the CloudTrail default and is expressed by omitting the field entirely.
    expect(readOnlyFieldFor('Lambda all events')).toBeUndefined();
  });

  test('Basic event selectors are removed so CloudTrail accepts the advanced ones', () => {
    const trails = template.findResources('AWS::CloudTrail::Trail');
    Object.values(trails).forEach(trail => {
      expect(trail.Properties.EventSelectors).toBeUndefined();
    });
  });

  test('One selector is rendered per resource type, plus the management selector', () => {
    const trails = template.findResources('AWS::CloudTrail::Trail', {
      Properties: {
        TrailName: 'test-org-test-env-test-domain-test-module-agentcore-audit',
      },
    });
    expect(Object.values(trails)[0].Properties.AdvancedEventSelectors).toHaveLength(3);
  });
});

describe('Management event coverage warning', () => {
  const baseTrail = {
    cloudTrailAuditBucketName: 'audit-bucket',
    cloudTrailAuditKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/audit-key-id',
  };
  const WARNING_PATTERN = '.*will capture NO management \\(control plane\\) events.*';

  test('Warns when dataEventSelectors is set without includeManagementEvents', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    new AuditTrailL3Construct(stack, 'teststack', {
      trails: {
        'data-only-audit': {
          ...baseTrail,
          dataEventSelectors: { Runtime: { resourceType: 'AWS::BedrockAgentCore::Runtime' } },
        },
      },
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
    });

    const warnings = Annotations.fromStack(stack).findWarning('*', Match.stringLikeRegexp(WARNING_PATTERN));
    expect(warnings.length).toBeGreaterThan(0);
  });

  test('Does not warn when includeManagementEvents accompanies dataEventSelectors', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    new AuditTrailL3Construct(stack, 'teststack', {
      trails: {
        'covered-audit': {
          ...baseTrail,
          includeManagementEvents: true,
          dataEventSelectors: { Runtime: { resourceType: 'AWS::BedrockAgentCore::Runtime' } },
        },
      },
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
    });

    const warnings = Annotations.fromStack(stack).findWarning('*', Match.stringLikeRegexp(WARNING_PATTERN));
    expect(warnings).toHaveLength(0);
  });

  test('Does not warn on the basic selector path, whose default is unchanged', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    new AuditTrailL3Construct(stack, 'teststack', {
      trails: {
        's3-only-audit': { ...baseTrail, eventSelectors: [{ bucketName: 'data-bucket' }] },
      },
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
    });

    const warnings = Annotations.fromStack(stack).findWarning('*', Match.stringLikeRegexp(WARNING_PATTERN));
    expect(warnings).toHaveLength(0);
  });
});

describe('Selector style mutual exclusion', () => {
  test('Throws when a trail sets both eventSelectors and dataEventSelectors', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const constructProps: AuditTrailL3ConstructProps = {
      trails: {
        'mixed-audit': {
          cloudTrailAuditBucketName: 'mixed-audit-bucket',
          cloudTrailAuditKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/mixed-key-id',
          eventSelectors: [{ bucketName: 'data-bucket-1' }],
          dataEventSelectors: { Runtime: { resourceType: 'AWS::BedrockAgentCore::Runtime' } },
        },
      },

      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
    };

    expect(() => new AuditTrailL3Construct(stack, 'teststack', constructProps)).toThrow(
      /Trail 'mixed-audit' sets both 'eventSelectors' and 'dataEventSelectors'/,
    );
  });

  test('Error names the CloudTrail constraint behind the failure', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const constructProps: AuditTrailL3ConstructProps = {
      trail: {
        cloudTrailAuditBucketName: 'mixed-audit-bucket',
        cloudTrailAuditKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/mixed-key-id',
        eventSelectors: [{ bucketName: 'data-bucket-1' }],
        dataEventSelectors: { Runtime: { resourceType: 'AWS::BedrockAgentCore::Runtime' } },
      },

      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
    };

    expect(() => new AuditTrailL3Construct(stack, 'teststack', constructProps)).toThrow(
      /CloudTrail accepts either basic event selectors or advanced event selectors on a trail, but not both/,
    );
  });
});

describe('Combined trail and trails', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: AuditTrailL3ConstructProps = {
    trail: {
      cloudTrailAuditBucketName: 'legacy-bucket',
      cloudTrailAuditKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/legacy-key-id',
      includeManagementEvents: true,
    },
    trails: {
      'extra-trail': {
        cloudTrailAuditBucketName: 'extra-bucket',
        cloudTrailAuditKmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/extra-key-id',
        includeManagementEvents: false,
      },
    },

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new AuditTrailL3Construct(stack, 'teststack', constructProps);
  const template = Template.fromStack(testApp.testStack);

  test('Creates trails from both trail and trails config', () => {
    template.resourceCountIs('AWS::CloudTrail::Trail', 2);
  });

  test('Legacy trail preserves s3-audit name', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-s3-audit',
      S3BucketName: 'legacy-bucket',
    });
  });

  test('Extra trail uses its configured name', () => {
    template.hasResourceProperties('AWS::CloudTrail::Trail', {
      TrailName: 'test-org-test-env-test-domain-test-module-extra-trail',
      S3BucketName: 'extra-bucket',
    });
  });
});

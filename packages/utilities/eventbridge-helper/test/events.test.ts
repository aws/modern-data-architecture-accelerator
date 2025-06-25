/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { IRule, IRuleTarget, RuleTargetConfig } from 'aws-cdk-lib/aws-events';
import { IRole, Role } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { EventBridgeHelper, EventBridgeProps, EventBridgeRuleProps, S3EventBridgeRuleProps } from '../lib';
import { ConfigurationElement } from '@aws-mdaa/config';

export class TestTarget implements IRuleTarget {
  private role: IRole;

  constructor(role: IRole) {
    this.role = role;
  }
  bind(_rule: IRule, _id?: string): RuleTargetConfig {
    console.log(`Rule: ${_rule}, id:  ${_id}`);
    return {
      arn: 'test-target-arn',
      role: this.role,
    };
  }
}

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  test('Test S3 Rule Props to Generic Rule Props', () => {
    const s3RuleProps: S3EventBridgeRuleProps = {
      buckets: ['test-bucket'],
      prefixes: ['test-prefix'],
    };
    const ruleProps = EventBridgeHelper.createEventRulePropsFromS3EventRuleProps('test-target', s3RuleProps);
    console.log(JSON.stringify(ruleProps, undefined, 2));
    expect(ruleProps).toEqual({
      description: 'Event Rule for triggering test-target with S3 events',
      eventPattern: {
        source: ['aws.s3'],
        detail: {
          bucket: {
            name: ['test-bucket'],
          },
          object: {
            key: [
              {
                prefix: 'test-prefix',
              },
            ],
          },
        },
        'detail-type': ['Object Created'],
      },
    });
  });

  const ruleProps: EventBridgeRuleProps = {
    eventPattern: {
      source: ['test-source'],
    },
  };

  EventBridgeHelper.createGlueMonitoringEventRule(
    stack,
    testApp.naming,
    'test-glue-monitor-rule',
    'test-glue-monitor-rule',
    ruleProps as ConfigurationElement,
  );

  const ruleRole = Role.fromRoleName(stack, 'test-role', 'test-role');

  const eventBridgeProps: EventBridgeProps = {
    eventBridgeRules: {
      'test-rule': ruleProps,
      'test--sched-rule': {
        scheduleExpression: 'cron(0 20 * * ? *)',
        ...ruleProps,
      },
    },
    s3EventBridgeRules: {
      'test-s3-rule': {
        buckets: ['test-bucket'],
        prefixes: ['test-prefix'],
      },
      'test-s3-rule2': {
        buckets: ['test-bucket'],
        prefixes: ['/test-prefix'],
      },
      'test-s3-rule3': {
        buckets: ['test-bucket'],
        prefixes: ['/test-prefix/'],
      },
    },
  };

  const eventBridgeRuleProps = EventBridgeHelper.createNamedEventBridgeRuleProps(eventBridgeProps, 'test-target');
  Object.entries(eventBridgeRuleProps).forEach(propsEntry => {
    const ruleName = propsEntry[0];
    const ruleProps = propsEntry[1];

    EventBridgeHelper.createEventBridgeRuleForTarget(
      stack,
      testApp.naming,
      new TestTarget(ruleRole),
      ruleName,
      ruleProps,
    );
  });

  EventBridgeHelper.createEventRule(stack, testApp.naming, 'test-rule-2', ruleProps);

  const testKey = Key.fromKeyArn(stack, 'test-key', 'arn:test-partition:kms:test-region:test-account:key/test-key');
  EventBridgeHelper.createDlq(stack, testApp.naming, 'testing', testKey, ruleRole);

  testApp.checkCdkNagCompliance(stack);
  const template = Template.fromStack(stack);

  // console.log( JSON.stringify( template, undefined, 2 ) )

  test('Glue Monitor Rule', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      Description: 'test-glue-monitor-rule',
      EventPattern: {
        source: ['aws.glue'],
        detail: {
          eventPattern: {
            source: ['test-source'],
          },
        },
      },
      Name: 'test-org-test-env-test-domain-test-module-test-glue-mo-2445aa49',
      State: 'ENABLED',
    });
  });

  test('Test Target Rule', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      EventPattern: {
        source: ['test-source'],
      },
      Name: 'test-org-test-env-test-domain-test-module-test-rule',
      State: 'ENABLED',
      Targets: [
        {
          Arn: 'test-target-arn',
          Id: 'Target0',
          RoleArn: 'arn:test-partition:iam::test-account:role/test-role',
        },
      ],
    });
  });
  test('S3 Rule', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      Description: 'Event Rule for triggering test-target-test-s3-rule with S3 events',
      EventPattern: {
        source: ['aws.s3'],
        detail: {
          bucket: {
            name: ['test-bucket'],
          },
        },
        'detail-type': ['Object Created'],
      },
      Name: 'test-org-test-env-test-domain-test-module-test-s3-rule',
      State: 'ENABLED',
      Targets: [
        {
          Arn: 'test-target-arn',
          Id: 'Target0',
          RoleArn: 'arn:test-partition:iam::test-account:role/test-role',
        },
      ],
    });
  });
  test('Glue Monitor Rule', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      Description: 'test-glue-monitor-rule',
      EventPattern: {
        source: ['aws.glue'],
        detail: {
          eventPattern: {
            source: ['test-source'],
          },
        },
      },
      Name: 'test-org-test-env-test-domain-test-module-test-glue-mo-2445aa49',
      State: 'ENABLED',
    });
  });

  test('Basic Rule', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      EventPattern: {
        source: ['test-source'],
      },
      Name: 'test-org-test-env-test-domain-test-module-test-rule-2',
      State: 'ENABLED',
    });
  });

  test('DLQ', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      KmsMasterKeyId: 'arn:test-partition:kms:test-region:test-account:key/test-key',
      QueueName: 'test-org-test-env-test-domain-test-module-testing-dlq',
    });
  });
  test('DLQ Policy', () => {
    template.hasResourceProperties('AWS::SQS::QueuePolicy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'sqs:*',
            Condition: {
              Bool: {
                'aws:SecureTransport': 'false',
              },
            },
            Effect: 'Deny',
            Principal: {
              AWS: '*',
            },
            Resource: '*',
            Sid: 'EnforceSSL',
          },
          {
            Action: 'sqs:SendMessage',
            Effect: 'Allow',
            Principal: {
              AWS: 'arn:test-partition:iam::test-account:role/test-role',
            },
            Resource: '*',
            Sid: 'SendMessage',
          },
        ],
        Version: '2012-10-17',
      },
      Queues: [
        {
          Ref: 'dlqtesting40A21A6B',
        },
      ],
    });
  });
});

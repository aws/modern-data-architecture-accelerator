/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Duration } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { EventBus, Schedule } from 'aws-cdk-lib/aws-events';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { MdaaRule, MdaaRuleProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testContstructProps: MdaaRuleProps = {
    naming: testApp.naming,
    ruleName: 'test-rule',
    description: 'Test rule description',
    eventPattern: {
      source: ['aws.test'],
      detailType: ['AWS API Call via CloudTrail'],
    },
  };

  new MdaaRule(testApp.testStack, 'test-construct', testContstructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // Fits within the 64-char rule-name limit, so the name is prefixed but not truncated.
  test('Rule Name', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      Name: 'test-org-test-env-test-domain-test-module-test-rule',
    });
  });

  test('Rule Description', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      Description: 'Test rule description',
    });
  });

  test('Event Pattern', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      EventPattern: {
        source: ['aws.test'],
        'detail-type': ['AWS API Call via CloudTrail'],
      },
    });
  });

  // The rule's name and ARN are published for cross-module reference, matching the
  // convention of the other MDAA L2 constructs.
  test('SSM Parameters', () => {
    const params = Object.values(template.findResources('AWS::SSM::Parameter')).map(p => p.Properties?.Name);
    expect(params).toEqual(
      expect.arrayContaining([
        '/test-org/test-domain/test-module/eventbridge-rule/test-rule/name',
        '/test-org/test-domain/test-module/eventbridge-rule/test-rule/arn',
      ]),
    );
  });

  // EventBridge caps rule names at 64 characters. A name that would exceed the cap is
  // truncated with a uniqueness hash covering the full pre-truncation name, so names
  // stay unique and stable rather than colliding.
  test('Long Rule Name Is Truncated To The Limit', () => {
    const longApp = new MdaaTestApp();
    new MdaaRule(longApp.testStack, 'long-construct', {
      naming: longApp.naming,
      ruleName: 'a-very-long-rule-name-that-will-certainly-exceed-the-eventbridge-limit',
      eventPattern: { source: ['aws.test'] },
    });
    const longTemplate = Template.fromStack(longApp.testStack);
    const names = Object.values(longTemplate.findResources('AWS::Events::Rule')).map(r => r.Properties?.Name);
    expect(names).toHaveLength(1);
    expect(names[0].length).toBeLessThanOrEqual(64);
  });

  // `schedule`, `enabled`, and `targets` pass straight through to the underlying CDK
  // Rule. Exercised to confirm the wrapper forwards them rather than dropping them: a
  // silently-dropped schedule or target list would produce a rule that deploys
  // cleanly and never does anything.
  //
  // Note a scheduled rule must live on the DEFAULT bus - EventBridge does not support
  // schedule expressions on a custom bus - so `eventBus` is covered separately below.
  test('Scheduled Rule With Target And Disabled State', () => {
    const schedApp = new MdaaTestApp();
    const topic = new Topic(schedApp.testStack, 'target-topic');

    new MdaaRule(schedApp.testStack, 'scheduled-construct', {
      naming: schedApp.naming,
      ruleName: 'scheduled-rule',
      schedule: Schedule.rate(Duration.hours(1)),
      enabled: false,
      targets: [new SnsTopic(topic)],
    });

    const schedTemplate = Template.fromStack(schedApp.testStack);
    schedTemplate.hasResourceProperties('AWS::Events::Rule', {
      Name: 'test-org-test-env-test-domain-test-module-scheduled-rule',
      ScheduleExpression: 'rate(1 hour)',
      State: 'DISABLED',
      Targets: Match.arrayWith([Match.objectLike({ Arn: { Ref: Match.anyValue() } })]),
    });
  });

  // `eventBus` associates an event-pattern rule with a non-default bus.
  test('Event Pattern Rule On A Custom Event Bus', () => {
    const busApp = new MdaaTestApp();
    const bus = new EventBus(busApp.testStack, 'custom-bus');

    new MdaaRule(busApp.testStack, 'custom-bus-construct', {
      naming: busApp.naming,
      ruleName: 'custom-bus-rule',
      eventPattern: { source: ['aws.test'] },
      eventBus: bus,
    });

    const busTemplate = Template.fromStack(busApp.testStack);
    busTemplate.hasResourceProperties('AWS::Events::Rule', {
      Name: 'test-org-test-env-test-domain-test-module-custom-bus-rule',
      EventBusName: { Ref: Match.anyValue() },
      State: 'ENABLED',
    });
  });
});

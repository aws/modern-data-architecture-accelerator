/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { EventBridgeL3Construct, EventBridgeL3ConstructProps } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: EventBridgeL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    eventBuses: {
      'test-bus': {
        archiveRetention: 100,
        principals: [
          {
            arn: 'arn:test-partition:iam::test-account:role/test-role',
          },
          {
            service: 's3.amazonaws.com',
          },
        ],
      },
    },
  };

  new EventBridgeL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log( JSON.stringify( template, undefined, 2 ) )

  test('EventBus Resource Count', () => {
    template.resourceCountIs('AWS::Events::EventBus', 1);
  });

  test('Archive Retention', () => {
    template.hasResourceProperties('AWS::Events::Archive', {
      RetentionDays: 100,
    });
  });
  test('EventBus Policy', () => {
    template.hasResourceProperties('AWS::Events::EventBusPolicy', {
      EventBusName: {
        Ref: 'teststacktestbusbusA97F5FB2',
      },
      Statement: {
        Action: 'events:PutEvents',
        Effect: 'Allow',
        Principal: {
          AWS: 'arn:test-partition:iam::test-account:role/test-role',
          Service: 's3.amazonaws.com',
        },
        Resource: {
          'Fn::GetAtt': ['teststacktestbusbusA97F5FB2', 'Arn'],
        },
      },
    });
  });
});

describe('Multiple EventBuses Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const constructProps: EventBridgeL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    eventBuses: {
      'bus-one': {
        archiveRetention: 30,
        principals: [
          {
            arn: 'arn:test-partition:iam::test-account:role/role-one',
          },
        ],
      },
      'bus-two': {
        archiveRetention: 60,
        principals: [
          {
            service: 'events.amazonaws.com',
          },
        ],
      },
    },
  };

  new EventBridgeL3Construct(stack, 'multistack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Multiple EventBus Resource Count', () => {
    template.resourceCountIs('AWS::Events::EventBus', 2);
  });

  test('Multiple Archive Resource Count', () => {
    template.resourceCountIs('AWS::Events::Archive', 2);
  });

  test('Bus One Archive Retention', () => {
    template.hasResourceProperties('AWS::Events::Archive', {
      RetentionDays: 30,
    });
  });

  test('Bus Two Archive Retention', () => {
    template.hasResourceProperties('AWS::Events::Archive', {
      RetentionDays: 60,
    });
  });

  test('Multiple EventBus Policies', () => {
    template.resourceCountIs('AWS::Events::EventBusPolicy', 2);
  });
});

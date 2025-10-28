/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { StepFunctionL3Construct, StepFunctionL3ConstructProps } from '../lib';

const validStepfunctionDefinition = {
  stateMachineName: 'test-state-machine',
  stateMachineType: 'STANDARD',
  stateMachineExecutionRole: 'arn:test-partition:iam::test-account:role/service-role/StepFunctions-role',
  logExecutionData: false,
  rawStepFunctionDef: {
    Comment: 'Test state machine',
    StartAt: 'Pass',
    States: {
      Pass: {
        Type: 'Pass',
        End: true,
      },
    },
  },
};

describe('StepFunctionL3Construct Constructor Exception Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  test('should throw error when projectKMSArn is undefined', () => {
    const constructProps: StepFunctionL3ConstructProps = {
      projectKMSArn: undefined,
      stepfunctionDefinitions: [validStepfunctionDefinition],
      projectName: 'test-project',
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
    };

    expect(() => {
      new StepFunctionL3Construct(stack, 'test-construct', constructProps);
    }).toThrow('Project KMS ARN is required for Step Function L3 Construct');
  });

  test('should throw error when projectKMSArn is empty string', () => {
    const constructProps: StepFunctionL3ConstructProps = {
      projectKMSArn: '',
      stepfunctionDefinitions: [validStepfunctionDefinition],
      projectName: 'test-project',
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
    };

    expect(() => {
      new StepFunctionL3Construct(stack, 'test-construct-empty', constructProps);
    }).toThrow('Project KMS ARN is required for Step Function L3 Construct');
  });
});

describe('StepFunctionL3Construct Log Group Retention Tests', () => {
  let testApp: MdaaTestApp;
  let stack: any;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    stack = testApp.testStack;
  });

  test('should use specified retention days when provided', () => {
    const constructProps: StepFunctionL3ConstructProps = {
      projectKMSArn: 'arn:test-partition:kms:test-region:test-account:key/test-key',
      stepfunctionDefinitions: [
        {
          ...validStepfunctionDefinition,
          logGroupRetentionDays: 30,
        },
      ],
      projectName: 'test-project',
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
    };

    new StepFunctionL3Construct(stack, 'test-retention-specified', constructProps);
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 30,
    });
  });

  test('should use infinite retention when logGroupRetentionDays is 0', () => {
    const constructProps: StepFunctionL3ConstructProps = {
      projectKMSArn: 'arn:test-partition:kms:test-region:test-account:key/test-key',
      stepfunctionDefinitions: [
        {
          ...validStepfunctionDefinition,
          logGroupRetentionDays: 0,
        },
      ],
      projectName: 'test-project',
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
    };

    new StepFunctionL3Construct(stack, 'test-retention-infinite', constructProps);
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      LogGroupName: '/aws/stepfunction/test-org-test-env-test-domain-test-module-test-state-machine',
    });

    const logGroups = template.findResources('AWS::Logs::LogGroup');
    const logGroup = Object.values(logGroups)[0];
    expect(logGroup.Properties.RetentionInDays).toBeUndefined();
  });

  test('should use default TWO_YEARS retention when logGroupRetentionDays is undefined', () => {
    const constructProps: StepFunctionL3ConstructProps = {
      projectKMSArn: 'arn:test-partition:kms:test-region:test-account:key/test-key',
      stepfunctionDefinitions: [validStepfunctionDefinition],
      projectName: 'test-project',
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
    };

    new StepFunctionL3Construct(stack, 'test-retention-default', constructProps);
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::Logs::LogGroup', {
      RetentionInDays: 731,
    });
  });
});

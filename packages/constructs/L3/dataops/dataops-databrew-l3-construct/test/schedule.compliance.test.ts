/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaDataBrewSchedule, MdaaDataBrewScheduleProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testContstructProps: MdaaDataBrewScheduleProps = {
    naming: testApp.naming,
    name: 'test-schedule',
    cronExpression: 'test-cron-expression',
    jobNames: ['jobName1', 'jobName2'],
  };

  new MdaaDataBrewSchedule(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('TestScheduleName', () => {
    template.hasResourceProperties('AWS::DataBrew::Schedule', {
      Name: testApp.naming.resourceName('test-schedule'),
    });
  });

  test('TestScheduleInput', () => {
    template.hasResourceProperties('AWS::DataBrew::Schedule', {
      Name: 'test-org-test-env-test-domain-test-module-test-schedule',
      CronExpression: 'test-cron-expression',
      JobNames: ['jobName1', 'jobName2'],
    });
  });
});

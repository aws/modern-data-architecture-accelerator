/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Stack } from 'aws-cdk-lib';
import { GlueJobL3Construct, GlueJobL3ConstructProps, JobCommand, JobConfig } from '../lib';

describe('GlueJobL3Construct Constructor Exception Tests', () => {
  let testApp: MdaaTestApp;
  let stack: Stack;
  let baseJobCommand: JobCommand;
  let baseJobConfig: JobConfig;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    stack = testApp.testStack;

    baseJobCommand = {
      name: 'glueetl',
      scriptLocation: './test/src/glue/python/job.py',
    };

    baseJobConfig = {
      executionRoleArn: 'arn:test-partition:iam:test-region:test-account:role/some-execution-role',
      command: baseJobCommand,
      description: 'test job',
    };
  });

  function createBaseProps(): Omit<
    GlueJobL3ConstructProps,
    'deploymentRoleArn' | 'projectBucketName' | 'projectKMSArn' | 'securityConfigurationName' | 'notificationTopicArn'
  > {
    return {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      projectName: 'test-project',
      jobConfigs: {
        testJob: baseJobConfig,
      },
    };
  }

  test('should throw error when deploymentRoleArn is missing', () => {
    const props: GlueJobL3ConstructProps = {
      ...createBaseProps(),
      projectBucketName: 'test-bucket',
      projectKMSArn: 'arn:test-partition:kms:test-region:test-account:key/test-key',
      securityConfigurationName: 'test-security-config',
      notificationTopicArn: 'arn:test-partition:sns:test-region:test-account:test-topic',
    };

    expect(() => {
      new GlueJobL3Construct(stack, 'test-construct', props);
    }).toThrow('Deployment role ARN is required for job configuration');
  });

  test('should throw error when projectBucketName is missing', () => {
    const props: GlueJobL3ConstructProps = {
      ...createBaseProps(),
      deploymentRoleArn: 'arn:test-partition:iam:test-region:test-account:role/deployment-role',
      projectKMSArn: 'arn:test-partition:kms:test-region:test-account:key/test-key',
      securityConfigurationName: 'test-security-config',
      notificationTopicArn: 'arn:test-partition:sns:test-region:test-account:test-topic',
    };

    expect(() => {
      new GlueJobL3Construct(stack, 'test-construct', props);
    }).toThrow('Project bucket name is required for job configuration');
  });

  test('should throw error when projectKMSArn is missing', () => {
    const props: GlueJobL3ConstructProps = {
      ...createBaseProps(),
      deploymentRoleArn: 'arn:test-partition:iam:test-region:test-account:role/deployment-role',
      projectBucketName: 'test-bucket',
      securityConfigurationName: 'test-security-config',
      notificationTopicArn: 'arn:test-partition:sns:test-region:test-account:test-topic',
    };

    expect(() => {
      new GlueJobL3Construct(stack, 'test-construct', props);
    }).toThrow('Project KMS Key is required for job configuration');
  });

  test('should throw error when securityConfigurationName is missing', () => {
    const props: GlueJobL3ConstructProps = {
      ...createBaseProps(),
      deploymentRoleArn: 'arn:test-partition:iam:test-region:test-account:role/deployment-role',
      projectBucketName: 'test-bucket',
      projectKMSArn: 'arn:test-partition:kms:test-region:test-account:key/test-key',
      notificationTopicArn: 'arn:test-partition:sns:test-region:test-account:test-topic',
    };

    expect(() => {
      new GlueJobL3Construct(stack, 'test-construct', props);
    }).toThrow('Security configuration name is required for job monitoring event rule');
  });

  test('should throw error when notificationTopicArn is missing', () => {
    const props: GlueJobL3ConstructProps = {
      ...createBaseProps(),
      deploymentRoleArn: 'arn:test-partition:iam:test-region:test-account:role/deployment-role',
      projectBucketName: 'test-bucket',
      projectKMSArn: 'arn:test-partition:kms:test-region:test-account:key/test-key',
      securityConfigurationName: 'test-security-config',
    };

    expect(() => {
      new GlueJobL3Construct(stack, 'test-construct', props);
    }).toThrow('Notification topic ARN is required for job monitoring event rule');
  });

  test('should successfully create construct when all required properties are provided', () => {
    const props: GlueJobL3ConstructProps = {
      ...createBaseProps(),
      deploymentRoleArn: 'arn:test-partition:iam:test-region:test-account:role/deployment-role',
      projectBucketName: 'test-bucket',
      projectKMSArn: 'arn:test-partition:kms:test-region:test-account:key/test-key',
      securityConfigurationName: 'test-security-config',
      notificationTopicArn: 'arn:test-partition:sns:test-region:test-account:test-topic',
    };

    expect(() => {
      new GlueJobL3Construct(stack, 'test-construct', props);
    }).not.toThrow();
  });
});

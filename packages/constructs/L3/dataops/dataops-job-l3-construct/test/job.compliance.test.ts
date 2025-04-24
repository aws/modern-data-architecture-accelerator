/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { GlueJobL3Construct, GlueJobL3ConstructProps, JobCommand, JobConfig } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const jobCommand: JobCommand = {
    name: 'glueetl',
    scriptLocation: './test/src/glue/job.py',
  };

  const testJobProps: JobConfig = {
    executionRoleArn: 'arn:test-partition:iam:test-region:test-account:role/some-execution-role',
    command: jobCommand,
    description: 'test job',
    additionalScripts: ['./test/src/glue/utils/core.py'],
  };

  const constructProps: GlueJobL3ConstructProps = {
    securityConfigurationName: 'test-security-configuration',
    projectName: 'test-project',
    notificationTopicArn: 'arn:test-partition:sns:test-region:test-account:MyTopic',

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    deploymentRoleArn: 'arn:test-partition:iam:test-region:test-account:role/some-deployment-role',
    projectBucketName: 'some-project-bucket-name',
    jobConfigs: {
      testJob: testJobProps,
    },
  };

  new GlueJobL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log( JSON.stringify( template, undefined, 2 ) )

  test('Validate resource counts', () => {
    template.resourceCountIs('AWS::Glue::Job', 1);
  });

  test('Job Command', () => {
    template.hasResourceProperties('AWS::Glue::Job', {
      Command: {
        Name: 'glueetl',
        ScriptLocation: 's3://some-project-bucket-name/deployment/jobs/testJob/job.py',
      },
    });
  });
  test('Job Role', () => {
    template.hasResourceProperties('AWS::Glue::Job', {
      Role: 'arn:test-partition:iam:test-region:test-account:role/some-execution-role',
    });
  });
  test('Job Temp Dir', () => {
    template.hasResourceProperties('AWS::Glue::Job', {
      DefaultArguments: {
        '--TempDir': 's3://some-project-bucket-name/temp/jobs/testJob',
      },
    });
  });
  test('Job Name', () => {
    template.hasResourceProperties('AWS::Glue::Job', {
      Name: 'test-org-test-env-test-domain-test-module-testjob',
    });
  });
  test('Job Security Config', () => {
    template.hasResourceProperties('AWS::Glue::Job', {
      SecurityConfiguration: 'test-security-configuration',
    });
  });
  test('Glue Job Rule', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      Description: 'Workflow Job failure events',
      EventPattern: {
        source: ['aws.glue'],
        detail: {
          jobName: ['test-org-test-env-test-domain-test-module-testjob'],
          state: ['FAILED', 'TIMEOUT', 'STOPPED'],
        },
      },
      Name: 'test-org-test-env-test-domain-test-module-testjob-monitor',
      State: 'ENABLED',
    });
  });
  test('Additional Python Scripts', () => {
    template.hasResourceProperties('AWS::Glue::Job', {
      DefaultArguments: {
        '--extra-py-files': {
          'Fn::Join': [
            '',
            [
              's3://some-project-bucket-name/deployment/libs/testJob/',
              {
                'Fn::Select': [
                  0,
                  {
                    'Fn::GetAtt': ['jobdeploymenttestJobadditionalscriptCustomResource2C7973A9', 'SourceObjectKeys'],
                  },
                ],
              },
            ],
          ],
        },
      },
    });
  });
});

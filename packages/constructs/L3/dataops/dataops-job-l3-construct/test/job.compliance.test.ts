/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { GlueJobL3Construct, GlueJobL3ConstructProps, JobCommand, JobConfig } from '../lib';
import { Stack } from 'aws-cdk-lib';

describe('MDAA Compliance Stack Tests', () => {
  const jobCommand: JobCommand = {
    name: 'glueetl',
    scriptLocation: './test/src/glue/python/job.py',
  };

  const testJobProps: JobConfig = {
    executionRoleArn: 'arn:test-partition:iam:test-region:test-account:role/some-execution-role',
    command: jobCommand,
    description: 'test job',
    additionalScripts: ['./test/src/glue/python/utils/core.py'],
    additionalFiles: ['./test/src/glue/scala/extra_file.txt'],
    additionalJars: ['./test/src/glue/scala/lib/extra.jar'],
  };

  function createConstructorProps(stack: Stack, testApp: MdaaTestApp): GlueJobL3ConstructProps {
    return {
      kmsArn: 'arn:test-partition:kms:test-region:test-account:key/testing-key-id',
      securityConfigurationName: 'test-security-configuration',
      projectName: 'test-project',
      notificationTopicArn: 'arn:test-partition:sns:test-region:test-account:MyTopic',

      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      deploymentRoleArn: 'arn:test-partition:iam:test-region:test-account:role/some-deployment-role',
      bucketName: 'some-project-bucket-name',
      jobConfigs: {
        testJob: testJobProps,
      },
    };
  }

  describe('MDAA without continuous logging', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const testJobNoContinuousLoggingProps: JobConfig = {
      ...testJobProps,
    };

    new GlueJobL3Construct(stack, 'teststack', {
      ...createConstructorProps(stack, testApp),
      jobConfigs: { testJob: testJobNoContinuousLoggingProps },
    });
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('Validate resource counts', () => {
      template.resourceCountIs('AWS::Glue::Job', 1);
      template.resourceCountIs('AWS::Logs::LogGroup', 0);
    });
  });

  describe('MDAA with continuous logging of specific retention', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const testJobLoggingProps: JobConfig = {
      ...testJobProps,
      continuousLogging: {
        logGroupRetentionDays: 3,
      },
    };

    new GlueJobL3Construct(stack, 'teststack', {
      ...createConstructorProps(stack, testApp),
      jobConfigs: { testJob: testJobLoggingProps },
    });
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('Validate resource counts', () => {
      template.resourceCountIs('AWS::Glue::Job', 1);
      template.resourceCountIs('AWS::Logs::LogGroup', 1);
    });
    test('Check the logger has the correct retention', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 3,
      });
    });
  });

  describe('MDAA standard usage', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const testJobNoContinuousLoggingProps: JobConfig = {
      ...testJobProps,
      continuousLogging: {
        logGroupRetentionDays: 0,
      },
    };
    new GlueJobL3Construct(stack, 'teststack', {
      ...createConstructorProps(stack, testApp),
      jobConfigs: { testJob: testJobNoContinuousLoggingProps },
    });

    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);
    // console.log(JSON.stringify(template.toJSON(), undefined, 2));
    test('Validate resource counts', () => {
      template.resourceCountIs('AWS::Glue::Job', 1);
      template.resourceCountIs('AWS::Logs::LogGroup', 1);
    });

    test('Job Command', () => {
      template.hasResourceProperties('AWS::Glue::Job', {
        Command: {
          Name: 'glueetl',
          ScriptLocation: {
            'Fn::Join': [
              '',
              [
                's3://',
                {
                  'Fn::Select': [
                    0,
                    {
                      'Fn::Split': [
                        '/',
                        {
                          'Fn::Select': [
                            5,
                            {
                              'Fn::Split': [
                                ':',
                                {
                                  'Fn::GetAtt': ['jobdeploymenttestJobCustomResource649ABC43', 'DestinationBucketArn'],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                '/deployment/jobs/testJob/job.py',
              ],
            ],
          },
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
                's3://',
                {
                  'Fn::Select': [
                    0,
                    {
                      'Fn::Split': [
                        '/',
                        {
                          'Fn::Select': [
                            5,
                            {
                              'Fn::Split': [
                                ':',
                                {
                                  'Fn::GetAtt': [
                                    'jobdeploymenttestJobadditionalscriptCustomResource2C7973A9',
                                    'DestinationBucketArn',
                                  ],
                                },
                              ],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                '/deployment/libs/testJob/',
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
    test('Check the continuous flag is there', () => {
      const logGroupResources = template.findResources('AWS::Logs::LogGroup');
      const logGroupLogicalId = Object.keys(logGroupResources)[0];
      const logGroupName = logGroupResources[logGroupLogicalId]['Properties']['LogGroupName'];

      const jobResources = template.findResources('AWS::Glue::Job');
      const jobLogicalId = Object.keys(jobResources)[0];
      const jobName = jobResources[jobLogicalId]['Properties']['Name'];
      console.log(jobName);

      template.hasResourceProperties('AWS::Glue::Job', {
        DefaultArguments: {
          '--continuous-log-logGroup': logGroupName,
        },
      });
    });
    test('Check the logger has no retention', () => {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: Match.absent(),
      });
    });
    test('Job is NOT tagged with AmazonDataZoneProject by default (no cross-module SSM dependency)', () => {
      // Without applySagemakerProjectTag, the construct adds no AmazonDataZoneProject
      // tag (and hence no SMUS project-id SSM dependency), so it stays independently
      // deployable in a plain (non-SMUS) dataops project. The L3 construct applies no
      // other tags of its own, so the Glue job has no Tags property at all here.
      template.hasResourceProperties('AWS::Glue::Job', {
        Tags: Match.absent(),
      });
    });
    test('No SMUS project-id SSM parameter is synthesized by default (plain-project deployability)', () => {
      // The tag read emits an AWS::SSM::Parameter::Value<String> template parameter, which
      // CloudFormation resolves at changeset creation — before any resource is created — so a
      // missing producer aborts the entire stack, not just the tagging. projectName is set here
      // (via createConstructorProps) but the flag is off, which is the exact plain-project
      // composition that reached a failed deploy. Assert the sagemaker project-id parameter is
      // absent so a plain dataops-project (publishing neither datazone nor sagemaker) deploys.
      const smusParams = Object.values(
        template.findParameters('*', { Type: 'AWS::SSM::Parameter::Value<String>' }),
      ).filter(param => /sagemaker\/project\/id/.test(param.Default ?? ''));
      expect(smusParams).toHaveLength(0);
    });
  });

  describe('MDAA with SMUS project tagging (applySagemakerProjectTag)', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    new GlueJobL3Construct(stack, 'teststack', {
      ...createConstructorProps(stack, testApp),
      applySagemakerProjectTag: true,
    });
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('Job AmazonDataZoneProject tag resolves to the project DataZone-project-id SSM parameter', () => {
      // With applySagemakerProjectTag enabled, the tag value must reference the SSM
      // parameter holding THIS project's DataZone project ID (path:
      // <projectName>/sagemaker/project/id/default), not just any value — assert both
      // the Ref and the referenced SSM path so the path construction is verified.
      template.hasResourceProperties('AWS::Glue::Job', {
        Tags: Match.objectLike({
          AmazonDataZoneProject: {
            Ref: Match.stringLikeRegexp('SsmParameterValue.*testproject.*sagemakerprojectiddefault.*Parameter'),
          },
        }),
      });
      template.hasParameter('*', {
        Type: 'AWS::SSM::Parameter::Value<String>',
        Default: Match.stringLikeRegexp('test-project/sagemaker/project/id/default'),
      });
    });
  });

  describe('MDAA with worker type', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const testJobWorkerTypeProps: JobConfig = {
      ...testJobProps,
      workerType: 'G.4X',
      numberOfWorkers: 4,
    };

    new GlueJobL3Construct(stack, 'teststack', {
      ...createConstructorProps(stack, testApp),
      jobConfigs: { testJob: testJobWorkerTypeProps },
    });
    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('workerType and numberOfWorkers reach the Glue job', () => {
      template.hasResourceProperties('AWS::Glue::Job', {
        WorkerType: 'G.4X',
        NumberOfWorkers: 4,
      });
    });
  });

  describe('MDAA with input parameters', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const inputParamsObj = {
      key1: 1,
      key2: 'value2',
    };

    const testJobInputParamsProps: JobConfig = {
      ...testJobProps,
      defaultArguments: {
        '--input_params': inputParamsObj,
      },
    };

    new GlueJobL3Construct(stack, 'teststack', {
      ...createConstructorProps(stack, testApp),
      jobConfigs: { testJob: testJobInputParamsProps },
    });
    const template = Template.fromStack(testApp.testStack);

    test('Validate resource counts', () => {
      template.resourceCountIs('AWS::Glue::Job', 1);
      const resources = template.findResources('AWS::Glue::Job');
      const inputParams: string = resources['testJobjob'].Properties.DefaultArguments['--input_params'];
      expect(JSON.parse(inputParams)).toEqual(inputParamsObj);
    });
  });

  describe('Error condition tests', () => {
    test('Should throw error when deploymentRoleArn is missing', () => {
      const testApp = new MdaaTestApp();
      const props = { ...createConstructorProps(testApp.testStack, testApp), deploymentRoleArn: undefined };

      expect(() => {
        new GlueJobL3Construct(testApp.testStack, 'test-no-deployment-role', props);
      }).toThrow('Deployment role ARN is required for job configuration');
    });

    test('Should throw error when bucketName is missing', () => {
      const testApp = new MdaaTestApp();
      const props = { ...createConstructorProps(testApp.testStack, testApp), bucketName: undefined };

      expect(() => {
        new GlueJobL3Construct(testApp.testStack, 'test-no-bucket', props);
      }).toThrow('Project bucket name is required for job configuration');
    });

    test('Should throw error when kmsArn is missing', () => {
      const testApp = new MdaaTestApp();
      const props = { ...createConstructorProps(testApp.testStack, testApp), kmsArn: undefined };

      expect(() => {
        new GlueJobL3Construct(testApp.testStack, 'test-no-kms', props);
      }).toThrow('Project KMS Key is required for job configuration');
    });

    test('Should throw error when securityConfigurationName is missing', () => {
      const testApp = new MdaaTestApp();
      const props = { ...createConstructorProps(testApp.testStack, testApp), securityConfigurationName: undefined };

      expect(() => {
        new GlueJobL3Construct(testApp.testStack, 'test-no-security', props);
      }).toThrow('Security configuration name is required for job monitoring event rule');
    });
  });
});

describe('Multiple Jobs Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const jobCommand: JobCommand = {
    name: 'glueetl',
    scriptLocation: './test/src/glue/python/job.py',
  };

  const job1: JobConfig = {
    executionRoleArn: 'arn:test-partition:iam:test-region:test-account:role/role-one',
    command: jobCommand,
    description: 'first job',
  };

  const job2: JobConfig = {
    executionRoleArn: 'arn:test-partition:iam:test-region:test-account:role/role-two',
    command: { name: 'pythonshell', scriptLocation: './test/src/glue/python/job.py' },
    description: 'second job',
  };

  const constructProps: GlueJobL3ConstructProps = {
    kmsArn: 'arn:test-partition:kms:test-region:test-account:key/testing-key-id',
    securityConfigurationName: 'test-security-configuration',
    projectName: 'test-project',
    notificationTopicArn: 'arn:test-partition:sns:test-region:test-account:MyTopic',
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    deploymentRoleArn: 'arn:test-partition:iam:test-region:test-account:role/some-deployment-role',
    bucketName: 'some-project-bucket-name',
    jobConfigs: {
      'job-one': job1,
      'job-two': job2,
    },
  };

  new GlueJobL3Construct(stack, 'multi-jobs', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Multiple Glue Job Resource Count', () => {
    template.resourceCountIs('AWS::Glue::Job', 2);
  });

  test('Job One Properties', () => {
    template.hasResourceProperties('AWS::Glue::Job', {
      Description: 'first job',
      Command: Match.objectLike({ Name: 'glueetl' }),
    });
  });

  test('Job Two Properties', () => {
    template.hasResourceProperties('AWS::Glue::Job', {
      Description: 'second job',
      Command: Match.objectLike({ Name: 'pythonshell' }),
    });
  });
});

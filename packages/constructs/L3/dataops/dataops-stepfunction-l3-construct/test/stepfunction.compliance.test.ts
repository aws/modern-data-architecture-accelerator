/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { StepFunctionL3Construct, StepFunctionL3ConstructProps, StepFunctionProps } from '../lib';
describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const stepfunctionDefinition: StepFunctionProps = {
    stateMachineName: 'test-state-machine',
    stateMachineType: 'STANDARD',
    stateMachineExecutionRole: 'arn:test-partition:iam::test-account:role/service-role/StepFunctions-role-4c710b67',
    logGroupRetentionDays: 0,
    logExecutionData: false,
    suppressions: [
      {
        id: 'NIST.800.53.R5-CloudWatchLogGroupRetentionPeriod',
        reason: 'Cloudwatch Log Group retention period is managed by AWS Secure Environment Accelerator',
      },
      {
        id: 'HIPAA.Security-CloudWatchLogGroupRetentionPeriod',
        reason: 'Cloudwatch Log Group retention period is managed by AWS Secure Environment Accelerator',
      },
      {
        id: 'PCI.DSS.321-CloudWatchLogGroupRetentionPeriod',
        reason: 'Cloudwatch Log Group retention period is managed by AWS Secure Environment Accelerator',
      },
    ],
    eventBridge: {
      retryAttempts: 2,
      maxEventAgeSeconds: 3600,
      s3EventBridgeRules: {
        'test-rule': {
          buckets: ['test-bucket'],
        },
      },
      eventBridgeRules: {
        'test-rule': {
          eventPattern: {
            source: ['test-source'],
          },
        },
      },
    },
    rawStepFunctionDef: {
      Comment: 'A description of my state machine',
      StartAt: 'StartCrawler-Domain1',
      States: {
        'StartCrawler-Domain1': {
          Type: 'Task',
          Next: 'WaitForDomain1Crawler',
          Parameters: {
            Name: 'raw-source-files-crawler',
          },
          Resource: 'arn:test-partition:states:::aws-sdk:glue:startCrawler',
        },
        WaitForDomain1Crawler: {
          Type: 'Wait',
          Seconds: 5,
          Next: 'GetCrawlerStatus-Domain1',
        },
        'GetCrawlerStatus-Domain1': {
          Type: 'Task',
          Next: 'CheckStatus-Domain1Crawler',
          Parameters: {
            Name: 'raw-source-files-crawler',
          },
          Resource: 'arn:test-partition:states:::aws-sdk:glue:getCrawler',
        },
        'CheckStatus-Domain1Crawler': {
          Type: 'Choice',
          Choices: [
            {
              Or: [
                {
                  Variable: '$.Crawler.State',
                  StringEquals: 'RUNNING',
                },
                {
                  Variable: '$.Crawler.State',
                  StringEquals: 'STOPPING',
                },
              ],
              Next: 'WaitForDomain1Crawler',
            },
            {
              Or: [
                {
                  Variable: '$.Crawler.State',
                  StringEquals: 'FAILED',
                },
                {
                  Variable: '$.Crawler.State',
                  StringEquals: 'STOPPED',
                },
              ],
              Next: 'Fail-Domain1Crawler',
            },
          ],
          Default: 'Parallel',
        },
        Parallel: {
          Type: 'Parallel',
          Branches: [
            {
              StartAt: 'Start-SourceFile1Curation',
              States: {
                'Start-SourceFile1Curation': {
                  Type: 'Task',
                  Parameters: {
                    Name: 'raw-source-file1-curate',
                  },
                  Resource: 'arn:test-partition:states:::aws-sdk:glue:startWorkflowRun',
                  Next: 'WaitForSourceFile1Curation',
                },
                WaitForSourceFile1Curation: {
                  Type: 'Wait',
                  Seconds: 5,
                  Next: 'GetRunStatus-SourceFile1Curation',
                },
                'GetRunStatus-SourceFile1Curation': {
                  Type: 'Task',
                  Parameters: {
                    Name: 'raw-source-file1-curate',
                    'RunId.$': '$.RunId',
                  },
                  Resource: 'arn:test-partition:states:::aws-sdk:glue:getWorkflowRun',
                  Next: 'CheckStatus-SourceFile1Curation',
                },
                'CheckStatus-SourceFile1Curation': {
                  Type: 'Choice',
                  Choices: [
                    {
                      Variable: '$.Run.Status',
                      StringEquals: 'RUNNING',
                      Next: 'WaitNCheckAagain-SourceFile1Curation',
                    },
                    {
                      And: [
                        {
                          Variable: '$.Run.Status',
                          StringEquals: 'COMPLETED',
                        },
                        {
                          Not: {
                            Variable: '$.Run.Statistics.TotalActions',
                            NumericEqualsPath: '$.Run.Statistics.SucceededActions',
                          },
                        },
                      ],
                      Next: 'Fail-SourceFile1Curation',
                    },
                  ],
                  Default: 'Success-SourceFile1Curation',
                },
                'Success-SourceFile1Curation': {
                  Type: 'Pass',
                  End: true,
                },
                'WaitNCheckAagain-SourceFile1Curation': {
                  Type: 'Pass',
                  Next: 'WaitForSourceFile1Curation',
                  Parameters: {
                    'RunId.$': '$.Run.WorkflowRunId',
                  },
                },
                'Fail-SourceFile1Curation': {
                  Type: 'Fail',
                  Cause: 'GlueWorkflowError - Not all jobs in workflow were successful.',
                },
              },
            },
            {
              StartAt: 'Start-Sourcefile2Curation',
              States: {
                'Start-Sourcefile2Curation': {
                  Type: 'Task',
                  Parameters: {
                    Name: 'raw-source-file2-curate',
                  },
                  Resource: 'arn:test-partition:states:::aws-sdk:glue:startWorkflowRun',
                  Next: 'WaitForSourcefile2Curation',
                },
                WaitForSourcefile2Curation: {
                  Type: 'Wait',
                  Seconds: 5,
                  Next: 'GetRunStatus-Sourcefile2sCuration',
                },
                'GetRunStatus-Sourcefile2sCuration': {
                  Type: 'Task',
                  Parameters: {
                    Name: 'raw-source-file2-curate',
                    'RunId.$': '$.RunId',
                  },
                  Resource: 'arn:test-partition:states:::aws-sdk:glue:getWorkflowRun',
                  Next: 'CheckStatus-Sourcefile2sCuration',
                },
                'CheckStatus-Sourcefile2sCuration': {
                  Type: 'Choice',
                  Choices: [
                    {
                      Variable: '$.Run.Status',
                      StringEquals: 'RUNNING',
                      Next: 'WaitNCheckAgain-Sourcefile2sCuration',
                    },
                    {
                      And: [
                        {
                          Variable: '$.Run.Status',
                          StringEquals: 'COMPLETED',
                        },
                        {
                          Not: {
                            Variable: '$.Run.Statistics.TotalActions',
                            NumericEqualsPath: '$.Run.Statistics.SucceededActions',
                          },
                        },
                      ],
                      Next: 'Fail-Sourcefile2sCuration',
                    },
                  ],
                  Default: 'Success-Sourcefile2sCuration',
                },
                'Success-Sourcefile2sCuration': {
                  Type: 'Pass',
                  End: true,
                },
                'WaitNCheckAgain-Sourcefile2sCuration': {
                  Type: 'Pass',
                  Next: 'WaitForSourcefile2Curation',
                  Parameters: {
                    'RunId.$': '$.Run.WorkflowRunId',
                  },
                },
                'Fail-Sourcefile2sCuration': {
                  Type: 'Fail',
                  Cause: 'GlueWorkflowError - Not all jobs in workflow were successful.',
                },
              },
            },
          ],
          Next: 'Parallel (1)',
        },
        'Parallel (1)': {
          Type: 'Parallel',
          End: true,
          Branches: [
            {
              StartAt: 'Load-Table1',
              States: {
                'Load-Table1': {
                  Type: 'Task',
                  Resource: 'arn:test-partition:states:::glue:startJobRun.sync',
                  Parameters: {
                    JobName: 'curated-table1-load',
                  },
                  End: true,
                },
              },
            },
            {
              StartAt: 'Load-Table2',
              States: {
                'Load-Table2': {
                  Type: 'Task',
                  Resource: 'arn:test-partition:states:::glue:startJobRun',
                  Parameters: {
                    JobName: 'curated-table2-load',
                  },
                  End: true,
                },
              },
            },
          ],
        },
        'Fail-Domain1Crawler': {
          Type: 'Fail',
          Cause: 'GlueCrawlerError - Glue Crawler Failed',
        },
      },
    },
  };

  const constructProps: StepFunctionL3ConstructProps = {
    kmsArn: 'arn:test-partition:kms:test-region:test-account:key/testing-key-id',
    stepfunctionDefinitions: [stepfunctionDefinition],
    projectName: 'test-project',

    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
  };

  new StepFunctionL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log( JSON.stringify( template, undefined, 2 ) )

  test('Validate resource counts', () => {
    template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    template.resourceCountIs('AWS::Logs::LogGroup', 1);
    template.resourceCountIs('AWS::SSM::Parameter', 5);
  });

  test('StepFunction Properties', () => {
    template.hasResourceProperties('AWS::StepFunctions::StateMachine', {
      RoleArn: 'arn:test-partition:iam::test-account:role/service-role/StepFunctions-role-4c710b67',
      DefinitionString:
        '{"Comment":"A description of my state machine","StartAt":"StartCrawler-Domain1","States":{"StartCrawler-Domain1":{"Type":"Task","Next":"WaitForDomain1Crawler","Parameters":{"Name":"raw-source-files-crawler"},"Resource":"arn:test-partition:states:::aws-sdk:glue:startCrawler"},"WaitForDomain1Crawler":{"Type":"Wait","Seconds":5,"Next":"GetCrawlerStatus-Domain1"},"GetCrawlerStatus-Domain1":{"Type":"Task","Next":"CheckStatus-Domain1Crawler","Parameters":{"Name":"raw-source-files-crawler"},"Resource":"arn:test-partition:states:::aws-sdk:glue:getCrawler"},"CheckStatus-Domain1Crawler":{"Type":"Choice","Choices":[{"Or":[{"Variable":"$.Crawler.State","StringEquals":"RUNNING"},{"Variable":"$.Crawler.State","StringEquals":"STOPPING"}],"Next":"WaitForDomain1Crawler"},{"Or":[{"Variable":"$.Crawler.State","StringEquals":"FAILED"},{"Variable":"$.Crawler.State","StringEquals":"STOPPED"}],"Next":"Fail-Domain1Crawler"}],"Default":"Parallel"},"Parallel":{"Type":"Parallel","Branches":[{"StartAt":"Start-SourceFile1Curation","States":{"Start-SourceFile1Curation":{"Type":"Task","Parameters":{"Name":"raw-source-file1-curate"},"Resource":"arn:test-partition:states:::aws-sdk:glue:startWorkflowRun","Next":"WaitForSourceFile1Curation"},"WaitForSourceFile1Curation":{"Type":"Wait","Seconds":5,"Next":"GetRunStatus-SourceFile1Curation"},"GetRunStatus-SourceFile1Curation":{"Type":"Task","Parameters":{"Name":"raw-source-file1-curate","RunId.$":"$.RunId"},"Resource":"arn:test-partition:states:::aws-sdk:glue:getWorkflowRun","Next":"CheckStatus-SourceFile1Curation"},"CheckStatus-SourceFile1Curation":{"Type":"Choice","Choices":[{"Variable":"$.Run.Status","StringEquals":"RUNNING","Next":"WaitNCheckAagain-SourceFile1Curation"},{"And":[{"Variable":"$.Run.Status","StringEquals":"COMPLETED"},{"Not":{"Variable":"$.Run.Statistics.TotalActions","NumericEqualsPath":"$.Run.Statistics.SucceededActions"}}],"Next":"Fail-SourceFile1Curation"}],"Default":"Success-SourceFile1Curation"},"Success-SourceFile1Curation":{"Type":"Pass","End":true},"WaitNCheckAagain-SourceFile1Curation":{"Type":"Pass","Next":"WaitForSourceFile1Curation","Parameters":{"RunId.$":"$.Run.WorkflowRunId"}},"Fail-SourceFile1Curation":{"Type":"Fail","Cause":"GlueWorkflowError - Not all jobs in workflow were successful."}}},{"StartAt":"Start-Sourcefile2Curation","States":{"Start-Sourcefile2Curation":{"Type":"Task","Parameters":{"Name":"raw-source-file2-curate"},"Resource":"arn:test-partition:states:::aws-sdk:glue:startWorkflowRun","Next":"WaitForSourcefile2Curation"},"WaitForSourcefile2Curation":{"Type":"Wait","Seconds":5,"Next":"GetRunStatus-Sourcefile2sCuration"},"GetRunStatus-Sourcefile2sCuration":{"Type":"Task","Parameters":{"Name":"raw-source-file2-curate","RunId.$":"$.RunId"},"Resource":"arn:test-partition:states:::aws-sdk:glue:getWorkflowRun","Next":"CheckStatus-Sourcefile2sCuration"},"CheckStatus-Sourcefile2sCuration":{"Type":"Choice","Choices":[{"Variable":"$.Run.Status","StringEquals":"RUNNING","Next":"WaitNCheckAgain-Sourcefile2sCuration"},{"And":[{"Variable":"$.Run.Status","StringEquals":"COMPLETED"},{"Not":{"Variable":"$.Run.Statistics.TotalActions","NumericEqualsPath":"$.Run.Statistics.SucceededActions"}}],"Next":"Fail-Sourcefile2sCuration"}],"Default":"Success-Sourcefile2sCuration"},"Success-Sourcefile2sCuration":{"Type":"Pass","End":true},"WaitNCheckAgain-Sourcefile2sCuration":{"Type":"Pass","Next":"WaitForSourcefile2Curation","Parameters":{"RunId.$":"$.Run.WorkflowRunId"}},"Fail-Sourcefile2sCuration":{"Type":"Fail","Cause":"GlueWorkflowError - Not all jobs in workflow were successful."}}}],"Next":"Parallel (1)"},"Parallel (1)":{"Type":"Parallel","End":true,"Branches":[{"StartAt":"Load-Table1","States":{"Load-Table1":{"Type":"Task","Resource":"arn:test-partition:states:::glue:startJobRun.sync","Parameters":{"JobName":"curated-table1-load"},"End":true}}},{"StartAt":"Load-Table2","States":{"Load-Table2":{"Type":"Task","Resource":"arn:test-partition:states:::glue:startJobRun","Parameters":{"JobName":"curated-table2-load"},"End":true}}}]},"Fail-Domain1Crawler":{"Type":"Fail","Cause":"GlueCrawlerError - Glue Crawler Failed"}}}',
      LoggingConfiguration: {
        Destinations: [
          {
            CloudWatchLogsLogGroup: {
              LogGroupArn: {
                'Fn::GetAtt': ['teststackteststatemachineloggroupFE8302AF', 'Arn'],
              },
            },
          },
        ],
        IncludeExecutionData: false,
        Level: 'ALL',
      },
      StateMachineName: 'test-org-test-env-test-domain-test-module-test-state-machine',
      StateMachineType: 'STANDARD',
      TracingConfiguration: {
        Enabled: true,
      },
    });
  });

  test('LogGroup Properties', () => {
    template.hasResourceProperties('AWS::Logs::LogGroup', {
      KmsKeyId: 'arn:test-partition:kms:test-region:test-account:key/testing-key-id',
      LogGroupName: '/aws/stepfunction/test-org-test-env-test-domain-test-module-test-state-machine',
    });
  });

  test('EventBridge Rule', () => {
    template.hasResourceProperties('AWS::Events::Rule', {
      Description: 'Event Rule for triggering test-state-machine-test-rule with S3 events',
      EventPattern: {
        source: ['aws.s3'],
        detail: {
          bucket: {
            name: ['test-bucket'],
          },
        },
        'detail-type': ['Object Created'],
      },
      Name: 'test-org-test-env-test-domain-test-module-test-rule',
      State: 'ENABLED',
      Targets: [
        {
          Arn: {
            Ref: 'stepfunctionteststatemachine3CF49CAD',
          },
          DeadLetterConfig: {
            Arn: {
              'Fn::GetAtt': ['dlqteststatemachineevents81CD89C0', 'Arn'],
            },
          },
          Id: 'Target0',
          RetryPolicy: {
            MaximumEventAgeInSeconds: 3600,
            MaximumRetryAttempts: 2,
          },
          RoleArn: {
            'Fn::GetAtt': ['stepfunctionteststatemachineEventsRole898CF4C5', 'Arn'],
          },
        },
      ],
    });
  });

  test('Queue Write Policy', () => {
    template.hasResourceProperties('AWS::SQS::QueuePolicy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          {
            Action: 'sqs:SendMessage',
            Condition: {
              ArnEquals: {
                'aws:SourceArn': {
                  'Fn::GetAtt': ['eventruletestrule38BBD9EA', 'Arn'],
                },
              },
            },
            Effect: 'Allow',
            Principal: {
              Service: 'events.amazonaws.com',
            },
            Resource: {
              'Fn::GetAtt': ['dlqteststatemachineevents81CD89C0', 'Arn'],
            },
            Sid: 'AllowEventRuletestingeventruletestruleDB4F6F0C',
          },
        ]),
      },
    });
  });

  describe('Error condition tests', () => {
    test('Should throw error when kmsArn is missing', () => {
      const testApp2 = new MdaaTestApp();
      const propsWithoutKMS: StepFunctionL3ConstructProps = {
        ...constructProps,
        kmsArn: undefined,
        roleHelper: new MdaaRoleHelper(testApp2.testStack, testApp2.naming),
        naming: testApp2.naming,
      };

      expect(() => {
        new StepFunctionL3Construct(testApp2.testStack, 'test-no-kms', propsWithoutKMS);
      }).toThrow('Project KMS ARN is required for Step Function L3 Construct');
    });

    test('Should use INFINITE retention when logGroupRetentionDays is 0', () => {
      const testApp3 = new MdaaTestApp();
      const stepfunctionWithZeroRetention: StepFunctionProps = {
        ...stepfunctionDefinition,
        logGroupRetentionDays: 0,
      };
      const propsWithZeroRetention: StepFunctionL3ConstructProps = {
        ...constructProps,
        stepfunctionDefinitions: [stepfunctionWithZeroRetention],
        roleHelper: new MdaaRoleHelper(testApp3.testStack, testApp3.naming),
        naming: testApp3.naming,
      };

      new StepFunctionL3Construct(testApp3.testStack, 'test-zero-retention', propsWithZeroRetention);
      const template = Template.fromStack(testApp3.testStack);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: Match.absent(),
      });
    });

    test('Should use TWO_YEARS retention when logGroupRetentionDays is undefined', () => {
      const testApp4 = new MdaaTestApp();
      const stepfunctionWithUndefinedRetention: StepFunctionProps = {
        ...stepfunctionDefinition,
        logGroupRetentionDays: undefined,
      };
      const propsWithUndefinedRetention: StepFunctionL3ConstructProps = {
        ...constructProps,
        stepfunctionDefinitions: [stepfunctionWithUndefinedRetention],
        roleHelper: new MdaaRoleHelper(testApp4.testStack, testApp4.naming),
        naming: testApp4.naming,
      };

      new StepFunctionL3Construct(testApp4.testStack, 'test-undefined-retention', propsWithUndefinedRetention);
      const template = Template.fromStack(testApp4.testStack);

      template.hasResourceProperties('AWS::Logs::LogGroup', {
        RetentionInDays: 731,
      });
    });

    test('Should use maxEventAgeSeconds when provided', () => {
      const testApp5 = new MdaaTestApp();
      const stepfunctionWithMaxEventAge: StepFunctionProps = {
        ...stepfunctionDefinition,
        eventBridge: {
          ...stepfunctionDefinition.eventBridge,
          maxEventAgeSeconds: 7200,
        },
      };
      const propsWithMaxEventAge: StepFunctionL3ConstructProps = {
        ...constructProps,
        stepfunctionDefinitions: [stepfunctionWithMaxEventAge],
        roleHelper: new MdaaRoleHelper(testApp5.testStack, testApp5.naming),
        naming: testApp5.naming,
      };

      new StepFunctionL3Construct(testApp5.testStack, 'test-max-event-age', propsWithMaxEventAge);
      const template = Template.fromStack(testApp5.testStack);

      template.hasResourceProperties('AWS::Events::Rule', {
        Targets: Match.arrayWith([
          Match.objectLike({
            DeadLetterConfig: Match.anyValue(),
            RetryPolicy: Match.objectLike({
              MaximumEventAgeInSeconds: 7200,
            }),
          }),
        ]),
      });
    });
  });
});

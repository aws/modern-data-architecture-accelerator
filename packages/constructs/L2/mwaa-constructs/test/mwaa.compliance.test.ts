/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { MWAA_LOG_COMPONENTS, MdaaMwaaEnvironment, MdaaMwaaEnvironmentProps } from '../lib';

describe('MDAA MWAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const kmsKey = new Key(testApp.testStack, 'test-key', {
    enableKeyRotation: true,
  });

  const testConstructProps: MdaaMwaaEnvironmentProps = {
    naming: testApp.naming,
    environmentName: 'test-env',
    airflowVersion: '2.10.3',
    environmentClass: 'mw1.small',
    kmsKey: kmsKey,
    sourceBucketArn: 'arn:test-partition:s3:::test-dags-bucket',
    dagS3Path: 'dags',
    executionRoleArn: 'arn:test-partition:iam::test-account:role/test-execution-role',
    networkConfiguration: {
      subnetIds: ['subnet-1a2b3c4d', 'subnet-5e6f7g8h'],
      securityGroupIds: ['sg-0abc1234def56789a'],
    },
    createOutputs: false,
    createParams: false,
  };

  new MdaaMwaaEnvironment(testApp.testStack, 'test-construct', testConstructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('EnvironmentName', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      Name: testApp.naming.resourceName('test-env'),
    });
  });

  test('KmsKey is set', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      KmsKey: Match.objectLike({
        'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('testkey.*'), 'Arn']),
      }),
    });
  });

  test('ExecutionRoleArn is set', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      ExecutionRoleArn: 'arn:test-partition:iam::test-account:role/test-execution-role',
    });
  });

  test('SourceBucketArn is set', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      SourceBucketArn: 'arn:test-partition:s3:::test-dags-bucket',
    });
  });

  test('WebserverAccessMode defaults to PRIVATE_ONLY', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      WebserverAccessMode: 'PRIVATE_ONLY',
    });
  });

  test('All logging components enabled', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      LoggingConfiguration: {
        SchedulerLogs: { Enabled: true, LogLevel: 'INFO' },
        WorkerLogs: { Enabled: true, LogLevel: 'INFO' },
        WebserverLogs: { Enabled: true, LogLevel: 'INFO' },
        DagProcessingLogs: { Enabled: true, LogLevel: 'INFO' },
        TaskLogs: { Enabled: true, LogLevel: 'INFO' },
      },
    });
  });

  test('Pre-creates a CloudWatch log group per Airflow component', () => {
    // One log group for each of the five components MWAA logs to.
    template.resourceCountIs('AWS::Logs::LogGroup', 5);
  });

  test('MWAA_LOG_COMPONENTS matches the component names MWAA generates', () => {
    // Pins the constant against MWAA's documented log group suffixes:
    // https://docs.aws.amazon.com/mwaa/latest/userguide/monitoring-airflow.html
    // ("Viewing Airflow logs in Amazon CloudWatch").
    //
    // Retention control depends on these names matching what MWAA derives: if a
    // name drifts, the pre-created group is not the one MWAA uses and MWAA's own
    // group keeps its never-expire default. (Encryption is unaffected — MWAA
    // CMK-encrypts its log groups via the kmsKey grants regardless.)
    //
    // This assertion is deliberately a literal, not derived from the constant, so
    // that editing the constant alone fails here and forces a re-check against the
    // AWS documentation.
    expect([...MWAA_LOG_COMPONENTS]).toEqual(['DAGProcessing', 'Scheduler', 'Task', 'WebServer', 'Worker']);
  });

  test('Log groups are named to match MWAA service-managed log groups', () => {
    for (const component of MWAA_LOG_COMPONENTS) {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: `airflow-${testApp.naming.resourceName('test-env')}-${component}`,
      });
    }
  });

  test('Log groups default to two-year retention', () => {
    for (const component of MWAA_LOG_COMPONENTS) {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: `airflow-${testApp.naming.resourceName('test-env')}-${component}`,
        RetentionInDays: 731,
      });
    }
  });

  test('Log groups are KMS-encrypted with the environment key', () => {
    // Asserted per component: a single hasResourceProperties call would pass if
    // only one of the five groups carried the key, hiding an unencrypted group.
    for (const component of MWAA_LOG_COMPONENTS) {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: `airflow-${testApp.naming.resourceName('test-env')}-${component}`,
        KmsKeyId: Match.objectLike({
          'Fn::GetAtt': Match.arrayWith([Match.stringLikeRegexp('testkey.*'), 'Arn']),
        }),
      });
    }
  });

  test('Environment depends on all five pre-created log groups', () => {
    // The groups must exist before MWAA initializes, otherwise MWAA creates its
    // own at the same names and the configured retention is never applied.
    const logGroups = template.findResources('AWS::Logs::LogGroup');
    const logGroupIds = Object.keys(logGroups);
    expect(logGroupIds).toHaveLength(5);
    template.hasResource('AWS::MWAA::Environment', {
      DependsOn: Match.arrayWith(logGroupIds),
    });
  });

  test('Log groups are retained on stack deletion', () => {
    for (const component of MWAA_LOG_COMPONENTS) {
      template.hasResource('AWS::Logs::LogGroup', {
        Properties: {
          LogGroupName: `airflow-${testApp.naming.resourceName('test-env')}-${component}`,
        },
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    }
  });

  test('EnvironmentClass', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      EnvironmentClass: 'mw1.small',
    });
  });

  test('AirflowVersion', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      AirflowVersion: '2.10.3',
    });
  });

  test('NetworkConfiguration', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      NetworkConfiguration: {
        SubnetIds: ['subnet-1a2b3c4d', 'subnet-5e6f7g8h'],
        SecurityGroupIds: ['sg-0abc1234def56789a'],
      },
    });
  });

  test('DagS3Path', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      DagS3Path: 'dags',
    });
  });

  test('MinWorkers default', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      MinWorkers: 1,
    });
  });

  test('MaxWorkers default', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      MaxWorkers: 10,
    });
  });

  test('DeletionPolicy is Retain', () => {
    template.hasResource('AWS::MWAA::Environment', {
      DeletionPolicy: 'Retain',
    });
  });

  test('UpdateReplacePolicy is Retain', () => {
    template.hasResource('AWS::MWAA::Environment', {
      UpdateReplacePolicy: 'Retain',
    });
  });
});

describe('MDAA MWAA Construct with all optional properties', () => {
  const testApp = new MdaaTestApp();

  const kmsKey = new Key(testApp.testStack, 'test-key', {
    enableKeyRotation: true,
  });

  const testConstructProps: MdaaMwaaEnvironmentProps = {
    naming: testApp.naming,
    environmentName: 'full-env',
    airflowVersion: '2.10.3',
    environmentClass: 'mw1.large',
    kmsKey: kmsKey,
    sourceBucketArn: 'arn:test-partition:s3:::test-dags-bucket',
    dagS3Path: 'custom-dags',
    pluginsS3Path: 'plugins/plugins.zip',
    requirementsS3Path: 'requirements/requirements.txt',
    startupScriptS3Path: 'scripts/startup.sh',
    executionRoleArn: 'arn:test-partition:iam::test-account:role/test-execution-role',
    networkConfiguration: {
      subnetIds: ['subnet-1a2b3c4d', 'subnet-5e6f7g8h'],
      securityGroupIds: ['sg-0abc1234def56789a'],
    },
    webserverAccessMode: 'PUBLIC_ONLY',
    minWorkers: 3,
    maxWorkers: 20,
    minWebservers: 2,
    maxWebservers: 5,
    schedulers: 3,
    loggingConfiguration: {
      schedulerLogLevel: 'WARNING',
      workerLogLevel: 'ERROR',
      webserverLogLevel: 'CRITICAL',
      dagProcessingLogLevel: 'DEBUG',
      taskLogLevel: 'WARNING',
    },
    airflowConfigurationOptions: {
      'core.default_timezone': 'utc',
      'celery.worker_autoscale': '5,1',
    },
    weeklyMaintenanceWindowStart: 'SUN:03:00',
    logRetention: RetentionDays.THREE_MONTHS,
    createOutputs: false,
    createParams: false,
  };

  new MdaaMwaaEnvironment(testApp.testStack, 'test-construct', testConstructProps);
  // Validate Nag against this alternate posture too (PUBLIC_ONLY webserver access,
  // custom logging/scaling) — not just the default PRIVATE_ONLY configuration.
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Custom environmentClass', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      EnvironmentClass: 'mw1.large',
    });
  });

  test('Custom dagS3Path', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      DagS3Path: 'custom-dags',
    });
  });

  test('PluginsS3Path', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      PluginsS3Path: 'plugins/plugins.zip',
    });
  });

  test('RequirementsS3Path', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      RequirementsS3Path: 'requirements/requirements.txt',
    });
  });

  test('StartupScriptS3Path', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      StartupScriptS3Path: 'scripts/startup.sh',
    });
  });

  test('Custom scaling', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      MinWorkers: 3,
      MaxWorkers: 20,
      MinWebservers: 2,
      MaxWebservers: 5,
      Schedulers: 3,
    });
  });

  test('Custom log levels', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      LoggingConfiguration: {
        SchedulerLogs: { Enabled: true, LogLevel: 'WARNING' },
        WorkerLogs: { Enabled: true, LogLevel: 'ERROR' },
        WebserverLogs: { Enabled: true, LogLevel: 'CRITICAL' },
        DagProcessingLogs: { Enabled: true, LogLevel: 'DEBUG' },
        TaskLogs: { Enabled: true, LogLevel: 'WARNING' },
      },
    });
  });

  test('PUBLIC_ONLY webserverAccessMode', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      WebserverAccessMode: 'PUBLIC_ONLY',
    });
  });

  test('AirflowConfigurationOptions', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      AirflowConfigurationOptions: {
        'core.default_timezone': 'utc',
        'celery.worker_autoscale': '5,1',
      },
    });
  });

  test('WeeklyMaintenanceWindowStart', () => {
    template.hasResourceProperties('AWS::MWAA::Environment', {
      WeeklyMaintenanceWindowStart: 'SUN:03:00',
    });
  });

  test('Custom log retention applied to all component log groups', () => {
    for (const component of MWAA_LOG_COMPONENTS) {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: `airflow-${testApp.naming.resourceName('full-env')}-${component}`,
        RetentionInDays: 90,
      });
    }
  });
});

describe('MDAA MWAA Construct with infinite log retention', () => {
  const testApp = new MdaaTestApp();

  const kmsKey = new Key(testApp.testStack, 'test-key', {
    enableKeyRotation: true,
  });

  new MdaaMwaaEnvironment(testApp.testStack, 'test-construct', {
    naming: testApp.naming,
    environmentName: 'infinite-env',
    kmsKey: kmsKey,
    sourceBucketArn: 'arn:test-partition:s3:::test-dags-bucket',
    executionRoleArn: 'arn:test-partition:iam::test-account:role/test-execution-role',
    networkConfiguration: {
      subnetIds: ['subnet-1a2b3c4d', 'subnet-5e6f7g8h'],
      securityGroupIds: ['sg-0abc1234def56789a'],
    },
    logRetention: RetentionDays.INFINITE,
    createOutputs: false,
    createParams: false,
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Log groups have no RetentionInDays when retention is infinite', () => {
    for (const component of MWAA_LOG_COMPONENTS) {
      template.hasResourceProperties('AWS::Logs::LogGroup', {
        LogGroupName: `airflow-${testApp.naming.resourceName('infinite-env')}-${component}`,
        RetentionInDays: Match.absent(),
      });
    }
  });
});

describe('MDAA MWAA Construct with SSM params and outputs', () => {
  const testApp = new MdaaTestApp();

  const kmsKey = new Key(testApp.testStack, 'test-key', {
    enableKeyRotation: true,
  });

  new MdaaMwaaEnvironment(testApp.testStack, 'test-construct', {
    naming: testApp.naming,
    environmentName: 'ssm-env',
    kmsKey: kmsKey,
    sourceBucketArn: 'arn:test-partition:s3:::test-dags-bucket',
    executionRoleArn: 'arn:test-partition:iam::test-account:role/test-execution-role',
    networkConfiguration: {
      subnetIds: ['subnet-1a2b3c4d', 'subnet-5e6f7g8h'],
      securityGroupIds: ['sg-0abc1234def56789a'],
    },
    createParams: true,
    createOutputs: true,
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Creates SSM parameter for environment ARN', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: Match.stringLikeRegexp('.*mwaa/ssm-env/arn'),
    });
  });

  test('Creates SSM parameter for webserver URL', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: Match.stringLikeRegexp('.*mwaa/ssm-env/webserver-url'),
    });
  });
});

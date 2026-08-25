/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Protocol } from 'aws-cdk-lib/aws-ec2';
import {
  FunctionProps,
  LambdaFunctionL3Construct,
  LambdaFunctionL3ConstructProps,
  LayerProps,
  NamedSqsQueueProps,
} from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const layerProps: LayerProps = {
    layerName: 'test-layer',
    src: './test/src/lambda/test',
    description: 'layer testing',
  };

  const functionProps: FunctionProps = {
    functionName: 'test-function',
    srcDir: './test/src/lambda/test',
    handler: 'test_handler',
    roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
    runtime: 'python3.14',
  };

  const dockerImageFunctionProps: FunctionProps = {
    functionName: 'docker-test-function',
    srcDir: './test/src/lambda/docker',
    roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
    dockerBuild: true,
  };

  const functionVpcProps: FunctionProps = {
    ...functionProps,
    functionName: 'test-vpc-function',
    vpcConfig: {
      vpcId: 'test-vpc',
      subnetIds: ['test-subnet'],
      securityGroupEgressRules: {
        ipv4: [
          {
            cidr: '10.10.10.10/32',
            protocol: Protocol.TCP,
            port: 443,
          },
        ],
      },
    },
  };

  const functionVpcExistingSgProps: FunctionProps = {
    ...functionProps,
    functionName: 'test-vpc-existing-sgfunction',
    vpcConfig: {
      vpcId: 'test-vpc',
      subnetIds: ['test-subnet'],
      securityGroupId: 'test-existing-sg',
    },
  };

  const functionEventBridgeProps: FunctionProps = {
    ...functionProps,
    functionName: 'test-eventbridge-function',
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
  };

  const functionWithLayer: FunctionProps = {
    ...functionProps,
    functionName: 'test-layer-function',
    generatedLayerNames: ['test-layer'],
    layerArns: { 'some-existing-layer-name': 'some-existing-layer-arn' },
  };

  const functionWithGrantInvoke: FunctionProps = {
    ...functionProps,
    functionName: 'test-grant-invoke-function',
    grantInvoke: 'arn:test-partition:iam::test-acct:role/test-invoker-role',
  };

  const functionWithAdditionalPermissions: FunctionProps = {
    ...functionProps,
    functionName: 'test-additional-permissions-function',
    additionalResourcePermissions: {
      AllowS3Invoke: {
        principal: 'arn:test-partition:iam::test-acct:service/s3.amazonaws.com',
        action: 'lambda:InvokeFunction',
        sourceArn: 'arn:test-partition:s3:::test-bucket',
        sourceAccount: 'test-acct',
      },
    },
  };

  const functionWithMetricFilters: FunctionProps = {
    ...functionProps,
    functionName: 'test-metric-filters-function',
    metricFilters: [
      {
        filterName: 'ErrorCount',
        filterPattern: '[time, request_id, level = ERROR*, ...]',
        metricTransformations: [
          {
            metricName: 'ErrorCount',
            metricNamespace: 'CustomMetrics',
            metricValue: '1',
            unit: 'Count',
            defaultValue: 0,
          },
        ],
      },
    ],
  };

  const functionWithAlarms: FunctionProps = {
    ...functionProps,
    functionName: 'test-alarms-function',
    metricFilters: [
      {
        filterName: 'ErrorCount',
        filterPattern: '[time, request_id, level = ERROR*, ...]',
        metricTransformations: [
          {
            metricName: 'ErrorCount',
            metricNamespace: 'CustomMetrics',
            metricValue: '1',
            unit: 'Count',
          },
        ],
      },
    ],
    alarms: [
      {
        alarmName: 'HighErrorRate',
        metricName: 'ErrorCount',
        namespace: 'CustomMetrics',
        statistic: 'Sum',
        period: 300,
        evaluationPeriods: 1,
        threshold: 5,
        comparisonOperator: 'GreaterThanOrEqualToThreshold',
      },
    ],
  };

  const functionWithLogInsightsQueries: FunctionProps = {
    ...functionProps,
    functionName: 'test-log-insights-function',
    logInsightsQueries: [
      {
        queryName: 'ErrorAnalysis',
        queryString: 'fields @timestamp, @message | filter @message like /ERROR/ | sort @timestamp desc',
      },
      {
        queryName: 'PerformanceAnalysis',
        queryString: 'fields @timestamp, @duration | stats avg(@duration), max(@duration)',
        logGroupNames: ['/aws/lambda/custom-log-group'],
      },
    ],
  };

  const functionWithDimensionPlaceholders: FunctionProps = {
    ...functionProps,
    functionName: 'test-dimension-placeholder-function',
    metricFilters: [
      {
        filterName: 'ErrorCount',
        filterPattern: '[time, request_id, level = ERROR*, ...]',
        metricTransformations: [
          {
            metricName: 'ErrorCount',
            metricNamespace: 'CustomMetrics',
            metricValue: '1',
            unit: 'Count',
          },
        ],
      },
    ],
    alarms: [
      {
        alarmName: 'HighErrorRateWithPlaceholder',
        metricName: 'ErrorCount',
        namespace: 'CustomMetrics',
        statistic: 'Sum',
        period: 300,
        evaluationPeriods: 1,
        threshold: 5,
        comparisonOperator: 'GreaterThanOrEqualToThreshold',
        dimensions: {
          FunctionName: '{{functionName}}',
          Environment: 'test',
        },
      },
    ],
  };

  const queues: NamedSqsQueueProps = {
    'test-queue': {
      visibilityTimeoutSeconds: 1800,
      receiveMessageWaitTimeSeconds: 20,
      retentionPeriodSeconds: 345600,
      deliveryDelaySeconds: 5,
      maxMessageSizeBytes: 262144,
      dlq: {
        maxReceiveCount: 3,
      },
    },
    // Declares no dlq block, so the default maxReceiveCount applies
    'test-default-dlq-queue': {},
    'test-fifo-queue': {
      fifo: true,
      contentBasedDeduplication: true,
      visibilityTimeoutSeconds: 300,
    },
  };

  const functionWithQueueUrl: FunctionProps = {
    ...functionProps,
    functionName: 'test-queue-producer',
    environment: { EXISTING_VAR: 'existing-value' },
    queueUrlEnvironment: {
      TARGET_QUEUE_URL: 'test-queue',
    },
  };

  const functionWithSqsEventSources: FunctionProps = {
    ...functionProps,
    functionName: 'test-queue-consumer',
    timeoutSeconds: 300,
    sqsEventSources: {
      'test-queue': {
        batchSize: 10,
        maxBatchingWindowSeconds: 5,
        reportBatchItemFailures: true,
        maxConcurrency: 20,
        filterCriteria: [{ body: { eventType: ['order-created'] } }],
      },
      'test-fifo-queue': {
        batchSize: 1,
        enabled: false,
      },
    },
  };

  const constructProps: LambdaFunctionL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
    queues,
    functions: [
      functionProps,
      functionVpcProps,
      functionVpcExistingSgProps,
      functionEventBridgeProps,
      functionWithLayer,
      dockerImageFunctionProps,
      functionWithGrantInvoke,
      functionWithAdditionalPermissions,
      functionWithMetricFilters,
      functionWithAlarms,
      functionWithLogInsightsQueries,
      functionWithDimensionPlaceholders,
      functionWithQueueUrl,
      functionWithSqsEventSources,
    ],
    layers: [layerProps],
  };

  new LambdaFunctionL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log( JSON.stringify( template, undefined, 2 ) )

  test('Validate function counts', () => {
    template.resourceCountIs('AWS::Lambda::Function', 14);
  });

  test('Validate layer counts', () => {
    template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
  });

  describe('Base Function', () => {
    test('FunctionRole', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Role: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
      });
    });

    test('DLQ', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        DeadLetterConfig: {
          TargetArn: {
            'Fn::GetAtt': ['dlqtestfunction1ED144DD', 'Arn'],
          },
        },
      });
    });
    test('FunctionName', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'test-org-test-env-test-domain-test-module-test-function',
      });
    });
    test('Environment Var KmsKey', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        KmsKeyArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      });
    });
  });

  describe('VPC Function', () => {
    test('VPC Config', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        VpcConfig: {
          SecurityGroupIds: [
            {
              'Fn::GetAtt': ['teststackec2testvpcfunctionsgDABAD2E6', 'GroupId'],
            },
          ],
          SubnetIds: ['test-subnet'],
        },
      });
    });
    test('VPC Config Existing SG', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        VpcConfig: {
          SecurityGroupIds: ['test-existing-sg'],
          SubnetIds: ['test-subnet'],
        },
      });
    });
    test('Security Group No Allow All', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'testing/teststack/ec2/test-vpc-function-sg',
        GroupName: 'test-org-test-env-test-domain-test-module-test-vpc-function-sg',
        SecurityGroupEgress: [
          {
            CidrIp: '255.255.255.255/32',
            Description: 'Disallow all traffic',
            FromPort: 252,
            IpProtocol: 'icmp',
            ToPort: 86,
          },
        ],
        VpcId: 'test-vpc',
      });
    });
    test('Security Custom Egress', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
        GroupId: {
          'Fn::GetAtt': ['teststackec2testvpcfunctionsgDABAD2E6', 'GroupId'],
        },
        IpProtocol: 'tcp',
        CidrIp: '10.10.10.10/32',
        Description: 'to 10.10.10.10/32:tcp PORT 443',
        FromPort: 443,
        ToPort: 443,
      });
    });
  });
  describe('Event Bridge Function', () => {
    test('Event Bridge Rule', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Description: 'Event Rule for triggering test-eventbridge-function-test-rule with S3 events',
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
              'Fn::GetAtt': ['testeventbridgefunctionC7CEF002', 'Arn'],
            },
            DeadLetterConfig: {
              Arn: {
                'Fn::GetAtt': ['dlqtesteventbridgefunctionevents71A39610', 'Arn'],
              },
            },
            Id: 'Target0',
            RetryPolicy: {
              MaximumEventAgeInSeconds: 3600,
              MaximumRetryAttempts: 2,
            },
          },
        ],
      });
    });
  });
  describe('Layer and Function', () => {
    test('Layer', () => {
      template.hasResourceProperties('AWS::Lambda::LayerVersion', {
        Content: {
          S3Bucket: 'cdk-hnb659fds-assets-test-account-test-region',
          S3Key: Match.stringLikeRegexp('.*.zip$'), //gitleaks:allow
        },
        Description: 'layer testing',
        LayerName: 'test-org-test-env-test-domain-test-module-test-layer',
      });
    });
    test('Layer Function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'test-org-test-env-test-domain-test-module-test-layer-function',
        Layers: [
          {
            Ref: 'layertestlayer3444C77B',
          },
          'some-existing-layer-arn',
        ],
      });
    });
  });

  describe('Grant Invoke Function', () => {
    test('Function has grant invoke permission', () => {
      template.hasResourceProperties('AWS::Lambda::Permission', {
        Action: 'lambda:InvokeFunction',
        FunctionName: {
          'Fn::GetAtt': [Match.stringLikeRegexp('testgrantinvokefunction.*'), 'Arn'],
        },
        Principal: 'arn:test-partition:iam::test-acct:role/test-invoker-role',
      });
    });
  });

  describe('Additional Permissions Function', () => {
    test('Function has additional resource permissions', () => {
      template.hasResourceProperties('AWS::Lambda::Permission', {
        Action: 'lambda:InvokeFunction',
        FunctionName: {
          'Fn::GetAtt': [Match.stringLikeRegexp('testadditionalpermissionsfunction.*'), 'Arn'],
        },
        Principal: 'arn:test-partition:iam::test-acct:service/s3.amazonaws.com',
        SourceAccount: 'test-acct',
        SourceArn: 'arn:test-partition:s3:::test-bucket',
      });
    });
  });

  describe('Metric Filters Function', () => {
    test('Function has metric filter', () => {
      template.hasResourceProperties('AWS::Logs::MetricFilter', {
        FilterName: 'ErrorCount',
        FilterPattern: '[time, request_id, level = ERROR*, ...]',
        MetricTransformations: [
          {
            DefaultValue: 0,
            MetricName: 'ErrorCount',
            MetricNamespace: 'CustomMetrics',
            MetricValue: '1',
            Unit: 'Count',
          },
        ],
      });
    });

    test('Metric filter SSM parameter created', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('.*/metrics/test-metric-filters-function/errorcount/.*'),
        Type: 'String',
      });
    });
  });

  describe('Alarms Function', () => {
    test('Function has alarm', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'HighErrorRate',
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        EvaluationPeriods: 1,
        MetricName: 'ErrorCount',
        Namespace: 'CustomMetrics',
        Period: 300,
        Statistic: 'Sum',
        Threshold: 5,
      });
    });

    test('Alarm SSM parameter created', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('.*/alarm/test-alarms-function/higherrorrate/.*'),
        Type: 'String',
      });
    });
  });

  describe('Log Insights Queries Function', () => {
    test('Log insights query SSM parameters created', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('.*/insights-query/test-log-insights-function/erroranalysis/.*'),
        Type: 'String',
      });

      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('.*/insights-query/test-log-insights-function/performanceanalysis/.*'),
        Type: 'String',
      });
    });
  });

  describe('SQS Queues', () => {
    test('Queue created with generated name, project key, and configured properties', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test-org-test-env-test-domain-test-module-test-queue',
        KmsMasterKeyId: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
        VisibilityTimeout: 1800,
        ReceiveMessageWaitTimeSeconds: 20,
        MessageRetentionPeriod: 345600,
        DelaySeconds: 5,
        MaximumMessageSize: 262144,
        RedrivePolicy: {
          deadLetterTargetArn: {
            'Fn::GetAtt': [Match.stringLikeRegexp('queuedlqtestqueue.*'), 'Arn'],
          },
          maxReceiveCount: 3,
        },
      });
    });

    test('Queue denies non-SSL access', () => {
      template.hasResourceProperties('AWS::SQS::QueuePolicy', {
        Queues: [{ Ref: Match.stringLikeRegexp('queuetestqueue.*') }],
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'EnforceSSL',
              Effect: 'Deny',
              Action: 'sqs:*',
              Condition: { Bool: { 'aws:SecureTransport': 'false' } },
            }),
          ]),
        },
      });
    });

    test('Queue without a dlq block still gets a DLQ with the default maxReceiveCount', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test-org-test-env-test-domain-test-module-test-default-dlq-queue',
        RedrivePolicy: {
          deadLetterTargetArn: {
            'Fn::GetAtt': [Match.stringLikeRegexp('queuedlqtestdefaultdlqqueue.*'), 'Arn'],
          },
          maxReceiveCount: 5,
        },
      });
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test-org-test-env-test-domain-test-module-test-default-dlq-queue-dlq',
      });
    });

    test('FIFO queue and its DLQ both carry the .fifo suffix', () => {
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test-org-test-env-test-domain-test-module-test-fifo-queue.fifo',
        FifoQueue: true,
        ContentBasedDeduplication: true,
      });
      template.hasResourceProperties('AWS::SQS::Queue', {
        QueueName: 'test-org-test-env-test-domain-test-module-test-fifo-queue-dlq.fifo',
        FifoQueue: true,
      });
    });

    test('Queue name, arn, and url published as SSM parameters', () => {
      for (const paramName of ['name', 'arn', 'url']) {
        template.hasResourceProperties('AWS::SSM::Parameter', {
          Name: `/test-org/test-domain/test-module/queue/test-queue/${paramName}`,
        });
      }
    });
  });

  describe('SQS Event Source Function', () => {
    test('Event source mapping reflects the configured batching and concurrency', () => {
      template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
        EventSourceArn: {
          'Fn::GetAtt': [Match.stringLikeRegexp('queuetestqueue.*'), 'Arn'],
        },
        FunctionName: {
          Ref: Match.stringLikeRegexp('testqueueconsumer.*'),
        },
        BatchSize: 10,
        MaximumBatchingWindowInSeconds: 5,
        ScalingConfig: {
          MaximumConcurrency: 20,
        },
        FunctionResponseTypes: ['ReportBatchItemFailures'],
        FilterCriteria: {
          Filters: [{ Pattern: '{"body":{"eventType":["order-created"]}}' }],
        },
      });
    });

    test('Event source mapping can be deployed disabled', () => {
      template.hasResourceProperties('AWS::Lambda::EventSourceMapping', {
        EventSourceArn: {
          'Fn::GetAtt': [Match.stringLikeRegexp('queuetestfifoqueue.*'), 'Arn'],
        },
        BatchSize: 1,
        Enabled: false,
      });
    });

    test('Consume permissions granted on the queue resource policy', () => {
      template.hasResourceProperties('AWS::SQS::QueuePolicy', {
        Queues: [{ Ref: Match.stringLikeRegexp('queuetestqueue.*') }],
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'ConsumeMessages',
              Effect: 'Allow',
              Action: ['sqs:ReceiveMessage', 'sqs:DeleteMessage', 'sqs:GetQueueAttributes'],
              Principal: { AWS: 'arn:test-partition:iam::test-acct:role/test-lambda-role' },
            }),
          ]),
        },
      });
    });

    test('No identity-based policy is attached to any execution role', () => {
      // The module removes the inline policy CDK adds to each execution role, so that the
      // IAMNoInlinePolicy rules are not tripped. The SQS grants must not reintroduce one.
      template.resourceCountIs('AWS::IAM::Policy', 0);
      template.resourceCountIs('AWS::IAM::ManagedPolicy', 0);
    });
  });

  describe('Queue URL Environment Function', () => {
    test('Queue URL injected alongside the configured environment variables', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'test-org-test-env-test-domain-test-module-test-queue-producer',
        Environment: {
          Variables: Match.objectLike({
            EXISTING_VAR: 'existing-value',
            TARGET_QUEUE_URL: { Ref: Match.stringLikeRegexp('queuetestqueue.*') },
          }),
        },
      });
    });

    test('Send permissions granted on the queue resource policy', () => {
      // Injecting a queue URL makes the function a producer, so it needs sqs:SendMessage in order
      // to use that URL. KMS needs no grant - the project key policy already permits same-account
      // principals to encrypt through SQS.
      template.hasResourceProperties('AWS::SQS::QueuePolicy', {
        Queues: [{ Ref: Match.stringLikeRegexp('queuetestqueue.*') }],
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'SendMessages',
              Effect: 'Allow',
              Action: 'sqs:SendMessage',
              Principal: { AWS: 'arn:test-partition:iam::test-acct:role/test-lambda-role' },
            }),
          ]),
        },
      });
    });
  });

  describe('Dimension Placeholder Function', () => {
    test('Alarm with dimension placeholder replacement', () => {
      template.hasResourceProperties('AWS::CloudWatch::Alarm', {
        AlarmName: 'HighErrorRateWithPlaceholder',
        ComparisonOperator: 'GreaterThanOrEqualToThreshold',
        EvaluationPeriods: 1,
        MetricName: 'ErrorCount',
        Namespace: 'CustomMetrics',
        Period: 300,
        Statistic: 'Sum',
        Threshold: 5,
        Dimensions: Match.arrayWith([
          {
            Name: 'Environment',
            Value: 'test',
          },
          {
            Name: 'FunctionName',
            Value: Match.objectLike({
              Ref: Match.stringLikeRegexp('testdimensionplaceholderfunction.*'),
            }),
          },
        ]),
      });
    });
  });
});
describe('Bad function config', () => {
  const layerProps: LayerProps = {
    layerName: 'test-layer',
    src: './test/src/lambda/test-layer.zip',
    description: 'layer testing',
  };

  const functionNoRuntimeProps: FunctionProps = {
    functionName: 'test-function-no-runtime',
    srcDir: './test/src/lambda/test',
    roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
    handler: 'test',
  };

  const functionNoHandlerProps: FunctionProps = {
    functionName: 'test-function-no-handler',
    srcDir: './test/src/lambda/test',
    roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
    runtime: 'test',
  };

  const functionWithBadLayer: FunctionProps = {
    ...functionNoRuntimeProps,
    functionName: 'test-bad-layer-function',
    generatedLayerNames: ['no-test-layer'],
    runtime: 'test',
  };

  test('No Runtime', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      functions: [functionNoRuntimeProps],
      layers: [layerProps],
    };

    expect(() => {
      new LambdaFunctionL3Construct(stack, 'test-no-runtime', constructProps);
      testApp.checkCdkNagCompliance(testApp.testStack);
      Template.fromStack(testApp.testStack);
    }).toThrow();
  });
  test('No Handler', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      functions: [functionNoHandlerProps],
      layers: [layerProps],
    };

    expect(() => {
      new LambdaFunctionL3Construct(stack, 'test-no-handler', constructProps);
      testApp.checkCdkNagCompliance(testApp.testStack);
      Template.fromStack(testApp.testStack);
    }).toThrow();
  });
  test('Bad Layer', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      functions: [functionWithBadLayer],
      layers: [layerProps],
    };

    expect(() => {
      new LambdaFunctionL3Construct(stack, 'test-bad-layer', constructProps);
      testApp.checkCdkNagCompliance(testApp.testStack);
      Template.fromStack(testApp.testStack);
    }).toThrow();
  });

  test('Should throw error when kmsArn is missing', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const testFunctionProps: FunctionProps = {
      functionName: 'test-function',
      srcDir: './test/src/lambda/test',
      handler: 'test_handler',
      roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
      runtime: 'python3.14',
    };
    const constructProps: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      kmsArn: undefined,
      functions: [testFunctionProps],
    };

    expect(() => {
      new LambdaFunctionL3Construct(stack, 'test-no-kms', constructProps);
    }).toThrow('Project kms key must be defined');
  });

  const buildConstruct = (id: string, constructProps: Partial<LambdaFunctionL3ConstructProps>) => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new LambdaFunctionL3Construct(stack, id, {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      ...constructProps,
    });
  };

  const consumerFunctionProps: FunctionProps = {
    functionName: 'test-consumer-function',
    srcDir: './test/src/lambda/test',
    handler: 'test_handler',
    roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
    runtime: 'python3.14',
  };

  test('Should throw error when an event source references an undeclared queue', () => {
    expect(() => {
      buildConstruct('test-unknown-event-source-queue', {
        queues: { 'declared-queue': {} },
        functions: [{ ...consumerFunctionProps, sqsEventSources: { 'undeclared-queue': {} } }],
      });
    }).toThrow(
      'Function "test-consumer-function" references undefined queue "undeclared-queue". ' +
        'Available queues: declared-queue',
    );
  });

  test('Should throw error when a queue URL environment variable references an undeclared queue', () => {
    expect(() => {
      buildConstruct('test-unknown-url-queue', {
        functions: [{ ...consumerFunctionProps, queueUrlEnvironment: { QUEUE_URL: 'undeclared-queue' } }],
      });
    }).toThrow(
      'Function "test-consumer-function" references undefined queue "undeclared-queue". Available queues: none',
    );
  });

  test('Should throw error when queue visibility timeout is less than the function timeout', () => {
    expect(() => {
      buildConstruct('test-visibility-timeout', {
        queues: { 'slow-consumer-queue': { visibilityTimeoutSeconds: 120 } },
        functions: [
          {
            ...consumerFunctionProps,
            timeoutSeconds: 300,
            sqsEventSources: { 'slow-consumer-queue': {} },
          },
        ],
      });
    }).toThrow(
      /Queue "slow-consumer-queue" has a visibility timeout of 120 seconds, which is less than the 300 seconds timeout of consuming function "test-consumer-function"/,
    );
  });

  test('Should throw error when the defaulted visibility timeout is less than the function timeout', () => {
    // Neither value is configured on the queue, so the guard has to compare against the SQS and
    // Lambda defaults rather than skipping validation.
    expect(() => {
      buildConstruct('test-defaulted-visibility-timeout', {
        queues: { 'defaulted-queue': {} },
        functions: [
          {
            ...consumerFunctionProps,
            timeoutSeconds: 60,
            sqsEventSources: { 'defaulted-queue': {} },
          },
        ],
      });
    }).toThrow(/visibility timeout of 30 seconds \(SQS default\), which is less than the 60 seconds timeout/);
  });

  test('Should not throw when visibility timeout equals the function timeout', () => {
    expect(() => {
      buildConstruct('test-equal-visibility-timeout', {
        queues: { 'matched-queue': { visibilityTimeoutSeconds: 300 } },
        functions: [
          {
            ...consumerFunctionProps,
            timeoutSeconds: 300,
            sqsEventSources: { 'matched-queue': {} },
          },
        ],
      });
    }).not.toThrow();
  });

  test('Should throw error when the defaulted function timeout exceeds the visibility timeout', () => {
    expect(() => {
      buildConstruct('test-defaulted-function-timeout', {
        queues: { 'brief-queue': { visibilityTimeoutSeconds: 1 } },
        functions: [{ ...consumerFunctionProps, sqsEventSources: { 'brief-queue': {} } }],
      });
    }).toThrow(/visibility timeout of 1 seconds, which is less than the 3 seconds \(Lambda default\) timeout/);
  });

  test('Should throw error when a queue key collides with a function name', () => {
    // Both would generate a queue named '<name>-dlq': the queue's redrive DLQ and the function's
    // async-invoke DLQ. Construct ids differ, so this synthesizes cleanly and fails on deploy.
    expect(() => {
      buildConstruct('test-dlq-name-collision', {
        queues: { ingest: { visibilityTimeoutSeconds: 60 } },
        functions: [{ ...consumerFunctionProps, functionName: 'ingest', timeoutSeconds: 30 }],
      });
    }).toThrow(
      'Queue name "ingest-dlq" would be generated for both the dead letter queue of queue "ingest" ' +
        'and the dead letter queue of function "ingest". SQS queue names must be unique - rename one of them.',
    );
  });

  test('Should accept a FIFO queue whose base name matches a function name', () => {
    // The FIFO queue's dead letter queue is '<name>-dlq.fifo' and the function's async-invoke dead
    // letter queue is '<name>-dlq', so the physical names differ and there is no real collision.
    // The uniqueness check has to account for the '.fifo' suffix or it rejects a valid config.
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new LambdaFunctionL3Construct(stack, 'test-fifo-no-collision', {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      queues: { ingest: { fifo: true } },
      functions: [{ ...consumerFunctionProps, functionName: 'ingest' }],
    });
    const template = Template.fromStack(stack);

    const queueNames = Object.values(template.findResources('AWS::SQS::Queue')).map(
      queue => queue.Properties.QueueName as string,
    );
    // The FIFO queue, its FIFO redrive DLQ, and the function's standard async-invoke DLQ
    expect(queueNames).toHaveLength(3);
    expect(new Set(queueNames).size).toBe(3);
    expect(queueNames).toContain('test-org-test-env-test-domain-test-module-ingest-dlq.fifo');
    expect(queueNames).toContain('test-org-test-env-test-domain-test-module-ingest-dlq');
  });

  test('Should throw error when a queue key collides with a function DLQ name', () => {
    expect(() => {
      buildConstruct('test-queue-name-collision', {
        queues: { 'ingest-dlq': {} },
        functions: [{ ...consumerFunctionProps, functionName: 'ingest' }],
      });
    }).toThrow(/Queue name "ingest-dlq" would be generated for both queue "ingest-dlq" and/);
  });

  test('Should throw error when a queue name contains a character SQS rejects', () => {
    // SQS rejects '.' with InvalidParameterValue, but MDAA's general resource-name validation
    // permits it so the FIFO suffix can survive - so without this check the name would synthesize
    // cleanly and fail on deploy.
    expect(() => {
      buildConstruct('test-queue-name-dot', { queues: { 'my.queue': {} } });
    }).toThrow(
      `Queue "my.queue" contains '.', which SQS does not permit in a queue name. ` +
        `Use only alphanumeric characters, hyphens and underscores.`,
    );
  });

  test('Should report every character SQS rejects in a queue name', () => {
    expect(() => {
      buildConstruct('test-queue-name-chars', { queues: { 'my.queue@v1/x': {} } });
    }).toThrow(/contains '\.', '@', '\/', which SQS does not permit/);
  });

  test('Should throw error when a queue name is empty', () => {
    expect(() => {
      buildConstruct('test-queue-name-empty', { queues: { '': {} } });
    }).toThrow('Queue names must not be empty.');
  });

  test('Should accept underscores in a queue name', () => {
    expect(() => {
      buildConstruct('test-queue-name-underscore', { queues: { my_queue: {} } });
    }).not.toThrow();
  });

  test('Should throw error when a queue key carries the .fifo suffix', () => {
    // The suffix is derived from the fifo flag, so a key carrying it would render an illegal
    // dead letter queue name of 'orders.fifo-dlq.fifo'.
    expect(() => {
      buildConstruct('test-fifo-suffix-in-key', { queues: { 'orders.fifo': { fifo: true } } });
    }).toThrow(
      `Queue "orders.fifo" must not carry the '.fifo' suffix in its name. ` +
        `Set 'fifo: true' instead, and the suffix is appended to the generated queue name.`,
    );
  });

  test('Should throw error when a queue sets contentBasedDeduplication with fifo false', () => {
    expect(() => {
      buildConstruct('test-fifo-contradiction', {
        queues: { orders: { fifo: false, contentBasedDeduplication: true } },
      });
    }).toThrow(/sets 'contentBasedDeduplication: true'.*but also sets 'fifo: false'/);
  });

  test('Consumers of one queue share a single grant statement, avoiding duplicate sids', () => {
    // Two function names differing only in non-alphanumeric characters would collide on a
    // sanitized per-function sid, which IAM rejects. Distinct roles keep the statements from
    // being merged by CDK, so this is the case that would fail on deploy.
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new LambdaFunctionL3Construct(stack, 'test-shared-grant', {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      queues: { shared: { visibilityTimeoutSeconds: 60 } },
      functions: [
        {
          ...consumerFunctionProps,
          functionName: 'order-processor',
          roleArn: 'arn:test-partition:iam::test-acct:role/role-a',
          timeoutSeconds: 30,
          sqsEventSources: { shared: {} },
        },
        {
          ...consumerFunctionProps,
          functionName: 'order_processor',
          roleArn: 'arn:test-partition:iam::test-acct:role/role-b',
          timeoutSeconds: 30,
          sqsEventSources: { shared: {} },
        },
      ],
    });
    const template = Template.fromStack(stack);

    const sharedQueuePolicy = Object.entries(template.findResources('AWS::SQS::QueuePolicy')).find(([id]) =>
      id.includes('queueshared'),
    );
    const statements = sharedQueuePolicy?.[1].Properties.PolicyDocument.Statement as { Sid?: string }[];
    const sids = statements.map(statement => statement.Sid).filter(Boolean);
    expect(sids).toEqual([...new Set(sids)]);

    template.hasResourceProperties('AWS::SQS::QueuePolicy', {
      Queues: [{ Ref: Match.stringLikeRegexp('queueshared.*') }],
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Sid: 'ConsumeMessages',
            Principal: {
              AWS: ['arn:test-partition:iam::test-acct:role/role-a', 'arn:test-partition:iam::test-acct:role/role-b'],
            },
          }),
        ]),
      },
    });
  });

  test('Consumers sharing one execution role are listed as a principal only once', () => {
    // Two functions on the same role produce the same queue, sid and principal, so the grant is
    // applied once. Without the guard the role would appear twice in the statement's principal list.
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const sharedRoleArn = 'arn:test-partition:iam::test-acct:role/shared-lambda-role';
    new LambdaFunctionL3Construct(stack, 'test-shared-role-grant', {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      queues: { shared: { visibilityTimeoutSeconds: 60 } },
      functions: [
        {
          ...consumerFunctionProps,
          functionName: 'consumer-a',
          roleArn: sharedRoleArn,
          timeoutSeconds: 30,
          sqsEventSources: { shared: {} },
          queueUrlEnvironment: { QUEUE_URL: 'shared', ALSO_QUEUE_URL: 'shared' },
        },
        {
          ...consumerFunctionProps,
          functionName: 'consumer-b',
          roleArn: sharedRoleArn,
          timeoutSeconds: 30,
          sqsEventSources: { shared: {} },
        },
      ],
    });
    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::SQS::QueuePolicy', {
      Queues: [{ Ref: Match.stringLikeRegexp('queueshared.*') }],
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({ Sid: 'ConsumeMessages', Principal: { AWS: sharedRoleArn } }),
          Match.objectLike({ Sid: 'SendMessages', Principal: { AWS: sharedRoleArn } }),
        ]),
      },
    });
  });

  test('Should throw error when alarm references undefined metric', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const functionWithInvalidAlarm: FunctionProps = {
      functionName: 'test-invalid-alarm-function',
      srcDir: './test/src/lambda/test',
      handler: 'test_handler',
      roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
      runtime: 'python3.14',
      alarms: [
        {
          alarmName: 'InvalidAlarm',
          metricName: 'NonExistentMetric',
          namespace: 'CustomMetrics',
          statistic: 'Sum',
          period: 300,
          evaluationPeriods: 1,
          threshold: 5,
          comparisonOperator: 'GreaterThanOrEqualToThreshold',
        },
      ],
    };
    const constructProps: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      functions: [functionWithInvalidAlarm],
    };

    expect(() => {
      new LambdaFunctionL3Construct(stack, 'test-invalid-alarm', constructProps);
    }).toThrow(/Alarm "InvalidAlarm" references undefined metric "NonExistentMetric"/);
  });
});

describe('MDAA test with override scope', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const layerProps: LayerProps = {
    layerName: 'ovryd-layer',
    src: './test/src/lambda/test',
    description: 'override layer testing',
  };

  const functionProps: FunctionProps = {
    functionName: 'ovryd-function',
    srcDir: './test/src/lambda/test',
    handler: 'test_handler',
    roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
    runtime: 'python3.14',
  };

  const constructPropsWithOverride: LambdaFunctionL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
    functions: [functionProps],
    layers: [layerProps],
    overrideScope: true,
  };

  new LambdaFunctionL3Construct(stack, 'ovryd-teststack', constructPropsWithOverride);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Validate function created with override scope', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'test-org-test-env-test-domain-test-module-ovryd-function',
      Role: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
    });
  });

  test('Validate layer created with override scope', () => {
    template.hasResourceProperties('AWS::Lambda::LayerVersion', {
      LayerName: 'test-org-test-env-test-domain-test-module-ovryd-layer',
      Description: 'override layer testing',
    });
  });

  test('Validate KMS key reference with override scope', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      KmsKeyArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
    });
  });

  test('Validate DLQ created with override scope', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      DeadLetterConfig: {
        TargetArn: {
          'Fn::GetAtt': [Match.stringLikeRegexp('ovrydteststackdlqovrydfunction.*'), 'Arn'],
        },
      },
    });
  });
});

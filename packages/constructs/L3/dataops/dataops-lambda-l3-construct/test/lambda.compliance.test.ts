/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Protocol } from 'aws-cdk-lib/aws-ec2';
import { FunctionProps, LambdaFunctionL3Construct, LambdaFunctionL3ConstructProps, LayerProps } from '../lib';

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
    runtime: 'python3.13',
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

  const constructProps: LambdaFunctionL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
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
    ],
    layers: [layerProps],
  };

  new LambdaFunctionL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log( JSON.stringify( template, undefined, 2 ) )

  test('Validate function counts', () => {
    // Note: Actual count is 13 due to CDK automatically adding a LogRetention Lambda function
    // 12 test functions + 1 LogRetention function for log management
    template.resourceCountIs('AWS::Lambda::Function', 13);
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
      runtime: 'python3.13',
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

  test('Should throw error when alarm references undefined metric', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const functionWithInvalidAlarm: FunctionProps = {
      functionName: 'test-invalid-alarm-function',
      srcDir: './test/src/lambda/test',
      handler: 'test_handler',
      roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
      runtime: 'python3.13',
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
    runtime: 'python3.13',
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

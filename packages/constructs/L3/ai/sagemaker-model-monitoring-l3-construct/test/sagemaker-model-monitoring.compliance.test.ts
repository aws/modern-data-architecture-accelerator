/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  SageMakerModelMonitoringL3Construct,
  SageMakerModelMonitoringL3ConstructProps,
} from '../lib/sagemaker-model-monitoring-l3-construct';

const TEST_MONITOR_IMAGE = '156813124566.dkr.ecr.us-east-1.amazonaws.com/sagemaker-model-monitor-analyzer';
const TEST_CLARIFY_IMAGE = '205585389593.dkr.ecr.us-east-1.amazonaws.com/sagemaker-clarify-processing:1.0';

describe('SageMaker Model Monitoring L3 Construct', () => {
  describe('Data Quality Only', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerModelMonitoringL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      endpointName: 'test-endpoint',
      monitors: {
        dataQuality: {
          enabled: true,
          schedule: 'cron(0 * ? * * *)',
          instanceType: 'ml.m5.xlarge',
          imageUri: TEST_MONITOR_IMAGE,
        },
      },
    };
    new SageMakerModelMonitoringL3Construct(stack, 'monitoring', constructProps);
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates Data Quality Job Definition', () => {
      template.resourceCountIs('AWS::SageMaker::DataQualityJobDefinition', 1);
    });

    test('Creates Monitoring Schedule', () => {
      template.resourceCountIs('AWS::SageMaker::MonitoringSchedule', 1);
    });

    test('Creates KMS Key', () => {
      template.hasResourceProperties('AWS::KMS::Key', { EnableKeyRotation: true });
    });

    test('Creates S3 Bucket for output', () => {
      template.resourceCountIs('AWS::S3::Bucket', 1);
    });

    test('Data Quality Job has correct configuration', () => {
      template.hasResourceProperties('AWS::SageMaker::DataQualityJobDefinition', {
        DataQualityAppSpecification: {
          ImageUri: TEST_MONITOR_IMAGE,
        },
        JobResources: Match.objectLike({
          ClusterConfig: Match.objectLike({
            InstanceType: 'ml.m5.xlarge',
          }),
        }),
      });
    });

    test('Monitoring role has SageMaker permissions', () => {
      template.hasResourceProperties(
        'AWS::IAM::Policy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith(['sagemaker:DescribeEndpoint']),
              }),
            ]),
          }),
        }),
      );
    });

    test('Exports SSM Parameters including schedule ARNs', () => {
      const ssmParams = template.findResources('AWS::SSM::Parameter');
      // Expect: monitor-schedule-count, monitor-schedule-arns, output-bucket-name (plus infrastructure params)
      expect(Object.keys(ssmParams).length).toBeGreaterThanOrEqual(3);
    });

    test('Exports monitor-schedule-count of 1', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Value: '1',
      });
    });
  });

  describe('All 4 Monitor Types with VPC', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerModelMonitoringL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      endpointName: 'test-endpoint-full',
      vpcId: 'vpc-123',
      subnetIds: ['subnet-abc'],
      securityGroupIds: ['sg-123'],
      modelBucketArn: 'arn:aws:s3:::test-model-bucket',
      monitors: {
        dataQuality: { enabled: true, imageUri: TEST_MONITOR_IMAGE },
        modelQuality: {
          enabled: true,
          problemType: 'BinaryClassification',
          groundTruthS3Uri: 's3://bucket/ground-truth/',
          imageUri: TEST_MONITOR_IMAGE,
        },
        modelBias: {
          enabled: true,
          groundTruthS3Uri: 's3://bucket/ground-truth/',
          imageUri: TEST_CLARIFY_IMAGE,
        },
        modelExplainability: {
          enabled: true,
          imageUri: TEST_CLARIFY_IMAGE,
        },
      },
    };
    new SageMakerModelMonitoringL3Construct(stack, 'monitoring-full', constructProps);
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates all 4 job definitions', () => {
      template.resourceCountIs('AWS::SageMaker::DataQualityJobDefinition', 1);
      template.resourceCountIs('AWS::SageMaker::ModelQualityJobDefinition', 1);
      template.resourceCountIs('AWS::SageMaker::ModelBiasJobDefinition', 1);
      template.resourceCountIs('AWS::SageMaker::ModelExplainabilityJobDefinition', 1);
    });

    test('Creates 4 monitoring schedules', () => {
      template.resourceCountIs('AWS::SageMaker::MonitoringSchedule', 4);
    });

    test('Model Quality Job has correct problem type', () => {
      template.hasResourceProperties('AWS::SageMaker::ModelQualityJobDefinition', {
        ModelQualityAppSpecification: Match.objectLike({
          ProblemType: 'BinaryClassification',
        }),
      });
    });

    test('Monitoring role has VPC permissions', () => {
      template.hasResourceProperties(
        'AWS::IAM::Policy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith(['ec2:CreateNetworkInterface']),
              }),
            ]),
          }),
        }),
      );
    });

    test('Monitoring role has model bucket access', () => {
      template.hasResourceProperties(
        'AWS::IAM::Policy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith(['s3:GetObject']),
                Resource: Match.arrayWith(['arn:aws:s3:::test-model-bucket']),
              }),
            ]),
          }),
        }),
      );
    });

    test('Job definitions use KMS encryption', () => {
      template.hasResourceProperties('AWS::SageMaker::DataQualityJobDefinition', {
        DataQualityJobOutputConfig: Match.objectLike({
          KmsKeyId: Match.anyValue(),
        }),
      });
    });
  });

  describe('Disabled Monitors', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerModelMonitoringL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      endpointName: 'test-endpoint-disabled',
      monitors: {
        dataQuality: { enabled: true, imageUri: TEST_MONITOR_IMAGE },
        modelQuality: { enabled: false },
      },
    };
    new SageMakerModelMonitoringL3Construct(stack, 'monitoring-partial', constructProps);
    const template = Template.fromStack(stack);

    test('Only creates enabled monitors', () => {
      template.resourceCountIs('AWS::SageMaker::DataQualityJobDefinition', 1);
      template.resourceCountIs('AWS::SageMaker::ModelQualityJobDefinition', 0);
      template.resourceCountIs('AWS::SageMaker::MonitoringSchedule', 1);
    });
  });

  describe('No VPC Config', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerModelMonitoringL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      endpointName: 'test-endpoint-novpc',
      monitors: {
        dataQuality: { enabled: true, imageUri: TEST_MONITOR_IMAGE },
      },
    };
    new SageMakerModelMonitoringL3Construct(stack, 'monitoring-novpc', constructProps);
    const template = Template.fromStack(stack);

    test('Does not add VPC permissions', () => {
      // Verify no ec2:CreateNetworkInterface in any policy
      const policies = template.findResources('AWS::IAM::Policy');
      for (const [, policy] of Object.entries(policies)) {
        const statements = (
          policy as Record<string, unknown> & {
            Properties: { PolicyDocument: { Statement: Array<{ Action: string[] }> } };
          }
        ).Properties.PolicyDocument.Statement;
        for (const stmt of statements) {
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          expect(actions).not.toContain('ec2:CreateNetworkInterface');
        }
      }
    });
  });

  describe('Invalid schedule expression validation', () => {
    test('Throws for invalid schedule expression', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerModelMonitoringL3Construct(testApp.testStack, 'bad-schedule', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          endpointName: 'test-endpoint',
          monitors: {
            dataQuality: { enabled: true, schedule: 'not-a-cron', imageUri: TEST_MONITOR_IMAGE },
          },
        });
      }).toThrow(/must be a valid cron or rate expression/);
    });
  });

  describe('Missing imageUri validation', () => {
    test('Throws when imageUri is missing for enabled monitor', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      expect(() => {
        new SageMakerModelMonitoringL3Construct(stack, 'monitoring-nouri', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(stack, testApp.naming),
          endpointName: 'test-endpoint-nouri',
          monitors: {
            dataQuality: { enabled: true },
          },
        });
      }).toThrow(/imageUri is required for .+ monitor/);
    });

    test('Throws when imageUri has invalid ECR format', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerModelMonitoringL3Construct(testApp.testStack, 'invalid-ecr', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          endpointName: 'test-endpoint',
          monitors: {
            dataQuality: {
              enabled: true,
              imageUri: 'not-a-valid-ecr-uri',
            },
          },
        });
      }).toThrow(/imageUri must be a valid ECR URI/);
    });
  });

  describe('Missing groundTruthS3Uri validation', () => {
    test('Throws when groundTruthS3Uri is missing for model-quality monitor', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      expect(() => {
        new SageMakerModelMonitoringL3Construct(stack, 'monitoring-nogt-mq', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(stack, testApp.naming),
          endpointName: 'test-endpoint-nogt-mq',
          monitors: {
            modelQuality: { enabled: true, imageUri: TEST_MONITOR_IMAGE },
          },
        });
      }).toThrow(/groundTruthS3Uri is required for model-quality/);
    });

    test('Throws when groundTruthS3Uri is missing for model-bias monitor', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      expect(() => {
        new SageMakerModelMonitoringL3Construct(stack, 'monitoring-nogt-mb', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(stack, testApp.naming),
          endpointName: 'test-endpoint-nogt-mb',
          monitors: {
            modelBias: { enabled: true, imageUri: TEST_CLARIFY_IMAGE },
          },
        });
      }).toThrow(/groundTruthS3Uri is required for model-bias/);
    });
  });

  describe('Automated Baselining', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelMonitoringL3Construct(stack, 'monitoring-baseline', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      endpointName: 'test-endpoint-baseline',
      monitors: {
        dataQuality: { enabled: true, imageUri: TEST_MONITOR_IMAGE },
      },
      baselineTrainingDataS3Uri: 's3://bucket/training-data/',
      baselineOutputDataS3Uri: 's3://bucket/baseline-output/',
      baselineSchedule: 'cron(0 3 * * ? *)',
    });
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates Step Functions state machine', () => {
      template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    });

    test('Creates EventBridge schedule rule', () => {
      template.hasResourceProperties(
        'AWS::Events::Rule',
        Match.objectLike({
          ScheduleExpression: 'cron(0 3 * * ? *)',
        }),
      );
    });

    test('State machine role has PassRole permission', () => {
      template.hasResourceProperties(
        'AWS::IAM::Policy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: 'iam:PassRole',
                Condition: Match.objectLike({
                  StringEquals: { 'iam:PassedToService': 'sagemaker.amazonaws.com' },
                }),
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe('External KMS Key', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelMonitoringL3Construct(stack, 'monitoring-ext-kms', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      endpointName: 'test-endpoint-kms',
      kmsKeyArn: 'arn:aws:kms:us-east-1:111111111111:key/ext-key-id',
      monitors: {
        dataQuality: { enabled: true, imageUri: TEST_MONITOR_IMAGE },
      },
    });
    const template = Template.fromStack(stack);

    test('Does not create a new KMS key', () => {
      template.resourceCountIs('AWS::KMS::Key', 0);
    });

    test('Creates monitoring schedule', () => {
      template.resourceCountIs('AWS::SageMaker::MonitoringSchedule', 1);
    });
  });

  describe('Baseline Configs and Constraints', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelMonitoringL3Construct(stack, 'monitoring-baselines', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      endpointName: 'test-endpoint-bl',
      monitors: {
        dataQuality: {
          enabled: true,
          imageUri: TEST_MONITOR_IMAGE,
          baselineConstraintsUri: 's3://bucket/constraints.json',
          baselineStatisticsUri: 's3://bucket/statistics.json',
        },
        modelQuality: {
          enabled: true,
          imageUri: TEST_MONITOR_IMAGE,
          problemType: 'Regression',
          groundTruthS3Uri: 's3://gt-bucket/ground-truth/',
          baselineConstraintsUri: 's3://bucket/mq-constraints.json',
        },
        modelBias: {
          enabled: true,
          imageUri: TEST_CLARIFY_IMAGE,
          groundTruthS3Uri: 's3://gt-bucket/ground-truth/',
          baselineConstraintsUri: 's3://bucket/mb-constraints.json',
        },
        modelExplainability: {
          enabled: true,
          imageUri: TEST_CLARIFY_IMAGE,
          baselineConstraintsUri: 's3://bucket/me-constraints.json',
        },
      },
    });
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Data Quality has baseline constraints and statistics', () => {
      template.hasResourceProperties('AWS::SageMaker::DataQualityJobDefinition', {
        DataQualityBaselineConfig: Match.objectLike({
          ConstraintsResource: { S3Uri: 's3://bucket/constraints.json' },
          StatisticsResource: { S3Uri: 's3://bucket/statistics.json' },
        }),
      });
    });

    test('Model Quality has baseline constraints', () => {
      template.hasResourceProperties('AWS::SageMaker::ModelQualityJobDefinition', {
        ModelQualityBaselineConfig: Match.objectLike({
          ConstraintsResource: { S3Uri: 's3://bucket/mq-constraints.json' },
        }),
      });
    });

    test('Model Bias has baseline constraints', () => {
      template.hasResourceProperties('AWS::SageMaker::ModelBiasJobDefinition', {
        ModelBiasBaselineConfig: Match.objectLike({
          ConstraintsResource: { S3Uri: 's3://bucket/mb-constraints.json' },
        }),
      });
    });

    test('Model Explainability has baseline constraints', () => {
      template.hasResourceProperties('AWS::SageMaker::ModelExplainabilityJobDefinition', {
        ModelExplainabilityBaselineConfig: Match.objectLike({
          ConstraintsResource: { S3Uri: 's3://bucket/me-constraints.json' },
        }),
      });
    });

    test('Model Quality Regression uses prediction inference attribute', () => {
      template.hasResourceProperties('AWS::SageMaker::ModelQualityJobDefinition', {
        ModelQualityJobInput: Match.objectLike({
          EndpointInput: Match.objectLike({
            InferenceAttribute: 'prediction',
          }),
        }),
      });
    });
  });

  describe('BinaryClassification Model Quality Defaults', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelMonitoringL3Construct(stack, 'monitoring-binary', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      endpointName: 'test-endpoint-binary',
      monitors: {
        modelQuality: {
          enabled: true,
          imageUri: TEST_MONITOR_IMAGE,
          problemType: 'BinaryClassification',
          groundTruthS3Uri: 's3://gt-bucket/ground-truth/',
        },
      },
    });
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Uses probability attribute for BinaryClassification', () => {
      template.hasResourceProperties('AWS::SageMaker::ModelQualityJobDefinition', {
        ModelQualityJobInput: Match.objectLike({
          EndpointInput: Match.objectLike({
            ProbabilityAttribute: 'probability',
            ProbabilityThresholdAttribute: 0.5,
          }),
        }),
      });
    });

    test('Sets problemType to BinaryClassification', () => {
      template.hasResourceProperties('AWS::SageMaker::ModelQualityJobDefinition', {
        ModelQualityAppSpecification: Match.objectLike({
          ProblemType: 'BinaryClassification',
        }),
      });
    });
  });

  describe('AnalysisConfigUri Fallback', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelMonitoringL3Construct(stack, 'monitoring-config-uri', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      endpointName: 'test-endpoint-cfg',
      monitors: {
        modelBias: {
          enabled: true,
          imageUri: TEST_CLARIFY_IMAGE,
          groundTruthS3Uri: 's3://gt-bucket/ground-truth/',
        },
        modelExplainability: {
          enabled: true,
          imageUri: TEST_CLARIFY_IMAGE,
          analysisConfigUri: 's3://custom-bucket/custom-analysis.json',
        },
      },
    });
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Model Bias uses default analysisConfigUri when not provided', () => {
      const resources = template.findResources('AWS::SageMaker::ModelBiasJobDefinition');
      const jobDef = Object.values(resources)[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const configUri = (jobDef as Record<string, any>).Properties.ModelBiasAppSpecification.ConfigUri;
      const resolvedUri = typeof configUri === 'object' ? JSON.stringify(configUri) : String(configUri);
      expect(resolvedUri).toContain('model-bias/');
      expect(resolvedUri).toContain('analysis_config.json');
    });

    test('Model Explainability uses custom analysisConfigUri when provided', () => {
      template.hasResourceProperties('AWS::SageMaker::ModelExplainabilityJobDefinition', {
        ModelExplainabilityAppSpecification: Match.objectLike({
          ConfigUri: 's3://custom-bucket/custom-analysis.json',
        }),
      });
    });
  });

  describe('Automated Baselining with All Monitors', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelMonitoringL3Construct(stack, 'monitoring-baseline-all', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      endpointName: 'test-endpoint-bl-all',
      monitors: {
        dataQuality: { enabled: true, imageUri: TEST_MONITOR_IMAGE },
        modelQuality: {
          enabled: true,
          imageUri: TEST_MONITOR_IMAGE,
          groundTruthS3Uri: 's3://gt-bucket/ground-truth/',
        },
        modelBias: {
          enabled: true,
          imageUri: TEST_CLARIFY_IMAGE,
          groundTruthS3Uri: 's3://gt-bucket/ground-truth/',
        },
        modelExplainability: {
          enabled: true,
          imageUri: TEST_CLARIFY_IMAGE,
        },
      },
      baselineTrainingDataS3Uri: 's3://train-bucket/data/',
      baselineOutputDataS3Uri: 's3://out-bucket/output/',
    });
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates Step Functions state machine with default schedule', () => {
      template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
      template.hasResourceProperties('AWS::Events::Rule', {
        ScheduleExpression: 'cron(0 2 * * ? *)',
      });
    });
  });

  describe('Automated Baselining with modelQuality image fallback', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelMonitoringL3Construct(stack, 'monitoring-bl-mq-fallback', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      endpointName: 'test-ep-mq-fallback',
      monitors: {
        modelQuality: {
          enabled: true,
          imageUri: TEST_MONITOR_IMAGE,
          groundTruthS3Uri: 's3://gt-bucket/ground-truth/',
        },
      },
      baselineTrainingDataS3Uri: 's3://train-bucket/data/',
      baselineOutputDataS3Uri: 's3://out-bucket/output/',
    });
    const template = Template.fromStack(stack);

    test('Creates baseline state machine using modelQuality imageUri', () => {
      template.resourceCountIs('AWS::StepFunctions::StateMachine', 1);
    });
  });

  describe('Automated Baselining missing image validation', () => {
    test('Throws when baseline enabled but no dataQuality or modelQuality imageUri', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerModelMonitoringL3Construct(testApp.testStack, 'monitoring-bl-no-img', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          endpointName: 'test-ep-bl-no-img',
          monitors: {
            modelBias: {
              enabled: true,
              imageUri: TEST_CLARIFY_IMAGE,
              groundTruthS3Uri: 's3://gt-bucket/ground-truth/',
            },
          },
          baselineTrainingDataS3Uri: 's3://train-bucket/data/',
          baselineOutputDataS3Uri: 's3://out-bucket/output/',
        });
      }).toThrow(/baselineTrainingDataS3Uri requires at least one of/);
    });
  });

  describe('No Baselining When URIs Missing', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelMonitoringL3Construct(stack, 'monitoring-nobaseline', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      endpointName: 'test-endpoint-nobaseline',
      monitors: {
        dataQuality: { enabled: true, imageUri: TEST_MONITOR_IMAGE },
      },
    });
    const template = Template.fromStack(stack);

    test('No Step Functions state machine', () => {
      template.resourceCountIs('AWS::StepFunctions::StateMachine', 0);
    });
  });
});

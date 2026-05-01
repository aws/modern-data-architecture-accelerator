/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  SageMakerPipelineL3Construct,
  PIPELINE_ROLE_PLACEHOLDER,
  PIPELINE_KMS_PLACEHOLDER,
} from '../lib/sagemaker-pipeline-l3-construct';
import { SmProcessingStep } from '../lib/steps/processing-step';
import { SmTrainingStep } from '../lib/steps/training-step';
import { SmRegisterModelStep } from '../lib/steps/register-model-step';
import { SmConditionStep } from '../lib/steps/condition-step';

const TEST_IMAGE_URI = '123456789012.dkr.ecr.us-east-1.amazonaws.com/test:latest';
const DUMMY_ROLE_ARN = PIPELINE_ROLE_PLACEHOLDER;

describe('SageMakerPipelineL3Construct', () => {
  describe('Full training pipeline', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const preprocessStep = new SmProcessingStep('PreprocessData', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: DUMMY_ROLE_ARN,
      scriptS3Uri: 's3://bucket/scripts/preprocessing.py',
      outputs: [{ outputName: 'train' }, { outputName: 'validation' }, { outputName: 'test' }],
    });

    const trainStep = new SmTrainingStep('TrainModel', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: DUMMY_ROLE_ARN,
      outputPath: 's3://bucket/output',
      inputChannels: [
        { channelName: 'train', s3Uri: preprocessStep.output('train'), contentType: 'text/csv' },
        { channelName: 'validation', s3Uri: preprocessStep.output('validation'), contentType: 'text/csv' },
      ],
      hyperparameters: { objective: 'reg:linear', num_round: '50' },
    });

    const registerStep = new SmRegisterModelStep('RegisterModel', {
      imageUri: TEST_IMAGE_URI,
      modelData: trainStep.modelArtifacts(),
      modelPackageGroupName: 'test-model-group',
      inferenceInstanceTypes: ['ml.t2.medium'],
      transformInstanceTypes: ['ml.m5.large'],
    });

    const conditionStep = new SmConditionStep('CheckMSE', {
      conditions: [
        {
          operator: 'LessThanOrEqualTo',
          left: {
            stepName: 'EvaluateModel',
            propertyFile: 'EvalReport',
            jsonPath: 'regression_metrics.mse.value',
          },
          right: 6.0,
        },
      ],
      ifSteps: [registerStep],
    });

    new SageMakerPipelineL3Construct(stack, 'Pipeline', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-project',
      modelPackageGroupName: 'test-mpg',
      pipelineParameters: [{ name: 'ProcessingInstanceType', type: 'String', defaultValue: 'ml.m5.xlarge' }],
      pipelineSteps: [preprocessStep, trainStep, conditionStep],
    });

    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates CfnPipeline', () => {
      template.hasResourceProperties('AWS::SageMaker::Pipeline', {
        PipelineDescription: 'test-project ML Pipeline',
      });
    });

    test('Creates Model Package Group', () => {
      template.hasResourceProperties('AWS::SageMaker::ModelPackageGroup', {
        ModelPackageGroupDescription: 'Model Package Group for test-project',
      });
    });

    test('Creates execution role with SageMaker trust', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Principal: { Service: 'sagemaker.amazonaws.com' },
              Action: 'sts:AssumeRole',
            }),
          ]),
        },
      });
    });

    test('Creates S3 bucket', () => {
      template.resourceCountIs('AWS::S3::Bucket', 1);
    });

    test('Creates KMS key with rotation', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true,
      });
    });

    test('Creates 7 SSM parameters', () => {
      // pipeline-name, pipeline-arn, execution-role-arn, model-bucket-name, kms-key-id, mpg-name, mpg-arn
      const ssmResources = template.findResources('AWS::SSM::Parameter');
      expect(Object.keys(ssmResources).length).toBeGreaterThanOrEqual(7);
    });

    test('Embeds pipeline definition JSON with steps', () => {
      const pipelines = template.findResources('AWS::SageMaker::Pipeline');
      const pipelineKeys = Object.keys(pipelines);
      expect(pipelineKeys.length).toBe(1);

      const props = pipelines[pipelineKeys[0]].Properties;
      const defStr = JSON.stringify(props);
      expect(defStr).toContain('PreprocessData');
      expect(defStr).toContain('TrainModel');
      expect(defStr).toContain('CheckMSE');
    });

    test('Pipeline definition uses Fn::Sub to resolve role and KMS placeholders', () => {
      const pipelines = template.findResources('AWS::SageMaker::Pipeline');
      const pipelineKeys = Object.keys(pipelines);
      const props = pipelines[pipelineKeys[0]].Properties;

      // CfnPipeline uses PipelineDefinition.PipelineDefinitionBody
      // CDK may nest it differently — search full props for Fn::Sub
      const propsStr = JSON.stringify(props);
      expect(propsStr).toContain('Fn::Sub');
      expect(propsStr).toContain('PipelineRoleArn');
      expect(propsStr).toContain('PipelineKmsKeyId');
      // Should NOT contain raw placeholder strings
      expect(propsStr).not.toContain(PIPELINE_ROLE_PLACEHOLDER);
      expect(propsStr).not.toContain(PIPELINE_KMS_PLACEHOLDER);
    });

    test('Execution role has StartPipelineExecution permission', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith([
                'sagemaker:StartPipelineExecution',
                'sagemaker:DescribePipelineExecution',
                'sagemaker:StopPipelineExecution',
              ]),
            }),
          ]),
        },
      });
    });

    test('Execution role has pipeline and pipeline-execution ARN resources', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Resource: Match.arrayWith([
                Match.objectLike({
                  'Fn::Join': Match.arrayWith([Match.arrayWith([Match.stringLikeRegexp('pipeline/test-project')])]),
                }),
              ]),
            }),
          ]),
        },
      });
    });
  });

  describe('Minimal config (no model package group)', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const step = new SmProcessingStep('Step1', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: DUMMY_ROLE_ARN,
    });

    new SageMakerPipelineL3Construct(stack, 'Pipeline', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'minimal-project',
      pipelineSteps: [step],
    });

    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates CfnPipeline', () => {
      template.hasResourceProperties('AWS::SageMaker::Pipeline', {
        PipelineDescription: 'minimal-project ML Pipeline',
      });
    });

    test('No Model Package Group', () => {
      template.resourceCountIs('AWS::SageMaker::ModelPackageGroup', 0);
    });

    test('Creates 5 SSM parameters', () => {
      // pipeline-name, pipeline-arn, execution-role-arn, model-bucket-name, kms-key-id
      const ssmResources = template.findResources('AWS::SSM::Parameter');
      expect(Object.keys(ssmResources).length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Explicit pipeline name', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const step = new SmProcessingStep('Step1', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: DUMMY_ROLE_ARN,
    });

    const construct = new SageMakerPipelineL3Construct(stack, 'Pipeline', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-project',
      pipelineName: 'my-custom-pipeline-name',
      pipelineSteps: [step],
    });

    test('Uses explicit pipeline name', () => {
      expect(construct.pipelineName).toBe('my-custom-pipeline-name');
    });

    test('CfnPipeline uses the explicit name', () => {
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::SageMaker::Pipeline', {
        PipelineName: 'my-custom-pipeline-name',
      });
    });
  });

  describe('Account ID validation', () => {
    test('Rejects invalid preProdAccountId', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      const step = new SmProcessingStep('S', {
        imageUri: TEST_IMAGE_URI,
        instanceType: 'ml.m5.xlarge',
        roleArn: DUMMY_ROLE_ARN,
      });

      expect(() => {
        new SageMakerPipelineL3Construct(stack, 'Pipeline', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(stack, testApp.naming),
          projectName: 'test-project',
          preProdAccountId: 'not-12-digits',
          pipelineSteps: [step],
        });
      }).toThrow(/preProdAccountId must be a 12-digit/);
    });

    test('Rejects invalid prodAccountId', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      const step = new SmProcessingStep('S', {
        imageUri: TEST_IMAGE_URI,
        instanceType: 'ml.m5.xlarge',
        roleArn: DUMMY_ROLE_ARN,
      });

      expect(() => {
        new SageMakerPipelineL3Construct(stack, 'Pipeline', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(stack, testApp.naming),
          projectName: 'test-project',
          prodAccountId: '12345',
          pipelineSteps: [step],
        });
      }).toThrow(/prodAccountId must be a 12-digit/);
    });

    test('Accepts valid 12-digit account IDs', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      const step = new SmProcessingStep('S', {
        imageUri: TEST_IMAGE_URI,
        instanceType: 'ml.m5.xlarge',
        roleArn: DUMMY_ROLE_ARN,
      });

      expect(() => {
        new SageMakerPipelineL3Construct(stack, 'Pipeline', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(stack, testApp.naming),
          projectName: 'test-project',
          preProdAccountId: '123456789012',
          prodAccountId: '987654321098',
          pipelineSteps: [step],
        });
      }).not.toThrow();
    });
  });

  describe('Cross-account', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const step = new SmProcessingStep('Step1', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: DUMMY_ROLE_ARN,
    });

    new SageMakerPipelineL3Construct(stack, 'Pipeline', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'cross-account',
      modelPackageGroupName: 'test-mpg',
      preProdAccountId: '111111111111',
      prodAccountId: '222222222222',
      pipelineSteps: [step],
    });

    const template = Template.fromStack(stack);

    test('KMS key policy grants cross-account access', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith(['kms:Decrypt']),
            }),
          ]),
        }),
      });
    });

    test('S3 bucket policy grants cross-account model access', () => {
      template.hasResourceProperties('AWS::S3::BucketPolicy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Sid: 'CrossAccountModelAccess',
              Effect: 'Allow',
            }),
          ]),
        }),
      });
    });
  });

  describe('VPC network config', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const step = new SmProcessingStep('Step1', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: DUMMY_ROLE_ARN,
    });

    new SageMakerPipelineL3Construct(stack, 'Pipeline', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'vpc-project',
      networkConfig: {
        subnetIds: ['subnet-aaa'],
        securityGroupIds: ['sg-bbb'],
      },
      pipelineSteps: [step],
    });

    const template = Template.fromStack(stack);

    test('Adds VPC network permissions to execution role', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Effect: 'Allow',
              Action: Match.arrayWith(['ec2:CreateNetworkInterface']),
              Resource: '*',
            }),
          ]),
        },
      });
    });
  });

  describe('Imported bucket and KMS key', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const step = new SmProcessingStep('Step1', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: DUMMY_ROLE_ARN,
    });

    const construct = new SageMakerPipelineL3Construct(stack, 'Pipeline', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'imported-project',
      pipelineBucketName: 'existing-bucket',
      pipelineKmsKeyArn: 'arn:aws:kms:us-east-1:111111111111:key/existing-key-id',
      pipelineSteps: [step],
    });

    const template = Template.fromStack(stack);

    test('Does not create a new KMS key or S3 bucket', () => {
      template.resourceCountIs('AWS::KMS::Key', 0);
      template.resourceCountIs('AWS::S3::Bucket', 0);
    });

    test('Exposes imported bucket name', () => {
      expect(construct.modelBucketName).toBe('existing-bucket');
    });

    test('Creates CfnPipeline', () => {
      template.resourceCountIs('AWS::SageMaker::Pipeline', 1);
    });
  });

  describe('Additional read buckets', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const step = new SmProcessingStep('Step1', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: DUMMY_ROLE_ARN,
    });

    new SageMakerPipelineL3Construct(stack, 'Pipeline', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'extra-buckets',
      additionalReadBucketNames: ['extra-read-bucket'],
      pipelineSteps: [step],
    });

    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Execution role has read access to additional buckets', () => {
      const allPolicies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
      expect(allPolicies).toContain('extra-read-bucket');
    });

    test('Execution role has KMS policy for additional bucket access', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['kms:Decrypt', 'kms:DescribeKey']),
              Condition: Match.objectLike({
                StringEquals: Match.objectLike({
                  'kms:ViaService': Match.anyValue(),
                }),
              }),
            }),
          ]),
        }),
      });
    });
  });

  describe('Existing model package group (createModelPackageGroup: false)', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;

    const step = new SmProcessingStep('Step1', {
      imageUri: TEST_IMAGE_URI,
      instanceType: 'ml.m5.xlarge',
      roleArn: DUMMY_ROLE_ARN,
    });

    const construct = new SageMakerPipelineL3Construct(stack, 'Pipeline', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'existing-mpg',
      modelPackageGroupName: 'fully-qualified-mpg-name',
      createModelPackageGroup: false,
      pipelineSteps: [step],
    });

    const template = Template.fromStack(stack);

    test('Does not create CfnModelPackageGroup', () => {
      template.resourceCountIs('AWS::SageMaker::ModelPackageGroup', 0);
    });

    test('Uses model package group name as-is', () => {
      expect(construct.modelPackageGroupName).toBe('fully-qualified-mpg-name');
    });

    test('Execution role has model registry permissions', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['sagemaker:CreateModelPackage']),
            }),
          ]),
        }),
      });
    });
  });

  describe('Placeholder constants', () => {
    test('PIPELINE_ROLE_PLACEHOLDER is a distinct string', () => {
      expect(PIPELINE_ROLE_PLACEHOLDER).toBe('__PIPELINE_ROLE_ARN__');
    });

    test('PIPELINE_KMS_PLACEHOLDER is a distinct string', () => {
      expect(PIPELINE_KMS_PLACEHOLDER).toBe('__PIPELINE_KMS_KEY_ID__');
    });
  });
});

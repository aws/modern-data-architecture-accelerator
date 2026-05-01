/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { SourceType } from '@aws-mdaa/sm-shared';
import {
  SageMakerBatchInferenceL3Construct,
  SageMakerBatchInferenceL3ConstructProps,
} from '../lib/sagemaker-batch-inference-l3-construct';

// Generate minimal test seed-code zip at module level (avoids committing binary; .gitignore excludes *.zip)
const TEST_SEED_CODE_ZIP = join(__dirname, 'test-seed-code.zip');
writeFileSync(
  TEST_SEED_CODE_ZIP,
  Buffer.from(
    'UEsDBAoAAAAAAFWye1ySOw6ZBwAAAAcAAAAJABwAUkVBRE1FLm1kVVQJAANBAsdpMwLHaXV4CwABBOgDAAAE6AMAACMgdGVzdApQSwECHgMKAAAAAABVsntckjsOmQcAAAAHAAAACQAYAAAAAAABAAAApIEAAAAAUkVBRE1FLm1kVVQFAANBAsdpdXgLAAEE6AMAAAToAwAAUEsFBgAAAAABAAEATwAAAEoAAAAAAA==',
    'base64',
  ),
);
afterAll(() => {
  if (existsSync(TEST_SEED_CODE_ZIP)) unlinkSync(TEST_SEED_CODE_ZIP);
});

describe('SageMaker Batch Inference L3 Construct', () => {
  describe('Minimal Config', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerBatchInferenceL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-batch',
      seedCodePath: __dirname + '/test-seed-code.zip',
      modelPackageGroupName: 'test-mpg',
      modelBucketName: 'test-model-bucket',
    };
    new SageMakerBatchInferenceL3Construct(stack, 'batch-inference', constructProps);
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates CodeCommit Repository', () => {
      template.resourceCountIs('AWS::CodeCommit::Repository', 1);
    });

    test('Creates CodeBuild Project with correct env vars', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([
            Match.objectLike({ Name: 'SAGEMAKER_PROJECT_NAME', Value: 'test-batch' }),
            Match.objectLike({ Name: 'MODEL_PACKAGE_GROUP_NAME', Value: 'test-mpg' }),
            Match.objectLike({ Name: 'MODEL_BUCKET_NAME', Value: 'test-model-bucket' }),
            Match.objectLike({ Name: 'INSTANCE_TYPE', Value: 'ml.m5.xlarge' }),
            Match.objectLike({ Name: 'INSTANCE_COUNT', Value: '1' }),
            Match.objectLike({ Name: 'INPUT_DATA_S3_URI', Value: '' }),
            Match.objectLike({ Name: 'OUTPUT_DATA_S3_PREFIX', Value: '' }),
          ]),
        }),
      });
    });

    test('CodeBuild Project has domain env vars', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([
            Match.objectLike({ Name: 'SAGEMAKER_DOMAIN_ID', Value: '' }),
            Match.objectLike({ Name: 'SAGEMAKER_DOMAIN_ARN', Value: '' }),
          ]),
        }),
      });
    });

    test('Creates CodePipeline', () => {
      template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
    });

    test('SageMaker role has transform job permissions', () => {
      template.hasResourceProperties(
        'AWS::IAM::Policy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith(['sagemaker:CreateTransformJob']),
              }),
            ]),
          }),
        }),
      );
    });

    test('SageMaker role has model package read access', () => {
      template.hasResourceProperties(
        'AWS::IAM::Policy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith(['sagemaker:DescribeModelPackage']),
              }),
            ]),
          }),
        }),
      );
    });

    test('CodeBuild role has iam:PassRole for SageMaker', () => {
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

    test('KMS key has rotation enabled', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true,
      });
    });

    test('Exports SSM Parameters', () => {
      const ssmParams = template.findResources('AWS::SSM::Parameter');
      expect(Object.keys(ssmParams).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Custom Instance Config', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerBatchInferenceL3Construct(stack, 'batch-custom', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-batch-custom',
      seedCodePath: __dirname + '/test-seed-code.zip',
      modelPackageGroupName: 'test-mpg-custom',
      modelBucketName: 'test-bucket-custom',
      instanceType: 'ml.p3.2xlarge',
      instanceCount: 4,
      baseJobPrefix: 'custom-prefix',
    });
    const template = Template.fromStack(stack);

    test('CodeBuild has custom instance type', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([Match.objectLike({ Name: 'INSTANCE_TYPE', Value: 'ml.p3.2xlarge' })]),
        }),
      });
    });

    test('CodeBuild has custom instance count', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([Match.objectLike({ Name: 'INSTANCE_COUNT', Value: '4' })]),
        }),
      });
    });

    test('CodeBuild has custom base job prefix', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([
            Match.objectLike({ Name: 'BASE_JOB_PREFIX', Value: 'custom-prefix' }),
          ]),
        }),
      });
    });
  });

  describe('S3 Input/Output and Domain Props', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerBatchInferenceL3Construct(stack, 'batch-s3', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-batch-s3',
      seedCodePath: __dirname + '/test-seed-code.zip',
      modelPackageGroupName: 'test-mpg-s3',
      modelBucketName: 'test-bucket-s3',
      inputDataS3Uri: 's3://my-bucket/input/',
      outputDataS3Prefix: 's3://my-bucket/output/',
      domainId: 'domain-123',
      domainArn: 'arn:aws:sagemaker:us-east-1:111111111111:domain/domain-123',
    });
    const template = Template.fromStack(stack);

    test('CodeBuild has input and output S3 env vars', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([
            Match.objectLike({ Name: 'INPUT_DATA_S3_URI', Value: 's3://my-bucket/input/' }),
            Match.objectLike({ Name: 'OUTPUT_DATA_S3_PREFIX', Value: 's3://my-bucket/output/' }),
          ]),
        }),
      });
    });

    test('CodeBuild has domain env vars', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([
            Match.objectLike({ Name: 'SAGEMAKER_DOMAIN_ID', Value: 'domain-123' }),
            Match.objectLike({
              Name: 'SAGEMAKER_DOMAIN_ARN',
              Value: 'arn:aws:sagemaker:us-east-1:111111111111:domain/domain-123',
            }),
          ]),
        }),
      });
    });
  });

  describe('Input Validation', () => {
    test('Throws for invalid instanceType format', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerBatchInferenceL3Construct(testApp.testStack, 'invalid-instance', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          projectName: 'test-batch',
          seedCodePath: __dirname + '/test-seed-code.zip',
          modelPackageGroupName: 'test-mpg',
          modelBucketName: 'test-model-bucket',
          instanceType: 'm5.xlarge',
        });
      }).toThrow(/Invalid instanceType/);
    });

    test('Throws for non-integer instanceCount', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerBatchInferenceL3Construct(testApp.testStack, 'invalid-count', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          projectName: 'test-batch',
          seedCodePath: __dirname + '/test-seed-code.zip',
          modelPackageGroupName: 'test-mpg',
          modelBucketName: 'test-model-bucket',
          instanceCount: 0,
        });
      }).toThrow(/instanceCount must be a positive integer/);
    });

    test('Accepts valid instanceType', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerBatchInferenceL3Construct(testApp.testStack, 'valid-instance', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          projectName: 'test-batch',
          seedCodePath: __dirname + '/test-seed-code.zip',
          modelPackageGroupName: 'test-mpg',
          modelBucketName: 'test-model-bucket',
          instanceType: 'ml.p3.2xlarge',
        });
      }).not.toThrow();
    });
  });

  describe('SageMaker Role Permissions', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerBatchInferenceL3Construct(stack, 'batch-perms', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-batch',
      seedCodePath: __dirname + '/test-seed-code.zip',
      modelPackageGroupName: 'test-mpg',
      modelBucketName: 'test-model-bucket',
    });
    const template = Template.fromStack(stack);

    test('SageMaker role has iam:PassRole self-reference', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'iam:PassRole',
              Effect: 'Allow',
              Condition: { StringEquals: { 'iam:PassedToService': 'sagemaker.amazonaws.com' } },
            }),
          ]),
        }),
      });
    });
  });

  describe('CodeStar Connections Source', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerBatchInferenceL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-project',
      modelPackageGroupName: 'test-mpg',
      modelBucketName: 'test-model-bucket',
      sourceType: SourceType.CODESTAR_CONNECTIONS,
      codeStarConnection: {
        connectionArn: 'arn:aws:codestar-connections:us-east-1:123456789012:connection/test-conn-id',
        owner: 'test-org',
        repo: 'test-batch-repo',
      },
    };
    new SageMakerBatchInferenceL3Construct(stack, 'batch-inference', constructProps);
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Does not create CodeCommit Repository', () => {
      template.resourceCountIs('AWS::CodeCommit::Repository', 0);
    });

    test('Creates CodePipeline with CodeStar Connections source action', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({
            Name: 'Source',
            Actions: Match.arrayWith([
              Match.objectLike({
                ActionTypeId: Match.objectLike({
                  Provider: 'CodeStarSourceConnection',
                }),
                Configuration: Match.objectLike({
                  ConnectionArn: 'arn:aws:codestar-connections:us-east-1:123456789012:connection/test-conn-id',
                  FullRepositoryId: 'test-org/test-batch-repo',
                  BranchName: 'main',
                }),
              }),
            ]),
          }),
        ]),
      });
    });

    test('Pipeline role has codestar-connections:UseConnection permission', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'codestar-connections:UseConnection',
              Resource: 'arn:aws:codestar-connections:us-east-1:123456789012:connection/test-conn-id',
            }),
          ]),
        }),
      });
    });
  });

  describe('Full Config with VPC and Additional Buckets', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerBatchInferenceL3Construct(stack, 'batch-full', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-full',
      seedCodePath: __dirname + '/test-seed-code.zip',
      modelPackageGroupName: 'test-mpg-full',
      modelBucketName: 'test-model-bucket-full',
      trainingPipelineBucketName: 'training-pipeline-bucket',
      additionalReadBucketNames: ['extra-read-bucket'],
      additionalWriteBucketNames: ['extra-write-bucket'],
      subnetIds: ['subnet-aaa', 'subnet-bbb'],
      securityGroupIds: ['sg-ccc'],
      projectId: 'proj-id-123',
    });
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('SageMaker role has read access to training pipeline bucket', () => {
      const allPolicies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
      expect(allPolicies).toContain('training-pipeline-bucket');
    });

    test('SageMaker role has read access to additional read buckets', () => {
      const allPolicies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
      expect(allPolicies).toContain('extra-read-bucket');
    });

    test('SageMaker role has KMS policy for additional bucket access', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['kms:Decrypt', 'kms:DescribeKey', 'kms:GenerateDataKey']),
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

    test('SageMaker role has read-write access to additional write buckets', () => {
      const allPolicies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
      expect(allPolicies).toContain('extra-write-bucket');
      expect(allPolicies).toContain('s3:PutObject');
    });

    test('SageMaker role has VPC network permissions', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['ec2:CreateNetworkInterface']),
            }),
          ]),
        }),
      });
    });

    test('CodeBuild has SAGEMAKER_PROJECT_ID when projectId provided', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([
            Match.objectLike({ Name: 'SAGEMAKER_PROJECT_ID', Value: 'proj-id-123' }),
          ]),
        }),
      });
    });
  });

  describe('Validation', () => {
    test('Throws when CODESTAR_CONNECTIONS without codeStarConnection config', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      expect(() => {
        new SageMakerBatchInferenceL3Construct(stack, 'batch-inference', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(stack, testApp.naming),
          projectName: 'test-project',
          modelPackageGroupName: 'test-mpg',
          modelBucketName: 'test-model-bucket',
          sourceType: SourceType.CODESTAR_CONNECTIONS,
        });
      }).toThrow('codeStarConnection is required when sourceType is CODESTAR_CONNECTIONS');
    });

    test('Throws when CODECOMMIT without seedCodePath', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      expect(() => {
        new SageMakerBatchInferenceL3Construct(stack, 'batch-inference', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(stack, testApp.naming),
          projectName: 'test-project',
          modelPackageGroupName: 'test-mpg',
          modelBucketName: 'test-model-bucket',
          sourceType: SourceType.CODECOMMIT,
        });
      }).toThrow('seedCodePath is required when sourceType is CODECOMMIT');
    });
  });
});

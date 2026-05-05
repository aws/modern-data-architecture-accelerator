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
  SageMakerModelTrainingL3Construct,
  SageMakerModelTrainingL3ConstructProps,
} from '../lib/sagemaker-model-training-l3-construct';

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

describe('SageMaker Model Training L3 Construct', () => {
  describe('Minimal Config', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerModelTrainingL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-project',
      seedCodePath: __dirname + '/test-seed-code.zip',
    };
    new SageMakerModelTrainingL3Construct(stack, 'model-training', constructProps);
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates Model Package Group', () => {
      template.resourceCountIs('AWS::SageMaker::ModelPackageGroup', 1);
      template.hasResourceProperties('AWS::SageMaker::ModelPackageGroup', {
        ModelPackageGroupDescription: 'Model Package Group for test-project',
      });
    });

    test('Creates KMS Key with rotation enabled', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        EnableKeyRotation: true,
      });
    });

    test('Creates 2 S3 Buckets (model + pipeline artifacts)', () => {
      template.resourceCountIs('AWS::S3::Bucket', 2);
    });

    test('Creates CodeCommit Repository', () => {
      template.resourceCountIs('AWS::CodeCommit::Repository', 1);
    });

    test('Creates CodeBuild Project with correct env vars', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([
            Match.objectLike({ Name: 'SAGEMAKER_PROJECT_NAME', Value: 'test-project' }),
            Match.objectLike({ Name: 'ENABLE_NETWORK_ISOLATION', Value: 'true' }),
            Match.objectLike({ Name: 'ENCRYPT_INTER_CONTAINER_TRAFFIC', Value: 'true' }),
          ]),
        }),
      });
    });

    test('Creates CodePipeline with Source and Build stages', () => {
      template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
    });

    test('SageMaker execution role has training permissions', () => {
      template.hasResourceProperties(
        'AWS::IAM::Policy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith(['sagemaker:CreateTrainingJob']),
              }),
            ]),
          }),
        }),
      );
    });

    test('SageMaker execution role has ECR access', () => {
      template.hasResourceProperties(
        'AWS::IAM::Policy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith(['ecr:BatchGetImage']),
              }),
            ]),
          }),
        }),
      );
    });

    test('CodeBuild role has pipeline execution permissions', () => {
      template.hasResourceProperties(
        'AWS::IAM::Policy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith(['sagemaker:CreatePipeline']),
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

    test('Exports at least 5 SSM Parameters', () => {
      const ssmParams = template.findResources('AWS::SSM::Parameter');
      expect(Object.keys(ssmParams).length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Full Config with VPC and Cross-Account', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerModelTrainingL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-project-full',
      seedCodePath: __dirname + '/test-seed-code.zip',
      domainId: 'test-domain-id',
      domainArn: 'arn:aws:sagemaker:us-east-1:111111111111:domain/test-domain',
      enableNetworkIsolation: true,
      enableInterContainerEncryption: true,
      devEnvironment: {
        vpcId: 'vpc-12345',
        subnetIds: ['subnet-abc', 'subnet-def'],
        securityGroupIds: ['sg-123'],
      },
      preProdAccountId: '222222222222',
      prodAccountId: '333333333333',
    };
    new SageMakerModelTrainingL3Construct(stack, 'model-training-full', constructProps);
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates resources with cross-account config', () => {
      template.resourceCountIs('AWS::SageMaker::ModelPackageGroup', 1);
      template.resourceCountIs('AWS::KMS::Key', 1);
      template.resourceCountIs('AWS::S3::Bucket', 2);
    });

    test('KMS key has cross-account principals', () => {
      template.hasResourceProperties('AWS::KMS::Key', {
        KeyPolicy: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Principal: Match.objectLike({
                AWS: Match.anyValue(),
              }),
              Action: Match.arrayWith(['kms:Decrypt']),
            }),
          ]),
        }),
      });
    });

    test('S3 bucket has cross-account access policy', () => {
      template.hasResourceProperties(
        'AWS::S3::BucketPolicy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Sid: 'CrossAccountModelAccess',
              }),
            ]),
          }),
        }),
      );
    });

    test('VPC-enabled IAM policies', () => {
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

    test('CodeBuild has network isolation env var set to true', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([
            Match.objectLike({ Name: 'ENABLE_NETWORK_ISOLATION', Value: 'true' }),
          ]),
        }),
      });
    });
  });

  describe('Minimal Config without VPC', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelTrainingL3Construct(stack, 'model-training-novpc', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-novpc',
      seedCodePath: __dirname + '/test-seed-code.zip',
    });
    const template = Template.fromStack(stack);

    test('Does not add VPC permissions when no VPC configured', () => {
      const policies = template.findResources('AWS::IAM::Policy');
      for (const [, policy] of Object.entries(policies)) {
        const statements = (
          policy as Record<string, unknown> & {
            Properties: { PolicyDocument: { Statement: Array<{ Action: string | string[] }> } };
          }
        ).Properties.PolicyDocument.Statement;
        for (const stmt of statements) {
          const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
          expect(actions).not.toContain('ec2:CreateNetworkInterface');
        }
      }
    });

    test('No cross-account S3 bucket policy', () => {
      const bucketPolicies = template.findResources('AWS::S3::BucketPolicy');
      for (const [, bp] of Object.entries(bucketPolicies)) {
        const statements = (
          bp as Record<string, unknown> & { Properties: { PolicyDocument: { Statement: Array<{ Sid?: string }> } } }
        ).Properties.PolicyDocument.Statement;
        for (const stmt of statements) {
          expect(stmt.Sid).not.toBe('CrossAccountModelAccess');
        }
      }
    });
  });

  describe('CodeStar Connections Source', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerModelTrainingL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-project',
      sourceType: SourceType.CODESTAR_CONNECTIONS,
      codeStarConnection: {
        connectionArn: 'arn:aws:codestar-connections:us-east-1:123456789012:connection/test-conn-id',
        owner: 'test-org',
        repo: 'test-repo',
        branch: 'develop',
      },
    };
    new SageMakerModelTrainingL3Construct(stack, 'model-training', constructProps);
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Does not create CodeCommit Repository', () => {
      template.resourceCountIs('AWS::CodeCommit::Repository', 0);
    });

    test('Creates CodePipeline with CodeStar Connections source action', () => {
      template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
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
                  FullRepositoryId: 'test-org/test-repo',
                  BranchName: 'develop',
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

    test('Still creates Model Package Group and CodeBuild', () => {
      template.resourceCountIs('AWS::SageMaker::ModelPackageGroup', 1);
      template.resourceCountIs('AWS::CodeBuild::Project', 1);
    });
  });

  describe('Validation', () => {
    test('Throws when CODESTAR_CONNECTIONS without codeStarConnection config', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      expect(() => {
        new SageMakerModelTrainingL3Construct(stack, 'model-training', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(stack, testApp.naming),
          projectName: 'test-project',
          sourceType: SourceType.CODESTAR_CONNECTIONS,
        });
      }).toThrow('codeStarConnection is required when sourceType is CODESTAR_CONNECTIONS');
    });

    test('Throws when CODECOMMIT without seedCodePath', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      expect(() => {
        new SageMakerModelTrainingL3Construct(stack, 'model-training', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(stack, testApp.naming),
          projectName: 'test-project',
          sourceType: SourceType.CODECOMMIT,
        });
      }).toThrow('seedCodePath is required when sourceType is CODECOMMIT');
    });
  });

  describe('CodeArtifact npm Registry', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelTrainingL3Construct(stack, 'model-training-ca', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-ca',
      seedCodePath: __dirname + '/test-seed-code.zip',
      codeArtifact: {
        domain: 'mdaa',
        repository: 'mdaa-npm',
        region: 'us-east-2',
        version: '1.5.0',
      },
    });
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('CodeBuild has CodeArtifact env vars', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([
            Match.objectLike({ Name: 'MDAA_CODEARTIFACT_DOMAIN', Value: 'mdaa' }),
            Match.objectLike({ Name: 'MDAA_CODEARTIFACT_REPO', Value: 'mdaa-npm' }),
            Match.objectLike({ Name: 'MDAA_CODEARTIFACT_REGION', Value: 'us-east-2' }),
            Match.objectLike({ Name: 'MDAA_VERSION', Value: '1.5.0' }),
          ]),
        }),
      });
    });

    test('CodeBuild role has CodeArtifact permissions', () => {
      template.hasResourceProperties(
        'AWS::IAM::Policy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: 'codeartifact:GetAuthorizationToken',
              }),
            ]),
          }),
        }),
      );
      template.hasResourceProperties(
        'AWS::IAM::Policy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith(['codeartifact:GetRepositoryEndpoint', 'codeartifact:ReadFromRepository']),
              }),
            ]),
          }),
        }),
      );
    });

    test('CodeBuild role has sts:GetServiceBearerToken for CodeArtifact', () => {
      template.hasResourceProperties(
        'AWS::IAM::Policy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: 'sts:GetServiceBearerToken',
                Condition: Match.objectLike({
                  StringEquals: { 'sts:AWSServiceName': 'codeartifact.amazonaws.com' },
                }),
              }),
            ]),
          }),
        }),
      );
    });
  });
});

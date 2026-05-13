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
  SageMakerModelDeployL3Construct,
  SageMakerModelDeployL3ConstructProps,
} from '../lib/sagemaker-model-deploy-l3-construct';

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

describe('SageMaker Model Deploy L3 Construct', () => {
  describe('Minimal Config', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerModelDeployL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-deploy',
      seedCodePath: __dirname + '/test-seed-code.zip',
      modelPackageGroupName: 'test-mpg',
      modelBucketName: 'test-model-bucket',
    };
    new SageMakerModelDeployL3Construct(stack, 'model-deploy', constructProps);
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates CodeCommit Repository with seed code', () => {
      template.resourceCountIs('AWS::CodeCommit::Repository', 1);
    });

    test('Creates CodeBuild Project with CodePipeline', () => {
      template.resourceCountIs('AWS::CodeBuild::Project', 1);
      template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
    });

    test('CodeBuild has correct env vars', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([
            Match.objectLike({ Name: 'MODEL_PACKAGE_GROUP_NAME', Value: 'test-mpg' }),
            Match.objectLike({ Name: 'MODEL_BUCKET_NAME', Value: 'test-model-bucket' }),
            Match.objectLike({ Name: 'PROJECT_NAME', Value: 'test-deploy' }),
          ]),
        }),
      });
    });

    test('CodeBuild has inline buildspec', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Source: Match.objectLike({
          Type: 'CODEPIPELINE',
        }),
      });
    });

    test('Creates EventBridge rule for model approval → CodePipeline target', () => {
      template.hasResourceProperties(
        'AWS::Events::Rule',
        Match.objectLike({
          EventPattern: Match.objectLike({
            source: ['aws.sagemaker'],
            'detail-type': ['SageMaker Model Package State Change'],
            detail: Match.objectLike({
              ModelPackageGroupName: ['test-mpg'],
              ModelApprovalStatus: ['Approved'],
            }),
          }),
        }),
      );
    });

    test('Creates SageMaker endpoint execution role', () => {
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

    test('CodeBuild shared policy has model and endpoint permissions', () => {
      template.hasResourceProperties(
        'AWS::IAM::ManagedPolicy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith(['sagemaker:CreateModel']),
              }),
            ]),
          }),
        }),
      );
      template.hasResourceProperties(
        'AWS::IAM::ManagedPolicy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: Match.arrayWith(['sagemaker:CreateEndpoint']),
              }),
            ]),
          }),
        }),
      );
    });

    test('CodeBuild shared policy has iam:PassRole for SageMaker', () => {
      template.hasResourceProperties(
        'AWS::IAM::ManagedPolicy',
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

    test('Exports SSM Parameters', () => {
      const ssmParams = template.findResources('AWS::SSM::Parameter');
      expect(Object.keys(ssmParams).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Full Config with Multi-Account', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerModelDeployL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-deploy-full',
      seedCodePath: __dirname + '/test-seed-code.zip',
      modelPackageGroupName: 'test-mpg-full',
      modelBucketName: 'test-model-bucket-full',
      enableManualApproval: true,
      enableEventBridgeTrigger: true,
      enableDataCapture: true,
      devEnvironment: {
        vpcId: 'vpc-dev',
        subnetIds: ['subnet-dev-1'],
        securityGroupIds: ['sg-dev-1'],
      },
      preProdEnvironment: {
        accountId: '222222222222',
        region: 'us-east-1',
      },
      prodEnvironment: {
        accountId: '333333333333',
        region: 'us-east-1',
      },
    };
    new SageMakerModelDeployL3Construct(stack, 'model-deploy-full', constructProps);
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Cross-account KMS key policy', () => {
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

    test('CodeBuild has multi-account env vars', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([
            Match.objectLike({ Name: 'PRE_PROD_ACCOUNT_ID', Value: '222222222222' }),
            Match.objectLike({ Name: 'PROD_ACCOUNT_ID', Value: '333333333333' }),
          ]),
        }),
      });
    });

    test('CodeBuild role has cross-account STS assume', () => {
      template.hasResourceProperties(
        'AWS::IAM::Policy',
        Match.objectLike({
          PolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: 'sts:AssumeRole',
              }),
            ]),
          }),
        }),
      );
    });

    test('SageMaker tags applied', () => {
      // CodeBuild project should have sagemaker tags
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Tags: Match.arrayWith([Match.objectLike({ Key: 'sagemaker:project-name' })]),
      });
    });

    test('Creates separate per-stage CodeBuild roles', () => {
      const roles = template.findResources('AWS::IAM::Role', {
        Properties: {
          AssumeRolePolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Principal: { Service: 'codebuild.amazonaws.com' },
              }),
            ]),
          }),
        },
      });
      // dev + preprod + prod = 3 CodeBuild roles
      expect(Object.keys(roles).length).toBe(3);
    });

    test('Per-stage roles have STS AssumeRole scoped to only their target account', () => {
      const policies = template.findResources('AWS::IAM::Policy');
      const stsPolicies: { logicalId: string; resources: string }[] = [];

      for (const [logicalId, policy] of Object.entries(policies)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const statements = (policy as any).Properties.PolicyDocument.Statement;
        const stsStmt = statements.find((s: { Action: string }) => s.Action === 'sts:AssumeRole');
        if (stsStmt) {
          stsPolicies.push({ logicalId, resources: JSON.stringify(stsStmt.Resource) });
        }
      }

      // Should have at least 3 STS policies (dev + preprod + prod)
      expect(stsPolicies.length).toBeGreaterThanOrEqual(3);

      // Verify isolation: no single policy references both preprod and prod accounts
      for (const p of stsPolicies) {
        const hasPreprod = p.resources.includes('222222222222');
        const hasProd = p.resources.includes('333333333333');
        expect(hasPreprod && hasProd).toBe(false);
      }

      // Verify preprod account is referenced in at least one policy
      expect(stsPolicies.some(p => p.resources.includes('222222222222'))).toBe(true);
      // Verify prod account is referenced in at least one policy
      expect(stsPolicies.some(p => p.resources.includes('333333333333'))).toBe(true);
    });

    test('Per-stage SSM read permissions scoped to specific account and region', () => {
      const policies = template.findResources('AWS::IAM::Policy');
      const ssmPolicies: { logicalId: string; resources: string }[] = [];

      for (const [logicalId, policy] of Object.entries(policies)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const statements = (policy as any).Properties.PolicyDocument.Statement;
        const ssmStmt = statements.find((s: { Action: string }) => s.Action === 'ssm:GetParameter');
        if (ssmStmt) {
          ssmPolicies.push({ logicalId, resources: JSON.stringify(ssmStmt.Resource) });
        }
      }

      // Preprod SSM references 222222222222
      expect(ssmPolicies.some(p => p.resources.includes('222222222222'))).toBe(true);
      // Prod SSM references 333333333333
      expect(ssmPolicies.some(p => p.resources.includes('333333333333'))).toBe(true);
    });

    test('Shared managed policy is attached to all stage roles', () => {
      const managedPolicies = template.findResources('AWS::IAM::ManagedPolicy');
      // Find the shared policy (has SageMaker statements)
      const sharedPolicyLogicalId = Object.keys(managedPolicies).find(key => {
        const doc = JSON.stringify(managedPolicies[key]);
        return doc.includes('sagemaker:CreateModel');
      });
      expect(sharedPolicyLogicalId).toBeDefined();

      // Each CodeBuild role should reference the shared managed policy
      const roles = template.findResources('AWS::IAM::Role', {
        Properties: {
          AssumeRolePolicyDocument: Match.objectLike({
            Statement: Match.arrayWith([
              Match.objectLike({
                Principal: { Service: 'codebuild.amazonaws.com' },
              }),
            ]),
          }),
        },
      });
      for (const [, role] of Object.entries(roles)) {
        const managedPolicyArns = JSON.stringify(
          (role as { Properties: { ManagedPolicyArns?: unknown[] } }).Properties.ManagedPolicyArns,
        );
        expect(managedPolicyArns).toContain(sharedPolicyLogicalId);
      }
    });
  });

  describe('Minimal Config Without Optional Props', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelDeployL3Construct(stack, 'model-deploy-bare', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-bare',
      seedCodePath: __dirname + '/test-seed-code.zip',
      modelPackageGroupName: 'test-mpg-bare',
      modelBucketName: 'test-model-bucket-bare',
    });
    const template = Template.fromStack(stack);

    test('No domain env vars when domainId/domainArn not provided', () => {
      const allEnvVars = JSON.stringify(template.findResources('AWS::CodeBuild::Project'));
      expect(allEnvVars).not.toContain('"DOMAIN_ID"');
      expect(allEnvVars).not.toContain('"DOMAIN_ARN"');
    });

    test('Uses default enableManualApproval value', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([Match.objectLike({ Name: 'ENABLE_MANUAL_APPROVAL', Value: 'true' })]),
        }),
      });
    });
  });

  describe('EventBridge Trigger Disabled', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelDeployL3Construct(stack, 'model-deploy-noeb', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-noeb',
      seedCodePath: __dirname + '/test-seed-code.zip',
      modelPackageGroupName: 'test-mpg-noeb',
      modelBucketName: 'test-model-bucket-noeb',
      enableEventBridgeTrigger: false,
    });
    const template = Template.fromStack(stack);

    test('No model approval EventBridge rule created', () => {
      // CodeCommit may still create a rule, but model approval shouldn't exist
      const rules = template.findResources('AWS::Events::Rule');
      for (const [, rule] of Object.entries(rules)) {
        const pattern = (rule as Record<string, unknown> & { Properties: { EventPattern?: { source?: string[] } } })
          .Properties.EventPattern;
        const sources = pattern?.source ?? [];
        expect(sources).not.toContain('aws.sagemaker');
      }
    });
  });

  describe('CodeStar Connections Source', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerModelDeployL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-project',
      modelPackageGroupName: 'test-mpg',
      modelBucketName: 'test-model-bucket',
      sourceType: SourceType.CODESTAR_CONNECTIONS,
      codeStarConnection: {
        connectionArn: 'arn:aws:codestar-connections:us-east-1:123456789012:connection/test-conn-id',
        owner: 'test-org',
        repo: 'test-deploy-repo',
        branch: 'release',
      },
    };
    new SageMakerModelDeployL3Construct(stack, 'model-deploy', constructProps);
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
                  FullRepositoryId: 'test-org/test-deploy-repo',
                  BranchName: 'release',
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

    test('Still creates CodeBuild projects and CodePipeline', () => {
      template.resourceCountIs('AWS::CodePipeline::Pipeline', 1);
      // Dev stage project at minimum
      const projects = template.findResources('AWS::CodeBuild::Project');
      expect(Object.keys(projects).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Pipeline Bucket and KMS Config', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelDeployL3Construct(stack, 'model-deploy-bucket', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-bucket',
      seedCodePath: __dirname + '/test-seed-code.zip',
      modelPackageGroupName: 'test-mpg-bucket',
      modelBucketName: 'test-model-bucket-bucket',
      pipelineBucketName: 'cross-pipeline-bucket',
      pipelineKmsKeyArn: 'arn:aws:kms:us-east-1:111111111111:key/test-key-id',
    });
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('SageMaker endpoint role has read access to pipeline bucket', () => {
      const allPolicies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
      expect(allPolicies).toContain('cross-pipeline-bucket');
    });

    test('SageMaker endpoint role has KMS decrypt for pipeline bucket key', () => {
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['kms:Decrypt', 'kms:DescribeKey']),
              Resource: 'arn:aws:kms:us-east-1:111111111111:key/test-key-id',
            }),
          ]),
        }),
      });
    });

    test('CodeBuild has pipeline bucket env vars', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([
            Match.objectLike({ Name: 'PIPELINE_BUCKET_NAME', Value: 'cross-pipeline-bucket' }),
            Match.objectLike({
              Name: 'PIPELINE_KMS_ARN',
              Value: 'arn:aws:kms:us-east-1:111111111111:key/test-key-id',
            }),
          ]),
        }),
      });
    });
  });

  describe('Build Policies - Policy ARN', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelDeployL3Construct(stack, 'model-deploy-ca', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-ca',
      seedCodePath: __dirname + '/test-seed-code.zip',
      modelPackageGroupName: 'test-mpg-ca',
      modelBucketName: 'test-model-bucket-ca',
      buildPolicies: [
        {
          policyArn: 'arn:aws:iam::123456789012:policy/CodeArtifactReadOnly',
        },
      ],
    });
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Stage roles have the imported managed policy attached', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith(['arn:aws:iam::123456789012:policy/CodeArtifactReadOnly']),
      });
    });
  });

  describe('Build Policies - Inline Policy Document', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelDeployL3Construct(stack, 'model-deploy-inline', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-inline',
      seedCodePath: __dirname + '/test-seed-code.zip',
      modelPackageGroupName: 'test-mpg-inline',
      modelBucketName: 'test-model-bucket-inline',
      buildPolicies: [
        {
          policyDocument: {
            Statement: [
              {
                Effect: 'Allow',
                Action: 'codeartifact:GetAuthorizationToken',
                Resource: 'arn:aws:codeartifact:us-east-1:123456789012:domain/test-domain',
              },
              {
                Effect: 'Allow',
                Action: ['codeartifact:GetRepositoryEndpoint', 'codeartifact:ReadFromRepository'],
                Resource: 'arn:aws:codeartifact:us-east-1:123456789012:repository/test-domain/test-repo',
              },
              {
                Effect: 'Allow',
                Action: 'sts:GetServiceBearerToken',
                Resource: '*',
                Condition: { StringEquals: { 'sts:AWSServiceName': 'codeartifact.amazonaws.com' } },
              },
            ],
          },
          suppressions: [
            {
              id: 'AwsSolutions-IAM5',
              reason: 'sts:GetServiceBearerToken requires Resource:* conditioned on sts:AWSServiceName',
            },
          ],
        },
      ],
    });
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates ManagedPolicy with inline statements from policyDocument', () => {
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'codeartifact:GetAuthorizationToken',
              Effect: 'Allow',
              Resource: 'arn:aws:codeartifact:us-east-1:123456789012:domain/test-domain',
            }),
            Match.objectLike({
              Action: Match.arrayWith(['codeartifact:GetRepositoryEndpoint', 'codeartifact:ReadFromRepository']),
              Effect: 'Allow',
              Resource: 'arn:aws:codeartifact:us-east-1:123456789012:repository/test-domain/test-repo',
            }),
            Match.objectLike({
              Action: 'sts:GetServiceBearerToken',
              Effect: 'Allow',
              Resource: '*',
            }),
          ]),
        }),
      });
    });

    test('Inline policy is attached to stage roles', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        ManagedPolicyArns: Match.arrayWith([Match.objectLike({ Ref: Match.stringLikeRegexp('.*cbinlinepolicy.*') })]),
      });
    });
  });

  describe('Domain and Environment Defaults', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    new SageMakerModelDeployL3Construct(stack, 'model-deploy-domain', {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-domain',
      modelPackageGroupName: 'test-mpg-domain',
      modelBucketName: 'test-model-bucket-domain',
      domainId: 'domain-456',
      domainArn: 'arn:aws:sagemaker:us-east-1:111111111111:domain/domain-456',
      preProdEnvironment: {
        accountId: '222222222222',
        region: 'us-east-1',
        vpcId: 'vpc-preprod',
        subnetIds: ['subnet-pp-1'],
        securityGroupIds: ['sg-pp-1'],
      },
      prodEnvironment: {
        accountId: '333333333333',
        region: 'us-west-2',
        vpcId: 'vpc-prod',
      },
      sourceType: SourceType.CODESTAR_CONNECTIONS,
      codeStarConnection: {
        connectionArn: 'arn:aws:codestar-connections:us-east-1:123456789012:connection/test-conn-id',
        owner: 'test-org',
        repo: 'test-deploy-repo',
      },
    });
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('CodeBuild has domain env vars', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([
            Match.objectLike({ Name: 'DOMAIN_ID', Value: 'domain-456' }),
            Match.objectLike({
              Name: 'DOMAIN_ARN',
              Value: 'arn:aws:sagemaker:us-east-1:111111111111:domain/domain-456',
            }),
          ]),
        }),
      });
    });

    test('CodeBuild has preProd VPC env vars', () => {
      template.hasResourceProperties('AWS::CodeBuild::Project', {
        Environment: Match.objectLike({
          EnvironmentVariables: Match.arrayWith([
            Match.objectLike({ Name: 'PRE_PROD_VPC_ID', Value: 'vpc-preprod' }),
            Match.objectLike({ Name: 'PROD_VPC_ID', Value: 'vpc-prod' }),
          ]),
        }),
      });
    });

    test('Uses default enableManualApproval (true) with approval stages', () => {
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({
            Name: 'ApprovePreProd',
          }),
          Match.objectLike({
            Name: 'ApproveProd',
          }),
        ]),
      });
    });
  });

  describe('Validation', () => {
    test('Throws when modelBucketName is empty', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerModelDeployL3Construct(testApp.testStack, 'deploy-no-bucket', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          projectName: 'test-project',
          seedCodePath: __dirname + '/test-seed-code.zip',
          modelPackageGroupName: 'test-mpg',
          modelBucketName: '',
        });
      }).toThrow(/modelBucketName is required/);
    });

    test('Throws when modelPackageGroupName is empty', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerModelDeployL3Construct(testApp.testStack, 'deploy-no-mpg', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          projectName: 'test-project',
          seedCodePath: __dirname + '/test-seed-code.zip',
          modelPackageGroupName: '',
          modelBucketName: 'test-bucket',
        });
      }).toThrow(/modelPackageGroupName is required/);
    });

    test('Throws when preProd accountId provided without region', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerModelDeployL3Construct(testApp.testStack, 'deploy-pp-no-region', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          projectName: 'test-project',
          seedCodePath: __dirname + '/test-seed-code.zip',
          modelPackageGroupName: 'test-mpg',
          modelBucketName: 'test-bucket',
          preProdEnvironment: { accountId: '222222222222' },
        });
      }).toThrow(/preProdEnvironment\.region is required/);
    });

    test('Throws when prod accountId provided without region', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerModelDeployL3Construct(testApp.testStack, 'deploy-prod-no-region', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          projectName: 'test-project',
          seedCodePath: __dirname + '/test-seed-code.zip',
          modelPackageGroupName: 'test-mpg',
          modelBucketName: 'test-bucket',
          prodEnvironment: { accountId: '333333333333' },
        });
      }).toThrow(/prodEnvironment\.region is required/);
    });
  });

  describe('Source Validation', () => {
    test('Throws when CODESTAR_CONNECTIONS without codeStarConnection config', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      expect(() => {
        new SageMakerModelDeployL3Construct(stack, 'model-deploy', {
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
        new SageMakerModelDeployL3Construct(stack, 'model-deploy', {
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

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { ManualApprovalAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { SourceType } from '../lib/sm-shared';
import { addPipelineSourceStage, addBuildProjectNagSuppressions } from '../lib/pipeline-helpers';

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

function createPipelineStack() {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;
  const kmsKey = new MdaaKmsKey(stack, 'TestKmsKey', {
    alias: 'test-key',
    naming: testApp.naming,
  });
  const bucket = new MdaaBucket(stack, 'TestBucket', {
    naming: testApp.naming,
    bucketName: 'test-artifacts',
    encryptionKey: kmsKey,
  });
  const role = new MdaaRole(stack, 'TestCbRole', {
    naming: testApp.naming,
    roleName: 'test-cb-role',
    assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
  });
  const pipeline = new Pipeline(stack, 'TestPipeline', {
    artifactBucket: bucket,
  });
  const buildProject = new PipelineProject(stack, 'TestBuildProject', {
    role,
    buildSpec: BuildSpec.fromSourceFilename('buildspec.yml'),
    environment: { buildImage: LinuxBuildImage.STANDARD_7_0 },
    encryptionKey: kmsKey,
  });
  return { testApp, stack, pipeline, buildProject };
}

describe('addPipelineSourceStage', () => {
  describe('CodeCommit source', () => {
    it('creates CodeCommit repository and source stage', () => {
      const { stack, pipeline } = createPipelineStack();
      const sourceArtifact = new Artifact('SourceOutput');

      const repoName = addPipelineSourceStage({
        scope: stack,
        pipeline,
        sourceArtifact,
        sourceType: SourceType.CODECOMMIT,
        repoConstructId: 'test-repo',
        repoName: 'my-repo',
        repoDescription: 'Test repository',
        seedCodePath: TEST_SEED_CODE_ZIP,
      });

      pipeline.addStage({
        stageName: 'Approve',
        actions: [new ManualApprovalAction({ actionName: 'Approve' })],
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::CodeCommit::Repository', 1);
      template.hasResourceProperties('AWS::CodeCommit::Repository', {
        RepositoryName: 'my-repo',
        RepositoryDescription: 'Test repository',
      });
      expect(typeof repoName).toBe('string');
    });

    it('uses empty string fallback when seedCodePath is undefined', () => {
      const { stack, pipeline } = createPipelineStack();
      const sourceArtifact = new Artifact('SourceOutput');

      expect(() =>
        addPipelineSourceStage({
          scope: stack,
          pipeline,
          sourceArtifact,
          sourceType: SourceType.CODECOMMIT,
          repoConstructId: 'test-repo',
          repoName: 'my-repo',
          repoDescription: 'Test repository',
        }),
      ).toThrow(/does not exist/);
    });
  });

  describe('CodeStar Connections source', () => {
    it('creates CodeStar source stage and UseConnection policy', () => {
      const { stack, pipeline } = createPipelineStack();
      const sourceArtifact = new Artifact('SourceOutput');

      const repoName = addPipelineSourceStage({
        scope: stack,
        pipeline,
        sourceArtifact,
        sourceType: SourceType.CODESTAR_CONNECTIONS,
        repoConstructId: 'test-repo',
        repoName: 'my-repo',
        repoDescription: 'Test repository',
        codeStarConnection: {
          connectionArn: 'arn:aws:codestar-connections:us-east-1:123456789012:connection/test-id',
          owner: 'my-org',
          repo: 'my-repo',
          branch: 'develop',
        },
      });

      pipeline.addStage({
        stageName: 'Approve',
        actions: [new ManualApprovalAction({ actionName: 'Approve' })],
      });

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::CodeCommit::Repository', 0);
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({
            Name: 'Source',
            Actions: Match.arrayWith([
              Match.objectLike({
                ActionTypeId: Match.objectLike({ Provider: 'CodeStarSourceConnection' }),
                Configuration: Match.objectLike({
                  ConnectionArn: 'arn:aws:codestar-connections:us-east-1:123456789012:connection/test-id',
                  FullRepositoryId: 'my-org/my-repo',
                  BranchName: 'develop',
                }),
              }),
            ]),
          }),
        ]),
      });
      expect(repoName).toBe('my-org/my-repo');
    });

    it('defaults branch to main when not specified', () => {
      const { stack, pipeline } = createPipelineStack();
      const sourceArtifact = new Artifact('SourceOutput');

      addPipelineSourceStage({
        scope: stack,
        pipeline,
        sourceArtifact,
        sourceType: SourceType.CODESTAR_CONNECTIONS,
        repoConstructId: 'test-repo',
        repoName: 'my-repo',
        repoDescription: 'Test repository',
        codeStarConnection: {
          connectionArn: 'arn:aws:codestar-connections:us-east-1:123456789012:connection/test-id',
          owner: 'my-org',
          repo: 'my-repo',
        },
      });

      pipeline.addStage({
        stageName: 'Approve',
        actions: [new ManualApprovalAction({ actionName: 'Approve' })],
      });

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
        Stages: Match.arrayWith([
          Match.objectLike({
            Name: 'Source',
            Actions: Match.arrayWith([
              Match.objectLike({
                Configuration: Match.objectLike({
                  BranchName: 'main',
                }),
              }),
            ]),
          }),
        ]),
      });
    });

    it('throws when codeStarConnection is undefined', () => {
      const { stack, pipeline } = createPipelineStack();
      const sourceArtifact = new Artifact('SourceOutput');

      expect(() =>
        addPipelineSourceStage({
          scope: stack,
          pipeline,
          sourceArtifact,
          sourceType: SourceType.CODESTAR_CONNECTIONS,
          repoConstructId: 'test-repo',
          repoName: 'my-repo',
          repoDescription: 'Test repository',
        }),
      ).toThrow('codeStarConnection is required when sourceType is CODESTAR_CONNECTIONS');
    });
  });
});

function createBuildProjectStack() {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;
  const role = new MdaaRole(stack, 'TestCbRole', {
    naming: testApp.naming,
    roleName: 'test-cb-role',
    assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
  });
  const buildProject = new PipelineProject(stack, 'TestBuildProject', {
    role,
    buildSpec: BuildSpec.fromSourceFilename('buildspec.yml'),
    environment: { buildImage: LinuxBuildImage.STANDARD_7_0 },
  });
  return { stack, buildProject };
}

describe('addBuildProjectNagSuppressions', () => {
  it('applies CodeCommit source suppressions for CODECOMMIT type', () => {
    const { stack, buildProject } = createBuildProjectStack();
    addBuildProjectNagSuppressions(buildProject, SourceType.CODECOMMIT);

    const template = Template.fromStack(stack);
    const metadata = template.findResources('AWS::CodeBuild::Project');
    const projectKey = Object.keys(metadata)[0];
    const suppressions = metadata[projectKey].Metadata?.['cdk_nag']?.rules_to_suppress ?? [];
    const ids = suppressions.map((s: { id: string }) => s.id);
    expect(ids).toContain('HIPAA.Security-CodeBuildProjectSourceRepoUrl');
    expect(ids).toContain('PCI.DSS.321-CodeBuildProjectSourceRepoUrl');
    expect(ids).toContain('AwsSolutions-CB4');
    expect(ids).toContain('NIST.800.53.R5-S3BucketReplicationEnabled');
  });

  it('applies CodeStar source suppressions for CODESTAR_CONNECTIONS type', () => {
    const { stack, buildProject } = createBuildProjectStack();
    addBuildProjectNagSuppressions(buildProject, SourceType.CODESTAR_CONNECTIONS);

    const template = Template.fromStack(stack);
    const metadata = template.findResources('AWS::CodeBuild::Project');
    const projectKey = Object.keys(metadata)[0];
    const suppressions = metadata[projectKey].Metadata?.['cdk_nag']?.rules_to_suppress ?? [];
    const ids = suppressions.map((s: { id: string }) => s.id);
    expect(ids).toContain('HIPAA.Security-CodeBuildProjectSourceRepoUrl');
    expect(ids).toContain('PCI.DSS.321-CodeBuildProjectSourceRepoUrl');
    expect(ids).toContain('AwsSolutions-CB4');
    expect(ids).toContain('NIST.800.53.R5-S3BucketReplicationEnabled');
  });
});

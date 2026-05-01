/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from 'constructs';
import { Code, Repository } from 'aws-cdk-lib/aws-codecommit';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CodeCommitSourceAction, CodeStarConnectionsSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { SourceType, CodeStarConnectionConfig, SeedCodeHelper } from './sm-shared';
import { CODEBUILD_SOURCE_SUPPRESSIONS, S3_REPLICATION_SUPPRESSIONS } from './nag-constants';

export interface AddPipelineSourceStageProps {
  readonly scope: Construct;
  readonly pipeline: Pipeline;
  readonly sourceArtifact: Artifact;
  readonly sourceType: SourceType;
  readonly repoConstructId: string;
  readonly repoName: string;
  readonly repoDescription: string;
  readonly seedCodePath?: string;
  readonly codeStarConnection?: CodeStarConnectionConfig;
}

export function addPipelineSourceStage(props: AddPipelineSourceStageProps): string {
  const { scope, pipeline, sourceArtifact, sourceType, codeStarConnection } = props;

  if (sourceType === SourceType.CODESTAR_CONNECTIONS) {
    if (!codeStarConnection) {
      throw new Error('codeStarConnection is required when sourceType is CODESTAR_CONNECTIONS');
    }
    const conn = codeStarConnection;
    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new CodeStarConnectionsSourceAction({
          actionName: 'Source',
          connectionArn: conn.connectionArn,
          owner: conn.owner,
          repo: conn.repo,
          branch: conn.branch ?? 'main',
          output: sourceArtifact,
        }),
      ],
    });

    pipeline.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['codestar-connections:UseConnection'],
        resources: [conn.connectionArn],
      }),
    );

    return `${conn.owner}/${conn.repo}`;
  }

  const repo = new Repository(scope, props.repoConstructId, {
    repositoryName: props.repoName,
    description: props.repoDescription,
    code: Code.fromZipFile(SeedCodeHelper.resolveSeedCodeZip(props.seedCodePath ?? ''), 'main'),
  });

  pipeline.addStage({
    stageName: 'Source',
    actions: [
      new CodeCommitSourceAction({
        actionName: 'Source',
        repository: repo,
        output: sourceArtifact,
        branch: 'main',
      }),
    ],
  });

  return repo.repositoryName;
}

export function addBuildProjectNagSuppressions(buildProject: PipelineProject, sourceType: SourceType): void {
  if (sourceType === SourceType.CODECOMMIT) {
    MdaaNagSuppressions.addCodeResourceSuppressions(
      buildProject,
      [...CODEBUILD_SOURCE_SUPPRESSIONS, ...S3_REPLICATION_SUPPRESSIONS],
      true,
    );
  } else {
    MdaaNagSuppressions.addCodeResourceSuppressions(
      buildProject,
      [
        {
          id: 'HIPAA.Security-CodeBuildProjectSourceRepoUrl',
          reason: 'Source repository uses AWS CodeStar Connections for authentication, not personal access tokens.',
        },
        {
          id: 'PCI.DSS.321-CodeBuildProjectSourceRepoUrl',
          reason: 'Source repository uses AWS CodeStar Connections for authentication, not personal access tokens.',
        },
        { id: 'AwsSolutions-CB4', reason: 'CodeBuild project uses customer-managed KMS key for encryption.' },
        ...S3_REPLICATION_SUPPRESSIONS,
      ],
      true,
    );
  }
}

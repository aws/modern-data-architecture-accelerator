/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey, DECRYPT_ACTIONS, ENCRYPT_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Construct } from 'constructs';
import { MdaaRole, MdaaManagedPolicy } from '@aws-mdaa/iam-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { Aws } from 'aws-cdk-lib';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Code, Repository } from 'aws-cdk-lib/aws-codecommit';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import {
  CodeBuildAction,
  CodeCommitSourceAction,
  CodeStarConnectionsSourceAction,
  ManualApprovalAction,
} from 'aws-cdk-lib/aws-codepipeline-actions';
import { Rule } from 'aws-cdk-lib/aws-events';
import { CodePipeline as CodePipelineTarget } from 'aws-cdk-lib/aws-events-targets';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { MdaaParamAndOutput, MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import {
  INLINE_POLICY_SUPPRESSIONS,
  CODEBUILD_SOURCE_SUPPRESSIONS,
  S3_REPLICATION_SUPPRESSIONS,
  validateProjectName,
  throwConfigValidationError,
  SeedCodeHelper,
  addEcrReadPolicy,
  addCloudWatchLogsPolicy,
  addSageMakerTags,
  addCrossAccountKmsPolicy,
  CDK_DEFAULT_BOOTSTRAP_QUALIFIER,
  validateConnectionArn,
  validateAccountId,
  SourceType,
  CodeStarConnectionConfig,
  BuildPolicyConfig,
  buildManagedPolicies,
} from '@aws-mdaa/sm-shared';

const MAX_REPO_NAME_LENGTH = 100;
const MAX_CODEBUILD_PROJECT_NAME_LENGTH = 150;
const MAX_RULE_NAME_LENGTH = 64;

export interface DeployEnvironmentConfig {
  /** AWS account ID — required for cross-account deployment (preProd/prod), ignored for dev (uses current account) */
  readonly accountId?: string;
  /** AWS region — required for cross-account deployment (preProd/prod), ignored for dev (uses current region) */
  readonly region?: string;
  /** VPC ID for endpoint deployment — optional regardless of environment */
  readonly vpcId?: string;
  /** Subnet IDs for endpoint deployment — optional regardless of environment */
  readonly subnetIds?: string[];
  /** Security group IDs for endpoint deployment — optional regardless of environment */
  readonly securityGroupIds?: string[];
}

export interface SageMakerModelDeployL3ConstructProps extends MdaaL3ConstructProps {
  /** SageMaker project name */
  readonly projectName: string;
  /** SageMaker domain ID */
  readonly domainId?: string;
  /** SageMaker domain ARN */
  readonly domainArn?: string;
  /** Model Package Group name (from model-training SSM output) */
  readonly modelPackageGroupName: string;
  /** Model bucket name (from model-training SSM output) */
  readonly modelBucketName: string;
  /** Enable network isolation for endpoints */
  readonly enableNetworkIsolation?: boolean;
  /** Enable manual approval gate before production deployment (default: true) */
  readonly enableManualApproval?: boolean;
  /** Enable EventBridge trigger on model package approval */
  readonly enableEventBridgeTrigger?: boolean;
  /** Enable data capture on deployed endpoints */
  readonly enableDataCapture?: boolean;
  /** Dev environment config */
  readonly devEnvironment?: DeployEnvironmentConfig;
  /** Pre-prod environment config */
  readonly preProdEnvironment?: DeployEnvironmentConfig;
  /** Prod environment config */
  readonly prodEnvironment?: DeployEnvironmentConfig;
  /** S3 bucket name containing pipeline model artifacts (for cross-bucket endpoint access) */
  readonly pipelineBucketName?: string;
  /** KMS key ARN for pipeline bucket (required when pipelineBucketName is set and bucket uses KMS) */
  readonly pipelineKmsKeyArn?: string;
  /** Path to seed code directory or zip file (required). */
  readonly seedCodePath?: string;
  /** Source repository type (default: CODECOMMIT) */
  readonly sourceType?: SourceType;
  /** CodeStar Connections config (required when sourceType is CODESTAR_CONNECTIONS) */
  readonly codeStarConnection?: CodeStarConnectionConfig;
  /** CDK bootstrap qualifier for cross-account role ARNs (default: 'hnb659fds') */
  readonly cdkBootstrapQualifier?: string;
  /** Additional IAM policies to attach to the build roles. Use this to grant the build environment access to private registries (CodeArtifact, ECR), secrets, or other AWS services needed by the buildspec. */
  readonly buildPolicies?: BuildPolicyConfig[];
}

/**
 * L3 construct for SageMaker Model Deployment pipeline.
 *
 * Creates a CDK self-mutating CodeBuild project that deploys model endpoints across
 * dev, pre-prod, and prod environments with optional manual approval gates
 * and EventBridge triggers on model package approval.
 *
 * Exports SSM parameters:
 * - endpoint-name
 * - pipeline-name
 * - repo-name
 */

export class SageMakerModelDeployL3Construct extends MdaaL3Construct {
  protected readonly props: SageMakerModelDeployL3ConstructProps;
  private kmsKey!: MdaaKmsKey;
  private pipelineBucket!: MdaaBucket;
  private stageRoles!: Map<string, MdaaRole>;
  private sharedPolicy!: MdaaManagedPolicy;
  private sagemakerEndpointRole!: MdaaRole;
  private uniqueAccountIds!: string[];

  constructor(scope: Construct, id: string, props: SageMakerModelDeployL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.validateProps();
    addSageMakerTags(this, props.projectName, props.domainId, props.domainArn);

    this.createKmsKeyAndBucket();
    this.createSageMakerEndpointRole();
    this.createCodeBuildRoles();

    const { envVars, repoName, codeCommitRepo } = this.buildEnvironmentVariables();
    const { pipeline, buildProjects, devProject } = this.createPipeline(envVars, codeCommitRepo);

    this.createEventBridgeTrigger(pipeline);

    this.addNagSuppressions(buildProjects, pipeline);
    this.createSsmExports(repoName, devProject, pipeline);
  }

  private validateProps(): void {
    const props = this.props;
    validateProjectName(props.projectName);
    if (!props.modelBucketName) {
      throwConfigValidationError('modelBucketName is required for model deploy construct.');
    }
    if (!props.modelPackageGroupName) {
      throwConfigValidationError('modelPackageGroupName is required for model deploy construct.');
    }
    if (props.preProdEnvironment?.accountId) {
      validateAccountId(props.preProdEnvironment.accountId, 'preProdEnvironment.accountId');
      if (!props.preProdEnvironment?.region) {
        throwConfigValidationError(
          'preProdEnvironment.region is required when preProdEnvironment.accountId is specified.',
        );
      }
    }
    if (props.prodEnvironment?.accountId) {
      validateAccountId(props.prodEnvironment.accountId, 'prodEnvironment.accountId');
      if (!props.prodEnvironment?.region) {
        throwConfigValidationError('prodEnvironment.region is required when prodEnvironment.accountId is specified.');
      }
    }

    const sourceType = props.sourceType ?? SourceType.CODECOMMIT;
    if (sourceType === SourceType.CODESTAR_CONNECTIONS) {
      if (!props.codeStarConnection) {
        throw new Error('codeStarConnection is required when sourceType is CODESTAR_CONNECTIONS');
      }
      validateConnectionArn(props.codeStarConnection.connectionArn);
    } else if (!props.seedCodePath) {
      throw new Error('seedCodePath is required when sourceType is CODECOMMIT');
    }
  }

  private createKmsKeyAndBucket(): void {
    const props = this.props;
    const projectName = props.projectName;

    this.kmsKey = new MdaaKmsKey(this, 'deploy-kms-key', {
      alias: `model-deploy-${projectName}`,
      naming: props.naming,
    });

    const allAccountIds = [
      ...(props.preProdEnvironment?.accountId ? [props.preProdEnvironment.accountId] : []),
      ...(props.prodEnvironment?.accountId ? [props.prodEnvironment.accountId] : []),
    ];
    this.uniqueAccountIds = [...new Set(allAccountIds)];
    addCrossAccountKmsPolicy(this.kmsKey, this.uniqueAccountIds, [
      ...DECRYPT_ACTIONS,
      ...ENCRYPT_ACTIONS,
      'kms:GenerateDataKey*',
    ]);

    this.pipelineBucket = new MdaaBucket(this, 'deploy-pipeline-artifacts', {
      naming: props.naming,
      bucketName: `deploy-${projectName}`,
      encryptionKey: this.kmsKey,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(this.pipelineBucket, S3_REPLICATION_SUPPRESSIONS, true);
  }

  private createSageMakerEndpointRole(): void {
    const props = this.props;

    this.sagemakerEndpointRole = new MdaaRole(this, 'deploy-sagemaker-role', {
      naming: props.naming,
      roleName: `deploy-exec-${props.projectName}`,
      assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
    });

    addEcrReadPolicy(this.sagemakerEndpointRole);
    addCloudWatchLogsPolicy(this.sagemakerEndpointRole, '/aws/sagemaker/');

    this.sagemakerEndpointRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject', 's3:ListBucket'],
        resources: [
          `arn:${Aws.PARTITION}:s3:::${props.modelBucketName}`,
          `arn:${Aws.PARTITION}:s3:::${props.modelBucketName}/*`,
        ],
      }),
    );

    if (props.pipelineBucketName) {
      this.sagemakerEndpointRole.addToPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:ListBucket'],
          resources: [
            `arn:${Aws.PARTITION}:s3:::${props.pipelineBucketName}`,
            `arn:${Aws.PARTITION}:s3:::${props.pipelineBucketName}/*`,
          ],
        }),
      );
      if (props.pipelineKmsKeyArn) {
        this.sagemakerEndpointRole.addToPolicy(
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['kms:Decrypt', 'kms:DescribeKey'],
            resources: [props.pipelineKmsKeyArn],
          }),
        );
      }
    }

    this.kmsKey.grantEncryptDecrypt(this.sagemakerEndpointRole);
  }

  private createCodeBuildRoles(): void {
    const props = this.props;
    const projectName = props.projectName;

    this.createSharedCodeBuildPolicy();

    // Determine which stages are active
    const stages: { name: string; accountId?: string; region?: string }[] = [
      { name: 'dev' },
      ...(props.preProdEnvironment?.accountId
        ? [{ name: 'preprod', accountId: props.preProdEnvironment.accountId, region: props.preProdEnvironment.region }]
        : []),
      ...(props.prodEnvironment?.accountId
        ? [{ name: 'prod', accountId: props.prodEnvironment.accountId, region: props.prodEnvironment.region }]
        : []),
    ];

    this.stageRoles = new Map();
    const cdkBootstrapQualifier = props.cdkBootstrapQualifier ?? CDK_DEFAULT_BOOTSTRAP_QUALIFIER;
    const cdkRoleSuffixes = ['deploy-role', 'file-publishing-role', 'lookup-role'];
    const org = props.naming.props.org;

    const buildPolicyManagedPolicies = buildManagedPolicies({
      scope: this,
      naming: props.naming,
      policyNamePrefix: 'deploy-cb',
      projectName: props.projectName,
      buildPolicies: props.buildPolicies,
    });

    for (const stage of stages) {
      const role = new MdaaRole(this, `deploy-${stage.name}-codebuild-role`, {
        naming: props.naming,
        roleName: `deploy-cb-${stage.name}-${projectName}`,
        assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
        managedPolicies: buildPolicyManagedPolicies,
      });

      role.addManagedPolicy(this.sharedPolicy);

      // Per-stage CDK bootstrap role assumptions
      const targetAccountId = stage.accountId ?? Aws.ACCOUNT_ID;
      const targetRegion = stage.region ?? Aws.REGION;
      const cdkRoleArns = cdkRoleSuffixes.map(
        suffix =>
          `arn:${Aws.PARTITION}:iam::${targetAccountId}:role/cdk-${cdkBootstrapQualifier}-${suffix}-${targetAccountId}-${targetRegion}`,
      );
      role.addToPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['sts:AssumeRole'],
          resources: cdkRoleArns,
        }),
      );

      // Per-stage SSM read for cross-account parameters
      if (stage.accountId && stage.region) {
        role.addToPolicy(
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['ssm:GetParameter'],
            resources: [`arn:${Aws.PARTITION}:ssm:${stage.region}:${stage.accountId}:parameter/${org}/*`],
          }),
        );
      }

      addCloudWatchLogsPolicy(role, '/aws/codebuild/');

      this.stageRoles.set(stage.name, role);
    }
  }

  /** Creates a shared managed policy with permissions common to all deploy stage roles. */
  private createSharedCodeBuildPolicy(): void {
    const props = this.props;
    const modelPackageGroupName = props.modelPackageGroupName;
    const org = props.naming.props.org;

    const statements: PolicyStatement[] = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:DescribeModelPackageGroup'],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model-package-group/${modelPackageGroupName}`,
        ],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:DescribeModelPackage', 'sagemaker:ListModelPackages', 'sagemaker:UpdateModelPackage'],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model-package/${modelPackageGroupName}/*`,
        ],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:CreateModel', 'sagemaker:DeleteModel', 'sagemaker:DescribeModel'],
        resources: [`arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model/*`],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:CreateEndpoint',
          'sagemaker:UpdateEndpoint',
          'sagemaker:DeleteEndpoint',
          'sagemaker:DescribeEndpoint',
          'sagemaker:CreateEndpointConfig',
          'sagemaker:DeleteEndpointConfig',
          'sagemaker:DescribeEndpointConfig',
        ],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:endpoint/*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:endpoint-config/*`,
        ],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [this.sagemakerEndpointRole.roleArn],
        conditions: {
          StringEquals: { 'iam:PassedToService': 'sagemaker.amazonaws.com' },
        },
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket', 's3:GetBucketLocation'],
        resources: [`arn:${Aws.PARTITION}:s3:::${org}-*`, `arn:${Aws.PARTITION}:s3:::${org}-*/*`],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt', 'kms:Encrypt', 'kms:GenerateDataKey', 'kms:DescribeKey'],
        resources: [`arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:key/*`],
        conditions: {
          StringEquals: {
            'kms:CallerAccount': Aws.ACCOUNT_ID,
            'kms:ViaService': `s3.${Aws.REGION}.amazonaws.com`,
          },
        },
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'cloudformation:CreateStack',
          'cloudformation:UpdateStack',
          'cloudformation:DeleteStack',
          'cloudformation:DescribeStacks',
          'cloudformation:DescribeStackEvents',
          'cloudformation:GetTemplate',
          'cloudformation:CreateChangeSet',
          'cloudformation:DescribeChangeSet',
          'cloudformation:ExecuteChangeSet',
          'cloudformation:DeleteChangeSet',
          'cloudformation:GetTemplateSummary',
        ],
        resources: [`arn:${Aws.PARTITION}:cloudformation:${Aws.REGION}:${Aws.ACCOUNT_ID}:stack/${org}-*`],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket', 's3:GetBucketLocation'],
        resources: [
          `arn:${Aws.PARTITION}:s3:::cdk-*-assets-${Aws.ACCOUNT_ID}-${Aws.REGION}`,
          `arn:${Aws.PARTITION}:s3:::cdk-*-assets-${Aws.ACCOUNT_ID}-${Aws.REGION}/*`,
        ],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ssm:PutParameter', 'ssm:GetParameter', 'ssm:DeleteParameter', 'ssm:GetParameters'],
        resources: [`arn:${Aws.PARTITION}:ssm:${Aws.REGION}:${Aws.ACCOUNT_ID}:parameter/${org}/*`],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: [`arn:${Aws.PARTITION}:ssm:${Aws.REGION}:${Aws.ACCOUNT_ID}:parameter/cdk-bootstrap/*`],
      }),
    ];

    this.sharedPolicy = new MdaaManagedPolicy(this, 'deploy-shared-policy', {
      naming: props.naming,
      managedPolicyName: `deploy-cb-shared-${props.projectName}`,
      statements,
      roles: [],
    });

    // Grant pipeline bucket and KMS access via the shared policy
    this.pipelineBucket.grantReadWrite(this.sharedPolicy);
    this.kmsKey.grantEncryptDecrypt(this.sharedPolicy);
  }

  private addDeployEnvVars(
    envVars: Record<string, { value: string }>,
    prefix: string,
    env: DeployEnvironmentConfig,
  ): void {
    if (env.accountId) envVars[`${prefix}_ACCOUNT_ID`] = { value: env.accountId };
    if (env.region) envVars[`${prefix}_REGION`] = { value: env.region };
    if (env.vpcId) envVars[`${prefix}_VPC_ID`] = { value: env.vpcId };
    envVars[`${prefix}_SUBNET_IDS`] = { value: JSON.stringify(env.subnetIds ?? []) };
    envVars[`${prefix}_SECURITY_GROUP_IDS`] = { value: JSON.stringify(env.securityGroupIds ?? []) };
  }

  private buildEnvironmentVariables(): {
    envVars: Record<string, { value: string }>;
    repoName: string;
    codeCommitRepo: Repository | undefined;
  } {
    const props = this.props;
    const projectName = props.projectName;
    const sourceType = props.sourceType ?? SourceType.CODECOMMIT;

    const envVars: { [key: string]: { value: string } } = {
      MODEL_PACKAGE_GROUP_NAME: { value: props.modelPackageGroupName },
      MODEL_BUCKET_NAME: { value: props.modelBucketName },
      MODEL_BUCKET_ARN: { value: `arn:${Aws.PARTITION}:s3:::${props.modelBucketName}` },
      PROJECT_NAME: { value: projectName },
      DEV_ACCOUNT_ID: { value: Aws.ACCOUNT_ID },
      DEV_REGION: { value: Aws.REGION },
      ENABLE_NETWORK_ISOLATION: { value: String(props.enableNetworkIsolation ?? true) },
      ENABLE_MANUAL_APPROVAL: { value: String(props.enableManualApproval ?? true) },
      MDAA_CREATES_EVENTBRIDGE_RULE: { value: String(props.enableEventBridgeTrigger !== false) },
      ENABLE_DATA_CAPTURE: { value: String(props.enableDataCapture ?? true) },
      SAGEMAKER_EXECUTION_ROLE_ARN: { value: this.sagemakerEndpointRole.roleArn },
      MDAA_ORG: { value: props.naming.props.org },
      MDAA_ENV: { value: props.naming.props.env },
    };

    if (props.domainId) {
      envVars['DOMAIN_ID'] = { value: props.domainId };
    }
    if (props.domainArn) {
      envVars['DOMAIN_ARN'] = { value: props.domainArn };
    }
    if (props.pipelineBucketName) {
      envVars['PIPELINE_BUCKET_NAME'] = { value: props.pipelineBucketName };
      envVars['PIPELINE_BUCKET_ARN'] = { value: `arn:${Aws.PARTITION}:s3:::${props.pipelineBucketName}` };
      if (props.pipelineKmsKeyArn) envVars['PIPELINE_KMS_ARN'] = { value: props.pipelineKmsKeyArn };
    }

    if (props.devEnvironment) {
      if (props.devEnvironment.vpcId) envVars['DEV_VPC_ID'] = { value: props.devEnvironment.vpcId };
      envVars['DEV_SUBNET_IDS'] = { value: JSON.stringify(props.devEnvironment.subnetIds ?? []) };
      envVars['DEV_SECURITY_GROUP_IDS'] = { value: JSON.stringify(props.devEnvironment.securityGroupIds ?? []) };
    }
    if (props.preProdEnvironment) this.addDeployEnvVars(envVars, 'PRE_PROD', props.preProdEnvironment);
    if (props.prodEnvironment) this.addDeployEnvVars(envVars, 'PROD', props.prodEnvironment);

    let repoName: string;
    let codeCommitRepo: Repository | undefined;

    if (sourceType === SourceType.CODESTAR_CONNECTIONS) {
      const conn = props.codeStarConnection!;
      repoName = `${conn.owner}/${conn.repo}`;
    } else {
      codeCommitRepo = new Repository(this, 'deploy-source-repo', {
        repositoryName: props.naming.resourceName(`${projectName}-deploy`, MAX_REPO_NAME_LENGTH),
        description: `Model deployment pipeline for ${projectName}`,
        code: Code.fromZipFile(SeedCodeHelper.resolveSeedCodeZip(props.seedCodePath!), 'main'),
      });
      repoName = codeCommitRepo.repositoryName;
    }

    envVars['DEPLOY_REPO_NAME'] = { value: repoName };

    return { envVars, repoName, codeCommitRepo };
  }

  private createPipeline(
    envVars: Record<string, { value: string }>,
    codeCommitRepo: Repository | undefined,
  ): { pipeline: Pipeline; buildProjects: PipelineProject[]; devProject: PipelineProject } {
    const props = this.props;
    const projectName = props.projectName;
    const sourceType = props.sourceType ?? SourceType.CODECOMMIT;

    const createStageProject = (stage: string): PipelineProject => {
      const stageEnvVars = {
        ...envVars,
        DEPLOY_STAGE: { value: stage },
      };
      const stageRole = this.stageRoles.get(stage)!;
      return new PipelineProject(this, `deploy-${stage}-project`, {
        projectName: props.naming.resourceName(`deploy-${stage}-${projectName}`, MAX_CODEBUILD_PROJECT_NAME_LENGTH),
        role: stageRole,
        buildSpec: BuildSpec.fromSourceFilename('buildspec.yml'),
        environment: {
          buildImage: LinuxBuildImage.STANDARD_7_0,
          environmentVariables: stageEnvVars,
        },
        encryptionKey: this.kmsKey,
      });
    };

    const sourceArtifact = new Artifact('SourceOutput');
    const deployPipeline = new Pipeline(this, 'deploy-pipeline', {
      pipelineName: props.naming.resourceName(`${projectName}-deploy`, MAX_REPO_NAME_LENGTH),
      artifactBucket: this.pipelineBucket,
    });

    if (sourceType === SourceType.CODESTAR_CONNECTIONS) {
      const conn = props.codeStarConnection!;

      deployPipeline.addStage({
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

      deployPipeline.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['codestar-connections:UseConnection'],
          resources: [conn.connectionArn],
        }),
      );
    } else {
      deployPipeline.addStage({
        stageName: 'Source',
        actions: [
          new CodeCommitSourceAction({
            actionName: 'Source',
            repository: codeCommitRepo!,
            output: sourceArtifact,
            branch: 'main',
          }),
        ],
      });
    }

    const devProject = createStageProject('dev');
    deployPipeline.addStage({
      stageName: 'DeployDev',
      actions: [
        new CodeBuildAction({
          actionName: 'Deploy',
          project: devProject,
          input: sourceArtifact,
        }),
      ],
    });

    const buildProjects: PipelineProject[] = [devProject];

    if (props.preProdEnvironment?.accountId) {
      if (props.enableManualApproval !== false) {
        deployPipeline.addStage({
          stageName: 'ApprovePreProd',
          actions: [
            new ManualApprovalAction({
              actionName: 'Approve',
              additionalInformation: `Approve deployment to pre-prod (${props.preProdEnvironment.accountId})`,
            }),
          ],
        });
      }
      const preProdProject = createStageProject('preprod');
      deployPipeline.addStage({
        stageName: 'DeployPreProd',
        actions: [
          new CodeBuildAction({
            actionName: 'Deploy',
            project: preProdProject,
            input: sourceArtifact,
          }),
        ],
      });
      buildProjects.push(preProdProject);
    }

    if (props.prodEnvironment?.accountId) {
      if (props.enableManualApproval !== false) {
        deployPipeline.addStage({
          stageName: 'ApproveProd',
          actions: [
            new ManualApprovalAction({
              actionName: 'Approve',
              additionalInformation: `Approve deployment to prod (${props.prodEnvironment.accountId})`,
            }),
          ],
        });
      }
      const prodProject = createStageProject('prod');
      deployPipeline.addStage({
        stageName: 'DeployProd',
        actions: [
          new CodeBuildAction({
            actionName: 'Deploy',
            project: prodProject,
            input: sourceArtifact,
          }),
        ],
      });
      buildProjects.push(prodProject);
    }

    return { pipeline: deployPipeline, buildProjects, devProject };
  }

  private createEventBridgeTrigger(pipeline: Pipeline): void {
    const props = this.props;
    if (props.enableEventBridgeTrigger !== false) {
      new Rule(this, 'model-approval-trigger', {
        ruleName: props.naming.resourceName(`${props.projectName}-model-approved`, MAX_RULE_NAME_LENGTH),
        description: `Trigger deploy when a model in ${props.modelPackageGroupName} is approved`,
        eventPattern: {
          source: ['aws.sagemaker'],
          detailType: ['SageMaker Model Package State Change'],
          detail: {
            ModelPackageGroupName: [props.modelPackageGroupName],
            ModelApprovalStatus: ['Approved'],
          },
        },
        targets: [new CodePipelineTarget(pipeline)],
      });
    }
  }

  private addNagSuppressions(buildProjects: PipelineProject[], pipeline: Pipeline): void {
    const sourceType = this.props.sourceType ?? SourceType.CODECOMMIT;

    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.sagemakerEndpointRole,
      [
        ...INLINE_POLICY_SUPPRESSIONS,
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Wildcard permissions required: ecr:GetAuthorizationToken is an account-level API that does not ' +
            'support resource-level permissions. CloudWatch log resource names are dynamically generated.',
        },
      ],
      true,
    );

    const codeBuildRoleSuppressions = [
      ...INLINE_POLICY_SUPPRESSIONS,
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'Wildcard permissions required: codebuild:CreateReportGroup/BatchPutCodeCoverages do not support ' +
          'resource-level permissions ' +
          '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_awscodebuild.html). ' +
          'CloudWatch Logs log group names are dynamically generated by CodeBuild at runtime ' +
          '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchlogs.html).',
      },
    ];
    for (const role of this.stageRoles.values()) {
      MdaaNagSuppressions.addCodeResourceSuppressions(role, codeBuildRoleSuppressions, true);
    }

    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.sharedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Wildcard permissions required: sagemaker:CreateModel/DeleteModel/DescribeModel require wildcard on model ' +
            'names since they are dynamically generated at runtime ' +
            '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html). ' +
            'KMS key wildcards are scoped via kms:CallerAccount and kms:ViaService conditions. ' +
            'sts:GetServiceBearerToken does not support resource-level permissions and is scoped via ' +
            'sts:AWSServiceName condition ' +
            '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_awssecuritytokenservice.html). ' +
            'CloudFormation stack wildcards use org-scoped prefix (stack/${org}-*) since stack names are generated at deploy time ' +
            '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_awscloudformation.html). ' +
            'CDK assets bucket wildcards (cdk-*-assets-*) are required because the bootstrap qualifier segment is configurable. ' +
            'S3 and SSM resources use org-scoped prefixes where object names are dynamically generated.',
        },
      ],
      true,
    );

    if (sourceType === SourceType.CODECOMMIT) {
      for (const proj of buildProjects) {
        MdaaNagSuppressions.addCodeResourceSuppressions(
          proj,
          [...CODEBUILD_SOURCE_SUPPRESSIONS, ...S3_REPLICATION_SUPPRESSIONS],
          true,
        );
      }
    } else {
      for (const proj of buildProjects) {
        MdaaNagSuppressions.addCodeResourceSuppressions(
          proj,
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

    MdaaNagSuppressions.addCodeResourceSuppressions(
      pipeline,
      [
        ...INLINE_POLICY_SUPPRESSIONS,
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'CodePipeline requires wildcard permissions for S3 artifact operations ' +
            'where object keys are dynamically generated during pipeline execution.',
        },
      ],
      true,
    );
  }

  private createSsmExports(repoName: string, devProject: PipelineProject, pipeline: Pipeline): void {
    const projectName = this.props.projectName;

    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'model-deploy',
      resourceId: projectName,
      name: 'endpoint-name-prefix',
      value: `${projectName}-endpoint`,
    });

    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'model-deploy',
      resourceId: projectName,
      name: 'codebuild-project-name',
      value: devProject.projectName,
    });

    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'model-deploy',
      resourceId: projectName,
      name: 'pipeline-name',
      value: pipeline.pipelineName,
    });

    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'model-deploy',
      resourceId: projectName,
      name: 'repo-name',
      value: repoName,
    });
  }
}

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey, DECRYPT_ACTIONS, ENCRYPT_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Construct } from 'constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { Aws, Stack } from 'aws-cdk-lib';
import * as fs from 'node:fs';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { AccountPrincipal, Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnModelPackageGroup } from 'aws-cdk-lib/aws-sagemaker';
import { BucketDeployment, ServerSideEncryption, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { MdaaParamAndOutput, MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import {
  INLINE_POLICY_SUPPRESSIONS,
  S3_REPLICATION_SUPPRESSIONS,
  validateProjectName,
  addEcrReadPolicy,
  addCloudWatchLogsPolicy,
  addVpcNetworkPolicy,
  addSageMakerTags,
  addCdkDeployPolicy,
  validateVpcConfig,
  validateAccountId,
  validateConnectionArn,
  SourceType,
  CodeStarConnectionConfig,
  SAGEMAKER_TAG_ACTIONS,
  addCrossAccountKmsPolicy,
  addPipelineSourceStage,
  addBuildProjectNagSuppressions,
} from '@aws-mdaa/sm-shared';

const MAX_MODEL_PACKAGE_GROUP_NAME_LENGTH = 63;
const MAX_PIPELINE_NAME_LENGTH = 256;
const MAX_CODEBUILD_PROJECT_NAME_LENGTH = 150;
const MAX_REPO_AND_PIPELINE_NAME_LENGTH = 100;

export interface ModelTrainingEnvironmentConfig {
  /** VPC ID for SageMaker training jobs */
  readonly vpcId?: string;
  /** Subnet IDs for SageMaker training jobs */
  readonly subnetIds?: string[];
  /** Security group IDs for SageMaker training jobs */
  readonly securityGroupIds?: string[];
}

export interface SageMakerModelTrainingL3ConstructProps extends MdaaL3ConstructProps {
  /** SageMaker project name */
  readonly projectName: string;
  /** SageMaker domain ID (from Studio) */
  readonly domainId?: string;
  /** SageMaker domain ARN (from Studio) */
  readonly domainArn?: string;
  /** Enable network isolation for training jobs */
  readonly enableNetworkIsolation?: boolean;
  /** Enable inter-container traffic encryption */
  readonly enableInterContainerEncryption?: boolean;
  /** Dev environment config */
  readonly devEnvironment?: ModelTrainingEnvironmentConfig;
  /** Pre-prod account ID for cross-account model registry access */
  readonly preProdAccountId?: string;
  /** Prod account ID for cross-account model registry access */
  readonly prodAccountId?: string;
  /** Path to seed code directory or zip file (required). */
  readonly seedCodePath?: string;
  /** Source repository type (default: CODECOMMIT) */
  readonly sourceType?: SourceType;
  /** CodeStar Connections config (required when sourceType is CODESTAR_CONNECTIONS) */
  readonly codeStarConnection?: CodeStarConnectionConfig;
  /** CDK bootstrap qualifier for role ARNs (default: 'hnb659fds') */
  readonly cdkBootstrapQualifier?: string;
  /** Prefix used by seed code when naming SageMaker jobs (default: projectName). Used to scope IAM resource ARNs. */
  readonly baseJobPrefix?: string;
  /** Path to a local directory containing training data files to upload to the pipeline S3 bucket.
   * Files are uploaded to s3://<pipeline-bucket>/dataset/ during CDK deploy via BucketDeployment.
   * This avoids routing datasets through CodeCommit. For datasets larger than ~500MB,
   * upload directly to S3 and override the InputDataUrl pipeline parameter instead. */
  readonly trainingDataPath?: string;
}

/**
 * L3 construct for SageMaker Model Training pipeline.
 *
 * Creates:
 * - Model Package Group for model versioning
 * - S3 bucket for model artifacts (KMS encrypted via MdaaBucket)
 * - S3 bucket for pipeline artifacts
 * - CodeCommit repository for seed code
 * - CodeBuild project for pipeline execution
 * - CodePipeline for CI/CD
 * - IAM roles for SageMaker execution and CodeBuild
 *
 * Exports SSM parameters:
 * - model-package-group-name
 * - model-package-group-arn
 * - model-bucket-name
 * - pipeline-name
 * - repo-name
 */

export class SageMakerModelTrainingL3Construct extends MdaaL3Construct {
  protected readonly props: SageMakerModelTrainingL3ConstructProps;

  public readonly modelPackageGroupName: string;
  public readonly modelBucketName: string;
  public readonly pipelineBucketName: string;
  public readonly pipelineKmsKeyArn: string;

  private kmsKey!: MdaaKmsKey;
  private modelBucket!: MdaaBucket;
  private pipelineBucket!: MdaaBucket;
  private crossAccountIds!: string[];
  private sagemakerExecutionRole!: MdaaRole;
  private codeBuildRole!: MdaaRole;

  constructor(scope: Construct, id: string, props: SageMakerModelTrainingL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.validateProps();

    this.createKmsKeyAndBuckets();
    this.modelBucketName = this.modelBucket.bucketName;
    this.pipelineBucketName = this.pipelineBucket.bucketName;
    this.pipelineKmsKeyArn = this.kmsKey.keyArn;

    const mpg = this.createModelPackageGroup();
    this.modelPackageGroupName = this.props.naming.resourceName(
      `${props.projectName}-mpg`,
      MAX_MODEL_PACKAGE_GROUP_NAME_LENGTH,
    );

    this.deployTrainingData();
    this.createSageMakerExecutionRole();
    this.createCodeBuildRole();

    addSageMakerTags(this, props.projectName, props.domainId, props.domainArn);

    const { pipeline, buildProject, repoName } = this.createPipeline();
    this.addNagSuppressions(buildProject, pipeline);
    this.createSsmExports(mpg, pipeline, repoName);
  }

  private validateProps(): void {
    const props = this.props;
    validateProjectName(props.projectName);

    if (props.preProdAccountId) validateAccountId(props.preProdAccountId, 'preProdAccountId');
    if (props.prodAccountId) validateAccountId(props.prodAccountId, 'prodAccountId');

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

  private createKmsKeyAndBuckets(): void {
    const props = this.props;
    const projectName = props.projectName;

    this.kmsKey = new MdaaKmsKey(this, 'artifacts-kms-key', {
      alias: `model-training-${projectName}`,
      naming: props.naming,
    });

    this.crossAccountIds = [
      ...new Set([
        ...(props.preProdAccountId ? [props.preProdAccountId] : []),
        ...(props.prodAccountId ? [props.prodAccountId] : []),
      ]),
    ];
    addCrossAccountKmsPolicy(this.kmsKey, this.crossAccountIds, [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS]);

    this.modelBucket = new MdaaBucket(this, 'model-artifacts', {
      naming: props.naming,
      bucketName: `model-${projectName}`,
      encryptionKey: this.kmsKey,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(this.modelBucket, S3_REPLICATION_SUPPRESSIONS, true);

    if (this.crossAccountIds.length > 0) {
      this.modelBucket.addToResourcePolicy(
        new PolicyStatement({
          sid: 'CrossAccountModelAccess',
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:GetBucketLocation', 's3:ListBucket'],
          resources: [this.modelBucket.arnForObjects('*'), this.modelBucket.bucketArn],
          principals: this.crossAccountIds.map(id => new AccountPrincipal(id)),
        }),
      );
    }

    this.pipelineBucket = new MdaaBucket(this, 'pipeline-artifacts', {
      naming: props.naming,
      bucketName: `pipeline-${projectName}`,
      encryptionKey: this.kmsKey,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(this.pipelineBucket, S3_REPLICATION_SUPPRESSIONS, true);

    if (this.crossAccountIds.length > 0) {
      this.pipelineBucket.addToResourcePolicy(
        new PolicyStatement({
          sid: 'CrossAccountPipelineAccess',
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:GetBucketLocation', 's3:ListBucket'],
          resources: [this.pipelineBucket.arnForObjects('*'), this.pipelineBucket.bucketArn],
          principals: this.crossAccountIds.map(id => new AccountPrincipal(id)),
        }),
      );
    }
  }

  private deployTrainingData(): void {
    const dataPath = this.props.trainingDataPath;
    if (!dataPath) return;

    if (!fs.existsSync(dataPath) || !fs.statSync(dataPath).isDirectory()) {
      throw new Error(`trainingDataPath '${dataPath}' does not exist or is not a directory`);
    }

    const deployment = new BucketDeployment(this, 'training-data-deployment', {
      sources: [Source.asset(dataPath)],
      destinationBucket: this.pipelineBucket,
      destinationKeyPrefix: 'dataset',
      extract: true,
      memoryLimit: 256,
      serverSideEncryption: ServerSideEncryption.AWS_KMS,
      serverSideEncryptionAwsKmsKeyId: this.kmsKey.keyId,
    });

    this.kmsKey.grantEncryptDecrypt(deployment.handlerRole);

    const nagReason = 'BucketDeployment custom resource managed by CDK. One-time deployment, not production traffic.';
    const nagSuppressions = [
      { id: 'AwsSolutions-L1', reason: nagReason },
      { id: 'AwsSolutions-IAM4', reason: nagReason },
      { id: 'AwsSolutions-IAM5', reason: nagReason },
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: nagReason },
      { id: 'NIST.800.53.R5-LambdaConcurrency', reason: nagReason },
      { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: nagReason },
      { id: 'NIST.800.53.R5-LambdaDLQ', reason: nagReason },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: nagReason },
      { id: 'HIPAA.Security-LambdaConcurrency', reason: nagReason },
      { id: 'HIPAA.Security-LambdaInsideVPC', reason: nagReason },
      { id: 'HIPAA.Security-LambdaDLQ', reason: nagReason },
      { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: nagReason },
      { id: 'PCI.DSS.321-LambdaInsideVPC', reason: nagReason },
    ];

    MdaaNagSuppressions.addCodeResourceSuppressions(deployment, nagSuppressions, true);

    Stack.of(this).node.children.forEach(child => {
      if (child.node.id.includes('Custom::CDKBucketDeployment')) {
        MdaaNagSuppressions.addCodeResourceSuppressions(child, nagSuppressions, true);
      }
    });
  }

  private createModelPackageGroup(): CfnModelPackageGroup {
    const props = this.props;
    const projectName = props.projectName;
    const modelPackageGroupName = props.naming.resourceName(`${projectName}-mpg`, MAX_MODEL_PACKAGE_GROUP_NAME_LENGTH);

    const mpg = new CfnModelPackageGroup(this, 'model-package-group', {
      modelPackageGroupName,
      modelPackageGroupDescription: `Model Package Group for ${projectName}`,
    });

    if (this.crossAccountIds.length > 0) {
      const mpgPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'CrossAccountModelAccess',
            Effect: 'Allow',
            Principal: {
              AWS: this.crossAccountIds.map(id => `arn:${Aws.PARTITION}:iam::${id}:root`),
            },
            Action: [
              'sagemaker:DescribeModelPackageGroup',
              'sagemaker:DescribeModelPackage',
              'sagemaker:ListModelPackages',
              'sagemaker:CreateModel',
            ],
            Resource: [
              `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model-package-group/${modelPackageGroupName}`,
              `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model-package/${modelPackageGroupName}/*`,
            ],
          },
        ],
      };
      mpg.addPropertyOverride('ModelPackageGroupPolicy', mpgPolicy);
    }

    return mpg;
  }

  private createSageMakerExecutionRole(): void {
    const props = this.props;
    const projectName = props.projectName;
    const baseJobPrefix = props.baseJobPrefix ?? projectName;
    const modelPackageGroupName = props.naming.resourceName(`${projectName}-mpg`, MAX_MODEL_PACKAGE_GROUP_NAME_LENGTH);

    this.sagemakerExecutionRole = new MdaaRole(this, 'sagemaker-execution-role', {
      naming: props.naming,
      roleName: `train-exec-${projectName}`,
      assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
    });

    this.sagemakerExecutionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:CreateModel',
          'sagemaker:DeleteModel',
          'sagemaker:DescribeModel',
          'sagemaker:CreateProcessingJob',
          'sagemaker:DescribeProcessingJob',
          'sagemaker:StopProcessingJob',
          'sagemaker:CreateTrainingJob',
          'sagemaker:DescribeTrainingJob',
          'sagemaker:StopTrainingJob',
          ...SAGEMAKER_TAG_ACTIONS,
        ],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model/${baseJobPrefix}*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:processing-job/${baseJobPrefix}*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:training-job/${baseJobPrefix}*`,
        ],
      }),
    );

    this.sagemakerExecutionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:CreateModelPackageGroup',
          'sagemaker:DescribeModelPackageGroup',
          'sagemaker:CreateModelPackage',
          'sagemaker:UpdateModelPackage',
          'sagemaker:DescribeModelPackage',
          'sagemaker:ListModelPackages',
          ...SAGEMAKER_TAG_ACTIONS,
        ],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model-package-group/${modelPackageGroupName}`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model-package/${modelPackageGroupName}/*`,
        ],
      }),
    );

    addEcrReadPolicy(this.sagemakerExecutionRole);
    addCloudWatchLogsPolicy(this.sagemakerExecutionRole, '/aws/sagemaker/');

    this.modelBucket.grantReadWrite(this.sagemakerExecutionRole);
    this.kmsKey.grantEncryptDecrypt(this.sagemakerExecutionRole);

    this.sagemakerExecutionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject', 's3:GetBucketLocation', 's3:ListBucket'],
        resources: [
          `arn:${Aws.PARTITION}:s3:::sagemaker-servicecatalog-seedcode-${Aws.REGION}`,
          `arn:${Aws.PARTITION}:s3:::sagemaker-servicecatalog-seedcode-${Aws.REGION}/*`,
        ],
      }),
    );

    this.sagemakerExecutionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [this.sagemakerExecutionRole.roleArn],
        conditions: {
          StringEquals: { 'iam:PassedToService': 'sagemaker.amazonaws.com' },
        },
      }),
    );

    if (validateVpcConfig(props.devEnvironment ?? {})) {
      addVpcNetworkPolicy(this.sagemakerExecutionRole);
    }
  }

  private createCodeBuildRole(): void {
    const props = this.props;
    const projectName = props.projectName;
    const modelPackageGroupName = props.naming.resourceName(`${projectName}-mpg`, MAX_MODEL_PACKAGE_GROUP_NAME_LENGTH);

    this.codeBuildRole = new MdaaRole(this, 'codebuild-role', {
      naming: props.naming,
      roleName: `train-cb-${projectName}`,
      assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
    });

    this.codeBuildRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:CreatePipeline',
          'sagemaker:UpdatePipeline',
          'sagemaker:DeletePipeline',
          'sagemaker:StartPipelineExecution',
          'sagemaker:StopPipelineExecution',
          'sagemaker:DescribePipelineExecution',
          'sagemaker:ListPipelineExecutionSteps',
          ...SAGEMAKER_TAG_ACTIONS,
        ],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:pipeline/${projectName}*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:pipeline/${projectName}*/execution/*`,
        ],
      }),
    );

    this.codeBuildRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:DescribeModelPackage',
          'sagemaker:ListModelPackages',
          'sagemaker:UpdateModelPackage',
          ...SAGEMAKER_TAG_ACTIONS,
        ],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model-package/${modelPackageGroupName}/*`,
        ],
      }),
    );

    addCloudWatchLogsPolicy(this.codeBuildRole, '/aws/codebuild/');

    this.codeBuildRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:DescribeImageVersion'],
        resources: [`arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:image-version/*`],
      }),
    );

    this.codeBuildRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [this.sagemakerExecutionRole.roleArn],
        conditions: {
          StringEquals: { 'iam:PassedToService': 'sagemaker.amazonaws.com' },
        },
      }),
    );

    this.modelBucket.grantReadWrite(this.codeBuildRole);
    this.pipelineBucket.grantReadWrite(this.codeBuildRole);
    this.kmsKey.grantEncryptDecrypt(this.codeBuildRole);

    this.codeBuildRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: [`arn:${Aws.PARTITION}:ssm:${Aws.REGION}:${Aws.ACCOUNT_ID}:parameter/cdk-bootstrap/*`],
      }),
    );
    addCdkDeployPolicy(this.codeBuildRole, props.naming.props.org, props.cdkBootstrapQualifier);

    this.codeBuildRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:StartPipelineExecution', 'sagemaker:DescribePipeline'],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:pipeline/${props.naming.props.org}-*`,
        ],
      }),
    );
  }

  private createPipeline(): { pipeline: Pipeline; buildProject: PipelineProject; repoName: string } {
    const props = this.props;
    const projectName = props.projectName;
    const sourceType = props.sourceType ?? SourceType.CODECOMMIT;
    const modelPackageGroupName = props.naming.resourceName(`${projectName}-mpg`, MAX_MODEL_PACKAGE_GROUP_NAME_LENGTH);
    const sagemakerPipelineName = props.naming.resourceName(`${projectName}-pipeline`, MAX_PIPELINE_NAME_LENGTH);
    const sagemakerPipelineDescription = `${projectName} Model Build Pipeline`;

    const buildProject = new PipelineProject(this, 'build-project', {
      projectName: props.naming.resourceName(`build-${projectName}`, MAX_CODEBUILD_PROJECT_NAME_LENGTH),
      role: this.codeBuildRole,
      buildSpec: BuildSpec.fromSourceFilename('buildspec.yml'),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
        environmentVariables: {
          SAGEMAKER_PROJECT_NAME: { value: projectName },
          MODEL_PACKAGE_GROUP_NAME: { value: modelPackageGroupName },
          SAGEMAKER_PIPELINE_NAME: { value: sagemakerPipelineName },
          SAGEMAKER_PIPELINE_DESCRIPTION: { value: sagemakerPipelineDescription },
          SAGEMAKER_PIPELINE_ROLE_ARN: { value: this.sagemakerExecutionRole.roleArn },
          ARTIFACT_BUCKET: { value: this.modelBucket.bucketName },
          ARTIFACT_BUCKET_KMS_ID: { value: this.kmsKey.keyId },
          AWS_REGION: { value: Aws.REGION },
          ENABLE_NETWORK_ISOLATION: { value: String(props.enableNetworkIsolation ?? true) },
          ENCRYPT_INTER_CONTAINER_TRAFFIC: { value: String(props.enableInterContainerEncryption ?? true) },
          SUBNET_IDS: { value: JSON.stringify(props.devEnvironment?.subnetIds ?? []) },
          SECURITY_GROUP_IDS: { value: JSON.stringify(props.devEnvironment?.securityGroupIds ?? []) },
          MDAA_ORG: { value: props.naming.props.org },
          PIPELINE_BUCKET_NAME: { value: this.pipelineBucket.bucketName },
          PIPELINE_KMS_ARN: { value: this.kmsKey.keyArn },
          ...(props.preProdAccountId ? { PRE_PROD_ACCOUNT_ID: { value: props.preProdAccountId } } : {}),
          ...(props.prodAccountId ? { PROD_ACCOUNT_ID: { value: props.prodAccountId } } : {}),
        },
      },
      encryptionKey: this.kmsKey,
    });

    const sourceArtifact = new Artifact('SourceOutput');
    const pipeline = new Pipeline(this, 'pipeline', {
      pipelineName: props.naming.resourceName(`${projectName}-build`, MAX_REPO_AND_PIPELINE_NAME_LENGTH),
      artifactBucket: this.pipelineBucket,
    });

    const repoName = addPipelineSourceStage({
      scope: this,
      pipeline,
      sourceArtifact,
      sourceType,
      repoConstructId: 'source-repo',
      repoName: props.naming.resourceName(`${projectName}-build`, MAX_REPO_AND_PIPELINE_NAME_LENGTH),
      repoDescription: `Model training build pipeline for ${projectName}`,
      seedCodePath: props.seedCodePath,
      codeStarConnection: props.codeStarConnection,
    });

    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new CodeBuildAction({
          actionName: 'BuildAndTrain',
          project: buildProject,
          input: sourceArtifact,
        }),
      ],
    });

    return { pipeline, buildProject, repoName };
  }

  private addNagSuppressions(buildProject: PipelineProject, pipeline: Pipeline): void {
    const sourceType = this.props.sourceType ?? SourceType.CODECOMMIT;

    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.sagemakerExecutionRole,
      [
        ...INLINE_POLICY_SUPPRESSIONS,
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Wildcard permissions required for ECR image access, SageMaker resource creation, ' +
            'and EC2 network interface operations where resource names are dynamically generated.',
        },
      ],
      true,
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.codeBuildRole,
      [
        ...INLINE_POLICY_SUPPRESSIONS,
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Wildcard permissions required for SageMaker pipeline operations and S3 artifact access ' +
            'where resource names are dynamically generated.',
        },
      ],
      true,
    );

    addBuildProjectNagSuppressions(buildProject, sourceType);

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

  private createSsmExports(mpg: CfnModelPackageGroup, pipeline: Pipeline, repoName: string): void {
    const projectName = this.props.projectName;

    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'model-training',
      resourceId: projectName,
      name: 'model-package-group-name',
      value: this.modelPackageGroupName,
    });

    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'model-training',
      resourceId: projectName,
      name: 'model-package-group-arn',
      value: mpg.attrModelPackageGroupArn,
    });

    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'model-training',
      resourceId: projectName,
      name: 'model-bucket-name',
      value: this.modelBucket.bucketName,
    });

    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'model-training',
      resourceId: projectName,
      name: 'pipeline-name',
      value: pipeline.pipelineName,
    });

    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'model-training',
      resourceId: projectName,
      name: 'repo-name',
      value: repoName,
    });
  }
}

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Construct } from 'constructs';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { Aws } from 'aws-cdk-lib';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { MdaaParamAndOutput, MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import {
  INLINE_POLICY_SUPPRESSIONS,
  S3_REPLICATION_SUPPRESSIONS,
  throwConfigValidationError,
  validateProjectName,
  addEcrReadPolicy,
  addCloudWatchLogsPolicy,
  addCdkDeployPolicy,
  addSageMakerTags,
  addVpcNetworkPolicy,
  validateVpcConfig,
  validateConnectionArn,
  SourceType,
  CodeStarConnectionConfig,
  addPipelineSourceStage,
  addBuildProjectNagSuppressions,
} from '@aws-mdaa/sm-shared';

const MAX_CODEBUILD_PROJECT_NAME_LENGTH = 150;
const MAX_REPO_AND_PIPELINE_NAME_LENGTH = 100;

export interface SageMakerBatchInferenceL3ConstructProps extends MdaaL3ConstructProps {
  /** SageMaker project name */
  readonly projectName: string;
  /** SageMaker project ID (unique identifier, distinct from projectName) */
  readonly projectId?: string;
  /** SageMaker domain ID */
  readonly domainId?: string;
  /** SageMaker domain ARN */
  readonly domainArn?: string;
  /** Model Package Group name (from model-training) */
  readonly modelPackageGroupName: string;
  /** Model bucket name (from model-training) */
  readonly modelBucketName: string;
  /** S3 URI for batch input data */
  readonly inputDataS3Uri?: string;
  /** S3 prefix for batch output data */
  readonly outputDataS3Prefix?: string;
  /** Additional S3 bucket names the SageMaker role needs read access to (e.g. input data bucket if different from pipeline bucket) */
  readonly additionalReadBucketNames?: string[];
  /** Additional S3 bucket names the SageMaker role needs write access to (e.g. output data bucket if different from pipeline bucket) */
  readonly additionalWriteBucketNames?: string[];
  /** Instance type for batch transform */
  readonly instanceType?: string;
  /** Instance count for batch transform */
  readonly instanceCount?: number;
  /** Base job prefix for SageMaker pipeline */
  readonly baseJobPrefix?: string;
  /** Optional. When provided, grants the SageMaker role read access to model artifacts in the training pipeline bucket
   *  (needed when model packages reference model.tar.gz stored there rather than in modelBucketName). */
  readonly trainingPipelineBucketName?: string;
  /** Path to seed code directory or zip file (required). */
  readonly seedCodePath?: string;
  /** Source repository type (default: CODECOMMIT) */
  readonly sourceType?: SourceType;
  /** CodeStar Connections config (required when sourceType is CODESTAR_CONNECTIONS) */
  readonly codeStarConnection?: CodeStarConnectionConfig;
  /** Enable network isolation for SageMaker jobs */
  readonly enableNetworkIsolation?: boolean;
  /** Subnet IDs for SageMaker jobs (VPC mode) */
  readonly subnetIds?: string[];
  /** Security group IDs for SageMaker jobs (VPC mode) */
  readonly securityGroupIds?: string[];
  /** CDK bootstrap qualifier for role ARNs (default: 'hnb659fds') */
  readonly cdkBootstrapQualifier?: string;
}

/**
 * L3 construct for SageMaker Batch Inference pipeline.
 *
 * Creates a CodePipeline that runs batch transform jobs using a registered
 * model package. Reads input from S3 and writes output to S3.
 *
 * Exports SSM parameters:
 * - pipeline-name
 * - repo-name
 */
export class SageMakerBatchInferenceL3Construct extends MdaaL3Construct {
  protected readonly props: SageMakerBatchInferenceL3ConstructProps;

  private kmsKey!: MdaaKmsKey;
  private pipelineBucket!: MdaaBucket;
  private sagemakerRole!: MdaaRole;
  private codeBuildRole!: MdaaRole;

  constructor(scope: Construct, id: string, props: SageMakerBatchInferenceL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.validateProps();

    addSageMakerTags(this, props.projectName, props.domainId, props.domainArn);

    this.createKmsKeyAndBuckets();
    this.createSageMakerRole();
    this.createCodeBuildRole();

    const { pipeline, buildProject, repoName } = this.createPipeline();
    this.addNagSuppressions(buildProject, pipeline);
    this.createSsmExports(pipeline, repoName);
  }

  private validateProps(): void {
    const props = this.props;
    const projectName = props.projectName;
    validateProjectName(projectName);

    const sourceType = props.sourceType ?? SourceType.CODECOMMIT;
    if (sourceType === SourceType.CODESTAR_CONNECTIONS) {
      if (!props.codeStarConnection) {
        throw new Error('codeStarConnection is required when sourceType is CODESTAR_CONNECTIONS');
      }
      validateConnectionArn(props.codeStarConnection.connectionArn);
    } else if (!props.seedCodePath) {
      throw new Error('seedCodePath is required when sourceType is CODECOMMIT');
    }

    if (props.instanceType && !/^ml\.[a-z\d]+\.\w+$/.test(props.instanceType)) {
      throwConfigValidationError(
        `Invalid instanceType '${props.instanceType}'. ` +
          `Expected SageMaker instance type format (e.g. 'ml.m5.xlarge', 'ml.p3.2xlarge').`,
      );
    }

    if (props.instanceCount !== undefined && (props.instanceCount < 1 || !Number.isInteger(props.instanceCount))) {
      throwConfigValidationError(`instanceCount must be a positive integer. Received: ${props.instanceCount}.`);
    }
  }

  private createKmsKeyAndBuckets(): void {
    const props = this.props;
    const projectName = props.projectName;

    this.kmsKey = new MdaaKmsKey(this, 'batch-kms-key', {
      alias: `batch-inference-${projectName}`,
      naming: props.naming,
    });

    this.pipelineBucket = new MdaaBucket(this, 'batch-pipeline-artifacts', {
      naming: props.naming,
      bucketName: `batch-${projectName}`,
      encryptionKey: this.kmsKey,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(this.pipelineBucket, S3_REPLICATION_SUPPRESSIONS, true);
  }

  private createSageMakerRole(): void {
    const props = this.props;
    const projectName = props.projectName;
    const modelPackageGroupName = props.modelPackageGroupName;

    this.sagemakerRole = new MdaaRole(this, 'batch-sagemaker-role', {
      naming: props.naming,
      roleName: `batch-exec-${projectName}`,
      assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
    });

    this.sagemakerRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:CreateTransformJob',
          'sagemaker:DescribeTransformJob',
          'sagemaker:StopTransformJob',
          'sagemaker:CreateModel',
          'sagemaker:DeleteModel',
          'sagemaker:DescribeModel',
          'sagemaker:CreateProcessingJob',
          'sagemaker:DescribeProcessingJob',
          'sagemaker:StopProcessingJob',
          'sagemaker:AddTags',
          'sagemaker:DeleteTags',
          'sagemaker:ListTags',
        ],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:transform-job/*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model/*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:processing-job/*`,
        ],
      }),
    );

    this.sagemakerRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:DescribeModelPackage',
          'sagemaker:ListModelPackages',
          'sagemaker:DescribeModelPackageGroup',
        ],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model-package-group/${modelPackageGroupName}`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model-package/${modelPackageGroupName}/*`,
        ],
      }),
    );

    this.sagemakerRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject', 's3:ListBucket', 's3:GetBucketLocation'],
        resources: [
          `arn:${Aws.PARTITION}:s3:::${props.modelBucketName}`,
          `arn:${Aws.PARTITION}:s3:::${props.modelBucketName}/*`,
        ],
      }),
    );

    this.pipelineBucket.grantReadWrite(this.sagemakerRole);

    if (props.trainingPipelineBucketName) {
      this.sagemakerRole.addToPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:ListBucket', 's3:GetBucketLocation'],
          resources: [
            `arn:${Aws.PARTITION}:s3:::${props.trainingPipelineBucketName}`,
            `arn:${Aws.PARTITION}:s3:::${props.trainingPipelineBucketName}/*`,
          ],
        }),
      );
    }

    for (const bucketName of props.additionalReadBucketNames ?? []) {
      this.sagemakerRole.addToPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:ListBucket', 's3:GetBucketLocation'],
          resources: [`arn:${Aws.PARTITION}:s3:::${bucketName}`, `arn:${Aws.PARTITION}:s3:::${bucketName}/*`],
        }),
      );
    }

    // KMS key/* wildcard: additional bucket KMS key ARNs are unknown at deploy time.
    // Mitigated by kms:ViaService (S3 only) and kms:CallerAccount conditions.
    if ((props.additionalReadBucketNames?.length ?? 0) > 0 || (props.additionalWriteBucketNames?.length ?? 0) > 0) {
      this.sagemakerRole.addToPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['kms:Decrypt', 'kms:DescribeKey', 'kms:GenerateDataKey'],
          resources: [`arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:key/*`],
          conditions: {
            StringEquals: {
              'kms:CallerAccount': Aws.ACCOUNT_ID,
              'kms:ViaService': `s3.${Aws.REGION}.amazonaws.com`,
            },
          },
        }),
      );
    }

    for (const bucketName of props.additionalWriteBucketNames ?? []) {
      this.sagemakerRole.addToPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket', 's3:GetBucketLocation'],
          resources: [`arn:${Aws.PARTITION}:s3:::${bucketName}`, `arn:${Aws.PARTITION}:s3:::${bucketName}/*`],
        }),
      );
    }

    // iam:PassRole is required for SageMaker to assume this role when creating
    // models and transform jobs during batch inference.
    // https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-roles.html#sagemaker-roles-pass-role
    this.sagemakerRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [this.sagemakerRole.roleArn],
        conditions: {
          StringEquals: { 'iam:PassedToService': 'sagemaker.amazonaws.com' },
        },
      }),
    );

    addEcrReadPolicy(this.sagemakerRole);

    addCloudWatchLogsPolicy(this.sagemakerRole, '/aws/sagemaker/');

    this.kmsKey.grantEncryptDecrypt(this.sagemakerRole);

    if (validateVpcConfig({ subnetIds: props.subnetIds, securityGroupIds: props.securityGroupIds })) {
      addVpcNetworkPolicy(this.sagemakerRole);
    }

    this.sagemakerRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject', 's3:GetBucketLocation', 's3:ListBucket'],
        resources: [
          `arn:${Aws.PARTITION}:s3:::sagemaker-servicecatalog-seedcode-${Aws.REGION}`,
          `arn:${Aws.PARTITION}:s3:::sagemaker-servicecatalog-seedcode-${Aws.REGION}/*`,
        ],
      }),
    );
  }

  private createCodeBuildRole(): void {
    const props = this.props;
    const projectName = props.projectName;

    this.codeBuildRole = new MdaaRole(this, 'batch-codebuild-role', {
      naming: props.naming,
      roleName: `batch-cb-${projectName}`,
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
          'sagemaker:AddTags',
          'sagemaker:DeleteTags',
          'sagemaker:ListTags',
        ],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:pipeline/${projectName}`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:pipeline/${projectName}/execution/*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:pipeline/${projectName}-*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:pipeline/${projectName}-*/execution/*`,
        ],
      }),
    );

    this.codeBuildRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:DescribeModelPackage', 'sagemaker:ListModelPackages'],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model-package/${props.modelPackageGroupName}/*`,
        ],
      }),
    );

    this.codeBuildRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:DescribeImageVersion'],
        resources: [`arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:image-version/*`],
      }),
    );

    addCloudWatchLogsPolicy(this.codeBuildRole, '/aws/codebuild/');

    this.codeBuildRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [this.sagemakerRole.roleArn],
        conditions: { StringEquals: { 'iam:PassedToService': 'sagemaker.amazonaws.com' } },
      }),
    );

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
  }

  private createPipeline(): { pipeline: Pipeline; buildProject: PipelineProject; repoName: string } {
    const props = this.props;
    const projectName = props.projectName;
    const sourceType = props.sourceType ?? SourceType.CODECOMMIT;

    const buildProject = new PipelineProject(this, 'batch-build-project', {
      projectName: props.naming.resourceName(`batch-${projectName}`, MAX_CODEBUILD_PROJECT_NAME_LENGTH),
      role: this.codeBuildRole,
      buildSpec: BuildSpec.fromSourceFilename('buildspec.yml'),
      environment: {
        buildImage: LinuxBuildImage.STANDARD_7_0,
        environmentVariables: {
          SAGEMAKER_PROJECT_NAME: { value: projectName },
          ...(props.projectId ? { SAGEMAKER_PROJECT_ID: { value: props.projectId } } : {}),
          SAGEMAKER_DOMAIN_ID: { value: props.domainId ?? '' },
          SAGEMAKER_DOMAIN_ARN: { value: props.domainArn ?? '' },
          MODEL_PACKAGE_GROUP_NAME: { value: props.modelPackageGroupName },
          SAGEMAKER_PIPELINE_ROLE_ARN: { value: this.sagemakerRole.roleArn },
          ARTIFACT_BUCKET: { value: this.pipelineBucket.bucketName },
          ARTIFACT_BUCKET_KMS_ID: { value: this.kmsKey.keyId },
          MODEL_BUCKET_NAME: { value: props.modelBucketName },
          TRAINING_PIPELINE_BUCKET: { value: props.trainingPipelineBucketName ?? '' },
          BASE_JOB_PREFIX: { value: props.baseJobPrefix ?? projectName },
          INSTANCE_TYPE: { value: props.instanceType ?? 'ml.m5.xlarge' },
          INSTANCE_COUNT: { value: String(props.instanceCount ?? 1) },
          INPUT_DATA_S3_URI: { value: props.inputDataS3Uri ?? '' },
          OUTPUT_DATA_S3_PREFIX: { value: props.outputDataS3Prefix ?? '' },
          ENABLE_NETWORK_ISOLATION: { value: String(props.enableNetworkIsolation ?? true) },
          SUBNET_IDS: { value: JSON.stringify(props.subnetIds ?? []) },
          SECURITY_GROUP_IDS: { value: JSON.stringify(props.securityGroupIds ?? []) },
          MDAA_ORG: { value: props.naming.props.org },
        },
      },
      encryptionKey: this.kmsKey,
    });

    const sourceArtifact = new Artifact('BatchSourceOutput');
    const pipeline = new Pipeline(this, 'batch-pipeline', {
      pipelineName: props.naming.resourceName(`${projectName}-batch`, MAX_REPO_AND_PIPELINE_NAME_LENGTH),
      artifactBucket: this.pipelineBucket,
    });

    const repoName = addPipelineSourceStage({
      scope: this,
      pipeline,
      sourceArtifact,
      sourceType,
      repoConstructId: 'batch-source-repo',
      repoName: props.naming.resourceName(`${projectName}-batch`, MAX_REPO_AND_PIPELINE_NAME_LENGTH),
      repoDescription: `Batch inference pipeline for ${projectName}`,
      seedCodePath: props.seedCodePath,
      codeStarConnection: props.codeStarConnection,
    });

    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new CodeBuildAction({
          actionName: 'BatchInference',
          project: buildProject,
          input: sourceArtifact,
        }),
      ],
    });

    return { pipeline, buildProject, repoName };
  }

  private addNagSuppressions(buildProject: PipelineProject, pipeline: Pipeline): void {
    const props = this.props;
    const sourceType = props.sourceType ?? SourceType.CODECOMMIT;

    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.sagemakerRole,
      [
        ...INLINE_POLICY_SUPPRESSIONS,
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Wildcard permissions required for ECR, SageMaker transform/model resources, and S3 objects. Managed policies are not used because they grant broader permissions than needed; inline policies allow least-privilege scoping to construct-specific resources.',
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
          reason: 'Wildcard permissions required for SageMaker pipeline operations and S3 artifact access.',
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
          reason: 'CodePipeline requires wildcard permissions for S3 artifact operations.',
        },
      ],
      true,
    );
  }

  private createSsmExports(pipeline: Pipeline, repoName: string): void {
    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'batch-inference',
      resourceId: this.props.projectName,
      name: 'pipeline-name',
      value: pipeline.pipelineName,
    });

    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'batch-inference',
      resourceId: this.props.projectName,
      name: 'repo-name',
      value: repoName,
    });
  }
}

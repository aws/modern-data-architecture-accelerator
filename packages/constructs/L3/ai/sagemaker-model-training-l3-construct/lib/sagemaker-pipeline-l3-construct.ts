/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey, DECRYPT_ACTIONS, ENCRYPT_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Construct } from 'constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { Aws, Fn } from 'aws-cdk-lib';
import { CfnPipeline as CfnSageMakerPipeline, CfnModelPackageGroup } from 'aws-cdk-lib/aws-sagemaker';
import { AccountPrincipal, Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { MdaaParamAndOutput, MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import {
  INLINE_POLICY_SUPPRESSIONS,
  S3_REPLICATION_SUPPRESSIONS,
  validateProjectName,
  addEcrReadPolicy,
  addCloudWatchLogsPolicy,
  addVpcNetworkPolicy,
  addSageMakerTags,
  SAGEMAKER_TAG_ACTIONS,
  validateVpcConfig,
  validateAccountId,
  addCrossAccountKmsPolicy,
} from '@aws-mdaa/sm-shared';
import { PipelineStep, PipelineNetworkConfig } from './steps/pipeline-step';
import { SmPipelineDefinition, PipelineParameter } from './steps/pipeline-definition';

type Mutable<T> = { -readonly [P in keyof T]: T[P] };

const MAX_MODEL_PACKAGE_GROUP_NAME_LENGTH = 63;
const MAX_PIPELINE_NAME_LENGTH = 256;

/**
 * Placeholder for the pipeline execution role ARN in step definitions.
 * Resolved at deploy time via CloudFormation Fn::Sub.
 */
export const PIPELINE_ROLE_PLACEHOLDER = '__PIPELINE_ROLE_ARN__';

/**
 * Placeholder for the pipeline KMS key ID in step definitions.
 * Resolved at deploy time via CloudFormation Fn::Sub.
 */
export const PIPELINE_KMS_PLACEHOLDER = '__PIPELINE_KMS_KEY_ID__';

/** Placeholder for the pipeline's default S3 bucket, resolved via Fn::Sub at deploy time. */
export const DEFAULT_BUCKET_PLACEHOLDER = '<default_bucket>';

/**
 * Props for the CfnPipeline-based SageMaker Pipeline construct.
 *
 * Unlike SageMakerModelTrainingL3ConstructProps which creates CodeBuild + seed code,
 * this construct creates the SageMaker Pipeline definition directly as a CloudFormation
 * resource (CfnPipeline), with full MDAA compliance.
 */
export interface SageMakerPipelineL3ConstructProps extends MdaaL3ConstructProps {
  /** SageMaker project name. */
  readonly projectName: string;
  /** SageMaker domain ID (from Studio). */
  readonly domainId?: string;
  /** SageMaker domain ARN (from Studio). */
  readonly domainArn?: string;
  /** Pipeline-level parameters (overridable at execution time). */
  readonly pipelineParameters?: PipelineParameter[];
  /** Pipeline steps (built using the step construct classes). */
  readonly pipelineSteps: PipelineStep[];
  /** Default network config applied to steps that don't specify their own. */
  readonly networkConfig?: PipelineNetworkConfig;
  /** Pre-prod account ID for cross-account model registry access. */
  readonly preProdAccountId?: string;
  /** Prod account ID for cross-account model registry access. */
  readonly prodAccountId?: string;
  /** SageMaker Model Package Group name. When provided, IAM permissions are scoped to this group. */
  readonly modelPackageGroupName?: string;
  /** Whether to create a new SageMaker Model Package Group. Defaults to true.
   *  Set to false when the Model Package Group already exists (e.g. created by sagemaker-model-training-l3-construct)
   *  and modelPackageGroupName contains a fully-qualified name that must be used as-is. */
  readonly createModelPackageGroup?: boolean;
  /** Explicit pipeline name (if not provided, generated from MDAA naming convention). */
  readonly pipelineName?: string;
  /** Additional S3 bucket names the pipeline execution role needs read access to. */
  readonly additionalReadBucketNames?: string[];
  /** Prefix used by seed code when naming SageMaker jobs (default: projectName). Used to scope IAM resource ARNs. */
  readonly baseJobPrefix?: string;
  /** Existing S3 bucket name to reuse for pipeline artifacts instead of creating a new one.
   *  When provided, the construct imports this bucket and grants the execution role access.
   *  When omitted, a new MdaaBucket is created (standalone mode). */
  readonly pipelineBucketName?: string;
  /** KMS key ARN for the existing pipeline bucket. Required when pipelineBucketName is set. */
  readonly pipelineKmsKeyArn?: string;
}

/**
 * L3 construct for SageMaker Pipeline (CfnPipeline-based).
 *
 * Creates the SageMaker Pipeline definition directly in CloudFormation using
 * CfnPipeline, rather than delegating to CodeBuild + seed code. This gives
 * full MDAA compliance on the pipeline definition itself.
 *
 * Creates:
 * - CfnPipeline with the pipeline definition JSON
 * - Pipeline execution role (MdaaRole with SageMaker principal)
 * - KMS key for artifact encryption (MdaaKmsKey)
 * - S3 bucket for model artifacts (MdaaBucket)
 * - Model Package Group (optional)
 * - SSM parameter exports
 *
 * Use the step construct classes (SmProcessingStep, SmTrainingStep, etc.)
 * to build the pipelineSteps array.
 */
export class SageMakerPipelineL3Construct extends MdaaL3Construct {
  protected readonly props: SageMakerPipelineL3ConstructProps;

  /** The SageMaker Pipeline name. */
  public readonly pipelineName!: string;
  /** The model artifacts bucket name. */
  public readonly modelBucketName!: string;
  /** The SageMaker execution role ARN. */
  public readonly executionRoleArn!: string;
  /** The KMS key ID for artifact encryption. */
  public readonly kmsKeyId!: string;
  /** The Model Package Group name (if created). */
  public readonly modelPackageGroupName?: string;

  private kmsKey!: IKey;
  private modelBucket!: IBucket;
  private crossAccountIds!: string[];
  private executionRole!: MdaaRole;

  constructor(scope: Construct, id: string, props: SageMakerPipelineL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.validateAndInitProps();
    this.createKmsKeyAndBucket();
    this.createModelPackageGroup();
    this.createExecutionRole();

    addSageMakerTags(this, props.projectName, props.domainId, props.domainArn);

    this.createPipeline();
    this.addNagSuppressions();
    this.createSsmExports();
  }

  private validateAndInitProps(): void {
    const props = this.props;
    validateProjectName(props.projectName);
    if (props.preProdAccountId) validateAccountId(props.preProdAccountId, 'preProdAccountId');
    if (props.prodAccountId) validateAccountId(props.prodAccountId, 'prodAccountId');

    this.crossAccountIds = [
      ...new Set([
        ...(props.preProdAccountId ? [props.preProdAccountId] : []),
        ...(props.prodAccountId ? [props.prodAccountId] : []),
      ]),
    ];
  }

  private createKmsKeyAndBucket(): void {
    const props = this.props;
    const projectName = props.projectName;

    if (props.pipelineBucketName && props.pipelineKmsKeyArn) {
      this.kmsKey = Key.fromKeyArn(this, 'imported-kms-key', props.pipelineKmsKeyArn);
      this.modelBucket = Bucket.fromBucketName(this, 'imported-pipeline-bucket', props.pipelineBucketName);
    } else {
      const ownedKmsKey = new MdaaKmsKey(this, 'artifacts-kms-key', {
        alias: `sm-pipeline-${projectName}`,
        naming: props.naming,
      });
      this.kmsKey = ownedKmsKey;

      addCrossAccountKmsPolicy(ownedKmsKey, this.crossAccountIds, [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS]);

      const ownedBucket = new MdaaBucket(this, 'model-artifacts', {
        naming: props.naming,
        bucketName: `pipeline-${projectName}`,
        encryptionKey: ownedKmsKey,
      });
      this.modelBucket = ownedBucket;

      MdaaNagSuppressions.addCodeResourceSuppressions(ownedBucket, S3_REPLICATION_SUPPRESSIONS, true);

      if (this.crossAccountIds.length > 0) {
        ownedBucket.addToResourcePolicy(
          new PolicyStatement({
            sid: 'CrossAccountModelAccess',
            effect: Effect.ALLOW,
            actions: ['s3:GetObject', 's3:GetBucketLocation', 's3:ListBucket'],
            resources: [ownedBucket.arnForObjects('*'), ownedBucket.bucketArn],
            principals: this.crossAccountIds.map(aid => new AccountPrincipal(aid)),
          }),
        );
      }
    }

    (this as Mutable<this>).kmsKeyId = this.kmsKey.keyId;
    (this as Mutable<this>).modelBucketName = this.modelBucket.bucketName;
  }

  private createModelPackageGroup(): void {
    const props = this.props;
    const projectName = props.projectName;

    if (!props.modelPackageGroupName) return;

    const mpgName =
      props.createModelPackageGroup === false
        ? props.modelPackageGroupName
        : props.naming.resourceName(props.modelPackageGroupName, MAX_MODEL_PACKAGE_GROUP_NAME_LENGTH);
    (this as Mutable<this>).modelPackageGroupName = mpgName;

    if (props.createModelPackageGroup !== false) {
      const mpg = new CfnModelPackageGroup(this, 'model-package-group', {
        modelPackageGroupName: mpgName,
        modelPackageGroupDescription: `Model Package Group for ${projectName}`,
      });

      new MdaaParamAndOutput(this, {
        ...props,
        resourceType: 'sm-pipeline',
        resourceId: projectName,
        name: 'model-package-group-arn',
        value: mpg.attrModelPackageGroupArn,
      });
    }

    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: 'sm-pipeline',
      resourceId: projectName,
      name: 'model-package-group-name',
      value: mpgName,
    });
  }

  private createExecutionRole(): void {
    const props = this.props;
    const projectName = props.projectName;
    const baseJobPrefix = props.baseJobPrefix ?? projectName;

    this.executionRole = new MdaaRole(this, 'pipeline-execution-role', {
      naming: props.naming,
      roleName: `pipeline-exec-${projectName}`,
      assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
    });
    (this as Mutable<this>).executionRoleArn = this.executionRole.roleArn;

    this.executionRole.addToPolicy(
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
          'sagemaker:CreateTransformJob',
          'sagemaker:DescribeTransformJob',
          'sagemaker:StopTransformJob',
          'sagemaker:StartPipelineExecution',
          'sagemaker:DescribePipelineExecution',
          'sagemaker:StopPipelineExecution',
          ...SAGEMAKER_TAG_ACTIONS,
        ],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model/${baseJobPrefix}*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model/pipelines-*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:processing-job/${baseJobPrefix}*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:processing-job/pipelines-*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:training-job/${baseJobPrefix}*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:training-job/pipelines-*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:transform-job/${baseJobPrefix}*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:transform-job/pipelines-*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:pipeline/${projectName}*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:pipeline/${projectName}*/execution/*`,
        ],
      }),
    );

    if (this.modelPackageGroupName) {
      this.executionRole.addToPolicy(
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
            `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model-package-group/${this.modelPackageGroupName}`,
            `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model-package/${this.modelPackageGroupName}/*`,
          ],
        }),
      );
    }

    addEcrReadPolicy(this.executionRole);
    addCloudWatchLogsPolicy(this.executionRole, '/aws/sagemaker/');
    this.modelBucket.grantReadWrite(this.executionRole);
    this.kmsKey.grantEncryptDecrypt(this.executionRole);

    // Explicit DescribeKey grant — required when the key is imported (fromKeyArn)
    // because grantEncryptDecrypt may not include it for imported keys.
    // SageMaker calls kms:DescribeKey before creating processing/training jobs.
    this.executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:DescribeKey'],
        resources: [this.kmsKey.keyArn],
      }),
    );

    for (const bucketName of props.additionalReadBucketNames ?? []) {
      this.executionRole.addToPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:ListBucket', 's3:GetBucketLocation'],
          resources: [`arn:${Aws.PARTITION}:s3:::${bucketName}`, `arn:${Aws.PARTITION}:s3:::${bucketName}/*`],
        }),
      );
    }

    if ((props.additionalReadBucketNames?.length ?? 0) > 0) {
      this.executionRole.addToPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['kms:Decrypt', 'kms:DescribeKey'],
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

    this.executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:CreateGrant'],
        resources: [this.kmsKey.keyArn],
        conditions: {
          Bool: { 'kms:GrantIsForAWSResource': 'true' },
        },
      }),
    );

    this.executionRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [this.executionRole.roleArn],
        conditions: {
          StringEquals: { 'iam:PassedToService': 'sagemaker.amazonaws.com' },
        },
      }),
    );

    if (validateVpcConfig(props.networkConfig ?? {})) {
      addVpcNetworkPolicy(this.executionRole);
    }
  }

  private createPipeline(): void {
    const props = this.props;
    const projectName = props.projectName;

    const pipelineDefinition = new SmPipelineDefinition({
      parameters: props.pipelineParameters,
      steps: props.pipelineSteps,
    });

    (this as Mutable<this>).pipelineName =
      props.pipelineName ?? props.naming.resourceName(`${projectName}-sm-pipeline`, MAX_PIPELINE_NAME_LENGTH);

    const rawJson = pipelineDefinition.toJSON();
    const templateJson = rawJson
      .replace(new RegExp(PIPELINE_ROLE_PLACEHOLDER, 'g'), '${PipelineRoleArn}')
      .replace(new RegExp(PIPELINE_KMS_PLACEHOLDER, 'g'), '${PipelineKmsKeyId}')
      .replace(new RegExp(DEFAULT_BUCKET_PLACEHOLDER.replace(/[<>]/g, '\\$&'), 'g'), '${DefaultBucket}');

    const cfnPipeline = new CfnSageMakerPipeline(this, 'sagemaker-pipeline', {
      pipelineName: this.pipelineName,
      pipelineDescription: `${projectName} ML Pipeline`,
      pipelineDefinition: {},
      roleArn: this.executionRole.roleArn,
    });

    cfnPipeline.addPropertyOverride(
      'PipelineDefinition.PipelineDefinitionBody',
      Fn.sub(templateJson, {
        PipelineRoleArn: this.executionRole.roleArn,
        PipelineKmsKeyId: this.kmsKey.keyId,
        DefaultBucket: this.modelBucket.bucketName,
      }),
    );
  }

  private addNagSuppressions(): void {
    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.executionRole,
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
  }

  private createSsmExports(): void {
    const props = this.props;
    const projectName = props.projectName;

    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: 'sm-pipeline',
      resourceId: projectName,
      name: 'pipeline-name',
      value: this.pipelineName,
    });

    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: 'sm-pipeline',
      resourceId: projectName,
      name: 'pipeline-arn',
      value: `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:pipeline/${this.pipelineName}`,
    });

    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: 'sm-pipeline',
      resourceId: projectName,
      name: 'execution-role-arn',
      value: this.executionRole.roleArn,
    });

    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: 'sm-pipeline',
      resourceId: projectName,
      name: 'model-bucket-name',
      value: this.modelBucket.bucketName,
    });

    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: 'sm-pipeline',
      resourceId: projectName,
      name: 'kms-key-id',
      value: this.kmsKey.keyId,
    });
  }
}

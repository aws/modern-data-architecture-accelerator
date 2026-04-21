/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Aws, Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NagSuppressions } from 'cdk-nag';
import { INLINE_POLICY_SUPPRESSIONS, LAMBDA_SUPPRESSIONS } from './nag-constants';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaParamAndOutput, MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { HttpMethods } from 'aws-cdk-lib/aws-s3';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Function as LambdaFunction, Runtime, Code as LambdaCode } from 'aws-cdk-lib/aws-lambda';
import { Effect, IRole, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as scheduler from 'aws-cdk-lib/aws-scheduler';
import * as sagemaker from 'aws-cdk-lib/aws-sagemaker';
import * as path from 'path';

/**
 * Supported Ground Truth task types.
 * This exported type may include values not yet fully supported by the L3 construct
 * (e.g., future video/3D point cloud types). The construct validates at runtime that
 * the provided task type is in SUPPORTED_TASK_TYPES and throws a descriptive error otherwise.
 */
export type GroundTruthTaskType =
  | 'image_bounding_box'
  | 'image_semantic_segmentation'
  | 'image_single_label_classification'
  | 'image_multi_label_classification'
  | 'text_single_label_classification'
  | 'text_multi_label_classification'
  | 'named_entity_recognition';

/** Labeling task configuration */
export interface GroundTruthLabelingTaskConfig {
  /** Title of the labeling task shown to workers */
  readonly taskTitle: string;
  /** Description of the labeling task */
  readonly taskDescription: string;
  /** Keywords for the labeling task */
  readonly taskKeywords: string[];
  /** ARN of the workteam */
  readonly workteamArn: string;
  /** S3 URI for the labeling UI template (optional for built-in types) */
  readonly templateS3Uri?: string;
  /** S3 URI for the categories file */
  readonly categoriesS3Uri: string;
  /** Workers per data object (default: 1) */
  readonly numberOfHumanWorkersPerDataObject?: number;
  /** Time limit per task in seconds (default: 300) */
  readonly taskTimeLimitInSeconds?: number;
  /** Task availability lifetime in seconds (default: 21600) */
  readonly taskAvailabilityLifetimeInSeconds?: number;
}

/** Verification step configuration (optional) */
export interface GroundTruthVerificationConfig {
  /** ARN of the verification workteam */
  readonly workteamArn: string;
  /** S3 URI for the verification UI template */
  readonly templateS3Uri?: string;
  /** S3 URI for the verification categories file */
  readonly categoriesS3Uri?: string;
  /** Title of the verification task */
  readonly taskTitle: string;
  /** Description of the verification task */
  readonly taskDescription: string;
  /** Keywords for the verification task */
  readonly taskKeywords?: string[];
  /** Workers per data object for verification (default: 1) */
  readonly numberOfHumanWorkersPerDataObject?: number;
  /** Time limit per verification task in seconds (default: 300) */
  readonly taskTimeLimitInSeconds?: number;
  /** Task availability lifetime in seconds (default: 21600) */
  readonly taskAvailabilityLifetimeInSeconds?: number;
}

/** SQS queue configuration */
export interface GroundTruthSqsConfig {
  /** Queue message retention period in minutes (default: 20160 = 14 days) */
  readonly queueRetentionPeriodMinutes?: number;
  /** Queue visibility timeout in minutes (default: 720 = 12 hours) */
  readonly queueVisibilityTimeoutMinutes?: number;
  /** Max receive count before DLQ (default: 3) */
  readonly maxReceiveCount?: number;
  /** DLQ message retention period in minutes (default: 20160 = 14 days) */
  readonly dlqRetentionPeriodMinutes?: number;
  /** DLQ visibility timeout in minutes (default: 720 = 12 hours) */
  readonly dlqVisibilityTimeoutMinutes?: number;
  /** DLQ alarm threshold (0 to disable, default: 1) */
  readonly dlqAlarmThreshold?: number;
}

/** Feature definition for SageMaker Feature Group */
export interface FeatureDefinitionConfig {
  /** Feature name */
  readonly featureName: string;
  /** Feature type: String, Integral, or Fractional */
  readonly featureType: 'String' | 'Integral' | 'Fractional';
}

/** Props for the SageMaker Ground Truth L3 Construct */
export interface SageMakerGroundTruthL3ConstructProps extends MdaaL3ConstructProps {
  /** Job name prefix for the labeling workflow */
  readonly jobName: string;
  /** The labeling task type */
  readonly taskType: GroundTruthTaskType;
  /** Labeling task configuration */
  readonly labelingTaskConfig: GroundTruthLabelingTaskConfig;
  /** Optional verification step configuration */
  readonly verification?: GroundTruthVerificationConfig;
  /** SQS configuration (optional, uses defaults) */
  readonly sqsConfig?: GroundTruthSqsConfig;
  /** Cron schedule for the labeling workflow (default: "cron(0 12 * * ? *)") */
  readonly workflowSchedule?: string;
  /** Additional feature definitions for the Feature Group (beyond defaults) */
  readonly additionalFeatureDefinitions?: FeatureDefinitionConfig[];
  /**
   * Optional externally-created IAM role for SageMaker Ground Truth labeling jobs.
   * When provided, the construct imports this role and attaches Ground Truth-specific
   * policies (S3, KMS, SageMaker) to it instead of creating a new role.
   *
   * Use this when the Ground Truth role needs access to S3 buckets created by other
   * MDAA modules (e.g., datalake). The external module can grant bucket access to this
   * role before the Ground Truth module deploys.
   *
   * If omitted, the construct creates a new role with sagemaker.amazonaws.com trust.
   */
  readonly groundTruthRole?: MdaaRoleRef;
}

/**
 * Regions that support Ground Truth annotation consolidation Lambda.
 * Deploying to an unsupported region will fail at Lambda initialization time
 * with a descriptive error. Synth-time validation is not possible because
 * Aws.REGION is a CloudFormation token (unresolved until deploy).
 *
 * See: https://docs.aws.amazon.com/sagemaker/latest/dg/sms-annotation-consolidation.html
 */
export const SUPPORTED_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'ca-central-1',
] as const;

// Map of annotation consolidation Lambda account IDs per region
const AC_ARN_MAP: Record<string, string> = {
  'us-east-1': '432418664414',
  'us-east-2': '266458841044',
  'us-west-2': '081040173940',
  'eu-west-1': '568282634449',
  'ap-northeast-1': '477331159723',
  'ap-southeast-2': '454466003867',
  'ap-south-1': '565803892007',
  'eu-central-1': '203001061592',
  'ap-northeast-2': '845288260483',
  'eu-west-2': '487402164563',
  'ap-southeast-1': '377565633583',
  'ca-central-1': '918755190332',
};

/**
 * Runtime list of task types currently supported by this L3 construct.
 * Use for validation. The GroundTruthTaskType union type (exported above)
 * includes future types; this array reflects what the construct can handle today.
 */
export const SUPPORTED_TASK_TYPES: readonly GroundTruthTaskType[] = [
  'image_bounding_box',
  'image_semantic_segmentation',
  'image_single_label_classification',
  'image_multi_label_classification',
  'text_single_label_classification',
  'text_multi_label_classification',
  'named_entity_recognition',
];

// Task type → media type mapping
const TASK_MEDIA_TYPE: Record<GroundTruthTaskType, 'image' | 'text'> = {
  image_bounding_box: 'image',
  image_semantic_segmentation: 'image',
  image_single_label_classification: 'image',
  image_multi_label_classification: 'image',
  text_single_label_classification: 'text',
  text_multi_label_classification: 'text',
  named_entity_recognition: 'text',
};

// Task type → built-in HumanTaskUi name (used when no custom template is provided)
// These are SageMaker-managed UI ARNs: arn:aws:sagemaker:{region}:394669845002:human-task-ui/{name}
const BUILT_IN_HUMAN_TASK_UI: Record<GroundTruthTaskType, string> = {
  image_bounding_box: 'BoundingBox',
  image_semantic_segmentation: 'SemanticSegmentation',
  image_single_label_classification: 'ImageClassification',
  image_multi_label_classification: 'ImageClassificationMultiLabel',
  text_single_label_classification: 'TextClassification',
  text_multi_label_classification: 'TextClassificationMultiLabel',
  named_entity_recognition: 'NamedEntityRecognition',
};

// Task type → Ground Truth annotation consolidation function name
// See: https://docs.aws.amazon.com/sagemaker/latest/dg/sms-annotation-consolidation.html
const FUNCTION_NAME_MAP: Record<GroundTruthTaskType, string> = {
  image_bounding_box: 'BoundingBox',
  image_semantic_segmentation: 'SemanticSegmentation',
  image_single_label_classification: 'ImageMultiClass',
  image_multi_label_classification: 'ImageMultiClassMultiLabel',
  text_single_label_classification: 'TextMultiClass',
  text_multi_label_classification: 'TextMultiClassMultiLabel',
  named_entity_recognition: 'NamedEntityRecognition',
};

/**
 * L3 construct for SageMaker Ground Truth labeling workflows.
 *
 * Creates:
 * - Upload S3 bucket (data landing zone) with SQS notification
 * - SQS queue + DLQ for tracking uploaded data objects
 * - Ground Truth output S3 bucket
 * - SageMaker Feature Group for labeled data storage
 * - Step Functions state machine orchestrating the labeling pipeline
 * - 5-6 Lambda functions (poll SQS, run labeling, run verification, update feature store, return messages)
 * - EventBridge Scheduler for periodic workflow execution
 * - All MDAA-compliant (KMS, IAM, Nag-suppressed)
 */
export class SageMakerGroundTruthL3Construct extends MdaaL3Construct {
  /** Upload bucket for data objects */
  public readonly uploadBucketName: string;
  /** Feature group name */
  public readonly featureGroupName: string;
  /** State machine ARN */
  public readonly stateMachineArn: string;

  private readonly props: SageMakerGroundTruthL3ConstructProps;

  constructor(scope: Construct, id: string, props: SageMakerGroundTruthL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    const jobName = props.jobName;
    const taskType = props.taskType;

    // Validate that the task type is supported by this L3 construct
    if (!SUPPORTED_TASK_TYPES.includes(taskType)) {
      throw new Error(
        `Unsupported task type "${taskType}". This L3 construct supports: ${SUPPORTED_TASK_TYPES.join(', ')}. ` +
          'Video and 3D point cloud task types require custom workflow configuration.',
      );
    }

    const mediaType = TASK_MEDIA_TYPE[taskType];
    const sqsConfig = props.sqsConfig ?? {};

    // --- KMS Key ---
    const kmsKey = new MdaaKmsKey(this, 'kms-key', {
      naming: props.naming,
      alias: `ground-truth-${jobName}`,
    });

    // Grant CloudWatch Logs access to the KMS key (required for encrypted log groups)
    kmsKey.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal(`logs.${Aws.REGION}.amazonaws.com`)],
        actions: ['kms:Encrypt*', 'kms:Decrypt*', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:Describe*'],
        resources: ['*'],
        conditions: {
          ArnLike: {
            'kms:EncryptionContext:aws:logs:arn': `arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:*`,
          },
        },
      }),
    );

    // --- S3 Buckets ---
    const uploadBucket = new MdaaBucket(this, 'upload-bucket', {
      naming: props.naming,
      bucketName: `gt-${jobName}-upload`,
      encryptionKey: kmsKey,
      eventBridgeEnabled: true,
      ...(mediaType === 'image' && {
        corsRules: [
          {
            // SageMaker Ground Truth validates CORS server-side when creating labeling jobs.
            // AllowedOrigins must be '*' per AWS docs — pattern-based origins are rejected.
            // See: https://docs.aws.amazon.com/sagemaker/latest/dg/sms-cors-update.html
            allowedOrigins: ['*'],
            allowedMethods: [HttpMethods.GET],
            allowedHeaders: [],
            exposedHeaders: ['Access-Control-Allow-Origin'],
          },
        ],
      }),
    });
    this.uploadBucketName = uploadBucket.bucketName;

    const outputBucket = new MdaaBucket(this, 'output-bucket', {
      naming: props.naming,
      bucketName: `gt-${jobName}-output`,
      encryptionKey: kmsKey,
    });

    const featureStoreBucket = new MdaaBucket(this, 'feature-store-bucket', {
      naming: props.naming,
      bucketName: `gt-${jobName}-features`,
      encryptionKey: kmsKey,
    });

    // --- SQS Queues ---
    const dlqKmsKey = new MdaaKmsKey(this, 'dlq-kms-key', {
      naming: props.naming,
      alias: `gt-${jobName}-dlq`,
    });

    const dlq = new sqs.Queue(this, 'upload-dlq', {
      queueName: props.naming.resourceName(`gt-${jobName}-dlq`, 80),
      retentionPeriod: Duration.minutes(sqsConfig.dlqRetentionPeriodMinutes ?? 20160),
      visibilityTimeout: Duration.minutes(sqsConfig.dlqVisibilityTimeoutMinutes ?? 720),
      enforceSSL: true,
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: dlqKmsKey,
    });

    const queueKmsKey = new MdaaKmsKey(this, 'queue-kms-key', {
      naming: props.naming,
      alias: `gt-${jobName}-queue`,
    });

    const uploadQueue = new sqs.Queue(this, 'upload-queue', {
      queueName: props.naming.resourceName(`gt-${jobName}-queue`, 80),
      deadLetterQueue: {
        maxReceiveCount: sqsConfig.maxReceiveCount ?? 3,
        queue: dlq,
      },
      retentionPeriod: Duration.minutes(sqsConfig.queueRetentionPeriodMinutes ?? 20160),
      visibilityTimeout: Duration.minutes(sqsConfig.queueVisibilityTimeoutMinutes ?? 720),
      enforceSSL: true,
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: queueKmsKey,
    });

    // --- S3 → SQS notification via EventBridge ---
    // Using EventBridge instead of S3 notifications to avoid CDK-auto-created
    // BucketNotificationsHandler Lambda that's hard to suppress Nag on.
    if (mediaType === 'text') {
      // Text: need Lambda relay to parse txt files into individual SQS messages
      const relayRole = this.createLambdaRole('relay-role', jobName, props, [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject'],
          resources: [uploadBucket.bucketArn, `${uploadBucket.bucketArn}/*`],
        }),
        new PolicyStatement({ effect: Effect.ALLOW, actions: ['kms:Decrypt'], resources: [kmsKey.keyArn] }),
        new PolicyStatement({ effect: Effect.ALLOW, actions: ['sqs:SendMessage'], resources: [uploadQueue.queueArn] }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['kms:GenerateDataKey'],
          resources: [queueKmsKey.keyArn],
        }),
      ]);

      const relayLambda = new LambdaFunction(this, 'txt-relay-lambda', {
        functionName: props.naming.resourceName(`gt-${jobName}-relay`, 64),
        runtime: Runtime.PYTHON_3_12,
        code: LambdaCode.fromAsset(path.join(__dirname, '..', 'src', 'lambda', 'notification')),
        handler: 'txt_file_s3_to_sqs_relay.handler',
        memorySize: 128,
        timeout: Duration.seconds(5),
        role: relayRole,
        environment: { SQS_QUEUE_URL: uploadQueue.queueUrl },
      });
      MdaaNagSuppressions.addCodeResourceSuppressions(relayLambda, LAMBDA_SUPPRESSIONS, true);

      // EventBridge rule: S3 object created → relay Lambda
      new events.Rule(this, 'upload-event-rule', {
        eventPattern: {
          source: ['aws.s3'],
          detailType: ['Object Created'],
          detail: { bucket: { name: [uploadBucket.bucketName] } },
        },
        targets: [new targets.LambdaFunction(relayLambda)],
      });
    } else {
      // Image: EventBridge rule → SQS directly
      new events.Rule(this, 'upload-event-rule', {
        eventPattern: {
          source: ['aws.s3'],
          detailType: ['Object Created'],
          detail: { bucket: { name: [uploadBucket.bucketName] } },
        },
        targets: [new targets.SqsQueue(uploadQueue)],
      });
    }

    // --- Feature Group ---
    const sourceKey = mediaType === 'image' ? 'source_ref' : 'source';
    this.featureGroupName = props.naming.resourceName(`gt-${jobName}-fg`, 64);

    const featureGroupRole = new MdaaRole(this, 'feature-group-role', {
      naming: props.naming,
      roleName: `gt-${jobName}-fg-role`,
      assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
    });
    featureGroupRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        // s3:GetBucketAcl is required by SageMaker Feature Store
        // for offline store creation — validated at CfnFeatureGroup creation time.
        // See: https://docs.aws.amazon.com/sagemaker/latest/dg/feature-store-adding-fs.html
        actions: ['s3:PutObject', 's3:GetBucketAcl'],
        resources: [featureStoreBucket.bucketArn, `${featureStoreBucket.bucketArn}/*`],
      }),
    );
    featureGroupRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt', 'kms:GenerateDataKey'],
        resources: [kmsKey.keyArn],
      }),
    );
    MdaaNagSuppressions.addCodeResourceSuppressions(featureGroupRole, INLINE_POLICY_SUPPRESSIONS, true);

    const featureDefinitions: sagemaker.CfnFeatureGroup.FeatureDefinitionProperty[] = [
      { featureName: sourceKey, featureType: 'String' },
      { featureName: 'event_time', featureType: 'Fractional' },
      { featureName: 'labeling_job', featureType: 'String' },
    ];

    // Add status feature if verification is enabled
    if (props.verification) {
      featureDefinitions.push({ featureName: 'status', featureType: 'String' });
    }

    // Add task-type-specific features
    if (props.additionalFeatureDefinitions) {
      for (const fd of props.additionalFeatureDefinitions) {
        featureDefinitions.push({ featureName: fd.featureName, featureType: fd.featureType });
      }
    }

    const featureGroup = new sagemaker.CfnFeatureGroup(this, 'feature-group', {
      featureGroupName: this.featureGroupName,
      eventTimeFeatureName: 'event_time',
      recordIdentifierFeatureName: sourceKey,
      featureDefinitions,
      roleArn: featureGroupRole.roleArn,
    });
    // CDK L1 doesn't correctly PascalCase nested S3StorageConfig — use property override
    // to ensure CloudFormation receives the correct casing
    featureGroup.addPropertyOverride('OfflineStoreConfig', {
      S3StorageConfig: {
        S3Uri: `s3://${featureStoreBucket.bucketName}/feature-store/`,
        KmsKeyId: kmsKey.keyArn,
      },
    });
    featureGroup.node.addDependency(featureGroupRole);

    // --- Step Functions Lambdas ---
    const lambdaAssetPath = path.join(__dirname, '..', 'src', 'lambda', 'labeling_step_function');
    const labelingJobName = 'labeling-job';
    const verificationJobName = 'verification-job';

    // Ground Truth execution role — assumed by SageMaker (for labeling jobs)
    // If an external role is provided via config, import it; otherwise create a new one.
    // Uses MdaaManagedPolicy for GT-specific permissions so they work with both
    // internally-created and externally-imported roles.
    let groundTruthRole: IRole;
    if (props.groundTruthRole) {
      const resolved = props.roleHelper.resolveRoleRefWithRefId(props.groundTruthRole, 'ground-truth-role');
      groundTruthRole = Role.fromRoleArn(this, 'ground-truth-role', resolved.arn(), {
        mutable: true,
      });
    } else {
      groundTruthRole = new MdaaRole(this, 'ground-truth-role', {
        naming: props.naming,
        roleName: `gt-${jobName}-ground-truth-role`,
        assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
      });
    }

    // S3 read access for upload and output buckets
    const s3GetObjectResources = [`${uploadBucket.bucketArn}/*`, `${outputBucket.bucketArn}/*`];
    // SageMaker reads categories and template files using this role
    s3GetObjectResources.push(this.s3UriToArn(props.labelingTaskConfig.categoriesS3Uri));
    if (props.labelingTaskConfig.templateS3Uri) {
      s3GetObjectResources.push(this.s3UriToArn(props.labelingTaskConfig.templateS3Uri));
    }
    if (props.verification) {
      if (props.verification.categoriesS3Uri) {
        s3GetObjectResources.push(this.s3UriToArn(props.verification.categoriesS3Uri));
      }
      if (props.verification.templateS3Uri) {
        s3GetObjectResources.push(this.s3UriToArn(props.verification.templateS3Uri));
      }
    }

    const gtPolicyStatements = [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: s3GetObjectResources,
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:PutObject'],
        resources: [`${outputBucket.bucketArn}/*`],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:ListBucket', 's3:GetBucketLocation'],
        resources: [uploadBucket.bucketArn, outputBucket.bucketArn],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:GenerateDataKey', 'kms:Decrypt'],
        resources: [kmsKey.keyArn],
      }),
    ];

    new MdaaManagedPolicy(this, 'ground-truth-policy', {
      naming: props.naming,
      managedPolicyName: `gt-${jobName}-ground-truth`,
      statements: gtPolicyStatements,
      roles: [groundTruthRole],
    });

    // Poll SQS queue Lambda
    const pollLambda = this.createStepFunctionLambda(
      'poll-sqs',
      jobName,
      props,
      lambdaAssetPath,
      'poll_sqs_queue.handler',
      512,
      600,
      [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['sqs:ReceiveMessage', 'sqs:DeleteMessage'],
          resources: [uploadQueue.queueArn],
        }),
        new PolicyStatement({ effect: Effect.ALLOW, actions: ['kms:Decrypt'], resources: [queueKmsKey.keyArn] }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:PutObject'],
          resources: [outputBucket.bucketArn, `${outputBucket.bucketArn}/*`],
        }),
        new PolicyStatement({ effect: Effect.ALLOW, actions: ['kms:GenerateDataKey'], resources: [kmsKey.keyArn] }),
      ],
      {
        SQS_QUEUE_URL: uploadQueue.queueUrl,
        OUTPUT_BUCKET: outputBucket.bucketName,
        TASK_TYPE: taskType,
        TASK_MEDIA_TYPE: mediaType,
      },
    );

    // Run labeling job Lambda
    const labelingConfig = props.labelingTaskConfig;
    const humanTaskConfig = JSON.stringify({
      NumberOfHumanWorkersPerDataObject: labelingConfig.numberOfHumanWorkersPerDataObject ?? 1,
      TaskAvailabilityLifetimeInSeconds: labelingConfig.taskAvailabilityLifetimeInSeconds ?? 21600,
      TaskTimeLimitInSeconds: labelingConfig.taskTimeLimitInSeconds ?? 300,
    });

    const runLabelingRole = this.createLambdaRole('labeling-lambda-role', jobName, props, [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['kms:GenerateDataKey', 'kms:Decrypt'],
        resources: [kmsKey.keyArn],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject', 's3:PutObject'],
        resources: [outputBucket.bucketArn, `${outputBucket.bucketArn}/*`],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:CreateLabelingJob'],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:labeling-job/${labelingJobName}-*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:labeling-job/${verificationJobName}-*`,
        ],
      }),
      new PolicyStatement({ effect: Effect.ALLOW, actions: ['iam:PassRole'], resources: [groundTruthRole.roleArn] }),
    ]);

    const labelingAttributeName = taskType === 'image_semantic_segmentation' ? 'label-ref' : 'label';

    const runLabelingLambda = new LambdaFunction(this, 'labeling-lambda', {
      functionName: props.naming.resourceName(`gt-${jobName}-label`, 64),
      runtime: Runtime.PYTHON_3_12,
      code: LambdaCode.fromAsset(lambdaAssetPath),
      handler: 'run_labeling_job.handler',
      memorySize: 512,
      timeout: Duration.seconds(15),
      role: runLabelingRole,
      environment: {
        AC_ARN_MAP: JSON.stringify(AC_ARN_MAP),
        TASK_TYPE: taskType,
        SOURCE_KEY: mediaType === 'image' ? 'source-ref' : 'source',
        LABELING_JOB_NAME: labelingJobName,
        GROUND_TRUTH_ROLE_ARN: groundTruthRole.roleArn,
        OUTPUT_BUCKET: outputBucket.bucketName,
        OUTPUT_KMS_KEY_ID: kmsKey.keyArn,
        FUNCTION_NAME: FUNCTION_NAME_MAP[taskType],
        WORKTEAM_ARN: labelingConfig.workteamArn,
        // For built-in task types, use SageMaker-managed HumanTaskUi ARN when no custom template
        ...(labelingConfig.templateS3Uri
          ? { INSTRUCTIONS_TEMPLATE_S3_URI: labelingConfig.templateS3Uri }
          : { HUMAN_TASK_UI_NAME: BUILT_IN_HUMAN_TASK_UI[taskType] }),
        LABEL_CATEGORIES_S3_URI: labelingConfig.categoriesS3Uri,
        TASK_TITLE: labelingConfig.taskTitle,
        TASK_DESCRIPTION: labelingConfig.taskDescription,
        TASK_KEYWORDS: JSON.stringify(labelingConfig.taskKeywords),
        HUMAN_TASK_CONFIG: humanTaskConfig,
        TASK_PRICE: '{}',
        LABELING_ATTRIBUTE_NAME: labelingAttributeName,
      },
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(runLabelingLambda, LAMBDA_SUPPRESSIONS, true);
    MdaaNagSuppressions.addCodeResourceSuppressions(runLabelingRole, INLINE_POLICY_SUPPRESSIONS, true);

    // Run verification job Lambda (optional)
    let runVerificationLambda: LambdaFunction | undefined;
    if (props.verification) {
      const verificationConfig = props.verification;
      const verificationHumanTaskConfig = JSON.stringify({
        NumberOfHumanWorkersPerDataObject: verificationConfig.numberOfHumanWorkersPerDataObject ?? 1,
        TaskAvailabilityLifetimeInSeconds: verificationConfig.taskAvailabilityLifetimeInSeconds ?? 21600,
        TaskTimeLimitInSeconds: verificationConfig.taskTimeLimitInSeconds ?? 300,
      });

      runVerificationLambda = new LambdaFunction(this, 'verification-lambda', {
        functionName: props.naming.resourceName(`gt-${jobName}-verify`, 64),
        runtime: Runtime.PYTHON_3_12,
        code: LambdaCode.fromAsset(lambdaAssetPath),
        handler: 'run_verification_job.handler',
        memorySize: 512,
        timeout: Duration.seconds(30),
        role: runLabelingRole, // shares role with labeling
        environment: {
          AC_ARN_MAP: JSON.stringify(AC_ARN_MAP),
          SOURCE_KEY: mediaType === 'image' ? 'source-ref' : 'source',
          VERIFICATION_JOB_NAME: verificationJobName,
          GROUND_TRUTH_ROLE_ARN: groundTruthRole.roleArn,
          OUTPUT_BUCKET: outputBucket.bucketName,
          OUTPUT_KMS_KEY_ID: kmsKey.keyArn,
          FUNCTION_NAME: FUNCTION_NAME_MAP[taskType],
          WORKTEAM_ARN: verificationConfig.workteamArn,
          ...(verificationConfig.templateS3Uri
            ? { INSTRUCTIONS_TEMPLATE_S3_URI: verificationConfig.templateS3Uri }
            : { HUMAN_TASK_UI_NAME: BUILT_IN_HUMAN_TASK_UI[taskType] }),
          LABEL_CATEGORIES_S3_URI: verificationConfig.categoriesS3Uri ?? '',
          TASK_TITLE: verificationConfig.taskTitle,
          TASK_DESCRIPTION: verificationConfig.taskDescription,
          TASK_KEYWORDS: JSON.stringify(verificationConfig.taskKeywords ?? []),
          HUMAN_TASK_CONFIG: verificationHumanTaskConfig,
          TASK_PRICE: '{}',
          VERIFICATION_ATTRIBUTE_NAME: 'verification',
          LABELING_ATTRIBUTE_NAME: labelingAttributeName,
        },
      });
      MdaaNagSuppressions.addCodeResourceSuppressions(runVerificationLambda, LAMBDA_SUPPRESSIONS, true);
    }

    // Update Feature Store Lambda
    const updateFeatureStoreLambda = this.createStepFunctionLambda(
      'update-fs',
      jobName,
      props,
      lambdaAssetPath,
      'update_feature_store.handler',
      512,
      900,
      [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:PutObject'],
          resources: [outputBucket.bucketArn, `${outputBucket.bucketArn}/*`],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['kms:GenerateDataKey', 'kms:Decrypt'],
          resources: [kmsKey.keyArn],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['sagemaker:PutRecord'],
          resources: [
            `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:feature-group/${this.featureGroupName}`,
          ],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['sqs:DeleteMessage'],
          resources: [uploadQueue.queueArn],
        }),
      ],
      {
        FEATURE_GROUP_NAME: this.featureGroupName,
        FEATURE_GROUP_DEFINITIONS: '{}', // Set from task type at runtime
        SQS_QUEUE_URL: uploadQueue.queueUrl,
        OUTPUT_BUCKET: outputBucket.bucketName,
        LABELING_ATTRIBUTE_NAME: labelingAttributeName,
        TASK_MEDIA_TYPE: mediaType,
        SOURCE_KEY: mediaType === 'image' ? 'source-ref' : 'source',
        ...(props.verification ? { VERIFICATION_ATTRIBUTE_NAME: 'verification' } : {}),
      },
    );

    // Return messages to SQS queue Lambda
    const returnMessagesLambda = this.createStepFunctionLambda(
      'return-msgs',
      jobName,
      props,
      lambdaAssetPath,
      'return_messages_to_sqs_queue.handler',
      512,
      600,
      [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['sqs:ChangeMessageVisibility'],
          resources: [uploadQueue.queueArn],
        }),
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject'],
          resources: [outputBucket.bucketArn, `${outputBucket.bucketArn}/*`],
        }),
        new PolicyStatement({ effect: Effect.ALLOW, actions: ['kms:Decrypt'], resources: [kmsKey.keyArn] }),
      ],
      {
        SQS_QUEUE_URL: uploadQueue.queueUrl,
        OUTPUT_BUCKET: outputBucket.bucketName,
        TASK_MEDIA_TYPE: mediaType,
      },
    );

    // --- Step Functions State Machine ---
    const stateMachine = this.createStateMachine(
      props,
      jobName,
      kmsKey,
      pollLambda,
      runLabelingLambda,
      runVerificationLambda,
      updateFeatureStoreLambda,
      returnMessagesLambda,
      labelingJobName,
      verificationJobName,
    );
    this.stateMachineArn = stateMachine.stateMachineArn;

    // Grant state machine permissions to invoke Lambdas and describe labeling jobs
    stateMachine.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:DescribeLabelingJob'],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:labeling-job/${labelingJobName}-*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:labeling-job/${verificationJobName}-*`,
        ],
      }),
    );

    // --- EventBridge Scheduler ---
    const schedule = props.workflowSchedule ?? 'cron(0 12 * * ? *)';
    if (!/^(cron|rate)\(.*\)$/.test(schedule)) {
      throw new Error(
        `Invalid workflowSchedule "${schedule}". Must be a cron() or rate() expression ` +
          '(e.g., "cron(0 12 * * ? *)" or "rate(1 day)").',
      );
    }
    const schedulerRole = new MdaaRole(this, 'scheduler-role', {
      naming: props.naming,
      roleName: `gt-${jobName}-scheduler`,
      assumedBy: new ServicePrincipal('scheduler.amazonaws.com'),
    });
    schedulerRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['states:StartExecution'],
        resources: [stateMachine.stateMachineArn],
      }),
    );
    MdaaNagSuppressions.addCodeResourceSuppressions(schedulerRole, INLINE_POLICY_SUPPRESSIONS, true);

    new scheduler.CfnSchedule(this, 'workflow-schedule', {
      flexibleTimeWindow: { mode: 'OFF' },
      scheduleExpression: schedule,
      target: {
        arn: stateMachine.stateMachineArn,
        roleArn: schedulerRole.roleArn,
      },
    });

    // --- CDK Nag Suppressions ---
    const allSuppressions = [
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'Wildcard required for S3 object-level operations, CloudWatch Logs, labeling job names, and Lambda versioned invocations.',
      },
      { id: 'AwsSolutions-IAM4', reason: 'CDK-managed S3 EventBridge notification handler uses AWS managed policy.' },
      ...INLINE_POLICY_SUPPRESSIONS,
    ];
    // Apply to the entire construct tree
    MdaaNagSuppressions.addCodeResourceSuppressions(this, allSuppressions, true);
    // Also suppress on stateMachine (Step Functions auto-created role)
    MdaaNagSuppressions.addCodeResourceSuppressions(stateMachine, allSuppressions, true);
    // CDK auto-creates a BucketNotificationsHandler Lambda at the stack level
    // (outside our construct tree) when eventBridgeEnabled is set on MdaaBucket.
    // This handler can't be referenced as a construct, so we suppress by path.
    NagSuppressions.addResourceSuppressionsByPath(
      Stack.of(this),
      [
        `/${Stack.of(this).stackName}/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/Resource`,
        `/${Stack.of(this).stackName}/BucketNotificationsHandler050a0587b7544547bf325f094a3db834/Role/DefaultPolicy/Resource`,
      ],
      allSuppressions,
    );

    // --- SSM Outputs ---
    const param = (name: string, value: string) =>
      new MdaaParamAndOutput(this, { ...this.props, resourceType: 'ground-truth', resourceId: jobName, name, value });

    param('upload-bucket-name', uploadBucket.bucketName);
    param('output-bucket-name', outputBucket.bucketName);
    param('feature-group-name', this.featureGroupName);
    param('state-machine-arn', stateMachine.stateMachineArn);
    param('upload-queue-url', uploadQueue.queueUrl);
  }

  /** Convert an S3 URI (s3://bucket/key) to an ARN (arn:aws:s3:::bucket/key) */
  private s3UriToArn(s3Uri: string): string {
    const match = /^s3:\/\/(.+)$/.exec(s3Uri);
    if (!match) {
      throw new Error(`Invalid S3 URI: ${s3Uri}`);
    }
    return `arn:${Aws.PARTITION}:s3:::${match[1]}`;
  }

  /** Helper to create a Lambda execution role with standard permissions */
  private createLambdaRole(
    roleId: string,
    jobName: string,
    props: SageMakerGroundTruthL3ConstructProps,
    additionalPolicies: PolicyStatement[],
  ): MdaaRole {
    const role = new MdaaRole(this, roleId, {
      naming: props.naming,
      roleName: `gt-${jobName}-${roleId}`,
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    role.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        // Scoped to Lambda log groups for this Ground Truth job
        // https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs.html
        resources: [`arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:/aws/lambda/*gt-${jobName}*`],
      }),
    );
    for (const policy of additionalPolicies) {
      role.addToPolicy(policy);
    }
    MdaaNagSuppressions.addCodeResourceSuppressions(role, INLINE_POLICY_SUPPRESSIONS, true);
    return role;
  }

  /** Helper to create a Step Function Lambda with standard config */
  private createStepFunctionLambda(
    lambdaId: string,
    jobName: string,
    props: SageMakerGroundTruthL3ConstructProps,
    assetPath: string,
    handler: string,
    memorySize: number,
    timeoutSeconds: number,
    additionalPolicies: PolicyStatement[],
    environment: Record<string, string>,
  ): LambdaFunction {
    const role = this.createLambdaRole(`${lambdaId}-role`, jobName, props, additionalPolicies);
    const fn = new LambdaFunction(this, `${lambdaId}-lambda`, {
      functionName: props.naming.resourceName(`gt-${jobName}-${lambdaId}`, 64),
      runtime: Runtime.PYTHON_3_12,
      code: LambdaCode.fromAsset(assetPath),
      handler,
      memorySize,
      timeout: Duration.seconds(timeoutSeconds),
      role,
      environment,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(fn, LAMBDA_SUPPRESSIONS, true);
    return fn;
  }

  /** Build the Step Functions state machine */
  private createStateMachine(
    props: SageMakerGroundTruthL3ConstructProps,
    jobName: string,
    kmsKey: MdaaKmsKey,
    pollLambda: LambdaFunction,
    labelingLambda: LambdaFunction,
    verificationLambda: LambdaFunction | undefined,
    updateFeatureStoreLambda: LambdaFunction,
    returnMessagesLambda: LambdaFunction,
    labelingJobName: string,
    verificationJobName: string,
  ): sfn.StateMachine {
    const success = new sfn.Succeed(this, 'Succeeded');
    const fail = new sfn.Fail(this, 'Failed');

    const pollSqs = new tasks.LambdaInvoke(this, 'PollSqsQueue', {
      lambdaFunction: pollLambda,
      payload: sfn.TaskInput.fromObject({ 'ExecutionId.$': '$$.Execution.Id' }),
      resultPath: '$.Output',
      resultSelector: {
        'MessagesCount.$': '$.Payload.MessagesCount',
        'RecordSourceToReceiptHandleS3Key.$': '$.Payload.RecordSourceToReceiptHandleS3Key',
      },
    });

    const runLabeling = new tasks.LambdaInvoke(this, 'RunLabelingJob', {
      lambdaFunction: labelingLambda,
      payload: sfn.TaskInput.fromObject({
        'ExecutionId.$': '$$.Execution.Id',
        'RecordSourceToReceiptHandleS3Key.$': '$.Output.RecordSourceToReceiptHandleS3Key',
      }),
      resultPath: '$.Output.RunLabelingJobOutput',
      resultSelector: { 'LabelingJobName.$': '$.Payload.LabelingJobName' },
    });

    const updateFeatureStore = new tasks.LambdaInvoke(this, 'UpdateFeatureStore', {
      lambdaFunction: updateFeatureStoreLambda,
      payload: sfn.TaskInput.fromObject({
        'ExecutionId.$': '$$.Execution.Id',
        'LabelingJobOutputUri.$': '$.DescribeLabelingJobOutput.LabelingJobOutput.OutputDatasetS3Uri',
        'RecordSourceToReceiptHandleS3Key.$': '$.Output.RecordSourceToReceiptHandleS3Key',
      }),
      resultPath: '$.Output',
      resultSelector: {
        'RejectedLabelsRecordSourceToReceiptHandleS3Key.$': '$.Payload.RejectedLabelsRecordSourceToReceiptHandleS3Key',
      },
    });

    const returnOnFailure = new tasks.LambdaInvoke(this, 'ReturnMessagesOnFailure', {
      lambdaFunction: returnMessagesLambda,
      payload: sfn.TaskInput.fromObject({
        'RecordSourceToReceiptHandleS3Key.$': '$.Output.RecordSourceToReceiptHandleS3Key',
      }),
    });
    returnOnFailure.next(fail);

    const returnRemaining = new tasks.LambdaInvoke(this, 'ReturnRemainingMessages', {
      lambdaFunction: returnMessagesLambda,
      payload: sfn.TaskInput.fromObject({
        'RecordSourceToReceiptHandleS3Key.$': '$.Output.RejectedLabelsRecordSourceToReceiptHandleS3Key',
      }),
    });

    let postLabelingStep: sfn.IChainable = updateFeatureStore.next(returnRemaining.next(success));

    // Add verification step if configured
    if (verificationLambda && props.verification) {
      const runVerification = new tasks.LambdaInvoke(this, 'RunVerificationJob', {
        lambdaFunction: verificationLambda,
        payload: sfn.TaskInput.fromObject({
          'ExecutionId.$': '$$.Execution.Id',
          'LabelingJobOutputUri.$': '$.DescribeLabelingJobOutput.LabelingJobOutput.OutputDatasetS3Uri',
          'RecordSourceToReceiptHandleS3Key.$': '$.Output.RecordSourceToReceiptHandleS3Key',
        }),
        resultPath: '$.Output',
        resultSelector: {
          RunLabelingJobOutput: { 'LabelingJobName.$': '$.Payload.LabelingJobName' },
          'UnlabeledRecordSourceToReceiptHandleS3Key.$': '$.Payload.UnlabeledRecordSourceToReceiptHandleS3Key',
          'RecordSourceToReceiptHandleS3Key.$': '$.Payload.RecordSourceToReceiptHandleS3Key',
        },
      });

      const returnUnlabeled = new tasks.LambdaInvoke(this, 'ReturnUnlabeledMessages', {
        lambdaFunction: returnMessagesLambda,
        payload: sfn.TaskInput.fromObject({
          'RecordSourceToReceiptHandleS3Key.$': '$.Output.UnlabeledRecordSourceToReceiptHandleS3Key',
        }),
        resultPath: sfn.JsonPath.DISCARD,
      });

      postLabelingStep = runVerification.next(
        returnUnlabeled.next(this.createJobWaiter(verificationJobName, returnOnFailure, postLabelingStep)),
      );
    }

    const definition = pollSqs.next(
      new sfn.Choice(this, 'NewMessages?')
        .when(sfn.Condition.numberEquals('$.Output.MessagesCount', 0), success)
        .otherwise(runLabeling.next(this.createJobWaiter(labelingJobName, returnOnFailure, postLabelingStep))),
    );

    const logGroup = new logs.LogGroup(this, 'sfn-log-group', {
      logGroupName: `/aws/vendedlogs/states/${props.naming.resourceName(`gt-${jobName}`, 64)}`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
      encryptionKey: kmsKey,
    });

    return new sfn.StateMachine(this, 'labeling-state-machine', {
      stateMachineName: props.naming.resourceName(`gt-${jobName}-sfn`, 80),
      definitionBody: sfn.DefinitionBody.fromChainable(definition),
      logs: { destination: logGroup, level: sfn.LogLevel.ALL },
      tracingEnabled: true,
      timeout: Duration.days(7),
    });
  }

  /** Create a wait-poll loop for a labeling/verification job */
  private createJobWaiter(jobName: string, onFailure: sfn.IChainable, onSuccess: sfn.IChainable): sfn.IChainable {
    const getStatus = new tasks.CallAwsService(this, `Get-${jobName}-status`, {
      service: 'sagemaker',
      action: 'describeLabelingJob',
      parameters: { 'LabelingJobName.$': '$.Output.RunLabelingJobOutput.LabelingJobName' },
      iamResources: [`arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:labeling-job/${jobName}-*`],
      resultPath: '$.DescribeLabelingJobOutput',
    });

    const wait = new sfn.Wait(this, `Wait-${jobName}`, {
      time: sfn.WaitTime.duration(Duration.seconds(30)),
    });

    return wait.next(getStatus).next(
      new sfn.Choice(this, `${jobName}-complete?`)
        .when(sfn.Condition.stringEquals('$.DescribeLabelingJobOutput.LabelingJobStatus', 'Failed'), onFailure)
        .when(sfn.Condition.stringEquals('$.DescribeLabelingJobOutput.LabelingJobStatus', 'Stopped'), onFailure)
        .when(
          sfn.Condition.and(
            sfn.Condition.stringEquals('$.DescribeLabelingJobOutput.LabelingJobStatus', 'Completed'),
            sfn.Condition.numberEquals('$.DescribeLabelingJobOutput.LabelCounters.TotalLabeled', 0),
          ),
          onFailure,
        )
        .when(
          sfn.Condition.and(
            sfn.Condition.stringEquals('$.DescribeLabelingJobOutput.LabelingJobStatus', 'Completed'),
            sfn.Condition.numberGreaterThan('$.DescribeLabelingJobOutput.LabelCounters.TotalLabeled', 0),
          ),
          onSuccess,
        )
        .otherwise(wait),
    );
  }
}

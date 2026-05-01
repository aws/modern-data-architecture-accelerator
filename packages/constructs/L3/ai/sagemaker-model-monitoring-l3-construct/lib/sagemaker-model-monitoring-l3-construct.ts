/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Key, IKey } from 'aws-cdk-lib/aws-kms';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Construct } from 'constructs';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { Aws, CfnResource, Duration, Fn } from 'aws-cdk-lib';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Rule, Schedule, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import { JsonPath, DefinitionBody, LogLevel, StateMachine } from 'aws-cdk-lib/aws-stepfunctions';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { CallAwsService } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import {
  CfnDataQualityJobDefinition,
  CfnModelQualityJobDefinition,
  CfnModelBiasJobDefinition,
  CfnModelExplainabilityJobDefinition,
  CfnMonitoringSchedule,
} from 'aws-cdk-lib/aws-sagemaker';
import { MdaaParamAndOutput, MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import {
  INLINE_POLICY_SUPPRESSIONS,
  S3_REPLICATION_SUPPRESSIONS,
  throwConfigValidationError,
  requireValue,
  validateEndpointName,
  validateImageUri,
  validateScheduleExpression,
  validateVpcConfig,
  addEcrReadPolicy,
  addCloudWatchLogsPolicy,
  addVpcNetworkPolicy,
} from '@aws-mdaa/sm-shared';

const ENDPOINT_INPUT_LOCAL_PATH = '/opt/ml/processing/input/endpoint';
const MONITOR_OUTPUT_LOCAL_PATH = '/opt/ml/processing/output';

interface MonitorClusterConfig {
  readonly instanceCount: number;
  readonly instanceType: string;
  readonly volumeSizeInGb: number;
  readonly volumeKmsKeyId: string;
}

interface MonitorStoppingCondition {
  readonly maxRuntimeInSeconds: number;
}

export interface MonitorConfig {
  /** Enable this monitor type */
  readonly enabled: boolean;
  /** Cron schedule expression */
  readonly schedule?: string;
  /** S3 URI for baseline dataset */
  readonly baselineDatasetUri?: string;
  /** S3 URI for baseline constraints */
  readonly baselineConstraintsUri?: string;
  /** S3 URI for baseline statistics */
  readonly baselineStatisticsUri?: string;
  /** Instance type for monitoring job */
  readonly instanceType?: string;
  /** Instance count for monitoring job */
  readonly instanceCount?: number;
  /** Volume size in GB */
  readonly volumeSizeInGb?: number;
  /** Max runtime in seconds */
  readonly maxRuntimeInSeconds?: number;
  /** Problem type (for model-quality: Regression, BinaryClassification, MulticlassClassification) */
  readonly problemType?: 'Regression' | 'BinaryClassification' | 'MulticlassClassification';
  /** S3 URI for ground truth data (model-quality, model-bias) */
  readonly groundTruthS3Uri?: string;
  /** Inference attribute name */
  readonly inferenceAttribute?: string;
  /** Probability attribute name */
  readonly probabilityAttribute?: string;
  /** Probability threshold */
  readonly probabilityThreshold?: number;
  /** Features attribute name (for bias/explainability) */
  readonly featuresAttribute?: string;
  /** SageMaker Clarify image URI (for bias/explainability) */
  readonly imageUri?: string;
  /** S3 URI for analysis_config.json (bias/explainability). Defaults to <outputS3Uri>/analysis_config.json */
  readonly analysisConfigUri?: string;
}

export interface MonitorsMap {
  /** Data quality monitoring config */
  readonly dataQuality?: MonitorConfig;
  /** Model quality monitoring config */
  readonly modelQuality?: MonitorConfig;
  /** Model bias monitoring config */
  readonly modelBias?: MonitorConfig;
  /** Model explainability monitoring config */
  readonly modelExplainability?: MonitorConfig;
}

export interface SageMakerModelMonitoringL3ConstructProps extends MdaaL3ConstructProps {
  /** Name of the SageMaker endpoint to monitor */
  readonly endpointName: string;
  /** Map of monitor type to config. Keys: data-quality, model-quality, model-bias, model-explainability */
  readonly monitors: MonitorsMap;
  /** VPC ID for monitoring jobs */
  readonly vpcId?: string;
  /** Subnet IDs for monitoring jobs */
  readonly subnetIds?: string[];
  /** Security group IDs for monitoring jobs */
  readonly securityGroupIds?: string[];
  /** Whether to enable network isolation for monitoring jobs. Defaults to false when VPC is
   *  configured because monitoring jobs need network access to reach the SageMaker endpoint
   *  and write results to S3. Set to true only if all required resources are accessible via
   *  VPC endpoints. */
  readonly networkIsolation?: boolean;
  /** S3 bucket ARN for model artifacts (used for baseline data access) */
  readonly modelBucketArn?: string;
  /** KMS key ARN for encryption. If omitted, a new key is created. */
  readonly kmsKeyArn?: string;
  /** S3 URI for baseline training data. When provided with baselineOutputDataS3Uri, enables automated baselining. */
  readonly baselineTrainingDataS3Uri?: string;
  /** S3 URI for baseline output. When provided with baselineTrainingDataS3Uri, enables automated baselining. */
  readonly baselineOutputDataS3Uri?: string;
  /** Schedule expression for periodic re-baselining (default: daily at 2 AM UTC) */
  readonly baselineSchedule?: string;
  /** Dataset format for baselining (default: '{"csv": {"header": true}}'). Supports csv, json, parquet. */
  readonly baselineDatasetFormat?: string;
}

/**
 * L3 construct for SageMaker Model Monitoring.
 *
 * Supports 4 monitor types via config map:
 * - data-quality: Detects data drift
 * - model-quality: Detects model quality degradation
 * - model-bias: Detects bias drift (Clarify)
 * - model-explainability: Detects feature attribution drift (Clarify/SHAP)
 *
 * Exports SSM parameters:
 * - monitor-schedule-arns: comma-separated list of monitoring schedule ARNs
 * - monitor-schedule-count: number of monitoring schedules created
 */
export class SageMakerModelMonitoringL3Construct extends MdaaL3Construct {
  protected readonly props: SageMakerModelMonitoringL3ConstructProps;
  private kmsKey!: IKey;
  private outputBucket!: MdaaBucket;
  private monitoringRole!: MdaaRole;
  private networkConfig?: {
    enableNetworkIsolation: boolean;
    vpcConfig: { securityGroupIds: string[]; subnets: string[] };
  };

  constructor(scope: Construct, id: string, props: SageMakerModelMonitoringL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    validateEndpointName(props.endpointName);

    this.createKmsKeyAndBucket();
    this.createMonitoringRole();
    const scheduleArns = this.createMonitorJobDefinitions();
    this.addNagSuppressions();
    this.createBaselineStateMachine();
    this.createSsmExports(scheduleArns);
  }

  private createKmsKeyAndBucket(): void {
    const props = this.props;
    const endpointName = props.endpointName;

    if (props.kmsKeyArn) {
      this.kmsKey = Key.fromKeyArn(this, 'monitoring-kms-key', props.kmsKeyArn);
    } else {
      this.kmsKey = new MdaaKmsKey(this, 'monitoring-kms-key', {
        alias: `monitoring-${endpointName}`,
        naming: props.naming,
      });
    }

    this.outputBucket = new MdaaBucket(this, 'monitoring-output', {
      naming: props.naming,
      bucketName: `monitor-exec-${endpointName}`,
      encryptionKey: this.kmsKey,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(this.outputBucket, S3_REPLICATION_SUPPRESSIONS, true);
  }

  private createMonitoringRole(): void {
    const props = this.props;
    const endpointName = props.endpointName;

    this.monitoringRole = new MdaaRole(this, 'monitoring-role', {
      naming: props.naming,
      roleName: `monitor-exec-${endpointName}`,
      assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
    });

    this.monitoringRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'sagemaker:DescribeEndpoint',
          'sagemaker:DescribeEndpointConfig',
          'sagemaker:DescribeModel',
          'sagemaker:InvokeEndpoint',
        ],
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:endpoint/${endpointName}`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:endpoint-config/*`,
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:model/${endpointName}*`,
        ],
      }),
    );

    this.monitoringRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['sagemaker:CreateProcessingJob', 'sagemaker:DescribeProcessingJob', 'sagemaker:StopProcessingJob'],
        resources: [`arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:processing-job/*`],
      }),
    );

    this.monitoringRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
        conditions: { StringLike: { 'cloudwatch:namespace': '/aws/sagemaker/*' } },
      }),
    );

    addCloudWatchLogsPolicy(this.monitoringRole, '/aws/sagemaker/');

    this.outputBucket.grantReadWrite(this.monitoringRole);
    this.kmsKey.grantEncryptDecrypt(this.monitoringRole);

    if (props.modelBucketArn) {
      this.monitoringRole.addToPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:ListBucket'],
          resources: [props.modelBucketArn, `${props.modelBucketArn}/*`],
        }),
      );
    }

    const groundTruthBuckets = new Set<string>();
    for (const config of [props.monitors.modelQuality, props.monitors.modelBias]) {
      if (config?.enabled && config.groundTruthS3Uri) {
        const bucketName = config.groundTruthS3Uri.replace(/^s3:\/\//, '').split('/')[0];
        groundTruthBuckets.add(bucketName);
      }
    }
    for (const bucketName of groundTruthBuckets) {
      this.monitoringRole.addToPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:ListBucket'],
          resources: [`arn:${Aws.PARTITION}:s3:::${bucketName}`, `arn:${Aws.PARTITION}:s3:::${bucketName}/*`],
        }),
      );
    }

    addEcrReadPolicy(this.monitoringRole);

    this.monitoringRole.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [this.monitoringRole.roleArn],
        conditions: {
          StringEquals: { 'iam:PassedToService': 'sagemaker.amazonaws.com' },
        },
      }),
    );

    const hasVpc = validateVpcConfig(props);
    if (hasVpc) {
      addVpcNetworkPolicy(this.monitoringRole);
    }

    this.networkConfig = hasVpc
      ? {
          enableNetworkIsolation: props.networkIsolation ?? true,
          vpcConfig: {
            securityGroupIds: props.securityGroupIds!,
            subnets: props.subnetIds!,
          },
        }
      : undefined;
  }

  private createDataQualityJobDef(
    config: MonitorConfig,
    imageUri: string,
    endpointName: string,
    outputS3Uri: string,
    clusterConfig: MonitorClusterConfig,
    stoppingCondition: MonitorStoppingCondition,
  ): CfnResource {
    return new CfnDataQualityJobDefinition(this, 'data-quality-job-def', {
      jobDefinitionName: this.props.naming.resourceName(`dq-${endpointName}`, 63),
      roleArn: this.monitoringRole.roleArn,
      dataQualityAppSpecification: {
        imageUri,
      },
      dataQualityJobInput: {
        endpointInput: {
          endpointName,
          localPath: ENDPOINT_INPUT_LOCAL_PATH,
        },
      },
      dataQualityJobOutputConfig: {
        monitoringOutputs: [
          {
            s3Output: { s3Uri: outputS3Uri, localPath: MONITOR_OUTPUT_LOCAL_PATH, s3UploadMode: 'EndOfJob' },
          },
        ],
        kmsKeyId: this.kmsKey.keyId,
      },
      dataQualityBaselineConfig: this.buildBaselineConfig(config),
      jobResources: { clusterConfig },
      networkConfig: this.networkConfig,
      stoppingCondition,
    });
  }

  private createModelQualityJobDef(
    config: MonitorConfig,
    imageUri: string,
    endpointName: string,
    outputS3Uri: string,
    clusterConfig: MonitorClusterConfig,
    stoppingCondition: MonitorStoppingCondition,
  ): CfnResource {
    const effectiveProblemType = config.problemType ?? 'Regression';
    let inferenceAttr = config.inferenceAttribute;
    let probabilityAttr = config.probabilityAttribute;
    let probabilityThresholdAttr = config.probabilityThreshold;

    if (!inferenceAttr && !probabilityAttr) {
      if (effectiveProblemType === 'BinaryClassification') {
        probabilityAttr = 'probability';
        probabilityThresholdAttr = probabilityThresholdAttr ?? 0.5;
      } else {
        inferenceAttr = 'prediction';
      }
    }

    return new CfnModelQualityJobDefinition(this, 'model-quality-job-def', {
      jobDefinitionName: this.props.naming.resourceName(`mq-${endpointName}`, 63),
      roleArn: this.monitoringRole.roleArn,
      modelQualityAppSpecification: {
        imageUri,
        problemType: effectiveProblemType,
      },
      modelQualityJobInput: {
        endpointInput: {
          endpointName,
          localPath: ENDPOINT_INPUT_LOCAL_PATH,
          inferenceAttribute: inferenceAttr,
          probabilityAttribute: probabilityAttr,
          probabilityThresholdAttribute: probabilityThresholdAttr,
        },
        groundTruthS3Input: { s3Uri: requireValue(config.groundTruthS3Uri, 'groundTruthS3Uri', 'model-quality') },
      },
      modelQualityJobOutputConfig: {
        monitoringOutputs: [
          {
            s3Output: { s3Uri: outputS3Uri, localPath: MONITOR_OUTPUT_LOCAL_PATH, s3UploadMode: 'EndOfJob' },
          },
        ],
        kmsKeyId: this.kmsKey.keyId,
      },
      modelQualityBaselineConfig: config.baselineConstraintsUri
        ? { constraintsResource: { s3Uri: config.baselineConstraintsUri } }
        : undefined,
      jobResources: { clusterConfig },
      networkConfig: this.networkConfig,
      stoppingCondition,
    });
  }

  private createModelBiasJobDef(
    config: MonitorConfig,
    imageUri: string,
    endpointName: string,
    outputS3Uri: string,
    clusterConfig: MonitorClusterConfig,
    stoppingCondition: MonitorStoppingCondition,
  ): CfnResource {
    return new CfnModelBiasJobDefinition(this, 'model-bias-job-def', {
      jobDefinitionName: this.props.naming.resourceName(`mb-${endpointName}`, 63),
      roleArn: this.monitoringRole.roleArn,
      modelBiasAppSpecification: {
        imageUri,
        configUri: config.analysisConfigUri ?? outputS3Uri + 'analysis_config.json',
      },
      modelBiasJobInput: {
        endpointInput: {
          endpointName,
          localPath: ENDPOINT_INPUT_LOCAL_PATH,
          featuresAttribute: config.featuresAttribute,
          inferenceAttribute: config.inferenceAttribute,
          probabilityAttribute: config.probabilityAttribute,
          probabilityThresholdAttribute: config.probabilityThreshold,
        },
        groundTruthS3Input: { s3Uri: requireValue(config.groundTruthS3Uri, 'groundTruthS3Uri', 'model-bias') },
      },
      modelBiasJobOutputConfig: {
        monitoringOutputs: [
          {
            s3Output: { s3Uri: outputS3Uri, localPath: MONITOR_OUTPUT_LOCAL_PATH, s3UploadMode: 'EndOfJob' },
          },
        ],
        kmsKeyId: this.kmsKey.keyId,
      },
      modelBiasBaselineConfig: config.baselineConstraintsUri
        ? { constraintsResource: { s3Uri: config.baselineConstraintsUri } }
        : undefined,
      jobResources: { clusterConfig },
      networkConfig: this.networkConfig,
      stoppingCondition,
    });
  }

  private createModelExplainabilityJobDef(
    config: MonitorConfig,
    imageUri: string,
    endpointName: string,
    outputS3Uri: string,
    clusterConfig: MonitorClusterConfig,
    stoppingCondition: MonitorStoppingCondition,
  ): CfnResource {
    return new CfnModelExplainabilityJobDefinition(this, 'model-explainability-job-def', {
      jobDefinitionName: this.props.naming.resourceName(`me-${endpointName}`, 63),
      roleArn: this.monitoringRole.roleArn,
      modelExplainabilityAppSpecification: {
        imageUri,
        configUri: config.analysisConfigUri ?? outputS3Uri + 'analysis_config.json',
      },
      modelExplainabilityJobInput: {
        endpointInput: {
          endpointName,
          localPath: ENDPOINT_INPUT_LOCAL_PATH,
          featuresAttribute: config.featuresAttribute,
          inferenceAttribute: config.inferenceAttribute,
          probabilityAttribute: config.probabilityAttribute,
        },
      },
      modelExplainabilityJobOutputConfig: {
        monitoringOutputs: [
          {
            s3Output: { s3Uri: outputS3Uri, localPath: MONITOR_OUTPUT_LOCAL_PATH, s3UploadMode: 'EndOfJob' },
          },
        ],
        kmsKeyId: this.kmsKey.keyId,
      },
      modelExplainabilityBaselineConfig: config.baselineConstraintsUri
        ? { constraintsResource: { s3Uri: config.baselineConstraintsUri } }
        : undefined,
      jobResources: { clusterConfig },
      networkConfig: this.networkConfig,
      stoppingCondition,
    });
  }

  private buildBaselineConfig(
    config: MonitorConfig,
  ): { constraintsResource?: { s3Uri: string }; statisticsResource?: { s3Uri: string } } | undefined {
    if (!config.baselineConstraintsUri && !config.baselineStatisticsUri) {
      return undefined;
    }
    return {
      constraintsResource: config.baselineConstraintsUri ? { s3Uri: config.baselineConstraintsUri } : undefined,
      statisticsResource: config.baselineStatisticsUri ? { s3Uri: config.baselineStatisticsUri } : undefined,
    };
  }

  private static readonly JOB_DEF_CREATORS: Record<
    string,
    (
      self: SageMakerModelMonitoringL3Construct,
      config: MonitorConfig,
      imageUri: string,
      endpointName: string,
      outputS3Uri: string,
      clusterConfig: MonitorClusterConfig,
      stoppingCondition: MonitorStoppingCondition,
    ) => CfnResource
  > = {
    'data-quality': (self, ...args) => self.createDataQualityJobDef(...args),
    'model-quality': (self, ...args) => self.createModelQualityJobDef(...args),
    'model-bias': (self, ...args) => self.createModelBiasJobDef(...args),
    'model-explainability': (self, ...args) => self.createModelExplainabilityJobDef(...args),
  };

  private createMonitorJobDefinitions(): string[] {
    const props = this.props;
    const endpointName = props.endpointName;
    const scheduleArns: string[] = [];

    const monitorEntries: [string, string, string, MonitorConfig | undefined][] = [
      ['data-quality', 'dq', 'DataQuality', props.monitors.dataQuality],
      ['model-quality', 'mq', 'ModelQuality', props.monitors.modelQuality],
      ['model-bias', 'mb', 'ModelBias', props.monitors.modelBias],
      ['model-explainability', 'me', 'ModelExplainability', props.monitors.modelExplainability],
    ];

    for (const [monitorType, jobDefPrefix, sageMakerType, config] of monitorEntries) {
      if (!config?.enabled) continue;

      if (!config.imageUri) {
        throwConfigValidationError(`imageUri is required for ${monitorType} monitor.`);
      }
      validateImageUri(config.imageUri, `${monitorType} monitor`);

      const schedule = config.schedule ?? 'cron(0 * ? * * *)';
      validateScheduleExpression(schedule, `monitors.${monitorType}.schedule`);
      const instanceType = config.instanceType ?? 'ml.m5.large';
      const instanceCount = config.instanceCount ?? 1;
      const volumeSizeInGb = config.volumeSizeInGb ?? 20;
      const maxRuntimeInSeconds = config.maxRuntimeInSeconds ?? 1800;
      const outputS3Uri = `s3://${this.outputBucket.bucketName}/${monitorType}/`;

      const clusterConfig = {
        instanceCount,
        instanceType,
        volumeSizeInGb,
        volumeKmsKeyId: this.kmsKey.keyId,
      };
      const stoppingCondition = { maxRuntimeInSeconds };

      const creator = SageMakerModelMonitoringL3Construct.JOB_DEF_CREATORS[monitorType];
      if (!creator) {
        throw new Error(`Unsupported monitor type '${monitorType}' — no job definition creator registered.`);
      }
      const createdJobDef = creator(
        this,
        config,
        config.imageUri,
        endpointName,
        outputS3Uri,
        clusterConfig,
        stoppingCondition,
      );

      const monSchedule = new CfnMonitoringSchedule(this, `${monitorType}-schedule`, {
        monitoringScheduleName: props.naming.resourceName(`${monitorType}-${endpointName}`, 63),
        monitoringScheduleConfig: {
          monitoringJobDefinitionName: props.naming.resourceName(`${jobDefPrefix}-${endpointName}`, 63),
          monitoringType: sageMakerType,
          scheduleConfig: {
            scheduleExpression: schedule,
          },
        },
      });
      monSchedule.addDependency(createdJobDef);
      monSchedule.node.addDependency(this.monitoringRole);
      scheduleArns.push(monSchedule.attrMonitoringScheduleArn);
    }

    return scheduleArns;
  }

  private createBaselineStateMachine(): void {
    const props = this.props;
    if (!props.baselineTrainingDataS3Uri || !props.baselineOutputDataS3Uri) return;

    const baselineBuckets = new Set<string>();
    const trainingBucket = props.baselineTrainingDataS3Uri.replace(/^s3:\/\//, '').split('/')[0];
    const outputBucket = props.baselineOutputDataS3Uri.replace(/^s3:\/\//, '').split('/')[0];
    baselineBuckets.add(trainingBucket);
    baselineBuckets.add(outputBucket);

    for (const bucketName of baselineBuckets) {
      this.monitoringRole.addToPolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket'],
          resources: [`arn:${Aws.PARTITION}:s3:::${bucketName}`, `arn:${Aws.PARTITION}:s3:::${bucketName}/*`],
        }),
      );
    }

    const endpointName = props.endpointName;
    const enabledMonitors: string[] = [];
    if (props.monitors.dataQuality?.enabled) enabledMonitors.push('data_quality');
    if (props.monitors.modelQuality?.enabled) enabledMonitors.push('model_quality');
    if (props.monitors.modelBias?.enabled) enabledMonitors.push('model_bias');
    if (props.monitors.modelExplainability?.enabled) enabledMonitors.push('model_explainability');

    const baselineImageUri = props.monitors.dataQuality?.imageUri ?? props.monitors.modelQuality?.imageUri;
    if (!baselineImageUri) {
      throwConfigValidationError(
        'baselineTrainingDataS3Uri requires at least one of monitors.dataQuality.imageUri or ' +
          'monitors.modelQuality.imageUri to be set for the baseline processing job container.',
      );
    }

    const baselineTask = new CallAwsService(this, 'baseline-processing-job', {
      service: 'sagemaker',
      action: 'createProcessingJob',
      iamResources: [`arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:processing-job/*`],
      iamAction: 'sagemaker:CreateProcessingJob',
      parameters: {
        ProcessingJobName: JsonPath.format(`baseline-${endpointName}-{}`, JsonPath.stringAt('$$.Execution.Name')),
        ProcessingResources: {
          ClusterConfig: {
            InstanceCount: 1,
            InstanceType: 'ml.m5.xlarge',
            VolumeSizeInGB: 20,
            VolumeKmsKeyId: this.kmsKey.keyId,
          },
        },
        AppSpecification: {
          ImageUri: baselineImageUri,
        },
        RoleArn: this.monitoringRole.roleArn,
        ProcessingInputs: [
          {
            InputName: 'baseline_dataset',
            S3Input: {
              S3Uri: props.baselineTrainingDataS3Uri,
              LocalPath: '/opt/ml/processing/input/baseline_dataset',
              S3DataType: 'S3Prefix',
              S3InputMode: 'File',
            },
          },
        ],
        ProcessingOutputConfig: {
          Outputs: [
            {
              OutputName: 'baseline_output',
              S3Output: {
                S3Uri: props.baselineOutputDataS3Uri,
                LocalPath: '/opt/ml/processing/output',
                S3UploadMode: 'EndOfJob',
              },
            },
          ],
        },
        Environment: {
          dataset_format: props.baselineDatasetFormat ?? '{"csv": {"header": true}}',
          output_path: '/opt/ml/processing/output',
          publish_cloudwatch_metrics: 'Disabled',
        },
      },
      resultPath: '$.processingJobResult',
    });

    const baselineLogGroup = new LogGroup(this, 'baseline-log-group', {
      logGroupName: '/aws/states/' + props.naming.resourceName('baseline-' + endpointName, 480),
      retention: RetentionDays.ONE_MONTH,
      encryptionKey: this.kmsKey,
    });

    const baselineStateMachine = new StateMachine(this, 'baseline-state-machine', {
      stateMachineName: props.naming.resourceName(`baseline-${endpointName}`, 80),
      definitionBody: DefinitionBody.fromChainable(baselineTask),
      timeout: Duration.hours(2),
      logs: {
        destination: baselineLogGroup,
        level: LogLevel.ALL,
      },
    });

    baselineStateMachine.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['iam:PassRole'],
        resources: [this.monitoringRole.roleArn],
        conditions: {
          StringEquals: { 'iam:PassedToService': 'sagemaker.amazonaws.com' },
        },
      }),
    );

    const baselineScheduleExpr = props.baselineSchedule ?? 'cron(0 2 * * ? *)';
    validateScheduleExpression(baselineScheduleExpr, 'baselineSchedule');
    new Rule(this, 'baseline-schedule', {
      ruleName: props.naming.resourceName(`baseline-${endpointName}`, 64),
      description: `Periodic baselining for ${endpointName} monitors (${enabledMonitors.join(', ')})`,
      schedule: Schedule.expression(baselineScheduleExpr),
      targets: [
        new SfnStateMachine(baselineStateMachine, {
          input: RuleTargetInput.fromObject({
            endpointName,
            enabledMonitors,
          }),
        }),
      ],
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      baselineStateMachine,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Processing job names are dynamic and include execution IDs.',
        },
        ...INLINE_POLICY_SUPPRESSIONS,
        ...S3_REPLICATION_SUPPRESSIONS,
        {
          id: 'AwsSolutions-SF2',
          reason: 'X-Ray tracing is not required for this low-frequency baselining workflow.',
        },
      ],
      true,
    );
  }

  private addNagSuppressions(): void {
    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.monitoringRole,
      [
        ...INLINE_POLICY_SUPPRESSIONS,
        ...S3_REPLICATION_SUPPRESSIONS,
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Wildcard permissions required for: ECR image access, SageMaker processing jobs, ' +
            'CloudWatch metrics, EC2 network interface operations, and endpoint-config/* (CDK auto-generates ' +
            'endpoint config names to support replacement updates, so resource-level scoping is not possible).',
        },
      ],
      true,
    );
  }

  private createSsmExports(scheduleArns: string[]): void {
    const endpointName = this.props.endpointName;

    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'model-monitoring',
      resourceId: endpointName,
      name: 'monitor-schedule-count',
      value: String(scheduleArns.length),
    });

    if (scheduleArns.length > 0) {
      new MdaaParamAndOutput(this, {
        ...this.props,
        resourceType: 'model-monitoring',
        resourceId: endpointName,
        name: 'monitor-schedule-arns',
        value: Fn.join(',', scheduleArns),
      });
    }

    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'model-monitoring',
      resourceId: endpointName,
      name: 'output-bucket-name',
      value: this.outputBucket.bucketName,
    });
  }
}

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { ISecurityGroup, ISubnet } from 'aws-cdk-lib/aws-ec2';
import { IRole } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { CfnResource } from 'aws-cdk-lib';
import {
  CfnDataQualityJobDefinition,
  CfnModelQualityJobDefinition,
  CfnModelBiasJobDefinition,
  CfnModelExplainabilityJobDefinition,
  CfnMonitoringSchedule,
} from 'aws-cdk-lib/aws-sagemaker';
import { Construct } from 'constructs';
import { validateScheduleExpression } from './utils';

export type MonitorType = 'data-quality' | 'model-quality' | 'model-bias' | 'model-explainability';

export interface MonitorVpcConfig {
  readonly securityGroups: ISecurityGroup[];
  readonly subnets: ISubnet[];
}

export interface MonitorNetworkConfig {
  /**
   * When true, prevents all outbound network traffic from the monitoring container.
   * Defaults to false to allow the container to reach S3 and the monitored endpoint.
   */
  readonly enableNetworkIsolation?: boolean;
  readonly vpcConfig: MonitorVpcConfig;
}

export interface MonitorClusterConfig {
  readonly instanceCount: number;
  readonly instanceType: string;
  readonly volumeSizeInGb: number;
  readonly volumeKmsKey: IKey;
}

export interface MonitorStoppingCondition {
  readonly maxRuntimeInSeconds: number;
}

export interface BaseMonitorProps {
  /** IAM role for the monitoring job */
  readonly role: IRole;
  /** SageMaker monitoring container image URI (region-specific default image) */
  readonly imageUri: string;
  /** S3 output URI for monitoring results */
  readonly outputS3Uri: string;
  /** KMS key for output encryption */
  readonly outputKmsKey: IKey;
  /** Cluster configuration for the monitoring job */
  readonly clusterConfig: MonitorClusterConfig;
  /** Network configuration for the monitoring job */
  readonly networkConfig: MonitorNetworkConfig;
  /** Stopping condition for the monitoring job */
  readonly stoppingCondition?: MonitorStoppingCondition;
  /** Name of the SageMaker endpoint to monitor */
  readonly endpointName: string;
}

export interface DataQualityMonitorProps extends BaseMonitorProps {
  /** S3 URI for baseline statistics */
  readonly baselineStatisticsUri?: string;
  /** S3 URI for baseline constraints */
  readonly baselineConstraintsUri?: string;
}

export interface ModelQualityMonitorProps extends BaseMonitorProps {
  /** Problem type: BinaryClassification, MulticlassClassification, or Regression */
  readonly problemType: 'BinaryClassification' | 'MulticlassClassification' | 'Regression';
  /** S3 URI for ground truth data */
  readonly groundTruthS3Uri: string;
  /** Inference attribute for model quality evaluation */
  readonly inferenceAttribute?: string;
  /** Probability attribute for model quality evaluation */
  readonly probabilityAttribute?: string;
  /** Probability threshold for binary classification */
  readonly probabilityThresholdAttribute?: number;
  /** S3 URI for baseline constraints */
  readonly baselineConstraintsUri?: string;
}

export interface ModelBiasMonitorProps extends BaseMonitorProps {
  /** S3 URI for the Clarify bias analysis configuration JSON */
  readonly configUri: string;
  /** S3 URI for ground truth data */
  readonly groundTruthS3Uri: string;
  /** S3 URI for baseline constraints */
  readonly baselineConstraintsUri?: string;
  /** Feature attribute for bias analysis */
  readonly featuresAttribute?: string;
  /** Inference attribute for bias evaluation */
  readonly inferenceAttribute?: string;
  /** Probability attribute for bias evaluation */
  readonly probabilityAttribute?: string;
  /** Probability threshold for binary classification bias evaluation */
  readonly probabilityThresholdAttribute?: number;
}

export interface ModelExplainabilityMonitorProps extends BaseMonitorProps {
  /** S3 URI for the Clarify explainability analysis configuration JSON */
  readonly configUri: string;
  /** S3 URI for baseline constraints */
  readonly baselineConstraintsUri?: string;
  /** Feature attribute for explainability analysis */
  readonly featuresAttribute?: string;
  /** Inference attribute for explainability evaluation */
  readonly inferenceAttribute?: string;
  /** Probability attribute for explainability evaluation */
  readonly probabilityAttribute?: string;
}

export interface MdaaModelMonitorProps extends MdaaConstructProps {
  /** Monitor name identifier */
  readonly monitorName: string;
  /** Type of monitoring to configure */
  readonly monitorType: MonitorType;
  /** Cron or rate schedule expression for the monitoring job (e.g. "cron(0 * ? * * *)") */
  readonly schedule: string;
  /** Data quality monitor configuration */
  readonly dataQuality?: DataQualityMonitorProps;
  /** Model quality monitor configuration */
  readonly modelQuality?: ModelQualityMonitorProps;
  /** Model bias monitor configuration */
  readonly modelBias?: ModelBiasMonitorProps;
  /** Model explainability monitor configuration */
  readonly modelExplainability?: ModelExplainabilityMonitorProps;
}

type ValidatedDataQualityProps = MdaaModelMonitorProps & {
  monitorType: 'data-quality';
  dataQuality: DataQualityMonitorProps;
};
type ValidatedModelQualityProps = MdaaModelMonitorProps & {
  monitorType: 'model-quality';
  modelQuality: ModelQualityMonitorProps;
};
type ValidatedModelBiasProps = MdaaModelMonitorProps & { monitorType: 'model-bias'; modelBias: ModelBiasMonitorProps };
type ValidatedModelExplainabilityProps = MdaaModelMonitorProps & {
  monitorType: 'model-explainability';
  modelExplainability: ModelExplainabilityMonitorProps;
};

type ValidatedMonitorProps =
  | ValidatedDataQualityProps
  | ValidatedModelQualityProps
  | ValidatedModelBiasProps
  | ValidatedModelExplainabilityProps;

const MONITOR_INPUT_LOCAL_PATH = '/opt/ml/processing/input';
const MONITOR_OUTPUT_LOCAL_PATH = '/opt/ml/processing/output';

/**
 * A construct for creating compliant SageMaker Model Monitor resources.
 * Supports all 4 monitor types: data quality, model quality, bias, and explainability.
 */
export class MdaaModelMonitor extends Construct {
  constructor(scope: Construct, id: string, props: MdaaModelMonitorProps) {
    super(scope, id);

    const scheduleName = props.naming.resourceName(`${props.monitorName}-schedule`, 63);
    const jobDefName = props.naming.resourceName(`${props.monitorName}-job-def`, 63);

    const validatedProps = this.validateJobDefProps(props);
    const jobDefinition = this.createJobDefinition(jobDefName, validatedProps);

    const schedule = new CfnMonitoringSchedule(this, 'schedule', {
      monitoringScheduleName: scheduleName,
      monitoringScheduleConfig: {
        monitoringJobDefinitionName: jobDefName,
        monitoringType: this.getMonitoringType(props.monitorType),
        scheduleConfig: {
          scheduleExpression: this.getScheduleExpression(props),
        },
      },
    });
    schedule.addDependency(jobDefinition);

    new MdaaParamAndOutput(
      this,
      {
        ...props,
        resourceType: 'monitor',
        resourceId: props.monitorName,
        name: 'schedule-arn',
        value: schedule.attrMonitoringScheduleArn,
      },
      scope,
    );
  }

  private validateJobDefProps(props: MdaaModelMonitorProps): ValidatedMonitorProps {
    switch (props.monitorType) {
      case 'data-quality':
        if (!props.dataQuality) throw new Error('dataQuality config is required when monitorType is "data-quality"');
        return props as ValidatedDataQualityProps;
      case 'model-quality':
        if (!props.modelQuality) throw new Error('modelQuality config is required when monitorType is "model-quality"');
        return props as ValidatedModelQualityProps;
      case 'model-bias':
        if (!props.modelBias) throw new Error('modelBias config is required when monitorType is "model-bias"');
        return props as ValidatedModelBiasProps;
      case 'model-explainability':
        if (!props.modelExplainability)
          throw new Error('modelExplainability config is required when monitorType is "model-explainability"');
        return props as ValidatedModelExplainabilityProps;
      default:
        throw new Error(`Unsupported monitorType: ${props.monitorType}`);
    }
  }

  private getScheduleExpression(props: MdaaModelMonitorProps): string {
    validateScheduleExpression(props.schedule);
    return props.schedule;
  }

  private getMonitoringType(type: MonitorType): string {
    switch (type) {
      case 'data-quality':
        return 'DataQuality';
      case 'model-quality':
        return 'ModelQuality';
      case 'model-bias':
        return 'ModelBias';
      case 'model-explainability':
        return 'ModelExplainability';
    }
  }

  private buildClusterConfig(config: MonitorClusterConfig): CfnDataQualityJobDefinition.ClusterConfigProperty {
    return {
      instanceCount: config.instanceCount,
      instanceType: config.instanceType,
      volumeSizeInGb: config.volumeSizeInGb,
      volumeKmsKeyId: config.volumeKmsKey.keyArn,
    };
  }

  private buildNetworkConfig(config: MonitorNetworkConfig): CfnDataQualityJobDefinition.NetworkConfigProperty {
    return {
      enableInterContainerTrafficEncryption: true,
      enableNetworkIsolation: config.enableNetworkIsolation ?? false,
      vpcConfig: {
        securityGroupIds: config.vpcConfig.securityGroups.map(sg => sg.securityGroupId),
        subnets: config.vpcConfig.subnets.map(s => s.subnetId),
      },
    };
  }

  private buildStoppingCondition(
    config?: MonitorStoppingCondition,
  ): CfnDataQualityJobDefinition.StoppingConditionProperty {
    return {
      maxRuntimeInSeconds: config?.maxRuntimeInSeconds ?? 3600,
    };
  }

  private createJobDefinition(jobDefName: string, props: ValidatedMonitorProps): CfnResource {
    switch (props.monitorType) {
      case 'data-quality':
        return this.createDataQualityJobDef(jobDefName, props.dataQuality);
      case 'model-quality':
        return this.createModelQualityJobDef(jobDefName, props.modelQuality);
      case 'model-bias':
        return this.createModelBiasJobDef(jobDefName, props.modelBias);
      case 'model-explainability':
        return this.createModelExplainabilityJobDef(jobDefName, props.modelExplainability);
    }
  }

  /** Build the common properties shared by all 4 job definition types */
  private buildCommonJobDefProps(jobDefName: string, config: BaseMonitorProps) {
    return {
      jobDefinitionName: jobDefName,
      jobResources: {
        clusterConfig: this.buildClusterConfig(config.clusterConfig),
      },
      networkConfig: this.buildNetworkConfig(config.networkConfig),
      roleArn: config.role.roleArn,
      stoppingCondition: this.buildStoppingCondition(config.stoppingCondition),
    };
  }

  /** Build the output config shared by all 4 job definition types */
  private buildJobOutputConfig(config: BaseMonitorProps) {
    return {
      monitoringOutputs: [
        {
          s3Output: {
            s3Uri: config.outputS3Uri,
            localPath: MONITOR_OUTPUT_LOCAL_PATH,
            s3UploadMode: 'EndOfJob',
          },
        },
      ],
      kmsKeyId: config.outputKmsKey.keyArn,
    };
  }

  private createDataQualityJobDef(jobDefName: string, config: DataQualityMonitorProps): CfnResource {
    return new CfnDataQualityJobDefinition(this, 'data-quality-job-def', {
      ...this.buildCommonJobDefProps(jobDefName, config),
      dataQualityAppSpecification: {
        imageUri: config.imageUri,
      },
      dataQualityJobInput: {
        endpointInput: {
          endpointName: config.endpointName,
          localPath: MONITOR_INPUT_LOCAL_PATH,
        },
      },
      dataQualityJobOutputConfig: this.buildJobOutputConfig(config),
      dataQualityBaselineConfig: config.baselineStatisticsUri
        ? {
            statisticsResource: { s3Uri: config.baselineStatisticsUri },
            constraintsResource: config.baselineConstraintsUri ? { s3Uri: config.baselineConstraintsUri } : undefined,
          }
        : undefined,
    });
  }

  private createModelQualityJobDef(jobDefName: string, config: ModelQualityMonitorProps): CfnResource {
    return new CfnModelQualityJobDefinition(this, 'model-quality-job-def', {
      ...this.buildCommonJobDefProps(jobDefName, config),
      modelQualityAppSpecification: {
        imageUri: config.imageUri,
        problemType: config.problemType,
      },
      modelQualityJobInput: {
        endpointInput: {
          endpointName: config.endpointName,
          localPath: MONITOR_INPUT_LOCAL_PATH,
          inferenceAttribute: config.inferenceAttribute,
          probabilityAttribute: config.probabilityAttribute,
          probabilityThresholdAttribute: config.probabilityThresholdAttribute,
        },
        groundTruthS3Input: {
          s3Uri: config.groundTruthS3Uri,
        },
      },
      modelQualityJobOutputConfig: this.buildJobOutputConfig(config),
      modelQualityBaselineConfig: config.baselineConstraintsUri
        ? {
            constraintsResource: { s3Uri: config.baselineConstraintsUri },
          }
        : undefined,
    });
  }

  private createModelBiasJobDef(jobDefName: string, config: ModelBiasMonitorProps): CfnResource {
    return new CfnModelBiasJobDefinition(this, 'model-bias-job-def', {
      ...this.buildCommonJobDefProps(jobDefName, config),
      modelBiasAppSpecification: {
        imageUri: config.imageUri,
        configUri: config.configUri,
      },
      modelBiasJobInput: {
        endpointInput: {
          endpointName: config.endpointName,
          localPath: MONITOR_INPUT_LOCAL_PATH,
          featuresAttribute: config.featuresAttribute,
          inferenceAttribute: config.inferenceAttribute,
          probabilityAttribute: config.probabilityAttribute,
          probabilityThresholdAttribute: config.probabilityThresholdAttribute,
        },
        groundTruthS3Input: {
          s3Uri: config.groundTruthS3Uri,
        },
      },
      modelBiasJobOutputConfig: this.buildJobOutputConfig(config),
      modelBiasBaselineConfig: config.baselineConstraintsUri
        ? {
            constraintsResource: { s3Uri: config.baselineConstraintsUri },
          }
        : undefined,
    });
  }

  private createModelExplainabilityJobDef(jobDefName: string, config: ModelExplainabilityMonitorProps): CfnResource {
    return new CfnModelExplainabilityJobDefinition(this, 'model-explainability-job-def', {
      ...this.buildCommonJobDefProps(jobDefName, config),
      modelExplainabilityAppSpecification: {
        imageUri: config.imageUri,
        configUri: config.configUri,
      },
      modelExplainabilityJobInput: {
        endpointInput: {
          endpointName: config.endpointName,
          localPath: MONITOR_INPUT_LOCAL_PATH,
          featuresAttribute: config.featuresAttribute,
          inferenceAttribute: config.inferenceAttribute,
          probabilityAttribute: config.probabilityAttribute,
        },
      },
      modelExplainabilityJobOutputConfig: this.buildJobOutputConfig(config),
      modelExplainabilityBaselineConfig: config.baselineConstraintsUri
        ? {
            constraintsResource: { s3Uri: config.baselineConstraintsUri },
          }
        : undefined,
    });
  }
}

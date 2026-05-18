/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { Ec2L3Construct, Ec2L3ConstructProps } from '@aws-mdaa/ec2-l3-construct';
import { EventBridgeHelper, EventBridgeProps } from '@aws-mdaa/eventbridge-helper';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import {
  MdaaDockerImageFunction,
  MdaaDockerImageFunctionProps,
  MdaaLambdaFunction,
  MdaaLambdaFunctionOptions,
  MdaaLambdaFunctionProps,
  MdaaLambdaRole,
} from '@aws-mdaa/lambda-constructs';
import { MdaaAlarm, MdaaLogGroup, MdaaLogInsightsQuery, MdaaMetricFilter } from '@aws-mdaa/cloudwatch-constructs';
import { aws_events_targets, Duration, Size } from 'aws-cdk-lib';
import { SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import {
  Code,
  DockerImageCode,
  Function as LambdaFunction,
  IFunction,
  LayerVersion,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { ArnPrincipal } from 'aws-cdk-lib/aws-iam';

/**
 * VPC configuration for Lambda function deployment.
 *
 * Defines VPC networking settings including subnet placement, security groups, and
 * network access controls for secure Lambda function deployment.
 *
 * Use cases: VPC Lambda deployment; Network isolation; Security group configuration; Subnet placement
 *
 * AWS: VPC configuration for Lambda function networking and security controls
 *
 * Validation: vpcId and subnetIds are required; securityGroupId and securityGroupEgressRules are optional
 */
export interface VpcConfigProps {
  /** VPC ID for Lambda function deployment. */
  readonly vpcId: string;
  /** Subnet IDs for Lambda function ENI placement. */
  readonly subnetIds: string[];
  /** Optional security group ID. If omitted, a new security group is created. */
  readonly securityGroupId?: string;
  /** Optional egress rules for the Lambda function security group. */
  readonly securityGroupEgressRules?: MdaaSecurityGroupRuleProps;
}

/**
 * Configuration for CloudWatch Logs Insights saved queries for Lambda log analysis.
 *
 * Defines saved query definitions that can be executed against Lambda function logs
 * for rapid error analysis, performance investigation, and operational insights.
 *
 * Use cases: Error log analysis; Performance troubleshooting; Request tracing; Operational monitoring
 *
 * AWS: CloudWatch Logs Insights query definitions for Lambda function log analysis
 *
 * Validation: queryName must be unique; queryString must be valid Logs Insights syntax; logGroupNames optional
 */
export interface LogInsightsQueryProps {
  /** Unique name for the saved query. */
  readonly queryName: string;
  /** CloudWatch Logs Insights query string. Leading whitespace is stripped; limit clause added if missing. */
  readonly queryString: string;
  /** Optional log group names for cross-function queries. Defaults to the function's log group. */
  readonly logGroupNames?: string[];
}

/**
 * Configuration for CloudWatch metric transformations defining log-to-metric conversion.
 *
 * Specifies how to extract metric values from Lambda function logs and publish them
 * to CloudWatch Metrics with dimensions and units.
 *
 * Use cases: Error rate metrics; Performance metrics; Business metrics; Custom monitoring
 *
 * AWS: CloudWatch metric transformation for log-to-metric conversion and custom metric publishing
 *
 * Validation: metricName and metricNamespace required; metricValue must be valid extraction pattern
 */
export interface MetricTransformationProps {
  /** CloudWatch metric name for the transformed metric. */
  readonly metricName: string;
  /** CloudWatch metric namespace for metric organization. */
  readonly metricNamespace: string;
  /** Metric value extraction pattern (constant like "1" or field reference like "$duration"). */
  readonly metricValue: string;
  /** Default value when filter pattern does not match. */
  readonly defaultValue?: number;
  /** CloudWatch metric unit (e.g., Count, Milliseconds). */
  readonly unit?: string;
  /** Metric dimensions for segmentation and filtering. */
  readonly dimensions?: { [key: string]: string };
}

/**
 * Configuration for CloudWatch metric filters extracting custom metrics from Lambda logs.
 *
 * Defines filter patterns and transformations for converting log data into CloudWatch
 * Metrics with support for JSON, space-delimited, and text patterns.
 *
 * Use cases: Error rate monitoring; Performance tracking; Business metric extraction; Custom alerting
 *
 * AWS: CloudWatch Logs metric filter for log-to-metric transformation
 *
 * Validation: filterName must be unique; filterPattern must be valid syntax; metricTransformations required
 */
export interface MetricFilterProps {
  /** Unique name for the metric filter. */
  readonly filterName: string;
  /** CloudWatch Logs filter pattern for matching log events. */
  readonly filterPattern: string;
  /** Metric transformations defining how matched data is converted to metrics. */
  readonly metricTransformations: MetricTransformationProps[];
}

/**
 * Configuration for CloudWatch metric data queries used in metric math alarms.
 *
 * Defines individual metrics or expressions for metric math alarms enabling complex
 * alerting logic combining multiple metrics.
 *
 * Use cases: Metric math expressions; Multi-metric alarms; Calculated metrics; Complex alerting
 *
 * AWS: CloudWatch metric data query for metric math alarms and complex metric expressions
 *
 * Validation: id required; either expression or metricName/namespace required
 */
export interface MetricDataQueryProps {
  /** Unique identifier for the query, referenced in metric math expressions (e.g., "m1", "total"). */
  readonly id: string;
  /** Metric math expression (e.g., "m1+m2"). Mutually exclusive with metricName. */
  readonly expression?: string;
  /** Human-readable label for dashboards and alarms. */
  readonly label?: string;
  /** Whether this metric data should be returned in query results. */
  readonly returnData?: boolean;
  /** CloudWatch metric name. Mutually exclusive with expression. */
  readonly metricName?: string;
  /** CloudWatch metric namespace. Required when using metricName. */
  readonly namespace?: string;
  /** Statistic for metric aggregation (e.g., Sum, Average, Maximum). */
  readonly statistic?: string;
  /** Evaluation period in seconds for metric aggregation. */
  readonly period?: number;
  /** CloudWatch metric unit (e.g., Count, Milliseconds). */
  readonly unit?: string;
  /** Metric dimensions for filtering to specific instances. */
  readonly dimensions?: { [key: string]: string };
}

/**
 * Configuration for CloudWatch alarms for Lambda function monitoring and alerting.
 *
 * Defines alarm conditions, thresholds, and notification actions for both single metric
 * and metric math alarms with support for custom and AWS metrics.
 *
 * Use cases: Error rate alerting; Performance monitoring; Custom metric alarms; Multi-metric conditions
 *
 * AWS: CloudWatch alarm for Lambda function monitoring with SNS integration
 *
 * Validation: alarmName required; either metricName/namespace or metrics array required; threshold and evaluationPeriods required
 */
export interface AlarmProps {
  /** Unique name for the alarm. */
  readonly alarmName: string;

  // Single metric alarm properties
  /** Metric name for single metric alarms. Validated against metric filters for custom metrics. */
  readonly metricName?: string;
  /** Metric namespace. AWS/* namespaces bypass validation. */
  readonly namespace?: string;
  /** Statistic for metric aggregation (e.g., Sum, Average). */
  readonly statistic?: string;
  /** Evaluation period in seconds. */
  readonly period?: number;
  /** CloudWatch metric unit. */
  readonly unit?: string;
  /** Metric dimensions. Supports {{functionName}} placeholder. */
  readonly dimensions?: { [key: string]: string };

  // Metric math alarm properties
  /** Metric data queries for metric math alarms. Mutually exclusive with metricName. */
  readonly metrics?: MetricDataQueryProps[];

  // Common alarm properties
  /** Number of consecutive periods the metric must breach the threshold. */
  readonly evaluationPeriods: number;
  /** Threshold value for alarm comparison. */
  readonly threshold: number;
  /** Comparison operator (e.g., GreaterThanOrEqualToThreshold). */
  readonly comparisonOperator: string;
  /** Missing data treatment (notBreaching, breaching, ignore, missing). */
  readonly treatMissingData?: string;
  /** Human-readable alarm description. */
  readonly alarmDescription?: string;
  /** Whether alarm actions are enabled during state changes. */
  readonly actionsEnabled?: boolean;
  /** Datapoints that must breach threshold (M out of N evaluation). */
  readonly datapointsToAlarm?: number;

  // Actions
  /** SNS topic ARNs for ALARM state notifications. */
  readonly alarmActions?: string[];
  /** SNS topic ARNs for OK state notifications. */
  readonly okActions?: string[];
  /** SNS topic ARNs for INSUFFICIENT_DATA state notifications. */
  readonly insufficientDataActions?: string[];
}

/**
 * Lambda function configuration for data processing with S3 event and EventBridge integration.
 *
 * Defines Lambda function properties for data processing workflows triggered by S3 object
 * events and EventBridge rules in data lake operations.
 *
 * Use cases: S3 event-driven data processing; Data transformation; EventBridge-triggered operations
 *
 * AWS: Lambda function configuration with S3 EventBridge notifications and custom event rules
 *
 * Validation: srcDir must exist; runtime must be valid Lambda runtime; handler must match code structure
 */
export interface FunctionProps extends FunctionOptions {
  /** Source code directory path containing Lambda function code. */
  readonly srcDir: string;
  /** Lambda function handler (e.g., 'index.handler'). */
  readonly handler?: string;
  /** Lambda runtime (e.g., python3.13, nodejs22.x). */
  readonly runtime?: string;
  /** When true, srcDir must contain a Dockerfile for container image deployment. */
  readonly dockerBuild?: boolean;
  /** Principal ARN granted Lambda invoke permissions. */
  readonly grantInvoke?: string;
  /** Additional resource permissions mapped by SID. */
  readonly additionalResourcePermissions?: { [sid: string]: AdditionalResourcePermission };
  /** CloudWatch Logs Insights saved queries for log analysis. */
  readonly logInsightsQueries?: LogInsightsQueryProps[];
  /** CloudWatch metric filters for custom metric extraction. */
  readonly metricFilters?: MetricFilterProps[];
  /** CloudWatch alarms for monitoring and alerting. Custom metrics validated against metricFilters. */
  readonly alarms?: AlarmProps[];
}

/**
 * Lambda resource permission for fine-grained access control.
 *
 * Defines specific permissions for AWS principals to access Lambda functions
 * with optional source restrictions for enhanced security.
 *
 * Use cases: S3 service permissions; EventBridge rule access; Cross-account data processing
 *
 * AWS: Lambda resource policy permissions for controlled function access
 *
 * Validation: principal and action are required; sourceAccount and sourceArn provide additional security
 */
export interface AdditionalResourcePermission {
  /** AWS principal ARN for Lambda function access. */
  readonly principal: string;
  /** Lambda action (e.g., lambda:InvokeFunction). */
  readonly action: string;
  /** Optional source account restriction for cross-account security. */
  readonly sourceAccount?: string;
  /** Optional source resource ARN restriction for fine-grained access control. */
  readonly sourceArn?: string;
}

export interface FunctionOptions {
  /** Lambda function name. */
  readonly functionName: string;
  /** Optional function description. */
  readonly description?: string;
  /** IAM role ARN for Lambda function execution. */
  readonly roleArn: string;
  /** EventBridge configuration for event-driven execution. */
  readonly eventBridge?: EventBridgeProps;
  /** VPC configuration for network deployment. */
  readonly vpcConfig?: VpcConfigProps;
  /** Maximum event age in seconds (60-21600). */
  readonly maxEventAgeSeconds?: number;
  /** Maximum retry attempts for failed executions (0-2). */
  readonly retryAttempts?: number;
  /** Generated layer names to attach to the function. */
  readonly generatedLayerNames?: string[];
  /** Existing layer version ARNs mapped by name. */
  readonly layerArns?: { [name: string]: string };
  /** Function timeout in seconds. */
  readonly timeoutSeconds?: number;
  /** Environment variables for function configuration. */
  readonly environment?: {
    [key: string]: string;
  };
  /** Reserved concurrent executions for capacity management. */
  readonly reservedConcurrentExecutions?: number;
  /** Memory allocation in MB (128-10240). */
  readonly memorySizeMB?: number;
  /**
   * The size of the function's /tmp directory in MB.
   * @default 512 MiB
   */
  readonly ephemeralStorageSizeMB?: number;
}

/**
 * Lambda layer configuration for shared code and dependency management.
 *
 * Defines layer source, naming, and build options for reusable Lambda layers.
 *
 * Use cases: Shared library deployment; Dependency management; Code reuse
 *
 * AWS: Lambda layer configuration for shared library deployment
 *
 * Validation: src and layerName required; dockerBuild optional
 */
export interface LayerProps {
  /** Source directory or ZIP file path for layer code. */
  readonly src: string;
  /**
   * Description of the layer
   */
  readonly description?: string;
  /**
   * Layer name
   */
  readonly layerName: string;
  /**
   * If true, src is expected to contain a Dockerfile for building the layer
   */
  readonly dockerBuild?: boolean;
}

export interface LambdaFunctionL3ConstructProps extends MdaaL3ConstructProps {
  /** KMS key ARN for Lambda function encryption. */
  readonly kmsArn?: string;
  /** Lambda layer definitions for code sharing and dependency management. */
  readonly layers?: LayerProps[];
  /** Lambda function definitions for deployment. */
  readonly functions?: FunctionProps[];
  readonly overrideScope?: boolean;
}

export class LambdaFunctionL3Construct extends MdaaL3Construct {
  protected readonly props: LambdaFunctionL3ConstructProps;
  private readonly kmsKey: IKey;
  public readonly functionsMap: { [name: string]: LambdaFunction } = {};

  constructor(scope: Construct, id: string, props: LambdaFunctionL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    if (!this.props.kmsArn) {
      throw new Error('Project kms key must be defined');
    }
    this.kmsKey = MdaaKmsKey.fromKeyArn(props.overrideScope ? this : this.scope, 'project-kms', this.props.kmsArn);

    const generatedLayers = Object.fromEntries(
      this.props.layers?.map(layerProps => {
        return [layerProps.layerName, this.createLambdaLayer(layerProps)];
      }) || [],
    );

    // Build our functions!
    for (const functionProps of this.props.functions || []) {
      this.functionsMap[functionProps.functionName] = this.createFunctionFromProps(functionProps, generatedLayers);
    }

    //Remove unneeded inline policies which CDK automatically adds to execution role
    //We add a resource policy to the DLQ which allows the execution role to write to it.
    //This avoids hitting NIST.800.53.R5-IAMNoInlinePolicy and HIPAA.Security-IAMNoInlinePolicy
    for (const child of (this.props.overrideScope ? this : this.scope).node.children) {
      if (child.node.id.startsWith('LambdaRole')) {
        this.node.tryRemoveChild(child.node.id);
      }
    }
  }

  private createLambdaLayer(layerProps: LayerProps): LayerVersion {
    const code = layerProps.dockerBuild ? Code.fromDockerBuild(layerProps.src) : Code.fromAsset(layerProps.src);

    return new LayerVersion(this.props.overrideScope ? this : this.scope, `layer-${layerProps.layerName}`, {
      code,
      layerVersionName: this.props.naming.resourceName(layerProps.layerName, 64),
      description: layerProps.description,
    });
  }

  /** @jsii ignore */
  private createFunctionFromProps(
    functionProps: FunctionProps,
    generatedLayersByName: { [name: string]: LayerVersion },
  ): LambdaFunction {
    const role = MdaaLambdaRole.fromRoleArn(
      this.props.overrideScope ? this : this.scope,
      `lambda-role-${functionProps.functionName}`,
      functionProps.roleArn,
    );

    const functionVpcProps = this.createVpcConfiguration(functionProps);
    const dlq = EventBridgeHelper.createDlq(
      this.props.overrideScope ? this : this.scope,
      this.props.naming,
      functionProps.functionName,
      this.kmsKey,
      role,
    );

    const lambdaOptions: MdaaLambdaFunctionOptions = {
      ...functionVpcProps,
      functionName: functionProps.functionName,
      description: functionProps.description,
      role: role,
      environmentEncryption: this.kmsKey,
      naming: this.props.naming,
      deadLetterQueue: dlq,
      retryAttempts: functionProps.retryAttempts,
      maxEventAge: functionProps.maxEventAgeSeconds ? Duration.seconds(functionProps.maxEventAgeSeconds) : undefined,
      timeout: functionProps.timeoutSeconds ? Duration.seconds(functionProps.timeoutSeconds) : undefined,
      environment: functionProps.environment,
      reservedConcurrentExecutions: functionProps.reservedConcurrentExecutions,
      memorySize: functionProps.memorySizeMB,
      ephemeralStorageSize: functionProps.ephemeralStorageSizeMB
        ? Size.mebibytes(functionProps.ephemeralStorageSizeMB)
        : undefined,
    };

    const lambdaFunction = this.createDockerOrLambdaFunction(lambdaOptions, functionProps, generatedLayersByName);

    this.addFunctionPermissions(functionProps, lambdaFunction);

    //An inline policy to allow the Lambda role to write to DLQ is automatically added,
    //but this triggers Nags. Instead, we use the Queue Resource policy,
    //and remove the inline policy here.
    role.node.tryRemoveChild('Policy');
    this.addNagSuppressions(lambdaFunction);

    if (functionProps.eventBridge) {
      this.createFunctionEventBridgeRules(functionProps.eventBridge, functionProps.functionName, lambdaFunction);
    }

    this.createObservabilityResources(functionProps, lambdaFunction);

    return lambdaFunction;
  }

  /**
   * Create VPC configuration for Lambda function if specified
   */
  private createVpcConfiguration(functionProps: FunctionProps): object {
    if (!functionProps.vpcConfig) {
      return {};
    }

    const securityGroup = functionProps.vpcConfig.securityGroupId
      ? SecurityGroup.fromSecurityGroupId(
          this,
          `${functionProps.functionName}-sg`,
          functionProps.vpcConfig.securityGroupId,
        )
      : this.createFunctionSecurityGroup(
          `${functionProps.functionName}-sg`,
          functionProps.vpcConfig?.vpcId,
          functionProps.vpcConfig.securityGroupEgressRules,
        );

    const vpc = Vpc.fromVpcAttributes(this, `vpc-${functionProps.functionName}`, {
      availabilityZones: ['dummy'],
      vpcId: functionProps.vpcConfig.vpcId,
    });

    const subnets = functionProps.vpcConfig.subnetIds.map(id => {
      return Subnet.fromSubnetId(this, `${functionProps.functionName}-subnet-${id}`, id);
    });

    return {
      securityGroups: [securityGroup],
      vpc: vpc,
      vpcSubnets: {
        subnets: subnets,
      },
    };
  }

  /**
   * Add resource-based permissions to Lambda function
   */
  private addFunctionPermissions(functionProps: FunctionProps, lambdaFunction: LambdaFunction): void {
    if (functionProps.grantInvoke) {
      lambdaFunction.grantInvoke(new ArnPrincipal(functionProps.grantInvoke));
    }

    if (functionProps.additionalResourcePermissions) {
      for (const [sid, permission] of Object.entries(functionProps.additionalResourcePermissions)) {
        const permissionProps = {
          principal: new ArnPrincipal(permission.principal),
          action: permission.action,
          ...(permission.sourceArn && { sourceArn: permission.sourceArn }),
          ...(permission.sourceAccount && { sourceAccount: permission.sourceAccount }),
        };
        lambdaFunction.addPermission(sid, permissionProps);
      }
    }
  }

  /**
   * Add CDK Nag suppressions for Lambda function
   */
  private addNagSuppressions(lambdaFunction: LambdaFunction): void {
    MdaaNagSuppressions.addCodeResourceSuppressions(
      lambdaFunction,
      [
        { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Concurrency Limits not required.' },
        { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'VPC Not Required' },
        { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Concurrency Limits not required.' },
        { id: 'PCI.DSS.321-LambdaConcurrency', reason: 'Concurrency Limits not required.' },
        { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'VPC Not Required' },
        { id: 'PCI.DSS.321-LambdaInsideVPC', reason: 'VPC Not Required' },
      ],
      true,
    );
  }

  /**
   * Create observability resources (metric filters, alarms, log insights queries)
   */
  private createObservabilityResources(functionProps: FunctionProps, lambdaFunction: LambdaFunction): void {
    const createdMetrics = this.createMetricFilters(functionProps);
    this.createAlarms(functionProps, lambdaFunction, createdMetrics);
    this.createLogInsightsQueries(functionProps, lambdaFunction);
  }

  /**
   * Create CloudWatch metric filters and track created metrics
   */
  private createMetricFilters(functionProps: FunctionProps): Map<string, { namespace: string; metricName: string }> {
    const createdMetrics = new Map<string, { namespace: string; metricName: string }>();

    if (!functionProps.metricFilters) {
      return createdMetrics;
    }

    const logGroup = new MdaaLogGroup(this, `log-group-${functionProps.functionName}`, {
      logGroupNamePathPrefix: '/aws/lambda',
      logGroupName: functionProps.functionName,
      encryptionKey: this.kmsKey,
      retention: RetentionDays.INFINITE,
      naming: this.props.naming,
      createParams: false,
      createOutputs: false,
    });

    for (const [index, filterProps] of functionProps.metricFilters.entries()) {
      new MdaaMetricFilter(this, `metric-filter-${functionProps.functionName}-${index}`, {
        filterName: filterProps.filterName,
        logGroup,
        filterPattern: filterProps.filterPattern,
        metricTransformations: filterProps.metricTransformations,
        functionName: functionProps.functionName,
        naming: this.props.naming,
      });

      // Track metrics for validation
      for (const transform of filterProps.metricTransformations) {
        const key = `${transform.metricNamespace}:${transform.metricName}`;
        createdMetrics.set(key, {
          namespace: transform.metricNamespace,
          metricName: transform.metricName,
        });
      }
    }

    return createdMetrics;
  }

  /**
   * Create CloudWatch alarms with metric validation
   */
  private createAlarms(
    functionProps: FunctionProps,
    lambdaFunction: LambdaFunction,
    createdMetrics: Map<string, { namespace: string; metricName: string }>,
  ): void {
    if (!functionProps.alarms) {
      return;
    }

    for (const [index, alarmProps] of functionProps.alarms.entries()) {
      this.validateAlarmMetric(alarmProps, createdMetrics);

      const dimensions = this.replacePlaceholders(alarmProps.dimensions, lambdaFunction);

      new MdaaAlarm(this, `alarm-${functionProps.functionName}-${index}`, {
        ...alarmProps,
        dimensions,
        functionName: functionProps.functionName,
        naming: this.props.naming,
      });
    }
  }

  /**
   * Validate that alarm references an existing metric (skip AWS metrics)
   */
  private validateAlarmMetric(
    alarmProps: AlarmProps,
    createdMetrics: Map<string, { namespace: string; metricName: string }>,
  ): void {
    if (!alarmProps.namespace || alarmProps.namespace.startsWith('AWS/')) {
      return;
    }

    const metricKey = `${alarmProps.namespace}:${alarmProps.metricName}`;
    if (!createdMetrics.has(metricKey)) {
      const availableMetrics = Array.from(createdMetrics.keys()).join(', ');
      throw new Error(
        `Alarm "${alarmProps.alarmName}" references undefined metric "${alarmProps.metricName}" ` +
          `in namespace "${alarmProps.namespace}". Available metrics: ${availableMetrics || 'none'}`,
      );
    }
  }

  /**
   * Create CloudWatch Logs Insights queries
   */
  private createLogInsightsQueries(functionProps: FunctionProps, lambdaFunction: LambdaFunction): void {
    if (!functionProps.logInsightsQueries) {
      return;
    }

    for (const [index, queryProps] of functionProps.logInsightsQueries.entries()) {
      const logGroupNames = queryProps.logGroupNames ?? [`/aws/lambda/${lambdaFunction.functionName}`];

      new MdaaLogInsightsQuery(this, `query-${functionProps.functionName}-${index}`, {
        queryName: queryProps.queryName,
        queryString: queryProps.queryString,
        logGroupNames,
        functionName: functionProps.functionName,
        naming: this.props.naming,
      });
    }
  }

  /**
   * Replace placeholders in alarm dimensions with actual values
   */
  private replacePlaceholders(
    dimensions: { [key: string]: string } | undefined,
    lambdaFunction: LambdaFunction,
  ): { [key: string]: string } | undefined {
    if (!dimensions) {
      return undefined;
    }

    const replacedDimensions: { [key: string]: string } = {};
    for (const [key, value] of Object.entries(dimensions)) {
      replacedDimensions[key] = value.replace('{{functionName}}', lambdaFunction.functionName);
    }

    return replacedDimensions;
  }

  private createDockerOrLambdaFunction(
    lambdaOptions: MdaaLambdaFunctionOptions,
    functionProps: FunctionProps,
    generatedLayersByName: { [name: string]: LayerVersion },
  ): LambdaFunction {
    if (functionProps.dockerBuild) {
      const lambdaProps: MdaaDockerImageFunctionProps = {
        ...lambdaOptions,
        code: DockerImageCode.fromImageAsset(functionProps.srcDir),
      };
      return new MdaaDockerImageFunction(
        this.props.overrideScope ? this : this.scope,
        functionProps.functionName,
        lambdaProps,
      );
    } else {
      if (!functionProps.runtime) {
        throw new Error('Function runtime must be defined for non-docker functions');
      }
      if (!functionProps.handler) {
        throw new Error('Function handler must be defined for non-docker functions');
      }
      const existingLayers = Object.entries(functionProps.layerArns || {}).map(entry =>
        LayerVersion.fromLayerVersionArn(
          this.props.overrideScope ? this : this.scope,
          `${functionProps.functionName}-${entry[0]}`,
          entry[1],
        ),
      );

      const generatedLayers = functionProps.generatedLayerNames?.map(generatedLayerName => {
        const generatedLayer = generatedLayersByName[generatedLayerName];
        if (!generatedLayer) {
          throw new Error(`Function references non-existant generated layer ${generatedLayerName}`);
        }
        return generatedLayer;
      });
      const lambdaProps: MdaaLambdaFunctionProps = {
        ...lambdaOptions,
        runtime: new Runtime(functionProps.runtime),
        code: Code.fromAsset(functionProps.srcDir),
        handler: functionProps.handler,
        layers: [...(generatedLayers || []), ...existingLayers],
      };

      return new MdaaLambdaFunction(
        this.props.overrideScope ? this : this.scope,
        functionProps.functionName,
        lambdaProps,
      );
    }
  }

  private createFunctionSecurityGroup(
    sgName: string,
    vpcId: string,
    securityGroupEgressRules?: MdaaSecurityGroupRuleProps,
  ): SecurityGroup {
    const ec2L3Props: Ec2L3ConstructProps = {
      ...(this.props as MdaaL3ConstructProps),
      adminRoles: [],
      securityGroups: {
        [sgName]: {
          vpcId: vpcId,
          egressRules: securityGroupEgressRules,
        },
      },
    };
    const ec2Construct = new Ec2L3Construct(this, `ec2`, ec2L3Props);
    return ec2Construct.securityGroups[sgName];
  }

  private createFunctionEventBridgeRules(
    eventBridgeProps: EventBridgeProps,
    functionName: string,
    lambdaFunction: IFunction,
  ) {
    const dlq = EventBridgeHelper.createDlq(
      this.props.overrideScope ? this : this.scope,
      this.props.naming,
      `${functionName}-events`,
      this.kmsKey,
    );

    const eventBridgeRuleProps = EventBridgeHelper.createNamedEventBridgeRuleProps(eventBridgeProps, functionName);

    for (const [ruleName, ruleProps] of Object.entries(eventBridgeRuleProps)) {
      const target = new aws_events_targets.LambdaFunction(lambdaFunction, {
        deadLetterQueue: dlq,
        maxEventAge: eventBridgeProps.maxEventAgeSeconds
          ? Duration.seconds(eventBridgeProps.maxEventAgeSeconds)
          : undefined,
        retryAttempts: eventBridgeProps.retryAttempts,
        event: RuleTargetInput.fromObject(ruleProps.input),
      });
      EventBridgeHelper.createEventBridgeRuleForTarget(
        this.props.overrideScope ? this : this.scope,
        this.props.naming,
        target,
        ruleName,
        ruleProps,
      );
    }
  }
}

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
import { MdaaAlarm, MdaaLogInsightsQuery, MdaaMetricFilter } from '@aws-mdaa/cloudwatch-constructs';
import { aws_events_targets, Duration, Size } from 'aws-cdk-lib';
import { SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { IKey } from 'aws-cdk-lib/aws-kms';
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
 * Q-ENHANCED-INTERFACE
 * VPC configuration properties for Lambda function deployment providing networking and security controls. Defines VPC networking configuration for Lambda functions including subnet placement, security groups, and network access controls for secure function deployment.
 *
 * Use cases: VPC Lambda deployment; Network isolation; Security group configuration; Subnet placement
 *
 * AWS: VPC configuration for Lambda function networking and security controls
 *
 * Validation: vpcId and subnetIds are required; securityGroupId and securityGroupEgressRules are optional
 */
export interface VpcConfigProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC ID for Lambda function deployment enabling network isolation and VPC connectivity for secure function execution. Defines the specific VPC where the Lambda function will be deployed for network isolation and secure connectivity to VPC resources.
   *
   * Use cases: VPC deployment; Network isolation; Secure connectivity; VPC resource access
   *
   * AWS: AWS VPC ID for Lambda function VPC deployment and network isolation
   *
   * Validation: Must be valid VPC ID; required for VPC Lambda deployment; enables secure network connectivity
   **/
  readonly vpcId: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required array of subnet IDs for Lambda function placement controlling availability zone distribution and network segmentation. Defines the specific subnets within the VPC where Lambda function ENIs will be created for network connectivity and availability.
   *
   * Use cases: Subnet placement; Availability zone distribution; Network segmentation; ENI placement
   *
   * AWS: Subnet IDs for Lambda function ENI placement and network connectivity
   *
   * Validation: Must be array of valid subnet ID strings; required for Lambda subnet placement and connectivity
   **/
  readonly subnetIds: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional security group ID for Lambda function network access control enabling custom security group configuration and traffic filtering. When specified, uses existing security group for Lambda function network access control; otherwise creates new security group.
   *
   * Use cases: Custom security group; Network access control; Traffic filtering; Security configuration
   *
   * AWS: Security group ID for Lambda function network access control and traffic filtering
   *
   * Validation: Must be valid security group ID if provided; enables custom security group configuration
   **/
  readonly securityGroupId?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional security group egress rules for Lambda function outbound traffic control enabling fine-grained network access management and security controls. Provides custom egress rules for Lambda function security group controlling outbound network access.
   *
   * Use cases: Egress control; Outbound traffic filtering; Network security; Access management
   *
   * AWS: Security group egress rules for Lambda function outbound traffic control and network security
   *
   * Validation: Must be valid MdaaSecurityGroupRuleProps if provided; enables custom egress rule configuration
   *   **/
  readonly securityGroupEgressRules?: MdaaSecurityGroupRuleProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for CloudWatch Logs Insights saved queries enabling pre-built log analysis for Lambda function troubleshooting and monitoring. Defines saved query definitions that can be executed against Lambda function logs for rapid error analysis, performance investigation, and operational insights.
 *
 * Use cases: Error log analysis; Performance troubleshooting; Request tracing; Operational monitoring; Log pattern analysis
 *
 * AWS: CloudWatch Logs Insights query definitions for Lambda function log analysis and troubleshooting
 *
 * Validation: queryName must be unique; queryString must be valid Logs Insights syntax; logGroupNames optional (defaults to function log group)
 */
export interface LogInsightsQueryProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required unique name for the CloudWatch Logs Insights query enabling query identification and organization. Provides a descriptive name for the saved query that appears in the CloudWatch console and can be referenced programmatically for log analysis workflows.
   *
   * Use cases: Query identification; Console display; Programmatic reference; Query organization
   *
   * AWS: CloudWatch Logs Insights query name for saved query identification and management
   *
   * Validation: Must be unique within the function; should be descriptive of query purpose; used for SSM parameter naming
   **/
  readonly queryName: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required CloudWatch Logs Insights query string defining log analysis logic for Lambda function troubleshooting. Specifies the query syntax for filtering, parsing, and analyzing Lambda function logs with automatic whitespace cleaning and limit clause addition.
   *
   * Use cases: Error filtering; Performance analysis; Request tracing; Log pattern matching; Statistical aggregation
   *
   * AWS: CloudWatch Logs Insights query syntax for Lambda function log analysis and pattern extraction
   *
   * Validation: Must be valid Logs Insights query syntax; leading whitespace automatically stripped; limit clause added if missing
   **/
  readonly queryString: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of CloudWatch log group names for cross-function query analysis enabling multi-function log correlation. When specified, query executes across multiple log groups for comprehensive analysis; when omitted, automatically uses the Lambda function's log group.
   *
   * Use cases: Cross-function analysis; Multi-service correlation; Distributed tracing; Pipeline-wide monitoring
   *
   * AWS: CloudWatch log group names for Logs Insights query scope and cross-function analysis
   *
   * Validation: Must be valid log group names if provided; defaults to function log group when omitted; enables cross-function queries
   **/
  readonly logGroupNames?: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for CloudWatch metric transformations defining how log data is converted to metrics for monitoring and alerting. Specifies the transformation logic for extracting metric values from Lambda function logs and publishing them to CloudWatch Metrics with dimensions and units.
 *
 * Use cases: Error rate metrics; Performance metrics; Business metrics; Custom monitoring; Operational dashboards
 *
 * AWS: CloudWatch metric transformation for log-to-metric conversion and custom metric publishing
 *
 * Validation: metricName and metricNamespace required; metricValue must be valid extraction pattern; unit and dimensions optional
 */
export interface MetricTransformationProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required CloudWatch metric name for the transformed metric enabling metric identification and monitoring. Defines the specific metric name that will be published to CloudWatch Metrics for tracking Lambda function behavior and performance.
   *
   * Use cases: Error count tracking; Duration monitoring; Custom business metrics; Performance indicators
   *
   * AWS: CloudWatch metric name for custom metric publishing and monitoring dashboards
   *
   * Validation: Must be valid metric name; used for SSM parameter export; appears in CloudWatch console
   **/
  readonly metricName: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required CloudWatch metric namespace for metric organization and grouping enabling logical metric categorization. Defines the namespace under which the metric will be published for organizing related metrics and enabling namespace-level queries.
   *
   * Use cases: Metric organization; Namespace-level queries; Dashboard grouping; Cost allocation
   *
   * AWS: CloudWatch metric namespace for custom metric organization and categorization
   *
   * Validation: Must be valid namespace; used for SSM parameter export; enables metric grouping
   **/
  readonly metricNamespace: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required metric value extraction pattern defining how to extract numeric values from log events for metric publishing. Specifies the value to publish to CloudWatch Metrics, either as a constant (e.g., "1" for counts) or as a log field reference (e.g., "$duration" for extracted values).
   *
   * Use cases: Error counting; Duration extraction; Memory usage tracking; Custom value extraction
   *
   * AWS: CloudWatch metric value for log-to-metric transformation and numeric data extraction
   *
   * Validation: Must be valid value pattern; supports constants and field references; enables flexible metric extraction
   **/
  readonly metricValue: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional default metric value when filter pattern does not match log events enabling consistent metric publishing. Provides a fallback value for the metric when the filter pattern doesn't match any log events, ensuring continuous metric data.
   *
   * Use cases: Zero-value defaults; Missing data handling; Continuous metric streams; Gap filling
   *
   * AWS: CloudWatch metric default value for non-matching log events and continuous metric publishing
   *
   * Validation: Must be numeric if provided; used when filter pattern doesn't match; enables gap-free metrics
   **/
  readonly defaultValue?: number;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch metric unit for metric value interpretation enabling proper metric visualization and analysis. Specifies the unit of measurement for the metric value (e.g., Count, Milliseconds, Megabytes) for correct display in dashboards and alarms.
   *
   * Use cases: Duration metrics; Memory metrics; Count metrics; Rate metrics; Size metrics
   *
   * AWS: CloudWatch metric unit for metric value interpretation and dashboard visualization
   *
   * Validation: Must be valid CloudWatch metric unit if provided; used for SSM parameter export; enables proper metric display
   **/
  readonly unit?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch metric dimensions for metric segmentation and filtering enabling multi-dimensional metric analysis. Provides key-value pairs for segmenting metrics by attributes like environment, service, or function name for detailed analysis and filtering.
   *
   * Use cases: Environment segmentation; Service filtering; Function-level metrics; Multi-dimensional analysis
   *
   * AWS: CloudWatch metric dimensions for metric segmentation and multi-dimensional analysis
   *
   * Validation: Must be valid dimension key-value pairs if provided; enables metric filtering and segmentation
   **/
  readonly dimensions?: { [key: string]: string };
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for CloudWatch metric filters enabling extraction of custom metrics from Lambda function logs for monitoring and alerting. Defines filter patterns and transformations for converting log data into CloudWatch Metrics with support for JSON, space-delimited, and text patterns.
 *
 * Use cases: Error rate monitoring; Performance tracking; Business metric extraction; Custom alerting; Operational dashboards
 *
 * AWS: CloudWatch Logs metric filter for log-to-metric transformation and custom metric publishing
 *
 * Validation: filterName must be unique; filterPattern must be valid syntax; metricTransformations array required
 */
export interface MetricFilterProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required unique name for the CloudWatch metric filter enabling filter identification and management. Provides a descriptive name for the metric filter that appears in the CloudWatch console and is used for SSM parameter export.
   *
   * Use cases: Filter identification; Console display; SSM parameter naming; Filter management
   *
   * AWS: CloudWatch Logs metric filter name for filter identification and management
   *
   * Validation: Must be unique within the function; should be descriptive of filter purpose; used for SSM parameter naming
   **/
  readonly filterName: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required CloudWatch Logs filter pattern for matching and extracting data from log events enabling flexible log parsing. Supports JSON pattern syntax for structured logs, space-delimited patterns for formatted logs, and simple text patterns for basic matching.
   *
   * Use cases: JSON log parsing; Space-delimited field extraction; Text pattern matching; Error detection; Performance data extraction
   *
   * AWS: CloudWatch Logs filter pattern for log event matching and data extraction
   *
   * Validation: Must be valid filter pattern syntax; supports JSON, space-delimited, and text patterns; enables flexible log parsing
   **/
  readonly filterPattern: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required array of metric transformations defining how matched log data is converted to CloudWatch Metrics enabling multiple metrics per filter. Specifies one or more metric transformations that extract different values from the same log events for comprehensive monitoring.
   *
   * Use cases: Multiple metrics per filter; Error and duration tracking; Multi-dimensional monitoring; Comprehensive observability
   *
   * AWS: CloudWatch metric transformations for log-to-metric conversion and multi-metric publishing
   *
   * Validation: Must be non-empty array of MetricTransformationProps; each transformation creates a separate metric; enables multi-metric filters
   **/
  readonly metricTransformations: MetricTransformationProps[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for CloudWatch metric data queries enabling metric math expressions and multi-metric alarm conditions. Defines individual metrics or expressions used in metric math alarms for complex alerting logic combining multiple metrics.
 *
 * Use cases: Metric math expressions; Multi-metric alarms; Calculated metrics; Complex alerting logic; Aggregated monitoring
 *
 * AWS: CloudWatch metric data query for metric math alarms and complex metric expressions
 *
 * Validation: id required; either expression or metricName/namespace required; supports both metric math and metric stats
 */
export interface MetricDataQueryProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required unique identifier for the metric data query used in metric math expressions enabling metric referencing. Provides a short identifier (e.g., "m1", "m2", "total") that can be referenced in metric math expressions for combining and calculating metrics.
   *
   * Use cases: Expression references; Metric identification; Math operations; Query organization
   *
   * AWS: CloudWatch metric data query ID for metric math expression references and metric identification
   *
   * Validation: Must be unique within the alarm; used in metric math expressions; typically short alphanumeric identifier
   **/
  readonly id: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional metric math expression for calculated metrics enabling complex alerting logic combining multiple metrics. Defines mathematical operations on metrics (e.g., "m1+m2", "m1/m2*100") for derived metrics and complex alarm conditions.
   *
   * Use cases: Error rate calculations; Percentage metrics; Aggregated metrics; Derived values; Complex alerting
   *
   * AWS: CloudWatch metric math expression for calculated metrics and complex alarm conditions
   *
   * Validation: Must be valid metric math syntax if provided; references other metric IDs; mutually exclusive with metricName
   **/
  readonly expression?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional human-readable label for the metric data query enabling clear metric identification in dashboards and alarms. Provides a descriptive label that appears in CloudWatch console and alarm descriptions for better metric understanding.
   *
   * Use cases: Dashboard labels; Alarm descriptions; Metric identification; User-friendly naming
   *
   * AWS: CloudWatch metric data query label for metric identification and display
   *
   * Validation: Optional descriptive string; used for display purposes; improves metric readability
   **/
  readonly label?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag indicating whether this metric data should be returned in query results enabling selective metric output. Controls whether the metric appears in alarm evaluation results, typically true for expressions and false for intermediate metrics.
   *
   * Use cases: Expression output control; Intermediate metric hiding; Result filtering; Alarm evaluation
   *
   * AWS: CloudWatch metric data query return data flag for selective metric output and alarm evaluation
   *
   * Validation: Defaults to true for expressions, false for metrics; controls metric visibility in results
   **/
  readonly returnData?: boolean;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch metric name for metric stats queries enabling direct metric referencing in alarms. Specifies the metric to query from CloudWatch Metrics for alarm evaluation, mutually exclusive with expression.
   *
   * Use cases: Direct metric queries; Standard metric alarms; AWS service metrics; Custom metric alarms
   *
   * AWS: CloudWatch metric name for metric stats queries and direct metric referencing
   *
   * Validation: Must be valid metric name if provided; mutually exclusive with expression; requires namespace
   **/
  readonly metricName?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch metric namespace for metric stats queries enabling metric source identification. Specifies the namespace containing the metric for alarm evaluation, required when using metricName.
   *
   * Use cases: Namespace identification; Metric source specification; AWS service metrics; Custom metric namespaces
   *
   * AWS: CloudWatch metric namespace for metric stats queries and metric source identification
   *
   * Validation: Must be valid namespace if provided; required with metricName; identifies metric source
   **/
  readonly namespace?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch metric statistic for metric aggregation enabling statistical analysis of metric data. Specifies how to aggregate metric data points (e.g., Sum, Average, Maximum) for alarm evaluation.
   *
   * Use cases: Sum for counts; Average for durations; Maximum for peaks; Minimum for lows; Statistical analysis
   *
   * AWS: CloudWatch metric statistic for metric data aggregation and statistical analysis
   *
   * Validation: Must be valid statistic if provided (Sum, Average, Maximum, Minimum, SampleCount); used with metricName
   **/
  readonly statistic?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional metric evaluation period in seconds defining the time window for metric aggregation. Specifies how long to aggregate metric data points before applying the statistic for alarm evaluation.
   *
   * Use cases: Short-term monitoring; Long-term trends; Aggregation windows; Alarm sensitivity
   *
   * AWS: CloudWatch metric period for metric data aggregation and evaluation windows
   *
   * Validation: Must be valid period in seconds if provided; typically 60, 300, or 3600; affects alarm sensitivity
   **/
  readonly period?: number;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch metric unit for metric value interpretation enabling proper metric analysis. Specifies the unit of measurement for the metric (e.g., Count, Milliseconds, Megabytes) for correct interpretation.
   *
   * Use cases: Unit specification; Metric interpretation; Dashboard display; Alarm configuration
   *
   * AWS: CloudWatch metric unit for metric value interpretation and analysis
   *
   * Validation: Must be valid CloudWatch metric unit if provided; used for metric interpretation
   **/
  readonly unit?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch metric dimensions for metric filtering enabling specific metric instance selection. Provides key-value pairs for filtering metrics to specific instances (e.g., FunctionName for Lambda metrics).
   *
   * Use cases: Function-specific metrics; Environment filtering; Service segmentation; Instance selection
   *
   * AWS: CloudWatch metric dimensions for metric filtering and instance selection
   *
   * Validation: Must be valid dimension key-value pairs if provided; enables metric filtering; supports placeholders
   **/
  readonly dimensions?: { [key: string]: string };
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for CloudWatch alarms enabling automated monitoring and alerting for Lambda function metrics. Defines alarm conditions, thresholds, and notification actions for both single metric and metric math alarms with support for custom and AWS metrics.
 *
 * Use cases: Error rate alerting; Performance monitoring; Custom metric alarms; Multi-metric conditions; Operational notifications
 *
 * AWS: CloudWatch alarm for Lambda function monitoring and automated alerting with SNS integration
 *
 * Validation: alarmName required; either metricName/namespace or metrics array required; threshold and evaluationPeriods required
 */
export interface AlarmProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required unique name for the CloudWatch alarm enabling alarm identification and management. Provides a descriptive name for the alarm that appears in the CloudWatch console and is used for SSM parameter export.
   *
   * Use cases: Alarm identification; Console display; SSM parameter naming; Notification messages
   *
   * AWS: CloudWatch alarm name for alarm identification and management
   *
   * Validation: Must be unique within the function; should be descriptive of alarm condition; used for SSM parameter naming
   **/
  readonly alarmName: string;

  // Single metric alarm properties
  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch metric name for single metric alarms enabling direct metric monitoring. Specifies the metric to monitor for alarm evaluation, validated against defined metric filters for custom metrics or used directly for AWS metrics.
   *
   * Use cases: Error count monitoring; Duration tracking; AWS Lambda metrics; Custom metric alarms
   *
   * AWS: CloudWatch metric name for single metric alarm evaluation and monitoring
   *
   * Validation: Must be valid metric name if provided; validated against metric filters for custom metrics; mutually exclusive with metrics array
   **/
  readonly metricName?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch metric namespace for single metric alarms enabling metric source identification. Specifies the namespace containing the metric, with automatic validation bypass for AWS/* namespaces and validation for custom namespaces.
   *
   * Use cases: Custom metric namespaces; AWS service metrics; Namespace identification; Metric validation
   *
   * AWS: CloudWatch metric namespace for single metric alarm source identification
   *
   * Validation: Must be valid namespace if provided; AWS/* namespaces bypass validation; custom namespaces validated against metric filters
   **/
  readonly namespace?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch metric statistic for single metric alarms enabling metric aggregation. Specifies how to aggregate metric data points (e.g., Sum, Average, Maximum) for alarm threshold comparison.
   *
   * Use cases: Sum for error counts; Average for durations; Maximum for peaks; Statistical analysis
   *
   * AWS: CloudWatch metric statistic for single metric alarm aggregation and evaluation
   *
   * Validation: Must be valid statistic if provided (Sum, Average, Maximum, Minimum, SampleCount); used with metricName
   **/
  readonly statistic?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional metric evaluation period in seconds for single metric alarms defining aggregation time window. Specifies how long to aggregate metric data points before comparing to threshold for alarm evaluation.
   *
   * Use cases: Short-term monitoring; Long-term trends; Aggregation windows; Alarm sensitivity tuning
   *
   * AWS: CloudWatch metric period for single metric alarm aggregation and evaluation windows
   *
   * Validation: Must be valid period in seconds if provided; typically 60, 300, or 3600; affects alarm sensitivity
   **/
  readonly period?: number;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch metric unit for single metric alarms enabling proper metric interpretation. Specifies the unit of measurement for the metric (e.g., Count, Milliseconds, Megabytes) for correct threshold comparison.
   *
   * Use cases: Unit specification; Metric interpretation; Threshold comparison; Alarm configuration
   *
   * AWS: CloudWatch metric unit for single metric alarm interpretation and evaluation
   *
   * Validation: Must be valid CloudWatch metric unit if provided; used for metric interpretation and threshold comparison
   **/
  readonly unit?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch metric dimensions for single metric alarms enabling specific metric instance selection. Provides key-value pairs for filtering metrics to specific instances with support for {{functionName}} placeholder for dynamic function name substitution.
   *
   * Use cases: Function-specific alarms; Environment filtering; Dynamic function names; Instance selection
   *
   * AWS: CloudWatch metric dimensions for single metric alarm filtering and instance selection
   *
   * Validation: Must be valid dimension key-value pairs if provided; supports {{functionName}} placeholder; enables metric filtering
   **/
  readonly dimensions?: { [key: string]: string };

  // Metric math alarm properties
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of metric data queries for metric math alarms enabling complex multi-metric conditions. Defines multiple metrics and expressions for calculated alarm conditions combining metrics with mathematical operations.
   *
   * Use cases: Multi-metric alarms; Calculated thresholds; Aggregated monitoring; Complex alerting logic; Derived metrics
   *
   * AWS: CloudWatch metric data queries for metric math alarms and complex alarm conditions
   *
   * Validation: Must be array of MetricDataQueryProps if provided; mutually exclusive with metricName; enables metric math alarms
   **/
  readonly metrics?: MetricDataQueryProps[];

  // Common alarm properties
  /**
   * Q-ENHANCED-PROPERTY
   * Required number of evaluation periods for alarm threshold comparison enabling sustained breach detection. Specifies how many consecutive periods the metric must breach the threshold before triggering the alarm for reducing false positives.
   *
   * Use cases: Sustained breach detection; False positive reduction; Alarm sensitivity; Threshold persistence
   *
   * AWS: CloudWatch alarm evaluation periods for sustained breach detection and alarm triggering
   *
   * Validation: Must be positive integer; determines alarm sensitivity; higher values reduce false positives
   **/
  readonly evaluationPeriods: number;

  /**
   * Q-ENHANCED-PROPERTY
   * Required threshold value for alarm comparison enabling breach detection. Specifies the numeric value that the metric is compared against using the comparison operator to determine alarm state.
   *
   * Use cases: Error count thresholds; Duration limits; Rate limits; Performance boundaries
   *
   * AWS: CloudWatch alarm threshold for metric comparison and breach detection
   *
   * Validation: Must be numeric value; compared against metric using comparisonOperator; determines alarm triggering
   **/
  readonly threshold: number;

  /**
   * Q-ENHANCED-PROPERTY
   * Required comparison operator for alarm threshold evaluation enabling flexible breach conditions. Specifies how to compare the metric value to the threshold (e.g., GreaterThanOrEqualToThreshold, LessThanThreshold) for alarm state determination.
   *
   * Use cases: Greater than for error counts; Less than for availability; Equal to for exact matches; Threshold comparison
   *
   * AWS: CloudWatch alarm comparison operator for threshold evaluation and alarm state determination
   *
   * Validation: Must be valid comparison operator string; converted to CDK enum; determines alarm triggering logic
   **/
  readonly comparisonOperator: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional missing data treatment strategy for alarm evaluation enabling robust alarm behavior. Specifies how the alarm should behave when metric data is missing (e.g., notBreaching, breaching, ignore, missing) for handling data gaps.
   *
   * Use cases: Data gap handling; Alarm robustness; Missing data strategy; Evaluation continuity
   *
   * AWS: CloudWatch alarm missing data treatment for handling data gaps and evaluation continuity
   *
   * Validation: Must be valid treatment string if provided (notBreaching, breaching, ignore, missing); defaults to notBreaching
   **/
  readonly treatMissingData?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional human-readable description for the alarm enabling clear alarm purpose documentation. Provides detailed explanation of the alarm condition, threshold rationale, and expected actions for operational clarity.
   *
   * Use cases: Alarm documentation; Operational guidance; Threshold rationale; Action instructions
   *
   * AWS: CloudWatch alarm description for alarm documentation and operational guidance
   *
   * Validation: Optional descriptive string; appears in CloudWatch console and notifications; improves alarm understanding
   **/
  readonly alarmDescription?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag enabling or disabling alarm actions during state changes. Controls whether SNS notifications and other actions are executed when the alarm changes state for testing and maintenance scenarios.
   *
   * Use cases: Action control; Testing mode; Maintenance windows; Notification management
   *
   * AWS: CloudWatch alarm actions enabled flag for notification and action control
   *
   * Validation: Boolean flag; defaults to true; controls execution of alarm, OK, and insufficient data actions
   **/
  readonly actionsEnabled?: boolean;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of datapoints that must breach threshold within evaluation periods enabling flexible alarm sensitivity. Specifies how many of the evaluation periods must breach the threshold (M out of N) for more nuanced alarm triggering.
   *
   * Use cases: Flexible sensitivity; Intermittent breach detection; M-out-of-N evaluation; False positive reduction
   *
   * AWS: CloudWatch alarm datapoints to alarm for M-out-of-N evaluation and flexible sensitivity
   *
   * Validation: Must be positive integer if provided; must be <= evaluationPeriods; defaults to evaluationPeriods
   **/
  readonly datapointsToAlarm?: number;

  // Actions
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of SNS topic ARNs for ALARM state notifications enabling automated alerting. Specifies SNS topics that receive notifications when the alarm transitions to ALARM state for operational response and incident management.
   *
   * Use cases: Error notifications; Performance alerts; Operational incidents; Automated response; PagerDuty integration
   *
   * AWS: SNS topic ARNs for CloudWatch alarm ALARM state notifications and automated alerting
   *
   * Validation: Must be valid SNS topic ARNs if provided; topics must exist; enables automated alarm notifications
   **/
  readonly alarmActions?: string[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of SNS topic ARNs for OK state notifications enabling recovery confirmation. Specifies SNS topics that receive notifications when the alarm transitions to OK state for confirming issue resolution.
   *
   * Use cases: Recovery notifications; Issue resolution; Status updates; Incident closure
   *
   * AWS: SNS topic ARNs for CloudWatch alarm OK state notifications and recovery confirmation
   *
   * Validation: Must be valid SNS topic ARNs if provided; topics must exist; enables recovery notifications
   **/
  readonly okActions?: string[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of SNS topic ARNs for INSUFFICIENT_DATA state notifications enabling data availability monitoring. Specifies SNS topics that receive notifications when the alarm has insufficient data for evaluation.
   *
   * Use cases: Data availability monitoring; Metric collection issues; Pipeline health; Data gap detection
   *
   * AWS: SNS topic ARNs for CloudWatch alarm INSUFFICIENT_DATA state notifications and data monitoring
   *
   * Validation: Must be valid SNS topic ARNs if provided; topics must exist; enables data availability notifications
   **/
  readonly insufficientDataActions?: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for DataOps Lambda function deployment with S3 event processing and EventBridge integration capabilities. Defines Lambda function properties for data processing workflows triggered by S3 object events and EventBridge rules in data lake operations.
 *
 * Use cases: S3 event-driven data processing; CSV to Parquet transformation; Data validation workflows; EventBridge-triggered data operations
 *
 * AWS: AWS Lambda function configuration for data processing with S3 EventBridge notifications and custom event rules
 *
 * Validation: srcDir must exist and contain deployable code; runtime must be valid Lambda runtime; handler must match code structure
 */
export interface FunctionProps extends FunctionOptions {
  /**
   * Q-ENHANCED-PROPERTY
   * Required source code directory path containing Lambda function code for data processing operations. Specifies the local directory with function source code that will be packaged and deployed for S3 event processing and data transformation workflows.
   *
   * Use cases: CSV to Parquet transformation code; Data validation scripts; S3 event processing logic; Custom data pipeline functions
   *
   * AWS: Lambda function source code location for deployment packaging and data processing function creation
   *
   * Validation: Must be valid directory path containing deployable Lambda code; directory must exist and be readable
   **/
  readonly srcDir: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Lambda function handler specification for data processing entry point. Defines the specific function handler within the source code that Lambda will invoke for S3 events and EventBridge triggers in data operations.
   *
   * Use cases: Python data processing handlers; Node.js transformation functions; Custom event processing entry points; Data pipeline orchestration
   *
   * AWS: Lambda function handler for S3 event processing and data transformation execution
   *
   * Validation: Must match handler format for specified runtime (e.g., 'index.handler' for Node.js, 'main.lambda_handler' for Python)
   **/
  readonly handler?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Lambda runtime specification for data processing execution environment. Defines the runtime environment for executing data transformation and S3 event processing functions with support for Python and Node.js data operations.
   *
   * Use cases: Python 3.9 for pandas data processing; Node.js 18.x for JSON transformations; Custom runtime environments; Data science libraries
   *
   * AWS: Lambda runtime environment for data processing function execution and library support
   *
   * Validation: Must be valid Lambda runtime (python3.9, nodejs18.x, etc.); must be compatible with source code and data processing libraries
   **/
  readonly runtime?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Docker container build flag for custom data processing environments. When enabled, expects srcDir to contain Dockerfile for custom runtime environments with specialized data processing libraries and dependencies.
   *
   * Use cases: Custom Python environments with ML libraries; Specialized data processing containers; Complex dependency management; Custom data science stacks
   *
   * AWS: Lambda container image deployment for custom data processing runtime environments and specialized libraries
   *
   * Validation: When true, srcDir must contain valid Dockerfile; container must be compatible with Lambda execution environment
   **/
  readonly dockerBuild?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional principal ARN for Lambda invoke permissions enabling controlled access to data processing functions. Specifies AWS principals that can invoke the Lambda function for S3 event processing and data transformation operations.
   *
   * Use cases: S3 service principal for event triggers; EventBridge service access; Cross-account data processing; Step Functions integration
   *
   * AWS: Lambda function invoke permission for S3 EventBridge notifications and data processing service integration
   *
   * Validation: Must be valid AWS principal ARN; principal must exist and have appropriate permissions for data operations
   **/
  readonly grantInvoke?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional additional resource permissions for Lambda function access control in data processing workflows. Provides fine-grained permissions beyond basic invoke for complex S3 data operations and cross-service integration scenarios.
   *
   * Use cases: S3 bucket access for data processing; Glue catalog permissions; DynamoDB table access; SNS notification permissions
   *
   * AWS: Lambda resource policy permissions for data processing access control and service integration
   *
   * Validation: Must be valid SID to AdditionalResourcePermission mapping; enables complex data processing permission scenarios
   *   **/
  readonly additionalResourcePermissions?: { [sid: string]: AdditionalResourcePermission };

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of CloudWatch Logs Insights saved queries for Lambda function log analysis enabling pre-built troubleshooting queries. Defines saved query definitions that can be executed against function logs for rapid error analysis, performance investigation, and operational insights with automatic log group derivation.
   *
   * Use cases: Error log analysis; Performance troubleshooting; Request tracing; Operational monitoring; Cross-function queries
   *
   * AWS: CloudWatch Logs Insights query definitions for Lambda function log analysis and troubleshooting
   *
   * Validation: Optional array of LogInsightsQueryProps; queries auto-derive log groups if not specified; exported to SSM for discoverability
   **/
  readonly logInsightsQueries?: LogInsightsQueryProps[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of CloudWatch metric filters for Lambda function custom metric extraction enabling log-to-metric transformation. Defines filter patterns and transformations for extracting custom metrics from function logs with automatic SSM export for cross-module discoverability and dashboard integration.
   *
   * Use cases: Error rate metrics; Performance tracking; Business metrics; Custom monitoring; Operational dashboards; Alerting
   *
   * AWS: CloudWatch Logs metric filters for Lambda function custom metric extraction and monitoring
   *
   * Validation: Optional array of MetricFilterProps; metrics exported to SSM; enables custom metric monitoring and alerting
   **/
  readonly metricFilters?: MetricFilterProps[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of CloudWatch alarms for Lambda function monitoring and alerting enabling automated incident response. Defines alarm conditions, thresholds, and SNS notifications for both custom metrics (from metricFilters) and AWS Lambda metrics with automatic metric validation and placeholder replacement.
   *
   * Use cases: Error rate alerting; Performance monitoring; Threshold breaches; Automated notifications; Incident management; Multi-metric conditions
   *
   * AWS: CloudWatch alarms for Lambda function monitoring and automated alerting with SNS integration
   *
   * Validation: Optional array of AlarmProps; custom metrics validated against metricFilters; AWS/* metrics bypass validation; supports {{functionName}} placeholder
   **/
  readonly alarms?: AlarmProps[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for Lambda resource permission management enabling fine-grained access control for data processing operations. Defines specific permissions for AWS principals to access Lambda functions with optional source restrictions for enhanced security in data workflows.
 *
 * Use cases: S3 service permissions for event processing; EventBridge rule access; Cross-account data processing; Service-to-service integration
 *
 * AWS: Lambda resource policy permissions for controlled data processing function access and service integration
 *
 * Validation: principal and action are required; sourceAccount and sourceArn provide additional security for service principals
 */
export interface AdditionalResourcePermission {
  /**
   * Q-ENHANCED-PROPERTY
   * Required AWS principal ARN for Lambda function access in data processing workflows. Specifies the AWS principal (IAM role, user, service, or account) that will be granted permission to access the Lambda function for S3 event processing and data operations.
   *
   * Use cases: S3 service principal for event notifications; EventBridge service for rule triggers; Cross-account data processing roles; Step Functions execution roles
   *
   * AWS: Lambda resource policy principal for data processing function access and service integration
   *
   * Validation: Must be valid AWS principal ARN format; principal must exist and be accessible for data operations
   **/
  readonly principal: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Lambda action specification for data processing function permissions. Defines the specific Lambda action that will be granted to the principal for controlled access to data processing functions and workflow orchestration.
   *
   * Use cases: lambda:InvokeFunction for S3 event processing; lambda:InvokeAsync for asynchronous data operations; Custom actions for specific data workflows
   *
   * AWS: Lambda action permission for data processing function access and operation authorization
   *
   * Validation: Must be valid Lambda action (lambda:InvokeFunction, lambda:InvokeAsync, etc.); action must be appropriate for data processing use case
   **/
  readonly action: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional source AWS account restriction for enhanced security in cross-account data processing scenarios. When specified with service principals, restricts Lambda function access to originate from the specified account for additional security in data operations.
   *
   * Use cases: Cross-account S3 event processing; Multi-account data lake architectures; Secure service-to-service data operations; Account-based access control
   *
   * AWS: Lambda resource policy source account condition for enhanced cross-account data processing security
   *
   * Validation: Must be valid 12-digit AWS account ID if specified; used with service principals for additional data processing security
   **/
  readonly sourceAccount?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional source resource ARN restriction for fine-grained access control in data processing workflows. When specified with service principals, restricts Lambda function access to originate from specific AWS resources for enhanced security in data operations.
   *
   * Use cases: Specific S3 bucket event processing; EventBridge rule source restrictions; Resource-specific data processing access; Fine-grained security controls
   *
   * AWS: Lambda resource policy source ARN condition for resource-specific data processing access control
   *
   * Validation: Must be valid AWS resource ARN if specified; used with service principals for resource-specific data processing access
   **/
  readonly sourceArn?: string;
}

export interface FunctionOptions {
  /**
   * Q-ENHANCED-PROPERTY
   * Required basic function name for Lambda function identification and management. Provides the function identifier for Lambda operations and serves as the primary reference for function management and invocation.
   *
   * Use cases: Function identification; Lambda management; Function invocation; Resource tracking
   *
   * AWS: AWS Lambda function name for identification and management operations
   *
   * Validation: Must be unique function name string; required for function creation and identification
   **/
  readonly functionName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional description of the Lambda function explaining its purpose and data processing operations for documentation and management clarity. Provides human-readable description of the function's purpose and the data operations it performs.
   *
   * Use cases: Function documentation; Operational clarity; Data processing explanation; Management understanding
   *
   * AWS: AWS Lambda function description for documentation and operational clarity
   *
   * Validation: Must be descriptive text if provided; recommended for function documentation and operational understanding
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role ARN for Lambda function execution permissions enabling secure access to AWS services and resources. Provides the execution role that Lambda assumes to execute the function and access data sources, outputs, and other AWS services.
   *
   * Use cases: Function permissions; Service access; Security roles; Resource authorization
   *
   * AWS: AWS IAM role ARN for Lambda function execution permissions and service access
   *
   * Validation: Must be valid IAM role ARN string; required for function execution permissions and resource access
   **/
  readonly roleArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional EventBridge configuration for event-driven function execution enabling automated data processing workflows. Defines EventBridge integration for triggering Lambda functions based on events for automated data processing and workflow orchestration.
   *
   * Use cases: Event-driven processing; Workflow automation; Data pipeline triggers; Event orchestration
   *
   * AWS: Amazon EventBridge integration for Lambda function event-driven execution
   *
   * Validation: Must be valid EventBridgeProps object if provided; enables event-driven function execution when configured
   **/
  readonly eventBridge?: EventBridgeProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional VPC configuration for function network deployment enabling secure networking and resource access within VPC environments. Defines VPC networking configuration for Lambda functions including subnet placement and security groups.
   *
   * Use cases: VPC deployment; Secure networking; Private resource access; Network isolation
   *
   * AWS: AWS VPC configuration for Lambda function networking and security
   *
   * Validation: Must be valid VpcConfigProps object if provided; enables VPC deployment when configured
   **/
  readonly vpcConfig?: VpcConfigProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum event age in seconds controlling event processing time limits for data processing workflows. Defines the maximum age of events that Lambda will process before discarding them for event freshness and processing relevance.
   *
   * Use cases: Event freshness; Processing time limits; Data relevance; Event lifecycle management
   *
   * AWS: AWS Lambda maximum event age for event processing time control
   *
   * Validation: Must be between 60 and 21600 seconds if provided; defaults to 21600 seconds (6 hours)
   **/
  readonly maxEventAgeSeconds?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum retry attempts for failed function executions enabling fault tolerance and reliability. Defines the maximum number of times Lambda will retry function execution after errors for improved reliability and fault tolerance in data processing workflows.
   *
   * Use cases: Fault tolerance; Function reliability; Error recovery; Retry logic
   *
   * AWS: AWS Lambda retry attempts for failed function execution recovery and fault tolerance
   *
   * Validation: Must be between 0 and 2 if provided; defaults to 2; enables automatic retry for failed executions
   **/
  readonly retryAttempts?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of generated layer names to be added to the function enabling code reuse and dependency management. Specifies layers generated by the configuration that will be attached to the function for shared code and dependencies.
   *
   * Use cases: Code reuse; Dependency management; Shared libraries; Layer management
   *
   * AWS: AWS Lambda layers for code reuse and dependency management
   *
   * Validation: Must be array of valid layer names if provided; enables layer attachment when specified
   **/
  readonly generatedLayerNames?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of existing layer version ARNs to be directly added to the function enabling external dependency integration. Provides direct layer ARN references for attaching existing layers to the function for external dependencies and shared code.
   *
   * Use cases: External dependencies; Existing layer integration; Shared code; Layer reuse
   *
   * AWS: AWS Lambda layer ARNs for external layer integration and dependency management
   *
   * Validation: Must be valid layer name to ARN mapping if provided; enables external layer integration when specified
   *   **/
  readonly layerArns?: { [name: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional function execution timeout in seconds controlling maximum execution time for data processing operations. Defines the maximum time the function can run before Lambda terminates it, critical for processing workflows and cost management.
   *
   * Use cases: Execution timeout; Cost control; Processing time limits; Resource management
   *
   * AWS: AWS Lambda function timeout for execution time control and resource management
   *
   * Validation: Must be positive integer in seconds if provided; defaults to 3 seconds; affects function execution and cost
   **/
  readonly timeoutSeconds?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional environment variables for function configuration enabling runtime configuration and parameter passing. Defines key-value pairs that Lambda caches and makes available for function execution enabling configuration changes without code modifications.
   *
   * Use cases: Runtime configuration; Parameter passing; Environment-specific settings; Configuration management
   *
   * AWS: AWS Lambda environment variables for function configuration and runtime parameters
   *
   * Validation: Must be valid key-value string pairs if provided; enables runtime configuration when specified
   *   **/
  readonly environment?: {
    [key: string]: string;
  };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional reserved concurrent executions for function capacity management enabling performance control and cost optimization. Defines the maximum number of concurrent executions reserved for the function affecting performance isolation and resource allocation.
   *
   * Use cases: Performance control; Capacity management; Cost optimization; Resource isolation
   *
   * AWS: AWS Lambda reserved concurrent executions for function capacity and performance management
   *
   * Validation: Must be positive integer if provided; affects function concurrency and account limits
   **/
  readonly reservedConcurrentExecutions?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional memory allocation in MB for function execution enabling performance optimization and resource management. Defines the amount of memory allocated to the function affecting CPU power allocation and execution performance for data processing operations.
   *
   * Use cases: Performance optimization; Memory allocation; CPU power; Resource management
   *
   * AWS: AWS Lambda memory size for function performance and resource allocation
   *
   * Validation: Must be between 128 and 10240 MB if provided; defaults to 128 MB; affects performance and cost
   **/
  readonly memorySizeMB?: number;
  /**
   * The size of the function’s /tmp directory in MB.
   * @default 512 MiB
   */
  readonly ephemeralStorageSizeMB?: number;
}

/**
 * Q-ENHANCED-INTERFACE
 * LayerProps configuration interface for serverless data processing and event-driven workflows.
 *
 * Use cases: Serverless data processing; Event-driven workflows; S3 event handling; Data transformation
 *
 * AWS: AWS Lambda configuration for serverless data processing and event-driven workflows
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS Lambda and MDAA requirements
 */
export interface LayerProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required source directory or ZIP file path for Lambda layer code deployment enabling shared library and dependency management. Defines the location of the layer code that will be packaged and deployed as a Lambda layer for reuse across multiple Lambda functions.
   *
   * Use cases: Shared library deployment; Dependency management; Code reuse; Lambda layer creation; Common utilities
   *
   * AWS: AWS Lambda layer source code path for shared library deployment and dependency management
   *
   * Validation: Must be valid directory path or ZIP file path; required for layer code deployment
   **/
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
  /**
   * Q-ENHANCED-PROPERTY
   * Required KMS key ARN for Lambda function encryption enabling secure environment variable and dead letter queue encryption. Provides customer-managed KMS key for encrypting Lambda function environment variables and dead letter queues ensuring data protection and security compliance.
   *
   * Use cases: Function encryption; Environment variable security; Dead letter queue encryption; Data protection
   *
   * AWS: KMS key ARN for Lambda function encryption and secure data protection
   *
   * Validation: Must be valid KMS key ARN; required for Lambda function encryption and security compliance
   **/
  readonly kmsArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Lambda layer definitions for code sharing and dependency management enabling reusable components and optimized deployment. Provides layer configurations for shared code, libraries, and dependencies across multiple Lambda functions for efficient deployment and management.
   *
   * Use cases: Code sharing; Dependency management; Reusable components; Deployment optimization
   *
   * AWS: Lambda layers for code sharing and dependency management across functions
   *
   * Validation: Must be array of valid LayerProps if provided; enables layer-based code sharing and dependency management
   *   **/
  readonly layers?: LayerProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Lambda function definitions for serverless application deployment enabling function configuration and management. Provides function configurations for serverless application components providing deployment and operational settings.
   *
   * Use cases: Function deployment; Serverless applications; Function configuration; Application components
   *
   * AWS: Lambda functions for serverless application deployment and function management
   *
   * Validation: Must be array of valid FunctionProps if provided; enables function deployment and configuration
   *   **/
  readonly functions?: FunctionProps[];
  readonly overrideScope?: boolean;
}

export class LambdaFunctionL3Construct extends MdaaL3Construct {
  protected readonly props: LambdaFunctionL3ConstructProps;
  private readonly projectKmsKey: IKey;
  public readonly functionsMap: { [name: string]: LambdaFunction } = {};

  constructor(scope: Construct, id: string, props: LambdaFunctionL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    if (!this.props.kmsArn) {
      throw new Error('Project kms key must be defined');
    }
    this.projectKmsKey = MdaaKmsKey.fromKeyArn(
      props.overrideScope ? this : this.scope,
      'project-kms',
      this.props.kmsArn,
    );

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

    let functionVpcProps = {};
    if (functionProps.vpcConfig) {
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

      functionVpcProps = {
        securityGroups: [securityGroup],
        vpc: vpc,
        vpcSubnets: {
          subnets: subnets,
        },
      };
    }

    const dlq = EventBridgeHelper.createDlq(
      this.props.overrideScope ? this : this.scope,
      this.props.naming,
      functionProps.functionName,
      this.projectKmsKey,
      role,
    );

    const lambdaOptions: MdaaLambdaFunctionOptions = {
      ...functionVpcProps,
      functionName: functionProps.functionName,
      description: functionProps.description,

      role: role,
      environmentEncryption: this.projectKmsKey,
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

    // Add resource based permission
    if (functionProps.grantInvoke) {
      lambdaFunction.grantInvoke(new ArnPrincipal(functionProps.grantInvoke));
    }

    // Add additional resource based permissions
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

    //An inline policy to allow the Lambda role to write to DLQ is automatically added,
    //but this triggers Nags. Instead, we use the Queue Resource policy,
    //and remove the inline policy here.
    role.node.tryRemoveChild('Policy');

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

    if (functionProps.eventBridge) {
      this.createFunctionEventBridgeRules(functionProps.eventBridge, functionProps.functionName, lambdaFunction);
    }

    // Create metric filters and track created metrics
    const createdMetrics = new Map<string, { namespace: string; metricName: string }>();
    if (functionProps.metricFilters) {
      for (const [index, filterProps] of functionProps.metricFilters.entries()) {
        // Create metric filter with function name for SSM exports
        new MdaaMetricFilter(this, `metric-filter-${functionProps.functionName}-${index}`, {
          filterName: filterProps.filterName,
          logGroup: lambdaFunction.logGroup,
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
    }

    // Create alarms with validation
    if (functionProps.alarms) {
      for (const [index, alarmProps] of functionProps.alarms.entries()) {
        // Validate custom metrics exist (skip validation for AWS metrics)
        if (alarmProps.namespace && !alarmProps.namespace.startsWith('AWS/')) {
          const metricKey = `${alarmProps.namespace}:${alarmProps.metricName}`;
          if (!createdMetrics.has(metricKey)) {
            const availableMetrics = Array.from(createdMetrics.keys()).join(', ');
            throw new Error(
              `Alarm "${alarmProps.alarmName}" references undefined metric "${alarmProps.metricName}" ` +
                `in namespace "${alarmProps.namespace}". Available metrics: ${availableMetrics || 'none'}`,
            );
          }
        }

        // Replace placeholders in dimensions
        const dimensions = this.replacePlaceholders(alarmProps.dimensions, lambdaFunction);

        // Create alarm with function name for consistent SSM export pattern
        new MdaaAlarm(this, `alarm-${functionProps.functionName}-${index}`, {
          ...alarmProps,
          dimensions,
          functionName: functionProps.functionName,
          naming: this.props.naming,
        });
      }
    }

    // Create log insights queries
    if (functionProps.logInsightsQueries) {
      for (const [index, queryProps] of functionProps.logInsightsQueries.entries()) {
        // Auto-derive logGroupNames from Lambda function if not provided
        const logGroupNames = queryProps.logGroupNames ?? [lambdaFunction.logGroup.logGroupName];

        new MdaaLogInsightsQuery(this, `query-${functionProps.functionName}-${index}`, {
          queryName: queryProps.queryName,
          queryString: queryProps.queryString,
          logGroupNames,
          functionName: functionProps.functionName,
          naming: this.props.naming,
        });
      }
    }

    return lambdaFunction;
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
      this.projectKmsKey,
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

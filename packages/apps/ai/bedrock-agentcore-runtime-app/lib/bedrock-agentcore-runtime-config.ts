/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  AgentRuntimeArtifactProperty,
  NetworkConfigurationProperty,
  LifecycleConfigurationProperty,
  AuthorizerConfigurationProperty,
  RequestHeaderConfigurationProperty,
  PolicyProperty,
  RuntimeEndpointProperty,
  DataProtectionProperty,
  AlarmsConfiguration,
  EventBridgeConfiguration,
} from '@aws-mdaa/bedrock-agentcore-runtime-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

/**
 * Valid CloudWatch Logs retention periods in days, as accepted by the
 * RetentionDays enum. Constraining the config type to these literals makes
 * invalid values fail at schema validation rather than at deploy time.
 */
export type LogRetentionDays =
  | 1
  | 3
  | 5
  | 7
  | 14
  | 30
  | 60
  | 90
  | 120
  | 150
  | 180
  | 365
  | 400
  | 545
  | 731
  | 1096
  | 1827
  | 2192
  | 2557
  | 2922
  | 3288
  | 3653;

export interface BedrockAgentcoreRuntimeConfigContents extends MdaaBaseConfigContents {
  /**
   * Unique name for the Bedrock AgentCore Runtime.
   *
   * Use cases: Runtime identification, agent organization, configuration management
   *
   * AWS: Bedrock AgentCore Runtime name
   *
   * Validation: Required; String
   **/
  readonly agentRuntimeName: string;
  /**
   * Description of the agent runtime's purpose and functionality.
   *
   * Use cases: Runtime documentation, operational clarity
   *
   * AWS: Bedrock AgentCore Runtime description
   *
   * Validation: Optional; String
   **/
  readonly description?: string;
  /**
   * Container deployment configuration specifying Docker image source.
   * Use containerUri for pre-built ECR images or codePath to build from source.
   *
   * Use cases: Container deployment, Docker image configuration, runtime packaging
   *
   * AWS: Bedrock AgentCore Runtime artifact
   *
   * Validation: Required; AgentRuntimeArtifactProperty
   **/
  readonly agentRuntimeArtifact: AgentRuntimeArtifactProperty;
  /**
   * Key-value environment variables passed to the agent runtime container.
   *
   * MDAA injects `UNIFIED_TRACES_DESTINATION_ENABLED: 'true'`, routing agent spans to this
   * agent's own log group, which carries the module's CMK encryption, retention, and PII
   * masking (requires `aws-opentelemetry-distro>=0.18.0` in the image). A value set here
   * wins: `'false'` sends spans to the account-shared `aws/spans` group instead, which has
   * none of those protections.
   *
   * Do not set `OTEL_*` variables here - AgentCore Runtime configures the ADOT SDK inside
   * the container. See the module README's "Observability & Tracing" section.
   *
   * Use cases: Runtime configuration, environment customization, behavior control
   *
   * AWS: Bedrock AgentCore Runtime container environment variables
   *
   * Validation: Optional; Record<string, string>
   **/
  readonly environmentVariables?: { [key: string]: string };
  /**
   * VPC network configuration for secure runtime deployment.
   * MDAA enforces VPC mode for all runtimes to ensure network isolation.
   *
   * Use cases: VPC deployment, network isolation, private subnet usage, security
   *
   * AWS: Bedrock AgentCore Runtime VPC network configuration
   *
   * Validation: Required; NetworkConfigurationProperty; 1-16 security groups and subnets
   **/
  readonly networkConfiguration: NetworkConfigurationProperty;
  /**
   * Session timeout and maximum lifetime settings for runtime instances.
   *
   * Use cases: Session management, resource control, timeout configuration
   *
   * AWS: Bedrock AgentCore Runtime lifecycle configuration
   *
   * Validation: Optional; LifecycleConfigurationProperty; values 60-28800 seconds
   **/
  readonly lifecycleConfiguration?: LifecycleConfigurationProperty;
  /**
   * Authentication configuration with support for custom JWT authorizers via OIDC.
   *
   * Use cases: Access control, JWT authentication, OIDC integration
   *
   * AWS: Bedrock AgentCore Runtime authorizer
   *
   * Validation: Optional; AuthorizerConfigurationProperty
   **/
  readonly authorizerConfiguration?: AuthorizerConfigurationProperty;
  /**
   * HTTP headers to forward to agent runtime instances.
   *
   * Use cases: Header forwarding, custom request context, header passthrough
   *
   * AWS: Bedrock AgentCore Runtime request header configuration
   *
   * Validation: Optional; RequestHeaderConfigurationProperty; 1-20 headers
   **/
  readonly requestHeaderConfiguration?: RequestHeaderConfigurationProperty;
  /**
   * Protocol-level configuration for agent runtime communication.
   * Defines which protocol the agent runtime uses to communicate with clients.
   *
   * Use cases: Protocol configuration, MCP server deployment, A2A communication, HTTP endpoints
   *
   * AWS: Bedrock AgentCore Runtime protocol configuration
   *
   * Validation: Optional; string
   **/
  readonly protocolConfiguration?: string;
  /**
   * IAM resource ARN patterns for Bedrock model invocation permissions.
   * When specified, scopes the bedrock:InvokeModel and bedrock:InvokeModelWithResponseStream
   * permissions to only the listed patterns. Follows IAM Resource element syntax
   * (supports wildcards, e.g. "arn:aws:bedrock:us-east-1::foundation-model/anthropic.*").
   * When omitted, the broad default permissions are preserved (all foundation models).
   *
   * Use cases: Least privilege model access, cost control, compliance, blast radius reduction
   *
   * AWS: IAM Resource element patterns for bedrock:InvokeModel policy statements
   *
   * Validation: Optional; String[]; IAM resource ARN patterns (wildcards allowed)
   *
   * @minItems 1
   **/
  readonly allowedModelArns?: string[];
  /**
   * Existing IAM role ARN for runtime execution.
   * If omitted, a new role is created with appropriate permissions.
   *
   * Use cases: Role reuse, existing role usage, permission management
   *
   * AWS: IAM role for Bedrock AgentCore Runtime execution
   *
   * Validation: Optional; String; must be valid IAM role ARN
   **/
  readonly roleArn?: string;
  /**
   * IAM policies to attach to the runtime execution role.
   * Supports managed policy ARNs and inline policy documents.
   *
   * Use cases: Custom permissions, service access, policy attachment
   *
   * AWS: IAM policies for runtime execution role
   *
   * Validation: Optional; PolicyProperty[]
   **/
  readonly policies?: PolicyProperty[];
  /**
   * Endpoint configuration for invoking the agent runtime via Bedrock AgentCore API.
   *
   * Use cases: Runtime invocation, API access, endpoint management
   *
   * AWS: Bedrock AgentCore Runtime endpoint
   *
   * Validation: Optional; RuntimeEndpointProperty
   **/
  readonly runtimeEndpoint?: RuntimeEndpointProperty;
  /**
   * Enforce VPC-only invocation by creating a resource-based policy on the Runtime.
   * When true, MDAA auto-generates a policy restricting invocations to traffic
   * originating from the VPC specified in networkConfiguration.vpcId.
   * Critical for JWT/OAuth callers since SCPs cannot restrict non-IAM principals.
   *
   * Use cases: VPC-only access for JWT callers, network boundary enforcement
   *
   * AWS: Bedrock AgentCore resource-based policy with aws:SourceVpc condition
   *
   * Validation: Optional; Boolean; requires networkConfiguration.vpcId when true
   **/
  readonly enforceVpcOnly?: boolean;
  /**
   * Enable X-Ray Transaction Search Config for enhanced trace analysis.
   * This resource is a singleton per AWS account per region.
   * Set to false if this resource already exists in your account/region.
   *
   * Use cases: X-Ray trace search, natural language trace analysis, avoiding resource conflicts
   *
   * AWS: X-Ray Transaction Search Config
   *
   * Validation: Optional; Boolean
   * @default true
   **/
  readonly enableTransactionSearch?: boolean;
  /**
   * CloudWatch Logs retention period for the runtime log group in days.
   *
   * Use cases: Log retention policy, cost management, compliance retention requirements
   *
   * AWS: CloudWatch Logs log group retention
   *
   * Validation: Optional; Number; must be a valid RetentionDays value (1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653)
   * @default 30
   **/
  readonly logRetentionDays?: LogRetentionDays;
  /**
   * CloudWatch Data Protection configuration for the runtime log groups.
   *
   * PII masking and customer-managed KMS encryption are always-on, built-in behavior
   * for this module and cannot be disabled - sensitive data (emails, SSNs, credit card
   * numbers, etc.) is automatically masked in log events on ingestion. Users with
   * logs:Unmask permission can still access unmasked data. This optional configuration
   * only allows tightening the posture (adding identifiers); it can never reduce the
   * built-in compliance baseline.
   *
   * Use cases: extending PII masking with additional identifiers
   *
   * AWS: CloudWatch Logs Data Protection Policy
   *
   * Validation: Optional; DataProtectionProperty; additive only
   **/
  readonly dataProtection?: DataProtectionProperty;
  /**
   * Optional CloudWatch Alarms configuration. When present, MDAA creates alarms
   * on AgentCore service metrics (error rate, throttle count) and notifies an
   * SNS topic. Provide a notification target via exactly one of
   * notificationTopicArn (existing topic) or createNotificationTopic: true
   * (module-created CMK-encrypted topic), and at least one threshold. Omit the
   * block entirely to deploy no alarms.
   *
   * Use cases: production incident detection, error-rate and throttle alerting
   *
   * AWS: CloudWatch Alarms + SNS notification
   *
   * Validation: Optional; AlarmsConfiguration; requires a notification target and at least one threshold
   **/
  readonly alarms?: AlarmsConfiguration;
  /**
   * Optional EventBridge alerting configuration. When present, MDAA creates
   * EventBridge rules matching this runtime's AgentCore CloudTrail events and
   * notifies the `alarms` SNS topic, optionally also invoking a customer-supplied
   * remediation Lambda (`targetLambdaArn`). Rules supply only `errorCodes` and/or
   * `eventNames` - MDAA owns the rest of the event pattern. Omit the block entirely
   * to create no rules.
   *
   * Requires an `alarms` block supplying a notification topic, and a CloudTrail
   * trail in the account/region logging the matched AgentCore events.
   *
   * Use cases: real-time auth-failure and out-of-band configuration-change alerting
   *
   * AWS: EventBridge rules on AgentCore CloudTrail events -> SNS
   *
   * Validation: Optional; EventBridgeConfiguration; requires an alarms topic and at least one rule
   **/
  readonly eventBridgeAlerts?: EventBridgeConfiguration;
}

export class BedrockAgentcoreRuntimeConfigParser extends MdaaAppConfigParser<BedrockAgentcoreRuntimeConfigContents> {
  public readonly agentRuntimeName: string;
  public readonly description?: string;
  public readonly agentRuntimeArtifact: AgentRuntimeArtifactProperty;
  public readonly environmentVariables?: { [key: string]: string };
  public readonly networkConfiguration: NetworkConfigurationProperty;
  public readonly lifecycleConfiguration?: LifecycleConfigurationProperty;
  public readonly authorizerConfiguration?: AuthorizerConfigurationProperty;
  public readonly requestHeaderConfiguration?: RequestHeaderConfigurationProperty;
  public readonly protocolConfiguration?: string;
  public readonly allowedModelArns?: string[];
  public readonly roleArn?: string;
  public readonly policies?: PolicyProperty[];
  public readonly runtimeEndpoint?: RuntimeEndpointProperty;
  public readonly enforceVpcOnly?: boolean;
  public readonly enableTransactionSearch?: boolean;
  public readonly logRetentionDays?: LogRetentionDays;
  public readonly dataProtection?: DataProtectionProperty;
  public readonly alarms?: AlarmsConfiguration;
  public readonly eventBridgeAlerts?: EventBridgeConfiguration;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.agentRuntimeName = this.configContents.agentRuntimeName;
    this.description = this.configContents.description;
    this.agentRuntimeArtifact = this.configContents.agentRuntimeArtifact;
    this.environmentVariables = this.configContents.environmentVariables;
    this.networkConfiguration = this.configContents.networkConfiguration;
    this.lifecycleConfiguration = this.configContents.lifecycleConfiguration;
    this.authorizerConfiguration = this.configContents.authorizerConfiguration;
    this.requestHeaderConfiguration = this.configContents.requestHeaderConfiguration;
    this.protocolConfiguration = this.configContents.protocolConfiguration;
    this.allowedModelArns = this.configContents.allowedModelArns;
    this.roleArn = this.configContents.roleArn;
    this.policies = this.configContents.policies;
    this.runtimeEndpoint = this.configContents.runtimeEndpoint;
    this.enforceVpcOnly = this.configContents.enforceVpcOnly;
    this.enableTransactionSearch = this.configContents.enableTransactionSearch;
    this.logRetentionDays = this.configContents.logRetentionDays;
    this.dataProtection = this.configContents.dataProtection;
    this.alarms = this.configContents.alarms;
    this.eventBridgeAlerts = this.configContents.eventBridgeAlerts;
  }
}

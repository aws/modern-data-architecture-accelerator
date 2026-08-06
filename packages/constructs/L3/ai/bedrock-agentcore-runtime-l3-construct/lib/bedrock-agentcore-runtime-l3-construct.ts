/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { ITopic, Topic } from 'aws-cdk-lib/aws-sns';
import { Annotations, aws_bedrockagentcore as bedrockagentcore, aws_xray as xray, Stack } from 'aws-cdk-lib';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import {
  AGENTCORE_RUNTIME_ARN_REQUEST_PARAMETER,
  AGENTCORE_RUNTIME_ERROR_METRICS,
  AGENTCORE_RUNTIME_ID_REQUEST_PARAMETER,
  createAgentCoreAlarms,
  createAgentCoreEventBridgeRules,
  createAgentCoreLogProtection,
  createAgentCoreResourcePolicy,
  createAgentCoreVpcEndpoint,
  VpcEndpointProperty,
} from '@aws-mdaa/agentcore-shared';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Effect, ManagedPolicy, PolicyDocument, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { DataIdentifier, ResourcePolicy } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import {
  buildAuthorizerConfiguration,
  buildLifecycleConfiguration,
  buildNetworkConfiguration,
  buildRequestHeaderConfiguration,
  extractCustomPolicyStatements,
  sanitizeBedrockAgentcoreName,
} from './utils';

/**
 * Docker container configuration for Bedrock AgentCore Runtime deployment.
 * Specify either a pre-built ECR image (containerUri) or build from source (codePath).
 *
 * Use cases: Pre-built ECR image deployment, custom runtime development from source, platform-specific builds
 *
 * AWS: Bedrock AgentCore Runtime container configuration
 *
 * Validation: Must specify either containerUri or codePath (mutually exclusive); platform defaults to linux/arm64
 */
export interface ContainerConfigurationProperty {
  /**
   * Pre-built container image URI from ECR.
   * Mutually exclusive with codePath.
   *
   * Use cases: Pre-built image deployment, ECR image reference, image reuse
   *
   * AWS: ECR container image URI
   *
   * Validation: Optional; String; valid ECR image URI; mutually exclusive with codePath
   **/
  readonly containerUri?: string;
  /**
   * Local directory path containing Dockerfile and agent code for building the container image.
   * Mutually exclusive with containerUri.
   *
   * Use cases: Custom runtime development, local image building, source code deployment
   *
   * AWS: Docker image build source for Bedrock AgentCore Runtime
   *
   * Validation: Optional; String; valid directory path with Dockerfile; mutually exclusive with containerUri
   **/
  readonly codePath?: string;
  /**
   * Target platform architecture for Docker image builds.
   *
   * Use cases: ARM64 optimization, multi-architecture support, platform-specific builds
   *
   * AWS: Docker platform for Bedrock AgentCore Runtime container
   *
   * Validation: Optional; String; linux/arm64 or linux/amd64
   * @default linux/arm64
   **/
  readonly platform?: string;
}

/**
 * Agent runtime artifact defining the container deployment for Bedrock AgentCore Runtime.
 *
 * Use cases: Runtime artifact configuration, container deployment, agent runtime packaging
 *
 * AWS: Bedrock AgentCore Runtime artifact
 *
 * Validation: containerConfiguration is required
 */
export interface AgentRuntimeArtifactProperty {
  /**
   * Container configuration for the agent runtime Docker image.
   *
   * Use cases: Container deployment, Docker image configuration, runtime packaging
   *
   * AWS: Bedrock AgentCore Runtime container configuration
   *
   * Validation: Required; ContainerConfigurationProperty; must specify containerUri or codePath
   **/
  readonly containerConfiguration: ContainerConfigurationProperty;
}

/**
 * VPC network configuration for Bedrock AgentCore Runtime deployment.
 * MDAA enforces VPC mode for all runtimes to ensure network isolation and security.
 *
 * Use cases: VPC deployment, network isolation, private subnet usage, security configuration
 *
 * AWS: Bedrock AgentCore Runtime VPC network configuration
 *
 * Validation: Both securityGroups and subnets required with 1-16 items each
 */
export interface NetworkConfigurationProperty {
  /**
   * VPC ID for the network where the runtime is deployed.
   * Required when `enforceVpcOnly` is enabled, to generate the resource-based policy
   * restricting invocations to this VPC.
   *
   * Use cases: VPC-only enforcement for JWT callers, network boundary identification
   *
   * AWS: VPC ID for resource-based policy condition
   *
   * Validation: Optional; String; required when enforceVpcOnly is true
   **/
  readonly vpcId?: string;
  /**
   * Security group IDs controlling inbound/outbound traffic for runtime instances.
   *
   * Use cases: Network access control, traffic filtering, security boundaries
   *
   * AWS: VPC security groups for Bedrock AgentCore Runtime
   *
   * Validation: Required; String[]; 1-16 security group IDs
   **/
  readonly securityGroups: string[];
  /**
   * Subnet IDs for runtime instance placement enabling multi-AZ deployment.
   *
   * Use cases: Multi-AZ deployment, network isolation, high availability
   *
   * AWS: VPC subnets for Bedrock AgentCore Runtime
   *
   * Validation: Required; String[]; 1-16 subnet IDs
   **/
  readonly subnets: string[];
  /**
   * Optional MDAA-managed creation of the AgentCore interface VPC endpoint
   * (com.amazonaws.{region}.bedrock-agentcore) in this VPC. Presence of this
   * block opts in to endpoint creation (an empty object accepts all defaults);
   * omitting it means no endpoint is created. The endpoint gives VPC-resident
   * callers a private invocation path and produces the aws:SourceVpc request
   * context that enforceVpcOnly's resource policy requires - without it, an
   * enforceVpcOnly runtime cannot be invoked at all.
   *
   * Creation is opt-in (interface endpoints carry hourly/per-GB costs). If the
   * VPC already has a bedrock-agentcore endpoint (e.g., created by LZA or a
   * central networking team), omit this block - only one endpoint with Private
   * DNS is allowed per service per VPC, and a second one will fail to deploy.
   *
   * Use cases: Private invocation path, enforceVpcOnly support, no-NAT environments
   *
   * AWS: Interface VPC endpoint with Private DNS, endpoint policy, and security group
   *
   * Validation: Optional; VpcEndpointProperty; requires vpcId when present
   **/
  readonly vpcEndpoint?: VpcEndpointProperty;
}

/**
 * Lifecycle configuration for Bedrock AgentCore Runtime session management.
 * Controls idle timeout and maximum session lifetime for runtime instances.
 *
 * Use cases: Session management, resource optimization, timeout configuration, cost control
 *
 * AWS: Bedrock AgentCore Runtime lifecycle configuration
 *
 * Validation: Both values must be between 60 and 28800 seconds if provided
 */
export interface LifecycleConfigurationProperty {
  /**
   * Idle session timeout in seconds before automatic termination.
   *
   * Use cases: Idle timeout, resource optimization, session cleanup, cost control
   *
   * AWS: Bedrock AgentCore Runtime idle session timeout
   *
   * Validation: Optional; Number; 60-28800 seconds
   **/
  readonly idleRuntimeSessionTimeout?: number;
  /**
   * Maximum session lifetime in seconds before forced termination regardless of activity.
   *
   * Use cases: Maximum lifetime enforcement, resource limits, session boundaries
   *
   * AWS: Bedrock AgentCore Runtime maximum lifetime
   *
   * Validation: Optional; Number; 60-28800 seconds
   **/
  readonly maxLifetime?: number;
}

/**
 * Custom JWT authorizer configuration for token-based authentication via OIDC.
 *
 * Use cases: JWT authentication, OIDC integration, token validation, identity provider connection
 *
 * AWS: Bedrock AgentCore Runtime JWT authorizer
 *
 * Validation: discoveryUrl required; must end with /.well-known/openid-configuration
 */
export interface CustomJwtAuthorizerProperty {
  /**
   * OIDC discovery URL for JWT token validation.
   *
   * Use cases: OIDC integration, token validation, identity provider connection
   *
   * AWS: OIDC discovery URL for JWT validation
   *
   * Validation: Required; String; must end with /.well-known/openid-configuration
   **/
  readonly discoveryUrl: string;
  /**
   * Allowed audience values for JWT token validation.
   *
   * Use cases: Audience validation, client filtering, access restriction
   *
   * AWS: JWT audience claim validation
   *
   * Validation: Optional; String[]; validates against aud claim
   **/
  readonly allowedAudience?: string[];
  /**
   * Allowed client IDs for JWT token validation.
   *
   * Use cases: Client ID validation, application filtering, access control
   *
   * AWS: JWT client_id claim validation
   *
   * Validation: Optional; String[]; validates against client_id claim
   **/
  readonly allowedClients?: string[];
}

/**
 * Authorizer configuration for Bedrock AgentCore Runtime access control.
 *
 * Use cases: Access control, JWT authentication, authorization, identity validation
 *
 * AWS: Bedrock AgentCore Runtime authorizer
 *
 * Validation: customJwtAuthorizer must be valid CustomJwtAuthorizerProperty if provided
 */
export interface AuthorizerConfigurationProperty {
  /**
   * Custom JWT authorizer for token-based authentication via OIDC.
   *
   * Use cases: JWT authentication, token validation, OIDC integration
   *
   * AWS: Custom JWT authorizer for Bedrock AgentCore Runtime
   *
   * Validation: Optional; CustomJwtAuthorizerProperty
   **/
  readonly customJwtAuthorizer?: CustomJwtAuthorizerProperty;
  /**
   * @deprecated Use customJwtAuthorizer instead. This property is maintained for backward compatibility.
   **/
  readonly jwtAuthorizer?: CustomJwtAuthorizerProperty;
}

/**
 * Request header configuration for HTTP header forwarding to agent runtime instances.
 *
 * Use cases: Header forwarding, custom request context, header passthrough
 *
 * AWS: Bedrock AgentCore Runtime request header configuration
 *
 * Validation: requestHeaderAllowlist must contain 1-20 header names if provided
 */
export interface RequestHeaderConfigurationProperty {
  /**
   * HTTP header names to forward to the agent runtime.
   *
   * Use cases: Header forwarding, request context, custom headers
   *
   * AWS: HTTP header allowlist for Bedrock AgentCore Runtime
   *
   * Validation: Optional; String[]; 1-20 header names
   **/
  readonly requestHeaderAllowlist?: string[];
  /**
   * @deprecated Use requestHeaderAllowlist instead. This property is maintained for backward compatibility.
   **/
  readonly allowedHeaders?: string[];
}

/**
 * IAM policy statement for inline policy documents.
 * Represents a single statement with effect, actions, resources, and optional conditions.
 *
 * Use cases: Permission definition, access control rules, resource permissions
 *
 * AWS: IAM policy statement
 *
 * Validation: Effect must be Allow or Deny; Action and Resource required
 */
export interface PolicyStatementProperty {
  /**
   * Statement identifier for the policy statement.
   *
   * Use cases: Statement identification, policy organization
   *
   * AWS: IAM policy statement ID
   *
   * Validation: Optional; String
   **/
  /** @jsii ignore */
  readonly Sid?: string;
  /**
   * Whether to allow or deny the specified actions.
   *
   * Use cases: Access control, permission definition
   *
   * AWS: IAM policy statement effect
   *
   * Validation: Required; 'Allow' or 'Deny'
   **/
  /** @jsii ignore */
  readonly Effect: 'Allow' | 'Deny';
  /**
   * AWS service actions allowed or denied by this statement.
   *
   * Use cases: Action definition, service operations, permission scope
   *
   * AWS: IAM policy statement actions
   *
   * Validation: Required; String or String[]
   **/
  /** @jsii ignore */
  readonly Action: string | string[];
  /**
   * AWS resources to which the actions apply.
   *
   * Use cases: Resource scope, permission boundaries, resource targeting
   *
   * AWS: IAM policy statement resources
   *
   * Validation: Required; String (ARN) or String[]
   **/
  /** @jsii ignore */
  readonly Resource: string | string[];
  /**
   * Conditions under which the statement is in effect.
   *
   * Use cases: Conditional access, context-based permissions, fine-grained control
   *
   * AWS: IAM policy statement conditions
   *
   * Validation: Optional; Record<string, Record<string, string | string[]>>
   **/
  /** @jsii ignore */
  readonly Condition?: Record<string, Record<string, string | string[]>>;
}

/**
 * IAM policy document structure for inline policies.
 *
 * Use cases: Inline policy definition, permission documents
 *
 * AWS: IAM policy document
 *
 * Validation: Statement array required with at least one PolicyStatementProperty
 */
export interface PolicyDocumentProperty {
  /**
   * Array of policy statements defining permissions.
   *
   * Use cases: Policy statements, permission definitions, access control rules
   *
   * AWS: IAM policy document statements
   *
   * Validation: Required; PolicyStatementProperty[]
   **/
  /** @jsii ignore */
  readonly Statement: PolicyStatementProperty[];
}

/**
 * IAM policy configuration for the runtime execution role.
 * Supports managed policy ARNs or inline policy documents (mutually exclusive).
 *
 * Use cases: Custom permissions, managed policy attachment, inline policy definition
 *
 * AWS: IAM policies for Bedrock AgentCore Runtime execution role
 *
 * Validation: Must specify either policyArn or policyDocument (mutually exclusive)
 */
export interface PolicyProperty {
  /**
   * ARN of an existing managed policy to attach to the runtime role.
   *
   * Use cases: Managed policy attachment, standardized permissions, policy reuse
   *
   * AWS: IAM managed policy ARN
   *
   * Validation: Optional; String; valid IAM policy ARN; mutually exclusive with policyDocument
   **/
  readonly policyArn?: string;
  /**
   * Inline policy document for custom permissions on the runtime role.
   *
   * Use cases: Custom permissions, inline policies, granular access control
   *
   * AWS: IAM inline policy document
   *
   * Validation: Optional; PolicyDocumentProperty; mutually exclusive with policyArn
   **/
  readonly policyDocument?: PolicyDocumentProperty;
}

/**
 * Runtime endpoint configuration for invoking the agent runtime via Bedrock AgentCore API.
 *
 * Use cases: Runtime invocation, API access, endpoint management
 *
 * AWS: Bedrock AgentCore Runtime endpoint
 *
 * Validation: name must match ^[a-zA-Z][a-zA-Z0-9_]{0,47}$ if provided
 */
export interface RuntimeEndpointProperty {
  /**
   * Endpoint name for API access identification.
   *
   * Use cases: Endpoint naming, API identification, runtime access
   *
   * AWS: Bedrock AgentCore Runtime endpoint name
   *
   * Validation: Optional; String; alphanumeric and underscores; max 48 chars
   **/
  readonly name?: string;
  /**
   * Description of the runtime endpoint.
   *
   * Use cases: Endpoint documentation, operational clarity
   *
   * AWS: Bedrock AgentCore Runtime endpoint description
   *
   * Validation: Optional; String
   **/
  readonly description?: string;
  /**
   * Specific agent runtime version for the endpoint.
   *
   * Use cases: Version control, version-specific access, deployment control
   *
   * AWS: Bedrock AgentCore Runtime version
   *
   * Validation: Optional; String
   **/
  readonly agentRuntimeVersion?: string;
}

/**
 * Environment variable read by the AgentCore Runtime service to select where the
 * agent's spans are delivered. Set to `'true'` by default so spans land in the
 * agent's own protected log group rather than the account-shared `aws/spans` group;
 * see {@link BedrockAgentcoreRuntimeL3Construct.buildEnvironmentVariables}.
 *
 * This is a service-read variable, not one of the ADOT SDK's `OTEL_*` variables -
 * those are configured inside the container by AgentCore Runtime and MDAA does not
 * set them.
 */
const UNIFIED_TRACES_DESTINATION_ENV_VAR = 'UNIFIED_TRACES_DESTINATION_ENABLED';

/**
 * Built-in set of AWS-managed data identifiers that are always masked on the runtime
 * log groups. This is the mandatory compliance floor - it is applied to every deployment
 * and cannot be reduced. Configuration may only add identifiers on top of this set.
 */
const BUILTIN_DATA_IDENTIFIERS: DataIdentifier[] = [
  DataIdentifier.EMAILADDRESS,
  DataIdentifier.CREDITCARDNUMBER,
  DataIdentifier.SSN_US,
  DataIdentifier.NAME,
  DataIdentifier.ADDRESS,
  DataIdentifier.PHONENUMBER_US,
  DataIdentifier.IPADDRESS,
];

/**
 * CloudWatch Data Protection configuration for the runtime log groups.
 *
 * Data Protection (PII masking) and customer-managed KMS encryption are always-on,
 * built-in behavior for this module and cannot be disabled - sensitive data (emails,
 * SSNs, credit card numbers, etc.) is automatically masked in log events on ingestion.
 * This optional configuration only allows tightening the posture (adding identifiers);
 * it can never reduce the built-in compliance baseline.
 *
 * Use cases: extending PII masking with additional identifiers, future protection options
 *
 * AWS: CloudWatch Logs Data Protection Policy
 *
 * Validation: Optional; additionalIdentifiers only adds to the built-in identifier set
 */
export interface DataProtectionProperty {
  /**
   * Additional AWS-managed data identifiers to mask, on top of the built-in
   * comprehensive set (EmailAddress, CreditCardNumber, Ssn-US, Name, Address,
   * PhoneNumber-US, IpAddress). Each entry is a name matching an AWS-managed data
   * identifier (e.g., "DriversLicense-US", "PassportNumber-US").
   *
   * This field is additive only - it cannot remove or override the built-in
   * identifiers, so it can never reduce the masking baseline.
   *
   * Use cases: stricter PII masking, organization-specific identifier requirements
   *
   * AWS: CloudWatch Logs managed data identifiers
   *
   * Validation: Optional; String[]; must be valid AWS data identifier names
   **/
  readonly additionalIdentifiers?: string[];
}

/**
 * Optional CloudWatch Alarms configuration for the runtime.
 *
 * When this block is present, MDAA creates CloudWatch alarms on the AgentCore
 * service operational metrics (namespace `AWS/Bedrock-AgentCore`) and notifies
 * an SNS topic on alarm. The presence of the block enables alarms - there is no
 * separate `enabled` flag (consistent with the rest of the module config).
 *
 * Provide a notification target via exactly one of `notificationTopicArn`
 * (reference an existing topic) or `createNotificationTopic: true` (have MDAA
 * create a CMK-encrypted topic, reusing the module's log-group KMS key). At
 * least one threshold (`errorRateThreshold` and/or `throttleCountThreshold`)
 * must be supplied.
 *
 * Use cases: production incident detection, error-rate and throttle alerting,
 * auth-failure burst detection (via the error-rate alarm)
 *
 * AWS: CloudWatch Alarms on AWS/Bedrock-AgentCore metrics + SNS notification
 *
 * Validation: requires a notification target and at least one threshold
 */
export interface AlarmsConfiguration {
  /**
   * Error-rate alarm threshold as a percentage of invocations over the
   * evaluation period (e.g. 10 = alarm when TotalErrors/Invocations > 10%).
   * Implemented as a CloudWatch metric-math alarm over the `TotalErrors` and
   * `Invocations` metrics. Omit to skip the error-rate alarm.
   *
   * Use cases: error-rate spike detection, prompt-injection/model-drift signals
   *
   * AWS: CloudWatch metric-math alarm (100 * TotalErrors / Invocations)
   *
   * Validation: Optional; Number; percentage (0-100)
   **/
  readonly errorRateThreshold?: number;
  /**
   * Throttle-count alarm threshold (sum of the `Throttles` metric over the
   * evaluation period). Omit to skip the throttle alarm.
   *
   * Use cases: throttle/quota-exhaustion detection, abuse/runaway-agent signals
   *
   * AWS: CloudWatch alarm on the Throttles metric (Sum)
   *
   * Validation: Optional; Number
   **/
  readonly throttleCountThreshold?: number;
  /**
   * ARN of an existing SNS topic to notify on alarm. Mutually exclusive with
   * `createNotificationTopic`.
   *
   * MDAA cannot verify or modify a topic it did not create, so the topic's
   * configuration is your responsibility: it should be encrypted with a
   * customer-managed KMS key so alarm notifications are protected at rest, must
   * allow the `cloudwatch.amazonaws.com` service principal to `sns:Publish` (and to
   * use that key), and needs at least one subscriber or notifications are accepted
   * and discarded. MDAA emits a synth-time warning restating this. Use
   * `createNotificationTopic: true` instead to get a CMK-encrypted topic MDAA
   * manages for you.
   *
   * Use cases: routing alarms to an existing notification/incident topic
   *
   * AWS: SNS topic ARN used as the CloudWatch alarm action
   *
   * Validation: Optional; String; valid SNS topic ARN; mutually exclusive with createNotificationTopic
   **/
  readonly notificationTopicArn?: string;
  /**
   * When true, MDAA creates a CMK-encrypted SNS topic for alarm notifications
   * (reusing the module's log-group KMS key) and exports its ARN to SSM.
   * Mutually exclusive with `notificationTopicArn`.
   *
   * Use cases: self-contained alerting without a pre-existing topic
   *
   * AWS: MDAA-created CMK-encrypted SNS topic
   *
   * Validation: Optional; Boolean; mutually exclusive with notificationTopicArn
   **/
  readonly createNotificationTopic?: boolean;
  /**
   * Email addresses subscribed to the module-created notification topic. Each
   * address receives an SNS confirmation request and must confirm before delivery
   * begins.
   *
   * Strongly recommended whenever `createNotificationTopic` is true: this topic is
   * the sole delivery path for both the CloudWatch alarms and the EventBridge rules
   * from `eventBridgeAlerts`. With no subscriber, every alarm and every rule
   * publishes into a topic nobody receives - the alerting deploys cleanly and is
   * silently inert. MDAA emits a synth-time warning in that case.
   *
   * Only valid with `createNotificationTopic`. Combining this with
   * `notificationTopicArn` fails at synth: MDAA does not modify a topic it did not
   * create, and the deploying role would not hold `sns:Subscribe` on an
   * externally-owned one. Subscribe on the owning side instead.
   *
   * Use cases: operator paging, routing alarms to a team distribution list
   *
   * AWS: SNS email subscriptions on the created topic
   *
   * Validation: Optional; String[]; valid email addresses; mutually exclusive with notificationTopicArn
   **/
  readonly notificationEmails?: string[];
  /**
   * CloudWatch namespace for the service metrics. Defaults to the AgentCore
   * service namespace. Override only if the published namespace differs in your
   * account/region.
   *
   * Use cases: correcting a namespace mismatch without a code change
   *
   * AWS: CloudWatch metric namespace
   *
   * Validation: Optional; String
   * @default AWS/Bedrock-AgentCore
   **/
  readonly metricNamespace?: string;
  /**
   * Dimensions scoping the metrics to this specific runtime. Leave unset - the
   * module scopes the alarms to this runtime automatically using the `Resource`
   * dimension the AgentCore service publishes (whose value is the runtime ARN).
   * Setting this replaces that default entirely, and a dimension the service
   * does not publish yields alarms that never fire.
   *
   * Use cases: correcting a service-side change to the published dimension
   *
   * AWS: CloudWatch metric dimensions
   *
   * Validation: Optional; map of dimension name to value
   * @default { Resource: <runtime ARN> }
   **/
  readonly dimensions?: { [key: string]: string };
  /**
   * Evaluation period in seconds. Must be 1, 5, 10, 30, or a multiple of 60;
   * CloudWatch rejects other values.
   *
   * Use cases: tuning alarm sensitivity vs. noise
   *
   * AWS: CloudWatch alarm period
   *
   * Validation: Optional; Number; 1, 5, 10, 30, or a multiple of 60 seconds
   * @default 300
   **/
  readonly periodSeconds?: number;
  /**
   * Number of evaluation periods over which the metric is compared to the
   * threshold.
   *
   * Use cases: requiring sustained breaches before alarming
   *
   * AWS: CloudWatch alarm evaluation periods
   *
   * Validation: Optional; Number
   * @default 1
   **/
  readonly evaluationPeriods?: number;
  /**
   * Number of breaching datapoints within `evaluationPeriods` required to move
   * the alarm to ALARM (an "M of N" alarm). Defaults to `evaluationPeriods`, so
   * every period must breach. On low-traffic runtimes a single 5-minute period
   * containing one error out of one invocation is a 100% error rate, so consider
   * raising `evaluationPeriods` and setting this lower to suppress noise.
   *
   * Use cases: reducing false positives on low-traffic runtimes
   *
   * AWS: CloudWatch alarm datapointsToAlarm
   *
   * Validation: Optional; Number; must not exceed evaluationPeriods
   * @default evaluationPeriods
   **/
  readonly datapointsToAlarm?: number;
}

/**
 * A single EventBridge alerting rule for the runtime.
 *
 * MDAA owns every structural field of the generated event pattern - the `source`,
 * `detail-type` (`AWS API Call via CloudTrail`), `eventSource`, and the scoping to
 * this runtime. Configuration supplies only which events to match, via
 * `errorCodes` and/or `eventNames`. A raw `pattern` passthrough is deliberately not
 * exposed: a hand-written pattern that matches nothing deploys cleanly and never
 * fires, which is worse than no alerting because it reads as covered.
 *
 * Use cases: auth-failure detection, out-of-band configuration-change detection
 *
 * AWS: EventBridge rule on AgentCore CloudTrail events, targeting SNS
 *
 * Validation: requires at least one of errorCodes or eventNames
 */
export interface EventBridgeRuleConfiguration {
  /**
   * Human-readable description of what the rule detects. Shown in the EventBridge
   * console and included in the notification message.
   *
   * Use cases: rule documentation, operational clarity in alerts
   *
   * AWS: EventBridge rule description
   *
   * Validation: Optional; String
   **/
  readonly description?: string;
  /**
   * CloudTrail `errorCode` values to alert on (e.g. `AccessDenied`,
   * `UnauthorizedException`). The rule fires when any one of them matches.
   *
   * These are CloudTrail `errorCode` values, NOT the SDK exception names. An IAM
   * authorization failure returns `AccessDeniedException` to the caller but is
   * recorded by CloudTrail as plain `AccessDenied` - verified against real trail
   * records, where every authorization denial across 12 services used the
   * unsuffixed form. Configuring `AccessDeniedException` yields a rule that deploys
   * cleanly and never fires.
   *
   * Service-specific API errors do keep the suffix (`ResourceNotFoundException`,
   * `ValidationException`), so the split is between IAM's normalized denial and a
   * service's own errors. Confirm any code against a real trail record.
   *
   * Note that setting both `errorCodes` and `eventNames` ANDs them: the rule then
   * matches only calls to one of those APIs that failed with one of those codes.
   *
   * Use cases: repeated auth failures, credential-stuffing detection
   *
   * AWS: EventBridge `detail.errorCode` pattern match
   *
   * Validation: Optional; String[]; at least one of errorCodes or eventNames required
   **/
  readonly errorCodes?: string[];
  /**
   * AgentCore API names (CloudTrail `eventName`) to alert on (e.g.
   * `UpdateAgentRuntime`, `DeleteAgentRuntime`). The rule fires when any one of them
   * matches.
   *
   * Use cases: out-of-band configuration changes made outside IaC
   *
   * AWS: EventBridge `detail.eventName` pattern match
   *
   * Validation: Optional; String[]; at least one of errorCodes or eventNames required
   **/
  readonly eventNames?: string[];
  /**
   * ARN of an existing, customer-supplied Lambda function to invoke in addition to
   * the SNS notification, for automated remediation (e.g. revoking credentials or
   * disabling a target). MDAA does not create this function - revoking an execution
   * role or stopping sessions is destructive and site-specific.
   *
   * The rule grants EventBridge `lambda:InvokeFunction` on a same-account target. A
   * cross-account function must grant that permission on its own side.
   *
   * Use cases: auto-remediation, kill-switch on anomalous activity
   *
   * AWS: EventBridge Lambda target with invoke permission
   *
   * Validation: Optional; String; valid Lambda function ARN in this account
   **/
  readonly targetLambdaArn?: string;
}

/**
 * Optional EventBridge alerting configuration for the runtime.
 *
 * When this block is present, MDAA creates EventBridge rules matching AgentCore
 * CloudTrail events for this runtime and notifies the `alarms` SNS topic. As with
 * `alarms`, the presence of the block enables it - there is no separate `enabled`
 * flag.
 *
 * **Requires an `alarms` block** that either creates a notification topic
 * (`createNotificationTopic: true`) or references one (`notificationTopicArn`):
 * that topic is the default rule target. Configuring `eventBridgeAlerts` without
 * one fails at synth rather than deploying rules with no target.
 *
 * **Prerequisite:** a CloudTrail trail in the account/region logging the relevant
 * AgentCore events. Management events (the lifecycle APIs such as
 * `UpdateAgentRuntime`) are logged by default on any trail; data events
 * (invocation) are off by default and must be enabled explicitly. Without a trail
 * covering the events a rule matches, that rule never fires.
 *
 * Use cases: real-time security alerting, auth-failure and config-change detection
 *
 * AWS: EventBridge rules on AgentCore CloudTrail events -> SNS (+ optional Lambda)
 *
 * Validation: requires a `rules` map with at least one entry, and an `alarms` topic
 */
export interface EventBridgeConfiguration {
  /**
   * The rules to create, keyed by a short name (e.g. `auth-failure`). The key is
   * part of the rule's resource name, so it should be stable across deployments.
   *
   * Use cases: multiple independent detections on one runtime
   *
   * AWS: EventBridge rules
   *
   * Validation: Required; map of rule name to EventBridgeRuleConfiguration; at least one entry
   **/
  readonly rules: { [name: string]: EventBridgeRuleConfiguration };
}

/**
 * Complete configuration for deploying a custom agent runtime in Bedrock AgentCore.
 * Defines container deployment, VPC networking, lifecycle, auth, and endpoint settings.
 *
 * Use cases: Custom agent runtime deployment, container-based agents, runtime configuration
 *
 * AWS: Amazon Bedrock AgentCore Runtime
 *
 * Validation: agentRuntimeName, agentRuntimeArtifact, and networkConfiguration are required
 */
export interface BedrockAgentcoreRuntimeProps {
  /**
   * Unique name for the agent runtime.
   *
   * Use cases: Runtime identification, agent organization, configuration management
   *
   * AWS: Bedrock AgentCore Runtime name
   *
   * Validation: Required; String
   **/
  readonly agentRuntimeName: string;
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
   * Description of the agent runtime.
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
   *
   * Use cases: Container deployment, Docker image configuration, runtime packaging
   *
   * AWS: Bedrock AgentCore Runtime artifact
   *
   * Validation: Required; AgentRuntimeArtifactProperty
   **/
  readonly agentRuntimeArtifact: AgentRuntimeArtifactProperty;
  /**
   * Key-value environment variables passed to the runtime container.
   *
   * The construct adds `UNIFIED_TRACES_DESTINATION_ENABLED: 'true'` underneath these,
   * routing agent spans to the runtime's own log group, which carries the construct's CMK
   * encryption, retention, and PII masking. A value supplied here takes precedence: `'false'`
   * sends spans to the account-shared `aws/spans` group instead, which has none of those
   * protections. See {@link BedrockAgentcoreRuntimeL3Construct.buildEnvironmentVariables}.
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
   * MDAA enforces VPC mode for all runtimes.
   *
   * Use cases: VPC deployment, network isolation, private subnet usage, security
   *
   * AWS: Bedrock AgentCore Runtime VPC network configuration
   *
   * Validation: Required; NetworkConfigurationProperty; 1-16 security groups and subnets
   **/
  readonly networkConfiguration: NetworkConfigurationProperty;
  /**
   * Session timeout and maximum lifetime settings.
   *
   * Use cases: Session management, resource control, timeout configuration
   *
   * AWS: Bedrock AgentCore Runtime lifecycle configuration
   *
   * Validation: Optional; LifecycleConfigurationProperty; values 60-28800 seconds
   **/
  readonly lifecycleConfiguration?: LifecycleConfigurationProperty;
  /**
   * Authentication configuration with JWT authorizer support.
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
   * Protocol-level configuration for runtime communication.
   * Defines which protocol the agent runtime uses to communicate with clients.
   *
   * Use cases: Protocol configuration, MCP server deployment, A2A communication, HTTP endpoints
   *
   * AWS: Bedrock AgentCore Runtime protocol configuration
   *
   * Validation: Optional; ProtocolConfigurationProperty
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
   * If omitted, a new role is created.
   *
   * Use cases: Role reuse, existing role usage, permission management
   *
   * AWS: IAM role for Bedrock AgentCore Runtime execution
   *
   * Validation: Optional; String; valid IAM role ARN
   **/
  readonly roleArn?: string;
  /**
   * IAM policies to attach to the runtime execution role.
   *
   * Use cases: Custom permissions, service access, policy attachment
   *
   * AWS: IAM policies for runtime execution role
   *
   * Validation: Optional; PolicyProperty[]
   **/
  readonly policies?: PolicyProperty[];
  /**
   * Endpoint configuration for invoking the runtime via Bedrock AgentCore API.
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
   * CloudWatch Logs retention period for the runtime log group in days.
   *
   * Use cases: Log retention policy, cost management, compliance retention requirements
   *
   * AWS: CloudWatch Logs log group retention
   *
   * Validation: Optional; Number; must be a valid RetentionDays value
   * @default RetentionDays.ONE_MONTH (30 days)
   **/
  readonly logRetentionDays?: number;
  /**
   * CloudWatch Data Protection configuration for the runtime log groups.
   *
   * PII masking and customer-managed KMS encryption are always-on, built-in behavior
   * and cannot be disabled. This optional configuration only allows tightening the
   * posture (adding identifiers) and can never reduce the built-in compliance baseline.
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
   * SNS topic. Omit to deploy no alarms (opt-in, zero baseline impact).
   *
   * Use cases: production incident detection, error-rate and throttle alerting
   *
   * AWS: CloudWatch Alarms + SNS notification
   *
   * Validation: Optional; AlarmsConfiguration
   **/
  readonly alarms?: AlarmsConfiguration;
  /**
   * Optional EventBridge alerting configuration. When present, MDAA creates
   * EventBridge rules on this runtime's AgentCore CloudTrail events, notifying the
   * `alarms` SNS topic (and optionally a customer-supplied remediation Lambda).
   * Omit to create no rules (opt-in, zero baseline impact).
   *
   * Requires an `alarms` block supplying a notification topic, and a CloudTrail
   * trail logging the matched AgentCore events.
   *
   * Use cases: real-time auth-failure and configuration-change alerting
   *
   * AWS: EventBridge rules on AgentCore CloudTrail events -> SNS
   *
   * Validation: Optional; EventBridgeConfiguration; requires an alarms topic
   **/
  readonly eventBridgeAlerts?: EventBridgeConfiguration;
}

/** L3 construct props combining runtime config with MDAA infrastructure properties. */
export interface BedrockAgentcoreRuntimeL3ConstructProps extends MdaaL3ConstructProps, BedrockAgentcoreRuntimeProps {}

export class BedrockAgentcoreRuntimeL3Construct extends MdaaL3Construct {
  public readonly runtime: bedrockagentcore.CfnRuntime;
  public readonly runtimeEndpoint?: bedrockagentcore.CfnRuntimeEndpoint;
  public readonly runtimeRole?: MdaaRole;
  private readonly repositoryArn?: string;
  protected readonly props: BedrockAgentcoreRuntimeL3ConstructProps;
  /** KMS key created for log-group encryption; reused for the alarm SNS topic when one is created. */
  private logGroupKmsKey?: MdaaKmsKey;
  /** Memoized backing field for {@link sanitizedRuntimeName}. */
  private _sanitizedRuntimeName?: string;
  /**
   * Sanitized endpoint name, which is the qualifier in the `Name` metric dimension.
   * Undefined when no runtimeEndpoint is configured, in which case the service
   * records metrics under the DEFAULT qualifier.
   */
  private sanitizedEndpointName?: string;

  /**
   * Sanitized runtime name: the value given to the CfnRuntime, the prefix of the `Name`
   * metric dimension the AgentCore service publishes (`<name>::<qualifier>`), and the
   * log-group prefix the execution role's `logs:PutResourcePolicy` grant is scoped to.
   *
   * Computed on first access rather than in the constructor so the several call sites
   * that need it cannot be broken by reordering. It is a pure function of the naming
   * module and `agentRuntimeName` - it creates no constructs - so the first caller wins
   * and every later caller gets the identical string.
   */
  private get sanitizedRuntimeName(): string {
    this._sanitizedRuntimeName ??= sanitizeBedrockAgentcoreName(
      this.props.naming
        .withResourceType(MdaaResourceType.BEDROCK_AGENTCORE_RUNTIME)
        .resourceName(this.props.agentRuntimeName, 48),
    );
    return this._sanitizedRuntimeName;
  }

  constructor(scope: Construct, id: string, props: BedrockAgentcoreRuntimeL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    // Build artifact property and get repository ARN if building from source or using containerUri
    const { artifactProperty, repositoryArn } = this.buildArtifactProperty(props.agentRuntimeArtifact);
    this.repositoryArn = repositoryArn;

    // Create or reference IAM role for the runtime
    const runtimeRole = this.createOrReferenceRuntimeRole(props);
    this.runtimeRole = runtimeRole instanceof MdaaRole ? runtimeRole : undefined;

    // Get role ARN
    const roleArn = this.getRoleArn(runtimeRole);

    // Validate VPC configuration is provided (MDAA security requirement)
    if (!props.networkConfiguration) {
      throw new Error(
        'networkConfiguration is required. MDAA enforces VPC deployment for Bedrock AgentCore Runtime to maintain the highest security standards.',
      );
    }

    // Build typed runtime properties for CloudFormation
    const runtimeProps: bedrockagentcore.CfnRuntimeProps = {
      agentRuntimeName: this.sanitizedRuntimeName,
      agentRuntimeArtifact: artifactProperty,
      roleArn: roleArn,
      networkConfiguration: buildNetworkConfiguration(props.networkConfiguration),
      // Optional properties - left undefined when not configured so the synthesized
      // template omits them entirely (matching the prior passthrough behavior).
      description: props.description,
      environmentVariables: this.buildEnvironmentVariables(props.environmentVariables),
      protocolConfiguration: props.protocolConfiguration,
      lifecycleConfiguration: props.lifecycleConfiguration
        ? buildLifecycleConfiguration(props.lifecycleConfiguration)
        : undefined,
      authorizerConfiguration: props.authorizerConfiguration
        ? buildAuthorizerConfiguration(props.authorizerConfiguration)
        : undefined,
      requestHeaderConfiguration: props.requestHeaderConfiguration
        ? buildRequestHeaderConfiguration(props.requestHeaderConfiguration)
        : undefined,
    };

    // Create the runtime using the typed CfnRuntime construct
    this.runtime = new bedrockagentcore.CfnRuntime(this, 'Runtime', runtimeProps);

    // Create CloudWatch Logs ResourcePolicy to allow X-Ray to write logs
    // This is required for TransactionSearchConfig to function properly
    const xrayResourcePolicy = new ResourcePolicy(this, 'XRayResourcePolicy', {
      policyStatements: [
        new PolicyStatement({
          sid: 'TransactionSearchXRayAccess',
          effect: Effect.ALLOW,
          principals: [new ServicePrincipal('xray.amazonaws.com')],
          actions: ['logs:PutLogEvents'],
          resources: [
            `arn:${Stack.of(this).partition}:logs:${Stack.of(this).region}:${Stack.of(this).account}:log-group:aws/spans:*`,
            `arn:${Stack.of(this).partition}:logs:${Stack.of(this).region}:${Stack.of(this).account}:log-group:/aws/application-signals/data:*`,
          ],
          conditions: {
            ArnLike: {
              'aws:SourceArn': `arn:${Stack.of(this).partition}:xray:${Stack.of(this).region}:${Stack.of(this).account}:*`,
            },
            StringEquals: {
              'aws:SourceAccount': Stack.of(this).account,
            },
          },
        }),
      ],
    });

    // Create X-Ray Transaction Search Config for enhanced trace analysis if enabled
    // This enables natural language search and analysis of X-Ray traces for the agent runtime
    // Note: This resource is a singleton per AWS account per region
    // Set enableTransactionSearch to false if this resource already exists in your account/region
    if (props.enableTransactionSearch !== false) {
      const transactionSearchConfig = new xray.CfnTransactionSearchConfig(this, 'TransactionSearchConfig', {
        indexingPercentage: 1,
      });

      // Ensure the resource policy is created before the transaction search config
      transactionSearchConfig.node.addDependency(xrayResourcePolicy);
    }

    // Create runtime endpoint if specified.
    // Created before log protection so the log protection Custom Resource can depend
    // on the endpoint resource (the service creates a per-endpoint log group).
    if (props.runtimeEndpoint) {
      this.runtimeEndpoint = this.createRuntimeEndpoint(props.runtimeEndpoint, props.agentRuntimeName);
    }

    // Apply CMK encryption, retention, and data protection to service-created log groups.
    // This is always-on, built-in compliance behavior - it cannot be disabled by config.
    this.createLogProtection(props);

    // Create resource-based policy restricting invocations to VPC-only traffic
    if (props.enforceVpcOnly) {
      if (!props.networkConfiguration.vpcId) {
        throw new Error(
          'networkConfiguration.vpcId is required when enforceVpcOnly is true. The VPC ID is used to restrict invocations to traffic originating from your VPC.',
        );
      }
      const runtimeArn = this.runtime.attrAgentRuntimeArn;
      const resourcePolicy = createAgentCoreResourcePolicy(this, 'ResourcePolicy', {
        resourceArn: runtimeArn,
        vpcId: props.networkConfiguration.vpcId,
      });
      resourcePolicy.addDependency(this.runtime);
    }

    // Create the AgentCore interface VPC endpoint if requested
    this.createVpcEndpoint(props);

    // Create optional CloudWatch alarms on the runtime's service metrics. Any topic
    // created here is handed to the EventBridge rules below as their target, rather
    // than stashed on the instance - the value is only needed between these two calls.
    const alarmNotificationTopic = props.alarms ? this.createAlarms(props.alarms, props.agentRuntimeName) : undefined;

    // Create optional EventBridge rules alerting on this runtime's CloudTrail events
    if (props.eventBridgeAlerts) {
      this.createEventBridgeAlerts(
        props.eventBridgeAlerts,
        props.alarms,
        props.agentRuntimeName,
        alarmNotificationTopic,
      );
    }

    // Store runtime information in SSM Parameter Store
    this.storeSSMParameters(props.agentRuntimeName);
  }

  /**
   * Applies the {@link UNIFIED_TRACES_DESTINATION_ENV_VAR} default beneath the configured
   * variables. Keep the default first: moving it after the spread would silently override
   * a customer's opt-out.
   */
  private buildEnvironmentVariables(configured?: { [key: string]: string }): { [key: string]: string } {
    return {
      [UNIFIED_TRACES_DESTINATION_ENV_VAR]: 'true',
      ...configured,
    };
  }

  /**
   * Whether spans are routed to the runtime's own log group, which is what the execution
   * role's `logs:PutResourcePolicy` grant is for. Derived from the same merged map the
   * runtime receives so the grant cannot disagree with the variable it depends on.
   */
  private spanDestinationEnabled(configured?: { [key: string]: string }): boolean {
    return this.buildEnvironmentVariables(configured)[UNIFIED_TRACES_DESTINATION_ENV_VAR] !== 'false';
  }

  /**
   * Creates CloudWatch alarms on the runtime's AgentCore service metrics
   * (error rate, throttle count) and wires them to an SNS topic. Delegates to
   * the shared {@link createAgentCoreAlarms} helper. When a topic is created,
   * the module's log-group KMS key is reused for encryption; the topic and
   * alarms publish their own SSM parameters via MdaaSnsTopic/MdaaAlarm.
   *
   * The caller must invoke this after {@link createLogProtection}, which assigns
   * the log-group KMS key. Asserted below rather than left to call ordering: a
   * reordering would otherwise pass `masterKey: undefined` and could produce an
   * unencrypted notification topic.
   *
   * @returns the module-created SNS topic, when one was created. Returned rather
   * than discarded so the EventBridge rules can target the same topic.
   */
  private createAlarms(alarms: AlarmsConfiguration, runtimeName: string): ITopic | undefined {
    if (alarms.createNotificationTopic && !this.logGroupKmsKey) {
      throw new Error(
        'Internal error: the log-group KMS key must be created before the alarm notification topic ' +
          'so the topic can be CMK-encrypted. createAlarms must run after createLogProtection.',
      );
    }

    // A created topic with no subscribers accepts every alarm and EventBridge
    // notification and discards it - the alerting deploys cleanly and is inert. Warn
    // rather than fail: subscriptions can legitimately be managed out-of-band (e.g. a
    // chatbot or an existing distribution list attached outside MDAA).
    if (alarms.createNotificationTopic && !alarms.notificationEmails?.length) {
      Annotations.of(this).addWarningV2(
        '@aws-mdaa/bedrock-agentcore-runtime:alarmTopicWithoutSubscribers',
        `alarms.createNotificationTopic is true but alarms.notificationEmails is not set, so the created SNS ` +
          `topic has no subscribers. CloudWatch alarms${this.props.eventBridgeAlerts ? ' and eventBridgeAlerts rules' : ''} ` +
          `will publish to it and the notifications will be discarded. Set alarms.notificationEmails, or subscribe ` +
          `to the topic ARN exported to SSM out-of-band.`,
      );
    }

    // An existing topic is outside MDAA's control: its encryption, its resource
    // policy, and its subscriptions are all invisible at synth. Mirrors the
    // equivalent advisory on the EventBridge imported-topic path in
    // createEventBridgeAlerts, so both paths tell the operator the same thing.
    if (alarms.notificationTopicArn) {
      Annotations.of(this).addWarningV2(
        '@aws-mdaa/bedrock-agentcore-runtime:alarmsImportedTopicEncryption',
        `alarms.notificationTopicArn references the existing SNS topic ${alarms.notificationTopicArn}, whose ` +
          `configuration MDAA cannot verify or modify at synth. Ensure that topic is encrypted with a customer-managed ` +
          `KMS key (so alarm notifications are protected at rest), allows the cloudwatch.amazonaws.com service ` +
          `principal to sns:Publish and to use that key, and has at least one subscriber.`,
      );
    }

    const result = createAgentCoreAlarms(this, 'Alarms', {
      resourceName: runtimeName,
      // Scopes the alarms to this runtime. The service publishes the full triple
      // {Resource, Operation, Name}, and CloudWatch matches dimensions exactly, so
      // all three must be supplied or the alarms receive no datapoints.
      resourceArn: this.runtime.attrAgentRuntimeArn,
      // `Name` is `<runtimeName>::<qualifier>`. The qualifier is the endpoint the
      // caller invokes; when no endpoint is configured the service records metrics
      // under DEFAULT. Note metrics are per-qualifier, so this alarm observes only
      // this endpoint - see AGENTCORE_METRIC_NAME_DIMENSION_NAME.
      metricNameDimensionValue: `${this.sanitizedRuntimeName}::${this.sanitizedEndpointName ?? 'DEFAULT'}`,
      naming: this.props.naming,
      // Runtime publishes TotalErrors; other AgentCore services differ.
      errorMetricNames: AGENTCORE_RUNTIME_ERROR_METRICS,
      errorRateThreshold: alarms.errorRateThreshold,
      throttleCountThreshold: alarms.throttleCountThreshold,
      notificationTopicArn: alarms.notificationTopicArn,
      createNotificationTopic: alarms.createNotificationTopic,
      notificationEmails: alarms.notificationEmails,
      masterKey: alarms.createNotificationTopic ? this.logGroupKmsKey : undefined,
      metricNamespace: alarms.metricNamespace,
      dimensions: alarms.dimensions,
      periodSeconds: alarms.periodSeconds,
      evaluationPeriods: alarms.evaluationPeriods,
      datapointsToAlarm: alarms.datapointsToAlarm,
    });

    return result.topic;
  }

  /**
   * Creates EventBridge rules alerting on this runtime's AgentCore CloudTrail
   * events, targeting the alarms SNS topic. Delegates to the shared
   * {@link createAgentCoreEventBridgeRules} helper.
   *
   * The rules are scoped to this runtime by both its ID and its ARN, because the
   * CloudTrail `requestParameters` field carrying the runtime's identity differs
   * per API (the lifecycle APIs take `agentRuntimeId`; invocation takes the ARN).
   *
   * @param createdTopic the SNS topic {@link createAlarms} created, when it created
   * one. Passed in rather than read from instance state so the dependency on
   * createAlarms having already run is explicit in the signature.
   */
  private createEventBridgeAlerts(
    eventBridgeAlerts: EventBridgeConfiguration,
    alarms: AlarmsConfiguration | undefined,
    runtimeName: string,
    createdTopic?: ITopic,
  ): void {
    // The rules' default target is the alarms topic. Without a topic the rules would
    // deploy with no target and silently notify nothing, so fail at synth instead.
    if (!alarms) {
      throw new Error(
        'eventBridgeAlerts requires an alarms block to supply the notification topic that the rules target. ' +
          'Add an alarms block setting either createNotificationTopic: true (module-created CMK-encrypted topic) ' +
          'or notificationTopicArn (existing topic).',
      );
    }

    let notificationTopic: ITopic;
    if (createdTopic) {
      notificationTopic = createdTopic;
    } else if (alarms.notificationTopicArn) {
      notificationTopic = Topic.fromTopicArn(this, 'EventBridgeAlertTopic', alarms.notificationTopicArn);
      // CDK cannot attach a resource policy to an imported topic, so the EventBridge
      // publish grant the SNS target would normally add is silently skipped. Warn
      // rather than fail: the topic may already allow events.amazonaws.com, and MDAA
      // cannot see its policy at synth time.
      Annotations.of(this).addWarningV2(
        '@aws-mdaa/bedrock-agentcore-runtime:eventBridgeAlertsImportedTopicGrant',
        `eventBridgeAlerts targets the existing SNS topic ${alarms.notificationTopicArn}, whose resource policy ` +
          `MDAA cannot modify. Ensure that topic allows the events.amazonaws.com service principal to sns:Publish ` +
          `(and, if it is CMK-encrypted, to use the key), or the rules will match but deliver nothing.`,
      );
    } else {
      throw new Error(
        'eventBridgeAlerts requires the alarms block to supply a notification topic, but it sets neither ' +
          'createNotificationTopic nor notificationTopicArn.',
      );
    }

    createAgentCoreEventBridgeRules(this, 'EventBridgeAlerts', {
      resourceName: runtimeName,
      naming: this.props.naming,
      rules: eventBridgeAlerts.rules,
      notificationTopic,
      // Control-plane APIs that name the runtime in the request body.
      resourceRequestParameters: {
        [AGENTCORE_RUNTIME_ID_REQUEST_PARAMETER]: this.runtime.attrAgentRuntimeId,
        [AGENTCORE_RUNTIME_ARN_REQUEST_PARAMETER]: this.runtime.attrAgentRuntimeArn,
      },
      // Required for invocation events, whose requestParameters is null - the runtime
      // is identified only in detail.resources[].ARN. The endpoint ARN is included
      // because CloudTrail records it alongside the runtime on invoke.
      resourceArns: [
        this.runtime.attrAgentRuntimeArn,
        ...(this.runtimeEndpoint ? [this.runtimeEndpoint.attrAgentRuntimeEndpointArn] : []),
      ],
    });
  }

  private resolveContainerConfiguration(containerConfig: ContainerConfigurationProperty): {
    containerUri: string;
    repositoryArn?: string;
  } {
    // If ContainerUri is provided, use it directly and parse repository ARN
    if (containerConfig.containerUri) {
      return {
        containerUri: containerConfig.containerUri,
        repositoryArn: this.parseEcrRepositoryArn(containerConfig.containerUri),
      };
    }
    // If CodePath is provided, build Docker image and push to ECR
    if (containerConfig.codePath) {
      return this.buildAndPushDockerImage(containerConfig);
    }

    throw new Error('ContainerConfiguration must have either containerUri or codePath specified.');
  }

  private buildArtifactProperty(artifactConfig: AgentRuntimeArtifactProperty): {
    artifactProperty: bedrockagentcore.CfnRuntime.AgentRuntimeArtifactProperty;
    repositoryArn?: string;
  } {
    const { containerUri, repositoryArn } = this.resolveContainerConfiguration(artifactConfig.containerConfiguration);

    return {
      artifactProperty: {
        containerConfiguration: {
          containerUri: containerUri,
        },
      },
      repositoryArn,
    };
  }

  private buildAndPushDockerImage(containerConfig: ContainerConfigurationProperty): {
    containerUri: string;
    repositoryArn: string;
  } {
    const codePath = containerConfig.codePath!;

    // Determine platform
    const platformStr = containerConfig.platform || 'linux/arm64';
    const platformEnum = platformStr === 'linux/amd64' ? Platform.LINUX_AMD64 : Platform.LINUX_ARM64; // Default to ARM64 for AgentCore

    // Build and push Docker image using CDK's DockerImageAsset
    const dockerImage = new DockerImageAsset(this, 'DockerImage', {
      directory: codePath,
      platform: platformEnum,
    });

    return {
      containerUri: dockerImage.imageUri,
      repositoryArn: dockerImage.repository.repositoryArn,
    };
  }

  private createOrReferenceRuntimeRole(props: BedrockAgentcoreRuntimeProps): MdaaRole | MdaaRoleRef {
    // If RoleArn is provided, return a reference
    if (props.roleArn) {
      return {
        arn: props.roleArn,
        name: props.roleArn.split('/').pop()!,
      };
    }

    const stack = Stack.of(this);
    const accountId = stack.account;
    const region = stack.region;

    // Create trust policy with conditions
    const trustPolicy = new ServicePrincipal('bedrock-agentcore.amazonaws.com', {
      conditions: {
        StringEquals: {
          'aws:SourceAccount': accountId,
        },
        ArnLike: {
          'aws:SourceArn': `arn:${stack.partition}:bedrock-agentcore:${region}:${accountId}:*`,
        },
      },
    });

    // Build inline policy statements
    const policyStatements: PolicyStatement[] = [
      // ECR Token Access
      // Note: ecr:GetAuthorizationToken does not support resource-level permissions per AWS service design.
      // This is a global operation that retrieves authentication tokens for ECR registries.
      // Reference: https://docs.aws.amazon.com/AmazonECR/latest/userguide/security_iam_id-based-policy-examples.html
      new PolicyStatement({
        sid: 'ECRTokenAccess',
        effect: Effect.ALLOW,
        actions: ['ecr:GetAuthorizationToken'],
        resources: ['*'],
      }),
      // CloudWatch Logs permissions
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['logs:DescribeLogStreams', 'logs:CreateLogGroup'],
        resources: [`arn:${stack.partition}:logs:${region}:${accountId}:log-group:/aws/bedrock-agentcore/runtimes/*`],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['logs:DescribeLogGroups'],
        resources: [`arn:${stack.partition}:logs:${region}:${accountId}:log-group:*`],
      }),
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [
          `arn:${stack.partition}:logs:${region}:${accountId}:log-group:/aws/bedrock-agentcore/runtimes/*:log-stream:*`,
        ],
      }),
      // X-Ray tracing permissions
      // Note: X-Ray tracing actions do not support resource-level permissions per AWS service design.
      // These are service-level operations for distributed tracing.
      // Reference: https://docs.aws.amazon.com/xray/latest/devguide/security_iam_id-based-policy-examples.html
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords',
          'xray:GetSamplingRules',
          'xray:GetSamplingTargets',
        ],
        resources: ['*'],
      }),
      // CloudWatch Metrics (Bedrock AgentCore namespace only)
      // Note: cloudwatch:PutMetricData does not support resource-level permissions per AWS service design.
      // However, we restrict access using a condition key to limit metrics to 'bedrock-agentcore' namespace only.
      // This is the most restrictive configuration possible for this action.
      // Reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/iam-identity-based-access-control-cw.html
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'cloudwatch:namespace': 'bedrock-agentcore',
          },
        },
      }),
      // Bedrock AgentCore Workload Identity Token access
      // Note: the workload-identity resource is scoped with a '/*' wildcard rather than a specific
      // identity name because AgentCore creates the workload identity at runtime and derives its name
      // from the runtime's AgentRuntimeName (itself generated from MDAA naming, e.g.
      // <project>_<domain>_<module>_<runtime>_*). That name is not known at synth time, so it cannot be
      // pinned in the policy. The statement remains constrained to this account, region, and the
      // 'default' directory — it is not a bare Resource '*'.
      new PolicyStatement({
        sid: 'GetAgentAccessToken',
        effect: Effect.ALLOW,
        actions: [
          'bedrock-agentcore:GetWorkloadAccessToken',
          'bedrock-agentcore:GetWorkloadAccessTokenForJWT',
          'bedrock-agentcore:GetWorkloadAccessTokenForUserId',
        ],
        resources: [
          `arn:${stack.partition}:bedrock-agentcore:${region}:${accountId}:workload-identity-directory/default`,
          `arn:${stack.partition}:bedrock-agentcore:${region}:${accountId}:workload-identity-directory/default/workload-identity/*`,
        ],
      }),
      // Bedrock Model Invocation
      new PolicyStatement({
        sid: 'BedrockModelInvocation',
        effect: Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: props.allowedModelArns ?? [
          `arn:${stack.partition}:bedrock:*::foundation-model/*`,
          `arn:${stack.partition}:bedrock:${region}:${accountId}:*`,
        ],
      }),
    ];

    // Span destination: AgentCore calls PutResourcePolicy on the agent's log group to
    // authorize X-Ray to deliver spans there. Granted only when the destination is in use -
    // an opt-out deployment sends spans to the shared aws/spans group, which the separate
    // XRayResourcePolicy already authorizes, so this permission would go unused.
    //
    // Scoped to this runtime's own log groups rather than the /runtimes/* wildcard the
    // statements above use: PutResourcePolicy rewrites a log group's resource policy, so a
    // wildcard would let one agent's execution role alter every other agent's.
    if (this.spanDestinationEnabled(props.environmentVariables)) {
      policyStatements.push(
        new PolicyStatement({
          sid: 'SpanDestinationResourcePolicy',
          effect: Effect.ALLOW,
          actions: ['logs:PutResourcePolicy'],
          resources: [
            `arn:${stack.partition}:logs:${region}:${accountId}:log-group:/aws/bedrock-agentcore/runtimes/${this.sanitizedRuntimeName}-*`,
          ],
        }),
      );
    }

    // ECR Image Access - specific repository if Docker image was built or containerUri provided
    if (this.repositoryArn) {
      policyStatements.push(
        new PolicyStatement({
          sid: 'ECRRepositoryAccess',
          effect: Effect.ALLOW,
          actions: ['ecr:GetDownloadUrlForLayer', 'ecr:BatchGetImage'],
          resources: [this.repositoryArn],
        }),
      );
    }

    // Add custom policy statements from config
    policyStatements.push(...extractCustomPolicyStatements(props.policies));

    // Build managed policies list
    const managedPolicies =
      props.policies
        ?.filter(p => p.policyArn)
        .map(p =>
          ManagedPolicy.fromManagedPolicyArn(this, `ManagedPolicy-${p.policyArn!.split('/').pop()}`, p.policyArn!),
        ) ?? [];

    // Create managed policy document instead of inline policy for compliance
    const runtimeManagedPolicy = new ManagedPolicy(this, 'RuntimeManagedPolicy', {
      managedPolicyName: this.props.naming
        .withResourceType(MdaaResourceType.IAM_POLICY)
        .resourceName(`bedrock-agentcore-runtime-${props.agentRuntimeName}`, 128),
      description: `Managed policy for Bedrock AgentCore Runtime: ${props.agentRuntimeName}`,
      document: new PolicyDocument({
        statements: policyStatements,
      }),
    });

    // Add the runtime managed policy to the list
    managedPolicies.push(runtimeManagedPolicy);

    // Create the role with MdaaRole using only managed policies
    const mdaaRole = new MdaaRole(this, 'RuntimeRole', {
      naming: this.props.naming,
      roleName: `bedrock-agentcore-runtime-${props.agentRuntimeName}`,
      assumedBy: trustPolicy,
      description: `IAM role for Bedrock AgentCore Runtime: ${props.agentRuntimeName}`,
      managedPolicies: managedPolicies,
    });

    // Add cdk-nag suppressions for the managed policy
    MdaaNagSuppressions.addCodeResourceSuppressions(
      runtimeManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Wildcard resources required for ECR GetAuthorizationToken (global service), X-Ray, CloudWatch Metrics (scoped by namespace condition), and Bedrock foundation models. ' +
            "logs:PutResourcePolicy uses a wildcard suffix because AgentCore appends the endpoint qualifier to the log group name at runtime; it is scoped to this runtime's own log-group prefix (/aws/bedrock-agentcore/runtimes/<runtimeName>-*), not to all runtimes. " +
            'See https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchlogs.html',
        },
      ],
      true,
    );

    // Add cdk-nag suppressions for the role
    MdaaNagSuppressions.addCodeResourceSuppressions(
      mdaaRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Wildcard resources required for ECR GetAuthorizationToken (global service), X-Ray, CloudWatch Metrics (scoped by namespace condition), and Bedrock foundation models. ' +
            "logs:PutResourcePolicy uses a wildcard suffix because AgentCore appends the endpoint qualifier to the log group name at runtime; it is scoped to this runtime's own log-group prefix (/aws/bedrock-agentcore/runtimes/<runtimeName>-*), not to all runtimes. " +
            'See https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchlogs.html',
        },
      ],
      true,
    );

    if (managedPolicies.length > 0) {
      MdaaNagSuppressions.addCodeResourceSuppressions(
        mdaaRole,
        [
          {
            id: 'AwsSolutions-IAM4',
            reason: 'Using customer managed policies for Bedrock AgentCore Runtime as required for compliance',
          },
        ],
        true,
      );
    }

    return mdaaRole;
  }

  private getRoleArn(role: MdaaRole | MdaaRoleRef): string {
    if ('arn' in role && typeof role.arn === 'string') {
      return role.arn;
    }
    return (role as MdaaRole).roleArn;
  }

  private parseEcrRepositoryArn(containerUri: string): string {
    // Parse ECR container URI format: {account}.dkr.ecr.{region}.amazonaws.com/{repository}[:{tag}|@{digest}]
    // Examples:
    //   123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest
    //   123456789012.dkr.ecr.us-east-1.amazonaws.com/my-org/my-team/my-repo:v1.0.0
    //   123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo@sha256:abc123...
    //   123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo
    const uriPattern = /^([a-zA-Z\d-]+)\.dkr\.ecr\.([a-zA-Z\d-]+)\.amazonaws\.com\/([^:@]+)/;
    const match = uriPattern.exec(containerUri);

    if (!match) {
      throw new Error(
        `Invalid ECR container URI format: ${containerUri}. Expected format: {account}.dkr.ecr.{region}.amazonaws.com/{repository}[:{tag}|@{digest}]`,
      );
    }

    const [, account, region, repository] = match;
    const stack = Stack.of(this);

    return `arn:${stack.partition}:ecr:${region}:${account}:repository/${repository}`;
  }

  private createRuntimeEndpoint(
    endpointConfig: RuntimeEndpointProperty,
    runtimeName: string,
  ): bedrockagentcore.CfnRuntimeEndpoint {
    // The sanitized endpoint name is the qualifier in the `Name` metric dimension
    // (`<runtimeName>::<qualifier>`), so it is retained for the alarms.
    const sanitizedEndpointName = sanitizeBedrockAgentcoreName(
      this.props.naming
        .withResourceType(MdaaResourceType.BEDROCK_AGENTCORE_ENDPOINT)
        .resourceName(endpointConfig.name || `${runtimeName}_endpoint`, 48),
      'endpoint_',
    );
    this.sanitizedEndpointName = sanitizedEndpointName;

    // Get endpoint name from config or generate default
    const endpointProps: bedrockagentcore.CfnRuntimeEndpointProps = {
      agentRuntimeId: this.runtime.attrAgentRuntimeId,
      name: sanitizedEndpointName,
      // Optional properties - left undefined when not configured so the synthesized
      // template omits them entirely (matching the prior passthrough behavior).
      description: endpointConfig.description,
      agentRuntimeVersion: endpointConfig.agentRuntimeVersion,
    };

    const endpoint = new bedrockagentcore.CfnRuntimeEndpoint(this, 'RuntimeEndpoint', endpointProps);

    endpoint.node.addDependency(this.runtime);

    return endpoint;
  }

  /**
   * Creates the AgentCore interface VPC endpoint when networkConfiguration.vpcEndpoint
   * is configured. The endpoint provides VPC-resident callers a private invocation path
   * and is required for enforceVpcOnly to be satisfiable (the resource policy's
   * aws:SourceVpc condition only exists on requests arriving through a VPC endpoint).
   */
  private createVpcEndpoint(props: BedrockAgentcoreRuntimeL3ConstructProps): void {
    const vpcEndpointConfig = props.networkConfiguration.vpcEndpoint;

    if (!vpcEndpointConfig) {
      // enforceVpcOnly without an endpoint in the VPC leaves the runtime uninvokable -
      // surface this at synth time for users relying on an out-of-band endpoint.
      if (props.enforceVpcOnly) {
        Annotations.of(this).addWarningV2(
          '@aws-mdaa/bedrock-agentcore-runtime:enforceVpcOnlyWithoutVpcEndpoint',
          `enforceVpcOnly is enabled but networkConfiguration.vpcEndpoint is not configured. ` +
            `Ensure a bedrock-agentcore interface VPC endpoint exists in ${props.networkConfiguration.vpcId} ` +
            `(e.g., created by LZA or a central networking team), or the runtime will not be invokable.`,
        );
      }
      return;
    }

    if (!props.networkConfiguration.vpcId) {
      throw new Error(
        'networkConfiguration.vpcId is required when networkConfiguration.vpcEndpoint is configured. ' +
          'The VPC ID identifies the VPC in which the AgentCore interface endpoint is created.',
      );
    }

    // A wildcard endpoint-policy principal is required for JWT/OAuth callers (no IAM
    // identity for the policy to match), but a SigV4 runtime can and should name its
    // caller roles.
    const jwtConfigured = !!(
      (props.authorizerConfiguration?.customJwtAuthorizer ?? props.authorizerConfiguration?.jwtAuthorizer) // NOSONAR
    );
    if (!jwtConfigured && !vpcEndpointConfig.endpointPolicy?.allowPrincipals?.length) {
      Annotations.of(this).addWarningV2(
        '@aws-mdaa/bedrock-agentcore-runtime:vpcEndpointWildcardPrincipal',
        `The AgentCore VPC endpoint policy allows any principal ("*") because ` +
          `networkConfiguration.vpcEndpoint.endpointPolicy.allowPrincipals is not set. ` +
          `This runtime uses SigV4 (IAM) inbound auth, so set allowPrincipals to the caller role ARNs ` +
          `for least-privilege endpoint access. The wildcard is only required for JWT/OAuth callers.`,
      );
    }

    const endpoints = createAgentCoreVpcEndpoint(this, 'VpcEndpoint', {
      vpcId: props.networkConfiguration.vpcId,
      subnetIds: props.networkConfiguration.subnets,
      ingressSecurityGroupIds: props.networkConfiguration.securityGroups,
      vpcEndpointConfig: vpcEndpointConfig,
      naming: this.props.naming,
    });

    new MdaaParamAndOutput(this, {
      resourceType: 'vpc-endpoint',
      resourceId: 'agentcore',
      name: 'id',
      value: endpoints.agentCoreEndpoint.vpcEndpointId,
      ...this.props,
    });
  }

  private createLogProtection(props: BedrockAgentcoreRuntimeL3ConstructProps): void {
    const stack = Stack.of(this);

    // Always create KMS key - data protection implies encryption
    const kmsKey = new MdaaKmsKey(this, 'LogGroupKmsKey', {
      alias: `agentcore-runtime-logs-${props.agentRuntimeName}`,
      description: `KMS key for AgentCore Runtime log group encryption: ${props.agentRuntimeName}`,
      naming: this.props.naming,
    });
    // Expose the key so a created alarm notification topic can reuse it.
    this.logGroupKmsKey = kmsKey;

    // Grant CloudWatch Logs service permission to use the key
    kmsKey.addToResourcePolicy(
      new PolicyStatement({
        sid: 'AllowCloudWatchLogsEncryption',
        effect: Effect.ALLOW,
        resources: ['*'],
        actions: ['kms:Encrypt*', 'kms:Decrypt*', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:Describe*'],
        principals: [new ServicePrincipal(`logs.${stack.region}.amazonaws.com`)],
        conditions: {
          ArnLike: {
            'kms:EncryptionContext:aws:logs:arn': `arn:${stack.partition}:logs:${stack.region}:${stack.account}:*`,
          },
        },
      }),
    );

    // Build the always-on data protection policy (built-in identifier floor plus any additions)
    const dataProtectionPolicy = this.buildDataProtectionPolicy(props.dataProtection);

    // Create Custom Resource that discovers the service-created log groups
    // and applies CMK encryption, retention, and data protection after the runtime exists
    const runtimeId = this.runtime.attrAgentRuntimeId;
    const logProtection = createAgentCoreLogProtection(this, 'LogProtection', {
      runtimeId: runtimeId,
      kmsKey: kmsKey,
      retentionDays: props.logRetentionDays,
      dataProtectionPolicy: dataProtectionPolicy,
      naming: this.props.naming,
    });

    // Ensure the Custom Resource runs after the runtime is created
    logProtection.node.addDependency(this.runtime);

    // Also depend on the runtime endpoint when one is configured. The service creates
    // a per-endpoint log group; depending on the endpoint resource narrows the window
    // in which the Custom Resource could run before that log group exists.
    if (this.runtimeEndpoint) {
      logProtection.node.addDependency(this.runtimeEndpoint);
    }
  }

  /**
   * Builds the always-on data protection policy. The built-in identifier floor
   * ({@link BUILTIN_DATA_IDENTIFIERS}) is always masked; any additionalIdentifiers
   * supplied via config are added on top (deduplicated). This is additive only -
   * the floor can never be reduced.
   */
  private buildDataProtectionPolicy(dataProtection?: DataProtectionProperty): Record<string, unknown> {
    const identifierNames = new Set<string>(BUILTIN_DATA_IDENTIFIERS.map(id => id.name));
    for (const name of dataProtection?.additionalIdentifiers ?? []) {
      identifierNames.add(new DataIdentifier(name).name);
    }

    const dataIdentifierArns = Array.from(identifierNames).map(
      name => `arn:aws:dataprotection::aws:data-identifier/${name}`,
    );

    return {
      Name: 'agentcore-runtime-data-protection',
      Version: '2021-06-01',
      Statement: [
        {
          Sid: 'audit-policy',
          DataIdentifier: dataIdentifierArns,
          Operation: {
            Audit: {
              FindingsDestination: {},
            },
          },
        },
        {
          Sid: 'redact-policy',
          DataIdentifier: dataIdentifierArns,
          Operation: {
            Deidentify: {
              MaskConfig: {},
            },
          },
        },
      ],
    };
  }

  private storeSSMParameters(runtimeName: string): void {
    const fullRuntimeName = this.props.naming.resourceName(runtimeName);

    // Store runtime ARN
    new MdaaParamAndOutput(this, {
      resourceType: 'agentRuntime',
      resourceId: runtimeName,
      name: 'arn',
      value: this.runtime.attrAgentRuntimeArn,
      ...this.props,
    });

    // Store runtime ID
    new MdaaParamAndOutput(this, {
      resourceType: 'agentRuntime',
      resourceId: runtimeName,
      name: 'id',
      value: this.runtime.attrAgentRuntimeId,
      ...this.props,
    });

    // Store runtime name
    new MdaaParamAndOutput(this, {
      resourceType: 'agentRuntime',
      resourceId: runtimeName,
      name: 'name',
      value: fullRuntimeName,
      ...this.props,
    });

    // Store endpoint information if endpoint exists
    if (this.runtimeEndpoint) {
      new MdaaParamAndOutput(this, {
        resourceType: 'agentRuntimeEndpoint',
        resourceId: runtimeName,
        name: 'arn',
        value: this.runtimeEndpoint.attrAgentRuntimeEndpointArn,
        ...this.props,
      });

      new MdaaParamAndOutput(this, {
        resourceType: 'agentRuntimeEndpoint',
        resourceId: runtimeName,
        name: 'id',
        value: this.runtimeEndpoint.attrId,
        ...this.props,
      });
    }
  }
}

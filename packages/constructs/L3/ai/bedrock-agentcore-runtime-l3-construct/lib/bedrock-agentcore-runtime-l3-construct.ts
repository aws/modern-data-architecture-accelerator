/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { Annotations, aws_bedrockagentcore as bedrockagentcore, aws_xray as xray, Stack } from 'aws-cdk-lib';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import {
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
   * context that enforceVpcOnly's resource policy requires — without it, an
   * enforceVpcOnly runtime cannot be invoked at all.
   *
   * Creation is opt-in (interface endpoints carry hourly/per-GB costs). If the
   * VPC already has a bedrock-agentcore endpoint (e.g., created by LZA or a
   * central networking team), omit this block — only one endpoint with Private
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
 * Built-in set of AWS-managed data identifiers that are always masked on the runtime
 * log groups. This is the mandatory compliance floor — it is applied to every deployment
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
 * built-in behavior for this module and cannot be disabled — sensitive data (emails,
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
   * This field is additive only — it cannot remove or override the built-in
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
}

/** L3 construct props combining runtime config with MDAA infrastructure properties. */
export interface BedrockAgentcoreRuntimeL3ConstructProps extends MdaaL3ConstructProps, BedrockAgentcoreRuntimeProps {}

export class BedrockAgentcoreRuntimeL3Construct extends MdaaL3Construct {
  public readonly runtime: bedrockagentcore.CfnRuntime;
  public readonly runtimeEndpoint?: bedrockagentcore.CfnRuntimeEndpoint;
  public readonly runtimeRole?: MdaaRole;
  private readonly repositoryArn?: string;
  protected readonly props: BedrockAgentcoreRuntimeL3ConstructProps;

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
      agentRuntimeName: sanitizeBedrockAgentcoreName(
        this.props.naming
          .withResourceType(MdaaResourceType.BEDROCK_AGENTCORE_RUNTIME)
          .resourceName(props.agentRuntimeName, 48),
      ),
      agentRuntimeArtifact: artifactProperty,
      roleArn: roleArn,
      networkConfiguration: buildNetworkConfiguration(props.networkConfiguration),
      // Optional properties — left undefined when not configured so the synthesized
      // template omits them entirely (matching the prior passthrough behavior).
      description: props.description,
      environmentVariables: props.environmentVariables,
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
    // This is always-on, built-in compliance behavior — it cannot be disabled by config.
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

    // Store runtime information in SSM Parameter Store
    this.storeSSMParameters(props.agentRuntimeName);
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
            'Wildcard resources required for ECR GetAuthorizationToken (global service), X-Ray, CloudWatch Metrics (scoped by namespace condition), and Bedrock foundation models',
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
            'Wildcard resources required for ECR GetAuthorizationToken (global service), X-Ray, CloudWatch Metrics (scoped by namespace condition), and Bedrock foundation models',
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
    // Get endpoint name from config or generate default
    const endpointProps: bedrockagentcore.CfnRuntimeEndpointProps = {
      agentRuntimeId: this.runtime.attrAgentRuntimeId,
      name: sanitizeBedrockAgentcoreName(
        this.props.naming
          .withResourceType(MdaaResourceType.BEDROCK_AGENTCORE_ENDPOINT)
          .resourceName(endpointConfig.name || `${runtimeName}_endpoint`, 48),
        'endpoint_',
      ),
      // Optional properties — left undefined when not configured so the synthesized
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
      // enforceVpcOnly without an endpoint in the VPC leaves the runtime uninvokable —
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

    // Always create KMS key — data protection implies encryption
    const kmsKey = new MdaaKmsKey(this, 'LogGroupKmsKey', {
      alias: `agentcore-runtime-logs-${props.agentRuntimeName}`,
      description: `KMS key for AgentCore Runtime log group encryption: ${props.agentRuntimeName}`,
      naming: this.props.naming,
    });

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
   * supplied via config are added on top (deduplicated). This is additive only —
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

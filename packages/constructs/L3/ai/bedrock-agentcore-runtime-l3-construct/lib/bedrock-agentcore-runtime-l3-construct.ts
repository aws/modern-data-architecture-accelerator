/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { aws_xray as xray, CfnResource, Stack } from 'aws-cdk-lib';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { Effect, ManagedPolicy, PolicyDocument, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { ResourcePolicy } from 'aws-cdk-lib/aws-logs';
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
   *
   * Use cases: Protocol configuration, communication settings
   *
   * AWS: Bedrock AgentCore Runtime protocol configuration
   *
   * Validation: Optional; Record<string, unknown>
   **/
  readonly protocolConfiguration?: Record<string, unknown>;
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
}

/** L3 construct props combining runtime config with MDAA infrastructure properties. */
export interface BedrockAgentcoreRuntimeL3ConstructProps extends MdaaL3ConstructProps, BedrockAgentcoreRuntimeProps {}

export class BedrockAgentcoreRuntimeL3Construct extends MdaaL3Construct {
  public readonly runtime: CfnResource;
  public readonly runtimeEndpoint?: CfnResource;
  public readonly runtimeRole?: MdaaRole;
  private readonly dockerImage?: DockerImageAsset;
  protected readonly props: BedrockAgentcoreRuntimeL3ConstructProps;

  constructor(scope: Construct, id: string, props: BedrockAgentcoreRuntimeL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    // Build artifact property and get Docker image if building from source
    const { artifactProperty, dockerImage } = this.buildArtifactProperty(props.agentRuntimeArtifact);
    this.dockerImage = dockerImage;

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

    // Build runtime properties for CloudFormation
    const runtimeProps: Record<string, unknown> = {
      AgentRuntimeName: sanitizeBedrockAgentcoreName(this.props.naming.resourceName(props.agentRuntimeName, 48)),
      AgentRuntimeArtifact: artifactProperty,
      RoleArn: roleArn,
      NetworkConfiguration: buildNetworkConfiguration(props.networkConfiguration),
    };

    // Add optional properties
    if (props.description) {
      runtimeProps.Description = props.description;
    }
    if (props.environmentVariables) {
      runtimeProps.EnvironmentVariables = props.environmentVariables;
    }
    if (props.protocolConfiguration) {
      runtimeProps.ProtocolConfiguration = props.protocolConfiguration;
    }
    if (props.lifecycleConfiguration) {
      runtimeProps.LifecycleConfiguration = buildLifecycleConfiguration(props.lifecycleConfiguration);
    }
    if (props.authorizerConfiguration) {
      runtimeProps.AuthorizerConfiguration = buildAuthorizerConfiguration(props.authorizerConfiguration);
    }
    if (props.requestHeaderConfiguration) {
      runtimeProps.RequestHeaderConfiguration = buildRequestHeaderConfiguration(props.requestHeaderConfiguration);
    }

    // Create the runtime using CfnResource
    this.runtime = new CfnResource(this, 'Runtime', {
      type: 'AWS::BedrockAgentCore::Runtime',
      properties: runtimeProps,
    });

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

    // Create X-Ray Transaction Search Config for enhanced trace analysis
    // This enables natural language search and analysis of X-Ray traces for the agent runtime
    // IndexingPercentage defaults to 100% if not specified, indexing all traces
    const transactionSearchConfig = new xray.CfnTransactionSearchConfig(this, 'TransactionSearchConfig', {
      indexingPercentage: 1,
    });

    // Ensure the resource policy is created before the transaction search config
    transactionSearchConfig.node.addDependency(xrayResourcePolicy);

    // Create runtime endpoint if specified
    if (props.runtimeEndpoint) {
      this.runtimeEndpoint = this.createRuntimeEndpoint(props.runtimeEndpoint, props.agentRuntimeName);
    }

    // Store runtime information in SSM Parameter Store
    this.storeSSMParameters(props.agentRuntimeName);
  }

  private resolveContainerConfiguration(containerConfig: ContainerConfigurationProperty): {
    containerUri: string;
    dockerImage?: DockerImageAsset;
  } {
    // If ContainerUri is provided, use it directly
    if (containerConfig.containerUri) {
      return { containerUri: containerConfig.containerUri };
    }
    // If CodePath is provided, build Docker image and push to ECR
    if (containerConfig.codePath) {
      return this.buildAndPushDockerImage(containerConfig);
    }

    throw new Error('ContainerConfiguration must have either containerUri or codePath specified.');
  }

  private buildArtifactProperty(artifactConfig: AgentRuntimeArtifactProperty): {
    artifactProperty: Record<string, unknown>;
    dockerImage?: DockerImageAsset;
  } {
    const { containerUri, dockerImage } = this.resolveContainerConfiguration(artifactConfig.containerConfiguration);

    return {
      artifactProperty: {
        ContainerConfiguration: {
          ContainerUri: containerUri,
        },
      },
      dockerImage,
    };
  }

  private buildAndPushDockerImage(containerConfig: ContainerConfigurationProperty): {
    containerUri: string;
    dockerImage: DockerImageAsset;
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
      dockerImage,
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
          `arn:${stack.partition}:bedrock-agentcore:${region}:${accountId}:workload-identity-directory/default/workload-identity/hosted_agent_*`,
        ],
      }),
      // Bedrock Model Invocation
      new PolicyStatement({
        sid: 'BedrockModelInvocation',
        effect: Effect.ALLOW,
        actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
        resources: [
          `arn:${stack.partition}:bedrock:*::foundation-model/*`,
          `arn:${stack.partition}:bedrock:${region}:${accountId}:*`,
        ],
      }),
    ];

    // ECR Image Access - specific repository if Docker image was built
    if (this.dockerImage) {
      policyStatements.push(
        new PolicyStatement({
          sid: 'ECRImageAccess',
          effect: Effect.ALLOW,
          actions: ['ecr:BatchGetImage', 'ecr:GetDownloadUrlForLayer'],
          resources: [this.dockerImage.repository.repositoryArn],
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
      managedPolicyName: this.props.naming.resourceName(`bedrock-agentcore-runtime-${props.agentRuntimeName}`, 128),
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

  private createRuntimeEndpoint(endpointConfig: RuntimeEndpointProperty, runtimeName: string): CfnResource {
    // Get endpoint name from config or generate default
    const endpointProps: Record<string, unknown> = {
      AgentRuntimeId: this.runtime.getAtt('AgentRuntimeId').toString(),
      Name: sanitizeBedrockAgentcoreName(
        this.props.naming.resourceName(endpointConfig.name || `${runtimeName}_endpoint`, 48),
        'endpoint_',
      ),
    };

    if (endpointConfig.description) {
      endpointProps.Description = endpointConfig.description;
    }

    if (endpointConfig.agentRuntimeVersion) {
      endpointProps.AgentRuntimeVersion = endpointConfig.agentRuntimeVersion;
    }

    const endpoint = new CfnResource(this, 'RuntimeEndpoint', {
      type: 'AWS::BedrockAgentCore::RuntimeEndpoint',
      properties: endpointProps,
    });

    endpoint.node.addDependency(this.runtime);

    return endpoint;
  }

  private storeSSMParameters(runtimeName: string): void {
    const fullRuntimeName = this.props.naming.resourceName(runtimeName);

    // Store runtime ARN
    new MdaaParamAndOutput(this, {
      resourceType: 'agentRuntime',
      resourceId: runtimeName,
      name: 'arn',
      value: this.runtime.getAtt('AgentRuntimeArn').toString(),
      ...this.props,
    });

    // Store runtime ID
    new MdaaParamAndOutput(this, {
      resourceType: 'agentRuntime',
      resourceId: runtimeName,
      name: 'id',
      value: this.runtime.getAtt('AgentRuntimeId').toString(),
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
        value: this.runtimeEndpoint.getAtt('AgentRuntimeEndpointArn').toString(),
        ...this.props,
      });

      new MdaaParamAndOutput(this, {
        resourceType: 'agentRuntimeEndpoint',
        resourceId: runtimeName,
        name: 'id',
        value: this.runtimeEndpoint.getAtt('Id').toString(),
        ...this.props,
      });
    }
  }
}

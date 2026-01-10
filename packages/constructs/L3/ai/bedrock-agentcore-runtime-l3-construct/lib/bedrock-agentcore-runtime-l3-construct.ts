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
 * Q-ENHANCED-INTERFACE
 * Container configuration for Bedrock AgentCore Runtime Docker image deployment enabling custom agent runtime execution. Defines container image source and platform configuration for deploying custom agent runtimes with Docker containers in Amazon Bedrock AgentCore.
 *
 * Use cases: Custom agent runtime deployment; Docker container configuration; Platform-specific builds; Container image management
 *
 * AWS: Bedrock AgentCore Runtime container configuration for custom agent runtime Docker image deployment
 *
 * Validation: Must specify either containerUri or codePath; platform must be linux/arm64 or linux/amd64
 */
export interface ContainerConfigurationProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional pre-built container image URI from ECR for agent runtime deployment enabling use of existing container images. Provides direct reference to existing Docker images in ECR for agent runtime deployment without building from source.
   *
   * Use cases: Pre-built image deployment; ECR image reference; Existing container usage; Image reuse
   *
   * AWS: ECR container image URI for Bedrock AgentCore Runtime deployment
   *
   * Validation: Must be valid ECR image URI if provided; mutually exclusive with codePath
   **/
  readonly containerUri?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional local directory path containing Dockerfile and agent code for building container image enabling custom agent runtime development. Provides path to source code directory for building Docker images and deploying custom agent runtimes from local development.
   *
   * Use cases: Custom runtime development; Local image building; Source code deployment; Development workflow
   *
   * AWS: Local directory path for Docker image build and Bedrock AgentCore Runtime deployment
   *
   * Validation: Must be valid directory path containing Dockerfile if provided; mutually exclusive with containerUri
   **/
  readonly codePath?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional container platform specification for multi-architecture support enabling ARM64 or AMD64 builds. Defines the target platform architecture for Docker image builds with AgentCore requiring ARM64 for optimal performance.
   *
   * Use cases: Platform-specific builds; ARM64 optimization; Multi-architecture support; Performance tuning
   *
   * AWS: Docker platform specification for Bedrock AgentCore Runtime container builds
   *
   * Validation: Must be linux/arm64 or linux/amd64 if provided; defaults to linux/arm64 for AgentCore
   **/
  readonly platform?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Agent runtime artifact configuration defining container deployment for Bedrock AgentCore Runtime. Specifies the container configuration for deploying custom agent runtimes with Docker images in Amazon Bedrock AgentCore service.
 *
 * Use cases: Runtime artifact configuration; Container deployment; Agent runtime packaging; Deployment specification
 *
 * AWS: Bedrock AgentCore Runtime artifact configuration for container-based agent runtime deployment
 *
 * Validation: containerConfiguration is required for agent runtime deployment
 */
export interface AgentRuntimeArtifactProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Required container configuration for agent runtime Docker image deployment enabling custom runtime execution. Defines the Docker container image source and configuration for deploying custom agent runtimes in Bedrock AgentCore.
   *
   * Use cases: Container deployment; Docker image configuration; Runtime packaging; Custom agent execution
   *
   * AWS: Bedrock AgentCore Runtime container configuration for Docker-based agent runtime deployment
   *
   * Validation: Required property; must be valid ContainerConfigurationProperty with either containerUri or codePath
   **/
  readonly containerConfiguration: ContainerConfigurationProperty;
}

/**
 * Q-ENHANCED-INTERFACE
 * VPC network configuration for Bedrock AgentCore Runtime deployment. MDAA enforces VPC deployment to maintain the highest security standards by ensuring agent runtimes are deployed in isolated network environments.
 *
 * Use cases: VPC deployment; Network isolation; Private subnet usage; Security configuration
 *
 * AWS: Bedrock AgentCore Runtime VPC network configuration for secure deployment
 *
 * Validation: securityGroups and subnets are required with 1-16 items each
 */
export interface NetworkConfigurationProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Required security group IDs for agent runtime network access control enabling traffic filtering and security boundaries. Defines security groups that control inbound and outbound network traffic for agent runtime instances in VPC deployments.
   *
   * Use cases: Network access control; Traffic filtering; Security boundaries; Firewall rules
   *
   * AWS: VPC security group IDs for Bedrock AgentCore Runtime network access control
   *
   * Validation: Required array with 1-16 security group IDs; security groups must exist in the specified VPC
   **/
  readonly securityGroups: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required subnet IDs for agent runtime deployment enabling multi-AZ placement and network isolation. Defines subnets where agent runtime instances will be deployed for high availability and network segmentation.
   *
   * Use cases: Multi-AZ deployment; Network isolation; High availability; Subnet placement
   *
   * AWS: VPC subnet IDs for Bedrock AgentCore Runtime deployment and network placement
   *
   * Validation: Required array with 1-16 subnet IDs; subnets must exist in the specified VPC
   **/
  readonly subnets: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Lifecycle configuration for Bedrock AgentCore Runtime session management enabling timeout and lifetime controls. Defines session timeout and maximum lifetime settings for agent runtime instances controlling resource usage and session management.
 *
 * Use cases: Session management; Resource control; Timeout configuration; Lifecycle management
 *
 * AWS: Bedrock AgentCore Runtime lifecycle configuration for session and resource management
 *
 * Validation: idleRuntimeSessionTimeout and maxLifetime must be between 60 and 28800 seconds if provided
 */
export interface LifecycleConfigurationProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional idle session timeout in seconds for automatic session termination enabling resource optimization. Defines the duration of inactivity before agent runtime sessions are automatically terminated to optimize resource usage.
   *
   * Use cases: Idle timeout; Resource optimization; Session cleanup; Cost control
   *
   * AWS: Bedrock AgentCore Runtime idle session timeout for automatic resource cleanup
   *
   * Validation: Must be between 60 and 28800 seconds if provided; controls idle session termination
   **/
  readonly idleRuntimeSessionTimeout?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum lifetime in seconds for agent runtime sessions enabling forced session termination. Defines the maximum duration for agent runtime sessions before forced termination regardless of activity status.
   *
   * Use cases: Maximum lifetime; Forced termination; Resource limits; Session boundaries
   *
   * AWS: Bedrock AgentCore Runtime maximum lifetime for session duration limits
   *
   * Validation: Must be between 60 and 28800 seconds if provided; controls maximum session duration
   **/
  readonly maxLifetime?: number;
}

/**
 * Q-ENHANCED-INTERFACE
 * Custom JWT authorizer configuration for Bedrock AgentCore Runtime authentication enabling token-based access control. Defines JWT token validation with OIDC discovery for secure agent runtime access using custom identity providers.
 *
 * Use cases: JWT authentication; Token validation; OIDC integration; Access control
 *
 * AWS: Bedrock AgentCore Runtime JWT authorizer for token-based authentication and access control
 *
 * Validation: discoveryUrl is required and must match OIDC well-known configuration URL pattern
 */
export interface CustomJwtAuthorizerProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Required OIDC discovery URL for JWT token validation enabling identity provider integration. Defines the OpenID Connect discovery endpoint for validating JWT tokens and authenticating agent runtime access.
   *
   * Use cases: OIDC integration; Token validation; Identity provider connection; Authentication configuration
   *
   * AWS: OIDC discovery URL for Bedrock AgentCore Runtime JWT token validation
   *
   * Validation: Required; must match pattern ending with /.well-known/openid-configuration
   **/
  readonly discoveryUrl: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of allowed audience values for JWT token validation enabling client application filtering. Defines the allowed audience claim values in JWT tokens for restricting access to authorized client applications.
   *
   * Use cases: Audience validation; Client filtering; Token validation; Access restriction
   *
   * AWS: JWT audience claim validation for Bedrock AgentCore Runtime access control
   *
   * Validation: Optional array of audience strings; validates against aud claim in JWT tokens
   **/
  readonly allowedAudience?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of allowed client IDs for JWT token validation enabling client-specific access control. Defines the allowed client_id claim values in JWT tokens for restricting access to specific client applications.
   *
   * Use cases: Client ID validation; Application filtering; Token validation; Access control
   *
   * AWS: JWT client_id claim validation for Bedrock AgentCore Runtime access control
   *
   * Validation: Optional array of client ID strings; validates against client_id claim in JWT tokens
   **/
  readonly allowedClients?: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Authorizer configuration for Bedrock AgentCore Runtime access control enabling authentication and authorization. Defines authentication mechanisms for agent runtime access with support for custom JWT authorizers and identity validation.
 *
 * Use cases: Access control; Authentication; Authorization; Identity validation
 *
 * AWS: Bedrock AgentCore Runtime authorizer configuration for access control and authentication
 *
 * Validation: customJwtAuthorizer must be valid CustomJwtAuthorizerProperty if provided
 */
export interface AuthorizerConfigurationProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom JWT authorizer configuration for token-based authentication enabling identity provider integration. Defines JWT token validation with OIDC discovery for secure agent runtime access control.
   *
   * Use cases: JWT authentication; Token validation; OIDC integration; Custom authorization
   *
   * AWS: Custom JWT authorizer for Bedrock AgentCore Runtime token-based authentication
   *
   * Validation: Must be valid CustomJwtAuthorizerProperty if provided; enables JWT-based access control
   **/
  readonly customJwtAuthorizer?: CustomJwtAuthorizerProperty;
  /**
   * @deprecated Use customJwtAuthorizer instead. This property is maintained for backward compatibility.
   **/
  readonly jwtAuthorizer?: CustomJwtAuthorizerProperty;
}

/**
 * Q-ENHANCED-INTERFACE
 * Request header configuration for Bedrock AgentCore Runtime header forwarding enabling custom header passthrough. Defines allowed HTTP headers that will be forwarded to agent runtime instances for custom request handling.
 *
 * Use cases: Header forwarding; Custom headers; Request context; Header passthrough
 *
 * AWS: Bedrock AgentCore Runtime request header configuration for HTTP header forwarding
 *
 * Validation: requestHeaderAllowlist must contain 1-20 header names if provided
 */
export interface RequestHeaderConfigurationProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of HTTP header names to forward to agent runtime enabling custom request context. Defines the list of HTTP headers that will be passed through to agent runtime instances for custom request handling and context.
   *
   * Use cases: Header forwarding; Request context; Custom headers; Context passthrough
   *
   * AWS: HTTP header allowlist for Bedrock AgentCore Runtime request forwarding
   *
   * Validation: Must contain 1-20 header names if provided; defines headers forwarded to runtime
   **/
  readonly requestHeaderAllowlist?: string[];
  /**
   * @deprecated Use requestHeaderAllowlist instead. This property is maintained for backward compatibility.
   **/
  readonly allowedHeaders?: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * IAM policy statement for inline policy documents defining permissions. Represents a single statement in an IAM policy document with effect, actions, resources, and optional conditions.
 *
 * Use cases: Permission definition; Policy statements; Access control; Resource permissions
 *
 * AWS: IAM policy statement structure for inline policy documents
 *
 * Validation: Effect must be Allow or Deny; Action and Resource can be single string or array
 */
export interface PolicyStatementProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional statement ID for identifying the policy statement. Provides a unique identifier for the statement within the policy document.
   *
   * Use cases: Statement identification; Policy organization; Statement reference
   *
   * AWS: IAM policy statement ID for identification
   *
   * Validation: Optional string identifier for the statement
   **/
  /** @jsii ignore */
  readonly Sid?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required effect for the policy statement defining whether to allow or deny access. Specifies whether the statement allows or denies the specified actions on the specified resources.
   *
   * Use cases: Access control; Permission definition; Allow or deny actions
   *
   * AWS: IAM policy statement effect for access control
   *
   * Validation: Must be 'Allow' or 'Deny'
   **/
  /** @jsii ignore */
  readonly Effect: 'Allow' | 'Deny';
  /**
   * Q-ENHANCED-PROPERTY
   * Required action or actions for the policy statement defining permitted or denied operations. Specifies the AWS service actions that are allowed or denied by the statement.
   *
   * Use cases: Action definition; Service operations; Permission scope
   *
   * AWS: IAM policy statement actions for service operations
   *
   * Validation: Can be single action string or array of action strings
   **/
  /** @jsii ignore */
  readonly Action: string | string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required resource or resources for the policy statement defining scope of permissions. Specifies the AWS resources to which the actions apply.
   *
   * Use cases: Resource scope; Permission boundaries; Resource targeting
   *
   * AWS: IAM policy statement resources for permission scope
   *
   * Validation: Can be single resource ARN string or array of resource ARN strings
   **/
  /** @jsii ignore */
  readonly Resource: string | string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional conditions for the policy statement enabling context-based access control. Defines conditions under which the statement is in effect using condition operators and keys.
   *
   * Use cases: Conditional access; Context-based permissions; Fine-grained control
   *
   * AWS: IAM policy statement conditions for context-based access control
   *
   * Validation: Object with condition operators as keys and condition key-value pairs
   **/
  /** @jsii ignore */
  readonly Condition?: Record<string, Record<string, string | string[]>>;
}

/**
 * Q-ENHANCED-INTERFACE
 * IAM policy document structure for inline policies. Defines the structure of an IAM policy document containing an array of policy statements.
 *
 * Use cases: Inline policy definition; Policy document structure; Permission documents
 *
 * AWS: IAM policy document structure for inline policies
 *
 * Validation: Must contain Statement array with at least one policy statement
 */
export interface PolicyDocumentProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of policy statements defining permissions. Contains the individual statements that make up the policy document.
   *
   * Use cases: Policy statements; Permission definitions; Access control rules
   *
   * AWS: IAM policy document statements array
   *
   * Validation: Required array of PolicyStatementProperty objects
   **/
  /** @jsii ignore */
  readonly Statement: PolicyStatementProperty[];
}

/**
 * Q-ENHANCED-INTERFACE
 * IAM policy configuration for Bedrock AgentCore Runtime role permissions enabling custom policy attachment. Defines IAM policies to attach to the agent runtime execution role for granting AWS service access permissions.
 *
 * Use cases: IAM permissions; Policy attachment; Service access; Permission management
 *
 * AWS: IAM policy configuration for Bedrock AgentCore Runtime execution role permissions
 *
 * Validation: Must specify either policyArn for managed policies or policyDocument for inline policies
 */
export interface PolicyProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional managed policy ARN for attaching AWS managed or customer managed policies enabling standardized permissions. Defines the ARN of an existing IAM policy to attach to the agent runtime execution role.
   *
   * Use cases: Managed policy attachment; Standardized permissions; Policy reuse; Permission templates
   *
   * AWS: IAM managed policy ARN for Bedrock AgentCore Runtime role attachment
   *
   * Validation: Must be valid IAM policy ARN if provided; mutually exclusive with policyDocument
   **/
  readonly policyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional inline policy document for custom permissions enabling specific service access. Defines custom IAM policy statements to embed in the agent runtime execution role for granular permission control.
   *
   * Use cases: Custom permissions; Inline policies; Granular access; Specific service access
   *
   * AWS: IAM inline policy document for Bedrock AgentCore Runtime role permissions
   *
   * Validation: Must be valid IAM policy document if provided; mutually exclusive with policyArn
   **/
  readonly policyDocument?: PolicyDocumentProperty;
}

/**
 * Q-ENHANCED-INTERFACE
 * Runtime endpoint configuration for Bedrock AgentCore Runtime API access enabling agent runtime invocation. Defines the endpoint configuration for accessing and invoking agent runtimes through the Bedrock AgentCore API.
 *
 * Use cases: Runtime invocation; API access; Endpoint configuration; Agent access
 *
 * AWS: Bedrock AgentCore Runtime endpoint for agent runtime API access and invocation
 *
 * Validation: name must match pattern for alphanumeric and underscores only
 */
export interface RuntimeEndpointProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional endpoint name for agent runtime API access enabling endpoint identification. Defines the name for the runtime endpoint used to invoke the agent runtime through the Bedrock AgentCore API.
   *
   * Use cases: Endpoint naming; API identification; Runtime access; Endpoint management
   *
   * AWS: Bedrock AgentCore Runtime endpoint name for API access identification
   *
   * Validation: Must match pattern ^[a-zA-Z][a-zA-Z0-9_]{0,47}$ if provided; alphanumeric and underscores only
   **/
  readonly name?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional description for the runtime endpoint providing documentation and context. Enables clear understanding of endpoint purpose and usage for operational management.
   *
   * Use cases: Endpoint documentation; Context description; Operational clarity; Management information
   *
   * AWS: Bedrock AgentCore Runtime endpoint description for documentation and context
   *
   * Validation: Must be descriptive string if provided; enhances endpoint documentation
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional agent runtime version for endpoint configuration enabling version-specific access. Defines the specific version of the agent runtime to use for the endpoint invocation.
   *
   * Use cases: Version control; Specific version access; Version management; Deployment control
   *
   * AWS: Bedrock AgentCore Runtime version for endpoint version-specific access
   *
   * Validation: Must be valid runtime version if provided; enables version-specific endpoint access
   **/
  readonly agentRuntimeVersion?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Bedrock AgentCore Runtime configuration interface for custom agent runtime deployment. Defines complete configuration for deploying custom agent runtimes with Docker containers in Amazon Bedrock AgentCore service.
 *
 * Use cases: Custom agent runtime deployment; Container-based agents; Agent runtime configuration; Custom runtime execution
 *
 * AWS: Amazon Bedrock AgentCore Runtime for custom agent runtime deployment and execution
 *
 * Validation: agentRuntimeName, agentRuntimeArtifact, and networkConfiguration are required; networkConfiguration must use VPC mode
 */
export interface BedrockAgentcoreRuntimeProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required name for the agent runtime providing unique identification within the Bedrock AgentCore service. Enables runtime organization and management for custom agent runtime deployment and execution.
   *
   * Use cases: Runtime identification; Agent organization; Runtime management; Configuration identification
   *
   * AWS: Bedrock AgentCore Runtime name for identification and organization
   *
   * Validation: Required string; must be unique runtime name for identification
   **/
  readonly agentRuntimeName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional description for the agent runtime providing documentation and context. Enables clear understanding of runtime purpose and functionality for operational management.
   *
   * Use cases: Runtime documentation; Context description; Operational clarity; Management information
   *
   * AWS: Bedrock AgentCore Runtime description for documentation and context
   *
   * Validation: Must be descriptive string if provided; enhances runtime documentation
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required agent runtime artifact configuration defining container deployment. Specifies the Docker container image source and configuration for deploying the custom agent runtime.
   *
   * Use cases: Container deployment; Runtime artifact; Docker configuration; Deployment specification
   *
   * AWS: Bedrock AgentCore Runtime artifact for container-based deployment
   *
   * Validation: Required property; must be valid AgentRuntimeArtifactProperty with container configuration
   **/
  readonly agentRuntimeArtifact: AgentRuntimeArtifactProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional environment variables for agent runtime configuration enabling runtime customization. Defines key-value pairs of environment variables passed to the agent runtime container for configuration and behavior control.
   *
   * Use cases: Runtime configuration; Environment customization; Configuration management; Behavior control
   *
   * AWS: Environment variables for Bedrock AgentCore Runtime container configuration
   *
   * Validation: Must be object with string key-value pairs if provided; passed to runtime container
   **/
  readonly environmentVariables?: { [key: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Required network configuration for agent runtime deployment in VPC mode. MDAA enforces VPC deployment to maintain the highest security standards by ensuring agent runtimes are deployed in isolated network environments.
   *
   * Use cases: VPC deployment; Network isolation; Private subnet usage; Security configuration
   *
   * AWS: Bedrock AgentCore Runtime network configuration for secure VPC deployment
   *
   * Validation: Required property; must be valid NetworkConfigurationProperty with VPC mode
   **/
  readonly networkConfiguration: NetworkConfigurationProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional lifecycle configuration for session management enabling timeout and lifetime controls. Defines session timeout and maximum lifetime settings for agent runtime instances.
   *
   * Use cases: Session management; Resource control; Timeout configuration; Lifecycle management
   *
   * AWS: Bedrock AgentCore Runtime lifecycle configuration for session management
   *
   * Validation: Must be valid LifecycleConfigurationProperty if provided; timeout values between 60-28800 seconds
   **/
  readonly lifecycleConfiguration?: LifecycleConfigurationProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional authorizer configuration for access control enabling authentication and authorization. Defines authentication mechanisms for agent runtime access with support for custom JWT authorizers.
   *
   * Use cases: Access control; Authentication; Authorization; Identity validation
   *
   * AWS: Bedrock AgentCore Runtime authorizer for access control and authentication
   *
   * Validation: Must be valid AuthorizerConfigurationProperty if provided; enables JWT-based access control
   **/
  readonly authorizerConfiguration?: AuthorizerConfigurationProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional request header configuration for header forwarding enabling custom header passthrough. Defines allowed HTTP headers that will be forwarded to agent runtime instances.
   *
   * Use cases: Header forwarding; Custom headers; Request context; Header passthrough
   *
   * AWS: Bedrock AgentCore Runtime request header configuration for HTTP header forwarding
   *
   * Validation: Must be valid RequestHeaderConfigurationProperty if provided; 1-20 headers allowed
   **/
  readonly requestHeaderConfiguration?: RequestHeaderConfigurationProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional protocol configuration for agent runtime communication enabling protocol-specific settings. Defines protocol-level configuration for agent runtime communication and behavior.
   *
   * Use cases: Protocol configuration; Communication settings; Protocol behavior; Runtime communication
   *
   * AWS: Bedrock AgentCore Runtime protocol configuration for communication settings
   *
   * Validation: Must be valid protocol configuration if provided; defines runtime communication behavior
   **/
  readonly protocolConfiguration?: Record<string, unknown>;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional existing IAM role ARN for agent runtime execution enabling role reuse. When provided, uses existing IAM role instead of creating new role for agent runtime execution.
   *
   * Use cases: Role reuse; Existing role usage; Permission management; Role reference
   *
   * AWS: IAM role ARN for Bedrock AgentCore Runtime execution permissions
   *
   * Validation: Must be valid IAM role ARN if provided; used instead of creating new role
   **/
  readonly roleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of IAM policies for runtime role permissions enabling custom service access. Defines additional IAM policies to attach to the agent runtime execution role for AWS service access.
   *
   * Use cases: IAM permissions; Policy attachment; Service access; Permission management
   *
   * AWS: IAM policies for Bedrock AgentCore Runtime execution role permissions
   *
   * Validation: Must be array of valid PolicyProperty if provided; attached to runtime execution role
   **/
  readonly policies?: PolicyProperty[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional runtime endpoint configuration for agent runtime API access enabling runtime invocation. Defines the endpoint configuration for accessing and invoking the agent runtime through the Bedrock AgentCore API.
   *
   * Use cases: Runtime invocation; API access; Endpoint configuration; Agent access
   *
   * AWS: Bedrock AgentCore Runtime endpoint for agent runtime API access and invocation
   *
   * Validation: Must be valid RuntimeEndpointProperty if provided; enables runtime API access
   **/
  readonly runtimeEndpoint?: RuntimeEndpointProperty;
}

/**
 * Q-ENHANCED-INTERFACE
 * L3 construct properties for Bedrock AgentCore Runtime deployment extending base MDAA construct properties. Combines runtime configuration with MDAA infrastructure properties for integrated deployment.
 *
 * Use cases: Construct configuration; MDAA integration; Infrastructure deployment; Runtime deployment
 *
 * AWS: MDAA L3 construct properties for Bedrock AgentCore Runtime deployment
 *
 * Validation: Must include valid BedrockAgentcoreRuntimeProps and MdaaL3ConstructProps
 */
export interface BedrockAgentcoreRuntimeL3ConstructProps extends MdaaL3ConstructProps, BedrockAgentcoreRuntimeProps {}

/**
 * Q-ENHANCED-CLASS
 * Bedrock AgentCore Runtime L3 construct for deploying custom agent runtimes with Docker containers. Provides high-level abstraction for creating Bedrock AgentCore Runtimes with container deployment, IAM role management, and endpoint configuration.
 *
 * Use cases: Custom agent runtime deployment; Container-based agents; Agent runtime management; Custom runtime execution
 *
 * AWS: Amazon Bedrock AgentCore Runtime for custom agent runtime deployment and execution
 *
 * Validation: Validates all configuration properties and creates required AWS resources
 */
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

    // Grant Bedrock AgentCore service permission to pull from the ECR repository
    dockerImage.repository.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal('bedrock-agentcore.amazonaws.com')],
        actions: [
          'ecr:GetAuthorizationToken',
          'ecr:BatchCheckLayerAvailability',
          'ecr:GetDownloadUrlForLayer',
          'ecr:BatchGetImage',
        ],
        conditions: {
          StringEquals: {
            'aws:SourceAccount': Stack.of(this).account,
          },
        },
      }),
    );

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

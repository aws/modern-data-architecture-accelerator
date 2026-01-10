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
} from '@aws-mdaa/bedrock-agentcore-runtime-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface BedrockAgentcoreRuntimeConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required name for the Bedrock AgentCore Runtime providing unique identification within the service. Enables runtime organization and management for custom agent runtime deployment and execution with Docker containers.
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

export class BedrockAgentcoreRuntimeConfigParser extends MdaaAppConfigParser<BedrockAgentcoreRuntimeConfigContents> {
  public readonly agentRuntimeName: string;
  public readonly description?: string;
  public readonly agentRuntimeArtifact: AgentRuntimeArtifactProperty;
  public readonly environmentVariables?: { [key: string]: string };
  public readonly networkConfiguration: NetworkConfigurationProperty;
  public readonly lifecycleConfiguration?: LifecycleConfigurationProperty;
  public readonly authorizerConfiguration?: AuthorizerConfigurationProperty;
  public readonly requestHeaderConfiguration?: RequestHeaderConfigurationProperty;
  public readonly protocolConfiguration?: Record<string, unknown>;
  public readonly roleArn?: string;
  public readonly policies?: PolicyProperty[];
  public readonly runtimeEndpoint?: RuntimeEndpointProperty;

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
    this.roleArn = this.configContents.roleArn;
    this.policies = this.configContents.policies;
    this.runtimeEndpoint = this.configContents.runtimeEndpoint;
  }
}

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

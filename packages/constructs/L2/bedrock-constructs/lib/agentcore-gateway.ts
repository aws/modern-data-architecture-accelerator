/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaResourceType } from '@aws-mdaa/naming';
import { CfnGateway, CfnGatewayProps } from 'aws-cdk-lib/aws-bedrockagentcore';
import { Construct } from 'constructs';
import {
  buildInterceptorConfigurations,
  buildProtocolConfiguration,
  GatewayExceptionLevel,
  McpProtocolConfigurationProperty,
  InterceptorConfigurationsProperty,
  MAX_GATEWAY_NAME_LENGTH,
  sanitizeGatewayName,
  validateDescription,
  validateExceptionLevel,
  validateInterceptorConfigurations,
} from './agentcore-gateway-utils';

export {
  GatewayExceptionLevel,
  McpProtocolConfigurationProperty,
  InterceptorConfigurationsProperty,
  MAX_GATEWAY_NAME_LENGTH,
  sanitizeGatewayName,
  validateDescription,
  validateExceptionLevel,
  validateInterceptorConfigurations,
  buildProtocolConfiguration,
  buildInterceptorConfigurations,
} from './agentcore-gateway-utils';

/**
 * Authorizer types MDAA allows for a gateway. `NONE` (unauthenticated) and `AUTHENTICATE_ONLY`
 * (no per-caller authorization) are rejected as a compliance invariant.
 */
export const ALLOWED_GATEWAY_AUTHORIZER_TYPES = ['CUSTOM_JWT', 'AWS_IAM'];

/**
 * Properties for a compliant Bedrock AgentCore Gateway. Dependencies (role, KMS CMK, interceptor
 * Lambdas) are supplied as ARNs / pre-built configs; this construct creates none of them.
 */
export interface MdaaAgentcoreGatewayProps extends MdaaConstructProps {
  /**
   * Logical gateway name. MDAA-named and sanitized to the gateway name pattern.
   */
  readonly gatewayName: string;
  /**
   * ARN of the gateway execution role.
   */
  readonly roleArn: string;
  /**
   * ARN of the customer-managed KMS CMK used to encrypt the gateway. Required; empty is rejected.
   */
  readonly kmsKeyArn: string;
  /**
   * Inbound authorization type. Must be `CUSTOM_JWT` or `AWS_IAM`
   * (see {@link ALLOWED_GATEWAY_AUTHORIZER_TYPES}).
   */
  readonly authorizerType: string;
  /**
   * Pre-built authorizer configuration for `CUSTOM_JWT`; omit for `AWS_IAM`.
   */
  readonly authorizerConfiguration?: CfnGateway.AuthorizerConfigurationProperty;
  /**
   * MCP protocol configuration. When omitted, the gateway applies the service default.
   * `protocolType` is always `MCP` (set by the construct).
   */
  readonly protocolConfiguration?: McpProtocolConfigurationProperty;
  /**
   * Description of the gateway. When set, must be 1-200 characters.
   */
  readonly description?: string;
  /**
   * Exception level. Only `DEBUG` is settable; omit to leave the secure default (INFO). `DEBUG` may
   * expose sensitive internal error/request detail, so it is for troubleshooting only.
   */
  readonly exceptionLevel?: GatewayExceptionLevel;
  /**
   * Interceptors referencing their deployed Lambdas by ARN. At most one REQUEST and one RESPONSE.
   */
  readonly interceptors?: InterceptorConfigurationsProperty[];
}

/**
 * Reusable CDK construct for a compliant Bedrock AgentCore Gateway (MCP server). Wraps the L1
 * `CfnGateway`, enforcing MDAA's compliance invariants (customer-managed CMK, `CUSTOM_JWT`/`AWS_IAM`
 * authorizer, `MCP` protocol, MDAA-named, validated description/search type/interceptors). The role,
 * KMS key, and interceptor Lambdas are not created here; the caller supplies their ARNs / configs.
 */
export class MdaaAgentcoreGateway extends CfnGateway {
  /** Builds the L1 props, applying the compliance overrides and validating inputs. */
  private static setProps(props: MdaaAgentcoreGatewayProps): CfnGatewayProps {
    if (!props.kmsKeyArn) {
      // Compliance invariant: a gateway is never left on an AWS-managed key.
      throw new Error('kmsKeyArn is required: the gateway must always be encrypted with a customer-managed KMS CMK.');
    }
    if (!ALLOWED_GATEWAY_AUTHORIZER_TYPES.includes(props.authorizerType)) {
      throw new Error(
        `authorizerType must be one of ${ALLOWED_GATEWAY_AUTHORIZER_TYPES.join(', ')}; received "${props.authorizerType}". ` +
          'MDAA does not permit NONE (unauthenticated) or AUTHENTICATE_ONLY (no per-caller authorization).',
      );
    }
    validateDescription(props.description);
    validateInterceptorConfigurations(props.interceptors);

    const exceptionLevel = validateExceptionLevel(props.exceptionLevel);

    const name = sanitizeGatewayName(
      props.naming
        .withResourceType(MdaaResourceType.BEDROCK_AGENTCORE_GATEWAY)
        .resourceName(props.gatewayName, MAX_GATEWAY_NAME_LENGTH),
    );

    return {
      name,
      authorizerType: props.authorizerType,
      authorizerConfiguration: props.authorizerConfiguration,
      protocolType: 'MCP',
      protocolConfiguration: buildProtocolConfiguration(props.protocolConfiguration),
      roleArn: props.roleArn,
      kmsKeyArn: props.kmsKeyArn,
      description: props.description,
      exceptionLevel,
      interceptorConfigurations: buildInterceptorConfigurations(props.interceptors),
    };
  }

  constructor(scope: Construct, id: string, props: MdaaAgentcoreGatewayProps) {
    super(scope, id, MdaaAgentcoreGateway.setProps(props));

    // Publish the gateway's own attributes (arn / id / url); role and key ARNs are published by L3.
    const outputs: { name: string; value: string }[] = [
      { name: 'arn', value: this.attrGatewayArn },
      { name: 'id', value: this.attrGatewayIdentifier },
      { name: 'url', value: this.attrGatewayUrl },
    ];

    outputs.forEach(output => {
      new MdaaParamAndOutput(this, {
        resourceType: 'gateway',
        resourceId: props.gatewayName,
        name: output.name,
        value: output.value,
        ...props,
      });
    });
  }
}

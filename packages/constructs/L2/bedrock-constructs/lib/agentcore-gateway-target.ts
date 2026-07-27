/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// MdaaParamAndOutput is instantiated for its side effect (publishing SSM params) and the result is
// intentionally not assigned; //NOSONAR silences the "object created to be dropped" finding, matching
// the repo convention for this import across MDAA constructs (including the sibling gateway L2).
import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { Stack } from 'aws-cdk-lib';
import { CfnGatewayTarget, CfnGatewayTargetProps } from 'aws-cdk-lib/aws-bedrockagentcore';
import { Construct } from 'constructs';
import { validateDescription } from './agentcore-gateway-utils';
import {
  buildLambdaToolSchema,
  deriveGatewayTargetName,
  GatewayTargetProps,
  resolveTargetCredentialProviderType,
  validateTargetConfiguration,
} from './agentcore-gateway-target-utils';

export {
  GatewayTargetProps,
  GatewayTargetConfigurationProperty,
  GatewayTargetLambdaProperty,
  GatewayTargetOpenApiProperty,
  GatewayTargetSmithyProperty,
  GatewayTargetMcpServerProperty,
  GatewayTargetApiGatewayProperty,
  GatewayTargetToolSchemaProperty,
  GatewayTargetToolDefinitionProperty,
  GatewayTargetSchemaDefinitionProperty,
  GatewayTargetS3Property,
  GatewayTargetCredentialProperty,
  GatewayTargetCredentialProviderType,
  DEFAULT_CREDENTIAL_PROVIDER_TYPE,
  MAX_TOOL_SCHEMA_DEPTH,
  validateTargetConfiguration,
  validateLambdaToolSource,
  resolveTargetCredentialProviderType,
  buildLambdaToolSchema,
  buildSchemaDefinition,
  deriveGatewayTargetName,
} from './agentcore-gateway-target-utils';

/**
 * Properties for a compliant Bedrock AgentCore Gateway Target. The target's gateway is supplied
 * here by identifier (the caller — the L3 orchestration construct — reads it from the gateway
 * object and owns the explicit CloudFormation dependency and the `lambda:InvokeFunction` grant on
 * the gateway role). This construct enforces the target-resource compliance invariants on top of
 * the L1 `CfnGatewayTarget`.
 */
export interface MdaaAgentcoreGatewayTargetProps extends MdaaConstructProps {
  /**
   * Logical target name (the key in the parent gateway's `targets` map). MDAA-named (via `naming`)
   * and sanitized to the gateway-target name pattern (`^([0-9a-zA-Z][-]?){1,100}$`).
   */
  readonly targetName: string;
  /**
   * The target's configuration (tool source + optional credential provider).
   */
  readonly targetConfig: GatewayTargetProps;
  /**
   * Identifier of the parent gateway this target is registered against (read from the gateway's
   * `attrGatewayIdentifier` by the caller).
   */
  readonly gatewayIdentifier: string;
}

/**
 * Reusable CDK construct for a compliant Bedrock AgentCore Gateway Target (a tool registered
 * against a gateway). Wraps the L1 `CfnGatewayTarget` and enforces MDAA's target-resource
 * compliance invariants:
 * - the name is MDAA-named and sanitized to the gateway-target name pattern;
 * - `targetConfiguration` sets exactly one target type, and that type is one MDAA currently
 *   supports (`lambda`) — others are declared but rejected as not yet supported at synth;
 * - the Lambda tool source is validated (a `lambdaArn` and a `toolSchema` with exactly one of
 *   inline / S3) at synth;
 * - the credential provider defaults to and is currently restricted to `GATEWAY_IAM_ROLE` — an
 *   unsupported value is rejected.
 *
 * The gateway, its execution role, and the `lambda:InvokeFunction` grant are NOT owned here — the
 * caller (the L3 orchestration construct) creates / references them, passes the gateway identifier,
 * and wires the explicit dependency and grant.
 */
export class MdaaAgentcoreGatewayTarget extends CfnGatewayTarget {
  /** Builds the L1 props, applying the compliance overrides and validating inputs. */
  private static setProps(scope: Construct, props: MdaaAgentcoreGatewayTargetProps): CfnGatewayTargetProps {
    const { targetName, targetConfig, gatewayIdentifier } = props;

    // Fail fast: exactly one supported target type (a Lambda tool source with a lambdaArn and a
    // toolSchema of exactly one of inline/s3), and a supported credential provider (GATEWAY_IAM_ROLE).
    const lambda = validateTargetConfiguration(targetName, targetConfig);
    validateDescription(targetConfig.description, `Gateway target "${targetName}"`);
    const credentialProviderType = resolveTargetCredentialProviderType(targetName, targetConfig);

    const name = deriveGatewayTargetName(props.naming, targetName);

    return {
      gatewayIdentifier,
      name,
      description: targetConfig.description,
      targetConfiguration: {
        mcp: {
          lambda: {
            lambdaArn: lambda.lambdaArn,
            // Default an S3 tool-schema bucket owner to the deploying account here (the compliance
            // boundary), so the confused-deputy protection is enforced regardless of the consumer.
            toolSchema: buildLambdaToolSchema(lambda.toolSchema, Stack.of(scope).account),
          },
        },
      },
      // GATEWAY_IAM_ROLE carries no credential sub-object — the gateway uses its own execution role.
      credentialProviderConfigurations: [{ credentialProviderType }],
    };
  }

  constructor(scope: Construct, id: string, props: MdaaAgentcoreGatewayTargetProps) {
    super(scope, id, MdaaAgentcoreGatewayTarget.setProps(scope, props));

    // Publish the target's own attributes. The target's ARN is read from the `GatewayArn`
    // attribute, which the AWS::BedrockAgentCore::GatewayTarget CloudFormation reference documents
    // as "the ARN of the gateway target" (the resource has no separate TargetArn attribute).
    const outputs: { name: string; value: string }[] = [
      { name: 'arn', value: this.attrGatewayArn },
      { name: 'id', value: this.attrTargetId },
    ];

    outputs.forEach(output => {
      new MdaaParamAndOutput(this, {
        resourceType: 'gateway-target',
        resourceId: props.targetName,
        name: output.name,
        value: output.value,
        ...props,
      });
    });
  }
}

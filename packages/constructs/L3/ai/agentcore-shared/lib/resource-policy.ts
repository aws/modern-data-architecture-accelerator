/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CfnResource } from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface CreateAgentCoreResourcePolicyProps {
  readonly resourceArn: string;
  readonly vpcId: string;
  readonly actions?: string[];
}

/**
 * Default AgentCore Runtime invoke actions, shared by the VPC-only resource
 * policy and the VPC endpoint policy so both network-control layers stay in sync.
 *
 * The wildcard covers all five invoke actions (InvokeAgentRuntime,
 * InvokeAgentRuntimeCommand, InvokeAgentRuntimeForUser, and the two
 * WebSocket-stream variants) per the AgentCore security guidance — explicit
 * two-action lists would leave the streaming invocations ungoverned.
 */
export const DEFAULT_ACTIONS = ['bedrock-agentcore:InvokeAgentRuntime*'];

/**
 * Default AgentCore Gateway invoke action, used to scope the Gateway interface VPC endpoint policy.
 *
 * The Gateway endpoint (`bedrock-agentcore.gateway`) carries only gateway data-plane traffic — a
 * session invoking its MCP tools. Management calls go to the separate `bedrock-agentcore-control`
 * service, so a single `InvokeGateway` action fully scopes the endpoint without denying any legitimate
 * traffic. Unlike {@link DEFAULT_ACTIONS} this needs no wildcard: `InvokeGateway` is the sole data-plane
 * action and was e2e-confirmed as the precise governing action (allow → gateway tools load, explicit
 * deny → the harness's MCP client fails to start). Kept alongside {@link DEFAULT_ACTIONS} so both
 * AgentCore endpoint policies (Runtime data plane, Gateway data plane) live in one place and stay in sync.
 */
export const DEFAULT_GATEWAY_ACTIONS = ['bedrock-agentcore:InvokeGateway'];

/**
 * Creates a resource-based policy on an AgentCore resource restricting
 * invocations to VPC-only traffic. Uses the native
 * `AWS::BedrockAgentCore::ResourcePolicy` CloudFormation resource so the
 * policy lifecycle is managed by CloudFormation.
 *
 * The policy pairs the Allow with two explicit Deny statements, per the
 * AgentCore security guidance. The Allow alone is sufficient only for
 * OAuth/JWT callers (who have no IAM identity policy and depend entirely on
 * this grant); a same-account IAM (SigV4) caller is authorized by its own
 * identity policy under IAM union semantics, so only an explicit Deny can
 * restrict it:
 *
 * - DenyWrongVpc: fires when the request carries an aws:SourceVpc that is not
 *   the configured VPC (caller came through a VPC endpoint in another VPC).
 * - DenyNoVpc: fires when the request has no aws:SourceVpc at all (caller did
 *   not traverse any VPC endpoint — e.g., over the public endpoint).
 *
 * Both Denies carry BoolIfExists aws:ViaAWSService=false so AWS services
 * calling on the customer's behalf (whose requests do not traverse the
 * customer's VPC endpoint) are not blocked. BoolIfExists rather than Bool
 * because OAuth callers lack the key entirely and plain Bool would not
 * evaluate.
 *
 * Works for any AgentCore resource type that supports the resource policy
 * (Runtime, Gateway).
 */
export function createAgentCoreResourcePolicy(
  scope: Construct,
  id: string,
  props: CreateAgentCoreResourcePolicyProps,
): CfnResource {
  const actions = props.actions ?? DEFAULT_ACTIONS;

  const policyDocument = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'AllowVpcOnly',
        Effect: 'Allow',
        Principal: '*',
        Action: actions,
        Resource: props.resourceArn,
        Condition: {
          StringEquals: {
            'aws:SourceVpc': props.vpcId,
          },
        },
      },
      {
        Sid: 'DenyWrongVpc',
        Effect: 'Deny',
        Principal: '*',
        Action: actions,
        Resource: props.resourceArn,
        Condition: {
          StringNotEqualsIfExists: {
            'aws:SourceVpc': props.vpcId,
          },
          Null: {
            'aws:SourceVpc': 'false',
          },
          BoolIfExists: {
            'aws:ViaAWSService': 'false',
          },
        },
      },
      {
        Sid: 'DenyNoVpc',
        Effect: 'Deny',
        Principal: '*',
        Action: actions,
        Resource: props.resourceArn,
        Condition: {
          Null: {
            'aws:SourceVpc': 'true',
          },
          BoolIfExists: {
            'aws:ViaAWSService': 'false',
          },
        },
      },
    ],
  };

  return new CfnResource(scope, id, {
    type: 'AWS::BedrockAgentCore::ResourcePolicy',
    properties: {
      ResourceArn: props.resourceArn,
      Policy: JSON.stringify(policyDocument),
    },
  });
}

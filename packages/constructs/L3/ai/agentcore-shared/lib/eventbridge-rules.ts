/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { CloudTrailAlertRuleProps, createCloudTrailAlertRules, MdaaRule } from '@aws-mdaa/eventbridge-constructs';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';

/**
 * CloudTrail `eventSource` values under which AgentCore API calls are logged.
 *
 * AgentCore has two endpoints (control plane for lifecycle APIs, data plane for
 * invocation) but CloudTrail records BOTH under `bedrock-agentcore.amazonaws.com` -
 * verified against delivered logs, where `CreateAgentRuntime` and `InvokeAgentRuntime`
 * carry that same value. The `-control` variant is a forward-compatible fallback should
 * the service ever split them; an extra value in an OR list cannot narrow matching.
 */
export const AGENTCORE_CLOUDTRAIL_EVENT_SOURCES = [
  'bedrock-agentcore.amazonaws.com',
  'bedrock-agentcore-control.amazonaws.com',
];

/**
 * Top-level EventBridge `source` values, derived from the `eventSource` by swapping the
 * `.amazonaws.com` suffix for an `aws.` prefix. Same `-control` fallback rationale as
 * {@link AGENTCORE_CLOUDTRAIL_EVENT_SOURCES}.
 */
export const AGENTCORE_CLOUDTRAIL_SOURCES = ['aws.bedrock-agentcore', 'aws.bedrock-agentcore-control'];

/**
 * `requestParameters` field carrying a Runtime's identity on the control-plane lifecycle
 * APIs (verified against delivered CloudTrail logs and the request shapes in
 * `@aws-sdk/client-bedrock-agentcore-control`). Not sufficient alone - see
 * {@link CreateAgentCoreEventBridgeRulesProps.resourceArns}.
 */
export const AGENTCORE_RUNTIME_ID_REQUEST_PARAMETER = 'agentRuntimeId';

/** @see AGENTCORE_RUNTIME_ID_REQUEST_PARAMETER */
export const AGENTCORE_RUNTIME_ARN_REQUEST_PARAMETER = 'agentRuntimeArn';

/** Leading text of every AgentCore alert notification and default rule description. */
const AGENTCORE_ALERT_SUBJECT = 'AgentCore security event';

/** Config path these rules are exposed under, used in validation messages. */
const AGENTCORE_RULES_CONFIG_PATH = 'eventBridgeAlerts.rules';

/**
 * Configuration for a single AgentCore EventBridge alerting rule. AgentCore adds no
 * fields of its own, so this is an alias rather than a re-declaration - the two cannot
 * drift.
 */
export type AgentCoreEventBridgeRuleProps = CloudTrailAlertRuleProps;

export interface CreateAgentCoreEventBridgeRulesProps extends MdaaConstructProps {
  /** Logical name of the AgentCore resource the rules monitor (used in rule naming). */
  readonly resourceName: string;
  /**
   * The rules to create, keyed by a short name. The key is part of the rule's
   * resource name, so it should be stable across deployments.
   */
  readonly rules: { [name: string]: AgentCoreEventBridgeRuleProps };
  /**
   * SNS topic notified when any rule matches. For an *imported* topic the owner must
   * independently grant `events.amazonaws.com` publish (and key use, if CMK-encrypted);
   * the Runtime L3 warns about this.
   */
  readonly notificationTopic: ITopic;
  /**
   * Map of CloudTrail `requestParameters` field name to the value identifying this
   * resource, `$or`-combined. A set rather than one field because the field differs per
   * API (the Runtime lifecycle APIs take `agentRuntimeId`). Not enough on its own -
   * callers must also pass {@link resourceArns}.
   */
  readonly resourceRequestParameters: { [parameterName: string]: string };
  /**
   * ARNs identifying this resource in the CloudTrail `resources` array. Pass every form
   * the service may record (e.g. the runtime ARN and its endpoint ARN).
   *
   * Required, unlike in the generic L2 builder: some AgentCore APIs record a null
   * `requestParameters` and identify the resource only here, so omitting it yields a
   * rule that matches nothing. `InvokeAgentRuntime` is the confirmed case; the
   * requirement covers every AgentCore type because ARN scoping is safe regardless.
   */
  readonly resourceArns: string[];
}

/** Result of {@link createAgentCoreEventBridgeRules}. */
export interface AgentCoreEventBridgeRulesResult {
  /** The created rules, keyed by the same names supplied in the props. */
  readonly rules: { [name: string]: MdaaRule };
}

/**
 * Creates EventBridge rules that alert on AgentCore CloudTrail events, notifying an SNS
 * topic (and optionally a customer-supplied remediation Lambda).
 *
 * The rule wiring is not AgentCore-specific and lives in
 * {@link createCloudTrailAlertRules}. This adds only the AgentCore parts: the CloudTrail
 * sources, the notification subject, and the `resourceArns` requirement. Reusable across
 * Runtime, Gateway, and Memory - only `eventNames` and the identity field names differ.
 *
 * **Prerequisite:** a CloudTrail trail logging the relevant events - management events
 * are on by default, data events (invocation) are not.
 *
 * @param scope - Construct scope the rules are created under
 * @param id - Construct id of the container holding the rules
 * @param props - Rules, resource scoping, and notification target
 * @returns The created rules, keyed by the names supplied in `props.rules`
 */
export function createAgentCoreEventBridgeRules(
  scope: Construct,
  id: string,
  props: CreateAgentCoreEventBridgeRulesProps,
): AgentCoreEventBridgeRulesResult {
  // Stricter than the generic builder's "at least one scoping form", and checked here so
  // the message names the AgentCore reason. Confirmed for InvokeAgentRuntime against
  // delivered logs; not verified for Gateway/Memory, but required of every caller because
  // ARN scoping is safe regardless.
  if (props.resourceArns.length === 0) {
    throw new Error(
      'Internal error: resourceArns must contain at least one ARN. Some AgentCore APIs record a null ' +
        'requestParameters and identify the resource only in detail.resources[].ARN (confirmed for ' +
        'InvokeAgentRuntime), so scoping on requestParameters alone produces rules that never match those calls.',
    );
  }

  return createCloudTrailAlertRules(scope, id, {
    resourceName: props.resourceName,
    naming: props.naming,
    rules: props.rules,
    sources: AGENTCORE_CLOUDTRAIL_SOURCES,
    eventSources: AGENTCORE_CLOUDTRAIL_EVENT_SOURCES,
    notificationTopic: props.notificationTopic,
    resourceRequestParameters: props.resourceRequestParameters,
    resourceArns: props.resourceArns,
    alertSubject: AGENTCORE_ALERT_SUBJECT,
    rulesConfigPath: AGENTCORE_RULES_CONFIG_PATH,
  });
}

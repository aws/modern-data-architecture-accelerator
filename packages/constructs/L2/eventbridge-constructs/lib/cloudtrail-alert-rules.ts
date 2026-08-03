/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaNagSuppressions } from '@aws-mdaa/construct';
import { EventField, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { LambdaFunction, SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { Function as LambdaFn } from 'aws-cdk-lib/aws-lambda';
import { ITopic } from 'aws-cdk-lib/aws-sns';
import { Construct } from 'constructs';
import { MdaaRule } from './rule';

/**
 * CloudTrail `detail-type` for API-call events on the default event bus.
 *
 * These only reach the bus if a trail is logging the relevant events: management events
 * are on by default, data events are OFF and must be enabled explicitly. Without one,
 * the rule never fires.
 */
export const CLOUDTRAIL_API_CALL_DETAIL_TYPE = 'AWS API Call via CloudTrail';

/**
 * The `detail.resources[].ARN` field - for some services the ONLY place an event
 * carries the identity of the resource it acted on, so scoping on `requestParameters`
 * alone silently matches nothing for those APIs.
 *
 * EventBridge matches a field inside an array of objects with the same nested syntax as
 * a plain object (`{ resources: { ARN: [...] } }`), confirmed with
 * `events:TestEventPattern`.
 */
export const CLOUDTRAIL_RESOURCES_ARN_FIELD = 'resources';

/** Configuration for a single CloudTrail alerting rule. */
export interface CloudTrailAlertRuleProps {
  /**
   * Human-readable description of what the rule detects. Surfaced in the
   * EventBridge console and in the notification message.
   */
  readonly description?: string;
  /**
   * CloudTrail `errorCode` values to match, any one of which triggers the rule.
   *
   * These are CloudTrail codes, NOT SDK exception names: an IAM denial returns
   * `AccessDeniedException` to the caller but CloudTrail typically records plain
   * `AccessDenied`. Passed through verbatim.
   */
  readonly errorCodes?: string[];
  /**
   * CloudTrail `eventName` values (API names) to match (e.g. `UpdateAgentRuntime`).
   * Matching any one of them triggers the rule.
   */
  readonly eventNames?: string[];
  /**
   * ARN of an existing, customer-supplied Lambda function to invoke in addition to
   * the SNS notification, for automated remediation. This helper does not create the
   * function: remediation is destructive and site-specific.
   */
  readonly targetLambdaArn?: string;
}

/** Properties for {@link createCloudTrailAlertRules}. */
export interface CreateCloudTrailAlertRulesProps extends MdaaConstructProps {
  /** Logical name of the resource the rules monitor (used in rule naming and in the notification). */
  readonly resourceName: string;
  /**
   * The rules to create, keyed by a short name. The key is part of the rule's
   * resource name, so it should be stable across deployments.
   */
  readonly rules: { [name: string]: CloudTrailAlertRuleProps };
  /**
   * Top-level EventBridge `source` values, e.g. `aws.bedrock-agentcore`. Must be
   * non-empty, or the rules would match every service in the account.
   */
  readonly sources: string[];
  /**
   * CloudTrail `eventSource` values, e.g. `bedrock-agentcore.amazonaws.com`, matched as
   * `detail.eventSource`. Non-empty for the same reason as {@link sources}. The list is
   * an OR, so a value that never appears is harmless.
   */
  readonly eventSources: string[];
  /**
   * SNS topic notified when any rule matches - the default target for every rule.
   *
   * For an *imported* topic CDK cannot attach a resource policy, so its owner must
   * independently allow `events.amazonaws.com` to `sns:Publish` (and to use the key, if
   * CMK-encrypted). Callers should warn about this.
   */
  readonly notificationTopic: ITopic;
  /**
   * Map of CloudTrail `requestParameters` field name to the value identifying this
   * resource, `$or`-combined with each other and with {@link resourceArns}.
   *
   * A set rather than one field because the field carrying the identity differs per
   * API, and naming an absent field matches nothing. Not sufficient alone - see
   * {@link CLOUDTRAIL_RESOURCES_ARN_FIELD}.
   */
  readonly resourceRequestParameters?: { [parameterName: string]: string };
  /**
   * ARNs identifying this resource in the CloudTrail `resources` array. Pass every form
   * the service may record (e.g. a resource ARN and its child endpoint ARN).
   *
   * At least one of this and {@link resourceRequestParameters} must be non-empty, or the
   * rules would match every resource of that service in the account.
   */
  readonly resourceArns?: string[];
  /**
   * Leading text of the notification message and each rule's default description, e.g.
   * `AgentCore security event`. Identifies which subsystem an alert came from.
   */
  readonly alertSubject: string;
  /**
   * Config path this feature is exposed under (e.g. `eventBridgeAlerts.rules`), used in
   * validation messages so they name the key the user actually set.
   *
   * @default 'rules'
   */
  readonly rulesConfigPath?: string;
}

/** Result of {@link createCloudTrailAlertRules}. */
export interface CloudTrailAlertRulesResult {
  /** The created rules, keyed by the same names supplied in the props. */
  readonly rules: { [name: string]: MdaaRule };
}

/**
 * Builds the SNS notification via an EventBridge input transformer, which keeps the
 * message readable in an email or chat client. EventBridge omits paths absent from a
 * given event rather than failing delivery, so this is safe across differing
 * control-plane and data-plane event shapes.
 */
function buildNotificationMessage(
  alertSubject: string,
  resourceName: string,
  ruleName: string,
  description?: string,
): RuleTargetInput {
  // EventField.fromPath renders as an input-transformer variable, so these become
  // InputPathsMap entries rather than literal text.
  return RuleTargetInput.fromMultilineText(
    [
      `${alertSubject}: ${description ?? ruleName}`,
      `Resource: ${resourceName}`,
      `Rule: ${ruleName}`,
      `Account: ${EventField.account}`,
      `Region: ${EventField.region}`,
      `Time: ${EventField.time}`,
      `Event: ${EventField.fromPath('$.detail.eventName')}`,
      `Error code: ${EventField.fromPath('$.detail.errorCode')}`,
      `Error message: ${EventField.fromPath('$.detail.errorMessage')}`,
      `Principal: ${EventField.fromPath('$.detail.userIdentity.arn')}`,
      `Source IP: ${EventField.fromPath('$.detail.sourceIPAddress')}`,
    ].join('\n'),
  );
}

/**
 * Rejects prop combinations that would produce alerting which deploys cleanly and
 * either notifies nobody or notifies on everything.
 */
function validateProps(props: CreateCloudTrailAlertRulesProps, ruleNames: string[], rulesConfigPath: string): void {
  if (ruleNames.length === 0) {
    throw new Error(`${rulesConfigPath} must define at least one rule. Omit the block entirely to create none.`);
  }
  if (props.sources.length === 0 || props.eventSources.length === 0) {
    throw new Error(
      'sources and eventSources must each contain at least one value. Without them the rules would match ' +
        'CloudTrail events from every service in the account.',
    );
  }
  if (Object.keys(props.resourceRequestParameters ?? {}).length === 0 && (props.resourceArns ?? []).length === 0) {
    throw new Error(
      'resourceRequestParameters and/or resourceArns must contain at least one entry. Without them the rules ' +
        'would match events for every resource of this service in the account rather than this one.',
    );
  }
}

/**
 * Creates EventBridge rules that alert on a resource's CloudTrail events, notifying an
 * SNS topic (and optionally a customer-supplied remediation Lambda). Service-agnostic:
 * the sources, identity fields, and event names are all props.
 *
 * No raw event-pattern passthrough is offered on purpose - a hand-written pattern that
 * matches nothing deploys cleanly and never fires, which reads as covered.
 *
 * **Prerequisite:** a CloudTrail trail logging the matched events - see
 * {@link CLOUDTRAIL_API_CALL_DETAIL_TYPE}.
 *
 * @param scope - Construct scope the rules are created under
 * @param id - Construct id of the container holding the rules
 * @param props - Sources, resource scoping, rules, and notification target
 * @returns The created rules, keyed by the names supplied in `props.rules`
 */
export function createCloudTrailAlertRules(
  scope: Construct,
  id: string,
  props: CreateCloudTrailAlertRulesProps,
): CloudTrailAlertRulesResult {
  const ruleNames = Object.keys(props.rules);
  const rulesConfigPath = props.rulesConfigPath ?? 'rules';
  validateProps(props, ruleNames, rulesConfigPath);

  const container = new Construct(scope, id);
  const rules: { [name: string]: MdaaRule } = {};

  // Scope every rule to this resource, OR-ing the identity forms together.
  //
  // Both branches matter. The requestParameters field carrying the identity differs
  // per API, and a pattern naming an absent field matches nothing at all - while some
  // APIs carry NO requestParameters and identify the resource solely via
  // detail.resources[].ARN. See CLOUDTRAIL_RESOURCES_ARN_FIELD.
  const resourceArns = props.resourceArns ?? [];
  const resourceScoping: { [key: string]: unknown }[] = [
    ...Object.entries(props.resourceRequestParameters ?? {}).map(([parameterName, value]) => ({
      requestParameters: { [parameterName]: [value] },
    })),
    ...(resourceArns.length > 0 ? [{ [CLOUDTRAIL_RESOURCES_ARN_FIELD]: { ARN: resourceArns } }] : []),
  ];

  for (const ruleName of ruleNames) {
    const ruleConfig = props.rules[ruleName];

    if (!ruleConfig.errorCodes?.length && !ruleConfig.eventNames?.length) {
      throw new Error(
        `${rulesConfigPath}.${ruleName} must set errorCodes and/or eventNames. ` +
          'A rule with neither would match every API call for the resource.',
      );
    }

    // The caller owns every field here except errorCode/eventName. Note that supplying
    // both errorCodes and eventNames ANDs them: the rule then matches only calls to
    // one of those APIs that failed with one of those error codes.
    const detail: { [key: string]: unknown } = {
      eventSource: props.eventSources,
      $or: resourceScoping,
    };
    if (ruleConfig.errorCodes?.length) {
      detail.errorCode = ruleConfig.errorCodes;
    }
    if (ruleConfig.eventNames?.length) {
      detail.eventName = ruleConfig.eventNames;
    }

    // Rule key first so it survives truncation when there is room. Often it makes no
    // difference: MDAA naming truncates from the right, so a typical prefix replaces the
    // whole suffix with the uniqueness hash. Names stay unique either way, but identify a
    // rule by its description or construct path, not its name.
    const qualifiedRuleName = `${ruleName}-${props.resourceName}`;
    const rule = new MdaaRule(container, `Rule-${ruleName}`, {
      naming: props.naming,
      ruleName: qualifiedRuleName,
      description: ruleConfig.description ?? `${props.alertSubject} rule '${ruleName}' for ${props.resourceName}`,
      enabled: true,
      eventPattern: {
        source: props.sources,
        detailType: [CLOUDTRAIL_API_CALL_DETAIL_TYPE],
        detail,
      },
    });

    // authorizeUsingRole grants publish (and CMK use) on a per-rule delivery role scoped
    // to this topic, instead of an unconditioned service-principal grant on the topic and
    // key policies that would authorize every rule in the account. CDK's default cannot
    // be narrowed afterwards - grantPublish deduplicates - and a KMS resource policy
    // cannot carry aws:SourceArn for this path at all, so an identity policy is the only
    // scoped option. It also makes imported topics work, which the grant path could not.
    // https://docs.aws.amazon.com/sns/latest/dg/sns-key-management.html#compatibility-with-aws-services
    rule.addTarget(
      new SnsTopic(props.notificationTopic, {
        message: buildNotificationMessage(props.alertSubject, props.resourceName, ruleName, ruleConfig.description),
        authorizeUsingRole: true,
      }),
    );

    // The delivery role's policy is inline, which NIST/PCI/HIPAA flag.
    const inlinePolicyReason =
      'Role is created by the CDK EventBridge target solely to publish this rule to its notification ' +
      'topic, so a managed policy would be less scoped, not more. Matches the EventBridge target-role ' +
      'suppression in @aws-mdaa/dataops-stepfunction-l3-construct.';
    MdaaNagSuppressions.addCodeResourceSuppressions(
      rule,
      [
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: inlinePolicyReason },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: inlinePolicyReason },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: inlinePolicyReason },
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'kms:GenerateDataKey* is an action family required for SNS envelope encryption, not a resource ' +
            'wildcard - the trailing * is part of the action name and resources stay scoped to this topic ' +
            'and its key. See https://docs.aws.amazon.com/service-authorization/latest/reference/list_awskeymanagementservice.html',
          appliesTo: ['Action::kms:GenerateDataKey*'],
        },
      ],
      true,
    );

    // Optional additional target: a customer-supplied remediation function.
    if (ruleConfig.targetLambdaArn) {
      // sameEnvironment: true is required for CDK to attach the resource-based
      // permission that lets EventBridge invoke the function. Without it, an
      // imported function silently gets no permission and the target never fires.
      const remediationFunction = LambdaFn.fromFunctionAttributes(container, `RemediationFunction-${ruleName}`, {
        functionArn: ruleConfig.targetLambdaArn,
        sameEnvironment: true,
      });
      rule.addTarget(new LambdaFunction(remediationFunction));
    }

    rules[ruleName] = rule;
  }

  return { rules };
}

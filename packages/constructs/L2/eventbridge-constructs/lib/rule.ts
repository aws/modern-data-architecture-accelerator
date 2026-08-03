/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaResourceType } from '@aws-mdaa/naming';
import { EventPattern, IRule, Rule, RuleProps } from 'aws-cdk-lib/aws-events';
import { Construct } from 'constructs';

/** Maximum length of an EventBridge rule name. */
const MAX_RULE_NAME_LENGTH = 64;

export interface MdaaRuleProps extends MdaaConstructProps {
  /**
   * Short, stable name for the rule. The MDAA naming convention prefixes this with
   * `<org>-<env>-<domain>-<module>-` and truncates to the 64-character rule-name limit,
   * so pass the unprefixed name only.
   *
   * Note that with a typical prefix the entire suffix may be replaced by the
   * uniqueness hash, in which case this name does not appear in the deployed name at
   * all. Names stay unique and stable either way (the hash covers the full
   * pre-truncation name), but operators should identify a rule by its description
   * rather than by its name.
   */
  readonly ruleName: string;
  /** Human-readable description of what the rule matches. */
  readonly description?: string;
  /** The event pattern the rule matches. Required unless `schedule` is supplied. */
  readonly eventPattern?: EventPattern;
  /** Schedule expression, for a scheduled rather than event-pattern-driven rule. */
  readonly schedule?: RuleProps['schedule'];
  /** Whether the rule is enabled. @default true */
  readonly enabled?: boolean;
  /** The event bus to associate the rule with. @default the account's default bus */
  readonly eventBus?: RuleProps['eventBus'];
  /**
   * Targets invoked when the rule matches. Targets may also be added after
   * construction via `addTarget`.
   */
  readonly targets?: RuleProps['targets'];
}

/**
 * Interface for IMdaaRule.
 */
export type IMdaaRule = IRule;

/**
 * Construct for a compliant EventBridge Rule.
 *
 * Applies the MDAA naming convention to the rule name and publishes the rule's name
 * and ARN to SSM Parameter Store / CloudFormation outputs for cross-module reference,
 * matching the convention of the other MDAA L2 constructs.
 *
 * Note there is no encryption or logging surface to enforce on a rule itself: an
 * EventBridge rule holds no data at rest. Compliance for what a rule *targets* (an
 * encrypted SNS topic, a Lambda function) lives with those resources.
 */
export class MdaaRule extends Rule implements IMdaaRule {
  private static setProps(props: MdaaRuleProps): RuleProps {
    const ruleNaming = props.naming.withResourceType(MdaaResourceType.EVENTBRIDGE_RULE);
    const overrideProps = {
      ruleName: ruleNaming.resourceName(props.ruleName, MAX_RULE_NAME_LENGTH),
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaRuleProps) {
    super(scope, id, MdaaRule.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'eventbridge-rule',
        resourceId: props.ruleName,
        name: 'name',
        value: this.ruleName,
        ...props,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        resourceType: 'eventbridge-rule',
        resourceId: props.ruleName,
        name: 'arn',
        value: this.ruleArn,
        ...props,
      },
      scope,
    );
  }
}

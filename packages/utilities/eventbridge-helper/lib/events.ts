/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { MdaaSqsDeadLetterQueue } from '@aws-mdaa/sqs-constructs';
import { EventBus, EventPattern, IRuleTarget, Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { Effect, IRole, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { IQueue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';
import { ConfigurationElement } from '@aws-mdaa/config';

export interface NamedS3EventBridgeRuleProps {
  /** @jsii ignore */
  readonly [name: string]: S3EventBridgeRuleProps;
}
export interface S3EventBridgeRuleProps {
  /**
   * Array of S3 bucket names that should trigger the EventBridge rule when object events occur.
   *
   * Use cases: S3 event-driven processing; Bucket-specific triggers; Multi-bucket event routing
   *
   * AWS: S3 bucket names for EventBridge S3 object event pattern matching
   *
   * Validation: Required; must be non-empty array of valid S3 bucket names
   */
  readonly buckets: string[];
  /**
   * Array of S3 object key prefixes that filter which objects trigger the EventBridge rule.
   *
   * Use cases: Prefix-based event filtering; Selective object processing; Path-scoped triggers
   *
   * AWS: S3 object key prefix filters for EventBridge event pattern matching
   *
   * Validation: Optional; each prefix should be a valid S3 key prefix
   */
  readonly prefixes?: string[];
  /**
   * ARN of the custom EventBridge event bus where the rule should be created.
   *
   * Use cases: Custom event bus routing; Cross-account event delivery; Dedicated event bus targeting
   *
   * AWS: EventBridge custom event bus ARN for rule placement
   *
   * Validation: Optional; must be a valid EventBridge event bus ARN if provided; defaults to the default event bus
   */
  readonly eventBusArn?: string;
}

export interface NamedEventBridgeRuleProps {
  /** @jsii ignore */
  readonly [name: string]: EventBridgeRuleProps;
}
export interface EventBridgeRuleProps {
  /**
   * Human-readable description of the EventBridge rule explaining its purpose and trigger conditions.
   *
   * Use cases: Rule documentation; Operational clarity; Rule identification in console
   *
   * AWS: EventBridge rule description displayed in the AWS console
   *
   * Validation: Optional; free-form text
   */
  readonly description?: string;
  /**
   * EventBridge event pattern that defines which events should trigger the rule.
   *
   * Use cases: Event filtering; Source-specific triggers; Detail-based matching; Custom event routing
   *
   * AWS: EventBridge event pattern for rule matching and filtering
   *
   * Validation: Optional; must be a valid EventBridge EventPattern if provided; mutually exclusive with scheduleExpression for some use cases
   */
  readonly eventPattern?: EventPattern;
  /**
   * ARN of the custom EventBridge event bus where the rule should be created.
   *
   * Use cases: Custom event bus routing; Cross-account event delivery; Dedicated event bus targeting
   *
   * AWS: EventBridge custom event bus ARN for rule placement
   *
   * Validation: Optional; must be a valid EventBridge event bus ARN if provided; defaults to the default event bus
   */
  readonly eventBusArn?: string;
  /**
   * Schedule expression for time-based rule triggering using EventBridge cron or rate expressions.
   *
   * Use cases: Scheduled processing; Periodic triggers; Cron-based automation; Rate-based execution
   *
   * AWS: EventBridge schedule expression (cron or rate syntax)
   *
   * Validation: Optional; must be a valid cron() or rate() expression if provided
   */
  readonly scheduleExpression?: string;
  /**
   * Custom input payload that will be provided to the rule target instead of the original event content.
   *
   * Use cases: Custom target input; Event transformation; Static payload injection
   *
   * AWS: EventBridge rule target input transformation
   *
   * Validation: Optional; will be serialized as JSON input to the target
   */
  readonly input?: unknown;
}

export interface EventBridgeProps extends EventBridgeRetryProps {
  /**
   * Collection of named S3 EventBridge rules that trigger processing workflows based on S3 object events.
   *
   * Use cases: S3 event-driven ETL; Object creation triggers; Multi-bucket event routing
   *
   * AWS: EventBridge rules with S3 object event patterns for automated processing
   *
   * Validation: Optional; keys are unique rule names, values must be valid S3EventBridgeRuleProps
   */
  readonly s3EventBridgeRules?: NamedS3EventBridgeRuleProps;
  /**
   * Collection of named general EventBridge rules that trigger processing workflows based on custom event patterns or schedules.
   *
   * Use cases: Custom event-driven processing; Scheduled triggers; Cross-service event routing
   *
   * AWS: EventBridge rules with custom event patterns or schedule expressions
   *
   * Validation: Optional; keys are unique rule names, values must be valid EventBridgeRuleProps
   */
  readonly eventBridgeRules?: NamedEventBridgeRuleProps;
}

export interface EventBridgeRetryProps {
  /**
   * Maximum age in seconds that EventBridge will attempt to deliver an event to the target before discarding it.
   *
   * Use cases: Event delivery timeout; Stale event management; Delivery window control
   *
   * AWS: EventBridge rule target maximum event age configuration
   *
   * Validation: Optional; must be between 60 and 86400 seconds if provided
   */
  readonly maxEventAgeSeconds?: number;
  /**
   * Maximum number of retry attempts EventBridge will make when the target returns an error.
   *
   * Use cases: Retry configuration; Error resilience; Delivery reliability tuning
   *
   * AWS: EventBridge rule target retry attempts configuration
   *
   * Validation: Optional; must be between 0 and 185 if provided
   */
  readonly retryAttempts?: number;
}

export class EventBridgeHelper {
  public static createGlueMonitoringEventRule(
    scope: Construct,
    naming: IMdaaResourceNaming,
    ruleName: string,
    description: string,
    /** Event detail configuration for Glue monitoring event pattern matching and filtering */
    detail: ConfigurationElement,
  ): Rule {
    const eventPattern = {
      /** AWS service source identifier for EventBridge event pattern matching */
      source: ['aws.glue'],
      detail: detail,
    };
    return this.createEventRule(scope, naming, ruleName, { description, eventPattern });
  }

  public static createEventRulePropsFromS3EventRuleProps(
    targetName: string,
    s3EventRuleProps: S3EventBridgeRuleProps,
  ): EventBridgeRuleProps {
    const detail: ConfigurationElement = {
      bucket: {
        name: s3EventRuleProps.buckets,
      },
    };

    if (s3EventRuleProps.prefixes) {
      detail['object'] = {
        key: s3EventRuleProps.prefixes.map(rawPrefix => {
          const prefix = rawPrefix.startsWith('/') ? rawPrefix.substring(1) : rawPrefix;
          return { prefix: prefix };
        }),
      };
    }

    const eventPattern = {
      source: ['aws.s3'],
      detail: detail,
      'detail-type': ['Object Created'],
    };

    return {
      description: `Event Rule for triggering ${targetName} with S3 events`,
      eventPattern: eventPattern,
      eventBusArn: s3EventRuleProps.eventBusArn,
    };
  }

  public static createNamedEventBridgeRuleProps(
    eventBridgeProps: EventBridgeProps,
    targetName: string,
  ): NamedEventBridgeRuleProps {
    const s3EventBridgeRuleProps: NamedEventBridgeRuleProps = Object.fromEntries(
      Object.entries(eventBridgeProps.s3EventBridgeRules || {}).map(entry => {
        const eventRuleName = entry[0];
        const eventBridgeProps = EventBridgeHelper.createEventRulePropsFromS3EventRuleProps(
          `${targetName}-${eventRuleName}`,
          entry[1],
        );
        return [eventRuleName, eventBridgeProps];
      }),
    );

    return {
      ...eventBridgeProps.eventBridgeRules,
      ...s3EventBridgeRuleProps,
    };
  }

  public static createEventBridgeRuleForTarget(
    scope: Construct,
    naming: IMdaaResourceNaming,
    target: IRuleTarget,
    eventRuleName: string,
    eventRuleProps: EventBridgeRuleProps,
  ) {
    const eventRule = EventBridgeHelper.createEventRule(scope, naming, eventRuleName, eventRuleProps);
    eventRule.addTarget(target);
    return eventRule;
  }

  public static createEventRule(
    scope: Construct,
    naming: IMdaaResourceNaming,
    ruleName: string,
    ruleProps: EventBridgeRuleProps,
  ): Rule {
    return new Rule(scope, `event-rule-${ruleName}`, {
      enabled: true,
      description: ruleProps.description,
      ruleName: naming.resourceName(ruleName, 64),
      eventPattern: ruleProps.eventPattern,
      eventBus: ruleProps.eventBusArn
        ? EventBus.fromEventBusArn(scope, `event-rule-${ruleName}-bus`, ruleProps.eventBusArn)
        : undefined,
      schedule: ruleProps.scheduleExpression ? Schedule.expression(ruleProps.scheduleExpression) : undefined,
    });
  }

  public static createDlq(
    scope: Construct,
    naming: IMdaaResourceNaming,
    name: string,
    kmsKey: IKey,
    role?: IRole,
  ): IQueue {
    const dlq = new MdaaSqsDeadLetterQueue(scope, `dlq-${name}`, {
      queueName: `${name}-dlq`,
      encryptionMasterKey: kmsKey,
      naming: naming,
    });
    if (role) {
      const sqsSendMessageStatement = new PolicyStatement({
        sid: 'SendMessage',
        effect: Effect.ALLOW,
        actions: ['sqs:SendMessage'],
        resources: ['*'],
      });
      sqsSendMessageStatement.addPrincipals(role);
      dlq.addToResourcePolicy(sqsSendMessageStatement);
    }
    return dlq;
  }
}

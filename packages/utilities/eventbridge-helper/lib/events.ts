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

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for named S3 EventBridge rules that trigger data processing workflows based on S3 object events. Enables event-driven data pipelines with multiple named rules for different S3 event patterns and processing requirements.
 *
 * Use cases: Event-driven ETL pipelines; S3 object processing workflows; Multi-bucket event handling with different processing logic
 *
 * AWS: Configures Amazon EventBridge rules for S3 event notifications to trigger data processing workflows
 *
 * Validation: Object keys must be valid rule names; values must be valid S3EventBridgeRuleProps configurations
 */
export interface NamedS3EventBridgeRuleProps {
  /** @jsii ignore */
  readonly [name: string]: S3EventBridgeRuleProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for S3 EventBridge rules that define event patterns for S3 object notifications. Enables event-driven data processing by specifying which S3 buckets and object prefixes should trigger EventBridge rules for downstream processing.
 *
 * Use cases: S3 object creation event processing; Prefix-based event filtering; Cross-account S3 event handling
 *
 * AWS: Configures Amazon EventBridge rules for S3 event notifications with bucket and prefix filtering
 *
 * Validation: buckets array must contain valid S3 bucket names; prefixes must be valid S3 object key prefixes; eventBusArn must be valid EventBridge bus ARN
 */
export interface S3EventBridgeRuleProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Array of S3 bucket names that should trigger the EventBridge rule when object events occur. Enables multi-bucket event processing and centralized event handling for distributed data lake architectures.
   *
   * Use cases: Multi-bucket event processing; Data lake event consolidation; Cross-bucket event handling
   *
   * AWS: Amazon S3 bucket names for EventBridge event pattern matching
   *
   * Validation: Must be array of valid S3 bucket names (3-63 characters, lowercase, no underscores)
   **/
  readonly buckets: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of S3 object key prefixes that filter which objects trigger the EventBridge rule. Enables fine-grained event filtering based on object location and naming patterns for targeted data processing workflows.
   *
   * Use cases: Folder-based event filtering; File type-specific processing; Hierarchical data organization event handling
   *
   * AWS: Amazon S3 object key prefixes for EventBridge event pattern filtering
   *
   * Validation: Must be array of valid S3 object key prefixes if provided; prefixes should not start with '/' (automatically handled)
   **/
  readonly prefixes?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional ARN of the custom EventBridge event bus where the rule should be created. If not specified, the default event bus will be used. Enables cross-account event routing and custom event bus architectures.
   *
   * Use cases: Custom event bus routing; Cross-account event processing; Event bus isolation and organization
   *
   * AWS: Amazon EventBridge custom event bus ARN for rule creation and event routing
   *
   * Validation: Must be valid EventBridge event bus ARN format if provided (arn:aws:events:region:account:event-bus/bus-name)
   **/
  readonly eventBusArn?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for named EventBridge rules that define multiple event patterns for triggering data processing workflows. Enables complex event-driven architectures with multiple named rules for different event sources and processing requirements.
 *
 * Use cases: Multi-source event processing; Named event routing patterns; Complex event-driven data pipelines
 *
 * AWS: Configures multiple Amazon EventBridge rules with custom names for diverse event processing scenarios
 *
 * Validation: Object keys must be valid rule names; values must be valid EventBridgeRuleProps configurations
 */
export interface NamedEventBridgeRuleProps {
  /** @jsii ignore */
  readonly [name: string]: EventBridgeRuleProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for EventBridge rules that define event patterns, schedules, and input transformations for triggering data processing workflows. Supports both event-driven and schedule-driven processing with flexible event pattern matching and custom input handling.
 *
 * Use cases: Event-driven data processing; Scheduled workflow triggers; Custom event pattern matching with input transformation
 *
 * AWS: Configures Amazon EventBridge rules with event patterns, schedules, and input transformations for workflow automation
 *
 * Validation: Either eventPattern or scheduleExpression must be provided; eventBusArn must be valid ARN if specified
 */
export interface EventBridgeRuleProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional human-readable description of the EventBridge rule explaining its purpose and trigger conditions. Provides documentation for rule management and helps identify rule functionality in the AWS console.
   *
   * Use cases: Rule documentation; Management clarity; AWS console identification
   *
   * AWS: Amazon EventBridge rule description for management and identification
   *
   * Validation: Must be descriptive text if provided; recommended for rule documentation
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional EventBridge event pattern that defines which events should trigger the rule. Specifies event source, detail type, and detail content matching criteria for precise event filtering and routing to appropriate processing workflows.
   *
   * Use cases: Event source filtering; Detail-based event routing; Multi-service event processing
   *
   * AWS: Amazon EventBridge event pattern for event matching and filtering
   *
   * Validation: Must be valid EventBridge event pattern format if provided; cannot be used with scheduleExpression
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_events.EventPattern.html
   **/
  readonly eventPattern?: EventPattern;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional ARN of the custom EventBridge event bus where the rule should be created. If not specified, the default event bus will be used. Enables cross-account event routing and custom event bus architectures for organized event processing.
   *
   * Use cases: Custom event bus routing; Cross-account event processing; Event bus isolation and organization
   *
   * AWS: Amazon EventBridge custom event bus ARN for rule creation and event routing
   *
   * Validation: Must be valid EventBridge event bus ARN format if provided (arn:aws:events:region:account:event-bus/bus-name)
   **/
  readonly eventBusArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional schedule expression for time-based rule triggering using EventBridge cron or rate expressions. Enables scheduled data processing workflows and periodic batch operations with flexible timing configurations.
   *
   * Use cases: Scheduled ETL jobs; Periodic data processing; Time-based workflow automation
   *
   * AWS: Amazon EventBridge schedule expression for time-based rule triggering
   *
   * Validation: Must be valid EventBridge cron or rate expression if provided; cannot be used with eventPattern
   **/
  readonly scheduleExpression?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom input payload that will be provided to the rule target instead of the original event content. Enables event transformation and custom payload injection for specialized processing requirements.
   *
   * Use cases: Event payload transformation; Custom processing parameters; Static configuration injection
   *
   * AWS: Amazon EventBridge rule target input transformation for custom payload delivery
   *
   * Validation: Must be valid JSON-serializable object if provided; replaces original event content
   *   **/
  readonly input?: unknown;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for EventBridge integration that combines S3 event rules and general event rules with retry configuration. Enables event-driven data processing with both S3-specific and general event handling capabilities including error handling and retry policies.
 *
 * Use cases: Comprehensive event-driven data pipelines; S3 and multi-source event processing; Event handling with retry policies
 *
 * AWS: Configures Amazon EventBridge rules for S3 events and general events with retry and error handling
 *
 * Validation: Inherits retry configuration validation; s3EventBridgeRules and eventBridgeRules must be valid if provided
 */
export interface EventBridgeProps extends EventBridgeRetryProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional collection of named S3 EventBridge rules that trigger processing workflows based on S3 object events. Enables event-driven data processing pipelines that respond to S3 object creation, deletion, and modification events with bucket and prefix filtering.
   *
   * Use cases: S3 object processing workflows; Event-driven ETL pipelines; Multi-bucket event handling
   *
   * AWS: Amazon EventBridge rules for S3 event notifications and data processing triggers
   *
   * Validation: Must be valid NamedS3EventBridgeRuleProps object if provided with valid rule names and configurations
   *   **/
  readonly s3EventBridgeRules?: NamedS3EventBridgeRuleProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional collection of named general EventBridge rules that trigger processing workflows based on various AWS service events and custom events. Enables event-driven architectures beyond S3 events with flexible event pattern matching.
   *
   * Use cases: Multi-service event processing; Custom event handling; Scheduled workflow triggers
   *
   * AWS: Amazon EventBridge rules for general AWS service events and custom event processing
   *
   * Validation: Must be valid NamedEventBridgeRuleProps object if provided with valid rule names and configurations
   *   **/
  readonly eventBridgeRules?: NamedEventBridgeRuleProps;
}

export interface EventBridgeRetryProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Maximum age in seconds that EventBridge will attempt to deliver an event to the target before discarding it. Controls event freshness and prevents processing of stale events in time-sensitive data processing workflows.
   *
   * Use cases: Event freshness control; Time-sensitive processing; Stale event prevention
   *
   * AWS: Amazon EventBridge maximum event age configuration for event delivery time limits
   *
   * Validation: Must be between 60 and 86400 seconds (1 minute to 24 hours); defaults to 86400 if not specified
   **/
  readonly maxEventAgeSeconds?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Maximum number of retry attempts EventBridge will make when the target returns an error. Controls event delivery resilience and helps ensure reliable processing of critical data events with configurable retry behavior.
   *
   * Use cases: Event delivery resilience; Error recovery; Reliable event processing
   *
   * AWS: Amazon EventBridge retry attempt configuration for event delivery reliability
   *
   * Validation: Must be between 0 and 185 attempts; defaults to 185 if not specified
   **/
  readonly retryAttempts?: number;
}

export class EventBridgeHelper {
  public static createGlueMonitoringEventRule(
    scope: Construct,
    naming: IMdaaResourceNaming,
    ruleName: string,
    description: string,
    /**
     * Q-ENHANCED-PROPERTY
     * Required event detail configuration for Glue monitoring event pattern matching and filtering. Defines the specific Glue event details that will trigger the monitoring rule, enabling precise event filtering and targeted monitoring capabilities.
     *
     * Use cases: Glue job monitoring; ETL pipeline tracking; Data processing event filtering; Workflow state monitoring
     *
     * AWS: Amazon EventBridge event pattern detail configuration for Glue service event filtering
     *
     * Validation: Must be valid ConfigurationElement with Glue event detail structure; required for event pattern matching
     */
    detail: ConfigurationElement,
  ): Rule {
    const eventPattern = {
      /**
       * Q-ENHANCED-PROPERTY
       * Required AWS service source identifier for EventBridge event pattern matching. Specifies 'aws.glue' as the event source for Glue service monitoring and enables filtering of Glue-specific events from the event stream.
       *
       * Use cases: Glue service event filtering; AWS service identification; Event source targeting; Service-specific monitoring
       *
       * AWS: Amazon EventBridge event pattern source for AWS Glue service event identification
       *
       * Validation: Must be 'aws.glue' for Glue monitoring; required for service event filtering
       */
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

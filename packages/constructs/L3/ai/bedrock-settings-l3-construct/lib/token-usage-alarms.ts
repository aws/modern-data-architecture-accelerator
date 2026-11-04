/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  addAlarmNotificationWarnings,
  AlarmNotificationProps,
  MdaaAlarm,
  MetricDataQueryProps,
  resolveAlarmNotificationTopic,
  validateAlarmEvaluationRange,
  validateAlarmNameMatchesPattern,
  validateAlarmNotificationTarget,
  validateDatapointsToAlarm,
} from '@aws-mdaa/cloudwatch-constructs';
import { IMdaaResourceNaming, MdaaResourceType } from '@aws-mdaa/naming';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

/** CloudWatch namespace of the `bedrock-runtime` inference metrics. */
export const BEDROCK_RUNTIME_METRIC_NAMESPACE = 'AWS/Bedrock';

/**
 * Name prefix shared by every token-use alarm, after the naming convention.
 *
 * Load-bearing beyond naming: a created notification topic's CloudWatch grants are
 * scoped to `<prefix>-*`, so changing the alarm names without this prefix silently
 * breaks notification delivery.
 */
export const TOKEN_ALARM_NAME_PREFIX = 'token';

/**
 * Most model IDs one model alarm can sum. CloudWatch limits a metric math alarm to 10
 * metrics, and each ID is one metric.
 */
export const MAX_MODEL_IDS_PER_TOKEN_ALARM = 10;

/** Default alarm period, in seconds, for token-use alarms. */
export const DEFAULT_TOKEN_ALARM_PERIOD_SECONDS = 300;

/** Default number of evaluation periods for token-use alarms. */
export const DEFAULT_TOKEN_ALARM_EVALUATION_PERIODS = 1;

const CONFIG_PATH = 'tokenUsageAlarms';

/**
 * Input and output token thresholds. Each threshold set creates one alarm that fires
 * when the token count summed over one alarm period exceeds it.
 *
 * Use cases: token-spend spike detection, runaway-agent detection
 *
 * AWS: CloudWatch alarms on AWS/Bedrock InputTokenCount and OutputTokenCount (Sum)
 *
 * Validation: at least one of inputTokenThreshold or outputTokenThreshold
 */
export interface TokenThresholdsProps {
  /**
   * Alarm when input tokens in one alarm period exceed this value. Omit to skip the
   * input-token alarm.
   *
   * Use cases: detecting oversized prompts or a surge in requests
   *
   * AWS: CloudWatch alarm on InputTokenCount (Sum)
   *
   * Validation: Optional; Number; >= 0
   *
   * @minimum 0
   **/
  readonly inputTokenThreshold?: number;
  /**
   * Alarm when output tokens in one alarm period exceed this value. Omit to skip the
   * output-token alarm.
   *
   * Use cases: detecting runaway generation, output-token spend spikes
   *
   * AWS: CloudWatch alarm on OutputTokenCount (Sum)
   *
   * Validation: Optional; Number; >= 0
   *
   * @minimum 0
   **/
  readonly outputTokenThreshold?: number;
}

/**
 * Token-use alarms for one model, summed across the model IDs listed. Bedrock publishes
 * token metrics per `ModelId` for the whole account, keyed on the model or
 * inference-profile ID exactly as the caller passed it, so the alarms count every
 * caller in the account that uses a listed ID - and none that uses an unlisted one,
 * such as another inference profile for the same model.
 *
 * Use cases: per-model token-spend alerting, covering a base model and its cross-Region
 * inference profiles in one alarm
 *
 * AWS: CloudWatch alarms on AWS/Bedrock InputTokenCount / OutputTokenCount by ModelId
 *
 * Validation: modelIds required (1-10, unique); at least one threshold
 */
export interface ModelTokenAlarmProps extends TokenThresholdsProps {
  /**
   * Model and inference-profile IDs whose token use the alarms sum, exactly as callers
   * pass them, e.g. `amazon.nova-micro-v1:0` and `us.amazon.nova-micro-v1:0`. CloudWatch
   * matches the `ModelId` dimension exactly, so traffic sent under an ID not listed here
   * is not counted.
   *
   * Use cases: covering the base model ID and each inference-profile ID callers use
   *
   * AWS: AWS/Bedrock ModelId metric dimension
   *
   * Validation: Required; String[]; 1-10 unique IDs
   *
   * @minItems 1
   * @maxItems 10
   * @uniqueItems true
   **/
  readonly modelIds: string[];
}

/**
 * Map of a model alarm name to its {@link ModelTokenAlarmProps}. The key names the
 * alarms (`token-<input|output>-model-<key>`).
 */
export interface NamedModelTokenAlarmProps {
  /** @jsii ignore */
  [modelAlarmName: string]: ModelTokenAlarmProps;
}

/**
 * Alarms on Amazon Bedrock model token use in this account and Region, per model and/or
 * in total, notifying one SNS target. Token metrics are account-wide: they count every
 * caller in the account, not only workloads deployed by MDAA. Inference through the
 * OpenAI-compatible `bedrock-mantle` endpoint publishes to a different namespace and is
 * not counted.
 *
 * Use cases: token-spend spike alerting, detecting runaway agents, usage-pattern deviation
 * alarms
 *
 * AWS: CloudWatch alarms on AWS/Bedrock InputTokenCount / OutputTokenCount + SNS notification
 *
 * Validation: requires exactly one notification target and at least one threshold
 */
export type TokenUsageAlarmsProps = TokenUsageAlarmsExistingTopicProps | TokenUsageAlarmsCreatedTopicProps;

/**
 * Token-use alarms notifying an existing SNS topic.
 *
 * Use cases: routing token-use alarms to an existing operations or cost topic
 *
 * AWS: CloudWatch alarms on AWS/Bedrock token metrics publishing to an existing SNS topic
 *
 * Validation: notificationTopicArn required; createNotificationTopic and notificationEmails not allowed
 */
export interface TokenUsageAlarmsExistingTopicProps extends TokenUsageAlarmsCommonProps {
  /**
   * ARN of an existing SNS topic to notify on alarm. Mutually exclusive with
   * `createNotificationTopic`.
   *
   * MDAA cannot verify or modify a topic it did not create: the topic should be
   * encrypted with a customer-managed KMS key, must allow the `cloudwatch.amazonaws.com`
   * service principal to `sns:Publish` (and to use that key), and needs at least one
   * subscriber. MDAA emits a synth-time warning restating this.
   *
   * Use cases: routing alarms to an existing operations or cost topic
   *
   * AWS: SNS topic ARN used as the CloudWatch alarm action
   *
   * Validation: Required; String; valid SNS topic ARN; mutually exclusive with createNotificationTopic
   **/
  readonly notificationTopicArn: string;
}

/**
 * Token-use alarms notifying a module-created SNS topic.
 *
 * Use cases: self-contained token-use alerting without a pre-existing topic
 *
 * AWS: CloudWatch alarms on AWS/Bedrock token metrics publishing to an MDAA-created CMK-encrypted SNS topic
 *
 * Validation: createNotificationTopic: true required; notificationTopicArn not allowed
 */
export interface TokenUsageAlarmsCreatedTopicProps extends TokenUsageAlarmsCommonProps {
  /**
   * Set to true to have MDAA create an SNS topic encrypted with the module's KMS key,
   * grant CloudWatch alarms in this module publish access, and export its ARN to SSM.
   * Mutually exclusive with `notificationTopicArn`.
   *
   * Use cases: self-contained alerting without a pre-existing topic
   *
   * AWS: MDAA-created CMK-encrypted SNS topic
   *
   * Validation: Required; Boolean; must be true; mutually exclusive with notificationTopicArn
   **/
  readonly createNotificationTopic: boolean;
  /**
   * Email addresses subscribed to the module-created notification topic. Each address
   * receives an SNS confirmation request and must confirm before delivery begins.
   * Without a subscriber the created topic discards every notification; MDAA warns at
   * synth in that case.
   *
   * Use cases: operator paging, routing alarms to a distribution list
   *
   * AWS: SNS email subscriptions on the created topic
   *
   * Validation: Optional; String[]; valid email addresses
   **/
  readonly notificationEmails?: string[];
}

/**
 * Alarm selection and evaluation timing shared by both notification targets of
 * {@link TokenUsageAlarmsProps}.
 */
export interface TokenUsageAlarmsCommonProps {
  /**
   * Token-use alarms per model, keyed by a name for the model. Each entry lists every
   * model and inference-profile ID callers use for that model.
   *
   * Use cases: per-model token-spend alerting
   *
   * AWS: CloudWatch alarms on AWS/Bedrock token metrics by ModelId
   *
   * Validation: Optional; NamedModelTokenAlarmProps
   **/
  readonly models?: NamedModelTokenAlarmProps;
  /**
   * Token-use alarms on the account-wide total across all model IDs.
   *
   * Use cases: overall token-spend alerting without enumerating models
   *
   * AWS: CloudWatch alarms on the undimensioned AWS/Bedrock InputTokenCount / OutputTokenCount
   *
   * Validation: Optional; TokenThresholdsProps
   **/
  readonly accountTotal?: TokenThresholdsProps;
  /**
   * Alarm period in seconds. Each period's token count is compared to the threshold.
   *
   * Use cases: matching the alarm window to the token budget's granularity
   *
   * AWS: CloudWatch alarm period
   *
   * Bedrock publishes token metrics at one-minute resolution, so the period is a whole
   * number of minutes.
   *
   * Validation: Optional; Number; multiple of 60; periodSeconds x evaluationPeriods at most
   * 86400 for a period under 3600, at most 604800 otherwise
   * @default 300
   * @TJS-type integer
   * @minimum 60
   * @multipleOf 60
   **/
  readonly periodSeconds?: number;
  /**
   * Number of periods over which token use is compared to the threshold.
   *
   * Use cases: requiring sustained token use before alarming
   *
   * AWS: CloudWatch alarm evaluation periods
   *
   * Validation: Optional; Number; periodSeconds x evaluationPeriods at most 86400 for a
   * period under 3600, at most 604800 otherwise
   * @default 1
   * @TJS-type integer
   * @minimum 1
   **/
  readonly evaluationPeriods?: number;
  /**
   * Number of breaching periods within `evaluationPeriods` required to alarm (an "M of
   * N" alarm).
   *
   * Use cases: ignoring a single burst while catching sustained token use
   *
   * AWS: CloudWatch alarm datapointsToAlarm
   *
   * Validation: Optional; Number; between 1 and evaluationPeriods
   * @default evaluationPeriods
   * @TJS-type integer
   * @minimum 1
   **/
  readonly datapointsToAlarm?: number;
}

/** One token-use alarm to create, derived from the config. */
interface TokenAlarmSpec {
  readonly constructId: string;
  readonly nameSuffix: string;
  readonly metricName: string;
  readonly threshold: number;
  readonly description: string;
  /** Model IDs to sum; absent for the account-wide total. */
  readonly modelIds?: string[];
}

const TOKEN_METRICS = [
  { kind: 'input', metricName: 'InputTokenCount', thresholdKey: 'inputTokenThreshold' },
  { kind: 'output', metricName: 'OutputTokenCount', thresholdKey: 'outputTokenThreshold' },
] as const;

function hasThreshold(thresholds: TokenThresholdsProps): boolean {
  return thresholds.inputTokenThreshold !== undefined || thresholds.outputTokenThreshold !== undefined;
}

function validateThresholds(location: string, thresholds: TokenThresholdsProps): void {
  if (!hasThreshold(thresholds)) {
    throw new Error(
      `${location} requires at least one threshold: set inputTokenThreshold and/or outputTokenThreshold.`,
    );
  }
  for (const { thresholdKey } of TOKEN_METRICS) {
    const threshold = thresholds[thresholdKey];
    if (threshold !== undefined && threshold < 0) {
      throw new Error(`${location}.${thresholdKey} must be >= 0 (got ${threshold}).`);
    }
  }
}

function validateModelIds(location: string, modelIds: string[]): void {
  if (modelIds.length === 0 || modelIds.length > MAX_MODEL_IDS_PER_TOKEN_ALARM) {
    throw new Error(
      `${location}.modelIds must list 1-${MAX_MODEL_IDS_PER_TOKEN_ALARM} model IDs (got ${modelIds.length}). ` +
        `CloudWatch limits a metric math alarm to ${MAX_MODEL_IDS_PER_TOKEN_ALARM} metrics; split the IDs across entries.`,
    );
  }
  const duplicates = modelIds.filter((id, index) => modelIds.indexOf(id) !== index);
  if (duplicates.length > 0) {
    throw new Error(`${location}.modelIds lists ${[...new Set(duplicates)].join(', ')} more than once.`);
  }
}

/**
 * Rejects token-use alarm config that would produce no alarm, an alarm that can never
 * deliver, or one that fails only at deploy.
 *
 * @param alarms - The tokenUsageAlarms config
 * @throws Error naming the offending config key
 */
export function validateTokenUsageAlarms(alarms: TokenUsageAlarmsProps): void {
  validateAlarmNotificationTarget(alarms, CONFIG_PATH);
  const models = Object.entries(alarms.models ?? {});
  if (models.length === 0 && !alarms.accountTotal) {
    throw new Error(`${CONFIG_PATH} requires at least one alarm: set ${CONFIG_PATH}.models and/or accountTotal.`);
  }
  for (const [name, model] of models) {
    const location = `${CONFIG_PATH}.models.${name}`;
    validateModelIds(location, model.modelIds);
    validateThresholds(location, model);
  }
  if (alarms.accountTotal) {
    validateThresholds(`${CONFIG_PATH}.accountTotal`, alarms.accountTotal);
  }
  validateTokenAlarmTiming(alarms);
}

/**
 * Validates the alarm timing. The period must be a whole number of minutes: Bedrock
 * publishes token metrics at one-minute resolution, so a shorter period receives no
 * datapoints and, with missing data treated as not breaching, the alarm never fires.
 */
function validateTokenAlarmTiming(alarms: TokenUsageAlarmsProps): void {
  const periodSeconds = alarms.periodSeconds ?? DEFAULT_TOKEN_ALARM_PERIOD_SECONDS;
  const evaluationPeriods = alarms.evaluationPeriods ?? DEFAULT_TOKEN_ALARM_EVALUATION_PERIODS;
  if (periodSeconds < 60 || !Number.isInteger(periodSeconds / 60)) {
    throw new Error(
      `${CONFIG_PATH}.periodSeconds must be a multiple of 60 seconds (got ${periodSeconds}). Bedrock publishes ` +
        'token metrics at one-minute resolution, so a shorter period receives no datapoints.',
    );
  }
  validateAlarmEvaluationRange(
    { periodSeconds, evaluationPeriods },
    { period: `${CONFIG_PATH}.periodSeconds`, evaluationPeriods: `${CONFIG_PATH}.evaluationPeriods` },
  );
  validateDatapointsToAlarm(
    { evaluationPeriods, datapointsToAlarm: alarms.datapointsToAlarm },
    { evaluationPeriods: `${CONFIG_PATH}.evaluationPeriods`, datapointsToAlarm: `${CONFIG_PATH}.datapointsToAlarm` },
  );
}

/** Expands the config into one spec per configured threshold. */
function tokenAlarmSpecs(alarms: TokenUsageAlarmsProps): TokenAlarmSpec[] {
  const modelSpecs = Object.entries(alarms.models ?? {}).flatMap(([name, model]) =>
    TOKEN_METRICS.flatMap(({ kind, metricName, thresholdKey }) => {
      const threshold = model[thresholdKey];
      return threshold === undefined
        ? []
        : [
            {
              constructId: `${kind}-tokens-model-${name}`,
              nameSuffix: `${kind}-model-${name}`,
              metricName,
              threshold,
              description: `${kind} tokens for model ${name} (${model.modelIds.join(', ')}) exceed ${threshold}`,
              modelIds: model.modelIds,
            },
          ];
    }),
  );
  const accountTotal = alarms.accountTotal;
  const totalSpecs = accountTotal
    ? TOKEN_METRICS.flatMap(({ kind, metricName, thresholdKey }) => {
        const threshold = accountTotal[thresholdKey];
        return threshold === undefined
          ? []
          : [
              {
                constructId: `${kind}-tokens-account-total`,
                nameSuffix: `${kind}-account-total`,
                metricName,
                threshold,
                description: `${kind} tokens across all models in the account exceed ${threshold}`,
              },
            ];
      })
    : [];
  return [...modelSpecs, ...totalSpecs];
}

/**
 * The metric queries summing a model's token metric across its IDs. Arithmetic in
 * metric math treats a missing value as 0, so an ID with no traffic in a period does not
 * blank out the sum.
 */
function modelIdSumQueries(metricName: string, modelIds: string[], periodSeconds: number): MetricDataQueryProps[] {
  const idQueries = modelIds.map((modelId, index) => ({
    id: `m${index}`,
    metricName,
    namespace: BEDROCK_RUNTIME_METRIC_NAMESPACE,
    statistic: 'Sum',
    period: periodSeconds,
    dimensions: { ModelId: modelId },
    returnData: false,
  }));
  return [
    ...idQueries,
    {
      id: 'tokens',
      expression: idQueries.map(query => query.id).join(' + '),
      label: `${metricName} across ${modelIds.length} model IDs`,
      returnData: true,
    },
  ];
}

/**
 * Name pattern matching every token-use alarm created with this naming, for scoping the
 * notification topic's CloudWatch grants.
 *
 * @param naming - The module's resource naming
 */
export function tokenAlarmNamePattern(naming: IMdaaResourceNaming): string {
  const prefix = naming.withResourceType(MdaaResourceType.CLOUDWATCH_ALARM).resourceName(TOKEN_ALARM_NAME_PREFIX);
  return `${prefix}-*`;
}

/** What {@link createTokenUsageAlarms} needs besides the scope. */
export interface CreateTokenUsageAlarmsProps {
  /** The module's resource naming. */
  readonly naming: IMdaaResourceNaming;
  /** The tokenUsageAlarms config. */
  readonly alarms: TokenUsageAlarmsProps;
  /** The module key, which encrypts a created notification topic. */
  readonly masterKey: IKey;
}

/** What each token-use alarm shares: naming, timing, and the topic it notifies. */
interface TokenAlarmContext {
  readonly naming: IMdaaResourceNaming;
  readonly alarms: TokenUsageAlarmsProps;
  readonly topicArn: string;
  /** Set when the module created the topic, whose grants are scoped to this pattern. */
  readonly alarmNamePattern?: string;
}

/**
 * Creates one token-use alarm. A single model ID becomes a plain metric alarm; several
 * become a metric math alarm summing them.
 */
function createTokenAlarm(scope: Construct, spec: TokenAlarmSpec, context: TokenAlarmContext): MdaaAlarm {
  const { alarms } = context;
  const periodSeconds = alarms.periodSeconds ?? DEFAULT_TOKEN_ALARM_PERIOD_SECONDS;
  const alarmName = context.naming
    .withResourceType(MdaaResourceType.CLOUDWATCH_ALARM)
    .resourceName(`${TOKEN_ALARM_NAME_PREFIX}-${spec.nameSuffix}`, 255);
  if (context.alarmNamePattern) {
    validateAlarmNameMatchesPattern(alarmName, context.alarmNamePattern);
  }
  const metricProps =
    spec.modelIds && spec.modelIds.length > 1
      ? { metrics: modelIdSumQueries(spec.metricName, spec.modelIds, periodSeconds) }
      : {
          metricName: spec.metricName,
          namespace: BEDROCK_RUNTIME_METRIC_NAMESPACE,
          statistic: 'Sum',
          period: periodSeconds,
          dimensions: spec.modelIds ? { ModelId: spec.modelIds[0] } : undefined,
        };
  return new MdaaAlarm(scope, spec.constructId, {
    ...metricProps,
    naming: context.naming,
    alarmName,
    alarmDescription: `Bedrock ${spec.description} over ${periodSeconds}s`,
    threshold: spec.threshold,
    evaluationPeriods: alarms.evaluationPeriods ?? DEFAULT_TOKEN_ALARM_EVALUATION_PERIODS,
    datapointsToAlarm: alarms.datapointsToAlarm,
    comparisonOperator: 'GreaterThanThreshold',
    treatMissingData: 'notBreaching',
    alarmActions: [context.topicArn],
  });
}

/**
 * Creates the configured token-use alarms under a `token-usage-alarms` scope, with the
 * notification topic they publish to when the module is asked to create one.
 *
 * A period with no token use publishes no datapoint and is treated as not breaching.
 *
 * @param scope - Scope the alarms and topic are added under
 * @param props - The config, naming, and module key
 * @returns the created alarms, keyed by construct id
 * @throws Error if the config is invalid, if a topic is to be created on an imported
 *         key, or if an alarm name falls outside the created topic's grant pattern
 */
export function createTokenUsageAlarms(
  scope: Construct,
  props: CreateTokenUsageAlarmsProps,
): { [constructId: string]: MdaaAlarm } {
  const { alarms } = props;
  validateTokenUsageAlarms(alarms);
  addAlarmNotificationWarnings(scope, {
    ...alarms,
    configPath: CONFIG_PATH,
    warningIdPrefix: '@aws-mdaa/bedrock-settings',
  });

  // Each variant of the union omits the other's target keys, so read them through the
  // all-optional shared shape.
  const target: AlarmNotificationProps = alarms;
  const container = new Construct(scope, 'token-usage-alarms');
  const alarmNamePattern = tokenAlarmNamePattern(props.naming);
  const { topicArn } = resolveAlarmNotificationTopic(container, {
    naming: props.naming,
    notificationTopicArn: target.notificationTopicArn,
    createNotificationTopic: target.createNotificationTopic,
    notificationEmails: target.notificationEmails,
    topicName: 'token-usage-alarms',
    masterKey: props.masterKey,
    alarmNamePattern,
    configPath: CONFIG_PATH,
  });
  const context: TokenAlarmContext = {
    naming: props.naming,
    alarms,
    topicArn,
    // Only a created topic's grants are scoped to the alarm names, so only then must they match.
    alarmNamePattern: target.createNotificationTopic ? alarmNamePattern : undefined,
  };

  return Object.fromEntries(
    tokenAlarmSpecs(alarms).map(spec => [spec.constructId, createTokenAlarm(container, spec, context)]),
  );
}

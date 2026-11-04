/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  addAlarmNotificationWarnings,
  AlarmNotificationProps,
  resolveAlarmNotificationTopic,
  validateAlarmNotificationTarget,
  validateDatapointsToAlarm,
  validateMetricsInsightsAlarmWindow,
} from '@aws-mdaa/cloudwatch-constructs';
import {
  DEFAULT_GUARDRAIL_ALARM_EVALUATION_PERIODS,
  DEFAULT_GUARDRAIL_ALARM_PERIOD_SECONDS,
  GuardrailAlarmSettings,
  GuardrailAlarmsProps,
  guardrailAlarmNamePattern,
  NamedGuardrailProps,
} from '@aws-mdaa/bedrock-guardrail-l3-construct';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

const CONFIG_PATH = 'guardrailAlarms';

/** The module props and key {@link resolveGuardrailAlarmSettings} reads. */
export interface GuardrailAlarmSettingsContext {
  readonly guardrailAlarms?: GuardrailAlarmsProps;
  readonly guardrails?: NamedGuardrailProps;
  /** Set when the module key is imported rather than created. */
  readonly kmsKeyArn?: string;
  /** The module key, which encrypts a created notification topic. */
  readonly kmsKey: IKey;
  readonly naming: IMdaaResourceNaming;
}

/**
 * Checks that the `guardrailAlarms` block and the guardrails that set `interventionAlarm`
 * come together: alarms need the block's notification target, and a block no alarm uses
 * would create a topic nothing publishes to.
 */
function validateGuardrailAlarmsPairing(context: GuardrailAlarmSettingsContext): void {
  const alarmedGuardrails = Object.entries(context.guardrails ?? {})
    .filter(([, guardrail]) => guardrail.interventionAlarm)
    .map(([name]) => name);
  if (!context.guardrailAlarms) {
    if (alarmedGuardrails.length > 0) {
      const guardrailList = alarmedGuardrails.map(name => `'${name}'`).join(', ');
      throw new Error(
        `Guardrails ${guardrailList} set interventionAlarm, which requires ` +
          `the module-level ${CONFIG_PATH} block to set the notification target.`,
      );
    }
  } else if (alarmedGuardrails.length === 0) {
    throw new Error(
      `${CONFIG_PATH} is set, but no guardrail sets interventionAlarm, so no alarm would publish to it. ` +
        `Add interventionAlarm to a guardrail, or remove ${CONFIG_PATH}.`,
    );
  }
}

/**
 * Validates the block's notification target, including that a created topic does not sit
 * on an imported key: adding CloudWatch to an imported key's policy is a no-op, so the
 * topic would deploy cleanly and never deliver.
 */
function validateGuardrailAlarmsTarget(alarms: AlarmNotificationProps, kmsKeyArn?: string): void {
  validateAlarmNotificationTarget(alarms, CONFIG_PATH);
  if (alarms.createNotificationTopic && kmsKeyArn) {
    throw new Error(
      `${CONFIG_PATH}.createNotificationTopic cannot be used with kmsKeyArn: MDAA cannot grant CloudWatch use of ` +
        'an imported key, so a topic encrypted with it would never receive a notification. Set ' +
        `${CONFIG_PATH}.notificationTopicArn to an existing topic that allows CloudWatch to publish instead.`,
    );
  }
}

/** Resolves the block's timing with defaults, validated against what Metrics Insights alarms accept. */
function resolveGuardrailAlarmsTiming(
  alarms: GuardrailAlarmsProps,
): Pick<GuardrailAlarmSettings, 'periodSeconds' | 'evaluationPeriods' | 'datapointsToAlarm'> {
  const periodSeconds = alarms.periodSeconds ?? DEFAULT_GUARDRAIL_ALARM_PERIOD_SECONDS;
  const evaluationPeriods = alarms.evaluationPeriods ?? DEFAULT_GUARDRAIL_ALARM_EVALUATION_PERIODS;
  validateMetricsInsightsAlarmWindow(
    { periodSeconds, evaluationPeriods },
    { period: `${CONFIG_PATH}.periodSeconds`, evaluationPeriods: `${CONFIG_PATH}.evaluationPeriods` },
  );
  validateDatapointsToAlarm(
    { evaluationPeriods, datapointsToAlarm: alarms.datapointsToAlarm },
    { evaluationPeriods: `${CONFIG_PATH}.evaluationPeriods`, datapointsToAlarm: `${CONFIG_PATH}.datapointsToAlarm` },
  );
  return { periodSeconds, evaluationPeriods, datapointsToAlarm: alarms.datapointsToAlarm };
}

/**
 * Validates the module-level `guardrailAlarms` block against the guardrails that opt in
 * with `interventionAlarm`, and resolves the notification topic their alarms publish to
 * (creating it, under the `guardrail-alarms` scope, when asked to).
 *
 * @param scope - Scope a created topic is added under
 * @param context - The module's guardrail and alarm config, key, and naming
 * @returns the settings each alarmed guardrail is created with, or undefined when the
 *          module configures no guardrail alarms
 * @throws Error if alarmed guardrails and the block do not come together, if the
 *         notification target is invalid, if a created topic would sit on an imported
 *         key, or if the timing is outside what Metrics Insights alarms accept
 */
export function resolveGuardrailAlarmSettings(
  scope: Construct,
  context: GuardrailAlarmSettingsContext,
): GuardrailAlarmSettings | undefined {
  validateGuardrailAlarmsPairing(context);
  const alarms = context.guardrailAlarms;
  if (!alarms) {
    return undefined;
  }
  validateGuardrailAlarmsTarget(alarms, context.kmsKeyArn);
  const timing = resolveGuardrailAlarmsTiming(alarms);

  addAlarmNotificationWarnings(scope, {
    ...alarms,
    configPath: CONFIG_PATH,
    warningIdPrefix: '@aws-mdaa/bedrock-builder',
  });

  // Each variant of the union omits the other's target keys, so read them through the
  // all-optional shared shape.
  const target: AlarmNotificationProps = alarms;
  const alarmNamePattern = guardrailAlarmNamePattern(context.naming);
  const { topicArn } = resolveAlarmNotificationTopic(new Construct(scope, 'guardrail-alarms'), {
    naming: context.naming,
    notificationTopicArn: target.notificationTopicArn,
    createNotificationTopic: target.createNotificationTopic,
    notificationEmails: target.notificationEmails,
    topicName: 'guardrail-alarms',
    masterKey: context.kmsKey,
    alarmNamePattern,
    configPath: CONFIG_PATH,
  });

  return {
    alarmTopicArn: topicArn,
    ...timing,
    // Only a created topic's grants are scoped to the alarm names, so only then must they match.
    alarmNamePattern: target.createNotificationTopic ? alarmNamePattern : undefined,
  };
}

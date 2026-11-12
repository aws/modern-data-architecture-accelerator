/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Key } from 'aws-cdk-lib/aws-kms';
import { BedrockGuardrailL3Construct, BedrockGuardrailProps } from '../lib';

describe('BedrockGuardrailL3Construct Exception Tests', () => {
  test.each(['LOW', 'MEDIUM', 'HIGH'] as const)(
    'Prompt Attack Filter with Output Strength %s is rejected at synth',
    outputStrength => {
      const testApp = new MdaaTestApp();
      expect(
        () =>
          new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-prompt-attack-construct', {
            guardrailName: 'test-guardrail-prompt-attack',
            guardrailConfig: { contentFilters: { promptAttack: { inputStrength: 'HIGH', outputStrength } } },
            kmsKey: new Key(testApp.testStack, 'TestKey'),
            roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
            naming: testApp.naming,
          }),
      ).toThrow(`promptAttack outputStrength must be NONE, got '${outputStrength}'`);
    },
  );

  test('interventionAlarm without module alarm settings is rejected at synth', () => {
    const testApp = new MdaaTestApp();
    expect(
      () =>
        new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-alarm-construct', {
          guardrailName: 'test-guardrail',
          guardrailConfig: {
            contentFilters: { hate: { inputStrength: 'HIGH', outputStrength: 'HIGH' } },
            interventionAlarm: { countThreshold: 1 },
          },
          kmsKey: new Key(testApp.testStack, 'TestKey'),
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          naming: testApp.naming,
        }),
    ).toThrow(
      "Guardrail 'test-guardrail' sets interventionAlarm, which requires the module-level guardrailAlarms block",
    );
  });

  const contentFilters: BedrockGuardrailProps['contentFilters'] = {
    hate: { inputStrength: 'HIGH', outputStrength: 'HIGH' },
  };

  test.each([
    ['empty word filters', { contentFilters, wordFilters: {} }, 'wordFilters must set words, profanity: true, or both'],
    [
      'word filters with no words and profanity off',
      { contentFilters, wordFilters: { words: [], profanity: false } },
      'wordFilters must set words, profanity: true, or both',
    ],
    [
      'a word repeated with different case',
      { contentFilters, wordFilters: { words: ['Off the record', 'off the RECORD'] } },
      "wordFilters word 'off the RECORD' is listed more than once",
    ],
    [
      'no policies configured',
      { contentFilters: {} },
      'no policies configured. Set at least one of contentFilters, deniedTopics, wordFilters, sensitiveInformationFilters or contextualGroundingFilters.',
    ],
    [
      'empty content filters and empty sensitive information filters',
      { contentFilters: {}, sensitiveInformationFilters: { piiEntities: [], regexes: [] } },
      'no policies configured',
    ],
    [
      'a blank word',
      { contentFilters, wordFilters: { words: ['CompetitorBrandX', '  '] } },
      "wordFilters words entries must be 1-100 characters, got '  '",
    ],
    [
      'a word longer than 100 characters',
      { contentFilters, wordFilters: { words: ['x'.repeat(101)] } },
      `wordFilters words entries must be 1-100 characters, got '${'x'.repeat(101)}'`,
    ],
    [
      'a denied topic example longer than 100 characters',
      {
        contentFilters,
        deniedTopics: [{ name: 'Investment Advice', definition: 'Advice on securities.', examples: ['y'.repeat(101)] }],
      },
      `deniedTopics 'Investment Advice' examples entries must be 1-100 characters, got '${'y'.repeat(101)}'`,
    ],
    [
      'two denied topics with the same name',
      {
        contentFilters,
        deniedTopics: [
          { name: 'Investment Advice', definition: 'Recommendations about securities.' },
          { name: 'Investment Advice', definition: 'Recommendations about funds.' },
        ],
      },
      "deniedTopics name 'Investment Advice' is used more than once",
    ],
  ] as [string, BedrockGuardrailProps, string][])(
    'Guardrail with %s is rejected at synth',
    (_, guardrailConfig, message) => {
      const testApp = new MdaaTestApp();
      expect(
        () =>
          new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-invalid-construct', {
            guardrailName: 'test-guardrail-invalid',
            guardrailConfig,
            kmsKey: new Key(testApp.testStack, 'TestKey'),
            roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
            naming: testApp.naming,
          }),
      ).toThrow(`Guardrail 'test-guardrail-invalid': ${message}`);
    },
  );
});

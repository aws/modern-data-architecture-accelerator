/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import Ajv from 'ajv';
import * as configSchema from '../lib/config-schema.json';

// Validates guardrail config against the generated module schema, as MdaaAppConfigParser does
// before synth. Per-item lengths of `examples` and `words` are not schema-enforced; the guardrail
// construct rejects them at synth (see its constructor-exceptions tests).
describe('Bedrock Builder Guardrail Config Schema', () => {
  const validate = new Ajv({ allErrors: true }).compile(configSchema);

  const topic = (name: string) => ({ name, definition: 'Recommendations about financial securities.' });

  const configWith = (guardrail: object) => ({
    dataAdminRoles: [{ name: 'Admin' }],
    guardrails: {
      'test-guardrail': { contentFilters: { hate: { inputStrength: 'HIGH', outputStrength: 'HIGH' } }, ...guardrail },
    },
  });

  test.each([
    ['30 denied topics', { deniedTopics: Array.from({ length: 30 }, (_, i) => topic(`Topic ${i}`)) }],
    [
      'a 200-character definition and 5 examples',
      { deniedTopics: [{ ...topic('Investment Advice'), definition: 'x'.repeat(200), examples: Array(5).fill('e') }] },
    ],
    ['a topic name using every allowed character class', { deniedTopics: [topic('Topic_1 - Advice? Yes! v1.0')] }],
    [
      'direction controls on every policy type',
      {
        contentFilters: {
          hate: {
            inputStrength: 'HIGH',
            outputStrength: 'HIGH',
            inputAction: 'NONE',
            outputAction: 'BLOCK',
            inputEnabled: true,
            outputEnabled: false,
          },
        },
        deniedTopics: [{ ...topic('Investment Advice'), inputAction: 'NONE', outputEnabled: false }],
        wordFilters: { words: ['CompetitorBrandX'], profanity: true, outputAction: 'NONE', inputEnabled: true },
      },
    ],
  ])('accepts %s', (_, guardrail) => {
    expect(validate(configWith(guardrail))).toBe(true);
  });

  test.each([
    [
      'a definition longer than 200 characters',
      { deniedTopics: [{ ...topic('Investment Advice'), definition: 'x'.repeat(201) }] },
      '/guardrails/test-guardrail/deniedTopics/0/definition',
    ],
    [
      'more than 5 examples',
      { deniedTopics: [{ ...topic('Investment Advice'), examples: Array(6).fill('e') }] },
      '/guardrails/test-guardrail/deniedTopics/0/examples',
    ],
    [
      'more than 30 denied topics',
      { deniedTopics: Array.from({ length: 31 }, (_, i) => topic(`Topic ${i}`)) },
      '/guardrails/test-guardrail/deniedTopics',
    ],
    ['an empty denied topic list', { deniedTopics: [] }, '/guardrails/test-guardrail/deniedTopics'],
    [
      'a topic name with a disallowed character',
      { deniedTopics: [topic('Investment/Advice')] },
      '/guardrails/test-guardrail/deniedTopics/0/name',
    ],
    [
      'a topic name longer than 100 characters',
      { deniedTopics: [topic('x'.repeat(101))] },
      '/guardrails/test-guardrail/deniedTopics/0/name',
    ],
    [
      'a denied topic without a definition',
      { deniedTopics: [{ name: 'Investment Advice' }] },
      '/guardrails/test-guardrail/deniedTopics/0',
    ],
    ['an empty word list', { wordFilters: { words: [] } }, '/guardrails/test-guardrail/wordFilters/words'],
    [
      'an unknown word filter property',
      { wordFilters: { words: ['CompetitorBrandX'], blockedMessage: 'Blocked' } },
      '/guardrails/test-guardrail/wordFilters',
    ],
    [
      'ANONYMIZE as a content filter action',
      { contentFilters: { hate: { inputStrength: 'HIGH', outputStrength: 'HIGH', outputAction: 'ANONYMIZE' } } },
      '/guardrails/test-guardrail/contentFilters/hate/outputAction',
    ],
    [
      'ANONYMIZE as a denied topic action',
      { deniedTopics: [{ ...topic('Investment Advice'), inputAction: 'ANONYMIZE' }] },
      '/guardrails/test-guardrail/deniedTopics/0/inputAction',
    ],
    [
      'ANONYMIZE as a word filter action',
      { wordFilters: { words: ['CompetitorBrandX'], inputAction: 'ANONYMIZE' } },
      '/guardrails/test-guardrail/wordFilters/inputAction',
    ],
  ])('rejects %s', (_, guardrail, instancePath) => {
    expect(validate(configWith(guardrail))).toBe(false);
    expect(validate.errors?.map(error => error.instancePath)).toContain(instancePath);
  });
});

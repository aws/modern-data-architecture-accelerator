/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Key } from 'aws-cdk-lib/aws-kms';
import { BedrockGuardrailL3Construct } from '../lib';

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
});

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { BedrockGuardrailL3Construct, BedrockGuardrailL3ConstructProps, BedrockGuardrailProps } from '../lib';

describe('Bedrock Guardrail L3 Construct Tests', () => {
  const basicGuardrail: BedrockGuardrailProps = {
    description: 'Test guardrail for content filtering',
    contentFilters: {
      hate: {
        inputStrength: 'MEDIUM',
        outputStrength: 'MEDIUM',
      },
      sexual: {
        inputStrength: 'HIGH',
        outputStrength: 'HIGH',
      },
      violence: {
        inputStrength: 'MEDIUM',
        outputStrength: 'MEDIUM',
      },
    },
  };

  test('Test Basic Guardrail Creation', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const constructProps: BedrockGuardrailL3ConstructProps = {
      guardrailName: 'test-guardrail',
      guardrailConfig: basicGuardrail,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      Name: 'test-org-test-env-test-domain-test-modul--5cc4fab9',
      Description: 'Test guardrail for content filtering',
      ContentPolicyConfig: {
        FiltersConfig: [
          {
            InputStrength: 'MEDIUM',
            OutputStrength: 'MEDIUM',
            Type: 'HATE',
          },
          {
            InputStrength: 'HIGH',
            OutputStrength: 'HIGH',
            Type: 'SEXUAL',
          },
          {
            InputStrength: 'MEDIUM',
            OutputStrength: 'MEDIUM',
            Type: 'VIOLENCE',
          },
        ],
      },
    });
  });

  test('Test Guardrail with Contextual Grounding', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const guardrailWithGrounding: BedrockGuardrailProps = {
      ...basicGuardrail,
      contextualGroundingFilters: {
        grounding: 0.9,
        relevance: 0.8,
      },
    };

    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const constructProps: BedrockGuardrailL3ConstructProps = {
      guardrailName: 'test-guardrail-grounding',
      guardrailConfig: guardrailWithGrounding,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-grounding-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      ContextualGroundingPolicyConfig: {
        FiltersConfig: [
          {
            Type: 'GROUNDING',
            Threshold: 0.9,
          },
          {
            Type: 'RELEVANCE',
            Threshold: 0.8,
          },
        ],
      },
    });
  });

  test('Test Guardrail with Custom Messages', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const guardrailWithMessages: BedrockGuardrailProps = {
      ...basicGuardrail,
      blockedInputMessaging: 'Custom input blocked message',
      blockedOutputsMessaging: 'Custom output blocked message',
    };

    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const constructProps: BedrockGuardrailL3ConstructProps = {
      guardrailName: 'test-guardrail-messages',
      guardrailConfig: guardrailWithMessages,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-messages-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      BlockedInputMessaging: 'Custom input blocked message',
      BlockedOutputsMessaging: 'Custom output blocked message',
    });
  });

  test('Test Guardrail with All Content Filters', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const guardrailWithAllFilters: BedrockGuardrailProps = {
      description: 'Comprehensive guardrail',
      contentFilters: {
        hate: { inputStrength: 'HIGH', outputStrength: 'HIGH' },
        sexual: { inputStrength: 'HIGH', outputStrength: 'HIGH' },
        violence: { inputStrength: 'MEDIUM', outputStrength: 'MEDIUM' },
        insults: { inputStrength: 'LOW', outputStrength: 'LOW' },
        misconduct: { inputStrength: 'MEDIUM', outputStrength: 'MEDIUM' },
        promptAttack: { inputStrength: 'HIGH', outputStrength: 'HIGH' },
      },
    };

    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const constructProps: BedrockGuardrailL3ConstructProps = {
      guardrailName: 'test-guardrail-all-filters',
      guardrailConfig: guardrailWithAllFilters,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-all-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      ContentPolicyConfig: {
        FiltersConfig: [
          { Type: 'HATE', InputStrength: 'HIGH', OutputStrength: 'HIGH' },
          { Type: 'SEXUAL', InputStrength: 'HIGH', OutputStrength: 'HIGH' },
          { Type: 'VIOLENCE', InputStrength: 'MEDIUM', OutputStrength: 'MEDIUM' },
          { Type: 'INSULTS', InputStrength: 'LOW', OutputStrength: 'LOW' },
          { Type: 'MISCONDUCT', InputStrength: 'MEDIUM', OutputStrength: 'MEDIUM' },
          { Type: 'PROMPT_ATTACK', InputStrength: 'HIGH', OutputStrength: 'HIGH' },
        ],
      },
    });
  });
});

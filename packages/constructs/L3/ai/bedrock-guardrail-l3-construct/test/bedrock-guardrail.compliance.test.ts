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

  test('Test Guardrail with PII Entity Filters', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const guardrailWithPII: BedrockGuardrailProps = {
      ...basicGuardrail,
      sensitiveInformationFilters: {
        piiEntities: [
          { type: 'EMAIL', action: 'ANONYMIZE' },
          { type: 'PHONE', action: 'ANONYMIZE' },
          { type: 'US_SOCIAL_SECURITY_NUMBER', action: 'BLOCK' },
          { type: 'CREDIT_DEBIT_CARD_NUMBER', action: 'BLOCK' },
        ],
      },
    };

    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const constructProps: BedrockGuardrailL3ConstructProps = {
      guardrailName: 'test-guardrail-pii',
      guardrailConfig: guardrailWithPII,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-pii-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      SensitiveInformationPolicyConfig: {
        PiiEntitiesConfig: [
          { Type: 'EMAIL', Action: 'ANONYMIZE' },
          { Type: 'PHONE', Action: 'ANONYMIZE' },
          { Type: 'US_SOCIAL_SECURITY_NUMBER', Action: 'BLOCK' },
          { Type: 'CREDIT_DEBIT_CARD_NUMBER', Action: 'BLOCK' },
        ],
      },
    });
  });

  test('Test Guardrail with Regex Pattern Filters', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const guardrailWithRegex: BedrockGuardrailProps = {
      ...basicGuardrail,
      sensitiveInformationFilters: {
        regexes: [
          {
            name: 'CustomEmployeeId',
            pattern: 'EMP-\\d{6}',
            action: 'ANONYMIZE',
            description: 'Company employee ID pattern',
          },
          {
            name: 'InternalProjectCode',
            pattern: 'PROJ-[A-Z]{3}-\\d{4}',
            action: 'BLOCK',
            description: 'Internal project code format',
          },
        ],
      },
    };

    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const constructProps: BedrockGuardrailL3ConstructProps = {
      guardrailName: 'test-guardrail-regex',
      guardrailConfig: guardrailWithRegex,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-regex-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      SensitiveInformationPolicyConfig: {
        RegexesConfig: [
          {
            Name: 'CustomEmployeeId',
            Pattern: 'EMP-\\d{6}',
            Action: 'ANONYMIZE',
            Description: 'Company employee ID pattern',
          },
          {
            Name: 'InternalProjectCode',
            Pattern: 'PROJ-[A-Z]{3}-\\d{4}',
            Action: 'BLOCK',
            Description: 'Internal project code format',
          },
        ],
      },
    });
  });

  test('Test Guardrail with Combined PII and Regex Filters', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const guardrailWithCombinedFilters: BedrockGuardrailProps = {
      ...basicGuardrail,
      sensitiveInformationFilters: {
        piiEntities: [
          { type: 'EMAIL', action: 'ANONYMIZE' },
          { type: 'AWS_ACCESS_KEY', action: 'BLOCK' },
          { type: 'AWS_SECRET_KEY', action: 'BLOCK' },
        ],
        regexes: [
          {
            name: 'CustomApiKey',
            pattern: 'API_KEY_[A-Za-z0-9]{32}',
            action: 'BLOCK',
            description: 'Custom API key format',
          },
        ],
      },
    };

    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const constructProps: BedrockGuardrailL3ConstructProps = {
      guardrailName: 'test-guardrail-combined',
      guardrailConfig: guardrailWithCombinedFilters,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-combined-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      SensitiveInformationPolicyConfig: {
        PiiEntitiesConfig: [
          { Type: 'EMAIL', Action: 'ANONYMIZE' },
          { Type: 'AWS_ACCESS_KEY', Action: 'BLOCK' },
          { Type: 'AWS_SECRET_KEY', Action: 'BLOCK' },
        ],
        RegexesConfig: [
          {
            Name: 'CustomApiKey',
            Pattern: 'API_KEY_[A-Za-z0-9]{32}',
            Action: 'BLOCK',
            Description: 'Custom API key format',
          },
        ],
      },
    });
  });

  test('Test Guardrail with Comprehensive Configuration', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const comprehensiveGuardrail: BedrockGuardrailProps = {
      description: 'Comprehensive guardrail with all features',
      contentFilters: {
        hate: { inputStrength: 'HIGH', outputStrength: 'HIGH' },
        sexual: { inputStrength: 'MEDIUM', outputStrength: 'MEDIUM' },
        violence: { inputStrength: 'LOW', outputStrength: 'LOW' },
      },
      contextualGroundingFilters: {
        grounding: 0.8,
        relevance: 0.7,
      },
      sensitiveInformationFilters: {
        piiEntities: [
          { type: 'NAME', action: 'ANONYMIZE' },
          { type: 'ADDRESS', action: 'ANONYMIZE' },
          { type: 'PHONE', action: 'ANONYMIZE' },
          { type: 'EMAIL', action: 'ANONYMIZE' },
          { type: 'US_SOCIAL_SECURITY_NUMBER', action: 'BLOCK' },
          { type: 'CREDIT_DEBIT_CARD_NUMBER', action: 'BLOCK' },
          { type: 'AWS_ACCESS_KEY', action: 'BLOCK' },
          { type: 'AWS_SECRET_KEY', action: 'BLOCK' },
        ],
        regexes: [
          {
            name: 'CompanyEmployeeId',
            pattern: 'EMP-\\d{6}',
            action: 'ANONYMIZE',
            description: 'Company employee ID format',
          },
          {
            name: 'InternalApiKey',
            pattern: 'INTERNAL_[A-Z0-9]{16}',
            action: 'BLOCK',
            description: 'Internal API key format',
          },
        ],
      },
      blockedInputMessaging: 'Your input contains sensitive or inappropriate content.',
      blockedOutputsMessaging: 'The response contains sensitive or inappropriate content.',
    };

    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const constructProps: BedrockGuardrailL3ConstructProps = {
      guardrailName: 'test-guardrail-comprehensive',
      guardrailConfig: comprehensiveGuardrail,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-comprehensive-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      Description: 'Comprehensive guardrail with all features',
      BlockedInputMessaging: 'Your input contains sensitive or inappropriate content.',
      BlockedOutputsMessaging: 'The response contains sensitive or inappropriate content.',
      ContentPolicyConfig: {
        FiltersConfig: [
          { Type: 'HATE', InputStrength: 'HIGH', OutputStrength: 'HIGH' },
          { Type: 'SEXUAL', InputStrength: 'MEDIUM', OutputStrength: 'MEDIUM' },
          { Type: 'VIOLENCE', InputStrength: 'LOW', OutputStrength: 'LOW' },
        ],
      },
      ContextualGroundingPolicyConfig: {
        FiltersConfig: [
          { Type: 'GROUNDING', Threshold: 0.8 },
          { Type: 'RELEVANCE', Threshold: 0.7 },
        ],
      },
      SensitiveInformationPolicyConfig: {
        PiiEntitiesConfig: [
          { Type: 'NAME', Action: 'ANONYMIZE' },
          { Type: 'ADDRESS', Action: 'ANONYMIZE' },
          { Type: 'PHONE', Action: 'ANONYMIZE' },
          { Type: 'EMAIL', Action: 'ANONYMIZE' },
          { Type: 'US_SOCIAL_SECURITY_NUMBER', Action: 'BLOCK' },
          { Type: 'CREDIT_DEBIT_CARD_NUMBER', Action: 'BLOCK' },
          { Type: 'AWS_ACCESS_KEY', Action: 'BLOCK' },
          { Type: 'AWS_SECRET_KEY', Action: 'BLOCK' },
        ],
        RegexesConfig: [
          {
            Name: 'CompanyEmployeeId',
            Pattern: 'EMP-\\d{6}',
            Action: 'ANONYMIZE',
            Description: 'Company employee ID format',
          },
          {
            Name: 'InternalApiKey',
            Pattern: 'INTERNAL_[A-Z0-9]{16}',
            Action: 'BLOCK',
            Description: 'Internal API key format',
          },
        ],
      },
    });
  });
});

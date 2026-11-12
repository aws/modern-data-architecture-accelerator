/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Aspects, Tags } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { CfnGuardrail } from 'aws-cdk-lib/aws-bedrock';
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

  test('Basic Guardrail Creation', () => {
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

  test('Guardrail with Contextual Grounding', () => {
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

  test('Guardrail with Custom Messages', () => {
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

  test('Guardrail with All Content Filters', () => {
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
        promptAttack: { inputStrength: 'HIGH', outputStrength: 'NONE' },
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
          { Type: 'PROMPT_ATTACK', InputStrength: 'HIGH', OutputStrength: 'NONE' },
        ],
      },
    });
  });

  test('Guardrail with PII Entity Filters', () => {
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

  test('Guardrail with Regex Pattern Filters', () => {
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

  test('Guardrail with Combined PII and Regex Filters', () => {
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

  test('Guardrail providing Configuration', () => {
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

  test('Guardrail with Grounding Only (no Relevance)', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const guardrailGroundingOnly: BedrockGuardrailProps = {
      ...basicGuardrail,
      contextualGroundingFilters: {
        grounding: 0.95,
        // relevance intentionally omitted
      },
    };

    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const constructProps: BedrockGuardrailL3ConstructProps = {
      guardrailName: 'test-guardrail-grounding-only',
      guardrailConfig: guardrailGroundingOnly,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-grounding-only-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      ContextualGroundingPolicyConfig: {
        FiltersConfig: [
          {
            Type: 'GROUNDING',
            Threshold: 0.95,
          },
        ],
      },
    });
  });

  test('Guardrail with No Optional Filters', () => {
    const testApp = new MdaaTestApp();
    const kmsKey = new Key(testApp.testStack, 'TestKey');

    const minimalGuardrail: BedrockGuardrailProps = {
      contentFilters: {
        hate: { inputStrength: 'LOW', outputStrength: 'LOW' },
      },
      // No contextualGroundingFilters, no sensitiveInformationFilters, no custom messages
    };

    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    const constructProps: BedrockGuardrailL3ConstructProps = {
      guardrailName: 'test-guardrail-minimal',
      guardrailConfig: minimalGuardrail,
      kmsKey,
      roleHelper,
      naming: testApp.naming,
    };

    new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-minimal-construct', constructProps);
    const template = Template.fromStack(testApp.testStack);

    const guardrails = template.findResources('AWS::Bedrock::Guardrail');
    const guardrail = Object.values(guardrails)[0] as {
      Properties: {
        ContextualGroundingPolicyConfig?: unknown;
        SensitiveInformationPolicyConfig?: unknown;
        BlockedInputMessaging: string;
        BlockedOutputsMessaging: string;
      };
    };

    // Should use default messages
    expect(guardrail.Properties.BlockedInputMessaging).toBe('Your input contains content that is not allowed.');
    expect(guardrail.Properties.BlockedOutputsMessaging).toBe('The response contains content that is not allowed.');
  });

  test('Prompt Attack Filter with Output Strength NONE', () => {
    const testApp = new MdaaTestApp();
    new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-prompt-attack-construct', {
      guardrailName: 'test-guardrail-prompt-attack',
      guardrailConfig: { contentFilters: { promptAttack: { inputStrength: 'HIGH', outputStrength: 'NONE' } } },
      kmsKey: new Key(testApp.testStack, 'TestKey'),
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
    });
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      ContentPolicyConfig: {
        FiltersConfig: [{ InputStrength: 'HIGH', OutputStrength: 'NONE', Type: 'PROMPT_ATTACK' }],
      },
    });
  });

  test('Output Strength NONE on Other Filters', () => {
    const testApp = new MdaaTestApp();
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-input-only-construct', {
      guardrailName: 'test-guardrail-input-only',
      guardrailConfig: { contentFilters: { hate: { inputStrength: 'HIGH', outputStrength: 'NONE' } } },
      kmsKey: new Key(testApp.testStack, 'TestKey'),
      roleHelper,
      naming: testApp.naming,
    });
    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      ContentPolicyConfig: {
        FiltersConfig: [{ InputStrength: 'HIGH', OutputStrength: 'NONE', Type: 'HATE' }],
      },
    });
  });

  const synthGuardrail = (guardrailName: string, guardrailConfig: BedrockGuardrailProps): Template => {
    const testApp = new MdaaTestApp();
    new BedrockGuardrailL3Construct(testApp.testStack, `${guardrailName}-construct`, {
      guardrailName,
      guardrailConfig,
      kmsKey: new Key(testApp.testStack, 'TestKey', { enableKeyRotation: true }),
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
    });
    return Template.fromStack(testApp.testStack);
  };

  test('Content Filter Direction Controls', () => {
    const template = synthGuardrail('test-guardrail-filter-controls', {
      contentFilters: {
        hate: { inputStrength: 'HIGH', outputStrength: 'HIGH', outputAction: 'NONE' },
        insults: { inputStrength: 'MEDIUM', outputStrength: 'MEDIUM', inputEnabled: false, outputEnabled: true },
        violence: { inputStrength: 'LOW', outputStrength: 'LOW' },
      },
    });

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      ContentPolicyConfig: {
        FiltersConfig: [
          Match.exact({ Type: 'HATE', InputStrength: 'HIGH', OutputStrength: 'HIGH', OutputAction: 'NONE' }),
          Match.exact({
            Type: 'INSULTS',
            InputStrength: 'MEDIUM',
            OutputStrength: 'MEDIUM',
            InputEnabled: false,
            OutputEnabled: true,
          }),
          Match.exact({ Type: 'VIOLENCE', InputStrength: 'LOW', OutputStrength: 'LOW' }),
        ],
      },
    });
  });

  test('Guardrail without Topics or Word Filters omits both policies', () => {
    const template = synthGuardrail('test-guardrail-no-topics', basicGuardrail);

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      TopicPolicyConfig: Match.absent(),
      WordPolicyConfig: Match.absent(),
    });
  });

  test('Guardrail with Denied Topics renders them in config order', () => {
    const template = synthGuardrail('test-guardrail-topics', {
      ...basicGuardrail,
      deniedTopics: [
        {
          name: 'Medical Diagnosis',
          definition: 'Identifying medical conditions from symptoms, or recommending treatments or medications.',
          inputAction: 'NONE',
          outputEnabled: false,
        },
        {
          name: 'Investment Advice',
          definition: 'Recommendations about buying, selling, or holding financial securities or other investments.',
          examples: ['Should I buy this stock?', 'Is now a good time to invest?'],
        },
      ],
    });

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      TopicPolicyConfig: {
        TopicsConfig: [
          Match.exact({
            Type: 'DENY',
            Name: 'Medical Diagnosis',
            Definition: 'Identifying medical conditions from symptoms, or recommending treatments or medications.',
            InputAction: 'NONE',
            OutputEnabled: false,
          }),
          Match.exact({
            Type: 'DENY',
            Name: 'Investment Advice',
            Definition: 'Recommendations about buying, selling, or holding financial securities or other investments.',
            Examples: ['Should I buy this stock?', 'Is now a good time to invest?'],
          }),
        ],
      },
    });
  });

  test('Guardrail with Word Filters and Profanity', () => {
    const template = synthGuardrail('test-guardrail-words', {
      ...basicGuardrail,
      wordFilters: { words: ['CompetitorBrandX', 'off the record'], profanity: true },
    });

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      WordPolicyConfig: Match.exact({
        WordsConfig: [{ Text: 'CompetitorBrandX' }, { Text: 'off the record' }],
        ManagedWordListsConfig: [{ Type: 'PROFANITY' }],
      }),
    });
  });

  test('Word Filter Direction Controls apply to every entry', () => {
    const template = synthGuardrail('test-guardrail-words-controls', {
      ...basicGuardrail,
      wordFilters: { words: ['CompetitorBrandX', 'ProjectZephyr'], profanity: true, outputEnabled: false },
    });

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      WordPolicyConfig: Match.exact({
        WordsConfig: [
          { Text: 'CompetitorBrandX', OutputEnabled: false },
          { Text: 'ProjectZephyr', OutputEnabled: false },
        ],
        ManagedWordListsConfig: [{ Type: 'PROFANITY', OutputEnabled: false }],
      }),
    });
  });

  test('Words-only Word Filter omits the profanity list', () => {
    const template = synthGuardrail('test-guardrail-words-only', {
      ...basicGuardrail,
      wordFilters: { words: ['CompetitorBrandX'] },
    });

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      WordPolicyConfig: Match.exact({
        WordsConfig: [{ Text: 'CompetitorBrandX' }],
      }),
    });
  });

  test('Empty Content Filters omit the content policy when another policy is set', () => {
    const template = synthGuardrail('test-guardrail-topics-only', {
      contentFilters: {},
      deniedTopics: [{ name: 'Investment Advice', definition: 'Recommendations about financial securities.' }],
    });

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      ContentPolicyConfig: Match.absent(),
      TopicPolicyConfig: {
        TopicsConfig: [Match.objectLike({ Name: 'Investment Advice', Type: 'DENY' })],
      },
    });
  });

  test('Word Filter entries that differ only in spacing are kept as separate entries', () => {
    const template = synthGuardrail('test-guardrail-words-spacing', {
      ...basicGuardrail,
      wordFilters: { words: ['off the record', 'off  the record'] },
    });

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      WordPolicyConfig: Match.exact({
        WordsConfig: [{ Text: 'off the record' }, { Text: 'off  the record' }],
      }),
    });
  });

  test('Profanity-only Word Filter omits custom words', () => {
    const template = synthGuardrail('test-guardrail-profanity', {
      ...basicGuardrail,
      wordFilters: { profanity: true, inputAction: 'NONE' },
    });

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      WordPolicyConfig: Match.exact({
        ManagedWordListsConfig: [{ Type: 'PROFANITY', InputAction: 'NONE' }],
      }),
    });
  });

  test('PII Entity Directional Actions pass through unchanged', () => {
    const template = synthGuardrail('test-guardrail-pii-directional', {
      ...basicGuardrail,
      sensitiveInformationFilters: {
        piiEntities: [{ type: 'NAME', action: 'ANONYMIZE', inputAction: 'ANONYMIZE', outputAction: 'BLOCK' }],
      },
    });

    template.hasResourceProperties('AWS::Bedrock::Guardrail', {
      SensitiveInformationPolicyConfig: {
        PiiEntitiesConfig: [
          Match.exact({ Type: 'NAME', Action: 'ANONYMIZE', InputAction: 'ANONYMIZE', OutputAction: 'BLOCK' }),
        ],
      },
    });
  });

  describe('Version Publishing', () => {
    const VERSION_TYPE = 'AWS::Bedrock::GuardrailVersion';

    const synthGuardrail = (
      guardrailConfig: BedrockGuardrailProps,
      customize?: (construct: BedrockGuardrailL3Construct) => void,
    ) => {
      const testApp = new MdaaTestApp();
      const construct = new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-construct', {
        guardrailName: 'test-guardrail',
        guardrailConfig,
        kmsKey: new Key(testApp.testStack, 'TestKey'),
        roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
        naming: testApp.naming,
      });
      customize?.(construct);
      return { testApp, construct, template: Template.fromStack(testApp.testStack) };
    };

    const ssmParamValues = (template: Template, suffix: string): unknown[] =>
      Object.values(template.findResources('AWS::SSM::Parameter'))
        .filter(param => String(param.Properties.Name).endsWith(suffix))
        .map(param => param.Properties.Value);

    const singleVersion = (template: Template) => {
      const versions = Object.entries(template.findResources(VERSION_TYPE));
      expect(versions).toHaveLength(1);
      const [logicalId, resource] = versions[0];
      return { logicalId, resource };
    };

    const published: BedrockGuardrailProps = { ...basicGuardrail, versionPublishing: {} };

    test('No version is published without versionPublishing', () => {
      const { testApp, construct, template } = synthGuardrail(basicGuardrail);

      template.resourceCountIs(VERSION_TYPE, 0);
      expect(ssmParamValues(template, '/guardrail/test-guardrail/version')).toHaveLength(0);
      expect(ssmParamValues(template, '/guardrail/test-guardrail/version-arn')).toHaveLength(0);
      expect(construct.guardrailVersion).toBeUndefined();
      expect(testApp.testStack.resolve(construct.referenceVersion)).toEqual({
        'Fn::GetAtt': [testApp.testStack.getLogicalId(construct.guardrail), 'Version'],
      });
    });

    test('Publishes one version of the guardrail and its number to SSM', () => {
      const { testApp, construct, template } = synthGuardrail(published);

      const { logicalId, resource } = singleVersion(template);
      const guardrailLogicalId = testApp.testStack.getLogicalId(construct.guardrail);
      expect(resource.Properties.GuardrailIdentifier).toEqual({ 'Fn::GetAtt': [guardrailLogicalId, 'GuardrailId'] });
      expect(resource.Properties.Description).toMatch(
        /^Published by MDAA from guardrail configuration hash [0-9a-f]{64}$/,
      );
      expect(resource.DeletionPolicy).toBeUndefined();
      expect(resource.UpdateReplacePolicy).toBeUndefined();

      const versionRef = { 'Fn::GetAtt': [logicalId, 'Version'] };
      expect(ssmParamValues(template, '/guardrail/test-guardrail/version')).toEqual([versionRef]);
      expect(ssmParamValues(template, '/guardrail/test-guardrail/version-arn')).toEqual([
        { 'Fn::Join': [':', [{ 'Fn::GetAtt': [guardrailLogicalId, 'GuardrailArn'] }, versionRef]] },
      ]);
      expect(ssmParamValues(template, '/guardrail/test-guardrail/arn')).toHaveLength(1);
      expect(ssmParamValues(template, '/guardrail/test-guardrail/id')).toHaveLength(1);
      expect(testApp.testStack.resolve(construct.referenceVersion)).toEqual(versionRef);
    });

    test('An unchanged configuration renders an identical version across synths', () => {
      const first = singleVersion(synthGuardrail(published).template);
      const second = singleVersion(synthGuardrail(published).template);

      expect(second).toEqual(first);
    });

    test('A configuration change changes the version description, replacing the version', () => {
      const original = singleVersion(synthGuardrail(published).template);
      const changed = singleVersion(
        synthGuardrail({ ...published, blockedInputMessaging: 'Changed input blocked message' }).template,
      );

      expect(changed.logicalId).toEqual(original.logicalId);
      expect(changed.resource.Properties.Description).not.toEqual(original.resource.Properties.Description);
    });

    test('A property override applied after construction replaces the version', () => {
      const original = singleVersion(synthGuardrail(published).template);
      const overridden = singleVersion(
        synthGuardrail(published, construct =>
          construct.guardrail.addPropertyOverride('BlockedInputMessaging', 'Overridden input blocked message'),
        ).template,
      );

      expect(overridden.resource.Properties.Description).not.toEqual(original.resource.Properties.Description);
    });

    test('A CDK aspect that mutates the guardrail replaces the version', () => {
      const original = singleVersion(synthGuardrail(published).template);
      const mutated = singleVersion(
        synthGuardrail(published, construct =>
          Aspects.of(construct).add({
            visit: node => {
              if (node instanceof CfnGuardrail) {
                node.blockedOutputsMessaging = 'Aspect output blocked message';
              }
            },
          }),
        ).template,
      );

      expect(mutated.resource.Properties.Description).not.toEqual(original.resource.Properties.Description);
    });

    test('A tag change leaves the version unchanged', () => {
      const original = synthGuardrail(published);
      const tagged = synthGuardrail(published, construct => Tags.of(construct).add('cost-center', 'changed'));

      tagged.template.hasResourceProperties('AWS::Bedrock::Guardrail', {
        Tags: Match.arrayWith([{ Key: 'cost-center', Value: 'changed' }]),
      });
      expect(singleVersion(tagged.template)).toEqual(singleVersion(original.template));
    });

    test('retainVersions retains superseded and removed versions, but not one whose creation rolled back', () => {
      const { template } = synthGuardrail({ ...basicGuardrail, versionPublishing: { retainVersions: true } });

      const { resource } = singleVersion(template);
      expect(resource.DeletionPolicy).toBe('RetainExceptOnCreate');
      expect(resource.UpdateReplacePolicy).toBe('Retain');
    });

    // The version hash reads this internal aws-cdk-lib rendering, so a CDK upgrade that changes it
    // must fail here rather than silently hash something else.
    test('The guardrail renders the internal shape the version hash reads', () => {
      const { testApp, construct } = synthGuardrail(published);

      const rendered = testApp.testStack.resolve(construct.guardrail._toCloudFormation());
      expect(Object.keys(rendered)).toEqual(['Resources']);
      const resources = Object.values(rendered.Resources) as {
        Type: string;
        Properties: { [name: string]: unknown };
      }[];
      expect(resources).toHaveLength(1);
      expect(resources[0].Type).toBe('AWS::Bedrock::Guardrail');
      expect(resources[0].Properties).toEqual(
        expect.objectContaining({
          Name: expect.any(String),
          BlockedInputMessaging: 'Your input contains content that is not allowed.',
          ContentPolicyConfig: expect.any(Object),
        }),
      );
    });

    test('An unreadable guardrail rendering fails synth instead of hashing it', () => {
      expect(() =>
        synthGuardrail(published, construct => {
          jest.spyOn(construct.guardrail, '_toCloudFormation').mockReturnValue({});
        }),
      ).toThrow(/cannot read the guardrail's rendered properties/);
    });
  });
});

describe('Bedrock Guardrail L3 Construct CDK Nag Compliance', () => {
  const testApp = new MdaaTestApp();

  // One guardrail exercising every policy type, so each rendered policy is evaluated by the rule packs.
  new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-nag-construct', {
    guardrailName: 'test-guardrail-nag',
    guardrailConfig: {
      description: 'Guardrail exercising every policy type',
      contentFilters: {
        hate: { inputStrength: 'HIGH', outputStrength: 'HIGH', outputAction: 'NONE' },
        promptAttack: { inputStrength: 'HIGH', outputStrength: 'NONE' },
      },
      contextualGroundingFilters: { grounding: 0.9, relevance: 0.8 },
      sensitiveInformationFilters: {
        piiEntities: [{ type: 'NAME', action: 'BLOCK', inputAction: 'ANONYMIZE', outputAction: 'BLOCK' }],
        regexes: [{ name: 'EmployeeId', pattern: 'EMP-\\d{6}', action: 'ANONYMIZE' }],
      },
      deniedTopics: [
        { name: 'Investment Advice', definition: 'Recommendations about financial securities.', inputAction: 'NONE' },
      ],
      wordFilters: { words: ['CompetitorBrandX'], profanity: true, outputEnabled: false },
    },
    kmsKey: new Key(testApp.testStack, 'TestKey', { enableKeyRotation: true }),
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    naming: testApp.naming,
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
});

describe('Bedrock Guardrail L3 Construct Intervention Alarm Compliance', () => {
  const testApp = new MdaaTestApp();
  new BedrockGuardrailL3Construct(testApp.testStack, 'test-guardrail-construct', {
    guardrailName: 'test-guardrail',
    guardrailConfig: {
      contentFilters: { promptAttack: { inputStrength: 'HIGH', outputStrength: 'NONE' } },
      interventionAlarm: { countThreshold: 25, ratePercentThreshold: 15 },
    },
    kmsKey: new Key(testApp.testStack, 'TestKey', { enableKeyRotation: true }),
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    naming: testApp.naming,
    alarmSettings: {
      alarmTopicArn: 'arn:test-partition:sns:test-region:test-account:security-alarms',
      periodSeconds: 300,
      evaluationPeriods: 1,
    },
  });
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Intervention alarms notify the configured topic', () => {
    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    template.allResourcesProperties('AWS::CloudWatch::Alarm', {
      AlarmActions: ['arn:test-partition:sns:test-region:test-account:security-alarms'],
    });
  });
});

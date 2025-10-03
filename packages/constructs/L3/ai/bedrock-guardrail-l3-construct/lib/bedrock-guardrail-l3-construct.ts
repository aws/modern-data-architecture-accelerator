/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { aws_bedrock as bedrock } from 'aws-cdk-lib';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { MdaaParamAndOutput } from '@aws-mdaa/construct';

// ---------------------------------------------
// Guardrail Interfaces and Types
// ---------------------------------------------

export type Strength = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * Q-ENHANCED-INTERFACE
 * Comprehensive content filter configuration for Bedrock guardrails with multiple content safety categories. Defines content filtering policies for sexual content, violence, hate speech, insults, misconduct, and prompt attacks with granular control over each category.
 *
 * Use cases: Content safety; Multi-category filtering; content control; Responsible AI implementation
 *
 * AWS: Amazon Bedrock guardrail content filters for content safety and responsible AI
 *
 * Validation: All properties are optional; each must be valid ContentFilterConfig if provided
 */
export interface ContentFilters {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional sexual content filter configuration controlling detection and blocking of sexual content in inputs and outputs. Provides content safety controls for sexual material with configurable strength levels for input and output filtering.
   *
   * Use cases: Sexual content filtering; Content safety; Appropriate content control; User protection
   *
   * AWS: Bedrock guardrail sexual content filter for content safety and appropriate material control
   *
   * Validation: Must be valid ContentFilterConfig if provided; controls sexual content detection and blocking
   **/
  readonly sexual?: ContentFilterConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional violence content filter configuration controlling detection and blocking of violent content in inputs and outputs. Provides content safety controls for violent material with configurable strength levels for violence filtering.
   *
   * Use cases: Violence filtering; Content safety; Appropriate content control; User protection from violent material
   *
   * AWS: Bedrock guardrail violence content filter for content safety and violence prevention
   *
   * Validation: Must be valid ContentFilterConfig if provided; controls violence content detection and blocking
   **/
  readonly violence?: ContentFilterConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional hate speech filter configuration controlling detection and blocking of hate speech content in inputs and outputs. Provides content safety controls for hate speech with configurable strength levels for hate speech prevention.
   *
   * Use cases: Hate speech prevention; Content safety; Inclusive environment; User protection from harmful content
   *
   * AWS: Bedrock guardrail hate speech filter for content safety and hate speech prevention
   *
   * Validation: Must be valid ContentFilterConfig if provided; controls hate speech detection and blocking
   **/
  readonly hate?: ContentFilterConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional insults filter configuration controlling detection and blocking of insulting content in inputs and outputs. Provides content safety controls for insulting language with configurable strength levels for respectful communication enforcement.
   *
   * Use cases: Insult prevention; Respectful communication; Content safety; Professional interaction maintenance
   *
   * AWS: Bedrock guardrail insults filter for content safety and respectful communication enforcement
   *
   * Validation: Must be valid ContentFilterConfig if provided; controls insult detection and blocking
   **/
  readonly insults?: ContentFilterConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional misconduct filter configuration controlling detection and blocking of misconduct-related content in inputs and outputs. Provides content safety controls for misconduct material with configurable strength levels for ethical behavior enforcement.
   *
   * Use cases: Misconduct prevention; Ethical behavior; Content safety; Professional standards maintenance
   *
   * AWS: Bedrock guardrail misconduct filter for content safety and ethical behavior enforcement
   *
   * Validation: Must be valid ContentFilterConfig if provided; controls misconduct detection and blocking
   **/
  readonly misconduct?: ContentFilterConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional prompt attack filter configuration controlling detection and blocking of prompt injection attacks in inputs and outputs. Provides security controls against prompt manipulation with configurable strength levels for AI system protection.
   *
   * Use cases: Prompt injection prevention; AI security; System protection; Attack mitigation
   *
   * AWS: Bedrock guardrail prompt attack filter for AI security and prompt injection prevention
   *
   * Validation: Must be valid ContentFilterConfig if provided; controls prompt attack detection and blocking
   **/
  readonly promptAttack?: ContentFilterConfig;
}

/**
 * Q-ENHANCED-INTERFACE
 * Content filter strength configuration for input and output filtering with granular control over detection sensitivity. Defines filtering strength levels for both user inputs and model outputs enabling content control with appropriate sensitivity settings.
 *
 * Use cases: Filter strength control; Input/output filtering; Sensitivity configuration; Content control granularity
 *
 * AWS: Amazon Bedrock guardrail content filter strength configuration for granular content control
 *
 * Validation: inputStrength and outputStrength are required; must be LOW, MEDIUM, or HIGH
 */
export interface ContentFilterConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required filter strength for user inputs controlling sensitivity of content detection in user-provided content. Defines how strictly the filter evaluates user inputs for content violations with LOW, MEDIUM, or HIGH sensitivity levels.
   *
   * Use cases: Input filtering; User content control; Detection sensitivity; Content safety for inputs
   *
   * AWS: Bedrock guardrail input filter strength for user content detection and safety control
   *
   * Validation: Must be LOW, MEDIUM, or HIGH; required for input content filtering configuration
   *   **/
  readonly inputStrength: Strength;
  /**
   * Q-ENHANCED-PROPERTY
   * Required filter strength for model outputs controlling sensitivity of content detection in AI-generated responses. Defines how strictly the filter evaluates model outputs for content violations with LOW, MEDIUM, or HIGH sensitivity levels.
   *
   * Use cases: Output filtering; AI response control; Detection sensitivity; Content safety for outputs
   *
   * AWS: Bedrock guardrail output filter strength for AI response detection and safety control
   *
   * Validation: Must be LOW, MEDIUM, or HIGH; required for output content filtering configuration
   *   **/
  readonly outputStrength: Strength;
}

/**
 * Q-ENHANCED-INTERFACE
 * Contextual grounding filter configuration for ensuring AI responses are grounded in source material and relevant to queries. Defines threshold-based filtering for grounding accuracy and query relevance with configurable sensitivity levels.
 *
 * Use cases: Response grounding; Source material adherence; Query relevance; Factual accuracy
 *
 * AWS: Amazon Bedrock guardrail contextual grounding filters for response accuracy and relevance
 *
 * Validation: grounding and relevance must be between 0.0 and 1.0 if provided
 */
export interface GroundingFilters {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional grounding threshold controlling how strictly responses must be grounded in source material with values from 0.0 to 1.0. Higher values enforce stricter grounding requirements ensuring AI responses closely adhere to provided source material and factual accuracy.
   *
   * Use cases: Source material adherence; Factual accuracy; Grounding enforcement; Response reliability
   *
   * AWS: Bedrock guardrail grounding threshold for source material adherence and factual accuracy
   *
   * Validation: Must be between 0.0 and 1.0 if provided; higher values enforce stricter grounding requirements
   **/
  readonly grounding?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional relevance threshold controlling how strictly responses must be relevant to user queries with values from 0.0 to 1.0. Higher values enforce stricter relevance requirements ensuring AI responses directly address user queries and maintain topical focus.
   *
   * Use cases: Query relevance; Topical focus; Response appropriateness; User query alignment
   *
   * AWS: Bedrock guardrail relevance threshold for query relevance and response appropriateness
   *
   * Validation: Must be between 0.0 and 1.0 if provided; higher values enforce stricter relevance requirements
   **/
  readonly relevance?: number;
}

/**
 * Q-ENHANCED-INTERFACE
 * Sensitive information filter configuration for PII detection and custom pattern matching providing privacy protection. Defines filters for personally identifiable information and custom regex patterns enabling data privacy and sensitive information protection.
 *
 * Use cases: PII protection; Data privacy; Sensitive information filtering; Custom pattern detection
 *
 * AWS: Amazon Bedrock guardrail sensitive information filters for PII protection and data privacy
 *
 * Validation: piiEntities and regexes must be valid arrays if provided
 */
export interface SensitiveInformationFilters {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of PII entity filter configurations for detecting and protecting personally identifiable information in inputs and outputs. Provides PII detection and protection with configurable entity types and actions for data privacy compliance.
   *
   * Use cases: PII detection; Data privacy compliance; Personal information protection; Privacy regulation adherence
   *
   * AWS: Bedrock guardrail PII entity filters for personal information detection and privacy protection
   *
   * Validation: Must be array of valid PiiEntityConfigProperty if provided; enables PII detection and protection
   *   **/
  readonly piiEntities?: bedrock.CfnGuardrail.PiiEntityConfigProperty[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of regex pattern filter configurations for detecting custom sensitive patterns in inputs and outputs. Provides flexible pattern-based filtering for organization-specific sensitive information and custom data protection requirements.
   *
   * Use cases: Custom pattern detection; Organization-specific filtering; Flexible data protection; Pattern-based security
   *
   * AWS: Bedrock guardrail regex filters for custom pattern detection and flexible data protection
   *
   * Validation: Must be array of valid RegexConfigProperty if provided; enables custom pattern detection and filtering
   *   **/
  readonly regexes?: bedrock.CfnGuardrail.RegexConfigProperty[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Comprehensive Bedrock guardrail configuration with content filtering, grounding controls, and sensitive information protection. Defines complete guardrail behavior including content safety, contextual grounding, PII protection, and custom messaging for responsible AI implementation.
 *
 * Use cases: Comprehensive AI safety; Content filtering; PII protection; Responsible AI implementation
 *
 * AWS: Amazon Bedrock guardrail configuration for AI safety and responsible AI deployment
 *
 * Validation: contentFilters is required; all other properties are optional with specific validation requirements
 */
export interface BedrockGuardrailProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional guardrail description providing documentation and context for guardrail purpose and configuration. Enables clear documentation of guardrail functionality and safety controls for operational understanding and management clarity.
   *
   * Use cases: Guardrail documentation; Configuration context; Operational understanding; Management clarity
   *
   * AWS: Bedrock guardrail description for documentation and operational context management
   *
   * Validation: Must be descriptive string if provided; enhances guardrail documentation and understanding
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required content filter configuration defining content safety controls across multiple categories. Provides content filtering for sexual content, violence, hate speech, insults, misconduct, and prompt attacks with configurable strength levels for each category.
   *
   * Use cases: Content safety; Multi-category filtering; content control; Responsible AI safety
   *
   * AWS: Bedrock guardrail content filters for content safety and responsible AI implementation
   *
   * Validation: Must be valid ContentFilters; required for guardrail content safety and filtering capabilities
   *   **/
  readonly contentFilters: ContentFilters;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom message displayed when user input is blocked by guardrail filters providing user feedback and guidance. Enables customized user communication when content is blocked for better user experience and clear safety messaging.
   *
   * Use cases: User feedback; Custom messaging; Safety communication; User experience enhancement
   *
   * AWS: Bedrock guardrail blocked input messaging for user feedback and safety communication
   *
   * Validation: Must be informative message string if provided; enhances user experience when content is blocked
   **/
  readonly blockedInputMessaging?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional custom message displayed when model output is blocked by guardrail filters providing user feedback and transparency. Enables customized communication when AI responses are blocked for transparency and user understanding of safety controls.
   *
   * Use cases: Output blocking feedback; Transparency; Safety communication; User understanding
   *
   * AWS: Bedrock guardrail blocked output messaging for transparency and safety communication
   *
   * Validation: Must be informative message string if provided; enhances transparency when outputs are blocked
   **/
  readonly blockedOutputsMessaging?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional contextual grounding filter configuration ensuring AI responses are grounded in source material and relevant to queries. Provides accuracy controls for response grounding and query relevance with configurable threshold-based filtering.
   *
   * Use cases: Response grounding; Source material adherence; Query relevance; Factual accuracy control
   *
   * AWS: Bedrock guardrail contextual grounding filters for response accuracy and relevance control
   *
   * Validation: Must be valid GroundingFilters if provided; enables response grounding and relevance control
   *   **/
  readonly contextualGroundingFilters?: GroundingFilters;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional sensitive information filter configuration for PII detection and custom pattern matching enabling data privacy protection. Provides PII detection, custom regex patterns, and sensitive information filtering for data privacy compliance.
   *
   * Use cases: PII protection; Data privacy compliance; Sensitive information filtering; Custom pattern detection
   *
   * AWS: Bedrock guardrail sensitive information filters for PII protection and data privacy compliance
   *
   * Validation: Must be valid SensitiveInformationFilters if provided; enables PII protection and data privacy
   *   **/
  readonly sensitiveInformationFilters?: SensitiveInformationFilters;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named guardrail properties mapping for multiple guardrail configuration enabling multi-guardrail deployment and management. Provides a mapping structure for deploying and managing multiple Bedrock guardrails with individual configurations and safety settings.
 * Use cases: Multi-guardrail deployment; Guardrail organization; Bulk configuration; Safety management
 * AWS: Multiple Bedrock guardrail configurations for organized multi-guardrail deployment and safety management
 * Validation: Keys must be valid guardrail names; values must be valid BedrockGuardrailProps
 */
export interface NamedGuardrailProps {
  /** @jsii ignore */
  [guardrailName: string]: BedrockGuardrailProps;
}

export interface BedrockGuardrailL3ConstructProps extends MdaaL3ConstructProps {
  readonly guardrailName: string;
  readonly guardrailConfig: BedrockGuardrailProps;
  readonly kmsKey: IKey;
}

// ---------------------------------------------
// Bedrock Guardrails L3 Construct
// ---------------------------------------------

export class BedrockGuardrailL3Construct extends MdaaL3Construct {
  public readonly guardrail: bedrock.CfnGuardrail;
  protected readonly props: BedrockGuardrailL3ConstructProps;

  constructor(scope: Construct, id: string, props: BedrockGuardrailL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.guardrail = this.createGuardrail(props.guardrailName, props.guardrailConfig, props.kmsKey);
  }

  private createGuardrail(guardrailName: string, config: BedrockGuardrailProps, kmsKey: IKey): bedrock.CfnGuardrail {
    const contentTypeMap: { [contentType: string]: string } = {
      promptAttack: 'PROMPT_ATTACK',
    };

    const filtersConfig = Object.entries(config.contentFilters).map(([contentType, contentFilter]) => {
      const resolvedContentType = contentTypeMap[contentType] ? contentTypeMap[contentType] : contentType.toUpperCase();
      return {
        type: resolvedContentType,
        inputStrength: contentFilter.inputStrength,
        outputStrength: contentFilter.outputStrength,
      };
    });

    const contentPolicyConfig: bedrock.CfnGuardrail.ContentPolicyConfigProperty = {
      filtersConfig: filtersConfig,
    };

    const contextualGroundingConfig = this.createContextualGroundingConfig(config.contextualGroundingFilters);
    const sensitiveInformationPolicyConfig = this.createSensitiveInformationConfig(config.sensitiveInformationFilters);

    const guardrailProps: bedrock.CfnGuardrailProps = {
      name: this.props.naming.resourceName(guardrailName, 50),
      description: config.description,
      kmsKeyArn: kmsKey.keyArn,
      blockedInputMessaging: config.blockedInputMessaging || 'Your input contains content that is not allowed.',
      blockedOutputsMessaging: config.blockedOutputsMessaging || 'The response contains content that is not allowed.',
      contentPolicyConfig: contentPolicyConfig,
      contextualGroundingPolicyConfig: contextualGroundingConfig,
      sensitiveInformationPolicyConfig: sensitiveInformationPolicyConfig,
    };

    const cfnGuardrail = new bedrock.CfnGuardrail(this, `${guardrailName}-guardrail`, guardrailProps);

    new MdaaParamAndOutput(this, {
      resourceType: 'guardrail',
      resourceId: guardrailName,
      name: 'arn',
      value: cfnGuardrail.attrGuardrailArn,
      ...this.props,
    });
    new MdaaParamAndOutput(this, {
      resourceType: 'guardrail',
      resourceId: guardrailName,
      name: 'id',
      value: cfnGuardrail.attrGuardrailId,
      ...this.props,
    });

    return cfnGuardrail;
  }

  private createContextualGroundingConfig(
    filters?: GroundingFilters,
  ): bedrock.CfnGuardrail.ContextualGroundingPolicyConfigProperty | undefined {
    if (!filters) return undefined;

    const groundingFilters: bedrock.CfnGuardrail.ContextualGroundingFilterConfigProperty[] = [];

    if (filters.grounding !== undefined) {
      groundingFilters.push({
        type: 'GROUNDING',
        threshold: filters.grounding,
      });
    }

    if (filters.relevance !== undefined) {
      groundingFilters.push({
        type: 'RELEVANCE',
        threshold: filters.relevance,
      });
    }

    return groundingFilters.length > 0 ? { filtersConfig: groundingFilters } : undefined;
  }

  private createSensitiveInformationConfig(
    filters?: SensitiveInformationFilters,
  ): bedrock.CfnGuardrail.SensitiveInformationPolicyConfigProperty | undefined {
    if (!filters) return undefined;

    const { piiEntities, regexes } = filters;

    if (piiEntities?.length || regexes?.length) {
      return {
        piiEntitiesConfig: piiEntities?.length ? piiEntities : undefined,
        regexesConfig: regexes?.length ? regexes : undefined,
      };
    }

    return undefined;
  }
}

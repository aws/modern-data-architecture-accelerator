/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { aws_bedrock as bedrock } from 'aws-cdk-lib';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

// ---------------------------------------------
// Guardrail Interfaces and Types
// ---------------------------------------------

export type Strength = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ContentFilters {
  readonly sexual?: ContentFilterConfig;
  readonly violence?: ContentFilterConfig;
  readonly hate?: ContentFilterConfig;
  readonly insults?: ContentFilterConfig;
  readonly misconduct?: ContentFilterConfig;
  readonly promptAttack?: ContentFilterConfig;
}

export interface ContentFilterConfig {
  /**
   * The strength of the filter for user inputs (LOW, MEDIUM, HIGH)
   */
  readonly inputStrength: Strength;
  /**
   * The strength of the filter for model outputs (LOW, MEDIUM, HIGH)
   */
  readonly outputStrength: Strength;
}

export interface GroundingFilters {
  /**
   * Threshold for grounding (0.0 to 1.0)
   * Higher values enforce stricter grounding to source material
   */
  readonly grounding?: number;
  /**
   * Threshold for relevance (0.0 to 1.0)
   * Higher values enforce stricter relevance to the query
   */
  readonly relevance?: number;
}

export interface SensitiveInformationFilters {
  /**
   * Configuration for PII entity filters
   */
  readonly piiEntities?: bedrock.CfnGuardrail.PiiEntityConfigProperty[];
  /**
   * Configuration for regex pattern filters
   */
  readonly regexes?: bedrock.CfnGuardrail.RegexConfigProperty[];
}

export interface BedrockGuardrailProps {
  /**
   * Optional description for the guardrail
   */
  readonly description?: string;
  /**
   * Array of content filters to apply to the guardrail
   * Each filter specifies a type (e.g., HATE, SEXUAL, VIOLENCE) and strength settings
   */
  readonly contentFilters: ContentFilters;
  /**
   * Custom message to display when input is blocked by the guardrail
   * If not provided, a default message will be used
   */
  readonly blockedInputMessaging?: string;
  /**
   * Custom message to display when output is blocked by the guardrail
   * If not provided, a default message will be used
   */
  readonly blockedOutputsMessaging?: string;
  /**
   * Configuration for contextual grounding filters
   */
  readonly contextualGroundingFilters?: GroundingFilters;
  /**
   * Configuration for sensitive information filters (PII detection and removal)
   */
  readonly sensitiveInformationFilters?: SensitiveInformationFilters;
}

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

    return new bedrock.CfnGuardrail(this, `${guardrailName}-guardrail`, guardrailProps);
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

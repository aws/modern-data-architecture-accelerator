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

export interface ContentFilters {
  /** Sexual content filter config */
  readonly sexual?: ContentFilterConfig;
  /** Violence content filter config */
  readonly violence?: ContentFilterConfig;
  /** Hate speech filter config */
  readonly hate?: ContentFilterConfig;
  /** Insults filter config */
  readonly insults?: ContentFilterConfig;
  /** Misconduct filter config */
  readonly misconduct?: ContentFilterConfig;
  /** Prompt attack filter config */
  readonly promptAttack?: ContentFilterConfig;
}

export interface ContentFilterConfig {
  /** Filter strength for user inputs (LOW, MEDIUM, HIGH) */
  readonly inputStrength: Strength;
  /** Filter strength for model outputs (LOW, MEDIUM, HIGH) */
  readonly outputStrength: Strength;
}

export interface GroundingFilters {
  /** Grounding threshold (0.0-1.0) for source material adherence */
  readonly grounding?: number;
  /** Relevance threshold (0.0-1.0) for query relevance */
  readonly relevance?: number;
}

export interface SensitiveInformationFilters {
  /** PII entity filter configurations */
  readonly piiEntities?: bedrock.CfnGuardrail.PiiEntityConfigProperty[];
  /** Custom regex pattern filters */
  readonly regexes?: bedrock.CfnGuardrail.RegexConfigProperty[];
}

export interface BedrockGuardrailProps {
  /** Guardrail description */
  readonly description?: string;
  /** Content filter configuration across safety categories */
  readonly contentFilters: ContentFilters;
  /** Custom message when user input is blocked */
  readonly blockedInputMessaging?: string;
  /** Custom message when model output is blocked */
  readonly blockedOutputsMessaging?: string;
  /** Contextual grounding filters for response accuracy */
  readonly contextualGroundingFilters?: GroundingFilters;
  /** Sensitive information filters for PII and custom patterns */
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

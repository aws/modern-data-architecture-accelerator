/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { aws_bedrock as bedrock, Fn, Lazy, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { MdaaParamAndOutput } from '@aws-mdaa/construct';
import {
  createGuardrailInterventionAlarms,
  GuardrailAlarmSettings,
  GuardrailInterventionAlarmProps,
} from './guardrail-alarms';
import { createHash } from 'node:crypto';

// ---------------------------------------------
// Guardrail Interfaces and Types
// ---------------------------------------------

export type Strength = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';

/** Action a guardrail policy takes on a detection. NONE is detect-only: content passes and the detection is reported in the guardrail trace. */
export type GuardrailAction = 'BLOCK' | 'NONE';

/** Per-direction controls shared by content filters, denied topics and word filters. Unset fields are left to the Bedrock default. */
export interface GuardrailDirectionControls {
  /**
   * Action taken when the policy detects content in a prompt. NONE runs the policy in
   * detect-only mode, so it can be tuned against guardrail traces before it blocks anything.
   *
   * Use cases: Detect-only rollout of a new policy; Enforcing a policy on prompts
   *
   * AWS: inputAction on the Bedrock Guardrail policy entry
   *
   * Validation: Optional; BLOCK or NONE
   * @default BLOCK
   */
  readonly inputAction?: GuardrailAction;
  /**
   * Action taken when the policy detects content in a model response. NONE runs the policy
   * in detect-only mode.
   *
   * Use cases: Detect-only rollout of a new policy; Enforcing a policy on responses
   *
   * AWS: outputAction on the Bedrock Guardrail policy entry
   *
   * Validation: Optional; BLOCK or NONE
   * @default BLOCK
   */
  readonly outputAction?: GuardrailAction;
  /**
   * Whether the policy evaluates prompts. Set false to skip evaluation of prompts entirely.
   *
   * Use cases: Applying a policy to responses only
   *
   * AWS: inputEnabled on the Bedrock Guardrail policy entry
   *
   * Validation: Optional; Boolean
   * @default true
   */
  readonly inputEnabled?: boolean;
  /**
   * Whether the policy evaluates model responses. Set false to skip evaluation of responses entirely.
   *
   * Use cases: Applying a policy to prompts only
   *
   * AWS: outputEnabled on the Bedrock Guardrail policy entry
   *
   * Validation: Optional; Boolean
   * @default true
   */
  readonly outputEnabled?: boolean;
}

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
  /** Prompt attack filter config. Bedrock evaluates prompt attacks on inputs only, so outputStrength must be NONE */
  readonly promptAttack?: ContentFilterConfig;
}

export interface ContentFilterConfig extends GuardrailDirectionControls {
  /** Filter strength for user inputs (NONE, LOW, MEDIUM, HIGH) */
  readonly inputStrength: Strength;
  /** Filter strength for model outputs (NONE, LOW, MEDIUM, HIGH). Must be NONE for promptAttack */
  readonly outputStrength: Strength;
}

export interface GroundingFilters {
  /** Grounding threshold (0.0-1.0) for source material adherence */
  readonly grounding?: number;
  /** Relevance threshold (0.0-1.0) for query relevance */
  readonly relevance?: number;
}

export interface DeniedTopic extends GuardrailDirectionControls {
  /**
   * Name of the topic, as a noun or noun phrase (for example 'Investment Advice'). Must be
   * unique within the guardrail.
   *
   * Use cases: Identifying the topic in guardrail traces
   *
   * AWS: Bedrock Guardrail topicPolicyConfig.topicsConfig[].name
   *
   * Validation: Required; 1-100 characters; letters, digits, spaces and - _ ! ? .
   * @pattern ^[0-9a-zA-Z_ !?.-]{1,100}$
   */
  readonly name: string;
  /**
   * What the topic covers, stated as a definition rather than an instruction. Avoid negative
   * definitions and exceptions ("anything except ..."), and use word filters, not topics, to
   * catch specific names or terms.
   *
   * Use cases: Keeping an assistant out of investment advice, medical diagnosis or legal advice
   *
   * AWS: Bedrock Guardrail topicPolicyConfig.topicsConfig[].definition
   *
   * Validation: Required; 1-200 characters (Classic safeguard tier limit)
   * @minLength 1
   * @maxLength 200
   */
  readonly definition: string;
  /**
   * Sample prompts or responses that belong to the topic, used to improve detection.
   *
   * Use cases: Sharpening detection of a broad topic
   *
   * AWS: Bedrock Guardrail topicPolicyConfig.topicsConfig[].examples
   *
   * Validation: Optional; up to 5 phrases of 1-100 characters each
   * @maxItems 5
   */
  readonly examples?: string[];
}

export interface WordFilters extends GuardrailDirectionControls {
  /**
   * Words or phrases (up to three words each) the guardrail filters. Matching is
   * case-insensitive and whole-word, so 'competitor' does not match 'competitors'. The spacing
   * between a phrase's words must match exactly: 'off the record' does not match a prompt with
   * extra spaces, a tab or a line break between those words. Prefer single-word entries, which
   * spacing cannot affect, and list each spacing of a phrase that you need to catch as its own
   * entry. Must be unique ignoring case; entries that differ only in spacing are not duplicates.
   *
   * Use cases: Blocking competitor names; Blocking internal project codenames; Blocking legal matter names
   *
   * AWS: Bedrock Guardrail wordPolicyConfig.wordsConfig
   *
   * Validation: Optional; up to 10,000 entries of 1-100 characters each; at least one of words or profanity is required
   * @minItems 1
   * @maxItems 10000
   */
  readonly words?: string[];
  /**
   * Turns on the AWS-managed profanity word list, which AWS updates continually.
   *
   * Use cases: Brand safety for customer-facing assistants
   *
   * AWS: Bedrock Guardrail wordPolicyConfig.managedWordListsConfig (type PROFANITY)
   *
   * Validation: Optional; Boolean
   * @default false
   */
  readonly profanity?: boolean;
}

export interface SensitiveInformationFilters {
  /**
   * PII entity filter configurations. `action` is required on every entry, even when
   * `inputAction` and `outputAction` are both set. ANONYMIZE on input lets a prompt that
   * contains PII reach the model with the PII masked, rather than rejecting it.
   *
   * Use cases: Masking customer names in support queries; Blocking social security numbers
   *
   * AWS: Bedrock Guardrail sensitiveInformationPolicyConfig.piiEntitiesConfig
   *
   * Validation: Optional; each entry needs type (for example NAME, EMAIL, US_SOCIAL_SECURITY_NUMBER) and action (BLOCK, ANONYMIZE or NONE)
   */
  readonly piiEntities?: bedrock.CfnGuardrail.PiiEntityConfigProperty[];
  /** Custom regex pattern filters */
  readonly regexes?: bedrock.CfnGuardrail.RegexConfigProperty[];
}

export interface BedrockGuardrailProps {
  /** Guardrail description */
  readonly description?: string;
  /**
   * Content filter configuration across safety categories. May be empty ({}) when the guardrail
   * configures another policy, such as denied topics or word filters.
   */
  readonly contentFilters: ContentFilters;
  /** Custom message when user input is blocked */
  readonly blockedInputMessaging?: string;
  /** Custom message when model output is blocked */
  readonly blockedOutputsMessaging?: string;
  /** Contextual grounding filters for response accuracy */
  readonly contextualGroundingFilters?: GroundingFilters;
  /** Sensitive information filters for PII and custom patterns */
  readonly sensitiveInformationFilters?: SensitiveInformationFilters;
  /**
   * Intervention alarms on this guardrail, covering every guardrail version. Requires the
   * module-level `guardrailAlarms` block, which sets the notification target and timing.
   *
   * Use cases: alerting on spikes in blocked content, intervention-rate monitoring
   *
   * AWS: CloudWatch alarms on AWS/Bedrock/Guardrails InvocationsIntervened
   *
   * Validation: Optional; GuardrailInterventionAlarmProps; at least one threshold
   */
  readonly interventionAlarm?: GuardrailInterventionAlarmProps;
  /**
   * Topics the guardrail denies. Bedrock evaluates topics in the order given, and the order
   * can change whether a borderline prompt is blocked.
   *
   * Use cases: Keeping an assistant within its intended scope; Regulated advice restrictions
   *
   * AWS: Bedrock Guardrail topicPolicyConfig
   *
   * Validation: Optional; 1-30 topics with unique names
   * @minItems 1
   * @maxItems 30
   */
  readonly deniedTopics?: DeniedTopic[];
  /**
   * Custom word and phrase filters, and the AWS-managed profanity list. A match with action
   * BLOCK returns the guardrail's blocked input or output messaging.
   *
   * Use cases: Blocking competitor or trademarked names; Blocking confidential codenames; Profanity filtering
   *
   * AWS: Bedrock Guardrail wordPolicyConfig
   *
   * Validation: Optional; at least one of words or profanity is required
   */
  readonly wordFilters?: WordFilters;
  /**
   * Publishes an immutable, numbered version of the guardrail to SSM, beside `arn` and `id`, as
   * `guardrail/<name>/version` (the number) and `guardrail/<name>/version-arn` (the versioned ARN,
   * `<guardrail ARN>:<number>`). Presence of this block opts in (an empty object accepts all
   * defaults); omit it to publish only the mutable `DRAFT`. Read both from SSM: the stack output
   * exports change on every new version, and importing one from another stack blocks publishing the
   * next one.
   *
   * A new version is published whenever the guardrail properties change as rendered, including
   * through custom CDK aspects but not through tags, and harnesses that reference this guardrail by
   * `config:<name>` move to it. Turning publishing off removes the SSM `version` and `version-arn`
   * parameters and, unless `retainVersions` is set, deletes the published version.
   *
   * IAM `bedrock:GuardrailIdentifier` conditions take the versioned ARN; the bare guardrail ARN
   * matches only `DRAFT`. Account-level enforcement and a harness `guardrail.version` take the number.
   *
   * Use cases: Pinning agents to a reviewed guardrail configuration; staging guardrail changes;
   * IAM `bedrock:GuardrailIdentifier` conditions and account-level enforcement, which need a
   * numbered version
   *
   * AWS: AWS::Bedrock::GuardrailVersion
   *
   * Validation: Optional; GuardrailVersionPublishingProps; presence opts in
   */
  readonly versionPublishing?: GuardrailVersionPublishingProps;
}

/**
 * Configuration for publishing numbered versions of a guardrail. Presence of this configuration
 * opts in to version publishing; an empty object accepts all defaults.
 *
 * Use cases: Pinning agents to a reviewed guardrail configuration; staging guardrail changes
 *
 * AWS: AWS::Bedrock::GuardrailVersion
 *
 * Validation: presence of this configuration opts in to version publishing
 */
export interface GuardrailVersionPublishingProps {
  /**
   * Keeps a published version when a configuration change supersedes it or when publishing is
   * turned off, so consumers outside the stack pinned to its number keep working until they move
   * to the new one. Retained versions are no longer managed by the stack and count against the
   * Bedrock quota of 20 versions per guardrail, which cannot be raised; once it is reached,
   * publishing fails until old versions are deleted with `DeleteGuardrail`.
   *
   * When false, a superseded version is deleted after the stack has moved its floating harnesses
   * to the new one, so use it only when nothing pins a version number: consumers outside the stack
   * cannot move before the deploy that creates the new number, and a harness endpoint with a
   * `targetVersion` stays on a harness version that references the old guardrail version, which
   * does not prevent its deletion. A version Bedrock refuses to delete is left behind outside the
   * stack.
   *
   * A version whose creating deploy rolls back is deleted either way (`DeletionPolicy:
   * RetainExceptOnCreate`).
   *
   * Use cases: Consumers outside this module pinned to a specific version number; harness endpoints
   * pinned with `targetVersion`; harnesses pinned to an older version with `guardrail.version`
   *
   * AWS: UpdateReplacePolicy (Retain) and DeletionPolicy (RetainExceptOnCreate) of
   * AWS::Bedrock::GuardrailVersion
   *
   * Validation: Optional; Boolean
   * @default false
   */
  readonly retainVersions?: boolean;
}

export interface NamedGuardrailProps {
  /** @jsii ignore */
  [guardrailName: string]: BedrockGuardrailProps;
}

export interface BedrockGuardrailL3ConstructProps extends MdaaL3ConstructProps {
  readonly guardrailName: string;
  readonly guardrailConfig: BedrockGuardrailProps;
  readonly kmsKey: IKey;
  /**
   * Notification target and timing for the guardrail's intervention alarms. Required when
   * `guardrailConfig.interventionAlarm` is set.
   *
   * @default - no alarms; setting `interventionAlarm` without this throws
   */
  readonly alarmSettings?: GuardrailAlarmSettings;
}

/** A resolved template fragment for the guardrail, whose required name and messages always render `Properties`. */
interface RenderedTemplate {
  readonly Resources?: { [logicalId: string]: { readonly Properties?: { readonly [name: string]: unknown } } };
}

// ---------------------------------------------
// Helpers
// ---------------------------------------------

/** Picks the per-direction fields so that unset fields stay absent from the rendered template. */
function directionControls(controls: GuardrailDirectionControls): GuardrailDirectionControls {
  return {
    inputAction: controls.inputAction,
    outputAction: controls.outputAction,
    inputEnabled: controls.inputEnabled,
    outputEnabled: controls.outputEnabled,
  };
}

const MAX_ENTRY_LENGTH = 100;

/**
 * Bedrock limits each topic example and filtered word to 1-100 characters. Checked here rather
 * than in the config schema, which cannot constrain the items of a string array.
 */
function assertEntryLengths(guardrailName: string, field: string, entries: string[]): void {
  const invalid = entries.find(entry => entry.trim().length === 0 || entry.length > MAX_ENTRY_LENGTH);
  if (invalid !== undefined) {
    throw new Error(
      `Guardrail '${guardrailName}': ${field} entries must be 1-${MAX_ENTRY_LENGTH} characters, got '${invalid}'.`,
    );
  }
}

/** Returns the first value whose key repeats an earlier value's key, or undefined if all keys are unique. */
function findDuplicate(values: string[], key: (value: string) => string = value => value): string | undefined {
  const seen = new Set<string>();
  return values.find(value => {
    const valueKey = key(value);
    if (seen.has(valueKey)) return true;
    seen.add(valueKey);
    return false;
  });
}

// ---------------------------------------------
// Bedrock Guardrails L3 Construct
// ---------------------------------------------

/**
 * Deploys a KMS-encrypted Bedrock guardrail and, when `versionPublishing` is configured, an
 * immutable numbered version of it. Publishes the guardrail ARN and id, and the version number
 * when one is published, to SSM.
 */
export class BedrockGuardrailL3Construct extends MdaaL3Construct {
  public readonly guardrail: bedrock.CfnGuardrail;
  /** The published version, when `versionPublishing` is configured. */
  public readonly guardrailVersion?: bedrock.CfnGuardrailVersion;
  /** The version consumers should reference: the published version number, otherwise `DRAFT`. */
  public readonly referenceVersion: string;
  protected readonly props: BedrockGuardrailL3ConstructProps;

  constructor(scope: Construct, id: string, props: BedrockGuardrailL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.guardrail = this.createGuardrail(props.guardrailName, props.guardrailConfig, props.kmsKey);
    this.guardrailVersion = props.guardrailConfig.versionPublishing
      ? this.createGuardrailVersion(props.guardrailName, props.guardrailConfig.versionPublishing)
      : undefined;
    this.referenceVersion = this.guardrailVersion?.attrVersion ?? this.guardrail.attrVersion;

    const interventionAlarm = props.guardrailConfig.interventionAlarm;
    if (interventionAlarm) {
      if (!props.alarmSettings) {
        throw new Error(
          `Guardrail '${props.guardrailName}' sets interventionAlarm, which requires the module-level ` +
            'guardrailAlarms block to set the notification target.',
        );
      }
      createGuardrailInterventionAlarms(this, {
        naming: props.naming,
        guardrailName: props.guardrailName,
        guardrailArn: this.guardrail.attrGuardrailArn,
        alarm: interventionAlarm,
        settings: props.alarmSettings,
      });
    }
  }

  private createGuardrail(guardrailName: string, config: BedrockGuardrailProps, kmsKey: IKey): bedrock.CfnGuardrail {
    const contentPolicyConfig = this.createContentPolicyConfig(guardrailName, config.contentFilters);
    const contextualGroundingConfig = this.createContextualGroundingConfig(config.contextualGroundingFilters);
    const sensitiveInformationPolicyConfig = this.createSensitiveInformationConfig(config.sensitiveInformationFilters);
    const topicPolicyConfig = this.createTopicPolicyConfig(guardrailName, config.deniedTopics);
    const wordPolicyConfig = this.createWordPolicyConfig(guardrailName, config.wordFilters);
    const policies = [
      contentPolicyConfig,
      contextualGroundingConfig,
      sensitiveInformationPolicyConfig,
      topicPolicyConfig,
      wordPolicyConfig,
    ];
    // A guardrail with no policies filters nothing, so treat it as a misconfiguration.
    if (policies.every(policy => policy === undefined)) {
      throw new Error(
        `Guardrail '${guardrailName}': no policies configured. Set at least one of contentFilters, deniedTopics, ` +
          'wordFilters, sensitiveInformationFilters or contextualGroundingFilters.',
      );
    }

    const guardrailProps: bedrock.CfnGuardrailProps = {
      name: this.props.naming.withResourceType(MdaaResourceType.BEDROCK_GUARDRAIL).resourceName(guardrailName, 50),
      description: config.description,
      kmsKeyArn: kmsKey.keyArn,
      blockedInputMessaging: config.blockedInputMessaging || 'Your input contains content that is not allowed.',
      blockedOutputsMessaging: config.blockedOutputsMessaging || 'The response contains content that is not allowed.',
      contentPolicyConfig: contentPolicyConfig,
      contextualGroundingPolicyConfig: contextualGroundingConfig,
      sensitiveInformationPolicyConfig: sensitiveInformationPolicyConfig,
      topicPolicyConfig: topicPolicyConfig,
      wordPolicyConfig: wordPolicyConfig,
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

  private createContentPolicyConfig(
    guardrailName: string,
    contentFilters: ContentFilters,
  ): bedrock.CfnGuardrail.ContentPolicyConfigProperty | undefined {
    const contentTypeMap: { [contentType: string]: string } = {
      promptAttack: 'PROMPT_ATTACK',
    };

    const filtersConfig = Object.entries(contentFilters).map(([contentType, contentFilter]) => {
      const resolvedContentType = contentTypeMap[contentType] ? contentTypeMap[contentType] : contentType.toUpperCase();
      // Bedrock rejects any other value at deploy time ("PROMPT ATTACK content filter strength for
      // response must be NONE"), after the guardrail's KMS key has already been created.
      if (resolvedContentType === 'PROMPT_ATTACK' && contentFilter.outputStrength !== 'NONE') {
        throw new Error(
          `Guardrail '${guardrailName}': promptAttack outputStrength must be NONE, got '${contentFilter.outputStrength}'. ` +
            'Bedrock evaluates prompt attacks on inputs only.',
        );
      }
      return {
        type: resolvedContentType,
        inputStrength: contentFilter.inputStrength,
        outputStrength: contentFilter.outputStrength,
        ...directionControls(contentFilter),
      };
    });

    // Bedrock requires at least one entry in filtersConfig, so an empty contentFilters omits the policy.
    return filtersConfig.length > 0 ? { filtersConfig: filtersConfig } : undefined;
  }

  private createTopicPolicyConfig(
    guardrailName: string,
    deniedTopics?: DeniedTopic[],
  ): bedrock.CfnGuardrail.TopicPolicyConfigProperty | undefined {
    if (!deniedTopics?.length) return undefined;

    deniedTopics.forEach(topic =>
      assertEntryLengths(guardrailName, `deniedTopics '${topic.name}' examples`, topic.examples ?? []),
    );
    const duplicateName = findDuplicate(deniedTopics.map(topic => topic.name));
    if (duplicateName !== undefined) {
      throw new Error(`Guardrail '${guardrailName}': deniedTopics name '${duplicateName}' is used more than once.`);
    }

    return {
      // Order is preserved: Bedrock's evaluation outcome can depend on topic order.
      topicsConfig: deniedTopics.map(topic => ({
        type: 'DENY',
        name: topic.name,
        definition: topic.definition,
        examples: topic.examples,
        ...directionControls(topic),
      })),
    };
  }

  private createWordPolicyConfig(
    guardrailName: string,
    wordFilters?: WordFilters,
  ): bedrock.CfnGuardrail.WordPolicyConfigProperty | undefined {
    if (!wordFilters) return undefined;

    const words = wordFilters.words ?? [];
    if (words.length === 0 && !wordFilters.profanity) {
      throw new Error(`Guardrail '${guardrailName}': wordFilters must set words, profanity: true, or both.`);
    }

    assertEntryLengths(guardrailName, 'wordFilters words', words);
    // Bedrock matches case-insensitively but matches spacing exactly, so entries that differ only in
    // spacing are distinct filters.
    const duplicateWord = findDuplicate(words, word => word.toLowerCase());
    if (duplicateWord !== undefined) {
      throw new Error(`Guardrail '${guardrailName}': wordFilters word '${duplicateWord}' is listed more than once.`);
    }

    const controls = directionControls(wordFilters);
    return {
      wordsConfig: words.length > 0 ? words.map(text => ({ text, ...controls })) : undefined,
      managedWordListsConfig: wordFilters.profanity ? [{ type: 'PROFANITY', ...controls }] : undefined,
    };
  }

  /**
   * A version is a snapshot that does not follow later guardrail edits, and `Description` is
   * create-only, so a hash of the guardrail properties in it makes CloudFormation replace the
   * version - publishing a new one from the updated guardrail - whenever the configuration changes.
   * Bedrock rejects concurrent version creation on one guardrail, so there is exactly one version
   * resource per guardrail.
   */
  private createGuardrailVersion(
    guardrailName: string,
    publishing: GuardrailVersionPublishingProps,
  ): bedrock.CfnGuardrailVersion {
    const guardrailVersion = new bedrock.CfnGuardrailVersion(this, `${guardrailName}-guardrail-version`, {
      guardrailIdentifier: this.guardrail.attrGuardrailId,
      description: Lazy.uncachedString({
        produce: () => `Published by MDAA from guardrail configuration hash ${this.renderedGuardrailHash()}`,
      }),
    });
    if (publishing.retainVersions) {
      // Not RETAIN: a version kept after its creating deploy rolled back is named by no SSM parameter,
      // so nothing finds it to prune, and it still counts against the 20-version quota.
      guardrailVersion.applyRemovalPolicy(RemovalPolicy.RETAIN_ON_UPDATE_OR_DELETE);
    }

    new MdaaParamAndOutput(this, {
      resourceType: 'guardrail',
      resourceId: guardrailName,
      name: 'version',
      value: guardrailVersion.attrVersion,
      ...this.props,
    });
    // The form `bedrock:GuardrailIdentifier` carries for a numbered version. MDAA `ssm-*:` references
    // replace a whole config value, so consumers cannot join it from `arn` and `version` themselves.
    new MdaaParamAndOutput(this, {
      resourceType: 'guardrail',
      resourceId: guardrailName,
      name: 'version-arn',
      value: Fn.join(':', [this.guardrail.attrGuardrailArn, guardrailVersion.attrVersion]),
      ...this.props,
    });

    return guardrailVersion;
  }

  /**
   * Hashes the guardrail's properties as they render into the template, so property overrides and
   * CDK aspects applied after construction (MDAA custom aspects among them) are covered. Tags are
   * left out: they are not part of what a version captures, and a tag change in the MDAA config
   * would otherwise publish a version. The properties are hashed resolved: token strings differ
   * between synths and would publish a new version on every deploy.
   */
  private renderedGuardrailHash(): string {
    // CfnResource has no public accessor for its rendered properties including overrides. The
    // rendered resource is itself a token, so it is resolved before its properties are read.
    // A CDK upgrade that changes this internal shape fails synth here instead of hashing something
    // else, which would republish a version on every deploy or stop noticing configuration changes.
    const resolved: RenderedTemplate = Stack.of(this).resolve(this.guardrail._toCloudFormation());
    const resources = Object.values(resolved?.Resources ?? {});
    const properties = resources[0]?.Properties;
    if (resources.length !== 1 || typeof properties?.['Name'] !== 'string') {
      throw new Error(
        `Guardrail '${this.props.guardrailName}': cannot read the guardrail's rendered properties to ` +
          'hash its version; the aws-cdk-lib CfnResource rendering has changed.',
      );
    }
    const untagged = Object.fromEntries(Object.entries(properties).filter(([name]) => name !== 'Tags'));
    return createHash('sha256')
      .update(JSON.stringify([untagged]))
      .digest('hex');
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

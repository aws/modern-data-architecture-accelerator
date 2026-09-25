/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AgentcoreAuthorizerConfigProperty,
  buildAgentcoreLifecycleConfiguration,
  buildAgentcoreVpcNetworkConfiguration,
  buildCustomJwtAuthorizer,
  validateAgentcoreVpcNetworkMembers,
  validateCustomJwtAuthorizer,
  validateLogRetentionDays,
} from '@aws-mdaa/agentcore-shared';
import { aws_bedrockagentcore as bedrockagentcore } from 'aws-cdk-lib';
import {
  BedrockAgentcoreHarnessL3ConstructProps,
  HarnessContainerProperty,
  HarnessEndpointProperty,
  HarnessGuardrailAssociation,
  HarnessGuardrailTrace,
  HarnessLifecycleProperty,
  HarnessModelConfigProperty,
  HarnessNetworkProperty,
  HarnessSkillProperty,
  HarnessTruncationProperty,
  HarnessTruncationStrategy,
  NamedHarnessToolProps,
} from './bedrock-agentcore-harness-l3-construct';
import { validateHarnessVpcEndpoints } from './vpc-endpoint-access';

// allowedTools list upper bound from the CloudFormation `Harness.AllowedTools` spec. An empty list
// is treated as unset (field omitted -> all tools allowed), so only the maximum is enforced.
const ALLOWED_TOOLS_MAX = 64;
// Model sampling bounds from the CloudFormation `HarnessBedrockModelConfig` spec.
const TEMPERATURE_MIN = 0;
const TEMPERATURE_MAX = 2;
const TOP_P_MIN = 0;
const TOP_P_MAX = 1;
// Tool `Name` constraints from the CloudFormation `HarnessTool` spec: pattern `^[a-zA-Z0-9_-]+$`,
// 1-64 chars.
const TOOL_NAME_PATTERN = /^[a-zA-Z0-9_-]+$/;
const TOOL_NAME_MAX_LENGTH = 64;
// InlineFunction `Description` bounds from the CloudFormation `HarnessInlineFunctionConfig` spec:
// required, 1-4096 chars.
const INLINE_FUNCTION_DESCRIPTION_MAX_LENGTH = 4096;
// Endpoint `Description` bounds from the CloudFormation `HarnessEndpoint` spec: optional, 1-256 chars.
const ENDPOINT_DESCRIPTION_MAX_LENGTH = 256;
/**
 * Fail-fast validation of the entire config before any resource is built, covering constraints the
 * L1/CloudFormation would otherwise only reject at deploy: required strings, model sampling bounds,
 * loop limits, log retention, tools, and inbound authorizer. Mirrors the Gateway L3's synth-time
 * validation and reuses the shared `validateLogRetentionDays` / `validateCustomJwtAuthorizer`
 * helpers.
 */
export function validateHarnessConfig(props: BedrockAgentcoreHarnessL3ConstructProps): void {
  if (!props.modelId || props.modelId.trim().length === 0) {
    throw new Error('Harness "modelId" is required and must be a non-empty string.');
  }
  validateModelId(props.modelId);
  if (!props.systemPrompt || props.systemPrompt.trim().length === 0) {
    throw new Error('Harness "systemPrompt" is required and must be a non-empty string.');
  }
  validateModelConfig(props.modelConfig);
  if (props.maxIterations !== undefined && (!Number.isInteger(props.maxIterations) || props.maxIterations < 1)) {
    throw new Error(`Harness "maxIterations" must be an integer >= 1; received ${props.maxIterations}.`);
  }
  if (props.timeoutSeconds !== undefined && (!Number.isInteger(props.timeoutSeconds) || props.timeoutSeconds < 1)) {
    throw new Error(`Harness "timeoutSeconds" must be an integer >= 1; received ${props.timeoutSeconds}.`);
  }
  if (props.maxTokens !== undefined && (!Number.isInteger(props.maxTokens) || props.maxTokens < 1)) {
    throw new Error(`Harness "maxTokens" must be an integer >= 1; received ${props.maxTokens}.`);
  }
  validateLogRetentionDays(props.logRetentionDays, 'logRetentionDays');
  validateTools(props.tools);
  validateAllowedTools(props.allowedTools);
  validateSkills(props.skills);
  validateNetworkConfiguration(props.networkConfiguration);
  validateHarnessVpcEndpoints(props.networkConfiguration, props.vpcEndpointAccess);
  validateContainer(props.container);
  validateEndpoint(props.endpoint);
  validateTruncation(props.truncation);
  validateGuardrail(props.guardrail);
  if (props.authorizerConfiguration?.customJwt) {
    validateCustomJwtAuthorizer(props.authorizerConfiguration.customJwt);
  }
}

/**
 * Validates the optional `allowedTools` allowlist against the CloudFormation `Harness.AllowedTools`
 * upper bound (64 entries) and rejects blank patterns, so misconfiguration fails at synth. An empty
 * list is treated the same as unset (the field is omitted, so all tools are allowed) and passes.
 */
export function validateAllowedTools(allowedTools?: string[]): void {
  if (allowedTools === undefined || allowedTools.length === 0) {
    return;
  }
  if (allowedTools.length > ALLOWED_TOOLS_MAX) {
    throw new Error(
      `Harness "allowedTools" must contain at most ${ALLOWED_TOOLS_MAX} entries; received ${allowedTools.length}.`,
    );
  }
  allowedTools.forEach(pattern => {
    if (!pattern || pattern.trim().length === 0) {
      throw new Error('Harness "allowedTools" entries must be non-empty strings.');
    }
  });
}

/**
 * Validates each skill's `path` is a non-empty string, so a misconfigured skill fails at synth
 * rather than deploy.
 */
export function validateSkills(skills?: HarnessSkillProperty[]): void {
  (skills ?? []).forEach((skill, index) => {
    if (!skill.path || skill.path.trim().length === 0) {
      throw new Error(`Harness "skills[${index}].path" is required and must be a non-empty string.`);
    }
  });
}

/**
 * Validates the required VPC network configuration against the CloudFormation `VpcConfig` bounds:
 * `networkConfiguration` itself is required (MDAA enforces VPC mode - there is no public-network
 * option), and `securityGroups` and `subnets` are each required with the CloudFormation bounds
 * (the bound-check itself is shared with the Runtime construct via
 * {@link validateAgentcoreVpcNetworkMembers}).
 */
export function validateNetworkConfiguration(networkConfiguration?: HarnessNetworkProperty): void {
  if (!networkConfiguration) {
    throw new Error(
      'Harness "networkConfiguration" is required: MDAA enforces VPC network isolation for the harness ' +
        '(NetworkMode: VPC). Provide securityGroups and subnets.',
    );
  }
  const { securityGroups, subnets } = networkConfiguration;
  validateAgentcoreVpcNetworkMembers(securityGroups, subnets, 'Harness');
}

/**
 * Validates the optional container's `containerUri` is a non-empty string. Full ECR-URI format is
 * enforced by `parseEcrRepositoryArn` when the execution-role pull grant is scoped.
 */
export function validateContainer(container?: HarnessContainerProperty): void {
  if (!container) {
    return;
  }
  if (!container.containerUri || container.containerUri.trim().length === 0) {
    throw new Error('Harness "container.containerUri" is required and must be a non-empty string.');
  }
}

/**
 * Validates the optional endpoint configuration against the CloudFormation `HarnessEndpoint` bounds:
 * `description` is 1-256 characters and `targetVersion` matches `^([1-9][0-9]{0,4})$`, so either
 * failing fails at synth rather than deploy.
 *
 * Each field is guarded individually - a single function-wide `if (!endpoint?.targetVersion) return`
 * would skip every other field whenever `targetVersion` is unset, and would also let a
 * present-but-empty `targetVersion` through (empty string is falsy), which `?? attrVersion` then
 * preserves rather than defaulting, emitting `TargetVersion: ""` against the CFN pattern.
 */
export function validateEndpoint(endpoint?: HarnessEndpointProperty): void {
  if (!endpoint) {
    return;
  }
  if (endpoint.description !== undefined) {
    const length = endpoint.description.length;
    if (length < 1 || length > ENDPOINT_DESCRIPTION_MAX_LENGTH) {
      throw new Error(
        `Harness "endpoint.description" must be 1-${ENDPOINT_DESCRIPTION_MAX_LENGTH} characters; ` +
          `received ${length}.`,
      );
    }
  }
  if (endpoint.targetVersion !== undefined && !/^[1-9]\d{0,4}$/.test(endpoint.targetVersion)) {
    throw new Error(
      String.raw`Harness "endpoint.targetVersion" must match ^([1-9]\d{0,4})$; received "${endpoint.targetVersion}".`,
    );
  }
}

/**
 * Validates the optional truncation configuration: `strategy` is a {@link HarnessTruncationStrategy}
 * value, and the strategy-specific tuning fields both fall within their numeric bounds and are only
 * set for the matching strategy (sliding-window tuning with a summarization strategy, or vice versa,
 * would be silently ignored at deploy). Fails fast at synth.
 */
export function validateTruncation(truncation?: HarnessTruncationProperty): void {
  if (!truncation) {
    return;
  }
  validateEnumMember(truncation.strategy, HarnessTruncationStrategy, 'truncation.strategy');
  const { strategy, messagesCount, preserveRecentMessages, summarizationSystemPrompt, summaryRatio } = truncation;

  const slidingWindowSet = messagesCount !== undefined;
  const summarizationSet =
    preserveRecentMessages !== undefined || summarizationSystemPrompt !== undefined || summaryRatio !== undefined;

  if (strategy !== HarnessTruncationStrategy.SLIDING_WINDOW && slidingWindowSet) {
    throw new Error(
      `Harness "truncation.messagesCount" is only valid with strategy "${HarnessTruncationStrategy.SLIDING_WINDOW}"; ` +
        `received strategy "${strategy}".`,
    );
  }
  if (strategy !== HarnessTruncationStrategy.SUMMARIZATION && summarizationSet) {
    throw new Error(
      `Harness "truncation" summarization tuning (preserveRecentMessages / summarizationSystemPrompt / ` +
        `summaryRatio) is only valid with strategy "${HarnessTruncationStrategy.SUMMARIZATION}"; received ` +
        `strategy "${strategy}".`,
    );
  }
  if (messagesCount !== undefined && (!Number.isInteger(messagesCount) || messagesCount < 1)) {
    throw new Error(`Harness "truncation.messagesCount" must be an integer >= 1; received ${messagesCount}.`);
  }
  if (
    preserveRecentMessages !== undefined &&
    (!Number.isInteger(preserveRecentMessages) || preserveRecentMessages < 0)
  ) {
    throw new Error(
      `Harness "truncation.preserveRecentMessages" must be an integer >= 0; received ${preserveRecentMessages}.`,
    );
  }
  if (
    summarizationSystemPrompt !== undefined &&
    (typeof summarizationSystemPrompt !== 'string' || summarizationSystemPrompt.trim().length === 0)
  ) {
    throw new Error('Harness "truncation.summarizationSystemPrompt" must be a non-empty string when set.');
  }
  if (summaryRatio !== undefined && (summaryRatio <= 0 || summaryRatio > 1)) {
    throw new Error(`Harness "truncation.summaryRatio" must be in the range (0, 1]; received ${summaryRatio}.`);
  }
}

/**
 * Validates the optional guardrail's `trace` enum. No `apiFormat` pairing check is needed: the
 * construct always renders `converse_stream` (see `HarnessBedrockApiFormat`), which is the one format
 * Bedrock Guardrails support, so a guardrail can never be paired with an incompatible format. If the
 * OpenAI-compatible Bedrock Mantle formats (`responses` / `chat_completions`) are ever exposed as a
 * config option, restore a check here rejecting a guardrail paired with them (they do not carry
 * `guardrailConfig`).
 */
export function validateGuardrail(guardrail?: HarnessGuardrailAssociation): void {
  if (!guardrail) {
    return;
  }
  if (!guardrail.id || guardrail.id.trim().length === 0) {
    throw new Error('Harness guardrail "id" is required and must be a non-empty string.');
  }
  // `version` is optional (a `config:` reference falls back to the referenced guardrail's live
  // version), but a provided value must be non-empty: an empty string would otherwise reach the
  // resolver as a literal and render `guardrailVersion: ""`.
  if (guardrail.version?.trim().length === 0) {
    throw new Error('Harness guardrail "version", when provided, must be a non-empty string.');
  }
  validateEnumMember(guardrail.trace, HarnessGuardrailTrace, 'guardrail.trace');
}

/**
 * Rejects application inference profile ARNs at synth.
 *
 * Invoking through any inference profile needs `bedrock:InvokeModel` on the profile ARN *and* on the
 * foundation model in each Region the profile routes to (per the Bedrock
 * [inference-profile prerequisites](https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-prereq.html)).
 * A system profile id carries its foundation model name, so the construct derives that paired grant;
 * an application inference profile id is opaque, so it cannot. Accepting one would auto-generate an
 * execution role holding invoke on the profile alone - a harness that deploys clean and then fails at
 * first invoke with `AccessDeniedException`. Failing here instead keeps that outcome impossible.
 */
export function validateModelId(modelId: string): void {
  if (modelId.includes(':application-inference-profile/')) {
    throw new Error(
      `Harness "modelId" does not support application inference profile ARNs; received "${modelId}". ` +
        'The underlying foundation model(s) cannot be derived from an application inference profile, so ' +
        'the paired bedrock:InvokeModel grant the profile requires cannot be scoped at synth. Use a ' +
        'system inference-profile id (for example "us.anthropic.claude-sonnet-4-6-20250514-v1:0"), an ' +
        'on-demand foundation-model id, or a foundation-model ARN.',
    );
  }
}

/**
 * Validates the optional model sampling parameters against the CloudFormation
 * `HarnessBedrockModelConfig` bounds (temperature 0-2, topP 0-1, maxTokens >= 1), so misconfiguration
 * fails at synth rather than deploy. The API format is not caller-configurable (the construct always
 * renders `converse_stream`), so there is nothing to validate for it here.
 */
export function validateModelConfig(modelConfig?: HarnessModelConfigProperty): void {
  if (!modelConfig) {
    return;
  }
  const { temperature, topP, maxTokens } = modelConfig;
  if (temperature !== undefined && (temperature < TEMPERATURE_MIN || temperature > TEMPERATURE_MAX)) {
    throw new Error(
      `Harness "modelConfig.temperature" must be between ${TEMPERATURE_MIN} and ${TEMPERATURE_MAX}; ` +
        `received ${temperature}.`,
    );
  }
  if (topP !== undefined && (topP < TOP_P_MIN || topP > TOP_P_MAX)) {
    throw new Error(`Harness "modelConfig.topP" must be between ${TOP_P_MIN} and ${TOP_P_MAX}; received ${topP}.`);
  }
  if (maxTokens !== undefined && (!Number.isInteger(maxTokens) || maxTokens < 1)) {
    throw new Error(`Harness "modelConfig.maxTokens" must be an integer >= 1; received ${maxTokens}.`);
  }
}

/**
 * Backstop validation of an enumerated string field: rejects a non-empty value that is not a member
 * of the given enum, naming the offending value and the accepted set. TypeScript already narrows
 * typed callers, but YAML/jsii callers can pass an arbitrary string, which would otherwise only be
 * caught by CloudFormation at deploy. A missing value (undefined/null) is accepted as "unset".
 */
export function validateEnumMember<T extends Record<string, string>>(
  value: string | undefined,
  enumType: T,
  fieldName: string,
): void {
  // Loose null check: jsii/YAML callers can surface a missing value as null, not undefined.
  if (value == null) {
    return;
  }
  const validValues = Object.values(enumType);
  if (!validValues.includes(value)) {
    throw new Error(`Harness "${fieldName}" must be one of ${validValues.join(', ')}; received "${value}".`);
  }
}

/**
 * Fail-fast validation of the tools map before any resource is built: each tool's name (the map key,
 * which becomes `HarnessTool.Name`) matches the CloudFormation pattern (`^[a-zA-Z0-9_-]+$`, 1-64
 * chars), sets exactly one of `inlineFunction` / `agentCoreGateway`, and - for inline functions -
 * carries a `description` within the `HarnessInlineFunctionConfig.Description` bounds (1-4096 chars).
 *
 * Uniqueness needs no check: the map key structurally guarantees it.
 */
export function validateTools(tools?: NamedHarnessToolProps): void {
  Object.entries(tools ?? {}).forEach(([toolName, tool]) => {
    if (!toolName || toolName.length < 1 || toolName.length > TOOL_NAME_MAX_LENGTH) {
      throw new Error(`Harness tool name must be 1-${TOOL_NAME_MAX_LENGTH} characters; received "${toolName}".`);
    }
    if (!TOOL_NAME_PATTERN.test(toolName)) {
      throw new Error(`Harness tool name must match ${TOOL_NAME_PATTERN.source}; received "${toolName}".`);
    }
    const hasInline = tool.inlineFunction !== undefined;
    const hasGateway = tool.agentCoreGateway !== undefined;
    if (hasInline === hasGateway) {
      throw new Error(
        `Harness tool "${toolName}" must set exactly one of "inlineFunction" or "agentCoreGateway"; ` +
          `received ${hasInline ? 'both' : 'neither'}.`,
      );
    }
    if (tool.agentCoreGateway) {
      // A non-empty gatewayArn is required: an empty string is not a `config:` reference, so it would
      // pass through as a literal and land as `resources: ['']` on the AllowInvokeGateway statement and
      // `GatewayArn: ""` on the tool - a deploy-time MalformedPolicyDocument rather than a synth error.
      const gatewayArn = tool.agentCoreGateway.gatewayArn;
      if (!gatewayArn || gatewayArn.trim().length === 0) {
        throw new Error(
          `Harness tool "${toolName}" agentCoreGateway "gatewayArn" is required and must be a non-empty string.`,
        );
      }
    }
    if (tool.inlineFunction) {
      const description = tool.inlineFunction.description;
      if (!description || description.trim().length === 0) {
        throw new Error(
          `Harness tool "${toolName}" inlineFunction "description" is required and must be a non-empty string.`,
        );
      }
      if (description.length > INLINE_FUNCTION_DESCRIPTION_MAX_LENGTH) {
        throw new Error(
          `Harness tool "${toolName}" inlineFunction "description" must be at most ` +
            `${INLINE_FUNCTION_DESCRIPTION_MAX_LENGTH} characters; received ${description.length}.`,
        );
      }
    }
  });
}

/**
 * Builds the `Environment.AgentCoreRuntimeEnvironment` block for the underlying runtime, combining
 * the optional lifecycle and required VPC network configurations.
 */
export function buildEnvironment(
  props: BedrockAgentcoreHarnessL3ConstructProps,
  additionalSecurityGroupId?: string,
): bedrockagentcore.CfnHarness.HarnessEnvironmentProviderProperty {
  const lifecycleConfiguration = props.lifecycleConfiguration
    ? buildLifecycleConfiguration(props.lifecycleConfiguration)
    : undefined;
  // networkConfiguration is required (MDAA enforces VPC mode), so the environment provider is
  // always emitted with a NetworkMode: VPC network configuration.
  const networkConfiguration = buildNetworkConfiguration(props.networkConfiguration, additionalSecurityGroupId);

  return {
    agentCoreRuntimeEnvironment: {
      lifecycleConfiguration,
      networkConfiguration,
    },
  };
}

/**
 * Builds the lifecycle configuration for the underlying runtime environment. Validation/build logic
 * is shared with the Runtime module via `@aws-mdaa/agentcore-shared`; the Harness keeps its own
 * camelCase error labels (asserted by its tests) via the labels argument.
 */
export function buildLifecycleConfiguration(
  lifecycleConfig: HarnessLifecycleProperty,
): bedrockagentcore.CfnHarness.LifecycleConfigurationProperty {
  return buildAgentcoreLifecycleConfiguration(lifecycleConfig, {
    idleTimeoutLabel: 'idleRuntimeSessionTimeout',
    maxLifetimeLabel: 'maxLifetime',
  });
}

/**
 * Builds the VPC network configuration for the underlying runtime environment. MDAA enforces VPC
 * mode (hardcoding `NetworkMode: VPC`), mirroring the AgentCore Runtime construct. Array-bound
 * validation is performed up-front in {@link validateNetworkConfiguration}.
 */
export function buildNetworkConfiguration(
  networkConfig: HarnessNetworkProperty,
  additionalSecurityGroupId?: string,
): bedrockagentcore.CfnHarness.NetworkConfigurationProperty {
  // Shared VPC-mode builder (single source of truth for MDAA's NetworkMode: VPC enforcement).
  const securityGroups = additionalSecurityGroupId
    ? [...networkConfig.securityGroups, additionalSecurityGroupId]
    : networkConfig.securityGroups;
  return buildAgentcoreVpcNetworkConfiguration(securityGroups, networkConfig.subnets);
}

/**
 * Builds the `EnvironmentArtifact` block from a bring-your-own container image URI. Returns
 * undefined when no container is configured so the harness uses the AWS-managed container.
 */
export function buildEnvironmentArtifact(
  container?: HarnessContainerProperty,
): bedrockagentcore.CfnHarness.HarnessEnvironmentArtifactProperty | undefined {
  if (!container) {
    return undefined;
  }
  return {
    containerConfiguration: {
      containerUri: container.containerUri,
    },
  };
}

/**
 * Builds the typed `Skills[]` from config (path source only). Returns undefined for an empty list
 * so the synthesized template omits the field.
 */
export function buildSkills(
  skills?: HarnessSkillProperty[],
): bedrockagentcore.CfnHarness.HarnessSkillProperty[] | undefined {
  if (!skills || skills.length === 0) {
    return undefined;
  }
  return skills.map(skill => ({ path: skill.path }));
}

/**
 * Builds the typed `Truncation` configuration (validated by {@link validateTruncation}). The
 * strategy-specific `config` block is emitted only for the matching strategy - `none` renders the
 * strategy alone. Returns undefined when no `truncation` block is set so the service default applies.
 */
export function buildTruncation(
  truncation?: HarnessTruncationProperty,
): bedrockagentcore.CfnHarness.HarnessTruncationConfigurationProperty | undefined {
  if (!truncation) {
    return undefined;
  }
  if (truncation.strategy === HarnessTruncationStrategy.SLIDING_WINDOW) {
    // Omit the config block entirely when the single tuning field is unset (service default window).
    const config =
      truncation.messagesCount === undefined
        ? undefined
        : { slidingWindow: { messagesCount: truncation.messagesCount } };
    return { strategy: truncation.strategy, config };
  }
  if (truncation.strategy === HarnessTruncationStrategy.SUMMARIZATION) {
    const hasTuning =
      truncation.preserveRecentMessages !== undefined ||
      truncation.summarizationSystemPrompt !== undefined ||
      truncation.summaryRatio !== undefined;
    const config = hasTuning
      ? {
          summarization: {
            preserveRecentMessages: truncation.preserveRecentMessages,
            summarizationSystemPrompt: truncation.summarizationSystemPrompt,
            summaryRatio: truncation.summaryRatio,
          },
        }
      : undefined;
    return { strategy: truncation.strategy, config };
  }
  // strategy === none: no strategy-specific config.
  return { strategy: truncation.strategy };
}

/**
 * Builds the inbound authorizer configuration. Returns undefined (SigV4/IAM fallback) unless a
 * customJwt authorizer is configured, in which case the JWT fields are mapped via the shared
 * {@link buildCustomJwtAuthorizer} helper.
 */
export function buildAuthorizerConfiguration(
  authorizerConfig?: AgentcoreAuthorizerConfigProperty,
): bedrockagentcore.CfnHarness.AuthorizerConfigurationProperty | undefined {
  if (!authorizerConfig?.customJwt) {
    return undefined;
  }
  return { customJwtAuthorizer: buildCustomJwtAuthorizer(authorizerConfig.customJwt) };
}

/**
 * Builds the typed `HarnessTool[]` from config, resolving each gateway tool's ARN from the
 * pre-resolved gateway-ARN map and gating outbound auth to `AWS_IAM` only.
 */
export function buildTools(
  tools: NamedHarnessToolProps | undefined,
  gatewayArns: { [toolName: string]: string },
): bedrockagentcore.CfnHarness.HarnessToolProperty[] | undefined {
  const entries = Object.entries(tools ?? {});
  if (entries.length === 0) {
    return undefined;
  }
  return entries.map(([toolName, tool]) => {
    if (tool.inlineFunction) {
      return {
        type: 'inline_function',
        name: toolName,
        config: {
          inlineFunction: {
            description: tool.inlineFunction.description,
            inputSchema: tool.inlineFunction.inputSchema,
          },
        },
      };
    }
    // validateTools guarantees agentCoreGateway is set when inlineFunction is not.
    return {
      type: 'agentcore_gateway',
      name: toolName,
      config: {
        agentCoreGateway: {
          gatewayArn: gatewayArns[toolName],
          outboundAuth: { awsIam: {} },
        },
      },
    };
  });
}

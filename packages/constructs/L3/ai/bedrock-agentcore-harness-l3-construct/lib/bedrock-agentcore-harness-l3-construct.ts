/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { resolveModelArn, inferenceProfileFoundationModelArns } from '@aws-mdaa/ai-helper';
import {
  AgentcoreAuthorizerConfigProperty,
  buildDataProtectionPolicy,
  createAgentCoreLogProtection,
  DataProtectionProperty,
  parseEcrRepositoryArn,
  sanitizeBedrockAgentcoreName,
} from '@aws-mdaa/agentcore-shared';
import { MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { aws_bedrockagentcore as bedrockagentcore, CfnResource, Stack } from 'aws-cdk-lib';
import { Effect, IRole, PolicyDocument, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { HarnessVpcEndpointAccess, ResolvedVpcEndpointAccess } from './vpc-endpoint-access';
import {
  buildAuthorizerConfiguration,
  buildEnvironment,
  buildEnvironmentArtifact,
  buildSkills,
  buildTools,
  buildTruncation,
  validateHarnessConfig,
} from './utils';

export {
  AgentcoreAuthorizerConfigProperty,
  CustomJwtAuthorizerProperty,
  AuthorizerType,
  DataProtectionProperty,
} from '@aws-mdaa/agentcore-shared';

/**
 * API protocol (and Amazon Bedrock endpoint) the harness uses to call a `bedrockModelConfig` model,
 * per the AgentCore "Select the model API format" guidance. Not a caller-facing config option: the
 * construct always renders `converse_stream`, and the value is carried as this named enum rather than
 * a bare `'converse_stream'` string so the downstream L1 `bedrockModelConfig.apiFormat` is set from a
 * typed member.
 *
 * Only `converse_stream` is wired today. The OpenAI-compatible Bedrock Mantle formats (`responses` /
 * `chat_completions`) are deliberately out of scope: they route to a different endpoint host
 * (`bedrock-mantle`), which is not among the endpoint services a VPC-mode harness derives, so a
 * VPC-mode harness using them would reach READY and then hang at first invoke. See
 * `requiredHarnessVpcEndpoints` in ./vpc-endpoint-access for the derived endpoints; adding a format
 * means adding one there. The enum is retained (rather than collapsed to a string constant)
 * so those values can be added, and exposed as a config option, alongside their endpoint services.
 *
 * AWS: `Model.BedrockModelConfig.ApiFormat`
 */
export enum HarnessBedrockApiFormat {
  /**
   * Amazon Bedrock Converse API, served by the `bedrock-runtime` endpoint. The service default, and
   * the only format compatible with Bedrock Guardrails.
   */
  CONVERSE_STREAM = 'converse_stream',
}

/**
 * Guardrail `trace` behavior for the Converse `guardrailConfig`, controlling how much guardrail
 * assessment detail is returned. A named enum (rather than a bare `string`) gives schema-level
 * validation and a synth-time backstop for untyped/YAML callers.
 *
 * Use cases: troubleshooting guardrail interventions (`enabled_full` returns the fullest detail)
 *
 * AWS: `guardrailConfig.trace` (Converse `GuardrailConfiguration`; valid values `enabled` /
 * `disabled` / `enabled_full`)
 */
export enum HarnessGuardrailTrace {
  /** Return guardrail assessment trace on intervention. */
  ENABLED = 'enabled',
  /** Do not return guardrail assessment trace. */
  DISABLED = 'disabled',
  /** Return the fullest guardrail assessment trace (verbose troubleshooting). */
  ENABLED_FULL = 'enabled_full',
}

/**
 * Guardrail association for a Harness: a `config:<name>` reference into a sibling `guardrails` map,
 * or a literal guardrail id.
 *
 * Use cases: content filtering, responsible-AI controls on the Harness's model calls
 *
 * AWS: `Model.BedrockModelConfig.AdditionalParams.guardrailConfig` (escape hatch - see class doc)
 *
 * Validation: `id` required; `version` required unless `id` is a `config:<name>` reference (the
 * referenced guardrail's live version is used)
 */
export interface HarnessGuardrailAssociation {
  /**
   * Guardrail identifier: a `config:<name>` reference into a sibling `guardrails` map, or a literal
   * guardrail id.
   *
   * Use cases: referencing a module-managed guardrail, referencing an externally created guardrail
   *
   * AWS: `GuardrailConfig.GuardrailIdentifier`
   *
   * Validation: Required; String
   **/
  readonly id: string;
  /**
   * Guardrail version. Required unless `id` is a `config:<name>` reference (the referenced
   * guardrail's live version is used automatically).
   *
   * Use cases: pinning a specific guardrail version
   *
   * AWS: `GuardrailConfig.GuardrailVersion`
   *
   * Validation: Optional when `id` is a `config:` reference; otherwise Required; String
   **/
  readonly version?: string;
  /**
   * Guardrail trace behavior returned on the model request.
   *
   * Use cases: troubleshooting guardrail interventions
   *
   * AWS: `guardrailConfig.trace`
   *
   * Validation: Optional; must be a {@link HarnessGuardrailTrace} value
   * @default "enabled"
   **/
  readonly trace?: HarnessGuardrailTrace;
}

/**
 * Inline function tool: a tool definition the model can call, with no execution binding. The
 * caller (harness invoker) is responsible for executing the function and returning the result -
 * the Harness itself does not invoke anything for this tool type.
 *
 * Use cases: client-side tool execution, tools implemented outside AWS, RETURN_CONTROL-style tools
 *
 * AWS: `HarnessTool` with `type: inline_function`, `config.inlineFunction`
 *
 * Validation: description and inputSchema both required
 */
export interface HarnessInlineFunctionToolProperty {
  /**
   * Description of what the tool does, shown to the model for tool selection.
   *
   * Use cases: tool selection guidance for the model
   *
   * AWS: `HarnessInlineFunctionConfig.Description`
   *
   * Validation: Required; String
   **/
  readonly description: string;
  /**
   * JSON Schema describing the tool's input parameters.
   *
   * Use cases: structured tool-call argument validation
   *
   * AWS: `HarnessInlineFunctionConfig.InputSchema`
   *
   * Validation: Required; JSON Schema object
   **/
  readonly inputSchema: { [key: string]: unknown };
}

/**
 * AgentCore Gateway tool: wires the Harness to an existing Bedrock AgentCore Gateway's tool
 * surface. MDAA supports only `AWS_IAM` outbound auth (the gateway invoked with the Harness's own
 * execution role) - `oauth`/`none` are not yet exposed.
 *
 * Use cases: exposing gateway-fronted Lambda/OpenAPI/Smithy tools to the agent loop
 *
 * AWS: `HarnessTool` with `type: agentcore_gateway`, `config.agentCoreGateway`
 *
 * Validation: gatewayArn required
 */
export interface HarnessAgentCoreGatewayToolProperty {
  /**
   * The gateway to attach, either a literal Gateway ARN or a `config:<name>` reference into the
   * orchestrating module's own gateway map (e.g. `bedrock-builder`'s `gateways:`), resolved to the
   * live gateway's ARN at synth time.
   *
   * Use cases: attaching a gateway created in the same module (no SSM round-trip), attaching an
   * externally created gateway by ARN
   *
   * AWS: `HarnessAgentCoreGatewayConfig.GatewayArn`
   *
   * Validation: Required; String; literal ARN or `config:<name>`
   **/
  readonly gatewayArn: string;
}

/**
 * A single tool available to the Harness's agent loop, keyed by tool name in
 * {@link NamedHarnessToolProps}. Exactly one of `inlineFunction` / `agentCoreGateway` must be set.
 *
 * Use cases: giving the agent loop callable tools
 *
 * AWS: `HarnessTool`
 *
 * Validation: exactly one of inlineFunction / agentCoreGateway
 */
export interface HarnessToolProperty {
  /**
   * Inline function tool configuration. Mutually exclusive with `agentCoreGateway`.
   *
   * Use cases: client-executed tools
   *
   * AWS: `HarnessTool.Config.InlineFunction`
   *
   * Validation: exactly one of inlineFunction / agentCoreGateway
   **/
  readonly inlineFunction?: HarnessInlineFunctionToolProperty;
  /**
   * AgentCore Gateway tool configuration. Mutually exclusive with `inlineFunction`.
   *
   * Use cases: gateway-fronted tools (Lambda, OpenAPI, Smithy, KB RAG)
   *
   * AWS: `HarnessTool.Config.AgentCoreGateway`
   *
   * Validation: exactly one of inlineFunction / agentCoreGateway
   **/
  readonly agentCoreGateway?: HarnessAgentCoreGatewayToolProperty;
}

/**
 * Map of tool name to {@link HarnessToolProperty}. The key becomes `HarnessTool.Name`, the callable
 * tool identifier surfaced to the model and the value `allowedTools` entries refer to. Keying by name
 * rather than using a list makes duplicate tool names unrepresentable - the service documents
 * `HarnessTool.Name` as unique, and a duplicate would otherwise silently collapse two tools onto one
 * gateway and drop the other's IAM grant.
 */
export interface NamedHarnessToolProps {
  /** @jsii ignore */
  readonly [toolName: string]: HarnessToolProperty;
}

/**
 * Lifecycle configuration mapped onto the Harness's underlying AgentCore Runtime environment.
 *
 * Use cases: idle-session and maximum-lifetime cost control
 *
 * AWS: `Environment.AgentCoreRuntimeEnvironment.LifecycleConfiguration`
 *
 * Validation: Optional; each value 60-28800 seconds
 */
export interface HarnessLifecycleProperty {
  /**
   * Idle session timeout in seconds before the underlying runtime session is terminated.
   *
   * Use cases: cost control, session cleanup
   *
   * AWS: `LifecycleConfiguration.IdleRuntimeSessionTimeout`
   *
   * Validation: Optional; Number; 60-28800 seconds
   *
   * @minimum 60
   * @maximum 28800
   **/
  readonly idleRuntimeSessionTimeout?: number;
  /**
   * Maximum session lifetime in seconds before forced termination regardless of activity.
   *
   * Use cases: cost control, hard session boundaries, bounding long-lived sessions
   *
   * AWS: `LifecycleConfiguration.MaxLifetime`
   *
   * Validation: Optional; Number; 60-28800 seconds
   *
   * @minimum 60
   * @maximum 28800
   **/
  readonly maxLifetime?: number;
}

/**
 * Model sampling configuration for the Harness's Bedrock model, mirroring the CFN
 * `HarnessBedrockModelConfig` sampling fields. All fields are optional; omit the whole `modelConfig`
 * block to use the model's own defaults.
 *
 * Use cases: tuning response determinism, diversity, and length limits
 *
 * AWS: `Model.BedrockModelConfig` (sampling fields)
 *
 * Validation: Optional; see individual fields
 */
export interface HarnessModelConfigProperty {
  /**
   * Sampling temperature for the model.
   *
   * Use cases: tuning response determinism vs. creativity
   *
   * AWS: `Model.BedrockModelConfig.Temperature`
   *
   * Validation: Optional; Number; 0-2
   *
   * @minimum 0
   * @maximum 2
   **/
  readonly temperature?: number;
  /**
   * Nucleus sampling (top-p) for the model.
   *
   * Use cases: tuning response diversity
   *
   * AWS: `Model.BedrockModelConfig.TopP`
   *
   * Validation: Optional; Number; 0-1
   *
   * @minimum 0
   * @maximum 1
   **/
  readonly topP?: number;
  /**
   * Maximum tokens the model may generate per iteration.
   *
   * Use cases: cost control, response length limits
   *
   * AWS: `Model.BedrockModelConfig.MaxTokens`
   *
   * Validation: Optional; Number; >= 1
   *
   * @minimum 1
   **/
  readonly maxTokens?: number;
}

/**
 * Container configuration for the Harness's underlying AgentCore Runtime environment. Only a
 * pre-built ECR image URI is supported - the typed L1 `ContainerConfigurationProperty` exposes
 * `containerUri` alone (no build-from-source), matching the harness's managed-runtime model.
 *
 * Use cases: bring-your-own container image for the harness runtime environment
 *
 * AWS: `EnvironmentArtifact.ContainerConfiguration`
 *
 * Validation: containerUri required; must be a valid ECR image URI
 */
export interface HarnessContainerProperty {
  /**
   * Pre-built container image URI from ECR
   * (`{account}.dkr.ecr.{region}.amazonaws.com/{repository}[:{tag}|@{digest}]`). The execution role
   * is granted scoped `ecr:GetDownloadUrlForLayer` / `ecr:BatchGetImage` pull permissions on the
   * parsed repository.
   *
   * Use cases: custom runtime image, image reuse across harnesses
   *
   * AWS: `ContainerConfiguration.ContainerUri`
   *
   * Validation: Required; String; valid ECR image URI
   **/
  readonly containerUri: string;
}

/**
 * VPC network configuration for the Harness's underlying AgentCore Runtime environment. Mirrors the
 * AgentCore Runtime construct's VPC surface (MDAA enforces VPC mode); the harness maps it onto
 * `Environment.AgentCoreRuntimeEnvironment.NetworkConfiguration` with `NetworkMode: VPC`.
 *
 * Use cases: private access to internal resources, network isolation, security boundaries
 *
 * AWS: `Environment.AgentCoreRuntimeEnvironment.NetworkConfiguration` (`NetworkMode: VPC`)
 *
 * Validation: securityGroups and subnets each required with 1-16 items; securityGroups is capped at 15
 * when `vpcEndpoints` is set, to leave room for the endpoint client group the Harness adds
 */
export interface HarnessNetworkProperty {
  /**
   * Security group IDs controlling inbound/outbound traffic for the harness's runtime sessions.
   *
   * When `vpcEndpoints` names a set, at most 15 may be listed: the Harness adds one endpoint client
   * security group of its own, and the service's own bound is 16 members in total.
   *
   * Use cases: network access control, traffic filtering, security boundaries
   *
   * AWS: `VpcConfig.SecurityGroups`
   *
   * Validation: Required; String[]; 1-16 security group IDs, or 1-15 when `vpcEndpoints` is set
   *
   * @minItems 1
   * @maxItems 16
   **/
  readonly securityGroups: string[];
  /**
   * Subnet IDs for the harness's runtime session placement, enabling multi-AZ deployment.
   *
   * Use cases: multi-AZ deployment, network isolation, high availability
   *
   * AWS: `VpcConfig.Subnets`
   *
   * Validation: Required; String[]; 1-16 subnet IDs
   *
   * @minItems 1
   * @maxItems 16
   **/
  readonly subnets: string[];
  /**
   * Name of a VPC endpoint set, declared in the orchestrating module's own `vpcEndpoints` map, giving
   * this Harness's sessions a private outbound path (no NAT/internet). Omit it for a Harness whose
   * egress follows the VPC's existing path.
   *
   * Which endpoints the Harness needs is derived from its own configuration - model inference, the
   * container image pull (registry API, Docker registry, and image layers over S3), credential vending,
   * log delivery, and the AgentCore Gateway service when the Harness declares a gateway tool - so no
   * service name, subnet, route table, policy, or security group ID appears here. The set declares only
   * how each of those is reached in its VPC: created there, an existing endpoint to wire to, or reached
   * without an endpoint the set manages. What stays yours to get right is that the subnets above belong to
   * the VPC the referenced set names - that pairing is rejected at deploy, not at synth.
   *
   * The endpoints belong to the VPC rather than to the Harness. Every Harness referencing one set shares
   * its endpoints, each wired to only the endpoints it needs. Remove a set in the same change as the last
   * Harness referencing it: a declared set no Harness references is rejected at synth.
   *
   * Use cases: no-NAT Harness sessions, VPC-mode gateway tools, firewalled environments
   *
   * AWS: consumer-side AWS::EC2::SecurityGroupIngress / SecurityGroupEgress against the set's endpoints
   *
   * Validation: Optional; String; must name a set in the module's `vpcEndpoints` map
   **/
  readonly vpcEndpoints?: string;
}

/**
 * A skill available to the Harness's agent loop: a filesystem path to a skill definition baked into
 * the runtime image. Only the `path` source is exposed - the CloudFormation `HarnessSkill` schema
 * also defines `Git`, `S3`, and `AwsSkills` sources, but the pinned CDK L1's `HarnessSkillProperty`
 * types only `path`.
 *
 * Use cases: injecting curated markdown/script skill bundles into the agent's context
 *
 * AWS: `Skills[]` (`HarnessSkill.Path`)
 *
 * Validation: path required, non-empty
 */
export interface HarnessSkillProperty {
  /**
   * Filesystem path to the skill definition inside the runtime image.
   *
   * Use cases: referencing a skill bundled into a bring-your-own container
   *
   * AWS: `HarnessSkill.Path`
   *
   * Validation: Required; String; non-empty
   **/
  readonly path: string;
}

/**
 * Harness endpoint configuration: a named, versioned invocation target for the harness (mirrors the
 * AgentCore Runtime construct's `runtimeEndpoint`). The pinned CDK has no typed
 * `CfnHarnessEndpoint` L1 class, so this is rendered via a raw `CfnResource`
 * (`AWS::BedrockAgentCore::HarnessEndpoint`); see the class-level documentation.
 *
 * Use cases: pinning callers to a specific harness version, blue/green endpoint management
 *
 * AWS: `AWS::BedrockAgentCore::HarnessEndpoint`
 *
 * Validation: name (when provided) is sanitized to `^[a-zA-Z][a-zA-Z0-9_]{0,47}$`
 */
export interface HarnessEndpointProperty {
  /**
   * Endpoint name for API-access identification. Defaults to a name derived from the harness name.
   *
   * Use cases: endpoint naming, API identification
   *
   * AWS: `HarnessEndpoint.EndpointName`
   *
   * Validation: Optional; String; alphanumeric and underscores; max 48 chars
   **/
  readonly name?: string;
  /**
   * Description of the endpoint.
   *
   * Use cases: endpoint documentation, operational clarity
   *
   * AWS: `HarnessEndpoint.Description`
   *
   * Validation: Optional; String; 1-256 chars
   *
   * @minLength 1
   * @maxLength 256
   **/
  readonly description?: string;
  /**
   * Specific harness version the endpoint points to.
   *
   * Use cases: version pinning, deployment control
   *
   * AWS: `HarnessEndpoint.TargetVersion`
   *
   * Validation: Optional; String; matches `^([1-9][0-9]{0,4})$`
   **/
  readonly targetVersion?: string;
}

/**
 * Context-truncation strategy the harness applies when the conversation exceeds the model's context
 * window. A named enum (rather than a bare `string`) gives config authors schema-level validation and
 * a synth-time backstop for untyped/YAML callers.
 *
 * AWS: `Truncation.Strategy` (allowed values `sliding_window` / `summarization` / `none`)
 */
export enum HarnessTruncationStrategy {
  /** Retain only the most recent messages (see {@link HarnessTruncationProperty.messagesCount}). */
  SLIDING_WINDOW = 'sliding_window',
  /** Summarize older context to stay within the window (see the summarization tuning fields). */
  SUMMARIZATION = 'summarization',
  /** Do not truncate - let the model reject an over-long context. */
  NONE = 'none',
}

/**
 * Context-truncation configuration for the Harness's agent loop, controlling how conversation
 * context is trimmed when it exceeds the model's context window. The `strategy` selects the
 * approach; the strategy-specific tuning fields apply only to their matching strategy (validated at
 * synth), so `none` takes no tuning.
 *
 * Use cases: bounding long agent loops within the model context window, cost control on context size
 *
 * AWS: `Truncation` (`HarnessTruncationConfiguration`)
 *
 * Validation: `strategy` required and a {@link HarnessTruncationStrategy} value; tuning fields must
 * match the selected strategy
 */
export interface HarnessTruncationProperty {
  /**
   * The truncation strategy to apply.
   *
   * Use cases: choosing sliding-window vs. summarization vs. no truncation
   *
   * AWS: `HarnessTruncationConfiguration.Strategy`
   *
   * Validation: Required; must be a {@link HarnessTruncationStrategy} value
   **/
  readonly strategy: HarnessTruncationStrategy;
  /**
   * Number of recent messages to retain in the context window. Applies to the `sliding_window`
   * strategy only.
   *
   * Use cases: fixed-size recent-message window
   *
   * AWS: `HarnessTruncationStrategyConfiguration.SlidingWindow.MessagesCount`
   *
   * Validation: Optional; Integer >= 1; only valid with `strategy: sliding_window`
   *
   * @minimum 1
   **/
  readonly messagesCount?: number;
  /**
   * Number of recent messages to preserve without summarization. Applies to the `summarization`
   * strategy only.
   *
   * Use cases: keeping the newest turns verbatim while summarizing older context
   *
   * AWS: `HarnessTruncationStrategyConfiguration.Summarization.PreserveRecentMessages`
   *
   * Validation: Optional; Integer >= 0; only valid with `strategy: summarization`
   *
   * @minimum 0
   **/
  readonly preserveRecentMessages?: number;
  /**
   * System prompt used to generate the summary. Applies to the `summarization` strategy only.
   *
   * Use cases: steering how older context is summarized
   *
   * AWS: `HarnessTruncationStrategyConfiguration.Summarization.SummarizationSystemPrompt`
   *
   * Validation: Optional; non-empty String; only valid with `strategy: summarization`
   **/
  readonly summarizationSystemPrompt?: string;
  /**
   * Ratio of content to summarize (0-1 exclusive of 0). Applies to the `summarization` strategy only.
   *
   * Use cases: tuning how aggressively older context is compressed
   *
   * AWS: `HarnessTruncationStrategyConfiguration.Summarization.SummaryRatio`
   *
   * Validation: Optional; Number in (0, 1]; only valid with `strategy: summarization`
   *
   * @exclusiveMinimum 0
   * @maximum 1
   **/
  readonly summaryRatio?: number;
}

/**
 * Complete configuration for a Bedrock AgentCore Harness - a declarative agent loop (model +
 * system prompt + tools).
 *
 * Use cases: conversational AI agents, tool-using agents, RAG agents (via gateway tools)
 *
 * AWS: `AWS::BedrockAgentCore::Harness`
 *
 * Validation: modelId, systemPrompt and networkConfiguration are required
 */
export interface HarnessConfigProps {
  /**
   * Foundation model identifier for the agent loop. Accepts an on-demand model id, a cross-region
   * (system) inference profile id, or a full foundation-model / system inference-profile ARN
   * (resolved via `resolveModelArn`). **Application** inference profile ARNs
   * (`application-inference-profile/...`) are rejected at synth: their underlying foundation model is
   * not derivable, so the paired invoke grant an inference profile requires cannot be scoped.
   *
   * Use cases: selecting the reasoning model for the agent loop
   *
   * AWS: `Model.BedrockModelConfig.ModelId`
   *
   * Validation: Required; String; not an application-inference-profile ARN
   **/
  readonly modelId: string;
  /**
   * System prompt defining the agent's behavior and instructions.
   *
   * Use cases: agent persona, task instructions, behavioral constraints
   *
   * AWS: `SystemPrompt` (one text block)
   *
   * Validation: Required; String
   **/
  readonly systemPrompt: string;
  /**
   * Model sampling configuration (temperature, top-p, max tokens). Mirrors the CFN
   * `HarnessBedrockModelConfig` sampling fields.
   *
   * Use cases: tuning response determinism, diversity, and length limits
   *
   * AWS: `Model.BedrockModelConfig`
   *
   * Validation: Optional; HarnessModelConfigProperty
   **/
  readonly modelConfig?: HarnessModelConfigProperty;
  /**
   * Maximum number of iterations the agent loop can execute per invocation.
   *
   * Use cases: bounding tool-call loops, cost control
   *
   * AWS: `MaxIterations`
   *
   * Validation: Optional; Integer >= 1
   *
   * @minimum 1
   **/
  readonly maxIterations?: number;
  /**
   * Maximum duration in seconds for the agent loop execution per invocation.
   *
   * Use cases: bounding total invocation latency
   *
   * AWS: `TimeoutSeconds`
   *
   * Validation: Optional; Integer >= 1
   *
   * @minimum 1
   **/
  readonly timeoutSeconds?: number;
  /**
   * Idle-session and runtime lifecycle settings for the underlying AgentCore Runtime environment.
   *
   * Use cases: cost control, session cleanup
   *
   * AWS: `Environment.AgentCoreRuntimeEnvironment.LifecycleConfiguration`
   *
   * Validation: Optional; HarnessLifecycleProperty
   **/
  readonly lifecycleConfiguration?: HarnessLifecycleProperty;
  /**
   * Existing IAM role reference for the Harness execution role. If omitted, MDAA creates a role
   * trusting `bedrock-agentcore.amazonaws.com`, scoped to this account/harness.
   *
   * Use cases: role reuse, centralized permission management
   *
   * AWS: `ExecutionRoleArn`
   *
   * Validation: Optional; MdaaRoleRef
   **/
  readonly role?: MdaaRoleRef;
  /**
   * Guardrail association for content filtering on the Harness's model calls. Rendered via a CDK
   * property-override escape hatch (the pinned CDK L1 lags the CloudFormation spec for this field);
   * see the class-level documentation.
   *
   * Use cases: responsible-AI content filtering, safety controls
   *
   * AWS: `Model.BedrockModelConfig.AdditionalParams.guardrailConfig` (escape hatch)
   *
   * Validation: Optional; HarnessGuardrailAssociation
   **/
  readonly guardrail?: HarnessGuardrailAssociation;
  /**
   * Inbound authorization configuration. Provide `customJwt` for JWT/OIDC inbound auth, or omit it
   * to use AWS IAM (SigV4) - the Harness's no-configuration fallback.
   *
   * Use cases: inbound access control
   *
   * AWS: `AuthorizerConfiguration`
   *
   * Validation: Optional; valid customJwt when present
   **/
  readonly authorizerConfiguration?: AgentcoreAuthorizerConfigProperty;
  /**
   * Tools available to the agent loop, keyed by tool name. The key becomes `HarnessTool.Name` and is
   * what `allowedTools` entries refer to.
   *
   * Use cases: giving the agent callable tools (client-executed or gateway-fronted)
   *
   * AWS: `Tools`
   *
   * Validation: Optional; NamedHarnessToolProps (map of tool name to config)
   **/
  readonly tools?: NamedHarnessToolProps;
  /**
   * Tool allowlist controlling which tools (including the built-in `shell` / `file_operations`) the
   * agent may select during invocation. Supports the AgentCore `allowedTools` patterns (`*`, plain
   * names, `@builtin`, `@server/tool`, globs). Omit to allow all tools.
   *
   * Note: `allowedTools` scopes LLM tool selection during `InvokeHarness` only - it does not gate
   * the separate `InvokeAgentRuntimeCommand` API (which executes commands directly, without the
   * LLM). To prevent direct command execution, do not grant `bedrock-agentcore:InvokeAgentRuntimeCommand`.
   *
   * Use cases: restricting the default `shell`/`file_operations` tools, reducing tool-definition
   * token overhead
   *
   * AWS: `AllowedTools`
   *
   * Validation: Optional; String[]; 1-64 entries
   *
   * @minItems 1
   * @maxItems 64
   **/
  readonly allowedTools?: string[];
  /**
   * Skills injected into the agent's context: filesystem paths to skill definitions baked into the
   * runtime image. Only the `path` skill source is exposed (the CDK L1 types only `path`); git / S3 /
   * awsSkills sources documented in the CloudFormation `HarnessSkill` schema are not yet supported.
   *
   * Use cases: injecting curated instruction/script bundles into the agent
   *
   * AWS: `Skills`
   *
   * Validation: Optional; HarnessSkillProperty[]; each path non-empty
   **/
  readonly skills?: HarnessSkillProperty[];
  /**
   * Bring-your-own container image for the harness's underlying runtime environment (pre-built ECR
   * image URI). Omit to use the AWS-managed harness container.
   *
   * Use cases: custom runtime image
   *
   * AWS: `EnvironmentArtifact.ContainerConfiguration`
   *
   * Validation: Optional; HarnessContainerProperty
   **/
  readonly container?: HarnessContainerProperty;
  /**
   * VPC network configuration for the harness's runtime sessions, placing them behind your own
   * security groups and subnets for private access to internal resources. Required: MDAA enforces
   * VPC network isolation for the harness (`NetworkMode: VPC`), mirroring the AgentCore Runtime
   * construct - there is no public-network option.
   *
   * Use cases: private access to internal resources, network isolation
   *
   * AWS: `Environment.AgentCoreRuntimeEnvironment.NetworkConfiguration` (`NetworkMode: VPC`)
   *
   * Validation: Required; HarnessNetworkProperty; 1-16 security groups and subnets
   **/
  readonly networkConfiguration: HarnessNetworkProperty;
  /**
   * Key-value environment variables passed to the harness runtime environment.
   *
   * Use cases: runtime configuration, environment customization
   *
   * AWS: `EnvironmentVariables`
   *
   * Validation: Optional; Record<string, string>
   **/
  readonly environmentVariables?: { [key: string]: string };
  /**
   * Global maximum tokens the harness may generate across the whole agent-loop invocation (distinct
   * from `modelConfig.maxTokens`, which bounds a single model call). A hard cost cap on total
   * generation per invocation.
   *
   * Use cases: cost control, bounding total generation per invocation
   *
   * AWS: `MaxTokens`
   *
   * Validation: Optional; Number; >= 1
   *
   * @minimum 1
   **/
  readonly maxTokens?: number;
  /**
   * Named, versioned invocation endpoint for the harness. Omit to invoke the harness's default
   * (latest) version directly.
   *
   * Use cases: pinning callers to a specific harness version, blue/green endpoint management
   *
   * AWS: `AWS::BedrockAgentCore::HarnessEndpoint`
   *
   * Validation: Optional; HarnessEndpointProperty
   **/
  readonly endpoint?: HarnessEndpointProperty;
  /**
   * Context-truncation configuration controlling how the agent loop trims conversation context when
   * it exceeds the model's context window. Omit to accept the service default.
   *
   * Use cases: bounding long agent loops within the model context window
   *
   * AWS: `Truncation`
   *
   * Validation: Optional; HarnessTruncationProperty; tuning fields must match the selected strategy
   **/
  readonly truncation?: HarnessTruncationProperty;
  /**
   * CloudWatch Data Protection configuration for the Harness's service-created log groups. PII
   * masking and CMK encryption are always-on and cannot be disabled; this only tightens the posture
   * by adding identifiers on top of the built-in floor.
   *
   * Use cases: extending PII masking with additional identifiers
   *
   * AWS: CloudWatch Logs Data Protection Policy
   *
   * Validation: Optional; DataProtectionProperty; additive only
   **/
  readonly dataProtection?: DataProtectionProperty;
  /**
   * CloudWatch Logs retention period for the Harness's service-created log groups, in days. Accepts
   * any CloudWatch Logs `RetentionDays` value; `9999` (`RetentionDays.INFINITE`) means never-expire
   * and can be set explicitly to lock indefinite retention into config. Omitting the field is
   * equivalent to `9999` - no retention policy is applied, leaving the log groups at CloudWatch's
   * never-expire default (logs are kept, and billed, forever) unless a finite value is set.
   *
   * Use cases: log retention policy, cost management
   *
   * AWS: CloudWatch Logs log group retention
   *
   * Validation: Optional; Number; must be a valid RetentionDays value (9999 for never-expire) - validated at synth
   * @default 9999
   **/
  readonly logRetentionDays?: number;
}

/** A resolved guardrail's live id and version, as published by the orchestrating module. */
export interface ResolvedGuardrailRef {
  readonly guardrailId: string;
  readonly guardrailVersion: string;
}

/**
 * Map of guardrail name to its resolved id/version, for `guardrail.id: config:<name>` references.
 *
 * Deliberately mutable, unlike the config interfaces above: the orchestrating module accumulates this
 * as it creates each guardrail, then passes the finished map in.
 */
export interface ResolvedGuardrailRefMap {
  /** @jsii ignore */
  [name: string]: ResolvedGuardrailRef;
}

/**
 * Map of gateway name to its live ARN, for `tools[].agentCoreGateway.gatewayArn: config:<name>`
 * references. Mutable for the same reason as {@link ResolvedGuardrailRefMap}.
 */
export interface ResolvedGatewayArnMap {
  /** @jsii ignore */
  [name: string]: string;
}

/**
 * L3 construct props combining Harness config with MDAA infrastructure properties, plus the
 * live resources an orchestrating module (e.g. `bedrock-builder`) resolves `config:<name>`
 * references against.
 */
export interface BedrockAgentcoreHarnessL3ConstructProps extends MdaaL3ConstructProps, HarnessConfigProps {
  /** Harness name, used for MDAA naming, IAM role naming, and SSM output paths. */
  readonly harnessName: string;
  /**
   * The customer-managed KMS key for the Harness's log-group encryption, provided by the caller. The
   * harness is a pure key consumer - it never provisions, imports, or mutates the key - so its logs
   * are never left on an AWS-managed key. A live {@link IKey} construct input (not part of the
   * serializable {@link HarnessConfigProps}), hence on the standalone construct props.
   *
   * The key's provisioner must already grant, on the key policy, the CloudWatch Logs service
   * (`logs.<region>.amazonaws.com`) encrypt/decrypt use so the service-created log groups can be
   * CMK-encrypted.
   *
   * Use cases: caller-resolved / shared-per-module CMK, dedicated per-harness CMK
   *
   * Validation: Required; an IKey pre-granted for CloudWatch Logs
   */
  readonly kmsKey: IKey;
  /**
   * Map of guardrail name to guardrail id/version, resolved by the orchestrating module, for
   * `guardrail.id: config:<name>` references.
   */
  readonly guardrails?: ResolvedGuardrailRefMap;
  /**
   * Map of gateway name to live gateway ARN, resolved by the orchestrating module, for
   * `tools[].agentCoreGateway.gatewayArn: config:<name>` references.
   */
  readonly gateways?: ResolvedGatewayArnMap;
  /**
   * The VPC endpoints this Harness reaches, resolved by the orchestrating module from the set named in
   * `networkConfiguration.vpcEndpoints` and narrowed to the services this Harness derives. The Harness
   * only wires itself to them - it creates, modifies, and deletes no endpoint of its own.
   */
  readonly vpcEndpointAccess?: ResolvedVpcEndpointAccess;
}

interface ResolvedGuardrail {
  readonly guardrailArn: string;
  readonly guardrailIdentifier: string;
  readonly guardrailVersion: string;
  readonly trace: HarnessGuardrailTrace;
}

// Session-lifecycle second bounds (idle timeout / max lifetime) now live in @aws-mdaa/agentcore-shared
// as LIFECYCLE_MIN_SECONDS / LIFECYCLE_MAX_SECONDS, shared with the Runtime module.
const CONFIG_REF_PREFIX = 'config:';
// HarnessEndpoint EndpointName CFN pattern is `^[a-zA-Z][a-zA-Z0-9_]{0,47}$` (max 48 chars).
const MAX_HARNESS_ENDPOINT_NAME_LENGTH = 48;
// The AWS::BedrockAgentCore::HarnessEndpoint resource has no typed CfnHarnessEndpoint L1 class in the
// pinned CDK, so it is rendered via a raw CfnResource with this CloudFormation type name.
const HARNESS_ENDPOINT_CFN_TYPE = 'AWS::BedrockAgentCore::HarnessEndpoint';
// HarnessName CFN pattern is `^[a-zA-Z][a-zA-Z0-9_]{0,39}$` (max 40 chars). MDAA naming truncates
// (hashing the suffix) to this length before sanitization so the deployed name always validates.
const MAX_HARNESS_NAME_LENGTH = 40;
// The harness always calls the model over the Converse (`converse_stream`) API - the only format
// wired today and the only one Bedrock Guardrails support (see HarnessBedrockApiFormat). It is not a
// caller-facing option; the value is pinned here and set on every rendered harness.
const HARNESS_API_FORMAT = HarnessBedrockApiFormat.CONVERSE_STREAM;

/**
 * Deploys a Bedrock AgentCore Harness - a declarative agent loop (model + system prompt + tools) -
 * with a create-or-reference execution role scoped to the resolved model ARN, always-on CMK log
 * protection (via a caller-provided key), and optional JWT inbound auth, guardrail, and tools.
 *
 * AgentCore Memory is not supported yet: every harness is deployed with memory disabled
 * (`Memory: { Disabled: {} }`), so no memory resource is created and the execution role gets no
 * memory permissions. Support for customer-managed-key-encrypted memory is planned for a future
 * release.
 *
 * A couple of fields still lag the CDK L1 and are rendered via CDK escape hatches, to be dropped for
 * the typed fields once a CDK bump adds them:
 * - Guardrail config: `HarnessBedrockModelConfigProperty` has no `AdditionalParams`, so the guardrail
 *   config is rendered via `addPropertyOverride('Model.BedrockModelConfig.AdditionalParams', ...)`. The
 *   `apiFormat` (Converse) that guardrails require is a typed field and is set directly, not via
 *   override.
 * - Harness endpoint: there is no typed `CfnHarnessEndpoint` L1 class, so the endpoint is rendered
 *   via a raw `CfnResource` (`AWS::BedrockAgentCore::HarnessEndpoint`).
 */
export class BedrockAgentcoreHarnessL3Construct extends MdaaL3Construct {
  public readonly harness: bedrockagentcore.CfnHarness;
  public readonly harnessEndpoint?: CfnResource;
  public readonly harnessRole: IRole;
  protected readonly props: BedrockAgentcoreHarnessL3ConstructProps;

  constructor(scope: Construct, id: string, props: BedrockAgentcoreHarnessL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    validateHarnessConfig(props);

    const modelArn = resolveModelArn(props.modelId, this.partition, this.region, this.account);
    const guardrail = this.resolveGuardrail(props.guardrail, props.guardrails);
    const gatewayArns = this.resolveGatewayArns(props.tools, props.gateways);
    const endpointAccess = this.createVpcEndpointAccess(props);

    // The service creates the harness's own workload-identity resource with a name of the form
    // `harness_<HarnessName>-<serviceHash>`, so the execution-role grant for it must be scoped to this
    // harness's resolved name (computed here, before the role, so it can be threaded into the policy
    // builder).
    // The cap is passed to sanitizeBedrockAgentcoreName as well as resourceName so it is enforced
    // AFTER any `r_` prefix is prepended (a naming prefix beginning with a non-letter would otherwise
    // push the name past the 40-char HarnessName limit). The AgentCore Runtime construct's
    // sanitizedRuntimeName applies the same guard.
    const harnessResourceName = sanitizeBedrockAgentcoreName(
      this.props.naming
        .withResourceType(MdaaResourceType.BEDROCK_AGENTCORE_HARNESS)
        .resourceName(props.harnessName, MAX_HARNESS_NAME_LENGTH),
      'r_',
      MAX_HARNESS_NAME_LENGTH,
    );

    const { role: harnessRole, managedPolicy: harnessManagedPolicy } = this.createOrReferenceHarnessRole(
      props,
      modelArn,
      guardrail,
      gatewayArns,
      harnessResourceName,
    );
    this.harnessRole = harnessRole;
    const roleArn = this.harnessRole.roleArn;

    const harnessProps: bedrockagentcore.CfnHarnessProps = {
      harnessName: harnessResourceName,
      executionRoleArn: roleArn,
      model: {
        bedrockModelConfig: {
          modelId: modelArn,
          temperature: props.modelConfig?.temperature,
          topP: props.modelConfig?.topP,
          maxTokens: props.modelConfig?.maxTokens,
          // The harness always uses the Converse (`converse_stream`) API - the only format wired today
          // and the only one carrying guardrailConfig. Pinned from the typed enum rather than exposed
          // as a caller option (see HarnessBedrockApiFormat).
          apiFormat: HARNESS_API_FORMAT,
        },
      },
      truncation: buildTruncation(props.truncation),
      systemPrompt: [{ text: props.systemPrompt }],
      maxIterations: props.maxIterations,
      maxTokens: props.maxTokens,
      timeoutSeconds: props.timeoutSeconds,
      environment: buildEnvironment(props, endpointAccess?.securityGroupId),
      environmentArtifact: buildEnvironmentArtifact(props.container),
      environmentVariables: props.environmentVariables,
      authorizerConfiguration: buildAuthorizerConfiguration(props.authorizerConfiguration),
      allowedTools: props.allowedTools && props.allowedTools.length > 0 ? props.allowedTools : undefined,
      skills: buildSkills(props.skills),
      // AgentCore Memory is not supported yet. The service default is to auto-create managed memory,
      // so the empty-object `Disabled: {}` marker is set explicitly to opt out: no memory resource is
      // created. Configurable, customer-managed-key-encrypted memory is planned for a future release.
      memory: { disabled: {} },
      tools: buildTools(props.tools, gatewayArns),
    };

    this.harness = new bedrockagentcore.CfnHarness(this, 'Harness', harnessProps);

    // CreateHarness validates the execution role, but the permission set is attached policy-side
    // (MdaaManagedPolicy `roles: [role]`), which creates no CfnHarness->policy dependency. Without an
    // explicit dependency the harness can be created before the policy attaches, so the first deploy
    // of a same-stack created role fails with `NotStabilized: Role validation failed`. Depend on the
    // policy so it is in place before CreateHarness runs.
    this.harness.node.addDependency(harnessManagedPolicy);

    if (guardrail) {
      this.applyGuardrailOverride(this.harness, guardrail);
    }

    // Create the endpoint before log protection so the log-protection Custom Resource can depend on
    // it (the service creates a per-endpoint log group), mirroring the Runtime construct.
    if (props.endpoint) {
      this.harnessEndpoint = this.createHarnessEndpoint(props.endpoint, props.harnessName);
    }

    this.createLogProtection(props);
    this.storeSSMParameters(props.harnessName, roleArn);
  }

  /**
   * Creates only the Harness side of private endpoint connectivity. The orchestrating module owns the
   * endpoint resources, their policies, placement, and lifecycle - one set per VPC, shared by every
   * Harness referencing it; the Harness adds a client security group unique to itself and one rule pair
   * per endpoint it reaches.
   */
  private createVpcEndpointAccess(
    props: BedrockAgentcoreHarnessL3ConstructProps,
  ): HarnessVpcEndpointAccess | undefined {
    // The config field is the opt-in and the injected object is its resolution, so both are required:
    // validateHarnessConfig has already rejected a reference the orchestrator did not resolve, and a
    // resolution without a reference is ignored rather than wired.
    if (!props.networkConfiguration.vpcEndpoints || !props.vpcEndpointAccess) {
      return undefined;
    }
    return new HarnessVpcEndpointAccess(this, 'VpcEndpointAccess', {
      harnessName: props.harnessName,
      access: props.vpcEndpointAccess,
      naming: this.props.naming,
    });
  }

  /**
   * Resolves each `agentCoreGateway` tool's `gatewayArn` to a live ARN: a `config:<name>` reference
   * is looked up in the orchestrating module's `gateways` map (throwing if absent); a literal ARN
   * passes through unchanged.
   *
   * @returns a map of tool name to resolved gateway ARN, for gateway tools only
   */
  private resolveGatewayArns(
    tools: NamedHarnessToolProps | undefined,
    gateways?: { [name: string]: string },
  ): { [toolName: string]: string } {
    const resolved: { [toolName: string]: string } = {};
    Object.entries(tools ?? {}).forEach(([toolName, tool]) => {
      const gatewayConfig = tool.agentCoreGateway;
      if (!gatewayConfig) {
        return;
      }
      const ref = gatewayConfig.gatewayArn;
      if (!ref.startsWith(CONFIG_REF_PREFIX)) {
        resolved[toolName] = ref;
        return;
      }
      const gatewayName = ref.slice(CONFIG_REF_PREFIX.length).trim();
      const gatewayArn = gateways?.[gatewayName];
      if (!gatewayArn) {
        throw new Error(
          `Harness tool "${toolName}" references unknown gateway from config: "${gatewayName}". ` +
            `Define it under the module's "gateways" map or correct the reference.`,
        );
      }
      resolved[toolName] = gatewayArn;
    });
    return resolved;
  }

  /**
   * Resolves the guardrail association to its ARN (for the IAM `ApplyGuardrail` grant) and
   * identifier/version pair (for the escape-hatch override), looking up `config:<name>` references
   * in the orchestrating module's `guardrails` map, or treating a non-prefixed `id` as a literal
   * guardrail id (which then requires an explicit `version`).
   */
  private resolveGuardrail(
    guardrail?: HarnessGuardrailAssociation,
    guardrails?: ResolvedGuardrailRefMap,
  ): ResolvedGuardrail | undefined {
    if (!guardrail) {
      return undefined;
    }
    let guardrailIdentifier: string;
    let guardrailVersion: string;
    if (guardrail.id.startsWith(CONFIG_REF_PREFIX)) {
      const guardrailName = guardrail.id.slice(CONFIG_REF_PREFIX.length).trim();
      const resolved = guardrails?.[guardrailName];
      if (!resolved) {
        throw new Error(
          `Harness guardrail references unknown guardrail from config: "${guardrailName}". ` +
            `Define it under the module's "guardrails" map or correct the reference.`,
        );
      }
      guardrailIdentifier = resolved.guardrailId;
      // `||` (not `??`): an empty-string version must fall back to the referenced guardrail's live
      // version, matching the literal-id branch's `if (!guardrail.version)` treatment of '' as absent.
      // validateGuardrail already rejects a provided-but-empty version, so this is defence in depth.
      guardrailVersion = guardrail.version || resolved.guardrailVersion;
    } else {
      if (!guardrail.version) {
        throw new Error('Harness guardrail "version" is required when "id" is a literal guardrail id.');
      }
      guardrailIdentifier = guardrail.id;
      guardrailVersion = guardrail.version;
    }
    // A guardrail identifier may be a bare id or an already-qualified guardrail ARN; only wrap the
    // bare id so an ARN-shaped id is not double-wrapped into `...:guardrail/arn:aws:bedrock:...`.
    const guardrailArn = guardrailIdentifier.startsWith('arn:')
      ? guardrailIdentifier
      : `arn:${this.partition}:bedrock:${this.region}:${this.account}:guardrail/${guardrailIdentifier}`;
    return {
      guardrailIdentifier,
      guardrailVersion,
      guardrailArn,
      trace: guardrail.trace ?? HarnessGuardrailTrace.ENABLED,
    };
  }

  /**
   * Renders the guardrail escape hatch: `Model.BedrockModelConfig.AdditionalParams.guardrailConfig`.
   * The pinned CDK L1's `HarnessBedrockModelConfigProperty` has no typed field for `AdditionalParams` -
   * see the class-level documentation. The `ApiFormat: converse_stream` guardrails require is always
   * set directly on the typed `bedrockModelConfig.apiFormat` field (no override), guardrail or not.
   */
  private applyGuardrailOverride(harness: bedrockagentcore.CfnHarness, guardrail: ResolvedGuardrail): void {
    harness.addPropertyOverride('Model.BedrockModelConfig.AdditionalParams', {
      guardrailConfig: {
        guardrailIdentifier: guardrail.guardrailIdentifier,
        guardrailVersion: guardrail.guardrailVersion,
        trace: guardrail.trace,
      },
    });
  }

  /**
   * Resolves the Harness execution role to an {@link IRole}, then attaches its scoped
   * customer-managed execution permissions. The role is either:
   * - **referenced** - via `props.role` (an {@link MdaaRoleRef} resolvable by name, ARN, or id), so
   *   one role can be shared across resources (the bedrock-builder pattern); or
   * - **created** - an `MdaaRole` trusting `bedrock-agentcore.amazonaws.com`, scoped by
   *   aws:SourceAccount / aws:SourceArn.
   *
   * The permission set is attached via a single `MdaaManagedPolicy` with `roles: [role]` (mirroring
   * the Gateway construct) so it lands on the resolved role whether created or referenced - a
   * referenced role would otherwise deploy with zero permissions and fail at first invoke.
   */
  private createOrReferenceHarnessRole(
    props: BedrockAgentcoreHarnessL3ConstructProps,
    modelArn: string,
    guardrail: ResolvedGuardrail | undefined,
    gatewayArns: { [toolName: string]: string },
    harnessResourceName: string,
  ): { role: IRole; managedPolicy: MdaaManagedPolicy } {
    const role: IRole = props.role
      ? props.roleHelper
          .resolveRoleRefWithRefId(props.role, `harness-execution-role-${props.harnessName}`)
          .role(`harness-execution-role-${props.harnessName}`)
      : this.createHarnessRole(props);
    const managedPolicy = this.attachHarnessRolePolicy(
      role,
      props,
      modelArn,
      guardrail,
      gatewayArns,
      harnessResourceName,
      props.role === undefined,
    );
    return { role, managedPolicy };
  }

  /**
   * Creates the auto-managed Harness execution role: an `MdaaRole` trusting
   * `bedrock-agentcore.amazonaws.com`, scoped by `aws:SourceAccount` and an `aws:SourceArn` limited to
   * AgentCore resources in this account/region (service-wide `:*`, NOT `harness/*`).
   *
   * The SourceArn the AgentCore control plane presents at CreateHarness role validation is NOT the
   * harness ARN - a `harness/...` prefix (whether name-scoped `harness/<name>-*` or broad `harness/*`)
   * fails validation deterministically ("Role validation failed ... trust policy allows assumption").
   * Both were verified to fail on deploy. The service-wide `:*` matches (the AgentCore Runtime construct
   * and the AWS harness-security-guide sample both use `:*`, and the referenced-role path works with it),
   * so the SourceAccount condition provides the confused-deputy protection while SourceArn stays `:*`.
   *
   * The permission set is attached separately by {@link attachHarnessRolePolicy} so both the created
   * and referenced paths share one policy definition.
   */
  private createHarnessRole(props: BedrockAgentcoreHarnessL3ConstructProps): MdaaRole {
    const stack = Stack.of(this);
    const { partition, account, region } = stack;
    const trustPolicy = new ServicePrincipal('bedrock-agentcore.amazonaws.com', {
      conditions: {
        StringEquals: {
          'aws:SourceAccount': account,
        },
        ArnLike: {
          'aws:SourceArn': `arn:${partition}:bedrock-agentcore:${region}:${account}:*`,
        },
      },
    });

    return new MdaaRole(this, 'HarnessRole', {
      naming: this.props.naming,
      roleName: `bedrock-agentcore-harness-${props.harnessName}`,
      assumedBy: trustPolicy,
      description: `IAM role for Bedrock AgentCore Harness: ${props.harnessName}`,
    });
  }

  /**
   * Builds the definitive AgentCore Harness execution-role permission set (model invocation,
   * ECR-public pull for the AWS-managed harness container, X-Ray tracing, CloudWatch Logs/Metrics,
   * workload identity, and default browser/code-interpreter tools), plus config-conditional grants
   * for guardrails, gateway tools, and a private/VPC container image, and attaches it to `role` via
   * an `MdaaManagedPolicy` (`roles: [role]`) so it applies whether the role was created here or
   * referenced. No AgentCore Memory grant: memory is disabled.
   *
   * @param roleOwnedHere - true when the role is an `MdaaRole` created by this construct, so the
   *   role-level cdk-nag suppressions are applied; false for a referenced role we do not own.
   * @returns the `MdaaManagedPolicy` carrying the permission set, so the caller can make the
   *   `CfnHarness` depend on it (the policy-side attachment creates no implicit dependency, and
   *   CreateHarness would otherwise race ahead of the permissions - `NotStabilized`).
   */
  private attachHarnessRolePolicy(
    role: IRole,
    props: BedrockAgentcoreHarnessL3ConstructProps,
    modelArn: string,
    guardrail: ResolvedGuardrail | undefined,
    gatewayArns: { [toolName: string]: string },
    harnessResourceName: string,
    roleOwnedHere: boolean,
  ): MdaaManagedPolicy {
    // Statement-by-statement, this set mirrors the "Sample execution role policy" in the AgentCore
    // Harness security guide (https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/harness-security.html);
    // each Sid matches a Sid in that sample. Where the doc uses broad sample resources
    // (foundation-model/* + bedrock:::*), MDAA scopes tighter per the doc's own production-hardening
    // note. The set is assembled one builder per statement group so each grant surface is reviewable
    // in isolation; the group order below (model -> observability -> AgentCore runtime/tools -> ECR image
    // pull -> guardrail -> gateway) is preserved. The doc's AgentCore Memory statement is omitted: memory
    // is disabled (Memory.Disabled), so the agent loop makes no memory calls.
    const policyStatements: PolicyStatement[] = [
      ...this.buildModelInvocationStatements(modelArn),
      ...this.buildObservabilityStatements(),
      ...this.buildAgentCoreRuntimeStatements(harnessResourceName),
      ...this.buildHarnessImageEcrStatements(props.container),
      ...this.buildGuardrailStatements(guardrail, props.kmsKey),
      ...this.buildGatewayInvokeStatements(gatewayArns),
    ];

    // Skill S3 sources (doc "Skill sources in Amazon S3 and Git" optional feature) are not exposed via
    // config (only `path`), so no skill S3 grant is added. Likewise the doc's API-key / OAuth2
    // credential-provider and custom browser/code-interpreter statements are unused by MDAA.

    // Rendered as a customer-managed policy via the MDAA wrapper (AwsSolutions-IAM4 suppressed below,
    // required for compliance). MdaaManagedPolicy applies compliant naming and warns via
    // checkPolicyLength() as the document approaches the IAM customer-managed-policy size ceiling of
    // 6,144 characters; the worst case here - all conditionals fired (guardrail + gateway +
    // custom-container) - is well under that ceiling (asserted in the unit tests).
    const harnessManagedPolicy = new MdaaManagedPolicy(this, 'HarnessManagedPolicy', {
      naming: this.props.naming,
      managedPolicyName: `agentcore-harness-${props.harnessName}`,
      description: `Managed policy for Bedrock AgentCore Harness: ${props.harnessName}`,
      // Attach from the policy side (not via MdaaRole.managedPolicies) so the grant lands on the
      // resolved role whether it was created here or referenced via props.role.
      roles: [role],
      document: new PolicyDocument({ statements: policyStatements }),
    });

    const wildcardSuppression = {
      id: 'AwsSolutions-IAM5',
      reason:
        'Wildcard resources are required for actions that do not support resource-level permissions, per ' +
        'the AWS service-authorization reference for each service: ' +
        'ECR GetAuthorizationToken (https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonelasticcontainerregistry.html); ' +
        'X-Ray tracing PutTraceSegments/PutTelemetryRecords/GetSamplingRules/GetSamplingTargets (https://docs.aws.amazon.com/service-authorization/latest/reference/list_awsx-ray.html); ' +
        'and cloudwatch:PutMetricData (https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatch.html), ' +
        'further scoped by a condition restricting it to the bedrock-agentcore metrics namespace. ' +
        'logs:DescribeLogGroups likewise does not support resource-level permissions ' +
        '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchlogs.html), ' +
        'so it is scoped to the log-group resource type (log-group:*) - the tightest scope the action ' +
        'accepts - rather than a bare "*". ' +
        'The AWS-managed-image ECR pull (HarnessImageEcrPull, always granted; a bring-your-own ' +
        'container adds its own repository ARN alongside it) scopes the repository name to ' +
        'harness-<region> but wildcards the account segment ' +
        'because the managed image lives in an AWS-owned registry account that varies by region and is ' +
        'not knowable at synth; the repository name is pinned, so this is the tightest scope available. ' +
        'The cross-region inference-profile grant (BedrockInferenceProfileModelInvocation, emitted only ' +
        'for an inference-profile modelId) wildcards the REGION segment of the destination ' +
        'foundation-model ARN because a profile routes to destination regions that are not knowable at ' +
        'synth; the partition and model name are pinned, and the grant is bounded by a StringLike ' +
        'condition on bedrock:InferenceProfileArn so it is usable only through this profile ' +
        '(https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-prereq.html). ' +
        'The remaining wildcards are narrowed to the service-managed harness resource prefixes ' +
        '(CloudWatch Logs log-group, log-stream, and PutResourcePolicy ARN prefixes under ' +
        '/aws/bedrock-agentcore/runtimes/, AgentCore workload-identity, and the AWS-owned default ' +
        'browser & code-interpreter prefixes) rather than a bare "*". Residual breadth: the ' +
        'logs:PutResourcePolicy resource prefix (/aws/bedrock-agentcore/runtimes/*) spans every ' +
        "AgentCore runtime log group in the account, not just this harness's group, because the " +
        'service generates the runtime id only after this role is built, so the exact log-group ARN ' +
        'is not knowable at synth. This is accepted: the action is scoped to the AgentCore runtimes ' +
        'log-group prefix (never a bare "*"), and tightening to the specific group would require a ' +
        'custom resource to resolve the service-generated id post-create.',
    };
    MdaaNagSuppressions.addCodeResourceSuppressions(harnessManagedPolicy, [wildcardSuppression], true);
    // Role-level suppressions apply only to a role this construct owns; a referenced role is external
    // and its cdk-nag posture belongs to whoever defined it.
    if (roleOwnedHere) {
      MdaaNagSuppressions.addCodeResourceSuppressions(
        role,
        [
          {
            id: 'AwsSolutions-IAM4',
            reason:
              'No AWS-managed policy is attached to this role: every permission is delivered via the ' +
              'scoped customer-managed policy (MdaaManagedPolicy) built above, whose statements mirror ' +
              "the AgentCore Harness sample execution-role policy and are scoped to this harness's " +
              'resources. The customer-managed policy is the intended delivery mechanism per MDAA ' +
              'convention, so the AWS-managed-policy finding is suppressed.',
          },
          wildcardSuppression,
        ],
        true,
      );
    }

    return harnessManagedPolicy;
  }

  /**
   * Model-invocation grants: BedrockModelInvocation (always) plus BedrockInferenceProfileModelInvocation
   * (only for a cross-region inference-profile modelId). The doc's sample grants all foundation models
   * (foundation-model/* + bedrock:::*) but recommends scoping to specific ARNs for production; MDAA
   * scopes to the single resolved model ARN (+ GetInferenceProfile for an inference-profile id, which
   * the loop must resolve before invoking).
   */
  private buildModelInvocationStatements(modelArn: string): PolicyStatement[] {
    const modelActions = ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'];
    if (modelArn.includes(':inference-profile/')) {
      modelActions.push('bedrock:GetInferenceProfile');
    }
    // A cross-region inference profile routes invocation to the underlying foundation model in each
    // destination region, so invoke on the profile ARN alone yields AccessDeniedException - the paired
    // foundation-model ARN(s) must also be granted (empty for a plain foundation-model id).
    const foundationModelArns = inferenceProfileFoundationModelArns(modelArn);

    const statements: PolicyStatement[] = [
      new PolicyStatement({
        sid: 'BedrockModelInvocation',
        effect: Effect.ALLOW,
        actions: modelActions,
        resources: [modelArn],
      }),
    ];

    // BedrockInferenceProfileModelInvocation - the destination foundation model(s) an inference profile
    // routes to, gated by bedrock:InferenceProfileArn so the grant is usable ONLY through this profile
    // (per the Bedrock inference-profile IAM docs). Region is wildcarded because destinations are not
    // knowable at synth; the condition keeps least privilege on the model itself.
    if (foundationModelArns.length > 0) {
      statements.push(
        new PolicyStatement({
          sid: 'BedrockInferenceProfileModelInvocation',
          effect: Effect.ALLOW,
          actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
          resources: foundationModelArns,
          conditions: {
            StringLike: {
              'bedrock:InferenceProfileArn': modelArn,
            },
          },
        }),
      );
    }
    return statements;
  }

  /**
   * Observability grants: X-Ray tracing plus the CloudWatch Logs group/describe/stream/put-resource-
   * policy statements and namespaced metric publishing. Each mirrors a Sid in the Harness security
   * guide's sample, scoped to the AgentCore runtimes log-group prefix (never a bare '*') where the
   * action honours a resource.
   */
  private buildObservabilityStatements(): PolicyStatement[] {
    const { partition, account, region } = this;
    return [
      // XRayTracingAccess - the harness emits distributed traces to X-Ray. These tracing actions do
      // not support resource-level permissions (service-level operations), so the doc's sample grants
      // them on '*'.
      new PolicyStatement({
        sid: 'XRayTracingAccess',
        effect: Effect.ALLOW,
        actions: [
          'xray:PutTraceSegments',
          'xray:PutTelemetryRecords',
          'xray:GetSamplingRules',
          'xray:GetSamplingTargets',
        ],
        resources: ['*'],
      }),
      // CloudWatchLogsGroup - the service creates the harness's log group under the runtime prefix and
      // enumerates its streams. Split from the stream-write statement to match the doc's sample (and
      // the AgentCore Runtime construct), which scopes group-level actions to the log-group ARN.
      new PolicyStatement({
        sid: 'CloudWatchLogsGroup',
        effect: Effect.ALLOW,
        actions: ['logs:CreateLogGroup', 'logs:DescribeLogStreams'],
        resources: [`arn:${partition}:logs:${region}:${account}:log-group:/aws/bedrock-agentcore/runtimes/*`],
      }),
      // CloudWatchLogsDescribeGroups - logs:DescribeLogGroups does not support resource-level
      // permissions, but the doc's sample scopes it to the log-group resource type (log-group:*)
      // rather than a bare '*'; MDAA matches that tighter posture.
      new PolicyStatement({
        sid: 'CloudWatchLogsDescribeGroups',
        effect: Effect.ALLOW,
        actions: ['logs:DescribeLogGroups'],
        resources: [`arn:${partition}:logs:${region}:${account}:log-group:*`],
      }),
      // CloudWatchLogsStream - the actual per-stream writes, scoped to the log-stream ARN under the
      // runtime prefix (doc sample splits these out from the group-level actions above).
      new PolicyStatement({
        sid: 'CloudWatchLogsStream',
        effect: Effect.ALLOW,
        actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [
          `arn:${partition}:logs:${region}:${account}:log-group:/aws/bedrock-agentcore/runtimes/*:log-stream:*`,
        ],
      }),
      // CloudWatchLogsPutResourcePolicy - the service attaches a resource policy to the harness's log
      // group so it can deliver logs there. logs:PutResourcePolicy DOES take a resourceArn (a LogGroup
      // ARN) and IAM enforces it, and it is permission-management (it rewrites a group's resource
      // policy), so a bare '*' would let one harness role alter every log group's policy account-wide.
      // The harness's runtime id is service-generated after the role is built, so scope to the same
      // AgentCore runtimes log-group prefix the group/stream statements above use (not a bare '*').
      new PolicyStatement({
        sid: 'CloudWatchLogsPutResourcePolicy',
        effect: Effect.ALLOW,
        actions: ['logs:PutResourcePolicy'],
        resources: [`arn:${partition}:logs:${region}:${account}:log-group:/aws/bedrock-agentcore/runtimes/*`],
      }),
      // CloudWatchMetricsPublish - cloudwatch:PutMetricData does not support resource-level
      // permissions; scoped by the bedrock-agentcore namespace condition (the most restrictive posture
      // possible for this action), matching the doc's sample.
      new PolicyStatement({
        sid: 'CloudWatchMetricsPublish',
        effect: Effect.ALLOW,
        actions: ['cloudwatch:PutMetricData'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'cloudwatch:namespace': 'bedrock-agentcore',
          },
        },
      }),
    ];
  }

  /**
   * AgentCore runtime/tool grants: workload-identity token retrieval, the built-in AWS-managed browser
   * and code-interpreter tools, and the DenyRoleAssumption guardrail. The doc's AgentCore Memory
   * statement is omitted: memory is disabled (Memory.Disabled), so the agent loop makes no memory calls;
   * the grant is added when memory support is introduced.
   */
  private buildAgentCoreRuntimeStatements(harnessResourceName: string): PolicyStatement[] {
    const { partition, account, region } = this;
    return [
      // AgentCoreWorkloadIdentity - the harness workload obtains its workload-access tokens from the
      // default workload-identity directory. The service names the workload identity
      // `harness_<HarnessName>-<serviceHash>`, so this is scoped to this harness's resolved name plus a
      // trailing '*' for the service-generated hash suffix (matching the doc's sample resource shape).
      new PolicyStatement({
        sid: 'AgentCoreWorkloadIdentity',
        effect: Effect.ALLOW,
        actions: ['bedrock-agentcore:GetWorkloadAccessToken', 'bedrock-agentcore:GetWorkloadAccessTokenForJWT'],
        resources: [
          `arn:${partition}:bedrock-agentcore:${region}:${account}:workload-identity-directory/default`,
          `arn:${partition}:bedrock-agentcore:${region}:${account}:workload-identity-directory/default/workload-identity/harness_${harnessResourceName}*`,
        ],
      }),
      // AgentCoreBrowserDefault - the built-in AWS-managed browser tool. Scoped to the AWS-owned
      // browser resource prefix (account segment is literal 'aws'); matches the doc's sample.
      new PolicyStatement({
        sid: 'AgentCoreBrowserDefault',
        effect: Effect.ALLOW,
        actions: [
          'bedrock-agentcore:StartBrowserSession',
          'bedrock-agentcore:GetBrowserSession',
          'bedrock-agentcore:ListBrowserSessions',
          'bedrock-agentcore:StopBrowserSession',
          'bedrock-agentcore:ConnectBrowserAutomationStream',
          'bedrock-agentcore:ConnectBrowserLiveViewStream',
          'bedrock-agentcore:UpdateBrowserStream',
        ],
        resources: [`arn:${partition}:bedrock-agentcore:${region}:aws:browser/*`],
      }),
      // AgentCoreCodeInterpreterDefault - the built-in AWS-managed code-interpreter tool. Scoped to
      // the AWS-owned code-interpreter resource prefix (account segment is literal 'aws'); matches the
      // doc's sample.
      new PolicyStatement({
        sid: 'AgentCoreCodeInterpreterDefault',
        effect: Effect.ALLOW,
        actions: [
          'bedrock-agentcore:StartCodeInterpreterSession',
          'bedrock-agentcore:GetCodeInterpreterSession',
          'bedrock-agentcore:ListCodeInterpreterSessions',
          'bedrock-agentcore:StopCodeInterpreterSession',
          'bedrock-agentcore:InvokeCodeInterpreter',
        ],
        resources: [`arn:${partition}:bedrock-agentcore:${region}:aws:code-interpreter/*`],
      }),
      // DenyRoleAssumption - the harness never switches roles, so deny sts:AssumeRole on this role.
      // Per the harness security guide, a caller can override model additionalParams (e.g. aws_role_name)
      // at invoke time to attempt role assumption from the execution role; this explicit Deny closes that
      // path regardless of what the loop is coaxed into requesting.
      new PolicyStatement({
        sid: 'DenyRoleAssumption',
        effect: Effect.DENY,
        actions: ['sts:AssumeRole'],
        resources: ['*'],
      }),
    ];
  }

  /**
   * HarnessImageEcrPull / HarnessImageEcrToken - the harness pulls its container image(s) from private
   * ECR (MDAA always enforces VPC mode, so never from ECR Public), which needs a private-ECR auth token
   * (ecr:GetAuthorizationToken) plus layer/image reads scoped to the repository(ies).
   *   - The AWS-managed image in the private repo `harness-<region>` is ALWAYS pulled - the service
   *     pulls that agent-loop image every session, including for a BYO container. Its account is
   *     AWS-owned and varies by region, so the account is wildcarded and the repo name pinned.
   *   - When a BYO container is configured, ALSO grant its resolved repository ARN. Both grants are
   *     required; it is NOT one-or-the-other.
   * BatchCheckLayerAvailability is included (the doc's VPC managed-image pull sample lists it) so a
   * full docker pull succeeds.
   */
  private buildHarnessImageEcrStatements(container: HarnessContainerProperty | undefined): PolicyStatement[] {
    const { partition, region } = this;
    const imageRepositoryArns = [`arn:${partition}:ecr:${region}:*:repository/harness-${region}`];
    if (container) {
      imageRepositoryArns.push(parseEcrRepositoryArn(container.containerUri, partition));
    }
    return [
      new PolicyStatement({
        sid: 'HarnessImageEcrPull',
        effect: Effect.ALLOW,
        actions: ['ecr:GetDownloadUrlForLayer', 'ecr:BatchGetImage', 'ecr:BatchCheckLayerAvailability'],
        resources: imageRepositoryArns,
      }),
      new PolicyStatement({
        sid: 'HarnessImageEcrToken',
        effect: Effect.ALLOW,
        actions: ['ecr:GetAuthorizationToken'],
        resources: ['*'],
      }),
    ];
  }

  /**
   * Guardrail grants (empty when no guardrail is configured): AllowApplyBedrockGuardrail - Bedrock
   * guardrail enforcement over the Converse API - plus GuardrailKmsDecrypt for the guardrail's CMK.
   * Not in the harness doc's execution-role sample (the harness applies the guardrail via the model's
   * additionalParams), so bedrock:ApplyGuardrail is granted on the resolved guardrail ARN following the
   * standard Bedrock guardrail least-privilege pattern.
   */
  private buildGuardrailStatements(guardrail: ResolvedGuardrail | undefined, kmsKey: IKey): PolicyStatement[] {
    if (!guardrail) {
      return [];
    }
    const { region } = this;
    return [
      new PolicyStatement({
        sid: 'AllowApplyBedrockGuardrail',
        effect: Effect.ALLOW,
        actions: ['bedrock:ApplyGuardrail'],
        resources: [guardrail.guardrailArn],
      }),
      // GuardrailKmsDecrypt - a CMK-encrypted guardrail (module-managed guardrails are encrypted with
      // props.kmsKey) requires kms:Decrypt on that key for ApplyGuardrail to read the policy material;
      // read-only Decrypt (+ DescribeKey) is sufficient, no encrypt-side access is needed. A literal-id
      // (externally created) guardrail's encryption is not knowable at synth, so the grant is always
      // added when a guardrail is configured and is harmless when the guardrail is not CMK-encrypted.
      //
      // Scoping: under bedrock-builder props.kmsKey is the SINGLE module-wide CMK shared with the agent
      // bucket, knowledge bases, the generated-Lambda pool, and gateways, so an unconditional grant would
      // let this role decrypt any ciphertext under that key. The grant is therefore bounded by a
      // kms:ViaService condition pinning it to bedrock.<region>.amazonaws.com - mirroring the module key
      // policy's AllowExecutionRolesToUseKeyWithContext statement (bedrock-builder-l3-construct.ts) - so
      // the role can use the key only when Bedrock (ApplyGuardrail's owning service) calls KMS on its
      // behalf.
      new PolicyStatement({
        sid: 'GuardrailKmsDecrypt',
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt', 'kms:DescribeKey'],
        resources: [kmsKey.keyArn],
        conditions: {
          StringLike: {
            'kms:ViaService': `bedrock.${region}.amazonaws.com`,
          },
        },
      }),
    ];
  }

  /**
   * AllowInvokeGateway (empty when no gateway tools are configured) - doc "AgentCore Gateway"
   * optional-feature statement: added when one or more agentcore_gateway tools are configured
   * (AWS_IAM / SigV4 outbound auth), scoped to the resolved gateway ARN(s) rather than the doc
   * sample's single gateway/* placeholder.
   */
  private buildGatewayInvokeStatements(gatewayArns: { [toolName: string]: string }): PolicyStatement[] {
    const scopedGatewayArns = Array.from(new Set(Object.values(gatewayArns)));
    if (scopedGatewayArns.length === 0) {
      return [];
    }
    return [
      new PolicyStatement({
        sid: 'AllowInvokeGateway',
        effect: Effect.ALLOW,
        actions: ['bedrock-agentcore:InvokeGateway'],
        resources: scopedGatewayArns,
      }),
    ];
  }

  /**
   * Applies always-on CMK encryption and log retention to the Harness's service-created log
   * groups (compliance by default - not gated behind config), using the caller-provided key
   * (`props.kmsKey`). The harness is a pure key consumer; the key's provisioner grants CloudWatch
   * Logs service use on the key policy. Reuses the shared `createAgentCoreLogProtection` custom
   * resource, keyed on the underlying AgentCore Runtime id (harness logs are published under that
   * id's `/aws/bedrock-agentcore/runtimes/` prefix, not a Harness-specific prefix).
   */
  private createLogProtection(props: BedrockAgentcoreHarnessL3ConstructProps): void {
    // Build the always-on data protection policy (built-in PII identifier floor plus any additions).
    const dataProtectionPolicy = buildDataProtectionPolicy('agentcore-harness-data-protection', props.dataProtection);

    const runtimeId = this.harness.attrEnvironmentAgentCoreRuntimeEnvironmentAgentRuntimeId;
    const logProtection = createAgentCoreLogProtection(this, 'LogProtection', {
      runtimeId,
      kmsKey: props.kmsKey,
      retentionDays: props.logRetentionDays,
      dataProtectionPolicy,
      naming: this.props.naming,
    });

    logProtection.node.addDependency(this.harness);

    // Also depend on the endpoint when one is configured. The service creates a per-endpoint log
    // group; depending on the endpoint narrows the window in which the Custom Resource could run
    // before that log group exists (mirrors the Runtime construct).
    if (this.harnessEndpoint) {
      logProtection.node.addDependency(this.harnessEndpoint);
    }
  }

  /**
   * Creates the harness endpoint via a raw `CfnResource`. The pinned CDK has no typed
   * `CfnHarnessEndpoint` L1 class (see the class-level documentation), so the
   * `AWS::BedrockAgentCore::HarnessEndpoint` resource is rendered directly. The endpoint depends on
   * the harness so it is created after the harness resource exists.
   */
  private createHarnessEndpoint(endpointConfig: HarnessEndpointProperty, harnessName: string): CfnResource {
    // The cap is passed to sanitizeBedrockAgentcoreName as well as resourceName so it is enforced
    // AFTER the `endpoint_` prefix is prepended (a naming prefix beginning with a non-letter would
    // otherwise push the name past the 48-char EndpointName limit). The AgentCore Runtime construct's
    // createRuntimeEndpoint applies the same guard.
    const endpointName = sanitizeBedrockAgentcoreName(
      this.props.naming
        .withResourceType(MdaaResourceType.BEDROCK_AGENTCORE_ENDPOINT)
        .resourceName(endpointConfig.name || `${harnessName}_endpoint`, MAX_HARNESS_ENDPOINT_NAME_LENGTH),
      'endpoint_',
      MAX_HARNESS_ENDPOINT_NAME_LENGTH,
    );

    const endpoint = new CfnResource(this, 'HarnessEndpoint', {
      type: HARNESS_ENDPOINT_CFN_TYPE,
      properties: {
        HarnessId: this.harness.attrHarnessId,
        EndpointName: endpointName,
        // Optional properties are left undefined when not configured so the synthesized template
        // omits them entirely.
        Description: endpointConfig.description,
        // TargetVersion: an explicit config value pins the endpoint to that version (blue/green). When
        // omitted, default to the harness's CURRENT version (CfnHarness.attrVersion, "incremented on
        // every successful update") so the named endpoint ADVANCES with each redeploy instead of
        // freezing at its create-time version. Without this, a named endpoint stays pinned to v1 while
        // the harness moves on - and if the execution role was replaced, invoking the stale version
        // fails with "execution role cannot be assumed" (unlike DEFAULT, which floats to latest).
        TargetVersion: endpointConfig.targetVersion ?? this.harness.attrVersion,
        // A raw CfnResource is not ITaggable, so the app-level `Tags.of(stack)` aspect skips it and the
        // endpoint would deploy untagged while the Harness it fronts carries the module tags - leaving it
        // outside cost-allocation and ownership attribution. `AWS::BedrockAgentCore::HarnessEndpoint`
        // does support Tags, so render the module tags directly. Remove once a typed
        // `CfnHarnessEndpoint` L1 (ITaggableV2, like CfnRuntimeEndpoint) is available and used instead.
        Tags:
          this.props.tags && Object.keys(this.props.tags).length > 0
            ? Object.entries(this.props.tags).map(([key, value]) => ({ Key: key, Value: value }))
            : undefined,
      },
    });

    endpoint.addDependency(this.harness);

    return endpoint;
  }

  private storeSSMParameters(harnessName: string, roleArn: string): void {
    const outputs: { name: string; value: string }[] = [
      { name: 'arn', value: this.harness.attrArn },
      { name: 'id', value: this.harness.attrHarnessId },
      { name: 'role-arn', value: roleArn },
    ];

    outputs.forEach(output => {
      new MdaaParamAndOutput(this, {
        resourceType: 'harness',
        resourceId: harnessName,
        name: output.name,
        value: output.value,
        ...this.props,
      });
    });

    // Publish the endpoint's identifier when one was created. The endpoint is rendered via a raw
    // CfnResource (no typed L1), so its `ref` (the CloudFormation Ref, i.e. the endpoint's primary
    // identifier) is the stable, spec-independent value to export.
    if (this.harnessEndpoint) {
      new MdaaParamAndOutput(this, {
        resourceType: 'harnessEndpoint',
        resourceId: harnessName,
        name: 'id',
        value: this.harnessEndpoint.ref,
        ...this.props,
      });
    }
  }
}

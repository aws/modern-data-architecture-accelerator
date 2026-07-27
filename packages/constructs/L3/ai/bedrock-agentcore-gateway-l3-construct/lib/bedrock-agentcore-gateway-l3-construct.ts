/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  deriveGatewayTargetName,
  GatewayExceptionLevel,
  GatewayTargetProps,
  MAX_GATEWAY_NAME_LENGTH,
  MdaaAgentcoreGateway,
  MdaaAgentcoreGatewayTarget,
  McpProtocolConfigurationProperty,
  InterceptorConfigurationsProperty,
  sanitizeGatewayName,
  validateInterceptorConfigurations,
  validateTargetConfiguration,
} from '@aws-mdaa/bedrock-constructs';
import { createMdaaVendedLogDelivery } from '@aws-mdaa/cloudwatch-constructs';
import { MdaaParamAndOutput } from '@aws-mdaa/construct';
import {
  AgentcoreAuthorizerConfigProperty,
  buildCustomJwtAuthorizer,
  resolveAuthorizerType,
} from '@aws-mdaa/agentcore-shared';
import { FunctionProps, LambdaFunctionL3Construct } from '@aws-mdaa/dataops-lambda-l3-construct';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { Stack } from 'aws-cdk-lib';
import { Effect, IRole, PolicyDocument, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export { FunctionProps } from '@aws-mdaa/dataops-lambda-l3-construct';
export {
  AgentcoreAuthorizerConfigProperty,
  CustomJwtAuthorizerProperty,
  AuthorizerType,
} from '@aws-mdaa/agentcore-shared';
// Re-export the L2 (`@aws-mdaa/bedrock-constructs`) public surface so importers of this L3 keep working.
export {
  MAX_GATEWAY_NAME_LENGTH,
  MdaaAgentcoreGateway,
  MdaaAgentcoreGatewayTarget,
  McpProtocolConfigurationProperty,
  sanitizeGatewayName,
  validateInterceptorConfigurations,
  buildProtocolConfiguration,
  buildInterceptorConfigurations,
  GatewayExceptionLevel,
  GatewayTargetProps,
  GatewayTargetConfigurationProperty,
  GatewayTargetLambdaProperty,
  GatewayTargetOpenApiProperty,
  GatewayTargetSmithyProperty,
  GatewayTargetMcpServerProperty,
  GatewayTargetApiGatewayProperty,
  GatewayTargetToolSchemaProperty,
  GatewayTargetToolDefinitionProperty,
  GatewayTargetSchemaDefinitionProperty,
  GatewayTargetS3Property,
  GatewayTargetCredentialProperty,
  GatewayTargetCredentialProviderType,
} from '@aws-mdaa/bedrock-constructs';

/**
 * Map of gateway targets (tools), keyed by a logical target name. The key becomes the target's
 * resource id (construct id `gateway-target-<name>` and SSM path).
 *
 * Use cases: registering one or more tool sources against the gateway
 *
 * AWS: AWS::BedrockAgentCore::GatewayTarget (one per entry)
 *
 * Validation: Optional; each value is a {@link GatewayTargetProps}
 */
export type GatewayTargetsMap = { [targetName: string]: GatewayTargetProps };

/**
 * Lambda interceptor configuration. Interceptors run custom code during gateway invocations
 * (REQUEST before the target call, RESPONSE after) — the in-scope per-tool authorization mechanism.
 *
 * Use cases: per-tool/operation/parameter authorization, request/response transformation
 *
 * AWS: AWS::BedrockAgentCore::Gateway GatewayInterceptorConfiguration
 *
 * Validation: at most one REQUEST and one RESPONSE interceptor (max 2 total)
 */
export interface GatewayInterceptorConfigurationsProperty {
  /**
   * Interception points at which this interceptor runs.
   *
   * Use cases: request validation, response transformation
   *
   * AWS: GatewayInterceptorConfiguration InterceptionPoints
   *
   * Validation: Required; non-empty subset of ['REQUEST', 'RESPONSE']
   **/
  readonly interceptionPoints: ('REQUEST' | 'RESPONSE')[];
  /**
   * Inline definition of the interceptor Lambda. MDAA deploys it (via `LambdaFunctionL3Construct`,
   * encrypted with the gateway CMK) and wires the gateway to its ARN; its execution role comes from
   * `roleArn`. Provide exactly one of `lambdaFunction` or `lambdaArn`.
   *
   * Use cases: custom interception logic deployed from config
   *
   * AWS: LambdaInterceptorConfiguration Arn (resolved from the deployed function)
   *
   * Validation: exactly one of lambdaFunction / lambdaArn; FunctionProps (functionName, srcDir, handler, runtime, roleArn, ...)
   **/
  readonly lambdaFunction?: FunctionProps;
  /**
   * ARN of an already-deployed interceptor Lambda (alternative to inline `lambdaFunction`). MDAA
   * deploys nothing; it wires the gateway to this ARN and grants scoped `lambda:InvokeFunction`. For
   * orchestrating modules that own the Lambda in a shared pool.
   *
   * Use cases: referencing an interceptor Lambda owned by an orchestrating module or defined elsewhere
   *
   * AWS: LambdaInterceptorConfiguration Arn
   *
   * Validation: exactly one of lambdaFunction / lambdaArn; when present, a Lambda function ARN
   **/
  readonly lambdaArn?: string;
  /**
   * Whether to pass inbound request headers to the interceptor. Defaults to false, since headers
   * may contain sensitive authorization tokens.
   *
   * Use cases: header-aware interception
   *
   * AWS: InterceptorInputConfiguration PassRequestHeaders
   *
   * Validation: Optional; Boolean
   * @default false
   **/
  readonly passRequestHeaders?: boolean;
}

/**
 * Gateway audit log-delivery configuration. Controls the CMK-encrypted CloudWatch Logs vended
 * delivery pipeline this construct provisions (the service configures no log destination itself).
 *
 * Use cases: audit logging, retention tuning, opt-out
 *
 * AWS: AWS::Logs::DeliverySource / DeliveryDestination / Delivery + a CWL destination log group
 *
 * Validation: Optional; omit for the compliant default (enabled, indefinite retention)
 */
export interface GatewayLogDeliveryProperty {
  /**
   * Whether to provision the vended log-delivery pipeline. Defaults to `true` (audit-by-default).
   * Set `false` to opt out — not recommended, as gateway audit logs are then not captured.
   *
   * Use cases: opting out of audit log capture
   *
   * AWS: gates creation of the DeliverySource / DeliveryDestination / Delivery + destination log group
   *
   * Validation: Optional; Boolean
   * @default true
   **/
  readonly enabled?: boolean;
  /**
   * Retention (in days) for the destination log group. Must be a valid CloudWatch Logs
   * `RetentionDays` value (e.g. 7, 30, 90, 365). Defaults to indefinite (the MDAA audit-log default)
   * so logs are never silently dropped; set a finite value for cost or a compliance window.
   *
   * Use cases: cost control, compliance retention windows
   *
   * AWS: AWS::Logs::LogGroup RetentionInDays
   *
   * Validation: Optional; must be a valid CloudWatch Logs RetentionDays value — validated at synth
   * (an unsupported value throws from the constructor rather than failing at deploy)
   * @default RetentionDays.INFINITE (indefinite)
   **/
  readonly logRetentionDays?: number;
}

/**
 * Configuration for a Bedrock AgentCore Gateway — a managed MCP server fronting an agent's tools.
 * MDAA enforces compliance-by-default: an always-on customer-managed KMS CMK, the inbound authorizer
 * restricted to CUSTOM_JWT or AWS_IAM, and scoped customer-managed execution policies.
 *
 * Use cases: unified MCP tool surface, per-tool authorization via interceptors, compliant gateway deployment
 *
 * AWS: Amazon Bedrock AgentCore Gateway
 *
 * Validation: authorizerConfiguration is optional (omit customJwt for AWS IAM)
 *
 * Name-less base of the gateway config surface (every field except `gatewayName` and `targets`), so
 * an orchestrating module (bedrock-builder) can key a gateway by name and add its own target-reference
 * model, while {@link BedrockAgentcoreGatewayProps} adds `gatewayName`/`targets` back for direct use.
 * (jsii forbids `Omit`/`Pick`, hence a hand-authored base interface rather than a derived type.)
 */
export interface GatewayConfigProps {
  /**
   * Description of the gateway.
   *
   * Use cases: documentation, operational clarity
   *
   * AWS: AWS::BedrockAgentCore::Gateway Description
   *
   * Validation: Optional; String; 1-200 characters (AWS documents no character-set restriction)
   **/
  readonly description?: string;
  /**
   * Inbound authorization configuration (shared with the AgentCore Runtime module). Provide
   * `customJwt` for JWT/OIDC inbound auth, or omit it to use AWS IAM (SigV4). MDAA does not support
   * `NONE` or `AUTHENTICATE_ONLY`.
   *
   * Use cases: inbound access control
   *
   * AWS: AWS::BedrockAgentCore::Gateway AuthorizerType + AuthorizerConfiguration
   *
   * Validation: Optional; valid customJwt when present (see {@link AgentcoreAuthorizerConfigProperty})
   **/
  readonly authorizerConfiguration?: AgentcoreAuthorizerConfigProperty;
  /**
   * MCP protocol configuration (instructions, search type, supported versions). MCP is the only
   * protocol the service supports, so `protocolType` is always `MCP` (set by the construct). When
   * omitted, the gateway applies the service default (semantic search off). Semantic search is
   * immutable after creation, so enable it here at creation time if needed.
   *
   * Use cases: tool discovery semantics, semantic search
   *
   * AWS: AWS::BedrockAgentCore::Gateway ProtocolConfiguration.Mcp
   *
   * Validation: Optional; McpProtocolConfigurationProperty
   **/
  readonly protocolConfiguration?: McpProtocolConfigurationProperty;
  /**
   * Exception level. Only `DEBUG` is settable; omit to leave the secure service default (INFO).
   * `DEBUG` surfaces more exception detail in responses/logs (possibly sensitive internal error and
   * request context), so use it only for troubleshooting, not in production.
   *
   * Use cases: troubleshooting
   *
   * AWS: AWS::BedrockAgentCore::Gateway ExceptionLevel
   *
   * Validation: Optional; 'DEBUG'
   **/
  readonly exceptionLevel?: GatewayExceptionLevel;
  /**
   * Reference to an existing IAM role for the gateway execution role (by `name`, `arn`, or `id`).
   * If omitted, MDAA auto-creates an MdaaRole with a scoped trust policy. Either way MDAA attaches
   * the gateway's required execution permissions (interceptor `lambda:InvokeFunction` when
   * configured; no CloudWatch Logs permissions, as gateways log via vended delivery) — there is no
   * separate "extra policies" field. To grant more, add it to the referenced role's own definition.
   *
   * Use cases: role reuse via a single fully-defined role, or auto-created in place
   *
   * AWS: AWS::BedrockAgentCore::Gateway RoleArn
   *
   * Validation: Optional; MdaaRoleRef
   **/
  readonly role?: MdaaRoleRef;
  /**
   * Lambda interceptors (at most one REQUEST and one RESPONSE).
   *
   * Use cases: per-tool authorization, request/response transformation
   *
   * AWS: AWS::BedrockAgentCore::Gateway InterceptorConfigurations
   *
   * Validation: Optional; GatewayInterceptorConfigurationsProperty[]; max 2 (one per interception point)
   **/
  readonly interceptors?: GatewayInterceptorConfigurationsProperty[];
  /**
   * Gateway audit log delivery. Omit for the compliant default (a CMK-encrypted CloudWatch Logs
   * destination log group plus a vended delivery pipeline on the gateway ARN, indefinite retention).
   *
   * Use cases: audit logging, retention tuning, opt-out
   *
   * AWS: CloudWatch Logs vended delivery (DeliverySource / DeliveryDestination / Delivery)
   *
   * Validation: Optional; {@link GatewayLogDeliveryProperty}
   **/
  readonly logDelivery?: GatewayLogDeliveryProperty;
}

/**
 * Full configuration for a standalone Bedrock AgentCore Gateway: the name-less {@link GatewayConfigProps}
 * plus the gateway's own `gatewayName` and its inline `targets` map. This is the props shape for direct
 * use of {@link BedrockAgentcoreGatewayL3Construct}.
 *
 * Use cases: unified MCP tool surface, per-tool authorization via interceptors, compliant gateway deployment
 *
 * AWS: Amazon Bedrock AgentCore Gateway
 *
 * Validation: gatewayName is required; authorizerConfiguration is optional (omit customJwt for AWS IAM)
 */
export interface BedrockAgentcoreGatewayProps extends GatewayConfigProps {
  /**
   * Unique name for the gateway. MDAA-named and sanitized to the gateway name pattern
   * (`^([0-9a-zA-Z][-]?){1,48}$`).
   *
   * Use cases: gateway identification
   *
   * AWS: AWS::BedrockAgentCore::Gateway Name
   *
   * Validation: Required; String
   **/
  readonly gatewayName: string;
  /**
   * Tools to register against the gateway, keyed by a logical target name. Gateway and targets
   * deploy in one stack, so each target is wired in-process (no SSM round-trip): one
   * `AWS::BedrockAgentCore::GatewayTarget` per entry. For a Lambda tool source the execution role
   * is granted scoped `lambda:InvokeFunction` on the target Lambda.
   *
   * Use cases: exposing MCP tools through the gateway
   *
   * AWS: AWS::BedrockAgentCore::GatewayTarget (one per entry)
   *
   * Validation: Optional; map of {@link GatewayTargetProps}
   **/
  readonly targets?: GatewayTargetsMap;
  /**
   * The customer-managed KMS key for gateway encryption, provided by the caller. The gateway is a
   * pure key consumer — it never provisions, imports, or mutates the key — so it is never left on an
   * AWS-managed key. A live {@link IKey} construct input (not part of the serializable
   * {@link GatewayConfigProps}), hence on the standalone construct props.
   *
   * The key's provisioner must already grant, on the key policy: the execution role's encryption use
   * (`kms:DescribeKey`/`kms:Decrypt`/`kms:GenerateDataKey` and a `kms:ViaService`-scoped
   * `kms:CreateGrant`), plus the CloudWatch Logs at-rest + `delivery.logs.amazonaws.com` use for the
   * audit-log pipeline.
   *
   * Use cases: caller-resolved / shared-per-module CMK, dedicated per-gateway CMK
   *
   * AWS: AWS::BedrockAgentCore::Gateway KmsKeyArn
   *
   * Validation: Required; an IKey pre-granted for the gateway service role and CloudWatch Logs
   **/
  readonly kmsKey: IKey;
}

/** L3 construct props combining gateway config with MDAA infrastructure properties. */
export interface BedrockAgentcoreGatewayL3ConstructProps extends MdaaL3ConstructProps, BedrockAgentcoreGatewayProps {}

/**
 * MDAA L3 construct that deploys a compliant Bedrock AgentCore Gateway (MCP server). It orchestrates
 * the gateway's dependencies — an always-on customer-managed KMS CMK, a scoped execution role, and
 * optional interceptor Lambda functions — wires them into the compliant `MdaaAgentcoreGateway` L2
 * (which owns the gateway-resource compliance invariants), and publishes SSM outputs.
 */
export class BedrockAgentcoreGatewayL3Construct extends MdaaL3Construct {
  public readonly gateway: MdaaAgentcoreGateway;
  public readonly gatewayRole: IRole;
  public readonly gatewayKmsKey: IKey;
  protected readonly props: BedrockAgentcoreGatewayL3ConstructProps;

  constructor(scope: Construct, id: string, props: BedrockAgentcoreGatewayL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    // Resolve inbound auth to the AWS authorizerType (CUSTOM_JWT with a customJwt authorizer,
    // otherwise AWS_IAM).
    const authorizerType = resolveAuthorizerType(props.authorizerConfiguration);
    // Fail fast on interceptor limits and the exactly-one-Lambda-source rule before deploying any
    // functions (the L2 re-validates as a backstop).
    validateInterceptorConfigurations(props.interceptors);
    this.validateInterceptorLambdaSources(props.interceptors);
    // Fail fast at synth on an invalid log-retention value; CloudWatch Logs RetentionDays accepts
    // only a fixed set of values, and CloudFormation would otherwise reject it at deploy.
    this.validateLogRetentionDays(props.logDelivery?.logRetentionDays);

    // Resolve the MDAA-named, sanitized gateway name once, to scope the auto-created role's
    // trust-policy `aws:SourceArn` to this gateway's ARN prefix. MdaaAgentcoreGateway derives the
    // same name for the resource — both MUST use MAX_GATEWAY_NAME_LENGTH so the truncated names (and
    // thus the SourceArn prefix) match, or the trust policy would not admit the gateway.
    const gatewayResourceName = sanitizeGatewayName(
      this.props.naming
        .withResourceType(MdaaResourceType.BEDROCK_AGENTCORE_GATEWAY)
        .resourceName(props.gatewayName, MAX_GATEWAY_NAME_LENGTH),
    );

    // 1. Resolve the execution role — created by MDAA or referenced (`role` by name/arn/id) — and
    //    attach the scoped execution permissions (the bedrock-builder pattern). The interceptor
    //    lambda:InvokeFunction grant is added later (step 4), once the functions exist.
    const { role, roleArn } = this.createOrReferenceGatewayRole(props, gatewayResourceName);
    this.gatewayRole = role;

    // 2. Use the caller-provided KMS CMK as-is. The gateway is a pure key consumer; all key grants
    //    are the responsibility of whoever provisions the key.
    this.gatewayKmsKey = props.kmsKey;

    // 3. Deploy each interceptor's inline Lambda (encrypted with the gateway CMK) and map each
    //    interceptor to its deployed function ARN.
    const interceptorArnConfigs = this.buildInterceptorFunctions(props, this.gatewayKmsKey.keyArn);

    // 4. Grant scoped lambda:InvokeFunction on the interceptor ARNs to the gateway role.
    const interceptorInvokePolicy = this.grantInterceptorInvoke(role, interceptorArnConfigs);

    // 5. Build the compliant gateway (L2), which enforces the gateway-resource compliance invariants
    //    (CMK always present, authorizer restricted, protocolType MCP, name sanitized).
    this.gateway = this.createGateway(props, authorizerType, roleArn, this.gatewayKmsKey.keyArn, interceptorArnConfigs);

    // The gateway orders its role/KMS/interceptor ARNs implicitly but NOT the interceptor-invoke
    // policy, so add an explicit edge so the role can invoke before the service validates the
    // gateway. No cycle: the policy references the function ARNs, not the gateway.
    if (interceptorInvokePolicy) {
      this.gateway.node.addDependency(interceptorInvokePolicy);
    }

    // 5b. Provision the CMK-encrypted vended log-delivery pipeline (audit-by-default). Runs after
    //     the gateway so the delivery source can reference the gateway ARN.
    this.createLogDelivery(props);

    // `bedrock-agentcore:SynchronizeGatewayTargets` is intentionally NOT granted: it is a
    // control-plane action for the DEPLOYING principal (the CDK CloudFormation execution role), not
    // the gateway's execution role. See the README "Semantic Search" section.

    // 6. Publish the role / KMS SSM parameters owned by this construct (the gateway's own attributes
    //    are published by the L2).
    this.storeSSMParameters(props.gatewayName, roleArn);

    // 7. Register the gateway's targets (tools), wired in-process from the gateway object/role.
    this.createTargets(props, role);
  }

  /**
   * Builds one {@link MdaaAgentcoreGatewayTarget} (L2) per entry in `props.targets`, then grants the
   * gateway execution role scoped `lambda:InvokeFunction` on all Lambda target ARNs via one
   * consolidated managed policy (as in {@link grantInterceptorInvoke}, keeping the shared role under
   * the IAM attached-policy limit). The map key is both the child construct id and the resource id.
   * No-op when no targets.
   */
  private createTargets(props: BedrockAgentcoreGatewayProps, role: IRole): void {
    const targetEntries = Object.entries(props.targets ?? {});
    if (targetEntries.length === 0) {
      return;
    }

    // Fail fast on every target config before building any resource (the L2 re-validates).
    targetEntries.forEach(([targetName, targetConfig]) => validateTargetConfiguration(targetName, targetConfig));

    // Fail fast on keys that collapse to the same resource name: distinct keys get distinct construct
    // ids, but naming + sanitization can map two keys to one target name (e.g. `my_tool`/`my-tool`),
    // which would pass synth and fail at deploy with a ConflictException.
    this.assertUniqueTargetNames(targetEntries.map(([targetName]) => targetName));

    // One consolidated invoke policy for all Lambda target ARNs (deduped). Only Lambda targets need
    // an invoke grant, so collect ARNs only from targets with a Lambda tool source.
    const invokePolicy = this.grantTargetInvoke(
      role,
      targetEntries
        .map(([, targetConfig]) => targetConfig.targetConfiguration.lambda?.lambdaArn)
        .filter((arn): arn is string => arn !== undefined),
    );

    targetEntries.forEach(([targetName, targetConfig]) => {
      const target = new MdaaAgentcoreGatewayTarget(this, `gateway-target-${targetName}`, {
        naming: this.props.naming,
        createParams: this.props.createParams,
        createOutputs: this.props.createOutputs,
        targetName,
        targetConfig,
        gatewayIdentifier: this.gateway.attrGatewayIdentifier,
      });

      // Explicit dependency on the gateway resource so it is fully created before the service
      // synchronizes this target. No cycle: the gateway does not reference the target.
      target.node.addDependency(this.gateway);
      // The tool Lambda must be invocable by the role before the target is synchronized; the invoke
      // policy references the role, not the target, so add the edge explicitly.
      if (invokePolicy) {
        target.node.addDependency(invokePolicy);
      }
    });
  }

  /**
   * Throws if two target keys resolve to the same `AWS::BedrockAgentCore::GatewayTarget` name (via
   * the L2's {@link deriveGatewayTargetName}), naming the first colliding pair — turning a
   * deploy-time `ConflictException` into a clear synth-time error.
   */
  private assertUniqueTargetNames(targetNames: string[]): void {
    const derivedToKey = new Map<string, string>();
    targetNames.forEach(targetName => {
      const derived = deriveGatewayTargetName(this.props.naming, targetName);
      const existingKey = derivedToKey.get(derived);
      if (existingKey !== undefined) {
        throw new Error(
          `Gateway target names collide: keys "${existingKey}" and "${targetName}" both resolve to target name ` +
            `"${derived}". Target names must be unique within a gateway; rename one of the target keys.`,
        );
      }
      derivedToKey.set(derived, targetName);
    });
  }

  /**
   * Grants the gateway execution role scoped `lambda:InvokeFunction` on each target's tool Lambda
   * ARN via a single consolidated managed policy.
   *
   * @returns the invoke policy (so each target can depend on it), or undefined when no ARNs are given.
   */
  private grantTargetInvoke(role: IRole, lambdaArns: string[]): MdaaManagedPolicy | undefined {
    return this.buildScopedInvokePolicy(role, lambdaArns, {
      constructId: 'GatewayTargetInvokePolicy',
      policyNameSuffix: 'target',
      sid: 'GatewayInvokeTargetLambdas',
    });
  }

  /**
   * Builds the compliant gateway via the {@link MdaaAgentcoreGateway} L2, which enforces the
   * gateway-resource compliance invariants (CMK always present, authorizer restricted, MCP protocol,
   * name sanitized). Builds the CUSTOM_JWT authorizer configuration here; AWS_IAM carries none.
   *
   * @param interceptorArnConfigs - Interceptors referencing their already-deployed functions by ARN.
   */
  private createGateway(
    props: BedrockAgentcoreGatewayProps,
    authorizerType: string,
    roleArn: string,
    kmsKeyArn: string,
    interceptorArnConfigs: InterceptorConfigurationsProperty[],
  ): MdaaAgentcoreGateway {
    // CUSTOM_JWT carries an authorizerConfiguration (built by the shared helper); AWS_IAM carries none.
    const authorizerConfiguration = props.authorizerConfiguration?.customJwt
      ? { customJwtAuthorizer: buildCustomJwtAuthorizer(props.authorizerConfiguration.customJwt) }
      : undefined;

    return new MdaaAgentcoreGateway(this, 'Gateway', {
      naming: this.props.naming,
      createParams: this.props.createParams,
      createOutputs: this.props.createOutputs,
      gatewayName: props.gatewayName,
      roleArn,
      kmsKeyArn,
      authorizerType,
      authorizerConfiguration,
      protocolConfiguration: props.protocolConfiguration,
      description: props.description,
      exceptionLevel: props.exceptionLevel,
      interceptors: interceptorArnConfigs,
    });
  }

  /**
   * Validates that each interceptor supplies exactly one Lambda source — inline `lambdaFunction` or
   * by-ref `lambdaArn`, never both and never neither. Runs fail-fast in the constructor.
   *
   * @throws Error if an interceptor sets both or neither of `lambdaFunction` / `lambdaArn`
   */
  private validateInterceptorLambdaSources(interceptors?: GatewayInterceptorConfigurationsProperty[]): void {
    (interceptors ?? []).forEach((interceptor, index) => {
      const hasInline = interceptor.lambdaFunction !== undefined;
      const hasArn = interceptor.lambdaArn !== undefined;
      if (hasInline === hasArn) {
        throw new Error(
          `Gateway interceptor at index ${index} must set exactly one of "lambdaFunction" (inline) or ` +
            `"lambdaArn" (by-ref); received ${hasInline ? 'both' : 'neither'}.`,
        );
      }
    });
  }

  /**
   * Resolves each interceptor to a concrete Lambda ARN (source enforced by
   * {@link validateInterceptorLambdaSources}):
   * - `lambdaFunction` (inline) — MDAA deploys it via the shared `LambdaFunctionL3Construct`,
   *   encrypted with the gateway CMK, and takes the deployed ARN; or
   * - `lambdaArn` (by-ref) — already deployed; MDAA wires the given ARN and deploys nothing.
   *
   * One shared `LambdaFunctionL3Construct` is created only if at least one inline interceptor exists.
   * Returns an empty list when there are no interceptors.
   *
   * @param kmsKeyArn - The gateway CMK ARN, used to encrypt the inline functions' environment and logs.
   */
  private buildInterceptorFunctions(
    props: BedrockAgentcoreGatewayProps,
    kmsKeyArn: string,
  ): InterceptorConfigurationsProperty[] {
    const interceptors = props.interceptors ?? [];
    if (interceptors.length === 0) {
      return [];
    }

    // Build only the inline interceptors; by-ref (lambdaArn) ones deploy nothing.
    const inlineFunctions = interceptors
      .map(interceptor => interceptor.lambdaFunction)
      .filter((fn): fn is FunctionProps => fn !== undefined);
    const functions =
      inlineFunctions.length > 0
        ? new LambdaFunctionL3Construct(this, 'gateway-interceptor-functions', {
            kmsArn: kmsKeyArn,
            roleHelper: this.props.roleHelper,
            naming: this.props.naming,
            functions: inlineFunctions,
            overrideScope: true,
          })
        : undefined;

    return interceptors.map((interceptor, index) => {
      // By-ref interceptor: use the supplied ARN directly.
      if (interceptor.lambdaArn) {
        return {
          interceptionPoints: interceptor.interceptionPoints,
          lambdaArn: interceptor.lambdaArn,
          passRequestHeaders: interceptor.passRequestHeaders,
        };
      }
      // Inline interceptor: resolve the just-deployed function's ARN by functionName.
      const lambdaFunction = interceptor.lambdaFunction;
      if (!lambdaFunction) {
        // Should not happen — validateInterceptorLambdaSources guarantees a source, and lambdaArn is unset here.
        throw new Error(`Gateway interceptor at index ${index} has neither a lambdaFunction nor a lambdaArn.`);
      }
      const functionName = lambdaFunction.functionName;
      const fn = functions?.functionsMap[functionName];
      if (!fn) {
        // Should not happen — built from the same config just above.
        throw new Error(`Interceptor function not found after build: ${functionName}`);
      }
      return {
        interceptionPoints: interceptor.interceptionPoints,
        lambdaArn: fn.functionArn,
        passRequestHeaders: interceptor.passRequestHeaders,
      };
    });
  }

  /**
   * Grants the gateway execution role scoped `lambda:InvokeFunction` on each interceptor function ARN.
   *
   * @returns the invoke policy (so the gateway can depend on it), or undefined when there are no
   *   interceptors.
   */
  private grantInterceptorInvoke(
    role: IRole,
    interceptorArnConfigs: InterceptorConfigurationsProperty[],
  ): MdaaManagedPolicy | undefined {
    return this.buildScopedInvokePolicy(
      role,
      interceptorArnConfigs.map(i => i.lambdaArn),
      {
        constructId: 'GatewayInterceptorInvokePolicy',
        policyNameSuffix: 'interceptor',
        sid: 'GatewayInvokeInterceptors',
      },
    );
  }

  /**
   * Builds a single consolidated customer-managed policy granting the gateway execution role scoped
   * `lambda:InvokeFunction` on the given Lambda ARNs (deduped, no wildcard). Shared by
   * {@link grantTargetInvoke} and {@link grantInterceptorInvoke}. Attached via `roles: [role]` so it
   * works for created or referenced roles.
   *
   * @param arns - Lambda function ARNs to scope the grant to (deduped internally).
   * @param opts.constructId - CDK construct id for the policy.
   * @param opts.policyNameSuffix - Suffix in `bedrock-agentcore-gateway-<suffix>-<gatewayName>`.
   * @param opts.sid - Policy-statement sid.
   * @returns the invoke policy (so callers can add an explicit dependency), or undefined when no ARNs
   *   are given.
   */
  private buildScopedInvokePolicy(
    role: IRole,
    arns: string[],
    opts: { constructId: string; policyNameSuffix: string; sid: string },
  ): MdaaManagedPolicy | undefined {
    const scopedArns = Array.from(new Set(arns));
    if (scopedArns.length === 0) {
      return undefined;
    }

    return new MdaaManagedPolicy(this, opts.constructId, {
      managedPolicyName: `bedrock-agentcore-gateway-${opts.policyNameSuffix}-${this.props.gatewayName}`,
      naming: this.props.naming,
      roles: [role],
      document: new PolicyDocument({
        statements: [
          new PolicyStatement({
            sid: opts.sid,
            effect: Effect.ALLOW,
            actions: ['lambda:InvokeFunction'],
            resources: scopedArns,
          }),
        ],
      }),
    });
  }

  /**
   * Resolves the gateway execution role to an {@link IRole}, then attaches its scoped
   * customer-managed execution permissions. The role is either:
   * - **referenced** — via `props.role` (an {@link MdaaRoleRef} resolvable by name, ARN, or id), so
   *   one role can be shared across resources (the bedrock-builder pattern); or
   * - **created** — an `MdaaRole` trusting `bedrock-agentcore.amazonaws.com`, scoped by
   *   aws:SourceAccount / aws:SourceArn to this gateway's ARN prefix.
   *
   * MDAA attaches only the scoped interceptor `lambda:InvokeFunction` (see
   * {@link grantInterceptorInvoke}), via `roles: [role]` so a referenced role is not mutated. KMS use
   * is granted on the key policy by the key's provisioner (the gateway is a pure key consumer), and
   * no `logs:*` is granted (the gateway uses vended log delivery, not the execution role).
   *
   * @returns the resolved role and its ARN
   */
  private createOrReferenceGatewayRole(
    props: BedrockAgentcoreGatewayProps,
    gatewayResourceName: string,
  ): {
    role: IRole;
    roleArn: string;
  } {
    // Resolve to an IRole — reference an existing role, or create a scoped one.
    const role: IRole = props.role
      ? this.props.roleHelper
          .resolveRoleRefWithRefId(props.role, 'gateway-execution-role')
          .role('gateway-execution-role')
      : this.createGatewayRole(props, gatewayResourceName);

    return { role, roleArn: role.roleArn };
  }

  /**
   * Creates the auto-managed gateway execution role: an `MdaaRole` trusting
   * `bedrock-agentcore.amazonaws.com`, scoped by `aws:SourceAccount` and an `aws:SourceArn` limited
   * to this gateway's ARN prefix (`gateway/<name>-*`).
   */
  private createGatewayRole(props: BedrockAgentcoreGatewayProps, gatewayResourceName: string): MdaaRole {
    const stack = Stack.of(this);
    const trustPolicy = new ServicePrincipal('bedrock-agentcore.amazonaws.com', {
      conditions: {
        StringEquals: {
          'aws:SourceAccount': stack.account,
        },
        ArnLike: {
          'aws:SourceArn': `arn:${stack.partition}:bedrock-agentcore:${stack.region}:${stack.account}:gateway/${gatewayResourceName}-*`,
        },
      },
    });

    return new MdaaRole(this, 'GatewayRole', {
      naming: this.props.naming,
      roleName: `bedrock-agentcore-gateway-${props.gatewayName}`,
      assumedBy: trustPolicy,
      description: `IAM role for Bedrock AgentCore Gateway: ${props.gatewayName}`,
    });
  }

  /**
   * Validates the optional `logDelivery.logRetentionDays` at synth against the CloudWatch Logs
   * {@link RetentionDays} enum (a fixed set of values, 9999 being `INFINITE`), so misconfiguration
   * fails fast rather than at deploy. `undefined` is valid (indefinite, audit-by-default).
   */
  private validateLogRetentionDays(logRetentionDays?: number): void {
    if (logRetentionDays === undefined) {
      return;
    }
    // RetentionDays is a numeric enum; Object.values yields both numbers and names, so keep only the
    // numeric members.
    const validValues = Object.values(RetentionDays).filter((v): v is number => typeof v === 'number');
    if (!validValues.includes(logRetentionDays)) {
      throw new Error(
        `Invalid logDelivery.logRetentionDays '${logRetentionDays}'. Must be a valid CloudWatch Logs ` +
          `retention value (one of: ${validValues.join(', ')}), or omit it for indefinite retention.`,
      );
    }
  }

  /**
   * Provisions the CMK-encrypted CloudWatch Logs vended log-delivery pipeline that captures gateway
   * audit logs (audit-by-default). The AgentCore service configures no log destination for a gateway
   * on its own, so this construct actively provisions the pipeline (destination log group + delivery
   * source on the gateway ARN → destination → delivery) via the shared
   * {@link createMdaaVendedLogDelivery} helper.
   *
   * Adds no KMS grants (the gateway is a pure key consumer; the key's provisioner owns the at-rest
   * and `delivery.logs.amazonaws.com` grants). No-op when `logDelivery.enabled` is `false`. Must run
   * after the gateway (the delivery source references `this.gateway.attrGatewayArn`).
   */
  private createLogDelivery(props: BedrockAgentcoreGatewayProps): void {
    if (props.logDelivery?.enabled === false) {
      return;
    }

    // The path prefix mirrors the AWS-documented gateway default form; the helper's MdaaLogGroup
    // appends the MDAA-named segment. Retention defaults to indefinite when logRetentionDays is omitted.
    createMdaaVendedLogDelivery(this, {
      encryptionKey: this.gatewayKmsKey,
      logGroupNamePathPrefix: '/aws/vendedlogs/bedrock-agentcore/gateway/APPLICATION_LOGS/',
      resourceName: props.gatewayName,
      resourceArn: this.gateway.attrGatewayArn,
      logType: 'APPLICATION_LOGS',
      retention: props.logDelivery?.logRetentionDays,
      naming: this.props.naming,
      // Already inside this per-gateway scope, so use `gateway-` to match the sibling
      // `gateway-target-*` / `gateway-interceptor-functions` ids.
      idPrefix: 'gateway-',
    });
  }

  /**
   * Publishes the SSM parameters / outputs owned by this construct: the execution role ARN and the
   * KMS key ARN. The gateway's own attributes (arn / id / url) are published by the
   * {@link MdaaAgentcoreGateway} L2.
   */
  private storeSSMParameters(gatewayName: string, roleArn: string): void {
    const outputs: { name: string; value: string }[] = [
      { name: 'role-arn', value: roleArn },
      { name: 'kms-key-arn', value: this.gatewayKmsKey.keyArn },
    ];

    outputs.forEach(output => {
      new MdaaParamAndOutput(this, {
        resourceType: 'gateway',
        resourceId: gatewayName,
        name: output.name,
        value: output.value,
        ...this.props,
      });
    });
  }
}

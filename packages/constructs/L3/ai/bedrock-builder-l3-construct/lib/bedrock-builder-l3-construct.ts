/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FunctionProps, LambdaFunctionL3Construct, LayerProps } from '@aws-mdaa/dataops-lambda-l3-construct';

import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { MdaaManagedPolicy } from '@aws-mdaa/iam-constructs';
import { MdaaAuroraPgVector } from '@aws-mdaa/rds-constructs';
import { MdaaOpensearchServerlessCollection } from '@aws-mdaa/opensearch-constructs';

import { aws_bedrock as bedrock, aws_kms as kms, aws_opensearchserverless as aoss, Stack } from 'aws-cdk-lib';

import { Effect, PolicyStatement, ServicePrincipal, ArnPrincipal, IRole } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Vpc } from 'aws-cdk-lib/aws-ec2';

import { Construct } from 'constructs';
import { MdaaSecurityGroup } from '@aws-mdaa/ec2-constructs';
import { BedrockAgentL3Construct, NamedAgentProps, BedrockAgentProps } from '@aws-mdaa/bedrock-agent-l3-construct';
import {
  BedrockKnowledgeBaseL3Construct,
  BedrockKnowledgeBaseProps,
  NamedKbConfig,
  NamedKnowledgeBaseProps,
  NamedVectorStoreProps,
  OpensearchServerlessProps,
  SharedVpcEndpointDetails,
} from '@aws-mdaa/bedrock-knowledge-base-l3-construct';
import { BedrockGuardrailL3Construct, NamedGuardrailProps } from '@aws-mdaa/bedrock-guardrail-l3-construct';
import {
  BedrockAgentcoreGatewayL3Construct,
  GatewayConfigProps,
  GatewayInterceptorConfigurationsProperty,
  GatewayTargetProps,
  GatewayTargetsMap,
} from '@aws-mdaa/bedrock-agentcore-gateway-l3-construct';
import { NamedOpensearchServerlessProps, validateAndGroupVpcEndpoints } from './vpc-endpoint-validator';

/**
 * Lambda function and layer configuration for Bedrock agent action groups.
 * Defines Lambda functions and shared layers for implementing custom business logic in agent action groups.
 *
 * Use cases: Custom action group logic, shared code libraries, external API integration, business process automation
 *
 * AWS: Lambda functions and layers for Bedrock agent action groups
 *
 * Validation: At least one of layers or functions should be provided
 */
export interface LambdaFunctionProps {
  /**
   * Lambda layer definitions for shared code and dependencies used by action group functions.
   *
   * Use cases: Shared code libraries, runtime dependencies, common utilities
   *
   * AWS: Lambda layers
   *
   * Validation: Optional; LayerProps[]
   **/
  readonly layers?: LayerProps[];
  /**
   * Lambda function definitions for Bedrock agent action groups.
   * Referenced by agents via 'generated-function:' prefix in action group executor config.
   *
   * Use cases: Custom business logic, external API integration, action group implementation
   *
   * AWS: Lambda functions for Bedrock agent action groups
   *
   * Validation: Optional; FunctionProps[]
   **/
  readonly functions?: FunctionProps[];
}

// Re-export the Named types for backward compatibility
export { NamedAgentProps, NamedKnowledgeBaseProps, NamedVectorStoreProps, NamedGuardrailProps };

// Re-export the gateway config surface so the app config (and downstream consumers) can import the
// gateway/target types from the builder package rather than reaching into the gateway L3 directly.
export { GatewayConfigProps, GatewayInterceptorConfigurationsProperty, GatewayTargetProps, GatewayTargetsMap };

/**
 * Configuration for a Bedrock AgentCore Gateway, keyed by gateway name in {@link NamedGatewayProps}.
 * The name-less {@link GatewayConfigProps} plus a flat `targets` list of references into the
 * top-level `gatewayTargets` map. A target's `lambdaArn` and an interceptor's `lambdaArn` may use the
 * `generated-function:<name>` form to reference a function defined once under `lambdaFunctions`.
 *
 * Use cases: exposing a compliant MCP gateway (and its tools) from the same module that owns the
 * agents/knowledge bases/Lambdas it fronts
 *
 * AWS: Amazon Bedrock AgentCore Gateway (+ GatewayTargets)
 *
 * Validation: each `targets` entry must name a key in the top-level `gatewayTargets` map
 */
export interface BuilderGatewayProps extends GatewayConfigProps {
  /**
   * Names of gateway targets (keys in the top-level `gatewayTargets` map) to register against this
   * gateway. Each becomes one `AWS::BedrockAgentCore::GatewayTarget`.
   *
   * Use cases: attaching MCP tool sources to a gateway by reference, keeping the config flat
   *
   * AWS: AWS::BedrockAgentCore::GatewayTarget (one per referenced entry)
   *
   * Validation: Optional; each entry must be a key in `gatewayTargets`; a target may be referenced by at most one gateway
   **/
  readonly targets?: string[];
}

/**
 * Map of gateway name to {@link BuilderGatewayProps}. The key becomes the child construct id suffix
 * (`bedrock-gateway-<name>`) and the derived, MDAA-named gateway name.
 */
export interface NamedGatewayProps {
  /** @jsii ignore */
  [gatewayName: string]: BuilderGatewayProps;
}

/**
 * Map of target name to {@link GatewayTargetProps}, referenced by name from a gateway's `targets`
 * list. The key becomes the target's MDAA-named resource name; each target must be referenced by
 * exactly one gateway.
 */
export interface NamedGatewayTargetProps {
  /** @jsii ignore */
  [targetName: string]: GatewayTargetProps;
}

export interface BedrockBuilderL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Admin roles granted access to Bedrock agent resources including KMS keys and S3 buckets.
   *
   * Use cases: Administrative access, resource management, security control
   *
   * AWS: IAM roles for Bedrock resource administration
   *
   * Validation: Required; MdaaRoleRef[]
   **/
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Bedrock agent configurations with foundation models, action groups, knowledge base integration, and guardrails.
   *
   * Use cases: AI agent deployment, conversational AI, intelligent automation
   *
   * AWS: Amazon Bedrock Agents
   *
   * Validation: Optional; NamedAgentProps (map of agent name to config)
   **/
  readonly agents?: NamedAgentProps;
  /**
   * Existing KMS key ARN for encrypting all Bedrock resources in this module — agents, knowledge
   * bases, guardrails, and the shared Lambda pool all use this single key.
   * If omitted, one customer-managed key is created automatically and shared across them.
   *
   * When an existing key is provided, its key policy must already grant the required service and
   * execution-role use (the module cannot mutate an imported key's policy).
   *
   * Use cases: Customer-controlled encryption, security compliance, key reuse
   *
   * AWS: KMS key for Bedrock resource encryption
   *
   * Validation: Optional; String; must be valid KMS key ARN
   **/
  readonly kmsKeyArn?: string;
  /**
   * Existing S3 bucket ARN for agent data storage.
   * If omitted, a dedicated bucket is created automatically.
   *
   * Use cases: Agent artifact storage, data management, bucket reuse
   *
   * AWS: S3 bucket for Bedrock agent storage
   *
   * Validation: Optional; String; must be valid S3 bucket ARN
   **/
  readonly agentBucketArn?: string;
  /**
   * Lambda functions and layers for Bedrock agent action groups.
   * Enables custom business logic and external API integrations.
   *
   * Use cases: Custom action group logic, external integrations, function deployment
   *
   * AWS: Lambda functions/layers for Bedrock agent action groups
   *
   * Validation: Optional; LambdaFunctionProps
   **/
  readonly lambdaFunctions?: LambdaFunctionProps;
  /**
   * Vector store configurations for knowledge bases (OpenSearch Serverless or Aurora).
   * Provides vector database storage for semantic search and RAG.
   *
   * Use cases: Semantic search, RAG applications, knowledge retrieval, embedding storage
   *
   * AWS: OpenSearch Serverless or Aurora vector stores
   *
   * Validation: Optional; NamedVectorStoreProps (map of store name to config)
   **/
  readonly vectorStores?: NamedVectorStoreProps;
  /**
   * Knowledge base configurations with S3/SharePoint data sources and custom parsing strategies.
   * Enables document ingestion, embedding generation, and retrieval for RAG applications.
   *
   * Use cases: Knowledge management, document processing, question-answering, RAG
   *
   * AWS: Bedrock Knowledge Bases
   *
   * Validation: Optional; NamedKnowledgeBaseProps (map of KB name to config)
   **/
  readonly knowledgeBases?: NamedKnowledgeBaseProps;
  /**
   * Guardrail configurations for AI safety, content filtering, and responsible AI deployment.
   *
   * Use cases: AI safety controls, content filtering, responsible AI, content moderation
   *
   * AWS: Bedrock Guardrails
   *
   * Validation: Optional; NamedGuardrailProps (map of guardrail name to config)
   **/
  readonly guardrails?: NamedGuardrailProps;
  /**
   * Bedrock AgentCore Gateway configurations (MCP servers), keyed by gateway name. Each gateway
   * references its tool targets by name from the sibling `gatewayTargets` map.
   *
   * Use cases: exposing a unified MCP tool surface with per-tool authorization from the same module
   * that owns the agents/Lambdas it fronts
   *
   * AWS: Amazon Bedrock AgentCore Gateway
   *
   * Validation: Optional; NamedGatewayProps (map of gateway name to config)
   **/
  readonly gateways?: NamedGatewayProps;
  /**
   * Bedrock AgentCore Gateway target definitions (MCP tool sources), keyed by target name. A gateway
   * attaches a target by naming its key in the gateway's `targets` list; each target must be
   * referenced by exactly one gateway.
   *
   * Use cases: defining MCP tool sources (e.g. Lambda tools) once and referencing them from a gateway
   *
   * AWS: AWS::BedrockAgentCore::GatewayTarget
   *
   * Validation: Optional; NamedGatewayTargetProps (map of target name to config)
   **/
  readonly gatewayTargets?: NamedGatewayTargetProps;
}

/**
 * Resources collected from all knowledge bases in a group for consolidated policy creation.
 */
interface ConsolidatedResources {
  vectorStores: (MdaaAuroraPgVector | MdaaOpensearchServerlessCollection)[];
  namedKbConfigs: NamedKbConfig[];
  kbIds: string[];
}

// ---------------------------------------------
// Main Construct Class
// ---------------------------------------------

export class BedrockBuilderL3Construct extends MdaaL3Construct {
  protected readonly props: BedrockBuilderL3ConstructProps;
  protected readonly generatedFunctions: { [name: string]: string } = {};

  constructor(scope: Construct, id: string, props: BedrockBuilderL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    const dataAdminRoles = props.roleHelper.resolveRoleRefsWithOrdinals(props.dataAdminRoles, 'DataAdmin');

    // Get or create KMS key for Bedrock
    const kmsKey = this.getOrCreateKmsKey(
      props,
      dataAdminRoles.map(x => x.id()),
    );

    this.generatedFunctions = this.createLambdaFunctions(props, kmsKey);

    // Create shared VPC endpoints for OpenSearch Serverless vector stores
    const sharedVpcEndpoints = this.createSharedVpcEndpoints(props.vectorStores, props.knowledgeBases);

    // Create all knowledge bases with deferred policy creation, grouped by role
    const knowledgeBases: { [kbName: string]: bedrock.CfnKnowledgeBase } = {};
    const kbsByRole = new Map<string, BedrockKnowledgeBaseL3Construct[]>();

    Object.entries(props.knowledgeBases || {}).forEach(([kbName, kbConfig]) => {
      const vectorStoreConfig = props.vectorStores?.[kbConfig.vectorStore];
      if (!vectorStoreConfig) {
        throw new Error(`Knowledge base ${kbName} references unknown vector store: ${kbConfig.vectorStore}`);
      }

      // Resolve Lambda function references in knowledge base data sources
      const resolvedKbConfig = this.resolveKnowledgeBaseLambdaReferences(kbConfig);

      const kbConstruct = new BedrockKnowledgeBaseL3Construct(this, `bedrock-kb-${kbName}`, {
        ...props,
        kbName,
        kbConfig: resolvedKbConfig,
        vectorStoreConfig,
        kmsKey,
        sharedVpcEndpoints,
        deferPolicyCreation: true, // Don't create per-KB policies
      });

      knowledgeBases[kbName] = kbConstruct.knowledgeBase;

      // Group by role ARN for consolidated policy creation
      const roleArn = kbConstruct.kbRole.roleArn;
      if (!kbsByRole.has(roleArn)) {
        kbsByRole.set(roleArn, []);
      }
      kbsByRole.get(roleArn)!.push(kbConstruct);
    });

    // Create consolidated policies per role group
    kbsByRole.forEach(kbsInGroup => {
      // Collect resources from all KBs in this group
      const resources = this.collectResourcesFromKBConstructs(kbsInGroup);

      // Create consolidated policies
      const role = kbsInGroup[0].kbRole;
      // Use role's construct node ID as stable identifier
      const roleId = role.node.id;
      const vectorStorePolicy = this.createConsolidatedVectorStorePolicy(roleId, resources, kmsKey);
      const foundationModelPolicy = this.createConsolidatedFoundationModelPolicy(roleId, kmsKey, resources);
      const dataSyncPolicy = this.createConsolidatedDataSyncPolicy(roleId, resources);

      // Attach policies to role
      role.addManagedPolicy(vectorStorePolicy);
      role.addManagedPolicy(foundationModelPolicy);
      role.addManagedPolicy(dataSyncPolicy);

      // Add CloudFormation dependencies (KB → vectorStore and foundationModel policies)
      // Note: dataSync policy depends on KB IDs, so we don't add reverse dependency
      kbsInGroup.forEach(kb => {
        kb.knowledgeBase.node.addDependency(vectorStorePolicy);
        kb.knowledgeBase.node.addDependency(foundationModelPolicy);
      });
    });

    // Create guardrails
    const guardrails: { [name: string]: bedrock.CfnGuardrail } = {};
    Object.entries(props.guardrails || {}).forEach(([guardrailName, guardrailConfig]) => {
      const guardrailConstruct = new BedrockGuardrailL3Construct(this, `bedrock-guardrail-${guardrailName}`, {
        ...props,
        guardrailName,
        guardrailConfig,
        kmsKey,
      });
      guardrails[guardrailName] = guardrailConstruct.guardrail;
    });

    // Only create agents and resolve roles if agents are defined
    if (props.agents && Object.keys(props.agents).length > 0) {
      // Create Bedrock Agent(s)
      Object.entries(props.agents).forEach(([agentName, agentConfig]) => {
        // Resolve Lambda function references in action groups
        const resolvedAgentConfig = this.resolveAgentLambdaReferences(agentConfig);

        new BedrockAgentL3Construct(this, `bedrock-agent-${agentName}`, {
          ...props,
          agentName,
          agentConfig: resolvedAgentConfig,
          kmsKey,
          knowledgeBases,
          guardrails,
        });
      });
    }

    // Create AgentCore gateways (+ their referenced targets). Runs after createLambdaFunctions so
    // gateway target/interceptor `generated-function:<name>` references resolve against the shared
    // pool. Gateways reuse the same module CMK as agents/KBs/guardrails.
    this.createGateways(props, kmsKey);

    // Add suppressions for internal CDK constructs
    this.addInternalConstructSuppressions();
  }

  // ---------------------------------------------
  // AgentCore Gateway Methods
  // ---------------------------------------------

  /**
   * Instantiates one {@link BedrockAgentcoreGatewayL3Construct} per entry in `props.gateways`. For
   * each gateway it injects the shared module CMK, resolves the flat `targets` name-references into
   * the inline {@link GatewayTargetsMap} the gateway L3 expects, and rewrites `generated-function:`
   * Lambda references (in targets and interceptors) to the ARNs built from `lambdaFunctions`.
   *
   * The gateway L3 is a pure key consumer (neither creates nor grants the CMK), so the builder owns
   * the key grants: each gateway role's encryption use is granted via an identity policy (see
   * {@link grantGatewayRoleKeyUsage}) and the vended-log-delivery service grant is added once by
   * {@link grantGatewaysKeyUsage}. No-op when no gateways are configured; target references are
   * validated up front.
   */
  private createGateways(props: BedrockBuilderL3ConstructProps, kmsKey: IKey): void {
    const gatewayEntries = Object.entries(props.gateways || {});
    if (gatewayEntries.length === 0) {
      return;
    }

    this.validateGatewayTargetReferences(props.gateways || {}, props.gatewayTargets || {});

    gatewayEntries.forEach(([gatewayName, gatewayConfig]) => {
      // Split the flat `targets` name-refs off the rest; the gateway L3 takes an inline targets map.
      const { targets: targetRefs, ...gatewayRest } = gatewayConfig;

      const resolvedTargets = this.resolveGatewayTargets(targetRefs, props.gatewayTargets || {});

      const resolvedInterceptors = this.resolveInterceptorLambdaReferences(gatewayRest.interceptors);

      const gatewayConstruct = new BedrockAgentcoreGatewayL3Construct(this, `bedrock-gateway-${gatewayName}`, {
        ...props,
        ...gatewayRest,
        interceptors: resolvedInterceptors,
        gatewayName,
        targets: resolvedTargets,
        kmsKey,
      });

      // Grant the gateway role encryption use of the shared CMK via an identity policy (see
      // grantGatewayRoleKeyUsage).
      const cmkUsagePolicy = this.grantGatewayRoleKeyUsage(kmsKey, gatewayConstruct.gatewayRole, gatewayName);

      // Depend on the gateway resource (not the construct — that cycles via the role). Keeps the CMK
      // grant present through both CreateGateway and DeleteGateway, which each call kms:GenerateDataKey.
      gatewayConstruct.gateway.node.addDependency(cmkUsagePolicy);
    });

    // Add the vended-log-delivery service grant once to the shared key (needs no gateway role).
    this.grantGatewaysKeyUsage(kmsKey);
  }

  /**
   * Adds the `delivery.logs.amazonaws.com` grant to the shared module CMK so vended log delivery can
   * write CMK-encrypted records into each gateway's audit-log destination. Added once regardless of
   * gateway count (it references no per-gateway resource).
   *
   * Based on AWS's documented `AllowKMSDecryptionLogging` example for an encrypted gateway (see
   * gateway-encryption.html). Two AND-ed conditions, both verified against the live service to be
   * present on the request and to permit delivery:
   * - `kms:EncryptionContext:SourceArn` — the request's log-source ARN, scoped to this account/region.
   *   This is the encryption-context key `delivery.logs.amazonaws.com` actually sends; conditioning on
   *   `aws:logs:arn` instead (the key used by the CloudWatch Logs at-rest principal
   *   `logs.<region>.amazonaws.com`) was verified to fail closed — the entry is absent, so KMS silently
   *   denied every delivery-encryption call and no records were delivered.
   * - `aws:SourceAccount` — this account caused the call (cross-service confused-deputy protection for
   *   the shared `delivery.logs.amazonaws.com` principal). Verified sent on the request, so requiring
   *   it does not block delivery.
   *
   * In a KMS key policy `resources: ['*']` means "this key", not a wildcard across keys. When the
   * module CMK is an imported key (`kmsKeyArn`), this call is a no-op — the customer must pre-grant
   * the key, as with the module's other service grants.
   */
  private grantGatewaysKeyUsage(kmsKey: IKey): void {
    const logSourceArnPattern = `arn:${this.partition}:logs:${this.region}:${this.account}:*`;
    kmsKey.addToResourcePolicy(
      new PolicyStatement({
        sid: 'AllowGatewayVendedLogDeliveryEncryption',
        effect: Effect.ALLOW,
        principals: [new ServicePrincipal('delivery.logs.amazonaws.com')],
        actions: ['kms:GenerateDataKey', 'kms:Decrypt'],
        resources: ['*'],
        conditions: {
          StringEquals: {
            'kms:EncryptionContext:SourceArn': logSourceArnPattern,
            'aws:SourceAccount': this.account,
          },
        },
      }),
    );
  }

  /**
   * Grants a gateway execution role encryption use of the shared module CMK via an identity policy
   * scoped to the key ARN, with NO condition on the data-key operations. Both tightenings AWS's
   * gateway-encryption docs show — `kms:ViaService = bedrock-agentcore.<region>.amazonaws.com` and the
   * `kms:EncryptionContext:aws:bedrock-agentcore-gateway:arn` encryption context — were deploy-tested
   * and BOTH fail closed here: at CreateGateway AgentCore assumes this role and calls KMS directly on
   * the target-encryption path (session `…/GenesisMCPTargetTargetEncryption`), where neither the
   * ViaService key nor that encryption context is present in the request, so any condition on
   * `kms:GenerateDataKey` denies with "no identity-based policy allows the kms:GenerateDataKey action".
   * (The documented conditions target the gateway-config path, not this target path.)
   *
   * Least privilege therefore rests on: the exact key-ARN scope (no wildcard), the role's trust policy
   * admitting only the AgentCore service principal scoped to this gateway's ARN, and the CreateGrant
   * constraints below (GrantConstraintType + GrantOperations, matching the AWS example).
   *
   * @returns the managed policy, so the caller can order the gateway resource after it (see
   *   {@link createGateways}).
   */
  private grantGatewayRoleKeyUsage(kmsKey: IKey, role: IRole, gatewayName: string): MdaaManagedPolicy {
    return new MdaaManagedPolicy(this, `bedrock-gateway-cmk-usage-${gatewayName}`, {
      managedPolicyName: `bedrock-agentcore-gateway-cmk-${gatewayName}`,
      naming: this.props.naming,
      roles: [role],
      statements: [
        new PolicyStatement({
          sid: 'GatewayCmkEncryptDecrypt',
          effect: Effect.ALLOW,
          actions: ['kms:DescribeKey', 'kms:Decrypt', 'kms:GenerateDataKey'],
          resources: [kmsKey.keyArn],
        }),
        new PolicyStatement({
          sid: 'GatewayCmkCreateGrant',
          effect: Effect.ALLOW,
          actions: ['kms:CreateGrant'],
          resources: [kmsKey.keyArn],
          conditions: {
            StringEquals: { 'kms:GrantConstraintType': 'EncryptionContextSubset' },
            'ForAllValues:StringEquals': { 'kms:GrantOperations': ['Decrypt', 'GenerateDataKey'] },
          },
        }),
      ],
    });
  }

  /**
   * Validates the gateway↔target references before any resource is built: every name in a gateway's
   * `targets` list must be a key in `gatewayTargets`, and each target may be referenced by at most
   * one gateway.
   *
   * @throws Error naming the offending gateway/target on a dangling or shared reference
   */
  private validateGatewayTargetReferences(gateways: NamedGatewayProps, gatewayTargets: NamedGatewayTargetProps): void {
    const targetToGateway = new Map<string, string>();
    Object.entries(gateways).forEach(([gatewayName, gatewayConfig]) => {
      (gatewayConfig.targets || []).forEach(targetRef => {
        if (!(targetRef in gatewayTargets)) {
          throw new Error(
            `Gateway "${gatewayName}" references gateway target "${targetRef}", which is not defined in gatewayTargets. ` +
              `Define it under gatewayTargets or correct the reference.`,
          );
        }
        const existingGateway = targetToGateway.get(targetRef);
        if (existingGateway !== undefined) {
          throw new Error(
            `Gateway target "${targetRef}" is referenced by more than one gateway ("${existingGateway}" and ` +
              `"${gatewayName}"). A gateway target may be referenced by at most one gateway; define separate targets.`,
          );
        }
        targetToGateway.set(targetRef, gatewayName);
      });
    });
  }

  /**
   * Resolves a gateway's flat list of target name-references into the inline {@link GatewayTargetsMap}
   * the gateway L3 expects, rewriting each Lambda target's `lambdaArn` from a `generated-function:`
   * reference to the concrete ARN. Plain ARNs and non-Lambda targets pass through unchanged; returns
   * undefined when the gateway references no targets.
   */
  private resolveGatewayTargets(
    targetRefs: string[] | undefined,
    gatewayTargets: NamedGatewayTargetProps,
  ): GatewayTargetsMap | undefined {
    if (!targetRefs || targetRefs.length === 0) {
      return undefined;
    }
    const resolved: { [targetName: string]: GatewayTargetProps } = {};
    targetRefs.forEach(targetRef => {
      // Existence is validated up front by validateGatewayTargetReferences.
      const targetConfig = gatewayTargets[targetRef];
      const lambda = targetConfig.targetConfiguration.lambda;
      if (!lambda) {
        resolved[targetRef] = targetConfig;
        return;
      }
      resolved[targetRef] = {
        ...targetConfig,
        targetConfiguration: {
          ...targetConfig.targetConfiguration,
          lambda: {
            ...lambda,
            lambdaArn: this.resolveGeneratedFunctionRef(lambda.lambdaArn, `gateway target "${targetRef}"`),
          },
        },
      };
    });
    return resolved;
  }

  /**
   * Rewrites `generated-function:` references in a gateway's interceptors to the concrete ARN of the
   * function built from `lambdaFunctions` ({@link GatewayInterceptorConfigurationsProperty} with
   * `lambdaArn` set). Inline `lambdaFunction` and plain `lambdaArn` interceptors pass through
   * unchanged; returns undefined when there are no interceptors.
   */
  private resolveInterceptorLambdaReferences(
    interceptors?: GatewayInterceptorConfigurationsProperty[],
  ): GatewayInterceptorConfigurationsProperty[] | undefined {
    if (!interceptors || interceptors.length === 0) {
      return interceptors;
    }
    return interceptors.map((interceptor, index) => {
      // Only a generated-function: lambdaArn needs rewriting; the gateway L3 validates the
      // exactly-one-source rule.
      if (interceptor.lambdaArn?.startsWith('generated-function:')) {
        return {
          ...interceptor,
          lambdaArn: this.resolveGeneratedFunctionRef(interceptor.lambdaArn, `gateway interceptor at index ${index}`),
        };
      }
      return interceptor;
    });
  }

  /**
   * Resolves a single Lambda reference: a `generated-function:<name>` value is rewritten to the ARN
   * of the matching function created from `lambdaFunctions` (throwing if the name is unknown); any
   * other value (a plain ARN) is returned unchanged. Single source of the `generated-function:`
   * resolution logic, shared by the gateway resolvers as well as
   * {@link resolveAgentLambdaReferences} and {@link resolveKnowledgeBaseLambdaReferences}.
   *
   * @param value - the configured Lambda reference (may be a generated-function ref or a plain ARN)
   * @param context - human-readable context for the error message (e.g. the target/interceptor name)
   */
  private resolveGeneratedFunctionRef(value: string, context: string): string {
    if (!value.startsWith('generated-function:')) {
      return value;
    }
    const functionName = value.split(':')[1]?.trim();
    const resolvedArn = functionName ? this.generatedFunctions[functionName] : undefined;
    if (!resolvedArn) {
      throw new Error(`${context} references non-existent Generated Lambda function: ${functionName}`);
    }
    return resolvedArn;
  }

  // ---------------------------------------------
  // Common Methods
  // ---------------------------------------------

  /**
   * Filters vector stores to only include OpenSearch Serverless stores that are used by knowledge bases.
   * @param vectorStores - All vector store configurations
   * @param knowledgeBases - The knowledge base configurations
   * @returns A map of only the used OpenSearch Serverless vector stores
   */
  private filterUsedOssVectorStores(
    vectorStores?: NamedVectorStoreProps,
    knowledgeBases?: NamedKnowledgeBaseProps,
  ): NamedOpensearchServerlessProps {
    if (!vectorStores || !knowledgeBases) {
      return {};
    }

    // Find which vector stores are actually used by knowledge bases
    const usedVectorStores = new Set(Object.values(knowledgeBases).map(kbConfig => kbConfig.vectorStore));

    // Filter to only used OpenSearch Serverless stores
    const ossStores: NamedOpensearchServerlessProps = {};
    for (const [storeName, storeConfig] of Object.entries(vectorStores)) {
      if (!usedVectorStores.has(storeName)) {
        continue;
      }
      const vectorStoreType = storeConfig.vectorStoreType || 'AURORA_SERVERLESS';
      if (vectorStoreType === 'OPENSEARCH_SERVERLESS') {
        ossStores[storeName] = storeConfig as OpensearchServerlessProps;
      }
    }
    return ossStores;
  }

  /**
   * Creates shared VPC endpoints for OpenSearch Serverless vector stores.
   * Validates and groups vector stores by VPC, then creates one VPC endpoint per unique VPC,
   * or uses existing VPC endpoint if provided in the configuration.
   * @param vectorStores - The vector store configurations
   * @param knowledgeBases - The knowledge base configurations
   * @returns A map of VPC IDs to VPC endpoint details (endpoint ID and security group ID)
   */
  private createSharedVpcEndpoints(
    vectorStores?: NamedVectorStoreProps,
    knowledgeBases?: NamedKnowledgeBaseProps,
  ): { [vpcId: string]: SharedVpcEndpointDetails } {
    const vpcEndpoints: { [vpcId: string]: SharedVpcEndpointDetails } = {};

    // Filter to only used OpenSearch Serverless stores
    const ossVectorStores = this.filterUsedOssVectorStores(vectorStores, knowledgeBases);
    // Validates subnet consistency and vpceId/securityGroupId consistency per VPC for safe endpoint creation
    const vpcEndpointConfigs = validateAndGroupVpcEndpoints(ossVectorStores);

    // Create or reference VPC endpoints based on validated configurations
    for (const [vpcId, config] of vpcEndpointConfigs) {
      if (config.existingVpce) {
        // Use existing VPC endpoint
        vpcEndpoints[vpcId] = {
          vpcEndpointId: config.existingVpce.vpceId,
          securityGroupId: config.existingVpce.securityGroupId,
        };
      } else {
        // Create new VPC endpoint for this VPC
        const vpc = Vpc.fromVpcAttributes(this, `vpc-import-${vpcId}`, {
          vpcId,
          availabilityZones: ['a'],
          publicSubnetIds: ['a'],
        });

        // Create security group for the VPC endpoint
        const vpcEndpointSg = new MdaaSecurityGroup(this, `vpce-sg-${vpcId}`, {
          naming: this.props.naming,
          securityGroupName: `bedrock-kb-vpce-${vpcId}`,
          vpc,
          allowAllOutbound: true,
          addSelfReferenceRule: true,
          useParentSSMScope: true,
        });

        // Create VPC endpoint
        const vpcEndpoint = new aoss.CfnVpcEndpoint(this, `opensearch-serverless-vpc-endpoint-${vpcId}`, {
          name: this.props.naming
            .withResourceType(MdaaResourceType.OPENSEARCH_SERVERLESS)
            .resourceName(`bedrock-kb-vpce-${vpcId}`, 32),
          vpcId: vpcId,
          subnetIds: config.subnetIds,
          securityGroupIds: [vpcEndpointSg.securityGroupId],
        });

        vpcEndpoints[vpcId] = {
          vpcEndpointId: vpcEndpoint.attrId,
          securityGroupId: vpcEndpointSg.securityGroupId,
          // Pass the VPC endpoint resource for dependency management
          // This ensures the custom resource Lambda waits for the VPC endpoint to be fully operational
          vpcEndpointResource: vpcEndpoint,
        };

        new MdaaParamAndOutput(this, {
          ...this.props,
          resourceType: 'opensearch-serverless-vpc-endpoint',
          resourceId: vpcId,
          name: 'id',
          value: vpcEndpoint.attrId,
        });
      }
    }

    return vpcEndpoints;
  }

  /**
   * Creates Lambda functions and layers for use by Bedrock agents and knowledge bases.
   * This method creates Lambda functions and layers based on the provided configuration,
   * then builds a mapping of function names to their ARNs for later reference resolution.
   * @param props - The construct properties containing Lambda function configurations
   * @param kmsKey - The KMS key to use for encrypting Lambda function environment variables
   * @returns A mapping of function names to their ARNs for reference resolution   * // Returns: { 'my-function': 'arn:aws:lambda:region:account:function:my-function' }
   */
  private createLambdaFunctions(props: BedrockBuilderL3ConstructProps, kmsKey: IKey): { [name: string]: string } {
    // Create necessary Lambda Functions
    const generatedFunctions: { [name: string]: string } = {};

    if (props.lambdaFunctions) {
      const agentLambdas = new LambdaFunctionL3Construct(this, 'bedrock-builder-lambda-functions', {
        kmsArn: kmsKey.keyArn,
        roleHelper: props.roleHelper,
        naming: props.naming,
        functions: props.lambdaFunctions?.functions,
        layers: props.lambdaFunctions?.layers,
        overrideScope: true,
      });

      // Create a map of function-name to function-arn for easy lookup
      Object.entries(agentLambdas.functionsMap).forEach(([name, lambda]) => {
        generatedFunctions[name] = lambda.functionArn;
      });
    }

    return generatedFunctions;
  }

  /**
   * Gets an existing KMS key or creates a new one for Bedrock resources.
   */
  private getOrCreateKmsKey(props: BedrockBuilderL3ConstructProps, dataAdminRoleIds: string[]): IKey {
    const kmsKey = props.kmsKeyArn
      ? kms.Key.fromKeyArn(this, `ImportedKmsKey`, props.kmsKeyArn)
      : new MdaaKmsKey(this.scope, 'bedrock-cmk', {
          naming: this.props.naming,
          keyAdminRoleIds: dataAdminRoleIds,
        });

    //Allow CloudWatch logs to us the key to encrypt/decrypt log data
    const cloudwatchStatement = new PolicyStatement({
      sid: 'CloudWatchLogsEncryption',
      effect: Effect.ALLOW,
      actions: [...DECRYPT_ACTIONS, ...ENCRYPT_ACTIONS],
      principals: [new ServicePrincipal(`logs.${this.region}.amazonaws.com`)],
      resources: ['*'],
      //Limit access to use this key only for log groups within this account
      conditions: {
        ArnEquals: {
          'kms:EncryptionContext:aws:logs:arn': `arn:${this.partition}:logs:${this.region}:${this.account}:log-group:*`,
        },
      },
    });
    kmsKey.addToResourcePolicy(cloudwatchStatement);

    // References:
    // https://docs.aws.amazon.com/bedrock/latest/userguide/encryption-bda.html#encryption-bda-key-policies.title
    // https://docs.aws.amazon.com/bedrock/latest/userguide/cmk-agent-resources.html#attach-policy-agent
    // https://docs.aws.amazon.com/bedrock/latest/userguide/encryption-kb.html

    // Allow Bedrock service to encrypt/decrypt agent resources
    const bedrockAgentServiceStatement = new PolicyStatement({
      sid: 'AllowBedrockServiceForAgents',
      effect: Effect.ALLOW,
      actions: ['kms:GenerateDataKey*', 'kms:Decrypt', 'kms:DescribeKey'],
      principals: [new ServicePrincipal('bedrock.amazonaws.com')],
      resources: ['*'],
    });
    kmsKey.addToResourcePolicy(bedrockAgentServiceStatement);

    // Allow Bedrock service to create/list/revoke grants
    const bedrockGrantStatement = new PolicyStatement({
      sid: 'AllowBedrockServiceToManageGrants',
      effect: Effect.ALLOW,
      actions: ['kms:CreateGrant', 'kms:ListGrants', 'kms:RevokeGrant'],
      principals: [new ServicePrincipal('bedrock.amazonaws.com')],
      resources: ['*'],
      conditions: {
        Bool: {
          'kms:GrantIsForAWSResource': 'true',
        },
        StringEquals: {
          'aws:SourceAccount': this.account,
          'kms:ViaService': `bedrock.${this.region}.amazonaws.com`,
        },
      },
    });
    kmsKey.addToResourcePolicy(bedrockGrantStatement);

    // Collect execution roles
    const executionRoleArnsSet = new Set<string>();

    if (props.agents) {
      for (const [agentName, agentConfig] of Object.entries(props.agents)) {
        if (agentConfig.role) {
          const roleResolved = props.roleHelper.resolveRoleRefWithRefId(
            agentConfig.role,
            `agent-execution-role-${agentName}`,
          );
          executionRoleArnsSet.add(roleResolved.arn());
        }
      }
    }

    if (props.knowledgeBases) {
      for (const [kbName, kbConfig] of Object.entries(props.knowledgeBases)) {
        if (kbConfig.role) {
          const roleResolved = props.roleHelper.resolveRoleRefWithRefId(kbConfig.role, `kb-execution-role-${kbName}`);
          executionRoleArnsSet.add(roleResolved.arn());
        }
      }
    }

    if (executionRoleArnsSet.size > 0) {
      const executionRolePrincipals = Array.from(executionRoleArnsSet).map(arn => new ArnPrincipal(arn));

      // Consolidated statement for execution roles with encryption contexts
      const executionRoleStatement = new PolicyStatement({
        sid: 'AllowExecutionRolesToUseKeyWithContext',
        effect: Effect.ALLOW,
        actions: ['kms:GenerateDataKey*', 'kms:Decrypt', 'kms:DescribeKey'],
        principals: executionRolePrincipals,
        resources: ['*'],
        conditions: {
          StringLike: {
            'kms:ViaService': `bedrock.${this.region}.amazonaws.com`,
          },
        },
      });
      kmsKey.addToResourcePolicy(executionRoleStatement);

      // Grant creation permissions
      const grantStatement = new PolicyStatement({
        sid: 'AllowCreateGrantForBedrockResources',
        effect: Effect.ALLOW,
        actions: ['kms:CreateGrant', 'kms:DescribeKey'],
        principals: executionRolePrincipals,
        resources: ['*'],
        conditions: {
          StringLike: {
            'kms:ViaService': `bedrock.${this.region}.amazonaws.com`,
          },
          StringEquals: {
            'kms:GrantOperations': ['Decrypt', 'GenerateDataKey*', 'DescribeKey'],
            'aws:SourceAccount': this.account,
          },
        },
      });
      kmsKey.addToResourcePolicy(grantStatement);
    }

    return kmsKey;
  }

  /**
   * Resolves Lambda function references in agent action groups.
   * This method processes agent configuration and replaces any Lambda function references
   * that use the 'generated-function:' prefix with the actual ARN of the generated function
   * (via {@link resolveGeneratedFunctionRef}).
   */
  private resolveAgentLambdaReferences(agentConfig: BedrockAgentProps): BedrockAgentProps {
    if (!agentConfig.actionGroups) {
      return agentConfig;
    }

    const resolvedActionGroups = agentConfig.actionGroups.map(actionGroup => {
      const lambdaRef = actionGroup.actionGroupExecutor?.lambda;
      if (!lambdaRef) {
        return actionGroup;
      }

      const resolvedLambda = this.resolveGeneratedFunctionRef(
        lambdaRef,
        `agent action group "${actionGroup.actionGroupName}"`,
      );
      if (resolvedLambda === lambdaRef) {
        return actionGroup;
      }

      return {
        ...actionGroup,
        actionGroupExecutor: {
          ...actionGroup.actionGroupExecutor,
          lambda: resolvedLambda,
        },
      };
    });

    return {
      ...agentConfig,
      actionGroups: resolvedActionGroups,
    };
  }

  /**
   * Resolves Lambda function references in knowledge base data source configurations.
   * This method processes knowledge base configuration and replaces any Lambda function references
   * in custom transformation configurations that use the 'generated-function:' prefix with the
   * actual ARN of the generated function (via {@link resolveGeneratedFunctionRef}).
   */
  private resolveKnowledgeBaseLambdaReferences(kbConfig: BedrockKnowledgeBaseProps): BedrockKnowledgeBaseProps {
    if (!kbConfig.s3DataSources) {
      return kbConfig;
    }

    const resolvedDataSources = Object.fromEntries(
      Object.entries(kbConfig.s3DataSources).map(([dsName, dsConfig]) => {
        if (!dsConfig.vectorIngestionConfiguration?.customTransformationConfiguration) {
          return [dsName, dsConfig];
        }

        const transformConfig = dsConfig.vectorIngestionConfiguration.customTransformationConfiguration;
        const resolvedLambdaArns = transformConfig.transformLambdaArns.map(lambdaArn =>
          this.resolveGeneratedFunctionRef(lambdaArn, `knowledge base data source "${dsName}"`),
        );

        return [
          dsName,
          {
            ...dsConfig,
            vectorIngestionConfiguration: {
              ...dsConfig.vectorIngestionConfiguration,
              customTransformationConfiguration: {
                ...transformConfig,
                transformLambdaArns: resolvedLambdaArns,
              },
            },
          },
        ];
      }),
    );

    return {
      ...kbConfig,
      s3DataSources: resolvedDataSources,
    };
  }

  // ---------------------------------------------
  // Knowledge Base Grouping and Policy Consolidation Methods
  // ---------------------------------------------

  /**
   * Collects resource information from KB constructs for consolidated policy creation.
   * Gathers vector stores, named KB configs, and KB IDs.
   */
  private collectResourcesFromKBConstructs(kbs: BedrockKnowledgeBaseL3Construct[]): ConsolidatedResources {
    const vectorStores: (MdaaAuroraPgVector | MdaaOpensearchServerlessCollection)[] = [];
    const namedKbConfigs: NamedKbConfig[] = [];
    const kbIds: string[] = [];

    kbs.forEach(kb => {
      // Collect vector store from KB's vectorStore property
      vectorStores.push(kb.vectorStore);

      // Collect named KB config for foundation model policy creation
      namedKbConfigs.push({ kbName: kb.props.kbName, kbConfig: kb.props.kbConfig });

      // Collect KB ID
      kbIds.push(kb.knowledgeBase.attrKnowledgeBaseId);
    });

    return {
      vectorStores,
      namedKbConfigs,
      kbIds,
    };
  }

  /**
   * Creates a consolidated vector store access policy for all KBs in the group.
   * Handles both Aurora PostgreSQL and OpenSearch Serverless vector stores.
   */
  private createConsolidatedVectorStorePolicy(
    roleId: string,
    resources: ConsolidatedResources,
    kmsKey: IKey,
  ): MdaaManagedPolicy {
    return BedrockKnowledgeBaseL3Construct.createVectorStorePolicy(
      this,
      this.props.naming,
      roleId,
      resources.vectorStores,
      kmsKey,
    );
  }

  /**
   * Creates a consolidated foundation model policy for all KBs in the group.
   * Includes bedrock:InvokeModel permissions for all embedding and parsing models.
   */
  private createConsolidatedFoundationModelPolicy(
    roleId: string,
    kmsKey: IKey,
    resources: ConsolidatedResources,
  ): MdaaManagedPolicy {
    return BedrockKnowledgeBaseL3Construct.createFoundationModelPolicy(
      this,
      this.props.naming,
      roleId,
      resources.namedKbConfigs,
      kmsKey,
    );
  }

  /**
   * Creates a consolidated data sync policy for all KBs in the group.
   * Uses specific KB IDs (no wildcards at KB level) for ingestion permissions.
   */
  private createConsolidatedDataSyncPolicy(roleId: string, resources: ConsolidatedResources): MdaaManagedPolicy {
    return BedrockKnowledgeBaseL3Construct.createDataSyncPolicy(this, this.props.naming, roleId, resources.kbIds);
  }

  private addInternalConstructSuppressions(): void {
    // Add suppressions for internal CDK constructs like BucketNotificationsHandler.
    // 'Notifications' matches CDK's S3 BucketNotifications construct (the only CDK construct using this ID).
    // Search both stack-level children and all nested constructs within this tree.
    const allConstructs = [...Stack.of(this).node.children, ...this.node.findAll()];
    allConstructs.forEach(child => {
      if (
        child.node.id.includes('Custom::CDKBucketDeployment') ||
        child.node.id.includes('BucketNotificationsHandler') ||
        child.node.id.includes('Notifications') ||
        child.node.id.includes('DatabaseSetupFunction') ||
        child.node.id.includes('LogRetention')
      ) {
        MdaaNagSuppressions.addCodeResourceSuppressions(
          child,
          [
            { id: 'AwsSolutions-L1', reason: 'Function is used only as custom resource during CDK deployment.' },
            {
              id: 'NIST.800.53.R5-LambdaConcurrency',
              reason: 'Function is used only as custom resource during CDK deployment.',
            },
            {
              id: 'NIST.800.53.R5-LambdaInsideVPC',
              reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.',
            },
            {
              id: 'NIST.800.53.R5-LambdaDLQ',
              reason:
                'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.',
            },
            {
              id: 'HIPAA.Security-LambdaConcurrency',
              reason: 'Function is used only as custom resource during CDK deployment.',
            },
            {
              id: 'PCI.DSS.321-LambdaConcurrency',
              reason: 'Function is used only as custom resource during CDK deployment.',
            },
            {
              id: 'HIPAA.Security-LambdaInsideVPC',
              reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.',
            },
            {
              id: 'PCI.DSS.321-LambdaInsideVPC',
              reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.',
            },
            {
              id: 'HIPAA.Security-LambdaDLQ',
              reason:
                'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.',
            },
            {
              id: 'PCI.DSS.321-LambdaDLQ',
              reason:
                'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.',
            },
            { id: 'AwsSolutions-IAM4', reason: 'Function is used only as custom resource during CDK deployment.' },
            { id: 'AwsSolutions-IAM5', reason: 'Function is used only as custom resource during CDK deployment.' },
            {
              id: 'HIPAA.Security-IAMNoInlinePolicy',
              reason: 'Policy managed by CDK and only used during deployment.',
            },
            { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Policy managed by CDK and only used during deployment.' },
            {
              id: 'NIST.800.53.R5-IAMNoInlinePolicy',
              reason: 'Policy managed by CDK and only used during deployment.',
            },
          ],
          true,
        );
      }
    });
  }
}

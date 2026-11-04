/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { join } from 'node:path';

import {
  FunctionProps,
  LambdaFunctionL3Construct,
  LayerProps,
  VpcConfigProps,
} from '@aws-mdaa/dataops-lambda-l3-construct';

import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { MdaaNagSuppressions, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';
import { MdaaManagedPolicy } from '@aws-mdaa/iam-constructs';
import { MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import { MdaaAuroraPgVector } from '@aws-mdaa/rds-constructs';
import { MdaaOpensearchServerlessCollection } from '@aws-mdaa/opensearch-constructs';

import { aws_bedrock as bedrock, aws_kms as kms, aws_opensearchserverless as aoss, Stack } from 'aws-cdk-lib';

import { Effect, PolicyStatement, ServicePrincipal, ArnPrincipal, IRole } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { ILogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';

import { Construct } from 'constructs';
import { MdaaSecurityGroup } from '@aws-mdaa/ec2-constructs';
import {
  BedrockKnowledgeBaseL3Construct,
  BedrockKnowledgeBaseProps,
  NamedKbConfig,
  NamedKnowledgeBaseProps,
  NamedVectorStoreProps,
  OpensearchServerlessProps,
  SharedVpcEndpointDetails,
  VectorIngestionConfiguration,
} from '@aws-mdaa/bedrock-knowledge-base-l3-construct';
import {
  BedrockGuardrailL3Construct,
  GuardrailAlarmsProps,
  NamedGuardrailProps,
} from '@aws-mdaa/bedrock-guardrail-l3-construct';
import {
  BedrockAgentcoreGatewayL3Construct,
  GatewayConfigProps,
  GatewayInterceptorConfigurationsProperty,
  GatewayTargetProps,
  GatewayTargetsMap,
} from '@aws-mdaa/bedrock-agentcore-gateway-l3-construct';
import {
  BedrockAgentcoreHarnessL3Construct,
  HarnessConfigProps,
  ResolvedGatewayArnMap,
  ResolvedGuardrailRefMap,
  ResolvedVpcEndpointAccess,
  VpcEndpointClientAccess,
} from '@aws-mdaa/bedrock-agentcore-harness-l3-construct';
import { VpcEndpointL3Construct } from '@aws-mdaa/vpc-endpoint-l3-construct';
import { NamedOpensearchServerlessProps, validateAndGroupVpcEndpoints } from './vpc-endpoint-validator';
import {
  harnessVpcEndpointConsumers,
  knowledgeBaseConnectorVpcEndpointConsumer,
  NamedVpcEndpointSetProps,
  reconcileVpcEndpointSets,
  VpcEndpointSetConsumer,
  vpcEndpointAccessForHarness,
  vpcEndpointAccessForKnowledgeBaseConnector,
} from './supporting-vpc-endpoints';
import {
  BuilderGatewayTargetProps,
  buildKnowledgeBaseConnectorEnvironment,
  buildKnowledgeBaseToolSchema,
  GatewayKnowledgeBaseNetworkProperty,
  GatewayTargetKnowledgeBaseProperty,
  KNOWLEDGE_BASE_CONFIG_REF_PREFIX,
  validateKnowledgeBaseTarget,
} from './gateway-knowledge-base';
import { resolveGuardrailAlarmSettings } from './guardrail-alarm-settings';

// The connector bounds each Retrieve call, retries included, to 27 seconds (see kb_retrieve.py).
const KNOWLEDGE_BASE_CONNECTOR_TIMEOUT_SECONDS = 30;
// Lambda allocates CPU in proportion to memory; at the 128 MB default, the cold-start boto3 import and
// serializing up to 100 results are slow.
const KNOWLEDGE_BASE_CONNECTOR_MEMORY_MB = 256;
// What Lambda needs on the execution role to manage a VPC-bound function's network interfaces, allowed
// on all resources as Lambda requires.
// https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html#configuration-vpc-permissions
const LAMBDA_VPC_ACCESS_ACTIONS = [
  'ec2:CreateNetworkInterface',
  'ec2:DescribeNetworkInterfaces',
  'ec2:DescribeSubnets',
  'ec2:DeleteNetworkInterface',
  'ec2:AssignPrivateIpAddresses',
  'ec2:UnassignPrivateIpAddresses',
];

/**
 * Lambda function and layer configuration for the module's shared Lambda pool.
 * Defines Lambda functions and shared layers for gateway tools, gateway interceptors, and knowledge base
 * custom transformations.
 *
 * Use cases: Gateway tool logic, custom document transformation, shared code libraries, external API integration
 *
 * AWS: Lambda functions and layers
 *
 * Validation: At least one of layers or functions should be provided
 */
export interface LambdaFunctionProps {
  /**
   * Lambda layer definitions for shared code and dependencies used by the module's functions.
   *
   * Use cases: Shared code libraries, runtime dependencies, common utilities
   *
   * AWS: Lambda layers
   *
   * Validation: Optional; LayerProps[]
   **/
  readonly layers?: LayerProps[];
  /**
   * Lambda function definitions, referenced from gateway targets, gateway interceptors, and knowledge
   * base custom transformations via the 'generated-function:<name>' prefix.
   *
   * Use cases: Custom business logic, external API integration, gateway tool implementation
   *
   * AWS: Lambda functions
   *
   * Validation: Optional; FunctionProps[]
   **/
  readonly functions?: FunctionProps[];
}

// Re-export the Named types for backward compatibility
export { NamedKnowledgeBaseProps, NamedVectorStoreProps, NamedGuardrailProps };

// Re-export the guardrail alarm config surface so the app config can import it from the builder package.
export {
  GuardrailAlarmsProps,
  GuardrailAlarmsCommonProps,
  GuardrailAlarmsCreatedTopicProps,
  GuardrailAlarmsExistingTopicProps,
  GuardrailInterventionAlarmProps,
} from '@aws-mdaa/bedrock-guardrail-l3-construct';

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
 * knowledge bases/Lambdas it fronts
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
 * Map of target name to {@link BuilderGatewayTargetProps}, referenced by name from a gateway's
 * `targets` list. The key becomes the target's MDAA-named resource name; each target may be referenced
 * by at most one gateway, and a target no gateway references is not deployed.
 */
export interface NamedGatewayTargetProps {
  /** @jsii ignore */
  [targetName: string]: BuilderGatewayTargetProps;
}

/** What gateway target resolution needs besides the target references themselves. */
interface GatewayTargetResolutionContext {
  readonly gatewayTargets: NamedGatewayTargetProps;
  readonly knowledgeBases: { [kbName: string]: bedrock.CfnKnowledgeBase };
  readonly kmsKey: IKey;
  readonly endpointsBySet: Map<string, ResolvedVpcEndpointAccess>;
}

/** What gateway and harness creation need besides the module props and the CMK. */
interface AgentcoreResourceContext {
  readonly knowledgeBases: { [kbName: string]: bedrock.CfnKnowledgeBase };
  readonly guardrails: { [name: string]: bedrock.CfnGuardrail };
  readonly endpointsBySet: Map<string, ResolvedVpcEndpointAccess>;
}

/** A knowledge base a connector queries, as its id and the ARN its Retrieve grant is scoped to. */
interface ResolvedKnowledgeBaseRef {
  readonly knowledgeBaseId: string;
  readonly knowledgeBaseArn: string;
}

// Re-export the Harness config surface so the app config can import it from the builder package
// rather than reaching into the harness L3 directly.
export { HarnessConfigProps };

/**
 * Map of harness name to {@link HarnessConfigProps}. The key becomes the child construct id suffix
 * (`bedrock-harness-<name>`) and the derived, MDAA-named harness name.
 */
export interface NamedHarnessProps {
  /** @jsii ignore */
  [harnessName: string]: HarnessConfigProps;
}

export interface BedrockBuilderL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Admin roles granted key-admin access to the KMS key the module creates. Unused when `kmsKeyArn`
   * supplies an existing key.
   *
   * Use cases: Administrative access, resource management, security control
   *
   * AWS: IAM roles for Bedrock resource administration
   *
   * Validation: Required; MdaaRoleRef[]
   **/
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Existing KMS key ARN for encrypting all Bedrock resources in this module — knowledge bases,
   * guardrails, the shared Lambda pool, and AgentCore gateways and harnesses all use this single key.
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
   * Lambda functions and layers for gateway tools, gateway interceptors, and knowledge base custom
   * transformations. Enables custom business logic and external API integrations.
   *
   * Use cases: Gateway tool logic, external integrations, function deployment
   *
   * AWS: Lambda functions/layers
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
   * Notification target and timing for the guardrail intervention alarms. Each guardrail
   * opts in with its own `interventionAlarm` thresholds; every alarm in the module
   * notifies the one target set here.
   *
   * Use cases: routing guardrail intervention alarms to a security team, self-contained
   * alerting with a module-created topic
   *
   * AWS: CloudWatch Metrics Insights alarms + SNS notification
   *
   * Validation: Optional; GuardrailAlarmsProps; required when any guardrail sets interventionAlarm
   **/
  readonly guardrailAlarms?: GuardrailAlarmsProps;
  /**
   * Bedrock AgentCore Gateway configurations (MCP servers), keyed by gateway name. Each gateway
   * references its tool targets by name from the sibling `gatewayTargets` map.
   *
   * Use cases: exposing a unified MCP tool surface with per-tool authorization from the same module
   * that owns the Lambdas it fronts
   *
   * AWS: Amazon Bedrock AgentCore Gateway
   *
   * Validation: Optional; NamedGatewayProps (map of gateway name to config)
   **/
  readonly gateways?: NamedGatewayProps;
  /**
   * Bedrock AgentCore Gateway target definitions (MCP tool sources), keyed by target name. A gateway
   * attaches a target by naming its key in the gateway's `targets` list; each target may be
   * referenced by at most one gateway, and a target no gateway references is not deployed. A
   * `knowledgeBase` target generates a Lambda connector that exposes a knowledge base as a `Retrieve`
   * tool.
   *
   * Use cases: defining MCP tool sources (Lambda tools, knowledge bases) once and referencing them from a gateway
   *
   * AWS: AWS::BedrockAgentCore::GatewayTarget
   *
   * Validation: Optional; NamedGatewayTargetProps (map of target name to config)
   **/
  readonly gatewayTargets?: NamedGatewayTargetProps;
  /**
   * Bedrock AgentCore Harness configurations - a declarative agent loop (model + system prompt +
   * tools) - keyed by harness name. A harness's `guardrail.id` and
   * `tools[].agentCoreGateway.gatewayArn` may use a `config:<name>` reference into the sibling
   * `guardrails` / `gateways` maps, resolved to the live resource.
   *
   * Use cases: declarative tool-using/RAG agents
   *
   * AWS: AWS::BedrockAgentCore::Harness
   *
   * Validation: Optional; NamedHarnessProps (map of harness name to config)
   **/
  readonly harnesses?: NamedHarnessProps;
  /**
   * VPC endpoint sets, keyed by set name, giving harness sessions and knowledge base connectors a
   * private outbound path (no NAT/internet). A harness references one by name from its
   * `networkConfiguration.vpcEndpoints`, and a `knowledgeBase` gateway target from its
   * `networkConfiguration.vpcEndpoints`; every consumer referencing a set shares its endpoints.
   *
   * Which endpoints exist is derived from the referencing consumers, so a set only states which VPC it
   * serves, where created endpoints go, and how each derived endpoint is reached - created here, an
   * existing one to wire to, or reached without an endpoint the set manages. Endpoint policies are
   * derived and not configurable.
   *
   * Use cases: private (no-NAT) harness sessions and knowledge base connectors, reusing centrally
   * provisioned endpoints
   *
   * AWS: AWS::EC2::VPCEndpoint (Interface and Gateway)
   *
   * Validation: Optional; NamedVpcEndpointSetProps; each set must name a distinct VPC and be referenced
   * by at least one harness or knowledge base connector
   **/
  readonly vpcEndpoints?: NamedVpcEndpointSetProps;
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
    const kmsKey = this.getOrCreateKmsKey(props, dataAdminRoles);

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

    // Create guardrails, with the intervention alarms of those that opt in
    const guardrailAlarmSettings = resolveGuardrailAlarmSettings(this, { ...props, kmsKey });
    const guardrails: { [name: string]: bedrock.CfnGuardrail } = {};
    Object.entries(props.guardrails || {}).forEach(([guardrailName, guardrailConfig]) => {
      const guardrailConstruct = new BedrockGuardrailL3Construct(this, `bedrock-guardrail-${guardrailName}`, {
        ...props,
        guardrailName,
        guardrailConfig,
        kmsKey,
        alarmSettings: guardrailConfig.interventionAlarm ? guardrailAlarmSettings : undefined,
      });
      guardrails[guardrailName] = guardrailConstruct.guardrail;
    });

    // Create the VPC endpoint sets, before their consumers: the harnesses and the knowledge base
    // connectors wire themselves to the endpoints. Reconciled even with no consumers at all, because
    // reconciliation is what rejects a set nothing references. Runs after the knowledge bases, whose
    // ARNs scope the Bedrock Agent Runtime endpoint policy.
    const endpointsBySet = this.createVpcEndpointSets(props, knowledgeBases);
    const agentcoreContext: AgentcoreResourceContext = { knowledgeBases, guardrails, endpointsBySet };

    // Create AgentCore gateways (+ their referenced targets). Runs after createLambdaFunctions so
    // gateway target/interceptor `generated-function:<name>` references resolve against the shared
    // pool, and after the knowledge bases so `knowledgeBase` targets resolve `config:<name>` against
    // them. Gateways reuse the same module CMK as KBs/guardrails.
    const gatewayArns = this.createGateways(props, kmsKey, agentcoreContext);

    // Create AgentCore Harnesses. Runs after gateways/guardrails so `config:<name>` references in a
    // harness's `tools[].agentCoreGateway.gatewayArn` / `guardrail.id` resolve against their live
    // in-stack ARNs/ids.
    this.createHarnesses(props, kmsKey, { ...agentcoreContext, gatewayArns });

    // Add suppressions for internal CDK constructs
    this.addInternalConstructSuppressions();
  }

  // ---------------------------------------------
  // AgentCore Harness Methods
  // ---------------------------------------------

  /**
   * Instantiates one {@link BedrockAgentcoreHarnessL3Construct} per entry in `props.harnesses`,
   * injecting the shared module CMK (the harness is a pure key consumer for its log-group
   * encryption) and passing through the resolved gateway ARN map (for
   * `tools[].agentCoreGateway.gatewayArn: config:<name>` references) and the module's guardrails
   * (for `guardrail.id: config:<name>` references), and wiring each harness to the endpoints of the
   * set it references.
   *
   * The shared CMK already grants CloudWatch Logs service use on its key policy (see
   * {@link getOrCreateKmsKey}), which is all the harness's log-protection custom resource needs.
   */
  private createHarnesses(
    props: BedrockBuilderL3ConstructProps,
    kmsKey: IKey,
    context: AgentcoreResourceContext & { readonly gatewayArns: ResolvedGatewayArnMap },
  ): void {
    const harnessEntries = Object.entries(props.harnesses || {});
    if (harnessEntries.length === 0) {
      return;
    }
    const { gatewayArns, endpointsBySet } = context;
    const resolvedGuardrails = this.resolveHarnessGuardrailRefs(context.guardrails);

    harnessEntries.forEach(([harnessName, harnessConfig]) => {
      new BedrockAgentcoreHarnessL3Construct(this, `bedrock-harness-${harnessName}`, {
        ...props,
        ...harnessConfig,
        harnessName,
        kmsKey,
        guardrails: resolvedGuardrails,
        gateways: gatewayArns,
        vpcEndpointAccess: vpcEndpointAccessForHarness(harnessConfig, endpointsBySet, {
          partition: this.partition,
          region: this.region,
        }),
      });
    });
  }

  /**
   * Creates the endpoints of each declared VPC endpoint set, and returns each set's endpoint security
   * groups for the consumers referencing it - harnesses and knowledge base connectors - to wire
   * themselves to.
   *
   * The module owns the endpoints rather than each consumer, because an interface endpoint with Private
   * DNS is a per-service singleton in its VPC: consumers each creating their own collide as soon as two
   * share a VPC, and the workaround - hand-listing which consumer owns which endpoint - put the conflict
   * in the customer's config. Reconciling one set per VPC against the consumers' derived requirements
   * makes the duplicate unrepresentable, and leaves the endpoints as ordinary members of this stack, so
   * removing the last consumer that referenced a set removes its endpoints too.
   *
   * @returns the VPC and per-service endpoint security groups of each set, keyed by set name
   */
  private createVpcEndpointSets(
    props: BedrockBuilderL3ConstructProps,
    knowledgeBases: { [kbName: string]: bedrock.CfnKnowledgeBase },
  ): Map<string, ResolvedVpcEndpointAccess> {
    const consumers = [
      ...harnessVpcEndpointConsumers(props.harnesses ?? {}, { partition: this.partition, region: this.region }),
      ...this.knowledgeBaseConnectorVpcEndpointConsumers(props, knowledgeBases),
    ];
    const reconciled = reconcileVpcEndpointSets(props.vpcEndpoints ?? {}, consumers);
    return new Map(
      reconciled.map(set => {
        // A set whose every endpoint is brought or external creates nothing, so the endpoint construct -
        // which rejects an empty configuration - is skipped rather than handed nothing to build.
        const created =
          set.interfaces.length + set.gateways.length > 0
            ? new VpcEndpointL3Construct(this, `vpc-endpoints-${set.setName}`, {
                ...props,
                vpcId: set.vpcId,
                nameScope: set.setName,
                interfaces: set.interfaces,
                gateways: set.gateways,
              }).interfaceEndpointSecurityGroupIds
            : {};
        return [set.setName, { vpcId: set.vpcId, securityGroupIds: { ...created, ...set.broughtSecurityGroupIds } }];
      }),
    );
  }

  /**
   * The VPC endpoint set consumers the knowledge base connectors are: one per VPC-bound `knowledgeBase`
   * target a gateway registers. A target no gateway registers generates no connector, so it places no
   * demand on its set.
   */
  private knowledgeBaseConnectorVpcEndpointConsumers(
    props: BedrockBuilderL3ConstructProps,
    knowledgeBases: { [kbName: string]: bedrock.CfnKnowledgeBase },
  ): VpcEndpointSetConsumer[] {
    const registeredTargets = new Set(Object.values(props.gateways ?? {}).flatMap(gateway => gateway.targets ?? []));
    return [...registeredTargets].flatMap(targetName => {
      // An unknown target name is rejected when the gateways are created.
      const targetConfig = props.gatewayTargets?.[targetName];
      if (!targetConfig?.targetConfiguration?.knowledgeBase?.networkConfiguration) {
        return [];
      }
      const knowledgeBase = validateKnowledgeBaseTarget(targetName, targetConfig);
      const { knowledgeBaseArn } = this.resolveKnowledgeBaseRef(targetName, knowledgeBase.id, knowledgeBases);
      return [
        knowledgeBaseConnectorVpcEndpointConsumer({
          targetName,
          setName: (knowledgeBase.networkConfiguration as GatewayKnowledgeBaseNetworkProperty).vpcEndpoints,
          knowledgeBaseArn,
        }),
      ];
    });
  }

  /**
   * Builds the harness-facing {@link ResolvedGuardrailRefMap} from the module's guardrail
   * constructs, so a harness's `guardrail.id: config:<name>` reference resolves to the live
   * `attrGuardrailId`/`attrVersion`.
   */
  private resolveHarnessGuardrailRefs(guardrails: { [name: string]: bedrock.CfnGuardrail }): ResolvedGuardrailRefMap {
    return Object.fromEntries(
      Object.entries(guardrails).map(([name, guardrail]) => [
        name,
        { guardrailId: guardrail.attrGuardrailId, guardrailVersion: guardrail.attrVersion },
      ]),
    );
  }

  // ---------------------------------------------
  // AgentCore Gateway Methods
  // ---------------------------------------------

  /**
   * Instantiates one {@link BedrockAgentcoreGatewayL3Construct} per entry in `props.gateways`. For
   * each gateway it injects the shared module CMK, resolves the flat `targets` name-references into
   * the inline {@link GatewayTargetsMap} the gateway L3 expects, rewrites `generated-function:`
   * Lambda references (in targets and interceptors) to the ARNs built from `lambdaFunctions`, and
   * turns each `knowledgeBase` target into a generated connector Lambda target.
   *
   * The gateway L3 is a pure key consumer (neither creates nor grants the CMK), so the builder owns
   * the key grants: each gateway role's encryption use is granted via an identity policy (see
   * {@link grantGatewayRoleKeyUsage}) and the vended-log-delivery service grant is added once by
   * {@link grantGatewaysKeyUsage}. No-op when no gateways are configured; target references are
   * validated up front.
   *
   * @returns a map of gateway name to live gateway ARN, for a Harness's
   *   `tools[].agentCoreGateway.gatewayArn: config:<name>` references.
   */
  private createGateways(
    props: BedrockBuilderL3ConstructProps,
    kmsKey: IKey,
    context: AgentcoreResourceContext,
  ): ResolvedGatewayArnMap {
    const gatewayArns: ResolvedGatewayArnMap = {};
    const gatewayEntries = Object.entries(props.gateways || {});
    if (gatewayEntries.length === 0) {
      return gatewayArns;
    }

    this.validateGatewayTargetReferences(props.gateways || {}, props.gatewayTargets || {});
    const resolutionContext: GatewayTargetResolutionContext = {
      gatewayTargets: props.gatewayTargets || {},
      knowledgeBases: context.knowledgeBases,
      kmsKey,
      endpointsBySet: context.endpointsBySet,
    };

    gatewayEntries.forEach(([gatewayName, gatewayConfig]) => {
      // Split the flat `targets` name-refs off the rest; the gateway L3 takes an inline targets map.
      const { targets: targetRefs, ...gatewayRest } = gatewayConfig;

      const resolvedTargets = this.resolveGatewayTargets(targetRefs, resolutionContext);

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

      gatewayArns[gatewayName] = gatewayConstruct.gateway.attrGatewayArn;
    });

    // Add the vended-log-delivery service grant once to the shared key (needs no gateway role).
    this.grantGatewaysKeyUsage(kmsKey);

    return gatewayArns;
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
   * the gateway L3 expects. A `knowledgeBase` target becomes a Lambda target backed by a generated
   * connector (see {@link resolveKnowledgeBaseTarget}); each Lambda target's `lambdaArn` is rewritten
   * from a `generated-function:` reference to the concrete ARN. Plain ARNs and other targets pass
   * through unchanged; returns undefined when the gateway references no targets.
   */
  private resolveGatewayTargets(
    targetRefs: string[] | undefined,
    context: GatewayTargetResolutionContext,
  ): GatewayTargetsMap | undefined {
    if (!targetRefs || targetRefs.length === 0) {
      return undefined;
    }
    const resolved: { [targetName: string]: GatewayTargetProps } = {};
    targetRefs.forEach(targetRef => {
      // Existence is validated up front by validateGatewayTargetReferences.
      const targetConfig = context.gatewayTargets[targetRef];
      if (targetConfig.targetConfiguration.knowledgeBase) {
        resolved[targetRef] = this.resolveKnowledgeBaseTarget(targetRef, targetConfig, context);
        return;
      }
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
   * Turns a `knowledgeBase` target into a plain Lambda target: validates it, resolves the knowledge
   * base it queries, generates the connector, and describes the connector's `Retrieve` tool with an
   * inline tool schema. The gateway L3 then grants the gateway role `lambda:InvokeFunction` on the
   * connector, as for any Lambda target.
   */
  private resolveKnowledgeBaseTarget(
    targetName: string,
    targetConfig: BuilderGatewayTargetProps,
    context: GatewayTargetResolutionContext,
  ): GatewayTargetProps {
    const knowledgeBase = validateKnowledgeBaseTarget(targetName, targetConfig);
    const knowledgeBaseRef = this.resolveKnowledgeBaseRef(targetName, knowledgeBase.id, context.knowledgeBases);
    const lambdaArn = this.createKnowledgeBaseConnector(targetName, knowledgeBase, {
      knowledgeBaseRef,
      kmsKey: context.kmsKey,
      endpointsBySet: context.endpointsBySet,
    });
    return {
      description: targetConfig.description,
      credentialProvider: targetConfig.credentialProvider,
      targetConfiguration: {
        lambda: {
          lambdaArn,
          toolSchema: buildKnowledgeBaseToolSchema(knowledgeBase.description),
        },
      },
    };
  }

  /**
   * Resolves a `knowledgeBase.id` to the knowledge base's id and ARN. A `config:<name>` reference
   * resolves to the live attributes of the module's knowledge base, so the connector deploys with it
   * in one pass. Any other id (literal, or an `ssm:` dynamic reference) names a knowledge base in this
   * account and region.
   *
   * @throws Error if a `config:` reference names no knowledge base in the module
   */
  private resolveKnowledgeBaseRef(
    targetName: string,
    id: string,
    knowledgeBases: { [kbName: string]: bedrock.CfnKnowledgeBase },
  ): ResolvedKnowledgeBaseRef {
    if (!id.startsWith(KNOWLEDGE_BASE_CONFIG_REF_PREFIX)) {
      return {
        knowledgeBaseId: id,
        knowledgeBaseArn: `arn:${this.partition}:bedrock:${this.region}:${this.account}:knowledge-base/${id}`,
      };
    }
    const kbName = id.slice(KNOWLEDGE_BASE_CONFIG_REF_PREFIX.length).trim();
    const knowledgeBase = knowledgeBases[kbName];
    if (!knowledgeBase) {
      throw new Error(
        `Gateway target "${targetName}" references unknown knowledge base from config: "${kbName}". ` +
          `Define it under the module's "knowledgeBases" map or correct the reference.`,
      );
    }
    return {
      knowledgeBaseId: knowledgeBase.attrKnowledgeBaseId,
      knowledgeBaseArn: knowledgeBase.attrKnowledgeBaseArn,
    };
  }

  /**
   * Generates the connector for one `knowledgeBase` target, under a scope of its own: a Lambda
   * (environment encrypted with the module CMK, in the target's subnets when `networkConfiguration` is
   * set) that calls Retrieve on the knowledge base, the function's CMK-encrypted log group, and its own
   * execution role with a managed policy granting `bedrock:Retrieve` on exactly that knowledge base and
   * writes to exactly that log group. The role has no KMS statement: Lambda decrypts the CMK-encrypted
   * environment through a grant it creates at deploy time.
   *
   * @returns the connector function's ARN
   * @throws Error if the connector's function name is already used in `lambdaFunctions`
   */
  private createKnowledgeBaseConnector(
    targetName: string,
    knowledgeBase: GatewayTargetKnowledgeBaseProperty,
    options: {
      knowledgeBaseRef: ResolvedKnowledgeBaseRef;
      kmsKey: IKey;
      endpointsBySet: Map<string, ResolvedVpcEndpointAccess>;
    },
  ): string {
    const functionName = `kb-connector-${targetName}`;
    if ((this.props.lambdaFunctions?.functions ?? []).some(fn => fn.functionName === functionName)) {
      throw new Error(
        `Gateway target "${targetName}" generates connector function "${functionName}", which is already ` +
          `defined in lambdaFunctions. Rename the function or the gateway target.`,
      );
    }
    // Only this scope's id derives from the target name, so no child id can equal another target's.
    const connectorScope = new Construct(this, `kb-connector-${targetName}`);
    // Must match the name MdaaLambdaFunction gives the function, which is the log group Lambda writes to.
    const functionResourceName = this.props.naming
      .withResourceType(MdaaResourceType.LAMBDA_FUNCTION)
      .resourceName(functionName, 64);
    const logGroup = this.createKnowledgeBaseConnectorLogGroup(connectorScope, functionResourceName, options.kmsKey);
    const { role, policy } = this.createKnowledgeBaseConnectorRole(connectorScope, {
      targetName,
      functionName,
      knowledgeBaseArn: options.knowledgeBaseRef.knowledgeBaseArn,
      logGroup,
      vpcBoundFunctionArn: knowledgeBase.networkConfiguration
        ? `arn:${this.partition}:lambda:${this.region}:${this.account}:function:${functionResourceName}`
        : undefined,
    });
    const vpcConfig = knowledgeBase.networkConfiguration
      ? this.knowledgeBaseConnectorVpcConfig(connectorScope, targetName, {
          networkConfiguration: knowledgeBase.networkConfiguration,
          endpointsBySet: options.endpointsBySet,
        })
      : undefined;

    const connector = new LambdaFunctionL3Construct(connectorScope, 'function', {
      kmsArn: options.kmsKey.keyArn,
      roleHelper: this.props.roleHelper,
      naming: this.props.naming,
      functions: [
        {
          functionName,
          description: `Knowledge base Retrieve connector for gateway target ${targetName}`,
          srcDir: join(__dirname, 'lambda-functions', 'kb-retrieve'),
          handler: 'kb_retrieve.lambda_handler',
          runtime: 'python3.14',
          roleArn: role.roleArn,
          timeoutSeconds: KNOWLEDGE_BASE_CONNECTOR_TIMEOUT_SECONDS,
          memorySizeMB: KNOWLEDGE_BASE_CONNECTOR_MEMORY_MB,
          vpcConfig,
          environment: buildKnowledgeBaseConnectorEnvironment(options.knowledgeBaseRef.knowledgeBaseId, knowledgeBase),
        },
      ],
      overrideScope: true,
    });
    const connectorFunction = connector.functionsMap[functionName];
    // The function is callable as soon as it exists, so keep it behind its grants and its log group -
    // otherwise its first invocation could fail, or leave Lambda to create an unencrypted log group. A
    // VPC-bound function also needs its network interface grants before Lambda creates it.
    connectorFunction.node.addDependency(policy, logGroup);
    return connectorFunction.functionArn;
  }

  /**
   * The Lambda VPC configuration of a VPC-bound connector, in the VPC of the set it references. When the
   * set creates or brings the Bedrock Agent Runtime endpoint, the connector gets a client security group
   * of its own, wired to that endpoint; when the set marks it external, there is no endpoint to wire, so
   * the connector uses the security group it brings.
   *
   * @throws Error if `securityGroupId` is missing for an external endpoint, or set for a wired one
   */
  private knowledgeBaseConnectorVpcConfig(
    scope: Construct,
    targetName: string,
    network: {
      networkConfiguration: GatewayKnowledgeBaseNetworkProperty;
      endpointsBySet: Map<string, ResolvedVpcEndpointAccess>;
    },
  ): VpcConfigProps {
    const { subnets, vpcEndpoints, securityGroupId } = network.networkConfiguration;
    const access = vpcEndpointAccessForKnowledgeBaseConnector(vpcEndpoints, network.endpointsBySet);
    const location = `Gateway target "${targetName}" knowledgeBase.networkConfiguration`;
    if (Object.keys(access.securityGroupIds).length === 0) {
      if (!securityGroupId) {
        throw new Error(
          `${location} must set "securityGroupId": VPC endpoint set "${vpcEndpoints}" marks ` +
            '"bedrockAgentRuntime" external, so there is no endpoint to wire the connector to. Bring a security ' +
            'group that allows HTTPS to wherever Retrieve is reached.',
        );
      }
      return { vpcId: access.vpcId, subnetIds: subnets, securityGroupId };
    }
    if (securityGroupId) {
      throw new Error(
        `${location} sets "securityGroupId", but VPC endpoint set "${vpcEndpoints}" provides the ` +
          'bedrockAgentRuntime endpoint, so the module creates the connector security group wired to it. ' +
          'Remove "securityGroupId", or mark the set\'s "bedrockAgentRuntime" external.',
      );
    }
    const clientAccess = new VpcEndpointClientAccess(scope, 'vpc-endpoint-access', {
      securityGroupName: `kb-connector-vpce-client-${targetName}`,
      securityGroupDescription: `Private endpoint client access for the knowledge base connector of ${targetName}`,
      clientLabel: 'knowledge base connector',
      access,
      naming: this.props.naming,
    });
    return { vpcId: access.vpcId, subnetIds: subnets, securityGroupId: clientAccess.securityGroupId };
  }

  /**
   * Creates the log group a knowledge base connector writes to, before the function, so it is
   * encrypted with the module CMK and retained. The name is taken verbatim because Lambda only writes
   * to `/aws/lambda/<function name>`; a name derived from the naming module would leave that group to
   * be created unencrypted at first invocation.
   */
  private createKnowledgeBaseConnectorLogGroup(
    scope: Construct,
    functionResourceName: string,
    kmsKey: IKey,
  ): MdaaLogGroup {
    return new MdaaLogGroup(scope, 'log-group', {
      naming: this.props.naming,
      createParams: false,
      createOutputs: false,
      logGroupNamePathPrefix: '/aws/lambda',
      logGroupName: functionResourceName,
      verbatimLogGroupName: true,
      encryptionKey: kmsKey,
      retention: RetentionDays.INFINITE,
    });
  }

  /**
   * Creates a knowledge base connector's execution role and the managed policy granting it
   * `bedrock:Retrieve` on exactly one knowledge base and writes to exactly its own log group. The log
   * group already exists, so the role is not granted `logs:CreateLogGroup`. For a VPC-bound connector
   * (`vpcBoundFunctionArn` set), the policy also grants the network interface actions Lambda needs,
   * and denies them to the function's own code.
   */
  private createKnowledgeBaseConnectorRole(
    scope: Construct,
    props: {
      targetName: string;
      functionName: string;
      knowledgeBaseArn: string;
      logGroup: ILogGroup;
      vpcBoundFunctionArn?: string;
    },
  ): { role: MdaaLambdaRole; policy: MdaaManagedPolicy } {
    const role = new MdaaLambdaRole(scope, 'role', {
      naming: this.props.naming,
      createParams: this.props.createParams,
      createOutputs: this.props.createOutputs,
      roleName: props.functionName,
      description: `Execution role for the knowledge base connector of gateway target ${props.targetName}`,
    });
    const policy = new MdaaManagedPolicy(scope, 'policy', {
      managedPolicyName: props.functionName,
      naming: this.props.naming,
      roles: [role],
      statements: [
        new PolicyStatement({
          sid: 'RetrieveFromKnowledgeBase',
          effect: Effect.ALLOW,
          actions: ['bedrock:Retrieve'],
          resources: [props.knowledgeBaseArn],
        }),
        new PolicyStatement({
          sid: 'WriteConnectorLogs',
          effect: Effect.ALLOW,
          actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
          resources: [props.logGroup.logGroupArn],
        }),
        ...(props.vpcBoundFunctionArn ? this.connectorVpcAccessStatements(props.vpcBoundFunctionArn) : []),
      ],
    });
    if (props.vpcBoundFunctionArn) {
      MdaaNagSuppressions.addCodeResourceSuppressions(policy, [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'ec2:DescribeNetworkInterfaces and ec2:DescribeSubnets do not support resource-level permissions ' +
            '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html). ' +
            'ec2:CreateNetworkInterface, ec2:DeleteNetworkInterface, ec2:AssignPrivateIpAddresses and ' +
            'ec2:UnassignPrivateIpAddresses must be allowed on all resources for Lambda to manage the network ' +
            'interfaces of a VPC-bound function ' +
            '(https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html#configuration-vpc-permissions); ' +
            'the same policy denies all of them to the function code by lambda:SourceFunctionArn.',
          appliesTo: ['Resource::*'],
        },
      ]);
    }
    return { role, policy };
  }

  /**
   * The statements a VPC-bound connector's role needs: the network interface actions for the Lambda
   * service, and a deny of the same actions to calls the function's own code makes, which carry
   * `lambda:SourceFunctionArn` (calls by the Lambda service do not).
   * https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html#configuration-vpc-best-practice-security
   */
  private connectorVpcAccessStatements(functionArn: string): PolicyStatement[] {
    return [
      new PolicyStatement({
        sid: 'ManageVpcNetworkInterfaces',
        effect: Effect.ALLOW,
        actions: LAMBDA_VPC_ACCESS_ACTIONS,
        resources: ['*'],
      }),
      new PolicyStatement({
        sid: 'DenyNetworkInterfaceCallsFromFunctionCode',
        effect: Effect.DENY,
        actions: [...LAMBDA_VPC_ACCESS_ACTIONS, 'ec2:DetachNetworkInterface'],
        resources: ['*'],
        conditions: { ArnEquals: { 'lambda:SourceFunctionArn': functionArn } },
      }),
    ];
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
   * {@link resolveKnowledgeBaseLambdaReferences}.
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
   * Creates Lambda functions and layers for use by gateways and knowledge bases.
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
      const lambdaPool = new LambdaFunctionL3Construct(this, 'bedrock-builder-lambda-functions', {
        kmsArn: kmsKey.keyArn,
        roleHelper: props.roleHelper,
        naming: props.naming,
        functions: props.lambdaFunctions?.functions,
        layers: props.lambdaFunctions?.layers,
        overrideScope: true,
      });

      // Create a map of function-name to function-arn for easy lookup
      Object.entries(lambdaPool.functionsMap).forEach(([name, lambda]) => {
        generatedFunctions[name] = lambda.functionArn;
      });
    }

    return generatedFunctions;
  }

  /**
   * Gets an existing KMS key or creates a new one for Bedrock resources.
   */
  private getOrCreateKmsKey(props: BedrockBuilderL3ConstructProps, dataAdminRoles: MdaaResolvableRole[]): IKey {
    const kmsKey = props.kmsKeyArn
      ? kms.Key.fromKeyArn(this, `ImportedKmsKey`, props.kmsKeyArn)
      : new MdaaKmsKey(this.scope, 'bedrock-cmk', {
          naming: this.props.naming,
          keyAdminRoles: dataAdminRoles,
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

    // Reference:
    // https://docs.aws.amazon.com/bedrock/latest/userguide/encryption-kb.html#encryption-kb-runtime

    // Allow the Bedrock service to encrypt/decrypt knowledge base retrieval sessions with this key
    const bedrockKnowledgeBaseServiceStatement = new PolicyStatement({
      sid: 'AllowBedrockServiceForKnowledgeBases',
      effect: Effect.ALLOW,
      actions: ['kms:GenerateDataKey*', 'kms:Decrypt', 'kms:DescribeKey'],
      principals: [new ServicePrincipal('bedrock.amazonaws.com')],
      resources: ['*'],
      conditions: {
        StringEquals: {
          'aws:SourceAccount': this.account,
        },
      },
    });
    kmsKey.addToResourcePolicy(bedrockKnowledgeBaseServiceStatement);

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
   * Resolves Lambda function references in knowledge base data source configurations.
   * This method processes knowledge base configuration and replaces any Lambda function references
   * in custom transformation configurations (S3 and SharePoint data sources) that use the
   * 'generated-function:' prefix with the actual ARN of the generated function
   * (via {@link resolveGeneratedFunctionRef}).
   */
  private resolveKnowledgeBaseLambdaReferences(kbConfig: BedrockKnowledgeBaseProps): BedrockKnowledgeBaseProps {
    return {
      ...kbConfig,
      ...(kbConfig.s3DataSources && {
        s3DataSources: this.resolveDataSourceLambdaReferences(kbConfig.s3DataSources),
      }),
      ...(kbConfig.sharepointDataSources && {
        sharepointDataSources: this.resolveDataSourceLambdaReferences(kbConfig.sharepointDataSources),
      }),
    };
  }

  /**
   * Resolves 'generated-function:' references in each data source's custom transformation Lambda ARNs.
   * Data sources without a custom transformation configuration are returned unchanged.
   */
  private resolveDataSourceLambdaReferences<
    T extends { readonly vectorIngestionConfiguration?: VectorIngestionConfiguration },
  >(dataSources: { [dsName: string]: T }): { [dsName: string]: T } {
    return Object.fromEntries(
      Object.entries(dataSources).map(([dsName, dsConfig]) => {
        const transformConfig = dsConfig.vectorIngestionConfiguration?.customTransformationConfiguration;
        if (!transformConfig) {
          return [dsName, dsConfig];
        }

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

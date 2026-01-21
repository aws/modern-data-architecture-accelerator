/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FunctionProps, LambdaFunctionL3Construct, LayerProps } from '@aws-mdaa/dataops-lambda-l3-construct';

import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaNagSuppressions } from '@aws-mdaa/construct';
import { MdaaManagedPolicy } from '@aws-mdaa/iam-constructs';
import { MdaaAuroraPgVector } from '@aws-mdaa/rds-constructs';
import { MdaaOpensearchServerlessCollection } from '@aws-mdaa/opensearch-constructs';

import { aws_bedrock as bedrock, aws_kms as kms, aws_opensearchserverless as aoss, Stack } from 'aws-cdk-lib';

import { Effect, PolicyStatement, ServicePrincipal, ArnPrincipal } from 'aws-cdk-lib/aws-iam';
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
import { NamedOpensearchServerlessProps, validateAndGroupVpcEndpoints } from './vpc-endpoint-validator';

/**
 * Q-ENHANCED-INTERFACE
 * Lambda function configuration interface for serverless data processing.
 *
 * Use cases: Foundation model deployment; Knowledge base management; GenAI applications; AI model integration
 *
 * AWS: AWS service configuration and deployment
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS service and MDAA requirements
 */
export interface LambdaFunctionProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Lambda layer definitions for shared code and dependencies enabling reusable components and optimized function deployment. Provides layer configurations for Lambda functions used in Bedrock agent action groups with shared libraries, runtime dependencies, and common utilities for efficient function execution.
   *
   * Use cases: Shared code libraries; Runtime dependencies; Common utilities; Function optimization
   *
   * AWS: Lambda layers for Bedrock agent action group functions with shared dependencies and code reuse
   *
   * Validation: Must be array of valid LayerProps if provided; enables shared code and dependency management
   *   **/
  readonly layers?: LayerProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Lambda function definitions for Bedrock agent action groups enabling custom business logic and external system integration. Provides function configurations for implementing agent action groups with custom functionality, API integrations, and business process automation within AI agents.
   *
   * Use cases: Custom business logic; External API integration; Action group implementation; Business process automation
   *
   * AWS: Lambda functions for Bedrock agent action groups with custom business logic and external integrations
   *
   * Validation: Must be array of valid FunctionProps if provided; enables custom action group functionality and integrations
   *   **/
  readonly functions?: FunctionProps[];
}

// Re-export the Named types for backward compatibility
export { NamedAgentProps, NamedKnowledgeBaseProps, NamedVectorStoreProps, NamedGuardrailProps };

export interface BedrockBuilderL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of data admin role references for Bedrock resource access enabling administrative control and resource management. Provides IAM roles that will be granted administrative access to Bedrock agent resources including KMS keys, S3 buckets, and other infrastructure components for AI application management.
   *
   * Use cases: Administrative access; Resource management; Security control; Infrastructure administration
   *
   * AWS: IAM role references for Bedrock resource administrative access and management
   *
   * Validation: Must be array of valid MdaaRoleRef objects; required for Bedrock resource administration and access control
   **/
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of agent names to agent configurations for Bedrock AI agent deployment enabling intelligent automation and conversational AI capabilities. Provides agent configurations with action groups, knowledge bases, and guardrails for building sophisticated AI applications and automated workflows.
   *
   * Use cases: AI agent deployment; Conversational AI; Intelligent automation; AI application development
   *
   * AWS: Bedrock agents for AI automation and conversational AI application deployment
   *
   * Validation: Must be valid NamedAgentProps if provided; enables AI agent deployment and intelligent automation
   *   **/
  readonly agents?: NamedAgentProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for Bedrock resource encryption enabling customer-controlled encryption and enhanced security compliance. When provided, uses existing KMS key for encrypting agent resources; otherwise creates customer-managed key for data protection and security compliance.
   *
   * Use cases: Resource encryption; Customer-controlled keys; Security compliance; Data protection
   *
   * AWS: KMS key ARN for Bedrock resource encryption and customer-controlled data protection
   *
   * Validation: Must be valid KMS key ARN if provided; enables customer-controlled encryption for Bedrock resources
   **/
  readonly kmsKeyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 bucket ARN for agent data storage enabling centralized data management and agent resource storage. When provided, uses existing S3 bucket for agent data storage; otherwise creates dedicated bucket for agent resources and data management.
   *
   * Use cases: Agent data storage; Centralized storage; Resource management; Data organization
   *
   * AWS: S3 bucket ARN for Bedrock agent data storage and resource management
   *
   * Validation: Must be valid S3 bucket ARN if provided; enables centralized agent data storage and management
   **/
  readonly agentBucketArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Lambda function configuration for agent action groups enabling custom business logic and external system integration. Provides Lambda function and layer configurations for implementing agent action groups with custom functionality and external API integrations.
   *
   * Use cases: Custom business logic; External integrations; Action group implementation; Function deployment
   *
   * AWS: Lambda functions for Bedrock agent action groups and custom business logic implementation
   *
   * Validation: Must be valid LambdaFunctionProps if provided; enables custom action group implementation and integrations
   **/
  readonly lambdaFunctions?: LambdaFunctionProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of vector store names to vector store configurations for knowledge base deployment enabling semantic search and RAG capabilities. Provides vector store configurations for storing and retrieving embeddings for knowledge base operations and semantic search functionality.
   *
   * Use cases: Vector storage; Semantic search; RAG applications; Knowledge retrieval
   *
   * AWS: Vector stores for Bedrock knowledge base semantic search and RAG capabilities
   *
   * Validation: Must be valid NamedVectorStoreProps if provided; enables vector storage and semantic search capabilities
   *   **/
  readonly vectorStores?: NamedVectorStoreProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of knowledge base names to knowledge base configurations for RAG application deployment enabling intelligent document retrieval and question answering. Provides knowledge base configurations with data sources, embeddings, and retrieval settings for building RAG applications and intelligent search systems.
   *
   * Use cases: RAG applications; Document retrieval; Question answering; Knowledge management
   *
   * AWS: Bedrock knowledge bases for RAG applications and intelligent document retrieval
   *
   * Validation: Must be valid NamedKnowledgeBaseProps if provided; enables RAG applications and intelligent retrieval
   *   **/
  readonly knowledgeBases?: NamedKnowledgeBaseProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of guardrail names to guardrail configurations for AI safety and responsible AI implementation enabling content filtering and safety controls. Provides guardrail configurations for implementing safety measures, content filtering, and responsible AI practices across Bedrock applications.
   *
   * Use cases: AI safety; Content filtering; Responsible AI; Safety controls
   *
   * AWS: Bedrock guardrails for AI safety and responsible AI implementation
   *
   * Validation: Must be valid NamedGuardrailProps if provided; enables AI safety and responsible AI implementation
   *   **/
  readonly guardrails?: NamedGuardrailProps;
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

    // Add suppressions for internal CDK constructs
    this.addInternalConstructSuppressions();
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
        });

        // Create VPC endpoint
        const vpcEndpoint = new aoss.CfnVpcEndpoint(this, `opensearch-serverless-vpc-endpoint-${vpcId}`, {
          name: this.props.naming.resourceName(`bedrock-kb-vpce-${vpcId}`, 32),
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
   * that use the 'generated-function:' prefix with the actual ARN of the generated function.
   */
  private resolveAgentLambdaReferences(agentConfig: BedrockAgentProps): BedrockAgentProps {
    if (!agentConfig.actionGroups) {
      return agentConfig;
    }

    const resolvedActionGroups = agentConfig.actionGroups.map(actionGroup => {
      if (!actionGroup.actionGroupExecutor?.lambda) {
        return actionGroup;
      }

      const lambdaRef = actionGroup.actionGroupExecutor.lambda;
      if (lambdaRef.startsWith('generated-function:')) {
        const functionName = lambdaRef.split(':')[1];
        const lambdaArn = this.generatedFunctions[functionName.trim()];
        if (lambdaArn) {
          return {
            ...actionGroup,
            actionGroupExecutor: {
              ...actionGroup.actionGroupExecutor,
              lambda: lambdaArn,
            },
          };
        } else {
          throw new Error(`Code references non-existent Generated Lambda function: ${functionName}`);
        }
      }

      return actionGroup;
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
   * actual ARN of the generated function.
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
        const resolvedLambdaArns = transformConfig.transformLambdaArns.map(lambdaArn => {
          if (lambdaArn.startsWith('generated-function:')) {
            const functionName = lambdaArn.split(':')[1];
            const resolvedArn = this.generatedFunctions[functionName.trim()];
            if (resolvedArn) {
              return resolvedArn;
            } else {
              throw new Error(`Code references non-existant Generated Lambda function: ${functionName}`);
            }
          }
          return lambdaArn;
        });

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
    // Add suppressions for internal CDK constructs like BucketNotificationsHandler
    Stack.of(this).node.children.forEach(child => {
      if (
        child.node.id.includes('Custom::CDKBucketDeployment') ||
        child.node.id.includes('BucketNotificationsHandler') ||
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

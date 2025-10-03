/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaManagedPolicy } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { USER_ACTIONS } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { aws_bedrock as bedrock, aws_kms as kms, CfnResource } from 'aws-cdk-lib';
import { CfnGuardrail, CfnKnowledgeBase } from 'aws-cdk-lib/aws-bedrock';
import { Effect, ManagedPolicy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { CfnPermission } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse, stringify } from 'yaml';
import { resolveModelArn } from '@aws-mdaa/ai-helper';

/**
 * Q-ENHANCED-INTERFACE
 * API schema configuration for Bedrock agent action groups with OpenAPI schema support enabling API integration. Extends standard Bedrock API schema properties with file-based schema loading for flexible API definition and agent integration.
 *
 * Use cases: API schema definition; OpenAPI integration; Agent action configuration; External API connectivity
 *
 * AWS: Amazon Bedrock agent API schema for action group configuration and external API integration
 *
 * Validation: Extends CfnAgent.APISchemaProperty; openApiSchemaPath must be valid file path if provided
 */
export interface APISchemaProperty extends bedrock.CfnAgent.APISchemaProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional relative path to JSON or YAML formatted OpenAPI schema file for agent action group API definition. Enables file-based API schema loading for flexible agent configuration and external API integration providing schema validation.
   *
   * Use cases: File-based schema loading; OpenAPI integration; Flexible API definition; Schema management
   *
   * AWS: OpenAPI schema file path for Bedrock agent action group API configuration and integration
   *
   * Validation: Must be valid relative file path to JSON/YAML OpenAPI schema if provided
   **/
  readonly openApiSchemaPath?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration for Bedrock agent action groups providing API integration and execution capabilities. Defines action groups that enable agents to perform specific tasks through API calls and function execution with complete configuration control.
 *
 * Use cases: Agent action configuration; API integration; Function execution; Task automation
 *
 * AWS: Amazon Bedrock agent action group for task execution and API integration capabilities
 *
 * Validation: actionGroupName and actionGroupExecutor are required; actionGroupState must be ENABLED or DISABLED
 */
export interface AgentActionGroupProperty {
  /**
   * Q-ENHANCED-PROPERTY
   * Required name for the agent action group providing unique identification within the agent configuration. Enables action group organization and management for agent task execution and API integration capabilities.
   *
   * Use cases: Action group identification; Agent organization; Task categorization; Configuration management
   *
   * AWS: Bedrock agent action group name for identification and organization within agent configuration
   *
   * Validation: Must be unique action group name string; required for action group identification
   **/
  readonly actionGroupName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional action group state controlling availability for agent invocation with ENABLED or DISABLED values. Provides runtime control over action group availability for dynamic agent behavior and operational management.
   *
   * Use cases: Runtime control; Action group management; Dynamic behavior; Operational flexibility
   *
   * AWS: Bedrock agent action group state for runtime availability and operational control
   *
   * Validation: Must be ENABLED or DISABLED if provided; defaults to ENABLED for action group availability
   **/
  readonly actionGroupState?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional description for the action group providing documentation and context for agent configuration. Enables clear documentation of action group purpose and functionality for operational understanding and management.
   *
   * Use cases: Documentation; Configuration context; Operational understanding; Management clarity
   *
   * AWS: Bedrock agent action group description for documentation and operational context
   *
   * Validation: Must be descriptive string if provided; enhances action group documentation and understanding
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required action group executor configuration defining how the action group performs tasks and integrates with external systems. Provides the execution mechanism for action group operations including Lambda functions and API integrations.
   *
   * Use cases: Task execution; Lambda integration; API connectivity; External system integration
   *
   * AWS: Bedrock agent action group executor for task execution and external system integration
   *
   * Validation: Must be valid ActionGroupExecutorProperty; required for action group execution capabilities
   *   **/
  readonly actionGroupExecutor: bedrock.CfnAgent.ActionGroupExecutorProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional API schema configuration for action group external API integration enabling API connectivity. Provides OpenAPI schema definition for external API integration and agent-to-API communication capabilities.
   *
   * Use cases: API integration; External connectivity; Schema validation; API documentation
   *
   * AWS: Bedrock agent API schema for external API integration and connectivity capabilities
   *
   * Validation: Must be valid APISchemaProperty if provided; enables external API integration
   *   **/
  readonly apiSchema?: APISchemaProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional function schema configuration defining parameters for agent function invocation enabling structured function calls. Provides function parameter definition for agent-to-function communication and structured task execution.
   *
   * Use cases: Function parameter definition; Structured invocation; Parameter validation; Function integration
   *
   * AWS: Bedrock agent function schema for structured function invocation and parameter management
   *
   * Validation: Must be valid FunctionSchemaProperty if provided; enables structured function calls
   *   **/
  readonly functionSchema?: bedrock.CfnAgent.FunctionSchemaProperty;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration for Bedrock agent guardrail association providing content filtering and safety controls. Defines guardrail integration for agent safety, content filtering, and responsible AI implementation with version control.
 *
 * Use cases: Content filtering; Safety controls; Responsible AI; Agent governance
 *
 * AWS: Amazon Bedrock guardrail association for agent safety and content filtering capabilities
 *
 * Validation: id is required; version must be valid guardrail version if provided
 */
export interface AgentGuardrailAssociation {
  /**
   * Q-ENHANCED-PROPERTY
   * Required guardrail identifier for agent safety and content filtering integration. Provides the specific guardrail that will be applied to agent interactions for responsible AI implementation and content safety controls.
   *
   * Use cases: Guardrail identification; Safety integration; Content filtering; Responsible AI implementation
   *
   * AWS: Bedrock guardrail ID for agent safety controls and content filtering integration
   *
   * Validation: Must be valid guardrail identifier; required for agent safety and content filtering
   **/
  readonly id: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional guardrail version specification for version-controlled safety implementation enabling consistent guardrail behavior. Provides version control for guardrail configuration ensuring consistent safety controls across agent deployments.
   *
   * Use cases: Version control; Consistent safety; Guardrail management; Deployment consistency
   *
   * AWS: Bedrock guardrail version for version-controlled safety implementation and consistency
   *
   * Validation: Must be valid guardrail version if provided; enables version-controlled safety controls
   **/
  readonly version?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration for Bedrock agent knowledge base association providing knowledge integration and retrieval capabilities. Defines knowledge base connectivity for agent information retrieval and knowledge-augmented generation with state control.
 *
 * Use cases: Knowledge integration; Information retrieval; RAG implementation; Knowledge management
 *
 * AWS: Amazon Bedrock knowledge base association for agent knowledge integration and retrieval
 *
 * Validation: description and id are required; knowledgeBaseState must be valid state if provided
 */
export interface AgentKnowledgeBaseAssociation {
  /**
   * Q-ENHANCED-PROPERTY
   * Required description of the knowledge base association providing context and documentation for agent knowledge integration. Enables clear understanding of knowledge base purpose and integration scope for operational management and configuration clarity.
   *
   * Use cases: Association documentation; Integration context; Operational understanding; Configuration clarity
   *
   * AWS: Bedrock knowledge base association description for documentation and operational context
   *
   * Validation: Must be descriptive string; required for knowledge base association documentation
   **/
  readonly description: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required unique identifier for the knowledge base association enabling specific knowledge base integration with the agent. Provides the knowledge base that will be integrated with the agent for information retrieval and knowledge-augmented generation.
   *
   * Use cases: Knowledge base identification; Integration specification; Retrieval configuration; RAG implementation
   *
   * AWS: Bedrock knowledge base ID for agent integration and knowledge retrieval capabilities
   *
   * Validation: Must be valid knowledge base identifier; required for knowledge base integration
   **/
  readonly id: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional knowledge base state controlling usage during agent invocation enabling dynamic knowledge integration control. Provides runtime control over knowledge base usage for flexible agent behavior and operational management.
   *
   * Use cases: Runtime control; Dynamic integration; Knowledge management; Operational flexibility
   *
   * AWS: Bedrock knowledge base state for runtime usage control and dynamic integration management
   *
   * Validation: Must be valid knowledge base state if provided; controls knowledge base usage during invocation
   **/
  readonly knowledgeBaseState?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Comprehensive configuration for Bedrock agent properties with foundation model integration, knowledge bases, and action groups. Defines complete agent behavior including model selection, instructions, knowledge integration, and task execution capabilities.
 *
 * Use cases: Agent configuration; Model integration; Knowledge augmentation; Task automation
 *
 * AWS: Amazon Bedrock agent configuration for AI agent deployment and management
 *
 * Validation: foundationModel, instruction, and role are required; various optional configurations available
 */
export interface BedrockAgentProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling automatic DRAFT version updates after agent configuration changes enabling streamlined development workflow. Provides automatic version management for agent development and testing with simplified deployment processes.
   *
   * Use cases: Development workflow; Automatic versioning; Testing facilitation; Deployment automation
   *
   * AWS: Bedrock agent auto-prepare setting for automatic DRAFT version management and development workflow
   *
   * Validation: Boolean value; enables automatic DRAFT version updates for streamlined development
   **/
  readonly autoPrepare?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional agent description providing documentation and context for agent purpose and capabilities. Enables clear documentation of agent functionality and use cases for operational understanding and management clarity.
   *
   * Use cases: Agent documentation; Operational context; Purpose clarification; Management understanding
   *
   * AWS: Bedrock agent description for documentation and operational context management
   *
   * Validation: Must be descriptive string if provided; enhances agent documentation and understanding
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required foundation model specification for agent orchestration and reasoning capabilities. Defines the underlying AI model that powers agent reasoning, decision-making, and response generation for agent functionality.
   *
   * Use cases: Model selection; AI capabilities; Reasoning power; Response generation
   *
   * AWS: Bedrock foundation model for agent orchestration and AI reasoning capabilities
   *
   * Validation: Must be valid foundation model identifier; required for agent AI capabilities and reasoning
   **/
  readonly foundationModel: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional idle session timeout in seconds controlling conversation context retention enabling resource management and privacy controls. Provides session lifecycle management for agent conversations with automatic cleanup and resource optimization.
   *
   * Use cases: Session management; Resource optimization; Privacy controls; Context retention
   *
   * AWS: Bedrock agent idle session TTL for conversation context management and resource optimization
   *
   * Validation: Must be positive integer if provided; controls session timeout and resource management
   **/
  readonly idleSessionTtlInSeconds?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Required agent instructions defining behavior, interaction patterns, and response guidelines for consistent agent operation. Provides the core behavioral framework that guides agent responses and user interactions for predictable and effective operation.
   *
   * Use cases: Behavior definition; Interaction guidelines; Response consistency; Operational framework
   *
   * AWS: Bedrock agent instructions for behavior definition and consistent operation guidelines
   *
   * Validation: Must be instruction string; required for agent behavior and interaction guidance
   **/
  readonly instruction: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional prompt override configuration for customizing agent prompt templates enabling advanced prompt engineering and response customization. Provides fine-grained control over agent prompting for specialized use cases and response optimization.
   *
   * Use cases: Prompt engineering; Response customization; Advanced configuration; Specialized behavior
   *
   * AWS: Bedrock agent prompt override for advanced prompt engineering and response customization
   *
   * Validation: Must be valid PromptOverrideConfigurationProperty if provided; enables advanced prompt control
   *   **/
  readonly promptOverrideConfiguration?: bedrock.CfnAgent.PromptOverrideConfigurationProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of knowledge base associations for agent knowledge integration enabling information retrieval and RAG capabilities. Provides knowledge augmentation for agent responses with external knowledge sources and information retrieval.
   *
   * Use cases: Knowledge augmentation; Information retrieval; RAG implementation; External knowledge integration
   *
   * AWS: Bedrock agent knowledge base associations for knowledge integration and retrieval capabilities
   *
   * Validation: Must be array of valid AgentKnowledgeBaseAssociation if provided; enables knowledge integration
   *   **/
  readonly knowledgeBases?: AgentKnowledgeBaseAssociation[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of action groups for agent task execution enabling API integration and function calling capabilities. Provides task automation and external system integration for agent functionality extension and operational capabilities.
   *
   * Use cases: Task automation; API integration; Function calling; External system connectivity
   *
   * AWS: Bedrock agent action groups for task execution and external system integration capabilities
   *
   * Validation: Must be array of valid AgentActionGroupProperty if provided; enables task execution and integration
   *   **/
  readonly actionGroups?: AgentActionGroupProperty[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional guardrail association for agent safety and content filtering enabling responsible AI implementation and content controls. Provides safety mechanisms and content filtering for responsible agent operation and user protection.
   *
   * Use cases: Safety controls; Content filtering; Responsible AI; User protection
   *
   * AWS: Bedrock agent guardrail for safety controls and responsible AI implementation
   *
   * Validation: Must be valid AgentGuardrailAssociation if provided; enables safety and content filtering
   *   **/
  readonly guardrail?: AgentGuardrailAssociation;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional agent alias name for version management and deployment control enabling production deployment and version routing. Provides alias-based access to specific agent versions for production deployment and traffic management.
   *
   * Use cases: Version management; Production deployment; Traffic routing; Alias-based access
   *
   * AWS: Bedrock agent alias for version management and production deployment control
   *
   * Validation: Must be valid alias name if provided; enables version management and deployment control
   **/
  readonly agentAliasName?: string;
  /**
   * Reference to role which will be used as execution role on all agent(s).
   * The role must have assume-role trust with bedrock.amazonaws.com.
   */
  readonly role: MdaaRoleRef;
}

/**
 * Q-ENHANCED-INTERFACE
 * Named agent properties mapping for multiple agent configuration enabling multi-agent deployment and management. Provides a mapping structure for deploying and managing multiple Bedrock agents with individual configurations and settings.
 * Use cases: Multi-agent deployment; Agent organization; Bulk configuration; Agent management
 * AWS: Multiple Bedrock agent configurations for organized multi-agent deployment and management
 * Validation: Keys must be valid agent names; values must be valid BedrockAgentProps
 */
export interface NamedAgentProps {
  /** @jsii ignore */
  [agentName: string]: BedrockAgentProps;
}

export interface BedrockAgentL3ConstructProps extends MdaaL3ConstructProps {
  readonly agentName: string;
  readonly agentConfig: BedrockAgentProps;
  /**
   * KMS key for encryption
   */
  readonly kmsKey: kms.IKey;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of knowledge base names to Amazon Bedrock knowledge base resources enabling RAG (Retrieval-Augmented Generation) capabilities for the agent. Provides pre-created knowledge bases that the Bedrock agent can query for enhanced responses with domain-specific information and context.
   *
   * Use cases: RAG implementation; Domain knowledge integration; Enhanced agent responses; Knowledge base connectivity; Information retrieval
   * AWS: Amazon Bedrock knowledge base integration for agent RAG capabilities and enhanced AI responses
   * Validation: Must be map of valid knowledge base names to CfnKnowledgeBase resources if provided; optional for RAG functionality
   *   */
  readonly knowledgeBases?: { [kbName: string]: CfnKnowledgeBase };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of guardrail names to Amazon Bedrock guardrail resources enabling content filtering and safety controls for the agent. Provides pre-created guardrails that enforce content policies, safety measures, and response filtering for responsible AI deployment.
   *
   * Use cases: Content filtering; Safety controls; Response moderation; Responsible AI; Content policy enforcement; AI safety measures
   * AWS: Amazon Bedrock guardrail integration for agent content filtering and safety controls
   * Validation: Must be map of valid guardrail names to CfnGuardrail resources if provided; optional for content safety
   *   */
  readonly guardrails?: { [name: string]: CfnGuardrail };
}

// ---------------------------------------------
// Bedrock Agents L3 Construct
// ---------------------------------------------

export class BedrockAgentL3Construct extends MdaaL3Construct {
  public readonly agent: bedrock.CfnAgent;
  protected readonly props: BedrockAgentL3ConstructProps;

  constructor(scope: Construct, id: string, props: BedrockAgentL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.agent = this.createBedrockAgent(
      props.agentName,
      props.agentConfig,
      props.kmsKey,
      props.knowledgeBases || {},
      props.guardrails || {},
    );
  }

  private createBedrockAgent(
    agentName: string,
    agentConfig: BedrockAgentProps,
    kmsKey: kms.IKey,
    knowledgeBases: { [kbName: string]: CfnKnowledgeBase },
    guardrails: { [name: string]: CfnGuardrail },
  ): bedrock.CfnAgent {
    // Prepare action group(s) for the Agent
    const agentActionGroups: bedrock.CfnAgent.AgentActionGroupProperty[] = this.getActionGroups(agentConfig);

    const bedrockAgentRole = this.props.roleHelper
      .resolveRoleRefWithRefId(agentConfig.role, `bedrock-agent-role-${agentName}`)
      .role(`bedrock-agent-role-${agentName}`);

    const knowledgeBaseAssociations = this.resolveAgentKnowledgeBaseAssociations(
      knowledgeBases,
      agentConfig.knowledgeBases,
    );

    const knowledgeBaseArns = knowledgeBaseAssociations?.map(x => {
      return `arn:${this.partition}:bedrock:${this.region}:${this.account}:knowledge-base/${x.knowledgeBaseId}`;
    });

    const guardrailAssociation = this.resolveGuardrailAssociation(guardrails, agentConfig.guardrail);

    const guardrailArn = guardrailAssociation
      ? `arn:aws:bedrock:${this.region}:${this.account}:guardrail/${guardrailAssociation.guardrailIdentifier}`
      : undefined;

    const foundationModelArn = resolveModelArn(agentConfig.foundationModel, this.partition, this.region, this.account);

    const agentManagedPolicy = this.createBedrockAgentPolicy(
      agentName,
      kmsKey,
      foundationModelArn,
      knowledgeBaseArns,
      guardrailArn,
    );
    agentManagedPolicy.attachToRole(bedrockAgentRole);

    // Create Bedrock Agent
    const agent = new bedrock.CfnAgent(this, `mdaa-bedrock-agent-${agentName}`, {
      agentName: this.props.naming.resourceName(agentName),
      autoPrepare: agentConfig.autoPrepare ?? false,
      customerEncryptionKeyArn: kmsKey.keyArn,
      description: agentConfig.description,
      foundationModel: foundationModelArn,
      idleSessionTtlInSeconds: agentConfig.idleSessionTtlInSeconds ?? 3600,
      instruction: agentConfig.instruction,
      promptOverrideConfiguration: agentConfig.promptOverrideConfiguration,
      agentResourceRoleArn: bedrockAgentRole.roleArn,
      knowledgeBases: knowledgeBaseAssociations,
      guardrailConfiguration: guardrailAssociation,
      actionGroups: agentActionGroups,
    });

    // Ensure the agent is created only after the managed policy is fully deployed
    agent.addDependency(agentManagedPolicy.node.defaultChild as CfnResource);

    // Create an alias for the agent
    this.createAgentAlias(agentName, agent.attrAgentId, agentConfig);

    // Add Lambda Permission to allow Bedrock Service Principal to Invoke Lambda on behalf of Specific Agent
    if (agentActionGroups) {
      agentActionGroups?.forEach((ag, index) => {
        if (ag?.actionGroupExecutor && !('resolve' in ag.actionGroupExecutor)) {
          const lambdaArn = ag?.actionGroupExecutor?.lambda;
          if (lambdaArn) {
            // Create the permission for Bedrock to invoke Lambda
            new CfnPermission(this, `BedrockInvokePermission-${index}`, {
              action: 'lambda:InvokeFunction',
              functionName: lambdaArn,
              principal: 'bedrock.amazonaws.com',
              sourceArn: agent.attrAgentArn,
            });
          }
        }
      });
    }
    return agent;
  }

  private getActionGroups(agentConfig: BedrockAgentProps): bedrock.CfnAgent.AgentActionGroupProperty[] {
    const agentActionGroups: bedrock.CfnAgent.AgentActionGroupProperty[] = [];
    const actionGroups = agentConfig.actionGroups ?? [];
    actionGroups.forEach(actionGroup => {
      // Check if openApiSchemaPath is defined, if yes, read the schema from local file
      let apiSchema;
      if (actionGroup.apiSchema?.openApiSchemaPath) {
        const configFilePath = resolve(__dirname, actionGroup.apiSchema?.openApiSchemaPath);
        console.log('Reading config file from path' + configFilePath);
        const payload = parse(readFileSync(configFilePath, 'utf8'));
        apiSchema = { payload: stringify(payload) };
      } else {
        apiSchema = actionGroup?.apiSchema;
      }

      const ag: bedrock.CfnAgent.AgentActionGroupProperty = {
        actionGroupName: actionGroup.actionGroupName,
        apiSchema: apiSchema,
        functionSchema: actionGroup.functionSchema,
        description: actionGroup.description,
        actionGroupState: actionGroup.actionGroupState,
        actionGroupExecutor: actionGroup.actionGroupExecutor,
      };
      agentActionGroups.push(ag);
    });

    return agentActionGroups;
  }

  private createAgentAlias(agentName: string, agentId: string, agentConfig: BedrockAgentProps) {
    if (agentConfig.agentAliasName) {
      new bedrock.CfnAgentAlias(this, `mdaa-bedrock-agent-${agentName}-alias`, {
        agentId: agentId,
        agentAliasName: agentConfig.agentAliasName,
      });
    }
  }

  private resolveAgentKnowledgeBaseAssociations(
    knowledgeBases: { [kbName: string]: CfnKnowledgeBase },
    knowledgeBaseAssociations?: AgentKnowledgeBaseAssociation[],
  ) {
    return knowledgeBaseAssociations?.map(kb => {
      const knowledgeBaseId = kb.id.startsWith('config:')
        ? knowledgeBases[kb.id.replace(/^config:\s*/, '')]?.attrKnowledgeBaseId
        : kb.id;

      if (!knowledgeBaseId) {
        throw new Error(`Agent references unknown knowledge base from config :${kb.id}`);
      }
      return {
        description: kb.description,
        knowledgeBaseState: kb.knowledgeBaseState,
        knowledgeBaseId: knowledgeBaseId,
      };
    });
  }

  private resolveGuardrailAssociation(
    guardrails: {
      [name: string]: bedrock.CfnGuardrail;
    },
    guardrailConfiguration?: AgentGuardrailAssociation,
  ): bedrock.CfnAgent.GuardrailConfigurationProperty | undefined {
    if (!guardrailConfiguration) {
      return undefined;
    }
    const guardrailId = guardrailConfiguration.id.startsWith('config:')
      ? guardrails[guardrailConfiguration.id.replace(/^config:\s*/, '')].attrGuardrailId
      : guardrailConfiguration.id;

    const resolvedGuardrailVersion = guardrailConfiguration.id.startsWith('config:')
      ? guardrails[guardrailConfiguration.id.replace(/^config:\s*/, '')].attrVersion
      : undefined;

    const guardrailVersion = guardrailConfiguration.version ? guardrailConfiguration.version : resolvedGuardrailVersion;

    if (!guardrailVersion) {
      throw new Error('Guardrail version must be specified');
    }

    return {
      guardrailIdentifier: guardrailId,
      guardrailVersion: guardrailVersion,
    };
  }

  private createBedrockAgentPolicy(
    agentName: string,
    kmsKey: kms.IKey,
    foundationModelArn: string,
    knowledgeBaseArns?: string[],
    guardrailArn?: string,
  ): ManagedPolicy {
    // Add a Policy to allow to invoke access to the foundation model
    const agentManagedPolicy = new MdaaManagedPolicy(this, `agent-managed-pol-${agentName}`, {
      managedPolicyName: `agent-${agentName}`,
      naming: this.props.naming,
    });

    const kmsKeyStatement = new PolicyStatement({
      actions: USER_ACTIONS,
      resources: [kmsKey.keyArn],
      effect: Effect.ALLOW,
    });
    agentManagedPolicy.addStatements(kmsKeyStatement);

    // Allow access to the foundation model (including inference profiles)
    const modelActions = ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'];

    // Add additional permissions for inference profiles
    if (foundationModelArn.includes(':inference-profile/')) {
      modelActions.push('bedrock:GetInferenceProfile');
    }

    const invokeModelStatement = new PolicyStatement({
      sid: 'InvokeFoundationModel',
      effect: Effect.ALLOW,
      resources: [foundationModelArn],
      actions: modelActions,
    });
    agentManagedPolicy.addStatements(invokeModelStatement);

    // Apply Guardrail policy if Guardrails is mentioned
    if (guardrailArn) {
      const guardrailStatement = new PolicyStatement({
        sid: 'AllowApplyBedrockGuardrail',
        effect: Effect.ALLOW,
        resources: [guardrailArn],
        actions: ['bedrock:ApplyGuardrail'],
      });
      agentManagedPolicy.addStatements(guardrailStatement);
    }
    // Apply Knowledge Base policy if Knowledge Bases is mentioned
    if (knowledgeBaseArns && knowledgeBaseArns.length > 0) {
      const knowledgeBaseStatement = new PolicyStatement({
        sid: 'AllowBedrockKnowledgeBase',
        effect: Effect.ALLOW,
        resources: [...knowledgeBaseArns],
        actions: ['bedrock:Retrieve'],
      });
      agentManagedPolicy.addStatements(knowledgeBaseStatement);
    }

    return agentManagedPolicy;
  }
}

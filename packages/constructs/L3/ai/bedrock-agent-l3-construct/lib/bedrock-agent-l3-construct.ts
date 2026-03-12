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

export interface APISchemaProperty extends bedrock.CfnAgent.APISchemaProperty {
  /** Relative path to JSON/YAML OpenAPI schema file */
  readonly openApiSchemaPath?: string;
}

export interface AgentActionGroupProperty {
  /** Action group name */
  readonly actionGroupName: string;
  /** Action group state (ENABLED or DISABLED) */
  readonly actionGroupState?: string;
  /** Action group description */
  readonly description?: string;
  /** Action group executor (e.g. Lambda function) */
  readonly actionGroupExecutor: bedrock.CfnAgent.ActionGroupExecutorProperty;
  /** API schema for external API integration */
  readonly apiSchema?: APISchemaProperty;
  /** Function schema for structured function invocation */
  readonly functionSchema?: bedrock.CfnAgent.FunctionSchemaProperty;
}

export interface AgentGuardrailAssociation {
  /** Guardrail identifier */
  readonly id: string;
  /** Guardrail version */
  readonly version?: string;
}

export interface AgentKnowledgeBaseAssociation {
  /** Knowledge base association description */
  readonly description: string;
  /** Knowledge base identifier */
  readonly id: string;
  /** Knowledge base state (controls usage during invocation) */
  readonly knowledgeBaseState?: string;
}

export interface BedrockAgentProps {
  /** Auto-prepare DRAFT version after changes */
  readonly autoPrepare?: boolean;
  /** Agent description */
  readonly description?: string;
  /** Foundation model identifier for agent reasoning */
  readonly foundationModel: string;
  /** Idle session timeout in seconds */
  readonly idleSessionTtlInSeconds?: number;
  /** Agent instructions defining behavior and interaction patterns */
  readonly instruction: string;
  /** Prompt override configuration for advanced prompt engineering */
  readonly promptOverrideConfiguration?: bedrock.CfnAgent.PromptOverrideConfigurationProperty;
  /** Knowledge base associations for RAG capabilities */
  readonly knowledgeBases?: AgentKnowledgeBaseAssociation[];
  /** Action groups for task execution and API integration */
  readonly actionGroups?: AgentActionGroupProperty[];
  /** Guardrail association for safety and content filtering */
  readonly guardrail?: AgentGuardrailAssociation;
  /** Agent alias name for version management */
  readonly agentAliasName?: string;
  /**
   * Reference to role which will be used as execution role on all agent(s).
   * The role must have assume-role trust with bedrock.amazonaws.com.
   */
  readonly role: MdaaRoleRef;
}

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
  /** Map of knowledge base names to CfnKnowledgeBase resources for RAG */
  readonly knowledgeBases?: { [kbName: string]: CfnKnowledgeBase };
  /** Map of guardrail names to CfnGuardrail resources for content safety */
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

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleRef } from "@aws-mdaa/iam-role-helper";
import { MdaaL3Construct, MdaaL3ConstructProps } from "@aws-mdaa/l3-construct";
import { Role, IRole, PolicyStatement, Effect, ManagedPolicy} from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";
import { aws_bedrock as bedrock , CfnOutput, IResolvable } from "aws-cdk-lib";
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, MdaaKmsKey} from '@aws-mdaa/kms-constructs';
import { MdaaManagedPolicy } from "@aws-mdaa/iam-constructs";
import { resolve } from 'path';
import { parse, stringify } from 'yaml';
import { readFileSync } from 'fs';
import { FunctionProps, LambdaFunctionL3Construct, LayerProps} from '@aws-mdaa/dataops-lambda-l3-construct'
import { CfnPermission } from "aws-cdk-lib/aws-lambda";

export interface LambdaFunctionProps {
    /**
     * List of layer definitions
     */
    readonly layers?: LayerProps[];
    /**
     * List of function definitions
     */
    readonly functions?: FunctionProps[];

}

export interface APISchemaProperty extends bedrock.CfnAgent.APISchemaProperty{
  /**
   * Provide relative path to JSON/YAML formatted OpenAPI schema
   */
  readonly openApiSchemaPath?: string
}

export interface AgentActionGroupProperty {
  /**
   * Name of action group
   */
  readonly actionGroupName: string
  /**
   * Specify whether the action group is available for the agent to invoke or not
   * @default ENABLED
   * Valid states: ENABLED | DISABLED
   */
  readonly actionGroupState?: string
  /**
   * Description of action group
   * @default - No description.
   */
  readonly description?: string;
  /**
   * Action group executor
   */
  readonly actionGroupExecutor: bedrock.CfnAgent.ActionGroupExecutorProperty
  /**
   * API Schema for action group
   */
  readonly apiSchema?: APISchemaProperty
  /**
   * Functions that each define parameters that agent needs to invoke from the user
   */
  readonly functionSchema?: bedrock.CfnAgent.FunctionSchemaProperty

}

export interface BedrockAgentProps {
  
  /**
   * Specifies whether to automatically update the DRAFT version of the agent after making changes to the agent
   */
  readonly autoPrepare?: boolean;

  /**
   * The description of the agent
   */
  readonly description?: string;
  /**
   * The foundation model used for orchestration by the agent
   */
  readonly foundationModel: string;
  /**
   * The number of seconds for which Amazon Bedrock keeps information about a user's conversation with the agent
   */
  readonly idleSessionTtlInSeconds?: number;
  /**
   * Instructions that tell the agent what it should do and how it should interact with users
   */
  readonly instruction: string;
  /**
   * Contains configurations to override prompt templates in different parts of an agent sequence
   */
  readonly promptOverrideConfiguration?:  bedrock.CfnAgent.PromptOverrideConfigurationProperty
  /**
   * The knowledge bases associated with the agent.
   */
  readonly knowledgeBases?: bedrock.CfnAgent.AgentKnowledgeBaseProperty[]
  /**
   * The action groups that belong to an agent
   */
  readonly actionGroups?: AgentActionGroupProperty[]
  /**
   * Configuration information for a guardrail that you use with the Converse operation
   * See also: http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-bedrock-agent-guardrailconfiguration.html 
   */
  readonly guardrailConfiguration?: bedrock.CfnAgent.GuardrailConfigurationProperty

  /**
   * Name of Alias for Agent pointing to specific Agent Version 
   */
  readonly agentAliasName?: string;
}

export interface BedrockAgentL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * List of admin roles which will be provided access to agent resources (like KMS/Bucket)
   */
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Reference to role which will be used as execution role on all agent(s).
   * The role must have assume role trust with bedrock.amazonaws.com. Additional managed polies
   * may be added to the role to grant it access to agent resources and relevant services.
   */
  readonly bedrockAgentExecutionRole: MdaaRoleRef;
  /**
   * Bedrock Agents
   */
  readonly agents: { [agentName:string] : BedrockAgentProps };
  /** (Optional)
   * The Amazon Resource Name (ARN) of the AWS KMS key that encrypts the agent resources.
   * If not provided, a customer managed key will be created
   */
  readonly kmsKeyArn?: string;
  /**
   * (Optional) S3 Bucket Arn for the agent
   */
  readonly agentBucketArn?: string;
  /**
   * (Optional) Lambda Functions and associated layers Used By Agent Action Groups
   */
  readonly lambdaFunctions?: LambdaFunctionProps;
  
}

//This stack creates all of the resources required for a Data Science agent
//to use SageMaker Studio on top of a Data Lake
export class BedrockAgentL3Construct extends MdaaL3Construct {
  protected readonly props: BedrockAgentL3ConstructProps;
  public readonly agents: bedrock.CfnAgent[] = [];

  constructor(scope: Construct, id: string, props: BedrockAgentL3ConstructProps ) {
    super(scope, id, props);
    this.props = props;

    const bedrockAgentExecutionRoleResolved = props.roleHelper.resolveRoleRefWithRefId(this.props.bedrockAgentExecutionRole,"agent-execution-role" );
    const bedrockAgentExecutionRole = Role.fromRoleArn(this,"agent-execution-role", bedrockAgentExecutionRoleResolved.arn());
    const dataAdminRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals( this.props.dataAdminRoles, "DataAdmin" )
    const dataAdminRoleIds = dataAdminRoles.map(x => x.id())
    const allRoleIds = [...dataAdminRoleIds, bedrockAgentExecutionRoleResolved.id()] 
    
    const kmsKeyArn = this.getOrCreateAgentKmsKey(props, allRoleIds)

    // Create Necessary Lambda Functions containing the business logic that is carried out upon invoking the action. 
    let generatedFunctions: {[name:string]: string} = {}
    if ( props.lambdaFunctions ){
      const agentLambdas = new LambdaFunctionL3Construct(this,"agent-lambda-functions",
        {
          kmsArn: kmsKeyArn,
          roleHelper: props.roleHelper,
          naming: this.props.naming,
          functions: props.lambdaFunctions?.functions,
          layers: props.lambdaFunctions?.layers
        })
      // Create a map of function-name to function-arn for easy lookup
      Object.entries(agentLambdas.functionsMap).forEach(([name, lambda]) => {
        generatedFunctions[name] = lambda.functionArn
      })
    }
    
    // Create Agent Managed Policy
    const agentManagedPolicy = this.createBedrockAgentPolicy(props);
    agentManagedPolicy.attachToRole(bedrockAgentExecutionRole);

    // Create Bedrock Agent(s)
    Object.entries(props.agents).forEach( ([agentName, agentConfig]) => {
      const agent = this.createBedrockAgent(agentName, agentConfig, bedrockAgentExecutionRole, kmsKeyArn, generatedFunctions);
      this.agents.push(agent);
    }) 

    return this;
  }

  private getActionGroups(agentConfig: BedrockAgentProps, functionsArnMap: {[name:string]: string}): bedrock.CfnAgent.AgentActionGroupProperty[] {
    // Check every actionGroup within props.agent.actionGroup and if actionGroup.apiSchema.openSchemaPath property is defined, read the yaml file and load it to payload
    // If not defined, push it to the agentActionGroups array
    const agentActionGroups: bedrock.CfnAgent.AgentActionGroupProperty[] = []
    const actionGroups = agentConfig.actionGroups ?? []
    actionGroups.forEach(actionGroup => {

      // Check if openApiSchemaPath is defined, if yes, read the schema from local file
      let apiSchema = undefined
      if (actionGroup.apiSchema?.openApiSchemaPath) {
        const configFilePath = resolve(__dirname, actionGroup.apiSchema?.openApiSchemaPath);
        console.log("Reading config file from path" + configFilePath);
        const payload = parse(readFileSync(configFilePath, 'utf8'));
        apiSchema = { 'payload' : stringify(payload)}
      } else {
        apiSchema = actionGroup?.apiSchema
      }

      const ag: bedrock.CfnAgent.AgentActionGroupProperty = {
        actionGroupName: actionGroup.actionGroupName,
        apiSchema: apiSchema,
        functionSchema: actionGroup.functionSchema,
        description: actionGroup.description,
        actionGroupState: actionGroup.actionGroupState,
        actionGroupExecutor: this.processActionGroupExecutor(actionGroup.actionGroupExecutor,functionsArnMap),
      }
      agentActionGroups.push(ag)
    });

    return agentActionGroups
  }

  private processActionGroupExecutor(executor: bedrock.CfnAgent.ActionGroupExecutorProperty , functionsArnMap: {[name:string]: string}): bedrock.CfnAgent.ActionGroupExecutorProperty | undefined | IResolvable {
    if (!executor || !executor.lambda) {
      return executor;
    }
    // Check if props using generated Lambda Function. 
    // If the executor property, starts with generated-function:<function-name>, then replace this with the Function ARN from the map
     
    if (executor.lambda.startsWith("generated-function:")) {
      const functionName = executor.lambda.split(":")[1];
      const lambdaArn = functionsArnMap[functionName.trim()];
      if (lambdaArn) {
        return {
          lambda: lambdaArn
        };
      }
      else {
        throw new Error(`Code references non-existant Generated Lambda function: ${functionName} `);
      }
    }
  
    return executor;
  }

  private createAgentAlias(agentName:string, agentId: string, agentConfig: BedrockAgentProps) {
    if (agentConfig.agentAliasName) {
      const agentAlias = new bedrock.CfnAgentAlias(this, `mdaa-bedrock-agent-${agentName}-alias`, {
        agentId: agentId,
        agentAliasName: agentConfig.agentAliasName,
      });
      new StringParameter(agentAlias, `${agentName}/alias`, {
        parameterName: this.props.naming.ssmPath(`${agentName}/alias`, false),
        stringValue: agentConfig.agentAliasName
      });
      new CfnOutput(agentAlias, 'AgentAlias', {
        value: agentConfig.agentAliasName,
        description: 'The alias name of the Bedrock Agent',
        exportName: this.props.naming.resourceName(`${agentName}-AgentAlias`)
      });
    }
  }

  private createBedrockAgent(agentName:string, agentConfig: BedrockAgentProps, bedrockAgentExecutionRole: IRole, kmsKeyArn: string, generatedFunctions:{[name:string]: string}): bedrock.CfnAgent {
    
    // Prepare action group(s) for the Agent
    const agentActionGroups: bedrock.CfnAgent.AgentActionGroupProperty[]  = this.getActionGroups(agentConfig, generatedFunctions)
    // Create Bedrock Agent
    const agent = new bedrock.CfnAgent(this, `mdaa-bedrock-agent-${agentName}`, {
      agentName: this.props.naming.resourceName(agentName),
      autoPrepare: agentConfig.autoPrepare ?? false,
      customerEncryptionKeyArn: kmsKeyArn,
      description: agentConfig.description,
      foundationModel: agentConfig.foundationModel,
      idleSessionTtlInSeconds: agentConfig.idleSessionTtlInSeconds ?? 3600,
      instruction: agentConfig.instruction,
      promptOverrideConfiguration: agentConfig.promptOverrideConfiguration,
      agentResourceRoleArn: bedrockAgentExecutionRole.roleArn,
      knowledgeBases: agentConfig.knowledgeBases,
      guardrailConfiguration: agentConfig.guardrailConfiguration,
      actionGroups: agentActionGroups
    });

    // Create an alias for the agent
    this.createAgentAlias(agentName, agent.attrAgentId, agentConfig);

    // Add Lambda Permission to allow Bedrock Service Principal to Invoke Lambda on behalf of Specific Agent
    if (agentActionGroups){
      agentActionGroups?.forEach((ag,index )=> {
        if (ag?.actionGroupExecutor && !('resolve' in ag?.actionGroupExecutor)){
          const lambdaArn = ag?.actionGroupExecutor?.lambda
          if (lambdaArn){
            // Create the permission for Bedrock to invoke Lambda
            new CfnPermission(this, `BedrockInvokePermission-${index}`, {
              action: 'lambda:InvokeFunction',
              functionName: lambdaArn,
              principal: 'bedrock.amazonaws.com',
              sourceArn: agent.attrAgentArn
            });
          }
        }
      })
    }
    new StringParameter( agent, `${ agentName }/name`, {
      parameterName: this.props.naming.ssmPath( `${ agentName }/name`, false ),
      stringValue: this.props.naming.resourceName(agentName)
    } )
    new StringParameter( agent, `${ agentName }/id`, {
      parameterName: this.props.naming.ssmPath( `${ agentName }/id`, false ),
      stringValue: agent.attrAgentId
    } )
    new CfnOutput(agent, 'AgentId', {
      value: agent.attrAgentId,
      description: 'The ID of the created Bedrock Agent',
      exportName: this.props.naming.resourceName(`${agentName}-AgentId`),
    });
    return agent
  }

  private getOrCreateAgentKmsKey( props: BedrockAgentL3ConstructProps,allRoleIds: string[] ) : string {
    if (props.kmsKeyArn) {
      return props.kmsKeyArn
    }
    else {
      const kmsKey = new MdaaKmsKey( this.scope, "bedrock-agent-cmk", {
        naming: this.props.naming,
        keyUserRoleIds: allRoleIds
      } )
      // Provide encrypt/decrypt access to bedrock service
      const BedrockServiceEncryptPolicy = new PolicyStatement( {
        sid: "AllowBedrockToEncryptDecryptAgentResourceOnUsersBehalf",
        effect: Effect.ALLOW,
        // Use of * mirrors what is done in the CDK methods for adding policy helpers.
        resources: [ '*' ],
        actions: [...ENCRYPT_ACTIONS, ...DECRYPT_ACTIONS]
      } )
      BedrockServiceEncryptPolicy.addServicePrincipal( "bedrock.amazonaws.com" )
      kmsKey.addToResourcePolicy( BedrockServiceEncryptPolicy)
      
      // Allow the attachment of persistent resources
      const BedrockServiceGrantPolicy = new PolicyStatement( {
        sid: "Allow the attachment of persistent resources",
        effect: Effect.ALLOW,
        resources: [ '*' ],
        actions: [
          "kms:CreateGrant",
          "kms:ListGrants",
          "kms:RevokeGrant"
        ],
        conditions: {
          "Bool": {
            "kms:GrantIsForAWSResource": true
          }
        }
      } )
      BedrockServiceGrantPolicy.addServicePrincipal("bedrock.amazonaws.com")
      kmsKey.addToResourcePolicy( BedrockServiceGrantPolicy )
      return kmsKey.keyArn
    }
  }

  private createBedrockAgentPolicy(props: BedrockAgentL3ConstructProps): ManagedPolicy {
    // Extract list of foundation models & guardrails for each agent. 
    const foundationModelArns: Set<string> = new Set<string>()
    const guardrailArns: Set<string> = new Set<string>()
    const knowledgeBaseArns: Set<string> = new Set<string>()
    Object.entries(props.agents).forEach(agent => {
      foundationModelArns.add(`arn:aws:bedrock:${ this.region }::foundation-model/${agent[1].foundationModel }` )
      // Check if Agent uses guardrail(s)
      if (agent[1].guardrailConfiguration?.guardrailIdentifier) {
        guardrailArns.add(`arn:aws:bedrock:${ this.region }:${ this.account }:guardrail/${ agent[1].guardrailConfiguration?.guardrailIdentifier }`)
      }
      // Check if Agent uses knowledgebase(s)
      if (agent[1].knowledgeBases) {
        agent[1].knowledgeBases.forEach(kb => {
          knowledgeBaseArns.add(`arn:aws:bedrock:${ this.region }:${ this.account }:knowledge-base/${ kb.knowledgeBaseId }`)
        })
      }
    });
     
    // Add a Policy to allow invoke access to the foundation model
    const agentManagedPolicy = new MdaaManagedPolicy( this, "agent-managed-pol", {
      managedPolicyName: 'agent-managed-policy',
      naming: this.props.naming
    } )
    // Allow access to the foundation model
    const invokeModelStatement = new PolicyStatement( {
      sid: "InvokeFoundationModel",
      effect: Effect.ALLOW,
      resources: [...foundationModelArns],
      actions: [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream"
      ]
    } )   
    agentManagedPolicy.addStatements( invokeModelStatement )

    // Apply Guardrail policy if Guardrails is mentioned
    if (guardrailArns.size>0) {
      const guardrailStatement = new PolicyStatement( {
        sid: "AllowApplyBedrockGuardrail",
        effect: Effect.ALLOW,
        resources: [ ...guardrailArns ],
        actions: [
          "bedrock:ApplyGuardrail"
        ]
      } )
      agentManagedPolicy.addStatements( guardrailStatement )
    }
    // Apply Knowledge Base policy if Knowledge Bases is mentioned
    if (knowledgeBaseArns.size>0) {
      const knowledgeBaseStatement = new PolicyStatement( {
        sid: "AllowBedrockKnowledgeBase",
        effect: Effect.ALLOW,
        resources: [ ...knowledgeBaseArns ],
        actions: [
          "bedrock:Retrieve"  
        ]
      } )
      agentManagedPolicy.addStatements( knowledgeBaseStatement )
    }

    return agentManagedPolicy

  }
}
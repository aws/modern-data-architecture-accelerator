/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { FunctionProps, LambdaFunctionL3Construct, LayerProps } from '@aws-mdaa/dataops-lambda-l3-construct';

import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DECRYPT_ACTIONS, ENCRYPT_ACTIONS, MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';

import { aws_bedrock as bedrock, aws_kms as kms } from 'aws-cdk-lib';

import { Effect, PolicyStatement, ServicePrincipal, ArnPrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';

import { Construct } from 'constructs';
import { BedrockAgentL3Construct, NamedAgentProps, BedrockAgentProps } from '@aws-mdaa/bedrock-agent-l3-construct';
import {
  BedrockKnowledgeBaseL3Construct,
  NamedKnowledgeBaseProps,
  NamedVectorStoreProps,
  BedrockKnowledgeBaseProps,
} from '@aws-mdaa/bedrock-knowledge-base-l3-construct';
import { BedrockGuardrailL3Construct, NamedGuardrailProps } from '@aws-mdaa/bedrock-guardrail-l3-construct';

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

// Re-export the Named types for backward compatibility
export { NamedAgentProps, NamedKnowledgeBaseProps, NamedVectorStoreProps, NamedGuardrailProps };

export interface BedrockBuilderL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * List of admin roles which will be provided access to agent resources (like KMS/Bucket)
   */
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Bedrock Agents configuration
   * @jsii ignore
   */
  readonly agents?: NamedAgentProps;
  /**
   * (Optional) The Amazon Resource Name (ARN) of the AWS KMS key that encrypts the agent resources.
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
  /**
   * (Optional) Knowledge Bases Vector Store configs
   * @jsii ignore
   */
  readonly vectorStores?: NamedVectorStoreProps;
  /**
   * (Optional) Knowledge Bases configuration
   * @jsii ignore
   */
  readonly knowledgeBases?: NamedKnowledgeBaseProps;
  /**
   * (Optional) Guardrails configuration
   * @jsii ignore
   */
  readonly guardrails?: NamedGuardrailProps;
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

    // Create knowledge bases (each will create its own vector store)
    const knowledgeBases: { [kbName: string]: bedrock.CfnKnowledgeBase } = {};
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
      });
      knowledgeBases[kbName] = kbConstruct.knowledgeBase;
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
  }

  // ---------------------------------------------
  // Common Methods
  // ---------------------------------------------

  /**
   * Creates Lambda functions and layers for use by Bedrock agents and knowledge bases.
   *
   * This method creates Lambda functions and layers based on the provided configuration,
   * then builds a mapping of function names to their ARNs for later reference resolution.
   *
   * @param props - The construct properties containing Lambda function configurations
   * @param kmsKey - The KMS key to use for encrypting Lambda function environment variables
   * @returns A mapping of function names to their ARNs for reference resolution
   *
   * @example
   * // Returns: { 'my-function': 'arn:aws:lambda:region:account:function:my-function' }
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
      Object.values(props.agents).forEach(agentConfig => {
        if (agentConfig.role) {
          const roleResolved = props.roleHelper.resolveRoleRefWithRefId(agentConfig.role, 'agent-execution-role');
          executionRoleArnsSet.add(roleResolved.arn());
        }
      });
    }

    if (props.knowledgeBases) {
      Object.values(props.knowledgeBases).forEach(kbConfig => {
        if (kbConfig.role) {
          const roleResolved = props.roleHelper.resolveRoleRefWithRefId(kbConfig.role, 'kb-execution-role');
          executionRoleArnsSet.add(roleResolved.arn());
        }
      });
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
   *
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
   *
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
}

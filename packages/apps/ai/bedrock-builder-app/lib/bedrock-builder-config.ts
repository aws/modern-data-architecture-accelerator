/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from "@aws-mdaa/app";
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { BedrockAgentProps, LambdaFunctionProps } from "@aws-mdaa/bedrock-agent-l3-construct";
import { Schema } from "ajv";
import { Stack } from "aws-cdk-lib";
import * as configSchema from './config-schema.json';

export interface BedrockBuilderConfigContents extends MdaaBaseConfigContents {
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

export class BedrockBuilderConfigParser extends MdaaAppConfigParser<BedrockBuilderConfigContents> {
    /**
     * List of admin roles which will be provided access to agent resources (like KMS/Bucket)
     */
    public readonly dataAdminRoles: MdaaRoleRef[];
    /**
     * Reference to role which will be used as execution role on all agent(s).
     * The role must have assume role trust with bedrock.amazonaws.com. Additional managed polies
     * may be added to the role to grant it access to agent resources and relevant services.
     */
    public readonly bedrockAgentExecutionRole: MdaaRoleRef;
    /**
     * Bedrock Agent
     */
    public readonly agents: {[agentName: string] : BedrockAgentProps};
    /**
     * (Optional)
     * The Amazon Resource Name (ARN) of the AWS KMS key that encrypts the agent resources.
     * If not provided, a customer managed key will be created
     */
    public readonly kmsKeyArn?: string;
    /**
     * (Optional) S3 Bucket Arn for the agent
     */
    public readonly agentBucketArn?: string;
    /**
     * (Optional) Lambda Functions and associated layers Used By Agent Action Groups
     */
    public readonly lambdaFunctions?: LambdaFunctionProps;

    constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.dataAdminRoles = this.configContents.dataAdminRoles
        this.bedrockAgentExecutionRole = this.configContents.bedrockAgentExecutionRole
        this.agents = this.configContents.agents
        this.kmsKeyArn = this.configContents.kmsKeyArn
        this.agentBucketArn = this.configContents.agentBucketArn
        this.lambdaFunctions= this.configContents.lambdaFunctions
    }
}


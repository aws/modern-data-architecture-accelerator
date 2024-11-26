/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from "@aws-mdaa/iam-role-helper";
import { MdaaTestApp } from "@aws-mdaa/testing";
import { Template } from "aws-cdk-lib/assertions";
import { FunctionProps, LayerProps } from "@aws-mdaa/dataops-lambda-l3-construct";
import {
  BedrockAgentL3Construct,
  BedrockAgentL3ConstructProps,
  BedrockAgentProps,
  LambdaFunctionProps
} from "../lib";


describe("Mdaa Compliance Stack Tests", () => {
  
  const layerProps: LayerProps = {
    layerName: "test-layer",
    src: "./test/lambda/test-layer.zip",
    description: "layer testing"
  };
  const functionProps: FunctionProps = {
    functionName: "test-agent-lambda",
    srcDir: "./test/lambda/test",
    handler: "test_handler",
    roleArn: "arn:test-partition:iam::test-acct:role/test-lambda-role",
    runtime: "python3.12",
    generatedLayerNames: [ "test-layer" ]
  }
  const agentExecutionRoleRef: MdaaRoleRef = {
    arn: "arn:test-partition:iam::test-account:role/agent-execution-role",
    name: "agent-execution-role",
  };
  const lambdaFunctions: LambdaFunctionProps = {
    functions: [functionProps],
    layers: [layerProps]
  };
  const dataAdminRoleRef: MdaaRoleRef = {
    arn: "arn:test-partition:iam::test-account:role/test-role",
    name: "test-role",
  };
  const agent: BedrockAgentProps = {
    autoPrepare: false,
    description: "Sample Agent",
    instruction: "Agent Test Instructions",
    foundationModel: "anthropic.claude-3-sonnet-20240229-v1:0",
    agentAliasName: "test-alias",
    guardrailConfiguration: {
      guardrailIdentifier: "test-guardrail-id",
      guardrailVersion: "DRAFT",
    },
    actionGroups: [
      {
        actionGroupExecutor: {
          lambda: "generated-function:test-agent-lambda"
        },
        actionGroupName: "test-action-group",
        description: "test-action-group-description",
        apiSchema: {
          openApiSchemaPath: "../test/api-schema/test-schema.yaml"
        }
        
      },
    ],
  }
  const agent_2: BedrockAgentProps = {
    autoPrepare: true,
    description: "Sample Agent  2",
    instruction: "Agent Test Instructions",
    foundationModel: "anthropic.claude-3-sonnet-20240229-v1:0",
    agentAliasName: "test-alias-2",
    guardrailConfiguration: {
      guardrailIdentifier: "test-guardrail-id",
      guardrailVersion: "DRAFT",
    },
    actionGroups: [
      {
        actionGroupExecutor: {
          lambda: "arn:test-partition:lambda:test-region:test-account:function:existing-lambda-function"
        },
        actionGroupName: "test-action-group-2",
        description: "test-action-group-description-2",
        apiSchema: {
          s3: {
            s3BucketName:"test-bucket",
            s3ObjectKey: "test-schema.yaml"
          }
        }
        
      },
    ],
    knowledgeBases:[
      { 
        description: "This is a Test Knowledge Base",
        knowledgeBaseId: "test-kb-id"
      }
    ]
  }
  

  describe("Bedrock Agent L3 Construct Compliance Tests", () => {
    const template = generateTemplateFromTestInput(dataAdminRoleRef, agentExecutionRoleRef, {"test-agent-1": agent},  lambdaFunctions);
    // console.log(JSON.stringify(template, undefined, 2));
    
    test( 'Test Bedrock Agent Resource', () => {
      template.hasResourceProperties( "AWS::Bedrock::Agent", {
          
            "AgentName": "test-org-test-env-test-domain-test-module-test-agent-1",
            "AgentResourceRoleArn": "arn:test-partition:iam::test-account:role/agent-execution-role",
            "AutoPrepare": false,
            "Description": "Sample Agent",
            "FoundationModel": "anthropic.claude-3-sonnet-20240229-v1:0",
            "IdleSessionTTLInSeconds": 3600
          })
    } )
    test( 'Test Bedrock Agent Alias', () => {
      template.hasResourceProperties( "AWS::Bedrock::AgentAlias", {
            "AgentAliasName": "test-alias",
            "AgentId": {
              "Fn::GetAtt": [
                "teststackmdaabedrockagenttestagent1260C3FCD",
                "AgentId"
              ]
            }
          })
    } )
    test( 'Test CMK Generation', () => {
      template.hasResourceProperties( "AWS::KMS::Key", {
            "EnableKeyRotation": true,
            "Enabled": true,

      })
    });
    test( 'Test Lambda Invoke Permission for Bedrock Agent', () => {
      template.hasResourceProperties( "AWS::Lambda::Permission", {
            "Action": "lambda:InvokeFunction",
            "FunctionName": {
              "Fn::GetAtt": [ "teststacktestagentlambdaBDB0C7D9", "Arn" ]
            },
            "Principal": "bedrock.amazonaws.com",
            "SourceArn": {
              "Fn::GetAtt": [
                "teststackmdaabedrockagenttestagent1260C3FCD",
                "AgentArn"
              ]
            }
          })
    } )
  });

  describe("Bedrock Agent Compliance Test with existing Lambda Functions", ()=>{
    const template = generateTemplateFromTestInput(dataAdminRoleRef, agentExecutionRoleRef, {"test-agent-2": agent_2});
    // console.log(JSON.stringify(template, undefined, 2));
    test( 'Test Bedrock Agent Resource', () => {
      template.hasResourceProperties( "AWS::Bedrock::Agent", {
          
            "ActionGroups": [
              {
                "ActionGroupExecutor": {
                  "Lambda": "arn:test-partition:lambda:test-region:test-account:function:existing-lambda-function"
                },
                "ActionGroupName": "test-action-group-2",
                "ApiSchema": {
                  "S3": {
                    "S3BucketName": "test-bucket",
                    "S3ObjectKey": "test-schema.yaml"
                  }
                },
                "Description": "test-action-group-description-2"
              }
            ],
            "AgentName": "test-org-test-env-test-domain-test-module-test-agent-2",
            "AgentResourceRoleArn": "arn:test-partition:iam::test-account:role/agent-execution-role",
            "AutoPrepare": true,
            "CustomerEncryptionKeyArn": {
              "Fn::GetAtt": [
                "bedrockagentcmkC1E0055A",
                "Arn"
              ]
            },
            "Description": "Sample Agent  2",
            "FoundationModel": "anthropic.claude-3-sonnet-20240229-v1:0",
            "GuardrailConfiguration": {
              "GuardrailIdentifier": "test-guardrail-id",
              "GuardrailVersion": "DRAFT"
            },
            "IdleSessionTTLInSeconds": 3600,
            "Instruction": "Agent Test Instructions",
            "KnowledgeBases": [
              {
                "Description": "This is a Test Knowledge Base",
                "KnowledgeBaseId": "test-kb-id"
              }
            ]
          })
    } )
  });
})

function generateTemplateFromTestInput(dataAdminRoleRef: MdaaRoleRef, execRoleRef: MdaaRoleRef, agents:{[agentName:string]:BedrockAgentProps}, lambdaFunctions?: LambdaFunctionProps) {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  let constructProps: BedrockAgentL3ConstructProps 
  if (lambdaFunctions) {
      constructProps = {
      dataAdminRoles: [dataAdminRoleRef],
      bedrockAgentExecutionRole: execRoleRef,
      agents: agents,
      roleHelper: roleHelper,
      naming: testApp.naming,
      lambdaFunctions: lambdaFunctions
    } ;
  } else {
    constructProps = {
      dataAdminRoles: [dataAdminRoleRef],
      bedrockAgentExecutionRole: execRoleRef,
      agents: agents,
      roleHelper: roleHelper,
      naming: testApp.naming,
    } 
  };

  new BedrockAgentL3Construct(
    testApp.testStack,
    "teststack",
    constructProps
  );
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);
  return template;
}


/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { createAgentCoreResourcePolicy } from '../lib';

const TEST_RESOURCE_ARN = `arn:aws:bedrock-agentcore:test-region:test-account:runtime/my-runtime`;
const TEST_VPC_ID = 'vpc-0123456789abcdef0';

describe('createAgentCoreResourcePolicy', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('should create native AWS::BedrockAgentCore::ResourcePolicy resource', () => {
    createAgentCoreResourcePolicy(testApp.testStack, 'TestPolicy', {
      resourceArn: TEST_RESOURCE_ARN,
      vpcId: TEST_VPC_ID,
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::BedrockAgentCore::ResourcePolicy', 1);
  });

  test('should not create a Lambda-backed custom resource, Lambda, or role', () => {
    createAgentCoreResourcePolicy(testApp.testStack, 'TestPolicy', {
      resourceArn: TEST_RESOURCE_ARN,
      vpcId: TEST_VPC_ID,
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('Custom::AgentCoreResourcePolicy', 0);
    template.resourceCountIs('AWS::Lambda::Function', 0);
    template.resourceCountIs('AWS::IAM::Role', 0);
  });

  test('should pass policy document with VPC-only Allow and explicit Deny statements', () => {
    createAgentCoreResourcePolicy(testApp.testStack, 'TestPolicy', {
      resourceArn: TEST_RESOURCE_ARN,
      vpcId: TEST_VPC_ID,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::BedrockAgentCore::ResourcePolicy', {
      ResourceArn: TEST_RESOURCE_ARN,
      Policy: Match.serializedJson(
        Match.objectLike({
          Version: '2012-10-17',
          Statement: [
            Match.objectLike({
              Sid: 'AllowVpcOnly',
              Effect: 'Allow',
              Principal: '*',
              Action: ['bedrock-agentcore:InvokeAgentRuntime*'],
              Resource: TEST_RESOURCE_ARN,
              Condition: {
                StringEquals: {
                  'aws:SourceVpc': TEST_VPC_ID,
                },
              },
            }),
            Match.objectLike({
              Sid: 'DenyWrongVpc',
              Effect: 'Deny',
              Principal: '*',
              Action: ['bedrock-agentcore:InvokeAgentRuntime*'],
              Resource: TEST_RESOURCE_ARN,
              Condition: {
                StringNotEqualsIfExists: {
                  'aws:SourceVpc': TEST_VPC_ID,
                },
                Null: {
                  'aws:SourceVpc': 'false',
                },
                BoolIfExists: {
                  'aws:ViaAWSService': 'false',
                },
              },
            }),
            Match.objectLike({
              Sid: 'DenyNoVpc',
              Effect: 'Deny',
              Principal: '*',
              Action: ['bedrock-agentcore:InvokeAgentRuntime*'],
              Resource: TEST_RESOURCE_ARN,
              Condition: {
                Null: {
                  'aws:SourceVpc': 'true',
                },
                BoolIfExists: {
                  'aws:ViaAWSService': 'false',
                },
              },
            }),
          ],
        }),
      ),
    });
  });

  test('explicit Deny statements exempt AWS service-to-service traffic', () => {
    // Both Denies must carry the aws:ViaAWSService=false guard: AWS services
    // invoking on the customer's behalf do not traverse the customer VPC
    // endpoint, so without the exemption the Denies would block them.
    createAgentCoreResourcePolicy(testApp.testStack, 'TestPolicy', {
      resourceArn: TEST_RESOURCE_ARN,
      vpcId: TEST_VPC_ID,
    });

    const template = Template.fromStack(testApp.testStack);
    const resources = template.findResources('AWS::BedrockAgentCore::ResourcePolicy');
    const policyJson = JSON.parse(Object.values(resources)[0].Properties.Policy);
    const denyStatements = policyJson.Statement.filter((s: { Effect: string }) => s.Effect === 'Deny');
    expect(denyStatements).toHaveLength(2);
    for (const deny of denyStatements) {
      expect(deny.Condition.BoolIfExists).toEqual({ 'aws:ViaAWSService': 'false' });
    }
  });

  test('should use custom actions in all policy statements when specified', () => {
    const gatewayArn = 'arn:aws:bedrock-agentcore:test-region:test-account:gateway/my-gateway';
    createAgentCoreResourcePolicy(testApp.testStack, 'TestPolicy', {
      resourceArn: gatewayArn,
      vpcId: TEST_VPC_ID,
      actions: ['bedrock-agentcore:InvokeGateway'],
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::BedrockAgentCore::ResourcePolicy', 1);
    const resources = template.findResources('AWS::BedrockAgentCore::ResourcePolicy');
    const policyJson = JSON.parse(Object.values(resources)[0].Properties.Policy);
    expect(policyJson.Statement).toHaveLength(3);
    for (const statement of policyJson.Statement) {
      expect(statement.Action).toEqual(['bedrock-agentcore:InvokeGateway']);
      expect(statement.Resource).toEqual(gatewayArn);
    }
  });
});

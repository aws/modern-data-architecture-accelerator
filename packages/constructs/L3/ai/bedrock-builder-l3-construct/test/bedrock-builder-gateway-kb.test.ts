/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Token } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { GatewayTargetCredentialProviderType } from '@aws-mdaa/bedrock-agentcore-gateway-l3-construct';
import {
  BedrockBuilderL3Construct,
  BedrockBuilderL3ConstructProps,
  GatewayKnowledgeBaseNetworkProperty,
  GatewayKnowledgeBaseSearchType,
  GatewayTargetKnowledgeBaseProperty,
  LambdaFunctionProps,
  NamedGatewayTargetProps,
  NamedHarnessProps,
  NamedVpcEndpointSetProps,
} from '../lib';
import {
  buildKnowledgeBaseConnectorEnvironment,
  isUnresolvedAtSynth,
  validateKnowledgeBaseTarget,
} from '../lib/gateway-knowledge-base';
import {
  KNOWLEDGE_BASE_CONNECTOR_ENDPOINT_SERVICE,
  knowledgeBaseConnectorVpcEndpointConsumer,
  reconcileVpcEndpointSets,
  VpcEndpointSetConsumer,
} from '../lib/supporting-vpc-endpoints';

// Mock Lambda layer constructs to avoid Docker builds for the knowledge base's vector store layers.
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */
jest.mock('@aws-mdaa/lambda-constructs', () => {
  const originalModule = jest.requireActual('@aws-mdaa/lambda-constructs');
  const path = require('path');
  const { LayerVersion, Code, Runtime } = require('aws-cdk-lib/aws-lambda');
  const mockLayerDir = path.join(__dirname, 'mock-lambda-layer');
  class MockLayerVersion extends LayerVersion {
    constructor(scope: any, id: string, props: { naming: { resourceName: (name: string) => string } }) {
      super(scope, id, {
        code: Code.fromAsset(mockLayerDir),
        compatibleRuntimes: [Runtime.PYTHON_3_12, Runtime.PYTHON_3_14],
        layerVersionName: props.naming.resourceName(`mock-layer-${id}`),
      });
    }
  }
  return {
    ...originalModule,
    MdaaBoto3LayerVersion: MockLayerVersion,
    MdaaAwsAuthLayerVersion: MockLayerVersion,
    MdaaOpensearchPyLayerVersion: MockLayerVersion,
  };
});
/* eslint-enable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

// Exercises the builder-level knowledgeBase gateway target: its conversion to a Lambda target backed
// by a generated connector, the connector's role and Retrieve grant, knowledge base reference
// resolution, and the synth-time validation.

const dataAdminRoleRef: MdaaRoleRef = {
  arn: 'arn:test-partition:iam::test-account:role/test-role',
  name: 'test-role',
};

const kbRoleRef: MdaaRoleRef = {
  arn: 'arn:test-partition:iam::test-account:role/kb-execution-role',
  name: 'kb-execution-role',
};

const customJwt = {
  customJwt: {
    discoveryUrl: 'https://example.com/.well-known/openid-configuration',
    allowedAudience: ['my-audience'],
  },
};

const TOOL_DESCRIPTION = 'Search customer support and product documentation.';
const CONNECTOR_HANDLER = 'kb_retrieve.lambda_handler';

function kbTarget(knowledgeBase: Partial<GatewayTargetKnowledgeBaseProperty>): NamedGatewayTargetProps {
  return {
    'support-kb': {
      description: 'Customer support knowledge base',
      targetConfiguration: {
        knowledgeBase: { id: 'config:support-docs', description: TOOL_DESCRIPTION, ...knowledgeBase },
      },
    },
  };
}

interface BuildProps {
  readonly gatewayTargets: NamedGatewayTargetProps;
  readonly targets?: string[];
  readonly lambdaFunctions?: LambdaFunctionProps;
  readonly vpcEndpoints?: NamedVpcEndpointSetProps;
  readonly harnesses?: NamedHarnessProps;
}

function constructProps(testApp: MdaaTestApp, props: BuildProps): BedrockBuilderL3ConstructProps {
  return {
    dataAdminRoles: [dataAdminRoleRef],
    roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
    naming: testApp.naming,
    lambdaFunctions: props.lambdaFunctions,
    vectorStores: { 'test-vector-store': { vpcId: 'test-vpc-id', subnetIds: ['test-subnet'] } },
    knowledgeBases: {
      'support-docs': {
        role: kbRoleRef,
        vectorStore: 'test-vector-store',
        embeddingModel: 'amazon.titan-embed-text-v2:0',
      },
      'product-docs': {
        role: kbRoleRef,
        vectorStore: 'test-vector-store',
        embeddingModel: 'amazon.titan-embed-text-v2:0',
      },
    },
    gateways: {
      'kb-gateway': {
        authorizerConfiguration: customJwt,
        targets: props.targets ?? Object.keys(props.gatewayTargets),
      },
    },
    gatewayTargets: props.gatewayTargets,
    vpcEndpoints: props.vpcEndpoints,
    harnesses: props.harnesses,
  };
}

function template(props: BuildProps): Template {
  const testApp = new MdaaTestApp();
  new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps(testApp, props));
  return Template.fromStack(testApp.testStack);
}

function build(props: BuildProps): () => BedrockBuilderL3Construct {
  const testApp = new MdaaTestApp();
  return () => new BedrockBuilderL3Construct(testApp.testStack, 'test-construct', constructProps(testApp, props));
}

/** The logical id of the single resource of a type matching the given properties. */
function logicalIdOf(t: Template, type: string, properties: object): string {
  const ids = Object.keys(t.findResources(type, { Properties: properties }));
  expect(ids).toHaveLength(1);
  return ids[0];
}

function knowledgeBaseLogicalId(t: Template, kbName: string): string {
  return logicalIdOf(t, 'AWS::Bedrock::KnowledgeBase', { Name: Match.stringLikeRegexp(kbName) });
}

interface ConnectorFunction {
  readonly logicalId: string;
  readonly properties: { [key: string]: unknown };
  readonly dependsOn: string[];
}

function connectorFunctions(t: Template): ConnectorFunction[] {
  const functions = t.findResources('AWS::Lambda::Function', { Properties: { Handler: CONNECTOR_HANDLER } });
  return Object.entries(functions).map(([logicalId, resource]) => ({
    logicalId,
    properties: resource.Properties,
    dependsOn: resource.DependsOn ?? [],
  }));
}

function connectorFunction(t: Template): ConnectorFunction {
  const functions = connectorFunctions(t);
  expect(functions).toHaveLength(1);
  return functions[0];
}

/** The logical id a GetAtt-valued property points at. */
function getAttTarget(value: unknown): string {
  return (value as { 'Fn::GetAtt': string[] })['Fn::GetAtt'][0];
}

function connectorRoleLogicalId(fn: ConnectorFunction): string {
  return getAttTarget(fn.properties.Role);
}

/** The managed policies granting bedrock:Retrieve, keyed by logical id. */
function retrievePolicies(t: Template): { [logicalId: string]: { [key: string]: unknown } } {
  return t.findResources('AWS::IAM::ManagedPolicy', {
    Properties: { PolicyDocument: { Statement: Match.arrayWith([Match.objectLike({ Action: 'bedrock:Retrieve' })]) } },
  });
}

describe('BedrockBuilderL3Construct knowledgeBase gateway targets', () => {
  describe('target conversion', () => {
    test('registers a Lambda target exposing only the Retrieve tool', () => {
      const t = template({ gatewayTargets: kbTarget({}) });
      const { logicalId } = connectorFunction(t);

      t.resourceCountIs('AWS::BedrockAgentCore::GatewayTarget', 1);
      t.hasResourceProperties('AWS::BedrockAgentCore::GatewayTarget', {
        Description: 'Customer support knowledge base',
        TargetConfiguration: {
          Mcp: {
            Lambda: {
              LambdaArn: { 'Fn::GetAtt': [logicalId, 'Arn'] },
              ToolSchema: {
                InlinePayload: [
                  {
                    Name: 'Retrieve',
                    Description: TOOL_DESCRIPTION,
                    InputSchema: {
                      Type: 'object',
                      Properties: {
                        retrievalQuery: {
                          Type: 'object',
                          Description: 'Contains the query to send to the knowledge base.',
                          Properties: {
                            text: { Type: 'string', Description: 'The text of the query made to the knowledge base.' },
                          },
                          Required: ['text'],
                        },
                      },
                      Required: ['retrievalQuery'],
                    },
                    OutputSchema: Match.absent(),
                  },
                ],
              },
            },
          },
        },
        CredentialProviderConfigurations: [{ CredentialProviderType: 'GATEWAY_IAM_ROLE' }],
      });
    });

    test('grants the gateway role invoke on the connector function', () => {
      const t = template({ gatewayTargets: kbTarget({}) });
      const { logicalId } = connectorFunction(t);

      t.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: [
            Match.objectLike({ Action: 'lambda:InvokeFunction', Resource: { 'Fn::GetAtt': [logicalId, 'Arn'] } }),
          ],
        },
      });
    });

    test('deploys the connector with the knowledge base environment, encrypted with the module CMK', () => {
      const t = template({
        gatewayTargets: kbTarget({ numberOfResults: 5, overrideSearchType: GatewayKnowledgeBaseSearchType.HYBRID }),
      });
      const kbLogicalId = knowledgeBaseLogicalId(t, 'support-docs');
      const cmkLogicalId = logicalIdOf(t, 'AWS::KMS::Key', {});

      t.hasResourceProperties('AWS::Lambda::Function', {
        Handler: CONNECTOR_HANDLER,
        Runtime: 'python3.14',
        Timeout: 30,
        MemorySize: 256,
        KmsKeyArn: { 'Fn::GetAtt': [cmkLogicalId, 'Arn'] },
        Environment: {
          Variables: {
            KNOWLEDGE_BASE_ID: { 'Fn::GetAtt': [kbLogicalId, 'KnowledgeBaseId'] },
            NUMBER_OF_RESULTS: '5',
            SEARCH_TYPE: 'HYBRID',
          },
        },
      });
      const deadLetterConfig = connectorFunction(t).properties.DeadLetterConfig as { TargetArn: unknown };
      expect(t.toJSON().Resources[getAttTarget(deadLetterConfig.TargetArn)]).toMatchObject({
        Type: 'AWS::SQS::Queue',
        Properties: { KmsMasterKeyId: { 'Fn::GetAtt': [cmkLogicalId, 'Arn'] } },
      });
    });

    test('leaves unset retrieval settings out of the connector environment', () => {
      const { properties } = connectorFunction(template({ gatewayTargets: kbTarget({}) }));
      const variables = (properties.Environment as { Variables: { [name: string]: unknown } }).Variables;

      expect(Object.keys(variables).sort()).toEqual(['KNOWLEDGE_BASE_ID', 'USER_AGENT_STRING']);
    });

    test('creates one connector per knowledgeBase target, each scoped to its own knowledge base', () => {
      const t = template({
        gatewayTargets: {
          ...kbTarget({}),
          'product-kb': {
            targetConfiguration: { knowledgeBase: { id: 'config:product-docs', description: 'Product docs.' } },
          },
        },
      });

      t.resourceCountIs('AWS::BedrockAgentCore::GatewayTarget', 2);
      const functions = connectorFunctions(t);
      expect(functions).toHaveLength(2);
      expect(Object.keys(retrievePolicies(t))).toHaveLength(2);
      functions.forEach(fn => {
        // Each connector's own role holds the Retrieve grant for the knowledge base that connector queries.
        const variables = (fn.properties.Environment as { Variables: { KNOWLEDGE_BASE_ID: unknown } }).Variables;
        const kbLogicalId = getAttTarget(variables.KNOWLEDGE_BASE_ID);
        t.hasResourceProperties('AWS::IAM::ManagedPolicy', {
          Roles: [{ Ref: connectorRoleLogicalId(fn) }],
          PolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Action: 'bedrock:Retrieve',
                Resource: { 'Fn::GetAtt': [kbLogicalId, 'KnowledgeBaseArn'] },
              }),
            ]),
          },
        });
      });
    });

    test('keeps each target in its own construct scope, so target names cannot collide', () => {
      const knowledgeBase = { id: 'config:support-docs', description: TOOL_DESCRIPTION };
      const t = template({
        gatewayTargets: {
          docs: { targetConfiguration: { knowledgeBase } },
          'retrieve-docs': { targetConfiguration: { knowledgeBase } },
          'role-docs': { targetConfiguration: { knowledgeBase } },
          'policy-docs': { targetConfiguration: { knowledgeBase } },
        },
      });

      expect(connectorFunctions(t)).toHaveLength(4);
    });

    test('creates no connector resources without a knowledgeBase target', () => {
      const t = template({
        gatewayTargets: {
          weather: {
            targetConfiguration: {
              lambda: {
                lambdaArn: 'arn:test-partition:lambda:test-region:111111111111:function:weather',
                toolSchema: {
                  inlinePayload: [{ name: 'getWeather', description: 'Weather', inputSchema: { type: 'object' } }],
                },
              },
            },
          },
        },
      });

      expect(t.findResources('AWS::Lambda::Function', { Properties: { Handler: CONNECTOR_HANDLER } })).toEqual({});
      expect(JSON.stringify(t.toJSON())).not.toContain('bedrock:Retrieve');
    });

    test('creates no connector for a knowledgeBase target no gateway references', () => {
      const t = template({ gatewayTargets: kbTarget({}), targets: [] });

      expect(t.findResources('AWS::Lambda::Function', { Properties: { Handler: CONNECTOR_HANDLER } })).toEqual({});
    });
  });

  describe('connector execution role', () => {
    test('grants bedrock:Retrieve on exactly the knowledge base and writes to exactly its log group', () => {
      const t = template({ gatewayTargets: kbTarget({}) });
      const fn = connectorFunction(t);
      const logGroupLogicalId = logicalIdOf(t, 'AWS::Logs::LogGroup', {
        LogGroupName: `/aws/lambda/${fn.properties.FunctionName}`,
      });

      expect(Object.keys(retrievePolicies(t))).toHaveLength(1);
      t.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        Roles: [{ Ref: connectorRoleLogicalId(fn) }],
        PolicyDocument: {
          Statement: [
            {
              Sid: 'RetrieveFromKnowledgeBase',
              Effect: 'Allow',
              Action: 'bedrock:Retrieve',
              Resource: { 'Fn::GetAtt': [knowledgeBaseLogicalId(t, 'support-docs'), 'KnowledgeBaseArn'] },
            },
            {
              Sid: 'WriteConnectorLogs',
              Effect: 'Allow',
              Action: ['logs:CreateLogStream', 'logs:PutLogEvents'],
              Resource: { 'Fn::GetAtt': [logGroupLogicalId, 'Arn'] },
            },
          ],
        },
      });
    });

    test('is a Lambda role, separate from the knowledge base role, with no inline policy or KMS permissions', () => {
      const t = template({ gatewayTargets: kbTarget({}) });
      const roleLogicalId = connectorRoleLogicalId(connectorFunction(t));
      const role = t.toJSON().Resources[roleLogicalId];

      expect(role.Type).toBe('AWS::IAM::Role');
      expect(JSON.stringify(role.Properties.AssumeRolePolicyDocument)).toContain('lambda.amazonaws.com');
      expect(role.Properties.Policies).toBeUndefined();
      expect(t.findResources('AWS::IAM::Policy', { Properties: { Roles: [{ Ref: roleLogicalId }] } })).toEqual({});
      const policiesOnRole = Object.values(t.toJSON().Resources as { [id: string]: { Properties?: object } }).filter(
        resource => JSON.stringify(resource.Properties ?? {}).includes(`"Ref":"${roleLogicalId}"`),
      );
      expect(JSON.stringify(policiesOnRole)).not.toContain('kms:');
      expect(JSON.stringify(policiesOnRole)).not.toContain('logs:CreateLogGroup');
    });
  });

  describe('connector log group', () => {
    test('creates the function log group, encrypted with the module CMK and retained', () => {
      const t = template({ gatewayTargets: kbTarget({}) });
      const fn = connectorFunction(t);
      const cmkLogicalId = logicalIdOf(t, 'AWS::KMS::Key', {});

      t.hasResource('AWS::Logs::LogGroup', {
        Properties: {
          LogGroupName: `/aws/lambda/${fn.properties.FunctionName}`,
          KmsKeyId: { 'Fn::GetAtt': [cmkLogicalId, 'Arn'] },
          RetentionInDays: Match.absent(),
        },
        DeletionPolicy: 'Retain',
        UpdateReplacePolicy: 'Retain',
      });
    });

    test('orders the function after its log group and its policy', () => {
      const t = template({ gatewayTargets: kbTarget({}) });
      const fn = connectorFunction(t);
      const logGroupLogicalId = logicalIdOf(t, 'AWS::Logs::LogGroup', {
        LogGroupName: `/aws/lambda/${fn.properties.FunctionName}`,
      });
      const [policyLogicalId] = Object.keys(retrievePolicies(t));

      expect(fn.dependsOn).toEqual(expect.arrayContaining([logGroupLogicalId, policyLogicalId]));
    });
  });

  describe('connector VPC placement', () => {
    const VPC = 'vpc-0123456789abcdef0';
    const SUBNETS = ['subnet-0123456789abcdef0', 'subnet-0123456789abcdef1'];
    const ENDPOINT_SERVICE = /bedrock-agent-runtime$/;

    /** A set used only by connectors: no image-layer configuration, since no harness pulls images. */
    function connectorSet(overrides: Partial<NamedVpcEndpointSetProps[string]> = {}): NamedVpcEndpointSetProps {
      return { 'kb-private': { vpcId: VPC, subnetIds: ['subnet-0eeeeeeeeeeeeeee0'], ...overrides } };
    }

    function network(overrides: Partial<GatewayKnowledgeBaseNetworkProperty> = {}) {
      return { networkConfiguration: { subnets: SUBNETS, vpcEndpoints: 'kb-private', ...overrides } };
    }

    function connectorPolicy(t: Template): { [key: string]: unknown } {
      const policies = Object.values(retrievePolicies(t));
      expect(policies).toHaveLength(1);
      return policies[0];
    }

    function agentRuntimeEndpoints(t: Template): { [logicalId: string]: { Properties: { [key: string]: unknown } } } {
      return t.findResources('AWS::EC2::VPCEndpoint', {
        Properties: { ServiceName: Match.stringLikeRegexp(ENDPOINT_SERVICE.source) },
      }) as { [logicalId: string]: { Properties: { [key: string]: unknown } } };
    }

    function securityGroupIdOf(fn: ConnectorFunction): unknown {
      const vpcConfig = fn.properties.VpcConfig as { SecurityGroupIds: unknown[] };
      expect(vpcConfig.SecurityGroupIds).toHaveLength(1);
      return vpcConfig.SecurityGroupIds[0];
    }

    test('runs the connector outside a VPC, with no network interface grants, by default', () => {
      const t = template({ gatewayTargets: kbTarget({}) });

      expect(connectorFunction(t).properties.VpcConfig).toBeUndefined();
      expect(JSON.stringify(connectorPolicy(t))).not.toContain('ec2:');
    });

    test('creates the Bedrock Agent Runtime endpoint, allowing only Retrieve on the knowledge base', () => {
      const t = template({ gatewayTargets: kbTarget(network()), vpcEndpoints: connectorSet() });
      const endpoints = Object.values(agentRuntimeEndpoints(t));

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].Properties).toMatchObject({ VpcId: VPC, PrivateDnsEnabled: true });
      expect(endpoints[0].Properties.PolicyDocument).toMatchObject({
        Statement: [
          {
            Effect: 'Allow',
            Action: 'bedrock:Retrieve',
            Resource: { 'Fn::GetAtt': [knowledgeBaseLogicalId(t, 'support-docs'), 'KnowledgeBaseArn'] },
          },
        ],
      });
      // A set only connectors reference creates no image-layer gateway endpoint.
      t.resourcePropertiesCountIs('AWS::EC2::VPCEndpoint', { VpcEndpointType: 'Gateway' }, 0);
    });

    test('places the connector in the set VPC behind a client security group wired to the endpoint', () => {
      const t = template({ gatewayTargets: kbTarget(network()), vpcEndpoints: connectorSet() });
      const fn = connectorFunction(t);
      const clientGroupLogicalId = getAttTarget(securityGroupIdOf(fn));
      const [endpointLogicalId] = Object.keys(agentRuntimeEndpoints(t));
      const endpointGroup = (
        t.toJSON().Resources[endpointLogicalId].Properties.SecurityGroupIds as { 'Fn::GetAtt': string[] }[]
      )[0];

      expect((fn.properties.VpcConfig as { SubnetIds: string[] }).SubnetIds).toEqual(SUBNETS);
      expect(t.toJSON().Resources[clientGroupLogicalId]).toMatchObject({
        Type: 'AWS::EC2::SecurityGroup',
        Properties: {
          VpcId: VPC,
          GroupName: 'test-org-test-env-test-domain-test-module-kb-connector-vpce-client-support-kb',
          // CDK's placeholder rule for a group that allows no outbound traffic of its own.
          SecurityGroupEgress: [
            { CidrIp: '255.255.255.255/32', Description: 'Disallow all traffic', IpProtocol: 'icmp' },
          ],
        },
      });
      expect(
        Object.keys(
          t.findResources('AWS::EC2::SecurityGroupEgress', {
            Properties: { GroupId: { 'Fn::GetAtt': [clientGroupLogicalId, 'GroupId'] } },
          }),
        ),
      ).toHaveLength(1);
      t.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
        GroupId: { 'Fn::GetAtt': [clientGroupLogicalId, 'GroupId'] },
        DestinationSecurityGroupId: endpointGroup,
        IpProtocol: 'tcp',
        FromPort: 443,
        ToPort: 443,
      });
      t.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        GroupId: endpointGroup,
        SourceSecurityGroupId: { 'Fn::GetAtt': [clientGroupLogicalId, 'GroupId'] },
        IpProtocol: 'tcp',
        FromPort: 443,
        ToPort: 443,
        Description: 'HTTPS from knowledge base connector endpoint client to bedrock-agent-runtime',
      });
    });

    test('wires the connector to a brought endpoint without creating one', () => {
      const t = template({
        gatewayTargets: kbTarget(network()),
        vpcEndpoints: connectorSet({ bedrockAgentRuntime: { securityGroupId: 'sg-0ccccccccccccccc0' } }),
      });
      const clientGroupLogicalId = getAttTarget(securityGroupIdOf(connectorFunction(t)));

      expect(agentRuntimeEndpoints(t)).toEqual({});
      t.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
        GroupId: { 'Fn::GetAtt': [clientGroupLogicalId, 'GroupId'] },
        DestinationSecurityGroupId: 'sg-0ccccccccccccccc0',
      });
      t.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        GroupId: 'sg-0ccccccccccccccc0',
        SourceSecurityGroupId: { 'Fn::GetAtt': [clientGroupLogicalId, 'GroupId'] },
      });
    });

    test('uses the brought security group when the set marks the endpoint external', () => {
      const t = template({
        gatewayTargets: kbTarget(network({ securityGroupId: 'sg-0aaaaaaaaaaaaaaa0' })),
        vpcEndpoints: connectorSet({ bedrockAgentRuntime: { external: true } }),
      });

      expect(connectorFunction(t).properties.VpcConfig).toEqual({
        SubnetIds: SUBNETS,
        SecurityGroupIds: ['sg-0aaaaaaaaaaaaaaa0'],
      });
      t.resourceCountIs('AWS::EC2::VPCEndpoint', 0);
      t.resourceCountIs('AWS::EC2::SecurityGroupEgress', 0);
    });

    test('scopes one endpoint to every knowledge base the set connectors query', () => {
      const t = template({
        gatewayTargets: {
          ...kbTarget(network()),
          'product-kb': {
            targetConfiguration: {
              knowledgeBase: { id: 'config:product-docs', description: 'Product docs.', ...network() },
            },
          },
        },
        vpcEndpoints: connectorSet(),
      });
      const endpoints = Object.values(agentRuntimeEndpoints(t));

      expect(endpoints).toHaveLength(1);
      expect(endpoints[0].Properties.PolicyDocument).toMatchObject({
        Statement: [
          {
            Action: 'bedrock:Retrieve',
            Resource: [
              { 'Fn::GetAtt': [knowledgeBaseLogicalId(t, 'support-docs'), 'KnowledgeBaseArn'] },
              { 'Fn::GetAtt': [knowledgeBaseLogicalId(t, 'product-docs'), 'KnowledgeBaseArn'] },
            ],
          },
        ],
      });
      // One client security group per connector.
      expect(new Set(connectorFunctions(t).map(fn => JSON.stringify(securityGroupIdOf(fn)))).size).toBe(2);
    });

    test('shares one set with a harness in the same VPC', () => {
      const t = template({
        gatewayTargets: kbTarget(network()),
        vpcEndpoints: connectorSet({ routeTableIds: ['rtb-0123456789abcdef0'] }),
        harnesses: {
          'support-harness': {
            modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
            systemPrompt: 'Be helpful.',
            networkConfiguration: {
              securityGroups: ['sg-0123456789abcdef0'],
              subnets: SUBNETS,
              vpcEndpoints: 'kb-private',
            },
          },
        },
      });

      expect(Object.keys(agentRuntimeEndpoints(t))).toHaveLength(1);
      // bedrock-runtime, ecr.api, ecr.dkr, sts, logs for the harness; bedrock-agent-runtime for the connector.
      t.resourcePropertiesCountIs('AWS::EC2::VPCEndpoint', { VpcEndpointType: 'Interface' }, 6);
      t.resourcePropertiesCountIs('AWS::EC2::VPCEndpoint', { VpcEndpointType: 'Gateway' }, 1);
    });

    test('grants the network interface actions and denies them to the function code', () => {
      const t = template({ gatewayTargets: kbTarget(network()), vpcEndpoints: connectorSet() });
      const fn = connectorFunction(t);
      const eniActions = [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DescribeSubnets',
        'ec2:DeleteNetworkInterface',
        'ec2:AssignPrivateIpAddresses',
        'ec2:UnassignPrivateIpAddresses',
      ];

      t.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        Roles: [{ Ref: connectorRoleLogicalId(fn) }],
        PolicyDocument: {
          Statement: Match.arrayWith([
            { Sid: 'ManageVpcNetworkInterfaces', Effect: 'Allow', Action: eniActions, Resource: '*' },
            {
              Sid: 'DenyNetworkInterfaceCallsFromFunctionCode',
              Effect: 'Deny',
              Action: [...eniActions, 'ec2:DetachNetworkInterface'],
              Resource: '*',
              Condition: {
                ArnEquals: {
                  'lambda:SourceFunctionArn': `arn:test-partition:lambda:test-region:test-account:function:${fn.properties.FunctionName}`,
                },
              },
            },
          ]),
        },
      });
      // Lambda checks the network interface grants when it creates the function.
      expect(fn.dependsOn).toEqual(expect.arrayContaining(Object.keys(retrievePolicies(t))));
    });

    test('accepts a null securityGroupId as absent', () => {
      expect(
        build({
          gatewayTargets: kbTarget(network({ securityGroupId: null as unknown as string })),
          vpcEndpoints: connectorSet(),
        }),
      ).not.toThrow();
    });

    test.each([
      ['no subnets', { gatewayTargets: kbTarget(network({ subnets: [] })) }, 'subnets must list 1 to 16 subnets'],
      [
        'omitted subnets',
        { gatewayTargets: kbTarget(network({ subnets: undefined })) },
        'subnets must list 1 to 16 subnets',
      ],
      [
        '17 subnets',
        { gatewayTargets: kbTarget(network({ subnets: Array.from({ length: 17 }, (_, n) => `subnet-${n}`) })) },
        'subnets must list 1 to 16 subnets',
      ],
      [
        'no set name',
        { gatewayTargets: kbTarget(network({ vpcEndpoints: ' ' })) },
        `vpcEndpoints must name a set in the module's "vpcEndpoints" map`,
      ],
      [
        'a null set name',
        { gatewayTargets: kbTarget(network({ vpcEndpoints: null as unknown as string })) },
        `vpcEndpoints must name a set in the module's "vpcEndpoints" map`,
      ],
      [
        'an empty securityGroupId',
        { gatewayTargets: kbTarget(network({ securityGroupId: '' })) },
        'securityGroupId must not be empty',
      ],
      [
        'a blank securityGroupId',
        { gatewayTargets: kbTarget(network({ securityGroupId: '  ' })) },
        'securityGroupId must not be empty',
      ],
      [
        'an undeclared set',
        { gatewayTargets: kbTarget(network({ vpcEndpoints: 'missing' })) },
        'Gateway target "support-kb" knowledgeBase references VPC endpoint set "missing", which is not defined',
      ],
      [
        'a set reference in a module with no vpcEndpoints map',
        { gatewayTargets: kbTarget(network()), vpcEndpoints: undefined },
        /references VPC endpoint set "kb-private", which is not defined in vpcEndpoints\. Define it under vpcEndpoints, or correct the reference\.$/,
      ],
      [
        'a harness endpoint on a set only connectors reference',
        { gatewayTargets: kbTarget(network()), vpcEndpoints: connectorSet({ bedrockRuntime: { external: true } }) },
        /configures "bedrockRuntime", but nothing referencing it requires the "bedrock-runtime" endpoint, so it would serve nothing\. Remove it\.$/,
      ],
      [
        'a securityGroupId for an endpoint the set provides',
        { gatewayTargets: kbTarget(network({ securityGroupId: 'sg-0aaaaaaaaaaaaaaa0' })) },
        'sets "securityGroupId", but VPC endpoint set "kb-private" provides the bedrockAgentRuntime endpoint',
      ],
      [
        'no securityGroupId for an external endpoint',
        {
          gatewayTargets: kbTarget(network()),
          vpcEndpoints: connectorSet({ bedrockAgentRuntime: { external: true } }),
        },
        'must set "securityGroupId": VPC endpoint set "kb-private" marks "bedrockAgentRuntime" external',
      ],
      [
        'image-layer route tables on a set no harness references',
        { gatewayTargets: kbTarget(network()), vpcEndpoints: connectorSet({ routeTableIds: ['rtb-0a'] }) },
        'configures container image-layer access ("routeTableIds" or "s3ImageLayers"), but no harness references it',
      ],
      [
        'an external image-layer marker on a set no harness references',
        {
          gatewayTargets: kbTarget(network()),
          vpcEndpoints: connectorSet({ s3ImageLayers: { external: true } }),
        },
        'but no harness references it, and only harnesses pull container images',
      ],
      [
        'a set referenced only by a target no gateway registers',
        { gatewayTargets: kbTarget(network()), targets: [] },
        'VPC endpoint set "kb-private" is referenced by no harness or knowledge base connector',
      ],
    ])('rejects %s', (_case, buildProps, message) => {
      expect(build({ vpcEndpoints: connectorSet(), ...buildProps })).toThrow(message);
    });

    test('rejects a bedrockAgentRuntime endpoint no connector requires', () => {
      expect(
        build({
          gatewayTargets: kbTarget({}),
          vpcEndpoints: connectorSet({ routeTableIds: ['rtb-0a'], bedrockAgentRuntime: { external: true } }),
          harnesses: {
            'support-harness': {
              modelId: 'anthropic.claude-sonnet-4-6-20250514-v1:0',
              systemPrompt: 'Be helpful.',
              networkConfiguration: { securityGroups: ['sg-0a'], subnets: SUBNETS, vpcEndpoints: 'kb-private' },
            },
          },
        }),
      ).toThrow(
        'configures "bedrockAgentRuntime", but nothing referencing it requires the "bedrock-agent-runtime" ' +
          'endpoint, so it would serve nothing. Remove it, or reference this set from the ' +
          '"networkConfiguration.vpcEndpoints" of a knowledgeBase gateway target a gateway registers.',
      );
    });
  });

  describe('knowledge base references', () => {
    test('resolves a literal id to a knowledge base ARN in the module account and region', () => {
      const t = template({ gatewayTargets: kbTarget({ id: 'ABCDE12345' }) });

      t.hasResourceProperties('AWS::Lambda::Function', {
        Handler: CONNECTOR_HANDLER,
        Environment: { Variables: { KNOWLEDGE_BASE_ID: 'ABCDE12345' } },
      });
      t.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'bedrock:Retrieve',
              Resource: 'arn:test-partition:bedrock:test-region:test-account:knowledge-base/ABCDE12345',
            }),
          ]),
        },
      });
    });

    test('accepts an ssm: reference, which reaches the construct as a token', () => {
      const ssmToken = Token.asString({ Ref: 'SsmParameterValueKnowledgeBaseId' });
      const t = template({ gatewayTargets: kbTarget({ id: ssmToken }) });

      t.hasResourceProperties('AWS::Lambda::Function', {
        Handler: CONNECTOR_HANDLER,
        Environment: { Variables: { KNOWLEDGE_BASE_ID: { Ref: 'SsmParameterValueKnowledgeBaseId' } } },
      });
      t.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'bedrock:Retrieve',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    'arn:test-partition:bedrock:test-region:test-account:knowledge-base/',
                    { Ref: 'SsmParameterValueKnowledgeBaseId' },
                  ],
                ],
              },
            }),
          ]),
        },
      });
    });

    test('accepts a CloudFormation dynamic reference', () => {
      const ssmRef = '{{resolve:ssm:/test-org/shared/bedrock-builder/knowledge-base/support/id}}';
      const t = template({ gatewayTargets: kbTarget({ id: ssmRef }) });

      t.hasResourceProperties('AWS::Lambda::Function', {
        Handler: CONNECTOR_HANDLER,
        Environment: { Variables: { KNOWLEDGE_BASE_ID: ssmRef } },
      });
      t.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'bedrock:Retrieve',
              Resource: `arn:test-partition:bedrock:test-region:test-account:knowledge-base/${ssmRef}`,
            }),
          ]),
        },
      });
    });
  });

  describe('synth validation', () => {
    test.each([
      [
        'combined with another target type',
        {
          'support-kb': {
            targetConfiguration: {
              knowledgeBase: { id: 'config:support-docs', description: TOOL_DESCRIPTION },
              lambda: {
                lambdaArn: 'arn:test-partition:lambda:test-region:111111111111:function:weather',
                toolSchema: { inlinePayload: [{ name: 'x', description: 'x', inputSchema: { type: 'object' } }] },
              },
            },
          },
        },
        'sets knowledgeBase together with lambda',
      ],
      [
        'an unknown config: name',
        kbTarget({ id: 'config:missing' }),
        'references unknown knowledge base from config: "missing"',
      ],
      [
        'a knowledge base ARN',
        kbTarget({ id: 'arn:test-partition:bedrock:test-region:test-account:knowledge-base/ABCDE12345' }),
        'must be a 10-character alphanumeric knowledge base id',
      ],
      [
        'a knowledge base name',
        kbTarget({ id: 'support-docs' }),
        'must be a 10-character alphanumeric knowledge base id',
      ],
      ['a 9-character id', kbTarget({ id: 'ABCDE1234' }), 'must be a 10-character alphanumeric knowledge base id'],
      ['an 11-character id', kbTarget({ id: 'ABCDE123456' }), 'must be a 10-character alphanumeric knowledge base id'],
      ['an empty id', kbTarget({ id: '' }), 'knowledgeBase must set an id'],
      ['numberOfResults below 1', kbTarget({ numberOfResults: 0 }), 'must be an integer from 1 to 100; received 0'],
      [
        'numberOfResults above 100',
        kbTarget({ numberOfResults: 101 }),
        'must be an integer from 1 to 100; received 101',
      ],
      ['a fractional numberOfResults', kbTarget({ numberOfResults: 2.5 }), 'must be an integer from 1 to 100'],
      [
        'an unsupported overrideSearchType',
        kbTarget({ overrideSearchType: 'KEYWORD' as GatewayKnowledgeBaseSearchType }),
        'must be one of HYBRID, SEMANTIC; received "KEYWORD"',
      ],
      ['an empty description', kbTarget({ description: '' }), 'must set a non-empty description'],
      ['a blank description', kbTarget({ description: '   ' }), 'must set a non-empty description'],
    ])('rejects %s', (_case, gatewayTargets, message) => {
      expect(build({ gatewayTargets })).toThrow(message);
    });

    test('rejects an unsupported credential provider on a knowledgeBase target', () => {
      const gatewayTargets: NamedGatewayTargetProps = {
        'support-kb': {
          ...kbTarget({})['support-kb'],
          credentialProvider: { type: GatewayTargetCredentialProviderType.OAUTH },
        },
      };

      expect(build({ gatewayTargets })).toThrow('which is not yet supported');
    });

    test.each([
      ['numberOfResults 1', { numberOfResults: 1 }],
      ['numberOfResults 100', { numberOfResults: 100 }],
      ['overrideSearchType SEMANTIC', { overrideSearchType: GatewayKnowledgeBaseSearchType.SEMANTIC }],
    ])('accepts %s', (_case, knowledgeBase) => {
      expect(build({ gatewayTargets: kbTarget(knowledgeBase) })).not.toThrow();
    });

    test('accepts the placeholder an SSM lookup returns before its value is in context', () => {
      expect(
        build({ gatewayTargets: kbTarget({ id: 'dummy-value-for-/shared-kb/knowledgebase/kb-runbooks/id' }) }),
      ).not.toThrow();
    });

    test('names the target in the error', () => {
      expect(build({ gatewayTargets: kbTarget({ numberOfResults: 0 }) })).toThrow('Gateway target "support-kb"');
    });

    test('rejects a connector function name already defined in lambdaFunctions', () => {
      const lambdaFunctions: LambdaFunctionProps = {
        functions: [
          {
            functionName: 'kb-connector-support-kb',
            srcDir: './test/lambda/test',
            handler: 'test_handler',
            roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
            runtime: 'python3.14',
          },
        ],
      };

      expect(build({ gatewayTargets: kbTarget({}), lambdaFunctions })).toThrow(
        'generates connector function "kb-connector-support-kb", which is already defined in lambdaFunctions',
      );
    });
  });
});

describe('gateway knowledge base helpers', () => {
  test('isUnresolvedAtSynth recognizes tokens, dynamic references and the SSM lookup placeholder', () => {
    expect(isUnresolvedAtSynth(Token.asString({ Ref: 'KnowledgeBaseId' }))).toBe(true);
    expect(isUnresolvedAtSynth('{{resolve:ssm:/kb/id}}')).toBe(true);
    expect(isUnresolvedAtSynth('dummy-value-for-/shared-kb/knowledgebase/kb-runbooks/id')).toBe(true);
    expect(isUnresolvedAtSynth('ABCDE12345')).toBe(false);
  });

  test('buildKnowledgeBaseConnectorEnvironment sets only the configured retrieval settings', () => {
    expect(buildKnowledgeBaseConnectorEnvironment('ABCDE12345', { id: 'x', description: 'x' })).toEqual({
      KNOWLEDGE_BASE_ID: 'ABCDE12345',
    });
    expect(
      buildKnowledgeBaseConnectorEnvironment('ABCDE12345', {
        id: 'x',
        description: 'x',
        numberOfResults: 3,
        overrideSearchType: GatewayKnowledgeBaseSearchType.SEMANTIC,
      }),
    ).toEqual({ KNOWLEDGE_BASE_ID: 'ABCDE12345', NUMBER_OF_RESULTS: '3', SEARCH_TYPE: 'SEMANTIC' });
  });

  test('validateKnowledgeBaseTarget rejects a target without a knowledgeBase tool source', () => {
    expect(() => validateKnowledgeBaseTarget('weather', { targetConfiguration: {} })).toThrow(
      'Gateway target "weather" must define a knowledgeBase tool source.',
    );
  });

  test('validateKnowledgeBaseTarget accepts a token id without checking its format', () => {
    const id = Token.asString({ Ref: 'KnowledgeBaseId' });
    const knowledgeBase = { id, description: TOOL_DESCRIPTION };

    expect(validateKnowledgeBaseTarget('support-kb', { targetConfiguration: { knowledgeBase } })).toBe(knowledgeBase);
  });
});

describe('VPC endpoint set demand from knowledge base connectors', () => {
  const SETS = { 'kb-private': { vpcId: 'vpc-0123456789abcdef0', subnetIds: ['subnet-0a'] } };
  const KB_A = 'arn:test-partition:bedrock:test-region:test-account:knowledge-base/AAAAAAAAAA';
  const KB_B = 'arn:test-partition:bedrock:test-region:test-account:knowledge-base/BBBBBBBBBB';

  function connector(targetName: string, knowledgeBaseArn: string): VpcEndpointSetConsumer {
    return knowledgeBaseConnectorVpcEndpointConsumer({ targetName, setName: 'kb-private', knowledgeBaseArn });
  }

  /** A consumer requiring the connector endpoint without scoping its resources. */
  const UNSCOPED: VpcEndpointSetConsumer = {
    label: 'Unscoped consumer',
    setName: 'kb-private',
    interfaces: [{ service: KNOWLEDGE_BASE_CONNECTOR_ENDPOINT_SERVICE, policyActions: ['bedrock:Retrieve'] }],
  };

  function policyResources(consumers: VpcEndpointSetConsumer[]): string[] | undefined {
    const [set] = reconcileVpcEndpointSets(SETS, consumers);
    expect(set.interfaces).toHaveLength(1);
    return set.interfaces[0].policy?.statements[0].resources;
  }

  test('scopes the endpoint to each knowledge base once', () => {
    expect(policyResources([connector('a', KB_A), connector('b', KB_B), connector('c', KB_A)])).toEqual([KB_A, KB_B]);
  });

  test.each([
    ['after', () => [connector('a', KB_A), UNSCOPED]],
    ['before', () => [UNSCOPED, connector('a', KB_A)]],
  ])('opens the endpoint to all resources when an unscoped requirement comes %s a scoped one', (_order, consumers) => {
    expect(policyResources(consumers())).toEqual(['*']);
  });
});

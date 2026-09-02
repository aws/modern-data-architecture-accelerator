/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { createAgentCoreVpcEndpoint } from '../lib/vpc-endpoint';

const TEST_VPC_ID = 'vpc-0123456789abcdef0';
const TEST_SUBNET_IDS = ['subnet-12345678', 'subnet-87654321'];
const TEST_APP_SG_IDS = ['sg-12345678'];

describe('createAgentCoreVpcEndpoint', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('should create AgentCore interface endpoint with Private DNS in configured subnets', () => {
    createAgentCoreVpcEndpoint(testApp.testStack, 'TestVpce', {
      vpcId: TEST_VPC_ID,
      subnetIds: TEST_SUBNET_IDS,
      ingressSecurityGroupIds: TEST_APP_SG_IDS,
      vpcEndpointConfig: {},
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 1);
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      ServiceName: 'com.amazonaws.test-region.bedrock-agentcore',
      VpcEndpointType: 'Interface',
      PrivateDnsEnabled: true,
      SubnetIds: TEST_SUBNET_IDS,
    });
  });

  test('should default endpoint policy to StarPrincipal with AgentCore invoke actions', () => {
    createAgentCoreVpcEndpoint(testApp.testStack, 'TestVpce', {
      vpcId: TEST_VPC_ID,
      subnetIds: TEST_SUBNET_IDS,
      ingressSecurityGroupIds: TEST_APP_SG_IDS,
      vpcEndpointConfig: {},
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      PolicyDocument: Match.objectLike({
        Statement: [
          Match.objectLike({
            Sid: 'AgentCoreInvokeThroughEndpoint',
            Effect: 'Allow',
            Principal: '*',
            Action: 'bedrock-agentcore:InvokeAgentRuntime*',
            Resource: '*',
          }),
        ],
      }),
    });
  });

  test('should restrict endpoint policy to configured IAM principals', () => {
    const callerRoleArn = 'arn:aws:iam::123456789012:role/my-caller-role';
    createAgentCoreVpcEndpoint(testApp.testStack, 'TestVpce', {
      vpcId: TEST_VPC_ID,
      subnetIds: TEST_SUBNET_IDS,
      ingressSecurityGroupIds: TEST_APP_SG_IDS,
      vpcEndpointConfig: {
        endpointPolicy: {
          allowPrincipals: [callerRoleArn],
        },
      },
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    // Restricting principals must not broaden the action or resource scope
    template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
      PolicyDocument: Match.objectLike({
        Statement: [
          Match.objectLike({
            Effect: 'Allow',
            Principal: {
              AWS: callerRoleArn,
            },
            Action: 'bedrock-agentcore:InvokeAgentRuntime*',
            Resource: '*',
          }),
        ],
      }),
    });
  });

  test('should create endpoint security group with HTTPS ingress from application security groups only', () => {
    createAgentCoreVpcEndpoint(testApp.testStack, 'TestVpce', {
      vpcId: TEST_VPC_ID,
      subnetIds: TEST_SUBNET_IDS,
      ingressSecurityGroupIds: TEST_APP_SG_IDS,
      vpcEndpointConfig: {},
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'tcp',
      FromPort: 443,
      ToPort: 443,
      SourceSecurityGroupId: 'sg-12345678',
    });
    // No CIDR-based ingress — access is via application SGs only
    const ingressRules = template.findResources('AWS::EC2::SecurityGroupIngress');
    Object.values(ingressRules).forEach(rule => {
      expect(rule.Properties.CidrIp).toBeUndefined();
    });
    // allowAllOutbound: false — CDK emits only its "Disallow all traffic"
    // 255.255.255.255/32 placeholder, never an allow-all (0.0.0.0/0) egress rule
    const securityGroups = template.findResources('AWS::EC2::SecurityGroup');
    Object.values(securityGroups).forEach(sg => {
      const egress = sg.Properties.SecurityGroupEgress ?? [];
      expect(egress).toHaveLength(1);
      expect(egress[0].CidrIp).toBe('255.255.255.255/32');
      expect(egress.some((rule: { CidrIp?: string }) => rule.CidrIp === '0.0.0.0/0')).toBe(false);
    });
  });

  test('should create supporting endpoints when createSupportingEndpoints is true', () => {
    createAgentCoreVpcEndpoint(testApp.testStack, 'TestVpce', {
      vpcId: TEST_VPC_ID,
      subnetIds: TEST_SUBNET_IDS,
      ingressSecurityGroupIds: TEST_APP_SG_IDS,
      vpcEndpointConfig: { createSupportingEndpoints: true },
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    // AgentCore + ECR API + ECR Docker + STS + CloudWatch Logs
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 5);
    ['ecr.api', 'ecr.dkr', 'sts', 'logs'].forEach(service => {
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: `com.amazonaws.test-region.${service}`,
        VpcEndpointType: 'Interface',
        PrivateDnsEnabled: true,
      });
    });
    // All endpoints share the single app-SG-scoped security group, and open: false
    // means no endpoint adds VPC-CIDR ingress
    template.resourceCountIs('AWS::EC2::SecurityGroup', 1);
    const endpoints = template.findResources('AWS::EC2::VPCEndpoint');
    expect(Object.keys(endpoints)).toHaveLength(5);
    Object.values(endpoints).forEach(endpoint => {
      expect(endpoint.Properties.SecurityGroupIds).toHaveLength(1);
    });
    const ingressRules = template.findResources('AWS::EC2::SecurityGroupIngress');
    Object.values(ingressRules).forEach(rule => {
      expect(rule.Properties.CidrIp).toBeUndefined();
    });
  });

  test('should not create supporting endpoints by default', () => {
    createAgentCoreVpcEndpoint(testApp.testStack, 'TestVpce', {
      vpcId: TEST_VPC_ID,
      subnetIds: TEST_SUBNET_IDS,
      ingressSecurityGroupIds: TEST_APP_SG_IDS,
      vpcEndpointConfig: {},
      naming: testApp.naming,
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 1);
  });

  test('should return endpoint, security group, and supporting endpoints', () => {
    const result = createAgentCoreVpcEndpoint(testApp.testStack, 'TestVpce', {
      vpcId: TEST_VPC_ID,
      subnetIds: TEST_SUBNET_IDS,
      ingressSecurityGroupIds: TEST_APP_SG_IDS,
      vpcEndpointConfig: { createSupportingEndpoints: true },
      naming: testApp.naming,
    });

    expect(result.agentCoreEndpoint).toBeDefined();
    expect(result.securityGroup).toBeDefined();
    expect(result.supportingEndpoints).toHaveLength(4);
  });
});

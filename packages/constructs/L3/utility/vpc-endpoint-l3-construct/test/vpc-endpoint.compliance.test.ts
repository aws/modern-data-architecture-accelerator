/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { GatewayVpcEndpointAwsService, InterfaceVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';
import { VpcEndpointL3Construct, VpcEndpointL3ConstructProps, VpcEndpointPolicyEffect } from '../lib';

describe('VpcEndpointL3Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;
  const vpcId = 'vpc-0123456789abcdef0';
  const props: VpcEndpointL3ConstructProps = {
    naming: testApp.naming,
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    vpcId,
    nameScope: vpcId,
    interfaces: [
      {
        service: InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME,
        name: InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME.shortName,
        subnetIds: ['subnet-0123456789abcdef0', 'subnet-0123456789abcdef1'],
      },
      {
        service: InterfaceVpcEndpointAwsService.BEDROCK_AGENTCORE_GATEWAY,
        name: InterfaceVpcEndpointAwsService.BEDROCK_AGENTCORE_GATEWAY.shortName,
        subnetIds: ['subnet-0123456789abcdef0'],
        policy: {
          statements: [
            {
              sid: 'AgentCoreGatewayInvokeThroughEndpoint',
              effect: VpcEndpointPolicyEffect.ALLOW,
              actions: ['bedrock-agentcore:InvokeGateway'],
            },
          ],
        },
      },
      {
        service: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        name: InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS.shortName,
        subnetIds: ['subnet-0123456789abcdef0'],
        policy: {
          statements: [
            {
              sid: 'AllowLogDelivery',
              effect: VpcEndpointPolicyEffect.ALLOW,
              actions: ['logs:PutLogEvents'],
              principals: ['arn:test-partition:iam::test-account:role/test-role'],
            },
          ],
        },
      },
    ],
    gateways: [
      {
        service: GatewayVpcEndpointAwsService.S3,
        name: 's3-image-layers',
        routeTableIds: ['rtb-0123456789abcdef0'],
        policy: {
          statements: [
            {
              sid: 'AllowEcrImageLayerPull',
              effect: VpcEndpointPolicyEffect.ALLOW,
              actions: ['s3:GetObject'],
              resources: ['arn:test-partition:s3:::prod-test-region-starport-layer-bucket/*'],
            },
          ],
        },
      },
    ],
  };

  new VpcEndpointL3Construct(stack, 'endpoints', props);
  const template = Template.fromStack(stack);

  test('every interface endpoint enables Private DNS', () => {
    // Without Private DNS the default regional hostnames keep resolving to public IPs, so a no-NAT
    // workload silently fails while the stack deploys cleanly.
    const interfaceEndpoints = Object.values(template.findResources('AWS::EC2::VPCEndpoint')).filter(
      endpoint => endpoint.Properties?.VpcEndpointType !== 'Gateway',
    );
    expect(interfaceEndpoints).toHaveLength(3);
    interfaceEndpoints.forEach(endpoint => {
      expect(endpoint.Properties?.PrivateDnsEnabled).toBe(true);
    });
  });

  test('every interface endpoint has its own dedicated security group', () => {
    // One SG per endpoint is what lets each consumer grant itself access to exactly the endpoints it
    // uses, instead of one shared group every workload lands in.
    template.resourceCountIs('AWS::EC2::SecurityGroup', 3);
  });

  test('endpoint security groups start with no ingress', () => {
    // Ingress is the consumer's to add, from its own client SG. An endpoint SG that admitted the VPC
    // CIDR (CDK's `open` default) would expose the endpoint to every instance in the VPC.
    Object.values(template.findResources('AWS::EC2::SecurityGroup')).forEach(group => {
      expect(group.Properties?.SecurityGroupIngress).toBeUndefined();
    });
    template.resourceCountIs('AWS::EC2::SecurityGroupIngress', 0);
  });

  test('endpoint security groups carry no allow-all egress', () => {
    // allowAllOutbound: false - CDK emits only its "Disallow all traffic" 255.255.255.255/32 placeholder.
    // cdk-nag's security-group rules key on ingress, so an allow-all egress would otherwise pass every
    // other check in this file. An endpoint ENI initiates nothing; it only answers.
    Object.values(template.findResources('AWS::EC2::SecurityGroup')).forEach(group => {
      const egress = group.Properties?.SecurityGroupEgress ?? [];
      expect(egress).toHaveLength(1);
      expect(egress[0].CidrIp).toBe('255.255.255.255/32');
      expect(egress.some((rule: { CidrIp?: string }) => rule.CidrIp === '0.0.0.0/0')).toBe(false);
    });
    template.resourceCountIs('AWS::EC2::SecurityGroupEgress', 0);
  });

  test('a gateway endpoint always carries an explicit policy', () => {
    // The AWS default would grant every subnet on the route tables full access to the service, so the
    // config type requires a policy rather than offering an implicit default.
    const gateways = Object.values(template.findResources('AWS::EC2::VPCEndpoint')).filter(
      endpoint => endpoint.Properties?.VpcEndpointType === 'Gateway',
    );
    expect(gateways).toHaveLength(1);
    gateways.forEach(endpoint => {
      expect(endpoint.Properties?.PolicyDocument).toBeDefined();
    });
  });

  test('a configured principal renders in a form IAM accepts', () => {
    // A bare `Principal: ["arn:..."]` array is not a valid IAM policy element, so the endpoint would
    // fail to create with MalformedPolicyDocument.
    const logs = Object.values(template.findResources('AWS::EC2::VPCEndpoint')).find(endpoint =>
      JSON.stringify(endpoint.Properties?.ServiceName).includes('.logs'),
    );
    expect(logs?.Properties?.PolicyDocument).toEqual({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowLogDelivery',
          Effect: 'Allow',
          Principal: { AWS: 'arn:test-partition:iam::test-account:role/test-role' },
          Action: 'logs:PutLogEvents',
          Resource: '*',
        },
      ],
    });
  });

  testApp.checkCdkNagCompliance(stack);
});

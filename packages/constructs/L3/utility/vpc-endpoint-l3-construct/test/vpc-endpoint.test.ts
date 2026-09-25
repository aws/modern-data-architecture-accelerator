/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpointAwsService,
  InterfaceVpcEndpointService,
} from 'aws-cdk-lib/aws-ec2';
import {
  GatewayVpcEndpointProperty,
  InterfaceVpcEndpointProperty,
  VpcEndpointL3Construct,
  VpcEndpointPolicyEffect,
  VpcEndpointPolicyProperty,
} from '../lib';

describe('VpcEndpointL3Construct Unit Tests', () => {
  let testApp: MdaaTestApp;
  let roleHelper: MdaaRoleHelper;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  });

  const VPC_ID = 'vpc-0123456789abcdef0';

  /** An interface endpoint entry, named after its service as the orchestrating module names them. */
  function iface(
    service: InterfaceVpcEndpointAwsService,
    overrides: Partial<InterfaceVpcEndpointProperty> = {},
  ): InterfaceVpcEndpointProperty {
    return { service, name: service.shortName, subnetIds: ['subnet-a'], ...overrides };
  }

  /** Gateway endpoints require a policy, so scenarios that are not about policy content share this one. */
  const GATEWAY_POLICY: VpcEndpointPolicyProperty = {
    statements: [
      {
        sid: 'AllowEcrImageLayerPull',
        effect: VpcEndpointPolicyEffect.ALLOW,
        actions: ['s3:GetObject'],
        resources: ['arn:test-partition:s3:::prod-test-region-starport-layer-bucket/*'],
      },
    ],
  };

  function gateway(
    service: GatewayVpcEndpointAwsService,
    name: string,
    overrides: Partial<GatewayVpcEndpointProperty> = {},
  ): GatewayVpcEndpointProperty {
    return { service, name, routeTableIds: ['rtb-a'], policy: GATEWAY_POLICY, ...overrides };
  }

  /** Builds the construct over the given endpoints and returns the synthesized template. */
  function synth(
    endpoints: { interfaces?: InterfaceVpcEndpointProperty[]; gateways?: GatewayVpcEndpointProperty[] },
    id = 'endpoints',
  ): Template {
    new VpcEndpointL3Construct(testApp.testStack, id, {
      naming: testApp.naming,
      roleHelper,
      vpcId: VPC_ID,
      nameScope: VPC_ID,
      ...endpoints,
    });
    return Template.fromStack(testApp.testStack);
  }

  describe('Interface endpoints', () => {
    test('should create one endpoint per entry, rendering each service name for the deployment', () => {
      // The caller passes aws-cdk-lib service objects, so the CDK owns the region and partition-prefix
      // rendering and the port: this construct holds no service table of its own.
      const template = synth({
        interfaces: [
          iface(InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME),
          iface(InterfaceVpcEndpointAwsService.ECR),
          iface(InterfaceVpcEndpointAwsService.ECR_DOCKER),
          iface(InterfaceVpcEndpointAwsService.STS),
          iface(InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS),
        ],
      });

      template.resourceCountIs('AWS::EC2::VPCEndpoint', 5);
      const services = Object.values(template.findResources('AWS::EC2::VPCEndpoint')).map(endpoint =>
        JSON.stringify(endpoint.Properties?.ServiceName),
      );
      ['bedrock-runtime', 'ecr.api', 'ecr.dkr', '.sts', '.logs'].forEach(service => {
        expect(services.some(name => name.includes(`com.amazonaws.test-region.${service.replace(/^\./, '')}`))).toBe(
          true,
        );
      });
    });

    test('should accept a FIPS service variant', () => {
      // A FIPS variant is an ordinary catalogue entry, so nothing about it is special here - the old
      // short-name lookup is gone, along with the limitation it implied.
      const template = synth({ interfaces: [iface(InterfaceVpcEndpointAwsService.STS_FIPS)] });

      const endpoint = Object.values(template.findResources('AWS::EC2::VPCEndpoint'))[0];
      expect(JSON.stringify(endpoint.Properties?.ServiceName)).toContain('com.amazonaws.test-region.sts-fips');
    });

    test('should accept a caller-built service the CDK catalogue does not list', () => {
      // The construct never inspects the service, so a service newer than the pinned aws-cdk-lib, or a
      // third-party PrivateLink service, is expressible by the caller.
      const template = synth({
        interfaces: [
          {
            service: new InterfaceVpcEndpointService('com.amazonaws.vpce.test-region.vpce-svc-0123', 443),
            name: 'partner-service',
            subnetIds: ['subnet-a'],
          },
        ],
      });

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        ServiceName: 'com.amazonaws.vpce.test-region.vpce-svc-0123',
      });
    });

    test('should place endpoint ENIs in every configured subnet', () => {
      const template = synth({
        interfaces: [iface(InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME, { subnetIds: ['subnet-a', 'subnet-b'] })],
      });

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', { SubnetIds: ['subnet-a', 'subnet-b'] });
    });

    test('should reject a duplicated subnet id rather than collapse the placement', () => {
      // The repeat is deduplicated on the way to CloudFormation, so it would otherwise deploy as one ENI
      // in one AZ - working, until that zone is impaired.
      expect(() =>
        synth({
          interfaces: [iface(InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME, { subnetIds: ['subnet-a', 'subnet-a'] })],
        }),
      ).toThrow('lists subnet "subnet-a" more than once');
    });

    test('should expose each endpoint security group id keyed by its name', () => {
      // The contract the orchestrating module wires its workloads against.
      const endpoints = new VpcEndpointL3Construct(testApp.testStack, 'endpoints', {
        naming: testApp.naming,
        roleHelper,
        vpcId: VPC_ID,
        nameScope: VPC_ID,
        interfaces: [iface(InterfaceVpcEndpointAwsService.STS), iface(InterfaceVpcEndpointAwsService.ECR)],
        gateways: [gateway(GatewayVpcEndpointAwsService.S3, 's3-image-layers')],
      });

      // A gateway endpoint has no security group, so it contributes no entry.
      expect(Object.keys(endpoints.interfaceEndpointSecurityGroupIds).sort()).toEqual(['ecr.api', 'sts']);
    });

    test('should leave an endpoint with no policy on the AWS default', () => {
      // An interface endpoint is per-service and made VPC-wide by Private DNS, so a restrictive default
      // would deny traffic from unrelated workloads. Policy is the caller's to add.
      const template = synth({ interfaces: [iface(InterfaceVpcEndpointAwsService.STS)] });

      const endpoint = Object.values(template.findResources('AWS::EC2::VPCEndpoint'))[0];
      expect(endpoint.Properties?.PolicyDocument).toBeUndefined();
    });

    test('should apply a configured policy', () => {
      const template = synth({
        interfaces: [
          iface(InterfaceVpcEndpointAwsService.BEDROCK_AGENTCORE_GATEWAY, {
            policy: {
              statements: [
                {
                  sid: 'AgentCoreGatewayInvokeThroughEndpoint',
                  effect: VpcEndpointPolicyEffect.ALLOW,
                  actions: ['bedrock-agentcore:InvokeGateway'],
                },
              ],
            },
          }),
        ],
      });

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'AgentCoreGatewayInvokeThroughEndpoint',
              Effect: 'Allow',
              Principal: '*',
              Action: 'bedrock-agentcore:InvokeGateway',
              Resource: '*',
            },
          ],
        },
      });
    });

    test('should scope a configured policy to its resources and principals', () => {
      const template = synth({
        interfaces: [
          iface(InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME, {
            policy: {
              statements: [
                {
                  effect: VpcEndpointPolicyEffect.ALLOW,
                  actions: ['bedrock:InvokeModel'],
                  resources: ['arn:test-partition:bedrock:test-region::foundation-model/some.model'],
                  principals: ['arn:test-partition:iam::test-account:role/caller'],
                },
              ],
            },
          }),
        ],
      });

      // A bare `Principal: ["arn:..."]` array is not valid IAM policy, so the map form matters.
      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        PolicyDocument: Match.objectLike({
          Statement: [
            Match.objectLike({
              Principal: { AWS: 'arn:test-partition:iam::test-account:role/caller' },
              Resource: 'arn:test-partition:bedrock:test-region::foundation-model/some.model',
            }),
          ],
        }),
      });
    });

    test('should render an explicit wildcard principal as the string form IAM expects', () => {
      // `Principal: "*"`, not `Principal: {"AWS": "*"}` and not a bare array.
      const template = synth({
        interfaces: [
          iface(InterfaceVpcEndpointAwsService.STS, {
            policy: {
              statements: [
                { effect: VpcEndpointPolicyEffect.ALLOW, actions: ['sts:GetCallerIdentity'], principals: ['*'] },
              ],
            },
          }),
        ],
      });

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        PolicyDocument: Match.objectLike({ Statement: [Match.objectLike({ Principal: '*' })] }),
      });
    });

    test('should render a configured condition block', () => {
      // The only way to scope a statement whose principal cannot be narrowed to a role ARN.
      const template = synth({
        interfaces: [
          iface(InterfaceVpcEndpointAwsService.STS, {
            policy: {
              statements: [
                {
                  effect: VpcEndpointPolicyEffect.ALLOW,
                  actions: ['sts:GetCallerIdentity'],
                  principals: ['*'],
                  conditions: { StringEquals: { 'aws:PrincipalAccount': 'test-account' } },
                },
              ],
            },
          }),
        ],
      });

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        PolicyDocument: Match.objectLike({
          Statement: [Match.objectLike({ Condition: { StringEquals: { 'aws:PrincipalAccount': 'test-account' } } })],
        }),
      });
    });

    test('should render a Deny statement', () => {
      const template = synth({
        interfaces: [
          iface(InterfaceVpcEndpointAwsService.STS, {
            policy: { statements: [{ effect: VpcEndpointPolicyEffect.DENY, actions: ['sts:AssumeRole'] }] },
          }),
        ],
      });

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        PolicyDocument: Match.objectLike({ Statement: [Match.objectLike({ Effect: 'Deny' })] }),
      });
    });
  });

  describe('Gateway endpoints', () => {
    test('should associate the configured route tables', () => {
      const template = synth({
        gateways: [gateway(GatewayVpcEndpointAwsService.S3, 's3', { routeTableIds: ['rtb-a', 'rtb-b'] })],
      });

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        VpcEndpointType: 'Gateway',
        RouteTableIds: ['rtb-a', 'rtb-b'],
      });
    });

    test('should apply the configured policy', () => {
      const template = synth({ gateways: [gateway(GatewayVpcEndpointAwsService.S3, 's3')] });

      template.hasResourceProperties('AWS::EC2::VPCEndpoint', {
        PolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Sid: 'AllowEcrImageLayerPull',
              Effect: 'Allow',
              Principal: '*',
              Action: 's3:GetObject',
              Resource: 'arn:test-partition:s3:::prod-test-region-starport-layer-bucket/*',
            },
          ],
        },
      });
    });

    test('should support every gateway service AWS offers', () => {
      const template = synth({
        gateways: [
          gateway(GatewayVpcEndpointAwsService.S3, 's3'),
          gateway(GatewayVpcEndpointAwsService.S3_EXPRESS, 's3express', { routeTableIds: ['rtb-b'] }),
          gateway(GatewayVpcEndpointAwsService.DYNAMODB, 'dynamodb', { routeTableIds: ['rtb-c'] }),
        ],
      });

      const names = Object.values(template.findResources('AWS::EC2::VPCEndpoint')).map(endpoint =>
        JSON.stringify(endpoint.Properties?.ServiceName),
      );
      ['.s3"', '.s3express"', '.dynamodb"'].forEach(suffix => {
        expect(names.some(name => name.includes(suffix))).toBe(true);
      });
    });

    test('should let endpoints for different gateway services share a route table', () => {
      // Different services install different prefix lists, so this is legal.
      const template = synth({
        gateways: [
          gateway(GatewayVpcEndpointAwsService.S3, 's3'),
          gateway(GatewayVpcEndpointAwsService.DYNAMODB, 'dynamodb'),
        ],
      });

      template.resourceCountIs('AWS::EC2::VPCEndpoint', 2);
    });

    test('should create no security group for a gateway endpoint', () => {
      const template = synth({ gateways: [gateway(GatewayVpcEndpointAwsService.S3, 's3')] });

      template.resourceCountIs('AWS::EC2::SecurityGroup', 0);
    });

    test('should let an interface and a gateway endpoint serve the same service', () => {
      // The CDK catalogues an interface endpoint for S3 too, and the two install different mechanisms
      // (ENIs vs. prefix-list routes), so a VPC may legitimately carry both.
      const template = synth({
        interfaces: [iface(InterfaceVpcEndpointAwsService.S3)],
        gateways: [gateway(GatewayVpcEndpointAwsService.S3, 's3-image-layers')],
      });

      template.resourceCountIs('AWS::EC2::VPCEndpoint', 2);
    });
  });

  describe('Resource naming', () => {
    test('should give each endpoint a distinctly named security group', () => {
      // Identical GroupNames would deploy-fail on the collision, invisibly at synth.
      const template = synth({
        interfaces: [iface(InterfaceVpcEndpointAwsService.STS), iface(InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS)],
      });

      const groupNames = Object.values(template.findResources('AWS::EC2::SecurityGroup')).map(
        group => group.Properties?.GroupName as string,
      );
      expect(groupNames).toHaveLength(2);
      expect(new Set(groupNames).size).toBe(2);
    });

    test('should keep two instances in one module apart via nameScope', () => {
      // One instance per VPC, so both provision the same service; only nameScope separates their
      // security-group names, which MDAA naming otherwise scopes only to the module.
      ['vpc-aaaaaaaaaaaaaaaaa', 'vpc-bbbbbbbbbbbbbbbbb'].forEach(vpcId => {
        new VpcEndpointL3Construct(testApp.testStack, `endpoints-${vpcId}`, {
          naming: testApp.naming,
          roleHelper,
          vpcId,
          nameScope: vpcId,
          interfaces: [iface(InterfaceVpcEndpointAwsService.STS)],
        });
      });
      const template = Template.fromStack(testApp.testStack);

      // The same service in two different VPCs is not a collision -- Private DNS is per VPC.
      template.resourceCountIs('AWS::EC2::VPCEndpoint', 2);
      const groupNames = Object.values(template.findResources('AWS::EC2::SecurityGroup')).map(
        group => group.Properties?.GroupName as string,
      );
      expect(new Set(groupNames).size).toBe(2);
    });

    test('should replace the dot of a dotted endpoint name in resource names', () => {
      const template = synth({ interfaces: [iface(InterfaceVpcEndpointAwsService.ECR)] });

      const groupName = Object.values(template.findResources('AWS::EC2::SecurityGroup'))[0].Properties
        ?.GroupName as string;
      expect(groupName).toContain('ecr-api');
      expect(groupName).not.toContain('ecr.api');
    });
  });
});

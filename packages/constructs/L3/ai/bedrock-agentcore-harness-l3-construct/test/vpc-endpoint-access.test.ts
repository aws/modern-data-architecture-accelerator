/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DEFAULT_GATEWAY_ACTIONS } from '@aws-mdaa/agentcore-shared';
import { GatewayVpcEndpointAwsService, InterfaceVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';
import { NamedHarnessToolProps } from '../lib';
import { requiredHarnessVpcEndpoints } from '../lib/vpc-endpoint-access';

// The orchestrating module matches requirements to its own configuration on service identity, so these
// tests assert the service objects themselves rather than their rendered names.
const ALWAYS_REQUIRED = [
  InterfaceVpcEndpointAwsService.BEDROCK_RUNTIME,
  InterfaceVpcEndpointAwsService.ECR,
  InterfaceVpcEndpointAwsService.ECR_DOCKER,
  InterfaceVpcEndpointAwsService.STS,
  InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
];

const GATEWAY_TOOL: NamedHarnessToolProps = {
  gateway_tools: {
    agentCoreGateway: { gatewayArn: 'arn:aws:bedrock-agentcore:test-region:test-account:gateway/my-gw' },
  },
};

const INLINE_TOOL: NamedHarnessToolProps = {
  get_order_status: {
    inlineFunction: {
      description: 'Look up an order.',
      inputSchema: { type: 'object', properties: {} },
    },
  },
};

const ENV = { partition: 'aws', region: 'us-east-1' };

describe('requiredHarnessVpcEndpoints', () => {
  describe('interface endpoints', () => {
    test('always requires the five endpoints a harness cannot start without', () => {
      const { interfaces } = requiredHarnessVpcEndpoints(ENV);

      expect(interfaces.map(requirement => requirement.service)).toEqual(ALWAYS_REQUIRED);
    });

    test('leaves the multi-action supporting endpoints without policy actions', () => {
      const { interfaces } = requiredHarnessVpcEndpoints(ENV);

      // Private DNS makes an interface endpoint VPC-wide, so action-scoping these would break unrelated
      // workloads in the same VPC. Absent policyActions is what tells the orchestrator to leave the AWS
      // default policy in place.
      expect(interfaces.every(requirement => requirement.policyActions === undefined)).toBe(true);
    });

    test('adds the AgentCore Gateway endpoint when a gateway tool is declared', () => {
      const { interfaces } = requiredHarnessVpcEndpoints({ ...ENV, tools: GATEWAY_TOOL });

      expect(interfaces.map(requirement => requirement.service)).toEqual([
        ...ALWAYS_REQUIRED,
        InterfaceVpcEndpointAwsService.BEDROCK_AGENTCORE_GATEWAY,
      ]);
    });

    test('scopes the AgentCore Gateway endpoint policy to gateway invocation', () => {
      const { interfaces } = requiredHarnessVpcEndpoints({ ...ENV, tools: GATEWAY_TOOL });

      const gateway = interfaces.find(
        requirement => requirement.service === InterfaceVpcEndpointAwsService.BEDROCK_AGENTCORE_GATEWAY,
      );
      expect(gateway?.policyActions).toEqual(DEFAULT_GATEWAY_ACTIONS);
    });

    test('omits the Gateway endpoint for a harness whose only tool is inline', () => {
      const { interfaces } = requiredHarnessVpcEndpoints({ ...ENV, tools: INLINE_TOOL });

      expect(interfaces.map(requirement => requirement.service)).toEqual(ALWAYS_REQUIRED);
    });

    test('omits the Gateway endpoint for an empty tool map', () => {
      const { interfaces } = requiredHarnessVpcEndpoints({ ...ENV, tools: {} });

      expect(interfaces.map(requirement => requirement.service)).toEqual(ALWAYS_REQUIRED);
    });

    test('adds the Gateway endpoint once when a gateway tool sits alongside an inline one', () => {
      const { interfaces } = requiredHarnessVpcEndpoints({ ...ENV, tools: { ...INLINE_TOOL, ...GATEWAY_TOOL } });

      expect(
        interfaces.filter(
          requirement => requirement.service === InterfaceVpcEndpointAwsService.BEDROCK_AGENTCORE_GATEWAY,
        ),
      ).toHaveLength(1);
    });
  });

  describe('image-layer gateway endpoint', () => {
    test('is always required, because ECR serves layers from S3', () => {
      const { imageLayerGateway } = requiredHarnessVpcEndpoints(ENV);

      expect(imageLayerGateway.service).toBe(GatewayVpcEndpointAwsService.S3);
      expect(imageLayerGateway.name).toBe('s3-image-layers');
    });

    test('names the ECR layer bucket for the deployment partition and region', () => {
      const { imageLayerGateway } = requiredHarnessVpcEndpoints({ partition: 'aws', region: 'eu-west-2' });

      expect(imageLayerGateway.policyStatements).toEqual([
        {
          sid: 'AllowEcrImageLayerPull',
          actions: ['s3:GetObject'],
          resources: ['arn:aws:s3:::prod-eu-west-2-starport-layer-bucket/*'],
        },
      ]);
    });

    test('honours a non-commercial partition', () => {
      const { imageLayerGateway } = requiredHarnessVpcEndpoints({ partition: 'aws-us-gov', region: 'us-gov-west-1' });

      expect(imageLayerGateway.policyStatements[0].resources).toEqual([
        'arn:aws-us-gov:s3:::prod-us-gov-west-1-starport-layer-bucket/*',
      ]);
    });

    test('grants only the layer read, never a broader S3 action', () => {
      const { imageLayerGateway } = requiredHarnessVpcEndpoints(ENV);

      // The endpoint would otherwise inherit S3 full access for every subnet on its route tables.
      expect(imageLayerGateway.policyStatements.flatMap(statement => statement.actions)).toEqual(['s3:GetObject']);
    });
  });
});

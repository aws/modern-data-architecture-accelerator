/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Fn } from 'aws-cdk-lib';
import { GatewayVpcEndpointAwsService, InterfaceVpcEndpointAwsService } from 'aws-cdk-lib/aws-ec2';
import {
  GatewayVpcEndpointProperty,
  InterfaceVpcEndpointProperty,
  VpcEndpointL3Construct,
  VpcEndpointPolicyEffect,
  VpcEndpointPolicyProperty,
} from '../lib';

describe('VpcEndpointL3Construct constructor exceptions', () => {
  let testApp: MdaaTestApp;
  let roleHelper: MdaaRoleHelper;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  });

  const VPC_ID = 'vpc-0123456789abcdef0';

  /** Instantiates the construct, so a rejected configuration surfaces as a thrown error. */
  function build(endpoints: {
    interfaces?: InterfaceVpcEndpointProperty[];
    gateways?: GatewayVpcEndpointProperty[];
  }): void {
    new VpcEndpointL3Construct(testApp.testStack, 'endpoints', {
      naming: testApp.naming,
      roleHelper,
      vpcId: VPC_ID,
      nameScope: VPC_ID,
      ...endpoints,
    });
  }

  const GATEWAY_POLICY: VpcEndpointPolicyProperty = {
    statements: [
      {
        effect: VpcEndpointPolicyEffect.ALLOW,
        actions: ['s3:GetObject'],
        resources: ['arn:test-partition:s3:::some-bucket/*'],
      },
    ],
  };

  function iface(
    service: InterfaceVpcEndpointAwsService,
    overrides: Partial<InterfaceVpcEndpointProperty> = {},
  ): InterfaceVpcEndpointProperty {
    return { service, name: service.shortName, subnetIds: ['subnet-a'], ...overrides };
  }

  function gateway(overrides: Partial<GatewayVpcEndpointProperty> = {}): GatewayVpcEndpointProperty {
    return {
      service: GatewayVpcEndpointAwsService.S3,
      name: 's3',
      routeTableIds: ['rtb-a'],
      policy: GATEWAY_POLICY,
      ...overrides,
    };
  }

  describe('duplicates', () => {
    test('should reject one interface service listed twice', () => {
      // AWS allows one Private DNS endpoint per service per VPC, so this could never deploy - and it
      // would otherwise surface as a construct-id collision naming neither the service nor the reason.
      expect(() =>
        build({ interfaces: [iface(InterfaceVpcEndpointAwsService.STS), iface(InterfaceVpcEndpointAwsService.STS)] }),
      ).toThrow(`Interface VPC endpoint "sts" is listed more than once for VPC "${VPC_ID}"`);
    });

    test('should reject one gateway endpoint name listed twice', () => {
      expect(() => build({ gateways: [gateway(), gateway({ routeTableIds: ['rtb-b'] })] })).toThrow(
        `Gateway VPC endpoint "s3" is listed more than once for VPC "${VPC_ID}"`,
      );
    });

    test('should report a repeated dotted name as the caller spelled it', () => {
      // The comparison folds `.` to `-`, so the error must still name `ecr.api` rather than the segment.
      expect(() =>
        build({
          interfaces: [
            iface(InterfaceVpcEndpointAwsService.ECR, { subnetIds: ['subnet-a'] }),
            iface(InterfaceVpcEndpointAwsService.ECR, { subnetIds: ['subnet-b'] }),
          ],
        }),
      ).toThrow(`Interface VPC endpoint "ecr.api" is listed more than once for VPC "${VPC_ID}"`);
    });

    test('should reject two spellings of one endpoint name that fold to the same segment', () => {
      // `toNameSegment` maps `.` to `-`, so both build the same construct ids - the collision this check
      // exists to replace. Comparing raw names would let the pair through.
      expect(() =>
        build({
          interfaces: [
            iface(InterfaceVpcEndpointAwsService.ECR, { name: 'ecr.api', subnetIds: ['subnet-a'] }),
            iface(InterfaceVpcEndpointAwsService.ECR, { name: 'ecr-api', subnetIds: ['subnet-b'] }),
          ],
        }),
      ).toThrow(
        `Interface VPC endpoint "ecr-api", spelled "ecr.api" and "ecr-api", is listed more than once for ` +
          `VPC "${VPC_ID}"`,
      );
    });

    test('should reject a route table listed twice for one gateway endpoint', () => {
      // A route table can carry a given service's prefix-list route only once.
      expect(() => build({ gateways: [gateway({ routeTableIds: ['rtb-a', 'rtb-b', 'rtb-a'] })] })).toThrow(
        `Gateway VPC endpoint "s3" in VPC "${VPC_ID}" lists route table "rtb-a" more than once`,
      );
    });

    test('should reject a subnet listed twice for one interface endpoint', () => {
      // Deduplicated on the way to CloudFormation, so it would otherwise place one ENI in one AZ.
      expect(() =>
        build({
          interfaces: [iface(InterfaceVpcEndpointAwsService.STS, { subnetIds: ['subnet-a', 'subnet-b', 'subnet-a'] })],
        }),
      ).toThrow(`Interface VPC endpoint "sts" in VPC "${VPC_ID}" lists subnet "subnet-a" more than once`);
    });
  });

  describe('empty configuration', () => {
    test('should reject a configuration that creates no endpoint', () => {
      // Deploys cleanly and provisions nothing, so the failure surfaces in whichever workload was wired
      // to endpoints that were never created.
      expect(() => build({})).toThrow(`VPC endpoints for VPC "${VPC_ID}" declare no endpoints`);
    });

    test('should reject an endpoint policy with no statements', () => {
      // Renders as no PolicyDocument at all, which makes AWS apply its default full-access policy -
      // the opposite of what configuring a policy asks for.
      expect(() => build({ gateways: [gateway({ policy: { statements: [] } })] })).toThrow(
        'has an endpoint policy with no statements',
      );
    });

    test.each(['actions', 'resources', 'principals'] as const)(
      'should reject an empty "%s" list, which IAM rejects as malformed',
      field => {
        const statement = {
          sid: 'Empty',
          effect: VpcEndpointPolicyEffect.ALLOW,
          actions: ['s3:GetObject'],
          [field]: [],
        };
        expect(() => build({ gateways: [gateway({ policy: { statements: [statement] } })] })).toThrow(
          `statement "Empty" has an empty "${field}" list`,
        );
      },
    );

    test('should reject an empty "conditions" block, which renders as no condition', () => {
      // A statement written to be scoped by a condition would apply unscoped instead.
      expect(() =>
        build({
          gateways: [
            gateway({
              policy: {
                statements: [
                  {
                    sid: 'Unscoped',
                    effect: VpcEndpointPolicyEffect.ALLOW,
                    actions: ['s3:GetObject'],
                    resources: ['arn:test-partition:s3:::some-bucket/*'],
                    conditions: {},
                  },
                ],
              },
            }),
          ],
        }),
      ).toThrow('statement "Unscoped" has an empty "conditions" block');
    });

    test('should identify an unnamed statement by index', () => {
      expect(() =>
        build({
          interfaces: [
            iface(InterfaceVpcEndpointAwsService.STS, {
              policy: { statements: [{ effect: VpcEndpointPolicyEffect.ALLOW, actions: [] }] },
            }),
          ],
        }),
      ).toThrow('statement 0 has an empty "actions" list');
    });

    test('should reject a gateway statement that omits "resources"', () => {
      // Omitted resources render as Resource "*", so requiring a policy would have bought nothing: every
      // subnet on the route tables would still reach the whole service.
      expect(() =>
        build({
          gateways: [
            gateway({
              policy: {
                statements: [{ sid: 'Wide', effect: VpcEndpointPolicyEffect.ALLOW, actions: ['s3:GetObject'] }],
              },
            }),
          ],
        }),
      ).toThrow('statement "Wide" omits "resources"');
    });

    test('should accept a gateway statement that states ["*"] deliberately', () => {
      expect(() =>
        build({
          gateways: [
            gateway({
              policy: {
                statements: [{ effect: VpcEndpointPolicyEffect.ALLOW, actions: ['s3:GetObject'], resources: ['*'] }],
              },
            }),
          ],
        }),
      ).not.toThrow();
    });

    test('should accept an interface statement that omits "resources"', () => {
      // An interface endpoint reaches one service and is scoped by the consumer's identity policy, so the
      // gateway blast radius that motivates the rule above does not apply.
      expect(() =>
        build({
          interfaces: [
            iface(InterfaceVpcEndpointAwsService.STS, {
              policy: {
                statements: [{ effect: VpcEndpointPolicyEffect.ALLOW, actions: ['sts:GetCallerIdentity'] }],
              },
            }),
          ],
        }),
      ).not.toThrow();
    });

    test('should reject a resource that is neither an ARN nor "*"', () => {
      // Matches nothing, so a policy meant to grant access denies it - and only after the endpoint deploys.
      expect(() =>
        build({
          gateways: [
            gateway({
              policy: {
                statements: [
                  {
                    sid: 'BareName',
                    effect: VpcEndpointPolicyEffect.ALLOW,
                    actions: ['s3:GetObject'],
                    resources: ['some-bucket/*'],
                  },
                ],
              },
            }),
          ],
        }),
      ).toThrow('names resource "some-bucket/*", which is neither an ARN nor "*"');
    });

    test('should skip the resource shape check for an unresolved resource', () => {
      expect(() =>
        build({
          gateways: [
            gateway({
              policy: {
                statements: [
                  {
                    effect: VpcEndpointPolicyEffect.ALLOW,
                    actions: ['s3:GetObject'],
                    resources: [Fn.importValue('SomeBucketArn')],
                  },
                ],
              },
            }),
          ],
        }),
      ).not.toThrow();
    });
  });
});

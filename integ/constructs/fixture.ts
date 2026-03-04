/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared fixture stack for L2 construct integration tests.
 *
 * Infrastructure is managed as a single CDK stack:
 *   MdaaIntegInfraFixtureStack — VPC (2 AZs, NAT, IGW) + KMS key + EC2 KeyPair
 *
 * Fixture stack is deployed once by bootstrap and reused across test runs.
 * Test stacks receive fixture resource ARNs/IDs via environment variables
 * (set by bootstrap-integ.sh after deployment).
 *
 * Environment variables exported by bootstrap:
 *   INTEG_KMS_KEY_ARN     - KMS key ARN for encryption
 *   INTEG_VPC_ID          - VPC ID
 *   INTEG_PRIVATE_SUBNETS - Comma-separated private subnet IDs
 *   INTEG_AZS             - Comma-separated availability zones
 */

import { getIntegEnv, getIntegNaming, ForceDestroy } from '@aws-mdaa/testing/lib/integ';
import { MdaaEC2SecretKeyPair } from '@aws-mdaa/ec2-constructs';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { App, Aspects, CfnOutput, Stack } from 'aws-cdk-lib';
import {
  GatewayVpcEndpointAwsService,
  InterfaceVpcEndpointAwsService,
  ISubnet,
  IVpc,
  NatProvider,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { ServicePrincipal, PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';

// ============================================================
// Infra Fixture Stack — VPC + KMS + KeyPair
// (deployed by bootstrap-integ.sh, outputs exported as env vars)
// ============================================================

export interface InfraFixtureResult {
  stack: Stack;
  vpc: IVpc;
  privateSubnets: ISubnet[];
  kmsKey: IKey;
  keyPair: MdaaEC2SecretKeyPair;
}

export function createInfraFixture(app: App): InfraFixtureResult {
  const env = getIntegEnv();
  const naming = getIntegNaming(app);
  const stack = new Stack(app, 'MdaaIntegInfraFixtureStack', {
    env,
    description: 'Shared VPC and KMS key for MDAA integration tests',
  });

  const vpc = new Vpc(stack, 'Vpc', {
    vpcName: 'mdaa-integ-vpc',
    maxAzs: 2,
    natGateways: 1,
    natGatewayProvider: NatProvider.gateway(),
    subnetConfiguration: [
      { name: 'public', subnetType: SubnetType.PUBLIC, cidrMask: 24 },
      { name: 'private', subnetType: SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 24 },
    ],
  });

  // VPC endpoints for AWS services (Lambda, SageMaker CRs need these in private subnets)
  vpc.addGatewayEndpoint('S3Endpoint', { service: GatewayVpcEndpointAwsService.S3 });
  vpc.addInterfaceEndpoint('StsEndpoint', { service: InterfaceVpcEndpointAwsService.STS });

  const kmsKey = new MdaaKmsKey(stack, 'KmsKey', {
    naming,
    alias: 'integ-shared',
    description: 'MDAA integ test shared KMS key',
  });

  // Grant CloudWatch Logs service access to the KMS key
  // Required for MdaaLogGroup and any construct that creates encrypted log groups
  kmsKey.addToResourcePolicy(
    new PolicyStatement({
      sid: 'AllowCloudWatchLogs',
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal(`logs.${env.region}.amazonaws.com`)],
      actions: ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:DescribeKey'],
      resources: ['*'],
    }),
  );

  // Grant DMS service access to the KMS key
  // Required for MdaaEndpoint and other DMS constructs with encryption
  kmsKey.addToResourcePolicy(
    new PolicyStatement({
      sid: 'AllowDMS',
      effect: Effect.ALLOW,
      principals: [new ServicePrincipal('dms.amazonaws.com')],
      actions: ['kms:Encrypt', 'kms:Decrypt', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:DescribeKey'],
      resources: ['*'],
    }),
  );

  const privateSubnets = vpc.selectSubnets({ subnetType: SubnetType.PRIVATE_WITH_EGRESS }).subnets;

  // EC2 key pair — stored in Secrets Manager, persists across test runs
  const keyPair = new MdaaEC2SecretKeyPair(stack, 'KeyPair', {
    naming,
    name: 'integ-shared',
    kmsKey,
  });

  // Export values for bootstrap script to capture
  new CfnOutput(stack, 'KmsKeyArn', {
    value: kmsKey.keyArn,
    exportName: 'MdaaIntegKmsKeyArn',
  });

  new CfnOutput(stack, 'VpcId', {
    value: vpc.vpcId,
    exportName: 'MdaaIntegVpcId',
  });

  new CfnOutput(stack, 'PrivateSubnets', {
    value: privateSubnets.map(s => s.subnetId).join(','),
    exportName: 'MdaaIntegPrivateSubnets',
  });

  new CfnOutput(stack, 'AvailabilityZones', {
    value: vpc.availabilityZones.join(','),
    exportName: 'MdaaIntegAZs',
  });

  Aspects.of(stack).add(new ForceDestroy());

  return { stack, vpc, privateSubnets, kmsKey, keyPair };
}

// ============================================================
// Standalone entry point: cdk deploy --app "npx ts-node fixture.ts"
// ============================================================

if (require.main === module) {
  const app = new App();
  createInfraFixture(app);
  app.synth();
}

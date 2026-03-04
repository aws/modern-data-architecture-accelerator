/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test helper functions for MDAA L2 construct tests.
 *
 * These helpers are used by integration tests to:
 * - Get CDK environment from process env vars
 * - Create MDAA resource naming for test stacks
 * - Look up shared fixture resources (VPC, KMS key) from env vars
 * - Apply ForceDestroy aspect to ensure test cleanup
 *
 * Environment variables (set by bootstrap-integ.sh):
 *   INTEG_KMS_KEY_ARN     - KMS key ARN for encryption
 *   INTEG_VPC_ID          - VPC ID
 *   INTEG_PRIVATE_SUBNETS - Comma-separated private subnet IDs
 *   INTEG_AZS             - Comma-separated availability zones
 */

import { MdaaDefaultResourceNaming, IMdaaResourceNaming } from '@aws-mdaa/naming';
import { App, CfnResource, IAspect, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { CfnTable } from 'aws-cdk-lib/aws-dynamodb';
import { ISubnet, IVpc, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { IConstruct } from 'constructs';

/**
 * Get CDK environment from process env vars.
 */
export function getIntegEnv() {
  return {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  };
}

/**
 * Derive a short region tag for use in resource naming.
 * e.g. 'us-east-1' → 'use1', 'eu-west-2' → 'euw2', 'ap-southeast-1' → 'aps1'
 *
 * This ensures IAM roles (which are global) don't collide when
 * fixtures are bootstrapped in multiple regions within the same account.
 */
function shortRegion(): string {
  const region = process.env.CDK_DEFAULT_REGION || 'us-east-1';
  const parts = region.split('-');
  return parts[0] + parts[1][0] + parts[2];
}

/**
 * Get MDAA resource naming for integration tests.
 */
export function getIntegNaming(app: App, moduleName = 'fixture'): IMdaaResourceNaming {
  return new MdaaDefaultResourceNaming({
    org: 'mdaa',
    env: shortRegion(),
    domain: 'fast',
    moduleName,
    cdkNode: app.node,
  });
}

/**
 * Aspect that forces DESTROY removal policy on all resources.
 * Apply to integration test stacks to ensure cleanup.
 *
 * Also disables DynamoDB deletion protection to allow table cleanup.
 */
export class ForceDestroy implements IAspect {
  visit(node: IConstruct): void {
    if (node instanceof CfnResource) {
      node.applyRemovalPolicy(RemovalPolicy.DESTROY);
    }
    if (node instanceof CfnTable) {
      node.addPropertyOverride('DeletionProtectionEnabled', false);
    }
  }
}

/**
 * Fixture resources from environment variables.
 */
export interface FixtureResources {
  kmsKey: IKey;
  vpc: IVpc;
  privateSubnets: ISubnet[];
  availabilityZones: string[];
}

/**
 * Get fixture resources from environment variables.
 * Call this in test stacks to get references to shared infrastructure.
 *
 * Required env vars (set by bootstrap-integ.sh):
 *   INTEG_KMS_KEY_ARN
 *   INTEG_VPC_ID
 *   INTEG_PRIVATE_SUBNETS (comma-separated)
 *   INTEG_AZS (comma-separated)
 */
export function getFixtureResources(stack: Stack): FixtureResources {
  const kmsKeyArn = process.env.INTEG_KMS_KEY_ARN;
  const vpcId = process.env.INTEG_VPC_ID;
  const privateSubnetIds = process.env.INTEG_PRIVATE_SUBNETS;
  const azs = process.env.INTEG_AZS;

  if (!kmsKeyArn) {
    throw new Error('INTEG_KMS_KEY_ARN environment variable not set. Run bootstrap-integ.sh first.');
  }
  if (!vpcId) {
    throw new Error('INTEG_VPC_ID environment variable not set. Run bootstrap-integ.sh first.');
  }
  if (!privateSubnetIds) {
    throw new Error('INTEG_PRIVATE_SUBNETS environment variable not set. Run bootstrap-integ.sh first.');
  }
  if (!azs) {
    throw new Error('INTEG_AZS environment variable not set. Run bootstrap-integ.sh first.');
  }

  const kmsKey = Key.fromKeyArn(stack, 'FixtureKmsKey', kmsKeyArn);

  const vpc = Vpc.fromLookup(stack, 'FixtureVpc', { vpcId });

  const subnetIdList = privateSubnetIds.split(',').map(s => s.trim());
  const azList = azs.split(',').map(s => s.trim());

  const privateSubnets = subnetIdList.map((subnetId, idx) =>
    Subnet.fromSubnetAttributes(stack, `FixtureSubnet${idx}`, {
      subnetId,
      availabilityZone: azList[idx] || azList[0],
    }),
  );

  return {
    kmsKey,
    vpc,
    privateSubnets,
    availabilityZones: azList,
  };
}

/**
 * Get just the KMS key from environment variable.
 * Use this for tests that only need encryption key (no VPC).
 */
export function getFixtureKmsKey(stack: Stack): IKey {
  const kmsKeyArn = process.env.INTEG_KMS_KEY_ARN;
  if (!kmsKeyArn) {
    throw new Error('INTEG_KMS_KEY_ARN environment variable not set. Run bootstrap-integ.sh first.');
  }
  return Key.fromKeyArn(stack, 'FixtureKmsKey', kmsKeyArn);
}

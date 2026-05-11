/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk from 'aws-cdk-lib';
import { IVpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';

/**
 * Gets the VPC ARN, handling cross-account VPC sharing (AWS RAM) scenarios.
 *
 * When using AWS RAM shared VPCs, the VPC ARN must use the network account ID
 * (the account that owns the VPC/subnets) rather than the workload account ID.
 * This is required for IAM policy conditions like `ec2:Vpc` to work correctly
 * when Lambda functions create ENIs in shared subnets.
 *
 * @param scope - The construct scope (used to get stack context for ARN formatting)
 * @param vpc - The VPC object
 * @param vpcOwnerAccountId - Optional account ID of the VPC owner (for AWS RAM shared VPCs)
 * @returns The VPC ARN with the correct account ID
 *
 * @example
 * // Same-account VPC (uses vpc.vpcArn directly)
 * const vpcArn = getVpcArn(this, vpc);
 *
 * @example
 * // Cross-account shared VPC (formats ARN with network account ID)
 * const vpcArn = getVpcArn(this, vpc, '222222222222');
 */
export function getVpcArn(scope: Construct, vpc: IVpc, vpcOwnerAccountId?: string): string {
  if (vpcOwnerAccountId) {
    return cdk.Stack.of(scope).formatArn({
      service: 'ec2',
      resource: 'vpc',
      resourceName: vpc.vpcId,
      account: vpcOwnerAccountId,
    });
  }
  return vpc.vpcArn;
}

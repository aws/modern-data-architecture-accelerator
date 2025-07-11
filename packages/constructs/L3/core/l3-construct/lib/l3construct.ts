/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Interface for MDAA-specific L3 construct baseprops.
 */
export interface MdaaL3ConstructProps extends MdaaConstructProps {
  readonly roleHelper: MdaaRoleHelper;
  readonly crossAccountStacks?: { [account: string]: { [region: string]: Stack } };
  /** Tags to be applied directly to resources. */
  readonly tags?: {
    [key: string]: string;
  };
}

/**
 * Base class for MDAA CDK L3 Constructs
 */
export abstract class MdaaL3Construct extends Construct {
  protected readonly scope: Construct;
  protected readonly baseprops: MdaaL3ConstructProps;

  constructor(scope: Construct, id: string, baseprops: MdaaL3ConstructProps) {
    super(scope, id);
    this.scope = scope;
    this.baseprops = baseprops;
  }

  protected getCrossAccountStack(account?: string, region?: string): Stack {
    console.log(`Cross Account: ${account} : ${account ?? this.account} Region: ${region} : ${region ?? this.region}`);
    console.log(`Stacks: ${Object.keys(this.baseprops.crossAccountStacks || {})}`);
    if (!this.baseprops.crossAccountStacks) {
      throw new Error(`No cross account stacks defined`);
    } else if (!account && !region) {
      throw new Error('Must specify either account or region');
    } else if (!this.baseprops.crossAccountStacks[account ?? this.account]) {
      throw new Error(`No cross account stacks defined for account ${account ?? this.account}`);
    } else if (!this.baseprops.crossAccountStacks[account ?? this.account][region ?? this.region]) {
      throw new Error(`No cross account stack defined for account ${account ?? this.account}/${region ?? this.region}`);
    }
    return this.baseprops.crossAccountStacks[account ?? this.account][region ?? this.region];
  }

  protected get partition(): string {
    return Stack.of(this).partition;
  }

  protected get account(): string {
    return Stack.of(this).account;
  }

  protected get region(): string {
    return Stack.of(this).region;
  }
}

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
  readonly crossAccountStacks?: { [account: string]: Stack };
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

  protected getCrossAccountStack(account: string): Stack {
    if (!this.baseprops.crossAccountStacks || !this.baseprops.crossAccountStacks[account]) {
      throw new Error(
        `Cross account stack not available. Ensure module is configured with 'additional_accounts' containing '${account}'`,
      );
    }
    return this.baseprops.crossAccountStacks[account];
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

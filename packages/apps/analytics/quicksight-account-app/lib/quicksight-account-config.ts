/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { AccountProps } from '@aws-mdaa/quicksight-account-l3-construct';

import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';

export interface QuickSightAccountConfigContents extends MdaaBaseConfigContents {
  /**
   * QuickSight account configuration defining edition, authentication, networking, and security settings.
   * The module deploys a QS service role, security group for VPC data source connectivity,
   * and the QS account itself. Manual post-deployment configuration is required.
   *
   * Use cases: QuickSight account provisioning; VPC data source connectivity; IP-based access restrictions
   *
   * AWS: QuickSight account with service role, VPC security group, and account-level settings
   *
   * Validation: Required; valid AccountProps
   */
  readonly account: AccountProps;
}

export class QuickSightAccountConfigParser extends MdaaAppConfigParser<QuickSightAccountConfigContents> {
  readonly account: AccountProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.account = this.configContents.account;
  }
}

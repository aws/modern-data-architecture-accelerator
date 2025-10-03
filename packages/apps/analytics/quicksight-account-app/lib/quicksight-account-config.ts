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
   * Q-ENHANCED-PROPERTY
   * Required QuickSight account configuration defining all aspects of the account setup including authentication, permissions, and service configuration. Provides account provisioning with proper security and access controls for business intelligence operations.
   *
   * Use cases: Account provisioning; Authentication setup; Service configuration and access control
   *
   * AWS: Amazon QuickSight account configuration for complete service setup and management
   *
   * Validation: Must be valid AccountProps; required; defines all account setup characteristics
   **/
  readonly account: AccountProps;
}

export class QuickSightAccountConfigParser extends MdaaAppConfigParser<QuickSightAccountConfigContents> {
  readonly account: AccountProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.account = this.configContents.account;
  }
}

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { DataScienceTeamProps } from '@aws-mdaa/datascience-team-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';

export interface DataScienceTeamConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required data science team configuration defining all aspects of the team infrastructure including shared resources, collaboration tools, and ML development environment setup. Provides team setup with shared storage, compute resources, and collaborative ML development capabilities.
   *
   * Use cases: Team infrastructure configuration; Shared resource setup; Collaborative ML development; Team-based resource management
   *
   * AWS: Data science team infrastructure configuration for complete ML team deployment and resource coordination
   *
   * Validation: Must be valid DataScienceTeamProps; required; defines all team infrastructure and collaboration characteristics
   **/
  readonly team: DataScienceTeamProps;
}

export class DataScienceTeamConfigParser extends MdaaAppConfigParser<DataScienceTeamConfigContents> {
  public readonly team: DataScienceTeamProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.team = this.configContents.team;
  }
}

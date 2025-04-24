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
  readonly team: DataScienceTeamProps;
}

export class DataScienceTeamConfigParser extends MdaaAppConfigParser<DataScienceTeamConfigContents> {
  public readonly team: DataScienceTeamProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.team = this.configContents.team;
  }
}

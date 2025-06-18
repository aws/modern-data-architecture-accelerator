/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { MdaaDataOpsConfigContents, MdaaDataOpsConfigParser } from '@aws-mdaa/dataops-shared';
import { TableDefinitionMap } from '@aws-mdaa/dataops-dynamodb-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface DynamodbConfigContents extends MdaaDataOpsConfigContents {
  /**
   * Map of Dynamodb table definitions to create
   */
  tableDefinitions: TableDefinitionMap;
}

export class DynamodbConfigParser extends MdaaDataOpsConfigParser<DynamodbConfigContents> {
  public readonly tableDefinitions: TableDefinitionMap;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.tableDefinitions = this.configContents.tableDefinitions;
  }
}

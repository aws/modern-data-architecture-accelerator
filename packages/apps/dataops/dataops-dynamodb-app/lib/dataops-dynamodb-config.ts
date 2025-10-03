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
   * Q-ENHANCED-PROPERTY
   * Required map of DynamoDB table definitions for NoSQL database deployment enabling table configuration and management. Provides table specifications including schema, capacity, encryption, and access patterns for DataOps NoSQL database operations and data storage.
   *
   * Use cases: DynamoDB table configuration; NoSQL schema definition; Table management; Data storage patterns
   *
   * AWS: DynamoDB table definitions for NoSQL database deployment and data operations
   *
   * Validation: Must be valid TableDefinitionMap; required for DynamoDB table deployment and configuration
   *   **/
  readonly tableDefinitions: TableDefinitionMap;
}

export class DynamodbConfigParser extends MdaaDataOpsConfigParser<DynamodbConfigContents> {
  public readonly tableDefinitions: TableDefinitionMap;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.tableDefinitions = this.configContents.tableDefinitions;
  }
}

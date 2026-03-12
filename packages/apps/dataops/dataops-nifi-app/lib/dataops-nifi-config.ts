/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { MdaaDataOpsConfigContents, MdaaDataOpsConfigParser } from '@aws-mdaa/dataops-shared';

import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';
import { NifiProps } from '@aws-mdaa/dataops-nifi-l3-construct';

export interface NifiConfigContents extends MdaaDataOpsConfigContents {
  /**
   * DataOps project name for NiFi cluster association and resource management.
   *
   * Use cases: Project integration; Resource organization
   *
   * AWS: DataOps project reference
   *
   * Validation: Optional; string
   */
  readonly projectName?: string;

  /**
   * Apache NiFi cluster configuration for data flow orchestration and processing.
   *
   * Use cases: Data flow orchestration; Real-time processing; Event-driven integration
   *
   * AWS: NiFi on EKS
   *
   * Validation: Required; valid NifiProps
   */
  readonly nifi: NifiProps;
}

export class NifiConfigParser extends MdaaDataOpsConfigParser<NifiConfigContents> {
  public readonly nifi: NifiProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.nifi = this.configContents.nifi;
  }
}

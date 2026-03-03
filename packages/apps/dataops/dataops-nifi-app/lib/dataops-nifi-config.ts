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
   * Q-ENHANCED-PROPERTY
   * Required DataOps project name for Nifi cluster association enabling project-based organization and resource management. Links the Nifi deployment to a specific DataOps project for organized data flow management and governance within the data operations framework.
   *
   * Use cases: Project-based organization; Resource management; DataOps project association for governance
   *
   * AWS: DataOps project association for Nifi cluster organization and resource management
   *
   * Validation: Must be non-empty string; required; links Nifi deployment to specific DataOps project
   **/
  readonly projectName?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required Apache Nifi cluster configuration defining data flow orchestration and processing capabilities including cluster setup, security, networking, and data flow management. Provides complete Nifi deployment with event-driven processing and real-time data integration.
   *
   * Use cases: Data flow orchestration; Real-time processing; Event-driven data integration and flow management
   *
   * AWS: Apache Nifi cluster deployment for data flow orchestration and real-time processing capabilities
   *
   * Validation: Must be valid NifiProps; required; defines all Nifi cluster characteristics and processing capabilities
   **/
  readonly nifi: NifiProps;
}

export class NifiConfigParser extends MdaaDataOpsConfigParser<NifiConfigContents> {
  public readonly nifi: NifiProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.nifi = this.configContents.nifi;
  }
}

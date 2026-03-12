/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { AuditTrailProps } from '@aws-mdaa/audit-trail-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface AuditTrailConfigContents extends MdaaBaseConfigContents {
  /**
   * CloudTrail audit trail configuration defining S3 destination, KMS encryption,
   * and event scope for compliance monitoring.
   *
   * Use cases: S3 data event auditing; Compliance logging; Security monitoring
   *
   * AWS: CloudTrail trail with S3 data events and KMS encryption
   *
   * Validation: Required; must be valid AuditTrailProps
   */
  readonly trail: AuditTrailProps;
}

export class AuditTrailConfigParser extends MdaaAppConfigParser<AuditTrailConfigContents> {
  public readonly trail: AuditTrailProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.trail = this.configContents.trail;
  }
}

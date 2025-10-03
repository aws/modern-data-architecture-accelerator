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
   * Q-ENHANCED-PROPERTY
   * Required CloudTrail configuration defining audit logging including S3 data events and management events. Provides complete audit trail setup with event logging, encryption, and delivery configuration for compliance and security monitoring.
   *
   * Use cases: Comprehensive audit trail configuration; S3 data event logging; Management event monitoring
   *
   * AWS: AWS CloudTrail configuration for complete audit logging and compliance monitoring
   *
   * Validation: Must be valid AuditTrailProps; required; defines all audit trail logging and delivery characteristics
   **/
  readonly trail: AuditTrailProps;
}

export class AuditTrailConfigParser extends MdaaAppConfigParser<AuditTrailConfigContents> {
  public readonly trail: AuditTrailProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.trail = this.configContents.trail;
  }
}

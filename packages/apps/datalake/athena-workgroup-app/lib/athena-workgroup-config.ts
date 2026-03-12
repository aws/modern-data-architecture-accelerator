/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface AthenaWorkgroupConfigContents extends MdaaBaseConfigContents {
  /**
   * Admin roles granted full access to Athena workgroup resources including KMS key, results bucket,
   * and workgroup management. The module deploys a KMS-encrypted results bucket and Athena workgroup
   * with managed IAM policies for controlled access.
   *
   * Use cases: Workgroup administration; Results bucket management; KMS key administration
   *
   * AWS: IAM roles with full Athena workgroup, S3 results bucket, and KMS key access
   *
   * Validation: Required; array of valid MdaaRoleRef
   */
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * User roles granted query execution access to the workgroup and read/write access to the results bucket.
   * Immutable roles (e.g., SSO roles) receive bucket/KMS access only and must be bound to the managed policy externally.
   *
   * Use cases: Query execution access; Data analytics operations; SSO role integration
   *
   * AWS: IAM roles with Athena workgroup usage and results bucket access
   *
   * Validation: Required; array of valid MdaaRoleRef
   */
  readonly athenaUserRoles: MdaaRoleRef[];
  /**
   * Workgroup configuration settings for query cost controls and performance limits.
   *
   * Use cases: Query cost control; Bytes-scanned limits; Resource usage management
   *
   * AWS: Athena workgroup configuration settings
   *
   * Validation: Optional; valid WorkgroupConfigurationConfig
   */
  readonly workgroupConfiguration?: WorkgroupConfigurationConfig;
  /**
   * Verbatim policy name prefix bypassing MDAA naming conventions.
   * Useful for cross-account policy portability and SSO permission set integration
   * where policy names must be stable across accounts.
   *
   * Use cases: Cross-account policy portability; SSO permission set integration; Stable policy naming
   *
   * AWS: IAM managed policy naming prefix
   *
   * Validation: Optional; string prefix used instead of MDAA naming for policy names
   */
  readonly verbatimPolicyNamePrefix?: string;
}

/**
 * Athena workgroup configuration settings for query cost controls.
 *
 * Use cases: Query cost control; Bytes-scanned limits; Runaway query prevention
 *
 * AWS: Athena workgroup configuration
 *
 * Validation: All properties optional
 */
export interface WorkgroupConfigurationConfig {
  /**
   * Upper limit in bytes for data scanned per query. Queries exceeding this limit are cancelled.
   * Prevents runaway queries from consuming excessive resources.
   *
   * Use cases: Query cost control; Runaway query prevention; Resource usage limits
   *
   * AWS: Athena workgroup bytes scanned cutoff per query
   *
   * Validation: Optional; positive integer in bytes
   */
  readonly bytesScannedCutoffPerQuery?: number;
}

export class AthenaWorkgroupConfigParser extends MdaaAppConfigParser<AthenaWorkgroupConfigContents> {
  public readonly dataAdminRoles: MdaaRoleRef[];
  public readonly athenaUserRoles: MdaaRoleRef[];
  public readonly workgroupConfiguration: WorkgroupConfigurationConfig;
  public readonly verbatimPolicyNamePrefix?: string;
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.dataAdminRoles = this.configContents.dataAdminRoles;
    this.athenaUserRoles = this.configContents.athenaUserRoles;
    this.workgroupConfiguration = this.configContents.workgroupConfiguration
      ? this.configContents.workgroupConfiguration
      : {};
    this.verbatimPolicyNamePrefix = this.configContents.verbatimPolicyNamePrefix;
  }
}

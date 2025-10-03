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
   * Q-ENHANCED-PROPERTY
   * Required array of admin role references with full access to Athena workgroup resources including management and configuration. Provides administrative permissions for workgroup management, cost control configuration, and user access administration.
   *
   * Use cases: Workgroup administration; Cost control management; User access administration
   *
   * AWS: AWS IAM roles with full Athena workgroup administrative access and management permissions
   *
   * Validation: Must be array of valid MdaaRoleRef objects; required; roles receive full workgroup administrative access
   **/
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of user role references with query execution access to the Athena workgroup for data analytics operations. Enables controlled access to workgroup resources for query execution, result retrieval, and data analysis workflows.
   *
   * Use cases: Query execution access; Data analytics operations; Controlled workgroup usage
   *
   * AWS: AWS IAM roles with Athena workgroup query execution and data access permissions
   *
   * Validation: Must be array of valid MdaaRoleRef objects; required; roles receive workgroup usage permissions
   **/
  readonly athenaUserRoles: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional workgroup configuration settings for query cost controls and performance optimization. Enables fine-tuned control over query execution limits, cost management, and performance characteristics for the workgroup.
   *
   * Use cases: Query cost control; Performance optimization; Resource usage management
   *
   * AWS: Amazon Athena workgroup configuration for cost controls and performance settings
   *
   * Validation: Must be valid WorkgroupConfigurationConfig if provided; enables cost and performance controls
   **/
  readonly workgroupConfiguration?: WorkgroupConfigurationConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional verbatim policy name prefix for cross-account policy portability bypassing MDAA naming conventions. Enables consistent policy naming across accounts for integration with SSO permission sets and cross-account access patterns.
   *
   * Use cases: Cross-account policy portability; SSO permission set integration; Consistent naming across accounts
   *
   * AWS: AWS IAM policy naming for cross-account consistency and SSO integration
   *
   * Validation: Must be valid policy name prefix if provided; used instead of MDAA naming for policy names
   **/
  readonly verbatimPolicyNamePrefix?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for Athena workgroup settings controlling query execution limits and cost management. Enables fine-grained control over query resource consumption and cost optimization for data analytics workloads.
 *
 * Use cases: Query cost control; Resource usage limits; Performance optimization for analytics workloads
 *
 * AWS: Configures Amazon Athena workgroup settings for cost controls and query execution limits
 *
 * Validation: All properties are optional; bytesScannedCutoffPerQuery must be positive integer if provided
 */
export interface WorkgroupConfigurationConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional upper limit for bytes scanned per query controlling cost and preventing runaway queries. Enables cost control by limiting the amount of data each query can scan, preventing expensive queries from consuming excessive resources.
   *
   * Use cases: Query cost control; Runaway query prevention; Resource usage optimization
   *
   * AWS: Amazon Athena workgroup bytes scanned cutoff for query cost control and resource limits
   *
   * Validation: Must be positive integer in bytes if provided; enforces per-query scanning limits
   **/
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

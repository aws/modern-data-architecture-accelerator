/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { BucketInventoryProps } from '@aws-mdaa/audit-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';

export interface AuditConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of role references with read access to audit logs enabling controlled access to audit data for compliance and security analysis. Provides secure access to audit trails for authorized personnel and compliance monitoring systems.
   *
   * Use cases: Controlled audit access; Compliance monitoring; Security analysis; Audit trail review and investigation
   *
   * AWS: AWS IAM roles with S3 and Athena access for audit log reading and analysis
   *
   * Validation: Must be array of valid MdaaRoleRef objects if provided; roles receive read access to audit infrastructure
   **/
  readonly readRoles?: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of source account IDs from which audit logs will be accepted enabling cross-account audit log aggregation. Provides centralized audit collection from multiple AWS accounts for organizational audit trails.
   *
   * Use cases: Cross-account audit aggregation; Centralized audit collection; Multi-account compliance monitoring
   *
   * AWS: AWS S3 bucket policies for cross-account audit log delivery and aggregation
   *
   * Validation: Must be array of valid AWS account IDs if provided; enables cross-account audit log acceptance
   **/
  readonly sourceAccounts?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of source regions from which audit logs will be accepted enabling multi-region audit log collection. Provides regional audit coverage for global AWS deployments and multi-region compliance requirements.
   *
   * Use cases: Multi-region audit collection; Global audit coverage; Regional compliance monitoring
   *
   * AWS: AWS S3 bucket policies for multi-region audit log delivery and regional coverage
   *
   * Validation: Must be array of valid AWS region names if provided; enables multi-region audit log acceptance
   **/
  readonly sourceRegions?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional S3 prefix specification for inventory data organization within the audit bucket enabling structured inventory management. Provides organized storage of S3 inventory reports for audit analysis and compliance reporting.
   *
   * Use cases: Inventory data organization; Structured audit storage; S3 inventory management and analysis
   *
   * AWS: AWS S3 bucket prefix configuration for inventory data organization and management
   *
   * Validation: Must be valid S3 prefix string if provided; defines inventory data storage organization
   **/
  readonly inventoryPrefix?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of bucket inventory configurations enabling S3 inventory tracking and audit analysis. Provides detailed inventory reporting for S3 buckets across the organization for compliance and audit purposes.
   *
   * Use cases: S3 inventory tracking; bucket auditing; Storage compliance monitoring
   *
   * AWS: AWS S3 inventory configuration for bucket tracking and audit analysis
   *
   * Validation: Must be array of valid BucketInventoryProps if provided; defines S3 inventory tracking configuration
   **/
  readonly inventories?: BucketInventoryProps[];
}

export class AuditConfigParser extends MdaaAppConfigParser<AuditConfigContents> {
  public readonly readRoleRefs: MdaaRoleRef[];
  public readonly sourceAccounts: string[];
  public readonly sourceRegions: string[];
  public readonly inventoryPrefix: string;
  public readonly inventories?: BucketInventoryProps[];

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.readRoleRefs = this.configContents.readRoles ? this.configContents.readRoles : [];
    this.sourceAccounts = this.configContents.sourceAccounts ? this.configContents.sourceAccounts : [];
    this.sourceRegions = this.configContents.sourceRegions ? this.configContents.sourceRegions : [];
    this.inventoryPrefix = this.configContents.inventoryPrefix ? this.configContents.inventoryPrefix : 'inventory/';
    this.inventories = this.configContents.inventories;
  }
}

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
   * Roles granted read access to audit logs and decrypt access to the audit KMS key.
   * The audit module deploys a KMS-encrypted S3 bucket for CloudTrail logs and
   * Glue/Athena tables for querying — read roles get access to both.
   *
   * Use cases: Compliance team audit access; Security investigation read access; Cross-team log sharing
   *
   * AWS: IAM roles, S3 bucket policy, KMS key policy
   *
   * Validation: Optional; array of MdaaRoleRef; supports id, arn, and name references
   */
  readonly readRoles?: MdaaRoleRef[];
  /**
   * Additional AWS account IDs from which CloudTrail logs and S3 inventories are accepted.
   * The local account is granted access automatically.
   *
   * Use cases: Cross-account CloudTrail aggregation; Multi-account S3 inventory collection
   *
   * AWS: S3 bucket policy conditions scoped per source account
   *
   * Validation: Optional; array of 12-digit AWS account ID strings
   */
  readonly sourceAccounts?: string[];
  /**
   * Additional AWS regions from which CloudTrail logs and S3 inventories are accepted.
   * The local region is granted access automatically.
   *
   * Use cases: Multi-region CloudTrail collection; Global audit centralization
   *
   * AWS: S3 bucket policy, Glue audit table partitioned by region
   *
   * Validation: Optional; array of valid AWS region names (e.g. "us-east-1")
   */
  readonly sourceRegions?: string[];
  /**
   * S3 key prefix under which inventory reports are permitted to be written.
   * Controls the bucket policy prefix scope for inventory delivery.
   *
   * Use cases: Inventory data isolation; Prefix-scoped access control
   *
   * AWS: S3 bucket policy prefix, inventory delivery path
   *
   * Validation: Optional; string; must be a valid S3 prefix
   * @default "inventory/"
   */
  readonly inventoryPrefix?: string;
  /**
   * Bucket inventories queryable via the Glue/Athena inventory table.
   * Each entry identifies a source bucket and inventory configuration by
   * "<source_bucket>/<source_inventory_id>" format parsed into BucketInventoryProps.
   *
   * Use cases: S3 inventory auditing via Athena; Cross-bucket inventory aggregation
   *
   * AWS: Glue table, S3 inventory configuration
   *
   * Validation: Optional; array of BucketInventoryProps (bucketName + inventoryName)
   */
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

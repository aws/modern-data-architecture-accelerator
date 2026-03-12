/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { CatalogAccessPolicyProps } from '@aws-mdaa/glue-catalog-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface GlueCatalogConfigContents extends MdaaBaseConfigContents {
  /**
   * Named catalog access policies for fine-grained resource-level access control.
   * Each policy defines read/write principal ARNs scoped to specific catalog resource ARNs
   * (databases, tables, partitions). The Glue Catalog module deploys a KMS-encrypted catalog
   * with resource policies for cross-account data mesh architectures.
   *
   * Use cases: Resource-scoped read/write permissions; Cross-account catalog access; Fine-grained data governance
   *
   * AWS: Glue Catalog resource policies with IAM principal-based access control
   *
   * Validation: Optional; map of string keys to CatalogAccessPolicyProps
   */
  readonly accessPolicies?: { [key: string]: CatalogAccessPolicyProps };
  /**
   * Consumer accounts granted read access to the entire Glue Catalog via catalog resource policy.
   * Each entry maps a friendly account name to an AWS account ID. Consumer accounts also receive
   * KMS key usage permissions for decrypting catalog metadata.
   *
   * Use cases: Data mesh consumer nodes; Hub/spoke catalog sharing; Cross-account data discovery
   *
   * AWS: Glue Catalog resource policy and KMS key policy grants per consumer account
   *
   * Validation: Optional; map of string keys to 12-digit AWS account IDs
   */
  readonly consumerAccounts?: { [key: string]: string };
  /**
   * Accounts granted access to the catalog KMS encryption key only, without catalog read access.
   * Useful when accounts need to decrypt catalog-encrypted data but should not browse the catalog directly.
   *
   * Use cases: Selective encryption key sharing; Decrypt-only cross-account access; Limited key permissions
   *
   * AWS: KMS key policy grants for Glue Catalog encryption key
   *
   * Validation: Optional; map of string keys to 12-digit AWS account IDs
   */
  readonly kmsKeyConsumerAccounts?: { [key: string]: string };
  /**
   * Producer accounts for which additional Athena data source catalogs are created in the deployment account.
   * Each entry maps a friendly account name to the producer's AWS account ID. Does not grant access
   * to the producer catalog unless separately configured on the producer side.
   *
   * Use cases: Data mesh producer nodes; Federated Athena queries across accounts; Multi-catalog analytics
   *
   * AWS: Athena CfnDataCatalog resources pointing to producer account Glue Catalogs
   *
   * Validation: Optional; map of string keys to 12-digit AWS account IDs
   */
  readonly producerAccounts?: { [key: string]: string };
}

export class GlueCatalogConfigParser extends MdaaAppConfigParser<GlueCatalogConfigContents> {
  public readonly accessPolicies?: { [key: string]: CatalogAccessPolicyProps };
  public readonly consumerAccounts?: { [key: string]: string };
  public readonly producerAccounts?: { [key: string]: string };
  public readonly kmsKeyConsumerAccounts?: { [key: string]: string };

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.accessPolicies = this.configContents.accessPolicies;
    this.consumerAccounts = this.configContents.consumerAccounts;
    this.kmsKeyConsumerAccounts = this.configContents.kmsKeyConsumerAccounts;
    this.producerAccounts = this.configContents.producerAccounts;
  }
}

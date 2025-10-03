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
   * Q-ENHANCED-PROPERTY
   * Optional map of named catalog access policies enabling fine-grained access control for specific databases, tables, and resources. Provides access policy configuration for granular permissions management and resource-specific access controls within the catalog.
   *
   * Use cases: Fine-grained access control; Resource-specific permissions; Granular catalog access management
   *
   * AWS: AWS Glue Catalog resource policies for fine-grained access control and permissions management
   *
   * Validation: Must be object with string keys and valid CatalogAccessPolicyProps values if provided; defines granular access controls
   *   **/
  readonly accessPolicies?: { [key: string]: CatalogAccessPolicyProps };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of consumer account names to account IDs enabling cross-account read access to the entire Glue Catalog. Provides catalog sharing for data mesh architectures and cross-account data discovery and analytics operations.
   *
   * Use cases: Cross-account catalog sharing; Data mesh architecture; Cross-account data discovery and analytics
   *
   * AWS: AWS Glue Catalog cross-account permissions for catalog access and data sharing
   *
   * Validation: Must be object with string keys and valid AWS account ID values if provided; enables cross-account catalog access
   *   **/
  readonly consumerAccounts?: { [key: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of KMS key consumer account names to account IDs enabling cross-account access to catalog encryption keys only. Provides selective KMS key access for accounts that need encryption key permissions without full catalog access.
   *
   * Use cases: Selective KMS key access; Encryption key sharing; Limited cross-account key permissions
   *
   * AWS: AWS KMS key policies for Glue Catalog encryption key cross-account access and permissions
   *
   * Validation: Must be object with string keys and valid AWS account ID values if provided; enables cross-account key access
   *   **/
  readonly kmsKeyConsumerAccounts?: { [key: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of producer account names to catalog account IDs enabling integration with external catalogs as additional Athena data sources. Provides multi-catalog integration for federated queries and cross-catalog data access patterns.
   *
   * Use cases: Multi-catalog integration; Federated query access; Cross-catalog data source integration
   *
   * AWS: Amazon Athena catalog configuration for multi-catalog integration and federated query capabilities
   *
   * Validation: Must be object with string keys and valid AWS account ID values if provided; defines external catalog integration
   *   **/
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

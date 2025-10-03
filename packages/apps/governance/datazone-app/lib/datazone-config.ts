/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';
import { NamedDomainsProps } from '@aws-mdaa/datazone-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';

export interface DataZoneConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of domain names to DataZone domain configurations enabling data catalog and governance management. Provides complete domain setup with data discovery, catalog integration, and governance capabilities for enterprise data management.
   *
   * Use cases: Data catalog management; Domain-driven governance; Enterprise data discovery and organization
   *
   * AWS: Amazon DataZone domains for data catalog and governance management
   *
   * Validation: Must be valid NamedDomainsProps; required; defines all DataZone domain configurations and capabilities
   *   **/
  readonly domains: NamedDomainsProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for Glue catalog encryption enabling secure data catalog operations with customer-controlled encryption. Provides encryption at rest for Glue catalog metadata and data governance information within DataZone integration.
   *
   * Use cases: Data catalog encryption; Secure metadata management; Customer-controlled key management for governance
   *
   * AWS: AWS KMS key for Glue catalog encryption in DataZone integration and secure metadata management
   *
   * Validation: Must be valid KMS key ARN if provided; enables secure Glue catalog integration with DataZone
   **/
  readonly glueCatalogKmsKeyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Lake Formation management access role reference enabling DataZone integration with Lake Formation access control. Provides role-based integration between DataZone and Lake Formation for data governance and access management.
   *
   * Use cases: Lake Formation integration; data governance; Integrated access control across data services
   *
   * AWS: AWS IAM role for DataZone and Lake Formation integration and governance
   *
   * Validation: Must be valid MdaaRoleRef if provided; enables integrated governance between DataZone and Lake Formation
   **/
  readonly lakeformationManageAccessRole?: MdaaRoleRef;
}

export class DataZoneConfigParser extends MdaaAppConfigParser<DataZoneConfigContents> {
  public readonly glueCatalogKmsKeyArn?: string;
  public readonly domains: NamedDomainsProps;
  readonly lakeformationManageAccessRole?: MdaaRoleRef;
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.glueCatalogKmsKeyArn = this.configContents.glueCatalogKmsKeyArn;
    this.lakeformationManageAccessRole = this.configContents.lakeformationManageAccessRole;
    this.domains = this.configContents.domains;
  }
}

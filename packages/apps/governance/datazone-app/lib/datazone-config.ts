/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';

import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { NamedDataZoneDomainProps } from '@aws-mdaa/datazone-l3-construct';

export interface DataZoneConfigContents extends MdaaBaseConfigContents {
  /**
   * Map of domain names to DataZone domain configurations. The DataZone module
   * deploys domains with KMS encryption, execution roles, domain buckets,
   * user/group profiles, domain units, and optional cross-account associations.
   *
   * Use cases: Multi-domain deployment; Data catalog governance; Enterprise data discovery
   *
   * AWS: DataZone domains, KMS CMKs, IAM execution roles, S3 domain buckets
   *
   * Validation: Required; valid NamedDataZoneDomainProps
   */
  readonly domains: NamedDataZoneDomainProps;
  /**
   * KMS key ARN for Glue catalog encryption in this account. If omitted,
   * looked up from the standard LF Settings SSM parameter.
   *
   * Use cases: Customer-managed Glue catalog encryption; Compliance-driven key management
   *
   * AWS: KMS key for Glue Data Catalog encryption
   *
   * Validation: Optional; valid KMS key ARN
   */
  readonly glueCatalogKmsKeyArn?: string;
  /**
   * IAM role for Lake Formation permission management across all domains.
   * Should be an LF Admin role, typically created by the LF Settings module.
   * If omitted, looked up from the standard LF Settings SSM parameter.
   *
   * Use cases: DataZone-LakeFormation integration; Automated LF permission grants
   *
   * AWS: IAM role for Lake Formation access management
   *
   * Validation: Optional; valid MdaaRoleRef
   */
  readonly lakeformationManageAccessRole?: MdaaRoleRef;
}

export class DataZoneConfigParser extends MdaaAppConfigParser<DataZoneConfigContents> {
  public readonly glueCatalogKmsKeyArn?: string;
  public readonly dataZoneDomains: NamedDataZoneDomainProps;
  readonly lakeformationManageAccessRole?: MdaaRoleRef;
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.glueCatalogKmsKeyArn = this.configContents.glueCatalogKmsKeyArn;
    this.lakeformationManageAccessRole = this.configContents.lakeformationManageAccessRole;
    this.dataZoneDomains = this.configContents.domains;
  }
}

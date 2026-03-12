/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';
import { IdentityCenterConfig } from '@aws-mdaa/lakeformation-settings-l3-construct';

export interface LakeFormationSettingsConfigContents extends MdaaBaseConfigContents {
  /**
   * Lake Formation cross-account sharing version. Controls which cross-account
   * sharing features are available for data mesh and multi-account architectures.
   *
   * Use cases: Cross-account data sharing version pinning; Data mesh compatibility
   *
   * AWS: Lake Formation cross-account sharing version setting
   *
   * Validation: Optional; string; defaults to latest version if omitted
   */
  readonly crossAccountVersion?: string;
  /**
   * Roles granted full Lake Formation administrator access including permission
   * management, data access policies, and governance configuration.
   * Deploy this module once per account.
   *
   * Use cases: Data lake admin delegation; Lake Formation permission management
   *
   * AWS: Lake Formation DataLakeSettings admin roles
   *
   * Validation: Required; array of MdaaRoleRef; supports name, arn, and id references
   */
  readonly lakeFormationAdminRoles: MdaaRoleRef[];
  /**
   * When true, adds the CDK execution role as a Lake Formation admin so CDK
   * deployments can manage Lake Formation resources without manual setup.
   *
   * Use cases: CDK deployment automation; CI/CD Lake Formation management
   *
   * AWS: Lake Formation DataLakeSettings admin role (CDK deploy role)
   *
   * Validation: Optional; boolean
   * @default false
   */
  readonly createCdkLFAdmin?: boolean;
  /**
   * Controls whether IAM_ALLOWED_PRINCIPALS is added by default to new databases
   * and tables. When true, Lake Formation defers to IAM policies on Glue catalog
   * resources. When false, all permissions must be managed exclusively in Lake Formation.
   *
   * Use cases: IAM-based access backward compatibility; Strict Lake Formation governance
   *
   * AWS: Lake Formation DataLakeSettings default permissions
   *
   * Validation: Required; boolean
   */
  readonly iamAllowedPrincipalsDefault: boolean;

  /**
   * IAM Identity Center integration for Lake Formation, enabling SSO-based
   * data lake access and optional cross-account/org sharing via RAM.
   *
   * Use cases: SSO-based Lake Formation access; Cross-account data sharing via Identity Center
   *
   * AWS: IAM Identity Center, Lake Formation, RAM resource shares
   *
   * Validation: Optional; valid IdentityCenterConfig with required instanceId
   */
  readonly iamIdentityCenter?: IdentityCenterConfig;

  /**
   * When true, creates a dedicated Lake Formation admin role for DataZone
   * so DataZone can manage Lake Formation permissions in this account.
   *
   * Use cases: DataZone-managed Lake Formation governance; Cross-service permission coordination
   *
   * AWS: IAM role registered as Lake Formation admin for DataZone
   *
   * Validation: Optional; boolean
   * @default false
   */
  readonly createDataZoneAdminRole?: boolean;

  /**
   * Additional account IDs added to the DataZone admin role's trust policy,
   * allowing DataZone in those accounts to manage Lake Formation in this account.
   * Useful when this account is associated to a DataZone/SageMaker domain in another account.
   *
   * Use cases: Cross-account DataZone governance; Multi-account SageMaker domain integration
   *
   * AWS: IAM role trust policy, DataZone cross-account access
   *
   * Validation: Optional; array of AWS account ID strings; requires createDataZoneAdminRole
   */
  readonly dataZoneAdminTrustAccounts?: string[];
}

export class LakeFormationSettingsConfigParser extends MdaaAppConfigParser<LakeFormationSettingsConfigContents> {
  public readonly lakeFormationAdminRoleRefs: MdaaRoleRef[];
  public readonly createCdkLFAdmin?: boolean;
  public readonly iamAllowedPrincipalsDefault: boolean;
  public readonly iamIdentityCenter?: IdentityCenterConfig;
  public readonly createDataZoneAdminRole?: boolean;
  readonly dataZoneAdminTrustAccounts?: string[];
  /** Cross account sharing version. If not specified, defaults to latest. */
  public readonly crossAccountVersion?: string;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.lakeFormationAdminRoleRefs = this.configContents.lakeFormationAdminRoles;
    this.iamAllowedPrincipalsDefault = this.configContents.iamAllowedPrincipalsDefault;
    this.createCdkLFAdmin = this.configContents.createCdkLFAdmin;
    this.iamIdentityCenter = this.configContents.iamIdentityCenter;
    this.crossAccountVersion = this.configContents.crossAccountVersion;
    this.createDataZoneAdminRole = this.configContents.createDataZoneAdminRole;
    this.dataZoneAdminTrustAccounts = this.configContents.dataZoneAdminTrustAccounts;
  }
}

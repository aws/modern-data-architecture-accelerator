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
   * An array of role references to Lake Formation admin roles
   */
  readonly lakeFormationAdminRoles: MdaaRoleRef[];
  /**
   * If true (default false), then CDK Exec Role will be automatically added as a LF Admin
   */
  readonly createCdkLFAdmin?: boolean;
  /**
   * If true, sets IAM_ALLOW_PRINCIPALS by default on all new databases/tables
   */
  readonly iamAllowedPrincipalsDefault: boolean;

  /**
   * If provided, will configure LakeFormation and IAMIdentityCenter integration
   */
  readonly iamIdentityCenter?: IdentityCenterConfig;
}

export class LakeFormationSettingsConfigParser extends MdaaAppConfigParser<LakeFormationSettingsConfigContents> {
  public readonly lakeFormationAdminRoleRefs: MdaaRoleRef[];
  public readonly createCdkLFAdmin?: boolean;
  public readonly iamAllowedPrincipalsDefault: boolean;
  public readonly iamIdentityCenter?: IdentityCenterConfig;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.lakeFormationAdminRoleRefs = this.configContents.lakeFormationAdminRoles;
    this.iamAllowedPrincipalsDefault = this.configContents.iamAllowedPrincipalsDefault;
    this.createCdkLFAdmin = this.configContents.createCdkLFAdmin;
    this.iamIdentityCenter = this.configContents.iamIdentityCenter;
  }
}

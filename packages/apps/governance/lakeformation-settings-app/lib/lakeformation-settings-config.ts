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
   * Q-ENHANCED-PROPERTY
   * Optional cross-account sharing version specification controlling Lake Formation cross-account data sharing capabilities. Determines the version of cross-account sharing features available for data mesh and multi-account data lake architectures.
   *
   * Use cases: Cross-account data sharing; Data mesh architecture; Multi-account Lake Formation governance
   *
   * AWS: AWS Lake Formation cross-account sharing version configuration for data sharing capabilities
   *
   * Validation: Must be valid Lake Formation sharing version if provided; defaults to latest version
   **/
  readonly crossAccountVersion?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of Lake Formation admin role references with full administrative access to data lake governance and permissions management. Provides administrative control over Lake Formation permissions, data access policies, and governance configurations.
   *
   * Use cases: Data lake governance administration; Permission management; Lake Formation administrative control
   *
   * AWS: AWS Lake Formation admin roles for data lake governance and permission management
   *
   * Validation: Must be array of valid MdaaRoleRef objects; required; roles receive full Lake Formation administrative access
   **/
  readonly lakeFormationAdminRoles: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag enabling automatic addition of CDK execution role as Lake Formation admin for deployment and management operations. Enables seamless CDK-based Lake Formation resource management and deployment automation.
   *
   * Use cases: CDK deployment automation; Lake Formation resource management; Automated deployment permissions
   *
   * AWS: AWS Lake Formation admin role configuration for CDK execution and deployment automation
   *
   * Validation: Boolean value; defaults to false; enables CDK execution role as Lake Formation admin when true
   **/
  readonly createCdkLFAdmin?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Required flag controlling default IAM principal access behavior for new databases and tables in Lake Formation. When enabled, sets IAM_ALLOW_PRINCIPALS as default permission mode for backward compatibility with IAM-based access patterns.
   *
   * Use cases: IAM compatibility mode; Default permission behavior; Backward compatibility with existing IAM patterns
   *
   * AWS: AWS Lake Formation default permission mode for IAM principal access and compatibility
   *
   * Validation: Boolean value; required; controls default permission behavior for new Lake Formation resources
   **/
  readonly iamAllowedPrincipalsDefault: boolean;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM Identity Center integration configuration enabling centralized identity management and SSO integration with Lake Formation. Provides seamless integration between Lake Formation permissions and organizational identity systems.
   *
   * Use cases: Centralized identity management; SSO integration; Organizational identity system integration
   *
   * AWS: AWS IAM Identity Center integration with Lake Formation for centralized identity and SSO
   *
   * Validation: Must be valid IdentityCenterConfig if provided; enables Identity Center integration and SSO
   **/
  readonly iamIdentityCenter?: IdentityCenterConfig;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag enabling creation of dedicated Lake Formation admin role for DataZone integration and cross-service governance coordination. Enables DataZone to manage Lake Formation permissions and coordinate data governance across services.
   *
   * Use cases: DataZone integration; Cross-service governance; Automated permission management between DataZone and Lake Formation
   *
   * AWS: AWS Lake Formation admin role for DataZone integration and cross-service governance coordination
   *
   * Validation: Boolean value; creates dedicated DataZone admin role when enabled; enables cross-service governance
   **/
  readonly createDataZoneAdminRole?: boolean;

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

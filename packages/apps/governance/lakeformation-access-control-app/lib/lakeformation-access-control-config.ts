/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import {
  LakeFormationAccessControlL3Construct,
  NamedGrantProps,
  NamedPrincipalProps,
  NamedResourceLinkProps,
  PermissionsConfig,
  ResourceLinkProps,
} from '@aws-mdaa/lakeformation-access-control-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

/**
 * Defines a Lake Formation principal for config-level grant assignment.
 * Supports federated groups, federated users, and IAM roles. Federated principals
 * require a matching federationProvider name from the federationProviders config section.
 *
 * Use cases: Federated group access; Individual user permissions; IAM role-based grants
 *
 * AWS: Lake Formation principals (federated via IAM SAML providers or direct IAM roles)
 *
 * Validation: At least one principal type required; federationProvider must reference a configured provider
 */
export interface PrincipalConfig {
  /**
   * Federated group name for group-based Lake Formation permissions.
   * Resolved with the referenced federationProvider to construct the principal identity.
   *
   * Use cases: Active Directory group access; Enterprise group-based governance
   *
   * AWS: Lake Formation federated group principal via IAM SAML provider
   *
   * Validation: Optional; requires federationProvider when specified
   */
  readonly federatedGroup?: string;
  /**
   * Federated user name for individual Lake Formation permissions.
   * Resolved with the referenced federationProvider to construct the principal identity.
   *
   * Use cases: Individual user data access; Federated user-specific permissions
   *
   * AWS: Lake Formation federated user principal via IAM SAML provider
   *
   * Validation: Optional; requires federationProvider when specified
   */
  readonly federatedUser?: string;
  /**
   * Logical name of a federation provider defined in the federationProviders config section.
   * Resolved to the provider ARN at deployment time.
   *
   * Use cases: SAML provider reference; Identity provider mapping
   *
   * AWS: IAM SAML identity provider reference
   *
   * Validation: Optional; must match a key in federationProviders if specified
   */
  readonly federationProvider?: string;
  /**
   * IAM role reference for role-based Lake Formation permissions.
   * Can be specified by ARN, name, or SSM parameter reference.
   *
   * Use cases: IAM role-based data access; Service role permissions; Cross-account role grants
   *
   * AWS: IAM role for Lake Formation grant assignment
   *
   * Validation: Optional; valid MdaaRoleRef
   */
  readonly role?: MdaaRoleRef;
}

/**
 * Defines a Lake Formation grant with database/table scope and permission level.
 * Grants are applied to existing Glue databases and optionally scoped to specific tables.
 * Permission levels ('read', 'write', 'super') map to Lake Formation permission arrays.
 *
 * Use cases: Database-scoped read access; Table-level write permissions; Super-user grants for admin principals
 *
 * AWS: Lake Formation CfnPrincipalPermissions for database and table grants
 *
 * Validation: database and principals required; permission levels default to 'read'
 */
export interface GrantConfig {
  /**
   * Target Glue database name for the grant. Must already exist in the Glue Catalog.
   *
   * Use cases: Database-scoped permissions; Grant target specification
   *
   * AWS: Glue database for Lake Formation grant application
   *
   * Validation: Required; existing Glue database name
   */
  readonly database: string;
  /**
   * Database-level permission level. Maps to Lake Formation permissions:
   * 'read' → [DESCRIBE], 'write' → [DESCRIBE, CREATE_TABLE, ALTER], 'super' → [DESCRIBE, CREATE_TABLE, ALTER, DROP].
   *
   * Use cases: Database read access; Schema management permissions; Full database admin
   *
   * AWS: Lake Formation database permissions
   *
   * Validation: Optional; 'read' | 'write' | 'super'
   * @default 'read'
   */
  readonly databasePermissions?: PermissionsConfig;
  /**
   * Table names within the database for table-level grants.
   * Use '*' to grant on all tables. If omitted, only database-level permissions apply.
   *
   * Use cases: Table-level access control; Selective table permissions; Wildcard table grants
   *
   * AWS: Glue table names for Lake Formation table-level grants
   *
   * Validation: Optional; array of existing table names or '*'
   */
  readonly tables?: string[];
  /**
   * Table-level permission level. Maps to Lake Formation permissions:
   * 'read' → [SELECT, DESCRIBE], 'write' → [SELECT, DESCRIBE, INSERT, DELETE],
   * 'super' → [SELECT, DESCRIBE, INSERT, DELETE, ALTER, DROP].
   *
   * Use cases: Table read access; Data write permissions; Full table admin
   *
   * AWS: Lake Formation table permissions
   *
   * Validation: Optional; 'read' | 'write' | 'super'
   * @default 'read'
   */
  readonly tablePermissions?: PermissionsConfig;
  /**
   * Logical principal names referencing entries in the principals configuration.
   * Each named principal receives the specified database and table permissions.
   *
   * Use cases: Multi-principal grants; Group and role permission assignment
   *
   * AWS: Lake Formation grant recipients
   *
   * Validation: Required; array of keys from the principals map
   */
  readonly principals: string[];
}

/**
 * Maps federation provider logical names to IAM SAML identity provider ARNs.
 * Referenced by PrincipalConfig.federationProvider to resolve federated principal identities.
 *
 * Use cases: SAML provider registration; Multi-provider federation; Identity system mapping
 *
 * AWS: IAM SAML identity provider ARNs (arn:aws:iam::account:saml-provider/name)
 *
 * Validation: String keys to valid IAM identity provider ARNs
 */
export interface FederationProviderConfig {
  [key: string]: string;
}
/**
 * Defines a Lake Formation resource link for cross-account database sharing.
 * Resource links create local references to databases in other accounts,
 * enabling cross-account queries and data sharing with controlled DESCRIBE permissions.
 *
 * Use cases: Cross-account database sharing; Data mesh resource linking; Federated catalog access
 *
 * AWS: Lake Formation resource links (CfnDatabase with TargetDatabase)
 *
 * Validation: targetDatabase required; account IDs must be valid 12-digit AWS account IDs
 */
export interface ResourceLinkConfig {
  /**
   * Name of the target database to link to. Must exist in the target account's Glue Catalog.
   *
   * Use cases: Cross-account database reference; Resource link target specification
   *
   * AWS: Glue database name in the target account
   *
   * Validation: Required; existing database name
   */
  readonly targetDatabase: string;
  /**
   * AWS account ID where the target database exists.
   * Required for cross-account resource links.
   *
   * Use cases: Cross-account database sharing; Multi-account data access
   *
   * AWS: Source account for Lake Formation resource link
   *
   * Validation: Optional; 12-digit AWS account ID
   */
  readonly targetAccount?: string;
  /**
   * AWS account ID where the resource link will be created.
   * If omitted, the resource link is created in the local (deployment) account.
   *
   * Use cases: Remote resource link deployment; Cross-account link placement
   *
   * AWS: Destination account for resource link creation
   *
   * Validation: Optional; 12-digit AWS account ID
   * @default local account
   */
  readonly fromAccount?: string;
  /**
   * Logical principal names granted DESCRIBE access to the resource link.
   * References entries in the principals configuration map.
   *
   * Use cases: Resource link visibility control; Metadata access permissions
   *
   * AWS: Lake Formation DESCRIBE grants on resource link
   *
   * Validation: Optional; array of keys from the principals map
   */
  readonly grantPrincipals?: string[];
}

export interface LakeFormationAccessControlConfigContents extends MdaaBaseConfigContents {
  /**
   * Named Lake Formation grant configurations defining database/table-level access control.
   * Each grant specifies a target database, optional tables, permission levels, and recipient principals.
   * The module deploys CfnPrincipalPermissions resources for each grant/principal combination.
   *
   * Use cases: Database-scoped read access; Table-level write permissions; Multi-principal grant management
   *
   * AWS: Lake Formation CfnPrincipalPermissions for database and table grants
   *
   * Validation: Required; map of string keys to GrantConfig
   */
  readonly grants: { [key: string]: GrantConfig };
  /**
   * Named principal definitions for Lake Formation grant assignment.
   * Each principal can be a federated group, federated user, or IAM role.
   * Referenced by name in grant and resource link configurations.
   *
   * Use cases: Federated group/user access; IAM role-based grants; Multi-principal governance
   *
   * AWS: Lake Formation principals (federated via IAM SAML providers or direct IAM roles)
   *
   * Validation: Required; map of string keys to PrincipalConfig
   */
  readonly principals: { [key: string]: PrincipalConfig };
  /**
   * Maps federation provider logical names to IAM SAML identity provider ARNs.
   * Referenced by PrincipalConfig.federationProvider to resolve federated identities.
   *
   * Use cases: SAML provider registration; Multi-provider federation; Identity system mapping
   *
   * AWS: IAM SAML identity provider ARNs
   *
   * Validation: Optional; map of string keys to valid IAM identity provider ARNs
   */
  readonly federationProviders?: FederationProviderConfig;
  /**
   * Named resource link configurations for cross-account database sharing.
   * Each resource link creates a local Glue database reference pointing to a database
   * in another account, with optional DESCRIBE grants for specified principals.
   *
   * Use cases: Cross-account database sharing; Data mesh resource linking; Federated catalog access
   *
   * AWS: Lake Formation resource links (CfnDatabase with TargetDatabase)
   *
   * Validation: Optional; map of string keys to ResourceLinkConfig
   */
  readonly resourceLinks?: { [key: string]: ResourceLinkConfig };
}

export class LakeFormationAccessControlConfigParser extends MdaaAppConfigParser<LakeFormationAccessControlConfigContents> {
  public readonly grants: NamedGrantProps;
  public readonly resourceLinks?: NamedResourceLinkProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    const resourceLinkPropsEntries = Object.entries(this.configContents.resourceLinks || {}).map(resourceLinkEntry => {
      const configResourceLinkName = resourceLinkEntry[0];
      const configResourceLink = resourceLinkEntry[1];

      const principals: NamedPrincipalProps = this.resolvePrincipals(configResourceLink.grantPrincipals || []);

      const resourceLinkProps: ResourceLinkProps = {
        targetDatabase: configResourceLink.targetDatabase,
        targetAccount: configResourceLink.targetAccount,
        grantPrincipals: principals,
        fromAccount: configResourceLink.fromAccount,
      };

      return [configResourceLinkName, resourceLinkProps];
    });

    this.resourceLinks = Object.fromEntries(resourceLinkPropsEntries);

    this.grants = Object.fromEntries(
      Object.entries(this.configContents.grants).map(configGrantEntry => {
        const configGrantName = configGrantEntry[0];
        const configGrant = configGrantEntry[1];
        const principals = this.resolvePrincipals(configGrant.principals);
        return [
          configGrantName,
          {
            ...configGrant,
            databasePermissions:
              LakeFormationAccessControlL3Construct.DATABASE_PERMISSIONS_MAP[configGrant.databasePermissions || 'read'],
            tablePermissions:
              LakeFormationAccessControlL3Construct.TABLE_PERMISSIONS_MAP[configGrant.tablePermissions || 'read'],
            principals: principals,
          },
        ];
      }),
    );
  }
  private resolvePrincipals(principals: string[]) {
    const resolvedPrincipals: NamedPrincipalProps = Object.fromEntries(
      principals.map(configPrincipalName => {
        const configPrincipal = this.configContents.principals[configPrincipalName];
        const federationProviderArn =
          configPrincipal.federationProvider && this.configContents.federationProviders
            ? this.configContents.federationProviders[configPrincipal.federationProvider]
            : undefined;
        if (configPrincipal.federationProvider && !federationProviderArn) {
          throw new Error(`Failed to resolve federation provider in config: ${configPrincipal.federationProvider}`);
        }
        return [
          configPrincipalName,
          {
            ...configPrincipal,
            federationProviderArn: federationProviderArn,
          },
        ];
      }),
    );
    return resolvedPrincipals;
  }
}

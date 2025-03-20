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

export interface PrincipalConfig {
  /**
   * Federated group name for the grant.
   */
  readonly federatedGroup?: string;
  /**
   * Federated user name for the grant.
   */
  readonly federatedUser?: string;
  /**
   * Name of the federation provider from the federationProviders section of the config
   */
  readonly federationProvider?: string;
  /**
   * Arn of an IAM principal for the grant.
   */
  readonly role?: MdaaRoleRef;
}

export interface GrantConfig {
  /**
   * Name of the existing Glue Database to perform the grant against.
   */
  readonly database: string;
  /**
   * Permissions to Grant on database.  Must be 'read', 'write', or 'super'. Defaults to 'read'.
   */
  readonly databasePermissions?: PermissionsConfig;
  /**
   * Array of strings representing Tables to perform the grant against.  Use a '*' for all tables.
   */
  readonly tables?: string[];
  /**
   * Permissions to Grant on tables.  Must be 'read', 'write', or 'super'. Defaults to 'read'.
   */
  readonly tablePermissions?: PermissionsConfig;
  /**
   * Array of strings representing principals to grant permissions to.  These must exist in the 'principals:' section.
   */
  readonly principals: string[];
}

export interface FederationProviderConfig {
  [key: string]: string;
}

export interface ResourceLinkConfig {
  /**
   * Name of the target database
   */
  readonly targetDatabase: string;
  /**
   * The account where the target database exists
   */
  readonly targetAccount?: string;
  /**
   * The account in which the resource link should be created.
   * If not specified, will default to the local account.
   */
  readonly fromAccount?: string;
  /**
   * Array of strings representing principals to grant resource link DESCRIBE permissions to.
   */
  readonly grantPrincipals?: string[];
}

export interface LakeFormationAccessControlConfigContents extends MdaaBaseConfigContents {
  /**
   * Array of Objects representing the grants
   */
  readonly grants: { [key: string]: GrantConfig };
  /**
   * Object representing the active directory users, groups, and federation provider used
   */
  readonly principals: { [key: string]: PrincipalConfig };
  /**
   * Maps of Federation providers used in the principals: section to ARNs in IAM
   */
  readonly federationProviders?: FederationProviderConfig;
  /**
   * Resource links which will be created in the local account.
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

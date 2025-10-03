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
 * Q-ENHANCED-INTERFACE
 * Configuration interface for Lake Formation principal management enabling identity and access control configuration. Defines principal types including federated users, groups, and IAM roles for flexible Lake Formation permission management across different identity systems.
 *
 * Use cases: Identity management; Federated access control; Cross-identity system integration
 *
 * AWS: Configures AWS Lake Formation principals for identity-based access control and permission management
 *
 * Validation: At least one principal type must be specified; federationProvider must exist if referenced
 */
export interface PrincipalConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional federated group name for Lake Formation grants enabling group-based access control through identity federation. Provides group-level permissions for federated identity systems integrated with Lake Formation for scalable access management.
   *
   * Use cases: Group-based access control; Federated identity integration; Scalable permission management
   *
   * AWS: AWS Lake Formation federated group principals for identity-based access control
   *
   * Validation: Must be valid federated group name if provided; requires federationProvider configuration
   **/
  readonly federatedGroup?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional federated user name for Lake Formation grants enabling individual user access control through identity federation. Provides user-specific permissions for federated identity systems integrated with Lake Formation for granular access management.
   *
   * Use cases: Individual user access; Federated identity integration; Granular permission management
   *
   * AWS: AWS Lake Formation federated user principals for identity-based access control
   *
   * Validation: Must be valid federated user name if provided; requires federationProvider configuration
   **/
  readonly federatedUser?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional federation provider name reference linking to configured identity providers enabling federated access integration. References federation provider configuration for identity system integration with Lake Formation permissions.
   *
   * Use cases: Identity provider integration; Federated access configuration; Cross-system identity management
   *
   * AWS: AWS IAM identity provider integration for Lake Formation federated access
   *
   * Validation: Must reference valid federation provider from federationProviders configuration if provided
   **/
  readonly federationProvider?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM role reference for Lake Formation grants enabling role-based access control within AWS identity systems. Provides IAM role-based permissions for native AWS identity integration with Lake Formation access management.
   *
   * Use cases: IAM role-based access; Native AWS identity integration; Role-based permission management
   *
   * AWS: AWS IAM roles for Lake Formation role-based access control and permission management
   *
   * Validation: Must be valid MdaaRoleRef if provided; enables IAM role-based Lake Formation access
   **/
  readonly role?: MdaaRoleRef;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for Lake Formation permission grants enabling database and table-level access control. Defines granular permissions for databases, tables, and principals with flexible permission levels for fine-grained data governance.
 *
 * Use cases: Granular data access control; Database and table permissions; Fine-grained data governance
 *
 * AWS: Configures AWS Lake Formation grants for database and table-level access control and permissions
 *
 * Validation: database and principals are required; permission levels must be valid values
 */
export interface GrantConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required name of the existing Glue Database for Lake Formation grant application enabling database-level access control. Specifies the target database where permissions will be applied for data access governance and control.
   *
   * Use cases: Database-level access control; Target database specification; Data governance scope definition
   *
   * AWS: AWS Glue Database for Lake Formation grant target and access control scope
   *
   * Validation: Must be valid existing Glue Database name; required; defines grant target database
   **/
  readonly database: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional database permission level configuration enabling controlled database access with read, write, or super permissions. Defines the level of access granted to principals for database-level operations and management.
   *
   * Use cases: Database permission control; Access level management; Database operation authorization
   *
   * AWS: AWS Lake Formation database permissions for access level control and authorization
   *
   * Validation: Must be 'read', 'write', or 'super' if provided; defaults to 'read'; controls database access level
   *   **/
  readonly databasePermissions?: PermissionsConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of table names for Lake Formation grant application enabling table-level access control. Specifies target tables where permissions will be applied, with '*' wildcard support for all tables within the database.
   *
   * Use cases: Table-level access control; Granular table permissions; Wildcard table access management
   *
   * AWS: AWS Glue tables for Lake Formation grant targets and table-level access control
   *
   * Validation: Must be array of valid table names or '*' for all tables if provided; enables table-specific access
   **/
  readonly tables?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional table permission level configuration enabling controlled table access with read, write, or super permissions. Defines the level of access granted to principals for table-level operations and data management.
   *
   * Use cases: Table permission control; Data access level management; Table operation authorization
   *
   * AWS: AWS Lake Formation table permissions for data access level control and authorization
   *
   * Validation: Must be 'read', 'write', or 'super' if provided; defaults to 'read'; controls table access level
   **/
  readonly tablePermissions?: PermissionsConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of principal names for Lake Formation grant recipients enabling controlled access assignment. References configured principals who will receive the specified permissions for the database and table resources.
   *
   * Use cases: Permission recipient specification; Access assignment; Principal-based access control
   *
   * AWS: AWS Lake Formation grant principals for permission assignment and access control
   *
   * Validation: Must be array of valid principal names; required; principals must exist in principals configuration
   **/
  readonly principals: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for federation provider mapping enabling identity system integration with Lake Formation. Maps federation provider names to ARNs for seamless integration between external identity systems and AWS Lake Formation permissions.
 *
 * Use cases: Identity system integration; Federation provider mapping; External identity system connectivity
 *
 * AWS: Maps federation provider names to AWS IAM identity provider ARNs for Lake Formation integration
 *
 * Validation: Must be object with string keys and valid ARN values
 */
export interface FederationProviderConfig {
  [key: string]: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for Lake Formation resource link management enabling cross-account and cross-database data sharing. Defines resource links for sharing databases across accounts with controlled access and permission management.
 *
 * Use cases: Cross-account data sharing; Database resource linking; Controlled data access across accounts
 *
 * AWS: Configures AWS Lake Formation resource links for cross-account database sharing and access
 *
 * Validation: targetDatabase is required; accounts must be valid AWS account IDs if provided
 */
export interface ResourceLinkConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required name of the target database for resource link creation enabling cross-account database sharing. Specifies the source database that will be shared through the resource link for cross-account data access.
   *
   * Use cases: Cross-account database sharing; Target database specification; Resource link source definition
   *
   * AWS: AWS Lake Formation resource link target database for cross-account sharing
   *
   * Validation: Must be valid database name; required; defines the database to be shared via resource link
   **/
  readonly targetDatabase: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional target account ID where the source database exists enabling cross-account resource link configuration. Specifies the AWS account containing the database to be shared through the resource link.
   *
   * Use cases: Cross-account resource sharing; Source account specification; Multi-account data access
   *
   * AWS: AWS account ID for Lake Formation cross-account resource link configuration
   *
   * Validation: Must be valid AWS account ID if provided; defines source account for resource link
   **/
  readonly targetAccount?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional account ID where the resource link will be created enabling flexible resource link deployment. Specifies the destination account for resource link creation, defaulting to local account if not specified.
   *
   * Use cases: Resource link deployment control; Destination account specification; Flexible link placement
   *
   * AWS: AWS account ID for Lake Formation resource link deployment and management
   *
   * Validation: Must be valid AWS account ID if provided; defaults to local account for resource link creation
   **/
  readonly fromAccount?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of principal names for resource link DESCRIBE permissions enabling controlled resource link access. Grants DESCRIBE permissions to specified principals for resource link visibility and metadata access.
   *
   * Use cases: Resource link access control; Metadata access permissions; Controlled resource link visibility
   *
   * AWS: AWS Lake Formation resource link DESCRIBE permissions for access control
   *
   * Validation: Must be array of valid principal names if provided; principals must exist in principals configuration
   **/
  readonly grantPrincipals?: string[];
}

export interface LakeFormationAccessControlConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of grant names to Lake Formation grant configurations enabling database and table-level access control. Provides granular permission management for databases, tables, and principals with flexible access levels for fine-grained data governance.
   *
   * Use cases: Granular permission management; Database and table access control; Fine-grained data governance
   *
   * AWS: AWS Lake Formation grants for database and table-level access control
   *
   * Validation: Must be object with string keys and valid GrantConfig values; required; defines all permission grants
   *   **/
  readonly grants: { [key: string]: GrantConfig };
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of principal names to principal configurations enabling identity and access management. Defines all principals including federated users, groups, and IAM roles for flexible Lake Formation permission assignment across identity systems.
   *
   * Use cases: Identity management; Principal configuration; Cross-identity system integration
   *
   * AWS: AWS Lake Formation principals for identity-based access control and permission management
   *
   * Validation: Must be object with string keys and valid PrincipalConfig values; required; defines all access principals
   *   **/
  readonly principals: { [key: string]: PrincipalConfig };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of federation provider names to ARNs enabling identity system integration with Lake Formation. Maps external identity providers to AWS IAM identity provider ARNs for seamless federated access integration.
   *
   * Use cases: Identity system integration; Federation provider mapping; External identity connectivity
   *
   * AWS: AWS IAM identity provider ARNs for Lake Formation federated access integration
   *
   * Validation: Must be object with string keys and valid ARN values if provided; enables federated identity integration
   **/
  readonly federationProviders?: FederationProviderConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of resource link names to resource link configurations enabling cross-account database sharing and access. Provides controlled data sharing across AWS accounts with permission management and access control for collaborative data architectures.
   *
   * Use cases: Cross-account data sharing; Database resource linking; Collaborative data access across accounts
   *
   * AWS: AWS Lake Formation resource links for cross-account database sharing and controlled access
   *
   * Validation: Must be object with string keys and valid ResourceLinkConfig values if provided; enables cross-account sharing
   *   **/
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
        /**
         * Q-ENHANCED-PROPERTY
         * Required array of IAM principals to be granted access to the LakeFormation resource link enabling cross-account data sharing and access control. Defines the specific IAM principals that will receive permissions to access the shared database resource through the resource link.
         *
         * Use cases: Cross-account data sharing; Access control; Principal permission management; Data lake access; Resource link permissions
         *
         * AWS: AWS LakeFormation resource link principal grants for cross-account database access and data sharing
         *
         * Validation: Must be array of valid IAM principal ARNs; required for resource link access control and permission management
         */
        grantPrincipals: principals,
        /**
         * Q-ENHANCED-PROPERTY
         * Required source account ID for LakeFormation resource link creation enabling cross-account database sharing and access control. Specifies the AWS account that owns the source database being shared through the resource link for cross-account data lake access.
         *
         * Use cases: Cross-account sharing; Source account identification; Database sharing; Account-based access control; Resource link source
         *
         * AWS: AWS LakeFormation resource link source account for cross-account database sharing and access management
         *
         * Validation: Must be valid 12-digit AWS account ID; required for cross-account resource link creation and access control
         */
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

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Arn, ArnComponents, ArnFormat } from 'aws-cdk-lib';
import { CfnDatabase, CfnDatabaseProps } from 'aws-cdk-lib/aws-glue';
import { CfnPrincipalPermissions } from 'aws-cdk-lib/aws-lakeformation';
import { Construct } from 'constructs';

/**
 *  Permissions to grant. 'read' resolves to SELECT + DESCRIBE.  'write' resolves to SELECT + DESCRIBE + INSERT + DELETE.
 */
export type PermissionsConfig = 'read' | 'write' | 'super';
export interface NamedResourceLinkProps {
  /** @jsii ignore */
  [name: string]: ResourceLinkProps;
}
export interface ResourceLinkProps {
  /**
   * Name of the target database
   */
  readonly targetDatabase: string;
  /**
   * The account where the target database exists
   */
  readonly targetAccount?: string;
  /**
   * The region where the target database exists
   */
  readonly targetRegion?: string;
  /**
   * The account in which the resource link should be created.
   * If not specified, will default to the local account.
   */
  readonly fromAccount?: string;
  /**
   * Named principals to be granted DESCRIBE access to the resource link
   */
  readonly grantPrincipals?: NamedPrincipalProps;
}
// Named collection of Lake Formation principals keyed by logical name
export interface NamedPrincipalProps {
  /**
   * Name for the principal.
   */
  /** @jsii ignore */
  readonly [name: string]: PrincipalProps;
}
/**
 * Defines a Lake Formation principal for grant assignment.
 * Supports federated groups, federated users, and IAM roles as principal types.
 * Federated principals require a matching federationProviderArn.
 *
 * Use cases: Federated group access; Individual user permissions; IAM role-based grants; Cross-account principals
 *
 * AWS: Lake Formation principals (federated via IAM SAML providers or direct IAM roles)
 *
 * Validation: At least one principal type required; federated types require federationProviderArn
 */
export interface PrincipalProps {
  /**
   * Federated group name for group-based Lake Formation permissions.
   * Combined with federationProviderArn to construct the principal identity.
   *
   * Use cases: Active Directory group access; Enterprise group-based governance; Team-level data permissions
   *
   * AWS: Lake Formation federated group principal via IAM SAML provider
   *
   * Validation: Optional; requires federationProviderArn when specified
   */
  readonly federatedGroup?: string;
  /**
   * Federated user name for individual Lake Formation permissions.
   * Combined with federationProviderArn to construct the principal identity.
   *
   * Use cases: Individual user data access; User-specific permissions; Federated user governance
   *
   * AWS: Lake Formation federated user principal via IAM SAML provider
   *
   * Validation: Optional; requires federationProviderArn when specified
   */
  readonly federatedUser?: string;
  /**
   * IAM federation provider ARN for resolving federated group/user principals.
   * Must reference an existing IAM SAML identity provider.
   *
   * Use cases: SAML provider integration; Active Directory federation; External IdP connectivity
   *
   * AWS: IAM SAML identity provider ARN (arn:aws:iam::account:saml-provider/name)
   *
   * Validation: Optional; required when federatedGroup or federatedUser is specified
   */
  readonly federationProviderArn?: string;
  /**
   * IAM role reference for role-based Lake Formation permissions.
   * Can be specified by ARN, name, or SSM parameter reference.
   *
   * Use cases: IAM role-based data access; Service role permissions; Cross-account role grants
   *
   * AWS: IAM role for Lake Formation grant assignment
   *
   * Validation: Optional; valid MdaaRoleRef; mutually exclusive with federated principal types
   */
  readonly role?: MdaaRoleRef;
  /**
   * AWS account ID for cross-account principal resolution.
   * Used when the account cannot be determined from the role ARN.
   *
   * Use cases: Cross-account grants; Multi-account Lake Formation permissions
   *
   * AWS: AWS account ID for principal resolution
   *
   * Validation: Optional; 12-digit AWS account ID
   */
  readonly account?: string;
}

export interface NamedGrantProps {
  /**
   * The unique name of the grant
   */
  /** @jsii ignore */
  readonly [name: string]: GrantProps;
}
export interface GrantProps {
  /**
   * Target Glue database name for the Lake Formation grant.
   * The database must already exist in the Glue Catalog before grant creation.
   *
   * Use cases: Database-scoped permissions; Grant target specification; Data governance scope
   *
   * AWS: Glue database for Lake Formation grant application
   *
   * Validation: Required; must be an existing Glue database name
   */
  readonly database: string;
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
   * Lake Formation permissions to grant at the database level.
   * Resolved from PermissionsConfig ('read'/'write'/'super') in app config to actual permission arrays.
   *
   * Use cases: Database read/write/super access; Database-level governance
   *
   * AWS: Lake Formation database permissions (DESCRIBE, CREATE_TABLE, ALTER, DROP)
   *
   * Validation: Required; array of valid Lake Formation permission strings
   */
  readonly databasePermissions: string[];
  /**
   * Lake Formation permissions to grant at the table level.
   * Resolved from PermissionsConfig in app config to actual permission arrays.
   *
   * Use cases: Table read/write/super access; Fine-grained table governance
   *
   * AWS: Lake Formation table permissions (SELECT, DESCRIBE, INSERT, DELETE, ALTER, DROP)
   *
   * Validation: Optional; array of valid Lake Formation permission strings
   */
  readonly tablePermissions?: string[];
  readonly databaseGrantablePermissions?: string[];
  readonly tableGrantablePermissions?: string[];
  /**
   * Named principals who will receive the specified permissions.
   * References principals defined in the principals configuration section.
   *
   * Use cases: Principal-based permission assignment; Multi-principal grants; Organized access control
   *
   * AWS: Lake Formation grant recipients (federated users/groups, IAM roles)
   *
   * Validation: Required; valid NamedPrincipalProps; principals must be resolvable
   */
  readonly principals: NamedPrincipalProps;
}

export interface LakeFormationAccessControlL3ConstructProps extends MdaaL3ConstructProps {
  // Named grant definitions for Lake Formation access control
  readonly grants: NamedGrantProps;
  // Optional resource links for cross-account database sharing
  readonly resourceLinks?: NamedResourceLinkProps;
  readonly externalDatabaseDependency?: CfnDatabase;
}

export class LakeFormationAccessControlL3Construct extends MdaaL3Construct {
  protected readonly props: LakeFormationAccessControlL3ConstructProps;

  public static readonly DATABASE_READ_PERMISSIONS: string[] = ['DESCRIBE'];
  public static readonly DATABASE_READ_WRITE_PERMISSIONS: string[] = ['DESCRIBE', 'CREATE_TABLE', 'ALTER'];
  public static readonly DATABASE_SUPER_PERMISSIONS: string[] = ['DESCRIBE', 'CREATE_TABLE', 'ALTER', 'DROP'];

  public static readonly TABLE_READ_PERMISSIONS: string[] = ['SELECT', 'DESCRIBE'];
  public static readonly TABLE_READ_WRITE_PERMISSIONS: string[] = ['SELECT', 'DESCRIBE', 'INSERT', 'DELETE'];
  public static readonly TABLE_SUPER_PERMISSIONS: string[] = [
    'SELECT',
    'DESCRIBE',
    'INSERT',
    'DELETE',
    'ALTER',
    'DROP',
  ];

  public static readonly TABLE_PERMISSIONS_MAP: { [key: string]: string[] } = {
    read: LakeFormationAccessControlL3Construct.TABLE_READ_PERMISSIONS,
    write: LakeFormationAccessControlL3Construct.TABLE_READ_WRITE_PERMISSIONS,
    super: LakeFormationAccessControlL3Construct.TABLE_SUPER_PERMISSIONS,
  };

  public static readonly DATABASE_PERMISSIONS_MAP: { [key: string]: string[] } = {
    read: LakeFormationAccessControlL3Construct.DATABASE_READ_PERMISSIONS,
    write: LakeFormationAccessControlL3Construct.DATABASE_READ_WRITE_PERMISSIONS,
    super: LakeFormationAccessControlL3Construct.DATABASE_SUPER_PERMISSIONS,
  };

  public static generateIdentifier(grantName: string, principalName: string, prefix?: string) {
    const id = prefix ? `${prefix}-${grantName}-${principalName}` : `${grantName}-${principalName}`;
    return id;
  }

  private accountGrants: { [account: string]: CfnPrincipalPermissions } = {};

  constructor(scope: Construct, id: string, props: LakeFormationAccessControlL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.createResourceLinks(this.props.resourceLinks || {}, this.props.externalDatabaseDependency);

    Object.entries(this.props.grants).forEach(grantEntry => {
      const grantName = grantEntry[0];
      const grantProps = grantEntry[1];
      Object.entries(grantProps.principals).forEach(principalEntry => {
        const principalName = principalEntry[0];
        const principalProps = principalEntry[1];
        const principalIdentity = this.constructPrincipalIdentity(principalName, principalProps);
        this.createDatabaseGrant(
          principalIdentity,
          principalName,
          grantName,
          grantProps,
          principalIdentity.account == this.account ? this.props.externalDatabaseDependency : undefined,
        );
        if (grantProps.tablePermissions) {
          this.createTableGrant(
            principalIdentity,
            principalName,
            grantName,
            grantProps,
            principalIdentity.account == this.account ? this.props.externalDatabaseDependency : undefined,
          );
        }
      });
    });
  }

  private createResourceLinks(resourceLinks: NamedResourceLinkProps, externalDependency?: CfnDatabase) {
    Object.entries(resourceLinks).forEach(resourceLinkEntry => {
      const resourceLinkName = resourceLinkEntry[0];
      const resourceLinkProps = resourceLinkEntry[1];
      const fromAccount = resourceLinkProps.fromAccount || this.account;
      const createScope =
        fromAccount === this.account
          ? this
          : this.getCrossAccountStack(fromAccount, this.getFirstCrossAccountRegion(fromAccount));
      if (!createScope) {
        throw new Error('Error determining scope for resource link. Cross account stack not defined.');
      }
      const resourceLinkDatabaseProps: CfnDatabaseProps = {
        catalogId: fromAccount,
        databaseInput: {
          name: resourceLinkName,
          targetDatabase: {
            catalogId: resourceLinkProps.targetAccount || this.account,
            databaseName: resourceLinkProps.targetDatabase,
            region: resourceLinkProps.targetRegion,
          },
        },
      };
      console.log(`Creating resource link ${resourceLinkName} in account ${fromAccount}`);
      const createdResourceLinkDatabase = new CfnDatabase(
        createScope,
        `${resourceLinkName}-resource-link`,
        resourceLinkDatabaseProps,
      );

      Object.entries(resourceLinkProps.grantPrincipals || {}).forEach(grantPrincipalEntry => {
        const principalName = grantPrincipalEntry[0];
        const principalProps = grantPrincipalEntry[1];

        const principalIdentity = this.constructPrincipalIdentity(principalName, principalProps);

        console.log(
          `Creating resource link grant for ${principalIdentity.identity} to ${resourceLinkName} in account ${fromAccount}`,
        );
        if (principalIdentity.account != fromAccount) {
          console.warn(
            `Warning, possibly creating grant to principal in separate account ${principalIdentity.account} from resource link ${resourceLinkName} account ${fromAccount}.`,
          );
        }
        const createdResourceLinkName = (createdResourceLinkDatabase.databaseInput as CfnDatabase.DatabaseInputProperty)
          .name;
        if (createdResourceLinkName) {
          const databaseGrantIdentifier = LakeFormationAccessControlL3Construct.generateIdentifier(
            resourceLinkName,
            principalName,
            'RESOURCE-LINK',
          );
          const crossAccountResourceLinkGrant = new CfnPrincipalPermissions(
            createScope,
            `grant-${databaseGrantIdentifier}`,
            {
              resource: {
                database: {
                  catalogId: principalIdentity.account || this.account,
                  name: createdResourceLinkName,
                },
              },
              principal: {
                dataLakePrincipalIdentifier: principalIdentity.identity,
              },
              permissions: ['DESCRIBE'],
              permissionsWithGrantOption: [],
            },
          );
          crossAccountResourceLinkGrant.addDependency(createdResourceLinkDatabase);
          this.addToAccountGrants(
            fromAccount,
            crossAccountResourceLinkGrant,
            fromAccount == this.account ? externalDependency : undefined,
          );
        }
      });
    });
  }

  //We use this method to ensure that each grant depends on the previous (by account).
  //This ensures that each grant is deployed in sequence, avoiding LF API rate limits.
  private addToAccountGrants(account: string, grant: CfnPrincipalPermissions, externalDependency?: CfnDatabase) {
    if (this.accountGrants[account]) {
      grant.addDependency(this.accountGrants[account]);
    } else if (externalDependency) {
      grant.addDependency(externalDependency);
    }
    this.accountGrants[account] = grant;
  }

  private createDatabaseGrant(
    principalIdentity: PrincipalIdentity,
    principalName: string,
    grantName: string,
    grantProps: GrantProps,
    externalDependency?: CfnDatabase,
  ) {
    const databaseGrantIdentifier = LakeFormationAccessControlL3Construct.generateIdentifier(
      grantName,
      principalName,
      'DATABASE',
    );

    const databaseGrant = new CfnPrincipalPermissions(this, `grant-${databaseGrantIdentifier}`, {
      resource: {
        database: {
          catalogId: this.account,
          name: grantProps.database,
        },
      },
      principal: {
        dataLakePrincipalIdentifier: principalIdentity.identity,
      },
      permissions: grantProps.databasePermissions,
      permissionsWithGrantOption: grantProps.databaseGrantablePermissions || [],
    });
    this.addToAccountGrants(this.account, databaseGrant, externalDependency);
  }

  private createTableGrant(
    principalIdentity: PrincipalIdentity,
    principalName: string,
    grantName: string,
    grantProps: GrantProps,
    externalDependency?: CfnDatabase,
  ) {
    const databaseName = grantProps.database;
    if (grantProps.tables && grantProps.tables.length > 0) {
      grantProps.tables.forEach(tableName => {
        const tableGrantIdentifier = LakeFormationAccessControlL3Construct.generateIdentifier(
          grantName,
          principalName,
          tableName,
        );
        const tableGrant = new CfnPrincipalPermissions(this, `grant-${tableGrantIdentifier}`, {
          resource: {
            table: {
              catalogId: this.account,
              databaseName: databaseName,
              name: tableName,
            },
          },
          principal: {
            dataLakePrincipalIdentifier: principalIdentity.identity,
          },
          permissions: grantProps.tablePermissions || [],
          permissionsWithGrantOption: grantProps.tableGrantablePermissions || [],
        });
        this.addToAccountGrants(this.account, tableGrant, externalDependency);
      });
    } else {
      const tableGrantIdentifier = LakeFormationAccessControlL3Construct.generateIdentifier(
        grantName,
        principalName,
        'ALL_TABLES',
      );
      const tableGrant = new CfnPrincipalPermissions(this, `grant-${tableGrantIdentifier}`, {
        resource: {
          table: {
            catalogId: this.account,
            databaseName: databaseName,
            tableWildcard: {},
          },
        },
        principal: {
          dataLakePrincipalIdentifier: principalIdentity.identity,
        },
        permissions: grantProps.tablePermissions || [],
        permissionsWithGrantOption: grantProps.tableGrantablePermissions || [],
      });
      this.addToAccountGrants(this.account, tableGrant, externalDependency);
    }
  }

  private constructPrincipalIdentity(principalName: string, principalProps: PrincipalProps): PrincipalIdentity {
    const principalIdentityString = this.constructPrincipalIdentityString(principalName, principalProps);
    const principalIdentityArn = this.tryParseArn(principalIdentityString);
    const principalAccount = principalIdentityArn?.account || principalProps.account || this.account;
    const identity = {
      identity: principalIdentityString,
      account: principalAccount,
    };
    return identity;
  }

  private constructPrincipalIdentityString(principalName: string, principalProps: PrincipalProps): string {
    if (principalProps.federationProviderArn) {
      if (principalProps.federatedGroup) {
        return `${principalProps.federationProviderArn}:group/${principalProps.federatedGroup}`;
      } else if (principalProps.federatedUser) {
        return `${principalProps.federationProviderArn}:user/${principalProps.federatedUser}`;
      }
    } else {
      if (principalProps.role) {
        if (principalProps.role instanceof MdaaResolvableRole) {
          return principalProps.role.arn();
        } else {
          return this.props.roleHelper.resolveRoleRefWithRefId(principalProps.role, principalName).arn();
        }
      }
    }
    throw new Error(`Unable to construct principal for ${principalName} with provided configuration.`);
  }

  private tryParseArn(arnString: string): ArnComponents | undefined {
    try {
      return Arn.split(arnString, ArnFormat.NO_RESOURCE_NAME);
    } catch {
      return undefined;
    }
  }
}

interface PrincipalIdentity {
  readonly identity: string;
  readonly account?: string;
}

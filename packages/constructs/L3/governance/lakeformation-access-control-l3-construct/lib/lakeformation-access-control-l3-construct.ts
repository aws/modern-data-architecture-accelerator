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
   * The account in which the resource link should be created.
   * If not specified, will default to the local account.
   */
  readonly fromAccount?: string;
  /**
   * Named principals to be granted DESCRIBE access to the resource link
   */
  readonly grantPrincipals?: NamedPrincipalProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * Named Lake Formation principal collection interface for managing multiple data lake access principals with string-based naming for organized permission management. Enables configuration of multiple Lake Formation principals with unique identifiers, supporting multi-principal data governance and organized access control management for fine-grained data lake security.
 *
 * Use cases: Multi-principal access control; Principal collection management; Named principal organization; Data lake permission management; Lake Formation governance; Access control organization
 *
 * AWS: Multiple Lake Formation principals with organized naming for data lake access control and permission management
 *
 * Validation: Principal names must be valid identifiers; each PrincipalProps must be valid principal configuration; names must be unique within collection
 */
export interface NamedPrincipalProps {
  /**
   * Name for the principal.
   */
  /** @jsii ignore */
  readonly [name: string]: PrincipalProps;
}
/**
 * Q-ENHANCED-INTERFACE
 * PrincipalProps configuration interface for resource configuration and infrastructure management.
 *
 * Use cases: Data lake security; Access control; Fine-grained permissions; Data governance
 *
 * AWS: AWS service configuration and deployment
 *
 * Validation: Configuration must be valid for deployment; properties must conform to AWS service and MDAA requirements
 */
export interface PrincipalProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Federated group name for Lake Formation access control enabling Active Directory group-based permissions and enterprise identity integration. Specifies the federated group from external identity providers that will receive Lake Formation permissions, supporting enterprise identity management and group-based access control.
   *
   * Use cases: Enterprise identity integration; Group-based permissions; Active Directory integration; Federated access control
   *
   * AWS: AWS Lake Formation federated group principal for enterprise identity integration and group-based access
   *
   * Validation: Must be valid federated group name if specified; requires federation provider configuration; mutually exclusive with other principal types
   **/
  readonly federatedGroup?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Federated user name for Lake Formation access control enabling individual user-based permissions and enterprise identity integration. Specifies the federated user from external identity providers that will receive Lake Formation permissions, supporting individual user access control and enterprise identity management.
   *
   * Use cases: Individual user permissions; Enterprise identity integration; User-based access control; Federated user access
   *
   * AWS: AWS Lake Formation federated user principal for enterprise identity integration and user-based access
   *
   * Validation: Must be valid federated user name if specified; requires federation provider configuration; mutually exclusive with other principal types
   **/
  readonly federatedUser?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * IAM federation provider ARN for federated identity integration enabling external identity provider trust relationships. Specifies the ARN of the IAM federation provider that Active Directory or other identity systems use to federate into the AWS environment for Lake Formation access control.
   *
   * Use cases: Federation provider integration; External identity trust; Active Directory federation; Identity provider configuration
   *
   * AWS: AWS IAM federation provider ARN for external identity integration and federated access control
   *
   * Validation: Must be valid IAM federation provider ARN if specified; provider must exist and be configured for federation
   **/
  readonly federationProviderArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * IAM role reference for Lake Formation access control enabling role-based permissions and AWS native identity management. Specifies the IAM role that will receive Lake Formation permissions, supporting AWS native identity management and role-based access control patterns.
   *
   * Use cases: Role-based permissions; AWS native identity; IAM role access; Native access control
   *
   * AWS: AWS IAM role for Lake Formation permissions and native AWS identity-based access control
   *
   * Validation: Must be valid MdaaRoleRef if specified; role must exist and be accessible; mutually exclusive with federated principals
   **/
  readonly role?: MdaaRoleRef;
  /**
   * Q-ENHANCED-PROPERTY
   * Principal account ID specification for cross-account access control enabling multi-account Lake Formation permissions and account boundary management. Optionally specifies the account ID for cases where the account cannot be determined from the role ARN, supporting cross-account access scenarios.
   *
   * Use cases: Cross-account access; Account boundary management; Multi-account permissions; Account specification
   *
   * AWS: AWS account ID for cross-account Lake Formation permissions and multi-account access control
   *
   * Validation: Must be valid AWS account ID if specified; used when account cannot be determined from role ARN
   **/
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
   * Q-ENHANCED-PROPERTY
   * Target Glue database name for Lake Formation grant application enabling database-level access control and permissions management. Specifies the existing Glue database against which the Lake Formation grant will be applied, providing the foundation for fine-grained data access control.
   *
   * Use cases: Database-level access control; Grant target specification; Data governance; Permission management
   *
   * AWS: AWS Glue database for Lake Formation grant application and database-level access control
   *
   * Validation: Must be valid existing Glue database name; required; database must exist before grant creation
   **/
  readonly database: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Target table names for table-level Lake Formation grant application enabling fine-grained table access control and selective data permissions. Specifies the tables within the database for which grants will be applied, supporting table-specific access control and selective data access patterns.
   *
   * Use cases: Table-level access control; Selective data access; Fine-grained permissions; Table-specific governance
   *
   * AWS: AWS Glue table names for Lake Formation table-level grants and fine-grained access control
   *
   * Validation: Must be array of valid table names or '*' for all tables if specified; tables must exist in the specified database
   **/
  readonly tables?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Lake Formation database permissions for database-level access control enabling database access management. Specifies the specific Lake Formation permissions to grant on the database, controlling database-level operations and access patterns for data governance.
   *
   * Use cases: Database access control; Permission specification; Database-level governance; Access management
   *
   * AWS: AWS Lake Formation database permissions for database-level access control and governance
   *
   * Validation: Must be array of valid Lake Formation permission strings; required; permissions must be valid for database resources
   **/
  readonly databasePermissions: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Lake Formation table permissions for table-level access control enabling fine-grained table access management. Specifies the specific Lake Formation permissions to grant on tables, controlling table-level operations and access patterns for granular data governance.
   *
   * Use cases: Table-level access control; Fine-grained permissions; Table access management; Granular governance
   *
   * AWS: AWS Lake Formation table permissions for table-level access control and fine-grained governance
   *
   * Validation: Must be array of valid Lake Formation permission strings if specified; permissions must be valid for table resources
   **/
  readonly tablePermissions?: string[];
  readonly databaseGrantablePermissions?: string[];
  readonly tableGrantablePermissions?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Named principal collection for grant recipient specification enabling organized permission assignment and principal-based access control. Defines the principals (users, roles, groups) that will receive the specified Lake Formation permissions, supporting organized and systematic permission management.
   *
   * Use cases: Principal-based access; Permission assignment; Organized access control; Systematic permission management
   *
   * AWS: AWS Lake Formation grant principals for permission assignment and access control
   *
   * Validation: Must be valid NamedPrincipalProps; required; principals must be valid and accessible for grant assignment
   **/
  readonly principals: NamedPrincipalProps;
}

export interface LakeFormationAccessControlL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of grant names to LakeFormation grant definitions for fine-grained data access control enabling permissions management and data governance. Provides grant configurations for controlling access to databases, tables, and columns with specific permissions and principal-based access control.
   *
   * Use cases: Fine-grained permissions; Data access control; Principal-based access; Governance management
   *
   * AWS: LakeFormation grants for fine-grained data access control and permissions management
   *
   * Validation: Must be valid NamedGrantProps; required for LakeFormation access control and permissions management
   **/
  readonly grants: NamedGrantProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of resource link names to resource link definitions for cross-account data sharing enabling federated access to external data catalogs. Provides resource link configurations for creating local references to external databases and tables for cross-account data sharing and federation.
   *
   * Use cases: Cross-account sharing; Data federation; Resource linking; External catalog access
   *
   * AWS: LakeFormation resource links for cross-account data sharing and catalog federation
   *
   * Validation: Must be valid NamedResourceLinkProps if provided; enables cross-account data sharing and federation
   **/
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

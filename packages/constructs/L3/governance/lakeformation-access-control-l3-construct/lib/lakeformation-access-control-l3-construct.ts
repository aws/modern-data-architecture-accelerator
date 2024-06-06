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
export type PermissionsConfig = "read" | "write" | "super"

export interface NamedResourceLinkProps {
  /** @jsii ignore */
  [ name: string ]: ResourceLinkProps
}

export interface ResourceLinkProps {
  /**
   * Name of the target database
   */
  readonly targetDatabase: string,
  /**
   * The account where the target database exists
   */
  readonly targetAccount?: string
  /**
   * The account in which the resource link should be created.
   * If not specified, will default to the local account.
   */
  readonly fromAccount?: string
  /**
   * Named principals to be granted DESCRIBE access to the resource link
   */
  readonly grantPrincipals?: NamedPrincipalProps
}

export interface NamedPrincipalProps {
  /**
  * Name for the principal.
  */
  /** @jsii ignore */
  readonly [ name: string ]: PrincipalProps
}

export interface PrincipalProps {
  /**
   * Federated group name for the grant.
   */
  readonly federatedGroup?: string,
  /**
   * Federated user name for the grant.
   */
  readonly federatedUser?: string,
  /**
   * Arn of the IAM Federation provider that Active Directory uses to federate into the environment.
   */
  readonly federationProviderArn?: string
  /**
   * Arn of an IAM principal for the grant.
   */
  readonly role?: MdaaRoleRef | MdaaResolvableRole
  /**
   * Optionally, the principal account can be specified for cases where the account cannot be 
   * determined from the role arn
   */
  readonly account?: string
}

export interface NamedGrantProps {
  /**
   * The unique name of the grant
   */
  /** @jsii ignore */
  readonly [ name: string ]: GrantProps
}

export interface GrantProps {
  /**
   * Name of the existing Glue Database to perform the grant against.
   */
  readonly database: string
  /**
   * Array of strings representing Tables to perform the grant against.  Use a '*' for all tables.
   */
  readonly tables?: string[]
  /**
   * LF Permissions to grant on the database
   */
  readonly databasePermissions: string[]
  /**
   * LF Permissions to grant on the tables (if specified)
   */
  readonly tablePermissions?: string[]
  /**
   * Named principals to grant permissions to.
   */
  readonly principals: NamedPrincipalProps
}

export interface LakeFormationAccessControlL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * List of LakeFormation grant definitions.
   */
  readonly grants: NamedGrantProps
  /**
   * Resource links which will be created in the local account.
   */
  readonly resourceLinks?: NamedResourceLinkProps
  /**
   * External Database reference which may create in parallel (Optional)
   * This option is useful when a stack is using multiple L2/L3 constructs to create databases and LakeFormation Grants
   */
  readonly externalDatabaseDependency?: CfnDatabase
}

export class LakeFormationAccessControlL3Construct extends MdaaL3Construct {
  protected readonly props: LakeFormationAccessControlL3ConstructProps
  
  public static readonly DATABASE_READ_PERMISSIONS: string[] = [ "DESCRIBE" ]
  public static readonly DATABASE_READ_WRITE_PERMISSIONS: string[] = [ "DESCRIBE", "CREATE_TABLE", "ALTER" ]
  public static readonly DATABASE_SUPER_PERMISSIONS: string[] = [ "DESCRIBE", "CREATE_TABLE", "ALTER", "DROP" ]

  public static readonly TABLE_READ_PERMISSIONS: string[] = [ "SELECT", "DESCRIBE" ]
  public static readonly TABLE_READ_WRITE_PERMISSIONS: string[] = [ "SELECT", "DESCRIBE", "INSERT", "DELETE" ]
  public static readonly TABLE_SUPER_PERMISSIONS: string[] = [ "SELECT", "DESCRIBE", "INSERT", "DELETE", "ALTER", "DROP" ]

  public static readonly TABLE_PERMISSIONS_MAP: { [ key: string ]: string[] } = {
    read: LakeFormationAccessControlL3Construct.TABLE_READ_PERMISSIONS,
    write: LakeFormationAccessControlL3Construct.TABLE_READ_WRITE_PERMISSIONS,
    super: LakeFormationAccessControlL3Construct.TABLE_SUPER_PERMISSIONS
  }

  public static readonly DATABASE_PERMISSIONS_MAP: { [ key: string ]: string[] } = {
    read: LakeFormationAccessControlL3Construct.DATABASE_READ_PERMISSIONS,
    write: LakeFormationAccessControlL3Construct.DATABASE_READ_WRITE_PERMISSIONS,
    super: LakeFormationAccessControlL3Construct.DATABASE_SUPER_PERMISSIONS
  }

  public static generateIdentifier ( grantName: string, principalName: string, prefix?: string ) {
    const id = prefix ? `${ prefix }-${ grantName }-${ principalName }` : `${ grantName }-${ principalName }`
    return id
  }


  private static accountGrants: { [ account: string ]: CfnPrincipalPermissions } = {}

  constructor( scope: Construct, id: string, props: LakeFormationAccessControlL3ConstructProps ) {
    super( scope, id, props )
    this.props = props
    
    this.createResourceLinks( this.props.resourceLinks || {}, this.props.externalDatabaseDependency )

    Object.entries( this.props.grants ).forEach( grantEntry => {
      const grantName = grantEntry[ 0 ]
      const grantProps = grantEntry[ 1 ]
      Object.entries( grantProps.principals ).forEach( principalEntry => {
        const principalName = principalEntry[ 0 ]
        const principalProps = principalEntry[ 1 ]
        const principalIdentity = this.constructPrincipalIdentity( principalName, principalProps )
        this.createDatabaseGrant( principalIdentity, principalName, grantName, grantProps, principalIdentity.account == this.account ? this.props.externalDatabaseDependency : undefined )
        this.createTableGrant( principalIdentity, principalName, grantName, grantProps, principalIdentity.account == this.account ? this.props.externalDatabaseDependency : undefined  )
      } )
    } )
  }

  private createResourceLinks ( resourceLinks: NamedResourceLinkProps , externalDependency?:CfnDatabase ) {

    Object.entries( resourceLinks ).forEach( resourceLinkEntry => {
      const resourceLinkName = resourceLinkEntry[ 0 ]
      const resourceLinkProps = resourceLinkEntry[ 1 ]
      const fromAccount = resourceLinkProps.fromAccount || this.account

      const createScope = fromAccount != this.account ?
        this.getCrossAccountStack( fromAccount ) :
        this

      const resourceLinkDatabaseProps: CfnDatabaseProps = {
        catalogId: fromAccount,
        databaseInput: {
          name: resourceLinkName,
          targetDatabase: {
            catalogId: resourceLinkProps.targetAccount || this.account,
            databaseName: resourceLinkProps.targetDatabase,
          },
        }
      }
      console.log( `Creating resource link ${ resourceLinkName } in account ${ fromAccount }` )
      const createdResourceLinkDatabase = new CfnDatabase( createScope, `${ resourceLinkName }-resource-link`, resourceLinkDatabaseProps )

      Object.entries( resourceLinkProps.grantPrincipals || {} ).forEach( grantPrincipalEntry => {
        const principalName = grantPrincipalEntry[ 0 ]
        const principalProps = grantPrincipalEntry[ 1 ]

        const principalIdentity = this.constructPrincipalIdentity( principalName, principalProps )

        console.log( `Creating resource link grant for ${ principalIdentity.identity } to ${ resourceLinkName } in account ${ fromAccount }` )
        if ( principalIdentity.account != fromAccount ) {
          console.warn( `Warning, possibly creating grant to principal in separate account ${ principalIdentity.account } from resource link ${ resourceLinkName } account ${ fromAccount }.` )
        }
        const createdResourceLinkName = ( createdResourceLinkDatabase.databaseInput as CfnDatabase.DatabaseInputProperty ).name
        if ( createdResourceLinkName ) {
          const databaseGrantIdentifier = LakeFormationAccessControlL3Construct.generateIdentifier( resourceLinkName, principalName, "RESOURCE-LINK" )
          const crossAccountResourceLinkGrant = new CfnPrincipalPermissions( createScope, `grant-${ databaseGrantIdentifier }`, {
            resource: {
              database: {
                catalogId: principalIdentity.account || this.account,
                name: createdResourceLinkName,
              }
            },
            principal: {
              dataLakePrincipalIdentifier: principalIdentity.identity
            },
            permissions: [ 'DESCRIBE' ],
            permissionsWithGrantOption: []
          } )
          LakeFormationAccessControlL3Construct.addToAccountGrants( fromAccount, crossAccountResourceLinkGrant, fromAccount == this.account ? externalDependency : undefined )
        }
      } )

    } )

  }

  //We use this static method to ensure that each grant depends on the previous (by account).
  //This ensures that each grant is deployed in sequence, avoiding LF API rate limits.
  private static addToAccountGrants ( account: string, grant: CfnPrincipalPermissions, externalDependency?:CfnDatabase ) {
    if ( this.accountGrants[ account ] ) {
      grant.addDependency( this.accountGrants[ account ] )
    }
    else if ( externalDependency ) {
      grant.addDependency( externalDependency )
    }
    this.accountGrants[ account ] = grant
  }

  private createDatabaseGrant ( principalIdentity: PrincipalIdentity,
    principalName: string,
    grantName: string, grantProps: GrantProps,
    externalDependency?:CfnDatabase ) {

    const databaseGrantIdentifier = LakeFormationAccessControlL3Construct.generateIdentifier( grantName, principalName, "DATABASE" )

    const databaseGrant = new CfnPrincipalPermissions( this, `grant-${ databaseGrantIdentifier }`, {
      resource: {
        database: {
          catalogId: this.account,
          name: grantProps.database,
        }
      },
      principal: {
        dataLakePrincipalIdentifier: principalIdentity.identity
      },
      permissions: grantProps.databasePermissions,
      permissionsWithGrantOption: []
    } )
    LakeFormationAccessControlL3Construct.addToAccountGrants( this.account, databaseGrant, externalDependency )

  }

  private createTableGrant ( principalIdentity: PrincipalIdentity,
    principalName: string,
    grantName: string,
    grantProps: GrantProps,
    externalDependency?:CfnDatabase ) {

    const databaseName = grantProps.database
    if ( grantProps.tables && grantProps.tables.length > 0 ) {
      grantProps.tables.forEach( tableName => {
        const tableGrantIdentifier = LakeFormationAccessControlL3Construct.generateIdentifier( grantName, principalName, tableName )
        const tableGrant = new CfnPrincipalPermissions( this, `grant-${ tableGrantIdentifier }`, {
          resource: {
            table: {
              catalogId: this.account,
              databaseName: databaseName,
              name: tableName
            }
          },
          principal: {
            dataLakePrincipalIdentifier: principalIdentity.identity
          },
          permissions: grantProps.tablePermissions || [],
          permissionsWithGrantOption: []
        } )
        LakeFormationAccessControlL3Construct.addToAccountGrants( this.account, tableGrant, externalDependency )
      } )
    } else {
      const tableGrantIdentifier = LakeFormationAccessControlL3Construct.generateIdentifier( grantName, principalName, "ALL_TABLES" )
      const tableGrant = new CfnPrincipalPermissions( this, `grant-${ tableGrantIdentifier }`, {
        resource: {
          table: {
            catalogId: this.account,
            databaseName: databaseName,
            tableWildcard: {}
          }
        },
        principal: {
          dataLakePrincipalIdentifier: principalIdentity.identity
        },
        permissions: grantProps.tablePermissions || [],
        permissionsWithGrantOption: []
      } )
      LakeFormationAccessControlL3Construct.addToAccountGrants( this.account, tableGrant, externalDependency )
    }
  }

  private constructPrincipalIdentity ( principalName: string, principalProps: PrincipalProps ): PrincipalIdentity {
    const principalIdentityString = this.constructPrincipalIdentityString( principalName, principalProps )
    const principalIdentityArn = this.tryParseArn( principalIdentityString )
    const principalAccount = principalIdentityArn?.account || principalProps.account || this.account
    const identity = {
      identity: principalIdentityString,
      account: principalAccount
    }
    return identity
  }

  private constructPrincipalIdentityString ( principalName: string, principalProps: PrincipalProps ): string {

    if ( principalProps.federationProviderArn ) {
      if ( principalProps.federatedGroup ) {
        return `${ principalProps.federationProviderArn }:group/${ principalProps.federatedGroup }`
      } else if ( principalProps.federatedUser ) {
        return `${ principalProps.federationProviderArn }:user/${ principalProps.federatedUser }`
      }
    } else {
      if ( principalProps.role ) {
        if ( principalProps.role instanceof MdaaResolvableRole ) {
          return principalProps.role.arn()
        } else {
          return this.props.roleHelper.resolveRoleRefWithRefId( principalProps.role, principalName ).arn()
        }
      }
    }
    throw new Error( `Unable to construct principal for ${ principalName } with provided configuration.` )
  }

  private tryParseArn ( arnString: string ): ArnComponents | undefined {
    try {
      return Arn.split( arnString, ArnFormat.NO_RESOURCE_NAME )
    } catch {
      return undefined
    }
  }
}

interface PrincipalIdentity {
  readonly identity: string
  readonly account?: string
}

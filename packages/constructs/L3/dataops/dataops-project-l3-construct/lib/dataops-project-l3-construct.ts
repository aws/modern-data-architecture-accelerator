/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefSecurityGroupRuleProps } from '@aws-caef/ec2-constructs';
import { Ec2L3Construct, Ec2L3ConstructProps } from '@aws-caef/ec2-l3-construct';
import { CaefSecurityConfig } from '@aws-caef/glue-constructs';
import { CaefRole } from '@aws-caef/iam-constructs';
import { CaefResolvableRole, CaefRoleRef } from '@aws-caef/iam-role-helper';
import { CaefKmsKey, DECRYPT_ACTIONS, ENCRYPT_ACTIONS, ICaefKmsKey } from '@aws-caef/kms-constructs';
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { GrantProps, LakeFormationAccessControlL3Construct, LakeFormationAccessControlL3ConstructProps, NamedGrantProps, NamedPrincipalProps, NamedResourceLinkProps, PermissionsConfig, PrincipalProps, ResourceLinkProps } from '@aws-caef/lakeformation-access-control-l3-construct';
import { RestrictBucketToRoles, RestrictObjectPrefixToRoles } from '@aws-caef/s3-bucketpolicy-helper';
import { CaefBucket } from '@aws-caef/s3-constructs';
import { CaefSnsTopic, CaefSnsTopicProps } from '@aws-caef/sns-constructs';
import { SecurityConfiguration } from '@aws-cdk/aws-glue-alpha';
import { ArnComponents, Arn, ArnFormat } from 'aws-cdk-lib';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { CfnClassifier, CfnConnection, CfnDatabase } from 'aws-cdk-lib/aws-glue';
import { Effect, IRole, ManagedPolicy, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { CfnPrincipalPermissions } from 'aws-cdk-lib/aws-lakeformation';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface NamedDatabaseGrantProps {
    /**
     * The unique name of the grant
     */
    /** @jsii ignore */
    readonly [ name: string ]: DatabaseGrantProps
}

export interface NamedPrincipalArnProps {
    /** @jsii ignore */
    [ name: string ]: string
}

export interface DatabaseGrantProps {

    /**
     * Permissions to Grant on database.  Must be 'read', 'write', or 'super'. Defaults to 'read'.
     */
    readonly databasePermissions?: PermissionsConfig
    /**
     * Permissions to Grant on tables.  Must be 'read', 'write', or 'super'. Defaults to 'read'.
     */
    readonly tablePermissions?: PermissionsConfig
    /**
     * List of tables for which to create grants. Tables must exist before grants can be created.
     */
    readonly tables?: string[]
    /**
     * Array of strings representing principals to grant permissions to.  These must exist in the 'principals:' section.
     */
    readonly principals?: NamedPrincipalProps
    /**
     * Mapping of principal names to arns. Can be used as short hand for principals
     */
    readonly principalArns?: NamedPrincipalArnProps
}

export interface DatabaseLakeFormationProps {
    /**
     * If true (default: false), will automatically add read/write/super LF grants for data admin roles
     *  to database
     */
    readonly createSuperGrantsForDataAdminRoles?: boolean

    /**
     * If true (default: false), will automatically add read LF grants for data engineer roles
     *  to database
     */
    readonly createReadGrantsForDataEngineerRoles?: boolean

    /**
     * If true (default: false), will automatically add read/write LF grants for project execution role
     *  to databases and their s3 locations.
     */
    readonly createReadWriteGrantsForProjectExecutionRoles?: boolean

    /**
     * List of account numbers for which cross account Resource Links will be created.
     * Additional stacks will be created for each account.
     */
    readonly createCrossAccountResourceLinkAccounts?: string[]

    /**
     * Name of the resource link to be created
     * If not specified, defaults to the database name
     */
    readonly createCrossAccountResourceLinkName?: string

    /**
     * LF Grants to be added to the database
     */
    readonly grants?: NamedDatabaseGrantProps
}

export interface NamedDatabaseProps {
    /** @jsii ignore */
    readonly [ name: string ]: DatabaseProps
}

export interface DatabaseProps {
    /** 
     * General description of the database
    */
    readonly description: string
    /**
     * S3 Bucket under which all data for this database will be stored
     */
    readonly locationBucketName?: string
    /**
     * S3 prefix under which all data for this database will be stored
     */
    readonly locationPrefix?: string

    readonly lakeFormation?: DatabaseLakeFormationProps
}

export type ClassifierType = "csv" | "grok" | "json" | "xml"

// Cannot useCfnClassifier.GrokClassifierProperty as some values allow IResolvable
export interface ClassifierCsvProps {
    readonly allowSingleColumn?: boolean
    readonly containsHeader?: string
    readonly delimiter?: string
    readonly disableValueTrimming?: boolean
    readonly header?: string[]
    readonly name?: string
    readonly quoteSymbol?: string
}

export interface ClassifierConfigProps {
    /**
     * CSV Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-csvclassifier.html
     */
    readonly csvClassifier?: ClassifierCsvProps
    /**
     * Grok Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-grokclassifier.html
     */
    readonly grokClassifier?: CfnClassifier.GrokClassifierProperty
    /**
     * JSON Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-jsonclassifier.html
     */
    readonly jsonClassifier?: CfnClassifier.JsonClassifierProperty
    /**
     * XML Classifier Props.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-classifier-xmlclassifier.html
     */
    readonly xmlClassifier?: CfnClassifier.XMLClassifierProperty
}

export interface NamedClassifierProps {
    /** @jsii ignore */
    readonly [ name: string ]: ClassifierProps
}

export interface ClassifierProps {
    /**
     * Custom Classifier type
     */
    readonly classifierType: ClassifierType
    /**
     * Custom Classifier configuration to use for the type.  See: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-classifier.html
     */
    readonly configuration: ClassifierConfigProps
}

export type ConnectionType = "JDBC" | "KAFKA" | "MONGODB" | "NETWORK"

// CDK Type contains IResolvable, so we need to defin this one here!
export interface ConnectionPhysical {
    /**
     * Availability zone to use (eg test-regiona)
     */
    readonly availabilityZone?: string,
    /**
     * List of names of security groups generated within the project config
     */
    readonly projectSecurityGroupNames?: string[]
    /**
     * List of security groups to use when connecting to the VPC.  Assure they are in the VPC matching the SecurityGroupIds
     */
    readonly securityGroupIdList?: string[]
    /**
     * Subnet ID within the Availability Zone chosen above.
     */
    readonly subnetId?: string
}

export interface NamedConnectionProps {
    /** @jsii ignore */
    readonly [ name: string ]: ConnectionProps
}

export interface ConnectionProps {
    /**
     * Connection type to create ("JDBC" | "KAFKA" | "MONGODB" | "NETWORK")
     */
    readonly connectionType: ConnectionType,
    /**
     * Connection properties key value pairs.  See: https://docs.aws.amazon.com/glue/latest/webapi/API_Connection.html
     */
    readonly connectionProperties?: any
    /**
     * Connection Description
     */
    readonly description?: string
    /**
     * A list of criteria that can be used in selecting this connection.
     */
    readonly matchCriteria?: string[]
    /**
     * VPC Definition for this to connect to.  see: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-glue-connection-physicalconnectionrequirements.html
     */
    readonly physicalConnectionRequirements?: ConnectionPhysical
}

export interface DataOpsProjectL3ConstructProps extends CaefL3ConstructProps {
    /**
     * The KMS Key to be used to encrypt all Job outputs within the project.
     */
    readonly s3OutputKmsKeyArn: string;
    /**
     * Map of classifer names to classifier definitions
     */
    readonly classifiers?: NamedClassifierProps
    /**
     * Map of connection names to connection definitions
     */
    readonly connections?: NamedConnectionProps
    /**
     * The key used to encrypt the Glue catalog and connection credentials
     */
    readonly glueCatalogKmsKeyArn?: string;
    /**
     * The list of execution roles used by project jobs, crawlers, and function resources.
     */
    readonly projectExecutionRoleRefs: CaefRoleRef[];
    /**
     * Map of database names to database definitions
     */
    readonly databases?: NamedDatabaseProps
    /**
     * List of data engineer role ids who will interact with project resources
     */
    readonly dataEngineerRoleRefs: CaefRoleRef[];
    /**
     * List of data admin role ids which will administer project resources
     */
    readonly dataAdminRoleRefs: CaefRoleRef[];
    /**
     * failure notification configuration
     */
    readonly failureNotifications?: FailureNotificationsProps
    /**
     * If specified, project security groups will be created which can be shared
     * by project resources 
     */
    readonly securityGroupConfigs?: NamedSecurityGroupConfigProps
}

export interface NamedSecurityGroupConfigProps {
    /** @jsii ignore */
    [ name: string ]: SecurityGroupConfigProps
}

export interface SecurityGroupConfigProps {
    /**
     * The ID of the VPC on which the Lambda will be deployed
     */
    readonly vpcId: string,
    /**
     * List of egress rules to be added to the function SG
     */
    readonly securityGroupEgressRules?: CaefSecurityGroupRuleProps
}

export interface FailureNotificationsProps {
    readonly email?: string[]
}

export class DataOpsProjectL3Construct extends CaefL3Construct {
    protected readonly props: DataOpsProjectL3ConstructProps


    private projectExecutionRoles: CaefResolvableRole[]
    private dataAdminRoles: CaefResolvableRole[]
    private dataEngineerRoles: CaefResolvableRole[]
    private dataAdminRoleIds: string[]
    private s3OutputKmsKey: IKey

    constructor( scope: Construct, id: string, props: DataOpsProjectL3ConstructProps ) {
        super( scope, id, props )
        this.props = props
        this.s3OutputKmsKey = CaefKmsKey.fromKeyArn( this.scope, "s3OutputKmsKey", props.s3OutputKmsKeyArn )
        this.projectExecutionRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals( this.props.projectExecutionRoleRefs, "ProjectExRoles" )
        this.dataAdminRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals( this.props.dataAdminRoleRefs, "DataAdmin" )
        this.dataEngineerRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals( this.props.dataEngineerRoleRefs, "DataEngineer" )
        this.dataAdminRoleIds = this.dataAdminRoles.map( x => x.id() )
        this.createProjectDatabases( this.props.databases || {} )

        const projectDeploymentRole = this.createProjectDeploymentRole()

        const projectKmsKey = this.createProjectKmsKey( [ projectDeploymentRole ] )

        const projectSecurityGroups = Object.fromEntries( Object.entries( props.securityGroupConfigs || {} ).map( entry => {
            const securityGroupName = entry[ 0 ]
            const securityGroupProps = entry[ 1 ]
            const sg = this.createProjectSecurityGroup( securityGroupName, securityGroupProps.vpcId, securityGroupProps.securityGroupEgressRules )
            return [ securityGroupName, sg ]
        } ) )

        // Create project bucket
        this.createProjectBucket( projectKmsKey, this.s3OutputKmsKey, projectDeploymentRole )

        this.createProjectSecurityConfig( projectKmsKey, this.s3OutputKmsKey )

        // create project SNS topic
        const topic = this.createSNSTopic( projectKmsKey )

        // subcribe SNS topic if failure notification config is enabled 
        this.subscribeSNSTopic( topic, this.props.failureNotifications )

        // Build our custom classifiers if they are defined.
        this.createProjectClassifiers( this.props.classifiers || {} )


        // Build our connectors if they are in use.
        this.createProjectConnectors( this.props.connections || {}, projectSecurityGroups )

        //If the Glue Catalog KMS key is specified, grant decrypt access to it
        //for project execution roles (direct access required to decrypt Glue connections)
        if ( this.props.glueCatalogKmsKeyArn ) {
            let i = 0
            const projectExecutionRoles = this.projectExecutionRoles.map( x => {
                return CaefRole.fromRoleArn( this.scope, `resolve-role-${ i++ }`, x.arn() )
            } )
            const keyAccessPolicy = new ManagedPolicy( this.scope, "catalog-key-access-policy", {
                managedPolicyName: this.props.naming.resourceName( "catalog-key-access" ),
                roles: projectExecutionRoles
            } )
            const keyAccessStatement = new PolicyStatement( {
                effect: Effect.ALLOW,
                actions: DECRYPT_ACTIONS,
                resources: [ this.props.glueCatalogKmsKeyArn ]
            } )
            keyAccessPolicy.addStatements( keyAccessStatement )
        }
    }

    private createProjectSecurityGroup ( sgName: string, vpcId: string, securityGroupEgressRules?: CaefSecurityGroupRuleProps ): SecurityGroup {
        const ec2L3Props: Ec2L3ConstructProps = {
            ...this.props as CaefL3ConstructProps,
            adminRoles: [],
            securityGroups: {
                [ sgName ]: {
                    vpcId: vpcId,
                    egressRules: securityGroupEgressRules,
                    addSelfReferenceRule: true
                }
            }
        }
        const ec2Construct = new Ec2L3Construct( this, `ec2`, ec2L3Props )
        const securityGroup = ec2Construct.securityGroups[ sgName ]

        // Required so we can auto-wire other stacks/resources to this project resource via SSM
        this.createProjectSSMParam( `sg-ssm-${ sgName }`, `securityGroupId/${ sgName }`, securityGroup.securityGroupId )

        return securityGroup
    }
    /** @jsii ignore */
    private createProjectConnectors ( connections: NamedConnectionProps, projectSecurityGroups: { [ name: string ]: SecurityGroup } ) {
        Object.entries( connections ).forEach( entry => {
            const connectionName = entry[ 0 ]
            const connectionProps = entry[ 1 ]

            const securityGroupIds = [
                ...connectionProps.physicalConnectionRequirements?.securityGroupIdList || [],
                ...connectionProps.physicalConnectionRequirements?.projectSecurityGroupNames?.map( name => {
                    const sg = projectSecurityGroups[ name ]
                    if ( !sg ) {
                        throw new Error( `Non-existant project security group name specified` )
                    }
                    return sg.securityGroupId
                } ) || []
            ]

            const physicalConnectionRequirements = {
                ...connectionProps.physicalConnectionRequirements,
                securityGroupIdList: securityGroupIds
            }

            const resourceName = this.props.naming.resourceName( connectionName )
            // We'll support SSM imports for our physical connection requirements as needed.
            new CfnConnection( this.scope, `${ connectionName }-connection`, {
                catalogId: this.account,
                connectionInput: {
                    ...connectionProps,
                    physicalConnectionRequirements: physicalConnectionRequirements,
                    name: resourceName
                }
            } )

            this.createProjectSSMParam( `ssm-connection-${ connectionName }`, `connections/${ connectionName }`, resourceName )

        } )

    }
    private createProjectClassifiers ( classifiers: NamedClassifierProps ) {
        Object.entries( classifiers ).forEach( entry => {
            const classifierName = entry[ 0 ]
            const classifierProps = entry[ 1 ]
            let resourceName = this.props.naming.resourceName( classifierName )
            // We'll need to name our classifiers appropriately over-riding any 'name' values that exist
            for ( let classifierType of [ 'csvClassifier', 'xmlClassifier', 'jsonClassifier', 'grokClassifier' ] ) {
                if ( classifierProps.configuration.hasOwnProperty( classifierType ) ) {
                    // @ts-ignore - suppressing read only property
                    classifierProps.configuration[ classifierType ][ 'name' ] = resourceName
                }
            }
            new CfnClassifier( this.scope, `${ classifierName }-classifier`, {
                csvClassifier: classifierProps.configuration.csvClassifier,
                xmlClassifier: classifierProps.configuration.xmlClassifier,
                jsonClassifier: classifierProps.configuration.jsonClassifier,
                grokClassifier: classifierProps.configuration.grokClassifier
            } )

            this.createProjectSSMParam( `ssm-classifier-${ classifierName }`, `classifiers/${ classifierName }`, resourceName )

        } )
    }
    private createProjectSecurityConfig ( projectKmsKey: ICaefKmsKey, s3OutputKmsKey: IKey ): SecurityConfiguration {
        //Create project security Config
        const projectSecurityConfig = new CaefSecurityConfig( this.scope, `security-config`, {
            cloudWatchKmsKey: projectKmsKey,
            jobBookMarkKmsKey: projectKmsKey,
            s3OutputKmsKey: s3OutputKmsKey,
            naming: this.props.naming
        } );

        // Required so we can auto-wire other stacks/resources to this project resource via SSM
        this.createProjectSSMParam( `ssm-securityconfig`, `securityConfiguration/default`, projectSecurityConfig.securityConfigurationName )

        return projectSecurityConfig
    }

    private createProjectDatabases ( databases: NamedDatabaseProps ) {

        // Build our databases
        Object.entries( databases ).forEach( entry => {
            const databaseName = entry[ 0 ]
            const databaseProps = entry[ 1 ]

            const dbResourceName = this.props.naming.resourceName( `${ databaseName }` )
            const databaseBucket = databaseProps.locationBucketName && databaseProps.locationPrefix ? CaefBucket.fromBucketName( this, `database-bucket-${ databaseName }`, databaseProps.locationBucketName ) : undefined

            // Create the database
            const database = new CfnDatabase( this.scope, `${ databaseName }-database`, {
                catalogId: this.account,
                databaseInput: {
                    name: dbResourceName,
                    description: databaseProps.description,
                    locationUri: databaseBucket?.s3UrlForObject( databaseProps.locationPrefix )
                }
            } )

            // Use LF Access Control L3 Contruct to create LF grants and Resource Links for the database
            if ( databaseProps.lakeFormation ) {
                this.createDatabaseLakeFormationConstruct( databaseName,
                    dbResourceName,
                    database,
                    databaseProps.lakeFormation,
                    databaseBucket?.arnForObjects( databaseProps.locationPrefix || "" )
                )
            }

            // Required so we can auto-wire other stacks/resources to this project resource via SSM
            this.createProjectSSMParam( `ssm-database-name-${ databaseName }`, `databaseName/${ databaseName }`, dbResourceName )

        } )
    }

    private createDatabaseLakeFormationConstruct ( databaseName: string,
        dbResourceName: string,
        database: CfnDatabase,
        databaseLakeFormationProps: DatabaseLakeFormationProps,
        locationArn?: string ) {

        // Provide Project Execution Roles (principal) data location permissions to create data catalog
        // tables that point to specified data-locations
        if ( databaseLakeFormationProps.createReadWriteGrantsForProjectExecutionRoles && locationArn ) {
            this.projectExecutionRoles.forEach( role => {
                const grantId = LakeFormationAccessControlL3Construct.generateIdentifier( databaseName, role.refId() )
                const grant = new CfnPrincipalPermissions( this, `lf-data-location-grant-${ grantId }`, {
                    principal: {
                        dataLakePrincipalIdentifier: role.arn(),
                    },
                    resource: {
                        dataLocation: {
                            catalogId: this.account,
                            resourceArn: locationArn
                        },
                    },
                    permissions: [ 'DATA_LOCATION_ACCESS' ],
                    permissionsWithGrantOption: []
                } )
                grant.addDependency( database )
            } )
        }

        const projectRoleGrantProps: { [ key: string ]: GrantProps } = {}
        if ( databaseLakeFormationProps.createSuperGrantsForDataAdminRoles ) {
            const adminGrantProps: GrantProps = {

                database: dbResourceName,
                databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_SUPER_PERMISSIONS,
                principals: Object.fromEntries( this.dataAdminRoles.map( x => {
                    return [ x.refId(), {
                        role: x
                    } ]
                } ) ),
                tablePermissions: LakeFormationAccessControlL3Construct.TABLE_SUPER_PERMISSIONS
            }
            
            projectRoleGrantProps[ `data-admins-${ databaseName }` ] = adminGrantProps
        }
        if ( databaseLakeFormationProps.createReadGrantsForDataEngineerRoles ) {
            const engineerGrantProps: GrantProps = {
                database: dbResourceName,
                databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_PERMISSIONS,
                principals: Object.fromEntries( this.dataEngineerRoles.map( x => {
                    return [ x.refId(), {
                        role: x
                    } ]
                } ) ),
                tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_PERMISSIONS
            }
            projectRoleGrantProps[ `data-engineers-${ databaseName }` ] = engineerGrantProps
        }

        if ( databaseLakeFormationProps.createReadWriteGrantsForProjectExecutionRoles ) {
            const executionRoleGrantProps: GrantProps = {
                database: dbResourceName,
                databasePermissions: LakeFormationAccessControlL3Construct.DATABASE_READ_WRITE_PERMISSIONS,
                principals: Object.fromEntries( this.projectExecutionRoles.map( x => {
                    return [ x.refId(), {
                        role: x
                    } ]
                } ) ),
                tablePermissions: LakeFormationAccessControlL3Construct.TABLE_READ_WRITE_PERMISSIONS
            }
            projectRoleGrantProps[ `execution-roles-${ databaseName }` ] = executionRoleGrantProps
        }

        const lfGrantProps: NamedGrantProps = Object.fromEntries( Object.entries( databaseLakeFormationProps?.grants || {} ).map( entry => {
            const dbGrantName = entry[ 0 ]
            const dbGrantProps = entry[ 1 ]
            const lakeFormationGrantProps = this.createLakeFormationGrantProps( dbResourceName, dbGrantProps )
            return [ `${ databaseName }-${ dbGrantName }`, lakeFormationGrantProps ]
        } ) ) || {}

        const resourceLinkName = databaseLakeFormationProps.createCrossAccountResourceLinkName || dbResourceName
        const resourceLinkProps: NamedResourceLinkProps = Object.fromEntries( databaseLakeFormationProps?.createCrossAccountResourceLinkAccounts?.map( account => {
            const accountPrincipalEntries = Object.entries( lfGrantProps ).map( lfGrantEntry => {
                const lfGrantProps = lfGrantEntry[ 1 ]
                return Object.entries( lfGrantProps.principals ).filter( principalEntry => {
                    const principalName = principalEntry[ 0 ]
                    const principalProps = principalEntry[ 1 ]
                    const principalAccount = this.determinePrincipalAccount( principalName, principalProps )
                    return principalAccount == account
                } )
            } ).flat()
            const namedAccountPrincipals: NamedPrincipalProps = Object.fromEntries( accountPrincipalEntries )
            const props: ResourceLinkProps = {
                targetDatabase: dbResourceName,
                targetAccount: this.account,
                fromAccount: account,
                grantPrincipals: namedAccountPrincipals
            }
            return [ resourceLinkName, props ]
        } ) || [] )

        const lakeFormationProps: LakeFormationAccessControlL3ConstructProps = {
            grants: { ...projectRoleGrantProps, ...lfGrantProps },
            resourceLinks: resourceLinkProps,
            externalDatabaseDependency: database,
            ...this.props as CaefL3ConstructProps
        }

        //Use the LF Account Control construct to create all database grants and resource links
        const lf = new LakeFormationAccessControlL3Construct( this, `lf-grants-${ databaseName }`, lakeFormationProps )
        lf.node.addDependency( database )

    }

    private determinePrincipalAccount ( principalName: string, principalProps: PrincipalProps ): string | undefined {
        if ( principalProps.role instanceof CaefResolvableRole ) {
            return this.tryParseArn( principalProps.role.arn() )?.account
        } else if ( principalProps.role ) {
            return this.tryParseArn( this.props.roleHelper.resolveRoleRefWithRefId( principalProps.role, principalName ).arn() )?.account
        } else {
            return undefined
        }
    }
    private tryParseArn ( arnString: string ): ArnComponents | undefined {
        try {
            return Arn.split( arnString, ArnFormat.NO_RESOURCE_NAME )
        } catch {
            return undefined
        }
    }
    private createLakeFormationGrantProps ( dbResourceName: string, dbGrantProps: DatabaseGrantProps ): GrantProps {
        const databasePermissions = LakeFormationAccessControlL3Construct.DATABASE_PERMISSIONS_MAP[ dbGrantProps.databasePermissions || 'read' ]
        const tablePermissions = LakeFormationAccessControlL3Construct.TABLE_PERMISSIONS_MAP[ dbGrantProps.tablePermissions || 'read' ]
        const principalArns: NamedPrincipalProps = Object.fromEntries( Object.entries( dbGrantProps.principalArns || {} ).map( entry => {
            const principalProps: PrincipalProps = {
                role: {
                    arn: entry[ 1 ]
                }
            }
            return [ entry[ 0 ], principalProps ]
        } ) )

        const lakeFormationGrantProps: GrantProps = {
            ...dbGrantProps,
            database: dbResourceName,
            databasePermissions: databasePermissions,
            tables: dbGrantProps.tables,
            tablePermissions: tablePermissions,
            principals: { ...dbGrantProps.principals || {}, ...principalArns }
        }
        return lakeFormationGrantProps
    }

    private createProjectKmsKey ( keyUserRoles: IRole[] ): ICaefKmsKey {
        //Allow CloudWatch logs to us the project key to encrypt/decrypt log data using this key
        const cloudwatchStatement = new PolicyStatement( {
            sid: "CloudWatchLogsEncryption",
            effect: Effect.ALLOW,
            actions: [
                ...DECRYPT_ACTIONS,
                ...ENCRYPT_ACTIONS
            ],
            principals: [ new ServicePrincipal( `logs.${ this.region }.amazonaws.com` ) ],
            resources: [ "*" ],
            //Limit access to use this key only for log groups within this account
            conditions: {
                "ArnEquals": {
                    "kms:EncryptionContext:aws:logs:arn": `arn:${ this.partition }:logs:${ this.region }:${ this.account }:log-group:*`
                }
            }
        } )

        const projectDeploymentStatement = new PolicyStatement( {
            sid: "ProjectDeployment",
            effect: Effect.ALLOW,
            actions: [
                ...DECRYPT_ACTIONS,
                ...ENCRYPT_ACTIONS
            ],
            principals: keyUserRoles,
            resources: [ "*" ]
        } )

        // Allow the account use the project KMS key for encrypting
        // messages into SQS Dead Letter Queues
        const sqsStatement = new PolicyStatement( {
            sid: "sqsEncryption",
            effect: Effect.ALLOW,
            // Actions required https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-key-management.html
            actions: [
                "kms:GenerateDataKey",
                "kms:Decrypt"
            ],
            resources: [ "*" ],
            conditions: {
                StringEquals: {
                    "kms:CallerAccount": this.account,
                    "kms:ViaService": `sqs.${ this.region }.amazonaws.com`
                }
            }
        } )
        sqsStatement.addAnyPrincipal()

        // Allow Eventbridge Service principal to use KMS key to publish to project SNS topic
        const eventBridgeStatement = new PolicyStatement( {
            sid: "eventBridgeEncryption",
            effect: Effect.ALLOW,
            actions: [
                "kms:GenerateDataKey",
                "kms:Decrypt"
            ],
            principals: [ new ServicePrincipal( "events.amazonaws.com" ) ],
            resources: [ "*" ]
        } )

        // Create a KMS Key if we need to make one for the project.
        const kmsKey = new CaefKmsKey( this.scope, 'ProjectKmsKey', {
            alias: "cmk",
            naming: this.props.naming,
            keyAdminRoleIds: this.dataAdminRoleIds,
            keyUserRoleIds: this.getAllRoleIds()
        } )
        kmsKey.addToResourcePolicy( cloudwatchStatement )
        kmsKey.addToResourcePolicy( projectDeploymentStatement )
        kmsKey.addToResourcePolicy( sqsStatement )
        kmsKey.addToResourcePolicy( eventBridgeStatement )

        // Required so we can auto-wire other stacks/resources to this project resource via SSM
        this.createProjectSSMParam( "ssm-kms-arn", `kmsArn/default`, kmsKey.keyArn )

        return kmsKey
    }

    private createProjectDeploymentRole (): IRole {
        const role = new CaefRole( this.scope, `project-deployment-role`, {
            assumedBy: new ServicePrincipal( "lambda.amazonaws.com" ),
            roleName: "deployment",
            naming: this.props.naming
        } )

        // Required so we can auto-wire other stacks/resources to this project resource via SSM
        this.createProjectSSMParam( `ssm-deployment-role`, `deploymentRole/default`, role.roleArn )
        return role
    }

    private createProjectBucket ( projectKmsKey: IKey, s3OutputKmsKey: IKey, projectDeploymentRole: IRole ): CaefBucket {
        const dataEngineerRoleIds = this.dataEngineerRoles.map( x => x.id() )
        const dataAdminRoleIds = this.dataAdminRoles.map( x => x.id() )
        const projectExecutionRoleIds = this.projectExecutionRoles.map( x => x.id() )

        //This project bucket will be used for all project-specific data
        const projectBucket = new CaefBucket( this.scope, `Bucketproject`, {
            encryptionKey: projectKmsKey,
            additionalKmsKeyArns: [ s3OutputKmsKey.keyArn ],
            naming: this.props.naming
        } )

        NagSuppressions.addResourceSuppressions(
            projectBucket,
            [
                { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'CAEF DataOps bucket does not use bucket replication.' },
                { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'CAEF DataOps bucket does not use bucket replication.' },
            ],
            true
        );
        //Data Admins can read/write the entire bucket
        //Data Engineers can read the entire bucket
        const rootPolicy = new RestrictObjectPrefixToRoles( {
            s3Bucket: projectBucket,
            s3Prefix: "/",
            readRoleIds: dataEngineerRoleIds,
            readWriteSuperRoleIds: dataAdminRoleIds
        } )
        rootPolicy.statements().forEach( statement => projectBucket.addToResourcePolicy( statement ) )

        //Deployment role can read/write /deployment
        //Execution role can read /deployment
        const deploymentPolicy = new RestrictObjectPrefixToRoles( {
            s3Bucket: projectBucket,
            s3Prefix: "/deployment",
            readRoleIds: projectExecutionRoleIds,
            readWritePrincipals: [ projectDeploymentRole ]
        } )
        deploymentPolicy.statements().forEach( statement => projectBucket.addToResourcePolicy( statement ) )
        //Data Engineers and can read/write under /data
        const dataPolicy = new RestrictObjectPrefixToRoles( {
            s3Bucket: projectBucket,
            s3Prefix: "/data",
            readWriteRoleIds: [ ...dataEngineerRoleIds, ...projectExecutionRoleIds ]
        } )
        dataPolicy.statements().forEach( statement => projectBucket.addToResourcePolicy( statement ) )

        //Execution role and can read/write under /temp
        const tempPolicy = new RestrictObjectPrefixToRoles( {
            s3Bucket: projectBucket,
            s3Prefix: "/temp",
            readWriteRoleIds: projectExecutionRoleIds
        } )
        tempPolicy.statements().forEach( statement => projectBucket.addToResourcePolicy( statement ) )

        //Default Deny Policy
        //Any role not specified in props is explicitely denied access to the bucket
        const bucketRestrictPolicy = new RestrictBucketToRoles( {
            s3Bucket: projectBucket,
            roleExcludeIds: this.getAllRoleIds(),
            principalExcludes: [ projectDeploymentRole.roleArn ]
        } )
        projectBucket.addToResourcePolicy( bucketRestrictPolicy.denyStatement )
        projectBucket.addToResourcePolicy( bucketRestrictPolicy.allowStatement )

        // Required so we can auto-wire other stacks/resources to this project resource via SSM
        this.createProjectSSMParam( "ssm-bucket-name", `projectBucket/default`, projectBucket.bucketName )
        return projectBucket
    }

    private getAllRoles (): CaefResolvableRole[] {
        return [ ...new Set( [ ...this.dataAdminRoles, ...this.dataEngineerRoles, ...this.projectExecutionRoles ] ) ]
    }

    private getAllRoleIds (): string[] {
        return this.getAllRoles().map( x => x.id() )
    }

    private createSNSTopic ( projectKmsKey: ICaefKmsKey ): CaefSnsTopic {
        // create SNS topic
        const snsProps: CaefSnsTopicProps = {
            naming: this.props.naming,
            topicName: "dataops-sns-topic",
            masterKey: projectKmsKey
        }
        const topic = new CaefSnsTopic( this.scope, "dataops-sns-topic", snsProps )
        //Allow EventBridge events to be published to the Topic
        const publishPolicyStatement = new PolicyStatement(
            {
                "sid": "Publish Policy",
                "effect": Effect.ALLOW,
                principals: [ new ServicePrincipal( `events.amazonaws.com` ) ],
                actions: [ "sns:Publish" ],
                resources: [ topic.topicArn ]
            }
        )
        topic.addToResourcePolicy( publishPolicyStatement )
        this.createProjectSSMParam( "ssm-topic-arn", `projectTopicArn/default`, topic.topicArn )

        return topic
    }

    private subscribeSNSTopic ( topic: CaefSnsTopic, failureNotifications?: FailureNotificationsProps ) {
        // subscribe to sns topic if email-ids are present
        failureNotifications?.email?.forEach( email => {
            topic.addSubscription( new EmailSubscription( email.trim() ) );
        } );
    }

    private createProjectSSMParam ( paramId: string, ssmPath: string, paramValue: string ) {
        console.log( `Creating Project SSM Param: ${ ssmPath }` )
        new StringParameter( this.scope, paramId, {
            parameterName: this.props.naming.ssmPath( ssmPath, true, false ),
            stringValue: paramValue
        } )
    }
}


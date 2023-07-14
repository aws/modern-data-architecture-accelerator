/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefRole } from '@aws-caef/iam-constructs';
import { CaefRoleRef } from '@aws-caef/iam-role-helper';
import { CaefKmsKey, ENCRYPT_ACTIONS, ICaefKmsKey } from '@aws-caef/kms-constructs';
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { CaefLambdaFunction, CaefLambdaRole } from '@aws-caef/lambda-constructs';
import { ICaefResourceNaming } from '@aws-caef/naming';
import { RestrictBucketToRoles, RestrictObjectPrefixToRoles } from '@aws-caef/s3-bucketpolicy-helper';
import { CaefBucket } from '@aws-caef/s3-constructs';
import { BucketInventory, InventoryHelper } from "@aws-caef/s3-inventory-helper";
import { Database } from '@aws-cdk/aws-glue-alpha';
import { CustomResource, Duration } from 'aws-cdk-lib';
import { Effect, IRole, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { CfnResource } from 'aws-cdk-lib/aws-lakeformation';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Bucket, CfnBucket, IBucket, LifecycleRule, NoncurrentVersionTransition, StorageClass, Transition } from 'aws-cdk-lib/aws-s3';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface InventoryDefinition {
    /**
     * The S3 prefix which will be inventoried
     */
    readonly prefix: string,
    /**
     * The bucket to which inventory will be written. If not specified, will be written back to the inventoried bucket under /inventory.
     */
    readonly destinationBucket?: string,
    /**
     * The S3 prefix (on the destinationBucket) to which inventory will be written. If not specified, defaults to /inventory.
     */
    readonly destinationPrefix?: string,
    /**
     * The destination account to which the destinationBucket should belong. Used by S3 service to validate bucket ownership before writing inventory.
     */
    readonly destinationAccount?: string
}

export interface LakeFormationLocation {
    /**
     * The S3 prefix of the location
     */
    readonly prefix: string

}

export interface BucketDefinition {
    /**
     * The zone of the bucket (IE "raw","transformed","curated",etc). Use to create the unique bucket name.
     */
    readonly bucketZone: string
    /**
     * List of access policies names which will be applied to the bucket
     */
    readonly accessPolicies: AccessPolicyProps[]
    /**
     * List of S3 lifecycle configuration rules which will be applied to the bucket
     */
    readonly lifecycleConfiguration?: LifecycleConfigurationRuleProps[]
    /**
     * List of inventory configurations to be applied to the bucket
     */
    readonly inventories?: { [ key: string ]: InventoryDefinition }
    /**
     * If true, EventBridgeNotifications will be enabled on the bucket, allowing bucket data events to be matched and actioned by EventBridge rules
     */
    readonly enableEventBridgeNotifications?: boolean
    /**
     * Locations which will be created as LakeFormation resources using the specified role.
     */
    readonly lakeFormationLocations?: { [ key: string ]: LakeFormationLocation }
    /**
     * If true (default), a "folder" object will be created on the bucket for each applied access policy.
     */
    readonly createFolderSkeleton?: boolean
    /**
     * If true (default), any roles not explicitely listed in the config will be blocked from reading/writing objects from this s3 bucket.
     */
    readonly defaultDeny?: boolean
}

export interface AccessPolicyProps {
    /**
     * Name of the access policy
     */
    readonly name: string,
    /**
     * The S3 Prefix to which the access policy will apply
     */
    readonly s3Prefix: string,
    /**
     * List of role ids which will be granted readonly access to the S3 prefix
     */
    readonly readRoleRefs?: CaefRoleRef[],
    /**
     * List of role ids which will be granted read/write access to the S3 prefix
     */
    readonly readWriteRoleRefs?: CaefRoleRef[],
    /**
     * List of role ids which will be granted superuser access to the S3 prefix
     */
    readonly readWriteSuperRoleRefs?: CaefRoleRef[],
}

interface AccessPolicyResolved {

    readonly name: string,

    readonly s3Prefix: string,

    readonly readRoleIds: string[],

    readonly readWriteRoleIds: string[],

    readonly readWriteSuperRoleIds: string[],

    readonly defaultDeny?: boolean
}

export interface LifecycleTransitionProps {
    readonly days: number,
    readonly storageClass: string,
    readonly newerNoncurrentVersions?: number
}

export interface LifecycleConfigurationRuleProps {
    readonly id: string,
    readonly status: string,
    readonly prefix?: string,
    readonly objectSizeGreaterThan?: number,
    readonly objectSizeLessThan?: number,
    readonly abortIncompleteMultipartUploadAfter?: number,
    readonly transitions?: LifecycleTransitionProps[],
    readonly expirationdays?: number,
    readonly expiredObjectDeleteMarker?: boolean,
    readonly noncurrentVersionTransitions?: LifecycleTransitionProps[],
    readonly noncurrentVersionExpirationDays?: number,
    readonly noncurrentVersionsToRetain?: number
}

export interface DataLakeL3ConstructProps extends CaefL3ConstructProps {
    /**
     * List of bucket defintions for the data lake
     */
    readonly buckets: BucketDefinition[];
}

export class S3DatalakeBucketL3Construct extends CaefL3Construct<DataLakeL3ConstructProps> {

    private dataLakeFolderProvider?: Provider
    public readonly buckets: { [ key: string ]: IBucket }
    public readonly kmsKey: IKey
    constructor( scope: Construct, id: string, props: DataLakeL3ConstructProps ) {
        super( scope, id, props );

        //Create a Glue Database to contain bucket utility tables such as inventory
        const glueUtilDatabase = new Database( this.scope, "util-database", {
            databaseName: props.naming.resourceName( "util" ).replace( /-/gi, "_" )
        } )

        const dataLakeFolderFunctionRole = new CaefLambdaRole( this.scope, 'folder-function-role', {
            description: 'CR Role',
            roleName: "folder-cr",
            naming: this.props.naming,
            logGroupNames: [ this.props.naming.resourceName( "folder-cr" ) ],
            createParams: false,
            createOutputs: false
        } )

        const lakeFormationRole = new CaefRole( this.scope, "lake-formation-role", {
            naming: this.props.naming,
            assumedBy: new ServicePrincipal( "lakeformation.amazonaws.com" ),
            roleName: "lake-formation",
            description: "Role for accessing the data lake via LakeFormation."
        } )

        const allRoleIds = this.props.buckets.flatMap( bucketProps => bucketProps.accessPolicies.flatMap( ap => this.resolveAccessPolicy( ap ) ).flatMap( ap =>
            [
                ...ap.readRoleIds,
                ...ap.readWriteRoleIds,
                ...ap.readWriteSuperRoleIds
            ]
        ) )

        this.kmsKey = this.createDataLakeKmsKey( [ dataLakeFolderFunctionRole.roleId, lakeFormationRole.roleId, ...allRoleIds ] )

        // Iterate over all the buckets we need to create
        this.buckets = Object.fromEntries( this.props.buckets.map( bucketDefinition => {
            const bucket = this.createBucket( bucketDefinition,
                this.kmsKey,
                props.naming,
                glueUtilDatabase,
                dataLakeFolderFunctionRole,
                this.getDataLakeFolderCrProvider( dataLakeFolderFunctionRole ),
                lakeFormationRole )
            return [ bucketDefinition.bucketZone, bucket ]
        } ) )
    }

    private resolveAccessPolicy ( accessPolicy: AccessPolicyProps ): AccessPolicyResolved {
        return {
            name: accessPolicy.name,
            s3Prefix: accessPolicy.s3Prefix,
            readRoleIds: this.props.roleHelper.resolveRoleRefsWithOrdinals( accessPolicy.readRoleRefs || [], `${ accessPolicy.name }-r` ).map( x => x.id() ),
            readWriteRoleIds: this.props.roleHelper.resolveRoleRefsWithOrdinals( accessPolicy.readWriteRoleRefs || [], `${ accessPolicy.name }-rw` ).map( x => x.id() ),
            readWriteSuperRoleIds: this.props.roleHelper.resolveRoleRefsWithOrdinals( accessPolicy.readWriteSuperRoleRefs || [], `${ accessPolicy.name }-rws` ).map( x => x.id() ),
        }
    }

    private resolveTransitions ( transitionsWithName: LifecycleTransitionProps[] ): Transition[] {
        const lifecycleTransitionsResolved = Object.entries( transitionsWithName ).map( transitionWithName => {
            const transition = transitionWithName[ 1 ]
            const lifecycleTransitionResolved: Transition = {
                storageClass: new StorageClass( transition.storageClass ),
                transitionAfter: Duration.days( transition.days )
            }
            return lifecycleTransitionResolved
        } )
        return lifecycleTransitionsResolved
    }

    private resolveNoncurrentVersionTransitions ( transitionsWithName: LifecycleTransitionProps[] ): NoncurrentVersionTransition[] {
        const lifecycleTransitionsResolved = Object.entries( transitionsWithName ).map( transitionWithName => {
            const transition = transitionWithName[ 1 ]
            const lifecycleTransitionResolved: NoncurrentVersionTransition = {
                storageClass: new StorageClass( transition.storageClass ),
                transitionAfter: Duration.days( transition.days ),
                noncurrentVersionsToRetain: transition.days
            }
            return lifecycleTransitionResolved
        } )
        return lifecycleTransitionsResolved
    }


    private resolveLifecycleConfigurationRules ( lifecycleConfigurationRulesWithName: LifecycleConfigurationRuleProps[] ): LifecycleRule[] {
        const lifecycleConfigurationRulesResolved = Object.entries( lifecycleConfigurationRulesWithName ).map( lifecycleConfigurationRuleWithName => {
            const lifecycleConfigurationRule = lifecycleConfigurationRuleWithName[ 1 ]
            const lifecycleConfigurationRuleResolved: LifecycleRule = {
                ...lifecycleConfigurationRule,
                ...{
                    enabled: lifecycleConfigurationRule.status.toLowerCase() == 'enabled' ? true : false,
                    abortIncompleteMultipartUploadAfter: lifecycleConfigurationRule.abortIncompleteMultipartUploadAfter ? Duration.days( lifecycleConfigurationRule.abortIncompleteMultipartUploadAfter ) : undefined,
                    transitions: lifecycleConfigurationRule.transitions ? this.resolveTransitions( lifecycleConfigurationRule.transitions ) : undefined,
                    expiration: lifecycleConfigurationRule.expirationdays ? Duration.days( lifecycleConfigurationRule.expirationdays ) : undefined,
                    noncurrentVersionTransitions: lifecycleConfigurationRule.noncurrentVersionTransitions ? this.resolveNoncurrentVersionTransitions( lifecycleConfigurationRule.noncurrentVersionTransitions ) : undefined,
                    noncurrentVersionExpiration: lifecycleConfigurationRule.noncurrentVersionExpirationDays ? Duration.days( lifecycleConfigurationRule.noncurrentVersionExpirationDays ) : undefined
                }
            }
            return lifecycleConfigurationRuleResolved
        } )
        return lifecycleConfigurationRulesResolved
    }

    private createBucket ( bucketDefinition: BucketDefinition,
        encryptionKey: ICaefKmsKey,
        naming: ICaefResourceNaming,
        glueUtilDatabase: Database,
        dataLakeFolderFunctionRole: IRole,
        dataLakeFolderProvider: Provider,
        lakeFormationRole: CaefRole
    ): IBucket {

        const bucket = new CaefBucket( this.scope, `bucket-${ bucketDefinition.bucketZone }`, {
            encryptionKey: encryptionKey,
            bucketName: bucketDefinition.bucketZone,
            naming: naming
        } )

        NagSuppressions.addResourceSuppressions(
            bucket,
            [
                { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'CAEF Data Lake does not use bucket replication.' },
                { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'CAEF Data Lake does not use bucket replication.' }
            ],
            true
        );

        this.createBucketInventories( bucketDefinition, bucket, glueUtilDatabase )
        this.createLakeFormationLocations( bucketDefinition, bucket, lakeFormationRole )

        // Iterate over the accessPolicies and add to the bucket
        const bucketAllowIds: string[] = [ lakeFormationRole.roleId ]

        const folderCreatePrefixes: string[] = []
        bucketDefinition.accessPolicies.map( ap => this.resolveAccessPolicy( ap ) ).forEach( accessPolicy => {
            const s3Prefix = accessPolicy.s3Prefix

            //Apply bucket policy restrictions for Object prefixes
            const prefixRestrictPolicies = new RestrictObjectPrefixToRoles( {
                s3Bucket: bucket,
                s3Prefix: s3Prefix,
                readRoleIds: accessPolicy.readRoleIds,
                readWriteRoleIds: accessPolicy.readWriteRoleIds,
                readWriteSuperRoleIds: accessPolicy.readWriteSuperRoleIds
            } )
            prefixRestrictPolicies.statements().forEach( statement => bucket.addToResourcePolicy( statement ) )

            // Add the ARNs from this loop to bucketAllowArns
            bucketAllowIds.push( ...[
                ...accessPolicy.readRoleIds,
                ...accessPolicy.readWriteRoleIds,
                ...accessPolicy.readWriteSuperRoleIds ]
            )
            folderCreatePrefixes.push( ...this.createFolderPrefix( s3Prefix, bucketDefinition, accessPolicy, dataLakeFolderProvider, bucket ) )
        } )

        this.createFolderPrefixes( folderCreatePrefixes, bucket, dataLakeFolderFunctionRole )

        this.addBucketRestrictPolicy( bucketDefinition, bucket, bucketAllowIds, dataLakeFolderFunctionRole )

        this.addBucketLifecyclePolicy( bucketDefinition, bucket )

        this.addBucketEventBridgeNotification( bucketDefinition, bucket )

        return bucket
    }

    private addBucketEventBridgeNotification ( bucketDefinition: BucketDefinition, bucket: Bucket ) {
        //Enable EventBridge notifications
        if ( bucketDefinition.enableEventBridgeNotifications && bucketDefinition.enableEventBridgeNotifications.valueOf() ) {
            const cfnBucket = bucket.node.defaultChild as CfnBucket;
            cfnBucket.addPropertyOverride( 'NotificationConfiguration.EventBridgeConfiguration.EventBridgeEnabled', true );
        }
    }

    private addBucketLifecyclePolicy ( bucketDefinition: BucketDefinition, bucket: Bucket ) {
        // Add S3 Lifecycle Policy
        if ( bucketDefinition.lifecycleConfiguration ) {
            this.resolveLifecycleConfigurationRules( bucketDefinition.lifecycleConfiguration ).forEach( lifecycleRule => {
                bucket.addLifecycleRule( lifecycleRule )
            } )
        }
    }

    private createFolderPrefixes ( folderCreatePrefixes: string[], bucket: Bucket, dataLakeFolderFunctionRole: IRole ) {
        if ( folderCreatePrefixes.length > 0 ) {
            //Allow folder custom resource provider role to create folders in the bucket
            const resources = folderCreatePrefixes.map( s3Prefix => {
                let rawPrefix = s3Prefix
                // Removes trailing slashes
                rawPrefix = rawPrefix.endsWith( '/' ) ? rawPrefix.slice( 0, -1 ) : rawPrefix
                // Removes leading slashes
                rawPrefix = rawPrefix.startsWith( '/' ) ? rawPrefix.substring( 1 ) : rawPrefix
                return `${ bucket.bucketArn }/${ rawPrefix }/`
            } )
            const createFolderPolicyStatement = new PolicyStatement( {
                effect: Effect.ALLOW,
                resources: resources,
                actions: [
                    "s3:PutObject"
                ]
            } )
            createFolderPolicyStatement.addArnPrincipal( dataLakeFolderFunctionRole.roleArn )
            bucket.addToResourcePolicy( createFolderPolicyStatement )
        }
    }

    private createFolderPrefix ( s3Prefix: string,
        bucketDefinition: BucketDefinition,
        accessPolicy: AccessPolicyResolved,
        dataLakeFolderProvider: Provider,
        bucket: Bucket ): string[] {
        if ( s3Prefix != "/" && ( bucketDefinition.createFolderSkeleton == undefined || bucketDefinition.createFolderSkeleton.valueOf() ) ) {
            const folderResource = new CustomResource( this.scope, `datalake-folder-${ bucketDefinition.bucketZone }-${ accessPolicy.name }`, {
                serviceToken: dataLakeFolderProvider.serviceToken,
                properties: {
                    bucket_name: bucket.bucketName,
                    folder_name: s3Prefix
                }
            } );
            folderResource.node.addDependency( bucket.node.findChild( "Policy" ) )
            return [ s3Prefix ]
        }
        return []
    }

    private addBucketRestrictPolicy ( bucketDefinition: BucketDefinition, bucket: CaefBucket, bucketAllowIds: string[], dataLakeFolderFunctionRole: IRole ) {
        const bucketRestrictPolicy = new RestrictBucketToRoles( {
            s3Bucket: bucket,
            // De-duplicate our list of Arns.
            roleExcludeIds: [ ...new Set( bucketAllowIds ) ],
            principalExcludes: [ dataLakeFolderFunctionRole.roleArn ],
            prefixExcludes: [ "inventory/" ]
        } )

        bucket.addToResourcePolicy( bucketRestrictPolicy.allowStatement )
        if ( !bucketDefinition.hasOwnProperty( "defaultDeny" ) || bucketDefinition[ "defaultDeny" ] ) {
            bucket.addToResourcePolicy( bucketRestrictPolicy.denyStatement )
        }
    }

    private createLakeFormationLocations ( bucketDefinition: BucketDefinition, bucket: IBucket, lakeFormationRole: IRole ) {
        //Add Lake Formation locations
        if ( bucketDefinition.lakeFormationLocations ) {
            Object.keys( bucketDefinition.lakeFormationLocations ).forEach( locationName => {
                const locationProps = ( bucketDefinition.lakeFormationLocations || {} )[ locationName ]
                this.createLakeFormationLocation( locationName, locationProps, bucketDefinition.bucketZone, bucket, lakeFormationRole )
            } )
        }
    }

    private createBucketInventories ( bucketDefinition: BucketDefinition,
        bucket: Bucket,
        glueUtilDatabase: Database ) {
        if ( bucketDefinition.inventories ) {
            const bucketInventories: BucketInventory[] = []
            Object.keys( bucketDefinition.inventories ).forEach( invName => {
                const inventoryDefinition = ( bucketDefinition.inventories || {} )[ invName ]
                const inventory = this.createInventory( invName, inventoryDefinition, bucketDefinition.bucketZone, bucketInventories )
                bucket.addInventory( inventory )
            } )
            if ( bucketInventories.length > 0 ) {
                InventoryHelper.createGlueInvTable( this.scope,
                    this.account,
                    bucketDefinition.bucketZone,
                    glueUtilDatabase,
                    this.props.naming.resourceName( bucketDefinition.bucketZone ),
                    bucketInventories,
                    "inventory/" )
            }
            const allowInventoryStatement = InventoryHelper.createInventoryBucketPolicyStatement( bucket.bucketArn, this.account, bucket.bucketArn, "inventory/" )
            bucket.addToResourcePolicy( allowInventoryStatement )
        }
    }

    private createLakeFormationLocation ( locationName: string,
        locationProps: LakeFormationLocation,
        bucketZone: string,
        bucket: IBucket,
        lakeFormationRole: IRole ) {
        new CfnResource( this.scope, `lf-resource-${ bucketZone }-${ locationName }`, {
            resourceArn: `${ bucket.bucketArn }/${ CaefBucket.formatS3Prefix( locationProps.prefix ) }`,
            useServiceLinkedRole: false,
            roleArn: lakeFormationRole.roleArn
        } )
        //Add Read Access for the LF Role to the Prefix
        const lfPrefixRestrictPolicies = new RestrictObjectPrefixToRoles( {
            s3Bucket: bucket,
            s3Prefix: locationProps.prefix,
            readPrincipals: [ lakeFormationRole ]
        } )
        lfPrefixRestrictPolicies.statements().forEach( statement => bucket.addToResourcePolicy( statement ) )
    }

    private createInventory ( invName: string, inventoryDefinition: InventoryDefinition, bucketZone: string, bucketInventories: BucketInventory[] ) {
        let destinationBucketName: string
        let destinationPrefix: string

        if ( inventoryDefinition.destinationBucket ) { //Remote destination bucket
            destinationBucketName = inventoryDefinition.destinationBucket
            destinationPrefix = inventoryDefinition.destinationPrefix ? inventoryDefinition.destinationPrefix : "inventory/"
        } else { //Write inventory to this bucket
            if ( inventoryDefinition.destinationPrefix ) {
                throw new Error( "destinationPrefix should be set only if destinationBucket is set" )
            }
            destinationBucketName = this.props.naming.resourceName( bucketZone )
            destinationPrefix = "inventory/"
            bucketInventories.push( { bucketName: destinationBucketName, inventoryName: invName } )
        }
        const destinationBucket: IBucket = CaefBucket.fromBucketName(
            this,
            `InvDestinationBucket${ bucketZone }${ invName }`,
            destinationBucketName
        )
        return InventoryHelper.createInvConfig(
            destinationBucket,
            invName,
            inventoryDefinition.prefix,
            destinationPrefix,
            inventoryDefinition.destinationAccount )
    }

    private getDataLakeFolderCrProvider ( folderCrFunctionRole: CaefLambdaRole ): Provider {
        if ( this.dataLakeFolderProvider ) {
            return this.dataLakeFolderProvider
        }
        const sourceDir = `${ __dirname }/../src/python/datalake_folder`
        // This Lambda is used as a Custom Resource in order to create the Data Lake Folder
        const datalakeFolderLambda = new CaefLambdaFunction( this.scope, "folder-cr-function", {
            functionName: "folder-cr",
            code: Code.fromAsset( sourceDir ),
            handler: "datalake_folder.lambda_handler",
            runtime: Runtime.PYTHON_3_10,
            timeout: Duration.seconds( 120 ),
            role: folderCrFunctionRole,
            naming: this.props.naming,
            createParams: false,
            createOutputs: false
        } );
        NagSuppressions.addResourceSuppressions(
            datalakeFolderLambda,
            [
                { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is for custom resource and error handling will be handled by CloudFormation.' },
                { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Function is for custom resource and will interact only with S3.' },
                { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.' },
                { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function is for custom resource and error handling will be handled by CloudFormation.' },
                { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Function is for custom resource and will interact only with S3.' },
                { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.' }
            ],
            true
        );

        const folderCrProviderFunctionName = this.props.naming.resourceName( "folder-cr-prov", 64 )
        const folderCrProviderRole = new CaefLambdaRole( this.scope, 'folder-provider-role', {
            description: 'CR Role',
            roleName: 'folder-provider-role',
            naming: this.props.naming,
            logGroupNames: [ folderCrProviderFunctionName ],
            createParams: false,
            createOutputs: false
        } )

        const datalakeFolderProvider = new Provider( this.scope, "datalake-folder-cr-provider", {
            providerFunctionName: folderCrProviderFunctionName,
            onEventHandler: datalakeFolderLambda,
            role: folderCrProviderRole
        } );

        NagSuppressions.addResourceSuppressions(
            folderCrProviderRole,
            [
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Role is for Custom Resource Provider. Inline policy automatically added.' },
                { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Role is for Custom Resource Provider. Inline policy automatically added.' }
            ],
            true
        );
        NagSuppressions.addResourceSuppressions(
            datalakeFolderProvider,
            [
                { id: 'AwsSolutions-L1', reason: 'Lambda function Runtime set by CDK Provider Framework' },
                { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is for custom resource and error handling will be handled by CloudFormation.' },
                { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Function is for custom resource and will interact only with S3.' },
                { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.' },
                { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function is for custom resource and error handling will be handled by CloudFormation.' },
                { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Function is for custom resource and will interact only with S3.' },
                { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.' }
            ],
            true
        );
        this.dataLakeFolderProvider = datalakeFolderProvider
        return datalakeFolderProvider
    }

    private createDataLakeKmsKey ( keyUserRoles: string[] ): CaefKmsKey {
        //This statement allows S3 to write inventory data to the encrypted data lake buckets
        const S3ServiceEncryptPolicy = new PolicyStatement( {
            effect: Effect.ALLOW,
            // Use of * mirrors what is done in the CDK methods for adding policy helpers.
            resources: [ '*' ],
            actions: ENCRYPT_ACTIONS
        } )
        S3ServiceEncryptPolicy.addServicePrincipal( "s3.amazonaws.com" )

        const kmsKey = new CaefKmsKey( this.scope, "cmk", {
            naming: this.props.naming,
            keyUserRoleIds: keyUserRoles
        } )
        kmsKey.addToResourcePolicy( S3ServiceEncryptPolicy )
        return kmsKey
    }

}

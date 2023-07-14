/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IPrincipal, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam"
import { IBucket } from "aws-cdk-lib/aws-s3"

export interface IRestrictObjectPrefixToRoles {
    /**
     * S3 Bucket to use for the resource ARN while constructing the policy
     */
    s3Bucket: IBucket
    /**
     * S3 Object key prefix to restrict.
     */
    s3Prefix: string
    /**
     * Array of Role ARNs to provide Read Access to the prefix.
     *                        Must be resolvable to AROAs using the CaefRoleResolver class included.
     */
    readRoleIds?: string[]
    /**
     * Array of Role ARNs to provide Read/Write access to the prefix.
     *                        Must be resolvable to AROAs using the CaefRoleResolver class included.
     */
    readWriteRoleIds?: string[]
    /**
     * Array of Role ARNs to provide Read/Write/Super (Permanent Delete) access to the prefix.
     *                        Must be resolvable to AROAs using the CaefRoleResolver class included.
     */
    readWriteSuperRoleIds?: string[]
    /**
     * Array of Principals to provide Read Access to the prefix.
     */
    readPrincipals?: IPrincipal[]
    /**
     * Array of Principals to provide Read/Write access to the prefix.
     */
    readWritePrincipals?: IPrincipal[]
    /**
     *  Array of Principals to provide Read/Write/Super (Permanent Delete) access to the prefix.
     */
    readWriteSuperPrincipals?: IPrincipal[]
}

export interface IRestrictBucketToRoles {
    /**
     * S3 Bucket to use for the resource ARN while constructing the policy
     */
    s3Bucket: IBucket
    /**
     * Array of Role ARNs to provide Access to the bucket.
     *                        Must be resolvable to AROAs using the CaefRoleResolver class included.
     */
    roleExcludeIds: string[]
    /**
     * Set of principals to exclude from the Deny Restrictions.
     *                        NOTE: this doesn't permit or deny that principal
     */
    principalExcludes?: string[]
    /**
     * S3 object prefixes to exclude from the Deny Restrictions.
     *                        Results in the deny applying to *All Prefixes* except the ones here.
     */
    prefixExcludes?: string[]
    /**
     * S3 object prefixes to include in the Deny Restrictions.
     *                       Results in the deny only applying to the the prefixes specified here.
     */
    prefixIncludes?: string[]
}

/** Helper class for generating S3 bucket policy statements which grant access to specific object prefixes */
export class RestrictObjectPrefixToRoles {

    static readonly READ_ACTIONS = [ 's3:GetObject*' ]
    static readonly READ_WRITE_ACTIONS = [
        ...RestrictObjectPrefixToRoles.READ_ACTIONS,
        's3:PutObject',
        's3:PutObjectTagging',
        's3:DeleteObject'
    ]
    static readonly READ_WRITE_SUPER_ACTIONS = [
        ...RestrictObjectPrefixToRoles.READ_WRITE_ACTIONS,
        's3:DeleteObjectVersion'
    ]
    static readonly BUCKET_ALLOW_ACTIONS = [ 's3:List*', 's3:GetBucket*' ]
    static readonly BUCKET_DENY_ACTIONS = [ 's3:PutObject*', 's3:GetObject*', 's3:DeleteObject*' ]

    private _readStatements: PolicyStatement[] = []
    private _readWriteStatements: PolicyStatement[] = []
    private _readWriteSuperStatements: PolicyStatement[] = []
    private _formattedPrefix: string

    constructor( props: IRestrictObjectPrefixToRoles ) {
        this._formattedPrefix = "/" + this.formatS3Prefix( props.s3Prefix ) + '/*'
        // Covers our case where two / get resolved because our prefix is actually /
        this._formattedPrefix = this._formattedPrefix.replace( /\/\//, '/' )

        // FEDERATED / READ
        if ( props.readRoleIds != undefined && props.readRoleIds.length > 0 ) {
            // Construct our User:Id roles for read
            let statement = this._readStatementScaffold( props )
            statement.addCondition( "StringLike", { "aws:userId": [ ...new Set( props.readRoleIds.map( x => `${ x }:*` ) ) ].sort() } )
            statement.addAnyPrincipal()
            this._readStatements.push( statement )
        }
        // FEDERATED / READWRITE
        if ( props.readWriteRoleIds != undefined && props.readWriteRoleIds.length > 0 ) {
            let statement = this._readWriteStatementScaffold( props )
            statement.addCondition( "StringLike", { "aws:userId": [ ...new Set( props.readWriteRoleIds.map( x => `${ x }:*` ) ) ].sort() } )
            statement.addAnyPrincipal()
            this._readWriteStatements.push( statement )
        }

        // FEDERATED / READWRITESUPER
        if ( props.readWriteSuperRoleIds != undefined && props.readWriteSuperRoleIds.length > 0 ) {
            let statement = this._readWriteSuperStatementScaffold( props )
            statement.addCondition( "StringLike", { "aws:userId": [ ...new Set( props.readWriteSuperRoleIds.map( x => `${ x }:*` ) ) ].sort() } )
            statement.addAnyPrincipal()
            this._readWriteSuperStatements.push( statement )
        }

        // NONFEDERATED / READ
        if ( props.readPrincipals != undefined && props.readPrincipals.length > 0 ) {
            let statement = this._readStatementScaffold( props )
            props.readPrincipals.sort()
            props.readPrincipals.forEach( principal => {
                statement.addPrincipals( principal )
            } )
            this._readStatements.push( statement )
        }
        // NONFEDERATED / READWRITE
        if ( props.readWritePrincipals != undefined && props.readWritePrincipals.length > 0 ) {
            let statement = this._readWriteStatementScaffold( props )
            props.readWritePrincipals.sort()
            props.readWritePrincipals.forEach( principal => {
                statement.addPrincipals( principal )
            } )
            this._readWriteStatements.push( statement )
        }
        // NONFEDERATED / READWRITESUPER
        if ( props.readWriteSuperPrincipals != undefined && props.readWriteSuperPrincipals.length > 0 ) {
            let statement = this._readWriteSuperStatementScaffold( props )
            props.readWriteSuperPrincipals.sort()
            props.readWriteSuperPrincipals.forEach( principal => {
                statement.addPrincipals( principal )
            } )
            this._readWriteSuperStatements.push( statement )
        }
    }

    private _readStatementScaffold ( props: IRestrictObjectPrefixToRoles ): PolicyStatement {
        return new PolicyStatement( {
            sid: `${ props.s3Prefix.replace( /\\W/g, '' ) }_Read`,
            effect: Effect.ALLOW,
            resources: [ props.s3Bucket.bucketArn + this._formattedPrefix ],
            actions: RestrictObjectPrefixToRoles.READ_ACTIONS,
        } )
    }

    private _readWriteStatementScaffold ( props: IRestrictObjectPrefixToRoles ): PolicyStatement {
        return new PolicyStatement( {
            sid: `${ props.s3Prefix.replace( /\\W/g, '' ) }_ReadWrite`,
            effect: Effect.ALLOW,
            resources: [ props.s3Bucket.bucketArn + this._formattedPrefix ],
            actions: RestrictObjectPrefixToRoles.READ_WRITE_ACTIONS
        } )
    }

    private _readWriteSuperStatementScaffold ( props: IRestrictObjectPrefixToRoles ): PolicyStatement {
        return new PolicyStatement( {
            sid: `${ props.s3Prefix.replace( /\\W/g, '' ) }_ReadWriteSuper`,
            effect: Effect.ALLOW,
            resources: [ props.s3Bucket.bucketArn + this._formattedPrefix ],
            actions: RestrictObjectPrefixToRoles.READ_WRITE_SUPER_ACTIONS
        } )
    }

    public readStatements (): PolicyStatement[] {
        return this._readStatements
    }

    public readWriteStatements (): PolicyStatement[] {
        return this._readWriteStatements
    }

    public readWriteSuperStatements (): PolicyStatement[] {
        return this._readWriteSuperStatements
    }

    public statements (): PolicyStatement[] {
        return [ ...this._readStatements, ...this._readWriteStatements, ...this._readWriteSuperStatements ]
    }

    public formatS3Prefix ( prefix: string ): string {
        let rawPrefix = prefix;

        // Removes trailing slashes
        rawPrefix = rawPrefix.endsWith( '/' ) ? rawPrefix.slice( 0, -1 ) : rawPrefix
        // Removes leading slashes
        rawPrefix = rawPrefix.startsWith( '/' ) ? rawPrefix.substring( 1 ) : rawPrefix
        return rawPrefix
    }
}

/** Helper class for generating bucket policy statements 
 * which allow or deny access to an entire bucket. Used to
 * create bucket-level default deny statements to block accesses
 * not granted in the bucket policy. */
export class RestrictBucketToRoles {
    public readonly denyStatement: PolicyStatement
    public readonly allowStatement: PolicyStatement
    private resource: string[] = []
    private notResource: string[] = []
    private denyConditionalNotEquals: {
        "aws:userId"?: string[],
        "aws:PrincipalArn"?: string[],
    } = {}

    constructor( props: IRestrictBucketToRoles ) {

        // Statement allowing access to the bucket for the AROAs
        this.allowStatement = new PolicyStatement( {
            sid: `BucketAllow`,
            effect: Effect.ALLOW,
            resources: [
                props.s3Bucket.bucketArn + "/*",
                props.s3Bucket.bucketArn
            ],
            actions: RestrictObjectPrefixToRoles.BUCKET_ALLOW_ACTIONS,
        } )
        this.allowStatement.addAnyPrincipal()
        this.allowStatement.addCondition( "StringLike", { "aws:userId": [ ...new Set( props.roleExcludeIds.map( x => `${ x }:*` ) ) ].sort() } )

        // Constuct our deny statement.
        // prefixIncludes denotes we want to include a prefix in our deny meaning Resource
        if ( props.prefixIncludes ) {
            this.resource = props.prefixIncludes.map( prefix => {
                return `${ props.s3Bucket.bucketArn }/${ this.formatS3Prefix( prefix ) }`
            } )
        } else {
            this.resource = [ props.s3Bucket.bucketArn + "/*" ]
        }
        // prefixExcludes denote we want to exclude a prefix in our deny meaning notResource
        if ( props.prefixExcludes ) {
            this.notResource = props.prefixExcludes.map( prefix => {
                return `${ props.s3Bucket.bucketArn }/${ this.formatS3Prefix( prefix ) }`
            } )
        }

        if ( this.notResource.length > 0 ) {
            this.denyStatement = new PolicyStatement( {
                sid: `BucketDeny`,
                effect: Effect.DENY,
                notResources: this.notResource,
                actions: RestrictObjectPrefixToRoles.BUCKET_DENY_ACTIONS,
            } )
        } else {
            this.denyStatement = new PolicyStatement( {
                sid: `BucketDeny`,
                effect: Effect.DENY,
                resources: this.resource,
                actions: RestrictObjectPrefixToRoles.BUCKET_DENY_ACTIONS,
            } )
        }
        this.denyStatement.addAnyPrincipal()

        // Build our conditionals.
        props.roleExcludeIds.sort()
        this.denyConditionalNotEquals[ "aws:userId" ] = props.roleExcludeIds.map( x => `${ x }:*` )
        if ( props.principalExcludes && props.principalExcludes.length > 0 ) {
            this.denyConditionalNotEquals[ "aws:PrincipalArn" ] = [ ...new Set( props.principalExcludes ) ].sort()
        }

        // Construct our conditional for our deny
        if ( Object.keys( this.denyConditionalNotEquals ).length == 1 ) {
            this.denyStatement.addCondition( "StringNotLike", this.denyConditionalNotEquals )
        } else {
            this.denyStatement.addCondition( "ForAnyValue:StringNotLike", this.denyConditionalNotEquals )
        }
    }

    private formatS3Prefix ( prefix: string ): string {
        let rawPrefix = prefix;

        // Removes trailing slashes
        rawPrefix = rawPrefix.endsWith( '/' ) ? rawPrefix.slice( 0, -1 ) : rawPrefix
        // Removes leading slashes
        rawPrefix = rawPrefix.startsWith( '/' ) ? rawPrefix.substring( 1 ) : rawPrefix
        return `${ rawPrefix }/*`
    }

}

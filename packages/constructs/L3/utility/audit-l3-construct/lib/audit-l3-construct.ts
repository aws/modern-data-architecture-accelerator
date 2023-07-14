/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { CaefKmsKey, ENCRYPT_ACTIONS } from '@aws-caef/kms-constructs';
import { CaefBucket } from '@aws-caef/s3-constructs';
import { AuditHelper } from '@aws-caef/s3-audit-helper';
import { RestrictObjectPrefixToRoles } from '@aws-caef/s3-bucketpolicy-helper';
import { InventoryHelper } from '@aws-caef/s3-inventory-helper';
import { Database } from '@aws-cdk/aws-glue-alpha';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { CaefRoleRef } from '@aws-caef/iam-role-helper';


export interface BucketInventoryProps {
    /**
     * Name of the bucket being inventoried
     */
    readonly bucketName: string,
    /**
     * Name of the inventory configuration
     */
    readonly inventoryName: string
}

export interface AuditL3ConstructProps extends CaefL3ConstructProps {
    /**
     * List of source accounts from which Audit data is expected. 
     */
    readonly sourceAccounts: string[];
    /**
     * List of source regions from which Audit data is expected
     */
    readonly sourceRegions: string[];
    /**
     * List of roles which will be provided readonly access to the audit data
     */
    readonly readRoleRefs: CaefRoleRef[];
    /**
     * List of Bucket Inventory definitions which are expected to be written to the bucket. 
     * Used to create the Inventory Glue table with the proper partitions.
     * */
    readonly bucketInventories?: BucketInventoryProps[];
    /**
     * S3 prefix under which writing of inventories is allowed.
     */
    readonly inventoryPrefix: string
}

export class AuditL3Construct extends CaefL3Construct<AuditL3ConstructProps> {

    private readonly auditSourceAccounts: string[];
    private readonly auditSourceRegions: string[];
    private readonly readRoleIds: string[]
    constructor( scope: Construct, id: string, props: AuditL3ConstructProps ) {
        super( scope, id, props );

        this.auditSourceAccounts = [ this.account, ...this.props.sourceAccounts ]
        this.auditSourceRegions = [ this.region, ...this.props.sourceRegions ]
        this.readRoleIds = this.props.roleHelper.resolveRoleRefsWithOrdinals( this.props.readRoleRefs, "Read" ).map( x => x.id() )
        const auditKmsKey = this.createAuditKmsKey()
        this.createAuditResources( auditKmsKey )
    }

    private createAuditKmsKey (): CaefKmsKey {
        const serviceEncryptPolicy = new PolicyStatement( {
            effect: Effect.ALLOW,
            // Use of * mirrors what is done in the CDK methods for adding policy helpers.
            resources: [ '*' ],
            actions: ENCRYPT_ACTIONS
        } )
        //Allow CloudTrail Service to encrypt audit trails
        serviceEncryptPolicy.addServicePrincipal( "cloudtrail.amazonaws.com" )
        //Allow S3 Service to encrypt inventories
        serviceEncryptPolicy.addServicePrincipal( "s3.amazonaws.com" )

        //Create a KMS key specific to audit
        const auditKmsKey = new CaefKmsKey( this, "kms-cmk", {
            naming: this.props.naming,
            keyUserRoleIds: this.readRoleIds
        } )
        auditKmsKey.addToResourcePolicy( serviceEncryptPolicy )
        return auditKmsKey
    }

    private createAuditResources ( auditKmsKey: CaefKmsKey ) {

        let auditBucket = new CaefBucket( this, "bucket", {
            encryptionKey: auditKmsKey,
            naming: this.props.naming,
            enforceExclusiveKmsKeys: false // Cloudtrail cannot currently create trails if the DENY statements resulting from enforceExclusiveKmsKeys are present in the bucket policy
        } )

        const cloudTrailACLStatement = new PolicyStatement( {
            sid: "AWSCloudTrailAclCheck20150319",
            effect: Effect.ALLOW,
            resources: [ auditBucket.bucketArn ],
            actions: [
                "s3:GetBucketAcl"
            ],
            principals: [ new ServicePrincipal( "cloudtrail.amazonaws.com" ) ]
        } )
        auditBucket.addToResourcePolicy( cloudTrailACLStatement )

        const readRolePermissions = new RestrictObjectPrefixToRoles( {
            s3Bucket: auditBucket,
            s3Prefix: "/",
            readRoleIds: this.readRoleIds
        } )
        readRolePermissions.statements().forEach( statement => auditBucket.addToResourcePolicy( statement ) )

        this.auditSourceAccounts.forEach( srcAccount => {
            const cloudTrailACLStatement = new PolicyStatement( {
                sid: `AWSCloudTrailWrite20150319-${ srcAccount }`,
                effect: Effect.ALLOW,
                resources: [
                    `${ auditBucket.bucketArn }/AWSLogs/${ srcAccount }/*`
                ],
                actions: [
                    "s3:PutObject"
                ],
                principals: [ new ServicePrincipal( "cloudtrail.amazonaws.com" ) ],
                conditions: {
                    "StringEquals": {
                        "s3:x-amz-acl": "bucket-owner-full-control"
                    },
                    "StringLike": {
                        "aws:SourceArn": `arn:${ this.partition }:cloudtrail:*:${ srcAccount }:trail/*`
                    }
                }
            } )
            auditBucket.addToResourcePolicy( cloudTrailACLStatement )
            const inventoryStatement = InventoryHelper.createInventoryBucketPolicyStatement( auditBucket.bucketArn, srcAccount, undefined, this.props.inventoryPrefix )
            auditBucket.addToResourcePolicy( inventoryStatement )
        } )

        NagSuppressions.addResourceSuppressions(
            auditBucket,
            [
                { id: 'AwsSolutions-S1', reason: '1. Audit bucket is target of cloudtrail audit logs. 2. Server access logs do not support KMS on targets.' },
                { id: 'NIST.800.53.R5-S3BucketLoggingEnabled', reason: '1. Audit bucket is target for data lake cloudtrail audit logs. 2. Server access logs do not support KMS on targets.' },
                { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'CAEF Data Lake does not use bucket replication.' },
                { id: 'HIPAA.Security-S3BucketLoggingEnabled', reason: '1. Audit bucket is target for data lake cloudtrail audit logs. 2. Server access logs do not support KMS on targets.' },
                { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'CAEF Data Lake does not use bucket replication.' }
            ],
            true
        );

        //Create a Glue Database to contain audit tables
        const glueUtilDatabase = new Database( this, "database", {
            databaseName: this.props.naming.resourceName().replace( /-/gi, "_" )
        } )

        AuditHelper.createGlueAuditTable( this, auditBucket, glueUtilDatabase, this.auditSourceAccounts, this.auditSourceRegions )
        if ( this.props.bucketInventories ) {
            InventoryHelper.createGlueInvTable( this,
                this.account,
                "audit",
                glueUtilDatabase,
                auditBucket.bucketName,
                this.props.bucketInventories,
                this.props.inventoryPrefix )
        }
    }
}

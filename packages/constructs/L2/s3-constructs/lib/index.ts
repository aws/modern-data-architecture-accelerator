/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as caef_construct from '@aws-caef/construct';
import { ICaefKmsKey } from '@aws-caef/kms-constructs';
import { Fn, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { BlockPublicAccess, Bucket, BucketEncryption, BucketProps, IBucket, IntelligentTieringConfiguration, Inventory, LifecycleRule } from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

/**
 * Properties for the creation of a CAEF S3 Bucket
 */
export interface CaefBucketProps extends caef_construct.CaefConstructProps {
    /**
     * Additional KMS key Arns which may be used to write to the bucket (in addition to the default)
     */
    readonly additionalKmsKeyArns?: string[]
    /**
     * If true (default), only the specified KMS keys will be permitted to be used to write to the bucket
     */
    readonly enforceExclusiveKmsKeys?: boolean
    /**
     * External KMS key to use for bucket encryption.
     *
     * The 'encryption' property must be either not specified or set to "Kms".
     * An error will be emitted if encryption is set to "Unencrypted" or
     * "Managed".
     *
     * @default - If encryption is set to "Kms" and this property is undefined,
     * a new KMS key will be created and associated with this bucket.
     */
    readonly encryptionKey: ICaefKmsKey;
    /**
     * Physical name of this bucket.
     *
     * @default - Assigned by CloudFormation (recommended).
     */
    readonly bucketName?: string;
    /**
     * Whether this bucket should send notifications to Amazon EventBridge or not.
     *
     * @default false
     */
    readonly eventBridgeEnabled?: boolean;
    /**
     * Rules that define how Amazon S3 manages objects during their lifetime.
     *
     * @default - No lifecycle rules.
     */
    readonly lifecycleRules?: LifecycleRule[];

    /**
     * The inventory configuration of the bucket.
     *
     * @see https://docs.aws.amazon.com/AmazonS3/latest/dev/storage-inventory.html
     *
     * @default - No inventory configuration
     */
    readonly inventories?: Inventory[];

    /**
     * Whether this bucket should have transfer acceleration turned on or not.
     *
     * @default false
     */
    readonly transferAcceleration?: boolean;

    /**
     * Inteligent Tiering Configurations
     *
     * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/intelligent-tiering.html
     *
     * @default No Intelligent Tiiering Configurations.
     */
    readonly intelligentTieringConfigurations?: IntelligentTieringConfiguration[];

    /**
     * If set true, the stack id will be used to set a unique bucket name prefix in order
     * to ensure global uniqueness and protect against bucket name sniping.
     * Can also be enabled via the "@aws-caef/enableUniqueBucketNames" context key.
     */
    readonly uniqueBucketName?: boolean

}

/**
 * Interface spec for CAEF Buckets
 */
export interface ICaefBucket extends IBucket {

}

/**
 * A construct for a compliant S3 bucket. Specifically, we ensure that:
 *  * KMS encryption enabled by default
 *  * Public access policies disabled
 *  * Bucket versioning enabled
 *  * SSL is enforced
 *  * Bucket keys are enabled
 */
export class CaefBucket extends Bucket implements ICaefBucket {

    public static readonly UNIQUE_NAME_CONTEXT_KEY = "@aws-caef/enableUniqueBucketNames"

    private static setProps ( props: CaefBucketProps, scope: Construct ): BucketProps {

        const uniqueBucketNamePrefixContext = scope.node.tryGetContext( CaefBucket.UNIQUE_NAME_CONTEXT_KEY )

        const uniqueBucketNamePrefix = props.uniqueBucketName?.valueOf() ||
            ( uniqueBucketNamePrefixContext ? Boolean( uniqueBucketNamePrefixContext ) : false )

        const prefix = Fn.select( 0, Fn.split( "-", Fn.select( 2, Fn.split( "/", Stack.of( scope ).stackId ) ) ) )

        const bucketName = uniqueBucketNamePrefix ?
            props.bucketName ? prefix + '-' + props.naming.resourceName( props.bucketName, 62 - prefix.length ) : prefix
            : props.naming.resourceName( props.bucketName, 63 )

        const overrideProps = {
            bucketName: bucketName,
            encryption: BucketEncryption.KMS,
            encryptionKey: props.encryptionKey,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            versioned: true,
            autoDeleteObjects: false,
            removalPolicy: RemovalPolicy.RETAIN,
            enforceSSL: true,
            bucketKeyEnabled: true
        }
        return { ...props, ...overrideProps }
    }
    constructor( scope: Construct, id: string, props: CaefBucketProps ) {
        super( scope, id, CaefBucket.setProps( props, scope ) );

        this.policy?.applyRemovalPolicy( RemovalPolicy.RETAIN )

        NagSuppressions.addResourceSuppressions(
            this,
            [
                { id: 'AwsSolutions-S1', reason: 'Server access logs do not support KMS on targets. CAEF uses CloudTrail data events instead.' },
                { id: 'NIST.800.53.R5-S3BucketLoggingEnabled', reason: 'Server access logs do not support KMS on targets. CAEF uses CloudTrail data events instead.' },
                { id: 'HIPAA.Security-S3BucketLoggingEnabled', reason: 'Server access logs do not support KMS on targets. CAEF uses CloudTrail data events instead.' }
            ],
            true
        );

        if ( props.enforceExclusiveKmsKeys == undefined || props.enforceExclusiveKmsKeys.valueOf() ) {
            /**
             * Bucket policies to only permit the use of a customer managed KMS key for encryption and preventing
             * the use of any key except the one we have been called with.
             * Ref: https://docs.aws.amazon.com/AmazonS3/latest/dev/UsingKMSEncryption.html (see: Requiring server-side encryption)
             */
            const DenyAESStatement = new PolicyStatement( {
                sid: "DenyAES",
                effect: Effect.DENY,
                resources: [ this.bucketArn + "/*" ],
                actions: [ "s3:PutObject" ]
            } )
            DenyAESStatement.addCondition( "StringEquals", {
                "s3:x-amz-server-side-encryption": "AES256"
            } )
            DenyAESStatement.addAnyPrincipal()
            this.addToResourcePolicy( DenyAESStatement )

            const ForceKMSKeyStatement = new PolicyStatement( {
                sid: "ForceKMS",
                effect: Effect.DENY,
                resources: [ this.bucketArn + "/*" ],
                actions: [ "s3:PutObject" ]
            } )
            if ( props.additionalKmsKeyArns ) {
                ForceKMSKeyStatement.addCondition( "ForAllValues:StringNotLikeIfExists", {
                    "s3:x-amz-server-side-encryption-aws-kms-key-id": [ props.encryptionKey.keyArn, ...props.additionalKmsKeyArns ]
                } )
            } else {
                ForceKMSKeyStatement.addCondition( "StringNotLikeIfExists", {
                    "s3:x-amz-server-side-encryption-aws-kms-key-id": props.encryptionKey.keyArn
                } )
            }
            ForceKMSKeyStatement.addAnyPrincipal()
            this.addToResourcePolicy( ForceKMSKeyStatement )
        }

        new caef_construct.CaefParamAndOutput( scope, {
            ...{
                resourceType: "bucket",
                resourceId: props.bucketName,
                name: "name",
                value: this.bucketName
            }, ...props
        } )

        new caef_construct.CaefParamAndOutput( scope, {
            ...{
                resourceType: "bucket",
                resourceId: props.bucketName,
                name: "arn",
                value: this.bucketArn
            }, ...props
        } )
    }
    /**
     * Helper function to format S3 prefixes. By default, strips leading and trailing slashes.
     * @param prefix S3 Prefix to be formatted
     * @param forceLeadingSlash If true (default false), will ensure returned prefix has a leading slash
     * @param forceTrailingSlash If true (default false), will ensure returned prefix has a trail slash
     * @returns A formatted S3 Prefix
     */
    public static formatS3Prefix ( prefix: string | undefined, forceLeadingSlash: boolean = false, forceTrailingSlash: boolean = false ): string | undefined {
        if ( !prefix ) {
            return prefix
        }
        let rawPrefix = prefix;
        // Removes trailing slashes
        rawPrefix = rawPrefix.endsWith( '/' ) ? rawPrefix.slice( 0, -1 ) : rawPrefix
        // Removes leading slashes
        rawPrefix = rawPrefix.startsWith( '/' ) ? rawPrefix.substring( 1 ) : rawPrefix
        if ( forceLeadingSlash ) {
            rawPrefix = "/" + rawPrefix
        }
        if ( forceTrailingSlash ) {
            rawPrefix = rawPrefix + "/"
        }
        return rawPrefix
    }
}

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';

import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnUser } from 'aws-cdk-lib/aws-transfer';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

const kmsIamStatement = function ( kmsKeyArn: string ): PolicyStatement {
    return new PolicyStatement( {
        effect: Effect.ALLOW,
        actions: [
            "kms:Encrypt",
            "kms:Decrypt",
            "kms:ReEncrypt",
            "kms:GenerateDataKey",
            "kms:DescribeKey"
        ],
        resources: [
            kmsKeyArn
        ]
    } )
}

const s3IamStatement = function ( bucketName: string, homeDirectory: string, partition: string ): PolicyStatement {
    const bucketArn = `arn:${ partition }:s3:::${ bucketName }`
    return new PolicyStatement( {
        effect: Effect.ALLOW,
        actions: [
            "s3:PutObject",
            "s3:PutObjectAcl",
            "s3:GetObject",
            "s3:DeleteObjectVersion",
            "s3:DeleteObject",
            "s3:GetObjectVersion",
            "s3:ListBucket",
            "s3:GetBucketLocation"
        ],
        resources: [
            bucketArn,
            `${ bucketArn }/${ homeDirectory }/*`
        ]
    } )
}


export interface UserProps {
    /**
     * Name of the user
     */
    readonly name: string,
    /**
     * The home directory bucket
     */
    readonly homeBucketName: string,
    /**
     * The KMS key to be used when writing to the home directory bucket via the SFTP server
     */
    readonly homeBucketKmsKeyArn: string
    /**
     * S3 prefix to be used as the home directory on the home bucket
     */
    readonly homeDirectory: string,
    /**
     * References to names of public keys (in 'publicKeys' section of config)
     */
    readonly publicKeys: string[],
    /**
     * Arn of the role which will be used to access the home directory
     */
    readonly accessRoleArn?: string
}

export interface SftpUsersL3ConstructProps extends MdaaL3ConstructProps {
    /**
     * List of SFTP user definitions
     */
    readonly users: UserProps[];
    /**
     * ID of the Transfer Server to which the users will be added
     */
    readonly serverId: string;
}

export class SftpUsersL3Construct extends MdaaL3Construct {
    protected readonly props: SftpUsersL3ConstructProps


    constructor( scope: Construct, id: string, props: SftpUsersL3ConstructProps ) {
        super( scope, id, props )
        this.props = props

        for ( let userConfig of this.props.users ) {
            let roleResolve: string
            if ( userConfig.accessRoleArn ) {
                roleResolve = userConfig.accessRoleArn
            } else {
                roleResolve = this._constructUserRole( userConfig.name )?.roleArn
            }


            new CfnUser( this, `SFTPServerUser${ userConfig.name }`, {
                userName: userConfig.name,
                role: roleResolve,
                serverId: this.props.serverId,
                homeDirectory: `/${ userConfig.homeBucketName }/${ this._formatS3Prefix( userConfig.homeDirectory ) }`,
                sshPublicKeys: userConfig.publicKeys
            } )
        }
    }

    private _formatS3Prefix ( prefix: string ): string {
        let rawPrefix = prefix;

        // Removes trailing slashes
        rawPrefix = rawPrefix.endsWith( '/' ) ? rawPrefix.slice( 0, -1 ) : rawPrefix
        // Removes leading slashes
        rawPrefix = rawPrefix.startsWith( '/' ) ? rawPrefix.substring( 1 ) : rawPrefix
        return rawPrefix
    }

    private _constructUserRole ( user: string ): Role {
        const userConfig = this.props.users.find( x => x.name == user )
        if ( userConfig ) {

            const userRole = new MdaaRole( this, `TransferUserSFTPRole-${ userConfig.name }`, {
                naming: this.props.naming,
                assumedBy: new ServicePrincipal( 'transfer.amazonaws.com' ),
                roleName: userConfig.name
            } )
            userRole.addToPolicy(
                s3IamStatement( userConfig.homeBucketName, this._formatS3Prefix( userConfig.homeDirectory ), this.partition )
            )
            userRole.addToPolicy(
                kmsIamStatement( userConfig.homeBucketKmsKeyArn )
            )
            NagSuppressions.addResourceSuppressions(
                userRole,
                [
                    { id: 'AwsSolutions-IAM5', reason: 'Statement resource is scoped to user home directory. Wildcard is for filenames/object keys not known at deployment time.' },
                    { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Permissions are specific to this SFTP server role. Inline policy is appropriate.' },
                    { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Permissions are specific to this SFTP server role. Inline policy is appropriate.'  },
                    { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Permissions are specific to this SFTP server role. Inline policy is appropriate.'  }
                ],
                true
            );
            return userRole
        } else {
            throw new Error( `User ${ user } is not defined in the 'users:' section of the configuration file` )
        }
    }
}

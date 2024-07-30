/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app'
import { UserProps } from '@aws-mdaa/sftp-users-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface PublicKeyConfig {

    /**
     * Public key contents
     */
    publicKey: string
}
export interface BucketConfig {

    /**
     * The bucket name
     */
    bucketName: string,
    /**
     * The KMS key to be used when writing to the bucket via the SFTP server
     */
    kmsKeyArn: string
}
export interface UserConfig {

    /**
     * Reference to the name of the bucket (in 'buckets' section of config) to be used as the home directory bucket
     */
    bucket: string,
    /**
     * S3 prefix to be used as the home directory on the home bucket
     */
    homeDirectory: string,
    /**
     * References to names of public keys (in 'publicKeys' section of config)
     */
    publicKeys: string[],
    /**
     * Arn of the role which will be used to access the home directory
     */
    accessRoleArn?: string
}

export interface SftpUserConfigContents extends MdaaBaseConfigContents {
    serverId: string
    publicKeys: { [ key: string ]: PublicKeyConfig }
    buckets: { [ key: string ]: BucketConfig }
    users: { [ key: string ]: UserConfig }
}

export class SftpUserConfigParser extends MdaaAppConfigParser<SftpUserConfigContents> {

    public readonly users: UserProps[]
    public readonly serverId: string
    constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.serverId = this.configContents.serverId
        this.users = Object.entries( this.configContents.users ).map( nameAndconfigUser => {
            const configUserName = nameAndconfigUser[ 0 ]
            const configUser = nameAndconfigUser[ 1 ]
            const configBucket = this.configContents.buckets[ configUser.bucket ]
            if ( !configBucket ) {
                throw new Error( `Config user definition ${ configUserName } references invalid bucket name` )
            }
            return {
                name: configUserName,
                homeBucketName: configBucket.bucketName,
                homeBucketKmsKeyArn: configBucket.kmsKeyArn,
                homeDirectory: configUser.homeDirectory,
                accessRoleArn: configUser.accessRoleArn,
                publicKeys: configUser.publicKeys.map( publicKeyRef => {
                    const configPublicKey = this.configContents.publicKeys[ publicKeyRef ]
                    if ( !configPublicKey ) {
                        throw new Error( `Config user definition ${ configUserName } references invalid public key name` )
                    }
                    return configPublicKey.publicKey
                } )
            }
        } )
    }

}


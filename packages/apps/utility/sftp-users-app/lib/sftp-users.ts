/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { SftpUsersL3Construct, SftpUsersL3ConstructProps } from '@aws-caef/sftp-users-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SftpUserConfigParser } from './sftp-users-config';


export class SftpUsersCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "sftp-users", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new SftpUserConfigParser( stack, parserProps )
        const constructProps: SftpUsersL3ConstructProps = {
            ...{
                users: appConfig.users,
                serverId: appConfig.serverId
            }, ...l3ConstructProps
        }
        new SftpUsersL3Construct( stack, "users", constructProps );
        return [ stack ]
    }
}

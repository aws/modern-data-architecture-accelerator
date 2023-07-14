/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { SftpServerL3Construct, SftpServerL3ConstructProps } from '@aws-caef/sftp-server-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SftpServerConfigParser } from './sftp-server-config';


export class SftpServerCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "sftp-server", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new SftpServerConfigParser( stack, parserProps )
        const constructProps: SftpServerL3ConstructProps = {
            ...{
                server: appConfig.server
            }, ...l3ConstructProps
        }
        new SftpServerL3Construct( stack, "server", constructProps );
        return [ stack ]
    }
}

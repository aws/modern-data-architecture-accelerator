/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { SftpServerL3Construct, SftpServerL3ConstructProps } from '@aws-mdaa/sftp-server-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SftpServerConfigParser } from './sftp-server-config';


export class SftpServerCDKApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( "sftp-server", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

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

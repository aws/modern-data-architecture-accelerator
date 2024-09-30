/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AthenaWorkgroupL3Construct, AthenaWorkgroupL3ConstructProps } from '@aws-mdaa/athena-workgroup-l3-construct';
import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { AthenaWorkgroupConfigParser } from './athena-workgroup-config';

export class AthenaWorkgroupCDKApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`) )
    }

    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

        const appConfig = new AthenaWorkgroupConfigParser( stack, parserProps )
        const constructProps: AthenaWorkgroupL3ConstructProps = {
            ...{
                dataAdminRoles: appConfig.dataAdminRoles,
                athenaUserRoles: appConfig.athenaUserRoles,
                workgroupConfiguration: appConfig.workgroupConfiguration,
                verbatimPolicyNamePrefix: appConfig.verbatimPolicyNamePrefix
            }, ...l3ConstructProps
        }

        new AthenaWorkgroupL3Construct( stack, "construct", constructProps );
        return [ stack ]
    }
}

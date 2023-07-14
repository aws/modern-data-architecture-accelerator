/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AthenaWorkgroupL3Construct, AthenaWorkgroupL3ConstructProps } from '@aws-caef/athena-workgroup-l3-construct';
import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { AthenaWorkgroupConfigParser } from './athena-workgroup-config';

export class AthenaWorkgroupCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "athena-workgroup", props )
    }

    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

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

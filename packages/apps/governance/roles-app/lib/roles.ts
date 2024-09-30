/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { RolesL3Construct, RolesL3ConstructProps } from '@aws-mdaa/roles-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { RolesConfigParser } from './roles-config';


export class GenerateRolesCDKApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`) )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

        const appConfig = new RolesConfigParser( stack, parserProps )
        const constructProps: RolesL3ConstructProps = {
            ...appConfig, 
            ...l3ConstructProps
        }
        new RolesL3Construct( stack, "construct", constructProps )
        return [ stack ]
    }
}

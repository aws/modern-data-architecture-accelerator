/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { RolesL3Construct, RolesL3ConstructProps } from '@aws-caef/roles-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { RolesConfigParser } from './roles-config';


export class GenerateRolesCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "roles", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new RolesConfigParser( stack, parserProps )
        const constructProps: RolesL3ConstructProps = {
            ...{
                generatePolicies: appConfig.generatePolicies,
                generateRoles: appConfig.generateRoles,
                federations: appConfig.federations
            }, ...l3ConstructProps
        }
        new RolesL3Construct( stack, "construct", constructProps )
        return [ stack ]
    }
}

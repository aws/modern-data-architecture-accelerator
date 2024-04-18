/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { LakeFormationAccessControlL3Construct, LakeFormationAccessControlL3ConstructProps } from '@aws-caef/lakeformation-access-control-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { LakeFormationAccessControlConfigParser } from './lakeformation-access-control-config';

export class LakeFormationCdkApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "lakeformation-access-control", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new LakeFormationAccessControlConfigParser( stack, parserProps )
        const constructProps: LakeFormationAccessControlL3ConstructProps = {
            ...{
                resourceLinks: appConfig.resourceLinks,
                grants: appConfig.grants
            }, ...l3ConstructProps
        }

        new LakeFormationAccessControlL3Construct( stack, "access", constructProps );
        return [ stack ]
    }
}


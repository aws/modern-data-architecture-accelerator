/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { LakeFormationSettingsL3ConstructProps, LakeFormationSettingsL3Construct } from '@aws-mdaa/lakeformation-settings-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';

import { LakeFormationSettingsConfigParser } from './lakeformation-settings-config';

export class LakeFormationSettingsCDKApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`) )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

        const appConfig = new LakeFormationSettingsConfigParser( stack, parserProps )
        const constructProps: LakeFormationSettingsL3ConstructProps = {
            ...appConfig, 
            ...l3ConstructProps
        }
        new LakeFormationSettingsL3Construct( stack, "construct", constructProps );
        return [ stack ]
    }
}




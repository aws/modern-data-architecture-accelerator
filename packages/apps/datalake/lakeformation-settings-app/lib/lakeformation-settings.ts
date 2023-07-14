/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { LakeFormationSettingsL3ConstructProps, LakeFormationSettingsL3Construct } from '@aws-caef/lakeformation-settings-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';

import { LakeFormationSettingsConfigParser } from './lakeformation-settings-config';

export class LakeFormationSettingsCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "lakeformation-settings", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new LakeFormationSettingsConfigParser( stack, parserProps )
        const constructProps: LakeFormationSettingsL3ConstructProps = {
            ...{
                lakeFormationAdminRoleRefs: appConfig.lakeFormationAdminRoles,
                iamAllowedPrincipalsDefault: appConfig.iamAllowedPrincipalsDefault
            }, ...l3ConstructProps
        }
        new LakeFormationSettingsL3Construct( stack, "construct", constructProps );
        return [ stack ]
    }
}




/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditL3Construct, AuditL3ConstructProps } from '@aws-caef/audit-l3-construct';
import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { AuditConfigParser } from './audit-config';


export class AuditCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "audit", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new AuditConfigParser( stack, parserProps )
        const constructProps: AuditL3ConstructProps = {
            ...{
                sourceAccounts: appConfig.sourceAccounts,
                sourceRegions: appConfig.sourceRegions,
                readRoleRefs: appConfig.readRoleRefs,
                bucketInventories: appConfig.inventories,
                inventoryPrefix: appConfig.inventoryPrefix
            }, ...l3ConstructProps
        }

        new AuditL3Construct( stack, "audit", constructProps );
        return [ stack ]

    }
}


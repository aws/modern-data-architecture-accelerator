/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuditTrailL3Construct, AuditTrailL3ConstructProps } from '@aws-caef/audit-trail-l3-construct';
import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { AuditTrailConfigParser } from './audit-trail-config';

export class AuditTrailCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "audit-trail", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new AuditTrailConfigParser( stack, parserProps )
        const constructProps: AuditTrailL3ConstructProps = {
            trail: appConfig.trail,
            ...l3ConstructProps
        }

        new AuditTrailL3Construct( stack, "audit-trail", constructProps );
        return [ stack ]

    }
}

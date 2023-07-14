/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { EventBridgeL3Construct, EventBridgeL3ConstructProps } from '@aws-caef/eventbridge-l3-construct';
import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { EventBridgeConfigParser } from './eventbridge-config';


export class EventBridgeCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "eventbridge", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new EventBridgeConfigParser( stack, parserProps )
        const constructProps: EventBridgeL3ConstructProps = {
            eventBuses: appConfig.eventBuses,
            ...l3ConstructProps
        }

        new EventBridgeL3Construct( stack, "eventbridge", constructProps );
        return [ stack ]

    }
}


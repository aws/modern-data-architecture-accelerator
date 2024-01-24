/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { SagemakerStudioDomainL3Construct, SagemakerStudioDomainL3ConstructProps } from '@aws-caef/sm-studio-domain-l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SageMakerStudioDomainConfigParser } from './sm-studio-domain-config';

export class SageMakerStudioDomainApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "sm-studio-domain", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new SageMakerStudioDomainConfigParser( stack, parserProps )
        const constructProps: SagemakerStudioDomainL3ConstructProps = {
            ...{
                domain: appConfig.domain
            }, ...l3ConstructProps,
        }
        new SagemakerStudioDomainL3Construct( stack, "studio", constructProps );
        return [ stack ]
    }
}
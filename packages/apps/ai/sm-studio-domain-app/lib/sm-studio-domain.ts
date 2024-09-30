/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { SagemakerStudioDomainL3Construct, SagemakerStudioDomainL3ConstructProps } from '@aws-mdaa/sm-studio-domain-l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SageMakerStudioDomainConfigParser } from './sm-studio-domain-config';

export class SageMakerStudioDomainApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`) )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

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
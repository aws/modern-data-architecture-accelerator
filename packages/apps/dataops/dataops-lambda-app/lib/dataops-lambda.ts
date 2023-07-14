/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { LambdaFunctionL3Construct, LambdaFunctionL3ConstructProps } from '@aws-caef/dataops-lambda-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { LambdaFunctionConfigParser } from './dataops-lambda-config';


export class LambdaFunctionCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "dataops-lambda", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new LambdaFunctionConfigParser( stack, parserProps )
        const constructProps: LambdaFunctionL3ConstructProps = {
            kmsArn: appConfig.kmsArn,
            layers: appConfig.layers,
            functions: appConfig.functions,
            ...l3ConstructProps
        }
        new LambdaFunctionL3Construct( stack, "construct", constructProps );
        return [ stack ]

    }
}

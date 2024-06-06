/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { StepFunctionL3Construct, StepFunctionL3ConstructProps } from '@aws-mdaa/dataops-stepfunction-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { StepFunctionConfigParser } from './dataops-stepfunction-config';


export class StepFunctionCDKApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( "dataops-stepfunction", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

        const appConfig = new StepFunctionConfigParser( stack, parserProps )
        const constructProps: StepFunctionL3ConstructProps = {
            ...{
                stepfunctionDefinitions: appConfig.stepfunctionDefinitions,
                projectName: appConfig.projectName,
                projectKMSArn: appConfig.kmsArn,
            }, ...l3ConstructProps
        }
        new StepFunctionL3Construct( stack, "construct", constructProps );
        return [ stack ]
    }
}

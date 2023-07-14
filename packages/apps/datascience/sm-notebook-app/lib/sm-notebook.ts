/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SageMakerNotebookConfigParser } from './sm-notebook-config';
import { SagemakerNotebookL3ConstructProps, SagemakerNotebookL3Construct } from '@aws-caef/sm-notebook-l3-construct'

export class SageMakerNotebookApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "sm-notebook", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {
        const appConfig = new SageMakerNotebookConfigParser( stack, parserProps )
        const constructProps: SagemakerNotebookL3ConstructProps = {
            ...appConfig,
            ...l3ConstructProps
        }
        new SagemakerNotebookL3Construct( stack, "notebooks", constructProps );
        return [ stack ]
    }
}
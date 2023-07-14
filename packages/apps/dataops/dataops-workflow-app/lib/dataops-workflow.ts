/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { GlueWorkflowL3Construct, GlueWorkflowL3ConstructProps } from '@aws-caef/dataops-workflow-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { GlueWorkflowConfigParser } from './dataops-workflow-config';


export class GlueWorkflowCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "dataops-workflow", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new GlueWorkflowConfigParser( stack, parserProps )
        const constructProps: GlueWorkflowL3ConstructProps = {
            ...{
                kmsArn: appConfig.kmsArn,
                workflowDefinitions: appConfig.workflowDefinitions,
                securityConfigurationName: appConfig.securityConfigurationName,
                projectName: appConfig.projectName
            }, ...l3ConstructProps
        }
        new GlueWorkflowL3Construct( stack, "construct", constructProps );
        return [ stack ]

    }
}

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { GlueJobL3Construct, GlueJobL3ConstructProps } from '@aws-caef/dataops-job-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { GlueJobConfigParser } from './dataops-job-config';

export class GlueJobCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "dataops-job", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new GlueJobConfigParser( stack, parserProps )
        const constructProps: GlueJobL3ConstructProps = {
            ...{
                deploymentRoleArn: appConfig.deploymentRole,
                projectBucketName: appConfig.projectBucket,
                jobConfigs: appConfig.jobConfigs,
                securityConfigurationName: appConfig.securityConfigurationName,
                projectName: appConfig.projectName,
                notificationTopicArn: appConfig.projectTopicArn
            }, ...l3ConstructProps
        }
        new GlueJobL3Construct( stack, "construct", constructProps );
        return [ stack ]
    }
}


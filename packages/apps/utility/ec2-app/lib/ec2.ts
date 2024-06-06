/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { AppProps, Stack } from 'aws-cdk-lib';
import { InstanceConfigParser } from './ec2-config';
import { Ec2L3ConstructProps, Ec2L3Construct } from '@aws-mdaa/ec2-l3-construct'
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';

export class EC2InstanceApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( "ec2-instance", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

        const appConfig = new InstanceConfigParser( stack, parserProps )
        const constructProps: Ec2L3ConstructProps = {
            ...appConfig,
            ...l3ConstructProps
        }
        new Ec2L3Construct( stack, "instances", constructProps );
        return [ stack ]
    }
}
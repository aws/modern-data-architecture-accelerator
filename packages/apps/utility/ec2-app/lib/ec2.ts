/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { AppProps, Stack } from 'aws-cdk-lib';
import { InstanceConfigParser } from './ec2-config';
import { Ec2L3ConstructProps, Ec2L3Construct } from '@aws-caef/ec2-l3-construct'
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';

export class EC2InstanceApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "ec2-instance", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new InstanceConfigParser( stack, parserProps )
        const constructProps: Ec2L3ConstructProps = {
            ...appConfig,
            ...l3ConstructProps
        }
        new Ec2L3Construct( stack, "instances", constructProps );
        return [ stack ]
    }
}
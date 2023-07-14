/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { DataLakeL3ConstructProps, S3DatalakeBucketL3Construct } from '@aws-caef/datalake-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataLakeConfigParser } from './datalake-config';


export class DataLakeCDKApp extends CaefCdkApp {
    constructor( props: AppProps = {} ) {
        super( "datalake", props )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

        const appConfig = new DataLakeConfigParser( stack, parserProps )
        const constructProps: DataLakeL3ConstructProps = {
            ...{
                buckets: appConfig.buckets,

            }, ...l3ConstructProps
        }

        new S3DatalakeBucketL3Construct( stack, "contruct", constructProps );
        return [ stack ]
    }
}

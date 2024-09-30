/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { DataLakeL3ConstructProps, S3DatalakeBucketL3Construct } from '@aws-mdaa/datalake-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { DataLakeConfigParser } from './datalake-config';


export class DataLakeCDKApp extends MdaaCdkApp {
    constructor( props: AppProps = {} ) {
        super( props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`) )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

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

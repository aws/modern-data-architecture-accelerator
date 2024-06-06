/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { OpensearchL3Construct, OpensearchL3ConstructProps } from '@aws-mdaa/opensearch-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { OpensearchConfigParser } from './opensearch-config';

export class OpensearchCDKApp extends MdaaCdkApp {
  constructor( props: AppProps = {} ) {
    super( "opensearch", props )
  }
  protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {

    const appConfig = new OpensearchConfigParser( stack, parserProps )

    const constructProps: OpensearchL3ConstructProps = {
      ...appConfig, ...l3ConstructProps
    }

    new OpensearchL3Construct( stack, "construct", constructProps );

    return [ stack ]
  }
}


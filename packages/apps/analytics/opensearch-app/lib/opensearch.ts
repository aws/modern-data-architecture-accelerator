/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps, CaefCdkApp } from '@aws-caef/app';
import { OpensearchL3Construct, OpensearchL3ConstructProps } from '@aws-caef/opensearch-l3-construct';
import { CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { OpensearchConfigParser } from './opensearch-config';

export class OpensearchCDKApp extends CaefCdkApp {
  constructor( props: AppProps = {} ) {
    super( "opensearch", props )
  }
  protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {

    const appConfig = new OpensearchConfigParser( stack, parserProps )

    const constructProps: OpensearchL3ConstructProps = {
      ...appConfig, ...l3ConstructProps
    }

    new OpensearchL3Construct( stack, "construct", constructProps );

    return [ stack ]
  }
}


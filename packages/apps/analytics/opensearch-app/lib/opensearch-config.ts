/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { OpensearchDomainProps } from '@aws-mdaa/opensearch-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as configSchema from './config-schema.json';

export interface OpensearchDomainConfig extends Omit<OpensearchDomainProps, 'accessPolicies'> {
  readonly accessPolicies: { [ key: string ]: any }[]
}

export interface OpensearchConfigContents extends MdaaBaseConfigContents {
  readonly domain: OpensearchDomainConfig
}

export class OpensearchConfigParser extends MdaaAppConfigParser<OpensearchConfigContents> {
  public readonly domain: OpensearchDomainProps

  constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
    super( stack, props, configSchema as Schema )
    this.domain = {
      ...this.configContents.domain, ...{
        accessPolicies: this.configContents.domain.accessPolicies.map( x => PolicyStatement.fromJson( x ) )
      }
    }
  }
}
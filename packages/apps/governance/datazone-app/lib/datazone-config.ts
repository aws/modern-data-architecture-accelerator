/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';
import { NamedDomainsProps } from '@aws-mdaa/datazone-l3-construct';

export interface DataZoneConfigContents extends MdaaBaseConfigContents {
  readonly domains: NamedDomainsProps;
  readonly glueCatalogKmsKeyArn: string;
}

export class DataZoneConfigParser extends MdaaAppConfigParser<DataZoneConfigContents> {
  public glueCatalogKmsKeyArn: string;
  public domains: NamedDomainsProps;
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.glueCatalogKmsKeyArn = this.configContents.glueCatalogKmsKeyArn;
    this.domains = this.configContents.domains;
  }
}

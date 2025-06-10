/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import { NamedDomainsProps, NamedBaseDomainsProps } from '@aws-mdaa/datazone-l3-construct';
import * as configSchema from './config-schema.json';

export interface SagemakerConfigContents extends MdaaBaseConfigContents {
  readonly domains: NamedBaseDomainsProps;
  readonly glueCatalogKmsKeyArn: string;
}

export class SagemakerConfigParser extends MdaaAppConfigParser<SagemakerConfigContents> {
  public domains: NamedDomainsProps;
  public glueCatalogKmsKeyArn: string;
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.glueCatalogKmsKeyArn = this.configContents.glueCatalogKmsKeyArn;
    this.domains = Object.fromEntries(
      Object.entries(this.configContents.domains).map(entry => {
        return [
          entry[0],
          {
            ...entry[1],
            domainVersion: 'V2',
            singleSignOnType: 'IAM_IDC',
          },
        ];
      }),
    );
  }
}

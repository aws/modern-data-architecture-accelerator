/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';
import { NamedDomainsProps } from '@aws-mdaa/datazone-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';

export interface DataZoneConfigContents extends MdaaBaseConfigContents {
  readonly domains: NamedDomainsProps;
  readonly glueCatalogKmsKeyArn?: string;
  readonly lakeformationManageAccessRole?: MdaaRoleRef;
}

export class DataZoneConfigParser extends MdaaAppConfigParser<DataZoneConfigContents> {
  public readonly glueCatalogKmsKeyArn?: string;
  public readonly domains: NamedDomainsProps;
  readonly lakeformationManageAccessRole?: MdaaRoleRef;
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.glueCatalogKmsKeyArn = this.configContents.glueCatalogKmsKeyArn;
    this.lakeformationManageAccessRole = this.configContents.lakeformationManageAccessRole;
    this.domains = this.configContents.domains;
  }
}

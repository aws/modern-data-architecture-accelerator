/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { ServerProps } from '@aws-mdaa/sftp-server-l3-construct';
import { Schema } from 'ajv';

import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface SftpServerConfigContents extends MdaaBaseConfigContents {
  /**
   * SFTP server configuration defining VPC networking, subnet placement, and
   * CIDR-based access control for the Transfer Family server.
   *
   * Use cases: Secure file transfer setup; VPC-based SFTP deployment; B2B file exchange
   *
   * AWS: Transfer Family SFTP server with VPC endpoint and security group
   *
   * Validation: Required; must be valid ServerProps
   */
  readonly server: ServerProps;
}

export class SftpServerConfigParser extends MdaaAppConfigParser<SftpServerConfigContents> {
  public readonly server: ServerProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.server = this.configContents.server;
  }
}

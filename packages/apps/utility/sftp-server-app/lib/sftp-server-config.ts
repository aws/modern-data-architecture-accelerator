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
   * Q-ENHANCED-PROPERTY
   * Required SFTP server configuration defining all aspects of the secure file transfer service including networking, authentication, and access controls. Provides server setup with VPC security, identity integration, and file transfer workflow management.
   *
   * Use cases: Secure file transfer configuration; VPC networking setup; Authentication and access control management
   *
   * AWS: AWS Transfer Family SFTP server configuration for complete secure file transfer deployment
   *
   * Validation: Must be valid ServerProps; required; defines all SFTP server deployment and security characteristics
   **/
  readonly server: ServerProps;
}

export class SftpServerConfigParser extends MdaaAppConfigParser<SftpServerConfigContents> {
  public readonly server: ServerProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.server = this.configContents.server;
  }
}

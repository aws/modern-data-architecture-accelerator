/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { SftpUsersL3Construct, SftpUsersL3ConstructProps } from '@aws-mdaa/sftp-users-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { SftpUserConfigParser } from './sftp-users-config';

export class SftpUsersCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new SftpUserConfigParser(stack, parserProps);
    const constructProps: SftpUsersL3ConstructProps = {
      ...{
        users: appConfig.users,
        serverId: appConfig.serverId,
      },
      ...l3ConstructProps,
    };
    new SftpUsersL3Construct(stack, 'users', constructProps);
    return [stack];
  }
}

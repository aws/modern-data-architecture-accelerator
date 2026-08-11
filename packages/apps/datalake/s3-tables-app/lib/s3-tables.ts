/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { S3TablesL3ConstructProps, S3TablesL3Construct } from '@aws-mdaa/s3-tables-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { S3TablesConfigParser } from './s3-tables-config';

/**
 * S3 Tables CDK application.
 * Extends MdaaCdkApp to parse S3 Tables YAML configuration, resolve access policies
 * and role references, and instantiate the S3TablesL3Construct for resource provisioning.
 */
export class S3TablesCDKApp extends MdaaCdkApp {
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new S3TablesConfigParser(stack, parserProps);
    const constructProps: S3TablesL3ConstructProps = {
      tableBuckets: appConfig.tableBuckets,
      accessPolicies: appConfig.accessPolicies,
      ...l3ConstructProps,
    };

    new S3TablesL3Construct(stack, 's3-tables', constructProps);
    return [stack];
  }
}

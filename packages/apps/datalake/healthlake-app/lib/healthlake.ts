/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { HealthLakeL3Construct, HealthLakeL3ConstructProps } from '@aws-mdaa/healthlake-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { HealthLakeConfigParser } from './healthlake-config';

/**
 * MDAA CDK Application for deploying an Amazon HealthLake FHIR R4 Datastore.
 * This application deploys a compliant HealthLake datastore with CMK encryption,
 * a least-privilege data-access IAM role, and automatic Glue database metadata resolution.
 *
 * The application follows MDAA patterns for security compliance and governance,
 * ensuring all deployed resources meet organizational security requirements.
 *
 * ```typescript
 * // Deploy via CDK CLI with configuration
 * const app = new HealthLakeApp();
 * app.generateStack();
 * ```
 */
export class HealthLakeApp extends MdaaCdkApp {
  /**
   * Creates a new HealthLakeApp instance.
   * @param props - CDK application properties (optional)
   */
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  /**
   * Generates the HealthLake resources within the provided stack.
   * This method:
   * 1. Parses the HealthLake configuration from the provided config file
   * 2. Combines app-specific config with L3 construct properties
   * 3. Creates the HealthLakeL3Construct with the merged configuration
   * @param stack - The CDK stack to deploy resources into
   * @param l3ConstructProps - Base L3 construct properties (naming, tagging, etc.)
   * @param parserProps - Configuration parser properties including config file path
   * @returns Array containing the modified stack
   */
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new HealthLakeConfigParser(stack, parserProps);

    const constructProps: HealthLakeL3ConstructProps = {
      ...appConfig,
      ...l3ConstructProps,
    };

    new HealthLakeL3Construct(stack, 'construct', constructProps);

    return [stack];
  }
}

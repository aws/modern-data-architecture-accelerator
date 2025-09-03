/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps, MdaaCdkApp } from '@aws-mdaa/app';
import { BedrockSettingsL3Construct, BedrockSettingsL3ConstructProps } from '@aws-mdaa/bedrock-settings-l3-construct';
import { MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { AppProps, Stack } from 'aws-cdk-lib';
import { BedrockSettingsConfigParser } from './bedrock-settings-config';

/**
 * MDAA CDK Application for configuring Amazon Bedrock audit logging settings.
 *
 * This application deploys infrastructure to enable audit logging for Bedrock model invocations
 * to either S3 buckets, CloudWatch Log Groups, or both, based on the provided configuration.
 *
 * The application follows MDAA patterns for security compliance and governance,
 * ensuring all deployed resources meet organizational security requirements.
 *
 * @example
 * ```typescript
 * // Deploy via CDK CLI with configuration
 * const app = new BedrockSettingsApp();
 * app.generateStack();
 * ```
 */
export class BedrockSettingsApp extends MdaaCdkApp {
  /**
   * Creates a new BedrockSettingsApp instance.
   *
   * @param props - CDK application properties (optional)
   */
  constructor(props: AppProps = {}) {
    super(props, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }

  /**
   * Generates the Bedrock settings resources within the provided stack.
   *
   * This method:
   * 1. Parses the Bedrock configuration from the provided config file
   * 2. Combines app-specific config with L3 construct properties
   * 3. Creates the BedrockSettingsL3Construct with the merged configuration
   *
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
    // Parse Bedrock-specific configuration
    const appConfig = new BedrockSettingsConfigParser(stack, parserProps);

    // Merge app config with L3 construct properties
    const constructProps: BedrockSettingsL3ConstructProps = {
      ...appConfig,
      ...l3ConstructProps,
    };

    // Create the Bedrock settings construct
    new BedrockSettingsL3Construct(stack, 'construct', constructProps);

    return [stack];
  }
}

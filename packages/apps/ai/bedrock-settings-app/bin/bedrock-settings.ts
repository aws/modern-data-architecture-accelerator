#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Entry point for the MDAA Bedrock Settings CDK Application.
 * This script instantiates and deploys the BedrockSettingsApp, which configures
 * Amazon Bedrock audit logging settings based on the provided YAML configuration.
 * Usage:
 *   cdk deploy --app "npx ts-node bin/bedrock-settings.ts" --context config=path/to/config.yaml
 * The application will read the configuration file and deploy the necessary
 * infrastructure for Bedrock model invocation audit logging.
 */

import { BedrockSettingsApp } from '../lib/bedrock-settings';

// Initialize and deploy the Bedrock Settings application
new BedrockSettingsApp().generateStack();

#!/usr/bin/env node
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Entry point for the MDAA HealthLake CDK Application.
 * This script instantiates and deploys the HealthLakeApp, which provisions
 * an Amazon HealthLake FHIR R4 datastore with CMK encryption, IAM data-access role,
 * and Glue database metadata resolution based on the provided YAML configuration.
 * Usage:
 *   cdk deploy --app "npx ts-node bin/healthlake.ts" --context config=path/to/config.yaml
 */

import { HealthLakeApp } from '../lib/healthlake';

// Initialize and deploy the HealthLake application
new HealthLakeApp().generateStack();

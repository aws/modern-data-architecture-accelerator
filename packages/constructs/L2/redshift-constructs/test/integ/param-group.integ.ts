/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaRedshiftClusterParameterGroup.
 *
 * Standalone test — no fixtures needed.
 *
 * Verifies that:
 *   - MdaaRedshiftClusterParameterGroup creates a parameter group
 *   - Enforced parameters: require_SSL, use_fips_ssl, enable_user_activity_logging
 *   - Custom parameters can be added alongside enforced ones
 *   - MDAA naming convention is applied
 */

import { MdaaRedshiftClusterParameterGroup } from '../../lib';
import { getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Stack } from 'aws-cdk-lib';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegRedshiftParamGroupStack', { env });

const naming = getIntegNaming(app, 'rspg');

// Parameter group with custom params (enforced SSL/FIPS/logging are added automatically)
new MdaaRedshiftClusterParameterGroup(stack, 'ParamGroup', {
  naming,
  description: 'integ-redshift-pg',
  parameters: {
    max_concurrency_scaling_clusters: '1',
    statement_timeout: '43200000',
  },
});

app.synth();

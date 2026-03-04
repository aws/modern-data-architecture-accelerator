/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaStudioLifecycleConfig.
 *
 * This is a standalone test — no fixture needed. Lifecycle configs are
 * account-level SageMaker resources that don't depend on a Studio domain,
 * VPC, or KMS key.
 *
 * The test creates a simple JupyterServer lifecycle config with a base64-encoded
 * shell script, verifying that the custom resource Lambda successfully calls
 * sagemaker:CreateStudioLifecycleConfig on deploy and
 * sagemaker:DeleteStudioLifecycleConfig on destroy.
 *
 * Deploy/destroy should complete in under 4 minutes.
 */

import { MdaaStudioLifecycleConfig } from '../../lib';
import { ForceDestroy, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegLifecycleConfigStack', { env });

const naming = getIntegNaming(app, 'smlc');

// Base64-encode a simple shell script: #!/bin/bash\necho "integ-test"
const scriptContent = Buffer.from('#!/bin/bash\necho "integ-test-lifecycle-config"\n').toString('base64');

new MdaaStudioLifecycleConfig(stack, 'JupyterServerLC', {
  naming,
  lifecycleConfigName: 'integ-jupyter',
  lifecycleConfigContent: scriptContent,
  lifecycleConfigAppType: 'JupyterServer',
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();

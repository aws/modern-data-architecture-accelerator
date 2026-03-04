/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Integration test for MdaaLambdaFunction, MdaaLambdaRole, MdaaBoto3LayerVersion,
 * MdaaAwsAuthLayerVersion, MdaaOpensearchPyLayerVersion, and MdaaDockerImageFunction.
 *
 * Uses fixture resources (KMS key) via environment variables.
 *
 * Verifies that:
 *   - MdaaLambdaRole creates a role assumable by lambda.amazonaws.com
 *   - MdaaLambdaFunction creates a function with MDAA naming and USER_AGENT_STRING env var
 *   - MdaaBoto3LayerVersion builds a Lambda layer with boto3 (Docker or pip fallback)
 *   - MdaaAwsAuthLayerVersion builds a Lambda layer with aws-auth dependencies
 *   - MdaaOpensearchPyLayerVersion builds a Lambda layer with opensearch-py dependencies
 *   - MdaaDockerImageFunction creates a Docker image function (requires Docker at synth time)
 *   - The function can be created with inline Python code
 *   - Environment encryption key is applied
 */

import {
  MdaaLambdaFunction,
  MdaaLambdaRole,
  MdaaBoto3LayerVersion,
  MdaaAwsAuthLayerVersion,
  MdaaOpensearchPyLayerVersion,
  MdaaDockerImageFunction,
} from '../../lib';
import { ForceDestroy, getFixtureKmsKey, getIntegEnv, getIntegNaming } from '@aws-mdaa/testing/lib/integ';
import { App, Aspects, Stack } from 'aws-cdk-lib';
import { Code, DockerImageCode, Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { execSync } from 'child_process';

// --- App ---

const app = new App();
const env = getIntegEnv();

const stack = new Stack(app, 'MdaaIntegLambdaFunctionStack', { env });

const kmsKey = getFixtureKmsKey(stack);
const naming = getIntegNaming(app, 'lambda');

// Lambda execution role with log group permissions
const lambdaRole = new MdaaLambdaRole(stack, 'LambdaRole', {
  naming,
  roleName: 'integ-fn',
  logGroupNames: [naming.resourceName('integ-fn', 64)],
});

// Boto3 Lambda layer (Docker build)
const boto3Layer = new MdaaBoto3LayerVersion(stack, 'Boto3Layer', { naming });

// Lambda function with inline Python code
new MdaaLambdaFunction(stack, 'Function', {
  naming,
  functionName: 'integ-fn',
  runtime: Runtime.PYTHON_3_13,
  handler: 'index.handler',
  code: Code.fromInline('def handler(event, context):\n    return {"statusCode": 200, "body": "ok"}'),
  role: lambdaRole,
  layers: [boto3Layer],
  environmentEncryption: kmsKey,
});

// AWS Auth Lambda layer (Docker or pip fallback)
// createOutputs/createParams: false to avoid duplicate CFN export and SSM param names
// (all layer constructs share 'layer-version:arn' as their output key)
const awsAuthLayer = new MdaaAwsAuthLayerVersion(stack, 'AwsAuthLayer', {
  naming,
  createOutputs: false,
  createParams: false,
});

// OpenSearch-py Lambda layer (Docker or pip fallback)
const opensearchPyLayer = new MdaaOpensearchPyLayerVersion(stack, 'OpensearchPyLayer', {
  naming,
  createOutputs: false,
  createParams: false,
});

// Docker image function — only created when Docker is available at synth time
const dockerDir = path.join(__dirname, 'docker-fn');

// Check if Docker is available before creating the Docker image function
let hasDocker = false;
try {
  execSync(`${process.env.CDK_DOCKER ?? 'docker'} info`, { stdio: 'ignore' });
  hasDocker = true;
} catch {
  // Docker not available — skip Docker image function
}

if (hasDocker) {
  const dockerRole = new MdaaLambdaRole(stack, 'DockerRole', {
    naming,
    roleName: 'integ-docker-fn',
    logGroupNames: [naming.resourceName('integ-docker-fn', 64)],
  });

  new MdaaDockerImageFunction(stack, 'DockerFunction', {
    naming,
    functionName: 'integ-docker-fn',
    code: DockerImageCode.fromImageAsset(dockerDir),
    role: dockerRole,
    environmentEncryption: kmsKey,
  });
}

// Second function that uses all layers together
const multiLayerRole = new MdaaLambdaRole(stack, 'MultiLayerRole', {
  naming,
  roleName: 'integ-multi-layer',
  logGroupNames: [naming.resourceName('integ-multi-layer', 64)],
});

new MdaaLambdaFunction(stack, 'MultiLayerFunction', {
  naming,
  functionName: 'integ-multi-layer',
  runtime: Runtime.PYTHON_3_13,
  handler: 'index.handler',
  code: Code.fromInline('def handler(event, context):\n    return {"statusCode": 200, "body": "multi-layer-ok"}'),
  role: multiLayerRole,
  layers: [boto3Layer, awsAuthLayer, opensearchPyLayer],
  environmentEncryption: kmsKey,
});

Aspects.of(stack).add(new ForceDestroy());

app.synth();

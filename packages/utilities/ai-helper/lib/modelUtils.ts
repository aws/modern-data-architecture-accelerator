/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Regex pattern for validating Bedrock model ARNs as per CloudFormation documentation
// documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-bedrock-agent.html
// skipping sonar. it complained this ARN is too complex, but we want to keep it close to how it's documented in the above doc
const BEDROCK_MODEL_ARN_PATTERN =
  /^arn:aws(-[^:]+)?:bedrock:[a-z\d-]{1,20}:((\d{12}:custom-model\/[a-z\d-]{1,63}\.[a-z\d-]{1,63}(:[a-z\d-]{1,63}){0,2}\/[a-z\d]{12})|(:foundation-model\/[a-z\d-]{1,63}\.[a-z\d-]{1,63}\.?[a-z\d-]{1,63}(:[a-z\d-]{1,63}){0,2})|(\d{12}:(inference-profile|application-inference-profile)\/[a-zA-Z\d-:.]+))$/; // NOSONAR

/**
 * Validates that a model ARN matches the expected CloudFormation pattern.
 */
function validateModelArn(arn: string): string {
  if (!isException(arn) && !BEDROCK_MODEL_ARN_PATTERN.test(arn)) {
    throw new Error(
      `Invalid Bedrock model ARN format: ${arn}. ARN must match CloudFormation validation pattern for AWS::Bedrock::Agent foundationModel property.`,
    );
  }
  return arn;
}

/**
 * Determines if a model identifier is an inference profile ID.
 * Cross-region inference profiles follow the pattern: {region}.{provider}.{model-name}
 * Examples: "us.anthropic.claude-3-sonnet-20240229-v1:0", "eu.amazon.titan-text-express-v1", "apac.anthropic.claude-3-sonnet-20240229-v1:0"
 */
function isInferenceProfileId(modelIdentifier: string): boolean {
  // Known region prefixes for cross-region inference profiles (based on AWS documentation)
  // https://docs.aws.amazon.com/bedrock/latest/userguide/inference-profiles-support.html
  const knownRegionPrefixes = ['us', 'us-gov', 'eu', 'apac', 'global'];

  // Pattern: {region}.{provider}.{model-identifier}
  const parts = modelIdentifier.split('.');

  if (parts.length < 3) {
    return false;
  }

  const regionPrefix = parts[0];
  const provider = parts[1];

  // Check if region prefix is known and provider is at least one character long
  return knownRegionPrefixes.includes(regionPrefix) && provider.length > 0;
}

/**
 * Resolves a model identifier to its full ARN format.
 * Handles three input types:
 * 1. Full ARN (passthrough)
 * 2. On-demand model ID (e.g., "anthropic.claude-3-sonnet-20240229-v1:0")
 * 3. Inference profile ID (e.g., "us.anthropic.claude-3-sonnet-20240229-v1:0")
 */
export function resolveModelArn(modelIdentifier: string, partition: string, region: string, account: string): string {
  if (modelIdentifier.startsWith('arn:')) {
    return validateModelArn(modelIdentifier);
  }
  if (isInferenceProfileId(modelIdentifier)) {
    return validateModelArn(`arn:${partition}:bedrock:${region}:${account}:inference-profile/${modelIdentifier}`);
  }
  return validateModelArn(`arn:${partition}:bedrock:${region}::foundation-model/${modelIdentifier}`);
}

function isException(name: string): boolean {
  return name.indexOf('Token[AWS') > -1;
}

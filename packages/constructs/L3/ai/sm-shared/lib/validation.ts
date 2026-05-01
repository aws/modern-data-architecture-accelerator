/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/** Error thrown when construct configuration is invalid */
class ConfigValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Throws a ConfigValidationError with the given message.
 * Use this instead of importing ConfigValidationError directly
 * (JSII does not support exporting classes that extend Error).
 */
export function throwConfigValidationError(message: string): never {
  throw new ConfigValidationError(message);
}

/**
 * Validates that a schedule expression is a valid cron or rate expression.
 * @throws ConfigValidationError if the expression is invalid
 */
export function validateScheduleExpression(expr: string, fieldName: string): void {
  // cron: 6 space-separated fields (minutes hours day-of-month month day-of-week year)
  const cronPattern = /^cron\(\s*[^\s]+(\s+[^\s]+){5}\s*\)$/;
  // rate: number + unit (minute(s), hour(s), day(s))
  const ratePattern = /^rate\(\s*\d+\s+(minute|minutes|hour|hours|day|days)\s*\)$/;
  if (!cronPattern.test(expr) && !ratePattern.test(expr)) {
    throw new ConfigValidationError(
      `${fieldName} must be a valid cron or rate expression (e.g. 'cron(0 * ? * * *)' or 'rate(1 hour)'). Received: ${expr}`,
    );
  }
}

/**
 * Validates that a project name is valid for use in AWS resource names.
 * @throws ConfigValidationError if the name is invalid
 */
export function validateProjectName(projectName: string): void {
  if (!/^[a-zA-Z0-9][-a-zA-Z0-9]{0,31}$/.test(projectName)) {
    throw new ConfigValidationError(
      `projectName must be 1-32 alphanumeric/hyphen characters, starting with alphanumeric. Received: '${projectName}'.`,
    );
  }
}

/**
 * Validates a SageMaker endpoint name.
 * @throws ConfigValidationError if the name doesn't match the SageMaker API pattern
 */
export function validateEndpointName(endpointName: string): void {
  if (!/^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}$/.test(endpointName)) {
    throw new ConfigValidationError(
      `endpointName must be 1-63 alphanumeric/hyphen characters, starting and ending with alphanumeric. Received: '${endpointName}'.`,
    );
  }
}

/**
 * Validates VPC configuration consistency.
 * When any VPC field is provided, subnetIds and securityGroupIds must both be non-empty.
 * Returns true if VPC is configured, false if no VPC fields are provided.
 * @throws ConfigValidationError if partial VPC config is given
 */
export function validateVpcConfig(config: {
  vpcId?: string;
  subnetIds?: string[];
  securityGroupIds?: string[];
}): boolean {
  const hasVpc = !!config.vpcId;
  const hasSubnets = !!config.subnetIds?.length;
  const hasSgs = !!config.securityGroupIds?.length;

  if (!hasVpc && !hasSubnets && !hasSgs) return false;

  if (hasSubnets && !hasSgs) {
    throw new ConfigValidationError('securityGroupIds must be provided when subnetIds are specified.');
  }
  if (hasSgs && !hasSubnets) {
    throw new ConfigValidationError('subnetIds must be provided when securityGroupIds are specified.');
  }

  return hasSubnets && hasSgs;
}

/**
 * Validates an AWS account ID format.
 * @throws ConfigValidationError if the account ID is not a 12-digit string
 */
export function validateAccountId(accountId: string, fieldName: string): void {
  if (!/^\d{12}$/.test(accountId)) {
    throw new ConfigValidationError(`${fieldName} must be a 12-digit AWS account ID. Received: '${accountId}'.`);
  }
}

/**
 * Validates an AWS CodeStar Connections / CodeConnections ARN format.
 * Accepts both the legacy `codestar-connections` and the new `codeconnections` service name.
 * @throws ConfigValidationError if the ARN does not match the expected pattern
 */
export function validateConnectionArn(connectionArn: string): void {
  if (!/^arn:[a-z-]+:(codestar-connections|codeconnections):[a-z\d-]+:\d{12}:connection\/[\w-]+$/.test(connectionArn)) {
    throw new ConfigValidationError(
      `connectionArn must be a valid AWS CodeStar Connections ARN ` +
        `(e.g. 'arn:aws:codeconnections:us-east-1:123456789012:connection/<id>'). Received: '${connectionArn}'.`,
    );
  }
}

/**
 * Validates an ECR image URI.
 * @throws ConfigValidationError if the URI doesn't match the ECR pattern
 */
export function validateImageUri(imageUri: string, context: string): void {
  if (!/^\d+\.dkr\.ecr\..+\.amazonaws\.com(\.cn)?\/.+$/.test(imageUri)) {
    throw new ConfigValidationError(
      `${context}: imageUri must be a valid ECR URI ` +
        `(e.g. '123456789012.dkr.ecr.us-east-1.amazonaws.com/my-image:latest'). Received: '${imageUri}'.`,
    );
  }
}

/**
 * Validates a SageMaker instance type.
 * @throws ConfigValidationError if the instance type doesn't match the ml.* pattern
 */
export function validateInstanceType(instanceType: string, context: string): void {
  if (!/^ml\.[a-z\d]+\.[a-z\d]+$/.test(instanceType)) {
    throw new ConfigValidationError(
      `${context}: instanceType must be a valid SageMaker instance type ` +
        `(e.g. 'ml.m5.large'). Received: '${instanceType}'.`,
    );
  }
}
/** Returns the value if defined, otherwise throws ConfigValidationError */
export function requireValue<T>(value: T | undefined | null, fieldName: string, context: string): T {
  if (value === undefined || value === null) {
    throw new ConfigValidationError(`${fieldName} is required for ${context}.`);
  }
  return value;
}

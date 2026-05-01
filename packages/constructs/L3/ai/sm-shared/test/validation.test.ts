/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  throwConfigValidationError,
  validateScheduleExpression,
  validateProjectName,
  validateEndpointName,
  validateImageUri,
  validateInstanceType,
  validateVpcConfig,
  validateAccountId,
  validateConnectionArn,
  requireValue,
} from '../lib/validation';

describe('throwConfigValidationError', () => {
  it('throws an error with the given message', () => {
    expect(() => throwConfigValidationError('test message')).toThrow('test message');
  });

  it('throws an error with name ConfigValidationError', () => {
    expect(() => throwConfigValidationError('test')).toThrow(
      expect.objectContaining({ name: 'ConfigValidationError' }),
    );
  });
});

describe('validateScheduleExpression', () => {
  it('accepts valid cron expression', () => {
    expect(() => validateScheduleExpression('cron(0 * ? * * *)', 'schedule')).not.toThrow();
  });

  it('accepts valid rate expression', () => {
    expect(() => validateScheduleExpression('rate(1 hour)', 'schedule')).not.toThrow();
  });

  it('rejects invalid expression', () => {
    expect(() => validateScheduleExpression('every 5 minutes', 'schedule')).toThrow(
      /schedule must be a valid cron or rate/,
    );
  });

  it('rejects empty string', () => {
    expect(() => validateScheduleExpression('', 'schedule')).toThrow(/schedule must be a valid cron or rate/);
  });

  it('rejects cron with too few fields', () => {
    expect(() => validateScheduleExpression('cron(0 * *)', 'schedule')).toThrow(
      /schedule must be a valid cron or rate/,
    );
  });

  it('rejects rate with invalid unit', () => {
    expect(() => validateScheduleExpression('rate(1 week)', 'schedule')).toThrow(
      /schedule must be a valid cron or rate/,
    );
  });

  it('accepts rate with plural units', () => {
    expect(() => validateScheduleExpression('rate(5 minutes)', 'schedule')).not.toThrow();
    expect(() => validateScheduleExpression('rate(2 hours)', 'schedule')).not.toThrow();
    expect(() => validateScheduleExpression('rate(7 days)', 'schedule')).not.toThrow();
  });
});

describe('validateProjectName', () => {
  it('accepts valid project name', () => {
    expect(() => validateProjectName('my-project')).not.toThrow();
  });

  it('accepts single character', () => {
    expect(() => validateProjectName('a')).not.toThrow();
  });

  it('accepts alphanumeric with hyphens', () => {
    expect(() => validateProjectName('test-project-123')).not.toThrow();
  });

  it('rejects name starting with hyphen', () => {
    expect(() => validateProjectName('-invalid')).toThrow(/projectName must be/);
  });

  it('rejects name with underscores', () => {
    expect(() => validateProjectName('invalid_name')).toThrow(/projectName must be/);
  });

  it('rejects empty string', () => {
    expect(() => validateProjectName('')).toThrow(/projectName must be/);
  });

  it('rejects name longer than 32 characters', () => {
    expect(() => validateProjectName('a'.repeat(33))).toThrow(/projectName must be/);
  });
});

describe('validateEndpointName', () => {
  it('accepts valid endpoint name', () => {
    expect(() => validateEndpointName('my-endpoint-1')).not.toThrow();
  });

  it('accepts single character', () => {
    expect(() => validateEndpointName('a')).not.toThrow();
  });

  it('rejects name starting with hyphen', () => {
    expect(() => validateEndpointName('-invalid')).toThrow(/endpointName must be/);
  });

  it('rejects name ending with hyphen', () => {
    expect(() => validateEndpointName('invalid-')).toThrow(/endpointName must be/);
  });

  it('rejects empty string', () => {
    expect(() => validateEndpointName('')).toThrow(/endpointName must be/);
  });

  it('rejects name longer than 63 characters', () => {
    expect(() => validateEndpointName('a'.repeat(64))).toThrow(/endpointName must be/);
  });

  it('rejects name with underscores', () => {
    expect(() => validateEndpointName('invalid_name')).toThrow(/endpointName must be/);
  });
});

describe('validateImageUri', () => {
  it('accepts valid ECR URI', () => {
    expect(() =>
      validateImageUri('123456789012.dkr.ecr.us-east-1.amazonaws.com/my-image:latest', 'test'),
    ).not.toThrow();
  });

  it('accepts ECR URI without tag', () => {
    expect(() => validateImageUri('123456789012.dkr.ecr.us-east-1.amazonaws.com/my-image', 'test')).not.toThrow();
  });

  it('rejects non-ECR URI', () => {
    expect(() => validateImageUri('docker.io/my-image:latest', 'test')).toThrow(/imageUri must be a valid ECR URI/);
  });

  it('rejects empty string', () => {
    expect(() => validateImageUri('', 'test')).toThrow(/imageUri must be a valid ECR URI/);
  });
});

describe('validateInstanceType', () => {
  it('accepts valid instance type', () => {
    expect(() => validateInstanceType('ml.m5.large', 'test')).not.toThrow();
  });

  it('accepts instance type with numbers', () => {
    expect(() => validateInstanceType('ml.m5.2xlarge', 'test')).not.toThrow();
  });

  it('rejects EC2-style instance type', () => {
    expect(() => validateInstanceType('m5.large', 'test')).toThrow(/instanceType must be a valid SageMaker/);
  });

  it('rejects empty string', () => {
    expect(() => validateInstanceType('', 'test')).toThrow(/instanceType must be a valid SageMaker/);
  });
});

describe('validateVpcConfig', () => {
  it('returns false when no VPC fields provided', () => {
    expect(validateVpcConfig({})).toBe(false);
  });

  it('returns false when all fields are undefined', () => {
    expect(validateVpcConfig({ vpcId: undefined, subnetIds: undefined, securityGroupIds: undefined })).toBe(false);
  });

  it('returns false when arrays are empty', () => {
    expect(validateVpcConfig({ subnetIds: [], securityGroupIds: [] })).toBe(false);
  });

  it('returns true when subnets and security groups are provided', () => {
    expect(validateVpcConfig({ subnetIds: ['subnet-1'], securityGroupIds: ['sg-1'] })).toBe(true);
  });

  it('returns true with full VPC config', () => {
    expect(validateVpcConfig({ vpcId: 'vpc-1', subnetIds: ['subnet-1'], securityGroupIds: ['sg-1'] })).toBe(true);
  });

  it('throws when subnets provided without security groups', () => {
    expect(() => validateVpcConfig({ subnetIds: ['subnet-1'] })).toThrow(/securityGroupIds must be provided/);
  });

  it('throws when security groups provided without subnets', () => {
    expect(() => validateVpcConfig({ securityGroupIds: ['sg-1'] })).toThrow(/subnetIds must be provided/);
  });
});

describe('validateAccountId', () => {
  it('accepts valid 12-digit account ID', () => {
    expect(() => validateAccountId('123456789012', 'accountId')).not.toThrow();
  });

  it('rejects non-12-digit string', () => {
    expect(() => validateAccountId('12345', 'accountId')).toThrow(/accountId must be a 12-digit/);
  });

  it('rejects alphanumeric string', () => {
    expect(() => validateAccountId('12345678901a', 'accountId')).toThrow(/accountId must be a 12-digit/);
  });

  it('rejects empty string', () => {
    expect(() => validateAccountId('', 'accountId')).toThrow(/accountId must be a 12-digit/);
  });
});

describe('validateConnectionArn', () => {
  it('accepts valid codestar-connections ARN', () => {
    expect(() =>
      validateConnectionArn('arn:aws:codestar-connections:us-east-1:123456789012:connection/abc-def-123'),
    ).not.toThrow();
  });

  it('accepts valid codeconnections ARN', () => {
    expect(() =>
      validateConnectionArn('arn:aws:codeconnections:us-west-2:123456789012:connection/abc-def-123'),
    ).not.toThrow();
  });

  it('rejects invalid ARN', () => {
    expect(() => validateConnectionArn('not-an-arn')).toThrow(/connectionArn must be a valid/);
  });

  it('rejects ARN with wrong service', () => {
    expect(() => validateConnectionArn('arn:aws:s3:us-east-1:123456789012:connection/abc-def-123')).toThrow(
      /connectionArn must be a valid/,
    );
  });

  it('rejects empty string', () => {
    expect(() => validateConnectionArn('')).toThrow(/connectionArn must be a valid/);
  });
});

describe('requireValue', () => {
  it('returns value when defined', () => {
    expect(requireValue('hello', 'field', 'test')).toBe('hello');
  });

  it('returns falsy but defined values', () => {
    expect(requireValue(0, 'field', 'test')).toBe(0);
    expect(requireValue('', 'field', 'test')).toBe('');
    expect(requireValue(false, 'field', 'test')).toBe(false);
  });

  it('throws when undefined', () => {
    expect(() => requireValue(undefined, 'myField', 'myContext')).toThrow(/myField is required for myContext/);
  });

  it('throws when null', () => {
    expect(() => requireValue(null, 'myField', 'myContext')).toThrow(/myField is required for myContext/);
  });
});

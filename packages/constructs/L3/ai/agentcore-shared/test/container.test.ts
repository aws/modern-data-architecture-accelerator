/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Aws } from 'aws-cdk-lib';
import { parseEcrRepositoryArn } from '../lib';

describe('parseEcrRepositoryArn', () => {
  it('parses a simple tagged URI to the repository ARN', () => {
    expect(parseEcrRepositoryArn('test-account.dkr.ecr.test-region.amazonaws.com/my-repo:latest', 'aws')).toBe(
      'arn:aws:ecr:test-region:test-account:repository/my-repo',
    );
  });

  it('parses a URI with no tag or digest', () => {
    expect(parseEcrRepositoryArn('test-account.dkr.ecr.test-region.amazonaws.com/my-repo', 'aws')).toBe(
      'arn:aws:ecr:test-region:test-account:repository/my-repo',
    );
  });

  it('preserves nested repository paths', () => {
    expect(
      parseEcrRepositoryArn('test-account.dkr.ecr.test-region.amazonaws.com/my-org/my-team/my-repo:v1.0.0', 'aws'),
    ).toBe('arn:aws:ecr:test-region:test-account:repository/my-org/my-team/my-repo');
  });

  it('parses a digest-pinned URI, dropping the digest', () => {
    expect(
      parseEcrRepositoryArn('test-account.dkr.ecr.test-region.amazonaws.com/my-repo@sha256:abc123def456', 'aws'),
    ).toBe('arn:aws:ecr:test-region:test-account:repository/my-repo');
  });

  it('honors a non-default partition', () => {
    expect(parseEcrRepositoryArn('test-account.dkr.ecr.cn-north-1.amazonaws.com/my-repo:latest', 'aws-cn')).toBe(
      'arn:aws-cn:ecr:cn-north-1:test-account:repository/my-repo',
    );
  });

  it('parses an aws-cn URI with the .amazonaws.com.cn host suffix', () => {
    expect(parseEcrRepositoryArn('test-account.dkr.ecr.cn-north-1.amazonaws.com.cn/my-repo:latest', 'aws-cn')).toBe(
      'arn:aws-cn:ecr:cn-north-1:test-account:repository/my-repo',
    );
  });

  it('parses an ecr-fips endpoint URI', () => {
    expect(
      parseEcrRepositoryArn('test-account.dkr.ecr-fips.us-gov-west-1.amazonaws.com/my-repo:latest', 'aws-us-gov'),
    ).toBe('arn:aws-us-gov:ecr:us-gov-west-1:test-account:repository/my-repo');
  });

  it('carries an unresolved account into the ARN', () => {
    // MDAA `{{account}}` resolves to the AWS::AccountId token whenever the synth is env-agnostic
    // (config `account: default` with no resolvable credentials), so the account is not a literal
    // until deploy. CDK resolves it in the returned ARN.
    expect(parseEcrRepositoryArn(`${Aws.ACCOUNT_ID}.dkr.ecr.test-region.amazonaws.com/my-repo:latest`, 'aws')).toBe(
      `arn:aws:ecr:test-region:${Aws.ACCOUNT_ID}:repository/my-repo`,
    );
  });

  it('carries an unresolved region into the ARN', () => {
    expect(parseEcrRepositoryArn(`test-account.dkr.ecr.${Aws.REGION}.amazonaws.com/my-repo:latest`, 'aws')).toBe(
      `arn:aws:ecr:${Aws.REGION}:test-account:repository/my-repo`,
    );
  });

  it('carries an unresolved account and region into the ARN', () => {
    expect(parseEcrRepositoryArn(`${Aws.ACCOUNT_ID}.dkr.ecr.${Aws.REGION}.amazonaws.com/my-org/my-repo`, 'aws')).toBe(
      `arn:aws:ecr:${Aws.REGION}:${Aws.ACCOUNT_ID}:repository/my-org/my-repo`,
    );
  });

  it('throws for a host that only contains the registry suffix', () => {
    expect(() =>
      parseEcrRepositoryArn('test-account.dkr.ecr.test-region.amazonaws.com.example.com/my-repo', 'aws'),
    ).toThrow('Invalid ECR container URI format');
  });

  it('throws for a host missing the separator before the region', () => {
    expect(() => parseEcrRepositoryArn('test-account.dkr.ecrtest-region.amazonaws.com/my-repo', 'aws')).toThrow(
      'Invalid ECR container URI format',
    );
  });

  it('throws for a literal label with an invalid character', () => {
    // The underscores are the point: an unresolved label is passed through unchecked, so a literal
    // one still has to be rejected when it is not a valid host label.
    expect(() => parseEcrRepositoryArn('test-account.dkr.ecr.test_region.amazonaws.com/my-repo', 'aws')).toThrow(
      'Invalid ECR container URI format',
    );
  });

  it('throws for a host with no account label', () => {
    expect(() => parseEcrRepositoryArn('.dkr.ecr.test-region.amazonaws.com/my-repo', 'aws')).toThrow(
      'Invalid ECR container URI format',
    );
  });

  it('throws for a URI with no repository path', () => {
    expect(() => parseEcrRepositoryArn('test-account.dkr.ecr.test-region.amazonaws.com/:latest', 'aws')).toThrow(
      'Invalid ECR container URI format',
    );
  });

  it('throws a descriptive error for a non-ECR URI', () => {
    expect(() => parseEcrRepositoryArn('docker.io/library/nginx:latest', 'aws')).toThrow(
      'Invalid ECR container URI format: docker.io/library/nginx:latest',
    );
  });

  it('throws for an empty URI', () => {
    expect(() => parseEcrRepositoryArn('', 'aws')).toThrow('Invalid ECR container URI format');
  });
});

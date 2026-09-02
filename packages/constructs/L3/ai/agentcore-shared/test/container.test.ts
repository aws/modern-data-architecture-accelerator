/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

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

  it('throws a descriptive error for a non-ECR URI', () => {
    expect(() => parseEcrRepositoryArn('docker.io/library/nginx:latest', 'aws')).toThrow(
      'Invalid ECR container URI format: docker.io/library/nginx:latest',
    );
  });

  it('throws for an empty URI', () => {
    expect(() => parseEcrRepositoryArn('', 'aws')).toThrow('Invalid ECR container URI format');
  });
});

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Token } from 'aws-cdk-lib';

/** An ECR host label (account id or region) once resolved to a literal. */
const HOST_LABEL_PATTERN = /^[a-zA-Z\d-]+$/;

/** Separates the account label from the region label in an ECR registry host. */
const ECR_HOST_INFIX = '.dkr.ecr';

/** The FIPS endpoint variant, which the ECR registry serves as `dkr.ecr-fips`. */
const ECR_FIPS_SUFFIX = '-fips';

/** Registry host suffixes, longest first so the aws-cn suffix wins over its own prefix. */
const ECR_HOST_SUFFIXES = ['.amazonaws.com.cn', '.amazonaws.com'];

interface EcrUriParts {
  readonly account: string;
  readonly region: string;
  readonly repository: string;
}

/**
 * Parses an ECR container image URI into the owning repository's ARN, for scoping the execution
 * role's `ecr:GetDownloadUrlForLayer` / `ecr:BatchGetImage` pull grant to that one repository.
 *
 * Shared by the AgentCore Runtime and Harness L3 constructs, which both accept a pre-built ECR
 * `containerUri` and scope private-ECR pull permissions to its repository.
 *
 * Accepts the standard ECR URI form
 * `{account}.dkr.ecr.{region}.amazonaws.com/{repository}[:{tag}|@{digest}]`, including nested
 * repository paths (`my-org/my-team/my-repo`), the `ecr-fips` endpoint variant, and the aws-cn
 * `.amazonaws.com.cn` host suffix.
 *
 * The account and region may each be an unresolved CDK token rather than a literal: MDAA
 * `{{account}}` / `{{region}}` / `{{ssm:...}}` references resolve to a token whenever the value is
 * only known at deploy time — an env-agnostic synth (config `account: default` with no resolvable
 * credentials) leaves `{{account}}` as the `AWS::AccountId` pseudo-parameter. Such a label is
 * carried into the returned ARN unvalidated, where CDK resolves it into the matching
 * CloudFormation reference, so the grant still scopes to the single repository. Literal labels are
 * still format-checked, so a genuinely malformed URI fails at synth rather than producing an ARN
 * CloudFormation would reject.
 *
 * @param containerUri - the ECR image URI
 * @param partition - the AWS partition for the resulting ARN (e.g. `aws`)
 * @returns the repository ARN `arn:{partition}:ecr:{region}:{account}:repository/{repository}`
 * @throws Error naming the offending URI when it does not match the expected ECR format
 */
export function parseEcrRepositoryArn(containerUri: string, partition: string): string {
  // Examples:
  //   123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo:latest
  //   123456789012.dkr.ecr.us-east-1.amazonaws.com/my-org/my-team/my-repo:v1.0.0
  //   123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo@sha256:abc123...
  //   123456789012.dkr.ecr.us-east-1.amazonaws.com/my-repo
  //   123456789012.dkr.ecr-fips.us-east-1.amazonaws.com/my-repo:latest   (FIPS endpoint variant)
  //   123456789012.dkr.ecr.cn-north-1.amazonaws.com.cn/my-repo:latest    (aws-cn host suffix)
  //   <unresolved account>.dkr.ecr.us-east-1.amazonaws.com/my-repo       (MDAA `{{account}}`)
  const parts = parseEcrUri(containerUri);

  if (!parts) {
    throw new Error(
      `Invalid ECR container URI format: ${containerUri}. Expected format: ` +
        `{account}.dkr.ecr.{region}.amazonaws.com/{repository}[:{tag}|@{digest}]`,
    );
  }

  const { account, region, repository } = parts;
  return `arn:${partition}:ecr:${region}:${account}:repository/${repository}`;
}

/**
 * Splits an ECR URI into its account, region, and repository, or undefined when the URI is not in
 * the expected form. Split on the literal host delimiters rather than matched with a single regex
 * over the whole URI: an unresolved account or region is an opaque string that no host-label
 * pattern can match, and the delimiters (`/`, `.dkr.ecr`, `.amazonaws.com`) never appear inside
 * one, so they locate the labels whether or not those labels are resolved.
 */
function parseEcrUri(containerUri: string): EcrUriParts | undefined {
  const pathStart = containerUri.indexOf('/');
  if (pathStart < 0) {
    return undefined;
  }

  const repository = withoutTagOrDigest(containerUri.slice(pathStart + 1));
  if (!repository) {
    return undefined;
  }

  const host = parseEcrHost(containerUri.slice(0, pathStart));
  return host ? { ...host, repository } : undefined;
}

/** The repository path, dropping the `:{tag}` or `@{digest}` the image URI may pin it to. */
function withoutTagOrDigest(path: string): string {
  const end = [':', '@']
    .map(separator => path.indexOf(separator))
    .filter(index => index >= 0)
    .reduce((earliest, index) => Math.min(earliest, index), path.length);
  return path.slice(0, end);
}

/** The account and region labels of an ECR registry host, or undefined when it is not one. */
function parseEcrHost(host: string): Omit<EcrUriParts, 'repository'> | undefined {
  const infixStart = host.indexOf(ECR_HOST_INFIX);
  if (infixStart <= 0) {
    return undefined;
  }
  const account = host.slice(0, infixStart);

  let remainder = host.slice(infixStart + ECR_HOST_INFIX.length);
  if (remainder.startsWith(ECR_FIPS_SUFFIX)) {
    remainder = remainder.slice(ECR_FIPS_SUFFIX.length);
  }
  if (!remainder.startsWith('.')) {
    return undefined;
  }
  remainder = remainder.slice(1);

  // The host must END with a registry suffix, so a lookalike (`...amazonaws.com.example.com`) is
  // rejected rather than parsed as a region.
  const suffix = ECR_HOST_SUFFIXES.find(candidate => remainder.endsWith(candidate));
  if (!suffix) {
    return undefined;
  }
  const region = remainder.slice(0, remainder.length - suffix.length);

  return isHostLabel(account) && isHostLabel(region) ? { account, region } : undefined;
}

/**
 * Whether a host label is usable. An unresolved token is accepted as-is: its value arrives at
 * deploy time, so there is nothing to check at synth, and rejecting it would break the documented
 * `{{account}}` / `{{region}}` config references.
 */
function isHostLabel(label: string): boolean {
  return Token.isUnresolved(label) || HOST_LABEL_PATTERN.test(label);
}

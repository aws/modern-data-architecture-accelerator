/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

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
  // The host portion allows the optional `-fips` endpoint variant and the trailing `.cn` suffix, so
  // aws-cn and FIPS registry URIs — which the ECR registry serves — parse rather than being rejected
  // as malformed. This keeps the parser partition-aware, matching the interpolated ARN it returns.
  const uriPattern = /^([a-zA-Z\d-]+)\.dkr\.ecr(?:-fips)?\.([a-zA-Z\d-]+)\.amazonaws\.com(?:\.cn)?\/([^:@]+)/;
  const match = uriPattern.exec(containerUri);

  if (!match) {
    throw new Error(
      `Invalid ECR container URI format: ${containerUri}. Expected format: ` +
        `{account}.dkr.ecr.{region}.amazonaws.com/{repository}[:{tag}|@{digest}]`,
    );
  }

  const [, account, region, repository] = match;
  return `arn:${partition}:ecr:${region}:${account}:repository/${repository}`;
}

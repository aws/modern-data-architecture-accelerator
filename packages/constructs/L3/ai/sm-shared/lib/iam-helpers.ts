/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Aws } from 'aws-cdk-lib';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { MdaaRole } from '@aws-mdaa/iam-constructs';

/**
 * Adds a cross-account KMS key policy allowing encrypt/decrypt from the specified account IDs.
 * Used by training, pipeline, and deploy constructs for cross-account model artifact access.
 * @param kmsKey The KMS key to add the policy to (must support addToResourcePolicy)
 * @param accountIds Target account IDs for cross-account access
 * @param kmsActions KMS actions to grant (e.g., DECRYPT_ACTIONS + ENCRYPT_ACTIONS from @aws-mdaa/kms-constructs)
 */
export function addCrossAccountKmsPolicy(kmsKey: IKey, accountIds: string[], kmsActions: string[]): void {
  if (accountIds.length === 0) return;
  // resources: ['*'] in a KMS key resource policy means "this key" — it is NOT a wildcard
  // across all keys. Key resource policies are always scoped to the key they are attached to.
  const crossAccountKmsPolicy = new PolicyStatement({
    effect: Effect.ALLOW,
    actions: [...kmsActions, 'kms:DescribeKey'],
    resources: ['*'],
  });
  for (const accountId of new Set(accountIds)) {
    crossAccountKmsPolicy.addArnPrincipal(`arn:${Aws.PARTITION}:iam::${accountId}:root`);
  }
  kmsKey.addToResourcePolicy(crossAccountKmsPolicy);
}

/** SageMaker tag management actions — shared across constructs */
export const SAGEMAKER_TAG_ACTIONS = ['sagemaker:AddTags', 'sagemaker:DeleteTags', 'sagemaker:ListTags'];

/**
 * Adds ECR read-only permissions (wildcard resource) to a role.
 *
 * ECR permissions require wildcard resource:
 * - ecr:GetAuthorizationToken is an account-level action that does not support resource-level ARNs
 *   https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonelasticcontainerregistry.html
 * - ecr:BatchGetImage, BatchCheckLayerAvailability, GetDownloadUrlForLayer need access to
 *   AWS-managed SageMaker DLC repositories (account IDs vary by region) and customer repos,
 *   which cannot be enumerated at construct time.
 *   https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-roles.html#sagemaker-roles-createmodel-perms
 */
export function addEcrReadPolicy(role: MdaaRole): void {
  // ecr:GetAuthorizationToken is an account-level action that does not support resource-level ARNs
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ecr:GetAuthorizationToken'],
      resources: ['*'],
    }),
  );
  // Image pull actions scoped to all ECR repositories (required for AWS-managed SageMaker
  // DLC repositories whose account IDs vary by region and cannot be enumerated at construct time)
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ecr:BatchCheckLayerAvailability', 'ecr:BatchGetImage', 'ecr:GetDownloadUrlForLayer'],
      resources: [`arn:${Aws.PARTITION}:ecr:*:*:repository/*`],
    }),
  );
}

/**
 * Adds CloudWatch Logs permissions (CreateLogGroup, CreateLogStream, PutLogEvents)
 * scoped to a specific log group prefix.
 */
export function addCloudWatchLogsPolicy(role: MdaaRole, logGroupPrefix: string): void {
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [`arn:${Aws.PARTITION}:logs:${Aws.REGION}:${Aws.ACCOUNT_ID}:log-group:${logGroupPrefix}*`],
    }),
  );
}

/**
 * Adds VPC network permissions (wildcard resource) required by SageMaker jobs.
 *
 * EC2 network permissions require wildcard resource:
 * - ec2:Describe* actions do not support resource-level permissions
 *   https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
 * - ec2:CreateNetworkInterface/DeleteNetworkInterface target ENIs created dynamically by
 *   SageMaker at runtime, so ARNs cannot be known at deploy time
 * https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-roles.html#sagemaker-roles-createtrainingjob-perms
 */
export const CDK_DEFAULT_BOOTSTRAP_QUALIFIER = 'hnb659fds';

/**
 * Adds CDK deploy permissions to a CodeBuild role, including CloudFormation stack operations,
 * CDK asset bucket access, CDK bootstrap role assumption, S3 org-scoped access,
 * KMS via-service, and SSM parameter operations.
 * @param role The CodeBuild role to add permissions to
 * @param orgPrefix The organization prefix for scoping CloudFormation stacks and S3 buckets
 * @param cdkBootstrapQualifier CDK bootstrap qualifier (default: 'hnb659fds')
 */
export function addCdkDeployPolicy(role: MdaaRole, orgPrefix: string, cdkBootstrapQualifier?: string): void {
  const qualifier = cdkBootstrapQualifier ?? CDK_DEFAULT_BOOTSTRAP_QUALIFIER;

  // CloudFormation stack operations scoped to org prefix
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'cloudformation:CreateStack',
        'cloudformation:UpdateStack',
        'cloudformation:DeleteStack',
        'cloudformation:DescribeStacks',
        'cloudformation:DescribeStackEvents',
        'cloudformation:GetTemplate',
        'cloudformation:CreateChangeSet',
        'cloudformation:DescribeChangeSet',
        'cloudformation:ExecuteChangeSet',
        'cloudformation:DeleteChangeSet',
        'cloudformation:GetTemplateSummary',
      ],
      resources: [`arn:${Aws.PARTITION}:cloudformation:${Aws.REGION}:${Aws.ACCOUNT_ID}:stack/${orgPrefix}-*`],
    }),
  );
  // CDK asset bucket access
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket', 's3:GetBucketLocation'],
      resources: [
        `arn:${Aws.PARTITION}:s3:::cdk-${qualifier}-assets-${Aws.ACCOUNT_ID}-${Aws.REGION}`,
        `arn:${Aws.PARTITION}:s3:::cdk-${qualifier}-assets-${Aws.ACCOUNT_ID}-${Aws.REGION}/*`,
      ],
    }),
  );
  // CDK bootstrap role PassRole and AssumeRole
  const cdkRoleSuffixes = ['deploy-role', 'file-publishing-role', 'lookup-role'];
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['iam:PassRole'],
      resources: [
        `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/cdk-${qualifier}-cfn-exec-role-${Aws.ACCOUNT_ID}-${Aws.REGION}`,
      ],
      conditions: {
        StringEquals: { 'iam:PassedToService': 'cloudformation.amazonaws.com' },
      },
    }),
  );
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['sts:AssumeRole'],
      resources: cdkRoleSuffixes.map(
        suffix =>
          `arn:${Aws.PARTITION}:iam::${Aws.ACCOUNT_ID}:role/cdk-${qualifier}-${suffix}-${Aws.ACCOUNT_ID}-${Aws.REGION}`,
      ),
    }),
  );
  // Org-scoped S3 access for MDAA-created resources
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['s3:GetObject', 's3:PutObject', 's3:ListBucket', 's3:GetBucketLocation'],
      resources: [`arn:${Aws.PARTITION}:s3:::${orgPrefix}-*`, `arn:${Aws.PARTITION}:s3:::${orgPrefix}-*/*`],
    }),
  );
  // KMS key/* wildcard: specific key ARNs are unknown at deploy time (keys belong to artifact
  // buckets created by other constructs). Mitigated by kms:ViaService (S3 only) and kms:CallerAccount.
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['kms:Decrypt', 'kms:Encrypt', 'kms:GenerateDataKey', 'kms:DescribeKey'],
      resources: [`arn:${Aws.PARTITION}:kms:${Aws.REGION}:${Aws.ACCOUNT_ID}:key/*`],
      conditions: {
        StringEquals: {
          'kms:CallerAccount': Aws.ACCOUNT_ID,
          'kms:ViaService': `s3.${Aws.REGION}.amazonaws.com`,
        },
      },
    }),
  );
  // SSM parameter operations scoped to org namespace
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ssm:PutParameter', 'ssm:GetParameter', 'ssm:DeleteParameter', 'ssm:GetParameters'],
      resources: [`arn:${Aws.PARTITION}:ssm:${Aws.REGION}:${Aws.ACCOUNT_ID}:parameter/${orgPrefix}/*`],
    }),
  );
}

export function addVpcNetworkPolicy(role: MdaaRole): void {
  // ec2:Describe* actions do not support resource-level permissions
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'ec2:DescribeNetworkInterfaces',
        'ec2:DescribeVpcs',
        'ec2:DescribeSubnets',
        'ec2:DescribeDhcpOptions',
        'ec2:DescribeSecurityGroups',
      ],
      resources: ['*'],
    }),
  );
  // ENI create/delete: SageMaker creates ENIs dynamically at runtime so ARNs are unknown at deploy time.
  // ec2:CreateNetworkInterface does not support ec2:AuthorizedService condition (only CreateNetworkInterfacePermission does).
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ec2:CreateNetworkInterface', 'ec2:DeleteNetworkInterface'],
      resources: ['*'],
    }),
  );
  role.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['ec2:CreateNetworkInterfacePermission'],
      resources: ['*'],
      conditions: {
        StringEquals: { 'ec2:AuthorizedService': 'sagemaker.amazonaws.com' },
      },
    }),
  );
}

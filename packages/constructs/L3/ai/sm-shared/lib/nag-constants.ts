/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { NagPackSuppression } from 'cdk-nag';

/** Common CDK Nag suppression for inline policies on construct-scoped roles */
export const INLINE_POLICY_SUPPRESSIONS: NagPackSuppression[] = [
  {
    id: 'HIPAA.Security-IAMNoInlinePolicy',
    reason: 'Inline policies are used for least-privilege scoping on construct-specific roles.',
  },
  {
    id: 'NIST.800.53.R5-IAMNoInlinePolicy',
    reason: 'Inline policies are used for least-privilege scoping on construct-specific roles.',
  },
  {
    id: 'PCI.DSS.321-IAMNoInlinePolicy',
    reason: 'Inline policies are used for least-privilege scoping on construct-specific roles.',
  },
];

/** Common CDK Nag suppression for CodeBuild projects using CodeCommit source */
export const CODEBUILD_SOURCE_SUPPRESSIONS: NagPackSuppression[] = [
  {
    id: 'HIPAA.Security-CodeBuildProjectSourceRepoUrl',
    reason: 'CodeBuild project uses CodeCommit as source, not GitHub/Bitbucket. OAuth is not applicable.',
  },
  {
    id: 'PCI.DSS.321-CodeBuildProjectSourceRepoUrl',
    reason: 'CodeBuild project uses CodeCommit as source, not GitHub/Bitbucket. OAuth is not applicable.',
  },
  { id: 'AwsSolutions-CB4', reason: 'CodeBuild project uses customer-managed KMS key for encryption.' },
];

/** Common CDK Nag suppression for S3 bucket replication (handled at infrastructure level, not per-bucket).
 *  Required until MdaaBucket L2 includes these suppressions natively. */
export const S3_REPLICATION_SUPPRESSIONS: NagPackSuppression[] = [
  { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
  { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
  { id: 'PCI.DSS.321-S3BucketReplicationEnabled', reason: 'MDAA does not use bucket replication.' },
];

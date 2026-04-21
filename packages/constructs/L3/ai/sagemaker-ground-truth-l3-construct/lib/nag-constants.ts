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

/** CDK Nag suppressions for Lambda functions with inline code */
export const LAMBDA_SUPPRESSIONS: NagPackSuppression[] = [
  { id: 'AwsSolutions-L1', reason: 'Lambda runtime is explicitly set to Python 3.12 (latest supported by CDK).' },
  {
    id: 'HIPAA.Security-LambdaConcurrency',
    reason: 'Lambda concurrency not required for Step Functions-invoked Lambdas.',
  },
  { id: 'HIPAA.Security-LambdaDLQ', reason: 'DLQ not needed — Step Functions handles retry/error logic.' },
  { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Lambda does not access VPC resources; runs in service VPC.' },
  {
    id: 'NIST.800.53.R5-LambdaConcurrency',
    reason: 'Lambda concurrency not required for Step Functions-invoked Lambdas.',
  },
  { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'DLQ not needed — Step Functions handles retry/error logic.' },
  { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Lambda does not access VPC resources; runs in service VPC.' },
  {
    id: 'PCI.DSS.321-LambdaConcurrency',
    reason: 'Lambda concurrency not required for Step Functions-invoked Lambdas.',
  },
  { id: 'PCI.DSS.321-LambdaDLQ', reason: 'DLQ not needed — Step Functions handles retry/error logic.' },
  { id: 'PCI.DSS.321-LambdaInsideVPC', reason: 'Lambda does not access VPC resources; runs in service VPC.' },
];

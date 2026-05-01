/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Adds standard SageMaker resource tags for Studio integration.
 * Tags applied: sagemaker:project-name, and optionally sagemaker:domain-id and sagemaker:domain-arn.
 */
export function addSageMakerTags(scope: Construct, projectName: string, domainId?: string, domainArn?: string): void {
  Tags.of(scope).add('sagemaker:project-name', projectName);
  if (domainId) Tags.of(scope).add('sagemaker:domain-id', domainId);
  if (domainArn) Tags.of(scope).add('sagemaker:domain-arn', domainArn);
}

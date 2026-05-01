/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * SageMaker Pipeline Definition Language — CDK Step Constructs
 *
 * These classes generate SageMaker Pipeline Definition JSON, following the same
 * pattern as aws_stepfunctions generates Amazon States Language (ASL) JSON.
 *
 * The pipeline definition is passed to CfnPipeline as a JSON string, making
 * the entire pipeline a CloudFormation-managed resource with full MDAA compliance.
 *
 * @see https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-pipeline-structure.html
 */

export * from './pipeline-step';
export * from './processing-step';
export * from './training-step';
export * from './register-model-step';
export * from './condition-step';
export * from './model-step';
export * from './transform-step';
export * from './pipeline-definition';

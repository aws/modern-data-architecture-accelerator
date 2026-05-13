/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/** Policy configuration for the build role. Supports managed policy ARNs or inline policy documents (mutually exclusive per entry). */
export interface BuildPolicyConfig {
  /** ARN of an existing managed policy to attach to the build role. Mutually exclusive with policyDocument. The deployer is responsible for ensuring the referenced policy follows least-privilege principles — CDK Nag cannot inspect imported policies. */
  readonly policyArn?: string;
  /** Inline policy document. The construct creates a managed policy from these statements. Mutually exclusive with policyArn. */
  readonly policyDocument?: BuildPolicyDocumentConfig;
  /** CDK Nag suppressions for rules triggered by this policy. Required when policyDocument uses wildcard resources. Deployers are responsible for ensuring suppression reasons are specific and auditable. */
  readonly suppressions?: BuildPolicySuppressionConfig[];
}

/** CDK Nag suppression entry for build policies. Deployers are responsible for providing meaningful justifications that explain why the suppressed rule is acceptable for their use case. Vague reasons (e.g. 'needed') should be flagged during code review. */
export interface BuildPolicySuppressionConfig {
  /** CDK Nag rule ID to suppress (e.g. 'AwsSolutions-IAM5'). */
  readonly id: string;
  /** Justification for suppressing the rule. Should clearly explain why the broad permission is required and what constraints (e.g. Conditions) limit its scope. */
  readonly reason: string;
}

/** Inline policy document for build role permissions. */
export interface BuildPolicyDocumentConfig {
  /** IAM policy statements. */
  /** @jsii ignore */
  readonly Statement: BuildPolicyStatementConfig[];
}

/** IAM policy statement for build role permissions. */
export interface BuildPolicyStatementConfig {
  /** Statement identifier for tracking. */
  /** @jsii ignore */
  readonly Sid?: string;
  /** Effect of the policy statement. */
  /** @jsii ignore */
  readonly Effect: string;
  /** IAM actions to allow or deny. */
  /** @jsii ignore */
  readonly Action: string | string[];
  /** AWS resource ARNs this statement applies to. */
  /** @jsii ignore */
  readonly Resource: string | string[];
  /** Conditions for when the policy statement is in effect. */
  /** @jsii ignore */
  readonly Condition?: { [key: string]: { [key: string]: string } };
}

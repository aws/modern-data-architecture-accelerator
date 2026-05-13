/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Construct } from 'constructs';
import { Effect, IManagedPolicy, ManagedPolicy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { MdaaManagedPolicy } from '@aws-mdaa/iam-constructs';
import { MdaaNagSuppressions } from '@aws-mdaa/construct';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { BuildPolicyConfig } from './build-policy-types';

/** Options for building managed policies from buildPolicies config. */
export interface BuildManagedPoliciesOptions {
  /** The construct scope for creating policy resources. */
  readonly scope: Construct;
  /** MDAA naming instance for policy name generation. */
  readonly naming: IMdaaResourceNaming;
  /** Prefix for generated managed policy names (e.g. 'batch-cb', 'train-cb', 'deploy-cb'). */
  readonly policyNamePrefix: string;
  /** Project name for policy naming. */
  readonly projectName: string;
  /** The buildPolicies config array (may be undefined). */
  readonly buildPolicies?: BuildPolicyConfig[];
}

/**
 * Builds an array of IAM managed policies from the buildPolicies config.
 *
 * For each entry in buildPolicies:
 * - If `policyArn` is set, imports the existing managed policy by ARN.
 * - If `policyDocument` is set, creates a new MdaaManagedPolicy from the inline statements
 *   and applies any provided nag suppressions.
 */
export function buildManagedPolicies(options: BuildManagedPoliciesOptions): IManagedPolicy[] {
  const { scope, naming, policyNamePrefix, projectName, buildPolicies } = options;
  const policies: IManagedPolicy[] = [];

  for (const [index, policy] of (buildPolicies ?? []).entries()) {
    if (policy.policyArn) {
      policies.push(ManagedPolicy.fromManagedPolicyArn(scope, `cb-policy-${index}`, policy.policyArn));
    } else if (policy.policyDocument?.Statement) {
      const statements = policy.policyDocument.Statement.map(
        stmt =>
          new PolicyStatement({
            sid: stmt.Sid,
            effect: stmt.Effect === 'Allow' ? Effect.ALLOW : Effect.DENY,
            actions: Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action],
            resources: Array.isArray(stmt.Resource) ? stmt.Resource : [stmt.Resource],
            conditions: stmt.Condition,
          }),
      );
      const managedPolicy = new MdaaManagedPolicy(scope, `cb-inline-policy-${index}`, {
        naming,
        managedPolicyName: `${policyNamePrefix}-${projectName}-custom-${index}`,
        description: `Custom build policy for ${projectName}`,
        statements,
      });
      if (policy.suppressions) {
        MdaaNagSuppressions.addCodeResourceSuppressions(managedPolicy, policy.suppressions, true);
      }
      policies.push(managedPolicy);
    }
  }

  return policies;
}

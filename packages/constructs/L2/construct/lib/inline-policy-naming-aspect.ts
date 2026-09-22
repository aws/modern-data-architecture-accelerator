/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { IAspect, Token } from 'aws-cdk-lib';
import { IMdaaResourceNaming, MdaaResourceType } from '@aws-mdaa/naming';
import { IConstruct } from 'constructs';

/** Maximum character length for IAM inline policy names. */
const MAX_POLICY_NAME = 128;

/**
 * Configuration for the InlinePolicyNamingAspect.
 */
export interface InlinePolicyNamingAspectProps {
  /** The MDAA naming instance to use for generating policy names. */
  readonly naming: IMdaaResourceNaming;

  /**
   * Whether to rename DefaultPolicy resources created internally by CDK
   * when role.addToPolicy() is called.
   *
   * Use cases: Full naming consistency; Governance compliance; Audit readability
   *
   * Validation: Optional boolean; defaults to true
   * @default true
   */
  readonly includeDefaultPolicies?: boolean;
}

/** Minimal structural view of a CFN node the aspect can rewrite. */
interface CfnPropertyOverridable {
  cfnResourceType?: string;
  addPropertyOverride?: (path: string, value: unknown) => void;
}

/** A single entry of an AWS::IAM::Role `Policies` array (embedded inline policy). */
interface EmbeddedRolePolicy {
  policyName?: string;
}

/**
 * CDK Aspect that renames inline IAM policy names using the configured MDAA
 * naming module. Addresses the gap where MDAA wraps Role (MdaaRole) and
 * ManagedPolicy (MdaaManagedPolicy) but not the inline policy names that CDK
 * creates internally via role.addToPolicy(), that MdaaCustomResource creates
 * with a hardcoded policyName, or that MDAA hardcodes in a role's embedded
 * `Policies[]` (e.g. via MdaaRole inlinePolicies).
 *
 * Activated via the `@aws-mdaa/namingEnforceInlinePolicies: true` CDK context key.
 * When enabled, visits:
 *  - every standalone AWS::IAM::Policy, rewriting its PolicyName; and
 *  - every AWS::IAM::Role, rewriting each embedded Policies[].PolicyName.
 * Both use the configured naming with the IAM_POLICY resource type. Rewriting
 * an embedded policy name is an in-place Role update (Policies is not a
 * replacement-requiring property), unlike a standalone AWS::IAM::Policy rename.
 */
export class InlinePolicyNamingAspect implements IAspect {
  private readonly naming: IMdaaResourceNaming;
  private readonly includeDefaultPolicies: boolean;

  constructor(props: InlinePolicyNamingAspectProps) {
    this.naming = props.naming;
    this.includeDefaultPolicies = props.includeDefaultPolicies ?? true;
  }

  public visit(node: IConstruct): void {
    const cfn = node as unknown as CfnPropertyOverridable;
    if (!cfn.addPropertyOverride) {
      return;
    }

    if (cfn.cfnResourceType === 'AWS::IAM::Policy') {
      this.visitStandalonePolicy(node, cfn);
    } else if (cfn.cfnResourceType === 'AWS::IAM::Role') {
      this.visitEmbeddedRolePolicies(node, cfn);
    }
  }

  private visitStandalonePolicy(node: IConstruct, cfn: CfnPropertyOverridable): void {
    const isDefaultPolicy = node.node.path.endsWith('/DefaultPolicy/Resource');
    if (isDefaultPolicy && !this.includeDefaultPolicies) {
      return;
    }

    const suffix = this.deriveSuffix(node, isDefaultPolicy);
    const policyName = this.policyName(suffix);
    cfn.addPropertyOverride!('PolicyName', policyName);
  }

  /**
   * Rewrites the PolicyName of each inline policy embedded in an
   * AWS::IAM::Role `Policies[]` array. The suffix is derived from the existing
   * hardcoded policy name (e.g. 'HealthLakeS3Access'), so entries whose name is
   * a CDK token (not a concrete string) are skipped. This is an in-place Role
   * update; the Policies property does not require replacement.
   */
  private visitEmbeddedRolePolicies(node: IConstruct, cfn: CfnPropertyOverridable): void {
    const policies = (node as unknown as { policies?: unknown }).policies;
    if (!Array.isArray(policies)) {
      return;
    }
    policies.forEach((policy, index) => {
      const existingName = (policy as EmbeddedRolePolicy)?.policyName;
      // Only rewrite concrete, statically-known names. A CDK token is a string
      // at runtime (`${Token[TOKEN.n]}`), so typeof alone does not exclude it;
      // Token.isUnresolved is what identifies a deferred value. Slugifying a
      // token placeholder would discard the dynamic name and embed CDK's global
      // token counter, producing a name that changes whenever unrelated
      // constructs are added or reordered.
      if (typeof existingName !== 'string' || existingName.length === 0 || Token.isUnresolved(existingName)) {
        return;
      }
      const policyName = this.policyName(this.slugify(existingName));
      cfn.addPropertyOverride!(`Policies.${index}.PolicyName`, policyName);
    });
  }

  /** Generates an IAM_POLICY-typed resource name, capped at the IAM limit. */
  private policyName(suffix: string): string {
    return this.naming.withResourceType(MdaaResourceType.IAM_POLICY).resourceName(suffix, MAX_POLICY_NAME);
  }

  /**
   * Derives a meaningful suffix from the construct path for the policy name.
   * Strips the stack name (first segment) and the trailing 'Resource' segment,
   * then normalizes camelCase to kebab-case.
   */
  private deriveSuffix(node: IConstruct, isDefaultPolicy: boolean): string {
    const segments = node.node.path.split('/');
    // Remove stack (first segment) and 'Resource' (last segment)
    let meaningful = segments.slice(1, -1);
    // Shorten 'DefaultPolicy' to 'defpol' to save characters
    if (isDefaultPolicy) {
      meaningful = meaningful.map(s => (s === 'DefaultPolicy' ? 'defpol' : s));
    }
    return this.slugify(meaningful.join('-'));
  }

  /**
   * Converts camelCase to kebab-case and collapses non-alphanumeric runs.
   */
  private slugify(input: string): string {
    return (
      input
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        // Collapse every run of non-alphanumerics to a single '-', so the
        // string can contain at most one leading and one trailing dash.
        .replace(/[^a-zA-Z0-9]+/g, '-')
        // At most one leading/trailing dash remains, so single-char anchors
        // suffice and avoid the quantifier-before-anchor backtracking.
        .replace(/^-|-$/g, '')
        .toLowerCase()
    );
  }
}

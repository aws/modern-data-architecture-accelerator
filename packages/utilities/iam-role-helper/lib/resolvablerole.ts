/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Annotations, CustomResource, Stack, Token } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { MdaaResolvableRoleRef } from '.';
import { MdaaRoleHelper } from './rolehelper';
import { ArnPrincipal, IRole, Role } from 'aws-cdk-lib/aws-iam';

/** Number of leading colon-separated segments in an ARN before the resource segment. */
const ARN_SEGMENTS_BEFORE_RESOURCE = 5;
/** Index of the account segment within an ARN. */
const ARN_ACCOUNT_INDEX = 4;
/** Index of the service segment within an ARN. */
const ARN_SERVICE_INDEX = 2;
/** Index of the literal 'arn' prefix segment. */
const ARN_PREFIX_INDEX = 0;
/** Index of the region segment within an ARN. */
const ARN_REGION_INDEX = 3;
/** An AWS account ID is exactly twelve digits. */
const ACCOUNT_ID_PATTERN = /^\d{12}$/;

/**
 * Whether a colon-split value declares itself an IAM ARN. Anything failing this is not a value
 * whose account segment can be reasoned about, which includes a CloudFormation dynamic reference
 * such as `{{resolve:ssm:/path}}`, whose segments are a parameter path rather than ARN fields.
 */
function isIamArn(parts: string[]): boolean {
  return parts[ARN_PREFIX_INDEX] === 'arn' && parts[ARN_SERVICE_INDEX] === 'iam';
}

/**
 * Whether a colon-split IAM ARN has the fields the IAM ARN grammar requires: a resource segment,
 * and an empty region segment, since IAM is a global service in every partition. Writing the
 * region's `::` as a single colon moves the account into the region slot, so the empty-region
 * test is what rejects that shifted form, however many colons the resource then carries.
 *
 * CDK's `Arn.split` is not a substitute: it checks only the component count, so a shifted ARN
 * whose resource carries one extra colon, such as `arn:aws:iam:123456789012:role/name:extra`,
 * passes it with the account read as `role/name`.
 */
function hasIamArnShape(parts: string[]): boolean {
  return parts.length > ARN_SEGMENTS_BEFORE_RESOURCE && parts[ARN_REGION_INDEX] === '';
}

/**
 * Extracts the account ID from an IAM role ARN string.
 *
 * Returns undefined whenever the account cannot be read: a CDK token, a value which is not an IAM
 * ARN, or an IAM ARN without the required shape. Undefined means unreadable rather than invalid,
 * since a token is a supported value; {@link validateArnFormat} is what rejects the cases which are
 * actually wrong, and keys off the same predicates so the pair cannot disagree.
 */
function extractAccountFromArn(arn: string): string | undefined {
  if (Token.isUnresolved(arn)) {
    return undefined;
  }
  // ARN format: arn:partition:iam::ACCOUNT:role/RoleName
  const parts = arn.split(':');
  if (isIamArn(parts) && hasIamArnShape(parts)) {
    return parts[ARN_ACCOUNT_INDEX];
  }
  return undefined;
}

/**
 * Rejects a role reference ARN which MDAA cannot resolve to a role, naming each failure mode rather
 * than restating {@link extractAccountFromArn}'s predicate inverted.
 *
 * Tolerated: a CDK token, whose account is simply not known until deploy (the documented
 * `arn: ssm:/path` role reference resolves to one), and a value which is not an ARN at all, such as
 * the CloudFormation dynamic reference a `{{ssm-org:...}}` reference expands to.
 *
 * Rejected: an ARN of some service other than IAM, which cannot name a role and which the
 * deploy-time lookup would instead search for by the text after its last `/`; an IAM ARN without the
 * shape the grammar requires, most commonly `arn:aws:iam:123456789012:role/name` with the empty
 * region segment omitted; and an account which is not a twelve-digit account ID. Left unvalidated
 * any of these would be emitted into a resource policy as a principal, failing at deploy time with
 * an opaque CloudFormation error instead.
 *
 * The account check applies whenever the stack deploys to a real account, meaning its own account
 * is a twelve-digit ID or is not resolved until deploy. It stands down only when the stack's account
 * is itself a placeholder literal such as `test-account`, which only a test harness synthesizes
 * against, since a placeholder deployment account gives a placeholder foreign account nothing real
 * to be judged by.
 */
function validateArnFormat(refId: string, arn: string, stackAccount: string): void {
  if (Token.isUnresolved(arn)) {
    return;
  }
  const parts = arn.split(':');
  if (parts[ARN_PREFIX_INDEX] !== 'arn') {
    return;
  }
  if (parts[ARN_SERVICE_INDEX] !== 'iam') {
    throw new Error(
      `Role reference '${refId}' has an ARN which is not an IAM ARN: '${arn}'. ` +
        `Expected the form arn:<partition>:iam::<account>:role/<name>. ` +
        `A role reference is resolved through IAM, so an ARN of another service cannot name a role, ` +
        `and is rejected here rather than being looked up at deploy time by the text after its last '/'.`,
    );
  }
  if (!hasIamArnShape(parts)) {
    throw new Error(
      `Role reference '${refId}' has a malformed IAM ARN: '${arn}'. ` +
        `Expected the form arn:<partition>:iam::<account>:role/<name>, noting the empty region segment. ` +
        `MDAA cannot determine whether this role is cross-account, so the reference is rejected here ` +
        `rather than producing an invalid resource policy principal at deploy time.`,
    );
  }
  const account = parts[ARN_ACCOUNT_INDEX];
  const deploysToRealAccount = Token.isUnresolved(stackAccount) || ACCOUNT_ID_PATTERN.test(stackAccount);
  if (deploysToRealAccount && !ACCOUNT_ID_PATTERN.test(account)) {
    throw new Error(
      `Role reference '${refId}' has an IAM ARN whose account is not a twelve-digit account ID: '${arn}'. ` +
        `Expected the form arn:<partition>:iam::<account>:role/<name>. ` +
        `MDAA would otherwise treat '${account}' as another account and grant it by ARN, which fails at deploy time.`,
    );
  }
}

/**
 * A role for which Role ID, Arn, or Name can be resolved using a custom resource. If one of these
 * properties is requested of the object and is not already populated, then a custom Cfn resource
 * will be created to facilitate the lookup.
 *
 * Cross-account roles (where the ARN account differs from the deployment account) are detected
 * automatically. These roles cannot have their ID resolved via the local IAM API, so they are
 * surfaced as ARN-based principals for use in resource policies.
 */
export class MdaaResolvableRole {
  private readonly scope: Construct;
  private readonly roleHelper?: MdaaRoleHelper;
  private readonly roleRef: MdaaResolvableRoleRef;
  private roleCr?: CustomResource;
  private crossAccountCache?: boolean;

  /**
   * Creates an MdaaResolvableRole wrapping a concrete CDK Role.
   * Use this for infrastructure roles created within the same stack that already
   * have their role ID available (e.g., MdaaRole, MdaaLambdaRole).
   *
   * Every anchor is populated from the role, so no lookup custom resource is ever needed and no
   * role helper is required. The ARN of a role created in the stack is a CloudFormation token, so
   * such a role is never treated as cross-account.
   *
   * @param scope The construct scope
   * @param refId A unique reference identifier for this role
   * @param role The concrete CDK Role instance
   */
  public static fromRole(scope: Construct, refId: string, role: Role): MdaaResolvableRole {
    return new MdaaResolvableRole(scope, {
      refId,
      id: role.roleId,
      arn: role.roleArn,
      name: role.roleName,
    });
  }

  /**
   * @param scope The scope in which custom resources for role resolution will be created (if required)
   * @param roleRef The role reference which will be used to resolve a role. The role ref must contain at least
   * one 'anchor' property (one of id, arn, or name) on which the remaining properties can be resolved.
   * @param roleHelper The MDAA role helper which will be used as a custom resource Provider. Required
   * unless the ref already carries every anchor, as it does when built by {@link fromRole}, since
   * without a helper an unpopulated property cannot be looked up. Trails roleRef because jsii
   * rejects an optional parameter ahead of a required one.
   */
  constructor(scope: Construct, roleRef: MdaaResolvableRoleRef, roleHelper?: MdaaRoleHelper) {
    this.scope = scope;
    this.roleHelper = roleHelper;
    this.roleRef = roleRef;
    if (roleRef.arn) {
      validateArnFormat(roleRef.refId, roleRef.arn, Stack.of(scope).account);
    }
  }

  /**
   * @returns The unique reference id for the role ref
   */
  public refId(): string {
    return this.roleRef.refId;
  }

  /**
   * @returns The immutability flag of the ref (defaults false)
   *
   * A cross-account role is always immutable: a managed policy or inline policy can only be
   * attached to a role from the role's own account, and IAM resolves an attachment by role name
   * within the deploying account. Attempting it fails the deployment with 'The role with name
   * <name> cannot be found', or silently attaches to an unrelated local role of the same name.
   */
  public immutable(): boolean {
    return (this.roleRef.immutable != undefined && this.roleRef.immutable) || this.sso() || this.isCrossAccount();
  }

  /**
   * @returns The sso flag of the ref( defaults false )
   */
  public sso(): boolean {
    return this.roleRef.sso != undefined && this.roleRef.sso;
  }

  /**
   * Determines whether this role reference points to a role in a different AWS account
   * than the deployment account. Cross-account detection requires a non-tokenized ARN
   * with an account segment that differs from Stack.of(scope).account.
   *
   * @returns true if the role ARN belongs to a different account, false otherwise.
   * Returns false if cross-account status cannot be determined (e.g., tokenized values).
   */
  public isCrossAccount(): boolean {
    if (this.crossAccountCache !== undefined) {
      return this.crossAccountCache;
    }
    this.crossAccountCache = this.detectCrossAccount();
    if (this.crossAccountCache) {
      Annotations.of(this.scope).addWarningV2(
        `@aws-mdaa/iam-role-helper:crossAccountArnPrincipal:${this.roleRef.refId}`,
        `Role reference '${this.roleRef.refId}' (ARN: ${this.roleRef.arn}) is cross-account. ` +
          `It will be granted access via an ARN-based principal in resource policies. ` +
          `AWS stores an ARN principal as the role's unique ID when the policy is saved, so the role must ` +
          `already exist when this deploys, and if it is later deleted and recreated it loses access until ` +
          `the policy is re-applied.`,
      );
    }
    return this.crossAccountCache;
  }

  /**
   * Returns an ArnPrincipal for this role, suitable for use in resource policies
   * when the role is cross-account and cannot be resolved to a role ID.
   *
   * @returns An ArnPrincipal constructed from the role's ARN.
   */
  public arnPrincipal(): ArnPrincipal {
    return new ArnPrincipal(this.arn());
  }

  /**
   * @returns Either directly the role ref id (if already populated) or a CR attribute token which will contain the id at deployment time.
   */
  public id(): string {
    if (this.roleRef.id) return this.roleRef.id;
    return this.getCr().getAttString('id');
  }

  /**
   * @returns Either directly the role ref arn (if already populated) or a CR attribute token which will contain the arn at deployment time.
   */
  public arn(): string {
    if (this.roleRef.arn) return this.roleRef.arn;
    return this.getCr().getAttString('arn');
  }

  /**
   * @returns Either directly the role ref name (if already populated) or a CR attribute token which will contain the name at deployment time.
   */
  public name(): string {
    if (this.roleRef.name) return this.roleRef.name;
    return this.getCr().getAttString('name');
  }

  public role(id: string): IRole {
    return Role.fromRoleArn(this.scope, id, this.arn());
  }

  private detectCrossAccount(): boolean {
    if (!this.roleRef.arn) {
      return false;
    }
    const arnAccount = extractAccountFromArn(this.roleRef.arn);
    if (!arnAccount) {
      return false;
    }
    const stackAccount = Stack.of(this.scope).account;
    // If the stack account is a token (unresolved), we can't determine cross-account status
    if (Token.isUnresolved(stackAccount)) {
      return false;
    }
    return arnAccount !== stackAccount;
  }

  private getCr(): CustomResource {
    if (this.roleCr) {
      return this.roleCr;
    }
    if (!this.roleHelper) {
      throw new Error('Cannot create custom resource for role resolution without a role helper.');
    }
    // An ARN was supplied but its account could not be read at synth time: an ssm: lookup, or any
    // value carrying a CloudFormation token. Cross-account detection needs a literal account, so
    // the role falls through to this lookup, which reads IAM in the deploying account only. Warn
    // now rather than letting the customer discover it as a deploy-time failure or, worse, as a
    // grant that silently landed on a local role of the same name.
    if (this.roleRef.arn && Token.isUnresolved(this.roleRef.arn)) {
      Annotations.of(this.scope).addWarningV2(
        `@aws-mdaa/iam-role-helper:unverifiableRoleArn:${this.roleRef.refId}`,
        `Role reference '${this.roleRef.refId}' has an ARN which is not resolvable at synth time, so MDAA ` +
          `cannot tell whether it is cross-account and will look the role up by name in the deploying ` +
          `account. If the role lives in another account, the lookup fails with 'Failed to resolve role' ` +
          `or, when this account has a role with the same name, resolves to that role instead. Supply id, ` +
          `arn and name together to skip the lookup - see Cross-Account Role References in CONFIGURATION.md.`,
      );
    }
    console.log('Role resolution required by config. Creating CR.');
    const getRoleResource = new CustomResource(this.scope, `Role-Res-${this.roleRef.refId}`, {
      serviceToken: this.roleHelper.createProviderServiceToken(),
      properties: {
        roleRef: this.roleRef,
      },
    });
    this.roleCr = getRoleResource;
    return getRoleResource;
  }
}

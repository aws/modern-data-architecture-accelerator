/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { ArnPrincipal, Effect, PolicyStatement, StarPrincipal } from 'aws-cdk-lib/aws-iam';
import { NamespaceConfig, S3TablesAccessPolicyProps } from './s3-tables-l3-construct';
import { getBucketPermissionSetActions, getTablePermissionSetActions, PermissionSet } from './permission-sets';

/**
 * Builds the pair of resource ARNs a bucket-scoped statement must target: the table bucket
 * itself and every table it contains. S3 Tables scopes table-level actions
 * (GetTableData, PutTableData, CreateTable, etc.) to the individual table ARN
 * (`<bucketArn>/table/<id>`), which the bucket ARN alone does not match. Including the
 * `<bucketArn>/table/*` wildcard alongside the bucket ARN mirrors how the AWS S3 Tables
 * CDK grant helpers scope access, so bucket-level grants and the deny-all baseline apply
 * to contained tables as well as bucket-level operations.
 *
 * @param tableBucketArn - The table bucket ARN.
 * @returns The bucket ARN and the contained-tables wildcard ARN.
 */
export function bucketScopeResourceArns(tableBucketArn: string): string[] {
  return [tableBucketArn, `${tableBucketArn}/table/*`];
}

/**
 * Builds the deny-all baseline statement for a table bucket policy.
 * Denies all S3 Tables actions to any principal whose ARN is not in the declared allowlist —
 * the de-duplicated union of the granted principal ARNs and the explicitly exempt principal ARNs
 * (the deploy principals, e.g. the CloudFormation execution role, that must retain access during
 * deploy). This is a single `StringNotLike` on `aws:PrincipalArn` with no account-wide escape:
 * only principals explicitly declared (via grants) or explicitly exempted are allowed through, so
 * every other principal — including undeclared same-account principals — is denied by default.
 *
 * The statement targets both the bucket ARN and the contained-tables wildcard so that
 * table-level actions (which are scoped to table ARNs) are also denied for undeclared principals.
 *
 * @param tableBucketArn - The table bucket ARN to protect (along with its contained tables).
 * @param allPrincipalArns - All principal ARNs that have been granted access (bucket- and table-scope).
 * @param exemptPrincipalArns - Deploy/maintenance principal ARNs that must retain access (e.g. the
 *   CloudFormation execution role); merged into the allowlist so they are not denied.
 * @returns A policy statement denying access to any principal outside the declared/exempt allowlist.
 */
export function buildDenyAllStatement(
  tableBucketArn: string,
  allPrincipalArns: string[],
  exemptPrincipalArns: string[],
): PolicyStatement {
  return new PolicyStatement({
    sid: 'DenyAll',
    effect: Effect.DENY,
    principals: [new StarPrincipal()],
    actions: ['s3tables:*'],
    resources: bucketScopeResourceArns(tableBucketArn),
    conditions: {
      StringNotLike: { 'aws:PrincipalArn': [...new Set([...allPrincipalArns, ...exemptPrincipalArns])] },
    },
  });
}

/**
 * Builds Allow statements for a single access policy grant at a given scope.
 * Produces one statement per non-empty permission level (reader, writer, admin),
 * each granting the fixed least-privilege permission-set actions for the scope.
 *
 * @param policyName - Logical name of the access policy for statement SID generation.
 * @param policy - The resolved access policy with role refs for each level.
 * @param resourceArn - The ARN of the scope: the table bucket ARN for bucket scope, or the
 *   individual table ARN for table scope.
 * @param scope - Whether to use bucket-level or table-level permission set actions.
 * @param roleHelper - Role helper for resolving role refs to ARNs.
 * @returns Array of Allow policy statements for this access policy.
 */
export function buildAllowStatements(
  policyName: string,
  policy: S3TablesAccessPolicyProps,
  resourceArn: string,
  scope: 'bucket' | 'table',
  roleHelper: MdaaRoleHelper,
): PolicyStatement[] {
  const statements: PolicyStatement[] = [];
  const getActions = scope === 'bucket' ? getBucketPermissionSetActions : getTablePermissionSetActions;
  // Bucket-scope statements must target both the bucket ARN and the contained-tables wildcard,
  // since table-level actions (GetTableData, PutTableData, CreateTable, etc.) are scoped to
  // table ARNs. Table-scope statements target the single table ARN.
  const statementResources: string[] = scope === 'bucket' ? bucketScopeResourceArns(resourceArn) : [resourceArn];

  // Build a statement for each non-empty permission level
  const levels: { level: PermissionSet; roleRefs: MdaaRoleRef[]; sidPrefix: string }[] = [
    { level: 'reader', roleRefs: policy.readerRoleRefs, sidPrefix: 'ReaderGrant' },
    { level: 'writer', roleRefs: policy.writerRoleRefs, sidPrefix: 'WriterGrant' },
    { level: 'admin', roleRefs: policy.adminRoleRefs, sidPrefix: 'AdminGrant' },
  ];

  for (const { level, roleRefs, sidPrefix } of levels) {
    if (roleRefs.length === 0) {
      continue;
    }

    const resolvedRoles = roleHelper.resolveRoleRefsWithOrdinals(roleRefs, `${policyName}-${level}`);
    const principals = resolvedRoles.map(r => new ArnPrincipal(r.arn()));

    // Use the fixed least-privilege permission-set actions for the scope
    const actions = getActions(level);

    statements.push(
      new PolicyStatement({
        sid: `${sidPrefix}-${policyName}`,
        effect: Effect.ALLOW,
        principals,
        actions,
        resources: statementResources,
      }),
    );
  }

  return statements;
}

/**
 * Collects the principal ARNs from the access policies referenced by a table bucket.
 * Used to build the deny-all baseline statement.
 *
 * Both bucket-scope and table-scope grantees are gathered: a principal granted access only at the
 * table level must still appear in the bucket deny-all allowlist, otherwise the bucket DenyAll
 * (which targets the contained-tables wildcard) would deny it. This mirrors the table-level
 * traversal in S3TablesL3Construct.collectRoleIds used to build the KMS key policy.
 *
 * The returned array is NOT de-duplicated: a principal referenced by more than one policy appears
 * multiple times. That is fine because the sole consumer, buildDenyAllStatement, de-dupes the union
 * before emitting the condition; callers that need a unique set must de-dupe themselves.
 *
 * @param policyNames - Bucket-level access policy names applied to this bucket.
 * @param accessPolicies - Map of all resolved access policies.
 * @param roleHelper - Role helper for resolving role refs to ARNs.
 * @param namespaces - The bucket's namespaces, so table-level access-policy grantees are included.
 * @returns Array of principal ARNs across the referenced bucket- and table-scope policies (may contain duplicates).
 */
/**
 * Gathers the role refs granted access to a bucket, walking both the bucket-level access policies
 * and every namespace/table's table-level access policies. This is the single structural traversal
 * shared by the two consumers that need it: collectAllPrincipalArns (resolving to principal ARNs
 * for the deny-all baseline) and S3TablesL3Construct.collectRoleIds (resolving to role IDs for the
 * KMS key policy). Keeping the traversal in one place stops the two paths from drifting apart.
 *
 * The returned array is NOT de-duplicated; callers de-dupe after resolving to id()/arn() as needed.
 *
 * @param policyNames - Bucket-level access policy names applied to this bucket.
 * @param accessPolicies - Map of all resolved access policies.
 * @param namespaces - The bucket's namespaces, so table-level access-policy grantees are included.
 * @returns The role refs from the referenced bucket- and table-scope policies (may contain duplicates).
 */
export function collectBucketAndTableRoleRefs(
  policyNames: string[],
  accessPolicies: { [name: string]: S3TablesAccessPolicyProps },
  namespaces?: { [namespaceName: string]: NamespaceConfig },
): MdaaRoleRef[] {
  const allRoleRefs: MdaaRoleRef[] = [];

  const pushPolicyRefs = (name: string): void => {
    const policy = accessPolicies[name];
    if (policy) {
      allRoleRefs.push(...policy.readerRoleRefs, ...policy.writerRoleRefs, ...policy.adminRoleRefs);
    }
  };

  // Bucket-level access policies
  policyNames.forEach(pushPolicyRefs);

  // Table-level access policies (a table-only grantee must also be allowlisted at the bucket)
  Object.values(namespaces ?? {}).forEach(nsConfig => {
    Object.values(nsConfig.tables).forEach(tableConfig => {
      (tableConfig.accessPolicies ?? []).forEach(pushPolicyRefs);
    });
  });

  return allRoleRefs;
}

export function collectAllPrincipalArns(
  policyNames: string[],
  accessPolicies: { [name: string]: S3TablesAccessPolicyProps },
  roleHelper: MdaaRoleHelper,
  namespaces?: { [namespaceName: string]: NamespaceConfig },
): string[] {
  const allRoleRefs = collectBucketAndTableRoleRefs(policyNames, accessPolicies, namespaces);

  if (allRoleRefs.length === 0) {
    return [];
  }

  const resolvedRoles = roleHelper.resolveRoleRefsWithOrdinals(allRoleRefs, 'bucket-policy-principals');
  return resolvedRoles.map(r => r.arn());
}

/**
 * Builds the non-TLS statements for a table bucket policy: the deny-all baseline
 * (always emitted, restricting access to the declared principals plus the deploy-exempt
 * principals only) followed by the Allow statements for each permission level in each
 * referenced access policy.
 *
 * The mandatory deny-non-TLS statement is added by the MdaaTableBucketPolicy L2 construct,
 * so it is intentionally not included here.
 *
 * @param tableBucketArn - The ARN of the table bucket.
 * @param policyNames - Bucket-level access policy names applied to this bucket.
 * @param accessPolicies - Map of all resolved access policies.
 * @param roleHelper - Role helper for resolving role refs to ARNs.
 * @param exemptPrincipalArns - Deploy/maintenance principal ARNs that must retain access during
 *   deploy (e.g. the CloudFormation execution role); merged into the deny-all allowlist.
 * @param namespaces - The bucket's namespaces, so table-scope grantees are added to the allowlist.
 * @returns The statements to pass as additionalStatements to MdaaTableBucketPolicy.
 */
export function buildBucketPolicyStatements(
  tableBucketArn: string,
  policyNames: string[],
  accessPolicies: { [name: string]: S3TablesAccessPolicyProps },
  roleHelper: MdaaRoleHelper,
  exemptPrincipalArns: string[],
  namespaces?: { [namespaceName: string]: NamespaceConfig },
): PolicyStatement[] {
  const statements: PolicyStatement[] = [];

  // Collect all granted principal ARNs (bucket- and table-scope) for the deny-all baseline
  const allPrincipalArns = collectAllPrincipalArns(policyNames, accessPolicies, roleHelper, namespaces);

  // Always emit the deny-all baseline so the control is always-on, not config-conditional.
  // When no principals are granted, the allowlist is just the deploy-exempt principals, so the
  // bucket is locked to only those (e.g. the CloudFormation execution role) and every other
  // same-account principal — even one holding identity-based s3tables permissions — is denied.
  statements.push(buildDenyAllStatement(tableBucketArn, allPrincipalArns, exemptPrincipalArns));

  // Build allow statements for each referenced access policy
  policyNames.forEach(policyName => {
    const policy = accessPolicies[policyName];
    if (policy) {
      statements.push(...buildAllowStatements(policyName, policy, tableBucketArn, 'bucket', roleHelper));
    }
  });

  return statements;
}

/**
 * Builds the non-TLS statements for an individual table policy: the Allow statements for
 * each permission level in each referenced access policy. Table policies do not include a
 * deny-all baseline; access at the table level is through explicit grants only.
 *
 * The mandatory deny-non-TLS statement is added by the MdaaTablePolicy L2 construct.
 *
 * @param tableArn - The ARN of the table.
 * @param policyNames - Access policy names applied to this table.
 * @param accessPolicies - Map of all resolved access policies.
 * @param roleHelper - Role helper for resolving role refs to ARNs.
 * @returns The statements to pass as additionalStatements to MdaaTablePolicy.
 */
export function buildTablePolicyStatements(
  tableArn: string,
  policyNames: string[],
  accessPolicies: { [name: string]: S3TablesAccessPolicyProps },
  roleHelper: MdaaRoleHelper,
): PolicyStatement[] {
  const statements: PolicyStatement[] = [];

  policyNames.forEach(policyName => {
    const policy = accessPolicies[policyName];
    if (policy) {
      statements.push(...buildAllowStatements(policyName, policy, tableArn, 'table', roleHelper));
    }
  });

  return statements;
}

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  buildAllowStatements,
  buildBucketPolicyStatements,
  buildDenyAllStatement,
  buildTablePolicyStatements,
  collectAllPrincipalArns,
} from '../lib/policy-builder';
import { S3TablesAccessPolicyProps } from '../lib/s3-tables-l3-construct';
import { getBucketPermissionSetActions, getTablePermissionSetActions } from '../lib/permission-sets';

const BUCKET_ARN = 'arn:test-partition:s3tables:test-region:test-account:bucket/analytics';
const TABLE_ARN = 'arn:test-partition:s3tables:test-region:test-account:bucket/analytics/table/page-views';
// Bucket-scope statements target the bucket ARN plus the contained-tables wildcard, since
// table-level actions are scoped to individual table ARNs.
const BUCKET_SCOPE_RESOURCES = [BUCKET_ARN, `${BUCKET_ARN}/table/*`];

/**
 * Renders a PolicyStatement to its IAM JSON (PascalCase) shape for assertions. The builders
 * return CDK PolicyStatement objects; their rendered JSON is what actually lands in the
 * synthesized resource policy.
 */
function json(statement: PolicyStatement): { [key: string]: unknown } {
  return statement.toJSON() as { [key: string]: unknown };
}

function roleRef(arn: string): MdaaRoleRef {
  return { arn, id: arn.split('/').pop() };
}

describe('policy-builder', () => {
  const testApp = new MdaaTestApp();
  const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);

  const readerArn = 'arn:test-partition:iam::test-account:role/reader-role';
  const writerArn = 'arn:test-partition:iam::test-account:role/writer-role';
  const adminArn = 'arn:test-partition:iam::test-account:role/admin-role';

  const fullPolicy: S3TablesAccessPolicyProps = {
    name: 'full',
    readerRoleRefs: [roleRef(readerArn)],
    writerRoleRefs: [roleRef(writerArn)],
    adminRoleRefs: [roleRef(adminArn)],
  };

  const emptyPolicy: S3TablesAccessPolicyProps = {
    name: 'empty',
    readerRoleRefs: [],
    writerRoleRefs: [],
    adminRoleRefs: [],
  };

  const exemptArn = 'arn:test-partition:iam::test-account:role/cdk-hnb659fds-cfn-exec-role-test-account-test-region';

  describe('buildDenyAllStatement', () => {
    it('denies every principal outside the declared/exempt allowlist via a single StringNotLike', () => {
      const arns = ['arn:aws:iam::111:role/a', 'arn:aws:iam::222:role/b'];
      const stmt = json(buildDenyAllStatement(BUCKET_ARN, arns, [exemptArn]));
      expect(stmt.Sid).toBe('DenyAll');
      expect(stmt.Effect).toBe('Deny');
      expect(stmt.Action).toBe('s3tables:*');
      // Denies both bucket-level and table-level actions for undeclared principals.
      expect(stmt.Resource).toEqual(BUCKET_SCOPE_RESOURCES);
      // Single StringNotLike over the union of granted + exempt ARNs; no account-wide escape.
      expect(stmt.Condition).toEqual({
        StringNotLike: { 'aws:PrincipalArn': [...arns, exemptArn] },
      });
      expect(stmt.Condition).not.toHaveProperty('StringNotEquals');
    });

    it('de-duplicates ARNs shared between the granted and exempt lists', () => {
      const arns = ['arn:aws:iam::111:role/a', exemptArn];
      const stmt = json(buildDenyAllStatement(BUCKET_ARN, arns, [exemptArn]));
      expect(stmt.Condition).toEqual({
        StringNotLike: { 'aws:PrincipalArn': ['arn:aws:iam::111:role/a', exemptArn] },
      });
    });
  });

  describe('buildAllowStatements', () => {
    it('emits one Allow statement per non-empty level with bucket-scope actions', () => {
      const statements = buildAllowStatements('full', fullPolicy, BUCKET_ARN, 'bucket', roleHelper).map(json);
      expect(statements).toHaveLength(3);
      expect(statements.map(s => s.Sid)).toEqual(['ReaderGrant-full', 'WriterGrant-full', 'AdminGrant-full']);
      expect(statements[0].Effect).toBe('Allow');
      expect(statements[0].Action).toEqual(getBucketPermissionSetActions('reader'));
      expect(statements[0].Principal).toEqual({ AWS: readerArn });
      expect(statements[2].Action).toEqual(getBucketPermissionSetActions('admin'));
      // Bucket-scope grants target the bucket ARN plus the contained-tables wildcard so that
      // table-level actions in the permission set actually apply to the tables.
      expect(statements[0].Resource).toEqual(BUCKET_SCOPE_RESOURCES);
    });

    it('emits table-scope actions scoped to the single table ARN when scope is table', () => {
      const statements = buildAllowStatements('full', fullPolicy, TABLE_ARN, 'table', roleHelper).map(json);
      expect(statements[0].Action).toEqual(getTablePermissionSetActions('reader'));
      expect(statements[0].Resource).toBe(TABLE_ARN);
    });

    it('skips empty permission levels', () => {
      const policy: S3TablesAccessPolicyProps = {
        name: 'reader-only',
        readerRoleRefs: [roleRef(readerArn)],
        writerRoleRefs: [],
        adminRoleRefs: [],
      };
      const statements = buildAllowStatements('reader-only', policy, BUCKET_ARN, 'bucket', roleHelper).map(json);
      expect(statements).toHaveLength(1);
      expect(statements[0].Sid).toBe('ReaderGrant-reader-only');
    });
  });

  describe('collectAllPrincipalArns', () => {
    it('returns empty array when no role refs exist', () => {
      expect(collectAllPrincipalArns(['empty'], { empty: emptyPolicy }, roleHelper)).toEqual([]);
    });

    it('collects principal arns across referenced policies', () => {
      const arns = collectAllPrincipalArns(['full'], { full: fullPolicy }, roleHelper);
      expect(arns).toEqual(expect.arrayContaining([readerArn, writerArn, adminArn]));
    });

    it('ignores policy names that are not defined', () => {
      expect(collectAllPrincipalArns(['missing'], { full: fullPolicy }, roleHelper)).toEqual([]);
    });

    it('includes principals granted only at table scope', () => {
      // 'full' is referenced only at the table level; its principals must still be collected so the
      // bucket deny-all (which targets the contained-tables wildcard) does not deny table-only grantees.
      const namespaces = {
        events: {
          tables: {
            'page-views': {
              schema: { columns: [{ name: 'id', columnType: 'string', required: true }] },
              accessPolicies: ['full'],
            },
          },
        },
      };
      const arns = collectAllPrincipalArns([], { full: fullPolicy }, roleHelper, namespaces);
      expect(arns).toEqual(expect.arrayContaining([readerArn, writerArn, adminArn]));
    });
  });

  describe('buildBucketPolicyStatements', () => {
    it('includes the deny-all baseline and grants when principals exist (no TLS statement)', () => {
      const statements = buildBucketPolicyStatements(BUCKET_ARN, ['full'], { full: fullPolicy }, roleHelper, [
        exemptArn,
      ]).map(json);
      const sids = statements.map(s => s.Sid);
      expect(sids).toContain('DenyAll');
      expect(sids).toContain('ReaderGrant-full');
      // TLS enforcement is owned by the MdaaTableBucketPolicy L2 construct, not this builder.
      expect(sids).not.toContain('DenyNonTLS');
      // The deny-all uses a single StringNotLike over the granted + exempt ARNs (no account escape),
      // and the exempt deploy principal is in the allowlist so CloudFormation is not locked out.
      const denyAll = statements.find(s => s.Sid === 'DenyAll');
      expect(denyAll?.Condition).not.toHaveProperty('StringNotEquals');
      const allowlist = (denyAll?.Condition as { StringNotLike: { 'aws:PrincipalArn': string[] } }).StringNotLike[
        'aws:PrincipalArn'
      ];
      expect(allowlist).toContain(exemptArn);
      expect(allowlist).toContain(readerArn);
    });

    it('adds table-scope grantees to the deny-all allowlist', () => {
      // A principal granted only at the table level must appear in the bucket deny-all allowlist.
      const namespaces = {
        events: {
          tables: {
            'page-views': {
              schema: { columns: [{ name: 'id', columnType: 'string', required: true }] },
              accessPolicies: ['tableOnly'],
            },
          },
        },
      };
      const tableOnlyArn = 'arn:test-partition:iam::999:role/table-only';
      const tableOnly: S3TablesAccessPolicyProps = {
        name: 'tableOnly',
        readerRoleRefs: [roleRef(tableOnlyArn)],
        writerRoleRefs: [],
        adminRoleRefs: [],
      };
      const statements = buildBucketPolicyStatements(
        BUCKET_ARN,
        [],
        { tableOnly },
        roleHelper,
        [exemptArn],
        namespaces,
      ).map(json);
      const denyAll = statements.find(s => s.Sid === 'DenyAll');
      const allowlist = (denyAll?.Condition as { StringNotLike: { 'aws:PrincipalArn': string[] } }).StringNotLike[
        'aws:PrincipalArn'
      ];
      expect(allowlist).toContain(tableOnlyArn);
    });

    it('always emits the deny-all baseline locked to the exempt principals when no grants are declared', () => {
      const statements = buildBucketPolicyStatements(BUCKET_ARN, [], {}, roleHelper, [exemptArn]).map(json);
      const denyAll = statements.find(s => s.Sid === 'DenyAll');
      expect(denyAll).toBeDefined();
      const allowlist = (denyAll?.Condition as { StringNotLike: { 'aws:PrincipalArn': string[] } }).StringNotLike[
        'aws:PrincipalArn'
      ];
      // With no grants, only the deploy-exempt principals are allowlisted; every other principal is denied.
      expect(allowlist).toEqual([exemptArn]);
    });

    it('emits the deny-all baseline when referenced policies have no principals', () => {
      const statements = buildBucketPolicyStatements(BUCKET_ARN, ['empty'], { empty: emptyPolicy }, roleHelper, [
        exemptArn,
      ]).map(json);
      const denyAll = statements.find(s => s.Sid === 'DenyAll');
      expect(denyAll).toBeDefined();
      const allowlist = (denyAll?.Condition as { StringNotLike: { 'aws:PrincipalArn': string[] } }).StringNotLike[
        'aws:PrincipalArn'
      ];
      expect(allowlist).toEqual([exemptArn]);
    });
  });

  describe('buildTablePolicyStatements', () => {
    it('includes allow statements but no deny-all baseline and no TLS statement', () => {
      const statements = buildTablePolicyStatements(TABLE_ARN, ['full'], { full: fullPolicy }, roleHelper).map(json);
      const sids = statements.map(s => s.Sid);
      expect(sids).toContain('ReaderGrant-full');
      expect(sids).not.toContain('DenyAll');
      expect(sids).not.toContain('DenyNonTLS');
    });

    it('ignores undefined policy names', () => {
      expect(buildTablePolicyStatements(TABLE_ARN, ['missing'], { full: fullPolicy }, roleHelper)).toEqual([]);
    });
  });
});

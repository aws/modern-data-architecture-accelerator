/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import {
  IRestrictBucketToRoles,
  IRestrictObjectPrefixToRoles,
  RestrictBucketToRoles,
  RestrictObjectPrefixToRoles,
} from '../lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { ArnPrincipal } from 'aws-cdk-lib/aws-iam';
import { MdaaRoleHelper, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Template } from 'aws-cdk-lib/assertions';

describe('Test BucketPolicy Helper', () => {
  const testApp = new MdaaTestApp();
  const testBucket = Bucket.fromBucketName(testApp.testStack, 'test-bucket', 'test-bucket');
  describe('RestrictPrefix', () => {
    const baseTestProps: IRestrictObjectPrefixToRoles = {
      s3Bucket: testBucket,
      s3Prefix: 'test-prefix',
    };
    test('Read Role Ids', () => {
      const testProps: IRestrictObjectPrefixToRoles = {
        ...baseTestProps,
        readRoleIds: ['test-role-id-1', 'test-role-id-2'],
      };
      const restriction = new RestrictObjectPrefixToRoles(testProps);
      expect(restriction.statements().length).toBe(1);
      expect(restriction.readStatements().length).toBe(1);
      expect(restriction.readWriteSuperStatements().length).toBe(0);
      expect(restriction.readWriteStatements().length).toBe(0);
      expect(restriction.readStatements()[0].actions).toStrictEqual(['s3:GetObject*']);
      expect(restriction.readStatements()[0].conditions).toStrictEqual({
        StringLike: {
          'aws:userId': ['test-role-id-1:*', 'test-role-id-2:*'],
        },
      });
      expect(restriction.readStatements()[0].effect).toBe('Allow');
      expect(restriction.readStatements()[0].resources).toStrictEqual([
        'arn:test-partition:s3:::test-bucket/test-prefix/*',
      ]);
    });

    test('ReadWrite Role Ids', () => {
      const testProps: IRestrictObjectPrefixToRoles = {
        ...baseTestProps,
        readWriteRoleIds: ['test-role-id-1', 'test-role-id-2'],
      };
      const restriction = new RestrictObjectPrefixToRoles(testProps);
      expect(restriction.statements().length).toBe(1);
      expect(restriction.readWriteStatements().length).toBe(1);
      expect(restriction.readStatements().length).toBe(0);
      expect(restriction.readWriteSuperStatements().length).toBe(0);
      expect(restriction.readWriteStatements()[0].actions).toStrictEqual([
        's3:GetObject*',
        's3:PutObject',
        's3:PutObjectTagging',
        's3:DeleteObject',
      ]);
      expect(restriction.readWriteStatements()[0].conditions).toStrictEqual({
        StringLike: {
          'aws:userId': ['test-role-id-1:*', 'test-role-id-2:*'],
        },
      });
    });

    test('ReadWriteSuper Role Ids', () => {
      const testProps: IRestrictObjectPrefixToRoles = {
        ...baseTestProps,
        readWriteSuperRoleIds: ['test-role-id-1', 'test-role-id-2'],
      };
      const restriction = new RestrictObjectPrefixToRoles(testProps);
      expect(restriction.statements().length).toBe(1);
      expect(restriction.readWriteSuperStatements().length).toBe(1);
      expect(restriction.readStatements().length).toBe(0);
      expect(restriction.readWriteStatements().length).toBe(0);
      expect(restriction.readWriteSuperStatements()[0].actions).toStrictEqual([
        's3:GetObject*',
        's3:PutObject',
        's3:PutObjectTagging',
        's3:DeleteObject',
        's3:DeleteObjectVersion',
      ]);
      expect(restriction.readWriteSuperStatements()[0].conditions).toStrictEqual({
        StringLike: {
          'aws:userId': ['test-role-id-1:*', 'test-role-id-2:*'],
        },
      });
    });

    test('Read Principals', () => {
      const testProps: IRestrictObjectPrefixToRoles = {
        ...baseTestProps,
        readPrincipals: [new ArnPrincipal('test-role-arn-1')],
      };
      const restriction = new RestrictObjectPrefixToRoles(testProps);
      expect(restriction.statements().length).toBe(1);
      expect(restriction.readStatements().length).toBe(1);
      expect(restriction.readWriteSuperStatements().length).toBe(0);
      expect(restriction.readWriteStatements().length).toBe(0);
      expect(restriction.readStatements()[0].actions).toStrictEqual(['s3:GetObject*']);
      expect(restriction.readStatements()[0].effect).toBe('Allow');
      expect(restriction.readStatements()[0].resources).toStrictEqual([
        'arn:test-partition:s3:::test-bucket/test-prefix/*',
      ]);
      expect(restriction.readStatements()[0].principals.length).toBe(1);
      expect(JSON.stringify(restriction.readStatements()[0].principals[0])).toStrictEqual(
        JSON.stringify({ AWS: ['test-role-arn-1'] }),
      );
    });

    test('ReadWrite Principals', () => {
      const testProps: IRestrictObjectPrefixToRoles = {
        ...baseTestProps,
        readWritePrincipals: [new ArnPrincipal('test-role-arn-1')],
      };
      const restriction = new RestrictObjectPrefixToRoles(testProps);
      expect(restriction.statements().length).toBe(1);
      expect(restriction.readWriteStatements().length).toBe(1);
      expect(restriction.readStatements().length).toBe(0);
      expect(restriction.readWriteSuperStatements().length).toBe(0);
      expect(restriction.readWriteStatements()[0].actions).toStrictEqual([
        's3:GetObject*',
        's3:PutObject',
        's3:PutObjectTagging',
        's3:DeleteObject',
      ]);
      expect(restriction.readWriteStatements()[0].effect).toBe('Allow');
      expect(restriction.readWriteStatements()[0].resources).toStrictEqual([
        'arn:test-partition:s3:::test-bucket/test-prefix/*',
      ]);
      expect(restriction.readWriteStatements()[0].principals.length).toBe(1);
      expect(JSON.stringify(restriction.readWriteStatements()[0].principals[0])).toStrictEqual(
        JSON.stringify({ AWS: ['test-role-arn-1'] }),
      );
    });

    test('ReadWriteSuper Principals', () => {
      const testProps: IRestrictObjectPrefixToRoles = {
        ...baseTestProps,
        readWriteSuperPrincipals: [new ArnPrincipal('test-role-arn-1')],
      };
      const restriction = new RestrictObjectPrefixToRoles(testProps);
      expect(restriction.statements().length).toBe(1);
      expect(restriction.readStatements().length).toBe(0);
      expect(restriction.readWriteStatements().length).toBe(0);
      expect(restriction.readWriteSuperStatements().length).toBe(1);
      expect(restriction.readWriteSuperStatements()[0].actions).toStrictEqual([
        's3:GetObject*',
        's3:PutObject',
        's3:PutObjectTagging',
        's3:DeleteObject',
        's3:DeleteObjectVersion',
      ]);
      expect(restriction.readWriteSuperStatements()[0].effect).toBe('Allow');
      expect(restriction.readWriteSuperStatements()[0].resources).toStrictEqual([
        'arn:test-partition:s3:::test-bucket/test-prefix/*',
      ]);
      expect(restriction.readWriteSuperStatements()[0].principals.length).toBe(1);
      expect(JSON.stringify(restriction.readWriteSuperStatements()[0].principals[0])).toStrictEqual(
        JSON.stringify({ AWS: ['test-role-arn-1'] }),
      );
    });
  });
  describe('RestrictBucket', () => {
    const baseTestProps: IRestrictBucketToRoles = {
      s3Bucket: testBucket,
      roleExcludeIds: ['test-role-id-1', 'test-role-id-2'],
      principalExcludes: ['test-arn'],
      prefixExcludes: ['exclude-prefix'],
      prefixIncludes: ['exclude-prefix'],
    };
    test('Base Allow', () => {
      const testProps: IRestrictBucketToRoles = {
        ...baseTestProps,
      };
      const restriction = new RestrictBucketToRoles(testProps);
      expect(restriction.allowStatement.actions).toStrictEqual(['s3:List*', 's3:GetBucket*']);
      expect(restriction.allowStatement.effect).toBe('Allow');
      expect(restriction.allowStatement.conditions).toStrictEqual({
        StringLike: {
          'aws:userId': ['test-role-id-1:*', 'test-role-id-2:*'],
        },
      });
      expect(restriction.allowStatement.resources).toStrictEqual([
        'arn:test-partition:s3:::test-bucket/*',
        'arn:test-partition:s3:::test-bucket',
      ]);
    });
    test('Base Deny', () => {
      const testProps: IRestrictBucketToRoles = {
        ...baseTestProps,
      };
      const restriction = new RestrictBucketToRoles(testProps);
      expect(restriction.denyStatement.actions).toStrictEqual(['s3:PutObject*', 's3:GetObject*', 's3:DeleteObject*']);
      expect(restriction.denyStatement.effect).toBe('Deny');
      expect(restriction.denyStatement.conditions).toStrictEqual({
        'ForAnyValue:StringNotLike': {
          'aws:userId': ['test-role-id-1:*', 'test-role-id-2:*'],
          'aws:PrincipalArn': ['test-arn'],
        },
      });
    });

    test('Deny uses resources (not notResources) when no prefixExcludes', () => {
      const testProps: IRestrictBucketToRoles = {
        s3Bucket: testBucket,
        roleExcludeIds: ['test-role-id-1'],
      };
      const restriction = new RestrictBucketToRoles(testProps);
      expect(restriction.denyStatement.resources).toStrictEqual(['arn:test-partition:s3:::test-bucket/*']);
    });

    test('Deny uses notResources when prefixExcludes provided', () => {
      const testProps: IRestrictBucketToRoles = {
        s3Bucket: testBucket,
        roleExcludeIds: ['test-role-id-1'],
        prefixExcludes: ['admin/'],
      };
      const restriction = new RestrictBucketToRoles(testProps);
      expect(restriction.denyStatement.notResources).toStrictEqual(['arn:test-partition:s3:::test-bucket/admin/*']);
    });

    test('Deny uses StringNotLike (not ForAnyValue) when no principalExcludes', () => {
      const testProps: IRestrictBucketToRoles = {
        s3Bucket: testBucket,
        roleExcludeIds: ['test-role-id-1'],
      };
      const restriction = new RestrictBucketToRoles(testProps);
      expect(restriction.denyStatement.conditions).toStrictEqual({
        StringNotLike: {
          'aws:userId': ['test-role-id-1:*'],
        },
      });
    });

    test('Deny defaults resource to bucketArn/* when no prefixIncludes', () => {
      const testProps: IRestrictBucketToRoles = {
        s3Bucket: testBucket,
        roleExcludeIds: ['test-role-id-1'],
        principalExcludes: ['arn:aws:iam::123456789012:role/admin'],
      };
      const restriction = new RestrictBucketToRoles(testProps);
      expect(restriction.denyStatement.resources).toStrictEqual(['arn:test-partition:s3:::test-bucket/*']);
      expect(restriction.denyStatement.conditions).toStrictEqual({
        'ForAnyValue:StringNotLike': {
          'aws:userId': ['test-role-id-1:*'],
          'aws:PrincipalArn': ['arn:aws:iam::123456789012:role/admin'],
        },
      });
    });
  });

  describe('formatS3Prefix', () => {
    const restriction = new RestrictObjectPrefixToRoles({
      s3Bucket: testBucket,
      s3Prefix: 'dummy',
    });

    test('strips leading slash', () => {
      expect(restriction.formatS3Prefix('/leading')).toBe('leading');
    });

    test('strips trailing slash', () => {
      expect(restriction.formatS3Prefix('trailing/')).toBe('trailing');
    });

    test('strips both leading and trailing slashes', () => {
      expect(restriction.formatS3Prefix('/both/')).toBe('both');
    });

    test('handles root prefix /', () => {
      expect(restriction.formatS3Prefix('/')).toBe('');
    });

    test('leaves clean prefix unchanged', () => {
      expect(restriction.formatS3Prefix('data/raw')).toBe('data/raw');
    });
  });

  describe('RestrictPrefix with MdaaResolvableRoles', () => {
    const testApp2 = new MdaaTestApp();
    const testBucket2 = Bucket.fromBucketName(testApp2.testStack, 'test-bucket-roles', 'test-bucket-roles');
    const testRoleHelper = new MdaaRoleHelper(testApp2.testStack, testApp2.naming);

    // Same-account role (id provided directly)
    const sameAccountRole = testRoleHelper.resolveRoleRef({
      refId: 'same-acct',
      id: 'AROA_SAME_ACCOUNT',
    });

    // Cross-account role
    const crossAccountRole = testRoleHelper.resolveRoleRef({
      refId: 'cross-acct',
      arn: 'arn:aws:iam::999999999999:role/CrossAccountRole',
    });

    test('readRoles partitions same-account to roleIds and cross-account to principals', () => {
      const restriction = new RestrictObjectPrefixToRoles({
        s3Bucket: testBucket2,
        s3Prefix: 'data',
        readRoles: [sameAccountRole, crossAccountRole],
      });
      // Should produce 2 statements: one for roleId condition, one for principal
      expect(restriction.readStatements().length).toBe(2);
      expect(restriction.readStatements()[0].conditions).toStrictEqual({
        StringLike: { 'aws:userId': ['AROA_SAME_ACCOUNT:*'] },
      });
      expect(restriction.readStatements()[1].principals.length).toBe(1);
    });

    test('readWriteRoles partitions correctly', () => {
      const restriction = new RestrictObjectPrefixToRoles({
        s3Bucket: testBucket2,
        s3Prefix: 'data',
        readWriteRoles: [sameAccountRole, crossAccountRole],
      });
      // These statements grant write and delete, so the principal each one resolves to is asserted
      // rather than only the statement count.
      expect(restriction.readWriteStatements().length).toBe(2);
      expect(restriction.readWriteStatements()[0].conditions).toStrictEqual({
        StringLike: { 'aws:userId': ['AROA_SAME_ACCOUNT:*'] },
      });
      expect(JSON.stringify(restriction.readWriteStatements()[1].principals)).toStrictEqual(
        JSON.stringify([{ AWS: ['arn:aws:iam::999999999999:role/CrossAccountRole'] }]),
      );
      expect(restriction.readWriteStatements()[1].conditions).toStrictEqual({});
    });

    test('readWriteSuperRoles partitions correctly', () => {
      const restriction = new RestrictObjectPrefixToRoles({
        s3Bucket: testBucket2,
        s3Prefix: 'data',
        readWriteSuperRoles: [sameAccountRole, crossAccountRole],
      });
      expect(restriction.readWriteSuperStatements().length).toBe(2);
      expect(restriction.readWriteSuperStatements()[0].conditions).toStrictEqual({
        StringLike: { 'aws:userId': ['AROA_SAME_ACCOUNT:*'] },
      });
      expect(JSON.stringify(restriction.readWriteSuperStatements()[1].principals)).toStrictEqual(
        JSON.stringify([{ AWS: ['arn:aws:iam::999999999999:role/CrossAccountRole'] }]),
      );
      expect(restriction.readWriteSuperStatements()[1].conditions).toStrictEqual({});
    });

    test('explicit role ids and principals are merged with the partitioned roles', () => {
      // An L3 may pass a role id it already holds alongside resolvable roles. Both sources have to
      // land in the same statements, otherwise one set of grants is silently dropped.
      const restriction = new RestrictObjectPrefixToRoles({
        s3Bucket: testBucket2,
        s3Prefix: 'data',
        readRoleIds: ['AROA_EXPLICIT'],
        readPrincipals: [new ArnPrincipal('arn:aws:iam::777777777777:role/ExplicitPrincipal')],
        readRoles: [sameAccountRole, crossAccountRole],
      });
      expect(restriction.readStatements().length).toBe(2);
      expect(restriction.readStatements()[0].conditions).toStrictEqual({
        StringLike: { 'aws:userId': ['AROA_EXPLICIT:*', 'AROA_SAME_ACCOUNT:*'] },
      });
      expect(JSON.stringify(restriction.readStatements()[1].principals)).toStrictEqual(
        JSON.stringify([
          { AWS: ['arn:aws:iam::777777777777:role/ExplicitPrincipal'] },
          { AWS: ['arn:aws:iam::999999999999:role/CrossAccountRole'] },
        ]),
      );
    });

    test('explicit read/write ids and principals are merged with the partitioned roles', () => {
      const restriction = new RestrictObjectPrefixToRoles({
        s3Bucket: testBucket2,
        s3Prefix: 'data',
        readWriteRoleIds: ['AROA_EXPLICIT_RW'],
        readWritePrincipals: [new ArnPrincipal('arn:aws:iam::777777777777:role/ExplicitRwPrincipal')],
        readWriteRoles: [sameAccountRole, crossAccountRole],
        readWriteSuperRoleIds: ['AROA_EXPLICIT_RWS'],
        readWriteSuperPrincipals: [new ArnPrincipal('arn:aws:iam::777777777777:role/ExplicitRwsPrincipal')],
        readWriteSuperRoles: [sameAccountRole, crossAccountRole],
      });
      expect(restriction.readWriteStatements()[0].conditions).toStrictEqual({
        StringLike: { 'aws:userId': ['AROA_EXPLICIT_RW:*', 'AROA_SAME_ACCOUNT:*'] },
      });
      expect(JSON.stringify(restriction.readWriteStatements()[1].principals)).toStrictEqual(
        JSON.stringify([
          { AWS: ['arn:aws:iam::777777777777:role/ExplicitRwPrincipal'] },
          { AWS: ['arn:aws:iam::999999999999:role/CrossAccountRole'] },
        ]),
      );
      expect(restriction.readWriteSuperStatements()[0].conditions).toStrictEqual({
        StringLike: { 'aws:userId': ['AROA_EXPLICIT_RWS:*', 'AROA_SAME_ACCOUNT:*'] },
      });
      expect(JSON.stringify(restriction.readWriteSuperStatements()[1].principals)).toStrictEqual(
        JSON.stringify([
          { AWS: ['arn:aws:iam::777777777777:role/ExplicitRwsPrincipal'] },
          { AWS: ['arn:aws:iam::999999999999:role/CrossAccountRole'] },
        ]),
      );
    });
  });

  describe('RestrictBucket with MdaaResolvableRoles', () => {
    const testApp3 = new MdaaTestApp();
    const testBucket3 = Bucket.fromBucketName(testApp3.testStack, 'test-bucket-excludes', 'test-bucket-excludes');
    const testRoleHelper = new MdaaRoleHelper(testApp3.testStack, testApp3.naming);

    const sameAccountRole = testRoleHelper.resolveRoleRef({
      refId: 'same-excl',
      id: 'AROA_SAME_EXCLUDE',
    });

    const crossAccountRole = testRoleHelper.resolveRoleRef({
      refId: 'cross-excl',
      arn: 'arn:aws:iam::888888888888:role/CrossExcludeRole',
    });

    test('roleExcludes adds cross-account ARNs to principalExcludes in deny', () => {
      const restriction = new RestrictBucketToRoles({
        s3Bucket: testBucket3,
        roleExcludeIds: ['AROA_BASE'],
        roleExcludes: [sameAccountRole, crossAccountRole],
      });
      // Deny should have both aws:userId and aws:PrincipalArn conditions
      expect(restriction.denyStatement.conditions).toStrictEqual({
        'ForAnyValue:StringNotLike': {
          'aws:userId': ['AROA_BASE:*', 'AROA_SAME_EXCLUDE:*'],
          'aws:PrincipalArn': ['arn:aws:iam::888888888888:role/CrossExcludeRole'],
        },
      });
    });

    test('same-account allow grants only the merged role ids via aws:userId', () => {
      const restriction = new RestrictBucketToRoles({
        s3Bucket: testBucket3,
        roleExcludeIds: ['AROA_BASE'],
        roleExcludes: [sameAccountRole, crossAccountRole],
      });
      expect(restriction.allowStatement.conditions).toStrictEqual({
        StringLike: { 'aws:userId': ['AROA_BASE:*', 'AROA_SAME_EXCLUDE:*'] },
      });
    });

    test('cross-account roles are granted bucket-level access by ARN principal', () => {
      const restriction = new RestrictBucketToRoles({
        s3Bucket: testBucket3,
        roleExcludeIds: ['AROA_BASE'],
        roleExcludes: [sameAccountRole, crossAccountRole],
      });
      // A cross-account role cannot satisfy the aws:userId condition on the same-account allow
      // statement, so without this companion statement it would be excluded from the deny but
      // never granted s3:List*/s3:GetBucket*, leaving bucket listing broken.
      const crossAccountAllow = restriction.crossAccountAllowStatement;
      expect(crossAccountAllow).toBeDefined();
      expect(crossAccountAllow?.actions).toStrictEqual(['s3:List*', 's3:GetBucket*']);
      expect(crossAccountAllow?.effect).toBe('Allow');
      expect(crossAccountAllow?.conditions).toStrictEqual({});
      expect(crossAccountAllow?.resources).toStrictEqual([
        'arn:test-partition:s3:::test-bucket-excludes/*',
        'arn:test-partition:s3:::test-bucket-excludes',
      ]);
      expect(JSON.stringify(crossAccountAllow?.principals)).toStrictEqual(
        JSON.stringify([{ AWS: ['arn:aws:iam::888888888888:role/CrossExcludeRole'] }]),
      );
    });

    test('allowStatements returns both allow statements when a cross-account role is present', () => {
      const restriction = new RestrictBucketToRoles({
        s3Bucket: testBucket3,
        roleExcludeIds: ['AROA_BASE'],
        roleExcludes: [sameAccountRole, crossAccountRole],
      });
      expect(restriction.allowStatements()).toStrictEqual([
        restriction.allowStatement,
        restriction.crossAccountAllowStatement,
      ]);
    });

    test('no cross-account allow statement is emitted for same-account roles only', () => {
      const restriction = new RestrictBucketToRoles({
        s3Bucket: testBucket3,
        roleExcludeIds: ['AROA_BASE'],
        roleExcludes: [sameAccountRole],
      });
      expect(restriction.crossAccountAllowStatement).toBeUndefined();
      expect(restriction.allowStatements()).toStrictEqual([restriction.allowStatement]);
    });

    test('roleExcludeIds may be omitted when every exclude is a resolved role', () => {
      // Callers which resolve all of their excludes have nothing to pass here, and an empty array
      // left behind reads as though a second source of excludes is still in play.
      const restriction = new RestrictBucketToRoles({
        s3Bucket: testBucket3,
        roleExcludes: [sameAccountRole, crossAccountRole],
      });
      expect(restriction.allowStatement.conditions).toStrictEqual({
        StringLike: { 'aws:userId': ['AROA_SAME_EXCLUDE:*'] },
      });
      expect(restriction.denyStatement.conditions).toStrictEqual({
        'ForAnyValue:StringNotLike': {
          'aws:userId': ['AROA_SAME_EXCLUDE:*'],
          'aws:PrincipalArn': ['arn:aws:iam::888888888888:role/CrossExcludeRole'],
        },
      });
    });

    test('deny omits aws:userId entirely when every exclude is cross-account', () => {
      // ForAnyValue over an empty list never matches, and the keys of one operator block are ANDed,
      // so leaving 'aws:userId': [] here would make the deny unsatisfiable and drop the bucket-level
      // default deny for every same-account principal.
      const restriction = new RestrictBucketToRoles({
        s3Bucket: testBucket3,
        roleExcludes: [crossAccountRole],
      });
      expect(restriction.denyStatement.conditions).toStrictEqual({
        StringNotLike: {
          'aws:PrincipalArn': ['arn:aws:iam::888888888888:role/CrossExcludeRole'],
        },
      });
    });

    test('allowStatements returns only the cross-account statement when every exclude is cross-account', () => {
      const restriction = new RestrictBucketToRoles({
        s3Bucket: testBucket3,
        roleExcludes: [crossAccountRole],
      });
      expect(restriction.allowStatements()).toStrictEqual([restriction.crossAccountAllowStatement]);
    });

    test('deny still constrains on an empty aws:userId list when nothing at all is excluded', () => {
      // Base behaviour of the helper when it is handed no excludes: the deny applies to everyone.
      const restriction = new RestrictBucketToRoles({
        s3Bucket: testBucket3,
      });
      expect(restriction.denyStatement.conditions).toStrictEqual({
        StringNotLike: {
          'aws:userId': [],
        },
      });
      expect(restriction.allowStatements()).toStrictEqual([]);
    });
  });

  describe('RestrictBucket rendered bucket policy', () => {
    // The empty aws:userId list slipped through because nothing in this suite ever looked at a
    // synthesized template. These cases assert on the rendered conditions instead of the
    // PolicyStatement objects.
    const crossAccountRoleRef: MdaaRoleRef = { arn: 'arn:test-partition:iam::999999999999:role/CrossAccountX' };
    const sameAccountRoleRef: MdaaRoleRef = {
      arn: 'arn:test-partition:iam::test-account:role/LocalX',
      id: 'AROA_LOCAL_X',
    };

    /** Synthesizes a bucket policy from the helper's statements, keyed by statement Sid. */
    const renderStatements = (roleRefs: MdaaRoleRef[]): { [sid: string]: { [key: string]: unknown } } => {
      const app = new MdaaTestApp();
      const roleHelper = new MdaaRoleHelper(app.testStack, app.naming);
      const bucket = new Bucket(app.testStack, 'rendered-bucket');
      const restriction = new RestrictBucketToRoles({
        s3Bucket: bucket,
        roleExcludes: roleHelper.resolveRoleRefsWithOrdinals(roleRefs, 'rendered'),
      });
      bucket.addToResourcePolicy(restriction.denyStatement);
      restriction.allowStatements().forEach(statement => bucket.addToResourcePolicy(statement));
      const policies = Template.fromStack(app.testStack).findResources('AWS::S3::BucketPolicy');
      const statements = Object.values(policies)[0].Properties.PolicyDocument.Statement;
      return Object.fromEntries(statements.map((statement: { Sid: string }) => [statement.Sid, statement]));
    };

    test('all excludes cross-account renders a deny on aws:PrincipalArn only', () => {
      const statements = renderStatements([crossAccountRoleRef]);
      expect(statements['BucketDeny'].Condition).toStrictEqual({
        StringNotLike: { 'aws:PrincipalArn': ['arn:test-partition:iam::999999999999:role/CrossAccountX'] },
      });
    });

    test('all excludes cross-account renders only the cross-account allow', () => {
      const statements = renderStatements([crossAccountRoleRef]);
      expect(Object.keys(statements).sort()).toStrictEqual(['BucketAllowCrossAccount', 'BucketDeny']);
    });

    test('mixed excludes render a deny on both condition keys', () => {
      const statements = renderStatements([sameAccountRoleRef, crossAccountRoleRef]);
      expect(statements['BucketDeny'].Condition).toStrictEqual({
        'ForAnyValue:StringNotLike': {
          'aws:userId': ['AROA_LOCAL_X:*'],
          'aws:PrincipalArn': ['arn:test-partition:iam::999999999999:role/CrossAccountX'],
        },
      });
    });

    test('mixed excludes render both allow statements', () => {
      const statements = renderStatements([sameAccountRoleRef, crossAccountRoleRef]);
      expect(Object.keys(statements).sort()).toStrictEqual(['BucketAllow', 'BucketAllowCrossAccount', 'BucketDeny']);
    });

    test('same-account excludes render a deny on aws:userId only', () => {
      const statements = renderStatements([sameAccountRoleRef]);
      expect(statements['BucketDeny'].Condition).toStrictEqual({
        StringNotLike: { 'aws:userId': ['AROA_LOCAL_X:*'] },
      });
      expect(Object.keys(statements).sort()).toStrictEqual(['BucketAllow', 'BucketDeny']);
    });
  });
});

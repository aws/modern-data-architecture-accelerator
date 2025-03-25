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
      // console.log( JSON.stringify( restriction.statements()[ 0 ], undefined, 2 ) )
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
      // console.log( JSON.stringify( restriction.statements()[ 0 ], undefined, 2 ) )
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
      // console.log( JSON.stringify( restriction.statements()[ 0 ], undefined, 2 ) )
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
      // console.log( JSON.stringify( restriction.statements()[ 0 ], undefined, 2 ) )
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
      // console.log( JSON.stringify( restriction.statements()[ 0 ], undefined, 2 ) )
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
      // console.log( JSON.stringify( restriction.statements()[ 0 ], undefined, 2 ) )
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
      console.log(JSON.stringify(restriction.allowStatement, undefined, 2));
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
      console.log(JSON.stringify(restriction.denyStatement, undefined, 2));
      expect(restriction.denyStatement.actions).toStrictEqual(['s3:PutObject*', 's3:GetObject*', 's3:DeleteObject*']);
      expect(restriction.denyStatement.effect).toBe('Deny');
      expect(restriction.denyStatement.conditions).toStrictEqual({
        'ForAnyValue:StringNotLike': {
          'aws:userId': ['test-role-id-1:*', 'test-role-id-2:*'],
          'aws:PrincipalArn': ['test-arn'],
        },
      });
    });
  });
});

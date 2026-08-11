/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { PermissionSet, getBucketPermissionSetActions, getTablePermissionSetActions } from '../lib/permission-sets';

describe('permission-sets', () => {
  describe('getBucketPermissionSetActions', () => {
    it('returns correct reader actions at bucket scope', () => {
      const actions = getBucketPermissionSetActions('reader');
      expect(actions).toEqual([
        's3tables:GetTable',
        's3tables:GetTableData',
        's3tables:GetTableMetadataLocation',
        's3tables:GetNamespace',
        's3tables:GetTableBucket',
        's3tables:ListTables',
        's3tables:ListNamespaces',
      ]);
    });

    it('returns writer actions that include all reader actions at bucket scope', () => {
      const readerActions = getBucketPermissionSetActions('reader');
      const writerActions = getBucketPermissionSetActions('writer');

      for (const action of readerActions) {
        expect(writerActions).toContain(action);
      }
      expect(writerActions).toContain('s3tables:PutTableData');
      expect(writerActions).toContain('s3tables:UpdateTableMetadataLocation');
    });

    it('returns admin actions that include all writer actions at bucket scope', () => {
      const writerActions = getBucketPermissionSetActions('writer');
      const adminActions = getBucketPermissionSetActions('admin');

      for (const action of writerActions) {
        expect(adminActions).toContain(action);
      }
      expect(adminActions).toContain('s3tables:CreateTable');
      expect(adminActions).toContain('s3tables:DeleteTable');
      expect(adminActions).toContain('s3tables:RenameTable');
      expect(adminActions).toContain('s3tables:CreateNamespace');
      expect(adminActions).toContain('s3tables:DeleteNamespace');
      // Policy-write actions are intentionally excluded so admins cannot replace the resource
      // policy and strip the non-configurable deny-non-TLS / deny-all controls.
      expect(adminActions).not.toContain('s3tables:PutTablePolicy');
      expect(adminActions).not.toContain('s3tables:PutTableBucketPolicy');
    });

    it('returns a new array copy each time', () => {
      const first = getBucketPermissionSetActions('reader');
      const second = getBucketPermissionSetActions('reader');
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
    });
  });

  describe('getTablePermissionSetActions', () => {
    it('returns correct reader actions at table scope', () => {
      const actions = getTablePermissionSetActions('reader');
      expect(actions).toEqual(['s3tables:GetTable', 's3tables:GetTableData', 's3tables:GetTableMetadataLocation']);
    });

    it('returns writer actions that include all reader actions at table scope', () => {
      const readerActions = getTablePermissionSetActions('reader');
      const writerActions = getTablePermissionSetActions('writer');

      for (const action of readerActions) {
        expect(writerActions).toContain(action);
      }
      expect(writerActions).toContain('s3tables:PutTableData');
      expect(writerActions).toContain('s3tables:UpdateTableMetadataLocation');
    });

    it('returns admin actions that include all writer actions at table scope', () => {
      const writerActions = getTablePermissionSetActions('writer');
      const adminActions = getTablePermissionSetActions('admin');

      for (const action of writerActions) {
        expect(adminActions).toContain(action);
      }
      expect(adminActions).toContain('s3tables:DeleteTable');
      expect(adminActions).toContain('s3tables:RenameTable');
      // Policy-write is intentionally excluded so table admins cannot replace the table policy
      // and strip the non-configurable deny-non-TLS control.
      expect(adminActions).not.toContain('s3tables:PutTablePolicy');
    });

    it('returns a new array copy each time', () => {
      const first = getTablePermissionSetActions('writer');
      const second = getTablePermissionSetActions('writer');
      expect(first).toEqual(second);
      expect(first).not.toBe(second);
    });
  });

  describe('scope differences', () => {
    it('bucket reader has more actions than table reader', () => {
      const bucketReader = getBucketPermissionSetActions('reader');
      const tableReader = getTablePermissionSetActions('reader');
      expect(bucketReader.length).toBeGreaterThan(tableReader.length);
    });

    it('bucket admin has more actions than table admin', () => {
      const bucketAdmin = getBucketPermissionSetActions('admin');
      const tableAdmin = getTablePermissionSetActions('admin');
      expect(bucketAdmin.length).toBeGreaterThan(tableAdmin.length);
    });

    it('table reader actions are a subset of bucket reader actions', () => {
      const bucketReader = getBucketPermissionSetActions('reader');
      const tableReader = getTablePermissionSetActions('reader');
      for (const action of tableReader) {
        expect(bucketReader).toContain(action);
      }
    });
  });

  describe('type safety', () => {
    it('accepts all valid permission set values', () => {
      const validSets: PermissionSet[] = ['reader', 'writer', 'admin'];
      for (const ps of validSets) {
        expect(() => getBucketPermissionSetActions(ps)).not.toThrow();
        expect(() => getTablePermissionSetActions(ps)).not.toThrow();
      }
    });
  });
});

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Database } from '@aws-cdk/aws-glue-alpha';
import { InventoryHelper } from '../lib';

describe('InventoryHelper', () => {
  describe('createInvConfig', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const destinationBucket = Bucket.fromBucketName(stack, 'dest-bucket', 'inventory-dest-bucket');

    test('creates inventory config with required params only', () => {
      const config = InventoryHelper.createInvConfig(destinationBucket, 'test-inventory');

      expect(config.inventoryId).toBe('test-inventory');
      expect(config.destination.bucket).toBe(destinationBucket);
      expect(config.format).toBeDefined();
      expect(config.frequency).toBeDefined();
      expect(config.includeObjectVersions).toBeDefined();
      expect(config.optionalFields).toBeDefined();
      expect(config.optionalFields!.length).toBeGreaterThan(0);
    });

    test('creates inventory config with all optional params', () => {
      const config = InventoryHelper.createInvConfig(
        destinationBucket,
        'full-inventory',
        'source-prefix/',
        'dest-prefix/',
        '123456789012',
      );

      expect(config.inventoryId).toBe('full-inventory');
      expect(config.destination.bucketOwner).toBe('123456789012');
    });

    test('creates inventory config without destination account', () => {
      const config = InventoryHelper.createInvConfig(destinationBucket, 'no-account-inv', 'prefix/');

      expect(config.destination.bucketOwner).toBeUndefined();
    });
  });

  describe('createGlueInvTable', () => {
    test('creates Glue table with location prefix', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      const database = new Database(stack, 'test-db', { databaseName: 'testdb' });

      InventoryHelper.createGlueInvTable(
        stack,
        'test-account-id',
        'test-table',
        database,
        'location-bucket',
        [
          { bucketName: 'source-bucket-1', inventoryName: 'inv-1' },
          { bucketName: 'source-bucket-2', inventoryName: 'inv-2' },
        ],
        'inventory-data/',
      );

      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::Glue::Table', 1);
      template.hasResourceProperties('AWS::Glue::Table', {
        CatalogId: 'test-account-id',
        DatabaseName: Match.anyValue(),
        TableInput: {
          Name: 'test_table_inv',
          TableType: 'EXTERNAL_TABLE',
          Parameters: Match.objectLike({
            EXTERNAL: 'TRUE',
            'projection.enabled': 'true',
            'projection.bucket_inventory.type': 'enum',
            'projection.bucket_inventory.values': 'source-bucket-1/inv-1,source-bucket-2/inv-2',
          }),
        },
      });
    });

    test('creates Glue table without location prefix', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      const database = new Database(stack, 'test-db', { databaseName: 'testdb' });

      InventoryHelper.createGlueInvTable(stack, 'catalog-id', 'my-prefix', database, 'my-bucket', [
        { bucketName: 'bucket-a', inventoryName: 'daily' },
      ]);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Glue::Table', {
        TableInput: {
          Name: 'my_prefix_inv',
        },
      });
    });

    test('table name replaces hyphens with underscores', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      const database = new Database(stack, 'test-db', { databaseName: 'testdb' });

      InventoryHelper.createGlueInvTable(stack, 'catalog-id', 'my-hyphenated-name', database, 'bucket', [
        { bucketName: 'b', inventoryName: 'i' },
      ]);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Glue::Table', {
        TableInput: {
          Name: 'my_hyphenated_name_inv',
        },
      });
    });
  });

  describe('createInventoryBucketPolicyStatement', () => {
    test('creates policy statement without source bucket ARN or prefix', () => {
      const statement = InventoryHelper.createInventoryBucketPolicyStatement(
        'arn:aws:s3:::dest-bucket',
        '111122223333',
      );

      expect(statement.sid).toBe('AllowS3Inventory');
      expect(statement.effect).toBe('Allow');
      expect(statement.actions).toStrictEqual(['s3:PutObject']);
      expect(statement.resources).toStrictEqual(['arn:aws:s3:::dest-bucket/*']);
      expect(statement.conditions).toStrictEqual({
        StringEquals: {
          'aws:SourceAccount': '111122223333',
          's3:x-amz-acl': 'bucket-owner-full-control',
        },
      });
    });

    test('creates policy statement with source bucket ARN', () => {
      const statement = InventoryHelper.createInventoryBucketPolicyStatement(
        'arn:aws:s3:::dest-bucket',
        '111122223333',
        'arn:aws:s3:::source-bucket',
      );

      expect(statement.conditions).toStrictEqual({
        StringEquals: {
          'aws:SourceAccount': '111122223333',
          's3:x-amz-acl': 'bucket-owner-full-control',
        },
        ArnLike: {
          'aws:SourceArn': 'arn:aws:s3:::source-bucket',
        },
      });
    });

    test('creates policy statement with inventory prefix', () => {
      const statement = InventoryHelper.createInventoryBucketPolicyStatement(
        'arn:aws:s3:::dest-bucket',
        '111122223333',
        undefined,
        'inventory/',
      );

      expect(statement.resources[0]).toContain('inventory');
    });

    test('includes s3 service principal', () => {
      const statement = InventoryHelper.createInventoryBucketPolicyStatement(
        'arn:aws:s3:::dest-bucket',
        '111122223333',
      );

      expect(statement.principals.length).toBe(1);
      expect(JSON.stringify(statement.principals[0])).toContain('s3.amazonaws.com');
    });
  });
});

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaTable } from '../lib';

const BUCKET_ARN = 'arn:test-partition:s3tables:test-region:test-account:bucket/analytics';

describe('MdaaTable compliance', () => {
  const testApp = new MdaaTestApp();

  new MdaaTable(testApp.testStack, 'test-table', {
    tableBucketArn: BUCKET_ARN,
    namespaceName: 'events',
    tableName: 'page-views',
    columns: [
      { name: 'event_id', columnType: 'string', required: true },
      { name: 'event_timestamp', columnType: 'timestamptz', required: true },
    ],
    partitions: [{ column: 'event_timestamp', transform: 'day' }],
    sortOrder: [{ column: 'event_timestamp', direction: 'DESC', nullOrder: 'nulls-last' }],
    naming: testApp.naming,
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('synthesizes a compliant Iceberg Table resource', () => {
    template.hasResourceProperties('AWS::S3Tables::Table', {
      OpenTableFormat: 'ICEBERG',
    });
  });
});

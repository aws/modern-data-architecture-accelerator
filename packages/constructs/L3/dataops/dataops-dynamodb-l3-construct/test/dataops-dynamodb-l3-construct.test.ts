/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { App, Stack } from 'aws-cdk-lib';
import { AttributeType } from 'aws-cdk-lib/aws-dynamodb';
import { MdaaDefaultResourceNaming } from '@aws-mdaa/naming';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { DynamodbL3Construct, DynamodbL3ConstructProps } from '../lib';

describe('DynamodbL3Construct Constructor Exception Scenarios', () => {
  let app: App;
  let stack: Stack;

  beforeEach(() => {
    app = new App();
    stack = new Stack(app, 'TestStack');
  });

  test('should throw error when kmsArn is not provided', () => {
    const props: DynamodbL3ConstructProps = {
      projectName: 'test-project',
      naming: new MdaaDefaultResourceNaming({
        cdkNode: app.node,
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
        moduleName: 'test-module',
      }),
      roleHelper: {} as MdaaRoleHelper,
      tableDefinitions: {
        'test-table': {
          partitionKey: { name: 'id', type: AttributeType.STRING },
        },
      },
    };

    expect(() => {
      new DynamodbL3Construct(stack, 'TestDynamodb', props);
    }).toThrow('Project KMS ARN is required for DynamoDB L3 construct');
  });

  test('should throw error when kmsArn is empty string', () => {
    const props: DynamodbL3ConstructProps = {
      projectName: 'test-project',
      kmsArn: '',
      naming: new MdaaDefaultResourceNaming({
        cdkNode: app.node,
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
        moduleName: 'test-module',
      }),
      roleHelper: {} as MdaaRoleHelper,
      tableDefinitions: {
        'test-table': {
          partitionKey: { name: 'id', type: AttributeType.STRING },
        },
      },
    };

    expect(() => {
      new DynamodbL3Construct(stack, 'TestDynamodb', props);
    }).toThrow('Project KMS ARN is required for DynamoDB L3 construct');
  });

  test('should work when projectName is undefined', () => {
    const props: DynamodbL3ConstructProps = {
      projectName: undefined,
      kmsArn: 'arn:test-partition:kms:test-region:test-account:key/test-key-id',
      naming: new MdaaDefaultResourceNaming({
        cdkNode: app.node,
        org: 'test-org',
        env: 'test-env',
        domain: 'test-domain',
        moduleName: 'test-module',
      }),
      roleHelper: {} as MdaaRoleHelper,
      tableDefinitions: {
        'test-table': {
          partitionKey: { name: 'id', type: AttributeType.STRING },
        },
      },
    };

    expect(() => {
      new DynamodbL3Construct(stack, 'TestDynamodb-no-project', props);
    }).not.toThrow();
  });
});

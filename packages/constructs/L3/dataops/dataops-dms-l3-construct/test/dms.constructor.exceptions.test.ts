/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { DMSL3Construct, DMSL3ConstructProps } from '../lib';

describe('DMSL3Construct Constructor Exception Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const baseProps: DMSL3ConstructProps = {
    projectName: 'test-project',
    projectBucket: 'test-project-bucket',
    kmsArn: 'arn:test-partition:kms:test-region:test-account:key/testing-key-id',
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    dms: {},
  };

  test('throws error when kmsArn is undefined', () => {
    const props = { ...baseProps, kmsArn: undefined };

    expect(() => {
      new DMSL3Construct(stack, 'test-construct-1', props);
    }).toThrow('Please provide kmsArn');
  });

  test('throws error when projectBucket is undefined', () => {
    const props = { ...baseProps, projectBucket: undefined };

    expect(() => {
      new DMSL3Construct(stack, 'test-construct-2', props);
    }).toThrow('Please provide projectBucket');
  });
});

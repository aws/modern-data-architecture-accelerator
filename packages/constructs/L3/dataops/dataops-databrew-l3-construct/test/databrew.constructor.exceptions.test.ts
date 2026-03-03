/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { DataBrewL3Construct, DataBrewL3ConstructProps } from '../lib';

describe('DataBrewL3Construct Constructor Exception Tests', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('should work when projectName is undefined', () => {
    const constructProps: DataBrewL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      projectName: undefined,
      recipes: {
        'test-recipe': {
          steps: JSON.stringify([
            {
              Action: {
                Operation: 'RENAME',
                Parameters: {
                  sourceColumn: 'id',
                  targetColumn: 'employee_id',
                },
              },
            },
          ]),
        },
      },
    };

    expect(() => {
      new DataBrewL3Construct(testApp.testStack, 'test-construct-no-project', constructProps);
    }).not.toThrow();
  });
});

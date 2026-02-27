/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataOpsProjectConfigParser } from '../lib/dataops-project-config';

describe('DataOpsProjectConfigParser', () => {
  test('class is defined', () => {
    expect(DataOpsProjectConfigParser).toBeDefined();
  });

  test('class is constructable', () => {
    expect(typeof DataOpsProjectConfigParser).toBe('function');
  });
});

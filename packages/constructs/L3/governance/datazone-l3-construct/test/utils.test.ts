/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { flattenDomainUnitPaths } from '../lib/utils';

describe('MDAA Compliance Stack Tests', () => {
  test('flattenDomainUnitPaths', () => {
    const domainUnitIds = flattenDomainUnitPaths('domainUnit', {
      test1: { id: 'test-id1', domainUnits: { test2: { id: 'test-id2' } } },
    });
    expect(domainUnitIds).toStrictEqual({
      'domainUnit/test1': 'test-id1',
      'domainUnit/test1/test2': 'test-id2',
    });
  });
  test('flattenDomainUnitPaths no child', () => {
    const domainUnitIds = flattenDomainUnitPaths('domainUnit', {
      test1: { id: 'test-id1' },
    });
    expect(domainUnitIds).toStrictEqual({
      'domainUnit/test1': 'test-id1',
    });
  });
});

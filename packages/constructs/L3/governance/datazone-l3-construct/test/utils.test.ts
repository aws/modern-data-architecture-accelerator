/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { flattenDomainUnitPaths } from '../lib/utils';

describe('MDAA Compliance Stack Tests', () => {
  test('flattenDomainUnitPaths', () => {
    const mockConstruct1 = { domainUnitId: 'test-id1' } as any;
    const mockConstruct2 = { domainUnitId: 'test-id2' } as any;

    const domainUnitIds = flattenDomainUnitPaths('/root/domainUnit', {
      test1: { construct: mockConstruct1, domainUnits: { test2: { construct: mockConstruct2 } } },
    });
    expect(domainUnitIds).toStrictEqual({
      '/root/domainUnit/test1': 'test-id1',
      '/root/domainUnit/test1/test2': 'test-id2',
    });
  });
  test('flattenDomainUnitPaths no child', () => {
    const mockConstruct = { domainUnitId: 'test-id1' } as any;

    const domainUnitIds = flattenDomainUnitPaths('/root/domainUnit', {
      test1: { construct: mockConstruct },
    });
    expect(domainUnitIds).toStrictEqual({
      '/root/domainUnit/test1': 'test-id1',
    });
  });
});

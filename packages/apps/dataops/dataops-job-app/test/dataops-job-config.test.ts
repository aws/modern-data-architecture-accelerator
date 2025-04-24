/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { mergeDeep } from '../lib/dataops-job-config';

describe('mergeDeep', () => {
  // Basic merging tests
  test('should return target when no sources are provided', () => {
    const target = { a: 1 };
    expect(mergeDeep(target)).toEqual({ a: 1 });
  });

  test('should merge simple objects', () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };
    expect(mergeDeep(target, source)).toEqual({ a: 1, b: 3, c: 4 });
  });

  // Deep merging tests
  test('should deep merge nested objects', () => {
    const target = { a: 1, b: { c: 2, d: 3, e: 10 } };
    const source = { b: { c: 4, e: 5 } };
    expect(mergeDeep(target, source)).toEqual({ a: 1, b: { c: 4, d: 3, e: 5 } });
  });

  test('should handle deeply nested objects', () => {
    const target = { a: { b: { c: { d: 1 } } } };
    const source = { a: { b: { c: { e: 2 } } } };
    expect(mergeDeep(target, source)).toEqual({ a: { b: { c: { d: 1, e: 2 } } } });
  });

  // Multiple sources tests
  test('should merge multiple sources', () => {
    const target = { a: 1 };
    const source1 = { b: 2 };
    const source2 = { c: 3 };
    expect(mergeDeep(target, source1, source2)).toEqual({ a: 1, b: 2, c: 3 });
  });

  test('should merge multiple sources with overlapping properties', () => {
    const target = { a: 1, b: 2 };
    const source1 = { b: 3, c: 4 };
    const source2 = { c: 5, d: 6 };
    expect(mergeDeep(target, source1, source2)).toEqual({ a: 1, b: 3, c: 5, d: 6 });
  });

  // Edge cases
  test('should create new objects for missing nested properties', () => {
    const target = { a: 1 };
    const source = { b: { c: 2 } };
    expect(mergeDeep(target, source)).toEqual({ a: 1, b: { c: 2 } });
  });

  test('should handle empty objects', () => {
    const target = {};
    const source = { a: 1 };
    expect(mergeDeep(target, source)).toEqual({ a: 1 });
  });

  // Non-object values
  // Not clear if this is a valid expectation
  xtest('should overwrite primitive values with object values', () => {
    const target = { a: 1 };
    const source = { a: { b: 2 } };
    expect(mergeDeep(target, source)).toEqual({ a: { b: 2 } });
  });

  test('should overwrite object values with primitive values', () => {
    const target = { a: { b: 2 } };
    const source = { a: 1 };
    expect(mergeDeep(target, source)).toEqual({ a: 1 });
  });

  // Array handling
  test('should not merge arrays but replace them', () => {
    const target = { a: [1, 2, 3] };
    const source = { a: [4, 5] };
    expect(mergeDeep(target, source)).toEqual({ a: [4, 5] });
  });

  // Complex example
  test('should handle complex nested structures', () => {
    const target = {
      one: {
        two: {
          keep: 'yes!',
          change: 'should not see me',
        },
        three: {
          four: {
            keep: 'yes!',
            change: 'should not see me',
          },
        },
      },
    };

    const source = {
      one: {
        two: {
          change: 'NICE 1!!',
        },
        three: {
          four: {
            change: 'NICE 2!!',
          },
        },
      },
    };

    const expected = {
      one: {
        two: {
          keep: 'yes!',
          change: 'NICE 1!!',
        },
        three: {
          four: {
            keep: 'yes!',
            change: 'NICE 2!!',
          },
        },
      },
    };

    expect(mergeDeep(target, source)).toEqual(expected);
  });

  // Null and undefined handling
  test('should handle null values', () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { b: null };
    expect(mergeDeep(target, source)).toEqual({ a: 1, b: null });
  });

  test('should handle undefined values', () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { b: undefined };
    expect(mergeDeep(target, source)).toEqual({ a: 1, b: undefined });
  });
});

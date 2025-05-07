import { findDuplicates } from '../lib/utils';

describe('findDuplicates', () => {
  test('should return empty array for empty map', () => {
    const emptyMap: Record<string, Record<string, number>> = {};
    const result = findDuplicates(emptyMap);
    expect(result).toEqual([]);
  });

  test('should return empty array when no counts are greater than 1', () => {
    const mapWithOnesOnly: Record<string, Record<string, number>> = {
      account1: { module1: 1, module2: 1 },
      account2: { module1: 1, module3: 1 },
    };
    const result = findDuplicates(mapWithOnesOnly);
    expect(result).toEqual([]);
  });

  test('should return pairs with counts greater than 1', () => {
    const mixedMap: Record<string, Record<string, number>> = {
      account1: { module1: 2, module2: 1 },
      account2: { module1: 1, module3: 3 },
    };
    const result = findDuplicates(mixedMap);

    // Check the exact content regardless of order
    expect(result).toHaveLength(2);
    expect(new Set(result.map(x => JSON.stringify(x)))).toEqual(
      new Set([JSON.stringify(['account1', 'module1']), JSON.stringify(['account2', 'module3'])]),
    );
  });

  test('should return all pairs when all counts are greater than 1', () => {
    const allGreaterThanOne: Record<string, Record<string, number>> = {
      account1: { module1: 2, module2: 3 },
      account2: { module3: 4 },
    };
    const result = findDuplicates(allGreaterThanOne);

    expect(result).toHaveLength(3);
    const expectedPairsStringified = [
      JSON.stringify(['account1', 'module1']),
      JSON.stringify(['account1', 'module2']),
      JSON.stringify(['account2', 'module3']),
    ];

    const resultStringified = result.map(a => JSON.stringify(a));
    expectedPairsStringified.forEach(pair => {
      expect(resultStringified).toContain(pair);
    });
  });

  test('should handle complex nested structures', () => {
    const complexMap: Record<string, Record<string, number>> = {
      account1: { module1: 2, module2: 3, module3: 1, module4: 1 },
      account2: { module1: 1 },
      account4: { module5: 5, module6: 6 },
    };
    const result = findDuplicates(complexMap);

    expect(result).toHaveLength(4);
    const expectedPairs = [
      ['account1', 'module1'],
      ['account1', 'module2'],
      ['account4', 'module5'],
      ['account4', 'module6'],
    ];

    // Verify each expected pair exists in the result
    for (const expected of expectedPairs) {
      expect(result.some(pair => pair[0] === expected[0] && pair[1] === expected[1])).toBe(true);
    }

    // Verify no unexpected pairs exist
    for (const actual of result) {
      expect(expectedPairs.some(pair => pair[0] === actual[0] && pair[1] === actual[1])).toBe(true);
    }
  });
});

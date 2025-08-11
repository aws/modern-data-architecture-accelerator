/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSanitizeClusterIdentifier } from '../lib/utils';
import { MdaaRdsServerlessClusterProps } from '../lib';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';

describe('Utils', () => {
  const mockNaming = {
    resourceName: jest.fn(),
  } as unknown as IMdaaResourceNaming;

  const baseMockProps = {
    naming: mockNaming,
    clusterIdentifier: 'test-cluster',
  } as MdaaRdsServerlessClusterProps;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSanitizeClusterIdentifier', () => {
    it('should return sanitized cluster identifier for valid input', () => {
      const validName = 'test-cluster-name';
      (mockNaming.resourceName as jest.Mock).mockReturnValue(validName);

      const result = getSanitizeClusterIdentifier(baseMockProps);

      expect(mockNaming.resourceName).toHaveBeenCalledWith('test-cluster', 63);
      expect(result).toBe(validName);
    });

    it('should handle multiple consecutive dashes', () => {
      const nameWithMultipleDashes = 'test---cluster--name';
      const expectedSanitized = 'test-cluster-name';
      (mockNaming.resourceName as jest.Mock).mockReturnValue(nameWithMultipleDashes);

      const result = getSanitizeClusterIdentifier(baseMockProps);

      expect(result).toBe(expectedSanitized);
    });

    it('should handle name starting with letter', () => {
      const validName = 'a-valid-cluster-name';
      (mockNaming.resourceName as jest.Mock).mockReturnValue(validName);

      const result = getSanitizeClusterIdentifier(baseMockProps);

      expect(result).toBe(validName);
    });

    it('should throw error for invalid cluster identifier starting with number', () => {
      const invalidName = '1-invalid-name';
      (mockNaming.resourceName as jest.Mock).mockReturnValue(invalidName);

      expect(() => getSanitizeClusterIdentifier(baseMockProps)).toThrow(
        'Unable to sanitize cluster identifier: test-cluster',
      );
    });

    it('should throw error for invalid cluster identifier starting with dash', () => {
      const invalidName = '-invalid-name';
      (mockNaming.resourceName as jest.Mock).mockReturnValue(invalidName);

      expect(() => getSanitizeClusterIdentifier(baseMockProps)).toThrow(
        'Unable to sanitize cluster identifier: test-cluster',
      );
    });

    it('should throw error for invalid cluster identifier ending with dash', () => {
      const invalidName = 'invalid-name-';
      (mockNaming.resourceName as jest.Mock).mockReturnValue(invalidName);

      expect(() => getSanitizeClusterIdentifier(baseMockProps)).toThrow(
        'Unable to sanitize cluster identifier: test-cluster',
      );
    });

    it('should handle maximum length identifier', () => {
      const maxLengthName = 'a' + 'b'.repeat(61) + 'z';
      (mockNaming.resourceName as jest.Mock).mockReturnValue(maxLengthName);

      const result = getSanitizeClusterIdentifier(baseMockProps);

      expect(result).toBe(maxLengthName);
      expect(result.length).toBe(63);
    });

    it('should handle identifier with alphanumeric characters', () => {
      const alphanumericName = 'test-cluster-123-abc';
      (mockNaming.resourceName as jest.Mock).mockReturnValue(alphanumericName);

      const result = getSanitizeClusterIdentifier(baseMockProps);

      expect(result).toBe(alphanumericName);
    });
  });
});

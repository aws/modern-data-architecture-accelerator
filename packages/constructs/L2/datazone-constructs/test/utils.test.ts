/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { validatePrincipal, resolveCrossAccountProvisioningRole } from '../lib/utils';
import { PolicyPrincipal } from '../lib';

describe('Utils Tests', () => {
  describe('validatePrincipal', () => {
    test('should pass with exactly one property - userName', () => {
      const principal: PolicyPrincipal = { userName: 'test-user' };
      expect(() => validatePrincipal(principal)).not.toThrow();
    });

    test('should pass with exactly one property - groupName', () => {
      const principal: PolicyPrincipal = { groupName: 'test-group' };
      expect(() => validatePrincipal(principal)).not.toThrow();
    });

    test('should pass with exactly one property - accountName', () => {
      const principal: PolicyPrincipal = { accountName: 'test-account' };
      expect(() => validatePrincipal(principal)).not.toThrow();
    });

    test('should pass with exactly one property - allUsersGrantFilter', () => {
      const principal: PolicyPrincipal = { allUsersGrantFilter: true };
      expect(() => validatePrincipal(principal)).not.toThrow();
    });

    test('should pass with exactly one property - userIdentifier', () => {
      const principal: PolicyPrincipal = {
        userIdentifier: { name: 'user', identifier: 'arn:aws:iam::123456789012:role/test' },
      };
      expect(() => validatePrincipal(principal)).not.toThrow();
    });

    test('should pass with exactly one property - groupIdentifier', () => {
      const principal: PolicyPrincipal = {
        groupIdentifier: { name: 'group', identifier: 'group-id-123' },
      };
      expect(() => validatePrincipal(principal)).not.toThrow();
    });

    test('should throw error when no properties are specified', () => {
      const principal: PolicyPrincipal = {};
      expect(() => validatePrincipal(principal)).toThrow(
        'Invalid principal configuration: must specify exactly one of allUsersGrantFilter, userName, userIdentifier, groupName, groupIdentifier or accountName',
      );
    });

    test('should throw error when multiple properties are specified', () => {
      const principal: PolicyPrincipal = { userName: 'test-user', groupName: 'test-group' };
      expect(() => validatePrincipal(principal)).toThrow(
        'Invalid principal configuration: must specify exactly one of allUsersGrantFilter, userName, userIdentifier, groupName, groupIdentifier or accountName',
      );
    });

    test('should throw error when three properties are specified', () => {
      const principal: PolicyPrincipal = {
        userName: 'test-user',
        groupName: 'test-group',
        accountName: 'test-account',
      };
      expect(() => validatePrincipal(principal)).toThrow(
        'Invalid principal configuration: must specify exactly one of allUsersGrantFilter, userName, userIdentifier, groupName, groupIdentifier or accountName',
      );
    });
  });

  describe('resolveCrossAccountProvisioningRole', () => {
    test('should return arn when arn is provided', () => {
      const roleRef = { arn: 'arn:aws:iam::123456789012:role/test-role' };
      const result = resolveCrossAccountProvisioningRole(roleRef, '123456789012', 'aws');
      expect(result).toBe('arn:aws:iam::123456789012:role/test-role');
    });

    test('should construct arn from name when name is provided', () => {
      const roleRef = { name: 'test-role' };
      const result = resolveCrossAccountProvisioningRole(roleRef, '123456789012', 'aws');
      expect(result).toBe('arn:aws:iam::123456789012:role/test-role');
    });

    test('should construct arn with correct partition', () => {
      const roleRef = { name: 'test-role' };
      const result = resolveCrossAccountProvisioningRole(roleRef, '123456789012', 'aws-cn');
      expect(result).toBe('arn:aws-cn:iam::123456789012:role/test-role');
    });

    test('should throw error when neither arn nor name is provided', () => {
      const roleRef = {};
      expect(() => resolveCrossAccountProvisioningRole(roleRef, '123456789012', 'aws')).toThrow(
        'Associated account provisioningRole must have either arn or name defined',
      );
    });

    test('should prefer arn over name when both are provided', () => {
      const roleRef = { arn: 'arn:aws:iam::111111111111:role/arn-role', name: 'name-role' };
      const result = resolveCrossAccountProvisioningRole(roleRef, '123456789012', 'aws');
      expect(result).toBe('arn:aws:iam::111111111111:role/arn-role');
    });
  });
});

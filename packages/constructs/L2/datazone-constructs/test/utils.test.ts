/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { validatePrincipal } from '../lib/utils';
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
});

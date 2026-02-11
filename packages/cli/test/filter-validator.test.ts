/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { validateFilters } from '../lib/filter-validator';
import { MdaaConfigContents } from '../lib/mdaa-cli-config-parser';

const createTestConfig = (): MdaaConfigContents => ({
  organization: 'test-org',
  domains: {
    domain1: {
      environments: {
        dev: {
          modules: {
            moduleA: { module_path: '@aws-mdaa/test' },
            moduleB: { module_path: '@aws-mdaa/test' },
          },
        },
        prod: {
          modules: {
            moduleA: { module_path: '@aws-mdaa/test' },
            moduleC: { module_path: '@aws-mdaa/test' },
          },
        },
      },
    },
    domain2: {
      environments: {
        dev: {
          modules: {
            moduleA: { module_path: '@aws-mdaa/test' },
            moduleD: { module_path: '@aws-mdaa/test' },
          },
        },
        staging: {
          modules: {
            moduleE: { module_path: '@aws-mdaa/test' },
          },
        },
      },
    },
  },
});

describe('validateFilters', () => {
  describe('domain filter validation', () => {
    test('should pass with valid domain filter', () => {
      const config = createTestConfig();
      expect(() =>
        validateFilters({
          domainFilter: ['domain1'],
          config,
        }),
      ).not.toThrow();
    });

    test('should pass with multiple valid domains', () => {
      const config = createTestConfig();
      expect(() =>
        validateFilters({
          domainFilter: ['domain1', 'domain2'],
          config,
        }),
      ).not.toThrow();
    });

    test('should throw for invalid domain', () => {
      const config = createTestConfig();
      expect(() =>
        validateFilters({
          domainFilter: ['nonexistent'],
          config,
        }),
      ).toThrow('Unknown domain(s) in filter: nonexistent');
    });

    test('should throw for mix of valid and invalid domains', () => {
      const config = createTestConfig();
      expect(() =>
        validateFilters({
          domainFilter: ['domain1', 'typo'],
          config,
        }),
      ).toThrow('Unknown domain(s) in filter: typo');
    });
  });

  describe('env filter validation', () => {
    test('should pass with valid env filter', () => {
      const config = createTestConfig();
      expect(() =>
        validateFilters({
          envFilter: ['dev'],
          config,
        }),
      ).not.toThrow();
    });

    test('should throw for invalid env', () => {
      const config = createTestConfig();
      expect(() =>
        validateFilters({
          envFilter: ['nonexistent'],
          config,
        }),
      ).toThrow('Unknown env(s) in filter: nonexistent');
    });

    test('should validate env within filtered domain only', () => {
      const config = createTestConfig();
      // staging only exists in domain2, so filtering to domain1 should fail
      expect(() =>
        validateFilters({
          domainFilter: ['domain1'],
          envFilter: ['staging'],
          config,
        }),
      ).toThrow('Unknown env(s) in filter: staging');
    });

    test('should pass when env exists in filtered domain', () => {
      const config = createTestConfig();
      expect(() =>
        validateFilters({
          domainFilter: ['domain2'],
          envFilter: ['staging'],
          config,
        }),
      ).not.toThrow();
    });
  });

  describe('module filter validation', () => {
    test('should pass with valid module filter', () => {
      const config = createTestConfig();
      expect(() =>
        validateFilters({
          moduleFilter: ['moduleA'],
          config,
        }),
      ).not.toThrow();
    });

    test('should throw for invalid module', () => {
      const config = createTestConfig();
      expect(() =>
        validateFilters({
          moduleFilter: ['nonexistent'],
          config,
        }),
      ).toThrow('Unknown module(s) in filter: nonexistent');
    });

    test('should validate module within filtered domain and env', () => {
      const config = createTestConfig();
      // moduleE only exists in domain2/staging
      expect(() =>
        validateFilters({
          domainFilter: ['domain1'],
          moduleFilter: ['moduleE'],
          config,
        }),
      ).toThrow('Unknown module(s) in filter: moduleE');
    });

    test('should pass when module exists in filtered domain/env', () => {
      const config = createTestConfig();
      expect(() =>
        validateFilters({
          domainFilter: ['domain2'],
          envFilter: ['staging'],
          moduleFilter: ['moduleE'],
          config,
        }),
      ).not.toThrow();
    });
  });

  describe('combined filter validation', () => {
    test('should pass with no filters', () => {
      const config = createTestConfig();
      expect(() => validateFilters({ config })).not.toThrow();
    });

    test('should collect multiple errors', () => {
      const config = createTestConfig();
      expect(() =>
        validateFilters({
          domainFilter: ['badDomain'],
          envFilter: ['badEnv'],
          moduleFilter: ['badModule'],
          config,
        }),
      ).toThrow(/Unknown domain.*badDomain/);
    });
  });
});

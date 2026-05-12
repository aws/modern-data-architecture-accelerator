/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import { convertAuthorizationsToNamedPolicies, flattenDomainUnitPaths } from '../lib/utils';

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

describe('convertAuthorizationsToNamedPolicies', () => {
  test('returns undefined for undefined input', () => {
    expect(convertAuthorizationsToNamedPolicies(undefined, 'V1')).toBeUndefined();
  });

  test('returns undefined for empty authorizations', () => {
    expect(convertAuthorizationsToNamedPolicies({}, 'V1')).toBeUndefined();
  });

  test('projectCreators maps to CREATE_PROJECT for V1', () => {
    const result = convertAuthorizationsToNamedPolicies({ projectCreators: { users: ['user1'] } }, 'V1');
    expect(result).toBeDefined();
    expect(result!['simple-create-project'].policyType).toBe('CREATE_PROJECT');
    expect(result!['simple-create-project'].principals).toEqual([{ userName: 'user1' }]);
  });

  test('projectCreators maps to CREATE_PROJECT_FROM_PROJECT_PROFILE for V2', () => {
    const result = convertAuthorizationsToNamedPolicies({ projectCreators: { users: ['user1'] } }, 'V2');
    expect(result).toBeDefined();
    expect(result!['simple-create-project'].policyType).toBe('CREATE_PROJECT_FROM_PROJECT_PROFILE');
  });

  test('eligibleProjectMembers maps to ADD_TO_PROJECT_MEMBER_POOL', () => {
    const result = convertAuthorizationsToNamedPolicies({ eligibleProjectMembers: { groups: ['group1'] } }, 'V1');
    expect(result).toBeDefined();
    expect(result!['simple-project-membership'].policyType).toBe('ADD_TO_PROJECT_MEMBER_POOL');
    expect(result!['simple-project-membership'].principals).toEqual([{ groupName: 'group1' }]);
  });

  test('domainUnitCreators maps to CREATE_DOMAIN_UNIT', () => {
    const result = convertAuthorizationsToNamedPolicies({ domainUnitCreators: { users: ['user1'] } }, 'V1');
    expect(result).toBeDefined();
    expect(result!['simple-create-domain-unit'].policyType).toBe('CREATE_DOMAIN_UNIT');
  });

  test('glossaryCreators maps to CREATE_GLOSSARY', () => {
    const result = convertAuthorizationsToNamedPolicies({ glossaryCreators: { groups: ['group1'] } }, 'V2');
    expect(result).toBeDefined();
    expect(result!['simple-create-glossary'].policyType).toBe('CREATE_GLOSSARY');
  });

  test('environmentCreators maps to CREATE_ENVIRONMENT', () => {
    const result = convertAuthorizationsToNamedPolicies({ environmentCreators: { users: ['user1'] } }, 'V1');
    expect(result).toBeDefined();
    expect(result!['simple-create-environment'].policyType).toBe('CREATE_ENVIRONMENT');
  });

  test('all: true produces allUsersGrantFilter principal', () => {
    const result = convertAuthorizationsToNamedPolicies({ eligibleProjectMembers: { all: true } }, 'V1');
    expect(result).toBeDefined();
    expect(result!['simple-project-membership'].principals).toEqual([{ allUsersGrantFilter: true }]);
  });

  test('userIdentifiers produces userIdentifier principals', () => {
    const result = convertAuthorizationsToNamedPolicies(
      { projectCreators: { userIdentifiers: { 'my-user': 'arn:aws:iam::123:role/my-role' } } },
      'V1',
    );
    expect(result).toBeDefined();
    expect(result!['simple-create-project'].principals).toEqual([
      { userIdentifier: { name: 'my-user', identifier: 'arn:aws:iam::123:role/my-role' } },
    ]);
  });

  test('groupsIdentifiers produces groupIdentifier principals', () => {
    const result = convertAuthorizationsToNamedPolicies(
      { domainUnitCreators: { groupsIdentifiers: { 'my-group': 'group-id-123' } } },
      'V2',
    );
    expect(result).toBeDefined();
    expect(result!['simple-create-domain-unit'].principals).toEqual([
      { groupIdentifier: { name: 'my-group', identifier: 'group-id-123' } },
    ]);
  });

  test('multiple authorization fields produce multiple policies', () => {
    const result = convertAuthorizationsToNamedPolicies(
      {
        projectCreators: { users: ['user1'] },
        eligibleProjectMembers: { groups: ['group1'] },
        glossaryCreators: { users: ['user2'] },
      },
      'V1',
    );
    expect(result).toBeDefined();
    expect(Object.keys(result!)).toHaveLength(3);
    expect(result!['simple-create-project']).toBeDefined();
    expect(result!['simple-project-membership']).toBeDefined();
    expect(result!['simple-create-glossary']).toBeDefined();
  });
});

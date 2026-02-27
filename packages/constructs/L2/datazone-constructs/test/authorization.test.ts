/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AuthorizationPolicy,
  DataZoneAuthorizationConstruct,
  EntityType,
  PolicyPrincipal,
  PrincipalResolver,
} from '../lib/authorization';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';

describe('PrincipalResolver', () => {
  let resolver: PrincipalResolver;

  beforeEach(() => {
    resolver = new PrincipalResolver(
      { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
      { 'test-group': 'group-456' },
      { '123456789012': 'arn:aws:iam::123456789012:role/account-role' },
    );
  });

  describe('resolvePrincipal', () => {
    it('should resolve user principal', () => {
      const principal: PolicyPrincipal = { userName: 'test-user' };
      const result = resolver.resolvePrincipalIdentifier(principal);

      expect(result.user?.userIdentifier).toBe('arn:aws:iam::123456789012:role/test-user-role');
    });

    it('should resolve user principal with allUsersGrantFilter disabled', () => {
      const principal: PolicyPrincipal = { userName: 'test-user' };
      const result = resolver.resolvePrincipalIdentifier(principal);

      expect(result.user?.userIdentifier).toBe('arn:aws:iam::123456789012:role/test-user-role');
      expect(result.user?.allUsersGrantFilter).toBeUndefined();
    });

    it('should resolve standalone allUsersGrantFilter', () => {
      const principal: PolicyPrincipal = { allUsersGrantFilter: true };
      const result = resolver.resolvePrincipalIdentifier(principal);

      expect(result.user?.userIdentifier).toBeUndefined();
      expect(result.user?.allUsersGrantFilter).toEqual({});
    });

    it('should resolve group principal', () => {
      const principal: PolicyPrincipal = { groupName: 'test-group' };
      const result = resolver.resolvePrincipalIdentifier(principal);

      expect(result.group?.groupIdentifier).toBe('group-456');
    });

    it('should resolve account principal', () => {
      const principal: PolicyPrincipal = { accountName: '123456789012' };
      const result = resolver.resolvePrincipalIdentifier(principal);

      expect(result.user?.userIdentifier).toBe('arn:aws:iam::123456789012:role/account-role');
    });

    it('should throw for unknown user', () => {
      const principal: PolicyPrincipal = { userName: 'unknown-user' };

      expect(() => resolver.resolvePrincipalIdentifier(principal)).toThrow(
        "User 'unknown-user' not found. Available: test-user",
      );
    });

    it('should throw for unknown group', () => {
      const principal: PolicyPrincipal = { groupName: 'unknown-group' };

      expect(() => resolver.resolvePrincipalIdentifier(principal)).toThrow(
        "Group 'unknown-group' not found. Available: test-group",
      );
    });

    it('should throw for unknown account', () => {
      const principal: PolicyPrincipal = { accountName: 'unknown-account' };

      expect(() => resolver.resolvePrincipalIdentifier(principal)).toThrow(
        "Account 'unknown-account' not found. Available: 123456789012",
      );
    });

    it('should throw for multiple principal types', () => {
      const principal: PolicyPrincipal = { userName: 'test-user', groupName: 'test-group' };

      expect(() => resolver.resolvePrincipalIdentifier(principal)).toThrow(
        'Invalid principal configuration: must specify exactly one of allUsersGrantFilter, userName, userIdentifier, groupName, groupIdentifier or accountName',
      );
    });

    it('should throw for empty principal', () => {
      const principal: PolicyPrincipal = {};

      expect(() => resolver.resolvePrincipalIdentifier(principal)).toThrow(/must specify exactly one/);
    });

    it('should throw for invalid principal configuration', () => {
      const principal: PolicyPrincipal = {};

      expect(() => resolver.resolvePrincipalIdentifier(principal)).toThrow(
        'Invalid principal configuration: must specify exactly one of allUsersGrantFilter, userName, userIdentifier, groupName, groupIdentifier or accountName',
      );
    });
  });

  describe('with empty identifiers', () => {
    it('should handle empty user identifiers', () => {
      const emptyResolver = new PrincipalResolver({}, { 'test-group': 'group-456' }, {});
      const principal: PolicyPrincipal = { userName: 'test-user' };

      expect(() => emptyResolver.resolvePrincipalIdentifier(principal)).toThrow(
        "User 'test-user' not found. Available: ",
      );
    });

    it('should handle empty group identifiers', () => {
      const emptyResolver = new PrincipalResolver({ 'test-user': 'user-123' }, {}, {});
      const principal: PolicyPrincipal = { groupName: 'test-group' };

      expect(() => emptyResolver.resolvePrincipalIdentifier(principal)).toThrow(
        "Group 'test-group' not found. Available: ",
      );
    });

    it('should handle empty account identifiers', () => {
      const emptyResolver = new PrincipalResolver({}, {}, {});
      const principal: PolicyPrincipal = { accountName: '123456789012' };

      expect(() => emptyResolver.resolvePrincipalIdentifier(principal)).toThrow(
        "Account '123456789012' not found. Available: ",
      );
    });
  });
});

describe('DataZoneAuthorizationConstruct', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  it('should create policy grants for authorization policies', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'create-project-policy': {
        policyType: 'CREATE_PROJECT',
        principals: [{ userName: 'test-user' }],
        includeChildDomainUnits: true,
        description: 'Test policy',
      },
    };

    const construct = new DataZoneAuthorizationConstruct(testApp.testStack, 'test-auth', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
      groupIdentifiers: {},
      accountIdentifiers: {},
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::PolicyGrant', 1);

    const grants = construct.policyGrantsList();
    expect(grants).toHaveLength(1);
  });

  it('should create multiple policy grants for multiple principals', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'create-project-policy': {
        policyType: 'CREATE_PROJECT',
        principals: [{ userName: 'test-user' }, { groupName: 'test-group' }],
        includeChildDomainUnits: true,
      },
    };

    const construct = new DataZoneAuthorizationConstruct(testApp.testStack, 'test-auth', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
      groupIdentifiers: { 'test-group': 'group-456' },
      accountIdentifiers: {},
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::PolicyGrant', 2);

    const grants = construct.policyGrantsList();
    expect(grants).toHaveLength(2);
  });

  it('should handle allUsersGrantFilter principal correctly', () => {
    new DataZoneAuthorizationConstruct(testApp.testStack, 'test-auth-construct', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies: {
        'create-project-policy': {
          policyType: 'CREATE_PROJECT',
          principals: [{ allUsersGrantFilter: true }],
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
      PolicyType: 'CREATE_PROJECT',
      DomainIdentifier: 'test-domain-id',
      EntityIdentifier: 'test-entity-id',
      EntityType: 'DOMAIN_UNIT',
      Principal: {
        User: {
          AllUsersGrantFilter: {},
        },
      },
    });
  });

  it('should handle mixed principals with allUsersGrantFilter', () => {
    new DataZoneAuthorizationConstruct(testApp.testStack, 'test-auth-construct', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies: {
        'create-project-policy': {
          policyType: 'CREATE_PROJECT',
          principals: [{ allUsersGrantFilter: true }, { userName: 'test-user' }],
        },
      },
      userIdentifiers: {
        'test-user': 'arn:aws:iam::123456789012:role/test-user-role',
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::PolicyGrant', 2);
  });

  it('should handle allUsersGrantFilter without specific principal name', () => {
    const construct = new DataZoneAuthorizationConstruct(testApp.testStack, 'test-auth-all-users', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies: {
        'create-project-policy': {
          policyType: 'CREATE_PROJECT',
          principals: [{ allUsersGrantFilter: true }],
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::PolicyGrant', 1);

    const grants = construct.policyGrantsList();
    expect(grants).toHaveLength(1);
  });

  it('should throw error for invalid principal configuration', () => {
    expect(() => {
      new DataZoneAuthorizationConstruct(testApp.testStack, 'test-auth-construct', {
        naming: testApp.naming,
        domainId: 'test-domain-id',
        entityId: 'test-entity-id',
        entityType: EntityType.DOMAIN_UNIT,
        policies: {
          'create-project-policy': {
            policyType: 'CREATE_PROJECT',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            principals: [{}] as any,
          },
        },
      });
    }).toThrow(
      'Invalid principal configuration: must specify exactly one of allUsersGrantFilter, userName, userIdentifier, groupName, groupIdentifier or accountName',
    );
  });

  it('should handle policies without detail', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'create-project-policy': {
        policyType: 'CREATE_PROJECT',
        principals: [{ userName: 'test-user' }],
      },
    };

    const construct = new DataZoneAuthorizationConstruct(testApp.testStack, 'test-auth', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
      groupIdentifiers: {},
      accountIdentifiers: {},
    });

    const grants = construct.policyGrantsList();
    expect(grants).toHaveLength(1);
  });

  it('should handle policies with domainUnitId', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'create-project-policy': {
        policyType: 'CREATE_PROJECT',
        principals: [{ userName: 'test-user' }],
        domainUnitId: 'test-domain-unit-id',
      },
    };

    const construct = new DataZoneAuthorizationConstruct(testApp.testStack, 'test-auth-domain-unit', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
      groupIdentifiers: {},
      accountIdentifiers: {},
    });

    const grants = construct.policyGrantsList();
    expect(grants).toHaveLength(1);
  });

  it('should handle critical policies with RETAIN removal policy', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'override-owners-policy': {
        policyType: 'OVERRIDE_DOMAIN_UNIT_OWNERS',
        principals: [{ userName: 'test-user' }],
        includeChildDomainUnits: true,
      },
    };

    const construct = new DataZoneAuthorizationConstruct(testApp.testStack, 'test-auth', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
      groupIdentifiers: {},
      accountIdentifiers: {},
    });

    const grants = construct.policyGrantsList();
    expect(grants).toHaveLength(1);
  });

  it('should convert policy type to camelCase property name', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'create-domain-unit-policy': {
        policyType: 'CREATE_DOMAIN_UNIT',
        principals: [{ userName: 'test-user' }],
        includeChildDomainUnits: false,
      },
    };

    const construct = new DataZoneAuthorizationConstruct(testApp.testStack, 'test-auth', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
      groupIdentifiers: {},
      accountIdentifiers: {},
    });

    const grants = construct.policyGrantsList();
    expect(grants).toHaveLength(1);
  });

  it('should handle CREATE_ENVIRONMENT_FROM_BLUEPRINT policy', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'blueprint-policy': {
        policyType: 'CREATE_ENVIRONMENT_FROM_BLUEPRINT',
        principals: [{ userName: 'test-user' }],
        domainUnitId: 'unit-123',
      },
    };

    new DataZoneAuthorizationConstruct(testApp.testStack, 'test-blueprint-auth', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.ENVIRONMENT_BLUEPRINT_CONFIGURATION,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
      PolicyType: 'CREATE_ENVIRONMENT_FROM_BLUEPRINT',
    });
  });

  it('should handle CREATE_ENVIRONMENT policy', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'env-policy': {
        policyType: 'CREATE_ENVIRONMENT',
        principals: [{ userName: 'test-user' }],
        domainUnitId: 'unit-123',
      },
    };

    new DataZoneAuthorizationConstruct(testApp.testStack, 'test-env-auth', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
      PolicyType: 'CREATE_ENVIRONMENT',
    });
  });

  it('should handle CREATE_ENVIRONMENT_PROFILE policy', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'profile-policy': {
        policyType: 'CREATE_ENVIRONMENT_PROFILE',
        principals: [{ userName: 'test-user' }],
        domainUnitId: 'unit-123',
      },
    };

    new DataZoneAuthorizationConstruct(testApp.testStack, 'test-profile-auth', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
      PolicyType: 'CREATE_ENVIRONMENT_PROFILE',
    });
  });

  it('should handle DELEGATE_CREATE_ENVIRONMENT_PROFILE policy', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'delegate-policy': {
        policyType: 'DELEGATE_CREATE_ENVIRONMENT_PROFILE',
        principals: [{ userName: 'test-user' }],
        domainUnitId: 'unit-123',
      },
    };

    new DataZoneAuthorizationConstruct(testApp.testStack, 'test-delegate-auth', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
      PolicyType: 'DELEGATE_CREATE_ENVIRONMENT_PROFILE',
    });
  });

  it('should handle CREATE_PROJECT_FROM_PROJECT_PROFILE policy', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'project-profile-policy': {
        policyType: 'CREATE_PROJECT_FROM_PROJECT_PROFILE',
        principals: [{ userName: 'test-user' }],
      },
    };

    new DataZoneAuthorizationConstruct(testApp.testStack, 'test-proj-profile-auth', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
      PolicyType: 'CREATE_PROJECT_FROM_PROJECT_PROFILE',
    });
  });

  it('should handle CREATE_GLOSSARY policy', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'glossary-policy': {
        policyType: 'CREATE_GLOSSARY',
        principals: [{ userName: 'test-user' }],
      },
    };

    new DataZoneAuthorizationConstruct(testApp.testStack, 'test-glossary-auth', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
      PolicyType: 'CREATE_GLOSSARY',
    });
  });

  it('should handle CREATE_FORM_TYPE policy', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'form-policy': {
        policyType: 'CREATE_FORM_TYPE',
        principals: [{ userName: 'test-user' }],
      },
    };

    new DataZoneAuthorizationConstruct(testApp.testStack, 'test-form-auth', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
      PolicyType: 'CREATE_FORM_TYPE',
    });
  });

  it('should handle CREATE_ASSET_TYPE policy', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'asset-policy': {
        policyType: 'CREATE_ASSET_TYPE',
        principals: [{ userName: 'test-user' }],
      },
    };

    new DataZoneAuthorizationConstruct(testApp.testStack, 'test-asset-auth', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::PolicyGrant', {
      PolicyType: 'CREATE_ASSET_TYPE',
    });
  });

  it('should handle policy with description', () => {
    const policies: Record<string, AuthorizationPolicy> = {
      'described-policy': {
        policyType: 'CREATE_PROJECT',
        principals: [{ userName: 'test-user' }],
        description: 'Test policy description',
      },
    };

    new DataZoneAuthorizationConstruct(testApp.testStack, 'test-desc-auth', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      entityId: 'test-entity-id',
      entityType: EntityType.DOMAIN_UNIT,
      policies,
      userIdentifiers: { 'test-user': 'arn:aws:iam::123456789012:role/test-user-role' },
    });

    const template = Template.fromStack(testApp.testStack);
    const resources = template.findResources('AWS::DataZone::PolicyGrant');
    const resourceKeys = Object.keys(resources);
    expect(resourceKeys.length).toBeGreaterThan(0);
    const resource = resources[resourceKeys[0]];
    expect(resource.Metadata?.Description).toBe('Test policy description');
  });
});

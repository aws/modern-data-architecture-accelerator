/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { ProfileManagementConstruct } from '../lib/profile-management';

describe('ProfileManagementConstruct', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  it('should create user profiles', () => {
    new ProfileManagementConstruct(testApp.testStack, 'test-profiles', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V2',
      users: {
        user1: {
          identifier: 'arn:aws:iam::123456789012:role/user1',
          userType: 'IAM_ROLE',
        },
        user2: {
          identifier: 'user2@example.com',
          userType: 'SSO_USER',
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::UserProfile', 2);
    template.hasResourceProperties('AWS::DataZone::UserProfile', {
      DomainIdentifier: 'test-domain-id',
      UserType: 'IAM_ROLE',
      Status: 'ACTIVATED',
    });
  });

  it('should create group profiles', () => {
    new ProfileManagementConstruct(testApp.testStack, 'test-profiles', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V2',
      groups: {
        group1: {
          identifier: 'group-123',
        },
        group2: {
          identifier: 'group-456',
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::GroupProfile', 2);
    template.hasResourceProperties('AWS::DataZone::GroupProfile', {
      DomainIdentifier: 'test-domain-id',
      Status: 'ASSIGNED',
    });
  });

  it('should create both users and groups', () => {
    new ProfileManagementConstruct(testApp.testStack, 'test-profiles', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V2',
      users: {
        user1: {
          identifier: 'arn:aws:iam::123456789012:role/user1',
          userType: 'IAM_ROLE',
        },
      },
      groups: {
        group1: {
          identifier: 'group-123',
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::UserProfile', 1);
    template.resourceCountIs('AWS::DataZone::GroupProfile', 1);
  });

  it('should expose user profiles map', () => {
    const construct = new ProfileManagementConstruct(testApp.testStack, 'test-profiles', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V2',
      users: {
        user1: {
          identifier: 'arn:aws:iam::123456789012:role/user1',
          userType: 'IAM_ROLE',
        },
      },
    });

    expect(construct.userProfiles['user1']).toBeDefined();
  });

  it('should expose group profiles map', () => {
    const construct = new ProfileManagementConstruct(testApp.testStack, 'test-profiles', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V2',
      groups: {
        group1: {
          identifier: 'group-123',
        },
      },
    });

    expect(construct.groupProfiles['group1']).toBeDefined();
  });

  it('should handle empty users and groups', () => {
    new ProfileManagementConstruct(testApp.testStack, 'test-profiles', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V2',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::UserProfile', 0);
    template.resourceCountIs('AWS::DataZone::GroupProfile', 0);
  });

  it('should use parent scope and prefix ids when domainVersion is V1', () => {
    new ProfileManagementConstruct(testApp.testStack, 'test-profiles', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V1',
      users: {
        user1: {
          identifier: 'arn:aws:iam::123456789012:role/user1',
          userType: 'IAM_ROLE',
        },
      },
      groups: {
        group1: {
          identifier: 'group-123',
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::UserProfile', 1);
    template.resourceCountIs('AWS::DataZone::GroupProfile', 1);
  });
});

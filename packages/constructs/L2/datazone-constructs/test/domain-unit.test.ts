/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { CfnGroupProfile, CfnUserProfile } from 'aws-cdk-lib/aws-datazone';
import { DataZoneDomainUnitConstruct } from '../lib/domain-unit';

describe('DataZoneDomainUnitConstruct', () => {
  let testApp: MdaaTestApp;
  let dataAdminUserProfile: CfnUserProfile;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    dataAdminUserProfile = new CfnUserProfile(testApp.testStack, 'AdminProfile', {
      domainIdentifier: 'test-domain-id',
      userIdentifier: 'arn:aws:iam::123456789012:role/admin',
      userType: 'IAM_ROLE',
    });
  });

  it('should create domain unit with minimal config', () => {
    new DataZoneDomainUnitConstruct(
      testApp.testStack,
      'test-unit',
      {
        naming: testApp.naming,
        domainId: 'test-domain-id',
        parentDomainUnitId: 'parent-unit-id',
        name: 'test-unit',
        dataAdminUserProfile,
      },
      [],
    );

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::DomainUnit', {
      DomainIdentifier: 'test-domain-id',
      ParentDomainUnitIdentifier: 'parent-unit-id',
      Name: 'test-unit',
    });
  });

  it('should create domain unit with description', () => {
    new DataZoneDomainUnitConstruct(
      testApp.testStack,
      'test-unit',
      {
        naming: testApp.naming,
        domainId: 'test-domain-id',
        parentDomainUnitId: 'parent-unit-id',
        name: 'test-unit',
        description: 'Test unit description',
        dataAdminUserProfile,
      },
      [],
    );

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::DomainUnit', {
      Description: 'Test unit description',
    });
  });

  it('should create admin ownership', () => {
    new DataZoneDomainUnitConstruct(
      testApp.testStack,
      'test-unit',
      {
        naming: testApp.naming,
        domainId: 'test-domain-id',
        parentDomainUnitId: 'parent-unit-id',
        name: 'test-unit',
        dataAdminUserProfile,
      },
      [],
    );

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Owner', {
      EntityType: 'DOMAIN_UNIT',
    });
  });

  it('should create user ownership', () => {
    const userProfile = new CfnUserProfile(testApp.testStack, 'UserProfile', {
      domainIdentifier: 'test-domain-id',
      userIdentifier: 'arn:aws:iam::123456789012:role/user',
      userType: 'IAM_ROLE',
    });

    new DataZoneDomainUnitConstruct(
      testApp.testStack,
      'test-unit',
      {
        naming: testApp.naming,
        domainId: 'test-domain-id',
        parentDomainUnitId: 'parent-unit-id',
        name: 'test-unit',
        dataAdminUserProfile,
        ownership: {
          ownerUsers: ['test-user'],
        },
        userProfiles: {
          'test-user': userProfile,
        },
      },
      [],
    );

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Owner', 2);
  });

  it('should create group ownership', () => {
    const groupProfile = new CfnGroupProfile(testApp.testStack, 'GroupProfile', {
      domainIdentifier: 'test-domain-id',
      groupIdentifier: 'group-123',
    });

    new DataZoneDomainUnitConstruct(
      testApp.testStack,
      'test-unit',
      {
        naming: testApp.naming,
        domainId: 'test-domain-id',
        parentDomainUnitId: 'parent-unit-id',
        name: 'test-unit',
        dataAdminUserProfile,
        ownership: {
          ownerGroups: ['test-group'],
        },
        groupProfiles: {
          'test-group': groupProfile,
        },
      },
      [],
    );

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Owner', 2);
  });

  it('should create account ownership', () => {
    const accountProfile = new CfnUserProfile(testApp.testStack, 'AccountProfile', {
      domainIdentifier: 'test-domain-id',
      userIdentifier: 'arn:aws:iam::987654321098:role/account',
      userType: 'IAM_ROLE',
    });

    new DataZoneDomainUnitConstruct(
      testApp.testStack,
      'test-unit',
      {
        naming: testApp.naming,
        domainId: 'test-domain-id',
        parentDomainUnitId: 'parent-unit-id',
        name: 'test-unit',
        dataAdminUserProfile,
        ownership: {
          ownerAccounts: ['test-account'],
        },
        associatedAccountUserProfiles: {
          'test-account': accountProfile,
        },
      },
      [],
    );

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Owner', 2);
  });

  it('should throw for unknown user', () => {
    expect(() => {
      new DataZoneDomainUnitConstruct(
        testApp.testStack,
        'test-unit',
        {
          naming: testApp.naming,
          domainId: 'test-domain-id',
          parentDomainUnitId: 'parent-unit-id',
          name: 'test-unit',
          dataAdminUserProfile,
          ownership: {
            ownerUsers: ['unknown-user'],
          },
        },
        [],
      );
    }).toThrow('Unknown owner user unknown-user');
  });

  it('should throw for unknown group', () => {
    expect(() => {
      new DataZoneDomainUnitConstruct(
        testApp.testStack,
        'test-unit',
        {
          naming: testApp.naming,
          domainId: 'test-domain-id',
          parentDomainUnitId: 'parent-unit-id',
          name: 'test-unit',
          dataAdminUserProfile,
          ownership: {
            ownerGroups: ['unknown-group'],
          },
        },
        [],
      );
    }).toThrow('Unknown owner group unknown-group');
  });

  it('should throw for unknown account', () => {
    expect(() => {
      new DataZoneDomainUnitConstruct(
        testApp.testStack,
        'test-unit',
        {
          naming: testApp.naming,
          domainId: 'test-domain-id',
          parentDomainUnitId: 'parent-unit-id',
          name: 'test-unit',
          dataAdminUserProfile,
          ownership: {
            ownerAccounts: ['unknown-account'],
          },
        },
        [],
      );
    }).toThrow('Unknown owner account unknown-account');
  });

  it('should expose domainUnitId', () => {
    const construct = new DataZoneDomainUnitConstruct(
      testApp.testStack,
      'test-unit',
      {
        naming: testApp.naming,
        domainId: 'test-domain-id',
        parentDomainUnitId: 'parent-unit-id',
        name: 'test-unit',
        dataAdminUserProfile,
      },
      [],
    );

    expect(construct.domainUnitId).toBeDefined();
  });
});

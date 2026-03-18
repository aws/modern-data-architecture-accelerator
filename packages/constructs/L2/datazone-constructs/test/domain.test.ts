/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { DataZoneDomainConstruct } from '../lib/domain';

describe('DataZoneDomainConstruct', () => {
  let testApp: MdaaTestApp;
  let executionRole: Role;
  let dataAdminRole: Role;
  let kmsKey: Key;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    executionRole = new Role(testApp.testStack, 'ExecRole', {
      assumedBy: new ServicePrincipal('datazone.amazonaws.com'),
    });
    dataAdminRole = new Role(testApp.testStack, 'AdminRole', {
      assumedBy: new ServicePrincipal('datazone.amazonaws.com'),
    });
    kmsKey = new Key(testApp.testStack, 'Key');
  });

  it('should create domain with minimal config', () => {
    new DataZoneDomainConstruct(testApp.testStack, 'test-domain', {
      naming: testApp.naming,
      domainName: 'test-domain',
      domainExecutionRole: executionRole,
      kmsKey,
      dataAdminRole,
      domainVersion: 'V2',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Domain', 1);
  });

  it('should create domain with description', () => {
    new DataZoneDomainConstruct(testApp.testStack, 'test-domain', {
      naming: testApp.naming,
      domainName: 'test-domain',
      domainExecutionRole: executionRole,
      kmsKey,
      dataAdminRole,
      domainVersion: 'V2',
      description: 'Test domain description',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Domain', {
      Description: 'Test domain description',
    });
  });

  it('should create domain with IAM_IDC SSO', () => {
    new DataZoneDomainConstruct(testApp.testStack, 'test-domain', {
      naming: testApp.naming,
      domainName: 'test-domain',
      domainExecutionRole: executionRole,
      kmsKey,
      dataAdminRole,
      domainVersion: 'V2',
      singleSignOnType: 'IAM_IDC',
      userAssignment: 'AUTOMATIC',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Domain', {
      SingleSignOn: {
        Type: 'IAM_IDC',
        UserAssignment: 'AUTOMATIC',
      },
    });
  });

  it('should create V2 domain with service role', () => {
    const serviceRole = new Role(testApp.testStack, 'ServiceRole', {
      assumedBy: new ServicePrincipal('datazone.amazonaws.com'),
    });

    new DataZoneDomainConstruct(testApp.testStack, 'test-domain', {
      naming: testApp.naming,
      domainName: 'test-domain',
      domainExecutionRole: executionRole,
      kmsKey,
      dataAdminRole,
      domainVersion: 'V2',
      serviceRole,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Domain', {
      DomainVersion: 'V2',
    });
  });

  it('should create admin user profile', () => {
    new DataZoneDomainConstruct(testApp.testStack, 'test-domain', {
      naming: testApp.naming,
      domainName: 'test-domain',
      domainExecutionRole: executionRole,
      kmsKey,
      dataAdminRole,
      domainVersion: 'V2',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::UserProfile', {
      UserType: 'IAM_ROLE',
      Status: 'ACTIVATED',
    });
  });

  it('should create admin ownership', () => {
    new DataZoneDomainConstruct(testApp.testStack, 'test-domain', {
      naming: testApp.naming,
      domainName: 'test-domain',
      domainExecutionRole: executionRole,
      kmsKey,
      dataAdminRole,
      domainVersion: 'V2',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Owner', {
      EntityType: 'DOMAIN_UNIT',
    });
  });

  it('should expose domain properties', () => {
    const construct = new DataZoneDomainConstruct(testApp.testStack, 'test-domain', {
      naming: testApp.naming,
      domainName: 'test-domain',
      domainExecutionRole: executionRole,
      kmsKey,
      dataAdminRole,
      domainVersion: 'V2',
    });

    expect(construct.domainId).toBeDefined();
    expect(construct.rootDomainUnitId).toBeDefined();
    expect(construct.dataAdminUserProfile).toBeDefined();
  });

  it('should use parent scope and prefix ids when domainVersion is V1', () => {
    new DataZoneDomainConstruct(testApp.testStack, 'test-domain', {
      naming: testApp.naming,
      domainName: 'test-domain',
      domainExecutionRole: executionRole,
      kmsKey,
      dataAdminRole,
      domainVersion: 'V1',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Domain', 1);
    template.resourceCountIs('AWS::DataZone::UserProfile', 1);
    template.resourceCountIs('AWS::DataZone::Owner', 1);
  });

  it('should not set DomainVersion in CFN when domainVersion is V1', () => {
    new DataZoneDomainConstruct(testApp.testStack, 'test-domain', {
      naming: testApp.naming,
      domainName: 'test-domain',
      domainExecutionRole: executionRole,
      kmsKey,
      dataAdminRole,
      domainVersion: 'V1',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Domain', {
      SingleSignOn: {
        Type: 'DISABLED',
        UserAssignment: 'MANUAL',
      },
    });
  });
});

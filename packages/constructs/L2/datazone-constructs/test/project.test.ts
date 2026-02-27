/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { DomainConfig, MdaaDatazoneProject, MdaaDatazoneProjectProps, MdaaSageMakerProject } from '../lib';

describe('MdaaDatazoneProject', () => {
  let testApp: MdaaTestApp;
  let testDomainConfig: DomainConfig;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    testDomainConfig = new DomainConfig(testApp.testStack, 'domain-config', {
      ssmParamBase: '/test-ssm',
      naming: testApp.naming,
    });
  });

  it('should create basic project', () => {
    const testConstructProps: MdaaDatazoneProjectProps = {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig: testDomainConfig,
    };

    new MdaaDatazoneProject(testApp.testStack, 'test-construct', testConstructProps);

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Project', 1);
  });

  it('should create project with domain unit', () => {
    new MdaaDatazoneProject(testApp.testStack, 'test-project', {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig: testDomainConfig,
      domainUnit: 'test-unit',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Project', 1);
  });

  it('should create project with profile name', () => {
    new MdaaDatazoneProject(testApp.testStack, 'test-project', {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig: testDomainConfig,
      profileName: 'test-profile',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Project', 1);
  });

  it('should create project with project profile ID', () => {
    new MdaaDatazoneProject(testApp.testStack, 'test-project', {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig: testDomainConfig,
      projectProfileId: 'profile-123',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Project', {
      ProjectProfileId: 'profile-123',
    });
  });

  it('should add owner users', () => {
    new MdaaDatazoneProject(testApp.testStack, 'test-project', {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig: testDomainConfig,
      ownerUsers: { 'test-owner': 'arn:aws:iam::123456789012:role/owner' },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::ProjectMembership', {
      Designation: 'PROJECT_OWNER',
    });
  });

  it('should add owner groups', () => {
    new MdaaDatazoneProject(testApp.testStack, 'test-project', {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig: testDomainConfig,
      ownerGroups: {
        'test-owner-group': 'sso-group-owner',
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::ProjectMembership', {
      Designation: 'PROJECT_OWNER',
    });
  });

  it('should add contributor users', () => {
    new MdaaDatazoneProject(testApp.testStack, 'test-project', {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig: testDomainConfig,
      users: { 'test-user': 'arn:aws:iam::123456789012:role/user' },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::ProjectMembership', {
      Designation: 'PROJECT_CONTRIBUTOR',
    });
  });

  it('should add contributor groups', () => {
    new MdaaDatazoneProject(testApp.testStack, 'test-project', {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig: testDomainConfig,
      groups: { 'test-group': 'sso-group-user' },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::ProjectMembership', {
      Designation: 'PROJECT_CONTRIBUTOR',
    });
  });

  it('should create user profile checker for owner users', () => {
    new MdaaDatazoneProject(testApp.testStack, 'test-project', {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig: testDomainConfig,
      ownerUsers: { 'test-owner': 'arn:aws:iam::123456789012:role/owner' },
    });

    const template = Template.fromStack(testApp.testStack);
    const lambdas = template.findResources('AWS::Lambda::Function');
    expect(Object.keys(lambdas).length).toBeGreaterThanOrEqual(1);
  });

  it('should create user profile checker for contributor users', () => {
    new MdaaDatazoneProject(testApp.testStack, 'test-project', {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig: testDomainConfig,
      users: { 'test-user': 'arn:aws:iam::123456789012:role/user' },
    });

    const template = Template.fromStack(testApp.testStack);
    const lambdas = template.findResources('AWS::Lambda::Function');
    expect(Object.keys(lambdas).length).toBeGreaterThanOrEqual(1);
  });

  it('should add multiple members', () => {
    // Add the new group names to the domain config for this test
    const domainConfigWithGroups = new DomainConfig(testApp.testStack, 'domain-config-multi', {
      ssmParamBase: '/test-ssm-multi',
      naming: testApp.naming,
    });

    new MdaaDatazoneProject(testApp.testStack, 'test-project', {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig: domainConfigWithGroups,
      ownerUsers: { 'test-owner': 'arn:aws:iam::123456789012:role/owner' },
      ownerGroups: {
        'test-owner-group': 'sso-group-owner',
      },
      users: { 'test-user': 'arn:aws:iam::123456789012:role/user' },
      groups: { 'test-group': 'sso-group-user' },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::ProjectMembership', 4);
  });

  it('should expose project properties', () => {
    const construct = new MdaaDatazoneProject(testApp.testStack, 'test-project', {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig: testDomainConfig,
    });

    expect(construct.project).toBeDefined();
    expect(construct.domainConfig).toBeDefined();
    expect(construct.domainKmsUsagePolicy).toBeDefined();
  });

  it('should allow adding members dynamically', () => {
    const construct = new MdaaDatazoneProject(testApp.testStack, 'test-project', {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig: testDomainConfig,
    });

    construct.addOwnerUser('test-dynamic-owner', 'arn:aws:iam::123456789012:role/dynamic-owner');
    construct.addOwnerGroup('test-dynamic-group-owner', 'dynamic-group-owner');
    construct.addUser('test-dynamic-user', 'arn:aws:iam::123456789012:role/dynamic-user');
    construct.addGroup('test-dynamic-group', 'dynamic-group-user');

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::ProjectMembership', 4);
  });
});

describe('MdaaSageMakerProject', () => {
  let testApp: MdaaTestApp;
  let testDomainConfig: DomainConfig;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    testDomainConfig = new DomainConfig(testApp.testStack, 'domain-config', {
      ssmParamBase: '/test-ssm',
      naming: testApp.naming,
    });
  });

  it('should create SageMaker project', () => {
    new MdaaSageMakerProject(testApp.testStack, 'test-sm-project', {
      naming: testApp.naming,
      name: 'test-sm-project',
      domainConfig: testDomainConfig,
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Project', 1);
  });

  it('should create environment deployment monitor', () => {
    new MdaaSageMakerProject(testApp.testStack, 'test-sm-project', {
      naming: testApp.naming,
      name: 'test-sm-project',
      domainConfig: testDomainConfig,
    });

    const template = Template.fromStack(testApp.testStack);
    const lambdas = template.findResources('AWS::Lambda::Function');
    expect(Object.keys(lambdas).length).toBeGreaterThanOrEqual(1);
  });

  it('should create monitor project membership', () => {
    new MdaaSageMakerProject(testApp.testStack, 'test-sm-project', {
      naming: testApp.naming,
      name: 'test-sm-project',
      domainConfig: testDomainConfig,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::ProjectMembership', {
      Designation: 'PROJECT_OWNER',
    });
  });

  it('should expose tooling environment ID', () => {
    const construct = new MdaaSageMakerProject(testApp.testStack, 'test-sm-project', {
      naming: testApp.naming,
      name: 'test-sm-project',
      domainConfig: testDomainConfig,
    });

    expect(construct.toolingEnvId).toBeDefined();
  });

  it('should expose glue connection ID', () => {
    const construct = new MdaaSageMakerProject(testApp.testStack, 'test-sm-project', {
      naming: testApp.naming,
      name: 'test-sm-project',
      domainConfig: testDomainConfig,
    });

    expect(construct.glueConnectionId).toBeDefined();
  });
});

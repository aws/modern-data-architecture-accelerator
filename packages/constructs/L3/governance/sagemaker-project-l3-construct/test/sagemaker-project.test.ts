/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { DomainConfig } from '@aws-mdaa/datazone-constructs';
import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { SagemakerProjectL3Construct } from '../lib';

describe('SagemakerProjectL3Construct', () => {
  let testApp: MdaaTestApp;
  let domainConfig: DomainConfig;
  let roleHelper: MdaaRoleHelper;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    domainConfig = new DomainConfig(testApp.testStack, 'domain-config', {
      ssmParamBase: '/test-ssm',
      naming: testApp.naming,
    });
    roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
  });

  it('should create construct with domain config', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
    });

    const template = Template.fromStack(testApp.testStack);
    expect(template).toBeDefined();
  });

  it('should create construct with SSM param', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct2', {
      naming: testApp.naming,
      roleHelper,
      domainConfigSSMParam: '/test-ssm',
    });

    const template = Template.fromStack(testApp.testStack);
    expect(template).toBeDefined();
  });

  it('should throw error when neither domainConfig nor SSM param provided', () => {
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct3', {
        naming: testApp.naming,
        roleHelper,
      });
    }).toThrow('One of domainConfig or domainConfigSSMParam must be specified');
  });
  it('should create project profile', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct4', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'test-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::ProjectProfile', {
      Name: 'test-profile',
      Status: 'ENABLED',
    });
  });
  it('should create SageMaker project', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct5', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'test-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'test-project': { profileName: 'test-profile' },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Project', 1);
  });

  it('should create SageMaker project with config profile reference', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct6', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,

      projects: {
        'test-project': {
          profileName: 'config:test-profile',
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Project', 1);
  });

  it('should create SageMaker project with users and groups', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct8', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,

      projects: {
        'test-project': {
          profileName: 'test-profile',
          users: { 'test-user': 'arn:aws:iam::123456789012:role/user1' },
          groups: { 'test-group': 'sso-group-123' },
          ownerUsers: { 'test-owner': 'arn:aws:iam::123456789012:role/owner1' },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Project', 1);
    // SageMaker projects create 4 memberships: 3 from users/groups/owners + 1 for monitor
    const memberships = template.findResources('AWS::DataZone::ProjectMembership');
    expect(Object.keys(memberships).length).toBeGreaterThanOrEqual(3);
  });

  it('should expose projects', () => {
    const construct = new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct10', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,

      projects: {
        'test-project': { profileName: 'test-profile' },
      },
    });

    expect(construct.projects['test-project']).toBeDefined();
  });

  it('should resolve profile from SSM when not using config prefix', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct11', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,

      projects: {
        'test-project': {
          profileName: 'ssm-profile',
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Project', 1);
  });
});

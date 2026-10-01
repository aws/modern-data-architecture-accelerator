/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaResourceType } from '@aws-mdaa/naming';
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

  it('should not produce duplicate environment names when Tooling is specified in environments', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-dup-tooling', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'dup-profile': {
          environments: {
            Tooling: {
              parameters: {
                overrides: {
                  enableAthena: { value: 'true', isEditable: true },
                },
              },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    const profiles = template.findResources('AWS::DataZone::ProjectProfile');
    const envConfigs = Object.values(profiles)[0].Properties.EnvironmentConfigurations;
    const names = envConfigs.map((c: { Name: string }) => c.Name);
    expect(names.length).toBe(new Set(names).size);
  });

  it('should not produce duplicate environment names when DataLake is specified in environments', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-dup-datalake', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'dup-dl-profile': {
          environments: {
            DataLake: {
              parameters: {
                overrides: {
                  glueDbName: { value: 'my_db', isEditable: true },
                },
              },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    const profiles = template.findResources('AWS::DataZone::ProjectProfile');
    const envConfigs = Object.values(profiles)[0].Properties.EnvironmentConfigurations;
    const names = envConfigs.map((c: { Name: string }) => c.Name);
    expect(names.length).toBe(new Set(names).size);
  });

  it('should merge user overrides with compliance overrides for Tooling', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-merge-tooling', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'merge-profile': {
          environments: {
            Tooling: {
              parameters: {
                overrides: {
                  enableAthena: { value: 'true', isEditable: true },
                },
              },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    const profiles = template.findResources('AWS::DataZone::ProjectProfile');
    const envConfigs = Object.values(profiles)[0].Properties.EnvironmentConfigurations;
    const toolingConfig = envConfigs.find((c: { Name: string }) => c.Name === 'Tooling');
    const paramOverrides = toolingConfig.ConfigurationParameters.ParameterOverrides;

    // User override is present
    expect(paramOverrides).toContainEqual(
      expect.objectContaining({ Name: 'enableAthena', Value: 'true', IsEditable: true }),
    );
    // Compliance overrides are present and not editable
    expect(paramOverrides).toContainEqual(
      expect.objectContaining({ Name: 'sagemakerDomainNetworkType', Value: 'VpcOnly', IsEditable: false }),
    );
    expect(paramOverrides).toContainEqual(
      expect.objectContaining({ Name: 'enableNetworkIsolation', Value: 'true', IsEditable: false }),
    );
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

  it('creates a cross-account RAM share with RAM_RESOURCE_SHARE resource type when projectProfiles have account', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-cross-account', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'cross-account-profile': {
          account: '123456789012',
          environments: {
            DefaultDataLake: {},
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    const expectedRamShareName = testApp.naming
      .withResourceType(MdaaResourceType.RAM_RESOURCE_SHARE)
      .resourceName('project-profiles-config-ssm');
    template.hasResourceProperties('AWS::RAM::ResourceShare', {
      Name: expectedRamShareName,
      Principals: ['123456789012'],
    });
  });

  it('creates a DataZone DataSource with DATAZONE_DATASOURCE resource type when project has dataSources', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-datasources', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'ds-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'ds-project': {
          profileName: 'ds-profile',
          dataSources: {
            'test-source': {
              databaseName: 'test_db',
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    const expectedDataSourceName = testApp.naming
      .withResourceType(MdaaResourceType.DATAZONE_DATASOURCE)
      .resourceName('test-source');
    template.hasResourceProperties('AWS::DataZone::DataSource', {
      Name: expectedDataSourceName,
    });
  });

  it('creates project-owned FormTypes when project has metadataForms', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-forms', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'form-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'form-project': {
          profileName: 'form-profile',
          metadataForms: {
            CustomerForm: {
              description: 'Customer metadata',
              fields: {
                customerName: { type: 'String', required: true, searchable: ['TECHNICAL'] },
                tier: { type: 'String', glossaryId: 'gloss-1' },
              },
            },
            SimpleForm: {
              status: 'DISABLED',
              fields: {
                note: { type: 'String' },
              },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    // Form types are created via a custom resource running under the project-owner
    // custom-resource role (the CloudFormation execution role cannot call CreateFormType).
    template.resourceCountIs('Custom::DataZoneFormType', 2);
    // Form name is used verbatim (no MDAA naming prefix) so it matches the Smithy structure.
    // description is passed through to the custom resource.
    template.hasResourceProperties('Custom::DataZoneFormType', {
      formName: 'CustomerForm',
      status: 'ENABLED',
      description: 'Customer metadata',
    });
    template.hasResourceProperties('Custom::DataZoneFormType', {
      formName: 'SimpleForm',
      status: 'DISABLED',
    });
  });
});

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
  const createTestSetup = () => {
    const testApp = new MdaaTestApp();
    const domainConfig = new DomainConfig(testApp.testStack, 'domain-config', {
      ssmParamBase: '/test-ssm',
      naming: testApp.naming,
    });
    const roleHelper = new MdaaRoleHelper(testApp.testStack, testApp.naming);
    return { testApp, domainConfig, roleHelper };
  };

  it('should create construct with domain config', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
    });

    const template = Template.fromStack(testApp.testStack);
    expect(template).toBeDefined();
  });

  it('should create construct with SSM param', () => {
    const { testApp, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct2', {
      naming: testApp.naming,
      roleHelper,
      domainConfigSSMParam: '/test-ssm',
    });

    const template = Template.fromStack(testApp.testStack);
    expect(template).toBeDefined();
  });

  it('should throw error when neither domainConfig nor SSM param provided', () => {
    const { testApp, roleHelper } = createTestSetup();
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct3', {
        naming: testApp.naming,
        roleHelper,
      });
    }).toThrow('One of domainConfig or domainConfigSSMParam must be specified');
  });

  it('should create project profile', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
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
    const { testApp, domainConfig, roleHelper } = createTestSetup();
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
    const { testApp, domainConfig, roleHelper } = createTestSetup();
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
    const { testApp, domainConfig, roleHelper } = createTestSetup();
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
    const memberships = template.findResources('AWS::DataZone::ProjectMembership');
    expect(Object.keys(memberships).length).toBeGreaterThanOrEqual(3);
  });

  it('should expose projects', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
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
    const { testApp, domainConfig, roleHelper } = createTestSetup();
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

  it('should throw error when environment template not found', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct12', {
        naming: testApp.naming,
        roleHelper,
        domainConfig,
        projectProfiles: {
          'test-profile': {
            environmentsTemplate: 'non-existent-template',
            environments: {},
          },
        },
      });
    }).toThrow('Environment template non-existent-template not found in projectProfileEnvironmentsTemplates');
  });

  it('should create project profile with environmentsTemplate', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct14', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfileEnvironmentsTemplates: {
        'my-template': {},
      },
      projectProfiles: {
        'test-profile': {
          environmentsTemplate: 'my-template',
          environments: {},
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::ProjectProfile', {
      Name: 'test-profile',
    });
  });

  it('should create project with dataSources', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct15', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projects: {
        'test-project': {
          profileName: 'test-profile',
          dataSources: {
            'test-source': {
              databaseName: 'test-db',
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Project', 1);
  });

  it('should create project profile with domain unit', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct12', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'test-profile-du': {
          domainUnit: 'test-unit',
          environments: {
            DefaultDataLake: {},
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::ProjectProfile', {
      Name: 'test-profile-du',
    });
  });

  it('should create project profile with account and region overrides', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct13', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'test-profile-acct': {
          account: '111111111111',
          region: 'us-west-2',
          environments: {
            DefaultDataLake: {},
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::ProjectProfile', {
      Name: 'test-profile-acct',
      EnvironmentConfigurations: [
        { AwsAccount: { AwsAccountId: '111111111111' }, AwsRegion: { RegionName: 'us-west-2' } },
        { AwsAccount: { AwsAccountId: '111111111111' }, AwsRegion: { RegionName: 'us-west-2' } },
        { AwsAccount: { AwsAccountId: '111111111111' }, AwsRegion: { RegionName: 'us-west-2' } },
      ],
    });
  });

  it('should create project profile with deployment mode and order', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct14', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'test-profile-deploy': {
          environments: {
            DefaultDataLake: {
              deploymentMode: 'ON_DEMAND',
              deploymentOrder: 5,
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    const profiles = template.findResources('AWS::DataZone::ProjectProfile');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileResource = Object.values(profiles)[0] as any;
    const envConfigs = profileResource.Properties.EnvironmentConfigurations;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customEnv = envConfigs.find((e: any) => e.Name === 'DefaultDataLake');
    expect(customEnv.DeploymentMode).toBe('ON_DEMAND');
    expect(customEnv.DeploymentOrder).toBe(5);
  });

  it('should create project profile with environment template', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct15', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfileEnvironmentsTemplates: {
        'standard-template': {
          DefaultDataLake: {
            deploymentMode: 'ON_CREATE',
            deploymentOrder: 3,
          },
        },
      },
      projectProfiles: {
        'test-profile-template': {
          environmentsTemplate: 'standard-template',
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::ProjectProfile', {
      Name: 'test-profile-template',
    });
  });

  it('should throw error for missing environment template', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct16', {
        naming: testApp.naming,
        roleHelper,
        domainConfig,
        projectProfiles: {
          'test-profile-bad': {
            environmentsTemplate: 'non-existent-template',
          },
        },
      });
    }).toThrow('Environment template non-existent-template not found');
  });

  it('should create project with data sources', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct17', {
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
        'test-project-ds': {
          profileName: 'test-profile',
          dataSources: {
            'test-datasource': {
              databaseName: 'test-db',
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::DataSource', {
      Type: 'glue',
      Configuration: {
        GlueRunConfiguration: {
          AutoImportDataQualityResult: true,
          RelationalFilterConfigurations: [
            {
              DatabaseName: 'test-db',
            },
          ],
        },
      },
    });
  });

  it('should create project with multiple data sources', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct18', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projects: {
        'test-project-multi-ds': {
          profileName: 'test-profile',
          dataSources: {
            'datasource-1': { databaseName: 'db1' },
            'datasource-2': { databaseName: 'db2' },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::DataSource', 2);
  });

  it('should create LakeFormation permissions for data sources', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct19', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projects: {
        'test-project-lf': {
          profileName: 'test-profile',
          dataSources: {
            'test-ds-lf': {
              databaseName: 'test-lf-db',
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::LakeFormation::PrincipalPermissions', 2);
  });

  it('should create project with environment configs', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct20', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projects: {
        'test-project-envconfig': {
          profileName: 'test-profile',
          environmentConfigs: {
            env1: {
              environmentParameters: [],
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Project', 1);
  });

  it('should create project with domain unit', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct21', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projects: {
        'test-project-du': {
          profileName: 'test-profile',
          domainUnit: 'test-unit',
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Project', 1);
  });

  it('should create project with owner groups', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct22', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projects: {
        'test-project-og': {
          profileName: 'test-profile',
          ownerGroups: { 'owner-group': 'sso-group-456' },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::ProjectMembership', 2);
  });

  it('should create RAM share for cross-account project profiles', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct23', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'cross-account-profile': {
          account: '111111111111',
          environments: {
            DefaultDataLake: {},
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::RAM::ResourceShare', 1);
    template.hasResourceProperties('AWS::RAM::ResourceShare', {
      Principals: ['111111111111'],
    });
  });

  it('should create RAM share for multiple cross-account profiles', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct24', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'profile-1': {
          account: '111111111111',
          environments: { DefaultDataLake: {} },
        },
        'profile-2': {
          account: '111111111111',
          environments: { DefaultDataLake: {} },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::RAM::ResourceShare', 1);
  });

  it('should merge environment template with profile environments', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct25', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfileEnvironmentsTemplates: {
        'base-template': {
          DefaultDataLake: {
            deploymentMode: 'ON_CREATE',
            deploymentOrder: 1,
          },
        },
      },
      projectProfiles: {
        'merged-profile': {
          environmentsTemplate: 'base-template',
          environments: {
            DefaultDataWarehouse: {
              deploymentMode: 'ON_DEMAND',
              deploymentOrder: 2,
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    const profiles = template.findResources('AWS::DataZone::ProjectProfile');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const profileResource = Object.values(profiles)[0] as any;
    const envConfigs = profileResource.Properties.EnvironmentConfigurations;
    expect(envConfigs.length).toBeGreaterThanOrEqual(4);
  });

  it('should create project with account override', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct26', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projects: {
        'test-project-acct': {
          profileName: 'test-profile',
          account: '123456789012',
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Project', 1);
  });

  it('should create profile with custom configuration parameters', () => {
    const { testApp, domainConfig, roleHelper } = createTestSetup();
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-construct27', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'custom-params-profile': {
          environments: {
            DefaultDataLake: {
              deploymentMode: 'ON_CREATE',
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::ProjectProfile', {
      Name: 'custom-params-profile',
    });
  });
});

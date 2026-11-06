/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaResourceType } from '@aws-mdaa/naming';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
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

  it('forwards project nameOverride verbatim to the DataZone project', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-sm-name-override', {
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
        'test-project': { profileName: 'test-profile', nameOverride: 'Customer 360 Analytics' },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Project', {
      Name: 'Customer 360 Analytics',
    });
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

  it('creates a DataZone Connection with DATAZONE_CONNECTION resource type when project has an s3 dataSource', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-s3-datasources', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        's3-ds-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        's3-ds-project': {
          profileName: 's3-ds-profile',
          dataSources: {
            'test-s3-source': {
              s3: {
                bucketName: 'test-bucket',
                prefix: 'test-prefix/',
              },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    const expectedConnectionName = testApp.naming
      .withResourceType(MdaaResourceType.DATAZONE_CONNECTION)
      .resourceName('test-s3-source');
    template.hasResourceProperties('AWS::DataZone::Connection', {
      Name: expectedConnectionName,
      Props: {
        S3Properties: {
          S3Uri: 's3://test-bucket/test-prefix/',
        },
      },
    });
    // The project's environment user role must be granted read access on the registered
    // S3 location, since DataZone does not grant Lake Formation permissions for a raw S3
    // connection the way it does for the Glue data source path.
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: 's3:GetObject*',
            Resource: Match.objectLike({
              'Fn::Join': ['', Match.arrayWith([':s3:::test-bucket/test-prefix/*'])],
            }),
          }),
          Match.objectLike({
            Action: 's3:GetBucketLocation',
            Resource: Match.objectLike({
              'Fn::Join': ['', Match.arrayWith([':s3:::test-bucket'])],
            }),
          }),
          Match.objectLike({
            Action: 's3:ListBucket',
            Condition: { StringLike: { 's3:prefix': ['test-prefix/', 'test-prefix/*'] } },
          }),
        ],
      },
      Roles: Match.arrayWith([
        Match.objectLike({
          'Fn::Select': Match.arrayWith([
            Match.objectLike({
              'Fn::Split': Match.arrayWith([
                Match.objectLike({
                  'Fn::Select': Match.arrayWith([
                    Match.objectLike({
                      'Fn::Split': Match.arrayWith([
                        Match.objectLike({
                          'Fn::GetAtt': Match.arrayWith([
                            Match.stringLikeRegexp('envdeploymentmonitor'),
                            'userRoleArn',
                          ]),
                        }),
                      ]),
                    }),
                  ]),
                }),
              ]),
            }),
          ]),
        }),
      ]),
    });
  });

  it('forwards S3 Access Grants properties to the DataZone Connection', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-s3-access-grants', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        's3-ag-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        's3-ag-project': {
          profileName: 's3-ag-profile',
          dataSources: {
            'test-s3-source': {
              s3: {
                bucketName: 'test-bucket',
                prefix: 'test-prefix/',
                registerS3AccessGrantLocation: true,
                s3AccessGrantLocationId: 'test-access-grant-location-id',
              },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Connection', {
      Props: {
        S3Properties: {
          S3Uri: 's3://test-bucket/test-prefix/',
          RegisterS3AccessGrantLocation: true,
          S3AccessGrantLocationId: 'test-access-grant-location-id',
        },
      },
    });
  });

  it('throws when a dataSource specifies neither databaseName nor s3', () => {
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-missing-datasources', {
        naming: testApp.naming,
        roleHelper,
        domainConfig,
        projectProfiles: {
          'missing-ds-profile': {
            environments: {
              DefaultDataLake: {},
            },
          },
        },
        projects: {
          'missing-ds-project': {
            profileName: 'missing-ds-profile',
            dataSources: {
              'test-missing-source': {},
            },
          },
        },
      });
    }).toThrow(/specify exactly one of 'databaseName' or 's3'/);
  });

  it('throws when a dataSource specifies both databaseName and s3', () => {
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-invalid-datasources', {
        naming: testApp.naming,
        roleHelper,
        domainConfig,
        projectProfiles: {
          'invalid-ds-profile': {
            environments: {
              DefaultDataLake: {},
            },
          },
        },
        projects: {
          'invalid-ds-project': {
            profileName: 'invalid-ds-profile',
            dataSources: {
              'test-invalid-source': {
                databaseName: 'test_db',
                s3: {
                  bucketName: 'test-bucket',
                  prefix: 'test-prefix/',
                },
              },
            },
          },
        },
      });
    }).toThrow(/specify exactly one of 'databaseName' or 's3'/);
  });

  it('forwards publishOnImport, enableSetting, schedule, recommendation and filterExpressions to the DataSource', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-options', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'options-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'options-project': {
          profileName: 'options-profile',
          dataSources: {
            'test-source': {
              databaseName: 'test_db',
              publishOnImport: true,
              enableSetting: 'DISABLED',
              schedule: { schedule: 'cron(0 6 * * ? *)', timezone: 'AMERICA_MONTREAL' },
              recommendation: { enableBusinessNameGeneration: true },
              autoImportDataQualityResult: false,
              filterExpressions: [
                { type: 'INCLUDE', expression: 'dim_*' },
                { type: 'EXCLUDE', expression: 'tmp_*' },
              ],
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::DataSource', {
      PublishOnImport: true,
      EnableSetting: 'DISABLED',
      Schedule: { Schedule: 'cron(0 6 * * ? *)', Timezone: 'AMERICA_MONTREAL' },
      Recommendation: { EnableBusinessNameGeneration: true },
      Configuration: {
        GlueRunConfiguration: Match.objectLike({
          AutoImportDataQualityResult: false,
          RelationalFilterConfigurations: [
            Match.objectLike({
              DatabaseName: 'test_db',
              FilterExpressions: [
                { Type: 'INCLUDE', Expression: 'dim_*' },
                { Type: 'EXCLUDE', Expression: 'tmp_*' },
              ],
            }),
          ],
        }),
      },
    });
  });

  it('defaults autoImportDataQualityResult to true and omits unset optional DataSource fields', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-bare', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'bare-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'bare-project': {
          profileName: 'bare-profile',
          dataSources: {
            'test-source': { databaseName: 'test_db' },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::DataSource', {
      Configuration: {
        GlueRunConfiguration: Match.objectLike({
          AutoImportDataQualityResult: true,
          RelationalFilterConfigurations: [Match.objectLike({ DatabaseName: 'test_db' })],
        }),
      },
      PublishOnImport: Match.absent(),
      EnableSetting: Match.absent(),
      Schedule: Match.absent(),
      Recommendation: Match.absent(),
      AssetFormsInput: Match.absent(),
    });
  });

  it("inherits the project's dataSourceDefaults for fields a data source does not set", () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-defaults', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'defaults-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'defaults-project': {
          profileName: 'defaults-profile',
          dataSourceDefaults: {
            publishOnImport: true,
            enableSetting: 'ENABLED',
            schedule: { schedule: 'cron(0 6 * * ? *)', timezone: 'UTC' },
            recommendation: { enableBusinessNameGeneration: true },
            autoImportDataQualityResult: false,
            filterExpressions: [{ type: 'INCLUDE', expression: 'dim_*' }],
          },
          dataSources: {
            'inherits-defaults': { databaseName: 'inherited_db' },
            'overrides-publish': { databaseName: 'overridden_db', publishOnImport: false },
            'overrides-schedule': {
              databaseName: 'overridden_schedule_db',
              // No timezone: proves the default's timezone isn't deep-merged in alongside it.
              schedule: { schedule: 'cron(0 12 * * ? *)' },
            },
            'overrides-filters': {
              databaseName: 'overridden_filters_db',
              // A single EXCLUDE entry: proves this fully replaces the default's list rather
              // than appending to or merging with it.
              filterExpressions: [{ type: 'EXCLUDE', expression: 'tmp_*' }],
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    // 'inherits-defaults' sets none of these fields, so it picks up every default, including
    // the ones with DataZone-side fallbacks (recommendation, autoImportDataQualityResult,
    // filterExpressions) that could otherwise mask a default failing to apply.
    template.hasResourceProperties('AWS::DataZone::DataSource', {
      Configuration: {
        GlueRunConfiguration: Match.objectLike({
          AutoImportDataQualityResult: false,
          RelationalFilterConfigurations: [
            Match.objectLike({
              DatabaseName: 'inherited_db',
              FilterExpressions: [{ Type: 'INCLUDE', Expression: 'dim_*' }],
            }),
          ],
        }),
      },
      PublishOnImport: true,
      EnableSetting: 'ENABLED',
      Schedule: { Schedule: 'cron(0 6 * * ? *)', Timezone: 'UTC' },
      Recommendation: { EnableBusinessNameGeneration: true },
    });
    // A data source setting publishOnImport itself fully overrides the default for that field,
    // while still inheriting enableSetting/schedule from the default.
    template.hasResourceProperties('AWS::DataZone::DataSource', {
      Configuration: {
        GlueRunConfiguration: Match.objectLike({
          RelationalFilterConfigurations: [Match.objectLike({ DatabaseName: 'overridden_db' })],
        }),
      },
      PublishOnImport: false,
      EnableSetting: 'ENABLED',
      Schedule: { Schedule: 'cron(0 6 * * ? *)', Timezone: 'UTC' },
    });
    // A data source setting its own schedule fully replaces the default schedule object,
    // rather than merging in the default's timezone alongside the overridden cron.
    template.hasResourceProperties('AWS::DataZone::DataSource', {
      Configuration: {
        GlueRunConfiguration: Match.objectLike({
          RelationalFilterConfigurations: [Match.objectLike({ DatabaseName: 'overridden_schedule_db' })],
        }),
      },
      Schedule: { Schedule: 'cron(0 12 * * ? *)', Timezone: Match.absent() },
    });
    // A data source setting its own filterExpressions fully replaces the default list,
    // rather than appending to or merging with it.
    template.hasResourceProperties('AWS::DataZone::DataSource', {
      Configuration: {
        GlueRunConfiguration: Match.objectLike({
          RelationalFilterConfigurations: [
            Match.objectLike({
              DatabaseName: 'overridden_filters_db',
              FilterExpressions: [{ Type: 'EXCLUDE', Expression: 'tmp_*' }],
            }),
          ],
        }),
      },
    });
  });

  it("attaches a data source's referenced metadataForms as AssetFormsInput", () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-forms', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'forms-ds-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'forms-ds-project': {
          profileName: 'forms-ds-profile',
          metadataForms: {
            CustomerForm: {
              fields: { tier: { type: 'String' } },
            },
          },
          dataSources: {
            'test-source': {
              databaseName: 'test_db',
              metadataForms: {
                CustomerForm: { content: '{"tier":"gold"}' },
              },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::DataSource', {
      AssetFormsInput: [
        Match.objectLike({
          FormName: 'CustomerForm',
          TypeIdentifier: 'CustomerForm',
          Content: '{"tier":"gold"}',
          TypeRevision: Match.objectLike({ 'Fn::GetAtt': Match.arrayWith(['revision']) }),
        }),
      ],
    });
  });

  it("throws when a data source's metadataForms references a form not declared under the project", () => {
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-forms-missing', {
        naming: testApp.naming,
        roleHelper,
        domainConfig,
        projectProfiles: {
          'missing-form-profile': {
            environments: {
              DefaultDataLake: {},
            },
          },
        },
        projects: {
          'missing-form-project': {
            profileName: 'missing-form-profile',
            dataSources: {
              'test-source': {
                databaseName: 'test_db',
                metadataForms: {
                  UndeclaredForm: {},
                },
              },
            },
          },
        },
      });
    }).toThrow(/UndeclaredForm.*not declared under this project's metadataForms/);
  });

  it('treats a metadataForms key matching an Object.prototype property as undeclared, not a crash', () => {
    // Regression test for the hasOwnProperty guard: a plain `declaredForms[formName]` lookup
    // would resolve 'constructor' to the inherited Object constructor function rather than
    // undefined, so `!form` would be falsy and `form.formType.getAttString` would throw a
    // TypeError instead of the intended "not declared" error.
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-forms-prototype-pollution', {
        naming: testApp.naming,
        roleHelper,
        domainConfig,
        projectProfiles: {
          'prototype-form-profile': {
            environments: {
              DefaultDataLake: {},
            },
          },
        },
        projects: {
          'prototype-form-project': {
            profileName: 'prototype-form-profile',
            dataSources: {
              'test-source': {
                databaseName: 'test_db',
                metadataForms: {
                  constructor: {},
                },
              },
            },
          },
        },
      });
    }).toThrow(/constructor.*not declared under this project's metadataForms/);
  });

  it('attaches a metadataForms reference with no content, omitting the Content field', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-forms-no-content', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'forms-no-content-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'forms-no-content-project': {
          profileName: 'forms-no-content-profile',
          metadataForms: {
            CustomerForm: {
              fields: { tier: { type: 'String' } },
            },
          },
          dataSources: {
            'test-source': {
              databaseName: 'test_db',
              metadataForms: {
                CustomerForm: {},
              },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::DataSource', {
      AssetFormsInput: [
        Match.objectLike({
          FormName: 'CustomerForm',
          TypeIdentifier: 'CustomerForm',
          Content: Match.absent(),
        }),
      ],
    });
  });

  it("throws when a data source's metadataForms references a DISABLED form", () => {
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-forms-disabled', {
        naming: testApp.naming,
        roleHelper,
        domainConfig,
        projectProfiles: {
          'disabled-form-profile': {
            environments: {
              DefaultDataLake: {},
            },
          },
        },
        projects: {
          'disabled-form-project': {
            profileName: 'disabled-form-profile',
            metadataForms: {
              RetiredForm: {
                status: 'DISABLED',
                fields: { tier: { type: 'String' } },
              },
            },
            dataSources: {
              'test-source': {
                databaseName: 'test_db',
                metadataForms: { RetiredForm: {} },
              },
            },
          },
        },
      });
    }).toThrow(/RetiredForm.*DISABLED.*retained but not attachable/);
  });

  it("throws when a metadataForms reference's content is not valid JSON", () => {
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-forms-invalid-json', {
        naming: testApp.naming,
        roleHelper,
        domainConfig,
        projectProfiles: {
          'invalid-json-profile': {
            environments: {
              DefaultDataLake: {},
            },
          },
        },
        projects: {
          'invalid-json-project': {
            profileName: 'invalid-json-profile',
            metadataForms: {
              CustomerForm: {
                fields: { tier: { type: 'String' } },
              },
            },
            dataSources: {
              'test-source': {
                databaseName: 'test_db',
                metadataForms: { CustomerForm: { content: 'not json' } },
              },
            },
          },
        },
      });
    }).toThrow(/CustomerForm.*content is not valid JSON/);
  });

  it("throws when a metadataForms reference's content names a field the form does not declare", () => {
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-forms-undeclared-field', {
        naming: testApp.naming,
        roleHelper,
        domainConfig,
        projectProfiles: {
          'undeclared-field-profile': {
            environments: {
              DefaultDataLake: {},
            },
          },
        },
        projects: {
          'undeclared-field-project': {
            profileName: 'undeclared-field-profile',
            metadataForms: {
              CustomerForm: {
                fields: { tier: { type: 'String' } },
              },
            },
            dataSources: {
              'test-source': {
                databaseName: 'test_db',
                metadataForms: { CustomerForm: { content: '{"region":"us-east-1"}' } },
              },
            },
          },
        },
      });
    }).toThrow(/CustomerForm.*content references field\(s\) \[region\] the form does not declare/);
  });

  it('throws when a metadataForms reference omits a field the form declares required', () => {
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-forms-missing-required', {
        naming: testApp.naming,
        roleHelper,
        domainConfig,
        projectProfiles: {
          'missing-required-profile': {
            environments: {
              DefaultDataLake: {},
            },
          },
        },
        projects: {
          'missing-required-project': {
            profileName: 'missing-required-profile',
            metadataForms: {
              CustomerForm: {
                fields: { owner: { type: 'String', required: true } },
              },
            },
            dataSources: {
              // No content at all: a required field must still be enforced, since the
              // @default doc for `content` only applies when the form has no required fields.
              'test-source': {
                databaseName: 'test_db',
                metadataForms: { CustomerForm: {} },
              },
            },
          },
        },
      });
    }).toThrow(/CustomerForm.*content is missing required field\(s\) \[owner\]/);
  });

  it('attaches a metadataForms reference whose content satisfies all required fields', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-forms-required-satisfied', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'required-satisfied-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'required-satisfied-project': {
          profileName: 'required-satisfied-profile',
          metadataForms: {
            CustomerForm: {
              fields: { owner: { type: 'String', required: true } },
            },
          },
          dataSources: {
            'test-source': {
              databaseName: 'test_db',
              metadataForms: { CustomerForm: { content: '{"owner":"data-team"}' } },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::DataSource', {
      AssetFormsInput: [Match.objectLike({ FormName: 'CustomerForm', Content: '{"owner":"data-team"}' })],
    });
  });

  it('throws when metadataForms is set directly on an s3 data source (no AssetFormsInput support on a Connection)', () => {
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-forms-s3-rejected', {
        naming: testApp.naming,
        roleHelper,
        domainConfig,
        projectProfiles: {
          's3-forms-profile': {
            environments: {
              DefaultDataLake: {},
            },
          },
        },
        projects: {
          's3-forms-project': {
            profileName: 's3-forms-profile',
            dataSources: {
              'test-s3-source': {
                s3: { bucketName: 'test-bucket' },
                // Not declared under this project's metadataForms either; proves the field is
                // rejected before resolveDataSourceMetadataForms would otherwise throw on it.
                metadataForms: { UndeclaredForm: {} },
              },
            },
          },
        },
      });
    }).toThrow(/\[metadataForms\] only apply to Glue \('databaseName'\) data sources/);
  });

  it('throws listing every Glue-only field set directly on an s3 data source', () => {
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-glue-fields-s3-rejected', {
        naming: testApp.naming,
        roleHelper,
        domainConfig,
        projectProfiles: {
          's3-glue-fields-profile': {
            environments: {
              DefaultDataLake: {},
            },
          },
        },
        projects: {
          's3-glue-fields-project': {
            profileName: 's3-glue-fields-profile',
            dataSources: {
              'test-s3-source': {
                s3: { bucketName: 'test-bucket' },
                publishOnImport: true,
                autoImportDataQualityResult: false,
              },
            },
          },
        },
      });
    }).toThrow(/\[publishOnImport, autoImportDataQualityResult\] only apply to Glue/);
  });

  it("ignores the project's dataSourceDefaults on an s3 data source (no equivalent Connection properties)", () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-defaults-s3-ignored', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        's3-defaults-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        's3-defaults-project': {
          profileName: 's3-defaults-profile',
          // publishOnImport/enableSetting/schedule/recommendation have no equivalent on an
          // AWS::DataZone::Connection; this proves they're silently not applied, as documented.
          dataSourceDefaults: {
            publishOnImport: true,
            enableSetting: 'ENABLED',
            schedule: { schedule: 'cron(0 6 * * ? *)', timezone: 'UTC' },
            recommendation: { enableBusinessNameGeneration: true },
          },
          dataSources: {
            'test-s3-source': {
              s3: { bucketName: 'test-bucket' },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::DataSource', 0);
    template.hasResourceProperties('AWS::DataZone::Connection', {
      Props: {
        S3Properties: Match.objectLike({
          S3Uri: Match.stringLikeRegexp('s3://test-bucket'),
        }),
      },
    });
  });

  it('throws when a data source declares more metadataForms than DataZone allows per data source', () => {
    const tooManyForms = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`Form${i}`, {}]));
    expect(() => {
      new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-forms-too-many', {
        naming: testApp.naming,
        roleHelper,
        domainConfig,
        projectProfiles: {
          'too-many-forms-profile': {
            environments: {
              DefaultDataLake: {},
            },
          },
        },
        projects: {
          'too-many-forms-project': {
            profileName: 'too-many-forms-profile',
            dataSources: {
              'test-source': {
                databaseName: 'test_db',
                metadataForms: tooManyForms,
              },
            },
          },
        },
      });
    }).toThrow(/declares 11 metadataForms, which exceeds the maximum of 10/);
  });

  it('accepts exactly 10 metadataForms on a data source (the DataZone-allowed maximum)', () => {
    const formNames = Array.from({ length: 10 }, (_, i) => `Form${i}`);
    const declaredForms = Object.fromEntries(
      formNames.map(formName => [formName, { fields: { tier: { type: 'String' as const } } }]),
    );
    const referencedForms = Object.fromEntries(formNames.map(formName => [formName, {}]));
    new SagemakerProjectL3Construct(testApp.testStack, 'test-datasource-forms-exactly-max', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'exactly-max-forms-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'exactly-max-forms-project': {
          profileName: 'exactly-max-forms-profile',
          metadataForms: declaredForms,
          dataSources: {
            'test-source': {
              databaseName: 'test_db',
              metadataForms: referencedForms,
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    const resources = template.findResources('AWS::DataZone::DataSource');
    const assetFormsInput = Object.values(resources)[0].Properties.AssetFormsInput;
    expect(assetFormsInput).toHaveLength(10);
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

  it('creates project-owned Glossaries and Terms when project has glossaries', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-glossaries', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'glossary-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'glossary-project': {
          profileName: 'glossary-profile',
          glossaries: {
            CustomerGlossary: {
              description: 'Standard business terms',
              terms: {
                CustomerLifetimeValue: { description: 'CLV' },
              },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('Custom::DataZoneGlossary', 1);
    template.resourceCountIs('Custom::DataZoneGlossaryTerm', 1);
    template.hasResourceProperties('Custom::DataZoneGlossary', {
      glossaryName: 'CustomerGlossary',
      description: 'Standard business terms',
    });
    template.hasResourceProperties('Custom::DataZoneGlossaryTerm', {
      termName: 'CustomerLifetimeValue',
      shortDescription: 'CLV',
    });
    // CreateGlossary needs the custom-resource role's PROJECT_OWNER membership to succeed,
    // so the glossary must wait for it.
    const membershipLogicalId = Object.keys(template.findResources('AWS::DataZone::ProjectMembership'))[0];
    const glossaryResource = Object.values(template.findResources('Custom::DataZoneGlossary'))[0];
    expect(glossaryResource.DependsOn).toContain(membershipLogicalId);
  });

  it('passes an explicit glossary status through to the custom resource', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-glossary-status', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'glossary-status-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'glossary-status-project': {
          profileName: 'glossary-status-profile',
          glossaries: {
            RetiredGlossary: {
              status: 'DISABLED',
              terms: {
                LegacyTerm: { description: 'No longer used' },
              },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::DataZoneGlossary', {
      glossaryName: 'RetiredGlossary',
      status: 'DISABLED',
    });
  });

  it("resolves a term's relatesTo referencing another term in the same glossary", () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-relates-to-same-glossary', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'relates-to-profile': { environments: { DefaultDataLake: {} } },
      },
      projects: {
        'relates-to-project': {
          profileName: 'relates-to-profile',
          glossaries: {
            CustomerGlossary: {
              terms: {
                CreditCard: { description: 'Credit card payment', relatesTo: ['PaymentMethod'] },
                PaymentMethod: { description: 'A way to pay' },
              },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('Custom::DataZoneGlossaryTermRelations', 1);
    const terms = template.findResources('Custom::DataZoneGlossaryTerm');
    const paymentMethodLogicalId = Object.entries(terms).find(
      ([, resource]) => resource.Properties.termName === 'PaymentMethod',
    )?.[0];
    const relations = Object.values(template.findResources('Custom::DataZoneGlossaryTermRelations'))[0];
    expect(JSON.stringify(relations.Properties.relatedTermIds)).toContain(paymentMethodLogicalId);
  });

  it("resolves a term's relatesTo referencing a term in a different glossary in the same project", () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-relates-to-cross-glossary', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'relates-to-profile': { environments: { DefaultDataLake: {} } },
      },
      projects: {
        'relates-to-project': {
          profileName: 'relates-to-profile',
          glossaries: {
            PaymentGlossary: {
              terms: { CreditCard: { relatesTo: ['FinanceGlossary.PaymentMethod'] } },
            },
            FinanceGlossary: {
              terms: { PaymentMethod: { description: 'A way to pay' } },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    const terms = template.findResources('Custom::DataZoneGlossaryTerm');
    const logicalIdFor = (name: string) =>
      Object.entries(terms).find(([, resource]) => resource.Properties.termName === name)?.[0];
    const creditCardLogicalId = logicalIdFor('CreditCard');
    const paymentMethodLogicalId = logicalIdFor('PaymentMethod');

    template.resourceCountIs('Custom::DataZoneGlossaryTermRelations', 1);
    const relations = Object.values(template.findResources('Custom::DataZoneGlossaryTermRelations'))[0];

    expect(relations.Properties.relatedTermIds).toEqual([{ 'Fn::GetAtt': [paymentMethodLogicalId, 'termId'] }]);
    // Both the owning term and the cross-glossary related term must exist first - not just
    // "two dependencies from somewhere", but specifically these two.
    expect(relations.DependsOn).toHaveLength(2);
    expect(relations.DependsOn).toEqual(expect.arrayContaining([creditCardLogicalId, paymentMethodLogicalId]));
  });

  it("resolves a term's relatesTo mixing a bare name, a cross-glossary reference, and a literal ID, in order", () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-relates-to-mixed', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'relates-to-profile': { environments: { DefaultDataLake: {} } },
      },
      projects: {
        'relates-to-project': {
          profileName: 'relates-to-profile',
          glossaries: {
            CustomerGlossary: {
              terms: {
                CreditCard: { relatesTo: ['PaymentMethod', 'FinanceGlossary.Loan', 'trm-pre-existing-123'] },
                PaymentMethod: {},
              },
            },
            FinanceGlossary: {
              terms: { Loan: {} },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    const terms = template.findResources('Custom::DataZoneGlossaryTerm');
    const logicalIdFor = (name: string) =>
      Object.entries(terms).find(([, resource]) => resource.Properties.termName === name)?.[0];
    const paymentMethodLogicalId = logicalIdFor('PaymentMethod');
    const loanLogicalId = logicalIdFor('Loan');
    const creditCardLogicalId = logicalIdFor('CreditCard');

    template.resourceCountIs('Custom::DataZoneGlossaryTermRelations', 1);
    const relations = Object.values(template.findResources('Custom::DataZoneGlossaryTermRelations'))[0];

    expect(relations.Properties.relatedTermIds).toEqual([
      { 'Fn::GetAtt': [paymentMethodLogicalId, 'termId'] },
      { 'Fn::GetAtt': [loanLogicalId, 'termId'] },
      'trm-pre-existing-123',
    ]);
    // One DependsOn per declared target (PaymentMethod, Loan) plus the owning term
    // (CreditCard); the literal ID contributes none.
    expect(relations.DependsOn).toHaveLength(3);
    expect(relations.DependsOn).toEqual(
      expect.arrayContaining([paymentMethodLogicalId, loanLogicalId, creditCardLogicalId]),
    );
  });

  it('throws on a circular relatesTo reference, naming the full cross-glossary cycle path', () => {
    expect(
      () =>
        new SagemakerProjectL3Construct(testApp.testStack, 'test-relates-to-cycle', {
          naming: testApp.naming,
          roleHelper,
          domainConfig,
          projectProfiles: {
            'relates-to-profile': { environments: { DefaultDataLake: {} } },
          },
          projects: {
            'relates-to-project': {
              profileName: 'relates-to-profile',
              glossaries: {
                CustomerGlossary: {
                  terms: {
                    A: { relatesTo: ['FinanceGlossary.B'] },
                  },
                },
                FinanceGlossary: {
                  terms: {
                    B: { relatesTo: ['CustomerGlossary.A'] },
                  },
                },
              },
            },
          },
        }),
    ).toThrow(
      /Circular relatesTo reference.*CustomerGlossary\.A -> FinanceGlossary\.B -> CustomerGlossary\.A.*cannot be both directly and indirectly/,
    );
  });

  it('throws when more than MAX_RELATES_TO terms declare the same relatesTo target', () => {
    const terms = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [`Child${i}`, { relatesTo: ['Parent'] }]));
    expect(
      () =>
        new SagemakerProjectL3Construct(testApp.testStack, 'test-relates-to-excess-has-types', {
          naming: testApp.naming,
          roleHelper,
          domainConfig,
          projectProfiles: {
            'relates-to-profile': { environments: { DefaultDataLake: {} } },
          },
          projects: {
            'relates-to-project': {
              profileName: 'relates-to-profile',
              glossaries: {
                CustomerGlossary: {
                  terms: { ...terms, Parent: {} },
                },
              },
            },
          },
        }),
    ).toThrow(/Term 'CustomerGlossary.Parent'.*is named in the relatesTo of 11 terms.*at most 10 "Has Types"/);
  });

  it('throws when relatesTo references an undeclared term on a declared glossary', () => {
    expect(
      () =>
        new SagemakerProjectL3Construct(testApp.testStack, 'test-relates-to-undeclared-term', {
          naming: testApp.naming,
          roleHelper,
          domainConfig,
          projectProfiles: {
            'relates-to-profile': { environments: { DefaultDataLake: {} } },
          },
          projects: {
            'relates-to-project': {
              profileName: 'relates-to-profile',
              glossaries: {
                CustomerGlossary: {
                  terms: { CreditCard: { relatesTo: ['CustomerGlossary.Missing'] } },
                },
              },
            },
          },
        }),
    ).toThrow(/relatesTo 'CustomerGlossary.Missing'.*references an undeclared term/);
  });

  it('passes through an unresolved bare relatesTo entry as a literal, pre-existing term ID', () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-relates-to-literal', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'relates-to-profile': { environments: { DefaultDataLake: {} } },
      },
      projects: {
        'relates-to-project': {
          profileName: 'relates-to-profile',
          glossaries: {
            CustomerGlossary: {
              terms: { CreditCard: { relatesTo: ['trm-pre-existing-123'] } },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::DataZoneGlossaryTermRelations', {
      relatedTermIds: ['trm-pre-existing-123'],
    });
    Annotations.fromStack(testApp.testStack).hasWarning(
      '*',
      Match.stringLikeRegexp("relatesTo 'trm-pre-existing-123'.*does not match any term declared"),
    );
  });

  it('throws when a dotted relatesTo entry references a glossary not declared by any project', () => {
    // DataZone term IDs never contain a period, so a dotted value whose glossary segment
    // isn't declared anywhere can never be a valid literal term ID either.
    expect(
      () =>
        new SagemakerProjectL3Construct(testApp.testStack, 'test-relates-to-dotted-unowned', {
          naming: testApp.naming,
          roleHelper,
          domainConfig,
          projectProfiles: {
            'relates-to-profile': { environments: { DefaultDataLake: {} } },
          },
          projects: {
            'relates-to-project': {
              profileName: 'relates-to-profile',
              glossaries: {
                CustomerGlossary: {
                  terms: { CreditCard: { relatesTo: ['NobodyGlossary.SomeTerm'] } },
                },
              },
            },
          },
        }),
    ).toThrow(
      /relatesTo 'NobodyGlossary.SomeTerm'.*does not match any glossary declared under this project's glossaries/,
    );
  });

  it('throws when a dotted relatesTo entry references a glossary declared by another project', () => {
    expect(
      () =>
        new SagemakerProjectL3Construct(testApp.testStack, 'test-relates-to-dotted-cross-project', {
          naming: testApp.naming,
          roleHelper,
          domainConfig,
          projectProfiles: {
            'relates-to-profile': { environments: { DefaultDataLake: {} } },
          },
          projects: {
            'relates-to-project': {
              profileName: 'relates-to-profile',
              glossaries: {
                CustomerGlossary: {
                  terms: { CreditCard: { relatesTo: ['OtherProjectGlossary.SomeTerm'] } },
                },
              },
            },
            'other-project': {
              profileName: 'relates-to-profile',
              glossaries: {
                OtherProjectGlossary: { terms: { SomeTerm: {} } },
              },
            },
          },
        }),
    ).toThrow(/relatesTo 'OtherProjectGlossary.SomeTerm'.*references a glossary declared by project 'other-project'/);
  });

  it("resolves a form field's glossaryId referencing a declared glossary term", () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-glossary-form-link', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'linked-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'linked-project': {
          profileName: 'linked-profile',
          glossaries: {
            CustomerGlossary: {
              terms: { Tier: { description: 'Customer tier' } },
            },
          },
          metadataForms: {
            CustomerForm: {
              fields: {
                tier: { type: 'String', glossaryId: 'CustomerGlossary.Tier' },
              },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    const forms = template.findResources('Custom::DataZoneFormType');
    const formResource = Object.values(forms)[0];
    const modelStructure = JSON.stringify(formResource.Properties.modelStructure);
    // It must resolve to the GLOSSARY's id, not the term's: DataZone's
    // @amazon.datazone#glossaryterm("<id>") trait takes the glossary's id (the field accepts
    // any term from that glossary), and rejects a term id with "Glossary <id> not found".
    const glossaryLogicalId = Object.keys(template.findResources('Custom::DataZoneGlossary'))[0];
    const termLogicalId = Object.keys(template.findResources('Custom::DataZoneGlossaryTerm'))[0];
    expect(modelStructure).toContain(JSON.stringify({ 'Fn::GetAtt': [glossaryLogicalId, 'glossaryId'] }).slice(1, -1));
    expect(modelStructure).not.toContain(termLogicalId);
    // The form must still depend on the term custom resource, so the field isn't usable
    // before at least the named term exists.
    expect(formResource.DependsOn).toEqual(expect.arrayContaining([termLogicalId]));
  });

  it("throws when a form field's glossaryId references an undeclared glossary term", () => {
    expect(
      () =>
        new SagemakerProjectL3Construct(testApp.testStack, 'test-glossary-form-link-missing', {
          naming: testApp.naming,
          roleHelper,
          domainConfig,
          projectProfiles: {
            'missing-profile': {
              environments: {
                DefaultDataLake: {},
              },
            },
          },
          projects: {
            'missing-project': {
              profileName: 'missing-profile',
              metadataForms: {
                CustomerForm: {
                  fields: {
                    tier: { type: 'String', glossaryId: 'UndeclaredGlossary.Tier' },
                  },
                },
              },
            },
          },
        }),
    ).toThrow(/references an undeclared glossary term/);
  });

  it("throws when a form field's glossaryId references an undeclared term on a declared glossary", () => {
    expect(
      () =>
        new SagemakerProjectL3Construct(testApp.testStack, 'test-glossary-form-link-missing-term', {
          naming: testApp.naming,
          roleHelper,
          domainConfig,
          projectProfiles: {
            'missing-term-profile': {
              environments: {
                DefaultDataLake: {},
              },
            },
          },
          projects: {
            'missing-term-project': {
              profileName: 'missing-term-profile',
              glossaries: {
                CustomerGlossary: {
                  terms: { Segment: { description: 'Customer segment' } },
                },
              },
              metadataForms: {
                CustomerForm: {
                  fields: {
                    // Glossary is declared, but 'Tier' is not one of its terms.
                    tier: { type: 'String', glossaryId: 'CustomerGlossary.Tier' },
                  },
                },
              },
            },
          },
        }),
    ).toThrow(/references an undeclared glossary term/);
  });

  it("throws when a form field's glossaryId contains more than one period", () => {
    expect(
      () =>
        new SagemakerProjectL3Construct(testApp.testStack, 'test-glossary-form-link-multi-period', {
          naming: testApp.naming,
          roleHelper,
          domainConfig,
          projectProfiles: {
            'multi-period-profile': {
              environments: {
                DefaultDataLake: {},
              },
            },
          },
          projects: {
            'multi-period-project': {
              profileName: 'multi-period-profile',
              glossaries: {
                CustomerGlossary: {
                  terms: { Tier: { description: 'Customer tier' } },
                },
              },
              metadataForms: {
                CustomerForm: {
                  fields: {
                    // Only the first period splits glossary from term, so this looks up term
                    // 'Tier.Extra' on the declared 'CustomerGlossary' glossary, which doesn't
                    // exist (its only term is 'Tier') and so still reports as undeclared.
                    tier: { type: 'String', glossaryId: 'CustomerGlossary.Tier.Extra' },
                  },
                },
              },
            },
          },
        }),
    ).toThrow(/references an undeclared glossary term/);
  });

  it("resolves a form field's glossaryId referencing a declared glossary with no term suffix", () => {
    new SagemakerProjectL3Construct(testApp.testStack, 'test-glossary-form-link-bare', {
      naming: testApp.naming,
      roleHelper,
      domainConfig,
      projectProfiles: {
        'bare-profile': {
          environments: {
            DefaultDataLake: {},
          },
        },
      },
      projects: {
        'bare-project': {
          profileName: 'bare-profile',
          glossaries: {
            // A glossary can be referenced directly by name even when it has terms: the field
            // accepts any term from the glossary, not just this one.
            ProductGlossary: {
              terms: { Sku: { description: 'Product SKU' } },
            },
          },
          metadataForms: {
            CustomerForm: {
              fields: {
                tier: { type: 'String', glossaryId: 'ProductGlossary' },
              },
            },
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    const forms = template.findResources('Custom::DataZoneFormType');
    const formResource = Object.values(forms)[0];
    const modelStructure = JSON.stringify(formResource.Properties.modelStructure);
    const glossaryLogicalId = Object.keys(template.findResources('Custom::DataZoneGlossary'))[0];
    const termLogicalId = Object.keys(template.findResources('Custom::DataZoneGlossaryTerm'))[0];
    expect(modelStructure).toContain(JSON.stringify({ 'Fn::GetAtt': [glossaryLogicalId, 'glossaryId'] }).slice(1, -1));
    // No term was named, so the reference resolves to the glossary itself, not one of its terms.
    expect(modelStructure).not.toContain(termLogicalId);
    // No term dependency was added: the field didn't name a specific term, so there's nothing
    // beyond the glossary's own (unnamed, since no term is required to exist for this field).
    expect(formResource.DependsOn).not.toEqual(expect.arrayContaining([termLogicalId]));
  });

  it('does not mistake an inherited Object property for a declared glossary or term', () => {
    expect(
      () =>
        new SagemakerProjectL3Construct(testApp.testStack, 'test-glossary-form-link-prototype', {
          naming: testApp.naming,
          roleHelper,
          domainConfig,
          projectProfiles: {
            'prototype-profile': {
              environments: {
                DefaultDataLake: {},
              },
            },
          },
          projects: {
            'prototype-project': {
              profileName: 'prototype-profile',
              glossaries: {
                CustomerGlossary: {
                  terms: { Tier: { description: 'Customer tier' } },
                },
              },
              metadataForms: {
                CustomerForm: {
                  fields: {
                    // 'constructor' is inherited from Object.prototype on a plain object; a
                    // lookup without an own-property guard would resolve it to a function
                    // instead of undefined, crashing instead of reporting it as undeclared.
                    tier: { type: 'String', glossaryId: 'constructor.Tier' },
                  },
                },
              },
            },
          },
        }),
    ).toThrow(/references an undeclared glossary term/);
  });

  it('throws when two projects declare the same glossary key', () => {
    expect(
      () =>
        new SagemakerProjectL3Construct(testApp.testStack, 'test-glossary-duplicate-key', {
          naming: testApp.naming,
          roleHelper,
          domainConfig,
          projectProfiles: {
            'dup-profile': {
              environments: {
                DefaultDataLake: {},
              },
            },
          },
          projects: {
            'dup-project-a': {
              profileName: 'dup-profile',
              glossaries: {
                SharedGlossary: { terms: { Tier: { description: 'Tier' } } },
              },
            },
            'dup-project-b': {
              profileName: 'dup-profile',
              glossaries: {
                SharedGlossary: { terms: { Tier: { description: 'Tier' } } },
              },
            },
          },
        }),
    ).toThrow(/Duplicate glossary key.*SharedGlossary.*dup-project-a.*dup-project-b/);
  });

  it("throws when a form field's bare glossaryId references a glossary declared by a different project", () => {
    expect(
      () =>
        new SagemakerProjectL3Construct(testApp.testStack, 'test-glossary-cross-project', {
          naming: testApp.naming,
          roleHelper,
          domainConfig,
          projectProfiles: {
            'cross-profile': {
              environments: {
                DefaultDataLake: {},
              },
            },
          },
          projects: {
            'owning-project': {
              profileName: 'cross-profile',
              glossaries: {
                CustomerGlossary: {},
              },
            },
            'referencing-project': {
              profileName: 'cross-profile',
              metadataForms: {
                CustomerForm: {
                  fields: {
                    // 'CustomerGlossary' is declared, but by a different project.
                    tier: { type: 'String', glossaryId: 'CustomerGlossary' },
                  },
                },
              },
            },
          },
        }),
    ).toThrow(/references a glossary declared by project 'owning-project'/);
  });
});

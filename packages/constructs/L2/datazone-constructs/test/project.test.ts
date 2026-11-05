/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
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

  it('project Name uses DATAZONE_PROJECT resource type', () => {
    new MdaaDatazoneProject(testApp.testStack, 'test-construct', {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig: testDomainConfig,
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Project', {
      Name: testApp.naming.withResourceType(MdaaResourceType.DATAZONE_PROJECT).resourceName('test-project', 64),
    });
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

  describe('nameOverride', () => {
    it('uses the value verbatim, bypassing the naming class (spaces and mixed case preserved)', () => {
      new MdaaDatazoneProject(testApp.testStack, 'test-project', {
        naming: testApp.naming,
        name: 'test-project',
        domainConfig: testDomainConfig,
        nameOverride: 'Customer 360 Analytics',
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::DataZone::Project', {
        Name: 'Customer 360 Analytics',
      });
    });

    it('wins over the derived name (no org-env-domain-module prefix, no lowercasing)', () => {
      const construct = new MdaaDatazoneProject(testApp.testStack, 'test-project', {
        naming: testApp.naming,
        name: 'test-project',
        domainConfig: testDomainConfig,
        nameOverride: 'Fraud Analytics Sandbox',
      });

      const derived = testApp.naming
        .withResourceType(MdaaResourceType.DATAZONE_PROJECT)
        .resourceName('test-project', 64);
      expect(construct.generatedProjectName).toEqual('Fraud Analytics Sandbox');
      expect(construct.generatedProjectName).not.toEqual(derived);
    });

    it('throws on a value longer than 64 characters', () => {
      expect(() => {
        new MdaaDatazoneProject(testApp.testStack, 'test-project', {
          naming: testApp.naming,
          name: 'test-project',
          domainConfig: testDomainConfig,
          nameOverride: 'a'.repeat(65),
        });
      }).toThrow(/Invalid nameOverride/);
    });

    it('throws on an empty string instead of falling back to the derived name', () => {
      expect(() => {
        new MdaaDatazoneProject(testApp.testStack, 'test-project', {
          naming: testApp.naming,
          name: 'test-project',
          domainConfig: testDomainConfig,
          nameOverride: '',
        });
      }).toThrow(/Invalid nameOverride/);
    });

    it('throws on characters outside ^[\\w -]+$', () => {
      expect(() => {
        new MdaaDatazoneProject(testApp.testStack, 'test-project', {
          naming: testApp.naming,
          name: 'test-project',
          domainConfig: testDomainConfig,
          nameOverride: 'Bad@Name!',
        });
      }).toThrow(/Invalid nameOverride/);
    });

    it('accepts underscores, hyphens, digits and single characters', () => {
      expect(MdaaDatazoneProject.resourceNameFromNameOverride('a')).toEqual('a');
      expect(MdaaDatazoneProject.resourceNameFromNameOverride('Team_A-42 Workspace')).toEqual('Team_A-42 Workspace');
    });

    it('passes an unresolved SSM token through to the project Name instead of throwing', () => {
      new MdaaDatazoneProject(testApp.testStack, 'test-project', {
        naming: testApp.naming,
        name: 'test-project',
        domainConfig: testDomainConfig,
        nameOverride: StringParameter.valueForStringParameter(testApp.testStack, '/test/project-name'),
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::DataZone::Project', {
        Name: { Ref: Match.stringLikeRegexp('^SsmParameterValuetestprojectname') },
      });
    });
  });

  describe('environmentConfigurations', () => {
    it('addresses by environmentConfigurationName and omits projectProfileVersion when no environmentId is given', () => {
      new MdaaDatazoneProject(testApp.testStack, 'test-project', {
        naming: testApp.naming,
        name: 'test-project',
        domainConfig: testDomainConfig,
        environmentConfigurations: {
          Tooling: { parameters: { glueDbName: 'my_db' } },
        },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::DataZone::Project', {
        // Regression guard: an existing ACTIVE project whose entries have no environmentId
        // yet must synth byte-identical to before this property existed - introducing it
        // here would itself make CloudFormation call UpdateProject, with UserParameters
        // still addressed by configuration name, which DataZone rejects once ACTIVE.
        ProjectProfileVersion: Match.absent(),
        UserParameters: [
          Match.objectEquals({
            EnvironmentConfigurationName: 'Tooling',
            EnvironmentParameters: [{ Name: 'glueDbName', Value: 'my_db' }],
          }),
        ],
      });
    });

    it('addresses by environmentId instead, when given', () => {
      new MdaaDatazoneProject(testApp.testStack, 'test-project', {
        naming: testApp.naming,
        name: 'test-project',
        domainConfig: testDomainConfig,
        environmentConfigurations: {
          Tooling: { parameters: { glueDbName: 'my_db' }, environmentId: 'abc123env' },
        },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::DataZone::Project', {
        ProjectProfileVersion: 'latest',
        UserParameters: [
          Match.objectEquals({
            EnvironmentId: 'abc123env',
            EnvironmentParameters: [{ Name: 'glueDbName', Value: 'my_db' }],
          }),
        ],
      });
    });

    it('omits UserParameters/ProjectProfileVersion entirely when no environmentConfigurations are set', () => {
      new MdaaDatazoneProject(testApp.testStack, 'test-project', {
        naming: testApp.naming,
        name: 'test-project',
        domainConfig: testDomainConfig,
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::DataZone::Project', {
        UserParameters: Match.absent(),
        ProjectProfileVersion: Match.absent(),
      });
      template.resourceCountIs('Custom::EnvironmentIdResolver', 0);
    });

    it('creates a resolver per environment configuration, after the project, publishing the resolved ID to SSM', () => {
      new MdaaDatazoneProject(testApp.testStack, 'test-project', {
        naming: testApp.naming,
        name: 'test-project',
        domainConfig: testDomainConfig,
        environmentConfigurations: {
          Tooling: { parameters: { glueDbName: 'my_db' } },
        },
      });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('Custom::EnvironmentIdResolver', 1);
      template.hasResourceProperties('Custom::EnvironmentIdResolver', { envConfigName: 'Tooling' });

      const resolvers = template.findResources('Custom::EnvironmentIdResolver');
      const [resolver] = Object.values(resolvers);
      const projects = template.findResources('AWS::DataZone::Project');
      const [projectLogicalId] = Object.keys(projects);
      expect(resolver.DependsOn).toContain(projectLogicalId);

      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('project/test-project-env-tooling/environment-id'),
      });
    });

    it('still publishes a resolver for an entry that already has an explicit environmentId', () => {
      new MdaaDatazoneProject(testApp.testStack, 'test-project', {
        naming: testApp.naming,
        name: 'test-project',
        domainConfig: testDomainConfig,
        environmentConfigurations: {
          Tooling: { environmentId: 'abc123env' },
        },
      });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('Custom::EnvironmentIdResolver', 1);
    });

    it('falls back to generatedProjectName for the published SSM path when name is omitted', () => {
      new MdaaDatazoneProject(testApp.testStack, 'test-project', {
        naming: testApp.naming,
        domainConfig: testDomainConfig,
        nameOverride: 'customer360',
        environmentConfigurations: {
          Tooling: { parameters: { glueDbName: 'my_db' } },
        },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('project/customer360-env-tooling/environment-id'),
      });
    });

    it('sanitizes a nameOverride fallback containing spaces for the published SSM path', () => {
      new MdaaDatazoneProject(testApp.testStack, 'test-project', {
        naming: testApp.naming,
        domainConfig: testDomainConfig,
        nameOverride: 'Customer 360 Analytics',
        environmentConfigurations: {
          Tooling: { parameters: { glueDbName: 'my_db' } },
        },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('project/customer-360-analytics-env-tooling/environment-id'),
      });
    });

    it('sanitizes an environment configuration key containing spaces for the published SSM path', () => {
      new MdaaDatazoneProject(testApp.testStack, 'test-project', {
        naming: testApp.naming,
        name: 'test-project',
        domainConfig: testDomainConfig,
        environmentConfigurations: {
          'Lakehouse Database': { parameters: { glueDbName: 'my_db' } },
        },
      });

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('project/test-project-env-lakehouse-database/environment-id'),
      });
    });

    it('addresses mixed entries independently: explicit environmentId wins for its own entry only', () => {
      new MdaaDatazoneProject(testApp.testStack, 'test-project', {
        naming: testApp.naming,
        name: 'test-project',
        domainConfig: testDomainConfig,
        environmentConfigurations: {
          Tooling: { environmentId: 'abc123env' },
          DataLake: {},
        },
      });

      const template = Template.fromStack(testApp.testStack);
      template.resourceCountIs('Custom::EnvironmentIdResolver', 2);
      template.hasResourceProperties('AWS::DataZone::Project', {
        ProjectProfileVersion: 'latest',
        UserParameters: Match.arrayWith([
          Match.objectEquals({ EnvironmentId: 'abc123env', EnvironmentParameters: [] }),
          Match.objectEquals({ EnvironmentConfigurationName: 'DataLake', EnvironmentParameters: [] }),
        ]),
      });
    });
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

  it('depends the environment ID resolver on project membership, not just the project', () => {
    // Regression guard: ListEnvironments requires the custom-resource role to already be
    // a project member. Without this dependency, the resolver could run before
    // crRoleProjectMembership exists on a brand-new project and be denied permanently
    // (the resolver only runs once).
    new MdaaSageMakerProject(testApp.testStack, 'test-sm-project', {
      naming: testApp.naming,
      name: 'test-sm-project',
      domainConfig: testDomainConfig,
      environmentConfigurations: {
        Tooling: { parameters: { glueDbName: 'my_db' } },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    const resolvers = template.findResources('Custom::EnvironmentIdResolver');
    const resolverIds = Object.keys(resolvers);
    expect(resolverIds.length).toBeGreaterThan(0);

    const memberships = template.findResources('AWS::DataZone::ProjectMembership', {
      Properties: { Designation: 'PROJECT_OWNER' },
    });
    const membershipIds = Object.keys(memberships);
    expect(membershipIds.length).toBeGreaterThan(0);

    resolverIds.forEach(resolverId => {
      const dependsOn: string[] = resolvers[resolverId].DependsOn ?? [];
      expect(membershipIds.some(membershipId => dependsOn.includes(membershipId))).toBe(true);
    });
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

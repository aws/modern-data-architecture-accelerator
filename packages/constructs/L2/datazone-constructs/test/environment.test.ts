/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { DomainConfig, MdaaDatazoneProject, MdaaDatazoneEnvironment } from '../lib';

describe('MdaaDatazoneEnvironment', () => {
  let testApp: MdaaTestApp;
  let project: MdaaDatazoneProject;
  let envUserRole: Role;
  let lakeformationRole: Role;
  let envBucket: Bucket;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    const domainConfig = new DomainConfig(testApp.testStack, 'domain-config', {
      ssmParamBase: '/test-ssm',
      naming: testApp.naming,
    });

    project = new MdaaDatazoneProject(testApp.testStack, 'test-project', {
      naming: testApp.naming,
      name: 'test-project',
      domainConfig,
    });

    envUserRole = new Role(testApp.testStack, 'EnvUserRole', {
      assumedBy: new ServicePrincipal('datazone.amazonaws.com'),
    });

    lakeformationRole = new Role(testApp.testStack, 'LFRole', {
      assumedBy: new ServicePrincipal('lakeformation.amazonaws.com'),
    });

    envBucket = new Bucket(testApp.testStack, 'EnvBucket');
  });

  it('should create environment', () => {
    new MdaaDatazoneEnvironment(testApp.testStack, 'test-env', {
      naming: testApp.naming,
      project,
      envUserRole,
      lakeformationManageAccessRole: lakeformationRole,
      envBucket,
      account: '123456789012',
      region: 'us-east-1',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Environment', 1);
  });

  it('should create subscription database', () => {
    new MdaaDatazoneEnvironment(testApp.testStack, 'test-env', {
      naming: testApp.naming,
      project,
      envUserRole,
      lakeformationManageAccessRole: lakeformationRole,
      envBucket,
      account: '123456789012',
      region: 'us-east-1',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::Glue::Database', {
      CatalogId: '123456789012',
    });
  });

  it('should create environment actions', () => {
    new MdaaDatazoneEnvironment(testApp.testStack, 'test-env', {
      naming: testApp.naming,
      project,
      envUserRole,
      lakeformationManageAccessRole: lakeformationRole,
      envBucket,
      account: '123456789012',
      region: 'us-east-1',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::EnvironmentActions', 5);
  });

  it('should create subscription target', () => {
    new MdaaDatazoneEnvironment(testApp.testStack, 'test-env', {
      naming: testApp.naming,
      project,
      envUserRole,
      lakeformationManageAccessRole: lakeformationRole,
      envBucket,
      account: '123456789012',
      region: 'us-east-1',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::SubscriptionTarget', {
      Type: 'GlueSubscriptionTargetType',
      ApplicableAssetTypes: ['GlueTableAssetType'],
    });
  });

  it('should create user managed policy', () => {
    new MdaaDatazoneEnvironment(testApp.testStack, 'test-env', {
      naming: testApp.naming,
      project,
      envUserRole,
      lakeformationManageAccessRole: lakeformationRole,
      envBucket,
      account: '123456789012',
      region: 'us-east-1',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::IAM::ManagedPolicy', 1);
  });

  it('should expose environment properties', () => {
    const construct = new MdaaDatazoneEnvironment(testApp.testStack, 'test-env', {
      naming: testApp.naming,
      project,
      envUserRole,
      lakeformationManageAccessRole: lakeformationRole,
      envBucket,
      account: '123456789012',
      region: 'us-east-1',
    });

    expect(construct.env).toBeDefined();
    expect(construct.subDatabase).toBeDefined();
    expect(construct.subDatabaseName).toBeDefined();
    expect(construct.subTarget).toBeDefined();
  });

  it('should use parent scope when requested', () => {
    new MdaaDatazoneEnvironment(
      testApp.testStack,
      'test-env',
      {
        naming: testApp.naming,
        project,
        envUserRole,
        lakeformationManageAccessRole: lakeformationRole,
        envBucket,
        account: '123456789012',
        region: 'us-east-1',
      },
      true,
    );

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::Environment', 1);
  });

  // Regression tests for bugfix: datazone-environment-name-length.
  // Each of the four resourceName() call sites in MdaaDatazoneEnvironment must pass the
  // per-resource CloudFormation maxLength to naming.resourceName(suffix?, maxLength?) so
  // that long <org>-<env>-<domain>-<moduleName> inputs cannot produce property values
  // that violate the service-side Name/name/managedPolicyName length limits.
  describe('Name length constraints (regression - datazone-environment-name-length)', () => {
    function synth(ctxOverrides?: Record<string, string>) {
      const app = new MdaaTestApp(ctxOverrides);
      const domainConfig = new DomainConfig(app.testStack, 'domain-config', {
        ssmParamBase: '/test-ssm',
        naming: app.naming,
      });
      const localProject = new MdaaDatazoneProject(app.testStack, 'test-project', {
        naming: app.naming,
        name: 'test-project',
        domainConfig,
      });
      const localEnvUserRole = new Role(app.testStack, 'EnvUserRole', {
        assumedBy: new ServicePrincipal('datazone.amazonaws.com'),
      });
      const localLfRole = new Role(app.testStack, 'LFRole', {
        assumedBy: new ServicePrincipal('lakeformation.amazonaws.com'),
      });
      const localEnvBucket = new Bucket(app.testStack, 'EnvBucket');
      new MdaaDatazoneEnvironment(app.testStack, 'test-env', {
        naming: app.naming,
        project: localProject,
        envUserRole: localEnvUserRole,
        lakeformationManageAccessRole: localLfRole,
        envBucket: localEnvBucket,
        account: '123456789012',
        region: 'us-east-1',
      });
      return { template: Template.fromStack(app.testStack), naming: app.naming };
    }

    function singleProps(template: Template, type: string): Record<string, unknown> {
      const resources = template.findResources(type);
      const logicalIds = Object.keys(resources);
      expect(logicalIds).toHaveLength(1);
      return resources[logicalIds[0]].Properties as Record<string, unknown>;
    }

    describe('each call site passes its service maxLength to resourceName()', () => {
      it('CfnEnvironment.Name equals naming.resourceName(undefined, 64)', () => {
        const { template, naming } = synth();
        expect(singleProps(template, 'AWS::DataZone::Environment').Name).toBe(naming.resourceName(undefined, 64));
      });

      it('CfnSubscriptionTarget.Name equals naming.resourceName(undefined, 256)', () => {
        const { template, naming } = synth();
        expect(singleProps(template, 'AWS::DataZone::SubscriptionTarget').Name).toBe(
          naming.resourceName(undefined, 256),
        );
      });

      it('Glue Database name equals naming.resourceName("datazone-sub", 255)', () => {
        const { template, naming } = synth();
        const databaseInput = singleProps(template, 'AWS::Glue::Database').DatabaseInput as {
          Name: string;
        };
        expect(databaseInput.Name).toBe(naming.resourceName('datazone-sub', 255));
      });

      it('ManagedPolicy name equals naming.resourceName("datazone-user-access-policy", 128)', () => {
        const { template, naming } = synth();
        expect(singleProps(template, 'AWS::IAM::ManagedPolicy').ManagedPolicyName).toBe(
          naming.resourceName('datazone-user-access-policy', 128),
        );
      });
    });

    describe('short inputs - preservation (requirement 3.1)', () => {
      it('all four names equal the raw <org>-<env>-<domain>-<moduleName>[-<suffix>] concatenation (no hash suffix)', () => {
        const { template } = synth();
        // Defaults from MdaaTestApp: org=test-org, env=test-env, domain=test-domain, moduleName=test-module
        const prefix = 'test-org-test-env-test-domain-test-module';
        expect(singleProps(template, 'AWS::DataZone::Environment').Name).toBe(prefix);
        expect(singleProps(template, 'AWS::DataZone::SubscriptionTarget').Name).toBe(prefix);
        const databaseInput = singleProps(template, 'AWS::Glue::Database').DatabaseInput as {
          Name: string;
        };
        expect(databaseInput.Name).toBe(`${prefix}-datazone-sub`);
        expect(singleProps(template, 'AWS::IAM::ManagedPolicy').ManagedPolicyName).toBe(
          `${prefix}-datazone-user-access-policy`,
        );
      });

      it('every name is comfortably under its service maxLength', () => {
        const { template } = synth();
        const envName = singleProps(template, 'AWS::DataZone::Environment').Name as string;
        const subTargetName = singleProps(template, 'AWS::DataZone::SubscriptionTarget').Name as string;
        const databaseInput = singleProps(template, 'AWS::Glue::Database').DatabaseInput as {
          Name: string;
        };
        const mpName = singleProps(template, 'AWS::IAM::ManagedPolicy').ManagedPolicyName as string;

        expect(envName.length).toBeLessThanOrEqual(64);
        expect(subTargetName.length).toBeLessThanOrEqual(256);
        expect(databaseInput.Name.length).toBeLessThanOrEqual(255);
        expect(mpName.length).toBeLessThanOrEqual(128);
      });
    });

    describe('Environment name counterexample - real deploy failure', () => {
      const prodCtx = {
        org: 'governed-lakehouse',
        env: 'ca-central-1-393818036528',
        domain: 'dev-dataops1',
        moduleName: 'project1',
      };
      const unboundedName = 'governed-lakehouse-ca-central-1-393818036528-dev-dataops1-project1';

      it('the 66-char production input produces a CfnEnvironment.Name of length <= 64', () => {
        expect(unboundedName.length).toBe(66);
        const { template } = synth(prodCtx);
        const envName = singleProps(template, 'AWS::DataZone::Environment').Name as string;
        expect(envName.length).toBeLessThanOrEqual(64);
        expect(envName).not.toBe(unboundedName);
      });

      it('same production inputs produce byte-for-byte identical Environment name (determinism)', () => {
        const a = synth(prodCtx);
        const b = synth(prodCtx);
        expect(singleProps(a.template, 'AWS::DataZone::Environment').Name).toBe(
          singleProps(b.template, 'AWS::DataZone::Environment').Name,
        );
      });

      it('distinct production-length inputs produce distinct Environment names (collision resistance)', () => {
        const a = synth({ ...prodCtx, org: 'governed-lakehouse' });
        const b = synth({ ...prodCtx, org: 'controlled-lakehouse' });
        expect(singleProps(a.template, 'AWS::DataZone::Environment').Name).not.toBe(
          singleProps(b.template, 'AWS::DataZone::Environment').Name,
        );
      });
    });
  });
});

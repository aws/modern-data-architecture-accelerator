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
});

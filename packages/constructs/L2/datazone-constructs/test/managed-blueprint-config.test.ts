/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { DataZoneManagedBlueprintConfigConstruct } from '../lib/managed-blueprint-config';

describe('DataZoneBlueprintConfigConstruct', () => {
  let testApp: MdaaTestApp;
  let manageAccessRole: Role;
  let provisioningRole: Role;

  beforeEach(() => {
    testApp = new MdaaTestApp();

    manageAccessRole = new Role(testApp.testStack, 'ManageRole', {
      assumedBy: new ServicePrincipal('datazone.amazonaws.com'),
    });
    provisioningRole = new Role(testApp.testStack, 'ProvisionRole', {
      assumedBy: new ServicePrincipal('datazone.amazonaws.com'),
    });
  });

  it('should create blueprint configuration', () => {
    new DataZoneManagedBlueprintConfigConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V2',
      blueprintName: 'DefaultDataLake',
      enabledRegions: ['us-east-1'],
      manageAccessRole,
      authorizedDomainUnits: { '/root': 'test-unit-id' },
      account: '123456789012',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::EnvironmentBlueprintConfiguration', {
      EnabledRegions: ['us-east-1'],
      EnvironmentBlueprintIdentifier: 'DefaultDataLake',
    });
  });

  it('should create blueprint with provisioning role', () => {
    new DataZoneManagedBlueprintConfigConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V2',
      blueprintName: 'DefaultDataLake',
      enabledRegions: ['us-east-1', 'us-west-2'],
      manageAccessRole,
      provisioningRole,
      authorizedDomainUnits: { '/root': 'test-unit-id' },
      account: '123456789012',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::EnvironmentBlueprintConfiguration', {
      EnabledRegions: ['us-east-1', 'us-west-2'],
    });
  });

  it('should create blueprint with regional parameters', () => {
    new DataZoneManagedBlueprintConfigConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V2',
      blueprintName: 'DefaultDataLake',
      enabledRegions: ['us-east-1'],
      authorizedDomainUnits: { '/root': 'test-unit-id' },
      manageAccessRole,
      regionalParameters: [
        {
          region: 'us-east-1',
          parameters: { key: 'value' },
        },
      ],
      account: '123456789012',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::EnvironmentBlueprintConfiguration', 1);
  });

  it('should create authorization when provided', () => {
    new DataZoneManagedBlueprintConfigConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V2',
      blueprintName: 'DefaultDataLake',
      enabledRegions: ['us-east-1'],
      manageAccessRole,
      authorizedDomainUnits: { '/root': 'test-unit-id' },
      account: '123456789012',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::PolicyGrant', 1);
  });

  it('should expose blueprintId', () => {
    const construct = new DataZoneManagedBlueprintConfigConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V2',
      blueprintName: 'DefaultDataLake',
      enabledRegions: ['us-east-1'],
      authorizedDomainUnits: { '/root': 'test-unit-id' },
      manageAccessRole,
      account: '123456789012',
    });

    expect(construct.blueprintConfigId).toBeDefined();
  });

  it('should not create authorization when authorizedDomainUnits is undefined', () => {
    new DataZoneManagedBlueprintConfigConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V2',
      blueprintName: 'DefaultDataLake',
      enabledRegions: ['us-east-1'],
      manageAccessRole,
      account: '123456789012',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::PolicyGrant', 0);
  });

  it('should not create authorization when authorizedDomainUnits is empty', () => {
    new DataZoneManagedBlueprintConfigConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V2',
      blueprintName: 'DefaultDataLake',
      enabledRegions: ['us-east-1'],
      manageAccessRole,
      authorizedDomainUnits: {},
      account: '123456789012',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::PolicyGrant', 0);
  });

  it('should use parent scope and legacy id when domainVersion is V1', () => {
    new DataZoneManagedBlueprintConfigConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      domainVersion: 'V1',
      blueprintName: 'DefaultDataLake',
      enabledRegions: ['us-east-1'],
      manageAccessRole,
      account: '123456789012',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::EnvironmentBlueprintConfiguration', 1);
  });
});

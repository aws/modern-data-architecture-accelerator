/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { DataZoneBlueprintConfigConstruct } from '../lib';
import { LEGACY_DATAZONE_SCOPE_CONTEXT_KEY } from '../lib/index';

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
    new DataZoneBlueprintConfigConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
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
    new DataZoneBlueprintConfigConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
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
    new DataZoneBlueprintConfigConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
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
    new DataZoneBlueprintConfigConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
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
    const construct = new DataZoneBlueprintConfigConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      blueprintName: 'DefaultDataLake',
      enabledRegions: ['us-east-1'],
      authorizedDomainUnits: { '/root': 'test-unit-id' },
      manageAccessRole,
      account: '123456789012',
    });

    expect(construct.blueprintConfigId).toBeDefined();
  });

  it('should handle empty authorizedDomainUnits', () => {
    new DataZoneBlueprintConfigConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      blueprintName: 'DefaultDataLake',
      enabledRegions: ['us-east-1'],
      account: '123456789012',
      // No authorizedDomainUnits
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::PolicyGrant', 0);
  });

  it('should use legacy scope when context key is set', () => {
    // Create a fresh app with the legacy context key set at construction time
    const legacyTestApp = new MdaaTestApp({ [LEGACY_DATAZONE_SCOPE_CONTEXT_KEY]: 'true' });

    const legacyManageRole = new Role(legacyTestApp.testStack, 'ManageRole', {
      assumedBy: new ServicePrincipal('datazone.amazonaws.com'),
    });

    new DataZoneBlueprintConfigConstruct(legacyTestApp.testStack, 'test-blueprint', {
      naming: legacyTestApp.naming,
      domainId: 'test-domain-id',
      domainName: 'test-domain',
      blueprintName: 'DefaultDataLake',
      enabledRegions: ['us-east-1'],
      manageAccessRole: legacyManageRole,
      account: '123456789012',
    });

    const template = Template.fromStack(legacyTestApp.testStack);
    // Verify resource is created with legacy naming pattern
    template.hasResourceProperties('AWS::DataZone::EnvironmentBlueprintConfiguration', {
      EnvironmentBlueprintIdentifier: 'DefaultDataLake',
    });
  });
});

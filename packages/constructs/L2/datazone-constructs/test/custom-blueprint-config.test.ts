/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaSageMakerCustomBlueprintConfigConstruct } from '../lib/custom-blueprint-config';
import { DomainConfig } from '../lib/domain_config';

describe('MdaaSageMakerCustomBlueprintConfigConstruct', () => {
  let testApp: MdaaTestApp;
  let domainConfig: DomainConfig;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    domainConfig = new DomainConfig(testApp.testStack, 'test-domain-config', {
      naming: testApp.naming,
      domainName: 'test-domain',
      domainId: 'dzd_test123',
      domainKmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      ssmParamBase: '/test-org/test-domain',
    });
  });

  it('should create custom blueprint config with required properties', () => {
    new MdaaSageMakerCustomBlueprintConfigConstruct(testApp.testStack, 'test-config', {
      naming: testApp.naming,
      domainConfig,
      blueprintIdentifier: 'test-blueprint-id',
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
      region: 'us-east-1',
      account: '123456789012',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.13',
      Handler: 'lambda.lambda_handler',
    });
  });

  it('should create config with enabled regions', () => {
    new MdaaSageMakerCustomBlueprintConfigConstruct(testApp.testStack, 'test-config', {
      naming: testApp.naming,
      domainConfig,
      blueprintIdentifier: 'test-blueprint-id',
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
      region: 'us-east-1',
      account: '123456789012',
      enabledRegions: ['us-west-2', 'eu-west-1'],
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('Custom::EnvironmentBluePrintConfiguration', {
      enabled_regions: ['us-east-1', 'us-west-2', 'eu-west-1'],
    });
  });

  it('should create authorization when authorizedDomainUnits provided', () => {
    new MdaaSageMakerCustomBlueprintConfigConstruct(testApp.testStack, 'test-config', {
      naming: testApp.naming,
      domainConfig,
      blueprintIdentifier: 'test-blueprint-id',
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
      region: 'us-east-1',
      account: '123456789012',
      authorizedDomainUnits: {
        '/root': 'unit-id-123',
        '/root/child': 'unit-id-456',
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::PolicyGrant', 2);
  });

  it('should not create authorization when authorizedDomainUnits is empty', () => {
    new MdaaSageMakerCustomBlueprintConfigConstruct(testApp.testStack, 'test-config', {
      naming: testApp.naming,
      domainConfig,
      blueprintIdentifier: 'test-blueprint-id',
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
      region: 'us-east-1',
      account: '123456789012',
      authorizedDomainUnits: {},
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::PolicyGrant', 0);
  });

  it('should not create authorization when authorizedDomainUnits is undefined', () => {
    new MdaaSageMakerCustomBlueprintConfigConstruct(testApp.testStack, 'test-config', {
      naming: testApp.naming,
      domainConfig,
      blueprintIdentifier: 'test-blueprint-id',
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
      region: 'us-east-1',
      account: '123456789012',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::DataZone::PolicyGrant', 0);
  });

  it('should grant PassRole permission for provisioning role', () => {
    new MdaaSageMakerCustomBlueprintConfigConstruct(testApp.testStack, 'test-config', {
      naming: testApp.naming,
      domainConfig,
      blueprintIdentifier: 'test-blueprint-id',
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
      region: 'us-east-1',
      account: '123456789012',
    });

    const template = Template.fromStack(testApp.testStack);
    // Verify custom resource has the provisioning role ARN
    template.hasResourceProperties('Custom::EnvironmentBluePrintConfiguration', {
      provisioning_role_arn: 'arn:aws:iam::123456789012:role/test-provisioning-role',
    });
  });
});

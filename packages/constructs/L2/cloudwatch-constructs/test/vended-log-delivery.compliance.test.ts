/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { createMdaaVendedLogDelivery } from '../lib';

const RESOURCE_ARN = 'arn:test-partition:bedrock:test-region:test-account:knowledge-base/kb-abc123';
const PATH_PREFIX = '/aws/vendedlogs/bedrock/knowledge-base/';
// MdaaTestApp context: org=test-org, env=test-env, domain=test-domain, moduleName=test-module.
const MDAA_NAME_BASE = 'test-org-test-env-test-domain-test-module';

describe('createMdaaVendedLogDelivery', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('builds the full pipeline (log group + source -> destination -> delivery), default INFINITE retention', () => {
    const key = new Key(testApp.testStack, 'Key');
    createMdaaVendedLogDelivery(testApp.testStack, {
      encryptionKey: key,
      logGroupNamePathPrefix: PATH_PREFIX,
      resourceName: 'my-kb',
      resourceArn: RESOURCE_ARN,
      logType: 'APPLICATION_LOGS',
      naming: testApp.naming,
      idPrefix: 'kb-',
    });
    const template = Template.fromStack(testApp.testStack);

    // One CMK-encrypted destination log group; INFINITE retention -> CDK omits RetentionInDays. The
    // name is the path prefix plus the MDAA-named segment (seeded with resourceName).
    template.resourceCountIs('AWS::Logs::LogGroup', 1);
    const logGroup = Object.values(template.findResources('AWS::Logs::LogGroup'))[0];
    expect(logGroup.Properties.LogGroupName).toBe(`${PATH_PREFIX}${MDAA_NAME_BASE}-my-kb`);
    expect(logGroup.Properties.KmsKeyId).toBeDefined();
    expect(logGroup.Properties.RetentionInDays).toBeUndefined();

    // Source bound to the resource ARN + log type; destination + delivery each present once.
    template.resourceCountIs('AWS::Logs::DeliverySource', 1);
    const source = Object.values(template.findResources('AWS::Logs::DeliverySource'))[0];
    expect(source.Properties.LogType).toBe('APPLICATION_LOGS');
    expect(source.Properties.ResourceArn).toBe(RESOURCE_ARN);
    template.resourceCountIs('AWS::Logs::DeliveryDestination', 1);
    template.resourceCountIs('AWS::Logs::Delivery', 1);
  });

  test('applies MDAA naming to the delivery source and destination names', () => {
    // Both names are derived via naming.withResourceType(...).resourceName(resourceName, 60), so they
    // must carry the MDAA-named segment (org-env-domain-module-<resourceName>). Pin the exact values
    // so a regression that drops the MDAA naming (or the resourceName seed) is caught.
    const key = new Key(testApp.testStack, 'Key');
    createMdaaVendedLogDelivery(testApp.testStack, {
      encryptionKey: key,
      logGroupNamePathPrefix: PATH_PREFIX,
      resourceName: 'my-kb',
      resourceArn: RESOURCE_ARN,
      logType: 'APPLICATION_LOGS',
      naming: testApp.naming,
      idPrefix: 'kb-',
    });
    const template = Template.fromStack(testApp.testStack);

    const source = Object.values(template.findResources('AWS::Logs::DeliverySource'))[0];
    expect(source.Properties.Name).toBe(`${MDAA_NAME_BASE}-my-kb`);
    const destination = Object.values(template.findResources('AWS::Logs::DeliveryDestination'))[0];
    expect(destination.Properties.Name).toBe(`${MDAA_NAME_BASE}-my-kb`);
  });

  test('truncates the delivery source/destination names to the 60-char MDAA limit', () => {
    // resourceName(resourceName, 60) truncates with a stable hash suffix once the composed name
    // reaches 60 chars. A long resourceName pushes past the limit; assert both names are truncated to
    // exactly 60 chars and still start with the MDAA-named base (naming convention preserved).
    const key = new Key(testApp.testStack, 'Key');
    const longName = 'super-long-gateway-instance-name-exceeding-limit';
    createMdaaVendedLogDelivery(testApp.testStack, {
      encryptionKey: key,
      logGroupNamePathPrefix: PATH_PREFIX,
      resourceName: longName,
      resourceArn: RESOURCE_ARN,
      logType: 'APPLICATION_LOGS',
      naming: testApp.naming,
      idPrefix: 'kb-',
    });
    const template = Template.fromStack(testApp.testStack);

    const sourceName = Object.values(template.findResources('AWS::Logs::DeliverySource'))[0].Properties.Name as string;
    const destName = Object.values(template.findResources('AWS::Logs::DeliveryDestination'))[0].Properties
      .Name as string;
    expect(sourceName.length).toBe(60);
    expect(destName.length).toBe(60);
    expect(sourceName.startsWith(MDAA_NAME_BASE)).toBe(true);
    expect(destName.startsWith(MDAA_NAME_BASE)).toBe(true);
  });

  test('honors a custom retention', () => {
    const key = new Key(testApp.testStack, 'Key');
    createMdaaVendedLogDelivery(testApp.testStack, {
      encryptionKey: key,
      logGroupNamePathPrefix: PATH_PREFIX,
      resourceName: 'my-kb',
      resourceArn: RESOURCE_ARN,
      logType: 'APPLICATION_LOGS',
      retention: RetentionDays.THREE_MONTHS,
      naming: testApp.naming,
      idPrefix: 'kb-',
    });
    const template = Template.fromStack(testApp.testStack);
    const logGroup = Object.values(template.findResources('AWS::Logs::LogGroup'))[0];
    expect(logGroup.Properties.RetentionInDays).toBe(90);
  });

  test('orders the delivery after the delivery source via an explicit DependsOn', () => {
    // CfnDelivery references the source by NAME (a string), not by resource, so CDK adds no implicit
    // ordering — the helper wires delivery.addDependency(deliverySource). Pin that so a regression
    // dropping it (letting CloudFormation create the delivery before its source) is caught.
    const key = new Key(testApp.testStack, 'Key');
    createMdaaVendedLogDelivery(testApp.testStack, {
      encryptionKey: key,
      logGroupNamePathPrefix: PATH_PREFIX,
      resourceName: 'my-kb',
      resourceArn: RESOURCE_ARN,
      logType: 'APPLICATION_LOGS',
      naming: testApp.naming,
      idPrefix: 'kb-',
    });
    const template = Template.fromStack(testApp.testStack);

    const sourceLogicalId = Object.keys(template.findResources('AWS::Logs::DeliverySource'))[0];
    const delivery = Object.values(template.findResources('AWS::Logs::Delivery'))[0];
    expect(delivery.DependsOn as string[]).toContain(sourceLogicalId);
  });

  test('adds no KMS key-policy grants (granting is the key provisioner’s responsibility)', () => {
    // The helper only encrypts the log group with the provided key; it must NOT mutate the key
    // policy. The CloudWatch Logs / vended-delivery grants are added by whoever provisions the key.
    const key = new Key(testApp.testStack, 'Key');
    createMdaaVendedLogDelivery(testApp.testStack, {
      encryptionKey: key,
      logGroupNamePathPrefix: PATH_PREFIX,
      resourceName: 'my-kb',
      resourceArn: RESOURCE_ARN,
      logType: 'APPLICATION_LOGS',
      naming: testApp.naming,
      idPrefix: 'kb-',
    });
    const template = Template.fromStack(testApp.testStack);
    const keyResource = Object.values(template.findResources('AWS::KMS::Key'))[0];
    const statements = (keyResource.Properties.KeyPolicy as { Statement: { Principal?: unknown }[] }).Statement;
    // Only the default root-account statement CDK adds — no logs/delivery service-principal grants.
    const principals = JSON.stringify(statements.map(s => s.Principal));
    expect(principals).not.toContain('logs.test-region.amazonaws.com');
    expect(principals).not.toContain('delivery.logs.amazonaws.com');
  });

  test('idPrefix/idSuffix produce stable, non-colliding ids for multiple instances in one scope', () => {
    const key = new Key(testApp.testStack, 'Key');
    // Two instances in the same scope with distinct suffixes (the Knowledge Base per-KB pattern).
    ['kb-one', 'kb-two'].forEach(name =>
      createMdaaVendedLogDelivery(testApp.testStack, {
        encryptionKey: key,
        logGroupNamePathPrefix: PATH_PREFIX,
        resourceName: name,
        resourceArn: `arn:test-partition:bedrock:test-region:test-account:knowledge-base/${name}`,
        logType: 'APPLICATION_LOGS',
        naming: testApp.naming,
        idPrefix: 'kb-',
        idSuffix: `-${name}`,
      }),
    );
    const template = Template.fromStack(testApp.testStack);

    // Both pipelines coexist (no id collision): two of each delivery resource.
    template.resourceCountIs('AWS::Logs::LogGroup', 2);
    template.resourceCountIs('AWS::Logs::DeliverySource', 2);
    template.resourceCountIs('AWS::Logs::DeliveryDestination', 2);
    template.resourceCountIs('AWS::Logs::Delivery', 2);
  });
});

describe('createMdaaVendedLogDelivery Compliance', () => {
  const testApp = new MdaaTestApp();
  // Rotation-enabled key so the CMK itself is nag-clean; the helper encrypts the log group with it
  // and builds the delivery pipeline. Validates the generated log group / delivery resources against
  // the cdk-nag rulesets (AwsSolutions, NIST, HIPAA, PCI).
  const key = new Key(testApp.testStack, 'Key', { enableKeyRotation: true });
  createMdaaVendedLogDelivery(testApp.testStack, {
    encryptionKey: key,
    logGroupNamePathPrefix: PATH_PREFIX,
    resourceName: 'my-kb',
    resourceArn: RESOURCE_ARN,
    logType: 'APPLICATION_LOGS',
    naming: testApp.naming,
    idPrefix: 'kb-',
  });

  testApp.checkCdkNagCompliance(testApp.testStack);
});

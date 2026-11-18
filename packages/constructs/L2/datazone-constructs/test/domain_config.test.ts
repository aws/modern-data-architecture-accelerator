/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Annotations, Match, Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { DomainConfig, DomainConfigProps } from '../lib/domain_config';

describe('DomainConfig Tests', () => {
  let testApp: MdaaTestApp;
  let testStack: Stack;

  beforeEach(() => {
    testApp = new MdaaTestApp({ '@aws-mdaa/skipCreateParams': 'false' });
    testStack = testApp.testStack;
  });

  describe('Constructor Tests', () => {
    test('should create DomainConfig with all required properties', () => {
      const props: DomainConfigProps = {
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-kms-policy',
        domainBucketUsagePolicyName: 'test-bucket-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
        domainBucketArn: 'arn:aws:s3:us-east-1:xxxxxxxxxxxxx:bucket/bucket-name',
        ssmParamBase: '/test-param',
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfig', props);

      expect(domainConfig.domainName).toBe('test-domain');
      expect(domainConfig.domainVersion).toBe('1.0.0');
      expect(domainConfig.domainId).toBe('dzd_test123');
      expect(domainConfig.domainArn).toBe('arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123');
      expect(domainConfig.domainKmsKeyArn).toBe(
        'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
      );
      expect(domainConfig.glueCatalogKmsKeyArns).toEqual(['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1']);
      expect(domainConfig.domainKmsUsagePolicyName).toBe('test-kms-policy');
      expect(domainConfig.domainBucketUsagePolicyName).toBe('test-bucket-policy');
      expect(domainConfig.glueCatalogArns).toEqual(['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog']);
    });

    test('should create DomainConfig with optional properties', () => {
      const props: DomainConfigProps = {
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-kms-policy',
        domainBucketUsagePolicyName: 'test-bucket-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
        ssmParamBase: '/test/domain',
        domainUnitIds: {
          '/unit1': 'unit-id-1',
          '/unit2': 'unit-id-2',
        },
        domainBucketArn: 'arn:aws:s3:us-east-1:xxxxxxxxxxxxx:bucket/bucket-name',
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfig', props);

      expect(domainConfig.ssmParamBase).toBe('/test/domain');
      expect(domainConfig.domainUnitIds).toEqual({
        '/unit1': 'unit-id-1',
        '/unit2': 'unit-id-2',
      });
    });
  });

  describe('getDomainUnitId Tests', () => {
    test('should return domain unit ID from domainUnits when available', () => {
      const props: DomainConfigProps = {
        domainBucketArn: 'arn:aws:s3:us-east-1:xxxxxxxxxxxxx:bucket/bucket-name',
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-kms-policy',
        domainBucketUsagePolicyName: 'test-bucket-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
        ssmParamBase: '/test-param',
        domainUnitIds: {
          '/root/unit1': 'unit-id-1',
          '/root/unit2': 'unit-id-2',
        },
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfig', props);

      expect(domainConfig.getDomainUnitId('/unit1')).toBe('unit-id-1');
      expect(domainConfig.getDomainUnitId('/unit2')).toBe('unit-id-2');
    });

    test('should retrieve domain unit ID from SSM when ssmParamBase is provided', () => {
      const props: DomainConfigProps = {
        domainBucketArn: 'arn:aws:s3:us-east-1:xxxxxxxxxxxxx:bucket/bucket-name',
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',

        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-kms-policy',
        domainBucketUsagePolicyName: 'test-bucket-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
        ssmParamBase: '/test/domain',
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfig', props);

      // This should create an SSM parameter reference
      const unitId = domainConfig.getDomainUnitId('/unit1');
      expect(typeof unitId).toBe('string');
    });

    test('should handle path normalization for domain unit IDs', () => {
      const props: DomainConfigProps = {
        domainBucketArn: 'arn:aws:s3:us-east-1:xxxxxxxxxxxxx:bucket/bucket-name',
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-kms-policy',
        domainBucketUsagePolicyName: 'test-bucket-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
        ssmParamBase: '/test/domain',
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfig', props);

      // Test path without leading slash
      const unitId1 = domainConfig.getDomainUnitId('unit1');
      expect(typeof unitId1).toBe('string');

      // Test path with leading slash
      const unitId2 = domainConfig.getDomainUnitId('/unit2');
      expect(typeof unitId2).toBe('string');
    });
  });

  describe('createDomainConfigParams Tests', () => {
    test('should create all required SSM parameters', () => {
      const props: DomainConfigProps = {
        domainBucketArn: 'arn:aws:s3:us-east-1:xxxxxxxxxxxxx:bucket/bucket-name',
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-kms-policy',
        domainBucketUsagePolicyName: 'test-bucket-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
        ssmParamBase: '/test-param',
        createConfigParams: true,
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfig', props);
      const paramArns = domainConfig.configParamArns;

      expect(paramArns).toHaveLength(9);
      expect(paramArns.every(arn => typeof arn === 'string')).toBe(true);

      const template = Template.fromStack(testStack);

      // Verify SSM parameters are created
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Type: 'String',
        Tier: 'Advanced',
      });

      // Verify StringList parameters are created for arrays
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Type: 'StringList',
        Tier: 'Advanced',
      });
    });

    test('should create domain unit parameters when domainUnits are provided', () => {
      const props: DomainConfigProps = {
        domainBucketArn: 'arn:aws:s3:us-east-1:xxxxxxxxxxxxx:bucket/bucket-name',
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-kms-policy',
        domainBucketUsagePolicyName: 'test-bucket-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
        ssmParamBase: '/test-param',
        domainUnitIds: {
          '/unit1': 'unit-id-1',
          '/unit2': 'unit-id-2',
        },
        createConfigParams: true,
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfigWithUnits', props);
      const paramArns = domainConfig.configParamArns;

      expect(paramArns).toHaveLength(9);
    });

    test('should handle empty domainCustomEnvBlueprintId', () => {
      const props: DomainConfigProps = {
        domainBucketArn: 'arn:aws:s3:us-east-1:xxxxxxxxxxxxx:bucket/bucket-name',
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-kms-policy',
        domainBucketUsagePolicyName: 'test-bucket-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
        ssmParamBase: '/test-param',
        createConfigParams: true,
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfigNoBlueprint', props);
      const paramArns = domainConfig.configParamArns;

      expect(paramArns).toHaveLength(9);
      expect(paramArns.every(arn => typeof arn === 'string')).toBe(true);
    });
  });

  describe('Integration Tests', () => {
    test('should work with real-world scenario', () => {
      const props: DomainConfigProps = {
        domainBucketArn: 'arn:aws:s3:us-east-1:xxxxxxxxxxxxx:bucket/bucket-name',
        naming: testApp.naming,
        domainName: 'production-datazone-domain',
        domainVersion: '2.1.0',
        domainId: 'dzd_prod123456',
        domainArn: 'arn:aws:datazone:us-west-2:xxxxxxxxxxxxx:domain/dzd_prod123456',
        domainKmsKeyArn: 'arn:aws:kms:us-west-2:xxxxxxxxxxxxx:key/abcd1234-5678-90ef-ghij-klmnopqrstuv',
        glueCatalogKmsKeyArns: [
          'arn:aws:kms:us-west-2:xxxxxxxxxxxxx:key/glue-key-1',
          'arn:aws:kms:us-west-2:xxxxxxxxxxxxx:key/glue-key-2',
        ],
        domainKmsUsagePolicyName: 'production-datazone-kms-policy',
        domainBucketUsagePolicyName: 'production-datazone-bucket-policy',
        glueCatalogArns: ['arn:aws:glue:us-west-2:xxxxxxxxxxxxx:catalog', 'arn:aws:glue:us-west-2:xxxxxxxxxxx:catalog'],
        ssmParamBase: '/production/datazone/domain',
        domainUnitIds: {
          '/finance': 'finance-unit-id',
          '/marketing': 'marketing-unit-id',
          '/engineering': 'engineering-unit-id',
        },
        createConfigParams: true,
      };

      const domainConfig = new DomainConfig(testStack, 'ProductionDomainConfig', props);

      // Test all functionality - when ssmParamBase is provided, getDomainUnitId returns tokens
      const financeUnitId = domainConfig.getDomainUnitId('/finance');
      const marketingUnitId = domainConfig.getDomainUnitId('/marketing');
      const engineeringUnitId = domainConfig.getDomainUnitId('/engineering');

      expect(typeof financeUnitId).toBe('string');
      expect(typeof marketingUnitId).toBe('string');
      expect(typeof engineeringUnitId).toBe('string');

      const paramArns = domainConfig.configParamArns;
      expect(paramArns).toHaveLength(9);

      const template = Template.fromStack(testStack);
      // Verify multiple SSM parameters are created
      const ssmParameters = template.findResources('AWS::SSM::Parameter');
      expect(Object.keys(ssmParameters).length).toBeGreaterThan(8);
    });

    test('should handle edge cases gracefully', () => {
      const props: DomainConfigProps = {
        domainBucketArn: '',
        naming: testApp.naming,
        domainName: '',
        domainVersion: '',
        domainId: '',
        domainArn: '',
        domainKmsKeyArn: '',
        glueCatalogKmsKeyArns: [''], // Empty string instead of empty array to avoid FnJoin error
        domainKmsUsagePolicyName: '',
        domainBucketUsagePolicyName: '',
        glueCatalogArns: [''], // Empty string instead of empty array to avoid FnJoin error
        domainUnitIds: {},
        ssmParamBase: '/test-param',
        createConfigParams: true,
      };

      const domainConfig = new DomainConfig(testStack, 'EdgeCaseDomainConfig', props);
      const paramArns = domainConfig.configParamArns;

      expect(paramArns).toHaveLength(9);
      expect(paramArns.every(arn => typeof arn === 'string')).toBe(true);
    });
  });

  describe('getBlueprintId', () => {
    test('should get blueprint ID from SSM', () => {
      const domainConfig = new DomainConfig(testStack, 'blueprint-ssm-config', {
        ssmParamBase: '/test-ssm',
        naming: testApp.naming,
      });
      const blueprintId = domainConfig.getBlueprintId('test-blueprint');
      expect(blueprintId).toBeDefined();
    });
  });

  describe('Custom resource response size limiting', () => {
    test('should only request domain unit paths and blueprint names actually used', () => {
      const domainConfig = new DomainConfig(testStack, 'scoped-request-config', {
        ssmParamBase: '/test-ssm',
        naming: testApp.naming,
      });

      domainConfig.getDomainUnitId('/Sales');
      domainConfig.getDomainUnitId('/Sales/Marketing');
      domainConfig.getBlueprintId('Tooling');

      const template = Template.fromStack(testStack);
      template.hasResourceProperties('Custom::DomainConfig', {
        domain_unit_paths: ['domain_unit_id/root/Sales', 'domain_unit_id/root/Sales/Marketing'],
        blueprint_names: ['blueprint_id/Tooling'],
      });
    });

    test('should request each domain unit path only once even when looked up multiple times', () => {
      const domainConfig = new DomainConfig(testStack, 'dedup-request-config', {
        ssmParamBase: '/test-ssm',
        naming: testApp.naming,
      });

      domainConfig.getDomainUnitId('/Sales');
      domainConfig.getDomainUnitId('/Sales');
      domainConfig.getDomainUnitId('/Sales/Marketing');

      const template = Template.fromStack(testStack);
      template.hasResourceProperties('Custom::DomainConfig', {
        domain_unit_paths: ['domain_unit_id/root/Sales', 'domain_unit_id/root/Sales/Marketing'],
      });
    });

    test('should request empty lists when no domain units or blueprints are looked up', () => {
      new DomainConfig(testStack, 'no-lookups-config', {
        ssmParamBase: '/test-ssm',
        naming: testApp.naming,
      });

      const template = Template.fromStack(testStack);
      template.hasResourceProperties('Custom::DomainConfig', {
        domain_unit_paths: [],
        blueprint_names: [],
      });
    });

    test('should not warn when the estimated response size is just under the warning threshold', () => {
      // 55 domain units estimates to 3470 bytes, just under the 85% warning threshold (3481.6)
      // of the 4096-byte CFN limit - close enough that removing the 0.85 margin would flip this.
      const domainConfig = new DomainConfig(testStack, 'near-threshold-no-warn-config', {
        ssmParamBase: '/test-ssm',
        naming: testApp.naming,
      });

      for (let i = 0; i < 55; i++) {
        domainConfig.getDomainUnitId(`/division-unit-${i}`);
      }

      Template.fromStack(testStack);
      const annotations = Annotations.fromStack(testStack);
      annotations.hasNoWarning('*', Match.stringLikeRegexp('.*Response object is too long.*'));
    });

    test('should warn once requests cross the warning threshold but stay under the hard CFN limit', () => {
      // 56 domain units estimates to 3526 bytes: over the 3481.6 warning threshold but still
      // well under the 4096-byte hard limit, proving the warning fires before the limit is hit.
      const domainConfig = new DomainConfig(testStack, 'near-threshold-warn-config', {
        ssmParamBase: '/test-ssm',
        naming: testApp.naming,
      });

      for (let i = 0; i < 56; i++) {
        domainConfig.getDomainUnitId(`/division-unit-${i}`);
      }

      Template.fromStack(testStack);
      const annotations = Annotations.fromStack(testStack);
      annotations.hasWarning(
        '*',
        Match.stringLikeRegexp(
          '.*DomainConfig requests 56 domain unit path\\(s\\) and 0 blueprint name\\(s\\), an estimated 3526 bytes.*Response object is too long.*',
        ),
      );
    });

    test('should warn when blueprint lookups alone push requests over the warning threshold', () => {
      // 70 blueprints alone estimates to 3540 bytes, over the warning threshold - if
      // blueprintBytes were dropped from the estimate, this would stay far under it and fail.
      const domainConfig = new DomainConfig(testStack, 'blueprint-only-warn-config', {
        ssmParamBase: '/test-ssm',
        naming: testApp.naming,
      });

      for (let i = 0; i < 70; i++) {
        domainConfig.getBlueprintId(`Blueprint-${i}`);
      }

      Template.fromStack(testStack);
      const annotations = Annotations.fromStack(testStack);
      annotations.hasWarning(
        '*',
        Match.stringLikeRegexp('.*DomainConfig requests 0 domain unit path\\(s\\) and 70 blueprint name\\(s\\).*'),
      );
    });
  });

  describe('Domain KMS Usage Policy', () => {
    test('should include kms:GenerateDataKey in the custom resource handler policy', () => {
      const kmsKeyArn = 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx';
      const props: DomainConfigProps = {
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainKmsKeyArn: kmsKeyArn,
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-kms-policy',
        domainBucketUsagePolicyName: 'test-bucket-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
        domainBucketArn: 'arn:aws:s3:us-east-1:xxxxxxxxxxxxx:bucket/bucket-name',
        ssmParamBase: '/test-param',
      };

      new DomainConfig(testStack, 'KmsPolicyTestConfig', props);

      const template = Template.fromStack(testStack);
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['kms:Decrypt', 'kms:GenerateDataKey']),
              Resource: kmsKeyArn,
            }),
          ]),
        },
      });
    });
  });

  describe('Custom resource handler DataZone permissions', () => {
    test('should grant only ListDomainUnitsForParent and ListEnvironmentBlueprints, not the removed project-list actions', () => {
      new DomainConfig(testStack, 'DataZonePermissionsConfig', {
        ssmParamBase: '/test-ssm',
        naming: testApp.naming,
      });

      const template = Template.fromStack(testStack);
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayEquals(['datazone:ListDomainUnitsForParent', 'datazone:ListEnvironmentBlueprints']),
              Resource: '*',
            }),
          ]),
        },
      });

      const policies = template.findResources('AWS::IAM::Policy');
      const statements = Object.values(policies).flatMap(
        policy => policy.Properties.PolicyDocument.Statement as { Action?: string | string[] }[],
      );
      const actions = statements.flatMap(statement => statement.Action ?? []);
      expect(actions).not.toContain('datazone:ListProjectProfiles');
      expect(actions).not.toContain('datazone:ListProjects');
    });
  });
});

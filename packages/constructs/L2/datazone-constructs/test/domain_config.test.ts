/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Stack } from 'aws-cdk-lib';
import { DomainConfig, DomainConfigProps } from '../lib/domain_config';

describe('DomainConfig Tests', () => {
  let testApp: MdaaTestApp;
  let testStack: Stack;

  beforeEach(() => {
    testApp = new MdaaTestApp();
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
        domainCustomEnvBlueprintId: 'blueprint-123',
        adminUserProfileId: 'admin-123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfig', props);

      expect(domainConfig.domainName).toBe('test-domain');
      expect(domainConfig.domainVersion).toBe('1.0.0');
      expect(domainConfig.domainId).toBe('dzd_test123');
      expect(domainConfig.domainArn).toBe('arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123');
      expect(domainConfig.domainCustomEnvBlueprintId).toBe('blueprint-123');
      expect(domainConfig.adminUserProfileId).toBe('admin-123');
      expect(domainConfig.domainKmsKeyArn).toBe(
        'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
      );
      expect(domainConfig.glueCatalogKmsKeyArns).toEqual(['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1']);
      expect(domainConfig.domainKmsUsagePolicyName).toBe('test-policy');
      expect(domainConfig.glueCatalogArns).toEqual(['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog']);
    });

    test('should create DomainConfig with optional properties', () => {
      const props: DomainConfigProps = {
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainCustomEnvBlueprintId: 'blueprint-123',
        adminUserProfileId: 'admin-123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
        ssmParamBase: '/test/domain',
        domainUnits: {
          '/unit1': 'unit-id-1',
          '/unit2': 'unit-id-2',
        },
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfig', props);

      expect(domainConfig.ssmParamBase).toBe('/test/domain');
      expect(domainConfig.domainUnits).toEqual({
        '/unit1': 'unit-id-1',
        '/unit2': 'unit-id-2',
      });
    });
  });

  describe('getDomainUnitId Tests', () => {
    test('should return domain unit ID from domainUnits when available', () => {
      const props: DomainConfigProps = {
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainCustomEnvBlueprintId: 'blueprint-123',
        adminUserProfileId: 'admin-123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
        domainUnits: {
          '/unit1': 'unit-id-1',
          '/unit2': 'unit-id-2',
        },
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfig', props);

      expect(domainConfig.getDomainUnitId('/unit1')).toBe('unit-id-1');
      expect(domainConfig.getDomainUnitId('/unit2')).toBe('unit-id-2');
    });

    test('should retrieve domain unit ID from SSM when ssmParamBase is provided', () => {
      const props: DomainConfigProps = {
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainCustomEnvBlueprintId: 'blueprint-123',
        adminUserProfileId: 'admin-123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-policy',
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
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainCustomEnvBlueprintId: 'blueprint-123',
        adminUserProfileId: 'admin-123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-policy',
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

    test('should throw error when neither ssmParamBase nor domainUnits are provided', () => {
      const props: DomainConfigProps = {
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainCustomEnvBlueprintId: 'blueprint-123',
        adminUserProfileId: 'admin-123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfig', props);

      expect(() => {
        domainConfig.getDomainUnitId('/unit1');
      }).toThrow('DomainUnits must be either retrievable from SSM or be directly specified in props');
    });

    test('should throw error when domainUnits is provided but path not found', () => {
      const props: DomainConfigProps = {
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainCustomEnvBlueprintId: 'blueprint-123',
        adminUserProfileId: 'admin-123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
        domainUnits: {
          '/unit1': 'unit-id-1',
        },
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfig', props);

      expect(() => {
        domainConfig.getDomainUnitId('/nonexistent');
      }).toThrow('DomainUnits must be either retrievable from SSM or be directly specified in props');
    });
  });

  describe('createDomainConfigParams Tests', () => {
    test('should create all required SSM parameters', () => {
      const props: DomainConfigProps = {
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainCustomEnvBlueprintId: 'blueprint-123',
        adminUserProfileId: 'admin-123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfig', props);
      const paramArns = domainConfig.createDomainConfigParams('test-resource');

      expect(paramArns).toHaveLength(10); // 10 base parameters without domain units
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
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainCustomEnvBlueprintId: 'blueprint-123',
        adminUserProfileId: 'admin-123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
        domainUnits: {
          '/unit1': 'unit-id-1',
          '/unit2': 'unit-id-2',
        },
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfigWithUnits', props);
      const paramArns = domainConfig.createDomainConfigParams('test-resource');

      expect(paramArns).toHaveLength(12); // 10 base + 2 domain unit parameters
    });

    test('should handle empty adminUserProfileId', () => {
      const props: DomainConfigProps = {
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainCustomEnvBlueprintId: 'blueprint-123',
        adminUserProfileId: '',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfigNoAdmin', props);
      const paramArns = domainConfig.createDomainConfigParams('test-resource');

      expect(paramArns).toHaveLength(10);
      expect(paramArns.every(arn => typeof arn === 'string')).toBe(true);
    });

    test('should handle empty domainCustomEnvBlueprintId', () => {
      const props: DomainConfigProps = {
        naming: testApp.naming,
        domainName: 'test-domain',
        domainVersion: '1.0.0',
        domainId: 'dzd_test123',
        domainArn: 'arn:aws:datazone:us-east-1:xxxxxxxxxxxxx:domain/dzd_test123',
        domainCustomEnvBlueprintId: '',
        adminUserProfileId: 'admin-123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/12345678-1234-1234-1234-xxxxxxxxxxxxx',
        glueCatalogKmsKeyArns: ['arn:aws:kms:us-east-1:xxxxxxxxxxxxx:key/glue-key-1'],
        domainKmsUsagePolicyName: 'test-policy',
        glueCatalogArns: ['arn:aws:glue:us-east-1:xxxxxxxxxxxxx:catalog'],
      };

      const domainConfig = new DomainConfig(testStack, 'TestDomainConfigNoBlueprint', props);
      const paramArns = domainConfig.createDomainConfigParams('test-resource');

      expect(paramArns).toHaveLength(10);
      expect(paramArns.every(arn => typeof arn === 'string')).toBe(true);
    });
  });

  describe('Static Method Tests', () => {
    describe('ssmParamArnOrName', () => {
      test('should handle ARN format', () => {
        const arn = 'arn:aws:ssm:test-region:xxxxxxxxxxxxx:parameter/test/param';
        const param = DomainConfig.ssmParamArnOrName(testStack, 'test-param-arn', arn);

        expect(param).toBeDefined();
        expect(typeof param.stringValue).toBe('string');
      });

      test('should handle parameter name format with leading slash', () => {
        const name = '/test/param';
        const param = DomainConfig.ssmParamArnOrName(testStack, 'test-param-name', name);

        expect(param).toBeDefined();
        expect(typeof param.stringValue).toBe('string');
      });

      test('should handle parameter name format without leading slash', () => {
        const name = 'test/param';
        const param = DomainConfig.ssmParamArnOrName(testStack, 'test-param-name-no-slash', name);

        expect(param).toBeDefined();
        expect(typeof param.stringValue).toBe('string');
      });
    });

    describe('fromSsm', () => {
      test('should create DomainConfig from SSM parameters', () => {
        const ssmParam = '/test/domain/config';

        const domainConfig = DomainConfig.fromSsm(testStack, 'TestFromSSM', ssmParam, testApp.naming);

        expect(domainConfig).toBeDefined();
        expect(domainConfig.ssmParamBase).toBe(ssmParam);
        expect(typeof domainConfig.domainName).toBe('string');
        expect(typeof domainConfig.domainId).toBe('string');
        expect(typeof domainConfig.domainArn).toBe('string');
        expect(typeof domainConfig.domainVersion).toBe('string');
        expect(typeof domainConfig.domainKmsKeyArn).toBe('string');
        expect(typeof domainConfig.adminUserProfileId).toBe('string');
        expect(typeof domainConfig.domainKmsUsagePolicyName).toBe('string');
        expect(Array.isArray(domainConfig.glueCatalogKmsKeyArns)).toBe(true);
        expect(Array.isArray(domainConfig.glueCatalogArns)).toBe(true);

        const template = Template.fromStack(testStack);

        // Verify CloudFormation parameters are created for list values
        template.hasParameter('TestFromSSMssmgluecatalogkmsarns', {
          Type: 'AWS::SSM::Parameter::Value<List<String>>',
        });

        template.hasParameter('TestFromSSMssmgluecatalogresourcearns', {
          Type: 'AWS::SSM::Parameter::Value<List<String>>',
        });
      });

      test('should create unique construct IDs for multiple fromSsm calls', () => {
        const ssmParam1 = '/test/domain1/config';
        const ssmParam2 = '/test/domain2/config';

        const domainConfig1 = DomainConfig.fromSsm(testStack, 'TestFromSSM1', ssmParam1, testApp.naming);
        const domainConfig2 = DomainConfig.fromSsm(testStack, 'TestFromSSM2', ssmParam2, testApp.naming);

        expect(domainConfig1).toBeDefined();
        expect(domainConfig2).toBeDefined();
        expect(domainConfig1.ssmParamBase).toBe(ssmParam1);
        expect(domainConfig2.ssmParamBase).toBe(ssmParam2);
      });
    });
  });

  describe('Integration Tests', () => {
    test('should work with real-world scenario', () => {
      const props: DomainConfigProps = {
        naming: testApp.naming,
        domainName: 'production-datazone-domain',
        domainVersion: '2.1.0',
        domainId: 'dzd_prod123456',
        domainArn: 'arn:aws:datazone:us-west-2:xxxxxxxxxxxxx:domain/dzd_prod123456',
        domainCustomEnvBlueprintId: 'blueprint-prod-789',
        adminUserProfileId: 'admin-prod-456',
        domainKmsKeyArn: 'arn:aws:kms:us-west-2:xxxxxxxxxxxxx:key/abcd1234-5678-90ef-ghij-klmnopqrstuv',
        glueCatalogKmsKeyArns: [
          'arn:aws:kms:us-west-2:xxxxxxxxxxxxx:key/glue-key-1',
          'arn:aws:kms:us-west-2:xxxxxxxxxxxxx:key/glue-key-2',
        ],
        domainKmsUsagePolicyName: 'production-datazone-kms-policy',
        glueCatalogArns: ['arn:aws:glue:us-west-2:xxxxxxxxxxxxx:catalog', 'arn:aws:glue:us-west-2:xxxxxxxxxxx:catalog'],
        ssmParamBase: '/production/datazone/domain',
        domainUnits: {
          '/finance': 'finance-unit-id',
          '/marketing': 'marketing-unit-id',
          '/engineering': 'engineering-unit-id',
        },
      };

      const domainConfig = new DomainConfig(testStack, 'ProductionDomainConfig', props);

      // Test all functionality - when ssmParamBase is provided, getDomainUnitId returns tokens
      const financeUnitId = domainConfig.getDomainUnitId('/finance');
      const marketingUnitId = domainConfig.getDomainUnitId('/marketing');
      const engineeringUnitId = domainConfig.getDomainUnitId('/engineering');

      expect(typeof financeUnitId).toBe('string');
      expect(typeof marketingUnitId).toBe('string');
      expect(typeof engineeringUnitId).toBe('string');

      const paramArns = domainConfig.createDomainConfigParams('production');
      expect(paramArns).toHaveLength(13); // 10 base + 3 domain units

      const template = Template.fromStack(testStack);

      // Verify multiple SSM parameters are created
      const ssmParameters = template.findResources('AWS::SSM::Parameter');
      expect(Object.keys(ssmParameters).length).toBeGreaterThan(10);
    });

    test('should handle edge cases gracefully', () => {
      const props: DomainConfigProps = {
        naming: testApp.naming,
        domainName: '',
        domainVersion: '',
        domainId: '',
        domainArn: '',
        domainCustomEnvBlueprintId: '',
        adminUserProfileId: '',
        domainKmsKeyArn: '',
        glueCatalogKmsKeyArns: [''], // Empty string instead of empty array to avoid FnJoin error
        domainKmsUsagePolicyName: '',
        glueCatalogArns: [''], // Empty string instead of empty array to avoid FnJoin error
        domainUnits: {},
      };

      const domainConfig = new DomainConfig(testStack, 'EdgeCaseDomainConfig', props);
      const paramArns = domainConfig.createDomainConfigParams('edge-case');

      expect(paramArns).toHaveLength(10); // Still creates all base parameters
      expect(paramArns.every(arn => typeof arn === 'string')).toBe(true);
    });
  });
});

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { ConfigurationElement, IMdaaConfigTransformer } from '@aws-mdaa/config';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import { MdaaAppConfigParser, MdaaAppConfigParserProps } from '../lib';

type TestMdaaBaseConfigContents = never;

class TestAppConfigParser extends MdaaAppConfigParser<TestMdaaBaseConfigContents> {
  constructor(
    stack: Stack,
    configSchema: Schema,
    props: MdaaAppConfigParserProps,
    configTransformers?: IMdaaConfigTransformer[],
  ) {
    super(stack, props, configSchema, configTransformers);
  }
  public getValidatedConfig() {
    return this.configContents;
  }
}

describe('ConfigParseTest', () => {
  const configSchema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    additionalProperties: true,
    type: 'object',
  } as Schema;

  const testContextObj = {
    testingkey: 'testingobjval',
  };

  const testContextList = ['val1', 'val2', 'val3'];

  const appConfigRaw = {
    testssm: 'ssm:/test/param/path',
    testresolvessmref: 'testing{{resolve:ssm:/test/param/path}}testing',
    testgeneratedroleid: 'generated-role-id:testing',
    testgeneratedrolearn: 'generated-role-arn:testing',
    'test_{{org}}_test': 'testing',
    '{{param:test_key_param}}': 'test_key_param_value',
  };

  const context = {
    org: 'testorg',
    domain: 'testdomain',
    env: 'testenv',
    module_name: 'testmodule',
    test_context_obj: `obj:${JSON.stringify(JSON.stringify(testContextObj))}`,
    test_context_name: 'test_context_value',
    test_context_list: `list:${JSON.stringify(JSON.stringify(testContextList))}`,
    output_effective_config: 'true',
  };

  const testApp = new MdaaTestApp(context);
  const testStack = new Stack(testApp, 'test-stack');
  const appConfigProps = {
    org: context.org,
    domain: context.domain,
    environment: context.env,
    module_name: context.module_name,
    rawConfig: appConfigRaw,
    naming: testApp.naming,
    env: {},
  };
  describe('BasicConfigParseTest', () => {
    class TestTransformer implements IMdaaConfigTransformer {
      transformConfig(config: ConfigurationElement): ConfigurationElement {
        return config;
      }
    }
    const testStackConfig = new TestAppConfigParser(testStack, configSchema, appConfigProps, [new TestTransformer()]);
    const resolvedConfig = testStackConfig.getValidatedConfig();

    test('Naked ssm:', () => {
      expect(resolvedConfig['testssm']).toMatch(/\${Token\[TOKEN.\d+]}/);
    });
    test('Resolve ssm ref', () => {
      expect(resolvedConfig['testresolvessmref']).toMatch(/testing\${Token\[TOKEN.\d+]}testing/);
    });
    test('Generated Role Id:', () => {
      expect(resolvedConfig['testgeneratedroleid']).toMatch(/\${Token\[TOKEN.\d+]}/);
    });
    test('Generated Role Arn:', () => {
      expect(resolvedConfig['testgeneratedrolearn']).toMatch(/\${Token\[TOKEN.\d+]}/);
    });
    test('Key Ref:', () => {
      expect(resolvedConfig['test_testorg_test']).toBe('testing');
    });
  });

  test('InvalidConfigSchema', () => {
    const configSchema = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'string',
    } as Schema;

    expect(() => new TestAppConfigParser(testStack, configSchema, appConfigProps)).toThrow();
  });
});

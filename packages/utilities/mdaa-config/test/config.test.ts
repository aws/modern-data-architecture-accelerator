/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { App, Stack } from 'aws-cdk-lib';
// nosemgrep
import * as path from 'path';
import {
  MdaaConfigRefValueTransformer,
  MdaaConfigSSMValueTransformer,
  MdaaConfigTransformer,
  ConfigConfigPathValueTransformer,
  MdaaServiceCatalogProductConfig,
  IMdaaConfigValueTransformer,
  MdaaConfigParamRefValueTransformer,
  MdaaConfigRefValueTransformerProps,
  MdaaConfigParamRefValueTransformerProps,
  ConfigurationElement,
} from '../lib';
import * as console from 'console';

class TestKeyTransformer implements IMdaaConfigValueTransformer {
  public transformValue(value: string, contextPath?: string | undefined): string {
    console.log(`Transforming ${contextPath}:${value} -> "transformedValue"`);
    return 'transformedKey';
  }
}

class TestValueTransformer implements IMdaaConfigValueTransformer {
  public transformValue(value: string, contextPath?: string | undefined): string {
    console.log(`Transforming ${contextPath}:${value} -> "transformedValue"`);
    return 'transformedValue';
  }
}
describe('Test MdaaConfigKeyTransformer', () => {
  describe('Test transformConfigObject', () => {
    const testConfigObj = {
      testString: 'testing',
    };
    const transformedConfig = new MdaaConfigTransformer(
      new TestValueTransformer(),
      new TestKeyTransformer(),
    ).transformConfig(testConfigObj);

    test('String Transformation', () => {
      expect(transformedConfig['transformedKey']).toBe('transformedValue');
    });
  });
});
describe('Test MdaaConfigValueTransformer', () => {
  describe('Test transformConfigObject', () => {
    const testConfigObj = {
      testString: 'testing',
      testNumber: 123,
      testObj: {
        testObjString: 'testing',
      },
      testArray: ['testing1', 'testing2'],
    };
    const transformedConfig = new MdaaConfigTransformer(new TestValueTransformer()).transformConfig(testConfigObj);

    test('String Transformation', () => {
      expect(transformedConfig['testString']).toBe('transformedValue');
    });
    test('Number Transformation', () => {
      expect(transformedConfig['testNumber']).toBe(123);
    });
    test('Child Object String Transformation', () => {
      expect((transformedConfig['testObj'] as ConfigurationElement)['testObjString']).toBe('transformedValue');
    });
    test('Child Array String Transformation', () => {
      expect((transformedConfig['testArray'] as unknown[])[0]).toBe('transformedValue');
      expect((transformedConfig['testArray'] as unknown[])[1]).toBe('transformedValue');
    });
  });

  describe('Test transformConfigArray', () => {
    const testArray = [
      'testing1',
      'testing2',
      {
        testingobj: 'testingobjvalue',
      },
      ['testingchild1', 'testingchild2'],
      123,
    ];
    const transformedConfig = new MdaaConfigTransformer(new TestValueTransformer()).transformConfigArray(
      '/',
      testArray,
    );
    describe('Array String Transformation', () => {
      test('Array String values', () => {
        expect(transformedConfig[0]).toBe('transformedValue');
        expect(transformedConfig[1]).toBe('transformedValue');
      });
      test('Array child object values', () => {
        expect((transformedConfig[2] as ConfigurationElement)['testingobj']).toBe('transformedValue');
      });
      test('Array child array values', () => {
        expect((transformedConfig[3] as ConfigurationElement)[0]).toBe('transformedValue');
        expect((transformedConfig[3] as ConfigurationElement)[1]).toBe('transformedValue');
      });
      test('Array number values', () => {
        expect(transformedConfig[4]).toBe(123);
      });
    });
  });
});
describe('Test MdaaConfigRefValueTransformer', () => {
  // Helper function that mimics CLI encoding (copied from packages/cli/lib/utils.ts)
  // This documents the encoding contract that the decoder must handle
  function encodeContextValue(contextValue: unknown): string {
    let encodedContextValue: string;
    if (contextValue instanceof Array) {
      encodedContextValue = `"list:${JSON.stringify(contextValue)}"`;
    } else if (contextValue instanceof Object) {
      encodedContextValue = `"obj:${JSON.stringify(contextValue)}"`;
    } else if (typeof contextValue === 'string') {
      encodedContextValue = contextValue;
    } else if (typeof contextValue === 'boolean') {
      encodedContextValue = contextValue ? 'true' : 'false';
    } else {
      throw Error(`Don't know how to handle type ${contextValue}`);
    }
    return encodedContextValue;
  }

  const testContextObj = {
    testingkey: 'testingobjval',
  };
  const testContextList = ['val1', 'val2', 'val3'];
  const context = {
    org: 'testorg',
    domain: 'testdomain',
    env: 'testenv',
    module_name: 'testmodule',
    test_context_obj: encodeContextValue(testContextObj),
    test_context_name: 'test_context_value',
    test_context_list: encodeContextValue(testContextList),
  };
  const testApp = new App({ context: context });
  const testStack = new Stack(testApp, 'testStack');

  const transformerProps: MdaaConfigRefValueTransformerProps = {
    org: 'testorg',
    domain: 'testdomain',
    env: 'testenv',
    module_name: 'testmodule',
    scope: testStack,
  };

  const serviceCatalogConfig: MdaaServiceCatalogProductConfig = {
    portfolio_arn: 'dummy-portfolio-arn',
    owner: 'owner',
    name: 'test product name',
    launch_role_name: 'dummy-launch-role',
    parameters: {
      number_param: {
        props: {
          type: 'Number',
          description: 'Sample number parameter',
          default: 10,
        },
      },
      string_param: {
        props: {
          type: 'String',
          description: 'Sample string parameter',
          default: 'default_string',
        },
      },
      list_param: {
        props: {
          type: 'CommaDelimitedList',
          description: 'Sample list parameter',
          default: 'sample,list,of,strings',
        },
      },
    },
  };
  test('Nested', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue(
      'testing{{resolve:ssm:/{{org}}/{{domain}}/{{env}}/{{module_name}}}}testing',
    );
    expect(transformedValue).toMatch(/testing\${Token\[TOKEN.\d+]}testing/);
  });
  test('MultiRef', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue(
      'multi-{{org}}-{{domain}}-{{env}}',
    );
    expect(transformedValue).toBe('multi-testorg-testdomain-testenv');
  });
  test('No Ref', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue('noref');
    expect(transformedValue).toBe('noref');
  });

  test('Env Var', () => {
    process.env['TEST_VAR'] = 'testval';
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue('{{env_var:TEST_VAR}}');
    expect(transformedValue).toBe('testval');
  });

  test('MissingContext', () => {
    expect(() => new MdaaConfigRefValueTransformer(transformerProps).transformValue('{{context:missing}}')).toThrow();
  });

  test('Context Obj - Naked Reference', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue(
      '{{context:test_context_obj}}',
    );
    // Naked reference should return the actual object
    expect(transformedValue).toEqual(testContextObj);
  });

  test('Context Obj - Embedded Reference Should Error', () => {
    // Embedding an object in a string should throw an error
    expect(() => {
      new MdaaConfigRefValueTransformer(transformerProps).transformValue('prefix-{{context:test_context_obj}}');
    }).toThrow(/Cannot embed array or object context value in string/);
  });

  test('Context List - Naked Reference', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue(
      '{{context:test_context_list}}',
    );
    // Naked reference should return the actual array
    expect(transformedValue).toEqual(testContextList);
  });

  test('Context List - Embedded Reference Should Error', () => {
    // Embedding an array in a string should throw an error
    expect(() => {
      new MdaaConfigRefValueTransformer(transformerProps).transformValue('prefix-{{context:test_context_list}}');
    }).toThrow(/Cannot embed array or object context value in string/);
  });

  test('Resolve ssm ref', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue(
      'testing{{resolve:ssm:/test/param/path}}testing',
    );
    expect(transformedValue).toMatch(/testing\${Token\[TOKEN.\d+]}testing/);
  });
  test('Resolve ssm non ref', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue(
      'testing{{resolve:nonssm}}testing',
    );
    expect(transformedValue).toBe('testing{{resolve:nonssm}}testing');
  });
  test('Context', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue(
      'testing{{context:test_context_name}}testing',
    );
    expect(transformedValue).toBe('testingtest_context_valuetesting');
  });
  test('ContextOrg', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue(
      'testing{{context:org}}testing',
    );
    expect(transformedValue).toBe('testingtestorgtesting');
  });
  test('OrgRef', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue('{{org}}');
    expect(transformedValue).toBe('testorg');
  });
  test('Param', () => {
    const transformedValue = new MdaaConfigParamRefValueTransformer(transformerProps).transformValue(
      '{{param:paramname}}',
    );
    expect(transformedValue).toMatch(/\${Token\[TOKEN.\d+]}/);
  });

  const paramTransformerProps: MdaaConfigParamRefValueTransformerProps = {
    ...transformerProps,
    serviceCatalogConfig: serviceCatalogConfig,
  };

  test('ParamNotInServiceCatalogConfig', () => {
    const transformedValue = new MdaaConfigParamRefValueTransformer(paramTransformerProps).transformValue(
      '{{param:parameter_not_in_sc_config}}',
    );
    expect(transformedValue).toMatch(/\${Token\[TOKEN.\d+]}/);
  });
  test('StringParamInServiceCatalogConfig', () => {
    const transformedValue = new MdaaConfigParamRefValueTransformer(paramTransformerProps).transformValue(
      '{{param:string_param}}',
    );
    expect(transformedValue).toMatch(/\${Token\[TOKEN.\d+]}/);
  });

  test('NumberParamInServiceCatalogConfig', () => {
    const transformedValue = new MdaaConfigParamRefValueTransformer(paramTransformerProps).transformValue(
      '{{param:number_param}}',
    );
    expect(typeof transformedValue).toBe('number');
  });
  test('ListParamInServiceCatalogConfig', () => {
    const transformedValue = new MdaaConfigParamRefValueTransformer(paramTransformerProps).transformValue(
      '{{param:list_param}}',
    );
    expect(transformedValue).toMatch(/#{Token\[TOKEN.\d+]}/);
  });
  test('StringParamAnnotation', () => {
    const transformedValue = new MdaaConfigParamRefValueTransformer(transformerProps).transformValue(
      '{{param:string:string_param}}',
    );
    expect(transformedValue).toMatch(/\${Token\[TOKEN.\d+]}/);
  });
  test('NumberParamAnnotation', () => {
    const transformedValue = new MdaaConfigParamRefValueTransformer(transformerProps).transformValue(
      '{{param:number:number_param}}',
    );
    expect(typeof transformedValue).toBe('number');
  });
  test('ListParamAnnotation', () => {
    const transformedValue = new MdaaConfigParamRefValueTransformer(transformerProps).transformValue(
      '{{param:list:list_param}}',
    );
    expect(transformedValue).toMatch(/#{Token\[TOKEN.\d+]}/);
  });
  test('PrefixedNumberParam', () => {
    const transformedValue = new MdaaConfigParamRefValueTransformer(transformerProps).transformValue(
      'testing{{param:number:number_param}}',
    );
    expect(transformedValue).toMatch(/^testing-\d+(\.\d+)?(e\+\d+)?$/);
  });
  test('PrefixedListParam', () => {
    const transformedValue = new MdaaConfigParamRefValueTransformer(transformerProps).transformValue(
      'testing{{param:list:list_param}}',
    );
    expect(transformedValue).toMatch(/testing#{Token\[TOKEN.\d+]}/);
  });
  test('NestedResolutionWithinNumberParam', () => {
    const transformedValue = new MdaaConfigParamRefValueTransformer(transformerProps).transformValue(
      '{{param:number:{{org}}_param}}',
    );
    expect(typeof transformedValue).toBe('number');
  });

  test('Partition', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue('{{partition}}');
    expect(transformedValue).toMatch(/\${Token\[AWS.Partition.\d+]}/);
  });
  test('Region', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue('{{region}}');
    expect(transformedValue).toMatch(/\${Token\[AWS.Region.\d+]}/);
  });

  test('Account', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue('{{account}}');
    expect(transformedValue).toMatch(/\${Token\[AWS.AccountId.\d+]}/);
  });
  test('Module Name', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue('{{module_name}}');
    expect(transformedValue).toBe('testmodule');
  });

  // Additional test cases for better coverage

  test('Naked SSM Reference', () => {
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue(
      '{{resolve:ssm:/test/param/path}}',
    );
    expect(transformedValue).toMatch(/\${Token\[TOKEN.\d+]}/);
  });

  test('Naked Env Var', () => {
    process.env['NAKED_TEST_VAR'] = 'naked_testval';
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue(
      '{{env_var:NAKED_TEST_VAR}}',
    );
    expect(transformedValue).toBe('naked_testval');
  });

  test('Missing Env Var - Embedded', () => {
    delete process.env['MISSING_VAR'];
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue(
      'prefix-{{env_var:MISSING_VAR}}-suffix',
    );
    // Should leave the reference as-is when env var is undefined
    expect(transformedValue).toBe('prefix-{{env_var:MISSING_VAR}}-suffix');
  });

  test('Missing Env Var - Naked Reference', () => {
    delete process.env['MISSING_VAR_NAKED'];
    const transformedValue = new MdaaConfigRefValueTransformer(transformerProps).transformValue(
      '{{env_var:MISSING_VAR_NAKED}}',
    );
    // Should return the original string for naked reference with undefined env var
    expect(transformedValue).toBe('{{env_var:MISSING_VAR_NAKED}}');
  });

  test('Nested Context Array in SSM Path Should Error', () => {
    expect(() => {
      new MdaaConfigRefValueTransformer(transformerProps).transformValue(
        '{{resolve:ssm:/{{context:test_context_list}}/path}}',
      );
    }).toThrow(/Cannot embed array or object context value in string/);
  });

  test('Nested Context Object in String Should Error', () => {
    expect(() => {
      new MdaaConfigRefValueTransformer(transformerProps).transformValue(
        'prefix-{{resolve:ssm:/{{context:test_context_obj}}/path}}',
      );
    }).toThrow(/Cannot embed array or object context value in string/);
  });

  test('Boolean Context Value', () => {
    const contextWithBool = {
      ...context,
      bool_value: 'true', // Encoded as string
    };
    const appWithBool = new App({ context: contextWithBool });
    const stackWithBool = new Stack(appWithBool, 'testStackBool');
    const propsWithBool = { ...transformerProps, scope: stackWithBool };

    const transformedValue = new MdaaConfigRefValueTransformer(propsWithBool).transformValue('{{context:bool_value}}');
    expect(transformedValue).toBe('true');
  });

  test('Nested Object Context', () => {
    const nestedObj = {
      outer: {
        inner: 'value',
      },
    };
    const contextWithNested = {
      ...context,
      nested_obj: encodeContextValue(nestedObj),
    };
    const appWithNested = new App({ context: contextWithNested });
    const stackWithNested = new Stack(appWithNested, 'testStackNested');
    const propsWithNested = { ...transformerProps, scope: stackWithNested };

    const transformedValue = new MdaaConfigRefValueTransformer(propsWithNested).transformValue(
      '{{context:nested_obj}}',
    );
    expect(transformedValue).toEqual(nestedObj);
  });

  test('Array with Mixed Types Context', () => {
    const mixedArray = ['string', 123, true, { key: 'value' }];
    const contextWithMixed = {
      ...context,
      mixed_array: encodeContextValue(mixedArray),
    };
    const appWithMixed = new App({ context: contextWithMixed });
    const stackWithMixed = new Stack(appWithMixed, 'testStackMixed');
    const propsWithMixed = { ...transformerProps, scope: stackWithMixed };

    const transformedValue = new MdaaConfigRefValueTransformer(propsWithMixed).transformValue(
      '{{context:mixed_array}}',
    );
    expect(transformedValue).toEqual(mixedArray);
  });
});

describe('Test MdaaConfigSSMValueTransformer', () => {
  test('Non ssm:', () => {
    const transformedValue = new MdaaConfigSSMValueTransformer().transformValue('testvalue', 'testPath');
    expect(transformedValue).toBe('testvalue');
  });
  test('Naked ssm:', () => {
    const transformedValue = new MdaaConfigSSMValueTransformer().transformValue('ssm:testSSMParamPath', 'testPath');
    expect(transformedValue).toBe('{{resolve:ssm:testSSMParamPath}}');
  });
  test('Ignored SSM: Action', () => {
    const transformedValue = new MdaaConfigSSMValueTransformer().transformValue(
      'ssm:GetParameter',
      'policyDocument/Statement/Action',
    );
    expect(transformedValue).toBe('ssm:GetParameter');
  });
});
describe('Test ConfigConfigPathValueTransformer', () => {
  test('Non relative', () => {
    const transformedValue = new ConfigConfigPathValueTransformer('testBaseDir').transformValue('testNonRelative');
    expect(transformedValue).toBe('testNonRelative');
  });
  test('Relative', () => {
    const transformedValue = new ConfigConfigPathValueTransformer('testBaseDir').transformValue('./relative');
    expect(transformedValue).toBe(path.resolve('./relative'.replace(/^\./, 'testBaseDir')));
  });

  test('Parent Relative', () => {
    const transformedValue = new ConfigConfigPathValueTransformer('testBaseDir').transformValue('../relative-parent');
    expect(transformedValue).toBe(path.resolve('./relative-parent'));
  });

  test('Parent Sub folder Relative', () => {
    const transformedValue = new ConfigConfigPathValueTransformer('testBaseDir').transformValue('../app/code');
    expect(transformedValue).toBe(path.resolve('./app/code'));
  });

  test('Grandparent folder Relative', () => {
    const transformedValue = new ConfigConfigPathValueTransformer('testBaseDir').transformValue('../../mdaa-naming');
    expect(transformedValue).toBe(path.resolve('../mdaa-naming'));
  });
});

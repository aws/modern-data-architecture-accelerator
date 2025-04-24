/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CfnParameter, CfnParameterProps } from 'aws-cdk-lib';
import { MdaaConfigParamRefValueTransformer, MdaaConfigParamRefValueTransformerProps } from '../lib';
import { Construct, Node } from 'constructs';

/**
 * These tests cover all logic not directly related to the Transformers
 */
jest.mock('aws-cdk-lib', () => ({
  CfnParameter: jest.fn().mockImplementation(() => ({
    valueAsString: 'string-value',
    valueAsNumber: 123,
    valueAsList: ['item1', 'item2'],
  })),
}));
describe('Test createParamUsingTypeLabels', () => {
  class TestConfigTransformer extends MdaaConfigParamRefValueTransformer {
    public scope: Construct | undefined;

    constructor(props?: MdaaConfigParamRefValueTransformerProps) {
      props =
        props ||
        ({
          scope: {
            node: {} as Node,
          } as Construct,
        } as MdaaConfigParamRefValueTransformerProps);
      super(props);
      this.scope = props.scope;
    }

    public testCreateParamUsingTypeLabels(
      paramBase: string,
      paramName: string,
      paramProps: CfnParameterProps | undefined,
    ) {
      return this.createParamUsingTypeLabels(paramBase, paramName, paramProps);
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('throws error when scope is not defined', () => {
    const testClass = new TestConfigTransformer({} as unknown as MdaaConfigParamRefValueTransformerProps);
    // Act & Assert
    expect(() => {
      testClass.testCreateParamUsingTypeLabels('string:test', 'TestParam', {});
    }).toThrow('Unable to create params outside of a Construct');
  });

  test('creates string parameter when paramBase starts with "string:"', () => {
    // Arrange
    const paramProps = { default: 'default-value' };
    const testClass = new TestConfigTransformer();

    // Act
    const result = testClass.testCreateParamUsingTypeLabels('string:test', 'TestParam', paramProps);

    // Assert
    expect(CfnParameter).toHaveBeenCalledWith(testClass.scope, 'TestParam', { ...paramProps, type: 'String' });
    expect(result).toBe('string-value');
  });

  test('creates number parameter when paramBase starts with "number"', () => {
    // Arrange
    const paramProps = { default: 42 };
    const testClass = new TestConfigTransformer();

    // Act
    const result = testClass.testCreateParamUsingTypeLabels('number:test', 'TestParam', paramProps);

    // Assert
    expect(CfnParameter).toHaveBeenCalledWith(testClass.scope, 'TestParam', { ...paramProps, type: 'Number' });
    expect(result).toBe(123);
  });

  test('creates list parameter when paramBase starts with "list"', () => {
    const mockScope = {
      node: {} as Node,
    };
    const testClass = new TestConfigTransformer({ scope: mockScope } as MdaaConfigParamRefValueTransformerProps);

    // Arrange
    const paramProps = { default: 'item1,item2' };

    // Act
    const result = testClass.testCreateParamUsingTypeLabels('list:test', 'TestParam', paramProps);

    // Assert
    expect(CfnParameter).toHaveBeenCalledWith(testClass.scope, 'TestParam', {
      ...paramProps,
      type: 'CommaDelimitedList',
    });
    expect(result).toBe('item1,item2');
  });

  test('creates default string parameter when no type prefix is provided', () => {
    const testClass = new TestConfigTransformer();

    // Arrange
    const paramProps = { default: 'default-value' };

    // Act
    const result = testClass.testCreateParamUsingTypeLabels('test', 'TestParam', paramProps);

    // Assert
    expect(CfnParameter).toHaveBeenCalledWith(testClass.scope, 'TestParam', paramProps);
    expect(result).toBe('string-value');
  });

  test('handles undefined paramProps', () => {
    const testClass = new TestConfigTransformer();

    // Act
    const result = testClass.testCreateParamUsingTypeLabels('string:test', 'TestParam', undefined);

    // Assert
    expect(CfnParameter).toHaveBeenCalledWith(testClass.scope, 'TestParam', { type: 'String' });
    expect(result).toBe('string-value');
  });
});

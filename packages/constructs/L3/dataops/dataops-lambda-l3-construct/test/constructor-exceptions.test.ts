/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { LambdaFunctionL3Construct, LambdaFunctionL3ConstructProps } from '../lib';

describe('LambdaFunctionL3Construct Constructor Exception Scenarios', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('throws error when kmsArn is not provided', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
    };

    expect(() => {
      new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);
    }).toThrow('Project kms key must be defined');
  });

  test('throws error for non-docker function without runtime', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      functions: [
        {
          functionName: 'invalid-function',
          srcDir: './test/src/lambda/test',
          roleArn: 'arn:aws:iam::123456789012:role/test-role',
        },
      ],
    };

    expect(() => {
      new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);
    }).toThrow('Function runtime must be defined for non-docker functions');
  });

  test('throws error for non-docker function without handler', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      functions: [
        {
          functionName: 'invalid-function',
          srcDir: './test/src/lambda/test',
          roleArn: 'arn:aws:iam::123456789012:role/test-role',
          runtime: 'nodejs18.x',
        },
      ],
    };

    expect(() => {
      new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);
    }).toThrow('Function handler must be defined for non-docker functions');
  });

  test('throws error for non-existent generated layer reference', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      functions: [
        {
          functionName: 'bad-layer-function',
          srcDir: './test/src/lambda/test',
          handler: 'index.handler',
          roleArn: 'arn:aws:iam::123456789012:role/test-role',
          runtime: 'nodejs18.x',
          generatedLayerNames: ['non-existent-layer'],
        },
      ],
    };

    expect(() => {
      new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);
    }).toThrow('Function references non-existant generated layer non-existent-layer');
  });

  test('removes LambdaRole child nodes during construction', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      functions: [
        {
          functionName: 'test-function',
          srcDir: './test/src/lambda/test',
          handler: 'index.handler',
          roleArn: 'arn:aws:iam::123456789012:role/test-role',
          runtime: 'nodejs18.x',
        },
      ],
    };

    const construct = new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);
    
    expect(construct).toBeDefined();
    expect(construct.functionsMap['test-function']).toBeDefined();
  });

  test('creates layer without dockerBuild property', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      layers: [
        {
          layerName: 'asset-layer',
          src: './test/src/lambda/test',
        },
      ],
    };

    const construct = new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);
    
    expect(construct).toBeDefined();
  });
});
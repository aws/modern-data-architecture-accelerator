/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { LambdaFunctionL3Construct, LambdaFunctionL3ConstructProps } from '../lib';

describe('LambdaFunctionL3Construct', () => {
  let testApp: MdaaTestApp;
  let template: Template;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  test('creates construct with minimal props', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
    };

    const construct = new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);
    template = Template.fromStack(testApp.testStack);

    expect(construct).toBeDefined();
    expect(construct.functionsMap).toEqual({});
  });

  test('creates lambda function', () => {
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
    template = Template.fromStack(testApp.testStack);

    expect(construct.functionsMap['test-function']).toBeDefined();
    template.hasResourceProperties('AWS::Lambda::Function', {
      Handler: 'index.handler',
      Runtime: 'nodejs18.x',
    });
  });

  test('creates docker lambda function', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      functions: [
        {
          functionName: 'docker-function',
          srcDir: './test/src/lambda/docker',
          roleArn: 'arn:aws:iam::123456789012:role/test-role',
          dockerBuild: true,
        },
      ],
    };

    const construct = new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);
    template = Template.fromStack(testApp.testStack);

    expect(construct.functionsMap['docker-function']).toBeDefined();
    template.hasResourceProperties('AWS::Lambda::Function', {
      PackageType: 'Image',
    });
  });

  test('creates lambda layer', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      layers: [
        {
          layerName: 'test-layer',
          src: './test/src/lambda/test',
          description: 'Test layer',
        },
      ],
    };

    new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);
    template = Template.fromStack(testApp.testStack);

    template.hasResourceProperties('AWS::Lambda::LayerVersion', {
      Description: 'Test layer',
    });
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

  test('creates function with additional resource permissions', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      functions: [
        {
          functionName: 'permission-function',
          srcDir: './test/src/lambda/test',
          handler: 'index.handler',
          roleArn: 'arn:aws:iam::123456789012:role/test-role',
          runtime: 'nodejs18.x',
          additionalResourcePermissions: {
            TestPermission: {
              principal: 'arn:aws:iam::123456789012:role/test-principal',
              action: 'lambda:InvokeFunction',
            },
          },
        },
      ],
    };

    const construct = new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);

    expect(construct.functionsMap['permission-function']).toBeDefined();
  });

  test('creates function with grantInvoke and full AdditionalResourcePermission', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      functions: [
        {
          functionName: 'grant-function',
          srcDir: './test/src/lambda/test',
          handler: 'index.handler',
          roleArn: 'arn:aws:iam::123456789012:role/test-role',
          runtime: 'nodejs18.x',
          grantInvoke: 'arn:aws:iam::123456789012:role/invoke-role',
          additionalResourcePermissions: {
            FullPermission: {
              principal: 'arn:aws:iam::123456789012:role/full-principal',
              action: 'lambda:InvokeFunction',
              sourceAccount: '123456789012',
              sourceArn: 'arn:aws:s3:::test-bucket',
            },
          },
        },
      ],
    };

    const construct = new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);

    expect(construct.functionsMap['grant-function']).toBeDefined();
  });

  test('creates function with all configuration options', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      functions: [
        {
          functionName: 'config-function',
          srcDir: './test/src/lambda/test',
          handler: 'index.handler',
          roleArn: 'arn:aws:iam::123456789012:role/test-role',
          runtime: 'nodejs18.x',
          maxEventAgeSeconds: 3600,
          timeoutSeconds: 30,
          environment: { TEST_VAR: 'test-value' },
          reservedConcurrentExecutions: 10,
          memorySizeMB: 256,
          ephemeralStorageSizeMB: 1024,
        },
      ],
    };

    const construct = new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);

    expect(construct.functionsMap['config-function']).toBeDefined();
  });

  test('creates function with VPC configuration', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      functions: [
        {
          functionName: 'vpc-function',
          srcDir: './test/src/lambda/test',
          handler: 'index.handler',
          roleArn: 'arn:aws:iam::123456789012:role/test-role',
          runtime: 'nodejs18.x',
          vpcConfig: {
            vpcId: 'vpc-123',
            subnetIds: ['subnet-123'],
          },
        },
      ],
    };

    const construct = new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);

    expect(construct.functionsMap['vpc-function']).toBeDefined();
  });

  test('creates function with existing security group', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      functions: [
        {
          functionName: 'sg-function',
          srcDir: './test/src/lambda/test',
          handler: 'index.handler',
          roleArn: 'arn:aws:iam::123456789012:role/test-role',
          runtime: 'nodejs18.x',
          vpcConfig: {
            vpcId: 'vpc-123',
            subnetIds: ['subnet-123'],
            securityGroupId: 'sg-123',
          },
        },
      ],
    };

    const construct = new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);

    expect(construct.functionsMap['sg-function']).toBeDefined();
  });

  test('creates function with layers', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      layers: [
        {
          layerName: 'test-layer',
          src: './test/src/lambda/test',
        },
      ],
      functions: [
        {
          functionName: 'layer-function',
          srcDir: './test/src/lambda/test',
          handler: 'index.handler',
          roleArn: 'arn:aws:iam::123456789012:role/test-role',
          runtime: 'nodejs18.x',
          generatedLayerNames: ['test-layer'],
          layerArns: { 'existing-layer': 'arn:aws:lambda:us-east-1:123456789012:layer:existing:1' },
        },
      ],
    };

    const construct = new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);

    expect(construct.functionsMap['layer-function']).toBeDefined();
  });

  test('throws error for non-existent generated layer', () => {
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

  test('creates function with EventBridge configuration', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      functions: [
        {
          functionName: 'event-function',
          srcDir: './test/src/lambda/test',
          handler: 'index.handler',
          roleArn: 'arn:aws:iam::123456789012:role/test-role',
          runtime: 'nodejs18.x',
          eventBridge: {
            eventBridgeRules: {
              'test-rule': {
                eventPattern: { source: ['test'] },
              },
            },
          },
        },
      ],
    };

    const construct = new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);

    expect(construct.functionsMap['event-function']).toBeDefined();
  });

  test('creates construct with overrideScope', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      overrideScope: true,
      functions: [
        {
          functionName: 'override-function',
          srcDir: './test/src/lambda/test',
          handler: 'index.handler',
          roleArn: 'arn:aws:iam::123456789012:role/test-role',
          runtime: 'nodejs18.x',
        },
      ],
    };

    const construct = new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);

    expect(construct.functionsMap['override-function']).toBeDefined();
  });

  test('creates construct with overrideScope and layers', () => {
    const props: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      overrideScope: true,
      layers: [
        {
          layerName: 'override-layer',
          src: './test/src/lambda/test',
        },
      ],
    };

    const construct = new LambdaFunctionL3Construct(testApp.testStack, 'TestLambda', props);

    expect(construct).toBeDefined();
  });
});

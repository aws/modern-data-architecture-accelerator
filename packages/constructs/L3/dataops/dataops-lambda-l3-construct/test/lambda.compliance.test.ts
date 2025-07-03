/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Protocol } from 'aws-cdk-lib/aws-ec2';
import { FunctionProps, LambdaFunctionL3Construct, LambdaFunctionL3ConstructProps, LayerProps } from '../lib';

describe('MDAA Compliance Stack Tests', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const layerProps: LayerProps = {
    layerName: 'test-layer',
    src: './test/src/lambda/test',
    description: 'layer testing',
  };

  const functionProps: FunctionProps = {
    functionName: 'test-function',
    srcDir: './test/src/lambda/test',
    handler: 'test_handler',
    roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
    runtime: 'python3.13',
  };

  const dockerImageFunctionProps: FunctionProps = {
    functionName: 'docker-test-function',
    srcDir: './test/src/lambda/docker',
    roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
    dockerBuild: true,
  };

  const functionVpcProps: FunctionProps = {
    ...functionProps,
    functionName: 'test-vpc-function',
    vpcConfig: {
      vpcId: 'test-vpc',
      subnetIds: ['test-subnet'],
      securityGroupEgressRules: {
        ipv4: [
          {
            cidr: '10.10.10.10/32',
            protocol: Protocol.TCP,
            port: 443,
          },
        ],
      },
    },
  };

  const functionVpcExistingSgProps: FunctionProps = {
    ...functionProps,
    functionName: 'test-vpc-existing-sgfunction',
    vpcConfig: {
      vpcId: 'test-vpc',
      subnetIds: ['test-subnet'],
      securityGroupId: 'test-existing-sg',
    },
  };

  const functionEventBridgeProps: FunctionProps = {
    ...functionProps,
    functionName: 'test-eventbridge-function',
    eventBridge: {
      retryAttempts: 2,
      maxEventAgeSeconds: 3600,
      s3EventBridgeRules: {
        'test-rule': {
          buckets: ['test-bucket'],
        },
      },
      eventBridgeRules: {
        'test-rule': {
          eventPattern: {
            source: ['test-source'],
          },
        },
      },
    },
  };

  const functionWithLayer: FunctionProps = {
    ...functionProps,
    functionName: 'test-layer-function',
    generatedLayerNames: ['test-layer'],
    layerArns: { 'some-existing-layer-name': 'some-existing-layer-arn' },
  };

  const constructProps: LambdaFunctionL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
    functions: [
      functionProps,
      functionVpcProps,
      functionVpcExistingSgProps,
      functionEventBridgeProps,
      functionWithLayer,
      dockerImageFunctionProps,
    ],
    layers: [layerProps],
  };

  new LambdaFunctionL3Construct(stack, 'teststack', constructProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  // console.log( JSON.stringify( template, undefined, 2 ) )

  test('Validate function counts', () => {
    template.resourceCountIs('AWS::Lambda::Function', 6);
  });

  test('Validate layer counts', () => {
    template.resourceCountIs('AWS::Lambda::LayerVersion', 1);
  });

  describe('Base Function', () => {
    test('FunctionRole', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Role: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
      });
    });

    test('DLQ', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        DeadLetterConfig: {
          TargetArn: {
            'Fn::GetAtt': ['dlqtestfunction1ED144DD', 'Arn'],
          },
        },
      });
    });
    test('FunctionName', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'test-org-test-env-test-domain-test-module-test-function',
      });
    });
    test('Environment Var KmsKey', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        KmsKeyArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      });
    });
  });

  describe('VPC Function', () => {
    test('VPC Config', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        VpcConfig: {
          SecurityGroupIds: [
            {
              'Fn::GetAtt': ['teststackec2testvpcfunctionsgDABAD2E6', 'GroupId'],
            },
          ],
          SubnetIds: ['test-subnet'],
        },
      });
    });
    test('VPC Config Existing SG', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        VpcConfig: {
          SecurityGroupIds: ['test-existing-sg'],
          SubnetIds: ['test-subnet'],
        },
      });
    });
    test('Security Group No Allow All', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroup', {
        GroupDescription: 'testing/teststack/ec2/test-vpc-function-sg',
        GroupName: 'test-org-test-env-test-domain-test-module-test-vpc-function-sg',
        SecurityGroupEgress: [
          {
            CidrIp: '255.255.255.255/32',
            Description: 'Disallow all traffic',
            FromPort: 252,
            IpProtocol: 'icmp',
            ToPort: 86,
          },
        ],
        VpcId: 'test-vpc',
      });
    });
    test('Security Custom Egress', () => {
      template.hasResourceProperties('AWS::EC2::SecurityGroupEgress', {
        GroupId: {
          'Fn::GetAtt': ['teststackec2testvpcfunctionsgDABAD2E6', 'GroupId'],
        },
        IpProtocol: 'tcp',
        CidrIp: '10.10.10.10/32',
        Description: 'to 10.10.10.10/32:tcp PORT 443',
        FromPort: 443,
        ToPort: 443,
      });
    });
  });
  describe('Event Bridge Function', () => {
    test('Event Bridge Rule', () => {
      template.hasResourceProperties('AWS::Events::Rule', {
        Description: 'Event Rule for triggering test-eventbridge-function-test-rule with S3 events',
        EventPattern: {
          source: ['aws.s3'],
          detail: {
            bucket: {
              name: ['test-bucket'],
            },
          },
          'detail-type': ['Object Created'],
        },
        Name: 'test-org-test-env-test-domain-test-module-test-rule',
        State: 'ENABLED',
        Targets: [
          {
            Arn: {
              'Fn::GetAtt': ['testeventbridgefunctionC7CEF002', 'Arn'],
            },
            DeadLetterConfig: {
              Arn: {
                'Fn::GetAtt': ['dlqtesteventbridgefunctionevents71A39610', 'Arn'],
              },
            },
            Id: 'Target0',
            RetryPolicy: {
              MaximumEventAgeInSeconds: 3600,
              MaximumRetryAttempts: 2,
            },
          },
        ],
      });
    });
  });
  describe('Layer and Function', () => {
    test('Layer', () => {
      template.hasResourceProperties('AWS::Lambda::LayerVersion', {
        Content: {
          S3Bucket: 'cdk-hnb659fds-assets-test-account-test-region',
          S3Key: Match.stringLikeRegexp('.*.zip$'), //gitleaks:allow
        },
        Description: 'layer testing',
        LayerName: 'test-org-test-env-test-domain-test-module-test-layer',
      });
    });
    test('Layer Function', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        FunctionName: 'test-org-test-env-test-domain-test-module-test-layer-function',
        Layers: [
          {
            Ref: 'layertestlayer3444C77B',
          },
          'some-existing-layer-arn',
        ],
      });
    });
  });
});
describe('Bad function config', () => {
  const layerProps: LayerProps = {
    layerName: 'test-layer',
    src: './test/src/lambda/test-layer.zip',
    description: 'layer testing',
  };

  const functionNoRuntimeProps: FunctionProps = {
    functionName: 'test-function-no-runtime',
    srcDir: './test/src/lambda/test',
    roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
    handler: 'test',
  };

  const functionNoHandlerProps: FunctionProps = {
    functionName: 'test-function-no-handler',
    srcDir: './test/src/lambda/test',
    roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
    runtime: 'test',
  };

  const functionWithBadLayer: FunctionProps = {
    ...functionNoRuntimeProps,
    functionName: 'test-bad-layer-function',
    generatedLayerNames: ['no-test-layer'],
    runtime: 'test',
  };

  test('Test No Runtime', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      functions: [functionNoRuntimeProps],
      layers: [layerProps],
    };

    expect(() => {
      new LambdaFunctionL3Construct(stack, 'test-no-runtime', constructProps);
      testApp.checkCdkNagCompliance(testApp.testStack);
      Template.fromStack(testApp.testStack);
    }).toThrow();
  });
  test('Test No Handler', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      functions: [functionNoHandlerProps],
      layers: [layerProps],
    };

    expect(() => {
      new LambdaFunctionL3Construct(stack, 'test-no-handler', constructProps);
      testApp.checkCdkNagCompliance(testApp.testStack);
      Template.fromStack(testApp.testStack);
    }).toThrow();
  });
  test('Test Bad Layer', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: LambdaFunctionL3ConstructProps = {
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      naming: testApp.naming,
      kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
      functions: [functionWithBadLayer],
      layers: [layerProps],
    };

    expect(() => {
      new LambdaFunctionL3Construct(stack, 'test-bad-layer', constructProps);
      testApp.checkCdkNagCompliance(testApp.testStack);
      Template.fromStack(testApp.testStack);
    }).toThrow();
  });
});

describe('MDAA test with override scope', () => {
  const testApp = new MdaaTestApp();
  const stack = testApp.testStack;

  const layerProps: LayerProps = {
    layerName: 'ovryd-layer',
    src: './test/src/lambda/test',
    description: 'override layer testing',
  };

  const functionProps: FunctionProps = {
    functionName: 'ovryd-function',
    srcDir: './test/src/lambda/test',
    handler: 'test_handler',
    roleArn: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
    runtime: 'python3.13',
  };

  const constructPropsWithOverride: LambdaFunctionL3ConstructProps = {
    roleHelper: new MdaaRoleHelper(stack, testApp.naming),
    naming: testApp.naming,
    kmsArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
    functions: [functionProps],
    layers: [layerProps],
    overrideScope: true,
  };

  new LambdaFunctionL3Construct(stack, 'ovryd-teststack', constructPropsWithOverride);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Validate function created with override scope', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'test-org-test-env-test-domain-test-module-ovryd-function',
      Role: 'arn:test-partition:iam::test-acct:role/test-lambda-role',
    });
  });

  test('Validate layer created with override scope', () => {
    template.hasResourceProperties('AWS::Lambda::LayerVersion', {
      LayerName: 'test-org-test-env-test-domain-test-module-ovryd-layer',
      Description: 'override layer testing',
    });
  });

  test('Validate KMS key reference with override scope', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      KmsKeyArn: 'arn:test-partition:kms:test-region:test-acct:key/test-key-id',
    });
  });

  test('Validate DLQ created with override scope', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      DeadLetterConfig: {
        TargetArn: {
          'Fn::GetAtt': [Match.stringLikeRegexp('ovrydteststackdlqovrydfunction.*'), 'Arn'],
        },
      },
    });
  });
});

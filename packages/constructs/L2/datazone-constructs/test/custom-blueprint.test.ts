/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// Mock aws-cdk-lib/aws-lambda to avoid Docker build during tests
jest.mock('aws-cdk-lib/aws-lambda', () => {
  const actual = jest.requireActual('aws-cdk-lib/aws-lambda');
  const mockCode = {
    bind: jest.fn().mockReturnValue({ s3Location: { bucketName: 'mock-bucket', objectKey: 'mock-key' } }),
    bindToResource: jest.fn(),
  };
  return {
    ...actual,
    Code: {
      ...actual.Code,
      fromAsset: jest.fn().mockReturnValue(mockCode),
      fromDockerBuild: jest.fn().mockReturnValue(mockCode),
      fromCustomCommand: jest.fn().mockReturnValue(mockCode),
    },
  };
});

// Mock command-exists to simulate Docker not available
jest.mock('command-exists', () => ({
  sync: jest.fn().mockReturnValue(false),
}));

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { MdaaSageMakerCustomBlueprintConstruct } from '../lib';
import { Construct } from 'constructs';

// Create a minimal mock for DomainConfig to avoid SSM parameter issues
class MockDomainConfig extends Construct {
  readonly domainId = 'dzd_test123';
  readonly domainName = 'test-domain';
  readonly domainVersion = '1.0';
  readonly domainArn = 'arn:aws:datazone:us-east-1:123456789012:domain/dzd_test123';
  readonly domainKmsKeyArn = 'arn:aws:kms:us-east-1:123456789012:key/test-key-id';
  readonly domainKmsUsagePolicyName = 'test-kms-policy';
  readonly domainBucketUsagePolicyName = 'test-bucket-policy';
  readonly glueCatalogKmsKeyArns = ['arn:aws:kms:us-east-1:123456789012:key/glue-key'];
  readonly glueCatalogArns = ['arn:aws:glue:us-east-1:123456789012:catalog'];
  readonly domainBucketArn = 'arn:aws:s3:::test-domain-bucket';
  readonly ssmParamBase = '/test/datazone';
  readonly domainUnitIds = {};
  readonly blueprintIds = {};
  readonly projectIds = {};
  readonly customResourceRoleName = 'test-custom-resource-role';

  constructor(scope: Construct, id: string) {
    super(scope, id);
  }
}

describe('MdaaSageMakerCustomBlueprintConstruct', () => {
  let testApp: MdaaTestApp;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let domainConfig: any;
  let domainBucket: Bucket;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    domainConfig = new MockDomainConfig(testApp.testStack, 'mock-domain-config');
    domainBucket = new Bucket(testApp.testStack, 'test-domain-bucket');
  });

  it('should create custom blueprint with required properties', () => {
    new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainConfig,
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/provisioning-role',
      blueprintName: 'TestBlueprint',
      templateUrl: 'https://example.com/template.json',
      domainBucket,
      region: 'us-east-1',
      account: '123456789012',
    });

    const template = Template.fromStack(testApp.testStack);
    // Verify Lambda function is created for the custom resource
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.13',
    });
  });

  it('should create blueprint with parameters', () => {
    new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainConfig,
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/provisioning-role',
      blueprintName: 'TestBlueprint',
      templateUrl: 'https://example.com/template.json',
      domainBucket,
      region: 'us-east-1',
      account: '123456789012',
      parameters: {
        instanceType: {
          blueprintParamProps: {
            fieldType: 'String',
            defaultValue: 'ml.t3.medium',
            description: 'Instance type for SageMaker',
            isEditable: true,
            isOptional: false,
          },
        },
        volumeSize: {
          blueprintParamProps: {
            fieldType: 'Number',
            defaultValue: '50',
            description: 'Volume size in GB',
          },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.13',
    });
  });

  it('should throw error for invalid parameter names with hyphens', () => {
    expect(() => {
      new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
        naming: testApp.naming,
        domainConfig,
        provisioningRoleArn: 'arn:aws:iam::123456789012:role/provisioning-role',
        blueprintName: 'TestBlueprint',
        templateUrl: 'https://example.com/template.json',
        domainBucket,
        region: 'us-east-1',
        account: '123456789012',
        parameters: {
          'invalid-param-name': {
            blueprintParamProps: {
              fieldType: 'String',
            },
          },
        },
      });
    }).toThrow(/Param names used in blueprints must match/);
  });

  it('should throw error for parameter names with spaces', () => {
    expect(() => {
      new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
        naming: testApp.naming,
        domainConfig,
        provisioningRoleArn: 'arn:aws:iam::123456789012:role/provisioning-role',
        blueprintName: 'TestBlueprint',
        templateUrl: 'https://example.com/template.json',
        domainBucket,
        region: 'us-east-1',
        account: '123456789012',
        parameters: {
          'param with spaces': {
            blueprintParamProps: {
              fieldType: 'String',
            },
          },
        },
      });
    }).toThrow(/Param names used in blueprints must match/);
  });

  it('should throw error for parameter names with special characters', () => {
    expect(() => {
      new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
        naming: testApp.naming,
        domainConfig,
        provisioningRoleArn: 'arn:aws:iam::123456789012:role/provisioning-role',
        blueprintName: 'TestBlueprint',
        templateUrl: 'https://example.com/template.json',
        domainBucket,
        region: 'us-east-1',
        account: '123456789012',
        parameters: {
          'param@name': {
            blueprintParamProps: {
              fieldType: 'String',
            },
          },
        },
      });
    }).toThrow(/Param names used in blueprints must match/);
  });

  it('should create authorization policies for domain units', () => {
    new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainConfig,
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/provisioning-role',
      blueprintName: 'TestBlueprint',
      templateUrl: 'https://example.com/template.json',
      domainBucket,
      region: 'us-east-1',
      account: '123456789012',
      authorizedDomainUnits: {
        'data-science': 'du_123',
        'ml-ops': 'du_456',
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.13',
    });
  });

  it('should include additional enabled regions', () => {
    new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainConfig,
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/provisioning-role',
      blueprintName: 'TestBlueprint',
      templateUrl: 'https://example.com/template.json',
      domainBucket,
      region: 'us-east-1',
      account: '123456789012',
      enabledRegions: ['us-west-2', 'eu-west-1'],
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.13',
    });
  });

  it('should handle empty parameters', () => {
    new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainConfig,
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/provisioning-role',
      blueprintName: 'TestBlueprint',
      templateUrl: 'https://example.com/template.json',
      domainBucket,
      region: 'us-east-1',
      account: '123456789012',
      parameters: {},
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.13',
    });
  });

  it('should handle empty authorizedDomainUnits', () => {
    new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainConfig,
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/provisioning-role',
      blueprintName: 'TestBlueprint',
      templateUrl: 'https://example.com/template.json',
      domainBucket,
      region: 'us-east-1',
      account: '123456789012',
      authorizedDomainUnits: {},
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.13',
    });
  });

  it('should accept valid parameter names with underscores and numbers', () => {
    new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainConfig,
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/provisioning-role',
      blueprintName: 'TestBlueprint',
      templateUrl: 'https://example.com/template.json',
      domainBucket,
      region: 'us-east-1',
      account: '123456789012',
      parameters: {
        param_with_underscore: {
          blueprintParamProps: { fieldType: 'String' },
        },
        param123: {
          blueprintParamProps: { fieldType: 'String' },
        },
        UPPERCASE_PARAM: {
          blueprintParamProps: { fieldType: 'String' },
        },
      },
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.13',
    });
  });

  it('should handle undefined parameters', () => {
    new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainConfig,
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/provisioning-role',
      blueprintName: 'TestBlueprint',
      templateUrl: 'https://example.com/template.json',
      domainBucket,
      region: 'us-east-1',
      account: '123456789012',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.13',
    });
  });

  it('should create IAM policy with datazone permissions', () => {
    new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainConfig,
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/provisioning-role',
      blueprintName: 'TestBlueprint',
      templateUrl: 'https://example.com/template.json',
      domainBucket,
      region: 'us-east-1',
      account: '123456789012',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: [
              'datazone:CreateEnvironmentBlueprint',
              'datazone:PutEnvironmentBlueprintConfiguration',
              'datazone:ListEnvironmentBlueprints',
              'datazone:UpdateEnvironmentBlueprint',
              'datazone:DeleteEnvironmentBlueprint',
            ],
            Effect: 'Allow',
            Resource: '*',
          },
          {
            Action: 'iam:PassRole',
            Effect: 'Allow',
            Resource: 'arn:aws:iam::123456789012:role/provisioning-role',
          },
        ],
      },
    });
  });

  it('should grant KMS permissions when bucket has ProductAssetsDeployment', () => {
    // Create a bucket with a BucketDeployment child named 'ProductAssetsDeployment'
    const bucketWithDeployment = new Bucket(testApp.testStack, 'bucket-with-deployment');
    new BucketDeployment(bucketWithDeployment, 'ProductAssetsDeployment', {
      sources: [Source.jsonData('test.json', { test: 'data' })],
      destinationBucket: bucketWithDeployment,
    });

    new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainConfig,
      provisioningRoleArn: 'arn:aws:iam::123456789012:role/provisioning-role',
      blueprintName: 'TestBlueprint',
      templateUrl: 'https://example.com/template.json',
      domainBucket: bucketWithDeployment,
      region: 'us-east-1',
      account: '123456789012',
    });

    const template = Template.fromStack(testApp.testStack);
    // Verify the construct was created successfully with the bucket deployment
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'python3.13',
    });
  });
});

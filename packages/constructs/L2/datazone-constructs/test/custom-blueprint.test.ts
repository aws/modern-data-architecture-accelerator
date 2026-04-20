/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { MdaaSageMakerCustomBlueprintConstruct } from '../lib';

describe('MdaaSageMakerCustomBlueprintConstruct', () => {
  let testApp: MdaaTestApp;
  let domainBucket: Bucket;

  beforeEach(() => {
    testApp = new MdaaTestApp();
    domainBucket = new Bucket(testApp.testStack, 'test-domain-bucket');
  });

  it('should create custom blueprint with required properties', () => {
    new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'dzd_test123',
      domainKmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      domainKmsUsagePolicyName: 'test-kms-policy',
      domainBucketUsagePolicyName: 'test-bucket-policy',
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
      domainId: 'dzd_test123',
      domainKmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      domainKmsUsagePolicyName: 'test-kms-policy',
      domainBucketUsagePolicyName: 'test-bucket-policy',
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
        domainId: 'dzd_test123',
        domainKmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
        domainKmsUsagePolicyName: 'test-kms-policy',
        domainBucketUsagePolicyName: 'test-bucket-policy',
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

  it('should accept valid parameter names with underscores and numbers', () => {
    new MdaaSageMakerCustomBlueprintConstruct(testApp.testStack, 'test-blueprint', {
      naming: testApp.naming,
      domainId: 'dzd_test123',
      domainKmsKeyArn: 'arn:aws:kms:us-east-1:123456789012:key/test-key-id',
      domainKmsUsagePolicyName: 'test-kms-policy',
      domainBucketUsagePolicyName: 'test-bucket-policy',
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
});

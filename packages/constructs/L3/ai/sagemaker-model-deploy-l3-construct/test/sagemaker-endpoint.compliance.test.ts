/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRoleHelper } from '@aws-mdaa/iam-role-helper';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  SageMakerEndpointL3Construct,
  SageMakerEndpointL3ConstructProps,
} from '../lib/sagemaker-endpoint-l3-construct';

describe('SageMaker Endpoint L3 Construct', () => {
  describe('Minimal Config', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerEndpointL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-endpoint',
      modelPackageArn: 'arn:aws:sagemaker:us-east-1:111111111111:model-package/test-mpg/1',
      modelBucketName: 'test-model-bucket',
      stageName: 'dev',
    };
    new SageMakerEndpointL3Construct(stack, 'endpoint', constructProps);
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates CfnModel', () => {
      template.resourceCountIs('AWS::SageMaker::Model', 1);
      template.hasResourceProperties('AWS::SageMaker::Model', {
        ModelName: Match.stringLikeRegexp('test-endpoint-dev-model|test-org.*test-endpoi'),
        Containers: [
          Match.objectLike({
            ModelPackageName: 'arn:aws:sagemaker:us-east-1:111111111111:model-package/test-mpg/1',
          }),
        ],
      });
    });

    test('Creates CfnEndpointConfig with KMS', () => {
      template.resourceCountIs('AWS::SageMaker::EndpointConfig', 1);
      template.hasResourceProperties('AWS::SageMaker::EndpointConfig', {
        KmsKeyId: Match.anyValue(),
        ProductionVariants: [
          Match.objectLike({
            InstanceType: 'ml.m5.2xlarge',
            InitialInstanceCount: 1,
            VariantName: 'AllTraffic',
          }),
        ],
      });
    });

    test('Creates CfnEndpoint', () => {
      template.resourceCountIs('AWS::SageMaker::Endpoint', 1);
      template.hasResourceProperties('AWS::SageMaker::Endpoint', {
        EndpointName: Match.stringLikeRegexp('test-endpoint-dev-ep'),
      });
    });

    test('Creates MdaaKmsKey', () => {
      template.resourceCountIs('AWS::KMS::Key', 1);
    });

    test('Creates execution role with SageMaker principal', () => {
      template.hasResourceProperties('AWS::IAM::Role', {
        AssumeRolePolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:AssumeRole',
              Effect: 'Allow',
              Principal: Match.objectLike({ Service: 'sagemaker.amazonaws.com' }),
            }),
          ]),
        }),
      });
    });

    test('Creates managed policy for S3 model artifacts', () => {
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['s3:GetObject']),
              Resource: Match.arrayWith([Match.objectLike({ 'Fn::Join': Match.anyValue() })]),
            }),
          ]),
        }),
      });
    });

    test('Exports SSM parameters for endpoint', () => {
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('endpoint-name'),
      });
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('endpoint-arn'),
      });
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('model-name'),
      });
      template.hasResourceProperties('AWS::SSM::Parameter', {
        Name: Match.stringLikeRegexp('kms-key-id'),
      });
    });

    test('No data capture when not configured', () => {
      template.hasResourceProperties('AWS::SageMaker::EndpointConfig', {
        DataCaptureConfig: Match.absent(),
      });
    });
  });

  describe('With Data Capture', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerEndpointL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-dc',
      modelPackageArn: 'arn:aws:sagemaker:us-east-1:111111111111:model-package/test-mpg/1',
      modelBucketName: 'test-model-bucket',
      stageName: 'dev',
      dataCaptureConfig: {
        enableCapture: true,
        samplingPercentage: 50,
        csvContentTypes: ['text/csv'],
        jsonContentTypes: ['application/json'],
      },
    };
    new SageMakerEndpointL3Construct(stack, 'endpoint', constructProps);
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates endpoint config with data capture', () => {
      template.hasResourceProperties('AWS::SageMaker::EndpointConfig', {
        DataCaptureConfig: Match.objectLike({
          EnableCapture: true,
          InitialSamplingPercentage: 50,
          DestinationS3Uri: 's3://test-model-bucket/endpoint-data-capture',
        }),
      });
    });
  });

  describe('With VPC Config', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerEndpointL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-vpc',
      modelPackageArn: 'arn:aws:sagemaker:us-east-1:111111111111:model-package/test-mpg/1',
      modelBucketName: 'test-model-bucket',
      stageName: 'dev',
      networkConfig: {
        subnetIds: ['subnet-111', 'subnet-222'],
        securityGroupIds: ['sg-111'],
        enableNetworkIsolation: true,
      },
    };
    new SageMakerEndpointL3Construct(stack, 'endpoint', constructProps);
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Creates model with VPC config', () => {
      template.hasResourceProperties('AWS::SageMaker::Model', {
        VpcConfig: {
          Subnets: ['subnet-111', 'subnet-222'],
          SecurityGroupIds: ['sg-111'],
        },
        EnableNetworkIsolation: true,
      });
    });

    test('Creates VPC network managed policy', () => {
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: Match.arrayWith(['ec2:CreateNetworkInterface']),
            }),
          ]),
        }),
      });
    });
  });

  describe('Custom Production Variant', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const constructProps: SageMakerEndpointL3ConstructProps = {
      naming: testApp.naming,
      roleHelper: new MdaaRoleHelper(stack, testApp.naming),
      projectName: 'test-custom',
      modelPackageArn: 'arn:aws:sagemaker:us-east-1:111111111111:model-package/test-mpg/1',
      modelBucketName: 'test-model-bucket',
      stageName: 'prod',
      productionVariant: {
        instanceType: 'ml.g5.xlarge',
        instanceCount: 4,
        variantName: 'GPU',
        initialVariantWeight: 1,
      },
    };
    new SageMakerEndpointL3Construct(stack, 'endpoint', constructProps);
    testApp.checkCdkNagCompliance(stack);
    const template = Template.fromStack(stack);

    test('Uses custom instance type and count', () => {
      template.hasResourceProperties('AWS::SageMaker::EndpointConfig', {
        ProductionVariants: [
          Match.objectLike({
            InstanceType: 'ml.g5.xlarge',
            InitialInstanceCount: 4,
            VariantName: 'GPU',
          }),
        ],
      });
    });

    test('Endpoint name includes stage', () => {
      template.hasResourceProperties('AWS::SageMaker::Endpoint', {
        EndpointName: Match.stringLikeRegexp('test-custom-prod-ep'),
      });
    });
  });

  describe('Validation', () => {
    test('Throws on missing modelPackageArn', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerEndpointL3Construct(testApp.testStack, 'endpoint', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          projectName: 'test',
          modelPackageArn: '',
          modelBucketName: 'bucket',
          stageName: 'dev',
        });
      }).toThrow();
    });

    test('Throws on missing modelBucketName', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerEndpointL3Construct(testApp.testStack, 'endpoint', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          projectName: 'test',
          modelPackageArn: 'arn:aws:sagemaker:us-east-1:111:model-package/mpg/1',
          modelBucketName: '',
          stageName: 'dev',
        });
      }).toThrow();
    });

    test('Throws on subnetIds without securityGroupIds', () => {
      const testApp = new MdaaTestApp();
      expect(() => {
        new SageMakerEndpointL3Construct(testApp.testStack, 'endpoint', {
          naming: testApp.naming,
          roleHelper: new MdaaRoleHelper(testApp.testStack, testApp.naming),
          projectName: 'test',
          modelPackageArn: 'arn:aws:sagemaker:us-east-1:111:model-package/mpg/1',
          modelBucketName: 'bucket',
          stageName: 'dev',
          networkConfig: {
            subnetIds: ['subnet-111'],
            securityGroupIds: [],
          },
        });
      }).toThrow(/securityGroupIds/);
    });
  });
});

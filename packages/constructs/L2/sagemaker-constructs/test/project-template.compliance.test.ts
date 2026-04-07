/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import {
  MAX_SAGEMAKER_PROJECT_NAME_LENGTH,
  MAX_SERVICE_CATALOG_PRODUCT_NAME_LENGTH,
  MdaaSageMakerProjectTemplate,
  MdaaSageMakerProjectTemplateProps,
} from '../lib';

describe('MdaaSageMakerProjectTemplate Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testProps: MdaaSageMakerProjectTemplateProps = {
    naming: testApp.naming,
    projectName: 'test-training-project',
    projectDescription: 'Test model training project',
    serviceCatalogProductName: 'test-sc-product',
    serviceCatalogProductDescription: 'Test SC product',
    serviceCatalogProductOwner: 'test-owner',
    templateUrl: 'https://s3.amazonaws.com/test-bucket/template.yaml',
    provisioningArtifactName: 'v1',
    provisioningArtifactDescription: 'Initial version',
    tags: [
      { key: 'team', value: 'mlops' },
      { key: 'env', value: 'test' },
    ],
  };

  new MdaaSageMakerProjectTemplate(testApp.testStack, 'test-construct', testProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('ServiceCatalogProduct created with MDAA-namespaced name and correct owner', () => {
    template.hasResourceProperties('AWS::ServiceCatalog::CloudFormationProduct', {
      Name: testApp.naming.resourceName('test-sc-product', MAX_SERVICE_CATALOG_PRODUCT_NAME_LENGTH),
      Owner: 'test-owner',
      Description: 'Test SC product',
    });
  });

  test('SageMakerProject created with MDAA-namespaced name and description', () => {
    template.hasResourceProperties('AWS::SageMaker::Project', {
      ProjectName: testApp.naming.resourceName('test-training-project', MAX_SAGEMAKER_PROJECT_NAME_LENGTH),
      ProjectDescription: 'Test model training project',
    });
  });

  test('ProvisioningArtifact uses supplied templateUrl, name, and description', () => {
    template.hasResourceProperties('AWS::ServiceCatalog::CloudFormationProduct', {
      ProvisioningArtifactParameters: [
        {
          Info: { LoadTemplateFromURL: 'https://s3.amazonaws.com/test-bucket/template.yaml' },
          Name: 'v1',
          Description: 'Initial version',
        },
      ],
    });
  });

  test('Tags prop is passed through to SageMaker Project', () => {
    template.hasResourceProperties('AWS::SageMaker::Project', {
      Tags: Match.arrayWith([
        { Key: 'env', Value: 'test' },
        { Key: 'team', Value: 'mlops' },
      ]),
    });
  });

  test('SageMaker Project productId references the ServiceCatalog Product via Ref', () => {
    const cfn = template.toJSON();
    const productKey = Object.keys(cfn.Resources).find(
      k => cfn.Resources[k].Type === 'AWS::ServiceCatalog::CloudFormationProduct',
    )!;
    const projectKey = Object.keys(cfn.Resources).find(k => cfn.Resources[k].Type === 'AWS::SageMaker::Project')!;
    const productId = cfn.Resources[projectKey].Properties.ServiceCatalogProvisioningDetails.productId;
    expect(productId).toEqual({ Ref: productKey });
  });

  test('SSM parameter emitted for project id', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: Match.stringLikeRegexp('sagemaker-project.*test-training-project.*id'),
    });
  });

  test('SSM parameter emitted for project arn', () => {
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: Match.stringLikeRegexp('sagemaker-project.*test-training-project.*arn'),
    });
  });

  test('Two SSM parameters emitted (project id and arn)', () => {
    template.resourceCountIs('AWS::SSM::Parameter', 2);
  });
});

describe('MdaaSageMakerProjectTemplate Default Artifact Values', () => {
  const testApp = new MdaaTestApp();

  // Omit provisioningArtifactName and provisioningArtifactDescription intentionally
  const testProps: MdaaSageMakerProjectTemplateProps = {
    naming: testApp.naming,
    projectName: 'default-artifact-project',
    serviceCatalogProductName: 'default-artifact-product',
    serviceCatalogProductOwner: 'test-owner',
    templateUrl: 'https://s3.amazonaws.com/test-bucket/template.yaml',
  };

  new MdaaSageMakerProjectTemplate(testApp.testStack, 'test-defaults', testProps);

  const template = Template.fromStack(testApp.testStack);

  test('provisioningArtifactName defaults to "v1" when not supplied', () => {
    template.hasResourceProperties('AWS::ServiceCatalog::CloudFormationProduct', {
      ProvisioningArtifactParameters: [{ Name: 'v1' }],
    });
  });

  test('provisioningArtifactDescription defaults to "Initial version" when not supplied', () => {
    template.hasResourceProperties('AWS::ServiceCatalog::CloudFormationProduct', {
      ProvisioningArtifactParameters: [{ Description: 'Initial version' }],
    });
  });

  test('SageMaker Project has no description when not supplied', () => {
    template.hasResourceProperties('AWS::SageMaker::Project', {
      ProjectDescription: Match.absent(),
    });
  });

  test('SageMaker Project has no tags when not supplied', () => {
    template.hasResourceProperties('AWS::SageMaker::Project', {
      Tags: Match.absent(),
    });
  });
});

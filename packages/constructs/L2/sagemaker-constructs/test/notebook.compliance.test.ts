/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template } from 'aws-cdk-lib/assertions';
import { MdaaNoteBook, MdaaNoteBookProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testContstructProps: MdaaNoteBookProps = {
    notebookInstanceId: 'test-id',
    naming: testApp.naming,
    instanceType: 'ml.t3.medium',
    subnetId: 'test-subnet-id',
    kmsKeyId: 'arn:test-partition:kms:test-region:test-account:key/test-key',
    roleArn: 'arn:test-partition:iam:test-region:test-account:role/test-role',
    securityGroupIds: ['test-security-group'],
    notebookInstanceName: 'test-notebook',
  };

  new MdaaNoteBook(testApp.testStack, 'test-construct', testContstructProps);

  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('NotebookInstanceName', () => {
    template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
      NotebookInstanceName: testApp.naming.resourceName('test-notebook'),
    });
  });

  test('InstanceType', () => {
    template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
      InstanceType: 'ml.t3.medium',
    });
  });

  test('RoleArn', () => {
    template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
      RoleArn: 'arn:test-partition:iam:test-region:test-account:role/test-role',
    });
  });

  test('KmsKeyId', () => {
    template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
      KmsKeyId: 'arn:test-partition:kms:test-region:test-account:key/test-key',
    });
  });

  test('SubnetId', () => {
    template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
      SubnetId: 'test-subnet-id',
    });
  });

  test('SecurityGroupIds', () => {
    template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
      SecurityGroupIds: ['test-security-group'],
    });
  });

  test('RootAccess', () => {
    template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
      RootAccess: 'Disabled',
    });
  });

  test('DirectInternetAccess', () => {
    template.hasResourceProperties('AWS::SageMaker::NotebookInstance', {
      DirectInternetAccess: 'Disabled',
    });
  });
});

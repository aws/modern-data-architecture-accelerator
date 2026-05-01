/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import {
  addCrossAccountKmsPolicy,
  addEcrReadPolicy,
  addCloudWatchLogsPolicy,
  addVpcNetworkPolicy,
  addCdkDeployPolicy,
  SAGEMAKER_TAG_ACTIONS,
} from '../lib/iam-helpers';

describe('SAGEMAKER_TAG_ACTIONS', () => {
  it('contains expected actions', () => {
    expect(SAGEMAKER_TAG_ACTIONS).toContain('sagemaker:AddTags');
    expect(SAGEMAKER_TAG_ACTIONS).toContain('sagemaker:DeleteTags');
    expect(SAGEMAKER_TAG_ACTIONS).toContain('sagemaker:ListTags');
    expect(SAGEMAKER_TAG_ACTIONS).toHaveLength(3);
  });
});

describe('addEcrReadPolicy', () => {
  it('adds ECR read permissions to role', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const role = new MdaaRole(stack, 'TestRole', {
      naming: testApp.naming,
      roleName: 'test-role',
      assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
    });
    addEcrReadPolicy(role);
    const template = Template.fromStack(stack);
    // ecr:GetAuthorizationToken is a single-action statement (synthesized as string, not array)
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'ecr:GetAuthorizationToken',
            Effect: 'Allow',
            Resource: '*',
          }),
          Match.objectLike({
            Action: Match.arrayWith(['ecr:BatchGetImage']),
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });
});

describe('addCloudWatchLogsPolicy', () => {
  it('adds CloudWatch Logs permissions with prefix', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const role = new MdaaRole(stack, 'TestRole', {
      naming: testApp.naming,
      roleName: 'test-role',
      assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
    });
    addCloudWatchLogsPolicy(role, '/aws/sagemaker/');
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents']),
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });
});

describe('addVpcNetworkPolicy', () => {
  it('adds VPC network permissions', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const role = new MdaaRole(stack, 'TestRole', {
      naming: testApp.naming,
      roleName: 'test-role',
      assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
    });
    addVpcNetworkPolicy(role);
    const template = Template.fromStack(stack);
    // Describe* and mutative ENI actions are now separate statements.
    // ec2:CreateNetworkInterface does not support ec2:AuthorizedService condition;
    // the condition is only on ec2:CreateNetworkInterfacePermission.
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['ec2:DescribeVpcs', 'ec2:DescribeSubnets']),
            Effect: 'Allow',
            Resource: '*',
          }),
          Match.objectLike({
            Action: Match.arrayWith(['ec2:CreateNetworkInterface', 'ec2:DeleteNetworkInterface']),
            Effect: 'Allow',
            Resource: '*',
          }),
          Match.objectLike({
            Action: 'ec2:CreateNetworkInterfacePermission',
            Effect: 'Allow',
            Resource: '*',
            Condition: Match.objectLike({
              StringEquals: Match.objectLike({ 'ec2:AuthorizedService': 'sagemaker.amazonaws.com' }),
            }),
          }),
        ]),
      },
    });
  });
});

describe('addCdkDeployPolicy', () => {
  it('adds CloudFormation, S3, KMS, STS, and SSM policies', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const role = new MdaaRole(stack, 'TestRole', {
      naming: testApp.naming,
      roleName: 'test-role',
      assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
    });
    addCdkDeployPolicy(role, 'test-org');
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['cloudformation:CreateStack', 'cloudformation:UpdateStack']),
            Effect: 'Allow',
          }),
          Match.objectLike({
            Action: Match.arrayWith(['s3:GetObject', 's3:PutObject']),
            Effect: 'Allow',
          }),
          Match.objectLike({
            Action: 'iam:PassRole',
            Effect: 'Allow',
          }),
          Match.objectLike({
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
          }),
          Match.objectLike({
            Action: Match.arrayWith(['kms:Decrypt', 'kms:Encrypt']),
            Effect: 'Allow',
            Condition: Match.objectLike({
              StringEquals: Match.objectLike({
                'kms:ViaService': Match.anyValue(),
              }),
            }),
          }),
          Match.objectLike({
            Action: Match.arrayWith(['ssm:PutParameter', 'ssm:GetParameter']),
            Effect: 'Allow',
          }),
        ]),
      },
    });
  });

  it('uses custom CDK bootstrap qualifier', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const role = new MdaaRole(stack, 'TestRole', {
      naming: testApp.naming,
      roleName: 'test-role',
      assumedBy: new ServicePrincipal('codebuild.amazonaws.com'),
    });
    addCdkDeployPolicy(role, 'test-org', 'custom123');
    const template = Template.fromStack(stack);
    const policies = template.findResources('AWS::IAM::Policy');
    const policyJson = JSON.stringify(policies);
    expect(policyJson).toContain('custom123');
    expect(policyJson).not.toContain('hnb659fds');
  });
});

describe('addCrossAccountKmsPolicy', () => {
  it('does nothing when accountIds is empty', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const key = new Key(stack, 'TestKey');
    expect(() => addCrossAccountKmsPolicy(key, [], ['kms:Decrypt'])).not.toThrow();
  });

  it('adds KMS policy for specified accounts', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const key = new Key(stack, 'TestKey');
    addCrossAccountKmsPolicy(key, ['111111111111', '222222222222'], ['kms:Decrypt', 'kms:Encrypt']);
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['kms:Decrypt', 'kms:Encrypt', 'kms:DescribeKey']),
            Effect: 'Allow',
          }),
        ]),
      }),
    });
  });

  it('deduplicates account IDs', () => {
    const testApp = new MdaaTestApp();
    const stack = testApp.testStack;
    const key = new Key(stack, 'TestKey');
    // Should not throw even with duplicate IDs
    addCrossAccountKmsPolicy(key, ['111111111111', '111111111111'], ['kms:Decrypt']);
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::KMS::Key', {
      KeyPolicy: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(['kms:Decrypt', 'kms:DescribeKey']),
          }),
        ]),
      }),
    });
  });
});

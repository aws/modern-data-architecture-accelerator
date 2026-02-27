/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { PolicyDocument, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { MdaaManagedPolicy, MdaaManagedPolicyProps } from '../lib';

describe('MDAA Construct Compliance Tests', () => {
  const policyDocument = {
    Statement: [
      {
        Sid: 'test-statement',
        Action: 's3:GetObject',
        Resource: 'arn:test-partition:s3:::test-bucket/test-obj',
        Effect: 'Allow',
      },
    ],
  };

  // Helper function to create test props
  const createTestProps = (testApp: MdaaTestApp): MdaaManagedPolicyProps => ({
    naming: testApp.naming,
    managedPolicyName: 'testing',
    document: PolicyDocument.fromJson(policyDocument),
  });

  describe('Basic Policy Generation', () => {
    // Create a single app/stack for tests that don't modify the construct tree
    const testApp = new MdaaTestApp();
    const testConstructProps = createTestProps(testApp);

    new MdaaManagedPolicy(testApp.testStack, 'test-construct', testConstructProps);
    new MdaaManagedPolicy(testApp.testStack, 'test-construct-verbatim', {
      ...testConstructProps,
      verbatimPolicyName: true,
      managedPolicyName: 'testing-verbatim',
    });

    testApp.checkCdkNagCompliance(testApp.testStack);
    const template = Template.fromStack(testApp.testStack);

    test('Generate Managed Policy', () => {
      template.hasResourceProperties(
        'AWS::IAM::ManagedPolicy',
        Match.objectLike({
          PolicyDocument: {
            Statement: [
              {
                Action: 's3:GetObject',
                Effect: 'Allow',
                Resource: 'arn:test-partition:s3:::test-bucket/test-obj',
                Sid: 'test-statement',
              },
            ],
          },
          ManagedPolicyName: 'test-org-test-env-test-domain-test-module-testing',
        }),
      );
    });

    test('Generate Managed Policy Verbatim Name', () => {
      template.hasResourceProperties(
        'AWS::IAM::ManagedPolicy',
        Match.objectLike({
          ManagedPolicyName: 'testing-verbatim',
        }),
      );
    });
  });

  describe('addStatements method', () => {
    test('should add statements to policy', () => {
      // Create fresh app/stack for this test
      const testApp = new MdaaTestApp();
      const testConstructProps = createTestProps(testApp);

      const policy = new MdaaManagedPolicy(testApp.testStack, 'test-add-statements', testConstructProps);
      const newStatement = new PolicyStatement({
        actions: ['s3:ListBucket'],
        resources: ['arn:aws:s3:::test-bucket'],
      });

      policy.addStatements(newStatement);

      const template = Template.fromStack(testApp.testStack);
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: {
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 's3:ListBucket',
              Resource: 'arn:aws:s3:::test-bucket',
            }),
          ]),
        },
      });
      // Lines 147-148 covered by addStatements call
    });
  });

  describe('checkPolicyLength', () => {
    test('with alwaysLog true', () => {
      const testApp = new MdaaTestApp();
      const testConstructProps = createTestProps(testApp);

      const policy = new MdaaManagedPolicy(testApp.testStack, 'test-policy-length', testConstructProps);
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      policy.checkPolicyLength(true);
      expect(consoleSpy).toHaveBeenCalled();
      // Line 153-154 covered by alwaysLog=true

      consoleSpy.mockRestore();
    });
  });

  describe('computePolicyLength', () => {
    test('with null document', () => {
      const testApp = new MdaaTestApp();
      const testConstructProps = createTestProps(testApp);

      const policy = new MdaaManagedPolicy(testApp.testStack, 'test-null-doc', testConstructProps);
      // Mock document.toJSON to return null
      jest.spyOn(policy.document, 'toJSON').mockReturnValue(null);

      const length = policy.computePolicyLength();
      expect(length).toBe(0);
      // Line 166 covered by null document case
    });
  });

  describe('fromAwsManagedPolicyNameWithPartition', () => {
    test('creates new policy', () => {
      const testApp = new MdaaTestApp();

      const managedPolicy = MdaaManagedPolicy.fromAwsManagedPolicyNameWithPartition(
        testApp.testStack,
        'service-role/AWSLambdaBasicExecutionRole',
      );
      expect(managedPolicy).toBeDefined();
      // Lines 173-179, 180, 189 covered by new policy creation
    });

    test('returns existing policy on second call', () => {
      const testApp = new MdaaTestApp();

      // First call creates the policy
      MdaaManagedPolicy.fromAwsManagedPolicyNameWithPartition(
        testApp.testStack,
        'service-role/AWSLambdaVPCAccessExecutionRole',
      );

      // Second call should return existing policy
      const existingPolicy = MdaaManagedPolicy.fromAwsManagedPolicyNameWithPartition(
        testApp.testStack,
        'service-role/AWSLambdaVPCAccessExecutionRole',
      );
      expect(existingPolicy).toBeDefined();
      // Lines 175-177 covered by existing policy case
    });
  });
});

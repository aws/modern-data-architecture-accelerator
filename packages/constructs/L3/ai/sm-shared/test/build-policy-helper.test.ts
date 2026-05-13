/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { buildManagedPolicies } from '../lib/build-policy-helper';
import { BuildPolicyConfig } from '../lib/build-policy-types';

describe('buildManagedPolicies', () => {
  describe('empty/undefined input', () => {
    it('returns empty array when buildPolicies is undefined', () => {
      const testApp = new MdaaTestApp();
      const result = buildManagedPolicies({
        scope: testApp.testStack,
        naming: testApp.naming,
        policyNamePrefix: 'test-cb',
        projectName: 'test-project',
        buildPolicies: undefined,
      });
      expect(result).toEqual([]);
    });

    it('returns empty array when buildPolicies is empty', () => {
      const testApp = new MdaaTestApp();
      const result = buildManagedPolicies({
        scope: testApp.testStack,
        naming: testApp.naming,
        policyNamePrefix: 'test-cb',
        projectName: 'test-project',
        buildPolicies: [],
      });
      expect(result).toEqual([]);
    });
  });

  describe('policyArn mode', () => {
    it('imports managed policy by ARN', () => {
      const testApp = new MdaaTestApp();
      const result = buildManagedPolicies({
        scope: testApp.testStack,
        naming: testApp.naming,
        policyNamePrefix: 'test-cb',
        projectName: 'test-project',
        buildPolicies: [{ policyArn: 'arn:aws:iam::123456789012:policy/MyPolicy' }],
      });
      expect(result).toHaveLength(1);
      expect(result[0].managedPolicyArn).toBe('arn:aws:iam::123456789012:policy/MyPolicy');
    });
  });

  describe('policyDocument mode', () => {
    it('creates MdaaManagedPolicy from inline statements', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      const result = buildManagedPolicies({
        scope: stack,
        naming: testApp.naming,
        policyNamePrefix: 'test-cb',
        projectName: 'test-project',
        buildPolicies: [
          {
            policyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Action: 'codeartifact:GetAuthorizationToken',
                  Resource: 'arn:aws:codeartifact:us-east-1:123456789012:domain/test-domain',
                },
                {
                  Sid: 'RepoRead',
                  Effect: 'Allow',
                  Action: ['codeartifact:GetRepositoryEndpoint', 'codeartifact:ReadFromRepository'],
                  Resource: 'arn:aws:codeartifact:us-east-1:123456789012:repository/test-domain/test-repo',
                },
              ],
            },
          },
        ],
      });
      expect(result).toHaveLength(1);

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'codeartifact:GetAuthorizationToken',
              Effect: 'Allow',
              Resource: 'arn:aws:codeartifact:us-east-1:123456789012:domain/test-domain',
            }),
            Match.objectLike({
              Sid: 'RepoRead',
              Action: Match.arrayWith(['codeartifact:GetRepositoryEndpoint', 'codeartifact:ReadFromRepository']),
              Effect: 'Allow',
              Resource: 'arn:aws:codeartifact:us-east-1:123456789012:repository/test-domain/test-repo',
            }),
          ]),
        }),
      });
    });

    it('handles Deny effect', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      buildManagedPolicies({
        scope: stack,
        naming: testApp.naming,
        policyNamePrefix: 'test-cb',
        projectName: 'test-project',
        buildPolicies: [
          {
            policyDocument: {
              Statement: [
                {
                  Effect: 'Deny',
                  Action: 's3:DeleteBucket',
                  Resource: '*',
                },
              ],
            },
          },
        ],
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 's3:DeleteBucket',
              Effect: 'Deny',
              Resource: '*',
            }),
          ]),
        }),
      });
    });

    it('handles Condition field', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      buildManagedPolicies({
        scope: stack,
        naming: testApp.naming,
        policyNamePrefix: 'test-cb',
        projectName: 'test-project',
        buildPolicies: [
          {
            policyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Action: 'sts:GetServiceBearerToken',
                  Resource: '*',
                  Condition: { StringEquals: { 'sts:AWSServiceName': 'codeartifact.amazonaws.com' } },
                },
              ],
            },
          },
        ],
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 'sts:GetServiceBearerToken',
              Condition: { StringEquals: { 'sts:AWSServiceName': 'codeartifact.amazonaws.com' } },
            }),
          ]),
        }),
      });
    });

    describe('CDK Nag suppressions', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      buildManagedPolicies({
        scope: stack,
        naming: testApp.naming,
        policyNamePrefix: 'test-cb',
        projectName: 'test-project',
        buildPolicies: [
          {
            policyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Action: 'sts:GetServiceBearerToken',
                  Resource: '*',
                  Condition: { StringEquals: { 'sts:AWSServiceName': 'codeartifact.amazonaws.com' } },
                },
              ],
            },
            suppressions: [
              {
                id: 'AwsSolutions-IAM5',
                reason: 'sts:GetServiceBearerToken requires Resource:*',
              },
            ],
          },
        ],
      });
      // checkCdkNagCompliance must be called at describe level (it creates nested describe/test blocks).
      // If suppressions were not applied, this would fail due to wildcard Resource:'*' triggering AwsSolutions-IAM5.
      testApp.checkCdkNagCompliance(stack);

      it('creates the managed policy resource', () => {
        const template = Template.fromStack(stack);
        expect(template.findResources('AWS::IAM::ManagedPolicy')).toBeDefined();
      });
    });
  });

  describe('mixed entries', () => {
    it('handles both policyArn and policyDocument in the same array', () => {
      const testApp = new MdaaTestApp();
      const stack = testApp.testStack;
      const result = buildManagedPolicies({
        scope: stack,
        naming: testApp.naming,
        policyNamePrefix: 'test-cb',
        projectName: 'test-project',
        buildPolicies: [
          { policyArn: 'arn:aws:iam::123456789012:policy/ExternalPolicy' },
          {
            policyDocument: {
              Statement: [
                {
                  Effect: 'Allow',
                  Action: 's3:GetObject',
                  Resource: 'arn:aws:s3:::my-bucket/*',
                },
              ],
            },
          },
        ],
      });
      expect(result).toHaveLength(2);
      expect(result[0].managedPolicyArn).toBe('arn:aws:iam::123456789012:policy/ExternalPolicy');

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::IAM::ManagedPolicy', {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Action: 's3:GetObject',
              Effect: 'Allow',
              Resource: 'arn:aws:s3:::my-bucket/*',
            }),
          ]),
        }),
      });
    });

    it('skips entries with neither policyArn nor policyDocument', () => {
      const testApp = new MdaaTestApp();
      const result = buildManagedPolicies({
        scope: testApp.testStack,
        naming: testApp.naming,
        policyNamePrefix: 'test-cb',
        projectName: 'test-project',
        buildPolicies: [
          {} as unknown as BuildPolicyConfig, // empty entry — should be skipped
          { policyArn: 'arn:aws:iam::123456789012:policy/Valid' },
        ],
      });
      expect(result).toHaveLength(1);
      expect(result[0].managedPolicyArn).toBe('arn:aws:iam::123456789012:policy/Valid');
    });
  });
});

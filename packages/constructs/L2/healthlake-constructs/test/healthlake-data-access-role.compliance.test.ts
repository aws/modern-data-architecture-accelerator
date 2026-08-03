/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { MdaaHealthLakeDataAccessRole, MdaaHealthLakeDataAccessRoleProps } from '../lib';

describe('MdaaHealthLakeDataAccessRole Compliance Tests', () => {
  const testApp = new MdaaTestApp();

  const testProps: MdaaHealthLakeDataAccessRoleProps = {
    naming: testApp.naming,
    buckets: [
      Bucket.fromBucketArn(testApp.testStack, 'test-raw-bucket', 'arn:test-partition:s3:::test-raw-bucket'),
      Bucket.fromBucketArn(testApp.testStack, 'test-processed-bucket', 'arn:test-partition:s3:::test-processed-bucket'),
    ],
    kmsKey: Key.fromKeyArn(
      testApp.testStack,
      'test-key',
      'arn:test-partition:kms:test-region:test-account:key/test-key-id',
    ),
    datastoreArn: 'arn:test-partition:healthlake:test-region:test-account:datastore/fhir/test-datastore-id',
  };

  new MdaaHealthLakeDataAccessRole(testApp.testStack, 'test-construct', testProps);
  testApp.checkCdkNagCompliance(testApp.testStack);
  const template = Template.fromStack(testApp.testStack);

  test('Trust policy only allows healthlake.amazonaws.com', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          Match.objectLike({
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'healthlake.amazonaws.com',
            },
          }),
        ],
      },
    });
  });

  test('Trust policy scopes assume-role to same-account and specific datastore (confused-deputy)', () => {
    // Confused-deputy protection: the healthlake service principal must present both the
    // deploying account (aws:SourceAccount) and the specific datastore ARN (aws:SourceArn)
    // when assuming this role. Asserting the literal values (not Match.anyValue) is the point
    // of the test — anyValue would pass for '*' or an unrelated account, proving the key
    // exists but not that it is scoped. In the MdaaTestApp environment the account resolves
    // to the literal 'test-account'; in a real stack it is a CFN Ref to AWS::AccountId.
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: { Service: 'healthlake.amazonaws.com' },
            Condition: {
              StringEquals: {
                'aws:SourceAccount': 'test-account',
              },
              ArnEquals: {
                'aws:SourceArn':
                  'arn:test-partition:healthlake:test-region:test-account:datastore/fhir/test-datastore-id',
              },
            },
          }),
        ]),
      },
    });
  });

  test('MDAA naming applied to role name', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      RoleName: testApp.naming.resourceName('healthlake-data-access', 64),
    });
  });

  test('S3 object actions scoped to specific bucket ARNs with /* suffix', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      Policies: Match.arrayWith([
        Match.objectLike({
          PolicyName: 'HealthLakeS3Access',
          PolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Effect: 'Allow',
                Action: ['s3:GetObject', 's3:PutObject'],
                Resource: [
                  'arn:test-partition:s3:::test-raw-bucket/*',
                  'arn:test-partition:s3:::test-processed-bucket/*',
                ],
              }),
            ]),
          },
        }),
      ]),
    });
  });

  test('S3 bucket actions scoped to specific bucket ARNs', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      Policies: Match.arrayWith([
        Match.objectLike({
          PolicyName: 'HealthLakeS3Access',
          PolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Effect: 'Allow',
                Action: ['s3:ListBucket', 's3:GetBucketPublicAccessBlock', 's3:GetEncryptionConfiguration'],
                Resource: ['arn:test-partition:s3:::test-raw-bucket', 'arn:test-partition:s3:::test-processed-bucket'],
              }),
            ]),
          },
        }),
      ]),
    });
  });

  test('KMS actions scoped to specific key ARN', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      Policies: Match.arrayWith([
        Match.objectLike({
          PolicyName: 'HealthLakeKmsAccess',
          PolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Effect: 'Allow',
                Action: ['kms:DescribeKey', 'kms:GenerateDataKey*', 'kms:Encrypt', 'kms:ReEncrypt*', 'kms:Decrypt'],
                Resource: 'arn:test-partition:kms:test-region:test-account:key/test-key-id',
              }),
            ]),
          },
        }),
      ]),
    });
  });

  test('CreateGrant has GrantIsForAWSResource condition', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      Policies: Match.arrayWith([
        Match.objectLike({
          PolicyName: 'HealthLakeKmsAccess',
          PolicyDocument: {
            Statement: Match.arrayWith([
              Match.objectLike({
                Effect: 'Allow',
                Action: 'kms:CreateGrant',
                Resource: 'arn:test-partition:kms:test-region:test-account:key/test-key-id',
                Condition: {
                  Bool: {
                    'kms:GrantIsForAWSResource': 'true',
                  },
                },
              }),
            ]),
          },
        }),
      ]),
    });
  });

  test('No wildcard resources in any policy statement', () => {
    const json = template.toJSON();
    const resources = json.Resources;
    const iamRoles = Object.values(resources).filter(
      resource => (resource as Record<string, unknown>).Type === 'AWS::IAM::Role',
    );
    for (const resource of iamRoles) {
      const res = resource as Record<string, unknown>;
      const props = res.Properties as Record<string, unknown>;
      const policies = (props.Policies as Array<Record<string, unknown>>) ?? [];
      for (const policy of policies) {
        const doc = policy.PolicyDocument as Record<string, unknown>;
        const statements = doc.Statement as Array<Record<string, unknown>>;
        for (const statement of statements) {
          const stmtResource = statement.Resource;
          const stmtResources = Array.isArray(stmtResource) ? stmtResource : [stmtResource];
          expect(stmtResources).not.toContain('*');
        }
      }
    }
  });

  test('SSM parameters are created for role outputs', () => {
    // MdaaRole publishes 3 (arn, id, name) + 1 custom (healthlake/data-access-role-arn) = 4
    template.resourceCountIs('AWS::SSM::Parameter', 4);
  });
});

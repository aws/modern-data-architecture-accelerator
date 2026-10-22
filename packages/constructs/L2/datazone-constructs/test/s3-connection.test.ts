/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaResourceType } from '@aws-mdaa/naming';
import { MdaaTestApp } from '@aws-mdaa/testing';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { MdaaDatazoneS3Connection } from '../lib/s3-connection';

describe('MdaaDatazoneS3Connection', () => {
  let testApp: MdaaTestApp;

  beforeEach(() => {
    testApp = new MdaaTestApp();
  });

  it('should create a DataZone Connection with S3 properties', () => {
    new MdaaDatazoneS3Connection(testApp.testStack, 'test-connection', {
      naming: testApp.naming,
      name: 'test-source',
      domainIdentifier: 'test-domain-id',
      projectIdentifier: 'test-project-id',
      environmentIdentifier: 'test-env-id',
      bucketName: 'test-bucket',
      prefix: 'test-prefix/',
    });

    const template = Template.fromStack(testApp.testStack);
    const expectedConnectionName = testApp.naming
      .withResourceType(MdaaResourceType.DATAZONE_CONNECTION)
      .resourceName('test-source');
    template.hasResourceProperties('AWS::DataZone::Connection', {
      Name: expectedConnectionName,
      DomainIdentifier: 'test-domain-id',
      ProjectIdentifier: 'test-project-id',
      EnvironmentIdentifier: 'test-env-id',
      Props: {
        S3Properties: {
          S3Uri: 's3://test-bucket/test-prefix/',
        },
      },
    });
  });

  it('should default to the whole bucket when prefix is omitted', () => {
    new MdaaDatazoneS3Connection(testApp.testStack, 'test-connection', {
      naming: testApp.naming,
      name: 'test-source',
      domainIdentifier: 'test-domain-id',
      projectIdentifier: 'test-project-id',
      bucketName: 'test-bucket',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Connection', {
      Props: {
        S3Properties: {
          S3Uri: 's3://test-bucket/',
        },
      },
    });
  });

  it('should pass through S3 Access Grants properties when provided', () => {
    new MdaaDatazoneS3Connection(testApp.testStack, 'test-connection', {
      naming: testApp.naming,
      name: 'test-source',
      domainIdentifier: 'test-domain-id',
      projectIdentifier: 'test-project-id',
      bucketName: 'test-bucket',
      prefix: 'test-prefix/',
      registerS3AccessGrantLocation: true,
      s3AccessGrantLocationId: 'test-access-grant-location-id',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Connection', {
      EnvironmentIdentifier: Match.absent(),
      Props: {
        S3Properties: {
          S3Uri: 's3://test-bucket/test-prefix/',
          RegisterS3AccessGrantLocation: true,
          S3AccessGrantLocationId: 'test-access-grant-location-id',
        },
      },
    });
  });

  it('should grant read access on the bucket and prefix when grantReadRoleArn is provided', () => {
    new MdaaDatazoneS3Connection(testApp.testStack, 'test-connection', {
      naming: testApp.naming,
      name: 'test-source',
      domainIdentifier: 'test-domain-id',
      projectIdentifier: 'test-project-id',
      bucketName: 'test-bucket',
      prefix: 'test-prefix/',
      grantReadRoleArn: 'arn:test-partition:iam::test-account:role/test-env-user-role',
    });

    const template = Template.fromStack(testApp.testStack);
    const bucketArn = Match.objectLike({ 'Fn::Join': ['', Match.arrayWith([':s3:::test-bucket'])] });
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayEquals([
          Match.objectLike({
            Action: 's3:GetObject*',
            Resource: Match.objectLike({ 'Fn::Join': ['', Match.arrayWith([':s3:::test-bucket/test-prefix/*'])] }),
          }),
          Match.objectLike({
            Action: 's3:GetBucketLocation',
            Resource: bucketArn,
          }),
          Match.objectLike({
            Action: 's3:ListBucket',
            Resource: bucketArn,
            Condition: { StringLike: { 's3:prefix': ['test-prefix/', 'test-prefix/*'] } },
          }),
        ]),
      },
      Roles: ['test-env-user-role'],
    });
  });

  it('should also grant kms:Decrypt scoped to S3 calls when kmsKeyArn is provided', () => {
    new MdaaDatazoneS3Connection(testApp.testStack, 'test-connection', {
      naming: testApp.naming,
      name: 'test-source',
      domainIdentifier: 'test-domain-id',
      projectIdentifier: 'test-project-id',
      bucketName: 'test-bucket',
      prefix: 'test-prefix/',
      grantReadRoleArn: 'arn:test-partition:iam::test-account:role/test-env-user-role',
      kmsKeyArn: 'arn:test-partition:kms:test-region:test-account:key/test-key-id',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 'kms:Decrypt',
            Resource: 'arn:test-partition:kms:test-region:test-account:key/test-key-id',
            Condition: { StringEquals: { 'kms:ViaService': Match.objectLike({ 'Fn::Join': Match.anyValue() }) } },
          }),
        ]),
      },
      Roles: ['test-env-user-role'],
    });
  });

  it('should reject a bucketName containing a wildcard character', () => {
    expect(() => {
      new MdaaDatazoneS3Connection(testApp.testStack, 'test-connection', {
        naming: testApp.naming,
        name: 'test-source',
        domainIdentifier: 'test-domain-id',
        projectIdentifier: 'test-project-id',
        bucketName: '*',
        grantReadRoleArn: 'arn:test-partition:iam::test-account:role/test-env-user-role',
      });
    }).toThrow("bucketName '*' must not contain '*' or '?'");
  });

  it('normalizes a prefix with leading/trailing slashes to a single trailing slash', () => {
    new MdaaDatazoneS3Connection(testApp.testStack, 'test-connection', {
      naming: testApp.naming,
      name: 'test-source',
      domainIdentifier: 'test-domain-id',
      projectIdentifier: 'test-project-id',
      bucketName: 'test-bucket',
      prefix: '/raw/',
      grantReadRoleArn: 'arn:test-partition:iam::test-account:role/test-env-user-role',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Connection', {
      Props: {
        S3Properties: {
          S3Uri: 's3://test-bucket/raw/',
        },
      },
    });
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:GetObject*',
            Resource: Match.objectLike({ 'Fn::Join': ['', Match.arrayWith([':s3:::test-bucket/raw/*'])] }),
          }),
        ]),
      },
    });
  });

  it('should grant read access when the bucket name is an ssm-org: dynamic reference', () => {
    // ssm-org:/ssm-domain: config references resolve to a literal `{{resolve:ssm:...}}`
    // CloudFormation dynamic reference string by the time the construct sees them (MDAA's
    // config transform runs well before this construct's code), not a value CDK can validate
    // at synth time. Bucket.fromBucketName() would reject this as an invalid bucket name,
    // which is exactly why bucketName/prefix are composed via plain template literals here
    // instead of being parsed out of a combined, already-resolved s3Uri string.
    new MdaaDatazoneS3Connection(testApp.testStack, 'test-connection', {
      naming: testApp.naming,
      name: 'test-source',
      domainIdentifier: 'test-domain-id',
      projectIdentifier: 'test-project-id',
      bucketName: '{{resolve:ssm:/test-org/shared/datalake/bucket/research/name}}',
      prefix: 'raw/',
      grantReadRoleArn: 'arn:test-partition:iam::test-account:role/test-env-user-role',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Connection', {
      Props: {
        S3Properties: {
          S3Uri: 's3://{{resolve:ssm:/test-org/shared/datalake/bucket/research/name}}/raw/',
        },
      },
    });
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:GetObject*',
            Resource: Match.objectLike({
              'Fn::Join': [
                '',
                Match.arrayWith([':s3:::{{resolve:ssm:/test-org/shared/datalake/bucket/research/name}}/raw/*']),
              ],
            }),
          }),
        ]),
      },
      Roles: ['test-env-user-role'],
    });
  });

  it('should work when bucketName is a genuine unresolved CDK token (not just token-looking text)', () => {
    // The bare `ssm-org:/path` form (the whole field value, no surrounding text or `{{}}`)
    // resolves through a second config-transform pass that treats it as an explicit SSM
    // value request, producing a REAL CDK token (StringParameter.valueForStringParameter),
    // not literal `{{resolve:ssm:...}}` text. Regex-parsing a token's debug string
    // (`${Token[TOKEN.N]}`) is what broke before this redesign; composing it via a plain
    // template literal — exactly like Aws.PARTITION already is below — must keep working.
    const bucketNameToken = StringParameter.valueForStringParameter(
      testApp.testStack,
      '/test-org/shared/datalake/bucket/research/name',
    );

    new MdaaDatazoneS3Connection(testApp.testStack, 'test-connection', {
      naming: testApp.naming,
      name: 'test-source',
      domainIdentifier: 'test-domain-id',
      projectIdentifier: 'test-project-id',
      bucketName: bucketNameToken,
      prefix: 'raw/',
      grantReadRoleArn: 'arn:test-partition:iam::test-account:role/test-env-user-role',
    });

    const template = Template.fromStack(testApp.testStack);
    template.hasResourceProperties('AWS::DataZone::Connection', {
      Props: {
        S3Properties: {
          S3Uri: Match.objectLike({ 'Fn::Join': ['', Match.arrayWith(['s3://', '/raw/'])] }),
        },
      },
    });
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: 's3:GetObject*',
            Resource: Match.objectLike({ 'Fn::Join': ['', Match.arrayWith([':s3:::', '/raw/*'])] }),
          }),
        ]),
      },
      Roles: ['test-env-user-role'],
    });
  });

  it('should not create a grant policy when grantReadRoleArn is omitted', () => {
    new MdaaDatazoneS3Connection(testApp.testStack, 'test-connection', {
      naming: testApp.naming,
      name: 'test-source',
      domainIdentifier: 'test-domain-id',
      projectIdentifier: 'test-project-id',
      bucketName: 'test-bucket',
      prefix: 'test-prefix/',
    });

    const template = Template.fromStack(testApp.testStack);
    template.resourceCountIs('AWS::IAM::Policy', 0);
  });
});

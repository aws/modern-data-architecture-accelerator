import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as MdaaInstaller from '../lib/mdaa-installer-stack';

describe('MdaaInstallerStack', () => {
  let app: cdk.App;
  let stack: MdaaInstaller.MdaaInstallerStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new MdaaInstaller.MdaaInstallerStack(app, 'TestMdaaInstallerStack');
    template = Template.fromStack(stack);
  });

  test('Stack creates successfully', () => {
    expect(stack).toBeDefined();
    expect(template).toBeDefined();
  });

  test('Contains required parameters', () => {
    template.hasParameter('RepositorySource', {
      Type: 'String',
      AllowedValues: ['github', 's3'],
      Default: 'github',
    });

    template.hasParameter('OrgName', {
      Type: 'String',
      AllowedPattern: '^[a-zA-Z][a-zA-Z0-9-]{0,99}$',
    });

    template.hasParameter('SampleName', {
      Type: 'String',
      AllowedValues: ['basic_datalake', 'basic_datascience_platform'],
      Default: 'basic_datalake',
    });

    template.hasParameter('VpcId', {
      Type: 'AWS::EC2::VPC::Id',
    });

    template.hasParameter('SubnetId', {
      Type: 'AWS::EC2::Subnet::Id',
    });
  });

  test('Contains GitHub-specific parameters', () => {
    template.hasParameter('RepositoryOwner', {
      Type: 'String',
      Default: 'aws',
    });

    template.hasParameter('RepositoryName', {
      Type: 'String',
      Default: 'modern-data-architecture-accelerator',
    });

    template.hasParameter('RepositoryBranchName', {
      Type: 'String',
    });

    template.hasParameter('CodeConnectArn', {
      Type: 'String',
    });
  });

  test('Contains S3-specific parameters', () => {
    template.hasParameter('RepositoryBucketName', {
      Type: 'String',
    });

    template.hasParameter('RepositoryBucketObject', {
      Type: 'String',
      Default: 'release/latest.zip',
    });
  });

  test('Creates KMS key with proper configuration', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
      KeyPolicy: {
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              AWS: {
                'Fn::Join': ['', ['arn:', { Ref: 'AWS::Partition' }, ':iam::', { Ref: 'AWS::AccountId' }, ':root']],
              },
            },
            Action: 'kms:*',
            Resource: '*',
          },
        ],
      },
    });
  });

  test('Creates S3 buckets with proper security configuration', () => {
    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'AES256',
            },
          },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });

    template.hasResourceProperties('AWS::S3::Bucket', {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: 'aws:kms',
            },
          },
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      LoggingConfiguration: {},
    });
  });

  test('Creates CodeBuild project with proper configuration', () => {
    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Environment: {
        Type: 'LINUX_CONTAINER',
        Image: 'aws/codebuild/standard:7.0',
        ComputeType: 'BUILD_GENERAL1_SMALL',
        PrivilegedMode: true,
      },
      Source: {
        Type: 'CODEPIPELINE',
      },
    });
  });

  test('Creates IAM role for CodeBuild with Administrator access', () => {
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              Service: 'codebuild.amazonaws.com',
            },
            Action: 'sts:AssumeRole',
          },
        ],
      },
      ManagedPolicyArns: [
        {
          'Fn::Join': ['', ['arn:', { Ref: 'AWS::Partition' }, ':iam::aws:policy/AdministratorAccess']],
        },
      ],
    });
  });

  test('Creates conditional GitHub pipeline', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'MDAA-GitHubPipeline',
      Stages: [
        {
          Name: 'Source',
          Actions: [
            {
              Name: 'Source',
              ActionTypeId: {
                Category: 'Source',
                Owner: 'AWS',
                Provider: 'CodeStarSourceConnection',
                Version: '1',
              },
            },
          ],
        },
        {
          Name: 'Build',
          Actions: [
            {
              Name: 'Build',
              ActionTypeId: {
                Category: 'Build',
                Owner: 'AWS',
                Provider: 'CodeBuild',
                Version: '1',
              },
            },
          ],
        },
      ],
    });
  });

  test('Creates conditional S3 pipeline', () => {
    template.hasResourceProperties('AWS::CodePipeline::Pipeline', {
      Name: 'MDAA-S3Pipeline',
      Stages: [
        {
          Name: 'Source',
          Actions: [
            {
              Name: 'Source',
              ActionTypeId: {
                Category: 'Source',
                Owner: 'AWS',
                Provider: 'S3',
                Version: '1',
              },
            },
          ],
        },
        {
          Name: 'Build',
          Actions: [
            {
              Name: 'Build',
              ActionTypeId: {
                Category: 'Build',
                Owner: 'AWS',
                Provider: 'CodeBuild',
                Version: '1',
              },
            },
          ],
        },
      ],
    });
  });

  test('Contains proper validation rules', () => {
    const templateJson = template.toJSON();

    expect(templateJson.Rules).toBeDefined();
    expect(templateJson.Rules.ValidateGitHubParameters).toBeDefined();
    expect(templateJson.Rules.ValidateS3Parameters).toBeDefined();
    expect(templateJson.Rules.ValidateOrganizationName).toBeDefined();
    expect(templateJson.Rules.ValidateNetworkParametersForDataScience).toBeDefined();
  });

  test('Contains proper conditions for GitHub and S3', () => {
    const templateJson = template.toJSON();

    expect(templateJson.Conditions).toBeDefined();
    expect(templateJson.Conditions.UseGitHubCondition).toBeDefined();
    expect(templateJson.Conditions.UseS3Condition).toBeDefined();
  });

  test('Has proper metadata for CloudFormation interface', () => {
    const templateJson = template.toJSON();

    expect(templateJson.Metadata).toBeDefined();
    expect(templateJson.Metadata['AWS::CloudFormation::Interface']).toBeDefined();
    expect(templateJson.Metadata['AWS::CloudFormation::Interface'].ParameterGroups).toBeDefined();
    expect(templateJson.Metadata['AWS::CloudFormation::Interface'].ParameterLabels).toBeDefined();
    expect(templateJson.Metadata['AWS::CloudFormation::Interface'].ParameterVisibility).toBeDefined();
  });

  test('Enforces SSL on S3 buckets', () => {
    template.hasResourceProperties('AWS::S3::BucketPolicy', {
      PolicyDocument: {
        Statement: [
          {
            Effect: 'Deny',
            Principal: {
              AWS: '*',
            },
            Action: 's3:*',
            Condition: {
              Bool: {
                'aws:SecureTransport': 'false',
              },
            },
          },
        ],
      },
    });
  });
});

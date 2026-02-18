import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as MdaaInstaller from '../lib/mdaa-installer-stack';
import * as pjson from '../package.json';

describe('MdaaInstallerStack', () => {
  let app: cdk.App;
  let stack: MdaaInstaller.MdaaInstallerStack;
  let template: Template;
  const packageName = pjson.name.split('/')[1] ?? 'unknown';
  const packageVersion = pjson.version ?? 'unknown';

  beforeEach(() => {
    app = new cdk.App();
    stack = new MdaaInstaller.MdaaInstallerStack(app, 'TestMdaaInstallerStack', {
      description: `(${pjson.solution_id}-${packageName}) ${pjson.solution_name}. Version ${packageVersion}`,
    });
    template = Template.fromStack(stack);
  });

  test('Stack has correct solution name and description', () => {
    expect(stack.templateOptions.description).toBe(
      `(${pjson.solution_id}-${packageName}) ${pjson.solution_name}. Version ${packageVersion}`,
    );
  });

  test('Stack creates successfully', () => {
    expect(stack).toBeDefined();
    expect(template).toBeDefined();
  });

  test('Contains required parameters', () => {
    template.hasParameter('RepositoryBranchName', {
      Type: 'String',
    });

    template.hasParameter('OrgName', {
      Type: 'String',
      AllowedPattern: '^[a-z][a-z0-9-]{0,99}$',
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

  test('Creates KMS key with proper configuration', () => {
    template.hasResourceProperties('AWS::KMS::Key', {
      EnableKeyRotation: true,
    });
  });

  test('Creates CodeBuild project with proper configuration', () => {
    template.hasResourceProperties('AWS::CodeBuild::Project', {
      Environment: {
        Type: 'LINUX_CONTAINER',
        Image: 'aws/codebuild/standard:7.0',
        PrivilegedMode: true,
      },
      Source: {
        Type: 'NO_SOURCE',
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

  test('Contains proper validation rules', () => {
    const templateJson = template.toJSON();

    expect(templateJson.Rules).toBeDefined();
    expect(templateJson.Rules.ValidateOrganizationName).toBeDefined();
    expect(templateJson.Rules.ValidateNetworkParametersForDataScience).toBeDefined();
  });

  test('Has proper metadata for CloudFormation interface', () => {
    const templateJson = template.toJSON();

    expect(templateJson.Metadata).toBeDefined();
    expect(templateJson.Metadata['AWS::CloudFormation::Interface']).toBeDefined();
    expect(templateJson.Metadata['AWS::CloudFormation::Interface'].ParameterGroups).toBeDefined();
    expect(templateJson.Metadata['AWS::CloudFormation::Interface'].ParameterLabels).toBeDefined();
  });

  test('Has stack outputs for CodeBuild project', () => {
    template.hasOutput('CodeBuildProjectUrl', {});
    template.hasOutput('CodeBuildProjectName', {});
  });
});

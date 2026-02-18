import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as MdaaInstaller from '../lib/mdaa-installer-stack';

describe('MdaaInstallerStack Snapshots', () => {
  let app: cdk.App;
  let stack: MdaaInstaller.MdaaInstallerStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new MdaaInstaller.MdaaInstallerStack(app, 'TestMdaaInstallerStack', {
      env: {
        account: 'xxxxxx',
        region: 'us-east-1',
      },
    });
    template = Template.fromStack(stack);
  });

  test('Full CloudFormation template snapshot', () => {
    const templateJson = template.toJSON();
    expect(templateJson).toMatchSnapshot('full-template.json');
  });

  test('Parameters section snapshot', () => {
    const templateJson = template.toJSON();
    expect(templateJson.Parameters).toMatchSnapshot('parameters.json');
  });

  test('Resources section snapshot', () => {
    const templateJson = template.toJSON();
    expect(templateJson.Resources).toMatchSnapshot('resources.json');
  });

  test('Rules section snapshot', () => {
    const templateJson = template.toJSON();
    expect(templateJson.Rules).toMatchSnapshot('rules.json');
  });

  test('Metadata section snapshot', () => {
    const templateJson = template.toJSON();
    expect(templateJson.Metadata).toMatchSnapshot('metadata.json');
  });

  test('KMS resources snapshot', () => {
    const kmsResources = template.findResources('AWS::KMS::Key');
    expect({
      keys: kmsResources,
    }).toMatchSnapshot('kms-resources.json');
  });

  test('IAM resources snapshot', () => {
    const iamRoles = template.findResources('AWS::IAM::Role');
    const iamPolicies = template.findResources('AWS::IAM::Policy');
    expect({
      roles: iamRoles,
      policies: iamPolicies,
    }).toMatchSnapshot('iam-resources.json');
  });

  test('CodeBuild resources snapshot', () => {
    const codeBuildProjects = template.findResources('AWS::CodeBuild::Project');
    expect(codeBuildProjects).toMatchSnapshot('codebuild-resources.json');
  });

  test('Environment variables snapshot', () => {
    const templateJson = template.toJSON();
    const codeBuildProject = Object.values(templateJson.Resources).find(
      (resource: any) => resource.Type === 'AWS::CodeBuild::Project',
    ) as any;

    expect(codeBuildProject?.Properties?.Environment?.EnvironmentVariables).toMatchSnapshot(
      'environment-variables.json',
    );
  });

  test('BuildSpec snapshot', () => {
    const templateJson = template.toJSON();
    const codeBuildProject = Object.values(templateJson.Resources).find(
      (resource: any) => resource.Type === 'AWS::CodeBuild::Project',
    ) as any;

    expect(codeBuildProject?.Properties?.Source?.BuildSpec).toMatchSnapshot('buildspec.json');
  });

  test('Parameter groups and labels snapshot', () => {
    const templateJson = template.toJSON();
    const cfnInterface = templateJson.Metadata?.['AWS::CloudFormation::Interface'];

    expect({
      parameterGroups: cfnInterface?.ParameterGroups,
      parameterLabels: cfnInterface?.ParameterLabels,
    }).toMatchSnapshot('parameter-interface.json');
  });

  test('Security configurations snapshot', () => {
    const templateJson = template.toJSON();

    const securityConfigs = {
      kmsKeyRotation: [],
    } as any;

    Object.values(templateJson.Resources).forEach((resource: any) => {
      if (resource.Type === 'AWS::KMS::Key') {
        if (resource.Properties.EnableKeyRotation) {
          securityConfigs.kmsKeyRotation.push(resource.Properties.EnableKeyRotation);
        }
      }
    });

    expect(securityConfigs).toMatchSnapshot('security-configurations.json');
  });

  test('Resource dependencies snapshot', () => {
    const templateJson = template.toJSON();

    const dependencies = {} as any;
    Object.entries(templateJson.Resources).forEach(([resourceId, resource]: [string, any]) => {
      if (resource.DependsOn) {
        dependencies[resourceId] = resource.DependsOn;
      }
    });

    expect(dependencies).toMatchSnapshot('resource-dependencies.json');
  });
});

describe('MdaaInstallerStack with different configurations', () => {
  test('Stack with custom props snapshot', () => {
    const app = new cdk.App();
    const stack = new MdaaInstaller.MdaaInstallerStack(app, 'CustomMdaaInstallerStack', {
      env: {
        account: 'xxxxxxxx',
        region: 'us-west-2',
      },
      description: 'Custom MDAA Installer Stack for testing',
      tags: {
        Environment: 'Test',
        Project: 'MDAA',
      },
    });

    const template = Template.fromStack(stack);
    const templateJson = template.toJSON();

    expect({
      description: templateJson.Description,
      parameters: Object.keys(templateJson.Parameters || {}),
      resourceCount: Object.keys(templateJson.Resources || {}).length,
      ruleCount: Object.keys(templateJson.Rules || {}).length,
    }).toMatchSnapshot('custom-stack-summary.json');
  });
});

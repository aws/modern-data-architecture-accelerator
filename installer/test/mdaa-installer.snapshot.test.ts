import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as MdaaInstaller from '../lib/mdaa-installer-stack';

interface CfnResource {
  Type: string;
  Properties?: Record<string, unknown>;
  DependsOn?: string[];
}

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
    const resources = templateJson.Resources as Record<string, CfnResource>;
    const codeBuildProject = Object.values(resources).find(resource => resource.Type === 'AWS::CodeBuild::Project');
    const properties = codeBuildProject?.Properties as Record<string, Record<string, unknown>> | undefined;

    expect(properties?.Environment?.EnvironmentVariables).toMatchSnapshot('environment-variables.json');
  });

  test('BuildSpec snapshot', () => {
    const templateJson = template.toJSON();
    const resources = templateJson.Resources as Record<string, CfnResource>;
    const codeBuildProject = Object.values(resources).find(resource => resource.Type === 'AWS::CodeBuild::Project');
    const properties = codeBuildProject?.Properties as Record<string, Record<string, unknown>> | undefined;

    expect(properties?.Source?.BuildSpec).toMatchSnapshot('buildspec.json');
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
    const resources = templateJson.Resources as Record<string, CfnResource>;

    const kmsKeyRotation: unknown[] = [];
    for (const resource of Object.values(resources)) {
      if (resource.Type === 'AWS::KMS::Key') {
        const props = resource.Properties as Record<string, unknown> | undefined;
        if (props?.EnableKeyRotation) {
          kmsKeyRotation.push(props.EnableKeyRotation);
        }
      }
    }

    expect({ kmsKeyRotation }).toMatchSnapshot('security-configurations.json');
  });

  test('Resource dependencies snapshot', () => {
    const templateJson = template.toJSON();
    const resources = templateJson.Resources as Record<string, CfnResource>;

    const dependencies: Record<string, string[]> = {};
    for (const [resourceId, resource] of Object.entries(resources)) {
      if (resource.DependsOn) {
        dependencies[resourceId] = resource.DependsOn;
      }
    }

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

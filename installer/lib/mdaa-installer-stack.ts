import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import { version } from '../../package.json';

const GITHUB_REPO_URL = 'https://github.com/aws/modern-data-architecture-accelerator.git';

export class MdaaInstallerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      synthesizer: new cdk.DefaultStackSynthesizer({
        generateBootstrapVersionRule: false,
      }),
    });

    // ===== GitHub parameters =====
    const repositoryBranchName = new cdk.CfnParameter(this, 'RepositoryBranchName', {
      type: 'String',
      description: 'The name of the branch (e.g., "main")',
      default: `release/v${version}`,
      allowedPattern: '.+',
      constraintDescription: 'Repository Branch Name is required',
    });

    // ===== MDAA parameters =====
    const sampleNameParam = new cdk.CfnParameter(this, 'SampleName', {
      type: 'String',
      description: 'MDAA Sample you want to deploy',
      allowedValues: ['basic_datalake', 'basic_datascience_platform'],
      default: 'basic_datalake',
    });

    // Sample config folder from CDK context (defaults to 'starter_kits')
    // Use -c sampleConfigFolder=sample_configs for older branches
    const sampleConfigFolder = this.node.tryGetContext('sampleConfigFolder') ?? 'starter_kits';

    const orgNameParam = new cdk.CfnParameter(this, 'OrgName', {
      type: 'String',
      description:
        'An MDAA deployment requires an Org Name (must start with a lowercase letter, contain only lowercase alphanumeric characters and hyphens, and be 100 characters or less)',
      allowedPattern: '^[a-z][a-z0-9-]{0,99}$',
      constraintDescription:
        'Org Name must start with a lowercase letter and contain only lowercase alphanumeric characters and hyphens. Maximum length is 100 characters.',
    });

    const mdaaVersionParam = new cdk.CfnParameter(this, 'MdaaVersion', {
      type: 'String',
      description:
        'Version of the MDAA modules to deploy (e.g., "latest", "1.3.0"). This version needs to be compatible with the branch you are selecting',
      default: 'latest',
      allowedPattern: String.raw`^(latest|[0-9]+(\.[0-9]+)*)$`,
      constraintDescription: 'Must be "latest" or a version with numbers and dots only (e.g., 1.3.0)',
    });

    // Add validation rule for Organization Name (always required)
    new cdk.CfnRule(this, 'ValidateOrganizationName', {
      assertions: [
        {
          assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(orgNameParam.valueAsString, '')),
          assertDescription: 'Organization Name is required for all MDAA deployments',
        },
      ],
    });

    // Network parameters
    const vpcIdParam = new cdk.CfnParameter(this, 'VpcId', {
      type: 'AWS::EC2::VPC::Id',
      description: 'The ID of the VPC to use for deployment. Required for resources that need network access.',
    });

    const subnetIdParam = new cdk.CfnParameter(this, 'SubnetId', {
      type: 'AWS::EC2::Subnet::Id',
      description:
        'The ID of the subnet to use for deployment. Must be a subnet within the selected VPC. Required for resources that need network access.',
    });

    new cdk.CfnRule(this, 'ValidateNetworkParametersForDataScience', {
      ruleCondition: cdk.Fn.conditionEquals(sampleNameParam.valueAsString, 'basic_datascience_platform'),
      assertions: [
        {
          assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(vpcIdParam.valueAsString, '')),
          assertDescription: 'VPC ID is required.',
        },
        {
          assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(subnetIdParam.valueAsString, '')),
          assertDescription: 'Subnet ID is required.',
        },
      ],
    });

    // Define parameter groups for better organization in the CloudFormation console
    const parameterGroups: { Label: { default: string }; Parameters: string[] }[] = [
      {
        Label: { default: 'GitHub Repository Configuration' },
        Parameters: [repositoryBranchName.logicalId],
      },
      {
        Label: { default: 'MDAA Configuration' },
        Parameters: [sampleNameParam.logicalId, orgNameParam.logicalId, mdaaVersionParam.logicalId],
      },
      {
        Label: { default: 'Network Configuration' },
        Parameters: [vpcIdParam.logicalId, subnetIdParam.logicalId],
      },
    ];

    const parameterLabels = {
      [repositoryBranchName.logicalId]: { default: 'GitHub Branch Name' },
      [sampleNameParam.logicalId]: { default: 'MDAA Sample Configuration' },
      [orgNameParam.logicalId]: { default: 'Organization Name (Required)' },
      [mdaaVersionParam.logicalId]: { default: 'MDAA Version' },
      [vpcIdParam.logicalId]: { default: 'VPC ID' },
      [subnetIdParam.logicalId]: { default: 'Subnet ID' },
    };

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: parameterGroups,
        ParameterLabels: parameterLabels,
      },
    };

    // KMS Key for encryption
    const installerKey = new kms.Key(this, 'InstallerKey', {
      enableKeyRotation: true,
      description: 'Key used for encryption of CodeBuild artifacts',
    });

    // IAM Role for CodeBuild
    const buildRole = new iam.Role(this, 'BuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')],
    });

    // GitHub CodeBuild Project (standalone - uses git clone)
    const buildProject = new codebuild.Project(this, 'GitHubBuildProject', {
      projectName: `MDAA-Build-${sampleNameParam.valueAsString}`,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      encryptionKey: installerKey,
      role: buildRole,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: 0.2,
        phases: {
          install: {
            'runtime-versions': {
              nodejs: 22,
            },
            commands: [`git clone --branch $REPOSITORY_BRANCH_NAME --single-branch ${GITHUB_REPO_URL}`],
          },
          build: {
            commands: [
              'set -e',
              'cd modern-data-architecture-accelerator',
              'npm install -g aws-cdk @aws-mdaa/cli@${MDAA_VERSION}',
              'echo "Starting build phase..."',
              "export CDK_DEFAULT_REGION=$(aws ec2 describe-availability-zones --output text --query 'AvailabilityZones[0].RegionName')",
              "export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query 'Account' --output text)",
              'export CDK_NEW_BOOTSTRAP=1 && aws cloudformation describe-stacks --stack-name CDKToolkit || npx cdk bootstrap aws://${CDK_DEFAULT_ACCOUNT}/${CDK_DEFAULT_REGION}',
              'echo "org: ${ORG_NAME}"',
              'echo "Replacing org-name place holder"',
              'echo using sample: ${SAMPLE_CONFIG_FOLDER}/${SAMPLE_NAME}/mdaa.yaml',
              "sed -i 's/<unique[- ]org[- ]name>/'\"$ORG_NAME\"'/g' ${SAMPLE_CONFIG_FOLDER}/${SAMPLE_NAME}/mdaa.yaml",
              'find ${SAMPLE_CONFIG_FOLDER}/${SAMPLE_NAME}/ -type f \\( -name "*.yaml" -o -name "*.yml" \\) -exec sed -i \'s/<your vpc id>/\'"$VPC_ID"\'/g\' {} \\;',
              'find ${SAMPLE_CONFIG_FOLDER}/${SAMPLE_NAME}/ -type f \\( -name "*.yaml" -o -name "*.yml" \\) -exec sed -i \'s/<your subnet id>/\'"$SUBNET_ID"\'/g\' {} \\;',
              'find ${SAMPLE_CONFIG_FOLDER}/${SAMPLE_NAME}/ -type f \\( -name "*.yaml" -o -name "*.yml" \\) -exec sed -i \'s/<your datascience team name>/\'"$ORG_NAME"\'-datascience-team/g\' {} \\;',
              "sed -i 's/^region: default$/region: '\"$CDK_DEFAULT_REGION\"'/' ${SAMPLE_CONFIG_FOLDER}/${SAMPLE_NAME}/mdaa.yaml",
              'mdaa -c ${SAMPLE_CONFIG_FOLDER}/${SAMPLE_NAME}/mdaa.yaml --mdaa_version ${MDAA_VERSION} deploy',
              'echo "Deployment completed successfully"',
            ],
          },
        },
      }),
      environmentVariables: {
        REPOSITORY_BRANCH_NAME: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: repositoryBranchName.valueAsString,
        },
        SAMPLE_NAME: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: sampleNameParam.valueAsString,
        },
        SAMPLE_CONFIG_FOLDER: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: sampleConfigFolder,
        },
        ORG_NAME: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: orgNameParam.valueAsString,
        },
        VPC_ID: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: vpcIdParam.valueAsString,
        },
        SUBNET_ID: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: subnetIdParam.valueAsString,
        },
        MDAA_VERSION: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: mdaaVersionParam.valueAsString,
        },
      },
    });

    // Stack outputs with clickable links
    new cdk.CfnOutput(this, 'CodeBuildProjectUrl', {
      value: `https://${this.region}.console.aws.amazon.com/codesuite/codebuild/projects/${buildProject.projectName}/build-history?region=${this.region}`,
      description: 'Click to open the CodeBuild project. Then click "Start build" to begin the MDAA deployment.',
    });

    new cdk.CfnOutput(this, 'CodeBuildProjectName', {
      value: buildProject.projectName,
      description: 'Name of the CodeBuild project',
    });
  }
}

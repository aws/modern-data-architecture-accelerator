import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as codepipeline from 'aws-cdk-lib/aws-codepipeline';
import * as codepipeline_actions from 'aws-cdk-lib/aws-codepipeline-actions';
import { version } from '../../package.json';

export enum RepositorySources {
  GITHUB = 'github',
  S3 = 's3',
}

export class MdaaInstallerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, {
      ...props,
      synthesizer: new cdk.DefaultStackSynthesizer({
        generateBootstrapVersionRule: false,
      }),
    });

    // Source selection parameter
    const repositorySource = new cdk.CfnParameter(this, 'RepositorySource', {
      type: 'String',
      description: 'Repository source for the code (Required)',
      allowedValues: [RepositorySources.GITHUB, RepositorySources.S3],
      default: RepositorySources.GITHUB,
    });

    // Create conditions for GitHub vs S3 deployment
    const useGitHubCondition = new cdk.CfnCondition(this, 'UseGitHubCondition', {
      expression: cdk.Fn.conditionEquals(repositorySource.valueAsString, RepositorySources.GITHUB),
    });

    const useS3Condition = new cdk.CfnCondition(this, 'UseS3Condition', {
      expression: cdk.Fn.conditionEquals(repositorySource.valueAsString, RepositorySources.S3),
    });

    // ===== GitHub parameters =====
    const repositoryOwner = new cdk.CfnParameter(this, 'RepositoryOwner', {
      type: 'String',
      description: 'The owner of the GitHub repository containing the code (Required for GitHub)',
      default: 'aws',
      constraintDescription: 'Repository Owner is required when GitHub is selected as the repository source',
    });

    const repositoryName = new cdk.CfnParameter(this, 'RepositoryName', {
      type: 'String',
      description: 'The name of the GitHub repository containing the code (Required for GitHub)',
      default: 'modern-data-architecture-accelerator',
      constraintDescription: 'Repository Name is required when GitHub is selected as the repository source',
    });

    const repositoryBranchName = new cdk.CfnParameter(this, 'RepositoryBranchName', {
      type: 'String',
      description: 'The name of the branch (e.g., "release/v1.0.0") (Required for GitHub)',
      default: `release/v${version}`,
      allowedPattern: '.+',
      constraintDescription: 'Repository Branch Name is required when GitHub is selected as the repository source',
    });

    const codeConnectArn = new cdk.CfnParameter(this, 'CodeConnectArn', {
      type: 'String',
      description:
        'ARN of the CodeConnect connection to GitHub (Required for GitHub). Head over to the CodePipeline->Settings->Connections to create one',
      constraintDescription: 'CodeConnect ARN is required when GitHub is selected as the repository source',
    });

    // Add validation rules for GitHub parameters
    new cdk.CfnRule(this, 'ValidateGitHubParameters', {
      ruleCondition: cdk.Fn.conditionEquals(repositorySource.valueAsString, RepositorySources.GITHUB),
      assertions: [
        {
          assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(repositoryOwner.valueAsString, '')),
          assertDescription: 'Repository Owner is required when GitHub is selected as the repository source',
        },
        {
          assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(repositoryName.valueAsString, '')),
          assertDescription: 'Repository Name is required when GitHub is selected as the repository source',
        },
        {
          assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(repositoryBranchName.valueAsString, '')),
          assertDescription: 'Repository Branch Name is required when GitHub is selected as the repository source',
        },
        {
          assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(codeConnectArn.valueAsString, '')),
          assertDescription: 'CodeConnect ARN is required when GitHub is selected as the repository source',
        },
      ],
    });

    // ===== S3 parameters =====
    const repositoryBucketName = new cdk.CfnParameter(this, 'RepositoryBucketName', {
      type: 'String',
      description:
        'The S3 bucket containing the code. This bucket must be in the same region as the stack. (Required for S3)',
      constraintDescription: 'Repository Bucket Name is required when S3 is selected as the repository source',
    });

    const repositoryBucketObject = new cdk.CfnParameter(this, 'RepositoryBucketObject', {
      type: 'String',
      description: 'The S3 object key for the code zip file (Required for S3)',
      default: 'release/latest.zip',
      constraintDescription: 'Repository Bucket Object is required when S3 is selected as the repository source',
    });

    // Add validation rules for S3 parameters
    new cdk.CfnRule(this, 'ValidateS3Parameters', {
      ruleCondition: cdk.Fn.conditionEquals(repositorySource.valueAsString, RepositorySources.S3),
      assertions: [
        {
          assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(repositoryBucketName.valueAsString, '')),
          assertDescription: 'Repository Bucket Name is required when S3 is selected as the repository source',
        },
        {
          assert: cdk.Fn.conditionNot(cdk.Fn.conditionEquals(repositoryBucketObject.valueAsString, '')),
          assertDescription: 'Repository Bucket Object is required when S3 is selected as the repository source',
        },
      ],
    });

    // ===== Common parameters (always required) =====
    // Sample and organization parameters
    const sampleNameParam = new cdk.CfnParameter(this, 'SampleName', {
      type: 'String',
      description: 'MDAA Sample you want to deploy',
      allowedValues: ['basic_datalake', 'basic_datascience_platform'],
      default: 'basic_datalake',
    });

    // org name
    const orgNameParam = new cdk.CfnParameter(this, 'OrgName', {
      type: 'String',
      description:
        'An MDAA deployment requires an Org Name (must start with a letter, contain only alphanumeric characters and hyphens, and be 100 characters or less)',
      allowedPattern: '^[a-zA-Z][a-zA-Z0-9-]{0,99}$',
      constraintDescription:
        'Org Name must start with a letter and contain only alphanumeric characters (case-sensitive) and hyphens. Maximum length is 100 characters.',
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
        Label: { default: 'Repository Selection' },
        Parameters: [repositorySource.logicalId],
      },
      {
        Label: { default: 'Github Repository Configuration (Only if Github is selected as repository source)' },
        Parameters: [
          repositoryOwner.logicalId,
          repositoryName.logicalId,
          repositoryBranchName.logicalId,
          codeConnectArn.logicalId,
        ],
      },
      {
        Label: { default: 'S3 Repository Configuration (Only if S3 is selected as repository source)' },
        Parameters: [repositoryBucketName.logicalId, repositoryBucketObject.logicalId],
      },
      {
        Label: { default: 'MDAA Configuration' },
        Parameters: [sampleNameParam.logicalId, orgNameParam.logicalId],
      },
      {
        Label: { default: 'Network Configuration' },
        Parameters: [vpcIdParam.logicalId, subnetIdParam.logicalId],
      },
    ];

    const parameterLabels = {
      [repositorySource.logicalId]: { default: 'Repository Source' },
      [repositoryOwner.logicalId]: { default: 'GitHub Repository Owner/Organization' },
      [repositoryName.logicalId]: { default: 'GitHub Repository Name' },
      [repositoryBranchName.logicalId]: { default: 'GitHub Branch Name' },
      [codeConnectArn.logicalId]: { default: 'CodeConnect ARN' },
      [repositoryBucketName.logicalId]: { default: 'S3 Bucket Name' },
      [repositoryBucketObject.logicalId]: { default: 'S3 Object Key' },
      [sampleNameParam.logicalId]: { default: 'MDAA Sample Configuration' },
      [orgNameParam.logicalId]: { default: 'Organization Name (Required)' },
      [vpcIdParam.logicalId]: { default: 'VPC ID' },
      [subnetIdParam.logicalId]: { default: 'Subnet ID' },
    };

    this.templateOptions.metadata = {
      'AWS::CloudFormation::Interface': {
        ParameterGroups: parameterGroups,
        ParameterLabels: parameterLabels,
        ParameterVisibility: {
          [repositoryOwner.logicalId]: `{{${repositorySource.logicalId} == '${RepositorySources.GITHUB}'}}`,
          [repositoryName.logicalId]: `{{${repositorySource.logicalId} == '${RepositorySources.GITHUB}'}}`,
          [repositoryBranchName.logicalId]: `{{${repositorySource.logicalId} == '${RepositorySources.GITHUB}'}}`,
          [codeConnectArn.logicalId]: `{{${repositorySource.logicalId} == '${RepositorySources.GITHUB}'}}`,
          [repositoryBucketName.logicalId]: `{{${repositorySource.logicalId} == '${RepositorySources.S3}'}}`,
          [repositoryBucketObject.logicalId]: `{{${repositorySource.logicalId} == '${RepositorySources.S3}'}}`,
        },
      },
    };

    // KMS Key for encryption
    const installerKey = new kms.Key(this, 'InstallerKey', {
      enableKeyRotation: true,
      description: 'Key used for encryption of pipeline artifacts',
    });

    // S3 Buckets
    const accessLogsBucket = new s3.Bucket(this, 'AccessLogsBucket', {
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    const artifactBucket = new s3.Bucket(this, 'ArtifactBucket', {
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: installerKey,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      serverAccessLogsBucket: accessLogsBucket,
      serverAccessLogsPrefix: 'artifact-bucket-logs/',
    });

    // IAM Role for CodeBuild
    const buildRole = new iam.Role(this, 'BuildRole', {
      assumedBy: new iam.ServicePrincipal('codebuild.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')],
    });

    // CodeBuild Project
    const buildProject = new codebuild.PipelineProject(this, 'BuildProject', {
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      encryptionKey: installerKey,
      role: buildRole,
      buildSpec: codebuild.BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            'runtime-versions': {
              nodejs: 22,
            },
            commands: ['ls -lt', 'npm ci', 'npm install -g aws-cdk'],
          },
          build: {
            commands: [
              'set -e',
              'echo "Starting build phase..."',
              "export CDK_DEFAULT_REGION=$(aws ec2 describe-availability-zones --output text --query 'AvailabilityZones[0].RegionName')",
              "export CDK_DEFAULT_ACCOUNT=$(aws sts get-caller-identity --query 'Account' --output text)",
              'export CDK_NEW_BOOTSTRAP=1 && aws cloudformation describe-stacks --stack-name CDKToolkit || npx cdk bootstrap aws://${CDK_DEFAULT_ACCOUNT}/${CDK_DEFAULT_REGION}',
              'echo "org: ${ORG_NAME}"',
              'echo "Replacing org-name place holder"',
              'echo using sample: sample_configs/${SAMPLE_NAME}/mdaa.yaml',
              "sed -i 's/<unique[- ]org[- ]name>/'\"$ORG_NAME\"'/g' sample_configs/${SAMPLE_NAME}/mdaa.yaml",
              'find sample_configs/${SAMPLE_NAME}/ -type f \\( -name "*.yaml" -o -name "*.yml" \\) -exec sed -i \'s/<your vpc id>/\'"$VPC_ID"\'/g\' {} \\;',
              'find sample_configs/${SAMPLE_NAME}/ -type f \\( -name "*.yaml" -o -name "*.yml" \\) -exec sed -i \'s/<your subnet id>/\'"$SUBNET_ID"\'/g\' {} \\;',
              'find sample_configs/${SAMPLE_NAME}/ -type f \\( -name "*.yaml" -o -name "*.yml" \\) -exec sed -i \'s/<data scientist user id>/\'"$ORG_NAME"\'-datascientist/g\' {} \\;',
              './bin/mdaa -c sample_configs/${SAMPLE_NAME}/mdaa.yaml deploy',
              'echo "Deployment completed successfully"',
            ],
          },
        },
        cache: {
          paths: ['node_modules/**/*'],
        },
      }),
      environmentVariables: {
        REPOSITORY_SOURCE: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: repositorySource.valueAsString,
        },
        REPOSITORY_OWNER: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: repositoryOwner.valueAsString,
        },
        REPOSITORY_NAME: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: repositoryName.valueAsString,
        },
        REPOSITORY_BRANCH_NAME: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: repositoryBranchName.valueAsString,
        },
        REPOSITORY_BUCKET_NAME: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: repositoryBucketName.valueAsString,
        },
        REPOSITORY_BUCKET_OBJECT: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: repositoryBucketObject.valueAsString,
        },
        SAMPLE_NAME: {
          type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
          value: sampleNameParam.valueAsString,
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
      },
    });

    // Pipeline artifact
    const sourceOutput = new codepipeline.Artifact();

    // GitHub Pipeline with explicit role
    const githubPipelineRole = new iam.Role(this, 'GitHubPipelineRole', {
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
    });

    // Add inline policy to the role for accessing the CodeStar connection
    githubPipelineRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['codestar-connections:UseConnection'],
        resources: [codeConnectArn.valueAsString],
      }),
    );

    const githubPipeline = new codepipeline.Pipeline(this, 'GitHubPipeline', {
      pipelineName: 'MDAA-GitHubPipeline',
      artifactBucket,
      role: githubPipelineRole,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.CodeStarConnectionsSourceAction({
              actionName: 'Source',
              owner: repositoryOwner.valueAsString,
              repo: repositoryName.valueAsString,
              branch: repositoryBranchName.valueAsString,
              connectionArn: codeConnectArn.valueAsString,
              output: sourceOutput,
              triggerOnPush: false,
              codeBuildCloneOutput: true,
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Build',
              project: buildProject,
              input: sourceOutput,
              role: githubPipelineRole,
            }),
          ],
        },
      ],
    });

    // S3 Pipeline with shared role for pipeline and source action
    const s3PipelineRole = new iam.Role(this, 'S3PipelineRole', {
      assumedBy: new iam.ServicePrincipal('codepipeline.amazonaws.com'),
    });

    // Add S3 permissions to the pipeline role
    s3PipelineRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject', 's3:GetObjectVersion'],
        resources: [`arn:aws:s3:::${repositoryBucketName.valueAsString}/${repositoryBucketObject.valueAsString}`],
      }),
    );

    const s3Pipeline = new codepipeline.Pipeline(this, 'S3Pipeline', {
      pipelineName: 'MDAA-S3Pipeline',
      artifactBucket,
      role: s3PipelineRole,
      stages: [
        {
          stageName: 'Source',
          actions: [
            new codepipeline_actions.S3SourceAction({
              actionName: 'Source',
              bucket: s3.Bucket.fromBucketName(this, 'SourceBucket', repositoryBucketName.valueAsString),
              bucketKey: repositoryBucketObject.valueAsString,
              output: sourceOutput,
              role: s3PipelineRole, // Use the same role as the pipeline
            }),
          ],
        },
        {
          stageName: 'Build',
          actions: [
            new codepipeline_actions.CodeBuildAction({
              actionName: 'Build',
              project: buildProject,
              input: sourceOutput,
              role: s3PipelineRole,
            }),
          ],
        },
      ],
    });

    // Apply conditions to all resources related to GitHub pipeline
    githubPipeline.node.findAll().forEach(child => {
      if (child instanceof cdk.CfnResource) {
        child.cfnOptions.condition = useGitHubCondition;
      }
    });

    githubPipelineRole.node.findAll().forEach(child => {
      if (child instanceof iam.CfnPolicy) {
        child.cfnOptions.condition = useGitHubCondition;
      }
    });

    // Apply conditions to all resources related to S3 pipeline
    s3Pipeline.node.findAll().forEach(child => {
      if (child instanceof cdk.CfnResource) {
        child.cfnOptions.condition = useS3Condition;
      }
    });
  }
}

import * as path from "path";
import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as sagemaker from "aws-cdk-lib/aws-sagemaker";
import * as cr from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";

import { ContainerImages } from "../container-images";
import { ImageRepositoryMapping } from "../image-repository-mapping";
import {MdaaBucket} from "@aws-mdaa/s3-constructs";
import {Shared} from "../../shared";
import {MdaaL3ConstructProps} from "@aws-mdaa/l3-construct";
import {MdaaRole} from "@aws-mdaa/iam-constructs";
import {MdaaLambdaFunction} from "@aws-mdaa/lambda-constructs";
import {ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {NagSuppressions} from "cdk-nag";
import {MdaaKmsKey} from "@aws-mdaa/kms-constructs";

export interface HuggingFaceCustomScriptModelProps extends MdaaL3ConstructProps {
  vpc: ec2.IVpc;
  shared: Shared;
  region: string;
  instanceType: string;
  initialInstanceCount: number;
  minInstanceCount: number;
  maxInstanceCount: number;
  modelId: string | string[];
  container?: string;
  codeFolder?: string;
  codeBuildComputeType?: codebuild.ComputeType;
  env?: { [key: string]: string };
  architecture?: lambda.Architecture;
  runtime?: lambda.Runtime;
  encryptionKey: MdaaKmsKey;
}

export class HuggingFaceCustomScriptModel extends Construct {
  public readonly model: sagemaker.CfnModel;
  public readonly endpoint: sagemaker.CfnEndpoint;

  constructor(
    scope: Construct,
    id: string,
    props: HuggingFaceCustomScriptModelProps
  ) {
    super(scope, id);

    const {
      region,
      instanceType,
      container,
      codeFolder,
      codeBuildComputeType,
      env,
      initialInstanceCount,
      minInstanceCount,
      maxInstanceCount
    } = props;
    const modelId = Array.isArray(props.modelId)
      ? props.modelId.join(",")
      : props.modelId;

    const huggingFaceBuilderName = 'HuggingFaceCodeBuild'

    const buildBucket = new MdaaBucket(this, "HuggingFaceBuildBucket", {
      encryptionKey: props?.encryptionKey,
      naming: props.naming,
      bucketName: `${props.naming.props.org}-${props.naming.props.domain}-${props.naming.props.env}-HF-model-build-bucket`,
      createParams: false,
      createOutputs: false
    });

    // Upload build code to S3
    new s3deploy.BucketDeployment(this, "Script", {
      sources: [s3deploy.Source.asset(path.join(__dirname, "./build-script"))],
      retainOnDelete: false,
      destinationBucket: buildBucket,
      destinationKeyPrefix: "build-script",
    });

    let deployment;
    // Upload model folder to S3
    if (codeFolder) {
      deployment = new s3deploy.BucketDeployment(this, "ModelCode", {
        sources: [s3deploy.Source.asset(codeFolder)],
        retainOnDelete: false,
        destinationBucket: buildBucket,
        destinationKeyPrefix: "model-code",
      });
    }

    // Mdaa Custom Resource looks up provider role with naming convention custom-<resource-name>-provider-role
    const codeBuildRole = new MdaaRole(this, "CodeBuildRole", {
      roleName: `custom-${huggingFaceBuilderName}-provider-role`,
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      assumedBy: new iam.ServicePrincipal("codebuild.amazonaws.com"),
      inlinePolicies: {
        CodeBuildPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
              ],
              resources: [
                `arn:${ cdk.Stack.of( this ).partition }:logs:${ cdk.Stack.of( this ).region }:${ cdk.Stack.of( this ).account }:log-group:/aws/codebuild/*`,
                `arn:${ cdk.Stack.of( this ).partition }:logs:${ cdk.Stack.of( this ).region }:${ cdk.Stack.of( this ).account }:log-group:/aws/codebuild/*:log-stream:*`
              ],
            }),
          ],
        }),
      }
    });

    const buildspec = codebuild.BuildSpec.fromObject({
      version: "0.2",
      phases: {
        install: {
          commands: [
            'echo "Updating system packages..."',
            "apt-get update",
            'echo "Installing tar, pigz, awscli, virtualenv, python3-pip, and python3-dev..."',
            "apt-get install -y tar pigz awscli virtualenv python3-pip python3-dev",
            'echo "Updating pip..."',
            "pip3 install --upgrade pip",
          ],
        },
        pre_build: {
          commands: [
            'echo "Downloading build code from S3..."',
            "aws s3 cp s3://$BUILD_BUCKET/build-script ./build --recursive",
            'echo "Downloading model from S3..."',
            "aws s3 cp s3://$BUILD_BUCKET/model-code ./model --recursive",
            "ls -al",
            "ls -al ./build",
            "ls -al ./model",
            "COMMIT_HASH=$(echo $CODEBUILD_RESOLVED_SOURCE_VERSION | cut -c 1-7)",
            "IMAGE_TAG=${COMMIT_HASH:=latest}",
          ],
        },
        build: {
          commands: [
            'echo "Installing Python requirements..."',
            "pip3 install -r build/requirements.txt --upgrade",
            'echo "Running script.py..."',
            "python3 build/script.py",
          ],
        },
      },
    });

    // CodeBuild project
    const codeBuildProject = new codebuild.Project(this, "CodeBuildProject", {
      buildSpec: buildspec,
      role: codeBuildRole,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
        computeType: codeBuildComputeType ?? codebuild.ComputeType.LARGE,
      },
      encryptionKey: props.encryptionKey,
      environmentVariables: {
        MODEL_ID: {
          value: modelId,
        },
        BUILD_BUCKET: {
          value: buildBucket.bucketName,
        },
        HF_HUB_ENABLE_HF_TRANSFER: {
          value: "1",
        },
        HF_HUB_DISABLE_PROGRESS_BARS: {
          value: "1",
        },
        HF_HUB_DISABLE_TELEMETRY: {
          value: "1",
        },
      },
    });

    if (codeFolder && deployment) {
      codeBuildProject.node.addDependency(deployment);
    }

    buildBucket.grantReadWrite(codeBuildProject.grantPrincipal);

    const onEventHandlerRole = new MdaaRole(this, "OnEventHandlerRole", {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      naming: props.naming,
      roleName:  'HfCustomScriptOnEventHandler',
      createParams: false,
      createOutputs: false
    });

    // custom resource lambda handlers
    const onEventHandler = new MdaaLambdaFunction(this, "HuggingFaceOnEventHandler", {
      functionName: "HuggingFaceOnEventHandler",
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      role: onEventHandlerRole,
      runtime: lambda.Runtime.PYTHON_3_11,
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromAsset(path.join(__dirname, "./build-function")),
      handler: "index.on_event"
    });

    // grant the lambda role permissions to start the build
    onEventHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["codebuild:StartBuild"],
        resources: [codeBuildProject.projectArn],
      })
    );

    const isCompleteHandlerRole = new MdaaRole(this, 'IsCompleteHandlerRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      roleName: 'HfCustomIsCompleteHandler'
    })

    // custom resource lamdba handlers
    const isCompleteHandler = new MdaaLambdaFunction(this, "IsCompleteHandler", {
      functionName: "HfCustomIsCompleteHandler",
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      role: isCompleteHandlerRole,
      runtime: lambda.Runtime.PYTHON_3_11,
      architecture: lambda.Architecture.ARM_64,
      code: lambda.Code.fromAsset(path.join(__dirname, "./build-function")),
      handler: "index.is_complete",
    });

    // grant the lambda role permissions to BatchGetBuilds
    isCompleteHandlerRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["codebuild:BatchGetBuilds"],
        resources: [codeBuildProject.projectArn],
      })
    );

    // Mdaa Custom Resource looks up provider with naming convention custom-<resource-name>-provider
    const provider = new cr.Provider(this, "Provider", {
      providerFunctionName: `custom-${huggingFaceBuilderName}-provider`,
      onEventHandler: onEventHandler,
      isCompleteHandler: isCompleteHandler,
      queryInterval: cdk.Duration.seconds(30),
      totalTimeout: cdk.Duration.minutes(120),
    });
    provider.node.addDependency(codeBuildProject);

    // run the custom resource to start the build
    const build = new cdk.CustomResource(this, "Build", {
      // removalPolicy: cdk.RemovalPolicy.DESTROY,
      serviceToken: provider.serviceToken,
      properties: {
        ProjectName: codeBuildProject.projectName,
      },
    });

    const executionRole = new MdaaRole(this, "SageMakerCustomScriptExecutionRole", {
      naming: props.naming,
      roleName:  "HfCustomScriptExecutionRole",
      createParams: false,
      createOutputs: false,
      assumedBy: new iam.ServicePrincipal("sagemaker.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSageMakerFullAccess"),
      ]
    });

    buildBucket.grantRead(executionRole);

    const containerImage =
      container || ContainerImages.HF_PYTORCH_INFERENCE_LATEST;
    const imageMapping = new ImageRepositoryMapping(
      scope,
      "CustomScriptModelMapping",
      { region }
    );
    const image = `${imageMapping.account}.dkr.ecr.${region}.amazonaws.com/${containerImage}`;

    const model = new sagemaker.CfnModel(this, "Model", {
      executionRoleArn: executionRole.roleArn,
      primaryContainer: {
        image,
        modelDataUrl: `s3://${buildBucket.bucketName}/out/model.tar.gz`,
        mode: "SingleModel",
        environment: {
          SAGEMAKER_CONTAINER_LOG_LEVEL: "20",
          SAGEMAKER_REGION: region,
          ...env,
        },
      },
    });
    model.node.addDependency(build);

    const endpointConfig = new sagemaker.CfnEndpointConfig(
      this,
      "EndpointConfig",
      {
        kmsKeyId: props.encryptionKey.keyId,
        productionVariants: [
          {
            instanceType,
            initialVariantWeight: 1,
            initialInstanceCount: initialInstanceCount,
            variantName: "AllTraffic",
            modelName: model.getAtt("ModelName").toString(),
            containerStartupHealthCheckTimeoutInSeconds: 900,
            managedInstanceScaling: {
              minInstanceCount,
              maxInstanceCount
            }
          },
        ],
      }
    );

    endpointConfig.addDependency(model);

    const endpoint = new sagemaker.CfnEndpoint(this, "Endpoint", {
      endpointConfigName: endpointConfig
        .getAtt("EndpointConfigName")
        .toString(),
    });

    endpoint.addDependency(endpointConfig);


    NagSuppressions.addResourceSuppressions(codeBuildProject, [
      {
        id: 'HIPAA.Security-CodeBuildProjectSourceRepoUrl',
        reason: 'Codebuild project is not using a github or bitbucket source'
      }
    ])


    NagSuppressions.addResourceSuppressions(
        buildBucket,
        [
          { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'Bucket used for codebuild during deployment, replication not appropriate.' },
          { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'Bucket used for codebuild during deployment, replication not appropriate.' }
        ],
        true
    );

    NagSuppressions.addResourceSuppressions( codeBuildRole, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'LogStream names dynamically generated by Lambda. And wild-carded actions bound resource and used by CodeBuild only during deployment'
      },
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and its custom resource.' },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and its custom resource.' }
    ], true);

    NagSuppressions.addResourceSuppressions(onEventHandlerRole, [
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and its custom resource.' },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and its custom resource.' },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Event handler lambda resources unknown at deployment, used for deployment only'
      },

    ], true);


    NagSuppressions.addResourceSuppressions(onEventHandler, [
      { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Only run during deployment, concurrency does not fit the scenario.' },
      { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Only run during deployment, concurrency does not fit the scenario.' },
      { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Used in a custom resource, error handling is managed by Cloudformation.' },
      { id: 'HIPAA.Security-LambdaDLQ', reason: 'Used in a custom resource, error handling is managed by Cloudformation.' },
      { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Used in a custom resource only during deployment.' },
      { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Used in a custom resource only during deployment.' },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Event handler lambda resources unknown at deployment, used for deployment only'
      },
    ], true);

    NagSuppressions.addResourceSuppressions(isCompleteHandler, [
      { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Only run during deployment, concurrency does not fit the scenario.' },
      { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Only run during deployment, concurrency does not fit the scenario.' },
      { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Used in a custom resource, error handling is managed by Cloudformation.' },
      { id: 'HIPAA.Security-LambdaDLQ', reason: 'Used in a custom resource, error handling is managed by Cloudformation.' },
      { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Used in a custom resource only during deployment.' },
      { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Used in a custom resource only during deployment.' },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Event handler lambda resources unknown at deployment, used for deployment only'
      },
    ], true);

    NagSuppressions.addResourceSuppressions(isCompleteHandlerRole, [
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and its custom resource.' },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and its custom resource.' },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Event handler lambda resources unknown at deployment, used for deployment only',
        appliesTo: ['Resource::*']
      },
    ], true);

    NagSuppressions.addResourceSuppressions(provider, [
      { id: 'AwsSolutions-IAM4', reason: 'Managed policy provisioned by framework' },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Event handler lambda resources unknown at deployment, used for deployment only'
      },
      { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Only run during deployment, concurrency does not fit the scenario.' },
      { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Only run during deployment, concurrency does not fit the scenario.' },
      { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Used in a custom resource, error handling is managed by Cloudformation.' },
      { id: 'HIPAA.Security-LambdaDLQ', reason: 'Used in a custom resource, error handling is managed by Cloudformation.' },
      { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Used in a custom resource only during deployment.' },
      { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Used in a custom resource only during deployment.' },
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and its custom resource.' },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and its custom resource.' },
      { id: 'HIPAA.Security-CloudWatchLogGroupEncrypted', reason: 'Loggroup data is always encrypted in CloudWatch Logs'},
      { id: 'NIST.800.53.R5-CloudWatchLogGroupEncrypted', reason: 'Loggroup data is always encrypted in CloudWatch Logs'},
      { id: 'AwsSolutions-SF1', reason: 'Function is used as Cfn Custom Resource only during deployment time.'},
      { id: 'AwsSolutions-SF2', reason: 'Function is used as Cfn Custom Resource only during deployment time.'}
    ], true)

    NagSuppressions.addResourceSuppressions(executionRole, [
      { id: 'AwsSolutions-IAM4', reason: 'Role only used during deployment' },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Role only used during deployment and bucket resource unknown at deployment',
      },
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and its custom resource.' },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and its custom resource.' }
    ], true)

    NagSuppressions.addResourceSuppressions(build, [
      { id: 'AwsSolutions-IAM4', reason: 'Managed policy provisioned by framework' },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Event handler lambda resources unknown at deployment, used for deployment only',
        appliesTo: ['Resource::*']
      },
      { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Only run during deployment, concurrency does not fit the scenario.' },
      { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Only run during deployment, concurrency does not fit the scenario.' },
      { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Used in a custom resource, error handling is managed by Cloudformation.' },
      { id: 'HIPAA.Security-LambdaDLQ', reason: 'Used in a custom resource, error handling is managed by Cloudformation.' },
      { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Used in a custom resource only during deployment.' },
      { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Used in a custom resource only during deployment.' },
      { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and its custom resource.' },
      { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and its custom resource.' }
    ], true)

    this.model = model;
    this.endpoint = endpoint;
  }
}

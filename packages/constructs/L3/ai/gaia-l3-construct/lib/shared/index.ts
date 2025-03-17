import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import * as path from "path";
import { Layer } from "../layer";
import { SystemConfig } from "./types";
import {MdaaKmsKey} from "@aws-mdaa/kms-constructs";
import {MdaaL3ConstructProps} from "@aws-mdaa/l3-construct";
import {MdaaRole} from "@aws-mdaa/iam-constructs";
import {Effect, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {MdaaLambdaFunction} from "@aws-mdaa/lambda-constructs";
import {NagSuppressions} from "cdk-nag";
import * as iam from "aws-cdk-lib/aws-iam";

const pythonRuntime = lambda.Runtime.PYTHON_3_11;
const lambdaArchitecture = lambda.Architecture.X86_64;
process.env.DOCKER_DEFAULT_PLATFORM = lambdaArchitecture.dockerPlatform;

export interface GAIASharedL3ConstructProps extends MdaaL3ConstructProps {
  readonly config: SystemConfig;
  encryptionKey: MdaaKmsKey;
}

export class Shared extends Construct {
  readonly vpc: ec2.IVpc;
  readonly appSubnets: ec2.ISubnet[];
  readonly appSecurityGroup: ec2.ISecurityGroup;
  readonly dataSubnets: ec2.ISubnet[];
  readonly dataSecurityGroup: ec2.ISecurityGroup;
  readonly defaultEnvironmentVariables: Record<string, string>;
  readonly configParameter: ssm.StringParameter;
  readonly pythonRuntime: lambda.Runtime = pythonRuntime;
  readonly lambdaArchitecture: lambda.Architecture = lambdaArchitecture;
  readonly xOriginVerifySecret: secretsmanager.Secret;
  readonly apiKeysSecret: secretsmanager.Secret;
  readonly commonLayer: lambda.ILayerVersion;
  readonly powerToolsLayer: lambda.ILayerVersion;
  readonly pythonSDKLayer: lambda.ILayerVersion;

  constructor(scope: Construct, id: string, props: GAIASharedL3ConstructProps) {
    super(scope, id);

    const powerToolsLayerVersion = "46";
    this.defaultEnvironmentVariables = {
      POWERTOOLS_DEV: props.config.powertoolsDevLogging === undefined ? "true" : props.config.powertoolsDevLogging,
      LOG_LEVEL: "INFO",
      POWERTOOLS_LOGGER_LOG_EVENT: "true",
      POWERTOOLS_SERVICE_NAME: "chatbot",
    };

    const vpc: ec2.IVpc = ec2.Vpc.fromVpcAttributes(this, "VPC", {
      vpcId: props.config.vpc.vpcId,
      availabilityZones: [""]
    })

    this.appSubnets = props.config.vpc.appSubnets.map(appSubnetId => {
      return ec2.Subnet.fromSubnetAttributes(this,`subnet-${appSubnetId}`,{
        subnetId: appSubnetId
      })
    })

    this.appSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
        this, 'DefaultAppSecurityGroup', props.config.vpc.appSecurityGroupId)


    this.dataSubnets = props.config.vpc.dataSubnets.map(dataSubnetId => {
      return ec2.Subnet.fromSubnetAttributes(this,`subnet-${dataSubnetId}`,{
        subnetId: dataSubnetId
      })
    })

    this.dataSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
        this, 'DefaultDataSecurityGroup', props.config.vpc.dataSecurityGroupId)

    const configParameter = new ssm.StringParameter(this, "Config", {
      stringValue: JSON.stringify(props.config),
    });

    const powerToolsArn =
      lambdaArchitecture === lambda.Architecture.X86_64
        ? `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:017000801446:layer:AWSLambdaPowertoolsPythonV2:${powerToolsLayerVersion}`
        : `arn:${cdk.Aws.PARTITION}:lambda:${cdk.Aws.REGION}:017000801446:layer:AWSLambdaPowertoolsPythonV2-Arm64:${powerToolsLayerVersion}`;

    const powerToolsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "PowertoolsLayer",
      powerToolsArn
    )

    const commonLayerPath = props.config?.codeOverwrites?.commonLibsLayerCodeZipPath !== undefined ?
        props.config.codeOverwrites.commonLibsLayerCodeZipPath : path.join(__dirname, "./layers/common")

    const commonLayer = new Layer(this, "CommonLayer", {
      runtime: pythonRuntime,
      architecture: lambdaArchitecture,
      path: commonLayerPath,
    });

    const pythonSDKLayerPath = props.config?.codeOverwrites?.genAiCoreLayerCodePath !== undefined ?
        props.config.codeOverwrites.genAiCoreLayerCodePath : path.join(__dirname, "./layers/python-sdk")

    const pythonSDKLayer = new lambda.LayerVersion(this, "PythonSDKLayer", {
      code: lambda.Code.fromAsset(pythonSDKLayerPath),
      compatibleRuntimes: [pythonRuntime],
      compatibleArchitectures: [lambdaArchitecture],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const secretRotationLambdaRole = new MdaaRole(this, 'SecretsRotationLambdaRole', {
      roleName:  'GAIASecretsRotationLambdaRole',
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      naming: props.naming,
      createOutputs: false,
      createParams: false
    })
    secretRotationLambdaRole.addToPolicy(new iam.PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DeleteNetworkInterface'
      ],
      resources: ["*"]
    }))

    const secretRotationLambda = new MdaaLambdaFunction(this, "SecretRotationLambda", {
      functionName: "GAIASecretsRotationLambdaHandler",
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      role: secretRotationLambdaRole,
      code: lambda.Code.fromAsset(
          path.join(__dirname, "./secrets-rotation-function")
      ),
      handler: "index.handler",
      runtime: pythonRuntime,
      architecture: lambdaArchitecture,
      timeout: cdk.Duration.minutes(10),
      memorySize: 512,
      tracing: lambda.Tracing.ACTIVE,
      layers: [commonLayer.layer],
      vpc: vpc,
      securityGroups: [ this.appSecurityGroup ],
      vpcSubnets: { subnets: this.appSubnets }
    });

    NagSuppressions.addResourceSuppressions(
        secretRotationLambda,
        [
          {
            id: "NIST.800.53.R5-LambdaDLQ",
            reason:
                "Function is for Secrets Manager rotation and error handling will be handled by Secrets Manager.",
          },
          {
            id: "NIST.800.53.R5-LambdaConcurrency",
            reason:
                "Function is for Secrets Manager rotation and will only execute once a month. Reserved concurrency not appropriate.",
          },
          {
            id: "HIPAA.Security-LambdaDLQ",
            reason:
                "Function is for Secrets Manager rotation and error handling will be handled by Secrets Manager.",
          },
          {
            id: "HIPAA.Security-LambdaConcurrency",
            reason:
                "Function is for Secrets Manager rotation and will only execute once a month. Reserved concurrency not appropriate.",
          },
          {
            id: "PCI.DSS.321-LambdaDLQ",
            reason:
                "Function is for Secrets Manager rotation and error handling will be handled by Secrets Manager.",
          },
          {
            id: "PCI.DSS.321-LambdaConcurrency",
            reason:
                "Function is for Secrets Manager rotation and will only execute once a month. Reserved concurrency not appropriate.",
          },
        ],
        true
    );

    const xOriginVerifySecret = new secretsmanager.Secret(
      this,
      "X-Origin-Verify-Secret",
      {
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        encryptionKey: props.encryptionKey,
        generateSecretString: {
          excludePunctuation: true,
          generateStringKey: "headerValue",
          secretStringTemplate: "{}",
        },

      }
    );

    xOriginVerifySecret.grantRead(secretRotationLambdaRole);
    xOriginVerifySecret.grantWrite(secretRotationLambdaRole);
    xOriginVerifySecret.addRotationSchedule("XOriginVerifySecretRotationSchedule", {
      rotationLambda: secretRotationLambda,
      automaticallyAfter: cdk.Duration.days(30),
    })

    new ssm.StringParameter(this, 'XOriginVerifySecretArnSSMParam', {
      parameterName: props.naming.ssmPath('origin/verify/secret/arn'),
      stringValue: xOriginVerifySecret.secretArn
    });


    NagSuppressions.addResourceSuppressions(
        secretRotationLambdaRole,
        [
          {
            id: "AwsSolutions-IAM5",
            reason: "Secret resource not known ahead of time, role is for a secret rotation lambda managed by secrets manager",
            appliesTo: ['Resource::*']
          },
          {
            id: "AwsSolutions-IAM5",
            reason: "Network interfaces to be created are unknown",
            appliesTo: ['Resource::arn:<AWS::Partition>:ec2:<AWS::Region>:<AWS::AccountId>:network-interface/*']
          },
          { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and function.' },
          { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and function.' },
          { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy is specific to this role and function.' }
        ],
        true
    );

    // Placeholder secret for 3RD Party LLM API Keys
    const apiKeysSecret = new secretsmanager.Secret(this, "3rdPartyApiKeysSecret", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      encryptionKey: props.encryptionKey,
      secretObjectValue: {},
    });

    NagSuppressions.addResourceSuppressions( apiKeysSecret, [
      { id: "AwsSolutions-SMG4", reason: "Key entry is managed via the console and ties to 3rd party api keys, no support for automatic rotation" },
      { id: "NIST.800.53.R5-SecretsManagerRotationEnabled", reason: "Key entry is managed via the console and ties to 3rd party api keys, no support for automatic rotation" },
      { id: "HIPAA.Security-SecretsManagerRotationEnabled", reason: "Key entry is managed via the console and ties to 3rd party api keys, no support for automatic rotation"} ,
      { id: "PCI.DSS.321-SecretsManagerRotationEnabled", reason: "Key entry is managed via the console and ties to 3rd party api keys, no support for automatic rotation"} ,
    ], true );

    this.vpc = vpc;
    this.configParameter = configParameter;
    this.xOriginVerifySecret = xOriginVerifySecret;
    this.apiKeysSecret = apiKeysSecret;
    this.powerToolsLayer = powerToolsLayer;
    this.commonLayer = commonLayer.layer;
    this.pythonSDKLayer = pythonSDKLayer;

    new cdk.CfnOutput(this, "ApiKeysSecretName", {
      value: apiKeysSecret.secretName,
    });
  }
}

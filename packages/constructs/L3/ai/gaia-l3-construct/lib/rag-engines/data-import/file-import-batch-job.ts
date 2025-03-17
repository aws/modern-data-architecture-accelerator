import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { SystemConfig } from "../../shared/types";
import { Shared } from "../../shared";
import { RagDynamoDBTables } from "../rag-dynamodb-tables";
import * as batch from "aws-cdk-lib/aws-batch";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as aws_ecr_assets from "aws-cdk-lib/aws-ecr-assets";
import * as iam from "aws-cdk-lib/aws-iam";
import * as rds from "aws-cdk-lib/aws-rds";
import {MdaaRole} from "@aws-mdaa/iam-constructs";
import {MdaaL3Construct, MdaaL3ConstructProps} from "@aws-mdaa/l3-construct";
import {NagSuppressions} from "cdk-nag";
import {MdaaKmsKey} from "@aws-mdaa/kms-constructs";
import * as path from "node:path";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export interface FileImportBatchJobProps extends MdaaL3ConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  readonly uploadBucket: s3.Bucket;
  readonly processingBucket: s3.Bucket;
  readonly ragDynamoDBTables: RagDynamoDBTables;
  readonly auroraDatabase?: rds.DatabaseCluster;
  encryptionKey: MdaaKmsKey
}

export class FileImportBatchJob extends MdaaL3Construct {
  public readonly jobQueue: batch.JobQueue;
  public readonly fileImportJob: batch.EcsJobDefinition;

  constructor(scope: Construct, id: string, props: FileImportBatchJobProps) {
    super(scope, id, props);
    
    const launchTemplate = new ec2.LaunchTemplate(
      this,
      "LaunchTemplate",
      {
        requireImdsv2: true
      }
    );
    const computeEnvironment = new batch.ManagedEc2EcsComputeEnvironment(
      this,
      "ManagedEc2EcsComputeEnvironment",
      {
        vpc: props.shared.vpc,
        vpcSubnets: { subnets: props.shared.appSubnets, },
        allocationStrategy: batch.AllocationStrategy.BEST_FIT_PROGRESSIVE,
        instanceTypes: [new ec2.InstanceType("c5.xlarge")],
        maxvCpus: 4,
        minvCpus: 0,
        replaceComputeEnvironment: true,
        updateTimeout: cdk.Duration.minutes(30),
        updateToLatestImageVersion: true,
        launchTemplate: launchTemplate
      }
    );

    const jobQueue = new batch.JobQueue(this, "JobQueue", {
      computeEnvironments: [
        {
          computeEnvironment,
          order: 1,
        },
      ],
      priority: 1,
    });

    const fileImportJobRole = new MdaaRole(this, "FileImportJobRole", {
      naming: props.naming,
      roleName:  "FileImportJobRole",
      createParams: true,
      createOutputs: false,
      assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
      ]
    });

    let dockerFileDirectory = `${ __dirname }/../../shared`
    let dockerFileName = "file-import-dockerfile"

    if (props.config.codeOverwrites?.fileImportBatchJobDockerFilePath) {
        dockerFileDirectory = path.dirname(props.config.codeOverwrites.fileImportBatchJobDockerFilePath)
        dockerFileName = path.basename(props.config.codeOverwrites.fileImportBatchJobDockerFilePath)
    }

    const imageAsset = new aws_ecr_assets.DockerImageAsset( this, 'file-import-image', {
      directory: dockerFileDirectory,
      file: dockerFileName,
      platform: aws_ecr_assets.Platform.LINUX_AMD64,
    } )
    
    const linuxParameters = new batch.LinuxParameters(this, "FileImportLinuxParams", {});
    linuxParameters.addTmpfs(
      {
        size: cdk.Size.gibibytes(10),
        containerPath: "/tmp",
        mountOptions: [batch.TmpfsMountOption.RW]
      }
    );

    const fileImportContainer = new batch.EcsEc2ContainerDefinition(
      this,
      "FileImportContainer",
      {
        cpu: 2,
        memory: cdk.Size.mebibytes(2048),
        image: ecs.ContainerImage.fromDockerImageAsset( imageAsset ),
        jobRole: fileImportJobRole,
        // allow access to /tmp  via in-memory mount
        // as required by this file-import flow
        // while still maintaining readonly file system
        linuxParameters: linuxParameters,
        readonlyRootFilesystem: true,
        user: "worker",
        environment: {
          AWS_DEFAULT_REGION: cdk.Stack.of(this).region,
          CONFIG_PARAMETER_NAME: props.shared.configParameter.parameterName,
          API_KEYS_SECRETS_ARN: props.shared.apiKeysSecret.secretArn,
          AURORA_DB_SECRET_ID: props.auroraDatabase?.secret
            ?.secretArn as string,
          PROCESSING_BUCKET_NAME: props.processingBucket.bucketName,
          WORKSPACES_TABLE_NAME:
            props.ragDynamoDBTables.workspacesTable.tableName,
          WORKSPACES_BY_OBJECT_TYPE_INDEX_NAME:
            props.ragDynamoDBTables.workspacesByObjectTypeIndexName,
          DOCUMENTS_TABLE_NAME:
            props.ragDynamoDBTables.documentsTable.tableName ?? "",
          DOCUMENTS_BY_COMPOUND_KEY_INDEX_NAME:
            props.ragDynamoDBTables.documentsByCompountKeyIndexName ?? "",
          SAGEMAKER_RAG_MODELS_ENDPOINT: ""
        },
      }
    );

    const fileImportJob = new batch.EcsJobDefinition(this, "FileImportJob", {
      container: fileImportContainer,
      timeout: cdk.Duration.minutes(30),
    });

    props.uploadBucket.grantReadWrite(fileImportJobRole);
    props.processingBucket.grantReadWrite(fileImportJobRole);
    props.encryptionKey.grantEncryptDecrypt(fileImportJobRole);
    props.shared.configParameter.grantRead(fileImportJobRole);
    props.shared.apiKeysSecret.grantRead(fileImportJobRole);
    props.ragDynamoDBTables.workspacesTable.grantReadWriteData(
      fileImportJobRole
    );
    props.ragDynamoDBTables.documentsTable.grantReadWriteData(
      fileImportJobRole
    );

    if (props.auroraDatabase) {
      props.auroraDatabase.secret?.grantRead(fileImportJobRole);
      props.auroraDatabase.connections.allowDefaultPortFrom(computeEnvironment);
    }

    if (props.config.bedrock?.enabled) {
      fileImportJobRole.addToPolicy(
        new iam.PolicyStatement({
          actions: [
            "bedrock:InvokeModel",
            "bedrock:InvokeModelWithResponseStream",
          ],
          resources: ["*"],
          conditions: {
            StringEquals: {
              "aws:RequestedRegion": props.config.bedrock.region
            }
          }
        })
      );

      if (props.config.bedrock?.roleArn) {
        fileImportJobRole.addToPolicy(
          new iam.PolicyStatement({
            actions: ["sts:AssumeRole"],
            resources: [props.config.bedrock.roleArn],
          })
        );
      }
    }

    NagSuppressions.addResourceSuppressions(computeEnvironment, [
        {
            id: 'AwsSolutions-IAM4',
            reason: 'AmazonEC2ContainerServiceforEC2Role is restrictive enough.',
        }
        ], true)

    NagSuppressions.addResourceSuppressions( fileImportJobRole, [
      {
          id: 'AwsSolutions-IAM4',
          reason: 'Cluster unknown at runtime.  Created during deployment and strictly used for AWS Batch job',
      },
      { id: 'AwsSolutions-IAM5', reason: 'AmazonEC2ContainerServiceforEC2Role is restrictive enough.  Resources actions for ECS only support widlcard log group name not known at deployment time.' },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy maintained by MDAA framework.  Wildcard is towards bedrock but service enabled on region level controls are in place.'},
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy maintained by MDAA framework.  Wildcard is towards bedrock but service enabled on region level controls are in place.'},
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy maintained by MDAA framework.  Wildcard is towards bedrock but service enabled on region level controls are in place.'},
    ], true );

    NagSuppressions.addResourceSuppressions(fileImportContainer, [
      {
          id: "AwsSolutions-IAM5",
          reason: 'Log stream generated at deployment time by AWS batch and ecr get authorization only supports * for resource',

      },
    { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.'},
    { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.'},
    { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.'},
    ], true)

    NagSuppressions.addResourceSuppressions(fileImportJob, [
        { id: 'AwsSolutions-IAM5', reason: 'Events handled by upstream dynamodb service, resource unknown at deployment time' },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy managed by MDAA framework.' },
    ], true)

    this.jobQueue = jobQueue;
    this.fileImportJob = fileImportJob;
  }
}

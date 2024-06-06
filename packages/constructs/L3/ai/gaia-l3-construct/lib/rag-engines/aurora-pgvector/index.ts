import {MdaaCustomResource} from "@aws-mdaa/custom-constructs";
import {MdaaRole} from "@aws-mdaa/iam-constructs";
import {MdaaL3Construct, MdaaL3ConstructProps} from "@aws-mdaa/l3-construct";
import {MdaaRdsServerlessCluster, MdaaRdsServerlessClusterProps} from "@aws-mdaa/rds-constructs";
import * as iam from "aws-cdk-lib/aws-iam";
import { Effect, ManagedPolicy, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as rds from "aws-cdk-lib/aws-rds";
import * as sfn from "aws-cdk-lib/aws-stepfunctions";
import {Construct} from "constructs";
import * as path from "path";
import {Shared} from "../../shared";
import {SystemConfig} from "../../shared/types";
import {RagDynamoDBTables} from "../rag-dynamodb-tables";
import {CreateAuroraWorkspace} from "./create-aurora-workspace";
import {NagSuppressions} from "cdk-nag";
import {MdaaKmsKey} from "@aws-mdaa/kms-constructs";

export interface AuroraPgVectorProps extends MdaaL3ConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  readonly ragDynamoDBTables: RagDynamoDBTables;
  encryptionKey: MdaaKmsKey;
}

export class AuroraPgVector extends MdaaL3Construct {
  readonly database: rds.DatabaseCluster;
  public readonly createAuroraWorkspaceWorkflow: sfn.StateMachine;

  constructor(scope: Construct, id: string, props: AuroraPgVectorProps) {
    super(scope, id, props);

    const monitoringRole = new MdaaRole(this, `aurora-postgres-enhanced-monitoring-role`, {
      naming: props.naming,
      roleName: `test-cluster-enhanced-monitoring-role`,
      assumedBy: new ServicePrincipal('monitoring.rds.amazonaws.com'),
      managedPolicies: [
          ManagedPolicy.fromAwsManagedPolicyName(
              'service-role/AmazonRDSEnhancedMonitoringRole',
          ),
      ]

    })

    NagSuppressions.addResourceSuppressions(monitoringRole, [
      {
          id: "AwsSolutions-IAM4",
          reason: "Managed policy used by RDS for monitoring.",
          appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole']
      }
    ], true)

    const databaseProps: MdaaRdsServerlessClusterProps = {
      naming: props.naming,
      createParams: false,
      createOutputs: false,
      engine: "aurora-postgresql",
      engineVersion: rds.AuroraPostgresEngineVersion.VER_15_3,
      backupRetention: 20,
      clusterIdentifier: "test-cluster",
      masterUsername: "postgres",
      encryptionKey: props.encryptionKey,
      monitoringRole,
      vpc: props.shared.vpc,
      vpcSubnets: {subnets:props.shared.dataSubnets},
      port: 15530,
      adminPasswordRotationDays: 60,
      securityGroups: [props.shared.dataSecurityGroup]
    }

    const dbCluster = new MdaaRdsServerlessCluster( this, "aurora-postgres-pgvector", databaseProps )

    const dbSetupResourceCodePath = props.config?.codeOverwrites?.pgVectorDbSetupCodePath !== undefined ?
        props.config.codeOverwrites.pgVectorDbSetupCodePath : path.join(__dirname, "./functions/pgvector-setup")
    const dbSetupResource = new MdaaCustomResource(
      this,
      "DatabaseSetupCustomResource",
      {
          code: lambda.Code.fromAsset(dbSetupResourceCodePath),
          handler: "index.lambda_handler",
          handlerProps: {
              AURORA_DB_SECRET_ID: dbCluster.secret?.secretArn as string
          },
          handlerLayers: [
            props.shared.powerToolsLayer,
            props.shared.commonLayer
          ],
          handlerRolePolicyStatements: [
              new iam.PolicyStatement({
                  actions: [
                      "secretsmanager:GetResourcePolicy",
                      "secretsmanager:GetSecretValue",
                      "secretsmanager:DescribeSecret",
                      "secretsmanager:ListSecretVersionIds"
                  ],
                  resources: [dbCluster.secret?.secretArn as string],
              }),
              new iam.PolicyStatement({
                  actions: [ "kms:Decrypt" ],
                  resources: [props.encryptionKey.keyArn],
              }),
              new iam.PolicyStatement({
                  effect: Effect.ALLOW,
                  actions: [
                      'ec2:CreateNetworkInterface',
                      'ec2:DescribeNetworkInterfaces',
                      'ec2:DeleteNetworkInterface'
                  ],
                  resources: ['*']
              })
          ],
          vpc: props.shared.vpc,
          subnet: {subnets:props.shared.appSubnets},
          securityGroup: props.shared.appSecurityGroup,
          naming: props.naming,
          createParams: false,
          createOutputs: false,
          resourceType: "DatabaseSetupFunction",
          runtime: props.shared.pythonRuntime,
        }
      );
    NagSuppressions.addResourceSuppressions( dbSetupResource, [
      { id: 'AwsSolutions-L1', reason: 'Only run during deployment.' },
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
    ], true );
    dbSetupResource.node.addDependency(dbCluster)
    dbCluster.grantConnect(dbSetupResource.handlerFunction, 'postgres')

    const createWorkflow = new CreateAuroraWorkspace(
      this,
      "CreateAuroraWorkspace",
      {
          ...props,
        config: props.config,
        shared: props.shared,
        dbCluster,
        ragDynamoDBTables: props.ragDynamoDBTables,
      }
    );

    this.database = dbCluster;
    this.createAuroraWorkspaceWorkflow = createWorkflow.stateMachine;
  }
}

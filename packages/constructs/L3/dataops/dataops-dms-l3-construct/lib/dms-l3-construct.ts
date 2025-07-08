/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DocDbSettingsProperty,
  DynamoDbSettingsProperty,
  ElasticsearchSettingsProperty,
  IbmDb2SettingsProperty,
  KinesisSettingsProperty,
  MdaaEndpoint,
  MdaaEndpointEngine,
  MdaaEndpointProps,
  MdaaEndpointType,
  MdaaReplicationInstance,
  MdaaReplicationInstanceProps,
  MicrosoftSqlServerSettingsProperty,
  MongoDbSettingsProperty,
  MySqlSettingsProperty,
  NeptuneSettingsProperty,
  OracleSettingsProperty,
  PostgreSqlSettingsProperty,
  RedshiftSettingsProperty,
  S3SettingsProperty,
  SybaseSettingsProperty,
} from '@aws-mdaa/dms-constructs';
import { MdaaSecurityGroup, MdaaSecurityGroupProps, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import {
  CfnEndpoint,
  CfnReplicationInstance,
  CfnReplicationSubnetGroup,
  CfnReplicationSubnetGroupProps,
  CfnReplicationTask,
  CfnReplicationTaskProps,
} from 'aws-cdk-lib/aws-dms';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, IRole, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { Bucket, IBucket } from 'aws-cdk-lib/aws-s3';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { MdaaNagSuppressions } from '@aws-mdaa/construct';
import { SuppressionProps } from '@aws-mdaa/roles-l3-construct';

export interface EndpointProps {
  /**
   * The type of Endpoint ("source" or "target")
   */
  readonly endpointType: MdaaEndpointType;
  /**
   * The name of the endpoint engine
   */
  readonly engineName: MdaaEndpointEngine;
  /**
   * The optional name of the endpoint database. Required for certain endpoint types.
   */
  readonly databaseName?: string;
  /**
   * Settings in JSON format for the source and target DocumentDB endpoint.
   *
   * For more information about other available settings, see [Using extra connections attributes with Amazon DocumentDB as a source](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.DocumentDB.html#CHAP_Source.DocumentDB.ECAs) and [Using Amazon DocumentDB as a target for AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DocumentDB.html) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-docdbsettings
   */
  readonly docDbSettings?: DocDbSettingsProperty;
  /**
   * Settings in JSON format for the target Amazon DynamoDB endpoint.
   *
   * For information about other available settings, see [Using object mapping to migrate data to DynamoDB](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DynamoDB.html#CHAP_Target.DynamoDB.ObjectMapping) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-dynamodbsettings
   */
  readonly dynamoDbSettings?: DynamoDbSettingsProperty;
  /**
   * Settings in JSON format for the target OpenSearch endpoint.
   *
   * For more information about the available settings, see [Extra connection attributes when using OpenSearch as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Elasticsearch.html#CHAP_Target.Elasticsearch.Configuration) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-elasticsearchsettings
   */
  readonly elasticsearchSettings?: ElasticsearchSettingsProperty;

  /**
   * Settings in JSON format for the source IBM Db2 LUW endpoint.
   *
   * For information about other available settings, see [Extra connection attributes when using Db2 LUW as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.DB2.html#CHAP_Source.DB2.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-ibmdb2settings
   */
  readonly ibmDb2Settings?: IbmDb2SettingsProperty;
  /**
   * Settings in JSON format for the target endpoint for Amazon Kinesis Data Streams.
   *
   * For more information about other available settings, see [Using object mapping to migrate data to a Kinesis data stream](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Kinesis.html#CHAP_Target.Kinesis.ObjectMapping) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-kinesissettings
   */
  readonly kinesisSettings?: KinesisSettingsProperty;

  /**
   * Settings in JSON format for the source and target Microsoft SQL Server endpoint.
   *
   * For information about other available settings, see [Extra connection attributes when using SQL Server as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.SQLServer.html#CHAP_Source.SQLServer.ConnectionAttrib) and [Extra connection attributes when using SQL Server as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.SQLServer.html#CHAP_Target.SQLServer.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-microsoftsqlserversettings
   */
  readonly microsoftSqlServerSettings?: MicrosoftSqlServerSettingsProperty;
  /**
   * Settings in JSON format for the source MongoDB endpoint.
   *
   * For more information about the available settings, see [Using MongoDB as a target for AWS Database Migration Service](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MongoDB.html#CHAP_Source.MongoDB.Configuration) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-mongodbsettings
   */
  readonly mongoDbSettings?: MongoDbSettingsProperty;
  /**
   * Settings in JSON format for the source and target MySQL endpoint.
   *
   * For information about other available settings, see [Extra connection attributes when using MySQL as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MySQL.html#CHAP_Source.MySQL.ConnectionAttrib) and [Extra connection attributes when using a MySQL-compatible database as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.MySQL.html#CHAP_Target.MySQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-mysqlsettings
   */
  readonly mySqlSettings?: MySqlSettingsProperty;
  /**
   * Settings in JSON format for the target Amazon Neptune endpoint.
   *
   * For more information about the available settings, see [Specifying endpoint settings for Amazon Neptune as a target](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Neptune.html#CHAP_Target.Neptune.EndpointSettings) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-neptunesettings
   */
  readonly neptuneSettings?: NeptuneSettingsProperty;
  /**
   * Settings in JSON format for the source and target Oracle endpoint.
   *
   * For information about other available settings, see [Extra connection attributes when using Oracle as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.Oracle.html#CHAP_Source.Oracle.ConnectionAttrib) and [Extra connection attributes when using Oracle as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Oracle.html#CHAP_Target.Oracle.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-oraclesettings
   */
  readonly oracleSettings?: OracleSettingsProperty;

  /**
   * Settings in JSON format for the source and target PostgreSQL endpoint.
   *
   * For information about other available settings, see [Extra connection attributes when using PostgreSQL as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html#CHAP_Source.PostgreSQL.ConnectionAttrib) and [Extra connection attributes when using PostgreSQL as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.PostgreSQL.html#CHAP_Target.PostgreSQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-postgresqlsettings
   */
  readonly postgreSqlSettings?: PostgreSqlSettingsProperty;
  /**
   * Settings in JSON format for the Amazon Redshift endpoint.
   *
   * For more information about other available settings, see [Extra connection attributes when using Amazon Redshift as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.Redshift.html#CHAP_Target.Redshift.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-redshiftsettings
   */
  readonly redshiftSettings?: RedshiftSettingsProperty;

  /**
   * Settings in JSON format for the source and target Amazon S3 endpoint.
   *
   * For more information about other available settings, see [Extra connection attributes when using Amazon S3 as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.S3.html#CHAP_Source.S3.Configuring) and [Extra connection attributes when using Amazon S3 as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.S3.html#CHAP_Target.S3.Configuring) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-s3settings
   */
  readonly s3Settings?: S3SettingsProperty;

  /**
   * Settings in JSON format for the source and target SAP ASE endpoint.
   *
   * For information about other available settings, see [Extra connection attributes when using SAP ASE as a source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.SAP.html#CHAP_Source.SAP.ConnectionAttrib) and [Extra connection attributes when using SAP ASE as a target for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.SAP.html#CHAP_Target.SAP.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-endpoint.html#cfn-dms-endpoint-sybasesettings
   */
  readonly sybaseSettings?: SybaseSettingsProperty;
}

export interface NamedEndpointProps {
  /**
   * @jsii ignore
   */
  [instanceName: string]: EndpointProps;
}

export interface ReplicationInstanceProps {
  /**
   * The compute class of the replication instance.
   * For supported types, see https://docs.aws.amazon.com/dms/latest/userguide/CHAP_ReplicationInstance.Types.html
   */
  readonly instanceClass: string;
  /**
   * List of subnet ids on which the replication instance will be deployed.
   * This list must span at least two Azs
   */
  readonly subnetIds: string[];
  /**
   * The VPC on which the replication instance will be deployed.
   */
  readonly vpcId: string;
  /**
   * List of ingress rules to be added to the function SG
   */
  readonly ingressRules?: MdaaSecurityGroupRuleProps;
  /**
   * List of egress rules to be added to the function SG
   */
  readonly egressRules?: MdaaSecurityGroupRuleProps;
  /**
   * If true, the SG will allow traffic to and from itself
   */
  readonly addSelfReferenceRule?: boolean;
}

export interface NamedReplicationInstanceProps {
  /**
   * @jsii ignore
   */
  [instanceName: string]: ReplicationInstanceProps;
}

export type DmsMigrationType = `full-load` | `cdc` | `full-load-and-cdc`;

export interface ReplicationTaskProps {
  /**
   * The name of the replication instance from the 'replicationInstances' section.
   */
  readonly replicationInstance: string;

  /**
   * The name of the source endpoint from the 'endpoints' section of this config
   *
   */
  readonly sourceEndpoint: string;

  /**
   * The name of the target endpoint from the 'endpoints' section of this config
   */
  readonly targetEndpoint: string;

  /**
   * Indicates when you want a change data capture (CDC) operation to start.
   *
   * Use either `CdcStartPosition` or `CdcStartTime` to specify when you want a CDC operation to start. Specifying both values results in an error.
   *
   * The value can be in date, checkpoint, log sequence number (LSN), or system change number (SCN) format.
   *
   * Here is a date example: `--cdc-start-position "2018-03-08T12:12:12"`
   *
   * Here is a checkpoint example: `--cdc-start-position "checkpoint:V1#27#mysql-bin-changelog.157832:1975:-1:2002:677883278264080:mysql-bin-changelog.157832:1876#0#0#*#0#93"`
   *
   * Here is an LSN example: `--cdc-start-position “mysql-bin-changelog.000024:373”`
   *
   * > When you use this task setting with a source PostgreSQL database, a logical replication slot should already be created and associated with the source endpoint. You can verify this by setting the `slotName` extra connection attribute to the name of this logical replication slot. For more information, see [Extra Connection Attributes When Using PostgreSQL as a Source for AWS DMS](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.PostgreSQL.html#CHAP_Source.PostgreSQL.ConnectionAttrib) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationtask.html#cfn-dms-replicationtask-cdcstartposition
   */
  readonly cdcStartPosition?: string;
  /**
   * Indicates the start time for a change data capture (CDC) operation.
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationtask.html#cfn-dms-replicationtask-cdcstarttime
   */
  readonly cdcStartTime?: number;
  /**
   * Indicates when you want a change data capture (CDC) operation to stop.
   *
   * The value can be either server time or commit time.
   *
   * Here is a server time example: `--cdc-stop-position "server_time:2018-02-09T12:12:12"`
   *
   * Here is a commit time example: `--cdc-stop-position "commit_time: 2018-02-09T12:12:12"`
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationtask.html#cfn-dms-replicationtask-cdcstopposition
   */
  readonly cdcStopPosition?: string;
  /**
   * The migration type.
   *
   * Valid values: `full-load` | `cdc` | `full-load-and-cdc`
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationtask.html#cfn-dms-replicationtask-migrationtype
   */
  readonly migrationType: DmsMigrationType;

  /**
   * The table mappings for the task, in JSON format.
   *
   * For more information, see [Using Table Mapping to Specify Task Settings](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.html) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationtask.html#cfn-dms-replicationtask-tablemappings
   */
  readonly tableMappings: { [key: string]: unknown };

  /**
   * Supplemental information that the task requires to migrate the data for certain source and target endpoints.
   *
   * For more information, see [Specifying Supplemental Data for Task Settings](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.TaskData.html) in the *AWS Database Migration Service User Guide.*
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationtask.html#cfn-dms-replicationtask-taskdata
   */
  readonly taskData?: { [key: string]: unknown };
  /**
   * Overall settings for the task, in JSON format.
   *
   * For more information, see [Specifying Task Settings for AWS Database Migration Service Tasks](https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.html) in the *AWS Database Migration Service User Guide* .
   *
   * @see http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-dms-replicationtask.html#cfn-dms-replicationtask-replicationtasksettings
   */
  readonly replicationTaskSettings?: { [key: string]: unknown };
}

export interface NamedReplicationTaskProps {
  /**
   * @jsii ignore
   */
  [taskName: string]: ReplicationTaskProps;
}

export interface DMSProps {
  readonly dmsRoleArn?: string;
  readonly createDmsVpcRole?: boolean;
  readonly replicationInstances?: NamedReplicationInstanceProps;
  readonly endpoints?: NamedEndpointProps;
  readonly replicationTasks?: NamedReplicationTaskProps;
}

export interface DMSL3ConstructProps extends MdaaL3ConstructProps {
  // Name of the Data-Ops project.
  readonly projectName: string;
  /**
   * The name of the Data Ops project bucket which will be used as temporary storage for DMS jobs
   */
  readonly projectBucket: string;
  /**
   * Arn of KMS key which will be used to encrypt the cluster resources
   */
  readonly kmsArn: string;
  readonly dms: DMSProps;
}

export class DMSL3Construct extends MdaaL3Construct {
  private static readonly engineToSettingsNameMap: { [engineName in MdaaEndpointEngine]: string | undefined } = {
    mysql: 'mySqlSettings',
    oracle: 'oracleSettings',
    postgres: 'postgreSqlSettings',
    mariadb: 'mySqlSettings',
    aurora: 'mySqlSettings',
    'aurora-postgresql': 'postgreSqlSettings',
    opensearch: undefined,
    redshift: 'redshiftSettings',
    'redshift-serverless': '',
    s3: 's3Settings',
    db2: 'ibmDb2Settings',
    azuredb: undefined,
    sybase: 'sybaseSettings',
    dynamodb: 'dynamoDbSettings',
    mongodb: 'mongoDbSettings',
    kinesis: 'kinesisSettings',
    kafka: undefined,
    elasticsearch: 'elasticsearchSettings',
    docdb: 'docDbSettings',
    sqlserver: 'microsoftSqlServerSettings',
    neptune: 'neptuneSettings',
  };

  private static readonly awsServiceEngineNames: MdaaEndpointEngine[] = [
    's3',
    'dynamodb',
    'kinesis',
    'docdb',
    'neptune',
  ];

  protected readonly props: DMSL3ConstructProps;
  protected readonly projectKms: IKey;
  protected readonly projectBucket: IBucket;

  constructor(scope: Construct, id: string, props: DMSL3ConstructProps) {
    super(scope, id, props);
    this.props = props;
    this.projectKms = Key.fromKeyArn(this.scope, 'project-kms', this.props.kmsArn);
    this.projectBucket = Bucket.fromBucketName(this.scope, `project-bucket`, this.props.projectBucket);
    const dmsRole = props.dms.dmsRoleArn
      ? Role.fromRoleArn(this, 'dms-role', props.dms.dmsRoleArn)
      : this.createDmsRole();
    // if user explicitly wants to create the dms-vpc-role
    if (props.dms.createDmsVpcRole === true) {
      this.createDmsVpcRole();
    }
    const replicationInstances = this.createReplicationInstances();
    const endpoints = this.createEndpoints(dmsRole);
    this.createReplicationTasks(replicationInstances, endpoints);
  }

  private createReplicationTasks(
    replicationInstances: { [name: string]: CfnReplicationInstance },
    endpoints: { [name: string]: CfnEndpoint },
  ) {
    Object.entries(this.props.dms.replicationTasks || {}).forEach(([taskName, taskProps]) => {
      const replicationInstanceArn = taskProps.replicationInstance
        ? replicationInstances[taskProps.replicationInstance]?.ref
        : undefined;
      if (!replicationInstanceArn) {
        throw new Error(`Unable to determine replication instance Arn from config ${taskProps.replicationInstance}.`);
      }
      const sourceEndpointArn = endpoints[taskProps.sourceEndpoint]?.ref;
      if (!sourceEndpointArn) {
        throw new Error(`Unable to determine source endpoint Arn from config ${taskProps.sourceEndpoint}.`);
      }
      const targetEndpointArn = endpoints[taskProps.targetEndpoint]?.ref;
      if (!targetEndpointArn) {
        throw new Error(`Unable to determine target endpoint Arn from config ${taskProps.targetEndpoint}.`);
      }
      const cfnTaskProps: CfnReplicationTaskProps = {
        ...taskProps,
        replicationInstanceArn: replicationInstanceArn,
        sourceEndpointArn: sourceEndpointArn,
        targetEndpointArn: targetEndpointArn,
        replicationTaskIdentifier: this.props.naming.resourceName(taskName),
        taskData: taskProps.taskData ? JSON.stringify(taskProps.taskData) : undefined,
        tableMappings: JSON.stringify(taskProps.tableMappings),
        replicationTaskSettings: taskProps.replicationTaskSettings
          ? JSON.stringify(taskProps.replicationTaskSettings)
          : undefined,
      };
      new CfnReplicationTask(this, `replication-task-${taskName}`, cfnTaskProps);
    });
  }

  private createDmsRole(): IRole {
    return new MdaaRole(this, 'dms-role', {
      naming: this.props.naming,
      roleName: 'dms',
      assumedBy: new ServicePrincipal(`dms.${this.region}.amazonaws.com`),
    });
  }

  private createDmsVpcRole(): IRole {
    const role = new MdaaRole(this, 'dms-vpc-role', {
      naming: this.props.naming,
      roleName: 'dms-vpc-role',
      verbatimRoleName: true,
      assumedBy: new ServicePrincipal('dms.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonDMSVPCManagementRole')],
    });
    const suppressions: SuppressionProps[] = [
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'AmazonDMSVPCManagementRole has explicit actions but requires wildcard resource so all VPCs would be covered by all DMS that use this role. See: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_DMS_migration-IAM.dms-vpc-role.html',
      },
    ];
    MdaaNagSuppressions.addConfigResourceSuppressions(role, suppressions, true);
    return role;
  }

  private createEndpoints(dmsRole: IRole): { [name: string]: CfnEndpoint } {
    const secrets: ISecret[] = [];
    const secretKeys: IKey[] = [];
    const endpoints = Object.fromEntries(
      Object.entries(this.props.dms.endpoints || {}).map(([endpointName, endpointProps]) => {
        const engineSettingsPropName = DMSL3Construct.engineToSettingsNameMap[
          endpointProps.engineName
        ] as keyof EndpointProps;
        const engineSettingsProp = endpointProps[engineSettingsPropName];
        if (!engineSettingsProp) {
          throw new Error(`${engineSettingsPropName} must be defined for engineName ${endpointProps.engineName}`);
        }

        if (DMSL3Construct.awsServiceEngineNames.includes(endpointProps.engineName)) {
          // @ts-ignore need to figure out what type is engineSettingsProps
          engineSettingsProp['serviceAccessRoleArn'] = dmsRole.roleArn;
        }

        Object.entries(endpointProps).forEach(([, prop]) => {
          if (!prop || typeof prop !== 'object') {
            console.log(`Strange, was expecting ${prop} to be an object`);
            return;
          }
          if ('secretsManagerSecretArn' in prop && prop.secretsManagerAccessRoleArn === undefined) {
            const secretArn = prop['secretsManagerSecretArn'];
            prop.secretsManagerAccessRoleArn = dmsRole.roleArn;
            prop['secretsManagerSecretId'] = secretArn;
            secrets.push(Secret.fromSecretCompleteArn(this, `secret-import-${endpointName}`, secretArn));
            const secretKeyKMSArn = prop['secretsManagerSecretKMSArn'];
            if (secretKeyKMSArn) {
              secretKeys.push(Key.fromKeyArn(this, `secret-key-import-${endpointName}`, secretKeyKMSArn));
            }
          }

          if ('secretsManagerOracleAsmSecretArn' in prop && prop.secretsManagerOracleAsmAccessRoleArn === undefined) {
            const secretArn = prop['secretsManagerOracleAsmSecretArn'];
            prop['secretsManagerOracleAsmSecretId'] = secretArn;
            prop['secretsManagerOracleAsmAccessRoleArn'] = dmsRole.roleArn;
            secrets.push(Secret.fromSecretCompleteArn(this, `asm-secret-import-${endpointName}`, secretArn));
          }
        });

        const mdaaEndpointProps: MdaaEndpointProps = {
          ...endpointProps,
          endpointIdentifier: endpointName,
          kmsKey: this.projectKms,
          naming: this.props.naming,
        };
        const endpoint = new MdaaEndpoint(this, `endpoint-${endpointName}`, mdaaEndpointProps);
        return [endpointName, endpoint];
      }),
    );

    this.createSecretsAccessPolicy(dmsRole, secrets, secretKeys);

    return endpoints;
  }

  private createSecretsAccessPolicy(dmsRole: IRole, secrets: ISecret[], secretKeys: IKey[]) {
    if (secrets.length > 0) {
      const secretsStatement = new PolicyStatement({
        actions: ['secretsmanager:DescribeSecret', 'secretsmanager:GetSecretValue'],
        resources: secrets.map(x => x.secretArn),
        effect: Effect.ALLOW,
      });

      const secretKMSStatement =
        secretKeys.length > 0
          ? [
              new PolicyStatement({
                actions: ['kms:Decrypt', 'kms:DescribeKey'],
                resources: secretKeys.map(x => x.keyArn),
                effect: Effect.ALLOW,
              }),
            ]
          : [];

      new MdaaManagedPolicy(this, 'secrets-access-policy', {
        managedPolicyName: 'secrets-access',
        naming: this.props.naming,
        roles: [dmsRole],
        statements: [secretsStatement, ...secretKMSStatement],
      });
    }
  }

  private createReplicationInstances(): { [name: string]: CfnReplicationInstance } {
    return Object.fromEntries(
      Object.entries(this.props.dms.replicationInstances || {}).map(([instanceName, instanceProps]) => {
        const subnetGroupProps: CfnReplicationSubnetGroupProps = {
          replicationSubnetGroupIdentifier: this.props.naming.resourceName(instanceName),
          replicationSubnetGroupDescription: this.props.naming.resourceName(instanceName),
          subnetIds: instanceProps.subnetIds,
        };
        const subnetGroup = new CfnReplicationSubnetGroup(
          this,
          `replication-subnet-group-${instanceName}`,
          subnetGroupProps,
        );

        const vpc = Vpc.fromVpcAttributes(this, 'vpc of' + instanceName, {
          availabilityZones: ['dummy'],
          vpcId: instanceProps.vpcId,
        });

        const customEgress: boolean =
          (instanceProps.egressRules?.ipv4 && instanceProps.egressRules?.ipv4.length > 0) ||
          (instanceProps.egressRules?.prefixList && instanceProps.egressRules?.prefixList.length > 0) ||
          (instanceProps.egressRules?.sg && instanceProps.egressRules?.sg.length > 0) ||
          false;

        const securityGroupCreateProps: MdaaSecurityGroupProps = {
          securityGroupName: instanceName,
          vpc: vpc,
          naming: this.props.naming,
          ingressRules: instanceProps.ingressRules,
          egressRules: instanceProps.egressRules,
          allowAllOutbound: !customEgress,
          addSelfReferenceRule: instanceProps.addSelfReferenceRule,
        };

        const securityGroup = new MdaaSecurityGroup(this, `security-group-${instanceName}`, securityGroupCreateProps);

        const constructProps: MdaaReplicationInstanceProps = {
          replicationInstanceIdentifier: instanceName,
          replicationInstanceClass: instanceProps.instanceClass,
          kmsKey: this.projectKms,
          replicationSubnetGroupIdentifier: this.props.naming.resourceName(instanceName),
          naming: this.props.naming,
          vpcSecurityGroupIds: [securityGroup.securityGroupId],
        };
        const replicationInstance = new MdaaReplicationInstance(
          this,
          `replication-instance-${instanceName}`,
          constructProps,
        );
        replicationInstance.addDependency(subnetGroup);
        return [instanceName, replicationInstance];
      }),
    );
  }
}

import { Construct } from 'constructs';
import { Shared } from '../../shared';
import { SystemConfig } from '../../shared/types';
import { RagDynamoDBTables } from '../rag-dynamodb-tables';
import { CreateKendraWorkspace } from './create-kendra-workspace';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as kendra from 'aws-cdk-lib/aws-kendra';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { NagSuppressions } from 'cdk-nag';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';

export interface KendraRetrievalProps extends MdaaL3ConstructProps {
  readonly config: SystemConfig;
  readonly shared: Shared;
  readonly ragDynamoDBTables: RagDynamoDBTables;
  encryptionKey: MdaaKmsKey;
}

export class KendraRetrieval extends MdaaL3Construct {
  public readonly createKendraWorkspaceWorkflow: sfn.StateMachine;
  public readonly kendraIndex?: kendra.CfnIndex;
  public readonly kendraS3DataSource?: kendra.CfnDataSource;
  public readonly kendraS3DataSourceBucket?: s3.IBucket;

  constructor(scope: Construct, id: string, props: KendraRetrievalProps) {
    super(scope, id, props);

    const createWorkflow = new CreateKendraWorkspace(this, 'CreateKendraWorkspace', {
      ...props,
      config: props.config,
      shared: props.shared,
      ragDynamoDBTables: props.ragDynamoDBTables,
    });

    if (props.config.rag?.engines.kendra?.createIndex) {
      const indexName = props.naming.resourceName('gaiachatbot-workspaces');

      const customDataSource = props.config.rag?.engines.kendra?.s3DataSourceConfig;
      let dataBucket: s3.IBucket;
      if (customDataSource !== undefined) {
        dataBucket = s3.Bucket.fromBucketName(this, 'CustomKedraDataBucket', customDataSource.bucketName);
      } else {
        dataBucket = new MdaaBucket(this, 'KendraDataBucket', {
          encryptionKey: props.encryptionKey,
          naming: props.naming,
          bucketName: `${props.naming.props.org}-${props.naming.props.domain}-${props.naming.props.env}-kendra-default-source-bucket`,
        });
      }

      NagSuppressions.addResourceSuppressions(
        dataBucket,
        [
          { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'MDAA does not enforce bucket replication.' },
          { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'MDAA does not enforce bucket replication.' },
          { id: 'PCI.DSS.321-S3BucketReplicationEnabled', reason: 'MDAA does not enforce bucket replication.' },
        ],
        true,
      );

      const kendraRole = new MdaaRole(this, 'KendraRole', {
        naming: props.naming,
        assumedBy: new iam.ServicePrincipal('kendra.amazonaws.com'),
        roleName: 'KendraRole',
      });

      kendraRole.addToPolicy(
        new iam.PolicyStatement({
          actions: ['logs:*', 'cloudwatch:*'],
          resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/kendra/*`],
        }),
      );

      dataBucket.grantRead(kendraRole);

      const kendraIndex = new kendra.CfnIndex(this, 'Index', {
        edition: 'DEVELOPER_EDITION',
        name: indexName,
        roleArn: kendraRole.roleArn,
        serverSideEncryptionConfiguration: {
          kmsKeyId: props.encryptionKey.keyId,
        },
        documentMetadataConfigurations: [
          {
            name: 'workspace_id',
            type: 'STRING_VALUE',
            search: {
              displayable: true,
              facetable: true,
              searchable: true,
            },
          },
          {
            name: 'document_type',
            type: 'STRING_VALUE',
            search: {
              displayable: true,
              facetable: true,
              searchable: true,
            },
          },
        ],
      });

      let s3DataSource: kendra.CfnDataSource;
      if (customDataSource !== undefined) {
        s3DataSource = new kendra.CfnDataSource(this, 'CustomKendraS3DataSource', {
          type: 'S3',
          name: 'CustomKendraS3DataSource',
          indexId: kendraIndex.ref,
          description: `S3 Data Source for Kendra Index for bucket ${customDataSource.bucketName}`,
          dataSourceConfiguration: {
            s3Configuration: {
              bucketName: customDataSource.bucketName,
              inclusionPrefixes: customDataSource.includedDirectories,
              documentsMetadataConfiguration: {
                s3Prefix:
                  customDataSource?.metadataDirectory !== undefined ? customDataSource.metadataDirectory : 'metadata',
              },
            },
          },
          roleArn: kendraRole.roleArn,
        });
        kendraRole.addToPolicy(
          new iam.PolicyStatement({
            actions: ['kms:Decrypt', 'kms:GenerateDataKey', 'kms:DescribeKey'],
            resources: [customDataSource.kmsKeyArn],
          }),
        );
      } else {
        s3DataSource = new kendra.CfnDataSource(this, 'DefaultKendraS3DataSource', {
          type: 'S3',
          name: 'DefaultKendraS3DataSource',
          indexId: kendraIndex.ref,
          description: 'S3 Data Source for Kendra Index',
          dataSourceConfiguration: {
            s3Configuration: {
              bucketName: dataBucket.bucketName,
              inclusionPrefixes: ['documents'],
              documentsMetadataConfiguration: {
                s3Prefix: 'metadata',
              },
            },
          },
          roleArn: kendraRole.roleArn,
        });
      }

      kendraRole.addToPolicy(
        new iam.PolicyStatement({
          actions: ['kendra:BatchDeleteDocument'],
          resources: [kendraIndex.attrArn, s3DataSource.attrArn],
        }),
      );

      NagSuppressions.addResourceSuppressions(
        kendraRole,
        [
          {
            id: 'AwsSolutions-IAM5',
            reason:
              'DDB index names not known at deployment time. KMS Permissions are appropriately scoped. S3 Bucket managed and dedicated to Kendra index',
          },
          {
            id: 'NIST.800.53.R5-IAMNoInlinePolicy',
            reason: 'Permissions are role specific. Inline policy use appropriate.',
          },
          {
            id: 'HIPAA.Security-IAMNoInlinePolicy',
            reason: 'Permissions are role specific. Inline policy use appropriate.',
          },
          {
            id: 'PCI.DSS.321-IAMNoInlinePolicy',
            reason: 'Permissions are role specific. Inline policy use appropriate.',
          },
          {
            id: 'NIST.800.53.R5-IAMPolicyNoStatementsWithFullAccess',
            reason: 'Permission bound by cloudwatch namespace.  Other policies further restrict log group access',
          },
          {
            id: 'HIPAA.Security-IAMPolicyNoStatementsWithFullAccess',
            reason: 'Permission bound by cloudwatch namespace.  Other policies further restrict log group access',
          },
          {
            id: 'PCI.DSS.321-IAMPolicyNoStatementsWithFullAccess',
            reason: 'Permission bound by cloudwatch namespace.  Other policies further restrict log group access',
          },
        ],
        true,
      );

      this.kendraIndex = kendraIndex;
      this.kendraS3DataSource = s3DataSource;
      this.kendraS3DataSourceBucket = dataBucket;
    }

    this.createKendraWorkspaceWorkflow = createWorkflow.stateMachine;
  }
}

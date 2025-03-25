/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaLambdaFunction, MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import { Effect, ManagedPolicy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { CustomResource, Duration } from 'aws-cdk-lib';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { MdaaQuickSightDataSource } from '@aws-mdaa/quicksight-constructs';
import { ConfigurationElement } from '@aws-mdaa/config';
//Interfaces for Shared Folders
export type FolderActions = 'READER_FOLDER' | 'AUTHOR_FOLDER';
export interface SharedFoldersPermissionsProps {
  /**
   * List of Principals
   */
  readonly principal: string;
  /**
   * Either READER_FOLDER or AUTHOR_FOLDER
   */
  readonly actions: FolderActions;
}
export interface SharedFoldersProps {
  /**
   * Permissions to be tied to the folder
   */
  readonly permissions: SharedFoldersPermissionsProps[];
  /**
   * Sub-folders if any
   */
  readonly folders?: { [key: string]: SharedFoldersProps };
}
interface FolderDetailPermissionsProps {
  readonly Principal?: string;
  readonly Actions?: string[];
}
interface FolderDetailProps {
  readonly folderName: string;
  readonly folderPermissions: FolderDetailPermissionsProps[];
  readonly folderNameWithParentName: string;
  readonly parentFolderArn?: string;
}
//Interfaces for DataSource
export type DataSourceActions = 'READER_DATA_SOURCE' | 'AUTHOR_DATA_SOURCE';
export interface DataSourcePermissionsProps {
  /**
   * Either "READER_DATA_SOURCE" or "AUTHOR_DATA_SOURCE"
   */
  readonly actions: DataSourceActions;
  /**
   * The Amazon Resource Name (ARN) of the principal.
   */
  readonly principal: string;
}
export interface DataSourcePermissions2Props {
  /**
   * API Actions for "READER_DATA_SOURCE" or "AUTHOR_DATA_SOURCE"
   */
  readonly actions: string[];
  /**
   * The Amazon Resource Name (ARN) of the principal.
   */
  readonly principal: string;
}
export interface DataSourceErrorInfoProps {
  /**
   * Error message(Optional)
   */
  readonly message?: string;
  /**
   * Error type.(Optional)
   * Valid Values are: ACCESS_DENIED | CONFLICT | COPY_SOURCE_NOT_FOUND | ENGINE_VERSION_NOT_SUPPORTED | GENERIC_SQL_FAILURE | TIMEOUT | UNKNOWN | UNKNOWN_HOST
   */
  readonly type?: string;
}
export interface DataSourceCredentialPairProps {
  /**
   * Password
   */
  readonly password: string;
  /**
   * Username
   */
  readonly username: string;
  /**
   * A set of alternate data source parameters that you want to share for these credentials.
   */
  /** @jsii ignore */
  readonly alternateDataSourceParameters?: [
    {
      /** @jsii ignore */
      [key: string]: unknown;
    },
  ];
}
export interface DataSourceCredentialsProps {
  /**
   * The Amazon Resource Name (ARN) of a data source that has the credential pair that you want to use.
   */
  readonly copySourceArn?: string;
  /**
   * Credential pair. For more information, see [CredentialPair](https://docs.aws.amazon.com/quicksight/latest/APIReference/API_CredentialPair.html) .
   */
  readonly credentialPair?: DataSourceCredentialPairProps;
  /**
   * CfnDataSource.DataSourceCredentialsProperty.SecretArn.
   */
  readonly secretArn?: string;
}
export type DataSourceTypeProps =
  | 'ADOBE_ANALYTICS'
  | 'AMAZON_ELASTICSEARCH'
  | 'AMAZON_OPENSEARCH'
  | 'ATHENA'
  | 'AURORA'
  | 'AURORA_POSTGRESQL'
  | 'AWS_IOT_ANALYTICS'
  | 'DATABRICKS'
  | 'EXASOL'
  | 'GITHUB'
  | 'JIRA'
  | 'MARIADB'
  | 'MYSQL'
  | 'ORACLE'
  | 'POSTGRESQL'
  | 'PRESTO'
  | 'REDSHIFT'
  | 'S3'
  | 'SALESFORCE'
  | 'SERVICENOW'
  | 'SNOWFLAKE'
  | 'SPARK'
  | 'SQLSERVER'
  | 'TERADATA'
  | 'TIMESTREAM'
  | 'TWITTER';
export interface DataSourceSSLProps {
  /**
   * Enable to Disable SSL: Default value is false(SSL is enabled)
   */
  readonly disableSsl: boolean;
}
export interface DataSourceVPCProps {
  /**
   * QuickSight VPC(created in QS) ARN
   */
  readonly vpcConnectionArn: string;
}
export interface DataSourceProps {
  readonly dataSourceSpecificParameters: ConfigurationElement;
  /**
   * The AWS account ID.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-awsaccountid
   */
  readonly awsAccountId?: string;
  /**
   * The credentials Amazon QuickSight that uses to connect to your underlying source. Currently, only credentials based on user name and password are supported.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-credentials
   */
  readonly credentials?: DataSourceCredentialsProps;
  /**
   * Error information from the last update or the creation of the data source.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-errorinfo
   */
  readonly errorInfo?: DataSourceErrorInfoProps;
  /**
   * A display name for the data source.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-name
   */
  readonly displayName: string;
  /**
   * A list of resource permissions on the data source.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-permissions
   */
  readonly permissions: DataSourcePermissionsProps[];
  /**
   * Secure Socket Layer (SSL) properties that apply when Amazon QuickSight connects to your underlying source.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-sslproperties
   */
  readonly sslProperties?: DataSourceSSLProps;
  /**
   * Use this parameter only when you want Amazon QuickSight to use a VPC connection when connecting to your underlying source.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-vpcconnectionproperties
   */
  readonly vpcConnectionProperties?: DataSourceVPCProps;
}
export interface DataSourceWithIdAndTypeProps extends DataSourceProps {
  /**
   * Type of Data Source. ADOBE_ANALYTICS | AMAZON_ELASTICSEARCH | AMAZON_OPENSEARCH | ATHENA | AURORA | AURORA_POSTGRESQL | AWS_IOT_ANALYTICS | DATABRICKS | EXASOL | GITHUB | JIRA | MARIADB | MYSQL | ORACLE | POSTGRESQL | PRESTO | REDSHIFT | S3 | SALESFORCE | SERVICENOW | SNOWFLAKE | SPARK | SQLSERVER | TERADATA | TIMESTREAM | TWITTER
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-sslproperties
   */
  readonly type: Record<DataSourceTypeProps, string>[DataSourceTypeProps];
  /**
   * An ID for the data source. This ID is unique per AWS Region for each AWS account.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-datasourceid
   */
  readonly dataSourceId: string;
}
export interface QuickSightProjectL3ConstructProps extends MdaaL3ConstructProps {
  /**
   *(Required) Details about the Data Sources to be created
   */
  readonly dataSources?: DataSourceWithIdAndTypeProps[];
  /**
   * (Required) Objects representing various QS Principals
   */
  readonly principals: { [key: string]: string };
  /**
   * (Required) QS Shared Folders
   */
  readonly sharedFolders?: { [key: string]: SharedFoldersProps };
}
export class QuickSightProjectL3Construct extends MdaaL3Construct {
  protected readonly props: QuickSightProjectL3ConstructProps;

  public static sharedFoldersActions: { [key: string]: string[] } = {
    READER_FOLDER: ['quicksight:DescribeFolder'],
    AUTHOR_FOLDER: [
      'quicksight:CreateFolder',
      'quicksight:DescribeFolder',
      'quicksight:UpdateFolder',
      'quicksight:DeleteFolder',
      'quicksight:CreateFolder',
      'quicksight:CreateFolderMembership',
      'quicksight:DeleteFolderMembership',
      'quicksight:DescribeFolderPermissions',
      'quicksight:UpdateFolderPermissions',
    ],
  };
  public static dataSourceActions: { [key: string]: string[] } = {
    READER_DATA_SOURCE: [
      'quicksight:DescribeDataSource',
      'quicksight:DescribeDataSourcePermissions',
      'quicksight:PassDataSource',
    ],
    AUTHOR_DATA_SOURCE: [
      'quicksight:DescribeDataSource',
      'quicksight:DescribeDataSourcePermissions',
      'quicksight:PassDataSource',
      'quicksight:UpdateDataSource',
      'quicksight:DeleteDataSource',
      'quicksight:UpdateDataSourcePermissions',
    ],
  };
  constructor(scope: Construct, id: string, props: QuickSightProjectL3ConstructProps) {
    super(scope, id, props);
    this.props = props;
    //Create QS Data Sources
    if (this.props.dataSources) {
      const DataSourceWithIdAndTypeProps: DataSourceWithIdAndTypeProps[] = this.props.dataSources;
      this.createQSDataSource(DataSourceWithIdAndTypeProps);
    }
    //Create QS Shared Folders
    if (this.props.sharedFolders) {
      const arraySharedFolders: { [key: string]: SharedFoldersProps } = this.props.sharedFolders;
      const qsFolderProvider: Provider = this.createQSFoldersProvider();
      this.createQSFolders(qsFolderProvider, arraySharedFolders);
    }
  }
  // Creates Custom Resource per Shared Folder - Handles OnCreate, OnUpdate, OnDelete Stack Events
  private createQSFoldersCr(qsFolderProvider: Provider, folderDetail: FolderDetailProps): CustomResource {
    return new CustomResource(this, `qsFolders-${folderDetail.folderNameWithParentName}`, {
      serviceToken: qsFolderProvider.serviceToken,
      properties: {
        folderDetails: folderDetail,
      },
    });
  }

  private createQSFoldersProvider(): Provider {
    //Create a role which will be used by the QSFolders Custom Resource Lambda Function
    const qsFoldersCrRole = new MdaaLambdaRole(this, 'qsFolders-cr-role', {
      description: 'CR Lambda Role',
      roleName: 'qsFolders-cr',
      naming: this.props.naming,
      logGroupNames: [this.props.naming.resourceName('qsFolders-cr-func')],
      createParams: false,
      createOutputs: false,
    });

    const qsFoldersCrManagedPolicy = new ManagedPolicy(this, 'qsFolders-cr-lambda', {
      managedPolicyName: this.props.naming.resourceName('qsFolders-cr-lambda'),
      roles: [qsFoldersCrRole],
    });

    const qsFoldersPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:quicksight:${this.region}:${this.account}:folder/*`],
      actions: [
        'quicksight:CreateFolder',
        'quicksight:DeleteFolder',
        'quicksight:DescribeFolder',
        'quicksight:DescribeFolderPermissions',
        'quicksight:DescribeFolderResolvedPermissions',
        'quicksight:ListFolderMembers',
        'quicksight:ListFolders',
        'quicksight:UpdateFolder',
        'quicksight:UpdateFolderPermissions',
      ],
    });
    qsFoldersCrManagedPolicy.addStatements(qsFoldersPolicyStatement);
    const qsFoldersPolicyStatement2 = new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:quicksight:${this.region}:${this.account}:folder/*`],
      actions: ['quicksight:CreateFolderMembership', 'quicksight:DeleteFolderMembership'],
    });
    qsFoldersCrManagedPolicy.addStatements(qsFoldersPolicyStatement2);

    NagSuppressions.addResourceSuppressions(
      qsFoldersCrManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'ds:CreateIdentityPoolDirectory,ds:DescribeDirectories - Takes no resource.',
        },
      ],
      true,
    );
    const srcDir = `${__dirname}/../src/python/quicksight_folders`;
    // This Lambda is used as a Custom Resource in order to create the QuickSight Folders
    const quicksightFoldersCrLambda = new MdaaLambdaFunction(this, 'qsFolders-cr-func', {
      functionName: 'qsFolders-cr-func',
      naming: this.props.naming,
      code: Code.fromAsset(srcDir),
      handler: 'quicksight_folders.lambda_handler',
      runtime: Runtime.PYTHON_3_13,
      timeout: Duration.seconds(120),
      environment: {
        ACCOUNT_ID: this.account,
      },
      role: qsFoldersCrRole,
    });

    NagSuppressions.addResourceSuppressions(
      quicksightFoldersCrLambda,
      [
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
        },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'HIPAA.Security-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
      ],
      true,
    );
    const qsFoldersCrProviderFunctionName = this.props.naming.resourceName('qsFolders-cr-prov', 64);
    const qsFoldersCrProviderRole = new MdaaLambdaRole(this, 'qsFolders-cr-prov-role', {
      description: 'CR Role',
      roleName: 'qsFolders-cr-prov',
      naming: this.props.naming,
      logGroupNames: [qsFoldersCrProviderFunctionName],
      createParams: false,
      createOutputs: false,
    });
    const qsFoldersCrProvider = new Provider(this, 'qsFolders-cr-provider', {
      providerFunctionName: qsFoldersCrProviderFunctionName,
      onEventHandler: quicksightFoldersCrLambda,
      role: qsFoldersCrProviderRole,
    });
    NagSuppressions.addResourceSuppressions(
      qsFoldersCrProviderRole,
      [
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason: 'Role is for Custom Resource Provider. Inline policy automatically added.',
        },
      ],
      true,
    );

    NagSuppressions.addResourceSuppressions(
      qsFoldersCrProvider,
      [
        {
          id: 'AwsSolutions-L1',
          reason: 'Lambda function Runtime set by CDK Provider Framework',
        },
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
        },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'HIPAA.Security-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason: 'Function is for custom resource and error handling will be handled by CloudFormation.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is for custom resource and will interact only with QuickSight APIs.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason:
            'Function is for custom resource and will only execute during stack deployement. Reserved concurrency not appropriate.',
        },
      ],
      true,
    );
    return qsFoldersCrProvider;
  }
  //Parses Config to prepare inputs to create_folder api and recursively creates Custom Resources
  private createQSFolders(
    qsFolderProvider: Provider,
    arrSharedFolders: { [key: string]: SharedFoldersProps },
    parentFolderName?: string,
    parentFolderArn?: string,
  ): void {
    Object.keys(arrSharedFolders).forEach(folderName => {
      const folderDetails: SharedFoldersProps = arrSharedFolders[folderName];
      const fullName = parentFolderName + '/' + folderName;
      const folderNameWithParentName = fullName.replace(/^\/+/, '').replace(/\//g, '-').replace('undefined-', '');
      const returnPermissions: FolderDetailPermissionsProps[] = folderDetails.permissions.map(element => {
        const folderPermissions: FolderDetailPermissionsProps = {
          Principal: this.props.principals[element.principal],
          Actions: QuickSightProjectL3Construct.sharedFoldersActions[element.actions],
        };
        return folderPermissions;
      });
      const folderDetail: FolderDetailProps = {
        folderName: folderName,
        folderPermissions: returnPermissions,
        folderNameWithParentName: folderNameWithParentName,
        parentFolderArn: parentFolderArn,
      };
      const folderArn: string = this.createQSFoldersCr(qsFolderProvider, folderDetail).getAttString('FolderArn');
      if (folderDetails.folders) {
        //Recursion to Check if there are any sub-folders
        this.createQSFolders(qsFolderProvider, folderDetails.folders, fullName, folderArn);
      }
    });
  }
  // Creates Quicksight Data Sources
  private createQSDataSource(dataSourcesProps: DataSourceWithIdAndTypeProps[]): void {
    dataSourcesProps.forEach(dataSourceWithIdAndTypeProps => {
      const qsDataSourcePermissions: DataSourcePermissions2Props[] = dataSourceWithIdAndTypeProps.permissions.map(
        permissionDetail => {
          const qsDataSourcePermission: DataSourcePermissions2Props = {
            actions: QuickSightProjectL3Construct.dataSourceActions[permissionDetail.actions],
            principal: this.props.principals[permissionDetail.principal],
          };
          return qsDataSourcePermission;
        },
      );

      return new MdaaQuickSightDataSource(
        this,
        this.props.naming.resourceName(dataSourceWithIdAndTypeProps.dataSourceId),
        {
          naming: this.props.naming,
          alternateDataSourceParameters: [dataSourceWithIdAndTypeProps.dataSourceSpecificParameters],
          awsAccountId: this.account,
          credentials: dataSourceWithIdAndTypeProps.credentials,
          dataSourceId: this.props.naming.resourceName(dataSourceWithIdAndTypeProps.dataSourceId),
          dataSourceParameters: dataSourceWithIdAndTypeProps.dataSourceSpecificParameters,
          errorInfo: dataSourceWithIdAndTypeProps.errorInfo,
          name: dataSourceWithIdAndTypeProps.displayName,
          permissions: qsDataSourcePermissions,
          type: dataSourceWithIdAndTypeProps.type,
          vpcConnectionProperties: dataSourceWithIdAndTypeProps.vpcConnectionProperties,
        },
      );
    });
  }
}

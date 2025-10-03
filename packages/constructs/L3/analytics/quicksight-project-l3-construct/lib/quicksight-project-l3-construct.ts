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
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { MdaaQuickSightDataSource } from '@aws-mdaa/quicksight-constructs';
import { ConfigurationElement } from '@aws-mdaa/config';
//Interfaces for Shared Folders
export type FolderActions = 'READER_FOLDER' | 'AUTHOR_FOLDER';

/**
 * Q-ENHANCED-INTERFACE
 * QuickSight shared folder permissions configuration interface for controlling user access to shared BI folders with role-based permissions. Defines principal-specific folder access permissions enabling collaborative BI development with controlled access to shared dashboards, analyses, and datasets within QuickSight projects.
 *
 * Use cases: Collaborative BI development; Shared folder access control; Team-based dashboard sharing; Role-based BI permissions; Project folder organization
 *
 * AWS: Amazon QuickSight shared folder permissions with principal-based access control for collaborative BI project management
 *
 * Validation: principal must be valid QuickSight user or group ARN; actions must be 'READER_FOLDER' or 'AUTHOR_FOLDER'
 */
export interface SharedFoldersPermissionsProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required principal identifier for QuickSight shared folder access control enabling user or group-based permissions. Defines the specific QuickSight user or group that will be granted access to the shared folder, providing identity-based access control for collaborative BI development and dashboard sharing.
   *
   * Use cases: User-based access control; Group permissions; Identity management; Collaborative BI access; Principal-based security
   *
   * AWS: Amazon QuickSight principal identifier for shared folder access control and identity-based permissions
   *
   * Validation: Must be valid QuickSight user or group identifier; required for principal-based access control
   **/
  readonly principal: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required folder action permissions for QuickSight shared folder access control enabling role-based folder operations. Defines the specific actions that the principal can perform on the shared folder, controlling whether users have read-only access or full authoring capabilities for collaborative BI development.
   *
   * Use cases: Role-based permissions; Folder operation control; Access level management; Collaborative BI security; Action-based access control
   *
   * AWS: Amazon QuickSight folder actions for shared folder operation control and role-based access management
   *
   * Validation: Must be valid FolderActions enum value (READER_FOLDER or AUTHOR_FOLDER); required for folder permission specification
   **/
  readonly actions: FolderActions;
}
/**
 * Q-ENHANCED-INTERFACE
 * QuickSight shared folder configuration interface for creating collaborative BI workspaces with hierarchical folder organization and permission management. Defines shared folder properties including folder hierarchy, permissions, and organizational structure for team-based BI development and dashboard sharing within QuickSight projects.
 *
 * Use cases: BI workspace organization; Hierarchical folder structure; Team collaboration spaces; Dashboard organization; Project-based BI management
 *
 * AWS: Amazon QuickSight shared folder creation with hierarchical organization and permission management for collaborative BI development
 *
 * Validation: folderName must be unique within parent folder; folderPermissions must contain valid permission configurations; parentFolderArn must reference existing folder if specified
 */
export interface SharedFoldersProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of permission configurations for QuickSight shared folder access control enabling role-based folder security and collaboration management. Defines the specific permissions that will be applied to the shared folder including user access rights, group permissions, and action-based security for collaborative BI development.
   *
   * Use cases: Folder access control; Role-based permissions; Collaboration security; User access management; BI workspace security
   *
   * AWS: Amazon QuickSight shared folder permissions for access control and collaborative BI security management
   *
   * Validation: Must be array of valid SharedFoldersPermissionsProps; required for folder permission configuration
   **/
  readonly permissions: SharedFoldersPermissionsProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional nested folder structure for QuickSight shared folder hierarchy enabling organized BI workspace management and hierarchical content organization. Defines sub-folders within the current folder providing multi-level organization for dashboards, analyses, and BI assets.
   *
   * Use cases: Hierarchical folder organization; Nested BI workspaces; Multi-level content organization; Structured BI asset management; Project organization
   *
   * AWS: Amazon QuickSight nested shared folder structure for hierarchical BI workspace organization and content management
   *
   * Validation: Must be object with string keys and valid SharedFoldersProps values if provided; optional for nested folder structure
   **/
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
/**
 * Q-ENHANCED-INTERFACE
 * QuickSight data source permissions configuration interface for controlling user access to BI data sources with role-based data access management. Defines principal-specific data source permissions enabling secure data access control for QuickSight users with reader or author permissions on underlying data connections.
 *
 * Use cases: Data source access control; Role-based data permissions; Secure BI data access; User data authorization; Data source security management
 *
 * AWS: Amazon QuickSight data source permissions with principal-based access control for secure BI data connectivity
 *
 * Validation: principal must be valid QuickSight user or group ARN; actions must be 'READER_DATA_SOURCE' or 'AUTHOR_DATA_SOURCE'
 */
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
/**
 * Q-ENHANCED-INTERFACE
 * QuickSight data source error information configuration interface for capturing and managing data connection error details with diagnostic information. Defines error properties for troubleshooting data source connectivity issues including error messages, types, and diagnostic information for QuickSight data source management.
 *
 * Use cases: Data source troubleshooting; Connection error diagnosis; Data connectivity monitoring; Error reporting; Data source health management
 *
 * AWS: Amazon QuickSight data source error information for connection troubleshooting and diagnostic reporting
 *
 * Validation: type must be valid error type (ACCESS_DENIED, CONFLICT, COPY_SOURCE_NOT_FOUND, etc.); message should be descriptive error text
 */
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
/**
 * Q-ENHANCED-INTERFACE
 * QuickSight data source credential pair configuration interface for secure database authentication with username and password credentials. Defines credential properties for authenticating to external data sources including databases, data warehouses, and other data systems requiring username/password authentication in QuickSight data connections.
 *
 * Use cases: Database authentication; Secure data source connections; Credential management; Data warehouse access; External system authentication
 *
 * AWS: Amazon QuickSight data source credentials for secure authentication to external databases and data systems
 *
 * Validation: username and password must be non-empty strings; credentials must be valid for target data source; password should be stored securely
 */
export interface DataSourceCredentialPairProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required password for QuickSight data source authentication enabling secure access to external databases and data systems. Provides the password credential for username/password authentication to data sources requiring secure database connectivity.
   *
   * Use cases: Database authentication; Secure data access; Credential-based connections; Data source security
   *
   * AWS: Amazon QuickSight data source password for secure authentication to external databases
   *
   * Validation: Must be non-empty string; required for credential-based authentication; should be stored securely
   **/
  readonly password: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required username for QuickSight data source authentication enabling secure access to external databases and data systems. Provides the username credential for username/password authentication to data sources requiring secure database connectivity.
   *
   * Use cases: Database authentication; User identification; Credential-based connections; Data source access
   *
   * AWS: Amazon QuickSight data source username for secure authentication to external databases
   *
   * Validation: Must be non-empty string; required for credential-based authentication
   **/
  readonly username: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional alternate data source parameters for credential sharing and flexible authentication configuration. Provides additional authentication parameters that can be shared across multiple data sources for consistent credential management and flexible authentication scenarios.
   *
   * Use cases: Credential sharing; Flexible authentication; Multi-source credentials; Parameter customization
   *
   * AWS: Amazon QuickSight alternate data source parameters for flexible credential configuration
   *
   * Validation: Must be valid parameter object array if provided; optional for advanced credential configuration
   *   *   alternateDataSourceParameters:
   *     - host: "alternate-host.example.com"
   *       port: 5432
   **/
  /** @jsii ignore */
  readonly alternateDataSourceParameters?: [
    {
      /** @jsii ignore */
      [key: string]: unknown;
    },
  ];
}
/**
 * Q-ENHANCED-INTERFACE
 * DataSourceCredentialsProps configuration interface for business intelligence and data visualization.
 *
 * Use cases: Business intelligence; Data visualization; Interactive dashboards; BI reporting
 *
 * AWS: Amazon QuickSight configuration for business intelligence and data visualization
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon QuickSight and MDAA requirements
 */
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
/**
 * Q-ENHANCED-INTERFACE
 * QuickSight data source SSL configuration interface for secure data connections with SSL/TLS encryption control. Defines SSL properties for enabling or disabling encrypted connections to external data sources, ensuring secure data transmission between QuickSight and underlying data systems with configurable encryption settings.
 *
 * Use cases: Secure data connections; SSL/TLS encryption control; Data transmission security; Compliance requirements; Network security configuration
 *
 * AWS: Amazon QuickSight data source SSL configuration for encrypted connections to external data systems
 *
 * Validation: disableSsl must be boolean value; SSL should be enabled (false) for production data sources containing sensitive data
 */
export interface DataSourceSSLProps {
  /**
   * Enable to Disable SSL: Default value is false(SSL is enabled)
   */
  readonly disableSsl: boolean;
}
/**
 * Q-ENHANCED-INTERFACE
 * DataSourceVPCProps configuration interface for business intelligence and data visualization.
 *
 * Use cases: Business intelligence; Data visualization; Interactive dashboards; BI reporting
 *
 * AWS: Amazon QuickSight configuration for business intelligence and data visualization
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon QuickSight and MDAA requirements
 */
export interface DataSourceVPCProps {
  /**
   * QuickSight VPC(created in QS) ARN
   */
  readonly vpcConnectionArn: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * DataSourceProps configuration interface for business intelligence and data visualization.
 *
 * Use cases: Business intelligence; Data visualization; Interactive dashboards; BI reporting
 *
 * AWS: Amazon QuickSight configuration for business intelligence and data visualization
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon QuickSight and MDAA requirements
 */
export interface DataSourceProps {
  readonly dataSourceSpecificParameters: ConfigurationElement;
  /**
   * The AWS account ID.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-awsaccountid
   */
  readonly awsAccountId?: string;
  /**
   * The credentials Amazon QuickSight that uses to connect to your underlying source. Currently, only credentials based on user name and password are supported.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-credentials
   */
  readonly credentials?: DataSourceCredentialsProps;
  /**
   * Error information from the last update or the creation of the data source.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-errorinfo
   */
  readonly errorInfo?: DataSourceErrorInfoProps;
  /**
   * A display name for the data source.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-name
   */
  readonly displayName: string;
  /**
   * A list of resource permissions on the data source.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-permissions
   */
  readonly permissions: DataSourcePermissionsProps[];
  /**
   * Secure Socket Layer (SSL) properties that apply when Amazon QuickSight connects to your underlying source.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-sslproperties
   */
  readonly sslProperties?: DataSourceSSLProps;
  /**
   * Use this parameter only when you want Amazon QuickSight to use a VPC connection when connecting to your underlying source.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-vpcconnectionproperties
   */
  readonly vpcConnectionProperties?: DataSourceVPCProps;
}
export interface DataSourceWithIdAndTypeProps extends DataSourceProps {
  /**
   * Type of Data Source. ADOBE_ANALYTICS | AMAZON_ELASTICSEARCH | AMAZON_OPENSEARCH | ATHENA | AURORA | AURORA_POSTGRESQL | AWS_IOT_ANALYTICS | DATABRICKS | EXASOL | GITHUB | JIRA | MARIADB | MYSQL | ORACLE | POSTGRESQL | PRESTO | REDSHIFT | S3 | SALESFORCE | SERVICENOW | SNOWFLAKE | SPARK | SQLSERVER | TERADATA | TIMESTREAM | TWITTER
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-sslproperties
   */
  readonly type: Record<DataSourceTypeProps, string>[DataSourceTypeProps];
  /**
   * An ID for the data source. This ID is unique per AWS Region for each AWS account.
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-quicksight-datasource.html#cfn-quicksight-datasource-datasourceid
   */
  readonly dataSourceId: string;
}
export interface QuickSightProjectL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of data source configurations for QuickSight project data connectivity enabling data integration and analytics capabilities. Provides data source setup with connection parameters, credentials, and access controls for connecting to various data systems and enabling BI analytics operations.
   *
   * Use cases: Data source integration; Analytics connectivity; Data integration; BI data access
   *
   * AWS: QuickSight data sources for project data connectivity and analytics integration
   *
   * Validation: Must be array of valid DataSourceWithIdAndTypeProps if provided; enables data source integration and analytics connectivity
   **/
  readonly dataSources?: DataSourceWithIdAndTypeProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of principal names to principal identifiers for QuickSight project access control enabling user and group management for BI collaboration. Provides principal configurations for controlling access to project resources including data sources, folders, and analytics assets for secure collaboration.
   *
   * Use cases: Access control; User management; Principal configuration; Collaboration security
   *
   * AWS: QuickSight principals for project access control and user management
   *
   * Validation: Must be valid principal name to identifier mapping; required for project access control and user management
   *   **/
  readonly principals: { [key: string]: string };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of folder names to shared folder configurations for QuickSight project organization enabling collaborative asset management and structured content organization. Provides shared folder setup with permissions and access controls for organizing dashboards, analyses, and datasets within project structure.
   *
   * Use cases: Asset organization; Collaborative management; Content structure; Folder permissions
   *
   * AWS: QuickSight shared folders for project asset organization and collaborative management
   *
   * Validation: Must be valid folder name to SharedFoldersProps mapping if provided; enables project asset organization and collaboration
   *   **/
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

    MdaaNagSuppressions.addCodeResourceSuppressions(
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
        LOG_LEVEL: 'INFO',
      },
      role: qsFoldersCrRole,
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
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
      frameworkOnEventRole: qsFoldersCrProviderRole,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(
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

    MdaaNagSuppressions.addCodeResourceSuppressions(
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

import { MdaaConstructProps, MdaaNagSuppressions } from '@aws-mdaa/construct';
import {
  CfnEnvironment,
  CfnEnvironmentActions,
  CfnEnvironmentActionsProps,
  CfnEnvironmentProps,
  CfnSubscriptionTarget,
  CfnSubscriptionTargetProps,
} from 'aws-cdk-lib/aws-datazone';
import { CfnDatabase } from 'aws-cdk-lib/aws-glue';
import { Effect, IRole, ManagedPolicy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { MdaaDatazoneProject } from './project';
import { Stack } from 'aws-cdk-lib';

export interface MdaaDatazoneEnvironmentProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required DataZone project reference for environment association enabling project-environment integration. Specifies the DataZone project that this environment belongs to for project-environment association and integration.
   *
   * Use cases: Project association; Environment integration; Project-environment relationship; Integration management
   *
   * AWS: DataZone project reference for environment association and project integration
   *
   * Validation: Must be valid MdaaDatazoneProject instance; required for environment creation
   **/
  readonly project: MdaaDatazoneProject;
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role for DataZone environment user access enabling user-based environment operations. Specifies the IAM role that DataZone users will assume when accessing and operating within the environment.
   *
   * Use cases: User access; Environment operations; Role assumption; User permissions
   *
   * AWS: IAM role for DataZone environment user access and operations
   *
   * Validation: Must be valid IRole instance; required for environment user access
   **/
  readonly envUserRole: IRole;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Lake Formation manage access role for automated data governance enabling permission management and access control. Specifies the IAM role that DataZone will use to manage Lake Formation permissions and access control for data assets within the environment.
   *
   * Use cases: Automated access control; Lake Formation integration; Permission management; Data governance automation
   *
   * AWS: IAM role for Lake Formation manage access enabling automated data governance
   *
   * Validation: Must be valid IRole instance; required for Lake Formation integration
   **/
  readonly lakeformationManageAccessRole: IRole;
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 bucket for DataZone environment data storage enabling environment data management. Specifies the S3 bucket where environment data and subscription data will be stored for data management and access.
   *
   * Use cases: Data storage; Environment data; Subscription data; Data management
   *
   * AWS: S3 bucket for DataZone environment data storage and management
   *
   * Validation: Must be valid IBucket instance; required for environment data storage
   **/
  readonly envBucket: IBucket;
  /**
   * Q-ENHANCED-PROPERTY
   * Required AWS account ID for environment deployment enabling account-specific resource creation. Specifies the AWS account where the environment will be deployed for account-specific resource management.
   *
   * Use cases: Account deployment; Resource creation; Account-specific management; Deployment targeting
   *
   * AWS: AWS account ID for environment deployment and resource creation
   *
   * Validation: Must be valid AWS account ID string; required for environment deployment
   **/
  readonly account: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required AWS region for environment deployment enabling region-specific resource creation. Specifies the AWS region where the environment will be deployed for region-specific resource management.
   *
   * Use cases: Region deployment; Resource creation; Region-specific management; Deployment targeting
   *
   * AWS: AWS region for environment deployment and resource creation
   *
   * Validation: Must be valid AWS region string; required for environment deployment
   **/
  readonly region: string;
}

export class MdaaDatazoneEnvironment extends Construct {
  /**
   * Q-ENHANCED-PROPERTY
   * Environment properties configuration for DataZone environment setup providing access to environment settings. Exposes the environment properties for configuration access and environment management.
   *
   * Use cases: Configuration access; Environment settings; Property retrieval; Environment management
   *
   * AWS: DataZone environment properties for configuration access and management
   *
   * Validation: Initialized from constructor props; provides read-only access to environment configuration
   **/
  readonly props: MdaaDatazoneEnvironmentProps;
  /**
   * Q-ENHANCED-PROPERTY
   * CloudFormation DataZone environment resource for environment deployment and management. Exposes the underlying CloudFormation environment resource for advanced configuration and dependency management.
   *
   * Use cases: Environment deployment; CloudFormation management; Advanced configuration; Dependency management
   *
   * AWS: CloudFormation DataZone environment resource for environment deployment and management
   *
   * Validation: Created during construct initialization; represents the deployed DataZone environment
   **/
  public readonly env: CfnEnvironment;
  /**
   * Q-ENHANCED-PROPERTY
   * Glue database for DataZone subscription data storage enabling subscription data management. Provides the Glue database created for storing subscription data and metadata within the DataZone environment.
   *
   * Use cases: Subscription data storage; Database management; Metadata storage; Data cataloging
   *
   * AWS: Glue database for DataZone subscription data storage and management
   *
   * Validation: Created during construct initialization; used for subscription data storage
   **/
  public readonly subDatabase: CfnDatabase;
  /**
   * Q-ENHANCED-PROPERTY
   * Generated subscription database name after applying naming conventions for consistent resource identification. Provides the final database name for subscription data after applying organizational naming conventions.
   *
   * Use cases: Database identification; Naming consistency; Resource naming; Database management
   *
   * AWS: Glue database name for subscription data after naming convention application
   *
   * Validation: Generated from props.naming.resourceName; applies naming conventions to database name
   **/
  public readonly subDatabaseName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * DataZone subscription target for data subscription management enabling subscription workflows. Provides the subscription target resource for managing data subscriptions within the DataZone environment.
   *
   * Use cases: Subscription management; Data subscriptions; Subscription workflows; Target management
   *
   * AWS: DataZone subscription target for subscription management and workflows
   *
   * Validation: Created during construct initialization; enables subscription workflows
   **/
  public readonly subTarget: CfnSubscriptionTarget;
  /**
   * Q-ENHANCED-PROPERTY
   * Lake Formation manage access role for automated data governance enabling permission management. Exposes the Lake Formation role for access control and permission management within the environment.
   *
   * Use cases: Access control; Permission management; Data governance; Role access
   *
   * AWS: IAM role for Lake Formation manage access and data governance
   *
   * Validation: Initialized from props.lakeformationManageAccessRole; provides Lake Formation permissions
   **/
  public readonly lakeformationManageAccessRole: IRole;

  private readonly constructScope: Construct;

  public constructor(scope: Construct, id: string, props: MdaaDatazoneEnvironmentProps, useParentScope?: boolean) {
    super(scope, id);
    this.props = props;

    this.constructScope = useParentScope ? scope : this;
    this.lakeformationManageAccessRole = props.lakeformationManageAccessRole;
    const subBucketLocation = props.envBucket.s3UrlForObject('/data/datazone');
    // Create the database
    this.subDatabaseName = this.props.naming.resourceName('datazone-sub');
    this.subDatabase = new CfnDatabase(Stack.of(this.constructScope), `datazone-sub-database`, {
      catalogId: props.account,
      databaseInput: {
        name: this.subDatabaseName,
        description: 'For consuming Datazone subscripts',
        locationUri: subBucketLocation,
      },
    });

    const cfnEnvProps: CfnEnvironmentProps = {
      domainIdentifier: props.project.domainConfig.domainId,
      environmentProfileIdentifier: '',
      name: this.props.naming.resourceName(),
      projectIdentifier: props.project.project.attrId,
    };

    const datazoneEnv = new CfnEnvironment(this.constructScope, 'datalake-env', cfnEnvProps);

    datazoneEnv.addPropertyOverride('EnvironmentAccountIdentifier', props.account);
    datazoneEnv.addPropertyOverride('EnvironmentAccountRegion', props.region);
    datazoneEnv.addPropertyOverride(
      'EnvironmentBlueprintId',
      props.project.domainConfig.getBlueprintId('CustomAwsService'),
    );
    datazoneEnv.addPropertyOverride('EnvironmentRoleArn', props.envUserRole.roleArn);

    const athenaActionProps: CfnEnvironmentActionsProps = {
      name: 'Query data',
      description: 'Amazon Athena',
      domainIdentifier: props.project.domainConfig.domainId,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        // uri: `https://${props.region}.console.aws.amazon.com/athena/home#/query-editor/domain/${datazoneEnv.attrDomainId}/domainRegion/${props.region}/environment/${datazoneEnv.attrId}`
        uri: `https://${props.region}.console.aws.amazon.com/athena/home?region=${props.region}#/query-editor`,
      },
    };
    new CfnEnvironmentActions(this.constructScope, 'athena-env-action', athenaActionProps);

    const glueEtlActionProps: CfnEnvironmentActionsProps = {
      name: 'View Glue ETL jobs',
      description: 'AWS Glue ETL',
      domainIdentifier: props.project.domainConfig.domainId,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        uri: `https://${props.region}.console.aws.amazon.com/gluestudio/home?region=${props.region}#/jobs`,
      },
    };
    new CfnEnvironmentActions(this.constructScope, 'glue-etl-env-action', glueEtlActionProps);

    const glueCatalogActionProps: CfnEnvironmentActionsProps = {
      name: 'View Glue Catalogs',
      description: 'AWS Glue Catalog',
      domainIdentifier: props.project.domainConfig.domainId,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        uri: `https://${props.region}.console.aws.amazon.com/glue/home?region=${props.region}#/v2/data-catalog/tables`,
      },
    };
    new CfnEnvironmentActions(this.constructScope, 'glue-catalog-env-action', glueCatalogActionProps);

    const s3BucketActionProps: CfnEnvironmentActionsProps = {
      name: 'Project S3 Data',
      description: 'Amazon S3',
      domainIdentifier: props.project.domainConfig.domainId,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        uri: `https://${props.region}.console.aws.amazon.com/s3/buckets/${props.envBucket.bucketName}/data/`,
      },
    };
    new CfnEnvironmentActions(this.constructScope, 's3-env-action', s3BucketActionProps);

    const consoleActionProps: CfnEnvironmentActionsProps = {
      name: 'View AWS Console',
      description: 'AWS Console',
      domainIdentifier: props.project.domainConfig.domainId,
      environmentIdentifier: datazoneEnv.attrId,
      parameters: {
        uri: 'https://console.aws.amazon.com/',
      },
    };
    new CfnEnvironmentActions(this.constructScope, 'console-env-action', consoleActionProps);
    const userManagedPolicy = this.createDatazoneUserManagedPolicy(
      props.envBucket,
      props.project.domainConfig.glueCatalogArns,
    );
    userManagedPolicy.attachToRole(props.envUserRole);

    this.subTarget = this.createDatazoneSubscriptionTarget(
      datazoneEnv,
      props.project,
      props.envUserRole,
      props.lakeformationManageAccessRole,
      this.subDatabaseName,
    );

    this.env = datazoneEnv;
  }

  private createDatazoneSubscriptionTarget(
    env: CfnEnvironment,
    mdaaProject: MdaaDatazoneProject,
    envRole: IRole,
    lakeformationManagedAccessRole: IRole,
    subDatabaseName: string,
  ): CfnSubscriptionTarget {
    const subTargetProps: CfnSubscriptionTargetProps = {
      applicableAssetTypes: ['GlueTableAssetType'],
      authorizedPrincipals: [envRole.roleArn], //User role
      domainIdentifier: mdaaProject.project.domainIdentifier,
      environmentIdentifier: env.attrId,
      manageAccessRole: lakeformationManagedAccessRole.roleArn, //manage role
      name: this.props.naming.resourceName(),
      subscriptionTargetConfig: [
        {
          content: `{"databaseName":"${subDatabaseName}"}`,
          formName: 'GlueSubscriptionTargetConfigForm',
        },
      ],
      type: 'GlueSubscriptionTargetType',
    };
    return new CfnSubscriptionTarget(this.constructScope, 'datazone-sub-target', subTargetProps);
  }

  private createDatazoneUserManagedPolicy(projectBucket: IBucket, glueCatalogArns: string[]): ManagedPolicy {
    //Allow to access the glue catalog resources
    const userPolicy: ManagedPolicy = new ManagedPolicy(this.constructScope, 'datazone-user-access-policy', {
      managedPolicyName: this.props.naming.resourceName('datazone-user-access-policy'),
    });

    const datazoneStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'datazone:ListDomains',
        'datazone:ListProjects',
        'datazone:ListAccountEnvironments',
        'datazone:ListEnvironments',
        'datazone:GetEnvironment',
      ],
      resources: ['*'],
    });
    userPolicy.addStatements(datazoneStatement);

    //Allow smooth interactions with project bucket via Console
    const projectBucketConsoleStatement = new PolicyStatement({
      sid: 'ProjectBucketGet',
      effect: Effect.ALLOW,
      resources: [projectBucket.bucketArn],
      actions: [
        's3:GetBucketLocation',
        's3:GetBucketVersioning',
        's3:GetBucketTagging',
        's3:GetEncryptionConfiguration',
        's3:GetIntelligentTieringConfiguration',
        's3:GetBucketPolicy',
      ],
    });
    userPolicy.addStatements(projectBucketConsoleStatement);

    const accessAthenaStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['athena:ListWorkGroups'],
      resources: ['*'],
    });
    userPolicy.addStatements(accessAthenaStatement);

    const accessLFStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['lakeformation:GetDataAccess'],
      resources: ['*'],
    });
    userPolicy.addStatements(accessLFStatement);

    const accessGlueStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['glue:GetColumnStatisticsTaskRuns'],
      resources: ['*'],
    });
    userPolicy.addStatements(accessGlueStatement);

    const accessGlueResourceStatement: PolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        'glue:GetDatabase',
        'glue:GetDatabases',
        'glue:GetTable',
        'glue:GetTables',
        'glue:GetPartition',
        'glue:GetPartitions',
        'glue:SearchTables',
        'glue:GetTableVersion',
        'glue:GetTableVersions',
        'glue:GetColumnStatistics*',
      ],
      resources: glueCatalogArns,
    });
    userPolicy.addStatements(accessGlueResourceStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(userPolicy, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Fine-grained permissions enforced via LakeFormation.',
      },
      {
        id: 'NIST.800.53.R5-IAMPolicyNoStatementsWithFullAccess',
        reason: 'Fine-grained permissions enforced via LakeFormation.',
      },
      {
        id: 'HIPAA.Security-IAMPolicyNoStatementsWithFullAccess',
        reason: 'Fine-grained permissions enforced via LakeFormation.',
      },
      {
        id: 'PCI.DSS.321-IAMPolicyNoStatementsWithFullAccess',
        reason: 'Fine-grained permissions enforced via LakeFormation.',
      },
    ]);
    return userPolicy;
  }
}

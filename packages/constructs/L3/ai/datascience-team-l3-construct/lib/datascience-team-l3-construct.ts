/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AthenaWorkgroupL3Construct, AthenaWorkgroupL3ConstructProps } from '@aws-mdaa/athena-workgroup-l3-construct';
import {
  AccessPolicyProps,
  BucketDefinition,
  DataLakeL3ConstructProps,
  InventoryDefinition,
  S3DatalakeBucketL3Construct,
} from '@aws-mdaa/datalake-l3-construct';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import {
  DomainProps,
  SagemakerStudioDomainL3Construct,
  SagemakerStudioDomainL3ConstructProps,
  UserProfileProps,
} from '@aws-mdaa/sm-studio-domain-l3-construct';

import { Aws } from 'aws-cdk-lib';
import { Effect, IRole, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { CfnMlflowTrackingServer, CfnSpace } from 'aws-cdk-lib/aws-sagemaker';
import { MdaaParamAndOutput, MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { deriveUserProfileName } from '@aws-mdaa/sm-shared';
import { Construct } from 'constructs';

// AWS SageMaker-managed ECR account hosting pre-built SageMaker container images.
// See: https://docs.aws.amazon.com/sagemaker/latest/dg-ecr-paths/sagemaker-algo-docker-registry-paths.html
export const CENTRAL_SM_REPO_ACCT = '341280168497';

/**
 * Data science team configuration for ML infrastructure deployment.
 * Defines SageMaker Studio domain, S3 mini data lake, Athena workgroup, execution roles, user profiles, and team access controls.
 *
 * Use cases: Team ML environment setup, shared data lake access, collaborative notebook development, SageMaker Studio provisioning
 *
 * AWS: SageMaker Studio Domain, S3, Athena, IAM
 *
 * Validation: Requires dataAdminRoles and teamExecutionRole; studioDomainConfig optional
 */
export interface DataScienceTeamProps {
  /**
   * Admin roles granted access to team resources including KMS keys, S3 buckets, and SageMaker resources.
   *
   * Use cases: Team administration, resource management, infrastructure governance
   *
   * AWS: IAM roles for team resource administration
   *
   * Validation: Required; MdaaRoleRef[]
   **/
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Team member roles for accessing shared resources like data lake, SageMaker Studio, and collaborative tools.
   *
   * Use cases: Team member access, ML development, collaborative workflows
   *
   * AWS: IAM roles for team member permissions
   *
   * Validation: Optional; MdaaRoleRef[]
   **/
  readonly teamUserRoles?: MdaaRoleRef[];
  /**
   * Execution role for SageMaker workloads including training jobs, endpoints, and notebooks.
   * Must have sagemaker.amazonaws.com service trust.
   *
   * Use cases: SageMaker job execution, model training, notebook execution
   *
   * AWS: IAM role with SageMaker service trust
   *
   * Validation: Required; MdaaRoleRef; must trust sagemaker.amazonaws.com
   **/
  readonly teamExecutionRole: MdaaRoleRef;
  /**
   * S3 inventory configurations for team data lake bucket content analysis and governance.
   *
   * Use cases: Data governance, cost analysis, content reporting, bucket management
   *
   * AWS: S3 inventory configurations
   *
   * Validation: Optional; Map of string keys to InventoryDefinition
   **/
  readonly inventories?: { [key: string]: InventoryDefinition };
  /**
   * SageMaker Studio domain configuration for the team's collaborative ML development environment.
   * Supports IAM and SSO auth modes, VPC config, lifecycle configs, custom images, and notebook sharing.
   *
   * Use cases: Collaborative ML development, team Studio environment, shared ML resources
   *
   * AWS: SageMaker Studio Domain
   *
   * Validation: Optional; DomainProps
   **/
  readonly studioDomainConfig?: DomainProps;
  /**
   * Custom policy name prefix for portable naming across accounts with SSO integration.
   * When set, uses this prefix instead of the naming module for policy names.
   *
   * Use cases: SSO integration, cross-account portability, permission set integration
   *
   * AWS: IAM policy naming prefix
   *
   * Validation: Optional; String
   **/
  readonly verbatimPolicyNamePrefix?: string;
  /**
   * MLflow tracking server configuration.
   * When enabled, creates a SageMaker-managed MLflow tracking server for experiment tracking
   * using the team's S3 bucket for artifact storage and KMS key for encryption.
   *
   * Use cases: ML experiment tracking, model versioning, metric logging, artifact management
   *
   * AWS: SageMaker MLflow Tracking Server
   *
   * Validation: Optional; MlflowConfig. No breaking change if omitted.
   */
  readonly mlflow?: MlflowConfig;
  /**
   * JupyterLab space configuration for the team.
   * When enabled, auto-creates a private JupyterLab space for each user profile in the team's Studio domain.
   *
   * Use cases: Per-user JupyterLab development environment, team-wide IDE provisioning
   *
   * AWS: SageMaker Space (JupyterLab app type)
   *
   * Validation: Optional; JupyterLabConfig. No breaking change if omitted.
   */
  readonly jupyterLab?: JupyterLabConfig;
}

/**
 * Team-level JupyterLab space configuration.
 * When enabled, a JupyterLab space is auto-created for every user profile in the team's Studio domain.
 */
export interface JupyterLabConfig {
  /**
   * Enable auto-creation of JupyterLab spaces for all user profiles.
   *
   * @default false
   */
  readonly enabled: boolean;
  /**
   * Default instance type for JupyterLab spaces (e.g. "ml.t3.medium").
   * If not specified, SageMaker uses its default instance type.
   *
   * Validation: Optional; must be a valid SageMaker instance type
   */
  readonly defaultInstanceType?: string;
  /**
   * Default space sharing mode: "Private" or "Shared".
   * Private spaces are accessible only to the owning user.
   * Shared spaces allow collaboration with other team members.
   *
   * @default "Private"
   */
  readonly defaultSharingType?: 'Private' | 'Shared';
}

/**
 * MLflow tracking server configuration.
 */
export interface MlflowConfig {
  /**
   * Enable the MLflow tracking server.
   *
   * @default false
   */
  readonly enabled: boolean;
  /**
   * Custom tracking server name. If not specified, auto-generated from MDAA naming.
   *
   * Validation: Optional; 1-256 characters, alphanumeric, hyphens, and underscores
   */
  readonly serverName?: string;
  /**
   * MLflow version (e.g. "2.16.2"). If not specified, SageMaker uses the latest supported version.
   */
  readonly serverVersion?: string;
  /**
   * Tracking server size: "Small", "Medium", or "Large".
   *
   * @default "Small"
   */
  readonly serverSize?: 'Small' | 'Medium' | 'Large';
  /**
   * Enable automatic model registration with SageMaker Model Registry.
   * When false, model registration is handled explicitly via SageMaker Model Package Groups
   * (e.g., in an MLOps pipeline).
   *
   * @default false
   */
  readonly automaticModelRegistration?: boolean;
  /**
   * S3 prefix under the team bucket for MLflow artifacts.
   *
   * @default "mlflow-artifacts/"
   */
  readonly artifactStorePrefix?: string;
}

export interface DataScienceTeamL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Complete data science team configuration for ML infrastructure deployment.
   *
   * Use cases: Team infrastructure setup, ML development environment, data lake integration
   *
   * AWS: SageMaker Studio, S3, Athena, IAM
   *
   * Validation: Required; DataScienceTeamProps
   **/
  readonly team: DataScienceTeamProps;
}

//This stack creates all of the resources required for a Data Science Team
//to use SageMaker Studio on top of a Data Lake
export class DataScienceTeamL3Construct extends MdaaL3Construct {
  protected readonly props: DataScienceTeamL3ConstructProps;

  constructor(scope: Construct, id: string, props: DataScienceTeamL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    const teamExecutionRoleResolved = props.roleHelper.resolveRoleRefWithRefId(
      this.props.team.teamExecutionRole,
      'team-execution-role',
    );
    const teamExecutionRole = Role.fromRoleArn(this, 'team-execution-role', teamExecutionRoleResolved.arn());

    const teamAssetsDeploymentRole = this.createAssetDeploymentRole();

    const minilakeL3Construct = this.createMiniLakeL3Construct(teamExecutionRole, teamAssetsDeploymentRole);

    const teamKmsKey = minilakeL3Construct.kmsKey;
    const teamBucket = minilakeL3Construct.buckets['projects'];

    if (props.team.studioDomainConfig) {
      const domain = this.createTeamStudioDomain(
        props.team.studioDomainConfig,
        teamExecutionRole,
        teamKmsKey,
        teamBucket,
        teamAssetsDeploymentRole,
      );
      if (teamBucket.policy) domain.node.addDependency(teamBucket.policy);

      // Auto-create JupyterLab spaces for all user profiles
      if (props.team.jupyterLab?.enabled && props.team.studioDomainConfig.userProfiles) {
        this.createJupyterLabSpaces(
          domain.domain.attrDomainId,
          props.team.studioDomainConfig.userProfiles,
          props.team.jupyterLab,
          domain,
        );
      }
    }

    this.createAthenaWorkgroup(teamExecutionRole, teamKmsKey, teamBucket);

    const resolvedMutableTeamUserRoles = this.props.roleHelper
      .resolveRoleRefsWithOrdinals(this.props.team.teamUserRoles || [], 'TeamUser')
      .filter(x => !x.immutable())
      // Exclude roles already imported as teamExecutionRole to avoid CDK construct name collisions
      .filter(x => x.arn() !== teamExecutionRoleResolved.arn())
      .map(x => Role.fromRoleArn(this, x.refId(), x.arn()));

    const teamPolicy = this.createTeamPolicy(teamExecutionRole, teamBucket);
    teamPolicy.attachToRole(teamExecutionRole);
    resolvedMutableTeamUserRoles.forEach(x => teamPolicy.attachToRole(x));

    const sagemakerReadPolicy = this.createSageMakerReadPolicy();
    sagemakerReadPolicy.attachToRole(teamExecutionRole);
    resolvedMutableTeamUserRoles.forEach(x => sagemakerReadPolicy.attachToRole(x));

    const sagemakerWritePolicies = this.createSageMakerWritePolicies(
      teamBucket,
      minilakeL3Construct.kmsKey,
      teamExecutionRole,
    );
    sagemakerWritePolicies.forEach(pol => pol.attachToRole(teamExecutionRole));
    resolvedMutableTeamUserRoles.forEach(role => sagemakerWritePolicies.forEach(pol => pol.attachToRole(role)));

    const sagemakerGuardrailManagedPolicy = this.createSageMakerGuardrailPolicy(minilakeL3Construct.kmsKey);
    sagemakerGuardrailManagedPolicy.attachToRole(teamExecutionRole);
    resolvedMutableTeamUserRoles.forEach(x => sagemakerGuardrailManagedPolicy.attachToRole(x));

    // MLflow tracking server (optional)
    if (props.team.mlflow?.enabled) {
      this.createMlflowTrackingServer(
        props.team.mlflow,
        teamKmsKey,
        teamBucket,
        teamExecutionRole,
        resolvedMutableTeamUserRoles,
      );
    }

    return this;
  }

  private createAssetDeploymentRole(): Role {
    return new MdaaLambdaRole(this.scope, `asset-deployment-role`, {
      roleName: 'deployment',
      naming: this.props.naming,
      logGroupNames: [`*CustomCDK*`],
    });
  }

  private createAthenaWorkgroup(teamExecutionRole: IRole, teamKmsKey: IKey, teamBucket: IBucket) {
    const workgroupL3ConstructProps: AthenaWorkgroupL3ConstructProps = {
      ...(this.props as MdaaL3ConstructProps),
      ...{
        naming: this.props.naming.withSuffix('athena'),
        dataAdminRoles: this.props.team.dataAdminRoles,
        athenaUserRoles: [
          ...[
            {
              arn: teamExecutionRole.roleArn,
            },
          ],
          ...(this.props.team.teamUserRoles || []),
        ],
        workgroupBucketName: teamBucket.bucketName,
        workgroupKmsKeyArn: teamKmsKey.keyArn,
        verbatimPolicyNamePrefix: this.props.team.verbatimPolicyNamePrefix
          ? this.props.team.verbatimPolicyNamePrefix + '-athena'
          : undefined,
      },
    };
    return new AthenaWorkgroupL3Construct(this, 'athena', workgroupL3ConstructProps);
  }

  private createTeamStudioDomain(
    studioDomainConfig: DomainProps,
    teamExecutionRole: IRole,
    teamKmsKey: IKey,
    teamBucket: IBucket,
    teamAssetsDeploymentRole: IRole,
  ): SagemakerStudioDomainL3Construct {
    const overrideDomainProps: DomainProps = {
      ...studioDomainConfig,
      defaultExecutionRole: {
        refId: 'ex-role',
        arn: teamExecutionRole.roleArn,
        name: teamExecutionRole.roleName,
      },
      dataAdminRoles: this.props.team.dataAdminRoles,
      kmsKeyArn: teamKmsKey.keyArn,
      domainBucket: {
        domainBucketName: teamBucket.bucketName,
        assetDeploymentRole: {
          refId: 'deployment-role',
          arn: teamAssetsDeploymentRole.roleArn,
          name: teamAssetsDeploymentRole.roleName,
        },
      },
      assetPrefix: 'sagemaker-lifecycle-assets/studio',
    };

    const studioDomainL3ConstructProps: SagemakerStudioDomainL3ConstructProps = {
      ...(this.props as MdaaL3ConstructProps),
      ...{ domain: overrideDomainProps },
    };

    return new SagemakerStudioDomainL3Construct(this, 'studio', studioDomainL3ConstructProps);
  }

  private createMiniLakeL3Construct(teamExecutionRole: IRole, teamAssetsDeploymentRole: Role) {
    const teamExecutionRoleRef = {
      arn: teamExecutionRole.roleArn,
    };
    const teamAssetsDeploymentRoleRef = {
      arn: teamAssetsDeploymentRole.roleArn,
      // id: teamAssetsDeploymentRole.roleId
    };
    const miniLakeAccessPolicies: AccessPolicyProps[] = [
      {
        name: 'DataAdminRootAccess',
        s3Prefix: '/',
        readWriteSuperRoleRefs: this.props.team.dataAdminRoles,
      },
      {
        name: 'TeamSageMakerAccess',
        s3Prefix: '/sagemaker/',
        readWriteRoleRefs: [teamExecutionRoleRef, ...(this.props.team.teamUserRoles || [])],
      },
      {
        name: 'TeamLifecycleAssetsAccess',
        s3Prefix: '/sagemaker-lifecycle-assets/',
        readRoleRefs: [teamExecutionRoleRef, ...(this.props.team.teamUserRoles || [])],
        readWriteRoleRefs: [teamAssetsDeploymentRoleRef],
      },
      {
        name: 'TeamProjectsAccess',
        s3Prefix: '/projects/',
        readWriteRoleRefs: [teamExecutionRoleRef, ...(this.props.team.teamUserRoles || [])],
      },
      {
        name: 'TeamAthenaResultsAccess',
        s3Prefix: '/athena-results',
        readWriteRoleRefs: [teamExecutionRoleRef, ...(this.props.team.teamUserRoles || [])],
      },
    ];

    const minilakeBucketProps: BucketDefinition = {
      bucketZone: 'projects',
      inventories: this.props.team.inventories,
      accessPolicies: miniLakeAccessPolicies,
    };
    const newNaming = this.props.naming.withSuffix('minilake');
    const minilakeL3ConstructProps: DataLakeL3ConstructProps = {
      ...(this.props as MdaaL3ConstructProps),
      ...{
        naming: newNaming,
        buckets: [minilakeBucketProps],
      },
    };
    return new S3DatalakeBucketL3Construct(this, 'minilake', minilakeL3ConstructProps);
  }

  private createTeamPolicy(teamExecutionRole: IRole, teamBucket: IBucket): ManagedPolicy {
    const teamManagedPolicy = new MdaaManagedPolicy(this, 'team-managed-pol', {
      managedPolicyName: this.props.team.verbatimPolicyNamePrefix
        ? this.props.team.verbatimPolicyNamePrefix
        : undefined,
      verbatimPolicyName: this.props.team.verbatimPolicyNamePrefix != undefined,
      naming: this.props.naming,
    });
    //Allow reading of team execution role
    const teamRoleStatement = new PolicyStatement({
      sid: 'TeamRole',
      effect: Effect.ALLOW,
      resources: [teamExecutionRole.roleArn],
      actions: ['iam:GetRole'],
    });
    teamManagedPolicy.addStatements(teamRoleStatement);

    //Allow smooth interactions with team bucket via Console
    const teamBucketConsoleStatement = new PolicyStatement({
      sid: 'TeamBucketGet',
      effect: Effect.ALLOW,
      resources: [teamBucket.bucketArn],
      actions: [
        's3:GetBucketVersioning',
        's3:GetBucketTagging',
        's3:GetEncryptionConfiguration',
        's3:GetIntelligentTieringConfiguration',
        's3:GetBucketPolicy',
      ],
    });
    teamManagedPolicy.addStatements(teamBucketConsoleStatement);
    //Allow reading team SSM params
    const ssmBasePath = this.props.naming.ssmPath('placeholder', false).replace('/placeholder', '');
    const teamSSMStatement = new PolicyStatement({
      sid: 'TeamSSM',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:ssm:${this.region}:${this.account}:parameter${ssmBasePath}/*`],
      actions: ['ssm:GetParameter', 'ssm:GetParameterHistory', 'ssm:GetParameters', 'ssm:GetParametersByPath'],
    });
    teamManagedPolicy.addStatements(teamSSMStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      teamManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'SSM permissions scoped to team SSM params by path prefix',
        },
      ],
      true,
    );
    return teamManagedPolicy;
  }

  private createSageMakerReadPolicy(): ManagedPolicy {
    const sagemakerReadonlyManagedPolicy = new MdaaManagedPolicy(this, 'read-managed-pol', {
      managedPolicyName: this.props.team.verbatimPolicyNamePrefix
        ? this.props.team.verbatimPolicyNamePrefix + '-' + 'sm-read'
        : 'sm-read',
      verbatimPolicyName: this.props.team.verbatimPolicyNamePrefix != undefined,
      naming: this.props.naming,
    });

    const sagemakerSearchStatement = new PolicyStatement({
      sid: 'SageMakerSearch',
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: ['sagemaker:Search'],
    });
    sagemakerReadonlyManagedPolicy.addStatements(sagemakerSearchStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerReadonlyManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'SageMaker Search does not take a resource. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: ['Resource::*'],
        },
      ],
      true,
    );
    // Allow SageMaker readonly permissions
    const sagemakerListStatement = new PolicyStatement({
      sid: 'SageMakerList',
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: ['sagemaker:List*'],
    });
    sagemakerReadonlyManagedPolicy.addStatements(sagemakerListStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerReadonlyManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'SageMaker List does not take a resource. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: ['Resource::*', 'Action::sagemaker:List*'],
        },
      ],
      true,
    );

    // Allow SageMaker readonly permissions
    const sagemakerDescribeGetStatement = new PolicyStatement({
      sid: 'SageMakerDescribeGet',
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: ['sagemaker:Describe*', 'sagemaker:BatchDescribe*', 'sagemaker:Get*', 'sagemaker:BatchGet*'],
    });
    sagemakerReadonlyManagedPolicy.addStatements(sagemakerDescribeGetStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerReadonlyManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for Describe and Get not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            'Resource::*',
            'Action::sagemaker:Describe*',
            'Action::sagemaker:Get*',
            'Action::sagemaker:BatchDescribe*',
            'Action::sagemaker:BatchGet*',
          ],
        },
      ],
      true,
    );

    //Allow reading of log streams for SageMaker
    const cloudwatchStatement = new PolicyStatement({
      sid: 'CloudWatchSageMaker',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:logs:${this.region}:${this.account}:log-group:*sagemaker*`],
      actions: ['logs:GetLogEvents', 'logs:DescribeLogGroups', 'logs:DescribeLogStreams', 'logs:FilterLogEvents'],
    });
    sagemakerReadonlyManagedPolicy.addStatements(cloudwatchStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerReadonlyManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Log Group and Stream names not known at deployment time.',
          appliesTo: [`Resource::arn:${this.partition}:logs:${this.region}:${this.account}:log-group:*sagemaker*`],
        },
      ],
      true,
    );
    return sagemakerReadonlyManagedPolicy;
  }

  private createSageMakerWritePolicies(teamBucket: IBucket, teamKey: IKey, teamExecutionRole: IRole): ManagedPolicy[] {
    //We use two write policies in order to avoid policy length limits within IAM
    const sagemakerWriteManagedPolicy1 = new MdaaManagedPolicy(this, 'ex-write-managed-pol', {
      managedPolicyName: this.props.team.verbatimPolicyNamePrefix
        ? this.props.team.verbatimPolicyNamePrefix + '-' + 'sm-write'
        : 'sm-write',
      verbatimPolicyName: this.props.team.verbatimPolicyNamePrefix != undefined,
      naming: this.props.naming,
    });

    //We use two write policies in order to avoid policy length limits within IAM
    //New statements should be added
    const sagemakerWriteManagedPolicy2 = new MdaaManagedPolicy(this, 'sm-write-managed-pol2', {
      managedPolicyName: this.props.team.verbatimPolicyNamePrefix
        ? this.props.team.verbatimPolicyNamePrefix + '-' + 'sm-write-2'
        : 'sm-write-2',
      verbatimPolicyName: this.props.team.verbatimPolicyNamePrefix != undefined,
      naming: this.props.naming,
    });

    //Allow passing of team execution role to sagemaker jobs, etc
    const teamRoleStatement = new PolicyStatement({
      sid: 'TeamRole',
      effect: Effect.ALLOW,
      resources: [teamExecutionRole.roleArn],
      actions: ['iam:PassRole'],
    });
    sagemakerWriteManagedPolicy1.addStatements(teamRoleStatement);

    //Allow SageMaker permissions required to be used as execution role for Jobs
    const sagemakerJobStatement = new PolicyStatement({
      sid: 'CreateandManageJobs',
      effect: Effect.ALLOW,
      resources: [
        `arn:${this.partition}:sagemaker:${this.region}:${this.account}:*job/*`,
        `arn:${this.partition}:sagemaker:${this.region}:${this.account}:*job-definition/*`,
      ],
      actions: [
        'sagemaker:Create*Job',
        'sagemaker:Create*JobDefinition',
        'sagemaker:Delete*JobDefinition',
        'sagemaker:Update*Job',
        'sagemaker:Stop*Job',
      ],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerJobStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for Jobs not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:*job/*`,
            `Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:*job-definition/*`,
          ],
        },
      ],
      true,
    );
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Actions scoped for job management permissions, taking into account policy length limits. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Action::sagemaker:Create*Job`,
            `Action::sagemaker:Create*JobDefinition`,
            `Action::sagemaker:Delete*JobDefinition`,
            `Action::sagemaker:Delete*Job`,
            `Action::sagemaker:Update*Job`,
            `Action::sagemaker:Stop*Job`,
          ],
        },
      ],
      true,
    );

    //Allow SageMaker permissions required to be used as execution role for Model Monitoring Schedules
    const sagemakerModelMonitoringStatement = new PolicyStatement({
      sid: 'CreateandManageModelMonitoring',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:monitoring-schedule/*`],
      actions: [
        'sagemaker:CreateMonitoringSchedule',
        'sagemaker:UpdateMonitoringSchedule',
        'sagemaker:DeleteMonitoringSchedule',
      ],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerModelMonitoringStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for monitoring schedules not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [`Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:monitoring-schedule/*`],
        },
      ],
      true,
    );

    //Allow SageMaker permissions required to create and manage model cards
    const sagemakerModelCardStatement = new PolicyStatement({
      sid: 'CreateandManageModelCards',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:model-card/*`],
      actions: ['sagemaker:CreateModelCard', 'sagemaker:DeleteModelCard', 'sagemaker:UpdateModelCard'],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerModelCardStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for model cards not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [`Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:model-card/*`],
        },
      ],
      true,
    );

    //Allow SageMaker permissions required to be used as execution role for Pipelines
    const sagemakerPipelineStatement = new PolicyStatement({
      sid: 'CreateandManagePipelines',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:pipeline/*`],
      actions: [
        'sagemaker:CreatePipeline',
        'sagemaker:DeletePipeline',
        'sagemaker:RetryPipelineExecution',
        'sagemaker:StartPipelineExecution',
        'sagemaker:StopPipelineExecution',
        'sagemaker:SendPipelineExecutionStepSuccess',
        'sagemaker:SendPipelineExecutionStepFailure',
        'sagemaker:UpdatePipeline',
        'sagemaker:UpdatePipelineExecution',
      ],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerPipelineStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for Pipelines not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [`Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:pipeline/*`],
        },
      ],
      true,
    );
    //Allow SageMaker permissions required to create and manage models
    const sagemakerModelStatement = new PolicyStatement({
      sid: 'CreateAndManageModels',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:model/*`],
      actions: ['sagemaker:CreateModel', 'sagemaker:DeleteModel'],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerModelStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for Models not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [`Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:model/*`],
        },
      ],
      true,
    );

    //Allow SageMaker permissions required to create and manage models
    const sagemakerModelPackageStatement = new PolicyStatement({
      sid: 'CreateAndManageModelPackages',
      effect: Effect.ALLOW,
      resources: [
        `arn:${this.partition}:sagemaker:${this.region}:${this.account}:model-package/*`,
        `arn:${this.partition}:sagemaker:${this.region}:${this.account}:model-package-group/*`,
      ],
      actions: [
        'sagemaker:CreateModelPackage',
        'sagemaker:DeleteModelPackage',
        'sagemaker:UpdateModelPackage',
        'sagemaker:BatchDescribeModelPackage',
        'sagemaker:CreateModelPackageGroup',
        'sagemaker:DeleteModelPackageGroup',
        'sagemaker:DeleteModelPackageGroupPolicy',
        'sagemaker:PutModelPackageGroupPolicy',
      ],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerModelPackageStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for model packages not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:model-package/*`,
            `Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:model-package-group/*`,
          ],
        },
      ],
      true,
    );

    //Allow SageMaker permissions required to create and manage projects
    const sagemakerProjectStatement = new PolicyStatement({
      sid: 'CreateAndManageProjects',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:project/*`],
      actions: ['sagemaker:CreateProject', 'sagemaker:DeleteProject', 'sagemaker:UpdateProject'],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerProjectStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for Projects not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [`Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:project/*`],
        },
      ],
      true,
    );

    //Allow usage of Team KMS key for creating notebook instances
    const sagemakerKmsStatement = new PolicyStatement({
      sid: 'SageMakerKmsAccess',
      effect: Effect.ALLOW,
      resources: [teamKey.keyArn],
      actions: ['kms:CreateGrant'],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerKmsStatement);

    //Allow SageMaker permissions required to create and manage endpoints
    const sagemakerEndpointStatement = new PolicyStatement({
      sid: 'CreateAndManageEndpoints',
      effect: Effect.ALLOW,
      resources: [
        `arn:${this.partition}:sagemaker:${this.region}:${this.account}:endpoint/*`,
        `arn:${this.partition}:sagemaker:${this.region}:${this.account}:endpoint-config/*`,
      ],
      actions: [
        'sagemaker:CreateEndpoint',
        'sagemaker:DeleteEndpoint',
        'sagemaker:UpdateEndpoint',
        'sagemaker:UpdateEndpointWeightsAndCapacities',
        'sagemaker:CreateEndpointConfig',
        'sagemaker:DeleteEndpointConfig',
        'sagemaker:InvokeEndpoint',
        'sagemaker:InvokeEndpointAsync',
      ],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerEndpointStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for endpoints are not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:endpoint/*`,
            `Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:endpoint-config/*`,
          ],
        },
      ],
      true,
    );

    //Allow SageMaker permissions required to create and manage trials
    const sagemakerTrialStatement = new PolicyStatement({
      sid: 'CreateAndManageTrials',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:experiment*`],
      actions: [
        'sagemaker:CreateTrial',
        'sagemaker:CreateTrialComponent',
        'sagemaker:AssociateTrialComponent',
        'sagemaker:DisassociateTrialComponent',
        'sagemaker:DeleteTrial',
        'sagemaker:DeleteTrialComponent',
        'sagemaker:UpdateTrial',
        'sagemaker:UpdateTrialComponent',
      ],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerTrialStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for experiments are not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [`Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:experiment*`],
        },
      ],
      true,
    );

    //Allow SageMaker permissions required to create and manage notebooks
    const sagemakerNotebookStatement = new PolicyStatement({
      sid: 'CreateAndManageNotebooks',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:notebook-instance/*`],
      actions: [
        'sagemaker:CreateNotebookInstance',
        'sagemaker:UpdateNotebookInstance',
        'sagemaker:DeleteNotebookInstance',
        'sagemaker:StartNotebookInstance',
        'sagemaker:StopNotebookInstance',
        'sagemaker:CreatePresignedNotebookInstanceUrl',
      ],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerNotebookStatement);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for Notebook Instances not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [`Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:notebook-instance/*`],
        },
      ],
      true,
    );

    //Allow SageMaker permissions required to create and manage notebooks
    const sagemakerNotebookLifecycleStatement = new PolicyStatement({
      sid: 'CreateAndManageNotebookLifecycles',
      effect: Effect.ALLOW,
      resources: [
        `arn:${this.partition}:sagemaker:${this.region}:${this.account}:notebook-instance-lifecycle-config/*`,
      ],
      actions: [
        'sagemaker:CreateNotebookInstanceLifecycleConfig',
        'sagemaker:UpdateNotebookInstanceLifecycleConfig',
        'sagemaker:DeleteNotebookInstanceLifecycleConfig',
      ],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerNotebookLifecycleStatement);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for Notebook Lifecycle Configs not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:notebook-instance-lifecycle-config/*`,
          ],
        },
      ],
      true,
    );

    // Allow access to put records to feature groups
    const sagemakerPutRecordFeatureGroupStatement = new PolicyStatement({
      sid: 'PutRecordFeatureGroups',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:feature-group/*`],
      actions: ['sagemaker:PutRecord', 'sagemaker:DeleteRecord'],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerPutRecordFeatureGroupStatement);

    //Allow SageMaker permissions required to create online feature-groups
    //Must be encrypted with team key
    const sagemakerCreateOnlineFeatureGroupStatement = new PolicyStatement({
      sid: 'CreateOnlineFeatureGroups',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:feature-group/*`],
      actions: ['sagemaker:CreateFeatureGroup'],
      conditions: {
        StringEquals: {
          'sagemaker:FeatureGroupOnlineStoreKmsKey': teamKey.keyArn,
        },
      },
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerCreateOnlineFeatureGroupStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for FeatureGroups not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [`Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:feature-group/*`],
        },
      ],
      true,
    );

    //Allow SageMaker permissions required to create offline feature-groups
    //Offline storage location must be team bucket, and must be encrypted with team key
    const sagemakerCreateOfflineFeatureGroupStatement = new PolicyStatement({
      sid: 'CreateOfflineFeatureGroups',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:feature-group/*`],
      actions: ['sagemaker:CreateFeatureGroup'],
      conditions: {
        StringEquals: {
          'sagemaker:FeatureGroupOfflineStoreKmsKey': teamKey.keyArn,
        },
        StringLike: {
          'sagemaker:FeatureGroupOfflineStoreS3Uri': teamBucket.arnForObjects('*'),
        },
      },
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerCreateOfflineFeatureGroupStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for FeatureGroups not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [`Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:feature-group/*`],
        },
      ],
      true,
    );

    //Allow SageMaker permissions required to manage feature-groups
    const sagemakerManageFeatureGroupStatement = new PolicyStatement({
      sid: 'ManageFeatureGroups',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:feature-group/*`],
      actions: ['sagemaker:DeleteFeatureGroup', 'sagemaker:UpdateFeatureGroup', 'sagemaker:UpdateFeatureMetadata'],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerManageFeatureGroupStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for FeatureGroups not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [`Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:feature-group/*`],
        },
      ],
      true,
    );

    //Allow SageMaker permissions required to create and manage Experiments
    const sagemakerExperimentStatement = new PolicyStatement({
      sid: 'CreateAndManageExperiments',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:experiment/*`],
      actions: ['sagemaker:CreateExperiment', 'sagemaker:DeleteExperiment', 'sagemaker:UpdateExperiment'],
    });
    sagemakerWriteManagedPolicy1.addStatements(sagemakerExperimentStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for Experiments not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [`Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:experiment/*`],
        },
      ],
      true,
    );

    //Allow SageMaker permissions required to add and remove tags (important for SageMaker Clarify, among others)
    const sagemakerAddDeleteTagsStatement = new PolicyStatement({
      sid: 'AddDeleteTagsSageMaker',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:sagemaker:${this.region}:${this.account}:*`],
      actions: ['sagemaker:AddTags', 'sagemaker:DeleteTags'],
    });
    sagemakerWriteManagedPolicy2.addStatements(sagemakerAddDeleteTagsStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy2,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for tagged SageMaker resources are not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [`Resource::arn:${this.partition}:sagemaker:${this.region}:${this.account}:*`],
        },
      ],
      true,
    );

    //Allow EC2 permissions required to be used as execution role for VPC Bound Jobs/Pipelines
    const sagemakerEc2Statement = new PolicyStatement({
      sid: 'CreateEC2NetworkInterfaces',
      effect: Effect.ALLOW,
      resources: [`*`],
      actions: [
        'ec2:CreateNetworkInterface',
        'ec2:CreateNetworkInterfacePermission',
        'ec2:CreateVpcEndpoint',
        'ec2:DeleteNetworkInterface',
        'ec2:DeleteNetworkInterfacePermission',
        'ec2:DescribeNetworkInterfaces',
        'ec2:DescribeSecurityGroups',
        'ec2:DescribeSubnets',
        'ec2:DescribeVpcs',
        'ec2:DescribeDhcpOptions',
        'ec2:DescribeVpcEndpoints',
      ],
    });
    sagemakerWriteManagedPolicy2.addStatements(sagemakerEc2Statement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy2,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Network Interface ID not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html#amazonec2-network-interface',
          appliesTo: ['Resource::*'],
        },
      ],
      true,
    );
    //Allow SageMaker ECR permissions to pull SageMaker images from the central SageMaker repository
    const sagemakerEcrStatement = new PolicyStatement({
      sid: 'SageMakerECRReadonly',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:ecr:${this.region}:${CENTRAL_SM_REPO_ACCT}:repository/sagemaker*`],
      actions: ['ecr:ListImages', 'ecr:DescribeImages', 'ecr:DescribeRepositories', 'ecr:GetDownloadUrlForLayer'],
    });

    sagemakerWriteManagedPolicy2.addStatements(sagemakerEcrStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy2,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Resource names for SageMaker ECR not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonelasticcontainerregistry.html',
          appliesTo: [
            `Resource::arn:${this.partition}:ecr:${this.region}:${CENTRAL_SM_REPO_ACCT}:repository/sagemaker*`,
          ],
        },
      ],
      true,
    );

    //Allow creation of log groups and log streams for SageMaker
    const cloudwatchStatement = new PolicyStatement({
      sid: 'CloudWatchSageMaker',
      effect: Effect.ALLOW,
      resources: [`arn:${this.partition}:logs:${this.region}:${this.account}:log-group:*sagemaker*`],
      actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
    });
    sagemakerWriteManagedPolicy2.addStatements(cloudwatchStatement);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      sagemakerWriteManagedPolicy2,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Log Group and Stream names not known at deployment time.',
          appliesTo: [`Resource::arn:${this.partition}:logs:${this.region}:${this.account}:log-group:*sagemaker*`],
        },
      ],
      true,
    );
    sagemakerWriteManagedPolicy1.checkPolicyLength(true);
    sagemakerWriteManagedPolicy2.checkPolicyLength(true);
    return [sagemakerWriteManagedPolicy1, sagemakerWriteManagedPolicy2];
  }

  private createJupyterLabSpaces(
    domainId: string,
    userProfiles: Record<string, UserProfileProps>,
    jupyterLabConfig: JupyterLabConfig,
    domain: SagemakerStudioDomainL3Construct,
  ): void {
    if (jupyterLabConfig.defaultInstanceType && !jupyterLabConfig.defaultInstanceType.startsWith('ml.')) {
      throw new Error(
        `Invalid JupyterLab instance type "${jupyterLabConfig.defaultInstanceType}". ` +
          'SageMaker instance types must start with "ml." (e.g., "ml.t3.medium").',
      );
    }

    const sharingType = jupyterLabConfig.defaultSharingType || 'Private';

    Object.keys(userProfiles).forEach(userid => {
      const userProfileName = deriveUserProfileName(userid);
      const spaceName = `${userProfileName}-JupyterLab-space`;

      const space = new CfnSpace(this, `jupyterlab-space-${userProfileName}`, {
        domainId,
        spaceName,
        spaceDisplayName: spaceName,
        spaceSettings: {
          appType: 'JupyterLab',
          jupyterLabAppSettings: jupyterLabConfig.defaultInstanceType
            ? {
                defaultResourceSpec: {
                  instanceType: jupyterLabConfig.defaultInstanceType,
                },
              }
            : undefined,
        },
        ownershipSettings: {
          ownerUserProfileName: userProfileName,
        },
        spaceSharingSettings: {
          sharingType,
        },
      });
      // Space depends on domain (which contains user profiles)
      space.node.addDependency(domain);

      new MdaaParamAndOutput(this, {
        ...this.props,
        resourceType: 'jupyterlab',
        resourceId: `space-${userProfileName}`,
        name: 'name',
        value: spaceName,
      });
    });
  }

  private createMlflowTrackingServer(
    mlflowConfig: MlflowConfig,
    teamKmsKey: IKey,
    teamBucket: IBucket,
    teamExecutionRole: IRole,
    resolvedMutableTeamUserRoles: IRole[],
  ): CfnMlflowTrackingServer {
    // Validate MLflow config
    if (mlflowConfig.serverName && !/^[a-zA-Z0-9][\w-]{0,255}$/.test(mlflowConfig.serverName)) {
      throw new Error(
        `Invalid MLflow server name '${mlflowConfig.serverName}'. ` +
          `Must be 1-256 characters, alphanumeric, hyphens, and underscores, starting with alphanumeric.`,
      );
    }

    const serverName = mlflowConfig.serverName || this.props.naming.resourceName('mlflow-tracking', 256);
    const artifactPrefix = mlflowConfig.artifactStorePrefix ?? 'mlflow-artifacts/';
    // Ensure artifact prefix ends with '/' for proper S3 prefix scoping
    const normalizedArtifactPrefix = artifactPrefix.endsWith('/') ? artifactPrefix : `${artifactPrefix}/`;
    if (normalizedArtifactPrefix === '/') {
      throw new Error(
        'MLflow artifactStorePrefix cannot be empty or root ("/"). ' +
          'Provide a non-empty prefix to scope MLflow artifact storage within the team bucket.',
      );
    }
    const artifactStoreUri = `s3://${teamBucket.bucketName}/${normalizedArtifactPrefix}`;

    // Create IAM role for MLflow tracking server
    const mlflowRole = new MdaaRole(this, 'mlflow-role', {
      naming: this.props.naming,
      roleName: 'mlflow',
      assumedBy: new ServicePrincipal('sagemaker.amazonaws.com'),
    });

    // Managed policy for MLflow S3 and KMS access (avoids inline DefaultPolicy + Nag suppressions)
    const mlflowManagedPolicy = new MdaaManagedPolicy(this, 'mlflow-managed-pol', {
      naming: this.props.naming,
    });
    mlflowManagedPolicy.addStatements(
      new PolicyStatement({
        sid: 'MlflowS3Access',
        effect: Effect.ALLOW,
        resources: [teamBucket.bucketArn, `${teamBucket.bucketArn}/${normalizedArtifactPrefix}*`],
        actions: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject', 's3:ListBucket', 's3:GetBucketLocation'],
      }),
      new PolicyStatement({
        sid: 'MlflowKmsAccess',
        effect: Effect.ALLOW,
        resources: [teamKmsKey.keyArn],
        actions: [
          'kms:Decrypt',
          'kms:DescribeKey',
          'kms:Encrypt',
          'kms:GenerateDataKey',
          'kms:GenerateDataKeyWithoutPlaintext',
          'kms:ReEncryptFrom',
          'kms:ReEncryptTo',
        ],
      }),
    );
    mlflowRole.addManagedPolicy(mlflowManagedPolicy);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      mlflowManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'MLflow artifacts stored under a prefix in the team bucket; prefix-scoped wildcard required.',
        },
      ],
      true,
    );

    const trackingServer = new CfnMlflowTrackingServer(this, 'mlflow-tracking-server', {
      trackingServerName: serverName,
      roleArn: mlflowRole.roleArn,
      artifactStoreUri,
      mlflowVersion: mlflowConfig.serverVersion,
      trackingServerSize: mlflowConfig.serverSize || 'Small',
      automaticModelRegistration: mlflowConfig.automaticModelRegistration ?? false,
    });

    // Grant execution role access to MLflow tracking server via managed policy
    const mlflowAccessPolicy = new MdaaManagedPolicy(this, 'mlflow-access-managed-pol', {
      naming: this.props.naming,
    });
    mlflowAccessPolicy.addStatements(
      new PolicyStatement({
        sid: 'MlflowTrackingAccess',
        effect: Effect.ALLOW,
        resources: [
          `arn:${Aws.PARTITION}:sagemaker:${Aws.REGION}:${Aws.ACCOUNT_ID}:mlflow-tracking-server/${serverName}`,
        ],
        actions: [
          'sagemaker:CreatePresignedMlflowTrackingServerUrl',
          'sagemaker:DescribeMlflowTrackingServer',
          'sagemaker:StartMlflowTrackingServer',
          'sagemaker:StopMlflowTrackingServer',
        ],
      }),
    );
    teamExecutionRole.addManagedPolicy(mlflowAccessPolicy);
    resolvedMutableTeamUserRoles.forEach(role => role.addManagedPolicy(mlflowAccessPolicy));

    // Publish SSM params
    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'mlflow',
      resourceId: 'tracking-server',
      name: 'name',
      value: serverName,
    });
    new MdaaParamAndOutput(this, {
      ...this.props,
      resourceType: 'mlflow',
      resourceId: 'tracking-server',
      name: 'arn',
      value: trackingServer.attrTrackingServerArn,
    });

    return trackingServer;
  }

  private createSageMakerGuardrailPolicy(teamKey: IKey): ManagedPolicy {
    const sagemakerGuardrailManagedPolicy = new MdaaManagedPolicy(this, 'sm-guardrail-managed-pol', {
      managedPolicyName: this.props.team.verbatimPolicyNamePrefix
        ? this.props.team.verbatimPolicyNamePrefix + '-' + 'sm-guardrail'
        : 'sm-guardrail',
      verbatimPolicyName: this.props.team.verbatimPolicyNamePrefix != undefined,
      naming: this.props.naming,
    });
    //Enforces use of Team KMS key for SageMaker Volumes
    const sagemakerForceVolumeKmsKeyStatement = new PolicyStatement({
      sid: 'forceVolumeKmsKey',
      effect: Effect.DENY,
      resources: ['*'],
      actions: [
        'sagemaker:CreateEndpointConfig',
        'sagemaker:CreateMonitoringSchedule',
        'sagemaker:UpdateMonitoringSchedule',
        'sagemaker:CreateNotebookInstance',
        'sagemaker:Create*Job*',
      ],
      conditions: {
        StringNotEquals: {
          'sagemaker:VolumeKmsKey': teamKey.keyArn,
        },
      },
    });
    sagemakerGuardrailManagedPolicy.addStatements(sagemakerForceVolumeKmsKeyStatement);

    //Enforces use of Team KMS key for SageMaker Outputs
    const sagemakerForceOutputKmsKeyStatement = new PolicyStatement({
      sid: 'forceOutputKmsKey',
      effect: Effect.DENY,
      resources: ['*'],
      actions: ['sagemaker:CreateMonitoringSchedule', 'sagemaker:UpdateMonitoringSchedule', 'sagemaker:Create*Job*'],
      conditions: {
        StringNotEquals: {
          'sagemaker:OutputKmsKey': teamKey.keyArn,
        },
      },
    });
    sagemakerGuardrailManagedPolicy.addStatements(sagemakerForceOutputKmsKeyStatement);

    const sagemakerForceIntercontainerEncryptionNonNullStatement = new PolicyStatement({
      sid: 'forceIntercontainerEncryptionNonNull',
      effect: Effect.DENY,
      resources: ['*'],
      actions: ['sagemaker:CreateMonitoringSchedule', 'sagemaker:UpdateMonitoringSchedule', 'sagemaker:Create*Job*'],
      conditions: {
        Null: {
          'sagemaker:InterContainerTrafficEncryption': 'true',
        },
      },
    });
    sagemakerGuardrailManagedPolicy.addStatements(sagemakerForceIntercontainerEncryptionNonNullStatement);

    const sagemakerForceIntercontainerEncryptionTrueStatement = new PolicyStatement({
      sid: 'forceIntercontainerEncryptionTrue',
      effect: Effect.DENY,
      resources: ['*'],
      actions: ['sagemaker:CreateMonitoringSchedule', 'sagemaker:UpdateMonitoringSchedule', 'sagemaker:Create*Job*'],
      conditions: {
        Bool: {
          'sagemaker:InterContainerTrafficEncryption': 'false',
        },
      },
    });
    sagemakerGuardrailManagedPolicy.addStatements(sagemakerForceIntercontainerEncryptionTrueStatement);

    const sagemakerForceJobVpc = new PolicyStatement({
      sid: 'forceJobNotebookVpc',
      effect: Effect.DENY,
      resources: ['*'],
      actions: [
        'sagemaker:Create*Job*',
        'sagemaker:CreateNotebookInstance',
        'sagemaker:CreateMonitoringSchedule',
        'sagemaker:UpdateMonitoringSchedule',
        'sagemaker:CreateModel',
      ],
      conditions: {
        Null: {
          'sagemaker:VpcSubnets': 'true',
        },
      },
    });
    sagemakerGuardrailManagedPolicy.addStatements(sagemakerForceJobVpc);

    const sagemakerForceSecurityGroupIds = new PolicyStatement({
      sid: 'forceJobNotebookSecurityGroups',
      effect: Effect.DENY,
      resources: ['*'],
      actions: [
        'sagemaker:Create*Job*',
        'sagemaker:CreateNotebookInstance',
        'sagemaker:CreateMonitoringSchedule',
        'sagemaker:UpdateMonitoringSchedule',
        'sagemaker:CreateModel',
      ],
      conditions: {
        Null: {
          'sagemaker:VpcSecurityGroupIds': 'true',
        },
      },
    });
    sagemakerGuardrailManagedPolicy.addStatements(sagemakerForceSecurityGroupIds);

    const sagemakerForceNotebookNonDirectNonNull = new PolicyStatement({
      sid: 'forceNotebookNonPublicNonNull',
      effect: Effect.DENY,
      resources: ['*'],
      actions: ['sagemaker:CreateNotebookInstance'],
      conditions: {
        Null: {
          'sagemaker:DirectInternetAccess': 'true',
        },
      },
    });
    sagemakerGuardrailManagedPolicy.addStatements(sagemakerForceNotebookNonDirectNonNull);

    const sagemakerForceNotebookNonDirectDisabled = new PolicyStatement({
      sid: 'forceNotebookNonPublicDisabled',
      effect: Effect.DENY,
      resources: ['*'],
      actions: ['sagemaker:CreateNotebookInstance'],
      conditions: {
        StringNotEquals: {
          'sagemaker:DirectInternetAccess': 'Disabled',
        },
      },
    });
    sagemakerGuardrailManagedPolicy.addStatements(sagemakerForceNotebookNonDirectDisabled);

    return sagemakerGuardrailManagedPolicy;
  }
}

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AthenaWorkgroupL3Construct, AthenaWorkgroupL3ConstructProps } from '@aws-mdaa/athena-workgroup-l3-construct';
import { AccessPolicyProps, BucketDefinition, DataLakeL3ConstructProps, InventoryDefinition, S3DatalakeBucketL3Construct } from '@aws-mdaa/datalake-l3-construct';
import { MdaaManagedPolicy } from '@aws-mdaa/iam-constructs';
import { MdaaRoleRef } from "@aws-mdaa/iam-role-helper";
import { MdaaL3Construct, MdaaL3ConstructProps } from "@aws-mdaa/l3-construct";
import { MdaaLambdaRole } from '@aws-mdaa/lambda-constructs';
import { DomainProps, SagemakerStudioDomainL3Construct, SagemakerStudioDomainL3ConstructProps } from '@aws-mdaa/sm-studio-domain-l3-construct';

import { Effect, IRole, ManagedPolicy, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { IKey } from "aws-cdk-lib/aws-kms";
import { IBucket } from "aws-cdk-lib/aws-s3";
import { NagSuppressions } from 'cdk-nag';
import { Construct } from "constructs";

export interface DataScienceTeamProps {
  /**
   * List of admin roles which will be provided access to team resources (like KMS/Bucket)
   */
  readonly dataAdminRoles: MdaaRoleRef[]
  /**
   * List of admin roles which will be provided access to team resources (like KMS/Bucket)
   */
  readonly teamUserRoles?: MdaaRoleRef[]
  /**
   * Reference to role which will be used as execution role on all team SageMaker resources.
   * The role must have assume role trust with sagemaker.amazonaws.com. Additional managed polies
   * may be added to the role to grant it access to team resources and relevant services.
   */
  readonly teamExecutionRole: MdaaRoleRef
  /**
   * List of inventory configurations to be applied to the bucket
   */
  readonly inventories?: { [ key: string ]: InventoryDefinition }
  /**
   * If defined, a studio domain will be created for the team
   */
  readonly studioDomainConfig?: DomainProps
  /**
   * If specified, policy names will be created using this prefix instead of using the naming module.
   * This is useful when policy names need to be portable across accounts (such as for integration with SSO permission sets)
   */
  readonly verbatimPolicyNamePrefix?: string
}

export interface DataScienceTeamL3ConstructProps extends MdaaL3ConstructProps {
  readonly team: DataScienceTeamProps
}

//This stack creates all of the resources required for a Data Science Team
//to use SageMaker Studio on top of a Data Lake
export class DataScienceTeamL3Construct extends MdaaL3Construct {
  protected readonly props: DataScienceTeamL3ConstructProps


  constructor( scope: Construct, id: string, props: DataScienceTeamL3ConstructProps ) {
    super( scope, id, props )
    this.props = props

    const teamExecutionRoleResolved = props.roleHelper.resolveRoleRefWithRefId( this.props.team.teamExecutionRole, "team-execution-role" )
    const teamExecutionRole = Role.fromRoleArn( this, 'team-execution-role', teamExecutionRoleResolved.arn() )

    const teamAssetsDeploymentRole = this.createAssetDeploymentRole()

    const minilakeL3Construct = this.createMiniLakeL3Construct( teamExecutionRole, teamAssetsDeploymentRole )

    const teamKmsKey = minilakeL3Construct.kmsKey
    const teamBucket = minilakeL3Construct.buckets[ "projects" ]

    if ( props.team.studioDomainConfig ) {
      const domain = this.createTeamStudioDomain(
        props.team.studioDomainConfig,
        teamExecutionRole,
        teamKmsKey,
        teamBucket,
        teamAssetsDeploymentRole )
      if ( teamBucket.policy ) domain.node.addDependency( teamBucket.policy )
    }

    this.createAthenaWorkgroup( teamExecutionRole, teamKmsKey, teamBucket )

    const resolvedMutableTeamUserRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals( this.props.team.teamUserRoles || [], "TeamUser" )
      .filter( x => !x.immutable() )
      .map( x => Role.fromRoleArn( this, x.refId(), x.arn() ) )

    const teamPolicy = this.createTeamPolicy( teamExecutionRole, teamBucket )
    teamPolicy.attachToRole( teamExecutionRole )
    resolvedMutableTeamUserRoles.forEach( x => teamPolicy.attachToRole( x ) )

    const sagemakerReadPolicy = this.createSageMakerReadPolicy()
    sagemakerReadPolicy.attachToRole( teamExecutionRole )
    resolvedMutableTeamUserRoles.forEach( x => sagemakerReadPolicy.attachToRole( x ) )

    const sagemakerWritePolicies = this.createSageMakerWritePolicies( teamBucket, minilakeL3Construct.kmsKey, teamExecutionRole )
    sagemakerWritePolicies.forEach( pol => pol.attachToRole( teamExecutionRole ) )
    resolvedMutableTeamUserRoles.forEach( role => sagemakerWritePolicies.forEach( pol => pol.attachToRole( role ) ) )

    const sagemakerGuardrailManagedPolicy = this.createSageMakerGuardrailPolicy( minilakeL3Construct.kmsKey )
    sagemakerGuardrailManagedPolicy.attachToRole( teamExecutionRole )
    resolvedMutableTeamUserRoles.forEach( x => sagemakerGuardrailManagedPolicy.attachToRole( x ) )

    return this
  }

  private createAssetDeploymentRole (): Role {
    const role = new MdaaLambdaRole( this.scope, `asset-deployment-role`, {
      roleName: "deployment",
      naming: this.props.naming,
      logGroupNames: [ `*CustomCDK*` ]
    } )

    return role
  }

  private createAthenaWorkgroup ( teamExecutionRole: IRole, teamKmsKey: IKey, teamBucket: IBucket ) {
    const workgroupL3ConstructProps: AthenaWorkgroupL3ConstructProps = {
      ...this.props as MdaaL3ConstructProps, ...{
        naming: this.props.naming.withModuleName( this.props.naming.props.moduleName + "-athena" ),
        dataAdminRoles: this.props.team.dataAdminRoles,
        athenaUserRoles: [ ...[ {
          arn: teamExecutionRole.roleArn
        } ], ...this.props.team.teamUserRoles || [] ],
        workgroupBucketName: teamBucket.bucketName,
        workgroupKmsKeyArn: teamKmsKey.keyArn,
        verbatimPolicyNamePrefix: this.props.team.verbatimPolicyNamePrefix ? this.props.team.verbatimPolicyNamePrefix + "-athena" : undefined
      }
    }
    return new AthenaWorkgroupL3Construct( this, "athena", workgroupL3ConstructProps )
  }

  private createTeamStudioDomain ( studioDomainConfig: DomainProps,
    teamExecutionRole: IRole,
    teamKmsKey: IKey,
    teamBucket: IBucket,
    teamAssetsDeploymentRole: IRole ): SagemakerStudioDomainL3Construct {

    const overrideDomainProps: DomainProps = {
      ...studioDomainConfig,
      defaultExecutionRole: {
        refId: "ex-role",
        arn: teamExecutionRole.roleArn,
        name: teamExecutionRole.roleName
      },
      dataAdminRoles: this.props.team.dataAdminRoles,
      kmsKeyArn: teamKmsKey.keyArn,
      domainBucket: {
        domainBucketName: teamBucket.bucketName,
        assetDeploymentRole: {
          refId: "deployment-role",
          arn: teamAssetsDeploymentRole.roleArn,
          name: teamAssetsDeploymentRole.roleName
        }
      },
      assetPrefix: "sagemaker-lifecycle-assets/studio"
    }

    const studioDomainL3ConstructProps: SagemakerStudioDomainL3ConstructProps = {
      ...this.props as MdaaL3ConstructProps, ...{ domain: overrideDomainProps }
    }

    return new SagemakerStudioDomainL3Construct( this, "studio", studioDomainL3ConstructProps )
  }

  private createMiniLakeL3Construct (
    teamExecutionRole: IRole,
    teamAssetsDeploymentRole: Role
  ) {
    const teamExecutionRoleRef = {
      arn: teamExecutionRole.roleArn
    }
    const teamAssetsDeploymentRoleRef = {
      arn: teamAssetsDeploymentRole.roleArn,
      // id: teamAssetsDeploymentRole.roleId
    }
    const miniLakeAccessPolicies: AccessPolicyProps[] = [
      {
        name: 'DataAdminRootAccess',
        s3Prefix: '/',
        readWriteSuperRoleRefs: this.props.team.dataAdminRoles
      },
      {
        name: 'TeamSageMakerAccess',
        s3Prefix: '/sagemaker/',
        readWriteRoleRefs: [ teamExecutionRoleRef, ...this.props.team.teamUserRoles || [] ]
      },
      {
        name: 'TeamLifecycleAssetsAccess',
        s3Prefix: '/sagemaker-lifecycle-assets/',
        readRoleRefs: [ teamExecutionRoleRef, ...this.props.team.teamUserRoles || [] ],
        readWriteRoleRefs: [ teamAssetsDeploymentRoleRef ]
      },
      {
        name: 'TeamProjectsAccess',
        s3Prefix: '/projects/',
        readWriteRoleRefs: [ teamExecutionRoleRef, ...this.props.team.teamUserRoles || [] ]
      },
      {
        name: 'TeamAthenaResultsAccess',
        s3Prefix: "/athena-results",
        readWriteRoleRefs: [ teamExecutionRoleRef, ...this.props.team.teamUserRoles || [] ]
      }
    ]

    const minilakeBucketProps: BucketDefinition = {
      bucketZone: 'projects',
      inventories: this.props.team.inventories,
      accessPolicies: miniLakeAccessPolicies
    }

    const minilakeL3ConstructProps: DataLakeL3ConstructProps = {
      ...this.props as MdaaL3ConstructProps, ...{
        naming: this.props.naming.withModuleName( this.props.naming.props.moduleName + "-minilake" ),
        buckets: [ minilakeBucketProps ]
      }
    }
    return new S3DatalakeBucketL3Construct( this, "minilake", minilakeL3ConstructProps )
  }

  private createTeamPolicy ( teamExecutionRole: IRole, teamBucket: IBucket ): ManagedPolicy {
    const teamManagedPolicy = new MdaaManagedPolicy( this, "team-managed-pol", {
      managedPolicyName: this.props.team.verbatimPolicyNamePrefix ? this.props.team.verbatimPolicyNamePrefix : undefined,
      verbatimPolicyName: this.props.team.verbatimPolicyNamePrefix != undefined,
      naming: this.props.naming
    } )
    //Allow reading of team execution role 
    const teamRoleStatement = new PolicyStatement( {
      sid: "TeamRole",
      effect: Effect.ALLOW,
      resources: [
        teamExecutionRole.roleArn
      ],
      actions: [
        "iam:GetRole"
      ]
    } )
    teamManagedPolicy.addStatements( teamRoleStatement )

    //Allow smooth interactions with team bucket via Console
    const teamBucketConsoleStatement = new PolicyStatement( {
      sid: "TeamBucketGet",
      effect: Effect.ALLOW,
      resources: [
        teamBucket.bucketArn
      ],
      actions: [
        "s3:GetBucketVersioning",
        "s3:GetBucketTagging",
        "s3:GetEncryptionConfiguration",
        "s3:GetIntelligentTieringConfiguration",
        "s3:GetBucketPolicy"
      ]
    } )
    teamManagedPolicy.addStatements( teamBucketConsoleStatement )
    //Allow reading team SSM params
    const ssmBasePath = this.props.naming.ssmPath( 'placeholder', false ).replace( "/placeholder", "" )
    const teamSSMStatement = new PolicyStatement( {
      sid: "TeamSSM",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:ssm:${ this.region }:${ this.account }:parameter${ ssmBasePath }/*`
      ],
      actions: [
        "ssm:GetParameter",
        "ssm:GetParameterHistory",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ]
    } )
    teamManagedPolicy.addStatements( teamSSMStatement )
    NagSuppressions.addResourceSuppressions(
      teamManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'SSM permissions scoped to team SSM params by path prefix'
        }
      ],
      true
    );
    return teamManagedPolicy
  }

  private createSageMakerReadPolicy (): ManagedPolicy {
    const sagemakerReadonlyManagedPolicy = new MdaaManagedPolicy( this, "read-managed-pol", {
      managedPolicyName: this.props.team.verbatimPolicyNamePrefix ? this.props.team.verbatimPolicyNamePrefix + "-" + "sm-read" : "sm-read",
      verbatimPolicyName: this.props.team.verbatimPolicyNamePrefix != undefined,
      naming: this.props.naming
    } )

    const sagemakerSearchStatement = new PolicyStatement( {
      sid: "SageMakerSearch",
      effect: Effect.ALLOW,
      resources: [
        '*'
      ],
      actions: [
        "sagemaker:Search",
      ]
    } )
    sagemakerReadonlyManagedPolicy.addStatements( sagemakerSearchStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerReadonlyManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'SageMaker Search does not take a resource. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [ 'Resource::*' ]
        }
      ],
      true
    );
    // Allow SageMaker readonly permissions
    const sagemakerListStatement = new PolicyStatement( {
      sid: "SageMakerList",
      effect: Effect.ALLOW,
      resources: [
        '*'
      ],
      actions: [
        "sagemaker:List*"
      ]
    } )
    sagemakerReadonlyManagedPolicy.addStatements( sagemakerListStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerReadonlyManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'SageMaker List does not take a resource. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [ 'Resource::*', 'Action::sagemaker:List*' ]
        }
      ],
      true
    );

    // Allow SageMaker readonly permissions
    const sagemakerDescribeGetStatement = new PolicyStatement( {
      sid: "SageMakerDescribeGet",
      effect: Effect.ALLOW,
      resources: [
        '*'
      ],
      actions: [
        "sagemaker:Describe*",
        "sagemaker:BatchDescribe*",
        "sagemaker:Get*",
        "sagemaker:BatchGet*",

      ]
    } )
    sagemakerReadonlyManagedPolicy.addStatements( sagemakerDescribeGetStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerReadonlyManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for Describe and Get not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            'Resource::*',
            'Action::sagemaker:Describe*',
            'Action::sagemaker:Get*',
            'Action::sagemaker:BatchDescribe*',
            'Action::sagemaker:BatchGet*'

          ]
        }
      ],
      true
    );

    //Allow reading of log streams for SageMaker
    const cloudwatchStatement = new PolicyStatement( {
      sid: "CloudWatchSageMaker",
      effect: Effect.ALLOW,
      resources: [ `arn:${ this.partition }:logs:${ this.region }:${ this.account }:log-group:*sagemaker*` ],
      actions: [
        "logs:GetLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:FilterLogEvents"
      ]
    } )
    sagemakerReadonlyManagedPolicy.addStatements( cloudwatchStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerReadonlyManagedPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Log Group and Stream names not known at deployment time.',
          appliesTo: [
            `Resource::arn:${ this.partition }:logs:${ this.region }:${ this.account }:log-group:*sagemaker*`,
          ]
        }
      ],
      true
    );
    return sagemakerReadonlyManagedPolicy
  }

  private createSageMakerWritePolicies ( teamBucket: IBucket, teamKey: IKey, teamExecutionRole: IRole ): ManagedPolicy[] {

    //We use two write policies in order to avoid policy length limits within IAM
    const sagemakerWriteManagedPolicy1 = new MdaaManagedPolicy( this, "ex-write-managed-pol", {
      managedPolicyName: this.props.team.verbatimPolicyNamePrefix ? this.props.team.verbatimPolicyNamePrefix + "-" + "sm-write" : "sm-write",
      verbatimPolicyName: this.props.team.verbatimPolicyNamePrefix != undefined,
      naming: this.props.naming
    } )

    //We use two write policies in order to avoid policy length limits within IAM
    //New statements should be added 
    const sagemakerWriteManagedPolicy2 = new MdaaManagedPolicy( this, "sm-write-managed-pol2", {
      managedPolicyName: this.props.team.verbatimPolicyNamePrefix ? this.props.team.verbatimPolicyNamePrefix + "-" + "sm-write-2" : "sm-write-2",
      verbatimPolicyName: this.props.team.verbatimPolicyNamePrefix != undefined,
      naming: this.props.naming
    } )

    //Allow passing of team execution role to sagemaker jobs, etc
    const teamRoleStatement = new PolicyStatement( {
      sid: "TeamRole",
      effect: Effect.ALLOW,
      resources: [
        teamExecutionRole.roleArn
      ],
      actions: [
        "iam:PassRole"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( teamRoleStatement )

    //Allow SageMaker permissions required to be used as execution role for Jobs
    const sagemakerJobStatement = new PolicyStatement( {
      sid: "CreateandManageJobs",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:*job/*`,
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:*job-definition/*`,
      ],
      actions: [
        "sagemaker:Create*Job",
        "sagemaker:Create*JobDefinition",
        "sagemaker:Delete*JobDefinition",
        "sagemaker:Update*Job",
        "sagemaker:Stop*Job"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerJobStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for Jobs not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:*job/*`,
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:*job-definition/*`,
          ]
        }
      ],
      true
    );
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Actions scoped for job management permissions, taking into account policy length limits. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Action::sagemaker:Create*Job`,
            `Action::sagemaker:Create*JobDefinition`,
            `Action::sagemaker:Delete*JobDefinition`,
            `Action::sagemaker:Delete*Job`,
            `Action::sagemaker:Update*Job`,
            `Action::sagemaker:Stop*Job`
          ]
        }
      ],
      true
    );

    //Allow SageMaker permissions required to be used as execution role for Model Monitoring Schedules
    const sagemakerModelMonitoringStatement = new PolicyStatement( {
      sid: "CreateandManageModelMonitoring",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:monitoring-schedule/*`,
      ],
      actions: [
        "sagemaker:CreateMonitoringSchedule",
        "sagemaker:UpdateMonitoringSchedule",
        "sagemaker:DeleteMonitoringSchedule"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerModelMonitoringStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for monitoring schedules not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:monitoring-schedule/*`,
          ]
        }
      ],
      true
    );

    //Allow SageMaker permissions required to create and manage model cards
    const sagemakerModelCardStatement = new PolicyStatement( {
      sid: "CreateandManageModelCards",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:model-card/*`,
      ],
      actions: [
        "sagemaker:CreateModelCard",
        "sagemaker:DeleteModelCard",
        "sagemaker:UpdateModelCard"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerModelCardStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for model cards not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:model-card/*`,
          ]
        }
      ],
      true
    );

    //Allow SageMaker permissions required to be used as execution role for Pipelines
    const sagemakerPipelineStatement = new PolicyStatement( {
      sid: "CreateandManagePipelines",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:pipeline/*`
      ],
      actions: [
        "sagemaker:CreatePipeline",
        "sagemaker:DeletePipeline",
        "sagemaker:RetryPipelineExecution",
        "sagemaker:StartPipelineExecution",
        "sagemaker:StopPipelineExecution",
        "sagemaker:SendPipelineExecutionStepSuccess",
        "sagemaker:SendPipelineExecutionStepFailure",
        "sagemaker:UpdatePipeline",
        "sagemaker:UpdatePipelineExecution",
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerPipelineStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for Pipelines not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:pipeline/*`,
          ]
        }
      ],
      true
    );
    //Allow SageMaker permissions required to create and manage models
    const sagemakerModelStatement = new PolicyStatement( {
      sid: "CreateAndManageModels",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:model/*`
      ],
      actions: [
        "sagemaker:CreateModel",
        "sagemaker:DeleteModel"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerModelStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for Models not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:model/*`
          ]
        }
      ],
      true
    );

    //Allow SageMaker permissions required to create and manage models
    const sagemakerModelPackageStatement = new PolicyStatement( {
      sid: "CreateAndManageModelPackages",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:model-package/*`,
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:model-package-group/*`
      ],
      actions: [
        "sagemaker:CreateModelPackage",
        "sagemaker:DeleteModelPackage",
        "sagemaker:UpdateModelPackage",
        "sagemaker:BatchDescribeModelPackage",
        "sagemaker:CreateModelPackageGroup",
        "sagemaker:DeleteModelPackageGroup",
        "sagemaker:DeleteModelPackageGroupPolicy",
        "sagemaker:PutModelPackageGroupPolicy"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerModelPackageStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for model packages not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:model-package/*`,
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:model-package-group/*`
          ]
        }
      ],
      true
    );

    //Allow SageMaker permissions required to create and manage projects
    const sagemakerProjectStatement = new PolicyStatement( {
      sid: "CreateAndManageProjects",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:project/*`
      ],
      actions: [
        "sagemaker:CreateProject",
        "sagemaker:DeleteProject",
        "sagemaker:UpdateProject"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerProjectStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for Projects not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:project/*`,
          ]
        }
      ],
      true
    );

    //Allow usage of Team KMS key for creating notebook instances
    const sagemakerKmsStatement = new PolicyStatement( {
      sid: "SageMakerKmsAccess",
      effect: Effect.ALLOW,
      resources: [
        teamKey.keyArn
      ],
      actions: [
        "kms:CreateGrant"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerKmsStatement )

    //Allow SageMaker permissions required to create and manage endpoints
    const sagemakerEndpointStatement = new PolicyStatement( {
      sid: "CreateAndManageEndpoints",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:endpoint/*`,
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:endpoint-config/*`
      ],
      actions: [
        "sagemaker:CreateEndpoint",
        "sagemaker:DeleteEndpoint",
        "sagemaker:UpdateEndpoint",
        "sagemaker:UpdateEndpointWeightsAndCapacities",
        "sagemaker:CreateEndpointConfig",
        "sagemaker:DeleteEndpointConfig",
        "sagemaker:InvokeEndpoint",
        "sagemaker:InvokeEndpointAsync"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerEndpointStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for endpoints are not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:endpoint/*`,
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:endpoint-config/*`
          ]
        }
      ],
      true
    );

    //Allow SageMaker permissions required to create and manage trials
    const sagemakerTrialStatement = new PolicyStatement( {
      sid: "CreateAndManageTrials",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:experiment*`
      ],
      actions: [
        "sagemaker:CreateTrial",
        "sagemaker:CreateTrialComponent",
        "sagemaker:AssociateTrialComponent",
        "sagemaker:DisassociateTrialComponent",
        "sagemaker:DeleteTrial",
        "sagemaker:DeleteTrialComponent",
        "sagemaker:UpdateTrial",
        "sagemaker:UpdateTrialComponent"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerTrialStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for experiments are not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:experiment*`
          ]
        }
      ],
      true
    );

    //Allow SageMaker permissions required to create and manage notebooks
    const sagemakerNotebookStatement = new PolicyStatement( {
      sid: "CreateAndManageNotebooks",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:notebook-instance/*`
      ],
      actions: [
        "sagemaker:CreateNotebookInstance",
        "sagemaker:UpdateNotebookInstance",
        "sagemaker:DeleteNotebookInstance",
        "sagemaker:StartNotebookInstance",
        "sagemaker:StopNotebookInstance",
        "sagemaker:CreatePresignedNotebookInstanceUrl"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerNotebookStatement )

    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for Notebook Instances not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:notebook-instance/*`
          ]
        }
      ],
      true
    );

    //Allow SageMaker permissions required to create and manage notebooks
    const sagemakerNotebookLifecycleStatement = new PolicyStatement( {
      sid: "CreateAndManageNotebookLifecycles",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:notebook-instance-lifecycle-config/*`
      ],
      actions: [
        "sagemaker:CreateNotebookInstanceLifecycleConfig",
        "sagemaker:UpdateNotebookInstanceLifecycleConfig",
        "sagemaker:DeleteNotebookInstanceLifecycleConfig"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerNotebookLifecycleStatement )

    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for Notebook Lifecycle Configs not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:notebook-instance-lifecycle-config/*`
          ]
        }
      ],
      true
    );

    // Allow access to put records to feature groups
    const sagemakerPutRecordFeatureGroupStatement = new PolicyStatement( {
      sid: "PutRecordFeatureGroups",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:feature-group/*`
      ],
      actions: [
        "sagemaker:PutRecord",
        "sagemaker:DeleteRecord"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerPutRecordFeatureGroupStatement )

    //Allow SageMaker permissions required to create online feature-groups
    //Must be encrypted with team key
    const sagemakerCreateOnlineFeatureGroupStatement = new PolicyStatement( {
      sid: "CreateOnlineFeatureGroups",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:feature-group/*`
      ],
      actions: [
        "sagemaker:CreateFeatureGroup"
      ],
      conditions: {
        "StringEquals": {
          "sagemaker:FeatureGroupOnlineStoreKmsKey": teamKey.keyArn
        }
      }
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerCreateOnlineFeatureGroupStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for FeatureGroups not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:feature-group/*`,
          ]
        }
      ],
      true
    );

    //Allow SageMaker permissions required to create offline feature-groups
    //Offline storage location must be team bucket, and must be encrypted with team key
    const sagemakerCreateOfflineFeatureGroupStatement = new PolicyStatement( {
      sid: "CreateOfflineFeatureGroups",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:feature-group/*`
      ],
      actions: [
        "sagemaker:CreateFeatureGroup"
      ],
      conditions: {
        "StringEquals": {
          "sagemaker:FeatureGroupOfflineStoreKmsKey": teamKey.keyArn
        },
        "StringLike": {
          "sagemaker:FeatureGroupOfflineStoreS3Uri": teamBucket.arnForObjects( "*" )
        }
      }
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerCreateOfflineFeatureGroupStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for FeatureGroups not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:feature-group/*`,
          ]
        }
      ],
      true
    );

    //Allow SageMaker permissions required to manage feature-groups
    const sagemakerManageFeatureGroupStatement = new PolicyStatement( {
      sid: "ManageFeatureGroups",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:feature-group/*`
      ],
      actions: [
        "sagemaker:DeleteFeatureGroup",
        "sagemaker:UpdateFeatureGroup",
        "sagemaker:UpdateFeatureMetadata"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerManageFeatureGroupStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for FeatureGroups not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:feature-group/*`,
          ]
        }
      ],
      true
    );

    //Allow SageMaker permissions required to create and manage Experiments
    const sagemakerExperimentStatement = new PolicyStatement( {
      sid: "CreateAndManageExperiments",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:experiment/*`
      ],
      actions: [
        "sagemaker:CreateExperiment",
        "sagemaker:DeleteExperiment",
        "sagemaker:UpdateExperiment"
      ]
    } )
    sagemakerWriteManagedPolicy1.addStatements( sagemakerExperimentStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy1,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for Experiments not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:experiment/*`,
          ]
        }
      ],
      true
    );

    //Allow SageMaker permissions required to add and remove tags (important for SageMaker Clarify, among others)
    const sagemakerAddDeleteTagsStatement = new PolicyStatement( {
      sid: "AddDeleteTagsSageMaker",
      effect: Effect.ALLOW,
      resources: [
        `arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:*`
      ],
      actions: [
        "sagemaker:AddTags",
        "sagemaker:DeleteTags"
      ]
    } )
    sagemakerWriteManagedPolicy2.addStatements( sagemakerAddDeleteTagsStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy2,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for tagged SageMaker resources are not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonsagemaker.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:sagemaker:${ this.region }:${ this.account }:*`,
          ]
        }
      ],
      true
    );

    //Allow EC2 permissions required to be used as execution role for VPC Bound Jobs/Pipelines
    const sagemakerEc2Statement = new PolicyStatement( {
      sid: "CreateEC2NetworkInterfaces",
      effect: Effect.ALLOW,
      resources: [
        `*`
      ],
      actions: [
        "ec2:CreateNetworkInterface",
        "ec2:CreateNetworkInterfacePermission",
        "ec2:CreateVpcEndpoint",
        "ec2:DeleteNetworkInterface",
        "ec2:DeleteNetworkInterfacePermission",
        "ec2:DescribeNetworkInterfaces",
        "ec2:DescribeSecurityGroups",
        "ec2:DescribeSubnets",
        "ec2:DescribeVpcs",
        "ec2:DescribeDhcpOptions",
        "ec2:DescribeVpcEndpoints"
      ]
    } )
    sagemakerWriteManagedPolicy2.addStatements( sagemakerEc2Statement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy2,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Network Interface ID not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html#amazonec2-network-interface',
          appliesTo: [ 'Resource::*' ]
        }
      ],
      true
    );
    //Allow SageMaker ECR permissions to pull SageMaker images from the central SageMaker repository
    const sagemakerEcrStatement = new PolicyStatement( {
      sid: "SageMakerECRReadonly",
      effect: Effect.ALLOW,
      resources: [ `arn:${ this.partition }:ecr:${ this.region }:341280168497:repository/sagemaker*` ],
      actions: [
        "ecr:ListImages",
        "ecr:DescribeImages",
        "ecr:DescribeRepositories",
        "ecr:GetDownloadUrlForLayer"
      ]
    } )

    sagemakerWriteManagedPolicy2.addStatements( sagemakerEcrStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy2,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names for SageMaker ECR not known at deployment time. https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonelasticcontainerregistry.html',
          appliesTo: [
            `Resource::arn:${ this.partition }:ecr:${ this.region }:341280168497:repository/sagemaker*`
          ]
        }
      ],
      true
    );

    //Allow creation of log groups and log streams for SageMaker
    const cloudwatchStatement = new PolicyStatement( {
      sid: "CloudWatchSageMaker",
      effect: Effect.ALLOW,
      resources: [ `arn:${ this.partition }:logs:${ this.region }:${ this.account }:log-group:*sagemaker*` ],
      actions: [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ]
    } )
    sagemakerWriteManagedPolicy2.addStatements( cloudwatchStatement )
    NagSuppressions.addResourceSuppressions(
      sagemakerWriteManagedPolicy2,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Log Group and Stream names not known at deployment time.',
          appliesTo: [
            `Resource::arn:${ this.partition }:logs:${ this.region }:${ this.account }:log-group:*sagemaker*`,
          ]
        }
      ],
      true
    );
    sagemakerWriteManagedPolicy1.checkPolicyLength( true )
    sagemakerWriteManagedPolicy2.checkPolicyLength( true )
    return [ sagemakerWriteManagedPolicy1, sagemakerWriteManagedPolicy2 ]
  }

  private createSageMakerGuardrailPolicy ( teamKey: IKey ): ManagedPolicy {
    const sagemakerGuardrailManagedPolicy = new MdaaManagedPolicy( this, "sm-guardrail-managed-pol", {
      managedPolicyName: this.props.team.verbatimPolicyNamePrefix ? this.props.team.verbatimPolicyNamePrefix + "-" + "sm-guardrail" : "sm-guardrail",
      verbatimPolicyName: this.props.team.verbatimPolicyNamePrefix != undefined,
      naming: this.props.naming
    } )
    //Enforces use of Team KMS key for SageMaker Volumes
    const sagemakerForceVolumeKmsKeyStatement = new PolicyStatement( {
      sid: "forceVolumeKmsKey",
      effect: Effect.DENY,
      resources: [
        '*'
      ],
      actions: [
        "sagemaker:CreateEndpointConfig",
        "sagemaker:CreateMonitoringSchedule",
        "sagemaker:UpdateMonitoringSchedule",
        "sagemaker:CreateNotebookInstance",
        "sagemaker:Create*Job*"
      ],
      conditions: {
        "StringNotEquals": {
          "sagemaker:VolumeKmsKey": teamKey.keyArn
        }
      }
    } )
    sagemakerGuardrailManagedPolicy.addStatements( sagemakerForceVolumeKmsKeyStatement )

    //Enforces use of Team KMS key for SageMaker Outputs
    const sagemakerForceOutputKmsKeyStatement = new PolicyStatement( {
      sid: "forceOutputKmsKey",
      effect: Effect.DENY,
      resources: [
        '*'
      ],
      actions: [
        "sagemaker:CreateMonitoringSchedule",
        "sagemaker:UpdateMonitoringSchedule",
        "sagemaker:Create*Job*"
      ],
      conditions: {
        "StringNotEquals": {
          "sagemaker:OutputKmsKey": teamKey.keyArn
        }
      }
    } )
    sagemakerGuardrailManagedPolicy.addStatements( sagemakerForceOutputKmsKeyStatement )

    const sagemakerForceIntercontainerEncryptionNonNullStatement = new PolicyStatement( {
      sid: "forceIntercontainerEncryptionNonNull",
      effect: Effect.DENY,
      resources: [
        '*'
      ],
      actions: [
        "sagemaker:CreateMonitoringSchedule",
        "sagemaker:UpdateMonitoringSchedule",
        "sagemaker:Create*Job*"
      ],
      conditions: {
        "Null": {
          "sagemaker:InterContainerTrafficEncryption": "true"
        }
      }
    } )
    sagemakerGuardrailManagedPolicy.addStatements( sagemakerForceIntercontainerEncryptionNonNullStatement )

    const sagemakerForceIntercontainerEncryptionTrueStatement = new PolicyStatement( {
      sid: "forceIntercontainerEncryptionTrue",
      effect: Effect.DENY,
      resources: [
        '*'
      ],
      actions: [
        "sagemaker:CreateMonitoringSchedule",
        "sagemaker:UpdateMonitoringSchedule",
        "sagemaker:Create*Job*"
      ],
      conditions: {
        "Bool": {
          "sagemaker:InterContainerTrafficEncryption": "false"
        }
      }
    } )
    sagemakerGuardrailManagedPolicy.addStatements( sagemakerForceIntercontainerEncryptionTrueStatement )

    const sagemakerForceJobVpc = new PolicyStatement( {
      sid: "forceJobNotebookVpc",
      effect: Effect.DENY,
      resources: [
        '*'
      ],
      actions: [
        "sagemaker:Create*Job*",
        "sagemaker:CreateNotebookInstance",
        "sagemaker:CreateMonitoringSchedule",
        "sagemaker:UpdateMonitoringSchedule",
        "sagemaker:CreateModel"
      ],
      conditions: {
        "Null": {
          "sagemaker:VpcSubnets": "true"
        }
      }
    } )
    sagemakerGuardrailManagedPolicy.addStatements( sagemakerForceJobVpc )

    const sagemakerForceSecurityGroupIds = new PolicyStatement( {
      sid: "forceJobNotebookSecurityGroups",
      effect: Effect.DENY,
      resources: [
        '*'
      ],
      actions: [
        "sagemaker:Create*Job*",
        "sagemaker:CreateNotebookInstance",
        "sagemaker:CreateMonitoringSchedule",
        "sagemaker:UpdateMonitoringSchedule",
        "sagemaker:CreateModel"
      ],
      conditions: {
        "Null": {
          "sagemaker:VpcSecurityGroupIds": "true"
        }
      }
    } )
    sagemakerGuardrailManagedPolicy.addStatements( sagemakerForceSecurityGroupIds )

    const sagemakerForceNotebookNonDirectNonNull = new PolicyStatement( {
      sid: "forceNotebookNonPublicNonNull",
      effect: Effect.DENY,
      resources: [
        '*'
      ],
      actions: [
        "sagemaker:CreateNotebookInstance"
      ],
      conditions: {
        "Null": {
          "sagemaker:DirectInternetAccess": "true"
        }
      }
    } )
    sagemakerGuardrailManagedPolicy.addStatements( sagemakerForceNotebookNonDirectNonNull )

    const sagemakerForceNotebookNonDirectDisabled = new PolicyStatement( {
      sid: "forceNotebookNonPublicDisabled",
      effect: Effect.DENY,
      resources: [
        '*'
      ],
      actions: [
        "sagemaker:CreateNotebookInstance"
      ],
      conditions: {
        "StringNotEquals": {
          "sagemaker:DirectInternetAccess": "Disabled"
        }
      }
    } )
    sagemakerGuardrailManagedPolicy.addStatements( sagemakerForceNotebookNonDirectDisabled )

    return sagemakerGuardrailManagedPolicy
  }

}
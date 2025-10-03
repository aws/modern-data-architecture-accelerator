/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents, MdaaCdkApp } from '@aws-mdaa/app';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { Schema } from 'ajv';
import { AppProps, Aspects, IAspect, Stack } from 'aws-cdk-lib';
import {
  BuildSpec,
  ComputeType,
  LinuxBuildImage,
  PipelineProject,
  PipelineProjectProps,
} from 'aws-cdk-lib/aws-codebuild';
import { IRepository, Repository } from 'aws-cdk-lib/aws-codecommit';
import { Artifact, Pipeline, PipelineProps, PipelineType } from 'aws-cdk-lib/aws-codepipeline';
import {
  CodeBuildAction,
  CodeBuildActionProps,
  CodeCommitSourceAction,
  CodeCommitTrigger,
  ManualApprovalAction,
} from 'aws-cdk-lib/aws-codepipeline-actions';
import {
  AccountPrincipal,
  CompositePrincipal,
  Effect,
  IRole,
  ManagedPolicy,
  Policy,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct, IConstruct } from 'constructs';
import * as configSchema from './config-schema.json';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR

/**
 * Q-ENHANCED-INTERFACE
 * Validation stage command configuration interface for CodeBuild validation projects that execute infrastructure testing and compliance verification during MDAA deployment pipelines. Defines install dependencies and validation commands that run in CodeBuild environments to verify deployed infrastructure meets requirements before pipeline progression.
 *
 * Use cases: Infrastructure smoke testing; Compliance verification; Deployment validation; Quality gate enforcement; Post-deployment verification
 *
 * AWS: AWS CodeBuild validation project commands with install dependencies and validation script execution for pipeline quality gates
 *
 * Validation: install commands must be valid package manager commands; commands must be executable shell scripts that return appropriate exit codes for pipeline success/failure
 */
export interface ValidateStageCommands {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of package installation commands for CodeBuild validation environment setup enabling testing tool installation and dependency management. Defines commands that will be executed during the install phase to install required testing frameworks, validation tools, and dependencies needed for infrastructure validation operations.
   *
   * Use cases: Testing tool installation; Validation dependency setup; Testing framework installation; Environment preparation; Validation tool setup
   *
   * AWS: AWS CodeBuild validation install phase commands for testing tool installation and validation environment setup
   *
   * Validation: Must be array of valid shell commands if provided; commands execute in CodeBuild Linux environment; optional for validation install phase
   **/
  readonly install?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of validation commands for infrastructure testing and compliance verification enabling quality gate enforcement. Defines commands that will be executed to validate deployed infrastructure, perform smoke tests, and verify compliance requirements before pipeline progression.
   *
   * Use cases: Infrastructure smoke testing; Compliance verification; Quality gate enforcement; Post-deployment validation; Infrastructure testing
   *
   * AWS: AWS CodeBuild validation commands for infrastructure testing and compliance verification with quality gate enforcement
   *
   * Validation: Must be array of valid shell commands if provided; commands must return appropriate exit codes for pipeline success/failure; optional for validation execution
   **/
  readonly commands?: string[];
}
/**
 * Q-ENHANCED-INTERFACE
 * Deployment stage command configuration interface for CodeBuild projects that execute custom scripts during MDAA deployment pipeline stages. Defines install dependencies, pre-deployment preparation commands, and post-deployment cleanup commands that run in CodeBuild environments to customize deployment behavior and perform environment-specific operations.
 *
 * Use cases: Environment preparation; Custom deployment scripts; Post-deployment cleanup; Infrastructure customization; Environment-specific configuration
 *
 * AWS: AWS CodeBuild project commands with install, pre-execution, and post-execution hooks for deployment stage customization
 *
 * Validation: install commands must be valid package manager commands; pre/post commands must be executable shell scripts; commands execute in CodeBuild Linux environment
 */
export interface StageCommands {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of package installation commands for CodeBuild environment setup enabling dependency management and tool installation. Defines commands that will be executed during the install phase to install required packages, dependencies, and tools needed for deployment operations.
   *
   * Use cases: Dependency installation; Tool setup; Package management; Environment preparation; Build tool installation
   *
   * AWS: AWS CodeBuild install phase commands for dependency installation and environment setup
   *
   * Validation: Must be array of valid shell commands if provided; commands execute in CodeBuild Linux environment; optional for install phase
   **/
  readonly install?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of pre-execution commands for deployment stage preparation enabling custom setup and validation before main deployment operations. Defines commands that will be executed before the main deployment stage to perform environment preparation, validation, and custom setup tasks.
   *
   * Use cases: Environment preparation; Pre-deployment validation; Custom setup; Configuration verification; Prerequisite checks
   *
   * AWS: AWS CodeBuild pre-execution commands for deployment stage preparation and validation
   *
   * Validation: Must be array of valid shell commands if provided; commands execute in CodeBuild Linux environment; optional for pre-execution phase
   **/
  readonly pre?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of post-execution commands for deployment stage cleanup and finalization enabling custom cleanup and post-deployment operations. Defines commands that will be executed after the main deployment stage to perform cleanup, notification, validation, and finalization tasks.
   *
   * Use cases: Post-deployment cleanup; Notification sending; Validation checks; Resource cleanup; Finalization tasks
   *
   * AWS: AWS CodeBuild post-execution commands for deployment stage cleanup and finalization
   *
   * Validation: Must be array of valid shell commands if provided; commands execute in CodeBuild Linux environment; optional for post-execution phase
   **/
  readonly post?: string[];
}
export interface Commands extends StageCommands {
  readonly preDeploy?: StageCommands;
  readonly preDeployValidate?: ValidateStageCommands;
  readonly deploy?: StageCommands;
  readonly postDeployValidate?: ValidateStageCommands;
}
/**
 * Q-ENHANCED-INTERFACE
 * MDAA DevOps configuration interface for CI/CD pipeline orchestration with CodeCommit repository integration and multi-environment deployment management. Defines the complete DevOps infrastructure including source repositories, deployment pipelines, and CDK bootstrap configuration for automated MDAA infrastructure deployment across multiple environments with approval gates and validation stages.
 *
 * Use cases: Multi-environment CI/CD pipelines; Automated MDAA deployments; Configuration repository management; Infrastructure change management; DevOps automation
 *
 * AWS: AWS CodePipeline with CodeCommit source repositories, CodeBuild projects for MDAA CLI execution, and CDK bootstrap integration for infrastructure deployment
 *
 * Validation: mdaaCodeCommitRepo and configsCodeCommitRepo must be valid CodeCommit repository names; pipelines must contain valid PipelineConfig objects; cdkBootstrapContext must be valid CDK qualifier
 */
export interface DevOpsConfigContents extends MdaaBaseConfigContents, Commands {
  readonly mdaaCodeCommitRepo: string;
  readonly mdaaBranch?: string;
  readonly configsCodeCommitRepo: string;
  readonly configsBranch?: string;
  readonly pipelines?: { [pipelineName: string]: PipelineConfig };
  /**
   * Q-ENHANCED-PROPERTY
   * CDK bootstrap context qualifier for identifying CDK bootstrap resources in the target environment. Defines the CDK bootstrap qualifier used to locate CDK deployment roles, buckets, and other bootstrap resources for MDAA infrastructure deployment through CI/CD pipelines.
   *
   * Use cases: CDK bootstrap resource identification; Multi-environment CDK deployment; Bootstrap resource isolation; CDK role management
   *
   * AWS: AWS CDK bootstrap resources including deployment roles and asset buckets
   *
   * Validation: Must be valid CDK bootstrap qualifier string; defaults to standard CDK qualifier if not specified; optional string
   **/
  readonly cdkBootstrapContext?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Individual pipeline configuration interface for environment-specific MDAA deployment pipelines with domain, environment, and module filtering capabilities. Defines pipeline-specific deployment parameters including target filters for selective deployment, custom command execution, and pipeline-level deployment lifecycle management for targeted infrastructure deployment within multi-domain data architectures.
 * Use cases: Environment-specific pipelines; Selective module deployment; Domain-filtered deployments; Pipeline customization; Targeted infrastructure updates
 * AWS: AWS CodePipeline configuration with domain/environment/module filtering for selective MDAA deployment targeting specific infrastructure components
 * Validation: domainFilter, envFilter, and moduleFilter must reference valid MDAA domains, environments, and modules; pipeline must inherit valid Commands configuration
 */
export interface PipelineConfig extends Commands {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of domain names for pipeline deployment filtering enabling selective domain-specific deployments. Restricts pipeline execution to only the specified MDAA domains, allowing for targeted deployment strategies and domain isolation in multi-domain data architectures.
   *
   * Use cases: Domain-specific deployments; Multi-domain filtering; Selective domain updates; Domain isolation strategies
   *
   * AWS: AWS CodePipeline domain filtering for selective MDAA domain deployment and targeted infrastructure updates
   *
   * Validation: Must be array of valid MDAA domain names if provided; domains must exist in MDAA configuration; optional for domain filtering
   **/
  readonly domainFilter?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of environment names for pipeline deployment filtering enabling selective environment-specific deployments. Restricts pipeline execution to only the specified MDAA environments, allowing for targeted deployment strategies and environment isolation across development, staging, and production environments.
   *
   * Use cases: Environment-specific deployments; Multi-environment filtering; Selective environment updates; Environment isolation strategies
   *
   * AWS: AWS CodePipeline environment filtering for selective MDAA environment deployment and targeted infrastructure updates
   *
   * Validation: Must be array of valid MDAA environment names if provided; environments must exist in MDAA configuration; optional for environment filtering
   **/
  readonly envFilter?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of module names for pipeline deployment filtering enabling selective module-specific deployments. Restricts pipeline execution to only the specified MDAA modules, allowing for targeted deployment strategies and module isolation for specific infrastructure components or services.
   *
   * Use cases: Module-specific deployments; Multi-module filtering; Selective module updates; Component isolation strategies
   *
   * AWS: AWS CodePipeline module filtering for selective MDAA module deployment and targeted infrastructure component updates
   *
   * Validation: Must be array of valid MDAA module names if provided; modules must exist in MDAA configuration; optional for module filtering
   **/
  readonly moduleFilter?: string[];
}

export class DevOpsConfigParser extends MdaaAppConfigParser<DevOpsConfigContents> {
  public readonly devopsConfig: DevOpsConfigContents;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.devopsConfig = this.configContents;
  }
}

export class MdaaDevopsCDKApp extends MdaaCdkApp {
  constructor(props?: AppProps) {
    super({ ...props, ...{ useBootstrap: false } }, MdaaCdkApp.parsePackageJson(`${__dirname}/../package.json`));
  }
  protected subGenerateResources(
    stack: Stack,
    l3ConstructProps: MdaaL3ConstructProps,
    parserProps: MdaaAppConfigParserProps,
  ) {
    const appConfig = new DevOpsConfigParser(stack, parserProps);
    new MdaaDevopsL3Construct(stack, 'devops', {
      ...l3ConstructProps,
      ...appConfig.devopsConfig,
    });
    Aspects.of(stack).add(new FixCdkBuildProject());
  }
}
export interface MdaaDevopsL3ConstructProps extends MdaaL3ConstructProps, DevOpsConfigContents {}

export class MdaaDevopsL3Construct extends MdaaL3Construct {
  private static readonly DEFAULT_CDK_BOOTSTRAP_CONTEXT = 'hnb659fds';
  private readonly props: MdaaDevopsL3ConstructProps;

  constructor(scope: Construct, id: string, props: MdaaDevopsL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    const pipelineRole = new MdaaRole(this, 'pipeline-role', {
      roleName: 'pipeline',
      naming: this.props.naming,
      assumedBy: new ServicePrincipal('codepipeline.amazonaws.com'),
    });

    const mdaaRepo = Repository.fromRepositoryName(this, 'mdaa-import-repo', this.props.mdaaCodeCommitRepo);
    const configsRepo = Repository.fromRepositoryName(this, 'configs-import-repo', this.props.configsCodeCommitRepo);

    const kmsKey = new MdaaKmsKey(this, 'kms-key', {
      naming: this.props.naming,
      keyUserRoleIds: [pipelineRole.roleId],
    });

    const devOpsBucket = new MdaaBucket(this, 'pipeline-bucket', {
      naming: this.props.naming,
      encryptionKey: kmsKey,
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      devOpsBucket,
      [
        {
          id: 'NIST.800.53.R5-S3BucketReplicationEnabled',
          reason: 'Bucket does not contain data assets. Replication not required.',
        },
        {
          id: 'HIPAA.Security-S3BucketReplicationEnabled',
          reason: 'Bucket does not contain data assets. Replication not required.',
        },
        {
          id: 'PCI.DSS.321-S3BucketReplicationEnabled',
          reason: 'Bucket does not contain data assets. Replication not required.',
        },
      ],
      true,
    );

    const codeCommitEventRole = new MdaaRole(this, 'codecommit-event-role', {
      roleName: 'codecommit-event',
      naming: this.props.naming,
      assumedBy: new ServicePrincipal('events.amazonaws.com'),
    });

    const codeCommitReadPolicy = new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['codecommit:GetBranch', 'codecommit:GetCommit', 'codecommit:GetRepository', 'codecommit:GitPull'],
          resources: [mdaaRepo.repositoryArn, configsRepo.repositoryArn],
        }),
      ],
    });

    const codeCommitActionRole = new MdaaRole(this, 'codecommit-action-role', {
      roleName: 'codecommit-action',
      naming: this.props.naming,
      assumedBy: new AccountPrincipal(this.account),
      inlinePolicies: { codecommit_read: codeCommitReadPolicy },
    });

    const codeBuildActionRole = new MdaaRole(this, 'codebuild-action-role', {
      roleName: 'codebuild-action',
      naming: this.props.naming,
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('codebuild.amazonaws.com'),
        new AccountPrincipal(this.account),
      ),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AWSCloudFormationReadOnlyAccess')],
    });

    const codeBuildActionPolicy = new Policy(this, 'codebuild-policy');
    const cdkLookupRole = this.importCdkRole(this, 'lookup', this.props.cdkBootstrapContext);
    const cdkDeployRole = this.importCdkRole(this, 'deploy', this.props.cdkBootstrapContext);
    const cdkExecRole = this.importCdkRole(this, 'exec', this.props.cdkBootstrapContext);
    const cdkFilePublishingRole = this.importCdkRole(this, 'file-publishing', this.props.cdkBootstrapContext);
    const cdkImagePublishingRole = this.importCdkRole(this, 'image-publishing', this.props.cdkBootstrapContext);
    const cdkBucket = Bucket.fromBucketName(
      this,
      `cdk-bucket-import`,
      `cdk-${this.props.cdkBootstrapContext ?? MdaaDevopsL3Construct.DEFAULT_CDK_BOOTSTRAP_CONTEXT}-assets-${
        this.account
      }-${this.region}`,
    );

    codeBuildActionPolicy.addStatements(
      new PolicyStatement({
        sid: 'ASSUMECDKROLES',
        actions: ['sts:AssumeRole'],
        resources: [
          cdkLookupRole.roleArn,
          cdkDeployRole.roleArn,
          cdkFilePublishingRole.roleArn,
          cdkImagePublishingRole.roleArn,
          cdkExecRole.roleArn,
        ],
        effect: Effect.ALLOW,
      }),
    );

    codeBuildActionPolicy.addStatements(
      new PolicyStatement({
        sid: 'S3List',
        actions: ['s3:ListAllMyBuckets'],
        resources: ['*'],
        effect: Effect.ALLOW,
      }),
      new PolicyStatement({
        sid: 'CloudFormationChangeSets',
        actions: [
          'cloudformation:CreateChangeSet',
          'cloudformation:DescribeChangeSet',
          'cloudformation:DeleteChangeSet',
        ],
        resources: ['*'],
        effect: Effect.ALLOW,
      }),
    );

    codeBuildActionPolicy.addStatements(
      new PolicyStatement({
        sid: 'CDKS3',
        actions: ['s3:Get*', 's3:Put*', 's3:List*'],
        resources: [cdkBucket.bucketArn, cdkBucket.arnForObjects('*')],
        effect: Effect.ALLOW,
      }),
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      codeBuildActionPolicy,
      [
        { id: 'AwsSolutions-IAM5', reason: 'Permissions are scoped least privilege for deployment time.' },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
      ],
      true,
    );
    codeBuildActionPolicy.attachToRole(codeBuildActionRole);
    const manualActionRole = new MdaaRole(this, 'manual-action-role', {
      roleName: 'manual-action',
      naming: this.props.naming,
      assumedBy: new AccountPrincipal(this.account),
    });

    const assumeActionRoleGrant = codeBuildActionRole.grantAssumeRole(pipelineRole);

    Object.entries(this.props.pipelines ?? {}).forEach(entry => {
      const pipelineProps: MdaaPipelineProps = {
        pipelineType: PipelineType.V2,
        naming: this.props.naming.withModuleName(`devops-${entry[0]}`),
        pipelineName: this.props.naming.resourceName(entry[0]),
        ...entry[1],
        role: pipelineRole,
        artifactBucket: devOpsBucket,
        codeCommitActionRole: codeCommitActionRole,
        codeCommitEventRole: codeCommitEventRole,
        codeBuildActionRole: codeBuildActionRole,
        mdaaRepo: mdaaRepo,
        configsRepo: configsRepo,
        kmsKey: kmsKey,
        manualActionRole: manualActionRole,
        install: [...(this.props.install ?? []), ...(entry[1].install ?? [])],
        pre: [...(this.props.pre ?? []), ...(entry[1].pre ?? [])],
        post: [...(this.props.post ?? []), ...(entry[1].post ?? [])],
        preDeploy: { ...this.props.preDeploy, ...entry[1].preDeploy },
        preDeployValidate:
          this.props.preDeployValidate || entry[1].preDeployValidate
            ? { ...this.props.preDeployValidate, ...entry[1].preDeployValidate }
            : undefined,
        deploy: { ...this.props.deploy, ...entry[1].deploy },
        postDeployValidate:
          this.props.postDeployValidate || entry[1].postDeployValidate
            ? { ...this.props.postDeployValidate, ...entry[1].postDeployValidate }
            : undefined,
      };

      const pipeline = new MdaaPipeline(this, `mdaa-pipeline-${entry[0]}`, pipelineProps);
      assumeActionRoleGrant.applyBefore(pipeline);
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      pipelineRole,
      [
        { id: 'AwsSolutions-IAM5', reason: 'Permissions are scoped least privilege for deployment time.' },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
      ],
      true,
    );
    MdaaNagSuppressions.addCodeResourceSuppressions(
      codeBuildActionRole,
      [
        { id: 'AwsSolutions-IAM4', reason: 'AWSCloudFormationReadOnlyAccess is Read Only Access' },
        { id: 'AwsSolutions-IAM5', reason: 'Permissions are scoped least privilege for deployment time.' },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
      ],
      true,
    );
    MdaaNagSuppressions.addCodeResourceSuppressions(
      codeCommitActionRole,
      [
        { id: 'AwsSolutions-IAM5', reason: 'Permissions are scoped least privilege for deployment time.' },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
      ],
      true,
    );
    MdaaNagSuppressions.addCodeResourceSuppressions(
      codeCommitEventRole,
      [
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
      ],
      true,
    );
  }

  private importCdkRole(scope: Construct, roleName: string, cdkBootstrapContext?: string): IRole {
    return Role.fromRoleName(
      scope,
      `cdk-${roleName}-role-import`,
      `cdk-${cdkBootstrapContext ?? MdaaDevopsL3Construct.DEFAULT_CDK_BOOTSTRAP_CONTEXT}-${roleName}-role-${
        Stack.of(scope).account
      }-${Stack.of(scope).region}`,
    );
  }
}

export interface MdaaPipelineProps extends PipelineProps, StageCommands, PipelineConfig {
  readonly naming: IMdaaResourceNaming;
  readonly pipelineName: string;
  readonly codeCommitActionRole: IRole;
  readonly codeCommitEventRole: IRole;
  readonly codeBuildActionRole: IRole;
  readonly mdaaRepo: IRepository;
  readonly mdaaBranch?: string;
  readonly configsRepo: IRepository;
  readonly configsBranch?: string;
  readonly kmsKey: IKey;
  readonly manualActionRole: IRole;
}

export class MdaaPipeline extends Pipeline {
  private readonly props: MdaaPipelineProps;
  constructor(scope: Construct, id: string, props: MdaaPipelineProps) {
    super(scope, id, props);
    this.props = props;

    const sourceStage = this.addStage({ stageName: 'Source' });
    const mdaaSourceOutput = new Artifact('MDAA');
    const mdaaSourceAction = this.createCodeCommitSourceAction(
      'mdaa',
      mdaaSourceOutput,
      this.props.codeCommitActionRole,
      this.props.codeCommitEventRole,
      this.props.mdaaRepo,
      this.props.mdaaBranch ?? 'main',
    );
    const configSourceOutput = new Artifact('CONFIGS');
    const configSourceAction = this.createCodeCommitSourceAction(
      'configs',
      configSourceOutput,
      this.props.codeCommitActionRole,
      this.props.codeCommitEventRole,
      this.props.configsRepo,
      this.props.configsBranch ?? 'main',
    );
    sourceStage.addAction(mdaaSourceAction);
    sourceStage.addAction(configSourceAction);

    const pipelineProjects: PipelineProject[] = [];
    const preDeployOutput = new Artifact('PREDEPLOY_OUTPUT');
    this.addPreDeployStage(configSourceOutput, mdaaSourceOutput, preDeployOutput, pipelineProjects);
    this.addPreDeployValidateStage(preDeployOutput, pipelineProjects);
    this.addDeployStage(preDeployOutput, pipelineProjects);
    this.addPostDeployValidateStage(preDeployOutput, pipelineProjects);

    const codeBuildActionPolicy = new Policy(this, 'codebuild-action-policy', {
      statements: [
        new PolicyStatement({
          actions: ['codebuild:StartBuild'],
          resources: pipelineProjects.map(x => x.projectArn),
          effect: Effect.ALLOW,
        }),
      ],
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      codeBuildActionPolicy,
      [
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
      ],
      true,
    );

    this.props.codeBuildActionRole.attachInlinePolicy(codeBuildActionPolicy);
  }

  private addPostDeployValidateStage(preDeployOutput: Artifact, pipelineProjects: PipelineProject[]) {
    if (this.props.postDeployValidate) {
      const [validateAction, validateProject] = this.createCodeBuildAction(
        'PostDeployValidate',
        preDeployOutput,
        undefined,
        undefined,
        {
          installCommands: [...(this.props.install ?? []), ...(this.props.postDeployValidate?.install ?? [])],
          preCommands: undefined,
          commands: [...(this.props.postDeployValidate?.commands ?? [])],
        },
      );

      pipelineProjects.push(validateProject);
      const postDeployValidateStage = this.addStage({
        stageName: 'Post-Deploy-Validate',
      });
      postDeployValidateStage.addAction(validateAction);
    }
  }

  private addDeployStage(preDeployOutput: Artifact, pipelineProjects: PipelineProject[]) {
    const deployStage = this.addStage({ stageName: 'Deploy' });
    const [deployAction, deployProject] = this.createCodeBuildAction(
      'Deploy',

      preDeployOutput,
      undefined,
      undefined,
      {
        installCommands: ['n 18', ...(this.props.install ?? []), ...(this.props.deploy?.install ?? [])],
        preCommands: [...(this.props.pre ?? []), ...(this.props.deploy?.pre ?? [])],
        commands: [this.createMdaaCommand('deploy')],
        postCommands: [...(this.props.post ?? []), ...(this.props.deploy?.post ?? [])],
      },
    );
    deployStage.addAction(deployAction);
    pipelineProjects.push(deployProject);
  }
  private addPreDeployValidateStage(preDeployOutput: Artifact, pipelineProjects: PipelineProject[]) {
    const preDeployValidateStage = this.addStage({
      stageName: 'Pre-Deploy-Validate',
    });
    if (this.props.preDeployValidate) {
      const [validateAction, validateProject] = this.createCodeBuildAction(
        'PreDeployValidate',
        preDeployOutput,
        undefined,
        undefined,
        {
          installCommands: [...(this.props.install ?? []), ...(this.props.preDeployValidate?.install ?? [])],
          preCommands: undefined,
          commands: [...(this.props.preDeployValidate?.commands ?? [])],
        },
      );
      preDeployValidateStage.addAction(validateAction);
      pipelineProjects.push(validateProject);
    }
    preDeployValidateStage.addAction(
      new ManualApprovalAction({
        actionName: 'Approve',
        role: this.props.manualActionRole,
      }),
    );
  }

  private addPreDeployStage(
    configSourceOutput: Artifact,
    mdaaSourceOutput: Artifact,
    preDeployOutput: Artifact,
    pipelineProjects: PipelineProject[],
  ): PipelineProject {
    const preDeployStage = this.addStage({ stageName: 'Pre-Deploy' });

    const [diffAction, diffProject] = this.createCodeBuildAction(
      'Synth-And-Diff',
      configSourceOutput,
      [mdaaSourceOutput],
      [preDeployOutput],
      {
        installCommands: [
          'n 18',
          'ln -s $CODEBUILD_SRC_DIR_MDAA ./mdaa',
          ...(this.props.install ?? []),
          ...(this.props.preDeploy?.install ?? []),
        ],
        preCommands: [...(this.props.pre ?? []), ...(this.props.preDeploy?.pre ?? [])],
        commands: [this.createMdaaCommand('diff')],
        postCommands: [...(this.props.post ?? []), ...(this.props.preDeploy?.post ?? [])],
      },
    );
    preDeployStage.addAction(diffAction);
    pipelineProjects.push(diffProject);
    return diffProject;
  }

  private createCodeCommitSourceAction(
    actionName: string,
    output: Artifact,
    role: IRole,
    eventRole: IRole,
    repository: IRepository,
    branch: string,
  ): CodeCommitSourceAction {
    return new CodeCommitSourceAction({
      output,
      actionName: actionName,
      role: role,
      runOrder: undefined,
      branch: branch,
      trigger: CodeCommitTrigger.EVENTS,
      repository: repository,
      eventRole: eventRole,
      codeBuildCloneOutput: true,
    });
  }

  private createMdaaCommand(mdaaAction: string): string {
    const mdaaCmd = [`./mdaa/bin/mdaa ${mdaaAction}`];
    if (this.props.domainFilter) {
      mdaaCmd.push(`-d ${this.props.domainFilter.join(',')}`);
    }
    if (this.props.envFilter) {
      mdaaCmd.push(`-e ${this.props.envFilter.join(',')}`);
    }
    if (this.props.moduleFilter) {
      mdaaCmd.push(`-m ${this.props.moduleFilter.join(',')}`);
    }
    return mdaaCmd.join(' ');
  }

  private createCodeBuildAction(
    actionName: string,
    input: Artifact,
    extraInputs?: Artifact[],
    outputs?: Artifact[],
    commands?: {
      installCommands?: string[];
      preCommands?: string[];
      commands?: string[];
      postCommands?: string[];
    },
  ): [CodeBuildAction, PipelineProject] {
    const projectProps: PipelineProjectProps = {
      projectName: this.props.naming.resourceName(actionName),
      encryptionKey: this.props.kmsKey,
      role: this.props.codeBuildActionRole,
      environment: {
        computeType: ComputeType.X2_LARGE,
        buildImage: LinuxBuildImage.AMAZON_LINUX_2_5,
      },
      buildSpec: BuildSpec.fromObject({
        version: '0.2',
        phases: {
          install: {
            commands: commands?.installCommands,
          },
          pre_build: {
            commands: commands?.preCommands,
          },
          build: {
            commands: commands?.commands,
          },
          post_build: {
            commands: commands?.postCommands,
          },
        },
        artifacts: {
          files: ['**/*'],
          'enable-symlinks': 'yes',
        },
      }),
    };

    const codeBuildProject = new PipelineProject(this, `codebuild-project-${actionName}`, projectProps);
    const codeBuildActionProps: CodeBuildActionProps = {
      input: input,
      extraInputs: extraInputs,
      actionName: actionName,
      project: codeBuildProject,
      role: this.props.codeBuildActionRole,
      outputs: outputs,
    };

    const action = new CodeBuildAction(codeBuildActionProps);
    return [action, codeBuildProject];
  }
}

class FixCdkBuildProject implements IAspect {
  public visit(construct: IConstruct): void {
    if (construct.node.id.startsWith('codebuild-project')) {
      MdaaNagSuppressions.addCodeResourceSuppressions(
        construct,
        [
          { id: 'HIPAA.Security-CodeBuildProjectSourceRepoUrl', reason: 'Pipeline source is CodeCommit.' },
          { id: 'PCI.DSS.321-CodeBuildProjectSourceRepoUrl', reason: 'Pipeline source is CodeCommit.' },
        ],
        true,
      );
    }
  }
}

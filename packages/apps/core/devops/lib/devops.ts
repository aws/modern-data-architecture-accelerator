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
import { BuildSpec, ComputeType, LinuxBuildImage, PipelineProject, PipelineProjectProps } from 'aws-cdk-lib/aws-codebuild';
import { IRepository, Repository } from 'aws-cdk-lib/aws-codecommit';
import { Artifact, Pipeline, PipelineProps, PipelineType } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction, CodeBuildActionProps, CodeCommitSourceAction, CodeCommitTrigger, ManualApprovalAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { AccountPrincipal, CompositePrincipal, Effect, IRole, ManagedPolicy, Policy, PolicyDocument, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { NagSuppressions } from 'cdk-nag';
import { Construct, IConstruct } from 'constructs';
import * as configSchema from './config-schema.json';

export interface ValidateStageCommands {
    readonly install?: string[]
    readonly commands?: string[]
}

export interface StageCommands {
    readonly install?: string[]
    readonly pre?: string[]
    readonly post?: string[]
}

export interface Commands extends StageCommands {
    readonly preDeploy?: StageCommands
    readonly preDeployValidate?: ValidateStageCommands
    readonly deploy?: StageCommands
    readonly postDeployValidate?: ValidateStageCommands
}

export interface DevOpsConfigContents extends MdaaBaseConfigContents, Commands {
    readonly mdaaCodeCommitRepo: string
    readonly mdaaBranch?: string
    readonly configsCodeCommitRepo: string
    readonly configsBranch?: string
    readonly pipelines?: { [ pipelineName: string ]: PipelineConfig }
    readonly cdkBootstrapContext?: string
}

export interface PipelineConfig extends Commands {
    readonly domainFilter?: string[]
    readonly envFilter?: string[]
    readonly moduleFilter?: string[]
}

export class DevOpsConfigParser extends MdaaAppConfigParser<DevOpsConfigContents> {

    public readonly devopsConfig: DevOpsConfigContents

    constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )

        this.devopsConfig = this.configContents

    }

}



export class MdaaDevopsCDKApp extends MdaaCdkApp {
    constructor( props?: AppProps ) {
        super( "devops", { ...props, ...{ useBootstrap: false } } )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: MdaaL3ConstructProps, parserProps: MdaaAppConfigParserProps ) {
        const appConfig = new DevOpsConfigParser( stack, parserProps )
        new MdaaDevopsL3Construct( stack, 'devops', {
            ...l3ConstructProps,
            ...appConfig.devopsConfig
        } )
        Aspects.of( stack ).add( new FixCdkBuildProject() );
    }
}
export interface MdaaDevopsL3ConstructProps extends MdaaL3ConstructProps, DevOpsConfigContents { }

export class MdaaDevopsL3Construct extends MdaaL3Construct {
    private static readonly DEFAULT_CDK_BOOTSTRAP_CONTEXT = "hnb659fds"
    private readonly props: MdaaDevopsL3ConstructProps

    constructor( scope: Construct, id: string, props: MdaaDevopsL3ConstructProps ) {
        super( scope, id, props )
        this.props = props

        const pipelineRole = new MdaaRole( this, 'pipeline-role', {
            roleName: 'pipeline',
            naming: this.props.naming,
            assumedBy: new ServicePrincipal( 'codepipeline.amazonaws.com' )
        } )

        const mdaaRepo = Repository.fromRepositoryName( this, "mdaa-import-repo", this.props.mdaaCodeCommitRepo )
        const configsRepo = Repository.fromRepositoryName( this, "configs-import-repo", this.props.configsCodeCommitRepo )

        const kmsKey = new MdaaKmsKey( this, 'kms-key', {
            naming: this.props.naming,
            keyUserRoleIds: [ pipelineRole.roleId ]
        } )

        const devOpsBucket = new MdaaBucket( this, 'pipeline-bucket', {
            naming: this.props.naming,
            encryptionKey: kmsKey,
        } )

        NagSuppressions.addResourceSuppressions(
            devOpsBucket,
            [
                { id: 'NIST.800.53.R5-S3BucketReplicationEnabled', reason: 'Bucket does not contain data assets. Replication not required.' },
                { id: 'HIPAA.Security-S3BucketReplicationEnabled', reason: 'Bucket does not contain data assets. Replication not required.' }
            ],
            true
        );

        const codeCommitEventRole = new MdaaRole( this, 'codecommit-event-role', {
            roleName: 'codecommit-event',
            naming: this.props.naming,
            assumedBy: new ServicePrincipal( 'events.amazonaws.com' )
        } )

        const codeCommitReadPolicy = new PolicyDocument( {
            statements: [ new PolicyStatement( {
                effect: Effect.ALLOW,
                actions: [
                    "codecommit:GetBranch",
                    "codecommit:GetCommit",
                    "codecommit:GetRepository",
                    "codecommit:GitPull",
                ],
                resources: [
                    mdaaRepo.repositoryArn,
                    configsRepo.repositoryArn
                ]
            } )
            ]
        } )

        const codeCommitActionRole = new MdaaRole( this, 'codecommit-action-role', {
            roleName: 'codecommit-action',
            naming: this.props.naming,
            assumedBy: new AccountPrincipal( this.account ),
            inlinePolicies: { "codecommit_read": codeCommitReadPolicy }
        } )

        const codeBuildActionRole = new MdaaRole( this, 'codebuild-action-role', {
            roleName: 'codebuild-action',
            naming: this.props.naming,
            assumedBy: new CompositePrincipal( new ServicePrincipal( "codebuild.amazonaws.com" ), new AccountPrincipal( this.account ) ),
            managedPolicies: [ ManagedPolicy.fromAwsManagedPolicyName( "AWSCloudFormationReadOnlyAccess" ) ]
        } )

        const codeBuildActionPolicy = new Policy( this, "codebuild-policy" )
        const cdkLookupRole = this.importCdkRole( this, "lookup", this.props.cdkBootstrapContext )
        const cdkDeployRole = this.importCdkRole( this, "deploy", this.props.cdkBootstrapContext )
        const cdkExecRole = this.importCdkRole( this, "exec", this.props.cdkBootstrapContext )
        const cdkFilePublishingRole = this.importCdkRole( this, "file-publishing", this.props.cdkBootstrapContext )
        const cdkImagePublishingRole = this.importCdkRole( this, "image-publishing", this.props.cdkBootstrapContext )
        const cdkBucket = Bucket.fromBucketName( this, `cdk-bucket-import`, `cdk-${ this.props.cdkBootstrapContext ?? MdaaDevopsL3Construct.DEFAULT_CDK_BOOTSTRAP_CONTEXT }-assets-${ this.account }-${ this.region }` )

        codeBuildActionPolicy.addStatements( new PolicyStatement( {
            sid: "ASSUMECDKROLES",
            actions: [
                "sts:AssumeRole"
            ],
            resources: [
                cdkLookupRole.roleArn,
                cdkDeployRole.roleArn,
                cdkFilePublishingRole.roleArn,
                cdkImagePublishingRole.roleArn,
                cdkExecRole.roleArn
            ],
            effect: Effect.ALLOW
        } ) )

        codeBuildActionPolicy.addStatements( new PolicyStatement( {
            sid: "S3List",
            actions: [
                "s3:ListAllMyBuckets"
            ],
            resources: [ "*" ],
            effect: Effect.ALLOW
        } ),
            new PolicyStatement( {
                sid: "CloudFormationChangeSets",
                actions: [
                    "cloudformation:CreateChangeSet",
                    "cloudformation:DescribeChangeSet",
                    "cloudformation:DeleteChangeSet",
                ],
                resources: [ "*" ],
                effect: Effect.ALLOW
            } ) )

        codeBuildActionPolicy.addStatements(
            new PolicyStatement( {
                sid: "CDKS3",
                actions: [
                    "s3:Get*",
                    "s3:Put*",
                    "s3:List*"
                ],
                resources: [
                    cdkBucket.bucketArn,
                    cdkBucket.arnForObjects( "*" )
                ],
                effect: Effect.ALLOW
            } ) )

        NagSuppressions.addResourceSuppressions(
            codeBuildActionPolicy,
            [
                { id: 'AwsSolutions-IAM5', reason: 'Permissions are scoped least privilege for deployment time.' },
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
                { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' }
            ],
            true
        );
        codeBuildActionPolicy.attachToRole( codeBuildActionRole )
        const manualActionRole = new MdaaRole( this, 'manual-action-role', {
            roleName: 'manual-action',
            naming: this.props.naming,
            assumedBy: new AccountPrincipal( this.account ),
        } )

        const assumeActionRoleGrant = codeBuildActionRole.grantAssumeRole( pipelineRole )

        Object.entries( this.props.pipelines ?? {} ).forEach( entry => {
            const pipelineProps: MdaaPipelineProps = {
                pipelineType: PipelineType.V2,
                naming: this.props.naming.withModuleName( `devops-${ entry[ 0 ] }` ),
                pipelineName: this.props.naming.resourceName( entry[ 0 ] ),
                ...entry[ 1 ],
                role: pipelineRole,
                artifactBucket: devOpsBucket,
                codeCommitActionRole: codeCommitActionRole,
                codeCommitEventRole: codeCommitEventRole,
                codeBuildActionRole: codeBuildActionRole,
                mdaaRepo: mdaaRepo,
                configsRepo: configsRepo,
                kmsKey: kmsKey,
                manualActionRole: manualActionRole,
                install: [ ...this.props.install ?? [], ...entry[ 1 ].install ?? [] ],
                pre: [ ...this.props.pre ?? [], ...entry[ 1 ].pre ?? [] ],
                post: [ ...this.props.post ?? [], ...entry[ 1 ].post ?? [] ],
                preDeploy: { ...this.props.preDeploy, ...entry[ 1 ].preDeploy },
                preDeployValidate: this.props.preDeployValidate || entry[ 1 ].preDeployValidate ? { ...this.props.preDeployValidate, ...entry[ 1 ].preDeployValidate } : undefined,
                deploy: { ...this.props.deploy, ...entry[ 1 ].deploy },
                postDeployValidate: this.props.postDeployValidate || entry[ 1 ].postDeployValidate ? { ...this.props.postDeployValidate, ...entry[ 1 ].postDeployValidate } : undefined,
            }

            const pipeline = new MdaaPipeline( this, `mdaa-pipeline-${ entry[ 0 ] }`, pipelineProps )
            assumeActionRoleGrant.applyBefore( pipeline )
        } )

        NagSuppressions.addResourceSuppressions(
            pipelineRole,
            [
                { id: 'AwsSolutions-IAM5', reason: 'Permissions are scoped least privilege for deployment time.' },
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
                { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' }
            ],
            true
        );
        NagSuppressions.addResourceSuppressions(
            codeBuildActionRole,
            [
                { id: 'AwsSolutions-IAM4', reason: 'AWSCloudFormationReadOnlyAccess is Read Only Access' },
                { id: 'AwsSolutions-IAM5', reason: 'Permissions are scoped least privilege for deployment time.' },
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
                { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' }
            ],
            true
        );
        NagSuppressions.addResourceSuppressions(
            codeCommitActionRole,
            [
                { id: 'AwsSolutions-IAM5', reason: 'Permissions are scoped least privilege for deployment time.' },
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
                { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' }
            ],
            true
        );
        NagSuppressions.addResourceSuppressions(
            codeCommitEventRole,
            [
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
                { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' }
            ],
            true
        );

    }

    private importCdkRole ( scope: Construct, roleName: string, cdkBootstrapContext?: string ): IRole {
        return Role.fromRoleName( scope, `cdk-${ roleName }-role-import`, `cdk-${ cdkBootstrapContext ?? MdaaDevopsL3Construct.DEFAULT_CDK_BOOTSTRAP_CONTEXT }-${ roleName }-role-${ Stack.of( scope ).account }-${ Stack.of( scope ).region }` )
    }
}

export interface MdaaPipelineProps extends PipelineProps, StageCommands, PipelineConfig {
    readonly naming: IMdaaResourceNaming,
    readonly pipelineName: string,
    readonly codeCommitActionRole: IRole
    readonly codeCommitEventRole: IRole
    readonly codeBuildActionRole: IRole
    readonly mdaaRepo: IRepository
    readonly mdaaBranch?: string
    readonly configsRepo: IRepository
    readonly configsBranch?: string
    readonly kmsKey: IKey
    readonly manualActionRole: IRole
}

export class MdaaPipeline extends Pipeline {
    private readonly props: MdaaPipelineProps
    constructor( scope: Construct, id: string, props: MdaaPipelineProps ) {
        super( scope, id, props )
        this.props = props

        const sourceStage = this.addStage( { stageName: 'Source' } );
        const mdaaSourceOutput = new Artifact( 'MDAA' );
        const mdaaSourceAction = this.createCodeCommitSourceAction( "mdaa", mdaaSourceOutput, this.props.codeCommitActionRole, this.props.codeCommitEventRole, this.props.mdaaRepo, this.props.mdaaBranch ?? "main" )
        const configSourceOutput = new Artifact( 'CONFIGS' )
        const configSourceAction = this.createCodeCommitSourceAction( "configs", configSourceOutput, this.props.codeCommitActionRole, this.props.codeCommitEventRole, this.props.configsRepo, this.props.configsBranch ?? "main" )
        sourceStage.addAction( mdaaSourceAction );
        sourceStage.addAction( configSourceAction );

        const pipelineProjects: PipelineProject[] = []
        const preDeployOutput = new Artifact( 'PREDEPLOY_OUTPUT' );
        this.addPreDeployStage( configSourceOutput, mdaaSourceOutput, preDeployOutput, pipelineProjects )
        this.addPreDeployValidateStage( preDeployOutput, pipelineProjects )
        this.addDeployStage( preDeployOutput, pipelineProjects )
        this.addPostDeployValidateStage( preDeployOutput, pipelineProjects )

        const codeBuildActionPolicy = new Policy( this, 'codebuild-action-policy', {
            statements: [
                new PolicyStatement( {
                    actions: [ "codebuild:StartBuild" ],
                    resources: pipelineProjects.map( x => x.projectArn ),
                    effect: Effect.ALLOW
                } )
            ]
        } )

        NagSuppressions.addResourceSuppressions(
            codeBuildActionPolicy,
            [
                { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' },
                { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Inline policy appropriate.' }
            ],
            true
        );

        this.props.codeBuildActionRole.attachInlinePolicy( codeBuildActionPolicy )
    }

    private addPostDeployValidateStage ( preDeployOutput: Artifact, pipelineProjects: PipelineProject[] ) {
        if ( this.props.postDeployValidate ) {
            const [ validateAction, validateProject ] = this.createCodeBuildAction(
                "PostDeployValidate",
                preDeployOutput,
                undefined,
                undefined,
                {
                    installCommands: [
                        ...this.props.install ?? [],
                        ...this.props.postDeployValidate?.install ?? [],
                    ],
                    preCommands: undefined,
                    commands: [ ...this.props.postDeployValidate?.commands ?? [] ]
                }
            )

            pipelineProjects.push( validateProject )
            const postDeployValidateStage = this.addStage( {
                stageName: 'Post-Deploy-Validate',
            } );
            postDeployValidateStage.addAction( validateAction )
        }
    }

    private addDeployStage ( preDeployOutput: Artifact, pipelineProjects: PipelineProject[] ) {
        const deployStage = this.addStage( { stageName: 'Deploy' } );
        const [ deployAction, deployProject ] = this.createCodeBuildAction(
            "Deploy",

            preDeployOutput,
            undefined,
            undefined,
            {
                installCommands: [
                    "n 18",
                    ...this.props.install ?? [],
                    ...this.props.deploy?.install ?? [],
                ],
                preCommands: [
                    ...this.props.pre ?? [],
                    ...this.props.deploy?.pre ?? [],
                ],
                commands: [ this.createMdaaCommand( 'deploy' ) ],
                postCommands: [
                    ...this.props.post ?? [],
                    ...this.props.deploy?.post ?? [],
                ]
            } )
        deployStage.addAction( deployAction )
        pipelineProjects.push( deployProject )
    }
    private addPreDeployValidateStage ( preDeployOutput: Artifact, pipelineProjects: PipelineProject[] ) {
        const preDeployValidateStage = this.addStage( {
            stageName: 'Pre-Deploy-Validate',
        } );
        if ( this.props.preDeployValidate ) {
            const [ validateAction, validateProject ] = this.createCodeBuildAction(
                "PreDeployValidate",
                preDeployOutput,
                undefined,
                undefined,
                {
                    installCommands: [
                        ...this.props.install ?? [],
                        ...this.props.preDeployValidate?.install ?? []
                    ],
                    preCommands: undefined,
                    commands: [ ...this.props.preDeployValidate?.commands ?? [] ]
                } )
            preDeployValidateStage.addAction( validateAction )
            pipelineProjects.push( validateProject )
        }
        preDeployValidateStage.addAction( new ManualApprovalAction( {
            actionName: 'Approve',
            role: this.props.manualActionRole
        } ) )
    }

    private addPreDeployStage ( configSourceOutput: Artifact,
        mdaaSourceOutput: Artifact,
        preDeployOutput: Artifact,
        pipelineProjects: PipelineProject[] ): PipelineProject {
        const preDeployStage = this.addStage( { stageName: 'Pre-Deploy' } );

        const [ diffAction, diffProject ] = this.createCodeBuildAction(
            "Synth-And-Diff",
            configSourceOutput,
            [ mdaaSourceOutput ],
            [ preDeployOutput ],
            {
                installCommands: [
                    "n 18",
                    "ln -s $CODEBUILD_SRC_DIR_MDAA ./mdaa",
                    ...this.props.install ?? [],
                    ...this.props.preDeploy?.install ?? []
                ],
                preCommands: [
                    ...this.props.pre ?? [],
                    ...this.props.preDeploy?.pre ?? [],
                ],
                commands: [ this.createMdaaCommand( 'diff' ) ],
                postCommands: [
                    ...this.props.post ?? [],
                    ...this.props.preDeploy?.post ?? [],
                ]
            }
        )
        preDeployStage.addAction( diffAction )
        pipelineProjects.push( diffProject )
        return diffProject
    }

    private createCodeCommitSourceAction ( actionName: string,
        output: Artifact,
        role: IRole,
        eventRole: IRole,
        repository: IRepository,
        branch: string, ): CodeCommitSourceAction {
        return new CodeCommitSourceAction( {
            output,
            actionName: actionName,
            role: role,
            runOrder: undefined,
            branch: branch,
            trigger: CodeCommitTrigger.EVENTS,
            repository: repository,
            eventRole: eventRole,
            codeBuildCloneOutput: true
        } )
    }

    private createMdaaCommand ( mdaaAction: string ): string {
        const mdaaCmd = [ `./mdaa/bin/mdaa ${ mdaaAction }` ]
        if ( this.props.domainFilter ) {
            mdaaCmd.push( `-d ${ this.props.domainFilter.join( "," ) }` )
        }
        if ( this.props.envFilter ) {
            mdaaCmd.push( `-e ${ this.props.envFilter.join( "," ) }` )
        }
        if ( this.props.moduleFilter ) {
            mdaaCmd.push( `-m ${ this.props.moduleFilter.join( "," ) }` )
        }
        return mdaaCmd.join( " " )
    }

    private createCodeBuildAction (
        actionName: string,
        input: Artifact,
        extraInputs?: Artifact[],
        outputs?: Artifact[],
        commands?: {
            installCommands?: string[],
            preCommands?: string[],
            commands?: string[],
            postCommands?: string[]
        } ): [ CodeBuildAction, PipelineProject ] {

        const projectProps: PipelineProjectProps = {
            projectName: this.props.naming.resourceName( actionName ),
            encryptionKey: this.props.kmsKey,
            role: this.props.codeBuildActionRole,
            environment: {
                computeType: ComputeType.X2_LARGE,
                buildImage: LinuxBuildImage.AMAZON_LINUX_2_5
            },
            buildSpec: BuildSpec.fromObject(
                {
                    version: '0.2',
                    phases: {
                        install: {
                            commands: commands?.installCommands,
                        },
                        pre_build: {
                            commands: commands?.preCommands
                        },
                        build: {
                            commands: commands?.commands
                        },
                        post_build: {
                            commands: commands?.postCommands
                        }
                    },
                    artifacts: {
                        files: [
                            '**/*'
                        ],
                        "enable-symlinks": "yes",
                    }
                }
            )
        }

        const codeBuildProject = new PipelineProject( this, `codebuild-project-${ actionName }`, projectProps )
        const codeBuildActionProps: CodeBuildActionProps = {
            input: input,
            extraInputs: extraInputs,
            actionName: actionName,
            project: codeBuildProject,
            role: this.props.codeBuildActionRole,
            outputs: outputs
        }

        const action = new CodeBuildAction( codeBuildActionProps )
        return [ action, codeBuildProject ]
    }
}

class FixCdkBuildProject implements IAspect {

    public visit ( construct: IConstruct ): void {
        if ( construct.node.id.startsWith( 'codebuild-project' ) ) {
            NagSuppressions.addResourceSuppressions(
                construct,
                [
                    { id: 'HIPAA.Security-CodeBuildProjectSourceRepoUrl', reason: 'Pipeline source is CodeCommit.' }
                ],
                true
            );
        }
    }
}



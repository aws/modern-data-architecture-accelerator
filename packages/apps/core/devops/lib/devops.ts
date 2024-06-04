/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents, CaefCdkApp } from '@aws-caef/app';
import { CaefRole } from '@aws-caef/iam-constructs';
import { CaefKmsKey } from '@aws-caef/kms-constructs';
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { ICaefResourceNaming } from '@aws-caef/naming';
import { CaefBucket } from '@aws-caef/s3-constructs';
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

export interface DevOpsConfigContents extends CaefBaseConfigContents, Commands {
    readonly caefCodeCommitRepo: string
    readonly caefBranch?: string
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

export class DevOpsConfigParser extends CaefAppConfigParser<DevOpsConfigContents> {

    public readonly devopsConfig: DevOpsConfigContents

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )

        this.devopsConfig = this.configContents

    }

}



export class CaefDevopsCDKApp extends CaefCdkApp {
    constructor( props?: AppProps ) {
        super( "devops", { ...props, ...{ useBootstrap: false } } )
    }
    protected subGenerateResources ( stack: Stack, l3ConstructProps: CaefL3ConstructProps, parserProps: CaefAppConfigParserProps ) {
        const appConfig = new DevOpsConfigParser( stack, parserProps )
        new CaefDevopsL3Construct( stack, 'devops', {
            ...l3ConstructProps,
            ...appConfig.devopsConfig
        } )
        Aspects.of( stack ).add( new FixCdkBuildProject() );
    }
}
export interface CaefDevopsL3ConstructProps extends CaefL3ConstructProps, DevOpsConfigContents { }

export class CaefDevopsL3Construct extends CaefL3Construct {
    private static readonly DEFAULT_CDK_BOOTSTRAP_CONTEXT = "hnb659fds"
    private readonly props: CaefDevopsL3ConstructProps

    constructor( scope: Construct, id: string, props: CaefDevopsL3ConstructProps ) {
        super( scope, id, props )
        this.props = props

        const pipelineRole = new CaefRole( this, 'pipeline-role', {
            roleName: 'pipeline',
            naming: this.props.naming,
            assumedBy: new ServicePrincipal( 'codepipeline.amazonaws.com' )
        } )

        const caefRepo = Repository.fromRepositoryName( this, "caef-import-repo", this.props.caefCodeCommitRepo )
        const configsRepo = Repository.fromRepositoryName( this, "configs-import-repo", this.props.configsCodeCommitRepo )

        const kmsKey = new CaefKmsKey( this, 'kms-key', {
            naming: this.props.naming,
            keyUserRoleIds: [ pipelineRole.roleId ]
        } )

        const devOpsBucket = new CaefBucket( this, 'pipeline-bucket', {
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

        const codeCommitEventRole = new CaefRole( this, 'codecommit-event-role', {
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
                    caefRepo.repositoryArn,
                    configsRepo.repositoryArn
                ]
            } )
            ]
        } )

        const codeCommitActionRole = new CaefRole( this, 'codecommit-action-role', {
            roleName: 'codecommit-action',
            naming: this.props.naming,
            assumedBy: new AccountPrincipal( this.account ),
            inlinePolicies: { "codecommit_read": codeCommitReadPolicy }
        } )

        const codeBuildActionRole = new CaefRole( this, 'codebuild-action-role', {
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
        const cdkBucket = Bucket.fromBucketName( this, `cdk-bucket-import`, `cdk-${ this.props.cdkBootstrapContext ?? CaefDevopsL3Construct.DEFAULT_CDK_BOOTSTRAP_CONTEXT }-assets-${ this.account }-${ this.region }` )

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
        const manualActionRole = new CaefRole( this, 'manual-action-role', {
            roleName: 'manual-action',
            naming: this.props.naming,
            assumedBy: new AccountPrincipal( this.account ),
        } )

        const assumeActionRoleGrant = codeBuildActionRole.grantAssumeRole( pipelineRole )

        Object.entries( this.props.pipelines ?? {} ).forEach( entry => {
            const pipelineProps: CaefPipelineProps = {
                pipelineType: PipelineType.V2,
                naming: this.props.naming.withModuleName( `devops-${ entry[ 0 ] }` ),
                pipelineName: this.props.naming.resourceName( entry[ 0 ] ),
                ...entry[ 1 ],
                role: pipelineRole,
                artifactBucket: devOpsBucket,
                codeCommitActionRole: codeCommitActionRole,
                codeCommitEventRole: codeCommitEventRole,
                codeBuildActionRole: codeBuildActionRole,
                caefRepo: caefRepo,
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

            const pipeline = new CaefPipeline( this, `caef-pipeline-${ entry[ 0 ] }`, pipelineProps )
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
        return Role.fromRoleName( scope, `cdk-${ roleName }-role-import`, `cdk-${ cdkBootstrapContext ?? CaefDevopsL3Construct.DEFAULT_CDK_BOOTSTRAP_CONTEXT }-${ roleName }-role-${ Stack.of( scope ).account }-${ Stack.of( scope ).region }` )
    }
}

export interface CaefPipelineProps extends PipelineProps, StageCommands, PipelineConfig {
    readonly naming: ICaefResourceNaming,
    readonly pipelineName: string,
    readonly codeCommitActionRole: IRole
    readonly codeCommitEventRole: IRole
    readonly codeBuildActionRole: IRole
    readonly caefRepo: IRepository
    readonly caefBranch?: string
    readonly configsRepo: IRepository
    readonly configsBranch?: string
    readonly kmsKey: IKey
    readonly manualActionRole: IRole
}

export class CaefPipeline extends Pipeline {
    private readonly props: CaefPipelineProps
    constructor( scope: Construct, id: string, props: CaefPipelineProps ) {
        super( scope, id, props )
        this.props = props

        const sourceStage = this.addStage( { stageName: 'Source' } );
        const caefSourceOutput = new Artifact( 'CAEF' );
        const caefSourceAction = this.createCodeCommitSourceAction( "caef", caefSourceOutput, this.props.codeCommitActionRole, this.props.codeCommitEventRole, this.props.caefRepo, this.props.caefBranch ?? "main" )
        const configSourceOutput = new Artifact( 'CONFIGS' )
        const configSourceAction = this.createCodeCommitSourceAction( "configs", configSourceOutput, this.props.codeCommitActionRole, this.props.codeCommitEventRole, this.props.configsRepo, this.props.configsBranch ?? "main" )
        sourceStage.addAction( caefSourceAction );
        sourceStage.addAction( configSourceAction );

        const pipelineProjects: PipelineProject[] = []
        const preDeployOutput = new Artifact( 'PREDEPLOY_OUTPUT' );
        this.addPreDeployStage( configSourceOutput, caefSourceOutput, preDeployOutput, pipelineProjects )
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
                commands: [ this.createCaefCommand( 'deploy' ) ],
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
        caefSourceOutput: Artifact,
        preDeployOutput: Artifact,
        pipelineProjects: PipelineProject[] ): PipelineProject {
        const preDeployStage = this.addStage( { stageName: 'Pre-Deploy' } );

        const [ diffAction, diffProject ] = this.createCodeBuildAction(
            "Synth-And-Diff",
            configSourceOutput,
            [ caefSourceOutput ],
            [ preDeployOutput ],
            {
                installCommands: [
                    "n 18",
                    "ln -s $CODEBUILD_SRC_DIR_CAEF ./caef",
                    ...this.props.install ?? [],
                    ...this.props.preDeploy?.install ?? []
                ],
                preCommands: [
                    ...this.props.pre ?? [],
                    ...this.props.preDeploy?.pre ?? [],
                ],
                commands: [ this.createCaefCommand( 'diff' ) ],
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

    private createCaefCommand ( caefAction: string ): string {
        const caefCmd = [ `./caef/bin/caef -l ${ caefAction }` ]
        if ( this.props.domainFilter ) {
            caefCmd.push( `-d ${ this.props.domainFilter.join( "," ) }` )
        }
        if ( this.props.envFilter ) {
            caefCmd.push( `-e ${ this.props.envFilter.join( "," ) }` )
        }
        if ( this.props.moduleFilter ) {
            caefCmd.push( `-m ${ this.props.moduleFilter.join( "," ) }` )
        }
        return caefCmd.join( " " )
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



/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataOpsProjectUtils } from '@aws-mdaa/dataops-project-l3-construct';
import { EventBridgeHelper } from '@aws-mdaa/eventbridge-helper';
import { MdaaCfnJob } from '@aws-mdaa/glue-constructs';
import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaBucket } from '@aws-mdaa/s3-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { CfnJob } from 'aws-cdk-lib/aws-glue';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import * as path from 'path';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { MdaaSnsTopic } from '@aws-mdaa/sns-constructs';
import { Rule } from 'aws-cdk-lib/aws-events';
import {Fn } from 'aws-cdk-lib'


export type JobCommandPythonVersion = "2" | "3" | undefined
export type JobCommandName = "glueetl" | "pythonshell"

export interface JobCommand {
    /**
     * "glueetl" | "pythonshell"
     */
    readonly name: JobCommandName
    /**
     * "2" | "3" | undefined
     */
    readonly pythonVersion?: JobCommandPythonVersion
    /**
     * Relative path to Glue script
     */
    readonly scriptLocation: string
}

export type JobWorkerType = "Standard" | "G.1X" | "G.2X"

export interface JobConfig {
    /**
     * The arn for the role with which the job will be executed
     */
    readonly executionRoleArn: string,
    /**
     * The job command configuration
     */
    readonly command: JobCommand,
    /**
     * Reference to a template defined elsewhere in the config (in template section)
     */
    readonly template?: string
    /**
     * The number of capacity units that are allocated to this job.
     */
    readonly allocatedCapacity?: number
    /**
     * List of names of connections to be used by the job
     */
    readonly connections?: string[]
    /**
     * Default arguments which will be supplied to the job
     */
    readonly defaultArguments?: { [ key: string ]: string }
    /**
     * Description of the job
     */
    readonly description: string
    /**
     * Execution properties of the job, including max concurrent executions
     */
    readonly executionProperty?: CfnJob.ExecutionPropertyProperty
    /**
     * Version of Glue
     */
    readonly glueVersion?: string
    /**
     * Maximum number of DPUS allocated to the job
     */
    readonly maxCapacity?: number
    /**
     * Max number of retries of the job before job failure occures
     */
    readonly maxRetries?: number
    /**
     * Notification properties of the job, including notification delay
     */
    readonly notificationProperty?: CfnJob.NotificationPropertyProperty
    /**
     * Number of workers assigned to the job
     */
    readonly numberOfWorkers?: number
    /**
     * The maximum execution time of the job
     */
    readonly timeout?: number
    /**
     * "Standard" | "G.1X" | "G.2X"
     */
    readonly workerType?: JobWorkerType
    /**
     * Additional ETL scripts that are being referenced in main glue etl script
     * Relative path to Additional Glue scripts
     */
    readonly additionalScripts?: string[]
}


export interface GlueJobL3ConstructProps extends MdaaL3ConstructProps {
    /**
     * Role which will be used to deploy the Job code. Should be obtained from the DataOps Project
     */
    readonly deploymentRoleArn: string;
    /**
     * The name of the Data Ops project bucket where job resources will be deployed and which will be used as a temporary job location
     */
    readonly projectBucketName: string
    /**
     * Map of job names to job configurations
     */
    readonly jobConfigs: { [ key: string ]: JobConfig };
    /**
     * Name of the Glue Security configuration to be used for all jobs. Likely supplied by the DataOps Project.
     */
    readonly securityConfigurationName: string;
    /**
     * Name of the dataops project to which the job will be associated.
     */
    readonly projectName: string;

    /**
    * Notification topic Arn 
     */
    readonly notificationTopicArn: string;

}

export class GlueJobL3Construct extends MdaaL3Construct {
    protected readonly props: GlueJobL3ConstructProps


    constructor( scope: Construct, id: string, props: GlueJobL3ConstructProps ) {
        super( scope, id, props )
        this.props = props

        const deploymentRole = MdaaRole.fromRoleArn( this.scope, `deployment-role`, this.props.deploymentRoleArn )
        const projectBucket = MdaaBucket.fromBucketName( this.scope, `project-bucket`, this.props.projectBucketName )

        // Build our jobs!
        const allJobs = this.props.jobConfigs
        Object.keys( allJobs ).forEach( jobName => {
            let jobConfig = allJobs[ jobName ]

            const scriptPath = path.dirname( jobConfig.command.scriptLocation.trim() )
            const scriptName = path.basename( jobConfig.command.scriptLocation.trim() )
            const scriptSource = Source.asset( scriptPath, { exclude: [ '**', `!${ scriptName }` ] } )
            const defaultArguments = jobConfig.defaultArguments ? jobConfig.defaultArguments : {}

            new BucketDeployment( this.scope, `job-deployment-${ jobName }`, {
                sources: [ scriptSource ],
                destinationBucket: projectBucket,
                destinationKeyPrefix: `deployment/jobs/${ jobName }`,
                role: deploymentRole,
                extract: true
            } );

            if(jobConfig.additionalScripts){
                /**
                 * Group all scripts at parent directory level. This will allow creating zip lib assests at various directory levels
                 * ex. '/main/script1.py' , '/util/script2.py' , '/util/script3.py' will create 2 zip files representing 'main' and 'utils'
                 *  */ 
                const directoryToScript: { [ scriptPath: string] : string[]} = {}
                jobConfig.additionalScripts.map(scriptLocation => {
                    const scriptPath = path.dirname( scriptLocation.trim())
                    if( scriptPath in directoryToScript ) {
                        directoryToScript[scriptPath].push( `!${path.basename(scriptLocation.trim())}` )
                    }
                    else{
                        directoryToScript[ scriptPath ] = [`!${path.basename(scriptLocation.trim())}`]
                    }                    
                })
                
                // Create Source asset for each directory
                const additionalScriptsSources = Object.entries(directoryToScript).map(([scriptPath, scriptNames]) => {
                    return Source.asset( scriptPath, { exclude: [ '**', ...scriptNames ] } )
                })

                // Deploy Source asset(s) to /deployment/libs/<job> location.
                const additionalScriptDeployment = new BucketDeployment( this.scope, `job-deployment-${ jobName }-additional-script`, {
                    sources: additionalScriptsSources ,
                    destinationBucket: projectBucket,
                    destinationKeyPrefix: `deployment/libs/${ jobName }`,
                    role: deploymentRole,
                    extract: false,     // Glue expects zip of additional scripts, hence disabling the extraction
                } );
                
                // Extract zip name(s) for each source and create comma separated list of s3 locations
                const libraryZipNames: string[] = []
                for(let i=0; i< additionalScriptsSources.length; i++) {
                    const libName = Fn.select(i,additionalScriptDeployment.objectKeys) // Extract file name of zip containing additional scripts
                    libraryZipNames.push(`s3://${ this.props.projectBucketName }/deployment/libs/${ jobName }/${libName }`)
                }

                // Add comma separated list of zip file names to default arguments.
                if( defaultArguments[ '--extra-py-files' ]) {
                    defaultArguments[ '--extra-py-files' ] += ',' + libraryZipNames.join(',')
                
                } else {
                    defaultArguments[ '--extra-py-files' ] =  libraryZipNames.join(',')
                }
                
            }

            NagSuppressions.addResourceSuppressions(
                this.scope,
                [
                    { id: 'AwsSolutions-L1', reason: 'Function is used only as custom resource during CDK deployment.' },
                    { id: 'NIST.800.53.R5-LambdaConcurrency', reason: 'Function is used only as custom resource during CDK deployment.' },
                    { id: 'NIST.800.53.R5-LambdaInsideVPC', reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.' },
                    { id: 'NIST.800.53.R5-LambdaDLQ', reason: 'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.' },
                    { id: 'HIPAA.Security-LambdaConcurrency', reason: 'Function is used only as custom resource during CDK deployment.' },
                    { id: 'HIPAA.Security-LambdaInsideVPC', reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.' },
                    { id: 'HIPAA.Security-LambdaDLQ', reason: 'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.' }
                ],
                true
            );
            // Connections will require an array of references where they are defined
            let connectionsConfigured: { [ key: string ]: any } | undefined
            if ( jobConfig.connections ) {
                connectionsConfigured = {
                    connections: jobConfig.connections
                }
            }

            defaultArguments[ "--TempDir" ] = `s3://${ this.props.projectBucketName }/temp/jobs/${ jobName }`

            const job = new MdaaCfnJob( this.scope, `${ jobName }-job`, {
                command: {
                    name: jobConfig.command.name,
                    pythonVersion: jobConfig.command.pythonVersion,
                    scriptLocation: `s3://${ this.props.projectBucketName }/deployment/jobs/${ jobName }/${ scriptName }`
                },
                role: jobConfig.executionRoleArn,
                allocatedCapacity: jobConfig.allocatedCapacity,
                connections: connectionsConfigured,
                defaultArguments: defaultArguments,
                description: jobConfig.description,
                executionProperty: jobConfig.executionProperty,
                glueVersion: jobConfig.glueVersion,
                maxCapacity: jobConfig.maxCapacity,
                maxRetries: jobConfig.maxRetries,
                name: jobName,
                notificationProperty: jobConfig.notificationProperty,
                numberOfWorkers: jobConfig.numberOfWorkers,
                securityConfiguration: this.props.securityConfigurationName,
                timeout: jobConfig.timeout,
                workerType: jobConfig.workerType,
                naming: this.props.naming
            } )
            if ( job.name ) {
                DataOpsProjectUtils.createProjectSSMParam( this.scope, this.props.naming, this.props.projectName, `job/name/${ jobName }`, job.name )

                const eventRule = this.createJobMonitoringEventRule( `${ jobName }-monitor`, [ job.name ] )
                eventRule.addTarget( new SnsTopic( MdaaSnsTopic.fromTopicArn( this.scope, `${ jobName }-topic`, this.props.notificationTopicArn ) ) );
            }
        } )
        //CDK S3 Deployment automatically adds inline policy to project deployment role.
        this.scope.node.children.forEach( child => {
            if ( child.node.id.startsWith( "deployment-role" ) ) {
                NagSuppressions.addResourceSuppressions(
                    child,
                    [
                        { id: 'AwsSolutions-IAM5', reason: 'Inline policy used only for deployment.' },
                        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Policy used only for deployment.' },
                        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Policy used only for deployment.' }
                    ],
                    true
                );
            }
        } )

    }
    private createJobMonitoringEventRule ( ruleName: string, jobNames: string[] ): Rule {
        return EventBridgeHelper.createGlueMonitoringEventRule( this.scope, this.props.naming, ruleName, "Workflow Job failure events", {
            jobName: jobNames,
            state: [ "FAILED", "TIMEOUT", "STOPPED" ]
        } )
    }
}

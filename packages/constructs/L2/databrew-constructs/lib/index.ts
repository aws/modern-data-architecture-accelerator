/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps, CaefParamAndOutput } from '@aws-caef/construct';
import { IResolvable } from 'aws-cdk-lib';
import { CfnJob, CfnJobProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

/**
 * Properties for creating a compliant Caef Databrew Job
 */
export interface CaefDataBrewJobProps extends CaefConstructProps {

    // The unique name of the job.
    readonly name: string

    // The Amazon Resource Name (ARN) of the role to be assumed for this job.
    readonly roleArn: string

    // The job type of the job, which must be one of the following:.
    readonly type: string

    // One or more artifacts that represent the AWS Glue Data Catalog output from running the job.
    readonly dataCatalogOutputs?: IResolvable | ( IResolvable | CfnJob.DataCatalogOutputProperty )[]

    // Represents a list of JDBC database output objects which defines the output destination for a DataBrew recipe job to write into.
    readonly databaseOutputs?: IResolvable | ( IResolvable | CfnJob.DatabaseOutputProperty )[]

    // A dataset that the job is to process.
    readonly datasetName?: string

    // The Amazon Resource Name (ARN) of KMS encryption key that is used to protect the job output.
    readonly encryptionKeyArn: string

    // A sample configuration for profile jobs only, which determines the number of rows on which the profile job is run.
    readonly jobSample?: CfnJob.JobSampleProperty | IResolvable

    // The current status of Amazon CloudWatch logging for the job.
    readonly logSubscription?: string

    // The maximum number of nodes that can be consumed when the job processes data.
    readonly maxCapacity?: number

    // The maximum number of times to retry the job after a job run fails.
    readonly maxRetries?: number

    // job output location
    readonly outputLocation?: CfnJob.OutputLocationProperty | IResolvable

    // One or more artifacts that represent output from running the job.
    readonly outputs?: IResolvable | ( CfnJob.OutputProperty | IResolvable )[]

    // Configuration for profile jobs.
    readonly profileConfiguration?: CfnJob.ProfileConfigurationProperty | IResolvable

    // The name of the project that the job is associated with.
    readonly projectName?: string

    // A series of data transformation steps that the job runs.
    readonly recipe?: CfnJob.RecipeProperty | IResolvable

    // The job's timeout in minutes.
    readonly timeout?: number

    // List of validation configurations that are applied to the profile job.
    readonly validationConfigurations?: IResolvable | ( CfnJob.ValidationConfigurationProperty | IResolvable )[]

}

/**
 * A construct which creates a compliant Databrew Job.
 */
export class CaefDataBrewJob extends CfnJob {

    private static setProps ( props: CaefDataBrewJobProps ): CfnJobProps {
        const overrideProps = {
            name: props.naming.resourceName( props.name, 80 ),
            encryptionMode: "SSE-KMS"
        }
        return { ...props, ...overrideProps }
    }

    constructor( scope: Construct, id: string, props: CaefDataBrewJobProps ) {
        super( scope, id, CaefDataBrewJob.setProps( props ) )

        new CaefParamAndOutput( this, {
            ...{
                resourceType: "Job",
                resourceId: props.name,
                name: "name",
                value: this.name
            }, ...props
        },scope )
    }
}


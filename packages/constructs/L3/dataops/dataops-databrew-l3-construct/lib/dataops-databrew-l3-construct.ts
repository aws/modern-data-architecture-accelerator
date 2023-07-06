/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CfnJob, CfnRecipe, CfnDataset, CfnProject } from 'aws-cdk-lib/aws-databrew';
import { IResolvable } from 'aws-cdk-lib';
import { CaefRoleRef } from '@aws-caef/iam-role-helper';
import { CaefL3Construct, CaefL3ConstructProps } from "@aws-caef/l3-construct";
import { CaefDataBrewJob, CaefDataBrewJobProps } from "@aws-caef/databrew-constructs";
import { Construct } from "constructs";
import { CaefDataBrewDataset, CaefDataBrewRecipe, CaefDataBrewSchedule, CaefDataBrewProject } from "../lib";

export interface DataBrewL3ConstructProps extends CaefL3ConstructProps {

  // Name of the Data-Ops project.
  readonly projectName: string

  // List of recipes to be created.
  readonly recipes?: Record<string, RecipeProps>

  // List of recipes to be created.
  readonly datasets?: Record<string, DatasetProps>

  // List of jobs to be created.
  readonly jobs?: Record<string, DataBrewJobProps>
}

export interface DataBrewJobProps {

  // Databrew job type
  readonly type: string

  // KMS Key for the job
  readonly kmsKeyArn: string

  // Databrew project name for recipe job.
  readonly projectName?: string

  // Output locations for the recipe job.
  readonly outputs?: IResolvable | ( CfnJob.OutputProperty | IResolvable )[]

  // Dataset for the job
  readonly dataset: ConfigOptions

  // A list of steps that are defined by the recipe.
  readonly recipe?: ConfigOptions

  // Execution role for the job
  readonly executionRole: CaefRoleRef

  // A sample configuration for profile jobs only, which determines the number of rows on which the profile job is run.
  readonly jobSample?: CfnJob.JobSampleProperty | IResolvable

  // The current status of Amazon CloudWatch logging for the job.
  readonly logSubscription?: string

  // The maximum number of nodes that can be consumed when the job processes data.
  readonly maxCapacity?: number

  // The maximum number of times to retry the job after a job run fails.
  readonly maxRetries?: number

  // Schedule for the job
  readonly schedule?: ConfigSchedule

  // job output location for Profile job
  readonly outputLocation?: CfnJob.OutputLocationProperty | IResolvable

  // One or more artifacts that represent the AWS Glue Data Catalog output from running the job.
  readonly dataCatalogOutputs?: IResolvable | ( IResolvable | CfnJob.DataCatalogOutputProperty )[]

  // Represents a list of JDBC database output objects which defines the output destination for a DataBrew recipe job to write into.
  readonly databaseOutputs?: IResolvable | ( IResolvable | CfnJob.DatabaseOutputProperty )[]

  // Configuration for profile jobs.
  readonly profileConfiguration?: CfnJob.ProfileConfigurationProperty | IResolvable

  // The job's timeout in minutes.
  readonly timeout?: number

  // List of validation configurations that are applied to the profile job.
  readonly validationConfigurations?: IResolvable | ( CfnJob.ValidationConfigurationProperty | IResolvable )[]

}

export interface ConfigSchedule {

  // 	The name of the schedule.
  readonly name: string;

  // The dates and times when the job is to run.
  readonly cronExpression: string

  // A list of jobs to be run, according to the schedule.
  readonly jobNames?: string[]

}

export interface ConfigOptions {
  readonly existing?: CfnJob.RecipeProperty,
  readonly generated?: string
}

export interface DatasetProps {

  // IResolvable Information on how DataBrew can find the dataset, in either the AWS Glue Data Catalog or Amazon S3.
  readonly input: CfnDataset.InputProperty | IResolvable;

  // The file format of a dataset that is created from an Amazon S3 file or folder.
  readonly format?: string;

  // A set of options that define how DataBrew interprets the data in the dataset.
  readonly formatOptions?: CfnDataset.FormatOptionsProperty | IResolvable

  // A set of options that defines how DataBrew interprets an Amazon S3 path of the dataset.
  readonly pathOptions?: CfnDataset.PathOptionsProperty | IResolvable;

}

export interface RecipeProps {

  // A list of steps that are defined by the recipe.
  readonly steps: string

  // The description of the recipe.
  readonly description?: string;

}

export interface DatabrewProjectConfig {

  // The unique name of a project.
  readonly name: string

  // The dataset that the project is to act upon.
  readonly datasetName: string

  // The name of a recipe that will be developed during a project session.
  readonly recipeName: string

  // The Amazon Resource Name (ARN) of the role that will be assumed for this project.
  readonly roleArn: string

  // The sample size and sampling type to apply to the data.
  readonly sample?: CfnProject.SampleProperty | IResolvable

}


//This stack creates and manages a SageMaker Studio Domain
export class DataBrewL3Construct extends CaefL3Construct {
  protected readonly props: DataBrewL3ConstructProps


  private datasets = new Map();
  private recipes = new Map();

  constructor( scope: Construct, id: string, props: DataBrewL3ConstructProps ) {
    super( scope, id, props )
    this.props = props

    // create datasets
    const datasets = this.props.datasets
    for ( const key in datasets ) {
      const name = key.trim()
      this.datasets.set( name, this.createDataset( name, datasets[ name ] ) )
    }

    // create recipes
    const recipes = this.props.recipes
    for ( const key in recipes ) {
      const name = key.trim()
      this.recipes.set( name, this.createRecipe( name, recipes[ name ] ) )
    }

    // create list of databrew jobs and schedule them
    const records = this.props.jobs
    for ( const key in records ) {
      const roleName = this.props.roleHelper.resolveRoleRefsWithOrdinals( [ records[ key ].executionRole ], "executionRole" ).map( x => x.name() )[ 0 ]
      const job = this.createJob( key, roleName, records[ key ] )
      const schedule = records[ key ]?.schedule
      if ( schedule ) {
        this.createSchedule( [ job.name ], schedule ).addDependency( job )
      }
    }
  }

  private createJob ( jobName: string, roleName: string, params: DataBrewJobProps ): CaefDataBrewJob {

    // get project Name
    let getProjectName = function () {
      let projectName = jobName
      if ( params?.projectName ) projectName = params.projectName
      return projectName
    }

    // create project
    const project = ( params?.projectName ? this.createProject( {
      name: getProjectName(),
      datasetName: this.getDatasetName( params ),
      recipeName: this.getRecipe( params ).name,
      roleArn: roleName
    } ) : undefined )

    // make sure default dataset and recipe are provisioned before project is created
    if ( project ) this.addDependency( params, project )

    // get job props
    const props = this.getDataBrewJobProps( jobName, roleName, params, project )

    // create databrew job
    const job = new CaefDataBrewJob( this, jobName, props )

    // put dependecy on project if it is project based job
    if ( project ) job.addDependency( project )

    // put depdency on dataset and recipes if not project based
    if ( !project ) this.addDependency( params, job )
    return job
  }


  private addDependency ( params: DataBrewJobProps, dependent: CfnJob | CfnProject ) {
    if ( params.dataset?.generated ) {
      const defaultDataset: CaefDataBrewDataset = this.datasets.get( params.dataset.generated )
      dependent.addDependency( defaultDataset )
    }
    if ( params.recipe?.generated ) {
      const defaultRecipe: CaefDataBrewRecipe = this.recipes.get( params.recipe.generated )
      dependent.addDependency( defaultRecipe )
    }
  }

  private getDataBrewJobProps ( jobName: string, roleName: string, params: DataBrewJobProps, project?: CfnProject ): CaefDataBrewJobProps {

    // set basic props for the job
    const props = {
      naming: this.props.naming,
      name: jobName,
      roleArn: roleName,
      type: params.type,
      encryptionKeyArn: params.kmsKeyArn,
      dataCatalogOutputs: params.dataCatalogOutputs,
      databaseOutputs: params.databaseOutputs,
      jobSample: params.jobSample,
      logSubscription: params.logSubscription,
      maxCapacity: params.maxCapacity,
      maxRetries: params.maxRetries,
      timeout: params.timeout
    }

    // parameters for recipe job with project
    if ( project ) {
      return {
        ...props,
        projectName: project.name,
        outputs: params.outputs
      }
    }

    // parameters for recipe job with dataset and recipe
    if ( params.type == "RECIPE" ) {
      return {
        ...props,
        datasetName: this.getDatasetName( params ),
        recipe: this.getRecipe( params ),
        outputs: params.outputs
      }
    }
    // properties for profile job 
    return {
      ...props,
      datasetName: this.getDatasetName( params ),
      outputLocation: params.outputLocation,
      profileConfiguration: params.profileConfiguration,
      validationConfigurations: params.validationConfigurations
    }
  }

  private getDatasetName ( params: DataBrewJobProps ): string {
    let defaultDatasetName: string = ""
    if ( params.dataset?.generated ) {
      const defaultDataset: CaefDataBrewDataset = this.datasets.get( params.dataset.generated )
      defaultDatasetName = defaultDataset.name
    }
    else if ( params.dataset?.existing ) {
      defaultDatasetName = params.dataset.existing.name
    }
    return defaultDatasetName
  }

  private getRecipe ( params: DataBrewJobProps ): CfnJob.RecipeProperty {
    let recipe: CfnJob.RecipeProperty = { name: "", version: "" }
    if ( params.recipe?.generated ) {
      const defaultRecipe: CaefDataBrewRecipe = this.recipes.get( params.recipe.generated )
      recipe = { name: defaultRecipe.name, version: "" }
    }
    else if ( params.recipe?.existing ) {
      recipe = { name: params.recipe.existing.name, version: params.recipe.existing.version }
    }
    return recipe
  }

  private createProject ( params: DatabrewProjectConfig ): CaefDataBrewProject {
    const props = {
      naming: this.props.naming,
      name: params.name,
      datasetName: params.datasetName,
      recipeName: params.recipeName,
      roleArn: params.roleArn,
      sample: params.sample
    }
    return new CaefDataBrewProject( this, params.name, props )
  }

  private createDataset ( name: string, params: DatasetProps ): CaefDataBrewDataset {
    const props = {
      naming: this.props.naming,
      name: name,
      input: params.input,
      format: params.format,
      formatOptions: params.formatOptions,
      pathOptions: params.pathOptions
    }
    return new CaefDataBrewDataset( this, name, props )
  }


  private createRecipe ( name: string, recipeConfig: RecipeProps ): CaefDataBrewRecipe {

    const toLowerCase = ( str: string ) => str.charAt( 0 ).toLowerCase() + str.slice( 1 );
    const isUpperCase = ( char: string ) => char == char.toUpperCase()

    const transformedSteps = JSON.parse( recipeConfig.steps, function ( key, value ) {
      if ( ( isNaN( Number( key ) ) ) && ( key.trim().length > 0 ) && ( isUpperCase( key.charAt( 0 ) ) ) ) {
        this[ toLowerCase( key ) ] = value
        return
      }
      return value
    } );

    const props = {
      naming: this.props.naming,
      name: name,
      steps: transformedSteps as CfnRecipe.RecipeStepProperty[],
      description: recipeConfig.description
    }

    return new CaefDataBrewRecipe( this, name, props )
  }

  private createSchedule ( jobNames: string[], params: ConfigSchedule ): CaefDataBrewSchedule {
    const props = {
      naming: this.props.naming,
      name: params.name,
      cronExpression: params.cronExpression,
      jobNames: jobNames
    }
    return new CaefDataBrewSchedule( this, params.name, props )
  }
}
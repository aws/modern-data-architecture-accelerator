/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CfnJob, CfnRecipe, CfnDataset, CfnProject } from 'aws-cdk-lib/aws-databrew';
import { IResolvable } from 'aws-cdk-lib';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaDataBrewJob, MdaaDataBrewJobProps } from '@aws-mdaa/databrew-constructs';
import { Construct } from 'constructs';
import { MdaaDataBrewDataset, MdaaDataBrewRecipe, MdaaDataBrewSchedule, MdaaDataBrewProject } from '../lib';

export interface DataBrewL3ConstructProps extends MdaaL3ConstructProps {
  /** DataOps project name for DataBrew resource association. */
  readonly projectName?: string;
  /** Map of recipe names to recipe configurations. */
  readonly recipes?: Record<string, RecipeProps>;
  /** Map of dataset names to dataset configurations. */
  readonly datasets?: Record<string, DatasetProps>;
  /** Map of job names to job configurations. */
  readonly jobs?: Record<string, DataBrewJobProps>;
}

/**
 * Configuration for a DataBrew job defining recipe execution, data profiling, and automated data preparation workflows.
 *
 * Use cases: Data processing jobs; Recipe execution; Data profiling; Automated preparation; Output management
 *
 * AWS: Creates AWS Glue DataBrew jobs with recipe execution, profiling, and output configuration
 *
 * Validation: type, kmsKeyArn, dataset, and executionRole are required; other properties are optional
 */
export interface DataBrewJobProps {
  /** Job type: 'RECIPE' for data transformation or 'PROFILE' for data profiling. */
  readonly type: string;
  /** KMS key ARN for encrypting job outputs and intermediate processing results. */
  readonly kmsKeyArn: string;
  /** DataBrew project name for recipe job association. */
  readonly projectName?: string;
  /** Output locations for recipe job results including S3 destinations and format specifications. */
  readonly outputs?: IResolvable | (CfnJob.OutputProperty | IResolvable)[];
  /** Input dataset configuration referencing an existing or generated dataset. */
  readonly dataset: ConfigOptions;
  /** Recipe configuration referencing an existing or generated recipe. */
  readonly recipe?: ConfigOptions;
  /** IAM execution role reference for job permissions. */
  readonly executionRole: MdaaRoleRef;
  /** Sample configuration for profile jobs controlling data sampling strategy. */
  readonly jobSample?: CfnJob.JobSampleProperty | IResolvable;
  /** CloudWatch log subscription status for job execution monitoring. */
  readonly logSubscription?: string;
  /** Maximum number of nodes for job execution. */
  readonly maxCapacity?: number;
  /** Maximum retry attempts for failed job runs. */
  readonly maxRetries?: number;
  /** Cron-based schedule configuration for automated job execution. */
  readonly schedule?: ConfigSchedule;
  /** Output location for profile job results. */
  readonly outputLocation?: CfnJob.OutputLocationProperty | IResolvable;
  /** Data Catalog output configurations for Glue catalog integration. */
  readonly dataCatalogOutputs?: IResolvable | (IResolvable | CfnJob.DataCatalogOutputProperty)[];
  /** JDBC database output destinations for recipe job results. */
  readonly databaseOutputs?: IResolvable | (IResolvable | CfnJob.DatabaseOutputProperty)[];
  /** Profile configuration for statistical analysis and data quality assessment. */
  readonly profileConfiguration?: CfnJob.ProfileConfigurationProperty | IResolvable;
  /** Job timeout in minutes controlling maximum execution time. */
  readonly timeout?: number;
  /** Validation configurations for profile job quality assessment. */
  readonly validationConfigurations?: IResolvable | (CfnJob.ValidationConfigurationProperty | IResolvable)[];
}

/**
 * Configuration for DataBrew job scheduling with cron-based automation.
 *
 * Use cases: Job scheduling; Automated execution; Workflow orchestration; Batch processing
 *
 * AWS: Creates DataBrew schedules for automated job execution and workflow coordination
 *
 * Validation: name and cronExpression are required; jobNames is optional for job targeting
 */
export interface ConfigSchedule {
  /** Unique name for the schedule. */
  readonly name: string;
  /** Cron expression defining when jobs should run. */
  readonly cronExpression: string;
  /** Job names to execute on this schedule. */
  readonly jobNames?: string[];
}

/**
 * Configuration for DataBrew recipe and dataset options supporting existing and generated resource references.
 *
 * Use cases: Recipe configuration; Dataset options; Resource references; Flexible sourcing
 *
 * AWS: DataBrew recipe and dataset configuration with existing and generated resource support
 *
 * Validation: At least one of existing or generated must be provided for valid configuration
 */
export interface ConfigOptions {
  /** Existing recipe property for direct recipe specification. */
  readonly existing?: CfnJob.RecipeProperty;
  /** Generated resource reference name for dynamic resource linking. */
  readonly generated?: string;
}

/**
 * Configuration for a DataBrew dataset with S3 and Glue Data Catalog integration.
 *
 * Use cases: S3 data source configuration; Glue catalog integration; Dataset discovery; Data source management
 *
 * AWS: DataBrew dataset configuration with S3 and Glue Data Catalog source integration
 *
 * Validation: input is required; format and options must be compatible with data source
 */
export interface DatasetProps {
  /** Input configuration defining data source location from S3 or Glue Data Catalog. */
  readonly input: CfnDataset.InputProperty | IResolvable;
  /** File format for S3-based datasets (e.g., CSV, JSON, Parquet). */
  readonly format?: string;
  /** Format options for data interpretation including delimiters, headers, and encoding. */
  readonly formatOptions?: CfnDataset.FormatOptionsProperty | IResolvable;
  /** Path options for S3 path structure interpretation and file organization. */
  readonly pathOptions?: CfnDataset.PathOptionsProperty | IResolvable;
}

/**
 * Configuration for a DataBrew recipe with transformation step definitions.
 *
 * Use cases: Data transformation recipes; Step-based data processing; Recipe documentation; Transformation workflows
 *
 * AWS: DataBrew recipe configuration for data transformation steps and recipe management
 *
 * Validation: steps is required; description should document recipe purpose and transformations
 */
export interface RecipeProps {
  /** JSON string of transformation steps for recipe execution. */
  readonly steps: string;
  /** Description of the recipe's purpose and transformations. */
  readonly description?: string;
}

export interface DatabrewProjectConfig {
  /** Unique name for the DataBrew project. */
  readonly name: string;
  readonly datasetName: string;
  readonly recipeName: string;
  /** IAM role ARN for DataBrew project execution permissions. */
  readonly roleArn: string;
  readonly sample?: CfnProject.SampleProperty | IResolvable;
}

//This stack creates and manages a SageMaker Studio Domain
export class DataBrewL3Construct extends MdaaL3Construct {
  protected readonly props: DataBrewL3ConstructProps;

  private datasets = new Map();
  private recipes = new Map();

  constructor(scope: Construct, id: string, props: DataBrewL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    // create datasets
    const datasets = this.props.datasets;
    for (const key in datasets) {
      const name = key.trim();
      this.datasets.set(name, this.createDataset(name, datasets[name]));
    }

    // create recipes
    const recipes = this.props.recipes;
    for (const key in recipes) {
      const name = key.trim();
      this.recipes.set(name, this.createRecipe(name, recipes[name]));
    }

    // create list of databrew jobs and schedule them

    Object.entries(this.props.jobs || {}).forEach(([jobName, jobProps]) => {
      const roleName = this.props.roleHelper
        .resolveRoleRefWithRefId(jobProps.executionRole, `${jobName}-executionRole`)
        .name();

      const job = this.createJob(jobName, roleName, jobProps);

      if (jobProps.schedule) {
        this.createSchedule([job.name], jobProps.schedule).addDependency(job);
      }
    });
  }

  private createJob(jobName: string, roleName: string, params: DataBrewJobProps): MdaaDataBrewJob {
    // get project Name
    const getProjectName = function () {
      let projectName = jobName;
      if (params?.projectName) projectName = params.projectName;
      return projectName;
    };

    // create project
    const project = params?.projectName
      ? this.createProject({
          name: getProjectName(),
          datasetName: this.getDatasetName(params),
          recipeName: this.getRecipe(params).name,
          roleArn: roleName,
        })
      : undefined;

    // make sure default dataset and recipe are provisioned before project is created
    if (project) this.addDependency(params, project);

    // get job props
    const props = this.getDataBrewJobProps(jobName, roleName, params, project);

    // create databrew job
    const job = new MdaaDataBrewJob(this, jobName, props);

    // put dependecy on project if it is project based job
    if (project) job.addDependency(project);

    // put depdency on dataset and recipes if not project based
    if (!project) this.addDependency(params, job);
    return job;
  }

  private addDependency(params: DataBrewJobProps, dependent: CfnJob | CfnProject) {
    if (params.dataset?.generated) {
      const defaultDataset: MdaaDataBrewDataset = this.datasets.get(params.dataset.generated);
      dependent.addDependency(defaultDataset);
    }
    if (params.recipe?.generated) {
      const defaultRecipe: MdaaDataBrewRecipe = this.recipes.get(params.recipe.generated);
      dependent.addDependency(defaultRecipe);
    }
  }

  private getDataBrewJobProps(
    jobName: string,
    roleName: string,
    params: DataBrewJobProps,
    project?: CfnProject,
  ): MdaaDataBrewJobProps {
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
      timeout: params.timeout,
    };

    // parameters for recipe job with project
    if (project) {
      return {
        ...props,
        projectName: project.name,
        outputs: params.outputs,
      };
    }

    // parameters for recipe job with dataset and recipe
    if (params.type == 'RECIPE') {
      return {
        ...props,
        datasetName: this.getDatasetName(params),
        recipe: this.getRecipe(params),
        outputs: params.outputs,
      };
    }
    // properties for profile job
    return {
      ...props,
      datasetName: this.getDatasetName(params),
      outputLocation: params.outputLocation,
      profileConfiguration: params.profileConfiguration,
      validationConfigurations: params.validationConfigurations,
    };
  }

  private getDatasetName(params: DataBrewJobProps): string {
    let defaultDatasetName = '';
    if (params.dataset?.generated) {
      const defaultDataset: MdaaDataBrewDataset = this.datasets.get(params.dataset.generated);
      defaultDatasetName = defaultDataset.name;
    } else if (params.dataset?.existing) {
      defaultDatasetName = params.dataset.existing.name;
    }
    return defaultDatasetName;
  }

  private getRecipe(params: DataBrewJobProps): CfnJob.RecipeProperty {
    let recipe: CfnJob.RecipeProperty = { name: '', version: '' };
    if (params.recipe?.generated) {
      const defaultRecipe: MdaaDataBrewRecipe = this.recipes.get(params.recipe.generated);
      recipe = { name: defaultRecipe.name, version: '' };
    } else if (params.recipe?.existing) {
      recipe = { name: params.recipe.existing.name, version: params.recipe.existing.version };
    }
    return recipe;
  }

  private createProject(params: DatabrewProjectConfig): MdaaDataBrewProject {
    const props = {
      naming: this.props.naming,
      name: params.name,
      datasetName: params.datasetName,
      recipeName: params.recipeName,
      roleArn: params.roleArn,
      sample: params.sample,
    };
    return new MdaaDataBrewProject(this, params.name, props);
  }

  private createDataset(name: string, params: DatasetProps): MdaaDataBrewDataset {
    const props = {
      naming: this.props.naming,
      name: name,
      input: params.input,
      format: params.format,
      formatOptions: params.formatOptions,
      pathOptions: params.pathOptions,
    };
    return new MdaaDataBrewDataset(this, name, props);
  }

  private createRecipe(name: string, recipeConfig: RecipeProps): MdaaDataBrewRecipe {
    const toLowerCase = (str: string) => str.charAt(0).toLowerCase() + str.slice(1);
    const isUpperCase = (char: string) => char == char.toUpperCase();

    const transformedSteps = JSON.parse(recipeConfig.steps, function (key, value) {
      if (Number.isNaN(Number(key)) && key.trim().length > 0 && isUpperCase(key.charAt(0))) {
        this[toLowerCase(key)] = value;
        return;
      }
      return value;
    });

    const props = {
      naming: this.props.naming,
      name: name,
      steps: transformedSteps as CfnRecipe.RecipeStepProperty[],
      description: recipeConfig.description,
    };

    return new MdaaDataBrewRecipe(this, name, props);
  }

  private createSchedule(jobNames: string[], params: ConfigSchedule): MdaaDataBrewSchedule {
    const props = {
      naming: this.props.naming,
      name: params.name,
      cronExpression: params.cronExpression,
      jobNames: jobNames,
    };
    return new MdaaDataBrewSchedule(this, params.name, props);
  }
}

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
  /**
   * Q-ENHANCED-PROPERTY
   * Required DataOps project name for DataBrew integration and resource coordination enabling project-based resource organization and management. Provides the project identifier that associates DataBrew resources with the DataOps project for resource coordination and governance integration.
   *
   * Use cases: Project association; Resource coordination; DataOps integration; Project management
   *
   * AWS: DataOps project name for DataBrew association and project-based resource organization
   *
   * Validation: Must be valid project name; required for DataBrew project association and resource coordination
   **/
  readonly projectName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of recipe names to recipe configurations for DataBrew data transformation enabling visual data preparation and transformation workflows. Provides recipe definitions with transformation steps for visual data preparation, cleansing, and transformation operations within DataBrew projects.
   *
   * Use cases: Data transformation; Visual preparation; Recipe management; Transformation workflows
   *
   * AWS: DataBrew recipes for visual data transformation and preparation workflows
   *
   * Validation: Must be valid recipe name to RecipeProps mapping if provided; enables visual data transformation and preparation
   *   **/
  readonly recipes?: Record<string, RecipeProps>;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of dataset names to dataset configurations for DataBrew data source management enabling data input and source connectivity. Provides dataset definitions for connecting to data sources in S3 or Glue Data Catalog for DataBrew data preparation and profiling operations.
   *
   * Use cases: Data source management; Dataset configuration; Input connectivity; Data preparation
   *
   * AWS: DataBrew datasets for data source connectivity and input management
   *
   * Validation: Must be valid dataset name to DatasetProps mapping if provided; enables data source connectivity and management
   *   **/
  readonly datasets?: Record<string, DatasetProps>;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of job names to job configurations for DataBrew job execution enabling automated data preparation and profiling workflows. Provides job definitions for executing DataBrew recipes, profiling datasets, and automating data preparation workflows with scheduling and output management.
   *
   * Use cases: Job execution; Automated preparation; Data profiling; Workflow automation
   *
   * AWS: DataBrew jobs for automated data preparation and profiling workflow execution
   *
   * Validation: Must be valid job name to DataBrewJobProps mapping if provided; enables automated data preparation and profiling
   *   **/
  readonly jobs?: Record<string, DataBrewJobProps>;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for AWS Glue DataBrew job providing data processing and transformation capabilities. Defines job configuration for DataBrew recipe execution, data profiling, and automated data preparation workflows with output management, scheduling, and validation features.
 *
 * Use cases: Data processing jobs; Recipe execution; Data profiling; Automated preparation; Output management
 *
 * AWS: Creates AWS Glue DataBrew jobs with recipe execution, profiling, and output configuration
 *
 * Validation: type, kmsKeyArn, dataset, and executionRole are required; other properties are optional
 */
export interface DataBrewJobProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required DataBrew job type specification determining the job execution mode and processing capabilities. Defines whether the job executes recipes for data transformation or performs data profiling operations affecting job behavior and output generation.
   *
   * Use cases: Job type specification; Processing mode; Recipe execution; Data profiling
   *
   * AWS: AWS Glue DataBrew job type for execution mode and processing behavior
   *
   * Validation: Must be valid DataBrew job type string; required for job creation and execution mode
   **/
  readonly type: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required KMS key ARN for DataBrew job encryption ensuring data protection during processing operations. Provides encryption for job execution, output data, and intermediate processing results with customer-controlled key management for enhanced security.
   *
   * Use cases: Data encryption; Job security; Output protection; Regulatory compliance
   *
   * AWS: AWS KMS key ARN for DataBrew job encryption and data protection
   *
   * Validation: Must be valid KMS key ARN string; required for job encryption and security compliance
   **/
  readonly kmsKeyArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional DataBrew project name for recipe job association enabling project-based recipe execution and development workflow integration. Specifies the project context for recipe jobs connecting job execution to project-based recipe development and testing.
   *
   * Use cases: Recipe job execution; Project association; Development workflow; Recipe testing
   *
   * AWS: AWS Glue DataBrew project name for recipe job association and project workflow
   *
   * Validation: Must be valid DataBrew project name if provided; enables project-based recipe execution when specified
   **/
  readonly projectName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional output locations for recipe job results enabling flexible output destination management and data delivery. Defines where processed data will be written including S3 locations, format specifications, and output organization for recipe job results.
   *
   * Use cases: Output management; Data delivery; Result storage; Output organization
   *
   * AWS: AWS Glue DataBrew job output configuration for processed data delivery and storage
   *
   * Validation: Must be valid CfnJob.OutputProperty array if provided; configures job output destinations and formats
   *   **/
  readonly outputs?: IResolvable | (CfnJob.OutputProperty | IResolvable)[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required dataset configuration for job input data source enabling data processing and transformation operations. Specifies the input dataset for job execution including data source location, format, and access configuration for DataBrew processing workflows.
   *
   * Use cases: Input data source; Dataset processing; Data transformation; Source configuration
   *
   * AWS: AWS Glue DataBrew dataset configuration for job input data source and processing
   *
   * Validation: Must be valid ConfigOptions object; required for job input data source and processing configuration
   **/
  readonly dataset: ConfigOptions;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional recipe configuration for data transformation steps enabling automated data preparation and cleansing operations. Defines the recipe to be executed by the job including transformation steps, data preparation logic, and processing instructions.
   *
   * Use cases: Data transformation; Recipe execution; Automated preparation; Processing logic
   *
   * AWS: AWS Glue DataBrew recipe configuration for job transformation and preparation operations
   *
   * Validation: Must be valid ConfigOptions object if provided; enables recipe-based data transformation when specified
   **/
  readonly recipe?: ConfigOptions;
  /**
   * Q-ENHANCED-PROPERTY
   * Required execution role reference for DataBrew job permissions enabling secure access to AWS services and resources. Provides the IAM role that DataBrew assumes to execute the job and access data sources, outputs, and other AWS services.
   *
   * Use cases: Job permissions; Service access; Security roles; Resource authorization
   *
   * AWS: AWS IAM role for DataBrew job execution permissions and service access
   *
   * Validation: Must be valid MdaaRoleRef object; required for job execution permissions and resource access
   **/
  readonly executionRole: MdaaRoleRef;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional job sample configuration for profile jobs determining the data sampling strategy and row count for profiling operations. Defines sampling parameters for data profiling jobs affecting profiling scope, performance, and statistical accuracy.
   *
   * Use cases: Data profiling; Sampling strategy; Performance optimization; Statistical analysis
   *
   * AWS: AWS Glue DataBrew job sample configuration for profiling operations and data sampling
   *
   * Validation: Must be valid CfnJob.JobSampleProperty if provided; configures profiling sample size and strategy
   *   **/
  readonly jobSample?: CfnJob.JobSampleProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch logging subscription status for job execution monitoring enabling centralized log management and operational visibility. Controls whether job execution logs are sent to CloudWatch for monitoring, debugging, and operational analysis.
   *
   * Use cases: Job monitoring; Log management; Debugging; Operational visibility
   *
   * AWS: Amazon CloudWatch logging for DataBrew job execution monitoring and log management
   *
   * Validation: Must be valid log subscription status string if provided; enables CloudWatch logging when configured
   **/
  readonly logSubscription?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum capacity specification for job resource allocation enabling performance optimization and cost control. Defines the maximum number of nodes that can be consumed during job execution affecting processing performance and resource costs.
   *
   * Use cases: Performance optimization; Resource allocation; Cost control; Capacity management
   *
   * AWS: AWS Glue DataBrew job capacity configuration for resource allocation and performance optimization
   *
   * Validation: Must be positive integer if provided; affects job performance and resource consumption
   **/
  readonly maxCapacity?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum retry attempts for failed job runs enabling fault tolerance and reliability. Defines the maximum number of times to retry the job after a job run fails for improved reliability and fault tolerance in data processing workflows.
   *
   * Use cases: Fault tolerance; Job reliability; Error recovery; Retry logic
   *
   * AWS: AWS Glue DataBrew job retry configuration for failed job run recovery and fault tolerance
   *
   * Validation: Must be non-negative integer if provided; enables automatic retry for failed job executions
   **/
  readonly maxRetries?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional schedule configuration for automated job execution enabling scheduled data processing and workflow automation. Defines cron-based scheduling for regular job execution supporting automated data preparation and processing workflows.
   *
   * Use cases: Scheduled execution; Workflow automation; Regular processing; Automated preparation
   *
   * AWS: AWS Glue DataBrew job scheduling for automated execution and workflow orchestration
   *
   * Validation: Must be valid ConfigSchedule object if provided; enables scheduled job execution when configured
   **/
  readonly schedule?: ConfigSchedule;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional output location for profile job results enabling profiling data delivery and analysis result storage. Specifies where data profiling results will be written including statistical analysis, data quality metrics, and profiling reports.
   *
   * Use cases: Profiling results; Analysis storage; Data quality metrics; Report delivery
   *
   * AWS: AWS Glue DataBrew profile job output configuration for profiling results and analysis storage
   *
   * Validation: Must be valid CfnJob.OutputLocationProperty if provided; configures profiling output destination and format
   *   **/
  readonly outputLocation?: CfnJob.OutputLocationProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Data Catalog output configurations for Glue integration enabling metadata management and catalog integration. Defines outputs that represent AWS Glue Data Catalog artifacts from job execution for metadata management and data discovery.
   *
   * Use cases: Metadata management; Catalog integration; Data discovery; Glue integration
   *
   * AWS: AWS Glue Data Catalog output configuration for DataBrew job metadata and catalog integration
   *
   * Validation: Must be valid CfnJob.DataCatalogOutputProperty array if provided; enables Glue catalog integration when configured
   *   **/
  readonly dataCatalogOutputs?: IResolvable | (IResolvable | CfnJob.DataCatalogOutputProperty)[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional database output configurations for JDBC database integration enabling direct database result delivery. Defines JDBC database output destinations for DataBrew recipe job results enabling direct database integration and result storage.
   *
   * Use cases: Database integration; Direct result delivery; JDBC connectivity; Database storage
   *
   * AWS: JDBC database output configuration for DataBrew job database integration and result delivery
   *
   * Validation: Must be valid CfnJob.DatabaseOutputProperty array if provided; enables database output when configured
   *   **/
  readonly databaseOutputs?: IResolvable | (IResolvable | CfnJob.DatabaseOutputProperty)[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional profile configuration for data profiling jobs enabling statistical analysis and data quality assessment. Defines profiling parameters including statistical calculations, data quality metrics, and analysis scope for data assessment.
   *
   * Use cases: Data profiling; Statistical analysis; Data quality assessment; analysis
   *
   * AWS: AWS Glue DataBrew profile configuration for data profiling and statistical analysis
   *
   * Validation: Must be valid CfnJob.ProfileConfigurationProperty if provided; configures profiling analysis and metrics
   *   **/
  readonly profileConfiguration?: CfnJob.ProfileConfigurationProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional job timeout in minutes controlling maximum execution time for data processing operations enabling cost control and SLA management. Defines the maximum time the job can run before being terminated, critical for processing workflows and resource management.
   *
   * Use cases: Timeout management; Cost control; SLA enforcement; Processing time limits
   *
   * AWS: AWS Glue DataBrew job timeout configuration for execution time control and resource management
   *
   * Validation: Must be positive integer in minutes if provided; controls job execution time and resource consumption
   **/
  readonly timeout?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional validation configurations for profile job quality assessment enabling data validation and quality rule enforcement. Defines validation rules and quality checks that are applied during profiling operations for data quality assessment.
   *
   * Use cases: Data validation; Quality assessment; Rule enforcement; Quality checks
   *
   * AWS: AWS Glue DataBrew validation configuration for profile job quality assessment and validation
   *
   * Validation: Must be valid CfnJob.ValidationConfigurationProperty array if provided; enables data quality validation when configured
   *   **/
  readonly validationConfigurations?: IResolvable | (CfnJob.ValidationConfigurationProperty | IResolvable)[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for DataBrew job scheduling with cron-based automation and job orchestration capabilities. Defines schedule configuration for automated DataBrew job execution enabling regular data processing workflows and batch job coordination.
 *
 * Use cases: Job scheduling; Automated execution; Workflow orchestration; Batch processing
 *
 * AWS: Creates DataBrew schedules for automated job execution and workflow coordination
 *
 * Validation: name and cronExpression are required; jobNames is optional for job targeting
 */
export interface ConfigSchedule {
  /**
   * Q-ENHANCED-PROPERTY
   * Required name for the DataBrew schedule enabling schedule identification and management. Provides the schedule identifier for DataBrew operations and serves as the primary reference for schedule management and job orchestration.
   *
   * Use cases: Schedule identification; Job orchestration; Schedule management; Workflow coordination
   *
   * AWS: AWS Glue DataBrew schedule name for identification and job orchestration
   *
   * Validation: Must be unique schedule name string; required for schedule creation and identification
   **/
  readonly name: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required cron expression defining the schedule timing for automated job execution. Specifies when DataBrew jobs should run using standard cron syntax enabling flexible scheduling for regular data processing and batch operations.
   *
   * Use cases: Schedule timing; Automated execution; Regular processing; Batch coordination
   *
   * AWS: AWS Glue DataBrew schedule cron expression for automated job execution timing
   *
   * Validation: Must be valid cron expression string; required for schedule timing and automated execution
   **/
  readonly cronExpression: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of job names to be executed according to the schedule enabling targeted job orchestration. Specifies which DataBrew jobs should be run when the schedule triggers for coordinated batch processing and workflow execution.
   *
   * Use cases: Job targeting; Batch coordination; Workflow execution; Orchestrated processing
   *
   * AWS: AWS Glue DataBrew job names for scheduled execution and batch coordination
   *
   * Validation: Must be array of valid DataBrew job names if provided; enables targeted job execution when specified
   **/
  readonly jobNames?: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for DataBrew recipe and dataset options with flexible source specification capabilities. Defines configuration options for DataBrew resources supporting both existing recipe properties and generated resource references for flexible data preparation workflows.
 *
 * Use cases: Recipe configuration; Dataset options; Resource references; Flexible sourcing
 *
 * AWS: DataBrew recipe and dataset configuration with existing and generated resource support
 *
 * Validation: At least one of existing or generated must be provided for valid configuration
 */
export interface ConfigOptions {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional existing recipe property configuration for DataBrew job recipe specification enabling direct recipe property definition. Provides direct recipe configuration with transformation steps and processing instructions for DataBrew job execution.
   *
   * Use cases: Direct recipe configuration; Transformation steps; Processing instructions; Recipe specification
   *
   * AWS: AWS Glue DataBrew recipe property for job transformation and processing configuration
   *
   * Validation: Must be valid CfnJob.RecipeProperty if provided; enables direct recipe configuration when specified
   *   **/
  readonly existing?: CfnJob.RecipeProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional generated resource reference for DataBrew configuration enabling dynamic resource linking and configuration inheritance. Provides reference to generated DataBrew resources for flexible configuration and resource reuse in data preparation workflows.
   *
   * Use cases: Resource references; Dynamic linking; Configuration inheritance; Resource reuse
   *
   * AWS: Generated DataBrew resource reference for dynamic configuration and resource linking
   *
   * Validation: Must be valid resource reference string if provided; enables dynamic resource linking when specified
   **/
  readonly generated?: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for DataBrew dataset properties with S3 and Glue Data Catalog integration capabilities. Defines dataset source configuration for DataBrew jobs supporting data discovery from S3 locations and Glue catalog tables for data preparation workflows.
 *
 * Use cases: S3 data source configuration; Glue catalog integration; Dataset discovery; Data source management
 *
 * AWS: DataBrew dataset configuration with S3 and Glue Data Catalog source integration
 *
 * Validation: input is required; format and options must be compatible with data source
 */
export interface DatasetProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required input configuration defining how DataBrew locates and accesses the dataset from S3 or Glue Data Catalog. Specifies the data source location and access parameters for DataBrew dataset operations enabling data discovery and preparation workflows.
   *
   * Use cases: Data source location; S3 integration; Glue catalog access; Dataset discovery
   *
   * AWS: AWS Glue DataBrew dataset input configuration for S3 and catalog data source access
   *
   * Validation: Must be valid CfnDataset.InputProperty or IResolvable; required for dataset source configuration
   *   **/
  readonly input: CfnDataset.InputProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional file format specification for S3-based datasets enabling proper data parsing and interpretation. Defines the file format for datasets created from S3 files or folders affecting data interpretation and processing capabilities in DataBrew workflows.
   *
   * Use cases: File format specification; Data parsing; S3 file interpretation; Format handling
   *
   * AWS: AWS Glue DataBrew dataset format for S3 file interpretation and data parsing
   *
   * Validation: Must be valid DataBrew format string if provided; affects data parsing and interpretation
   **/
  readonly format?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional format options defining how DataBrew interprets data structure and content within the dataset. Provides detailed configuration for data interpretation including delimiters, headers, encoding, and other format-specific settings for accurate data processing.
   *
   * Use cases: Data interpretation; Format configuration; Parsing options; Content structure definition
   *
   * AWS: AWS Glue DataBrew format options for dataset interpretation and parsing configuration
   *
   * Validation: Must be valid CfnDataset.FormatOptionsProperty if provided; configures data interpretation and parsing
   *   **/
  readonly formatOptions?: CfnDataset.FormatOptionsProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional path options defining how DataBrew interprets S3 path structure and file organization for dataset access. Specifies path interpretation settings for S3-based datasets including file patterns, directory structures, and path-based data organization.
   *
   * Use cases: S3 path interpretation; File organization; Directory structure; Path patterns
   *
   * AWS: AWS Glue DataBrew path options for S3 dataset path interpretation and file organization
   *
   * Validation: Must be valid CfnDataset.PathOptionsProperty if provided; configures S3 path interpretation and file access
   *   **/
  readonly pathOptions?: CfnDataset.PathOptionsProperty | IResolvable;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for DataBrew recipe properties with transformation step definitions and recipe management capabilities. Defines recipe configuration for DataBrew data transformation workflows including step specifications, descriptions, and recipe metadata for systematic data preparation operations.
 *
 * Use cases: Data transformation recipes; Step-based data processing; Recipe documentation; Transformation workflows
 *
 * AWS: DataBrew recipe configuration for data transformation steps and recipe management
 *
 * Validation: steps is required; description should document recipe purpose and transformations
 */
export interface RecipeProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required transformation steps definition for DataBrew recipe execution enabling systematic data preparation and cleansing operations. Defines the sequence of transformation steps that will be applied to data during recipe execution for automated data preparation workflows.
   *
   * Use cases: Data transformation; Recipe steps; Preparation workflows; Systematic processing
   *
   * AWS: AWS Glue DataBrew recipe steps for data transformation and preparation operations
   *
   * Validation: Must be valid DataBrew transformation steps string; required for recipe execution and data processing
   **/
  readonly steps: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional description of the recipe explaining its purpose and transformation operations for documentation and management clarity. Provides human-readable description of the recipe's purpose and the data transformations it performs for operational understanding.
   *
   * Use cases: Recipe documentation; Operational clarity; Transformation explanation; Management understanding
   *
   * AWS: AWS Glue DataBrew recipe description for documentation and operational clarity
   *
   * Validation: Must be descriptive text if provided; recommended for recipe documentation and operational understanding
   **/
  readonly description?: string;
}

export interface DatabrewProjectConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required unique name for the DataBrew project enabling project identification and management. Provides the project identifier for DataBrew operations and serves as the primary reference for interactive data preparation sessions and recipe development.
   *
   * Use cases: Project identification; Session management; Recipe development; Interactive preparation
   *
   * AWS: AWS Glue DataBrew project name for identification and session management
   *
   * Validation: Must be unique project name string; required for project creation and identification
   **/
  readonly name: string;
  readonly datasetName: string;
  readonly recipeName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role ARN for DataBrew project permissions enabling secure access to AWS services and resources. Provides the execution role that DataBrew assumes for project operations including data access, recipe development, and resource management.
   *
   * Use cases: Project permissions; Service access; Security roles; Resource authorization
   *
   * AWS: AWS IAM role ARN for DataBrew project permissions and service access
   *
   * Validation: Must be valid IAM role ARN string; required for project execution permissions and resource access
   **/
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
    const records = this.props.jobs;
    for (const key in records) {
      const roleName = this.props.roleHelper
        .resolveRoleRefsWithOrdinals([records[key].executionRole], 'executionRole')
        .map(x => x.name())[0];
      const job = this.createJob(key, roleName, records[key]);
      const schedule = records[key]?.schedule;
      if (schedule) {
        this.createSchedule([job.name], schedule).addDependency(job);
      }
    }
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
      if (isNaN(Number(key)) && key.trim().length > 0 && isUpperCase(key.charAt(0))) {
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

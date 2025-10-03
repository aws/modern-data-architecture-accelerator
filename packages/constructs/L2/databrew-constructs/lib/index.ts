/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IResolvable } from 'aws-cdk-lib';
import { CfnJob, CfnJobProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

export interface MdaaDataBrewJobProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required unique name for the DataBrew job that will be processed through MDAA naming conventions. Provides predictable job naming for cross-service integration and operational management within data processing workflows.
   *
   * Use cases: Predictable job naming; Cross-service integration; Operational management and monitoring
   *
   * AWS: AWS Glue DataBrew job name for resource identification and workflow management
   *
   * Validation: Must be valid DataBrew job name; required; processed through MDAA naming conventions
   **/
  readonly name: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role ARN for DataBrew job execution providing necessary permissions for data access and processing. Enables secure access to input data sources, output destinations, and AWS services required for job execution.
   *
   * Use cases: Secure job execution; Data access permissions; Cross-service integration with proper IAM controls
   *
   * AWS: AWS IAM role for Glue DataBrew job execution and resource access permissions
   *
   * Validation: Must be valid IAM role ARN; required; role must be assumable by DataBrew service
   **/
  readonly roleArn: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Required job type specification determining the DataBrew job processing mode and capabilities. Controls whether the job performs data profiling, recipe execution, or other DataBrew operations with specific processing characteristics.
   *
   * Use cases: Job processing mode selection; Workflow type specification; Processing capability control
   *
   * AWS: AWS Glue DataBrew job type for processing mode and capability determination
   *
   * Validation: Must be valid DataBrew job type (PROFILE, RECIPE); required; determines job processing behavior
   **/
  readonly type: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of AWS Glue Data Catalog output configurations for metadata integration. Enables automatic registration of job outputs in the Glue Data Catalog for data discovery, cataloging, and integration with other AWS analytics services.
   *
   * Use cases: Data catalog integration; Metadata management; Analytics service integration
   *
   * AWS: AWS Glue Data Catalog output configuration for metadata registration and discovery
   *
   * Validation: Must be array of valid DataCatalogOutputProperty objects if provided; enables catalog integration
   *   **/
  readonly dataCatalogOutputs?: IResolvable | (IResolvable | CfnJob.DataCatalogOutputProperty)[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of JDBC database output configurations for direct database integration. Enables DataBrew jobs to write processed data directly to relational databases for immediate consumption by database-dependent applications.
   *
   * Use cases: Direct database integration; Relational data output; Database-dependent application feeding
   *
   * AWS: AWS Glue DataBrew database output configuration for direct database writing
   *
   * Validation: Must be array of valid DatabaseOutputProperty objects if provided; requires valid JDBC connections
   *   **/
  readonly databaseOutputs?: IResolvable | (IResolvable | CfnJob.DatabaseOutputProperty)[];

  readonly datasetName?: string;

  readonly encryptionKeyArn: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional job sample configuration for profile jobs controlling the number of rows analyzed during profiling operations. Enables efficient profiling of large datasets by analyzing representative samples while maintaining statistical accuracy.
   *
   * Use cases: Large dataset profiling; Performance optimization; Statistical sampling for data quality assessment
   *
   * AWS: AWS Glue DataBrew job sample configuration for profile job row sampling
   *
   * Validation: Must be valid JobSampleProperty if provided; only applicable to PROFILE job types
   *   **/
  readonly jobSample?: CfnJob.JobSampleProperty | IResolvable;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional CloudWatch logging subscription status for job execution monitoring and troubleshooting. Enables detailed logging of job execution steps, errors, and performance metrics for operational visibility and debugging.
   *
   * Use cases: Job execution monitoring; Error troubleshooting; Performance analysis and optimization
   *
   * AWS: AWS CloudWatch logging configuration for DataBrew job execution monitoring
   *
   * Validation: Must be valid log subscription status if provided; enables CloudWatch integration when specified
   **/
  readonly logSubscription?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum number of compute nodes for job execution controlling processing capacity and parallelism. Enables scaling of DataBrew jobs for large datasets while managing cost and performance characteristics.
   *
   * Use cases: Performance scaling; Cost optimization; Large dataset processing capacity control
   *
   * AWS: AWS Glue DataBrew job compute capacity configuration for processing scalability
   *
   * Validation: Must be positive integer if provided; determines maximum compute resources for job execution
   **/
  readonly maxCapacity?: number;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum retry attempts for failed job executions providing resilience against transient failures. Enables automatic recovery from temporary issues while preventing infinite retry loops for persistent failures.
   *
   * Use cases: Job resilience; Transient failure recovery; Automated retry management
   *
   * AWS: AWS Glue DataBrew job retry configuration for failure recovery and resilience
   *
   * Validation: Must be non-negative integer if provided; controls automatic retry behavior for failed jobs
   **/
  readonly maxRetries?: number;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional output location configuration for job results storage controlling where processed data is written. Enables flexible output destination management for different storage requirements and integration patterns.
   *
   * Use cases: Output destination control; Storage integration; Result organization and management
   *
   * AWS: AWS Glue DataBrew job output location configuration for result storage
   *
   * Validation: Must be valid OutputLocationProperty if provided; defines where job results are stored
   *   **/
  readonly outputLocation?: CfnJob.OutputLocationProperty | IResolvable;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of output artifacts representing job execution results and processed data. Enables multiple output formats and destinations for data processing workflows and downstream consumption.
   *
   * Use cases: Multiple output formats; Downstream data consumption; result generation
   *
   * AWS: AWS Glue DataBrew job output configuration for multiple result artifacts
   *
   * Validation: Must be array of valid OutputProperty objects if provided; defines job output artifacts
   *   **/
  readonly outputs?: IResolvable | (CfnJob.OutputProperty | IResolvable)[];

  /**
   * Q-ENHANCED-PROPERTY
   * Optional profile configuration for data profiling jobs controlling analysis scope and statistical computations. Enables customized data quality assessment and statistical analysis for dataset understanding.
   *
   * Use cases: Data quality assessment; Statistical analysis customization; Dataset profiling configuration
   *
   * AWS: AWS Glue DataBrew profile job configuration for data analysis and quality assessment
   *
   * Validation: Must be valid ProfileConfigurationProperty if provided; only applicable to PROFILE job types
   *   **/
  readonly profileConfiguration?: CfnJob.ProfileConfigurationProperty | IResolvable;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional DataBrew project name for job organization and resource grouping. Enables logical grouping of related jobs, datasets, and recipes for improved project management and operational organization.
   *
   * Use cases: Job organization; Project management; Resource grouping and operational coordination
   *
   * AWS: AWS Glue DataBrew project reference for job organization and management
   *
   * Validation: Must be valid DataBrew project name if provided; project must exist and be accessible
   **/
  readonly projectName?: string;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional recipe configuration defining data transformation steps for recipe jobs. Enables complex data transformation workflows through declarative recipe definitions for consistent and repeatable data processing.
   *
   * Use cases: Data transformation workflows; Recipe-based processing; Declarative data manipulation
   *
   * AWS: AWS Glue DataBrew recipe configuration for data transformation and processing
   *
   * Validation: Must be valid RecipeProperty if provided; only applicable to RECIPE job types
   *   **/
  readonly recipe?: CfnJob.RecipeProperty | IResolvable;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional job execution timeout in minutes controlling maximum job runtime and preventing runaway processes. Enables resource management and cost control by limiting job execution time for predictable operations.
   *
   * Use cases: Resource management; Cost control; Runaway process prevention
   *
   * AWS: AWS Glue DataBrew job timeout configuration for execution time limits
   *
   * Validation: Must be positive integer in minutes if provided; controls maximum job execution duration
   **/
  readonly timeout?: number;

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of validation configurations for profile job data quality rules and constraints. Enables automated data quality validation and constraint checking for data governance and quality assurance.
   *
   * Use cases: Data quality validation; Automated constraint checking; Data governance and quality assurance
   *
   * AWS: AWS Glue DataBrew validation configuration for data quality rules and constraints
   *
   * Validation: Must be array of valid ValidationConfigurationProperty objects if provided; only for PROFILE jobs
   *   **/
  readonly validationConfigurations?: IResolvable | (CfnJob.ValidationConfigurationProperty | IResolvable)[];
}

/**
 * A construct which creates a compliant Databrew Job.
 */
export class MdaaDataBrewJob extends CfnJob {
  private static setProps(props: MdaaDataBrewJobProps): CfnJobProps {
    const overrideProps = {
      name: props.naming.resourceName(props.name, 80),
      encryptionMode: 'SSE-KMS',
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaDataBrewJobProps) {
    super(scope, id, MdaaDataBrewJob.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'Job',
          resourceId: props.name,
          name: 'name',
          value: this.name,
        },
        ...props,
      },
      scope,
    );
  }
}

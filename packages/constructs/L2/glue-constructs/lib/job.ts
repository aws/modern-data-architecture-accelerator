/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct'; //NOSONAR
import { IResolvable } from 'aws-cdk-lib';
import { CfnJob, CfnJobProps } from 'aws-cdk-lib/aws-glue';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { ConfigurationElement, TagElement } from '@aws-mdaa/config';

export interface MdaaCfnJobProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required job command configuration defining the code execution environment and script location for ETL processing. Specifies the job command including script location, job type, and execution parameters for data transformation workflows.
   *
   * Use cases: ETL script execution; Job type specification; Code deployment; Data transformation processing
   *
   * AWS: AWS Glue job command configuration for ETL script execution and job type specification
   *
   * Validation: Must be valid CfnJob.JobCommandProperty; required for job execution and script deployment
   *   **/
  readonly command: CfnJob.JobCommandProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role name or ARN for Glue service permissions enabling secure access to AWS services and resources. Provides the execution role that Glue assumes to perform ETL operations and access data sources and targets.
   *
   * Use cases: Service permissions; AWS resource access; Security roles; Data source access
   *
   * AWS: AWS IAM role for Glue job service permissions and resource access
   *
   * Validation: Must be valid IAM role name or ARN string; required for Glue service operations and resource access
   **/
  readonly role: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional allocated capacity in DPUs for legacy job types with fixed compute resource provisioning. Defines the compute capacity allocated to the Glue job for processing data transformation workloads with predictable resource requirements.
   *
   * Use cases: Fixed capacity ETL jobs; Predictable workload sizing; Cost-controlled processing; Legacy job compatibility
   *
   * AWS: AWS Glue job allocated capacity for compute resource allocation
   *
   * Validation: Must be positive integer if provided; deprecated in favor of NumberOfWorkers and WorkerType for newer job types
   **/
  readonly allocatedCapacity?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional connections configuration for accessing external data sources and databases during ETL processing. Defines the network connections that the Glue job can use to access data sources, databases, and external systems.
   *
   * Use cases: Database connections; External data source access; Network connectivity; Data source integration
   *
   * AWS: AWS Glue job connections for external data source and database access
   *
   * Validation: Must be valid CfnJob.ConnectionsListProperty if provided; enables external data source access when specified
   *   **/
  readonly connections?: CfnJob.ConnectionsListProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional default arguments for job configuration and parameter passing enabling flexible ETL script configuration. Defines default job arguments including AWS Glue system parameters and custom job parameters for ETL script configuration and execution control.
   *
   * Use cases: Job parameter configuration; ETL script arguments; System parameter settings; Job execution control; Custom configuration
   *
   * AWS: AWS Glue job default arguments for job parameter configuration and script execution
   *
   * Validation: Must be valid key-value pairs if provided; supports AWS Glue system parameters and custom arguments
   **/
  readonly defaultArguments?: ConfigurationElement | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional description of the Glue job explaining its purpose and ETL operations for documentation and management clarity. Provides human-readable description of the job's purpose and the data transformations it performs.
   *
   * Use cases: Job documentation; Management clarity; ETL operation explanation; Operational understanding
   *
   * AWS: AWS Glue job description for documentation and management
   *
   * Validation: Must be descriptive text if provided; recommended for job documentation and operational clarity
   **/
  readonly description?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional execution properties controlling concurrent runs and job execution limits for resource management. Defines execution property configuration including maximum concurrent runs for job execution control and resource management in ETL workflows.
   *
   * Use cases: Concurrent execution control; Resource management; Job scheduling limits; Performance optimization; Workload management
   *
   * AWS: AWS Glue job execution properties for concurrent execution control and resource management
   *
   * Validation: Must be valid CfnJob.ExecutionPropertyProperty if provided; controls job execution limits and concurrency
   *   **/
  readonly executionProperty?: CfnJob.ExecutionPropertyProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Glue version determining Apache Spark and Python versions for job execution runtime environment. Defines the AWS Glue version which controls the underlying Spark and Python versions available for ETL job execution and feature compatibility.
   *
   * Use cases: Runtime version control; Feature compatibility; Spark version selection; Python version targeting; ETL environment specification
   *
   * AWS: AWS Glue job version for runtime environment specification and feature compatibility
   *
   * Validation: Must be valid AWS Glue version string if provided; affects available features and runtime environment
   **/
  readonly glueVersion?: string;
  readonly logUri?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum capacity in DPUs for job execution resource allocation enabling performance and cost optimization. Defines the maximum number of DPUs that can be allocated when the job runs affecting processing power and cost.
   *
   * Use cases: Performance optimization; Cost control; Resource allocation; Processing capacity; ETL scaling
   *
   * AWS: AWS Glue job maximum capacity for DPU allocation and resource management
   *
   * Validation: Must be positive number if provided; cannot be used with WorkerType and NumberOfWorkers; affects job performance and cost
   **/
  readonly maxCapacity?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum retry attempts for failed job runs enabling fault tolerance and reliability. Defines the maximum number of times to retry the job after a JobRun fails for improved reliability and fault tolerance.
   *
   * Use cases: Fault tolerance; Job reliability; Error recovery; Retry logic; ETL resilience
   *
   * AWS: AWS Glue job maximum retries for failed job run recovery and fault tolerance
   *
   * Validation: Must be non-negative integer if provided; enables automatic retry for failed job executions
   **/
  readonly maxRetries?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Required name for the Glue job enabling job identification and management in ETL workflows. Provides the job identifier for Glue operations and serves as the primary reference for job management and monitoring.
   *
   * Use cases: Job identification; ETL workflow management; Job monitoring; Resource tracking
   *
   * AWS: AWS Glue job name for identification and management operations
   *
   * Validation: Must be unique job name string; required for job creation and identification
   **/
  readonly name: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional notification configuration for job status and completion alerts enabling monitoring and alerting. Defines notification configuration including SNS topic settings for job execution status notifications enabling monitoring and alerting for ETL job workflows.
   *
   * Use cases: Job monitoring; Status notifications; Failure alerts; Completion notifications; ETL workflow monitoring
   *
   * AWS: AWS Glue job notification properties for SNS-based job notifications and monitoring
   *
   * Validation: Must be valid CfnJob.NotificationPropertyProperty if provided; enables job status notifications when configured
   *   **/
  readonly notificationProperty?: CfnJob.NotificationPropertyProperty | IResolvable;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of workers for parallel processing capacity enabling horizontal scaling and performance optimization. Defines the worker count for job execution enabling horizontal scaling and parallel processing for ETL workloads with performance and cost optimization.
   *
   * Use cases: Parallel processing; Performance scaling; Cost optimization; Workload sizing; ETL performance tuning
   *
   * AWS: AWS Glue job number of workers for worker allocation and parallel processing
   *
   * Validation: Must be positive integer if provided; maximum varies by worker type; enables horizontal scaling when specified
   **/
  readonly numberOfWorkers?: number;
  readonly securityConfiguration: string;
  readonly tags?: TagElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional job timeout in minutes controlling maximum execution time for ETL operations enabling cost control and SLA management. Defines the maximum time the job can run before being terminated, critical for ETL workflows and resource management.
   *
   * Use cases: ETL timeout management; Cost control; SLA enforcement; Long-running data transformation operations
   *
   * AWS: AWS Glue job timeout configuration for ETL execution time control and resource management
   *
   * Validation: Must be positive integer in minutes if provided; defaults to 2880 minutes (48 hours) for data processing jobs
   **/
  readonly timeout?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional worker type defining compute resource specifications for job execution enabling performance and cost optimization. Specifies worker type (Standard, G.1X, G.2X) that determines CPU, memory, and disk allocation per worker for ETL job execution.
   *
   * Use cases: Performance optimization; Memory-intensive jobs; Cost optimization; Resource specification; ETL workload tuning
   *
   * AWS: AWS Glue job worker type for worker resource specification and performance optimization
   *
   * Validation: Must be 'Standard', 'G.1X', or 'G.2X' if provided; each type has different resource specifications
   **/
  readonly workerType?: string;
}

/**
 * Construct for creating a compliant Glue Job
 * Enforces the following:
 * * Security Configuration is set
 */
export class MdaaCfnJob extends CfnJob {
  private static setProps(props: MdaaCfnJobProps): CfnJobProps {
    const overrideProps = {
      name: props.naming.resourceName(props.name),
    };
    return { ...props, ...overrideProps };
  }
  constructor(scope: Construct, id: string, props: MdaaCfnJobProps) {
    super(scope, id, MdaaCfnJob.setProps(props));
    MdaaNagSuppressions.addCodeResourceSuppressions(
      this,
      [
        { id: 'AwsSolutions-GL1', reason: 'Log encryption configured via SecurityConfiguration' },
        { id: 'AwsSolutions-GL3', reason: 'Bookmark encryption configured via SecurityConfiguration' },
      ],
      true,
    );
  }
}

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
import { BucketDeployment, ISource, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import * as path from 'path';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { MdaaSnsTopic } from '@aws-mdaa/sns-constructs';
import { Rule } from 'aws-cdk-lib/aws-events';
import { Fn } from 'aws-cdk-lib';
import { ConfigurationElement } from '@aws-mdaa/config';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { updateProps } from '@aws-mdaa/cloudwatch-constructs/lib/loggroup-utils';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { IRole } from 'aws-cdk-lib/aws-iam';

export type JobCommandPythonVersion = '2' | '3' | undefined;
export type JobCommandName = 'glueetl' | 'pythonshell';

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for Glue job logging with CloudWatch log retention management and compliance requirements. Defines log retention settings for Glue job execution logs ensuring proper log management, compliance, and cost optimization for DataOps job monitoring and audit trails.
 *
 * Use cases: Log retention management; Compliance requirements; Cost optimization; Audit trail management
 *
 * AWS: CloudWatch log group retention for Glue job execution logs and monitoring
 *
 * Validation: logGroupRetentionDays is required with specific allowed values for retention period
 */
export interface LoggingConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required CloudWatch log group retention period in days for Glue job log management and compliance requirements. Defines how long job execution logs are retained in CloudWatch with specific allowed values for log retention, compliance management, and storage cost optimization.
   *
   * Use cases: Log retention management; Compliance requirements; Storage cost optimization; Audit trail management
   *
   * AWS: CloudWatch log group retention for Glue job execution logs and audit trail management
   *
   * Validation: Must be 1,3,5,7,14,30,60,90,120,150,180,365,400,545,731,1827,3653, or 0; required for log retention configuration
   **/
  readonly logGroupRetentionDays: number;
}

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for Glue job command specification with script execution and runtime environment settings. Defines job command configuration including job type, Python version, and script location for Glue ETL and Python shell job execution within DataOps workflows.
 *
 * Use cases: Job command configuration; Script execution; Runtime environment; ETL job setup
 *
 * AWS: Glue job command configuration for script execution and runtime environment
 *
 * Validation: name and scriptLocation are required; pythonVersion is optional with specific constraints
 */
export interface JobCommand {
  /**
   * Q-ENHANCED-PROPERTY
   * Required job command name specification controlling Glue job execution type and runtime environment. Defines whether to use glueetl for ETL jobs with Spark runtime or pythonshell for Python script execution with different resource allocation and capabilities.
   *
   * Use cases: Job type selection; Runtime environment; Execution model; Resource allocation
   *
   * AWS: Glue job command name for execution type and runtime environment selection
   *
   * Validation: Must be glueetl or pythonshell; required for job command type and execution environment
   *   **/
  readonly name: JobCommandName;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Python version specification for Glue job runtime environment enabling version-specific script execution and compatibility. When specified, controls the Python runtime version for job execution ensuring script compatibility and feature availability.
   *
   * Use cases: Python version control; Runtime compatibility; Script execution; Version management
   *
   * AWS: Glue job Python version for runtime environment and script compatibility
   *
   * Validation: Must be 2 or 3 if provided; controls Python runtime version for job execution
   *   **/
  readonly pythonVersion?: JobCommandPythonVersion;
  /**
   * Q-ENHANCED-PROPERTY
   * Required relative path to Glue script for job execution enabling script location specification and code deployment. Provides the S3 path or relative location of the Glue script that will be executed by the job for ETL processing and data transformation.
   *
   * Use cases: Script location; Code deployment; Job execution; ETL processing
   *
   * AWS: Glue job script location for code execution and ETL processing
   *
   * Validation: Must be valid script path; required for job script location and code execution
   **/
  readonly scriptLocation: string;
}

export type JobWorkerType = 'Standard' | 'G.1X' | 'G.2X';

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for Glue job properties providing ETL job configuration and resource management capabilities. Defines complete Glue job setup including execution roles, commands, capacity allocation, retry policies, and monitoring for DataOps ETL processing and data transformation workflows.
 *
 * Use cases: ETL job configuration; Data transformation; Job resource management; DataOps processing
 *
 * AWS: Glue job configuration for ETL processing and data transformation workflows
 *
 * Validation: executionRoleArn, command, and description are required; other properties are optional with specific constraints
 */
export interface JobConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required execution role ARN for Glue job permissions enabling secure job execution and AWS service access. Provides the IAM role that the Glue job will assume for executing ETL operations and accessing AWS services during data processing workflows.
   *
   * Use cases: Job permissions; Service access; Secure execution; IAM role management
   *
   * AWS: IAM role ARN for Glue job execution permissions and service access
   *
   * Validation: Must be valid IAM role ARN; required for job execution permissions and service access
   **/
  readonly executionRoleArn: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required job command configuration defining script execution and runtime environment for Glue job processing. Provides the command specification including job type, Python version, and script location for ETL job execution and data transformation.
   *
   * Use cases: Script execution; Runtime configuration; Job command setup; ETL processing
   *
   * AWS: Glue job command for script execution and runtime environment configuration
   *
   * Validation: Must be valid JobCommand; required for job command configuration and script execution
   *   **/
  readonly command: JobCommand;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional template reference for job configuration inheritance enabling reusable job configurations and standardized setups. When specified, inherits configuration from a template defined elsewhere in the configuration for consistent job setup and management.
   *
   * Use cases: Configuration inheritance; Template reuse; Standardized setup; Configuration management
   *
   * AWS: Job template reference for configuration inheritance and standardized job setup
   *
   * Validation: Must be valid template name if provided; enables configuration inheritance from defined templates
   **/
  readonly template?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional allocated capacity specification for Glue job resource allocation controlling job performance and cost management. Defines the number of capacity units allocated to the job for processing performance and resource utilization optimization.
   *
   * Use cases: Resource allocation; Performance tuning; Cost management; Capacity planning
   *
   * AWS: Glue job allocated capacity for resource allocation and performance optimization
   *
   * Validation: Must be positive integer if provided; controls job resource allocation and performance
   **/
  readonly allocatedCapacity?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of connection names for Glue job network connectivity enabling database and external system access. Provides network connections for accessing databases, VPC resources, and external systems during ETL processing and data integration.
   *
   * Use cases: Database connectivity; VPC access; External system integration; Network configuration
   *
   * AWS: Glue job connections for database and external system connectivity
   *
   * Validation: Must be array of valid connection names if provided; enables database and external system access
   **/
  readonly connections?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional default arguments map for Glue job parameter configuration enabling job customization and runtime behavior control. Provides default parameters and arguments that will be passed to the job for runtime configuration and behavior customization.
   *
   * Use cases: Job parameters; Runtime configuration; Behavior customization; Parameter management
   *
   * AWS: Glue job default arguments for runtime configuration and parameter management
   *
   * Validation: Must be valid ConfigurationElement if provided; enables job parameter configuration and customization
   **/
  readonly defaultArguments?: ConfigurationElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Required job description for documentation and operational management enabling job identification and purpose documentation. Provides descriptive information about the job's purpose, functionality, and operational characteristics for management and documentation.
   *
   * Use cases: Job documentation; Operational management; Purpose identification; Management information
   *
   * AWS: Glue job description for documentation and operational management
   *
   * Validation: Must be descriptive text; required for job documentation and operational management
   **/
  readonly description: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional execution property configuration for Glue job concurrency control enabling parallel execution management and resource optimization. Defines execution properties including maximum concurrent executions for job scheduling and resource management.
   *
   * Use cases: Concurrency control; Parallel execution; Resource management; Job scheduling
   *
   * AWS: Glue job execution properties for concurrency control and parallel execution management
   *
   * Validation: Must be valid ExecutionPropertyProperty if provided; controls job concurrency and parallel execution
   *   **/
  readonly executionProperty?: CfnJob.ExecutionPropertyProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Glue version specification for runtime environment control enabling version-specific features and compatibility. Defines the Glue runtime version for job execution ensuring feature availability and compatibility with job requirements.
   *
   * Use cases: Runtime version control; Feature availability; Compatibility management; Version specification
   *
   * AWS: Glue version for runtime environment and feature availability
   *
   * Validation: Must be valid Glue version if provided; controls runtime environment and feature availability
   **/
  readonly glueVersion?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum capacity specification for Glue job resource limits controlling maximum resource allocation and cost management. Defines the maximum number of DPUs (Data Processing Units) that can be allocated to the job for resource control and cost optimization.
   *
   * Use cases: Resource limits; Cost control; Maximum allocation; Resource management
   *
   * AWS: Glue job maximum capacity for resource limits and cost control
   *
   * Validation: Must be positive number if provided; controls maximum DPU allocation and resource limits
   **/
  readonly maxCapacity?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional maximum retry count for Glue job failure handling enabling automatic retry and error recovery. Defines the maximum number of retries before job failure occurs for automatic error recovery and job reliability.
   *
   * Use cases: Error recovery; Automatic retry; Job reliability; Failure handling
   *
   * AWS: Glue job maximum retries for automatic error recovery and job reliability
   *
   * Validation: Must be non-negative integer if provided; controls automatic retry behavior and error recovery
   **/
  readonly maxRetries?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional notification property configuration for Glue job monitoring and alerting enabling job status notifications and operational awareness. Defines notification settings including notification delay for job monitoring and operational alerting.
   *
   * Use cases: Job monitoring; Status notifications; Operational alerting; Monitoring configuration
   *
   * AWS: Glue job notification properties for monitoring and alerting configuration
   *
   * Validation: Must be valid NotificationPropertyProperty if provided; enables job monitoring and alerting
   *   **/
  readonly notificationProperty?: CfnJob.NotificationPropertyProperty;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional number of workers specification for Glue job parallel processing enabling distributed processing and performance optimization. Defines the number of workers assigned to the job for parallel processing and distributed data transformation.
   *
   * Use cases: Parallel processing; Distributed processing; Performance optimization; Worker allocation
   *
   * AWS: Glue job number of workers for parallel processing and performance optimization
   *
   * Validation: Must be positive integer if provided; controls parallel processing and worker allocation
   **/
  readonly numberOfWorkers?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional timeout specification for Glue job execution limits enabling job runtime control and resource management. Defines the maximum execution time for the job in minutes for runtime control and resource optimization.
   *
   * Use cases: Runtime control; Execution limits; Resource management; Timeout configuration
   *
   * AWS: Glue job timeout for execution time limits and resource management
   *
   * Validation: Must be positive integer in minutes if provided; controls job execution time limits
   **/
  readonly timeout?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional worker type specification for Glue job compute resource selection enabling performance and cost optimization. Defines the type of workers (Standard, G.1X, G.2X) for compute resource allocation and performance characteristics.
   *
   * Use cases: Compute resource selection; Performance optimization; Cost management; Worker type configuration
   *
   * AWS: Glue job worker type for compute resource allocation and performance optimization
   *
   * Validation: Must be Standard, G.1X, or G.2X if provided; controls compute resource type and performance
   *   **/
  readonly workerType?: JobWorkerType;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of additional script paths for Glue job dependency management enabling modular ETL development and code reuse. Provides relative paths to additional Glue scripts referenced by the main ETL script for modular development and code organization.
   *
   * Use cases: Script dependencies; Modular development; Code reuse; Dependency management
   *
   * AWS: Additional Glue scripts for job dependencies and modular ETL development
   *
   * Validation: Must be array of valid script paths if provided; enables script dependencies and modular development
   **/
  readonly additionalScripts?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of additional JAR file paths for Glue job library dependencies enabling Java library integration and extended functionality. Provides relative paths to JAR files referenced by the ETL script for Java library integration and extended processing capabilities.
   *
   * Use cases: Java library integration; Extended functionality; Library dependencies; JAR file management
   *
   * AWS: Additional JAR files for Glue job library dependencies and Java integration
   *
   * Validation: Must be array of valid JAR file paths if provided; enables Java library integration and extended functionality
   **/
  readonly additionalJars?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of additional file paths for Glue job resource dependencies enabling external file access and resource management. Provides relative paths to additional files referenced by the ETL script for external resource access and file dependencies.
   *
   * Use cases: File dependencies; External resources; Resource management; File access
   *
   * AWS: Additional files for Glue job resource dependencies and external file access
   *
   * Validation: Must be array of valid file paths if provided; enables external file access and resource dependencies
   **/
  readonly additionalFiles?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional continuous logging configuration for Glue job real-time monitoring enabling live log streaming and troubleshooting support. When enabled, streams job logs to CloudWatch Logs in real-time for live monitoring and troubleshooting during job execution.
   *
   * Use cases: Real-time monitoring; Live log streaming; Troubleshooting support; Operational visibility
   *
   * AWS: Glue job continuous logging for real-time monitoring and troubleshooting
   *
   * Validation: Must be valid LoggingConfig if provided; enables real-time log streaming and monitoring
   **/
  readonly continuousLogging?: LoggingConfig;
}

export interface GlueJobL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Role which will be used to deploy the Job code. Should be obtained from the DataOps Project
   */
  readonly deploymentRoleArn?: string;
  /**
   * The name of the Data Ops project bucket where job resources will be deployed and which will be used as a temporary job location
   */
  readonly projectBucketName?: string;
  /**
   * Map of job names to job configurations
   */
  readonly jobConfigs: { [key: string]: JobConfig };
  /**
   * Name of the Glue Security configuration to be used for all jobs. Likely supplied by the DataOps Project.
   */
  readonly securityConfigurationName?: string;
  /**
   * Name of the dataops project to which the job will be associated.
   */
  readonly projectName: string;

  /**
   * Notification topic Arn
   */
  readonly notificationTopicArn?: string;

  /**
   * Dataops project KMS key ARN.
   */
  readonly projectKMSArn?: string;
}

export class GlueJobL3Construct extends MdaaL3Construct {
  protected readonly props: GlueJobL3ConstructProps;
  private readonly projectKmsKey: IKey;

  constructor(scope: Construct, id: string, props: GlueJobL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    if (!this.props.deploymentRoleArn) {
      throw new Error('Deployment role ARN is required for job configuration');
    }
    const deploymentRole = MdaaRole.fromRoleArn(this.scope, `deployment-role`, this.props.deploymentRoleArn);
    if (!this.props.projectBucketName) {
      throw new Error('Project bucket name is required for job configuration');
    }
    const projectBucket = MdaaBucket.fromBucketName(this.scope, `project-bucket`, this.props.projectBucketName);
    if (!this.props.projectKMSArn) {
      throw new Error('Project KMS Key is required for job configuration');
    }
    this.projectKmsKey = Key.fromKeyArn(this, this.props.projectName, this.props.projectKMSArn);

    // Build our jobs!
    const allJobs = this.props.jobConfigs;
    Object.keys(allJobs).forEach(jobName => {
      const jobConfig = allJobs[jobName];
      this.createJob(jobName, jobConfig, deploymentRole, projectBucket);
    });
    //CDK S3 Deployment automatically adds inline policy to project deployment role.
    this.scope.node.children.forEach(child => {
      if (child.node.id.startsWith('deployment-role')) {
        MdaaNagSuppressions.addCodeResourceSuppressions(
          child,
          [
            { id: 'AwsSolutions-IAM5', reason: 'Inline policy used only for deployment.' },
            { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Policy used only for deployment.' },
            { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Policy used only for deployment.' },
            { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Policy used only for deployment.' },
          ],
          true,
        );
      }
    });
  }

  private deployAdditionalFiles(
    additionalFilesSources: ISource[],
    projectBucket: IBucket,
    deploymentRole: IRole,
    deploymentId: string,
    deploymentPath: string,
    extract: boolean,
  ): BucketDeployment {
    // Deploy Source asset(s) to /deployment/libs/<job> location.
    return new BucketDeployment(this.scope, deploymentId, {
      sources: additionalFilesSources,
      destinationBucket: projectBucket,
      destinationKeyPrefix: deploymentPath,
      role: deploymentRole,
      extract: extract,
    });
  }

  private addAdditionalScripts(
    jobName: string,
    jobConfig: JobConfig,
    projectBucket: IBucket,
    deploymentRole: IRole,
    defaultArguments: ConfigurationElement,
  ) {
    if (jobConfig.additionalScripts) {
      /**
       * Group all files at parent directory level. This will allow creating zip lib assests at various directory levels
       * ex. '/main/script1.py' , '/util/script2.py' , '/util/script3.py' will create 2 zip files representing 'main' and 'utils'
       *  */
      const directoryToFile: { [filePath: string]: string[] } = {};
      jobConfig.additionalScripts.forEach(fileLocation => {
        const filePath = path.dirname(fileLocation.trim());
        if (filePath in directoryToFile) {
          directoryToFile[filePath].push(`!${path.basename(fileLocation.trim())}`);
        } else {
          directoryToFile[filePath] = [`!${path.basename(fileLocation.trim())}`];
        }
      });

      // Create Source asset for each directory
      const additionalFilesSources = Object.entries(directoryToFile).map(([filePath, fileNames]) => {
        return Source.asset(filePath, { exclude: ['**', ...fileNames] });
      });
      const deploymentPath = `deployment/libs/${jobName}`;
      const additionalFileDeployment = this.deployAdditionalFiles(
        additionalFilesSources,
        projectBucket,
        deploymentRole,
        deploymentPath,
        `job-deployment-${jobName}-additional-script`,
        false, // Glue expects zip of additional scripts, hence disabling the extraction
      );

      // Extract zip name(s) for each source and create comma separated list of s3 locations
      const libraryZipNames: string[] = [];

      for (let i = 0; i < additionalFilesSources.length; i++) {
        const libName = Fn.select(i, additionalFileDeployment.objectKeys); // Extract file name of zip containing additional scripts
        libraryZipNames.push(`s3://${additionalFileDeployment.deployedBucket.bucketName}/${deploymentPath}/${libName}`);
      }

      // Add comma separated list of zip file names to default arguments.
      if (defaultArguments['--extra-py-files']) {
        defaultArguments['--extra-py-files'] += ',' + libraryZipNames.join(',');
      } else {
        defaultArguments['--extra-py-files'] = libraryZipNames.join(',');
      }
    }
  }

  private addAdditionalJars(
    jobName: string,
    jobConfig: JobConfig,
    projectBucket: IBucket,
    deploymentRole: IRole,
    defaultArguments: ConfigurationElement,
  ) {
    if (jobConfig.additionalJars) {
      // Create Source asset for each directory
      const additionalFilesSources = jobConfig.additionalJars.map(fullFileName => {
        const filePath = path.dirname(fullFileName.trim());
        const fileName = path.basename(fullFileName.trim());
        return Source.asset(filePath, { exclude: ['**', `!${fileName}`] });
      });
      const deploymentPath = `deployment/libs/${jobName}`;

      const additionalFileDeployment = this.deployAdditionalFiles(
        additionalFilesSources,
        projectBucket,
        deploymentRole,
        `job-deployment-${jobName}-additional-jar`,
        deploymentPath,
        true,
      );

      const extraJarNames = jobConfig.additionalJars.map(fullFileName => {
        const fileName = path.basename(fullFileName.trim());
        return `s3://${additionalFileDeployment.deployedBucket.bucketName}/${deploymentPath}/${fileName}`;
      });

      // Add comma separated list of zip file names to default arguments.
      if (defaultArguments['--extra-jars']) {
        defaultArguments['--extra-jars'] += ',' + extraJarNames.join(',');
      } else {
        defaultArguments['--extra-jars'] = extraJarNames.join(',');
      }
    }
  }

  private addAdditionalFiles(
    jobName: string,
    jobConfig: JobConfig,
    projectBucket: IBucket,
    deploymentRole: IRole,
    defaultArguments: ConfigurationElement,
  ) {
    if (jobConfig.additionalFiles) {
      // Create Source asset for each directory
      const additionalFilesSources = jobConfig.additionalFiles.map(fullFileName => {
        const filePath = path.dirname(fullFileName.trim());
        const fileName = path.basename(fullFileName.trim());
        return Source.asset(filePath, { exclude: ['**', `!${fileName}`] });
      });
      const deploymentPath = `deployment/files/${jobName}`;
      const additionalFileDeployment = this.deployAdditionalFiles(
        additionalFilesSources,
        projectBucket,
        deploymentRole,
        `job-deployment-${jobName}-additional-file`,
        deploymentPath,
        true,
      );
      const extraFileNames = jobConfig.additionalFiles.map(fullFileName => {
        const fileName = path.basename(fullFileName.trim());
        return `s3://${additionalFileDeployment.deployedBucket.bucketName}/${deploymentPath}/${fileName}`;
      });

      // Add comma separated list of zip file names to default arguments.
      if (defaultArguments['--extra-files']) {
        defaultArguments['--extra-files'] += ',' + extraFileNames.join(',');
      } else {
        defaultArguments['--extra-files'] = extraFileNames.join(',');
      }
    }
  }

  private createJob(jobName: string, jobConfig: JobConfig, deploymentRole: IRole, projectBucket: IBucket) {
    const defaultArguments = jobConfig.defaultArguments ? jobConfig.defaultArguments : {};
    const scriptPath = path.dirname(jobConfig.command.scriptLocation.trim());
    const scriptName = path.basename(jobConfig.command.scriptLocation.trim());
    const scriptSource = Source.asset(scriptPath, { exclude: ['**', `!${scriptName}`] });

    const scriptDeploymentPath = `deployment/jobs/${jobName}`;
    const scriptDeployment = new BucketDeployment(this.scope, `job-deployment-${jobName}`, {
      sources: [scriptSource],
      destinationBucket: projectBucket,
      destinationKeyPrefix: scriptDeploymentPath,
      role: deploymentRole,
      extract: true,
    });

    this.addAdditionalScripts(jobName, jobConfig, projectBucket, deploymentRole, defaultArguments);
    this.addAdditionalJars(jobName, jobConfig, projectBucket, deploymentRole, defaultArguments);
    this.addAdditionalFiles(jobName, jobConfig, projectBucket, deploymentRole, defaultArguments);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.scope,
      [
        { id: 'AwsSolutions-L1', reason: 'Function is used only as custom resource during CDK deployment.' },
        {
          id: 'NIST.800.53.R5-LambdaConcurrency',
          reason: 'Function is used only as custom resource during CDK deployment.',
        },
        {
          id: 'NIST.800.53.R5-LambdaInsideVPC',
          reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.',
        },
        {
          id: 'NIST.800.53.R5-LambdaDLQ',
          reason:
            'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.',
        },
        {
          id: 'HIPAA.Security-LambdaConcurrency',
          reason: 'Function is used only as custom resource during CDK deployment.',
        },
        {
          id: 'PCI.DSS.321-LambdaConcurrency',
          reason: 'Function is used only as custom resource during CDK deployment.',
        },
        {
          id: 'HIPAA.Security-LambdaInsideVPC',
          reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.',
        },
        {
          id: 'PCI.DSS.321-LambdaInsideVPC',
          reason: 'Function is used only as custom resource during CDK deployment and interacts only with S3.',
        },
        {
          id: 'HIPAA.Security-LambdaDLQ',
          reason:
            'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.',
        },
        {
          id: 'PCI.DSS.321-LambdaDLQ',
          reason:
            'Function is used only as custom resource during CDK deployment. Errors will be handled by CloudFormation.',
        },
      ],
      true,
    );
    // Connections will require an array of references where they are defined
    let connectionsConfigured: ConfigurationElement | undefined;
    if (jobConfig.connections) {
      connectionsConfigured = {
        connections: jobConfig.connections,
      };
    }

    defaultArguments['--TempDir'] = `s3://${this.props.projectBucketName}/temp/jobs/${jobName}`;

    // add continuous logging unless explicitly disabled
    if (jobConfig.continuousLogging) {
      const logGroupName = jobName;
      const logGroupNamePathPrefix = '/aws/glue';
      defaultArguments['--continuous-log-logGroup'] = this.createLogGroup(
        logGroupNamePathPrefix,
        logGroupName,
        jobConfig.continuousLogging,
      );
    } else {
      console.log(`Continuous logging not enabled for job: ${jobName}`);
    }

    const inputParams = defaultArguments['--input_params'];
    if (inputParams) {
      defaultArguments['--input_params'] = JSON.stringify(inputParams);
    }
    if (!this.props.securityConfigurationName) {
      throw new Error('Security configuration name is required for job monitoring event rule');
    }
    const job = new MdaaCfnJob(this.scope, `${jobName}-job`, {
      command: {
        name: jobConfig.command.name,
        pythonVersion: jobConfig.command.pythonVersion,
        scriptLocation: `s3://${scriptDeployment.deployedBucket.bucketName}/${scriptDeploymentPath}/${scriptName}`,
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
      naming: this.props.naming,
    });
    if (job.name) {
      DataOpsProjectUtils.createProjectSSMParam(
        this.scope,
        this.props.naming,
        this.props.projectName,
        `job/name/${jobName}`,
        job.name,
      );

      const eventRule = this.createJobMonitoringEventRule(`${jobName}-monitor`, [job.name]);
      if (!this.props.notificationTopicArn) {
        throw new Error('Notification topic ARN is required for job monitoring event rule');
      }
      eventRule.addTarget(
        new SnsTopic(MdaaSnsTopic.fromTopicArn(this.scope, `${jobName}-topic`, this.props.notificationTopicArn)),
      );
    }
  }

  private createJobMonitoringEventRule(ruleName: string, jobNames: string[]): Rule {
    return EventBridgeHelper.createGlueMonitoringEventRule(
      this.scope,
      this.props.naming,
      ruleName,
      'Workflow Job failure events',
      {
        jobName: jobNames,
        state: ['FAILED', 'TIMEOUT', 'STOPPED'],
      },
    );
  }

  private createLogGroup(logGroupNamePathPrefix: string, logGroupName: string, loggingConfig: LoggingConfig): string {
    let logGroupRetentionDays: RetentionDays;

    if (loggingConfig.logGroupRetentionDays != 0) {
      logGroupRetentionDays = loggingConfig.logGroupRetentionDays;
    } else {
      logGroupRetentionDays = RetentionDays.INFINITE;
    }

    const logProps = {
      naming: this.props.naming,
      logGroupName: logGroupName,
      logGroupNamePathPrefix: logGroupNamePathPrefix,
      encryptionKey: this.projectKmsKey,
      retention: logGroupRetentionDays,
    };
    new MdaaLogGroup(this, logGroupName, logProps);
    // `updateProps` always returns a prop with a logGroupName
    return updateProps(logProps).logGroupName!;
  }
}

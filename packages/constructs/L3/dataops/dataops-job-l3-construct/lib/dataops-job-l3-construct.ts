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
import { Fn, Tags } from 'aws-cdk-lib';
import { MdaaNagSuppressions, MdaaStringParameter } from '@aws-mdaa/construct'; //NOSONAR
import { BucketDeployment, ISource, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import * as path from 'path';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { MdaaSnsTopic } from '@aws-mdaa/sns-constructs';
import { Rule } from 'aws-cdk-lib/aws-events';
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
 * Configuration for Glue job logging with CloudWatch log retention management.
 *
 * Use cases: Log retention management; Compliance requirements; Cost optimization; Audit trail management
 *
 * AWS: CloudWatch log group retention for Glue job execution logs and monitoring
 *
 * Validation: logGroupRetentionDays is required with specific allowed values for retention period
 */
export interface LoggingConfig {
  /** CloudWatch log group retention in days. Allowed: 1,3,5,7,14,30,60,90,120,150,180,365,400,545,731,1827,3653, or 0. */
  readonly logGroupRetentionDays: number;
}

/**
 * Configuration for a Glue job command specifying script execution and runtime environment.
 *
 * Use cases: Job command configuration; Script execution; Runtime environment; ETL job setup
 *
 * AWS: Glue job command configuration for script execution and runtime environment
 *
 * Validation: name and scriptLocation are required; pythonVersion is optional with specific constraints
 */
export interface JobCommand {
  /** Job type: 'glueetl' for Spark ETL or 'pythonshell' for Python scripts. */
  readonly name: JobCommandName;
  /** Python version for job runtime ('2' or '3'). */
  readonly pythonVersion?: JobCommandPythonVersion;
  /** Relative path to the Glue script for job execution, or `asset:<filename>` to use a pre-built script from the app's assets directory. Available assets: dq-main.py (DQ evaluation, with utils/ as additionalScripts). */
  readonly scriptLocation: string;
}

export type JobWorkerType = 'Standard' | 'G.1X' | 'G.2X';

/**
 * Configuration for a Glue job including execution roles, commands, capacity, and monitoring.
 *
 * Use cases: ETL job configuration; Data transformation; Job resource management; DataOps processing
 *
 * AWS: Glue job configuration for ETL processing and data transformation workflows
 *
 * Validation: executionRoleArn, command, and description are required; other properties are optional with specific constraints
 */
export interface JobConfig {
  /** IAM role ARN for Glue job execution permissions. */
  readonly executionRoleArn: string;
  /** Job command configuration defining script and runtime environment. */
  readonly command: JobCommand;
  /** Template name for configuration inheritance. */
  readonly template?: string;
  /** Number of capacity units allocated to the job. */
  readonly allocatedCapacity?: number;
  /** Connection names for database and external system access. */
  readonly connections?: string[];
  /** Default arguments passed to the job at runtime. */
  readonly defaultArguments?: ConfigurationElement;
  /** Job description for documentation and management. */
  readonly description: string;
  /** Execution properties including maximum concurrent runs. */
  readonly executionProperty?: CfnJob.ExecutionPropertyProperty;
  /** Glue runtime version for the job. */
  readonly glueVersion?: string;
  /** Maximum DPU capacity for the job. */
  readonly maxCapacity?: number;
  /** Maximum retry count before job failure. */
  readonly maxRetries?: number;
  /** Notification settings for job monitoring and alerting. */
  readonly notificationProperty?: CfnJob.NotificationPropertyProperty;
  /** Number of workers for parallel processing. */
  readonly numberOfWorkers?: number;
  /** Job timeout in minutes. */
  readonly timeout?: number;
  /** Worker type: 'Standard', 'G.1X', or 'G.2X'. */
  readonly workerType?: JobWorkerType;
  /** Relative paths to additional Python scripts for the job. */
  readonly additionalScripts?: string[];
  /** Relative paths to additional JAR files for the job. */
  readonly additionalJars?: string[];
  /** Relative paths to additional files for the job. */
  readonly additionalFiles?: string[];
  /** Continuous logging configuration for real-time monitoring. */
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
  readonly bucketName?: string;
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
  readonly projectName?: string;

  /**
   * Notification topic Arn
   */
  readonly notificationTopicArn?: string;

  /**
   * Dataops project KMS key ARN.
   */
  readonly kmsArn?: string;

  /**
   * Base path for resolving `asset:` prefixed script locations.
   * When a job's scriptLocation starts with `asset:`, it is resolved
   * relative to this directory.
   */
  readonly assetBasePath?: string;
}

export class GlueJobL3Construct extends MdaaL3Construct {
  protected readonly props: GlueJobL3ConstructProps;
  private readonly kmsKey: IKey;

  constructor(scope: Construct, id: string, props: GlueJobL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    if (!this.props.deploymentRoleArn) {
      throw new Error('Deployment role ARN is required for job configuration');
    }
    const deploymentRole = MdaaRole.fromRoleArn(this.scope, `deployment-role`, this.props.deploymentRoleArn);
    if (!this.props.bucketName) {
      throw new Error('Project bucket name is required for job configuration');
    }
    const bucket = MdaaBucket.fromBucketName(this.scope, `project-bucket`, this.props.bucketName);
    if (!this.props.kmsArn) {
      throw new Error('Project KMS Key is required for job configuration');
    }
    this.kmsKey = Key.fromKeyArn(this, this.props.projectName ?? 'kms-key', this.props.kmsArn);

    // Build our jobs!
    const allJobs = this.props.jobConfigs;
    for (const jobName of Object.keys(allJobs)) {
      const jobConfig = allJobs[jobName];
      this.createJob(jobName, jobConfig, deploymentRole, bucket);
    }

    // BucketDeployment adds an inline policy to the imported deployment role,
    // which CDK synthesizes as a standalone AWS::IAM::Policy resource.
    // Because the policy name is derived from the construct path (not the stack name),
    // multiple stacks importing the same role produce colliding physical names.
    // Remove the inline policy node — the deployment role already has the necessary
    // S3 permissions granted in the dataops-project construct that owns it.
    for (const child of deploymentRole.node.children) {
      if (child.node.id === 'Policy') {
        deploymentRole.node.tryRemoveChild(child.node.id);
        break;
      }
    }

    // Suppress nag warnings on the imported deployment role node itself
    // (remaining after inline policy removal, e.g. wildcard resource warnings)
    this.scope.node.children.forEach(child => {
      if (child.node.id.startsWith('deployment-role')) {
        MdaaNagSuppressions.addCodeResourceSuppressions(
          child,
          [{ id: 'AwsSolutions-IAM5', reason: 'Permissions granted on deployment role in owning stack.' }],
          true,
        );
      }
    });
  }

  private deployAdditionalFiles(
    additionalFilesSources: ISource[],
    bucket: IBucket,
    deploymentRole: IRole,
    deploymentId: string,
    deploymentPath: string,
    extract: boolean,
  ): BucketDeployment {
    // Deploy Source asset(s) to /deployment/libs/<job> location.
    return new BucketDeployment(this.scope, deploymentId, {
      sources: additionalFilesSources,
      destinationBucket: bucket,
      destinationKeyPrefix: deploymentPath,
      role: deploymentRole,
      extract: extract,
    });
  }

  private addAdditionalScripts(
    jobName: string,
    jobConfig: JobConfig,
    bucket: IBucket,
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
        bucket,
        deploymentRole,
        `job-deployment-${jobName}-additional-script`,
        deploymentPath,
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
    bucket: IBucket,
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
        bucket,
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
    bucket: IBucket,
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
        bucket,
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

  private resolveAssetPath(jobName: string, location: string): string {
    if (location.startsWith('asset:')) {
      const assetName = location.substring('asset:'.length);
      if (!this.props.assetBasePath) {
        throw new Error(
          `Job '${jobName}' uses asset: prefix but no assetBasePath is configured. ` +
            `Set assetBasePath in the construct props.`,
        );
      }
      return path.join(this.props.assetBasePath, assetName);
    }
    return location;
  }

  private createJob(jobName: string, jobConfig: JobConfig, deploymentRole: IRole, bucket: IBucket) {
    const defaultArguments = jobConfig.defaultArguments ? jobConfig.defaultArguments : {};
    let scriptLocation = this.resolveAssetPath(jobName, jobConfig.command.scriptLocation.trim());

    const scriptPath = path.dirname(scriptLocation);
    const scriptName = path.basename(scriptLocation);
    const scriptSource = Source.asset(scriptPath, { exclude: ['**', `!${scriptName}`] });

    const scriptDeploymentPath = `deployment/jobs/${jobName}`;
    const scriptDeployment = new BucketDeployment(this.scope, `job-deployment-${jobName}`, {
      sources: [scriptSource],
      destinationBucket: bucket,
      destinationKeyPrefix: scriptDeploymentPath,
      role: deploymentRole,
      extract: true,
    });

    // Resolve asset: prefixes in additionalScripts before processing
    if (jobConfig.additionalScripts) {
      jobConfig = {
        ...jobConfig,
        additionalScripts: jobConfig.additionalScripts.map(s => this.resolveAssetPath(jobName, s.trim())),
      };
    }

    this.addAdditionalScripts(jobName, jobConfig, bucket, deploymentRole, defaultArguments);
    this.addAdditionalJars(jobName, jobConfig, bucket, deploymentRole, defaultArguments);
    this.addAdditionalFiles(jobName, jobConfig, bucket, deploymentRole, defaultArguments);
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

    defaultArguments['--TempDir'] = `s3://${this.props.bucketName}/temp/jobs/${jobName}`;

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

    if (job.name && this.props.projectName) {
      DataOpsProjectUtils.createProjectSSMParam(
        this.scope,
        this.props.naming,
        this.props.projectName,
        `job/name/${jobName}`,
        job.name,
      );

      // Apply AmazonDataZoneProject tag so the job appears in the SMUS project UI.
      // The DataZone project ID is published to SSM by the dataops-project module.
      const projectIdSsmPath = this.props.naming.ssmPath(
        `${this.props.projectName}/sagemaker/project/id/default`,
        false,
        false,
      );
      const datazoneProjectId = MdaaStringParameter.valueForStringParameter(this.scope, projectIdSsmPath);
      Tags.of(job).add('AmazonDataZoneProject', datazoneProjectId);

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
      encryptionKey: this.kmsKey,
      retention: logGroupRetentionDays,
    };
    new MdaaLogGroup(this, logGroupName, logProps);
    // `updateProps` always returns a prop with a logGroupName
    return updateProps(logProps).logGroupName!;
  }
}

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
import { updateProps } from '@aws-mdaa/cloudwatch-constructs/lib/utils';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { IRole } from 'aws-cdk-lib/aws-iam';

export type JobCommandPythonVersion = '2' | '3' | undefined;
export type JobCommandName = 'glueetl' | 'pythonshell';

export interface LoggingConfig {
  /**
   * Optional. Number of days the Logs will be retained in Cloudwatch.
   * For allowed values, refer https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_logs.RetentionDays.html
   * Possible values are: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653, and 0.
   * If you specify 0, the events in the log group are always retained and never expire.
   * Default, if property not specified, is 731 days.
   */
  readonly logGroupRetentionDays: number;
}

export interface JobCommand {
  /**
   * "glueetl" | "pythonshell"
   */
  readonly name: JobCommandName;
  /**
   * "2" | "3" | undefined
   */
  readonly pythonVersion?: JobCommandPythonVersion;
  /**
   * Relative path to Glue script
   */
  readonly scriptLocation: string;
}

export type JobWorkerType = 'Standard' | 'G.1X' | 'G.2X';

export interface JobConfig {
  /**
   * The arn for the role with which the job will be executed
   */
  readonly executionRoleArn: string;
  /**
   * The job command configuration
   */
  readonly command: JobCommand;
  /**
   * Reference to a template defined elsewhere in the config (in template section)
   */
  readonly template?: string;
  /**
   * The number of capacity units that are allocated to this job.
   */
  readonly allocatedCapacity?: number;
  /**
   * List of names of connections to be used by the job
   */
  readonly connections?: string[];
  /**
   * Default arguments which will be supplied to the job
   */
  readonly defaultArguments?: { [key: string]: string };
  /**
   * Description of the job
   */
  readonly description: string;
  /**
   * Execution properties of the job, including max concurrent executions
   */
  readonly executionProperty?: CfnJob.ExecutionPropertyProperty;
  /**
   * Version of Glue
   */
  readonly glueVersion?: string;
  /**
   * Maximum number of DPUS allocated to the job
   */
  readonly maxCapacity?: number;
  /**
   * Max number of retries of the job before job failure occures
   */
  readonly maxRetries?: number;
  /**
   * Notification properties of the job, including notification delay
   */
  readonly notificationProperty?: CfnJob.NotificationPropertyProperty;
  /**
   * Number of workers assigned to the job
   */
  readonly numberOfWorkers?: number;
  /**
   * The maximum execution time of the job
   */
  readonly timeout?: number;
  /**
   * "Standard" | "G.1X" | "G.2X"
   */
  readonly workerType?: JobWorkerType;
  /**
   * Additional ETL scripts that are being referenced in main glue etl script
   * Relative path to Additional Glue scripts
   */
  readonly additionalScripts?: string[];

  /**
   * Additional Jars that are being referenced in main glue etl script
   * Relative path to Additional Glue scripts
   */
  readonly additionalJars?: string[];

  /**
   * Additional files that are being referenced in main glue etl script
   * Relative path to Additional Glue scripts
   */
  readonly additionalFiles?: string[];

  /**
   * Enables real-time monitoring and troubleshooting of AWS Glue jobs by streaming logs to CloudWatch Logs while the job is running
   */
  readonly continuousLogging?: LoggingConfig;
}

export interface GlueJobL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Role which will be used to deploy the Job code. Should be obtained from the DataOps Project
   */
  readonly deploymentRoleArn: string;
  /**
   * The name of the Data Ops project bucket where job resources will be deployed and which will be used as a temporary job location
   */
  readonly projectBucketName: string;
  /**
   * Map of job names to job configurations
   */
  readonly jobConfigs: { [key: string]: JobConfig };
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

  /**
   * Dataops project KMS key ARN.
   */
  readonly projectKMSArn: string;
}

export class GlueJobL3Construct extends MdaaL3Construct {
  protected readonly props: GlueJobL3ConstructProps;
  private readonly projectKmsKey: IKey;

  constructor(scope: Construct, id: string, props: GlueJobL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    const deploymentRole = MdaaRole.fromRoleArn(this.scope, `deployment-role`, this.props.deploymentRoleArn);
    const projectBucket = MdaaBucket.fromBucketName(this.scope, `project-bucket`, this.props.projectBucketName);
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
    const additionalFileDeployment = new BucketDeployment(this.scope, deploymentId, {
      sources: additionalFilesSources,
      destinationBucket: projectBucket,
      destinationKeyPrefix: deploymentPath,
      role: deploymentRole,
      extract: extract,
    });
    return additionalFileDeployment;
  }

  private addAdditionalScripts(
    jobName: string,
    jobConfig: JobConfig,
    projectBucket: IBucket,
    deploymentRole: IRole,
    defaultArguments: {
      [key: string]: string;
    },
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
    defaultArguments: {
      [key: string]: string;
    },
  ) {
    if (jobConfig.additionalJars) {
      // Create Source asset for each directory
      const additionalFilesSources = jobConfig.additionalJars.map(fullFileName => {
        const filePath = path.dirname(fullFileName.trim());
        const fileName = path.basename(fullFileName.trim());
        const fileSource = Source.asset(filePath, { exclude: ['**', `!${fileName}`] });
        return fileSource;
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
    defaultArguments: {
      [key: string]: string;
    },
  ) {
    if (jobConfig.additionalFiles) {
      // Create Source asset for each directory
      const additionalFilesSources = jobConfig.additionalFiles.map(fullFileName => {
        const filePath = path.dirname(fullFileName.trim());
        const fileName = path.basename(fullFileName.trim());
        const fileSource = Source.asset(filePath, { exclude: ['**', `!${fileName}`] });
        return fileSource;
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

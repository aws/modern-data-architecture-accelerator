/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { DataOpsProjectUtils } from '@aws-mdaa/dataops-project-l3-construct';
import { EventBridgeHelper } from '@aws-mdaa/eventbridge-helper';
import { MdaaCfnJob } from '@aws-mdaa/glue-constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
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
import { Fn, Token } from 'aws-cdk-lib';
import { ConfigurationElement } from '@aws-mdaa/config';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { updateProps } from '@aws-mdaa/cloudwatch-constructs/lib/loggroup-utils';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Effect, IRole, PolicyStatement } from 'aws-cdk-lib/aws-iam';

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

export type JobWorkerType =
  | 'Standard'
  | 'G.1X'
  | 'G.2X'
  | 'G.4X'
  | 'G.8X'
  | 'G.12X'
  | 'G.16X'
  | 'R.1X'
  | 'R.2X'
  | 'R.4X'
  | 'R.8X';

/**
 * Configuration for emitting OpenLineage events from a Glue Spark job to an Amazon DataZone
 * (SageMaker Unified Studio) domain. Mirrors the "Generate lineage events" option in the AWS
 * Glue console: when enabled, the module injects the OpenLineage Spark listener configuration
 * into the job's `--conf` argument so runs publish lineage to the specified DataZone domain.
 *
 * Use cases: Automated data lineage capture; DataZone/SageMaker governance; Impact analysis
 *
 * AWS: AWS Glue Spark OpenLineage integration with the Amazon DataZone `PostLineageEvent` API
 *
 * Validation: Requires Glue version 5.0 or higher (enforced at synth time). When enabled, the
 * module attaches a managed policy granting `datazone:PostLineageEvent` on the target domain to
 * the job execution role, unless `manageExecutionRolePolicy` is set to false.
 */
export interface DataZoneLineageConfig {
  /** Whether to emit lineage events to Amazon DataZone. When false, no lineage configuration is injected. */
  readonly enabled: boolean;
  /**
   * Amazon DataZone (SageMaker Unified Studio) domain ID that will receive the lineage events, e.g. `dzd_xxxxxxxxx`.
   * Mirrors the `domainIdentifier` pattern documented for the DataZone `PostLineageEvent` API, which this feature
   * drives: either separator (`-` or `_`), mixed case, and at most 36 characters after the separator. The charset
   * admits no whitespace, which is relied upon when interpolating this value into the space-separated Spark `--conf`
   * string and into the domain ARN below.
   * @pattern ^dzd[-_][a-zA-Z0-9_-]{1,36}$
   */
  readonly domainId: string;
  /**
   * Account ID of the Glue Data Catalog whose metadata is referenced in lineage events (sets `spark.glue.accountId`).
   * Must be a 12-digit AWS account ID. Defaults to the deploying account. This is the Data Catalog account and is
   * independent of the account that owns the DataZone domain (the domain is assumed to be in the deploying account).
   */
  readonly accountId?: string;
  /**
   * Whether the module attaches a managed policy granting `datazone:PostLineageEvent` (scoped to the domain ARN) to
   * the job execution role. Defaults to true. Set to false when the execution role is externally managed and you will
   * grant the permission yourself.
   */
  readonly manageExecutionRolePolicy?: boolean;
}

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
  /** Worker type: 'Standard', 'G.1X', 'G.2X', 'G.4X', 'G.8X', 'G.12X', 'G.16X', 'R.1X', 'R.2X', 'R.4X', or 'R.8X'. G.12X, G.16X, and R types require a compatible Glue version and regional availability. */
  readonly workerType?: JobWorkerType;
  /** Relative paths to additional Python scripts for the job. */
  readonly additionalScripts?: string[];
  /** Relative paths to additional JAR files for the job. */
  readonly additionalJars?: string[];
  /** Relative paths to additional files for the job. */
  readonly additionalFiles?: string[];
  /** Continuous logging configuration for real-time monitoring. */
  readonly continuousLogging?: LoggingConfig;
  /** Optional Amazon DataZone lineage event configuration. Requires Glue version 5.0 or higher. */
  readonly lineage?: DataZoneLineageConfig;
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

/** Minimum Glue version required to emit Amazon DataZone Spark lineage events. */
const MIN_DATAZONE_LINEAGE_GLUE_VERSION = 5;

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

  /**
   * Inject Amazon DataZone OpenLineage Spark configuration into the job's `--conf` argument when
   * lineage is enabled. Enforces the Glue 5.0+ requirement with a hard error, and preserves any
   * user-supplied `--conf` value by appending the lineage settings.
   */
  private addDataZoneLineage(jobName: string, jobConfig: JobConfig, defaultArguments: ConfigurationElement) {
    const lineage = jobConfig.lineage;
    if (!lineage?.enabled) {
      return;
    }

    const glueVersion = jobConfig.glueVersion;
    // Parse defensively: an unset, non-numeric, or below-minimum version must fail.
    // Number.isNaN guards against unparseable strings (e.g. 'latest'), which would
    // otherwise slip through a bare `< MIN` comparison (NaN < n is always false).
    const parsedGlueVersion = glueVersion ? Number.parseFloat(glueVersion) : Number.NaN;
    if (Number.isNaN(parsedGlueVersion) || parsedGlueVersion < MIN_DATAZONE_LINEAGE_GLUE_VERSION) {
      throw new Error(
        `Job '${jobName}' enables DataZone lineage, which requires Glue version 5.0 or higher, ` +
          `but glueVersion is '${glueVersion ?? 'undefined'}'. Set glueVersion to '5.0' or higher.`,
      );
    }

    // A user-provided accountId feeds spark.glue.accountId; a typo would deploy cleanly and surface
    // later as an AccessDenied. Validate it here (fail-fast), skipping CDK tokens (e.g. env-agnostic
    // stacks where this.account is unresolved) which cannot be checked at synth time.
    if (
      lineage.accountId !== undefined &&
      !Token.isUnresolved(lineage.accountId) &&
      !/^\d{12}$/.test(lineage.accountId)
    ) {
      throw new Error(
        `Job '${jobName}' lineage.accountId must be a 12-digit AWS account ID, but received '${lineage.accountId}'.`,
      );
    }

    const accountId = lineage.accountId ?? this.account;
    const lineageConf = [
      'spark.extraListeners=io.openlineage.spark.agent.OpenLineageSparkListener',
      '--conf spark.openlineage.transport.type=amazon_datazone_api',
      `--conf spark.openlineage.transport.domainId=${lineage.domainId}`,
      '--conf spark.openlineage.facets.custom_environment_variables=[AWS_DEFAULT_REGION;GLUE_VERSION;GLUE_COMMAND_CRITERIA;GLUE_PYTHON_VERSION;]',
      `--conf spark.glue.accountId=${accountId}`,
    ].join(' ');

    // defaultArguments comes straight from user YAML, so --conf isn't guaranteed to be a string
    // (e.g. `--conf: 42` parses as a number). Fail fast rather than silently stringifying it.
    const existingConf = defaultArguments['--conf'];
    if (existingConf !== undefined && typeof existingConf !== 'string') {
      throw new Error(
        `Job '${jobName}' sets a non-string '--conf' default argument (received ${typeof existingConf}); ` +
          `lineage requires '--conf' to be a string of Spark configuration settings.`,
      );
    }
    defaultArguments['--conf'] = existingConf ? `${existingConf} --conf ${lineageConf}` : lineageConf;

    this.grantDataZoneLineagePermissions(jobName, jobConfig.executionRoleArn, lineage);
  }

  /**
   * Attach a managed policy granting `datazone:PostLineageEvent` on the target DataZone domain to
   * the job's execution role, so lineage emission works without a separate manual IAM change.
   * Skipped when `lineage.manageExecutionRolePolicy` is explicitly false (externally managed role).
   * The grant is scoped to the specific domain ARN, which is owned by the deploying account.
   */
  private grantDataZoneLineagePermissions(jobName: string, executionRoleArn: string, lineage: DataZoneLineageConfig) {
    if (lineage.manageExecutionRolePolicy === false) {
      return;
    }
    const resolvedRole = this.props.roleHelper.resolveRoleRefWithRefId(
      { arn: executionRoleArn },
      `${jobName}-lineage-exec`,
    );

    const domainArn = `arn:${this.partition}:datazone:${this.region}:${this.account}:domain/${lineage.domainId}`;
    const lineagePolicy = new MdaaManagedPolicy(this.scope, `${jobName}-lineage-policy`, {
      naming: this.props.naming,
      managedPolicyName: `${jobName}-lineage`,
      statements: [
        new PolicyStatement({
          sid: 'DataZonePostLineageEvent',
          effect: Effect.ALLOW,
          actions: ['datazone:PostLineageEvent'],
          resources: [domainArn],
        }),
      ],
    });
    resolvedRole.role(`${jobName}-lineage-role`).addManagedPolicy(lineagePolicy);
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

    this.addDataZoneLineage(jobName, jobConfig, defaultArguments);

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

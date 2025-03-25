/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { IResolvable } from 'aws-cdk-lib';
import { CfnJob, CfnJobProps } from 'aws-cdk-lib/aws-glue';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import { ConfigurationElement, TagElement } from '@aws-mdaa/config';

/**
 * Interface representing a compliant Glue Crawler Config
 */
export interface MdaaCfnJobProps extends MdaaConstructProps {
  /**
   * The code that executes a job.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-command
   */
  readonly command: CfnJob.JobCommandProperty | IResolvable;
  /**
   * The name or Amazon Resource Name (ARN) of the IAM role associated with this job.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-role
   */
  readonly role: string;
  /**
   * The number of capacity units that are allocated to this job.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-allocatedcapacity
   */
  readonly allocatedCapacity?: number;
  /**
   * The connections used for this job.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-connections
   */
  readonly connections?: CfnJob.ConnectionsListProperty | IResolvable;
  /**
   * The default arguments for this job, specified as name-value pairs.
   *
   * You can specify arguments here that your own job-execution script consumes, in addition to arguments that AWS Glue itself consumes.
   *
   * For information about how to specify and consume your own job arguments, see [Calling AWS Glue APIs in Python](https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-python-calling.html) in the *AWS Glue Developer Guide* .
   *
   * For information about the key-value pairs that AWS Glue consumes to set up your job, see [Special Parameters Used by AWS Glue](https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-glue-arguments.html) in the *AWS Glue Developer Guide* .
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-defaultarguments
   */
  readonly defaultArguments?: ConfigurationElement | IResolvable;
  /**
   * A description of the job.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-description
   */
  readonly description?: string;
  /**
   * The maximum number of concurrent runs that are allowed for this job.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-executionproperty
   */
  readonly executionProperty?: CfnJob.ExecutionPropertyProperty | IResolvable;
  /**
   * Glue version determines the versions of Apache Spark and Python that AWS Glue supports. The Python version indicates the version supported for jobs of type Spark.
   *
   * For more information about the available AWS Glue versions and corresponding Spark and Python versions, see [Glue version](https://docs.aws.amazon.com/glue/latest/dg/add-job.html) in the developer guide.
   *
   * Jobs that are created without specifying a Glue version default to Glue 0.9.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-glueversion
   */
  readonly glueVersion?: string;
  /**
   * This field is reserved for future use.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-loguri
   */
  readonly logUri?: string;
  /**
   * The number of AWS Glue data processing units (DPUs) that can be allocated when this job runs. A DPU is a relative measure of processing power that consists of 4 vCPUs of compute capacity and 16 GB of memory.
   *
   * Do not set `Max Capacity` if using `WorkerType` and `NumberOfWorkers` .
   *
   * The value that can be allocated for `MaxCapacity` depends on whether you are running a Python shell job or an Apache Spark ETL job:
   *
   * - When you specify a Python shell job ( `JobCommand.Name` ="pythonshell"), you can allocate either 0.0625 or 1 DPU. The default is 0.0625 DPU.
   * - When you specify an Apache Spark ETL job ( `JobCommand.Name` ="glueetl"), you can allocate from 2 to 100 DPUs. The default is 10 DPUs. This job type cannot have a fractional DPU allocation.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-maxcapacity
   */
  readonly maxCapacity?: number;
  /**
   * The maximum number of times to retry this job after a JobRun fails.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-maxretries
   */
  readonly maxRetries?: number;
  /**
   * The name you assign to this job definition.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-name
   */
  readonly name: string;
  /**
   * Specifies configuration properties of a notification.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-notificationproperty
   */
  readonly notificationProperty?: CfnJob.NotificationPropertyProperty | IResolvable;
  /**
   * The number of workers of a defined `workerType` that are allocated when a job runs.
   *
   * The maximum number of workers you can define are 299 for `G.1X` , and 149 for `G.2X` .
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-numberofworkers
   */
  readonly numberOfWorkers?: number;
  /**
   * The name of the `SecurityConfiguration` structure to be used with this job.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-securityconfiguration
   */
  readonly securityConfiguration: string;
  /**
   * The tags to use with this job.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-tags
   */
  readonly tags?: TagElement;
  /**
   * The job timeout in minutes. This is the maximum time that a job run can consume resources before it is terminated and enters TIMEOUT status. The default is 2,880 minutes (48 hours).
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-timeout
   */
  readonly timeout?: number;
  /**
   * The type of predefined worker that is allocated when a job runs. Accepts a value of Standard, G.1X, or G.2X.
   *
   * - For the `Standard` worker type, each worker provides 4 vCPU, 16 GB of memory and a 50GB disk, and 2 executors per worker.
   * - For the `G.1X` worker type, each worker maps to 1 DPU (4 vCPU, 16 GB of memory, 64 GB disk), and provides 1 executor per worker. We recommend this worker type for memory-intensive jobs.
   * - For the `G.2X` worker type, each worker maps to 2 DPU (8 vCPU, 32 GB of memory, 128 GB disk), and provides 1 executor per worker. We recommend this worker type for memory-intensive jobs.
   *
   * @link http://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-glue-job.html#cfn-glue-job-workertype
   */
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
    NagSuppressions.addResourceSuppressions(
      this,
      [
        { id: 'AwsSolutions-GL1', reason: 'Log encryption configured via SecurityConfiguration' },
        { id: 'AwsSolutions-GL3', reason: 'Bookmark encryption configured via SecurityConfiguration' },
      ],
      true,
    );
  }
}

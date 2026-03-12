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
  /** Job command configuration defining the code execution environment and script location for ETL processing */
  readonly command: CfnJob.JobCommandProperty | IResolvable;
  /** IAM role name or ARN for Glue service permissions enabling secure access to AWS services and resources */
  readonly role: string;
  /** Allocated capacity in DPUs for legacy job types with fixed compute resource provisioning */
  readonly allocatedCapacity?: number;
  /** Connections configuration for accessing external data sources and databases during ETL processing */
  readonly connections?: CfnJob.ConnectionsListProperty | IResolvable;
  /** Default arguments for job configuration and parameter passing enabling flexible ETL script configuration */
  readonly defaultArguments?: ConfigurationElement | IResolvable;
  /** Description of the Glue job explaining its purpose and ETL operations for documentation and management clarity */
  readonly description?: string;
  /** Execution properties controlling concurrent runs and job execution limits for resource management */
  readonly executionProperty?: CfnJob.ExecutionPropertyProperty | IResolvable;
  /** Glue version determining Apache Spark and Python versions for job execution runtime environment */
  readonly glueVersion?: string;
  readonly logUri?: string;
  /** Maximum capacity in DPUs for job execution resource allocation enabling performance and cost optimization */
  readonly maxCapacity?: number;
  /** Maximum retry attempts for failed job runs enabling fault tolerance and reliability */
  readonly maxRetries?: number;
  /** Name for the Glue job enabling job identification and management in ETL workflows */
  readonly name: string;
  /** Notification configuration for job status and completion alerts enabling monitoring and alerting */
  readonly notificationProperty?: CfnJob.NotificationPropertyProperty | IResolvable;
  /** Number of workers for parallel processing capacity enabling horizontal scaling and performance optimization */
  readonly numberOfWorkers?: number;
  readonly securityConfiguration: string;
  readonly tags?: TagElement;
  /** Job timeout in minutes controlling maximum execution time for ETL operations enabling cost */
  readonly timeout?: number;
  /** Worker type defining compute resource specifications for job execution enabling performance */
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

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IResolvable } from 'aws-cdk-lib';
import { CfnJob, CfnJobProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

export interface MdaaDataBrewJobProps extends MdaaConstructProps {
  /** Unique name for the DataBrew job that will be processed through MDAA naming conventions */
  readonly name: string;

  /** IAM role ARN for DataBrew job execution providing necessary permissions for data access and processing */
  readonly roleArn: string;

  /** Job type specification determining the DataBrew job processing mode and capabilities */
  readonly type: string;

  /** Array of AWS Glue Data Catalog output configurations for metadata integration */
  readonly dataCatalogOutputs?: IResolvable | (IResolvable | CfnJob.DataCatalogOutputProperty)[];

  /** Array of JDBC database output configurations for direct database integration */
  readonly databaseOutputs?: IResolvable | (IResolvable | CfnJob.DatabaseOutputProperty)[];

  readonly datasetName?: string;

  readonly encryptionKeyArn: string;

  /** Job sample configuration for profile jobs controlling the number of rows analyzed during profiling operations */
  readonly jobSample?: CfnJob.JobSampleProperty | IResolvable;

  /** CloudWatch logging subscription status for job execution monitoring and troubleshooting */
  readonly logSubscription?: string;

  /** Maximum number of compute nodes for job execution controlling processing capacity and parallelism */
  readonly maxCapacity?: number;

  /** Maximum retry attempts for failed job executions providing resilience against transient failures */
  readonly maxRetries?: number;

  /** Output location configuration for job results storage controlling where processed data is written */
  readonly outputLocation?: CfnJob.OutputLocationProperty | IResolvable;

  /** Array of output artifacts representing job execution results and processed data */
  readonly outputs?: IResolvable | (CfnJob.OutputProperty | IResolvable)[];

  /** Profile configuration for data profiling jobs controlling analysis scope and statistical computations */
  readonly profileConfiguration?: CfnJob.ProfileConfigurationProperty | IResolvable;

  /** DataBrew project name for job organization and resource grouping */
  readonly projectName?: string;

  /** Recipe configuration defining data transformation steps for recipe jobs */
  readonly recipe?: CfnJob.RecipeProperty | IResolvable;

  /** Job execution timeout in minutes controlling maximum job runtime and preventing runaway processes */
  readonly timeout?: number;

  /** Array of validation configurations for profile job data quality rules and constraints */
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

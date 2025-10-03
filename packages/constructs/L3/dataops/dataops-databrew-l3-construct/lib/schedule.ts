/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { CfnSchedule, CfnScheduleProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

export interface MdaaDataBrewScheduleProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required name for the DataBrew schedule enabling schedule identification and management. Provides the schedule identifier for DataBrew operations and serves as the primary reference for automated job execution and workflow orchestration.
   *
   * Use cases: Schedule identification; Workflow management; Job orchestration; Automation organization
   *
   * AWS: AWS Glue DataBrew schedule name for schedule identification and management
   *
   * Validation: Must be unique schedule name string; required for schedule creation and identification
   **/
  readonly name: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required cron expression defining when the scheduled jobs should run for automated execution timing. Specifies the schedule timing using standard cron format for precise control over job execution frequency and timing patterns.
   *
   * Use cases: Job timing control; Automated execution; Schedule frequency; Workflow timing
   *
   * AWS: AWS Glue DataBrew schedule cron expression for automated job execution timing
   *
   * Validation: Must be valid cron expression format; required for schedule timing and automated execution
   **/
  readonly cronExpression: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of DataBrew job names to be executed according to the schedule for automated workflow orchestration. Specifies which DataBrew jobs will be triggered by this schedule, enabling coordinated execution of multiple data preparation jobs.
   *
   * Use cases: Job orchestration; Multi-job workflows; Coordinated execution; Batch processing automation
   *
   * AWS: AWS Glue DataBrew job names for scheduled execution and workflow orchestration
   *
   * Validation: Must be array of valid DataBrew job names if provided; jobs must exist for schedule association
   **/
  readonly jobNames?: string[];
}

/**
 * A construct which creates a compliant Databrew Schedule.
 */
export class MdaaDataBrewSchedule extends CfnSchedule {
  private static setProps(props: MdaaDataBrewScheduleProps): CfnScheduleProps {
    const overrideProps = {
      name: props.naming.resourceName(props.name, 80),
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaDataBrewScheduleProps) {
    super(scope, id, MdaaDataBrewSchedule.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'Schedule',
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

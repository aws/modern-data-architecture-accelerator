/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { CfnSchedule, CfnScheduleProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

/**
 * Properties for creating a Mdaa Databrew Schedule
 */
export interface MdaaDataBrewScheduleProps extends MdaaConstructProps {
  // 	The name of the schedule.
  readonly name: string;

  // The dates and times when the job is to run.
  readonly cronExpression: string;

  // A list of jobs to be run, according to the schedule.
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

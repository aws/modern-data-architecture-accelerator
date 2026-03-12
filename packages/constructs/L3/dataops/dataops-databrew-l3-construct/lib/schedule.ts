/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { CfnSchedule, CfnScheduleProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

export interface MdaaDataBrewScheduleProps extends MdaaConstructProps {
  /** Unique name for the DataBrew schedule. */
  readonly name: string;
  /** Cron expression defining when scheduled jobs should run. */
  readonly cronExpression: string;
  /** DataBrew job names to execute on this schedule. */
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

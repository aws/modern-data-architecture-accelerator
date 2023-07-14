/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefConstructProps, CaefParamAndOutput } from '@aws-caef/construct';
import { CfnSchedule, CfnScheduleProps } from 'aws-cdk-lib/aws-databrew';
import { Construct } from 'constructs';

/**
 * Properties for creating a Caef Databrew Schedule
 */
export interface CaefDataBrewScheduleProps extends CaefConstructProps {

    // 	The name of the schedule.
    readonly name: string;

    // The dates and times when the job is to run.
    readonly cronExpression: string

    // A list of jobs to be run, according to the schedule.
    readonly jobNames?: string[]

}

/**
 * A construct which creates a compliant Databrew Schedule.
 */
export class CaefDataBrewSchedule extends CfnSchedule {

    private static setProps ( props: CaefDataBrewScheduleProps ): CfnScheduleProps {
        const overrideProps = {
            name: props.naming.resourceName( props.name, 80 )
        }
        return { ...props, ...overrideProps }
    }

    constructor( scope: Construct, id: string, props: CaefDataBrewScheduleProps ) {
        super( scope, id, CaefDataBrewSchedule.setProps( props ) )

        new CaefParamAndOutput( scope, {
            ...{
                resourceType: "Schedule",
                resourceId: props.name,
                name: "name",
                value: this.name
            }, ...props
        } )
    }
}


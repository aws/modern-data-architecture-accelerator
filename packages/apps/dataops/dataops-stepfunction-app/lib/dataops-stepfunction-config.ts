/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { MdaaDataOpsConfigParser, MdaaDataOpsConfigContents } from '@aws-mdaa/dataops-shared';
import { StepFunctionProps } from '@aws-mdaa/dataops-stepfunction-l3-construct';
import { Schema } from "ajv";
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';



export interface StepFunctionConfigContents extends MdaaDataOpsConfigContents {
    /**
     * Name of the DataOps Project
     */
    projectName: string
    /**
     * List of StepFunctions to create
     */
    stepfunctionDefinitions: StepFunctionProps[]
}

export class StepFunctionConfigParser extends MdaaDataOpsConfigParser<StepFunctionConfigContents> {

    public readonly stepfunctionDefinitions: StepFunctionProps[]

    constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )

        this.stepfunctionDefinitions = this.configContents.stepfunctionDefinitions
    }

}
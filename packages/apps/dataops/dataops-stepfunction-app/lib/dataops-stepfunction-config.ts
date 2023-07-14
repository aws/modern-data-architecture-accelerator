/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps } from '@aws-caef/app';
import { CaefDataOpsConfigParser, CaefDataOpsConfigContents } from '@aws-caef/dataops-shared';
import { StepFunctionProps } from '@aws-caef/dataops-stepfunction-l3-construct';
import { Schema } from "ajv";
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';



export interface StepFunctionConfigContents extends CaefDataOpsConfigContents {
    /**
     * Name of the DataOps Project
     */
    projectName: string
    /**
     * List of StepFunctions to create
     */
    stepfunctionDefinitions: StepFunctionProps[]
}

export class StepFunctionConfigParser extends CaefDataOpsConfigParser<StepFunctionConfigContents> {

    public readonly stepfunctionDefinitions: StepFunctionProps[]

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )

        this.stepfunctionDefinitions = this.configContents.stepfunctionDefinitions
    }

}
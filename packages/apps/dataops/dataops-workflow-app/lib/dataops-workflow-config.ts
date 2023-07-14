/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps } from '@aws-caef/app';
import { CaefDataOpsConfigParser, CaefDataOpsConfigContents } from '@aws-caef/dataops-shared';
import { WorkflowProps } from '@aws-caef/dataops-workflow-l3-construct';
import { Schema } from "ajv";
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';



export interface GlueWorkflowConfigContents extends CaefDataOpsConfigContents {
    /**
     * Name of the DataOps Project
     */
    projectName: string
    /**
     * Workflows to create
     */
    workflowDefinitions: WorkflowProps[]
}

export class GlueWorkflowConfigParser extends CaefDataOpsConfigParser<GlueWorkflowConfigContents> {

    public readonly workflowDefinitions: WorkflowProps[]

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )

        this.workflowDefinitions = this.configContents.workflowDefinitions
    }

}
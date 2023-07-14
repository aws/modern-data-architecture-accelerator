/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParserProps } from '@aws-caef/app';
import { FunctionProps, LayerProps } from '@aws-caef/dataops-lambda-l3-construct';
import { CaefDataOpsConfigContents, CaefDataOpsConfigParser } from '@aws-caef/dataops-shared';

import { Schema } from "ajv";
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface LambdaFunctionConfigContents extends CaefDataOpsConfigContents {
    /**
     * Name of the DataOps Project
     */
    readonly projectName: string
    /**
     * Layers to create
     */
    readonly layers?: LayerProps[]
    /**
     * Functions to create
     */
    readonly functions?: FunctionProps[]

}

export class LambdaFunctionConfigParser extends CaefDataOpsConfigParser<LambdaFunctionConfigContents> {

    public readonly layers?: LayerProps[]
    public readonly functions?: FunctionProps[]

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.layers = this.configContents.layers
        this.functions = this.configContents.functions
    }

}
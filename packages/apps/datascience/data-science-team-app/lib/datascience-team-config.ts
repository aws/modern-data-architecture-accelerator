/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from "@aws-caef/app";
import { DataScienceTeamProps } from "@aws-caef/datascience-team-l3-construct";
import { Schema } from "ajv";
import { Stack } from "aws-cdk-lib";

import * as configSchema from './config-schema.json';


export interface DataScienceTeamConfigContents extends CaefBaseConfigContents {
    readonly team: DataScienceTeamProps
}

export class DataScienceTeamConfigParser extends CaefAppConfigParser<DataScienceTeamConfigContents> {

    public readonly team: DataScienceTeamProps

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.team = this.configContents.team
    }
}


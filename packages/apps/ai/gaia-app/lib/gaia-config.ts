/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from "@aws-caef/app";
import { GAIAProps } from "@aws-caef/gaia-l3-construct";
import { Schema } from "ajv";
import { Stack } from "aws-cdk-lib";

import * as configSchema from './config-schema.json';


export interface GAIAConfigContents extends CaefBaseConfigContents {
    readonly gaia: GAIAProps
}

export class GAIAConfigParser extends CaefAppConfigParser<GAIAConfigContents> {

    public readonly gaia: GAIAProps

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.gaia = this.configContents.gaia
    }
}


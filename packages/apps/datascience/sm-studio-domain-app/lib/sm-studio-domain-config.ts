/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from "@aws-caef/app";

import { DomainProps } from "@aws-caef/sm-studio-domain-l3-construct";
import { Schema } from "ajv";
import { Stack } from "aws-cdk-lib";
import * as configSchema from './config-schema.json';

export interface SageMakerStudioDomainConfigContents extends CaefBaseConfigContents {
    domain: DomainProps
}

export class SageMakerStudioDomainConfigParser extends CaefAppConfigParser<SageMakerStudioDomainConfigContents> {

    public readonly domain: DomainProps

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )
        this.domain = this.configContents.domain
    }
}


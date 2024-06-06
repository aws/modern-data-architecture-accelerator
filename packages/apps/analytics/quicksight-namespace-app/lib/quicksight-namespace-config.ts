/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app'
import { FederationProps, NameAndFederationProps } from '@aws-mdaa/quicksight-namespace-l3-construct'
import { Schema } from 'ajv'
import { Stack } from 'aws-cdk-lib'

import * as configSchema from './config-schema.json'

export interface QuickSightNamespaceConfigContents extends MdaaBaseConfigContents {

    /**
     * Objects representing federations to create
     */
    federations: { [ name: string ]: FederationProps },

    /**
     * Glue resources
     */
    glueResourceAccess?: string[]
}



export class QuickSightNamespaceConfigParser extends MdaaAppConfigParser<QuickSightNamespaceConfigContents> {

    public readonly federations: NameAndFederationProps[]

    public readonly glueResourceAccess?: string[]

    constructor( scope: Stack, props: MdaaAppConfigParserProps ) {
        super( scope, props, configSchema as Schema )

        this.federations = Object.entries( this.configContents.federations || {} ).map( nameAndFederationProps => {
            return {
                ...{ federationName: nameAndFederationProps[ 0 ] }, ...nameAndFederationProps[ 1 ]
            }
        } )
        this.glueResourceAccess = this.configContents.glueResourceAccess

    }
}
/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app';
import { CatalogAccessPolicyProps } from '@aws-caef/glue-catalog-l3-construct';
import { Schema } from "ajv";
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';



export interface GlueCatalogConfigContents extends CaefBaseConfigContents {
    /**
     * "(Optional) A map of named catalog access policies"
     */
    readonly accessPolicies?: { [ key: string ]: CatalogAccessPolicyProps }
    /**
     * "(Optional) A map of name to account ids which will be granted read access to the entire catalog"
     */
    readonly consumerAccounts?: { [ key: string ]: string }
    /**
     * "(Optional) A map of name to account ids which will be granted read access to the catalog kms key only"
     */
    readonly kmsKeyConsumerAccounts?: { [ key: string ]: string }
    /**
     * "(Optional) A map of name to catalog (account) ids which will be added as additional Athena catalogs"
     */
    readonly producerAccounts?: { [ key: string ]: string }
}

export class GlueCatalogConfigParser extends CaefAppConfigParser<GlueCatalogConfigContents> {

    public readonly accessPolicies?: { [ key: string ]: CatalogAccessPolicyProps }
    public readonly consumerAccounts?: { [ key: string ]: string };
    public readonly producerAccounts?: { [ key: string ]: string };
    public readonly kmsKeyConsumerAccounts?: { [ key: string ]: string };

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )

        this.accessPolicies = this.configContents.accessPolicies
        this.consumerAccounts = this.configContents.consumerAccounts
        this.kmsKeyConsumerAccounts = this.configContents.kmsKeyConsumerAccounts
        this.producerAccounts = this.configContents.producerAccounts
    }

}

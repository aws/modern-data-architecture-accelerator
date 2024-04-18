/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app';
import { BucketInventoryProps } from '@aws-caef/audit-l3-construct';
import { CaefRoleRef } from '@aws-caef/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';

export interface AuditConfigContents extends CaefBaseConfigContents {
    /**
     * List of refs to roles which will be provided read access to the audit logs
     */
    readRoles?: CaefRoleRef[]
    /**
     * List of source accounts from which audit logs will be accepted
     */
    sourceAccounts?: string[]
    /**
     * List of source regions from which audit logs will be accepted
     */
    sourceRegions?: string[]
    /**
     * Specifies the S3 prefix where inventory data will be accepted on the audit bucket
     */
    inventoryPrefix?: string
    /**
     * The list of expected inventories
     */
    inventories?: BucketInventoryProps[]
}

export class AuditConfigParser extends CaefAppConfigParser<AuditConfigContents> {

    public readonly readRoleRefs: CaefRoleRef[]
    public readonly sourceAccounts: string[]
    public readonly sourceRegions: string[]
    public readonly inventoryPrefix: string
    public readonly inventories?: BucketInventoryProps[]

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )

        this.readRoleRefs = this.configContents.readRoles ? this.configContents.readRoles : []
        this.sourceAccounts = this.configContents.sourceAccounts ? this.configContents.sourceAccounts : []
        this.sourceRegions = this.configContents.sourceRegions ? this.configContents.sourceRegions : []
        this.inventoryPrefix = this.configContents.inventoryPrefix ? this.configContents.inventoryPrefix : "inventory/"
        this.inventories = this.configContents.inventories
    }

}


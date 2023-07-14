/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app';
import { CaefRoleRef } from '@aws-caef/iam-role-helper';
import { Schema } from "ajv";
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';


export interface AthenaWorkgroupConfigContents extends CaefBaseConfigContents {
    /**
     * Array of references to roles which will be provided admin access to workgroup resources
     */
    dataAdminRoles: CaefRoleRef[]
    /**
     * Array of references to roles which will be provided usage access to workgroup resources
     */
    athenaUserRoles: CaefRoleRef[]
    /**
    * Athena workgroup configuration
    */
    workgroupConfiguration?: WorkgroupConfigurationConfig
    /**
     * If specified, policy names will be created using this prefix instead of using the naming module.
     * This is useful when policy names need to be portable across accounts (such as for integration with SSO permission sets)
     */
    readonly verbatimPolicyNamePrefix?: string

}

export interface WorkgroupConfigurationConfig {
    /**
    * The upper limit (cutoff) for the amount of bytes a single query in a workgroup is allowed to scan.
    */
    bytesScannedCutoffPerQuery?: number

}

export class AthenaWorkgroupConfigParser extends CaefAppConfigParser<AthenaWorkgroupConfigContents> {

    public readonly dataAdminRoles: CaefRoleRef[]
    public readonly athenaUserRoles: CaefRoleRef[]
    public readonly workgroupConfiguration: WorkgroupConfigurationConfig
    public readonly verbatimPolicyNamePrefix?: string
    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )

        this.dataAdminRoles = this.configContents.dataAdminRoles
        this.athenaUserRoles = this.configContents.athenaUserRoles
        this.workgroupConfiguration = this.configContents.workgroupConfiguration ? this.configContents.workgroupConfiguration : {}
        this.verbatimPolicyNamePrefix = this.configContents.verbatimPolicyNamePrefix
    }
}

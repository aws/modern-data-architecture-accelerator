/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface LakeFormationSettingsConfigContents extends MdaaBaseConfigContents {
    /**
     * An array of role references to Lake Formation admin roles
     */
    lakeFormationAdminRoles: MdaaRoleRef[]
    /**
     * If true, sets IAM_ALLOW_PRINCIPALS by default on all new databases/tables
     */
    iamAllowedPrincipalsDefault: boolean
}

export class LakeFormationSettingsConfigParser extends MdaaAppConfigParser<LakeFormationSettingsConfigContents> {

    public readonly lakeFormationAdminRoles: MdaaRoleRef[];
    public readonly iamAllowedPrincipalsDefault: boolean;


    constructor( stack: Stack, props: MdaaAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )

        this.lakeFormationAdminRoles = this.configContents.lakeFormationAdminRoles
        this.iamAllowedPrincipalsDefault = this.configContents.iamAllowedPrincipalsDefault
    }
}

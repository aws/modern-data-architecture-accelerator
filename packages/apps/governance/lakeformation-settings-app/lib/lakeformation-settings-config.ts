/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app';
import { CaefRoleRef } from '@aws-caef/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface LakeFormationSettingsConfigContents extends CaefBaseConfigContents {
    /**
     * An array of role references to Lake Formation admin roles
     */
    lakeFormationAdminRoles: CaefRoleRef[]
    /**
     * If true, sets IAM_ALLOW_PRINCIPALS by default on all new databases/tables
     */
    iamAllowedPrincipalsDefault: boolean
}

export class LakeFormationSettingsConfigParser extends CaefAppConfigParser<LakeFormationSettingsConfigContents> {

    public readonly lakeFormationAdminRoles: CaefRoleRef[];
    public readonly iamAllowedPrincipalsDefault: boolean;


    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )

        this.lakeFormationAdminRoles = this.configContents.lakeFormationAdminRoles
        this.iamAllowedPrincipalsDefault = this.configContents.iamAllowedPrincipalsDefault
    }
}

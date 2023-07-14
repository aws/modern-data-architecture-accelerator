/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefAppConfigParser, CaefAppConfigParserProps, CaefBaseConfigContents } from '@aws-caef/app';
import { NamedClassifierProps, NamedConnectionProps, NamedDatabaseProps, FailureNotificationsProps, NamedSecurityGroupConfigProps } from '@aws-caef/dataops-project-l3-construct';
import { CaefRoleRef } from '@aws-caef/iam-role-helper';
import { Schema } from "ajv";
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface DataOpsProjectConfigContents extends CaefBaseConfigContents {

    readonly dataEngineerRoles?: CaefRoleRef[]

    readonly dataAdminRoles: CaefRoleRef[]
    /**
     * Glue Database definitions to create (required)
     */
    readonly databases?: NamedDatabaseProps
    /**
     * Custom Classifiers to create for your crawlers (optional)
     */
    readonly classifiers?: NamedClassifierProps
    /**
     * Connections to use for your Crwalers.
     */
    readonly connections?: NamedConnectionProps
    /**
     * Pre-defined roles to use
     */
    readonly projectExecutionRoles?: CaefRoleRef[]

    readonly s3OutputKmsKeyArn: string

    readonly glueCatalogKmsKeyArn?: string
    /**
     * Failure notifactions for glue jobs .
     */
    readonly failureNotifications?: FailureNotificationsProps
    /**
     * If specified, project security groups will be created which can be shared
     * by project resources 
     */
    readonly securityGroupConfigs?: NamedSecurityGroupConfigProps
}

export class DataOpsProjectConfigParser extends CaefAppConfigParser<DataOpsProjectConfigContents> {

    public readonly dataAdminRoleRefs: CaefRoleRef[]
    public readonly dataEngineerRoleRefs: CaefRoleRef[]
    public readonly databases?: NamedDatabaseProps
    public readonly projectExecutionRoleRefs: CaefRoleRef[]
    public readonly connections?: NamedConnectionProps
    public readonly classifiers?: NamedClassifierProps
    public readonly s3OutputKmsKeyArn: string;
    public readonly glueCatalogKmsKeyArn?: string;
    public readonly failureNotifications?: FailureNotificationsProps;
    public readonly securityGroupConfigs?: NamedSecurityGroupConfigProps

    constructor( stack: Stack, props: CaefAppConfigParserProps ) {
        super( stack, props, configSchema as Schema )

        this.dataAdminRoleRefs = this.configContents.dataAdminRoles
        this.dataEngineerRoleRefs = this.configContents.dataEngineerRoles ? this.configContents.dataEngineerRoles : []
        this.projectExecutionRoleRefs = this.configContents.projectExecutionRoles ? this.configContents.projectExecutionRoles : []
        this.classifiers = this.configContents.classifiers
        this.databases = this.configContents.databases
        this.connections = this.configContents.connections
        this.s3OutputKmsKeyArn = this.configContents.s3OutputKmsKeyArn
        this.glueCatalogKmsKeyArn = this.configContents.glueCatalogKmsKeyArn
        this.failureNotifications = this.configContents.failureNotifications
        this.securityGroupConfigs = this.configContents.securityGroupConfigs
    }
}

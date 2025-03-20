/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  NamedClassifierProps,
  NamedConnectionProps,
  NamedDatabaseProps,
  FailureNotificationsProps,
  NamedSecurityGroupConfigProps,
  DatazoneProps,
} from '@aws-mdaa/dataops-project-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface DataOpsProjectConfigContents extends MdaaBaseConfigContents {
  readonly dataEngineerRoles?: MdaaRoleRef[];

  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Glue Database definitions to create (required)
   */
  readonly databases?: NamedDatabaseProps;
  /**
   * Custom Classifiers to create for your crawlers (optional)
   */
  readonly classifiers?: NamedClassifierProps;
  /**
   * Connections to use for your Crwalers.
   */
  readonly connections?: NamedConnectionProps;
  /**
   * Pre-defined roles to use
   */
  readonly projectExecutionRoles?: MdaaRoleRef[];

  readonly s3OutputKmsKeyArn?: string;

  readonly glueCatalogKmsKeyArn?: string;
  /**
   * Failure notifactions for glue jobs .
   */
  readonly failureNotifications?: FailureNotificationsProps;
  /**
   * If specified, project security groups will be created which can be shared
   * by project resources
   */
  readonly securityGroupConfigs?: NamedSecurityGroupConfigProps;

  readonly datazone?: DatazoneProps;
}

export class DataOpsProjectConfigParser extends MdaaAppConfigParser<DataOpsProjectConfigContents> {
  public readonly dataAdminRoleRefs: MdaaRoleRef[];
  public readonly dataEngineerRoleRefs: MdaaRoleRef[];
  public readonly databases?: NamedDatabaseProps;
  public readonly projectExecutionRoleRefs: MdaaRoleRef[];
  public readonly connections?: NamedConnectionProps;
  public readonly classifiers?: NamedClassifierProps;
  public readonly s3OutputKmsKeyArn?: string;
  public readonly glueCatalogKmsKeyArn?: string;
  public readonly failureNotifications?: FailureNotificationsProps;
  public readonly securityGroupConfigs?: NamedSecurityGroupConfigProps;
  public readonly datazone?: DatazoneProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.dataAdminRoleRefs = this.configContents.dataAdminRoles;
    this.dataEngineerRoleRefs = this.configContents.dataEngineerRoles ? this.configContents.dataEngineerRoles : [];
    this.projectExecutionRoleRefs = this.configContents.projectExecutionRoles
      ? this.configContents.projectExecutionRoles
      : [];
    this.classifiers = this.configContents.classifiers;
    this.databases = this.configContents.databases;
    this.connections = this.configContents.connections;
    this.s3OutputKmsKeyArn = this.configContents.s3OutputKmsKeyArn;
    this.glueCatalogKmsKeyArn = this.configContents.glueCatalogKmsKeyArn;
    this.failureNotifications = this.configContents.failureNotifications;
    this.securityGroupConfigs = this.configContents.securityGroupConfigs;
    this.datazone = this.configContents.datazone;
  }
}

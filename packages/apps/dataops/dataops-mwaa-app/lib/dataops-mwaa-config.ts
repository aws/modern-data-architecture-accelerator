/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParserProps } from '@aws-mdaa/app';
import { MdaaDataOpsConfigContents, MdaaDataOpsConfigParser } from '@aws-mdaa/dataops-shared';
import { MwaaEnvironmentMap } from '@aws-mdaa/dataops-mwaa-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface DataopsMwaaConfigContents extends MdaaDataOpsConfigContents {
  /**
   * Map of named MWAA environment configurations. Each key becomes the
   * environment identifier processed through MDAA naming conventions.
   * Deploys KMS-encrypted, VPC-bound Airflow environments with auto-scaling
   * workers, configurable logging, and IAM-based access control.
   *
   * Use cases: Workflow orchestration; ETL pipeline scheduling; Multi-environment Airflow deployment
   *
   * AWS: Amazon Managed Workflows for Apache Airflow (MWAA) environments
   *
   * Validation: Required; map of environment names to valid MwaaEnvironmentProps
   */
  readonly environments: MwaaEnvironmentMap;
  /**
   * Data admin roles granted Airflow web login and CLI access for ALL environments.
   * These roles receive airflow:CreateWebLoginToken, airflow:CreateCliToken, and
   * airflow:GetEnvironment permissions on every environment in this module.
   *
   * Use cases: Platform admin access; Cross-environment administration
   *
   * AWS: IAM roles with Airflow access managed policies attached for all environments
   *
   * Validation: Optional; array of valid MdaaRoleRef
   */
  readonly dataAdminRoles?: MdaaRoleRef[];
}

export class DataopsMwaaConfigParser extends MdaaDataOpsConfigParser<DataopsMwaaConfigContents> {
  public readonly environments: MwaaEnvironmentMap;
  public readonly dataAdminRoles?: MdaaRoleRef[];

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema);

    this.environments = this.configContents.environments;
    this.dataAdminRoles = this.configContents.dataAdminRoles;
  }
}

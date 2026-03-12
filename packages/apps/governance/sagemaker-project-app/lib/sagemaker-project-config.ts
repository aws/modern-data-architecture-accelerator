/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import { DomainConfig } from '@aws-mdaa/datazone-constructs';
import * as configSchema from './config-schema.json';
import {
  NamedProfileEnvironmentConfigs,
  NamedProjectProfiles,
  NamedSageMakerProjects,
} from '@aws-mdaa/sagemaker-project-l3-construct';

export interface SagemakerProjectConfigContents extends MdaaBaseConfigContents {
  /**
   * SSM parameter base name containing SageMaker domain configuration. Allows
   * all required domain config (domain ID, blueprint IDs, domain unit IDs) to be
   * pulled from SSM and APIs. If omitted, the full domainConfig object must be
   * provided instead.
   *
   * Use cases: Dynamic domain config resolution; Decoupled domain/project deployments
   *
   * AWS: SSM Parameter Store for SageMaker domain configuration
   *
   * Validation: Optional; valid SSM parameter name; mutually exclusive with domainConfig
   */
  readonly domainConfigSSMParam?: string;
  /**
   * Direct domain configuration object for SageMaker project setup. Use this
   * when SSM-based config resolution is not desired. Mutually exclusive with
   * domainConfigSSMParam.
   *
   * Use cases: Inline domain config; Testing; Single-stack deployments
   *
   * AWS: SageMaker (DataZone V2) domain configuration
   *
   * Validation: Optional; valid DomainConfig; mutually exclusive with domainConfigSSMParam
   */
  readonly domainConfig?: DomainConfig;
  /**
   * SageMaker projects to create in the domain. Each project references a
   * project profile and can include data sources and membership assignments.
   *
   * Use cases: Project deployment; Data source registration; Team membership
   *
   * AWS: DataZone projects with profile-based environment provisioning
   *
   * Validation: Optional; valid NamedSageMakerProjects
   */
  readonly projects?: NamedSageMakerProjects;
  /**
   * Project profiles defining environment blueprints and deployment configurations.
   * Profiles are reusable templates that determine which environments are provisioned
   * when a project is created.
   *
   * Use cases: Standardized project templates; Blueprint environment bundling
   *
   * AWS: DataZone project profiles with environment configurations
   *
   * Validation: Optional; valid NamedProjectProfiles
   */
  readonly projectProfiles?: NamedProjectProfiles;
  /**
   * Reusable environment templates that can be referenced by project profiles
   * via the environmentsTemplate property. Template environments are merged
   * with profile-specific environments.
   *
   * Use cases: Shared environment definitions; DRY profile configuration
   *
   * AWS: DataZone project profile environment templates
   *
   * Validation: Optional; map of template name to NamedProfileEnvironmentConfigs
   */
  readonly projectProfileEnvironmentsTemplates?: { [name: string]: NamedProfileEnvironmentConfigs };
}

export class SagemakerProjectConfigParser extends MdaaAppConfigParser<SagemakerProjectConfigContents> {
  readonly domainConfigSSMParam?: string;
  readonly domainConfig?: DomainConfig;
  readonly projects?: NamedSageMakerProjects;
  readonly projectProfiles?: NamedProjectProfiles;
  readonly projectProfileEnvironmentsTemplates?: { [name: string]: NamedProfileEnvironmentConfigs };
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.domainConfigSSMParam = this.configContents.domainConfigSSMParam;
    this.domainConfig = this.configContents.domainConfig;
    this.projectProfiles = this.configContents.projectProfiles;
    this.projects = this.configContents.projects;
    this.projectProfileEnvironmentsTemplates = this.configContents.projectProfileEnvironmentsTemplates;
  }
}

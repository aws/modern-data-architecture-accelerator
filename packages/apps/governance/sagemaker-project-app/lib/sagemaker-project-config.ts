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
   * Q-ENHANCED-PROPERTY
   * Optional SSM parameter reference for domain configuration enabling dynamic domain configuration management. Specifies the SSM parameter containing domain configuration data for flexible domain setup and configuration management.
   *
   * Use cases: Dynamic configuration; SSM parameter reference; Configuration management; Flexible setup
   *
   * AWS: AWS Systems Manager parameter for DataZone domain configuration reference
   *
   * Validation: Must be valid SSM parameter name if provided; parameter must contain valid domain configuration
   **/
  readonly domainConfigSSMParam?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional direct domain configuration for DataZone project setup enabling inline domain configuration management. Provides direct domain configuration object for DataZone project setup and governance configuration without external parameter references.
   *
   * Use cases: Direct configuration; Inline setup; Domain configuration; Governance setup
   *
   * AWS: DataZone domain configuration for project setup and governance management
   *
   * Validation: Must be valid DomainConfig object if provided; enables direct domain configuration when specified
   *   **/
  readonly domainConfig?: DomainConfig;
  readonly projects?: NamedSageMakerProjects;
  readonly projectProfiles?: NamedProjectProfiles;
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

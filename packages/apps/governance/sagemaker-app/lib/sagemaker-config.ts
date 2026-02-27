/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { NamedSageMakerDomainProps } from '@aws-mdaa/datazone-l3-construct';

/**
 * Generic blueprint properties for SageMaker blueprints
 */
export interface SageMakerBlueprintProps {
  readonly parameters?: { [key: string]: string | string[] | number | boolean };
  readonly authorizedDomainUnits: string[];
}

export interface SagemakerConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of domain names to SageMaker domain configurations enabling ML platform management and governance. Provides complete domain setup with user management, security controls, and ML development capabilities for enterprise machine learning operations.
   *
   * Use cases: ML platform management; SageMaker domain governance; Enterprise ML development environment setup
   *
   * AWS: Amazon SageMaker domains for ML platform management and governance
   *
   * Validation: Must be valid NamedBaseDomainsProps; required; defines all SageMaker domain configurations and capabilities
   *   **/
  readonly domains: NamedSageMakerDomainProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for Glue catalog encryption enabling secure data catalog operations with customer-controlled encryption. Provides encryption at rest for Glue catalog metadata used in ML workflows and data governance within SageMaker integration.
   *
   * Use cases: Data catalog encryption; Secure ML metadata management; Customer-controlled key management for ML governance
   *
   * AWS: AWS KMS key for Glue catalog encryption in SageMaker integration and secure ML metadata management
   *
   * Validation: Must be valid KMS key ARN if provided; enables secure Glue catalog integration with SageMaker
   **/
  readonly glueCatalogKmsKeyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional Lake Formation management access role reference enabling SageMaker integration with Lake Formation access control. Provides role-based integration between SageMaker and Lake Formation for ML data governance and access management.
   *
   * Use cases: Lake Formation integration; ML data governance; Integrated access control for ML workflows
   *
   * AWS: AWS IAM role for SageMaker and Lake Formation integration and ML governance
   *
   * Validation: Must be valid MdaaRoleRef if provided; enables integrated governance between SageMaker and Lake Formation
   **/
  readonly lakeformationManageAccessRole?: MdaaRoleRef;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional SageMaker domain execution role reference enabling custom execution role configuration for enhanced security compliance. When provided, uses existing role instead of creating default execution role with AWS managed policies for least privilege access.
   *
   * Use cases: Custom execution roles; Security compliance; Least privilege access; Role reuse
   *
   * AWS: AWS IAM role for SageMaker domain execution with custom permissions
   *
   * Validation: Must be valid MdaaRoleRef if provided; enables custom execution role configuration
   **/
  readonly sagemakerDomainExecutionRole?: MdaaRoleRef;
}

export class SagemakerConfigParser extends MdaaAppConfigParser<SagemakerConfigContents> {
  public readonly sageMakerDomains: NamedSageMakerDomainProps;
  public readonly glueCatalogKmsKeyArn?: string;

  readonly lakeformationManageAccessRole?: MdaaRoleRef;
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.glueCatalogKmsKeyArn = this.configContents.glueCatalogKmsKeyArn;
    this.lakeformationManageAccessRole = this.configContents.lakeformationManageAccessRole;

    this.sageMakerDomains = this.configContents.domains;
  }
}

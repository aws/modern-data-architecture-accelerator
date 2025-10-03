/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import { NamedDomainsProps, NamedBaseDomainsProps } from '@aws-mdaa/datazone-l3-construct';
import * as configSchema from './config-schema.json';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';

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
  readonly domains: NamedBaseDomainsProps;
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
}

export class SagemakerConfigParser extends MdaaAppConfigParser<SagemakerConfigContents> {
  public domains: NamedDomainsProps;
  public glueCatalogKmsKeyArn?: string;
  readonly lakeformationManageAccessRole?: MdaaRoleRef;
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.glueCatalogKmsKeyArn = this.configContents.glueCatalogKmsKeyArn;
    this.lakeformationManageAccessRole = this.configContents.lakeformationManageAccessRole;
    this.domains = Object.fromEntries(
      Object.entries(this.configContents.domains).map(entry => {
        return [
          entry[0],
          {
            ...entry[1],
            domainVersion: 'V2',
            singleSignOnType: 'IAM_IDC',
          },
        ];
      }),
    );
  }
}

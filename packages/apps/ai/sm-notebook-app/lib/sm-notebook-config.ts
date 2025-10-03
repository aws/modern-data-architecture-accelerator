/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  NamedLifecycleConfigProps,
  NotebookAssetDeploymentConfig,
  NotebookWithIdProps,
} from '@aws-mdaa/sm-notebook-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface SageMakerNotebookConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional asset deployment configuration for SageMaker notebook instances enabling automated code and resource deployment. Provides mechanism for deploying notebooks, scripts, and other assets to notebook instances for consistent development environments.
   *
   * Use cases: Automated asset deployment; Consistent development environments; Code and resource provisioning
   *
   * AWS: Amazon SageMaker notebook instance asset deployment for development environment setup
   *
   * Validation: Must be valid NotebookAssetDeploymentConfig if provided; enables automated asset deployment to notebooks
   **/
  readonly assetDeploymentConfig?: NotebookAssetDeploymentConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of lifecycle configuration names to lifecycle configurations enabling automated notebook instance management. Provides startup and shutdown scripts for notebook instances to ensure consistent environment setup and resource management.
   *
   * Use cases: Automated environment setup; Consistent notebook configuration; Resource management and optimization
   *
   * AWS: Amazon SageMaker lifecycle configurations for automated notebook instance management
   *
   * Validation: Must be valid NamedLifecycleConfigProps if provided; enables automated notebook lifecycle management
   **/
  readonly lifecycleConfigs?: NamedLifecycleConfigProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional KMS key ARN for notebook instance encryption enabling secure data science development with customer-controlled encryption. Provides encryption at rest for notebook instance storage and ensures data protection compliance for sensitive development work.
   *
   * Use cases: Secure development environments; Data protection compliance; Customer-controlled encryption for notebooks
   *
   * AWS: AWS KMS key for SageMaker notebook instance encryption and secure development
   *
   * Validation: Must be valid KMS key ARN if provided; enables encrypted storage for notebook instances
   **/
  readonly kmsKeyArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of notebook names to notebook instance configurations enabling data science development environment provisioning. Provides complete notebook instance setup with compute resources, networking, and access controls for machine learning development.
   *
   * Use cases: Data science development; ML notebook provisioning; development environment setup
   *
   * AWS: Amazon SageMaker notebook instances for data science and machine learning development
   *
   * Validation: Must be valid NotebookWithIdProps if provided; defines all notebook instance configurations and capabilities
   *   **/
  readonly notebooks?: NotebookWithIdProps;
}

export class SageMakerNotebookConfigParser extends MdaaAppConfigParser<SageMakerNotebookConfigContents> {
  public readonly kmsKeyArn?: string;
  public readonly notebooks?: NotebookWithIdProps;
  public readonly lifecycleConfigs?: NamedLifecycleConfigProps;
  public readonly assetDeployment: NotebookAssetDeploymentConfig | undefined;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.assetDeployment = this.configContents.assetDeploymentConfig;
    this.kmsKeyArn = this.configContents.kmsKeyArn;
    this.notebooks = this.configContents.notebooks;
    this.lifecycleConfigs = this.configContents.lifecycleConfigs;
  }
}

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
   * Asset deployment configuration for automated notebook code and resource provisioning.
   *
   * Use cases: Automated asset deployment, consistent development environments, code provisioning
   *
   * AWS: SageMaker notebook instance asset deployment
   *
   * Validation: Optional; NotebookAssetDeploymentConfig
   **/
  readonly assetDeploymentConfig?: NotebookAssetDeploymentConfig;
  /**
   * Map of lifecycle configuration names to lifecycle configs with startup/shutdown scripts.
   *
   * Use cases: Automated environment setup, consistent notebook configuration, resource management
   *
   * AWS: SageMaker lifecycle configurations
   *
   * Validation: Optional; NamedLifecycleConfigProps (map of name to config)
   **/
  readonly lifecycleConfigs?: NamedLifecycleConfigProps;
  /**
   * Existing KMS key ARN for notebook instance encryption.
   * If omitted, a customer-managed key is created automatically.
   *
   * Use cases: Customer-controlled encryption, data protection compliance, key reuse
   *
   * AWS: KMS key for SageMaker notebook encryption
   *
   * Validation: Optional; String; must be valid KMS key ARN
   **/
  readonly kmsKeyArn?: string;
  /**
   * Map of notebook names to notebook instance configurations with compute, networking, and access controls.
   *
   * Use cases: Data science development, ML notebook provisioning, development environment setup
   *
   * AWS: SageMaker notebook instances
   *
   * Validation: Optional; NotebookWithIdProps (map of notebook name to config)
   **/
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

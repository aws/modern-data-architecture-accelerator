/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  ConfigurationElement,
  IMdaaConfigTransformer,
  IMdaaConfigValueTransformer,
  MdaaConfigTransformer,
} from '@aws-mdaa/config';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

export interface MdaaDataOpsConfigContents extends MdaaBaseConfigContents {
  /**
   * Glue security configuration name for job encryption (at rest, in transit, CloudWatch logs).
   * Auto-resolved from project when projectName is set.
   *
   * Use cases: Job encryption; Security compliance
   *
   * AWS: Glue security configuration
   *
   * Validation: Optional; auto-wired from project if projectName provided
   */
  readonly securityConfigurationName?: string;
  /**
   * DataOps project name enabling auto-wiring of shared resources (bucket, KMS key,
   * SNS topic, deployment role, security configuration) via SSM parameters.
   *
   * Use cases: Project resource coordination; Shared infrastructure reuse
   *
   * AWS: DataOps project SSM parameter references
   *
   * Validation: Optional; must match an existing deployed project
   */
  readonly projectName?: string;
  /**
   * S3 bucket name for project storage (scripts, artifacts, temp files).
   * Auto-resolved from project when projectName is set.
   *
   * Use cases: Script storage; Processing artifacts; Centralized project storage
   *
   * AWS: S3 bucket
   *
   * Validation: Optional; auto-wired from project if projectName provided
   */
  readonly bucketName?: string;
  /**
   * SNS topic ARN for job notifications and workflow alerts.
   * Auto-resolved from project when projectName is set.
   *
   * Use cases: Job failure alerts; Workflow status notifications
   *
   * AWS: SNS topic
   *
   * Validation: Optional; auto-wired from project if projectName provided
   */
  readonly notificationTopicArn?: string;
  /**
   * IAM role ARN for deployment operations and resource management.
   * Auto-resolved from project when projectName is set.
   *
   * Use cases: Deployment permissions; Resource provisioning
   *
   * AWS: IAM role
   *
   * Validation: Optional; auto-wired from project if projectName provided
   */
  readonly deploymentRoleArn?: string;
  /**
   * KMS key ARN for encrypting DataOps resources and data.
   * Auto-resolved from project when projectName is set.
   *
   * Use cases: Data encryption; Security compliance
   *
   * AWS: KMS key
   *
   * Validation: Optional; auto-wired from project if projectName provided
   */
  readonly kmsArn?: string;
}

export class MdaaDataOpsConfigParser<T extends MdaaDataOpsConfigContents> extends MdaaAppConfigParser<T> {
  public readonly securityConfigurationName?: string;
  public readonly projectName?: string;
  public readonly bucketName?: string;
  public readonly notificationTopicArn?: string;
  public readonly deploymentRoleArn?: string;
  public readonly kmsArn?: string;

  constructor(stack: Stack, props: MdaaAppConfigParserProps, configSchema: Schema) {
    super(stack, props, configSchema, [new ProjectConfigTransformer(props.naming)]);
    this.securityConfigurationName = this.configContents.securityConfigurationName;
    this.projectName = this.configContents.projectName;
    this.bucketName = this.configContents.bucketName;
    this.notificationTopicArn = this.configContents.notificationTopicArn;
    this.deploymentRoleArn = this.configContents.deploymentRoleArn;
    this.kmsArn = this.configContents.kmsArn;
  }
}

class ProjectConfigTransformer implements IMdaaConfigTransformer {
  private readonly naming: IMdaaResourceNaming;

  constructor(naming: IMdaaResourceNaming) {
    this.naming = naming;
  }

  public transformConfig(config: ConfigurationElement): ConfigurationElement {
    const projectName = config['projectName'];
    if (projectName && typeof projectName === 'string') {
      const moddedConfig = config;
      moddedConfig['securityConfigurationName'] = moddedConfig['securityConfigurationName']
        ? moddedConfig['securityConfigurationName']
        : 'project:securityConfiguration/default';
      moddedConfig['bucketName'] = moddedConfig['bucketName']
        ? moddedConfig['bucketName']
        : 'project:projectBucket/default';
      moddedConfig['notificationTopicArn'] = moddedConfig['notificationTopicArn']
        ? moddedConfig['notificationTopicArn']
        : 'project:projectTopicArn/default';
      moddedConfig['deploymentRoleArn'] = moddedConfig['deploymentRoleArn']
        ? moddedConfig['deploymentRoleArn']
        : 'project:deploymentRole/default';
      moddedConfig['kmsArn'] = moddedConfig['kmsArn'] ? moddedConfig['kmsArn'] : 'project:kmsArn/default';

      const projectConfigValTransformer = new ProjectConfigValueTransformer(projectName, this.naming);
      return new MdaaConfigTransformer(projectConfigValTransformer).transformConfig(moddedConfig);
    } else {
      return config;
    }
  }
}

class ProjectConfigValueTransformer implements IMdaaConfigValueTransformer {
  private readonly projectName: string;
  private readonly naming: IMdaaResourceNaming;

  constructor(projectName: string, naming: IMdaaResourceNaming) {
    this.projectName = projectName;
    this.naming = naming;
  }

  public transformValue(value: string): string {
    if (value.startsWith('project:')) {
      return 'ssm:' + this.naming.ssmPath(`${this.projectName}/${value.split(':')[1]}`, false, false);
    } else {
      return value;
    }
  }
}

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
   * Q-ENHANCED-PROPERTY
   * Required Glue security configuration name for DataOps job security enabling encryption and access control for data processing operations. Provides the security configuration that will be used by Glue jobs for encryption at rest, in transit, and CloudWatch logs encryption.
   *
   * Use cases: Glue job security; Encryption configuration; Security compliance; Data protection
   *
   * AWS: Glue security configuration for DataOps job encryption and security compliance
   *
   * Validation: Must be valid security configuration name; required for Glue job security and encryption
   **/
  readonly securityConfigurationName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required DataOps project name for resource coordination and shared infrastructure enabling project-based resource organization and management. Provides the project identifier that coordinates shared resources across DataOps applications and workflows.
   *
   * Use cases: Project coordination; Resource organization; Shared infrastructure; Project management
   *
   * AWS: DataOps project name for resource coordination and shared infrastructure management
   *
   * Validation: Must be valid project name; required for project coordination and resource organization
   **/
  readonly projectName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required S3 bucket name for DataOps project storage enabling centralized data storage and artifact management. Provides the shared S3 bucket for project data, scripts, temporary files, and processing artifacts across DataOps workflows.
   *
   * Use cases: Project storage; Data artifacts; Script storage; Centralized storage management
   *
   * AWS: S3 bucket for DataOps project storage and artifact management
   *
   * Validation: Must be valid S3 bucket name; required for project storage and artifact management
   **/
  readonly bucketName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required SNS topic ARN for DataOps notifications enabling event-driven communication and workflow coordination. Provides the SNS topic for job notifications, error alerts, and workflow status updates across DataOps operations.
   *
   * Use cases: Job notifications; Error alerts; Workflow coordination; Event-driven communication
   *
   * AWS: SNS topic ARN for DataOps notifications and workflow coordination
   *
   * Validation: Must be valid SNS topic ARN; required for notifications and workflow coordination
   **/
  readonly notificationTopicArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required IAM role ARN for DataOps deployment operations enabling secure deployment and resource management. Provides the IAM role used for deploying and managing DataOps resources with appropriate permissions for infrastructure operations.
   *
   * Use cases: Deployment operations; Resource management; IAM permissions; Secure deployment
   *
   * AWS: IAM role ARN for DataOps deployment operations and resource management
   *
   * Validation: Must be valid IAM role ARN; required for deployment operations and resource management
   **/
  readonly deploymentRoleArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required KMS key ARN for DataOps encryption enabling data protection and security compliance. Provides the customer-managed KMS key for encrypting DataOps resources, data, and operational artifacts ensuring data protection and compliance.
   *
   * Use cases: Data encryption; Security compliance; Key management; Data protection
   *
   * AWS: KMS key ARN for DataOps encryption and data protection compliance
   *
   * Validation: Must be valid KMS key ARN; required for encryption and data protection compliance
   **/
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

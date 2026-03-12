/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  FailureNotificationsProps,
  LakeFormationConfig,
  NamedClassifierProps,
  NamedConnectionProps,
  NamedDatabaseProps,
  NamedSecurityGroupConfigProps,
  DataOpsDatazoneProps,
  DataOpsSageMakerProps,
} from '@aws-mdaa/dataops-project-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface DataOpsProjectConfigContents extends MdaaBaseConfigContents {
  /**
   * Data engineer roles with operational access to project resources (jobs, crawlers, databases).
   *
   * Use cases: Pipeline development access; Operational resource management
   *
   * AWS: IAM roles with DataOps operational permissions
   *
   * Validation: Optional; array of MdaaRoleRef
   */
  readonly dataEngineerRoles?: MdaaRoleRef[];

  /**
   * Data admin roles with full administrative access to all project resources.
   *
   * Use cases: Project administration; Security management; Resource configuration
   *
   * AWS: IAM roles with full DataOps admin permissions
   *
   * Validation: Required; array of MdaaRoleRef
   */
  readonly dataAdminRoles: MdaaRoleRef[];
  /**
   * Glue database definitions for centralized metadata management and catalog organization.
   *
   * Use cases: Data catalog organization; Table management; Metadata coordination
   *
   * AWS: Glue databases
   *
   * Validation: Optional; valid NamedDatabaseProps
   */
  readonly databases?: NamedDatabaseProps;
  /**
   * Custom Glue classifier definitions for specialized data format recognition.
   *
   * Use cases: Non-standard format parsing; Proprietary file type classification
   *
   * AWS: Glue custom classifiers
   *
   * Validation: Optional; valid NamedClassifierProps
   */
  readonly classifiers?: NamedClassifierProps;
  /**
   * Glue connection definitions for secure connectivity to external data sources.
   *
   * Use cases: JDBC database connections; Data warehouse connectivity
   *
   * AWS: Glue connections
   *
   * Validation: Optional; valid NamedConnectionProps
   */
  readonly connections?: NamedConnectionProps;
  /**
   * Pre-defined execution roles for project resource operations (jobs, crawlers).
   *
   * Use cases: Standardized execution roles; Cross-component role coordination
   *
   * AWS: IAM execution roles
   *
   * Validation: Optional; array of MdaaRoleRef
   */
  readonly projectExecutionRoles?: MdaaRoleRef[];

  /**
   * KMS key ARN for encrypting S3 output data from project operations.
   *
   * Use cases: Output data encryption; Data protection compliance
   *
   * AWS: KMS key for S3 encryption
   *
   * Validation: Optional; valid KMS key ARN
   */
  readonly s3OutputKmsKeyArn?: string;

  /**
   * KMS key ARN for Glue Catalog metadata encryption.
   *
   * Use cases: Catalog metadata protection; Encryption compliance
   *
   * AWS: KMS key for Glue Catalog encryption
   *
   * Validation: Optional; valid KMS key ARN
   */
  readonly glueCatalogKmsKeyArn?: string;
  /**
   * Failure notification configuration for Glue job monitoring and alerting.
   *
   * Use cases: Job failure alerts; Operational monitoring
   *
   * AWS: SNS/CloudWatch integration for Glue job notifications
   *
   * Validation: Optional; valid FailureNotificationsProps
   */
  readonly failureNotifications?: FailureNotificationsProps;
  /**
   * Shared security group configurations for project resources.
   *
   * Use cases: Centralized network security; Consistent access control
   *
   * AWS: VPC security groups
   *
   * Validation: Optional; valid NamedSecurityGroupConfigProps
   */
  readonly securityGroupConfigs?: NamedSecurityGroupConfigProps;

  /**
   * DataZone configuration for data governance and catalog integration.
   * Mutually exclusive with sagemaker.
   *
   * Use cases: Data governance; Collaborative data discovery; Asset management
   *
   * AWS: Amazon DataZone
   *
   * Validation: Optional; valid DataOpsDatazoneProps; cannot be set with sagemaker
   */
  readonly datazone?: DataOpsDatazoneProps;
  readonly sagemaker?: DataOpsSageMakerProps;

  /**
   * Project-level Lake Formation configuration for centralized tag-based access control.
   * Defines project-wide LF-tag vocabulary shared across all databases.
   *
   * Use cases: Centralized tag management; Project-wide TBAC; Shared governance
   *
   * AWS: Lake Formation project-level configuration
   *
   * Validation: Optional; valid LakeFormationConfig
   */
  readonly lakeFormation?: LakeFormationConfig;
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
  public readonly datazone?: DataOpsDatazoneProps;
  public readonly sagemaker?: DataOpsSageMakerProps;
  public readonly lakeFormation?: LakeFormationConfig;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.dataAdminRoleRefs = this.configContents.dataAdminRoles;
    this.dataEngineerRoleRefs = this.configContents.dataEngineerRoles ?? [];
    this.projectExecutionRoleRefs = this.configContents.projectExecutionRoles ?? [];
    this.classifiers = this.configContents.classifiers;
    this.databases = this.configContents.databases;
    this.connections = this.configContents.connections;
    this.s3OutputKmsKeyArn = this.configContents.s3OutputKmsKeyArn;
    this.glueCatalogKmsKeyArn = this.configContents.glueCatalogKmsKeyArn;
    this.failureNotifications = this.configContents.failureNotifications;
    this.securityGroupConfigs = this.configContents.securityGroupConfigs;
    this.datazone = this.configContents.datazone;
    this.lakeFormation = this.configContents.lakeFormation;
    if (this.configContents.datazone && this.configContents.sagemaker) {
      throw new Error('Only one of datazone or sageMaker can be specified');
    } else if (this.configContents.datazone) {
      this.datazone = this.configContents.datazone;
    } else if (this.configContents.sagemaker) {
      this.sagemaker = this.configContents.sagemaker;
    }
  }
}

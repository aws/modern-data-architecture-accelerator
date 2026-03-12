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
   * Map of domain names to SageMaker Unified Studio (DataZone V2) domain
   * configurations. Each domain deploys a SageMaker domain with KMS encryption,
   * service role, domain bucket, tooling blueprint, user/group profiles, and
   * optional cross-account associations.
   *
   * Use cases: SageMaker Unified Studio domain deployment; ML governance; Blueprint management
   *
   * AWS: SageMaker (DataZone V2) domains, KMS CMKs, IAM service roles, S3 domain buckets
   *
   * Validation: Required; valid NamedSageMakerDomainProps
   */
  readonly domains: NamedSageMakerDomainProps;
  /**
   * KMS key ARN for Glue catalog encryption in this account. If omitted,
   * looked up from the standard LF Settings SSM parameter.
   *
   * Use cases: Customer-managed Glue catalog encryption for ML workflows
   *
   * AWS: KMS key for Glue Data Catalog encryption
   *
   * Validation: Optional; valid KMS key ARN
   */
  readonly glueCatalogKmsKeyArn?: string;
  /**
   * IAM role for Lake Formation permission management across all domains.
   * Should be an LF Admin role, typically created by the LF Settings module.
   * If omitted, looked up from the standard LF Settings SSM parameter.
   *
   * Use cases: SageMaker-LakeFormation integration; Automated LF permission grants for ML data
   *
   * AWS: IAM role for Lake Formation access management
   *
   * Validation: Optional; valid MdaaRoleRef
   */
  readonly lakeformationManageAccessRole?: MdaaRoleRef;
  /**
   * Custom execution role for SageMaker domains. When provided, uses this role
   * instead of creating a default execution role with AWS managed policies.
   *
   * Use cases: Least-privilege execution roles; Custom permission boundaries; Role reuse
   *
   * AWS: IAM role for SageMaker domain execution
   *
   * Validation: Optional; valid MdaaRoleRef
   */
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

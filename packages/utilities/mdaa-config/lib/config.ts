/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CfnParameterProps } from 'aws-cdk-lib';

export type ConfigurationElement = { [key: string]: unknown };
export type TagElement = { [key: string]: string };
export type Workspace = {
  name: string;
  location: string;
};
export interface MdaaCustomAspect {
  /** Module path or package name containing the custom CDK aspect implementation */
  readonly aspect_module: string;
  /** Class name of the custom CDK aspect implementation within the specified module */
  readonly aspect_class: string;
  /** Configuration properties passed to the custom aspect constructor for aspect-specific behavior customization */
  readonly aspect_props?: ConfigurationElement;
}

export interface MdaaCustomNaming {
  /** Module path or package name containing the custom MDAA naming implementation */
  readonly naming_module: string;
  /** Class name of the custom MDAA naming implementation within the specified module */
  readonly naming_class: string;
  /** Configuration properties passed to the custom naming implementation constructor for naming */
  readonly naming_props?: ConfigurationElement;
}

export interface MdaaNagSuppressionConfigs {
  /** Array of CDK Nag suppressions organized by CloudFormation resource path, enabling targeted */
  readonly by_path: MdaaNagSuppressionByPath[];
}

export interface MdaaNagSuppressionByPath {
  /** CloudFormation resource path identifying the specific resource for which CDK Nag rules should be suppressed */
  readonly path: string;
  /** Array of specific CDK Nag rule suppressions with rule IDs and mandatory justifications for audit compliance */
  readonly suppressions: {
    readonly id: string;
    readonly reason: string;
  }[];
}

export interface MdaaServiceCatalogConstraintRuleAssertionConfig {
  /** Constraint assertion expression that defines the validation logic for Service Catalog product parameters */
  readonly assert: string;
  /** Human-readable description explaining the purpose and requirements of the constraint assertion */
  readonly description: string;
}

// It seems we need this empty interface in the schema even though no one uses it
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface MdaaServiceCatalogConstraintRuleCondititionConfig {}

export interface MdaaServiceCatalogConstraintRuleConfig {
  /** Condition configuration that determines when the constraint rule assertions should be evaluated */
  readonly condition: MdaaServiceCatalogConstraintRuleCondititionConfig;
  /** Array of constraint assertions that define the validation logic to be applied when the condition is met */
  readonly assertions: MdaaServiceCatalogConstraintRuleAssertionConfig[];
}

export interface MdaaServiceCatalogConstraintConfig {
  /** Human-readable description explaining the purpose and scope of the Service Catalog constraint */
  readonly description: string;
  /** Object containing named constraint rules that define the validation logic for Service Catalog product parameters */
  readonly rules: { [key: string]: MdaaServiceCatalogConstraintRuleConfig };
}

export interface MdaaServiceCatalogParameterConfig {
  /** CloudFormation parameter properties that define the parameter characteristics including type, */
  readonly props: CfnParameterProps;
  /** Constraint configuration that defines additional validation rules for the Service Catalog product parameter */
  readonly constraints?: MdaaServiceCatalogConstraintConfig;
}

export interface MdaaServiceCatalogProductConfig {
  /** ARN of the AWS Service Catalog portfolio where the product will be associated */
  readonly portfolio_arn: string;
  /** Owner identifier for the Service Catalog product, typically representing the team or organization */
  readonly owner: string;
  /** Display name for the Service Catalog product that will be visible to end users in the Service Catalog console */
  readonly name: string;
  /** IAM role name that will be used to launch the Service Catalog product */
  readonly launch_role_name?: string;
  /** Object containing named parameter configurations for the Service Catalog product */
  readonly parameters?: { [key: string]: MdaaServiceCatalogParameterConfig };

  readonly portfolio_bucket_name: string;
}

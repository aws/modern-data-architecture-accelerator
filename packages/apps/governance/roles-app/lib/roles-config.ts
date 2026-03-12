/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  FederationProps,
  GenerateManagedPolicyWithNameProps,
  GenerateRoleProps,
  GenerateRoleWithNameProps,
  SuppressionProps,
} from '@aws-mdaa/roles-l3-construct';
import { Schema } from 'ajv';
import { PolicyDocument } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';
import { ConfigurationElement } from '@aws-mdaa/config';

/**
 * Managed policy generation configuration with policy document and CDK Nag suppressions.
 *
 * Use cases: Custom IAM managed policy creation; Reusable permission sets
 *
 * AWS: IAM managed policy with custom policy document
 *
 * Validation: policyDocument required; suppressions and verbatimPolicyName optional
 */
export interface GenerateManagedPolicyConfig {
  /**
   * Policy document defining IAM permissions and statements.
   *
   * Use cases: IAM permission specification; Resource access control
   *
   * AWS: IAM managed policy document
   *
   * Validation: Required; must be valid IAM policy document structure
   */
  readonly policyDocument: ConfigurationElement;
  /**
   * CDK Nag suppressions for justified policy exceptions.
   *
   * Use cases: Controlled compliance rule suppression with documented justification
   *
   * AWS: CDK Nag suppression configuration for IAM policy compliance
   *
   * Validation: Optional; array of valid SuppressionProps
   */
  readonly suppressions?: SuppressionProps[];
  /**
   * When true, uses the exact policy name without MDAA naming prefixes.
   *
   * Use cases: Integration with existing naming schemes; Exact policy name requirements
   *
   * AWS: IAM managed policy naming control
   *
   * Validation: Optional; boolean
   * @default false
   */
  readonly verbatimPolicyName?: boolean;
}

export interface RolesConfigContents extends MdaaBaseConfigContents {
  /**
   * Map of role names to role generation configurations.
   * Each entry creates an IAM role with trust policies, persona-based permissions,
   * and optional managed policy attachments.
   *
   * Use cases: Service role automation; User role provisioning; Cross-account access roles
   *
   * AWS: IAM roles with trust policies and managed policy attachments
   *
   * Validation: Optional; keys are unique role names, values must be valid GenerateRoleProps
   */
  readonly generateRoles?: { [key: string]: GenerateRoleProps };
  /**
   * Map of policy names to managed policy generation configurations.
   * Each entry creates a reusable IAM managed policy with custom permissions.
   *
   * Use cases: Reusable permission sets; Standardized access policies
   *
   * AWS: IAM managed policies with custom policy documents
   *
   * Validation: Optional; keys are unique policy names, values must be valid GenerateManagedPolicyConfig
   */
  readonly generatePolicies?: { [key: string]: GenerateManagedPolicyConfig };
  /**
   * Map of federation names to SAML/OIDC identity provider configurations.
   * Enables federated access via existing providers (providerArn) or new ones (samlDoc).
   *
   * Use cases: SAML federation setup; SSO integration; External identity provider trust
   *
   * AWS: IAM SAML identity providers for federated authentication
   *
   * Validation: Optional; keys are unique federation names, values must be valid FederationProps
   */
  readonly federations?: { [key: string]: FederationProps };
  /**
   * When true, creates MDAA persona-based managed policies for common data platform roles
   * (data-admin, data-engineer, data-scientist).
   *
   * Use cases: Standardized role personas; Best-practice permission sets
   *
   * AWS: IAM managed policies for predefined data platform personas
   *
   * Validation: Optional; boolean
   * @default true
   */
  readonly createPersonaManagedPolicies?: boolean;
}

export class RolesConfigParser extends MdaaAppConfigParser<RolesConfigContents> {
  public readonly federations?: { [key: string]: FederationProps };
  public readonly generateRoles?: GenerateRoleWithNameProps[];
  public readonly generatePolicies?: GenerateManagedPolicyWithNameProps[];
  public readonly createPersonaManagedPolicies?: boolean;
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);

    this.federations = this.configContents.federations;
    this.generatePolicies = Object.entries(this.configContents.generatePolicies || {}).map(nameAndConfigPolicyProps => {
      const policyName = nameAndConfigPolicyProps[0];
      const configPolicyProps = nameAndConfigPolicyProps[1];
      const def: GenerateManagedPolicyWithNameProps = {
        name: policyName,
        policyDocument: PolicyDocument.fromJson(configPolicyProps.policyDocument),
        suppressions: configPolicyProps.suppressions,
        verbatimPolicyName: configPolicyProps.verbatimPolicyName,
      };
      return def;
    });
    this.generateRoles = Object.entries(this.configContents.generateRoles || {}).map(nameConfigGenerateRole => {
      return {
        ...{
          name: nameConfigGenerateRole[0],
        },
        ...nameConfigGenerateRole[1],
      };
    });
    this.createPersonaManagedPolicies = this.configContents.createPersonaManagedPolicies;
  }
}

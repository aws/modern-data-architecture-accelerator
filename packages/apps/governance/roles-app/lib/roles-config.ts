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
 * Q-ENHANCED-INTERFACE
 * Configuration interface for managed policy generation providing policy document and suppression management. Enables creation of IAM managed policies with custom policy documents, CDK Nag suppressions, and flexible naming conventions for compliant policy management.
 *
 * Use cases: Custom managed policy creation; Policy document management; CDK Nag suppression handling
 *
 * AWS: Creates AWS IAM managed policies with custom policy documents and compliance controls
 *
 * Validation: policyDocument is required; suppressions and verbatimPolicyName are optional
 */
export interface GenerateManagedPolicyConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Required policy document configuration element defining the IAM policy permissions and statements. Specifies the complete policy document with permissions, resources, and conditions for the managed policy creation.
   *
   * Use cases: IAM policy definition; Permission specification; Resource access control configuration
   *
   * AWS: AWS IAM managed policy document for permission and access control definition
   *
   * Validation: Must be valid ConfigurationElement; required; defines complete policy document and permissions
   **/
  readonly policyDocument: ConfigurationElement;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of CDK Nag suppression configurations for policy compliance management enabling controlled suppression of specific compliance rules. Provides mechanism to suppress specific CDK Nag rules when justified for policy requirements.
   *
   * Use cases: Compliance rule suppression; CDK Nag management; Justified policy exception handling
   *
   * AWS: CDK Nag suppression configuration for IAM policy compliance management
   *
   * Validation: Must be array of valid SuppressionProps if provided; enables controlled compliance rule suppression
   **/
  readonly suppressions?: SuppressionProps[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling policy naming convention enabling verbatim policy names without MDAA prefixes. When enabled, uses the exact policy name specified without applying MDAA naming conventions for specific naming requirements.
   *
   * Use cases: Exact policy naming; Custom naming requirements; Integration with existing policy naming schemes
   *
   * AWS: AWS IAM managed policy naming configuration for custom naming patterns
   *
   * Validation: Boolean value; controls policy naming convention application; enables verbatim naming when true
   **/
  readonly verbatimPolicyName?: boolean;
}

export interface RolesConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of named IAM roles to generate providing configuration including trust policies, permissions, and federation settings. Enables automated provisioning of compliant IAM roles for data platform services and users.
   *
   * Use cases: Service role automation; User role provisioning; Cross-account access role creation
   *
   * AWS: AWS IAM role creation with trust policies, permissions, and MDAA naming conventions
   *
   * Validation: Must be object with string keys and GenerateRoleProps values if provided; role names must be unique
   *   **/
  readonly generateRoles?: { [key: string]: GenerateRoleProps };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of named managed policies to generate with custom policy documents and suppression configurations. Enables creation of reusable permission sets for consistent access control across multiple roles and services.
   *
   * Use cases: Reusable permission sets; Standardized access policies; Custom permission templates
   *
   * AWS: AWS IAM managed policy creation with custom policy documents and MDAA naming
   *
   * Validation: Must be object with string keys and GenerateManagedPolicyConfig values if provided; policy names must be unique
   *   **/
  readonly generatePolicies?: { [key: string]: GenerateManagedPolicyConfig };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of federation configurations for SAML or OIDC identity provider integration. Enables federated access to AWS resources through external identity providers for centralized identity management and SSO capabilities.
   *
   * Use cases: SAML federation setup; OIDC provider integration; Centralized identity management
   *
   * AWS: AWS IAM identity provider configuration for federated access and SSO integration
   *
   * Validation: Must be object with string keys and FederationProps values if provided; federation names must be unique
   *   **/
  readonly federations?: { [key: string]: FederationProps };
  /**
   * Q-ENHANCED-PROPERTY
   * Optional flag controlling automatic generation of MDAA persona-based managed policies for common data platform roles. When enabled, creates standardized permission sets for data engineers, analysts, and administrators following MDAA best practices.
   *
   * Use cases: Standardized role personas; Best practice permissions; Simplified role management
   *
   * AWS: AWS IAM managed policy generation for common data platform role patterns
   *
   * Validation: Boolean value; defaults to true; enables automatic persona policy creation when true
   **/
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
        /**
         * Q-ENHANCED-PROPERTY
         * Required IAM policy document defining permissions and access controls for the managed policy. Provides the complete policy document structure including statements, actions, resources, and conditions for IAM permission management and access control.
         *
         * Use cases: Permission definition; Access control; IAM policy creation; Security management; Resource access control
         *
         * AWS: IAM managed policy document for permission and access control definition
         *
         * Validation: Must be valid IAM policy document JSON; required for policy creation and permission management
         */
        policyDocument: PolicyDocument.fromJson(configPolicyProps.policyDocument),
        suppressions: configPolicyProps.suppressions,
        /**
         * Q-ENHANCED-PROPERTY
         * Optional flag controlling whether to use the exact policy name without MDAA naming conventions for specific policy naming requirements. When enabled, uses the exact policy name specified without applying MDAA naming transformations for compliance or integration requirements.
         *
         * Use cases: Exact policy naming; Compliance requirements; Integration constraints; Specific naming needs; Policy name preservation
         *
         * AWS: IAM managed policy name control for exact policy naming without naming convention modifications
         *
         * Validation: Boolean value; defaults to false; enables exact policy naming when true
         */
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

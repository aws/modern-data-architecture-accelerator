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

export interface GenerateManagedPolicyConfig {
  readonly policyDocument: ConfigurationElement;
  readonly suppressions?: SuppressionProps[];
  readonly verbatimPolicyName?: boolean;
}

export interface RolesConfigContents extends MdaaBaseConfigContents {
  /**
   * List of roles to generate.
   */
  readonly generateRoles?: { [key: string]: GenerateRoleProps };
  /**
   * List of managed policies to generate.
   */
  readonly generatePolicies?: { [key: string]: GenerateManagedPolicyConfig };
  /**
   * List of federations which may be referenced by generated roles.
   */
  readonly federations?: { [key: string]: FederationProps };
  /**
   * If true (default), a set of Managed Policies will be generated by MDAA for use in pre-defined role personas
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

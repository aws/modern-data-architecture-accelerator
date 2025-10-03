/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { OpensearchDomainProps } from '@aws-mdaa/opensearch-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import * as configSchema from './config-schema.json';
import { ConfigurationElement } from '@aws-mdaa/config';

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for OpenSearch domain deployment extending base OpenSearch domain properties with configuration-driven access policies. Enables flexible access policy configuration through external configuration elements for dynamic policy management.
 *
 * Use cases: Dynamic access policy configuration; External policy management; Flexible domain access control
 *
 * AWS: Extends Amazon OpenSearch domain configuration with configurable access policies for flexible security management
 *
 * Validation: Inherits OpensearchDomainProps validation except accessPolicies; accessPolicies must be array of ConfigurationElement
 */
export interface OpensearchDomainConfig extends Omit<OpensearchDomainProps, 'accessPolicies'> {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of configuration elements defining access policies for the OpenSearch domain enabling dynamic policy management. Provides flexible access control configuration through external policy definitions for adaptable security management.
   *
   * Use cases: Dynamic access policy configuration; External policy management; Flexible security configuration
   *
   * AWS: Amazon OpenSearch domain access policies for IAM-based access control and security
   *
   * Validation: Must be array of valid ConfigurationElement objects; required; defines domain access control policies
   **/
  readonly accessPolicies: ConfigurationElement[];
}

export interface OpensearchConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required OpenSearch domain configuration defining all aspects of the domain deployment including security, networking, and access controls. Provides domain setup with VPC security, encryption, and configurable access policies.
   *
   * Use cases: Complete domain configuration; Security and networking setup; Access control and policy management; Search and analytics deployment
   *
   * AWS: Amazon OpenSearch domain configuration for complete deployment and security setup
   *
   * Validation: Must be valid OpensearchDomainConfig; required; defines all domain deployment characteristics
   *   **/
  readonly domain: OpensearchDomainConfig;
}

export class OpensearchConfigParser extends MdaaAppConfigParser<OpensearchConfigContents> {
  public readonly domain: OpensearchDomainProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.domain = {
      ...this.configContents.domain,
      ...{
        /**
         * Q-ENHANCED-PROPERTY
         * Required array of IAM policy statements for OpenSearch domain access control enabling fine-grained permissions and security management. Defines access policies that control who can access the OpenSearch domain and what operations they can perform for security and access management.
         *
         * Use cases: Access control; Security management; Permission definition; Domain security; Fine-grained access control
         *
         * AWS: Amazon OpenSearch Service domain access policies for IAM-based access control and security management
         *
         * Validation: Must be array of valid IAM policy statement objects; required for domain access control and security configuration
         */
        accessPolicies: this.configContents.domain.accessPolicies.map(x => PolicyStatement.fromJson(x)),
      },
    };
  }
}

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
 * Extends OpensearchDomainProps with config-driven access policies using ConfigurationElement
 * instead of PolicyStatementProps. Access policies are converted to PolicyStatement objects
 * at parse time via PolicyStatement.fromJson().
 *
 * Use cases: YAML-driven access policy configuration; Dynamic policy management
 *
 * AWS: OpenSearch domain access policies defined as JSON configuration elements
 *
 * Validation: Inherits OpensearchDomainProps validation; accessPolicies must be valid ConfigurationElement array
 */
export interface OpensearchDomainConfig extends Omit<OpensearchDomainProps, 'accessPolicies'> {
  /**
   * Access policy definitions as configuration elements (JSON objects).
   * Converted to IAM PolicyStatement objects at parse time via PolicyStatement.fromJson().
   *
   * Use cases: YAML-driven access policies; Dynamic policy configuration
   *
   * AWS: OpenSearch domain access policies (IAM policy statement JSON)
   *
   * Validation: Required; array of valid IAM policy statement JSON objects as ConfigurationElement
   */
  readonly accessPolicies: ConfigurationElement[];
}

export interface OpensearchConfigContents extends MdaaBaseConfigContents {
  /**
   * Complete OpenSearch domain configuration including cluster settings, networking, security,
   * and access controls. The module deploys a KMS-encrypted, VPC-bound OpenSearch domain with
   * security group controls, CloudWatch logging, and optional SAML SSO integration.
   *
   * Use cases: Search and analytics domain deployment; Log analysis infrastructure; Full-text search
   *
   * AWS: OpenSearch domain with KMS encryption, VPC networking, CloudWatch logs, and optional SAML SSO
   *
   * Validation: Required; valid OpensearchDomainConfig
   */
  readonly domain: OpensearchDomainConfig;
}

export class OpensearchConfigParser extends MdaaAppConfigParser<OpensearchConfigContents> {
  public readonly domain: OpensearchDomainProps;

  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.domain = {
      ...this.configContents.domain,
      ...{
        accessPolicies: this.configContents.domain.accessPolicies.map(x => PolicyStatement.fromJson(x)),
      },
    };
  }
}

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { FederationProps, NameAndFederationProps } from '@aws-mdaa/quicksight-namespace-l3-construct';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';

import * as configSchema from './config-schema.json';

export interface QuickSightNamespaceConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required map of federation names to federation configurations enabling identity provider integration with QuickSight namespaces. Provides identity federation setup for multi-tenant QuickSight environments with external identity system integration.
   *
   * Use cases: Identity federation; Multi-tenant QuickSight setup; External identity system integration
   *
   * AWS: Amazon QuickSight namespace federation for identity provider integration and multi-tenancy
   *
   * Validation: Must be object with string keys and valid FederationProps values; required; defines all federation configurations
   *   **/
  readonly federations: { [name: string]: FederationProps };

  /**
   * Q-ENHANCED-PROPERTY
   * Optional array of Glue resource names for QuickSight namespace access enabling data catalog integration and data source connectivity. Provides access to specific Glue databases and tables for business intelligence and data visualization operations.
   *
   * Use cases: Data catalog integration; Glue resource access; Data source connectivity for QuickSight analytics
   *
   * AWS: AWS Glue resource access permissions for QuickSight namespace data integration
   *
   * Validation: Must be array of valid Glue resource names if provided; enables data catalog access for analytics
   **/
  readonly glueResourceAccess?: string[];
}

export class QuickSightNamespaceConfigParser extends MdaaAppConfigParser<QuickSightNamespaceConfigContents> {
  public readonly federations: NameAndFederationProps[];

  public readonly glueResourceAccess?: string[];

  constructor(scope: Stack, props: MdaaAppConfigParserProps) {
    super(scope, props, configSchema as Schema);

    this.federations = Object.entries(this.configContents.federations || {}).map(nameAndFederationProps => {
      return {
        ...{ federationName: nameAndFederationProps[0] },
        ...nameAndFederationProps[1],
      };
    });
    this.glueResourceAccess = this.configContents.glueResourceAccess;
  }
}

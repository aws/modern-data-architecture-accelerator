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
   * Named federation configurations for identity provider integration with QuickSight namespaces.
   * Each federation creates IAM roles for SAML-based access, QuickSight namespace, users, and groups.
   * Roles are configured with QS user types (READER/AUTHOR) and group memberships.
   *
   * Use cases: SAML federation setup; Multi-tenant QuickSight namespaces; Group-based QS access
   *
   * AWS: QuickSight namespaces with IAM SAML federation roles and automated user/group management
   *
   * Validation: Required; map of string keys to FederationProps
   */
  readonly federations: { [name: string]: FederationProps };

  /**
   * Glue resource names (database/table patterns) to which namespace roles are granted IAM read access.
   * Used for QuickSight data source setup and validation.
   *
   * Use cases: Glue catalog data source access; Database/table pattern-based permissions
   *
   * AWS: IAM Glue resource access for QuickSight namespace roles
   *
   * Validation: Optional; array of Glue resource name patterns (e.g., 'database/my-db*')
   */
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

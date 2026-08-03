/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { Fn, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Derives the name of the Glue database that HealthLake auto-creates for a datastore.
 *
 * HealthLake names the database deterministically as
 *   `{datastore_name_underscored}_{datastore_id}_healthlake_view`
 * where the datastore name has its hyphens replaced with underscores. Because the
 * datastore ID is a CloudFormation token at synth time, the concatenation is built
 * with `Fn.join`/`Fn.split` rather than plain string ops.
 *
 * Exposed as a standalone helper so any construct that needs the derived name can
 * reuse it without instantiating {@link MdaaHealthLakeGlueDatabase}.
 *
 * @param datastoreName The MDAA-prefixed datastore name used when creating the datastore
 * @param datastoreId The datastore ID (CloudFormation token from CfnFHIRDatastore.attrDatastoreId)
 * @returns The derived Glue database name (a CloudFormation token)
 */
export function deriveHealthLakeGlueDatabaseName(datastoreName: string, datastoreId: string): string {
  const datastoreNameUnderscored = Fn.join('_', Fn.split('-', datastoreName));
  return Fn.join('_', [datastoreNameUnderscored, datastoreId, 'healthlake', 'view']);
}

/**
 * Properties for the MdaaHealthLakeGlueDatabase construct.
 */
export interface MdaaHealthLakeGlueDatabaseProps extends MdaaConstructProps {
  /** HealthLake datastore name (the MDAA-prefixed name used when creating the datastore) */
  readonly datastoreName: string;
  /** HealthLake datastore ID (CloudFormation token from CfnFHIRDatastore.attrDatastoreId) */
  readonly datastoreId: string;
}

/**
 * MDAA construct that derives the Glue database metadata for a HealthLake datastore.
 *
 * HealthLake automatically creates a Glue database when a datastore is provisioned.
 * The database name follows a deterministic convention:
 *   `{datastore_name_underscored}_{datastore_id}_healthlake_view`
 *
 * This construct derives the database name and catalog ID statically (no custom resource
 * or API call needed) and publishes them to SSM for cross-module consumption.
 *
 * The catalog ID is always the deploying account ID for same-account access.
 */
export class MdaaHealthLakeGlueDatabase extends Construct {
  /** The derived Glue database name */
  public readonly databaseName: string;
  /** The Glue catalog ID (account ID) */
  public readonly catalogId: string;

  constructor(scope: Construct, id: string, props: MdaaHealthLakeGlueDatabaseProps) {
    super(scope, id);

    // Derive the Glue database name using HealthLake's naming convention (see helper).
    this.databaseName = deriveHealthLakeGlueDatabaseName(props.datastoreName, props.datastoreId);

    // Catalog ID is always the account ID for same-account Glue access
    this.catalogId = Stack.of(this).account;

    // Publish SSM parameters and CloudFormation outputs.
    // resourceId is set to the raw datastore name so multiple datastores in a
    // single stack produce distinct SSM paths and CFN export names.
    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: MdaaResourceType.HEALTHLAKE,
      resourceId: props.datastoreName,
      name: 'glue-database-name',
      value: this.databaseName,
    });

    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: MdaaResourceType.HEALTHLAKE,
      resourceId: props.datastoreName,
      name: 'glue-catalog-id',
      value: this.catalogId,
    });
  }
}

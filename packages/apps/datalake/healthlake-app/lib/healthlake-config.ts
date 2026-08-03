/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import { HealthLakeDatastoreDefinition } from '@aws-mdaa/healthlake-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

/**
 * Configuration interface for the HealthLake FHIR R4 Datastore application.
 * Extends the base MDAA configuration with HealthLake-specific deployment settings.
 */
export interface HealthLakeConfigContents extends MdaaBaseConfigContents {
  /**
   * Customer-managed KMS key ARN for datastore encryption.
   * A single KMS key is shared across all datastores in this stack.
   * If not provided, a customer-managed KMS key is created automatically by the module.
   * HealthLake enforces CMK encryption — no unencrypted datastores are permitted.
   *
   * Validation: Optional; must be a valid fully-qualified KMS key ARN (not an alias) if provided.
   * Not constrained by a schema pattern so MDAA config references (e.g. `ssm-domain:`) that
   * resolve to CDK tokens are accepted; the resolved value is consumed by MdaaKmsKey.fromKeyArn.
   * @default auto-created customer-managed KMS key
   */
  readonly kmsKeyArn?: string;

  /**
   * Roles granted administer and use permissions on the auto-created KMS key.
   * Only applies when `kmsKeyArn` is omitted (the module creates the key). Recommended
   * whenever the module creates the key: because the key is retained on stack teardown,
   * a key created without a data-admin role is left manageable only via the account root.
   *
   * Validation: Optional; array of valid MdaaRoleRef
   * @default none
   */
  readonly dataAdminRoles?: MdaaRoleRef[];

  /**
   * Named map of HealthLake datastores to deploy. Each map key is the datastore name suffix
   * (combined with MDAA naming prefix); each value is the per-datastore configuration.
   * Uses the L3 construct's HealthLakeDatastoreDefinition directly so the app config stays
   * in lockstep with the L3 prop shape (a divergence would surface as a compile error).
   *
   * Validation: Required; at least one datastore entry must be provided.
   */
  readonly datastores: { [datastoreName: string]: HealthLakeDatastoreDefinition };
}

/**
 * Configuration parser for the HealthLake application.
 * Validates and parses YAML configuration files for HealthLake FHIR R4 Datastore deployment.
 */
export class HealthLakeConfigParser extends MdaaAppConfigParser<HealthLakeConfigContents> {
  /** Customer-managed KMS key ARN shared across all datastores (optional — auto-created if not provided) */
  public readonly kmsKeyArn?: string;

  /** Roles granted administer/use on the auto-created KMS key (only used when kmsKeyArn is omitted) */
  public readonly dataAdminRoles?: MdaaRoleRef[];

  /** Named map of HealthLake datastores */
  public readonly datastores: { [datastoreName: string]: HealthLakeDatastoreDefinition };

  /**
   * Creates a new HealthLakeConfigParser instance.
   * @param stack - The CDK stack context
   * @param props - Configuration parser properties including config file path
   */
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema);

    this.kmsKeyArn = this.configContents.kmsKeyArn;
    this.dataAdminRoles = this.configContents.dataAdminRoles;
    this.datastores = this.configContents.datastores;
  }
}

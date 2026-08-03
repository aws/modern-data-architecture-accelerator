/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MdaaHealthLakeDatastore,
  MdaaHealthLakeDataAccessRole,
  MdaaHealthLakeGlueDatabase,
  IdentityProviderConfiguration,
} from '@aws-mdaa/healthlake-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { Token } from 'aws-cdk-lib';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

/**
 * Per-datastore configuration for a HealthLake FHIR R4 datastore.
 *
 * The datastore's MDAA-prefixed name is derived from the map key under which
 * this definition is registered; do not include the datastore name here.
 */
export interface HealthLakeDatastoreDefinition {
  /**
   * S3 bucket ARN for HealthLake import/export data access for this datastore.
   * Must be a bare bucket ARN with no key/prefix suffix — a key-prefixed ARN
   * produces an invalid bucket-level IAM resource and fails at import/export time.
   * The bare-ARN shape is enforced at construction (skipped for unresolved
   * references, which validate at deploy time) rather than via a schema pattern,
   * so MDAA config references (e.g. `ssm-domain:`) that resolve to CDK tokens are
   * still accepted.
   */
  readonly rawBucketArn: string;
  /** Preload Synthea sample data into this datastore. @default false */
  readonly preloadSynthea?: boolean;
  /**
   * Identity provider configuration for SMART on FHIR authorization for this datastore.
   * When omitted, defaults to AWS_AUTH (IAM Signature v4).
   *
   * @default { authorizationStrategy: 'AWS_AUTH' }
   */
  readonly identityProviderConfiguration?: IdentityProviderConfiguration;
  /**
   * Explicitly permits a change to this datastore's name, kmsKeyArn (module-level),
   * identityProviderConfiguration, or preloadSynthea — fields whose change causes
   * AWS::HealthLake::FHIRDatastore to be replaced (deleted and recreated), risking data
   * loss. When false (default), such a change fails the deployment before the datastore
   * is touched. Set to true only when the replacement is intentional.
   * @default false
   */
  readonly acknowledgeReplacement?: boolean;
}

/**
 * L2 construct set created for a single named datastore entry.
 */
export interface HealthLakeDatastoreResources {
  /** The HealthLake datastore L2 construct */
  readonly datastore: MdaaHealthLakeDatastore;
  /** The data-access IAM role L2 construct */
  readonly dataAccessRole: MdaaHealthLakeDataAccessRole;
  /** The Glue database resolver L2 construct */
  readonly glueDatabase: MdaaHealthLakeGlueDatabase;
}

/**
 * Properties for the HealthLakeL3Construct.
 */
export interface HealthLakeL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * KMS key ARN used to encrypt all datastores.
   * If not provided, a customer-managed KMS key is created automatically and shared across datastores.
   * Must be a fully-qualified key ARN (not an alias) — HealthLake's SseConfiguration
   * requires a key ARN, and an invalid value fails at CreateFHIRDatastore. Not
   * constrained by a schema pattern so that MDAA config references (e.g. `ssm-domain:`)
   * which resolve to CDK tokens are accepted; the ARN is consumed by MdaaKmsKey.fromKeyArn.
   *
   * @default auto-created
   */
  readonly kmsKeyArn?: string;
  /**
   * Roles granted administer and use permissions on the auto-created KMS key.
   * Only applies when `kmsKeyArn` is omitted (the module creates the key). Because
   * `MdaaKmsKey` forces `RemovalPolicy.RETAIN`, a key created without any admin role
   * is retained after stack teardown with only an account-root key policy — leaving a
   * PHI-encrypting key that no normal role can administer. Supplying data-admin roles
   * here avoids that. When `kmsKeyArn` is provided, the caller owns the key policy and
   * this property is ignored.
   *
   * @default none (key created with only the default account-root policy)
   */
  readonly dataAdminRoles?: MdaaRoleRef[];
  /**
   * Named map of HealthLake datastores to deploy. Each map key is the datastore name suffix
   * (combined with MDAA naming prefix); each value is the per-datastore configuration.
   */
  readonly datastores: { [datastoreName: string]: HealthLakeDatastoreDefinition };
}

/**
 * MDAA HealthLake L3 Construct that composes L2 constructs into a single deployable unit.
 *
 * For each entry in `datastores`, provisions:
 * 1. A HealthLake FHIR R4 datastore with CMK encryption
 * 2. A least-privilege IAM data-access role for S3/KMS operations
 * 3. A Glue database resolver that derives the auto-created Glue DB metadata
 *
 * A single KMS key is shared across all datastores (either user-provided or auto-created).
 * The Glue database resolver has an explicit dependency on its datastore.
 */
export class HealthLakeL3Construct extends MdaaL3Construct {
  /** The KMS key used for encryption of all datastores (either user-provided or auto-created) */
  public readonly kmsKey: IKey;
  /** Map of datastore name (as provided in props.datastores) to its L2 construct set */
  public readonly datastoreResources: { [datastoreName: string]: HealthLakeDatastoreResources };

  constructor(scope: Construct, id: string, props: HealthLakeL3ConstructProps) {
    super(scope, id, props);

    const datastoreNames = Object.keys(props.datastores);
    if (datastoreNames.length === 0) {
      throw new Error('datastores map must contain at least one datastore definition.');
    }

    // Enforce SMART on FHIR deployment invariant per datastore here (not in the
    // app config parser) so it applies to every consumer of the L3. HealthLake
    // rejects SMART_ON_FHIR/_V1 datastores without an OAuth2 token-decoding Lambda ARN.
    for (const [name, def] of Object.entries(props.datastores)) {
      const idp = def.identityProviderConfiguration;
      if (idp) {
        const strategy = idp.authorizationStrategy;
        if ((strategy === 'SMART_ON_FHIR' || strategy === 'SMART_ON_FHIR_V1') && !idp.idpLambdaArn) {
          throw new Error(
            `datastores.${name}.identityProviderConfiguration.idpLambdaArn is required when authorizationStrategy is '${strategy}'. ` +
              'Provide the ARN of the Lambda function that decodes OAuth2 access tokens from your authorization server.',
          );
        }
      }
    }

    // Resolve or create a single shared KMS key for all datastores
    this.kmsKey = this.resolveKmsKey(props);

    this.datastoreResources = {};
    for (const [datastoreName, def] of Object.entries(props.datastores)) {
      // Use the raw datastore map key directly in construct ids (the standard MDAA
      // named-map pattern) so each construct/logical id stays aligned one-to-one with
      // the datastore identity. A lossy transform (e.g. stripping '-'/'_') would let
      // distinct keys like 'my-store' and 'my_store' collide to the same id.
      const datastore = new MdaaHealthLakeDatastore(this, `${datastoreName}-datastore`, {
        naming: props.naming,
        kmsKey: this.kmsKey,
        datastoreName: datastoreName,
        preloadSynthea: def.preloadSynthea,
        identityProviderConfiguration: def.identityProviderConfiguration,
        acknowledgeReplacement: def.acknowledgeReplacement,
      });

      // Fail fast on a key-prefixed S3 ARN. Bucket.fromBucketArn accepts one without
      // complaint and carries the prefix into bucketArn, producing an invalid bucket-level
      // resource in the data-access role's policy — the deploy succeeds but HealthLake
      // import/export later fails with AccessDenied and no pointer back to the config typo.
      // Skip unresolved tokens (e.g. an ssm-domain:/... config reference): their value is
      // only known at deploy time, so the literal shape check cannot run here.
      if (!Token.isUnresolved(def.rawBucketArn) && !/^arn:[^:]+:s3:::[^/]+$/.test(def.rawBucketArn)) {
        throw new Error(
          `datastores.${datastoreName}.rawBucketArn must be a bare S3 bucket ARN ` +
            `(arn:<partition>:s3:::<bucket-name>) with no key prefix; got '${def.rawBucketArn}'.`,
        );
      }

      const dataAccessRole = new MdaaHealthLakeDataAccessRole(this, `${datastoreName}-data-access-role`, {
        naming: props.naming,
        roleName: `${datastoreName}-data-access`,
        buckets: [Bucket.fromBucketArn(this, `${datastoreName}-raw-bucket`, def.rawBucketArn)],
        kmsKey: this.kmsKey,
        // Scope the role's trust policy to this specific datastore (confused-deputy protection).
        datastoreArn: datastore.datastoreArn,
      });

      const glueDatabase = new MdaaHealthLakeGlueDatabase(this, `${datastoreName}-glue-database`, {
        naming: props.naming,
        datastoreName: datastore.datastoreName,
        datastoreId: datastore.datastoreId,
      });
      // Wire dependency: Glue DB SSM params should only resolve after datastore is created
      glueDatabase.node.addDependency(datastore);

      this.datastoreResources[datastoreName] = { datastore, dataAccessRole, glueDatabase };
    }
  }

  /**
   * Resolve the single shared KMS key: import the caller-provided key ARN, or auto-create
   * a customer-managed key granting the data-admin roles administer+use so it stays
   * manageable (MdaaKmsKey forces RemovalPolicy.RETAIN, so a root-only key would survive
   * teardown with a policy no scoped role can administer).
   */
  private resolveKmsKey(props: HealthLakeL3ConstructProps): IKey {
    if (props.kmsKeyArn) {
      return MdaaKmsKey.fromKeyArn(this, 'imported-kms-key', props.kmsKeyArn);
    }

    const dataAdminRoleIds = props.roleHelper
      .resolveRoleRefsWithOrdinals(props.dataAdminRoles ?? [], 'DataAdmin')
      .map(role => role.id());
    // Fail fast when auto-creating the key with no admin roles: an empty dataAdminRoles
    // would create and retain a PHI-encrypting CMK whose key policy scopes administration
    // to nothing but the account root, leaving no dedicated role to manage it after teardown.
    if (dataAdminRoleIds.length === 0) {
      throw new Error(
        'dataAdminRoles must contain at least one role when a KMS key is auto-created ' +
          '(kmsKeyArn is not provided). The auto-created HealthLake CMK is retained on ' +
          'stack deletion and needs at least one scoped role able to administer it. ' +
          'Provide dataAdminRoles, or supply kmsKeyArn to use an externally-managed key.',
      );
    }
    return new MdaaKmsKey(this, 'kms-key', {
      naming: props.naming,
      alias: 'healthlake',
      keyAdminRoleIds: dataAdminRoleIds,
      keyUserRoleIds: dataAdminRoleIds,
    });
  }
}

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct';
import { MdaaResourceType } from '@aws-mdaa/naming';
import { RemovalPolicy } from 'aws-cdk-lib';
import { CfnFHIRDatastore } from 'aws-cdk-lib/aws-healthlake';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';
import { createDatastoreReplacementGuard } from './healthlake-datastore-replacement-guard';

/**
 * Authorization strategy for the HealthLake FHIR datastore.
 *
 * - `AWS_AUTH` — Default IAM Signature v4 authorization (service-to-service access)
 * - `SMART_ON_FHIR_V1` — SMART on FHIR V1 only (read/search and write permissions)
 * - `SMART_ON_FHIR` — SMART on FHIR V1 and V2 (create, read, update, delete, and search)
 */
export type AuthorizationStrategy = 'AWS_AUTH' | 'SMART_ON_FHIR_V1' | 'SMART_ON_FHIR';

/**
 * Identity provider configuration for SMART on FHIR authorization.
 *
 * Controls how clients authenticate to the HealthLake FHIR API. When using SMART on FHIR,
 * configure the authorization server metadata and optionally enable fine-grained access control.
 */
export interface IdentityProviderConfiguration {
  /**
   * The authorization strategy for the datastore. Required when
   * `IdentityProviderConfiguration` is provided. To use IAM-based access
   * (Signature v4), omit `IdentityProviderConfiguration` entirely on the
   * datastore — HealthLake defaults to `AWS_AUTH` at that level.
   *
   * - `AWS_AUTH` — IAM-based access (Signature v4). No additional configuration needed.
   * - `SMART_ON_FHIR_V1` — SMART on FHIR V1 with read/write permissions.
   * - `SMART_ON_FHIR` — Full SMART on FHIR V1+V2 with CRUD+search permissions.
   */
  readonly authorizationStrategy: AuthorizationStrategy;

  /**
   * Enable SMART on FHIR fine-grained authorization for scoped access per patient/resource.
   * Only applicable when authorizationStrategy is SMART_ON_FHIR or SMART_ON_FHIR_V1.
   *
   * @default false
   */
  readonly fineGrainedAuthorizationEnabled?: boolean;

  /**
   * ARN of the Lambda function that decodes the OAuth2 access token from your authorization server.
   * Required when using SMART on FHIR authorization strategies.
   */
  readonly idpLambdaArn?: string;

  /**
   * JSON string containing SMART App Launch metadata for your identity provider.
   * Optional per the HealthLake API; when provided, the following elements are
   * required by the SMART App Launch specification:
   *
   * - `authorization_endpoint` — URL to the OAuth2 authorization endpoint
   * - `grant_types_supported` — Array of grant types (`authorization_code`, `client_credentials`); at least one required
   * - `token_endpoint` — URL to the OAuth2 token endpoint
   * - `capabilities` — Array of SMART capabilities the authorization server supports
   * - `code_challenge_methods_supported` — Must include `S256`
   *
   * See https://docs.aws.amazon.com/healthlake/latest/APIReference/API_IdentityProviderConfiguration.html
   */
  readonly metadata?: string;
}

/**
 * Properties for the MdaaHealthLakeDatastore construct.
 */
export interface MdaaHealthLakeDatastoreProps extends MdaaConstructProps {
  /** Customer-managed KMS key for datastore encryption (enforced — no unencrypted datastores) */
  readonly kmsKey: IKey;
  /** Datastore name suffix (combined with MDAA naming prefix) */
  readonly datastoreName: string;
  /** Whether to preload Synthea sample data. @default false */
  readonly preloadSynthea?: boolean;
  /**
   * Identity provider configuration for SMART on FHIR authorization.
   * When omitted, defaults to AWS_AUTH (IAM Signature v4).
   *
   * @default { authorizationStrategy: 'AWS_AUTH' }
   */
  readonly identityProviderConfiguration?: IdentityProviderConfiguration;
  /**
   * Explicitly permits a change to a field that would cause AWS::HealthLake::FHIRDatastore
   * to be replaced (deleted and recreated) — datastoreName, kmsKey, identityProviderConfiguration,
   * or preloadSynthea. When false (default), such a change fails the deployment before the
   * datastore is touched. Set to true only when the replacement is intentional.
   * @default false
   */
  readonly acknowledgeReplacement?: boolean;
}

/**
 * MDAA-compliant HealthLake FHIR R4 Datastore construct.
 *
 * Wraps `CfnFHIRDatastore` L1 with:
 * - MDAA naming conventions applied to datastore name
 * - CMK encryption enforced (CUSTOMER_MANAGED_KMS_KEY, no opt-out)
 * - FHIR version R4
 * - Optional SMART on FHIR identity provider configuration
 * - Optional Synthea preloaded data
 * - SSM parameter outputs for cross-module consumption
 */
export class MdaaHealthLakeDatastore extends Construct {
  /** The HealthLake datastore ID */
  public readonly datastoreId: string;
  /** The HealthLake datastore ARN */
  public readonly datastoreArn: string;
  /** The HealthLake datastore endpoint URL */
  public readonly datastoreEndpoint: string;
  /** The resolved datastore name (MDAA-prefixed) as sent to CFN */
  public readonly datastoreName: string;
  /** The underlying CfnFHIRDatastore L1 resource */
  public readonly datastore: CfnFHIRDatastore;

  constructor(scope: Construct, id: string, props: MdaaHealthLakeDatastoreProps) {
    super(scope, id);

    this.datastoreName = props.naming
      .withResourceType(MdaaResourceType.HEALTHLAKE)
      .resourceName(props.datastoreName, 256);

    // Fails the deployment before the datastore is touched if a change to datastoreName,
    // kmsKey, identityProviderConfiguration, or preloadSynthea would cause CloudFormation
    // to replace (delete + recreate) the datastore. See RemovalPolicy.RETAIN comment below
    // for why RETAIN alone is not sufficient protection.
    const replacementGuard = createDatastoreReplacementGuard(this, 'ReplacementGuard', {
      naming: props.naming,
      datastoreName: this.datastoreName,
      kmsKeyArn: props.kmsKey.keyArn,
      identityProviderConfiguration: props.identityProviderConfiguration,
      preloadSynthea: props.preloadSynthea,
      acknowledgeReplacement: props.acknowledgeReplacement,
    });

    this.datastore = new CfnFHIRDatastore(this, 'FHIRDatastore', {
      datastoreName: this.datastoreName,
      datastoreTypeVersion: 'R4',
      sseConfiguration: {
        kmsEncryptionConfig: {
          cmkType: 'CUSTOMER_MANAGED_KMS_KEY',
          kmsKeyId: props.kmsKey.keyArn,
        },
      },
      ...(props.identityProviderConfiguration
        ? {
            identityProviderConfiguration: {
              authorizationStrategy: props.identityProviderConfiguration.authorizationStrategy,
              ...(props.identityProviderConfiguration.fineGrainedAuthorizationEnabled === undefined
                ? {}
                : {
                    fineGrainedAuthorizationEnabled:
                      props.identityProviderConfiguration.fineGrainedAuthorizationEnabled,
                  }),
              ...(props.identityProviderConfiguration.idpLambdaArn
                ? { idpLambdaArn: props.identityProviderConfiguration.idpLambdaArn }
                : {}),
              ...(props.identityProviderConfiguration.metadata
                ? { metadata: props.identityProviderConfiguration.metadata }
                : {}),
            },
          }
        : {}),
      ...(props.preloadSynthea
        ? {
            preloadDataConfig: {
              preloadDataType: 'SYNTHEA',
            },
          }
        : {}),
    });

    // Dependency ensures CloudFormation evaluates the guard's Update before attempting
    // any change to the datastore — if the guard fails, the datastore update never runs.
    this.datastore.node.addDependency(replacementGuard);

    // AWS::HealthLake::FHIRDatastore replaces (deletes + recreates) the datastore on any
    // update to DatastoreName, DatastoreTypeVersion, IdentityProviderConfiguration,
    // PreloadDataConfig, or SseConfiguration — all "Update requires: Replacement" per
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-healthlake-fhirdatastore.html.
    // RETAIN is defense-in-depth for the case where a replacement is intentionally
    // acknowledged (acknowledgeReplacement=true): the old datastore survives as an
    // orphaned resource rather than being deleted.
    this.datastore.applyRemovalPolicy(RemovalPolicy.RETAIN);

    this.datastoreId = this.datastore.attrDatastoreId;
    this.datastoreArn = this.datastore.attrDatastoreArn;
    this.datastoreEndpoint = this.datastore.attrDatastoreEndpoint;

    // Publish SSM parameters and CloudFormation outputs.
    // resourceId is set to the raw datastore name so multiple datastores in a
    // single stack produce distinct SSM paths and CFN export names.
    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: MdaaResourceType.HEALTHLAKE,
      resourceId: props.datastoreName,
      name: 'datastore-id',
      value: this.datastoreId,
    });

    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: MdaaResourceType.HEALTHLAKE,
      resourceId: props.datastoreName,
      name: 'datastore-arn',
      value: this.datastoreArn,
    });

    new MdaaParamAndOutput(this, {
      ...props,
      resourceType: MdaaResourceType.HEALTHLAKE,
      resourceId: props.datastoreName,
      name: 'datastore-endpoint',
      value: this.datastoreEndpoint,
    });
  }
}

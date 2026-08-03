/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps } from '@aws-mdaa/construct';
import { MdaaCustomResource, MdaaCustomResourceProps } from '@aws-mdaa/custom-constructs';
import { Duration } from 'aws-cdk-lib';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

/**
 * Properties compared across deploys to detect a HealthLake datastore replacement.
 * Mirrors the CloudFormation properties on AWS::HealthLake::FHIRDatastore whose
 * documented "Update requires: Replacement" behavior deletes and recreates the
 * datastore (and its FHIR data) on change.
 */
export interface DatastoreReplacementGuardProps extends MdaaConstructProps {
  /** MDAA-resolved datastore name as sent to CFN DatastoreName */
  readonly datastoreName: string;
  /** KMS key ARN used in SseConfiguration */
  readonly kmsKeyArn: string;
  /** IdentityProviderConfiguration, if any, serialized for comparison */
  readonly identityProviderConfiguration?: unknown;
  /** Whether PreloadDataConfig (Synthea) is set */
  readonly preloadSynthea?: boolean;
  /**
   * When true, permits a change to a guarded field to proceed (the datastore will be
   * replaced by CloudFormation). Use only when a replacement is intentional.
   * @default false
   */
  readonly acknowledgeReplacement?: boolean;
}

/**
 * Creates a Custom Resource that blocks CloudFormation updates which would cause
 * AWS::HealthLake::FHIRDatastore to replace (delete + recreate) the datastore.
 *
 * On Update, compares the previous and current values of datastoreName, kmsKeyArn,
 * identityProviderConfiguration, and preloadSynthea — all fields whose change triggers
 * CloudFormation replacement per
 * https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-healthlake-fhirdatastore.html.
 * On Create, CloudFormation has no prior state to diff against — but the guard itself
 * may be new to a stack whose datastore already exists (e.g. this module version was
 * just adopted). To catch that case, Create looks up any existing live datastore with
 * the same name via ListFHIRDatastores and diffs its live configuration the same way.
 * If a guarded field changed and acknowledgeReplacement is not set, the Custom
 * Resource fails, which fails the stack update before the datastore resource is
 * ever touched. The caller must addDependency the datastore on this resource so
 * CloudFormation resolves the guard before attempting the replacement.
 */
export function createDatastoreReplacementGuard(
  scope: Construct,
  id: string,
  props: DatastoreReplacementGuardProps,
): MdaaCustomResource {
  const crProps: MdaaCustomResourceProps = {
    resourceType: 'HealthLakeDatastoreReplacementGuard',
    code: Code.fromAsset(`${__dirname}/../src/lambda/datastore_replacement_guard`),
    runtime: Runtime.PYTHON_3_14,
    handler: 'datastore_replacement_guard.lambda_handler',
    naming: props.naming,
    pascalCaseProperties: false,
    handlerTimeout: Duration.seconds(30),
    handlerRolePolicyStatements: [
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['healthlake:ListFHIRDatastores'],
        resources: ['*'],
      }),
    ],
    handlerPolicySuppressions: [
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'healthlake:ListFHIRDatastores does not support resource-level permissions ' +
          '(https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonhealthlake.html). ' +
          'It is used only to detect a pre-existing datastore by name on Create; the guard never ' +
          'mutates HealthLake resources.',
      },
    ],
    handlerProps: {
      datastoreName: props.datastoreName,
      kmsKeyArn: props.kmsKeyArn,
      ...(props.identityProviderConfiguration
        ? { identityProviderConfiguration: stableStringify(props.identityProviderConfiguration) }
        : {}),
      preloadSynthea: String(props.preloadSynthea ?? false),
      acknowledgeReplacement: String(props.acknowledgeReplacement ?? false),
    },
  };

  return new MdaaCustomResource(scope, id, crProps);
}

/**
 * JSON.stringify with object keys sorted, so semantically identical
 * configuration always serializes to the same string regardless of
 * key insertion order — avoiding false-positive replacement detection.
 */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)));
    }
    return val;
  });
}

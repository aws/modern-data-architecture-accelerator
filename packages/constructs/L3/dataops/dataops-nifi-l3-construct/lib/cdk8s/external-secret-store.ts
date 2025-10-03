/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk8s from 'cdk8s';
import { Construct } from 'constructs';
import * as k8s from './imports/k8s';

export interface SecretStoreConstructProps {
  readonly storeName: string;
  readonly externalSecretsRoleArn: string;
  readonly awsRegion: string;
  readonly namespace?: string;
}

export class ExternalSecretStore extends Construct {
  public readonly secretStoreName: string;
  constructor(scope: Construct, id: string, props: SecretStoreConstructProps) {
    super(scope, id);

    const serviceAccount = new k8s.KubeServiceAccount(this, 'external-secrets-service-account', {
      metadata: {
        name: props.storeName,
        namespace: props.namespace,
        annotations: {
          'eks.amazonaws.com/role-arn': props.externalSecretsRoleArn,
        },
      },
    });

    const secretStore = new cdk8s.ApiObject(this, 'external-secret-store', {
      apiVersion: 'external-secrets.io/v1beta1',
      kind: 'SecretStore',
      /**
       * Q-ENHANCED-PROPERTY
       * Required Kubernetes resource metadata for SecretStore identification and organization within the NiFi cluster namespace. Provides essential metadata including name, namespace, and labels for proper Kubernetes resource management and External Secrets Operator configuration.
       *
       * Use cases: Kubernetes resource identification; Namespace organization; Resource metadata management; External Secrets configuration
       *
       * AWS: Kubernetes metadata for External Secrets Operator SecretStore resource identification and management
       *
       * Validation: Must include valid name and namespace; follows Kubernetes metadata conventions for resource identification
       */
      metadata: {
        /**
         * Q-ENHANCED-PROPERTY
         * Required name for the SecretStore Kubernetes resource enabling unique identification within the namespace. Provides the specific name used by External Secrets Operator to reference this SecretStore configuration for secret retrieval operations.
         *
         * Use cases: SecretStore identification; External secret references; Kubernetes resource naming; Configuration targeting
         *
         * AWS: Kubernetes SecretStore resource name for External Secrets Operator configuration and reference
         *
         * Validation: Must be valid Kubernetes resource name; required; follows DNS subdomain naming conventions
         */
        name: props.storeName,
        namespace: props.namespace,
      },
      spec: {
        provider: {
          aws: {
            service: 'SecretsManager',
            region: props.awsRegion,
            auth: {
              jwt: {
                serviceAccountRef: {
                  name: serviceAccount.name,
                },
              },
            },
          },
        },
      },
    });

    this.secretStoreName = secretStore.name;
  }
}

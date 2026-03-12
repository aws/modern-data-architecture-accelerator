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
      metadata: {
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

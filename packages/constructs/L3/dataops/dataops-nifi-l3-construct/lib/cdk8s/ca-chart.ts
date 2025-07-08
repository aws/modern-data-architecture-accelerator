/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk8s from 'cdk8s';
import { Construct } from 'constructs';

import { ExternalSecretStore } from './external-secret-store';

export interface CaIssuerChartProps extends cdk8s.ChartProps {
  readonly externalSecretsRoleArn: string;
  readonly awsRegion: string;
  readonly keystorePasswordSecretName: string;
  readonly rootClusterIssuerName: string;
  readonly caCertDuration: string;
  readonly caCertRenewBefore: string;
  readonly certKeyAlg: string;
  readonly certKeySize: number;
}

export class CaIssuerChart extends cdk8s.Chart {
  public readonly caIssuerName: string;
  constructor(scope: Construct, id: string, props: CaIssuerChartProps) {
    super(scope, id, props);

    const secretStoreChart = new ExternalSecretStore(this, 'secret-store', {
      storeName: 'ca-issuer-external-secret-store',
      ...props,
    });

    const keystorePasswordSecretTargetName = 'ca-keystore-secret'; //NOSONAR
    const keystorePasswordExternalSecret = new cdk8s.ApiObject(this, 'ca-external-secret', {
      apiVersion: 'external-secrets.io/v1beta1',
      kind: 'ExternalSecret',
      metadata: {
        name: 'ca-keystore-external-secret',
      },
      spec: {
        refreshInterval: '1h',
        secretStoreRef: {
          name: secretStoreChart.secretStoreName,
          kind: 'SecretStore',
        },
        target: {
          name: keystorePasswordSecretTargetName,
          creationPolicy: 'Owner',
        },
        data: [
          {
            secretKey: 'ca-keystore-password',
            remoteRef: {
              key: props.keystorePasswordSecretName,
            },
          },
        ],
      },
    });

    keystorePasswordExternalSecret.addDependency(secretStoreChart);

    const caSecretName = 'ca-cert-secret';
    const caCert = new cdk8s.ApiObject(this, 'ca-cert', {
      apiVersion: 'cert-manager.io/v1',
      kind: 'Certificate',
      metadata: {
        name: 'ca-cert',
      },
      spec: {
        isCA: true,
        commonName: 'ca',
        secretName: caSecretName,
        privateKey: {
          algorithm: props.certKeyAlg,
          encoding: 'PKCS1',
          size: props.certKeySize,
        },
        issuerRef: {
          group: 'awspca.cert-manager.io',
          name: props.rootClusterIssuerName,
          kind: 'AWSPCAClusterIssuer',
        },
        duration: props.caCertDuration,
        renewBefore: props.caCertRenewBefore,
        keystores: {
          jks: {
            create: true,
            passwordSecretRef: {
              name: keystorePasswordSecretTargetName,
              key: 'ca-keystore-password',
            },
          },
        },
      },
    });

    caCert.addDependency(keystorePasswordExternalSecret);

    const caIssuer = new cdk8s.ApiObject(this, 'ca', {
      apiVersion: 'cert-manager.io/v1',
      kind: 'ClusterIssuer',
      metadata: {
        name: 'ca-issuer',
      },
      spec: {
        ca: {
          secretName: caSecretName,
        },
      },
    });

    caIssuer.addDependency(caCert);

    this.caIssuerName = caIssuer.name;
  }
}

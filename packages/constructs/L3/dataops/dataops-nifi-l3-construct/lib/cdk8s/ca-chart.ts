/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk8s from 'cdk8s';
import { Construct } from 'constructs';

import { ExternalSecretStore } from './external-secret-store';


export interface CaIssuerChartProps extends cdk8s.ChartProps {
    readonly externalSecretsRoleArn: string
    readonly awsRegion: string
    readonly keystorePasswordSecretName: string
    readonly privateCa?: {
        arn: string,
        region: string
    }
    readonly caCertDuration: string
    readonly caCertRenewBefore: string
}

export class CaIssuerChart extends cdk8s.Chart {
    public readonly caIssuerName: string
    constructor( scope: Construct, id: string, props: CaIssuerChartProps ) {
        super( scope, id, props )

        const rootClusterIssuer = props.privateCa ?
            new cdk8s.ApiObject( this, 'private-ca-cluster-issuer', {
                apiVersion: "awspca.cert-manager.io/v1beta1",
                kind: "AWSPCAClusterIssuer",
                metadata: {
                    name: 'private-ca-cluster-issuer'
                },
                spec: {
                    arn: props.privateCa.arn,
                    region: props.privateCa.region
                }
            } ) :
            new cdk8s.ApiObject( this, 'self-signed-ca-cluster-issuer', {
                apiVersion: "cert-manager.io/v1",
                kind: "ClusterIssuer",
                metadata: {
                    name: 'self-signed-ca-cluster-issuer'
                },
                spec: {
                    selfSigned: {}
                }
            } )

        const secretStoreChart = new ExternalSecretStore( this, 'secret-store', props )

        const keystorePasswordSecretTargetName = 'ca-keystore-secret'
        new cdk8s.ApiObject( this, 'ca-external-secret', {
            apiVersion: "external-secrets.io/v1beta1",
            kind: "ExternalSecret",
            metadata: {
                name: 'ca-keystore-external-secret'
            },
            spec: {
                refreshInterval: "1h",
                secretStoreRef: {
                    name: secretStoreChart.secretStoreName,
                    kind: "SecretStore"
                },
                target: {
                    name: keystorePasswordSecretTargetName,
                    creationPolicy: "Owner"
                },
                data: [
                    {
                        secretKey: "keystore-password",
                        remoteRef: {
                            key: props.keystorePasswordSecretName
                        }
                    },
                ]
            }
        } )
        const caSecretName = 'ca-cert-secret'
        new cdk8s.ApiObject( this, 'ca-cert', {
            apiVersion: "cert-manager.io/v1",
            kind: "Certificate",
            metadata: {
                name: 'ca-cert'
            },
            spec: {
                isCA: true,
                commonName: 'ca',
                secretName: caSecretName,
                privateKey: {
                    algorithm: "RSA",
                    encoding: "PKCS1",
                    size: 4096
                },
                issuerRef: {
                    group: props.privateCa ? "awspca.cert-manager.io" : undefined,
                    name: rootClusterIssuer.name,
                    kind: rootClusterIssuer.kind
                },
                duration: props.caCertDuration,
                renewBefore: props.caCertRenewBefore,
                keystores: {
                    jks: {
                        create: true,
                        passwordSecretRef: {
                            name: keystorePasswordSecretTargetName,
                            key: "keystore-password"
                        }
                    }
                }
            }
        } )

        const caIssuer = new cdk8s.ApiObject( this, 'ca', {
            apiVersion: "cert-manager.io/v1",
            kind: "ClusterIssuer",
            metadata: {
                name: 'ca-issuer'
            },
            spec: {
                ca: {
                    secretName: caSecretName,
                }
            }
        } )

        this.caIssuerName = caIssuer.name

    }
}
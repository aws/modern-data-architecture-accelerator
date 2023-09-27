/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk8s from 'cdk8s';
import { Construct } from 'constructs';
import * as k8s from './imports/k8s';


export interface ExternalDnsChartProps extends cdk8s.ChartProps {
    readonly region: string
    readonly externalDnsRoleArn: string
}

export class ExternalDnsChart extends cdk8s.Chart {
    constructor( scope: Construct, id: string, props: ExternalDnsChartProps ) {
        super( scope, id, props )
        const serviceAccount = new k8s.KubeServiceAccount( this, 'service-account', {
            metadata: {
                name: 'external-dns',
                labels: {
                    'app.kubernetes.io/name': 'external-dns'
                },
                annotations: {
                    "eks.amazonaws.com/role-arn": props.externalDnsRoleArn
                }
            }
        } )
        const clusterRole = new k8s.KubeClusterRole( this, 'cluster-role', {
            metadata: {
                name: 'external-dns',
                labels: {
                    'app.kubernetes.io/name': 'external-dns'
                }
            },
            rules: [
                {
                    apiGroups: [ "" ],
                    resources: [ "services", "endpoints", "pods", "nodes" ],
                    verbs: [ "get", "watch", "list" ]
                },
                {
                    apiGroups: [ "extensions", "networking.k8s.io" ],
                    resources: [ "ingresses" ],
                    verbs: [ "get", "watch", "list" ],
                }
            ]
        } )
        new k8s.KubeClusterRoleBinding( this, 'cluster-role-binding', {
            metadata: {
                name: 'external-dns-viewer',
                labels: {
                    'app.kubernetes.io/name': 'external-dns'
                }
            },
            roleRef: {
                apiGroup: 'rbac.authorization.k8s.io',
                kind: 'ClusterRole',
                name: clusterRole.name
            },
            subjects: [ {
                kind: 'ServiceAccount',
                name: serviceAccount.name,
                namespace: this.namespace
            } ]
        } )
        new k8s.KubeDeployment( this, 'deployment', {
            metadata: {
                name: 'external-dns',
                labels: {
                    'app.kubernetes.io/name': 'external-dns'
                }
            },
            spec: {
                strategy: {
                    type: "Recreate"
                },
                selector: {
                    matchLabels: {
                        "app.kubernetes.io/name": "external-dns"
                    }
                },
                template: {
                    metadata: {
                        labels: {
                            "app.kubernetes.io/name": "external-dns"
                        }
                    },
                    spec: {
                        serviceAccountName: serviceAccount.name,
                        containers: [
                            {
                                name: "external-dns",
                                image: "registry.k8s.io/external-dns/external-dns:v0.13.5",
                                args: [
                                    "--source=service",
                                    "--source=ingress",
                                    "--provider=aws",
                                    "--policy=upsert-only",
                                    "--aws-zone-type=private",
                                    "--registry=txt",
                                    "--txt-owner-id=external-dns"
                                ],
                                env: [
                                    {
                                        name: "AWS_DEFAULT_REGION",
                                        value: props.region
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        } )
    }
}
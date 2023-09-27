/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk8s from 'cdk8s';
import { Construct } from 'constructs';
import * as k8s from './imports/k8s';
import { ExternalSecretStore } from './external-secret-store';
import * as fs from 'fs';

export interface EfsPersistentVolume {
    readonly efsFsId: string
    readonly efsApId: string
}

export interface ZookeeperChartProps extends cdk8s.ChartProps {
    readonly caIssuerName: string
    readonly hostedZoneName: string
    readonly awsRegion: string
    readonly externalSecretsRoleArn: string
    readonly keystorePasswordSecretName: string
    readonly efsPersistentVolumes: EfsPersistentVolume[]
    readonly efsStorageClassName: string
    readonly zookeeperCertDuration: string
    readonly zookeeperCertRenewBefore: string
}

export class ZookeeperChart extends cdk8s.Chart {
    public readonly zkConnectString: string
    private readonly props: ZookeeperChartProps
    constructor( scope: Construct, id: string, props: ZookeeperChartProps ) {
        super( scope, id, props );

        this.props = props

        const zkService = this.createZkService()
        const zkSecretName = this.createExternalSecrets( props )
        const zkSts = this.createZkStatefulSet( zkService, zkSecretName )
        this.createSslResources( zkService, zkSts, zkSecretName )
        this.zkConnectString = [ ...Array( 3 ).keys() ].map( i => {
            return `${ zkSts.name }-${ i }.${ this.namespace }.${ this.props.hostedZoneName }:2181`
        } ).join( "," )

    }

    public hash (): string {
        const json = JSON.stringify( this.toJson(), undefined, 2 )
        const stableJson = json.replace( /Token\[.*?\]/g, "Token" )
        const crypto = require( 'crypto' )
        const hash = crypto.createHash( 'sha1' )
            .update( stableJson ).digest( 'hex' );
        return hash
    }

    private createExternalSecrets (
        props: ZookeeperChartProps ): string {

        const secretStoreChart = new ExternalSecretStore( this, 'secret-store', props )

        const targetSecretName = 'zk-secret'

        new cdk8s.ApiObject( this, 'zk-external-secret', {
            apiVersion: "external-secrets.io/v1beta1",
            kind: "ExternalSecret",
            metadata: {
                name: 'zk-external-secret'
            },
            spec: {
                refreshInterval: "1h",
                secretStoreRef: {
                    name: secretStoreChart.secretStoreName,
                    kind: "SecretStore"
                },
                target: {
                    name: targetSecretName,
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
        return targetSecretName

    }

    private createSslResources ( zkService: k8s.KubeService, zkSts: k8s.KubeStatefulSet,
        zkSecretName: string ) {

        const nodeCerts = [ ...Array( 3 ).keys() ].map( i => {
            return new cdk8s.ApiObject( this, `${ zkSts.name }-${ i }-cert`, {
                apiVersion: "cert-manager.io/v1",
                kind: "Certificate",
                metadata: {
                    name: `${ zkSts.name }-${ i }-cert`
                },
                spec: {
                    isCA: false,
                    commonName: `${ zkSts.name }-${ i }.${ this.namespace }.${ this.props.hostedZoneName }`,
                    dnsNames: [
                        `${ zkSts.name }-${ i }.${ zkService.name }.${ this.namespace }.svc.cluster.local`,
                        `${ zkSts.name }-${ i }.${ this.namespace }.${ this.props.hostedZoneName }`
                    ],
                    secretName: `${ zkSts.name }-${ i }-ssl`,
                    privateKey: {
                        algorithm: "RSA",
                        encoding: "PKCS1",
                        size: 4096
                    },
                    usages: [
                        "server auth",
                        "client auth",
                    ],
                    issuerRef: {
                        name: this.props.caIssuerName,
                        kind: "ClusterIssuer"
                    },
                    keystores: {
                        jks: {
                            create: true,
                            passwordSecretRef: {
                                name: zkSecretName,
                                key: "keystore-password"
                            }
                        }
                    },
                    duration: this.props.zookeeperCertDuration,
                    renewBefore: this.props.zookeeperCertRenewBefore
                }
            } )
        } )
        return nodeCerts
    }
    private createZkService (): k8s.KubeService {

        const zookeeperServiceProps: k8s.KubeServiceProps = {
            metadata: {
                name: "zookeeper-svc",
                labels: {
                    app: "zookeeper"
                },
                annotations: {
                    "external-dns.alpha.kubernetes.io/hostname": `${ this.namespace }.${ this.props.hostedZoneName }`,
                    "external-dns.alpha.kubernetes.io/ttl": "60"
                }
            },
            spec: {
                ports: [
                    {
                        port: 2181,
                        name: "zookeeper"
                    }
                ],
                clusterIp: "None",
                selector: {
                    app: "zookeeper"
                }
            }
        }

        return new k8s.KubeService( this, 'zookeeper-svc', zookeeperServiceProps )
    }

    private createZkStatefulSet ( zookeeperService: k8s.KubeService, zkSecretName: string ): k8s.KubeStatefulSet {

        const nodeIds = [ ...Array( 3 ).keys() ]

        const nodeList = nodeIds.map( i => {
            return `zookeeper-${ i }`
        } )

        const sslBasePath = "/zookeeper-ssl"
        const zkDataDir = "/zookeeper-data"
        const zkInitBaseDir = "/zookeeper-init"

        const sslSecretVolumes: [ k8s.Volume, k8s.VolumeMount ][] = nodeList.map( hostname => {
            const volume: k8s.Volume = {
                name: `${ hostname }-ssl`,
                secret: {
                    secretName: `${ hostname }-ssl`
                }
            }
            const mount: k8s.VolumeMount = {
                mountPath: `${ sslBasePath }/${ hostname }`,
                name: volume.name
            }
            return [ volume, mount ]
        } )

        const zookeeperInitScriptsConfigMapData = Object.fromEntries( fs.readdirSync( `${ __dirname }/../../scripts/zookeeper` ).map( fileName => {
            console.log( `Reading zookeeper init script from ${ __dirname }/../../scripts/zookeeper/${ fileName }` )
            return [ fileName, fs.readFileSync( `${ __dirname }/../../scripts/zookeeper/${ fileName }`, 'utf-8' ) ]
        } ) )

        const zookeeperInitConfigMap = new k8s.KubeConfigMap( this, 'zookeeper-init-configmap', {
            metadata: {
                name: 'zookeeper-init-scripts'
            },
            data: zookeeperInitScriptsConfigMapData
        } )

        const zkConfigMap = this.createZkConfigMap( zookeeperService.name, sslBasePath, zkDataDir, nodeList )

        var volId = 0
        const pvs = this.props.efsPersistentVolumes.map( efsPvProps => {
            const pv = new k8s.KubePersistentVolume( this, `nifi-persistent-volume-${ volId }`, {
                metadata: {
                    name: `zookeeper-vol-${ efsPvProps.efsFsId }-${ efsPvProps.efsApId }`,
                    labels: {
                        app: "zookeeper"
                    }
                },
                spec: {
                    volumeMode: "Filesystem",
                    capacity: {
                        storage: k8s.Quantity.fromString( '60Gi' )
                    },
                    accessModes: [ "ReadWriteOnce" ],
                    persistentVolumeReclaimPolicy: "Retain",
                    storageClassName: this.props.efsStorageClassName,
                    csi: {
                        driver: "efs.csi.aws.com",
                        volumeHandle: `${ efsPvProps.efsFsId }::${ efsPvProps.efsApId }`
                    },
                    claimRef: {
                        name: `zookeeper-data-zookeeper-${ volId }`,
                        namespace: this.namespace
                    }
                }
            } )
            volId = volId + 1
            return pv
        } )

        const zookeeperStsProps: k8s.KubeStatefulSetProps = {
            metadata: {
                name: "zookeeper"
            },
            spec: {
                selector: {
                    matchLabels: {
                        "app": "zookeeper"
                    }
                },
                serviceName: zookeeperService.name,
                replicas: 3,
                updateStrategy: {
                    type: "RollingUpdate"
                },
                podManagementPolicy: "OrderedReady",
                persistentVolumeClaimRetentionPolicy: {
                    whenDeleted: "Retain",
                    whenScaled: "Delete"
                },
                volumeClaimTemplates: [ {
                    metadata: {
                        name: "zookeeper-data"
                    },
                    spec: {
                        selector: {
                            matchLabels: {
                                app: "nifi"
                            }
                        },
                        storageClassName: this.props.efsStorageClassName,
                        accessModes: [ "ReadWriteOnce" ],
                        resources: {
                            requests: {
                                storage: k8s.Quantity.fromString( '5Gi' )
                            }
                        }
                    }
                } ],
                template: {
                    metadata: {

                        labels: {
                            "app": "zookeeper"
                        }
                    },
                    spec: {
                        tolerations: [ {
                            key: "eks.amazonaws.com/compute-type",
                            value: "fargate"
                        } ],
                        securityContext: {
                            runAsUser: 1000,
                            runAsGroup: 1000,
                            fsGroup: 1000
                        },

                        volumes: [
                            {
                                name: "zookeeper-init-scripts",
                                configMap: {
                                    name: zookeeperInitConfigMap.name,
                                    defaultMode: 0o755
                                }
                            },
                            {
                                name: "zookeeper-config",
                                configMap: {
                                    name: zkConfigMap.name,
                                    defaultMode: 0o755,
                                }
                            },
                            ...sslSecretVolumes.map( x => x[ 0 ] )
                        ],
                        containers: [
                            {
                                name: 'zookeeper',
                                imagePullPolicy: "Always",
                                image: 'zookeeper:3.9.0',
                                ports: [ {
                                    containerPort: 2181,
                                    name: "client"
                                },
                                {
                                    containerPort: 2888,
                                    name: "server"
                                },
                                {
                                    containerPort: 3888,
                                    name: "leader-election"
                                } ],
                                resources: {
                                    requests: {
                                        memory: k8s.Quantity.fromString( "0.5Gi" ),
                                        cpu: k8s.Quantity.fromString( "250m" ),
                                    },
                                    limits: {
                                        memory: k8s.Quantity.fromString( "0.5Gi" ),
                                        cpu: k8s.Quantity.fromString( "250m" ),
                                    }
                                },
                                command: [ "bash",
                                    "-c",
                                    `${ zkInitBaseDir }/scripts/zookeeper_start.sh`
                                ],
                                env: [
                                    {
                                        name: "ZOO_DATA_DIR",
                                        value: zkDataDir
                                    },
                                    {
                                        name: "ZK_INIT_DIR",
                                        value: zkInitBaseDir
                                    },
                                    {
                                        name: "ZK_KEYSTORE_PASSWORD",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: zkSecretName,
                                                key: "keystore-password",
                                                optional: false
                                            }
                                        }
                                    },
                                    {
                                        name: "ZK_TRUSTSTORE_PASSWORD",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: zkSecretName,
                                                key: "keystore-password",
                                                optional: false
                                            }
                                        }
                                    }
                                ],
                                securityContext: {
                                    runAsUser: 1000
                                },
                                volumeMounts: [
                                    {
                                        name: "zookeeper-config",
                                        mountPath: `${ zkInitBaseDir }/conf`,
                                    },
                                    {
                                        name: "zookeeper-init-scripts",
                                        mountPath: `${ zkInitBaseDir }/scripts`,
                                    },
                                    {
                                        name: "zookeeper-data",
                                        mountPath: `${ zkDataDir }`,
                                    },
                                    ...sslSecretVolumes.map( x => x[ 1 ] )
                                ]
                            }
                        ]
                    }
                }
            }
        }

        const sts = new k8s.KubeStatefulSet( this, 'zookeeper-sts', zookeeperStsProps )
        pvs.forEach( pv => { sts.addDependency( pv ) } )
        return sts
    }

    private createZkConfigMap (
        zookeeperServiceName: string,
        sslBasePath: string,
        zookeeperDataDir: string,
        nodeList: string[],

    ): k8s.KubeConfigMap {

        const zookeeperBaseConfigMapData = Object.fromEntries( fs.readdirSync( `${ __dirname }/../../base_conf/zookeeper` ).map( fileName => {
            console.log( `Reading zookeeper base_conf/zookeeper from ${ __dirname }/../../base_conf/zookeeper/${ fileName }` )
            return [ fileName, fs.readFileSync( `${ __dirname }/../../base_conf/zookeeper/${ fileName }`, 'utf-8' ) ]
        } ) )

        const zookeeperConfigMap = new k8s.KubeConfigMap( this, 'zookeeper-configmap', {
            metadata: {
                name: 'zookeeper-config'
            },
            data: {
                ...zookeeperBaseConfigMapData,
                "zoo.cfg": this.updateZooCfg( zookeeperBaseConfigMapData[ "zoo.cfg" ], nodeList, zookeeperServiceName, sslBasePath, zookeeperDataDir ),

            }
        } )
        return zookeeperConfigMap
    }

    private updateZooCfg ( zooCfgData: string,
        nodeList: string[],
        zookeeperServiceName: string,
        sslBasePath: string,
        zookeeperDataDir: string ): string {

        const zooCfgMap: { [ key: string ]: string } = Object.fromEntries( zooCfgData.split( "\n" )
            .filter( line => {
                return !/^\s*#/.test( line ) && !/^\s*$/.test( line )
            } )
            .map( line => {
                return [ line.split( /=(.*)/s )[ 0 ], line.split( /=(.*)/s )[ 1 ] ]
            } ) )

        //perform config-driven overrides here
        var nodeIndex = 0
        nodeList.forEach( nodeName => {
            zooCfgMap[ `server.${ nodeIndex }` ] = `${ nodeName }.${ zookeeperServiceName }.${ this.namespace }.svc.cluster.local:2888:3888`
            nodeIndex = nodeIndex + 1
        } )

        zooCfgMap[ 'dataDir' ] = zookeeperDataDir

        zooCfgMap[ 'secureClientPort' ] = '2181'
        zooCfgMap[ 'serverCnxnFactory' ] = 'org.apache.zookeeper.server.NettyServerCnxnFactory'

        zooCfgMap[ 'sslQuorum' ] = 'true'
        zooCfgMap[ 'ssl.quorum.keyStore.type' ] = 'JKS'
        zooCfgMap[ 'ssl.quorum.keyStore.location' ] = `${ sslBasePath }/INIT_HOSTNAME/keystore.jks`
        zooCfgMap[ 'ssl.quorum.keyStore.password' ] = "INIT_KEYSTORE_PASSWORD"
        zooCfgMap[ 'ssl.quorum.trustStore.type' ] = 'JKS'
        zooCfgMap[ 'ssl.quorum.trustStore.location' ] = `${ sslBasePath }/INIT_HOSTNAME/truststore.jks`
        zooCfgMap[ 'ssl.quorum.trustStore.password' ] = "INIT_TRUSTSTORE_PASSWORD"

        zooCfgMap[ 'ssl.keyStore.type' ] = 'JKS'
        zooCfgMap[ 'ssl.keyStore.location' ] = `${ sslBasePath }/INIT_HOSTNAME/keystore.jks`
        zooCfgMap[ 'ssl.keyStore.password' ] = "INIT_KEYSTORE_PASSWORD"
        zooCfgMap[ 'ssl.trustStore.type' ] = 'JKS'
        zooCfgMap[ 'ssl.trustStore.location' ] = `${ sslBasePath }/INIT_HOSTNAME/truststore.jks`
        zooCfgMap[ 'ssl.trustStore.password' ] = "INIT_TRUSTSTORE_PASSWORD"

        const zooCfg = Object.entries( zooCfgMap ).map( entry => {
            return `${ entry[ 0 ] }=${ entry[ 1 ] }`
        } ).join( "\n" )
        return zooCfg
    }

}
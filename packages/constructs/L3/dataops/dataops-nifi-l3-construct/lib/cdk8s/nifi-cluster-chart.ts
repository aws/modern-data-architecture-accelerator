/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk8s from 'cdk8s';
import { Construct } from 'constructs';
import * as fs from 'fs';
import { NamedNifiRegistryClientProps, NifiAuthorization, NifiIdentityAuthorizationOptions, NifiPolicy } from '../nifi-options';
import { ExternalSecretStore } from './external-secret-store';
import * as k8s from './imports/k8s';


// nosemgrep
const { XMLParser, XMLBuilder } = require( "fast-xml-parser" );

export interface NodeResources {
    readonly memory: string
    readonly cpu: string
}

export interface EfsPersistentVolume {
    readonly efsFsId: string
    readonly efsApId: string
}

export interface NifiClusterChartSamlProps {
    readonly idpMetadataUrl: string
    readonly entityId: string
}

export interface NifiClusterChartProps extends cdk8s.ChartProps, NifiIdentityAuthorizationOptions {
    readonly nodeCount: number
    readonly nodeMemory: string
    readonly nodeCpu: string
    readonly nifiImageTag?: string
    readonly awsRegion: string
    readonly adminCredsSecretName: string
    readonly nifiSensitivePropSecretName: string
    readonly keystorePasswordSecretName: string
    readonly externalSecretsRoleArn: string
    readonly efsPersistentVolumes: EfsPersistentVolume[]
    readonly efsStorageClassName: string
    readonly saml?: NifiClusterChartSamlProps
    readonly caIssuerName: string
    readonly hostedZoneName: string
    readonly zkConnectString: string
    readonly zkRootNode: string
    readonly httpsPort: number
    readonly remotePort: number
    readonly clusterPort: number
    readonly nifiServiceRoleArn: string
    readonly nifiServiceRoleName: string
    readonly nifiCertDuration: string
    readonly nifiCertRenewBefore: string
    readonly certKeyAlg: string
    readonly certKeySize: number
    readonly nifiManagerImageUri: string
    readonly registryClients?: NamedNifiRegistryClientProps

}

export class NifiClusterChart extends cdk8s.Chart {

    private readonly props: NifiClusterChartProps
    public readonly nodeList: string[]
    public readonly domain: string

    private static DEFAULT_NIFI_IMAGE_TAG: string = '1.25.0'

    constructor( scope: Construct, id: string, props: NifiClusterChartProps ) {
        super( scope, id, props );

        this.props = props
        const nodeIds = [ ...Array( this.props.nodeCount ).keys() ]

        this.nodeList = nodeIds.map( i => {
            return `nifi-${ i }`
        } )

        this.domain = `${ this.namespace }.${ this.props.hostedZoneName }`

        const nifiService = this.createNifiService()
        const nifiSecretName = this.createExternalSecrets( props )
        const nifiSts = this.createNifiStatefulSet( nifiService, nifiSecretName )
        this.createSslResources( nifiService, nifiSts, nifiSecretName )

    }

    public hash (): string {
        const json = JSON.stringify( this.toJson(), undefined, 2 )
        const stableJson = json.replace( /Token\[.*?\]/g, "Token" )
        // nosemgrep
        const crypto = require( 'crypto' )
        const hash = crypto.createHash( 'sha1' ) //NOSONAR not used in senstive context
            .update( stableJson ).digest( 'hex' );
        return hash
    }

    private createExternalSecrets (
        props: NifiClusterChartProps ): string {

        const secretStoreChart = new ExternalSecretStore( this, 'secret-store', {
            storeName: "external-secret-store",
            ...props,
        } )

        const targetSecretName = 'nifi-secret'

        new cdk8s.ApiObject( this, 'nifi-external-secret', {
            apiVersion: "external-secrets.io/v1beta1",
            kind: "ExternalSecret",
            metadata: {
                name: 'nifi-external-secret'
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
                        secretKey: "admin-creds",
                        remoteRef: {
                            key: props.adminCredsSecretName
                        }
                    },
                    {
                        secretKey: "sensitive-props-key",
                        remoteRef: {
                            key: props.nifiSensitivePropSecretName
                        }
                    },
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

    private createSslResources ( nifiService: k8s.KubeService, nifiSts: k8s.KubeStatefulSet,
        nifiSecretName: string ) {

        const clusterManagerCert = new cdk8s.ApiObject( this, `manager-cert`, {
            apiVersion: "cert-manager.io/v1",
            kind: "Certificate",
            metadata: {
                name: `manager-cert`
            },
            spec: {
                isCA: false,
                commonName: `cluster-manager.${ this.namespace }`,
                secretName: `manager-ssl`,
                privateKey: {
                    algorithm: this.props.certKeyAlg,
                    encoding: "PKCS1",
                    size: this.props.certKeySize
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
                            name: nifiSecretName,
                            key: "keystore-password"
                        }
                    }
                },
                duration: this.props.nifiCertDuration,
                renewBefore: this.props.nifiCertRenewBefore,
            }
        })

        const nodeCerts = [ ...Array( this.props.nodeCount ).keys() ].map( i => {
            return new cdk8s.ApiObject( this, `${ nifiSts.name }-${ i }-cert`, {
                apiVersion: "cert-manager.io/v1",
                kind: "Certificate",
                metadata: {
                    name: `${ nifiSts.name }-${ i }-cert`
                },
                spec: {
                    isCA: false,
                    commonName: `${ nifiSts.name }-${ i }.${ this.namespace }`,
                    dnsNames: [
                        'localhost',
                        `${ nifiSts.name }-${ i }.${ nifiService.name }.${ this.namespace }.svc.cluster.local`,
                        `${ nifiSts.name }-${ i }.${ this.namespace }.${ this.props.hostedZoneName }`
                    ],
                    secretName: `${ nifiSts.name }-${ i }-ssl`,
                    privateKey: {
                        algorithm: this.props.certKeyAlg,
                        encoding: "PKCS1",
                        size: this.props.certKeySize
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
                                name: nifiSecretName,
                                key: "keystore-password"
                            }
                        }
                    },
                    duration: this.props.nifiCertDuration,
                    renewBefore: this.props.nifiCertRenewBefore,
                }
            } )
        } )
        return [clusterManagerCert,nodeCerts]
    }

    private createNifiService (): k8s.KubeService {
        const nifiServiceProps: k8s.KubeServiceProps = {
            metadata: {
                name: "nifi-svc",
                labels: {
                    app: "nifi"
                },
                annotations: {
                    "external-dns.alpha.kubernetes.io/hostname": `${ this.namespace }.${ this.props.hostedZoneName }`,
                    "external-dns.alpha.kubernetes.io/ttl": "60"
                }
            },
            spec: {
                ports: [
                    {
                        port: this.props.httpsPort,
                        name: "nifi-ui"
                    }
                ],
                clusterIp: "None",
                selector: {
                    app: "nifi"
                }
            }
        }

        return new k8s.KubeService( this, 'nifi-svc', nifiServiceProps )
    }

    private createNifiStatefulSet (
        nifiService: k8s.KubeService,
        nifiSecretName: string ): k8s.KubeStatefulSet {

        // nosemgrep
        const nifiInitScriptsConfigMapData = Object.fromEntries( fs.readdirSync( `${ __dirname }/../../scripts/nifi` ).map( fileName => {
            // nosemgrep
            return [ fileName, fs.readFileSync( `${ __dirname }/../../scripts/nifi/${ fileName }`, 'utf-8' ) ]
        } ) )

        const nifiInitConfigMap = new k8s.KubeConfigMap( this, 'nifi-init-configmap', {
            metadata: {
                name: 'nifi-init-scripts'
            },
            data: nifiInitScriptsConfigMapData
        } )

        let volId = 0
        const pvs = this.props.efsPersistentVolumes.map( efsPvProps => {
            const pv = new k8s.KubePersistentVolume( this, `nifi-persistent-volume-${ volId }`, {
                metadata: {
                    name: `nifi-vol-${ efsPvProps.efsFsId }-${ efsPvProps.efsApId }`,
                    labels: {
                        app: "nifi"
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
                        name: `nifi-data-nifi-${ volId }`,
                        namespace: this.namespace
                    }
                }
            } )
            volId = volId + 1
            return pv
        } )


        const sslBasePath = "/opt/nifi/ssl"
        const nifiDataDir = "/opt/nifi/data"
        const nifiInitBaseDir = "/opt/nifi/init"

        const nifiConfigMap = this.createNifiConfigMap(
            sslBasePath,
            nifiDataDir,
        )

        const sslSecretVolumes: [ k8s.Volume, k8s.VolumeMount ][] = this.nodeList.map( hostname => {
            const volume: k8s.Volume = {
                name: `${ hostname }-ssl`,
                secret: {
                    secretName: `${ hostname }-ssl`
                }
            }
            const mount: k8s.VolumeMount = {
                mountPath: `${ sslBasePath }/${ hostname }`,
                name: volume.name,
                readOnly: true
            }
            return [ volume, mount ]
        } )

        const serviceAccount = new k8s.KubeServiceAccount( this, 'nifi-service-account', {
            metadata: {
                name: 'nifi',
                annotations: {
                    "eks.amazonaws.com/role-arn": this.props.nifiServiceRoleArn
                }
            }
        } )

        const nifiStsProps: k8s.KubeStatefulSetProps = {
            metadata: {
                name: "nifi"
            },
            spec: {

                podManagementPolicy: "Parallel",
                serviceName: nifiService.name,
                replicas: this.props.nodeCount,
                selector: {
                    matchLabels: {
                        "app": "nifi"
                    }
                },
                persistentVolumeClaimRetentionPolicy: {
                    whenDeleted: "Retain",
                    whenScaled: "Delete"
                },
                volumeClaimTemplates: [ {
                    metadata: {
                        name: "nifi-data"
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
                            "app": "nifi"
                        }
                    },
                    spec: {
                        serviceAccountName: serviceAccount.name,
                        tolerations: [ {
                            key: "eks.amazonaws.com/compute-type",
                            value: "fargate"
                        } ],
                        dnsConfig: {
                            searches: [
                                `${ nifiService.name }.${ this.namespace }.svc.cluster.local`
                            ]
                        },
                        securityContext: {
                            runAsUser: 1000,
                            runAsGroup: 1000,
                            fsGroup: 1000
                        },
                        volumes: [
                            {
                                name: "nifi-init-scripts",
                                configMap: {
                                    name: nifiInitConfigMap.name,
                                    defaultMode: 0o755
                                }
                            },
                            {
                                name: "nifi-config",
                                configMap: {
                                    name: nifiConfigMap.name,
                                    defaultMode: 0o755,
                                }
                            },
                            {
                                name: "aws-creds",
                                emptyDir: {}
                            },
                            {
                                name: "pip-local",
                                emptyDir: {}
                            },
                            {
                                name: `manager-ssl`,
                                secret: {
                                    secretName: `manager-ssl`
                                }
                            },
                            ...sslSecretVolumes.map( x => x[ 0 ] )
                        ],
                        shareProcessNamespace: true,

                        containers: [
                            {
                                name: 'nifi-manager',
                                image: this.props.nifiManagerImageUri,
                                command: [ "sh",
                                    `/opt/nifi/scripts/nifi_manager.sh`
                                ],
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
                                env: [
                                    {
                                        name: "NIFI_APP",
                                        value: "nifi"
                                    },
                                    {
                                        name: "MANAGER_CONFIG",
                                        value: `${ nifiInitBaseDir}/conf/nifi_manager.json`
                                    },
                                    {
                                        name: "NIFI_INIT_DIR",
                                        value: nifiInitBaseDir
                                    },
                                    {
                                        name: "NIFI_DATA_DIR",
                                        value: nifiDataDir
                                    },
                                    {
                                        name: "NIFI_SENSITIVE_PROPS_KEY",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: nifiSecretName,
                                                key: "sensitive-props-key",
                                                optional: false
                                            }
                                        }
                                    },
                                    {
                                        name: "NIFI_SSL_BASE_PATH",
                                        value: sslBasePath
                                    },
                                    {
                                        name: "NIFI_ZOOKEEPER_CONNECT_STRING",
                                        value: this.props.zkConnectString
                                    },
                                    {
                                        name: "NIFI_KEYSTORE_PASSWORD",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: nifiSecretName,
                                                key: "keystore-password",
                                                optional: false
                                            }
                                        }
                                    },
                                    {
                                        name: "NIFI_TRUSTSTORE_PASSWORD",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: nifiSecretName,
                                                key: "keystore-password",
                                                optional: false
                                            }
                                        }
                                    },
                                    {
                                        name: "PYTHONUNBUFFERED",
                                        value: "1"
                                    },
                                    {
                                        name: "NIFI_NODES",
                                        value: this.nodeList.map( x => `CN=${ x }.${ this.namespace }.${ this.props.hostedZoneName }` ).join( "," )
                                    },

                                ],
                                volumeMounts: [
                                    {
                                        name: "nifi-config",
                                        mountPath: `${ nifiInitBaseDir }/conf`,
                                    },
                                    {
                                        name: "aws-creds",
                                        mountPath: `/home/nifi/.aws`,
                                    },
                                    {
                                        name: "pip-local",
                                        mountPath: `/.local`,
                                    },
                                    {
                                        name: "nifi-init-scripts",
                                        mountPath: `${ nifiInitBaseDir }/scripts`,
                                    },
                                    {
                                        name: "nifi-data",
                                        mountPath: `${ nifiDataDir }`,
                                    },
                                    {
                                        mountPath: `${ sslBasePath }/manager`,
                                        name: "manager-ssl",
                                        readOnly: true
                                    },
                                    ...sslSecretVolumes.map( x => x[ 1 ] )
                                ]
                            },
                            {
                                name: 'nifi',
                                image: `apache/nifi:${ this.props.nifiImageTag ?? NifiClusterChart.DEFAULT_NIFI_IMAGE_TAG }`,
                                ports: [ { containerPort: this.props.httpsPort } ],
                                command: [ "bash",
                                    "-c",
                                    `${ nifiInitBaseDir }/scripts/nifi_start.sh`
                                ],
                                resources: {
                                    requests: {
                                        memory: k8s.Quantity.fromString( this.props.nodeMemory ),
                                        cpu: k8s.Quantity.fromString( this.props.nodeCpu ),
                                    },
                                    limits: {
                                        memory: k8s.Quantity.fromString( this.props.nodeMemory ),
                                        cpu: k8s.Quantity.fromString( this.props.nodeCpu ),
                                    }
                                },
                                env: [
                                    {
                                        name: "NIFI_INIT_DIR",
                                        value: nifiInitBaseDir
                                    },
                                    {
                                        name: "NIFI_DATA_DIR",
                                        value: nifiDataDir
                                    },
                                    {
                                        name: "NIFI_HOME",
                                        value: "/opt/nifi/nifi-current"
                                    },
                                    {
                                        name: "NIFI_SENSITIVE_PROPS_KEY",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: nifiSecretName,
                                                key: "sensitive-props-key",
                                                optional: false
                                            }
                                        }
                                    },
                                    {
                                        name: "NIFI_SSL_BASE_PATH",
                                        value: sslBasePath
                                    },
                                    {
                                        name: "NIFI_ZOOKEEPER_CONNECT_STRING",
                                        value: this.props.zkConnectString
                                    },
                                    {
                                        name: "NIFI_KEYSTORE_PASSWORD",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: nifiSecretName,
                                                key: "keystore-password",
                                                optional: false
                                            }
                                        }
                                    },
                                    {
                                        name: "NIFI_TRUSTSTORE_PASSWORD",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: nifiSecretName,
                                                key: "keystore-password",
                                                optional: false
                                            }
                                        }
                                    }
                                ],
                                volumeMounts: [
                                    {
                                        name: "nifi-config",
                                        mountPath: `${ nifiInitBaseDir }/conf`,
                                    },
                                    {
                                        name: "nifi-init-scripts",
                                        mountPath: `${ nifiInitBaseDir }/scripts`,
                                    },
                                    {
                                        name: "nifi-data",
                                        mountPath: `${ nifiDataDir }`,
                                    },
                                    {
                                        name: "aws-creds",
                                        mountPath: `/home/nifi/.aws`,
                                    },
                                    ...sslSecretVolumes.map( x => x[ 1 ] )
                                ]
                            }
                        ]
                    }
                }
            }
        }
        const sts = new k8s.KubeStatefulSet( this, 'nifi-sts', nifiStsProps )
        pvs.forEach( pv => { sts.addDependency( pv ) } )
        return sts
    }

    private createNifiConfigMap (
        sslBasePath: string,
        nifiDataDir: string,
    ): k8s.KubeConfigMap {
        // nosemgrep
        const nifiBaseConfigMapData = Object.fromEntries( fs.readdirSync( `${ __dirname }/../../base_conf/nifi` ).map( fileName => {
            // nosemgrep
            return [ fileName, fs.readFileSync( `${ __dirname }/../../base_conf/nifi/${ fileName }`, 'utf-8' ) ]
        } ) )

        const nifiConfigMap = new k8s.KubeConfigMap( this, 'nifi-configmap', {
            metadata: {
                name: 'nifi-config'
            },
            data: {
                ...nifiBaseConfigMapData,
                "nifi.properties": this.updateNifiProperties( nifiBaseConfigMapData[ "nifi.properties" ], nifiDataDir ),
                "authorizers.xml": this.updateAuthorizers( nifiBaseConfigMapData[ "authorizers.xml" ],
                    nifiDataDir
                ),
                "nifi-cli.config": NifiClusterChart.createNifiToolkitConfig( sslBasePath, `INIT_HOSTNAME.${ this.namespace }.${ this.props.hostedZoneName }`, this.props.httpsPort ),
                "nifi_manager.json": JSON.stringify( this.createManagerConfig(), undefined, 2 ) 
            }
        } )
        return nifiConfigMap
    }

    private createManagerConfig() {
        const clusterNodeIdentities = this.nodeList.map( x => `CN=${ x }.${ this.namespace }.${ this.props.hostedZoneName }` )
        return  {
            'registry_clients': this.props.registryClients,
            ...this.createIdentityAuthorizationsConfig( clusterNodeIdentities)
        }
    }

    private createIdentityAuthorizationsConfig ( clusterNodeIdentities: string[] ) {

        const additionalGroups: { [ name: string ]: string[] } = {}

        additionalGroups[ 'cluster_nodes' ] = clusterNodeIdentities

        const clusterNodeAuthorizations: NifiAuthorization[] = [
            {
                policyResourcePattern: '/data/.*',
                actions: [
                    'READ', 'WRITE'
                ],
                groups: [ 'cluster_nodes' ]
            }
        ]

        additionalGroups[ "admins" ] = this.props.adminIdentities 

        const adminPolicies: NifiPolicy[] = [
            {
                resource: "/process-groups/ROOT_ID",
                action: "READ"
            },
            {
                resource: "/process-groups/ROOT_ID",
                action: "WRITE"
            }
        ]

        const adminAuthorizations: NifiAuthorization[] = [
            {
                policyResourcePattern: '/.*',
                actions: [
                    'READ', 'WRITE'
                ],
                groups: [ "admins" ]
            }
        ]

        if ( this.props.externalNodeIdentities ) {
            additionalGroups[ "external_nodes" ] = this.props.externalNodeIdentities
        }

        const externalNodeAuthorizations: NifiAuthorization[] = this.props.externalNodeIdentities ? [
            {
                policyResourcePattern: '/site-to-site',
                actions: [
                    'READ'
                ],
                groups: [ "external_nodes" ]
            },
            {
                policyResourcePattern: '/data-transfer/.*',
                actions: [
                    'READ', 'WRITE'
                ],
                groups: [ "external_nodes" ]
            }
        ] : []

        const remotePolicies: NifiPolicy[] = [
            {
                resource: '/site-to-site',
                action: 'READ'
            }
        ]

        return {
            identities: [ ...this.props.identities || [], ...clusterNodeIdentities, ...this.props.adminIdentities, ...this.props.externalNodeIdentities || [] ],
            groups: { ...this.props.groups || {}, ...additionalGroups },
            policies: [ ...this.props.policies || [], ...remotePolicies, ...adminPolicies ],
            authorizations: [ ...this.props.authorizations || [], ...clusterNodeAuthorizations, ...adminAuthorizations, ...externalNodeAuthorizations, ]
        }
       
    }

    private updateAuthorizers (
        authorizersData: string,
        nifiDataDir: string
    ): string {

        const authorizersXmlObj = new XMLParser( {
            ignoreAttributes: false,
            alwaysCreateTextNode: true
        } ).parse( authorizersData );

        interface XmlProp {
            "@_name": string,
            "#text": string
        }

        const userGroupProviderProps: XmlProp[] = authorizersXmlObj[ 'authorizers' ][ 'userGroupProvider' ][ 'property' ]
        userGroupProviderProps.forEach( prop => {
            if ( prop[ '@_name' ] == "Users File" ) {
                prop[ '#text' ] = `${ nifiDataDir }/users.xml`
            } else if ( prop[ '@_name' ] == "Initial User Identity 1" ) {
                prop[ '#text' ] = `CN=cluster-manager.${ this.namespace }`
            }
        } )
        const accessPolicyProviderProps: XmlProp[] = authorizersXmlObj[ 'authorizers' ][ 'accessPolicyProvider' ][ 'property' ]
        accessPolicyProviderProps.forEach( prop => {
            if ( prop[ '@_name' ] == "Authorizations File" ) {
                prop[ '#text' ] = `${ nifiDataDir }/authorizations.xml`
            } else if ( prop[ '@_name' ] == "Initial Admin Identity" ) {
                prop[ '#text' ] = `CN=cluster-manager.${ this.namespace }`
            }
        } )
        this.nodeList.forEach( node => {
            const fullNode = `${ node }.${ this.namespace }.${ this.props.hostedZoneName }`
            userGroupProviderProps.push( {
                "@_name": `Initial User Identity ${ fullNode }`,
                "#text": `CN=${ fullNode }`
            } )
            accessPolicyProviderProps.push( {
                "@_name": `Node Identity ${ fullNode }`,
                "#text": `CN=${ fullNode }`
            } )
        } )

        const authorizersXml: string = new XMLBuilder( {
            ignoreAttributes: false,
            format: true
        } ).build( authorizersXmlObj )

        return authorizersXml
    }

    private updateNifiProperties (
        nifiPropertiesData: string,
        nifiDataDir: string,

    ): string {

        const nifiPropertiesMap: { [ key: string ]: string } = Object.fromEntries( nifiPropertiesData.split( "\n" )
            .filter( line => {
                return !/^\s*#/.test( line ) && !/^\s*$/.test( line )
            } )
            .map( line => {
                return [ line.split( /=(.*)/s )[ 0 ], line.split( /=(.*)/s )[ 1 ] ]
            } ) )

        //perform config-driven overrides here

        nifiPropertiesMap[ 'nifi.sensitive.props.key' ] = "INIT_SENSITIVE_PROPS_KEY"

        nifiPropertiesMap[ 'nifi.flow.configuration.file' ] = `${ nifiDataDir }/flow.xml.gz`
        nifiPropertiesMap[ 'nifi.flow.configuration.json.file' ] = `${ nifiDataDir }/flow.json.gz`
        nifiPropertiesMap[ 'nifi.flow.configuration.archive.dir' ] = `${ nifiDataDir }/flow_archive/`
        nifiPropertiesMap[ 'nifi.templates.directory' ] = `${ nifiDataDir }/templates`
        nifiPropertiesMap[ 'nifi.database.directory' ] = `${ nifiDataDir }/database_repository`
        nifiPropertiesMap[ 'nifi.flowfile.repository.directory' ] = `${ nifiDataDir }/flowfile_repository`
        nifiPropertiesMap[ 'nifi.content.repository.directory.default' ] = `${ nifiDataDir }/content_repository`
        nifiPropertiesMap[ 'nifi.provenance.repository.directory.default' ] = `${ nifiDataDir }/provenance_repository`
        nifiPropertiesMap[ 'nifi.status.repository.questdb.persist.location' ] = `${ nifiDataDir }/status_repository`
        nifiPropertiesMap[ 'nifi.diagnostics.on.shutdown.directory' ] = `${ nifiDataDir }/diagnostics`

        nifiPropertiesMap[ 'nifi.web.https.port' ] = this.props.httpsPort.toString()
        nifiPropertiesMap[ 'nifi.web.https.host' ] = `INIT_HOSTNAME.${ this.namespace }.${ this.props.hostedZoneName }`
        nifiPropertiesMap[ 'nifi.web.http.port' ] = ""
        nifiPropertiesMap[ 'nifi.web.http.host' ] = ""

        nifiPropertiesMap[ 'nifi.remote.input.host' ] = `INIT_HOSTNAME.${ this.namespace }.${ this.props.hostedZoneName }`
        nifiPropertiesMap[ 'nifi.remote.input.socket.port' ] = this.props.remotePort.toString()
        nifiPropertiesMap[ 'nifi.remote.input.secure' ] = "true"

        nifiPropertiesMap[ 'nifi.cluster.protocol.is.secure' ] = "true"
        nifiPropertiesMap[ 'nifi.cluster.is.node' ] = "true"
        nifiPropertiesMap[ 'nifi.cluster.node.address' ] = `INIT_HOSTNAME.${ this.namespace }.${ this.props.hostedZoneName }`
        nifiPropertiesMap[ 'nifi.cluster.node.protocol.port' ] = this.props.clusterPort.toString()
        nifiPropertiesMap[ 'nifi.cluster.leader.election.implementation' ] = "CuratorLeaderElectionManager"
        nifiPropertiesMap[ 'nifi.cluster.flow.election.max.wait.time' ] = "150 secs"

        nifiPropertiesMap[ 'nifi.state.management.provider.cluster' ] = "zk-provider"
        nifiPropertiesMap[ 'nifi.zookeeper.connect.string' ] = this.props.zkConnectString
        nifiPropertiesMap[ 'nifi.zookeeper.root.node' ] = this.props.zkRootNode
        nifiPropertiesMap[ 'nifi.zookeeper.client.secure' ] = "true"

        nifiPropertiesMap[ 'nifi.security.keystore' ] = `${ nifiDataDir }/ssl/keystore/keystore.jks`
        nifiPropertiesMap[ 'nifi.security.keystoreType' ] = "JKS"
        nifiPropertiesMap[ 'nifi.security.keystorePasswd' ] = "INIT_KEYSTORE_PASSWORD" //NOSONAR placeholder value replaced at runtime
        nifiPropertiesMap[ 'nifi.security.keyPasswd' ] = "INIT_KEYSTORE_PASSWORD" //NOSONAR placeholder value replaced at runtime
        nifiPropertiesMap[ 'nifi.security.truststore' ] = `${ nifiDataDir }/ssl/truststore/truststore.jks`
        nifiPropertiesMap[ 'nifi.security.truststoreType' ] = "JKS"
        nifiPropertiesMap[ 'nifi.security.truststorePasswd' ] = "INIT_TRUSTSTORE_PASSWORD" //NOSONAR placeholder value replaced at runtime
        nifiPropertiesMap[ 'nifi.security.user.authorizer' ] = "managed-authorizer"
        nifiPropertiesMap[ 'nifi.security.autoreload.enabled' ] = "true"
        nifiPropertiesMap[ 'nifi.security.autoreload.interval' ] = "10 secs"

        if ( this.props.saml ) {
            nifiPropertiesMap[ 'nifi.security.user.saml.idp.metadata.url' ] = this.props.saml?.idpMetadataUrl
            nifiPropertiesMap[ 'nifi.security.user.saml.sp.entity.id' ] = this.props.saml?.entityId
            nifiPropertiesMap[ 'nifi.security.user.login.identity.provider' ] = ""
        } else {
            nifiPropertiesMap[ 'nifi.security.user.login.identity.provider' ] = "single-user-provider"
        }

        const nifiProperties = Object.entries( nifiPropertiesMap ).map( entry => {
            return `${ entry[ 0 ] }=${ entry[ 1 ] }`
        } ).join( "\n" )

        return nifiProperties

    }

    public static createNifiToolkitConfig ( sslBasePath: string,
        hostname: string,
        httpsPort: number

    ): string {

        const toolkitConfigMap: { [ key: string ]: string } = {
            baseUrl: `https://${ hostname  }:${ httpsPort.toString() }`,
            keystore: `${ sslBasePath }/manager/keystore.jks`,
            keystoreType: "JKS",
            keystorePasswd: "INIT_KEYSTORE_PASSWORD", //NOSONAR placeholder value replaced at runtime
            keyPasswd: "INIT_KEYSTORE_PASSWORD", //NOSONAR placeholder value replaced at runtime
            truststore: `${ sslBasePath }/manager/truststore.jks`,
            truststoreType: "JKS",
            truststorePasswd: "INIT_KEYSTORE_PASSWORD" //NOSONAR placeholder value replaced at runtime
        }

        const toolkitConfig = Object.entries( toolkitConfigMap ).map( entry => {
            return `${ entry[ 0 ] }=${ entry[ 1 ] }`
        } ).join( "\n" )

        return toolkitConfig
    }

}
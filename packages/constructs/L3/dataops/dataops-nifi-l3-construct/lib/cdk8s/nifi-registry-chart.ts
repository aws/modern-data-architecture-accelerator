/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as cdk8s from 'cdk8s';
import { Construct } from 'constructs';
import * as fs from 'fs';
import { NifiIdentityAuthorizationOptions } from '../nifi-options';
import { ExternalSecretStore } from './external-secret-store';
import * as k8s from './imports/k8s';
import { NifiClusterChart } from './nifi-cluster-chart';
const { XMLParser, XMLBuilder } = require( "fast-xml-parser" );

export interface NodeResources {
    readonly memory: string
    readonly cpu: string
}

export interface EfsPersistentVolume {
    readonly efsFsId: string
    readonly efsApId: string
}

export interface NifiRegistryChartSamlProps {
    readonly idpMetadataUrl: string
    readonly entityId: string
}

export interface NifiRegistryChartProps extends cdk8s.ChartProps, NifiIdentityAuthorizationOptions {

    readonly nifiRegistryImageTag?: string
    readonly awsRegion: string
    readonly adminCredsSecretName: string
    readonly keystorePasswordSecretName: string
    readonly externalSecretsRoleArn: string

    readonly efsPersistentVolume: EfsPersistentVolume
    readonly efsStorageClassName: string
    readonly caIssuerName: string
    readonly hostedZoneName: string
    readonly httpsPort: number

    readonly nifiRegistryServiceRoleArn: string
    readonly nifiRegistryServiceRoleName: string
    readonly nifiRegistryCertDuration: string
    readonly nifiRegistryCertRenewBefore: string
    readonly nifiNodeList?: string[]
    readonly certKeyAlg: string
    readonly certKeySize: number
    readonly nifiManagerImageUri: string
}

export class NifiRegistryChart extends cdk8s.Chart {

    private readonly props: NifiRegistryChartProps
    private static DEFAULT_NIFI_IMAGE_TAG: string = '1.23.2'

    private readonly hostname: string

    constructor( scope: Construct, id: string, props: NifiRegistryChartProps ) {
        super( scope, id, props );

        this.props = props
        this.hostname = `nifi-registry.${ this.props.hostedZoneName }`
        const nifiRegistryService = this.createNifiRegistryService()
        const nifiRegistrySecretName = this.createExternalSecrets( props )
        this.createNifiRegistryDeployment( nifiRegistryService, nifiRegistrySecretName )
        this.createSslResources( nifiRegistrySecretName )

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
        props: NifiRegistryChartProps ): string {

        const secretStoreChart = new ExternalSecretStore( this, 'secret-store', props )

        const targetSecretName = 'nifi-registry-secret'

        new cdk8s.ApiObject( this, 'nifi-registry-external-secret', {
            apiVersion: "external-secrets.io/v1beta1",
            kind: "ExternalSecret",
            metadata: {
                name: 'nifi-registry-external-secret'
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

    private createSslResources (
        nifiRegistrySecretName: string ) {

        const registryCert = new cdk8s.ApiObject( this, `nifi-registry-cert`, {
            apiVersion: "cert-manager.io/v1",
            kind: "Certificate",
            metadata: {
                name: `nifi-registry-cert`
            },
            spec: {
                isCA: false,
                commonName: `nifi-registry.${ this.props.hostedZoneName }`,
                dnsNames: [
                    'localhost',
                    `nifi-registry.${ this.props.hostedZoneName }`
                ],
                secretName: `nifi-registry-ssl`,
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
                            name: nifiRegistrySecretName,
                            key: "keystore-password"
                        }
                    }
                },
                duration: this.props.nifiRegistryCertDuration,
                renewBefore: this.props.nifiRegistryCertRenewBefore,
            }
        } )

        const registryManagerCert = new cdk8s.ApiObject( this, `nifi-registry-manager-cert`, {
            apiVersion: "cert-manager.io/v1",
            kind: "Certificate",
            metadata: {
                name: `nifi-registry-manager-cert`
            },
            spec: {
                isCA: false,
                commonName: `nifi-registry-manager`,
                secretName: `nifi-registry-manager-ssl`,
                privateKey: {
                    algorithm: this.props.certKeyAlg,
                    encoding: "PKCS1",
                    size: this.props.certKeySize
                },
                usages: [
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
                            name: nifiRegistrySecretName,
                            key: "keystore-password"
                        }
                    }
                },
                duration: this.props.nifiRegistryCertDuration,
                renewBefore: this.props.nifiRegistryCertRenewBefore,
            }
        } )
        return [ registryManagerCert, registryCert ]
    }

    private createNifiRegistryService (): k8s.KubeService {
        const nifiRegistryServiceProps: k8s.KubeServiceProps = {
            metadata: {
                name: "nifi-registry-svc",
                labels: {
                    app: "nifi-registry"
                },
                annotations: {
                    "external-dns.alpha.kubernetes.io/hostname": `nifi-registry.${ this.props.hostedZoneName }`,
                    "external-dns.alpha.kubernetes.io/ttl": "60"
                }
            },
            spec: {
                ports: [
                    {
                        port: this.props.httpsPort,
                        name: "nifi-registry-ui"
                    }
                ],
                clusterIp: "None",
                selector: {
                    app: "nifi-registry"
                }
            }
        }

        return new k8s.KubeService( this, 'nifi-registry-svc', nifiRegistryServiceProps )
    }

    private createNifiRegistryDeployment (
        nifiRegistryService: k8s.KubeService,
        nifiRegistrySecretName: string ): k8s.KubeStatefulSet {

        const nifiRegistryInitScriptsConfigMapData = Object.fromEntries( fs.readdirSync( `${ __dirname }/../../scripts/nifi/` ).map( fileName => {
            return [ fileName, fs.readFileSync( `${ __dirname }/../../scripts/nifi/${ fileName }`, 'utf-8' ) ]
        } ) )

        const nifiRegistryInitConfigMap = new k8s.KubeConfigMap( this, 'nifi-registry-init-configmap', {
            metadata: {
                name: 'nifi-registry-init-scripts'
            },
            data: nifiRegistryInitScriptsConfigMapData
        } )

        const persistentVolumeClaim = new k8s.KubePersistentVolumeClaim( this, `nifi-registry-persistent-volume-claim`, {
            metadata: {
                name: 'nifi-registry-data-pvc'
            },
            spec: {
                storageClassName: this.props.efsStorageClassName,
                accessModes: [ 'ReadWriteOnce' ],
                resources: {
                    requests: {
                        storage: k8s.Quantity.fromString( "3Gi" )
                    }
                }
            }
        } )

        const persistentVolume = new k8s.KubePersistentVolume( this, `nifi-registry-persistent-volume`, {
            metadata: {
                name: `nifi-registry-vol-${ this.props.efsPersistentVolume.efsFsId }-${ this.props.efsPersistentVolume.efsApId }`,
                labels: {
                    app: "nifi-registry"
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
                    volumeHandle: `${ this.props.efsPersistentVolume.efsFsId }::${ this.props.efsPersistentVolume.efsApId }`
                },
                claimRef: {
                    name: persistentVolumeClaim.name,
                    namespace: this.namespace
                }
            }
        } )

        const sslBasePath = "/opt/nifi-registry/ssl"
        const nifiRegistryDataDir = "/opt/nifi-registry/data"
        const nifiRegistryInitBaseDir = "/opt/nifi-registry/init"

        const nifiRegistryConfigMap = this.createRegistryConfigMap(
            sslBasePath,
            nifiRegistryDataDir
        )

        const serviceAccount = new k8s.KubeServiceAccount( this, 'nifi-registry-service-account', {
            metadata: {
                name: 'nifi-registry',
                annotations: {
                    "eks.amazonaws.com/role-arn": this.props.nifiRegistryServiceRoleArn
                }
            }
        } )

        const nifiRegistryDeploymentProps: k8s.KubeDeploymentProps = {
            metadata: {
                name: "nifi-registry"
            },
            spec: {
                selector: {
                    matchLabels: {
                        "app": "nifi-registry"
                    }
                },
                replicas: 1,
                template: {
                    metadata: {
                        labels: {
                            "app": "nifi-registry"
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
                                `${ nifiRegistryService.name }.${ this.namespace }.svc.cluster.local`
                            ]
                        },
                        securityContext: {
                            runAsUser: 1000,
                            runAsGroup: 1000,
                            fsGroup: 1000
                        },
                        volumes: [
                            {
                                name: "nifi-registry-init-scripts",
                                configMap: {
                                    name: nifiRegistryInitConfigMap.name,
                                    defaultMode: 0o755
                                }
                            },
                            {
                                name: "nifi-registry-config",
                                configMap: {
                                    name: nifiRegistryConfigMap.name,
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
                                name: `nifi-registry-ssl`,
                                secret: {
                                    secretName: `nifi-registry-ssl`
                                }
                            },
                            {
                                name: `nifi-registry-manager-ssl`,
                                secret: {
                                    secretName: `nifi-registry-manager-ssl`
                                }
                            },
                            {
                                name: 'nifi-registry-data',
                                persistentVolumeClaim: {
                                    claimName: persistentVolumeClaim.name
                                }
                            }
                        ],
                        shareProcessNamespace: true,

                        containers: [
                            {
                                name: 'nifi-registry-manager',
                                image: this.props.nifiManagerImageUri,
                                command: [ "sh",
                                    `/opt/nifi/scripts/nifi_registry_manager.sh`
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
                                        value: "registry"
                                    },
                                    {
                                        name: "IDENTITIES_AUTHORIZATIONS_CONF",
                                        value: `${ nifiRegistryInitBaseDir }/conf/registry_identities_authorizations.json`
                                    },
                                    {
                                        name: "NIFI_INIT_DIR",
                                        value: nifiRegistryInitBaseDir
                                    },
                                    {
                                        name: "PYTHONUNBUFFERED",
                                        value: "1"
                                    },
                                    {
                                        name: "NIFI_DATA_DIR",
                                        value: nifiRegistryDataDir
                                    },
                                    {
                                        name: "NIFI_SSL_BASE_PATH",
                                        value:`${sslBasePath}/registry`
                                    },
                                    {
                                        name: "NIFI_CERT_NAME",
                                        value: "nifi-registry"
                                    },
                                    {
                                        name: "NIFI_NODES",
                                        value: this.props.nifiNodeList?.map( x => `CN=${ x }` ).join( "," )
                                    },
                                    {
                                        name: "NIFI_KEYSTORE_PASSWORD",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: nifiRegistrySecretName,
                                                key: "keystore-password",
                                                optional: false
                                            }
                                        }
                                    },
                                    {
                                        name: "NIFI_TRUSTSTORE_PASSWORD",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: nifiRegistrySecretName,
                                                key: "keystore-password",
                                                optional: false
                                            }
                                        }
                                    }
                                ],
                                volumeMounts: [
                                    {
                                        name: "nifi-registry-config",
                                        mountPath: `${ nifiRegistryInitBaseDir }/conf`,
                                    },
                                    {
                                        name: "aws-creds",
                                        mountPath: `/home/nifi/.aws`,
                                    },
                                    {
                                        name: "nifi-registry-init-scripts",
                                        mountPath: `${ nifiRegistryInitBaseDir }/scripts`,
                                    },
                                    {
                                        name: "nifi-registry-data",
                                        mountPath: `${ nifiRegistryDataDir }`,
                                    },
                                    {
                                        mountPath: `${ sslBasePath }/manager`,
                                        name: `nifi-registry-manager-ssl`,
                                        readOnly: true
                                    },
                                    {
                                        mountPath: `${ sslBasePath }/registry`,
                                        name: 'nifi-registry-ssl',
                                        readOnly: true
                                    }
                                ]
                            },
                            {
                                name: 'nifi-registry',
                                image: `apache/nifi-registry:${ this.props.nifiRegistryImageTag ?? NifiRegistryChart.DEFAULT_NIFI_IMAGE_TAG }`,
                                ports: [ { containerPort: this.props.httpsPort } ],
                                command: [ "bash",
                                    "-c",
                                    `${ nifiRegistryInitBaseDir }/scripts/nifi_registry_start.sh`
                                ],
                                resources: {
                                    requests: {
                                        memory: k8s.Quantity.fromString( "1Gi" ),
                                        cpu: k8s.Quantity.fromString( "500m" ),
                                    },
                                    limits: {
                                        memory: k8s.Quantity.fromString( "1Gi" ),
                                        cpu: k8s.Quantity.fromString( "500m" ),
                                    }
                                },
                                env: [
                                    {
                                        name: "NIFI_INIT_DIR",
                                        value: nifiRegistryInitBaseDir
                                    },
                                    {
                                        name: "NIFI_DATA_DIR",
                                        value: nifiRegistryDataDir
                                    },
                                    {
                                        name: "NIFI_HOME",
                                        value: "/opt/nifi-registry/nifi-registry-current"
                                    },
                                    {
                                        name: "NIFI_SSL_BASE_PATH",
                                        value: sslBasePath
                                    },
                                    {
                                        name: "NIFI_KEYSTORE_PASSWORD",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: nifiRegistrySecretName,
                                                key: "keystore-password",
                                                optional: false
                                            }
                                        }
                                    },
                                    {
                                        name: "NIFI_TRUSTSTORE_PASSWORD",
                                        valueFrom: {
                                            secretKeyRef: {
                                                name: nifiRegistrySecretName,
                                                key: "keystore-password",
                                                optional: false
                                            }
                                        }
                                    }
                                ],
                                volumeMounts: [
                                    {
                                        name: "nifi-registry-config",
                                        mountPath: `${ nifiRegistryInitBaseDir }/conf`,
                                    },
                                    {
                                        name: "nifi-registry-init-scripts",
                                        mountPath: `${ nifiRegistryInitBaseDir }/scripts`,
                                    },
                                    {
                                        name: "nifi-registry-data",
                                        mountPath: `${ nifiRegistryDataDir }`,
                                    },
                                    {
                                        name: "aws-creds",
                                        mountPath: `/home/nifi/.aws`,
                                    },
                                    {
                                        mountPath: `${ sslBasePath }`,
                                        name: 'nifi-registry-ssl',
                                        readOnly: true
                                    }
                                ]
                            }
                        ]
                    }
                }
            }
        }
        const sts = new k8s.KubeDeployment( this, 'nifi-registry-sts', nifiRegistryDeploymentProps )
        sts.addDependency( persistentVolume )
        sts.addDependency( persistentVolumeClaim )
        return sts
    }

    private createRegistryConfigMap (
        sslBasePath: string,
        nifiRegistryDataDir: string
    ): k8s.KubeConfigMap {

        const nifiRegistryBaseConfigMapData = Object.fromEntries( fs.readdirSync( `${ __dirname }/../../base_conf/nifi-registry` ).map( fileName => {
            return [ fileName, fs.readFileSync( `${ __dirname }/../../base_conf/nifi-registry/${ fileName }`, 'utf-8' ) ]
        } ) )
        const clusterNodeIdentities = this.props.nifiNodeList?.map( x => `CN=${ x }.${ this.namespace }.${ this.props.hostedZoneName }` )
        const nifiRegistryConfigMap = new k8s.KubeConfigMap( this, 'nifi-registry-configmap', {
            metadata: {
                name: 'nifi-registry-config'
            },
            data: {
                ...nifiRegistryBaseConfigMapData,
                "nifi-registry.properties": this.updateNifiProperties( nifiRegistryBaseConfigMapData[ "nifi-registry.properties" ], nifiRegistryDataDir ),
                "authorizers.xml": this.updateAuthorizers( nifiRegistryBaseConfigMapData[ "authorizers.xml" ],
                    nifiRegistryDataDir
                ),
                "registry_identities_authorizations.json": NifiClusterChart.createIdentityAuthorizations( clusterNodeIdentities || [], this.props ),
                "nifi-reg-cli.config": NifiClusterChart.createNifiToolkitConfig( sslBasePath, this.hostname, this.props.httpsPort),
            }
        } )
        return nifiRegistryConfigMap
    }



    private updateAuthorizers (
        authorizersData: string,
        nifiRegistryDataDir: string
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
                prop[ '#text' ] = `${ nifiRegistryDataDir }/users.xml`
            } else if ( prop[ '@_name' ] == "Initial User Identity 1" ) {
                prop[ '#text' ] = `CN=nifi-registry-manager`
            }
        } )
        const accessPolicyProviderProps: XmlProp[] = authorizersXmlObj[ 'authorizers' ][ 'accessPolicyProvider' ][ 'property' ]
        accessPolicyProviderProps.forEach( prop => {
            if ( prop[ '@_name' ] == "Authorizations File" ) {
                prop[ '#text' ] = `${ nifiRegistryDataDir }/authorizations.xml`
            } else if ( prop[ '@_name' ] == "Initial Admin Identity" ) {
                prop[ '#text' ] = `CN=nifi-registry-manager`
            }
        } )

        this.props.nifiNodeList?.forEach( node => {

            userGroupProviderProps.push( {
                "@_name": `Initial User Identity ${ node }`,
                "#text": `CN=${ node }`
            } )
            accessPolicyProviderProps.push( {
                "@_name": `Nifi Identity ${ node }`,
                "#text": `CN=${ node }`
            } )
        } )

        const authorizersXml: string = new XMLBuilder( {
            ignoreAttributes: false,
            format: true
        } ).build( authorizersXmlObj )

        return authorizersXml
    }

    private updateNifiProperties (
        nifiRegistryPropertiesData: string,
        nifiRegistryDataDir: string,

    ): string {

        const nifiRegistryPropertiesMap: { [ key: string ]: string } = Object.fromEntries( nifiRegistryPropertiesData.split( "\n" )
            .filter( line => {
                return !/^\s*#/.test( line ) && !/^\s*$/.test( line )
            } )
            .map( line => {
                return [ line.split( /=(.*)/s )[ 0 ], line.split( /=(.*)/s )[ 1 ] ]
            } ) )

        //perform config-driven overrides here


        nifiRegistryPropertiesMap[ 'nifi.registry.web.https.port' ] = this.props.httpsPort.toString()
        nifiRegistryPropertiesMap[ 'nifi.registry.web.https.host' ] = `nifi-registry.${ this.props.hostedZoneName }`
        nifiRegistryPropertiesMap[ 'nifi.registry.web.http.port' ] = ""
        nifiRegistryPropertiesMap[ 'nifi.registry.web.http.host' ] = ""
        nifiRegistryPropertiesMap[ 'nifi.registry.security.keystore' ] = `${ nifiRegistryDataDir }/ssl/keystore/keystore.jks`
        nifiRegistryPropertiesMap[ 'nifi.registry.security.keystoreType' ] = "JKS"
        nifiRegistryPropertiesMap[ 'nifi.registry.security.keystorePasswd' ] = "INIT_KEYSTORE_PASSWORD"
        nifiRegistryPropertiesMap[ 'nifi.registry.security.keyPasswd' ] = "INIT_KEYSTORE_PASSWORD"
        nifiRegistryPropertiesMap[ 'nifi.registry.security.truststore' ] = `${ nifiRegistryDataDir }/ssl/truststore/truststore.jks`
        nifiRegistryPropertiesMap[ 'nifi.registry.security.truststoreType' ] = "JKS"
        nifiRegistryPropertiesMap[ 'nifi.registry.security.truststorePasswd' ] = "INIT_TRUSTSTORE_PASSWORD"
        nifiRegistryPropertiesMap[ 'nifi.registry.security.user.authorizer' ] = "managed-authorizer"
        nifiRegistryPropertiesMap[ 'nifi.registry.security.autoreload.enabled' ] = "true"
        nifiRegistryPropertiesMap[ 'nifi.registry.security.autoreload.interval' ] = "10 secs"
        nifiRegistryPropertiesMap[ 'nifi.registry.security.needClientAuth' ] = "true"

        nifiRegistryPropertiesMap[ 'nifi.registry.security.user.login.identity.provider' ] = "single-user-provider"


        const nifiRegistryProperties = Object.entries( nifiRegistryPropertiesMap ).map( entry => {
            return `${ entry[ 0 ] }=${ entry[ 1 ] }`
        } ).join( "\n" )

        return nifiRegistryProperties

    }



}
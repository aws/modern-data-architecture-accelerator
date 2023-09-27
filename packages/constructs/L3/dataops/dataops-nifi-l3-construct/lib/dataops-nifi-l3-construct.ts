/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefSecurityGroup, CaefSecurityGroupProps, CaefSecurityGroupRuleProps } from '@aws-caef/ec2-constructs';
import { CaefEKSCluster, CaefEKSClusterProps, KubernetesCmd, KubernetesCmdProps } from '@aws-caef/eks-constructs';
import { CaefRoleRef } from '@aws-caef/iam-role-helper';
import { CaefKmsKey } from '@aws-caef/kms-constructs';
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { ISecurityGroup, ISubnet, IVpc, Port, SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { CoreDnsComputeType, HelmChart, KubernetesManifest, KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { Effect, IRole, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { HostedZone, PrivateHostedZone } from 'aws-cdk-lib/aws-route53';
import * as cdk8s from 'cdk8s';
import { Construct } from 'constructs';

import { CaIssuerChart } from './cdk8s/ca-chart';
import { ExternalDnsChart, ExternalDnsChartProps } from './cdk8s/external-dns-chart';
import { ZookeeperChart } from './cdk8s/zookeeper-chart';
import { NifiCluster, NifiClusterProps } from './nifi-cluster';
import * as k8s from './cdk8s/imports/k8s';
import { NifiClusterOptions } from './nifi-cluster-options';

export interface NifiClusterOptionsWithPeers extends NifiClusterOptions {
    /**
     * Other clusters within this module which will be provided SecurityGroup and Node remote access to this cluster.
     */
    readonly peerClusters?: string[]
}

export interface NamedNifiClusterOptions {
    /**
     * @jsii ignore
     */
    [ name: string ]: NifiClusterOptionsWithPeers
}

export interface NifiProps {
    /**
     * List of admin roles which will be provided access to EKS cluster resources 
     */
    readonly adminRoles: CaefRoleRef[]

    /**
     * VPC on which EKS and Nifi clusters will be deployed
     */
    readonly vpcId: string

    /**
     * Subnets on which EKS and Nifi clusters will be deployed
     */
    readonly subnetIds: { [ name: string ]: string }

    /**
     * Ingress rules to be added to the EKS control plane security group
     */
    readonly eksSecurityGroupIngressRules?: CaefSecurityGroupRuleProps

    /**
     * Egress rules to be added to all Nifi cluster security groups.
     * These may also be specified for each cluster.
     */
    readonly nifiSecurityGroupEgressRules?: CaefSecurityGroupRuleProps

    /**
     * Security groups which will be provided ingress access to all Nifi cluster security groups.
     * These may also be specified for each cluster.
     */
    readonly nifiSecurityGroupIngressSGs?: string[]

    /**
     * IPv4 CIDRs which will be provided ingress access to all Nifi cluster security groups.
     * These may also be specified for each cluster.
     */
    readonly nifiSecurityGroupIngressIPv4s?: string[]

    /**
     * Security groups which will be provided ingress access to all Nifi cluster EFS security groups.
     * These may also be specified for each cluster.
     */
    readonly additionalEfsIngressSecurityGroupIds?: string[]

    /**
     * Nifi cluster configurations to be created.
     */
    readonly clusters: NamedNifiClusterOptions

    /**
     * If specified, this ACM Private CA will be used to sign the internal CA running
     * within EKS. If not specified, the internal CA will use a self-signed cert.
     */
    readonly privateCaArn?: string

    /**
     * The certificate validity period for the internal CA cert. If using an ACM Private CA with short-term certificates,
     * this should be set to less than 7 days. Defaults to 6 days.
     */
    readonly caCertDuration?: string
    /**
     * The time before CA cert expiration at which point the internal CA cert will be renewed.
     * Defaults to 12 hours.
     */
    readonly caCertRenewBefore?: string
    /**
     * The certificate validity period for the Zookeeper and Nifi Node certs. If using an ACM Private CA with short-term certificates,
     * this should be set to less than 6 days. Defaults to 5 days.
     */
    readonly nodeCertDuration?: string
    /**
     * The time before CA cert expiration at which point the Zookeeper and Nifi Node certs will be renewed.
     * Defaults to 12 hours.
     */
    readonly nodeCertRenewBefore?: string
}

export interface NifiL3ConstructProps extends CaefL3ConstructProps {
    /**
     * Arn of KMS key which will be used to encrypt the cluster resources
     */
    readonly kmsArn: string
    /**
     * Nifi clusters to be created.
     */
    readonly nifi: NifiProps

}

export class NifiL3Construct extends CaefL3Construct {
    protected readonly props: NifiL3ConstructProps
    private readonly projectKmsKey: IKey
    constructor( scope: Construct, id: string, props: NifiL3ConstructProps ) {
        super( scope, id, props )
        this.props = props

        this.projectKmsKey = CaefKmsKey.fromKeyArn( this.scope, "project-kms", this.props.kmsArn )

        const vpc = Vpc.fromVpcAttributes( this, 'vpc', {
            vpcId: this.props.nifi.vpcId,
            availabilityZones: [ "dummy" ]
        } )

        const subnets = Object.entries( this.props.nifi.subnetIds ).map( entry => {
            return Subnet.fromSubnetId( this, `subnet-${ entry[ 0 ] }`, entry[ 1 ] )
        } )

        const clusterSecurityGroupProps: CaefSecurityGroupProps = {
            securityGroupName: 'eks',
            vpc: vpc,
            addSelfReferenceRule: true,
            naming: props.naming,
            allowAllOutbound: true,
            ingressRules: props.nifi.eksSecurityGroupIngressRules
        }
        const clusterSecurityGroup = new CaefSecurityGroup( scope, 'cluster-sg', clusterSecurityGroupProps )

        const eksCluster = this.createEksCluster( vpc, subnets, this.projectKmsKey, clusterSecurityGroup )
        const externalSecretsHelm = this.addExternalSecrets( eksCluster, clusterSecurityGroup )
        const certManagerHelm = this.addCertManager( eksCluster, clusterSecurityGroup )
        certManagerHelm.node.addDependency( externalSecretsHelm )

        const [ externalDnsManifest, hostedZone ] = this.addExternalDns( eksCluster, vpc, clusterSecurityGroup )

        const [ caIssuerManifest, caIssuerCdk8sChart ] = this.addCA( eksCluster, certManagerHelm, clusterSecurityGroup )
        caIssuerManifest.node.addDependency( certManagerHelm )

        const [ zkK8sChart, zkSecurityGroup ] = this.addZookeeper( vpc, subnets, this.projectKmsKey, eksCluster, hostedZone, caIssuerCdk8sChart )

        this.addNifiClusters( eksCluster,
            vpc,
            subnets,
            hostedZone,
            zkK8sChart,
            caIssuerCdk8sChart,
            zkSecurityGroup,
            [
                externalDnsManifest,
                externalSecretsHelm,
                certManagerHelm,
                caIssuerManifest
            ] )

    }

    private addNifiClusters ( eksCluster: CaefEKSCluster,
        vpc: IVpc,
        subnets: ISubnet[],
        hostedZone: HostedZone,
        zkK8sChart: ZookeeperChart,
        caIssuerCdk8sChart: CaIssuerChart,
        zkSecurityGroup: ISecurityGroup,
        dependencies: Construct[] ) {

        const nifiClusters = Object.fromEntries( Object.entries( this.props.nifi.clusters ).map( nifiClusterEntry => {
            const nifiClusterName = nifiClusterEntry[ 0 ]
            const nifiClusterOptions = nifiClusterEntry[ 1 ]
            const nifiCluster = this.addNifiCluster( nifiClusterName, nifiClusterOptions, vpc, subnets, eksCluster, hostedZone, zkK8sChart, caIssuerCdk8sChart )
            dependencies.forEach( dependency => nifiCluster.nifiManifest.node.addDependency( dependency ) )
            return [ nifiClusterName, { cluster: nifiCluster, options: nifiClusterOptions } ]
        } ) )

        Object.entries( nifiClusters ).forEach( nifiClusterEntry => {
            const nifiClusterName = nifiClusterEntry[ 0 ]
            const nifiCluster = nifiClusterEntry[ 1 ]
            zkSecurityGroup.connections.allowFrom( nifiCluster.cluster.securityGroup, Port.tcp( 2181 ) )
            nifiCluster.options.peerClusters?.forEach( peerClusterName => {
                const peerCluster = nifiClusters[ peerClusterName ]
                if ( !peerCluster ) {
                    throw new Error( `Unknown peer cluster ${ peerClusterName } referenced by cluster ${ nifiClusterName }` )
                }
                //Allow peer cluster to connect to this cluster
                nifiCluster.cluster.securityGroup.connections.allowFrom( peerCluster.cluster.securityGroup, Port.tcp( nifiCluster.cluster.remotePort ) )
                nifiCluster.cluster.securityGroup.connections.allowFrom( peerCluster.cluster.securityGroup, Port.tcp( nifiCluster.cluster.httpsPort ) )
            } )
        } )
    }

    private addCA ( eksCluster: CaefEKSCluster, certManagerHelm: HelmChart, clusterSecurityGroup: ISecurityGroup ): [ KubernetesManifest, CaIssuerChart ] {

        const privateCaHelm = this.props.nifi.privateCaArn ? this.addPrivateCA( this.props.nifi.privateCaArn, eksCluster, clusterSecurityGroup ) : undefined
        privateCaHelm?.node.addDependency( certManagerHelm )

        const caKeystorePasswordSecret = NifiCluster.createSecret( this, 'keystore-password-secret', this.props.naming, 'keystore-password', this.projectKmsKey )
        const caExternalSecretsRole = NifiCluster.createExternalSecretsServiceRole( this, this.props.naming, "cert-manager", eksCluster, this.projectKmsKey, [ caKeystorePasswordSecret ] )
        const caIssuerCdk8sChart = new CaIssuerChart( new cdk8s.App(), 'ca-issuer', {
            namespace: "cert-manager",
            awsRegion: this.region,
            keystorePasswordSecretName: caKeystorePasswordSecret.secretName,
            externalSecretsRoleArn: caExternalSecretsRole.roleArn,
            privateCa: this.props.nifi.privateCaArn ? {
                arn: this.props.nifi.privateCaArn,
                region: this.region
            } : undefined,
            caCertDuration: this.props.nifi.caCertDuration ?? "144h0m0s",
            caCertRenewBefore: this.props.nifi.caCertRenewBefore ?? "12h0m0s",
        } )
        const caManifest = eksCluster.addCdk8sChart( 'ca-issuer', caIssuerCdk8sChart )
        if ( privateCaHelm ) {
            caManifest.node.addDependency( privateCaHelm )
        }
        return [ caManifest, caIssuerCdk8sChart ]
    }

    private addNifiCluster ( nifiClusterName: string,
        nifiClusterOptions: NifiClusterOptionsWithPeers,
        vpc: IVpc,
        subnets: ISubnet[],
        eksCluster: CaefEKSCluster,
        hostedZone: HostedZone,
        zkK8sChart: ZookeeperChart,
        caIssuerCdk8sChart: CaIssuerChart ) {

        const peerNodes: string[] | undefined = nifiClusterOptions.peerClusters?.map( peerClusterName => {
            const peerClusterOptions = this.props.nifi.clusters[ peerClusterName ]
            if ( !peerClusterOptions ) {
                throw new Error( `Unknown peer cluster ${ peerClusterName } referenced by cluster ${ nifiClusterName }` )
            }
            const peerNodeIds = [ ...Array( peerClusterOptions.nodeCount ?? 1 ).keys() ]
            return peerNodeIds.map( peerNodeId => {
                return `CN=nifi-${ peerNodeId }.nifi-${ peerClusterName }.${ hostedZone.zoneName }`
            } )
        } ).flat()

        const externalAuthorizedNodes = [ ...nifiClusterOptions.externalAuthorizedNodes ?? [], ...peerNodes ?? [] ]

        const clusterProps: NifiClusterProps = {
            ...nifiClusterOptions,
            eksCluster: eksCluster,
            clusterName: nifiClusterName,
            kmsKey: this.projectKmsKey,
            vpc: vpc,
            subnets: subnets,
            naming: this.props.naming.withModuleName( nifiClusterName ),
            region: this.region,
            zkConnectString: zkK8sChart.zkConnectString,
            nifiHostedZone: hostedZone,
            nifiSecurityGroupEgressRules: CaefSecurityGroup.mergeRules( this.props.nifi.nifiSecurityGroupEgressRules || {}, nifiClusterOptions.nifiSecurityGroupEgressRules || {} ),
            nifiSecurityGroupIngressSGs: [ ...this.props.nifi.nifiSecurityGroupIngressSGs || [], ...nifiClusterOptions.nifiSecurityGroupIngressSGs || [] ],
            nifiSecurityGroupIngressIPv4s: [ ...this.props.nifi.nifiSecurityGroupIngressIPv4s || [], ...nifiClusterOptions.nifiSecurityGroupIngressIPv4s || [] ],
            additionalEfsIngressSecurityGroupIds: [ ...this.props.nifi.additionalEfsIngressSecurityGroupIds || [], ...nifiClusterOptions.additionalEfsIngressSecurityGroupIds || [] ],
            nifiCAIssuerName: caIssuerCdk8sChart.caIssuerName,
            externalAuthorizedNodes: externalAuthorizedNodes,
            nifiCertDuration: this.props.nifi.nodeCertDuration ?? "120h0m0s",
            nifiCertRenewBefore: this.props.nifi.nodeCertRenewBefore ?? "12h0m0s"
        }
        return new NifiCluster( this, `nifi-cluster-${ nifiClusterName }`, clusterProps )
    }

    private addZookeeper ( vpc: IVpc,
        subnets: ISubnet[],
        kmsKey: IKey,
        eksCluster: CaefEKSCluster,
        hostedZone: HostedZone,
        caIssuerCdk8sChart: CaIssuerChart ): [ ZookeeperChart, ISecurityGroup ] {

        const zkSecurityGroupProps: CaefSecurityGroupProps = {
            securityGroupName: 'zk',
            vpc: vpc,
            addSelfReferenceRule: true,
            naming: this.props.naming,
            allowAllOutbound: true,
            ingressRules: this.props.nifi.eksSecurityGroupIngressRules
        }
        const zkSecurityGroup = new CaefSecurityGroup( this, 'zk-sg', zkSecurityGroupProps )

        const zkCeystorePasswordSecret = NifiCluster.createSecret( this, 'zk-keystore-password-secret', this.props.naming, 'zk-keystore-password', this.projectKmsKey )

        const kmsKeyStatement = new PolicyStatement( {
            sid: "KmsDecrypt",
            effect: Effect.ALLOW,
            actions: [
                "kms:Decrypt"
            ],
            resources: [ this.projectKmsKey.keyArn ],
        } )

        const secretsManagerStatement = new PolicyStatement( {
            sid: "GetSecretValue",
            effect: Effect.ALLOW,
            actions: [
                "SecretsManager:GetSecretValue"
            ],
            resources: [ zkCeystorePasswordSecret.secretArn ],
        } )

        const zkExternalSecretServiceRoleName = this.props.naming.resourceName( 'zk-external-secrets-service-role', 64 )
        const externalSecretsServiceRole = NifiCluster.createServiceRole( this,
            'zk-external-secrets',
            zkExternalSecretServiceRoleName,
            'zookeeper',
            eksCluster,
            [ kmsKeyStatement, secretsManagerStatement ] )

        const additionalEfsIngressSecurityGroups = this.props.nifi.additionalEfsIngressSecurityGroupIds?.map( id => {
            return SecurityGroup.fromSecurityGroupId( this, `efs-ingress-sg-${ id }`, id )
        } )

        const efsSecurityGroup = NifiCluster.createEfsSecurityGroup( this, this.props.naming, vpc, [ zkSecurityGroup, ...additionalEfsIngressSecurityGroups || [] ] )
        const zkEfsPvs = NifiCluster.createEfsPvs( this, this.props.naming, 'zk', 3, vpc, subnets, kmsKey, efsSecurityGroup )
        const efsManagedPolicy = NifiCluster.createEfsAccessPolicy( this, this.props.naming, this.projectKmsKey, zkEfsPvs )

        const fargateProfile = eksCluster.addFargateProfile( 'zookeeper', {
            fargateProfileName: 'zookeeper',
            selectors: [ {
                namespace: 'zookeeper'
            } ]
        } )
        fargateProfile.podExecutionRole.addManagedPolicy( efsManagedPolicy )

        const zkNamespaceChart = eksCluster.addNamespace( new cdk8s.App(), 'zookeeper-ns', "zookeeper", zkSecurityGroup )
        const zkK8sChart = new ZookeeperChart( new cdk8s.App(), 'zookeeper-chart', {
            namespace: "zookeeper",
            hostedZoneName: hostedZone.zoneName,
            externalSecretsRoleArn: externalSecretsServiceRole.roleArn,
            caIssuerName: caIssuerCdk8sChart.caIssuerName,
            awsRegion: this.region,
            keystorePasswordSecretName: zkCeystorePasswordSecret.secretName,
            efsStorageClassName: eksCluster.efsStorageClassName,
            efsPersistentVolumes: zkEfsPvs.map( x => { return { efsFsId: x[ 0 ].fileSystemId, efsApId: x[ 1 ].accessPointId } } ),
            zookeeperCertDuration: this.props.nifi.nodeCertDuration ?? "120h0m0s",
            zookeeperCertRenewBefore: this.props.nifi.nodeCertRenewBefore ?? "12h0m0s",
        } )
        const zkManifest = eksCluster.addCdk8sChart( 'zookeeper', zkK8sChart )
        zkManifest.node.addDependency( zkNamespaceChart )
        const restartNifiCmdProps: KubernetesCmdProps = {
            cluster: eksCluster,
            namespace: 'zookeeper',
            cmd: [ "delete", "pod", "-l", "app=zookeeper" ],
            executionKey: zkK8sChart.hash()
        }
        const restartNifiCmd = new KubernetesCmd( this, 'restart-zk-cmd', restartNifiCmdProps )
        restartNifiCmd.node.addDependency( zkManifest )
        return [ zkK8sChart, zkSecurityGroup ]
    }


    private createHostedZone ( vpc: IVpc ): HostedZone {
        return new PrivateHostedZone( this, 'hosted-zone', {
            vpc: vpc,
            zoneName: `${ this.props.naming.resourceName() }.internal`
        } )
    }

    private addExternalDns ( eksCluster: CaefEKSCluster,
        vpc: IVpc,
        clusterSecurityGroup: ISecurityGroup ): [ KubernetesManifest, HostedZone ] {

        eksCluster.addFargateProfile( "external-dns", {
            fargateProfileName: "external-dns",
            selectors: [ {
                namespace: "external-dns"
            } ]
        } )
        const hostedZone = this.createHostedZone( vpc )
        const externalDnsRole = this.createExternalDnsServiceRole( 'external-dns', eksCluster, hostedZone )
        const externalDnsNamespaceManifest = eksCluster.addNamespace( new cdk8s.App(), 'external-dns-namespace', "external-dns", clusterSecurityGroup )
        const chartProps: ExternalDnsChartProps = {
            namespace: 'external-dns',
            region: this.region,
            externalDnsRoleArn: externalDnsRole.roleArn
        }
        const externalDnsManifest = eksCluster.addCdk8sChart( 'external-dns', new ExternalDnsChart( new cdk8s.App(), 'external-dns', chartProps ) )
        externalDnsManifest.node.addDependency( externalDnsNamespaceManifest )
        return [ externalDnsManifest, hostedZone ]
    }

    private createEksCluster ( vpc: IVpc, subnets: ISubnet[], kmsKey: IKey, clusterSecurityGroup: ISecurityGroup ): CaefEKSCluster {

        const resolvedAdminRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals( this.props.nifi.adminRoles, "Admin" )

        const adminRoles = resolvedAdminRoles.map( resolvedRole => {
            return Role.fromRoleArn( this, `admin-role-${ resolvedRole.refId() }`, resolvedRole.arn() )
        } )

        const clusterProps: CaefEKSClusterProps = {
            version: KubernetesVersion.V1_27,
            coreDnsComputeType: CoreDnsComputeType.FARGATE,
            adminRoles: adminRoles,
            kmsKey: kmsKey,
            vpc: vpc,
            subnets: subnets,
            naming: this.props.naming,
            securityGroup: clusterSecurityGroup
        }

        const cluster = new CaefEKSCluster( this, 'eks-cluster', clusterProps )
        return cluster
    }

    private addExternalSecrets (
        eksCluster: CaefEKSCluster,
        clusterSecurityGroup: ISecurityGroup ): HelmChart {

        eksCluster.addFargateProfile( "external-secrets", {
            fargateProfileName: "external-secrets",
            selectors: [ {
                namespace: "external-secrets"
            } ]
        }, )

        const externalSecretsNamespaceManifest = eksCluster.addNamespace( new cdk8s.App(), 'external-secrets-namespace', "external-secrets", clusterSecurityGroup )

        const externalSecretsHelm = eksCluster.addHelmChart( 'external-secrets-helm', {
            repository: "https://charts.external-secrets.io",
            chart: "external-secrets",
            version: "0.9.5",
            release: "external-secrets",
            namespace: "external-secrets",
            createNamespace: false,
            values: {
                installCRDs: true,
                tolerations: [
                    {
                        key: "eks.amazonaws.com/compute-type",
                        value: "fargate"
                    }
                ],
                webhook: {
                    port: 9443
                }
            }
        } )
        externalSecretsHelm.node.addDependency( externalSecretsNamespaceManifest )
        return externalSecretsHelm
    }

    private addPrivateCA ( privateCaArn: string, eksCluster: CaefEKSCluster, clusterSecurityGroup: ISecurityGroup ): HelmChart {

        eksCluster.addFargateProfile( "private-ca", {
            fargateProfileName: "private-ca",
            selectors: [ {
                namespace: "private-ca"
            } ]
        } )

        const acmPcaStatement = new PolicyStatement( {
            sid: "awspcaissuer",
            actions: [
                "acm-pca:DescribeCertificateAuthority",
                "acm-pca:GetCertificate",
                "acm-pca:IssueCertificate"
            ],
            effect: Effect.ALLOW,
            resources: [ privateCaArn ]
        } )

        const serviceRole = NifiCluster.createServiceRole( this, 'private-ca-service-role', 'private-ca-svc', 'private-ca', eksCluster, [ acmPcaStatement ] )

        const serviceAccountChart = new class extends cdk8s.Chart {
            public serviceAccountName: string
            constructor( scope: Construct, id: string ) {
                super( scope, id )
                const serviceAccount = new k8s.KubeServiceAccount( this, 'service-account', {
                    metadata: {
                        name: 'private-ca-service-account',
                        namespace: 'private-ca',
                        labels: {
                            'app.kubernetes.io/name': 'private-ca'
                        },
                        annotations: {
                            "eks.amazonaws.com/role-arn": serviceRole.roleArn
                        }
                    }
                } )
                this.serviceAccountName = serviceAccount.name
            }
        }( new cdk8s.App(), 'private-ca-service-account-chart' )

        const serviceAccountManifest = eksCluster.addCdk8sChart( 'private-ca-service-account', serviceAccountChart )

        const pcaNamespaceManifest = eksCluster.addNamespace( new cdk8s.App(), 'private-ca-namespace', "private-ca", clusterSecurityGroup )
        const pcaManagerHelm = eksCluster.addHelmChart( 'private-ca-helm', {
            repository: "https://cert-manager.github.io/aws-privateca-issuer",
            chart: "aws-privateca-issuer",
            version: "1.2.5",
            release: "aws-privateca-issuer",
            namespace: "private-ca",
            createNamespace: false,
            values: {
                installCRDs: true,
                tolerations: [
                    {
                        key: "eks.amazonaws.com/compute-type",
                        value: "fargate"
                    }
                ],
                serviceAccount: {
                    create: false,
                    name: serviceAccountChart.serviceAccountName
                }

            }
        } )
        pcaManagerHelm.node.addDependency( serviceAccountManifest )
        pcaManagerHelm.node.addDependency( pcaNamespaceManifest )
        return pcaManagerHelm
    }

    private addCertManager ( eksCluster: CaefEKSCluster, clusterSecurityGroup: ISecurityGroup ): HelmChart {
        eksCluster.addFargateProfile( "cert-manager", {
            fargateProfileName: "cert-manager",
            selectors: [ {
                namespace: "cert-manager"
            } ]
        } )
        const certManagerNamespaceManifest = eksCluster.addNamespace( new cdk8s.App(), 'cert-manager-namespace', "cert-manager", clusterSecurityGroup )
        const certManagerHelm = eksCluster.addHelmChart( 'cert-manager-helm', {
            repository: "https://charts.jetstack.io",
            chart: "cert-manager",
            version: "1.13.0",
            release: "cert-manager",
            namespace: "cert-manager",
            createNamespace: false,
            values: {
                installCRDs: true,
                global: {
                    tolerations: [
                        {
                            key: "eks.amazonaws.com/compute-type",
                            value: "fargate"
                        }
                    ]
                },
                webhook: {
                    securePort: 10260,
                    tolerations: [
                        {
                            key: "eks.amazonaws.com/compute-type",
                            value: "fargate"
                        }
                    ]
                },
                cainjector: {
                    tolerations: [
                        {
                            key: "eks.amazonaws.com/compute-type",
                            value: "fargate"
                        }
                    ]
                }
            }
        } )
        certManagerHelm.node.addDependency( certManagerNamespaceManifest )
        return certManagerHelm
    }

    private createExternalDnsServiceRole (
        namespaceName: string,
        eksCluster: CaefEKSCluster,
        zone: HostedZone ): IRole {

        const externalDnsServiceRoleName = this.props.naming.resourceName( 'external-dns-service-role', 64 )

        const route53UpdateStatement = new PolicyStatement( {
            sid: "Route53Update",
            effect: Effect.ALLOW,
            actions: [
                "route53:ChangeResourceRecordSets"
            ],
            resources: [ zone.hostedZoneArn ],
        } )

        const route53ListStatement = new PolicyStatement( {
            sid: "Route53List",
            effect: Effect.ALLOW,
            actions: [
                "route53:ListHostedZones",
                "route53:ListResourceRecordSets",
                "route53:ListTagsForResource"
            ],
            resources: [ "*" ],
        } )

        const suppressions = [ { id: 'AwsSolutions-IAM5', reason: 'Access Point Names not known at deployment time. Permissions restricted by condition.' } ]
        const externalSecretsServiceRole = NifiCluster.createServiceRole( this,
            'external-dns',
            externalDnsServiceRoleName,
            namespaceName,
            eksCluster,
            [ route53UpdateStatement, route53ListStatement ],
            suppressions )

        return externalSecretsServiceRole

    }

}







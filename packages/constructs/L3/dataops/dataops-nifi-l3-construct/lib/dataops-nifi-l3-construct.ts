/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefSecurityGroup, CaefSecurityGroupProps, CaefSecurityGroupRuleProps } from '@aws-caef/ec2-constructs';
import { CaefEKSCluster, CaefEKSClusterProps, KubernetesCmd, KubernetesCmdProps } from '@aws-caef/eks-constructs';
import { CaefRoleRef } from '@aws-caef/iam-role-helper';
import { CaefKmsKey } from '@aws-caef/kms-constructs';
import { CaefL3Construct, CaefL3ConstructProps } from '@aws-caef/l3-construct';
import { ISecurityGroup, ISubnet, IVpc, Port, Protocol, SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { CoreDnsComputeType, HelmChart, KubernetesManifest, KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { Effect, IRole, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { HostedZone, PrivateHostedZone } from 'aws-cdk-lib/aws-route53';
import * as cdk8s from 'cdk8s';
import { Construct } from 'constructs';

import { CfnCertificate, CfnCertificateAuthority, CfnCertificateAuthorityActivation, CfnCertificateAuthorityProps } from 'aws-cdk-lib/aws-acmpca';
import { CaIssuerChart } from './cdk8s/ca-chart';
import { ExternalDnsChart, ExternalDnsChartProps } from './cdk8s/external-dns-chart';
import * as k8s from './cdk8s/imports/k8s';
import { NifiRegistryChart, NifiRegistryChartProps } from './cdk8s/nifi-registry-chart';
import { ZookeeperChart } from './cdk8s/zookeeper-chart';
import { NifiCluster, NifiClusterProps } from './nifi-cluster';
import { AutomaticNifiAuthorizations, AwsManagedPolicySpec, NifiClusterOptions, NifiSamlProps } from './nifi-cluster-options';

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
    readonly clusters?: NamedNifiClusterOptions

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
    /**
     * (Optional) If specified, this ACM Private CA will be used to sign the internal CA running
     * within EKS. If not specified, an ACM Private CA will be created.
     */
    readonly existingPrivateCaArn?: string

    readonly certKeyAlg?: string

    readonly certKeySize?: number

    readonly registry?: NifiRegistryProps
}



export interface NifiRegistryProps {

    /**
     * The tag of the Nifi docker image to use. If not specified,
     * defaults to the latest tested version (currently 1.23.2). Specify 'latest' to pull
     * the latest version (might be untested).
     */
    readonly registryImageTag?: string

    /**
     * Initial Nifi admin identity. If using SAML, this should match the admin SAML identity.
     * If not using SAML, a local user with this name will be created and a password stored in AWS Secrets Manager
     */
    readonly initialAdminIdentity: string
    /**
     * If specified, the Nifi cluster will be configured to use a SAML identity provider
     */
    readonly saml?: NifiSamlProps

    /**
     * The port on which the cluster HTTPS interfaces will listen
     */
    readonly httpsPort?: number

    /**
     * Security groups which will be provided ingress access to the Nifi cluster security group.
     * These may also be specified globally.
     */
    readonly securityGroupIngressSGs?: string[]

    /**
     * IPv4 CIDRs which will be provided ingress access to the Nifi cluster security group.
     * These may also be specified globally.
     */
    readonly securityGroupIngressIPv4s?: string[]

    /**
     * Security groups which will be provided ingress access to the Nifi cluster EFS security group.
     * These may also be specified globally.
     */
    readonly additionalEfsIngressSecurityGroupIds?: string[]

    /**
     * AWS managed policies which will be granted to the Nifi cluster role for access to AWS services.
     */
    readonly registryRoleAwsManagedPolicies?: AwsManagedPolicySpec[]
    /**
     * Customer managed policies which will be granted to the Nifi cluster role for access to AWS services.
     */
    readonly registryRoleManagedPolicies?: string[]
    /**
     * Authorized registry user identities to be pre-created. These users will not have any permissions by default, unless
     * policy patterns are specified in autoAddNifiAuthorizations.userPolicyPatterns
     */
    readonly userIdentities?: string[]
    /**
     * Authorized registry admin identities to be pre-created. These admins will not have any permissions by default, unless
     * policy patterns are specified in autoAddNifiAuthorizations.adminPolicyPatterns
     */
    readonly additionalAdminIdentities?: string[]
    /**
     * External nodes which will be granted remote access (by TLS certificate common name).
     * Note that these nodes will also need to be granted security group access via 'nifiSecurityGroupIngressSGs' or 'nifiSecurityGroupIngressIPv4s'
     */
    readonly externalNodeIdentities?: string[]
    /**
     * Policy patterns for automatically adding authorizations for nifi nodes (from clusters in this construct), external nifi nodes (provisioned outside of this construct),
     * admins (both initialAdminIdentity and additionalAdminIdentities), as well as userIdentities
     */
    readonly autoAddNifiAuthorizations?: AutomaticNifiAuthorizations
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
        const [ externalDnsManifest, hostedZone ] = this.addExternalDns( eksCluster, vpc, clusterSecurityGroup )

        const certManagerHelm = this.addCertManager( eksCluster, clusterSecurityGroup )
        certManagerHelm.node.addDependency( externalSecretsHelm )

        const [ caIssuerManifest, caIssuerCdk8sChart ] = this.addCA( eksCluster, certManagerHelm, clusterSecurityGroup )

        const [ zkK8sChart, zkSecurityGroup ] = this.addZookeeper( vpc, subnets, this.projectKmsKey, eksCluster, hostedZone, caIssuerCdk8sChart )


        const nifiClusters = this.addNifiClusters( eksCluster,
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
        if ( this.props.nifi.registry ) {
            this.addRegistry( this.props.nifi.registry, vpc,
                subnets,
                this.projectKmsKey,
                eksCluster,
                hostedZone,
                caIssuerCdk8sChart,
                nifiClusters.flatMap( x => x.nodeList ),
                [ ...new Set( nifiClusters.flatMap( x => x.initialAdminIdentity ) ) ],
                nifiClusters.flatMap( x => x.securityGroup ) )
        }
    }

    private addNifiClusters ( eksCluster: CaefEKSCluster,
        vpc: IVpc,
        subnets: ISubnet[],
        hostedZone: HostedZone,
        zkK8sChart: ZookeeperChart,
        caIssuerCdk8sChart: CaIssuerChart,
        zkSecurityGroup: ISecurityGroup,
        dependencies: Construct[] ): NifiCluster[] {

        const nifiClusters = Object.fromEntries( Object.entries( this.props.nifi.clusters || {} ).map( nifiClusterEntry => {
            const nifiClusterName = nifiClusterEntry[ 0 ]
            const nifiClusterOptions = nifiClusterEntry[ 1 ]
            const nifiCluster = this.addNifiCluster( nifiClusterName, nifiClusterOptions, vpc, subnets, eksCluster, hostedZone, zkK8sChart, caIssuerCdk8sChart )
            dependencies.forEach( dependency => nifiCluster.nifiManifest.node.addDependency( dependency ) )
            return [ nifiClusterName, { cluster: nifiCluster, options: nifiClusterOptions } ]
        } ) )

        Object.entries( nifiClusters ).map( nifiClusterEntry => {
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
        return Object.entries( nifiClusters ).map( x => x[ 1 ].cluster )

    }

    private addRegistry ( registryProps: NifiRegistryProps, vpc: IVpc,
        subnets: ISubnet[],
        kmsKey: IKey,
        eksCluster: CaefEKSCluster,
        hostedZone: HostedZone,
        caIssuerCdk8sChart: CaIssuerChart,
        nifiNodeList: string[],
        nifiAdminUserIdentities: string[],
        nifiSecurityGroups: ISecurityGroup[] ) {

        const registryNamespaceName = "nifi-registry"
        const allIngressSgIds = [
            ...nifiSecurityGroups.map( x => x.securityGroupId ),
            ...this.props.nifi.nifiSecurityGroupIngressSGs || []
        ]

        const registryHttpsPort = registryProps.httpsPort ?? 8443

        const ingressRules: CaefSecurityGroupRuleProps = {
            sg: allIngressSgIds.map( sgId => {
                return [
                    {
                        sgId: sgId,
                        protocol: Protocol.TCP,
                        port: registryHttpsPort
                    }, ]
            } ).flat(),
            ipv4: this.props.nifi.nifiSecurityGroupIngressIPv4s?.map( ipv4 => {
                return [
                    {
                        cidr: ipv4,
                        protocol: Protocol.TCP,
                        port: registryHttpsPort
                    },
                ]
            } ).flat()
        }

        const registrySecurityGroupProps: CaefSecurityGroupProps = {
            securityGroupName: 'registry',
            vpc: vpc,
            addSelfReferenceRule: true,
            naming: this.props.naming,
            allowAllOutbound: true,
            ingressRules: ingressRules,

        }
        const registrySecurityGroup = new CaefSecurityGroup( this, 'registry-sg', registrySecurityGroupProps )

        const registryKeystorePasswordSecret = NifiCluster.createSecret( this, 'registry-keystore-password-secret', this.props.naming, 'registry-keystore-password', this.projectKmsKey )
        const registryAdminCredentialsSecret = NifiCluster.createSecret( this, 'registry-admin-creds-secret', this.props.naming, 'registry-admin-creds-secret', kmsKey )

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
            resources: [ registryKeystorePasswordSecret.secretArn, registryAdminCredentialsSecret.secretArn ],
        } )

        const externalSecretsServiceRole = NifiCluster.createServiceRole( this,
            'registry-external-secrets',
            this.props.naming.resourceName( 'registry-external-secrets-service-role', 64 ),
            registryNamespaceName,
            eksCluster,
            [ kmsKeyStatement, secretsManagerStatement ] )

        const additionalEfsIngressSecurityGroups = this.props.nifi.additionalEfsIngressSecurityGroupIds?.map( id => {
            return SecurityGroup.fromSecurityGroupId( this, `registry-efs-ingress-sg-${ id }`, id )
        } )

        const efsSecurityGroup = NifiCluster.createEfsSecurityGroup( 'registry', this, this.props.naming, vpc, [ registrySecurityGroup, ...additionalEfsIngressSecurityGroups || [] ] )
        const registryEfsPvs = NifiCluster.createEfsPvs( this, this.props.naming, 'registry', 1, vpc, subnets, kmsKey, efsSecurityGroup )[ 0 ]
        const efsManagedPolicy = NifiCluster.createEfsAccessPolicy( 'registry', this, this.props.naming, this.projectKmsKey, [ registryEfsPvs ] )

        const fargateProfile = eksCluster.addFargateProfile( registryNamespaceName, {
            fargateProfileName: registryNamespaceName,
            selectors: [ {
                namespace: registryNamespaceName
            } ]
        } )
        fargateProfile.podExecutionRole.addManagedPolicy( efsManagedPolicy )

        const registryNamespaceManifest = eksCluster.addNamespace( new cdk8s.App(), 'registry-ns', registryNamespaceName, registrySecurityGroup )

        const clusterServiceRole = NifiCluster.createServiceRole( this, 'registry-service-role', this.props.naming.resourceName( 'registry-service-role', 64 ), registryNamespaceName, eksCluster )

        const registryChartProps: NifiRegistryChartProps = {
            namespace: registryNamespaceName,
            awsRegion: this.region,
            adminCredsSecretName: registryAdminCredentialsSecret.secretName,
            keystorePasswordSecretName: registryKeystorePasswordSecret.secretName,
            externalSecretsRoleArn: externalSecretsServiceRole.roleArn,
            initialAdminIdentity: registryProps.initialAdminIdentity,
            efsPersistentVolume: { efsFsId: registryEfsPvs[ 0 ].fileSystemId, efsApId: registryEfsPvs[ 1 ].accessPointId },
            efsStorageClassName: eksCluster.efsStorageClassName,
            caIssuerName: caIssuerCdk8sChart.caIssuerName,
            hostedZoneName: hostedZone.zoneName,
            httpsPort: registryHttpsPort,
            nifiRegistryServiceRoleArn: clusterServiceRole.roleArn,
            nifiRegistryServiceRoleName: clusterServiceRole.roleName,
            nifiRegistryCertDuration: this.props.nifi.nodeCertDuration ?? "24h0m0s",
            nifiRegistryCertRenewBefore: this.props.nifi.nodeCertRenewBefore ?? "1h0m0s",
            saml: registryProps.saml ? { ...registryProps.saml, entityId: `org:apache:nifi:saml:sp-registry` } : undefined,
            certKeyAlg: this.props.nifi.certKeyAlg ?? "ECDSA",
            certKeySize: this.props.nifi.certKeySize ?? 384,
            nifiNodeList: nifiNodeList,
            userIdentities: [ ...registryProps.userIdentities || [], ...nifiAdminUserIdentities ],
            additionalAdminIdentities: registryProps.additionalAdminIdentities,
            externalNodeIdentities: registryProps.externalNodeIdentities
        }
        const registryChart = new NifiRegistryChart( new cdk8s.App(), 'registry-chart', registryChartProps )
        const registryManifest = eksCluster.addCdk8sChart( 'registry', registryChart )
        registryManifest.node.addDependency( registryNamespaceManifest )
        const restartRegistryCmdProps: KubernetesCmdProps = {
            cluster: eksCluster,
            namespace: 'nifi-registry',
            cmd: [ "delete", "pod", "-l", "app=nifi-registry" ],
            executionKey: registryChart.hash()
        }
        const restartRegistryCmd = new KubernetesCmd( this, 'restart-registry-cmd', restartRegistryCmdProps )
        restartRegistryCmd.node.addDependency( registryManifest )
    }

    private addCA ( eksCluster: CaefEKSCluster, certManagerHelm: HelmChart, clusterSecurityGroup: ISecurityGroup ): [ KubernetesManifest, CaIssuerChart ] {

        const [ rootClusterIssuerName, rootClusterIssuerReadyCmd ] = this.addPrivateCA( eksCluster, clusterSecurityGroup )

        const caKeystorePasswordSecret = NifiCluster.createSecret( this, 'keystore-password-secret', this.props.naming, 'keystore-password', this.projectKmsKey )
        const caExternalSecretsRole = NifiCluster.createExternalSecretsServiceRole( this, this.props.naming, "cert-manager", eksCluster, this.projectKmsKey, [ caKeystorePasswordSecret ] )

        const caIssuerCdk8sChart = new CaIssuerChart( new cdk8s.App(), 'ca-issuer', {
            namespace: "cert-manager",
            awsRegion: this.region,
            keystorePasswordSecretName: caKeystorePasswordSecret.secretName,
            externalSecretsRoleArn: caExternalSecretsRole.roleArn,
            rootClusterIssuerName: rootClusterIssuerName,
            caCertDuration: this.props.nifi.caCertDuration ?? "144h0m0s",
            caCertRenewBefore: this.props.nifi.caCertRenewBefore ?? "48h0m0s",
            certKeyAlg: this.props.nifi.certKeyAlg ?? "ECDSA",
            certKeySize: this.props.nifi.certKeySize ?? 384
        } )

        const caManifest = eksCluster.addCdk8sChart( 'ca-issuer', caIssuerCdk8sChart )

        caManifest.node.addDependency( rootClusterIssuerReadyCmd )
        caManifest.node.addDependency( certManagerHelm )
        return [ caManifest, caIssuerCdk8sChart ]
    }

    private addNifiCluster ( nifiClusterName: string,
        nifiClusterOptions: NifiClusterOptionsWithPeers,
        vpc: IVpc,
        subnets: ISubnet[],
        eksCluster: CaefEKSCluster,
        hostedZone: HostedZone,
        zkK8sChart: ZookeeperChart,
        caIssuerCdk8sChart: CaIssuerChart ): NifiCluster {

        const peerNodes: string[] | undefined = nifiClusterOptions.peerClusters?.map( peerClusterName => {
            const peerClusterOptions = ( this.props.nifi.clusters || {} )[ peerClusterName ]
            if ( !peerClusterOptions ) {
                throw new Error( `Unknown peer cluster ${ peerClusterName } referenced by cluster ${ nifiClusterName }` )
            }
            const peerNodeIds = [ ...Array( peerClusterOptions.nodeCount ?? 1 ).keys() ]
            return peerNodeIds.map( peerNodeId => {
                return `CN=nifi-${ peerNodeId }.nifi-${ peerClusterName }.${ hostedZone.zoneName }`
            } )
        } ).flat()

        const externalNodeIdentities = [ ...nifiClusterOptions.externalNodeIdentities ?? [], ...peerNodes ?? [] ]

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
            externalNodeIdentities: externalNodeIdentities,
            nifiCertDuration: this.props.nifi.nodeCertDuration ?? "24h0m0s",
            nifiCertRenewBefore: this.props.nifi.nodeCertRenewBefore ?? "1h0m0s",
            certKeyAlg: this.props.nifi.certKeyAlg ?? "ECDSA",
            certKeySize: this.props.nifi.certKeySize ?? 384
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

        const externalSecretsServiceRole = NifiCluster.createServiceRole( this,
            'zk-external-secrets',
            this.props.naming.resourceName( 'zk-external-secrets-service-role', 64 ),
            'zookeeper',
            eksCluster,
            [ kmsKeyStatement, secretsManagerStatement ] )

        const additionalEfsIngressSecurityGroups = this.props.nifi.additionalEfsIngressSecurityGroupIds?.map( id => {
            return SecurityGroup.fromSecurityGroupId( this, `zk-efs-ingress-sg-${ id }`, id )
        } )

        const fargateProfile = eksCluster.addFargateProfile( 'zookeeper', {
            fargateProfileName: 'zookeeper',
            selectors: [ {
                namespace: 'zookeeper'
            } ]
        } )

        const efsSecurityGroup = NifiCluster.createEfsSecurityGroup( 'zookeeper', this, this.props.naming, vpc, [ zkSecurityGroup, ...additionalEfsIngressSecurityGroups || [] ] )
        const zkEfsPvs = NifiCluster.createEfsPvs( this, this.props.naming, 'zk', 3, vpc, subnets, kmsKey, efsSecurityGroup )
        const efsManagedPolicy = NifiCluster.createEfsAccessPolicy( 'zookeeper', this, this.props.naming, this.projectKmsKey, zkEfsPvs )
        fargateProfile.podExecutionRole.addManagedPolicy( efsManagedPolicy )
        const zkNamespaceManifest = eksCluster.addNamespace( new cdk8s.App(), 'zookeeper-ns', "zookeeper", zkSecurityGroup )
        zkNamespaceManifest.node.addDependency( fargateProfile )


        const zkK8sChart = new ZookeeperChart( new cdk8s.App(), 'zookeeper-chart', {
            namespace: "zookeeper",
            hostedZoneName: hostedZone.zoneName,
            externalSecretsRoleArn: externalSecretsServiceRole.roleArn,
            caIssuerName: caIssuerCdk8sChart.caIssuerName,
            awsRegion: this.region,
            keystorePasswordSecretName: zkCeystorePasswordSecret.secretName,
            efsStorageClassName: eksCluster.efsStorageClassName,
            efsPersistentVolumes: zkEfsPvs.map( x => { return { efsFsId: x[ 0 ].fileSystemId, efsApId: x[ 1 ].accessPointId } } ),
            zookeeperCertDuration: this.props.nifi.nodeCertDuration ?? "24h0m0s",
            zookeeperCertRenewBefore: this.props.nifi.nodeCertRenewBefore ?? "1h0m0s",
            certKeyAlg: this.props.nifi.certKeyAlg ?? "ECDSA",
            certKeySize: this.props.nifi.certKeySize ?? 384
        } )
        const zkManifest = eksCluster.addCdk8sChart( 'zookeeper', zkK8sChart )
        zkManifest.node.addDependency( zkNamespaceManifest )
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

    private createAcmPca (): CfnCertificateAuthorityActivation {

        const pcaProps: CfnCertificateAuthorityProps = {
            keyAlgorithm: 'EC_secp384r1',
            signingAlgorithm: 'SHA512WITHECDSA',
            type: 'ROOT',
            subject: {
                commonName: this.props.naming.resourceName(),
                organization: this.props.naming.props.org,
                organizationalUnit: this.props.naming.props.domain
            },
            usageMode: 'SHORT_LIVED_CERTIFICATE'
        }

        const pca = new CfnCertificateAuthority( this, 'acm-pca', pcaProps )

        const caCert = new CfnCertificate( this, 'acm-pca-cert', {
            certificateAuthorityArn: pca.attrArn,
            certificateSigningRequest: pca.attrCertificateSigningRequest,
            signingAlgorithm: "SHA512WITHECDSA",
            validity: {
                type: "YEARS",
                value: 10
            },
            templateArn: `arn:${ this.partition }:acm-pca:::template/RootCACertificate/V1`
        } )

        return new CfnCertificateAuthorityActivation( this, 'acm-pca-activation', {
            certificateAuthorityArn: pca.attrArn,
            certificate: caCert.attrCertificate,
            status: "ACTIVE"
        } )

    }

    private addPrivateCA ( eksCluster: CaefEKSCluster, clusterSecurityGroup: ISecurityGroup ): [ string, Construct ] {

        const fargateProfile = eksCluster.addFargateProfile( "private-ca", {
            fargateProfileName: "private-ca",
            selectors: [ {
                namespace: "private-ca"
            } ]
        } )

        const privateCa = this.props.nifi.existingPrivateCaArn ? undefined : this.createAcmPca()
        let privateCaArn: string
        if ( privateCa ) {
            privateCaArn = privateCa.certificateAuthorityArn
        } else {
            /* istanbul ignore next */
            if ( !this.props.nifi.existingPrivateCaArn ) {
                throw new Error( "Impossible condition" )
            }
            privateCaArn = this.props.nifi.existingPrivateCaArn
        }

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

        const pcaNamespaceManifest = eksCluster.addNamespace( new cdk8s.App(), 'private-ca-namespace', "private-ca", clusterSecurityGroup )

        const serviceAccountManifest = eksCluster.addCdk8sChart( 'private-ca-service-account', serviceAccountChart )
        serviceAccountManifest.node.addDependency( pcaNamespaceManifest )

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

        pcaManagerHelm.node.addDependency( fargateProfile )
        pcaManagerHelm.node.addDependency( serviceAccountManifest )
        pcaManagerHelm.node.addDependency( pcaNamespaceManifest )
        if ( privateCa ) {
            pcaManagerHelm.node.addDependency( privateCa )
        }

        const pcaClusterIssuerChart = new class extends cdk8s.Chart {
            public readonly clusterIssuerName: string;
            constructor( scope: Construct, id: string, privateCaArn: string, region: string ) {
                super( scope, id )
                const clusterIssuer = new cdk8s.ApiObject( this, 'private-ca-cluster-issuer', {
                    apiVersion: "awspca.cert-manager.io/v1beta1",
                    kind: "AWSPCAClusterIssuer",
                    metadata: {
                        name: 'private-ca-cluster-issuer'
                    },
                    spec: {
                        arn: privateCaArn,
                        region: region
                    }
                } )
                this.clusterIssuerName = clusterIssuer.name
            }
        }( new cdk8s.App(), 'private-ca-cluster-issuer-chart', privateCaArn, this.region )
        const clusterIssuerManifest = eksCluster.addCdk8sChart( 'private-ca-cluster-issuer-chart', pcaClusterIssuerChart )
        clusterIssuerManifest.node.addDependency( pcaManagerHelm )

        //Ensure PCA Cluster Issuer is Ready
        const checkPcaClusterIssuerReadyProps: KubernetesCmdProps = {
            cluster: eksCluster,
            namespace: "cert-manager",
            cmd: [ "get", "awspcaclusterissuer", "private-ca-cluster-issuer", "-o", "jsonpath=\"{.status.conditions[?(@.type=='Ready')].status }\"" ],
            expectedOutput: "True"
        }
        const checkPcaClusterIssuerReadyCmd = new KubernetesCmd( this, 'check-pca-cluster-issuer-ready', checkPcaClusterIssuerReadyProps )
        checkPcaClusterIssuerReadyCmd.node.addDependency( clusterIssuerManifest )

        return [ pcaClusterIssuerChart.clusterIssuerName, checkPcaClusterIssuerReadyCmd ]
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
            this.props.naming.resourceName( 'external-dns-service-role', 64 ),
            namespaceName,
            eksCluster,
            [ route53UpdateStatement, route53ListStatement ],
            suppressions )

        return externalSecretsServiceRole

    }

}







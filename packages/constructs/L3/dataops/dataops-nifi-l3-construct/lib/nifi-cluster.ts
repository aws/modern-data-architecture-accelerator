/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { CaefSecurityGroup, CaefSecurityGroupProps, CaefSecurityGroupRuleProps, NagSuppressionProps } from '@aws-caef/ec2-constructs';
import { CaefEKSCluster, KubernetesCmd, KubernetesCmdProps } from '@aws-caef/eks-constructs';
import { ICaefResourceNaming } from '@aws-caef/naming';
import { CfnJson } from 'aws-cdk-lib';
import { ISecurityGroup, ISubnet, IVpc, Protocol, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { AccessPoint, FileSystem, PerformanceMode } from 'aws-cdk-lib/aws-efs';
import { KubernetesManifest } from 'aws-cdk-lib/aws-eks';
import { Effect, IRole, ManagedPolicy, OpenIdConnectPrincipal, PolicyStatement, PrincipalWithConditions, Role } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { NagSuppressions } from 'cdk-nag';
import * as cdk8s from 'cdk8s';
import { Construct } from "constructs";
import { NifiClusterChart, NodeResources } from './cdk8s/nifi-cluster-chart';
import { NifiClusterOptions, NodeSize } from './nifi-cluster-options';


export interface NifiClusterProps extends NifiClusterOptions {
    readonly eksCluster: CaefEKSCluster
    readonly clusterName: string
    readonly kmsKey: IKey
    readonly vpc: IVpc
    readonly subnets: ISubnet[]
    readonly naming: ICaefResourceNaming
    readonly region: string
    readonly zkConnectString: string
    readonly nifiHostedZone: IHostedZone
    readonly nifiCAIssuerName: string
    readonly nifiCertDuration: string
    readonly nifiCertRenewBefore: string
}


export class NifiCluster extends Construct {
    private readonly props: NifiClusterProps
    public readonly nifiManifest: KubernetesManifest;
    public readonly securityGroup: ISecurityGroup
    public readonly httpsPort: number
    public readonly remotePort: number
    public readonly clusterPort: number

    private static nodeSizeMap: { [ key in NodeSize ]: NodeResources } = {
        "SMALL": {
            memory: "2Gi",
            cpu: "1"
        },
        "MEDIUM": {
            memory: "4Gi",
            cpu: "2"
        },
        "LARGE": {
            memory: "8Gi",
            cpu: "4"
        },
        "XLARGE": {
            memory: "16Gi",
            cpu: "8"
        },
        "2XLARGE": {
            memory: "32Gi",
            cpu: "16"
        }
    }


    constructor( scope: Construct, id: string, props: NifiClusterProps ) {
        super( scope, id )
        this.props = props
        const nifiNamespaceName = `nifi-${ props.clusterName }`
        this.httpsPort = this.props.httpsPort ?? 8443
        this.remotePort = this.props.remotePort ?? 10000
        this.clusterPort = this.props.clusterPort ?? 14443
        const nodeCount = props.nodeCount ?? 1

        this.securityGroup = this.createNifiSecurityGroup( props.vpc )

        const additionalEfsIngressSecurityGroups = props.additionalEfsIngressSecurityGroupIds?.map( id => {
            return SecurityGroup.fromSecurityGroupId( this, `efs-ingress-sg-${ id }`, id )
        } )

        const efsSecurityGroup = NifiCluster.createEfsSecurityGroup( this, props.naming, props.vpc, [ this.securityGroup, ...additionalEfsIngressSecurityGroups || [] ] )

        const nifiEfsPvs = NifiCluster.createEfsPvs( this, props.naming, 'nifi', nodeCount, props.vpc, props.subnets, props.kmsKey, efsSecurityGroup )
        const efsManagedPolicy = NifiCluster.createEfsAccessPolicy( this, props.naming, props.kmsKey, nifiEfsPvs )

        const fargateProfile = props.eksCluster.addFargateProfile( props.clusterName, {
            fargateProfileName: props.clusterName,
            selectors: [ {
                namespace: nifiNamespaceName
            } ]
        } )
        fargateProfile.podExecutionRole.addManagedPolicy( efsManagedPolicy )

        const nifiAdminCredentialsSecret = NifiCluster.createSecret( this, 'nifi-admin-creds-secret', props.naming, 'admin-creds-secret', props.kmsKey )
        const nifiSensitivePropSecret = NifiCluster.createSecret( this, 'nifi-sensitive-props-secret', props.naming, 'sensitive-props-key', props.kmsKey )
        const keystorePasswordSecret = NifiCluster.createSecret( this, 'keystore-password-secret', props.naming, 'keystore-password', props.kmsKey )

        const externalSecretsRole = NifiCluster.createExternalSecretsServiceRole( this, props.naming, nifiNamespaceName, props.eksCluster, props.kmsKey, [ nifiSensitivePropSecret, keystorePasswordSecret, nifiAdminCredentialsSecret ] )

        const clusterServiceRole = NifiCluster.createServiceRole( this, 'nifi-service-role', props.naming.resourceName( 'nifi-service-role', 64 ), nifiNamespaceName, props.eksCluster )

        this.props.clusterRoleAwsManagedPolicies?.forEach( managedPolicySpec => {
            const managedPolicy = ManagedPolicy.fromAwsManagedPolicyName( managedPolicySpec.policyName )
            clusterServiceRole.addManagedPolicy( managedPolicy )
            NagSuppressions.addResourceSuppressions( clusterServiceRole, [ {
                id: "AwsSolutions-IAM4",
                reason: managedPolicySpec.suppressionReason
            } ] )
        } )

        this.props.clusterRoleManagedPolicies?.forEach( managedPolicyName => {
            const managedPolicy = ManagedPolicy.fromManagedPolicyName( this, `imported-policy-${ managedPolicyName }`, managedPolicyName )
            clusterServiceRole.addManagedPolicy( managedPolicy )
        } )

        const nodeSize = NifiCluster.nodeSizeMap[ this.props.nodeSize || "SMALL" ]

        const nifiK8sChart = new NifiClusterChart( new cdk8s.App(), 'nifi-chart', {
            namespace: nifiNamespaceName,
            externalSecretsRoleArn: externalSecretsRole.roleArn,
            nodeCount: nodeCount,
            nodeCpu: nodeSize.cpu,
            nodeMemory: nodeSize.memory,
            nifiImageTag: props.nifiImageTag,
            awsRegion: props.region,
            adminCredsSecretName: nifiAdminCredentialsSecret.secretName,
            nifiSensitivePropSecretName: nifiSensitivePropSecret.secretName,
            keystorePasswordSecretName: keystorePasswordSecret.secretName,
            initialAdminIdentity: props.initialAdminIdentity,
            efsPersistentVolumes: nifiEfsPvs.map( x => { return { efsFsId: x[ 0 ].fileSystemId, efsApId: x[ 1 ].accessPointId } } ),
            efsStorageClassName: props.eksCluster.efsStorageClassName,
            saml: props.saml ? { ...props.saml, entityId: `org:apache:nifi:saml:sp-${ props.clusterName }` } : undefined,
            hostedZoneName: props.nifiHostedZone.zoneName,
            zkConnectString: props.zkConnectString,
            zkRootNode: `/nifi/${ props.clusterName }`,
            httpsPort: this.httpsPort,
            remotePort: this.remotePort,
            clusterPort: this.clusterPort,
            caIssuerName: this.props.nifiCAIssuerName,
            externalAuthorizedNodes: this.props.externalAuthorizedNodes,
            nifiServiceRoleArn: clusterServiceRole.roleArn,
            nifiServiceRoleName: clusterServiceRole.roleName,
            nifiCertDuration: this.props.nifiCertDuration,
            nifiCertRenewBefore: this.props.nifiCertRenewBefore
        } )

        const nifiNamespaceChart = props.eksCluster.addNamespace( new cdk8s.App(), `nifi-namespace-${ props.clusterName }`, nifiNamespaceName, this.securityGroup )
        this.nifiManifest = props.eksCluster.addCdk8sChart( `nifi-${ props.clusterName }`, nifiK8sChart )
        this.nifiManifest.node.addDependency( nifiNamespaceChart )


        const restartNifiCmdProps: KubernetesCmdProps = {
            cluster: props.eksCluster,
            namespace: nifiNamespaceName,
            cmd: [ "delete", "pod", "-l", "app=nifi" ],
            executionKey: nifiK8sChart.hash()
        }
        const restartNifiCmd = new KubernetesCmd( this, 'restart-nifi-cmd', restartNifiCmdProps )
        restartNifiCmd.node.addDependency( this.nifiManifest )
    }

    private createNifiSecurityGroup ( vpc: IVpc ) {

        const ingressRules: CaefSecurityGroupRuleProps = {
            sg: this.props.nifiSecurityGroupIngressSGs?.map( sgId => {
                return [ {
                    sgId: sgId,
                    protocol: Protocol.TCP,
                    port: this.clusterPort
                },
                {
                    sgId: sgId,
                    protocol: Protocol.TCP,
                    port: this.httpsPort
                },
                {
                    sgId: sgId,
                    protocol: Protocol.TCP,
                    port: this.remotePort
                } ]
            } ).flat(),
            ipv4: this.props.nifiSecurityGroupIngressIPv4s?.map( ipv4 => {
                return [ {
                    cidr: ipv4,
                    protocol: Protocol.TCP,
                    port: this.clusterPort
                },
                {
                    cidr: ipv4,
                    protocol: Protocol.TCP,
                    port: this.httpsPort
                },
                {
                    cidr: ipv4,
                    protocol: Protocol.TCP,
                    port: this.remotePort
                } ]
            } ).flat()
        }

        const customEgress: boolean = ( this.props.nifiSecurityGroupEgressRules?.ipv4 && this.props.nifiSecurityGroupEgressRules?.ipv4.length > 0 ) ||
            ( this.props.nifiSecurityGroupEgressRules?.prefixList && this.props.nifiSecurityGroupEgressRules?.prefixList.length > 0 ) ||
            ( this.props.nifiSecurityGroupEgressRules?.sg && this.props.nifiSecurityGroupEgressRules?.sg.length > 0 ) || false
        const sgProps: CaefSecurityGroupProps = {
            securityGroupName: 'nifi',
            vpc: vpc,
            addSelfReferenceRule: true,
            naming: this.props.naming,
            allowAllOutbound: !customEgress,
            ingressRules: ingressRules,
            egressRules: this.props.nifiSecurityGroupEgressRules
        }
        return new CaefSecurityGroup( this, 'nifi-sg', sgProps )

    }

    public static createEfsSecurityGroup ( scope: Construct, naming: ICaefResourceNaming, vpc: IVpc, securityGroups?: ISecurityGroup[] ) {
        const efsSgIngressRules: CaefSecurityGroupRuleProps = {
            sg: securityGroups?.map( sg => {
                return {
                    sgId: sg.securityGroupId,
                    protocol: Protocol.TCP,
                    port: 2049
                }
            } )
        }

        const sgProps: CaefSecurityGroupProps = {
            securityGroupName: 'efs',
            vpc: vpc,
            addSelfReferenceRule: true,
            naming: naming,
            allowAllOutbound: true,
            ingressRules: efsSgIngressRules
        }
        return new CaefSecurityGroup( scope, 'efs-sg', sgProps )

    }
    public static createEfsAccessPolicy ( scope: Construct, naming: ICaefResourceNaming, kmsKey: IKey, efsPvs: [ FileSystem, AccessPoint ][] ): ManagedPolicy {
        const describeAzStatement = new PolicyStatement( {
            sid: "AllowDescribeAz",
            effect: Effect.ALLOW,
            actions: [
                "ec2:DescribeAvailabilityZones"
            ],
            resources: [
                "*"
            ]
        } )

        const efsKmsKeyStatement = new PolicyStatement( {
            sid: "AllowEfsKms",
            effect: Effect.ALLOW,
            actions: [
                "kms:Encrypt",
                "kms:Decrypt",
                "kms:ReEncrypt*",
                "kms:GenerateDataKey*",
                "kms:CreateGrant",
                "kms:DescribeKey"
            ],
            resources: [
                kmsKey.keyArn
            ]
        } )
        const describeEFSStatement = new PolicyStatement( {
            sid: `AllowDescribeEFS`,
            effect: Effect.ALLOW,
            actions: [
                "elasticfilesystem:DescribeAccessPoints",
                "elasticfilesystem:DescribeMountTargets",
                "elasticfilesystem:DescribeFileSystems",
            ],
            resources: [
                ...efsPvs.map( x => x[ 0 ].fileSystemArn ),
                ...efsPvs.map( x => x[ 1 ].accessPointArn ),
            ]
        } )
        const efsStatements = [
            describeEFSStatement,
            describeAzStatement,
            efsKmsKeyStatement
        ]

        const efsManagedPolicy = new ManagedPolicy( scope, `efs-access-policy`, {
            managedPolicyName: naming.resourceName( `efs-access`, 64 ),
            statements: efsStatements
        } )

        NagSuppressions.addResourceSuppressions( efsManagedPolicy, [ { id: 'AwsSolutions-IAM5', reason: 'Access Point Names not known at deployment time. Permissions restricted by condition.' } ] )
        return efsManagedPolicy
    }

    public static createEfsPvs ( scope: Construct, naming: ICaefResourceNaming, name: string, nodeCount: number, vpc: IVpc, subnets: ISubnet[], kmsKey: IKey, efsSecurityGroup: ISecurityGroup ): [ FileSystem, AccessPoint ][] {
        const efs = new FileSystem( scope, `efs-${ name }`, {
            fileSystemName: naming.resourceName( name, 256 ),
            vpc: vpc,
            vpcSubnets: {
                subnets: subnets
            },
            performanceMode: PerformanceMode.MAX_IO,
            securityGroup: efsSecurityGroup,
            encrypted: true,
            kmsKey: kmsKey
        } )
        NagSuppressions.addResourceSuppressions( efs, [
            {
                id: 'NIST.800.53.R5-EFSInBackupPlan',
                reason: 'CAEF does not enforce NIST.800.53.R5-EFSInBackupPlan on EFS volume.',
            },
            {
                id: 'HIPAA.Security-EFSInBackupPlan',
                reason: 'CAEF does not enforce HIPAA.Security-EFSInBackupPlan on EFS volume.',
            },
        ] );

        const efsPvs: [ FileSystem, AccessPoint ][] = [ ...Array( nodeCount ).keys() ].map( i => {
            const ap = new AccessPoint( scope, `${ name }-pv-ap-${ i }`, {
                fileSystem: efs,
                path: `/${ name }/${ i }`,
                posixUser: {
                    uid: "1000",
                    gid: "1000"
                },
                createAcl: {
                    ownerGid: "1000",
                    ownerUid: "1000",
                    permissions: "750"
                }
            } )
            return [ efs, ap ]
        } )
        return efsPvs
    }

    public static createSecret ( scope: Construct, id: string, naming: ICaefResourceNaming, secretName: string, kmsKey: IKey ): ISecret {
        const nifiSensitivePropSecret = new Secret( scope, id, {
            secretName: naming.resourceName( secretName, 255 ),
            encryptionKey: kmsKey,
            generateSecretString: {
                excludeCharacters: '\'',
                excludePunctuation: true
            }
        } )

        NagSuppressions.addResourceSuppressions( nifiSensitivePropSecret, [
            { id: "AwsSolutions-SMG4", reason: "Nifi does not support rotation of this secret" },
            { id: "NIST.800.53.R5-SecretsManagerRotationEnabled", reason: "Nifi does not support rotation of this secret" },
            { id: "HIPAA.Security-SecretsManagerRotationEnabled", reason: "Nifi does not support rotation of this secret" },
        ], true );
        return nifiSensitivePropSecret
    }

    public static createExternalSecretsServiceRole (
        scope: Construct,
        naming: ICaefResourceNaming,
        namespaceName: string,
        eksCluster: CaefEKSCluster,
        kmsKey: IKey,
        secrets: ISecret[] ): IRole {

        const externalSecretServiceRoleName = naming.resourceName( 'external-secrets-service-role', 64 )

        const kmsKeyStatement = new PolicyStatement( {
            sid: "KmsDecrypt",
            effect: Effect.ALLOW,
            actions: [
                "kms:Decrypt"
            ],
            resources: [ kmsKey.keyArn ],
        } )

        const secretsManagerStatement = new PolicyStatement( {
            sid: "GetSecretValue",
            effect: Effect.ALLOW,
            actions: [
                "SecretsManager:GetSecretValue"
            ],
            resources: secrets.map( x => x.secretArn ),
        } )

        const externalSecretsServiceRole = NifiCluster.createServiceRole( scope,
            'external-secrets',
            externalSecretServiceRoleName,
            namespaceName,
            eksCluster,
            [ kmsKeyStatement, secretsManagerStatement ] )

        return externalSecretsServiceRole

    }

    public static createServiceRole ( scope: Construct,
        id: string,
        roleName: string,
        namespaceName: string,
        eksCluster: CaefEKSCluster,
        statements?: PolicyStatement[],
        policyNagSuppressions?: NagSuppressionProps[] ): IRole {
        const serviceRole = new Role( scope, `${ id }-service-role`, {
            roleName: roleName,
            assumedBy: new PrincipalWithConditions( new OpenIdConnectPrincipal( eksCluster.iamOidcIdentityProvider ), {
                StringLike: new CfnJson( scope, `${ id }-service-role-assume-conditions`, {
                    value: {
                        [ `${ eksCluster.clusterOpenIdConnectIssuer }:aud` ]: "sts.amazonaws.com",
                        [ `${ eksCluster.clusterOpenIdConnectIssuer }:sub` ]: `system:serviceaccount:${ namespaceName }:*`
                    }
                } )
            } )
        } )
        if ( statements ) {
            const policy = new ManagedPolicy( scope, `${ id }-service-policy`, {
                managedPolicyName: roleName,
                roles: [ serviceRole ],
                statements: statements
            } )

            if ( policyNagSuppressions ) {
                NagSuppressions.addResourceSuppressions(
                    policy,
                    policyNagSuppressions,
                    true
                );
            }
        }

        return serviceRole
    }

}
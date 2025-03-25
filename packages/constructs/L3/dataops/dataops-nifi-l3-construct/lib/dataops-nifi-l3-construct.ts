/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaSecurityGroup, MdaaSecurityGroupProps, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import {
  KubernetesCmd,
  KubernetesCmdProps,
  MdaaEKSCluster,
  MdaaEKSClusterProps,
  MgmtInstanceProps,
} from '@aws-mdaa/eks-constructs';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { ISecurityGroup, ISubnet, IVpc, Port, Protocol, SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { CoreDnsComputeType, FargateProfile, KubernetesManifest, KubernetesVersion } from 'aws-cdk-lib/aws-eks';
import { Effect, IRole, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { HostedZone, PrivateHostedZone } from 'aws-cdk-lib/aws-route53';
import * as cdk8s from 'cdk8s';
import { Construct } from 'constructs';

import {
  CfnCertificate,
  CfnCertificateAuthority,
  CfnCertificateAuthorityActivation,
  CfnCertificateAuthorityProps,
} from 'aws-cdk-lib/aws-acmpca';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { CaIssuerChart } from './cdk8s/ca-chart';
import { ExternalDnsChart, ExternalDnsChartProps } from './cdk8s/external-dns-chart';
import * as k8s from './cdk8s/imports/k8s';
import { NifiRegistryChart, NifiRegistryChartProps } from './cdk8s/nifi-registry-chart';
import { ZookeeperChart } from './cdk8s/zookeeper-chart';
import { NifiCluster, NifiClusterProps } from './nifi-cluster';
import {
  AwsManagedPolicySpec,
  NamedNifiRegistryClientProps,
  NifiClusterOptions,
  NifiIdentityAuthorizationOptions,
  NifiNetworkOptions,
  PolicyAction,
} from './nifi-options';

export interface NifiClusterOptionsWithPeers extends NifiClusterOptions {
  /**
   * Other clusters within this module which will be provided SecurityGroup and Node remote access to this cluster.
   */
  readonly peerClusters?: string[];
}

export interface NamedNifiClusterOptions {
  /**
   * @jsii ignore
   */
  [name: string]: NifiClusterOptionsWithPeers;
}

export interface NifiProps {
  /**
   * If defined, an EC2 instance will be created with connectivity, permissions, and tooling to manage the EKS cluster
   */
  readonly mgmtInstance?: MgmtInstanceProps;

  /**
   * List of admin roles which will be provided access to EKS cluster resources
   */
  readonly adminRoles: MdaaRoleRef[];

  /**
   * VPC on which EKS and Nifi clusters will be deployed
   */
  readonly vpcId: string;

  /**
   * Subnets on which EKS and Nifi clusters will be deployed
   */
  readonly subnetIds: { [name: string]: string };

  /**
   * Ingress rules to be added to the EKS control plane security group
   */
  readonly eksSecurityGroupIngressRules?: MdaaSecurityGroupRuleProps;

  /**
   * Egress rules to be added to all Nifi cluster security groups.
   * These may also be specified for each cluster.
   */
  readonly securityGroupEgressRules?: MdaaSecurityGroupRuleProps;

  /**
   * Security groups which will be provided ingress access to all Nifi cluster security groups.
   * These may also be specified for each cluster.
   */
  readonly securityGroupIngressSGs?: string[];

  /**
   * IPv4 CIDRs which will be provided ingress access to all Nifi cluster security groups.
   * These may also be specified for each cluster.
   */
  readonly securityGroupIngressIPv4s?: string[];

  /**
   * Security groups which will be provided ingress access to all Nifi cluster EFS security groups.
   * These may also be specified for each cluster.
   */
  readonly additionalEfsIngressSecurityGroupIds?: string[];

  /**
   * Nifi cluster configurations to be created.
   */
  readonly clusters?: NamedNifiClusterOptions;

  /**
   * The certificate validity period for the internal CA cert. If using an ACM Private CA with short-term certificates,
   * this should be set to less than 7 days. Defaults to 6 days.
   */
  readonly caCertDuration?: string;
  /**
   * The time before CA cert expiration at which point the internal CA cert will be renewed.
   * Defaults to 12 hours.
   */
  readonly caCertRenewBefore?: string;
  /**
   * The certificate validity period for the Zookeeper and Nifi Node certs. If using an ACM Private CA with short-term certificates,
   * this should be set to less than 6 days. Defaults to 5 days.
   */
  readonly nodeCertDuration?: string;
  /**
   * The time before CA cert expiration at which point the Zookeeper and Nifi Node certs will be renewed.
   * Defaults to 12 hours.
   */
  readonly nodeCertRenewBefore?: string;
  /**
   * (Optional) If specified, this ACM Private CA will be used to sign the internal CA running
   * within EKS. If not specified, an ACM Private CA will be created.
   */
  readonly existingPrivateCaArn?: string;

  readonly certKeyAlg?: string;

  readonly certKeySize?: number;

  readonly registry?: NifiRegistryProps;
}

export type NifiRegistryBucketProps = {
  [key in PolicyAction]?: {
    readonly identities?: string[];
    readonly groups?: string[];
  };
};

export interface NifiRegistryProps extends NifiIdentityAuthorizationOptions, NifiNetworkOptions {
  /**
   * The tag of the Nifi docker image to use. If not specified,
   * defaults to the latest tested version (currently 1.25.0). Specify 'latest' to pull
   * the latest version (might be untested).
   */
  readonly registryImageTag?: string;

  /**
   * AWS managed policies which will be granted to the Nifi cluster role for access to AWS services.
   */
  readonly registryRoleAwsManagedPolicies?: AwsManagedPolicySpec[];
  /**
   * Customer managed policies which will be granted to the Nifi cluster role for access to AWS services.
   */
  readonly registryRoleManagedPolicies?: string[];
  /**
   * @jsii ignore
   */
  readonly buckets?: { [bucketName: string]: NifiRegistryBucketProps };
}

export interface NifiL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Arn of KMS key which will be used to encrypt the cluster resources
   */
  readonly kmsArn: string;
  /**
   * Nifi clusters to be created.
   */
  readonly nifi: NifiProps;
}

interface AddNifiServiceProps {
  eksCluster: MdaaEKSCluster;
  vpc: IVpc;
  subnets: ISubnet[];
  hostedZone: HostedZone;
  caIssuerCdk8sChart: CaIssuerChart;
  fargateProfile: FargateProfile;
}

interface AddNifiClustersProps extends AddNifiServiceProps {
  eksCluster: MdaaEKSCluster;
  zkK8sChart: ZookeeperChart;
  zkSecurityGroup: ISecurityGroup;
  dependencies: Construct[];
  nifiManagerImage: DockerImageAsset;
  registryUrl?: string;
}

interface AddNifiClusterProps {
  nifiClusterName: string;
  nifiClusterOptions: NifiClusterOptionsWithPeers;
  vpc: IVpc;
  subnets: ISubnet[];
  eksCluster: MdaaEKSCluster;
  hostedZone: HostedZone;
  zkK8sChart: ZookeeperChart;
  caIssuerCdk8sChart: CaIssuerChart;
  nifiManagerImage: DockerImageAsset;
  registryUrl?: string;
  fargateProfile: FargateProfile;
}

interface AddRegistryProps extends AddNifiServiceProps {
  registryProps: NifiRegistryProps;
  kmsKey: IKey;
  registryHostname: string;
  nifiClusters: { [clusterName: string]: NifiCluster };
  nifiManagerImageUri: string;
  dependencies: Construct[];
}

export class NifiL3Construct extends MdaaL3Construct {
  protected readonly props: NifiL3ConstructProps;
  private readonly projectKmsKey: IKey;

  private static readonly CERT_MANAGER_NAMESPACE = 'cert-manager';
  private static readonly EXTERNAL_DNS_NAMESPACE = 'external-dns';
  private static readonly EXTERNAL_SECRETS_NAMESPACE = 'external-secrets';
  private static readonly REGISTRY_NAMESPACE = 'registry';
  private static readonly ZOOKEEPER_NAMESPACE = 'zookeeper';

  constructor(scope: Construct, id: string, props: NifiL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.projectKmsKey = MdaaKmsKey.fromKeyArn(this.scope, 'project-kms', this.props.kmsArn);

    const vpc = Vpc.fromVpcAttributes(this, 'vpc', {
      vpcId: this.props.nifi.vpcId,
      availabilityZones: ['dummy'],
    });

    const subnets = Object.entries(this.props.nifi.subnetIds).map(entry => {
      return Subnet.fromSubnetId(this, `subnet-${entry[0]}`, entry[1]);
    });

    const clusterSecurityGroupProps: MdaaSecurityGroupProps = {
      securityGroupName: 'eks',
      vpc: vpc,
      addSelfReferenceRule: true,
      naming: props.naming,
      allowAllOutbound: true,
      ingressRules: props.nifi.eksSecurityGroupIngressRules,
    };
    const clusterSecurityGroup = new MdaaSecurityGroup(scope, 'cluster-sg', clusterSecurityGroupProps);

    const [privateCaArn, privateCa] = this.createAcmPca();
    const hostedZone = this.createHostedZone(vpc);
    const eksCluster = this.createEksCluster(vpc, subnets, this.projectKmsKey, clusterSecurityGroup, privateCaArn);

    const servicesFargateProfile = eksCluster.addFargateProfile('services-fargate-profile', {
      fargateProfileName: 'services',
      selectors: [
        {
          namespace: NifiL3Construct.EXTERNAL_DNS_NAMESPACE,
        },
        {
          namespace: NifiL3Construct.EXTERNAL_SECRETS_NAMESPACE,
        },
        {
          namespace: NifiL3Construct.CERT_MANAGER_NAMESPACE,
        },
        {
          namespace: NifiL3Construct.ZOOKEEPER_NAMESPACE,
        },
        {
          namespace: NifiL3Construct.REGISTRY_NAMESPACE,
        },
      ],
    });
    const nifiNamespaces = Object.entries(props.nifi.clusters || {}).map(cluster => {
      return {
        namespace: `nifi-${cluster[0]}`,
      };
    });
    if (nifiNamespaces.length > 0) {
      const nifiFargateProfile = eksCluster.addFargateProfile('nifi-fargate-profile', {
        fargateProfileName: 'nifi',
        selectors: nifiNamespaces,
      });

      const externalSecretsNamespaceManifest = eksCluster.addNamespace(
        new cdk8s.App(),
        'external-secrets-namespace',
        NifiL3Construct.EXTERNAL_SECRETS_NAMESPACE,
        clusterSecurityGroup,
      );
      externalSecretsNamespaceManifest.node.addDependency(servicesFargateProfile);
      const externalSecretsReadyCmd = this.addExternalSecrets(eksCluster, externalSecretsNamespaceManifest);

      const externalSecretsDnsManifest = eksCluster.addNamespace(
        new cdk8s.App(),
        'external-dns-namespace',
        NifiL3Construct.EXTERNAL_DNS_NAMESPACE,
        clusterSecurityGroup,
      );
      externalSecretsDnsManifest.node.addDependency(servicesFargateProfile);
      const externalDnsReady = this.addExternalDns(hostedZone, eksCluster, externalSecretsDnsManifest);

      const certManagerNamespaceManifest = eksCluster.addNamespace(
        new cdk8s.App(),
        'cert-manager-namespace',
        NifiL3Construct.CERT_MANAGER_NAMESPACE,
        clusterSecurityGroup,
      );
      certManagerNamespaceManifest.node.addDependency(servicesFargateProfile);
      const certManagerReady = this.addCertManager(eksCluster, certManagerNamespaceManifest);
      certManagerReady.node.addDependency(externalSecretsReadyCmd);

      const [caIssuerManifest, caIssuerCdk8sChart] = this.addCA(eksCluster, certManagerNamespaceManifest, privateCa);
      caIssuerManifest.node.addDependency(certManagerReady);

      const registryHostname = this.props.nifi.registry ? `nifi-registry.${hostedZone.zoneName}` : undefined;
      const registryUrl =
        this.props.nifi.registry && registryHostname
          ? `https://${registryHostname}:${this.props.nifi.registry?.httpsPort || 8443}`
          : undefined;

      const [zkManifest, zkK8sChart, zkSecurityGroup] = this.addZookeeper(
        vpc,
        subnets,
        this.projectKmsKey,
        eksCluster,
        hostedZone,
        caIssuerCdk8sChart,
        servicesFargateProfile,
      );
      zkManifest.node.addDependency(externalSecretsReadyCmd);
      zkManifest.node.addDependency(externalDnsReady);
      zkManifest.node.addDependency(caIssuerManifest);
      zkManifest.node.addDependency(certManagerReady);

      const nifiManagerImage = this.createNifiManagerImage();

      const nifiClusters = this.addNifiClusters({
        eksCluster: eksCluster,
        vpc: vpc,
        subnets: subnets,
        hostedZone: hostedZone,
        zkK8sChart: zkK8sChart,
        caIssuerCdk8sChart: caIssuerCdk8sChart,
        zkSecurityGroup: zkSecurityGroup,
        dependencies: [externalDnsReady, externalSecretsReadyCmd, certManagerReady, caIssuerManifest],
        nifiManagerImage: nifiManagerImage,
        registryUrl: registryUrl,
        fargateProfile: nifiFargateProfile,
      });

      if (this.props.nifi.registry && registryHostname) {
        this.addRegistry({
          registryProps: this.props.nifi.registry,
          vpc: vpc,
          subnets: subnets,
          kmsKey: this.projectKmsKey,
          eksCluster: eksCluster,
          registryHostname: registryHostname,
          hostedZone,
          caIssuerCdk8sChart,
          nifiClusters,
          nifiManagerImageUri: nifiManagerImage.imageUri,
          dependencies: [externalDnsReady, externalSecretsReadyCmd, certManagerReady, caIssuerManifest],
          fargateProfile: servicesFargateProfile,
        });
      }
    }
  }

  private addNifiClusters(addClusterProps: AddNifiClustersProps): { [clusterName: string]: NifiCluster } {
    const nifiClusters = Object.fromEntries(
      Object.entries(this.props.nifi.clusters || {}).map(nifiClusterEntry => {
        const nifiClusterName = nifiClusterEntry[0];
        const nifiClusterOptions = nifiClusterEntry[1];
        const nifiCluster = this.addNifiCluster({
          nifiClusterName: nifiClusterName,
          nifiClusterOptions: nifiClusterOptions,
          vpc: addClusterProps.vpc,
          subnets: addClusterProps.subnets,
          eksCluster: addClusterProps.eksCluster,
          hostedZone: addClusterProps.hostedZone,
          zkK8sChart: addClusterProps.zkK8sChart,
          caIssuerCdk8sChart: addClusterProps.caIssuerCdk8sChart,
          nifiManagerImage: addClusterProps.nifiManagerImage,
          registryUrl: addClusterProps.registryUrl,
          fargateProfile: addClusterProps.fargateProfile,
        });
        addClusterProps.dependencies.forEach(dependency => nifiCluster.nifiManifest.node.addDependency(dependency));
        return [nifiClusterName, { cluster: nifiCluster, options: nifiClusterOptions }];
      }),
    );

    Object.entries(nifiClusters).forEach(nifiClusterEntry => {
      const nifiClusterName = nifiClusterEntry[0];
      const nifiCluster = nifiClusterEntry[1];
      nifiCluster.cluster.node.addDependency(addClusterProps.zkK8sChart);
      addClusterProps.zkSecurityGroup.connections.allowFrom(nifiCluster.cluster.securityGroup, Port.tcp(2181));
      nifiCluster.options.peerClusters?.forEach(peerClusterName => {
        const peerCluster = nifiClusters[peerClusterName];
        if (!peerCluster) {
          throw new Error(`Unknown peer cluster ${peerClusterName} referenced by cluster ${nifiClusterName}`);
        }
        //Allow peer cluster to connect to this cluster
        nifiCluster.cluster.securityGroup.connections.allowFrom(
          peerCluster.cluster.securityGroup,
          Port.tcp(nifiCluster.cluster.remotePort),
        );
        nifiCluster.cluster.securityGroup.connections.allowFrom(
          peerCluster.cluster.securityGroup,
          Port.tcp(nifiCluster.cluster.httpsPort),
        );
      });
    });
    return Object.fromEntries(Object.entries(nifiClusters).map(x => [x[0], x[1].cluster]));
  }

  private addRegistry(addRegistryProps: AddRegistryProps) {
    const allIngressSgIds = [
      ...Object.entries(addRegistryProps.nifiClusters).map(x => x[1].securityGroup.securityGroupId),
      ...(this.props.nifi.securityGroupIngressSGs || []),
    ];

    const registryHttpsPort = addRegistryProps.registryProps.httpsPort ?? 8443;

    const ingressRules: MdaaSecurityGroupRuleProps = {
      sg: allIngressSgIds
        .map(sgId => {
          return [
            {
              sgId: sgId,
              protocol: Protocol.TCP,
              port: registryHttpsPort,
            },
          ];
        })
        .flat(),
      ipv4: this.props.nifi.securityGroupIngressIPv4s
        ?.map(ipv4 => {
          return [
            {
              cidr: ipv4,
              protocol: Protocol.TCP,
              port: registryHttpsPort,
            },
          ];
        })
        .flat(),
    };

    const registrySecurityGroupProps: MdaaSecurityGroupProps = {
      securityGroupName: 'registry',
      vpc: addRegistryProps.vpc,
      addSelfReferenceRule: true,
      naming: this.props.naming,
      allowAllOutbound: true,
      ingressRules: ingressRules,
    };
    const registrySecurityGroup = new MdaaSecurityGroup(this, 'registry-sg', registrySecurityGroupProps);

    const registryKeystorePasswordSecret = NifiCluster.createSecret(
      this,
      'registry-keystore-password-secret',
      this.props.naming,
      'registry-keystore-password',
      this.projectKmsKey,
    );
    const registryAdminCredentialsSecret = NifiCluster.createSecret(
      this,
      'registry-admin-creds-secret',
      this.props.naming,
      'registry-admin-creds-secret',
      addRegistryProps.kmsKey,
    );

    const kmsKeyStatement = new PolicyStatement({
      sid: 'KmsDecrypt',
      effect: Effect.ALLOW,
      actions: ['kms:Decrypt'],
      resources: [this.projectKmsKey.keyArn],
    });

    const secretsManagerStatement = new PolicyStatement({
      sid: 'GetSecretValue',
      effect: Effect.ALLOW,
      actions: ['SecretsManager:GetSecretValue'],
      resources: [registryKeystorePasswordSecret.secretArn, registryAdminCredentialsSecret.secretArn],
    });

    const externalSecretsServiceRole = NifiCluster.createServiceRole(
      this,
      'registry-external-secrets',
      this.props.naming.resourceName('registry-external-secrets-service-role', 64),
      NifiL3Construct.REGISTRY_NAMESPACE,
      addRegistryProps.eksCluster,
      [kmsKeyStatement, secretsManagerStatement],
    );

    const additionalEfsIngressSecurityGroups = this.props.nifi.additionalEfsIngressSecurityGroupIds?.map(id => {
      return SecurityGroup.fromSecurityGroupId(this, `registry-efs-ingress-sg-${id}`, id);
    });

    const efsSecurityGroup = NifiCluster.createEfsSecurityGroup(
      'registry',
      this,
      this.props.naming,
      addRegistryProps.vpc,
      [registrySecurityGroup, ...(additionalEfsIngressSecurityGroups || [])],
    );
    const registryEfsPvs = NifiCluster.createEfsPvs({
      scope: this,
      naming: this.props.naming,
      name: 'registry',
      nodeCount: 1,
      vpc: addRegistryProps.vpc,
      subnets: addRegistryProps.subnets,
      kmsKey: addRegistryProps.kmsKey,
      efsSecurityGroup: efsSecurityGroup,
    })[0];
    const efsManagedPolicy = NifiCluster.createEfsAccessPolicy(
      'registry',
      this,
      this.props.naming,
      this.projectKmsKey,
      [registryEfsPvs],
    );

    addRegistryProps.fargateProfile.podExecutionRole.addManagedPolicy(efsManagedPolicy);

    const registryNamespaceManifest = addRegistryProps.eksCluster.addNamespace(
      new cdk8s.App(),
      'registry-ns',
      NifiL3Construct.REGISTRY_NAMESPACE,
      registrySecurityGroup,
    );

    const clusterServiceRole = NifiCluster.createServiceRole(
      this,
      'registry-service-role',
      this.props.naming.resourceName('registry-service-role', 64),
      NifiL3Construct.REGISTRY_NAMESPACE,
      addRegistryProps.eksCluster,
    );

    const registryChartProps: NifiRegistryChartProps = {
      namespace: NifiL3Construct.REGISTRY_NAMESPACE,
      awsRegion: this.region,
      adminCredsSecretName: registryAdminCredentialsSecret.secretName,
      keystorePasswordSecretName: registryKeystorePasswordSecret.secretName,
      externalSecretsRoleArn: externalSecretsServiceRole.roleArn,
      efsPersistentVolume: { efsFsId: registryEfsPvs[0].fileSystemId, efsApId: registryEfsPvs[1].accessPointId },
      efsStorageClassName: addRegistryProps.eksCluster.efsStorageClassName,
      caIssuerName: addRegistryProps.caIssuerCdk8sChart.caIssuerName,
      hostname: addRegistryProps.registryHostname,
      hostedZoneName: addRegistryProps.hostedZone.zoneName,
      httpsPort: registryHttpsPort,
      nifiRegistryServiceRoleArn: clusterServiceRole.roleArn,
      nifiRegistryServiceRoleName: clusterServiceRole.roleName,
      nifiRegistryCertDuration: this.props.nifi.nodeCertDuration ?? '24h0m0s',
      nifiRegistryCertRenewBefore: this.props.nifi.nodeCertRenewBefore ?? '1h0m0s',
      certKeyAlg: this.props.nifi.certKeyAlg ?? 'ECDSA',
      certKeySize: this.props.nifi.certKeySize ?? 384,
      nifiClusters: addRegistryProps.nifiClusters,
      nifiManagerImageUri: addRegistryProps.nifiManagerImageUri,
      adminIdentities: addRegistryProps.registryProps.adminIdentities,
      buckets: addRegistryProps.registryProps.buckets,
    };
    const registryChart = new NifiRegistryChart(new cdk8s.App(), 'registry-chart', registryChartProps);
    const registryManifest = addRegistryProps.eksCluster.addCdk8sChart('registry', registryChart);
    registryManifest.node.addDependency(registryNamespaceManifest);
    const restartRegistryCmdProps: KubernetesCmdProps = {
      cluster: addRegistryProps.eksCluster,
      namespace: NifiL3Construct.REGISTRY_NAMESPACE,
      cmd: ['delete', 'pod', '-l', 'app=nifi-registry'],
      executionKey: registryChart.hash(),
    };
    const restartRegistryCmd = new KubernetesCmd(this, 'restart-registry-cmd', restartRegistryCmdProps);
    restartRegistryCmd.node.addDependency(registryManifest);
    addRegistryProps.dependencies.forEach(dependency => registryManifest.node.addDependency(dependency));
  }

  private addCA(
    eksCluster: MdaaEKSCluster,
    servicesNamespaceManifest: KubernetesManifest,
    privateCa?: CfnCertificateAuthorityActivation,
  ): [KubernetesManifest, CaIssuerChart] {
    const [rootClusterIssuerName, rootClusterIssuerReadyCmd] = this.addPrivateCAChart(
      eksCluster,
      servicesNamespaceManifest,
      privateCa,
    );

    const caKeystorePasswordSecret = NifiCluster.createSecret(
      this,
      'ca-keystore-password-secret',
      this.props.naming,
      'ca-keystore-password',
      this.projectKmsKey,
    );
    const caExternalSecretsRole = NifiCluster.createExternalSecretsServiceRole(
      this,
      'ca-external-secrets',
      this.props.naming,
      NifiL3Construct.CERT_MANAGER_NAMESPACE,
      eksCluster,
      this.projectKmsKey,
      [caKeystorePasswordSecret],
    );

    const caIssuerCdk8sChart = new CaIssuerChart(new cdk8s.App(), 'ca-issuer', {
      namespace: NifiL3Construct.CERT_MANAGER_NAMESPACE,
      awsRegion: this.region,
      keystorePasswordSecretName: caKeystorePasswordSecret.secretName,
      externalSecretsRoleArn: caExternalSecretsRole.roleArn,
      rootClusterIssuerName: rootClusterIssuerName,
      caCertDuration: this.props.nifi.caCertDuration ?? '144h0m0s',
      caCertRenewBefore: this.props.nifi.caCertRenewBefore ?? '48h0m0s',
      certKeyAlg: this.props.nifi.certKeyAlg ?? 'ECDSA',
      certKeySize: this.props.nifi.certKeySize ?? 384,
    });

    const caManifest = eksCluster.addCdk8sChart('ca-issuer', caIssuerCdk8sChart);

    caManifest.node.addDependency(rootClusterIssuerReadyCmd);
    return [caManifest, caIssuerCdk8sChart];
  }

  private createNifiManagerImage(): DockerImageAsset {
    return new DockerImageAsset(this, 'nifi-update-image', {
      directory: `${__dirname}/../docker/nifi-manager`,
    });
  }

  private computePeerNodeIdentities(addNifiClusterProps: AddNifiClusterProps) {
    return addNifiClusterProps.nifiClusterOptions.peerClusters
      ?.map(peerClusterName => {
        const peerClusterOptions = (this.props.nifi.clusters || {})[peerClusterName];
        if (!peerClusterOptions) {
          throw new Error(
            `Unknown peer cluster ${peerClusterName} referenced by cluster ${addNifiClusterProps.nifiClusterName}`,
          );
        }
        const peerNodeIds = [...Array(peerClusterOptions.nodeCount ?? 1).keys()];
        return peerNodeIds.map(peerNodeId => {
          return `CN=nifi-${peerNodeId}.nifi-${peerClusterName}.${addNifiClusterProps.hostedZone.zoneName}`;
        });
      })
      .flat();
  }

  private computeDefaultRegistryClient(addNifiClusterProps: AddNifiClusterProps) {
    return addNifiClusterProps.registryUrl
      ? {
          [this.props.naming.resourceName('registry')]: {
            url: addNifiClusterProps.registryUrl,
          },
        }
      : {};
  }
  private computeClusterSecurityGroups(addNifiClusterProps: AddNifiClusterProps) {
    return {
      securityGroupEgressRules: MdaaSecurityGroup.mergeRules(
        this.props.nifi.securityGroupEgressRules || {},
        addNifiClusterProps.nifiClusterOptions.securityGroupEgressRules || {},
      ),
      securityGroupIngressSGs: [
        ...(this.props.nifi.securityGroupIngressSGs || []),
        ...(addNifiClusterProps.nifiClusterOptions.securityGroupIngressSGs || []),
      ],
      securityGroupIngressIPv4s: [
        ...(this.props.nifi.securityGroupIngressIPv4s || []),
        ...(addNifiClusterProps.nifiClusterOptions.securityGroupIngressIPv4s || []),
      ],
      additionalEfsIngressSecurityGroupIds: [
        ...(this.props.nifi.additionalEfsIngressSecurityGroupIds || []),
        ...(addNifiClusterProps.nifiClusterOptions.additionalEfsIngressSecurityGroupIds || []),
      ],
    };
  }

  private computeClusterCertProps() {
    return {
      nifiCertDuration: this.props.nifi.nodeCertDuration ?? '24h0m0s',
      nifiCertRenewBefore: this.props.nifi.nodeCertRenewBefore ?? '1h0m0s',
      certKeyAlg: this.props.nifi.certKeyAlg ?? 'ECDSA',
      certKeySize: this.props.nifi.certKeySize ?? 384,
    };
  }

  private addNifiCluster(addNifiClusterProps: AddNifiClusterProps): NifiCluster {
    const peerNodeIdentities: string[] | undefined = this.computePeerNodeIdentities(addNifiClusterProps);

    const defaultRegistryClient: NamedNifiRegistryClientProps = this.computeDefaultRegistryClient(addNifiClusterProps);

    const clusterProps: NifiClusterProps = {
      ...addNifiClusterProps.nifiClusterOptions,
      eksCluster: addNifiClusterProps.eksCluster,
      clusterName: addNifiClusterProps.nifiClusterName,
      kmsKey: this.projectKmsKey,
      vpc: addNifiClusterProps.vpc,
      subnets: addNifiClusterProps.subnets,
      naming: this.props.naming.withModuleName(
        `${this.props.naming.props.moduleName}-${addNifiClusterProps.nifiClusterName}`,
      ),
      region: this.region,
      zkConnectString: addNifiClusterProps.zkK8sChart.zkConnectString,
      nifiHostedZone: addNifiClusterProps.hostedZone,
      nifiCAIssuerName: addNifiClusterProps.caIssuerCdk8sChart.caIssuerName,
      ...this.computeClusterCertProps(),
      nifiManagerImage: addNifiClusterProps.nifiManagerImage,
      externalNodeIdentities: [
        ...(addNifiClusterProps.nifiClusterOptions.externalNodeIdentities || []),
        ...(peerNodeIdentities || []),
      ],
      registryClients: {
        ...(addNifiClusterProps.nifiClusterOptions.registryClients || {}),
        ...defaultRegistryClient,
      },
      ...this.computeClusterSecurityGroups(addNifiClusterProps),
      fargateProfile: addNifiClusterProps.fargateProfile,
    };
    return new NifiCluster(this, `nifi-cluster-${addNifiClusterProps.nifiClusterName}`, clusterProps);
  }

  private addZookeeper(
    vpc: IVpc,
    subnets: ISubnet[],
    kmsKey: IKey,
    eksCluster: MdaaEKSCluster,
    hostedZone: HostedZone,
    caIssuerCdk8sChart: CaIssuerChart,
    fargateProfile: FargateProfile,
  ): [KubernetesManifest, ZookeeperChart, ISecurityGroup] {
    const zkSecurityGroupProps: MdaaSecurityGroupProps = {
      securityGroupName: 'zk',
      vpc: vpc,
      addSelfReferenceRule: true,
      naming: this.props.naming,
      allowAllOutbound: true,
      ingressRules: this.props.nifi.eksSecurityGroupIngressRules,
    };
    const zkSecurityGroup = new MdaaSecurityGroup(this, 'zk-sg', zkSecurityGroupProps);

    const zkCeystorePasswordSecret = NifiCluster.createSecret(
      this,
      'zk-keystore-password-secret',
      this.props.naming,
      'zk-keystore-password',
      this.projectKmsKey,
    );

    const kmsKeyStatement = new PolicyStatement({
      sid: 'KmsDecrypt',
      effect: Effect.ALLOW,
      actions: ['kms:Decrypt'],
      resources: [this.projectKmsKey.keyArn],
    });

    const secretsManagerStatement = new PolicyStatement({
      sid: 'GetSecretValue',
      effect: Effect.ALLOW,
      actions: ['SecretsManager:GetSecretValue'],
      resources: [zkCeystorePasswordSecret.secretArn],
    });

    const externalSecretsServiceRole = NifiCluster.createServiceRole(
      this,
      'zk-external-secrets',
      this.props.naming.resourceName('zk-external-secrets-service-role', 64),
      NifiL3Construct.ZOOKEEPER_NAMESPACE,
      eksCluster,
      [kmsKeyStatement, secretsManagerStatement],
    );

    const additionalEfsIngressSecurityGroups = this.props.nifi.additionalEfsIngressSecurityGroupIds?.map(id => {
      return SecurityGroup.fromSecurityGroupId(this, `zk-efs-ingress-sg-${id}`, id);
    });

    const efsSecurityGroup = NifiCluster.createEfsSecurityGroup('zookeeper', this, this.props.naming, vpc, [
      zkSecurityGroup,
      ...(additionalEfsIngressSecurityGroups || []),
    ]);
    const zkEfsPvs = NifiCluster.createEfsPvs({
      scope: this,
      naming: this.props.naming,
      name: 'zk',
      nodeCount: 3,
      vpc: vpc,
      subnets: subnets,
      kmsKey: kmsKey,
      efsSecurityGroup: efsSecurityGroup,
    });
    const efsManagedPolicy = NifiCluster.createEfsAccessPolicy(
      'zookeeper',
      this,
      this.props.naming,
      this.projectKmsKey,
      zkEfsPvs,
    );
    fargateProfile.podExecutionRole.addManagedPolicy(efsManagedPolicy);
    const zkNamespaceManifest = eksCluster.addNamespace(
      new cdk8s.App(),
      'zookeeper-ns',
      NifiL3Construct.ZOOKEEPER_NAMESPACE,
      zkSecurityGroup,
    );
    zkNamespaceManifest.node.addDependency(fargateProfile);

    const zkK8sChart = new ZookeeperChart(new cdk8s.App(), 'zookeeper-chart', {
      namespace: NifiL3Construct.ZOOKEEPER_NAMESPACE,
      hostedZoneName: hostedZone.zoneName,
      externalSecretsRoleArn: externalSecretsServiceRole.roleArn,
      caIssuerName: caIssuerCdk8sChart.caIssuerName,
      awsRegion: this.region,
      keystorePasswordSecretName: zkCeystorePasswordSecret.secretName,
      efsStorageClassName: eksCluster.efsStorageClassName,
      efsPersistentVolumes: zkEfsPvs.map(x => {
        return { efsFsId: x[0].fileSystemId, efsApId: x[1].accessPointId };
      }),
      zookeeperCertDuration: this.props.nifi.nodeCertDuration ?? '24h0m0s',
      zookeeperCertRenewBefore: this.props.nifi.nodeCertRenewBefore ?? '1h0m0s',
      certKeyAlg: this.props.nifi.certKeyAlg ?? 'ECDSA',
      certKeySize: this.props.nifi.certKeySize ?? 384,
    });
    const zkManifest = eksCluster.addCdk8sChart('zookeeper', zkK8sChart);
    zkManifest.node.addDependency(zkNamespaceManifest);
    zkManifest.node.addDependency(caIssuerCdk8sChart);
    const restartNifiCmdProps: KubernetesCmdProps = {
      cluster: eksCluster,
      namespace: NifiL3Construct.ZOOKEEPER_NAMESPACE,
      cmd: ['delete', 'pod', '-l', 'app=zookeeper'],
      executionKey: zkK8sChart.hash(),
    };
    const restartNifiCmd = new KubernetesCmd(this, 'restart-zk-cmd', restartNifiCmdProps);
    restartNifiCmd.node.addDependency(zkManifest);
    return [zkManifest, zkK8sChart, zkSecurityGroup];
  }

  private createHostedZone(vpc: IVpc): HostedZone {
    return new PrivateHostedZone(this, 'hosted-zone', {
      vpc: vpc,
      zoneName: `${this.props.naming.resourceName()}.internal`,
    });
  }

  private addExternalDns(
    hostedZone: HostedZone,
    eksCluster: MdaaEKSCluster,
    servicesNamespaceManifest: KubernetesManifest,
  ): KubernetesCmd {
    const externalDnsRole = this.createExternalDnsServiceRole(
      NifiL3Construct.EXTERNAL_DNS_NAMESPACE,
      eksCluster,
      hostedZone,
    );

    const chartProps: ExternalDnsChartProps = {
      namespace: NifiL3Construct.EXTERNAL_DNS_NAMESPACE,
      region: this.region,
      externalDnsRoleArn: externalDnsRole.roleArn,
    };
    const externalDnsManifest = eksCluster.addCdk8sChart(
      'external-dns',
      new ExternalDnsChart(new cdk8s.App(), 'external-dns', chartProps),
    );
    externalDnsManifest.node.addDependency(servicesNamespaceManifest);

    //Ensure External Dns is Ready
    const checkReadyProps: KubernetesCmdProps = {
      cluster: eksCluster,
      namespace: NifiL3Construct.EXTERNAL_DNS_NAMESPACE,
      cmd: ['get', 'deployment.apps', 'external-dns', '-o', "jsonpath='{.status.readyReplicas}'"],
      expectedOutput: '1',
    };
    const checkReadyCmd = new KubernetesCmd(this, 'check-external-dns-ready', checkReadyProps);
    checkReadyCmd.node.addDependency(externalDnsManifest);

    return checkReadyCmd;
  }

  private createEksCluster(
    vpc: IVpc,
    subnets: ISubnet[],
    kmsKey: IKey,
    clusterSecurityGroup: ISecurityGroup,
    privateCaArn: string,
  ): MdaaEKSCluster {
    const resolvedAdminRoles = this.props.roleHelper.resolveRoleRefsWithOrdinals(this.props.nifi.adminRoles, 'Admin');

    const adminRoles = resolvedAdminRoles.map(resolvedRole => {
      return Role.fromRoleArn(this, `admin-role-${resolvedRole.refId()}`, resolvedRole.arn());
    });

    const mgmtInstanceProps = this.createMgmtInstanceProps(privateCaArn);

    const clusterProps: MdaaEKSClusterProps = {
      mgmtInstance: mgmtInstanceProps,
      version: KubernetesVersion.V1_27,
      coreDnsComputeType: CoreDnsComputeType.FARGATE,
      adminRoles: adminRoles,
      kmsKey: kmsKey,
      vpc: vpc,
      subnets: subnets,
      naming: this.props.naming,
      securityGroup: clusterSecurityGroup,
    };

    return new MdaaEKSCluster(this, 'eks-cluster', clusterProps);
  }
  private createMgmtInstanceProps(privateCaArn: string): MgmtInstanceProps | undefined {
    if (this.props.nifi.mgmtInstance) {
      const mgmtInstanceKeystorePasswordSecret = NifiCluster.createSecret(
        this,
        'mgmt-instance-keystore-secret',
        this.props.naming,
        'mgmt-instance-keystore-password',
        this.projectKmsKey,
      );
      const secretsManagerStatement = new PolicyStatement({
        sid: 'GetSecretValue',
        effect: Effect.ALLOW,
        actions: ['SecretsManager:GetSecretValue'],
        resources: [mgmtInstanceKeystorePasswordSecret.secretFullArn || mgmtInstanceKeystorePasswordSecret.secretArn],
      });
      const projectKmsStatement = new PolicyStatement({
        sid: 'ProjectKms',
        effect: Effect.ALLOW,
        actions: ['kms:Decrypt'],
        resources: [this.projectKmsKey.keyArn],
      });
      const issueCertStatement = new PolicyStatement({
        sid: 'IssueCert',
        effect: Effect.ALLOW,
        actions: ['acm-pca:IssueCertificate', 'acm-pca:GetCertificate'],
        resources: [privateCaArn],
      });
      return {
        ...this.props.nifi.mgmtInstance,
        mgmtPolicyStatements: [secretsManagerStatement, issueCertStatement, projectKmsStatement],
        userDataCommands: [
          ...(this.props.nifi.mgmtInstance?.userDataCommands ?? []),
          `yum install -y java-21-amazon-corretto.x86_64`,
          `aws secretsmanager get-secret-value --secret-id ${mgmtInstanceKeystorePasswordSecret.secretArn} |jq -r '.SecretString' > /tmp/keystore-passwd`,
          `openssl ecparam -name secp384r1 -genkey -noout -out /root/mgmt-instance.key.pem`,
          `openssl req -new -sha256 -key /root/mgmt-instance.key.pem -out /root/mgmt-instance.csr -subj "/CN=mgmt-instance"`,
          `aws acm-pca issue-certificate --certificate-authority-arn ${privateCaArn} --csr fileb:///root/mgmt-instance.csr  --signing-algorithm "SHA512WITHECDSA" --validity Value=7,Type="DAYS"|jq -r '.CertificateArn' > /tmp/certificate-arn`,
          `cd /root && wget https://dlcdn.apache.org/nifi/1.25.0/nifi-toolkit-1.25.0-bin.zip && unzip nifi-toolkit-1.25.0-bin.zip && mv /root/nifi-toolkit-1.25.0 /opt/nifi-toolkit`,
          `export CERT_ARN=\`cat /tmp/certificate-arn\` && aws acm-pca get-certificate --certificate-authority-arn ${privateCaArn} --certificate-arn $CERT_ARN | jq -r .Certificate > /root/mgmt-instance.cert.pem`,
          `export CERT_ARN=\`cat /tmp/certificate-arn\` && aws acm-pca get-certificate --certificate-authority-arn ${privateCaArn} --certificate-arn $CERT_ARN | jq -r .CertificateChain > /root/ca.cert.pem`,
          `openssl pkcs12 -export -in /root/mgmt-instance.cert.pem -inkey /root/mgmt-instance.key.pem -out /opt/nifi-toolkit/conf/mgmt-instance.cert.p12 -name mgmt-instance -password pass:\`cat /tmp/keystore-passwd\``,
          ``,
        ],
      };
    } else {
      return undefined;
    }
  }

  private addExternalSecrets(eksCluster: MdaaEKSCluster, servicesNamespaceManifest: KubernetesManifest): KubernetesCmd {
    const externalSecretsHelm = eksCluster.addHelmChart('external-secrets-helm', {
      repository: 'https://charts.external-secrets.io',
      chart: 'external-secrets',
      version: '0.9.5',
      release: 'external-secrets',
      namespace: NifiL3Construct.EXTERNAL_SECRETS_NAMESPACE,
      createNamespace: false,
      values: {
        installCRDs: true,
        tolerations: [
          {
            key: 'eks.amazonaws.com/compute-type',
            value: 'fargate',
          },
        ],
        webhook: {
          port: 9443,
        },
      },
    });
    externalSecretsHelm.node.addDependency(servicesNamespaceManifest);
    //Ensure External Secrets is Ready
    const checkReadyProps: KubernetesCmdProps = {
      cluster: eksCluster,
      namespace: NifiL3Construct.EXTERNAL_SECRETS_NAMESPACE,
      cmd: ['get', 'deployment.apps', 'external-secrets-webhook', '-o', "jsonpath='{.status.readyReplicas}'"],
      expectedOutput: '1',
    };
    const checkReadyCmd = new KubernetesCmd(this, 'check-external-secrets-ready', checkReadyProps);
    checkReadyCmd.node.addDependency(externalSecretsHelm);
    return checkReadyCmd;
  }

  private createAcmPca(): [string, CfnCertificateAuthorityActivation | undefined] {
    if (this.props.nifi.existingPrivateCaArn) {
      return [this.props.nifi.existingPrivateCaArn, undefined];
    }
    const pcaProps: CfnCertificateAuthorityProps = {
      keyAlgorithm: 'EC_secp384r1',
      signingAlgorithm: 'SHA512WITHECDSA',
      type: 'ROOT',
      subject: {
        commonName: this.props.naming.resourceName(),
        organization: this.props.naming.props.org,
        organizationalUnit: this.props.naming.props.domain,
      },
      usageMode: 'SHORT_LIVED_CERTIFICATE',
    };

    const pca = new CfnCertificateAuthority(this, 'acm-pca', pcaProps);

    const caCert = new CfnCertificate(this, 'acm-pca-cert', {
      certificateAuthorityArn: pca.attrArn,
      certificateSigningRequest: pca.attrCertificateSigningRequest,
      signingAlgorithm: 'SHA512WITHECDSA',
      validity: {
        type: 'YEARS',
        value: 10,
      },
      templateArn: `arn:${this.partition}:acm-pca:::template/RootCACertificate/V1`,
    });

    const pcaAct = new CfnCertificateAuthorityActivation(this, 'acm-pca-activation', {
      certificateAuthorityArn: pca.attrArn,
      certificate: caCert.attrCertificate,
      status: 'ACTIVE',
    });
    return [pcaAct.certificateAuthorityArn, pcaAct];
  }

  private addPrivateCAChart(
    eksCluster: MdaaEKSCluster,
    servicesNamespaceManifest: KubernetesManifest,
    privateCa?: CfnCertificateAuthorityActivation,
  ): [string, Construct] {
    let privateCaArn: string;
    if (privateCa) {
      privateCaArn = privateCa.certificateAuthorityArn;
    } else {
      /* istanbul ignore next */
      if (!this.props.nifi.existingPrivateCaArn) {
        throw new Error('Impossible condition');
      }
      privateCaArn = this.props.nifi.existingPrivateCaArn;
    }

    const acmPcaStatement = new PolicyStatement({
      sid: 'awspcaissuer',
      actions: ['acm-pca:DescribeCertificateAuthority', 'acm-pca:GetCertificate', 'acm-pca:IssueCertificate'],
      effect: Effect.ALLOW,
      resources: [privateCaArn],
    });

    const serviceRole = NifiCluster.createServiceRole(
      this,
      'private-ca-service-role',
      this.props.naming.resourceName('private-ca-svc', 64),
      NifiL3Construct.CERT_MANAGER_NAMESPACE,
      eksCluster,
      [acmPcaStatement],
    );

    const serviceAccountChart = new (class extends cdk8s.Chart {
      public serviceAccountName: string;
      constructor(scope: Construct, id: string) {
        super(scope, id);
        const serviceAccount = new k8s.KubeServiceAccount(this, 'service-account', {
          metadata: {
            name: 'private-ca-service-account',
            namespace: NifiL3Construct.CERT_MANAGER_NAMESPACE,
            labels: {
              'app.kubernetes.io/name': 'private-ca',
            },
            annotations: {
              'eks.amazonaws.com/role-arn': serviceRole.roleArn,
            },
          },
        });
        this.serviceAccountName = serviceAccount.name;
      }
    })(new cdk8s.App(), 'private-ca-service-account-chart');

    const serviceAccountManifest = eksCluster.addCdk8sChart('private-ca-service-account', serviceAccountChart);
    serviceAccountManifest.node.addDependency(servicesNamespaceManifest);

    const pcaManagerHelm = eksCluster.addHelmChart('private-ca-helm', {
      repository: 'https://cert-manager.github.io/aws-privateca-issuer',
      chart: 'aws-privateca-issuer',
      version: '1.2.5',
      release: 'aws-privateca-issuer',
      namespace: NifiL3Construct.CERT_MANAGER_NAMESPACE,
      createNamespace: false,
      values: {
        installCRDs: true,
        tolerations: [
          {
            key: 'eks.amazonaws.com/compute-type',
            value: 'fargate',
          },
        ],
        serviceAccount: {
          create: false,
          name: serviceAccountChart.serviceAccountName,
        },
      },
    });

    pcaManagerHelm.node.addDependency(serviceAccountManifest);

    if (privateCa) {
      pcaManagerHelm.node.addDependency(privateCa);
    }

    const pcaClusterIssuerChart = new (class extends cdk8s.Chart {
      public readonly clusterIssuerName: string;
      constructor(scope: Construct, id: string, privateCaArn: string, region: string) {
        super(scope, id);
        const clusterIssuer = new cdk8s.ApiObject(this, 'private-ca-cluster-issuer', {
          apiVersion: 'awspca.cert-manager.io/v1beta1',
          kind: 'AWSPCAClusterIssuer',
          metadata: {
            name: 'private-ca-cluster-issuer',
          },
          spec: {
            arn: privateCaArn,
            region: region,
          },
        });
        this.clusterIssuerName = clusterIssuer.name;
      }
    })(new cdk8s.App(), 'private-ca-cluster-issuer-chart', privateCaArn, this.region);
    const clusterIssuerManifest = eksCluster.addCdk8sChart('private-ca-cluster-issuer-chart', pcaClusterIssuerChart);
    clusterIssuerManifest.node.addDependency(pcaManagerHelm);

    //Ensure PCA Cluster Issuer is Ready
    const checkPcaClusterIssuerReadyProps: KubernetesCmdProps = {
      cluster: eksCluster,
      namespace: NifiL3Construct.CERT_MANAGER_NAMESPACE,
      cmd: [
        'get',
        'awspcaclusterissuer',
        'private-ca-cluster-issuer',
        '-o',
        'jsonpath="{.status.conditions[?(@.type==\'Ready\')].status }"',
      ],
      expectedOutput: 'True',
    };
    const checkPcaClusterIssuerReadyCmd = new KubernetesCmd(
      this,
      'check-pca-cluster-issuer-ready',
      checkPcaClusterIssuerReadyProps,
    );
    checkPcaClusterIssuerReadyCmd.node.addDependency(clusterIssuerManifest);

    return [pcaClusterIssuerChart.clusterIssuerName, checkPcaClusterIssuerReadyCmd];
  }

  private addCertManager(eksCluster: MdaaEKSCluster, servicesNamespaceManifest: KubernetesManifest): KubernetesCmd {
    const certManagerHelm = eksCluster.addHelmChart('cert-manager-helm', {
      repository: 'https://charts.jetstack.io',
      chart: 'cert-manager',
      version: '1.13.0',
      release: 'cert-manager',
      namespace: NifiL3Construct.CERT_MANAGER_NAMESPACE,
      createNamespace: false,
      values: {
        namespace: NifiL3Construct.CERT_MANAGER_NAMESPACE,
        installCRDs: true,
        global: {
          tolerations: [
            {
              key: 'eks.amazonaws.com/compute-type',
              value: 'fargate',
            },
          ],
        },
        webhook: {
          securePort: 10260,
          tolerations: [
            {
              key: 'eks.amazonaws.com/compute-type',
              value: 'fargate',
            },
          ],
        },
        cainjector: {
          tolerations: [
            {
              key: 'eks.amazonaws.com/compute-type',
              value: 'fargate',
            },
          ],
        },
      },
    });
    certManagerHelm.node.addDependency(servicesNamespaceManifest);
    //Ensure External Secrets is Ready
    const checkReadyProps: KubernetesCmdProps = {
      cluster: eksCluster,
      namespace: NifiL3Construct.CERT_MANAGER_NAMESPACE,
      cmd: ['get', 'deployment.apps', 'cert-manager-webhook', '-o', "jsonpath='{.status.readyReplicas}'"],
      expectedOutput: '1',
    };
    const checkReadyCmd = new KubernetesCmd(this, 'check-cert-manager-ready', checkReadyProps);
    checkReadyCmd.node.addDependency(certManagerHelm);
    return checkReadyCmd;
  }

  private createExternalDnsServiceRole(namespaceName: string, eksCluster: MdaaEKSCluster, zone: HostedZone): IRole {
    const route53UpdateStatement = new PolicyStatement({
      sid: 'Route53Update',
      effect: Effect.ALLOW,
      actions: ['route53:ChangeResourceRecordSets'],
      resources: [zone.hostedZoneArn],
    });

    const route53ListStatement = new PolicyStatement({
      sid: 'Route53List',
      effect: Effect.ALLOW,
      actions: ['route53:ListHostedZones', 'route53:ListResourceRecordSets', 'route53:ListTagsForResource'],
      resources: ['*'],
    });

    const suppressions = [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Access Point Names not known at deployment time. Permissions restricted by condition.',
      },
    ];
    return NifiCluster.createServiceRole(
      this,
      'external-dns',
      this.props.naming.resourceName('external-dns-service-role', 64),
      namespaceName,
      eksCluster,
      [route53UpdateStatement, route53ListStatement],
      suppressions,
    );
  }
}

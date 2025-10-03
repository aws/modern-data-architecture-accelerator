/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaSecurityGroup, MdaaSecurityGroupProps, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { KubernetesCmd, KubernetesCmdProps, MdaaEKSCluster } from '@aws-mdaa/eks-constructs';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { CfnJson } from 'aws-cdk-lib';
import { ISecurityGroup, ISubnet, IVpc, Protocol, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { DockerImageAsset } from 'aws-cdk-lib/aws-ecr-assets';
import { AccessPoint, FileSystem, PerformanceMode } from 'aws-cdk-lib/aws-efs';
import { FargateProfile, KubernetesManifest } from 'aws-cdk-lib/aws-eks';
import {
  Effect,
  IRole,
  ManagedPolicy,
  OpenIdConnectPrincipal,
  PolicyStatement,
  PrincipalWithConditions,
  Role,
} from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { IHostedZone } from 'aws-cdk-lib/aws-route53';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { NagPackSuppression } from 'cdk-nag';
import * as cdk8s from 'cdk8s';
import { Construct } from 'constructs';
import { NifiClusterChart, NodeResources } from './cdk8s/nifi-cluster-chart';
import {
  NamedNifiRegistryClientProps,
  NifiClusterOptions,
  NifiIdentityAuthorizationOptions,
  NifiNetworkOptions,
  NodeSize,
} from './nifi-options';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { USER_ACTIONS } from '@aws-mdaa/kms-constructs';

export interface NifiClusterProps extends NifiClusterOptions, NifiIdentityAuthorizationOptions, NifiNetworkOptions {
  readonly eksCluster: MdaaEKSCluster;
  readonly clusterName: string;
  readonly kmsKey: IKey;
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC for NiFi cluster deployment providing network isolation and security controls. Specifies the VPC where NiFi cluster will be deployed for secure networking and integration with other VPC resources.
   *
   * Use cases: Network isolation; VPC integration; Security controls; Private networking
   *
   * AWS: Amazon VPC for NiFi cluster network isolation and security controls
   *
   * Validation: Must be valid IVpc instance; required for NiFi network deployment and security
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html
   **/
  readonly vpc: IVpc;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of subnets for NiFi node placement within the VPC enabling multi-AZ deployment and availability. Specifies the subnets where NiFi nodes will be deployed for high availability and fault tolerance.
   *
   * Use cases: Multi-AZ deployment; High availability; Fault tolerance; Subnet placement
   *
   * AWS: VPC subnets for NiFi node placement and multi-AZ deployment
   *
   * Validation: Must be array of valid ISubnet instances; required for NiFi node placement and availability
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.ISubnet.html
   **/
  readonly subnets: ISubnet[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required MDAA resource naming implementation for consistent NiFi resource naming conventions. Provides standardized naming patterns for all NiFi-related resources including services, volumes, and configurations.
   *
   * Use cases: Resource naming consistency; Operational management; Resource identification; Naming standardization
   *
   * AWS: Resource naming conventions for NiFi cluster resources and components
   *
   * Validation: Must be valid IMdaaResourceNaming implementation; required for consistent resource naming
   *   **/
  readonly naming: IMdaaResourceNaming;
  /**
   * Q-ENHANCED-PROPERTY
   * Required AWS region for NiFi cluster deployment enabling region-specific resource configuration and compliance. Specifies the target AWS region for NiFi deployment affecting resource availability and compliance requirements.
   *
   * Use cases: Regional deployment; Compliance requirements; Resource availability; Geographic distribution
   *
   * AWS: AWS region specification for NiFi cluster deployment and resource configuration
   *
   * Validation: Must be valid AWS region string; required for regional deployment and resource configuration
   **/
  readonly region: string;
  readonly zkConnectString: string;
  readonly nifiHostedZone: IHostedZone;
  readonly nifiCAIssuerName: string;
  readonly nifiCertDuration: string;
  readonly nifiCertRenewBefore: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required certificate key algorithm specification for NiFi TLS certificate cryptographic configuration. Defines the cryptographic algorithm used for certificate key generation affecting security strength and compatibility.
   *
   * Use cases: Cryptographic configuration; Security strength; Algorithm selection; Certificate generation
   *
   * AWS: Certificate key algorithm for NiFi TLS certificate cryptographic configuration
   *
   * Validation: Must be valid key algorithm string; required for NiFi certificate cryptographic configuration
   **/
  readonly certKeyAlg: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required certificate key size specification for NiFi TLS certificate cryptographic strength. Defines the key size in bits for certificate generation affecting security level and computational requirements.
   *
   * Use cases: Cryptographic strength; Security level; Key size configuration; Certificate security
   *
   * AWS: Certificate key size for NiFi TLS certificate cryptographic strength configuration
   *
   * Validation: Must be valid key size number; required for NiFi certificate cryptographic strength
   **/
  readonly certKeySize: number;
  readonly nifiManagerImage: DockerImageAsset;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional named NiFi registry client configurations for external registry integration enabling centralized flow management. Provides registry client configurations for connecting to external NiFi registries for flow versioning and sharing.
   *
   * Use cases: Registry integration; Flow versioning; Centralized management; Flow sharing
   *
   * AWS: NiFi registry client configuration for external registry integration and flow management
   *
   * Validation: Must be valid NamedNifiRegistryClientProps if provided; enables registry integration when specified
   **/
  readonly registryClients?: NamedNifiRegistryClientProps;
  readonly fargateProfile: FargateProfile;
}

interface CreateEfsPvsProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required CDK construct scope for EFS resource creation enabling proper resource hierarchy and management. Provides the parent construct context for EFS file system and mount target creation within the CDK application structure.
   *
   * Use cases: Resource hierarchy; CDK construct management; Resource organization; Parent context
   *
   * AWS: CDK construct scope for EFS resource creation and management hierarchy
   *
   * Validation: Must be valid Construct instance; required for EFS resource creation and hierarchy
   */
  scope: Construct;
  /**
   * Q-ENHANCED-PROPERTY
   * Required MDAA resource naming implementation for consistent EFS resource naming conventions. Provides standardized naming patterns for EFS file systems, mount targets, and access points following organizational naming standards.
   *
   * Use cases: Resource naming consistency; Operational management; EFS identification; Naming standardization
   *
   * AWS: Resource naming conventions for EFS file system and related resources
   *
   * Validation: Must be valid IMdaaResourceNaming implementation; required for consistent EFS resource naming
   */
  naming: IMdaaResourceNaming;
  /**
   * Q-ENHANCED-PROPERTY
   * Required name identifier for the EFS persistent volume enabling volume identification and management. Provides the base name for EFS resources and serves as the primary identifier for persistent volume operations and management.
   *
   * Use cases: Volume identification; Resource management; EFS naming; Storage organization
   *
   * AWS: EFS file system name for identification and management operations
   *
   * Validation: Must be valid name string; required for EFS volume identification and management
   */
  name: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required number of NiFi nodes requiring EFS access enabling proper mount target and access point configuration. Specifies the node count for EFS access configuration affecting mount target distribution and performance optimization.
   *
   * Use cases: Node count configuration; Mount target planning; Access optimization; Performance tuning
   *
   * AWS: EFS mount target configuration based on NiFi node count and access requirements
   *
   * Validation: Must be positive integer; required for EFS access configuration and mount target planning
   */
  nodeCount: number;
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC for EFS file system deployment providing network isolation and security controls. Specifies the VPC where EFS mount targets will be created for secure file system access from NiFi nodes.
   *
   * Use cases: Network isolation; VPC integration; Security controls; File system networking
   *
   * AWS: Amazon VPC for EFS file system network isolation and mount target deployment
   *
   * Validation: Must be valid IVpc instance; required for EFS network deployment and security
   */
  vpc: IVpc;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of subnets for EFS mount target placement enabling multi-AZ file system access. Specifies the subnets where EFS mount targets will be deployed for high availability and fault tolerance.
   *
   * Use cases: Multi-AZ deployment; High availability; Mount target placement; Fault tolerance
   *
   * AWS: VPC subnets for EFS mount target placement and multi-AZ file system access
   *
   * Validation: Must be array of valid ISubnet instances; required for EFS mount target placement
   */
  subnets: ISubnet[];
  kmsKey: IKey;
  efsSecurityGroup: ISecurityGroup;
}

export class NifiCluster extends Construct {
  private readonly props: NifiClusterProps;
  public readonly nifiManifest: KubernetesManifest;
  public readonly securityGroup: ISecurityGroup;
  public readonly httpsPort: number;
  public readonly remotePort: number;
  public readonly clusterPort: number;
  public readonly nodeList: string[];
  public readonly adminIdentities: string[];

  private static nodeSizeMap: { [key in NodeSize]: NodeResources } = {
    SMALL: {
      memory: '2Gi',
      cpu: '1',
    },
    MEDIUM: {
      memory: '4Gi',
      cpu: '2',
    },
    LARGE: {
      memory: '8Gi',
      cpu: '4',
    },
    XLARGE: {
      memory: '16Gi',
      cpu: '8',
    },
    '2XLARGE': {
      memory: '32Gi',
      cpu: '16',
    },
  };

  constructor(scope: Construct, id: string, props: NifiClusterProps) {
    super(scope, id);
    this.props = props;
    const nifiNamespaceName = `nifi-${props.clusterName}`;
    this.httpsPort = this.props.httpsPort ?? 8443;
    this.remotePort = this.props.remotePort ?? 10000;
    this.clusterPort = this.props.clusterPort ?? 14443;
    const nodeCount = props.nodeCount ?? 1;
    this.adminIdentities = props.adminIdentities;
    this.securityGroup = this.createNifiSecurityGroup(props.vpc);

    const additionalEfsIngressSecurityGroups = props.additionalEfsIngressSecurityGroupIds?.map(id => {
      return SecurityGroup.fromSecurityGroupId(this, `nifi-cluster-efs-ingress-sg-${id}`, id);
    });

    const efsSecurityGroup = NifiCluster.createEfsSecurityGroup('nifi-cluster', this, props.naming, props.vpc, [
      this.securityGroup,
      ...(additionalEfsIngressSecurityGroups || []),
    ]);

    const nifiEfsPvs = NifiCluster.createEfsPvs({
      scope: this,
      naming: props.naming,
      name: 'nifi',
      nodeCount: nodeCount,
      vpc: props.vpc,
      subnets: props.subnets,
      kmsKey: props.kmsKey,
      efsSecurityGroup: efsSecurityGroup,
    });
    const efsManagedPolicy = NifiCluster.createEfsAccessPolicy(
      'nifi-cluster',
      this,
      props.naming,
      props.kmsKey,
      nifiEfsPvs,
    );

    props.fargateProfile.podExecutionRole.addManagedPolicy(efsManagedPolicy);

    const nifiAdminCredentialsSecret = NifiCluster.createSecret(
      this,
      'nifi-admin-creds-secret',
      props.naming,
      'admin-creds-secret',
      props.kmsKey,
    );
    const nifiSensitivePropSecret = NifiCluster.createSecret(
      this,
      'nifi-sensitive-props-secret',
      props.naming,
      'sensitive-props-key',
      props.kmsKey,
    );
    const keystorePasswordSecret = NifiCluster.createSecret(
      this,
      'keystore-password-secret',
      props.naming,
      'keystore-password',
      props.kmsKey,
    );

    const externalSecretsRole = NifiCluster.createExternalSecretsServiceRole(
      this,
      'external-secrets',
      props.naming,
      nifiNamespaceName,
      props.eksCluster,
      props.kmsKey,
      [nifiSensitivePropSecret, keystorePasswordSecret, nifiAdminCredentialsSecret],
    );

    const clusterServiceRole = NifiCluster.createServiceRole(
      this,
      'nifi-service-role',
      props.naming.resourceName('nifi-service-role', 64),
      nifiNamespaceName,
      props.eksCluster,
    );

    this.props.clusterRoleAwsManagedPolicies?.forEach(managedPolicySpec => {
      const managedPolicy = ManagedPolicy.fromAwsManagedPolicyName(managedPolicySpec.policyName);
      clusterServiceRole.addManagedPolicy(managedPolicy);
      MdaaNagSuppressions.addCodeResourceSuppressions(clusterServiceRole, [
        {
          id: 'AwsSolutions-IAM4',
          reason: managedPolicySpec.suppressionReason,
        },
      ]);
    });

    this.props.clusterRoleManagedPolicies?.forEach(managedPolicyName => {
      const managedPolicy = ManagedPolicy.fromManagedPolicyName(
        this,
        `imported-policy-${managedPolicyName}`,
        managedPolicyName,
      );
      clusterServiceRole.addManagedPolicy(managedPolicy);
    });

    const nodeSize = NifiCluster.nodeSizeMap[this.props.nodeSize || 'SMALL'];

    this.props.nifiManagerImage.repository.grantPull(props.fargateProfile.podExecutionRole);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      props.fargateProfile.podExecutionRole,
      [
        { id: 'AwsSolutions-IAM5', reason: 'ecr:GetAuthorizationToken does not accept a resource.' },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Permissions are appropriate as inline policy.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Permissions are appropriate as inline policy.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Permissions are appropriate as inline policy.' },
      ],
      true,
    );

    const nifiK8sChart = new NifiClusterChart(new cdk8s.App(), 'nifi-chart', {
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
      efsPersistentVolumes: nifiEfsPvs.map(x => {
        return { efsFsId: x[0].fileSystemId, efsApId: x[1].accessPointId };
      }),
      efsStorageClassName: props.eksCluster.efsStorageClassName,
      saml: props.saml ? { ...props.saml, entityId: `org:apache:nifi:saml:sp-${props.clusterName}` } : undefined,
      hostedZoneName: props.nifiHostedZone.zoneName,
      zkConnectString: props.zkConnectString,
      zkRootNode: `/nifi/${props.clusterName}`,
      httpsPort: this.httpsPort,
      remotePort: this.remotePort,
      clusterPort: this.clusterPort,
      caIssuerName: this.props.nifiCAIssuerName,
      nifiServiceRoleArn: clusterServiceRole.roleArn,
      nifiServiceRoleName: clusterServiceRole.roleName,
      nifiCertDuration: this.props.nifiCertDuration,
      nifiCertRenewBefore: this.props.nifiCertRenewBefore,
      certKeyAlg: this.props.certKeyAlg ?? 'ECDSA',
      certKeySize: this.props.certKeySize ?? '384',
      nifiManagerImageUri: props.nifiManagerImage.imageUri,
      adminIdentities: props.adminIdentities,
      externalNodeIdentities: props.externalNodeIdentities,
      identities: props.identities,
      groups: props.groups,
      authorizations: props.authorizations,
      registryClients: props.registryClients,
    });
    this.nodeList = nifiK8sChart.nodeList.map(nodeName => `${nodeName}.${nifiK8sChart.domain}`);
    const nifiNamespaceManifest = props.eksCluster.addNamespace(
      new cdk8s.App(),
      `nifi-namespace-${props.clusterName}`,
      nifiNamespaceName,
      this.securityGroup,
    );
    nifiNamespaceManifest.node.addDependency(props.fargateProfile);
    this.nifiManifest = props.eksCluster.addCdk8sChart(`nifi-${props.clusterName}`, nifiK8sChart);
    this.nifiManifest.node.addDependency(nifiNamespaceManifest);

    const restartNifiCmdProps: KubernetesCmdProps = {
      cluster: props.eksCluster,
      namespace: nifiNamespaceName,
      cmd: ['delete', 'pod', '-l', 'app=nifi'],
      executionKey: nifiK8sChart.hash(),
    };
    const restartNifiCmd = new KubernetesCmd(this, 'restart-nifi-cmd', restartNifiCmdProps);
    restartNifiCmd.node.addDependency(this.nifiManifest);
  }

  private createNifiSecurityGroup(vpc: IVpc) {
    const ingressRules: MdaaSecurityGroupRuleProps = {
      sg: this.props.securityGroupIngressSGs
        ?.map(sgId => {
          return [
            {
              sgId: sgId,
              protocol: Protocol.TCP,
              port: this.clusterPort,
            },
            {
              sgId: sgId,
              protocol: Protocol.TCP,
              port: this.httpsPort,
            },
            {
              sgId: sgId,
              protocol: Protocol.TCP,
              port: this.remotePort,
            },
          ];
        })
        .flat(),
      ipv4: this.props.securityGroupIngressIPv4s
        ?.map(ipv4 => {
          return [
            {
              cidr: ipv4,
              protocol: Protocol.TCP,
              port: this.clusterPort,
            },
            {
              cidr: ipv4,
              protocol: Protocol.TCP,
              port: this.httpsPort,
            },
            {
              cidr: ipv4,
              protocol: Protocol.TCP,
              port: this.remotePort,
            },
          ];
        })
        .flat(),
    };

    const customEgress: boolean =
      (this.props.securityGroupEgressRules?.ipv4 && this.props.securityGroupEgressRules?.ipv4.length > 0) ||
      (this.props.securityGroupEgressRules?.prefixList && this.props.securityGroupEgressRules?.prefixList.length > 0) ||
      (this.props.securityGroupEgressRules?.sg && this.props.securityGroupEgressRules?.sg.length > 0) ||
      false;
    const sgProps: MdaaSecurityGroupProps = {
      securityGroupName: 'nifi',
      vpc: vpc,
      addSelfReferenceRule: true,
      naming: this.props.naming,
      allowAllOutbound: !customEgress,
      ingressRules: ingressRules,
      egressRules: this.props.securityGroupEgressRules,
    };
    return new MdaaSecurityGroup(this, 'nifi-sg', sgProps);
  }

  public static createEfsSecurityGroup(
    name: string,
    scope: Construct,
    naming: IMdaaResourceNaming,
    vpc: IVpc,
    securityGroups?: ISecurityGroup[],
  ) {
    const efsSgIngressRules: MdaaSecurityGroupRuleProps = {
      sg: securityGroups?.map(sg => {
        return {
          sgId: sg.securityGroupId,
          protocol: Protocol.TCP,
          port: 2049,
        };
      }),
    };

    const sgProps: MdaaSecurityGroupProps = {
      securityGroupName: `${name}-efs`,
      vpc: vpc,
      addSelfReferenceRule: true,
      naming: naming,
      allowAllOutbound: true,
      ingressRules: efsSgIngressRules,
    };
    return new MdaaSecurityGroup(scope, `${name}-efs-sg`, sgProps);
  }
  public static createEfsAccessPolicy(
    name: string,
    scope: Construct,
    naming: IMdaaResourceNaming,
    kmsKey: IKey,
    efsPvs: [FileSystem, AccessPoint][],
  ): ManagedPolicy {
    const describeAzStatement = new PolicyStatement({
      sid: 'AllowDescribeAz',
      effect: Effect.ALLOW,
      actions: ['ec2:DescribeAvailabilityZones'],
      resources: ['*'],
    });

    const efsKmsKeyStatement = new PolicyStatement({
      sid: 'AllowEfsKms',
      effect: Effect.ALLOW,
      actions: [...USER_ACTIONS, 'kms:CreateGrant', 'kms:DescribeKey', 'kms:ListAliases'],
      resources: [kmsKey.keyArn],
    });
    const describeEFSStatement = new PolicyStatement({
      sid: `AllowDescribeEFS`,
      effect: Effect.ALLOW,
      actions: [
        'elasticfilesystem:DescribeAccessPoints',
        'elasticfilesystem:DescribeMountTargets',
        'elasticfilesystem:DescribeFileSystems',
      ],
      resources: [...efsPvs.map(x => x[0].fileSystemArn), ...efsPvs.map(x => x[1].accessPointArn)],
    });
    const efsStatements = [describeEFSStatement, describeAzStatement, efsKmsKeyStatement];

    const efsManagedPolicy = new ManagedPolicy(scope, `${name}-efs-access`, {
      managedPolicyName: naming.resourceName(`${name}-efs-access`, 64),
      statements: efsStatements,
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(efsManagedPolicy, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Access Point Names not known at deployment time. Permissions restricted by condition.',
      },
    ]);
    return efsManagedPolicy;
  }

  public static createEfsPvs(createEfsPvsProps: CreateEfsPvsProps): [FileSystem, AccessPoint][] {
    const efs = new FileSystem(createEfsPvsProps.scope, `efs-${createEfsPvsProps.name}`, {
      fileSystemName: createEfsPvsProps.naming.resourceName(createEfsPvsProps.name, 256),
      vpc: createEfsPvsProps.vpc,
      vpcSubnets: {
        subnets: createEfsPvsProps.subnets,
      },
      performanceMode: PerformanceMode.MAX_IO,
      securityGroup: createEfsPvsProps.efsSecurityGroup,
      encrypted: true,
      kmsKey: createEfsPvsProps.kmsKey,
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(efs, [
      {
        id: 'NIST.800.53.R5-EFSInBackupPlan',
        reason: 'MDAA does not enforce NIST.800.53.R5-EFSInBackupPlan on EFS volume.',
      },
      {
        id: 'HIPAA.Security-EFSInBackupPlan',
        reason: 'MDAA does not enforce HIPAA.Security-EFSInBackupPlan on EFS volume.',
      },
      {
        id: 'PCI.DSS.321-EFSInBackupPlan',
        reason: 'MDAA does not enforce HIPAA.Security-EFSInBackupPlan on EFS volume.',
      },
    ]);

    return [...Array(createEfsPvsProps.nodeCount).keys()].map(i => {
      const ap = new AccessPoint(createEfsPvsProps.scope, `${createEfsPvsProps.name}-pv-ap-${i}`, {
        fileSystem: efs,
        path: `/${createEfsPvsProps.name}/${i}`,
        posixUser: {
          uid: '1000',
          gid: '1000',
        },
        createAcl: {
          ownerGid: '1000',
          ownerUid: '1000',
          permissions: '750',
        },
      });
      return [efs, ap];
    });
  }

  public static createSecret(
    scope: Construct,
    id: string,
    naming: IMdaaResourceNaming,
    secretName: string,
    kmsKey: IKey,
  ): ISecret {
    const secretResourceName = naming.resourceName(secretName, 255);
    const nifiSensitivePropSecret = new Secret(scope, id, {
      secretName: secretResourceName,
      encryptionKey: kmsKey,
      generateSecretString: {
        excludeCharacters: "'",
        excludePunctuation: true,
      },
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      nifiSensitivePropSecret,
      [
        { id: 'AwsSolutions-SMG4', reason: 'Nifi does not support rotation of this secret' },
        { id: 'NIST.800.53.R5-SecretsManagerRotationEnabled', reason: 'Nifi does not support rotation of this secret' },
        { id: 'HIPAA.Security-SecretsManagerRotationEnabled', reason: 'Nifi does not support rotation of this secret' },
        { id: 'PCI.DSS.321-SecretsManagerRotationEnabled', reason: 'Nifi does not support rotation of this secret' },
      ],
      true,
    );
    return nifiSensitivePropSecret;
  }

  public static createExternalSecretsServiceRole(
    scope: Construct,
    roleName: string,
    naming: IMdaaResourceNaming,
    namespaceName: string,
    eksCluster: MdaaEKSCluster,
    kmsKey: IKey,
    secrets: ISecret[],
  ): IRole {
    const externalSecretServiceRoleName = naming.resourceName('external-secrets-service-role', 64);

    const kmsKeyStatement = new PolicyStatement({
      sid: 'KmsDecrypt',
      effect: Effect.ALLOW,
      actions: ['kms:Decrypt'],
      resources: [kmsKey.keyArn],
    });

    const secretsManagerStatement = new PolicyStatement({
      sid: 'GetSecretValue',
      effect: Effect.ALLOW,
      actions: ['SecretsManager:GetSecretValue'],
      resources: secrets.map(x => x.secretArn),
    });

    return NifiCluster.createServiceRole(scope, roleName, externalSecretServiceRoleName, namespaceName, eksCluster, [
      kmsKeyStatement,
      secretsManagerStatement,
    ]);
  }

  public static createServiceRole(
    scope: Construct,
    id: string,
    roleName: string,
    namespaceName: string,
    eksCluster: MdaaEKSCluster,
    statements?: PolicyStatement[],
    policyMdaaNagSuppressions?: NagPackSuppression[],
  ): IRole {
    const serviceRole = new Role(scope, `${id}-service-role`, {
      roleName: roleName,
      assumedBy: new PrincipalWithConditions(new OpenIdConnectPrincipal(eksCluster.iamOidcIdentityProvider), {
        StringLike: new CfnJson(scope, `${id}-service-role-assume-conditions`, {
          value: {
            [`${eksCluster.clusterOpenIdConnectIssuer}:aud`]: 'sts.amazonaws.com',
            [`${eksCluster.clusterOpenIdConnectIssuer}:sub`]: `system:serviceaccount:${namespaceName}:*`,
          },
        }),
      }),
    });
    if (statements) {
      const policy = new ManagedPolicy(scope, `${id}-service-policy`, {
        managedPolicyName: roleName,
        roles: [serviceRole],
        statements: statements,
      });

      if (policyMdaaNagSuppressions) {
        MdaaNagSuppressions.addCodeResourceSuppressions(policy, policyMdaaNagSuppressions, true);
      }
    }

    return serviceRole;
  }
}

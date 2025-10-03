/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import {
  MdaaEC2Instance,
  MdaaEC2InstanceProps,
  MdaaEC2SecretKeyPair,
  MdaaEC2SecretKeyPairProps,
} from '@aws-mdaa/ec2-constructs';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { KubectlV31Layer } from '@aws-cdk/lambda-layer-kubectl-v31';
import { Fn, Size, Stack } from 'aws-cdk-lib';
import {
  ISecurityGroup,
  ISubnet,
  IVpc,
  Port,
  InstanceType,
  InstanceClass,
  InstanceSize,
  MachineImage,
  Subnet,
  UserData,
  IInstance,
} from 'aws-cdk-lib/aws-ec2';
import {
  AlbControllerOptions,
  Cluster,
  ClusterLoggingTypes,
  ClusterProps,
  CoreDnsComputeType,
  EndpointAccess,
  FargateProfile,
  FargateProfileOptions,
  IKubectlProvider,
  IpFamily,
  KubernetesManifest,
  KubernetesVersion,
} from 'aws-cdk-lib/aws-eks';
import {
  ArnPrincipal,
  Effect,
  IRole,
  ManagedPolicy,
  OpenIdConnectProvider,
  PolicyStatement,
  PrincipalWithConditions,
  Role,
  ServicePrincipal,
} from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { ILayerVersion } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, LogGroupProps, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import * as cdk8s from 'cdk8s';
import { Construct } from 'constructs';
import * as k8s from '../imports/k8s';
import { CompliantKubectlProvider } from './mdaa-kubectl-provider';
import { MdaaManagedPolicy, MdaaRole, MdaaRoleProps } from '@aws-mdaa/iam-constructs';

/**
 * Q-ENHANCED-INTERFACE
 * Configuration interface for EKS cluster management instance providing tooling and connectivity for Kubernetes cluster administration. Defines EC2 instance properties for EKS cluster management including networking, permissions, and administrative tooling setup.
 *
 * Use cases: Cluster management; Administrative access; Kubernetes tooling; Operational management
 *
 * AWS: EC2 management instance for EKS cluster administration and Kubernetes operations
 *
 * Validation: subnetId and availabilityZone are required; various management configuration options available
 */
export interface MgmtInstanceProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional EC2 instance type for management instance sizing controlling compute resources and performance characteristics. Defines the instance size for EKS cluster management operations and administrative tooling with appropriate resource allocation.
   *
   * Use cases: Instance sizing; Performance requirements; Cost optimization; Resource allocation
   *
   * AWS: EC2 instance type for EKS management instance compute resources and performance
   *
   * Validation: Must be valid InstanceType if provided; controls management instance compute capacity
   **/
  readonly instanceType?: InstanceType;
  /**
   * Q-ENHANCED-PROPERTY
   * Required subnet ID for management instance network placement enabling VPC connectivity and network isolation. Defines the specific subnet where the management instance will be deployed for proper network connectivity and security.
   *
   * Use cases: Network placement; VPC connectivity; Subnet specification; Network isolation
   *
   * AWS: VPC subnet ID for EKS management instance network placement and connectivity
   *
   * Validation: Must be valid subnet ID string; required for management instance network placement
   **/
  readonly subnetId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required availability zone specification for management instance placement controlling geographic distribution and network proximity. Defines the specific availability zone for management instance deployment ensuring proper placement and connectivity.
   *
   * Use cases: Geographic placement; Availability zone specification; Network proximity; Instance placement
   *
   * AWS: Availability zone for EKS management instance geographic placement and network optimization
   *
   * Validation: Must be valid availability zone string; required for management instance placement
   **/
  readonly availabilityZone: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional EC2 key pair name for SSH access to management instance enabling secure administrative access and troubleshooting. Provides SSH key pair for secure access to the management instance for administrative operations and troubleshooting.
   *
   * Use cases: SSH access; Administrative access; Secure connectivity; Troubleshooting support
   *
   * AWS: EC2 key pair for SSH access to EKS management instance and administrative operations
   *
   * Validation: Must be valid key pair name if provided; enables SSH access to management instance
   **/
  readonly keyPairName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional user data commands array for management instance initialization enabling custom setup and tooling installation. Provides custom initialization commands for management instance setup including EKS tooling and administrative utilities.
   *
   * Use cases: Instance initialization; Custom setup; Tooling installation; Administrative configuration
   *
   * AWS: EC2 user data commands for EKS management instance initialization and tooling setup
   *
   * Validation: Must be array of valid command strings if provided; enables custom instance initialization
   **/
  readonly userDataCommands?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional IAM policy statements array for management instance permissions enabling EKS cluster administration and AWS service access. Provides additional IAM permissions for management instance operations and EKS cluster administration tasks.
   *
   * Use cases: IAM permissions; Cluster administration; AWS service access; Administrative operations
   *
   * AWS: IAM policy statements for EKS management instance permissions and cluster administration
   *
   * Validation: Must be array of valid PolicyStatement objects if provided; enables administrative permissions
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.PolicyStatement.html
   **/
  readonly mgmtPolicyStatements?: PolicyStatement[];
}

export interface MdaaEKSClusterProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Optional management instance configuration for EKS cluster administration enabling dedicated administrative access and tooling. Provides EC2 instance with EKS connectivity, permissions, and tooling for cluster management and administrative operations.
   *
   * Use cases: Cluster administration; Administrative access; Management tooling; Operational control
   *
   * AWS: EC2 management instance for EKS cluster administration and Kubernetes operations
   *
   * Validation: Must be valid MgmtInstanceProps if provided; enables dedicated cluster management capabilities
   **/
  readonly mgmtInstance?: MgmtInstanceProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of IAM roles for EKS cluster administrative access enabling RBAC-based cluster administration and security controls. Provides IAM roles that will be granted administrative access to the EKS cluster through Kubernetes RBAC integration.
   *
   * Use cases: Administrative access; RBAC configuration; Security controls; Cluster administration
   *
   * AWS: IAM roles for EKS cluster administrative access and Kubernetes RBAC integration
   *
   * Validation: Must be array of valid IRole interfaces; required for cluster administrative access and RBAC
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.IRole.html
   **/
  readonly adminRoles: IRole[];
  readonly kubectlLambdaRole?: IRole;
  readonly tags?: {
    [key: string]: string;
  };
  readonly mastersRole?: IRole;
  readonly coreDnsComputeType?: CoreDnsComputeType;
  readonly outputMastersRoleArn?: boolean;
  readonly kubectlEnvironment?: {
    [key: string]: string;
  };
  readonly awscliLayer?: ILayerVersion;
  readonly kubectlMemory?: Size;
  readonly clusterHandlerEnvironment?: {
    [key: string]: string;
  };
  readonly clusterHandlerSecurityGroup?: ISecurityGroup;
  readonly onEventLayer?: ILayerVersion;
  readonly prune?: boolean;
  readonly kmsKey: IKey;
  readonly ipFamily?: IpFamily;
  readonly serviceIpv4Cidr?: string;
  readonly albController?: AlbControllerOptions;
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC in which to create the Cluster enabling network isolation and security controls. Defines the Virtual Private Cloud where the EKS cluster will be deployed for network security and resource isolation.
   *
   * Use cases: Network isolation; VPC deployment; Security controls; Resource isolation
   *
   * AWS: VPC for EKS cluster deployment and network isolation
   *
   * Validation: Must be valid IVpc interface; required for cluster network deployment and security
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.IVpc.html
   **/
  readonly vpc: IVpc;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array to explicitly select individual subnets for EKS cluster deployment enabling precise network placement and availability zone control. Defines specific subnets for cluster deployment with control over network placement and availability zones.
   *
   * Use cases: Subnet selection; Network placement; Availability zone control; Precise deployment
   *
   * AWS: VPC subnets for EKS cluster deployment and network placement
   *
   * Validation: Must be array of valid ISubnet interfaces; required for cluster subnet placement
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.ISubnet.html
   **/
  readonly subnets: ISubnet[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional role that provides permissions for the Kubernetes control plane to make calls to AWS API operations on your behalf. Defines IAM role for EKS service to manage cluster resources and AWS service integration.
   *
   * Use cases: Service permissions; AWS API access; Control plane operations; Service integration
   *
   * AWS: IAM role for EKS service permissions and AWS API operations
   *
   * Validation: Must be valid IRole interface if provided; automatically created if not specified
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_iam.IRole.html
   **/
  readonly role?: IRole;
  readonly clusterName?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional security Group to use for Control Plane ENIs enabling custom network security controls. Provides custom security group for EKS control plane network interfaces with automatic creation if not specified.
   *
   * Use cases: Network security; Custom security groups; Control plane security; Network controls
   *
   * AWS: Security group for EKS control plane ENIs and network security
   *
   * Validation: Must be valid ISecurityGroup if provided; automatically created if not specified
   *   * See: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.ISecurityGroup.html
   **/
  readonly securityGroup?: ISecurityGroup;
  /**
   * Q-ENHANCED-PROPERTY
   * Required Kubernetes version to run in the cluster controlling platform capabilities and feature availability. Defines the specific Kubernetes version for the cluster ensuring compatibility and feature support.
   *
   * Use cases: Version control; Platform capabilities; Feature availability; Compatibility management
   *
   * AWS: EKS cluster Kubernetes version for platform capabilities and features
   *
   * Validation: Must be valid KubernetesVersion enum; required for cluster version specification
   *   **/
  readonly version: KubernetesVersion;
  readonly outputClusterName?: boolean;
  readonly outputConfigCommand?: boolean;
}

/**
 * A construct for creating a compliant EKS cluster resource.
 */
export class MdaaEKSCluster extends Cluster {
  private static getKubectlUrl(version: string): string {
    // To find new versions for future Kubernetes releases (e.g., 1.34):
    // 1. Check AWS EKS supported versions: https://docs.aws.amazon.com/eks/latest/userguide/kubernetes-versions.html
    // 2. Browse S3 bucket: https://s3.console.aws.amazon.com/s3/buckets/amazon-eks?region=us-west-2&prefix=
    // 3. Or use AWS CLI: aws s3 ls s3://amazon-eks/ --recursive | grep kubectl | grep linux/amd64
    // 4. Format: 'major.minor': 'major.minor.patch/YYYY-MM-DD'
    const versionMap: Record<string, string> = {
      '1.28': '1.28.13/2024-11-15',
      '1.29': '1.29.8/2024-11-15',
      '1.30': '1.30.4/2024-11-15',
      '1.31': '1.31.0/2024-11-15',
      '1.32': '1.32.0/2024-11-15',
      '1.33': '1.33.0/2024-11-15',
    };

    const versionInfo = versionMap[version];
    if (!versionInfo) {
      throw new Error(
        `Unsupported Kubernetes version: ${version}. Supported versions: ${Object.keys(versionMap).join(', ')}`,
      );
    }
    // Source: https://docs.aws.amazon.com/eks/latest/userguide/install-kubectl.html
    // AWS publishes kubectl binaries in us-west-2 for all regions
    return `https://s3.us-west-2.amazonaws.com/amazon-eks/${versionInfo}/bin/linux/amd64/kubectl`;
  }

  /**
   * Extracts the minor version from a Kubernetes version string.
   * @param version Full version string (e.g., "1.29.8")
   * @returns Minor version string (e.g., "1.29")
   */
  private static getMinorVersion(version: string): string {
    return version.substring(0, 4); // Extract "major.minor" from "major.minor.patch"
  }

  private static getKubectlLayer(scope: Construct, version: KubernetesVersion): ILayerVersion {
    const versionString = version.version;
    const minorVersion = MdaaEKSCluster.getMinorVersion(versionString);

    // Helper function to try loading a specific kubectl layer
    const tryLoadLayer = (layerPackage: string, LayerClass: string): ILayerVersion | null => {
      try {
        const module = require(layerPackage);
        const LayerConstructor = module[LayerClass];
        if (LayerConstructor) {
          return new LayerConstructor(scope, 'kubectl-layer');
        }
      } catch (error) {
        // Layer package not available
      }
      return null;
    };

    let layer: ILayerVersion | null = null;

    switch (minorVersion) {
      case '1.28':
        layer = tryLoadLayer('@aws-cdk/lambda-layer-kubectl-v28', 'KubectlV28Layer');
        break;
      case '1.29':
        layer = tryLoadLayer('@aws-cdk/lambda-layer-kubectl-v29', 'KubectlV29Layer');
        break;
      case '1.30':
        layer = tryLoadLayer('@aws-cdk/lambda-layer-kubectl-v30', 'KubectlV30Layer');
        break;
      case '1.31':
        layer = tryLoadLayer('@aws-cdk/lambda-layer-kubectl-v31', 'KubectlV31Layer');
        break;
      case '1.32':
        layer = tryLoadLayer('@aws-cdk/lambda-layer-kubectl-v32', 'KubectlV32Layer');
        break;
      case '1.33':
        layer = tryLoadLayer('@aws-cdk/lambda-layer-kubectl-v33', 'KubectlV33Layer');
        break;
      default:
        console.warn(`No specific kubectl layer available for Kubernetes version ${versionString}, using v31 layer`);
        break;
    }

    // Fallback to v31 if specific version not available
    if (!layer) {
      if (minorVersion !== '1.31') {
        console.warn(
          `kubectl ${minorVersion} layer not available, falling back to v31 for Kubernetes ${versionString}`,
        );
      }
      layer = new KubectlV31Layer(scope, 'kubectl-layer');
    }

    return layer;
  }

  private static setProps(scope: Construct, props: MdaaEKSClusterProps): ClusterProps {
    const kubecLayer = MdaaEKSCluster.getKubectlLayer(scope, props.version);
    const overrideProps = {
      clusterName: props.naming.resourceName(props.clusterName, 255),
      endpointAccess: EndpointAccess.PRIVATE, // Force private endpoint access only
      defaultCapacity: 0, // Force specification of a node group to ensure encryption at rest
      secretsEncryptionKey: props.kmsKey,
      kubectlLayer: kubecLayer,
      vpcSubnets: [
        {
          subnets: props.subnets,
        },
      ],
      // Force enabling all logging types
      clusterLogging: [
        ClusterLoggingTypes.API,
        ClusterLoggingTypes.AUDIT,
        ClusterLoggingTypes.AUTHENTICATOR,
        ClusterLoggingTypes.CONTROLLER_MANAGER,
        ClusterLoggingTypes.SCHEDULER,
      ],
    };

    const allProps: ClusterProps = {
      ...props,
      ...overrideProps,
    };
    return allProps;
  }

  public readonly iamOidcIdentityProvider: OpenIdConnectProvider;
  public readonly efsStorageClassName: string;
  private readonly props: MdaaEKSClusterProps;
  public readonly mdaaKubeCtlProvider: IKubectlProvider;
  public readonly clusterFargateProfileArn: string;
  private podExecutionRolePolicy: ManagedPolicy;
  public readonly mgmtInstance?: IInstance;

  constructor(scope: Construct, id: string, props: MdaaEKSClusterProps) {
    super(scope, id, MdaaEKSCluster.setProps(scope, props));

    this.props = props;
    this.clusterFargateProfileArn = `arn:${Stack.of(scope).partition}:eks:${Stack.of(scope).region}:${
      Stack.of(scope).account
    }:fargateprofile/${props.naming.resourceName(props.clusterName, 255)}/*`;
    this.mdaaKubeCtlProvider = this.defineCompliantKubectlProvider();

    props.adminRoles.forEach(adminRole => {
      this.awsAuth.addMastersRole(adminRole);
    });
    const stackId = Fn.select(0, Fn.split('-', Fn.select(2, Fn.split('/', Stack.of(scope).stackId))));

    const podLogGroupProps: LogGroupProps = {
      encryptionKey: this.props.kmsKey,
      logGroupName: `/aws/eks/${props.naming.resourceName(props.clusterName, 255)}/${stackId}/pods`,
      retention: RetentionDays.INFINITE,
    };
    const podLogGroup = new LogGroup(this, 'pod-log-group', podLogGroupProps);
    MdaaNagSuppressions.addCodeResourceSuppressions(
      podLogGroup,
      [
        {
          id: 'NIST.800.53.R5-CloudWatchLogGroupRetentionPeriod',
          reason: 'LogGroup retention is set to RetentionDays.INFINITE.',
        },
        {
          id: 'HIPAA.Security-CloudWatchLogGroupRetentionPeriod',
          reason: 'LogGroup retention is set to RetentionDays.INFINITE.',
        },
        {
          id: 'PCI.DSS.321-CloudWatchLogGroupRetentionPeriod',
          reason: 'LogGroup retention is set to RetentionDays.INFINITE.',
        },
      ],
      true,
    );

    this.iamOidcIdentityProvider = new OpenIdConnectProvider(this, 'iam-oidc-identity-provider', {
      url: this.clusterOpenIdConnectIssuerUrl,
      clientIds: ['sts.amazonaws.com'],
    });

    this.podExecutionRolePolicy = new ManagedPolicy(this, 'systemPodExecutionRolePolicy', {
      statements: [
        new PolicyStatement({
          actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:DescribeLogStreams', 'logs:PutLogEvents'],
          resources: [
            `arn:${Stack.of(this).partition}:logs:${Stack.of(this).region}:${Stack.of(this).account}:log-group:${
              podLogGroup.logGroupName
            }*`,
            `arn:${Stack.of(this).partition}:logs:${Stack.of(this).region}:${Stack.of(this).account}:log-group:${
              podLogGroup.logGroupName
            }:log-stream:*`,
          ],
          effect: Effect.ALLOW,
        }),
      ],
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.podExecutionRolePolicy,
      [{ id: 'AwsSolutions-IAM5', reason: 'Log stream name not known at deployment time.' }],
      true,
    );

    this.addFargateProfile('system', {
      fargateProfileName: 'system',
      selectors: [
        {
          namespace: 'default',
        },
        {
          namespace: 'kube-system',
        },
        {
          namespace: 'aws-observability',
        },
      ],
    });

    const cdk8sApp = new cdk8s.App();

    const efsStorageClassChart = new EfsStorageClassChart(cdk8sApp, 'efs-sc-chart');
    this.efsStorageClassName = efsStorageClassChart.storageClassName;
    this.addCdk8sChart('efs-sc-chart', efsStorageClassChart);

    const awsObservabilityNamespace = this.addNamespace(
      cdk8sApp,
      'aws-observability-namespace',
      'aws-observability',
      props.securityGroup,
    );
    const awsObservabilityChart = this.addCdk8sChart(
      'aws-observability-chart',
      new AwsObservabilityChart(cdk8sApp, 'aws-observability-chart', {
        logGroupName: podLogGroup.logGroupName,
        region: Stack.of(this).region,
      }),
    );
    awsObservabilityChart.node.addDependency(awsObservabilityNamespace);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.role,
      [{ id: 'AwsSolutions-IAM4', reason: 'AmazonEKSClusterPolicy is required for proper cluster function.' }],
      true,
    );

    MdaaNagSuppressions.addCodeResourceSuppressions(
      this.adminRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'EC2 resources not known at deployment time.',
          appliesTo: [`Resource::*`],
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Permissions limited to specific cluster',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Permissions limited to specific cluster',
        },
        { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Permissions are specific to cluster.' },
        { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Permissions are specific to cluster.' },
        { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Permissions are specific to cluster.' },
      ],
      true,
    );

    if (this.kubectlLambdaRole) {
      MdaaNagSuppressions.addCodeResourceSuppressions(
        this.kubectlLambdaRole,
        [
          {
            id: 'AwsSolutions-IAM4',
            reason: 'AWSLambdaBasicExecutionRole, AWSLambdaVPCAccessExecutionRole are least privilege.',
          },
          { id: 'AwsSolutions-IAM5', reason: 'S3 CDK Asset names not known at deployment time' },
          {
            id: 'NIST.800.53.R5-IAMNoInlinePolicy',
            reason: 'Permissions are specific to custom resource requirements.',
          },
          {
            id: 'HIPAA.Security-IAMNoInlinePolicy',
            reason: 'Permissions are specific to custom resource requirements.',
          },
          { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Permissions are specific to custom resource requirements.' },
        ],
        true,
      );
    }

    const clusterResourceProvider = Stack.of(this).node.tryFindChild('@aws-cdk--aws-eks.ClusterResourceProvider');
    if (clusterResourceProvider) {
      MdaaNagSuppressions.addCodeResourceSuppressions(
        clusterResourceProvider,
        [
          {
            id: 'AwsSolutions-IAM4',
            reason: 'AWSLambdaBasicExecutionRole, AWSLambdaVPCAccessExecutionRole are least privilege.',
          },
          { id: 'AwsSolutions-IAM5', reason: 'Resource names not known at deployment time.' },
          { id: 'AwsSolutions-L1', reason: 'Function generated by EKS L2 construct.' },
          {
            id: 'NIST.800.53.R5-LambdaConcurrency',
            reason: 'Function is used as Cfn Custom Resource only during deployment time. Concurrency managed via Cfn.',
          },
          {
            id: 'NIST.800.53.R5-LambdaDLQ',
            reason:
              'Function is used as Cfn Custom Resource only during deployment time. Error handling managed via Cfn.',
          },
          { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Policy statements are specific to custom resource.' },
          {
            id: 'NIST.800.53.R5-LambdaInsideVPC',
            reason: 'Function is used as Cfn Custom Resource only during deployment time.',
          },
          {
            id: 'HIPAA.Security-LambdaInsideVPC',
            reason: 'Function is used as Cfn Custom Resource only during deployment time.',
          },
          {
            id: 'PCI.DSS.321-LambdaInsideVPC',
            reason: 'Function is used as Cfn Custom Resource only during deployment time.',
          },
          {
            id: 'HIPAA.Security-LambdaConcurrency',
            reason: 'Function is used as Cfn Custom Resource only during deployment time. Concurrency managed via Cfn.',
          },
          {
            id: 'PCI.DSS.321-LambdaConcurrency',
            reason: 'Function is used as Cfn Custom Resource only during deployment time. Concurrency managed via Cfn.',
          },
          {
            id: 'HIPAA.Security-LambdaDLQ',
            reason:
              'Function is used as Cfn Custom Resource only during deployment time. Error handling managed via Cfn.',
          },
          {
            id: 'PCI.DSS.321-LambdaDLQ',
            reason:
              'Function is used as Cfn Custom Resource only during deployment time. Error handling managed via Cfn.',
          },
          { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Policy statements are specific to custom resource.' },
          { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Policy statements are specific to custom resource.' },
          {
            id: 'HIPAA.Security-CloudWatchLogGroupEncrypted',
            reason: 'Loggroup data is always encrypted in CloudWatch Logs',
          },
          {
            id: 'PCI.DSS.321-CloudWatchLogGroupEncrypted',
            reason: 'Loggroup data is always encrypted in CloudWatch Logs',
          },
          {
            id: 'NIST.800.53.R5-CloudWatchLogGroupEncrypted',
            reason: 'Loggroup data is always encrypted in CloudWatch Logs',
          },
          { id: 'AwsSolutions-SF1', reason: 'Function is used as Cfn Custom Resource only during deployment time.' },
          { id: 'AwsSolutions-SF2', reason: 'Function is used as Cfn Custom Resource only during deployment time.' },
        ],
        true,
      );
    }

    const kubeCtlProvider = Stack.of(this).node.tryFindChild('@aws-cdk--aws-eks.KubectlProvider');
    if (kubeCtlProvider) {
      MdaaNagSuppressions.addCodeResourceSuppressions(
        kubeCtlProvider,
        [
          {
            id: 'AwsSolutions-IAM4',
            reason: 'AWSLambdaBasicExecutionRole, AWSLambdaVPCAccessExecutionRole are least privilege.',
          },
          { id: 'AwsSolutions-IAM5', reason: 'Resource names not known at deployment time.' },
          { id: 'AwsSolutions-L1', reason: 'Function generated by EKS L2 construct.' },
          {
            id: 'NIST.800.53.R5-LambdaConcurrency',
            reason: 'Function is used as Cfn Custom Resource only during deployment time. Concurrency managed via Cfn.',
          },
          {
            id: 'NIST.800.53.R5-LambdaDLQ',
            reason:
              'Function is used as Cfn Custom Resource only during deployment time. Error handling managed via Cfn.',
          },
          { id: 'NIST.800.53.R5-IAMNoInlinePolicy', reason: 'Policy statements are specific to custom resource.' },
          {
            id: 'HIPAA.Security-LambdaConcurrency',
            reason: 'Function is used as Cfn Custom Resource only during deployment time. Concurrency managed via Cfn.',
          },
          {
            id: 'PCI.DSS.321-LambdaConcurrency',
            reason: 'Function is used as Cfn Custom Resource only during deployment time. Concurrency managed via Cfn.',
          },
          {
            id: 'HIPAA.Security-LambdaDLQ',
            reason:
              'Function is used as Cfn Custom Resource only during deployment time. Error handling managed via Cfn.',
          },
          {
            id: 'PCI.DSS.321-LambdaDLQ',
            reason:
              'Function is used as Cfn Custom Resource only during deployment time. Error handling managed via Cfn.',
          },
          { id: 'HIPAA.Security-IAMNoInlinePolicy', reason: 'Policy statements are specific to custom resource.' },
          { id: 'PCI.DSS.321-IAMNoInlinePolicy', reason: 'Policy statements are specific to custom resource.' },
        ],
        true,
      );
    }

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'cluster',
          resourceId: props.clusterName,
          name: 'arn',
          value: this.clusterFargateProfileArn,
        },
        ...props,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        ...{
          resourceType: 'cluster',
          resourceId: props.clusterName,
          name: 'name',
          value: this.clusterName,
        },
        ...props,
      },
      scope,
    );
    //Required to describe the cluster and configure kubectl
    const eksStatment = new PolicyStatement({
      actions: ['eks:DescribeCluster'],
      effect: Effect.ALLOW,
      resources: [this.clusterArn],
    });
    //Required to run SSM patching against instance
    const ssmStatement = new PolicyStatement({
      actions: [
        'ssm:UpdateInstanceInformation',
        'ssm:UpdateInstanceAssociationStatus',
        'ssm:UpdateAssociationStatus',
        'ssm:PutInventory',
        'ssm:PutConfigurePackageResult',
        'ssm:PutComplianceItems',
        'ssm:ListInstanceAssociations',
        'ssm:ListAssociations',
        'ssm:GetManifest',
        'ssm:GetDocument',
        'ssm:GetDeployablePatchSnapshotForInstance',
        'ssm:DescribeDocument',
        'ssm:DescribeAssociation',
        'ssmmessages:OpenDataChannel',
        'ssmmessages:OpenControlChannel',
        'ssmmessages:CreateDataChannel',
        'ssmmessages:CreateControlChannel',
        'ec2messages:SendReply',
        'ec2messages:GetMessages',
        'ec2messages:GetEndpoint',
        'ec2messages:FailMessage',
        'ec2messages:DeleteMessage',
        'ec2messages:AcknowledgeMessage',
      ],
      effect: Effect.ALLOW,
      resources: ['*'],
    });

    const mgmtPolicy = new MdaaManagedPolicy(this, 'cluster-mgmt-policy', {
      naming: props.naming,
      managedPolicyName: 'cluster-mgmt',
      statements: [eksStatment, ssmStatement, ...(props.mgmtInstance?.mgmtPolicyStatements || [])],
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(
      mgmtPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Resource names not known at deployment time.',
        },
      ],
      true,
    );
    this.mgmtInstance = this.createMgmtInstance(mgmtPolicy);
  }

  private createMgmtInstance(mgmtPolicy: ManagedPolicy): IInstance | undefined {
    if (this.props.mgmtInstance) {
      const instanceRoleProps: MdaaRoleProps = {
        roleName: 'mgmt-instance',
        assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
        naming: this.props.naming,
        managedPolicies: [mgmtPolicy],
      };
      const instanceRole = new MdaaRole(this, 'mgmt-instance-role', instanceRoleProps);
      this.awsAuth.addMastersRole(instanceRole);
      const createKeyPairProps: MdaaEC2SecretKeyPairProps = {
        name: 'mgmt-instance',
        kmsKey: this.props.kmsKey,
        naming: this.props.naming,
        readPrincipals: this.props.adminRoles.map(x => new ArnPrincipal(x.roleArn)),
      };

      const keyPair = this.props.mgmtInstance?.keyPairName
        ? undefined
        : new MdaaEC2SecretKeyPair(this, `key-pair-mgmt-instance`, createKeyPairProps);
      const keyPairName = this.props.mgmtInstance?.keyPairName ?? keyPair?.name;

      const mgmtUserData: UserData = UserData.forLinux();
      const kubectlUrl = MdaaEKSCluster.getKubectlUrl(MdaaEKSCluster.getMinorVersion(this.props.version.version));
      mgmtUserData.addCommands(
        `mkdir -p /usr/local/bin && cd /usr/local/bin && curl -O ${kubectlUrl} && chmod +x /usr/local/bin/kubectl && cd ~`,
        `aws eks update-kubeconfig --region ${Stack.of(this).region} --name ${this.clusterName}`,
        `cp /root/.kube/config /etc/kubeconfig && chmod o+r /etc/kubeconfig`,
        `echo 'export KUBECONFIG=/etc/kubeconfig' >> /etc/profile.d/kubectl.sh`,
        ...(this.props.mgmtInstance.userDataCommands ?? []),
      );
      const mgmtInstanceProps: MdaaEC2InstanceProps = {
        instanceName: 'mgmt',
        instanceType: this.props.mgmtInstance.instanceType ?? InstanceType.of(InstanceClass.T3, InstanceSize.MICRO),
        machineImage: MachineImage.latestAmazonLinux2023(),
        vpc: this.props.vpc,
        instanceSubnet: Subnet.fromSubnetAttributes(this, 'mgmt-instance-subnet', {
          subnetId: this.props.mgmtInstance.subnetId,
          availabilityZone: this.props.mgmtInstance.availabilityZone,
        }),
        blockDeviceProps: [
          {
            deviceName: '/dev/xvda',
            volumeSizeInGb: 50,
          },
        ],
        kmsKey: this.props.kmsKey,
        role: instanceRole,
        naming: this.props.naming,
        securityGroup: this.clusterSecurityGroup,
        keyName: keyPairName,
        userData: mgmtUserData,
      };
      const instance = new MdaaEC2Instance(this, 'mgmt-instance', mgmtInstanceProps);
      if (keyPair) instance.node.addDependency(keyPair);
      return instance;
    }
    return undefined;
  }

  private defineCompliantKubectlProvider() {
    const uid = 'CompliantKubectlProvider';

    // since we can't have the provider connect to multiple networks, and we
    // wanted to avoid resource tear down, we decided for now that we will only
    // support a single EKS cluster per CFN stack.
    if (this.stack.node.tryFindChild(uid)) {
      throw new Error('Only a single EKS cluster can be defined within a CloudFormation stack');
    }

    return new CompliantKubectlProvider(this.stack, uid, { cluster: this });
  }

  private createFargatePodExecutionRole(profileName: string, scope?: Construct, naming?: IMdaaResourceNaming): IRole {
    const podExecutionRole = new Role(scope ?? this, `fargate-pod-ex-${profileName}`, {
      roleName: (naming ?? this.props.naming).resourceName(profileName, 64),
      assumedBy: new PrincipalWithConditions(new ServicePrincipal('eks-fargate-pods.amazonaws.com'), {
        ArnLike: {
          'aws:SourceArn': this.clusterFargateProfileArn,
        },
      }),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSFargatePodExecutionRolePolicy')],
    });
    MdaaNagSuppressions.addCodeResourceSuppressions(
      podExecutionRole,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason: 'AmazonEKSFargatePodExecutionRolePolicy is required for proper cluster function.',
          appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy'],
        },
      ],
      true,
    );
    podExecutionRole.addManagedPolicy(this.podExecutionRolePolicy);
    return podExecutionRole;
  }

  public addFargateProfile(id: string, profileOptions: FargateProfileOptions): FargateProfile {
    const podExecutionRole =
      profileOptions.podExecutionRole ?? this.createFargatePodExecutionRole(id, this, this.props.naming);

    return super.addFargateProfile(id, {
      podExecutionRole: podExecutionRole,
      ...profileOptions,
    });
  }

  public addNamespace(
    scope: Construct,
    id: string,
    namespaceName: string,
    securityGroup?: ISecurityGroup,
  ): KubernetesManifest {
    if (securityGroup) {
      //Need to permit traffic between cluster security group and pod/namespace security group
      securityGroup.connections.allowFrom(this.clusterSecurityGroup, Port.allTraffic());
      securityGroup.connections.allowTo(this.clusterSecurityGroup, Port.allTraffic());
      this.clusterSecurityGroup.connections.allowFrom(securityGroup, Port.allTraffic());
      this.clusterSecurityGroup.connections.allowTo(securityGroup, Port.allTraffic());

      MdaaNagSuppressions.addCodeResourceSuppressions(
        securityGroup,
        [
          {
            id: 'NIST.800.53.R5-EC2RestrictedCommonPorts',
            reason: 'Unrestricted traffic is required between cluster and pods.',
          },
          {
            id: 'HIPAA.Security-EC2RestrictedCommonPorts',
            reason: 'Unrestricted traffic is required between cluster and pods.',
          },
          {
            id: 'PCI.DSS.321-EC2RestrictedCommonPorts',
            reason: 'Unrestricted traffic is required between cluster and pods.',
          },
        ],
        true,
      );
      MdaaNagSuppressions.addCodeResourceSuppressions(
        this.clusterSecurityGroup,
        [
          {
            id: 'NIST.800.53.R5-EC2RestrictedCommonPorts',
            reason: 'Unrestricted traffic is required between cluster and pods.',
          },
          {
            id: 'HIPAA.Security-EC2RestrictedCommonPorts',
            reason: 'Unrestricted traffic is required between cluster and pods.',
          },
          {
            id: 'PCI.DSS.321-EC2RestrictedCommonPorts',
            reason: 'Unrestricted traffic is required between cluster and pods.',
          },
        ],
        true,
      );
    }
    return this.addCdk8sChart(
      id,
      new NamespaceChart(scope, id, { namespaceName: namespaceName, securityGroupId: securityGroup?.securityGroupId }),
    );
  }
}

interface AwsObservabilityChartProps {
  readonly region: string;
  readonly logGroupName: string;
}

class AwsObservabilityChart extends cdk8s.Chart {
  public static outputConfig = `
    [OUTPUT]
        Name cloudwatch_logs
        Match *
        region CLOUDWATCH_LOGS_REGION_CODE
        log_group_name LOG_GROUP_NAME
        auto_create_group false`;

  constructor(scope: Construct, id: string, props: AwsObservabilityChartProps) {
    super(scope, id);

    const outputConfig = AwsObservabilityChart.outputConfig
      .replace('LOG_GROUP_NAME', props.logGroupName)
      .replace('CLOUDWATCH_LOGS_REGION_CODE', props.region);

    new k8s.KubeConfigMap(this, 'aws-observability-config-map', {
      metadata: {
        name: 'aws-logging',
        namespace: 'aws-observability',
      },

      data: {
        flb_log_cw: 'false',
        'output.conf': outputConfig,
      },
    });
  }
}

interface NamespaceChartProps {
  readonly namespaceName: string;
  readonly securityGroupId?: string;
}

class NamespaceChart extends cdk8s.Chart {
  constructor(scope: Construct, id: string, props: NamespaceChartProps) {
    super(scope, id);

    const namespace = new k8s.KubeNamespace(this, 'namespace', {
      metadata: {
        name: props.namespaceName,
      },
    });

    if (props.securityGroupId) {
      new cdk8s.ApiObject(this, 'security-group-policy', {
        apiVersion: 'vpcresources.k8s.aws/v1beta1',
        kind: 'SecurityGroupPolicy',
        metadata: {
          name: 'security-group-policy',
          namespace: namespace.name,
        },
        spec: {
          podSelector: {},
          securityGroups: {
            groupIds: [props.securityGroupId],
          },
        },
      });
    }
  }
}

class EfsStorageClassChart extends cdk8s.Chart {
  public storageClassName: string;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.storageClassName = 'efs-sc';
    new k8s.KubeStorageClass(this, 'efs-storage-class', {
      metadata: {
        name: this.storageClassName,
      },
      provisioner: 'efs.csi.aws.com',
    });
  }
}

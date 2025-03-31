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
import { KubectlV27Layer } from '@aws-cdk/lambda-layer-kubectl-v27';
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

export interface MgmtInstanceProps {
  readonly instanceType?: InstanceType;
  readonly subnetId: string;
  readonly availabilityZone: string;
  readonly keyPairName?: string;
  readonly userDataCommands?: string[];
  readonly mgmtPolicyStatements?: PolicyStatement[];
}

/**
 * Properties for creating a Compliance EKS cluster
 */
export interface MdaaEKSClusterProps extends MdaaConstructProps {
  /**
   * If defined, an EC2 instance will be created with connectivity, permissions, and tooling to manage the EKS cluster
   */
  readonly mgmtInstance?: MgmtInstanceProps;

  readonly adminRoles: IRole[];
  /**
   * The IAM role to pass to the Kubectl Lambda Handler.
   *
   * @default - Default Lambda IAM Execution Role
   */
  readonly kubectlLambdaRole?: IRole;
  /**
   * The tags assigned to the EKS cluster
   *
   * @default - none
   */
  readonly tags?: {
    [key: string]: string;
  };
  /**
   * An IAM role that will be added to the `system:masters` Kubernetes RBAC
   * group.
   *
   * @see https://kubernetes.io/docs/reference/access-authn-authz/rbac/#default-roles-and-role-bindings
   *
   * @default - no masters role.
   */
  readonly mastersRole?: IRole;
  /**
   * Controls the "eks.amazonaws.com/compute-type" annotation in the CoreDNS
   * configuration on your cluster to determine which compute type to use
   * for CoreDNS.
   *
   * @default CoreDnsComputeType.EC2 (for `FargateCluster` the default is FARGATE)
   */
  readonly coreDnsComputeType?: CoreDnsComputeType;
  /**
   * Determines whether a CloudFormation output with the ARN of the "masters"
   * IAM role will be synthesized (if `mastersRole` is specified).
   *
   * @default false
   */
  readonly outputMastersRoleArn?: boolean;
  /**
   * Environment variables for the kubectl execution. Only relevant for kubectl enabled clusters.
   *
   * @default - No environment variables.
   */
  readonly kubectlEnvironment?: {
    [key: string]: string;
  };
  /**
   * An AWS Lambda layer that contains the `aws` CLI.
   *
   * The handler expects the layer to include the following executables:
   *
   * ```
   * /opt/awscli/aws
   * ```
   *
   * @default - a default layer with the AWS CLI 1.x
   */
  readonly awscliLayer?: ILayerVersion;
  /**
   * Amount of memory to allocate to the provider's lambda function.
   *
   * @default Size.gibibytes(1)
   */
  readonly kubectlMemory?: Size;
  /**
   * Custom environment variables when interacting with the EKS endpoint to manage the cluster lifecycle.
   *
   * @default - No environment variables.
   */
  readonly clusterHandlerEnvironment?: {
    [key: string]: string;
  };
  /**
   * A security group to associate with the Cluster Handler's Lambdas.
   * The Cluster Handler's Lambdas are responsible for calling AWS's EKS API.
   *
   * Requires `placeClusterHandlerInVpc` to be set to true.
   *
   * @default - No security group.
   */
  readonly clusterHandlerSecurityGroup?: ISecurityGroup;
  /**
   * An AWS Lambda Layer which includes the NPM dependency `proxy-agent`. This layer
   * is used by the onEvent handler to route AWS SDK requests through a proxy.
   *
   * By default, the provider will use the layer included in the
   * "aws-lambda-layer-node-proxy-agent" SAR application which is available in all
   * commercial regions.
   *
   * To deploy the layer locally define it in your app as follows:
   *
   * ```ts
   * const layer = new lambda.LayerVersion(this, 'proxy-agent-layer', {
   *   code: lambda.Code.fromAsset(`${__dirname}/layer.zip`),
   *   compatibleRuntimes: [lambda.Runtime.NODEJS_14_X],
   * });
   * ```
   *
   * @default - a layer bundled with this module.
   */
  readonly onEventLayer?: ILayerVersion;
  /**
   * Indicates whether Kubernetes resources added through `addManifest()` can be
   * automatically pruned. When this is enabled (default), prune labels will be
   * allocated and injected to each resource. These labels will then be used
   * when issuing the `kubectl apply` operation with the `--prune` switch.
   *
   * @default true
   */
  readonly prune?: boolean;
  /**
   * KMS secret for envelope encryption for Kubernetes secrets and data at rest.
   */
  readonly kmsKey: IKey;
  /**
   * Specify which IP family is used to assign Kubernetes pod and service IP addresses.
   *
   * @default - IpFamily.IP_V4
   * @see https://docs.aws.amazon.com/eks/latest/APIReference/API_KubernetesNetworkConfigRequest.html#AmazonEKS-Type-KubernetesNetworkConfigRequest-ipFamily
   */
  readonly ipFamily?: IpFamily;
  /**
   * The CIDR block to assign Kubernetes service IP addresses from.
   *
   * @default - Kubernetes assigns addresses from either the
   *            10.100.0.0/16 or 172.20.0.0/16 CIDR blocks
   * @see https://docs.aws.amazon.com/eks/latest/APIReference/API_KubernetesNetworkConfigRequest.html#AmazonEKS-Type-KubernetesNetworkConfigRequest-serviceIpv4Cidr
   */
  readonly serviceIpv4Cidr?: string;
  /**
   * Install the AWS Load Balancer Controller onto the cluster.
   *
   * @see https://kubernetes-sigs.github.io/aws-load-balancer-controller
   *
   * @default - The controller is not installed.
   */
  readonly albController?: AlbControllerOptions;
  /**
   * The VPC in which to create the Cluster.
   *
   */
  readonly vpc: IVpc;
  /**
   * Explicitly select individual subnets
   *
   */
  readonly subnets: ISubnet[];
  /**
   * Role that provides permissions for the Kubernetes control plane to make calls to AWS API operations on your behalf.
   *
   * @default - A role is automatically created for you
   */
  readonly role?: IRole;
  /**
   * Name for the cluster.
   *
   * @default - Automatically generated name
   */
  readonly clusterName?: string;
  /**
   * Security Group to use for Control Plane ENIs
   *
   * @default - A security group is automatically created
   */
  readonly securityGroup?: ISecurityGroup;
  /**
   * The Kubernetes version to run in the cluster
   */
  readonly version: KubernetesVersion;
  /**
   * Determines whether a CloudFormation output with the name of the cluster
   * will be synthesized.
   *
   * @default false
   */
  readonly outputClusterName?: boolean;
  /**
   * Determines whether a CloudFormation output with the `aws eks
   * update-kubeconfig` command will be synthesized. This command will include
   * the cluster name and, if applicable, the ARN of the masters IAM role.
   *
   * @default true
   */
  readonly outputConfigCommand?: boolean;
}

/**
 * A construct for creating a compliant EKS cluster resource.
 */
export class MdaaEKSCluster extends Cluster {
  private static KUBECTL_URL =
    'https://s3.us-west-2.amazonaws.com/amazon-eks/1.27.9/2024-01-04/bin/linux/amd64/kubectl';

  private static setProps(scope: Construct, props: MdaaEKSClusterProps): ClusterProps {
    const overrideProps = {
      clusterName: props.naming.resourceName(props.clusterName, 255),
      endpointAccess: EndpointAccess.PRIVATE, // Force private endpoint access only
      defaultCapacity: 0, // Force specification of a node group to ensure encryption at rest
      secretsEncryptionKey: props.kmsKey,
      kubectlLayer: new KubectlV27Layer(scope, 'kubectl-layer'),
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
      mgmtUserData.addCommands(
        `mkdir -p /usr/local/bin && cd /usr/local/bin && curl -O ${MdaaEKSCluster.KUBECTL_URL} && chmod +x /usr/local/bin/kubectl && cd ~`,
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

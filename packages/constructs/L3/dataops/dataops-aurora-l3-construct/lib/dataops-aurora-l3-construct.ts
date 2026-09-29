/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaSecurityGroup, MdaaSecurityGroupProps, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { MdaaManagedPolicy, MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaRdsServerlessCluster, MdaaRdsServerlessClusterProps } from '@aws-mdaa/rds-constructs';
import { MdaaNagSuppressions } from '@aws-mdaa/construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { DataOpsProjectUtils } from '@aws-mdaa/dataops-project-l3-construct';
import { ISecurityGroup, Peer, Port, Protocol, SecurityGroup, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, ManagedPolicy, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey, Key } from 'aws-cdk-lib/aws-kms';
import { AuroraPostgresEngineVersion } from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

/** Subnet configuration for Aurora cluster placement. */
export interface AuroraSubnetConfig {
  /**
   * Subnet ID for cluster node placement.
   *
   * Use cases: Multi-AZ deployment; Network isolation; Subnet-specific placement
   *
   * AWS: VPC subnet for Aurora cluster subnet group
   *
   * Validation: Required; valid subnet ID in the specified VPC
   */
  readonly subnetId: string;
  /**
   * Availability zone of the subnet.
   *
   * Use cases: Multi-AZ distribution; Zone-aware placement; High availability
   *
   * AWS: Availability zone identifier (e.g., us-east-1a)
   *
   * Validation: Required; must match the actual AZ of the specified subnet
   */
  readonly availabilityZone: string;
}

/** Security group ingress rules for Aurora cluster network access. */
export interface AuroraSecurityGroupIngressProps {
  /**
   * IPv4 CIDR blocks allowed to connect to the Aurora cluster port.
   *
   * Use cases: VPC CIDR access; On-premises connectivity; Specific IP allowlisting
   *
   * AWS: Security group ingress rules with IPv4 CIDR source
   *
   * Validation: Optional; array of valid IPv4 CIDR blocks
   */
  readonly ipv4?: string[];
  /**
   * Security group IDs allowed to connect to the Aurora cluster port.
   *
   * Use cases: Application-tier access; Lambda connectivity; ECS/EKS service access
   *
   * AWS: Security group ingress rules with security group source
   *
   * Validation: Optional; array of valid security group IDs
   */
  readonly sg?: string[];
}

/** Configuration for a single Aurora PostgreSQL cluster. */
export interface AuroraPostgresqlClusterProps {
  /**
   * Aurora PostgreSQL engine version string in major.minor format.
   *
   * Use cases: Version pinning; Feature availability; Upgrade planning
   *
   * AWS: Aurora PostgreSQL engine version
   *
   * Validation: Required; valid Aurora PostgreSQL version string (e.g., '16.13')
   */
  readonly engineVersion: string;
  /**
   * VPC ID for Aurora cluster deployment. The cluster is deployed within this VPC
   * with network access controlled by security groups.
   *
   * Use cases: Network isolation; VPC-based deployment; Secure networking
   *
   * AWS: VPC for Aurora cluster network configuration
   *
   * Validation: Required; valid VPC ID
   */
  readonly vpcId: string;
  /**
   * Subnet configurations for Aurora cluster node placement. Subnets should span
   * multiple availability zones for high availability.
   *
   * Use cases: Multi-AZ placement; Subnet-specific deployment; High availability
   *
   * AWS: VPC subnets for Aurora DB subnet group
   *
   * Validation: Required; array of AuroraSubnetConfig; subnets must be in the specified VPC
   */
  readonly subnets: AuroraSubnetConfig[];
  /**
   * Security group ingress rules controlling network access to the Aurora cluster port.
   * When securityGroupId is also provided, these rules are added to the imported security group.
   * Egress is restricted by default (MdaaSecurityGroup denies all outbound unless explicitly configured).
   *
   * Use cases: Network access control; Client connectivity; Security group management
   *
   * AWS: VPC security group ingress rules for Aurora cluster
   *
   * Validation: Optional; object with optional ipv4 and/or sg arrays
   */
  readonly securityGroupIngress?: AuroraSecurityGroupIngressProps;
  /**
   * Existing security group ID to use for the Aurora cluster instead of creating a new one.
   * When set, the security group is imported and any securityGroupIngress rules are added to it.
   * Supports SSM references (ssm:/path) and project references (project:securityGroupId/<name>)
   * which are auto-resolved when projectName is configured.
   *
   * Use cases: Shared security group from DataOps project; Centralized network policy; Reuse across clusters
   *
   * AWS: Existing EC2 security group
   *
   * Validation: Optional; valid security group ID, SSM reference, or project reference
   */
  readonly securityGroupId?: string;
  /**
   * Non-default TCP port for client connections. Port obfuscation adds an additional
   * layer of defense against non-targeted attacks. Avoid using the default PostgreSQL
   * port 5432.
   *
   * Use cases: Port obfuscation; Security hardening; Network policy compliance
   *
   * AWS: Aurora cluster endpoint port
   *
   * Validation: Required; valid port number; should not be 5432
   */
  readonly port: number;
  /**
   * Minimum Aurora Serverless v2 capacity units (ACUs). Each ACU provides approximately
   * 2 GiB of memory with corresponding CPU and networking.
   *
   * Use cases: Cost optimization; Minimum resource guarantee; Baseline capacity
   *
   * AWS: Aurora Serverless v2 minimum ACU capacity
   *
   * Validation: Optional; number between 0.5 and 256
   * @default 0.5
   * @minimum 0.5
   * @maximum 256
   */
  readonly minCapacity?: number;
  /**
   * Maximum Aurora Serverless v2 capacity units (ACUs). The cluster scales up to this
   * capacity under load.
   *
   * Use cases: Performance ceiling; Cost control; Burst capacity
   *
   * AWS: Aurora Serverless v2 maximum ACU capacity
   *
   * Validation: Optional; number between 1 and 256; must be >= minCapacity
   * @default 2
   * @minimum 1
   * @maximum 256
   */
  readonly maxCapacity?: number;
  /**
   * Number of Aurora reader instances for read scaling and high availability.
   *
   * Use cases: Read scaling; High availability; Failover targets
   *
   * AWS: Aurora read replica instances
   *
   * Validation: Optional; non-negative integer
   * @default 1
   * @minimum 1
   */
  readonly numberOfReaders?: number;
  /**
   * Number of days to retain automated backups (1-35).
   *
   * Use cases: Point-in-time recovery; Data protection compliance; Backup management
   *
   * AWS: Aurora automated backup retention period
   *
   * Validation: Optional; integer 1-35
   * @default 7
   * @minimum 1
   * @maximum 35
   */
  readonly backupRetentionDays?: number;
  /**
   * Days between automatic admin/master password rotation via Secrets Manager.
   *
   * Use cases: Automated credential rotation; Security compliance; Password policy enforcement
   *
   * AWS: Secrets Manager automatic rotation schedule
   *
   * Validation: Optional; positive integer
   * @default 30
   * @minimum 1
   */
  readonly adminPasswordRotationDays?: number;
  /**
   * Initial database name created in the cluster.
   *
   * Use cases: Application database setup; Custom database naming; Initial provisioning
   *
   * AWS: Aurora initial database name
   *
   * Validation: Optional; valid PostgreSQL database name
   */
  readonly defaultDatabaseName?: string;
  /**
   * Enable the RDS Data API for HTTP-based SQL access without persistent connections.
   *
   * Use cases: Lambda integration; Serverless access; HTTP-based queries
   *
   * AWS: Aurora Data API (RDS Data Service)
   *
   * Validation: Optional; boolean
   * @default false
   */
  readonly enableDataApi?: boolean;
  /**
   * Admin roles granted access to the Aurora KMS encryption key for key management.
   * Not required when using a project KMS key (projectName is set).
   *
   * Use cases: Key administration; Security management; Encryption key access control
   *
   * AWS: IAM roles with KMS key admin permissions
   *
   * Validation: Optional; array of valid MdaaRoleRef
   */
  readonly dataAdminRoles?: MdaaRoleRef[];
  /**
   * Roles granted access to this cluster via a managed policy. The policy grants
   * rds-db:connect (IAM auth), rds:DescribeDBClusters, and Secrets Manager access
   * to the cluster admin secret.
   *
   * Use cases: Application access; Developer access; Service integration
   *
   * AWS: IAM roles with Aurora cluster access managed policy attached
   *
   * Validation: Optional; array of valid MdaaRoleRef
   */
  readonly clusterAccessRoles?: MdaaRoleRef[];
  /**
   * Enable export of PostgreSQL logs to CloudWatch Logs for monitoring and analysis.
   *
   * Use cases: Operational monitoring; Query auditing; Troubleshooting
   *
   * AWS: Aurora PostgreSQL log export to CloudWatch Logs
   *
   * Validation: Optional; boolean
   * @default true
   */
  readonly enableCloudwatchLogsExports?: boolean;
  /**
   * Enable IAM database authentication for token-based access without passwords.
   *
   * Use cases: IAM-based access control; Passwordless authentication; Fine-grained access
   *
   * AWS: Aurora IAM database authentication
   *
   * Validation: Optional; boolean
   * @default true
   */
  readonly enableIamAuthentication?: boolean;
}

/** Map of cluster names to Aurora PostgreSQL cluster configurations. */
export type AuroraPostgresqlClusterMap = { [clusterName: string]: AuroraPostgresqlClusterProps };

/** Props for the DataOps Aurora L3 construct. */
export interface DataopsAuroraL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Map of named Aurora PostgreSQL cluster configurations. Each key becomes the
   * cluster identifier processed through MDAA naming conventions.
   *
   * Use cases: Multi-cluster deployment; Named cluster management; PostgreSQL workloads
   *
   * AWS: Aurora PostgreSQL Serverless v2 clusters
   *
   * Validation: Optional; valid AuroraPostgresqlClusterMap
   */
  readonly postgresqlClusters?: AuroraPostgresqlClusterMap;
  /**
   * DataOps project name for auto-wiring shared resources (KMS key) via SSM parameters.
   * When set, the project KMS key is used for cluster encryption instead of creating
   * a dedicated key per cluster.
   *
   * Use cases: Project resource coordination; Shared KMS key reuse; Cost optimization
   *
   * AWS: DataOps project SSM parameter references
   *
   * Validation: Optional; must match an existing deployed project
   */
  readonly projectName?: string;
  /**
   * KMS key ARN for encrypting all Aurora clusters. Auto-resolved from project when
   * projectName is set. When not provided and no project is configured, a single
   * shared KMS key is created for all clusters in this construct.
   *
   * Use cases: Shared encryption key; Project-level key management
   *
   * AWS: KMS key ARN
   *
   * Validation: Optional; valid KMS key ARN; auto-wired from project if projectName provided
   */
  readonly kmsArn?: string;
  /**
   * Data admin roles granted the cluster access managed policy for ALL clusters
   * deployed by this construct. These roles receive rds-db:connect, rds:DescribeDBClusters,
   * and Secrets Manager access to every cluster's admin secret.
   *
   * Use cases: Platform admin access; Cross-cluster administration
   *
   * AWS: IAM roles with cluster access managed policies attached
   *
   * Validation: Optional; array of valid MdaaRoleRef
   */
  readonly dataAdminRoles?: MdaaRoleRef[];
}

/**
 * Deploys compliant Aurora Serverless v2 clusters (PostgreSQL) with KMS encryption,
 * VPC isolation, enhanced monitoring, IAM authentication, CloudWatch log exports,
 * and automatic admin password rotation via Secrets Manager.
 * Enforces encryption at rest, SSL-only connections, non-default port, and private subnet placement.
 * Supports optional DataOps project integration for shared KMS key reuse.
 */
export class DataopsAuroraL3Construct extends MdaaL3Construct {
  protected readonly props: DataopsAuroraL3ConstructProps;

  /** The deployed Aurora PostgreSQL clusters, keyed by cluster name. */
  public readonly postgresqlClusters: { [clusterName: string]: MdaaRdsServerlessCluster } = {};

  /** The KMS key used for encrypting all Aurora clusters. */
  private readonly encryptionKey: IKey;

  constructor(scope: Construct, id: string, props: DataopsAuroraL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    this.encryptionKey = this.resolveKmsKey();

    if (props.postgresqlClusters) {
      for (const [clusterName, clusterProps] of Object.entries(props.postgresqlClusters)) {
        this.postgresqlClusters[clusterName] = this.createPostgresqlCluster(clusterName, clusterProps);
      }
    }
  }

  private resolveKmsKey(): IKey {
    // If project KMS ARN is available, use it
    if (this.props.kmsArn) {
      return Key.fromKeyArn(this, 'aurora-kms-key', this.props.kmsArn);
    }

    // Otherwise create a single shared KMS key for all clusters
    const allAdminRoles = Object.values(this.props.postgresqlClusters ?? {}).flatMap((clusterProps, clusterIdx) =>
      (clusterProps.dataAdminRoles ?? []).map((roleRef, roleIdx) =>
        this.props.roleHelper.resolveRoleRefWithRefId(roleRef, `DataAdmin-${clusterIdx}-${roleIdx}`),
      ),
    );

    const kmsKey = new MdaaKmsKey(this.scope, 'aurora-kms-key', {
      alias: 'aurora',
      naming: this.props.naming,
      keyAdminRoles: allAdminRoles,
    });

    // Allow RDS/logs to use the KMS key
    const allowRdsLogEncryption = new PolicyStatement({
      sid: 'AllowAuroraLogEncryption',
      effect: Effect.ALLOW,
      resources: ['*'],
      actions: ['kms:Encrypt*', 'kms:Decrypt*', 'kms:ReEncrypt*', 'kms:GenerateDataKey*', 'kms:Describe*'],
      principals: [new ServicePrincipal(`logs.${this.region}.amazonaws.com`)],
      conditions: {
        ArnLike: {
          'kms:EncryptionContext:aws:logs:arn': `arn:${this.partition}:logs:${this.region}:${this.account}:*`,
        },
      },
    });
    kmsKey.addToResourcePolicy(allowRdsLogEncryption);

    return kmsKey;
  }

  private createPostgresqlCluster(
    clusterName: string,
    clusterProps: AuroraPostgresqlClusterProps,
  ): MdaaRdsServerlessCluster {
    const azIds = clusterProps.subnets.map(s => s.availabilityZone);
    const subnetIds = clusterProps.subnets.map(s => s.subnetId);
    const subnets = clusterProps.subnets.map((s, index) =>
      Subnet.fromSubnetAttributes(this, `subnet-${clusterName}-${index}`, s),
    );

    const vpc = Vpc.fromVpcAttributes(this.scope, `aurora-vpc-${clusterName}`, {
      vpcId: clusterProps.vpcId,
      availabilityZones: azIds,
      privateSubnetIds: subnetIds,
    });

    // Create or import security group
    let securityGroup: ISecurityGroup;
    if (clusterProps.securityGroupId) {
      // Import existing security group
      securityGroup = SecurityGroup.fromSecurityGroupId(
        this,
        `sg-imported-${clusterName}`,
        clusterProps.securityGroupId,
      );
      // Add ingress rules to the imported security group if specified
      if (clusterProps.securityGroupIngress?.ipv4) {
        for (const cidr of clusterProps.securityGroupIngress.ipv4) {
          securityGroup.addIngressRule(
            Peer.ipv4(cidr),
            Port.tcp(clusterProps.port),
            `PostgreSQL ingress for IPv4 CIDR ${cidr}`,
          );
        }
      }
      if (clusterProps.securityGroupIngress?.sg) {
        for (const sgId of clusterProps.securityGroupIngress.sg) {
          securityGroup.addIngressRule(
            Peer.securityGroupId(sgId),
            Port.tcp(clusterProps.port),
            `PostgreSQL ingress for SG ${sgId}`,
          );
        }
      }
    } else {
      // Create a new security group with ingress rules
      const securityGroupIngress: MdaaSecurityGroupRuleProps = {
        ipv4: clusterProps.securityGroupIngress?.ipv4?.map(x => ({
          cidr: x,
          port: clusterProps.port,
          protocol: Protocol.TCP,
          description: `PostgreSQL ingress for IPv4 CIDR ${x}`,
        })),
        sg: clusterProps.securityGroupIngress?.sg?.map(x => ({
          sgId: x,
          port: clusterProps.port,
          protocol: Protocol.TCP,
          description: `PostgreSQL ingress for SG ${x}`,
        })),
      };

      const securityGroupProps: MdaaSecurityGroupProps = {
        vpc: vpc,
        naming: this.props.naming,
        securityGroupName: clusterName,
        ingressRules: securityGroupIngress,
      };

      securityGroup = new MdaaSecurityGroup(this, `sg-${clusterName}`, securityGroupProps);
    }

    // Use the shared encryption key
    const encryptionKey = this.encryptionKey;

    // Create enhanced monitoring role
    const monitoringRole = new MdaaRole(this.scope, `aurora-monitoring-${clusterName}`, {
      naming: this.props.naming,
      roleName: `aurora-monitoring-${clusterName}`,
      assumedBy: new ServicePrincipal('monitoring.rds.amazonaws.com'),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonRDSEnhancedMonitoringRole')],
    });

    MdaaNagSuppressions.addCodeResourceSuppressions(
      monitoringRole,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'AWS managed policy service-role/AmazonRDSEnhancedMonitoringRole is required for RDS Enhanced Monitoring and is least privileged. See https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonrds.html',
          appliesTo: ['Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole'],
        },
      ],
      true,
    );

    // Resolve engine version
    const engineVersion = AuroraPostgresEngineVersion.of(
      clusterProps.engineVersion,
      clusterProps.engineVersion.split('.')[0],
    );

    // Build cluster props
    const rdsClusterProps: MdaaRdsServerlessClusterProps = {
      naming: this.props.naming,
      engine: 'aurora-postgresql',
      engineVersion: engineVersion,
      clusterIdentifier: clusterName,
      masterUsername: 'postgres',
      defaultDatabaseName: clusterProps.defaultDatabaseName,
      enableDataApi: clusterProps.enableDataApi,
      encryptionKey: encryptionKey,
      monitoringRole: monitoringRole,
      numberOfReaderInstances: clusterProps.numberOfReaders ?? 1,
      vpc: vpc,
      vpcSubnets: { availabilityZones: azIds, subnets: subnets },
      securityGroups: [securityGroup],
      port: clusterProps.port,
      backupRetention: clusterProps.backupRetentionDays ?? 7,
      adminPasswordRotationDays: clusterProps.adminPasswordRotationDays ?? 30,
      enableCloudwatchLogsExports: clusterProps.enableCloudwatchLogsExports ?? true,
      enableIamDatabaseAuthentication: clusterProps.enableIamAuthentication ?? true,
      scaling: {
        minCapacity: clusterProps.minCapacity ?? 0.5,
        maxCapacity: clusterProps.maxCapacity ?? 2,
      },
    };

    const cluster = new MdaaRdsServerlessCluster(this.scope, `aurora-pg-${clusterName}`, rdsClusterProps);

    // Suppress CDK Nag validation failures on the security group caused by the Secrets Manager
    // rotation Lambda's dynamic port reference (Fn::GetAtt on cluster endpoint port).
    // CDK Nag cannot evaluate intrinsic functions at synth time, producing false-positive
    // validation failures for EC2RestrictedCommonPorts and EC2RestrictedSSH rules.
    if (!clusterProps.securityGroupId) {
      MdaaNagSuppressions.addCodeResourceSuppressions(
        securityGroup,
        [
          {
            id: 'CdkNagValidationFailure',
            reason:
              'Secrets Manager rotation Lambda security group ingress uses Fn::GetAtt for the cluster endpoint port, which CDK Nag cannot evaluate at synth time. The port is a non-default value configured via the port property.',
          },
        ],
        true,
      );
    }

    // Create cluster access managed policy
    this.createClusterAccessPolicy(clusterName, cluster, clusterProps);

    // Publish cluster endpoint to SSM if project integration is enabled
    if (this.props.projectName) {
      DataOpsProjectUtils.createProjectSSMParam(
        this.scope,
        this.props.naming,
        this.props.projectName,
        `aurora/endpoint/${clusterName}`,
        cluster.clusterEndpoint.socketAddress,
      );
    }

    return cluster;
  }

  private createClusterAccessPolicy(
    clusterName: string,
    cluster: MdaaRdsServerlessCluster,
    clusterProps: AuroraPostgresqlClusterProps,
  ): void {
    // Collect all roles that should get this cluster's access policy:
    // 1. Top-level dataAdminRoles (access to all clusters)
    // 2. Per-cluster clusterAccessRoles
    const allRoleRefs = [...(this.props.dataAdminRoles ?? []), ...(clusterProps.clusterAccessRoles ?? [])];

    if (allRoleRefs.length === 0) {
      return;
    }

    const resolvedRoles = allRoleRefs.map((roleRef, idx) =>
      this.props.roleHelper.resolveRoleRefWithRefId(roleRef, `ClusterAccess-${clusterName}-${idx}`),
    );

    // Create the managed policy with cluster access permissions
    const accessPolicy = new MdaaManagedPolicy(this.scope, `aurora-access-policy-${clusterName}`, {
      naming: this.props.naming,
      managedPolicyName: `aurora-access-${clusterName}`,
      statements: [
        // Allow IAM database authentication
        new PolicyStatement({
          sid: 'AllowRdsIamConnect',
          effect: Effect.ALLOW,
          actions: ['rds-db:connect'],
          resources: [
            `arn:${this.partition}:rds-db:${this.region}:${this.account}:dbuser:${cluster.clusterResourceIdentifier}/*`,
          ],
        }),
        // Allow describing the cluster
        new PolicyStatement({
          sid: 'AllowDescribeCluster',
          effect: Effect.ALLOW,
          actions: ['rds:DescribeDBClusters'],
          resources: [cluster.clusterArn],
        }),
        // Allow reading the admin secret
        new PolicyStatement({
          sid: 'AllowGetClusterSecret',
          effect: Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue', 'secretsmanager:DescribeSecret'],
          resources: [cluster.secret!.secretArn],
        }),
      ],
    });

    // Attach the policy to all resolved roles (skip immutable roles)
    for (const resolvedRole of resolvedRoles) {
      if (!resolvedRole.immutable()) {
        const iamRole = resolvedRole.role(`access-role-${clusterName}-${resolvedRole.refId()}`);
        iamRole.addManagedPolicy(accessPolicy);
      }
    }

    MdaaNagSuppressions.addCodeResourceSuppressions(
      accessPolicy,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'rds-db:connect requires wildcard on the database user name to allow IAM authentication for any database user. The resource is scoped to the specific cluster resource ID. See https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonrds.html',
        },
      ],
      true,
    );
  }
}

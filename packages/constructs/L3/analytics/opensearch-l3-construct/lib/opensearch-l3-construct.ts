/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaLogGroup } from '@aws-mdaa/cloudwatch-constructs';
import { MdaaSecurityGroup, MdaaSecurityGroupProps, MdaaSecurityGroupRuleProps } from '@aws-mdaa/ec2-constructs';
import { EventBridgeHelper, EventBridgeRuleProps } from '@aws-mdaa/eventbridge-helper';
import { MdaaResolvableRole, MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { MdaaKmsKey } from '@aws-mdaa/kms-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { IMdaaResourceNaming } from '@aws-mdaa/naming';
import { MdaaOpensearchDomain, MdaaOpensearchDomainProps } from '@aws-mdaa/opensearch-constructs';
import { MdaaSnsTopic } from '@aws-mdaa/sns-constructs';
import { aws_events_targets } from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Protocol, Subnet, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyStatement, PolicyStatementProps, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { IKey } from 'aws-cdk-lib/aws-kms';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { CapacityConfig, EbsOptions, EngineVersion, ZoneAwarenessConfig } from 'aws-cdk-lib/aws-opensearchservice';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';

/**
 * Q-ENHANCED-INTERFACE
 * SecurityGroupIngressProps configuration interface for search analytics and log analysis.
 *
 * Use cases: Search analytics; Log analysis; Full-text search; Data indexing
 *
 * AWS: Amazon OpenSearch configuration for search analytics and log analysis
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon OpenSearch and MDAA requirements
 */
export interface SecurityGroupIngressProps {
  /**
   * Q-ENHANCED-PROPERTY
   * IPv4 CIDR blocks for OpenSearch domain ingress access control enabling network-based access restrictions. Specifies the IPv4 address ranges that are allowed to access the OpenSearch domain, supporting network-level security and access control for search analytics workloads.
   *
   * Use cases: Network access control; IP-based restrictions; VPC security; Client connectivity control
   *
   * AWS: Amazon OpenSearch domain security group ingress rules for IPv4 network access control
   *
   * Validation: Must be array of valid IPv4 CIDR blocks if specified; CIDR blocks must be properly formatted (e.g., '10.0.0.0/16')
   **/
  readonly ipv4?: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Security group IDs for OpenSearch domain ingress access control enabling security group-based access restrictions. Specifies the security groups that are allowed to access the OpenSearch domain, supporting fine-grained network security and access control patterns.
   *
   * Use cases: Security group-based access; Fine-grained network control; Service-to-service communication; Application tier access
   *
   * AWS: Amazon OpenSearch domain security group ingress rules for security group-based access control
   *
   * Validation: Must be array of valid security group IDs if specified; security groups must exist in the same VPC
   **/
  readonly sg?: string[];
}

/**
 * Q-ENHANCED-INTERFACE
 * SubnetConfig configuration interface for search analytics and log analysis.
 *
 * Use cases: Search analytics; Log analysis; Full-text search; Data indexing
 *
 * AWS: Amazon OpenSearch configuration for search analytics and log analysis
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon OpenSearch and MDAA requirements
 */
export interface SubnetConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Subnet identifier for OpenSearch domain placement enabling VPC network isolation and availability zone distribution. Specifies the subnet where OpenSearch domain nodes will be deployed, supporting network isolation and multi-AZ deployment patterns for high availability.
   *
   * Use cases: VPC network isolation; Multi-AZ deployment; Network placement control; High availability configuration
   *
   * AWS: Amazon OpenSearch domain subnet configuration for VPC deployment and network isolation
   *
   * Validation: Must be valid subnet ID; required; subnet must exist in the specified VPC and availability zone
   **/
  readonly subnetId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Availability zone for OpenSearch domain node placement enabling geographic distribution and fault tolerance. Specifies the availability zone where the subnet is located, supporting multi-AZ deployment patterns and high availability configurations.
   *
   * Use cases: Multi-AZ deployment; Fault tolerance; Geographic distribution; High availability; Disaster recovery
   *
   * AWS: Amazon OpenSearch domain availability zone configuration for high availability and fault tolerance
   *
   * Validation: Must be valid availability zone name; required; must match the availability zone of the specified subnet
   **/
  readonly availabilityZone: string;
}

/**
 * Q-ENHANCED-INTERFACE
 * CustomEndpointConfig configuration interface for search analytics and log analysis.
 *
 * Use cases: Search analytics; Log analysis; Full-text search; Data indexing
 *
 * AWS: Amazon OpenSearch configuration for search analytics and log analysis
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon OpenSearch and MDAA requirements
 */
export interface CustomEndpointConfig {
  /**
   * Q-ENHANCED-PROPERTY
   * Fully qualified domain name for OpenSearch custom endpoint enabling branded domain access and SSL certificate management. Specifies the custom domain name for accessing the OpenSearch domain, supporting branded access patterns and custom SSL certificate configuration.
   *
   * Use cases: Branded domain access; Custom SSL certificates; Domain-specific access; Professional endpoint naming
   *
   * AWS: Amazon OpenSearch domain custom endpoint configuration for branded domain access
   *
   * Validation: Must be valid FQDN format; required when customEndpoint section is specified; domain must be resolvable
   **/
  readonly domainName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * ACM certificate ARN for custom endpoint SSL/TLS encryption enabling secure custom domain access. When specified, uses existing ACM certificate for SSL/TLS encryption; otherwise, a new certificate will be automatically created for the custom domain.
   *
   * Use cases: Custom SSL certificates; Existing certificate reuse; SSL/TLS encryption; Secure domain access
   *
   * AWS: AWS Certificate Manager certificate for OpenSearch custom endpoint SSL/TLS encryption
   *
   * Validation: Must be valid ACM certificate ARN if specified; certificate must be valid for the specified domain name
   **/
  readonly acmCertificateArn?: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Route53 hosted zone enablement for custom endpoint DNS management enabling automated DNS record creation. When enabled, automatically creates DNS records in Route53 for the custom endpoint; when disabled, DNS management must be handled externally.
   *
   * Use cases: Automated DNS management; Route53 integration; DNS record automation; Domain resolution setup
   *
   * AWS: Amazon Route53 hosted zone integration for OpenSearch custom endpoint DNS management
   *
   * Validation: Boolean value; when true, enables automatic DNS record creation in Route53 hosted zone
   **/
  readonly route53HostedZoneEnabled?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Route53 hosted zone domain name for DNS management enabling domain-specific DNS configuration. Specifies the domain name used in the hosted zone for DNS record creation, supporting domain-specific DNS management and resolution.
   *
   * Use cases: Domain-specific DNS; Hosted zone configuration; DNS management; Domain resolution
   *
   * AWS: Amazon Route53 hosted zone domain name for OpenSearch custom endpoint DNS management
   *
   * Validation: Must be valid domain name if specified; domain must exist in Route53 hosted zone
   **/
  readonly route53HostedZoneDomainName?: string;
}

export interface OpensearchDomainProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Data admin role reference for OpenSearch domain administration enabling domain management and dashboard access. Specifies the IAM role that will be granted administrative access to OpenSearch Dashboard for SAML configuration and domain management through the web interface.
   *
   * Use cases: Domain administration; Dashboard access; SAML configuration; Administrative management; Security configuration
   *
   * AWS: Amazon OpenSearch domain admin role for dashboard access and domain administration
   *
   * Validation: Must be valid MdaaRoleRef; required; role must have appropriate permissions for OpenSearch administration
   **/
  readonly dataAdminRole: MdaaRoleRef;
  /**
   * Q-ENHANCED-PROPERTY
   * Functional name for OpenSearch domain enabling organized domain identification and MDAA naming convention application. Provides the base name for the OpenSearch domain which will be processed through MDAA naming conventions, with automatic ID suffixing if the resultant name exceeds 28 characters.
   *
   * Use cases: Domain identification; Naming convention application; Organized domain management; Resource naming
   *
   * AWS: Amazon OpenSearch domain name with MDAA naming convention processing
   *
   * Validation: Must be valid domain name; required; processed through MDAA naming conventions with automatic truncation and ID suffixing
   **/
  readonly opensearchDomainName: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Custom endpoint configuration for branded domain access enabling professional endpoint naming and SSL certificate management. When specified, configures custom domain name, SSL certificates, and DNS management for branded access to the OpenSearch domain.
   *
   * Use cases: Branded domain access; Custom SSL certificates; Professional endpoint naming; DNS management
   *
   * AWS: Amazon OpenSearch domain custom endpoint configuration for branded access and SSL management
   *
   * Validation: Must be valid CustomEndpointConfig if specified; enables custom domain access when provided
   **/
  readonly customEndpoint?: CustomEndpointConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * VPC identifier for OpenSearch domain deployment enabling network isolation and security controls. Specifies the VPC where the OpenSearch domain will be created, providing network-level isolation and security for search analytics workloads.
   *
   * Use cases: Network isolation; VPC security; Private domain deployment; Network access control
   *
   * AWS: Amazon OpenSearch domain VPC configuration for network isolation and security
   *
   * Validation: Must be valid VPC ID; required; VPC must exist and be accessible for domain deployment
   **/
  readonly vpcId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Subnet configurations for OpenSearch domain node placement enabling multi-AZ deployment and high availability. Specifies the subnets where domain nodes will be deployed, supporting availability zone distribution and fault tolerance for search analytics workloads.
   *
   * Use cases: Multi-AZ deployment; High availability; Fault tolerance; Network placement control; Availability zone distribution
   *
   * AWS: Amazon OpenSearch domain subnet configuration for multi-AZ deployment and high availability
   *
   * Validation: Must be array of valid SubnetConfig objects; required; number of subnets must match or exceed zone awareness configuration
   **/
  readonly subnets: SubnetConfig[];

  /**
   * Q-ENHANCED-PROPERTY
   * Security group ingress configuration for OpenSearch domain access control enabling network-based access restrictions. Defines the network access rules for the OpenSearch domain, supporting IP-based and security group-based access control patterns.
   *
   * Use cases: Network access control; Security group-based access; IP-based restrictions; Client connectivity control
   *
   * AWS: Amazon OpenSearch domain security group ingress rules for network access control
   *
   * Validation: Must be valid SecurityGroupIngressProps; required; defines network access patterns for domain security
   *   **/
  readonly securityGroupIngress: SecurityGroupIngressProps;

  /**
   * Q-ENHANCED-PROPERTY
   * Zone awareness configuration for OpenSearch cluster shard distribution enabling multi-AZ fault tolerance and performance optimization. When specified, enables shard distribution across 2 or 3 availability zones for improved fault tolerance and search performance.
   *
   * Use cases: Multi-AZ fault tolerance; Shard distribution; Performance optimization; High availability; Disaster recovery
   *
   * AWS: Amazon OpenSearch domain zone awareness configuration for multi-AZ shard distribution
   *
   * Validation: Must be valid ZoneAwarenessConfig if specified; enables shard distribution across specified availability zones
   **/
  readonly zoneAwareness?: ZoneAwarenessConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * Cluster capacity configuration for OpenSearch domain node sizing enabling performance optimization and cost management. Defines the node types, counts, and capacity settings for the OpenSearch cluster to match workload requirements and performance needs.
   *
   * Use cases: Performance optimization; Cost management; Workload sizing; Cluster scaling; Resource allocation
   *
   * AWS: Amazon OpenSearch domain capacity configuration for cluster node sizing and performance
   *
   * Validation: Must be valid CapacityConfig; required; defines cluster node configuration and capacity settings
   **/
  readonly capacity: CapacityConfig;
  /**
   * Q-ENHANCED-PROPERTY
   * EBS storage configuration for OpenSearch cluster nodes enabling persistent storage and performance optimization. Defines the EBS volume settings for cluster nodes including volume type, size, and performance characteristics for data storage.
   *
   * Use cases: Persistent storage; Performance optimization; Storage sizing; Data retention; I/O performance tuning
   *
   * AWS: Amazon OpenSearch domain EBS storage configuration for cluster node persistent storage
   *
   * Validation: Must be valid EbsOptions; required; defines EBS volume configuration for cluster nodes
   *   **/
  readonly ebs: EbsOptions;
  /**
   * Q-ENHANCED-PROPERTY
   * Automated snapshot start hour for OpenSearch domain backup scheduling enabling data protection and recovery capabilities. Specifies the hour of day when automated snapshot creation will begin, supporting data backup and disaster recovery requirements.
   *
   * Use cases: Data backup; Disaster recovery; Automated snapshots; Data protection; Recovery point management
   *
   * AWS: Amazon OpenSearch domain automated snapshot configuration for data backup and recovery
   *
   * Validation: Must be integer between 0-23; required; defines the hour when automated snapshots begin
   **/
  readonly automatedSnapshotStartHour: number;
  /**
   * Q-ENHANCED-PROPERTY
   * OpenSearch engine version for domain deployment enabling version-specific features and compatibility. Specifies the OpenSearch engine version in x.y format where x is major version and y is minor version, controlling available features and compatibility.
   *
   * Use cases: Version-specific features; Compatibility control; Feature availability; Engine capabilities; Version management
   *
   * AWS: Amazon OpenSearch domain engine version for feature availability and compatibility
   *
   * Validation: Must be valid OpenSearch version in x.y format; required; version must be supported by AWS OpenSearch service
   **/
  readonly opensearchEngineVersion: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Automatic version upgrade enablement for OpenSearch domain maintenance enabling automated engine updates and security patches. When enabled, allows AWS to automatically upgrade the OpenSearch engine version for security and feature updates; when disabled, requires manual version management.
   *
   * Use cases: Automated maintenance; Security updates; Version management; Feature updates; Maintenance automation
   *
   * AWS: Amazon OpenSearch domain automatic version upgrade configuration for maintenance and security
   *
   * Validation: Must be boolean; required; controls automatic version upgrade behavior for domain maintenance
   **/
  readonly enableVersionUpgrade: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Domain access policy statements for fine-grained access control enabling resource-based permissions and security policies. Defines IAM policy statements that control access to the OpenSearch domain, supporting fine-grained access control and security policies.
   *
   * Use cases: Fine-grained access control; Resource-based permissions; Security policies; Access management; Permission control
   *
   * AWS: Amazon OpenSearch domain access policies for fine-grained access control and security
   *
   * Validation: Must be array of valid PolicyStatementProps; required; defines access control policies for domain security
   **/
  readonly accessPolicies: PolicyStatementProps[];

  /**
   * Q-ENHANCED-PROPERTY
   * Event notification configuration for OpenSearch domain monitoring enabling operational awareness and alerting. Configures email notifications for domain events, cluster status changes, and operational alerts for proactive monitoring and management.
   *
   * Use cases: Operational monitoring; Event alerting; Domain status tracking; Proactive management; Notification automation
   *
   * AWS: Amazon SNS notifications for OpenSearch domain events and operational monitoring
   *
   * Validation: Must be valid EventNotificationsProps if specified; enables domain event monitoring and alerting
   **/
  readonly eventNotifications?: EventNotificationsProps;
}

/**
 * Q-ENHANCED-INTERFACE
 * EventNotificationsProps configuration interface for search analytics and log analysis.
 *
 * Use cases: Search analytics; Log analysis; Full-text search; Data indexing
 *
 * AWS: Amazon OpenSearch configuration for search analytics and log analysis
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon OpenSearch and MDAA requirements
 */
export interface EventNotificationsProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Email addresses for OpenSearch domain event notifications enabling operational alerting and monitoring. Specifies the email addresses that will receive notifications for domain events, cluster status changes, and operational alerts for proactive domain management.
   *
   * Use cases: Operational alerting; Email notifications; Domain monitoring; Proactive management; Event tracking
   *
   * AWS: Amazon SNS email subscriptions for OpenSearch domain event notifications and monitoring
   *
   * Validation: Must be array of valid email addresses if specified; enables email-based domain event notifications
   **/
  readonly email?: string[];
}

export interface SuppressionProps {
  readonly id: string;
  readonly reason: string;
}

export interface OpensearchL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required OpenSearch domain configuration defining search and analytics infrastructure including cluster settings, security configuration, and access controls. Provides complete domain setup with VPC networking, encryption, monitoring, and dashboard access for search and analytics operations.
   *
   * Use cases: Search domain configuration; Analytics infrastructure; Security setup; Dashboard access
   *
   * AWS: OpenSearch domain configuration for search and analytics infrastructure deployment
   *
   * Validation: Must be valid OpensearchDomainProps; required for OpenSearch domain deployment and search infrastructure
   *   **/
  readonly domain: OpensearchDomainProps;
}
//This stack creates all the resources required for a Data Warehouse
export class OpensearchL3Construct extends MdaaL3Construct {
  protected readonly props: OpensearchL3ConstructProps;

  private dataAdminRole: MdaaResolvableRole;
  private readonly opensearchDomainKmsKey: MdaaKmsKey;
  private readonly logGroup: MdaaLogGroup;

  constructor(scope: Construct, id: string, props: OpensearchL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    const azIds = this.props.domain.subnets.map(s => s.availabilityZone);
    const subnetIds = this.props.domain.subnets.map(s => s.subnetId);
    const subnets = this.props.domain.subnets.map(s =>
      Subnet.fromSubnetAttributes(this, 'subnet-'.concat(s.subnetId), s),
    );

    const vpc = Vpc.fromVpcAttributes(this.scope, `domain-vpc`, {
      vpcId: this.props.domain.vpcId,
      availabilityZones: azIds,
      privateSubnetIds: subnetIds,
    });

    const securityGroupIngress: MdaaSecurityGroupRuleProps = {
      ipv4: this.props.domain.securityGroupIngress.ipv4?.map(x => {
        return { cidr: x, port: 443, protocol: Protocol.TCP, description: `https Ingress for IPV4 CIDR ${x}` };
      }),
      sg: this.props.domain.securityGroupIngress.sg?.map(x => {
        return { sgId: x, port: 443, protocol: Protocol.TCP, description: `https Ingress for SG ${x}` };
      }),
    };

    const securityGroupProps: MdaaSecurityGroupProps = {
      vpc: vpc,
      naming: this.props.naming,
      ingressRules: securityGroupIngress,
    };

    const securityGroup = new MdaaSecurityGroup(this, 'domain-sg', securityGroupProps);

    this.dataAdminRole = this.props.roleHelper.resolveRoleRefWithRefId(this.props.domain.dataAdminRole, 'DataAdmin');

    this.opensearchDomainKmsKey = this.createOpensearchDomainKMSKey();

    this.logGroup = this.createLogGroup(this.opensearchDomainKmsKey, props.domain.opensearchDomainName, props.naming);

    const certificate =
      this.props.domain.customEndpoint != undefined && this.props.domain.customEndpoint.acmCertificateArn != undefined
        ? Certificate.fromCertificateArn(
            this.scope,
            `opensearch-custom-endpoint-certificate-${this.props.domain.opensearchDomainName}`,
            this.props.domain.customEndpoint?.acmCertificateArn,
          )
        : undefined;

    const hostedZoneProviderProps =
      this.props.domain.customEndpoint != undefined &&
      this.props.domain.customEndpoint.route53HostedZoneDomainName != undefined
        ? {
            domainName: this.props.domain.customEndpoint.route53HostedZoneDomainName,
            privateZone: true,
            vpcId: this.props.domain.vpcId,
          }
        : undefined;

    const hostedZone =
      hostedZoneProviderProps != undefined
        ? HostedZone.fromLookup(
            this.scope,
            `opensearch-custom-endpoint-hosted-zone-${this.props.domain.opensearchDomainName}`,
            hostedZoneProviderProps,
          )
        : undefined;

    const domainL2Props: MdaaOpensearchDomainProps = {
      masterUserRoleArn: this.dataAdminRole.arn(),
      version: EngineVersion.openSearch(this.props.domain.opensearchEngineVersion),
      opensearchDomainName: this.props.naming.props.moduleName,
      enableVersionUpgrade: this.props.domain.enableVersionUpgrade,
      encryptionKey: this.opensearchDomainKmsKey,
      vpc: vpc,
      vpcSubnets: [{ availabilityZones: azIds, subnets: subnets }],
      securityGroups: [securityGroup],
      zoneAwareness: this.props.domain.zoneAwareness ? this.props.domain.zoneAwareness : {},
      capacity: this.props.domain.capacity,
      ebs: this.props.domain.ebs ? this.props.domain.ebs : {},
      customEndpoint: this.props.domain.customEndpoint
        ? { domainName: this.props.domain.customEndpoint.domainName, certificate: certificate, hostedZone: hostedZone }
        : undefined,
      automatedSnapshotStartHour: this.props.domain.automatedSnapshotStartHour,
      accessPolicies: this.props.domain.accessPolicies.map(x => new PolicyStatement(x)),
      naming: this.props.naming,
      logGroup: this.logGroup,
    };

    //Create the domain
    const domain = new MdaaOpensearchDomain(
      this.scope,
      `opensearch-domain-${props.domain.opensearchDomainName}`,
      domainL2Props,
    );
    if (props.domain.eventNotifications) {
      this.createEventNotifications(
        this.props.domain.opensearchDomainName,
        domain,
        this.opensearchDomainKmsKey,
        props.domain.eventNotifications,
      );
    }
  }

  private createEventNotifications(
    domainName: string,
    domain: MdaaOpensearchDomain,
    domainKmsKey: IKey,
    eventNotifications: EventNotificationsProps,
  ) {
    //Create Rule
    const ruleProps: EventBridgeRuleProps = {
      description: `Matches OpenSearch events for domain ${domainName}`,
      eventPattern: {
        source: ['aws.es'],
        resources: [domain.domainArn],
      },
    };
    const rule = EventBridgeHelper.createEventRule(
      this.scope,
      this.props.naming,
      `${domainName}-opensearch-events`,
      ruleProps,
    );

    //Create Topic
    const topic = new MdaaSnsTopic(this.scope, `domain-events-topic`, {
      naming: this.props.naming,
      topicName: `${domainName}-opensearch-events`,
      masterKey: domainKmsKey,
    });

    //Add email subs
    eventNotifications?.email?.forEach(email => {
      topic.addSubscription(new EmailSubscription(email.trim()));
    });

    //Create DLQ
    const dlq = EventBridgeHelper.createDlq(
      this.scope,
      this.props.naming,
      `${domainName}-opensearch-events`,
      domainKmsKey,
    );

    //Create Target
    const target = new aws_events_targets.SnsTopic(topic, {
      deadLetterQueue: dlq,
    });

    //Add Target
    rule.addTarget(target);
  }

  private createOpensearchDomainKMSKey(): MdaaKmsKey {
    const kmsKey = new MdaaKmsKey(this.scope, 'opensearch-domain-key', {
      alias: 'opensearch-domain',
      naming: this.props.naming,
      keyAdminRoleIds: [this.dataAdminRole.id()],
    });

    const AllowOpensearchLogGroupEncryption = new PolicyStatement({
      sid: 'AllowOpensearchLogGroupEncryption',
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

    kmsKey.addToResourcePolicy(AllowOpensearchLogGroupEncryption);

    return kmsKey;
  }

  private createLogGroup(
    encryptionKey: MdaaKmsKey,
    opensearchDomainName: string,
    naming: IMdaaResourceNaming,
  ): MdaaLogGroup {
    const logGroupProps = {
      encryptionKey: encryptionKey,
      logGroupNamePathPrefix: '/aws/opensearch-logs/',
      logGroupName: opensearchDomainName,
      retention: RetentionDays.INFINITE,
      naming: naming,
    };

    return new MdaaLogGroup(this.scope, `cloudwatch-log-group-${opensearchDomainName}`, logGroupProps);
  }
}

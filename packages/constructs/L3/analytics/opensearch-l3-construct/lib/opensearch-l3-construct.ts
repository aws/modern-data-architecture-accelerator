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
 * Ingress rules for the OpenSearch domain security group.
 * Supports both IPv4 CIDR blocks and security group references.
 *
 * Use cases: IP-based access control; Security group-based service connectivity
 *
 * AWS: VPC security group ingress rules for OpenSearch domain
 *
 * Validation: At least one of ipv4 or sg should be specified
 */
export interface SecurityGroupIngressProps {
  /**
   * IPv4 CIDR blocks allowed to access the OpenSearch domain.
   *
   * Use cases: Network-based access control; VPC CIDR allowlisting; Client IP restrictions
   *
   * AWS: Security group ingress rules with IPv4 CIDR sources
   *
   * Validation: Optional; array of valid IPv4 CIDR blocks (e.g., '10.0.0.0/16')
   */
  readonly ipv4?: string[];
  /**
   * Security group IDs allowed to access the OpenSearch domain.
   *
   * Use cases: Service-to-service access; Application tier connectivity; Security group chaining
   *
   * AWS: Security group ingress rules with security group sources
   *
   * Validation: Optional; array of valid security group IDs in the same VPC
   */
  readonly sg?: string[];
}

/**
 * Subnet placement configuration for OpenSearch domain nodes.
 * Number of subnets must match or exceed the zone awareness availability zone count.
 *
 * Use cases: Multi-AZ node placement; VPC subnet selection; Availability zone distribution
 *
 * AWS: OpenSearch domain VPC subnet configuration
 *
 * Validation: subnetId and availabilityZone required; must match actual subnet AZ
 */
export interface SubnetConfig {
  /**
   * VPC subnet ID for OpenSearch node placement.
   *
   * Use cases: VPC network isolation; Subnet-specific deployment
   *
   * AWS: VPC subnet for OpenSearch domain nodes
   *
   * Validation: Required; valid subnet ID in the specified VPC
   */
  readonly subnetId: string;
  /**
   * Availability zone of the subnet (e.g., us-east-1a).
   * Must match the actual AZ of the specified subnet.
   *
   * Use cases: Multi-AZ distribution; Fault tolerance; Geographic placement
   *
   * AWS: Availability zone for OpenSearch node placement
   *
   * Validation: Required; valid AZ name matching the subnet's AZ
   */
  readonly availabilityZone: string;
}

/**
 * Custom endpoint configuration for branded OpenSearch domain access.
 * Configures custom domain name, SSL certificate, and optional Route53 DNS integration.
 * If acmCertificateArn is omitted, a new ACM certificate is created automatically.
 *
 * Use cases: Branded domain access; Custom SSL certificates; Automated DNS record creation
 *
 * AWS: OpenSearch custom endpoint with ACM certificate and optional Route53 CNAME
 *
 * Validation: domainName required; route53HostedZoneDomainName required when route53HostedZoneEnabled is true
 */
export interface CustomEndpointConfig {
  /**
   * Fully qualified domain name for the custom endpoint (e.g., search.example.com).
   *
   * Use cases: Branded domain access; Professional endpoint naming
   *
   * AWS: OpenSearch custom endpoint domain name
   *
   * Validation: Required; valid FQDN
   */
  readonly domainName: string;
  /**
   * Existing ACM certificate ARN for SSL/TLS. If omitted, a new certificate is created.
   *
   * Use cases: Existing certificate reuse; Custom SSL management
   *
   * AWS: ACM certificate for OpenSearch custom endpoint
   *
   * Validation: Optional; valid ACM certificate ARN matching the domain name
   */
  readonly acmCertificateArn?: string;
  /**
   * Enable automatic Route53 CNAME record creation for the custom endpoint.
   *
   * Use cases: Automated DNS management; Route53 integration
   *
   * AWS: Route53 CNAME record for OpenSearch custom endpoint
   *
   * Validation: Optional; boolean
   */
  readonly route53HostedZoneEnabled?: boolean;
  /**
   * Route53 hosted zone domain name for DNS record creation (e.g., example.com).
   * Required when route53HostedZoneEnabled is true.
   *
   * Use cases: Hosted zone selection; Domain-specific DNS configuration
   *
   * AWS: Route53 hosted zone for CNAME record creation
   *
   * Validation: Optional; valid domain name matching an existing Route53 hosted zone
   */
  readonly route53HostedZoneDomainName?: string;
}

/**
 * SAML authentication configuration for OpenSearch Dashboard SSO integration.
 * Requires the IdP entity ID and metadata XML content for SAML 2.0 setup.
 */
export interface SamlAuthenticationConfig {
  /**
   * The unique entity ID of the SAML identity provider
   */
  readonly idpEntityId: string;

  /**
   * The SAML metadata XML content from the identity provider.
   *
   * REQUIRED: For security reasons, provide the metadata XML content directly.
   *
   * To fetch metadata from a URL, use a secure method outside of CDK synth:
   * ```bash
   * curl -s "https://your-idp.com/metadata" > saml-metadata.xml
   * ```
   * Then reference it in your configuration.
   */
  readonly idpMetadataXml: string;
}

export interface OpensearchDomainProps {
  /**
   * IAM role granted admin access to OpenSearch Dashboard for SAML configuration and domain management.
   *
   * Use cases: Domain administration; Dashboard SAML setup; Security configuration
   *
   * AWS: IAM role with OpenSearch admin permissions
   *
   * Validation: Required; valid MdaaRoleRef
   */
  readonly dataAdminRole: MdaaRoleRef;
  /**
   * Functional name for the OpenSearch domain. Processed through MDAA naming conventions;
   * if the resulting name exceeds 28 characters, a random ID suffix is appended to a truncated name.
   *
   * Use cases: Domain identification; MDAA naming convention compliance
   *
   * AWS: OpenSearch domain name
   *
   * Validation: Required; string
   */
  readonly opensearchDomainName: string;
  /**
   * Custom endpoint configuration for branded domain access with SSL and optional Route53 DNS.
   *
   * Use cases: Branded domain access; Custom SSL certificates; Automated DNS management
   *
   * AWS: OpenSearch custom endpoint with ACM and Route53
   *
   * Validation: Optional; valid CustomEndpointConfig
   */
  readonly customEndpoint?: CustomEndpointConfig;
  /**
   * VPC ID for OpenSearch domain deployment. The domain is VPC-bound without public addresses.
   *
   * Use cases: Network isolation; Private domain deployment; VPC security
   *
   * AWS: VPC for OpenSearch domain network configuration
   *
   * Validation: Required; valid VPC ID
   */
  readonly vpcId: string;
  /**
   * Subnet configurations for domain node placement. Number of subnets must match or exceed
   * the zoneAwareness availabilityZoneCount.
   *
   * Use cases: Multi-AZ deployment; High availability; Fault tolerance
   *
   * AWS: VPC subnets for OpenSearch domain nodes
   *
   * Validation: Required; array of SubnetConfig with matching AZs
   */
  readonly subnets: SubnetConfig[];

  /**
   * Security group ingress rules controlling network access to the domain.
   * All egress is permitted by default; no ingress is permitted by default.
   *
   * Use cases: Network access control; IP and security group-based restrictions
   *
   * AWS: VPC security group for OpenSearch domain
   *
   * Validation: Required; valid SecurityGroupIngressProps
   */
  readonly securityGroupIngress: SecurityGroupIngressProps;

  /**
   * Zone awareness configuration for shard distribution across 2 or 3 availability zones.
   *
   * Use cases: Multi-AZ fault tolerance; Shard distribution; High availability
   *
   * AWS: OpenSearch zone awareness for cross-AZ shard replication
   *
   * Validation: Optional; valid ZoneAwarenessConfig
   */
  readonly zoneAwareness?: ZoneAwarenessConfig;
  /**
   * Cluster capacity configuration defining master nodes, data nodes, and warm nodes.
   *
   * Use cases: Performance sizing; Cost management; Workload-specific capacity
   *
   * AWS: OpenSearch cluster node types and counts
   *
   * Validation: Required; valid CapacityConfig
   */
  readonly capacity: CapacityConfig;
  /**
   * EBS storage configuration for cluster data nodes (volume type, size, IOPS).
   *
   * Use cases: Storage sizing; I/O performance tuning; Data retention capacity
   *
   * AWS: EBS volumes attached to OpenSearch data nodes
   *
   * Validation: Required; valid EbsOptions
   */
  readonly ebs: EbsOptions;
  /**
   * Hour of day (0-23 UTC) when automated snapshot creation begins.
   *
   * Use cases: Backup scheduling; Data protection; Recovery point management
   *
   * AWS: OpenSearch automated snapshot configuration
   *
   * Validation: Required; integer 0-23
   */
  readonly automatedSnapshotStartHour: number;
  /**
   * OpenSearch engine version in x.y format (e.g., '2.3').
   *
   * Use cases: Version-specific features; Compatibility control; Engine selection
   *
   * AWS: OpenSearch engine version
   *
   * Validation: Required; supported OpenSearch version string
   */
  readonly opensearchEngineVersion: string;
  /**
   * Allow automatic OpenSearch engine version upgrades for security patches and features.
   *
   * Use cases: Automated maintenance; Security patching; Version management
   *
   * AWS: OpenSearch automatic version upgrade setting
   *
   * Validation: Required; boolean
   */
  readonly enableVersionUpgrade: boolean;
  /**
   * IAM policy statements defining domain access control.
   * Note: IP-based policies cannot be applied to VPC-bound domains.
   *
   * Use cases: Fine-grained access control; Resource-based permissions; Domain security
   *
   * AWS: OpenSearch domain access policies
   *
   * Validation: Required; array of valid PolicyStatementProps
   */
  readonly accessPolicies: PolicyStatementProps[];

  /**
   * SAML authentication configuration for SSO integration with corporate identity providers
   * (e.g., Okta, Azure AD, AWS IAM Identity Center).
   *
   * Use cases: Single Sign-On; Corporate identity integration; Centralized authentication
   *
   * AWS: OpenSearch SAML authentication for Dashboard SSO
   *
   * Validation: Optional; valid SamlAuthenticationConfig with idpEntityId and idpMetadataXml
   */
  readonly samlAuthentication?: SamlAuthenticationConfig;

  /**
   * Event notification configuration for domain monitoring via SNS email subscriptions.
   *
   * Use cases: Operational alerting; Domain health monitoring; Event tracking
   *
   * AWS: SNS topic with email subscriptions for OpenSearch domain events
   *
   * Validation: Optional; valid EventNotificationsProps
   */
  readonly eventNotifications?: EventNotificationsProps;
}

/**
 * Email notification configuration for OpenSearch domain events.
 *
 * Use cases: Operational alerting; Domain health monitoring; Event notification
 *
 * AWS: SNS email subscriptions for OpenSearch domain events
 *
 * Validation: email array optional
 */
export interface EventNotificationsProps {
  /**
   * Email addresses to receive OpenSearch domain event notifications.
   * An SNS topic is created regardless; if no emails specified, other subscription types can be added directly.
   *
   * Use cases: Operational alerting; Team notification; Domain monitoring
   *
   * AWS: SNS email subscriptions
   *
   * Validation: Optional; array of valid email addresses
   */
  readonly email?: string[];
}

export interface SuppressionProps {
  readonly id: string;
  readonly reason: string;
}

export interface OpensearchL3ConstructProps extends MdaaL3ConstructProps {
  // Complete OpenSearch domain configuration
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

    const samlOptions = this.resolveSamlOptions();

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
      samlOptions: samlOptions,
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

  private resolveSamlOptions(): { idpEntityId: string; idpMetadataContent: string } | undefined {
    const samlConfig = this.props.domain.samlAuthentication;
    if (!samlConfig) {
      return undefined;
    }

    return {
      idpEntityId: samlConfig.idpEntityId,
      idpMetadataContent: samlConfig.idpMetadataXml,
    };
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

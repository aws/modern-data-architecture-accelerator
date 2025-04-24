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

export interface SecurityGroupIngressProps {
  /**
   * CIDR range of the ingres definition
   */
  readonly ipv4?: string[];
  /**
   * Security Group ID of the ingres definition
   */
  readonly sg?: string[];
}

export interface SubnetConfig {
  readonly subnetId: string;
  readonly availabilityZone: string;
}

export interface CustomEndpointConfig {
  /**
   * Required if customeEndpoint section is specified.
   * Fully Qualified Domain Name
   */
  readonly domainName: string;
  /**
   * Optional. A certificate will be created in ACM if not specified.
   */
  readonly acmCertificateArn?: string;
  /**
   * Optional. Private hosted Zone configuration will not be setup (CName record).
   */
  readonly route53HostedZoneEnabled?: boolean;
  /**
   * Optional. Domain Name used in the hosted zone.
   */
  readonly route53HostedZoneDomainName?: string;
}

export interface OpensearchDomainProps {
  /**
   * Required. ARN of Data Admin role. This role will be granted admin access to Opensearch Dashboard to update SAML configurations via web interface
   */
  readonly dataAdminRole: MdaaRoleRef;
  /**
   * Required. Functional Name of Opensearch Domain.
   * This will be prefixed as per MDAA naming convention.
   * If resultant name is longer than 28 characters, a randomly generated ID will be suffixed to truncated name.
   */
  readonly opensearchDomainName: string;
  /**
   * Optional. Custom endpoint configuration.
   */
  readonly customEndpoint?: CustomEndpointConfig;
  /**
   * Required. ID of VPC in which Opensearch domain will be created.
   */
  readonly vpcId: string;
  /**
   * Required. ID(s) of subnets in which Opensearch domain will be created.
   * Make sure the number of subnets specified is same as or more than the number of AZs speceified in zoneAwareness configuration and span across as many AZs.
   */
  readonly subnets: SubnetConfig[];

  /**
   * List of security group ingress properties
   */
  readonly securityGroupIngress: SecurityGroupIngressProps;

  /**
   * Optional. Opensearch cluster will enable shard distribution across 2 or 3 zones as specified.
   */
  readonly zoneAwareness?: ZoneAwarenessConfig;
  /**
   * Required. Opensearch cluster node configurations.
   */
  readonly capacity: CapacityConfig;
  /**
   * Required. EBS storage configuration for cluster nodes.
   */
  readonly ebs: EbsOptions;
  /**
   * Required. Hour of day when automated snapshot creation will start
   */
  readonly automatedSnapshotStartHour: number;
  /**
   * Required. version of Opensearch engine to provision in format x.y where x= major version, y=minor version. https://docs.aws.amazon.com/opensearch-service/latest/developerguide/what-is.html#choosing-version
   */
  readonly opensearchEngineVersion: string;
  /**
   * Required. Allow/Disallow automatic version upgrades.
   */
  readonly enableVersionUpgrade: boolean;
  /**
   * Optional. Domain access policies.
   */
  readonly accessPolicies: PolicyStatementProps[];

  /**
   * Event notification configuration
   */
  readonly eventNotifications?: EventNotificationsProps;
}

export interface EventNotificationsProps {
  readonly email?: string[];
}

export interface SuppressionProps {
  readonly id: string;
  readonly reason: string;
}

export interface OpensearchL3ConstructProps extends MdaaL3ConstructProps {
  readonly domain: OpensearchDomainProps;
}
//This stack creates all of the resources required for a Data Warehouse
export class OpensearchL3Construct extends MdaaL3Construct {
  protected readonly props: OpensearchL3ConstructProps;

  private dataAdminRole: MdaaResolvableRole;
  private opensearchDomainKmsKey: MdaaKmsKey;
  private logGroup: MdaaLogGroup;

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

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { Token } from 'aws-cdk-lib';
import {
  CfnSecurityGroupEgress,
  CfnSecurityGroupIngress,
  IPeer,
  IVpc,
  Peer,
  Port,
  PortProps,
  Protocol,
  SecurityGroup,
  SecurityGroupProps,
} from 'aws-cdk-lib/aws-ec2';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';
import { NagPackSuppression } from 'cdk-nag';

/**
 * Q-ENHANCED-INTERFACE
 * MdaaSecurityGroupRuleProps configuration interface for compute infrastructure and instance management.
 *
 * Use cases: Compute infrastructure; Instance management; Network configuration; Security groups
 *
 * AWS: Amazon EC2 configuration for compute infrastructure and instance management
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon EC2 and MDAA requirements
 */
export interface MdaaSecurityGroupRuleProps {
  /**
   * Q-ENHANCED-PROPERTY
   * IPv4 CIDR block rules for security group traffic control defining IP address-based access restrictions. Specifies IPv4 CIDR blocks that are allowed or denied access through the security group for network-level access control and IP-based security policies.
   *
   * Use cases: IP-based access control; Network segmentation; CIDR-based restrictions; Geographic access control; Network security policies
   *
   * AWS: AWS EC2 SecurityGroup rules with IPv4 CIDR block sources/destinations
   *
   * Validation: Must be valid MdaaCidrPeer array with valid CIDR notation; optional array for IP-based rules
   *   **/
  readonly ipv4?: MdaaCidrPeer[];
  /**
   * Q-ENHANCED-PROPERTY
   * Security group rules for cross-security group traffic control defining security group-based access restrictions. Specifies other security groups that are allowed access through this security group for resource-level access control and security group chaining.
   *
   * Use cases: Cross-security group access; Resource-based access control; Security group chaining; Service-to-service communication; Layered security
   *
   * AWS: AWS EC2 SecurityGroup rules with security group sources/destinations
   *
   * Validation: Must be valid MdaaSecurityGroupPeer array with valid security group IDs; optional array for SG-based rules
   *   **/
  readonly sg?: MdaaSecurityGroupPeer[];
  /**
   * Q-ENHANCED-PROPERTY
   * Prefix list rules for security group traffic control defining managed prefix list-based access restrictions. Specifies AWS-managed or customer-managed prefix lists for scalable IP address range management and centralized network access control.
   *
   * Use cases: Managed IP ranges; Scalable access control; Centralized IP management; AWS service access; Regional IP restrictions
   *
   * AWS: AWS EC2 SecurityGroup rules with prefix list sources/destinations
   *
   * Validation: Must be valid MdaaPrefixListPeer array with valid prefix list IDs; optional array for prefix list-based rules
   *   **/
  readonly prefixList?: MdaaPrefixListPeer[];
}

export interface MdaaPeer {
  readonly port?: number;
  /**
   * Q-ENHANCED-PROPERTY
   * The ending port number for the security group rule defining the upper bound of the port range. Specifies the ending port for port range rules enabling flexible port range configuration for network access control and service-specific traffic management.
   *
   * Use cases: Port range configuration; Service port ranges; Flexible port access; Multi-port services; Port range restrictions
   *
   * AWS: AWS EC2 SecurityGroup rule ToPort property for port range specification
   *
   * Validation: Must be valid port number (1-65535); should be >= port (fromPort); optional number for port range rules
   **/
  readonly toPort?: number;
  readonly protocol: string;
  readonly description?: string;
  readonly suppressions?: NagPackSuppression[];
}

/**
 * Q-ENHANCED-INTERFACE
 * MdaaPrefixListPeer interface.
 *
 * Use cases: Compute infrastructure; Instance management; Network configuration; Security groups
 *
 * AWS: Amazon EC2 configuration for compute infrastructure and instance management
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon EC2 and MDAA requirements
 */
export interface MdaaPrefixListPeer extends MdaaPeer {
  /**
   * Q-ENHANCED-PROPERTY
   * Required prefix list identifier for managed IP range access control in security group rules enabling AWS service and managed IP range-based access control. Defines the prefix list ID that contains managed IP ranges for AWS services or custom IP ranges for streamlined security group rule management.
   *
   * Use cases: AWS service access; Managed IP ranges; Prefix list-based filtering; Streamlined rule management
   *
   * AWS: Amazon EC2 prefix list identifier for managed IP range-based network access control
   *
   * Validation: Must be valid prefix list ID format (pl-xxxxxxxxx); required for prefix list-based security group rules
   **/
  readonly prefixList: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * MdaaCidrPeer interface.
 *
 * Use cases: Compute infrastructure; Instance management; Network configuration; Security groups
 *
 * AWS: Amazon EC2 configuration for compute infrastructure and instance management
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon EC2 and MDAA requirements
 */
export interface MdaaCidrPeer extends MdaaPeer {
  /**
   * Q-ENHANCED-PROPERTY
   * Required CIDR block specification for network access control in security group rules enabling IP range-based access control. Defines the IP address range that will be allowed or denied access through security group rules for network-level access control and security boundaries.
   *
   * Use cases: IP range access control; Network security boundaries; CIDR-based filtering; Network access management
   *
   * AWS: Amazon EC2 security group CIDR block for IP range-based network access control
   *
   * Validation: Must be valid CIDR notation (e.g., 10.0.0.0/16); required for CIDR-based security group rules
   **/
  readonly cidr: string;
}
/**
 * Q-ENHANCED-INTERFACE
 * MdaaSecurityGroupPeer interface.
 *
 * Use cases: Compute infrastructure; Instance management; Network configuration; Security groups
 *
 * AWS: Amazon EC2 configuration for compute infrastructure and instance management
 *
 * Validation: Configuration must be valid for deployment; properties must conform to Amazon EC2 and MDAA requirements
 */
export interface MdaaSecurityGroupPeer extends MdaaPeer {
  /**
   * Q-ENHANCED-PROPERTY
   * Required security group identifier for security group-based access control in network rules enabling security group reference-based access control. Defines the security group ID that will be referenced in security group rules for allowing access between security groups and resources.
   *
   * Use cases: Security group reference; Cross-security group access; Resource-based access control; Security group chaining
   *
   * AWS: Amazon EC2 security group identifier for security group-based network access control
   *
   * Validation: Must be valid security group ID format (sg-xxxxxxxxx); required for security group-based rules
   **/
  readonly sgId: string;
}
export interface MdaaSecurityGroupProps extends MdaaConstructProps {
  /**
   * The name of the security group. For valid values, see the GroupName
   * parameter of the CreateSecurityGroup action in the Amazon EC2 API
   * Reference.
   * It is not recommended to use an explicit group name.
   * @default If you don't specify a GroupName, AWS CloudFormation generates a
   * unique physical ID and uses that ID for the group name.
   */
  readonly securityGroupName?: string;
  /**
   * A description of the security group.
   * @default The default name will be the construct's CDK path.
   */
  readonly description?: string;
  /**
   * The VPC in which to create the security group.
   */
  readonly vpc: IVpc;
  /**
   * Whether to allow all outbound traffic by default.
   * If this is set to true, there will only be a single egress rule which allows all
   * outbound traffic. If this is set to false, no outbound traffic will be allowed by
   * default and all egress traffic must be explicitly authorized.
   * To allow all ipv6 traffic use allowAllIpv6Outbound
   * @default false
   */
  readonly allowAllOutbound?: boolean;
  /**
   * Whether to allow all outbound ipv6 traffic by default.
   * If this is set to true, there will only be a single egress rule which allows all
   * outbound ipv6 traffic. If this is set to false, no outbound traffic will be allowed by
   * default and all egress ipv6 traffic must be explicitly authorized.
   * To allow all ipv4 traffic use allowAllOutbound
   * @default false
   */
  readonly allowAllIpv6Outbound?: boolean;
  /**
   * Whether to disable inline ingress and egress rule optimization.
   * If this is set to true, ingress and egress rules will not be declared under the
   * SecurityGroup in cloudformation, but will be separate elements.
   * Inlining rules is an optimization for producing smaller stack templates. Sometimes
   * this is not desirable, for example when security group access is managed via tags.
   * The default value can be overriden globally by setting the context variable
   * '@aws-cdk/aws-ec2.securityGroupDisableInlineRules'.
   * @default false
   */
  readonly disableInlineRules?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Ingress rules configuration for inbound traffic control to the security group defining allowed inbound connections. Specifies inbound traffic rules including source CIDR blocks, security groups, and prefix lists for network access control and security compliance.
   *
   * Use cases: Inbound traffic control; Network security; Access restrictions; Compliance requirements; Traffic filtering
   *
   * AWS: AWS EC2 SecurityGroup ingress rules for inbound traffic control
   *
   * Validation: Must be valid MdaaSecurityGroupRuleProps with IPv4, security group, or prefix list rules; optional configuration
   *   **/
  readonly ingressRules?: MdaaSecurityGroupRuleProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Egress rules configuration for outbound traffic control from the security group defining allowed outbound connections. Specifies outbound traffic rules including destination CIDR blocks, security groups, and prefix lists for network access control and security compliance.
   *
   * Use cases: Outbound traffic control; Network security; Access restrictions; Compliance requirements; Traffic filtering
   *
   * AWS: AWS EC2 SecurityGroup egress rules for outbound traffic control
   *
   * Validation: Must be valid MdaaSecurityGroupRuleProps with IPv4, security group, or prefix list rules; optional configuration
   *   **/
  readonly egressRules?: MdaaSecurityGroupRuleProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Whether to add a self-referencing rule allowing all TCP connections within the same security group. Enables resources within the same security group to communicate freely with each other for cluster or distributed application architectures.
   *
   * Use cases: Cluster communication; Distributed application networking; Internal service mesh connectivity
   *
   * AWS: AWS EC2 SecurityGroup ingress/egress rules with self-reference
   *
   * Validation: Boolean value; optional flag for enabling self-reference rules
   **/
  readonly addSelfReferenceRule?: boolean;
}

/**
 * MDAA L2 Security Group. Provides a simplified interface for SG rules creation
 */
export class MdaaSecurityGroup extends SecurityGroup {
  private static setProps(props: MdaaSecurityGroupProps): SecurityGroupProps {
    const overrideProps = {
      //Invert the default for allowAllOutbound
      allowAllOutbound: props.allowAllOutbound ?? false,
      securityGroupName: props.naming.resourceName(props.securityGroupName),
    };
    return { ...props, ...overrideProps };
  }

  constructor(scope: Construct, id: string, props: MdaaSecurityGroupProps) {
    super(scope, id, MdaaSecurityGroup.setProps(props));

    // Add Ingress rules
    props.ingressRules?.ipv4?.forEach(rule => {
      const peer = Peer.ipv4(rule.cidr);
      this.addSuppressableIngressRule(
        peer,
        MdaaSecurityGroup.resolvePeerToPort(rule),
        rule.description,
        false,
        rule.suppressions,
      );
    });
    props.ingressRules?.sg?.forEach(rule => {
      const peer = Peer.securityGroupId(rule.sgId);
      this.addSuppressableIngressRule(
        peer,
        MdaaSecurityGroup.resolvePeerToPort(rule),
        rule.description,
        false,
        rule.suppressions,
      );
    });
    props.ingressRules?.prefixList?.forEach(rule => {
      const peer = Peer.prefixList(rule.prefixList);
      this.addSuppressableIngressRule(
        peer,
        MdaaSecurityGroup.resolvePeerToPort(rule),
        rule.description,
        false,
        rule.suppressions,
      );
    });
    // Add Egress rules
    props.egressRules?.ipv4?.forEach(rule => {
      const peer = Peer.ipv4(rule.cidr);
      this.addSuppressableEgressRule(
        peer,
        MdaaSecurityGroup.resolvePeerToPort(rule),
        rule.description,
        false,
        rule.suppressions,
      );
    });
    props.egressRules?.sg?.forEach(rule => {
      const peer = Peer.securityGroupId(rule.sgId);
      this.addSuppressableEgressRule(
        peer,
        MdaaSecurityGroup.resolvePeerToPort(rule),
        rule.description,
        false,
        rule.suppressions,
      );
    });
    props.egressRules?.prefixList?.forEach(rule => {
      const peer = Peer.prefixList(rule.prefixList);
      this.addSuppressableEgressRule(
        peer,
        MdaaSecurityGroup.resolvePeerToPort(rule),
        rule.description,
        false,
        rule.suppressions,
      );
    });

    // Allow all tcp connections from the same security group
    if (props.addSelfReferenceRule != undefined && props.addSelfReferenceRule) {
      const suppressions = [
        {
          id: 'NIST.800.53.R5-EC2RestrictedCommonPorts',
          reason: 'Ingress/Egress is limited to this security group',
        },
        {
          id: 'HIPAA.Security-EC2RestrictedCommonPorts',
          reason: 'Ingress/Egress is limited to this security group',
        },
        {
          id: 'PCI.DSS.321-EC2RestrictedCommonPorts',
          reason: 'Ingress/Egress is limited to this security group',
        },
      ];
      this.addSuppressableIngressRule(this, Port.allTraffic(), `Self-Ref`, false, suppressions);
      //Only add self ref egress rule if all outbound traffic is not otherwise allowed
      if (!props.allowAllOutbound) {
        this.addSuppressableEgressRule(this, Port.allTraffic(), `Self-Ref`, false, suppressions);
      }
    }

    new MdaaParamAndOutput(
      this,
      {
        naming: props.naming,
        resourceType: 'security-group',
        resourceId: props.securityGroupName,
        name: 'id',
        value: this.securityGroupId,
      },
      scope,
    );
  }

  public addSuppressableIngressRule(
    peer: IPeer,
    connection: Port,
    description?: string,
    remoteRule?: boolean,
    suppressions?: NagPackSuppression[],
  ) {
    if (description === undefined) {
      description = `from ${peer.uniqueId}:${connection}`;
    }

    const { scope, id } = this.determineRuleScope(peer, connection, 'from', remoteRule);

    // Skip duplicates
    if (scope.node.tryFindChild(id) === undefined) {
      const ingress = new CfnSecurityGroupIngress(scope, id, {
        groupId: this.securityGroupId,
        ...peer.toIngressRuleConfig(),
        ...connection.toRuleJson(),
        description,
      });
      if (suppressions) {
        MdaaNagSuppressions.addConfigResourceSuppressions(ingress, suppressions, true);
      }
    }
  }

  public addSuppressableEgressRule(
    peer: IPeer,
    connection: Port,
    description?: string,
    remoteRule?: boolean,
    suppressions?: NagPackSuppression[],
  ) {
    if (description === undefined) {
      description = `to ${peer.uniqueId}:${connection}`;
    }

    const { scope, id } = this.determineRuleScope(peer, connection, 'to', remoteRule);

    // Skip duplicates
    if (scope.node.tryFindChild(id) === undefined) {
      const egress = new CfnSecurityGroupEgress(scope, id, {
        groupId: this.securityGroupId,
        ...peer.toEgressRuleConfig(),
        ...connection.toRuleJson(),
        description,
      });
      if (suppressions) {
        MdaaNagSuppressions.addConfigResourceSuppressions(egress, suppressions, true);
      }
    }
  }

  public static resolvePeerToPort(peer: MdaaPeer): Port {
    const protocol: Protocol = Protocol[peer.protocol.toUpperCase() as keyof typeof Protocol];
    if (typeof protocol === 'undefined' || protocol == undefined) {
      throw new Error(`Unknown protocol defined: ${peer.protocol}`);
    }
    const fromPort = peer.port;
    const toPort = peer.toPort || fromPort;

    let stringRepresentation = `${protocol.toString()}`;
    if (protocol == Protocol.ALL) {
      stringRepresentation = `${stringRepresentation} ALL TRAFFIC`;
    } else {
      if (fromPort && toPort) {
        if (toPort == fromPort) {
          stringRepresentation = `${stringRepresentation} PORT ${this.renderPort(fromPort)}`;
        } else {
          stringRepresentation = `${stringRepresentation} RANGE ${this.renderPort(fromPort)}-${this.renderPort(
            toPort,
          )}`;
        }
      } else {
        throw new Error("Port must be specified if protocol is not 'ALL'");
      }
    }
    const portProps: PortProps = {
      protocol: protocol,
      fromPort: fromPort,
      toPort: toPort,
      stringRepresentation: stringRepresentation,
    };
    return new Port(portProps);
  }
  public static renderPort(port: number) {
    return Token.isUnresolved(port) ? '{IndirectPort}' : port.toString();
  }

  public static mergeRules(
    rules1: MdaaSecurityGroupRuleProps,
    rules2: MdaaSecurityGroupRuleProps,
  ): MdaaSecurityGroupRuleProps {
    return {
      sg: [...(rules1.sg || []), ...(rules2.sg || [])],
      ipv4: [...(rules1.ipv4 || []), ...(rules2.ipv4 || [])],
      prefixList: [...(rules1.prefixList || []), ...(rules2.prefixList || [])],
    };
  }
}

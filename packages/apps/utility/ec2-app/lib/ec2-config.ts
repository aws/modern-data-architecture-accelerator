/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  NamedInitProps,
  NamedInstanceProps,
  NamedKeyPairProps,
  NamedNetworkInterfaceProps,
  NamedSecurityGroupProps,
  NamedSecurityGroupRulesProps,
} from '@aws-mdaa/ec2-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface InstanceConfigContents extends MdaaBaseConfigContents {
  /**
   * Roles granted admin access to the EC2 KMS key and KeyPair secrets.
   * Admin roles can decrypt EBS volumes and retrieve SSH private keys from Secrets Manager.
   *
   * Use cases: EC2 key management; SSH key pair secret access; EBS encryption admin
   *
   * AWS: IAM roles, KMS key policy, Secrets Manager
   *
   * Validation: Required; array of MdaaRoleRef; supports name, arn, and id references
   */
  readonly adminRoles: MdaaRoleRef[];
  /**
   * EC2 key pairs for SSH access. Private key material is stored in Secrets Manager,
   * encrypted with the module KMS CMK (or a specified KMS key). Key pairs are retained
   * post stack deletion.
   *
   * Use cases: SSH key provisioning; Encrypted key pair management
   *
   * AWS: EC2 KeyPair, Secrets Manager, KMS
   *
   * Validation: Optional; map of key pair name to KeyPairProps (can be empty object for defaults)
   */
  readonly keyPairs?: NamedKeyPairProps;
  /**
   * VPC security groups for EC2 instances. All egress allowed by default,
   * no ingress allowed by default. Supports ipv4, prefix list, and security group rules.
   *
   * Use cases: Instance network isolation; Application-tier security; VPC endpoint access
   *
   * AWS: EC2 SecurityGroup with ingress/egress rules
   *
   * Validation: Optional; map of security group name to SecurityGroupProps
   */
  readonly securityGroups?: NamedSecurityGroupProps;
  /**
   * Rules added to pre-existing (externally-owned) security groups, keyed by rule-set name.
   * Unlike securityGroups, this does not create any security group; it only authorizes
   * additional ingress/egress rules on a group referenced by id (supports ssm: references).
   * Use this to wire connectivity between two security groups owned by different modules
   * without creating a circular cross-stack dependency.
   *
   * Use cases: QuickSight<->Redshift connectivity; Cross-module security group wiring
   *
   * AWS: EC2 SecurityGroupIngress/SecurityGroupEgress
   *
   * Validation: Optional; map of rule-set name to SecurityGroupRulesProps
   */
  readonly rules?: NamedSecurityGroupRulesProps;
  /**
   * CloudFormation Init configurations for automated instance bootstrap.
   * Each named init contains configSets (ordered execution sequences) and configs
   * (packages, commands, files, services). Referenced by instances via initName.
   *
   * Use cases: Automated software installation; Service configuration; Multi-stage bootstrap
   *
   * AWS: CloudFormation::Init metadata
   *
   * Validation: Optional; map of init name to InitProps
   */
  readonly cfnInit?: NamedInitProps;
  /**
   * Elastic network interfaces (ENIs) to create, keyed by name. An interface is a resource in its
   * own right, so a fixed privateIpAddress declared here survives replacement or termination of
   * whichever instance it is attached to -- which is what makes it safe to allowlist that IP on
   * downstream firewalls -- and the interface is retained when the stack is deleted. Attach them to
   * instances via the instance's networkInterfaces property; they are always attached as secondary
   * interfaces, never as an instance's primary interface.
   *
   * Use cases: Stable allowlisted private IP for a proxy or NAT instance; Multi-homed instances
   *
   * AWS: EC2 NetworkInterface
   *
   * Validation: Optional; map of network interface name to NetworkInterfaceProps
   */
  readonly networkInterfaces?: NamedNetworkInterfaceProps;
  /**
   * EC2 instances to deploy. Instances have termination protection enabled and are
   * retained post stack deletion. EBS volumes are encrypted with the module KMS CMK
   * unless a custom kmsKeyArn is specified. AMI root volumes must be listed in
   * blockDevices to ensure encryption.
   *
   * Use cases: Secure compute deployment; Encrypted instance provisioning
   *
   * AWS: EC2 Instance, EBS, KMS
   *
   * Validation: Optional; map of instance name to InstanceProps
   */
  readonly instances?: NamedInstanceProps;
}

export class InstanceConfigParser extends MdaaAppConfigParser<InstanceConfigContents> {
  public readonly keyPairs?: NamedKeyPairProps;
  public readonly securityGroups?: NamedSecurityGroupProps;
  public readonly rules?: NamedSecurityGroupRulesProps;
  public readonly cfnInit?: NamedInitProps;
  public readonly networkInterfaces?: NamedNetworkInterfaceProps;
  public readonly instances?: NamedInstanceProps;
  public readonly adminRoles: MdaaRoleRef[];
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.adminRoles = this.configContents.adminRoles;
    this.keyPairs = this.configContents.keyPairs;
    this.cfnInit = this.configContents.cfnInit;
    this.networkInterfaces = this.configContents.networkInterfaces;
    this.instances = this.configContents.instances;
    this.securityGroups = this.configContents.securityGroups;
    this.rules = this.configContents.rules;
  }
}

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaAppConfigParser, MdaaAppConfigParserProps, MdaaBaseConfigContents } from '@aws-mdaa/app';
import {
  NamedInitProps,
  NamedInstanceProps,
  NamedKeyPairProps,
  NamedSecurityGroupProps,
} from '@aws-mdaa/ec2-l3-construct';
import { MdaaRoleRef } from '@aws-mdaa/iam-role-helper';
import { Schema } from 'ajv';
import { Stack } from 'aws-cdk-lib';
import * as configSchema from './config-schema.json';

export interface InstanceConfigContents extends MdaaBaseConfigContents {
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of admin role references with access to EC2 KMS keys and key pair secrets enabling secure compute resource management. Provides administrative access to encryption keys and SSH key pairs for secure instance management and access control.
   *
   * Use cases: Secure compute administration; Key management access; SSH key pair administration
   *
   * AWS: AWS IAM roles with KMS and Secrets Manager access for EC2 key management and administration
   *
   * Validation: Must be array of valid MdaaRoleRef objects; required; roles receive access to EC2 keys and secrets
   **/
  readonly adminRoles: MdaaRoleRef[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of key pair names to EC2 key pair configurations enabling secure SSH access to instances. Provides SSH key pair management for secure instance access with proper key rotation and access control capabilities.
   *
   * Use cases: SSH key management; Secure instance access; Key pair rotation and access control
   *
   * AWS: Amazon EC2 key pairs for secure SSH access and instance connectivity
   *
   * Validation: Must be valid NamedKeyPairProps if provided; defines SSH key pair configuration and management
   **/
  readonly keyPairs?: NamedKeyPairProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of security group names to security group configurations enabling network access control for EC2 instances. Provides network security controls with inbound and outbound traffic rules for secure instance networking.
   *
   * Use cases: Network access control; Instance security; Traffic filtering and network isolation
   *
   * AWS: Amazon VPC security groups for EC2 instance network access control and security
   *
   * Validation: Must be valid NamedSecurityGroupProps if provided; defines network security group configuration
   *   **/
  readonly securityGroups?: NamedSecurityGroupProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of CloudFormation init object names to initialization configurations enabling automated instance setup and configuration. Provides instance initialization with software installation, configuration management, and automated setup workflows.
   *
   * Use cases: Automated instance setup; Software installation; Configuration management and initialization
   *
   * AWS: AWS CloudFormation Init for automated EC2 instance configuration and setup
   *
   * Validation: Must be valid NamedInitProps if provided; defines instance initialization and configuration scripts
   **/
  readonly cfnInit?: NamedInitProps;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional map of instance names to EC2 instance configurations enabling compute resource deployment. Provides complete instance configuration with AMI selection, instance types, networking, and security settings for diverse compute workloads.
   *
   * Use cases: Compute resource deployment; Instance configuration; Workload-specific compute setup
   *
   * AWS: Amazon EC2 instances for compute resource deployment and workload execution
   *
   * Validation: Must be valid NamedInstanceProps if provided; defines complete EC2 instance configuration
   **/
  readonly instances?: NamedInstanceProps;
}

export class InstanceConfigParser extends MdaaAppConfigParser<InstanceConfigContents> {
  public readonly keyPairs?: NamedKeyPairProps;
  public readonly securityGroups?: NamedSecurityGroupProps;
  public readonly cfnInit?: NamedInitProps;
  public readonly instances?: NamedInstanceProps;
  public readonly adminRoles: MdaaRoleRef[];
  constructor(stack: Stack, props: MdaaAppConfigParserProps) {
    super(stack, props, configSchema as Schema);
    this.adminRoles = this.configContents.adminRoles;
    this.keyPairs = this.configContents.keyPairs;
    this.cfnInit = this.configContents.cfnInit;
    this.instances = this.configContents.instances;
    this.securityGroups = this.configContents.securityGroups;
  }
}

/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaRole } from '@aws-mdaa/iam-constructs';
import { MdaaL3Construct, MdaaL3ConstructProps } from '@aws-mdaa/l3-construct';
import { MdaaSFTPServer } from '@aws-mdaa/transfer-family-constructs';

import { CfnSecurityGroup, CfnEIP } from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyStatement, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { CfnServer } from 'aws-cdk-lib/aws-transfer';
import { MdaaNagSuppressions } from '@aws-mdaa/construct'; //NOSONAR
import { Construct } from 'constructs';

/**
 * Q-ENHANCED-INTERFACE
 * AWS Transfer Family SFTP server configuration for secure file transfer to S3 data lakes. Defines SFTP server deployment with VPC networking, subnet placement, and CIDR-based access control for secure B2B file exchange and data ingestion workflows.
 *
 * Use cases: B2B file exchange; Secure data ingestion; Partner file uploads; Legacy system integration
 *
 * AWS: AWS Transfer Family SFTP server with VPC endpoint and security group configuration for secure file transfer to S3
 *
 * Validation: vpcId must be valid VPC identifier; subnetIds must be valid subnet identifiers; ingressCidrs must be valid CIDR blocks
 */
export interface ServerProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC identifier where the SFTP server will be deployed enabling network isolation and security boundaries. Defines the Virtual Private Cloud that will host the SFTP server providing network-level security and isolation for secure file transfer operations and data ingestion workflows.
   *
   * Use cases: Network isolation; VPC deployment; Security boundaries; Private file transfer environments; Network-level security
   *
   * AWS: Amazon VPC identifier for AWS Transfer Family SFTP server deployment and network isolation
   *
   * Validation: Must be valid VPC identifier; required for VPC-based SFTP server deployment
   **/
  readonly vpcId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of subnet identifiers where the SFTP server will be hosted enabling multi-AZ deployment and network distribution. Defines the specific subnets within the VPC that will host the SFTP server endpoints providing availability and network segmentation for file transfer operations.
   *
   * Use cases: Multi-AZ deployment; Network segmentation; Availability distribution; Subnet-level isolation; Network architecture
   *
   * AWS: Amazon VPC subnet identifiers for AWS Transfer Family SFTP server deployment and network distribution
   *
   * Validation: Must be array of valid subnet identifiers; required for SFTP server deployment; subnets must be in specified VPC
   **/
  readonly subnetIds: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Optional boolean flag to enable internet-facing SFTP server with public IP address allocation enabling external client access. Controls whether the SFTP server will be accessible from the internet with public IP addresses or remain internal to the VPC for private access only.
   *
   * Use cases: External client access; Internet connectivity; Public SFTP access; B2B file exchange; External partner integration
   *
   * AWS: AWS Transfer Family SFTP server internet-facing configuration for public IP allocation and external access
   *
   * Validation: Must be boolean value if provided; optional for internet accessibility control
   **/
  readonly internetFacing?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of CIDR blocks defining network access control for SFTP server connections enabling IP-based access restriction. Specifies the IP address ranges that will be permitted to connect to the SFTP server through security group rules for network-level access control and security.
   *
   * Use cases: IP-based access control; Network security; Client IP restriction; Security group configuration; Access management
   *
   * AWS: Amazon EC2 security group CIDR blocks for AWS Transfer Family SFTP server network access control
   *
   * Validation: Must be array of valid CIDR blocks; required for security group ingress rules and access control
   **/
  readonly ingressCidrs: string[];
  /**
   * Optional Transfer Family security policy name controlling cryptographic algorithms for SFTP connections.
   * Defaults to 'TransferSecurityPolicy-FIPS-2020-06' for backwards compatibility.
   * Use a non-FIPS policy (e.g. 'TransferSecurityPolicy-2024-01') in regions that do not support FIPS.
   */
  readonly securityPolicyName?: string;
}
export interface SftpServerL3ConstructProps extends MdaaL3ConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required SFTP server configuration defining file transfer infrastructure including VPC networking, security groups, and access control settings. Provides complete server setup with network security, ingress rules, and connectivity configuration for secure file transfer operations and data ingestion workflows.
   *
   * Use cases: SFTP server configuration; File transfer infrastructure; Network security; Secure connectivity
   *
   * AWS: AWS Transfer Family SFTP server configuration for secure file transfer and data ingestion
   *
   * Validation: Must be valid ServerProps; required for SFTP server deployment and file transfer infrastructure
   **/
  readonly server: ServerProps;
}

export class SftpServerL3Construct extends MdaaL3Construct {
  protected readonly props: SftpServerL3ConstructProps;

  protected readonly server: CfnServer;

  constructor(scope: Construct, id: string, props: SftpServerL3ConstructProps) {
    super(scope, id, props);
    this.props = props;

    // Create our Security Group
    const ingressRules: CfnSecurityGroup.IngressProperty[] = this.props.server.ingressCidrs.map(cidr => {
      return {
        ipProtocol: 'tcp',
        cidrIp: cidr,
        fromPort: 22,
        toPort: 22,
      };
    });
    const securityGroup = new CfnSecurityGroup(this, 'SFTPSecurityGroup', {
      groupName: props.naming.resourceName('security-group'),
      groupDescription: `SFTP Transfer Service port 22`,
      vpcId: this.props.server.vpcId,
      securityGroupIngress: ingressRules,
    });

    // Create our role to permit the SFTP server to create logs
    const loggingRole = new MdaaRole(this, 'TransferServerSFTPLoggingRole', {
      naming: props.naming,
      roleName: 'logging-role',
      assumedBy: new ServicePrincipal('transfer.amazonaws.com'),
      createOutputs: false,
      createParams: false,
    });

    const elasticIp =
      this.props.server.internetFacing === true
        ? new CfnEIP(this, 'EIP', {
            domain: this.props.server.vpcId,
          })
        : undefined;

    const SFTPServerProps = {
      naming: props.naming,
      vpcId: this.props.server.vpcId,
      addressAllocationIds: elasticIp ? [elasticIp.attrAllocationId] : undefined,
      securityGroupId: securityGroup.attrGroupId,
      subnetIds: this.props.server.subnetIds,
      loggingRole: loggingRole,
      securityPolicyName: this.props.server.securityPolicyName,
    };

    // Build our SFTP server!
    this.server = new MdaaSFTPServer(this, 'SFTPServer', SFTPServerProps);

    // Grant logging role access to the server's cloudwatch log groups
    const cloudwatchPolicyStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['logs:CreateLogStream', 'logs:DescribeLogStreams', 'logs:CreateLogGroup', 'logs:PutLogEvents'],
      resources: [
        `arn:${this.partition}:logs:${this.region}:${this.account}:log-group:/aws/transfer/${this.server.attrServerId}`,
        `arn:${this.partition}:logs:${this.region}:${this.account}:log-group:/aws/transfer/${this.server.attrServerId}/*`,
      ],
    });

    loggingRole.addToPolicy(cloudwatchPolicyStatement);

    MdaaNagSuppressions.addCodeResourceSuppressions(
      loggingRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: 'Wildcard is for log stream names, which are not known at deployment time.',
        },
        {
          id: 'NIST.800.53.R5-IAMNoInlinePolicy',
          reason: 'Role is specific to this server. Inline policy is appropriate.',
        },
        {
          id: 'HIPAA.Security-IAMNoInlinePolicy',
          reason: 'Role is specific to this server. Inline policy is appropriate.',
        },
        {
          id: 'PCI.DSS.321-IAMNoInlinePolicy',
          reason: 'Role is specific to this server. Inline policy is appropriate.',
        },
      ],
      true,
    );
  }
}

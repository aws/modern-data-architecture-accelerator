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
 * Transfer Family SFTP server configuration for secure file transfer to S3.
 * MDAA creates a security group allowing port 22 ingress from specified CIDRs,
 * deploys the server on specified VPC/subnets, and optionally allocates a public IP.
 *
 * Use cases: B2B file exchange; Secure data ingestion from partners; Legacy system integration
 *
 * AWS: Transfer Family SFTP server with VPC endpoint, security group, and CloudWatch logging
 *
 * Validation: vpcId, subnetIds, and ingressCidrs required
 */
export interface ServerProps {
  /**
   * VPC ID where the SFTP server will be deployed. The security group and
   * server endpoints are created within this VPC.
   *
   * Use cases: VPC-based SFTP deployment; Network isolation for file transfers
   *
   * AWS: VPC for Transfer Family server endpoint and security group
   *
   * Validation: Required; must be existing VPC ID
   */
  readonly vpcId: string;
  /**
   * Subnet IDs where the SFTP server will have network interfaces.
   * Use multiple subnets across AZs for high availability.
   *
   * Use cases: Multi-AZ SFTP deployment; Network segmentation
   *
   * AWS: VPC subnets for Transfer Family server endpoint placement
   *
   * Validation: Required; must be valid subnet IDs within the specified VPC
   */
  readonly subnetIds: string[];
  /**
   * Whether to allocate a public Elastic IP for internet-facing access.
   * When false, the server is only accessible within the VPC.
   *
   * Use cases: External partner file uploads; Internet-accessible SFTP endpoint
   *
   * AWS: Elastic IP allocation for Transfer Family public endpoint
   *
   * Validation: Optional; boolean
   * @default false
   */
  readonly internetFacing?: boolean;
  /**
   * CIDR blocks permitted to connect to the SFTP server on port 22.
   * All other ingress is denied by default.
   *
   * Use cases: IP-based access control; Partner network whitelisting
   *
   * AWS: Security group ingress rules for Transfer Family server (TCP 22)
   *
   * Validation: Required; array of valid CIDR blocks (e.g. 10.0.0.0/8)
   */
  readonly ingressCidrs: string[];
  /**
   * Optional Transfer Family security policy name controlling cryptographic algorithms for SFTP connections.
   * Defaults to 'TransferSecurityPolicy-FIPS-2020-06' for backwards compatibility.
   * Use a non-FIPS policy (e.g. 'TransferSecurityPolicy-2024-01') in regions that do not support FIPS.
   */
  readonly securityPolicyName?: string;
}
export interface SftpServerL3ConstructProps extends MdaaL3ConstructProps {
  /** SFTP server configuration for Transfer Family deployment. */
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

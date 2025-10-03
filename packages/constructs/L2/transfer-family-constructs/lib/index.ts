/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { MdaaConstructProps, MdaaParamAndOutput } from '@aws-mdaa/construct'; //NOSONAR
import { IMdaaRole } from '@aws-mdaa/iam-constructs';
import { CfnTag, IResolvable } from 'aws-cdk-lib';
import { CfnServer, CfnServerProps } from 'aws-cdk-lib/aws-transfer';
import { Construct } from 'constructs';

export interface MdaaSFTPServerProps extends MdaaConstructProps {
  /**
   * Q-ENHANCED-PROPERTY
   * Required VPC ID for SFTP server deployment providing network isolation and security controls. Ensures server operates within the specified VPC for secure networking and integration with other VPC resources.
   *
   * Use cases: VPC network isolation; Secure networking; VPC resource integration
   *
   * AWS: Amazon VPC for Transfer Family SFTP server network isolation and security
   *
   * Validation: Must be valid VPC ID; required; VPC must exist and be accessible
   **/
  readonly vpcId: string;
  /**
   * Q-ENHANCED-PROPERTY
   * Required array of subnet IDs for SFTP server endpoint placement within the VPC. Defines the network subnets where server endpoints will be deployed for secure VPC connectivity and availability zone distribution.
   *
   * Use cases: VPC network placement; Subnet-specific deployment; Multi-AZ server distribution
   *
   * AWS: Amazon VPC subnets for Transfer Family SFTP server endpoint placement
   *
   * Validation: Must be array of valid subnet IDs; required; subnets must exist in specified VPC
   **/
  readonly subnetIds: string[];
  /**
   * Q-ENHANCED-PROPERTY
   * Required primary security group ID for SFTP server network access control defining inbound and outbound traffic rules. Provides network-level security controls for SFTP server access and client connectivity.
   *
   * Use cases: Network access control; SFTP traffic filtering; Client connectivity security
   *
   * AWS: Amazon VPC security group for Transfer Family SFTP server network access control
   *
   * Validation: Must be valid security group ID; required; defines primary network access rules
   **/
  readonly securityGroupId: string;
  readonly addressAllocationIds?: string[];
  readonly additionalSecurityGroupIds?: string[];
  readonly publicAddress?: boolean;
  /**
   * Q-ENHANCED-PROPERTY
   * Optional storage domain specification for file transfer operations controlling the underlying storage system. Determines whether files are stored in Amazon S3 or Amazon EFS for different storage requirements and access patterns.
   *
   * Use cases: Storage system selection; File storage requirements; Access pattern optimization
   *
   * AWS: AWS Transfer Family server domain configuration for storage system selection
   *
   * Validation: Must be valid domain type (S3, EFS) if provided; determines storage backend
   **/
  readonly domain?: string;
  readonly identityProviderDetails?: CfnServer.IdentityProviderDetailsProperty | IResolvable;
  readonly identityProviderType?: string;
  readonly loggingRole: IMdaaRole;
  readonly preAuthenticationLoginBanner?: string;
  readonly tags?: CfnTag[];
  readonly workflowDetails?: CfnServer.WorkflowDetailsProperty | IResolvable;
}

/**
 * Reusable CDK construct for a compliant Transfer Family SFTP Server.
 * Specifically, enforces VPC configuration, logging, and security policy
 */
export class MdaaSFTPServer extends CfnServer {
  private static SECURITY_POLICY_NAME = 'TransferSecurityPolicy-FIPS-2020-06';

  /** Overrides specific compliance-related properties. */
  private static setProps(props: MdaaSFTPServerProps): CfnServerProps {
    const overrideProps = {
      endpointType: 'VPC',
      endpointDetails: {
        addressAllocationIds: props.addressAllocationIds,
        vpcId: props.vpcId,
        securityGroupIds: [props.securityGroupId, ...(props.additionalSecurityGroupIds || [])],
        subnetIds: props.subnetIds,
      },
      protocols: ['SFTP'],
      securityPolicyName: MdaaSFTPServer.SECURITY_POLICY_NAME,
      loggingRole: props.loggingRole.roleArn,
    };
    const allProps = { ...props, ...overrideProps };
    return allProps;
  }

  constructor(scope: Construct, id: string, props: MdaaSFTPServerProps) {
    super(scope, id, MdaaSFTPServer.setProps(props));

    new MdaaParamAndOutput(
      this,
      {
        naming: props.naming,
        resourceType: 'server',
        name: 'arn',
        value: this.attrArn,
      },
      scope,
    );

    new MdaaParamAndOutput(
      this,
      {
        naming: props.naming,
        resourceType: 'server',
        name: 'id',
        value: this.attrServerId,
      },
      scope,
    );
  }
}
